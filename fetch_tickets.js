require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');
const fs = require('fs');

const API_KEY = 'Wj5RRspS8Z8yXiGjqQpu';
const DOMAIN = 'chessnutech.freshdesk.com';
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: DOMAIN,
      path: `/api/v2/tickets?per_page=100&page=${page}&include=description`,
      method: 'GET',
      headers: { 'Authorization': AUTH, 'Content-Type': 'application/json' }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers['retry-after'] || '30', 10);
          console.log(`Rate limited. Retry after ${retryAfter}s`);
          resolve({ rateLimited: true, retryAfter });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const allTickets = [];
  let page = 1;
  let emptyCount = 0;

  console.log('Starting bulk ticket fetch...');

  while (true) {
    let result;
    // Rate limit: Freshdesk allows ~50 req/min for basic auth
    // We'll do ~1 req/sec to be safe
    if (page > 1) await sleep(1100);

    try {
      result = await fetchPage(page);
    } catch (e) {
      console.error(`Error on page ${page}:`, e.message);
      await sleep(5000);
      continue;
    }

    if (result.rateLimited) {
      console.log(`Waiting ${result.retryAfter}s for rate limit...`);
      await sleep(result.retryAfter * 1000);
      continue;
    }

    if (!Array.isArray(result) || result.length === 0) {
      emptyCount++;
      if (emptyCount >= 2) break;
      page++;
      continue;
    }

    emptyCount = 0;
    for (const t of result) {
      allTickets.push({
        id: t.id,
        subject: t.subject,
        description: t.description_text || '',
        status: t.status,
        priority: t.priority,
        source: t.source,
        tags: t.tags || [],
        type: t.type,
        created_at: t.created_at,
        updated_at: t.updated_at,
        responder_id: t.responder_id,
        group_id: t.group_id
      });
    }

    if (page % 10 === 0) {
      console.log(`Page ${page} fetched. Total tickets: ${allTickets.length}`);
    }
    page++;
  }

  console.log(`\nDone! Total tickets fetched: ${allTickets.length}`);
  
  const outPath = __dirname + '/tickets_dump.json';
  fs.writeFileSync(outPath, JSON.stringify(allTickets, null, 2));
  console.log(`Saved to ${outPath}`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);
}

run().catch(console.error);
