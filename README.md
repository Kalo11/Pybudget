# Pybudget

A simple command-line budget tracker built with Python.

## Features
- Add income and expense transactions
- List saved transactions
- Delete transactions by ID
- Set a monthly budget
- View summary totals and remaining budget
- Local JSON data storage (`budget_data.json`)

## Requirements
- Python 3.8+

## Run
```powershell
python budget_app.py
```

## Menu Options
1. Add transaction
2. List transactions
3. Delete transaction
4. Set monthly budget
5. Show summary
6. Exit

## Data File
The app stores data in `budget_data.json` in the same folder.

## Notes
- `.gitignore` excludes local environment files and `budget_data.json`.
- This is a local-first learning project and does not send data anywhere.
