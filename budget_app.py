import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

DATA_FILE = Path("budget_data.json")
EXPENSE_CATEGORIES = [
    "Groceries",
    "Rent",
    "Utilities",
    "Transportation",
    "Dining",
    "Entertainment",
    "Healthcare",
    "Insurance",
    "Debt Payment",
    "Childcare",
    "Education",
    "Phone/Internet",
    "Shopping",
    "Personal Care",
    "Travel",
    "Gifts",
    "Taxes",
    "Other",
]
INCOME_CATEGORIES = [
    "Salary",
    "Freelance",
    "Business",
    "Interest",
    "Dividends",
    "Rental Income",
    "Refund",
    "Gift Received",
    "Other Income",
]
DEFAULT_CATEGORIES = sorted(set(EXPENSE_CATEGORIES + INCOME_CATEGORIES))


def typical_categories_for(entry_type: str) -> list[str]:
    if entry_type == "income":
        return INCOME_CATEGORIES[:]
    if entry_type == "expense":
        return EXPENSE_CATEGORIES[:]
    return DEFAULT_CATEGORIES[:]


class Colors:
    BG = "#f4f6fb"
    PANEL = "#ffffff"
    ACCENT = "#1f6feb"
    ACCENT_SOFT = "#dfeeff"
    TEXT = "#17202a"
    MUTED = "#5b6573"
    INCOME = "#198754"
    EXPENSE = "#d73a49"
    GRID = "#d9e0ea"


def load_data() -> dict:
    if not DATA_FILE.exists():
        return {"monthly_budget": 0.0, "transactions": []}
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (json.JSONDecodeError, OSError):
        return {"monthly_budget": 0.0, "transactions": []}

    if "monthly_budget" not in data:
        data["monthly_budget"] = 0.0
    if "transactions" not in data:
        data["transactions"] = []
    return data


def save_data(data: dict) -> None:
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def parse_amount(value: str) -> float:
    amount = float(value)
    if amount < 0:
        raise ValueError("Amount must be non-negative.")
    return amount


def calculate_summary(data: dict) -> dict:
    income = sum(tx["amount"] for tx in data["transactions"] if tx["type"] == "income")
    expense = sum(tx["amount"] for tx in data["transactions"] if tx["type"] == "expense")
    budget = data.get("monthly_budget", 0.0)
    return {
        "income": income,
        "expense": expense,
        "balance": income - expense,
        "budget": budget,
        "remaining": budget - expense,
    }


def safe_month_key(created_at: str) -> str:
    if not created_at:
        return "unknown"
    try:
        return datetime.fromisoformat(created_at).strftime("%Y-%m")
    except ValueError:
        return created_at[:7] if len(created_at) >= 7 else "unknown"


def format_currency(amount: float) -> str:
    return f"${amount:,.2f}"


class BudgetAppGUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Pybudget")
        self.root.geometry("1180x760")
        self.root.minsize(1024, 680)
        self.root.configure(bg=Colors.BG)

        self.data = load_data()
        self.sort_column = "date"
        self.sort_reverse = True
        self._filter_after_id = None

        self.status_var = tk.StringVar(value="Ready")
        self.type_var = tk.StringVar(value="expense")
        self.category_var = tk.StringVar()
        self.amount_var = tk.StringVar()
        self.note_var = tk.StringVar()
        self.budget_var = tk.StringVar(value=f"{self.data.get('monthly_budget', 0.0):.2f}")

        self.search_var = tk.StringVar()
        self.filter_type_var = tk.StringVar(value="all")
        self.filter_category_var = tk.StringVar(value="all")

        self.income_var = tk.StringVar(value="$0.00")
        self.expense_var = tk.StringVar(value="$0.00")
        self.balance_var = tk.StringVar(value="$0.00")
        self.budget_total_var = tk.StringVar(value="$0.00")
        self.remaining_var = tk.StringVar(value="$0.00")

        self._build_style()
        self._build_ui()
        self._bind_live_filters()
        self.refresh_ui("Loaded budget data.")
        self._show_welcome_if_needed()

    def _build_style(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure("TFrame", background=Colors.BG)
        style.configure("TLabelframe", background=Colors.BG)
        style.configure("TLabelframe.Label", background=Colors.BG, foreground=Colors.TEXT, font=("Segoe UI", 10, "bold"))
        style.configure("TLabel", background=Colors.BG, foreground=Colors.TEXT, font=("Segoe UI", 10))
        style.configure("Title.TLabel", background=Colors.BG, foreground=Colors.TEXT, font=("Segoe UI", 26, "bold"))
        style.configure("Hint.TLabel", background=Colors.BG, foreground=Colors.MUTED, font=("Segoe UI", 9))
        style.configure("Accent.TButton", font=("Segoe UI", 10, "bold"))
        style.map("Accent.TButton", background=[("!disabled", Colors.ACCENT)])

        style.configure(
            "Treeview",
            background=Colors.PANEL,
            fieldbackground=Colors.PANEL,
            foreground=Colors.TEXT,
            rowheight=28,
            borderwidth=0,
            font=("Segoe UI", 10),
        )
        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), foreground=Colors.TEXT)

    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(1, weight=1)

        header = ttk.Frame(self.root, padding=(18, 14, 18, 8), style="TFrame")
        header.grid(row=0, column=0, sticky="ew")
        ttk.Label(header, text="Pybudget", style="Title.TLabel").pack(side="left")
        ttk.Button(header, text="How To Use", command=self.show_help).pack(side="right")

        content = ttk.Frame(self.root, padding=(18, 8, 18, 12))
        content.grid(row=1, column=0, sticky="nsew")
        content.columnconfigure(0, weight=0)
        content.columnconfigure(1, weight=1)
        content.rowconfigure(0, weight=0)
        content.rowconfigure(1, weight=1)

        left = ttk.Frame(content, style="TFrame")
        left.grid(row=0, column=0, rowspan=2, sticky="nsw", padx=(0, 14))

        self._build_entry_panel(left)
        self._build_actions_panel(left)

        self._build_stats_row(content)
        self._build_table_panel(content)
        self._build_charts_panel(content)

        footer = ttk.Frame(self.root, padding=(18, 0, 18, 12))
        footer.grid(row=2, column=0, sticky="ew")
        footer.columnconfigure(0, weight=1)
        ttk.Label(footer, textvariable=self.status_var, foreground=Colors.MUTED).grid(row=0, column=0, sticky="w")

    def _build_entry_panel(self, parent: ttk.Frame) -> None:
        form = ttk.LabelFrame(parent, text="Add New Entry", padding=12)
        form.grid(row=0, column=0, sticky="new")

        ttk.Label(form, text="Money Type").grid(row=0, column=0, sticky="w", pady=(0, 4))
        ttk.Combobox(form, textvariable=self.type_var, values=["income", "expense"], state="readonly", width=24).grid(
            row=1, column=0, sticky="ew", pady=(0, 8)
        )

        ttk.Label(form, text="Category").grid(row=2, column=0, sticky="w", pady=(0, 4))
        self.category_entry = ttk.Combobox(
            form,
            textvariable=self.category_var,
            values=typical_categories_for("expense"),
            state="readonly",
            width=24,
        )
        self.category_entry.grid(row=3, column=0, sticky="ew", pady=(0, 8))
        if self.category_entry["values"]:
            self.category_var.set(self.category_entry["values"][0])

        ttk.Label(form, text="Amount (example: 24.99)").grid(row=4, column=0, sticky="w", pady=(0, 4))
        amount_entry = ttk.Entry(form, textvariable=self.amount_var, width=24)
        amount_entry.grid(row=5, column=0, sticky="ew", pady=(0, 8))

        ttk.Label(form, text="Note (optional)").grid(row=6, column=0, sticky="w", pady=(0, 4))
        note_entry = ttk.Entry(form, textvariable=self.note_var, width=24)
        note_entry.grid(row=7, column=0, sticky="ew", pady=(0, 10))

        amount_entry.bind("<Return>", lambda _e: self.add_transaction())
        note_entry.bind("<Return>", lambda _e: self.add_transaction())

        ttk.Button(form, text="Save Entry", command=self.add_transaction, style="Accent.TButton").grid(
            row=8, column=0, sticky="ew"
        )
        ttk.Button(form, text="Clear Form", command=self.clear_form).grid(row=9, column=0, sticky="ew", pady=(6, 0))

        ttk.Separator(form).grid(row=10, column=0, sticky="ew", pady=10)

        ttk.Label(form, text="Monthly Budget Goal").grid(row=11, column=0, sticky="w", pady=(0, 4))
        ttk.Entry(form, textvariable=self.budget_var, width=24).grid(row=12, column=0, sticky="ew", pady=(0, 8))
        ttk.Button(form, text="Save Budget Goal", command=self.set_budget).grid(row=13, column=0, sticky="ew")
        ttk.Label(form, text="Tip: Set this once per month.", style="Hint.TLabel").grid(row=14, column=0, sticky="w", pady=(6, 0))

    def _build_actions_panel(self, parent: ttk.Frame) -> None:
        panel = ttk.LabelFrame(parent, text="File & Safety", padding=12)
        panel.grid(row=1, column=0, sticky="new", pady=(10, 0))

        ttk.Button(panel, text="Delete Selected Entry", command=self.delete_selected).grid(row=0, column=0, sticky="ew")
        ttk.Button(panel, text="Export to CSV", command=self.export_csv).grid(row=1, column=0, sticky="ew", pady=(8, 0))
        ttk.Button(panel, text="Import from CSV", command=self.import_csv).grid(row=2, column=0, sticky="ew", pady=(8, 0))

    def _build_stats_row(self, parent: ttk.Frame) -> None:
        stats = ttk.Frame(parent)
        stats.grid(row=0, column=1, sticky="ew", pady=(0, 10))
        for idx in range(5):
            stats.columnconfigure(idx, weight=1)

        self._build_stat_card(stats, 0, "Income", self.income_var)
        self._build_stat_card(stats, 1, "Expenses", self.expense_var)
        self._build_stat_card(stats, 2, "Balance", self.balance_var)
        self._build_stat_card(stats, 3, "Budget Goal", self.budget_total_var)
        self._build_stat_card(stats, 4, "Budget Left", self.remaining_var)

    def _build_stat_card(self, parent: ttk.Frame, col: int, label: str, value_var: tk.StringVar) -> None:
        card = tk.Frame(parent, bg=Colors.PANEL, bd=0, highlightthickness=1, highlightbackground=Colors.GRID)
        card.grid(row=0, column=col, sticky="nsew", padx=(0 if col == 0 else 8, 0), pady=0)
        tk.Label(card, text=label, bg=Colors.PANEL, fg=Colors.MUTED, font=("Segoe UI", 9, "bold")).pack(
            anchor="w", padx=10, pady=(8, 2)
        )
        tk.Label(card, textvariable=value_var, bg=Colors.PANEL, fg=Colors.TEXT, font=("Segoe UI", 16, "bold")).pack(
            anchor="w", padx=10, pady=(0, 8)
        )

    def _build_table_panel(self, parent: ttk.Frame) -> None:
        table_wrap = ttk.LabelFrame(parent, text="Entries", padding=10)
        table_wrap.grid(row=1, column=1, sticky="nsew")
        table_wrap.columnconfigure(0, weight=1)
        table_wrap.rowconfigure(1, weight=1)

        filters = ttk.Frame(table_wrap)
        filters.grid(row=0, column=0, sticky="ew", pady=(0, 8))

        ttk.Label(filters, text="Type").grid(row=0, column=0, sticky="w")
        self.type_filter_combo = ttk.Combobox(
            filters,
            textvariable=self.filter_type_var,
            values=["all", "income", "expense"],
            state="readonly",
            width=10,
        )
        self.type_filter_combo.grid(row=0, column=1, padx=(6, 10), sticky="w")

        ttk.Label(filters, text="Category").grid(row=0, column=2, sticky="w")
        self.category_filter_combo = ttk.Combobox(
            filters,
            textvariable=self.filter_category_var,
            values=["all"],
            state="readonly",
            width=18,
        )
        self.category_filter_combo.grid(row=0, column=3, padx=(6, 10), sticky="w")

        ttk.Label(filters, text="Search notes/categories").grid(row=0, column=4, sticky="w")
        ttk.Entry(filters, textvariable=self.search_var, width=28).grid(row=0, column=5, padx=(6, 10), sticky="w")

        ttk.Button(filters, text="Reset Filters", command=self.reset_filters).grid(row=0, column=6, padx=(6, 0), sticky="w")

        columns = ("id", "date", "type", "category", "amount", "note")
        self.tree = ttk.Treeview(table_wrap, columns=columns, show="headings", selectmode="extended")
        self.tree.grid(row=1, column=0, sticky="nsew")
        self.tree.bind("<<TreeviewSelect>>", self._on_tree_select)
        self.tree.bind("<Delete>", lambda _e: self.delete_selected())

        headings = {
            "id": "ID",
            "date": "Date",
            "type": "Type",
            "category": "Category",
            "amount": "Amount",
            "note": "Note",
        }
        for col, label in headings.items():
            self.tree.heading(col, text=label, command=lambda c=col: self.sort_by(c))

        self.tree.column("id", width=55, anchor="center")
        self.tree.column("date", width=150, anchor="w")
        self.tree.column("type", width=85, anchor="center")
        self.tree.column("category", width=150, anchor="w")
        self.tree.column("amount", width=120, anchor="e")
        self.tree.column("note", width=240, anchor="w")

        scrollbar = ttk.Scrollbar(table_wrap, orient="vertical", command=self.tree.yview)
        scrollbar.grid(row=1, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.empty_state_label = ttk.Label(
            table_wrap,
            text="No entries yet. Start by adding your first income or expense on the left.",
            style="Hint.TLabel",
        )

    def _build_charts_panel(self, parent: ttk.Frame) -> None:
        charts = ttk.LabelFrame(parent, text="Insights", padding=10)
        charts.grid(row=2, column=1, sticky="ew", pady=(10, 0))
        charts.columnconfigure(0, weight=1)
        charts.columnconfigure(1, weight=1)

        self.month_canvas = tk.Canvas(charts, bg=Colors.PANEL, height=190, highlightthickness=1, highlightbackground=Colors.GRID)
        self.month_canvas.grid(row=0, column=0, sticky="ew", padx=(0, 8))

        self.category_canvas = tk.Canvas(charts, bg=Colors.PANEL, height=190, highlightthickness=1, highlightbackground=Colors.GRID)
        self.category_canvas.grid(row=0, column=1, sticky="ew", padx=(8, 0))

        self.month_canvas.bind("<Configure>", lambda _e: self.draw_month_chart())
        self.category_canvas.bind("<Configure>", lambda _e: self.draw_category_chart())

    def _bind_live_filters(self) -> None:
        self.search_var.trace_add("write", self._schedule_filter_refresh)
        self.filter_type_var.trace_add("write", self._schedule_filter_refresh)
        self.filter_category_var.trace_add("write", self._schedule_filter_refresh)
        self.type_var.trace_add("write", self._on_entry_type_changed)

    def _on_entry_type_changed(self, *_args) -> None:
        self._refresh_category_options()

    def _schedule_filter_refresh(self, *_args) -> None:
        if self._filter_after_id is not None:
            self.root.after_cancel(self._filter_after_id)
        self._filter_after_id = self.root.after(200, lambda: self.refresh_ui("Filters updated."))

    def _on_tree_select(self, _event=None) -> None:
        count = len(self.tree.selection())
        if count == 0:
            return
        entry_word = "entry" if count == 1 else "entries"
        self.status_var.set(f"{count} {entry_word} selected.")

    def _show_welcome_if_needed(self) -> None:
        if self.data.get("transactions"):
            return
        messagebox.showinfo(
            "Welcome to Pybudget",
            "Start with 2 steps:\n\n1) Set your monthly budget goal\n2) Add each expense or income as it happens\n\nUse 'How To Use' any time for a quick guide.",
        )

    def show_help(self) -> None:
        messagebox.showinfo(
            "How To Use (Simple Steps)",
            "Take your time. Follow these steps:\n\n"
            "1) Set your monthly budget first.\n"
            "   On the left side, type your budget in 'Monthly Budget Goal'\n"
            "   then click 'Save Budget Goal'.\n\n"
            "2) Add money you receive (income).\n"
            "   Choose 'income', pick a category, type the amount,\n"
            "   then click 'Save Entry'.\n\n"
            "3) Add money you spend (expense).\n"
            "   Choose 'expense', pick a category, type the amount,\n"
            "   then click 'Save Entry'.\n\n"
            "4) Check your totals at the top.\n"
            "   - Income: money in\n"
            "   - Expenses: money out\n"
            "   - Budget Left: what you still have this month\n\n"
            "5) To remove a mistake:\n"
            "   Click the entry once in the table, then click\n"
            "   'Delete Selected Entry'.\n\n"
            "6) To find old entries:\n"
            "   Use the search box or the filter boxes above the table.\n\n"
            "7) To save a backup copy:\n"
            "   Click 'Export to CSV'.\n\n"
            "If something looks wrong, do not worry.\n"
            "You can always add, edit by deleting/re-adding, or import/export again.",
        )

    def visible_transactions(self) -> list[dict]:
        term = self.search_var.get().strip().lower()
        type_filter = self.filter_type_var.get().strip().lower()
        category_filter = self.filter_category_var.get().strip().lower()

        rows = []
        for tx in self.data.get("transactions", []):
            if type_filter != "all" and tx.get("type", "") != type_filter:
                continue
            if category_filter != "all" and tx.get("category", "").lower() != category_filter:
                continue

            haystack = f"{tx.get('category', '')} {tx.get('note', '')}".lower()
            if term and term not in haystack:
                continue
            rows.append(tx)

        return self.sorted_transactions(rows)

    def sorted_transactions(self, rows: list[dict]) -> list[dict]:
        key = self.sort_column

        def key_fn(tx: dict):
            if key == "id":
                return tx.get("id", 0)
            if key == "amount":
                return float(tx.get("amount", 0.0))
            lookup = "created_at" if key == "date" else key
            return str(tx.get(lookup, "")).lower()

        return sorted(rows, key=key_fn, reverse=self.sort_reverse)

    def sort_by(self, column: str) -> None:
        if self.sort_column == column:
            self.sort_reverse = not self.sort_reverse
        else:
            self.sort_column = column
            self.sort_reverse = column in {"id", "amount", "date"}
        self.refresh_ui(f"Sorted by {column}.")

    def refresh_ui(self, status_text: str = "Ready") -> None:
        self._refresh_category_options()

        for row in self.tree.get_children():
            self.tree.delete(row)

        visible = self.visible_transactions()
        for tx in visible:
            self.tree.insert(
                "",
                "end",
                values=(
                    tx["id"],
                    tx.get("created_at", ""),
                    tx.get("type", ""),
                    tx.get("category", ""),
                    format_currency(float(tx.get("amount", 0.0))),
                    tx.get("note", ""),
                ),
            )

        if visible:
            self.empty_state_label.grid_forget()
        else:
            self.empty_state_label.grid(row=2, column=0, sticky="w", pady=(8, 0))

        summary = calculate_summary(self.data)
        self.income_var.set(format_currency(summary["income"]))
        self.expense_var.set(format_currency(summary["expense"]))
        self.balance_var.set(format_currency(summary["balance"]))
        self.budget_total_var.set(format_currency(summary["budget"]))
        self.remaining_var.set(format_currency(summary["remaining"]))
        self.budget_var.set(f"{summary['budget']:.2f}")

        self.status_var.set(status_text)
        self.draw_month_chart()
        self.draw_category_chart()

    def _refresh_category_options(self) -> None:
        categories = sorted({tx.get("category", "").strip() for tx in self.data.get("transactions", []) if tx.get("category")})

        selected_type = self.type_var.get().strip().lower()
        typed_categories = sorted({tx.get("category", "").strip() for tx in self.data.get("transactions", []) if tx.get("type") == selected_type and tx.get("category")})
        category_choices = sorted(set(typical_categories_for(selected_type) + typed_categories + categories))
        self.category_entry["values"] = category_choices
        if category_choices and self.category_var.get() not in category_choices:
            self.category_var.set(category_choices[0])

        filter_values = ["all", *categories]
        self.category_filter_combo["values"] = filter_values
        if self.filter_category_var.get() not in filter_values:
            self.filter_category_var.set("all")

    def add_transaction(self) -> None:
        kind = self.type_var.get().strip().lower()
        category = self.category_var.get().strip()
        amount_raw = self.amount_var.get().strip().replace("$", "")
        note = self.note_var.get().strip()

        if kind not in {"income", "expense"}:
            messagebox.showerror("Invalid Type", "Choose either income or expense.")
            return

        if not category:
            messagebox.showerror("Missing Category", "Please choose or type a category.")
            return

        try:
            amount = parse_amount(amount_raw)
        except ValueError:
            messagebox.showerror("Invalid Amount", "Please enter a valid amount, like 24.99")
            return

        tx = {
            "id": len(self.data["transactions"]) + 1,
            "type": kind,
            "category": category,
            "amount": amount,
            "note": note,
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }
        self.data["transactions"].append(tx)
        save_data(self.data)

        self.clear_form()
        self.refresh_ui("Entry saved.")

    def clear_form(self) -> None:
        categories = typical_categories_for(self.type_var.get().strip().lower())
        self.category_var.set(categories[0] if categories else "")
        self.amount_var.set("")
        self.note_var.set("")
        self.status_var.set("Form cleared.")

    def delete_selected(self) -> None:
        selected = self.tree.selection()
        if not selected:
            focused = self.tree.focus()
            if focused:
                selected = (focused,)
        if not selected:
            messagebox.showwarning("No Selection", "Select an entry first, then click Delete.")
            return

        ids_to_delete = set()
        for row_id in selected:
            row_values = self.tree.item(row_id, "values")
            if row_values:
                ids_to_delete.add(int(row_values[0]))

        if not ids_to_delete:
            messagebox.showwarning("No Selection", "Select a valid entry to delete.")
            return

        entry_word = "entry" if len(ids_to_delete) == 1 else "entries"
        if not messagebox.askyesno(
            "Confirm Delete",
            f"Delete {len(ids_to_delete)} {entry_word}? This cannot be undone.",
        ):
            return

        self.data["transactions"] = [tx for tx in self.data["transactions"] if tx["id"] not in ids_to_delete]
        self._reindex_transactions()
        save_data(self.data)
        self.refresh_ui(f"Deleted {len(ids_to_delete)} {entry_word}.")

    def _reindex_transactions(self) -> None:
        for index, tx in enumerate(self.data["transactions"], start=1):
            tx["id"] = index

    def set_budget(self) -> None:
        raw = self.budget_var.get().strip().replace("$", "")
        try:
            self.data["monthly_budget"] = parse_amount(raw)
        except ValueError:
            messagebox.showerror("Invalid Budget", "Please enter a valid number for budget goal.")
            return

        save_data(self.data)
        self.refresh_ui("Budget goal saved.")

    def reset_filters(self) -> None:
        self.search_var.set("")
        self.filter_type_var.set("all")
        self.filter_category_var.set("all")
        self.refresh_ui("Filters reset.")

    def export_csv(self) -> None:
        if not self.data.get("transactions"):
            messagebox.showinfo("Nothing to Export", "There are no entries to export yet.")
            return

        path = filedialog.asksaveasfilename(
            title="Export Entries",
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
            initialfile="pybudget_entries.csv",
        )
        if not path:
            return

        try:
            with open(path, "w", newline="", encoding="utf-8") as file:
                writer = csv.DictWriter(file, fieldnames=["id", "type", "category", "amount", "note", "created_at"])
                writer.writeheader()
                for tx in self.data["transactions"]:
                    writer.writerow(tx)
        except OSError as exc:
            messagebox.showerror("Export Failed", f"Could not export CSV.\n{exc}")
            return

        messagebox.showinfo("Export Complete", f"Entries exported to:\n{path}")
        self.refresh_ui(f"Exported CSV: {Path(path).name}")

    def import_csv(self) -> None:
        path = filedialog.askopenfilename(
            title="Import Entries",
            filetypes=[("CSV files", "*.csv")],
        )
        if not path:
            return

        if not messagebox.askyesno(
            "Confirm Import",
            "Import entries from this CSV file?\n\nExisting entries will stay and imported entries will be added.",
        ):
            return

        imported = 0
        try:
            with open(path, "r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                for row in reader:
                    tx_type = (row.get("type") or "").strip().lower()
                    category = (row.get("category") or "").strip()
                    note = (row.get("note") or "").strip()
                    created_at = (row.get("created_at") or "").strip() or datetime.now().isoformat(timespec="seconds")

                    if tx_type not in {"income", "expense"} or not category:
                        continue

                    try:
                        amount = parse_amount(str(row.get("amount", "")).strip().replace("$", ""))
                    except ValueError:
                        continue

                    self.data["transactions"].append(
                        {
                            "id": 0,
                            "type": tx_type,
                            "category": category,
                            "amount": amount,
                            "note": note,
                            "created_at": created_at,
                        }
                    )
                    imported += 1
        except OSError as exc:
            messagebox.showerror("Import Failed", f"Could not import CSV.\n{exc}")
            return

        if imported == 0:
            messagebox.showwarning("No Rows Imported", "No valid rows were found in this CSV file.")
            return

        self._reindex_transactions()
        save_data(self.data)
        messagebox.showinfo("Import Complete", f"Imported {imported} entries.")
        self.refresh_ui(f"Imported {imported} entries.")

    def draw_month_chart(self) -> None:
        canvas = self.month_canvas
        canvas.delete("all")
        width = canvas.winfo_width()
        height = canvas.winfo_height()
        if width < 220 or height < 140:
            return

        expense_by_month = defaultdict(float)
        for tx in self.data.get("transactions", []):
            if tx.get("type") == "expense":
                expense_by_month[safe_month_key(tx.get("created_at", ""))] += float(tx.get("amount", 0.0))

        months = sorted(expense_by_month.keys())[-6:]
        canvas.create_text(12, 14, text="Monthly Expense Trend", anchor="w", fill=Colors.TEXT, font=("Segoe UI", 10, "bold"))

        if not months:
            canvas.create_text(width / 2, height / 2, text="No expense data yet", fill=Colors.MUTED, font=("Segoe UI", 11))
            return

        max_value = max(expense_by_month[m] for m in months) or 1.0
        left, top, right, bottom = 36, 30, width - 14, height - 28
        usable_width = right - left
        bar_space = usable_width / len(months)
        bar_w = max(12, min(42, int(bar_space * 0.58)))

        canvas.create_line(left, top, left, bottom, fill=Colors.GRID)
        canvas.create_line(left, bottom, right, bottom, fill=Colors.GRID)

        for idx, month in enumerate(months):
            value = expense_by_month[month]
            x_center = left + (idx + 0.5) * bar_space
            bar_height = ((bottom - top) * value) / max_value
            x1 = x_center - bar_w / 2
            y1 = bottom - bar_height
            x2 = x_center + bar_w / 2
            y2 = bottom
            canvas.create_rectangle(x1, y1, x2, y2, fill=Colors.ACCENT, outline="")
            canvas.create_text(x_center, bottom + 12, text=month[2:], fill=Colors.MUTED, font=("Segoe UI", 8))

    def draw_category_chart(self) -> None:
        canvas = self.category_canvas
        canvas.delete("all")
        width = canvas.winfo_width()
        height = canvas.winfo_height()
        if width < 240 or height < 140:
            return

        expense_by_category = defaultdict(float)
        for tx in self.data.get("transactions", []):
            if tx.get("type") == "expense":
                category = tx.get("category", "Uncategorized")
                expense_by_category[category] += float(tx.get("amount", 0.0))

        top_categories = sorted(expense_by_category.items(), key=lambda item: item[1], reverse=True)[:5]
        canvas.create_text(12, 14, text="Top Expense Categories", anchor="w", fill=Colors.TEXT, font=("Segoe UI", 10, "bold"))

        if not top_categories:
            canvas.create_text(width / 2, height / 2, text="No category data yet", fill=Colors.MUTED, font=("Segoe UI", 11))
            return

        max_value = max(value for _, value in top_categories) or 1.0
        y = 36
        for category, value in top_categories:
            label = category if len(category) <= 18 else f"{category[:16]}.."
            bar_left = 110
            bar_right = width - 16
            bar_width = bar_right - bar_left
            fill_width = (value / max_value) * bar_width

            canvas.create_text(12, y + 8, text=label, anchor="w", fill=Colors.TEXT, font=("Segoe UI", 9))
            canvas.create_rectangle(bar_left, y, bar_right, y + 16, fill=Colors.ACCENT_SOFT, outline="")
            canvas.create_rectangle(bar_left, y, bar_left + fill_width, y + 16, fill=Colors.INCOME, outline="")
            canvas.create_text(bar_right, y + 8, text=format_currency(value), anchor="e", fill=Colors.MUTED, font=("Segoe UI", 8, "bold"))
            y += 28


def main() -> None:
    root = tk.Tk()
    BudgetAppGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
