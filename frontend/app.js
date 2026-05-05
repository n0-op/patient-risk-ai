const isLocal = window.location.hostname === 'localhost'
             || window.location.hostname === '127.0.0.1';

const API_BASE = isLocal
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
    const res = await fetch(`${API_BASE}/patients/${activePatient.id}/analyze`, { method: 'POST' });
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
    const res = await fetch(`${API_BASE}/patients`);
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

// ── Build a Patient ───────────────────────────────────────────────────────

const bp = {
  diagnoses:   [],   // [{code, name}]
  medications: [],   // [{name, dose}]
  flags:       [],   // [str]
  selectedDx:  null,
  selectedMed: null,
};

let _dxTimer  = null;
let _medTimer = null;

function showBuildForm() {
  bp.diagnoses   = [];
  bp.medications = [];
  bp.flags       = [];
  bp.selectedDx  = null;
  bp.selectedMed = null;

  activeId      = null;
  activePatient = null;
  document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('active'));

  document.getElementById('panelTitle').textContent    = 'Build a Patient';
  document.getElementById('panelSubtitle').textContent = 'Configure a custom patient and run a live risk analysis.';

  const actions = document.getElementById('headerActions');
  actions.style.display = 'flex';
  actions.innerHTML = `<button class="refresh-btn" onclick="backToPatients()">← Patients</button>`;

  document.getElementById('contentArea').innerHTML = buildFormHTML();

  const dxInput  = document.getElementById('bp-dx-input');
  const medInput = document.getElementById('bp-med-input');

  dxInput.addEventListener('input', () => {
    const q = dxInput.value.trim();
    clearTimeout(_dxTimer);
    if (q.length < 2) { document.getElementById('bp-dx-drop').innerHTML = ''; return; }
    _dxTimer = setTimeout(() => fetchICD10(q), 300);
  });
  dxInput.addEventListener('blur', () => {
    setTimeout(() => { const d = document.getElementById('bp-dx-drop'); if (d) d.innerHTML = ''; }, 150);
  });

  medInput.addEventListener('input', () => {
    const q = medInput.value.trim();
    clearTimeout(_medTimer);
    if (q.length < 2) { document.getElementById('bp-med-drop').innerHTML = ''; return; }
    _medTimer = setTimeout(() => fetchRxNorm(q), 300);
  });
  medInput.addEventListener('blur', () => {
    setTimeout(() => { const d = document.getElementById('bp-med-drop'); if (d) d.innerHTML = ''; }, 150);
  });

  document.getElementById('bp-flag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') bpAddFlag();
  });
}

function buildFormHTML() {
  return `
    <div class="form-panel">
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input id="bp-name" type="text" class="form-input" placeholder="Patient name">
        </div>
        <div class="form-group">
          <label class="form-label">Age</label>
          <input id="bp-age" type="number" class="form-input" min="0" max="120" placeholder="Age">
        </div>
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select id="bp-gender" class="form-select">
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">Diagnoses</label>
        <div class="ac-row">
          <div class="ac-wrap">
            <input id="bp-dx-input" type="text" class="form-input" placeholder="Search ICD-10 (e.g. diabetes)">
            <div class="ac-drop" id="bp-dx-drop"></div>
          </div>
          <button class="add-btn" onclick="bpAddDx()">Add</button>
        </div>
        <div class="tag-list" id="bp-dx-tags"></div>
      </div>

      <div class="form-section">
        <label class="form-label">Medications</label>
        <div class="ac-row">
          <div class="ac-wrap">
            <input id="bp-med-input" type="text" class="form-input" placeholder="Search medications (e.g. metformin)">
            <div class="ac-drop" id="bp-med-drop"></div>
          </div>
          <input id="bp-dose-input" type="text" class="form-input dose-input" placeholder="Dose (e.g. 10mg)">
          <button class="add-btn" onclick="bpAddMed()">Add</button>
        </div>
        <div class="tag-list" id="bp-med-tags"></div>
      </div>

      <div class="form-section">
        <label class="form-label">Lab Values</label>
        <div class="form-grid-5">
          <div class="form-group">
            <label class="form-sublabel">A1C (%)</label>
            <input id="bp-a1c" type="number" class="form-input" step="0.1" placeholder="7.2">
          </div>
          <div class="form-group">
            <label class="form-sublabel">eGFR</label>
            <input id="bp-egfr" type="number" class="form-input" placeholder="45">
          </div>
          <div class="form-group">
            <label class="form-sublabel">Blood Pressure</label>
            <input id="bp-bp" type="text" class="form-input" placeholder="128/82">
          </div>
          <div class="form-group">
            <label class="form-sublabel">Creatinine</label>
            <input id="bp-creatinine" type="number" class="form-input" step="0.1" placeholder="1.2">
          </div>
          <div class="form-group">
            <label class="form-sublabel">Hemoglobin</label>
            <input id="bp-hemoglobin" type="number" class="form-input" step="0.1" placeholder="11.5">
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">Risk Flags</label>
        <div class="ac-row">
          <input id="bp-flag-input" type="text" class="form-input" placeholder="e.g. Recent hospitalization">
          <button class="add-btn" onclick="bpAddFlag()">Add</button>
        </div>
        <div class="tag-list" id="bp-flag-tags"></div>
      </div>

      <div class="form-actions">
        <div class="form-error" id="bp-error"></div>
        <button class="analyze-btn" id="bp-submit" onclick="bpSubmit()">Analyze Patient</button>
      </div>
    </div>
  `;
}

