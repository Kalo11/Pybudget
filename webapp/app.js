const STORAGE_KEY = "budgetbeacon_web_v1";
const LEGACY_STORAGE_KEYS = ["pybudget_web_v1"];
const ONBOARDING_KEY = "budgetbeacon_onboarding_seen_v1";
const CLOUD_SYNC_FLAG_QUERY_PARAM = "cloudSync";
const CLOUD_SYNC_FLAG_KEY = "budgetbeacon_cloud_sync_enabled_v1";
const CLOUD_SYNC_STUB_KEY = "budgetbeacon_cloud_sync_stub_v1";
const CLOUD_SYNC_META_KEY = "budgetbeacon_cloud_sync_meta_v1";

const EXPENSE_CATEGORIES = [
  "Groceries", "Mortgage/Rent", "Water", "Gas", "Electric", "Transportation", "Dining", "Entertainment",
  "Healthcare", "Car Insurance", "Credit Cards", "Loans", "Student Loans", "Childcare", "Education", "Internet", "Cellphone",
  "Shopping", "Personal Care", "Travel", "Gifts", "Taxes", "Other"
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Interest", "Dividends", "Rental Income", "Refund", "Gift", "Other Income"
];

const EXPENSE_CATEGORY_COLORS = [
  "#246aaf", "#ad4e3b", "#2e8f6b", "#7557a8", "#b07723", "#1f7e91", "#5b5d90", "#97754e"
];

const INCOME_CATEGORY_COLORS = [
  "#2a8f6d", "#4f7fc2", "#7b64bf", "#3f9c96", "#a67d2a", "#6a8d3b"
];

const DEFAULT_SETTINGS = {
  defaultType: "expense",
  dataScope: "month",
  monthStartDay: 1,
  sortOrder: "date_desc"
};

const SORT_OPTIONS = new Set(["date_desc", "date_asc", "amount_desc", "amount_asc"]);
const RECURRING_FREQUENCIES = new Set(["weekly", "bi-weekly", "semi-monthly", "monthly"]);
const DEFAULT_RECURRING_FREQUENCY = "monthly";
const LEGACY_EXPENSE_CATEGORY_RENAMES = new Map([
  ["rent", "Mortgage/Rent"],
  ["utilities", "Electric"],
  ["insurance", "Car Insurance"],
  ["debt payment", "Loans"],
  ["phone/internet", "Internet"]
]);

const onboardingSteps = [
  {
    title: "Welcome to BudgetBeacon",
    body: "Step 1 of 3: Start by setting your monthly budget goal on the left side."
  },
  {
    title: "Add Your Money Activity",
    body: "Step 2 of 3: Add each income and expense as it happens. This keeps totals accurate."
  },
  {
    title: "Track and Protect Data",
    body: "Step 3 of 3: Use search and filters to find entries, then export backup files often."
  }
];

const storageAdapter = createStorageAdapter();
const state = load();
let editingEntryId = null;
let onboardingStep = 0;

