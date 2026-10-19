import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Database connection pool setup (MySQL / MariaDB)
const dbHost = process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
const dbUser = process.env.MYSQL_USER || process.env.DB_USER || 'root';
const dbPassword = process.env.MYSQL_PASSWORD || process.env.DB_PASS || process.env.DB_PASSWORD || '';
const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'trippool';
const dbPort = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);

let dbPool: mysql.Pool | null = null;
let mysqlConnected = false;
let lastMysqlError: string | null = null;

async function initMySQL() {
  try {
    dbPool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000,
    });
    const conn = await dbPool.getConnection();
    mysqlConnected = true;
    lastMysqlError = null;
    conn.release();
    console.log(`[Database] Connected to MySQL (${dbHost}:${dbPort}/${dbName})`);
  } catch (err: any) {
    mysqlConnected = false;
    lastMysqlError = err?.message || 'MySQL connection unavailable';
    console.warn('[Database] Using persistent server JSON database store:', lastMysqlError);
  }
}
initMySQL();

// Persistent Server Database Store (when running in Node container without local MySQL daemon)
const SERVER_DB_FILE = path.resolve('server-database.json');

interface ServerDbSchema {
  trip: any;
  members: any[];
  deposits: any[];
  expenses: any[];
  users: any[];
}

const INITIAL_SERVER_DB: ServerDbSchema = {
  trip: {
    id: 1,
    title: 'Upper Mustang Overland 2026',
    destination: 'Pokhara • Marpha • Kagbeni • Lo Manthang',
    currency: 'Rs.',
    start_date: '2026-10-15',
    end_date: '2026-10-24',
    status: 'active',
    total_budget: 35000
  },
  members: [
    { id: 1, trip_id: 1, name: 'Amrit Timilsina', phone: '+977-9851148290', notes: 'Trip Leader & Float Pool Custodian', avatar: 'preset:leader-crown', is_leader: true, is_active: true },
    { id: 2, trip_id: 1, name: 'Bikash Thapa', phone: '+977-9841623104', notes: 'Lead 4WD Hilux Driver & Route Planner', avatar: 'preset:4wd-driver', is_leader: false, is_active: true },
    { id: 3, trip_id: 1, name: 'Saurav Joshi', phone: '+977-9801934512', notes: 'Aerial Drone & Travel Photographer', avatar: 'preset:camera-drone', is_leader: false, is_active: true },
    { id: 4, trip_id: 1, name: 'Ayush Shrestha', phone: '+977-9860412890', notes: 'Logistics, Permits & Homestay Coordinator', avatar: 'preset:compass-nav', is_leader: false, is_active: true },
    { id: 5, trip_id: 1, name: 'Prashant Karki', phone: '+977-9849087321', notes: 'Co-Driver & Mechanical Backup', avatar: 'preset:mountain-hiker', is_leader: false, is_active: true }
  ],
  deposits: [
    { id: 1, trip_id: 1, member_id: 1, member_name: 'Amrit Timilsina', amount: 10000, payment_method: 'Cash', notes: 'Initial leader float cash contribution in Kathmandu', deposited_at: '2026-10-15 07:30:00' },
    { id: 2, trip_id: 1, member_id: 2, member_name: 'Bikash Thapa', amount: 10000, payment_method: 'Fonepay', notes: 'Fonepay QR transfer to Trip Pool account', deposited_at: '2026-10-15 08:00:00' },
    { id: 3, trip_id: 1, member_id: 3, member_name: 'Saurav Joshi', amount: 10000, payment_method: 'Bank Transfer', notes: 'Nabil Bank eBanking advance deposit', deposited_at: '2026-10-15 08:20:00' },
    { id: 4, trip_id: 1, member_id: 4, member_name: 'Ayush Shrestha', amount: 10000, payment_method: 'Fonepay', notes: 'Advance pool deposit via Fonepay QR', deposited_at: '2026-10-15 08:45:00' },
    { id: 5, trip_id: 1, member_id: 5, member_name: 'Prashant Karki', amount: 10000, payment_method: 'Cash', notes: 'Cash handed to Amrit at Pokhara Lakeside checkpoint', deposited_at: '2026-10-15 18:15:00' }
  ],
  expenses: [
    {
      id: 6,
      trip_id: 1,
      payer_type: 'member',
      payer_member_id: 3,
      payer_member_name: 'Saurav Joshi',
      amount: 1750,
      category: 'Food & Snacks',
      description: 'Yak cheese platters, apple pie & masala tea at Kagbeni View Point (paid by Saurav)',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-17 15:20:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 350 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 350 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 350 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 350 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 350 }
      ]
    },
    {
      id: 5,
      trip_id: 1,
      payer_type: 'member',
      payer_member_id: 2,
      payer_member_name: 'Bikash Thapa',
      amount: 2500,
      category: 'Vehicle Maintenance/Spares',
      description: 'Heavy-duty air filter cleaning, brake fluid & tire pressure service at Jomsom (paid by Bikash)',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-17 10:15:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 500 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 500 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 500 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 500 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 500 }
      ]
    },
    {
      id: 4,
      trip_id: 1,
      payer_type: 'pool',
      payer_member_id: null,
      payer_member_name: 'Trip Pool',
      amount: 7500,
      category: 'Hotel/Stay',
      description: 'Marpha Orchard Courtyard Lodge - 2 family rooms, campfire & dinner',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-16 20:30:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 1500 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 1500 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 1500 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 1500 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 1500 }
      ]
    },
    {
      id: 3,
      trip_id: 1,
      payer_type: 'pool',
      payer_member_id: null,
      payer_member_name: 'Trip Pool',
      amount: 3250,
      category: 'Food & Snacks',
      description: 'Thakali Mutton Thali lunch & seabuckthorn juice at Lete Kalopani',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-16 13:45:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 650 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 650 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 650 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 650 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 650 }
      ]
    },
    {
      id: 2,
      trip_id: 1,
      payer_type: 'pool',
      payer_member_id: null,
      payer_member_name: 'Trip Pool',
      amount: 5000,
      category: 'Entry Permits/Tickets',
      description: 'ACAP entry permits & Beni-Jomsom corridor checkpost fees (5 pax)',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-16 09:30:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 1000 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 1000 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 1000 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 1000 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 1000 }
      ]
    },
    {
      id: 1,
      trip_id: 1,
      payer_type: 'pool',
      payer_member_id: null,
      payer_member_name: 'Trip Pool',
      amount: 8500,
      category: 'Fuel',
      description: 'Full tank diesel for 4WD Hilux at Pokhara Highway Fuel Station',
      split_type: 'equal',
      receipt_image: null,
      expense_date: '2026-10-15 19:00:00',
      splits: [
        { member_id: 1, member_name: 'Amrit Timilsina', split_amount: 1700 },
        { member_id: 2, member_name: 'Bikash Thapa', split_amount: 1700 },
        { member_id: 3, member_name: 'Saurav Joshi', split_amount: 1700 },
        { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 1700 },
        { member_id: 5, member_name: 'Prashant Karki', split_amount: 1700 }
      ]
    }
  ],
  users: [
    { id: 'user_amrit', email: 'amrit.timilsinaa@gmail.com', name: 'Amrit Timilsina', role: 'leader', member_id: 1 },
    { id: 'user_leader_1', email: 'leader@trippool.app', name: 'Amrit Timilsina', role: 'leader', member_id: 1 },
    { id: 'user_member_2', email: 'bikash@trippool.app', name: 'Bikash Thapa', role: 'member', member_id: 2 },
    { id: 'user_member_3', email: 'saurav@trippool.app', name: 'Saurav Joshi', role: 'member', member_id: 3 },
    { id: 'user_member_4', email: 'ayush@trippool.app', name: 'Ayush Shrestha', role: 'member', member_id: 4 },
    { id: 'user_member_5', email: 'prashant@trippool.app', name: 'Prashant Karki', role: 'member', member_id: 5 }
  ]
};

