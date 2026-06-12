const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================================
// CORS
// ============================================================

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

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
// HEALTH CHECK ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plutos Restaurant Backend is running!',
        endpoints: {
            health: '/api/health',
            menu: '/api/menu',
            categories: '/api/categories',
            orders: '/api/orders (POST)',
            admin_login: '/api/admin/login (POST)',
            admin_orders: '/api/admin/orders (GET)',
            admin_stats: '/api/admin/stats (GET)'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        time: new Date().toISOString(),
        message: 'Backend is running!'
    });
});

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    console.log(`Login attempt: ${username}`);

    if (username === 'ram' && password === '123') {
        const token = jwt.sign(
            { username: 'ram', role: 'admin' },
            process.env.JWT_SECRET || 'plutos_secret_key_2024',
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            token,
            user: { username: 'ram' }
        });
    }

    return res.status(401).json({ error: 'Invalid credentials. Use: ram / 123' });
});

// ============================================================
// DATABASE CONNECTION
// ============================================================

let db = null;
let dbConnected = false;

async function connectDB() {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.log('⚠️ No database credentials found. Running in demo mode.');
        dbConnected = false;
        return false;
    }

    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10) || 4000,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'plutos_restaurant',
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
            waitForConnections: true,
            connectionLimit: 5
        });

        db = pool.promise();

        const [result] = await db.query('SELECT 1 AS connected, NOW() AS time, DATABASE() AS db');
        console.log('✅ TiDB Connected!');
        console.log(`   Time: ${result[0].time}`);
        console.log(`   Database: ${result[0].db}`);

        dbConnected = true;
        await initTables();
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection Failed:', error.message);
        console.log('⚠️ Running in demo mode (data will not persist to database)');
        dbConnected = false;
        return false;
    }
}

async function initTables() {
    if (!dbConnected) return;

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(30) NOT NULL UNIQUE,
                table_number INT NOT NULL,
                mobile_number VARCHAR(15) NOT NULL,
                items JSON NOT NULL,
                total_before_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
                status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Orders table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL
            )
        `);

        const [admin] = await db.query('SELECT id FROM admin_users WHERE username = ?', ['ram']);
        if (admin.length === 0) {
            const hashedPassword = await bcrypt.hash('123', 10);
            await db.query(
                'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                ['ram', hashedPassword]
            );
            console.log('✅ Default admin created in DB: ram / 123');
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(80) NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                is_available BOOLEAN DEFAULT TRUE
            )
        `);

        const [menuCount] = await db.query('SELECT COUNT(*) AS count FROM menu_items');

        if (menuCount[0].count === 0) {
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

            console.log('✅ Updated menu inserted');
        }

        console.log('✅ All tables initialized');
    } catch (error) {
        console.error('Table init warning:', error.message);
        console.log('⚠️ Continuing in demo mode for tables');
    }
}

// ============================================================
// PUBLIC API
// ============================================================

app.get('/api/menu', async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query(
                'SELECT id, name, category, rate FROM menu_items WHERE is_available = TRUE ORDER BY id'
            );
            return res.json(rows);
        } catch (error) {
            console.error('Menu fetch DB error:', error.message);
            return res.json(getStaticMenu());
        }
    }

    return res.json(getStaticMenu());
});

app.get('/api/categories', async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query(
                'SELECT DISTINCT category FROM menu_items WHERE is_available = TRUE ORDER BY category'
            );
            return res.json(rows.map(row => row.category));
        } catch (error) {
            console.error('Category fetch DB error:', error.message);
        }
    }

    const categories = [...new Set(getStaticMenu().map(i => i.category))];
    return res.json(categories);
});

app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items, totalBeforeTax } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number (1-10 only)' });
    }

    if (!mobileNumber || !/^[0-9]{10}$/.test(String(mobileNumber))) {
        return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one order item is required' });
    }

    const calculatedTotal = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return sum + (qty * rate);
    }, 0);

    const finalTotal = typeof totalBeforeTax === 'number' ? totalBeforeTax : calculatedTotal;

    console.log(`📦 Order received: ${orderId} | Table: ${tableNumber} | Total: ₹${finalTotal}`);

    if (dbConnected) {
        try {
            await db.query(
                `INSERT INTO orders
                (order_id, table_number, mobile_number, items, total_before_tax, status)
                VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [orderId, tableNumber, mobileNumber, JSON.stringify(items), finalTotal]
            );

            return res.json({
                success: true,
                orderId,
                message: 'Order placed successfully!'
            });
        } catch (error) {
            console.error('Save error:', error.message);
            return res.status(500).json({
                error: 'Failed to save order'
            });
        }
    }

    return res.json({
        success: true,
        orderId,
        message: 'Order placed successfully! (demo mode)'
    });
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'plutos_secret_key_2024'
        );
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ============================================================
// ADMIN API
// ============================================================

app.get('/api/admin/orders', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');

            const parsedRows = rows.map(order => ({
                ...order,
                items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            }));

            return res.json(parsedRows);
        } catch (error) {
            console.error('Fetch orders error:', error.message);
            return res.json([]);
        }
    }

    return res.json([]);
});

app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;

    if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    if (dbConnected) {
        try {
            await db.query(
                'UPDATE orders SET status = ? WHERE order_id = ?',
                [status, req.params.orderId]
            );

            return res.json({ success: true });
        } catch (error) {
            console.error('Status update error:', error.message);
            return res.status(500).json({ error: 'Failed to update status' });
        }
    }

    return res.json({ success: true, message: 'Status updated (demo mode)' });
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [total] = await db.query('SELECT COUNT(*) AS count FROM orders');
            const [pending] = await db.query('SELECT COUNT(*) AS count FROM orders WHERE status = "Pending"');
            const [today] = await db.query('SELECT COALESCE(SUM(total_before_tax), 0) AS total FROM orders WHERE DATE(created_at) = CURDATE()');
            const [tables] = await db.query('SELECT COUNT(DISTINCT table_number) AS count FROM orders WHERE DATE(created_at) = CURDATE()');

            return res.json({
                totalOrders: total[0].count,
                pendingOrders: pending[0].count,
                todayRevenue: Number(today[0].total) || 0,
                activeTables: tables[0].count
            });
        } catch (error) {
            console.error('Stats error:', error.message);
            return res.json({
                totalOrders: 0,
                pendingOrders: 0,
                todayRevenue: 0,
                activeTables: 0
            });
        }
    }

    return res.json({
        totalOrders: 0,
        pendingOrders: 0,
        todayRevenue: 0,
        activeTables: 0
    });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🍽️  PLUTOS RESTAURANT BACKEND                          ║
║                                                           ║
║   ✅ Server: http://0.0.0.0:${PORT}                        ║
║   ✅ Health: http://localhost:${PORT}/api/health           ║
║   ✅ Menu:   http://localhost:${PORT}/api/menu             ║
║                                                           ║
║   🔐 Admin Login: ram / 123                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    await connectDB();
});
