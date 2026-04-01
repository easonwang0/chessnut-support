const fs = require('fs');
const tickets = JSON.parse(fs.readFileSync(__dirname + '/tickets_dump.json', 'utf8'));

// Aggressive filtering: remove ALL system/auto-generated tickets
function isRealCustomerTicket(t) {
  const s = (t.subject + ' ' + t.description).toLowerCase();
  // Filter out spam/system
  if (t.tags.includes('auto-spam-closed')) return false;
  if (/notification of payment received/i.test(s)) return false;
  if (/automated.*removal notification/i.test(s)) return false;
  if (/left a \d star review/i.test(s)) return false;
  if (/updates to .* policies/i.test(s)) return false;
  if (/paypal case pp-/i.test(s)) return false;
  if (/mailchimp|unsubscribe/i.test(s)) return false;
  if (/you have a new message from/i.test(s) && s.length < 300) return false;
  if (/seo packages|price list|marketing/i.test(s)) return false;
  if (/quick call\?|e-sign|coach engagement/i.test(s)) return false;
  if (/退信/i.test(s)) return false;
  if (/速卖通|全球速卖通/i.test(s)) return false;
  if (/valida tu direcci|vorbereitung auf die neue/i.test(s)) return false;
  if (/rogers mms/i.test(s)) return false;
  if (/case update.*closed the case/i.test(s)) return false;
  if (/here's a case update/i.test(s)) return false;
  if (/do not reply|no-reply.*automated/i.test(s)) return false;
  // Must have some real content (description > 50 chars)
  if (t.description.length < 30) return false;
  return true;
}

const real = tickets.filter(isRealCustomerTicket);
console.log(`Real customer tickets: ${real.length} / ${tickets.length}`);

// Now cluster by subject patterns
const subjectPatterns = {};
for (const t of real) {
  // Normalize subject
  let subj = t.subject.replace(/^(re:\s*|fw:\s*)+/i, '').trim();
  subj = subj.replace(/ORDER\s*#\d+/gi, 'ORDER #XXX').replace(/#\d+/g, '#XXX');
  subj = subj.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, 'EMAIL');
  
  if (!subjectPatterns[subj]) subjectPatterns[subj] = [];
  subjectPatterns[subj].push(t);
}

// Find recurring subjects
const recurring = Object.entries(subjectPatterns)
  .filter(([_, arr]) => arr.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\nRecurring subject patterns: ${recurring.length}`);
console.log('\n=== TOP RECURRING SUBJECTS ===\n');
for (const [subj, arr] of recurring.slice(0, 30)) {
  console.log(`[${arr.length}x] "${subj}"`);
  console.log(`  Example: ${arr[0].description.substring(0, 120).replace(/\n/g, ' ')}`);
  console.log();
}

// Now deep analysis of description content for unique tickets
console.log('\n=== DEEP ANALYSIS OF CUSTOMER ISSUES ===\n');

// Categorize real tickets by actual customer intent
const intentBuckets = {
  'Where is my order / shipping delay': [],
  'Defective hardware / piece not working': [],
  'Connection / bluetooth issues': [],
  'Charging / battery problems': [],
  'Missing or broken pieces': [],
  'Return / refund request': [],
  'Address change': [],
  'Discount / coupon code': [],
  'How to use / setup questions': [],
  'Firmware / app update issues': [],
  'Pre-order / out of stock inquiry': [],
  'Warranty claim': [],
  'Spare parts / accessories request': [],
  'Price match / price adjustment': [],
  'Amazon order issues': [],
  'Wholesale / bulk order': [],
  'Game data / PGN export': [],
  'Review related (asking about review)': [],
  'Other genuine inquiry': [],
};

function classify(t) {
  const s = (t.subject + ' ' + t.description).toLowerCase();
  
  if (/where.*order|when.*ship|when.*deliver|tracking|not.*receiv|haven.*receiv|still waiting|shipping date|shipping delay|where.*package|track.*order|order.*status|dispatch/i.test(s))
    return 'Where is my order / shipping delay';
  if (/defect|broken|not work|doesn't work|won't work|faulty|malfunction|damage|stop.*work|issue.*board|problem.*board|doesn.*recogni|not recogni|piece.*not|sensor/i.test(s))
    return 'Defective hardware / piece not working';
  if (/connect|bluetooth|pair|sync|won.*detect|not.*detect|can't.*connect|unable.*connect/i.test(s))
    return 'Connection / bluetooth issues';
  if (/charg|battery|power|died|dead|won.*charg|not.*charg|battery.*drain|battery.*low/i.test(s))
    return 'Charging / battery problems';
  if (/missing.*piece|lost.*piece|extra.*piece|spare.*piece|replacement.*piece|broken.*piece|chess.*piece.*miss|one.*piece.*miss/i.test(s))
    return 'Missing or broken pieces';
  if (/return|refund|money back|cancel.*order|send.*back/i.test(s))
    return 'Return / refund request';
  if (/address.*change|change.*address|wrong.*address|update.*address|shipping.*address/i.test(s))
    return 'Address change';
  if (/discount|coupon|promo.*code|code.*discount/i.test(s))
    return 'Discount / coupon code';
  if (/how.*use|how.*work|how.*setup|how.*connect|how.*play|instruction|manual|tutorial|guide|getting started|setup/i.test(s))
    return 'How to use / setup questions';
  if (/firmware|update.*app|app.*update|software.*update|new.*version/i.test(s))
    return 'Firmware / app update issues';
  if (/pre.?order|out of stock|when.*available|restock|back.?order|when.*come back|when.*release/i.test(s))
    return 'Pre-order / out of stock inquiry';
  if (/warranty|guarantee|under.*warranty/i.test(s))
    return 'Warranty claim';
  if (/spare|replacement.*part|accessori|buy.*extra|additional.*piece/i.test(s))
    return 'Spare parts / accessories request';
  if (/price.*match|price.*adjust|lower.*price|price.*drop/i.test(s))
    return 'Price match / price adjustment';
  if (/amazon.*order|fba|amazon.*issue|amazon.*ship/i.test(s))
    return 'Amazon order issues';
  if (/wholesale|bulk|business|resell|distribut|partner/i.test(s))
    return 'Wholesale / bulk order';
  if (/pgn|export|game.*data|save.*game|record.*game/i.test(s))
    return 'Game data / PGN export';
  if (/review|star.*rate|feedback/i.test(s) && !/left a.*review/i.test(s))
    return 'Review related (asking about review)';
  return 'Other genuine inquiry';
}

for (const t of real) {
  const intent = classify(t);
  intentBuckets[intent].push(t);
}

// Sort and display
const sorted = Object.entries(intentBuckets).sort((a, b) => b[1].length - a[1].length);
console.log('Intent distribution:');
for (const [intent, arr] of sorted) {
  if (arr.length === 0) continue;
  console.log(`\n${intent}: ${arr.length} tickets`);
  // Show 3 representative examples
  const examples = arr.slice(0, 3);
  for (const ex of examples) {
    const desc = ex.description.replace(/\n/g, ' ').trim().substring(0, 200);
    console.log(`  #${ex.id}: ${ex.subject}`);
    console.log(`    ${desc}`);
  }
}

// Save categorized data for reference
fs.writeFileSync(__dirname + '/categorized_tickets.json', JSON.stringify(
  Object.fromEntries(sorted.map(([k, v]) => [k, v.map(t => ({ id: t.id, subject: t.subject, desc: t.description.substring(0, 500) }))])),
  null, 2
));
console.log('\nSaved categorized data to categorized_tickets.json');
