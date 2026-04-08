require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');
const fs = require('fs');
const API_KEY = process.env.FRESHDESK_API_KEY;
const DOMAIN = process.env.FRESHDESK_DOMAIN;
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

const PROTECTED = [150000414285,150000414284,150000414287,150000414286];
const CS_GROUP = 150000248275;

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: DOMAIN, path: '/api/v2'+path, method: method||'GET',
      headers: { 'Authorization': AUTH, 'Content-Type': 'application/json' }
    }, res => { let body=''; res.on('data', c => body+=c);
      res.on('end', () => { try{resolve(body?JSON.parse(body):{})}catch(e){resolve({error:true})} }); });
    req.on('error', reject); if(data) req.write(JSON.stringify(data)); req.end();
  });
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function getEmail(t){
  let e=(t.requester_email||t.email||'').toLowerCase();
  if(!e&&t.requester_id){await sleep(300);try{const c=await request('/contacts/'+t.requester_id);e=(c.email||'').toLowerCase();}catch{}}
  return e;
}
function extractText(t){let b=t.description_text||'';if(!b&&t.description)b=t.description.replace(/<[^>]+>/g,' ');return b.replace(/\s+/g,' ').trim();}

const isSender = (email) =>
  /^no-reply@mailer\.shopify\.com$/i.test(email)||/@mailer\.shopify\.com$/i.test(email)||/@shopify\.com$/i.test(email)||
  /^no-reply@shopify$/i.test(email)||/^noreply@shopify/i.test(email)||
  /@mailchimp\.com$/i.test(email)||/@mandrillapp\.com$/i.test(email)||
  /@facebookmail\.com$/i.test(email)||
  /@support\.facebook\.com$/i.test(email)||/@business\.facebook\.com$/i.test(email)||
  /@fuuffy\.com$/i.test(email)||/@pplcz\.com$/i.test(email)||/@ppl-pk\.com$/i.test(email)||
  /@marketplace\.amazon/i.test(email)||
  /@amazon\.com$/i.test(email)&&/no-reply|noreply|donotreply|do-not-reply/i.test(email)||
  /@sellernotifications/i.test(email)||/@sellernotifications\.amazon/i.test(email)||
  /@amazon\.co\.(uk|jp|kr)$/i.test(email)&&/no-reply|noreply|donotreply|do-not-reply|notification/i.test(email)||
  /@amazon\.(de|fr|it|es|nl|se|pl|tr|eg|ae|sa|in|sg|au|ca|com\.br|com\.mx)$/i.test(email)&&/no-reply|noreply|donotreply|do-not-reply|notification/i.test(email)||
  /@bounce\.amazon/i.test(email)||/@returns\.amazon/i.test(email)||/@payments\.amazon/i.test(email)||
  /@aliexpress\.com$/i.test(email)&&/no-reply|noreply|notification/i.test(email)||
  /@service\.aliexpress/i.test(email)||/@selleroperation/i.test(email)||
  /@info\.aliexpress\.com$/i.test(email)||/@slickdeals\.net$/i.test(email)||
  /@impact\.com$/i.test(email)||/@mediapartners/i.test(email)||
  /@paypal\.com$/i.test(email)&&/no-reply|noreply|service/i.test(email)||
  /@tiktok\.com$/i.test(email)||/@business\.tiktok/i.test(email)||
  /@noreply\./i.test(email)||/@no-reply\./i.test(email)||/@donotreply\./i.test(email)||
  /^donotreply@/i.test(email)||/^do-not-reply@/i.test(email)||
  /^no-reply@/i.test(email)&&!/mailsupport\.aliyun/i.test(email)||/^noreply@/i.test(email)||
  /@mailer\./i.test(email)||/@notifications?\./i.test(email)||/@system\./i.test(email)||
  /@automated\./i.test(email)||/@bounce\./i.test(email);

const isContentSpam = (text) => {
  if(/notification of payment received/i.test(text)||/has authorized a payment to you/i.test(text)||/您收到了一笔付款/i.test(text)) return true;
  if(/amazon hat (ihre|seine)|amazon.*versendet/i.test(text)||/amazon has shipped your sold/i.test(text)) return true;
  if(/refund initiated.*order\s*112-/i.test(text)||/速卖通.*通知|违背发货承诺/i.test(text)) return true;
  if(/運單.*派送延誤|運單.*差價.*追收/i.test(text)||/public terms application/i.test(text)) return true;
  if(/mailchimp.*(audience.*export|account is closed)/i.test(text)) return true;
  if(/你的 facebook 视频无法|你的广告已通过审核/i.test(text)) return true;
  if(/left a \d star review/i.test(text)||/partner has been deactivated/i.test(text)) return true;
  if(/paypal.*case update|here.s a case update/i.test(text)) return true;
  if(/audio copyright alert|unauthorized music usage/i.test(text)) return true;
  if(/订单已通过风控审核/i.test(text)||/slickdeals/i.test(text)) return true;
  return false;
};

(async () => {
  let all=[], page=1, empty=0;
  while(true){
    if(page>1) await sleep(1000);
    const r = await request('/tickets?filter=new_and_my_open&per_page=100&page='+page);
    if(!Array.isArray(r)||r.length===0){empty++;if(empty>=2)break;page++;continue;}
    empty=0; all=all.concat(r); page++;
  }

  const triageTags = new Set(['auto-spam-closed','sender-based','2-case-jony','3-product-gwen','3-product-jennifer','3-software-jennifer','3-product-ambiguous','4-order-lena','5-kol-jennifer','5-fallback-jennifer','ai-triaged','ai-suggest-close']);

  const targets = all.filter(t => {
    if(t.status===5) return false;
    if(PROTECTED.includes(t.group_id)) return false;
    if(t.group_id && t.group_id !== CS_GROUP) return false;
    if((t.tags||[]).some(tag => triageTags.has(tag))) return false;
    return true;
  });

  console.log('Total open tickets: '+all.length);
  console.log('Tickets to process: '+targets.length);

  const results = [];
  const toClose = [];

  for (const t of targets) {
    const email = await getEmail(t);
    const body = extractText(t);
    const subject = t.subject||'';

    // L1: sender-based spam → close
    if(email && isSender(email)){
      toClose.push({id:t.id, reason:'sender-spam', email});
      continue;
    }
    // L1b: content-based spam → close
    if(isContentSpam(subject+' '+body)){
      toClose.push({id:t.id, reason:'content-spam'});
      continue;
    }

    // Needs AI analysis — fetch full ticket for description
    await sleep(300);
    const full = await request('/tickets/'+t.id);
    const fullBody = extractText(full);
    results.push({
      id: t.id,
      subject: subject,
      body: fullBody.substring(0, 2000),
      requester_email: email,
      tags: t.tags||[]
    });
  }

  const output = {
    timestamp: new Date().toISOString(),
    toClose: toClose,
    toAnalyze: results
  };

  fs.writeFileSync(__dirname + '/pending_tickets.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to pending_tickets.json');
  console.log('To close (spam): ' + toClose.length);
  console.log('To analyze (AI): ' + results.length);

  // Print toAnalyze tickets for review
  console.log('\n--- Tickets needing AI analysis ---');
  for(const t of results) {
    console.log(`\n[#${t.id}] ${t.subject}`);
    console.log(`From: ${t.requester_email || 'unknown'}`);
    console.log(`${t.body.substring(0, 200)}...`);
  }
})();
