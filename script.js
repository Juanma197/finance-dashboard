/**
 * Wealth OS Dashboard - Main Script
 * Account-based architecture: all financial totals derived from accounts
 * Plain HTML, CSS, JavaScript only - no frameworks
 */

/* ========== Storage Keys ========== */
const KEYS = {
  onboardingCompleted: "wealth-os-onboarding-completed",
  demoDataLoaded: "wealth-os-demo-data-loaded",
  setupChecklistHidden: "wealth-os-setup-checklist-hidden",
  accounts: "wealth-os-accounts",
  transactions: "wealth-os-transactions",
  investments: "wealth-os-investments",
  properties: "wealth-os-properties",
  liabilities: "wealth-os-liabilities",
  insurance: "wealth-os-insurance",
  recurring: "wealth-os-recurring",
  business: "wealth-os-business",
  tax: "wealth-os-tax",
  goals: "wealth-os-goals",
  settings: "wealth-os-settings",
  netWorthSnapshots: "wealth-os-networth-snapshots",
  monthlySnapshots: "wealth-os-monthly-snapshots",
  transfers: "wealth-os-transfers",
  reminders: "wealth-os-reminders",
  ukAllowances: "wealth-os-uk-allowances",
};

/* ========== Demo Data ==========
 * Realistic sample data for first-time exploration. User can clear it later.
 */
function getDemoData() {
  const today = getTodayStr();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);
  return {
    accounts: [
      { id: 1, name: "Current Account", type: "Cash", balance: 4200, notes: "" },
      { id: 2, name: "Savings", type: "Cash", balance: 8500, notes: "" },
      { id: 3, name: "Stocks & Shares ISA", type: "Investment", balance: 12000, notes: "" },
    ],
    transactions: [
      { id: 1, description: "Monthly salary", amount: 3200, category: "Salary", date: today, accountId: 1, contributionType: "" },
      { id: 2, description: "Groceries", amount: -120, category: "Food", date: today, accountId: 1, contributionType: "" },
      { id: 3, description: "ISA contribution", amount: -200, category: "Other", date: today, accountId: 1, contributionType: "investment" },
      { id: 4, description: "Rent", amount: -950, category: "Bills", date: today, accountId: 1, contributionType: "" },
      { id: 5, description: "Coffee", amount: -4.5, category: "Food", date: today, accountId: null, contributionType: "" },
    ],
    settings: { monthlySalary: 3200, essentialExpenses: 1800, emergencyMonths: 6, theme: "dark", annualExpenses: 24000, fireMultiplier: 25, targetPassive: 0 },
    goals: [{ id: 1, name: "Emergency fund", target: 10800, current: 5000, monthly: 300 }],
    reminders: [{ id: 1, title: "Payday", type: "Payday", date: today }],
    ukAllowances: { lisaYTD: 0, isaYTD: 0, pensionYTD: 0, studentLoanBalance: 0, studentLoanMonthly: 0 },
    monthlySnapshots: [{
      month: lastMonthStr,
      netWorth: 24000,
      cash: 12000,
      investments: 11000,
      realEstate: 0,
      business: 0,
      liabilities: 0,
      income: 3200,
      expenses: 1400,
    }],
  };
}

const CF_CATEGORIES = ["Salary", "Food", "Transport", "Bills", "Shopping", "Entertainment", "Business", "Other"];
const CONTRIBUTION_TYPES = [
  { value: "", label: "Regular" },
  { value: "investment", label: "Investment" },
  { value: "pension", label: "Pension" },
  { value: "emergency", label: "Emergency fund" },
  { value: "debt", label: "Debt payment" },
  { value: "property", label: "Property" },
];

const INVESTMENT_TYPES = [
  { key: "emergencyFund", label: "Emergency Fund" },
  { key: "lisa", label: "LISA" },
  { key: "stocksIsa", label: "Stocks & Shares ISA" },
  { key: "pension", label: "Pension" },
  { key: "other", label: "Other Investments" },
];

const LIABILITY_TYPES = ["Student Loan", "Mortgage", "Credit Card", "Personal Loan", "Car Loan", "Business Loan", "Other"];

/**
 * Account types for the account-based architecture.
 * Cash = bank accounts, cash on hand
 * Investment + Retirement = ISA, pension, stocks (both count as "Investments" total)
 * Real Estate = property equity
 * Business = business cash/assets
 * Liability = debts (balance stored as positive, subtracted from net worth)
 */
const ACCOUNT_TYPES = ["Cash", "Investment", "Retirement", "Real Estate", "Business", "Liability"];

/* ========== State ========== */
let accounts = [];
let transactions = [];
let investments = {};
let properties = [];
let liabilities = [];
let insurance = [];
let recurring = [];
let business = { income: 0, expenses: 0, cashBalance: 0, taxReserve: 0, notes: "" };
let tax = { personalTax: 0, businessTax: 0, setAside: 0, deadline: "" };
let goals = [];
let settings = { monthlySalary: 0, essentialExpenses: 0, emergencyMonths: 6, theme: "dark", annualExpenses: 0, fireMultiplier: 25, targetPassive: 0 };
let netWorthSnapshots = [];
let monthlySnapshots = []; /* { month, netWorth, cash, investments, realEstate, business, liabilities, income, expenses } */
let transfers = [];
let reminders = [];
let ukAllowances = { lisaYTD: 0, isaYTD: 0, pensionYTD: 0, studentLoanBalance: 0, studentLoanMonthly: 0 };

/* Chart.js instances (destroy before re-create) */
let chartNetWorth = null;
let chartInvestments = null;
let chartMonthlyInOut = null;
let chartAssetsLiab = null;

/* ========== Utilities ========== */
function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return "£" + Math.abs(amount).toFixed(2);
}

function escapeHtml(text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function safeNum(val, fallback) {
  const n = Number(val);
  return (val !== "" && val != null && !isNaN(n)) ? n : (fallback ?? 0);
}

/* ========== LocalStorage Safety ==========
 * Centralized read/write with fallbacks for missing or malformed data.
 * Avoids silent failures; returns defaults on parse errors.
 */
function storageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function storageWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ========== Validation Helpers ========== */
function showValidationError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let err = el.parentElement?.querySelector(".validation-error");
  if (err) err.remove();
  if (message) {
    err = document.createElement("span");
    err.className = "validation-error";
    err.textContent = message;
    el.parentElement?.appendChild(err);
  }
}

function emptyState(title, text, actionLabel, actionId) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `
    <div class="empty-state-title">${escapeHtml(title)}</div>
    <div class="empty-state-text">${escapeHtml(text)}</div>
    ${actionId ? `<div class="empty-state-action"><button type="button" class="quick-action-btn" id="${actionId}">${escapeHtml(actionLabel)}</button></div>` : ""}
  `;
  return div;
}

/* ========== Section Navigation ========== */
const SECTIONS = ["overview", "accounts", "cash-flow", "investments", "real-estate", "liabilities", "business", "tax", "goals", "analytics", "insights", "uk-planning", "settings"];
const SECTION_TITLES = {
  overview: "Overview",
  accounts: "Accounts",
  "cash-flow": "Cash Flow",
  investments: "Investments",
  "real-estate": "Real Estate",
  liabilities: "Liabilities",
  business: "Business",
  tax: "Tax",
  goals: "Goals",
  analytics: "Analytics",
  insights: "Insights",
  "uk-planning": "UK Planning",
  settings: "Settings",
};

function closeMobileSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.add("hidden");
}

function openMobileSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  const overlay = document.getElementById("sidebarOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
  }
}

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const headerSubtitle = document.getElementById("headerSubtitle");

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (!sectionId) return;

      navItems.forEach((n) => n.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
      const section = document.getElementById(sectionId);
      if (section) section.classList.add("active");

      headerSubtitle.textContent = SECTION_TITLES[sectionId] || sectionId;

      closeMobileSidebar();

      if (sectionId === "cash-flow") { renderCashFlowSection(); renderInsuranceRecurringSection(); renderTransferList(); }
      if (sectionId === "overview") { renderOverviewSection(); updateAllCharts(); }
      if (sectionId === "accounts") renderAccountsSection();
      if (sectionId === "investments") renderInvestmentsSection();
      if (sectionId === "real-estate") renderRealEstateSection();
      if (sectionId === "liabilities") renderLiabilitiesSection();
      if (sectionId === "analytics") { renderAnalyticsSection(); updateAnalyticsCharts(); }
      if (sectionId === "insights") renderInsightsSection();
      if (sectionId === "uk-planning") renderUKSection();
      if (sectionId === "settings") renderSettingsSection();
    });
  });
}

function initMobileMenu() {
  const btn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  btn?.addEventListener("click", () => {
    if (sidebar?.classList.contains("open")) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  overlay?.addEventListener("click", () => closeMobileSidebar());
}

function switchToSection(sectionId, focusSelector) {
  const btn = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (btn) btn.click();
  if (focusSelector) {
    setTimeout(() => {
      const el = document.querySelector(focusSelector);
      el?.focus?.();
      el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 100);
  }
}

/* ========== Onboarding ==========
 * First-run flow: welcome, choose blank/demo, optional guided steps.
 * Stored in localStorage. Can be reopened from Settings.
 */
function isFirstRun() {
  return localStorage.getItem(KEYS.onboardingCompleted) !== "1";
}

function completeOnboarding() {
  localStorage.setItem(KEYS.onboardingCompleted, "1");
}

function loadDemoData() {
  const demo = getDemoData();
  accounts = demo.accounts;
  transactions = demo.transactions;
  settings = { ...settings, ...demo.settings };
  goals = demo.goals;
  reminders = demo.reminders;
  ukAllowances = { ...ukAllowances, ...demo.ukAllowances };
  monthlySnapshots = demo.monthlySnapshots || [];
  localStorage.setItem(KEYS.demoDataLoaded, "1");
  saveAccounts();
  saveTransactions();
  saveSettings();
  saveGoals();
  saveReminders();
  saveUkAllowances();
  storageWrite(KEYS.monthlySnapshots, monthlySnapshots);
}

function clearDemoData() {
  accounts = [];
  transactions = [];
  goals = [];
  reminders = [];
  monthlySnapshots = [];
  transfers = [];
  settings = { monthlySalary: 0, essentialExpenses: 0, emergencyMonths: 6, theme: "dark", annualExpenses: 0, fireMultiplier: 25, targetPassive: 0 };
  localStorage.removeItem(KEYS.demoDataLoaded);
  saveAccounts();
  saveTransactions();
  saveGoals();
  saveReminders();
  storageWrite(KEYS.monthlySnapshots, []);
  storageWrite(KEYS.transfers, []);
  saveSettings();
  alert("Demo data cleared. Start fresh with your own data.");
  location.reload();
}

function initOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  const skipBtn = document.getElementById("onboardSkip");
  const step1 = document.getElementById("onboardingStep1");
  const step2 = document.getElementById("onboardingStep2");
  const step3 = document.getElementById("onboardingStep3");
  const step4 = document.getElementById("onboardingStep4");
  const step5 = document.getElementById("onboardingStep5");
  const step6 = document.getElementById("onboardingStep6");

  function showStep(stepEl) {
    [step1, step2, step3, step4, step5, step6].forEach((s) => s?.classList.add("hidden"));
    stepEl?.classList.remove("hidden");
  }

  function finish() {
    completeOnboarding();
    overlay?.classList.add("hidden");
    renderOverviewSection();
    renderAccountsSection();
    renderCashFlowSection();
    renderGoalsSection();
  }

  document.getElementById("onboardStartBlank")?.addEventListener("click", () => {
    completeOnboarding();
    overlay?.classList.add("hidden");
  });

  document.getElementById("onboardStartDemo")?.addEventListener("click", () => {
    loadDemoData();
    completeOnboarding();
    overlay?.classList.add("hidden");
    renderOverviewSection();
    renderAccountsSection();
    renderCashFlowSection();
    renderGoalsSection();
    renderUKSection();
    updateAllCharts();
  });

  document.getElementById("onboardAddAccount")?.addEventListener("click", () => {
    overlay?.classList.add("hidden");
    completeOnboarding();
    switchToSection("accounts");
    setTimeout(() => openAccountForm(), 200);
  });

  document.getElementById("onboardGoSettings")?.addEventListener("click", () => {
    overlay?.classList.add("hidden");
    completeOnboarding();
    switchToSection("settings");
  });

  document.getElementById("onboardAddGoal")?.addEventListener("click", () => {
    overlay?.classList.add("hidden");
    completeOnboarding();
    switchToSection("goals");
    setTimeout(() => document.getElementById("goalsAdd")?.click(), 200);
  });

  document.getElementById("onboardAddTransaction")?.addEventListener("click", () => {
    overlay?.classList.add("hidden");
    completeOnboarding();
    switchToSection("cash-flow", "#cfDescription");
  });

  document.getElementById("onboardAddSnapshot")?.addEventListener("click", () => {
    overlay?.classList.add("hidden");
    completeOnboarding();
    document.getElementById("snapshotCreateCurrent")?.click();
  });

  document.getElementById("onboardFinish")?.addEventListener("click", finish);

  skipBtn?.addEventListener("click", () => {
    completeOnboarding();
    overlay?.classList.add("hidden");
  });

  if (isFirstRun()) overlay?.classList.remove("hidden");
}

/* ========== Setup Checklist ==========
 * Shows progress on Overview. Hides when mostly complete or minimized.
 */
const SETUP_ITEMS = [
  { id: "account", label: "Add first account", check: () => accounts.length > 0, action: () => { switchToSection("accounts"); openAccountForm(); } },
  { id: "transaction", label: "Add first transaction", check: () => transactions.length > 0, action: () => switchToSection("cash-flow", "#cfDescription") },
  { id: "emergency", label: "Set emergency fund target", check: () => (Number(settings.essentialExpenses) || 0) > 0 && (Number(settings.emergencyMonths) || 0) > 0, action: () => switchToSection("settings") },
  { id: "goal", label: "Add first goal", check: () => goals.length > 0, action: () => { switchToSection("goals"); document.getElementById("goalsAdd")?.click(); } },
  { id: "uk", label: "Set UK wrappers", check: () => (Number(ukAllowances.isaYTD) || 0) > 0 || (Number(ukAllowances.lisaYTD) || 0) > 0 || (Number(ukAllowances.pensionYTD) || 0) > 0, action: () => switchToSection("uk-planning") },
  { id: "reminder", label: "Add first reminder", check: () => reminders.length > 0, action: () => { switchToSection("overview"); document.getElementById("reminderAdd")?.click(); } },
  { id: "snapshot", label: "Create first snapshot", check: () => monthlySnapshots.length > 0, action: () => document.getElementById("snapshotCreateCurrent")?.click() },
];

function renderSetupChecklist() {
  const wrapper = document.getElementById("setupChecklistWrapper");
  const list = document.getElementById("setupChecklist");
  const progressEl = document.getElementById("setupProgress");
  if (!wrapper || !list) return;

  const hidden = localStorage.getItem(KEYS.setupChecklistHidden) === "1";
  const done = SETUP_ITEMS.filter((i) => i.check()).length;
  const total = SETUP_ITEMS.length;

  if (hidden || done >= total) {
    wrapper.classList.add("hidden");
    return;
  }

  wrapper.classList.remove("hidden");
  if (progressEl) progressEl.textContent = `${done}/${total}`;
  list.innerHTML = "";

  SETUP_ITEMS.forEach((item) => {
    const isDone = item.check();
    const li = document.createElement("button");
    li.type = "button";
    li.className = "setup-item" + (isDone ? " done" : "");
    li.innerHTML = `<span class="setup-icon">${isDone ? "✓" : "○"}</span><span>${escapeHtml(item.label)}</span>`;
    if (!isDone) li.addEventListener("click", () => item.action());
    list.appendChild(li);
  });

}

function initSetupChecklist() {
  document.getElementById("setupChecklistMinimize")?.addEventListener("click", () => {
    localStorage.setItem(KEYS.setupChecklistHidden, "1");
    document.getElementById("setupChecklistWrapper")?.classList.add("hidden");
  });
}

function initQuickActions() {
  document.querySelectorAll(".quick-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.quick;
      if (action === "transaction") {
        switchToSection("cash-flow", "#cfDescription");
      } else if (action === "account") {
        switchToSection("accounts");
        setTimeout(() => openAccountForm(), 150);
      } else if (action === "goal") {
        switchToSection("goals");
        setTimeout(() => document.getElementById("goalsAdd")?.click(), 150);
      } else if (action === "snapshot") {
        switchToSection("overview");
        setTimeout(() => document.getElementById("snapshotCreateCurrent")?.click(), 200);
      } else if (action === "reminder") {
        switchToSection("overview");
        setTimeout(() => document.getElementById("reminderAdd")?.click(), 150);
      }
    });
  });
}

