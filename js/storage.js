(() => {
  const KEYS = {
    fertilizers: "fert_calc_fertilizers",
    manufacturers: "fert_calc_manufacturers",
    cultures: "fert_calc_cultures"
  };

  const defaultManufacturers = ["Mosaic", "Yara", "Nutrien", "ICL", "EuroChem"];
  const defaultCultures = ["Soja", "Milho", "Algodão", "Cana", "Pastagem"];

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
    const [seedManufacturers, seedFertilizers, seedCultures] = await Promise.all([
      loadJson("/data/manufacturers.json", defaultManufacturers),
      loadJson("/data/fertilizers.json", []),
      loadJson("/data/cultures.json", defaultCultures)
    ]);

    if (!localStorage.getItem(KEYS.manufacturers)) {
      set(KEYS.manufacturers, seedManufacturers.length ? seedManufacturers : defaultManufacturers);
    }
    if (!localStorage.getItem(KEYS.fertilizers)) {
      set(KEYS.fertilizers, seedFertilizers);
    }
    if (!localStorage.getItem(KEYS.cultures)) {
      set(KEYS.cultures, seedCultures.length ? seedCultures : defaultCultures);
    }
  };

  window.AppStorage = {
    KEYS,
    ensureBase,
    getFertilizers: () =>
      get(KEYS.fertilizers, []).map((item) => ({
        ...item,
        active: item.active !== false
      })),
    setFertilizers: (items) => set(KEYS.fertilizers, items),
    getManufacturers: () => get(KEYS.manufacturers, defaultManufacturers),
    setManufacturers: (items) => set(KEYS.manufacturers, items),
    getCultures: () => get(KEYS.cultures, defaultCultures),
    setCultures: (items) => set(KEYS.cultures, items)
  };
})();
