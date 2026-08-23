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
const USERS_FILE     = path.join(__dirname, 'data', 'users.json');
const TEMPLATES_FILE = path.join(__dirname, 'data', 'templates.json');
const ACCESSORY_VARIANTS_FILE = path.join(__dirname, 'data', 'accessory-variants.json');

const ADMIN_USERNAME     = process.env.ADMIN_USERNAME     || 'trainer936499';
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD     || 'SilaHubnuti-26x!';
const ADMIN_RESET_CODE   = process.env.ADMIN_RESET_CODE   || 'ObnovaHesla-9427-Trenink';

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ── Uživatelé (víc lidí, každý se svým samostatným tréninkem/profilem) ──────
// data/users.json: pole { username, password, primary }. "primary" je ten
// jediný uživatel, co appka měla odjakživa (a jeho data.plan.json/profile.json
// zůstávají na svém původním místě, ať upgrade nic nerozbije) — kdokoli další
// dostane vlastní soubory data/plan-<jméno>.json a data/profile-<jméno>.json.
// Heslo je (stejně jako dřív v auth.json) prostý text — appka běží jen
// lokálně/pro pár známých lidí, ne jako veřejná služba.
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const list = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(list) && list.length) return list;
    } catch (_) {}
  }
  // První spuštění po upgradu na víc uživatelů (nebo úplně první spuštění
  // appky): založ jediného uživatele z ADMIN_USERNAME/ADMIN_PASSWORD, případně
  // z dřívějšího data/auth.json, pokud si přes appku heslo už dřív změnila —
  // ať přihlášení funguje beze změny i po tomhle upgradu.
  let legacyPassword = ADMIN_PASSWORD_ENV;
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const a = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (a.password) legacyPassword = a.password;
    }
  } catch (_) {}
  const users = [{ username: ADMIN_USERNAME, password: legacyPassword, primary: true }];
  saveUsers(users);
  return users;
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}
function findUser(users, username) {
  return users.find(u => u.username === username);
}
// Bezpečný název souboru odvozený z uživatelského jména (jen písmena/čísla/-/_).
function safeUserFile(username) {
  return String(username).replace(/[^a-zA-Z0-9_-]/g, '_');
}
function planFileFor(username) {
  const u = findUser(loadUsers(), username);
  return (u && u.primary) ? DATA_FILE : path.join(dataDir, `plan-${safeUserFile(username)}.json`);
}
function profileFileFor(username) {
  const u = findUser(loadUsers(), username);
  return (u && u.primary) ? PROFILE_FILE : path.join(dataDir, `profile-${safeUserFile(username)}.json`);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true })); // the login <form> posts x-www-form-urlencoded