/* ========== Load / Save ========== */
function loadAll() {
  // Transactions first (needed for migration)
  let t = localStorage.getItem(KEYS.transactions);
  if (!t) t = localStorage.getItem("finance-dashboard-transactions"); // legacy
  if (t) {
    try {
      transactions = JSON.parse(t);
      // Add date field if missing (legacy data)
      transactions.forEach((tr) => {
        if (!tr.date) tr.date = getTodayStr();
        if (tr.accountId === undefined) tr.accountId = null;
        if (tr.contributionType === undefined) tr.contributionType = "";
      });
    } catch (e) {
      transactions = [];
    }
  }
  transactions = Array.isArray(transactions) ? transactions : [];

  // Investments
  const inv = localStorage.getItem(KEYS.investments);
  if (inv) {
    try {
      investments = JSON.parse(inv);
    } catch (e) {
      investments = {};
    }
  }
  INVESTMENT_TYPES.forEach(({ key }) => {
    if (!investments[key]) {
      investments[key] = { value: 0, monthly: 0, target: 0 };
    }
  });

  // Properties
  const p = localStorage.getItem(KEYS.properties);
  if (p) {
    try {
      properties = JSON.parse(p);
    } catch (e) {
      properties = [];
    }
  }

  // Liabilities
  const liab = localStorage.getItem(KEYS.liabilities);
  if (liab) {
    try {
      liabilities = JSON.parse(liab);
    } catch (e) {
      liabilities = [];
    }
  }

  // Insurance
  const ins = localStorage.getItem(KEYS.insurance);
  if (ins) {
    try {
      insurance = JSON.parse(ins);
    } catch (e) {
      insurance = [];
    }
  }

  // Recurring obligations
  const rec = localStorage.getItem(KEYS.recurring);
  if (rec) {
    try {
      recurring = JSON.parse(rec);
    } catch (e) {
      recurring = [];
    }
  }

  // Business
  const b = localStorage.getItem(KEYS.business);
  if (b) {
    try {
      business = { ...business, ...JSON.parse(b) };
    } catch (e) {}
  }

  // Tax
  const tx = localStorage.getItem(KEYS.tax);
  if (tx) {
    try {
      tax = { ...tax, ...JSON.parse(tx) };
    } catch (e) {}
  }

  // Goals
  const g = localStorage.getItem(KEYS.goals);
  if (g) {
    try {
      goals = JSON.parse(g);
    } catch (e) {
      goals = [];
    }
  }

  // Settings
  const s = localStorage.getItem(KEYS.settings);
  if (s) {
    try {
      settings = { ...settings, ...JSON.parse(s) };
    } catch (e) {}
  }

  // Net worth snapshots (legacy)
  const nw = localStorage.getItem(KEYS.netWorthSnapshots);
  if (nw) {
    try {
      netWorthSnapshots = JSON.parse(nw);
    } catch (e) {
      netWorthSnapshots = [];
    }
  }

  // Monthly snapshots (full snapshot structure: month, netWorth, cash, investments, realEstate, business, liabilities, income, expenses)
  const ms = localStorage.getItem(KEYS.monthlySnapshots);
  if (ms) {
    try {
      monthlySnapshots = JSON.parse(ms);
    } catch (e) {
      monthlySnapshots = [];
    }
  }
  // Migration: if we have legacy netWorthSnapshots but no monthlySnapshots, create initial monthly snapshots from them
  if (monthlySnapshots.length === 0 && netWorthSnapshots.length > 0) {
    monthlySnapshots = netWorthSnapshots.map((s) => ({
      month: s.month,
      netWorth: s.value,
      cash: 0, investments: 0, realEstate: 0, business: 0, liabilities: 0,
      income: 0, expenses: 0,
    }));
    localStorage.setItem(KEYS.monthlySnapshots, JSON.stringify(monthlySnapshots));
  }

  // Transfers (fromAccountId, toAccountId, amount, date, note) – not income/expense
  const trf = localStorage.getItem(KEYS.transfers);
  if (trf) {
    try {
      transfers = JSON.parse(trf);
    } catch (e) {
      transfers = [];
    }
  }

  // Reminders
  const rem = localStorage.getItem(KEYS.reminders);
  if (rem) {
    try {
      reminders = JSON.parse(rem);
    } catch (e) {
      reminders = [];
    }
  }

  // Accounts - load after all legacy data (for migration)
  const acc = localStorage.getItem(KEYS.accounts);
  if (acc) {
    try {
      const parsed = JSON.parse(acc);
      accounts = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      accounts = [];
    }
  } else {
    accounts = [];
  }
  if (accounts.length === 0) {
    migrateToAccounts();
  }

  // UK allowances
  const uk = localStorage.getItem(KEYS.ukAllowances);
  if (uk) {
    try {
      ukAllowances = { ...ukAllowances, ...JSON.parse(uk) };
    } catch (e) {}
  }
}

function saveUkAllowances() {
  localStorage.setItem(KEYS.ukAllowances, JSON.stringify(ukAllowances));
}

/**
 * Calculate totals from accounts.
 * Cash = sum of Cash accounts
 * Investments = sum of Investment + Retirement accounts
 * Real Estate = sum of Real Estate accounts
 * Business = sum of Business accounts
 * Liabilities = sum of Liability accounts (stored as positive)
 * Net Worth = Cash + Investments + Real Estate + Business - Liabilities
 */
function getAccountTotals() {
  let cash = 0, investments = 0, realEstate = 0, business = 0, liabilities = 0;
  (accounts || []).forEach((a) => {
    const bal = safeNum(a?.balance, 0);
    switch (a.type) {
      case "Cash": cash += bal; break;
      case "Investment":
      case "Retirement": investments += bal; break;
      case "Real Estate": realEstate += bal; break;
      case "Business": business += bal; break;
      case "Liability": liabilities += bal; break;
    }
  });
  const totalAssets = cash + investments + realEstate + business;
  const netWorth = totalAssets - liabilities;
  return { cash, investments, realEstate, business, liabilities, totalAssets, netWorth };
}

function saveAccounts() {
  localStorage.setItem(KEYS.accounts, JSON.stringify(accounts));
}

/**
 * Migrate legacy data (investments, properties, liabilities, business) to accounts.
 * Called once when accounts array is empty.
 */
function migrateToAccounts() {
  let nextId = 1;
  const add = (name, type, balance, notes = "") => {
    accounts.push({ id: nextId++, name, type, balance: Number(balance) || 0, notes });
  };

  // From investments
  INVESTMENT_TYPES.forEach(({ key, label }) => {
    const inv = investments[key] || {};
    const v = Number(inv.value) || 0;
    if (v !== 0) add(label, key === "pension" ? "Retirement" : "Investment", v, "");
  });

  // From properties (equity = value - mortgage)
  properties.forEach((p) => {
    const equity = (Number(p.value) || 0) - (Number(p.mortgage) || 0);
    add(p.name || "Property", "Real Estate", equity, "");
  });

  // From liabilities
  liabilities.forEach((l) => {
    add(l.name || "Liability", "Liability", Number(l.balance) || 0, l.type || "");
  });

  // From business cash
  const bizCash = Number(business.cashBalance) || 0;
  if (bizCash !== 0) add("Business Cash", "Business", bizCash, "");

  // From transactions (create default cash account with transaction balance)
  const { balance } = getTransactionTotals();
  if (balance !== 0 || accounts.length === 0) {
    add("Primary Cash", "Cash", balance, "From transaction log");
  }

  saveAccounts();
}

function saveTransactions() {
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
}

function saveInvestments() {
  localStorage.setItem(KEYS.investments, JSON.stringify(investments));
}

function saveProperties() {
  localStorage.setItem(KEYS.properties, JSON.stringify(properties));
}

function saveLiabilities() {
  localStorage.setItem(KEYS.liabilities, JSON.stringify(liabilities));
}

function saveInsurance() {
  localStorage.setItem(KEYS.insurance, JSON.stringify(insurance));
}

function saveRecurring() {
  localStorage.setItem(KEYS.recurring, JSON.stringify(recurring));
}

function saveBusiness() {
  localStorage.setItem(KEYS.business, JSON.stringify(business));
}

function saveTax() {
  localStorage.setItem(KEYS.tax, JSON.stringify(tax));
}

function saveGoals() {
  localStorage.setItem(KEYS.goals, JSON.stringify(goals));
}

function saveSettings() {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

function saveNetWorthSnapshots() {
  localStorage.setItem(KEYS.netWorthSnapshots, JSON.stringify(netWorthSnapshots));
}

function saveMonthlySnapshots() {
  localStorage.setItem(KEYS.monthlySnapshots, JSON.stringify(monthlySnapshots));
}

function saveTransfers() {
  localStorage.setItem(KEYS.transfers, JSON.stringify(transfers));
}

function saveReminders() {
  localStorage.setItem(KEYS.reminders, JSON.stringify(reminders));
}

/* ========== Export / Import / Backup ==========
 * Export: all app data as downloadable JSON
 * Import: validate JSON, confirm overwrite, then apply
 * Reset: strong confirmation, then clear and reload
 */
let lastBackupAction = "";

function setBackupStatus(msg) {
  lastBackupAction = msg;
  const el = document.getElementById("backupStatus");
  if (el) el.textContent = msg;
}

function exportAllData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    keys: {},
  };
  Object.entries(KEYS).forEach(([name, key]) => {
    try {
      const raw = localStorage.getItem(key);
      data.keys[key] = raw != null ? JSON.parse(raw) : null;
    } catch (e) {
      data.keys[key] = null;
    }
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wealth-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setBackupStatus(`Exported on ${new Date().toLocaleString()}`);
}

function validateImportData(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Invalid file format" };
  if (!data.keys || typeof data.keys !== "object") return { ok: false, error: "Missing data keys" };
  return { ok: true };
}

function applyImportedData(data) {
  const keys = data.keys || {};
  Object.entries(KEYS).forEach(([name, key]) => {
    const val = keys[key];
    if (val != null) {
      try {
        localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
      } catch (e) {
        console.warn("Failed to import", key, e);
      }
    }
  });
}

function importData() {
  const input = document.getElementById("importFileInput");
  if (!input) return;
  input.value = "";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        setBackupStatus("Import failed: invalid JSON");
        return;
      }
      const { ok, error } = validateImportData(data);
      if (!ok) {
        setBackupStatus(`Import failed: ${error}`);
        return;
      }
      if (!confirm("Import will replace all current data. Continue?")) {
        setBackupStatus("Import cancelled");
        return;
      }
      applyImportedData(data);
      setBackupStatus(`Imported on ${new Date().toLocaleString()}`);
      location.reload();
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAppData() {
  const msg = "Reset will delete ALL your data (accounts, transactions, goals, etc.). This cannot be undone. Type RESET to confirm.";
  const confirmVal = prompt(msg);
  if (confirmVal !== "RESET") {
    setBackupStatus("Reset cancelled");
    return;
  }
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  setBackupStatus("Data reset. Reloading…");
  location.reload();
}

function initBackupSection() {
  document.getElementById("exportData")?.addEventListener("click", exportAllData);
  document.getElementById("importData")?.addEventListener("click", importData);
  document.getElementById("resetData")?.addEventListener("click", resetAppData);
}

/* ========== Account Activity ==========
 * Inflows = income (amount>0) linked to account
 * Outflows = expenses (amount<0) linked to account
 * Transfers in/out from transfer history
 */
function getAccountActivity(accountId) {
  if (!accountId) return { inflows: 0, outflows: 0, transfersIn: 0, transfersOut: 0, lastActivity: null };
  let inflows = 0, outflows = 0;
  let lastDate = null;
  transactions.forEach((t) => {
    if (t.accountId !== accountId) return;
    if (t.amount > 0) inflows += t.amount;
    else outflows += Math.abs(t.amount);
    if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
  });
  let transfersIn = 0, transfersOut = 0;
  transfers.forEach((tr) => {
    if (tr.toAccountId === accountId) { transfersIn += tr.amount || 0; if (tr.date && (!lastDate || tr.date > lastDate)) lastDate = tr.date; }
    if (tr.fromAccountId === accountId) { transfersOut += tr.amount || 0; if (tr.date && (!lastDate || tr.date > lastDate)) lastDate = tr.date; }
  });
  return { inflows, outflows, transfersIn, transfersOut, lastActivity: lastDate };
}

/* ========== Transactions (Cash Flow) ========== */
function getTransactionTotals() {
  let income = 0, expenses = 0;
  transactions.forEach((t) => {
    if (t.amount > 0) income += t.amount;
    else expenses += Math.abs(t.amount);
  });
  return { balance: income - expenses, income, expenses };
}

function getFilteredTransactions() {
  const search = (document.getElementById("cfSearch")?.value || "").toLowerCase();
  const catFilter = document.getElementById("cfCategoryFilter")?.value || "";
  const accountFilter = document.getElementById("cfAccountFilter")?.value || "";
  const sortVal = document.getElementById("cfSort")?.value || "date-desc";

  let list = [...transactions];
  if (search) {
    list = list.filter((t) =>
      t.description.toLowerCase().includes(search) ||
      (t.category || "").toLowerCase().includes(search)
    );
  }
  if (catFilter) list = list.filter((t) => (t.category || "") === catFilter);
  if (accountFilter) {
    const aid = Number(accountFilter);
    list = list.filter((t) => t.accountId === aid);
  }

  list.sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    const amtA = a.amount || 0;
    const amtB = b.amount || 0;
    if (sortVal === "date-desc") return db.localeCompare(da);
    if (sortVal === "date-asc") return da.localeCompare(db);
    if (sortVal === "amount-desc") return amtB - amtA;
    if (sortVal === "amount-asc") return amtA - amtB;
    return 0;
  });

  return list;
}

