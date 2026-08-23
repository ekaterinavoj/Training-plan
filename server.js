const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3100;
const DATA_FILE      = path.join(__dirname, 'data', 'plan.json');
const DEFAULT_FILE   = path.join(__dirname, 'data', 'default.json');
const AUTH_FILE      = path.join(__dirname, 'data', 'auth.json');
const PROFILE_FILE   = path.join(__dirname, 'data', 'profile.json');
const TEMPLATES_FILE = path.join(__dirname, 'data', 'templates.json');
const ACCESSORY_VARIANTS_FILE = path.join(__dirname, 'data', 'accessory-variants.json');

const ADMIN_USERNAME     = process.env.ADMIN_USERNAME     || 'trainer936499';
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD     || 'SilaHubnuti-26x!';
const ADMIN_RESET_CODE   = process.env.ADMIN_RESET_CODE   || 'ObnovaHesla-9427-Trenink';

function getPassword() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const a = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (a.password) return a.password;
    }
  } catch (_) {}
  return ADMIN_PASSWORD_ENV;
}

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true })); // the login <form> posts x-www-form-urlencoded

// ── Simple session (in-memory token, resets on restart) ─────────────────────
const sessions = new Set();
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) out[k.trim()] = v.join('=').trim();
  });
  return out;
}
function isAuthed(req) {
  return sessions.has(parseCookies(req).authToken);
}
function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Nepřihlášen(a).' });
  return res.redirect('/login');
}

// ── Login page ────────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('/');
  res.send(`<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Přihlášení – Tréninkový plán</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Calibri,Arial,sans-serif;background:#e7f0fb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}
  .box{background:#fff;border-radius:16px;border:2px solid #1565c0;padding:36px 32px;max-width:380px;width:100%;box-shadow:0 6px 32px rgba(0,0,0,.12)}
  .logo{text-align:center;margin-bottom:18px;color:#1565c0;font-size:1.4em;font-weight:700}
  h2{margin:0 0 20px;color:#333;font-size:1.05em;text-align:center;font-weight:600}
  .field{margin-bottom:12px}
  label{display:block;font-size:.82em;font-weight:700;color:#0d47a1;margin-bottom:5px}
  input{width:100%;padding:10px 12px;border:1.5px solid rgba(21,101,192,.4);border-radius:8px;font-size:1em;font-family:inherit;outline:none}
  input:focus{border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.15)}
  .btn-main{width:100%;margin-top:8px;background:#1565c0;color:#fff;border:none;border-radius:8px;padding:12px;font-size:1em;font-weight:700;font-family:inherit;cursor:pointer}
  .btn-main:hover{background:#0d47a1}
  .btn-sec{width:100%;margin-top:6px;background:none;color:#1565c0;border:1.5px solid #1565c0;border-radius:8px;padding:10px;font-size:.92em;font-weight:600;font-family:inherit;cursor:pointer}
  .btn-sec:hover{background:#e7f0fb}
  .err{background:#fff0f0;border:1.5px solid #fcc;color:#c00;font-size:.86em;padding:10px 14px;border-radius:8px;margin-top:12px}
  .ok{background:#f0fff4;border:1.5px solid #6c6;color:#050;font-size:.86em;padding:10px 14px;border-radius:8px;margin-top:12px}
  .divider{border:0;border-top:1.5px solid #dde5ef;margin:20px 0}
  .reset-box{background:#f2f7fd;border:1.5px solid rgba(21,101,192,.25);border-radius:10px;padding:18px 16px;margin-top:4px}
  .reset-title{font-weight:700;color:#0d47a1;font-size:.95em;margin-bottom:14px}
  .hint{font-size:.78em;color:#888;margin-top:4px;line-height:1.4}
</style></head><body>
<div class="box">
  <div class="logo">💪 Tréninkový plán</div>

  <!-- LOGIN FORM -->
  <div id="login-section">
    <h2>Přihlaste se</h2>
    <form method="POST" action="/login">
      <div class="field">
        <label>Uživatelské jméno</label>
        <input type="text" name="username" autofocus placeholder="Uživatelské jméno" autocomplete="username">
      </div>
      <div class="field">
        <label>Heslo</label>
        <input type="password" name="password" placeholder="Heslo" autocomplete="current-password">
      </div>
      <button class="btn-main" type="submit">Přihlásit se →</button>
      ${req.query.err ? '<div class="err">⚠️ Nesprávné uživatelské jméno nebo heslo.</div>' : ''}
    </form>
    <hr class="divider">
    <button class="btn-sec" onclick="document.getElementById('login-section').style.display='none';document.getElementById('reset-section').style.display='block'">
      🔑 Zapomenuté heslo?
    </button>
  </div>

  <!-- RESET FORM -->
  <div id="reset-section" style="display:none">
    <h2>Obnovení hesla</h2>
    <div class="reset-box">
      <div class="reset-title">📋 Zadejte záchranný kód</div>
      <div class="field">
        <label>Záchranný kód</label>
        <input type="password" id="rc" placeholder="Záchranný kód (viz zápisník / papír)">
        <div class="hint">Záchranný kód je uložen na bezpečném místě, není to stejné heslo jako přihlašovací.</div>
      </div>
      <div class="field">
        <label>Nové heslo</label>
        <input type="password" id="np" placeholder="Nové heslo">
      </div>
      <div class="field">
        <label>Nové heslo znovu</label>
        <input type="password" id="nc" placeholder="Zopakujte nové heslo">
      </div>
      <button class="btn-main" onclick="doReset()">Nastavit nové heslo</button>
      <div id="reset-msg"></div>
    </div>
    <hr class="divider">
    <button class="btn-sec" onclick="document.getElementById('reset-section').style.display='none';document.getElementById('login-section').style.display='block'">
      ← Zpět na přihlášení
    </button>
  </div>
</div>
<script>
async function doReset() {
  const rc = document.getElementById('rc').value;
  const np = document.getElementById('np').value;
  const nc = document.getElementById('nc').value;
  const msg = document.getElementById('reset-msg');
  if (!rc || !np || !nc) { msg.className='err'; msg.textContent='Vyplňte všechna pole.'; return; }
  if (np !== nc) { msg.className='err'; msg.textContent='Nová hesla se neshodují.'; return; }
  if (np.length < 4) { msg.className='err'; msg.textContent='Heslo musí mít alespoň 4 znaky.'; return; }
  const r = await fetch('/reset-password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resetCode:rc,newPassword:np})});
  const j = await r.json();
  if (j.ok) {
    msg.className='ok'; msg.textContent='✓ Heslo bylo změněno! Nyní se přihlaste.';
    setTimeout(()=>{ document.getElementById('reset-section').style.display='none'; document.getElementById('login-section').style.display='block'; },2000);
  } else {
    msg.className='err'; msg.textContent='⚠️ '+j.error;
  }
}
</script>
</body></html>`);
});