// ── ICD-10 autocomplete ──────────────────────────────────────────────────
async function fetchICD10(query) {
  const drop = document.getElementById('bp-dx-drop');
  if (!drop) return;
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=8`;
    const data = await fetch(url).then(r => r.json());
    const items = (data[3] || []).slice(0, 8);
    drop.innerHTML = items.length
      ? items.map(([code, name]) =>
          `<div class="ac-item" onmousedown="bpSelectDx('${escAttr(code)}','${escAttr(name)}')">${code} — ${name}</div>`
        ).join('')
      : '';
  } catch { drop.innerHTML = ''; }
}

function bpSelectDx(code, name) {
  bp.selectedDx = { code, name };
  const input = document.getElementById('bp-dx-input');
  if (input) input.value = `${code} — ${name}`;
  const drop = document.getElementById('bp-dx-drop');
  if (drop) drop.innerHTML = '';
}

function bpAddDx() {
  const input = document.getElementById('bp-dx-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  bp.diagnoses.push(bp.selectedDx || { code: '', name: text });
  bp.selectedDx = null;
  input.value = '';
  const drop = document.getElementById('bp-dx-drop');
  if (drop) drop.innerHTML = '';
  renderDxTags();
}

function bpRemoveDx(i) { bp.diagnoses.splice(i, 1); renderDxTags(); }

function renderDxTags() {
  const el = document.getElementById('bp-dx-tags');
  if (!el) return;
  el.innerHTML = bp.diagnoses.map((d, i) =>
    `<span class="tag">${d.code ? `${d.code} — ` : ''}${d.name}<button class="tag-remove" onclick="bpRemoveDx(${i})">×</button></span>`
  ).join('');
}

// ── RxNorm autocomplete ──────────────────────────────────────────────────
async function fetchRxNorm(query) {
  const drop = document.getElementById('bp-med-drop');
  if (!drop) return;
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`;
    const data = await fetch(url).then(r => r.json());
    const names = [];
    const seen  = new Set();
    for (const g of (data.drugGroup?.conceptGroup || [])) {
      for (const p of (g.conceptProperties || [])) {
        if (!seen.has(p.name)) { seen.add(p.name); names.push(p.name); }
        if (names.length >= 8) break;
      }
      if (names.length >= 8) break;
    }
    drop.innerHTML = names.length
      ? names.map(name =>
          `<div class="ac-item" onmousedown="bpSelectMed('${escAttr(name)}')">${name}</div>`
        ).join('')
      : '';
  } catch { drop.innerHTML = ''; }
}

function bpSelectMed(name) {
  bp.selectedMed = name;
  const input = document.getElementById('bp-med-input');
  if (input) input.value = name;
  const drop = document.getElementById('bp-med-drop');
  if (drop) drop.innerHTML = '';
}

function bpAddMed() {
  const medInput  = document.getElementById('bp-med-input');
  const doseInput = document.getElementById('bp-dose-input');
  if (!medInput) return;
  const name = (bp.selectedMed || medInput.value).trim();
  if (!name) return;
  bp.medications.push({ name, dose: doseInput?.value.trim() || '' });
  bp.selectedMed  = null;
  medInput.value  = '';
  if (doseInput) doseInput.value = '';
  const drop = document.getElementById('bp-med-drop');
  if (drop) drop.innerHTML = '';
  renderMedTags();
}

function bpRemoveMed(i) { bp.medications.splice(i, 1); renderMedTags(); }

function renderMedTags() {
  const el = document.getElementById('bp-med-tags');
  if (!el) return;
  el.innerHTML = bp.medications.map((m, i) =>
    `<span class="tag">${m.name}${m.dose ? ` ${m.dose}` : ''}<button class="tag-remove" onclick="bpRemoveMed(${i})">×</button></span>`
  ).join('');
}

