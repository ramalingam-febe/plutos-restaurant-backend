// server.js - Single backend for both Customer & Admin pages
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors()); // Allows both frontend URLs to call this API
app.use(express.json());

// ============================================================
// 1. TIDB DATABASE CONNECTION (SINGLE DATABASE)
// ============================================================
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10
};

const pool = mysql.createPool(dbConfig);
const db = pool.promise();

// Test & Initialize DB
async function initDB() {
    try {
        await db.query('SELECT 1');
        console.log('✅ TiDB Connected!');
        
        // Create tables if not exists
        await db.query(`CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(20) UNIQUE NOT NULL,
            table_number INT NOT NULL,
            mobile_number VARCHAR(15) NOT NULL,
            items JSON NOT NULL,
            total_before_tax DECIMAL(10,2) NOT NULL,
            status ENUM('Pending', 'Completed') DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        await db.query(`CREATE TABLE IF NOT EXISTS admin_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL
        )`);
        
        // Insert default admin (ram/123) if not exists
        const [admin] = await db.query('SELECT id FROM admin_users WHERE username = "ram"');
        if (admin.length === 0) {
            const hashedPassword = await bcrypt.hash('123', 10);
            await db.query('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['ram', hashedPassword]);
            console.log('✅ Default admin user created');
        }
        
        console.log('✅ Database tables ready');
    } catch (err) {
        console.error('DB Init Error:', err.message);
    }
}
initDB();

// ============================================================
// 2. API ENDPOINTS (USED BY BOTH CUSTOMER & ADMIN SITES)
// ============================================================

// --- Public Routes (Customer) ---
app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items, totalBeforeTax } = req.body;
    try {
        await db.query(
            `INSERT INTO orders (order_id, table_number, mobile_number, items, total_before_tax) 
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, tableNumber, mobileNumber, JSON.stringify(items), totalBeforeTax]
        );
        res.json({ success: true, orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin Routes (Protected) ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, rows[0].password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'plutos_secret', { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to protect admin routes
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'plutos_secret');
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
    }
}

app.get('/api/admin/orders', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        rows.forEach(order => order.items = JSON.parse(order.items));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    try {
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.orderId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [pending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
        const [today] = await db.query(`SELECT COALESCE(SUM(total_before_tax),0) as sum FROM orders WHERE DATE(created_at) = CURDATE()`);
        res.json({ totalOrders: total[0].count, pendingOrders: pending[0].count, todayRevenue: today[0].sum });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 3. START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📍 API Base URL: https://plutos-backend.onrender.com/api`);
});