function getNextTransactionId() {
  const max = transactions.reduce((m, t) => (t.id > m ? t.id : m), 0);
  return max + 1;
}

function addTransaction(description, amount, category, date, accountId, contributionType) {
  const desc = (description || "").trim();
  const amt = safeNum(amount);
  if (!desc) {
    showValidationError("cfDescription", "Enter a description");
    return;
  }
  if (amt === 0 || isNaN(Number(amount))) {
    showValidationError("cfAmount", "Enter a valid amount (positive for income, negative for expense)");
    return;
  }
  showValidationError("cfDescription", "");
  showValidationError("cfAmount", "");
  const aid = accountId && accountId !== "" ? Number(accountId) : null;
  transactions.push({
    id: getNextTransactionId(),
    description: desc,
    amount: amt,
    category: category || "Other",
    date: date || getTodayStr(),
    accountId: aid,
    contributionType: contributionType || "",
  });
  saveTransactions();
  renderCashFlowSection();
  renderOverviewSection();
}

function deleteTransaction(id) {
  const t = transactions.find((x) => x.id === id);
  const desc = t ? t.description : "this transaction";
  if (!confirm(`Delete "${desc}"?`)) return;
  transactions = transactions.filter((x) => x.id !== id);
  saveTransactions();
  renderCashFlowSection();
  renderOverviewSection();
}

function clearAllTransactions() {
  const count = transactions.length;
  if (count === 0) return;
  if (!confirm(`Clear all ${count} transaction(s)? This cannot be undone.`)) return;
  transactions = [];
  saveTransactions();
  renderCashFlowSection();
  renderOverviewSection();
}

function renderTransactionItem(t, container) {
  const li = document.createElement("li");
  li.className = "transaction-item";
  const isIncome = t.amount > 0;
  const amtClass = isIncome ? "income" : "expense";
  const amtText = isIncome ? "+" + formatCurrency(t.amount) : "-" + formatCurrency(t.amount);
  const accName = t.accountId ? (accounts.find((a) => a.id === t.accountId)?.name || "") : "";
  const contribLabel = t.contributionType ? CONTRIBUTION_TYPES.find((c) => c.value === t.contributionType)?.label || "" : "";
  const metaParts = [escapeHtml(t.category), t.date || ""];
  if (accName) metaParts.push(accName);
  if (contribLabel) metaParts.push(contribLabel);

  li.innerHTML = `
    <div class="transaction-info">
      <span class="transaction-desc">${escapeHtml(t.description)}</span>
      <span class="transaction-meta">${metaParts.filter(Boolean).join(" • ")}</span>
    </div>
    <div class="transaction-right">
      <span class="transaction-amount ${amtClass}">${amtText}</span>
      <button type="button" class="delete-btn">Delete</button>
    </div>
  `;

  const delBtn = li.querySelector(".delete-btn");
  delBtn.addEventListener("click", () => deleteTransaction(t.id));
  container.appendChild(li);
}

function getCashFlowAnalytics() {
  const now = new Date();
  const thisMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const monthTx = transactions.filter((t) => (t.date || "").slice(0, 7) === thisMonth);
  const incomes = monthTx.filter((t) => t.amount > 0).map((t) => t.amount);
  const expenses = monthTx.filter((t) => t.amount < 0).map((t) => Math.abs(t.amount));

  const catTotals = {};
  monthTx.forEach((t) => {
    if (t.amount < 0) {
      const c = t.category || "Other";
      catTotals[c] = (catTotals[c] || 0) + Math.abs(t.amount);
    }
  });

  const byContribution = {};
  monthTx.forEach((t) => {
    const ct = t.contributionType || "regular";
    if (!byContribution[ct]) byContribution[ct] = { in: 0, out: 0 };
    if (t.amount > 0) byContribution[ct].in += t.amount;
    else byContribution[ct].out += Math.abs(t.amount);
  });

  const totalIncome = incomes.reduce((a, b) => a + b, 0);
  const totalExpenses = expenses.reduce((a, b) => a + b, 0);

  return {
    count: monthTx.length,
    largestExpense: expenses.length ? Math.max(...expenses) : 0,
    largestIncome: incomes.length ? Math.max(...incomes) : 0,
    avgExpense: expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0,
    avgIncome: incomes.length ? incomes.reduce((a, b) => a + b, 0) / incomes.length : 0,
    byCategory: catTotals,
    byContribution,
    income: totalIncome,
    expenses: totalExpenses,
  };
}

function getMonthlyContributions(monthKey) {
  const monthTx = transactions.filter((t) => (t.date || "").slice(0, 7) === monthKey);
  const out = { investment: 0, pension: 0, emergency: 0, debt: 0, property: 0 };
  monthTx.forEach((t) => {
    const ct = t.contributionType || "";
    if (ct && out[ct] !== undefined) out[ct] += Math.abs(t.amount);
  });
  return out;
}

function renderCashFlowSection() {
  const { balance, income, expenses } = getTransactionTotals();
  const linkedCount = transactions.filter((t) => t.accountId != null).length;
  document.getElementById("cfBalance").textContent = formatCurrency(balance);
  document.getElementById("cfIncome").textContent = formatCurrency(income);
  document.getElementById("cfExpenses").textContent = formatCurrency(expenses);
  const src = transactions.length ? `${transactions.length} transactions` + (linkedCount > 0 ? ` (${linkedCount} linked)` : "") : "No data";
  const balanceSrc = document.getElementById("cfBalanceSource");
  const incomeSrc = document.getElementById("cfIncomeSource");
  const expensesSrc = document.getElementById("cfExpensesSource");
  if (balanceSrc) balanceSrc.textContent = src;
  if (incomeSrc) incomeSrc.textContent = src;
  if (expensesSrc) expensesSrc.textContent = src;
  const sr = getSavingsRateData();
  const srEl = document.getElementById("cfSavingsRate");
  if (srEl) srEl.textContent = sr.currentRate != null ? `${sr.currentRate.toFixed(0)}%` + (sr.avgRate != null ? ` (avg ${sr.avgRate.toFixed(0)}%)` : "") : "—";

  const analytics = getCashFlowAnalytics();
  document.getElementById("cfCount").textContent = analytics.count;
  document.getElementById("cfLargestExpense").textContent =
    analytics.largestExpense > 0 ? formatCurrency(analytics.largestExpense) : "—";
  document.getElementById("cfLargestIncome").textContent =
    analytics.largestIncome > 0 ? formatCurrency(analytics.largestIncome) : "—";
  document.getElementById("cfAvgExpense").textContent =
    analytics.avgExpense > 0 ? formatCurrency(analytics.avgExpense) : "—";
  document.getElementById("cfAvgIncome").textContent =
    analytics.avgIncome > 0 ? formatCurrency(analytics.avgIncome) : "—";

  const breakdownEl = document.getElementById("cfCategoryBreakdown");
  breakdownEl.innerHTML = "";
  const totalExp = Object.values(analytics.byCategory).reduce((a, b) => a + b, 0);
  const colors = ["#3b82f6", "#a78bfa", "#f59e0b", "#06b6d4", "#22c55e", "#ef4444", "#94a3b8"];
  Object.entries(analytics.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt], i) => {
      const pct = totalExp > 0 ? (amt / totalExp) * 100 : 0;
      const div = document.createElement("div");
      div.className = "cat-row";
      div.innerHTML = `
        <span>${escapeHtml(cat)}</span>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div></div>
        <span class="cat-amt">${formatCurrency(amt)}</span>
      `;
      breakdownEl.appendChild(div);
    });
  if (Object.keys(analytics.byCategory).length === 0) {
    breakdownEl.innerHTML = '<p class="empty-message" style="padding:16px">No spending data this month</p>';
  }

  const popAccountSelect = (elId, emptyLabel) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${emptyLabel}</option>`;
    accounts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.name} (${a.type})`;
      if (String(a.id) === current) opt.selected = true;
      el.appendChild(opt);
    });
  };
  popAccountSelect("cfAccount", "None (unlinked)");
  popAccountSelect("cfAccountFilter", "All accounts");

  const catFilter = document.getElementById("cfCategoryFilter");
  if (catFilter) {
    const current = catFilter.value;
    catFilter.innerHTML = '<option value="">All categories</option>';
    CF_CATEGORIES.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      if (c === current) opt.selected = true;
      catFilter.appendChild(opt);
    });
  }

  const list = getFilteredTransactions();
  const ul = document.getElementById("cfTransactions");
  ul.innerHTML = "";

  if (list.length === 0) {
    const es = emptyState("No transactions yet", "Add income and expenses to track your cash flow.", "Add Transaction", "emptyStateAddTx");
    ul.innerHTML = "";
    ul.appendChild(es);
    es.querySelector("#emptyStateAddTx")?.addEventListener("click", () => {
      switchToSection("cash-flow", "#cfDescription");
    });
  } else {
    list.forEach((t) => renderTransactionItem(t, ul));
  }
}

function initCashFlowForm() {
  const form = document.getElementById("transactionForm");
  const dateInput = document.getElementById("cfDate");
  if (dateInput) dateInput.value = getTodayStr();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn?.disabled) return;
    const desc = document.getElementById("cfDescription").value.trim();
    const amount = document.getElementById("cfAmount").value;
    const category = document.getElementById("cfCategory").value;
    const date = document.getElementById("cfDate").value || getTodayStr();
    const accountId = document.getElementById("cfAccount")?.value || "";
    const contributionType = document.getElementById("cfContribution")?.value || "";
    addTransaction(desc, amount, category, date, accountId, contributionType);
    if (submitBtn) {
      submitBtn.disabled = true;
      setTimeout(() => { submitBtn.disabled = false; }, 800);
    }
    form.reset();
    if (dateInput) dateInput.value = getTodayStr();
  });

  document.getElementById("cfSearch")?.addEventListener("input", () => renderCashFlowSection());
  document.getElementById("cfAccountFilter")?.addEventListener("change", () => renderCashFlowSection());
  document.getElementById("cfCategoryFilter")?.addEventListener("change", () => renderCashFlowSection());
  document.getElementById("cfSort")?.addEventListener("change", () => renderCashFlowSection());
  document.getElementById("transferAccountFilter")?.addEventListener("change", () => renderTransferList());
  document.getElementById("cfClearAll")?.addEventListener("click", clearAllTransactions);
}

/* ========== Overview ========== */
function getOverviewData() {
  const acc = getAccountTotals();
  const taxReserve = Number(tax.setAside) || 0;

  // Monthly in/out (from transactions this month)
  const now = new Date();
  const thisMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  let monIn = 0, monOut = 0;
  transactions.forEach((t) => {
    const d = (t.date || "").slice(0, 7);
    if (d !== thisMonth) return;
    if (t.amount > 0) monIn += t.amount;
    else monOut += Math.abs(t.amount);
  });

  return {
    netWorth: acc.netWorth,
    cash: acc.cash,
    investments: acc.investments,
    realEstate: acc.realEstate,
    business: acc.business,
    taxReserve,
    totalLiabilities: acc.liabilities,
    totalAssets: acc.totalAssets,
    monIn,
    monOut,
  };
}

/* ========== Monthly Snapshots ==========
 * Structure: { month, netWorth, cash, investments, realEstate, business, liabilities, income, expenses }
 * Stored in localStorage, used for Net Worth History chart and savings/FI analytics.
 */
function getMonthStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getCurrentMonthStr() {
  return getMonthStr(new Date());
}

function createSnapshotFromCurrent(month, overwrite) {
  const acc = getAccountTotals();
  const now = new Date();
  const thisMonth = getMonthStr(now);
  let monIn = 0, monOut = 0;
  transactions.forEach((t) => {
    const dm = (t.date || "").slice(0, 7);
    if (dm !== month) return;
    if (t.amount > 0) monIn += t.amount;
    else monOut += Math.abs(t.amount);
  });

  const snapshot = {
    month,
    netWorth: acc.netWorth,
    cash: acc.cash,
    investments: acc.investments,
    realEstate: acc.realEstate,
    business: acc.business,
    liabilities: acc.liabilities,
    income: monIn,
    expenses: monOut,
  };

  const existing = monthlySnapshots.find((s) => s.month === month);
  if (existing && !overwrite) return { exists: true, snapshot };
  monthlySnapshots = monthlySnapshots.filter((s) => s.month !== month);
  monthlySnapshots.push(snapshot);
  monthlySnapshots.sort((a, b) => a.month.localeCompare(b.month));
  saveMonthlySnapshots();
  // Keep legacy in sync for backwards compat
  netWorthSnapshots = netWorthSnapshots.filter((s) => s.month !== month);
  netWorthSnapshots.push({ month, value: acc.netWorth });
  netWorthSnapshots.sort((a, b) => a.month.localeCompare(b.month));
  saveNetWorthSnapshots();
  return { exists: false, saved: true };
}

function addNetWorthSnapshot(month, value) {
  const v = Number(value);
  if (!month || isNaN(v)) {
    alert("Please enter month and value.");
    return;
  }
  netWorthSnapshots = netWorthSnapshots.filter((s) => s.month !== month);
  netWorthSnapshots.push({ month, value: v });
  netWorthSnapshots.sort((a, b) => a.month.localeCompare(b.month));
  saveNetWorthSnapshots();
  const existing = monthlySnapshots.find((s) => s.month === month);
  monthlySnapshots = monthlySnapshots.filter((s) => s.month !== month);
  monthlySnapshots.push({
    month,
    netWorth: v,
    cash: existing?.cash ?? 0,
    investments: existing?.investments ?? 0,
    realEstate: existing?.realEstate ?? 0,
    business: existing?.business ?? 0,
    liabilities: existing?.liabilities ?? 0,
    income: existing?.income ?? 0,
    expenses: existing?.expenses ?? 0,
  });
  monthlySnapshots.sort((a, b) => a.month.localeCompare(b.month));
  saveMonthlySnapshots();
  renderOverviewSection();
  renderAnalyticsSection();
  updateAllCharts();
}

function getMonthlyNetWorthChange() {
  const data = getOverviewData();
  const currentVal = data.netWorth;
  const now = new Date();
  const thisMonth = getCurrentMonthStr();
  const lastMonth = now.getMonth() === 0 ? (now.getFullYear() - 1) + "-12" : now.getFullYear() + "-" + String(now.getMonth()).padStart(2, "0");

  const snap = monthlySnapshots.length > 0 ? monthlySnapshots.find((s) => s.month === lastMonth) : netWorthSnapshots.find((s) => s.month === lastMonth);
  const lastVal = snap ? (snap.netWorth ?? snap.value) : null;
  if (lastVal == null) return { change: null, text: "Create a snapshot to see change", month1: null, month3: null, month12: null };

  const change = currentVal - lastVal;
  const pct = lastVal !== 0 ? ((change / Math.abs(lastVal)) * 100).toFixed(1) : "—";
  return {
    change,
    text: change >= 0 ? `+${formatCurrency(change)} (${pct}%) vs last month` : `${formatCurrency(change)} (${pct}%) vs last month`,
  };
}

