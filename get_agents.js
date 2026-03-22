require('dotenv').config({ path: '/root/.openclaw/workspace/skills/chessnut-support/.env' });
const axios = require('axios');

const DOMAIN = process.env.FRESHDESK_DOMAIN;
const API_KEY = process.env.FRESHDESK_API_KEY;

console.log("Domain from env:", DOMAIN);
console.log("Key from env:", API_KEY ? "Loaded" : "Missing");

const api = axios.create({
  baseURL: `https://${DOMAIN}/api/v2/`,
  auth: { username: API_KEY, password: 'X' }
});

async function getAgents() {
  try {
    const res = await api.get('agents?per_page=100');
    console.log(JSON.stringify(res.data.map(a => ({ id: a.id, email: a.contact.email, name: a.contact.name })), null, 2));
  } catch (e) {
    console.error("Error:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
  }
}
getAgents();
