#!/usr/bin/env node
// Trade Journal — server with shared data backend
// Run: node server.js
// All devices on the same network share the same data in real-time.

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { exec } = require('child_process');

const PORT     = process.env.PORT || 3000;
const DIR      = __dirname;
const DB_FILE  = path.join(DIR, 'data.json');
const TUNNEL   = process.argv.includes('--tunnel');

// ─── FILE DATABASE ────────────────────────────────────────────────────────────
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) { console.error('DB read error:', e.message); }
  return { accounts: [], activeId: null };
}
function writeDB(data) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
  catch(e) { console.error('DB write error:', e.message); }
}

// ─── SERVER-SENT EVENTS for real-time sync ───────────────────────────────────
const sseClients = new Set();
function broadcast(event, payload) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch(e) {} });
}

// ─── MIME TYPES ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

// ─── HTTP SERVER ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url    = req.url.split('?')[0];
  const method = req.method;

  // CORS for same-network access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── SSE endpoint for real-time push ──────────────────────────────────────
  if (url === '/api/events') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write('retry: 3000\n\n'); // reconnect every 3s if dropped
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── REST API ─────────────────────────────────────────────────────────────
  if (url === '/api/data' && method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db));
    return;
  }

  if (url === '/api/data' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        writeDB(incoming);
        broadcast('update', { ts: Date.now() }); // tell all tabs to refresh
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400); res.end('Bad JSON');
      }
    });
    return;
  }

  // ── Static files ─────────────────────────────────────────────────────────
  let filePath = path.join(DIR, url === '/' ? '/index.html' : url);
  if (!filePath.startsWith(DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  // Always force no-cache for HTML so updates show immediately on every device
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIR, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(500); res.end('Error'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...noCacheHeaders });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', ...noCacheHeaders });
    res.end(data);
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets))
    for (const net of nets[name])
      if (net.family === 'IPv4' && !net.internal) return net.address;
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip  = getLocalIP();
  const local = `http://localhost:${PORT}`;
  const lan   = `http://${ip}:${PORT}`;

  console.log('\n ╔══════════════════════════════════════════════════╗');
  console.log(' ║           📈  Trade Journal (Shared)             ║');
  console.log(' ╠══════════════════════════════════════════════════╣');
  console.log(` ║  Local:   ${local.padEnd(39)}║`);
  console.log(` ║  Network: ${lan.padEnd(39)}║`);
  console.log(' ║                                                  ║');
  console.log(' ║  All devices share the same data automatically   ║');
  console.log(' ║  Press Ctrl+C to stop                            ║');
  console.log(' ╚══════════════════════════════════════════════════╝\n');

  const open = process.platform === 'darwin' ? 'open' :
               process.platform === 'win32'  ? 'start' : 'xdg-open';
  exec(`${open} ${local}`, () => {});

  if (TUNNEL) {
    console.log(' 🌍 Starting public tunnel...\n');
    const t = exec(`cloudflared tunnel --url http://localhost:${PORT}`);
    t.stderr.on('data', d => {
      const m = d.toString().match(/https:\/\/[\w-]+\.trycloudflare\.com/);
      if (m) {
        console.log(' ╔══════════════════════════════════════════════════╗');
        console.log(` ║  🌍 PUBLIC: ${m[0].padEnd(38)}║`);
        console.log(' ╚══════════════════════════════════════════════════╝\n');
      }
    });
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE')
    console.error(`\n  Port ${PORT} in use. Try: PORT=3001 node server.js\n`);
  else console.error('Server error:', err);
  process.exit(1);
});
