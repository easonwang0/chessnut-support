#!/usr/bin/env python3
"""
Freshdesk Triage + Feishu Push
Called by cron every 4 hours. Runs triage and pushes report via Feishu API.
"""

import json, base64, urllib.request, urllib.error, sys, os, re, html
from datetime import datetime

# === Config ===
CRED_PATH = os.path.expanduser("~/.openclaw/credentials/chessnut-services.json")
FEISHU_APP_ID = "cli_a94667ee4ffa9cd4"
FEISHU_APP_SECRET = "LZH0xS73OGkUMOyk75QDFcatKqyuMhKu"
FEISHU_USER_OPEN_ID = "ou_c77bf01311e8aa4491d412be5b1139f5"

# Auto-close sender patterns
AUTO_CLOSE_SENDERS = [
    "@mailer.shopify.com", "@shopifyemail.com",
    "donotreply@", "@amazon.com", "@amazon.", "fba-noreply@",
    "@facebookmail.com", "@business-updates.facebook.com",
    "@mail.instagram.com", "@instagram.com",
    "@mailchimp.com", "@mandrillapp.com", "@fuuffy.com",
    "@impact.com", "notifications@app.impact.com",
    "@graypoplar.com",  # 代发垃圾广告
    "@paypal.com",  # PayPal 通知（争议除外，后面单独判断）
    "@pplcz.com", "@ppl-pk.com",
    "@tiktok.com", "@business.tiktok",
    "@aliexpress.com",
    "@kickstarter.com",
    "@google.com",  # Google/YouTube 政策通知
]

# Content patterns that indicate auto-close (checked against BOTH subject + description)
AUTO_CLOSE_CONTENT = [
    "left a star review", "left a review", "review notification",
    "notification of payment received",
    "你的广告已通过审核", "ad has been approved",
    "balance paid for order", "balance paid",  # Shopify 余额支付通知
    "product catalog submission received",  # Impact.com 产品目录
    "dropshipping", "3pl fulfillment",  # 代发广告
    "zero inventory risk", "complimentary branding",  # 代发广告
    "subsidized saas",  # 代发广告
    "您收到了一笔付款",  # 收款通知
    "amazon has shipped your sold item",  # Amazon 发货通知
    "has paid the outstanding balance",  # Shopify 余额支付
    "fba inbound shipment received",  # FBA 入库通知
    "automated unfulfillable fba inventory",  # FBA 库存通知
    "refund initiated for order",  # Amazon 退款通知
    "你的包裹已準備出庫",  # 谷仓出库
    "你的包裹已經送達",  # 谷仓送达
    "訂單已確認", "訂單收據",  # Fuuffy 订单确认
    "订单确认",  # 订单确认
    "查件服务进度通知",  # 谷仓查件
    "billing agreement", "billing agreement change",  # PayPal 账单变更
    "1st payment received for",  # Shopify 收款
    "global warehousing",  # 物流广告
    "essential skills for starting",  # Shopify 营销邮件
    "your products are now available in chatgpt",  # OpenAI 产品通知
    "quick note for your page",  # SEO 垃圾
    "sponsored content",  # 广告垃圾
    "verified client list",  # 展会数据库垃圾
    "upcoming events, revenue",  # 营销邮件
    "discover your next favorite",  # Kickstarter 营销
    "save up to", "per gallon on gas",  # 杂志广告
    "tarifas por puesta de inventario",  # Amazon 西班牙语库存通知
    "加入 dartsnut group",  # Facebook 群组请求
    "brand旗舰店中缺少",  # Amazon 营销
    "貨飛 - 訂單申報提醒",  # Fuuffy 申报提醒
]

# Shopify Inbox messages that contain REAL customer messages - do NOT auto-close
SHOPIFY_INBOX_PATTERNS = [
    "you have a new message from",  # Shopify Inbox 转发的真实客户消息
]

# PayPal dispute patterns — these should NOT be auto-closed even from @paypal.com
PAYPAL_DISPUTE_PATTERNS = [
    "pp-r-", "case #", "dispute", "chargeback",
    "争议", "纠纷",  # Chinese dispute terms
]

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

def get_untriaged_tickets(domain, api_key, group_id):
    """Get open tickets from Customer Support group"""
    tickets = []
    page = 1
    while page <= 5:  # max 5 pages
        result = freshdesk_api(domain, api_key, f"/tickets?filter=new_and_my_open&per_page=100&page={page}")
        if isinstance(result, dict) and "error" in result:
            break
        if not result:
            break
        for t in result:
            if t.get("group_id") == group_id:
                tickets.append(t)
        if len(result) < 100:
            break
        page += 1
    return tickets

