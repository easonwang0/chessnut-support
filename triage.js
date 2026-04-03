require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.FRESHDESK_API_KEY;
const DOMAIN = process.env.FRESHDESK_DOMAIN;
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

const AGENTS = {
  GWEN:     150033754311,
  LENA:     150022830364,
  JENNIFER: 150023804601,
  JONY:     150073233500
};

const AGENT_NAMES = {
  [AGENTS.GWEN]:     'Gwen (Move/Evo硬件)',
  [AGENTS.LENA]:     'Lena (物流订单)',
  [AGENTS.JENNIFER]: 'Jennifer (Air/Pro/Go/兜底)',
  [AGENTS.JONY]:     'Jony (Case/争议)'
};

const stats = {
  total: 0,
  stageBreakdown: {},
  assigneeBreakdown: { [AGENTS.GWEN]: 0, [AGENTS.LENA]: 0, [AGENTS.JENNIFER]: 0, [AGENTS.JONY]: 0 },
  draftedTickets: [],
  time: new Date().toISOString()
};

function bumpStage(tag) {
  stats.stageBreakdown[tag] = (stats.stageBreakdown[tag] || 0) + 1;
}

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: DOMAIN,
      path: '/api/v2' + path,
      method,
      headers: { 'Authorization': AUTH, 'Content-Type': 'application/json' }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body ? JSON.parse(body) : {});
        else resolve({ error: true, status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function extractText(ticket) {
  let bodyText = ticket.description_text || '';
  if (!bodyText && ticket.description) {
    bodyText = ticket.description.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  }
  return bodyText.replace(/\s+/g, ' ').trim();
}

async function updateTicket(id, data) { return request(`/tickets/${id}`, 'PUT', data); }
async function getContact(id) {
  try {
    const contact = await request(`/contacts/${id}`);
    return contact && !contact.error ? (contact.email || '').toLowerCase() : '';
  } catch { return ''; }
}
async function addPrivateNote(id, body) { return request(`/tickets/${id}/notes`, 'POST', { body, private: true, notify_emails: [] }); }
async function addTags(id, existingTags, newTags) {
  return updateTicket(id, { tags: [...new Set([...(existingTags || []), ...newTags])] });
}

// ──────────────────────────────────────────
// 自动回复模板
// ──────────────────────────────────────────
const DRAFTS = {
  hardware_defect: `Hi there,

Thank you for reaching out. The issue you raised is crucial for the optimization of our product.

To help us verify the issue and provide a quick solution or replacement, we kindly request you to provide us with:

1. Your Original Order Number
2. Product Serial Number (found behind/under the chessboard)
3. A detailed photo or video of the issue clearly demonstrating the problem.

Please note: This email system only supports video attachments smaller than 20MB. If your video is larger, we recommend using viewing tools such as Google Drive or YouTube to upload it and share the public link with us.

We will analyze the footage and provide a detailed solution immediately. Thanks for your understanding and support!`,

  move_charging: `Hi there,

Thank you for your patience.

Regarding your question about potentially faulty chess pieces or bases, we suggest that before we proceed with a replacement dock, you fully charge all chess pieces to check for any abnormal charging.

Please then provide a screenshot showing the battery status of each piece on the board via our App:
- iOS: Connect chessboard -> Bluetooth connection page -> Piece power
- Android: Connect chessboard -> Bluetooth connection page -> Piece Battery Level

Once verified, we will arrange the next steps for you immediately. We look forward to your reply.`,

  return_refund: `Hi there,

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
Chessnut Support Team`,

  shipping_delay: `Hi there,

Thank you for reaching out, and we sincerely apologize for the extended delay.

We understand how frustrating it must be to wait this long, and we take your concern very seriously. We are currently checking the status of your order with our fulfillment team.

We will follow up with you as soon as we have an update on your shipment. If you would prefer to cancel your order for a full refund instead, please let us know and we will process it immediately.

Again, we apologize for the inconvenience and appreciate your patience.

Best regards,
Chessnut Support Team`,

  move_wood_delay: `Hi there,

Thank you for reaching out and for your patience.

We sincerely apologize for the shipping delay caused by the ongoing restocking of the Chessnut Move - Advanced Robotic Chess Set (with wooden pieces). Restocking is expected to be completed by the end of March, at which time we will arrange shipment as soon as possible.

Once your package is shipped, we will update your order page and provide a tracking number immediately.

If the restocking affects any of your plans, please feel free to contact us. We will be happy to assist you and help you cancel your order for a full refund.

Thank you for your understanding and support.`,

  presale: `Hi there,

Thank you for reaching out to Chessnut Support!

Regarding your questions:
- Stock availability: We currently have stock in our EU warehouse, so you can order anytime.
- Shipping: Orders are typically shipped the next business day after placement. Tracking number will be updated within 1-3 business days.
- Delivery time: Usually 3-5 business days to most EU countries.
- Return policy: 30-day return policy. Buyer covers return shipping cost for non-defective items.
- Warranty: All products come with our standard warranty. Extended warranty can be purchased within 30 days of your order.

We hope this helps! Feel free to reach out if you have any other questions.

Best regards,
Chessnut Support Team`,

  product_intro: `Hi there,

Thank you for your interest in Chessnut!

Chessnut offers electronic chessboards that connect to online chess platforms. Here's a quick overview:

- Chessnut Air/Air+/Pro/Go: Electronic boards that let you play online chess with LED move indicators. You need a phone/tablet/PC to connect to Chess.com or Lichess. The pieces do NOT move automatically — you move them manually, and the board detects your moves.

- Chessnut Evo: An all-in-one device with built-in AI (MAIA). You can play against AI directly on the board, no external device needed.

- Chessnut Move: A robotic board where pieces move automatically!

You can learn more and shop at: https://www.chessnutech.com

Feel free to ask if you have any other questions!

Best regards,
Chessnut Support Team`
};

// ═══════════════════════════════════════════════════════
// 漏斗主逻辑
// 顺序: Spam → Case → 产品问题 → 订单物流 → 兜底
// ═══════════════════════════════════════════════════════
async function run() {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  console.log(`Fetching tickets updated since ${eightHoursAgo}...`);
  const tickets = await request(`/tickets?updated_since=${eightHoursAgo}&include=description`);

  if (tickets.error || !Array.isArray(tickets)) {
    console.error("Failed to fetch tickets", tickets);
    return;
  }

  console.log(`Fetched ${tickets.length} tickets. Beginning triage funnel...`);

  for (const ticket of tickets) {
    if (ticket.status === 5) continue;

    const body = extractText(ticket);
    const subject = (ticket.subject || '').toLowerCase();
    const bodyLower = body.toLowerCase();
    const text = subject + ' ' + bodyLower;
    // Freshdesk ticket API 可能不返回 requester_email，需要通过 requester_id 查联系人
    let email = (ticket.requester_email || ticket.email || '').toLowerCase();
    if (!email && ticket.requester_id) {
      email = await getContact(ticket.requester_id);
    }
    const existingTags = ticket.tags || [];

    let assigneeId = null;
    let stageTag = null;
    let draftKey = null;

    // ─── 第 1a 层：发件人级别硬关 ───
    // 根据 analysis.xlsx 工单统计分析，以下发件人地址均为系统/平台通知，可安全关闭
    const isNotificationSender =
      // Shopify（含无 .com 后缀的 no-reply@shopify）
      /@mailer\.shopify\.com$/i.test(email) ||
      /@shopify\.com$/i.test(email) && /no-reply|noreply|notification/i.test(email) ||
      /^no-reply@shopify$/i.test(email) ||
      /^noreply@shopify/i.test(email) ||
      /@shopify$/i.test(email) && /no-reply|noreply/i.test(email) ||
      // Mailchimp
      /@mailchimp\.com$/i.test(email) ||
      /@mandrillapp\.com$/i.test(email) ||
      // Facebook/Meta（广告审核、视频通知等）
      /@facebookmail\.com$/i.test(email) ||
      /@facebook\.com$/i.test(email) && /notification|support|no-reply/i.test(email) ||
      /@support\.facebook\.com$/i.test(email) ||
      /@business\.facebook\.com$/i.test(email) ||
      /@meta\.com$/i.test(email) && /no-reply|noreply|notification/i.test(email) ||
      // Fuuffy 物流
      /@fuuffy\.com$/i.test(email) ||
      // PPL 物流（捷克快递）
      /@pplcz\.com$/i.test(email) ||
      /@ppl-pk\.com$/i.test(email) ||
      // Amazon（各国 marketplace 通知，analysis.xlsx 中大量出现）
      /@marketplace\.amazon/i.test(email) ||
      /@amazon\.com$/i.test(email) && /no-reply|noreply|donotreply|do-not-reply/i.test(email) ||
      /@sellernotifications/i.test(email) ||
      /@sellernotifications\.amazon/i.test(email) ||
      /@amazon\.co\.(uk|jp|kr)$/i.test(email) && /no-reply|noreply|donotreply|do-not-reply|notification/i.test(email) ||
      /@amazon\.(de|fr|it|es|nl|se|pl|tr|eg|ae|sa|in|sg|au|ca|com\.br|com\.mx)$/i.test(email) && /no-reply|noreply|donotreply|do-not-reply|notification/i.test(email) ||
      /@bounce\.amazon/i.test(email) ||
      /@returns\.amazon/i.test(email) ||
      /@payments\.amazon/i.test(email) ||
      // AliExpress / 速卖通（卖家通知）
      /@aliexpress\.com$/i.test(email) && /no-reply|noreply|notification/i.test(email) ||
      /@aliexpress\.com$/i.test(email) && /seller/i.test(email) ||
      /@aliexpress\..*$/i.test(email) && /no-reply|noreply/i.test(email) ||
      /@service\.aliexpress/i.test(email) ||
      /@selleroperation/i.test(email) ||
      // Impact / 联盟营销
      /@impact\.com$/i.test(email) ||
      /@mediapartners/i.test(email) ||
      // PayPal 系统通知（非争议 Case）
      /@paypal\.com$/i.test(email) && /no-reply|noreply|service/i.test(email) ||
      /@paypal\.co\.(uk|au)$/i.test(email) && /no-reply|noreply/i.test(email) ||
      // TikTok
      /@tiktok\.com$/i.test(email) ||
      /@noreply\.tiktok/i.test(email) ||
      /@business\.tiktok/i.test(email) ||
      // 其他常见系统通知源
      /@noreply\./i.test(email) ||
      /@no-reply\./i.test(email) ||
      /@donotreply\./i.test(email) ||
      /@do-not-reply\./i.test(email) ||
      /^donotreply@/i.test(email) ||
      /^do-not-reply@/i.test(email) ||
      /^no-reply@/i.test(email) ||
      /^noreply@/i.test(email) ||
      /@mailer\./i.test(email) ||
      /@notifications?\./i.test(email) ||
      /@system\./i.test(email) ||
      /@automated\./i.test(email) ||
      /@bounce\./i.test(email);

    if (isNotificationSender) {
      console.log(`  #${ticket.id} → 1a SPAM sender: ${email}`);
      await updateTicket(ticket.id, { status: 5, tags: [...existingTags, 'auto-spam-closed', 'sender-based'] });
      bumpStage('1-spam'); stats.total++; continue;
    }

    // ─── 第 1b 层：内容级别硬关 ───

    const isHardSpam =
      // PayPal 收款通知（非争议）
      /notification of payment received/i.test(text) ||
      /has authorized a payment to you/i.test(text) ||
      /paypal.*receipt|payment.*received.*paypal/i.test(text) && !/dispute|case|claim/i.test(text) ||
      /您的支持请求对应的ID|support request.*created|gTech Customer Experience/i.test(text);

    if (isHardSpam) {
      await updateTicket(ticket.id, { status: 5, tags: [...existingTags, 'auto-spam-closed'] });
      bumpStage('1-spam'); stats.total++; continue;
    }

    const isSoftSpam =
      // Amazon 多语言通知（analysis.xlsx 中大量出现）
      /amazon hat (ihre|seine)|amazon.*versendet|amazon.*gesendet/i.test(text) ||
      /refund initiated.*order\s*112-/i.test(text) ||
      /reembolso.*iniciado.*pedido/i.test(text) ||
      /tu pago está en camino|votre paiement est en cours/i.test(text) ||
      /ihre auszahlung wird ausgeführt|pagamento elaborato con successo/i.test(text) ||
      /valida tu dirección de correo|your e-mail to (robert|sabrina)/i.test(text) ||
      /amazon.*product support report/i.test(text) ||
      /product details inquiry from amazon customer/i.test(text) ||
      /amazon has shipped your sold/i.test(text) ||
      /deine e-mail an|la tua e-mail a/i.test(text) ||
      /vorbereitung auf die neue eu-richtlinie/i.test(text) ||
      /voer eu-upv-registratienummers/i.test(text) ||
      // 速卖通系统通知
      /速卖通.*通知|卖家未发货订单关闭|订单.*已通过风控审核/i.test(text) ||
      /速卖通.*违背发货承诺|速卖通.*客户满意中心/i.test(text) ||
      /订单\d+.*关闭|订单\d+.*卖家未发货/i.test(text) ||
      /aliexpress.*notification|seller.*not.*shipped|订单.*关闭.*速卖通/i.test(text) ||
      // Fuuffy 物流追收费用
      /運單.*差價.*追收|運單.*派送延誤/i.test(text) ||
      // Partnership/collab 模板（不确定是否真实）
      /collab.*tiktok.*youtube|content creator.*based in|brand ambassador.*collaborat|sponsorship.*chess.*for/i.test(text) ||
      // 广告/垃圾邮件
      /our solopreneur sale is live/i.test(text) ||
      /即刻开始跨境销售|here.s a case update/i.test(text) ||
      // 联盟营销
      /partner has been deactivated/i.test(text) ||
      // PayPal 系统通知
      /about your paypal case.*pp-r-/i.test(text) && !/dispute|appeal|response|required/i.test(text) ||
      /status update.*case id.*pp-r-/i.test(text) ||
      /here.s a case update/i.test(text) ||
      // 音乐版权通知
      /audio copyright alert|unauthorized music usage|improper use of protected audio/i.test(text) ||
      // Facebook/Meta 系统通知
      /your facebook video cannot|你的 Facebook 视频无法|你的广告已通过审核/i.test(text) ||
      /login alert from impact/i.test(text) ||
      // 账号验证类
      /pakollinen tilin vahvistus|162741 是你的 6 位验证码/i.test(text) ||
      // 其他模糊系统通知
      /amazon.*feedback.*request|amazon.*a-to-z|amazon.*voice.*customer/i.test(text) ||
      /public terms application/i.test(text) ||
      /mailchimp.*(audience.*export|account is closed|order processing)/i.test(text) ||
      /mailchimp order/i.test(subject) ||
      /move order reminder.*confirm subscription/i.test(text) ||
      /subscribed to.*reminder/i.test(text) ||
      /problem gelöst.*anfrage/i.test(text);

    if (isSoftSpam) {
      await addTags(ticket.id, existingTags, ['ai-suggest-close']);
      bumpStage('1-spam-soft'); stats.total++; continue;
    }

    // ─── 第 2 层：Case / 争议 → Jony ───
    if (
      /paypal.*case|case.*pp-|pp-r-|pp-h-/i.test(text) ||
      /dispute|chargeback|disputed amount/i.test(text) ||
      /amazon.*dispute|amazon.*claim|fba.*removal|payoneer.*dispute/i.test(text) ||
      /case id.*(pp-|claim|dispute)/i.test(text) ||
      /速卖通.*纠纷|aliexpress.*dispute/i.test(text) ||
      /delivery bee.*wms|入庫已完成/i.test(text)
    ) {
      assigneeId = AGENTS.JONY;
      stageTag = '2-case-jony';
    }

    // ─── 第 3 层：产品问题（在订单之前拦截！） ───
    if (!assigneeId) {
      // 产品故障：精确匹配，不能太宽泛
      const hasHW = /defective|broken|faulty|magnetized|not\s*recogni[zs]|won.t\s*connect|malfunction|unresponsive|crash|sensor.*not\s*work|touch.*screen.*issue|display.*issue|piece.*defect|piece.*not\s*work|piece.*broken|\bpawn\b.*not\s*work|\bbishop\b.*not\s*work|\bknight\b.*not\s*work|\brook\b.*not\s*work|\bqueen\b.*not\s*work|\bking\b.*not\s*work|wrong.*piece|board.*not\s*work|board.*issue|tablero.*defectuoso|figuren.*defect|peaces|erkennt\s*nicht|reconnait\s*pas/i.test(text);
      // 软件/App使用问题
      const hasSW = /pgn|otb|how\s*to\s*play|how\s*to\s*use|firmware|resign|clock\s*mode|bluetooth|connect|login|register|signup|captcha|lichess|chess\.com|disconnect|sync|training|coach|engine|app.*crash|update.*browser/i.test(text);
      // 配件/充电底座相关
      const hasPC = /\bled\b|\bbattery\b|\bcharging\b|\bbase\b|\bcharger\b/i.test(text);
      const mMove = /\bmove\b|evo/i.test(text);
      const mAir = /\bair\b|air\s*\+|air\s*plus|\bpro\b|\bgo\b/i.test(text);

      if (hasHW || hasSW || hasPC) {
        if (mMove && !mAir) {
          assigneeId = AGENTS.GWEN; stageTag = '3-product-gwen';
          if (hasHW && /defective|broken|faulty|recogni[zs]|magnetized/i.test(text)) draftKey = 'hardware_defect';
          else if (/charging|battery|base/i.test(text) && /move/i.test(text)) draftKey = 'move_charging';
        } else if (mAir && !mMove) {
          assigneeId = AGENTS.JENNIFER; stageTag = '3-product-jennifer';
          if (hasHW && /defective|broken|faulty|recogni[zs]|magnetized/i.test(text)) draftKey = 'hardware_defect';
        } else if (hasSW && !mMove && !mAir) {
          assigneeId = AGENTS.JENNIFER; stageTag = '3-software-jennifer';
        } else if (hasHW || hasSW) {
          assigneeId = AGENTS.JENNIFER; stageTag = '3-product-ambiguous';
        }
      }
    }

    // ─── 第 4 层：订单 / 物流 → Lena ───
    if (!assigneeId) {
      const hasOrderNum = /order\s*#?\s*\d+|order\s*no\.?\s*\d+|order\s*number\s*\d+|我的订单/i.test(text);

      if (
        // 订单号 + 状态查询
        hasOrderNum && /status|update|follow.up|check.in|inquiry/i.test(text) ||
        // 发货时间
        /when.*ship|when.*deliver|shipping\s*(date|time|eta|update|status)|delivery\s*(date|time|eta|update|status)|has.*shipped|还没收到|什么时候发货/i.test(text) ||
        // 物流跟踪
        /tracking|track.*package|track.*order|where.*my.*order|where.*my.*package/i.test(text) ||
        // 取消订单
        /cancel.*order|order.*cancel|storno|stornierung/i.test(text) ||
        // 更改地址
        /change.*address|address.*update|update.*address/i.test(text) ||
        // 发票
        hasOrderNum && /invoice|发票|nota\s*fiscal/i.test(text) ||
        // 缺少配件/物品
        /missing\s*(item|piece|accessory)|not\s*received.*case|not\s*received.*bag/i.test(text) ||
        // 催发货
        /still\s*waiting|still\s*awaiting|haven.*received|long\s*time/i.test(text) && /order|ship|deliver/i.test(text) ||
        // Shopify 确认邮件回复（但需有订单相关动作词）
        /order.*confirmed/i.test(subject) && /re:|reply/i.test(text) && /ship|when|cancel|address|deliver|track|update|status/i.test(text) ||
        // 售前咨询
        /questions\s*before\s*ordering|return\s*policy|ship\s*to|deliver\s*to|退货政策/i.test(text) ||
        // 产品功能介绍
        /do\s*the\s*pieces\s*move|how\s*does.*work|what\s*is\s*chessnut|tell\s*me\s*about/i.test(text) ||
        // 运费
        /shipping\s*cost|shipping\s*fee|how\s*much.*ship|delivery\s*cost/i.test(text)
      ) {
        assigneeId = AGENTS.LENA;
        stageTag = '4-order-lena';

        if (/cancel.*order|order.*cancel/i.test(text)) draftKey = 'return_refund';
        else if (/still\s*waiting|haven.*received|long\s*time/i.test(text)) draftKey = 'shipping_delay';
        else if (/move/i.test(text) && /wood/i.test(text) && /delay|restock|out\s*of\s*stock/i.test(text)) draftKey = 'move_wood_delay';
        else if (/questions\s*before\s*ordering|before.*order/i.test(text)) draftKey = 'presale';
        else if (/do\s*the\s*pieces\s*move|how\s*does.*work|what\s*is\s*chessnut/i.test(text)) draftKey = 'product_intro';
      }
    }

    // ─── 第 5 层：兜底 → Jennifer ───
    if (!assigneeId) {
      if (/youtuber|collaboration|influencer|content\s*creator|kols|unboxing/i.test(text)) {
        assigneeId = AGENTS.JENNIFER; stageTag = '5-kol-jennifer';
      } else {
        assigneeId = AGENTS.JENNIFER; stageTag = '5-fallback-jennifer';
      }
    }

    // ─── 执行 ───
    const finalTags = [...existingTags, stageTag];
    await updateTicket(ticket.id, { responder_id: assigneeId, group_id: null });
    stats.assigneeBreakdown[assigneeId] = (stats.assigneeBreakdown[assigneeId] || 0) + 1;
    bumpStage(stageTag);

    if (draftKey && DRAFTS[draftKey]) {
      await addPrivateNote(ticket.id, DRAFTS[draftKey]);
      finalTags.push('ai-draft-ready');
      stats.draftedTickets.push(ticket.id);
    }

    await addTags(ticket.id, existingTags, finalTags);
    stats.total++;
  }

  // ─── 报告 ───
  const breakdownStr = Object.entries(stats.assigneeBreakdown)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => `${AGENT_NAMES[k] || k}: ${v}`)
    .join(', ');
  const stageStr = Object.entries(stats.stageBreakdown)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const report = `📊 Chessnut 工单分诊报告 (v3 漏斗: Spam→Case→产品→订单→兜底)
⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

处理: ${stats.total} 张

── 分层 ──
${stageStr}

── 指派 ──
${breakdownStr}

── 起草 ──
${stats.draftedTickets.length > 0 ? '#' + stats.draftedTickets.join(', #') : '无'}`;

  console.log('\n' + report);
  fs.writeFileSync('/tmp/chessnut-triage-report.txt', report);

  try {
    const appId = 'cli_a94667ee4ffa9cd4';
    const appSecret = 'LZH0xS73OGkUMOyk75QDFcatKqyuMhKu';
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const token = (await tokenRes.json()).tenant_access_token;
    const ownerId = process.env.OWNER_OPEN_ID || 'ou_c77bf01311e8aa4491d412be5b1139f5';
    await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: ownerId, msg_type: 'text', content: JSON.stringify({ text: report }) })
    });
    console.log('📤 Report sent.');
  } catch (e) { console.log('⚠️ Feishu error:', e.message); }
}

run().catch(console.error);
