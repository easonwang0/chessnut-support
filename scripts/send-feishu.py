#!/usr/bin/env python3
"""Send a text message to the user via Feishu API. Reads message from stdin or argv[1]."""
import json, urllib.request, sys, os

APP_ID = "cli_a94667ee4ffa9cd4"
APP_SECRET = "LZH0xS73OGkUMOyk75QDFcatKqyuMhKu"
USER_ID = "ou_c77bf01311e8aa4491d412be5b1139f5"

def main():
    if len(sys.argv) > 1:
        text = sys.argv[1]
    else:
        text = sys.stdin.read()
    
    if not text.strip():
        print("No content to send")
        return
    
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
