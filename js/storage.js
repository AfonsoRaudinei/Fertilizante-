(() => {
  const KEYS = {
    fertilizers: "fertilizer_app_fertilizers",
    freights: "fertilizer_app_freights",
    manufacturers: "fertilizer_app_manufacturers",
    cultures: "fertilizer_app_cultures",
    settings: "fertilizer_app_settings"
  };
  const LEGACY_KEYS = {
    fertilizers: "fert_calc_fertilizers",
    manufacturers: "fert_calc_manufacturers",
    cultures: "fert_calc_cultures"
  };

  const defaultManufacturers = ["Mosaic", "Yara", "Nutrien", "ICL", "EuroChem"].map((name) => ({
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-seed`,
    name,
    city: "",
    state: "",
    notes: ""
  }));
  const defaultCultures = [
    { culture: "Soja", priorities: ["N", "P₂O₅", "K₂O", "S"] },
    { culture: "Milho", priorities: ["N", "P₂O₅", "K₂O", "S"] }
  ];
  const defaultSettings = { theme: "light" };

  const safeParse = (raw, fallback) => {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const get = (key, fallback) => {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return safeParse(raw, fallback);
  };

  const set = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const ensureSeed = (key, value) => {
    if (!localStorage.getItem(key)) set(key, value);
  };

  const loadJson = async (path, fallback) => {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return fallback;
      const data = await res.json();
      return Array.isArray(data) ? data : fallback;
    } catch {
      return fallback;
    }
  };

  const ensureBase = async () => {
    const [seedManufacturerNames, seedFertilizers, seedCultureNames] = await Promise.all([
      loadJson("./data/manufacturers.json", defaultManufacturers.map((m) => m.name)),
      loadJson("./data/fertilizers.json", []),
      loadJson("./data/cultures.json", defaultCultures.map((c) => c.culture))
    ]);

    if (!localStorage.getItem(KEYS.fertilizers) && localStorage.getItem(LEGACY_KEYS.fertilizers)) {
      set(KEYS.fertilizers, get(LEGACY_KEYS.fertilizers, []));
    }
    if (!localStorage.getItem(KEYS.manufacturers) && localStorage.getItem(LEGACY_KEYS.manufacturers)) {
      const legacy = get(LEGACY_KEYS.manufacturers, []);
      const migrated = legacy.map((name) => ({
        id: `${String(name).toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(name),
        city: "",
        state: "",
        notes: ""
      }));
      set(KEYS.manufacturers, migrated);
    }
    if (!localStorage.getItem(KEYS.cultures) && localStorage.getItem(LEGACY_KEYS.cultures)) {
      const legacy = get(LEGACY_KEYS.cultures, []);
      const migrated = legacy.map((culture) => ({ culture, priorities: ["N", "P₂O₅", "K₂O", "S"] }));
      set(KEYS.cultures, migrated);
    }

    ensureSeed(KEYS.fertilizers, seedFertilizers);
    const seededManufacturers = (seedManufacturerNames.length ? seedManufacturerNames : defaultManufacturers.map((m) => m.name)).map((name) => ({
      id: `${String(name).toLowerCase().replace(/\s+/g, "-")}-seed`,
      name: String(name),
      city: "",
      state: "",
      notes: ""
    }));
    ensureSeed(KEYS.manufacturers, seededManufacturers);
    const seededCultures = (seedCultureNames.length ? seedCultureNames : defaultCultures.map((c) => c.culture)).map((culture) => ({
      culture: String(culture),
      priorities: ["N", "P₂O₅", "K₂O", "S"]
    }));
    ensureSeed(KEYS.cultures, seededCultures);
    ensureSeed(KEYS.freights, []);
    ensureSeed(KEYS.settings, defaultSettings);
  };

  const normalizeManufacturers = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) =>
        typeof item === "string"
          ? { id: `${item.toLowerCase().replace(/\s+/g, "-")}-legacy`, name: item, city: "", state: "", notes: "" }
          : {
              id: item.id || `m-${Math.random().toString(36).slice(2, 9)}`,
              name: String(item.name || "").trim(),
              city: String(item.city || "").trim(),
              state: String(item.state || "").trim(),
              notes: String(item.notes || "").trim()
            }
      )
      .filter((item) => item.name);

  const normalizeCultures = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) =>
        typeof item === "string"
          ? { culture: item, priorities: ["N", "P₂O₅", "K₂O", "S"] }
          : {
              culture: String(item.culture || "").trim(),
              priorities: Array.isArray(item.priorities) && item.priorities.length ? item.priorities.slice(0, 4) : ["N", "P₂O₅", "K₂O", "S"]
            }
      )
      .filter((item) => item.culture);

  window.AppStorage = {
    KEYS,
    ensureBase,
    getFertilizers: () =>
      get(KEYS.fertilizers, []).map((item) => ({
        ...item,
        active: item.active !== false
      })),
    setFertilizers: (items) => set(KEYS.fertilizers, items),
    getFreights: () => get(KEYS.freights, []),
    setFreights: (items) => set(KEYS.freights, Array.isArray(items) ? items : []),
    getManufacturerRecords: () => normalizeManufacturers(get(KEYS.manufacturers, defaultManufacturers)),
    getManufacturers: () => normalizeManufacturers(get(KEYS.manufacturers, defaultManufacturers)).map((item) => item.name),
    setManufacturers: (items) => set(KEYS.manufacturers, normalizeManufacturers(items)),
    getCultures: () => normalizeCultures(get(KEYS.cultures, defaultCultures)),
    setCultures: (items) => set(KEYS.cultures, normalizeCultures(items)),
    getSettings: () => ({ ...defaultSettings, ...get(KEYS.settings, defaultSettings) }),
    setSettings: (settings) => set(KEYS.settings, { ...defaultSettings, ...(settings || {}) })
  };
})();
