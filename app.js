/* ===========================
   FertiCalc — app.js (corrigido)
   - sem seed/demo
   - import robusto
   - trava K2O na base via campo fkbase
   =========================== */

/* ===== GLOBAL STATE ===== */
let ferts = JSON.parse(localStorage.getItem('fc_ferts') || '[]');
let editId = null, nuts = {}, mxP = 1, shN = 1, currentCrit = 'balanced';
let lastResults = null, lastTgts = null, chatHistory = {};
let parsedImport = [];

/* ===== CONFIG ===== */
const ENABLE_SEED = false;
const REQUIRE_REAL_PRODUCTS = true;
const MIN_COVERAGE = 0.985;   // 98,5% da meta
const ABS_TOL_KGHA = 0.5;
const MAX_K_COMB = 6;

/* ===== UTILS ===== */
const g = (x) => document.getElementById(x);
const safeShow = (id, disp) => { const el = g(id); if (el) el.style.display = disp; };
const safeText = (id, txt) => { const el = g(id); if (el) el.textContent = txt; };
const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nd = (n, d = 2) => parseFloat((Number(n || 0)).toFixed(d));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtN = (n) => {
  if (!n) return '—';
  return ['N', 'P2O5', 'K2O', 'S']
    .filter(k => (n[k] || 0) > 0)
    .map(k => k.replace('P2O5', 'P₂O₅').replace('K2O', 'K₂O') + ' ' + n[k] + '%')
    .join(' · ') || '—';
};
const fmtNK = (n) => String(n).replace('P2O5', 'P₂O₅').replace('K2O', 'K₂O');

function toast(msg, tp = '') {
  const t = document.createElement('div');
  t.className = 't' + (tp ? ' ' + tp : '');
  t.textContent = msg;
  const tw = g('tw');
  if (tw) tw.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function saveFerts() {
  localStorage.setItem('fc_ferts', JSON.stringify(ferts));
}

/* ===== SIDEBAR ===== */
function openSB() {
  const sb = g('sbar'), ov = g('sovly');
  if (sb) sb.classList.add('open');
  if (ov) { ov.classList.add('on'); ov.style.display = 'block'; }
}
function closeSB() {
  const sb = g('sbar'), ov = g('sovly');
  if (sb) sb.classList.remove('open');
  if (ov) { ov.classList.remove('on'); ov.style.display = 'none'; }
}
function navTo(sec) {
  closeSB();
  document.querySelectorAll('.si').forEach(s => s.classList.remove('on'));

  if (sec === 'calc') {
    document.querySelectorAll('.si')[0]?.classList.add('on');
    showView('view-calc');
    safeText('hdr-title', 'Fertilizantes');
    safeShow('hdr-right', 'flex');
  } else if (sec === 'import') {
    document.querySelectorAll('.si')[1]?.classList.add('on');
    showView('view-import');
    safeText('hdr-title', 'Importar Lista');
    safeShow('hdr-right', 'none');
    impGoStep(1);
  } else if (sec === 'ia-cfg') {
    toggleCfg();
  } else {
    toast('Em desenvolvimento');
  }
}
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
}

/* ===== API KEY ===== */
function getKey() { return localStorage.getItem('fc_ai_key') || ''; }

function saveKey() {
  const k = (g('api-key-input')?.value || '').trim();
  if (!k) { toast('Cole a chave primeiro', 'er'); return; }
  if (!k.startsWith('sk-')) { toast('Chave inválida (deve começar com sk-)', 'er'); return; }
  localStorage.setItem('fc_ai_key', k);
  if (g('api-key-input')) g('api-key-input').value = '';
  updateKeyStatus();
  toast('Chave salva', 'ok');
  safeShow('cfg-panel', 'none');
}

function clearKey() {
  localStorage.removeItem('fc_ai_key');
  if (g('api-key-input')) g('api-key-input').value = '';
  updateKeyStatus();
  toast('Chave removida');
}

function updateKeyStatus() {
  const has = !!getKey();
  const dot = g('key-dot'), lbl = g('key-label');
  if (dot) dot.className = 'key-dot ' + (has ? 'active' : 'missing');
  if (lbl) lbl.textContent = has ? 'IA conectada' : 'Sem chave';
}

function toggleCfg() {
  const p = g('cfg-panel');
  if (!p) return;
  p.style.display = p.style.display === 'block' ? 'none' : 'block';
  if (p.style.display === 'block') g('api-key-input')?.focus();
}