app.post('/login', (req, res) => {
  if (req.body.username === ADMIN_USERNAME && req.body.password === getPassword()) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    res.setHeader('Set-Cookie', `authToken=${token}; Path=/; HttpOnly; SameSite=Lax`);
    return res.redirect('/');
  }
  res.redirect('/login?err=1');
});

app.get('/logout', (req, res) => {
  sessions.delete(parseCookies(req).authToken);
  res.setHeader('Set-Cookie', 'authToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.redirect('/login');
});

app.post('/reset-password', (req, res) => {
  const { resetCode, newPassword } = req.body;
  if (!resetCode || !newPassword) return res.status(400).json({ error: 'Chybí údaje.' });
  if (resetCode !== ADMIN_RESET_CODE) return res.status(403).json({ error: 'Záchranný kód není správný.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky.' });
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password: newPassword }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Everything below this line requires a login ─────────────────────────────
app.get('/health', (req, res) => res.status(200).send('ok')); // stays public for Docker's healthcheck

app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Chybí údaje.' });
  if (currentPassword !== getPassword()) return res.status(403).json({ error: 'Současné heslo není správné.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Nové heslo musí mít alespoň 4 znaky.' });
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password: newPassword }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
  // Guard against overwriting saved data with an empty/malformed body
  // (e.g. a client-side bug, or a stray request) — a real plan always has
  // a non-empty `cycles` array.
  if (!req.body || !Array.isArray(req.body.cycles) || req.body.cycles.length === 0) {
    return res.status(400).json({ error: 'Neplatná data plánu (chybí cycles).' });
  }
  try { savePlan(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Profil (výška, váha) a historie maximálních vah ───────────────────────────
// Maxima jsou historie záznamů (ne jen jedno číslo přepsané pokaždé), takže jde
// zpětně vidět zlepšení/zhoršení v čase.
const EXPERIENCE_LEVELS = ['zacatecnik', 'stredne_pokrocily', 'pokrocily'];

function loadProfile() {
  if (!fs.existsSync(PROFILE_FILE)) return { height: null, weight: null, units: 'kg', experience: '', daysPerWeek: null, maxima: [] };
  const p = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
  if (!Array.isArray(p.maxima)) p.maxima = [];
  if (p.units !== 'lb') p.units = 'kg';
  if (!EXPERIENCE_LEVELS.includes(p.experience)) p.experience = '';
  if (typeof p.daysPerWeek !== 'number') p.daysPerWeek = null;
  return p;
}
function saveProfile(profile) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf8');
}

app.get('/api/profile', (req, res) => {
  try { res.json(loadProfile()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/profile', (req, res) => {
  if (!req.body || !Array.isArray(req.body.maxima)) {
    return res.status(400).json({ error: 'Neplatná data profilu (chybí maxima).' });
  }
  try { saveProfile(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Šablony tréninků ─────────────────────────────────────────────────────────
// Zatím jen ke čtení – databázi šablon budeme plnit později (soubor
// data/templates.json, formát je popsaný v README). Dokud soubor
// neexistuje, appka to bere jako "zatím žádné šablony", ne jako chybu.
app.get('/api/templates', (req, res) => {
  try {
    if (!fs.existsSync(TEMPLATES_FILE)) return res.json({ templates: [] });
    const t = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
    res.json({ templates: Array.isArray(t.templates) ? t.templates : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Varianty doplňků (tlak/tah/nohy/zadní řetězec/core × vlastní váha/činky/
// stroj) ────────────────────────────────────────────────────────────────────
// Obecný, appkou dodávaný obsah stejně jako šablony — ne osobní data.
app.get('/api/accessory-variants', (req, res) => {
  try {
    if (!fs.existsSync(ACCESSORY_VARIANTS_FILE)) return res.json({ categories: [] });
    const a = JSON.parse(fs.readFileSync(ACCESSORY_VARIANTS_FILE, 'utf8'));
    res.json({ categories: Array.isArray(a.categories) ? a.categories : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Bind explicitly to 0.0.0.0 so the server is reachable from outside a
// Docker container (binding to the default host only listens on loopback
// inside some container/network setups).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  Training plan spuštěn`);
  console.log(`   Otevři  : http://localhost:${PORT}`);
  console.log(`   Přihlášení: ${ADMIN_USERNAME} / ${getPassword()}\n`);
});
