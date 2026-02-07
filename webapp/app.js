const STORAGE_KEY = "budgetbeacon_web_v1";
const LEGACY_STORAGE_KEYS = ["pybudget_web_v1"];
const ONBOARDING_KEY = "budgetbeacon_onboarding_seen_v1";

const EXPENSE_CATEGORIES = [
  "Groceries", "Rent", "Utilities", "Transportation", "Dining", "Entertainment",
  "Healthcare", "Insurance", "Debt Payment", "Childcare", "Education", "Phone/Internet",
  "Shopping", "Personal Care", "Travel", "Gifts", "Taxes", "Other"
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Interest", "Dividends", "Rental Income", "Refund", "Gift", "Other Income"
];

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

const state = load();
let editingEntryId = null;
let onboardingStep = 0;

const el = {
  typeInput: document.getElementById("typeInput"),
  categoryInput: document.getElementById("categoryInput"),
  amountInput: document.getElementById("amountInput"),
  noteInput: document.getElementById("noteInput"),
  saveBtn: document.getElementById("saveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  budgetInput: document.getElementById("budgetInput"),
  saveBudgetBtn: document.getElementById("saveBudgetBtn"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataBtn: document.getElementById("importDataBtn"),
  sampleDataBtn: document.getElementById("sampleDataBtn"),
  importFileInput: document.getElementById("importFileInput"),
  filterType: document.getElementById("filterType"),
  filterCategory: document.getElementById("filterCategory"),
  searchInput: document.getElementById("searchInput"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  rows: document.getElementById("entryRows"),
  emptyState: document.getElementById("emptyState"),
  incomeTotal: document.getElementById("incomeTotal"),
  expenseTotal: document.getElementById("expenseTotal"),
  balanceTotal: document.getElementById("balanceTotal"),
  budgetGoal: document.getElementById("budgetGoal"),
  budgetLeft: document.getElementById("budgetLeft"),
  status: document.getElementById("status"),
  helpBtn: document.getElementById("helpBtn"),
  helpDialog: document.getElementById("helpDialog"),
  editDialog: document.getElementById("editDialog"),
  editTypeInput: document.getElementById("editTypeInput"),
  editCategoryInput: document.getElementById("editCategoryInput"),
  editAmountInput: document.getElementById("editAmountInput"),
  editNoteInput: document.getElementById("editNoteInput"),
  saveEditBtn: document.getElementById("saveEditBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
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
render();
maybeStartOnboarding();

function wire() {
  el.typeInput.addEventListener("change", refreshCategoryInput);
  el.saveBtn.addEventListener("click", addEntry);
  el.clearBtn.addEventListener("click", clearForm);
  el.saveBudgetBtn.addEventListener("click", saveBudget);
  el.exportDataBtn.addEventListener("click", exportBackup);
  el.importDataBtn.addEventListener("click", () => el.importFileInput.click());
  el.sampleDataBtn.addEventListener("click", toggleSampleData);
  el.importFileInput.addEventListener("change", importBackupFromFile);

  [el.filterType, el.filterCategory, el.searchInput].forEach((node) => {
    node.addEventListener("input", renderTable);
    node.addEventListener("change", renderTable);
  });

  el.resetFiltersBtn.addEventListener("click", () => {
    el.filterType.value = "all";
    el.filterCategory.value = "all";
    el.searchInput.value = "";
    renderTable();
  });

  el.helpBtn.addEventListener("click", () => openDialog(el.helpDialog));
  el.editTypeInput.addEventListener("change", refreshEditCategoryInput);
  el.saveEditBtn.addEventListener("click", saveEditedEntry);
  el.cancelEditBtn.addEventListener("click", closeEditDialog);
  el.rows.addEventListener("click", handleTableActionClick);

  el.onboardBackBtn.addEventListener("click", goOnboardingBack);
  el.onboardNextBtn.addEventListener("click", goOnboardingNext);
  el.onboardSkipBtn.addEventListener("click", completeOnboarding);

  window.addEventListener("resize", drawCharts);
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY) || readLegacyData();
  if (!raw) return { budget: 0, entries: [] };
  try {
    const parsed = JSON.parse(raw);
    const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return {
      budget: Number(parsed.budget || 0),
      entries: rawEntries
        .map((entry) => sanitizeEntry(entry))
        .filter((entry) => entry !== null)
    };
  } catch {
    return { budget: 0, entries: [] };
  }
}

function readLegacyData() {
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) return raw;
  }
  return null;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function categoriesFor(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function refreshCategoryInput() {
  const type = el.typeInput.value;
  const dynamic = Array.from(new Set(state.entries.filter((e) => e.type === type).map((e) => e.category))).sort();
  const choices = Array.from(new Set([...categoriesFor(type), ...dynamic]));

  el.categoryInput.innerHTML = "";
  choices.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el.categoryInput.appendChild(opt);
  });
}

function refreshFilterCategories() {
  const categories = Array.from(new Set(state.entries.map((e) => e.category))).sort();
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

function addEntry() {
  const type = el.typeInput.value;
  const category = (el.categoryInput.value || "").trim();
  const amount = Number(el.amountInput.value);
  const note = (el.noteInput.value || "").trim();

  if (!category) return setStatus("Pick a category.");
  if (!Number.isFinite(amount) || amount < 0) return setStatus("Enter a valid amount.");

  state.entries.unshift({
    id: makeId(),
    type,
    category,
    amount,
    note,
    createdAt: new Date().toISOString()
  });

  save();
  clearForm();
  render();
  setStatus("Entry saved.");
}

function clearForm() {
  refreshCategoryInput();
  el.amountInput.value = "";
  el.noteInput.value = "";
}

function saveBudget() {
  const budget = Number(el.budgetInput.value);
  if (!Number.isFinite(budget) || budget < 0) return setStatus("Enter a valid budget.");
  state.budget = budget;
  save();
  renderSummary();
  setStatus("Budget goal saved.");
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
    { id: makeId(), type: "expense", category: "Rent", amount: 1450, note: "Apartment", createdAt: daysAgo(24), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Groceries", amount: 120, note: "Weekly groceries", createdAt: daysAgo(20), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Transportation", amount: 65, note: "Fuel", createdAt: daysAgo(14), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Dining", amount: 54, note: "Family dinner", createdAt: daysAgo(10), meta: { sample: true } },
    { id: makeId(), type: "income", category: "Freelance", amount: 380, note: "Side project", createdAt: daysAgo(8), meta: { sample: true } },
    { id: makeId(), type: "expense", category: "Utilities", amount: 160, note: "Electric and water", createdAt: daysAgo(5), meta: { sample: true } }
  ];

  if (state.budget === 0) {
    state.budget = 3000;
  }

  state.entries.unshift(...sampleEntries);
  save();
  render();
  setStatus("Sample data loaded.");
}

function render() {
  refreshCategoryInput();
  refreshFilterCategories();
  refreshSampleButton();
  el.budgetInput.value = state.budget || "";
  renderSummary();
  renderTable();
  drawCharts();
}

function refreshSampleButton() {
  const hasSample = state.entries.some(isSampleEntry);
  el.sampleDataBtn.textContent = hasSample ? "Clear Sample Data" : "Load Sample Data";
}

function filteredEntries() {
  const type = el.filterType.value;
  const category = el.filterCategory.value;
  const search = el.searchInput.value.trim().toLowerCase();

  return state.entries.filter((e) => {
    if (type !== "all" && e.type !== type) return false;
    if (category !== "all" && e.category !== category) return false;
    if (search && !(e.category.toLowerCase().includes(search) || (e.note || "").toLowerCase().includes(search))) return false;
    return true;
  });
}

function renderSummary() {
  const income = state.entries.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const expense = state.entries.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const balance = income - expense;
  const left = state.budget - expense;

  el.incomeTotal.textContent = formatMoney(income);
  el.expenseTotal.textContent = formatMoney(expense);
  el.balanceTotal.textContent = formatMoney(balance);
  el.budgetGoal.textContent = formatMoney(state.budget);
  el.budgetLeft.textContent = formatMoney(left);

  el.balanceTotal.style.color = balance < 0 ? "var(--bad)" : "var(--good)";
  el.budgetLeft.style.color = left < 0 ? "var(--bad)" : "var(--good)";
}

function renderTable() {
  const rows = filteredEntries();
  el.rows.innerHTML = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    appendCell(tr, formatDateTime(entry.createdAt));
    appendCell(tr, entry.type);
    appendCell(tr, entry.category);
    appendCell(tr, formatMoney(entry.amount));
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
    version: 1,
    budget: state.budget,
    entries: state.entries
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
      const importedBudget = Number(parsed.budget || 0);

      if (!confirm("Import this backup? This will replace your current web data.")) {
        el.importFileInput.value = "";
        return;
      }

      state.entries = importedEntries
        .map((entry) => sanitizeEntry(entry))
        .filter((entry) => entry !== null);
      state.budget = Number.isFinite(importedBudget) && importedBudget >= 0 ? importedBudget : 0;

      save();
      render();
      setStatus("Backup imported.");
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

function openEditDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  editingEntryId = id;

  el.editTypeInput.value = entry.type;
  refreshEditCategoryInput(entry.category);
  el.editAmountInput.value = String(entry.amount);
  el.editNoteInput.value = entry.note || "";
  openDialog(el.editDialog);
}

function refreshEditCategoryInput(selected = "") {
  const type = el.editTypeInput.value;
  const dynamic = Array.from(new Set(state.entries.filter((e) => e.type === type).map((e) => e.category))).sort();
  const choices = Array.from(new Set([...categoriesFor(type), ...dynamic]));

  el.editCategoryInput.innerHTML = "";
  choices.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el.editCategoryInput.appendChild(opt);
  });

  if (selected && choices.includes(selected)) {
    el.editCategoryInput.value = selected;
  }
}

function saveEditedEntry(event) {
  event.preventDefault();
  if (!editingEntryId) return;

  const entry = state.entries.find((item) => item.id === editingEntryId);
  if (!entry) return;

  const type = el.editTypeInput.value;
  const category = (el.editCategoryInput.value || "").trim();
  const amount = Number(el.editAmountInput.value);
  const note = (el.editNoteInput.value || "").trim();

  if (!category) return setStatus("Edit failed: pick a category.");
  if (!Number.isFinite(amount) || amount < 0) return setStatus("Edit failed: enter a valid amount.");

  entry.type = type;
  entry.category = category;
  entry.amount = amount;
  entry.note = note;

  save();
  render();
  closeEditDialog();
  setStatus("Entry updated.");
}

function closeEditDialog() {
  editingEntryId = null;
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

  const map = new Map();
  state.entries.filter((e) => e.type === "expense").forEach((e) => {
    const month = e.createdAt.slice(0, 7);
    map.set(month, (map.get(month) || 0) + e.amount);
  });

  const months = Array.from(map.keys()).sort().slice(-6);
  if (!months.length) {
    drawCenterText(ctx, canvas, "No expense data yet");
    return;
  }

  const values = months.map((m) => map.get(m));
  const max = Math.max(...values, 1);
  const left = 40;
  const top = 20;
  const right = width - 16;
  const bottom = height - 30;

  ctx.strokeStyle = "#ccd7e6";
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

    ctx.fillStyle = "#0f6bff";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#5e6a79";
    ctx.font = "11px Segoe UI";
    ctx.fillText(months[i].slice(2), x, bottom + 14);
  });
}

