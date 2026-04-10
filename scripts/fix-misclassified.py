#!/usr/bin/env python3
"""Fix misclassified tickets: auto-close spam/notifications that slipped through.
Checks ALL open tickets in CS group, regardless of tags."""

import json, base64, urllib.request, urllib.error, os, re, html

CRED_PATH = os.path.expanduser("~/.openclaw/credentials/chessnut-services.json")

AUTO_CLOSE_SENDERS = [
    "@mailer.shopify.com", "@shopifyemail.com",
    "donotreply@", "@amazon.com", "@amazon.", "fba-noreply@",
    "@facebookmail.com", "@business-updates.facebook.com",
    "@mail.instagram.com", "@instagram.com",
    "@mailchimp.com", "@mandrillapp.com", "@fuuffy.com",
    "@impact.com", "notifications@app.impact.com",
    "@graypoplar.com", "@paypal.com",
    "@pplcz.com", "@ppl-pk.com",
    "@tiktok.com", "@business.tiktok",
    "@aliexpress.com", "@kickstarter.com", "@google.com",
]

AUTO_CLOSE_CONTENT = [
    "left a star review", "left a review", "review notification",
    "notification of payment received",
    "你的广告已通过审核", "ad has been approved",
    "balance paid for order", "balance paid",
    "product catalog submission received",
    "dropshipping", "3pl fulfillment",
    "zero inventory risk", "complimentary branding",
    "subsidized saas",
    "您收到了一笔付款",
    "amazon has shipped your sold item",
    "has paid the outstanding balance",
    "fba inbound shipment received",
    "automated unfulfillable fba inventory",
    "refund initiated for order",
    "你的包裹已準備出庫",
    "你的包裹已經送達",
    "訂單已確認", "訂單收據",
    "订单确认",
    "查件服务进度通知",
    "billing agreement", "billing agreement change",
    "1st payment received for",
    "global warehousing",
    "essential skills for starting",
    "your products are now available in chatgpt",
    "quick note for your page",
    "sponsored content",
    "verified client list",
    "upcoming events, revenue",
    "discover your next favorite",
    "save up to", "per gallon on gas",
    "tarifas por puesta de inventario",
    "加入 dartsnut group",
    "brand旗舰店中缺少",
    "貨飛 - 訂單申報提醒",
]

SHOPIFY_INBOX_PATTERNS = ["you have a new message from"]
PAYPAL_DISPUTE_PATTERNS = ["pp-r-", "case #", "dispute", "chargeback", "争议", "纠纷"]

def clean(t):
    t = re.sub(r'<[^>]+>', ' ', str(t))
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def load_creds():
    with open(CRED_PATH) as f:
        return json.load(f)

def freshdesk_api(domain, api_key, path, method="GET", data=None):
    auth = base64.b64encode(f"{api_key}:X".encode()).decode()
    url = f"https://{domain}/api/v2{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json"
    })
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        if resp.status == 204:
            return {}
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"{e.code}", "body": e.read().decode()[:200]}

def should_close(email, subject, desc_raw):
    desc_lower = desc_raw.lower()
    combined = (subject + " " + desc_lower).lower()
    
    # Shopify Inbox exception
    if "mailer.shopify.com" in email:
        for pat in SHOPIFY_INBOX_PATTERNS:
            if pat in desc_lower:
                return False
    
    # PayPal dispute exception
    if "@paypal.com" in email:
        for pat in PAYPAL_DISPUTE_PATTERNS:
            if pat in combined:
                return False
    
    # Sender check
    for pattern in AUTO_CLOSE_SENDERS:
        if pattern in email:
            return True
    
    # Noreply local-part
    local_part = email.split("@")[0] if "@" in email else ""
    if local_part in ("noreply", "no-reply", "donotreply", "no_reply"):
        return True
    
    # Content check
    for pat in AUTO_CLOSE_CONTENT:
        if pat in combined:
            return True
    
    return False

def main():
    creds = load_creds()
    fd = creds["freshdesk"]
    domain = fd["domain"]
    api_key = fd["api_key"]
    group_id = fd["triage_group_id"]
    
    # Get recently updated tickets in CS group (last 3 days)
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    all_tickets = []
    for page in range(1, 6):
        url = f"/tickets?updated_since={since}&per_page=100&page={page}"
        result = freshdesk_api(domain, api_key, url)
        if isinstance(result, dict) and "error" in result or not result:
            break
        for t in result:
            if t.get("group_id") == group_id and t.get("status") in (2, 3):
                tags = t.get("tags", [])
                if "auto-spam-closed" in tags:
                    continue
                all_tickets.append(t)
        if len(result) < 100:
            break
    
    print(f"Checking {len(all_tickets)} open tickets in CS group...")
    
    fixed = 0
    kept = 0
    
    for t in all_tickets:
        tid = t["id"]
        subject = t.get("subject", "")
        
        full = freshdesk_api(domain, api_key, f"/tickets/{tid}?include=requester")
        requester = full.get("requester", {})
        email = requester.get("email", "").lower()
        desc_raw = full.get("description_text", full.get("description", ""))
        
        if should_close(email, subject, desc_raw):
            freshdesk_api(domain, api_key, f"/tickets/{tid}", "PUT", {
                "status": 5,
                "tags": ["auto-spam-closed"]
            })
            print(f"  CLOSED #{tid}: {subject[:60]} ({email})")
            fixed += 1
        else:
            kept += 1
    
    print(f"\nDone: {fixed} closed, {kept} kept")

if __name__ == "__main__":
    main()
