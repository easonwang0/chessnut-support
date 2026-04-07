"""
17track webhook receiver
Receives tracking updates from 17track and stores them.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, os, time

TRACKING_FILE = '/tmp/17track_updates.jsonl'

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
        except:
            data = {'raw': body.decode('utf-8', errors='replace')}
        
        # Append to tracking file
        with open(TRACKING_FILE, 'a') as f:
            record = {
                'timestamp': int(time.time()),
                'data': data
            }
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
        
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Received webhook: {json.dumps(data, ensure_ascii=False)[:200]}")
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"code":0}')
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == '__main__':
    port = 8080
    server = HTTPServer(('127.0.0.1', port), WebhookHandler)
    print(f"17track webhook server running on port {port}")
    server.serve_forever()
