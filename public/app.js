let plan = { cycles: [] };

// Which week is currently on screen for each cycle (in-memory only, not saved).
let currentWeekByCycle = {};

const cyclesEl   = document.getElementById('cycles');
const cycleTpl   = document.getElementById('cycle-tpl');
const dayTpl     = document.getElementById('day-tpl');
const sectionTpl = document.getElementById('section-tpl');
const itemTpl    = document.getElementById('exercise-item-tpl');
const lineTpl    = document.getElementById('set-line-tpl');
const toast      = document.getElementById('toast');
const saveBtn    = document.getElementById('save-btn');
const editorEl   = document.getElementById('editor');
const viewerEl   = document.getElementById('viewer');
const profileEl  = document.getElementById('profile');

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

// ── Mode: "view" (sledování tréninku) / "edit" (tvorba/úprava plánu) /
// "profile" (výška, váha, historie maxim, šablony) ───────────────────────────
const VALID_MODES = ['view', 'edit', 'profile'];
let mode = VALID_MODES.includes(localStorage.getItem('trainingPlanMode')) ? localStorage.getItem('trainingPlanMode') : 'view';

// Profil + historie maxim + šablony (načtené odděleně od `plan`).
let profile   = { height: null, weight: null, units: 'kg', experience: '', daysPerWeek: null, maxima: [] };
const EXPERIENCE_LABELS = { zacatecnik: 'Začátečník', stredne_pokrocily: 'Středně pokročilý', pokrocily: 'Pokročilý' };
let templates = [];
let accessoryVariants = []; // kategorie doplňků (tlak/tah/nohy/zadní řetězec/core) × vybavení

// Mode is 2-way now (view/edit) plus a "profile" overlay opened from the
// header's 👤 icon — this remembers which of the two to return to when it
// closes again.
let lastNonProfileMode = 'view';

// Which cycle/week/day is picked in view mode (in-memory only, not saved).
let viewCycleId = null;
let viewWeekId  = null;
let viewDayId   = null;

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultDays() {
  return DAY_NAMES.map(name => ({ id: uid('d'), name, focus: '', sections: [] }));
}
function defaultWeek(n) {
  return { id: uid('w'), label: 'Týden ' + n, days: defaultDays() };
}
function defaultCycle(n) {
  return { id: uid('cy'), label: 'Cyklus ' + n, collapsed: false, weeks: [defaultWeek(1)] };
}

// ── Load & migrate ────────────────────────────────────────────────────────────
async function loadPlan() {
  const res = await fetch('/api/plan');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  plan = migrate(data);
  currentWeekByCycle = {};
  plan.cycles.forEach(c => { currentWeekByCycle[c.id] = c.weeks[0] ? c.weeks[0].id : null; });
  render();
  renderViewer();
  applyMode();
}

async function loadProfile() {
  const res = await fetch('/api/profile');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  profile = {
    height: data.height ?? null,
    weight: data.weight ?? null,
    units: data.units === 'lb' ? 'lb' : 'kg',
    experience: EXPERIENCE_LABELS[data.experience] ? data.experience : '',
    daysPerWeek: Number.isInteger(data.daysPerWeek) ? data.daysPerWeek : null,
    maxima: Array.isArray(data.maxima) ? data.maxima : []
  };
  renderProfile();
}

async function loadTemplates() {
  const res = await fetch('/api/templates');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  templates = Array.isArray(data.templates) ? data.templates : [];
  renderTemplateList();
}

async function loadAccessoryVariants() {
  const res = await fetch('/api/accessory-variants');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  accessoryVariants = Array.isArray(data.categories) ? data.categories : [];
}

function migrate(data) {
  if (data && Array.isArray(data.cycles)) {
    data.cycles.forEach(c => {
      if (typeof c.collapsed !== 'boolean') c.collapsed = false;
      c.weeks = (c.weeks || []).map(normalizeWeek);
    });
    return data;
  }
  if (data && Array.isArray(data.weeks)) {
    return { cycles: [{ id: uid('cy'), label: 'Cyklus 1', collapsed: false, weeks: data.weeks.map(normalizeWeek) }] };
  }
  if (data && Array.isArray(data.days)) {
    return { cycles: [{ id: uid('cy'), label: 'Cyklus 1', collapsed: false, weeks: [{ id: uid('w'), label: 'Týden 1', days: data.days.map(normalizeDay) }] }] };
  }
  return { cycles: [defaultCycle(1)] };
}
function normalizeWeek(w) {
  w.days = (w.days || []).map(normalizeDay);
  return w;
}
function normalizeDay(d) {
  if (!d.id) d.id = uid('d');
  if (!Array.isArray(d.sections)) {
    const exs = Array.isArray(d.exercises) ? d.exercises : [];
    d.sections = exs.length ? [{ id: uid('s'), name: '', exercises: exs }] : [];
  }
  delete d.exercises;
  delete d.warmup; // moved from day-level to a per-exercise warm-up set
  d.sections.forEach(s => { s.exercises = (s.exercises || []).map(normalizeExercise); });
  return d;
}

// Exercises used to carry a single aggregate {sets, reps, weight} for the
// plan and a single {warmupSets, warmupReps, warmupWeight} for the warm-up.
// Both are now lists of individual set-lines, so several different warm-up
// or work sets can be logged without repeating the exercise.
function normalizeExercise(ex) {
  if (!Array.isArray(ex.plan)) {
    const hasPlan = ex.sets != null || ex.reps != null || ex.weight;
    ex.plan = hasPlan ? [{ sets: ex.sets ?? null, reps: ex.reps ?? '', weight: ex.weight || '' }] : [];
  }
  if (!Array.isArray(ex.warmup)) {
    const hasWarmup = ex.warmupSets != null || ex.warmupReps != null || ex.warmupWeight;
    ex.warmup = hasWarmup ? [{ sets: ex.warmupSets ?? null, reps: ex.warmupReps ?? '', weight: ex.warmupWeight || '' }] : [];
  }
  delete ex.sets; delete ex.reps; delete ex.weight;
  delete ex.warmupSets; delete ex.warmupReps; delete ex.warmupWeight;
  // Opakování (reps) je teď volný text, ne jen číslo (např. "8–10", "30 s") —
  // normalizuj i starší data, kde to bylo číslo nebo null.
  [...ex.plan, ...ex.warmup].forEach(line => {
    line.reps = line.reps == null ? '' : String(line.reps);
  });
  if (ex.actualSets === undefined) ex.actualSets = null;
  if (ex.actualReps == null) ex.actualReps = '';
  ex.actualReps = String(ex.actualReps);
  if (ex.actualWeight === undefined) ex.actualWeight = '';
  if (ex.note === undefined) ex.note = '';
  if (typeof ex.supersetWithNext !== 'boolean') ex.supersetWithNext = false;
  return ex;
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  cyclesEl.innerHTML = '';
  plan.cycles.forEach(cycle => cyclesEl.appendChild(buildCycleNode(cycle)));
  refreshAllWeightBadges();
}

function buildCycleNode(cycle) {
  const node = cycleTpl.content.firstElementChild.cloneNode(true);
  node.dataset.cycleId = cycle.id;

  const toggleBtn  = node.querySelector('.cycle-toggle');
  const labelInput = node.querySelector('.cycle-label-input');
  const body       = node.querySelector('.cycle-body');
  const weekTabs   = node.querySelector('.week-tabs');
  const weekLabel  = node.querySelector('.week-label-input');
  const daysBox    = node.querySelector('.days');

  labelInput.value = cycle.label || '';
  body.hidden = !!cycle.collapsed;
  toggleBtn.textContent = cycle.collapsed ? '▶' : '▼';
  toggleBtn.addEventListener('click', () => {
    cycle.collapsed = !cycle.collapsed;
    render();
    scheduleAutoSave();
  });
  node.querySelector('.btn-remove-cycle').addEventListener('click', () => removeCycle(cycle.id));

  if (!currentWeekByCycle[cycle.id] && cycle.weeks[0]) currentWeekByCycle[cycle.id] = cycle.weeks[0].id;
  const curWeekId = currentWeekByCycle[cycle.id];
  const curWeek = cycle.weeks.find(w => w.id === curWeekId) || cycle.weeks[0];

  weekTabs.innerHTML = '';
  cycle.weeks.forEach((week, i) => {
    const btn = document.createElement('button');
    btn.className = 'week-tab' + (curWeek && week.id === curWeek.id ? ' active' : '');
    btn.textContent = week.label || ('Týden ' + (i + 1));
    btn.addEventListener('click', () => {
      syncCycleCurrentWeekFromDom(cycle);
      currentWeekByCycle[cycle.id] = week.id;
      render();
    });
    weekTabs.appendChild(btn);
  });

  node.querySelector('.btn-add-week').addEventListener('click', () => addWeek(cycle));
  node.querySelector('.btn-remove-week').addEventListener('click', () => removeWeek(cycle));
  node.querySelector('.btn-copy-week').addEventListener('click', () => duplicateWeek(cycle));

  weekLabel.value = curWeek ? (curWeek.label || '') : '';

  daysBox.innerHTML = '';
  if (curWeek) curWeek.days.forEach(day => daysBox.appendChild(buildDayNode(day)));

  node.querySelector('.btn-add-day').addEventListener('click', () => {
    if (!curWeek) return;
    const newDay = { id: uid('d'), name: '', focus: '', sections: [] };
    curWeek.days.push(newDay);
    daysBox.appendChild(buildDayNode(newDay));
    scheduleAutoSave();
  });

  return node;
}

