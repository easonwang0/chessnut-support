require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');
const API_KEY = process.env.FRESHDESK_API_KEY;
const DOMAIN = process.env.FRESHDESK_DOMAIN;
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

const AGENTS = { GWEN:150033754311, LENA:150073233500, JENNIFER:150023804601, JONY:150022830364 };
const NAMES = { [AGENTS.GWEN]:'Gwen', [AGENTS.LENA]:'Lena', [AGENTS.JENNIFER]:'Jennifer', [AGENTS.JONY]:'Jony' };
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
  /@facebookmail\.com$/i.test(email)||/@facebook\.com$/i.test(email)&&/notification|support|no-reply/i.test(email)||
  /@support\.facebook\.com$/i.test(email)||/@business\.facebook\.com$/i.test(email)||
  /@meta\.com$/i.test(email)&&/no-reply|noreply|notification/i.test(email)||
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

const log = { closed:[], gwen:[], lena:[], jennifer:[], jony:[], errors:[] };

(async () => {
  let all=[], page=1, empty=0;
  while(true){
    if(page>1) await sleep(1000);
    const r = await request('/tickets?filter=new_and_my_open&per_page=100&page='+page);
    if(!Array.isArray(r)||r.length===0){empty++;if(empty>=2)break;page++;continue;}
    empty=0; all=all.concat(r); page++;
  }

  const triageTags = new Set(['auto-spam-closed','sender-based','2-case-jony','3-product-gwen','3-product-jennifer','3-software-jennifer','3-product-ambiguous','4-order-lena','5-kol-jennifer','5-fallback-jennifer','ai-suggest-close']);

  const targets = all.filter(t => {
    if(t.status===5) return false;
    if(PROTECTED.includes(t.group_id)) return false;
    if(t.group_id && t.group_id !== CS_GROUP) return false;
    if((t.tags||[]).some(tag => triageTags.has(tag))) return false;
    return true;
  });

  console.log('待处理工单: '+targets.length);

  for (const t of targets) {
    const email = await getEmail(t);
    const body = extractText(t);
    const subject = (t.subject||'').toLowerCase();
    const text = subject+' '+body.toLowerCase();
    const tags = t.tags||[];
    let assignee=null, stage=null;

    // L1a: sender
    if(email && isSender(email)){
      await sleep(400);
      await request('/tickets/'+t.id,'PUT',{status:5,group_id:null,tags:[...tags,'auto-spam-closed','sender-based']});
      log.closed.push('#'+t.id+' ('+email+')'); continue;
    }
    // L1b: hard spam
    if(/notification of payment received/i.test(text)||/has authorized a payment to you/i.test(text)||/您收到了一笔付款/i.test(text)){
      await sleep(400);
      await request('/tickets/'+t.id,'PUT',{status:5,group_id:null,tags:[...tags,'auto-spam-closed']});
      log.closed.push('#'+t.id+' (hard spam)'); continue;
    }
    // L1c: soft spam
    if(/amazon hat (ihre|seine)|amazon.*versendet/i.test(text)||/amazon has shipped your sold/i.test(text)||
      /refund initiated.*order\s*112-/i.test(text)||/速卖通.*通知|违背发货承诺/i.test(text)||
      /運單.*派送延誤|運單.*差價.*追收/i.test(text)||/public terms application/i.test(text)||
      /mailchimp.*(audience.*export|account is closed)/i.test(text)||
      /你的 facebook 视频无法|你的广告已通过审核/i.test(text)||
      /left a \d star review/i.test(text)||/partner has been deactivated/i.test(text)||
      /paypal.*case update|here.s a case update/i.test(text)||
      /audio copyright alert|unauthorized music usage/i.test(text)||
      /订单已通过风控审核/i.test(text)||/slickdeals/i.test(text)){
      await sleep(400);
      await request('/tickets/'+t.id,'PUT',{status:5,group_id:null,tags:[...tags,'auto-spam-closed','content-based']});
      log.closed.push('#'+t.id+' (soft spam)'); continue;
    }
    // L2: Case → Jony
    if(/paypal.*case|case.*pp-|pp-r-|pp-h-/i.test(text)||/dispute|chargeback/i.test(text)||/case id.*(pp-|claim|dispute)/i.test(text)||/has filed a case/i.test(text)){
      assignee=AGENTS.JONY; stage='2-case-jony';
    }
    // L3: Product — Air/Go/Air+/Pro → Jennifer, Move/Evo → Gwen
    if(!assignee){
      const hw=/defective|broken|faulty|magnetized|not\s*recogni[zs]|malfunction|unresponsive|piece.*defect|piece.*broken|board.*not\s*work|board.*issue|power button|can.t connect|not\s+connect|won.t\s+connect|not\s+working|won.t\s+turn\s+on|not\s+turning\s+on|firmware|overheating|battery.*drain|battery.*issue|charging.*issue|led.*not|led.*issue|led.*not.*flash|blue.*led.*solid|blue.*led.*not|board.*not.*detect|board.*not.*recogni[zs]/i.test(text);
      const sw=/pgn|otb|lichess|chess\.com|training|engine|login|bluetooth|app.*crash|app.*issue|app.*error|not\s+sync|chessmind|board\s*editor|stockfish|maia|chesskid|chessable|ble|pairing|can.t.*find.*board|search.*device/i.test(text);
      const mv=/\bmove\b|\bevo\b/i.test(text);
      const air=/\bair\b|air\s*\+|\bpro\b|\bgo\b/i.test(text);
      // 产品名 + 问题/使用关键词（兜底，捕捉非缺陷的产品咨询）
      const hasProduct = mv || air;
      const usageQ=/how\s+(do|can|to)|not\s+sure|compatible|connect\s+(it|the|my)|work\s+with|use\s+(it|the|this)|setting\s+up|setup|troubleshoot|instructions|manual|help\s+(me|with)|difficult|issue\s+with|problem\s+with|question\s+about|wondering/i.test(text);
      if(hw || sw || (hasProduct && usageQ)){
        if(mv&&!air){assignee=AGENTS.GWEN;stage='3-product-gwen';}
        else if(air&&!mv){assignee=AGENTS.JENNIFER;stage='3-product-jennifer';}
        else if(mv){assignee=AGENTS.GWEN;stage='3-product-gwen';}
        else{assignee=AGENTS.JENNIFER;stage='3-product-jennifer';}
      }
    }
    // L4: Order → Lena
    if(!assignee){
      const hasOrd=/order\s*#?\s*\d+|order\s*no|purchase\s*(number|#)\s*\d+|订单号/i.test(text);
      if(hasOrd||/when.*ship|tracking|track.*order|track.*package|where.*my.*order|cancel.*order|change.*address|has.*shipped|refund|reimburse/i.test(text)||
        hasOrd&&/invoice|发票/i.test(text)||/missing\s*item|still\s*waiting|haven.*received/i.test(text)||
        /questions\s*before\s*ordering|shipping\s*cost|return\s*policy/i.test(text)||
        /widerruf|rückgabe|storno/i.test(text)||/warranty.*delivery|delivery.*warranty/i.test(text)){
        assignee=AGENTS.LENA;stage='4-order-lena';
      }
    }
    // L5: KOL → Jennifer
    if(!assignee){
      if(/youtuber|collaboration|influencer|content\s*creator|kols|sponsorship|unboxing/i.test(text)){
        assignee=AGENTS.JENNIFER;stage='5-kol-jennifer';
      } else {
        assignee=AGENTS.JENNIFER;stage='5-fallback-jennifer';
      }
    }

    await sleep(400);
    await request('/tickets/'+t.id,'PUT',{group_id:null,responder_id:assignee});
    await request('/tickets/'+t.id,'PUT',{tags:[...tags,stage]});
    if(assignee===AGENTS.GWEN)log.gwen.push('#'+t.id);
    else if(assignee===AGENTS.LENA)log.lena.push('#'+t.id);
    else if(assignee===AGENTS.JENNIFER)log.jennifer.push('#'+t.id);
    else if(assignee===AGENTS.JONY)log.jony.push('#'+t.id);
  }

  const total = log.closed.length+log.gwen.length+log.lena.length+log.jennifer.length+log.jony.length;
  console.log('\n=== 操作日志 00:00 '+new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' ===');
  console.log('处理: '+total+' 张');
  console.log('\n关闭 ('+log.closed.length+'):');
  for(const x of log.closed) console.log('  '+x);
  console.log('\n→ Gwen ('+log.gwen.length+'): '+(log.gwen.join(', ')||'无'));
  console.log('→ Lena ('+log.lena.length+'): '+(log.lena.join(', ')||'无'));
  console.log('→ Jennifer ('+log.jennifer.length+'): '+(log.jennifer.join(', ')||'无'));
  console.log('→ Jony ('+log.jony.length+'): '+(log.jony.join(', ')||'无'));
})();
