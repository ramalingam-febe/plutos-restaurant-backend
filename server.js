const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'plutos_super_secret_key_2024';

// CORS Configuration - Allow all origins for production
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ============================================================
// COMPLETE RESTAURANT DETAILS
// ============================================================

const RESTAURANT_INFO = {
    name: "PLUTOS RESTAURANT",
    tagline: "Multicuisine Restaurant",
    address: "4, Khan Street, Choolaimedu, Chennai - 600094",
    phone: "9176379176",
    gstin: "33AABCD1234F1Z5",
    fssai: "12345678901234"
};

// ============================================================
// COMPLETE MENU DATA (74 Items - Perfect Match)
// ============================================================

const STATIC_MENU = [
    // SOUPS (7 items)
    { id: 1001, name: "Sweet Corn Soup (Veg)", category: "SOUPS", rate: 109 },
    { id: 1002, name: "Hot & Sour Soup (Veg)", category: "SOUPS", rate: 109 },
    { id: 1003, name: "Veg Clear Soup", category: "SOUPS", rate: 109 },
    { id: 1004, name: "Manchow Soup (Veg)", category: "SOUPS", rate: 119 },
    { id: 1005, name: "Sweet Corn Chicken Soup", category: "SOUPS", rate: 129 },
    { id: 1006, name: "Hot & Sour Chicken Soup", category: "SOUPS", rate: 129 },
    { id: 1007, name: "Chicken Clear Soup", category: "SOUPS", rate: 119 },
    // VEG STARTERS (7 items)
    { id: 1101, name: "Gobi 65", category: "VEG STARTERS", rate: 199 },
    { id: 1102, name: "Paneer 65", category: "VEG STARTERS", rate: 209 },
    { id: 1103, name: "Crispy Fried Veg", category: "VEG STARTERS", rate: 199 },
    { id: 1104, name: "Veg Manchurian", category: "VEG STARTERS", rate: 199 },
    { id: 1105, name: "Chilli Paneer", category: "VEG STARTERS", rate: 219 },
    { id: 1106, name: "Honey Gobi Fry", category: "VEG STARTERS", rate: 209 },
    { id: 1107, name: "Veg Lollipop", category: "VEG STARTERS", rate: 229 },
    // NON-VEG STARTERS (7 items)
    { id: 1201, name: "Chicken 65", category: "NON-VEG STARTERS", rate: 239 },
    { id: 1202, name: "Chicken Lollipop", category: "NON-VEG STARTERS", rate: 289 },
    { id: 1203, name: "Chicken Drumstick", category: "NON-VEG STARTERS", rate: 289 },
    { id: 1204, name: "Ginger Chicken", category: "NON-VEG STARTERS", rate: 279 },
    { id: 1205, name: "Garlic Chicken", category: "NON-VEG STARTERS", rate: 279 },
    { id: 1206, name: "Dragon Chicken", category: "NON-VEG STARTERS", rate: 289 },
    { id: 1207, name: "Fish Finger", category: "NON-VEG STARTERS", rate: 299 },
    // VEG GRAVY (7 items)
    { id: 1301, name: "Dal Fry", category: "VEG GRAVY", rate: 149 },
    { id: 1302, name: "Mushroom Masala", category: "VEG GRAVY", rate: 199 },
    { id: 1303, name: "Mix Veg Curry", category: "VEG GRAVY", rate: 199 },
    { id: 1304, name: "Paneer Masala", category: "VEG GRAVY", rate: 209 },
    { id: 1305, name: "Kadai Paneer", category: "VEG GRAVY", rate: 209 },
    { id: 1306, name: "Paneer Butter Masala", category: "VEG GRAVY", rate: 229 },
    { id: 1307, name: "Malai Kofta", category: "VEG GRAVY", rate: 269 },
    // NON-VEG GRAVY (7 items)
    { id: 1401, name: "Chicken Masala", category: "NON-VEG GRAVY", rate: 279 },
    { id: 1402, name: "Butter Chicken Masala", category: "NON-VEG GRAVY", rate: 309 },
    { id: 1403, name: "Chicken Tikka Masala", category: "NON-VEG GRAVY", rate: 309 },
    { id: 1404, name: "Mutton Masala", category: "NON-VEG GRAVY", rate: 339 },
    { id: 1405, name: "Mutton Rogan Josh", category: "NON-VEG GRAVY", rate: 339 },
    { id: 1406, name: "Andhra Chicken Curry", category: "NON-VEG GRAVY", rate: 319 },
    { id: 1407, name: "Kerala Fish Curry", category: "NON-VEG GRAVY", rate: 319 },
    // RICE (7 items)
    { id: 1501, name: "Steam Rice", category: "RICE", rate: 139 },
    { id: 1502, name: "Veg Pulav", category: "RICE", rate: 169 },
    { id: 1503, name: "Ghee Rice", category: "RICE", rate: 189 },
    { id: 1504, name: "Jeera Rice", category: "RICE", rate: 179 },
    { id: 1505, name: "Mushroom Pulav", category: "RICE", rate: 199 },
    { id: 1506, name: "Kashmiri Pulav", category: "RICE", rate: 219 },
    { id: 1507, name: "Cashewnut Pulav", category: "RICE", rate: 229 },
    // NOODLES (7 items)
    { id: 1601, name: "Veg Noodles", category: "NOODLES", rate: 179 },
    { id: 1602, name: "Schezwan Veg Noodles", category: "NOODLES", rate: 189 },
    { id: 1603, name: "Paneer Noodles", category: "NOODLES", rate: 219 },
    { id: 1604, name: "Gobi Noodles", category: "NOODLES", rate: 219 },
    { id: 1605, name: "Chicken Noodles", category: "NOODLES", rate: 199 },
    { id: 1606, name: "Egg Noodles", category: "NOODLES", rate: 179 },
    { id: 1607, name: "Prawn Noodles", category: "NOODLES", rate: 229 },
    // BRIYANI (7 items)
    { id: 1701, name: "Plain Briyani", category: "BRIYANI", rate: 159 },
    { id: 1702, name: "Egg Briyani", category: "BRIYANI", rate: 179 },
    { id: 1703, name: "Chicken Briyani", category: "BRIYANI", rate: 199 },
    { id: 1704, name: "Mix Masala Chicken Briyani", category: "BRIYANI", rate: 229 },
    { id: 1705, name: "Mutton Briyani", category: "BRIYANI", rate: 329 },
    { id: 1706, name: "Prawn Briyani", category: "BRIYANI", rate: 239 },
    { id: 1707, name: "Fish 65 Briyani", category: "BRIYANI", rate: 239 },
    // BREADS (7 items)
    { id: 1801, name: "Parotta", category: "BREADS", rate: 29 },
    { id: 1802, name: "Naan", category: "BREADS", rate: 49 },
    { id: 1803, name: "Kulcha", category: "BREADS", rate: 59 },
    { id: 1804, name: "Butter Naan", category: "BREADS", rate: 59 },
    { id: 1805, name: "Wheat Parotta", category: "BREADS", rate: 69 },
    { id: 1806, name: "Garlic Naan", category: "BREADS", rate: 79 },
    { id: 1807, name: "Kashmiri Naan", category: "BREADS", rate: 89 },
    // DESSERTS (5 items)
    { id: 1901, name: "Vanilla Ice Cream", category: "DESSERTS", rate: 129 },
    { id: 1902, name: "Strawberry Ice Cream", category: "DESSERTS", rate: 129 },
    { id: 1903, name: "Chocolate Ice Cream", category: "DESSERTS", rate: 129 },
    { id: 1904, name: "Falooda", category: "DESSERTS", rate: 159 },
    { id: 1905, name: "Sizzling Brownie", category: "DESSERTS", rate: 199 },
    // BEVERAGES (6 items)
    { id: 2001, name: "Water Bottle", category: "BEVERAGES", rate: 20 },
    { id: 2002, name: "Watermelon Juice", category: "BEVERAGES", rate: 99 },
    { id: 2003, name: "Pineapple Juice", category: "BEVERAGES", rate: 99 },
    { id: 2004, name: "Orange Juice", category: "BEVERAGES", rate: 119 },
    { id: 2005, name: "Mango Juice", category: "BEVERAGES", rate: 129 },
    { id: 2006, name: "Pomegranate Juice", category: "BEVERAGES", rate: 129 }
];

