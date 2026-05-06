(() => {
  const menuToggle = document.getElementById("menu-toggle");
  const sidePanel = document.getElementById("side-panel");
  const backdrop = document.getElementById("backdrop");

  if (!menuToggle || !sidePanel || !backdrop) return;

  const closeAll = () => {
    sidePanel.classList.remove("open");
    sidePanel.setAttribute("aria-hidden", "true");
    if (window.AppEvents?.closeSheet) {
      window.AppEvents.closeSheet();
    }
    const importSheet = document.getElementById("import-sheet");
    if (importSheet) {
      importSheet.classList.remove("open");
      importSheet.setAttribute("aria-hidden", "true");
    }
    backdrop.hidden = true;
  };

  const openMenu = () => {
    sidePanel.classList.add("open");
    sidePanel.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
  };

  const sectionMap = {
    fertilizers: "section-fertilizers",
    freights: "section-freights",
    manufacturers: "section-manufacturers",
    cultures: "section-cultures",
    settings: "section-settings"
  };
  const sectionLabels = {
    fertilizers: "Fertilizantes",
    freights: "Fretes",
    manufacturers: "Fabricantes",
    cultures: "Culturas",
    settings: "Configurações"
  };

  const activateSection = (section) => {
    const key = sectionMap[section] ? section : "fertilizers";
    Object.values(sectionMap).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = id !== sectionMap[key];
    });
    document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.section === key);
    });
    const sectionTitle = document.getElementById("current-section-title");
    if (sectionTitle) sectionTitle.textContent = sectionLabels[key];
    if (window.AppEvents?.onSectionChange) window.AppEvents.onSectionChange(key);
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = sidePanel.classList.contains("open");
    if (isOpen) {
      sidePanel.classList.remove("open");
      sidePanel.setAttribute("aria-hidden", "true");
      if (!document.getElementById("fert-sheet").classList.contains("open") && !document.getElementById("import-sheet").classList.contains("open")) {
        backdrop.hidden = true;
      }
      return;
    }
    openMenu();
  });

  document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activateSection(btn.dataset.section);
      closeAll();
    });
  });

  backdrop.addEventListener("click", closeAll);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  const boot = async () => {
    await window.AppStorage.ensureBase();
    window.AppUI.renderManufacturers(window.AppStorage.getManufacturers());
    window.AppUI.renderCards(window.AppStorage.getFertilizers());
    window.AppUI.renderCultures(window.AppStorage.getCultures());
    activateSection("fertilizers");
    if (window.AppEvents?.bind) window.AppEvents.bind();
    if (window.AppEvents?.loadDraft) window.AppEvents.loadDraft();
    // Router remains optional; section activation is handled here to avoid dead menu states.
    if (window.AppRouter?.start) window.AppRouter.start();
  };

  boot();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("./service-worker.js");
      } catch (error) {
        console.error("Service Worker registration failed", error);
      }
    });
  }
})();
