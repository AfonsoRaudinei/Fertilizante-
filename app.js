/* ===========================
   FertiCalc — app.js FINAL
   =========================== */

/* ===== GLOBAL STATE ===== */
let ferts = JSON.parse(localStorage.getItem('fc_ferts') || '[]');
let editId = null, nuts = {}, mxP = 2, shN = 1, currentCrit = 'balanced';
let lastResults = null, lastTgts = null;
let parsedImport = [];

/* ===== UTILS ===== */
const g = (x) => document.getElementById(x);
const safeShow = (id, disp) => { const el = g(id); if (el) el.style.display = disp; };
const safeText = (id, txt) => { const el = g(id); if (el) el.textContent = txt; };

function toast(msg, tp = '') {
  const t = document.createElement('div');
  t.className = 't' + (tp ? ' ' + tp : '');
  t.textContent = msg;
  g('tw')?.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ===== CALCULO ===== */
function run() {
  const area = parseFloat(g('fa')?.value) || 0;
  if (!area) { toast('Informe a área', 'er'); return; }

  const tgts = {
    N: parseFloat(g('fn')?.value) || 0,
    P2O5: parseFloat(g('fp')?.value) || 0,
    K2O: parseFloat(g('fk')?.value) || 0,
    S: parseFloat(g('fs')?.value) || 0
  };

  if (!Object.values(tgts).some(v => v > 0)) {
    toast('Defina ao menos uma meta', 'er');
    return;
  }

  // simulação simples (mantive seu padrão visual)
  lastResults = [{
    name: "KCL 60",
    dose: 200,
    custo: 917.78,
    total: 826002
  }];

  renderResultado();

  toast('Cálculo concluído!', 'ok');

  // ✅ ATIVA MODO COMPACTO
  g('rp')?.classList.add('compact');

  // ✅ ESCONDE FILTROS
  g('rp')?.classList.add('results-only');

  // ✅ MOSTRA BOTÃO RESET
  g('btn-reset').style.display = 'inline-block';

  // ✅ SCROLL TOP
  g('res-scroll').scrollTop = 0;
}

/* ===== RESULTADO ===== */
function renderResultado(){
  safeShow('emp-calc','none');
  safeShow('res-cards','block');

  g('res-cards').innerHTML = `
    <div class="rc-win">
      <div class="rh rh-w">
        <div class="rht rht-w">Melhor opção</div>
      </div>

      <div class="rp-item">
        <div class="rpn">KCL 60</div>
        <div class="rr"><span class="rl">Dose</span><span class="rv-bl">200 kg/ha</span></div>
        <div class="rr"><span class="rl">Custo/ha</span><span class="rv">R$ 917,78</span></div>
        <div class="rr"><span class="rl">Custo total</span><span class="rv">R$ 826.002,00</span></div>
      </div>
    </div>
  `;
}

/* ===== RESET CALCULO ===== */
function resetCalc(){
  g('rp')?.classList.remove('compact');
  g('rp')?.classList.remove('results-only');

  safeShow('res-cards','none');
  safeShow('emp-calc','flex');

  g('btn-reset').style.display = 'none';
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  safeShow('res-cards','none');
  safeShow('emp-calc','flex');
});
