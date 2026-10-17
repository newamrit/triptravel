# TripPool Nepal - Group Travel Expense & Float Fund Manager

TripPool is a mobile-first Progressive Web Application (PWA) designed for group roadtrips, mountain expeditions, and overland travel. It simplifies float fund pool deposits, expense receipt logging with live camera capture, and automated debt settlement calculations.

---

## ✨ Features

- 🔐 **Encrypted Authentication**: PBKDF2-HMAC-SHA256 (100k iterations) password security with anti-brute force lockout and 24h session expiration.
- 💵 **Live Pool Cash Balance**: Auto-calculates remaining float cash, total deposits, and category expense distribution.
- 📸 **Receipt Photo Capture**: Real-time camera viewfinder & file upload with client-side canvas image compression.
- ⚖️ **Smart Debt Engine**: Calculates optimal debt reconciliation (Pool Custodian vs Peer-to-Peer calculation modes).
- 📲 **Installable PWA**: Standalone mobile app installation with offline mountain mode support.
- 🛡️ **cPanel Hardened**: Includes `.htaccess` for Apache hosting with HTTPS enforcement, SPA route fallback, and security response headers.

---

## 🚀 Quick Start & Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript linter
npm run lint

# Build for production
npm run build
```

---

## 📄 cPanel Deployment Guide

For full cPanel deployment instructions, Apache security configurations, and database sync setup, view:

👉 **[cPanel Deployment Guide (CPANEL_DEPLOYMENT_GUIDE.md)](./CPANEL_DEPLOYMENT_GUIDE.md)**
