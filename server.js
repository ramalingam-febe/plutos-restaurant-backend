const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Enable CORS for all origins (important for Netlify to Render)
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Health check endpoint (test if backend is alive)
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Plutos Backend is running!',
        endpoints: ['/api/health', '/api/menu', '/api/orders', '/api/admin/login']
    });
});

// TiDB Database Connection
let db = null;
let dbConnected = false;

async function connectDB() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
            port: parseInt(process.env.DB_PORT) || 4000,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'plutos_restaurant',
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
            waitForConnections: true,
            connectionLimit: 5
        });
        db = pool.promise();
        
        // Test connection
        const [result] = await db.query('SELECT 1 as connected, NOW() as time, DATABASE() as db');
        console.log('✅ TiDB Connected!');
        console.log(`   Time: ${result[0].time}`);
        console.log(`   Database: ${result[0].db}`);
        dbConnected = true;
        
        // Create tables if not exist
        await initTables();
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection Failed:', error.message);
        console.log('⚠️ Running in demo mode (data will not persist)');
        dbConnected = false;
        return false;
    }
}

async function initTables() {
    if (!dbConnected) return;
    try {
        // Orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(20) NOT NULL UNIQUE,
                table_number INT NOT NULL,
                mobile_number VARCHAR(15) NOT NULL,
                items JSON NOT NULL,
                total_before_tax DECIMAL(10,2) NOT NULL,
                status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_id (order_id),
                INDEX idx_table (table_number)
            )
        `);
        console.log('✅ Orders table ready');
        
        // Admin users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL
            )
        `);
        
        // Insert default admin if not exists
        const [admin] = await db.query('SELECT id FROM admin_users WHERE username = ?', ['ram']);
        if (admin.length === 0) {
            const hashedPassword = await bcrypt.hash('123', 10);
            await db.query('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['ram', hashedPassword]);
            console.log('✅ Default admin created: ram / 123');
        }
        
        // Menu items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                is_available BOOLEAN DEFAULT TRUE
            )
        `);
        
        // Insert default menu if empty
        const [menuCount] = await db.query('SELECT COUNT(*) as count FROM menu_items');
        if (menuCount[0].count === 0) {
            const menuItems = [
                [101, 'Idli', 'Breakfast', 40], [102, 'Dosa', 'Breakfast', 60],
                [103, 'Vada', 'Breakfast', 35], [104, 'Pongal', 'Breakfast', 70],
                [105, 'Coffee', 'Beverages', 25], [106, 'Tea', 'Beverages', 20],
                [107, 'Fresh Lime', 'Beverages', 45], [201, 'Veg Thali', 'Lunch', 120],
                [202, 'Chicken Biryani', 'Lunch', 180], [203, 'Mutton Biryani', 'Lunch', 250],
                [301, 'Grill Platter', 'Dinner', 250], [302, 'Butter Naan', 'Dinner', 35],
                [303, 'Paneer Butter Masala', 'Dinner', 160], [401, 'Gulab Jamun', 'Desserts', 50],
                [402, 'Ice Cream', 'Desserts', 70], [501, 'Paneer Tikka', 'Starters', 160],
                [502, 'Spring Rolls', 'Starters', 90]
            ];
            await db.query('INSERT INTO menu_items (id, name, category, rate) VALUES ?', [menuItems]);
            console.log('✅ Default menu inserted');
        }
        
        console.log('✅ All tables initialized');
    } catch (error) {
        console.error('Table init error:', error.message);
    }
}

// ========== HEALTH CHECK ==========
app.get('/api/health', async (req, res) => {
    if (dbConnected) {
        try {
            const [result] = await db.query('SELECT NOW() as time');
            res.json({ status: 'healthy', database: 'TiDB', time: result[0].time, message: 'Backend is running!' });
        } catch (error) {
            res.json({ status: 'healthy', database: 'TiDB (connection issue)', message: 'Backend is running but DB has issues' });
        }
    } else {
        res.json({ status: 'healthy', database: 'Demo Mode', message: 'Backend is running! (No database connection)' });
    }
});

// ========== PUBLIC API ==========
app.get('/api/menu', async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT id, name, category, rate FROM menu_items WHERE is_available = TRUE ORDER BY id');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch menu' });
        }
    } else {
        // Fallback menu
        res.json([
            { id: 101, name: "Idli", category: "Breakfast", rate: 40 },
            { id: 102, name: "Dosa", category: "Breakfast", rate: 60 },
            { id: 105, name: "Coffee", category: "Beverages", rate: 25 },
            { id: 201, name: "Veg Thali", category: "Lunch", rate: 120 },
            { id: 301, name: "Grill Platter", category: "Dinner", rate: 250 },
            { id: 401, name: "Gulab Jamun", category: "Desserts", rate: 50 }
        ]);
    }
});

app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items, totalBeforeTax } = req.body;
    
    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number (1-10 only)' });
    }
    
    if (dbConnected) {
        try {
            await db.query(
                `INSERT INTO orders (order_id, table_number, mobile_number, items, total_before_tax, status) 
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [orderId, tableNumber, mobileNumber, JSON.stringify(items), totalBeforeTax]
            );
            res.json({ success: true, orderId, message: 'Order placed successfully!' });
        } catch (error) {
            console.error('Save error:', error);
            res.status(500).json({ error: 'Database error: ' + error.message });
        }
    } else {
        // Demo mode - save to memory
        console.log('Demo mode - order saved:', orderId);
        res.json({ success: true, orderId, message: 'Order placed (demo mode)!' });
    }
});

// ========== ADMIN API ==========
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
            if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
            
            const isValid = await bcrypt.compare(password, rows[0].password_hash);
            if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
            
            const token = jwt.sign({ id: rows[0].id, username }, process.env.JWT_SECRET || 'plutos_secret', { expiresIn: '24h' });
            res.json({ success: true, token, user: { username } });
        } catch (error) {
            res.status(500).json({ error: 'Login failed' });
        }
    } else {
        // Demo mode
        if (username === 'ram' && password === '123') {
            const token = jwt.sign({ username: 'ram' }, 'plutos_secret', { expiresIn: '24h' });
            res.json({ success: true, token, user: { username: 'ram' } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    }
});

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'plutos_secret');
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

app.get('/api/admin/orders', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
            rows.forEach(order => {
                order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            });
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    } else {
        res.json([]);
    }
});

app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    if (!dbConnected) {
        res.json({ success: true });
        return;
    }
    try {
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.orderId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (!dbConnected) {
        res.json({ totalOrders: 0, pendingOrders: 0, todayRevenue: 0, activeTables: 0 });
        return;
    }
    try {
        const [total] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [pending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
        const [today] = await db.query('SELECT COALESCE(SUM(total_before_tax), 0) as total FROM orders WHERE DATE(created_at) = CURDATE()');
        const [tables] = await db.query('SELECT COUNT(DISTINCT table_number) as count FROM orders WHERE DATE(created_at) = CURDATE()');
        
        res.json({
            totalOrders: total[0].count,
            pendingOrders: pending[0].count,
            todayRevenue: today[0].total,
            activeTables: tables[0].count
        });
    } catch (error) {
        res.json({ totalOrders: 0, pendingOrders: 0, todayRevenue: 0, activeTables: 0 });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🍽️  PLUTOS RESTAURANT BACKEND                          ║
║                                                           ║
║   ✅ Server: http://localhost:${PORT}                       ║
║   ✅ Health: http://localhost:${PORT}/api/health            ║
║   ✅ Menu:   http://localhost:${PORT}/api/menu              ║
║                                                           ║
║   🔐 Admin Login: ram / 123                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
});