function drawCategoryChart() {
  const canvas = el.categoryChart;
  const ctx = canvas.getContext("2d");
  const { width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const totals = new Map();
  state.entries.filter((e) => e.type === "expense").forEach((e) => {
    totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
  });

  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) {
    drawCenterText(ctx, canvas, "No category data yet");
    return;
  }

  const max = Math.max(...top.map(([, v]) => v), 1);
  let y = 24;
  top.forEach(([name, value]) => {
    const label = name.length > 18 ? `${name.slice(0, 16)}..` : name;
    const x = 120;
    const full = width - x - 16;
    const barWidth = (value / max) * full;

    ctx.fillStyle = "#17202a";
    ctx.font = "12px Segoe UI";
    ctx.fillText(label, 12, y + 11);

    ctx.fillStyle = "#e4efff";
    ctx.fillRect(x, y, full, 14);
    ctx.fillStyle = "#198754";
    ctx.fillRect(x, y, barWidth, 14);

    ctx.fillStyle = "#5e6a79";
    ctx.fillText(formatMoney(value), x + full - 60, y + 11);
    y += 34;
  });
}

function fitCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: w, height: h };
}

function drawCenterText(ctx, canvas, text) {
  ctx.fillStyle = "#5e6a79";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.clientWidth / 2, canvas.clientHeight / 2);
  ctx.textAlign = "left";
}

function setStatus(message) {
  el.status.textContent = message;
}

function appendCell(row, value) {
  const td = document.createElement("td");
  td.textContent = value;
  row.appendChild(td);
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
  const seen = localStorage.getItem(ONBOARDING_KEY) === "1";
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
  localStorage.setItem(ONBOARDING_KEY, "1");
  closeDialog(el.onboardingDialog);
}