const el = {
  addEntrySection: document.getElementById("addEntrySection"),
  typeInput: document.getElementById("typeInput"),
  categoryInput: document.getElementById("categoryInput"),
  manageCategoriesBtn: document.getElementById("manageCategoriesBtn"),
  amountInput: document.getElementById("amountInput"),
  amountInlineError: document.getElementById("amountInlineError"),
  noteInput: document.getElementById("noteInput"),
  recurringToggleInput: document.getElementById("recurringToggleInput"),
  recurringFrequencyInput: document.getElementById("recurringFrequencyInput"),
  recurringStartInput: document.getElementById("recurringStartInput"),
  recurringList: document.getElementById("recurringList"),
  saveBtn: document.getElementById("saveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  budgetInput: document.getElementById("budgetInput"),
  budgetInlineError: document.getElementById("budgetInlineError"),
  monthStartInput: document.getElementById("monthStartInput"),
  saveBudgetBtn: document.getElementById("saveBudgetBtn"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataBtn: document.getElementById("importDataBtn"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  storageModeLabel: document.getElementById("storageModeLabel"),
  syncModeLabel: document.getElementById("syncModeLabel"),
  sampleDataBtn: document.getElementById("sampleDataBtn"),
  demoBanner: document.getElementById("demoBanner"),
  importFileInput: document.getElementById("importFileInput"),
  scopeMonthBtn: document.getElementById("scopeMonthBtn"),
  scopeAllBtn: document.getElementById("scopeAllBtn"),
  dataScopeLabel: document.getElementById("dataScopeLabel"),
  filterType: document.getElementById("filterType"),
  filterCategory: document.getElementById("filterCategory"),
  sortInput: document.getElementById("sortInput"),
  searchInput: document.getElementById("searchInput"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  topCategoryFilters: document.getElementById("topCategoryFilters"),
  rows: document.getElementById("entryRows"),
  emptyState: document.getElementById("emptyState"),
  incomeTotal: document.getElementById("incomeTotal"),
  expenseTotal: document.getElementById("expenseTotal"),
  balanceTotal: document.getElementById("balanceTotal"),
  budgetGoal: document.getElementById("budgetGoal"),
  budgetLeft: document.getElementById("budgetLeft"),
  budgetProgressLabel: document.getElementById("budgetProgressLabel"),
  budgetScopeLabel: document.getElementById("budgetScopeLabel"),
  budgetProgressFill: document.getElementById("budgetProgressFill"),
  status: document.getElementById("status"),
  entryCount: document.getElementById("entryCount"),
  helpBtn: document.getElementById("helpBtn"),
  helpDialog: document.getElementById("helpDialog"),
  editDialog: document.getElementById("editDialog"),
  editTypeInput: document.getElementById("editTypeInput"),
  editCategoryInput: document.getElementById("editCategoryInput"),
  editAmountInput: document.getElementById("editAmountInput"),
  editAmountInlineError: document.getElementById("editAmountInlineError"),
  editNoteInput: document.getElementById("editNoteInput"),
  saveEditBtn: document.getElementById("saveEditBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  categoryDialog: document.getElementById("categoryDialog"),
  categoryManagerType: document.getElementById("categoryManagerType"),
  categoryManagerList: document.getElementById("categoryManagerList"),
  newCategoryNameInput: document.getElementById("newCategoryNameInput"),
  newCategoryColorInput: document.getElementById("newCategoryColorInput"),
  addCategoryBtn: document.getElementById("addCategoryBtn"),
  closeCategoryDialogBtn: document.getElementById("closeCategoryDialogBtn"),
  onboardingDialog: document.getElementById("onboardingDialog"),
  onboardTitle: document.getElementById("onboardTitle"),
  onboardBody: document.getElementById("onboardBody"),
  onboardBackBtn: document.getElementById("onboardBackBtn"),
  onboardNextBtn: document.getElementById("onboardNextBtn"),
  onboardSkipBtn: document.getElementById("onboardSkipBtn"),
  monthChart: document.getElementById("monthChart"),
  categoryChart: document.getElementById("categoryChart")
};

wire();
const addedRecurringEntries = applyRecurringEntries();
render();
maybeStartOnboarding();
setTimeout(() => focusAmountInput(), 0);
if (addedRecurringEntries > 0) {
  setStatus(`Added ${addedRecurringEntries} recurring entr${addedRecurringEntries === 1 ? "y" : "ies"}.`);
} else if (storageAdapter.mode !== "local") {
  setStatus("Cloud sync adapter enabled (stub mode).");
}

function wire() {
  el.typeInput.addEventListener("change", () => {
    state.settings.defaultType = el.typeInput.value;
    save();
    refreshCategoryInput();
    clearFieldError(el.amountInlineError);
    focusAmountInput();
  });
  el.manageCategoriesBtn.addEventListener("click", openCategoryDialog);
  el.saveBtn.addEventListener("click", addEntry);
  el.clearBtn.addEventListener("click", clearForm);
  el.addEntrySection.addEventListener("keydown", handleAddEntryKeydown);
  el.amountInput.addEventListener("input", () => validateAmountInput(false));
  el.amountInput.addEventListener("blur", () => validateAmountInput(true));

  el.budgetInput.addEventListener("input", () => validateBudgetInput(false));
  el.budgetInput.addEventListener("blur", () => validateBudgetInput(true));
  el.monthStartInput.addEventListener("change", saveMonthStartDay);
  el.saveBudgetBtn.addEventListener("click", saveBudget);
  el.exportDataBtn.addEventListener("click", exportBackup);
  el.importDataBtn.addEventListener("click", () => el.importFileInput.click());
  el.syncNowBtn.addEventListener("click", syncNow);
  el.sampleDataBtn.addEventListener("click", toggleSampleData);
  el.importFileInput.addEventListener("change", importBackupFromFile);
  el.scopeMonthBtn.addEventListener("click", () => setDataScope("month"));
  el.scopeAllBtn.addEventListener("click", () => setDataScope("all"));
  el.sortInput.addEventListener("change", () => {
    state.settings.sortOrder = SORT_OPTIONS.has(el.sortInput.value) ? el.sortInput.value : DEFAULT_SETTINGS.sortOrder;
    save();
    renderTable();
  });
  el.topCategoryFilters.addEventListener("click", handleTopCategoryFilterClick);

  [el.filterType, el.filterCategory, el.searchInput].forEach((node) => {
    node.addEventListener("input", renderTable);
    node.addEventListener("change", renderTable);
  });

  el.resetFiltersBtn.addEventListener("click", () => {
    el.filterType.value = "all";
    el.filterCategory.value = "all";
    el.sortInput.value = DEFAULT_SETTINGS.sortOrder;
    state.settings.sortOrder = DEFAULT_SETTINGS.sortOrder;
    el.searchInput.value = "";
    save();
    renderTable();
  });

  el.helpBtn.addEventListener("click", () => openDialog(el.helpDialog));
  el.categoryManagerType.addEventListener("change", renderCategoryManager);
  el.addCategoryBtn.addEventListener("click", addManagedCategory);
  el.closeCategoryDialogBtn.addEventListener("click", closeCategoryDialog);
  el.categoryManagerList.addEventListener("change", handleCategoryManagerListChange);
  el.categoryManagerList.addEventListener("click", handleCategoryManagerListClick);

  el.editTypeInput.addEventListener("change", refreshEditCategoryInput);
  el.editAmountInput.addEventListener("input", () => validateEditAmountInput(false));
  el.editAmountInput.addEventListener("blur", () => validateEditAmountInput(true));
  el.saveEditBtn.addEventListener("click", saveEditedEntry);
  el.cancelEditBtn.addEventListener("click", closeEditDialog);
  el.rows.addEventListener("click", handleTableActionClick);
  el.recurringList.addEventListener("click", handleRecurringListClick);

  el.onboardBackBtn.addEventListener("click", goOnboardingBack);
  el.onboardNextBtn.addEventListener("click", goOnboardingNext);
  el.onboardSkipBtn.addEventListener("click", completeOnboarding);

  window.addEventListener("resize", drawCharts);
}

function load() {
  const raw = storageAdapter.readStateRaw();
  if (!raw) return createDefaultState();
  try {
    const parsed = JSON.parse(raw);
    const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const rawRules = Array.isArray(parsed.recurringRules) ? parsed.recurringRules : [];
    const parsedBudget = Number(parsed.budget);
    const budget = Number.isFinite(parsedBudget) && parsedBudget >= 0 ? parsedBudget : 0;

    const entries = rawEntries
      .map((entry) => sanitizeEntry(entry))
      .filter((entry) => entry !== null);
    const recurringRules = rawRules
      .map((rule) => sanitizeRecurringRule(rule))
      .filter((rule) => rule !== null);

    return {
      budget,
      entries,
      recurringRules,
      settings: sanitizeSettings(parsed.settings),
      categoryCatalog: sanitizeCategoryCatalog(parsed.categoryCatalog, entries, recurringRules)
    };
  } catch {
    return createDefaultState();
  }
}

function createDefaultState() {
  return {
    budget: 0,
    entries: [],
    recurringRules: [],
    settings: sanitizeSettings(null),
    categoryCatalog: buildDefaultCategoryCatalog()
  };
}

function sanitizeSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    defaultType: source.defaultType === "income" ? "income" : DEFAULT_SETTINGS.defaultType,
    dataScope: source.dataScope === "all" ? "all" : DEFAULT_SETTINGS.dataScope,
    monthStartDay: clampMonthStartDay(Number(source.monthStartDay)),
    sortOrder: SORT_OPTIONS.has(source.sortOrder) ? source.sortOrder : DEFAULT_SETTINGS.sortOrder
  };
}

function buildDefaultCategoryCatalog() {
  return {
    expense: EXPENSE_CATEGORIES.map((name, index) => ({
      id: `expense_${index + 1}`,
      name,
      color: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length]
    })),
    income: INCOME_CATEGORIES.map((name, index) => ({
      id: `income_${index + 1}`,
      name,
      color: INCOME_CATEGORY_COLORS[index % INCOME_CATEGORY_COLORS.length]
    }))
  };
}

function sanitizeCategoryCatalog(rawCatalog, entries, recurringRules) {
  const defaults = buildDefaultCategoryCatalog();
  const incoming = rawCatalog && typeof rawCatalog === "object" ? rawCatalog : {};

  const expense = normalizeCategoryList(
    Array.isArray(incoming.expense) ? incoming.expense : defaults.expense,
    defaults.expense
  );
  const income = normalizeCategoryList(
    Array.isArray(incoming.income) ? incoming.income : defaults.income,
    defaults.income
  );

  const catalog = { expense, income };
  migrateExpenseCategoryCatalog(catalog, entries, recurringRules);
  entries.forEach((entry) => ensureCategoryExists(catalog, entry.type, entry.category));
  recurringRules.forEach((rule) => ensureCategoryExists(catalog, rule.type, rule.category));
  ensureCategoryExists(catalog, "expense", "Other");
  ensureCategoryExists(catalog, "income", "Other Income");
  return catalog;
}

function migrateExpenseCategoryCatalog(catalog, entries, recurringRules) {
  if (!catalog || !Array.isArray(catalog.expense)) return;

  LEGACY_EXPENSE_CATEGORY_RENAMES.forEach((nextName, legacyKey) => {
    renameExpenseCategoryReferences(entries, recurringRules, legacyKey, nextName);

    const legacyCategory = catalog.expense.find(
      (item) => String(item && item.name || "").trim().toLowerCase() === legacyKey
    );
    if (!legacyCategory) return;

    const existingNext = catalog.expense.find(
      (item) => item !== legacyCategory && String(item && item.name || "").trim().toLowerCase() === nextName.toLowerCase()
    );
    if (existingNext) {
      const legacyIndex = catalog.expense.indexOf(legacyCategory);
      if (legacyIndex >= 0) {
        catalog.expense.splice(legacyIndex, 1);
      }
      return;
    }

    legacyCategory.name = nextName;
  });

  EXPENSE_CATEGORIES.forEach((name) => ensureCategoryExists(catalog, "expense", name));
  catalog.expense.sort((a, b) => a.name.localeCompare(b.name));
}

function renameExpenseCategoryReferences(entries, recurringRules, legacyKey, nextName) {
  entries.forEach((entry) => {
    if (entry.type !== "expense") return;
    if (String(entry.category || "").trim().toLowerCase() === legacyKey) {
      entry.category = nextName;
    }
  });

  recurringRules.forEach((rule) => {
    if (rule.type !== "expense") return;
    if (String(rule.category || "").trim().toLowerCase() === legacyKey) {
      rule.category = nextName;
    }
  });
}

function normalizeCategoryList(rawList, fallback) {
  const list = [];
  const used = new Set();
  rawList.forEach((item, index) => {
    const name = String(item && item.name ? item.name : "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (used.has(key)) return;
    used.add(key);

    list.push({
      id: String(item && item.id ? item.id : makeId()),
      name,
      color: normalizeColor(item && item.color ? item.color : fallback[index % fallback.length].color)
    });
  });

  if (list.length === 0) {
    return fallback.map((item) => ({ ...item }));
  }
  return list;
}

function readLegacyData() {
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) return raw;
  }
  return null;
}

function save() {
  storageAdapter.saveState(state);
}

function createStorageAdapter() {
  if (isCloudSyncFlagEnabled()) {
    return createCloudStubAdapter();
  }
  return createLocalStorageAdapter();
}

function isCloudSyncFlagEnabled() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = String(params.get(CLOUD_SYNC_FLAG_QUERY_PARAM) || "").toLowerCase();

  if (queryValue === "1" || queryValue === "true") return true;
  if (queryValue === "0" || queryValue === "false") return false;

  return localStorage.getItem(CLOUD_SYNC_FLAG_KEY) === "1";
}

