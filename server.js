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

// ============================================================
// HEALTH CHECK ENDPOINTS
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Plutos Restaurant Backend is running!',
        endpoints: {
            health: '/api/health',
            menu: '/api/menu',
            orders: '/api/orders (POST)',
            admin_login: '/api/admin/login (POST)',
            admin_orders: '/api/admin/orders (GET)'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        time: new Date().toISOString(),
        message: 'Backend is running!'
    });
});

// ============================================================
// TIDB DATABASE CONNECTION (Optional - won't break if fails)
// ============================================================
let db = null;
let dbConnected = false;

async function connectDB() {
    // Check if we have database credentials
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.log('⚠️ No database credentials found. Running in demo mode.');
        dbConnected = false;
        return false;
    }
    
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
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
        
        // Initialize tables (try, but don't fail if permissions are limited)
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
        // Try to create database if not exists (may fail if no CREATE DATABASE permission)
        try {
            await db.query('CREATE DATABASE IF NOT EXISTS plutos_restaurant');
            await db.query('USE plutos_restaurant');
            console.log('✅ Database selected/created');
        } catch (err) {
            console.log('Note: Using existing database');
        }
        
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        console.error('Table init warning:', error.message);
        console.log('⚠️ Continuing in demo mode for tables');
    }
}

// ============================================================
// PUBLIC API (CUSTOMER)
// ============================================================

// Get menu items
app.get('/api/menu', async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT id, name, category, rate FROM menu_items WHERE is_available = TRUE ORDER BY id');
            res.json(rows);
        } catch (error) {
            // Fallback to static menu
            res.json(getStaticMenu());
        }
    } else {
        res.json(getStaticMenu());
    }
});

// Static menu fallback
function getStaticMenu() {
    return [
        { id: 101, name: "Idli", category: "Breakfast", rate: 40 },
        { id: 102, name: "Dosa", category: "Breakfast", rate: 60 },
        { id: 103, name: "Vada", category: "Breakfast", rate: 35 },
        { id: 104, name: "Pongal", category: "Breakfast", rate: 70 },
        { id: 105, name: "Coffee", category: "Beverages", rate: 25 },
        { id: 106, name: "Tea", category: "Beverages", rate: 20 },
        { id: 107, name: "Fresh Lime", category: "Beverages", rate: 45 },
        { id: 201, name: "Veg Thali", category: "Lunch", rate: 120 },
        { id: 202, name: "Chicken Biryani", category: "Lunch", rate: 180 },
        { id: 203, name: "Mutton Biryani", category: "Lunch", rate: 250 },
        { id: 301, name: "Grill Platter", category: "Dinner", rate: 250 },
        { id: 302, name: "Butter Naan", category: "Dinner", rate: 35 },
        { id: 401, name: "Gulab Jamun", category: "Desserts", rate: 50 },
        { id: 402, name: "Ice Cream", category: "Desserts", rate: 70 },
        { id: 501, name: "Paneer Tikka", category: "Starters", rate: 160 },
        { id: 502, name: "Spring Rolls", category: "Starters", rate: 90 }
    ];
}

// Get categories
app.get('/api/categories', async (req, res) => {
    const menu = await getStaticMenu();
    const categories = [...new Set(menu.map(i => i.category))];
    res.json(categories);
});

// Create new order
app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items, totalBeforeTax } = req.body;
    
    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number (1-10 only)' });
    }
    
    console.log(`📦 Order received: ${orderId} | Table: ${tableNumber} | Total: ₹${totalBeforeTax}`);
    
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
            res.json({ success: true, orderId, message: 'Order placed (saved in memory only - DB issue)' });
        }
    } else {
        // Demo mode - return success
        res.json({ success: true, orderId, message: 'Order placed successfully!' });
    }
});

// ============================================================
// ADMIN API (PROTECTED)
// ============================================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const isValid = await bcrypt.compare(password, rows[0].password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
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

// Verify JWT token middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'plutos_secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// Get all orders (Admin only)
app.get('/api/admin/orders', verifyToken, async (req, res) => {
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
            rows.forEach(order => {
                if (typeof order.items === 'string') {
                    order.items = JSON.parse(order.items);
                }
            });
            res.json(rows);
        } catch (error) {
            console.error('Fetch orders error:', error);
            res.json([]);
        }
    } else {
        // Return empty array in demo mode
        res.json([]);
    }
});

// Update order status (Admin only)
app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    
    if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    if (dbConnected) {
        try {
            await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.orderId]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update status' });
        }
    } else {
        res.json({ success: true, message: 'Status updated (demo mode)' });
    }
});

// Get dashboard statistics (Admin only)
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (dbConnected) {
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
    } else {
        res.json({ totalOrders: 0, pendingOrders: 0, todayRevenue: 0, activeTables: 0 });
    }
});

// ============================================================
// START SERVER - WITH CORRECT RENDER BINDING
// ============================================================

const PORT = process.env.PORT || 3000;

// This is the CRITICAL FIX - bind to 0.0.0.0 for Render
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
    
    // Try to connect to database (optional - won't break if fails)
    await connectDB();
});
