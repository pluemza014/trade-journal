# 📈 Trade Journal — Localhost

A fully configurable trading journal that runs locally in your browser. No accounts, no subscriptions, no data leaves your computer.

---

## Quick Start

### Option A — Just open the HTML file (easiest)
Double-click `index.html` to open directly in your browser.
> **Note:** Some browsers restrict localStorage when opening files directly. If data doesn't save, use Option B.

### Option B — Run the local server (recommended)
Requires [Node.js](https://nodejs.org) (any version 14+).

```bash
# In the trade-journal folder:
node server.js
```

Your browser will open automatically at **http://localhost:3000**

To stop: press `Ctrl+C` in the terminal.

---

## Features

| Feature | Details |
|---|---|
| **Dashboard** | Equity curve, monthly P&L, win/loss donut, setup performance |
| **Journal** | Full trade log — filter by tag, edit, delete |
| **Rules** | Discipline score, compliance tracker, rules vs win rate |
| **Settings** | Account size, currency, instruments, rules, tags |
| **Export / Import** | JSON backup and restore |

## What you can configure

- **Account size & currency** (USD, EUR, GBP)
- **Risk per trade** (%) and default R:R target
- **Instruments / symbols** — add any forex pair, stock, future, crypto
- **Trading rules** — your personal checklist, logged with every trade
- **Setup tags** — Breakout, Reversal, Trend, etc. — add your own

## Data storage

All data is stored in your browser's `localStorage`. It persists between sessions as long as you use the same browser.

To back up: **Settings → Export JSON**
To restore: **Settings → Import JSON**

---

## Customisation

The entire app is one HTML file (`index.html`). Open it in any text editor to:
- Change the colour scheme (edit CSS variables at the top of `<style>`)
- Add new fields to the trade form
- Change default instruments or rules (edit `DEFAULT_DATA` in the script)