function getNetWorthIntelligence() {
  const data = getOverviewData();
  const current = data.netWorth;
  const now = new Date();
  const thisMonth = getCurrentMonthStr();
  const sorted = [...monthlySnapshots].sort((a, b) => a.month.localeCompare(b.month));

  const getVal = (s) => s?.netWorth ?? s?.value ?? 0;
  const lastMonth = now.getMonth() === 0 ? (now.getFullYear() - 1) + "-12" : now.getFullYear() + "-" + String(now.getMonth()).padStart(2, "0");
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const m3 = getMonthStr(threeMonthsAgo);
  const m12 = getMonthStr(twelveMonthsAgo);

  let change1 = null, change3 = null, change12 = null;
  const last = sorted.find((s) => s.month === lastMonth);
  const snap3 = sorted.find((s) => s.month <= m3);
  const snap12 = sorted.find((s) => s.month <= m12);
  if (last) change1 = current - getVal(last);
  if (snap3) change3 = current - getVal(snap3);
  if (snap12) change12 = current - getVal(snap12);

  let avgGrowth = null, bestMonth = null, worstMonth = null;
  if (sorted.length >= 2) {
    let sumChange = 0, count = 0;
    let bestDelta = -Infinity, worstDelta = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      const delta = getVal(sorted[i]) - getVal(sorted[i - 1]);
      sumChange += delta;
      count++;
      if (delta > bestDelta) { bestDelta = delta; bestMonth = sorted[i].month; }
      if (delta < worstDelta) { worstDelta = delta; worstMonth = sorted[i].month; }
    }
    avgGrowth = count > 0 ? sumChange / count : null;
  }

  return { change1, change3, change12, avgGrowth, bestMonth, worstMonth };
}

function getNetWorthChartData() {
  const data = getOverviewData();
  const labels = [];
  const values = [];

  const src = monthlySnapshots.length > 0 ? monthlySnapshots : netWorthSnapshots.map((s) => ({ month: s.month, netWorth: s.value }));
  if (src.length > 0) {
    src.forEach((s) => {
      labels.push(s.month);
      values.push(s.netWorth ?? s.value);
    });
  } else {
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = getMonthStr(d);
      labels.push(m);
      values.push(Math.round(data.netWorth * (0.9 + (i * 0.02)) * 100) / 100);
    }
  }

  const currentMonth = getCurrentMonthStr();
  if (labels.length === 0 || labels[labels.length - 1] !== currentMonth) {
    labels.push(currentMonth);
    values.push(data.netWorth);
  }

  return { labels, values };
}

/* ========== Savings Rate Logic ==========
 * monthly savings = income - expenses
 * savings rate = savings / income (0-100% or null if no income)
 * investment rate = investment contributions / income (approximated from transaction categories)
 */
function getSavingsRateData() {
  const now = new Date();
  const thisMonth = getCurrentMonthStr();
  let monIn = 0, monOut = 0, invContrib = 0;
  transactions.forEach((t) => {
    const dm = (t.date || "").slice(0, 7);
    if (dm !== thisMonth) return;
    if (t.amount > 0) {
      monIn += t.amount;
    } else {
      monOut += Math.abs(t.amount);
      if (t.contributionType === "investment" || t.contributionType === "pension") invContrib += Math.abs(t.amount);
      else if ((t.category || "").toLowerCase().includes("pension") || (t.category || "").toLowerCase().includes("investment")) invContrib += Math.abs(t.amount);
    }
  });
  const savings = monIn - monOut;
  const rate = monIn > 0 ? (savings / monIn) * 100 : null;
  const invRate = monIn > 0 ? (invContrib / monIn) * 100 : null;

  let avgRate = null;
  if (monthlySnapshots.length > 0) {
    let sum = 0, count = 0;
    monthlySnapshots.forEach((s) => {
      const inc = s.income || 0;
      if (inc > 0) {
        const sr = ((inc - (s.expenses || 0)) / inc) * 100;
        sum += sr;
        count++;
      }
    });
    avgRate = count > 0 ? sum / count : null;
  }
  return { currentRate: rate, currentSavings: savings, currentIncome: monIn, invRate, avgRate };
}

/* ========== FIRE / Financial Independence ==========
 * FIRE number = annual essential expenses × multiplier (default 25 = 4% rule)
 * FI progress = current net worth / FIRE number
 */
function getFIProgress() {
  const annual = Number(settings.annualExpenses) || (Number(settings.essentialExpenses) || 0) * 12 || 1;
  const mult = Math.max(20, Number(settings.fireMultiplier) || 25);
  const fireNumber = annual * mult;
  const acc = getAccountTotals();
  const invested = acc.investments + acc.cash; // or use net worth; FI often uses invested assets
  const progress = fireNumber > 0 ? Math.min(100, (acc.netWorth / fireNumber) * 100) : 0;
  const remaining = Math.max(0, fireNumber - acc.netWorth);
  return { fireNumber, progress, remaining, annual };
}

/* ========== Emergency Fund Intelligence ==========
 * Uses emergency fund balance (cash accounts named emergency/savings or first cash)
 * Target months from settings.essentialExpenses
 */
function getEmergencyFundData() {
  const acc = getAccountTotals();
  const essential = Number(settings.essentialExpenses) || 1;
  const targetMonths = Number(settings.emergencyMonths) || 6;
  const emergencyAccount = accounts.find(
    (a) => (a.name || "").toLowerCase().includes("emergency") || (a.name || "").toLowerCase().includes("savings")
  );
  const emergencyBal = emergencyAccount ? (Number(emergencyAccount.balance) || 0) : acc.cash;
  const monthsCovered = essential > 0 ? emergencyBal / essential : 0;
  const targetAmount = essential * targetMonths;
  const pct = targetAmount > 0 ? Math.min(100, (emergencyBal / targetAmount) * 100) : 0;
  let label = "—";
  if (essential > 0) {
    if (monthsCovered >= targetMonths) label = "Strong";
    else if (monthsCovered >= targetMonths * 0.5) label = "Moderate";
    else if (monthsCovered > 0) label = "Low";
  }
  const needed = Math.max(0, targetAmount - emergencyBal);
  return { monthsCovered, targetMonths, targetAmount, pct, label, needed };
}

/* ========== Financial Insights ==========
 * Generate simple insights from current data. Types: Warning, Opportunity, Info.
 */
function getFinancialInsights() {
  const insights = [];
  const acc = getAccountTotals();
  const ef = getEmergencyFundData();
  const sr = getSavingsRateData();
  const fi = getFIProgress();
  const essential = Number(settings.essentialExpenses) || 0;
  const totalA = acc.totalAssets;

  if (essential > 0 && ef.monthsCovered < ef.targetMonths && ef.label === "Low") {
    insights.push({ type: "Warning", msg: `Emergency fund is below target (${ef.monthsCovered.toFixed(1)} of ${ef.targetMonths} months).` });
  }
  if (essential > 0 && ef.label === "Strong") {
    insights.push({ type: "Info", msg: "Emergency fund coverage is strong." });
  }

  if (sr.avgRate != null && sr.currentRate != null) {
    const diff = sr.currentRate - sr.avgRate;
    if (diff > 10) insights.push({ type: "Opportunity", msg: "Savings rate improved vs your average." });
    else if (diff < -10) insights.push({ type: "Warning", msg: "Savings rate is lower than your average." });
  }

  if (totalA > 0 && acc.liabilities > 0) {
    const ratio = acc.liabilities / totalA;
    if (ratio > 0.5) insights.push({ type: "Warning", msg: "Liabilities are high relative to assets." });
  }

  if (totalA > 0) {
    const cats = [
      { n: "Cash", v: acc.cash },
      { n: "Investments", v: acc.investments },
      { n: "Real Estate", v: acc.realEstate },
      { n: "Business", v: acc.business },
    ].filter((c) => c.v > 0);
    const largest = cats.reduce((a, b) => (b.v > a.v ? b : a), { n: "", v: 0 });
    const pct = Math.round((largest.v / totalA) * 100);
    if (pct > 70) insights.push({ type: "Info", msg: `${largest.n} dominates your portfolio (${pct}%). Consider diversifying.` });
  }

  if (monthlySnapshots.length >= 2) {
    const sorted = [...monthlySnapshots].sort((a, b) => b.month.localeCompare(a.month));
    const curr = sorted[0];
    const prev = sorted[1];
    const currExp = curr.expenses || 0;
    const prevExp = prev.expenses || 0;
    if (prevExp > 0 && currExp > prevExp * 1.15) {
      insights.push({ type: "Warning", msg: `Monthly expenses increased vs ${prev.month}.` });
    }
  }

  let recMonthly = 0;
  recurring.forEach((r) => { recMonthly += getRecurringMonthlyAmount(r); });
  const monIn = getOverviewData().monIn;
  if (monIn > 0 && recMonthly > monIn * 0.4) {
    insights.push({ type: "Warning", msg: "Upcoming recurring obligations are high relative to income." });
  }

  const taxTotal = (Number(tax.personalTax) || 0) + (Number(tax.businessTax) || 0);
  const taxSetAside = Number(tax.setAside) || 0;
  if (taxTotal > 0 && taxSetAside < taxTotal) {
    insights.push({ type: "Warning", msg: "Tax reserve may be insufficient." });
  }

  goals.forEach((g) => {
    const target = Number(g.target) || 1;
    const current = Number(g.current) || 0;
    const pct = target > 0 ? (current / target) * 100 : 0;
    if (pct >= 100) insights.push({ type: "Opportunity", msg: `"${g.name}" goal completed!` });
  });

  return insights;
}

/* ========== Forecasting ==========
 * Simple projections: emergency fund, goals, FIRE, debt payoff. Estimates only.
 */
function getForecasts() {
  const forecasts = [];
  const acc = getAccountTotals();
  const ef = getEmergencyFundData();
  const fi = getFIProgress();
  const sr = getSavingsRateData();
  const essential = Number(settings.essentialExpenses) || 0;

  if (ef.needed > 0 && essential > 0 && sr.currentSavings != null && sr.currentSavings > 0) {
    const months = Math.ceil(ef.needed / sr.currentSavings);
    forecasts.push({
      label: "Emergency fund target",
      value: months <= 24 ? `~${months} months` : "Over 2 years",
      status: months <= 12 ? "On track" : "Off track",
    });
  } else if (ef.needed > 0) {
    forecasts.push({ label: "Emergency fund target", value: "Add income/expense data", status: "—" });
  }

  goals.forEach((g) => {
    const target = Number(g.target) || 0;
    const current = Number(g.current) || 0;
    const remaining = Math.max(0, target - current);
    const monthly = Number(g.monthly) || 0;
    if (target > 0 && remaining > 0 && monthly > 0) {
      const months = Math.ceil(remaining / monthly);
      forecasts.push({
        label: g.name,
        value: `~${months} months`,
        status: months <= 60 ? "On track" : "Long timeline",
      });
    } else if (remaining > 0) {
      forecasts.push({ label: g.name, value: "Set monthly contribution", status: "—" });
    }
  });

  if (fi.fireNumber > 0 && fi.remaining > 0) {
    const avgSavings = monthlySnapshots.length >= 2
      ? monthlySnapshots.reduce((s, x) => s + ((x.income || 0) - (x.expenses || 0)), 0) / monthlySnapshots.length
      : sr.currentSavings;
    if (avgSavings > 0) {
      const months = Math.ceil(fi.remaining / avgSavings);
      const years = Math.round(months / 12);
      forecasts.push({
        label: "FIRE target (estimate)",
        value: years > 0 ? `~${years} years` : "—",
        status: years <= 20 ? "On track" : "Long journey",
      });
    }
  }

  const studentBal = Number(ukAllowances.studentLoanBalance) || 0;
  const studentMonthly = Number(ukAllowances.studentLoanMonthly) || 0;
  if (studentBal > 0 && studentMonthly > 0) {
    const months = Math.ceil(studentBal / studentMonthly);
    forecasts.push({
      label: "Student loan payoff",
      value: `~${months} months`,
      status: "Estimate",
    });
  }

  return forecasts;
}

function renderInsightsSection() {
  const insights = getFinancialInsights();
  const listEl = document.getElementById("insightsList");
  const overviewEl = document.getElementById("overviewInsights");
  const renderList = (el) => {
    if (!el) return;
    el.innerHTML = "";
    if (insights.length === 0) {
      el.innerHTML = '<p class="empty-message">Add more data to see insights.</p>';
      return;
    }
    insights.forEach((i) => {
      const div = document.createElement("div");
      div.className = `insight-item insight-${i.type.toLowerCase()}`;
      div.innerHTML = `<span class="insight-type">${i.type}</span><span class="insight-msg">${escapeHtml(i.msg)}</span>`;
      el.appendChild(div);
    });
  };
  renderList(listEl);
  renderList(overviewEl);

  const forecasts = getForecasts();
  const foreEl = document.getElementById("forecastingList");
  if (foreEl) {
    foreEl.innerHTML = "";
    if (forecasts.length === 0) {
      foreEl.innerHTML = '<p class="empty-message">Add goals and data to see projections.</p>';
    } else {
      forecasts.forEach((f) => {
        const div = document.createElement("div");
        div.className = "forecast-item";
        div.innerHTML = `
          <div class="forecast-label">${escapeHtml(f.label)}</div>
          <div class="forecast-value">${escapeHtml(f.value)}</div>
          <div class="forecast-status">${escapeHtml(f.status)}</div>
        `;
        foreEl.appendChild(div);
      });
    }
  }

  const review = getMonthlyReviewData();
  const reviewEl = document.getElementById("monthlyReview");
  const contribLabels = { investment: "Investment", pension: "Pension", emergency: "Emergency fund", debt: "Debt", property: "Property" };
  const contribItems = Object.entries(review.contributions || {})
    .filter(([, amt]) => amt > 0)
    .map(([k, amt]) => `<span class="contrib-tag">${contribLabels[k] || k}: ${formatCurrency(amt)}</span>`)
    .join("");
  const srcHint = review.txCount > 0 ? `From ${review.txCount} transaction${review.txCount !== 1 ? "s" : ""} this month` : "No transactions this month";
  if (reviewEl) {
    reviewEl.innerHTML = `
      <p class="panel-hint review-source">${srcHint}. Transfers excluded from income/expenses.</p>
      <div class="review-grid">
        <div class="review-item"><span class="review-label">Income</span><span>${formatCurrency(review.income)}</span></div>
        <div class="review-item"><span class="review-label">Expenses</span><span>${formatCurrency(review.expenses)}</span></div>
        <div class="review-item"><span class="review-label">Monthly surplus</span><span class="${review.surplus >= 0 ? "positive" : "negative"}">${formatCurrency(review.surplus)}</span></div>
        <div class="review-item"><span class="review-label">Savings rate</span><span>${review.savingsRate != null ? review.savingsRate.toFixed(0) + "%" : "—"}</span></div>
        <div class="review-item"><span class="review-label">Net worth change</span><span class="${review.netWorthChange != null && review.netWorthChange >= 0 ? "positive" : "negative"}">${review.netWorthChange != null ? formatCurrency(review.netWorthChange) : "—"}</span></div>
        <div class="review-item"><span class="review-label">Biggest expense</span><span>${review.biggestCategory ? review.biggestCategory + " " + formatCurrency(review.biggestAmount) : "—"}</span></div>
      </div>
      ${contribItems ? `<div class="review-contributions"><h4>Contributions</h4><div class="contrib-tags">${contribItems}</div></div>` : ""}
      <div class="review-upcoming">
        <h4>Upcoming</h4>
        ${review.upcoming.length ? review.upcoming.map((u) => `<div class="reminder-item"><span>${escapeHtml(u.title)}</span><span>${escapeHtml(u.date)}</span></div>`).join("") : "<p class='empty-message'>No upcoming dates</p>"}
      </div>
    `;
  }
}

