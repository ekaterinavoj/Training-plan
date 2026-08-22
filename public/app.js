let plan = { days: [] };

const daysEl = document.getElementById('days');
const rowTpl = document.getElementById('exercise-row-tpl');
const toast  = document.getElementById('toast');

async function loadPlan() {
  const res = await fetch('/api/plan');
  plan = await res.json();
  render();
}

function render() {
  daysEl.innerHTML = '';
  plan.days.forEach(day => {
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

    const rows = document.createElement('div');
    rows.className = 'exercise-rows';
    (day.exercises || []).forEach(ex => rows.appendChild(makeRow(ex)));
    card.appendChild(rows);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = '+ Přidat cvik';
    addBtn.addEventListener('click', () => rows.appendChild(makeRow()));
    card.appendChild(addBtn);

    daysEl.appendChild(card);
  });
}

function makeRow(ex) {
  const node = rowTpl.content.firstElementChild.cloneNode(true);
  if (ex) {
    node.querySelector('.ex-name').value   = ex.name   || '';
    node.querySelector('.ex-sets').value   = ex.sets   ?? '';
    node.querySelector('.ex-reps').value   = ex.reps   ?? '';
    node.querySelector('.ex-weight').value = ex.weight || '';
  }
  node.querySelector('.btn-remove').addEventListener('click', () => node.remove());
  return node;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function collectPlan() {
  const days = [];
  daysEl.querySelectorAll('.day-card').forEach(card => {
    const id = card.dataset.dayId;
    const original = plan.days.find(d => d.id === id) || {};
    const focus = card.querySelector('.focus-input').value.trim();
    const exercises = [];
    card.querySelectorAll('.exercise-row').forEach(row => {
      const name = row.querySelector('.ex-name').value.trim();
      const sets = row.querySelector('.ex-sets').value;
      const reps = row.querySelector('.ex-reps').value;
      const weight = row.querySelector('.ex-weight').value.trim();
      if (name || sets || reps || weight) {
        exercises.push({
          name,
          sets: sets === '' ? null : Number(sets),
          reps: reps === '' ? null : Number(reps),
          weight
        });
      }
    });
    days.push({ id, name: original.name, focus, exercises });
  });
  return { days };
}

async function savePlan() {
  const data = collectPlan();
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (res.ok) {
    plan = data;
    showToast('✓ Plán uložen');
  } else {
    showToast('⚠️ Uložení se nezdařilo');
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

document.getElementById('save-btn').addEventListener('click', savePlan);

loadPlan();
