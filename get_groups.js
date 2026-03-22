require('dotenv').config({ path: '/root/.openclaw/workspace/skills/chessnut-support/.env' });
const axios = require('axios');
const api = axios.create({
  baseURL: `https://${process.env.FRESHDESK_DOMAIN}/api/v2/`,
  auth: { username: process.env.FRESHDESK_API_KEY, password: 'X' }
});
async function getGroups() {
  try {
    const res = await api.get('groups');
    console.log(JSON.stringify(res.data.map(g => ({ id: g.id, name: g.name })), null, 2));
  } catch(e) { console.error(e.message); }
}
getGroups();
