(() => {
  const moneyTon = (value) => `R$ ${Number(value || 0).toFixed(2)}/t`;
  const moneyHa = (value) => `R$ ${Number(value || 0).toFixed(2)}/ha`;
  const compactMoneyTon = (value) => {
    const num = Number(value || 0);
    if (!(num > 0)) return "Sem preço";
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/t`;
  };
  const formatRelativeDate = (iso) => {
    if (!iso) return "Sem atualização";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "Sem atualização";
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / dayMs);
    if (diffDays <= 0) return "Atualizado hoje";
    if (diffDays === 1) return "Atualizado ontem";
    if (diffDays <= 7) return `Atualizado há ${diffDays} dias`;
    return `Atualizado ${dt.toLocaleDateString("pt-BR")}`;
  };
  const formatDateTime = (iso) => {
    if (!iso) return "";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const formula = (fert) => {
    const nutrients = fert.nutrients || [];
    const n = nutrients.find((x) => x.type === "N")?.value || 0;
    const p = nutrients.find((x) => x.type === "P₂O₅")?.value || 0;
    const k = nutrients.find((x) => x.type === "K₂O")?.value || 0;
    const compact = [
      n > 0 ? `N ${Number(n).toFixed(0)}` : "",
      p > 0 ? `P₂O₅ ${Number(p).toFixed(0)}` : "",
      k > 0 ? `K₂O ${Number(k).toFixed(0)}` : ""
    ].filter(Boolean);
    return compact.length ? compact.join(" • ") : "sem fórmula";
  };

  const nutrientPill = (item) => `<span class="nutrient-pill">${item.type} • ${Number(item.value).toFixed(2)}%</span>`;
  const statusLabel = (fert) => (fert.active === false ? "Fora do cálculo" : "Ativo no cálculo");
  const criterionLabel = (criterion) => {
    if (criterion === "cost") return "Menor custo";
    if (criterion === "freight") return "Menor frete";
    if (criterion === "nutrition") return "Menor erro nutricional";
    return "Balanceado";
  };

  const renderCards = (fertilizers) => {
    const root = document.getElementById("fert-cards");
    if (!root) return;

    if (!fertilizers.length) {
      root.innerHTML = '<p class="fert-sub">Nenhum produto cadastrado ainda.</p>';
      return;
    }

    root.innerHTML = fertilizers
      .map(
        (fert, index) => `
        <article class="fert-card ${fert.active ? "" : "fert-card--inactive"}" data-index="${index}">
          <div class="fert-content">
            <p class="fert-main">
              ${fert.name}
              ${fert.needsReview ? '<span class="status-dot status-dot--review" title="Revisar nutrientes" aria-label="Revisar nutrientes"></span>' : ""}
            </p>
            <p class="fert-sub fert-sub--compact">${formula(fert)} <span class="price-badge">${compactMoneyTon(fert.price)} • ${formatRelativeDate(fert.lastPriceUpdate)}</span></p>
            <div class="fert-details">
              <p class="fert-sub">${fert.manufacturer || "Sem fornecedor"}${fert.delivery ? ` • ${fert.delivery}` : ""}</p>
              <p class="fert-sub">${moneyTon(fert.price)} • Frete ${moneyTon(fert.freight)} • Carga mínima ${Number(fert.minLoad || 0).toFixed(2)} t</p>
              <p class="fert-sub">Última atualização: ${formatDateTime(fert.lastPriceUpdate) || "Sem atualização"}</p>
              <p class="fert-sub">Status: ${statusLabel(fert)}</p>
              <p class="fert-sub">Nutrientes: ${(fert.nutrients || []).length ? (fert.nutrients || []).map((n) => `${n.type} ${Number(n.value || 0).toFixed(2)}%`).join(" • ") : "sem nutrientes cadastrados"}</p>
              ${fert.needsReview ? '<p class="fert-sub status-review">precisa revisar</p>' : ""}
            </div>
          </div>
          <div class="fert-actions">
            <button
              class="action-btn action-btn--expand"
              data-action="expand"
              aria-label="Expandir detalhes"
              aria-expanded="false"
              title="Expandir detalhes"
            >▾</button>
            <button
              class="action-btn status-toggle ${fert.active ? "status-toggle--active" : "status-toggle--inactive"}"
              data-action="toggle"
              aria-label="${fert.active ? "Ativo no cálculo" : "Fora do cálculo"}"
              title="${fert.active ? "Ativo no cálculo" : "Fora do cálculo"}"
            >●</button>
            <button class="action-btn" data-action="edit" aria-label="Editar">✎</button>
            <button class="action-btn" data-action="duplicate" aria-label="Duplicar">⧉</button>
            <button class="action-btn" data-action="delete" aria-label="Excluir">✕</button>
          </div>
        </article>
      `
      )
      .join("");
  };

  const renderManufacturers = (items) => {
    const select = document.querySelector('select[name="manufacturer"]');
    const importSelect = document.getElementById("import-default-supplier");
    const options = '<option value="">Selecione</option>' + items.map((name) => `<option>${name}</option>`).join("");

    if (select) {
      const current = select.value;
      select.innerHTML = options;
      select.value = current;
    }

    if (importSelect) {
      const current = importSelect.value;
      importSelect.innerHTML = '<option value="__line__">Manter da linha</option>' + items.map((name) => `<option>${name}</option>`).join("");
      importSelect.value = current || "__line__";
    }
  };

  const renderCultures = (items) => {
    const select = document.querySelector('select[name="culture"]');
    if (!select) return;
    const current = select.value;
    const names = items.map((item) => (typeof item === "string" ? item : item.culture)).filter(Boolean);
    select.innerHTML = names.map((name) => `<option value="${name}">${name}</option>`).join("");
    select.value = current || names[0] || "";
  };

  const renderNutrients = (items) => {
    const list = document.getElementById("nutrient-list");
    if (!list) return;
    list.innerHTML = items.filter((item) => Number(item.value || 0) > 0).map(nutrientPill).join("");
  };

  const renderWinners = (result, input) => {
    const root = document.getElementById("solver-result");
    if (!root) return;

    if (!result || !result.winners?.length) {
      root.innerHTML = '<p class="fert-sub">Sem combinação válida para os filtros atuais.</p>';
      return;
    }

    root.innerHTML = result.winners
      .map((winner, idx) => {
        const items = (winner.totals.itemBreakdown || [])
          .map(
            (item) => `<li>
              <strong>${item.fertilizer.name}</strong> • ${item.fertilizer.manufacturer || "Sem fornecedor"}<br/>
              Dose: ${Number(item.kgPerHa).toFixed(2)} kg/ha • Toneladas totais: ${Number(item.tonTotal).toFixed(2)} t<br/>
              Preço/t: ${moneyTon(item.pricePerTon)} • Frete/t: ${moneyTon(item.freightPerTon)}<br/>
              Custo/ha: ${moneyHa(item.costPerHa + item.freightPerHa)} • Custo total: R$ ${Number(item.costTotal + item.freightTotal).toFixed(2)}
            </li>`
          )
          .join("");
        const targetN = Number(input?.targets?.N || 0);
        const targetP = Number(input?.targets?.["P₂O₅"] || 0);
        const targetK = Number(input?.targets?.["K₂O"] || 0);
        const dN = winner.contribution.N - targetN;
        const dP = winner.contribution["P₂O₅"] - targetP;
        const dK = winner.contribution["K₂O"] - targetK;

        return `
          <article class="result-card">
            <p class="result-title">Vencedor ${idx + 1}</p>
            <p class="fert-sub">Combinação vencedora</p>
            <ul class="result-list">${items}</ul>
            <p class="fert-sub">Tonelada/ha: ${Number(winner.totals.tonPerHa).toFixed(3)} t</p>
            <p class="fert-sub">Custo/ha: ${moneyHa(winner.totals.costPerHa)}</p>
            <p class="fert-sub">Frete/ha: ${moneyHa(winner.totals.freightPerHa)}</p>
            <p class="fert-sub">Custo total: R$ ${Number((winner.totals.costTotal || 0) + (winner.totals.freightTotal || 0)).toFixed(2)}</p>
            <p class="fert-sub">Meta nutrientes: N ${targetN.toFixed(2)} • P₂O₅ ${targetP.toFixed(2)} • K₂O ${targetK.toFixed(2)}</p>
            <p class="fert-sub">Atingido NPK: N ${winner.contribution.N.toFixed(2)} • P₂O₅ ${winner.contribution["P₂O₅"].toFixed(2)} • K₂O ${winner.contribution["K₂O"].toFixed(2)}</p>
            <p class="fert-sub">Sobra/Falta: N ${dN >= 0 ? "+" : ""}${dN.toFixed(2)} • P₂O₅ ${dP >= 0 ? "+" : ""}${dP.toFixed(2)} • K₂O ${dK >= 0 ? "+" : ""}${dK.toFixed(2)}</p>
            <p class="fert-sub">Critério: ${criterionLabel(input?.criterion)}</p>
            <p class="fert-sub">Observação: Melhor opção conforme filtro selecionado.</p>
          </article>
        `;
      })
      .join("");
  };

  const renderImportPreview = (rows) => {
    const root = document.getElementById("import-preview");
    if (!root) return;

    if (!rows.length) {
      root.innerHTML = '<p class="fert-sub">Sem linhas válidas para pré-visualizar.</p>';
      return;
    }

    const totals = {
      read: rows.length,
      valid: rows.filter((r) => !r.statuses.includes("preço inválido")).length,
      review: rows.filter((r) => r.statuses.includes("revisar nutrientes")).length,
      dup: rows.filter((r) => r.statuses.includes("duplicado possível")).length
    };

    root.innerHTML =
      `<article class="result-card"><p class="fert-sub">Lidas: ${totals.read} • Válidas: ${totals.valid} • Revisar: ${totals.review} • Duplicadas: ${totals.dup}</p></article>` +
      rows
      .map(
        (row, idx) => `
        <article class="import-row" data-row="${idx}">
          <p class="fert-main">${row.manufacturer} • ${row.name}</p>
          <p class="fert-sub">${row.formulaLabel} • ${moneyTon(row.price)} • ${row.delivery || "sem entrega"}</p>
          <p class="fert-sub">status: ${row.statuses.join(", ")}</p>
        </article>
      `
      )
      .join("");
  };

  const renderFreights = (items) => {
    const root = document.getElementById("freight-list");
    if (!root) return;
    if (!items.length) {
      root.innerHTML = '<p class="fert-sub">Nenhum frete cadastrado.</p>';
      return;
    }
    root.innerHTML = items
      .map(
        (item) => `
      <article class="import-row" data-freight-id="${item.id}">
        <p class="fert-main">${item.supplier || "Sem fornecedor"} • ${item.origin || "-"} → ${item.destination || "-"}</p>
        <p class="fert-sub">Frete ${moneyTon(item.freightPerTon)} • Carga mínima ${Number(item.minLoadTon || 0)} t</p>
        <div class="card-actions-inline">
          <button class="ghost-btn" data-action="edit-freight" data-id="${item.id}" type="button">✎ Editar</button>
          <button class="ghost-btn" data-action="delete-freight" data-id="${item.id}" type="button">✕ Excluir</button>
        </div>
      </article>
    `
      )
      .join("");
  };

  const renderManufacturerRecords = (items) => {
    const root = document.getElementById("manufacturer-list");
    if (!root) return;
    if (!items.length) {
      root.innerHTML = '<p class="fert-sub">Nenhum fabricante cadastrado.</p>';
      return;
    }
    root.innerHTML = items
      .map(
        (item) => `
      <article class="import-row" data-manufacturer-id="${item.id}">
        <p class="fert-main">${item.name}</p>
        <p class="fert-sub">${item.city || "Sem cidade"}${item.state ? `/${item.state}` : ""}${item.notes ? ` • ${item.notes}` : ""}</p>
        <div class="card-actions-inline">
          <button class="ghost-btn" data-action="edit-manufacturer" data-id="${item.id}" type="button">✎ Editar</button>
          <button class="ghost-btn" data-action="delete-manufacturer" data-id="${item.id}" type="button">✕ Excluir</button>
        </div>
      </article>
    `
      )
      .join("");
  };

  const renderCulturePriorities = (items) => {
    const root = document.getElementById("culture-list");
    if (!root) return;
    if (!items.length) {
      root.innerHTML = '<p class="fert-sub">Nenhuma cultura cadastrada.</p>';
      return;
    }
    root.innerHTML = items
      .map(
        (item, index) => `
      <article class="import-row" data-culture-index="${index}">
        <p class="fert-main">${item.culture}</p>
        <p class="fert-sub">Prioridades: ${(item.priorities || []).join(" > ")}</p>
      </article>
    `
      )
      .join("");
  };

  window.AppUI = {
    renderCards,
    renderManufacturers,
    renderCultures,
    renderNutrients,
    renderWinners,
    renderImportPreview,
    renderFreights,
    renderManufacturerRecords,
    renderCulturePriorities
    ,
    formatRelativeDate,
    formatDateTime
  };
})();
