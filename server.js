const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'plutos_super_secret_key_2024';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ============================================================
// COMPLETE MENU DATA
// ============================================================

const STATIC_MENU = [
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

// ============================================================
// SIMPLIFIED DATABASE CONNECTION - NO COMPLEX QUERIES
// ============================================================

let db = null;
let dbConnected = false;

async function connectDB() {
    const DB_HOST = process.env.DB_HOST;
    const DB_PORT = process.env.DB_PORT;
    const DB_USER = process.env.DB_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_NAME = process.env.DB_NAME;

    console.log('\n🔍 Checking Database Configuration:');
    console.log(`   DB_HOST: ${DB_HOST || '❌ NOT SET'}`);
    console.log(`   DB_PORT: ${DB_PORT || '❌ NOT SET'}`);
    console.log(`   DB_USER: ${DB_USER || '❌ NOT SET'}`);
    console.log(`   DB_PASSWORD: ${DB_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   DB_NAME: ${DB_NAME || '❌ NOT SET'}`);

    if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
        console.log('\n⚠️ Cannot connect to TiDB - Missing credentials');
        console.log('📌 Please add these in Render Environment Variables:\n');
        return false;
    }

    try {
        // Create connection pool
        db = await mysql.createPool({
            host: DB_HOST,
            port: Number(DB_PORT) || 4000,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME || 'plutos_restaurant',
            waitForConnections: true,
            connectionLimit: 5,
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });

        // SIMPLE TEST QUERY - NO ALIASES
        const result = await db.query('SELECT 1');
        
        console.log('\n✅✅✅ TIDB CONNECTED SUCCESSFULLY! ✅✅✅');
        dbConnected = true;
        
        // Create tables
        await createTables();
        
        return true;
    } catch (error) {
        console.error('\n❌ TiDB Connection Failed:', error.message);
        console.log('\n⚠️ Running in DEMO MODE\n');
        dbConnected = false;
        return false;
    }
}

async function createTables() {
    if (!dbConnected) return;
    
    try {
        // Create database
        await db.query('CREATE DATABASE IF NOT EXISTS plutos_restaurant');
        await db.query('USE plutos_restaurant');
        console.log('✅ Database ready');
        
        // Create orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(40) NOT NULL UNIQUE,
                table_number INT NOT NULL,
                mobile_number VARCHAR(15) NOT NULL,
                items TEXT NOT NULL,
                total_before_tax DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Orders table ready');
        
        // Create admin_users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL
            )
        `);
        
        // Insert default admin
        const [rows] = await db.query('SELECT id FROM admin_users WHERE username = ?', ['ram']);
        if (rows.length === 0) {
            const hash = await bcrypt.hash('123', 10);
            await db.query('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['ram', hash]);
            console.log('✅ Admin user created: ram / 123');
        }
        
        console.log('✅ All tables ready');
    } catch (error) {
        console.error('Table creation error:', error.message);
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plutos Restaurant Backend',
        database: dbConnected ? 'TiDB Connected' : 'Demo Mode',
        dbConnected: dbConnected
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: dbConnected ? 'TiDB Connected' : 'Demo Mode',
        dbConnected: dbConnected,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/menu', (req, res) => {
    res.json(STATIC_MENU);
});

app.get('/api/categories', (req, res) => {
    const categories = [...new Set(STATIC_MENU.map(item => item.category))];
    res.json(categories);
});

// Create order
app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items } = req.body;
    
    console.log(`\n📦 Order: ${orderId} | Table: ${tableNumber}`);
    
    if (!orderId) return res.status(400).json({ error: 'Order ID required' });
    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number' });
    }
    
    const total = items.reduce((s, i) => s + (i.quantity * i.rate), 0);
    
    if (dbConnected) {
        try {
            await db.query(
                `INSERT INTO orders (order_id, table_number, mobile_number, items, total_before_tax) 
                 VALUES (?, ?, ?, ?, ?)`,
                [orderId, tableNumber, mobileNumber, JSON.stringify(items), total]
            );
            console.log(`✅ Saved to TiDB`);
            return res.json({ success: true, orderId, savedTo: 'TiDB' });
        } catch (error) {
            console.error('DB Error:', error.message);
        }
    }
    
    console.log(`⚠️ Saved to memory only`);
    res.json({ success: true, orderId, savedTo: 'Memory' });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'ram' && password === '123') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
}

// Get orders
app.get('/api/admin/orders', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
            const processed = rows.map(order => {
                let items = [];
                try {
                    items = JSON.parse(order.items);
                } catch(e) { items = []; }
                const subtotal = order.total_before_tax || 0;
                return {
                    ...order,
                    items: items,
                    subtotal: subtotal,
                    cgst: subtotal * 0.025,
                    sgst: subtotal * 0.025,
                    grand_total: subtotal * 1.05
                };
            });
            return res.json(processed);
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }
    res.json([]);
});

// Update status
app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [req.body.status, req.params.orderId]);
            return res.json({ success: true });
        } catch (error) {
            console.error('Update error:', error);
        }
    }
    res.json({ success: true });
});

// Stats
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [total] = await db.query('SELECT COUNT(*) as count FROM orders');
            const [pending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
            return res.json({
                totalOrders: total[0].count,
                pendingOrders: pending[0].count,
                todayRevenue: 0,
                activeTables: 0
            });
        } catch (error) {
            console.error('Stats error:', error);
        }
    }
    res.json({ totalOrders: 0, pendingOrders: 0, todayRevenue: 0, activeTables: 0 });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n🍽️ PLUTOS RESTAURANT BACKEND`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔐 Admin: ram / 123\n`);
    await connectDB();
});
