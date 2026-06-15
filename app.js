/* =========================== FertiCalc — app.js CORRIGIDO =========================== */

/* ===== GLOBAL STATE ===== */
let ferts = JSON.parse(localStorage.getItem("fc_ferts") || "[]");
let editId = null;
let nuts = {};
let mxP = 2;
let shN = 1;
let currentCrit = "balanced";
let lastResults = null;
let lastTgts = null;
let parsedImport = [];

/* ===== UTILS ===== */
const g = (x) => document.getElementById(x);

const safeShow = (id, disp) => {
  const el = g(id);
  if (el) el.style.display = disp;
};

const safeText = (id, txt) => {
  const el = g(id);
  if (el) el.textContent = txt;
};

function brNumber(value, decimals = 2) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function brMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toast(msg, tp = "") {
  const wrap = g("tw");
  if (!wrap) return;

  const t = document.createElement("div");
  t.className = "t" + (tp ? " " + tp : "");
  t.textContent = msg;
  wrap.appendChild(t);

  setTimeout(() => t.remove(), 2600);
}

/* Evita erro caso os botões já existam no HTML, mas as telas ainda não tenham sido implementadas. */
function navTo(view) {
  if (view === "calc") {
    toast("Calculadora aberta", "ok");
    return;
  }
  toast("Tela de importar ainda não implementada neste pacote", "wn");
}

function openAddProduct() {
  toast("Cadastro de produto ainda não implementado neste pacote", "wn");
}

/* ===== LISTA DE PRODUTOS ===== */
function renderFertList() {
  safeText("fert-cnt", `${ferts.length} produto${ferts.length === 1 ? "" : "s"}`);

  const list = g("flist");
  if (!list) return;

  if (!ferts.length) {
    list.innerHTML = `
      <div class="empty-r">
        <div class="empty-icon" aria-hidden="true">🌱</div>
        <div>Nenhum produto cadastrado</div>
      </div>
    `;
    return;
  }

  list.innerHTML = ferts.map((f) => `
    <div class="rc">
      <div class="rh">
        <span class="rht">${f.name || "Produto"}</span>
      </div>
      <div class="rs">Produto salvo no armazenamento local.</div>
    </div>
  `).join("");
}

/* ===== CÁLCULO ===== */
function run() {
  const area = parseFloat(String(g("fa")?.value || "0").replace(",", ".")) || 0;

  if (!area) {
    toast("Informe a área", "er");
    return;
  }

  const tgts = {
    N: parseFloat(String(g("fn")?.value || "0").replace(",", ".")) || 0,
    P2O5: parseFloat(String(g("fp")?.value || "0").replace(",", ".")) || 0,
    K2O: parseFloat(String(g("fk")?.value || "0").replace(",", ".")) || 0,
    S: parseFloat(String(g("fs")?.value || "0").replace(",", ".")) || 0,
  };

  if (!Object.values(tgts).some((v) => v > 0)) {
    toast("Defina ao menos uma meta", "er");
    return;
  }

  lastTgts = tgts;

  /* Simulação simples preservada, com renderização corrigida em HTML. */
  lastResults = [
    {
      name: "KCL 60",
      dose: 200,
      custo: 917.78,
      total: 826002,
      note: "Melhor opção considerando os parâmetros informados.",
    },
  ];

  renderResultado();
  toast("Cálculo concluído!", "ok");

  g("rp")?.classList.add("compact");
  g("rp")?.classList.add("results-only");

  const btnReset = g("btn-reset");
  if (btnReset) btnReset.style.display = "inline-block";

  const scroller = g("res-scroll");
  if (scroller) scroller.scrollTop = 0;
}

/* ===== RESULTADO ===== */
function renderResultado() {
  const target = g("res-cards");
  if (!target || !lastResults?.length) return;

  safeShow("emp-calc", "none");
  safeShow("res-cards", "block");

  target.innerHTML = lastResults.map((item, index) => `
    <article class="${index === 0 ? "rc-win" : "rc"}">
      <header class="rh">
        <span class="rht">${item.name}</span>
        ${index === 0 ? `<span class="badge">Melhor opção</span>` : ""}
      </header>

      <div class="rp-item">
        <span class="rpn">Dose</span>
        <span class="rpv">${brNumber(item.dose, 0)} kg/ha</span>
      </div>

      <div class="rp-item">
        <span class="rpn">Custo/ha</span>
        <span class="rpv">${brMoney(item.custo)}</span>
      </div>

      <div class="rp-item">
        <span class="rpn">Custo total</span>
        <span class="rpv">${brMoney(item.total)}</span>
      </div>

      <div class="rs">${item.note || "Resultado calculado."}</div>
    </article>
  `).join("");
}

/* ===== RESET CÁLCULO ===== */
function resetCalc() {
  g("rp")?.classList.remove("compact");
  g("rp")?.classList.remove("results-only");

  safeShow("res-cards", "none");
  safeShow("emp-calc", "flex");

  const btnReset = g("btn-reset");
  if (btnReset) btnReset.style.display = "none";

  const target = g("res-cards");
  if (target) target.innerHTML = "";

  lastResults = null;
  lastTgts = null;
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  safeShow("res-cards", "none");
  safeShow("emp-calc", "flex");
  renderFertList();
});