// ============================================================
// DATABASE CONNECTION WITH COMPLETE TABLE SETUP
// ============================================================

let db = null;
let dbConnected = false;

async function connectDB() {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
        console.log('⚠️ Missing DB credentials. Running in demo mode.');
        dbConnected = false;
        return false;
    }

    try {
        db = await mysql.createPool({
            host: DB_HOST,
            port: Number(DB_PORT) || 4000,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME || 'plutos_restaurant',
            waitForConnections: true,
            connectionLimit: 10,
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });

        const [rows] = await db.query('SELECT NOW() as time, DATABASE() as db_name, USER() as current_user');
        console.log('\n✅✅✅ TIDB CONNECTED SUCCESSFULLY! ✅✅✅');
        console.log(`   Time: ${rows[0].time}`);
        console.log(`   Database: ${rows[0].db_name}`);
        console.log(`   User: ${rows[0].current_user}`);
        dbConnected = true;
        
        // Initialize all tables
        await initDatabase();
        return true;
    } catch (error) {
        console.error('\n❌ TiDB Connection Failed:', error.message);
        console.log('⚠️ Running in DEMO MODE\n');
        dbConnected = false;
        return false;
    }
}

async function initDatabase() {
    if (!dbConnected) return;
    
    try {
        // Create database if not exists
        await db.query(`CREATE DATABASE IF NOT EXISTS plutos_restaurant`);
        await db.query(`USE plutos_restaurant`);
        console.log('✅ Database selected: plutos_restaurant');
        
        // Create ORDERS table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(40) NOT NULL UNIQUE,
                table_number INT NOT NULL,
                mobile_number VARCHAR(15) NOT NULL,
                items JSON NOT NULL,
                total_before_tax DECIMAL(10,2) DEFAULT 0,
                status ENUM('Pending', 'Completed') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_id (order_id),
                INDEX idx_table (table_number),
                INDEX idx_mobile (mobile_number),
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            )
        `);
        console.log('✅ Orders table ready');
        
        // Create ADMIN_USERS table
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Admin users table ready');
        
        // Create MENU_ITEMS table
        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(80) NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                is_available BOOLEAN DEFAULT TRUE
            )
        `);
        console.log('✅ Menu items table ready');
        
        // Insert default admin if not exists
        const [adminExists] = await db.query('SELECT id FROM admin_users WHERE username = ?', ['ram']);
        if (adminExists.length === 0) {
            const hashedPassword = await bcrypt.hash('123', 10);
            await db.query('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['ram', hashedPassword]);
            console.log('✅ Default admin created: ram / 123');
        }
        
        // Insert menu items if table is empty
        const [menuCount] = await db.query('SELECT COUNT(*) as count FROM menu_items');
        if (menuCount[0].count === 0) {
            const menuValues = STATIC_MENU.map(item => [item.id, item.name, item.category, item.rate, true]);
            await db.query('INSERT INTO menu_items (id, name, category, rate, is_available) VALUES ?', [menuValues]);
            console.log(`✅ Inserted ${menuValues.length} menu items`);
        }
        
        console.log('\n✅✅ ALL DATABASE TABLES INITIALIZED SUCCESSFULLY! ✅✅\n');
        
        // Show table stats
        const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [menuItemCount] = await db.query('SELECT COUNT(*) as count FROM menu_items');
        console.log(`📊 Statistics:`);
        console.log(`   Orders: ${orderCount[0].count}`);
        console.log(`   Menu Items: ${menuItemCount[0].count}`);
        console.log(`   Admin Users: 1 (ram)\n`);
        
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plutos Restaurant Backend API',
        version: '2.0.0',
        database: dbConnected ? 'Connected to TiDB' : 'Demo Mode',
        endpoints: {
            health: '/api/health',
            menu: '/api/menu',
            categories: '/api/categories',
            orders: '/api/orders (POST)',
            admin_login: '/api/admin/login (POST)',
            admin_orders: '/api/admin/orders (GET)',
            admin_stats: '/api/admin/stats (GET)',
            update_status: '/api/admin/orders/:orderId/status (PUT)'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: dbConnected ? 'TiDB Connected' : 'Demo Mode',
        timestamp: new Date().toISOString(),
        restaurant: RESTAURANT_INFO.name
    });
});