function buildDayNode(day) {
  const node = dayTpl.content.firstElementChild.cloneNode(true);
  node.dataset.dayId = day.id;
  node.querySelector('.day-name-input').value = day.name || '';
  node.querySelector('.focus-input').value = day.focus || '';

  const sectionsBox = node.querySelector('.sections');
  (day.sections || []).forEach(sec => sectionsBox.appendChild(buildSectionNode(sec)));

  node.querySelector('.btn-add-section').addEventListener('click', () => {
    sectionsBox.appendChild(buildSectionNode());
    scheduleAutoSave();
  });

  node.querySelector('.btn-remove-day').addEventListener('click', () => {
    if (dayHasContent(node) && !confirm('Tento den obsahuje vyplněné údaje. Opravdu ho smazat i s obsahem?')) return;
    node.remove();
    scheduleAutoSave();
  });

  return node;
}

function buildSectionNode(sec) {
  const node = sectionTpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.section-name').value = sec ? (sec.name || '') : '';

  const itemsBox = node.querySelector('.exercise-items');
  if (sec) (sec.exercises || []).forEach(ex => itemsBox.appendChild(makeItem(ex, itemsBox)));
  refreshSupersetVisuals(itemsBox);

  node.querySelector('.btn-add-exercise').addEventListener('click', () => {
    itemsBox.appendChild(makeItem(null, itemsBox));
    refreshSupersetVisuals(itemsBox);
    scheduleAutoSave();
  });

  node.querySelector('.btn-remove-section').addEventListener('click', () => {
    if (sectionHasContent(node) && !confirm('Tato sekce obsahuje cviky. Opravdu ji smazat i s obsahem?')) return;
    node.remove();
    scheduleAutoSave();
  });

  return node;
}

// Visually brackets consecutive exercises marked "spojit do superserie" so
// they read as one linked block instead of separate cards.
function refreshSupersetVisuals(itemsBox) {
  const items = Array.from(itemsBox.children);
  items.forEach((item, i) => {
    const btn = item.querySelector('.btn-superset-toggle');
    const linked = !!(btn && btn.classList.contains('active'));
    item.classList.toggle('superset-linked-next', linked);
    const next = items[i + 1];
    if (next) next.classList.toggle('superset-linked-prev', linked);
    else item.classList.remove('superset-linked-next'); // last item can't link forward
  });
}

function makeItem(ex, itemsBox) {
  const node = itemTpl.content.firstElementChild.cloneNode(true);

  const warmupLines = node.querySelector('.warmup-lines');
  const planLines    = node.querySelector('.plan-lines');

  (ex && ex.warmup || []).forEach(line => warmupLines.appendChild(buildSetLine(line)));
  (ex && ex.plan    || []).forEach(line => planLines.appendChild(buildSetLine(line)));

  node.querySelector('.btn-add-warmup-line').addEventListener('click', () => {
    warmupLines.appendChild(buildSetLine());
    scheduleAutoSave();
  });
  node.querySelector('.btn-add-plan-line').addEventListener('click', () => {
    planLines.appendChild(buildSetLine());
    scheduleAutoSave();
  });

  if (ex) {
    node.querySelector('.ex-name').value           = ex.name          || '';
    node.querySelector('.ex-actual-sets').value    = ex.actualSets    ?? '';
    node.querySelector('.ex-actual-reps').value    = ex.actualReps    || '';
    node.querySelector('.ex-actual-weight').value  = ex.actualWeight  || '';
    node.querySelector('.ex-note').value           = ex.note          || '';
    if (ex.supersetWithNext) node.querySelector('.btn-superset-toggle').classList.add('active');
  }

  node.querySelector('.btn-clear-actual').addEventListener('click', () => {
    node.querySelector('.ex-actual-sets').value = '';
    node.querySelector('.ex-actual-reps').value = '';
    node.querySelector('.ex-actual-weight').value = '';
    node.querySelector('.ex-note').value = '';
    scheduleAutoSave();
  });

  node.querySelector('.btn-remove').addEventListener('click', () => {
    node.remove();
    if (itemsBox) refreshSupersetVisuals(itemsBox);
    scheduleAutoSave();
  });

  node.querySelector('.btn-move-up').addEventListener('click', () => {
    const prev = node.previousElementSibling;
    if (prev && itemsBox) {
      itemsBox.insertBefore(node, prev);
      refreshSupersetVisuals(itemsBox);
      scheduleAutoSave();
    }
  });
  node.querySelector('.btn-move-down').addEventListener('click', () => {
    const next = node.nextElementSibling;
    if (next && itemsBox) {
      itemsBox.insertBefore(next, node);
      refreshSupersetVisuals(itemsBox);
      scheduleAutoSave();
    }
  });
  node.querySelector('.btn-superset-toggle').addEventListener('click', () => {
    node.querySelector('.btn-superset-toggle').classList.toggle('active');
    if (itemsBox) refreshSupersetVisuals(itemsBox);
    scheduleAutoSave();
  });
  node.querySelector('.btn-pick-variant').addEventListener('click', () => openVariantPicker(node));

  // Ruční zadávání (bez šablony): pro cvik, u kterého máš v Profilu zapsané
  // maximum, dopočítá váhu podle stejného pravidla jako šablony — 60 %
  // maxima v 1. týdnu cyklu, +2,5 kg každý další týden — a doplní ji do
  // prázdných řádků Plánu.
  node.querySelector('.btn-fill-from-max').addEventListener('click', () => {
    const exName = node.querySelector('.ex-name').value.trim();
    if (!exName) { showToast('⚠️ Nejdřív vyplň název cviku.'); return; }
    const max = latestMaxFor(exName);
    if (max == null) { showToast(`⚠️ Pro „${exName}" zatím nemáš v Profilu zapsané maximum.`); return; }

    const weekIndex = findWeekIndexForNode(node); // 0-based
    const raw = max * 0.6 + 2.5 * weekIndex;
    const rounded = Math.round(raw / 2.5) * 2.5;
    const weightStr = trimZero(rounded) + ' ' + unitLabel();

    const planLinesBox = node.querySelector('.plan-lines');
    if (!planLinesBox.children.length) planLinesBox.appendChild(buildSetLine());
    let filled = 0;
    planLinesBox.querySelectorAll('.set-line').forEach(lineNode => {
      const w = lineNode.querySelector('.line-weight');
      if (!w.value.trim()) {
        w.value = weightStr;
        updateWeightBadge(w, lineNode.querySelector('.weight-unit-badge'));
        filled++;
      }
    });
    if (filled) {
      showToast(`✓ Doplněno ${weightStr} (týden ${weekIndex + 1}, 60 % + progrese)`);
      scheduleAutoSave();
    } else {
      showToast('ℹ️ Všechny série už mají vyplněnou váhu.');
    }
  });

  return node;
}

// Podle DOM ancestor zjistí, kolikátý (0-based) je aktuálně zobrazený týden
// v cyklu, do kterého daná exercise-item karta patří — použito pro
// progresivní dopočet váhy z maxima (60 % + 2,5 kg/týden).
function findWeekIndexForNode(node) {
  const cycleNode = node.closest('.cycle');
  if (!cycleNode) return 0;
  const cycle = plan.cycles.find(c => c.id === cycleNode.dataset.cycleId);
  if (!cycle) return 0;
  const curWeekId = currentWeekByCycle[cycle.id];
  const idx = cycle.weeks.findIndex(w => w.id === curWeekId);
  return idx >= 0 ? idx : 0;
}

