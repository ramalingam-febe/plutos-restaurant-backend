// ============================================================
// PLUTOS RESTAURANT - BACKEND API SERVER
// ============================================================

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// TIDB DATABASE CONNECTION
// ============================================================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10
});

const db = pool.promise();

// Test connection on startup
async function testConnection() {
    try {
        const [result] = await db.query('SELECT NOW() as time, DATABASE() as db');
        console.log('✅ TiDB Connected!');
        console.log(`   Time: ${result[0].time}`);
        console.log(`   Database: ${result[0].db}`);
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection Failed:', error.message);
        return false;
    }
}

// ============================================================
// HEALTH CHECK (Test if backend is working)
// ============================================================
app.get('/api/health', async (req, res) => {
    try {
        const [result] = await db.query('SELECT NOW() as time');
        res.json({
            status: 'healthy',
            database: 'TiDB',
            time: result[0].time,
            message: 'Backend is running!'
        });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

// ============================================================
// PUBLIC API - CUSTOMER ENDPOINTS
// ============================================================

// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, category, rate FROM menu_items WHERE is_available = TRUE ORDER BY id'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Get categories
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT category FROM menu_items ORDER BY category');
        res.json(rows.map(r => r.category));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create new order
app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items, totalBeforeTax } = req.body;
    
    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number (1-10 only)' });
    }
    
    try {
        await db.query(
            `INSERT INTO orders (order_id, table_number, mobile_number, items, total_before_tax, status) 
             VALUES (?, ?, ?, ?, ?, 'Pending')`,
            [orderId, tableNumber, mobileNumber, JSON.stringify(items), totalBeforeTax]
        );
        res.json({ success: true, orderId, message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Save order error:', error);
        res.status(500).json({ error: 'Failed to save order' });
    }
});

// Get order status
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [req.params.orderId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        rows[0].items = JSON.parse(rows[0].items);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// ============================================================
// ADMIN API - PROTECTED ENDPOINTS
// ============================================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: rows[0].id, username: rows[0].username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ success: true, token, user: { username: rows[0].username } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// Get all orders (Admin only)
app.get('/api/admin/orders', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        rows.forEach(order => {
            order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status
app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    
    if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.orderId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Get dashboard stats
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [pending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
        const [today] = await db.query(
            'SELECT COALESCE(SUM(total_before_tax), 0) as total FROM orders WHERE DATE(created_at) = CURDATE()'
        );
        const [tables] = await db.query(
            'SELECT COUNT(DISTINCT table_number) as count FROM orders WHERE DATE(created_at) = CURDATE()'
        );
        
        res.json({
            totalOrders: total[0].count,
            pendingOrders: pending[0].count,
            todayRevenue: today[0].total,
            activeTables: tables[0].count
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    const connected = await testConnection();
    if (connected) {
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🍽️  PLUTOS RESTAURANT BACKEND                          ║
║                                                           ║
║   ✅ Server: http://localhost:${PORT}                       ║
║   ✅ API:    http://localhost:${PORT}/api                   ║
║   ✅ Health: http://localhost:${PORT}/api/health            ║
║                                                           ║
║   🔐 Admin Login: ram / 123                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });
    } else {
        console.error('❌ Cannot start: Database connection failed');
        process.exit(1);
    }
}

startServer();
