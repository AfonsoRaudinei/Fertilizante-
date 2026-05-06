(() => {
  const moneyTon = (value) => `R$ ${Number(value || 0).toFixed(2)}/t`;
  const moneyHa = (value) => `R$ ${Number(value || 0).toFixed(2)}/ha`;

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
            <p class="fert-main">${fert.name} ${formula(fert)}</p>
            <div class="fert-details">
              <p class="fert-sub">${fert.manufacturer || "Sem fornecedor"}${fert.delivery ? ` • ${fert.delivery}` : ""}</p>
              <p class="fert-sub">${moneyTon(fert.price)} • Frete ${moneyTon(fert.freight)}</p>
              ${fert.needsReview ? '<p class="fert-sub status-review">precisa revisar</p>' : ""}
            </div>
          </div>
          <div class="fert-actions">
            <button class="action-btn" data-action="expand" aria-label="Expandir ou recolher">▾</button>
            <button class="action-btn" data-action="toggle" aria-label="Ativar ou inativar">${fert.active ? "◉" : "○"}</button>
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
    select.innerHTML = items.map((item) => `<option value="${item}">${item}</option>`).join("");
    select.value = current || items[0];
  };

  const renderNutrients = (items) => {
    const list = document.getElementById("nutrient-list");
    if (!list) return;
    list.innerHTML = items.filter((item) => Number(item.value || 0) > 0).map(nutrientPill).join("");
  };

  const renderWinners = (result) => {
    const root = document.getElementById("solver-result");
    if (!root) return;

    if (!result || !result.winners?.length) {
      root.innerHTML = '<p class="fert-sub">Sem combinação válida para os filtros atuais.</p>';
      return;
    }

    root.innerHTML = result.winners
      .map((winner, idx) => {
        const items = winner.plan
          .map((item) => `<li>${item.fertilizer.name}: ${Number(item.kgPerHa).toFixed(2)} kg/ha</li>`)
          .join("");

        return `
          <article class="result-card">
            <p class="result-title">Vencedor ${idx + 1}</p>
            <ul class="result-list">${items}</ul>
            <p class="fert-sub">Tonelada/ha: ${Number(winner.totals.tonPerHa).toFixed(3)} t</p>
            <p class="fert-sub">Custo/ha: ${moneyHa(winner.totals.costPerHa)}</p>
            <p class="fert-sub">Frete/ha: ${moneyHa(winner.totals.freightPerHa)}</p>
            <p class="fert-sub">Atingido NPK: N ${winner.contribution.N.toFixed(2)} • P₂O₅ ${winner.contribution["P₂O₅"].toFixed(2)} • K₂O ${winner.contribution["K₂O"].toFixed(2)}</p>
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

  window.AppUI = {
    renderCards,
    renderManufacturers,
    renderCultures,
    renderNutrients,
    renderWinners,
    renderImportPreview
  };
})();
