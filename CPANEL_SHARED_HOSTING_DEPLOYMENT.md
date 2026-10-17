# TripPool: 100% Shared Hosting Deployment (No Node.js Required on Server)

Your shared hosting (cPanel, Hostinger, Namecheap, Bluehost, GoDaddy, etc.) **does not need to run Node.js**. 

Here is how the architecture works:
1. **Frontend (React)**: React is pre-compiled into static production files (`index.html`, JavaScript, and CSS). Your shared hosting web server (Apache or LiteSpeed) serves these static files just like regular HTML/CSS files.
2. **Backend (PHP 7.4 / 8.0+)**: Pure, lightweight PHP REST endpoints (`api/*.php`) handle requests using PDO prepared statements.
3. **Database (MySQL)**: Standard MySQL database created via cPanel phpMyAdmin.

---

## Ready-to-Upload Folder Structure
The repository includes a pre-packaged folder: `/cpanel_public_html/`.

When you open your cPanel **File Manager** and navigate into `public_html/`, your directory layout should look like this:

```
public_html/
├── index.html            <-- Pre-compiled React entry point
├── .htaccess             <-- Routing & SPA configuration
├── schema.sql            <-- Database tables & seed data
├── assets/               <-- Static CSS & JavaScript files
│   ├── index-*.js
│   └── index-*.css
└── api/                  <-- Pure PHP REST backend
    ├── .htaccess         <-- CORS & JSON headers
    ├── db.php            <-- PDO MySQL database helper
    ├── members.php       <-- Member management endpoint
    ├── deposits.php      <-- Float fund collection ledger
    ├── expenses.php      <-- Transactional expense & split logger
    └── settlement.php    <-- Balance & debt reconciliation engine
```

---

## Step-by-Step Installation Guide

### Step 1: Create Your MySQL Database in cPanel
1. In cPanel, open **MySQL® Databases**.
2. Create a new database, e.g., `trippool_db`.
3. Create a new database user, e.g., `trippool_user`, with a strong password.
4. Under **Add User to Database**, select your user and database, and grant **ALL PRIVILEGES**.

### Step 2: Import `schema.sql` via phpMyAdmin
1. In cPanel, click on **phpMyAdmin**.
2. Select your newly created database in the left sidebar.
3. Click the **Import** tab at the top.
4. Choose the `schema.sql` file (found in the root or inside `cpanel_public_html/`).
5. Click **Go**. All tables (`trips`, `members`, `deposits`, `expenses`, `expense_splits`) and initial demo data will be created instantly.

### Step 3: Configure Database Credentials in `api/db.php`
Open `api/db.php` in the cPanel File Manager Code Editor and update lines 21–25:

```php
$dbHost = 'localhost';
$dbName = 'yourcpaneluser_trippool_db';   // Your cPanel database name
$dbUser = 'yourcpaneluser_trippool_user'; // Your cPanel database user
$dbPass = 'YourStrongPasswordHere!';     // Your database password
$dbPort = '3306';
```

### Step 4: Upload the Files to `public_html/`
1. In cPanel **File Manager**, open `public_html/` (or create a subdirectory like `public_html/trippool/`).
2. Upload the contents of `cpanel_public_html/` (`index.html`, `assets/`, `api/`, `.htaccess`).

---

## How It Works in Your Browser
- Visit `https://yourdomain.com/` (or `https://yourdomain.com/trippool/`).
- The static React app loads instantly into the browser and works offline in remote mountain areas.
- When connected, the app makes standard `fetch('./api/...')` calls directly to your PHP scripts.
- **Zero Node.js processes, daemons, or background workers are required on your hosting server.**
