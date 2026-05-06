(() => {
  const SECTION_MAP = {
    fertilizers: "section-fertilizers",
    freights: "section-freights",
    manufacturers: "section-manufacturers",
    cultures: "section-cultures",
    settings: "section-settings"
  };
  const LABEL_MAP = {
    fertilizers: "Fertilizantes",
    freights: "Fretes",
    manufacturers: "Fabricantes",
    cultures: "Culturas",
    settings: "Configurações"
  };

  const setActive = (section) => {
    const key = SECTION_MAP[section] ? section : "fertilizers";
    Object.values(SECTION_MAP).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = id !== SECTION_MAP[key];
    });

    document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.section === key);
    });

    const title = document.getElementById("current-section-title");
    if (title) title.textContent = LABEL_MAP[key];

    if (window.AppEvents?.onSectionChange) {
      window.AppEvents.onSectionChange(key);
    }
  };

  const start = () => {
    document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActive(btn.dataset.section);
      });
    });
    setActive("fertilizers");
  };

  window.AppRouter = {
    start,
    setActive
  };
})();