function createLocalStorageAdapter() {
  return {
    mode: "local",
    readStateRaw() {
      return localStorage.getItem(STORAGE_KEY) || readLegacyData();
    },
    saveState(nextState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    },
    getOnboardingSeen() {
      return localStorage.getItem(ONBOARDING_KEY) === "1";
    },
    setOnboardingSeen() {
      localStorage.setItem(ONBOARDING_KEY, "1");
    },
    syncNow() {
      return { ok: false, mode: "local", message: "Cloud sync is off. Enable with ?cloudSync=1." };
    }
  };
}

function createCloudStubAdapter() {
  function writeCloudSnapshot(nextState) {
    const syncedAt = new Date().toISOString();
    localStorage.setItem(CLOUD_SYNC_STUB_KEY, JSON.stringify({
      provider: "stub",
      syncedAt,
      payload: nextState
    }));
    localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify({
      mode: "cloud-stub",
      lastSyncedAt: syncedAt
    }));
    return syncedAt;
  }

  return {
    mode: "cloud-stub",
    readStateRaw() {
      const cloudRaw = localStorage.getItem(CLOUD_SYNC_STUB_KEY);
      if (cloudRaw) {
        try {
          const cloudDoc = JSON.parse(cloudRaw);
          if (cloudDoc && typeof cloudDoc === "object" && cloudDoc.payload && typeof cloudDoc.payload === "object") {
            return JSON.stringify(cloudDoc.payload);
          }
        } catch {
          // If cloud payload is malformed, fall back to local storage.
        }
      }
      return localStorage.getItem(STORAGE_KEY) || readLegacyData();
    },
    saveState(nextState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      writeCloudSnapshot(nextState);
    },
    getOnboardingSeen() {
      return localStorage.getItem(ONBOARDING_KEY) === "1";
    },
    setOnboardingSeen() {
      localStorage.setItem(ONBOARDING_KEY, "1");
    },
    syncNow(nextState) {
      const syncedAt = writeCloudSnapshot(nextState);
      const syncedLabel = new Date(syncedAt).toLocaleString();
      return { ok: true, mode: "cloud-stub", lastSyncedAt: syncedAt, message: `Cloud sync complete (${syncedLabel}).` };
    }
  };
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function formatPercent(value) {
  return `${Math.max(0, value).toFixed(1)}%`;
}

function clampMonthStartDay(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(28, Math.floor(parsed)));
}

function normalizeColor(value) {
  const text = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
  return "#2f7db5";
}

function ensureCategoryExists(catalog, type, rawName, preferredColor = "") {
  const normalizedType = type === "income" ? "income" : "expense";
  const name = String(rawName || "").trim();
  if (!name) return null;

  const list = catalog[normalizedType];
  const existing = list.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const created = {
    id: makeId(),
    name,
    color: normalizeColor(preferredColor || categoryFallbackColor(normalizedType, name))
  };
  list.push(created);
  list.sort((a, b) => a.name.localeCompare(b.name));
  return created;
}