/* ========== Monthly Review ========== */
function getMonthlyReviewData() {
  const data = getOverviewData();
  const analytics = getCashFlowAnalytics();
  const contributions = getMonthlyContributions(getCurrentMonthStr());
  const sr = getSavingsRateData();
  const mc = getMonthlyNetWorthChange();
  const biggestCat = Object.entries(analytics.byCategory).sort((a, b) => b[1] - a[1])[0];
  const upcoming = [...reminders.filter((r) => r.date), ...recurring.filter((r) => r.nextDue).map((r) => ({ title: r.name, date: r.nextDue }))]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 5);
  return {
    income: analytics.income,
    expenses: analytics.expenses,
    surplus: analytics.income - analytics.expenses,
    savingsRate: sr.currentRate,
    netWorthChange: mc.change,
    biggestCategory: biggestCat ? biggestCat[0] : null,
    biggestAmount: biggestCat ? biggestCat[1] : 0,
    contributions,
    txCount: analytics.count,
    upcoming,
  };
}

/* ========== UK Planning ========== */
function getUKTaxYearStr() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `Apr ${y} – Apr ${y + 1}`;
}

function renderUKSection() {
  const LISA_CAP = 4000;
  const ISA_ALLOWANCE = 20000;
  const lisa = Number(ukAllowances.lisaYTD) || 0;
  const isa = Number(ukAllowances.isaYTD) || 0;
  const pension = Number(ukAllowances.pensionYTD) || 0;
  const studentBal = Number(ukAllowances.studentLoanBalance) || 0;
  const studentMo = Number(ukAllowances.studentLoanMonthly) || 0;

  const taxYearEl = document.getElementById("ukTaxYear");
  if (taxYearEl) taxYearEl.textContent = getUKTaxYearStr();
  const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  setVal("ukLisa", lisa);
  setVal("ukIsa", isa);
  setVal("ukPension", pension);
  setVal("ukStudentBalance", studentBal);
  setVal("ukStudentMonthly", studentMo);

  const lisaPct = Math.min(100, (lisa / LISA_CAP) * 100);
  const isaPct = Math.min(100, (isa / ISA_ALLOWANCE) * 100);
  const lisaBar = document.getElementById("ukLisaBar");
  const isaBar = document.getElementById("ukIsaBar");
  if (lisaBar) lisaBar.style.width = lisaPct + "%";
  if (isaBar) isaBar.style.width = isaPct + "%";

  const lisaRem = document.getElementById("ukLisaRemaining");
  const isaRem = document.getElementById("ukIsaRemaining");
  if (lisaRem) lisaRem.textContent = lisa < LISA_CAP ? formatCurrency(LISA_CAP - lisa) + " remaining" : "Limit reached";
  if (isaRem) isaRem.textContent = isa < ISA_ALLOWANCE ? formatCurrency(ISA_ALLOWANCE - isa) + " remaining" : "Allowance used";

  const studentEst = document.getElementById("ukStudentEstimate");
  if (studentEst) studentEst.textContent = (studentBal > 0 && studentMo > 0) ? `~${Math.ceil(studentBal / studentMo)} months to pay off` : "";
}

function initUKSection() {
  document.getElementById("ukSave")?.addEventListener("click", () => {
    ukAllowances.lisaYTD = Number(document.getElementById("ukLisa")?.value) || 0;
    ukAllowances.isaYTD = Number(document.getElementById("ukIsa")?.value) || 0;
    ukAllowances.pensionYTD = Number(document.getElementById("ukPension")?.value) || 0;
    ukAllowances.studentLoanBalance = Number(document.getElementById("ukStudentBalance")?.value) || 0;
    ukAllowances.studentLoanMonthly = Number(document.getElementById("ukStudentMonthly")?.value) || 0;
    saveUkAllowances();
    renderUKSection();
    alert("UK data saved.");
  });
}

/* ========== Chart.js - Dark Theme Config ========== */
const CHART_COLORS = {
  text: "#94a3b8",
  grid: "rgba(148, 163, 184, 0.15)",
  accent: "#3b82f6",
  income: "#22c55e",
  expense: "#ef4444",
  doughnut: ["#3b82f6", "#a78bfa", "#f59e0b", "#06b6d4", "#22c55e"],
};

function getChartOptions(type) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: CHART_COLORS.text } },
    },
  };
  if (type === "line" || type === "bar") {
    base.scales = {
      x: { ticks: { color: CHART_COLORS.text }, grid: { color: CHART_COLORS.grid } },
      y: { ticks: { color: CHART_COLORS.text }, grid: { color: CHART_COLORS.grid } },
    };
  }
  return base;
}

function updateNetWorthChart() {
  const ctx = document.getElementById("chartNetWorth");
  if (!ctx) return;
  const { labels, values } = getNetWorthChartData();

  if (chartNetWorth) chartNetWorth.destroy();
  chartNetWorth = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Net Worth",
        data: values,
        borderColor: CHART_COLORS.accent,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
      }],
    },
    options: getChartOptions("line"),
  });
}

function updateInvestmentsChart() {
  const ctx = document.getElementById("chartInvestments");
  if (!ctx) return;

  const invAccounts = accounts.filter((a) => a.type === "Investment" || a.type === "Retirement");
  const labels = invAccounts.map((a) => a.name).filter(Boolean);
  const data = invAccounts.map((a) => Number(a.balance) || 0).filter((v) => v > 0);

  if (data.length === 0) {
    labels.push("No data");
    data.push(1);
  }

  if (chartInvestments) chartInvestments.destroy();
  chartInvestments = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: CHART_COLORS.doughnut }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: CHART_COLORS.text } } },
    },
  });
}

function updateAssetsLiabChart() {
  const ctx = document.getElementById("chartAssetsLiab");
  if (!ctx) return;

  const acc = getAccountTotals();
  const assets = acc.totalAssets;
  const liabilities = acc.liabilities;
  const labels = [];
  const data = [];
  const colors = [];
  if (assets > 0) {
    labels.push("Assets");
    data.push(assets);
    colors.push(CHART_COLORS.income);
  }
  if (liabilities > 0) {
    labels.push("Liabilities");
    data.push(liabilities);
    colors.push(CHART_COLORS.expense);
  }
  if (data.length === 0) {
    labels.push("No data");
    data.push(1);
    colors.push(CHART_COLORS.text);
  }

  if (chartAssetsLiab) chartAssetsLiab.destroy();
  chartAssetsLiab = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: CHART_COLORS.text } } },
    },
  });
}

function updateMonthlyInOutChart() {
  const ctx = document.getElementById("chartMonthlyInOut");
  if (!ctx) return;

  const now = new Date();
  const labels = [];
  const inData = [];
  const outData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    labels.push(monthKey);
    let inVal = 0, outVal = 0;
    transactions.forEach((t) => {
      const dm = (t.date || "").slice(0, 7);
      if (dm !== monthKey) return;
      if (t.amount > 0) inVal += t.amount;
      else outVal += Math.abs(t.amount);
    });
    inData.push(inVal);
    outData.push(outVal);
  }

  if (chartMonthlyInOut) chartMonthlyInOut.destroy();
  chartMonthlyInOut = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Money In", data: inData, backgroundColor: CHART_COLORS.income },
        { label: "Money Out", data: outData, backgroundColor: CHART_COLORS.expense },
      ],
    },
    options: { ...getChartOptions("bar"), scales: { x: { stacked: false }, y: { stacked: false } } },
  });
}

function updateAllCharts() {
  if (typeof Chart === "undefined") return;
  const overview = document.getElementById("overview");
  if (overview && !overview.classList.contains("active")) return;
  try {
    updateNetWorthChart();
    updateInvestmentsChart();
    updateMonthlyInOutChart();
    updateAssetsLiabChart();
  } catch (e) {
    console.warn("Charts update failed:", e);
  }
}

function renderOverviewSection() {
  renderSetupChecklist();
  const data = getOverviewData();

  document.getElementById("overviewNetWorth").textContent = formatCurrency(data.netWorth);
  const trendEl = document.getElementById("overviewNetWorthTrend");
  const mc = getMonthlyNetWorthChange();
  trendEl.textContent = mc.text || "—";
  trendEl.className = "hero-subtext " + (mc.change != null && mc.change >= 0 ? "positive" : mc.change != null ? "negative" : "");

  const intel = getNetWorthIntelligence();
  const trendsEl = document.getElementById("overviewNetWorthTrends");
  if (trendsEl) {
    const parts = [];
    if (intel.change3 != null) parts.push(`3m: ${intel.change3 >= 0 ? "+" : ""}${formatCurrency(intel.change3)}`);
    if (intel.change12 != null) parts.push(`12m: ${intel.change12 >= 0 ? "+" : ""}${formatCurrency(intel.change12)}`);
    if (intel.avgGrowth != null) parts.push(`Avg growth/mo: ${formatCurrency(intel.avgGrowth)}`);
    if (intel.bestMonth) parts.push(`Best: ${intel.bestMonth}`);
    if (intel.worstMonth) parts.push(`Worst: ${intel.worstMonth}`);
    const nwSource = accounts.length ? `From ${accounts.length} account${accounts.length !== 1 ? "s" : ""}` : "Add accounts to track";
    trendsEl.innerHTML = parts.length ? parts.join(" · ") + (accounts.length ? `<br><span class="metric-source">${nwSource}</span>` : "") : (accounts.length ? `<span class="metric-source">${nwSource}</span>` : "");
  }

  const sr = getSavingsRateData();
  const srEl = document.getElementById("overviewSavingsRate");
  if (srEl) srEl.textContent = sr.currentRate != null ? `${sr.currentRate.toFixed(0)}%` : "—";

  const fi = getFIProgress();
  const fiEl = document.getElementById("overviewFIProgress");
  if (fiEl) fiEl.innerHTML = fi.fireNumber > 0 ? `${fi.progress.toFixed(0)}%<br><small>${formatCurrency(fi.remaining)} to go</small>` : "Set annual expenses";

  const ef = getEmergencyFundData();
  const efEl = document.getElementById("overviewEmergency");
  if (efEl) efEl.innerHTML = (Number(settings.essentialExpenses) || 0) > 0 ? `${ef.monthsCovered.toFixed(1)}mo (${ef.label})<br><small>Target: ${ef.targetMonths}mo</small>` : "Set essential expenses";

  const surplusEl = document.getElementById("overviewSurplus");
  if (surplusEl) surplusEl.textContent = data.monIn - data.monOut >= 0 ? formatCurrency(data.monIn - data.monOut) : "-" + formatCurrency(data.monOut - data.monIn);

  document.getElementById("overviewLiabilities").textContent = formatCurrency(data.totalLiabilities);
  document.getElementById("overviewCash").textContent = formatCurrency(data.cash);
  document.getElementById("overviewInvestments").textContent = formatCurrency(data.investments);
  document.getElementById("overviewRealEstate").textContent = formatCurrency(data.realEstate);
  document.getElementById("overviewBusiness").textContent = formatCurrency(data.business);
  document.getElementById("overviewTax").textContent = formatCurrency(data.taxReserve);

  const recentList = document.getElementById("overviewTransactions");
  recentList.innerHTML = "";
  const recent = [...transactions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  if (recent.length === 0) {
    recentList.innerHTML = '<div class="empty-state"><div class="empty-state-title">No recent transactions</div><div class="empty-state-text">Add transactions in Cash Flow</div></div>';
  } else {
    recent.forEach((t) => {
      const li = document.createElement("li");
      li.className = "transaction-preview";
      const amt = t.amount > 0 ? "+" + formatCurrency(t.amount) : "-" + formatCurrency(t.amount);
      li.innerHTML = `<span>${escapeHtml(t.description)}</span><span>${amt}</span>`;
      recentList.appendChild(li);
    });
  }

  const goalsPreview = document.getElementById("overviewGoals");
  goalsPreview.innerHTML = "";
  const previewGoals = goals.slice(0, 3);
  if (previewGoals.length === 0) {
    goalsPreview.innerHTML = "<p class='goal-preview'>No goals yet.</p>";
  } else {
    previewGoals.forEach((g) => {
      const div = document.createElement("div");
      div.className = "goal-preview";
      const target = Number(g.target) || 1;
      const current = Number(g.current) || 0;
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      div.innerHTML = `
        <span>${escapeHtml(g.name)}</span>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      `;
      goalsPreview.appendChild(div);
    });
  }

  renderRemindersSection();

  const insights = getFinancialInsights();
  const overviewInsightsEl = document.getElementById("overviewInsights");
  if (overviewInsightsEl) {
    overviewInsightsEl.innerHTML = "";
    insights.slice(0, 4).forEach((i) => {
      const div = document.createElement("div");
      div.className = `insight-item insight-${i.type.toLowerCase()}`;
      div.innerHTML = `<span class="insight-type">${i.type}</span><span class="insight-msg">${escapeHtml(i.msg)}</span>`;
      overviewInsightsEl.appendChild(div);
    });
    if (insights.length === 0) overviewInsightsEl.innerHTML = '<p class="empty-message">Add data to see insights.</p>';
  }

  const acc = getAccountTotals();
  const totalA = acc.totalAssets;
  const insightLiab = document.getElementById("assetsLiabInsight");
  if (insightLiab && totalA > 0) {
    const cats = [
      { n: "Cash", v: acc.cash },
      { n: "Investments", v: acc.investments },
      { n: "Real Estate", v: acc.realEstate },
      { n: "Business", v: acc.business },
    ].filter((c) => c.v > 0);
    const largest = cats.length ? cats.reduce((a, b) => (b.v > a.v ? b : a), cats[0]) : null;
    let msg = largest ? `Largest: ${largest.n} (${Math.round((largest.v / totalA) * 100)}%). ` : "";
    const cashPct = totalA > 0 ? (acc.cash / totalA) * 100 : 0;
    if (cashPct < 5 && acc.cash < (Number(settings.essentialExpenses) || 0) * 3) msg += "Low cash warning: consider building reserves.";
    insightLiab.textContent = msg || "—";
  }

  if (document.getElementById("overview")?.classList.contains("active")) {
    updateAllCharts();
  }
}

/* ========== Accounts ========== */
function getNextAccountId() {
  const max = accounts.reduce((m, a) => (a.id > m ? a.id : m), 0);
  return max + 1;
}

function addAccount(name, type, balance, notes) {
  const n = (name || "").trim();
  if (!n) {
    alert("Please enter an account name.");
    return;
  }
  accounts.push({
    id: getNextAccountId(),
    name: n,
    type: type || "Cash",
    balance: Number(balance) || 0,
    notes: (notes || "").trim(),
  });
  saveAccounts();
  renderAccountsSection();
  renderInvestmentsSection();
  renderRealEstateSection();
  renderLiabilitiesSection();
  renderOverviewSection();
  updateAllCharts();
}

function updateAccount(id, name, type, balance, notes) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;
  acc.name = (name || "").trim();
  acc.type = type || "Cash";
  acc.balance = Number(balance) || 0;
  acc.notes = (notes || "").trim();
  saveAccounts();
  renderAccountsSection();
  renderInvestmentsSection();
  renderRealEstateSection();
  renderLiabilitiesSection();
  renderOverviewSection();
  updateAllCharts();
}

