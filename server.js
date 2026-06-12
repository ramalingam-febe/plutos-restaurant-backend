const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================================
// CONFIG
// ============================================================

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET is not set. Admin authentication is not secure for production.');
}

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://127.0.0.1:5500'
].filter(Boolean);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS not allowed for this origin'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// ============================================================
// STATIC MENU DATA
// ============================================================

function getStaticMenu() {
    return [
        { id: 1001, name: "Sweet Corn Soup (Veg)", category: "SOUPS", rate: 109 },
        { id: 1002, name: "Hot & Sour Soup (Veg)", category: "SOUPS", rate: 109 },
        { id: 1003, name: "Veg Clear Soup", category: "SOUPS", rate: 109 },
        { id: 1004, name: "Manchow Soup (Veg)", category: "SOUPS", rate: 119 },
        { id: 1005, name: "Sweet Corn Chicken Soup", category: "SOUPS", rate: 129 },
        { id: 1006, name: "Hot & Sour Chicken Soup", category: "SOUPS", rate: 129 },
        { id: 1007, name: "Chicken Clear Soup", category: "SOUPS", rate: 119 },

        { id: 1101, name: "Gobi 65", category: "VEG STARTERS", rate: 199 },
        { id: 1102, name: "Paneer 65", category: "VEG STARTERS", rate: 209 },
        { id: 1103, name: "Crispy Fried Veg", category: "VEG STARTERS", rate: 199 },
        { id: 1104, name: "Veg Manchurian", category: "VEG STARTERS", rate: 199 },
        { id: 1105, name: "Chilli Paneer", category: "VEG STARTERS", rate: 219 },
        { id: 1106, name: "Honey Gobi Fry", category: "VEG STARTERS", rate: 209 },
        { id: 1107, name: "Veg Lollipop", category: "VEG STARTERS", rate: 229 },

        { id: 1201, name: "Chicken 65", category: "NON-VEG STARTERS", rate: 239 },
        { id: 1202, name: "Chicken Lollipop", category: "NON-VEG STARTERS", rate: 289 },
        { id: 1203, name: "Chicken Drumstick", category: "NON-VEG STARTERS", rate: 289 },
        { id: 1204, name: "Ginger Chicken", category: "NON-VEG STARTERS", rate: 279 },
        { id: 1205, name: "Garlic Chicken", category: "NON-VEG STARTERS", rate: 279 },
        { id: 1206, name: "Dragon Chicken", category: "NON-VEG STARTERS", rate: 289 },
        { id: 1207, name: "Fish Finger", category: "NON-VEG STARTERS", rate: 299 },

        { id: 1301, name: "Dal Fry", category: "VEG GRAVY", rate: 149 },
        { id: 1302, name: "Mushroom Masala", category: "VEG GRAVY", rate: 199 },
        { id: 1303, name: "Mix Veg Curry", category: "VEG GRAVY", rate: 199 },
        { id: 1304, name: "Paneer Masala", category: "VEG GRAVY", rate: 209 },
        { id: 1305, name: "Kadai Paneer", category: "VEG GRAVY", rate: 209 },
        { id: 1306, name: "Paneer Butter Masala", category: "VEG GRAVY", rate: 229 },
        { id: 1307, name: "Malai Kofta", category: "VEG GRAVY", rate: 269 },

        { id: 1401, name: "Chicken Masala", category: "NON-VEG GRAVY", rate: 279 },
        { id: 1402, name: "Butter Chicken Masala", category: "NON-VEG GRAVY", rate: 309 },
        { id: 1403, name: "Chicken Tikka Masala", category: "NON-VEG GRAVY", rate: 309 },
        { id: 1404, name: "Mutton Masala", category: "NON-VEG GRAVY", rate: 339 },
        { id: 1405, name: "Mutton Rogan Josh", category: "NON-VEG GRAVY", rate: 339 },
        { id: 1406, name: "Andhra Chicken Curry", category: "NON-VEG GRAVY", rate: 319 },
        { id: 1407, name: "Kerala Fish Curry", category: "NON-VEG GRAVY", rate: 319 },

        { id: 1501, name: "Steam Rice", category: "RICE", rate: 139 },
        { id: 1502, name: "Veg Pulav", category: "RICE", rate: 169 },
        { id: 1503, name: "Ghee Rice", category: "RICE", rate: 189 },
        { id: 1504, name: "Jeera Rice", category: "RICE", rate: 179 },
        { id: 1505, name: "Mushroom Pulav", category: "RICE", rate: 199 },
        { id: 1506, name: "Kashmiri Pulav", category: "RICE", rate: 219 },
        { id: 1507, name: "Cashewnut Pulav", category: "RICE", rate: 229 },

        { id: 1601, name: "Veg Noodles", category: "NOODLES", rate: 179 },
        { id: 1602, name: "Schezwan Veg Noodles", category: "NOODLES", rate: 189 },
        { id: 1603, name: "Paneer Noodles", category: "NOODLES", rate: 219 },
        { id: 1604, name: "Gobi Noodles", category: "NOODLES", rate: 219 },
        { id: 1605, name: "Chicken Noodles", category: "NOODLES", rate: 199 },
        { id: 1606, name: "Egg Noodles", category: "NOODLES", rate: 179 },
        { id: 1607, name: "Prawn Noodles", category: "NOODLES", rate: 229 },

        { id: 1701, name: "Plain Briyani", category: "BRIYANI", rate: 159 },
        { id: 1702, name: "Egg Briyani", category: "BRIYANI", rate: 179 },
        { id: 1703, name: "Chicken Briyani", category: "BRIYANI", rate: 199 },
        { id: 1704, name: "Mix Masala Chicken Briyani", category: "BRIYANI", rate: 229 },
        { id: 1705, name: "Mutton Briyani", category: "BRIYANI", rate: 329 },
        { id: 1706, name: "Prawn Briyani", category: "BRIYANI", rate: 239 },
        { id: 1707, name: "Fish 65 Briyani", category: "BRIYANI", rate: 239 },

        { id: 1801, name: "Parotta", category: "BREADS", rate: 29 },
        { id: 1802, name: "Naan", category: "BREADS", rate: 49 },
        { id: 1803, name: "Kulcha", category: "BREADS", rate: 59 },
        { id: 1804, name: "Butter Naan", category: "BREADS", rate: 59 },
        { id: 1805, name: "Wheat Parotta", category: "BREADS", rate: 69 },
        { id: 1806, name: "Garlic Naan", category: "BREADS", rate: 79 },
        { id: 1807, name: "Kashmiri Naan", category: "BREADS", rate: 89 },

        { id: 1901, name: "Vanilla Ice Cream", category: "DESSERTS", rate: 129 },
        { id: 1902, name: "Strawberry Ice Cream", category: "DESSERTS", rate: 129 },
        { id: 1903, name: "Chocolate Ice Cream", category: "DESSERTS", rate: 129 },
        { id: 1904, name: "Falooda", category: "DESSERTS", rate: 159 },
        { id: 1905, name: "Sizzling Brownie", category: "DESSERTS", rate: 199 },

        { id: 2001, name: "Water Bottle", category: "BEVERAGES", rate: 20 },
        { id: 2002, name: "Watermelon Juice", category: "BEVERAGES", rate: 99 },
        { id: 2003, name: "Pineapple Juice", category: "BEVERAGES", rate: 99 },
        { id: 2004, name: "Orange Juice", category: "BEVERAGES", rate: 119 },
        { id: 2005, name: "Mango Juice", category: "BEVERAGES", rate: 129 },
        { id: 2006, name: "Pomegranate Juice", category: "BEVERAGES", rate: 129 }
    ];
}

