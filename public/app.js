let plan = { cycles: [] };

// Which week is currently on screen for each cycle (in-memory only, not saved).
let currentWeekByCycle = {};

const cyclesEl   = document.getElementById('cycles');
const cycleTpl   = document.getElementById('cycle-tpl');
const dayTpl     = document.getElementById('day-tpl');
const sectionTpl = document.getElementById('section-tpl');
const itemTpl    = document.getElementById('exercise-item-tpl');
const toast      = document.getElementById('toast');

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

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
  const data = await res.json();
  plan = migrate(data);
  currentWeekByCycle = {};
  plan.cycles.forEach(c => { currentWeekByCycle[c.id] = c.weeks[0] ? c.weeks[0].id : null; });
  render();
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
  return d;
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

  weekLabel.value = curWeek ? (curWeek.label || '') : '';

  daysBox.innerHTML = '';
  if (curWeek) curWeek.days.forEach(day => daysBox.appendChild(buildDayNode(day)));

  node.querySelector('.btn-add-day').addEventListener('click', () => {
    if (!curWeek) return;
    const newDay = { id: uid('d'), name: '', focus: '', sections: [] };
    curWeek.days.push(newDay);
    daysBox.appendChild(buildDayNode(newDay));
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
  });

  node.querySelector('.btn-remove-day').addEventListener('click', () => {
    if (dayHasContent(node) && !confirm('Tento den obsahuje vyplněné údaje. Opravdu ho smazat i s obsahem?')) return;
    node.remove();
  });

  return node;
}

function buildSectionNode(sec) {
  const node = sectionTpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.section-name').value = sec ? (sec.name || '') : '';

  const itemsBox = node.querySelector('.exercise-items');
  if (sec) (sec.exercises || []).forEach(ex => itemsBox.appendChild(makeItem(ex)));

  node.querySelector('.btn-add-exercise').addEventListener('click', () => {
    itemsBox.appendChild(makeItem());
  });

  node.querySelector('.btn-remove-section').addEventListener('click', () => {
    if (sectionHasContent(node) && !confirm('Tato sekce obsahuje cviky. Opravdu ji smazat i s obsahem?')) return;
    node.remove();
  });

  return node;
}

function makeItem(ex) {
  const node = itemTpl.content.firstElementChild.cloneNode(true);
  const actualBox = node.querySelector('.exercise-actual');
  const toggleBtn = node.querySelector('.btn-toggle-actual');

  if (ex) {
    node.querySelector('.ex-name').value   = ex.name   || '';
    node.querySelector('.ex-sets').value   = ex.sets   ?? '';
    node.querySelector('.ex-reps').value   = ex.reps   ?? '';
    node.querySelector('.ex-weight').value = ex.weight || '';
    node.querySelector('.ex-actual-weight').value = ex.actualWeight || '';
    node.querySelector('.ex-note').value          = ex.note || '';
    if (ex.actualWeight || ex.note) {
      actualBox.hidden = false;
      node.classList.add('has-actual');
    }
  }

  toggleBtn.addEventListener('click', () => {
    actualBox.hidden = !actualBox.hidden;
    if (!actualBox.hidden) node.querySelector('.ex-actual-weight').focus();
  });

  node.querySelector('.btn-clear-actual').addEventListener('click', () => {
    node.querySelector('.ex-actual-weight').value = '';
    node.querySelector('.ex-note').value = '';
    actualBox.hidden = true;
    node.classList.remove('has-actual');
  });

  node.querySelector('.btn-remove').addEventListener('click', () => node.remove());

  return node;
}

// ── Content checks (used to decide whether a delete needs confirmation) ────────
function dayHasContent(dayNode) {
  if (dayNode.querySelector('.day-name-input').value.trim()) return true;
  if (dayNode.querySelector('.focus-input').value.trim()) return true;
  return Array.from(dayNode.querySelectorAll('.section-card')).some(sectionHasContent);
}
function sectionHasContent(sectionNode) {
  if (sectionNode.querySelector('.section-name').value.trim()) return true;
  return Array.from(sectionNode.querySelectorAll('.exercise-item')).some(item =>
    ['.ex-name', '.ex-sets', '.ex-reps', '.ex-weight', '.ex-actual-weight', '.ex-note']
      .some(sel => item.querySelector(sel).value.trim())
  );
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
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
        const exName       = item.querySelector('.ex-name').value.trim();
        const sets         = item.querySelector('.ex-sets').value;
        const reps         = item.querySelector('.ex-reps').value;
        const weight       = item.querySelector('.ex-weight').value.trim();
        const actualWeight = item.querySelector('.ex-actual-weight').value.trim();
        const note         = item.querySelector('.ex-note').value.trim();
        if (exName || sets || reps || weight || actualWeight || note) {
          exercises.push({
            name: exName,
            sets: sets === '' ? null : Number(sets),
            reps: reps === '' ? null : Number(reps),
            weight,
            actualWeight,
            note
          });
        }
      });
      if (sName || exercises.length) {
        sections.push({ id: uid('s'), name: sName, exercises });
      }
    });

    days.push({ id, name, focus, sections });
  });
  week.days = days;
}

// ── Structural actions ─────────────────────────────────────────────────────────
function addWeek(cycle) {
  syncCycleCurrentWeekFromDom(cycle);
  const newWeek = defaultWeek(cycle.weeks.length + 1);
  cycle.weeks.push(newWeek);
  currentWeekByCycle[cycle.id] = newWeek.id;
  render();
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
}

function addCycle() {
  plan.cycles.forEach(c => { syncCycleCurrentWeekFromDom(c); c.collapsed = true; });
  const newCycle = defaultCycle(plan.cycles.length + 1);
  plan.cycles.push(newCycle);
  currentWeekByCycle[newCycle.id] = newCycle.weeks[0].id;
  render();
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
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function savePlan() {
  plan.cycles.forEach(c => syncCycleCurrentWeekFromDom(c));
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan)
  });
  if (res.ok) {
    showToast('✓ Plán uložen');
  } else {
    showToast('⚠️ Uložení se nezdařilo');
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

document.getElementById('save-btn').addEventListener('click', savePlan);
document.getElementById('add-cycle-btn').addEventListener('click', addCycle);

loadPlan();