function categoryFallbackColor(type, seed) {
  const palette = type === "income" ? INCOME_CATEGORY_COLORS : EXPENSE_CATEGORY_COLORS;
  const hash = Array.from(String(seed || "x")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function getCategoryList(type) {
  const normalizedType = type === "income" ? "income" : "expense";
  const source = state.categoryCatalog[normalizedType] || [];
  return source.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function getCategoryByName(type, name) {
  const normalizedType = type === "income" ? "income" : "expense";
  return (state.categoryCatalog[normalizedType] || []).find(
    (item) => item.name.toLowerCase() === String(name || "").trim().toLowerCase()
  ) || null;
}

function getCategoryColor(type, name) {
  const category = getCategoryByName(type, name);
  return category ? category.color : normalizeColor(categoryFallbackColor(type, name));
}

function getFallbackCategoryName(type) {
  return type === "income" ? "Other Income" : "Other";
}

function getCurrentBudgetRange() {
  const today = todayDate();
  const startDay = clampMonthStartDay(state.settings.monthStartDay);
  let start;

  if (today.getDate() >= startDay) {
    start = new Date(today.getFullYear(), today.getMonth(), startDay);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() - 1, startDay);
  }

  const end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
  return { start, end };
}

function formatBudgetRangeLabel(range) {
  if (state.settings.monthStartDay === 1) {
    return `This month (${range.start.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;
  }

  const startLabel = range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = new Date(range.end.getTime() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `This cycle (${startLabel} - ${endLabel})`;
}

function isInRange(entry, range) {
  const date = new Date(entry.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= range.start.getTime() && date.getTime() < range.end.getTime();
}

function getBudgetEntries() {
  const range = getCurrentBudgetRange();
  return state.entries.filter((entry) => isInRange(entry, range));
}

function getDataScopeEntries() {
  if (state.settings.dataScope === "all") return state.entries.slice();
  return getBudgetEntries();
}

function formatDataScopeLabel() {
  if (state.settings.dataScope === "all") return "All time";
  return formatBudgetRangeLabel(getCurrentBudgetRange());
}

function parseMoneyInput(value) {
  const text = String(value || "").trim();
  if (!text) return { ok: false, message: "Amount is required." };
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return { ok: false, message: "Enter a valid number." };
  if (parsed < 0) return { ok: false, message: "Amount cannot be negative." };
  return { ok: true, value: parsed };
}

function setFieldError(node, message) {
  if (!node) return;
  node.textContent = message;
  node.classList.add("is-error");
}

function clearFieldError(node) {
  if (!node) return;
  node.textContent = "";
  node.classList.remove("is-error");
}

function validateAmountInput(normalize) {
  if (!normalize && String(el.amountInput.value || "").trim() === "") {
    clearFieldError(el.amountInlineError);
    return true;
  }
  const parsed = parseMoneyInput(el.amountInput.value);
  if (!parsed.ok) {
    setFieldError(el.amountInlineError, parsed.message);
    return false;
  }
  clearFieldError(el.amountInlineError);
  if (normalize) {
    el.amountInput.value = parsed.value.toFixed(2);
  }
  return true;
}

function validateBudgetInput(normalize) {
  if (String(el.budgetInput.value || "").trim() === "") {
    clearFieldError(el.budgetInlineError);
    return true;
  }
  const parsed = parseMoneyInput(el.budgetInput.value);
  if (!parsed.ok) {
    setFieldError(el.budgetInlineError, parsed.message);
    return false;
  }
  clearFieldError(el.budgetInlineError);
  if (normalize) {
    el.budgetInput.value = parsed.value.toFixed(2);
  }
  return true;
}

function validateEditAmountInput(normalize) {
  if (!normalize && String(el.editAmountInput.value || "").trim() === "") {
    clearFieldError(el.editAmountInlineError);
    return true;
  }
  const parsed = parseMoneyInput(el.editAmountInput.value);
  if (!parsed.ok) {
    setFieldError(el.editAmountInlineError, parsed.message);
    return false;
  }
  clearFieldError(el.editAmountInlineError);
  if (normalize) {
    el.editAmountInput.value = parsed.value.toFixed(2);
  }
  return true;
}

function focusAmountInput() {
  if (!el.amountInput) return;
  el.amountInput.focus();
}

function handleAddEntryKeydown(event) {
  if (event.key !== "Enter") return;
  const target = event.target;
  if (target instanceof HTMLButtonElement) return;
  if (target instanceof HTMLTextAreaElement) return;
  event.preventDefault();
  addEntry();
}

function setDataScope(scope) {
  const next = scope === "all" ? "all" : "month";
  if (state.settings.dataScope === next) return;
  state.settings.dataScope = next;
  save();
  renderSummary();
  renderTable();
  drawCharts();
}

function saveMonthStartDay() {
  state.settings.monthStartDay = clampMonthStartDay(el.monthStartInput.value);
  el.monthStartInput.value = String(state.settings.monthStartDay);
  save();
  renderSummary();
  renderTable();
  drawCharts();
}

function refreshCategoryInput() {
  const type = el.typeInput.value === "income" ? "income" : "expense";
  const current = el.categoryInput.value;
  const categories = getCategoryList(type);
  if (categories.length === 0) {
    ensureCategoryExists(state.categoryCatalog, type, getFallbackCategoryName(type));
  }

  const list = getCategoryList(type);
  el.categoryInput.innerHTML = "";
  list.forEach((category) => {
    const opt = document.createElement("option");
    opt.value = category.name;
    opt.textContent = category.name;
    el.categoryInput.appendChild(opt);
  });

  if (list.some((item) => item.name === current)) {
    el.categoryInput.value = current;
  } else {
    el.categoryInput.value = list[0] ? list[0].name : "";
  }
}

function refreshFilterCategories() {
  const categories = Array.from(new Set(getDataScopeEntries().map((entry) => entry.category))).sort();
  const current = el.filterCategory.value;

  el.filterCategory.innerHTML = "<option value='all'>All</option>";
  categories.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el.filterCategory.appendChild(opt);
  });

  el.filterCategory.value = categories.includes(current) ? current : "all";
}

function openCategoryDialog() {
  el.categoryManagerType.value = el.typeInput.value === "income" ? "income" : "expense";
  el.newCategoryNameInput.value = "";
  el.newCategoryColorInput.value = normalizeColor(categoryFallbackColor(el.categoryManagerType.value, "new"));
  renderCategoryManager();
  openDialog(el.categoryDialog);
}

function closeCategoryDialog() {
  closeDialog(el.categoryDialog);
}

function renderCategoryManager() {
  const type = el.categoryManagerType.value === "income" ? "income" : "expense";
  const list = getCategoryList(type);
  el.newCategoryColorInput.value = normalizeColor(categoryFallbackColor(type, "new"));
  el.categoryManagerList.innerHTML = "";

  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "recurring-empty";
    li.textContent = "No categories yet.";
    el.categoryManagerList.appendChild(li);
    return;
  }

  const usageMap = new Map();
  state.entries.forEach((entry) => {
    if (entry.type !== type) return;
    usageMap.set(entry.category, (usageMap.get(entry.category) || 0) + 1);
  });
  state.recurringRules.forEach((rule) => {
    if (rule.type !== type) return;
    usageMap.set(rule.category, (usageMap.get(rule.category) || 0) + 1);
  });

  list.forEach((category) => {
    const li = document.createElement("li");
    li.className = "category-manager-item";

    const color = document.createElement("input");
    color.type = "color";
    color.className = "category-color-input";
    color.value = normalizeColor(category.color);
    color.dataset.action = "category-color";
    color.dataset.id = category.id;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "category-name-input";
    nameInput.value = category.name;
    nameInput.dataset.action = "category-rename";
    nameInput.dataset.id = category.id;

    const usage = document.createElement("span");
    usage.className = "category-usage";
    usage.textContent = `${usageMap.get(category.name) || 0} uses`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "category-delete";
    deleteBtn.dataset.id = category.id;

    li.appendChild(color);
    li.appendChild(nameInput);
    li.appendChild(usage);
    li.appendChild(deleteBtn);
    el.categoryManagerList.appendChild(li);
  });
}

function addManagedCategory() {
  const type = el.categoryManagerType.value === "income" ? "income" : "expense";
  const name = String(el.newCategoryNameInput.value || "").trim();
  if (!name) {
    setStatus("Category name is required.");
    return;
  }

  const exists = getCategoryList(type).some((item) => item.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    setStatus("Category already exists.");
    return;
  }

  ensureCategoryExists(state.categoryCatalog, type, name, el.newCategoryColorInput.value);
  el.newCategoryNameInput.value = "";
  save();
  refreshCategoryInput();
  refreshEditCategoryInput();
  refreshFilterCategories();
  renderCategoryManager();
  renderTopCategoryFilters();
  setStatus("Category added.");
}

function handleCategoryManagerListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  const type = el.categoryManagerType.value === "income" ? "income" : "expense";
  const list = state.categoryCatalog[type];
  const category = list.find((item) => item.id === id);
  if (!category) return;

  if (action === "category-color" && target instanceof HTMLInputElement) {
    category.color = normalizeColor(target.value);
    save();
    renderTopCategoryFilters();
    renderTable();
    return;
  }

  if (action === "category-rename" && target instanceof HTMLInputElement) {
    const nextName = String(target.value || "").trim();
    if (!nextName) {
      setStatus("Category name cannot be blank.");
      target.value = category.name;
      return;
    }

    const duplicate = list.some((item) => item.id !== category.id && item.name.toLowerCase() === nextName.toLowerCase());
    if (duplicate) {
      setStatus("Category rename failed: that name already exists.");
      target.value = category.name;
      return;
    }

    const oldName = category.name;
    category.name = nextName;
    state.entries.forEach((entry) => {
      if (entry.type === type && entry.category === oldName) {
        entry.category = nextName;
      }
    });
    state.recurringRules.forEach((rule) => {
      if (rule.type === type && rule.category === oldName) {
        rule.category = nextName;
      }
    });

    if (el.categoryInput.value === oldName) el.categoryInput.value = nextName;
    if (el.filterCategory.value === oldName) el.filterCategory.value = nextName;
    if (el.editCategoryInput.value === oldName) el.editCategoryInput.value = nextName;

    save();
    render();
    renderCategoryManager();
    setStatus("Category renamed.");
  }
}

function handleCategoryManagerListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "category-delete") return;
  const id = target.dataset.id;
  if (!id) return;

  const type = el.categoryManagerType.value === "income" ? "income" : "expense";
  const list = state.categoryCatalog[type];
  const category = list.find((item) => item.id === id);
  if (!category) return;

  const fallback = getFallbackCategoryName(type);
  if (category.name === fallback) {
    setStatus("Keep at least one fallback category for this type.");
    return;
  }

  const usageCount = state.entries.filter((entry) => entry.type === type && entry.category === category.name).length +
    state.recurringRules.filter((rule) => rule.type === type && rule.category === category.name).length;
  if (!confirm(`Delete "${category.name}"? ${usageCount} uses will move to "${fallback}".`)) return;

  ensureCategoryExists(state.categoryCatalog, type, fallback);
  state.entries.forEach((entry) => {
    if (entry.type === type && entry.category === category.name) {
      entry.category = fallback;
    }
  });
  state.recurringRules.forEach((rule) => {
    if (rule.type === type && rule.category === category.name) {
      rule.category = fallback;
    }
  });

  state.categoryCatalog[type] = list.filter((item) => item.id !== id);
  save();
  render();
  renderCategoryManager();
  setStatus("Category deleted.");
}

function handleTopCategoryFilterClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-category]");
  if (!button) return;

  const category = button.dataset.category;
  if (!category) return;
  el.filterCategory.value = el.filterCategory.value === category ? "all" : category;
  renderTable();
}

function addEntry() {
  const type = el.typeInput.value === "income" ? "income" : "expense";
  const category = (el.categoryInput.value || "").trim();
  const parsedAmount = parseMoneyInput(el.amountInput.value);
  const note = (el.noteInput.value || "").trim();

  if (!category) {
    setStatus("Pick a category.");
    return;
  }

  if (!parsedAmount.ok) {
    setFieldError(el.amountInlineError, parsedAmount.message);
    setStatus(parsedAmount.message);
    return;
  }

  clearFieldError(el.amountInlineError);
  ensureCategoryExists(state.categoryCatalog, type, category);
  state.entries.unshift({
    id: makeId(),
    type,
    category,
    amount: parsedAmount.value,
    note,
    createdAt: new Date().toISOString()
  });

  if (el.recurringToggleInput.checked) {
    createRecurringRuleFromForm({ type, category, amount: parsedAmount.value, note });
  }

  state.settings.defaultType = type;
  save();
  clearForm();
  render();
  setStatus("Entry saved.");
}

function createRecurringRuleFromForm(entry) {
  const frequency = normalizeRecurringFrequency(el.recurringFrequencyInput.value);
  const selectedDate = parseDateInput(el.recurringStartInput.value) || todayDate();
  const nextDueDate = normalizeNextDueDate(selectedDate, frequency, true);

  const rule = {
    id: makeId(),
    type: entry.type,
    category: entry.category,
    amount: entry.amount,
    note: entry.note,
    frequency,
    nextDue: toDateInputValue(nextDueDate),
    active: true
  };

  state.recurringRules.unshift(rule);
}

function clearForm() {
  el.typeInput.value = state.settings.defaultType;
  refreshCategoryInput();
  el.amountInput.value = "";
  clearFieldError(el.amountInlineError);
  el.noteInput.value = "";
  el.recurringToggleInput.checked = false;
  el.recurringFrequencyInput.value = DEFAULT_RECURRING_FREQUENCY;
  el.recurringStartInput.value = toDateInputValue(todayDate());
  focusAmountInput();
}

function saveBudget() {
  if (!validateBudgetInput(true)) {
    setStatus("Enter a valid budget.");
    return;
  }

  const parsed = parseMoneyInput(el.budgetInput.value);
  state.budget = parsed.ok ? parsed.value : 0;
  el.budgetInput.value = state.budget ? state.budget.toFixed(2) : "";
  save();
  renderSummary();
  setStatus("Budget goal saved.");
}

function syncNow() {
  const result = storageAdapter.syncNow(state);
  if (!result || result.ok !== true) {
    setStatus((result && result.message) || "Cloud sync is unavailable.");
    return;
  }
  setStatus(result.message || "Cloud sync complete.");
}

function toggleSampleData() {
  const hasSample = state.entries.some(isSampleEntry);
  if (hasSample) {
    if (!confirm("Clear sample entries from your data?")) return;
    state.entries = state.entries.filter((entry) => !isSampleEntry(entry));
    save();
    render();
    setStatus("Sample data removed.");
    return;
  }

  if (state.entries.length > 0 && !confirm("Load sample entries and keep your current entries?")) {
    return;
  }

  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const sampleEntries = [
    { id: makeId(), type: "income", category: "Salary", amount: 4200, note: "Monthly paycheck", createdAt: daysAgo(25), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Mortgage/Rent", amount: 1450, note: "Apartment", createdAt: daysAgo(24), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Groceries", amount: 120, note: "Weekly groceries", createdAt: daysAgo(20), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Transportation", amount: 65, note: "Fuel", createdAt: daysAgo(14), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Dining", amount: 54, note: "Family dinner", createdAt: daysAgo(10), meta: { sample: true } },
    { id: makeId(), type: "income", category: "Freelance", amount: 380, note: "Side project", createdAt: daysAgo(8), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Electric", amount: 160, note: "Power bill", createdAt: daysAgo(5), meta: { sample: true } }
  ];

  sampleEntries.forEach((entry) => ensureCategoryExists(state.categoryCatalog, entry.type, entry.category));
  if (state.budget === 0) {
    state.budget = 3000;
  }

  state.entries.unshift(...sampleEntries);
  save();
  render();
  setStatus("Sample data loaded.");
}

function render() {
  el.typeInput.value = state.settings.defaultType;
  el.monthStartInput.value = String(clampMonthStartDay(state.settings.monthStartDay));
  el.sortInput.value = SORT_OPTIONS.has(state.settings.sortOrder) ? state.settings.sortOrder : DEFAULT_SETTINGS.sortOrder;
  refreshCategoryInput();
  refreshFilterCategories();
  refreshSampleButton();
  renderStorageInfo();
  el.budgetInput.value = state.budget ? state.budget.toFixed(2) : "";
  if (!el.recurringStartInput.value) {
    el.recurringStartInput.value = toDateInputValue(todayDate());
  }
  renderSummary();
  renderTable();
  renderRecurringRules();
  drawCharts();
}

function renderStorageInfo() {
  if (storageAdapter.mode === "cloud-stub") {
    el.storageModeLabel.textContent = "Data is still stored in this browser. Cloud mode is a local stub mirror for architecture testing.";
    el.syncModeLabel.textContent = "Sync Now writes a cloud-stub snapshot locally. No account-connected backend is active yet.";
    return;
  }
  el.storageModeLabel.textContent = "Data is stored in this browser (localStorage). Export backups to move data between devices.";
  el.syncModeLabel.textContent = "Sync Now needs cloud mode enabled with ?cloudSync=1 and currently uses a local stub payload.";
}

function refreshSampleButton() {
  const hasSample = state.entries.some(isSampleEntry);
  el.sampleDataBtn.textContent = hasSample ? "Clear Sample Data" : "Load Sample Data";
  el.demoBanner.hidden = !hasSample;
}

function renderRecurringRules() {
  el.recurringList.innerHTML = "";
  const rules = Array.isArray(state.recurringRules) ? state.recurringRules : [];

  if (rules.length === 0) {
    const li = document.createElement("li");
    li.className = "recurring-empty";
    li.textContent = "No recurring rules yet.";
    el.recurringList.appendChild(li);
    return;
  }

  const fragment = document.createDocumentFragment();
  rules.forEach((rule) => {
    const li = document.createElement("li");
    li.className = "recurring-item";

    const label = document.createElement("span");
    label.textContent = `${capitalize(rule.frequency)}: ${rule.type} ${formatMoney(rule.amount)} • ${rule.category} • next ${rule.nextDue}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn recurring-delete";
    deleteBtn.textContent = "Remove";
    deleteBtn.dataset.action = "delete-recurring";
    deleteBtn.dataset.id = rule.id;

    li.appendChild(label);
    li.appendChild(deleteBtn);
    fragment.appendChild(li);
  });

  el.recurringList.appendChild(fragment);
}

function handleRecurringListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "delete-recurring") return;
  const ruleId = target.dataset.id;
  if (!ruleId) return;

  if (!confirm("Remove this recurring rule?")) return;
  state.recurringRules = state.recurringRules.filter((rule) => rule.id !== ruleId);
  save();
  renderRecurringRules();
  setStatus("Recurring rule removed.");
}

