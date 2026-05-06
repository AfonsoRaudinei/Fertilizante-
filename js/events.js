(() => {
  const state = {
    editingIndex: null,
    draft: { nutrients: [] },
    lastSolverInput: null,
    lastSolverBest: null,
    importPreview: [],
    editingFreightId: null,
    editingManufacturerId: null
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
    importApplyBtn: document.getElementById("import-apply-btn"),
    freightForm: document.getElementById("freight-form"),
    freightId: document.getElementById("freight-id"),
    freightSupplier: document.getElementById("freight-supplier"),
    freightOrigin: document.getElementById("freight-origin"),
    freightDestination: document.getElementById("freight-destination"),
    freightPerTon: document.getElementById("freight-per-ton"),
    freightMinLoad: document.getElementById("freight-min-load"),
    freightClear: document.getElementById("freight-clear"),
    freightList: document.getElementById("freight-list"),
    manufacturerForm: document.getElementById("manufacturer-form"),
    manufacturerId: document.getElementById("manufacturer-id"),
    manufacturerName: document.getElementById("manufacturer-name"),
    manufacturerCity: document.getElementById("manufacturer-city"),
    manufacturerState: document.getElementById("manufacturer-state"),
    manufacturerNotes: document.getElementById("manufacturer-notes"),
    manufacturerClear: document.getElementById("manufacturer-clear"),
    manufacturerList: document.getElementById("manufacturer-list"),
    cultureForm: document.getElementById("culture-form"),
    cultureName: document.getElementById("culture-name"),
    cultureP1: document.getElementById("culture-p1"),
    cultureP2: document.getElementById("culture-p2"),
    cultureP3: document.getElementById("culture-p3"),
    cultureP4: document.getElementById("culture-p4"),
    settingsTheme: document.getElementById("settings-theme"),
    settingsExport: document.getElementById("settings-export"),
    settingsImportBtn: document.getElementById("settings-import-btn"),
    settingsImportFile: document.getElementById("settings-import-file"),
    settingsClear: document.getElementById("settings-clear"),
    settingsStatus: document.getElementById("settings-status"),
    lastPriceUpdateDisplay: document.getElementById("last-price-update-display")
  };
  const nowIso = () => new Date().toISOString();
  const setLastPriceUpdateDisplay = (iso) => {
    if (!selectors.lastPriceUpdateDisplay) return;
    selectors.lastPriceUpdateDisplay.value = iso ? window.AppUI.formatDateTime(iso) : "";
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
        minLoad: 0,
        lastPriceUpdate: nowIso()
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
    const nutrients = state.draft.nutrients;
    const hasMainNutrient = nutrients.some((n) => ["N", "P₂O₅", "K₂O", "S"].includes(n.type) && Number(n.value || 0) > 0);
    return {
      name: String(data.get("name") || "").trim(),
      manufacturer: String(data.get("manufacturer") || "").trim(),
      delivery: "",
      price: Number(data.get("price") || 0),
      freight: Number(data.get("freight") || 0),
      minLoad: Number(data.get("minLoad") || 0),
      nutrients,
      needsReview: !hasMainNutrient,
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
      setLastPriceUpdateDisplay(saved.lastPriceUpdate || "");
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
    setLastPriceUpdateDisplay("");
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
    const previous = state.editingIndex === null ? null : fertilizers[state.editingIndex];
    const oldPrice = previous ? Number(previous.price || 0) : null;
    const newPrice = Number(payload.price || 0);
    const shouldUpdatePriceDate = previous === null || oldPrice !== newPrice;
    const itemToSave = {
      ...payload,
      lastPriceUpdate: shouldUpdatePriceDate ? nowIso() : previous?.lastPriceUpdate || nowIso()
    };
    if (state.editingIndex === null) {
      fertilizers.push(itemToSave);
    } else {
      fertilizers[state.editingIndex] = itemToSave;
    }

    if (payload.manufacturer && !window.AppStorage.getManufacturers().includes(payload.manufacturer)) {
      const records = window.AppStorage.getManufacturerRecords();
      records.push({
        id: `m-${Math.random().toString(36).slice(2, 9)}`,
        name: payload.manufacturer,
        city: "",
        state: "",
        notes: ""
      });
      window.AppStorage.setManufacturers(records);
      window.AppUI.renderManufacturers(window.AppStorage.getManufacturers());
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
    setLastPriceUpdateDisplay(item.lastPriceUpdate || "");
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
      areaHa: Number(data.get("areaHa") || 1),
      targets: {
        N: Number(data.get("targetN") || 0),
        "P₂O₅": Number(data.get("targetP") || 0),
        "K₂O": Number(data.get("targetK") || 0)
      },
      fertilizers: activeFertilizers
    };

    const result = window.AppSolver.solve(input);
    window.AppUI.renderWinners(result, input);
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
        const priceChanged = Number(merged[idx].price || 0) !== Number(row.price || 0);
        merged[idx] = {
          ...merged[idx],
          price: row.price,
          freight: row.freight,
          lastPriceUpdate: priceChanged ? nowIso() : merged[idx].lastPriceUpdate || nowIso()
        };
        continue;
      }
      merged.push({ ...row, lastPriceUpdate: row.lastPriceUpdate || nowIso() });
    }

    window.AppStorage.setFertilizers(merged);
    window.AppUI.renderCards(merged);

    const records = window.AppStorage.getManufacturerRecords();
    const byName = new Set(records.map((r) => r.name.toLowerCase()));
    rows.forEach((row) => {
      const key = String(row.manufacturer || "").toLowerCase();
      if (!key || byName.has(key)) return;
      records.push({
        id: `m-${Math.random().toString(36).slice(2, 9)}`,
        name: row.manufacturer,
        city: "",
        state: "",
        notes: ""
      });
      byName.add(key);
    });
    window.AppStorage.setManufacturers(records);
    window.AppUI.renderManufacturers(window.AppStorage.getManufacturers());

    selectors.importText.value = "";
    state.importPreview = [];
    window.AppUI.renderImportPreview([]);
    closeImportSheet();
  };

  const resetFreightForm = () => {
    state.editingFreightId = null;
    selectors.freightId.value = "";
    selectors.freightForm.reset();
    selectors.freightMinLoad.value = "0";
  };

  const renderFreights = () => {
    window.AppUI.renderFreights(window.AppStorage.getFreights());
  };

  const upsertFreight = () => {
    const list = window.AppStorage.getFreights();
    const payload = {
      id: state.editingFreightId || `f-${Math.random().toString(36).slice(2, 9)}`,
      supplier: selectors.freightSupplier.value.trim(),
      origin: selectors.freightOrigin.value.trim(),
      destination: selectors.freightDestination.value.trim(),
      freightPerTon: Number(selectors.freightPerTon.value || 0),
      minLoadTon: Number(selectors.freightMinLoad.value || 0)
    };
    if (!payload.supplier || !payload.origin || !payload.destination) return;
    const idx = list.findIndex((x) => x.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);
    window.AppStorage.setFreights(list);
    resetFreightForm();
    renderFreights();
  };

  const resetManufacturerForm = () => {
    state.editingManufacturerId = null;
    selectors.manufacturerId.value = "";
    selectors.manufacturerForm.reset();
  };

  const renderManufacturerRecords = () => {
    const records = window.AppStorage.getManufacturerRecords();
    window.AppUI.renderManufacturerRecords(records);
    window.AppUI.renderManufacturers(records.map((r) => r.name));
  };

  const upsertManufacturer = () => {
    const list = window.AppStorage.getManufacturerRecords();
    const payload = {
      id: state.editingManufacturerId || `m-${Math.random().toString(36).slice(2, 9)}`,
      name: selectors.manufacturerName.value.trim(),
      city: selectors.manufacturerCity.value.trim(),
      state: selectors.manufacturerState.value.trim().toUpperCase(),
      notes: selectors.manufacturerNotes.value.trim()
    };
    if (!payload.name) return;
    const idx = list.findIndex((x) => x.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);
    window.AppStorage.setManufacturers(list);
    resetManufacturerForm();
    renderManufacturerRecords();
  };

  const renderCulturesCrud = () => {
    const cultures = window.AppStorage.getCultures();
    selectors.cultureName.innerHTML = cultures.map((item) => `<option value="${item.culture}">${item.culture}</option>`).join("");
    window.AppUI.renderCulturePriorities(cultures);
    const first = cultures[0];
    if (first) {
      selectors.cultureName.value = first.culture;
      selectors.cultureP1.value = first.priorities?.[0] || "";
      selectors.cultureP2.value = first.priorities?.[1] || "";
      selectors.cultureP3.value = first.priorities?.[2] || "";
      selectors.cultureP4.value = first.priorities?.[3] || "";
    }
  };

  const saveCulturePriorities = () => {
    const cultureName = selectors.cultureName.value;
    const list = window.AppStorage.getCultures();
    const idx = list.findIndex((item) => item.culture === cultureName);
    if (idx < 0) return;
    list[idx].priorities = [selectors.cultureP1.value.trim(), selectors.cultureP2.value.trim(), selectors.cultureP3.value.trim(), selectors.cultureP4.value.trim()].filter(Boolean);
    window.AppStorage.setCultures(list);
    window.AppUI.renderCultures(list);
    window.AppUI.renderCulturePriorities(list);
  };

  const loadCultureInForm = () => {
    const current = selectors.cultureName.value;
    const row = window.AppStorage.getCultures().find((item) => item.culture === current);
    if (!row) return;
    selectors.cultureP1.value = row.priorities?.[0] || "";
    selectors.cultureP2.value = row.priorities?.[1] || "";
    selectors.cultureP3.value = row.priorities?.[2] || "";
    selectors.cultureP4.value = row.priorities?.[3] || "";
  };

  const applyTheme = (theme) => {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
  };

  const loadSettings = () => {
    const settings = window.AppStorage.getSettings();
    selectors.settingsTheme.value = settings.theme || "light";
    applyTheme(settings.theme || "light");
  };

  const exportJson = () => {
    const payload = {
      fertilizers: window.AppStorage.getFertilizers(),
      freights: window.AppStorage.getFreights(),
      manufacturers: window.AppStorage.getManufacturerRecords(),
      cultures: window.AppStorage.getCultures(),
      settings: window.AppStorage.getSettings()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fertilizante-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    selectors.settingsStatus.textContent = "Backup exportado.";
  };

  const importJson = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.fertilizers)) window.AppStorage.setFertilizers(data.fertilizers);
      if (Array.isArray(data.freights)) window.AppStorage.setFreights(data.freights);
      if (Array.isArray(data.manufacturers)) window.AppStorage.setManufacturers(data.manufacturers);
      if (Array.isArray(data.cultures)) window.AppStorage.setCultures(data.cultures);
      if (data.settings) window.AppStorage.setSettings(data.settings);
      window.AppUI.renderCards(window.AppStorage.getFertilizers());
      window.AppUI.renderManufacturers(window.AppStorage.getManufacturers());
      window.AppUI.renderCultures(window.AppStorage.getCultures());
      renderFreights();
      renderManufacturerRecords();
      renderCulturesCrud();
      loadSettings();
      selectors.settingsStatus.textContent = "Backup importado com sucesso.";
    } catch {
      selectors.settingsStatus.textContent = "Falha ao importar JSON.";
    }
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
        const isExpanded = card.classList.toggle("fert-card--expanded");
        btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        btn.setAttribute("title", isExpanded ? "Recolher detalhes" : "Expandir detalhes");
      } else if (action === "duplicate") {
        const source = fertilizers[index];
        if (!source) return;
        const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        fertilizers.push({ ...source, id: newId, nutrients: [...(source.nutrients || [])], name: `${source.name} copy` });
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

    selectors.freightForm.addEventListener("submit", (event) => {
      event.preventDefault();
      upsertFreight();
    });
    selectors.freightClear.addEventListener("click", resetFreightForm);
    selectors.freightList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const list = window.AppStorage.getFreights();
      if (btn.dataset.action === "delete-freight") {
        window.AppStorage.setFreights(list.filter((item) => item.id !== id));
        renderFreights();
        return;
      }
      const row = list.find((item) => item.id === id);
      if (!row) return;
      state.editingFreightId = row.id;
      selectors.freightId.value = row.id;
      selectors.freightSupplier.value = row.supplier || "";
      selectors.freightOrigin.value = row.origin || "";
      selectors.freightDestination.value = row.destination || "";
      selectors.freightPerTon.value = row.freightPerTon || 0;
      selectors.freightMinLoad.value = row.minLoadTon || 0;
    });

    selectors.manufacturerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      upsertManufacturer();
    });
    selectors.manufacturerClear.addEventListener("click", resetManufacturerForm);
    selectors.manufacturerList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const list = window.AppStorage.getManufacturerRecords();
      if (btn.dataset.action === "delete-manufacturer") {
        window.AppStorage.setManufacturers(list.filter((item) => item.id !== id));
        renderManufacturerRecords();
        return;
      }
      const row = list.find((item) => item.id === id);
      if (!row) return;
      state.editingManufacturerId = row.id;
      selectors.manufacturerId.value = row.id;
      selectors.manufacturerName.value = row.name || "";
      selectors.manufacturerCity.value = row.city || "";
      selectors.manufacturerState.value = row.state || "";
      selectors.manufacturerNotes.value = row.notes || "";
    });

    selectors.cultureName.addEventListener("change", loadCultureInForm);
    selectors.cultureForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCulturePriorities();
    });

    selectors.settingsTheme.addEventListener("change", () => {
      const settings = window.AppStorage.getSettings();
      settings.theme = selectors.settingsTheme.value;
      window.AppStorage.setSettings(settings);
      applyTheme(settings.theme);
    });
    selectors.settingsExport.addEventListener("click", exportJson);
    selectors.settingsImportBtn.addEventListener("click", () => selectors.settingsImportFile.click());
    selectors.settingsImportFile.addEventListener("change", () => importJson(selectors.settingsImportFile.files?.[0]));
    selectors.settingsClear.addEventListener("click", async () => {
      if (!window.confirm("Limpar todos os dados locais do app?")) return;
      Object.values(window.AppStorage.KEYS).forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem("fert_calc_draft");
      localStorage.removeItem("openrouter_api_key");
      await window.AppStorage.ensureBase();
      window.AppUI.renderCards(window.AppStorage.getFertilizers());
      window.AppUI.renderManufacturers(window.AppStorage.getManufacturers());
      window.AppUI.renderCultures(window.AppStorage.getCultures());
      renderFreights();
      renderManufacturerRecords();
      renderCulturesCrud();
      loadSettings();
      selectors.settingsStatus.textContent = "Dados locais limpos.";
    });

    renderFreights();
    renderManufacturerRecords();
    renderCulturesCrud();
    loadSettings();
  };

  const onSectionChange = (section) => {
    if (section === "freights") renderFreights();
    if (section === "manufacturers") renderManufacturerRecords();
    if (section === "cultures") renderCulturesCrud();
    if (section === "settings") loadSettings();
  };

  window.AppEvents = { bind, openSheet, closeSheet, loadDraft, persistDraft, runSolver, onSectionChange };
})();
