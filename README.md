# Pybudget

A budget tracker with:
- Desktop app (`tkinter`)
- Responsive web app (HTML/CSS/JS)

## Features
- Add income and expense transactions
- Sort transactions by clicking table headers (desktop app)
- Filter by type and category
- Search transactions by category or note
- Delete selected transaction
- Set monthly budget
- Live summary cards (income, expense, balance, budget, budget left)
- Built-in charts:
  - Monthly expense trend (last 6 months)
  - Top expense categories
- CSV export and import (desktop app)
- Local JSON data storage (`budget_data.json`) for desktop app
- Browser local storage for web app

## Requirements
- Python 3.10+

## Run Desktop App
```powershell
python budget_app.py
```

## Run Web App
```powershell
cd webapp
python -m http.server 8000
```

Then open:
`http://localhost:8000`

## Data Files
- `budget_data.json`: desktop app database
- optional exported CSV files from the desktop app Export button

## Notes
- `.gitignore` excludes local environment files and `budget_data.json`.
- This project is local-first and does not send data anywhere.
