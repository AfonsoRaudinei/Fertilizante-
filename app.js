/* =========================== FertiCalc — app.js COMPLETO =========================== */
const STORAGE_KEY = "fc_ferts_v2";
let ferts = [];
let lastResults = null;
let lastTgts = null;
const g = (x) => document.getElementById(x);
const safeShow = (id, disp) => { const el = g(id); if (el) el.style.display = disp; };
const safeText = (id, txt) => { const el = g(id); if (el) el.textContent = txt; };
function uid() { return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }
function parseNum(v) { if (v === null || v === undefined) return 0; return parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0; }
function brNumber(value, decimals = 2) { return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
function brMoney(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function toast(msg, tp = "") { const wrap = g("tw"); if (!wrap) return; const t = document.createElement("div"); t.className = "t" + (tp ? " " + tp : ""); t.textContent = msg; wrap.appendChild(t); setTimeout(() => t.remove(), 2800); }
function loadProducts() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); ferts = Array.isArray(saved) ? saved : []; } catch { ferts = []; }
  if (!ferts.length) {
    ferts = [
      { id: uid(), name: "KCL 60", price: 4588.90, N: 0, P2O5: 0, K2O: 60, S: 0, note: "Cloreto de potássio" },
      { id: uid(), name: "MAP 11-52", price: 5200.00, N: 11, P2O5: 52, K2O: 0, S: 0, note: "Fosfatado" },
      { id: uid(), name: "Ureia 45", price: 3200.00, N: 45, P2O5: 0, K2O: 0, S: 0, note: "Nitrogenado" }
    ];
    saveProducts(false);
  }
}
function saveProducts(showToast = true) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ferts)); renderFertList(); if (showToast) toast("Produto salvo", "ok"); }
function renderFertList() {
  safeText("fert-cnt", `${ferts.length} produto${ferts.length === 1 ? "" : "s"}`);
  const list = g("flist"); if (!list) return;
  if (!ferts.length) {
    list.innerHTML = `<div class="empty-r"><div class="empty-icon" aria-hidden="true">🌱</div><div>Nenhum produto cadastrado</div><small>Clique em “+ Novo Produto” para cadastrar.</small></div>`;
    return;
  }
  list.innerHTML = ferts.map((f) => `<article class="prod-card"><header class="rh"><span class="rht">${escapeHtml(f.name)}</span><span class="badge">${brMoney(f.price)}/t</span></header><div class="prod-grid">${nutPill("N", f.N)}${nutPill("P₂O₅", f.P2O5)}${nutPill("K₂O", f.K2O)}${nutPill("S", f.S)}${nutPill("R$/kg", (f.price || 0) / 1000, 2, true)}</div>${f.note ? `<div class="rs">${escapeHtml(f.note)}</div>` : ""}<div class="prod-actions"><button class="btn-outline" type="button" onclick="editProduct('${f.id}')">Editar</button><button class="btn-danger" type="button" onclick="deleteProduct('${f.id}')">Excluir</button></div></article>`).join("");
}
function nutPill(label, value, decimals = 1, money = false) { return `<div class="nut-pill"><span>${label}</span><strong>${money ? brMoney(value) : brNumber(value, decimals) + "%"}</strong></div>`; }
function escapeHtml(text) { return String(text ?? "").replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[ch])); }
function openAddProduct() { g("modalTitle").textContent = "Novo produto"; g("productForm").reset(); g("prodId").value = ""; g("prodN").value = "0"; g("prodP").value = "0"; g("prodK").value = "0"; g("prodS").value = "0"; openProductModal(); }
function openProductModal() { const modal = g("productModal"); if (modal?.showModal) modal.showModal(); else modal.setAttribute("open", "open"); }
function closeProductModal() { const modal = g("productModal"); if (modal?.close) modal.close(); else modal.removeAttribute("open"); }
function editProduct(id) { const f = ferts.find((x) => x.id === id); if (!f) return; g("modalTitle").textContent = "Editar produto"; g("prodId").value = f.id; g("prodName").value = f.name || ""; g("prodPrice").value = String(f.price || 0).replace(".", ","); g("prodNote").value = f.note || ""; g("prodN").value = String(f.N || 0).replace(".", ","); g("prodP").value = String(f.P2O5 || 0).replace(".", ","); g("prodK").value = String(f.K2O || 0).replace(".", ","); g("prodS").value = String(f.S || 0).replace(".", ","); openProductModal(); }
function deleteProduct(id) { const f = ferts.find((x) => x.id === id); if (!f) return; const ok = confirm(`Excluir o produto "${f.name}"?`); if (!ok) return; ferts = ferts.filter((x) => x.id !== id); saveProducts(false); toast("Produto excluído", "ok"); resetCalc(false); }
function handleProductSubmit(event) {
  event.preventDefault();
  const id = g("prodId").value || uid();
  const product = { id, name: g("prodName").value.trim(), price: parseNum(g("prodPrice").value), note: g("prodNote").value.trim(), N: parseNum(g("prodN").value), P2O5: parseNum(g("prodP").value), K2O: parseNum(g("prodK").value), S: parseNum(g("prodS").value) };
  if (!product.name) return toast("Informe o nome do produto", "er");
  if (product.price <= 0) return toast("Informe o preço em R$/t", "er");
  if (![product.N, product.P2O5, product.K2O, product.S].some((v) => v > 0)) return toast("Informe ao menos um nutriente maior que zero", "er");
  const idx = ferts.findIndex((x) => x.id === id); if (idx >= 0) ferts[idx] = product; else ferts.unshift(product);
  closeProductModal(); saveProducts(true); resetCalc(false);
}
function getTargets() { return { N: parseNum(g("fn")?.value), P2O5: parseNum(g("fp")?.value), K2O: parseNum(g("fk")?.value), S: parseNum(g("fs")?.value) }; }
function calculateForProduct(f, tgts, area) {
  const nutrients = ["N", "P2O5", "K2O", "S"]; let dose = 0; const missing = [];
  for (const n of nutrients) { const target = tgts[n] || 0; const percent = f[n] || 0; if (target > 0) { if (percent <= 0) missing.push(n); else dose = Math.max(dose, target / (percent / 100)); } }
  const delivered = {}; for (const n of nutrients) delivered[n] = dose * ((f[n] || 0) / 100);
  const costHa = dose * ((f.price || 0) / 1000); const total = costHa * area;
  return { ...f, dose, costHa, total, delivered, missing, atende: missing.length === 0 && dose > 0 };
}
function run() {
  const area = parseNum(g("fa")?.value); if (!area) return toast("Informe a área", "er"); if (!ferts.length) return toast("Cadastre ao menos um produto", "er");
  const tgts = getTargets(); if (!Object.values(tgts).some((v) => v > 0)) return toast("Defina ao menos uma meta nutricional", "er");
  lastTgts = tgts; lastResults = ferts.map((f) => calculateForProduct(f, tgts, area));
  lastResults.sort((a, b) => { if (a.atende !== b.atende) return a.atende ? -1 : 1; return a.costHa - b.costHa; });
  renderResultado(area); toast("Cálculo concluído", "ok"); g("rp")?.classList.add("compact", "results-only"); const btnReset = g("btn-reset"); if (btnReset) btnReset.style.display = "inline-block"; const scroller = g("res-scroll"); if (scroller) scroller.scrollTop = 0;
}
function renderResultado(area) {
  const target = g("res-cards"); if (!target || !lastResults?.length) return; safeShow("emp-calc", "none"); safeShow("res-cards", "block");
  target.innerHTML = `<div class="rs" style="margin-bottom:8px;border-radius:12px;border:1px solid var(--bd);">Área: <strong>${brNumber(area, 2)} ha</strong> · Metas kg/ha: N ${brNumber(lastTgts.N,1)}, P₂O₅ ${brNumber(lastTgts.P2O5,1)}, K₂O ${brNumber(lastTgts.K2O,1)}, S ${brNumber(lastTgts.S,1)}</div>${lastResults.map((item, index) => resultCard(item, index)).join("")}`;
}
function resultCard(item, index) {
  const firstValid = index === 0 && item.atende; const missingText = item.missing.length ? `Não atende sozinho: falta ${item.missing.join(", ")}.` : "Atende as metas informadas considerando aplicação isolada.";
  return `<article class="${firstValid ? "rc-win" : "rc"}"><header class="rh"><span class="rht">${escapeHtml(item.name)}</span>${firstValid ? `<span class="badge">Melhor opção</span>` : item.atende ? `<span class="badge">Atende</span>` : `<span class="badge warn">Parcial</span>`}</header><div class="rp-item"><span class="rpn">Dose calculada</span><span class="rpv">${item.atende ? brNumber(item.dose, 0) + " kg/ha" : "—"}</span></div><div class="rp-item"><span class="rpn">Custo/ha</span><span class="rpv">${item.atende ? brMoney(item.costHa) : "—"}</span></div><div class="rp-item"><span class="rpn">Custo total</span><span class="rpv">${item.atende ? brMoney(item.total) : "—"}</span></div><div class="prod-grid">${nutPill("N entregue", item.delivered.N, 1)}${nutPill("P₂O₅ entregue", item.delivered.P2O5, 1)}${nutPill("K₂O entregue", item.delivered.K2O, 1)}${nutPill("S entregue", item.delivered.S, 1)}${nutPill("Preço", item.price, 0, true)}</div><div class="rs">${missingText}${item.note ? " · " + escapeHtml(item.note) : ""}</div></article>`;
}
function resetCalc(clearMessage = true) { g("rp")?.classList.remove("compact", "results-only"); safeShow("res-cards", "none"); safeShow("emp-calc", "flex"); const btnReset = g("btn-reset"); if (btnReset) btnReset.style.display = "none"; const target = g("res-cards"); if (target) target.innerHTML = ""; lastResults = null; lastTgts = null; if (clearMessage) toast("Pronto para novo cálculo", "ok"); }
function exportProducts() { const data = JSON.stringify(ferts, null, 2); const blob = new Blob([data], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ferticalc_produtos.json"; a.click(); URL.revokeObjectURL(url); toast("Produtos exportados", "ok"); }
function importProducts(file) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!Array.isArray(data)) throw new Error("Formato inválido"); ferts = data.map((p) => ({ id: p.id || uid(), name: String(p.name || "Produto").trim(), price: Number(p.price || 0), note: String(p.note || ""), N: Number(p.N || 0), P2O5: Number(p.P2O5 || 0), K2O: Number(p.K2O || 0), S: Number(p.S || 0) })).filter((p) => p.name && p.price > 0); saveProducts(false); resetCalc(false); toast("Produtos importados", "ok"); } catch { toast("Arquivo inválido. Use o JSON exportado pelo aplicativo.", "er"); } }; reader.readAsText(file, "utf-8"); }
document.addEventListener("DOMContentLoaded", () => { loadProducts(); renderFertList(); safeShow("res-cards", "none"); safeShow("emp-calc", "flex"); g("productForm")?.addEventListener("submit", handleProductSubmit); g("fileImport")?.addEventListener("change", (e) => importProducts(e.target.files?.[0])); });
