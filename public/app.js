let plan = { weeks: [] };
let currentWeekId = null;

const weekTabsEl   = document.getElementById('week-tabs');
const weekLabelEl  = document.getElementById('week-label');
const daysEl       = document.getElementById('days');
const itemTpl      = document.getElementById('exercise-item-tpl');
const toast        = document.getElementById('toast');

const DEFAULT_DAYS = [
  { name: 'Pondělí', focus: '' },
  { name: 'Úterý',   focus: '' },
  { name: 'Středa',  focus: '' },
  { name: 'Čtvrtek', focus: '' },
  { name: 'Pátek',   focus: '' },
  { name: 'Sobota',  focus: '' },
  { name: 'Neděle',  focus: '' }
];

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function loadPlan() {
  const res = await fetch('/api/plan');
  const data = await res.json();
  plan = migrate(data);
  currentWeekId = plan.weeks[0] ? plan.weeks[0].id : null;
  render();
}

// Backward-compat: older saved files might still use the flat { days: [...] } shape.
function migrate(data) {
  if (data && Array.isArray(data.weeks)) return data;
  if (data && Array.isArray(data.days)) {
    return { weeks: [{ id: uid('w'), label: 'Týden 1', days: data.days }] };
  }
  return { weeks: [{ id: uid('w'), label: 'Týden 1', days: DEFAULT_DAYS.map((d, i) => ({ id: 'd' + (i + 1), name: d.name, focus: d.focus, exercises: [] })) }] };
}

function currentWeek() {
  return plan.weeks.find(w => w.id === currentWeekId) || plan.weeks[0];
}

function render() {
  renderWeekTabs();
  renderWeek();
}

function renderWeekTabs() {
  weekTabsEl.innerHTML = '';
  plan.weeks.forEach((week, i) => {
    const btn = document.createElement('button');
    btn.className = 'week-tab' + (week.id === currentWeekId ? ' active' : '');
    btn.textContent = week.label || ('Týden ' + (i + 1));
    btn.addEventListener('click', () => {
      syncCurrentWeekFromDom();
      currentWeekId = week.id;
      render();
    });
    weekTabsEl.appendChild(btn);
  });
}

function renderWeek() {
  const week = currentWeek();
  if (!week) { daysEl.innerHTML = ''; weekLabelEl.value = ''; return; }

  weekLabelEl.value = week.label || '';
  daysEl.innerHTML = '';

  week.days.forEach(day => {
    const card = document.createElement('section');
    card.className = 'day-card';
    card.dataset.dayId = day.id;

    const head = document.createElement('div');
    head.className = 'day-head';
    head.innerHTML = `
      <h2>${day.name}</h2>
      <input type="text" class="focus-input" value="${escapeAttr(day.focus || '')}" placeholder="Zaměření (např. Nohy)">
    `;
    card.appendChild(head);

    const items = document.createElement('div');
    items.className = 'exercise-items';
    (day.exercises || []).forEach(ex => items.appendChild(makeItem(ex)));
    card.appendChild(items);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = '+ Přidat cvik';
    addBtn.addEventListener('click', () => items.appendChild(makeItem()));
    card.appendChild(addBtn);

    daysEl.appendChild(card);
  });
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

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

// Read whatever is currently in the DOM back into the in-memory `plan`
// for the week that's on screen, so switching tabs / saving doesn't lose edits.
function syncCurrentWeekFromDom() {
  const week = currentWeek();
  if (!week) return;

  week.label = weekLabelEl.value.trim();

  const days = [];
  daysEl.querySelectorAll('.day-card').forEach(card => {
    const id = card.dataset.dayId;
    const original = week.days.find(d => d.id === id) || {};
    const focus = card.querySelector('.focus-input').value.trim();
    const exercises = [];
    card.querySelectorAll('.exercise-item').forEach(item => {
      const name         = item.querySelector('.ex-name').value.trim();
      const sets         = item.querySelector('.ex-sets').value;
      const reps         = item.querySelector('.ex-reps').value;
      const weight       = item.querySelector('.ex-weight').value.trim();
      const actualWeight = item.querySelector('.ex-actual-weight').value.trim();
      const note         = item.querySelector('.ex-note').value.trim();
      if (name || sets || reps || weight || actualWeight || note) {
        exercises.push({
          name,
          sets: sets === '' ? null : Number(sets),
          reps: reps === '' ? null : Number(reps),
          weight,
          actualWeight,
          note
        });
      }
    });
    days.push({ id, name: original.name, focus, exercises });
  });
  week.days = days;
}

function addWeek() {
  syncCurrentWeekFromDom();
  const newWeek = {
    id: uid('w'),
    label: 'Týden ' + (plan.weeks.length + 1),
    days: DEFAULT_DAYS.map((d, i) => ({ id: 'd' + (i + 1), name: d.name, focus: '', exercises: [] }))
  };
  plan.weeks.push(newWeek);
  currentWeekId = newWeek.id;
  render();
}

function removeWeek() {
  if (plan.weeks.length <= 1) {
    showToast('⚠️ Musí zůstat aspoň jeden týden');
    return;
  }
  const week = currentWeek();
  if (!confirm(`Opravdu smazat "${week.label || 'tento týden'}"? Tuto akci nelze vzít zpět.`)) return;
  plan.weeks = plan.weeks.filter(w => w.id !== week.id);
  currentWeekId = plan.weeks[0].id;
  render();
}

async function savePlan() {
  syncCurrentWeekFromDom();
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
document.getElementById('add-week-btn').addEventListener('click', addWeek);
document.getElementById('remove-week-btn').addEventListener('click', removeWeek);

loadPlan();