// Get all menu items
app.get('/api/menu', (req, res) => {
    res.json(STATIC_MENU);
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const categories = [...new Set(STATIC_MENU.map(item => item.category))];
    res.json(categories);
});

// Create new order
app.post('/api/orders', async (req, res) => {
    const { orderId, tableNumber, mobileNumber, items } = req.body;
    
    console.log('\n📦 NEW ORDER RECEIVED:');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Table: ${tableNumber}`);
    console.log(`   Mobile: ${mobileNumber}`);
    console.log(`   Items: ${items.length}`);
    
    // Validation
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }
    if (!tableNumber || tableNumber < 1 || tableNumber > 10) {
        return res.status(400).json({ error: 'Invalid table number (must be 1-10)' });
    }
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
        return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
    }
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
    }
    
    const totalBeforeTax = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    console.log(`   Total: ₹${totalBeforeTax}`);
    
    // Save to TiDB
    if (dbConnected) {
        try {
            const [result] = await db.query(
                `INSERT INTO orders (order_id, table_number, mobile_number, items, total_before_tax, status) 
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [orderId, tableNumber, mobileNumber, JSON.stringify(items), totalBeforeTax]
            );
            console.log(`✅ ORDER SAVED TO TIDB! ID: ${result.insertId}`);
            return res.json({
                success: true,
                orderId: orderId,
                totalBeforeTax: totalBeforeTax,
                database: 'TiDB',
                message: 'Order saved successfully!'
            });
        } catch (error) {
            console.error('❌ Database error:', error.message);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Duplicate order ID. Please try again.' });
            }
        }
    }
    
    // Fallback to memory
    if (!global.orders) global.orders = [];
    global.orders.push({
        order_id: orderId,
        table_number: tableNumber,
        mobile_number: mobileNumber,
        items: items,
        total_before_tax: totalBeforeTax,
        status: 'Pending',
        created_at: new Date().toISOString()
    });
    console.log(`⚠️ ORDER SAVED TO MEMORY (Demo Mode)`);
    
    res.json({
        success: true,
        orderId: orderId,
        totalBeforeTax: totalBeforeTax,
        database: 'Memory (Demo)',
        message: 'Order saved in demo mode'
    });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`🔐 Admin login attempt: ${username}`);
    
    // Check database first
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
            if (rows.length > 0) {
                const isValid = await bcrypt.compare(password, rows[0].password_hash);
                if (isValid) {
                    const token = jwt.sign(
                        { id: rows[0].id, username: username, role: 'admin' },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    console.log(`✅ Admin login successful (DB): ${username}`);
                    return res.json({ success: true, token, user: { username: username } });
                }
            }
        } catch (error) {
            console.error('Database login error:', error.message);
        }
    }
    
    // Fallback to hardcoded credentials
    if (username === 'ram' && password === '123') {
        const token = jwt.sign({ username: 'ram', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        console.log(`✅ Admin login successful (Hardcoded): ${username}`);
        return res.json({ success: true, token, user: { username: 'ram' } });
    }
    
    console.log(`❌ Admin login failed: ${username}`);
    res.status(401).json({ error: 'Invalid credentials. Use: ram / 123' });
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
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

// Get all orders (Admin only)
app.get('/api/admin/orders', verifyToken, async (req, res) => {
    console.log('📋 Fetching all orders...');
    
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
            console.log(`✅ Found ${rows.length} orders in TiDB`);
            
            const processedOrders = rows.map(order => {
                let parsedItems;
                try {
                    parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                } catch (e) {
                    parsedItems = [];
                }
                
                const subtotal = order.total_before_tax || 0;
                const cgst = subtotal * 0.025;
                const sgst = subtotal * 0.025;
                const grandTotal = subtotal + cgst + sgst;
                
                return {
                    id: order.id,
                    order_id: order.order_id,
                    table_number: order.table_number,
                    mobile_number: order.mobile_number,
                    items: parsedItems,
                    total_before_tax: subtotal,
                    status: order.status,
                    created_at: order.created_at,
                    subtotal: subtotal,
                    cgst: cgst,
                    sgst: sgst,
                    grand_total: grandTotal
                };
            });
            
            return res.json(processedOrders);
        } catch (error) {
            console.error('❌ Fetch error:', error.message);
        }
    }
    
    // Fallback to memory
    const orders = global.orders || [];
    console.log(`⚠️ Returning ${orders.length} orders from memory`);
    const processedOrders = orders.map(order => {
        const subtotal = order.total_before_tax || 0;
        const cgst = subtotal * 0.025;
        const sgst = subtotal * 0.025;
        const grandTotal = subtotal + cgst + sgst;
        
        return {
            ...order,
            subtotal: subtotal,
            cgst: cgst,
            sgst: sgst,
            grand_total: grandTotal
        };
    });
    res.json(processedOrders);
});