// ── Risk flags ────────────────────────────────────────────────────────────
function bpAddFlag() {
  const input = document.getElementById('bp-flag-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  bp.flags.push(text);
  input.value = '';
  renderFlagTags();
}

function bpRemoveFlag(i) { bp.flags.splice(i, 1); renderFlagTags(); }

function renderFlagTags() {
  const el = document.getElementById('bp-flag-tags');
  if (!el) return;
  el.innerHTML = bp.flags.map((f, i) =>
    `<span class="tag">${f}<button class="tag-remove" onclick="bpRemoveFlag(${i})">×</button></span>`
  ).join('');
}

// ── Submit ────────────────────────────────────────────────────────────────
async function bpSubmit() {
  const name   = document.getElementById('bp-name')?.value.trim();
  const ageRaw = document.getElementById('bp-age')?.value;
  const errEl  = document.getElementById('bp-error');

  if (!name || !ageRaw) {
    if (errEl) errEl.textContent = 'Name and age are required.';
    return;
  }
  if (errEl) errEl.textContent = '';

  const btn = document.getElementById('bp-submit');
  btn.disabled    = true;
  btn.textContent = 'Analyzing…';

  const gender  = document.getElementById('bp-gender')?.value || '';
  const payload = {
    name,
    age:      parseInt(ageRaw),
    gender,
    diagnoses:   bp.diagnoses.map(d => d.code ? `${d.code} — ${d.name}` : d.name),
    medications: bp.medications,
    lab_values: {
      a1c:            parseFloatOrNull(document.getElementById('bp-a1c')?.value),
      egfr:           parseFloatOrNull(document.getElementById('bp-egfr')?.value),
      blood_pressure: document.getElementById('bp-bp')?.value.trim() || null,
      creatinine:     parseFloatOrNull(document.getElementById('bp-creatinine')?.value),
      hemoglobin:     parseFloatOrNull(document.getElementById('bp-hemoglobin')?.value),
    },
    risk_flags: bp.flags,
  };

  document.getElementById('panelTitle').textContent    = name;
  document.getElementById('panelSubtitle').textContent = 'Generating risk assessment…';
  document.getElementById('headerActions').style.display = 'none';
  document.getElementById('contentArea').innerHTML =
    `<div class="loading"><div class="spinner"></div> Analyzing patient record…</div>`;

  try {
    const res = await fetch(`${API_BASE}/analyze/custom`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data    = await res.json();
    const summary = data.summary;
    const priority = detectPriority(summary);
    const badge    = priority
      ? `<div class="priority-badge priority-${priority}">Follow-up: ${priority}</div>`
      : '';
    const dx0 = bp.diagnoses[0]?.name || 'Custom patient';

    document.getElementById('panelSubtitle').textContent = 'AI-generated clinical risk summary';
    const actions = document.getElementById('headerActions');
    actions.style.display = 'flex';
    actions.innerHTML = `
      <span class="cache-indicator live">Custom</span>
      <button class="refresh-btn" onclick="backToPatients()">← Patients</button>
    `;

    document.getElementById('contentArea').innerHTML = `
      <div class="summary-wrap">
        <div class="patient-profile">
          <div class="avatar">${initials(name)}</div>
          <div class="profile-info">
            <div class="name">${name}</div>
            <div class="meta">${ageRaw} yrs · ${gender || 'Unknown'} · ${dx0}</div>
          </div>
        </div>
        <div class="summary-card">${renderMarkdown(summary)}</div>
        ${badge}
      </div>
    `;
  } catch (err) {
    document.getElementById('panelSubtitle').textContent = '';
    const actions = document.getElementById('headerActions');
    actions.style.display = 'flex';
    actions.innerHTML = `<button class="refresh-btn" onclick="backToPatients()">← Patients</button>`;
    document.getElementById('contentArea').innerHTML =
      `<div class="error-msg">Analysis failed: ${err.message}</div>`;
  }
}

function parseFloatOrNull(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ── Back to patients ──────────────────────────────────────────────────────
function backToPatients() {
  activeId      = null;
  activePatient = null;
  document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('active'));

  document.getElementById('panelTitle').textContent    = 'Risk Assessment';
  document.getElementById('panelSubtitle').textContent = 'Select a patient from the list to generate a clinical risk summary.';

  const actions = document.getElementById('headerActions');
  actions.style.display = 'none';
  actions.innerHTML = `
    <span class="cache-indicator" id="cacheIndicator"></span>
    <button class="refresh-btn" id="refreshBtn" onclick="refreshPatient()">↺ Refresh</button>
  `;

  document.getElementById('contentArea').innerHTML = `
    <div class="empty-state">
      <div class="icon">🩺</div>
      <p>No patient selected</p>
    </div>
  `;
}