function buildSetLine(line) {
  const node = lineTpl.content.firstElementChild.cloneNode(true);
  if (line) {
    node.querySelector('.line-sets').value   = line.sets   ?? '';
    node.querySelector('.line-reps').value   = line.reps   || '';
    node.querySelector('.line-weight').value = line.weight || '';
  }
  node.querySelector('.btn-remove-line').addEventListener('click', () => {
    node.remove();
    scheduleAutoSave();
  });
  return node;
}

function readSetLines(container) {
  const lines = [];
  container.querySelectorAll(':scope > .set-line').forEach(lineNode => {
    const sets   = lineNode.querySelector('.line-sets').value;
    const reps   = lineNode.querySelector('.line-reps').value.trim();
    const weight = lineNode.querySelector('.line-weight').value.trim();
    if (sets || reps || weight) {
      lines.push({ sets: sets === '' ? null : Number(sets), reps, weight });
    }
  });
  return lines;
}

// ── Content checks (used to decide whether a delete needs confirmation) ────────
function dayHasContent(dayNode) {
  if (dayNode.querySelector('.day-name-input').value.trim()) return true;
  if (dayNode.querySelector('.focus-input').value.trim()) return true;
  return Array.from(dayNode.querySelectorAll('.section-card')).some(sectionHasContent);
}
function sectionHasContent(sectionNode) {
  if (sectionNode.querySelector('.section-name').value.trim()) return true;
  return Array.from(sectionNode.querySelectorAll('.exercise-item')).some(exerciseItemHasContent);
}
function exerciseItemHasContent(item) {
  if (['.ex-name', '.ex-actual-sets', '.ex-actual-reps', '.ex-actual-weight', '.ex-note']
    .some(sel => item.querySelector(sel).value.trim())) return true;
  if (readSetLines(item.querySelector('.warmup-lines')).length) return true;
  if (readSetLines(item.querySelector('.plan-lines')).length) return true;
  return false;
}

// ── Sync DOM → model ─────────────────────────────────────────────────────────
// Reads whatever is currently on screen for a cycle's active week back into
// `plan`, so switching tabs / collapsing / saving never loses edits.
function syncCycleCurrentWeekFromDom(cycle) {
  const cycleNode = cyclesEl.querySelector(`.cycle[data-cycle-id="${cycle.id}"]`);
  if (!cycleNode) return;

  cycle.label = cycleNode.querySelector('.cycle-label-input').value.trim();

  const curWeekId = currentWeekByCycle[cycle.id];
  const week = cycle.weeks.find(w => w.id === curWeekId);
  if (!week) return;

  week.label = cycleNode.querySelector('.week-label-input').value.trim();

  const days = [];
  cycleNode.querySelectorAll('.days > .day-card').forEach(dayNode => {
    const id    = dayNode.dataset.dayId;
    const name  = dayNode.querySelector('.day-name-input').value.trim();
    const focus = dayNode.querySelector('.focus-input').value.trim();

    const sections = [];
    dayNode.querySelectorAll('.sections > .section-card').forEach(sectionNode => {
      const sName = sectionNode.querySelector('.section-name').value.trim();
      const exercises = [];
      sectionNode.querySelectorAll('.exercise-items > .exercise-item').forEach(item => {
        const ex = readExerciseItem(item);
        if (ex) exercises.push(ex);
      });
      if (sName || exercises.length) {
        sections.push({ id: uid('s'), name: sName, exercises });
      }
    });

    days.push({ id, name, focus, sections });
  });
  week.days = days;
}

function readExerciseItem(item) {
  const exName            = item.querySelector('.ex-name').value.trim();
  const warmup            = readSetLines(item.querySelector('.warmup-lines'));
  const plan_             = readSetLines(item.querySelector('.plan-lines'));
  const actualSets        = item.querySelector('.ex-actual-sets').value;
  const actualReps        = item.querySelector('.ex-actual-reps').value.trim();
  const actualWeight      = item.querySelector('.ex-actual-weight').value.trim();
  const note              = item.querySelector('.ex-note').value.trim();
  const supersetWithNext  = item.querySelector('.btn-superset-toggle').classList.contains('active');
  if (!exName && !warmup.length && !plan_.length && !actualSets && !actualReps && !actualWeight && !note) return null;
  return {
    name: exName,
    warmup,
    plan: plan_,
    actualSets: actualSets === '' ? null : Number(actualSets),
    actualReps,
    actualWeight,
    note,
    supersetWithNext
  };
}

// ── Structural actions ─────────────────────────────────────────────────────────
function addWeek(cycle) {
  syncCycleCurrentWeekFromDom(cycle);
  const newWeek = defaultWeek(cycle.weeks.length + 1);
  cycle.weeks.push(newWeek);
  currentWeekByCycle[cycle.id] = newWeek.id;
  render();
  scheduleAutoSave();
}

// Nový týden se stejnými cviky/sériemi jako aktuální — hodí se, protože trénink
// bývá týden od týdne stejný, mění se hlavně váhy. Realita (co bylo odcvičeno)
// se do nového týdne nekopíruje, tu si zapíšeš znovu, až budeš mít odcvičeno.
function duplicateWeek(cycle) {
  syncCycleCurrentWeekFromDom(cycle);
  const curWeekId = currentWeekByCycle[cycle.id];
  const curWeek = cycle.weeks.find(w => w.id === curWeekId);
  if (!curWeek) return;

  const cloned = JSON.parse(JSON.stringify(curWeek));
  cloned.id = uid('w');
  cloned.label = 'Týden ' + (cycle.weeks.length + 1);
  cloned.days.forEach(d => {
    d.id = uid('d');
    d.sections.forEach(s => {
      s.id = uid('s');
      s.exercises.forEach(ex => {
        ex.actualSets = null;
        ex.actualReps = '';
        ex.actualWeight = '';
        ex.note = '';
      });
    });
  });

  cycle.weeks.push(cloned);
  currentWeekByCycle[cycle.id] = cloned.id;
  render();
  scheduleAutoSave();
  showToast('✓ Týden zkopírován — uprav váhy podle potřeby');
}

function removeWeek(cycle) {
  if (cycle.weeks.length <= 1) {
    showToast('⚠️ Musí zůstat aspoň jeden týden');
    return;
  }
  const curWeekId = currentWeekByCycle[cycle.id];
  const week = cycle.weeks.find(w => w.id === curWeekId);
  if (!confirm(`Opravdu smazat "${week.label || 'tento týden'}"? Tuto akci nelze vzít zpět.`)) return;
  cycle.weeks = cycle.weeks.filter(w => w.id !== curWeekId);
  currentWeekByCycle[cycle.id] = cycle.weeks[0].id;
  render();
  scheduleAutoSave();
}