/* ===== FERTILIZER LIST ===== */
function renderFerts() {
  const cnt = g('fert-cnt');
  if (cnt) cnt.textContent = ferts.length + (ferts.length === 1 ? ' produto' : ' produtos');

  if (!ferts.length) {
    const fl = g('flist');
    if (fl) fl.innerHTML = `
      <div class="pi-empty">
        <div class="pie-ico">🧪</div>
        <div class="pie-t">Nenhum fertilizante</div>
        <div class="pie-s">Cadastre ou importe produtos para começar</div>
        <button class="btn-add" style="margin-top:8px" onclick="openAddProduct()">+ Adicionar produto</button>
      </div>`;
    return;
  }

  const fl = g('flist');
  if (!fl) return;

  fl.innerHTML = ferts.map(f => {
    const pr = f.priceTon ? 'R$ ' + Number(f.priceTon).toLocaleString('pt-BR') + '/t' : '—';
    const st =
      f.status === 'review' ? '<span class="sbadge s-rev">Revisar</span>' :
      f.active ? '<span class="sbadge s-ok">OK</span>' :
      '<span class="sbadge s-off">Inativo</span>';

    return `<div class="fc" id="fc-${f.id}">
      <div class="fc-hd">
        <div class="dot ${f.active ? '' : 'off'}" title="${f.active ? 'Ativo' : 'Inativo'}" onclick="toggleAct('${f.id}',event)"></div>
        <div class="fc-info" onclick="expand('${f.id}')">
          <div class="fc-name">${f.name}</div>
          <div class="fc-sub">${fmtN(f.nutrients)}${f.supplier ? ' · ' + f.supplier : ''}${f.delivery ? ' · ' + f.delivery : ''}</div>
        </div>
        <div class="fc-price">${pr}</div>
        <div class="fc-acts">
          <button class="ib" onclick="expand('${f.id}')"><span id="arr-${f.id}" style="font-size:9px">▼</span></button>
          <button class="ib" title="Editar" onclick="editProd('${f.id}')">✎</button>
          <button class="ib" title="Duplicar" onclick="dupProd('${f.id}')">⧉</button>
          <button class="ib d" title="Excluir" onclick="delProd('${f.id}')">✕</button>
        </div>
      </div>
      <div class="fc-det" id="fd-${f.id}">
        <div class="dr"><span class="dl">Fornecedor</span><span class="dv">${f.supplier || '—'}</span></div>
        <div class="dr"><span class="dl">Entrega</span><span class="dv">${f.delivery || '—'}</span></div>
        <div class="dr"><span class="dl">Preço/t</span><span class="dv">${f.priceTon ? brl(f.priceTon) : '—'}</span></div>
        <div class="dr"><span class="dl">Frete/t</span><span class="dv">${f.freightTon ? brl(f.freightTon) : '—'}</span></div>
        <div class="dr"><span class="dl">Status</span><span class="dv">${st}</span></div>
      </div>
    </div>`;
  }).join('');
}

function expand(id) {
  const d = g('fd-' + id);
  const a = g('arr-' + id);
  if (!d) return;
  const o = d.classList.toggle('open');
  if (a) a.textContent = o ? '▲' : '▼';
}

function toggleAct(id, e) {
  e.stopPropagation();
  const f = ferts.find(x => x.id === id);
  if (!f) return;
  f.active = !f.active;
  saveFerts();
  renderFerts();
  toast(f.active ? 'Ativado' : 'Inativado');
}

function delProd(id) {
  if (!confirm('Excluir este produto?')) return;
  ferts = ferts.filter(f => f.id !== id);
  saveFerts();
  renderFerts();
  toast('Removido', 'er');
}

function dupProd(id) {
  const o = ferts.find(f => f.id === id);
  if (!o) return;
  const c = JSON.parse(JSON.stringify(o));
  c.id = uid();
  c.name += ' (cópia)';
  c.isSeed = false;
  c.source = 'manual';
  ferts.push(c);
  saveFerts();
  renderFerts();
  toast('Duplicado', 'ok');
}

function editProd(id) {
  const f = ferts.find(x => x.id === id);
  if (!f) return;
  editId = id;
  nuts = { ...f.nutrients };
  safeText('drw-prod-title', 'Editar Produto');
  if (g('p-nome')) g('p-nome').value = f.name || '';
  if (g('p-forn')) g('p-forn').value = f.supplier || '';
  if (g('p-entrega')) g('p-entrega').value = f.delivery || '';
  if (g('p-preco')) g('p-preco').value = f.priceTon || '';
  if (g('p-frete')) g('p-frete').value = f.freightTon || '';
  if (g('p-carga')) g('p-carga').value = f.minLoadTon || '';
  safeShow('nut-form', 'none');
  renderNutTags();
  openDrw('drw-prod');
}

function openAddProduct() {
  editId = null;
  nuts = {};
  safeText('drw-prod-title', 'Novo Produto');
  ['p-nome','p-forn','p-entrega','p-preco','p-frete','p-carga'].forEach(i => { if (g(i)) g(i).value = ''; });
  safeShow('nut-form', 'none');
  renderNutTags();
  openDrw('drw-prod');
}

function openDrw(id) { g(id)?.classList.add('on'); }
function closeDrw(id) { g(id)?.classList.remove('on'); }

function showNutForm() {
  safeShow('nut-form', 'block');
  if (g('nt-val')) { g('nt-val').value = ''; g('nt-val').focus(); }
}
function hideNutForm() { safeShow('nut-form', 'none'); }

function addNut() {
  const k = g('nt-sel')?.value;
  const v = parseFloat(g('nt-val')?.value);
  if (!k || isNaN(v) || v < 0 || v > 100) {
    toast('Teor inválido (0–100%)', 'er');
    return;
  }
  nuts[k] = v;
  hideNutForm();
  renderNutTags();
}

function removeNut(k) {
  delete nuts[k];
  renderNutTags();
}

function renderNutTags() {
  const ord = ['N','P2O5','K2O','S','B','Zn','Mg','Ca'];
  const keys = Object.keys(nuts).sort((a,b) => ord.indexOf(a) - ord.indexOf(b));
  const box = g('nut-tags');
  if (!box) return;
  box.innerHTML =
    keys.map(k => `<span class="nt">${fmtNK(k)} ${nuts[k]}%<span class="nt-x" onclick="removeNut('${k}')">×</span></span>`).join('')
    || '<span style="font-size:.74em;color:var(--txm)">Nenhum nutriente</span>';
}

