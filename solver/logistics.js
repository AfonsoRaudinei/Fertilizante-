(() => {
  const toTon = (kgPerHa) => Number(kgPerHa || 0) / 1000;

  const totals = (plan) => {
    return plan.reduce(
      (acc, item) => {
        const ton = toTon(item.kgPerHa);
        acc.tonPerHa += ton;
        acc.costPerHa += ton * Number(item.fertilizer.price || 0);
        acc.freightPerHa += ton * Number(item.fertilizer.freight || 0);
        return acc;
      },
      { tonPerHa: 0, costPerHa: 0, freightPerHa: 0 }
    );
  };

  window.SolverLogistics = {
    totals,
    toTon
  };
})();