// ── Simple session (in-memory token → username, resets on restart) ──────────
const sessions = new Map();
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
  if (isAuthed(req)) {
    req.username = sessions.get(parseCookies(req).authToken);
    return next();
  }
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
        <label>Uživatelské jméno</label>
        <input type="text" id="ru" placeholder="Uživatelské jméno, kterému měníš heslo" autocomplete="username">
      </div>
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
  const un = document.getElementById('ru').value;
  const rc = document.getElementById('rc').value;
  const np = document.getElementById('np').value;
  const nc = document.getElementById('nc').value;
  const msg = document.getElementById('reset-msg');
  if (!un || !rc || !np || !nc) { msg.className='err'; msg.textContent='Vyplňte všechna pole.'; return; }
  if (np !== nc) { msg.className='err'; msg.textContent='Nová hesla se neshodují.'; return; }
  if (np.length < 4) { msg.className='err'; msg.textContent='Heslo musí mít alespoň 4 znaky.'; return; }
  const r = await fetch('/reset-password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,resetCode:rc,newPassword:np})});
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
  const users = loadUsers();
  const u = findUser(users, req.body.username);
  if (u && req.body.password === u.password) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, u.username);
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
  const { username, resetCode, newPassword } = req.body;
  if (!username || !resetCode || !newPassword) return res.status(400).json({ error: 'Chybí údaje.' });
  if (resetCode !== ADMIN_RESET_CODE) return res.status(403).json({ error: 'Záchranný kód není správný.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky.' });
  try {
    const users = loadUsers();
    const u = findUser(users, username);
    if (!u) return res.status(404).json({ error: 'Uživatel s tímhle jménem neexistuje.' });
    u.password = newPassword;
    saveUsers(users);
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
  if (newPassword.length < 4) return res.status(400).json({ error: 'Nové heslo musí mít alespoň 4 znaky.' });
  try {
    const users = loadUsers();
    const u = findUser(users, req.username);
    if (!u || currentPassword !== u.password) return res.status(403).json({ error: 'Současné heslo není správné.' });
    u.password = newPassword;
    saveUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Kdo jsem – appka na frontendu potřebuje vědět, jestli jsi hlavní účet
// (jen ten vidí a spravuje ostatní uživatele), a pro samoobslužný reset
// heslem přes záchranný kód v Profilu potřebuje znát vlastní jméno.
app.get('/api/whoami', (req, res) => {
  const u = findUser(loadUsers(), req.username);
  res.json({ username: req.username, primary: !!(u && u.primary) });
});

function requirePrimary(req, res, next) {
  const u = findUser(loadUsers(), req.username);
  if (u && u.primary) return next();
  res.status(403).json({ error: 'Tohle smí jen hlavní účet.' });
}

// ── Uživatelé — přidání dalšího samostatného účtu (vlastní trénink i profil,
// šablony a doplňky sdílené se všemi) ────────────────────────────────────────
// Vidí a spravuje jen hlavní účet – ostatní uživatelé o sobě navzájem nevědí
// (nevidí seznam jmen, nemůžou zakládat další účty ani měnit cizí hesla).
app.get('/api/users', requirePrimary, (req, res) => {
  try {
    const users = loadUsers();
    res.json({ users: users.map(u => ({ username: u.username, primary: !!u.primary })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', requirePrimary, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Chybí uživatelské jméno nebo heslo.' });
  if (!/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) {
    return res.status(400).json({ error: 'Uživatelské jméno smí mít jen písmena bez diakritiky, čísla, tečku, pomlčku a podtržítko (2–40 znaků).' });
  }
  if (password.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky.' });
  try {
    const users = loadUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Tohle uživatelské jméno už existuje.' });
    }
    users.push({ username, password, primary: false });
    saveUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Hlavní účet může nastavit heslo kterémukoli jinému uživateli přímo (bez
// znalosti jeho současného hesla) — hodí se, když si někdo jiný heslo
// zapomene a nezná ani záchranný kód.
app.post('/api/users/:username/password', requirePrimary, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Chybí nové heslo.' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky.' });
  try {
    const users = loadUsers();
    const u = findUser(users, req.params.username);
    if (!u) return res.status(404).json({ error: 'Uživatel s tímhle jménem neexistuje.' });
    u.password = newPassword;
    saveUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Data helpers (každý uživatel má svůj vlastní soubor — viz planFileFor) ──
function loadPlan(username) {
  const file = planFileFor(username);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  // Nový uživatel bez vlastního souboru zatím: začne z výchozí (prázdné/
  // ukázkové) šablony, stejně jako to odjakživa dělal primární uživatel.
  return JSON.parse(fs.readFileSync(DEFAULT_FILE, 'utf8'));
}
function savePlan(username, plan) {
  fs.writeFileSync(planFileFor(username), JSON.stringify(plan, null, 2), 'utf8');
}

// ── API ───────────────────────────────────────────────────────────────────────
app.get('/api/plan', (req, res) => {
  try { res.json(loadPlan(req.username)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plan', (req, res) => {
  // Guard against overwriting saved data with an empty/malformed body
  // (e.g. a client-side bug, or a stray request) — a real plan always has
  // a non-empty `cycles` array.
  if (!req.body || !Array.isArray(req.body.cycles) || req.body.cycles.length === 0) {
    return res.status(400).json({ error: 'Neplatná data plánu (chybí cycles).' });
  }
  try { savePlan(req.username, req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Profil (výška, váha) a historie maximálních vah ───────────────────────────
// Maxima jsou historie záznamů (ne jen jedno číslo přepsané pokaždé), takže jde
// zpětně vidět zlepšení/zhoršení v čase.
const EXPERIENCE_LEVELS = ['zacatecnik', 'stredne_pokrocily', 'pokrocily'];

function loadProfile(username) {
  const file = profileFileFor(username);
  if (!fs.existsSync(file)) return { height: null, weight: null, units: 'kg', experience: '', daysPerWeek: null, maxima: [] };
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(p.maxima)) p.maxima = [];
  if (p.units !== 'lb') p.units = 'kg';
  if (!EXPERIENCE_LEVELS.includes(p.experience)) p.experience = '';
  if (typeof p.daysPerWeek !== 'number') p.daysPerWeek = null;
  return p;
}
function saveProfile(username, profile) {
  fs.writeFileSync(profileFileFor(username), JSON.stringify(profile, null, 2), 'utf8');
}

app.get('/api/profile', (req, res) => {
  try { res.json(loadProfile(req.username)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/profile', (req, res) => {
  if (!req.body || !Array.isArray(req.body.maxima)) {
    return res.status(400).json({ error: 'Neplatná data profilu (chybí maxima).' });
  }
  try { saveProfile(req.username, req.body); res.json({ ok: true }); }
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
  const users = loadUsers();
  const primary = users.find(u => u.primary) || users[0];
  console.log(`\n✅  Training plan spuštěn`);
  console.log(`   Otevři  : http://localhost:${PORT}`);
  console.log(`   Přihlášení: ${primary.username} / ${primary.password}`);
  if (users.length > 1) console.log(`   Další účty: ${users.filter(u => !u.primary).map(u => u.username).join(', ')}`);
  console.log('');
});