// ============================================================
// DATABASE
// ============================================================

let db = null;
let dbConnected = false;

async function connectDB() {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
        console.log('⚠️ Missing DB env values. Running in demo mode.');
        dbConnected = false;
        return false;
    }

    try {
        db = mysql.createPool({
            host: DB_HOST,
            port: Number(DB_PORT) || 4000,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        });

        const [rows] = await db.query('SELECT 1 AS connected, NOW() AS time, DATABASE() AS db_name');
        console.log('✅ Database connected');
        console.log(`   Time: ${rows[0].time}`);
        console.log(`   Database: ${rows[0].db_name}`);

        dbConnected = true;
        await initTables();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('⚠️ Running in demo mode');
        dbConnected = false;
        db = null;
        return false;
    }
}

async function initTables() {
    if (!dbConnected || !db) return;

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(40) NOT NULL UNIQUE,
                table_number INT NOT NULL,
                mobile_number VARCHAR(15) NOT NULL,
                items JSON NOT NULL,
                total_before_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
                status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(80) NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                is_available BOOLEAN NOT NULL DEFAULT TRUE
            )
        `);

        const [adminRows] = await db.query(
            'SELECT id FROM admin_users WHERE username = ? LIMIT 1',
            ['ram']
        );

        if (adminRows.length === 0) {
            const passwordHash = await bcrypt.hash('123', 10);
            await db.query(
                'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                ['ram', passwordHash]
            );
            console.log('✅ Default admin created: ram / 123');
        }

        const [menuCountRows] = await db.query('SELECT COUNT(*) AS count FROM menu_items');
        if (menuCountRows[0].count === 0) {
            const menuItems = getStaticMenu().map(item => [
                item.id,
                item.name,
                item.category,
                item.rate,
                true
            ]);

            await db.query(
                'INSERT INTO menu_items (id, name, category, rate, is_available) VALUES ?',
                [menuItems]
            );

            console.log('✅ Static menu inserted');
        }

        console.log('✅ Tables ready');
    } catch (error) {
        console.error('❌ Table init failed:', error.message);
    }
}

// ============================================================
// HELPERS
// ============================================================

function generateToken(payload) {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is required');
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

function isValidMobile(value) {
    return /^[0-9]{10}$/.test(String(value || '').trim());
}

function isValidTableNumber(value) {
    const table = Number(value);
    return Number.isInteger(table) && table >= 1 && table <= 10;
}

function normalizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items
        .map(item => ({
            itemId: Number(item.itemId),
            itemName: String(item.itemName || item.name || '').trim(),
            quantity: Number(item.quantity),
            rate: Number(item.rate)
        }))
        .filter(item =>
            Number.isInteger(item.itemId) &&
            item.itemId > 0 &&
            item.itemName &&
            Number.isFinite(item.quantity) &&
            item.quantity > 0 &&
            Number.isFinite(item.rate) &&
            item.rate >= 0
        );
}

function calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plutos Restaurant Backend is running!',
        dbConnected,
        endpoints: {
            health: '/api/health',
            menu: '/api/menu',
            categories: '/api/categories',
            orders: '/api/orders (POST)',
            admin_login: '/api/admin/login (POST)',
            admin_orders: '/api/admin/orders (GET)',
            admin_stats: '/api/admin/stats (GET)',
            admin_status_update: '/api/admin/orders/:orderId/status (PUT)'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        dbConnected,
        time: new Date().toISOString(),
        message: 'Backend is running!'
    });
});

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post('/api/admin/login', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log(`Login attempt: ${username}`);

        if (dbConnected && db) {
            const [rows] = await db.query(
                'SELECT id, username, password_hash FROM admin_users WHERE username = ? LIMIT 1',
                [username]
            );

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const admin = rows[0];
            const passwordOk = await bcrypt.compare(password, admin.password_hash);

            if (!passwordOk) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = generateToken({
                id: admin.id,
                username: admin.username,
                role: 'admin'
            });

            return res.json({
                success: true,
                token,
                user: { username: admin.username }
            });
        }

        if (username === 'ram' && password === '123') {
            const token = generateToken({
                username: 'ram',
                role: 'admin'
            });

            return res.json({
                success: true,
                token,
                user: { username: 'ram' }
            });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        console.error('Admin login error:', error.message);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// ============================================================
// PUBLIC API
// ============================================================

app.get('/api/menu', async (req, res) => {
    try {
        if (dbConnected && db) {
            const [rows] = await db.query(
                'SELECT id, name, category, rate FROM menu_items WHERE is_available = TRUE ORDER BY id'
            );
            return res.json(rows);
        }

        return res.json(getStaticMenu());
    } catch (error) {
        console.error('Menu fetch error:', error.message);
        return res.json(getStaticMenu());
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        if (dbConnected && db) {
            const [rows] = await db.query(
                'SELECT DISTINCT category FROM menu_items WHERE is_available = TRUE ORDER BY category'
            );
            return res.json(rows.map(row => row.category));
        }

        const categories = [...new Set(getStaticMenu().map(item => item.category))];
        return res.json(categories);
    } catch (error) {
        console.error('Category fetch error:', error.message);
        const categories = [...new Set(getStaticMenu().map(item => item.category))];
        return res.json(categories);
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderId = String(req.body.orderId || '').trim();
        const tableNumber = Number(req.body.tableNumber);
        const mobileNumber = String(req.body.mobileNumber || '').trim();
        const items = normalizeItems(req.body.items);

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        if (!isValidTableNumber(tableNumber)) {
            return res.status(400).json({ error: 'Invalid table number (1-10 only)' });
        }

        if (!isValidMobile(mobileNumber)) {
            return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
        }

        if (items.length === 0) {
            return res.status(400).json({ error: 'At least one valid order item is required' });
        }

        const calculatedTotal = calculateTotal(items);

        console.log(`📦 Order received: ${orderId} | Table: ${tableNumber} | Total: ₹${calculatedTotal}`);

        if (dbConnected && db) {
            await db.query(
                `INSERT INTO orders
                (order_id, table_number, mobile_number, items, total_before_tax, status)
                VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [orderId, tableNumber, mobileNumber, JSON.stringify(items), calculatedTotal]
            );

            return res.json({
                success: true,
                orderId,
                totalBeforeTax: calculatedTotal,
                message: 'Order placed successfully!'
            });
        }

        return res.json({
            success: true,
            orderId,
            totalBeforeTax: calculatedTotal,
            message: 'Order placed successfully! (demo mode)'
        });
    } catch (error) {
        console.error('Order save error:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Duplicate order ID. Please try again.' });
        }

        return res.status(500).json({ error: 'Failed to save order' });
    }
});

