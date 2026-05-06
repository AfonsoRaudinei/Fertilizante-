(() => {
  const parseBRL = (text) => {
    const raw = String(text || "").replace(/[R$\s]/g, "").trim();
    if (!raw) return null;
    if (raw === "-" || raw === "--") return 0;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    let normalized = raw;

    if (hasComma && hasDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      normalized = raw.replace(",", ".");
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const detectNutrients = (nameRaw) => {
    const name = String(nameRaw || "").toUpperCase();
    const npkMatch = name.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})/);
    if (npkMatch) {
      const n = Number(npkMatch[1]);
      const p = Number(npkMatch[2]);
      const k = Number(npkMatch[3]);
      return { nutrients: [{ type: "N", value: n }, { type: "P₂O₅", value: p }, { type: "K₂O", value: k }, { type: "S", value: 0 }], needsReview: false };
    }

    const kcl = name.match(/KCL[^\d]*(\d{1,2})/);
    if (kcl) return { nutrients: [{ type: "N", value: 0 }, { type: "P₂O₅", value: 0 }, { type: "K₂O", value: Number(kcl[1]) }, { type: "S", value: 0 }], needsReview: false };

    const tsp = name.match(/TSP[^\d]*(\d{1,2})/);
    if (tsp) return { nutrients: [{ type: "N", value: 0 }, { type: "P₂O₅", value: Number(tsp[1]) }, { type: "K₂O", value: 0 }, { type: "S", value: 0 }], needsReview: false };

    const ssp = name.match(/SSP[^\d]*(\d{1,2})/);
    if (ssp) return { nutrients: [{ type: "N", value: 0 }, { type: "P₂O₅", value: Number(ssp[1]) }, { type: "K₂O", value: 0 }, { type: "S", value: 0 }], needsReview: false };

    const ureia = name.match(/UREIA[^\d]*(\d{1,2}(?:[.,]\d+)?)/);
    if (ureia) return { nutrients: [{ type: "N", value: Number(String(ureia[1]).replace(",", ".")) }, { type: "P₂O₅", value: 0 }, { type: "K₂O", value: 0 }, { type: "S", value: 0 }], needsReview: false };

    const sam = name.match(/(?:SAM|SULFATO\s*DE\s*AM[ÔO]NIO)[^\d]*(\d{1,2}(?:[.,]\d+)?)\s*[/]\s*(\d{1,2}(?:[.,]\d+)?)/);
    if (sam)
      return {
        nutrients: [
          { type: "N", value: Number(String(sam[1]).replace(",", ".")) },
          { type: "P₂O₅", value: 0 },
          { type: "K₂O", value: 0 },
          { type: "S", value: Number(String(sam[2]).replace(",", ".")) }
        ],
        needsReview: false
      };

    return { nutrients: [], needsReview: true };
  };

  const duplicateCheck = (candidate, existing) =>
    existing.some(
      (item) =>
        String(item.manufacturer || "").toLowerCase() === String(candidate.manufacturer || "").toLowerCase() &&
        String(item.name || "").toLowerCase() === String(candidate.name || "").toLowerCase() &&
        String(item.delivery || "").toLowerCase() === String(candidate.delivery || "").toLowerCase()
    );

  window.ImportParser = {
    parseBRL,
    detectNutrients,
    duplicateCheck,
    keyOf: (item) =>
      `${String(item.manufacturer || "").toLowerCase()}::${String(item.name || "").toLowerCase()}::${String(item.delivery || "").toLowerCase()}`
  };
})();
