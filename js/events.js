(() => {
  const state = {
    editingIndex: null,
    draft: { nutrients: [] },
    lastSolverInput: null,
    lastSolverBest: null,
    importPreview: []
  };

  const selectors = {
    backdrop: document.getElementById("backdrop"),
    menu: document.getElementById("side-panel"),
    sheet: document.getElementById("fert-sheet"),
    importSheet: document.getElementById("import-sheet"),
    form: document.getElementById("fert-form"),
    addBtn: document.getElementById("add-product"),
    importBtn: document.getElementById("import-list-btn"),
    closeBtn: document.getElementById("sheet-close"),
    importCloseBtn: document.getElementById("import-close"),
    nutrientAddBtn: document.getElementById("nutrient-add"),
    nutrientEditor: document.getElementById("nutrient-editor"),
    nutrientSave: document.getElementById("nutrient-save"),
    nutrientKind: document.getElementById("nutrient-kind"),
    nutrientValue: document.getElementById("nutrient-value"),
    cards: document.getElementById("fert-cards"),
    solverForm: document.getElementById("solver-form"),
    aiBtn: document.getElementById("ai-explain-btn"),
    aiKey: document.getElementById("openrouter-key"),
    aiKeyConsent: document.getElementById("save-key-consent"),
    aiKeyClear: document.getElementById("clear-key-btn"),
    aiOutput: document.getElementById("ai-output"),
    importText: document.getElementById("import-text"),
    importSupplier: document.getElementById("import-default-supplier"),
    importDelivery: document.getElementById("import-default-delivery"),
    importFreight: document.getElementById("import-default-freight"),
    importIgnoreDuplicates: document.getElementById("ignore-duplicates"),
    importDuplicateMode: document.getElementById("duplicate-mode"),
    importPreviewBtn: document.getElementById("import-preview-btn"),
    importApplyBtn: document.getElementById("import-apply-btn")
  };

  const parseImportLines = () => {
    const source = selectors.importText.value || "";
    const lines = source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const defaultSupplier = selectors.importSupplier.value;
    const defaultDelivery = selectors.importDelivery.value;
    const defaultFreight = window.ImportParser.parseBRL(selectors.importFreight.value);
    const existing = window.AppStorage.getFertilizers();
    const existingKeys = new Set(existing.map((item) => window.ImportParser.keyOf(item)));
    const seenImportKeys = new Set();

    return lines.map((line) => {
      const cols = line.split("|").map((c) => c.trim());
      const has5Cols = cols.length >= 5;
      const has4Cols = cols.length === 4;

      const supplier = defaultSupplier !== "__line__" && defaultSupplier ? defaultSupplier : cols[0] || "Sem fornecedor";
      const name = cols[1] || cols[0] || "Produto sem nome";
      const delivery = defaultDelivery !== "__line__" && defaultDelivery ? defaultDelivery : has5Cols || has4Cols ? cols[2] : "";

      const priceRaw = has5Cols ? cols[4] : has4Cols ? cols[3] : cols[cols.length - 1];
      const freightRaw = has5Cols ? cols[3] : "";

      const price = window.ImportParser.parseBRL(priceRaw);
      const freight = window.ImportParser.parseBRL(freightRaw);
      const resolvedFreight = freight ?? defaultFreight ?? 0;

      const detected = window.ImportParser.detectNutrients(name);
      const statuses = [];
      if (price === null) statuses.push("preço inválido");
      if (detected.needsReview) statuses.push("revisar nutrientes");

      const row = {
        manufacturer: supplier,
        name,
        delivery,
        freight: resolvedFreight,
        price: price ?? 0,
        nutrients: detected.nutrients,
        needsReview: detected.needsReview,
        formulaLabel: (() => {
          const compact = detected.nutrients
            .filter((n) => Number(n.value || 0) > 0 && ["N", "P₂O₅", "K₂O", "S"].includes(n.type))
            .map((n) => `${n.type} ${Number(n.value).toString().replace(".", ",")}`);
          return compact.length ? compact.join(" / ") : "sem fórmula detectada";
        })(),
        statuses,
        active: true,
        minLoad: 0
      };

      const key = window.ImportParser.keyOf(row);
      if (existingKeys.has(key) || seenImportKeys.has(key)) row.statuses.push("duplicado possível");
      seenImportKeys.add(key);
      if (!row.statuses.length) row.statuses.push("OK");

      return row;
    });
  };

  const getFormPayload = () => {
    const data = new FormData(selectors.form);
    return {
      name: String(data.get("name") || "").trim(),
      manufacturer: String(data.get("manufacturer") || "").trim(),
      delivery: "",
      price: Number(data.get("price") || 0),
      freight: Number(data.get("freight") || 0),
      minLoad: Number(data.get("minLoad") || 0),
      nutrients: state.draft.nutrients,
      needsReview: false,
      active: true
    };
  };

  const persistDraft = () => localStorage.setItem("fert_calc_draft", JSON.stringify(getFormPayload()));

  const loadDraft = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("fert_calc_draft") || "null");
      if (!saved) return;
      selectors.form.name.value = saved.name || "";
      selectors.form.manufacturer.value = saved.manufacturer || "";
      selectors.form.price.value = saved.price || "";
      selectors.form.freight.value = saved.freight || "";
      selectors.form.minLoad.value = saved.minLoad || "";
      state.draft.nutrients = Array.isArray(saved.nutrients) ? saved.nutrients : [];
      window.AppUI.renderNutrients(state.draft.nutrients);
    } catch {}
  };

  const resetDraft = () => {
    state.editingIndex = null;
    state.draft = { nutrients: [] };
    selectors.form.reset();
    selectors.nutrientEditor.hidden = true;
    selectors.nutrientKind.value = "";
    selectors.nutrientValue.value = "";
    window.AppUI.renderNutrients([]);
    persistDraft();
  };

  const openSheet = () => {
    selectors.sheet.classList.add("open");
    selectors.sheet.setAttribute("aria-hidden", "false");
    selectors.backdrop.hidden = false;
  };

  const closeSheet = () => {
    selectors.sheet.classList.remove("open");
    selectors.sheet.setAttribute("aria-hidden", "true");
    if (!selectors.menu.classList.contains("open") && !selectors.importSheet.classList.contains("open")) selectors.backdrop.hidden = true;
  };

  const openImportSheet = () => {
    selectors.importSheet.classList.add("open");
    selectors.importSheet.setAttribute("aria-hidden", "false");
    selectors.backdrop.hidden = false;
  };

  const closeImportSheet = () => {
    selectors.importSheet.classList.remove("open");
    selectors.importSheet.setAttribute("aria-hidden", "true");
    if (!selectors.menu.classList.contains("open") && !selectors.sheet.classList.contains("open")) selectors.backdrop.hidden = true;
  };

  const saveFertilizer = (payload) => {
    const fertilizers = window.AppStorage.getFertilizers();
    if (state.editingIndex === null) {
      fertilizers.push(payload);
    } else {
      fertilizers[state.editingIndex] = payload;
    }

    if (payload.manufacturer && !window.AppStorage.getManufacturers().includes(payload.manufacturer)) {
      const updated = [...window.AppStorage.getManufacturers(), payload.manufacturer];
      window.AppStorage.setManufacturers(updated);
      window.AppUI.renderManufacturers(updated);
    }

    window.AppStorage.setFertilizers(fertilizers);
    window.AppUI.renderCards(fertilizers);
    localStorage.removeItem("fert_calc_draft");
  };

  const hydrateEdit = (index) => {
    const item = window.AppStorage.getFertilizers()[index];
    if (!item) return;
    state.editingIndex = index;
    selectors.form.name.value = item.name || "";
    selectors.form.manufacturer.value = item.manufacturer || "";
    selectors.form.price.value = item.price || "";
    selectors.form.freight.value = item.freight || "";
    selectors.form.minLoad.value = item.minLoad || "";
    state.draft.nutrients = Array.isArray(item.nutrients) ? item.nutrients : [];
    window.AppUI.renderNutrients(state.draft.nutrients);
    persistDraft();
    openSheet();
  };

  const runSolver = () => {
    const data = new FormData(selectors.solverForm);
    const activeFertilizers = window.AppStorage.getFertilizers().filter((f) => f.active !== false);
    const input = {
      culture: String(data.get("culture") || ""),
      principalNutrient: String(data.get("principal") || "N"),
      criterion: String(data.get("criterion") || "balanced"),
      maxProducts: Number(data.get("maxProducts") || 3),
      limit: Number(data.get("limit") || 1),
      targets: {
        N: Number(data.get("targetN") || 0),
        "P₂O₅": Number(data.get("targetP") || 0),
        "K₂O": Number(data.get("targetK") || 0)
      },
      fertilizers: activeFertilizers
    };

    const result = window.AppSolver.solve(input);
    window.AppUI.renderWinners(result);
    state.lastSolverInput = input;
    state.lastSolverBest = result?.best || null;
  };

  const explainWithAI = async () => {
    if (!state.lastSolverBest || !state.lastSolverInput) {
      selectors.aiOutput.textContent = "Execute o solver antes de pedir explicação da IA.";
      return;
    }

    const apiKey = selectors.aiKey.value.trim();
    if (selectors.aiKeyConsent.checked && apiKey) localStorage.setItem("openrouter_api_key", apiKey);
    selectors.aiOutput.textContent = "Gerando explicação contextual...";

    const knowledgeText = await window.AIContextBuilder.readKnowledge();
    const solverSnapshot = window.AIContextBuilder.buildSolverSnapshot(state.lastSolverBest, state.lastSolverInput);
    const aiResult = await window.OpenRouterAI.explain({ apiKey, solverSnapshot, knowledgeText });
    selectors.aiOutput.textContent = aiResult.text;
  };

  const clearSavedKey = () => {
    localStorage.removeItem("openrouter_api_key");
    selectors.aiKey.value = "";
    selectors.aiKeyConsent.checked = false;
    selectors.aiOutput.textContent = "Chave removida deste navegador.";
  };

  const previewImport = () => {
    state.importPreview = parseImportLines();
    window.AppUI.renderImportPreview(state.importPreview);
  };

  const applyImport = () => {
    const existing = window.AppStorage.getFertilizers();
    const rows = state.importPreview.length ? state.importPreview : parseImportLines();
    const duplicateMode = selectors.importIgnoreDuplicates.checked ? "ignore" : selectors.importDuplicateMode.value;
    const byKey = new Map(existing.map((item, idx) => [window.ImportParser.keyOf(item), idx]));
    const merged = [...existing];

    for (const row of rows) {
      const key = window.ImportParser.keyOf(row);
      const idx = byKey.get(key);
      const isDup = idx !== undefined;
      if (!isDup) {
        merged.push({ ...row });
        byKey.set(key, merged.length - 1);
        continue;
      }
      if (duplicateMode === "ignore") continue;
      if (duplicateMode === "update_price") {
        merged[idx] = { ...merged[idx], price: row.price, freight: row.freight };
        continue;
      }
      merged.push({ ...row });
    }

    window.AppStorage.setFertilizers(merged);
    window.AppUI.renderCards(merged);

    const manufacturers = new Set(window.AppStorage.getManufacturers());
    rows.forEach((row) => manufacturers.add(row.manufacturer));
    window.AppStorage.setManufacturers([...manufacturers]);
    window.AppUI.renderManufacturers([...manufacturers]);

    selectors.importText.value = "";
    state.importPreview = [];
    window.AppUI.renderImportPreview([]);
    closeImportSheet();
  };

  const bind = () => {
    selectors.addBtn.addEventListener("click", () => {
      resetDraft();
      loadDraft();
      openSheet();
    });
    selectors.importBtn.addEventListener("click", openImportSheet);

    selectors.closeBtn.addEventListener("click", closeSheet);
    selectors.importCloseBtn.addEventListener("click", closeImportSheet);

    selectors.form.addEventListener("input", persistDraft);

    selectors.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = getFormPayload();
      if (!payload.name || !payload.manufacturer) return;
      saveFertilizer(payload);
      resetDraft();
      closeSheet();
    });

    selectors.nutrientAddBtn.addEventListener("click", () => {
      selectors.nutrientEditor.hidden = false;
      selectors.nutrientKind.focus();
    });

    selectors.nutrientSave.addEventListener("click", () => {
      const type = selectors.nutrientKind.value;
      const value = Number(selectors.nutrientValue.value || 0);
      if (!type || value < 0) return;
      state.draft.nutrients.push({ type, value });
      window.AppUI.renderNutrients(state.draft.nutrients);
      selectors.nutrientEditor.hidden = true;
      selectors.nutrientKind.value = "";
      selectors.nutrientValue.value = "";
      persistDraft();
    });

    selectors.cards.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const card = event.target.closest("[data-index]");
      if (!card) return;
      const index = Number(card.dataset.index);
      const action = btn.dataset.action;
      const fertilizers = window.AppStorage.getFertilizers();

      if (action === "delete") {
        if (!window.confirm("Confirmar exclusão deste fertilizante?")) return;
        fertilizers.splice(index, 1);
      } else if (action === "expand") {
        card.classList.toggle("fert-card--expanded");
      } else if (action === "duplicate") {
        const source = fertilizers[index];
        if (!source) return;
        fertilizers.push({ ...source, nutrients: [...(source.nutrients || [])], name: `${source.name} copy` });
      } else if (action === "edit") {
        hydrateEdit(index);
        return;
      } else if (action === "toggle") {
        fertilizers[index].active = !fertilizers[index].active;
      }

      window.AppStorage.setFertilizers(fertilizers);
      window.AppUI.renderCards(fertilizers);
    });

    selectors.solverForm.addEventListener("submit", (event) => {
      event.preventDefault();
      runSolver();
    });

    selectors.aiBtn.addEventListener("click", explainWithAI);
    selectors.aiKeyClear.addEventListener("click", clearSavedKey);
    selectors.importPreviewBtn.addEventListener("click", previewImport);
    selectors.importApplyBtn.addEventListener("click", applyImport);

    const savedKey = localStorage.getItem("openrouter_api_key");
    if (savedKey) {
      selectors.aiKey.value = savedKey;
      selectors.aiKeyConsent.checked = true;
    }
  };

  window.AppEvents = { bind, openSheet, closeSheet, loadDraft, persistDraft, runSolver };
})();