// ============================================================
// ADMIN API
// ============================================================

app.get('/api/admin/orders', verifyToken, async (req, res) => {
    try {
        if (dbConnected && db) {
            const [rows] = await db.query(
                'SELECT * FROM orders ORDER BY created_at DESC, id DESC'
            );

            const parsedRows = rows.map(order => ({
                ...order,
                items: typeof order.items === 'string'
                    ? JSON.parse(order.items)
                    : order.items
            }));

            return res.json(parsedRows);
        }

        return res.json([]);
    } catch (error) {
        console.error('Fetch orders error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    try {
        const orderId = String(req.params.orderId || '').trim();
        const status = String(req.body.status || '').trim();

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (dbConnected && db) {
            const [result] = await db.query(
                'UPDATE orders SET status = ? WHERE order_id = ?',
                [status, orderId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.json({ success: true, orderId, status });
        }

        return res.json({ success: true, orderId, status, message: 'Status updated (demo mode)' });
    } catch (error) {
        console.error('Status update error:', error.message);
        return res.status(500).json({ error: 'Failed to update status' });
    }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
    try {
        if (dbConnected && db) {
            const [total] = await db.query('SELECT COUNT(*) AS count FROM orders');
            const [pending] = await db.query('SELECT COUNT(*) AS count FROM orders WHERE status = ?', ['Pending']);
            const [today] = await db.query('SELECT COALESCE(SUM(total_before_tax), 0) AS total FROM orders WHERE DATE(created_at) = CURDATE()');
            const [tables] = await db.query('SELECT COUNT(DISTINCT table_number) AS count FROM orders WHERE DATE(created_at) = CURDATE()');

            return res.json({
                totalOrders: Number(total[0].count) || 0,
                pendingOrders: Number(pending[0].count) || 0,
                todayRevenue: Number(today[0].total) || 0,
                activeTables: Number(tables[0].count) || 0
            });
        }

        return res.json({
            totalOrders: 0,
            pendingOrders: 0,
            todayRevenue: 0,
            activeTables: 0
        });
    } catch (error) {
        console.error('Stats error:', error.message);
        return res.status(500).json({
            totalOrders: 0,
            pendingOrders: 0,
            todayRevenue: 0,
            activeTables: 0
        });
    }
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);

    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🍽️  PLUTOS RESTAURANT BACKEND                          ║
║                                                           ║
║   ✅ Server: http://0.0.0.0:${PORT}                        ║
║   ✅ Health: /api/health                                  ║
║   ✅ Menu:   /api/menu                                    ║
║                                                           ║
║   🔐 Admin Login: ram / 123                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    await connectDB();
});