// Get single order by ID (Admin only)
app.get('/api/admin/orders/:orderId', verifyToken, async (req, res) => {
    const { orderId } = req.params;
    
    if (dbConnected) {
        try {
            const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            const order = rows[0];
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            const subtotal = order.total_before_tax || 0;
            const cgst = subtotal * 0.025;
            const sgst = subtotal * 0.025;
            const grandTotal = subtotal + cgst + sgst;
            
            res.json({
                ...order,
                items: items,
                subtotal: subtotal,
                cgst: cgst,
                sgst: sgst,
                grand_total: grandTotal
            });
        } catch (error) {
            console.error('Fetch error:', error.message);
            res.status(500).json({ error: 'Failed to fetch order' });
        }
    } else {
        const order = (global.orders || []).find(o => o.order_id === orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    }
});

// Update order status (Admin only)
app.put('/api/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;
    
    if (!['Pending', 'Completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be Pending or Completed' });
    }
    
    console.log(`📝 Updating order ${orderId} status to ${status}`);
    
    if (dbConnected) {
        try {
            const [result] = await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            console.log(`✅ Order ${orderId} updated in TiDB`);
            return res.json({ success: true, orderId, status });
        } catch (error) {
            console.error('Update error:', error.message);
            res.status(500).json({ error: 'Failed to update status' });
        }
    } else {
        const orders = global.orders || [];
        const order = orders.find(o => o.order_id === orderId);
        if (order) {
            order.status = status;
            res.json({ success: true, orderId, status });
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    }
});

