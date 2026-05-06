(() => {
  const WEIGHTS = {
    nutritionError: 40,
    costPerHa: 30,
    freightPerHa: 15,
    leftovers: 10,
    productCount: 5
  };

  const norm = (value, min, max) => {
    if (max === min) return 0;
    return (value - min) / (max - min);
  };

  const rank = (candidates) => {
    if (!candidates.length) return [];

    const keys = Object.keys(WEIGHTS);
    const ranges = {};

    for (const key of keys) {
      const values = candidates.map((c) => c.metrics[key]);
      ranges[key] = { min: Math.min(...values), max: Math.max(...values) };
    }

    return candidates
      .map((candidate) => {
        const score = keys.reduce((sum, key) => {
          const normalized = norm(candidate.metrics[key], ranges[key].min, ranges[key].max);
          return sum + normalized * WEIGHTS[key];
        }, 0);

        return { ...candidate, internalScore: score };
      })
      .sort((a, b) => a.internalScore - b.internalScore);
  };

  window.SolverRanking = {
    rank
  };
})();
