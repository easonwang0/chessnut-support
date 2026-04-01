require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FD_DOMAIN = process.env.FRESHDESK_DOMAIN;
const FD_API_KEY = process.env.FRESHDESK_API_KEY;
const TRACK_API_KEY = process.env.TRACK17_API_KEY;

const fdApi = axios.create({
  baseURL: `https://${FD_DOMAIN}/api/v2/`,
  auth: { username: FD_API_KEY, password: 'X' }
});

const trackApi = axios.create({
  baseURL: 'https://api.17track.net/track/v2.2/',
  headers: {
    '17token': TRACK_API_KEY,
    'Content-Type': 'application/json'
  }
});

const TRACKING_FILE = path.join(__dirname, '..', '..', 'memory', 'pending_tracking.json');

async function addFreshdeskNote(ticketId, body, isPrivate = true) {
  try {
    await fdApi.post(`tickets/${ticketId}/notes`, { body, private: isPrivate });
    console.log(`Added note to ticket #${ticketId}`);
  } catch(e) {
    console.error(`Failed to add note to #${ticketId}:`, e.response?.data || e.message);
  }
}

async function runSentinel() {
  console.log("Starting 17Track Logistics Sentinel...");

  if (!fs.existsSync(TRACKING_FILE)) {
    console.log("No pending tracking queue found. Exiting.");
    return;
  }

  let pending = {};
  try {
    pending = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  } catch(e) {
    console.error("Error reading tracking file.");
    return;
  }

  const ticketIds = Object.keys(pending);
  if (ticketIds.length === 0) {
    console.log("Tracking queue is empty. Exiting.");
    return;
  }

  const now = Date.now();
  let updatedPending = { ...pending };

  for (const ticketId of ticketIds) {
    const item = pending[ticketId];
    const trackingNumber = item.tracking;
    const addedAt = item.addedAt;
    const hoursElapsed = (now - addedAt) / (1000 * 60 * 60);

    console.log(`Checking ticket #${ticketId} | Tracking: ${trackingNumber} | Queued ${hoursElapsed.toFixed(1)} hrs ago`);

    try {
      // Register/Query 17Track
      // Note: 17Track usually requires registering the number first. We do a direct gettrackinfo. 
      // If it fails because it's not registered, we would register it. For this workflow, we perform a standard query array.
      const trackRes = await trackApi.post('gettrackinfo', [{ number: trackingNumber }]);
      const data = trackRes.data.data;
      
      let hasUpdate = false;
      let latestEvent = "";

      if (data && data.accepted && data.accepted.length > 0) {
        const trackInfo = data.accepted[0].track;
        if (trackInfo && trackInfo.z1 && trackInfo.z1.length > 0) {
          latestEvent = trackInfo.z1[0].z; // latest event description
          hasUpdate = true;
        }
      }

      if (hasUpdate) {
        console.log(`-> Found active shipping update: ${latestEvent}`);
        const noteBody = `<b>[Logistics Alert]</b><br/><br/>Tracking Number: <b>${trackingNumber}</b><br/>Latest Status: ${latestEvent}<br/><br/><i>The package is moving. You can inform the customer.</i>`;
        
        await addFreshdeskNote(ticketId, noteBody, true);
        
        // Add a special tag so the user can filter them in Freshdesk
        try {
          const { data: ticketData } = await fdApi.get(`tickets/${ticketId}`);
          await fdApi.put(`tickets/${ticketId}`, {
            tags: [...(ticketData.tags || []), 'ai-logistics-update']
          });
        } catch (tagErr) {
          console.error("Error adding ai-logistics-update tag:", tagErr.message);
        }

        delete updatedPending[ticketId]; // Remove from queue since it has advanced
        console.log(`-> Removed ticket #${ticketId} from pending queue.`);
      } else {
        console.log(`-> No substantial updates yet...`);
        // Timeout rule: 24 hours
        if (hoursElapsed >= 24 && !item.pacified) {
          console.log(`-> Ticket #${ticketId} has been waiting > 24h. Triggering pacification draft.`);
          
          const draftBody = `<b>[Draft Response - Pacification Email]</b><br/><br/>Hi there,<br/><br/>Thank you for your patience.<br/><br/>We have checked on your order and it is currently in transit. Sometimes tracking networks can take a little while to update the real-time location, but rest assured your package is moving smoothly through the logistics network.<br/><br/>Here is your tracking number: <b>${trackingNumber}</b><br/><br/>You can monitor its progress directly here: <a href="https://www.17track.net/en">https://www.17track.net/en</a><br/><br/>If you have any other questions, please let us know.<br/><br/>Best regards,<br/>Chessnut Support Team`;
          
          await addFreshdeskNote(ticketId, draftBody, true);
          item.pacified = true; // Mark as pacified but DO NOT delete from queue
          updatedPending[ticketId] = item;
          console.log(`-> Marked ticket #${ticketId} as pacified. Kept in pending queue for continued tracking.`);

          // Add a special tag so the user can filter them in Freshdesk
          try {
            const { data: ticketData } = await fdApi.get(`tickets/${ticketId}`);
            await fdApi.put(`tickets/${ticketId}`, {
              tags: [...(ticketData.tags || []), 'ai-pacification-draft']
            });
          } catch (tagErr) {
            console.error("Error adding ai-pacification-draft tag:", tagErr.message);
          }
        }
      }

    } catch (e) {
      console.error(`17Track API error for ${trackingNumber}:`, e.response?.data || e.message);
    }
  }

  // Save back to queue
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(updatedPending, null, 2));
  console.log("Sentinel run complete.");
}

runSentinel();