function addCycle() {
  plan.cycles.forEach(c => { syncCycleCurrentWeekFromDom(c); c.collapsed = true; });
  const newCycle = defaultCycle(plan.cycles.length + 1);
  plan.cycles.push(newCycle);
  currentWeekByCycle[newCycle.id] = newCycle.weeks[0].id;
  render();
  scheduleAutoSave();
  const node = cyclesEl.querySelector(`.cycle[data-cycle-id="${newCycle.id}"]`);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeCycle(cycleId) {
  if (plan.cycles.length <= 1) {
    showToast('⚠️ Musí zůstat aspoň jeden cyklus');
    return;
  }
  const cycle = plan.cycles.find(c => c.id === cycleId);
  if (!confirm(`Opravdu smazat cyklus "${cycle.label || ''}" a všechny jeho týdny? Tuto akci nelze vzít zpět.`)) return;
  plan.cycles = plan.cycles.filter(c => c.id !== cycleId);
  delete currentWeekByCycle[cycleId];
  render();
  scheduleAutoSave();
}

// ── Save ─────────────────────────────────────────────────────────────────────
// auto=true -> triggered by autosave (no toast spam, just the small status
// text next to the header buttons); auto=false -> the manual "Uložit plán"
// click, which also pops the toast for a clearer confirmation.
async function savePlan(auto) {
  // In edit mode the editor's DOM is the source of truth and needs folding
  // back into `plan`. In view mode, the viewer already writes straight into
  // `plan` on every keystroke, so there's nothing to sync first.
  if (mode === 'edit') {
    plan.cycles.forEach(c => syncCycleCurrentWeekFromDom(c));
  }
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan)
  });
  if (res.status === 401) { window.location.href = '/login'; return; }
  if (res.ok) {
    setSaveStatus('✓ Uloženo');
    if (!auto) showToast('✓ Uloženo');
  } else {
    setSaveStatus('⚠️ Neuloženo');
    showToast('⚠️ Uložení se nezdařilo');
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── CSV export / import (trénink i profil, obousměrně) ──────────────────────
// Plán je stromová struktura (cyklus → týden → den → sekce → cvik → série),
// CSV je plochá tabulka — každý řádek je jedna série (rozcvička nebo plán) a
// nese s sebou celý "rodokmen" (cyklus/týden/den/sekce/cvik) jako sloupce,
// aby šlo z tabulky zpětně poskládat stejný strom. Prázdné dny/sekce/cviky
// (bez jediné série) dostanou vlastní řádek jen s vyplněným rodokmenem, ať se
// při zpětném importu neztratí. Aby export přenesl kompletně i Profil
// (výška/váha/jednotky/zkušenost/dny v týdnu a historii maxim), je v jednom
// souboru víc "typů" řádků rozlišených prvním sloupcem Typ — PROFIL (jeden
// řádek se základními údaji), MAXIMUM (jeden řádek na každý zapsaný záznam
// maxima) a PLAN (řádky s tréninkem, stejně jako dřív). Starší export bez
// sloupce Typ se při importu bere jako čistě PLAN, ať funguje i zpětně.
const CSV_DELIM = ';';
const CSV_COLUMNS = [
  'Typ',
  'Cyklus', 'Tyden', 'Den', 'Den_poznamka', 'Sekce', 'Cvik', 'Superserie', 'Typ_serie',
  'Serie', 'Opakovani', 'Vaha', 'Realita_serie', 'Realita_opakovani', 'Realita_vaha', 'Realita_poznamka',
  'Profil_vyska_cm', 'Profil_vaha', 'Profil_jednotky', 'Profil_zkusenost', 'Profil_dny_tydne',
  'Max_cvik', 'Max_vaha', 'Max_datum', 'Max_poznamka'
];

function csvEscapeField(value) {
  const s = value == null ? '' : String(value);
  if (s.indexOf(CSV_DELIM) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvEncodeRow(fields) {
  return fields.map(csvEscapeField).join(CSV_DELIM);
}

// Vytvoří jeden CSV řádek ze zadaných pojmenovaných hodnot — chybějící
// sloupce se doplní jako prázdné, pořadí vždy odpovídá CSV_COLUMNS.
function csvRow(typ, values) {
  const obj = Object.assign({ Typ: typ }, values);
  return CSV_COLUMNS.map(col => (obj[col] ?? ''));
}

function planToCsvRows() {
  const rows = [CSV_COLUMNS.slice()];

  // ── Profil (jeden řádek) ────────────────────────────────────────────────
  rows.push(csvRow('PROFIL', {
    Profil_vyska_cm: profile.height ?? '',
    Profil_vaha: profile.weight ?? '',
    Profil_jednotky: profile.units || 'kg',
    Profil_zkusenost: profile.experience || '',
    Profil_dny_tydne: profile.daysPerWeek ?? ''
  }));

  // ── Historie maxim (jeden řádek na záznam) ──────────────────────────────
  (profile.maxima || []).forEach(m => {
    rows.push(csvRow('MAXIMUM', {
      Max_cvik: m.exercise || '',
      Max_vaha: m.weight ?? '',
      Max_datum: m.date || '',
      Max_poznamka: m.note || ''
    }));
  });

  // ── Trénink (cyklus → týden → den → sekce → cvik → série) ───────────────
  plan.cycles.forEach(cycle => {
    const cy = cycle.label || '';
    if (!cycle.weeks.length) { rows.push(csvRow('PLAN', { Cyklus: cy })); return; }
    cycle.weeks.forEach(week => {
      const w = week.label || '';
      if (!week.days.length) { rows.push(csvRow('PLAN', { Cyklus: cy, Tyden: w })); return; }
      week.days.forEach(day => {
        const d = day.name || '';
        const dFocus = day.focus || '';
        const sections = day.sections || [];
        const base = { Cyklus: cy, Tyden: w, Den: d, Den_poznamka: dFocus };
        if (!sections.length) { rows.push(csvRow('PLAN', base)); return; }
        sections.forEach(section => {
          const s = section.name || '';
          const exercises = section.exercises || [];
          if (!exercises.length) { rows.push(csvRow('PLAN', Object.assign({ Sekce: s }, base))); return; }
          exercises.forEach(ex => {
            const superset = ex.supersetWithNext ? 'ano' : '';
            const realita = {
              Realita_serie: ex.actualSets ?? '', Realita_opakovani: ex.actualReps || '',
              Realita_vaha: ex.actualWeight || '', Realita_poznamka: ex.note || ''
            };
            const exBase = Object.assign({ Sekce: s, Cvik: ex.name || '', Superserie: superset }, base, realita);
            const lines = [
              ...(ex.warmup || []).map(l => Object.assign({}, l, { typ: 'rozcvicka' })),
              ...(ex.plan    || []).map(l => Object.assign({}, l, { typ: 'plan' }))
            ];
            if (!lines.length) {
              rows.push(csvRow('PLAN', exBase));
            } else {
              lines.forEach(l => {
                rows.push(csvRow('PLAN', Object.assign({ Typ_serie: l.typ, Serie: l.sets ?? '', Opakovani: l.reps || '', Vaha: l.weight || '' }, exBase)));
              });
            }
          });
        });
      });
    });
  });
  return rows;
}

function exportPlanCsv() {
  const rows = planToCsvRows();
  const csv = rows.map(csvEncodeRow).join('\r\n');
  // BOM na začátku, ať to Excel spolehlivě otevře jako UTF-8 (jinak by hlásky
  // typu "ř", "ě", "š" mohly vyjít rozbité).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `treninkovy-plan-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('✓ CSV export stažen (trénink i profil)');
}

// Ručně napsaný CSV parser (podporuje uvozovky, escapované uvozovky "" a
// víceřádkové poznámky uvnitř uvozovek) — appka nemá žádné externí knihovny,
// tak ani tady žádnou nepřidáváme.
function csvParse(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === CSV_DELIM) { row.push(field); field = ''; }
    else if (c === '\r') { /* \n (pokud následuje) uzavře řádek */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

function toNumOrNull(s) {
  if (s === '' || s == null) return null;
  const n = Number(String(s).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Poskládá strom cyklus→týden→den→sekce→cvik a Profil (+ historii maxim)
// zpátky z plochých CSV řádků. Nový uzel na dané úrovni se založí, kdykoliv
// se hodnota v jejím sloupci liší od předchozího řádku (viz komentář nad
// CSV_COLUMNS); změna na vyšší úrovni vždy vynutí nový uzel i na všech
// úrovních pod ní. Řádky se rozlišují sloupcem Typ (PROFIL/MAXIMUM/PLAN) —
// pokud sloupec Typ v souboru chybí (starší export), bere se každý řádek
// jako PLAN, ať import funguje i se staršími soubory.
function csvRowsToPlanAndProfile(rows) {
  if (!rows.length) throw new Error('Soubor je prázdný.');
  const header = rows[0].map(h => (h || '').trim());
  const idx = {};
  CSV_COLUMNS.forEach(col => { idx[col] = header.indexOf(col); });
  if (idx.Cyklus === -1 || idx.Cvik === -1) {
    throw new Error('Soubor neobsahuje očekávané sloupce (např. "Cyklus", "Cvik") — jde o export z této aplikace?');
  }
  const hasTypeColumn = idx.Typ !== -1;
  const get = (r, col) => {
    const i = idx[col];
    return (i == null || i < 0 || r[i] == null) ? '' : String(r[i]).trim();
  };

  const newProfile = { height: null, weight: null, units: 'kg', experience: '', daysPerWeek: null, maxima: [] };
  const newPlan = { cycles: [] };
  let curCycle = null, curWeek = null, curDay = null, curSection = null, curExercise = null;
  let last = { cy: null, w: null, d: null, s: null, ex: null };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.length || (r.length === 1 && r[0].trim() === '')) continue;

    const rowType = hasTypeColumn ? get(r, 'Typ') : 'PLAN';

    if (rowType === 'PROFIL') {
      const h = get(r, 'Profil_vyska_cm'), wg = get(r, 'Profil_vaha'), u = get(r, 'Profil_jednotky');
      newProfile.height = h === '' ? null : toNumOrNull(h);
      newProfile.weight = wg === '' ? null : toNumOrNull(wg);
      newProfile.units = u === 'lb' ? 'lb' : 'kg';
      newProfile.experience = EXPERIENCE_LABELS[get(r, 'Profil_zkusenost')] ? get(r, 'Profil_zkusenost') : '';
      const dpw = get(r, 'Profil_dny_tydne');
      newProfile.daysPerWeek = dpw === '' ? null : toNumOrNull(dpw);
      continue;
    }
    if (rowType === 'MAXIMUM') {
      const maxCvik = get(r, 'Max_cvik');
      if (maxCvik) {
        newProfile.maxima.push({
          id: uid('max'),
          exercise: maxCvik,
          weight: toNumOrNull(get(r, 'Max_vaha')),
          date: get(r, 'Max_datum'),
          note: get(r, 'Max_poznamka')
        });
      }
      continue;
    }
    if (rowType !== 'PLAN') continue; // neznámý typ řádku — přeskočit, ne shodit celý import

    const cy = get(r, 'Cyklus'), w = get(r, 'Tyden'), d = get(r, 'Den'), dFocus = get(r, 'Den_poznamka'),
          s = get(r, 'Sekce'), exName = get(r, 'Cvik');

    if (!curCycle || cy !== last.cy) {
      curCycle = { id: uid('cy'), label: cy, collapsed: false, weeks: [] };
      newPlan.cycles.push(curCycle);
      last = { cy, w: null, d: null, s: null, ex: null };
      curWeek = curDay = curSection = curExercise = null;
    }
    if (!curWeek || w !== last.w) {
      curWeek = { id: uid('w'), label: w, days: [] };
      curCycle.weeks.push(curWeek);
      last.w = w; last.d = null; last.s = null; last.ex = null;
      curDay = curSection = curExercise = null;
    }
    if (!curDay || d !== last.d) {
      curDay = { id: uid('d'), name: d, focus: dFocus, sections: [] };
      curWeek.days.push(curDay);
      last.d = d; last.s = null; last.ex = null;
      curSection = curExercise = null;
    }
    if (!s && !exName) continue; // řádek jen jako "placeholder" pro prázdný den

    if (!curSection || s !== last.s) {
      curSection = { id: uid('s'), name: s, exercises: [] };
      curDay.sections.push(curSection);
      last.s = s; last.ex = null;
      curExercise = null;
    }
    if (!exName) continue; // placeholder pro prázdnou sekci

    if (!curExercise || exName !== last.ex) {
      curExercise = {
        name: exName,
        warmup: [],
        plan: [],
        actualSets: toNumOrNull(get(r, 'Realita_serie')),
        actualReps: get(r, 'Realita_opakovani'),
        actualWeight: get(r, 'Realita_vaha'),
        note: get(r, 'Realita_poznamka'),
        supersetWithNext: get(r, 'Superserie').toLowerCase() === 'ano'
      };
      curSection.exercises.push(curExercise);
      last.ex = exName;
    }

    const typ = get(r, 'Typ_serie'), setsRaw = get(r, 'Serie'), reps = get(r, 'Opakovani'), weight = get(r, 'Vaha');
    if (typ || setsRaw || reps || weight) {
      const line = { sets: toNumOrNull(setsRaw), reps, weight };
      if (typ === 'rozcvicka') curExercise.warmup.push(line);
      else curExercise.plan.push(line);
    }
  }

  if (!newPlan.cycles.length) throw new Error('V souboru nebyl nalezen žádný cyklus.');
  return { plan: newPlan, profile: newProfile };
}

async function importPlanCsv(file) {
  if (!confirm('Import nahradí CELÝ aktuální trénink i Profil (výška/váha/jednotky/zkušenost/dny v týdnu + historii maxim) obsahem CSV souboru (nedá se vzít zpět). Pokračovat?')) return;
  try {
    const text = await file.text();
    const result = csvRowsToPlanAndProfile(csvParse(text));

    plan = result.plan;
    currentWeekByCycle = {};
    plan.cycles.forEach(c => { currentWeekByCycle[c.id] = c.weeks[0] ? c.weeks[0].id : null; });
    render();
    renderViewer();
    await savePlan(true);

    profile = result.profile;
    renderProfile();
    await saveProfileNow();

    showToast('✓ Trénink i profil importovány z CSV');
  } catch (err) {
    showToast('⚠️ Import selhal: ' + err.message);
  }
}

// ── Auto-save (edit mode) ───────────────────────────────────────────────────────
// Every change in Úprava saves itself a moment after you stop typing/clicking,
// so there's nothing to remember to press.
const saveStatusEl = document.getElementById('save-status');
let autoSaveTimer = null;
function setSaveStatus(text) {
  if (saveStatusEl) saveStatusEl.textContent = text;
}
function scheduleAutoSave() {
  if (mode !== 'edit') return;
  setSaveStatus('Ukládání…');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => savePlan(true), 900);
}
// Any typing anywhere in the editor (name, sets, reps, weight, notes,
// labels...) counts as a change worth auto-saving.
editorEl.addEventListener('input', scheduleAutoSave);

// ── Mode switching ───────────────────────────────────────────────────────────
function applyMode() {
  editorEl.hidden  = mode !== 'edit';
  viewerEl.hidden  = mode !== 'view';
  profileEl.hidden = mode !== 'profile';
  document.getElementById('mode-view-btn').classList.toggle('active', mode === 'view');
  document.getElementById('mode-edit-btn').classList.toggle('active', mode === 'edit');
  document.getElementById('profile-btn').classList.toggle('active', mode === 'profile');
  // Zobrazení and Profil are read-only-ish (Profil autosaves its own fields
  // separately), so the plan Save button is only relevant in Úprava.
  saveBtn.hidden = mode !== 'edit';
  setSaveStatus(mode === 'edit' ? '✓ Uloženo' : '');
  localStorage.setItem('trainingPlanMode', mode);
}

function switchMode(newMode) {
  if (newMode === mode) return;
  if (mode !== 'profile') lastNonProfileMode = mode;
  if (mode === 'edit') {
    // Leaving the editor: fold whatever's on screen back into `plan` first,
    // so the viewer (and a later save) reflects the latest edits, and flush
    // any autosave that was still debouncing.
    plan.cycles.forEach(c => syncCycleCurrentWeekFromDom(c));
    clearTimeout(autoSaveTimer);
    savePlan(true);
  }
  mode = newMode;
  applyMode();
  if (mode === 'view') {
    renderViewer();
  } else if (mode === 'edit') {
    render(); // rebuild the editor from `plan`, picking up any viewer edits
  } else {
    renderProfile();
  }
}

// ── Viewer (read-only plan, editable "reality" fields only) ────────────────────
function renderViewer() {
  renderViewerPickers();
  renderViewerContent();
}

function renderViewerPickers() {
  const cyclePills = document.getElementById('viewer-cycle-pills');
  const weekPills  = document.getElementById('viewer-week-pills');
  const dayPills   = document.getElementById('viewer-day-pills');

  cyclePills.innerHTML = '';
  weekPills.innerHTML  = '';
  dayPills.innerHTML   = '';
  if (!plan.cycles.length) return;

  if (!plan.cycles.find(c => c.id === viewCycleId)) viewCycleId = plan.cycles[0].id;
  const cycle = plan.cycles.find(c => c.id === viewCycleId);

  plan.cycles.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (c.id === viewCycleId ? ' active' : '');
    btn.textContent = c.label || ('Cyklus ' + (i + 1));
    btn.addEventListener('click', () => {
      viewCycleId = c.id;
      viewWeekId = null;
      viewDayId = null;
      renderViewer();
    });
    cyclePills.appendChild(btn);
  });

  if (!cycle || !cycle.weeks.length) return;
  if (!cycle.weeks.find(w => w.id === viewWeekId)) viewWeekId = cycle.weeks[0].id;

  cycle.weeks.forEach((w, i) => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (w.id === viewWeekId ? ' active' : '');
    btn.textContent = w.label || ('Týden ' + (i + 1));
    btn.addEventListener('click', () => {
      viewWeekId = w.id;
      viewDayId = null;
      renderViewer();
    });
    weekPills.appendChild(btn);
  });

  const week = cycle.weeks.find(w => w.id === viewWeekId);
  if (!week || !week.days.length) return;
  if (!week.days.find(d => d.id === viewDayId)) viewDayId = week.days[0].id;

  week.days.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (d.id === viewDayId ? ' active' : '');
    btn.textContent = d.name || ('Den ' + (i + 1));
    btn.addEventListener('click', () => {
      viewDayId = d.id;
      renderViewer();
    });
    dayPills.appendChild(btn);
  });
}