function deleteAccount(id) {
  const acc = accounts.find((a) => a.id === id);
  const name = acc ? acc.name : "this account";
  if (!confirm(`Delete "${name}"? This will remove it from all totals.`)) return;
  accounts = accounts.filter((a) => a.id !== id);
  saveAccounts();
  renderAccountsSection();
  renderInvestmentsSection();
  renderRealEstateSection();
  renderLiabilitiesSection();
  renderOverviewSection();
  updateAllCharts();
}

function openAccountForm(account = null) {
  const overlay = document.getElementById("accountFormOverlay");
  const title = document.getElementById("accountFormTitle");
  document.getElementById("accountId").value = account ? account.id : "";
  document.getElementById("accountName").value = account ? account.name : "";
  document.getElementById("accountType").value = account ? account.type : "Cash";
  document.getElementById("accountBalance").value = account ? account.balance : "";
  document.getElementById("accountNotes").value = account ? account.notes || "" : "";
  title.textContent = account ? "Edit Account" : "Add Account";
  overlay.classList.remove("hidden");
}

function renderAccountsSection() {
  const totals = getAccountTotals();
  document.getElementById("accTotalCash").textContent = formatCurrency(totals.cash);
  document.getElementById("accTotalInv").textContent = formatCurrency(totals.investments);
  document.getElementById("accTotalRE").textContent = formatCurrency(totals.realEstate);
  document.getElementById("accTotalLiab").textContent = formatCurrency(totals.liabilities);

  const list = document.getElementById("accountList");
  list.innerHTML = "";
  if (accounts.length === 0) {
    const es = emptyState("No accounts yet", "Add your bank accounts, investments, and liabilities to track your net worth.", "Add Account", "emptyStateAddAccount");
    list.innerHTML = "";
    list.appendChild(es);
    es.querySelector("#emptyStateAddAccount")?.addEventListener("click", () => openAccountForm());
    return;
  } else {
    accounts.forEach((a) => {
      const act = getAccountActivity(a.id);
      const bal = Number(a.balance) || 0;
      const balClass = a.type === "Liability" ? "negative" : "positive";
      const hasActivity = act.inflows > 0 || act.outflows > 0 || act.transfersIn > 0 || act.transfersOut > 0;
      const li = document.createElement("li");
      li.className = "account-item account-card";
      li.innerHTML = `
        <div class="account-header" data-expand="${a.id}">
          <div class="account-info">
            <span class="transaction-desc">${escapeHtml(a.name)}</span>
            <span class="account-type">${escapeHtml(a.type)}</span>
            ${a.notes ? `<span class="account-notes">${escapeHtml(a.notes)}</span>` : ""}
          </div>
          <div class="transaction-right">
            <span class="account-balance ${balClass}">${a.type === "Liability" ? "-" : ""}${formatCurrency(bal)}</span>
            <div class="account-actions">
              <button type="button" class="btn-edit">Edit</button>
              <button type="button" class="delete-btn">Delete</button>
            </div>
          </div>
        </div>
        <div class="account-summary">
          <span class="acc-meta">In: ${formatCurrency(act.inflows)}</span>
          <span class="acc-meta">Out: ${formatCurrency(act.outflows)}</span>
          <span class="acc-meta">Transfers in: ${formatCurrency(act.transfersIn)}</span>
          <span class="acc-meta">Transfers out: ${formatCurrency(act.transfersOut)}</span>
          ${act.lastActivity ? `<span class="acc-meta">Last activity: ${act.lastActivity}</span>` : ""}
        </div>
        <div class="account-detail hidden" id="accDetail-${a.id}"></div>
      `;
      li.querySelector(".btn-edit").addEventListener("click", (e) => { e.stopPropagation(); openAccountForm(a); });
      li.querySelector(".delete-btn").addEventListener("click", (e) => { e.stopPropagation(); deleteAccount(a.id); });
      li.querySelector(".account-header").addEventListener("click", (e) => {
        if (e.target.closest(".btn-edit, .delete-btn")) return;
        const detail = li.querySelector(".account-detail");
        if (!detail) return;
        detail.classList.toggle("hidden");
        if (!detail.classList.contains("hidden") && detail.innerHTML === "") {
          const linkedTx = transactions.filter((t) => t.accountId === a.id);
          const linkedTr = transfers.filter((t) => t.fromAccountId === a.id || t.toAccountId === a.id);
          let html = "";
          if (linkedTx.length > 0) {
            html += "<div class='acc-detail-section'><h5>Linked transactions</h5><ul class='acc-tx-list'>";
            linkedTx.slice(0, 10).forEach((t) => {
              const amt = t.amount > 0 ? "+" + formatCurrency(t.amount) : "-" + formatCurrency(t.amount);
              html += `<li><span>${escapeHtml(t.description)}</span><span>${amt}</span><span>${escapeHtml(t.date || "")}</span></li>`;
            });
            if (linkedTx.length > 10) html += `<li class='acc-more'>+${linkedTx.length - 10} more</li>`;
            html += "</ul></div>";
          }
          if (linkedTr.length > 0) {
            html += "<div class='acc-detail-section'><h5>Transfers</h5><ul class='acc-tx-list'>";
            linkedTr.slice(0, 10).forEach((tr) => {
              const from = accounts.find((x) => x.id === tr.fromAccountId)?.name || "?";
              const to = accounts.find((x) => x.id === tr.toAccountId)?.name || "?";
              const dir = tr.fromAccountId === a.id ? `→ ${to}` : `${from} →`;
              html += `<li><span>${dir}</span><span>${formatCurrency(tr.amount)}</span><span>${escapeHtml(tr.date || "")}</span></li>`;
            });
            if (linkedTr.length > 10) html += `<li class='acc-more'>+${linkedTr.length - 10} more</li>`;
            html += "</ul></div>";
          }
          if (!html) html = "<p class='empty-message'>No linked transactions or transfers.</p>";
          detail.innerHTML = html;
        }
      });
      list.appendChild(li);
    });
  }
}

function initAccountsModal() {
  const overlay = document.getElementById("accountFormOverlay");
  const form = document.getElementById("accountForm");
  document.getElementById("accountAdd")?.addEventListener("click", () => openAccountForm());
  document.getElementById("accountCancel")?.addEventListener("click", () => overlay.classList.add("hidden"));
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.add("hidden"); });
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("accountId").value;
    const name = document.getElementById("accountName").value;
    const type = document.getElementById("accountType").value;
    const balance = document.getElementById("accountBalance").value;
    const notes = document.getElementById("accountNotes").value;
    if (id) {
      updateAccount(Number(id), name, type, balance, notes);
    } else {
      addAccount(name, type, balance, notes);
    }
    overlay.classList.add("hidden");
    form.reset();
  });
}

/* ========== Transfers ========== */
function getNextTransferId() {
  const max = transfers.reduce((m, t) => (t.id > m ? t.id : m), 0);
  return max + 1;
}

function addTransfer(fromId, toId, amount, date, note) {
  const fromAcc = accounts.find((a) => a.id === Number(fromId));
  const toAcc = accounts.find((a) => a.id === Number(toId));
  const amt = Math.abs(Number(amount)) || 0;
  if (!fromAcc || !toAcc || fromId === toId || amt <= 0) {
    alert("Please select different accounts and enter a valid amount.");
    return;
  }
  const fromBal = Number(fromAcc.balance) || 0;
  if (fromBal < amt) {
    alert("Insufficient balance in source account.");
    return;
  }
  fromAcc.balance = fromBal - amt;
  toAcc.balance = (Number(toAcc.balance) || 0) + amt;
  transfers.push({
    id: getNextTransferId(),
    fromAccountId: fromAcc.id,
    toAccountId: toAcc.id,
    amount: amt,
    date: date || getTodayStr(),
    note: (note || "").trim(),
  });
  transfers.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  saveTransfers();
  saveAccounts();
  renderAccountsSection();
  renderTransferList();
  renderOverviewSection();
  updateAllCharts();
}

function getFilteredTransfers() {
  const accountFilter = document.getElementById("transferAccountFilter")?.value || "";
  let list = [...transfers].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (accountFilter) {
    const aid = Number(accountFilter);
    list = list.filter((t) => t.fromAccountId === aid || t.toAccountId === aid);
  }
  return list;
}

function renderTransferList() {
  const ul = document.getElementById("transferList");
  const filterEl = document.getElementById("transferAccountFilter");
  if (filterEl) {
    const current = filterEl.value;
    filterEl.innerHTML = '<option value="">All accounts</option>';
    accounts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.name} (${a.type})`;
      if (String(a.id) === current) opt.selected = true;
      filterEl.appendChild(opt);
    });
  }
  ul.innerHTML = "";
  const list = getFilteredTransfers();
  if (list.length === 0) {
    const es = emptyState("No transfers yet", "Move money between accounts without affecting income or expenses.", "Add Transfer", "emptyStateAddTransfer");
    ul.appendChild(es);
    es.querySelector("#emptyStateAddTransfer")?.addEventListener("click", () => document.getElementById("transferAdd")?.click());
    return;
  }
  list.slice(0, 30).forEach((t) => {
    const from = accounts.find((a) => a.id === t.fromAccountId);
    const to = accounts.find((a) => a.id === t.toAccountId);
    const fromName = from ? from.name : "Unknown";
    const toName = to ? to.name : "Unknown";
    const li = document.createElement("li");
    li.className = "transaction-item transfer-item";
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-desc"><span class="transfer-out">${escapeHtml(fromName)}</span> → <span class="transfer-in">${escapeHtml(toName)}</span></span>
        <span class="transaction-meta">${escapeHtml(t.date)}${t.note ? " · " + escapeHtml(t.note) : ""}</span>
      </div>
      <span class="transaction-amount">${formatCurrency(t.amount)}</span>
    `;
    ul.appendChild(li);
  });
}

function initTransferModal() {
  const overlay = document.getElementById("transferFormOverlay");
  const form = document.getElementById("transferForm");
  const fromSelect = document.getElementById("transferFrom");
  const toSelect = document.getElementById("transferTo");
  const dateInput = document.getElementById("transferDate");

  document.getElementById("transferAdd")?.addEventListener("click", () => {
    if (dateInput) dateInput.value = getTodayStr();
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";
    accounts.forEach((a) => {
      const opt1 = document.createElement("option");
      opt1.value = a.id;
      opt1.textContent = `${a.name} (${a.type}) ${formatCurrency(a.balance)}`;
      fromSelect.appendChild(opt1);
      const opt2 = document.createElement("option");
      opt2.value = a.id;
      opt2.textContent = `${a.name} (${a.type})`;
      toSelect.appendChild(opt2);
    });
    overlay?.classList.remove("hidden");
  });

  document.getElementById("transferCancel")?.addEventListener("click", () => overlay?.classList.add("hidden"));
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.add("hidden"); });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    addTransfer(
      fromSelect.value,
      toSelect.value,
      document.getElementById("transferAmount").value,
      dateInput?.value || getTodayStr(),
      document.getElementById("transferNote")?.value
    );
    overlay.classList.add("hidden");
    form.reset();
  });
}

let snapshotPendingOverwrite = null;

function initNetWorthSnapshotForm() {
  const btn = document.getElementById("snapshotCreateCurrent");
  const confirmOverlay = document.getElementById("snapshotConfirmOverlay");
  const cancelBtn = document.getElementById("snapshotConfirmCancel");
  const overwriteBtn = document.getElementById("snapshotConfirmOverwrite");

  btn?.addEventListener("click", () => {
    const month = getCurrentMonthStr();
    const result = createSnapshotFromCurrent(month, false);
    if (result.exists) {
      snapshotPendingOverwrite = month;
      document.getElementById("snapshotConfirmMessage").textContent = `A snapshot for ${month} already exists. Overwrite?`;
      if (confirmOverlay) confirmOverlay.classList.remove("hidden");
    } else if (result.saved) {
      renderOverviewSection();
      renderAnalyticsSection();
      updateAllCharts();
    }
  });

  cancelBtn?.addEventListener("click", () => {
    snapshotPendingOverwrite = null;
    if (confirmOverlay) confirmOverlay.classList.add("hidden");
  });
  overwriteBtn?.addEventListener("click", () => {
    if (snapshotPendingOverwrite) {
      createSnapshotFromCurrent(snapshotPendingOverwrite, true);
      snapshotPendingOverwrite = null;
      if (confirmOverlay) confirmOverlay.classList.add("hidden");
      renderOverviewSection();
      renderAnalyticsSection();
      updateAllCharts();
    }
  });
  confirmOverlay?.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) { snapshotPendingOverwrite = null; confirmOverlay.classList.add("hidden"); }
  });

  document.getElementById("analyticsCreateSnapshot")?.addEventListener("click", () => {
    document.getElementById("snapshotCreateCurrent")?.click();
  });
}

/* ========== Reminders / Financial Calendar ========== */
function getNextReminderId() {
  const max = reminders.reduce((m, r) => (r.id > m ? r.id : m), 0);
  return max + 1;
}

function addReminder(title, type, date, notes) {
  if (!(title || "").trim()) {
    alert("Please enter a title.");
    return;
  }
  reminders.push({
    id: getNextReminderId(),
    title: (title || "").trim(),
    type: type || "Custom",
    date: date || "",
    notes: (notes || "").trim(),
  });
  reminders.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  saveReminders();
  renderOverviewSection();
}

function removeReminder(id) {
  reminders = reminders.filter((r) => r.id !== id);
  saveReminders();
  renderOverviewSection();
}

function renderRemindersSection() {
  const container = document.getElementById("remindersList");
  if (!container) return;
  container.innerHTML = "";

  const upcoming = reminders.filter((r) => r.date).slice(0, 8);
  if (upcoming.length === 0) {
    const es = emptyState("No reminders yet", "Add payday, bills, and other important dates.", "Add Reminder", "emptyStateAddReminder");
    container.appendChild(es);
    es.querySelector("#emptyStateAddReminder")?.addEventListener("click", () => document.getElementById("reminderAdd")?.click());
    return;
  }
  upcoming.forEach((r) => {
    const div = document.createElement("div");
    div.className = "reminder-item";
    div.innerHTML = `
      <div class="reminder-info">
        <span class="transaction-desc">${escapeHtml(r.title)}</span>
        <span class="reminder-type">${escapeHtml(r.type)} • ${escapeHtml(r.date)}</span>
      </div>
      <button type="button" class="delete-btn">×</button>
    `;
    div.querySelector(".delete-btn").addEventListener("click", () => removeReminder(r.id));
    container.appendChild(div);
  });
}

