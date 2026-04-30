const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://127.0.0.1:8000'
  : 'https://web-production-9a2f8.up.railway.app';
const cache = {};           // keyed by patient id
let activeId = null;
let activePatient = null;   // { id, name, age, gender, dx }

// ── Minimal markdown renderer ─────────────────────────────────────────────
function renderMarkdown(raw) {
  const esc = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (/^#{1,3}\s/.test(t)) return `<h3>${inline(t.replace(/^#{1,3}\s/, ''))}</h3>`;
      if (/^[-*]\s/.test(t))   return `<p>• ${inline(t.slice(2))}</p>`;
      if (t === '')             return '';
      return `<p>${inline(t)}</p>`;
    })
    .join('\n');
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>');
}

// ── Detect follow-up priority ─────────────────────────────────────────────
function detectPriority(text) {
  const lower = text.toLowerCase();
  const m = lower.match(/(?:priority|follow[- ]?up)[:\s*]+(\w+)/);
  if (m) {
    if (m[1] === 'high')                          return 'high';
    if (m[1] === 'medium' || m[1] === 'moderate') return 'medium';
    if (m[1] === 'low')                           return 'low';
  }
  const tail = lower.slice(-120);
  if (tail.includes('high'))                      return 'high';
  if (tail.includes('medium') || tail.includes('moderate')) return 'medium';
  if (tail.includes('low'))                       return 'low';
  return null;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function escAttr(s) {
  return s.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ── Render summary into the panel ────────────────────────────────────────
function renderSummary(fromCache) {
  const { name, age, gender, dx } = activePatient;
  const summary = cache[activePatient.id];

  const priority = detectPriority(summary);
  const badge    = priority
    ? `<div class="priority-badge priority-${priority}">Follow-up: ${priority}</div>`
    : '';

  document.getElementById('panelTitle').textContent    = name;
  document.getElementById('panelSubtitle').textContent = 'AI-generated clinical risk summary';

  const indicator = document.getElementById('cacheIndicator');
  indicator.textContent  = fromCache ? 'Cached' : 'Live';
  indicator.className    = `cache-indicator ${fromCache ? 'cached' : 'live'}`;

  const actions = document.getElementById('headerActions');
  actions.style.display  = 'flex';

  document.getElementById('refreshBtn').disabled = false;

  document.getElementById('contentArea').innerHTML = `
    <div class="summary-wrap">
      <div class="patient-profile">
        <div class="avatar">${initials(name)}</div>
        <div class="profile-info">
          <div class="name">${name}</div>
          <div class="meta">${age} yrs · ${gender} · ${dx}</div>
        </div>
      </div>
      <div class="summary-card">${renderMarkdown(summary)}</div>
      ${badge}
    </div>
  `;
}

// ── Show loading state ────────────────────────────────────────────────────
function showLoading() {
  document.getElementById('panelTitle').textContent    = activePatient.name;
  document.getElementById('panelSubtitle').textContent = 'Generating risk assessment…';
  document.getElementById('headerActions').style.display = 'none';
  document.getElementById('contentArea').innerHTML =
    `<div class="loading"><div class="spinner"></div> Analyzing patient record…</div>`;
}

// ── Fetch from API, store in cache, then render ───────────────────────────
async function fetchAndCache() {
  showLoading();
  try {
    const res = await fetch(`${API}/patients/${activePatient.id}/analyze`, { method: 'POST' });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    cache[activePatient.id] = data.summary;
    renderSummary(false);
  } catch (err) {
    document.getElementById('panelSubtitle').textContent = '';
    document.getElementById('headerActions').style.display = 'none';
    document.getElementById('contentArea').innerHTML =
      `<div class="error-msg">Analysis failed: ${err.message}</div>`;
  }
}

// ── Load patient list on startup ──────────────────────────────────────────
async function loadPatients() {
  const list = document.getElementById('patientList');
  try {
    const res = await fetch(`${API}/patients`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const patients = await res.json();

    list.innerHTML = patients.map(p => `
      <div class="patient-item" data-id="${p.id}"
           onclick="selectPatient('${p.id}', '${escAttr(p.name)}', '${p.age}', '${escAttr(p.gender)}', '${escAttr(p.diagnoses[0])}', this)">
        <div class="patient-name">${p.name}</div>
        <div class="patient-meta">${p.age} yrs · ${p.gender}</div>
        <div class="patient-dx">${p.diagnoses[0]}</div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div class="list-status" style="color:#ef4444">Could not load patients.<br><small>${err.message}</small></div>`;
  }
}

// ── Select a patient ──────────────────────────────────────────────────────
function selectPatient(id, name, age, gender, dx, el) {
  if (activeId === id) return;
  activeId = id;
  activePatient = { id, name, age, gender, dx };

  document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  if (cache[id]) {
    renderSummary(true);
  } else {
    fetchAndCache();
  }
}

// ── Refresh: clear cache entry and re-fetch ───────────────────────────────
function refreshPatient() {
  if (!activeId) return;
  document.getElementById('refreshBtn').disabled = true;
  delete cache[activeId];
  fetchAndCache();
}

loadPatients();
