// ─────────────────────────────────────────────────
// Centralized Config — Update BACKEND_IP here only!
// ─────────────────────────────────────────────────
// To find your IP, run in terminal:
//   node -e "const os=require('os'),i=os.networkInterfaces();Object.keys(i).forEach(n=>i[n].forEach(a=>{if(a.family==='IPv4'&&!a.internal)console.log(n+': '+a.address)}))"
// Then update the IP below.

const BACKEND_IP = '10.51.80.124';
const BACKEND_PORT = '8000';

export const BACKEND_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;
