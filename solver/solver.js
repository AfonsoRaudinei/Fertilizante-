(() => {
  const { CORE, nutrientValue, requiredKgPerHa, applyContribution } = window.SolverFormulas;

  const emptyContribution = () => ({ N: 0, "P₂O₅": 0, "K₂O": 0 });

  const sumProductPlan = (items) => {
    const map = new Map();
    for (const item of items) {
      if (item.kgPerHa <= 0) continue;
      const key = `${item.fertilizer.name}::${item.fertilizer.manufacturer || ""}`;
      const current = map.get(key) || { fertilizer: item.fertilizer, kgPerHa: 0 };
      current.kgPerHa += item.kgPerHa;
      map.set(key, current);
    }
    return [...map.values()];
  };

  const evaluatePlan = (plan, targets) => {
    const totals = window.SolverLogistics.totals(plan);
    const contrib = emptyContribution();

    for (const item of plan) {
      applyContribution(contrib, item.fertilizer, item.kgPerHa);
    }

    const nutritionError = CORE.reduce((sum, n) => sum + Math.abs(Number(targets[n] || 0) - contrib[n]), 0);
    const leftovers = CORE.reduce((sum, n) => sum + Math.max(0, contrib[n] - Number(targets[n] || 0)), 0);

    return {
      plan,
      contribution: contrib,
      metrics: {
        nutritionError,
        costPerHa: totals.costPerHa,
        freightPerHa: totals.freightPerHa,
        leftovers,
        productCount: plan.length
      },
      totals
    };
  };

  const buildCandidates = (fertilizers, targets, principalNutrient, maxProducts) => {
    const principalTarget = Number(targets[principalNutrient] || 0);
    if (principalTarget <= 0) return [];

    const primaryOptions = fertilizers.filter((f) => nutrientValue(f, principalNutrient) > 0);
    const candidates = [];

    for (const primary of primaryOptions) {
      const primaryDose = requiredKgPerHa(principalTarget, nutrientValue(primary, principalNutrient));
      if (primaryDose <= 0) continue;

      const baseContribution = emptyContribution();
      applyContribution(baseContribution, primary, primaryDose);

      const secondaries = CORE.filter((n) => n !== principalNutrient);
      const optionsByNutrient = secondaries.map((nutrient) => {
        const deficit = Math.max(0, Number(targets[nutrient] || 0) - baseContribution[nutrient]);
        if (deficit <= 0) return [{ fertilizer: null, kgPerHa: 0 }];

        return fertilizers
          .filter((f) => nutrientValue(f, nutrient) > 0)
          .map((f) => ({
            fertilizer: f,
            kgPerHa: requiredKgPerHa(deficit, nutrientValue(f, nutrient))
          }));
      });

      for (const optA of optionsByNutrient[0] || [{ fertilizer: null, kgPerHa: 0 }]) {
        for (const optB of optionsByNutrient[1] || [{ fertilizer: null, kgPerHa: 0 }]) {
          const rawPlan = [
            { fertilizer: primary, kgPerHa: primaryDose },
            ...(optA.fertilizer ? [optA] : []),
            ...(optB.fertilizer ? [optB] : [])
          ];

          const plan = sumProductPlan(rawPlan);
          if (plan.length > maxProducts) continue;
          const candidate = evaluatePlan(plan, targets);
          candidates.push(candidate);
        }
      }
    }

    return candidates;
  };

  const byCriterion = (criterion) => {
    if (criterion === "cost") return "costPerHa";
    if (criterion === "freight") return "freightPerHa";
    if (criterion === "nutrition") return "nutritionError";
    return "internalScore";
  };

  const solve = ({ fertilizers, targets, principalNutrient, maxProducts = 3, criterion = "balanced", limit = 3 }) => {
    if (!Array.isArray(fertilizers) || fertilizers.length === 0) return null;

    const validTargets = {
      N: Number(targets.N || 0),
      "P₂O₅": Number(targets["P₂O₅"] || 0),
      "K₂O": Number(targets["K₂O"] || 0)
    };

    const candidates = buildCandidates(fertilizers, validTargets, principalNutrient, Number(maxProducts || 3));
    const ranked = window.SolverRanking.rank(candidates);
    if (!ranked.length) return null;

    const metric = byCriterion(criterion);
    const winners = [...ranked].sort((a, b) => Number(a[metric] ?? a.metrics[metric]) - Number(b[metric] ?? b.metrics[metric]));

    const show = Math.max(1, Number(limit || 1));

    return {
      best: winners[0],
      winners: winners.slice(0, show),
      internalRanking: ranked
    };
  };

  window.AppSolver = {
    solve,
    _private: {
      buildCandidates,
      evaluatePlan,
      sumProductPlan
    }
  };
})();