function saveProd() {
  const name = (g('p-nome')?.value || '').trim();
  if (!name) { toast('Nome obrigatório', 'er'); return; }

  const p = {
    id: editId || uid(),
    active: true,
    status: Object.keys(nuts).length > 0 ? 'ok' : 'review',
    isSeed: false,
    source: 'manual',
    name,
    supplier: (g('p-forn')?.value || '').trim(),
    delivery: (g('p-entrega')?.value || '').trim(),
    priceTon: parseFloat(g('p-preco')?.value) || 0,
    freightTon: parseFloat(g('p-frete')?.value) || 0,
    minLoadTon: parseFloat(g('p-carga')?.value) || 0,
    nutrients: { ...nuts }
  };

  if (editId) {
    const i = ferts.findIndex(f => f.id === editId);
    ferts[i] = p;
    toast('Atualizado', 'ok');
  } else {
    ferts.push(p);
    toast('Adicionado', 'ok');
  }

  saveFerts();
  renderFerts();
  closeDrw('drw-prod');
  editId = null;
}

/* ===== PARSER IMPORTAÇÃO ===== */
function parseBRL(s) {
  if (!s) return 0;
  s = String(s).trim().replace(/R\$\s*/i, '').replace(/\s/g, '');
  if (s === '-' || !s) return 0;

  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  return parseFloat(s) || 0;
}

function parseNPK(name) {
  name = String(name || '').trim();
  const n = {};

  // KCL / KCl / Cloreto de Potássio
  if (/(^|\b)(KCL|KCl)\b|\bcloreto\b.*\bpot(á|a)ssio\b/i.test(name)) {
    const m =
      name.match(/(KCL|KCl)\s*(\d{1,2}(?:[.,]\d+)?)\s*%?/i) ||
      name.match(/\b(\d{1,2}(?:[.,]\d+)?)\s*%?\b/);
    n.K2O = m ? parseFloat(String(m[2] || m[1]).replace(',', '.')) : 60;
    return n;
  }

  // Ureia
  const ur = name.match(/UREIA\s*(\d{1,2}(?:[.,]\d+)?)\s*%?/i);
  if (ur) {
    n.N = parseFloat(String(ur[1]).replace(',', '.'));
    return n;
  }

  // MAP
  const map = name.match(/MAP\s*(\d{1,2}(?:[.,]\d+)?)\s*[-–]\s*(\d{1,2}(?:[.,]\d+)?)/i);
  if (map) {
    n.N = parseFloat(String(map[1]).replace(',', '.'));
    n.P2O5 = parseFloat(String(map[2]).replace(',', '.'));
    return n;
  }

  // TSP
  const tsp = name.match(/TSP\s*(\d{1,2}(?:[.,]\d+)?)/i);
  if (tsp) {
    n.P2O5 = parseFloat(String(tsp[1]).replace(',', '.'));
    return n;
  }

  // SSP
  const ssp = name.match(/SSP\s*(\d{1,2}(?:[.,]\d+)?)/i);
  if (ssp) {
    n.P2O5 = parseFloat(String(ssp[1]).replace(',', '.'));
    return n;
  }

  // SAM 20,5/23
  const sam = name.match(/SAM\s*([\d.,]+)\s*[/,]\s*([\d.,]+)/i);
  if (sam) {
    n.N = parseFloat(String(sam[1]).replace(',', '.'));
    n.S = parseFloat(String(sam[2]).replace(',', '.'));
    return n;
  }

  // Fórmula NPK padrão: 00-14-18 / 04-50-20 etc.
  const npk = name.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (npk) {
    n.N = parseInt(npk[1], 10);
    n.P2O5 = parseInt(npk[2], 10);
    n.K2O = parseInt(npk[3], 10);
    return n;
  }

  return null;
}

function parseLine(line, defF, defE, defFr) {
  line = String(line || '').trim();
  if (!line) return null;

  // NÃO quebrar por vírgula
  const ps = line.split(/[|;\t]/).map(s => s.trim()).filter(Boolean);

  let sup = '', name = '', del = '', price = 0, fr = defFr;

  if (ps.length >= 5) {
    sup = ps[0] || defF;
    name = ps[1];
    del = ps[2] || defE;
    const p3 = parseBRL(ps[3]), p4 = parseBRL(ps[4]);
    price = p3 > 0 ? p3 : p4;
  } else if (ps.length === 4) {
    sup = ps[0] || defF;
    name = ps[1];
    del = ps[2] || defE;
    price = parseBRL(ps[3]);
  } else if (ps.length === 3) {
    name = ps[0];
    del = ps[1] || defE;
    price = parseBRL(ps[2]);
    sup = defF;
  } else if (ps.length === 2) {
    name = ps[0];
    price = parseBRL(ps[1]);
    sup = defF;
    del = defE;
  } else {
    name = ps[0];
    sup = defF;
    del = defE;
  }

  if (!name) return null;
  const parsed = parseNPK(name);

  return {
    id: uid(),
    active: true,
    status: parsed && Object.keys(parsed).length > 0 ? 'ok' : 'review',
    isSeed: false,
    source: 'import',
    name: name.trim(),
    supplier: (sup || '').trim(),
    delivery: (del || '').trim(),
    priceTon: price,
    freightTon: fr,
    minLoadTon: 0,
    nutrients: parsed || {}
  };
}

function isDup(p) {
  return ferts.some(f =>
    (f.name || '').toLowerCase() === (p.name || '').toLowerCase() &&
    (f.supplier || '').toLowerCase() === (p.supplier || '').toLowerCase() &&
    (f.delivery || '').toLowerCase() === (p.delivery || '').toLowerCase()
  );
}

