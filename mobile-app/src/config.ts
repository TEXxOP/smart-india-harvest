// ─────────────────────────────────────────────────────────────
// Centralized backend config.
//
// The backend is deployed, so there is normally nothing to edit here — the
// hardcoded-LAN-IP dance is only needed if you are running uvicorn locally.
//
// Resolution order:
//   1. EXPO_PUBLIC_BACKEND_URL   — env override, wins over everything
//   2. LOCAL_BACKEND_*           — when USE_LOCAL_BACKEND is flipped to true
//   3. DEPLOYED_BACKEND_URL      — the default
// ─────────────────────────────────────────────────────────────

// ⚠️ Confirm this against the Render dashboard after the first deploy. Render
// appends a random suffix if the service name is already taken globally, so the
// real host can be e.g. smart-india-harvest-api-x7k2.onrender.com.
const DEPLOYED_BACKEND_URL = 'https://smart-india-harvest-api.onrender.com';

// Flip to true to point the app at uvicorn on your machine instead.
const USE_LOCAL_BACKEND = false;

// Only consulted when USE_LOCAL_BACKEND is true. To find your IP:
//   node -e "const os=require('os'),i=os.networkInterfaces();Object.keys(i).forEach(n=>i[n].forEach(a=>{if(a.family==='IPv4'&&!a.internal)console.log(n+': '+a.address)}))"
const LOCAL_BACKEND_IP = '10.204.17.124';
const LOCAL_BACKEND_PORT = '8000';

const LOCAL_BACKEND_URL = `http://${LOCAL_BACKEND_IP}:${LOCAL_BACKEND_PORT}`;

const envOverride = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

export const BACKEND_URL =
    envOverride && envOverride.length > 0
        ? envOverride.replace(/\/+$/, '')       // tolerate a trailing slash
        : USE_LOCAL_BACKEND
            ? LOCAL_BACKEND_URL
            : DEPLOYED_BACKEND_URL;

// True when talking to the deployed instance. Screens can use this to show a
// "waking the server up" hint: the Render free tier sleeps after 15 minutes
// idle and the next request then takes ~30-60s while the instance cold-starts.
export const IS_REMOTE_BACKEND = !BACKEND_URL.includes('://10.')
    && !BACKEND_URL.includes('://192.168.')
    && !BACKEND_URL.includes('localhost');

// Generous enough to cover a cold start. Nothing consumes this yet — the
// services currently call fetch() with no timeout at all, which means a
// sleeping backend leaves requests hanging on the platform default.
export const BACKEND_TIMEOUT_MS = IS_REMOTE_BACKEND ? 90_000 : 15_000;
