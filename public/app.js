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

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

// ── Mode: "view" (sledování tréninku) vs. "edit" (tvorba/úprava plánu) ──────────
let mode = localStorage.getItem('trainingPlanMode') === 'edit' ? 'edit' : 'view';

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

  return node;
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
  editorEl.hidden = mode !== 'edit';
  viewerEl.hidden = mode !== 'view';
  document.getElementById('mode-view-btn').classList.toggle('active', mode === 'view');
  document.getElementById('mode-edit-btn').classList.toggle('active', mode === 'edit');
  // Zobrazení is now purely read-only (Rozcvička, Plán and Realita are all
  // entered in Úprava), so there's nothing to save while looking at it.
  saveBtn.hidden = mode !== 'edit';
  setSaveStatus(mode === 'edit' ? '✓ Uloženo' : '');
  localStorage.setItem('trainingPlanMode', mode);
}

function switchMode(newMode) {
  if (newMode === mode) return;
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
  } else {
    render(); // rebuild the editor from `plan`, picking up any viewer edits
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
    const actualParts = [];
    if (ex.actualSets != null && ex.actualReps) actualParts.push(`${ex.actualSets} × ${ex.actualReps}`);
    else if (ex.actualSets != null) actualParts.push(`${ex.actualSets} série`);
    else if (ex.actualReps) actualParts.push(`${ex.actualReps}×`);
    if (ex.actualWeight) actualParts.push(ex.actualWeight);

    const line = el('div', 'viewer-line viewer-line-actual');
    line.appendChild(el('span', 'viewer-line-label', 'Realita'));
    line.appendChild(el('span', 'viewer-line-value', actualParts.length ? actualParts.join(' · ') : '–'));
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
      const parts = [];
      if (line.sets != null && line.reps) parts.push(`${line.sets} × ${line.reps}`);
      else if (line.sets != null) parts.push(`${line.sets} série`);
      else if (line.reps) parts.push(`${line.reps}×`);
      if (line.weight) parts.push(line.weight);
      const text = parts.length ? parts.join(' · ') : '–';

      if (checkable) {
        const row = document.createElement('label');
        row.className = 'viewer-set-line viewer-set-line-checkable';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'set-check';
        cb.addEventListener('change', () => row.classList.toggle('done', cb.checked));
        row.appendChild(cb);
        row.appendChild(el('span', 'viewer-set-line-text', text));
        list.appendChild(row);
      } else {
        list.appendChild(el('div', 'viewer-set-line', text));
      }
    });
    group.appendChild(list);
  } else {
    group.appendChild(el('div', 'viewer-set-lines viewer-set-empty', '–'));
  }
  return group;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

document.getElementById('save-btn').addEventListener('click', () => savePlan(false));
document.getElementById('add-cycle-btn').addEventListener('click', addCycle);
document.getElementById('mode-view-btn').addEventListener('click', () => switchMode('view'));
document.getElementById('mode-edit-btn').addEventListener('click', () => switchMode('edit'));

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