function renderViewerContent() {
  const box = document.getElementById('viewer-content');
  box.innerHTML = '';

  const cycle = plan.cycles.find(c => c.id === viewCycleId);
  const week  = cycle && cycle.weeks.find(w => w.id === viewWeekId);
  const day   = week && week.days.find(d => d.id === viewDayId);

  if (!day) {
    box.innerHTML = '<p class="viewer-empty">Zatím tu není žádný trénink k zobrazení.<br>Přepni se do režimu „Upravit plán" a vytvoř ho.</p>';
    return;
  }

  if (day.focus) {
    const note = document.createElement('p');
    note.className = 'viewer-day-note';
    note.textContent = day.focus;
    box.appendChild(note);
  }

  if (!day.sections || !day.sections.length) {
    const p = document.createElement('p');
    p.className = 'viewer-empty';
    p.textContent = 'Pro tento den nejsou naplánované žádné cviky.';
    box.appendChild(p);
    return;
  }

  day.sections.forEach(section => {
    const card = document.createElement('section');
    card.className = 'viewer-section';

    const h = document.createElement('h3');
    h.textContent = section.name || 'Cviky';
    card.appendChild(h);

    const exercises = section.exercises || [];
    exercises.forEach((ex, i) => {
      const exCard = buildViewerExercise(ex);
      // Superserie: propojené cviky se vizuálně spojí do jednoho bloku.
      if (ex.supersetWithNext) exCard.classList.add('superset-linked-next');
      if (i > 0 && exercises[i - 1].supersetWithNext) exCard.classList.add('superset-linked-prev');
      card.appendChild(exCard);
    });

    box.appendChild(card);
  });
}