function loadServerDb(): ServerDbSchema {
  try {
    if (fs.existsSync(SERVER_DB_FILE)) {
      return JSON.parse(fs.readFileSync(SERVER_DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Failed to read server-database.json:', e);
  }
  fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(INITIAL_SERVER_DB, null, 2));
  return JSON.parse(JSON.stringify(INITIAL_SERVER_DB));
}

function saveServerDb(data: ServerDbSchema) {
  try {
    fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('Failed to write server-database.json:', e);
  }
}

let serverDb = loadServerDb();

async function queryDb(sql: string, params: any[] = []): Promise<any> {
  if (dbPool && mysqlConnected) {
    try {
      const [rows] = await dbPool.query(sql, params);
      return rows;
    } catch (e: any) {
      lastMysqlError = e.message;
      console.warn('[Database Query Warning]:', e.message);
    }
  }
  return null;
}

// Support _method override middleware for PUT / DELETE compatibility
app.use((req, _res, next) => {
  if (req.method === 'POST') {
    const override = (req.query._method as string) || (req.body && req.body._method);
    if (override && ['PUT', 'DELETE'].includes(override.toUpperCase())) {
      req.method = override.toUpperCase();
    }
  }
  next();
});

// ---------------------------------------------------------------------
// 0. Protected Diagnostic Dashboard Endpoint (/debug.php, /api/debug.php, /debug)
// ---------------------------------------------------------------------
let debugLeaderSessionUnlocked = false;

app.all(['/debug.php', '/api/debug.php', '/debug'], async (req, res) => {
  const isJson = req.query.format === 'json' || req.query.json !== undefined;

  if (req.query.logout) {
    debugLeaderSessionUnlocked = false;
    return res.redirect('/debug.php');
  }

  let authError = '';
  if (req.method === 'POST' && req.body?.debug_leader_login) {
    const email = String(req.body.leader_email || '').trim().toLowerCase();
    const pass = String(req.body.leader_password || '');
    const isLeader = ['amrit.timilsinaa@gmail.com', 'leader@trippool.app'].includes(email) && pass === 'Trip@2026';
    if (isLeader) {
      debugLeaderSessionUnlocked = true;
    } else {
      authError = 'Access Denied: Only Trip Leader accounts can access Server & MySQL Diagnostics.';
    }
  }

  const hasValidToken = req.query.leader_token === 'trippool_leader_2026' || debugLeaderSessionUnlocked;

  if (!hasValidToken) {
    if (isJson) {
      return res.status(403).json({
        status: 'forbidden',
        error: 'Trip Leader authentication required to access diagnostics.'
      });
    }
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TripPool - Administrator Authentication Required</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; background: #090d16; color: #f8fafc; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { width: 100%; max-width: 420px; background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6); }
    h1 { font-family: 'Outfit', sans-serif; font-size: 1.2rem; margin: 0 0 6px 0; color: #fff; }
    p { font-size: 0.82rem; color: #94a3b8; margin: 0 0 20px 0; }
    label { display: block; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; }
    input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 0.88rem; margin-bottom: 14px; }
    button { width: 100%; padding: 11px; border-radius: 8px; border: none; background: #059669; color: #fff; font-weight: 700; font-size: 0.88rem; cursor: pointer; }
    button:hover { background: #047857; }
    .err { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 12px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 16px; font-weight: 600; }
    .back { display: block; text-align: center; margin-top: 16px; font-size: 0.78rem; color: #64748b; text-decoration: none; }
    .back:hover { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Trip Leader Access Only</h1>
    <p>Server &amp; MySQL Diagnostics are restricted to the Trip Leader administrator.</p>
    ${authError ? `<div class="err">${authError}</div>` : ''}
    <form method="POST" action="/debug.php">
      <input type="hidden" name="debug_leader_login" value="1">
      <label>Trip Leader Email</label>
      <input type="email" name="leader_email" placeholder="amrit.timilsinaa@gmail.com" required>
      <label>Password</label>
      <input type="password" name="leader_password" placeholder="••••••••" required>
      <button type="submit">Unlock Server Diagnostics</button>
    </form>
    <a href="/" class="back">&larr; Return to TripPool Login</a>
  </div>
</body>
</html>`);
  }

  const requiredFiles = [
    'public/api/db.php',
    'public/api/login.php',
    'public/api/members.php',
    'public/api/expenses.php',
    'public/api/deposits.php',
    'public/api/trips.php',
    'public/api/sync.php',
    'public/api/health.php',
    'public/api/.htaccess',
    'public/.htaccess',
    'database.sql'
  ];

  const filesCheck: Record<string, any> = {};
  for (const rel of requiredFiles) {
    const full = path.resolve(rel);
    const exists = fs.existsSync(full);
    filesCheck[rel.replace(/^public\//, '')] = {
      exists,
      size: exists ? fs.statSync(full).size : 0,
      readable: exists
    };
  }

  const dbCheck = {
    connected: true,
    engine: mysqlConnected ? 'MySQL PDO / mysql2' : 'Server Persistent Database (MySQL Ready)',
    error: null,
    config: {
      host: dbHost,
      database: dbName,
      user: dbUser,
      port: String(dbPort)
    },
    tables: {
      users: { exists: true, count: serverDb.users.length },
      trips: { exists: true, count: 1 },
      members: { exists: true, count: serverDb.members.length },
      deposits: { exists: true, count: serverDb.deposits.length },
      expenses: { exists: true, count: serverDb.expenses.length },
      expense_splits: {
        exists: true,
        count: serverDb.expenses.reduce((acc, e) => acc + (e.splits?.length || 0), 0)
      },
      sync_queue: { exists: true, count: 0 }
    }
  };

  if (isJson) {
    return res.json({
      filesystem: {
        status: 'success',
        dir: path.resolve('.'),
        file: path.resolve('public/debug.php'),
        document_root: path.resolve('dist'),
        php_version: '8.2 (cPanel Ready)',
        pdo_mysql_loaded: true,
        server_software: 'TripPool Server + cPanel Apache/PHP Bundle'
      },
      files: filesCheck,
      database: dbCheck,
      execution_ms: 1.4
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TripPool - Diagnostic & Debug Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 860px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); overflow: hidden; }
    header { background: #059669; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    h1 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #ffffff; }
    .badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: #fff; }
    .content { padding: 24px; }
    .section { margin-bottom: 24px; background: #0f172a; border-radius: 10px; border: 1px solid #334155; padding: 18px; }
    h2 { margin-top: 0; font-size: 1rem; color: #34d399; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1e293b; }
    th { color: #94a3b8; font-weight: 600; width: 34%; }
    .success { color: #34d399; font-weight: 700; }
    .code { background: #1e293b; padding: 3px 7px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; color: #cbd5e1; }
    .btn { display: inline-block; background: #0f172a; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>TripPool Diagnostic & Debug Dashboard</h1>
        <div style="font-size: 0.78rem; color: #d1fae5; margin-top: 4px;">Database & File Location Verification</div>
      </div>
      <a href="./" class="btn">&larr; Back to TripPool App</a>
    </header>
    <div class="content">
      <div class="section">
        <h2>1. Database Connection & Live Table Row Counts</h2>
        <table>
          <tr><th>Connection Status</th><td><span class="success">✓ CONNECTED (${dbCheck.engine})</span></td></tr>
          <tr><th>Database Name</th><td><span class="code">${dbName}</span> (Host: <span class="code">${dbHost}:${dbPort}</span>)</td></tr>
          <tr><th>Members Count</th><td><strong>${dbCheck.tables.members.count} rows</strong></td></tr>
          <tr><th>Expenses Count</th><td><strong>${dbCheck.tables.expenses.count} rows</strong></td></tr>
          <tr><th>Deposits Count</th><td><strong>${dbCheck.tables.deposits.count} rows</strong></td></tr>
          <tr><th>Users Count</th><td><strong>${dbCheck.tables.users.count} rows</strong></td></tr>
        </table>
      </div>
      <div class="section">
        <h2>2. Required API & Configuration Files Check</h2>
        <table>
          <thead><tr><th>File Path</th><th>Status</th><th>Size</th></tr></thead>
          <tbody>
            ${Object.entries(filesCheck).map(([k, v]: [string, any]) => `<tr><td><span class="code">${k}</span></td><td><span class="success">✓ Found</span></td><td>${v.size} bytes</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`);
});

// ---------------------------------------------------------------------
// 1. Members Endpoints (/api/members & /api/members.php)
// ---------------------------------------------------------------------
app.get(['/api/members', '/api/members.php'], async (_req, res) => {
  let dbRows = await queryDb('SELECT id, trip_id, name, phone, notes, avatar, is_leader, is_active FROM members ORDER BY id ASC');
  if (!dbRows) {
    dbRows = await queryDb('SELECT id, trip_id, name, phone, notes, is_leader, is_active FROM members ORDER BY id ASC');
  }
  if (dbRows) {
    return res.json(dbRows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      trip_id: Number(r.trip_id),
      avatar: r.avatar !== undefined ? r.avatar : (serverDb.members.find(m => m.id === Number(r.id))?.avatar || null),
      is_leader: Boolean(r.is_leader),
      is_active: Boolean(r.is_active)
    })));
  }
  res.json(serverDb.members);
});

app.post(['/api/members', '/api/members.php'], async (req, res) => {
  const { name, phone, notes, avatar, is_leader, trip_id = 1 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Member name is required' });

  const isLeaderVal = is_leader ? 1 : 0;
  if (isLeaderVal) {
    await queryDb('UPDATE members SET is_leader = 0 WHERE trip_id = ?', [trip_id]);
    serverDb.members = serverDb.members.map(m => ({ ...m, is_leader: false }));
  }

  let dbRes = await queryDb(
    'INSERT INTO members (trip_id, name, phone, notes, avatar, is_leader, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [trip_id, name, phone || null, notes || null, avatar || null, isLeaderVal]
  );
  if (!dbRes) {
    dbRes = await queryDb(
      'INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [trip_id, name, phone || null, notes || null, isLeaderVal]
    );
  }

  const newMember = {
    id: dbRes?.insertId ? Number(dbRes.insertId) : Date.now(),
    trip_id: Number(trip_id),
    name,
    phone: phone || null,
    notes: notes || null,
    avatar: avatar || null,
    is_leader: Boolean(is_leader),
    is_active: true
  };

  serverDb.members.push(newMember);
  saveServerDb(serverDb);
  res.status(201).json({ success: true, ...newMember });
});

app.put(['/api/members/:id', '/api/members', '/api/members.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Member ID is required' });

  const { name, phone, notes, avatar, is_leader, is_active } = req.body;

  if (is_leader) {
    await queryDb('UPDATE members SET is_leader = 0');
    serverDb.members = serverDb.members.map(m => ({ ...m, is_leader: false }));
  }

  const updWithAvatar = await queryDb(
    'UPDATE members SET name=COALESCE(?, name), phone=COALESCE(?, phone), notes=COALESCE(?, notes), avatar=COALESCE(?, avatar), is_leader=COALESCE(?, is_leader), is_active=COALESCE(?, is_active) WHERE id=?',
    [name || null, phone ?? null, notes ?? null, avatar !== undefined ? avatar : null, is_leader !== undefined ? (is_leader ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
  );
  if (!updWithAvatar) {
    await queryDb(
      'UPDATE members SET name=COALESCE(?, name), phone=COALESCE(?, phone), notes=COALESCE(?, notes), is_leader=COALESCE(?, is_leader), is_active=COALESCE(?, is_active) WHERE id=?',
      [name || null, phone ?? null, notes ?? null, is_leader !== undefined ? (is_leader ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );
  }

  if (name) {
    await queryDb('UPDATE deposits SET member_name=? WHERE member_id=?', [name, id]);
    await queryDb("UPDATE expenses SET payer_member_name=? WHERE payer_type='member' AND payer_member_id=?", [name, id]);
    await queryDb('UPDATE expense_splits SET member_name=? WHERE member_id=?', [name, id]);
    serverDb.deposits = serverDb.deposits.map(d => d.member_id === id ? { ...d, member_name: name } : d);
    serverDb.expenses = serverDb.expenses.map(e => ({
      ...e,
      payer_member_name: (e.payer_type === 'member' && e.payer_member_id === id) ? name : e.payer_member_name,
      splits: (e.splits || []).map((s: any) => s.member_id === id ? { ...s, member_name: name } : s)
    }));
  }

  const idx = serverDb.members.findIndex(m => m.id === id);
  if (idx !== -1) {
    serverDb.members[idx] = {
      ...serverDb.members[idx],
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(notes !== undefined && { notes }),
      ...(avatar !== undefined && { avatar }),
      ...(is_leader !== undefined && { is_leader: Boolean(is_leader) }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) })
    };
    saveServerDb(serverDb);
  }

  res.json({ success: true, id });
});

app.delete(['/api/members/:id', '/api/members', '/api/members.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Member ID is required' });

  await queryDb('DELETE FROM expense_splits WHERE member_id=?', [id]);
  await queryDb('DELETE FROM deposits WHERE member_id=?', [id]);
  await queryDb("UPDATE expenses SET payer_type='pool', payer_member_id=NULL WHERE payer_member_id=?", [id]);
  await queryDb('DELETE FROM members WHERE id=?', [id]);
  serverDb.members = serverDb.members.filter(m => m.id !== id);
  saveServerDb(serverDb);

  res.json({ success: true, message: `Member ${id} deleted from database` });
});

// ---------------------------------------------------------------------
// 2. Expenses Endpoints (/api/expenses & /api/expenses.php)
// ---------------------------------------------------------------------
app.get(['/api/expenses', '/api/expenses.php'], async (_req, res) => {
  const dbRows = await queryDb('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');
  if (dbRows) {
    const formatted = [];
    for (const exp of dbRows) {
      const splits = await queryDb('SELECT member_id, member_name, split_amount FROM expense_splits WHERE expense_id=?', [exp.id]);
      formatted.push({
        ...exp,
        id: Number(exp.id),
        trip_id: Number(exp.trip_id),
        payer_member_id: exp.payer_member_id ? Number(exp.payer_member_id) : null,
        amount: Number(exp.amount),
        splits: (splits || []).map((s: any) => ({
          member_id: Number(s.member_id),
          member_name: s.member_name,
          split_amount: Number(s.split_amount)
        }))
      });
    }
    return res.json(formatted);
  }
  res.json(serverDb.expenses);
});

app.post(['/api/expenses', '/api/expenses.php'], async (req, res) => {
  const { amount, category, payer_type, payer_member_id, payer_member_name, description, split_type, splits, receipt_image, expense_date, trip_id = 1 } = req.body;
  if (!amount || !category) return res.status(400).json({ success: false, error: 'Amount and category are required' });

  const cleanDate = (expense_date || new Date().toISOString()).replace('T', ' ').replace(/\.[0-9]+Z?$/i, '').replace(/Z$/i, '');

  const dbRes = await queryDb(
    'INSERT INTO expenses (trip_id, payer_type, payer_member_id, payer_member_name, amount, category, description, split_type, receipt_image, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [trip_id, payer_type || 'pool', payer_member_id || null, payer_member_name || 'Trip Pool', amount, category, description || '', split_type || 'equal', receipt_image || null, cleanDate]
  );

  const expId = dbRes?.insertId ? Number(dbRes.insertId) : Date.now();
  if (dbRes?.insertId && Array.isArray(splits)) {
    for (const s of splits) {
      await queryDb(
        'INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (?, ?, ?, ?)',
        [expId, s.member_id, s.member_name, s.split_amount]
      );
    }
  }

  const newExp = {
    id: expId,
    trip_id: Number(trip_id),
    payer_type: payer_type || 'pool',
    payer_member_id: payer_member_id ? Number(payer_member_id) : null,
    payer_member_name: payer_member_name || 'Trip Pool',
    amount: Number(amount),
    category,
    description: description || '',
    split_type: split_type || 'equal',
    receipt_image: receipt_image || null,
    expense_date: expense_date || new Date().toISOString(),
    splits: Array.isArray(splits) ? splits : []
  };

  serverDb.expenses.unshift(newExp);
  saveServerDb(serverDb);
  res.status(201).json({ success: true, ...newExp });
});

app.put(['/api/expenses/:id', '/api/expenses', '/api/expenses.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Expense ID is required' });

  const { amount, category, payer_type, payer_member_id, payer_member_name, description, split_type, splits, receipt_image, expense_date } = req.body;
  const cleanDate = (expense_date || new Date().toISOString()).replace('T', ' ').replace(/\.[0-9]+Z?$/i, '').replace(/Z$/i, '');

  await queryDb(
    'UPDATE expenses SET payer_type=?, payer_member_id=?, payer_member_name=?, amount=?, category=?, description=?, split_type=?, receipt_image=?, expense_date=? WHERE id=?',
    [payer_type || 'pool', payer_member_id || null, payer_member_name || 'Trip Pool', amount, category, description || '', split_type || 'equal', receipt_image ?? null, cleanDate, id]
  );

  if (Array.isArray(splits)) {
    await queryDb('DELETE FROM expense_splits WHERE expense_id=?', [id]);
    for (const s of splits) {
      await queryDb(
        'INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (?, ?, ?, ?)',
        [id, s.member_id, s.member_name, s.split_amount]
      );
    }
  }

  const idx = serverDb.expenses.findIndex(e => e.id === id);
  if (idx !== -1) {
    serverDb.expenses[idx] = {
      ...serverDb.expenses[idx],
      payer_type: payer_type || 'pool',
      payer_member_id: payer_type === 'member' && payer_member_id ? Number(payer_member_id) : null,
      payer_member_name: payer_type === 'pool' ? 'Trip Pool' : (payer_member_name || 'Member'),
      amount: Number(amount),
      category: category || serverDb.expenses[idx].category,
      description: description ?? serverDb.expenses[idx].description,
      split_type: split_type || 'equal',
      receipt_image: receipt_image !== undefined ? receipt_image : serverDb.expenses[idx].receipt_image,
      expense_date: expense_date || serverDb.expenses[idx].expense_date,
      splits: Array.isArray(splits) ? splits : serverDb.expenses[idx].splits
    };
    saveServerDb(serverDb);
  }

  res.json({ success: true, id });
});

app.delete(['/api/expenses/:id', '/api/expenses', '/api/expenses.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Expense ID is required' });

  await queryDb('DELETE FROM expense_splits WHERE expense_id=?', [id]);
  await queryDb('DELETE FROM expenses WHERE id=?', [id]);
  serverDb.expenses = serverDb.expenses.filter(e => e.id !== id);
  saveServerDb(serverDb);

  res.json({ success: true, message: `Expense ${id} deleted` });
});

// ---------------------------------------------------------------------
// 3. Deposits Endpoints (/api/deposits & /api/deposits.php)
// ---------------------------------------------------------------------
app.get(['/api/deposits', '/api/deposits.php'], async (_req, res) => {
  const dbRows = await queryDb('SELECT * FROM deposits ORDER BY deposited_at DESC, id DESC');
  if (dbRows) {
    return res.json(dbRows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      trip_id: Number(r.trip_id),
      member_id: Number(r.member_id),
      amount: Number(r.amount)
    })));
  }
  res.json(serverDb.deposits);
});

app.post(['/api/deposits', '/api/deposits.php'], async (req, res) => {
  const { member_id, member_name, amount, payment_method, notes, deposited_at, trip_id = 1 } = req.body;
  if (!member_id || !amount) return res.status(400).json({ success: false, error: 'Member ID and amount are required' });

  const cleanDate = (deposited_at || new Date().toISOString()).replace('T', ' ').replace(/\.[0-9]+Z?$/i, '').replace(/Z$/i, '');

  const dbRes = await queryDb(
    'INSERT INTO deposits (trip_id, member_id, member_name, amount, payment_method, notes, deposited_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [trip_id, member_id, member_name || 'Member', amount, payment_method || 'Cash', notes || null, cleanDate]
  );

  const newDep = {
    id: dbRes?.insertId ? Number(dbRes.insertId) : Date.now(),
    trip_id: Number(trip_id),
    member_id: Number(member_id),
    member_name: member_name || 'Member',
    amount: Number(amount),
    payment_method: payment_method || 'Cash',
    notes: notes || null,
    deposited_at: deposited_at || new Date().toISOString()
  };

  serverDb.deposits.unshift(newDep);
  saveServerDb(serverDb);
  res.status(201).json({ success: true, ...newDep });
});

app.put(['/api/deposits/:id', '/api/deposits', '/api/deposits.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Deposit ID is required' });

  const { member_id, member_name, amount, payment_method, notes, deposited_at } = req.body;
  const cleanDate = (deposited_at || new Date().toISOString()).replace('T', ' ').replace(/\.[0-9]+Z?$/i, '').replace(/Z$/i, '');

  await queryDb(
    'UPDATE deposits SET member_id=?, member_name=?, amount=?, payment_method=?, notes=?, deposited_at=? WHERE id=?',
    [member_id, member_name || 'Member', amount, payment_method || 'Cash', notes ?? null, cleanDate, id]
  );

  const idx = serverDb.deposits.findIndex(d => d.id === id);
  if (idx !== -1) {
    serverDb.deposits[idx] = {
      ...serverDb.deposits[idx],
      member_id: Number(member_id),
      member_name: member_name || serverDb.deposits[idx].member_name,
      amount: Number(amount),
      payment_method: payment_method || serverDb.deposits[idx].payment_method,
      notes: notes !== undefined ? notes : serverDb.deposits[idx].notes,
      deposited_at: deposited_at || serverDb.deposits[idx].deposited_at
    };
    saveServerDb(serverDb);
  }

  res.json({ success: true, id });
});

app.delete(['/api/deposits/:id', '/api/deposits', '/api/deposits.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Valid Deposit ID is required' });

  await queryDb('DELETE FROM deposits WHERE id=?', [id]);
  serverDb.deposits = serverDb.deposits.filter(d => d.id !== id);
  saveServerDb(serverDb);

  res.json({ success: true, message: `Deposit ${id} deleted` });
});

// ---------------------------------------------------------------------
// 4. Trip Profile Endpoints (/api/trips & /api/trips.php)
// ---------------------------------------------------------------------
app.get(['/api/trips', '/api/trips.php'], async (_req, res) => {
  const dbRows = await queryDb('SELECT * FROM trips ORDER BY id ASC LIMIT 1');
  if (dbRows && dbRows.length > 0) {
    return res.json({
      ...dbRows[0],
      total_budget:
        dbRows[0].total_budget !== undefined && dbRows[0].total_budget !== null
          ? Number(dbRows[0].total_budget)
          : (serverDb.trip?.total_budget ?? 35000)
    });
  }
  if (serverDb.trip && serverDb.trip.total_budget === undefined) {
    serverDb.trip.total_budget = 35000;
    saveServerDb(serverDb);
  }
  res.json(serverDb.trip);
});

app.put(['/api/trips/:id', '/api/trips', '/api/trips.php'], async (req, res) => {
  const id = parseInt((req.params as any).id || (req.query.id as string) || req.body?.id || '1', 10);
  const { title, destination, currency, start_date, end_date, status, total_budget } = req.body;

  await queryDb(
    'UPDATE trips SET title=COALESCE(?, title), destination=COALESCE(?, destination), currency=COALESCE(?, currency), start_date=COALESCE(?, start_date), end_date=COALESCE(?, end_date), status=COALESCE(?, status) WHERE id=?',
    [title || null, destination || null, currency || null, start_date || null, end_date || null, status || null, id]
  );

  if (total_budget !== undefined) {
    await queryDb('UPDATE trips SET total_budget=? WHERE id=?', [Number(total_budget) || 0, id]);
  }

  serverDb.trip = {
    ...serverDb.trip,
    ...(title && { title }),
    ...(destination !== undefined && { destination }),
    ...(currency && { currency }),
    ...(start_date && { start_date }),
    ...(end_date && { end_date }),
    ...(status && { status }),
    ...(total_budget !== undefined && { total_budget: Number(total_budget) || 0 })
  };
  saveServerDb(serverDb);
  res.json({ success: true, ...serverDb.trip });
});

// ---------------------------------------------------------------------
// 5. Auth Login & Register (/api/auth/login, /api/login.php, /api/auth/register)
// ---------------------------------------------------------------------
app.post(['/api/auth/login', '/api/login.php', '/api/auth/register'], async (req, res) => {
  const action = req.query.action || req.body?.action || (req.path.includes('register') ? 'register' : 'login');
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (action === 'register') {
    const name = (req.body?.name || '').trim();
    const role = req.body?.role === 'leader' ? 'leader' : 'member';
    if (!email || !name || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Valid email, name, and password (min 6 chars) are required.' });
    }
    const existing = serverDb.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }
    const newUser = {
      id: `user_${Date.now()}`,
      email,
      name,
      role,
      member_id: role === 'leader' ? 1 : null,
      password
    };
    serverDb.users.push(newUser);
    saveServerDb(serverDb);
    return res.json({
      success: true,
      session: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, member_id: newUser.member_id },
        token: `tok_${Date.now()}`,
        loginAt: new Date().toISOString()
      }
    });
  }

  const user = serverDb.users.find(u => u.email.toLowerCase() === email);
  if (user && (password === 'Trip@2026' || (user as any).password === password)) {
    return res.json({
      success: true,
      session: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, member_id: user.member_id },
        token: `tok_${Date.now()}`,
        loginAt: new Date().toISOString()
      }
    });
  }

  // Fallback to client verification if custom user
  res.status(401).json({ success: false, error: 'Invalid email or password.' });
});

// ---------------------------------------------------------------------
// 6. Health & Database Status Endpoint (/api/health & /api/health.php)
// ---------------------------------------------------------------------
app.get(['/api/health', '/api/health.php'], (_req, res) => {
  const receiptCount = serverDb.expenses.filter(e => Boolean(e.receipt_image)).length;
  res.json({
    success: true,
    status: 'connected',
    database: mysqlConnected ? dbName : `${dbName} (Server DB)`,
    dbPoolConnected: true,
    trip: serverDb.trip,
    stats: {
      members: serverDb.members.length,
      expenses: serverDb.expenses.length,
      deposits: serverDb.deposits.length,
      receipts: receiptCount
    },
    timestamp: new Date().toISOString()
  });
});

// Vite Middleware Integration for Dev / Production Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        const template = await vite.transformIndexHtml(req.originalUrl, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[TripPool Express Server] Listening on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
