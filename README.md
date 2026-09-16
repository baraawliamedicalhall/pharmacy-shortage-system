# Pharmacy Short - Local Medicine Shortage Management System

A production-ready, mobile-first **Pharmacy Medicine Shortage Management System** designed for physical pharmacies operating on a **local Wi-Fi network without Internet access**.

The system replaces handwritten paper shortage slips with a 5-to-10 second mobile shortage reporting interface for pharmacy staff, alongside an administrative consolidation and printable report dashboard.

---

## 1. System Architecture

```text
                  Pharmacy Wi-Fi Router (No Internet Required)
                                      |
        +-----------------------------+-----------------------------+
        |                             |                             |
  Employee Phone 1              Employee Phone 2              Employee Phone 3
  (Android / iOS PWA)           (Android / iOS PWA)           (Android / iOS PWA)
        |                             |                             |
        +-----------------------------+-----------------------------+
                                      |  (HTTP requests over LAN)
                                      v
                         Pharmacy Server PC (Windows)
                         +--------------------------+
                         | Next.js 16 (App Router)  |
                         | TypeScript / React 19    |
                         | Tailwind CSS / Jose JWT  |
                         +--------------------------+
                                      |
                                      v
                                  Prisma ORM
                                      |
                                      v
                            Local SQLite Database
                              (`prisma/dev.db`)
```

> **Zero Cloud Dependency:** The application does not depend on cloud databases, Firebase, Supabase, external APIs, WhatsApp, Telegram, or internet authentication. The SQLite database resides exclusively on the local pharmacy server.

---

## 2. Key Features

### 📱 Employee Mobile Experience (5–10 Seconds Input)
- **Instant Search:** High-performance search indexing brand names, generic names, strengths, manufacturers, and spelling variations (e.g. `napa`, `nappa`, `napa 500`, `seclo 20`, `square seclo`).
- **1-Tap Frequently Used Shortcuts:** Quick chips for high-demand medicines (`[Napa 500]`, `[Seclo 20]`, `[Monas 10]`, `[DP 5]`, etc.).
- **Optional Quantity:** Staff can submit shortage reports with or without quantity (Box, Strip, Tablet, Capsule, Bottle).
- **Today's My Reports:** Staff can view all medicines they submitted today with timestamps.
- **Undo / Correction:** Staff can immediately remove or correct accidental submissions.
- **Immediate Focus Reset:** Submitting a report shows a confirmation toast and immediately returns focus to the search bar for the next medicine.

### 🛡️ Admin Dashboard & Duplicate Consolidation
- **Automatic Duplicate Merging:** If multiple employees report the same medicine (e.g. Napa 500 reported by Rahim, Karim, and Hasan), the admin sees **one consolidated entry** with total report count, total requested quantity, and reporting employees list.
- **Drill-Down Inspection:** Click any medicine to inspect individual employee reports, timestamps, and notes.
- **Bulk Status Actions:** 1-click "Mark All Reviewed" or "Mark as Ordered".
- **Employee Activity Breakdown:** Real-time visibility into which staff members are submitting shortages today.
- **Historical Reporting:** Filter shortages by single date or date range, with ranking of most frequently short medicines.
- **Print Layout (A4 Optimized):** Clean, professional shortage report with Pharmacy header, numbered table, total counts, and "Prepared by / Approved by" signature lines for ordering.
- **Data Export:** Instant CSV export for today's list, filtered reports, or historical views.

### 📦 Medicine Master & CSV Import
- Full catalog management: Brand name, generic, strength, dosage form, manufacturer, packaging, purchase unit, retail unit, search keywords, and barcode.
- **CSV Bulk Import:** Upload medicine lists with pre-validation dry-run, error reporting, and automatic manufacturer creation.

### 💾 Backup & System Security
- **1-Click Database Backup:** Creates timestamped SQLite backups in `backup/pharmacy-YYYY-MM-DD-HHmmss.db`.
- **Offline QR Code Generator:** Server detects its local LAN IP address and generates a QR code on `/admin/settings` so staff can scan and connect their phones in seconds.
- **Brute-Force Protection:** In-memory rate limiting on authentication endpoints.
- **Audit Logging:** Logs admin actions (logins, backups, medicine edits, CSV imports, shortage reviews).

---

## 3. Technology Stack

- **Framework:** Next.js 16.3 (App Router, Turbopack)
- **Frontend:** React 19, Tailwind CSS v4, Lucide Icons
- **Language:** TypeScript 5 (Strict Mode)
- **Database:** SQLite (local file)
- **ORM:** Prisma 6.4
- **Authentication:** Stateless JWT Sessions (`jose`) + `bcryptjs` password hashing + HttpOnly cookies
- **Validation:** Zod schemas
- **CSV Engine:** PapaParse
- **PWA:** Web App Manifest + Service Worker offline UI caching + QR code generation

---

## 4. Default Demo Accounts

The database is seeded with demonstration data:

| Role | Employee ID / Username | Password / PIN | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `ADMIN` | `admin123` | Full administrative access |
| **Staff Member** | `EMP001` | `1234` | Rahim Ahmed (Staff) |
| **Staff Member** | `EMP002` | `1234` | Karim Uddin (Staff) |
| **Staff Member** | `EMP003` | `1234` | Hasan Mahmud (Staff) |
| **Staff Member** | `EMP004` | `1234` | Jamal Hossain (Staff) |

