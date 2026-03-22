const axios = require('axios');
require('dotenv').config();

const FRESHDESK_API_KEY = process.env.FRESHDESK_API_KEY;
const FRESHDESK_DOMAIN = process.env.FRESHDESK_DOMAIN;
const TRACK17_API_KEY = process.env['17TRACK_API_KEY'];

// --- Helpers ---
const freshdeskApi = axios.create({
  baseURL: `https://${FRESHDESK_DOMAIN}/api/v2/`,
  auth: {
    username: FRESHDESK_API_KEY,
    password: 'X'
  }
});

const track17Api = axios.create({
  baseURL: 'https://api.17track.net/track/v2.2/',
  headers: {
    '17token': TRACK17_API_KEY,
    'Content-Type': 'application/json'
  }
});

async function main() {
  console.log("Environment loaded successfully, APIs configured.");
  console.log("Ready to implement triage logic here.");
}

main().catch(console.error);