// Get dashboard statistics (Admin only)
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    console.log('📊 Fetching dashboard statistics...');
    
    if (dbConnected) {
        try {
            const [totalResult] = await db.query('SELECT COUNT(*) as count FROM orders');
            const [pendingResult] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
            const [todayResult] = await db.query('SELECT COALESCE(SUM(total_before_tax), 0) as total FROM orders WHERE DATE(created_at) = CURDATE()');
            const [tablesResult] = await db.query('SELECT COUNT(DISTINCT table_number) as count FROM orders WHERE DATE(created_at) = CURDATE()');
            
            const stats = {
                totalOrders: totalResult[0].count,
                pendingOrders: pendingResult[0].count,
                todayRevenue: parseFloat(todayResult[0].total),
                activeTables: tablesResult[0].count
            };
            
            console.log(`✅ Stats: Total=${stats.totalOrders}, Pending=${stats.pendingOrders}, Revenue=${stats.todayRevenue}`);
            res.json(stats);
        } catch (error) {
            console.error('Stats error:', error.message);
            res.json({ totalOrders: 0, pendingOrders: 0, todayRevenue: 0, activeTables: 0 });
        }
    } else {
        const orders = global.orders || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayOrders = orders.filter(o => o.created_at?.slice(0, 10) === today);
        
        res.json({
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'Pending').length,
            todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_before_tax || 0), 0),
            activeTables: new Set(todayOrders.map(o => o.table_number)).size
        });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🍽️  ${RESTAURANT_INFO.name}                              ║
║   ${RESTAURANT_INFO.tagline}                                      ║
║                                                                   ║
║   ✅ Server: http://0.0.0.0:${PORT}                                ║
║   ✅ Health: http://localhost:${PORT}/api/health                   ║
║   ✅ Menu:   http://localhost:${PORT}/api/menu                     ║
║                                                                   ║
║   🔐 Admin Login: ram / 123                                       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
    
    // Connect to TiDB
    await connectDB();
});
