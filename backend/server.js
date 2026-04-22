// server.js - Production Ready for Render/Vercel Deployment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');//jsonwebtoken is used for creating and verifying JSON Web Tokens (JWTs) for authentication and authorization in the application.
const bcrypt = require('bcrypt');

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

// =====================
// Ensure upload directories exist
// =====================
const uploadsDir = path.join(__dirname, 'uploads');
const notesDir = path.join(__dirname, 'uploads/notes');
const pfpsDir = path.join(__dirname, 'uploads/pfps');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(notesDir))   fs.mkdirSync(notesDir,   { recursive: true });
if (!fs.existsSync(pfpsDir))    fs.mkdirSync(pfpsDir,    { recursive: true });

// =====================
// Multer Configuration
// =====================
const pfpStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, pfpsDir),
    filename:    (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadPfp = multer({ storage: pfpStorage, limits: { fileSize: 2 * 1024 * 1024 } });

const noteStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, notesDir),
    filename:    (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: noteStorage, limits: { fileSize: 10 * 1024 * 1024 } });

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
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => {
            if (!allowed) return false;
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin;
        })) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true);
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
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================
// Admin Middleware
// =====================
const adminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized - No token provided' });

    try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError')  return res.status(401).json({ message: 'Invalid token' });
        if (err.name === 'TokenExpiredError')  return res.status(401).json({ message: 'Token expired' });
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

// =====================
// Routes
// =====================
app.use('/api/user_auth', authRoutes);

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API is running 🚀',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
});
});

// Admin create update endpoint
app.post('/api/admin/updates', adminMiddleware, async (req, res) => {
    try {
        const { title, content, course_id, userId } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

        const [rows] = await db.query(
            'INSERT INTO updates (title, content, course_id, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [title, content, course_id || null, userId || null]
        );
        res.json({ id: rows[0].id, title, content, message: 'Update created successfully' });
    } catch (error) {
        console.error('Error creating update:', error);
        res.status(500).json({ error: 'Failed to create update' });
    }
});

// Admin update update endpoint
app.put('/api/admin/updates/:id', adminMiddleware, async (req, res) => {
    try {
        const updateId = parseInt(req.params.id);
        const { title, content, course_id } = req.body;
        
        const [updates] = await db.query('SELECT * FROM updates WHERE id = $1', [updateId]);
        
        if (!updates[0]) {
            return res.status(404).json({ error: 'Update not found' });
        }
        
        await db.query(
            'UPDATE updates SET title = $1, content = $2, course_id = $3, updated_at = NOW() WHERE id = $4',
            [title || updates[0].title, content || updates[0].content, course_id || updates[0].course_id, updateId]
        );
        
        res.json({ message: 'Update updated successfully' });
    } catch (error) {
        console.error('Error updating update:', error);
        res.status(500).json({ error: 'Failed to update update' });
    }
});

// Admin delete update endpoint
app.delete('/api/admin/updates/:id', adminMiddleware, async (req, res) => {
    try {
        const updateId = parseInt(req.params.id);
        const [updates] = await db.query('SELECT * FROM updates WHERE id = $1', [updateId]);
        
        if (!updates[0]) {
            return res.status(404).json({ error: 'Update not found' });
        }
        
        await db.query('DELETE FROM updates WHERE id = $1', [updateId]);
        res.json({ message: 'Update deleted successfully' });
    } catch (error) {
        console.error('Error deleting update:', error);
        res.status(500).json({ error: 'Failed to delete update' });
    }
});

