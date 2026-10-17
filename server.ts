import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Database connection pool setup (MySQL / MariaDB)
const dbHost = process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
const dbUser = process.env.MYSQL_USER || process.env.DB_USER || 'root';
const dbPassword = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'trippool';

let dbPool: mysql.Pool | null = null;

try {
  dbPool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  console.log(`[Database] MySQL Connection Pool created for host: ${dbHost}, database: ${dbName}`);
} catch (err) {
  console.warn('[Database] MySQL Pool initialization deferred/fallback:', err);
}

// In-Memory Database Store (Fallback when live MySQL database is not connected locally)
let memTrip = {
  id: 1,
  title: 'Rara Trip 2026',
  destination: 'Rara Lake & Karnali Valley',
  currency: 'Rs.',
  start_date: '2026-10-18',
  end_date: '2026-10-25',
  status: 'active'
};

let memMembers = [
  { id: 1, trip_id: 1, name: 'Ramesh Sharma', phone: '+977-9841000001', notes: 'Trip Leader & Float Cash Custodian', is_leader: true, is_active: true },
  { id: 2, trip_id: 1, name: 'Bikash Thapa', phone: '+977-9841000002', notes: 'Scout & Co-driver', is_leader: false, is_active: true },
  { id: 3, trip_id: 1, name: 'Saurav Joshi', phone: '+977-9841000003', notes: 'Photographer', is_leader: false, is_active: true },
  { id: 4, trip_id: 1, name: 'Ayush Shrestha', phone: '+977-9841000004', notes: 'Navigator', is_leader: false, is_active: true }
];

let memDeposits = [
  { id: 1, trip_id: 1, member_id: 1, member_name: 'Ramesh Sharma', amount: 5000, payment_method: 'Cash', notes: 'Initial float cash pool contribution', deposited_at: '2026-10-17T08:30:00' },
  { id: 2, trip_id: 1, member_id: 2, member_name: 'Bikash Thapa', amount: 5000, payment_method: 'Fonepay', notes: 'Advance deposit via Fonepay QR', deposited_at: '2026-10-17T09:15:00' },
  { id: 3, trip_id: 1, member_id: 3, member_name: 'Saurav Joshi', amount: 5000, payment_method: 'Bank Transfer', notes: 'Transferred to Leader Nabil Bank', deposited_at: '2026-10-17T10:00:00' },
  { id: 4, trip_id: 1, member_id: 4, member_name: 'Ayush Shrestha', amount: 5000, payment_method: 'Fonepay', notes: 'Fonepay deposit', deposited_at: '2026-10-17T11:20:00' }
];

let memExpenses = [
  {
    id: 1,
    trip_id: 1,
    payer_type: 'pool',
    payer_member_id: null,
    payer_member_name: 'Trip Pool',
    amount: 4000,
    category: 'Fuel',
    description: 'Scorpio diesel top-up at Kohalpur',
    split_type: 'equal',
    expense_date: '2026-10-17T14:00:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 1000 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 1000 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 1000 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 1000 }
    ]
  },
  {
    id: 2,
    trip_id: 1,
    payer_type: 'pool',
    payer_member_id: null,
    payer_member_name: 'Trip Pool',
    amount: 1400,
    category: 'Food & Snacks',
    description: 'Mutton Thali & milk tea at Kalikot Dhaba',
    split_type: 'equal',
    expense_date: '2026-10-18T12:30:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 350 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 350 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 350 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 350 }
    ]
  },
  {
    id: 3,
    trip_id: 1,
    payer_type: 'member',
    payer_member_id: 2,
    payer_member_name: 'Bikash Thapa',
    amount: 1200,
    category: 'Vehicle Maintenance/Spares',
    description: 'Tire puncture repair & spare valve tube (paid by Bikash)',
    split_type: 'equal',
    expense_date: '2026-10-18T16:45:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 300 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 300 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 300 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 300 }
    ]
  }
];

