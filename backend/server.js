// server.js - Production Ready for Render/Vercel Deployment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const db = require('./db');
const dataService = require('./Data_fetcher/data_service');
const authRoutes = require('./user_auth/routes');

// =====================
// Configuration
// =====================
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'notify_fallback_dev_key_change_in_production';
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

const app = express();

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});



// =====================
// Ensure upload directories exist
// =====================
const uploadsDir = path.join(__dirname, 'uploads');
const notesDir = path.join(__dirname, 'uploads/notes');
const pfpsDir = path.join(__dirname, 'uploads/pfps');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
}
if (!fs.existsSync(pfpsDir)) {
    fs.mkdirSync(pfpsDir, { recursive: true });
}
//check if tables exist
// Add this route to check database tables
app.get('/api/check-tables', async (req, res) => {
    try {
        const [tables] = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        res.json({
            status: 'ok',
            tables: tables.map(t => t.table_name),
            count: tables.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// =====================
// Multer Configuration
// =====================
const pfpStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pfpsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadPfp = multer({ 
    storage: pfpStorage, 
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const noteStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, notesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: noteStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for notes
});



// =====================
// CORS Configuration
// =====================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    'https://*.vercel.app',
    'https://*.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin;
        })) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow but log - change to false in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// =====================
// Body Parsing Middleware
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// Static Files
// =====================
app.use('/uploads', express.static(uploadsDir));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================
// Admin Middleware
// =====================
const adminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

// =====================
// Routes
// =====================
app.use('/user_auth', authRoutes);


// DATABASE SETUP ENDPOINT - Run this first!
app.get('/api/setup', async (req, res) => {
    try {
        console.log('🔧 Running database setup...');
        
        // Create tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS schools (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS units (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                dept_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                is_common BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS notify_users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'student',
                school_id INTEGER REFERENCES schools(id),
                pfp VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_path VARCHAR(500),
                downloads INTEGER DEFAULT 0,
                school_id INTEGER REFERENCES schools(id),
                dept_id INTEGER REFERENCES courses(id),
                unit_id INTEGER REFERENCES units(id),
                user_id INTEGER REFERENCES notify_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS updates (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                course_id INTEGER REFERENCES courses(id),
                user_id INTEGER REFERENCES notify_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_courses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES notify_users(id) ON DELETE CASCADE,
                course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                school_id INTEGER REFERENCES schools(id),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                staff_domain VARCHAR(255),
                student_domain VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes
        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_school ON notes(school_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_dept ON notes(dept_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_unit ON notes(unit_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_updates_course ON updates(course_id)`);
        
        // Create test user
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 10);
        await db.query(`
            INSERT INTO notify_users (name, email, password, role) 
            VALUES ('Test User', 'test@example.com', $1, 'student')
            ON CONFLICT (email) DO NOTHING
        `, [hashedPassword]);
        
        // Add test school
        await db.query(`
            INSERT INTO schools (name) 
            VALUES ('Test University') 
            ON CONFLICT DO NOTHING
        `);
        
        res.json({ 
            success: true, 
            message: 'Database setup complete!',
            credentials: {
                email: 'test@example.com',
                password: 'password123'
            }
        });
        
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Call the initialization function
// Make sure db is imported and ready
if (typeof db !== 'undefined') {
    initializeDatabase().catch(console.error);
} else {
    console.error('❌ Database not loaded, cannot initialize tables');
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API is running 🚀',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Health check for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ==================== SCHOOLS ====================
app.get('/api/schools', async (req, res) => {
    try {
        const schools = await dataService.getSchools();
        
        // Get counts for each school
        const schoolsWithCounts = await Promise.all(schools.map(async (school) => {
            const schoolId = parseInt(school.id);
            
            const departments = school.departments || [];
            
            // Count students - just count users with this school_id (their primary school)
            const [[{ studentCount }]] = await db.query(
                'SELECT COUNT(*) as studentCount FROM notify_users WHERE school_id = ?',
                [schoolId]
            );
            
            const [[{ noteCount }]] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE school_id = ?',
                [schoolId]
            );
            const [[{ courseCount }]] = await db.query(
                'SELECT COUNT(*) as courseCount FROM courses WHERE school_id = ?',
                [schoolId]
            );
            
            return {
                ...school,
                departments: departments,
                studentCount: studentCount || 0,
                noteCount: noteCount || 0,
                courseCount: courseCount || 0
            };
        }));
        
        res.json(schoolsWithCounts);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

app.get('/api/schools/:schoolId', async (req, res) => {
    try {
        const school = await dataService.getSchoolById(req.params.schoolId);
        if (!school) return res.status(404).json({ message: "School not found" });
        
        // Get departments with units
        const [departments] = await db.query('SELECT * FROM courses WHERE school_id = ? ORDER BY name', [school.id]);
        for (const dept of departments) {
            const [units] = await db.query('SELECT * FROM units WHERE dept_id = ? ORDER BY name', [dept.id]);
            dept.units = units;
        }
        school.departments = departments;
        
        res.json(school);
    } catch (error) {
        console.error('Error fetching school:', error);
        res.status(500).json({ error: 'Failed to fetch school' });
    }
});

app.post('/api/schools', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'School name is required' });
        }
        const newSchool = await dataService.addSchool(name);
        res.json(newSchool);
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Failed to create school' });
    }
});

// Get all departments (for search filters)
app.get('/api/departments', async (req, res) => {
    try {
        const [departments] = await db.query('SELECT * FROM courses ORDER BY name');
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to load departments' });
    }
});

// ==================== DEPARTMENTS ====================
app.get('/api/schools/:schoolId/departments', async (req, res) => {
    try {
        const { schoolId } = req.params;
        const schoolIdInt = parseInt(schoolId);
        const departments = await dataService.getDepartmentsBySchool(schoolIdInt);
        
        // Get counts for each department
        const departmentsWithCounts = [];
        
        for (const dept of departments) {
            const deptId = parseInt(String(dept.id));
            
            // Count students - from user_courses for this specific course
            const [studentResult] = await db.query(
                'SELECT COUNT(*) as studentCount FROM user_courses WHERE course_id = ?',
                [deptId]
            );
            const [noteResult] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE dept_id = ?',
                [deptId]
            );
            const [unitResult] = await db.query(
                'SELECT COUNT(*) as unitCount FROM units WHERE dept_id = ?',
                [deptId]
            );
            
            departmentsWithCounts.push({
                ...dept,
                studentCount: studentResult[0]?.studentCount || 0,
                noteCount: noteResult[0]?.noteCount || 0,
                unitCount: unitResult[0]?.unitCount || 0
            });
        }
        
        res.json(departmentsWithCounts);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

app.get('/api/schools/:schoolId/departments/:deptId', async (req, res) => {
    try {
        const dept = await dataService.getDepartmentById(req.params.schoolId, req.params.deptId);
        if (!dept) return res.status(404).json({ message: "Department not found" });
        res.json(dept);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const { name, code, school_id } = req.body;
        if (!name || !school_id) {
            return res.status(400).json({ error: 'Name and school_id are required' });
        }
        const newDept = await dataService.addDepartment(school_id, name, code);
        if (!newDept) return res.status(404).json({ error: 'School not found' });
        res.json(newDept);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// ==================== UNITS ====================
app.get('/api/schools/:schoolId/departments/:deptId/units', async (req, res) => {
    try {
        const units = await dataService.getUnitsByDepartment(req.params.schoolId, req.params.deptId);
        
        // Add note counts for each unit
        const unitsWithCounts = [];
        for (const unit of units) {
            const unitId = parseInt(String(unit.id));
            const [noteResult] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE unit_id = ?',
                [unitId]
            );
            unitsWithCounts.push({
                ...unit,
                noteCount: noteResult[0]?.noteCount || 0
            });
        }
        
        res.json(unitsWithCounts);
    } catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

app.get('/api/schools/:schoolId/departments/:deptId/units/:unitId', async (req, res) => {
    try {
        const unit = await dataService.getUnitById(req.params.schoolId, req.params.deptId, req.params.unitId);
        if (!unit) return res.status(404).json({ message: "Unit not found" });
        res.json(unit);
    } catch (error) {
        console.error('Error fetching unit:', error);
        res.status(500).json({ error: 'Failed to fetch unit' });
    }
});

app.post('/api/units', async (req, res) => {
    try {
        const { name, code, school_id, dept_id } = req.body;
        if (!name || !school_id || !dept_id) {
            return res.status(400).json({ error: 'Name, school_id, and dept_id are required' });
        }
        const newUnit = await dataService.addUnit(school_id, dept_id, name, code);
        if (!newUnit) return res.status(404).json({ error: 'Department not found' });
        res.json(newUnit);
    } catch (error) {
        console.error('Error creating unit:', error);
        res.status(500).json({ error: 'Failed to create unit' });
    }
});

app.delete('/api/units/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM units WHERE id = ?', [parseInt(id)]);
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});

// ==================== NOTES ====================
app.get('/api/schools/:schoolId/departments/:deptId/units/:unitId/notes', async (req, res) => {
    try {
        const { schoolId, deptId, unitId } = req.params;
        const notes = await dataService.getNotesByUnit(parseInt(schoolId), parseInt(deptId), parseInt(unitId));
        res.json(notes);
    } catch (error) {
        console.error("Backend error", error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        let query = `
            SELECT n.*, s.name as schoolName, c.name as deptName, u.name as unitName,
                   s.id as schoolId, c.id as deptId, u.id as unitId,
                   p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
        `;
        
        const parsedSchoolId = parseInt(schoolId);
        if (schoolId && !isNaN(parsedSchoolId)) {
            query += ` WHERE n.school_id = ${parsedSchoolId}`;
        }
        
        query += ` ORDER BY n.created_at DESC`;
        
        const [notes] = await db.query(query);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.get('/api/notes/my-notes', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'User ID required' });
        
        const [notes] = await db.query(`
            SELECT n.*, s.name as schoolName, c.name as courseName, u.name as unitName,
                   u.id as unitId, u.code as unitCode,
                   p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
        `, [userId]);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching my notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.post('/api/notes', upload.single('file'), async (req, res) => {
    try {
        const { title, description, school_id, dept_id, unit_id, userId } = req.body;
        
        if (!title || !school_id || !dept_id || !unit_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const filePath = req.file ? '/uploads/notes/' + req.file.filename : null;
        
        const newNote = await dataService.addNote(school_id, dept_id, unit_id, {
            title,
            description,
            userId,
            filePath
        });
        if (!newNote) return res.status(404).json({ error: 'Unit not found' });
        res.json(newNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const { schoolId, deptId, unitId } = req.query;
        await dataService.deleteNote(parseInt(schoolId), parseInt(deptId), parseInt(unitId), parseInt(req.params.id));
        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

app.get('/api/notes/:id', async (req, res) => {
    try {
        const [notes] = await db.query(`
            SELECT n.*, s.name as schoolName, c.name as courseName, u.name as unitName,
                   u.id as unitId, u.code as unitCode,
                   p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.id = ?
        `, [parseInt(req.params.id)]);
        
        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });
        res.json(notes[0]);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

app.get('/api/notes/:id/download', async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE id = ?', [parseInt(req.params.id)]);
        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });
        
        const note = notes[0];
        
        if (!note.file_path) {
            return res.status(404).json({ error: 'No file attached to this note' });
        }
        
        await db.query('UPDATE notes SET downloads = COALESCE(downloads, 0) + 1 WHERE id = ?', [req.params.id]);
        
        const fileName = note.file_path.split('/').pop();
        const filePath = path.join(__dirname, 'uploads', 'notes', fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }
        
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading note:', error);
        res.status(500).json({ error: 'Failed to download note' });
    }
});

app.get('/api/notes/:id/preview', async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE id = ?', [parseInt(req.params.id)]);
        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });
        
        const note = notes[0];
        
        if (!note.file_path) {
            return res.status(404).json({ error: 'No file attached to this note' });
        }
        
        const fileName = note.file_path.split('/').pop();
        const fullPath = path.join(__dirname, 'uploads', 'notes', fileName);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }
        
        res.sendFile(fullPath);
    } catch (error) {
        console.error('Error previewing note:', error);
        res.status(500).json({ error: 'Failed to preview note' });
    }
});

// ==================== UPDATES ====================
app.get('/api/updates', async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        let query = `
            SELECT u.*, c.name as courseName, c.school_id, p.name as postedByName
            FROM updates u 
            LEFT JOIN courses c ON u.course_id = c.id 
            LEFT JOIN notify_users p ON u.user_id = p.id
        `;
        
        const parsedSchoolId = parseInt(schoolId);
        if (schoolId && !isNaN(parsedSchoolId) && parsedSchoolId > 0) {
            query += ` WHERE (c.school_id = ${parsedSchoolId} OR u.course_id IS NULL OR u.course_id = 0)`;
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const [updates] = await db.query(query);
        res.json(updates);
    } catch (error) {
        console.error('Updates error:', error);
        res.status(500).json({ error: 'Failed to load updates' });
    }
});

app.get('/api/updates/my-updates', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'User ID required' });
        
        const [updates] = await db.query(`
            SELECT u.*, c.name as courseName, p.name as postedByName
            FROM updates u 
            LEFT JOIN courses c ON u.course_id = c.id 
            LEFT JOIN notify_users p ON u.user_id = p.id
            WHERE u.user_id = ?
            ORDER BY u.created_at DESC
        `, [userId]);
        res.json(updates);
    } catch (error) {
        console.error('Error fetching my updates:', error);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
});

app.post('/api/updates', async (req, res) => {
    try {
        const { title, content, course_id, userId, postedBy } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const newUpdate = await dataService.addUpdate({ 
            title, 
            content, 
            course_id,
            userId,
            postedBy 
        });
        res.json(newUpdate);
    } catch (error) {
        console.error('Error creating update:', error);
        res.status(500).json({ error: 'Failed to create update' });
    }
});

app.delete('/api/updates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM updates WHERE id = ?', [parseInt(id)]);
        res.json({ message: 'Update deleted successfully' });
    } catch (error) {
        console.error('Error deleting update:', error);
        res.status(500).json({ error: 'Failed to delete update' });
    }
});

// ==================== STATS ====================
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await dataService.getUniversityStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/popular-departments', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 3;
        const depts = await dataService.getPopularDepartments(limit);
        res.json(depts);
    } catch (error) {
        console.error('Error fetching popular departments:', error);
        res.status(500).json({ error: 'Failed to fetch popular departments' });
    }
});

// ==================== COUNTS ====================
app.get('/api/counts', async (req, res) => {
    try {
        const [[{ studentCount }]] = await db.query(
            'SELECT COUNT(*) as studentCount FROM notify_users WHERE school_id IS NOT NULL'
        );
        const [[{ noteCount }]] = await db.query('SELECT COUNT(*) as noteCount FROM notes');
        const [[{ schoolCount }]] = await db.query('SELECT COUNT(*) as schoolCount FROM schools');
        const [[{ courseCount }]] = await db.query('SELECT COUNT(*) as courseCount FROM courses');
        
        res.json({
            students: studentCount || 0,
            notes: noteCount || 0,
            schools: schoolCount || 0,
            courses: courseCount || 0
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

app.get('/api/schools/:schoolId/counts', async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        
        const [[{ studentCount }]] = await db.query(
            'SELECT COUNT(*) as studentCount FROM notify_users WHERE school_id = ?',
            [schoolId]
        );
        
        const [[{ noteCount }]] = await db.query(
            'SELECT COUNT(*) as noteCount FROM notes WHERE school_id = ?',
            [schoolId]
        );
        const [[{ courseCount }]] = await db.query(
            'SELECT COUNT(*) as courseCount FROM courses WHERE school_id = ?',
            [schoolId]
        );
        
        res.json({
            students: studentCount || 0,
            notes: noteCount || 0,
            courses: courseCount || 0
        });
    } catch (error) {
        console.error('Error fetching school counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM courses WHERE id = ?', [parseInt(id)]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

app.get('/api/courses/:courseId/counts', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const [[{ studentCount }]] = await db.query(
            'SELECT COUNT(*) as studentCount FROM user_courses WHERE course_id = ? AND status = ?',
            [courseId, 'active']
        );
        const [[{ noteCount }]] = await db.query(
            'SELECT COUNT(*) as noteCount FROM notes WHERE dept_id = ?',
            [courseId]
        );
        const [[{ unitCount }]] = await db.query(
            'SELECT COUNT(*) as unitCount FROM units WHERE dept_id = ?',
            [courseId]
        );
        
        res.json({
            students: studentCount || 0,
            notes: noteCount || 0,
            units: unitCount || 0
        });
    } catch (error) {
        console.error('Error fetching course counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// ==================== USER ENROLLMENT ====================
app.post('/api/users/enroll', async (req, res) => {
    try {
        const { userId, schoolId, courseId } = req.body;
        console.log('enroll called:', userId, schoolId, courseId);
        
        const userIdInt = parseInt(userId);
        const courseIdInt = parseInt(courseId);
        const schoolIdInt = parseInt(schoolId);
        
        console.log('Parsed:', userIdInt, schoolIdInt, courseIdInt);
        
        // Remove old enrollments - student can only be in ONE department at a time
        await db.query('DELETE FROM user_courses WHERE user_id = ?', [userIdInt]);
        console.log('Deleted old enrollments');
        
        // Add new enrollment
        await db.query(
            'INSERT INTO user_courses (user_id, course_id, school_id, status) VALUES (?, ?, ?, ?)',
            [userIdInt, courseIdInt, schoolIdInt, 'active']
        );
        console.log('Inserted new enrollment');
        
        // Update user's primary school
        await db.query('UPDATE notify_users SET school_id = ? WHERE id = ?', [schoolIdInt, userIdInt]);
        
        const [courseInfo] = await db.query(`
            SELECT c.*, s.name as schoolName 
            FROM courses c 
            LEFT JOIN schools s ON c.school_id = s.id 
            WHERE c.id = ?
        `, [courseIdInt]);
        
        res.json({ 
            message: 'Successfully enrolled',
            course: courseInfo[0]
        });
    } catch (error) {
        console.error('Error enrolling:', error);
        res.status(500).json({ error: 'Failed to enroll: ' + error.message });
    }
});

app.post('/api/users/enroll-school', async (req, res) => {
    try {
        const { userId, schoolId } = req.body;
        console.log('enroll-school:', userId, schoolId);
        
        const userIdInt = parseInt(userId);
        const schoolIdInt = parseInt(schoolId);
        
        const [currentUser] = await db.query('SELECT school_id FROM notify_users WHERE id = ?', [userIdInt]);
        const oldSchoolId = currentUser[0]?.school_id;
        
        if (oldSchoolId && parseInt(oldSchoolId) !== schoolIdInt) {
            await db.query(
                'DELETE FROM user_courses WHERE user_id = ? AND school_id = ?',
                [userIdInt, oldSchoolId]
            );
            console.log('Removed from old school:', userIdInt, oldSchoolId);
        }
        
        await db.query('UPDATE notify_users SET school_id = ? WHERE id = ?', [schoolIdInt, userIdInt]);
        
        const [schoolInfo] = await db.query('SELECT * FROM schools WHERE id = ?', [schoolIdInt]);
        
        res.json({ 
            message: 'Joined ' + schoolInfo[0].name + '. Please select your department.',
            school: schoolInfo[0]
        });
    } catch (error) {
        console.error('Error enrolling:', error);
        res.status(500).json({ error: 'Failed to enroll' });
    }
});

app.get('/api/users/:userId/enrollment', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [enrollments] = await db.query(`
            SELECT uc.*, c.name as courseName, c.school_id, s.name as schoolName
            FROM user_courses uc
            LEFT JOIN courses c ON uc.course_id = c.id
            LEFT JOIN schools s ON c.school_id = s.id
            WHERE uc.user_id = ? AND uc.status = 'active'
        `, [userId]);
        
        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollment:', error);
        res.status(500).json({ error: 'Failed to fetch enrollment' });
    }
});

app.get('/api/courses/:courseId/similar', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const [course] = await db.query('SELECT school_id, name FROM courses WHERE id = ?', [courseId]);
        if (!course[0]) return res.json([]);
        
        const [similar] = await db.query(`
            SELECT id, name, code FROM courses 
            WHERE school_id = ? AND id != ?
            LIMIT 5
        `, [course[0].school_id, courseId]);
        
        res.json(similar);
    } catch (error) {
        console.error('Error fetching similar courses:', error);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

app.get('/api/units/:unitId/similar', async (req, res) => {
    try {
        const { unitId } = req.params;
        
        const [unit] = await db.query('SELECT dept_id, name FROM units WHERE id = ?', [unitId]);
        if (!unit[0]) return res.json([]);
        
        const [similar] = await db.query(`
            SELECT id, name, code FROM units 
            WHERE dept_id = ? AND id != ?
            LIMIT 5
        `, [unit[0].dept_id, unitId]);
        
        res.json(similar);
    } catch (error) {
        console.error('Error fetching similar units:', error);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// ==================== ADMIN API ====================
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT nu.*, i.name as institutionName, s.name as schoolName
            FROM notify_users nu
            LEFT JOIN institutions i ON nu.institution_id = i.id
            LEFT JOIN schools s ON nu.school_id = s.id
            ORDER BY nu.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;
        
        if (role) {
            await db.query('UPDATE notify_users SET role = ? WHERE id = ?', [role, id]);
        }
        if (name) {
            await db.query('UPDATE notify_users SET name = ? WHERE id = ?', [name, id]);
        }
        
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notify_users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.post('/api/admin/users/:id/promote', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['student', 'lecturer', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        await db.query('UPDATE notify_users SET role = ? WHERE id = ?', [role, id]);
        res.json({ message: `User promoted to ${role}` });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ error: 'Failed to promote user' });
    }
});

// Institutions management
app.get('/api/admin/institutions', adminMiddleware, async (req, res) => {
    try {
        const [institutions] = await db.query('SELECT * FROM institutions ORDER BY name');
        res.json(institutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

app.post('/api/admin/institutions', adminMiddleware, async (req, res) => {
    try {
        const { name, staff_domain, student_domain } = req.body;
        const [result] = await db.query(
            'INSERT INTO institutions (name, staff_domain, student_domain) VALUES (?, ?, ?)',
            [name, staff_domain, student_domain]
        );
        res.json({ id: result.insertId, name, staff_domain, student_domain });
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ error: 'Failed to create institution' });
    }
});

app.put('/api/admin/institutions/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, staff_domain, student_domain } = req.body;
        
        await db.query(
            'UPDATE institutions SET name = ?, staff_domain = ?, student_domain = ? WHERE id = ?',
            [name, staff_domain, student_domain, id]
        );
        res.json({ message: 'Institution updated successfully' });
    } catch (error) {
        console.error('Error updating institution:', error);
        res.status(500).json({ error: 'Failed to update institution' });
    }
});

app.delete('/api/admin/institutions/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM institutions WHERE id = ?', [id]);
        res.json({ message: 'Institution deleted successfully' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ error: 'Failed to delete institution' });
    }
});

// Schools management (admin)
app.get('/api/admin/schools', adminMiddleware, async (req, res) => {
    try {
        const [schools] = await db.query('SELECT * FROM schools ORDER BY name');
        
        const schoolsWithCounts = await Promise.all(schools.map(async (school) => {
            const schoolId = parseInt(school.id);
            
            const [[{ studentCount }]] = await db.query(
                'SELECT COUNT(*) as studentCount FROM notify_users WHERE school_id = ?',
                [schoolId]
            );
            
            const [[{ courseCount }]] = await db.query(
                'SELECT COUNT(*) as courseCount FROM courses WHERE school_id = ?',
                [schoolId]
            );
            const [[{ noteCount }]] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE school_id = ?',
                [schoolId]
            );
            
            return {
                ...school,
                studentCount: studentCount || 0,
                courseCount: courseCount || 0,
                noteCount: noteCount || 0
            };
        }));
        
        res.json(schoolsWithCounts);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

app.post('/api/admin/schools', adminMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const [result] = await db.query('INSERT INTO schools (name) VALUES (?)', [name]);
        res.json({ id: result.insertId, name });
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Failed to create school' });
    }
});

app.put('/api/admin/schools/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        await db.query('UPDATE schools SET name = ? WHERE id = ?', [name, id]);
        res.json({ message: 'School updated successfully' });
    } catch (error) {
        console.error('Error updating school:', error);
        res.status(500).json({ error: 'Failed to update school' });
    }
});

app.delete('/api/admin/schools/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM schools WHERE id = ?', [id]);
        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('Error deleting school:', error);
        res.status(500).json({ error: 'Failed to delete school' });
    }
});

// Courses management (admin)
app.get('/api/admin/courses', adminMiddleware, async (req, res) => {
    try {
        const [courses] = await db.query(`
            SELECT c.*, s.name as schoolName
            FROM courses c
            LEFT JOIN schools s ON c.school_id = s.id
            ORDER BY c.name
        `);
        
        const coursesWithCounts = await Promise.all(courses.map(async (course) => {
            const courseId = parseInt(course.id);
            
            const [[{ studentCount }]] = await db.query(
                'SELECT COUNT(*) as studentCount FROM user_courses WHERE course_id = ?',
                [courseId]
            );
            const [[{ unitCount }]] = await db.query(
                'SELECT COUNT(*) as unitCount FROM units WHERE dept_id = ?',
                [courseId]
            );
            const [[{ noteCount }]] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE dept_id = ?',
                [courseId]
            );
            
            return {
                ...course,
                studentCount: studentCount || 0,
                unitCount: unitCount || 0,
                noteCount: noteCount || 0
            };
        }));
        
        res.json(coursesWithCounts);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.post('/api/admin/courses', adminMiddleware, async (req, res) => {
    try {
        const { name, code, school_id } = req.body;
        const [result] = await db.query(
            'INSERT INTO courses (name, code, school_id) VALUES (?, ?, ?)',
            [name, code, school_id]
        );
        res.json({ id: result.insertId, name, code, school_id });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

app.put('/api/admin/courses/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, school_id } = req.body;
        
        await db.query(
            'UPDATE courses SET name = ?, code = ?, school_id = ? WHERE id = ?',
            [name, code, school_id, id]
        );
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

app.delete('/api/admin/courses/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

// Units management (admin)
app.get('/api/admin/units', adminMiddleware, async (req, res) => {
    try {
        const [units] = await db.query(`
            SELECT u.*, c.name as courseName, s.name as schoolName
            FROM units u
            LEFT JOIN courses c ON u.dept_id = c.id
            LEFT JOIN schools s ON c.school_id = s.id
            ORDER BY u.name
        `);
        
        const unitsWithCounts = await Promise.all(units.map(async (unit) => {
            const unitId = parseInt(unit.id);
            
            const [[{ noteCount }]] = await db.query(
                'SELECT COUNT(*) as noteCount FROM notes WHERE unit_id = ?',
                [unitId]
            );
            
            return {
                ...unit,
                noteCount: noteCount || 0
            };
        }));
        
        res.json(unitsWithCounts);
    } catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

app.post('/api/admin/units', adminMiddleware, async (req, res) => {
    try {
        const { name, code, dept_id } = req.body;
        const [result] = await db.query(
            'INSERT INTO units (name, code, dept_id) VALUES (?, ?, ?)',
            [name, code, dept_id]
        );
        res.json({ id: result.insertId, name, code, dept_id });
    } catch (error) {
        console.error('Error creating unit:', error);
        res.status(500).json({ error: 'Failed to create unit' });
    }
});

app.put('/api/admin/units/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, dept_id } = req.body;
        
        await db.query(
            'UPDATE units SET name = ?, code = ?, dept_id = ? WHERE id = ?',
            [name, code, dept_id, id]
        );
        res.json({ message: 'Unit updated successfully' });
    } catch (error) {
        console.error('Error updating unit:', error);
        res.status(500).json({ error: 'Failed to update unit' });
    }
});

app.delete('/api/admin/units/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM units WHERE id = ?', [id]);
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});

// Notes management (admin)
app.get('/api/admin/notes', adminMiddleware, async (req, res) => {
    try {
        const [notes] = await db.query(`
            SELECT n.*, s.name as schoolName, c.name as courseName, 
                   u.name as unitName, p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            ORDER BY n.created_at DESC
        `);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.put('/api/admin/notes/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        
        await db.query(
            'UPDATE notes SET title = ?, description = ? WHERE id = ?',
            [title, description, id]
        );
        res.json({ message: 'Note updated successfully' });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

app.delete('/api/admin/notes/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notes WHERE id = ?', [id]);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Updates management (admin)
app.get('/api/admin/updates', adminMiddleware, async (req, res) => {
    try {
        const [updates] = await db.query(`
            SELECT u.*, c.name as courseName, p.name as postedByName
            FROM updates u
            LEFT JOIN courses c ON u.course_id = c.id
            LEFT JOIN notify_users p ON u.user_id = p.id
            ORDER BY u.created_at DESC
        `);
        res.json(updates);
    } catch (error) {
        console.error('Error fetching updates:', error);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
});

app.post('/api/admin/updates', adminMiddleware, async (req, res) => {
    try {
        const { title, content, course_id, userId } = req.body;
        const [result] = await db.query(
            'INSERT INTO updates (title, content, course_id, user_id) VALUES (?, ?, ?, ?)',
            [title, content, course_id || null, userId]
        );
        res.json({ id: result.insertId, title, content, course_id, user_id: userId });
    } catch (error) {
        console.error('Error creating update:', error);
        res.status(500).json({ error: 'Failed to create update' });
    }
});

app.put('/api/admin/updates/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        
        await db.query(
            'UPDATE updates SET title = ?, content = ? WHERE id = ?',
            [title, content, id]
        );
        res.json({ message: 'Update updated successfully' });
    } catch (error) {
        console.error('Error updating update:', error);
        res.status(500).json({ error: 'Failed to update update' });
    }
});

app.delete('/api/admin/updates/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM updates WHERE id = ?', [id]);
        res.json({ message: 'Update deleted successfully' });
    } catch (error) {
        console.error('Error deleting update:', error);
        res.status(500).json({ error: 'Failed to delete update' });
    }
});

// ==================== PROFILE PICTURE ====================
app.post('/api/user/pfp', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET);
        
        uploadPfp.single('pfp')(req, res, async (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File too large. Max 2MB' });
                }
                return res.status(400).json({ message: 'File upload error' });
            }
            
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            
            try {
                const pfpPath = '/uploads/pfps/' + req.file.filename;
                
                await db.query('UPDATE notify_users SET pfp = ? WHERE id = ?', [pfpPath, decoded.id]);
                
                res.json({ pfp: pfpPath });
            } catch (dbErr) {
                console.error('Error updating profile picture in DB:', dbErr);
                res.status(500).json({ error: 'Failed to save profile picture' });
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        console.error('Error uploading pfp:', err);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

// Admin stats
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM notify_users');
        const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) as totalStudents FROM notify_users WHERE role = "student"');
        const [[{ totalLecturers }]] = await db.query('SELECT COUNT(*) as totalLecturers FROM notify_users WHERE role = "lecturer"');
        const [[{ totalAdmins }]] = await db.query('SELECT COUNT(*) as totalAdmins FROM notify_users WHERE role = "admin"');
        const [[{ totalInstitutions }]] = await db.query('SELECT COUNT(*) as totalInstitutions FROM institutions');
        const [[{ totalSchools }]] = await db.query('SELECT COUNT(*) as totalSchools FROM schools');
        const [[{ totalCourses }]] = await db.query('SELECT COUNT(*) as totalCourses FROM courses');
        const [[{ totalUnits }]] = await db.query('SELECT COUNT(*) as totalUnits FROM units');
        const [[{ totalNotes }]] = await db.query('SELECT COUNT(*) as totalNotes FROM notes');
        const [[{ totalUpdates }]] = await db.query('SELECT COUNT(*) as totalUpdates FROM updates');
        
        res.json({
            totalUsers: totalUsers || 0,
            totalStudents: totalStudents || 0,
            totalLecturers: totalLecturers || 0,
            totalAdmins: totalAdmins || 0,
            totalInstitutions: totalInstitutions || 0,
            totalSchools: totalSchools || 0,
            totalCourses: totalCourses || 0,
            totalUnits: totalUnits || 0,
            totalNotes: totalNotes || 0,
            totalUpdates: totalUpdates || 0
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// =====================
// 404 Handler
// =====================
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// =====================
// Global Error Handler
// =====================
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// =====================
// Start Server
// =====================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;