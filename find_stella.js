require('dotenv').config({ path: '/root/.openclaw/workspace/skills/chessnut-support/.env' });
const axios = require('axios');
const api = axios.create({
  baseURL: `https://${process.env.FRESHDESK_DOMAIN}/api/v2/`,
  auth: { username: process.env.FRESHDESK_API_KEY, password: 'X' }
});
async function find() {
  try {
    const res = await api.get('agents?per_page=100');
    console.log(JSON.stringify(res.data.map(a => ({ id: a.id, name: a.contact.name })), null, 2));
  } catch(e) { console.error(e.message); }
}
find();