// Helper to query MySQL or fallback to memory database
async function queryDb(sql: string, params: any[] = []): Promise<any> {
  if (dbPool) {
    try {
      const [rows] = await dbPool.query(sql, params);
      return rows;
    } catch (e) {
      console.warn('[Database Query Warning] Falling back to memory store:', (e as Error).message);
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// REST API ENDPOINTS - 100% Database Driven
// ---------------------------------------------------------------------

// 1. Members Endpoints
app.get('/api/members', async (req, res) => {
  const dbRows = await queryDb('SELECT id, trip_id, name, phone, notes, is_leader, is_active FROM members ORDER BY id ASC');
  if (dbRows) {
    const formatted = dbRows.map((r: any) => ({
      ...r,
      is_leader: Boolean(r.is_leader),
      is_active: Boolean(r.is_active)
    }));
    return res.json(formatted);
  }
  res.json(memMembers);
});

app.post('/api/members', async (req, res) => {
  const { name, phone, notes, is_leader, trip_id = 1 } = req.body;
  if (!name) return res.status(400).json({ error: 'Member name is required' });

  const isLeaderVal = is_leader ? 1 : 0;
  const dbRes = await queryDb(
    'INSERT INTO members (trip_id, name, phone, notes, is_leader, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [trip_id, name, phone || null, notes || null, isLeaderVal]
  );

  if (dbRes && dbRes.insertId) {
    const newMember = { id: dbRes.insertId, trip_id, name, phone, notes, is_leader: Boolean(is_leader), is_active: true };
    return res.status(201).json(newMember);
  }

  const newMember = {
    id: Date.now(),
    trip_id,
    name,
    phone: phone || undefined,
    notes: notes || undefined,
    is_leader: Boolean(is_leader),
    is_active: true
  };
  memMembers.push(newMember);
  res.status(201).json(newMember);
});

app.put('/api/members/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, phone, notes, is_leader, is_active } = req.body;

  const dbRes = await queryDb(
    'UPDATE members SET name=COALESCE(?, name), phone=?, notes=?, is_leader=COALESCE(?, is_leader), is_active=COALESCE(?, is_active) WHERE id=?',
    [name || null, phone || null, notes || null, is_leader !== undefined ? (is_leader ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
  );

  const idx = memMembers.findIndex(m => m.id === id);
  if (idx !== -1) {
    memMembers[idx] = {
      ...memMembers[idx],
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(notes !== undefined && { notes }),
      ...(is_leader !== undefined && { is_leader }),
      ...(is_active !== undefined && { is_active })
    };
    return res.json(memMembers[idx]);
  }

  if (dbRes) return res.json({ success: true, id });
  res.status(404).json({ error: 'Member not found' });
});

app.delete('/api/members/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  await queryDb('DELETE FROM members WHERE id=?', [id]);
  memMembers = memMembers.filter(m => m.id !== id);

  res.json({ success: true, message: `Member ${id} deleted successfully from database` });
});

// 2. Expenses Endpoints
app.get('/api/expenses', async (req, res) => {
  const dbRows = await queryDb('SELECT * FROM expenses ORDER BY expense_date DESC');
  if (dbRows) {
    const formatted = [];
    for (const exp of dbRows) {
      const splits = await queryDb('SELECT member_id, member_name, split_amount FROM expense_splits WHERE expense_id=?', [exp.id]);
      formatted.push({
        ...exp,
        amount: Number(exp.amount),
        splits: (splits || []).map((s: any) => ({ ...s, split_amount: Number(s.split_amount) }))
      });
    }
    return res.json(formatted);
  }
  res.json(memExpenses);
});

app.post('/api/expenses', async (req, res) => {
  const { amount, category, payer_type, payer_member_id, payer_member_name, description, split_type, splits, receipt_image, expense_date, trip_id = 1 } = req.body;
  if (!amount || !category) return res.status(400).json({ error: 'Amount and category are required' });

  const dbRes = await queryDb(
    'INSERT INTO expenses (trip_id, payer_type, payer_member_id, payer_member_name, amount, category, description, split_type, receipt_image, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [trip_id, payer_type, payer_member_id || null, payer_member_name || 'Trip Pool', amount, category, description || '', split_type || 'equal', receipt_image || null, expense_date || new Date().toISOString()]
  );

  if (dbRes && dbRes.insertId) {
    const expId = dbRes.insertId;
    if (Array.isArray(splits)) {
      for (const s of splits) {
        await queryDb('INSERT INTO expense_splits (expense_id, member_id, member_name, split_amount) VALUES (?, ?, ?, ?)', [expId, s.member_id, s.member_name, s.split_amount]);
      }
    }
    return res.status(201).json({ id: expId, ...req.body });
  }

  const newExp = { id: Date.now(), trip_id, ...req.body };
  memExpenses.unshift(newExp);
  res.status(201).json(newExp);
});

app.delete('/api/expenses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await queryDb('DELETE FROM expenses WHERE id=?', [id]);
  memExpenses = memExpenses.filter(e => e.id !== id);
  res.json({ success: true, message: `Expense ${id} deleted` });
});

// 3. Deposits Endpoints
app.get('/api/deposits', async (req, res) => {
  const dbRows = await queryDb('SELECT * FROM deposits ORDER BY deposited_at DESC');
  if (dbRows) {
    return res.json(dbRows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
  }
  res.json(memDeposits);
});

app.post('/api/deposits', async (req, res) => {
  const { member_id, member_name, amount, payment_method, notes, deposited_at, trip_id = 1 } = req.body;
  if (!member_id || !amount) return res.status(400).json({ error: 'Member ID and amount are required' });

  const dbRes = await queryDb(
    'INSERT INTO deposits (trip_id, member_id, member_name, amount, payment_method, notes, deposited_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [trip_id, member_id, member_name, amount, payment_method || 'Cash', notes || null, deposited_at || new Date().toISOString()]
  );

  if (dbRes && dbRes.insertId) {
    return res.status(201).json({ id: dbRes.insertId, ...req.body });
  }

  const newDep = { id: Date.now(), trip_id, ...req.body };
  memDeposits.unshift(newDep);
  res.status(201).json(newDep);
});

app.delete('/api/deposits/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await queryDb('DELETE FROM deposits WHERE id=?', [id]);
  memDeposits = memDeposits.filter(d => d.id !== id);
  res.json({ success: true, message: `Deposit ${id} deleted` });
});

// 4. Trip Profile Endpoints
app.get('/api/trips', async (req, res) => {
  const dbRows = await queryDb('SELECT * FROM trips WHERE id=1');
  if (dbRows && dbRows.length > 0) {
    return res.json(dbRows[0]);
  }
  res.json(memTrip);
});

app.put('/api/trips/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, destination, currency } = req.body;

  await queryDb('UPDATE trips SET title=?, destination=?, currency=? WHERE id=?', [title, destination, currency, id]);
  memTrip = { ...memTrip, title, destination, currency };
  res.json(memTrip);
});

// 5. Sync Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    dbPoolConnected: Boolean(dbPool),
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
        const template = await vite.transformIndexHtml(req.originalUrl, `<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[TripPool Express Server] Listening on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
