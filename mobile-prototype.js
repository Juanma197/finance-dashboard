/**
 * Wealth OS Mobile Prototype
 * Tab switching, FAB, and demo interactions
 */

(function () {
  const TAB_LABELS = {
    home: "Home",
    accounts: "Accounts",
    activity: "Activity",
    goals: "Goals",
    more: "More",
  };

  const screens = document.querySelectorAll(".screen");
  const navTabs = document.querySelectorAll(".nav-tab");
  const headerSubtitle = document.getElementById("headerSubtitle");
  const fabTrigger = document.getElementById("fabTrigger");
  const fabMenu = document.getElementById("fabMenu");

  /**
   * Show a screen by tab id
   */
  function showScreen(tabId) {
    screens.forEach((s) => s.classList.remove("active"));
    const screen = document.getElementById("screen-" + tabId);
    if (screen) screen.classList.add("active");

    navTabs.forEach((t) => t.classList.remove("active"));
    const tab = document.querySelector('.nav-tab[data-tab="' + tabId + '"]');
    if (tab) tab.classList.add("active");

    if (headerSubtitle) {
      headerSubtitle.textContent = TAB_LABELS[tabId] || tabId;
    }
  }

  /**
   * Bottom nav tab switching
   */
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      if (tabId) showScreen(tabId);
    });
  });

  /**
   * FAB: open/close action menu
   */
  if (fabTrigger && fabMenu) {
    fabTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      fabMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      fabMenu.classList.add("hidden");
    });

    fabMenu.querySelectorAll(".fab-action").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        fabMenu.classList.add("hidden");
        handleFabAction(action);
      });
    });
  }

  /**
   * Handle FAB action (demo: log; full app would open modal)
   */
  function handleFabAction(action) {
    const labels = {
      transaction: "Add Transaction",
      account: "Add Account",
      goal: "Add Goal",
      snapshot: "Add Snapshot",
      reminder: "Add Reminder",
    };
    const label = labels[action] || action;
    console.log("FAB action:", label);
  }

  /**
   * "See all" link on Home -> Activity
   */
  document.querySelectorAll(".link-btn[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.go;
      if (target) showScreen(target);
    });
  });

  /**
   * Filter chips on Activity screen
   */
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.closest(".filter-chips")?.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  /**
   * More screen cards (demo: log; full app would navigate)
   */
  document.querySelectorAll(".more-card").forEach((card) => {
    card.addEventListener("click", () => {
      const label = card.querySelector(".more-label")?.textContent;
      console.log("More:", label);
    });
  });

  /**
   * Initialize: ensure Home is active
   */
  showScreen("home");
})();
