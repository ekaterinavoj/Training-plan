const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3100;
const DATA_FILE    = path.join(__dirname, 'data', 'plan.json');
const DEFAULT_FILE = path.join(__dirname, 'data', 'default.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Data helpers ─────────────────────────────────────────────────────────────
function loadPlan() {
  const file = fs.existsSync(DATA_FILE) ? DATA_FILE : DEFAULT_FILE;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function savePlan(plan) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(plan, null, 2), 'utf8');
}

// ── API ───────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('ok'));

app.get('/api/plan', (req, res) => {
  try { res.json(loadPlan()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plan', (req, res) => {
  // Guard against overwriting saved data with an empty/malformed body
  // (e.g. a client-side bug, or a stray request) — a real plan always has
  // a non-empty `cycles` array.
  if (!req.body || !Array.isArray(req.body.cycles) || req.body.cycles.length === 0) {
    return res.status(400).json({ error: 'Neplatná data plánu (chybí cycles).' });
  }
  try { savePlan(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Bind explicitly to 0.0.0.0 so the server is reachable from outside a
// Docker container (binding to the default host only listens on loopback
// inside some container/network setups).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  Training plan spuštěn`);
  console.log(`   Otevři: http://localhost:${PORT}\n`);
});
