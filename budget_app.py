import json
from pathlib import Path
from datetime import datetime

DATA_FILE = Path("budget_data.json")


def load_data() -> dict:
    if not DATA_FILE.exists():
        return {"monthly_budget": 0.0, "transactions": []}
    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"monthly_budget": 0.0, "transactions": []}


def save_data(data: dict) -> None:
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def parse_amount(value: str) -> float:
    amount = float(value)
    if amount < 0:
        raise ValueError("Amount must be non-negative.")
    return amount


def add_transaction(data: dict) -> None:
    kind = input("Type (income/expense): ").strip().lower()
    if kind not in {"income", "expense"}:
        print("Invalid type.")
        return

    category = input("Category: ").strip()
    if not category:
        print("Category is required.")
        return

    amount_raw = input("Amount: ").strip()
    try:
        amount = parse_amount(amount_raw)
    except ValueError:
        print("Invalid amount.")
        return

    note = input("Note (optional): ").strip()
    transaction = {
        "id": len(data["transactions"]) + 1,
        "type": kind,
        "category": category,
        "amount": amount,
        "note": note,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    data["transactions"].append(transaction)
    save_data(data)
    print("Transaction saved.")


def list_transactions(data: dict) -> None:
    transactions = data.get("transactions", [])
    if not transactions:
        print("No transactions yet.")
        return

    print("\nID | Date                | Type    | Category        | Amount   | Note")
    print("-" * 78)
    for t in transactions:
        date = t.get("created_at", "")
        t_type = t.get("type", "")
        category = t.get("category", "")
        amount = t.get("amount", 0)
        note = t.get("note", "")
        print(f"{t['id']:>2} | {date:<19} | {t_type:<7} | {category:<15} | ${amount:<7.2f} | {note}")


def delete_transaction(data: dict) -> None:
    if not data.get("transactions"):
        print("No transactions to delete.")
        return

    try:
        tx_id = int(input("Enter transaction ID to delete: ").strip())
    except ValueError:
        print("Invalid ID.")
        return

    original_len = len(data["transactions"])
    data["transactions"] = [t for t in data["transactions"] if t["id"] != tx_id]

    if len(data["transactions"]) == original_len:
        print("Transaction ID not found.")
        return

    # Keep IDs contiguous for a simple beginner-friendly app.
    for i, t in enumerate(data["transactions"], start=1):
        t["id"] = i

    save_data(data)
    print("Transaction deleted.")


def set_monthly_budget(data: dict) -> None:
    raw = input("Enter monthly budget: ").strip()
    try:
        data["monthly_budget"] = parse_amount(raw)
    except ValueError:
        print("Invalid budget value.")
        return

    save_data(data)
    print("Monthly budget updated.")


def show_summary(data: dict) -> None:
    income = sum(t["amount"] for t in data["transactions"] if t["type"] == "income")
    expense = sum(t["amount"] for t in data["transactions"] if t["type"] == "expense")
    balance = income - expense
    budget = data.get("monthly_budget", 0.0)
    remaining = budget - expense

    print("\nSummary")
    print("-" * 30)
    print(f"Total income : ${income:.2f}")
    print(f"Total expense: ${expense:.2f}")
    print(f"Net balance  : ${balance:.2f}")
    print(f"Month budget : ${budget:.2f}")
    print(f"Budget left  : ${remaining:.2f}")


def main() -> None:
    data = load_data()

    menu = {
        "1": ("Add transaction", add_transaction),
        "2": ("List transactions", list_transactions),
        "3": ("Delete transaction", delete_transaction),
        "4": ("Set monthly budget", set_monthly_budget),
        "5": ("Show summary", show_summary),
        "6": ("Exit", None),
    }

    while True:
        print("\nBudget App")
        print("=" * 30)
        for key, (label, _) in menu.items():
            print(f"{key}. {label}")

        choice = input("Choose an option: ").strip()
        if choice == "6":
            print("Goodbye.")
            break

        action = menu.get(choice)
        if not action:
            print("Invalid option.")
            continue

        _, handler = action
        if handler:
            handler(data)


if __name__ == "__main__":
    main()
