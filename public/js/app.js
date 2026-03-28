/* ═══════════════════════════════════════════════════════
   API TESTER PRO — Front-end Application
═══════════════════════════════════════════════════════ */
'use strict';

// ─── STATE ───────────────────────────────────────────
const state = {
  environments: {},
  collections: {},
  history: [],
  proxyConfig: { enabled: false, host: '127.0.0.1', port: 8080, protocol: 'http', bypassSSL: true },
  activeEnv: null,
  params: [],
  headers: [],
  formFields: [],
  envVars: [],     // modal env vars
  bodyType: 'none',
  currentResponse: null,
  editingEnvName: null,
};

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  showTab('main');
  addParam();
  addHeader();
  updateHeaderBadge();
});

async function loadAll() {
  await Promise.all([
    loadEnvironments(),
    loadCollections(),
    loadHistory(),
    loadProxyConfig(),
  ]);
}

// ─── TAB NAVIGATION ──────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));

  const page = document.getElementById(`page-${tab}`);
  const btn = document.getElementById(`tab-${tab}`);
  if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tab === 'collections') renderCollectionsPage();
  if (tab === 'environments') renderEnvironmentsPage();
  if (tab === 'history') loadHistory();
}

// ─── REQUEST TAB NAVIGATION ──────────────────────────
function showReqTab(tab) {
  document.querySelectorAll('.req-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.req-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`rtab-${tab}`)?.classList.add('active');
  document.getElementById(`rtab-content-${tab}`)?.classList.add('active');
}

// ─── RESPONSE TAB ─────────────────────────────────────
function showRespTab(tab) {
  document.querySelectorAll('.resp-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.resp-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`resptab-${tab}`)?.classList.add('active');
  document.getElementById(`resp-content-${tab}`)?.classList.add('active');
}

function setRespView(view) {
  document.querySelectorAll('.resp-view-btns .btn-sm').forEach(b =>
    b.classList.toggle('active', b.id === `respview-${view}`)
  );
  if (state.currentResponse) renderResponse(state.currentResponse, view);
}

// ─── PARAMS ──────────────────────────────────────────
function addParam(key = '', value = '', description = '', enabled = true) {
  const id = `param_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  state.params.push({ id, key, value, description, enabled });
  renderTable('paramsTable', state.params, 'param');
}

function addHeader(key = '', value = '', description = '', enabled = true) {
  const id = `hdr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  state.headers.push({ id, key, value, description, enabled });
  renderTable('headersTable', state.headers, 'header');
  updateHeaderBadge();
}

function addFormField(key = '', value = '', enabled = true) {
  const id = `form_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  state.formFields.push({ id, key, value, enabled });
  renderFormTable();
}

function addPresetHeader(key, value) {
  addHeader(key, value);
}

function updateHeaderBadge() {
  const active = state.headers.filter(h => h.enabled && h.key).length;
  document.getElementById('headerBadge').textContent = active;
}

function renderTable(tableId, items, type) {
  const table = document.getElementById(tableId);
  const isForm = type === 'form';

  // Keep header row
  table.innerHTML = `<div class="kv-row kv-header ${isForm ? 'form-kv-row' : ''}">
    <div></div><div>Key</div><div>Value</div>${isForm ? '' : '<div>Description</div>'}<div></div>
  </div>`;

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = `kv-row ${isForm ? 'form-kv-row' : ''}`;
    row.innerHTML = `
      <input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleKvItem('${type}','${item.id}',this.checked)" />
      <input type="text" placeholder="Key" value="${escHtml(item.key)}" onchange="updateKvItem('${type}','${item.id}','key',this.value)" oninput="updateKvItem('${type}','${item.id}','key',this.value)" />
      <input type="text" placeholder="Value" value="${escHtml(item.value)}" onchange="updateKvItem('${type}','${item.id}','value',this.value)" oninput="updateKvItem('${type}','${item.id}','value',this.value)" />
      ${isForm ? '' : `<input type="text" placeholder="Description" value="${escHtml(item.description || '')}" onchange="updateKvItem('${type}','${item.id}','description',this.value)" />`}
      <button class="btn-del-row" onclick="removeKvItem('${type}','${item.id}')"><i class="fas fa-times"></i></button>
    `;
    table.appendChild(row);
  });
}

function renderFormTable() {
  renderTable('formTable', state.formFields, 'form');
}

function toggleKvItem(type, id, enabled) {
  const arr = getKvArr(type);
  const item = arr.find(i => i.id === id);
  if (item) item.enabled = enabled;
  if (type === 'header') updateHeaderBadge();
}

function updateKvItem(type, id, field, value) {
  const arr = getKvArr(type);
  const item = arr.find(i => i.id === id);
  if (item) item[field] = value;
  if (type === 'header') updateHeaderBadge();
}

function removeKvItem(type, id) {
  const arr = getKvArr(type);
  const idx = arr.findIndex(i => i.id === id);
  if (idx !== -1) arr.splice(idx, 1);
  if (type === 'param') renderTable('paramsTable', state.params, 'param');
  else if (type === 'header') { renderTable('headersTable', state.headers, 'header'); updateHeaderBadge(); }
  else if (type === 'form') renderFormTable();
}

function getKvArr(type) {
  if (type === 'param') return state.params;
  if (type === 'header') return state.headers;
  if (type === 'form') return state.formFields;
  return [];
}

// ─── BODY TYPE ────────────────────────────────────────
function switchBodyType(type) {
  state.bodyType = type;
  document.getElementById('bodyNone').style.display = type === 'none' ? 'flex' : 'none';
  document.getElementById('bodyJson').style.display = type === 'json' ? 'flex' : 'none';
  document.getElementById('bodyForm').style.display = type === 'form-urlencoded' ? 'flex' : 'none';
  document.getElementById('bodyRaw').style.display = type === 'raw' ? 'flex' : 'none';
  document.getElementById('bodyXml').style.display = type === 'xml' ? 'flex' : 'none';
}

function formatJSON() {
  const el = document.getElementById('bodyJsonInput');
  try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); }
  catch { showToast('Invalid JSON', 'error'); }
}
function minifyJSON() {
  const el = document.getElementById('bodyJsonInput');
  try { el.value = JSON.stringify(JSON.parse(el.value)); }
  catch { showToast('Invalid JSON', 'error'); }
}

// ─── AUTH ─────────────────────────────────────────────
function switchAuthType() {
  const type = document.getElementById('authType').value;
  document.getElementById('authNone').style.display = type === 'none' ? 'block' : 'none';
  document.getElementById('authBearer').style.display = type === 'bearer' ? 'flex' : 'none';
  document.getElementById('authBasic').style.display = type === 'basic' ? 'flex' : 'none';
  document.getElementById('authApiKey').style.display = type === 'apikey' ? 'flex' : 'none';
}

function getAuth() {
  const type = document.getElementById('authType').value;
  if (type === 'none') return { type: 'none' };
  if (type === 'bearer') return { type: 'bearer', token: document.getElementById('bearerToken').value };
  if (type === 'basic') return {
    type: 'basic',
    username: document.getElementById('basicUsername').value,
    password: document.getElementById('basicPassword').value,
  };
  if (type === 'apikey') return {
    type: 'apikey',
    key: document.getElementById('apiKeyValue').value,
    keyName: document.getElementById('apiKeyName').value || 'X-API-Key',
    addTo: document.getElementById('apiKeyAddTo').value,
  };
}

// ─── ENVIRONMENTS ─────────────────────────────────────
async function loadEnvironments() {
  try {
    const res = await fetch('/api/environments');
    state.environments = await res.json();
    updateEnvSelector();
  } catch (e) { console.error('loadEnvironments:', e); }
}

function updateEnvSelector() {
  const sel = document.getElementById('activeEnv');
  const cur = sel.value;
  sel.innerHTML = '<option value="">No Environment</option>';
  Object.keys(state.environments).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  if (cur && state.environments[cur]) sel.value = cur;
}

function loadEnvVars() {
  state.activeEnv = document.getElementById('activeEnv').value || null;
}

function createEnvironment() {
  state.editingEnvName = null;
  document.getElementById('newEnvName').value = '';
  state.envVars = [];
  renderEnvVarsTable();
  openModal('newEnvModal');
}

function addEnvVar(key = '', value = '', secret = false) {
  const id = `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  state.envVars.push({ id, key, value, secret });
  renderEnvVarsTable();
}

function renderEnvVarsTable() {
  const table = document.getElementById('envVarsTable');
  table.innerHTML = `<div class="kv-row kv-header">
    <div>Variable</div><div>Value</div><div>Secret</div><div></div>
  </div>`;
  state.envVars.forEach(ev => {
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `
      <input type="text" placeholder="VARIABLE_NAME" value="${escHtml(ev.key)}" oninput="updateEnvVar('${ev.id}','key',this.value)" />
      <input type="${ev.secret ? 'password' : 'text'}" placeholder="value" value="${escHtml(ev.value)}" oninput="updateEnvVar('${ev.id}','value',this.value)" />
      <input type="checkbox" ${ev.secret ? 'checked' : ''} title="Secret" onchange="updateEnvVar('${ev.id}','secret',this.checked)" />
      <button class="btn-del-row" onclick="removeEnvVar('${ev.id}')"><i class="fas fa-times"></i></button>
    `;
    table.appendChild(row);
  });
}

function updateEnvVar(id, field, value) {
  const ev = state.envVars.find(e => e.id === id);
  if (ev) {
    ev[field] = value;
    if (field === 'secret') renderEnvVarsTable();
  }
}

function removeEnvVar(id) {
  state.envVars = state.envVars.filter(e => e.id !== id);
  renderEnvVarsTable();
}

async function saveEnvironment() {
  const name = document.getElementById('newEnvName').value.trim();
  if (!name) return showToast('Environment name required', 'error');

  const variables = {};
  state.envVars.forEach(ev => {
    if (ev.key) variables[ev.key] = ev.value;
  });

  try {
    if (state.editingEnvName) {
      await fetch(`/api/environments/${encodeURIComponent(state.editingEnvName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables, newName: name }),
      });
    } else {
      await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, variables }),
      });
    }
    await loadEnvironments();
    renderEnvironmentsPage();
    closeModal('newEnvModal');
    showToast(`Environment "${name}" saved`, 'success');
  } catch (e) { showToast('Error saving environment', 'error'); }
}

async function deleteEnvironment(name) {
  if (!confirm(`Delete environment "${name}"?`)) return;
  await fetch(`/api/environments/${encodeURIComponent(name)}`, { method: 'DELETE' });
  await loadEnvironments();
  renderEnvironmentsPage();
  showToast(`Environment "${name}" deleted`, 'info');
}

function editEnvironment(name) {
  state.editingEnvName = name;
  document.getElementById('newEnvName').value = name;
  const vars = state.environments[name] || {};
  state.envVars = Object.entries(vars).map(([key, value]) => ({
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    key, value, secret: false,
  }));
  renderEnvVarsTable();
  openModal('newEnvModal');
}

function renderEnvironmentsPage() {
  const container = document.getElementById('environmentsView');
  const envs = state.environments;
  if (!Object.keys(envs).length) {
    container.innerHTML = `<div class="hint" style="padding:40px;text-align:center;">
      <i class="fas fa-cog" style="font-size:48px;opacity:.3;display:block;margin-bottom:12px;"></i>
      No environments yet. Create one to use variables in requests.
    </div>`;
    return;
  }
  container.innerHTML = Object.entries(envs).map(([name, vars]) => `
    <div class="env-card">
      <div class="env-card-header">
        <h3><i class="fas fa-layer-group"></i> ${escHtml(name)}</h3>
        <div class="collection-actions">
          <button class="btn-sm" onclick="editEnvironment('${escHtml(name)}')"><i class="fas fa-edit"></i></button>
          <button class="btn-sm" onclick="deleteEnvironment('${escHtml(name)}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="env-vars-list">
        ${Object.entries(vars).length === 0 
          ? '<div class="hint">No variables defined.</div>'
          : Object.entries(vars).map(([k,v]) => `
              <div class="env-var-row">
                <div class="env-var-key">{{${escHtml(k)}}}</div>
                <div class="env-var-val">${escHtml(v)}</div>
              </div>
            `).join('')}
      </div>
    </div>
  `).join('');
}

// ─── COLLECTIONS ──────────────────────────────────────
async function loadCollections() {
  try {
    const res = await fetch('/api/collections');
    state.collections = await res.json();
    renderSidebar();
  } catch (e) { console.error('loadCollections:', e); }
}

function createCollection() {
  document.getElementById('newCollectionName').value = '';
  openModal('newCollectionModal');
}

async function saveNewCollection() {
  const name = document.getElementById('newCollectionName').value.trim();
  if (!name) return showToast('Collection name required', 'error');
  await fetch('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  await loadCollections();
  renderCollectionsPage();
  closeModal('newCollectionModal');
  showToast(`Collection "${name}" created`, 'success');
}

function quickAddCollection() {
  createCollection();
}

async function deleteCollection(name) {
  if (!confirm(`Delete collection "${name}"?`)) return;
  await fetch(`/api/collections/${encodeURIComponent(name)}`, { method: 'DELETE' });
  await loadCollections();
  renderCollectionsPage();
  showToast(`Collection "${name}" deleted`, 'info');
}

async function deleteCollectionRequest(collName, reqId) {
  await fetch(`/api/collections/${encodeURIComponent(collName)}/requests/${reqId}`, { method: 'DELETE' });
  await loadCollections();
  renderCollectionsPage();
}

function loadCollectionRequest(collName, reqId) {
  const coll = state.collections[collName];
  if (!coll) return;
  const req = coll.requests.find(r => r.id === reqId);
  if (!req) return;

  document.getElementById('method').value = req.method || 'GET';
  document.getElementById('urlInput').value = req.url || '';

  // Headers
  state.headers = [];
  if (req.headers) {
    Object.entries(req.headers).forEach(([key, value]) => addHeader(key, value));
  }

  // Params
  state.params = [];
  if (req.params) req.params.forEach(p => addParam(p.key, p.value, p.description, p.enabled));

  // Body
  if (req.bodyType) {
    const radio = document.querySelector(`input[name="bodyType"][value="${req.bodyType}"]`);
    if (radio) { radio.checked = true; switchBodyType(req.bodyType); }
    if (req.bodyType === 'json') document.getElementById('bodyJsonInput').value = req.body || '';
    if (req.bodyType === 'raw') document.getElementById('bodyRawInput').value = req.body || '';
    if (req.bodyType === 'xml') document.getElementById('bodyXmlInput').value = req.body || '';
  }

  // Auth
  if (req.auth) {
    document.getElementById('authType').value = req.auth.type || 'none';
    switchAuthType();
    if (req.auth.type === 'bearer') document.getElementById('bearerToken').value = req.auth.token || '';
    if (req.auth.type === 'basic') {
      document.getElementById('basicUsername').value = req.auth.username || '';
      document.getElementById('basicPassword').value = req.auth.password || '';
    }
    if (req.auth.type === 'apikey') {
      document.getElementById('apiKeyName').value = req.auth.keyName || '';
      document.getElementById('apiKeyValue').value = req.auth.key || '';
    }
  }

  showTab('main');
  showToast(`Loaded: ${req.name || req.url}`, 'success');
}

function renderCollectionsPage() {
  const container = document.getElementById('collectionsView');
  const colls = state.collections;
  if (!Object.keys(colls).length) {
    container.innerHTML = `<div class="hint" style="padding:40px;text-align:center;">
      <i class="fas fa-folder-open" style="font-size:48px;opacity:.3;display:block;margin-bottom:12px;"></i>
      No collections yet. Save a request to create one.
    </div>`;
    return;
  }
  container.innerHTML = Object.entries(colls).map(([name, coll]) => `
    <div class="collection-card">
      <div class="collection-card-header" onclick="toggleCollCard('${escHtml(name)}')">
        <h3><i class="fas fa-folder"></i> ${escHtml(name)} <span style="color:var(--text2);font-weight:400;font-size:12px;">(${coll.requests.length} requests)</span></h3>
        <div class="collection-actions" onclick="event.stopPropagation()">
          <button class="btn-sm btn-danger" onclick="deleteCollection('${escHtml(name)}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="collection-requests" id="collreqs-${escHtml(name)}">
        ${coll.requests.length === 0 
          ? '<div class="hint">No saved requests.</div>'
          : coll.requests.map(req => `
              <div class="coll-req-item" onclick="loadCollectionRequest('${escHtml(name)}','${req.id}')">
                <span class="method-badge method-${req.method || 'GET'}">${req.method || 'GET'}</span>
                <div>
                  <div class="coll-req-name">${escHtml(req.name || 'Unnamed')}</div>
                  <div class="coll-req-url">${escHtml(req.url || '')}</div>
                </div>
                <button class="btn-del-row" style="margin-left:auto" onclick="event.stopPropagation();deleteCollectionRequest('${escHtml(name)}','${req.id}')">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            `).join('')}
      </div>
    </div>
  `).join('');
  renderSidebar();
}

function toggleCollCard(name) {
  const el = document.getElementById(`collreqs-${name}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function renderSidebar() {
  const container = document.getElementById('sidebarCollections');
  container.innerHTML = '';
  Object.entries(state.collections).forEach(([name, coll]) => {
    const div = document.createElement('div');
    div.className = 'sidebar-collection';
    div.innerHTML = `
      <div class="sidebar-coll-header" onclick="toggleSidebarColl('${escHtml(name)}')">
        <i class="fas fa-folder"></i> ${escHtml(name)}
      </div>
      <div id="sbcoll-${escHtml(name)}">
        ${coll.requests.map(req => `
          <div class="sidebar-req" onclick="loadCollectionRequest('${escHtml(name)}','${req.id}')">
            <span class="method-badge method-${req.method || 'GET'}">${req.method || 'GET'}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(req.name || req.url || 'Request')}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

function toggleSidebarColl(name) {
  const el = document.getElementById(`sbcoll-${name}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ─── SAVE REQUEST ─────────────────────────────────────
function showSaveDialog() {
  document.getElementById('saveRequestName').value = '';
  const sel = document.getElementById('saveCollection');
  sel.innerHTML = '<option value="">— Select Collection —</option>';
  Object.keys(state.collections).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  openModal('saveModal');
}

function createCollectionFromSave() {
  closeModal('saveModal');
  createCollection();
}

async function saveRequest() {
  const name = document.getElementById('saveRequestName').value.trim();
  const collection = document.getElementById('saveCollection').value;
  if (!name) return showToast('Request name required', 'error');
  if (!collection) return showToast('Select a collection', 'error');

  const body = getRequestBody();

  await fetch(`/api/collections/${encodeURIComponent(collection)}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      method: document.getElementById('method').value,
      url: document.getElementById('urlInput').value,
      headers: kvToObj(state.headers),
      params: state.params,
      body: body.body,
      bodyType: body.type,
      formData: state.formFields,
      auth: getAuth(),
    }),
  });
  await loadCollections();
  closeModal('saveModal');
  showToast(`Saved "${name}" to "${collection}"`, 'success');
}

function kvToObj(arr) {
  const obj = {};
  arr.filter(i => i.enabled && i.key).forEach(i => { obj[i.key] = i.value; });
  return obj;
}

function getRequestBody() {
  const type = state.bodyType;
  let body = null;
  if (type === 'json') body = document.getElementById('bodyJsonInput').value;
  else if (type === 'raw') body = document.getElementById('bodyRawInput').value;
  else if (type === 'xml') body = document.getElementById('bodyXmlInput').value;
  return { type, body };
}

// ─── PROXY ────────────────────────────────────────────
async function loadProxyConfig() {
  try {
    const res = await fetch('/api/proxy-config');
    state.proxyConfig = await res.json();
    applyProxyToUI();
  } catch (e) { console.error('loadProxyConfig:', e); }
}

function applyProxyToUI() {
  const cfg = state.proxyConfig;
  document.getElementById('proxyEnabled').checked = cfg.enabled;
  document.getElementById('proxyHost').value = cfg.host || '127.0.0.1';
  document.getElementById('proxyPort').value = cfg.port || 8080;
  document.getElementById('proxyProtocol').value = cfg.protocol || 'http';
  document.getElementById('bypassSSL').checked = cfg.bypassSSL !== false;
  updateProxyStatusBar();
}

function toggleProxy() {
  state.proxyConfig.enabled = document.getElementById('proxyEnabled').checked;
  updateProxyStatusBar();
}

function updateProxyStatusBar() {
  const enabled = state.proxyConfig.enabled;
  const dot = document.getElementById('proxyStatusDot');
  const label = document.getElementById('proxyStatusLabel');
  const info = document.getElementById('proxyStatusInfo');
  const bar = document.getElementById('proxyStatusBar');

  dot.className = enabled ? 'fas fa-circle active' : 'fas fa-circle';
  label.textContent = enabled ? 'ENABLED' : 'Disabled';
  label.style.color = enabled ? 'var(--warning)' : 'var(--text2)';
  info.textContent = enabled
    ? `→ ${state.proxyConfig.protocol}://${state.proxyConfig.host}:${state.proxyConfig.port}`
    : '';
  bar.style.borderBottomColor = enabled ? 'var(--warning)' : 'var(--border)';
}

async function saveProxyConfig() {
  state.proxyConfig = {
    enabled: document.getElementById('proxyEnabled').checked,
    host: document.getElementById('proxyHost').value,
    port: parseInt(document.getElementById('proxyPort').value) || 8080,
    protocol: document.getElementById('proxyProtocol').value,
    bypassSSL: document.getElementById('bypassSSL').checked,
  };
  await fetch('/api/proxy-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.proxyConfig),
  });
  updateProxyStatusBar();
  showToast('Proxy configuration saved', 'success');
}

// ─── SEND REQUEST ─────────────────────────────────────
async function sendRequest() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return showToast('Please enter a URL', 'error');

  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('responseArea').style.display = 'none';
  document.getElementById('testResults').innerHTML = '';

  const body = getRequestBody();
  const headers = kvToObj(state.headers);
  const params = state.params.filter(p => p.enabled && p.key);

  const payload = {
    url,
    method: document.getElementById('method').value,
    headers,
    body: body.body,
    bodyType: body.type,
    params,
    formData: state.formFields,
    auth: getAuth(),
    environment: document.getElementById('activeEnv').value || null,
  };

  try {
    const res = await fetch('/api/send-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    state.currentResponse = data;
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('responseArea').style.display = 'flex';
    renderResponse(data, 'pretty');
    runTests(data);
  } catch (e) {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('responseArea').style.display = 'flex';
    renderResponse({ error: true, message: e.message, status: 0, duration: 0 }, 'pretty');
  }
}

function renderResponse(data, view = 'pretty') {
  // Status badge
  const badge = document.getElementById('statusBadge');
  const status = data.status || 0;
  badge.textContent = status ? `${status} ${data.statusText || ''}` : 'ERROR';
  badge.className = `status-badge status-${status === 0 ? '0' : Math.floor(status/100) + 'xx'}`;

  // Meta
  document.getElementById('respTime').textContent = `${data.duration || 0} ms`;
  document.getElementById('respSize').textContent = data.size
    ? `${(data.size / 1024).toFixed(1)} KB`
    : '—';

  // Proxy badge
  const proxiedBadge = document.getElementById('proxiedBadge');
  proxiedBadge.style.display = data.proxied ? 'flex' : 'none';

  // Body
  const bodyEl = document.getElementById('responseBody');
  const rawEl = document.getElementById('responseRaw');

  let content = '';
  if (data.error) {
    content = `ERROR: ${data.message}\nCode: ${data.code || 'N/A'}`;
    if (data.proxied) content += `\n\nProxy: ${data.proxyInfo}`;
  } else {
    try {
      content = typeof data.data === 'string'
        ? data.data
        : JSON.stringify(data.data, null, view === 'pretty' ? 2 : 0);
    } catch { content = String(data.data); }
  }

  if (view === 'pretty') {
    bodyEl.className = 'response-body hljs language-json';
    bodyEl.textContent = content;
    try { hljs.highlightElement(bodyEl); } catch {}
  } else {
    bodyEl.className = 'response-body';
    bodyEl.textContent = content;
  }
  rawEl.textContent = JSON.stringify(data, null, 2);

  // Headers table
  const hTable = document.getElementById('respHeadersTable');
  hTable.innerHTML = '';
  if (data.headers) {
    Object.entries(data.headers).forEach(([k, v]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escHtml(k)}</td><td>${escHtml(String(v))}</td>`;
      hTable.appendChild(tr);
    });
  }

  // Cookies
  const cookies = document.getElementById('respCookies');
  const setCookie = data.headers?.['set-cookie'] || data.headers?.['Set-Cookie'];
  cookies.innerHTML = setCookie
    ? `<div class="hint"><b>set-cookie:</b> ${escHtml(String(setCookie))}</div>`
    : '<div class="hint">No cookies in response.</div>';
}

function copyResponse() {
  const text = document.getElementById('responseBody').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

// ─── TEST RUNNER ──────────────────────────────────────
function runTests(response) {
  const script = document.getElementById('testScript').value.trim();
  if (!script) return;

  const results = [];
  const pm = {
    response: {
      status: response.status,
      statusCode: response.status,
      json: () => response.data,
      text: () => JSON.stringify(response.data),
      headers: response.headers || {},
      responseTime: response.duration,
    },
    expect: (val) => ({
      to: {
        equal: (expected) => val === expected,
        include: (substr) => String(val).includes(String(substr)),
        be: { above: (n) => val > n, below: (n) => val < n },
      },
    }),
    test: (name, fn) => {
      try {
        const result = fn();
        results.push({ name, pass: result !== false });
      } catch (e) {
        results.push({ name, pass: false, error: e.message });
      }
    },
    environment: {
      get: (key) => state.environments[state.activeEnv || '']?.[key],
      set: (key, val) => {
        if (state.activeEnv && state.environments[state.activeEnv]) {
          state.environments[state.activeEnv][key] = val;
        }
      },
    },
  };

  try {
    new Function('pm', script)(pm);
  } catch (e) {
    results.push({ name: 'Script Error', pass: false, error: e.message });
  }

  const container = document.getElementById('testResults');
  container.innerHTML = results.length
    ? results.map(r => `
        <div class="test-item ${r.pass ? 'test-pass' : 'test-fail'}">
          <i class="fas fa-${r.pass ? 'check-circle' : 'times-circle'}"></i>
          ${escHtml(r.name)}
          ${r.error ? `<span style="color:var(--danger);font-size:11px;">— ${escHtml(r.error)}</span>` : ''}
        </div>
      `).join('')
    : '';

  if (results.length) showReqTab('tests');
}

// ─── HISTORY ──────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    state.history = await res.json();
    renderHistory();
  } catch (e) { console.error('loadHistory:', e); }
}

async function clearHistory() {
  if (!confirm('Clear all history?')) return;
  await fetch('/api/history', { method: 'DELETE' });
  state.history = [];
  renderHistory();
  showToast('History cleared', 'info');
}

function renderHistory() {
  const container = document.getElementById('historyView');
  if (!state.history.length) {
    container.innerHTML = `<div class="hint" style="padding:40px;text-align:center;">
      <i class="fas fa-history" style="font-size:48px;opacity:.3;display:block;margin-bottom:12px;"></i>
      No request history yet.
    </div>`;
    return;
  }

  container.innerHTML = state.history.map(item => {
    const statusClass = item.status >= 200 && item.status < 300 ? 'status-2xx'
      : item.status >= 300 && item.status < 400 ? 'status-3xx'
      : item.status >= 400 ? 'status-4xx' : 'status-0';
    const timeAgo = formatTimeAgo(item.timestamp);
    return `
      <div class="history-item" onclick="loadFromHistory('${item.id}')">
        <span class="method-badge method-${item.method || 'GET'}">${item.method || 'GET'}</span>
        <div class="history-meta">
          <div class="history-url">${escHtml(item.url)}</div>
          <div class="history-time">${timeAgo}${item.environment ? ` · ${escHtml(item.environment)}` : ''}</div>
        </div>
        <span class="history-status ${statusClass}">${item.status || 'ERR'}</span>
        <span class="history-duration">${item.duration}ms</span>
        ${item.error ? `<span style="color:var(--danger);font-size:11px;"><i class="fas fa-exclamation-triangle"></i></span>` : ''}
      </div>
    `;
  }).join('');
}

function loadFromHistory(id) {
  const item = state.history.find(h => h.id === id);
  if (!item) return;
  document.getElementById('urlInput').value = item.url || '';
  document.getElementById('method').value = item.method || 'GET';
  showTab('main');
  showToast('Request loaded from history', 'info');
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ─── EXPORT / IMPORT ──────────────────────────────────
async function exportData() {
  const res = await fetch('/api/export');
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `api-tester-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported successfully', 'success');
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await loadAll();
    renderCollectionsPage();
    renderEnvironmentsPage();
    showToast('Imported successfully', 'success');
  } catch (e) { showToast('Invalid JSON file', 'error'); }
  event.target.value = '';
}

// ─── MODALS ───────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─── TOAST ────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── UTILS ────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Keyboard shortcut: Ctrl+Enter to send
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendRequest();
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});