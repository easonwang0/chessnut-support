const fs = require('fs');
const https = require('https');

const API_KEY = 'Wj5RRspS8Z8yXiGjqQpu';
const DOMAIN = 'chessnutech.freshdesk.com';
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

// 从先前的系统中提取出的真实 Agent IDs
const AGENTS = {
  GWEN: 150033754311,
  LENA: 150022830364,
  JENNIFER: 150023804601,
  JONY: 150073233500
};

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: DOMAIN,
      path: '/api/v2' + path,
      method: method,
      headers: {
        'Authorization': AUTH,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {});
        } else {
          resolve({ error: true, status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  console.log(`Fetching tickets updated since ${eightHoursAgo}...`);
  // include=description 用于获取详细正文以便精准判断
  const tickets = await request(`/tickets?updated_since=${eightHoursAgo}&include=description`);
  
  if (tickets.error || !Array.isArray(tickets)) {
    console.error("Failed to fetch tickets", tickets);
    return;
  }
  
  console.log(`Fetched ${tickets.length} tickets. Beginning triage...`);
  
  let jonyJenniferTurn = 0; // 轮询计数器

  for (const ticket of tickets) {
    if (ticket.status === 5) continue; // 已经是 Closed 状态的直接跳过
    
    // 合并标题和正文进行关键词分析 (转小写)
    const textToAnalyze = (ticket.subject + " " + (ticket.description_text || "")).toLowerCase();
    
    // -------------------------------------------------------------
    // 【第一关】Spam 拦截规则：系统自动发送的无价值通知
    // -------------------------------------------------------------
    const spamKeywords = [
        "notification of payment", 
        "amazon hat", 
        "authorized a payment", 
        "parcel is on its way", 
        "advertisement has been approved", 
        "order confirmed", 
        "facebook 视频无法显示",
        "you have a new message from",
        "訂單已確認",
        "訂單收據"
    ];
    
    if (spamKeywords.some(kw => textToAnalyze.includes(kw))) {
       console.log(`Ticket #${ticket.id} - SPAM detected -> Closing.`);
       await request(`/tickets/${ticket.id}`, 'PUT', { status: 5, tags: ['auto-spam-closed'] });
       continue; // 处理完即跳过后续阶段
    }

    // -------------------------------------------------------------
    // 【第二关】分析分发 (Routing) 与 草稿起草 (Drafting)
    // -------------------------------------------------------------
    let assigneeId = null;
    let draftMessage = null;
    const draftTag = 'ai-draft-ready';

    // LENA (物流/订单大管家): 匹配物流、催单、改地址、调价等
    if (/(shipping|my order|address|discount|price adjustment|delay|tracking|delivery)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        
        // 场景判断：Move 木棋子 缺货应对
        if (/(delay|when|shipping date)/i.test(textToAnalyze) && /move/i.test(textToAnalyze) && /wood/i.test(textToAnalyze)) {
            draftMessage = `Hi there,\n\nThank you for reaching out and for your patience.\n\nWe sincerely apologize for the shipping delay caused by the ongoing restocking of the Chessnut Move - Advanced Robotic Chess Set (with wooden pieces). Restocking is expected to be completed by the end of March, at which time we will arrange shipment as soon as possible.\n\nOnce your package is shipped, we will update your order page and provide a tracking number immediately.\n\nIf the restocking affects any of your plans, please feel free to contact us. We will be happy to assist you and help you cancel your order for a full refund.\n\nThank you for your understanding and support.`;
        }
    }
    // GWEN (硬件售后与评价): 匹配损坏、磁吸问题、固件更新、由于断连/充电报修等
    else if (/(defective|broken|magnetized|firmware|review|star|base|charging|won't connect|recognition|not recognize)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.GWEN;
        
        // 场景判断：硬件物理损坏或无磁吸、无感应 -> 索取证明
        if (/(defective|broken|magnetized|recognize)/i.test(textToAnalyze)) {
            draftMessage = `Hi there,\n\nThank you for reaching out. The issue you raised is crucial for the optimization of our product.\n\nTo help us verify the issue and provide a quick solution or replacement, we kindly request you to provide us with:\n\n1. Your Original Order Number\n2. Product Serial Number (found behind/under the chessboard)\n3. A detailed photo or video of the issue clearly demonstrating the problem.\n\nPlease note: This email system only supports video attachments smaller than 20MB. If your video is larger, we recommend using viewing tools such as Google Drive or YouTube to upload it and share the public link with us.\n\nWe will analyze the footage and provide a detailed solution immediately. Thanks for your understanding and support!`;
        } 
        // 场景判断：Move 底座充电故障 -> 索取 App 截图
        else if (/(base|charging|battery)/i.test(textToAnalyze) && /move/i.test(textToAnalyze)) {
            draftMessage = `Hi there,\n\nThank you for your patience.\n\nRegarding your question about potentially faulty chess pieces or bases, we suggest that before we proceed with a replacement dock, you fully charge all chess pieces to check for any abnormal charging.\n\nPlease then provide a screenshot showing the battery status of each piece on the board via our App:\n- iOS: Connect chessboard -> Bluetooth connection page -> Piece power\n- Android: Connect chessboard -> Bluetooth connection page -> Piece Battery Level\n\nOnce verified, we will arrange the next steps for you immediately. We look forward to your reply.`;
        }
    }
    // JENNIFER / JONY (平台客服支持与售后兜底): 其他所有工单 比如 PayPal、售前疑问
    else {
        assigneeId = (jonyJenniferTurn % 2 === 0) ? AGENTS.JONY : AGENTS.JENNIFER;
        jonyJenniferTurn++;
    }

    // 执行发往 Freshdesk 的 API 操作
    if (assigneeId) {
        console.log(`Ticket #${ticket.id} -> Assigning to Agent ID: ${assigneeId}`);
        await request(`/tickets/${ticket.id}`, 'PUT', { responder_id: assigneeId, group_id: null });
    }
    
    if (draftMessage) {
        console.log(`Ticket #${ticket.id} -> Adding Private Draft Note.`);
        await request(`/tickets/${ticket.id}/notes`, 'POST', {
            body: draftMessage,
            private: true,
            notify_emails: []
        });
        // 标记以便客服明天一眼看到
        await request(`/tickets/${ticket.id}`, 'PUT', { tags: [...(ticket.tags||[]), draftTag] });
    }
  }
  
  console.log("✅ Triage logic fully executed with real API payloads.");
}

run().catch(console.error);
