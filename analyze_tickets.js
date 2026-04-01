const fs = require('fs');
const tickets = JSON.parse(fs.readFileSync(__dirname + '/tickets_dump.json', 'utf8'));

// Filter out spam/closed by AI
const realTickets = tickets.filter(t => !t.tags.includes('auto-spam-closed'));
console.log(`Real tickets (non-spam): ${realTickets.length}`);

// Keyword-based categorization (more granular than triage.js)
const categories = {};

function categorize(ticket) {
  const text = (ticket.subject + ' ' + ticket.description).toLowerCase();
  const cats = [];

  // Product-specific
  if (/chessnut\s*move|(?<!\w)move(?!\w)/.test(text)) cats.push('Chessnut Move');
  if (/chessnut\s*evo|(?<!\w)evo(?!\w)/.test(text)) cats.push('Chessnut EVO');
  if (/chessnut\s*air\b/.test(text)) cats.push('Chessnut Air');
  if (/chessnut\s*pro\b/.test(text)) cats.push('Chessnut Pro');
  if (/chessnut\s*go\b/.test(text)) cats.push('Chessnut Go');
  if (/chessnut\s*app|\bapp\b/.test(text)) cats.push('App/Software');

  // Issue types
  if (/shipping|delivery|tracking|where.*order|track.*package|shipped|dispatch/i.test(text)) cats.push('Shipping/Delivery');
  if (/order.*status|my order|order number|order #|order price/i.test(text)) cats.push('Order Status');
  if (/return|refund|cancel/i.test(text)) cats.push('Returns/Refunds');
  if (/defect|broken|damage|not work|doesn't work|won't work|faulty|malfunction|issue|problem/i.test(text)) cats.push('Defective/Hardware Issue');
  if (/connect|bluetooth|pair|sync|won't detect|not detect|recognition|recognize/i.test(text)) cats.push('Connection/Recognition');
  if (/firmware|update|upgrade|software/i.test(text)) cats.push('Firmware/Update');
  if (/charg|battery|power|died|dead/i.test(text)) cats.push('Charging/Battery');
  if (/base|dock|piece|pawn|knight|bishop|rook|queen|king|wooden/i.test(text)) cats.push('Pieces/Base');
  if (/discount|coupon|code|price|promo/i.test(text)) cats.push('Discounts/Pricing');
  if (/review|star|rating/i.test(text)) cats.push('Reviews');
  if (/address|change.*address|wrong address/i.test(text)) cats.push('Address Change');
  if (/amazon|paypal|payoneer|dispute|claim|case/i.test(text)) cats.push('Platform Disputes');
  if (/pgn|export|game.*data|record/i.test(text)) cats.push('PGN/Data Export');
  if (/tournament|event|competition/i.test(text)) cats.push('Tournaments');
  if (/wholesale|bulk|business|resell|distribut/i.test(text)) cats.push('Wholesale/B2B');
  if (/when.*available|pre-order|out of stock|restock|backorder|back order/i.test(text)) cats.push('Stock/Availability');
  if (/how.*use|how.*work|setup|instruction|manual|guide|tutorial/i.test(text)) cats.push('How-to/Setup');
  if (/warranty|guarantee/i.test(text)) cats.push('Warranty');
  if (/spare|replacement|accessori|extra.*piece|missing.*piece|lost.*piece/i.test(text)) cats.push('Spare Parts');
  if (/led|light|display|screen|board/i.test(text)) cats.push('Board/Display');
  if (/notification|message.*chessnut|you have.*message/i.test(text)) cats.push('System Notification');

  if (cats.length === 0) cats.push('Other/Uncategorized');
  return cats;
}

// Categorize all real tickets
const catCounts = {};
const catExamples = {};

for (const t of realTickets) {
  const cats = categorize(t);
  for (const c of cats) {
    catCounts[c] = (catCounts[c] || 0) + 1;
    if (!catExamples[c]) catExamples[c] = [];
    if (catExamples[c].length < 5) {
      catExamples[c].push({ id: t.id, subject: t.subject, desc: t.description.substring(0, 200) });
    }
  }
}

// Sort by count
const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
console.log('\n=== ISSUE CATEGORIES (by frequency) ===\n');
for (const [cat, count] of sorted) {
  console.log(`${cat}: ${count} tickets (${(count / realTickets.length * 100).toFixed(1)}%)`);
}

// Output examples
console.log('\n=== EXAMPLE TICKETS PER CATEGORY ===\n');
for (const [cat, count] of sorted.slice(0, 15)) {
  console.log(`\n--- ${cat} (${count}) ---`);
  for (const ex of catExamples[cat] || []) {
    console.log(`  #${ex.id}: ${ex.subject}`);
    const d = ex.desc.replace(/\n/g, ' ').trim();
    if (d) console.log(`    ${d.substring(0, 150)}`);
  }
}

// Cross-reference: product x issue
console.log('\n=== PRODUCT x ISSUE MATRIX ===\n');
const products = ['Chessnut Move', 'Chessnut EVO', 'Chessnut Air', 'Chessnut Pro', 'Chessnut Go'];
const issues = ['Defective/Hardware Issue', 'Connection/Recognition', 'Charging/Battery', 'Pieces/Base', 'Shipping/Delivery', 'Returns/Refunds'];
for (const p of products) {
  for (const i of issues) {
    const count = realTickets.filter(t => {
      const cats = categorize(t);
      return cats.includes(p) && cats.includes(i);
    }).length;
    if (count > 0) console.log(`  ${p} × ${i}: ${count}`);
  }
}