/* ===== IMPORT STEPS ===== */
function impGoStep(n) {
  [1,2,3].forEach(i => {
    const si = g('imp-s' + i);
    if (si) si.style.display = i === n ? 'block' : 'none';
    const d = g('sd-' + i);
    if (d) d.classList.toggle('done', i <= n);
  });
  const labels = ['', 'Etapa 1 de 3 — Cole a lista', 'Etapa 2 de 3 — Pré-visualização', 'Etapa 3 de 3 — Concluído'];
  safeText('imp-step-label', labels[n] || '');
}

function previsualizar() {
  const raw = (g('raw-input')?.value || '').trim();
  if (!raw) { toast('Cole alguma lista primeiro', 'er'); return; }

  const defF = (g('def-forn')?.value || '').trim();
  const defE = (g('def-entrega')?.value || '').trim();
  const defFr = parseFloat(g('def-frete')?.value) || 0;

  parsedImport = raw.split('\n').map(l => parseLine(l, defF, defE, defFr)).filter(Boolean);
  if (!parsedImport.length) { toast('Nenhuma linha válida', 'er'); return; }

  const dups = parsedImport.filter(p => isDup(p));
  const oks = parsedImport.filter(p => p.status === 'ok' && !isDup(p));
  const revs = parsedImport.filter(p => p.status === 'review');

  const st = g('imp-stats');
  if (st) {
    st.innerHTML = `
      <div class="stat"><div class="stat-n">${parsedImport.length}</div><div class="stat-l">Lidas</div></div>
      <div class="stat s-ok"><div class="stat-n">${oks.length}</div><div class="stat-l">OK</div></div>
      <div class="stat s-wn"><div class="stat-n">${revs.length}</div><div class="stat-l">Revisar</div></div>
      <div class="stat s-bl"><div class="stat-n">${dups.length}</div><div class="stat-l">Duplicadas</div></div>`;
  }

  safeShow('dup-section', dups.length ? 'block' : 'none');
  safeText('prev-label', parsedImport.length + ' produtos para importar');

  const pl = g('prev-list');
  if (pl) {
    pl.innerHTML = parsedImport.map(p => {
      const dup = isDup(p);
      const cls = dup ? 'p-dup' : p.status === 'review' ? 'p-rev' : 'p-ok';
      const badge = dup
        ? '<span class="mini-badge mb-dup">Dup</span>'
        : p.status === 'review'
          ? '<span class="mini-badge mb-rev">Revisar</span>'
          : '<span class="mini-badge mb-ok">OK</span>';
      const pr = p.priceTon ? 'R$ ' + p.priceTon.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/t' : '—';

      return `<div class="pcard ${cls}">
        <div class="p-info">
          <div class="p-name">${p.name}${badge}</div>
          <div class="p-nuts">${fmtN(p.nutrients)}</div>
          <div class="p-meta">${p.supplier || '—'} · ${p.delivery || '—'}</div>
        </div>
        <div class="p-price">${pr}</div>
      </div>`;
    }).join('');
  }

  impGoStep(2);
}

function importar() {
  const dupAct = document.querySelector('input[name="dup"]:checked')?.value || 'ignore';
  let added = 0, updated = 0, skipped = 0;

  parsedImport.forEach(p => {
    const di = ferts.findIndex(f =>
      (f.name || '').toLowerCase() === (p.name || '').toLowerCase() &&
      (f.supplier || '').toLowerCase() === (p.supplier || '').toLowerCase() &&
      (f.delivery || '').toLowerCase() === (p.delivery || '').toLowerCase()
    );

    if (di >= 0) {
      if (dupAct === 'ignore') {
        skipped++;
      } else if (dupAct === 'update') {
        ferts[di].priceTon = p.priceTon;
        ferts[di].freightTon = p.freightTon;
        ferts[di].nutrients = p.nutrients;
        ferts[di].status = p.status;
        ferts[di].isSeed = false;
        ferts[di].source = 'import';
        updated++;
      } else {
        ferts.push({ ...p, id: uid() });
        added++;
      }
    } else {
      ferts.push(p);
      added++;
    }
  });

  saveFerts();
  renderFerts();

  safeText('done-title', `${added + updated} produto${(added + updated) !== 1 ? 's' : ''} importado${(added + updated) !== 1 ? 's' : ''}`);
  safeText('done-sub', `${added} adicionado${added !== 1 ? 's' : ''}${updated ? ' · ' + updated + ' atualizado' + (updated !== 1 ? 's' : '') : ''}${skipped ? ' · ' + skipped + ' ignorado' + (skipped !== 1 ? 's' : '') : ''}`);

  toast(`${added + updated} importado${(added + updated) !== 1 ? 's' : ''}!`, 'ok');
  impGoStep(3);
}

function novaImport() {
  parsedImport = [];
  if (g('raw-input')) g('raw-input').value = '';
  impGoStep(1);
}

/* ===== LIMPEZA DE PRODUTOS DEMO ANTIGOS ===== */
function isLegacySeedProduct(f) {
  if (!f || typeof f !== 'object') return false;

  const legacyMarkers =
    !!f.createdAt &&
    !!f.updatedAt &&
    typeof f.micros === 'object';

  const supplierMatches =
    ['cibra', 'timac', 'motta fertilizantes'].includes((f.supplier || '').toLowerCase());

  return legacyMarkers && supplierMatches;
}

function purgeDemoProducts() {
  const before = ferts.length;
  ferts = ferts.filter(f =>
    !(f.isSeed === true || f.source === 'seed' || isLegacySeedProduct(f))
  );
  if (ferts.length !== before) {
    saveFerts();
    toast('Produtos demo antigos removidos', 'ok');
  }
}

/* ===== REGRAS PARA K2O MÁX. NA BASE ===== */
function isBaseFertilizer(prod) {
  return (prod?.nutrients?.P2O5 || 0) > 0;
}