function applyRecurringEntries() {
  const rules = Array.isArray(state.recurringRules) ? state.recurringRules : [];
  if (!rules.length) return 0;

  const today = todayDate();
  let added = 0;

  rules.forEach((rule) => {
    if (!rule.active) return;

    let due = parseDateInput(rule.nextDue);
    if (!due) {
      due = todayDate();
    }

    let loopGuard = 0;
    while (due.getTime() <= today.getTime() && loopGuard < 366) {
      const entry = {
        id: makeId(),
        type: rule.type,
        category: rule.category,
        amount: rule.amount,
        note: rule.note || "Recurring entry",
        createdAt: due.toISOString(),
        meta: { recurring: true, recurringRuleId: rule.id }
      };
      state.entries.unshift(entry);
      added += 1;
      due = nextOccurrence(due, rule.frequency);
      loopGuard += 1;
    }

    rule.nextDue = toDateInputValue(due);
  });

  if (added > 0) {
    save();
  }
  return added;
}

function filteredEntries() {
  const type = el.filterType.value;
  const category = el.filterCategory.value;
  const search = el.searchInput.value.trim().toLowerCase();
  const sort = SORT_OPTIONS.has(el.sortInput.value) ? el.sortInput.value : DEFAULT_SETTINGS.sortOrder;

  const rows = getDataScopeEntries().filter((e) => {
    if (type !== "all" && e.type !== type) return false;
    if (category !== "all" && e.category !== category) return false;
    if (search && !(e.category.toLowerCase().includes(search) || (e.note || "").toLowerCase().includes(search))) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sort === "date_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === "date_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "amount_desc") return b.amount - a.amount;
    return 0;
  });

  return rows;
}