// Admin notes endpoint
app.get('/api/admin/notes', adminMiddleware, async (req, res) => {
    try {
        const [notes] = await db.query(`
            SELECT n.*, 
                   s.name as "schoolName", 
                   c.name as "courseName", 
                   u.name as "unitName",
                   p.name as "uploadedByName",
                   i.name as "institutionName", s.institution_id
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN institutions i ON s.institution_id = i.id
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

// Admin delete note endpoint
app.delete('/api/admin/notes/:id', adminMiddleware, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id);
        const [notes] = await db.query('SELECT * FROM notes WHERE id = $1', [noteId]);
        
        if (!notes[0]) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const note = notes[0];
        
        if (note.file_path) {
            const fileName = note.file_path.split('/').pop();
            const filePath = path.join(__dirname, 'uploads', 'notes', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await db.query('DELETE FROM notes WHERE id = $1', [noteId]);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Update note status endpoint
app.put('/api/admin/notes/:id/status', adminMiddleware, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id);
        const { status, message } = req.body;
        
        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const [notes] = await db.query('SELECT * FROM notes WHERE id = $1', [noteId]);
        
        if (!notes[0]) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const note = notes[0];
        await db.query('UPDATE notes SET status = $1 WHERE id = $2', [status, noteId]);
        
        if (message && note.user_id) {
            await db.query(
                'INSERT INTO updates (title, content, user_id, school_id) VALUES ($1, $2, $3, $4)',
                [
                    status === 'approved' ? 'Note Approved' : 'Note Rejected',
                    message,
                    note.user_id,
                    note.school_id
                ]
            );
        }
        
        res.json({ message: 'Note status updated successfully' });
    } catch (error) {
        console.error('Error updating note status:', error);
        res.status(500).json({ error: 'Failed to update note status' });
    }
});

// Create institution endpoint
app.post('/api/admin/institutions', adminMiddleware, async (req, res) => {
    try {
        const { name, staff_domain, student_domain } = req.body;
        const [rows] = await db.query(
            'INSERT INTO institutions (name, staff_domain, student_domain) VALUES ($1, $2, $3) RETURNING id',
            [name, staff_domain, student_domain]
        );
        res.json({ id: rows[0].id, name, staff_domain, student_domain });
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ error: 'Failed to create institution' });
    }
});

// Update institution endpoint
app.put('/api/admin/institutions/:id', adminMiddleware, async (req, res) => {
    try {
        const { name, staff_domain, student_domain } = req.body;
        await db.query(
            'UPDATE institutions SET name = $1, staff_domain = $2, student_domain = $3 WHERE id = $4',
            [name, staff_domain, student_domain, req.params.id]
        );
        res.json({ message: 'Institution updated successfully' });
    } catch (error) {
        console.error('Error updating institution:', error);
        res.status(500).json({ error: 'Failed to update institution' });
    }
});

// Delete institution endpoint
app.delete('/api/admin/institutions/:id', adminMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM institutions WHERE id = $1', [req.params.id]);
        res.json({ message: 'Institution deleted successfully' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ error: 'Failed to delete institution' });
    }
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const [tu]  = await db.query(`SELECT COUNT(*) as count FROM notify_users`);
        const [ts]  = await db.query(`SELECT COUNT(*) as count FROM notify_users WHERE role = 'student'`);
        const [tl]  = await db.query(`SELECT COUNT(*) as count FROM notify_users WHERE role = 'lecturer'`);
        const [ta]  = await db.query(`SELECT COUNT(*) as count FROM notify_users WHERE role = 'admin'`);
        const [tsc] = await db.query(`SELECT COUNT(*) as count FROM schools`);
        const [tc]  = await db.query(`SELECT COUNT(*) as count FROM courses`);
        const [tun] = await db.query(`SELECT COUNT(*) as count FROM units`);
        const [tn]  = await db.query(`SELECT COUNT(*) as count FROM notes`);

        res.json({
            totalUsers:      parseInt(tu[0].count)  || 0,
            totalStudents:   parseInt(ts[0].count)  || 0,
            totalLecturers:  parseInt(tl[0].count)  || 0,
            totalAdmins:     parseInt(ta[0].count)  || 0,
            totalSchools:    parseInt(tsc[0].count) || 0,
            totalCourses:    parseInt(tc[0].count)  || 0,
            totalUnits:      parseInt(tun[0].count) || 0,
            totalNotes:      parseInt(tn[0].count)  || 0
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.post('/api/admin/distribute-units', adminMiddleware, async (req, res) => {
    try {
        const results = [];

        const [businessDept] = await db.query('SELECT id FROM courses WHERE school_id = $1 LIMIT 1', [6]);
        if (businessDept[0]) {
            const [unitRows] = await db.query(`
                INSERT INTO units (name, code) VALUES
                ('Principles of Management', 'BUS101'),
                ('Business Mathematics',     'BUS102'),
                ('Financial Accounting',     'ACC101')
                RETURNING id
            `);
            for (const unit of unitRows) {
                await db.query('INSERT INTO course_units (course_id, unit_id) VALUES ($1, $2)', [businessDept[0].id, unit.id]);
            }
            results.push({ school: 'Business', unitsAdded: 3 });
        }

        const [lawDept] = await db.query('SELECT id FROM courses WHERE school_id = $1 LIMIT 1', [8]);
        if (lawDept[0]) {
            const [unitRows] = await db.query(`
                INSERT INTO units (name, code) VALUES
                ('Legal Methods',      'LAW101'),
                ('Constitutional Law', 'LAW102'),
                ('Criminal Law',       'LAW103')
                RETURNING id
            `);
            for (const unit of unitRows) {
                await db.query('INSERT INTO course_units (course_id, unit_id) VALUES ($1, $2)', [lawDept[0].id, unit.id]);
            }
            results.push({ school: 'Law', unitsAdded: 3 });
        }

        const [commonUnits] = await db.query(`
            INSERT INTO units (name, code) VALUES
            ('Communication Skills',  'COM101'),
            ('Computer Literacy',     'CIT101'),
            ('Research Methodology',  'RES101')
            RETURNING id
        `);
        results.push({ action: 'Common units added', unitsAdded: commonUnits.length });

        res.json({ message: 'Units distributed successfully', results });
    } catch (error) {
        console.error('Error distributing units:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================
// PROFILE PICTURE UPLOAD
// =====================
app.post('/api/user/pfp', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, SECRET);
        console.log('PFP upload - User ID:', decoded.id);

        uploadPfp.single('pfp')(req, res, async (err) => {
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large. Max 2MB' });
                return res.status(400).json({ message: 'File upload error' });
            }
            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).json({ message: 'No file uploaded' });
            }

            console.log('File uploaded:', req.file.filename);

            try {
                const pfpPath = '/uploads/pfps/' + req.file.filename;
                console.log('Updating user', decoded.id, 'with pfp:', pfpPath);
                
                await db.query('UPDATE notify_users SET pfp = $1 WHERE id = $2', [pfpPath, decoded.id]);
                console.log('PFP updated successfully');
                
                res.json({ pfp: pfpPath });
            } catch (dbErr) {
                console.error('Error updating profile picture:', dbErr);
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

// =====================
// 404 Handler
// =====================
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
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
    console.log(`🔍 Debug counts: http://localhost:${PORT}/api/debug/counts`);
    console.log(`🔍 Debug dataService: http://localhost:${PORT}/api/debug/dataService`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;