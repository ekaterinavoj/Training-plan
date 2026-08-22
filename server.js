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
app.get('/api/plan', (req, res) => {
  try { res.json(loadPlan()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plan', (req, res) => {
  try { savePlan(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Training plan spuštěn`);
  console.log(`   Otevři: http://localhost:${PORT}\n`);
});