function renderSummary() {
  const scoped = getBudgetEntries();
  const income = scoped.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const expense = scoped.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const balance = income - expense;
  const left = state.budget - expense;
  const range = getCurrentBudgetRange();

  el.incomeTotal.textContent = formatMoney(income);
  el.expenseTotal.textContent = formatMoney(expense);
  el.balanceTotal.textContent = formatMoney(balance);
  el.budgetGoal.textContent = formatMoney(state.budget);
  el.budgetLeft.textContent = formatMoney(left);
  el.budgetScopeLabel.textContent = formatBudgetRangeLabel(range);

  el.balanceTotal.style.color = balance < 0 ? "var(--bad)" : "var(--good)";
  el.budgetLeft.style.color = left < 0 ? "var(--bad)" : "var(--good)";
  el.scopeMonthBtn.classList.toggle("is-active", state.settings.dataScope === "month");
  el.scopeAllBtn.classList.toggle("is-active", state.settings.dataScope === "all");
  el.dataScopeLabel.textContent = `Showing: ${formatDataScopeLabel()}`;
  renderBudgetProgress(expense, left);
}

function renderBudgetProgress(expense, left) {
  if (!el.budgetProgressFill || !el.budgetProgressLabel) return;

  if (state.budget <= 0) {
    el.budgetProgressFill.style.width = "0%";
    el.budgetProgressFill.style.background = "linear-gradient(90deg, var(--accent), var(--accent-alt))";
    el.budgetProgressLabel.textContent = "Set a budget goal to track your monthly pace.";
    return;
  }

  const percentUsed = (expense / state.budget) * 100;
  const boundedPercent = Math.max(0, Math.min(percentUsed, 100));
  el.budgetProgressFill.style.width = `${boundedPercent.toFixed(1)}%`;

  if (percentUsed > 100) {
    el.budgetProgressFill.style.background = "linear-gradient(90deg, #cf5f4a, #be3d31)";
    el.budgetProgressLabel.textContent = `${formatPercent(percentUsed)} used. You are ${formatMoney(Math.abs(left))} over budget.`;
    return;
  }

  if (percentUsed >= 85) {
    el.budgetProgressFill.style.background = "linear-gradient(90deg, #d89c2c, #d66a31)";
  } else {
    el.budgetProgressFill.style.background = "linear-gradient(90deg, var(--accent), var(--accent-alt))";
  }

  el.budgetProgressLabel.textContent = `${formatPercent(percentUsed)} used. ${formatMoney(Math.max(left, 0))} left this month.`;
}

