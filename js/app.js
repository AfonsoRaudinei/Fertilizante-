(() => {
  const menuToggle = document.getElementById("menu-toggle");
  const sidePanel = document.getElementById("side-panel");
  const backdrop = document.getElementById("backdrop");

  if (!menuToggle || !sidePanel || !backdrop) return;

  const closeAll = () => {
    sidePanel.classList.remove("open");
    sidePanel.setAttribute("aria-hidden", "true");
    window.AppEvents.closeSheet();
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
    window.AppEvents.bind();
    window.AppEvents.loadDraft();
    window.AppRouter.start();
  };

  boot();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("/service-worker.js");
      } catch (error) {
        console.error("Service Worker registration failed", error);
      }
    });
  }
})();
