require('dotenv').config({ path: __dirname + '/.env' });
const https = require('https');
const fs = require('fs');
const API_KEY = process.env.FRESHDESK_API_KEY;
const DOMAIN = process.env.FRESHDESK_DOMAIN;
const AUTH = 'Basic ' + Buffer.from(API_KEY + ':X').toString('base64');

const AGENTS = { GWEN:150033754311, LENA:150073233500, JENNIFER:150023804601, JONY:150022830364 };
const STATE_FILE = __dirname + '/triage_state.json';

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

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { closed: {}, assigned: {} }; }
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const agentMap = {
  'GWEN': AGENTS.GWEN, 'LENA': AGENTS.LENA, 'JENNIFER': AGENTS.JENNIFER, 'JONY': AGENTS.JONY,
  'gwen': AGENTS.GWEN, 'lena': AGENTS.LENA, 'jennifer': AGENTS.JENNIFER, 'jony': AGENTS.JONY,
};

(async () => {
  const decisionsFile = process.argv[2] || __dirname + '/triage_decisions.json';
  if(!fs.existsSync(decisionsFile)){
    console.error('No decisions file found at: '+decisionsFile);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(decisionsFile, 'utf8'));
  const { toClose, assignments } = data;
  const state = loadState();
  const log = { closed:[], assigned:[], skipped:[], errors:[] };

  // Close spam tickets
  if(toClose && toClose.length > 0){
    console.log('Closing '+toClose.length+' spam tickets...');
    for(const item of toClose){
      if(state.closed[item.id]){
        log.skipped.push('#'+item.id+' (already in state)');
        console.log('  Skipped #'+item.id+' (already in state)');
        continue;
      }
      try{
        await sleep(400);
        const existing = await request('/tickets/'+item.id);
        if(existing.status === 5 || (existing.tags||[]).includes('auto-spam-closed')){
          state.closed[item.id] = { reason: item.reason, time: new Date().toISOString() };
          saveState(state);
          log.skipped.push('#'+item.id+' (already closed on Freshdesk)');
          console.log('  Skipped #'+item.id+' (already closed on Freshdesk)');
          continue;
        }
        const tags = existing.tags||[];
        await request('/tickets/'+item.id,'PUT',{
          status:5, group_id:null,
          tags:[...tags, 'auto-spam-closed', item.reason||'ai-spam']
        });
        state.closed[item.id] = { reason: item.reason, time: new Date().toISOString() };
        saveState(state);
        log.closed.push('#'+item.id+' ('+item.reason+')');
        console.log('  Closed #'+item.id);
      }catch(e){
        log.errors.push('Close #'+item.id+': '+e.message);
        console.error('  Error closing #'+item.id+': '+e.message);
      }
    }
  }

  // Assign tickets + write draft replies
  if(assignments && assignments.length > 0){
    console.log('\nAssigning '+assignments.length+' tickets...');
    for(const a of assignments){
      if(state.assigned[a.id]){
        log.skipped.push('#'+a.id+' → '+a.assignee+' (already in state)');
        console.log('  Skipped #'+a.id+' → '+a.assignee+' (already in state)');
        continue;
      }
      try{
        const agentId = agentMap[a.assignee];
        if(!agentId){
          log.errors.push('Unknown agent for #'+a.id+': '+a.assignee);
          console.error('  Unknown agent for #'+a.id+': '+a.assignee);
          continue;
        }
        await sleep(400);
        const existing = await request('/tickets/'+a.id);
        const tags = existing.tags||[];
        const stage = a.stage || ('ai-'+a.assignee.toLowerCase());

        // Double-check via API tags too (belt and suspenders)
        if(tags.includes('ai-triaged') || tags.includes(stage)){
          state.assigned[a.id] = { assignee: a.assignee, stage, time: new Date().toISOString() };
          saveState(state);
          log.skipped.push('#'+a.id+' → '+a.assignee+' (already triaged on Freshdesk)');
          console.log('  Skipped #'+a.id+' → '+a.assignee+' (already triaged on Freshdesk)');
          continue;
        }

        await request('/tickets/'+a.id,'PUT',{group_id:null, responder_id:agentId});
        await request('/tickets/'+a.id,'PUT',{tags:[...tags, 'ai-triaged', stage]});
        state.assigned[a.id] = { assignee: a.assignee, stage, time: new Date().toISOString() };
        saveState(state);
        log.assigned.push('#'+a.id+' → '+a.assignee+' ('+stage+')');
        console.log('  #'+a.id+' → '+a.assignee+' ('+a.reason+')');

        // Write draft reply as private note
        if(a.draft_reply){
          await sleep(400);
          await request('/tickets/'+a.id+'/notes','POST',{
            body: '<b>[AI Draft Reply]</b><br><br>'+a.draft_reply.replace(/\n/g,'<br>'),
            private: true
          });
          console.log('    → Draft reply written to private note');
        }
      }catch(e){
        log.errors.push('Assign #'+a.id+': '+e.message);
        console.error('  Error assigning #'+a.id+': '+e.message);
      }
    }
  }

  console.log('\n=== Results ===');
  console.log('Closed: '+log.closed.length);
  console.log('Assigned: '+log.assigned.length);
  console.log('Skipped: '+log.skipped.length);
  console.log('Errors: '+log.errors.length);
  if(log.errors.length) console.log('Errors:', log.errors);
})();