function renderTopCategoryFilters() {
  if (!el.topCategoryFilters) return;
  el.topCategoryFilters.innerHTML = "";
  const scopeRows = getDataScopeEntries();
  const activeType = el.filterType.value;
  const type = activeType === "income" ? "income" : "expense";
  const candidates = scopeRows.filter((entry) => entry.type === type);

  const totals = new Map();
  candidates.forEach((entry) => {
    totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
  });

  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (top.length === 0) {
    const empty = document.createElement("span");
    empty.className = "top-cat-empty";
    empty.textContent = "No category activity in this view.";
    el.topCategoryFilters.appendChild(empty);
    return;
  }

  top.forEach(([category]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn top-cat-btn";
    if (el.filterCategory.value === category) {
      btn.classList.add("is-active");
    }
    btn.dataset.category = category;
    btn.style.setProperty("--cat-color", getCategoryColor(type, category));
    btn.textContent = category;
    el.topCategoryFilters.appendChild(btn);
  });
}

function renderTable() {
  refreshFilterCategories();
  renderTopCategoryFilters();
  const rows = filteredEntries();
  el.rows.innerHTML = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    appendCell(tr, formatDateTime(entry.createdAt));
    appendTypeCell(tr, entry.type);
    appendCategoryCell(tr, entry.category, getCategoryColor(entry.type, entry.category));
    appendMoneyCell(tr, entry.amount, entry.type);
    appendCell(tr, entry.note || "");

    const actionCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn action-btn";
    editBtn.textContent = "Edit";
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = entry.id;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn action-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = entry.id;
    actionCell.appendChild(editBtn);
    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);

    fragment.appendChild(tr);
  });
  el.rows.appendChild(fragment);

  el.emptyState.style.display = rows.length ? "none" : "block";
  if (el.entryCount) {
    el.entryCount.textContent = `${rows.length} shown`;
  }
}

function deleteEntry(id) {
  if (!confirm("Delete this entry?")) return;
  state.entries = state.entries.filter((e) => e.id !== id);
  save();
  render();
  setStatus("Entry deleted.");
}

