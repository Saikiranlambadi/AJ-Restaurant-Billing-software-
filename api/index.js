import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value.trim();
      }
    }
  }
} catch {}

const { Pool } = pg;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-vercel';
const SHOP_ID = 'aj-main-shop';

function loadJson(filename, fallback) {
  try {
    const loaded = require(`./${filename}`);
    if (loaded && (Array.isArray(loaded) ? loaded.length > 0 : Object.keys(loaded).length > 0)) {
      return loaded;
    }
  } catch (e) {
    // ignore require error and fallback to fs
  }
  try {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const cwdPath = path.join(process.cwd(), 'api', filename);
    if (fs.existsSync(cwdPath)) {
      return JSON.parse(fs.readFileSync(cwdPath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
  }
  return fallback;
}

const categories = loadJson('categories.json', []);
const items = loadJson('items.json', []);
const defaultSettings = loadJson('settings.json', {
  restaurant_name: "AJ Restaurant",
  address: "Main Road, Sudimalla, Telangana – 507123",
  phone: "📞 9866330527",
  paper_size: "80mm"
});

let pool = null;
let useDb = false;
let inMemoryStore = null;

function getInMemoryStore() {
  if (inMemoryStore) return inMemoryStore;
  const hash = bcrypt.hashSync('Ajay@1234', 10);
  inMemoryStore = {
    shops: [{ id: SHOP_ID, username: 'ajay', password_hash: hash, name: 'Ajay', role: 'Owner' }],
    categories: JSON.parse(JSON.stringify(categories)),
    items: JSON.parse(JSON.stringify(items)),
    settings: { ...defaultSettings },
    bills: []
  };
  return inMemoryStore;
}

async function db() {
  if (!process.env.DATABASE_URL) {
    useDb = false;
    getInMemoryStore();
    return;
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Owner');
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE, name TEXT NOT NULL, category_id INTEGER, price NUMERIC(12,2) NOT NULL DEFAULT 0, available INTEGER NOT NULL DEFAULT 1, image TEXT DEFAULT '');
      CREATE TABLE IF NOT EXISTS settings (shop_id TEXT PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE, restaurant_name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT NOT NULL, paper_size TEXT NOT NULL DEFAULT '80mm');
      CREATE TABLE IF NOT EXISTS bills (id BIGSERIAL PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE, bill_no TEXT NOT NULL, restaurant_name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT NOT NULL, total NUMERIC(12,2) NOT NULL DEFAULT 0, payment_method TEXT NOT NULL, cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0, upi_amount NUMERIC(12,2) NOT NULL DEFAULT 0, card_amount NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL, items JSONB NOT NULL DEFAULT '[]'::jsonb, UNIQUE(shop_id, bill_no));
      CREATE INDEX IF NOT EXISTS bills_shop_created_idx ON bills(shop_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS items_shop_idx ON items(shop_id);
      CREATE INDEX IF NOT EXISTS categories_shop_idx ON categories(shop_id);
    `);
    const hash = await bcrypt.hash('Ajay@1234', 10);
    await pool.query(`INSERT INTO shops(id, username, password_hash, name, role) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`, [SHOP_ID, 'ajay', hash, 'Ajay', 'Owner']);
    await pool.query(`INSERT INTO settings(shop_id, restaurant_name, address, phone, paper_size) VALUES($1,$2,$3,$4,$5) ON CONFLICT(shop_id) DO NOTHING`, [SHOP_ID, defaultSettings.restaurant_name, defaultSettings.address, defaultSettings.phone, defaultSettings.paper_size]);
    const c = await pool.query('SELECT COUNT(*)::int AS n FROM categories WHERE shop_id=$1', [SHOP_ID]);
    if (c.rows[0].n === 0 && categories.length > 0) {
      for (const x of categories) await pool.query('INSERT INTO categories(id, shop_id, name) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET shop_id=EXCLUDED.shop_id, name=EXCLUDED.name', [x.id, SHOP_ID, x.name]);
      await pool.query(`SELECT setval(pg_get_serial_sequence('categories','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM categories),1), true)`);
    }
    const it = await pool.query('SELECT COUNT(*)::int AS n FROM items WHERE shop_id=$1', [SHOP_ID]);
    if (it.rows[0].n === 0 && items.length > 0) {
      for (const x of items) await pool.query('INSERT INTO items(id, shop_id, name, category_id, price, available, image) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET shop_id=EXCLUDED.shop_id, name=EXCLUDED.name, category_id=EXCLUDED.category_id, price=EXCLUDED.price, available=EXCLUDED.available, image=EXCLUDED.image', [x.id, SHOP_ID, x.name, x.category_id, x.price, x.available, x.image]);
      await pool.query(`SELECT setval(pg_get_serial_sequence('items','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM items),1), true)`);
    }
    useDb = true;
  } catch (err) {
    console.warn('[API] Postgres connection failed, using local storage fallback:', err.message);
    useDb = false;
    getInMemoryStore();
  }
}

function send(res, status, body) {
  if (typeof res.status === 'function') res.status(status);
  else res.statusCode = status;
  if (typeof res.json === 'function') res.json(body);
  else {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }
}

function auth(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  if (!h.startsWith('Bearer ')) throw new Error('Unauthorized');
  const p = jwt.verify(h.slice(7), JWT_SECRET);
  if (p.shopId !== SHOP_ID) throw new Error('Unauthorized');
  return p;
}

function tokenFor(user) {
  return jwt.sign({ shopId: SHOP_ID, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

function route(req) {
  return (req.query?.path || req.url.split('?')[0]).replace(/^\/api\/?/, '').replace(/\/$/, '');
}

export default async function handler(req, res) {
  try {
    await db();
    const r = route(req);
    if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

    const mem = getInMemoryStore();

    if (r === 'login' && req.method === 'POST') {
      const { username, password } = req.body || {};
      const targetUser = String(username || '').trim().toLowerCase();
      const pwStr = String(password || '');

      if (useDb) {
        const q = await pool.query('SELECT username,name,role,password_hash FROM shops WHERE id=$1 AND username=$2', [SHOP_ID, targetUser]);
        if (!q.rows[0] || !(await bcrypt.compare(pwStr, q.rows[0].password_hash))) return send(res, 401, { message: 'Invalid username or password' });
        const user = { username: q.rows[0].username, name: q.rows[0].name, role: q.rows[0].role };
        return send(res, 200, { user, token: tokenFor(user) });
      } else {
        const found = mem.shops.find(s => s.username.toLowerCase() === targetUser);
        if (!found || !(await bcrypt.compare(pwStr, found.password_hash))) return send(res, 401, { message: 'Invalid username or password' });
        const user = { username: found.username, name: found.name, role: found.role };
        return send(res, 200, { user, token: tokenFor(user) });
      }
    }

    let user;
    try {
      user = auth(req);
    } catch (authErr) {
      return send(res, 401, { message: authErr.message || 'Unauthorized' });
    }
    const shopId = user.shopId;

    if (r === 'me' && req.method === 'GET') {
      return send(res, 200, { user: { username: user.username, name: user.name, role: user.role } });
    }

    // CATEGORIES
    if (r === 'categories' && req.method === 'GET') {
      if (useDb) {
        let q = await pool.query('SELECT id,name FROM categories WHERE shop_id=$1 ORDER BY id', [shopId]);
        if (q.rows.length === 0 && categories.length > 0) {
          for (const x of categories) await pool.query('INSERT INTO categories(id, shop_id, name) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET shop_id=EXCLUDED.shop_id, name=EXCLUDED.name', [x.id, shopId, x.name]);
          await pool.query(`SELECT setval(pg_get_serial_sequence('categories','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM categories),1), true)`);
          q = await pool.query('SELECT id,name FROM categories WHERE shop_id=$1 ORDER BY id', [shopId]);
        }
        return send(res, 200, q.rows);
      } else {
        if (!mem.categories || mem.categories.length === 0) {
          mem.categories = JSON.parse(JSON.stringify(categories));
        }
        return send(res, 200, mem.categories.map(c => ({ id: c.id, name: c.name })));
      }
    }
    if (r === 'categories' && req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      if (useDb) {
        const q = await pool.query('INSERT INTO categories(shop_id,name) VALUES($1,$2) RETURNING id,name', [shopId, name]);
        return send(res, 201, q.rows[0]);
      } else {
        const nextId = (mem.categories.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
        const newCat = { id: nextId, name };
        mem.categories.push(newCat);
        return send(res, 201, newCat);
      }
    }
    const catMatch = r.match(/^categories\/(\d+)$/);
    if (catMatch && req.method === 'PUT') {
      const catId = Number(catMatch[1]);
      const name = String(req.body?.name || '').trim();
      if (useDb) {
        const q = await pool.query('UPDATE categories SET name=$1 WHERE id=$2 AND shop_id=$3 RETURNING id,name', [name, catId, shopId]);
        return send(res, 200, q.rows[0]);
      } else {
        const cat = mem.categories.find(c => c.id === catId);
        if (cat) cat.name = name;
        return send(res, 200, cat || { id: catId, name });
      }
    }
    if (catMatch && req.method === 'DELETE') {
      const catId = Number(catMatch[1]);
      if (useDb) {
        await pool.query('DELETE FROM categories WHERE id=$1 AND shop_id=$2', [catId, shopId]);
      } else {
        mem.categories = mem.categories.filter(c => c.id !== catId);
      }
      return send(res, 200, { ok: true });
    }

    // ITEMS
    if (r === 'items' && req.method === 'GET') {
      const forceReseed = req.url && req.url.includes('reseed=true');
      if (useDb) {
        if (forceReseed) {
          await pool.query('DELETE FROM items WHERE shop_id=$1', [shopId]);
        }
        let q = await pool.query('SELECT i.id,i.name,i.category_id,i.price,i.available,i.image,c.name AS category_name FROM items i LEFT JOIN categories c ON c.id=i.category_id AND c.shop_id=i.shop_id WHERE i.shop_id=$1 ORDER BY i.id', [shopId]);
        if ((q.rows.length === 0 || forceReseed) && items.length > 0) {
          for (const x of items) await pool.query('INSERT INTO items(id, shop_id, name, category_id, price, available, image) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET shop_id=EXCLUDED.shop_id, name=EXCLUDED.name, category_id=EXCLUDED.category_id, price=EXCLUDED.price, available=EXCLUDED.available, image=EXCLUDED.image', [x.id, shopId, x.name, x.category_id, x.price, 1, x.image]);
          await pool.query(`SELECT setval(pg_get_serial_sequence('items','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM items),1), true)`);
          q = await pool.query('SELECT i.id,i.name,i.category_id,i.price,i.available,i.image,c.name AS category_name FROM items i LEFT JOIN categories c ON c.id=i.category_id AND c.shop_id=i.shop_id WHERE i.shop_id=$1 ORDER BY i.id', [shopId]);
        }
        if (q.rows.length > 0 && q.rows.every(x => Number(x.available) === 0)) {
          await pool.query('UPDATE items SET available=1 WHERE shop_id=$1', [shopId]);
          q = await pool.query('SELECT i.id,i.name,i.category_id,i.price,i.available,i.image,c.name AS category_name FROM items i LEFT JOIN categories c ON c.id=i.category_id AND c.shop_id=i.shop_id WHERE i.shop_id=$1 ORDER BY i.id', [shopId]);
        }
        return send(res, 200, q.rows);
      } else {
        if (forceReseed || !mem.items || mem.items.length === 0) {
          mem.items = JSON.parse(JSON.stringify(items)).map(x => ({ ...x, available: 1 }));
        }
        if (mem.items.length > 0 && mem.items.every(x => x.available === 0 || x.available === '0' || x.available === false)) {
          mem.items.forEach(x => { x.available = 1; });
        }
        const catMap = Object.fromEntries(mem.categories.map(c => [c.id, c.name]));
        const result = mem.items.map(it => ({
          ...it,
          available: (it.available === 0 || it.available === false || it.available === '0' || it.available === 'false') ? 0 : 1,
          category_name: catMap[it.category_id] || ''
        }));
        return send(res, 200, result);
      }
    }
    if (r === 'items' && req.method === 'POST') {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const category_id = b.category_id ? Number(b.category_id) : null;
      const price = Number(b.price) || 0;
      const available = b.available ? 1 : 0;
      const image = b.image || '';

      if (useDb) {
        const q = await pool.query('INSERT INTO items(shop_id,name,category_id,price,available,image) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [shopId, name, category_id, price, available, image]);
        return send(res, 201, q.rows[0]);
      } else {
        const nextId = (mem.items.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1;
        const newItem = { id: nextId, name, category_id, price, available, image };
        mem.items.push(newItem);
        return send(res, 201, newItem);
      }
    }
    const itemMatch = r.match(/^items\/(\d+)$/);
    if (itemMatch && req.method === 'PUT') {
      const itemId = Number(itemMatch[1]);
      const b = req.body || {};

      if (useDb) {
        const q = await pool.query('UPDATE items SET name=COALESCE(NULLIF($1,\'\'),name),category_id=COALESCE($2,category_id),price=COALESCE($3,price),available=COALESCE($4,available),image=COALESCE(NULLIF($5,\'\'),image) WHERE id=$6 AND shop_id=$7 RETURNING *', [b.name ? String(b.name).trim() : '', b.category_id ? Number(b.category_id) : null, b.price !== undefined ? Number(b.price) : null, b.available !== undefined ? (b.available ? 1 : 0) : null, b.image || '', itemId, shopId]);
        return send(res, 200, q.rows[0]);
      } else {
        const item = mem.items.find(x => x.id === itemId);
        if (item) {
          if (b.name) item.name = String(b.name).trim();
          if (b.category_id !== undefined) item.category_id = b.category_id ? Number(b.category_id) : null;
          if (b.price !== undefined) item.price = Number(b.price);
          if (b.available !== undefined) item.available = b.available ? 1 : 0;
          if (b.image !== undefined) item.image = b.image;
        }
        return send(res, 200, item || { id: itemId, ...b });
      }
    }
    if (itemMatch && req.method === 'DELETE') {
      const itemId = Number(itemMatch[1]);
      if (useDb) {
        await pool.query('DELETE FROM items WHERE id=$1 AND shop_id=$2', [itemId, shopId]);
      } else {
        mem.items = mem.items.filter(x => x.id !== itemId);
      }
      return send(res, 200, { ok: true });
    }

    // SETTINGS
    if (r === 'settings' && req.method === 'GET') {
      if (useDb) {
        const q = await pool.query('SELECT restaurant_name,address,phone,paper_size FROM settings WHERE shop_id=$1', [shopId]);
        return send(res, 200, q.rows[0] || defaultSettings);
      } else {
        return send(res, 200, mem.settings);
      }
    }
    if (r === 'settings' && req.method === 'PUT') {
      const b = req.body || {};
      const restaurant_name = String(b.restaurant_name || defaultSettings.restaurant_name).trim();
      const address = String(b.address || defaultSettings.address).trim();
      const phone = String(b.phone || defaultSettings.phone).trim();
      const paper_size = b.paper_size || defaultSettings.paper_size;

      if (useDb) {
        const q = await pool.query('UPDATE settings SET restaurant_name=$1,address=$2,phone=$3,paper_size=$4 WHERE shop_id=$5 RETURNING restaurant_name,address,phone,paper_size', [restaurant_name, address, phone, paper_size, shopId]);
        return send(res, 200, q.rows[0]);
      } else {
        mem.settings = { restaurant_name, address, phone, paper_size };
        return send(res, 200, mem.settings);
      }
    }

    // BILLS
    if (r === 'bills' && req.method === 'GET') {
      if (useDb) {
        const q = await pool.query('SELECT id,bill_no,restaurant_name,address,phone,total,payment_method,cash_amount,upi_amount,card_amount,created_at,items FROM bills WHERE shop_id=$1 ORDER BY created_at DESC', [shopId]);
        return send(res, 200, q.rows);
      } else {
        return send(res, 200, mem.bills.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    }
    if (r === 'bills' && req.method === 'POST') {
      const b = req.body || {};
      const currentSettings = useDb
        ? ((await pool.query('SELECT * FROM settings WHERE shop_id=$1', [shopId])).rows[0] || defaultSettings)
        : mem.settings;
      const billItems = (b.items || []).map(x => ({
        item_id: x.id,
        item_name: x.name,
        quantity: Number(x.quantity) || 0,
        price: Number(x.price) || 0,
        amount: (Number(x.price) || 0) * (Number(x.quantity) || 0)
      }));
      const total = billItems.reduce((a, x) => a + x.amount, 0);
      const bill_no = `B${Date.now().toString(36).toUpperCase()}`;

      if (useDb) {
        const q = await pool.query('INSERT INTO bills(shop_id,bill_no,restaurant_name,address,phone,total,payment_method,cash_amount,upi_amount,card_amount,created_at,items) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11) RETURNING *', [
          shopId, bill_no, currentSettings.restaurant_name, currentSettings.address, currentSettings.phone, total, b.payment_method || 'Cash', Number(b.cash_amount) || 0, Number(b.upi_amount) || 0, Number(b.card_amount) || 0, JSON.stringify(billItems)
        ]);
        return send(res, 201, q.rows[0]);
      } else {
        const nextId = (mem.bills.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1;
        const newBill = {
          id: nextId,
          bill_no,
          restaurant_name: currentSettings.restaurant_name,
          address: currentSettings.address,
          phone: currentSettings.phone,
          total,
          payment_method: b.payment_method || 'Cash',
          cash_amount: Number(b.cash_amount) || 0,
          upi_amount: Number(b.upi_amount) || 0,
          card_amount: Number(b.card_amount) || 0,
          created_at: new Date().toISOString(),
          items: billItems
        };
        mem.bills.push(newBill);
        return send(res, 201, newBill);
      }
    }
    const billMatch = r.match(/^bills\/(\d+)$/);
    if (billMatch && req.method === 'GET') {
      const billId = Number(billMatch[1]);
      if (useDb) {
        const q = await pool.query('SELECT * FROM bills WHERE id=$1 AND shop_id=$2', [billId, shopId]);
        if (!q.rows[0]) return send(res, 404, { message: 'Bill not found' });
        return send(res, 200, q.rows[0]);
      } else {
        const bill = mem.bills.find(x => x.id === billId);
        if (!bill) return send(res, 404, { message: 'Bill not found' });
        return send(res, 200, bill);
      }
    }
    if (billMatch && req.method === 'DELETE') {
      const billId = Number(billMatch[1]);
      if (useDb) {
        await pool.query('DELETE FROM bills WHERE id=$1 AND shop_id=$2', [billId, shopId]);
      } else {
        mem.bills = mem.bills.filter(x => x.id !== billId);
      }
      return send(res, 200, { ok: true });
    }

    // DAILY
    if (r === 'daily' && req.method === 'GET') {
      let billsToday = [];
      if (useDb) {
        const q = await pool.query(`SELECT * FROM bills WHERE shop_id=$1 AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day' ORDER BY created_at DESC`, [shopId]);
        billsToday = q.rows;
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        billsToday = mem.bills.filter(b => b.created_at && b.created_at.slice(0, 10) === todayStr);
      }
      const summary = { total: 0, bills: billsToday.length, cash: 0, upi: 0, card: 0 };
      const topMap = {};
      for (const b of billsToday) {
        summary.total += Number(b.total) || 0;
        summary.cash += Number(b.cash_amount) || 0;
        summary.upi += Number(b.upi_amount) || 0;
        summary.card += Number(b.card_amount) || 0;
        const billItems = Array.isArray(b.items) ? b.items : (typeof b.items === 'string' ? JSON.parse(b.items || '[]') : []);
        for (const x of billItems) {
          if (!topMap[x.item_name]) topMap[x.item_name] = { name: x.item_name, quantity: 0, amount: 0 };
          topMap[x.item_name].quantity += Number(x.quantity) || 0;
          topMap[x.item_name].amount += Number(x.amount) || 0;
        }
      }
      return send(res, 200, { summary, top: Object.values(topMap).sort((a, b) => b.quantity - a.quantity) });
    }

    // CLEAR
    if (r === 'clear' && req.method === 'POST') {
      const pw = String(req.body?.password || '');
      if (useDb) {
        const q = await pool.query('SELECT password_hash FROM shops WHERE id=$1', [shopId]);
        if (!q.rows[0] || !(await bcrypt.compare(pw, q.rows[0].password_hash))) return send(res, 403, { message: 'Invalid password' });
        await pool.query('DELETE FROM bills WHERE shop_id=$1', [shopId]);
      } else {
        const found = mem.shops.find(s => s.id === shopId);
        if (!found || !(await bcrypt.compare(pw, found.password_hash))) return send(res, 403, { message: 'Invalid password' });
        mem.bills = [];
      }
      return send(res, 200, { ok: true, message: 'All bill data cleared successfully' });
    }

    // SYNC
    if (r === 'sync' && req.method === 'POST') {
      const b = req.body || {};
      if (useDb) {
        const state = await pool.query(`SELECT (SELECT COUNT(*) FROM bills WHERE shop_id=$1)::int AS bills, (SELECT COUNT(*) FROM categories WHERE shop_id=$1)::int AS cats, (SELECT COUNT(*) FROM items WHERE shop_id=$1)::int AS items`, [shopId]);
        const s = state.rows[0];
        const canImport = Number(s.bills) === 0 && Number(s.cats) === categories.length && Number(s.items) === items.length;
        if (canImport) {
          if (Array.isArray(b.settings) || (b.settings && typeof b.settings === 'object')) {
            const x = b.settings || {};
            await pool.query('UPDATE settings SET restaurant_name=$1,address=$2,phone=$3,paper_size=$4 WHERE shop_id=$5', [x.restaurant_name || defaultSettings.restaurant_name, x.address || defaultSettings.address, x.phone || defaultSettings.phone, x.paper_size || defaultSettings.paper_size, shopId]);
          }
          if (Array.isArray(b.categories) && b.categories.length) {
            await pool.query('DELETE FROM categories WHERE shop_id=$1', [shopId]);
            for (const x of b.categories) await pool.query('INSERT INTO categories(id,shop_id,name) VALUES($1,$2,$3)', [Number(x.id), shopId, String(x.name || '').trim()]);
            await pool.query(`SELECT setval(pg_get_serial_sequence('categories','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM categories),1), true)`);
          }
          if (Array.isArray(b.items) && b.items.length) {
            await pool.query('DELETE FROM items WHERE shop_id=$1', [shopId]);
            for (const x of b.items) {
              const isAvail = (x.available === 0 || x.available === false || x.available === '0' || x.available === 'false') ? 0 : 1;
              await pool.query('INSERT INTO items(id,shop_id,name,category_id,price,available,image) VALUES($1,$2,$3,$4,$5,$6,$7)', [Number(x.id), shopId, String(x.name || '').trim(), x.category_id ? Number(x.category_id) : null, Number(x.price) || 0, isAvail, x.image || '']);
            }
            await pool.query(`SELECT setval(pg_get_serial_sequence('items','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM categories),1), true)`);
          }
          if (Array.isArray(b.bills)) for (const x of b.bills) {
            const exists = await pool.query('SELECT 1 FROM bills WHERE shop_id=$1 AND bill_no=$2', [shopId, x.bill_no]);
            if (!exists.rows[0]) await pool.query('INSERT INTO bills(shop_id,bill_no,restaurant_name,address,phone,total,payment_method,cash_amount,upi_amount,card_amount,created_at,items) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [shopId, x.bill_no, x.restaurant_name || defaultSettings.restaurant_name, x.address || defaultSettings.address, x.phone || defaultSettings.phone, Number(x.total) || 0, x.payment_method || 'Cash', Number(x.cash_amount) || 0, Number(x.upi_amount) || 0, Number(x.card_amount) || 0, x.created_at || new Date().toISOString(), JSON.stringify(x.items || [])]);
          }
        }
        return send(res, 200, { ok: true, migrated: canImport });
      } else {
        if (b.settings && typeof b.settings === 'object') {
          mem.settings = { ...mem.settings, ...b.settings };
        }
        if (Array.isArray(b.categories) && b.categories.length) {
          mem.categories = b.categories.map(x => ({ id: Number(x.id), name: String(x.name || '').trim() }));
        }
        if (Array.isArray(b.items) && b.items.length) {
          mem.items = b.items.map(x => ({ id: Number(x.id), name: String(x.name || '').trim(), category_id: x.category_id ? Number(x.category_id) : null, price: Number(x.price) || 0, available: (x.available === 0 || x.available === false || x.available === '0' || x.available === 'false') ? 0 : 1, image: x.image || '' }));
        }
        if (Array.isArray(b.bills) && b.bills.length) {
          for (const x of b.bills) {
            if (!mem.bills.some(existing => existing.bill_no === x.bill_no)) {
              mem.bills.push(x);
            }
          }
        }
        return send(res, 200, { ok: true, migrated: true });
      }
    }

    return send(res, 404, { message: 'Not found' });
  } catch (e) {
    console.error('[API Error]', e);
    return send(res, 500, { message: e.message || 'Server error' });
  }
}