*Note: Demo data is provided for testing and demonstration purposes. In production, change default passwords and add your pharmacy's actual staff members.*

---

## 5. Local Windows Setup & Deployment Guide

Follow these steps to run the application on the local pharmacy Windows PC:

### Step 1: Install Node.js
1. Download **Node.js LTS (v20 or newer)** from [nodejs.org](https://nodejs.org).
2. Run the installer and ensure "Add to PATH" is checked.

### Step 2: Install Dependencies
Open PowerShell in the project directory:

```powershell
cd "D:\SaaS Project\bmh_auto_order"
npm install
```

### Step 3: Configure Environment Variables
Create or verify `.env` in the root folder:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="pharmacy-local-secret-key-salt-9823471029384710293847"
COOKIE_SECURE="false"
PORT=3000
```

*(Setting `COOKIE_SECURE="false"` is required because local pharmacy Wi-Fi operates over HTTP without SSL).*

### Step 4: Initialize SQLite Database & Seed Demo Data
Run Prisma migrations and the seed script:

```powershell
npx prisma db push
npm run prisma db seed  # or: npx prisma db seed
```

### Step 5: Build the Production Application
Compile the optimized Next.js production build:

```powershell
npm run build
```

### Step 6: Start the Production Server
Start the local server:

```powershell
npm run start
```
The server will start listening on port `3000`.

---

## 6. Windows Firewall & Local Network Configuration

To allow employee phones connected to the same Wi-Fi router to access the server:

### 1. Allow Port 3000 Through Windows Firewall
Open **PowerShell as Administrator** and run:

```powershell
New-NetFirewallRule -DisplayName "Pharmacy Shortage System (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 2. Find Your Server's Local IP Address
In PowerShell, run:

```powershell
ipconfig
```
Look for `IPv4 Address` under your active Wi-Fi or Ethernet adapter (e.g. `192.168.1.100`).

Alternatively, log in as Admin on the PC, go to:
```text
http://localhost:3000/admin/settings
```
The **System & Backup** page displays your exact local IP address and generates a QR code.

### 3. Recommended: Reserve a Static IP on Your Router
To prevent the server's IP address from changing when the router restarts:
1. Open your router's administration page (usually `192.168.1.1`).
2. Go to **DHCP Reservation** or **Static IP Binding**.
3. Select your Pharmacy Server PC's MAC address and assign it a permanent IP (e.g. `192.168.1.100`).

---

## 7. Connecting Android / Mobile Phones

1. Connect the employee's phone to the **Pharmacy Wi-Fi**.
2. Open Chrome (or any mobile browser).
3. Type the server URL, for example:
   ```text
   http://192.168.1.100:3000
   ```
   *(Or simply scan the QR code from `/admin/settings`)*.
4. **Install as PWA (Add to Home Screen):**
   - Tap the **"Install"** button on the banner at the top of the screen.
   - Or tap the browser menu (⋮) → **"Add to Home screen"** / **"Install app"**.
   - An app icon named **"Pharmacy Short"** will appear on the phone's home screen for 1-tap launching.

---

## 8. Backup & Data Maintenance

### Automated One-Click Backup
1. Log in to `/admin/settings`.
2. Click **"Backup Database"**.
3. A timestamped backup is saved to the `backup/` folder (e.g. `backup/pharmacy-2026-09-17-025733.db`).
4. Click **Download** to save a copy directly to your PC or USB drive.

### Manual Backup Procedure
You can back up the database at any time using PowerShell or Command Prompt without stopping the server:

```powershell
copy "prisma\dev.db" "backup\pharmacy-manual-backup.db"
```

To restore from a backup:
1. Stop the server (`Ctrl + C`).
2. Replace `prisma/dev.db` with your desired backup file.
3. Restart the server (`npm start`).

---

## 9. Medicine Master CSV Import Format

Admin can import medicines in bulk via `/admin/medicines` → **"Import CSV"**.

### Sample CSV Structure:
```csv
brand_name,generic_name,strength,dosage_form,manufacturer,pack_description,purchase_unit,retail_unit,search_keywords
Napa,Paracetamol,500 mg,Tablet,Beximco Pharmaceuticals Ltd.,50x10 blister pack,Box,Tablet,fever pain nappa
Seclo,Omeprazole,20 mg,Capsule,Square Pharmaceuticals PLC,6x10 blister pack,Box,Capsule,gastric heartburn ulcer
Monas,Montelukast Sodium,10 mg,Tablet,The ACME Laboratories Ltd.,3x10 blister pack,Box,Tablet,asthma allergy
```

- If a manufacturer in the CSV does not exist, the system automatically registers them.
- Existing medicines with matching Brand, Strength, and Manufacturer are updated.
- Use the **"Validate CSV"** button before committing to preview row counts and detect formatting errors.

---

## 10. Automated Test Suite

To run the automated integration tests:

```powershell
npx tsx scripts/test-system.ts
```

Tests cover:
- Password and PIN hashing / verification
- JWT session creation & validation
- In-memory rate limiting
- Medicine search with spelling variations
- Duplicate shortage consolidation logic
- Database backup creation & verification
- Local network IP discovery
- CSV parsing and validation
