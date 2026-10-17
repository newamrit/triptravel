# TripPool Nepal - cPanel Deployment & Production Guide

This guide provides step-by-step instructions for deploying the **TripPool** web application on **cPanel** (Apache Web Server) with hardened web security, single-page application (SPA) routing, and Progressive Web App (PWA) installation.

---

## 📋 1. Prerequisites & Build Outputs

Before deploying, run the production build command on your machine or CI/CD pipeline:

```bash
npm run build
```

This compiles the project and generates the production distribution folder at `dist/`:

| Output File / Folder | Description |
| :--- | :--- |
| `dist/index.html` | Production HTML entry point with Google Fonts & PWA meta tags |
| `dist/.htaccess` | Hardened Apache web server configuration (HTTPS force, SPA routing, security headers) |
| `dist/sw.js` | Service worker for offline PWA caching |
| `dist/manifest.webmanifest` | Web App Manifest defining standalone Android/iOS app identity |
| `dist/assets/*` | Minified CSS and JavaScript bundles |
| `dist/pwa-*.png` / `icon.svg` | App icons (192px, 512px, 512px maskable, 180px Apple touch) |

---

## 🚀 2. cPanel Deployment Steps

### Step 1: Log in to cPanel
1. Access your cPanel control panel (e.g., `https://your-domain.com:2083`).
2. Open **File Manager** under the *Files* section.

### Step 2: Enable Hidden Files
1. Click **Settings** in the top-right corner of cPanel File Manager.
2. Check **"Show Hidden Files (dotfiles)"** and click **Save**. *(Critical so `.htaccess` is visible).*

### Step 3: Upload Build Artifacts
1. Navigate to your target directory:
   - For root domain hosting: `public_html/`
   - For subdirectory hosting (e.g., `https://your-domain.com/trippool/`): `public_html/trippool/`
2. Compress the contents inside your local `dist/` folder into a `.zip` file (e.g. `dist.zip`).
3. Upload `dist.zip` to cPanel File Manager.
4. Extract `dist.zip` directly into `public_html/` (or your subdirectory).
5. Delete `dist.zip` after extraction.

### Step 4: Verify SSL / TLS Certificate
1. In cPanel, navigate to **SSL/TLS Status** or **AutoSSL**.
2. Run AutoSSL to generate a free Let's Encrypt / cPanel SSL certificate for your domain.
3. The included `.htaccess` file automatically redirects all HTTP connections to HTTPS.

---

## 🛡️ 3. Security & Apache `.htaccess` Configuration

The application includes an optimized `.htaccess` file configured with modern security rules:

### A. Automatic HTTPS Enforcement
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

### B. Single-Page Application (SPA) Fallback
Directs direct URL navigation and page refreshes to `index.html`, eliminating `404 Not Found` errors:
```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### C. Security Headers
```apache
<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' https: wss:;"
</IfModule>
```

### D. Protected Files & Directory Browsing
Disables directory indexes and blocks direct access to configuration and source files:
```apache
Options -Indexes

<FilesMatch "^\.">
  Order allow,deny
  Deny from all
</FilesMatch>

<FilesMatch "\.(env|json|config|md|ts|tsx|map)$">
  Order allow,deny
  Deny from all
</FilesMatch>
```

---

## 🔐 4. Cryptographic Authentication & Password Security

- **Algorithm**: PBKDF2-HMAC-SHA256 with **100,000 iterations** (NIST Standard).
- **Salt**: 16-byte cryptographically secure random salt generated via `window.crypto.getRandomValues`.
- **Timing Protection**: Bitwise constant-time string comparison (`verifyPassword`) to prevent timing side-channel attacks.
- **Anti-Brute Force Lockout**: 5 failed password attempts trigger an automatic **30-second security lockout**.
- **Session Timeout**: Active login sessions automatically expire after **24 hours**.

---

## 📱 5. PWA & Android App Installation

The app operates as an installable Progressive Web App (PWA):

- **Service Worker (`sw.js`)**: Caches static assets, fonts, and application routes for full offline usability in remote mountain areas.
- **In-App Mobile Prompt (`PWAInstallPopup.tsx`)**: Displays an **"Install TripPool App"** dialog when accessed from a mobile browser.
- **Desktop & TopBar Action**: Clickable **"Install App"** button appears in the top navigation bar when browser installation criteria are met.

---

## 🗄️ 6. Database Synchronization & API Backend

TripPool uses a local-first persistent database architecture with asynchronous sync capabilities:

- **Local Persistence**: Expenses, deposits, members, and trip profiles persist in browser IndexedDB/LocalStorage.
- **REST Sync Engine (`ApiSyncService`)**: Queues offline mutations in a FIFO sync queue (`trippool_sync_queue_v1`).
- **Connecting a MySQL / Node Backend**:
  1. Open **Backend Settings** in the app header (database icon).
  2. Enter your cPanel API base URL (e.g. `https://your-domain.com/api`).
  3. Toggle **Auto Sync** ON to automatically sync receipts and deposits with your database server.

---

## 🛠️ 7. Troubleshooting Common Deployment Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **404 Not Found on Page Refresh** | Missing `.htaccess` file | Enable "Show Hidden Files" in cPanel File Manager and ensure `.htaccess` is uploaded to `public_html/`. |
| **Broken CSS / JS Asset Paths** | Hardcoded root paths | The app is built with `base: './'` in `vite.config.ts`, so relative asset resolution works at any path. |
| **PWA Install Prompt Not Displayed** | HTTP connection | PWAs require valid HTTPS. Ensure SSL is enabled in cPanel. |
| **Camera Viewfinder Blank** | Missing HTTPS permission | Browsers restrict camera permissions (`navigator.mediaDevices.getUserMedia`) to secure HTTPS origins. |
