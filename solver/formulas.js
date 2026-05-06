(() => {
  const CORE = ["N", "P₂O₅", "K₂O"];

  const nutrientValue = (fertilizer, nutrient) => {
    const found = (fertilizer.nutrients || []).find((n) => n.type === nutrient);
    return Number(found?.value || 0);
  };

  const requiredKgPerHa = (targetKgHa, nutrientPercent) => {
    const pct = Number(nutrientPercent || 0);
    const target = Number(targetKgHa || 0);
    if (pct <= 0 || target <= 0) return 0;
    return (100 * target) / pct;
  };

  const applyContribution = (bucket, fertilizer, kgPerHa) => {
    for (const nutrient of CORE) {
      const pct = nutrientValue(fertilizer, nutrient);
      bucket[nutrient] += (kgPerHa * pct) / 100;
    }
  };

  window.SolverFormulas = {
    CORE,
    nutrientValue,
    requiredKgPerHa,
    applyContribution
  };
})();
