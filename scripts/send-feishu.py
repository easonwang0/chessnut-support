#!/usr/bin/env python3
"""Send a text message to the user via Feishu API. Reads message from stdin or argv[1].
Configuration: reads from ~/.openclaw/credentials/chessnut-services.json → "feishu" section,
or falls back to environment variables / hardcoded defaults."""
import json, urllib.request, sys, os

def load_config():
    cfg_path = os.path.expanduser("~/.openclaw/credentials/chessnut-services.json")
    try:
        with open(cfg_path) as f:
            cfg = json.load(f)
        fd = cfg.get("feishu", {})
        return {
            "app_id": fd.get("app_id", os.environ.get("FEISHU_APP_ID", "")),
            "app_secret": fd.get("app_secret", os.environ.get("FEISHU_APP_SECRET", "")),
            "user_id": fd.get("user_id", os.environ.get("FEISHU_USER_ID", "")),
        }
    except Exception:
        return {
            "app_id": os.environ.get("FEISHU_APP_ID", ""),
            "app_secret": os.environ.get("FEISHU_APP_SECRET", ""),
            "user_id": os.environ.get("FEISHU_USER_ID", ""),
        }

def main():
    config = load_config()
    APP_ID = config["app_id"]
    APP_SECRET = config["app_secret"]
    USER_ID = config["user_id"]

    if not all([APP_ID, APP_SECRET, USER_ID]):
        print("ERROR: Missing Feishu config. Add to chessnut-services.json under 'feishu' key:")
        print('  {"feishu": {"app_id": "...", "app_secret": "...", "user_id": "ou_..."}}')
        return

    if len(sys.argv) > 1:
        text = sys.argv[1]
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("No content to send")
        return

    # Truncate if too long (Feishu limit is ~30KB)
    if len(text) > 28000:
        text = text[:28000] + "\n\n... [报告已截断]"

    # Get token
    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        data=json.dumps({"app_id": APP_ID, "app_secret": APP_SECRET}).encode(),
        headers={"Content-Type": "application/json"}
    )
    token = json.loads(urllib.request.urlopen(req, timeout=15).read()).get("tenant_access_token", "")
    if not token:
        print("ERROR: Failed to get Feishu token")
        return

    # Send message
    msg = json.dumps({
        "receive_id": USER_ID,
        "msg_type": "text",
        "content": json.dumps({"text": text})
    }).encode()

    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
        data=msg, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    result = json.loads(urllib.request.urlopen(req, timeout=15).read())
    if result.get("code") == 0:
        print("OK: Message sent")
    else:
        print(f"ERROR: {result}")

if __name__ == "__main__":
    main()