function maxDoseByBaseK(prod, tgts) {
  const maxKBase = tgts.KBaseMax || 0;
  if (maxKBase <= 0) return Infinity;

  const k = prod?.nutrients?.K2O || 0;
  if (k <= 0) return Infinity;

  // dose máxima em kg/ha para não ultrapassar o K2O permitido na base
  return (maxKBase * 100) / k;
}

/* ===== SOLVER ===== */
function getValid() {
  return ferts.filter(f =>
    f.active &&
    f.status === 'ok' &&
    (f.priceTon || 0) > 0 &&
    Object.values(f.nutrients || {}).some(v => v > 0) &&
    (!REQUIRE_REAL_PRODUCTS || (!f.isSeed && f.source !== 'seed'))
  );
}

function combs(arr, k) {
  if (k === 1) return arr.map(x => [x]);
  const r = [];
  for (let i = 0; i < arr.length; i++) {
    combs(arr.slice(i + 1), k - 1).forEach(c => r.push([arr[i], ...c]));
  }
  return r;
}

function chooseDoseForProduct(p, active, rem, tgts) {
  const candidates = [];

  for (const n of active) {
    const t = p.nutrients[n] || 0;
    const r = rem[n] || 0;
    if (t > 0 && r > 0.01) {
      candidates.push(100 * r / t);
    }
  }

  if (!candidates.length) return 0;

  let bestDose = 0;
  let bestScore = Infinity;

  const isBase = isBaseFertilizer(p);
  const maxDoseBase = isBase ? maxDoseByBaseK(p, tgts) : Infinity;

  for (let dose of candidates) {
    if (isBase && dose > maxDoseBase) {
      dose = maxDoseBase;
    }

    let short = 0;
    let excess = 0;

    for (const n of active) {
      const meta = tgts[n] || 0;
      if (meta <= 0) continue;

      const del = (dose * (p.nutrients[n] || 0)) / 100;
      const newRem = Math.max(0, (rem[n] || 0) - del);
      const over = Math.max(0, del - (rem[n] || 0));

      short += newRem / meta;
      excess += over / meta;
    }

    // falta pesa muito mais que excesso
    const score = (short * short * 120) + (excess * excess * 12);

    if (score < bestScore) {
      bestScore = score;
      bestDose = dose;
    }
  }

  return bestDose;
}

function calcCombo(prods, tgts, area) {
  const NUTS = ['N', 'P2O5', 'K2O', 'S'];
  const active = NUTS.filter(n => (tgts[n] || 0) > 0);
  if (!active.length) return null;

  const sorted = [...prods].sort((a, b) => {
    const sa = active.reduce((s, n) => s + (a.nutrients[n] || 0), 0);
    const sb = active.reduce((s, n) => s + (b.nutrients[n] || 0), 0);
    return sb - sa;
  });

  const rem = {};
  active.forEach(n => rem[n] = tgts[n]);

  const doses = [];

  for (const p of sorted) {
    const dose = chooseDoseForProduct(p, active, rem, tgts);
    if (dose < 0.001) continue;

    const del = {};
    active.forEach(n => {
      del[n] = (dose * (p.nutrients[n] || 0)) / 100;
      rem[n] = Math.max(0, (rem[n] || 0) - del[n]);
    });

    const tonHa = dose / 1000;

    doses.push({
      prod: p,
      dose,
      tonHa,
      costHa: tonHa * (p.priceTon || 0),
      frHa: tonHa * (p.freightTon || 0),
      del,
      tonTotal: tonHa * area,
      costTotal: tonHa * (p.priceTon || 0) * area
    });
  }

  if (!doses.length) return null;

  const tCH = doses.reduce((s, d) => s + d.costHa, 0);
  const tFH = doses.reduce((s, d) => s + d.frHa, 0);
  const tT = doses.reduce((s, d) => s + d.tonTotal, 0);
  const tC = doses.reduce((s, d) => s + d.costTotal, 0);

  const finDel = {};
  active.forEach(n => {
    finDel[n] = doses.reduce((s, d) => s + (d.del[n] || 0), 0);
  });

  // valida K2O máximo vindo da base
  const maxKBase = tgts.KBaseMax || 0;
  if (maxKBase > 0) {
    let baseKDelivered = 0;

    doses.forEach(d => {
      if (isBaseFertilizer(d.prod)) {
        baseKDelivered += d.del.K2O || 0;
      }
    });

    if (baseKDelivered > maxKBase + ABS_TOL_KGHA) {
      return null;
    }
  }

  let short = 0, excess = 0, errAbs = 0;
  active.forEach(n => {
    const meta = tgts[n] || 0;
    const del = finDel[n] || 0;
    if (meta <= 0) return;
    const diff = del - meta;
    if (diff < 0) short += Math.abs(diff) / meta;
    else excess += diff / meta;
    errAbs += Math.abs(diff) / meta;
  });

  short /= active.length;
  excess /= active.length;
  const err = errAbs / active.length;

  const sob = active.reduce((s, n) => s + Math.max(0, (finDel[n] || 0) - (tgts[n] || 0)), 0);

  // exige cobertura mínima
  for (const n of active) {
    const meta = tgts[n] || 0;
    const del = finDel[n] || 0;
    if (meta <= 0) continue;
    if (del < (meta * MIN_COVERAGE - ABS_TOL_KGHA)) return null;
  }

  return { doses, tCH, tFH, tT, tC, err, short, excess, sob, finDel, active, area };
}

