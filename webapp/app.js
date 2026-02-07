const STORAGE_KEY = "pybudget_web_v1";

const EXPENSE_CATEGORIES = [
  "Groceries", "Rent", "Utilities", "Transportation", "Dining", "Entertainment",
  "Healthcare", "Insurance", "Debt Payment", "Childcare", "Education", "Phone/Internet",
  "Shopping", "Personal Care", "Travel", "Gifts", "Taxes", "Other"
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Interest", "Dividends", "Rental Income", "Refund", "Gift", "Other Income"
];

const state = load();

const el = {
  typeInput: document.getElementById("typeInput"),
  categoryInput: document.getElementById("categoryInput"),
  amountInput: document.getElementById("amountInput"),
  noteInput: document.getElementById("noteInput"),
  saveBtn: document.getElementById("saveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  budgetInput: document.getElementById("budgetInput"),
  saveBudgetBtn: document.getElementById("saveBudgetBtn"),
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
  monthChart: document.getElementById("monthChart"),
  categoryChart: document.getElementById("categoryChart")
};

wire();
render();

function wire() {
  el.typeInput.addEventListener("change", refreshCategoryInput);
  el.saveBtn.addEventListener("click", addEntry);
  el.clearBtn.addEventListener("click", clearForm);
  el.saveBudgetBtn.addEventListener("click", saveBudget);

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

  el.helpBtn.addEventListener("click", () => el.helpDialog.showModal());
  window.addEventListener("resize", drawCharts);
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { budget: 0, entries: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      budget: Number(parsed.budget || 0),
      entries: Array.isArray(parsed.entries) ? parsed.entries : []
    };
  } catch {
    return { budget: 0, entries: [] };
  }
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
  const dynamic = Array.from(new Set(state.entries.filter(e => e.type === type).map(e => e.category))).sort();
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
    id: crypto.randomUUID(),
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

function render() {
  refreshCategoryInput();
  refreshFilterCategories();
  el.budgetInput.value = state.budget || "";
  renderSummary();
  renderTable();
  drawCharts();
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

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(entry.createdAt).toLocaleString()}</td>
      <td>${entry.type}</td>
      <td>${entry.category}</td>
      <td>${formatMoney(entry.amount)}</td>
      <td>${entry.note || ""}</td>
      <td><button class="delete-btn" data-id="${entry.id}">Delete</button></td>
    `;
    el.rows.appendChild(tr);
  });

  el.rows.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
  });

  el.emptyState.style.display = rows.length ? "none" : "block";
}

function deleteEntry(id) {
  if (!confirm("Delete this entry?")) return;
  state.entries = state.entries.filter((e) => e.id !== id);
  save();
  render();
  setStatus("Entry deleted.");
}

function drawCharts() {
  drawMonthChart();
  drawCategoryChart();
}

function drawMonthChart() {
  const canvas = el.monthChart;
  const ctx = canvas.getContext("2d");
  fitCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const map = new Map();
  state.entries.filter(e => e.type === "expense").forEach((e) => {
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
  const left = 40, top = 20, right = canvas.width - 16, bottom = canvas.height - 30;

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
  fitCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totals = new Map();
  state.entries.filter(e => e.type === "expense").forEach((e) => {
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
    const full = canvas.width - x - 16;
    const width = (value / max) * full;

    ctx.fillStyle = "#17202a";
    ctx.font = "12px Segoe UI";
    ctx.fillText(label, 12, y + 11);

    ctx.fillStyle = "#e4efff";
    ctx.fillRect(x, y, full, 14);
    ctx.fillStyle = "#198754";
    ctx.fillRect(x, y, width, 14);

    ctx.fillStyle = "#5e6a79";
    ctx.fillText(formatMoney(value), x + full - 60, y + 11);
    y += 34;
  });
}

function fitCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = canvas.clientWidth;
  const h = canvas.height;
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawCenterText(ctx, canvas, text) {
  ctx.fillStyle = "#5e6a79";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.clientWidth / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

function setStatus(message) {
  el.status.textContent = message;
}
