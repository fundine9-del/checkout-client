# Check Out — Customer Webapp

Browser version of the customer checkout flow (what the Flutter app does on
phones): open a checkout, **scan barcodes**, adjust quantities, and pay —
simulated — then get a receipt.

No sign-in needed. The app talks to the **checkout server** (Express + Supabase)
over the same `/api` endpoints as the Flutter scanner app.

## Run it

1. Start the checkout server on `:3000` (the Vite dev proxy forwards `/api` there):

   ```
   cd "..\..\checkout server"   # wherever the server lives
   npm run dev
   ```

2. Start this app:

   ```
   npm install
   npm run dev
   ```

   Then open the printed URL (likely http://localhost:5174 — 5173 is usually
   taken by the supermarket dashboard).

No `.env` is needed: the customer flow is anonymous.

## Scanning on devices

- **Phones (Chrome/Android, Edge)** — camera scanning via the `BarcodeDetector`
  API. You'll be asked for camera permission.
- **Desktop / other browsers** — the manual barcode entry field is always
  available as a fallback (same as the scanner app on Windows).

Camera scanning requires HTTPS (or `localhost`) in production.

## Flow

Home (open checks · new checkout) → Cart (quantities) → Scan → Pay → Receipt.

- **Home** — lists open checks so you can resume one; "New checkout" prompts
  for an optional customer name.
- **Scan** — live camera box with a manual input underneath; every scan adds
  the item and updates the running total.
- **Pay** — total, payment method (cash / card / mobile), simulated payment.
- **Receipt** — line items, total, method and time; "Back to home".

## Scripts

- `npm run dev` — Vite dev server with `/api` proxy to `:3000`
- `npm run build` — type-check (`tsc -b`) + production build
- `npm run lint` — ESLint
- `npm run preview` — preview the production build