function scoreC(c, cr) {
  const wShort = 12000;
  const wExcess = 3000;
  const wProd = 20;
  const wCost = 0.08;
  const wFreight = 0.04;

  switch (cr) {
    case 'cost':
      return c.tCH * 0.75 + c.short * wShort + c.excess * (wExcess * 0.7) + c.doses.length * wProd;
    case 'freight':
      return c.tFH * 0.75 + c.short * wShort + c.excess * (wExcess * 0.7) + c.tCH * 0.10 + c.doses.length * wProd;
    case 'error':
      return c.short * wShort + c.excess * wExcess + c.tCH * 0.10 + c.doses.length * wProd;
    case 'ton':
      return c.tT * 0.60 + c.short * wShort + c.excess * (wExcess * 0.5) + c.tCH * 0.05;
    default: // balanced
      return c.short * wShort + c.excess * wExcess + c.doses.length * wProd + c.tCH * wCost + c.tFH * wFreight;
  }
}

function sMax(n) {
  mxP = n;
  document.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', +b.dataset.m === n));
}
function sShow(n) {
  shN = n;
  document.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
}
function setCrit(cr) {
  currentCrit = cr;
  document.querySelectorAll('.ctab').forEach(b => b.classList.toggle('on', b.dataset.c === cr));
  if (lastResults) {
    const s = [...lastResults].sort((a, b) => scoreC(a, cr) - scoreC(b, cr));
    renderCards(s.slice(0, shN), lastTgts, cr);
  }
}

function run() {
  const area = parseFloat(g('fa')?.value) || 0;
  if (!area) { toast('Informe a área', 'er'); return; }

  const tgts = {
    N: parseFloat(g('fn')?.value) || 0,
    P2O5: parseFloat(g('fp')?.value) || 0,
    K2O: parseFloat(g('fk')?.value) || 0,
    S: parseFloat(g('fs')?.value) || 0,
    KBaseMax: parseFloat(g('fkbase')?.value) || 0
  };

  if (!Object.values({ N: tgts.N, P2O5: tgts.P2O5, K2O: tgts.K2O, S: tgts.S }).some(v => v > 0)) {
    toast('Defina ao menos uma meta', 'er');
    return;
  }

  const v = getValid();
  if (!v.length) {
    toast('Nenhum produto válido', 'er');
    return;
  }

  const all = [];
  for (let k = 1; k <= Math.min(mxP, v.length, MAX_K_COMB); k++) {
    combs(v, k).forEach(ps => {
      const r = calcCombo(ps, tgts, area);
      if (r) all.push(r);
    });
  }

  if (!all.length) {
    toast('Não foi possível calcular com os produtos disponíveis', 'er');
    return;
  }

  all.sort((a, b) => scoreC(a, currentCrit) - scoreC(b, currentCrit));

  lastResults = all;
  lastTgts = tgts;
  chatHistory = {};

  safeShow('emp-calc', 'none');
  safeShow('res-cards', 'block');
  renderCards(all.slice(0, shN), tgts, currentCrit);
  toast('Cálculo concluído!', 'ok');
}

/* ===== UI RESULTADOS ===== */
const CRL = {
  balanced: 'Balanceado',
  cost: 'Menor custo',
  freight: 'Menor frete',
  error: 'Menor erro',
  ton: 'Menor tonelada'
};
const RKL = ['1ª','2ª','3ª'];

function renderCards(rs, tgts, cr) {
  const rc = g('res-cards');
  if (rc) rc.innerHTML = rs.map((r, i) => buildCard(r, i, tgts, cr)).join('');
}