def should_auto_close(ticket):
    """Layer 1: Check if ticket should be auto-closed based on sender"""
    requester = ticket.get("requester", {})
    email = requester.get("email", "").lower()
    for pattern in AUTO_CLOSE_SENDERS:
        if pattern in email:
            return True, email
    return False, email

def close_ticket(domain, api_key, ticket_id):
    freshdesk_api(domain, api_key, f"/tickets/{ticket_id}", "PUT", {
        "status": 5, "tags": ["auto-spam-closed"]
    })

def assign_ticket(domain, api_key, ticket_id, agent_id, tags):
    freshdesk_api(domain, api_key, f"/tickets/{ticket_id}", "PUT", {
        "responder_id": agent_id, "tags": tags
    })

def add_note(domain, api_key, ticket_id, note_html):
    freshdesk_api(domain, api_key, f"/tickets/{ticket_id}/notes", "POST", {
        "body": note_html, "private": True
    })

def get_feishu_token():
    data = json.dumps({"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET}).encode()
    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        data=data, headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    return json.loads(resp.read()).get("tenant_access_token", "")

def send_feishu_message(text):
    """Send text message to user via Feishu API"""
    token = get_feishu_token()
    if not token:
        print("ERROR: Failed to get Feishu token")
        return False
    
    msg_data = json.dumps({
        "receive_id": FEISHU_USER_OPEN_ID,
        "msg_type": "text",
        "content": json.dumps({"text": text})
    }).encode()
    
    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
        data=msg_data, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        result = json.loads(resp.read())
        return result.get("code") == 0
    except Exception as e:
        print(f"ERROR sending Feishu message: {e}")
        return False

def quick_summary(desc, subject):
    dl = desc.lower()
    if any(w in dl for w in ["order", "订单"]) or re.search(r'#\d{3,6}', subject):
        return "询问订单状态", "查状态，24h内回复"
    if any(w in dl for w in ["doesn't work", "issue", "problem", "error", "slow", "慢"]):
        return "反馈产品使用问题", "请客户提供设备型号和固件版本"
    if any(w in dl for w in ["lost", "missing", "piece"]):
        return "反馈配件缺失", "请客户提供订单号，安排补发"
    if any(w in dl for w in ["collaborat", "partner", "influencer", "review", "youtube"]):
        return "品牌合作邀约", "转合作团队评估"
    if any(w in dl for w in ["feature", "request", "integration"]):
        return "功能需求建议", "已记录，转产品团队"
    if any(w in dl for w in ["pricing", "price"]):
        return "价格投诉", "核实后24h内回复"
    if any(w in dl for w in ["small", "bigger", "size"]):
        return "对产品尺寸不满意", "确认订单号，提供替换方案"
    if any(w in dl for w in ["chargeback", "dispute", "争议"]):
        return "客户发起争议/退款", "查看后台详情，准备证据申诉"
    if any(w in dl for w in ["email address", "change my", "account", "注册邮箱"]):
        return "要求修改账户信息", "确认身份后协助修改"
    # Fallback: use subject as hint
    if subject:
        # Strip fwd/re prefixes
        subj_clean = re.sub(r'^(fwd?|re|回复)\s*:\s*', '', subject, flags=re.I).strip()
        # Shopify Inbox: "You have a new message from XXX" → extract customer name and message
        if subj_clean.lower().startswith("you have a new message from"):
            # Try to extract the actual message from description
            msg_match = re.search(r'from\s+\w+\s+\w+\s*\n(.+?)(?:\nSent via|Why did|$)', desc, re.S)
            if msg_match:
                return f"客户留言：「{msg_match.group(1).strip()[:25]}」", "24h内回复"
            return f"Inbox客户留言", "24h内回复"
        return f"咨询「{subj_clean[:20]}」", "24h内回复"
    return desc[:40] if desc else "一般咨询", "24h内回复"

def clean(t):
    t = re.sub(r'<[^>]+>', ' ', str(t))
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def run_triage():
    creds = load_creds()
    fd = creds["freshdesk"]
    domain = fd["domain"]
    api_key = fd["api_key"]
    group_id = fd["triage_group_id"]
    agents = fd["agents"]
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"📋 Freshdesk 分诊报告 — {now}\n"]
    
    tickets = get_untriaged_tickets(domain, api_key, group_id)
    
    # Filter out already processed tickets
    unprocessed = []
    for t in tickets:
        tags = t.get("tags", [])
        if "ai-draft-ready" in tags or "auto-spam-closed" in tags:
            continue
        unprocessed.append(t)
    
    if not unprocessed:
        lines.append("本轮无新工单 ✅")
        report = "\n".join(lines)
        print(report)
        send_feishu_message(report)
        return
    
    closed = []
    assigned_tickets = []  # list of dicts: {tid, agent_name, subject, desc_excerpt, draft}
    
    for t in unprocessed:
        tid = t["id"]
        subject = t.get("subject", "")
        
        # Get requester info + full ticket
        full = freshdesk_api(domain, api_key, f"/tickets/{tid}?include=requester")
        requester = full.get("requester", {})
        email = requester.get("email", "").lower()
        desc_raw = full.get("description_text", full.get("description", ""))
        desc_clean = clean(desc_raw)
        desc_excerpt = desc_clean[:120] if desc_clean else subject
        
        # Layer 1: Auto-close
        desc_lower = desc_raw.lower()
        auto_close = False
        
        # Special case: Shopify Inbox forwarding real customer messages → do NOT auto-close
        is_shopify_inbox = False
        if "mailer.shopify.com" in email:
            for pat in SHOPIFY_INBOX_PATTERNS:
                if pat in desc_lower:
                    is_shopify_inbox = True
                    break
        
        if not is_shopify_inbox:
            # Check for PayPal disputes first — don't auto-close these
            is_paypal_dispute = False
            if "@paypal.com" in email:
                combined_check = (subject + " " + desc_lower).lower()
                for pat in PAYPAL_DISPUTE_PATTERNS:
                    if pat in combined_check:
                        is_paypal_dispute = True
                        break
            
            if not is_paypal_dispute:
                # Sender-based auto-close
                for pattern in AUTO_CLOSE_SENDERS:
                    if pattern in email:
                        auto_close = True
                        break
            
            # Noreply local-part matching (e.g., noreply@payoneer.com, donotreply@xxx)
            if not auto_close:
                local_part = email.split("@")[0] if "@" in email else ""
                if local_part in ("noreply", "no-reply", "donotreply", "no_reply"):
                    auto_close = True
        
        if not auto_close:
            # Check content-based auto-close (BOTH subject and description)
            combined = (subject + " " + desc_lower).lower()
            for pat in AUTO_CLOSE_CONTENT:
                if pat in combined:
                    auto_close = True
                    break
        
        if auto_close:
            close_ticket(domain, api_key, tid)
            closed.append(f"  #{tid}: {subject} → 自动关闭 ({email})")
            continue
        
        # Layer 2: Assign based on content
        agent = agents["lena"]  # default
        agent_name = "Lena"
        tag = "4-order-lena"
        
        # Order/shipping/delivery related
        if any(w in desc_lower for w in ["order", "shipping", "delivery", "track", "refund", "cancel", "address", "invoice"]):
            agent = agents["lena"]
            agent_name = "Lena"
            tag = "4-order-lena"
        # Hardware/product issues
        elif any(w in desc_lower for w in ["evo", "move", "doesn't work", "broken", "defect", "issue", "problem", "error"]):
            agent = agents["gwen"]
            agent_name = "Gwen"
            tag = "3-product-gwen"
        # KOL/collaboration
        elif any(w in desc_lower for w in ["collaborat", "partner", "influencer", "review", "youtube", "sponsor"]):
            agent = agents["jony"]
            agent_name = "Jony"
            tag = "5-kol-jony"
        
        assign_ticket(domain, api_key, tid, agent, [tag, "needs-draft"])
        
        assigned_tickets.append({
            "tid": tid,
            "agent_name": agent_name,
            "subject": subject,
            "desc_excerpt": desc_excerpt,
            "tag": tag,
        })

    # ── Build report (detailed format) ──
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"📋 Freshdesk 分诊报告 — {now}\n"]

    # Closed tickets summary
    if closed:
        lines.append(f"🔴 自动关闭 {len(closed)} 张")
        for c in closed:
            lines.append(c)
        lines.append("")

    # Assigned tickets — detailed per-ticket format
    for item in assigned_tickets:
        lines.append(f"━━━ #{item['tid']} → {item['agent_name']} 📝 待起草 ━━━")
        lines.append(f"标题: {item['subject']}")
        lines.append(f"摘要: {item['desc_excerpt']}")
        lines.append("")

    total = len(closed) + len(assigned_tickets)
    if total == 0:
        lines.append("本轮无新工单 ✅")
    else:
        lines.append(f"共处理 {total} 张工单 ✅")

    report = "\n".join(lines)
    print(report)
    send_feishu_message(report)

if __name__ == "__main__":
    run_triage()
