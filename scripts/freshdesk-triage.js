#!/usr/bin/env node
// Chessnut Freshdesk Triage Script
// Reads tickets from Customer Support group (past 6h), triages, drafts replies

const https = require('https');
const fs = require('fs');

const CONFIG = JSON.parse(fs.readFileSync(`${process.env.HOME}/.openclaw/credentials/chessnut-services.json`, 'utf8'));
const FD = CONFIG.freshdesk;

const BASE = `https://${FD.domain}/api/v2`;
const AUTH = Buffer.from(`${FD.api_key}:X`).toString('base64');

// Spam sender patterns (Layer 1)
const SPAM_PATTERNS = [
  /@mailer\.shopify\.com/i, /@shopifyemail\.com/i,
  /donotreply@amazon\.com/i, /@amazon\..*noreply/i, /noreply@amazon/i,
  /@marketplace\.amazon\./i, /@sellernotifications\./i,
  /fba-noreply@amazon\.com/i,
  /@facebookmail\.com/i, /@business-updates\.facebook\.com/i,
  /@mail\.instagram\.com/i, /@instagram\.com/i,
  /@mailchimp\.com/i, /@mandrillapp\.com/i,
  /@fuuffy\.com/i,
  /@impact\.com/i, /notifications@app\.impact\.com/i,
  /@paypal\.com/i,
  /@pplcz\.com/i, /@ppl-pk\.com/i,
  /@tiktok\.com/i, /@business\.tiktok/i,
  /@aliexpress\.com/i,
  /@kickstarter\.com/i,
  /@noreply\./i, /@no-reply\./i, /@donotreply\./i,
  /^noreply@/i, /^no-reply@/i, /^donotreply@/i,
  /@mailer\./i, /@notifications\./i, /@bounce\./i,
];

// Exception: don't close these
const SPAM_EXCEPTIONS = [
  /no-reply@mailsupport\.aliyun\.com/i,
];

// Existing triage tags to detect already-processed tickets
const TRIAGE_TAGS = [
  'auto-spam-closed', '2-dispute-jony', '3-product-gwen', '3-product-jennifer',
  '4-order-lena', '5-kol-jony', '5-fallback-jennifer', 'ai-draft-ready'
];

const TAG_TO_AGENT = {
  '2-dispute-jony': FD.agents.jony,
  '3-product-gwen': FD.agents.gwen,
  '3-product-jennifer': FD.agents.jennifer,
  '4-order-lena': FD.agents.lena,
  '5-kol-jony': FD.agents.jony,
  '5-fallback-jennifer': FD.agents.jennifer,
};

const AGENT_NAMES = {
  [FD.agents.gwen]: 'Gwen Liu',
  [FD.agents.lena]: 'Lena Wang',
  [FD.agents.jennifer]: 'Jennifer Chen',
  [FD.agents.jony]: 'Jony He',
};

function fdGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    https.get(url.href, {
      headers: { 'Authorization': `Basic ${AUTH}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`GET ${path} ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function fdPut(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = JSON.stringify(body);
    const req = https.request(url.href, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`PUT ${path} ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function fdPost(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = JSON.stringify(body);
    const req = https.request(url.href, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`POST ${path} ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function getTickets() {
  // Query both Customer Support group and group=null
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  // Freshdesk filter: updated since, group_id
  // Use search API for better filtering
  const results = [];

  // Customer Support group
  for (let page = 1; page <= 5; page++) {
    const tickets = await fdGet(`/tickets?filter=new_and_my_open&group_id=${FD.triage_group_id}&page=${page}&per_page=30`);
    if (!tickets.length) break;
    results.push(...tickets);
  }

  // Also get tickets with group_id=null (via search)
  try {
    const search = await fdGet(`/search/tickets?query="group_id:null AND created_at:>'${since}'"`);
    if (search.results) results.push(...search.results);
  } catch(e) { /* search may not support this format */ }

  return results;
}

function isSpamSender(email) {
  if (!email) return false;
  // Check exceptions first
  for (const ex of SPAM_EXCEPTIONS) {
    if (ex.test(email)) return false;
  }
  for (const pat of SPAM_PATTERNS) {
    if (pat.test(email)) return true;
  }
  return false;
}

function isAlreadyProcessed(ticket) {
  if (ticket.status === 5) return true;
  if (ticket.tags && ticket.tags.some(t => TRIAGE_TAGS.includes(t))) return true;
  return false;
}

async function getConversation(ticketId) {
  try {
    const conv = await fdGet(`/tickets/${ticketId}/conversations`);
    return conv || [];
  } catch(e) {
    return [];
  }
}

async function getContactEmail(requesterId) {
  if (!requesterId) return null;
  try {
    const contact = await fdGet(`/contacts/${requesterId}`);
    return contact.email || null;
  } catch(e) {
    return null;
  }
}

function classifyIntent(subject, description, conversations) {
  const text = `${subject}\n${description}`.toLowerCase();
  const convText = conversations.map(c => c.body_text || '').join('\n').toLowerCase();
  const full = `${text}\n${convText}`;

  // Intent A: Dispute
  if (/pp-r-\d+/i.test(full) || /paypal case|dispute|chargeback|速卖通纠纷/i.test(full)) {
    return { intent: 'A', tag: '2-dispute-jony', agent: FD.agents.jony, desc: 'Platform dispute' };
  }

  // Intent B: KOL/Brand/Review
  if (/youtube|tiktok.*collab|sponsorship|media.*review|affiliate|推广|合作|博主|评价通知|left a .* star review/i.test(full)) {
    return { intent: 'B', tag: '5-kol-jony', agent: FD.agents.jony, desc: 'KOL/Brand/Review' };
  }

  // Intent C: Product hardware/software issue
  const hasProductIssue = /not working|broken|defect|malfunction|error|bug|crash|freeze|won't turn|doesn't work|issue|problem|trouble|故障|问题/i.test(full)
    && (/evo|move|air|pro|go|chessnut|board|chess/i.test(full) || /serial|order.*item|received.*product/i.test(full));
  
  if (hasProductIssue) {
    // Determine product
    const isEvoOrMove = /\bevo\b|CE\d+|built-in.*screen|built-in.*ai|automatic.*piece|auto.*move/i.test(full);
    const isMove = /\bmove\b|auto.*chess.*robot|automatic.*piece.*movement/i.test(full);
    
    if (isMove || (isEvoOrMove && /\bmove\b/i.test(full))) {
      return { intent: 'C', tag: '3-product-gwen', agent: FD.agents.gwen, desc: 'Move/EVO product issue' };
    }
    if (isEvoOrMove) {
      return { intent: 'C', tag: '3-product-gwen', agent: FD.agents.gwen, desc: 'EVO product issue' };
    }
    
    const isAirProGo = /\bair\b|\bpro\b|\bgo\b/i.test(full);
    if (isAirProGo) {
      return { intent: 'C', tag: '3-product-jennifer', agent: FD.agents.jennifer, desc: 'Air/Pro/Go product issue' };
    }
    
    // Product issue but can't determine model → Jennifer (fallback)
    return { intent: 'C', tag: '3-product-jennifer', agent: FD.agents.jennifer, desc: 'Product issue (model unclear)' };
  }

  // Intent D: Order/logistics/presales
  if (/order|shipping|delivery|tracking|cancel|refund|return|invoice|receipt|dispatch|发货|物流|订单|取消|退款|退货|发票|price|wholesale|product.*compar|选购|对比|库存|stock|pre.?order/i.test(full)) {
    // But if it's about product defect causing return → product team
    const defectReturn = /(return|refund|退货|退款).*(defect|broken|not working|fault|故障|坏了)/i
      || /(defect|broken|not working|fault|故障|坏了).*(return|refund|退货|退款)/i;
    if (defectReturn.test(full)) {
      // Route to product team instead
      const isEvoMove = /\bevo\b|\bmove\b/i.test(full);
      if (isEvoMove) {
        return { intent: 'C', tag: '3-product-gwen', agent: FD.agents.gwen, desc: 'Defect return → product team' };
      }
      return { intent: 'C', tag: '3-product-jennifer', agent: FD.agents.jennifer, desc: 'Defect return → product team' };
    }
    return { intent: 'D', tag: '4-order-lena', agent: FD.agents.lena, desc: 'Order/logistics/presales' };
  }

  // Intent E: System notification / spam
  if (/notification of payment|ad.*approved|copyright|video.*removed|policy.*update|fba/i.test(full)) {
    return { intent: 'E', tag: 'auto-spam-closed', agent: null, desc: 'System notification' };
  }

  // Intent F: Fallback
  return { intent: 'F', tag: '5-fallback-jennifer', agent: FD.agents.jennifer, desc: 'Fallback (unclear intent)' };
}

function draftReply(subject, description, conversations, intentInfo) {
  const convHistory = conversations.map(c => {
    const who = c.incoming ? 'Customer' : 'Agent';
    return `[${who}]: ${(c.body_text || '').substring(0, 500)}`;
  }).join('\n');

  // Smart draft based on intent
  let draft = '';

  switch(intentInfo.intent) {
    case 'A': // Dispute
      draft = `Hi,\n\nThank you for reaching out. We understand you have a dispute/case open and we'd like to help resolve this.\n\nWe're reviewing the details of your case and will follow up shortly with our response. In the meantime, if you have any additional information or documentation that could help resolve this matter, please don't hesitate to share.\n\nBest regards,\nChessnut Support\n\n[Agent Note: This is a dispute case. Please review the details and respond to the platform dispute promptly.]`;
      break;
    case 'C': // Product issue
      draft = `Hi,\n\nThank you for contacting Chessnut Support. We're sorry to hear you're experiencing an issue with your device.\n\nTo help us diagnose and resolve this as quickly as possible, could you please provide:\n\n1. Your order number\n2. The serial number of your device (found on the back/bottom of the board)\n3. A photo or short video showing the issue (under 20MB, or share via Google Drive link if larger)\n\nOnce we have these details, our technical team will investigate and get back to you promptly.\n\nBest regards,\nChessnut Support\n\n[Agent Note: ${intentInfo.desc}. Please tailor troubleshooting steps based on the specific product and issue.]`;
      break;
    case 'D': // Order/logistics
      draft = `Hi,\n\nThank you for reaching out to Chessnut Support.\n\nWe've received your inquiry regarding your order. We're looking into this now and will update you as soon as possible.\n\nIf you have your order number handy, please share it so we can locate your order faster.\n\nBest regards,\nChessnut Support\n\n[Agent Note: ${intentInfo.desc}. Please check order status and provide specific updates.]`;
      break;
    case 'B': // KOL/Brand
      draft = `Hi,\n\nThank you for your interest in Chessnut! We appreciate you reaching out.\n\nWe've forwarded your message to our partnerships team, who will review it and get back to you shortly.\n\nBest regards,\nChessnut Support\n\n[Agent Note: KOL/collaboration request. Forward to appropriate team or handle directly.]`;
      break;
    default: // Fallback
      draft = `Hi,\n\nThank you for contacting Chessnut Support. We've received your message and our team is reviewing it.\n\nWe'll get back to you shortly with more information. If you have any additional details that could help us assist you better, please feel free to share.\n\nBest regards,\nChessnut Support\n\n[Agent Note: Intent unclear - please review and route appropriately.]`;
  }

  return draft;
}

async function closeTicket(ticketId, tags) {
  const allTags = [...new Set([...(tags || []), 'auto-spam-closed'])];
  return fdPut(`/tickets/${ticketId}`, {
    status: 5,
    tags: allTags,
    group_id: null,
  });
}

async function assignAndTag(ticketId, agentId, tag, existingTags) {
  const allTags = [...new Set([...(existingTags || []), tag, 'ai-draft-ready'])];
  return fdPut(`/tickets/${ticketId}`, {
    responder_id: agentId,
    group_id: null,
    tags: allTags,
  });
}

async function addPrivateNote(ticketId, body) {
  return fdPost(`/tickets/${ticketId}/notes`, {
    body: body,
    private: true,
  });
}

async function disableNotifications(ticketId) {
  // Freshdesk doesn't have a direct "disable notifications" API per ticket
  // The private note + manual review workflow handles this
  // We note this in the output
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const report = { processed: [], skipped: [], errors: [] };
  const since = Date.now() - 6 * 3600 * 1000;

  console.log('=== Freshdesk Triage Start ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Window: past 6 hours (since ${new Date(since).toISOString()})`);
  console.log('');

  // 1. Get tickets
  let allTickets = [];
  try {
    // Get from Customer Support group
    for (let page = 1; page <= 10; page++) {
      const tickets = await fdGet(`/tickets?group_id=${FD.triage_group_id}&page=${page}&per_page=30&order_type=desc&order_by=created_at`);
      if (!tickets || !tickets.length) break;
      allTickets.push(...tickets);
      if (tickets.length < 30) break;
    }
    console.log(`Fetched ${allTickets.length} tickets from Customer Support group`);
  } catch(e) {
    console.error('Error fetching tickets:', e.message);
    report.errors.push({ stage: 'fetch', error: e.message });
    return;
  }

  // 2. Filter: within time window, not already processed
  // Also check group=null tickets
  let nullGroupTickets = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const tickets = await fdGet(`/tickets?page=${page}&per_page=30&order_type=desc&order_by=created_at`);
      if (!tickets || !tickets.length) break;
      const nullGroup = tickets.filter(t => !t.group_id || t.group_id === null);
      nullGroupTickets.push(...nullGroup);
      if (tickets.length < 30) break;
    }
    console.log(`Found ${nullGroupTickets.length} tickets with group=null`);
  } catch(e) {
    console.log('Note: Could not fetch group=null tickets:', e.message);
  }

  // Merge and deduplicate
  const ticketMap = new Map();
  for (const t of [...allTickets, ...nullGroupTickets]) {
    if (t.id && !ticketMap.has(t.id)) ticketMap.set(t.id, t);
  }

  const candidates = [];
  for (const t of ticketMap.values()) {
    const created = new Date(t.created_at).getTime();
    if (created < since) continue; // too old
    if (isAlreadyProcessed(t)) {
      report.skipped.push({ id: t.id, subject: t.subject, reason: 'already processed (has tags or status=5)' });
      continue;
    }
    candidates.push(t);
  }

  console.log(`\nCandidates after filtering: ${candidates.length}`);
  console.log('');

  if (candidates.length === 0) {
    console.log('No tickets to process. Done.');
    // Output report as JSON for the calling agent
    console.log('\n===REPORT===');
    console.log(JSON.stringify(report));
    return;
  }

  // 3. Process each ticket through the triage funnel
  // Rate limit: Freshdesk allows ~50 req/min on Growth plan
  let reqCount = 0;
  
  for (const ticket of candidates) {
    try {
      console.log(`--- Processing #${ticket.id}: "${ticket.subject}" ---`);

      // Get requester email
      let email = ticket.requester_email;
      if (!email && ticket.requester_id) {
        email = await getContactEmail(ticket.requester_id);
        reqCount++;
        await sleep(200); // rate limit
      }

      // LAYER 1: Sender filter
      if (email && isSpamSender(email)) {
        console.log(`  LAYER 1 → SPAM: ${email}`);
        await closeTicket(ticket.id, ticket.tags);
        reqCount++;
        report.processed.push({
          id: ticket.id,
          subject: ticket.subject,
          email,
          layer: 1,
          action: 'closed',
          tag: 'auto-spam-closed',
          agent: null,
          reason: `Spam sender: ${email}`,
        });
        await sleep(300);
        continue;
      }

      // LAYER 2: Read content + conversation, classify intent
      console.log(`  LAYER 2 → Reading content...`);
      const conversations = await getConversation(ticket.id);
      reqCount++;
      await sleep(200);

      const intentInfo = classifyIntent(
        ticket.subject || '',
        ticket.description || '',
        conversations
      );
      console.log(`  Intent: ${intentInfo.intent} (${intentInfo.desc}) → ${AGENT_NAMES[intentInfo.agent] || 'Close'}`);

      // Intent E: System notification → close
      if (intentInfo.intent === 'E') {
        await closeTicket(ticket.id, ticket.tags);
        reqCount++;
        report.processed.push({
          id: ticket.id,
          subject: ticket.subject,
          email,
          layer: 2,
          action: 'closed',
          tag: 'auto-spam-closed',
          agent: null,
          reason: intentInfo.desc,
        });
        await sleep(300);
        continue;
      }

      // LAYER 3: Draft reply + assign
      console.log(`  LAYER 3 → Drafting reply...`);
      const draft = draftReply(ticket.subject, ticket.description, conversations, intentInfo);

      // Add private note with draft
      await addPrivateNote(ticket.id, draft);
      reqCount++;
      await sleep(300);

      // Assign to agent + tag
      await assignAndTag(ticket.id, intentInfo.agent, intentInfo.tag, ticket.tags);
      reqCount++;
      await sleep(300);

      report.processed.push({
        id: ticket.id,
        subject: ticket.subject,
        email,
        layer: 3,
        action: 'assigned',
        tag: intentInfo.tag,
        agent: AGENT_NAMES[intentInfo.agent],
        agentId: intentInfo.agent,
        intent: intentInfo.intent,
        reason: intentInfo.desc,
        draft: draft.substring(0, 200) + '...',
      });

      console.log(`  ✓ Done: assigned to ${AGENT_NAMES[intentInfo.agent]}, tagged ${intentInfo.tag}`);

    } catch(e) {
      console.error(`  ✗ Error processing #${ticket.id}:`, e.message);
      report.errors.push({ id: ticket.id, subject: ticket.subject, error: e.message });
    }

    // Rate limiting
    if (reqCount > 40) {
      console.log('  Rate limit approaching, pausing 10s...');
      await sleep(10000);
      reqCount = 0;
    }
  }

  // 4. Output report
  console.log('\n\n========== TRIAGE REPORT ==========');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Processed: ${report.processed.length}`);
  console.log(`Skipped (already done): ${report.skipped.length}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log('');

  if (report.processed.length) {
    console.log('--- Processed Tickets ---');
    for (const p of report.processed) {
      console.log(`  #${p.id} | ${p.action} | ${p.tag} | ${p.agent || 'closed'} | ${p.reason}`);
      console.log(`    Subject: ${(p.subject || '').substring(0, 80)}`);
    }
  }

  if (report.errors.length) {
    console.log('\n--- Errors ---');
    for (const e of report.errors) {
      console.log(`  #${e.id}: ${e.error}`);
    }
  }

  console.log('\n===REPORT===');
  console.log(JSON.stringify(report));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
