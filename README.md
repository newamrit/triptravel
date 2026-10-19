# TripPool Nepal — 100% Database-Driven Shared Travel Expense Manager

A full-stack, mobile-ready roadtrip float pool & settlement application built for shared cPanel PHP/MySQL hosting.

---

## 1. Required Files for Shared cPanel Hosting

When you run `npm run build`, all required production files are compiled into **`dist/`** (and mirrored in **`cpanel_public_html/`**):

```text
public_html/
├── .htaccess               # Apache routing & security rules (protects .env & .sql, routes /api/*)
├── index.html              # Compiled React SPA entry point
├── debug.php               # Interactive cPanel MySQL setup & diagnostic dashboard
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Network-first Service Worker (bypasses .php & /api/*)
├── registerSW.js           # Service Worker registration helper
├── icon.svg / *.png        # App icons
├── assets/                 # Minified JS & CSS bundles
└── api/                    # PHP PDO / MySQL REST API
    ├── db.php              # MySQL connection, self-healing schema & auto-seeding
    ├── login.php           # PBKDF2-SHA256 user login & registration
    ├── trips.php           # Trip profile GET/PUT endpoint
    ├── members.php         # Members CRUD endpoint (with cascade name updates)
    ├── deposits.php        # Pool deposits CRUD endpoint
    ├── expenses.php        # Expenses & Base64 receipt photo CRUD endpoint
    ├── sync.php            # Batch offline queue synchronization endpoint
    ├── health.php          # Live database health check endpoint
    └── debug.php           # Alias for /debug.php
```

And in the project root:
- **`database.sql`** — Complete MySQL schema + **Upper Mustang Overland 2026** dummy data for one-click import in **cPanel → phpMyAdmin**.

---

## 2. How to Host on Shared cPanel Hosting (Zero Errors)

### Step 1: Build the Production Bundle
```bash
npm run build
```

### Step 2: Upload Files to `public_html/`
Upload all contents of **`dist/`** (or **`cpanel_public_html/`**) into your cPanel **`public_html/`** folder (or any subdirectory such as `public_html/trippool/`).
- Make sure **"Show Hidden Files (dotfiles)"** is enabled in cPanel File Manager so **`.htaccess`** is uploaded.

### Step 3: Connect Your cPanel MySQL Database
1. In **cPanel → MySQL Database Wizard**, create a database and user with **ALL PRIVILEGES**.
2. **(Optional)** Import **`database.sql`** via **cPanel → phpMyAdmin** *(or let `api/db.php` automatically create and seed all 7 tables on first connection)*.
3. Visit **`https://yourdomain.com/debug.php`** in your browser and enter your MySQL Database Name, Username, and Password in the setup form — or edit `$db_host`, `$db_name`, `$db_user`, and `$db_pass` at the top of **`public_html/api/db.php`**.

---

## 3. Default Login Accounts (`database.sql`)

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Trip Leader** | Amrit Timilsina | `amrit.timilsinaa@gmail.com` | `Trip@2026` |
| **Trip Leader** | Amrit Timilsina | `leader@trippool.app` | `Trip@2026` |
| **Member** | Bikash Thapa | `bikash@trippool.app` | `Trip@2026` |
| **Member** | Saurav Joshi | `saurav@trippool.app` | `Trip@2026` |
| **Member** | Ayush Shrestha | `ayush@trippool.app` | `Trip@2026` |
| **Member** | Prashant Karki | `prashant@trippool.app` | `Trip@2026` |
