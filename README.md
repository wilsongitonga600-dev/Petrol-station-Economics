# Shift Reconciliation Tool

A single-file web app for reconciling end-of-shift fuel sales against money collected at a Shell petrol station. Built to replace a manual, paper-based reconciliation process.

No installation, no server, no dependencies — just open the HTML file in a browser.

## What it does

At the end of a shift, the tool:

1. Calculates fuel sales from pump meter readings across all 6 nozzles (2 sides each for Diesel, V-Power, and Unleaded)
2. Totals money collected across M-Pesa, cash drops, card/PDQ, Shell Card, and invoices
3. Compares the two totals and shows the variance — balanced, over, or short
4. Saves the shift to a running history stored on the device

## Features

- **Pump readings** — opening/closing meter readings per nozzle, with live litres and subtotal calculations
- **Money collected** — M-Pesa (auto-computed from till open/close), cash drop, card/PDQ, Shell Card, and invoices
- **Variance summary** — color-coded readout (balanced / over / short) with sound effects and a confetti celebration on a balanced shift
- **Shift history** — expandable list of past shifts with per-fuel breakdowns and delete support
- **Weekly overview** — running total of shifts, balances, shortfalls, and excess for the current week
- **Reports tab** — monthly overview plus bar charts for fuel sales and payment channel breakdowns
- Works fully offline once downloaded; all data is stored locally in the browser (`localStorage`)

## Usage

1. Download `reconciliation.html`
2. Open it in any modern browser (Chrome, Safari, etc.) — on desktop or mobile
3. Enter the date, shift, fuel prices, and meter readings
4. Enter money collected across each payment channel
5. Review the variance, then tap **Save shift**
6. Check the **Reports** tab anytime for trends across the week or month

To share with teammates, just send the `reconciliation.html` file directly (e.g. via WhatsApp). Each person's shift history is stored locally on their own device/browser.

## Tech stack

Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step, no external libraries. Charts are hand-drawn on `<canvas>` and sound effects use the Web Audio API, so everything works without an internet connection.

## Notes

- Fuel sales are calculated as `(closing meter reading − opening meter reading) × price per litre`, summed across both sides of each fuel type
- Variance is `total money collected − total fuel sales`
- History is capped at 200 saved shifts per device
- Data lives in the browser's local storage — clearing browser data or switching devices will not carry history over

## Author

Wilson Gitonga
