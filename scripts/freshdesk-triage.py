#!/usr/bin/env python3
"""Chessnut Freshdesk Triage - Complete funnel with L1→L2→L3"""
import json, re, time, sys, urllib.request, urllib.error, ssl
from datetime import datetime, timedelta, timezone

# Load config
with open(f"{__import__('os').path.expanduser('~')}/.openclaw/credentials/chessnut-services.json") as f:
    CFG = json.load(f)
FD = CFG['freshdesk']
BASE = f"https://{FD['domain']}/api/v2"
AUTH = __import__('base64').b64encode(f"{FD['api_key']}:X".encode()).decode()

ctx = ssl.create_default_context()

def api(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Basic {AUTH}')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            rdata = resp.read()
            return json.loads(rdata) if rdata else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {err_body[:300]}")
        return None

def get(path): return api('GET', path)
def put(path, b): return api('PUT', path, b)
def post(path, b): return api('POST', path, b)

# ---- Layer 1: Spam patterns ----
SPAM = [
    re.compile(p, re.I) for p in [
        r'@mailer\.shopify\.com', r'@shopifyemail\.com',
        r'donotreply@amazon\.com', r'noreply@amazon',
        r'@marketplace\.amazon\.', r'@sellernotifications\.',
        r'fba-noreply@amazon\.com',
        r'@facebookmail\.com', r'@business-updates\.facebook\.com',
        r'@mail\.instagram\.com', r'@instagram\.com',
        r'@mailchimp\.com', r'@mandrillapp\.com',
        r'@fuuffy\.com',
        r'@impact\.com', r'notifications@app\.impact\.com',
        r'@paypal\.com',
        r'@pplcz\.com', r'@ppl-pk\.com',
        r'@tiktok\.com', r'@business\.tiktok',
        r'@aliexpress\.com',
        r'@kickstarter\.com',
        r'@noreply\.', r'@no-reply\.', r'@donotreply\.',
        r'^noreply@', r'^no-reply@', r'^donotreply@',
        r'@mailer\.', r'@notifications\.', r'@bounce\.',
    ]
]
SPAM_EX = [re.compile(r'no-reply@mailsupport\.aliyun\.com', re.I)]

TAGS_SKIP = {'auto-spam-closed','2-dispute-jony','3-product-gwen','3-product-jennifer',
             '4-order-lena','5-kol-jony','5-fallback-jennifer','ai-draft-ready'}

AGENTS = FD['agents']
AGENT_NAMES = {AGENTS['gwen']:'Gwen Liu', AGENTS['lena']:'Lena Wang',
               AGENTS['jennifer']:'Jennifer Chen', AGENTS['jony']:'Jony He'}

def is_spam(email):
    if not email: return False
    for ex in SPAM_EX:
        if ex.search(email): return False
    return any(p.search(email) for p in SPAM)

def already_done(t):
    if t.get('status') == 5: return True
    return bool(set(t.get('tags',[])) & TAGS_SKIP)

def get_email(rid):
    if not rid: return None
    c = get(f'/contacts/{rid}')
    return c.get('email') if c else None

def classify(subj, desc, convs):
    full = f"{subj}\n{desc}\n" + ' '.join((c.get('body_text','') or '') for c in convs)
    fl = full.lower()

    # A: Dispute
    if re.search(r'pp-r-\d+', fl, re.I) or re.search(r'paypal case|dispute|chargeback', fl, re.I):
        return ('A','2-dispute-jony',AGENTS['jony'],'Platform dispute')

    # B: KOL/Brand/Review
    if re.search(r'youtube|tiktok.*collab|sponsorship|media.*review|affiliate|推广|合作|博主|left a .+ star review', fl, re.I):
        return ('B','5-kol-jony',AGENTS['jony'],'KOL/Brand/Review')

    # C: Product issue
    product_signal = re.search(r'not working|broken|defect|malfunction|error|bug|crash|freeze|won.t turn|doesn.t work|issue|problem|trouble|故障|问题', fl, re.I)
    has_product_ctx = re.search(r'evo|move|air|pro|go|chessnut|board|chess|serial|order.*item', fl, re.I)
    defect_return = re.search(r'(return|refund|退货|退款).*(defect|broken|not working|fault|故障|坏了)', fl, re.I)

    if (product_signal and has_product_ctx) or defect_return:
        if re.search(r'\bmove\b|auto.*chess|automatic.*piece', fl, re.I):
            return ('C','3-product-gwen',AGENTS['gwen'],'Move product issue')
        if re.search(r'\bevo\b|ce\d|built-in.*screen|built-in.*ai', fl, re.I):
            return ('C','3-product-gwen',AGENTS['gwen'],'EVO product issue')
        if re.search(r'\bair\b|\bpro\b|\bgo\b', fl, re.I):
            return ('C','3-product-jennifer',AGENTS['jennifer'],'Air/Pro/Go product issue')
        return ('C','3-product-jennifer',AGENTS['jennifer'],'Product issue (model unclear)')

    # D: Order/logistics/presales
    if re.search(r'order|shipping|delivery|tracking|cancel|refund|return|invoice|receipt|dispatch|发货|物流|订单|取消|退款|退货|发票|price|wholesale|product.*compar|选购|对比|库存|stock|pre.?order', fl, re.I):
        if not defect_return:
            return ('D','4-order-lena',AGENTS['lena'],'Order/logistics/presales')

    # E: System notification
    if re.search(r'notification of payment|ad.*approved|copyright|video.*removed|policy.*update|fba', fl, re.I):
        return ('E','auto-spam-closed',None,'System notification')

    # F: Fallback
    return ('F','5-fallback-jennifer',AGENTS['jennifer'],'Fallback')

def draft(subj, desc, convs, intent, tag, agent_name):
    conv_hist = '\n'.join(f"[{'Customer' if c.get('incoming') else 'Agent'}]: {(c.get('body_text','') or '')[:500]}" for c in convs)

    if intent == 'A':
        return (f"Hi,\n\nThank you for reaching out. We understand you have a dispute/case open and we'd like to help resolve this.\n\n"
                f"We're reviewing the details of your case and will follow up shortly. If you have any additional information or "
                f"documentation that could help resolve this matter, please share.\n\nBest regards,\nChessnut Support\n\n"
                f"[Agent Note: Dispute case - review details and respond to platform dispute promptly.]")

    if intent == 'C':
        return (f"Hi,\n\nThank you for contacting Chessnut Support. We're sorry to hear you're experiencing an issue.\n\n"
                f"To help us resolve this quickly, could you please provide:\n\n"
                f"1. Your order number\n"
                f"2. The serial number (found on the back/bottom of the board)\n"
                f"3. A photo or short video showing the issue (under 20MB, or share via Google Drive)\n\n"
                f"Once we have these, our team will investigate promptly.\n\nBest regards,\nChessnut Support\n\n"
                f"[Agent Note: {tag} - tailor troubleshooting for specific product/issue.]")

    if intent == 'D':
        return (f"Hi,\n\nThank you for contacting Chessnut Support.\n\n"
                f"We've received your inquiry and are looking into it now. If you have your order number handy, "
                f"please share it so we can locate your order faster.\n\n"
                f"We'll update you shortly.\n\nBest regards,\nChessnut Support\n\n"
                f"[Agent Note: {tag} - check order status and provide specific updates.]")

    if intent == 'B':
        return (f"Hi,\n\nThank you for your interest in Chessnut! We appreciate you reaching out.\n\n"
                f"We've forwarded your message to our partnerships team, who will review it and get back to you shortly.\n\n"
                f"Best regards,\nChessnut Support\n\n"
                f"[Agent Note: KOL/collaboration request - forward or handle directly.]")

    return (f"Hi,\n\nThank you for contacting Chessnut Support. We've received your message and our team is reviewing it.\n\n"
            f"We'll get back to you shortly. If you have additional details, please share.\n\n"
            f"Best regards,\nChessnut Support\n\n"
            f"[Agent Note: Intent unclear - review and route appropriately.]")

def main():
    since = datetime.now(timezone.utc) - timedelta(hours=6)
    report = {'processed':[], 'skipped':[], 'errors':[]}

    print('=== Freshdesk Triage Start ===', flush=True)
    print(f'Time: {datetime.now(timezone.utc).isoformat()}', flush=True)
    print(f'Window: past 6h since {since.isoformat()}', flush=True)

    # Fetch tickets from Customer Support group + null group
    all_tickets = {}
    
    # Customer Support group
    for page in range(1, 15):
        ts = get(f'/tickets?group_id={FD["triage_group_id"]}&page={page}&per_page=30&order_type=desc&order_by=created_at')
        if not ts: break
        for t in ts:
            all_tickets[t['id']] = t
        if len(ts) < 30: break
        time.sleep(0.3)

    # Null group tickets
    for page in range(1, 15):
        ts = get(f'/tickets?page={page}&per_page=30&order_type=desc&order_by=created_at')
        if not ts: break
        for t in ts:
            if not t.get('group_id'):
                all_tickets[t['id']] = t
        if len(ts) < 30: break
        time.sleep(0.3)

    print(f'Total tickets fetched: {len(all_tickets)}', flush=True)

    # Filter candidates
    candidates = []
    for t in all_tickets.values():
        created = datetime.fromisoformat(t['created_at'].replace('Z','+00:00'))
        if created < since:
            continue
        if already_done(t):
            report['skipped'].append({'id':t['id'],'subject':t.get('subject',''),'reason':'already processed'})
            continue
        candidates.append(t)

    print(f'Candidates: {len(candidates)}', flush=True)
    print(f'Skipped (already done): {len(report["skipped"])}', flush=True)

    if not candidates:
        print('\nNo tickets to process.', flush=True)
        print('\n===REPORT===', flush=True)
        print(json.dumps(report, ensure_ascii=False), flush=True)
        return

    # Process each ticket
    req_count = 0
    for t in candidates:
        tid = t['id']
        try:
            print(f'\n--- #{tid}: "{(t.get("subject",""))[:80]}" ---', flush=True)

            # Get email
            email = t.get('requester_email')
            if not email and t.get('requester_id'):
                email = get_email(t['requester_id'])
                req_count += 1
                time.sleep(0.3)
            print(f'  Email: {email or "unknown"}', flush=True)

            # Layer 1: Sender filter
            if is_spam(email):
                print(f'  L1 → SPAM closed', flush=True)
                put(f'/tickets/{tid}', {'status':5, 'tags':list(set(t.get('tags',[])+['auto-spam-closed'])), 'group_id':None})
                req_count += 1
                report['processed'].append({
                    'id':tid, 'subject':t.get('subject',''), 'email':email,
                    'layer':1, 'action':'closed', 'tag':'auto-spam-closed',
                    'agent':None, 'reason':f'Spam sender: {email}'
                })
                time.sleep(0.3)
                continue

            # Layer 2: Intent classification
            convs = get(f'/tickets/{tid}/conversations') or []
            req_count += 1
            time.sleep(0.3)

            intent, tag, agent_id, desc = classify(
                t.get('subject',''), t.get('description',''), convs)
            agent_name = AGENT_NAMES.get(agent_id, 'Close')
            print(f'  L2 → Intent={intent} ({desc}) → {agent_name}', flush=True)

            # Intent E: System notification → close
            if intent == 'E':
                put(f'/tickets/{tid}', {'status':5, 'tags':list(set(t.get('tags',[])+['auto-spam-closed'])), 'group_id':None})
                req_count += 1
                report['processed'].append({
                    'id':tid, 'subject':t.get('subject',''), 'email':email,
                    'layer':2, 'action':'closed', 'tag':'auto-spam-closed',
                    'agent':None, 'reason':desc
                })
                time.sleep(0.3)
                continue

            # Layer 3: Draft reply + assign
            d = draft(t.get('subject',''), t.get('description',''), convs, intent, tag, agent_name)
            print(f'  L3 → Drafting & assigning to {agent_name}', flush=True)

            # Private note
            note_result = post(f'/tickets/{tid}/notes', {'body':d, 'private':True})
            req_count += 1
            time.sleep(0.5)

            # Assign + tag
            all_tags = list(set(t.get('tags',[]) + [tag, 'ai-draft-ready']))
            assign_result = put(f'/tickets/{tid}', {
                'responder_id': agent_id,
                'group_id': None,
                'tags': all_tags,
            })
            req_count += 1
            time.sleep(0.5)

            report['processed'].append({
                'id':tid, 'subject':t.get('subject',''), 'email':email,
                'layer':3, 'action':'assigned', 'tag':tag,
                'agent':agent_name, 'agentId':agent_id,
                'intent':intent, 'reason':desc,
                'draft_preview': d[:150]+'...'
            })
            print(f'  ✓ Done', flush=True)

        except Exception as e:
            print(f'  ✗ Error: {e}', flush=True)
            report['errors'].append({'id':tid, 'subject':t.get('subject',''), 'error':str(e)})

        if req_count > 40:
            print('  Rate limit pause...', flush=True)
            time.sleep(10)
            req_count = 0

    # Final report
    print('\n========== TRIAGE REPORT ==========', flush=True)
    print(f'Processed: {len(report["processed"])}', flush=True)
    print(f'Skipped: {len(report["skipped"])}', flush=True)
    print(f'Errors: {len(report["errors"])}', flush=True)
    print('\n===REPORT===', flush=True)
    print(json.dumps(report, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
