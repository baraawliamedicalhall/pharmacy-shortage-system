# POS System Rules

These rules govern all code changes to the Point of Sale (POS) system.

## Architecture

The POS is a **single-page terminal** at `/pos` designed for high-speed pharmacy counter use with keyboard-first workflow.

### File Map
| Purpose | File |
|---------|------|
| POS Terminal UI | `app/pos/page.tsx` |
| Medicine search API | `app/api/pos/medicines/route.ts` |
| Sales API (GET list, POST create) | `app/api/pos/sales/route.ts` |
| Sale detail API (GET, PUT edit) | `app/api/pos/sales/[id]/route.ts` |
| Register drawer | `components/PosRegisterDrawer.tsx` |
| Receipt print modal | `components/ThermalReceiptModal.tsx` |
| Admin sale edit modal | `components/SaleEditModal.tsx` |
| Toast notifications | `components/Toast.tsx` |
| Date utilities (UTC+6) | `lib/date-utils.ts` |

### Database Models
- `Sale` — header record (invoice, customer, totals, payment method)
- `SaleItem` — line items (medicine, quantity, unit, price, total)
- SaleItem cascade-deletes when parent Sale is deleted

## Critical Rules

### Payment Method Enum
The Prisma `PaymentMethod` enum has exactly **4 values**: `CASH`, `BKASH`, `BANK`, `CREDIT`.
- **NEVER** use `CARD` — it does not exist in the enum and will crash at runtime.
- The POS UI currently uses 3 of these: `CASH`, `BKASH`, `BANK`.
- The UI label for `BANK` is displayed as **"Card/Bank"** to the user.

### Unit Types
SaleItem `unit` is a free-text string field. The POS uses exactly 4 values:
- `Tablet` — individual piece/unit (displayed as "Piece" in UI)
- `Strip` — a strip of tablets
- `Box` — full box
- `Bottle` — syrups, drops, suspensions

### Pricing Hierarchy
Medicine pricing has 3 tiers from the `Medicine` model:
- `mrp` — per-unit (tablet/capsule) price
- `stripPrice` — per-strip price
- `boxPrice` — per-box price
- `tradePrice` — wholesale cost (MRP × 0.88)
When switching units in the cart, use the matching price field. If the field is null, fallback: `stripPrice = mrp × 10`, `boxPrice = mrp × 100`.

### Keyboard Shortcuts
The POS has global keyboard shortcuts:
- **F1** — Focus the search bar
- **F2** — Complete sale (checkout)
- **Enter** — Select highlighted search result / close receipt modal
- **Escape** — Close dropdowns, modals, receipt
- **↑↓ Arrow keys** — Navigate search dropdown results

The F2 shortcut uses a `useRef` pattern to avoid stale closures. **NEVER** add `handleCheckout` directly to the `useEffect` dependency array — always use the ref pattern:
```tsx
const handleCheckoutRef = useRef<(() => void) | null>(null)
useEffect(() => { handleCheckoutRef.current = handleCheckout }) // no deps — update every render
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'F2') { e.preventDefault(); handleCheckoutRef.current?.() }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, []) // empty deps — register once
```

### Search Behavior
- Debounce: **120ms** (not longer — speed is critical for counter use)
- Uses `AbortController` to cancel stale in-flight requests
- API performs **two-phase parallel search**: `startsWith` (fast) + `contains` (fallback) via `Promise.all`
- Results are **relevance-scored**: exact match (100) > starts-with (50) > contains (20) > generic name (5)
- Multi-word queries supported: `"napa 500"` filters by brand + strength
- API uses lightweight `select` (not `include`) to minimize payload

### Date Handling
- Use `getLocalDateString()` from `lib/date-utils.ts` for all date comparisons
- **NEVER** use `new Date().toISOString().slice(0, 10)` — this returns UTC which is wrong for Bangladesh timezone (UTC+6). Late night sales (12AM–6AM) would get yesterday's date.
- The `saleDate` field stores `YYYY-MM-DD` as a local-timezone string.

### Access Control
- **All POS API routes** require authentication via `getCurrentUser()`
- Sale editing (`PUT /api/pos/sales/[id]`) is **ADMIN-only** — checked via `dbUser.role !== 'ADMIN'`
- The Register Drawer shows the **Edit** button only when `isAdmin={true}`
- Staff (EMPLOYEE role) can create sales and reprint receipts but cannot edit completed sales

### Cart State
The cart is local React state (`useState<CartItem[]>`) — not persisted to a database.
- New items are prepended (newest at top): `setCart([newItem, ...cart])`
- If the same medicine + unit combo already exists, increment quantity instead of adding a duplicate
- All money calculations must use `Math.round(value * 100) / 100` to avoid floating-point drift
- `total = unitPrice × quantity` (line-level discount is stored but not currently surfaced in UI)

### Invoice Numbers
Generated server-side in `POST /api/pos/sales` with format: `POS-YYYYMMDD-NNN`
- Sequential within each day, zero-padded to 3 digits
- **NEVER** generate invoice numbers client-side

### Receipt / Print
- The `ThermalReceiptModal` is designed for thermal 58mm/80mm receipt printers
- Print uses `@media print` CSS rules defined in `globals.css`
- Elements with class `no-print` are hidden during printing
- The modal supports **Enter** key to close (next customer flow) and **Escape** to dismiss

## Styling Conventions
- Dark theme: `slate-950` background, `slate-900` panels, `slate-800` borders
- Accent colors: `sky-400/500/600` for primary, `emerald-400` for money/totals, `amber` for warnings/edit
- All interactive elements need `cursor-pointer`
- Use `font-mono` for all money values, quantities, and invoice numbers
- Taka symbol: use HTML entity `&#x09F3;` (৳) — not the raw Unicode character in JSX
- Gradients for premium feel: `bg-gradient-to-r from-emerald-600 to-emerald-500` on CTA buttons
- Micro-animations: `active:scale-[0.98]` on buttons, `animate-pulse` on status indicators
