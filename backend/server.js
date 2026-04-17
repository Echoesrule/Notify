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

app.get('/api/db-health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message, timestamp: new Date().toISOString() });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// =====================
// DEBUG ENDPOINTS
// =====================
app.get('/api/check-tables', async (req, res) => {
    try {
        const [tables] = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        res.json({ status: 'ok', tables: tables.map(t => t.table_name), count: tables.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/counts', async (req, res) => {
    try {
        const [schools]          = await db.query('SELECT id, name FROM schools');
        const [usersWithSchool]  = await db.query('SELECT id, name, email, school_id FROM notify_users WHERE school_id IS NOT NULL');
        const [coursesWithSchool]= await db.query('SELECT id, name, school_id FROM courses WHERE school_id IS NOT NULL');

        const [totalUsersRows]   = await db.query('SELECT COUNT(*) as count FROM notify_users');
        const [totalCoursesRows] = await db.query('SELECT COUNT(*) as count FROM courses');
        const [totalUnitsRows]   = await db.query('SELECT COUNT(*) as count FROM units');

        const totalUsers   = parseInt(totalUsersRows[0].count)   || 0;
        const totalCourses = parseInt(totalCoursesRows[0].count) || 0;
        const totalUnits   = parseInt(totalUnitsRows[0].count)   || 0;

        const schoolStats = await Promise.all(schools.map(async (school) => {
            const [uRows] = await db.query('SELECT COUNT(*) as count FROM notify_users WHERE school_id = $1', [school.id]);
            const [cRows] = await db.query('SELECT COUNT(*) as count FROM courses WHERE school_id = $1',     [school.id]);
            return {
                schoolId:    school.id,
                schoolName:  school.name,
                userCount:   parseInt(uRows[0].count) || 0,
                courseCount: parseInt(cRows[0].count) || 0
            };
        }));

        res.json({
            schools,
            usersWithSchool,
            usersWithSchoolCount:   usersWithSchool.length,
            totalUsers,
            coursesWithSchool,
            coursesWithSchoolCount: coursesWithSchool.length,
            totalCourses,
            totalUnits,
            schoolStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/dataService', async (req, res) => {
    try {
        const schools = await dataService.getSchools();
        res.json({
            schoolsCount:                schools.length,
            firstSchool:                 schools[0] || null,
            firstSchoolDepartments:      schools[0]?.departments || [],
            firstSchoolDepartmentsCount: schools[0]?.departments?.length || 0,
            sampleDepartment:            schools[0]?.departments?.[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================
// DATABASE SETUP ENDPOINT
// =====================
app.get('/api/setup', async (req, res) => {
    try {
        console.log('🔧 Running database setup...');

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
                description TEXT,
                school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});
        await db.query(`
            CREATE TABLE IF NOT EXISTS units (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                description TEXT,
                dept_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                is_common_unit BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`ALTER TABLE units ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});
        // Add is_common column if not exists (for older databases)
        await db.query(`ALTER TABLE units ADD COLUMN IF NOT EXISTS is_common_unit BOOLEAN DEFAULT FALSE`).catch(() => {});
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
                status VARCHAR(20) DEFAULT 'pending',
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
                unit_ids TEXT,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS unit_ids TEXT`).catch(() => {});
        await db.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                staff_domain VARCHAR(255),
                student_domain VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_school  ON notes(school_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_dept    ON notes(dept_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_unit    ON notes(unit_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_updates_course ON updates(course_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_users_school  ON notify_users(school_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id)`);

        // Seed schools if empty
        const [schoolCountRows] = await db.query('SELECT COUNT(*) as count FROM schools');
        if (parseInt(schoolCountRows[0].count) === 0) {
            await db.query(`INSERT INTO schools (name) VALUES
                ('School of Computing'),
                ('School of Business'),
                ('School of Engineering'),
                ('School of Medicine')
            `);
            console.log('Sample schools added');
        }

        // Seed users if empty
        const [userCountRows] = await db.query('SELECT COUNT(*) as count FROM notify_users');
        if (parseInt(userCountRows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await db.query(`
                INSERT INTO notify_users (name, email, password, role, school_id)
                VALUES ('Test Student', 'student@test.com', $1, 'student', 1)
            `, [hashedPassword]);
            console.log('Sample user added');
        }

        res.json({
            success: true,
            message: 'Database setup complete!',
            sampleCredentials: { email: 'student@test.com', password: 'password123' }
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================
// MAIN API ENDPOINTS
// =====================
app.get('/api/schools', async (req, res) => {
    try {
        const [schools] = await db.query(`
            SELECT
                s.id,
                s.institution_id,
                s.name,
                s.created_at,
                i.name as "institutionName",
                COUNT(DISTINCT u.id)::int AS "studentCount",
                COUNT(DISTINCT c.id)::int AS "courseCount"
            FROM schools s
            LEFT JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN notify_users u ON u.school_id = s.id
            LEFT JOIN courses c ON c.school_id = s.id
            GROUP BY s.id, s.institution_id, s.name, s.created_at, i.name
            ORDER BY s.name
        `);

        const schoolsWithDetails = await Promise.all(schools.map(async (school) => {
            const [departments] = await db.query(`
                SELECT
                    c.id,
                    c.name,
                    c.code,
                    COUNT(DISTINCT u.id)::int  AS "unitCount",
                    COUNT(DISTINCT uc.user_id)::int AS "studentCount"
                FROM courses c
                LEFT JOIN course_units cu ON cu.course_id = c.id
                LEFT JOIN units u ON u.id = cu.unit_id
                LEFT JOIN user_courses uc ON uc.course_id = c.id
                WHERE c.school_id = $1
                GROUP BY c.id, c.name, c.code
                ORDER BY c.name
            `, [school.id]);

            const departmentsWithUnits = await Promise.all(departments.map(async (dept) => {
                const [units] = await db.query(`
                    SELECT
                        u.id,
                        u.name,
                        u.code,
                        COUNT(DISTINCT n.id)::int AS "noteCount"
                    FROM units u
                    LEFT JOIN course_units cu ON cu.unit_id = u.id
                    LEFT JOIN notes n ON n.unit_id = u.id
                    WHERE cu.course_id = $1
                    GROUP BY u.id, u.name, u.code
                    ORDER BY u.name
                `, [dept.id]);

                return {
                    ...dept,
                    units,
                    unitCount:    units.length,
                    studentCount: parseInt(dept.studentCount) || 0
                };
            }));

            const [commonUnits] = await db.query(`
                SELECT
                    u.id,
                    u.name,
                    u.code,
                    COUNT(DISTINCT cu.course_id)::int AS "courseCount",
                    COUNT(DISTINCT n.id)::int AS "noteCount"
                FROM units u
                LEFT JOIN course_units cu ON cu.unit_id = u.id
                LEFT JOIN notes n ON n.unit_id = u.id
                GROUP BY u.id, u.name, u.code
                HAVING COUNT(DISTINCT cu.course_id) > 1
                ORDER BY u.name
            `);

            const totalUnits = departmentsWithUnits.reduce((sum, d) => sum + d.unitCount, 0);

            return {
                id:           school.id,
                name:         school.name,
                created_at:   school.created_at,
                studentCount: parseInt(school.studentCount) || 0,
                courseCount:  parseInt(school.courseCount)  || 0,
                unitCount:    totalUnits,
                commonUnits,
                departments:  departmentsWithUnits
            };
        }));

        console.log('✅ Schools fetched successfully:');
        schoolsWithDetails.forEach(s =>
            console.log(`  📚 ${s.name}: ${s.courseCount} courses, ${s.studentCount} students`)
        );

        res.json(schoolsWithDetails);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Failed to fetch schools: ' + error.message });
    }
});

app.get('/api/schools/:schoolId', async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);

        const [schools] = await db.query(`
            SELECT s.*,
                   COUNT(DISTINCT u.id)::int AS "studentCount",
                   COUNT(DISTINCT c.id)::int AS "courseCount"
            FROM schools s
            LEFT JOIN notify_users u ON u.school_id = s.id
            LEFT JOIN courses c ON c.school_id = s.id
            WHERE s.id = $1
            GROUP BY s.id
        `, [schoolId]);

        if (!schools[0]) return res.status(404).json({ message: 'School not found' });

        const [departments] = await db.query(`
            SELECT c.*, COUNT(DISTINCT cu.unit_id)::int AS "unitCount"
            FROM courses c
            LEFT JOIN course_units cu ON cu.course_id = c.id
            WHERE c.school_id = $1
            GROUP BY c.id
            ORDER BY c.name
        `, [schoolId]);

        for (const dept of departments) {
            const [units] = await db.query(`
                SELECT u.*, COUNT(DISTINCT n.id)::int AS "noteCount"
                FROM units u
                LEFT JOIN course_units cu ON cu.unit_id = u.id
                LEFT JOIN notes n ON n.unit_id = u.id
                WHERE cu.course_id = $1
                GROUP BY u.id
                ORDER BY u.name
            `, [dept.id]);
            dept.units = units;
        }

        res.json({
            ...schools[0],
            departments,
            studentCount: parseInt(schools[0].studentCount) || 0,
            courseCount:  parseInt(schools[0].courseCount)  || 0
        });
    } catch (error) {
        console.error('Error fetching school:', error);
        res.status(500).json({ error: 'Failed to fetch school' });
    }
});

app.get('/api/schools-legacy', async (req, res) => {
    try {
        const schools = await dataService.getSchools();
        res.json(schools);
    } catch (error) {
        console.error('Error fetching schools from dataService:', error);
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

app.post('/api/schools', async (req, res) => {
    try {
        const { name, institution_id } = req.body;
        if (!name) return res.status(400).json({ error: 'School name is required' });
        const [rows] = await db.query('INSERT INTO schools (name, institution_id) VALUES ($1, $2) RETURNING id', [name, institution_id || null]);
        res.json({ id: rows[0].id, name, institution_id });
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Failed to create school' });
    }
});

app.get('/api/departments', async (req, res) => {
    try {
        const [departments] = await db.query(`
            SELECT c.*, s.name as "schoolName"
            FROM courses c
            LEFT JOIN schools s ON c.school_id = s.id
            ORDER BY c.name
        `);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to load departments' });
    }
});

app.get('/api/schools/:schoolId/departments', async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const [departments] = await db.query(`
            SELECT
                c.*,
                COUNT(DISTINCT cu.unit_id)::int AS "unitCount",
                COUNT(DISTINCT uc.user_id)::int AS "studentCount",
                COUNT(DISTINCT n.id)::int   AS "noteCount"
            FROM courses c
            LEFT JOIN course_units cu ON cu.course_id = c.id
            LEFT JOIN user_courses uc ON uc.course_id = c.id
            LEFT JOIN notes n ON n.dept_id = c.id
            WHERE c.school_id = $1
            GROUP BY c.id
            ORDER BY c.name
        `, [schoolId]);
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

app.get('/api/schools/:schoolId/departments/:deptId', async (req, res) => {
    try {
        const [departments] = await db.query(`
            SELECT c.*, s.name as "schoolName"
            FROM courses c
            LEFT JOIN schools s ON c.school_id = s.id
            WHERE c.id = $1 AND c.school_id = $2
        `, [req.params.deptId, req.params.schoolId]);

        if (!departments[0]) return res.status(404).json({ message: 'Department not found' });
        res.json(departments[0]);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const { name, code, school_id } = req.body;
        if (!name || !school_id) return res.status(400).json({ error: 'Name and school_id are required' });
        const [rows] = await db.query(
            'INSERT INTO courses (name, code, school_id) VALUES ($1, $2, $3) RETURNING id',
            [name, code, school_id]
        );
        res.json({ id: rows[0].id, name, code, school_id });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

app.get('/api/schools/:schoolId/departments/:deptId/units', async (req, res) => {
    try {
        const currentUserId = req.query.userId;
        
        const [units] = await db.query(`
            SELECT u.*, 
                   COUNT(DISTINCT n.id)::int AS "noteCount",
                   (SELECT COUNT(*)::int FROM user_courses uc 
                    WHERE uc.status = 'active' 
                    AND (uc.unit_ids::text LIKE '%,' || u.id || ',%' 
                         OR uc.unit_ids::text LIKE u.id || ',%'
                         OR uc.unit_ids::text LIKE '%,' || u.id
                         OR uc.unit_ids::text = u.id::text)) AS "enrolled"
            FROM units u
            LEFT JOIN course_units cu ON cu.unit_id = u.id
            LEFT JOIN courses c ON cu.course_id = c.id
            LEFT JOIN notes n ON n.unit_id = u.id
            WHERE cu.course_id = $1
            GROUP BY u.id
            ORDER BY u.name
        `, [req.params.deptId]);
        
        // Add isEnrolled flag for current user
        if (currentUserId) {
            const [userCourse] = await db.query(
                'SELECT unit_ids FROM user_courses WHERE user_id = $1 AND course_id = $2 AND status = $3',
                [parseInt(currentUserId), parseInt(req.params.deptId), 'active']
            );
            const enrolledUnitIds = userCourse[0]?.unit_ids ? userCourse[0].unit_ids.split(',').map(Number) : [];
            units.forEach(u => {
                u.isEnrolled = enrolledUnitIds.includes(u.id);
            });
        }
        
        res.json(units);
    } catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

app.get('/api/schools/:schoolId/departments/:deptId/units/:unitId', async (req, res) => {
    try {
        const [units] = await db.query(`
            SELECT u.*, c.name as "courseName", s.name as "schoolName"
            FROM units u
            LEFT JOIN course_units cu ON cu.unit_id = u.id
            LEFT JOIN courses c ON cu.course_id = c.id
            LEFT JOIN schools s ON c.school_id = s.id
            WHERE u.id = $1
        `, [req.params.unitId]);

        if (!units[0]) return res.status(404).json({ message: 'Unit not found' });
        res.json(units[0]);
    } catch (error) {
        console.error('Error fetching unit:', error);
        res.status(500).json({ error: 'Failed to fetch unit' });
    }
});

app.post('/api/units', async (req, res) => {
    try {
        const { name, code, school_id, course_id, is_common_unit } = req.body;
        console.log('Creating unit:', { name, code, school_id, course_id, is_common_unit });
        if (!name || !school_id) return res.status(400).json({ error: 'Name and school_id are required' });
        
        // Check if unit with same name already exists (case-insensitive)
        const [existingUnits] = await db.query(
            'SELECT id, name, code, is_common_unit FROM units WHERE LOWER(name) = LOWER($1)',
            [name]
        );
        
        let unitId;
        
        if (existingUnits.length > 0) {
            // Unit exists - use existing one
            unitId = existingUnits[0].id;
            console.log('Using existing unit:', unitId, existingUnits[0].name);
            // Update is_common_unit if requested
            if (is_common_unit && !existingUnits[0].is_common_unit) {
                await db.query('UPDATE units SET is_common_unit = TRUE WHERE id = $1', [unitId]);
            }
        } else {
            // Create new unit
            const [rows] = await db.query(
                'INSERT INTO units (name, code, is_common_unit) VALUES ($1, $2, $3) RETURNING id',
                [name, code, is_common_unit || false]
            );
            unitId = rows[0].id;
            console.log('Created new unit:', unitId);
        }
        
        // Link unit to course if course_id provided
        if (course_id) {
            console.log('Linking unit to course_id:', course_id);
            // Check if link already exists
            const [existingLink] = await db.query(
                'SELECT 1 FROM course_units WHERE course_id = $1 AND unit_id = $2',
                [course_id, unitId]
            );
            
            if (existingLink.length === 0) {
                await db.query(
                    'INSERT INTO course_units (course_id, unit_id) VALUES ($1, $2)',
                    [course_id, unitId]
                );
                console.log('Linked unit to course:', course_id);
            } else {
                console.log('Unit already linked to course');
            }
        }
        
        res.json({ id: unitId, name, code, course_id, is_common_unit: is_common_unit || existingUnits[0]?.is_common_unit || false, isExisting: existingUnits.length > 0 });
    } catch (error) {
        console.error('Error creating unit:', error);
        res.status(500).json({ error: 'Failed to create unit' });
    }
});

// Link unit to additional courses (for shared/common units)
app.post('/api/units/:unitId/link-courses', async (req, res) => {
    try {
        const { course_ids, is_common_unit = true } = req.body;
        const { unitId } = req.params;
        
        if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
            return res.status(400).json({ error: 'course_ids array is required' });
        }
        
        // Mark unit as common if linking to multiple courses
        await db.query('UPDATE units SET is_common_unit = TRUE WHERE id = $1', [unitId]);
        
        const linked = [];
        for (const course_id of course_ids) {
            const [existing] = await db.query(
                'SELECT 1 FROM course_units WHERE course_id = $1 AND unit_id = $2',
                [course_id, unitId]
            );
            
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO course_units (course_id, unit_id) VALUES ($1, $2)',
                    [course_id, unitId]
                );
                linked.push(course_id);
            }
        }
        
        res.json({ message: `Unit linked to ${linked.length} course(s)`, linked });
    } catch (error) {
        console.error('Error linking unit to courses:', error);
        res.status(500).json({ error: 'Failed to link unit to courses' });
    }
});

// Get courses linked to a unit
app.get('/api/units/:unitId/courses', async (req, res) => {
    try {
        const { unitId } = req.params;
        const [courses] = await db.query(`
            SELECT c.id, c.name, s.name as school_name
            FROM course_units cu
            JOIN courses c ON cu.course_id = c.id
            JOIN schools s ON c.school_id = s.id
            WHERE cu.unit_id = $1
        `, [unitId]);
        res.json(courses);
    } catch (error) {
        console.error('Error fetching unit courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.delete('/api/units/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM units WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});

// =====================
// NOTES ENDPOINTS
// =====================
app.get('/api/schools/:schoolId/departments/:deptId/units/:unitId/notes', async (req, res) => {
    console.log('Notes endpoint hit:', req.params);
    try {
        const [notes] = await db.query(`
            SELECT n.*, 
                   u.name as "uploadedByName",
                   s.name as "schoolName",
                   s.institution_id,
                   COALESCE(ui.name, i2.name, i.name) as "uploaderInstitution",
                   COALESCE(i.name, i2.name) as "institutionName",
                   c.name as "courseName",
                   un.name as "unitName"
            FROM notes n
            LEFT JOIN notify_users u ON n.user_id = u.id
            LEFT JOIN institutions ui ON u.institution_id = ui.id
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN institutions i2 ON n.institution_id = i2.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units un ON n.unit_id = un.id
            WHERE n.unit_id = $1 AND (n.status = 'approved' OR n.status IS NULL)
            ORDER BY n.created_at DESC
        `, [req.params.unitId]);
        console.log('Notes found:', notes.length);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        let query = `
            SELECT n.*, s.name as "schoolName", c.name as "deptName", u.name as "unitName",
                   s.id as "schoolId", c.id as "deptId", u.id as "unitId",
                   p.name as "uploadedByName",
                   COALESCE(ui.name, i.name) as "uploaderInstitution",
                   i.name as "institutionName", s.institution_id
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            LEFT JOIN institutions ui ON p.institution_id = ui.id
            WHERE (n.status = 'approved' OR n.status IS NULL)
        `;
        const params = [];
        if (schoolId && !isNaN(parseInt(schoolId))) {
            query += ` AND n.school_id = $1`;
            params.push(parseInt(schoolId));
        }
        query += ` ORDER BY n.created_at DESC`;

        const [notes] = await db.query(query, params);
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
            SELECT n.*, s.name as "schoolName", c.name as "courseName", u.name as "unitName",
                   u.id as "unitId", u.code as "unitCode",
                   p.name as "uploadedByName",
                   i.name as "institutionName", s.institution_id
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.user_id = $1
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
        const { title, description, school_id, dept_id, unit_id, userId, institution_id } = req.body;
        if (!title || !school_id || !dept_id || !unit_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const filePath = req.file ? '/uploads/notes/' + req.file.filename : null;
        
        // If no institution_id provided, try to get from school's institution
        let finalInstitutionId = institution_id;
        console.log('Creating note - institution_id from request:', institution_id, 'school_id:', school_id);
        if (!finalInstitutionId) {
            try {
                const [schoolRows] = await db.query('SELECT institution_id FROM schools WHERE id = $1', [school_id]);
                console.log('School institution_id:', schoolRows[0]?.institution_id);
                finalInstitutionId = schoolRows[0]?.institution_id;
            } catch(e) {}
        }
        
        const [rows] = await db.query(`
            INSERT INTO notes (title, description, file_path, school_id, dept_id, unit_id, user_id, institution_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING id, status
        `, [title, description, filePath, school_id, dept_id, unit_id, userId || null, finalInstitutionId || null]);
        res.json({ id: rows[0].id, status: rows[0].status, title, description, file_path: filePath });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Preview note (serve PDF inline)
app.get('/api/notes/:id/preview', async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE id = $1', [parseInt(req.params.id)]);
        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });

        const note = notes[0];
        if (!note.file_path) return res.status(404).json({ error: 'No file attached to this note' });
        
        // Only allow approved notes for students (or notes uploaded by the current user)
        if (note.status === 'pending' || note.status === 'rejected') {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, SECRET);
                    if (decoded.id !== note.user_id) {
                        return res.status(403).json({ error: 'Note not available' });
                    }
                } catch {}
            } else {
                return res.status(403).json({ error: 'Note not available' });
            }
        }

        const fileName = note.file_path.split('/').pop();
        const filePath = path.join(__dirname, 'uploads', 'notes', fileName);

        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server' });
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error previewing note:', error);
        res.status(500).json({ error: 'Failed to preview note' });
    }
});

// Download note
app.get('/api/notes/:id/download', async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE id = $1', [parseInt(req.params.id)]);
        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });

        const note = notes[0];
        if (!note.file_path) return res.status(404).json({ error: 'No file attached to this note' });
        
        // Only allow approved notes for students
        if (note.status === 'pending' || note.status === 'rejected') {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, SECRET);
                    if (decoded.id !== note.user_id) {
                        return res.status(403).json({ error: 'Note not available' });
                    }
                } catch {}
            } else {
                return res.status(403).json({ error: 'Note not available' });
            }
        }

        await db.query('UPDATE notes SET downloads = COALESCE(downloads, 0) + 1 WHERE id = $1', [req.params.id]);

        const fileName = note.file_path.split('/').pop();
        const filePath = path.join(__dirname, 'uploads', 'notes', fileName);

        console.log('Download - filePath:', filePath);
        console.log('Download - file exists:', fs.existsSync(filePath));

        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server: ' + filePath });
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading note:', error);
        res.status(500).json({ error: 'Failed to download note' });
    }
});

// Get single note
app.get('/api/notes/:id', async (req, res) => {
    try {
        const [notes] = await db.query(`
            SELECT n.*, s.name as "schoolName", c.name as "courseName", u.name as "unitName",
                   u.id as "unitId", u.code as "unitCode",
                   p.name as "uploadedByName"
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.id = $1
        `, [parseInt(req.params.id)]);

        if (!notes[0]) return res.status(404).json({ error: 'Note not found' });
        res.json(notes[0]);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// =====================
// UPDATES ENDPOINTS
// =====================
app.get('/api/updates', async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        let query = `
            SELECT u.*, c.name as "courseName", c.school_id, p.name as "postedByName"
            FROM updates u
            LEFT JOIN courses c ON u.course_id = c.id
            LEFT JOIN notify_users p ON u.user_id = p.id
        `;
        const params = [];
        if (schoolId && !isNaN(parseInt(schoolId)) && parseInt(schoolId) > 0) {
            query += ` WHERE (c.school_id = $1 OR u.course_id IS NULL OR u.course_id = 0)`;
            params.push(parseInt(schoolId));
        }
        query += ` ORDER BY u.created_at DESC`;

        const [updates] = await db.query(query, params);
        res.json(updates);
    } catch (error) {
        console.error('Updates error:', error);
        res.status(500).json({ error: 'Failed to load updates' });
    }
});

app.get('/api/updates/my-updates', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });
        
        const [updates] = await db.query(`
            SELECT u.*, c.name as "courseName", c.school_id, p.name as "postedByName"
            FROM updates u
            LEFT JOIN courses c ON u.course_id = c.id
            LEFT JOIN notify_users p ON u.user_id = p.id
            WHERE u.user_id = $1
            ORDER BY u.created_at DESC
        `, [parseInt(userId)]);
        res.json(updates);
    } catch (error) {
        console.error('My updates error:', error);
        res.status(500).json({ error: 'Failed to load my updates' });
    }
});

app.post('/api/updates', async (req, res) => {
    try {
        const { title, content, course_id, userId } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

        const [rows] = await db.query(
            'INSERT INTO updates (title, content, course_id, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [title, content, course_id || null, userId || null]
        );
        res.json({ id: rows[0].id, title, content });
    } catch (error) {
        console.error('Error creating update:', error);
        res.status(500).json({ error: 'Failed to create update' });
    }
});

// =====================
// USER ENROLLMENT
// =====================
app.post('/api/users/enroll', async (req, res) => {
    try {
        const { userId, schoolId, courseId } = req.body;
        const userIdInt   = parseInt(userId);
        const courseIdInt = parseInt(courseId);
        const schoolIdInt = parseInt(schoolId);

        // Get all units for this course
        const [courseUnits] = await db.query(
            'SELECT unit_id FROM course_units WHERE course_id = $1',
            [courseIdInt]
        );
        const unitIds = courseUnits.map(cu => cu.unit_id).join(',');

        await db.query('DELETE FROM user_courses WHERE user_id = $1', [userIdInt]);
        await db.query(
            'INSERT INTO user_courses (user_id, course_id, school_id, unit_ids, status) VALUES ($1, $2, $3, $4, $5)',
            [userIdInt, courseIdInt, schoolIdInt, unitIds, 'active']
        );
        await db.query('UPDATE notify_users SET school_id = $1 WHERE id = $2', [schoolIdInt, userIdInt]);

        const [courseInfo] = await db.query(`
            SELECT c.*, s.name as "schoolName"
            FROM courses c
            LEFT JOIN schools s ON c.school_id = s.id
            WHERE c.id = $1
        `, [courseIdInt]);

        res.json({ message: 'Successfully enrolled', course: courseInfo[0] });
    } catch (error) {
        console.error('Error enrolling:', error);
        res.status(500).json({ error: 'Failed to enroll: ' + error.message });
    }
});

// Enroll in specific unit(s)
app.post('/api/users/enroll-units', async (req, res) => {
    try {
        const { userId, unitIds, schoolId, courseId } = req.body;
        const userIdInt = parseInt(userId);
        const schoolIdInt = parseInt(schoolId);
        const courseIdInt = parseInt(courseId);
        const unitIdsArray = Array.isArray(unitIds) ? unitIds : [unitIds];
        
        // Check if user has existing enrollment for this course
        const [existing] = await db.query(
            'SELECT unit_ids FROM user_courses WHERE user_id = $1 AND course_id = $2',
            [userIdInt, courseIdInt]
        );
        
        let currentUnitIds = [];
        if (existing[0]?.unit_ids) {
            currentUnitIds = existing[0].unit_ids.split(',').filter(id => id).map(Number);
        }
        
        // Add new unit IDs (avoid duplicates)
        const newUnitIds = [...new Set([...currentUnitIds, ...unitIdsArray.map(Number)])];
        const unitIdsStr = newUnitIds.join(',');
        
        if (existing.length > 0) {
            await db.query(
                'UPDATE user_courses SET unit_ids = $1 WHERE user_id = $2 AND course_id = $3',
                [unitIdsStr, userIdInt, courseIdInt]
            );
        } else {
            await db.query(
                'INSERT INTO user_courses (user_id, course_id, school_id, unit_ids, status) VALUES ($1, $2, $3, $4, $5)',
                [userIdInt, courseIdInt, schoolIdInt, unitIdsStr, 'active']
            );
            await db.query('UPDATE notify_users SET school_id = $1 WHERE id = $2', [schoolIdInt, userIdInt]);
        }
        
        res.json({ message: 'Successfully enrolled in units', unitIds: newUnitIds });
    } catch (error) {
        console.error('Error enrolling in units:', error);
        res.status(500).json({ error: 'Failed to enroll in units: ' + error.message });
    }
});

app.post('/api/users/enroll-school', async (req, res) => {
    try {
        const { userId, schoolId } = req.body;
        const userIdInt  = parseInt(userId);
        const schoolIdInt = parseInt(schoolId);

        const [currentUser] = await db.query('SELECT school_id FROM notify_users WHERE id = $1', [userIdInt]);
        const oldSchoolId = currentUser[0]?.school_id;

        if (oldSchoolId && parseInt(oldSchoolId) !== schoolIdInt) {
            await db.query(
                'DELETE FROM user_courses WHERE user_id = $1 AND school_id = $2',
                [userIdInt, oldSchoolId]
            );
        }

        await db.query('UPDATE notify_users SET school_id = $1 WHERE id = $2', [schoolIdInt, userIdInt]);

        const [schoolInfo] = await db.query('SELECT * FROM schools WHERE id = $1', [schoolIdInt]);
        res.json({ message: 'Successfully joined ' + schoolInfo[0]?.name, school: schoolInfo[0] });
    } catch (error) {
        console.error('Error enrolling in school:', error);
        res.status(500).json({ error: 'Failed to enroll' });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, role, pfp FROM notify_users WHERE id = $1', [req.params.userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.get('/api/users/:userId/enrollment', async (req, res) => {
    try {
        const [enrollments] = await db.query(`
            SELECT uc.*, c.name as "courseName", c.school_id, s.name as "schoolName"
            FROM user_courses uc
            LEFT JOIN courses c ON uc.course_id = c.id
            LEFT JOIN schools s ON c.school_id = s.id
            WHERE uc.user_id = $1 AND uc.status = 'active'
        `, [req.params.userId]);
        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollment:', error);
        res.status(500).json({ error: 'Failed to fetch enrollment' });
    }
});

// =====================
// COUNTS ENDPOINTS
// =====================
app.get('/api/counts', async (req, res) => {
    try {
        const [users] = await db.query('SELECT COUNT(*) as count FROM notify_users');
        const [notes] = await db.query('SELECT COUNT(*) as count FROM notes');
        const [sc] = await db.query('SELECT COUNT(*) as count FROM schools');
        const [c] = await db.query('SELECT COUNT(*) as count FROM courses');
        const [inst] = await db.query('SELECT COUNT(*) as count FROM institutions');

        const studentCount = parseInt(users[0]?.count)  || 0;
        const noteCount = parseInt(notes[0]?.count)  || 0;
        const schoolCount = parseInt(sc[0]?.count) || 0;
        const courseCount = parseInt(c[0]?.count)  || 0;
        
        console.log('Counts:', { students: studentCount, notes: noteCount, schools: schoolCount, courses: courseCount });

        res.json({
            students: studentCount,
            notes:    noteCount,
            schools:  schoolCount,
            courses:  courseCount
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

app.get('/api/schools/:schoolId/counts', async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const [s]  = await db.query('SELECT COUNT(*) as count FROM notify_users WHERE school_id = $1', [schoolId]);
        const [n]  = await db.query('SELECT COUNT(*) as count FROM notes WHERE school_id = $1',        [schoolId]);
        const [c]  = await db.query('SELECT COUNT(*) as count FROM courses WHERE school_id = $1',      [schoolId]);

        res.json({
            students: parseInt(s[0].count) || 0,
            notes:    parseInt(n[0].count) || 0,
            courses:  parseInt(c[0].count) || 0
        });
    } catch (error) {
        console.error('Error fetching school counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// =====================
// ADMIN ENDPOINTS
// =====================
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        // Remove the institutions join since institution_id doesn't exist
        const [users] = await db.query(`
            SELECT 
                nu.id,
                nu.name,
                nu.email,
                nu.role,
                nu.school_id,
                nu.pfp,
                nu.created_at,
                s.name as "schoolName"
            FROM notify_users nu
            LEFT JOIN schools s ON nu.school_id = s.id
            ORDER BY nu.created_at DESC
        `);
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
    }
});

app.post('/api/admin/users/:id/promote', adminMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        
        if (!role || !['lecturer', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be lecturer or admin' });
        }
        
        await db.query('UPDATE notify_users SET role = $1 WHERE id = $2', [role, userId]);
        res.json({ message: `User promoted to ${role}`, role });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ error: 'Failed to promote user: ' + error.message });
    }
});

app.get('/api/admin/schools', adminMiddleware, async (req, res) => {
    try {
        const [schools] = await db.query(`
            SELECT s.*,
                   i.name as "institutionName",
                   COUNT(DISTINCT u.id)::int AS "studentCount",
                   COUNT(DISTINCT c.id)::int AS "courseCount",
                   COUNT(DISTINCT n.id)::int AS "noteCount"
            FROM schools s
            LEFT JOIN institutions i ON s.institution_id = i.id
            LEFT JOIN notify_users u ON u.school_id = s.id
            LEFT JOIN courses c ON c.school_id = s.id
            LEFT JOIN notes n ON n.school_id = s.id
            GROUP BY s.id, i.name
            ORDER BY s.name
        `);
        res.json(schools);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

app.post('/api/admin/schools', adminMiddleware, async (req, res) => {
    try {
        const { name, institution_id } = req.body;
        const [rows] = await db.query('INSERT INTO schools (name, institution_id) VALUES ($1, $2) RETURNING id', [name, institution_id || null]);
        res.json({ id: rows[0].id, name, institution_id });
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Failed to create school' });
    }
});

app.put('/api/admin/schools/:id', adminMiddleware, async (req, res) => {
    try {
        const { name, institution_id } = req.body;
        await db.query('UPDATE schools SET name = $1, institution_id = $2 WHERE id = $3', [name, institution_id, req.params.id]);
        res.json({ message: 'School updated successfully' });
    } catch (error) {
        console.error('Error updating school:', error);
        res.status(500).json({ error: 'Failed to update school' });
    }
});

app.delete('/api/admin/schools/:id', adminMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM schools WHERE id = $1', [req.params.id]);
        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('Error deleting school:', error);
        res.status(500).json({ error: 'Failed to delete school' });
    }
});

app.get('/api/admin/courses', adminMiddleware, async (req, res) => {
    try {
        const [courses] = await db.query(`
            SELECT c.*, s.name as "schoolName",
                   COUNT(DISTINCT cu.unit_id)::int AS "unitCount",
                   COUNT(DISTINCT uc.user_id)::int AS "studentCount"
            FROM courses c
            LEFT JOIN schools s ON c.school_id = s.id
            LEFT JOIN course_units cu ON cu.course_id = c.id
            LEFT JOIN user_courses uc ON uc.course_id = c.id
            GROUP BY c.id, s.name
            ORDER BY c.name
        `);
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.post('/api/admin/courses', adminMiddleware, async (req, res) => {
    try {
        const { name, code, school_id, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        const [rows] = await db.query(
            'INSERT INTO courses (name, code, school_id, description) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, code || null, school_id || null, description || null]
        );
        res.json({ id: rows[0].id, name, code, school_id, description });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

app.put('/api/admin/courses/:id', adminMiddleware, async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const { name, code, description } = req.body;
        
        await db.query(
            'UPDATE courses SET name = $1, code = $2, description = $3 WHERE id = $4',
            [name, code || null, description || null, courseId]
        );
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

app.delete('/api/admin/courses/:id', adminMiddleware, async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        await db.query('DELETE FROM course_units WHERE course_id = $1', [courseId]);
        await db.query('DELETE FROM courses WHERE id = $1', [courseId]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

app.get('/api/admin/schools/:schoolId/courses', adminMiddleware, async (req, res) => {
    try {
        const schoolId = parseInt(req.params.schoolId);
        const [courses] = await db.query(`
            SELECT c.id, c.name, c.code
            FROM courses c
            WHERE c.school_id = $1
            ORDER BY c.name
        `, [schoolId]);
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses for school:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});



// Admin institutions endpoint
app.get('/api/admin/institutions', adminMiddleware, async (req, res) => {
    try {
        const [institutions] = await db.query(`
            SELECT * FROM institutions ORDER BY name
        `);
        res.json(institutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

// Admin units endpoint
app.get('/api/admin/units', adminMiddleware, async (req, res) => {
    try {
        const [units] = await db.query(`
            SELECT u.*,
                   c.name as "courseName",
                   COUNT(DISTINCT n.id)::int AS "noteCount"
            FROM units u
            LEFT JOIN course_units cu ON cu.unit_id = u.id
            LEFT JOIN courses c ON cu.course_id = c.id
            LEFT JOIN notes n ON n.unit_id = u.id
            GROUP BY u.id, c.name
            ORDER BY u.name
        `);
        res.json(units);
    } catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

// Create unit (admin)
app.post('/api/admin/units', adminMiddleware, async (req, res) => {
    try {
        const { name, code, course_id, is_common_unit, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        const [rows] = await db.query(
            'INSERT INTO units (name, code, is_common_unit, description) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, code || null, is_common_unit || false, description || null]
        );
        
        const unitId = rows[0].id;
        
        if (course_id) {
            await db.query('INSERT INTO course_units (course_id, unit_id) VALUES ($1, $2)', [course_id, unitId]);
        }
        
        res.json({ id: unitId, name, code, is_common_unit, description });
    } catch (error) {
        console.error('Error creating unit:', error);
        res.status(500).json({ error: 'Failed to create unit' });
    }
});

app.delete('/api/admin/units/:id', adminMiddleware, async (req, res) => {
    try {
        const unitId = parseInt(req.params.id);
        await db.query('DELETE FROM notes WHERE unit_id = $1', [unitId]);
        await db.query('DELETE FROM course_units WHERE unit_id = $1', [unitId]);
        await db.query('DELETE FROM units WHERE id = $1', [unitId]);
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});

app.put('/api/admin/units/:id', adminMiddleware, async (req, res) => {
    try {
        const unitId = parseInt(req.params.id);
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        await db.query('UPDATE units SET name = $1 WHERE id = $2', [name, unitId]);
        res.json({ message: 'Unit updated successfully' });
    } catch (error) {
        console.error('Error updating unit:', error);
        res.status(500).json({ error: 'Failed to update unit' });
    }
});

// Admin updates endpoint
app.get('/api/admin/updates', adminMiddleware, async (req, res) => {
    try {
        const [updates] = await db.query(`
            SELECT u.*, 
                   c.name as "courseName", 
                   p.name as "postedByName"
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