function initRemindersModal() {
  const overlay = document.getElementById("reminderFormOverlay");
  const form = document.getElementById("reminderForm");
  document.getElementById("reminderAdd")?.addEventListener("click", () => {
    const d = document.getElementById("reminderDate");
    if (d) d.value = getTodayStr();
    overlay.classList.remove("hidden");
  });
  document.getElementById("reminderCancel")?.addEventListener("click", () => overlay.classList.add("hidden"));
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.add("hidden"); });
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    addReminder(
      document.getElementById("reminderTitle").value,
      document.getElementById("reminderType").value,
      document.getElementById("reminderDate").value,
      document.getElementById("reminderNotes").value
    );
    overlay.classList.add("hidden");
    form.reset();
  });
}

/* ========== Investments ========== */
function renderInvestmentsSection() {
  const invAccounts = accounts.filter((a) => a.type === "Investment" || a.type === "Retirement");
  const total = invAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  document.getElementById("invTotal").textContent = formatCurrency(total);

  const ef = getEmergencyFundData();
  document.getElementById("invEmergencyMonths").textContent =
    (Number(settings.essentialExpenses) || 0) > 0 ? `${ef.monthsCovered.toFixed(1)} / ${ef.targetMonths} months (${ef.label})` : "Set essential expenses";
  const progEl = document.getElementById("invEmergencyProgress");
  if (progEl) progEl.style.width = Math.min(100, ef.pct) + "%";
  const neededEl = document.getElementById("invEmergencyNeeded");
  if (neededEl) neededEl.textContent = ef.needed > 0 ? `${formatCurrency(ef.needed)} to target` : ef.label === "Strong" ? "Target met" : "";

  const container = document.getElementById("investAccountsList");
  if (container) {
    container.innerHTML = "";
    if (invAccounts.length === 0) {
      container.innerHTML = '<p class="empty-message">No investment accounts. Add one from Accounts or click Add Account.</p>';
    } else {
      invAccounts.forEach((a) => {
        const card = document.createElement("div");
        card.className = "account-card";
        card.innerHTML = `
          <span class="account-name">${escapeHtml(a.name)}</span>
          <span class="account-type">${escapeHtml(a.type)}</span>
          <span class="account-balance" style="color:var(--accent-income)">${formatCurrency(a.balance)}</span>
          <div class="account-actions">
            <button type="button" class="btn-edit">Edit</button>
            <button type="button" class="delete-btn">Delete</button>
          </div>
        `;
        card.querySelector(".btn-edit").addEventListener("click", () => openAccountForm(a));
        card.querySelector(".delete-btn").addEventListener("click", () => deleteAccount(a.id));
        container.appendChild(card);
      });
    }
  }

  const allocVisual = document.getElementById("invAllocationVisual");
  const allocEl = document.getElementById("invAllocation");
  const colors = ["#3b82f6", "#a78bfa", "#f59e0b", "#06b6d4", "#22c55e"];
  if (allocVisual) {
    allocVisual.innerHTML = "";
    if (total > 0) {
      invAccounts.forEach((a, i) => {
        const v = Number(a.balance) || 0;
        const pct = Math.round((v / total) * 100);
        if (pct > 0) {
          const chip = document.createElement("span");
          chip.className = "alloc-chip";
          chip.innerHTML = `<span class="alloc-dot" style="background:${colors[i % colors.length]}"></span>${escapeHtml(a.name)} ${pct}%`;
          allocVisual.appendChild(chip);
        }
      });
    }
  }
  if (allocEl) {
    allocEl.textContent =
      total > 0
        ? invAccounts
            .map((a) => {
              const v = Number(a.balance) || 0;
              const pct = Math.round((v / total) * 100);
              return pct > 0 ? `${a.name}: ${pct}%` : "";
            })
            .filter(Boolean)
            .join(" • ") || "—"
        : "—";
  }

  const insightEl = document.getElementById("invAllocationInsight");
  if (insightEl && total > 0) {
    const largest = invAccounts.reduce((best, a) => {
      const v = Number(a.balance) || 0;
      return v > (Number(best.balance) || 0) ? a : best;
    }, invAccounts[0]);
    const largestPct = Math.round(((Number(largest.balance) || 0) / total) * 100);
    let msg = `Largest: ${largest.name} (${largestPct}%). `;
    if (largestPct > 70) msg += "Concentration warning: consider diversifying.";
    insightEl.textContent = msg;
  }
}

document.getElementById("invAddAccount")?.addEventListener("click", () => {
  openAccountForm();
  document.getElementById("accountType").value = "Investment";
});

/* ========== Real Estate ========== */
function renderRealEstateSection() {
  const reAccounts = accounts.filter((a) => a.type === "Real Estate");
  const total = reAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  document.getElementById("reEquityVal").textContent = formatCurrency(total);

  const container = document.getElementById("reAccountsList");
  if (!container) return;
  container.innerHTML = "";
  if (reAccounts.length === 0) {
    container.innerHTML = '<li class="empty-message">No real estate accounts. Add one from Accounts or click Add Account.</li>';
  } else {
    reAccounts.forEach((a) => {
      const li = document.createElement("li");
      li.className = "account-item";
      li.innerHTML = `
        <div class="account-info">
          <span class="transaction-desc">${escapeHtml(a.name)}</span>
          <span class="account-type">${escapeHtml(a.type)}</span>
        </div>
        <div class="transaction-right">
          <span class="account-balance positive">${formatCurrency(a.balance)}</span>
          <div class="account-actions">
            <button type="button" class="btn-edit">Edit</button>
            <button type="button" class="delete-btn">Delete</button>
          </div>
        </div>
      `;
      li.querySelector(".btn-edit").addEventListener("click", () => openAccountForm(a));
      li.querySelector(".delete-btn").addEventListener("click", () => deleteAccount(a.id));
      container.appendChild(li);
    });
  }
}

document.getElementById("reAddAccount")?.addEventListener("click", () => {
  openAccountForm();
  document.getElementById("accountType").value = "Real Estate";
});

/* ========== Liabilities ========== */
function renderLiabilitiesSection() {
  const liabAccounts = accounts.filter((a) => a.type === "Liability");
  const total = liabAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  document.getElementById("liabTotal").textContent = formatCurrency(total);

  const container = document.getElementById("liabList");
  container.innerHTML = "";
  if (liabAccounts.length === 0) {
    container.innerHTML = '<li class="empty-message">No liability accounts. Add one from Accounts or click Add Account.</li>';
  } else {
    liabAccounts.forEach((a) => {
      const li = document.createElement("li");
      li.className = "liability-item";
      li.innerHTML = `
        <div class="liab-info">
          <span class="transaction-desc">${escapeHtml(a.name)}</span>
          <span class="liab-meta">${escapeHtml(a.type)}</span>
        </div>
        <div class="transaction-right">
          <span class="liab-balance">${formatCurrency(a.balance)}</span>
          <button type="button" class="btn-edit">Edit</button>
          <button type="button" class="delete-btn">Delete</button>
        </div>
      `;
      li.querySelector(".btn-edit").addEventListener("click", () => openAccountForm(a));
      li.querySelector(".delete-btn").addEventListener("click", () => deleteAccount(a.id));
      container.appendChild(li);
    });
  }
}

document.getElementById("liabAddAccount")?.addEventListener("click", () => {
  openAccountForm();
  document.getElementById("accountType").value = "Liability";
});

/* ========== Insurance & Recurring ========== */
function getNextInsuranceId() {
  const max = insurance.reduce((m, i) => (i.id > m ? i.id : m), 0);
  return max + 1;
}

function getNextRecurringId() {
  const max = recurring.reduce((m, r) => (r.id > m ? r.id : m), 0);
  return max + 1;
}

function addInsurance(name, type, cost, freq, renewal, notes) {
  if (!(name || "").trim()) {
    alert("Please enter an insurance name.");
    return;
  }
  insurance.push({
    id: getNextInsuranceId(),
    name: (name || "").trim(),
    type: type || "Other",
    cost: Number(cost) || 0,
    freq: freq || "monthly",
    renewal: (renewal || "").trim(),
    notes: (notes || "").trim(),
  });
  saveInsurance();
  renderInsuranceRecurringSection();
}

function removeInsurance(id) {
  insurance = insurance.filter((i) => i.id !== id);
  saveInsurance();
  renderInsuranceRecurringSection();
}

/* Recurring items: name, type, amount, freq (monthly|yearly), nextDue, notes */
function addRecurring(name, type, amount, freq, nextDue, notes) {
  if (!(name || "").trim()) {
    alert("Please enter a name.");
    return;
  }
  const amt = Number(amount) || 0;
  const monthlyAmt = (freq || "monthly") === "yearly" ? amt / 12 : amt;
  recurring.push({
    id: getNextRecurringId(),
    name: (name || "").trim(),
    type: type || "Other",
    amount: amt,
    freq: freq || "monthly",
    nextDue: (nextDue || "").trim(),
    notes: (notes || "").trim(),
  });
  saveRecurring();
  renderInsuranceRecurringSection();
}

function removeRecurring(id) {
  recurring = recurring.filter((r) => r.id !== id);
  saveRecurring();
  renderInsuranceRecurringSection();
}

function getInsuranceMonthlyCost(i) {
  const c = Number(i.cost) || 0;
  return i.freq === "annual" ? c / 12 : c;
}

function getRecurringMonthlyAmount(r) {
  const amt = Number(r.amount) || 0;
  return (r.freq || "monthly") === "yearly" ? amt / 12 : amt;
}

function renderInsuranceRecurringSection() {
  // Recurring (freq: monthly|yearly, nextDue for reminders)
  let recTotal = 0;
  const recList = document.getElementById("recurringList");
  if (!recList) return;
  recList.innerHTML = "";
  recurring.forEach((r) => {
    const monthly = getRecurringMonthlyAmount(r);
    recTotal += monthly;
    const amt = Number(r.amount) || 0;
    const freqLabel = (r.freq || "monthly") === "yearly" ? "/yr" : "/mo";
    const meta = [r.type, freqLabel + formatCurrency(amt)];
    if (r.nextDue) meta.push("Due: " + r.nextDue);
    const div = document.createElement("div");
    div.className = "recurring-item";
    div.innerHTML = `
      <div>
        <span class="transaction-desc">${escapeHtml(r.name)}</span>
        <span class="rec-meta">${meta.join(" • ")}</span>
      </div>
      <div class="transaction-right">
        <span>~${formatCurrency(monthly)}/mo</span>
        <button type="button" class="delete-btn">Delete</button>
      </div>
    `;
    div.querySelector(".delete-btn").addEventListener("click", () => removeRecurring(r.id));
    recList.appendChild(div);
  });
  const rtEl = document.getElementById("recurringTotal");
  if (rtEl) rtEl.textContent = formatCurrency(recTotal);

  // Insurance - monthly cost + upcoming renewals
  let insMonthlyTotal = 0;
  const insList = document.getElementById("insuranceList");
  insList.innerHTML = "";
  const renewals = [];
  insurance.forEach((i) => {
    const m = getInsuranceMonthlyCost(i);
    insMonthlyTotal += m;
    if (i.renewal) renewals.push({ name: i.name, date: i.renewal });
    const div = document.createElement("div");
    div.className = "insurance-item";
    const costText = i.freq === "annual" ? formatCurrency(i.cost) + "/yr" : formatCurrency(i.cost) + "/mo";
    div.innerHTML = `
      <div>
        <span class="transaction-desc">${escapeHtml(i.name)}</span>
        <span class="ins-meta">${escapeHtml(i.type)} • ${costText}</span>
      </div>
      <div class="transaction-right">
        <span>~${formatCurrency(m)}/mo</span>
        <button type="button" class="delete-btn">Delete</button>
      </div>
    `;
    div.querySelector(".delete-btn").addEventListener("click", () => removeInsurance(i.id));
    insList.appendChild(div);
  });

  document.getElementById("recurringTotal").textContent = formatCurrency(recTotal);
  document.getElementById("insuranceMonthlyTotal").textContent = formatCurrency(insMonthlyTotal);
  const upcomingEl = document.getElementById("upcomingRenewals");
  if (renewals.length === 0) {
    upcomingEl.textContent = "—";
  } else {
    const next = renewals.slice(0, 3).map((r) => `${r.name} (${r.date})`).join("; ");
    upcomingEl.textContent = next;
  }
}

function initInsuranceRecurringModals() {
  // Insurance
  const insOverlay = document.getElementById("insuranceFormOverlay");
  const insForm = document.getElementById("insuranceForm");
  document.getElementById("insuranceAdd")?.addEventListener("click", () => insOverlay.classList.remove("hidden"));
  document.getElementById("insCancel")?.addEventListener("click", () => insOverlay.classList.add("hidden"));
  insOverlay?.addEventListener("click", (e) => { if (e.target === insOverlay) insOverlay.classList.add("hidden"); });
  insForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    addInsurance(
      document.getElementById("insName").value,
      document.getElementById("insType").value,
      document.getElementById("insCost").value,
      document.getElementById("insFreq").value,
      document.getElementById("insRenewal").value,
      document.getElementById("insNotes").value
    );
    insOverlay.classList.add("hidden");
    insForm.reset();
  });

  // Recurring
  const recOverlay = document.getElementById("recurringFormOverlay");
  const recForm = document.getElementById("recurringForm");
  document.getElementById("recurringAdd")?.addEventListener("click", () => recOverlay.classList.remove("hidden"));
  document.getElementById("recCancel")?.addEventListener("click", () => recOverlay.classList.add("hidden"));
  recOverlay?.addEventListener("click", (e) => { if (e.target === recOverlay) recOverlay.classList.add("hidden"); });
  recForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    addRecurring(
      document.getElementById("recName").value,
      document.getElementById("recType").value,
      document.getElementById("recAmount").value,
      document.getElementById("recFreq")?.value || "monthly",
      document.getElementById("recNextDue")?.value || "",
      document.getElementById("recNotes").value
    );
    recOverlay.classList.add("hidden");
    recForm.reset();
  });
}

/* ========== Business ========== */
function renderBusinessSection() {
  document.getElementById("bizIncome").value = business.income || "";
  document.getElementById("bizExpenses").value = business.expenses || "";
  document.getElementById("bizCash").value = business.cashBalance || "";
  document.getElementById("bizTaxReserve").value = business.taxReserve || "";
  document.getElementById("bizNotes").value = business.notes || "";

  const profit = (Number(business.income) || 0) - (Number(business.expenses) || 0);
  const profitEl = document.getElementById("bizProfit");
  profitEl.textContent = formatCurrency(profit);
  profitEl.className = profit >= 0 ? "positive" : "negative";
}

function initBusinessSection() {
  const fields = [
    { id: "bizIncome", key: "income", isNum: true },
    { id: "bizExpenses", key: "expenses", isNum: true },
    { id: "bizCash", key: "cashBalance", isNum: true },
    { id: "bizTaxReserve", key: "taxReserve", isNum: true },
    { id: "bizNotes", key: "notes", isNum: false },
  ];
  fields.forEach(({ id, key, isNum }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      business[key] = isNum ? Number(el.value) || 0 : el.value;
      saveBusiness();
      renderBusinessSection();
      renderOverviewSection();
    });
  });
}