function exportBackup() {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    app: "BudgetBeacon",
    version: 2,
    budget: state.budget,
    entries: state.entries,
    recurringRules: state.recurringRules,
    settings: state.settings,
    categoryCatalog: state.categoryCatalog
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `budgetbeacon_backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Backup exported.");
}

function importBackupFromFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const importedEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const importedRules = Array.isArray(parsed.recurringRules) ? parsed.recurringRules : [];
      const importedBudget = Number(parsed.budget || 0);
      const importedSettings = sanitizeSettings(parsed.settings);

      if (!confirm("Import this backup? This will replace your current web data.")) {
        el.importFileInput.value = "";
        return;
      }

      state.entries = importedEntries
        .map((entry) => sanitizeEntry(entry))
        .filter((entry) => entry !== null);
      state.recurringRules = importedRules
        .map((rule) => sanitizeRecurringRule(rule))
        .filter((rule) => rule !== null);
      state.budget = Number.isFinite(importedBudget) && importedBudget >= 0 ? importedBudget : 0;
      state.settings = importedSettings;
      state.categoryCatalog = sanitizeCategoryCatalog(parsed.categoryCatalog, state.entries, state.recurringRules);

      const added = applyRecurringEntries();
      save();
      render();
      if (added > 0) {
        setStatus(`Backup imported. Added ${added} due recurring entr${added === 1 ? "y" : "ies"}.`);
      } else {
        setStatus("Backup imported.");
      }
    } catch {
      setStatus("Could not import backup file.");
    } finally {
      el.importFileInput.value = "";
    }
  };
  reader.readAsText(file);
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const type = entry.type === "income" ? "income" : "expense";
  const category = String(entry.category || "").trim();
  const amount = Number(entry.amount);
  const note = String(entry.note || "");
  const createdAt = String(entry.createdAt || new Date().toISOString());
  const id = String(entry.id || makeId());

  if (!category || !Number.isFinite(amount) || amount < 0) return null;

  return {
    id,
    type,
    category,
    amount,
    note,
    createdAt,
    meta: typeof entry.meta === "object" && entry.meta !== null ? entry.meta : undefined
  };
}

function sanitizeRecurringRule(rule) {
  if (!rule || typeof rule !== "object") return null;
  const type = rule.type === "income" ? "income" : "expense";
  const category = String(rule.category || "").trim();
  const amount = Number(rule.amount);
  const note = String(rule.note || "");
  const frequency = normalizeRecurringFrequency(rule.frequency);
  const nextDueDate = parseDateInput(rule.nextDue) || todayDate();

  if (!category || !Number.isFinite(amount) || amount < 0) return null;

  return {
    id: String(rule.id || makeId()),
    type,
    category,
    amount,
    note,
    frequency,
    nextDue: toDateInputValue(nextDueDate),
    active: rule.active !== false
  };
}

function openEditDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  editingEntryId = id;

  el.editTypeInput.value = entry.type;
  refreshEditCategoryInput(entry.category);
  el.editAmountInput.value = Number(entry.amount).toFixed(2);
  clearFieldError(el.editAmountInlineError);
  el.editNoteInput.value = entry.note || "";
  openDialog(el.editDialog);
}

function refreshEditCategoryInput(selected = "") {
  const type = el.editTypeInput.value === "income" ? "income" : "expense";
  const choices = getCategoryList(type).map((category) => category.name);

  el.editCategoryInput.innerHTML = "";
  choices.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el.editCategoryInput.appendChild(opt);
  });

  if (selected && choices.includes(selected)) {
    el.editCategoryInput.value = selected;
  } else if (choices.length > 0) {
    el.editCategoryInput.value = choices[0];
  }
}

function saveEditedEntry(event) {
  event.preventDefault();
  if (!editingEntryId) return;

  const entry = state.entries.find((item) => item.id === editingEntryId);
  if (!entry) return;

  const type = el.editTypeInput.value;
  const category = (el.editCategoryInput.value || "").trim();
  const parsedAmount = parseMoneyInput(el.editAmountInput.value);
  const note = (el.editNoteInput.value || "").trim();

  if (!category) return setStatus("Edit failed: pick a category.");
  if (!parsedAmount.ok) {
    setFieldError(el.editAmountInlineError, parsedAmount.message);
    return setStatus("Edit failed: enter a valid amount.");
  }
  clearFieldError(el.editAmountInlineError);

  entry.type = type;
  entry.category = category;
  entry.amount = parsedAmount.value;
  entry.note = note;
  ensureCategoryExists(state.categoryCatalog, type, category);

  save();
  render();
  closeEditDialog();
  setStatus("Entry updated.");
}

function closeEditDialog() {
  editingEntryId = null;
  clearFieldError(el.editAmountInlineError);
  closeDialog(el.editDialog);
}

function drawCharts() {
  drawMonthChart();
  drawCategoryChart();
}

function drawMonthChart() {
  const canvas = el.monthChart;
  const ctx = canvas.getContext("2d");
  const { width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const axisColor = getCssVar("--line-strong", "#ccd7e6");
  const barColor = getCssVar("--accent", "#0f6bff");
  const labelColor = getCssVar("--muted", "#5e6a79");

  const scopedExpenses = getDataScopeEntries().filter((e) => e.type === "expense");
  if (scopedExpenses.length < 3) {
    drawCenterText(ctx, canvas, "Add 3+ expenses to see trends.");
    return;
  }

  const map = new Map();
  scopedExpenses.forEach((e) => {
    const month = e.createdAt.slice(0, 7);
    map.set(month, (map.get(month) || 0) + e.amount);
  });

  const months = Array.from(map.keys()).sort().slice(-6);
  if (!months.length) {
    drawCenterText(ctx, canvas, "Add 3+ expenses to see trends.");
    return;
  }

  const values = months.map((m) => map.get(m));
  const max = Math.max(...values, 1);
  const left = 40;
  const top = 20;
  const right = width - 16;
  const bottom = height - 30;

  ctx.strokeStyle = axisColor;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const space = (right - left) / months.length;
  values.forEach((v, i) => {
    const h = ((bottom - top) * v) / max;
    const x = left + i * space + space * 0.2;
    const w = space * 0.6;
    const y = bottom - h;

    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = labelColor;
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(months[i].slice(2), x, bottom + 14);
  });
}

function drawCategoryChart() {
  const canvas = el.categoryChart;
  const ctx = canvas.getContext("2d");
  const { width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const textColor = getCssVar("--ink", "#17202a");
  const mutedColor = getCssVar("--muted", "#5e6a79");
  const trackColor = getCssVar("--accent-soft", "#e4efff");
  const barColor = getCssVar("--accent-alt", "#198754");

  const scopedExpenses = getDataScopeEntries().filter((e) => e.type === "expense");
  if (scopedExpenses.length < 3) {
    drawCenterText(ctx, canvas, "Add 3+ expenses to see category insights.");
    return;
  }

  const totals = new Map();
  scopedExpenses.forEach((e) => {
    totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
  });

  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) {
    drawCenterText(ctx, canvas, "Add 3+ expenses to see category insights.");
    return;
  }

  const max = Math.max(...top.map(([, v]) => v), 1);
  let y = 24;
  top.forEach(([name, value]) => {
    const label = name.length > 18 ? `${name.slice(0, 16)}..` : name;
    const x = 120;
    const full = width - x - 16;
    const barWidth = (value / max) * full;

    ctx.fillStyle = textColor;
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(label, 12, y + 11);

    ctx.fillStyle = trackColor;
    ctx.fillRect(x, y, full, 14);
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth, 14);

    ctx.fillStyle = mutedColor;
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(value), x + full - 6, y + 11);
    ctx.textAlign = "left";
    y += 34;
  });
}

function fitCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = Math.max(canvas.clientWidth, 280);
  const h = Math.max(canvas.clientHeight, 220);
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: w, height: h };
}

function drawCenterText(ctx, canvas, text) {
  ctx.fillStyle = getCssVar("--muted", "#5e6a79");
  ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.clientWidth / 2, canvas.clientHeight / 2);
  ctx.textAlign = "left";
}

function setStatus(message, tone = "") {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.classList.remove("is-ok", "is-error", "is-info");

  const resolvedTone = tone || inferStatusTone(message);
  if (resolvedTone === "ok") {
    el.status.classList.add("is-ok");
  } else if (resolvedTone === "error") {
    el.status.classList.add("is-error");
  } else if (resolvedTone === "info") {
    el.status.classList.add("is-info");
  }
}

function inferStatusTone(message) {
  const text = String(message || "").toLowerCase();
  if (!text) return "";

  if (
    text.includes("failed") ||
    text.includes("could not") ||
    text.includes("unavailable") ||
    text.includes("enter a valid") ||
    text.includes("pick a category") ||
    text.includes("required") ||
    text.includes("cannot be negative")
  ) {
    return "error";
  }

  if (text.includes("cloud sync")) {
    return "info";
  }

  if (
    text.includes("saved") ||
    text.includes("added") ||
    text.includes("updated") ||
    text.includes("deleted") ||
    text.includes("exported") ||
    text.includes("imported") ||
    text.includes("loaded") ||
    text.includes("removed")
  ) {
    return "ok";
  }

  return "";
}

function appendCell(row, value) {
  const td = document.createElement("td");
  td.textContent = value;
  row.appendChild(td);
}

function appendTypeCell(row, type) {
  const td = document.createElement("td");
  const chip = document.createElement("span");
  chip.className = `type-chip ${type === "income" ? "income" : "expense"}`;
  chip.textContent = type;
  td.appendChild(chip);
  row.appendChild(td);
}

function appendCategoryCell(row, category, color) {
  const td = document.createElement("td");
  const chip = document.createElement("span");
  chip.className = "category-chip";
  chip.style.setProperty("--cat-color", normalizeColor(color));
  chip.textContent = category;
  td.appendChild(chip);
  row.appendChild(td);
}

function appendMoneyCell(row, amount, type) {
  const td = document.createElement("td");
  td.className = `money-value ${type === "income" ? "income" : "expense"}`;
  td.textContent = formatMoney(amount);
  row.appendChild(td);
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function isSampleEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.meta && entry.meta.sample === true) return true;
  // Backward compatibility with older sample marker
  return entry.note === "[sample]";
}

function handleTableActionClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  if (action === "edit") {
    openEditDialog(id);
    return;
  }
  if (action === "delete") {
    deleteEntry(id);
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }
  return date.toLocaleString();
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function todayDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function toDateInputValue(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeRecurringFrequency(value) {
  const frequency = String(value || "").trim().toLowerCase();
  return RECURRING_FREQUENCIES.has(frequency) ? frequency : DEFAULT_RECURRING_FREQUENCY;
}

function nextOccurrence(date, frequency) {
  const next = new Date(date);
  const normalizedFrequency = normalizeRecurringFrequency(frequency);

  if (normalizedFrequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (normalizedFrequency === "bi-weekly") {
    next.setDate(next.getDate() + 14);
  } else if (normalizedFrequency === "semi-monthly") {
    if (next.getDate() < 15) {
      next.setDate(15);
    } else {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
    }
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  next.setHours(0, 0, 0, 0);
  return next;
}

function normalizeNextDueDate(date, frequency, skipToday) {
  const today = todayDate();
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  if (!skipToday) return current;
  while (current.getTime() <= today.getTime()) {
    const advanced = nextOccurrence(current, frequency);
    current.setTime(advanced.getTime());
  }
  return current;
}

function capitalize(value) {
  const text = String(value || "");
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "true");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function maybeStartOnboarding() {
  const seen = storageAdapter.getOnboardingSeen();
  if (seen) return;
  onboardingStep = 0;
  renderOnboardingStep();
  openDialog(el.onboardingDialog);
}

function renderOnboardingStep() {
  const step = onboardingSteps[onboardingStep];
  el.onboardTitle.textContent = step.title;
  el.onboardBody.textContent = step.body;
  el.onboardBackBtn.disabled = onboardingStep === 0;
  el.onboardNextBtn.textContent = onboardingStep === onboardingSteps.length - 1 ? "Finish" : "Next";
}

function goOnboardingBack() {
  if (onboardingStep === 0) return;
  onboardingStep -= 1;
  renderOnboardingStep();
}

function goOnboardingNext() {
  if (onboardingStep >= onboardingSteps.length - 1) {
    completeOnboarding();
    return;
  }
  onboardingStep += 1;
  renderOnboardingStep();
}

function completeOnboarding() {
  storageAdapter.setOnboardingSeen();
  closeDialog(el.onboardingDialog);
}
