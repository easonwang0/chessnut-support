require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.FRESHDESK_API_KEY;
const DOMAIN = process.env.FRESHDESK_DOMAIN;
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
  const tickets = await request(`/tickets?updated_since=${eightHoursAgo}&include=description`);
  
  if (tickets.error || !Array.isArray(tickets)) {
    console.error("Failed to fetch tickets", tickets);
    return;
  }
  
  console.log(`Fetched ${tickets.length} tickets. Beginning triage...`);
  
  let jonyJenniferTurn = 0;

  for (const ticket of tickets) {
    if (ticket.status === 5) continue;
    
    // 提取正文：优先 description_text，回退 description（可能是 HTML），去除 HTML 标签
    let bodyText = ticket.description_text || '';
    if (!bodyText && ticket.description) {
      bodyText = ticket.description.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    }
    const cleanBody = bodyText.replace(/\s+/g, ' ').trim();
    const subjectLower = (ticket.subject || '').toLowerCase();
    const bodyLower = cleanBody.toLowerCase();
    // 合并用于关键词匹配（标题+正文）
    const textToAnalyze = subjectLower + " " + bodyLower;
    
    // 正文截取前 500 字符用于日志（调试用）
    const bodyPreview = cleanBody.substring(0, 500);

    // -------------------------------------------------------------
    // 【第一关】Spam 拦截（分两层：确认关闭 + 建议关闭）
    // 原则：不确定的绝不关闭，宁可放过
    // -------------------------------------------------------------

    // ===== 发件人级别硬关闭：这些发件人发的邮件都是系统通知 =====
    const ticketEmail = (ticket.requester_email || ticket.email || '').toLowerCase();
    const isNotificationSender = (
      // Shopify 系统通知
      /@mailer\.shopify\.com$/i.test(ticketEmail) ||
      /@shopify\.com$/i.test(ticketEmail) && /no-reply|noreply|notification/i.test(ticketEmail) ||
      // Mailchimp
      /@mailchimp/i.test(ticketEmail) ||
      /@mandrillapp\.com$/i.test(ticketEmail) ||
      // PayPal 通知（收款类靠内容判断，这里不按发件人关）
      /@marketplace\.amazon/i.test(ticketEmail) ||
      /@amazon\.com$/i.test(ticketEmail) && /no-reply|noreply/i.test(ticketEmail) ||
      /@sellernotifications/i.test(ticketEmail) ||
      // Meta/Facebook 广告通知
      /@facebookmail\.com$/i.test(ticketEmail) ||
      /@support\.facebook\.com$/i.test(ticketEmail) ||
      /notification@facebook/i.test(ticketEmail) ||
      // 物流系统通知
      /@fuuffy\.com$/i.test(ticketEmail) ||
      /@pplcz\.com$/i.test(ticketEmail) ||
      /@ppl-pk\.com$/i.test(ticketEmail) ||
      // 速卖通
      /@aliexpress\.com$/i.test(ticketEmail) && /no-reply|noreply|notification/i.test(ticketEmail) ||
      // 其他常见系统通知
      /@impact\.com$/i.test(ticketEmail) ||
      /@mediapartners/i.test(ticketEmail)
    );

    if (isNotificationSender) {
        console.log(`Ticket #${ticket.id} - NOTIFICATION SENDER (${ticketEmail}) -> Closing.`);
        await request(`/tickets/${ticket.id}`, 'PUT', { status: 5, tags: [...(ticket.tags||[]), 'auto-spam-closed', 'sender-based'] });
        continue;
    }

    // ===== 硬关闭：精确匹配，100% 确定是垃圾/系统通知 =====
    const isHardSpam = (
      // Mailchimp 精确标题
      /mailchimp audience export complete/i.test(textToAnalyze) ||
      /mailchimp account is closed/i.test(textToAnalyze) ||
      /mailchimp order processing/i.test(textToAnalyze) ||
      // PayPal 收款通知（非争议）
      /notification of payment received/i.test(textToAnalyze) ||
      /has authorized a payment to you/i.test(textToAnalyze) ||
      /billing agreement.*change to/i.test(textToAnalyze) ||
      // 纯广告（标题精确匹配）
      /our solopreneur sale is live/i.test(textToAnalyze) ||
      /reveal the day.s best deals/i.test(textToAnalyze) ||
      /need gpu power to scale up your ai startups/i.test(textToAnalyze) ||
      /obsessed/i.test(textToAnalyze) && /deal|offer|discount|shop/i.test(textToAnalyze) ||
      // 验证码/自动回复
      /tiktok.*验证码/i.test(textToAnalyze) ||
      /^(验证码|verification code)/i.test(ticket.subject) ||
      // 订阅通知
      /subscribed to.*move order reminder/i.test(textToAnalyze) ||
      // 公共条款
      /public terms application/i.test(textToAnalyze) ||
      // 诈骗
      /matter intake processing started.*ref.*att-req/i.test(textToAnalyze) ||
      // impact 产品目录
      /impact.*product catalog/i.test(textToAnalyze) ||
      // 网站好评通知
      /left a \d star review for/i.test(textToAnalyze) ||
      // 订单处理/延误通知（系统自动）
      /mailchimp order processing notification/i.test(textToAnalyze) ||
      // Shopify 系统通知
      /no-reply@mailer\.shopify\.com/i.test(textToAnalyze) ||
      // KS 信息通知
      /^KS信息通知/i.test(ticket.subject) ||
      // 页面关闭通知
      /页面关闭通知/i.test(textToAnalyze)
    );

    if (isHardSpam) {
        console.log(`Ticket #${ticket.id} - HARD SPAM -> Closing.`);
        await request(`/tickets/${ticket.id}`, 'PUT', { status: 5, tags: [...(ticket.tags||[]), 'auto-spam-closed'] });
        continue;
    }

    // ===== 软关闭：可能是垃圾，不确定，打建议关闭 tag =====
    const isSoftSpam = (
      // Amazon 通知（可能有客户真的在问 Amazon 订单问题）
      /(amazon hat ihre|refund initiated for order|unfulfillable.*fba.*inventory|la tua e-mail a|亚马逊.*退款通知|亚马逊.*站内信息|亚马逊.*广告|亚马逊.*发货通知)/i.test(textToAnalyze) ||
      // 速卖通通知（可能有客户投诉速卖通）
      /(卖家未发货订单关闭|全球速卖通客户满意中心|速卖通.*通知|违背发货承诺.*预扣罚单)/i.test(textToAnalyze) ||
      // 物流系统通知（可能有客户真的在问物流）
      /(運單派送延誤|運單.*收據|運單.*差價|fuuffy.*收據|fuuffy.*派送|fuuffy.*通知|ppl.*z.silku|ppl.*doru.ov)/i.test(textToAnalyze) ||
      // 广告审核
      /广告审核通过/i.test(textToAnalyze) ||
      // Facebook/Instagram 通知
      /(facebook|instagram).*通知/i.test(textToAnalyze) ||
      // 音乐版权
      /音乐版权通知/i.test(textToAnalyze) ||
      // 列表导出
      /列表的.*导出通知/i.test(textToAnalyze) ||
      /列表的导出完成/i.test(textToAnalyze) ||
      // 退信通知
      /退信通知/i.test(textToAnalyze) ||
      // 订阅/自动化通知（非 Mailchimp）
      /(set up an automation to welcome|order reminder subscription)/i.test(textToAnalyze) ||
      // 其他模糊广告
      /(catalog submission|security review)/i.test(textToAnalyze)
    );

    if (isSoftSpam) {
        console.log(`Ticket #${ticket.id} - SOFT SPAM -> Tagging suggest-close (not closing).`);
        await request(`/tickets/${ticket.id}`, 'PUT', { tags: [...(ticket.tags||[]), 'ai-suggest-close'] });
        continue;
    }

    // -------------------------------------------------------------
    // 【第二关】分析分发 (Routing) 与 草稿起草 (Drafting)
    // -------------------------------------------------------------
    let assigneeId = null;
    let draftMessage = null;
    const draftTag = 'ai-draft-ready';

    // === 优先级 1: 识别特定来源/场景 ===

    // Jennifer Chen 发出的缺货邮件的回复 → Jennifer
    // 注意：标题可能是 "Re: Message from Chessnut" 很泛，需要看正文里是否在回复缺货
    if (/(message de chessnut|message from chessnut)/i.test(subjectLower) && 
        /(缺货|out of stock|restock|delay|apologize.*delay|sorry.*delay|shipping.*delay|reply|回复|re:|waiting for|when will|delayed)/i.test(bodyLower)) {
        assigneeId = AGENTS.JENNIFER;
    }
    // AliExpress 物流/预售 → Jony He
    else if (/(速卖通物流|aliexpress|无忧物流|速卖通.*发货|预售.*发货|速卖通.*order|aliexpress.*order|aliexpress.*shipping|aliexpress.*delivery)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JONY;
    }
    // Amazon 后台通知、FBA、争议 → Jony He
    else if (/(dispute|case id.*pp-|will close on|wms|amazon order|fba|delivery bee|amazon.*removal|amazon.*fba|amazon.*new inquiry)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JONY;
    }
    // PayPal case → Jony He
    else if (/(paypal.*case|pp-.*case|payoneer)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JONY;
    }

    // === 优先级 2: 产品相关售后/技术问题 ===

    // evo 退货 → Gwen Liu
    else if (/(evo)/i.test(textToAnalyze) && /(return|replace|refund|退货|换货)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.GWEN;
    }
    // move 退货 → Gwen Liu
    else if (/(move)/i.test(textToAnalyze) && /(return|replace|refund|退货|换货)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.GWEN;
    }
    // Gwen: EVO/MOVE 硬件故障、识别问题、充电、固件等
    else if (/(evo|move)/i.test(textToAnalyze) && /(defective|broken|magnetized|firmware|review|star|base|charging|won't connect|recognition|not recognize|pgn|training)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.GWEN;
        
        if (/(defective|broken|magnetized|recognize)/i.test(textToAnalyze)) {
            draftMessage = `Hi there,\n\nThank you for reaching out. The issue you raised is crucial for the optimization of our product.\n\nTo help us verify the issue and provide a quick solution or replacement, we kindly request you to provide us with:\n\n1. Your Original Order Number\n2. Product Serial Number (found behind/under the chessboard)\n3. A detailed photo or video of the issue clearly demonstrating the problem.\n\nPlease note: This email system only supports video attachments smaller than 20MB. If your video is larger, we recommend using viewing tools such as Google Drive or YouTube to upload it and share the public link with us.\n\nWe will analyze the footage and provide a detailed solution immediately. Thanks for your understanding and support!`;
        } else if (/(base|charging|battery)/i.test(textToAnalyze) && /move/i.test(textToAnalyze)) {
            draftMessage = `Hi there,\n\nThank you for your patience.\n\nRegarding your question about potentially faulty chess pieces or bases, we suggest that before we proceed with a replacement dock, you fully charge all chess pieces to check for any abnormal charging.\n\nPlease then provide a screenshot showing the battery status of each piece on the board via our App:\n- iOS: Connect chessboard -> Bluetooth connection page -> Piece power\n- Android: Connect chessboard -> Bluetooth connection page -> Piece Battery Level\n\nOnce verified, we will arrange the next steps for you immediately. We look forward to your reply.`;
        }
    }
    // Go 使用问题 → Jennifer Chen
    else if (/(chessnut go|go chess)/i.test(textToAnalyze) && /(pgn|game|otb|can't find|how to|usage|使用|玩|找不)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JENNIFER;
    }
    // AIR/AIR+/PRO 产品相关 → Jennifer Chen
    else if (/(air\+|air pro|chessnut air|chessnut pro)/i.test(textToAnalyze) && /(return|defective|broken|magnetized|firmware|review|star|base|charging|won't connect|recognition|not recognize)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JENNIFER;
    }

    // === 优先级 3: 退货/退款（在订单匹配之前）===
    else if (/(return|refund|remboursement|retour|退货|退款|cancel.*order)/i.test(textToAnalyze) && !/(defective|broken|faulty)/i.test(textToAnalyze)) {
        if (/(evo|move)/i.test(textToAnalyze)) assigneeId = AGENTS.GWEN;
        else assigneeId = AGENTS.LENA;
        
        draftMessage = `Hi there,

Thank you for reaching out to Chessnut Support.

We understand that you would like to initiate a return. We're sorry to hear that the product didn't meet your expectations.

Before proceeding, we'd like to mention that many issues can be resolved through troubleshooting. If you're experiencing any technical difficulties, we'd be happy to help you resolve them first.

If you still wish to proceed with the return, please note:
- We offer a 30-day return policy
- The product should be in its original packaging
- Buyer covers return shipping cost for non-defective items

Please provide us with:
1. Your order number
2. Reason for the return

Once we receive this information, we will provide you with the return address and further instructions.

We look forward to your reply.

Best regards,
Chessnut Support Team`;
    }
    // 长期未发货投诉
    else if (/(still waiting|still awaiting|months ago|placed.*order.*ago|ordered.*ago.*not|haven't received|still no|long time)/i.test(textToAnalyze) && /(order|ship)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        draftMessage = `Hi there,

Thank you for reaching out, and we sincerely apologize for the extended delay.

We understand how frustrating it must be to wait this long, and we take your concern very seriously. We are currently checking the status of your order with our fulfillment team.

We will follow up with you as soon as we have an update on your shipment. If you would prefer to cancel your order for a full refund instead, please let us know and we will process it immediately.

Again, we apologize for the inconvenience and appreciate your patience.

Best regards,
Chessnut Support Team`;
    }
    // 产品功能咨询
    else if (/(do the pieces move|electronic board|play against|how does it work|how does.*work|what is chessnut|tell me about)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        draftMessage = `Hi there,

Thank you for your interest in Chessnut!

Chessnut offers electronic chessboards that connect to online chess platforms. Here's a quick overview:

- Chessnut Air/Air+/Pro/Go: Electronic boards that let you play online chess with LED move indicators. You need a phone/tablet/PC to connect to Chess.com or Lichess. The pieces do NOT move automatically — you move them manually, and the board detects your moves.

- Chessnut Evo: An all-in-one device with built-in AI (MAIA). You can play against AI directly on the board, no external device needed.

- Chessnut Move: A robotic board where pieces move automatically!

You can learn more and shop at: https://www.chessnutech.com

Feel free to ask if you have any other questions!

Best regards,
Chessnut Support Team`;
    }
    // 运费/配送费咨询
    else if (/(shipping cost|shipping fee|how much.*ship|delivery cost|运费|配送费)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        draftMessage = `Hi there,

Thank you for your interest in Chessnut!

Shipping costs depend on your location and will be calculated at checkout. Here's a general estimate:
- US & EU: Standard shipping typically takes 5-7 business days
- Other regions: Approximately 10-15 business days

To see the exact shipping cost for your location, please add your desired product to the cart and enter your shipping address at checkout.

If you have any other questions, feel free to ask!

Best regards,
Chessnut Support Team`;
    }
    // 产品配件/配置咨询
    else if (/(storage box|chess piece storage|配件|存储盒|what.*include|what.*come with|contains|product configuration)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        draftMessage = `Hi there,

Thank you for contacting us.

Thank you so much for your support of Chessnut, and we're glad you received the premium walnut wood chess piece storage box.

Regarding your question about the wooden chess pieces, please note: the premium walnut wood chess piece storage box is a separate accessory. It only includes the storage box (with charging function and status window) and does not include the wooden chess pieces. The plastic chess pieces that came with the chessboard can be stored and charged normally in this storage box, so please use them with confidence.

If you still have questions about the product configuration, please feel free to contact us. We are happy to provide further assistance.

We hope our reply has been helpful. Thank you again for your understanding and support!`;
    }
    // Shopify 订单相关 → Lena Wang
    else if (/(shopify|order #\d+|order no \d+|order number \d+|my order|status update|shipping eta|missing item|order adjustment|track|where.*order|where.*package|order.*confirmed|order.*shipped|还没收到|什么时候发货|发货时间|订单.*状态|订单.*物流|where is my|when will.*ship|has.*shipped|delivery update)/i.test(textToAnalyze) 
             && !/(evo|move|defective|broken|aliexpress|速卖通|go)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        
        if (/(delay|when|shipping date)/i.test(textToAnalyze) && /move/i.test(textToAnalyze) && /wood/i.test(textToAnalyze)) {
            draftMessage = `Hi there,

Thank you for reaching out and for your patience.

We sincerely apologize for the shipping delay caused by the ongoing restocking of the Chessnut Move - Advanced Robotic Chess Set (with wooden pieces). Restocking is expected to be completed by the end of March, at which time we will arrange shipment as soon as possible.

Once your package is shipped, we will update your order page and provide a tracking number immediately.

If the restocking affects any of your plans, please feel free to contact us. We will be happy to assist you and help you cancel your order for a full refund.

Thank you for your understanding and support.`;
        }
    }
    // 售前咨询 → Lena Wang
    else if (/(questions before ordering|before.*order|shipping to|deliver to|退货政策|return policy|warranty|deliver to|ship to.*germany|ship to.*eu)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
        
        if (/(questions before ordering|before.*order|thinking about|considering)/i.test(textToAnalyze)) {
            draftMessage = `Hi there,

Thank you for reaching out to Chessnut Support!

Regarding your questions:
- Stock availability: We currently have stock in our EU warehouse, so you can order anytime.
- Shipping: Orders are typically shipped the next business day after placement. Tracking number will be updated within 1-3 business days.
- Delivery time: Usually 3-5 business days to most EU countries.
- Return policy: 30-day return policy. Buyer covers return shipping cost for non-defective items.
- Warranty: All products come with our standard warranty. Extended warranty can be purchased within 30 days of your order.

We hope this helps! Feel free to reach out if you have any other questions.

Best regards,
Chessnut Support Team`;
        }
    }
    // KOL/评测/Youtuber → Jennifer
    else if (/(youtuber|review|kols|influencer|content creator|评测|博主|unboxing)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JENNIFER;
    }

    // === 优先级 4: 未提及具体型号的退换货/技术问题 → Gwen/Jennifer 轮询 ===
    else if (/(return|defective|broken|magnetized|firmware|base|charging|won't connect|recognition|not recognize|pgn|training)/i.test(textToAnalyze)) {
        assigneeId = (jonyJenniferTurn % 2 === 0) ? AGENTS.GWEN : AGENTS.JENNIFER;
        jonyJenniferTurn++;
    }
    // 兜底：其他所有工单 → Jony/Jennifer 轮询
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
      await request(`/tickets/${ticket.id}`, 'PUT', { tags: [...(ticket.tags||[]), draftTag] });
    }
  }
  
  console.log("✅ Triage logic fully executed with real API payloads.");
}

run().catch(console.error);
