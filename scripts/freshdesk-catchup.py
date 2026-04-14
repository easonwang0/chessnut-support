#!/usr/bin/env python3
"""Freshdesk 24h catchup scan — finds unprocessed tickets missed by regular triage."""
import json, time, urllib.request, urllib.error, ssl, base64, sys
from datetime import datetime, timedelta, timezone

with open("/root/.openclaw/credentials/chessnut-services.json") as f:
    CFG = json.load(f)
FD = CFG["freshdesk"]
BASE = f"https://{FD['domain']}/api/v2"
AUTH = base64.b64encode(f"{FD['api_key']}:X".encode()).decode()
ctx = ssl.create_default_context()

def api(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Basic {AUTH}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            rdata = resp.read()
            return json.loads(rdata) if rdata else None
    except urllib.error.HTTPError as e:
        if e.code == 429:
            time.sleep(int(e.headers.get("Retry-After", 5)))
            return api(method, path, body)
        return None

def get(path): return api("GET", path)

# Unified tag set — must match fetch_tickets.js triageTags
TAGS_SKIP = {"auto-spam-closed","ai-triaged","ai-draft-ready","ai-suggest-close",
             "sender-based","2-case-jony","2-dispute-jony",
             "3-product-gwen","3-product-jennifer","3-software-jennifer","3-product-ambiguous",
             "4-order-lena","5-kol-jony","5-kol-jennifer","5-fallback-jennifer"}
PROTECTED = set(FD.get("protected_groups", []))

hours = int(sys.argv[1]) if len(sys.argv) > 1 else 24
since = datetime.now(timezone.utc) - timedelta(hours=hours)
print(f"Scanning past {hours}h since {since.isoformat()}", flush=True)

all_tickets = []
for page in range(1, 50):
    ts = get(f"/tickets?page={page}&per_page=100&order_type=desc&order_by=created_at")
    if not ts: break
    for t in ts:
        created = datetime.fromisoformat(t["created_at"].replace("Z","+00:00"))
        if created >= since:
            all_tickets.append(t)
    oldest = ts[-1]["created_at"] if ts else None
    if oldest:
        old_dt = datetime.fromisoformat(oldest.replace("Z","+00:00"))
        if old_dt < since:
            break
    if len(ts) < 100: break
    time.sleep(0.3)

unprocessed = []
for t in all_tickets:
    gid = t.get("group_id")
    if gid in PROTECTED: continue
    if gid and gid != FD["triage_group_id"]: continue
    tags = set(t.get("tags", []))
    status = t.get("status")
    if status == 5 or tags & TAGS_SKIP: continue
    unprocessed.append(t)

result = {
    "total": len(all_tickets),
    "unprocessed_count": len(unprocessed),
    "unprocessed": [{
        "id": t["id"],
        "subject": t.get("subject",""),
        "status": t.get("status"),
        "tags": t.get("tags",[]),
        "created": t["created_at"]
    } for t in unprocessed]
}
print(json.dumps(result, ensure_ascii=False, indent=2))