function buildViewerExercise(ex) {
  const card = document.createElement('div');
  card.className = 'viewer-exercise';

  card.appendChild(el('div', 'viewer-ex-name', ex.name || '(bez názvu)'));

  // Rozcvička and Plán are rendered identically (same style, no icon) — only
  // the label tells them apart — each as a stack of individual set-lines, so
  // several different warm-up or work sets can be listed without repeating
  // the exercise. Rozcvička is only shown when it actually has lines. Every
  // line gets a checkbox so it's clear how many sets are done and which is
  // next — purely visual, not saved anywhere.
  if (ex.warmup && ex.warmup.length) card.appendChild(buildViewerSetGroup('Rozcvička', ex.warmup, true));
  card.appendChild(buildViewerSetGroup('Plán', ex.plan || [], true));

  // Realita is entered only in Úprava; here it's plain read-only text, and
  // only appears at all once something's actually been logged.
  const hasActual = ex.actualSets != null || ex.actualReps || ex.actualWeight || ex.note;
  if (hasActual) {
    const line = el('div', 'viewer-line viewer-line-actual');
    line.appendChild(el('span', 'viewer-line-label', 'Realita'));
    const hasActualValue = ex.actualSets != null || ex.actualReps || ex.actualWeight;
    line.appendChild(hasActualValue
      ? buildSetLineChips({ sets: ex.actualSets, reps: ex.actualReps, weight: ex.actualWeight })
      : el('span', 'viewer-line-value', '–'));
    card.appendChild(line);
    if (ex.note) card.appendChild(el('div', 'viewer-actual-note', ex.note));
  }

  if (ex.supersetWithNext) card.appendChild(el('div', 'viewer-superset-tag', '🔗 pokračuje superserií →'));

  return card;
}

function buildViewerSetGroup(label, lines, checkable) {
  const group = el('div', 'viewer-set-group');
  group.appendChild(el('span', 'viewer-set-group-label', label));
  if (lines.length) {
    const list = el('div', 'viewer-set-lines');
    lines.forEach(line => {
      if (checkable) {
        const row = document.createElement('label');
        row.className = 'viewer-set-line viewer-set-line-checkable';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'set-check';
        cb.addEventListener('change', () => row.classList.toggle('done', cb.checked));
        row.appendChild(cb);
        row.appendChild(buildSetLineChips(line));
        list.appendChild(row);
      } else {
        const lineEl = el('div', 'viewer-set-line');
        lineEl.appendChild(buildSetLineChips(line));
        list.appendChild(lineEl);
      }
    });
    group.appendChild(list);
  } else {
    group.appendChild(el('div', 'viewer-set-lines viewer-set-empty', '–'));
  }
  return group;
}

// Sérií / opakování / váha jako tři samostatné barevně odlišené "pilulky"
// místo jednoho splihlého textu spojeného tečkami — čitelnější na první
// pohled, hlavně v Zobrazení při cvičení.
function buildSetLineChips(line) {
  const wrap = el('span', 'viewer-set-line-text');
  const hasSets   = line.sets != null && line.sets !== '';
  const hasReps   = !!line.reps;
  const hasWeight = !!line.weight;
  if (!hasSets && !hasReps && !hasWeight) {
    wrap.appendChild(el('span', 'chip chip-empty', '–'));
    return wrap;
  }
  if (hasSets) wrap.appendChild(el('span', 'chip chip-sets', hasReps ? String(line.sets) : `${line.sets} série`));
  if (hasSets && hasReps) wrap.appendChild(el('span', 'set-sep', '×'));
  if (hasReps) wrap.appendChild(el('span', 'chip chip-reps', line.reps));
  if ((hasSets || hasReps) && hasWeight) wrap.appendChild(el('span', 'set-sep', '@'));
  if (hasWeight) wrap.appendChild(el('span', 'chip chip-weight', line.weight));
  return wrap;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

document.getElementById('save-btn').addEventListener('click', () => savePlan(false));
document.getElementById('add-cycle-btn').addEventListener('click', addCycle);
// Jedno tlačítko "📄 CSV" s malou nabídkou pod ním — export i import na
// jednom místě, ať jde obojí (obousměrně) z jedné vstupní brány.
const csvBtn  = document.getElementById('csv-btn');
const csvMenu = document.getElementById('csv-menu');
csvBtn.addEventListener('click', e => {
  e.stopPropagation();
  csvMenu.hidden = !csvMenu.hidden;
});
document.addEventListener('click', e => {
  if (!csvMenu.hidden && !csvMenu.contains(e.target) && e.target !== csvBtn) csvMenu.hidden = true;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') csvMenu.hidden = true;
});
document.getElementById('csv-export-opt').addEventListener('click', () => {
  csvMenu.hidden = true;
  exportPlanCsv();
});
document.getElementById('csv-import-opt').addEventListener('click', () => {
  csvMenu.hidden = true;
  document.getElementById('csv-import-input').click();
});
document.getElementById('csv-import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = ''; // reset, ať jde vybrat i ten samý soubor znovu
  if (file) importPlanCsv(file);
});
document.getElementById('mode-view-btn').addEventListener('click', () => switchMode('view'));
document.getElementById('mode-edit-btn').addEventListener('click', () => switchMode('edit'));
document.getElementById('profile-btn').addEventListener('click', () => {
  switchMode(mode === 'profile' ? lastNonProfileMode : 'profile');
});

// ── Profil, historie maxim a šablony ─────────────────────────────────────────
let profileAutoSaveTimer = null;
function scheduleProfileAutoSave() {
  setSaveStatus('Ukládání…');
  clearTimeout(profileAutoSaveTimer);
  profileAutoSaveTimer = setTimeout(saveProfileNow, 700);
}
async function saveProfileNow() {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (res.status === 401) { window.location.href = '/login'; return; }
  setSaveStatus(res.ok ? '✓ Uloženo' : '⚠️ Neuloženo');
}

// ── Jednotky vah (kg / lb) ───────────────────────────────────────────────────
// Nastavuje se jednou v Profilu a odtud se používá všude — u váhových polí se
// jednotka jen zobrazuje jako značka vedle pole (nepíše se ručně dokola).
function unitLabel() {
  return profile.units === 'lb' ? 'lb' : 'kg';
}

// Značka jednotky se zobrazí, jen když pole obsahuje čisté číslo (nebo je
// prázdné) — u volného textu jako "prázdná osa" nebo rozsahu "67,5–70 kg"
// by se jen pletla, takže tam zůstane skrytá.
function updateWeightBadge(input, badge) {
  if (!badge) return;
  const val = input.value.trim();
  const isPureNumber = /^\d+([.,]\d+)?$/.test(val);
  badge.textContent = (val === '' || isPureNumber) ? unitLabel() : '';
}