function buildCard(r, i, tgts, cr) {
  const win = i === 0;

  const nutHTML = r.active.map(n => {
    const meta = tgts[n] || 0;
    const del = r.finDel[n] || 0;
    const pct = meta > 0 ? Math.min(130, del / meta * 100) : 0;
    const diff = del - meta;
    const ok = Math.abs(diff) < 0.5;
    const ov = diff > 0.5;

    return `<div class="nb-row">
      <span class="nb-name">${fmtNK(n)}</span>
      <div class="nb-mid">
        <div class="nb-track">
          <div class="nb-fill${ok ? '' : ov ? ' ov' : ' sh'}" style="width:${Math.min(100, pct)}%"></div>
        </div>
        <div class="nb-vals">
          <span>${nd(meta, 0)} meta</span>
          <span>${nd(del, 1)} entregue</span>
        </div>
      </div>
      <span class="nb-bdg ${ok ? 'b-ok' : ov ? 'b-ov' : 'b-sh'}">${ok ? 'OK' : ov ? '+' + nd(diff, 1) + ' kg' : nd(diff, 1) + ' kg'}</span>
    </div>`;
  }).join('');

  const prHTML = r.doses.map(d => `
    <div class="rp-item">
      <div class="rpn">${d.prod.name}<span class="rp-sup">${d.prod.supplier || ''} · ${d.prod.delivery || ''}</span></div>
      <div class="rr"><span class="rl">Dose</span><span class="rv-bl">${nd(d.dose, 1)} kg/ha</span></div>
      <div class="rr"><span class="rl">Total (${r.area} ha)</span><span class="rv">${nd(d.tonTotal, 2)} t</span></div>
      <div class="rr"><span class="rl">Custo/ha</span><span class="rv">${brl(d.costHa)}</span></div>
      <div class="rr"><span class="rl">Custo total</span><span class="rv">${brl(d.costTotal)}</span></div>
      ${d.frHa > 0 ? `<div class="rr"><span class="rl">Frete/ha</span><span class="rv">${brl(d.frHa)}</span></div>` : ''}
      <div class="nut-pills">
        ${r.active
          .filter(n => (d.del[n] || 0) > 0.01)
          .map(n => `<span class="np">${fmtNK(n)} ${nd(d.del[n] || 0, 1)} kg/ha</span>`)
          .join('')}
      </div>
    </div>
  `).join('');

  const qPrompts = [
    'Por que esta combinação foi escolhida?',
    'Qual a vantagem do custo?',
    'Há risco de excesso nutricional?',
    'Como interpretar a sobra/falta?',
    'Vale trocar por outro produto?'
  ];

  const iaHTML = `<div class="ia-panel">
    <div class="ia-hdr" onclick="toggleIA(${i})">
      <div class="ia-ico">🤖</div>
      <div class="ia-title">Explicar com IA</div>
      <div class="ia-st" id="ia-st-${i}">${getKey() ? 'Pronta' : 'Sem chave'}</div>
      <div class="ia-arr" id="ia-arr-${i}">▼</div>
    </div>
    <div class="ia-body" id="ia-body-${i}">
      <div class="quick-prompts">
        ${qPrompts.map(q => `<button class="qp" onclick="askAI('${q.replace(/'/g, "\\'")}',${i})">${q}</button>`).join('')}
      </div>
      <div class="ia-chat" id="chat-${i}">
        <div class="msg msg-a">Analisarei a combinação ${i + 1}. Escolha uma pergunta ou escreva.</div>
      </div>
      <div style="padding:7px 11px;border-top:1px solid var(--bd);display:flex;gap:5px">
        <input class="inp" id="ia-inp-${i}" placeholder="Sua pergunta..." style="flex:1;font-size:.79em" onkeydown="if(event.key==='Enter')sendMsg(${i})">
        <button class="btn-xs save-btn" onclick="sendMsg(${i})">Enviar</button>
      </div>
      <div class="ia-disc">IA explica — não calcula. Baseada apenas nos dados acima.</div>
    </div>
  </div>`;

  return `<div class="${win ? 'rc-win' : 'rc'}" style="margin-bottom:12px">
    ${win ? '<div class="ribbon">Melhor opção</div>' : ''}
    <div class="${win ? 'rh rh-w' : i === 1 ? 'rh rh-2' : 'rh rh-3'}">
      <div class="${win ? 'rk rk-w' : i === 1 ? 'rk rk-2' : 'rk rk-3'}">${RKL[i] || ''}</div>
      <div class="${win ? 'rht rht-w' : i === 1 ? 'rht rht-2' : 'rht rht-3'}">${r.doses.map(d => d.prod.name).join(' + ')}</div>
      <div class="${win ? 'rbg rbg-w' : 'rbg rbg-2'}">${CRL[cr]}</div>
    </div>
    ${prHTML}
    <div class="rs">
      <div style="font-size:.6em;font-weight:600;color:var(--txm);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Resumo</div>
      <div class="sg">
        <div class="ss"><div class="sn">${brl(r.tCH)}</div><div class="sl2">Custo/ha</div></div>
        <div class="ss"><div class="sn">${nd(r.tT, 2)} t</div><div class="sl2">Total área</div></div>
        <div class="ss"><div class="sn">${brl(r.tC)}</div><div class="sl2">Custo total</div></div>
        <div class="ss"><div class="sn">${brl(r.tFH)}</div><div class="sl2">Frete/ha</div></div>
      </div>

      <div style="font-size:.6em;font-weight:600;color:var(--txm);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">Balanço nutricional</div>
      ${nutHTML}

      <div style="margin-top:10px;font-size:.65em;color:var(--txm)">
        <b>Indicadores:</b> Falta(rel): ${nd(r.short * 100, 1)}% · Excesso(rel): ${nd(r.excess * 100, 1)}%
      </div>

      ${tgts.KBaseMax > 0 ? `
      <div style="margin-top:6px;font-size:.65em;color:var(--txm)">
        <b>K₂O máx. na base:</b> ${nd(tgts.KBaseMax, 1)} kg/ha
      </div>` : ''}
    </div>
    ${iaHTML}
  </div>`;
}

/* ===== IA ===== */
function buildCtx() {
  if (!lastResults || !lastTgts) return '';
  const cult = g('fc')?.value;
  const area = g('fa')?.value;

  const lines = [
    `Cultura: ${cult} | Área: ${area} ha | Critério: ${CRL[currentCrit]}`,
    `Metas (kg/ha): N=${lastTgts.N || 0} P₂O₅=${lastTgts.P2O5 || 0} K₂O=${lastTgts.K2O || 0} S=${lastTgts.S || 0} K₂O máx. base=${lastTgts.KBaseMax || 0}`,
    ''
  ];

  lastResults.slice(0, shN).forEach((r, i) => {
    lines.push(`--- Combinação ${i + 1} ${i === 0 ? '(MELHOR)' : ''} ---`);
    r.doses.forEach(d => {
      lines.push(`${d.prod.name} | ${fmtN(d.prod.nutrients)} | R$ ${d.prod.priceTon}/t`);
      lines.push(`  Dose: ${nd(d.dose, 1)} kg/ha | Total: ${nd(d.tonTotal, 2)} t | Custo/ha: ${brl(d.costHa)}`);
    });
    lines.push(`Custo/ha: ${brl(r.tCH)} | Total: ${nd(r.tT, 2)} t | Total R$: ${brl(r.tC)}`);
    r.active.forEach(n => {
      const m = lastTgts[n];
      const d = r.finDel[n] || 0;
      const diff = d - m;
      lines.push(`${fmtNK(n)}: meta ${m} → entregue ${nd(d, 1)} [${Math.abs(diff) < 0.5 ? 'OK' : diff > 0 ? 'SOBRA ' + nd(diff, 1) : 'FALTA ' + nd(Math.abs(diff), 1)} kg/ha]`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

function toggleIA(i) {
  const b = g('ia-body-' + i);
  const a = g('ia-arr-' + i);
  if (!b) return;
  const o = b.classList.toggle('open');
  if (a) a.classList.toggle('open', o);
}

function sendMsg(i) {
  const inp = g('ia-inp-' + i);
  const q = (inp?.value || '').trim();
  if (!q) return;
  if (inp) inp.value = '';
  askAI(q, i);
}

async function askAI(question, cardIdx) {
  const key = getKey();
  const chatEl = g('chat-' + cardIdx);
  if (!chatEl) return;

  if (!chatHistory[cardIdx]) chatHistory[cardIdx] = [];
  chatHistory[cardIdx].push({ role: 'user', content: question });

  chatEl.innerHTML += `<div class="msg msg-u">${escH(question)}</div>`;
  const tid = 'tk-' + Date.now();
  chatEl.innerHTML += `<div class="msg msg-a thinking" id="${tid}">Analisando...</div>`;
  chatEl.scrollTop = chatEl.scrollHeight;

  if (!key) {
    const el = document.getElementById(tid);
    if (el) {
      el.textContent = '⚠ Configure a API Key no cabeçalho. Chave gratuita em openrouter.ai/keys';
      el.classList.remove('thinking');
    }
    return;
  }

  const sys =
    `Você é um agrônomo especialista em fertilização do Cerrado brasileiro.\n\n` +
    `Dados do resultado:\n${buildCtx()}\n\n` +
    `REGRAS ABSOLUTAS:\n` +
    `1. NUNCA recalcule valores — os números acima são a fonte da verdade\n` +
    `2. NUNCA invente produtos, nutrientes ou dados externos\n` +
    `3. SÓ explique, justifique e analise com base nos dados fornecidos\n` +
    `4. Resposta em português, objetiva, máximo 180 palavras\n` +
    `5. Recuse gentilmente perguntas fora do escopo agronômico`;

  const msgs = [{ role: 'system', content: sys }, ...(chatHistory[cardIdx] || []).slice(-6)];

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': 'https://soloforte.app',
        'X-Title': 'FertiCalc SoloForte'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        temperature: 0.2,
        max_tokens: 300,
        messages: msgs
      })
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || ('Erro ' + res.status));
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || 'Sem resposta.';
    chatHistory[cardIdx].push({ role: 'assistant', content: reply });

    const el = document.getElementById(tid);
    if (el) {
      el.textContent = reply;
      el.classList.remove('thinking');
    }

    chatEl.scrollTop = chatEl.scrollHeight;
  } catch (e) {
    const el = document.getElementById(tid);
    if (el) {
      el.textContent = '⚠ ' + e.message;
      el.classList.remove('thinking');
    }
  }
}

/* ===== MOBILE TAB NAVIGATION ===== */
const isMob = () => window.innerWidth <= 700;

function mobTab(tab) {
  if (!isMob()) return;

  ['prod','calc','res','imp'].forEach(t => g('tab-' + t)?.classList.toggle('on', t === tab));

  g('lp')?.classList.remove('mob-active');
  g('rp')?.classList.remove('mob-active');

  const fab = g('fab-add');
  if (fab) fab.style.display = tab === 'prod' ? 'flex' : 'none';

  if (tab === 'prod') {
    g('lp')?.classList.add('mob-active');
    safeText('hdr-title', 'Fertilizantes');

  } else if (tab === 'calc') {
    g('rp')?.classList.add('mob-active');
    showView('view-calc');
    safeText('hdr-title', 'Calcular');
    safeShow('emp-calc', 'flex');
    safeShow('res-cards', 'none');

  } else if (tab === 'res') {
    g('rp')?.classList.add('mob-active');
    showView('view-calc');
    safeText('hdr-title', 'Resultado');

    if (lastResults) {
      safeShow('emp-calc', 'none');
      safeShow('res-cards', 'block');
    } else {
      safeShow('emp-calc', 'flex');
    }

    safeShow('tab-res-badge', 'none');

  } else if (tab === 'imp') {
    g('rp')?.classList.add('mob-active');
    showView('view-import');
    safeText('hdr-title', 'Importar');
    impGoStep(1);
  }
}

function initMob() {
  if (!isMob()) return;
  safeShow('key-status-wrap', 'none');
  mobTab('prod');
}

// intercepta run() no mobile
const _runOrig = run;
window.run = function () {
  _runOrig();
  if (isMob() && lastResults) {
    safeShow('tab-res-badge', 'flex');
    setTimeout(() => mobTab('res'), 300);
  }
};

window.addEventListener('resize', () => {
  if (!isMob()) {
    g('lp')?.classList.remove('mob-active');
    g('rp')?.classList.remove('mob-active');
    if (g('lp')) g('lp').style.display = '';
    if (g('rp')) g('rp').style.display = '';
    safeShow('fab-add', 'none');
  } else {
    initMob();
  }
});

/* ===== SEED DESATIVADO ===== */
function seedIfEmpty() {
  if (!ENABLE_SEED) return;
  if (ferts.length > 0) return;
}

/* ===== INIT ===== */
document.addEventListener('input', e => {
  if (e.target?.type === 'number' && e.target.value.length > 7) {
    e.target.value = e.target.value.slice(0, 7);
  }
});

updateKeyStatus();
purgeDemoProducts(); // remove demos antigos
seedIfEmpty();       // desativado
renderFerts();
initMob();

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