/* ========== Tax ========== */
function renderTaxSection() {
  document.getElementById("taxPersonal").value = tax.personalTax || "";
  document.getElementById("taxBusiness").value = tax.businessTax || "";
  document.getElementById("taxSetAside").value = tax.setAside || "";
  document.getElementById("taxDeadline").value = tax.deadline || "";

  const total = (Number(tax.personalTax) || 0) + (Number(tax.businessTax) || 0);
  const setAside = Number(tax.setAside) || 0;
  const gap = setAside - total;

  document.getElementById("taxTotal").textContent = formatCurrency(total);
  const gapEl = document.getElementById("taxGap");
  gapEl.textContent = formatCurrency(Math.abs(gap)) + (gap >= 0 ? " surplus" : " gap");
  gapEl.className = gap >= 0 ? "positive" : "negative";
}

function initTaxSection() {
  const fields = [
    { id: "taxPersonal", key: "personalTax", isNum: true },
    { id: "taxBusiness", key: "businessTax", isNum: true },
    { id: "taxSetAside", key: "setAside", isNum: true },
    { id: "taxDeadline", key: "deadline", isNum: false },
  ];
  fields.forEach(({ id, key, isNum }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      tax[key] = isNum ? Number(el.value) || 0 : el.value;
      saveTax();
      renderTaxSection();
      renderOverviewSection();
    });
  });
}

/* ========== Goals ========== */
function getNextGoalId() {
  const max = goals.reduce((m, g) => (g.id > m ? g.id : m), 0);
  return max + 1;
}

function addGoal(name, target, current, monthly) {
  const t = Number(target) || 0;
  const c = Number(current) || 0;
  const m = Number(monthly) || 0;
  if (!name.trim()) {
    alert("Please enter a goal name.");
    return;
  }
  goals.push({ id: getNextGoalId(), name: name.trim(), target: t, current: c, monthly: m });
  saveGoals();
  renderGoalsSection();
  renderOverviewSection();
}

function removeGoal(id) {
  const g = goals.find((x) => x.id === id);
  if (g && !confirm(`Remove goal "${g.name}"?`)) return;
  goals = goals.filter((x) => x.id !== id);
  renderGoalsSection();
  renderOverviewSection();
}

function renderGoalsSection() {
  const fiContainer = document.getElementById("goalsFIProgress");
  if (fiContainer) {
    const fi = getFIProgress();
    if (fi.fireNumber > 0) {
      fiContainer.innerHTML = `
        <div class="fi-stats">
          <span>FIRE Number: ${formatCurrency(fi.fireNumber)}</span>
          <span>Remaining: ${formatCurrency(fi.remaining)}</span>
        </div>
        <div class="goal-bar"><div class="goal-bar-fill" style="width:${Math.min(100, fi.progress)}%"></div></div>
        <div class="fi-pct">${fi.progress.toFixed(1)}% to FI</div>
      `;
    } else {
      fiContainer.innerHTML = '<p class="empty-message">Set annual expenses in Settings to track FI progress.</p>';
    }
  }

  const container = document.getElementById("goalsList");
  container.innerHTML = "";

  if (goals.length === 0) {
    const es = emptyState("No goals yet", "Set savings or investment targets to track your progress.", "Add Goal", "emptyStateAddGoal");
    container.innerHTML = "";
    container.appendChild(es);
    es.querySelector("#emptyStateAddGoal")?.addEventListener("click", () => document.getElementById("goalsAdd")?.click());
    return;
  }

  goals.forEach((g) => {
    const target = Number(g.target) || 1;
    const current = Number(g.current) || 0;
    const monthly = Number(g.monthly) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    let status = "Needs Attention";
    if (pct >= 100) status = "Completed";
    else if (monthly > 0) {
      const remaining = Math.max(0, target - current);
      const monthsLeft = Math.ceil(remaining / monthly);
      if (monthsLeft <= 60) status = "On Track";
    }

    let estComplete = "";
    if (pct < 100 && monthly > 0) {
      const remaining = Math.max(0, target - current);
      const months = Math.ceil(remaining / monthly);
      estComplete = months <= 120 ? `~${months} months` : `~${Math.round(months / 12)} years`;
    }

    const div = document.createElement("div");
    div.className = "goal-card";
    div.innerHTML = `
      <div class="goal-header">
        <span class="goal-name">${escapeHtml(g.name)}</span>
        <span class="goal-status goal-status-${status.toLowerCase().replace(/ /g, "-")}">${escapeHtml(status)}</span>
        <button type="button" class="delete-btn">Remove</button>
      </div>
      <label class="goal-current-label">Current: £<input type="number" data-id="${g.id}" step="0.01" value="${current}" /></label>
      <label class="goal-monthly-label">Monthly: £<input type="number" data-id-monthly="${g.id}" step="0.01" value="${monthly}" placeholder="0" /></label>
      <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
      <div class="goal-meta">${formatCurrency(current)} / ${formatCurrency(target)} (${pct}%)</div>
      ${estComplete ? `<div class="goal-estimate">Est. ${estComplete}</div>` : ""}
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => removeGoal(g.id));
    div.querySelector("[data-id]")?.addEventListener("change", (e) => {
      const goal = goals.find((x) => x.id === g.id);
      if (goal) {
        goal.current = Number(e.target.value) || 0;
        saveGoals();
        renderGoalsSection();
        renderOverviewSection();
      }
    });
    div.querySelector("[data-id-monthly]")?.addEventListener("change", (e) => {
      const goal = goals.find((x) => x.id === g.id);
      if (goal) {
        goal.monthly = Number(e.target.value) || 0;
        saveGoals();
        renderGoalsSection();
        renderOverviewSection();
      }
    });
    container.appendChild(div);
  });
}

function initGoalsModal() {
  const overlay = document.getElementById("goalFormOverlay");
  const form = document.getElementById("goalForm");
  const cancelBtn = document.getElementById("goalCancel");

  document.getElementById("goalsAdd")?.addEventListener("click", () => {
    overlay.classList.remove("hidden");
  });

  cancelBtn?.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("goalName").value;
    const target = document.getElementById("goalTarget").value;
    const current = document.getElementById("goalCurrent").value;
    const monthly = document.getElementById("goalMonthly")?.value || 0;
    addGoal(name, target, current, monthly);
    overlay.classList.add("hidden");
    form.reset();
    document.getElementById("goalCurrent").value = "0";
    const gm = document.getElementById("goalMonthly");
    if (gm) gm.value = "";
  });
}

/* ========== Settings ========== */
function renderSettingsSection() {
  document.getElementById("setSalary").value = settings.monthlySalary || "";
  document.getElementById("setExpenses").value = settings.essentialExpenses || "";
  document.getElementById("setEmergencyMonths").value = settings.emergencyMonths || 6;
  document.getElementById("setTheme").value = settings.theme || "dark";
  const demoPanel = document.getElementById("demoDataPanel");
  if (demoPanel) demoPanel.classList.toggle("hidden", localStorage.getItem(KEYS.demoDataLoaded) !== "1");
  const ae = document.getElementById("setAnnualExpenses");
  const fm = document.getElementById("setFireMultiplier");
  const tp = document.getElementById("setTargetPassive");
  if (ae) ae.value = settings.annualExpenses || "";
  if (fm) fm.value = settings.fireMultiplier || 25;
  if (tp) tp.value = settings.targetPassive || "";
}

function initSettingsSection() {
  document.getElementById("settingsSave")?.addEventListener("click", () => {
    settings.monthlySalary = Number(document.getElementById("setSalary").value) || 0;
    settings.essentialExpenses = Number(document.getElementById("setExpenses").value) || 0;
    settings.emergencyMonths = Math.max(1, Number(document.getElementById("setEmergencyMonths").value) || 6);
    settings.theme = document.getElementById("setTheme").value || "dark";
    settings.annualExpenses = Number(document.getElementById("setAnnualExpenses")?.value) || 0;
    settings.fireMultiplier = Math.max(20, Number(document.getElementById("setFireMultiplier")?.value) || 25);
    settings.targetPassive = Number(document.getElementById("setTargetPassive")?.value) || 0;
    saveSettings();
    renderSettingsSection();
    renderOverviewSection();
    alert("Settings saved.");
  });

  document.getElementById("reopenOnboarding")?.addEventListener("click", () => {
    localStorage.removeItem(KEYS.onboardingCompleted);
    document.getElementById("onboardingOverlay")?.classList.remove("hidden");
  });

  document.getElementById("clearDemoData")?.addEventListener("click", () => {
    if (!confirm("Clear all demo data? This cannot be undone.")) return;
    clearDemoData();
  });

  document.getElementById("showSetupChecklist")?.addEventListener("click", () => {
    localStorage.removeItem(KEYS.setupChecklistHidden);
    switchToSection("overview");
    renderSetupChecklist();
  });
}

/* ========== Analytics Section ========== */
let chartAnalyticsNetWorth = null;
let chartAnalyticsInOut = null;
let chartAnalyticsSavings = null;

function renderAnalyticsSection() {
  const table = document.getElementById("snapshotsTable");
  if (table) {
    const thead = "<thead><tr><th>Month</th><th>Net Worth</th><th>Cash</th><th>Investments</th><th>Real Estate</th><th>Business</th><th>Liabilities</th><th>Income</th><th>Expenses</th></tr></thead>";
    let tbody = "<tbody>";
    const sorted = [...monthlySnapshots].sort((a, b) => b.month.localeCompare(a.month));
    sorted.forEach((s) => {
      tbody += `<tr>
        <td>${escapeHtml(s.month)}</td>
        <td>${formatCurrency(s.netWorth)}</td>
        <td>${formatCurrency(s.cash)}</td>
        <td>${formatCurrency(s.investments)}</td>
        <td>${formatCurrency(s.realEstate)}</td>
        <td>${formatCurrency(s.business)}</td>
        <td>${formatCurrency(s.liabilities)}</td>
        <td>${formatCurrency(s.income)}</td>
        <td>${formatCurrency(s.expenses)}</td>
      </tr>`;
    });
    tbody += "</tbody>";
    table.innerHTML = sorted.length ? thead + tbody : "<tbody><tr><td colspan='9' class='empty-message'>No snapshots yet. Create one from Overview.</td></tr></tbody>";
  }

  const mixEl = document.getElementById("analyticsAssetMix");
  if (mixEl) {
    const acc = getAccountTotals();
    const total = acc.totalAssets + acc.liabilities || 1;
    const items = [
      { n: "Cash", v: acc.cash, c: "#22c55e" },
      { n: "Investments", v: acc.investments, c: "#3b82f6" },
      { n: "Real Estate", v: acc.realEstate, c: "#a78bfa" },
      { n: "Business", v: acc.business, c: "#f59e0b" },
      { n: "Liabilities", v: acc.liabilities, c: "#ef4444" },
    ].filter((x) => x.v > 0);
    let html = "";
    items.forEach((x) => {
      const pct = Math.round((x.v / Math.max(total, 1)) * 100);
      html += `<div class="alloc-chip"><span class="alloc-dot" style="background:${x.c}"></span>${x.n}: ${formatCurrency(x.v)} (${pct}%)</div>`;
    });
    mixEl.innerHTML = html || "<p class='empty-message'>No asset data</p>";
  }

  const upcomingEl = document.getElementById("analyticsUpcoming");
  if (upcomingEl) {
    const items = [];
    reminders.forEach((r) => { if (r.date) items.push({ title: r.title, date: r.date }); });
    recurring.forEach((r) => { if (r.nextDue) items.push({ title: r.name + " (recurring)", date: r.nextDue }); });
    insurance.forEach((i) => { if (i.renewal) items.push({ title: i.name + " renewal", date: i.renewal }); });
    items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const today = getTodayStr();
    const upcoming = items.filter((x) => x.date >= today).slice(0, 10);
    if (upcoming.length === 0) {
      upcomingEl.innerHTML = "<p class='empty-message'>No upcoming dates</p>";
    } else {
      upcomingEl.innerHTML = upcoming.map((x) => `<div class="reminder-item"><span>${escapeHtml(x.title)}</span><span>${escapeHtml(x.date)}</span></div>`).join("");
    }
  }

  updateAnalyticsCharts();
}

function updateAnalyticsCharts() {
  if (typeof Chart === "undefined") return;
  const ctx1 = document.getElementById("chartAnalyticsNetWorth");
  const ctx2 = document.getElementById("chartAnalyticsInOut");
  const ctx3 = document.getElementById("chartAnalyticsSavings");
  const sorted = [...monthlySnapshots].sort((a, b) => a.month.localeCompare(b.month));

  if (ctx1 && sorted.length > 0) {
    if (chartAnalyticsNetWorth) chartAnalyticsNetWorth.destroy();
    chartAnalyticsNetWorth = new Chart(ctx1, {
      type: "line",
      data: {
        labels: sorted.map((s) => s.month),
        datasets: [{ label: "Net Worth", data: sorted.map((s) => s.netWorth), borderColor: CHART_COLORS.accent, fill: true, tension: 0.3 }],
      },
      options: getChartOptions("line"),
    });
  }

  if (ctx2 && sorted.length > 0) {
    if (chartAnalyticsInOut) chartAnalyticsInOut.destroy();
    chartAnalyticsInOut = new Chart(ctx2, {
      type: "bar",
      data: {
        labels: sorted.map((s) => s.month),
        datasets: [
          { label: "Income", data: sorted.map((s) => s.income), backgroundColor: CHART_COLORS.income },
          { label: "Expenses", data: sorted.map((s) => s.expenses), backgroundColor: CHART_COLORS.expense },
        ],
      },
      options: getChartOptions("bar"),
    });
  }

  if (ctx3 && sorted.length > 0) {
    if (chartAnalyticsSavings) chartAnalyticsSavings.destroy();
    const rates = sorted.map((s) => {
      const inc = s.income || 0;
      return inc > 0 ? Math.round(((inc - (s.expenses || 0)) / inc) * 100) : null;
    });
    chartAnalyticsSavings = new Chart(ctx3, {
      type: "line",
      data: {
        labels: sorted.map((s) => s.month),
        datasets: [{ label: "Savings Rate %", data: rates, borderColor: "#06b6d4", fill: true, tension: 0.3 }],
      },
      options: getChartOptions("line"),
    });
  }
}

/* ========== Init ========== */
function init() {
  loadAll();
  initOnboarding();
  initSetupChecklist();
  initNavigation();
  initMobileMenu();
  initQuickActions();
  initBackupSection();
  initCashFlowForm();
  initAccountsModal();
  initTransferModal();
  initNetWorthSnapshotForm();
  initRemindersModal();
  initInsuranceRecurringModals();
  initBusinessSection();
  initTaxSection();
  initGoalsModal();
  initUKSection();
  initSettingsSection();

  // Initial render of all sections
  renderSetupChecklist();
  renderOverviewSection();
  renderAccountsSection();
  renderCashFlowSection();
  renderInsuranceRecurringSection();
  renderTransferList();
  renderAnalyticsSection();
  renderInvestmentsSection();
  renderRealEstateSection();
  renderLiabilitiesSection();
  renderBusinessSection();
  renderTaxSection();
  renderGoalsSection();
  renderInsightsSection();
  renderUKSection();
  renderSettingsSection();

  // Charts (Chart.js loaded from CDN)
  if (typeof Chart !== "undefined") {
    updateAllCharts();
  }
}

init();
