# TripPool Backend Deployment Guide (cPanel / Shared Hosting)

This backend is designed for high-performance, lightweight execution on standard shared hosting (e.g. cPanel, Hostinger, Namecheap, Bluehost, or any Linux server running Apache/Nginx + PHP 7.4+ and MySQL).

## 1. Database Setup (cPanel phpMyAdmin)
1. Log in to your **cPanel** dashboard.
2. Go to **MySQL® Databases**:
   - Create a new database, e.g., `yourusername_trippool`.
   - Create a new user, e.g., `yourusername_tripusr`, with a secure password.
   - Assign the user to the database with **ALL PRIVILEGES**.
3. Open **phpMyAdmin**:
   - Select your newly created database.
   - Click on the **Import** tab.
   - Upload `schema.sql` (located in the root directory or inside `backend/schema.sql`).
   - Click **Go**. This creates all tables, foreign keys, indexes, and initial demo data.

## 2. Deploying PHP Files
1. In cPanel **File Manager**, navigate to `public_html/` (or a subdirectory like `public_html/trippool/`).
2. Upload the contents of the `backend/` folder:
   - `db.php`
   - `.htaccess`
   - `api/members.php`
   - `api/deposits.php`
   - `api/expenses.php`
   - `api/settlement.php`
3. Edit `db.php` to set your MySQL credentials:
   ```php
   $dbHost = 'localhost';
   $dbName = 'yourusername_trippool';
   $dbUser = 'yourusername_tripusr';
   $dbPass = 'YourSecurePasswordHere';
   ```

## 3. Connecting the React Frontend
In the TripPool web app:
1. Tap the **Sync / Cloud** button in the header.
2. Enter your live API URL (e.g., `https://yourdomain.com/trippool/api` or `https://yourdomain.com/api`).
3. Tap **Test Connection & Sync**. The offline queue will immediately push all mountain road receipts and sync with your MySQL database!

## 4. API Endpoints Reference
| Endpoint | Method | Description |
|---|---|---|
| `/api/members.php?trip_id=1` | GET | List trip members with total deposited and spent |
| `/api/members.php` | POST | Add or update a member `{ name, phone, notes, is_leader }` |
| `/api/deposits.php?trip_id=1` | GET | List rolling deposits and pool collection totals |
| `/api/deposits.php` | POST | Record deposit `{ member_id, amount, payment_method, notes }` |
| `/api/expenses.php?trip_id=1` | GET | List expenses with payer and split participants |
| `/api/expenses.php` | POST | Record expense `{ amount, category, payer_type, payer_member_id, split_type, split_members, description }` |
| `/api/settlement.php?trip_id=1` | GET | Live pool cash balance, debt reconciliation, and WhatsApp copy text |