function refreshAllWeightBadges() {
  document.querySelectorAll('.line-weight, .ex-actual-weight').forEach(input => {
    const badge = input.parentElement.querySelector('.weight-unit-badge');
    updateWeightBadge(input, badge);
  });
  const maxWeightBadge = document.getElementById('max-weight-unit');
  if (maxWeightBadge) maxWeightBadge.textContent = unitLabel();
}

// Kdykoliv se v editoru píše do váhového pole, jednotková značka se hned
// přepočítá (schová se, jakmile přestane jít o čisté číslo, a naopak).
editorEl.addEventListener('input', e => {
  if (e.target.classList.contains('line-weight') || e.target.classList.contains('ex-actual-weight')) {
    updateWeightBadge(e.target, e.target.parentElement.querySelector('.weight-unit-badge'));
  }
});

function renderProfile() {
  document.getElementById('profile-height').value = profile.height ?? '';
  document.getElementById('profile-weight').value = profile.weight ?? '';
  document.getElementById('profile-units').value = profile.units || 'kg';
  document.getElementById('profile-experience').value = profile.experience || '';
  document.getElementById('profile-days-per-week').value = profile.daysPerWeek ?? '';
  refreshAllWeightBadges();

  const datalist = document.getElementById('max-exercise-list');
  datalist.innerHTML = '';
  collectExerciseNames().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    datalist.appendChild(opt);
  });

  renderMaxList();
  renderTemplateList();
}

// Cviky pro nápovědu v poli "Cvik" – ze všech tréninkových dní i z toho, co už
// bylo dřív zapsané jako maximum.
function collectExerciseNames() {
  const names = new Set();
  plan.cycles.forEach(cy => (cy.weeks || []).forEach(w => (w.days || []).forEach(d =>
    (d.sections || []).forEach(s => (s.exercises || []).forEach(ex => { if (ex.name) names.add(ex.name); }))
  )));
  profile.maxima.forEach(m => { if (m.exercise) names.add(m.exercise); });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'cs'));
}

function renderMaxList() {
  const box = document.getElementById('max-list');
  box.innerHTML = '';
  if (!profile.maxima.length) {
    box.appendChild(el('p', 'profile-hint', 'Zatím žádné záznamy — přidej první nahoře.'));
    return;
  }

  const byExercise = {};
  profile.maxima.forEach(m => {
    (byExercise[m.exercise] = byExercise[m.exercise] || []).push(m);
  });

  Object.keys(byExercise).sort((a, b) => a.localeCompare(b, 'cs')).forEach(name => {
    const entries = byExercise[name].slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latest = entries[0];

    const group = el('div', 'max-group');
    const header = el('div', 'max-group-header');
    header.appendChild(el('span', 'max-group-name', name));

    const latestSpan = el('span', 'max-group-latest', latest.weight != null ? `${latest.weight} ${unitLabel()}` : '–');
    if (entries.length > 1 && entries[1].weight != null && latest.weight != null) {
      const diff = latest.weight - entries[1].weight;
      if (diff !== 0) {
        const diffText = (diff > 0 ? '▲ +' : '▼ ') + trimZero(diff) + ' ' + unitLabel();
        latestSpan.appendChild(el('span', 'max-trend ' + (diff > 0 ? 'up' : 'down'), diffText));
      }
    }
    header.appendChild(latestSpan);
    group.appendChild(header);

    const histBtn = document.createElement('button');
    histBtn.type = 'button';
    histBtn.className = 'btn-toggle-history';
    histBtn.textContent = `Historie (${entries.length})`;
    const histBox = el('div', 'max-history');
    histBox.hidden = true;
    histBtn.addEventListener('click', () => { histBox.hidden = !histBox.hidden; });
    group.appendChild(histBtn);

    entries.forEach(entry => {
      const row = el('div', 'max-entry');
      row.appendChild(el('span', 'max-entry-date', entry.date ? formatDateCz(entry.date) : ''));
      row.appendChild(el('span', 'max-entry-weight', entry.weight != null ? `${entry.weight} ${unitLabel()}` : '–'));
      if (entry.note) row.appendChild(el('span', 'max-entry-note', entry.note));
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-remove-line';
      delBtn.title = 'Smazat záznam';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        profile.maxima = profile.maxima.filter(m => m.id !== entry.id);
        renderProfile();
        scheduleProfileAutoSave();
      });
      row.appendChild(delBtn);
      histBox.appendChild(row);
    });
    group.appendChild(histBox);

    box.appendChild(group);
  });
}

