(() => {
  const KNOWLEDGE_FILES = [
    "./knowledge/culturas.md",
    "./knowledge/comportamento.md",
    "./knowledge/fertilizantes.md",
    "./knowledge/restricoes.md"
  ];

  const readKnowledge = async () => {
    const chunks = [];
    for (const file of KNOWLEDGE_FILES) {
      try {
        const content = await fetch(`${file}?v=5`).then((r) => r.text());
        chunks.push(`## ${file}\n${content.slice(0, 2500)}`);
      } catch {
        chunks.push(`## ${file}\n(indisponivel)`);
      }
    }
    return chunks.join("\n\n");
  };

  const buildSolverSnapshot = (winner, formInput) => {
    if (!winner) return "Sem resultado do solver para interpretar.";

    const plan = winner.plan
      .map((item) => `${item.fertilizer.name}: ${Number(item.kgPerHa).toFixed(2)} kg/ha`)
      .join("; ");

    return [
      `Cultura: ${formInput.culture}`,
      `Nutriente principal: ${formInput.principalNutrient}`,
      `Metas NPK (kg/ha): N=${formInput.targets.N}, P2O5=${formInput.targets['P₂O₅']}, K2O=${formInput.targets['K₂O']}`,
      `Plano vencedor: ${plan}`,
      `Tonelada/ha: ${Number(winner.totals.tonPerHa).toFixed(3)}`,
      `Custo/ha: ${Number(winner.totals.costPerHa).toFixed(2)}`,
      `Frete/ha: ${Number(winner.totals.freightPerHa).toFixed(2)}`,
      `Atingido NPK: N=${winner.contribution.N.toFixed(2)}, P2O5=${winner.contribution['P₂O₅'].toFixed(2)}, K2O=${winner.contribution['K₂O'].toFixed(2)}`
    ].join("\n");
  };

  window.AIContextBuilder = {
    readKnowledge,
    buildSolverSnapshot
  };
})();