function trimZero(n) {
  return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
}
function formatDateCz(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

document.getElementById('profile-height').addEventListener('input', e => {
  profile.height = e.target.value === '' ? null : Number(e.target.value);
  scheduleProfileAutoSave();
});
document.getElementById('profile-weight').addEventListener('input', e => {
  profile.weight = e.target.value === '' ? null : Number(e.target.value);
  scheduleProfileAutoSave();
});
document.getElementById('profile-units').addEventListener('change', e => {
  profile.units = e.target.value === 'lb' ? 'lb' : 'kg';
  scheduleProfileAutoSave();
  refreshAllWeightBadges();
  renderMaxList();
});
document.getElementById('profile-experience').addEventListener('change', e => {
  profile.experience = e.target.value;
  scheduleProfileAutoSave();
  renderTemplateList();
});
document.getElementById('profile-days-per-week').addEventListener('change', e => {
  profile.daysPerWeek = e.target.value === '' ? null : Number(e.target.value);
  scheduleProfileAutoSave();
  renderTemplateList();
});

document.getElementById('max-add-btn').addEventListener('click', () => {
  const exerciseInput = document.getElementById('max-exercise');
  const weightInput   = document.getElementById('max-weight');
  const dateInput     = document.getElementById('max-date');
  const noteInput     = document.getElementById('max-note');

  const exercise = exerciseInput.value.trim();
  const weight   = weightInput.value;
  if (!exercise || weight === '') { showToast('⚠️ Vyplň cvik a váhu.'); return; }

  profile.maxima.push({
    id: uid('max'),
    exercise,
    weight: Number(weight),
    date: dateInput.value || new Date().toISOString().slice(0, 10),
    note: noteInput.value.trim()
  });

  weightInput.value = '';
  noteInput.value = '';
  // Cvik i datum necháme vyplněné — hodí se, když zapisuješ víc cviků ze
  // stejného dne za sebou.
  renderProfile();
  scheduleProfileAutoSave();
  showToast('✓ Záznam přidán');
});

// ── Šablony tréninků (jen ke čtení, editovatelné přes data/templates.json) ──
function renderTemplateList() {
  const box = document.getElementById('template-list');
  box.innerHTML = '';
  if (!templates.length) {
    box.appendChild(el('p', 'profile-hint', 'Zatím tu nejsou žádné šablony k výběru.'));
    return;
  }
  templates.forEach(t => {
    const card = el('div', 'template-card');
    card.appendChild(el('div', 'template-name', t.label || 'Šablona bez názvu'));

    const badges = el('div', 'template-badges');
    if (t.level && EXPERIENCE_LABELS[t.level]) {
      const matches = profile.experience && profile.experience === t.level;
      badges.appendChild(el('span', 'template-badge' + (matches ? ' template-badge-match' : ''), EXPERIENCE_LABELS[t.level]));
    }
    if (t.daysPerWeek) {
      const matches = profile.daysPerWeek && profile.daysPerWeek === t.daysPerWeek;
      badges.appendChild(el('span', 'template-badge' + (matches ? ' template-badge-match' : ''), t.daysPerWeek + '×/týden'));
    }
    if ((t.level && profile.experience === t.level) && (t.daysPerWeek && profile.daysPerWeek === t.daysPerWeek)) {
      badges.appendChild(el('span', 'template-badge template-badge-match', '✓ sedí ti'));
    }
    if (badges.children.length) card.appendChild(badges);

    if (t.description) card.appendChild(el('div', 'template-desc', t.description));
    if (t.source) card.appendChild(el('div', 'template-source', '📚 Zdroj: ' + t.source));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-main';
    btn.textContent = '⚡ Vygenerovat trénink';
    btn.addEventListener('click', () => generateFromTemplate(t));
    card.appendChild(btn);
    box.appendChild(card);
  });
}

// Nejnovější (podle data) záznam maxima pro daný cvik, nebo null.
function latestMaxFor(exerciseName) {
  const entries = profile.maxima.filter(m => m.exercise === exerciseName);
  if (!entries.length) return null;
  entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return entries[0].weight;
}

// Šablona zapisuje váhu buď jako obyčejný text (např. "vlastní váha"), nebo
// jako procento z posledního maxima daného cviku (např. "60%"). Tohle druhé
// se tady dopočítá na konkrétní kg a zaokrouhlí na 2,5 kg.
function resolveTemplateWeight(weightStr, exerciseName) {
  const m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec((weightStr || '').trim());
  if (!m) return { weight: weightStr || '', missing: false };
  const pct = parseFloat(m[1].replace(',', '.'));
  const max = latestMaxFor(exerciseName);
  if (max == null) return { weight: '', missing: true };
  const rounded = Math.round((max * pct / 100) / 2.5) * 2.5;
  return { weight: trimZero(rounded) + ' ' + unitLabel(), missing: false };
}

function generateFromTemplate(template) {
  if (!template.cycle) { showToast('⚠️ Šablona nemá definovaný cyklus.'); return; }

  const cloned = JSON.parse(JSON.stringify(template.cycle));
  cloned.id = uid('cy');
  cloned.collapsed = false;
  cloned.label = cloned.label || template.label || 'Nový cyklus ze šablony';

  const missing = new Set();
  (cloned.weeks || []).forEach(w => {
    w.id = uid('w');
    (w.days || []).forEach(d => {
      d.id = uid('d');
      (d.sections || []).forEach(s => {
        s.id = uid('s');
        (s.exercises || []).forEach(ex => {
          ['warmup', 'plan'].forEach(key => {
            (ex[key] || []).forEach(line => {
              const r = resolveTemplateWeight(line.weight, ex.name);
              line.weight = r.weight;
              if (r.missing) missing.add(ex.name);
            });
          });
          if (ex.actualSets === undefined) ex.actualSets = null;
          if (ex.actualReps === undefined) ex.actualReps = '';
          if (ex.actualWeight === undefined) ex.actualWeight = '';
          if (ex.note === undefined) ex.note = '';
          if (typeof ex.supersetWithNext !== 'boolean') ex.supersetWithNext = false;
        });
      });
    });
  });

  plan.cycles.forEach(c => { c.collapsed = true; });
  plan.cycles.push(cloned);
  currentWeekByCycle[cloned.id] = cloned.weeks[0] ? cloned.weeks[0].id : null;

  savePlan(true);
  // switchMode('edit') no-opuje, pokud v Úpravě už jsme (např. druhé
  // generování za sebou) — render() proto voláme vždy zvlášť, ať se nově
  // vygenerovaný celý cyklus opravdu objeví v editoru, ne jen v datech.
  switchMode('edit');
  render();
  const node = cyclesEl.querySelector(`.cycle[data-cycle-id="${cloned.id}"]`);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (missing.size) {
    showToast('⚠️ Chybí maximum pro: ' + Array.from(missing).join(', '));
  } else {
    showToast('✓ Trénink vygenerován ze šablony');
  }
}

document.getElementById('max-date').value = new Date().toISOString().slice(0, 10);

// ── Výběr varianty doplňku ───────────────────────────────────────────────────
// Funguje stejně pro cvik vygenerovaný ze šablony i pro cvik, který si píšeš
// ručně — tlačítko 🔄 je na každé kartě cviku v editoru. Nejdřív se vybere
// kategorie (tlak/tah/nohy-jednonožné/zadní řetězec/core), pak konkrétní
// varianta podle dostupného vybavení (vlastní váha/činky/stroj); vybraná
// varianta doplní název cviku a — pokud je Plán zatím prázdný — i doporučenou
// sérii/opakování.
const variantOverlay  = document.getElementById('variant-picker-overlay');
const variantCatBox   = document.getElementById('variant-category-list');
const variantOptBox   = document.getElementById('variant-option-list');
let variantPickerTargetNode = null;

function openVariantPicker(exerciseItemNode) {
  variantPickerTargetNode = exerciseItemNode;
  variantOptBox.hidden = true;
  variantOptBox.innerHTML = '';
  renderVariantCategories();
  variantOverlay.hidden = false;
}
function closeVariantPicker() {
  variantOverlay.hidden = true;
  variantPickerTargetNode = null;
}

function renderVariantCategories() {
  variantCatBox.innerHTML = '';
  if (!accessoryVariants.length) {
    variantCatBox.appendChild(el('p', 'profile-hint', 'Nabídka doplňků se zatím nenačetla nebo je prázdná.'));
    return;
  }
  accessoryVariants.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'variant-category-btn';
    btn.appendChild(el('span', 'vc-label', cat.label || cat.id));
    if (cat.muscle) btn.appendChild(el('span', 'vc-muscle', cat.muscle));
    btn.addEventListener('click', () => renderVariantOptions(cat));
    variantCatBox.appendChild(btn);
  });
}

function renderVariantOptions(category) {
  variantOptBox.innerHTML = '';
  variantOptBox.hidden = false;
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'variant-back-btn';
  back.textContent = '← Zpět na kategorie';
  back.addEventListener('click', () => { variantOptBox.hidden = true; variantOptBox.innerHTML = ''; });
  variantOptBox.appendChild(back);

  (category.variants || []).forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'variant-option-btn';
    const left = el('span');
    left.appendChild(el('div', 'vo-name', v.name));
    left.appendChild(el('div', 'vo-setsreps', `${v.sets}× ${v.reps}`));
    btn.appendChild(left);
    btn.appendChild(el('span', 'vo-equipment', v.equipmentLabel || v.equipment));
    btn.addEventListener('click', () => applyVariant(v));
    variantOptBox.appendChild(btn);
  });
}

function applyVariant(variant) {
  if (!variantPickerTargetNode) { closeVariantPicker(); return; }
  const nameInput = variantPickerTargetNode.querySelector('.ex-name');
  nameInput.value = variant.name;
  const planLines = variantPickerTargetNode.querySelector('.plan-lines');
  if (planLines && !planLines.children.length) {
    const line = buildSetLine({ sets: variant.sets, reps: variant.reps, weight: '' });
    planLines.appendChild(line);
  }
  closeVariantPicker();
  scheduleAutoSave();
  showToast(`✓ Doplněno: ${variant.name}`);
}

document.getElementById('variant-picker-cancel').addEventListener('click', closeVariantPicker);
variantOverlay.addEventListener('click', e => { if (e.target === variantOverlay) closeVariantPicker(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !variantOverlay.hidden) closeVariantPicker();
});

// ── Změna hesla ──────────────────────────────────────────────────────────────
const pwOverlay  = document.getElementById('change-pw-overlay');
const pwCurrent  = document.getElementById('cp-current');
const pwNew      = document.getElementById('cp-new');
const pwConfirm  = document.getElementById('cp-confirm');
const pwMsg      = document.getElementById('cp-msg');

function openPwModal() {
  pwCurrent.value = ''; pwNew.value = ''; pwConfirm.value = '';
  pwMsg.textContent = ''; pwMsg.className = '';
  pwOverlay.hidden = false;
  pwCurrent.focus();
}
function closePwModal() { pwOverlay.hidden = true; }

document.getElementById('change-pw-btn').addEventListener('click', openPwModal);
document.getElementById('cp-cancel').addEventListener('click', closePwModal);
pwOverlay.addEventListener('click', e => { if (e.target === pwOverlay) closePwModal(); });

document.getElementById('cp-submit').addEventListener('click', async () => {
  const current = pwCurrent.value;
  const next    = pwNew.value;
  const confirm_ = pwConfirm.value;
  if (!current || !next || !confirm_) { pwMsg.className = 'err'; pwMsg.textContent = 'Vyplňte všechna pole.'; return; }
  if (next !== confirm_) { pwMsg.className = 'err'; pwMsg.textContent = 'Nová hesla se neshodují.'; return; }
  if (next.length < 4) { pwMsg.className = 'err'; pwMsg.textContent = 'Heslo musí mít alespoň 4 znaky.'; return; }

  const res = await fetch('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: current, newPassword: next })
  });
  if (res.status === 401) { window.location.href = '/login'; return; }
  const j = await res.json();
  if (j.ok) {
    pwMsg.className = 'ok'; pwMsg.textContent = '✓ Heslo bylo změněno.';
    setTimeout(closePwModal, 1500);
  } else {
    pwMsg.className = 'err'; pwMsg.textContent = '⚠️ ' + j.error;
  }
});

loadPlan();
loadProfile();
loadTemplates();
loadAccessoryVariants();
