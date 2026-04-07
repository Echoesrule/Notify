// backend/user_auth/routes.js - PostgreSQL Version with Role Assignment
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer'); 
const router = express.Router(); 

const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'notify_fallback_dev_key_change_in_production';

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working on PostgreSQL!' });
});

// Login route
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);

    try {
        const [rows] = await db.query(
            'SELECT * FROM notify_users WHERE email = $1',
            [email]
        );

        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = rows[0];
        console.log('User found:', user.email, 'Role:', user.role);
        
        const match = await bcrypt.compare(password, user.password);
        console.log('Password match:', match);

        if (!match) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            pfp: user.pfp || null
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// Register route - Institutions only for role assignment, NOT a foreign key constraint
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('Registration attempt for:', email);
    
    const emailDomain = email.split('@')[1];
    console.log('Email domain:', emailDomain);

    try {
        // Check if user exists
        const [existing] = await db.query(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );

        if (existing && existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Determine role based on email domain (institutions table is OPTIONAL)
        let role = 'student';
        
        try {
            // Try to find institution by domain (for role assignment only)
            const [institution] = await db.query(
                `SELECT * FROM institutions 
                 WHERE staff_domain = $1 
                    OR student_domain = $2`,
                [emailDomain, emailDomain]
            );

            if (institution && institution.length > 0) {
                const inst = institution[0];
                
                if (inst.staff_domain && emailDomain === inst.staff_domain) {
                    role = 'lecturer';
                    console.log('Lecturer detected for domain:', emailDomain);
                } 
                else if (inst.student_domain && emailDomain === inst.student_domain) {
                    role = 'student';
                    console.log('Student detected for domain:', emailDomain);
                }
            } else {
                console.log('No institution found for domain:', emailDomain, '- using default student role');
            }
        } catch (err) {
            // If institutions table doesn't exist or has issues, just use default role
            console.log('Error checking institutions, using default student role:', err.message);
        }

        console.log('Assigned role:', role);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user WITHOUT institution_id to avoid foreign key constraints
        await db.query(
            `INSERT INTO notify_users (name, email, password, role) 
             VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, role]
        );

        console.log('User registered successfully with role:', role);
        
        res.status(201).json({ 
            success: true,
            message: 'Registration successful! Please login.',
            role: role
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration Failed: ' + error.message });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET);
        const [rows] = await db.query(
            'SELECT id, name, email, role, pfp FROM notify_users WHERE id = ?',
            [decoded.id]
        );
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Auth error:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Update user profile
router.put('/update-profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, SECRET);
        const { name, email } = req.body;
        
        if (email) {
            const [existing] = await db.query(
                'SELECT id FROM notify_users WHERE email = ? AND id != ?',
                [email, decoded.id]
            );
            if (existing && existing.length > 0) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }
        
        await db.query(
            'UPDATE notify_users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
            [name || null, email || null, decoded.id]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Change password
router.put('/change-password', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, SECRET);
        const { currentPassword, newPassword } = req.body;
        
        const [rows] = await db.query(
            'SELECT password FROM notify_users WHERE id = ?',
            [decoded.id]
        );
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const match = await bcrypt.compare(currentPassword, rows[0].password);
        if (!match) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE notify_users SET password = ? WHERE id = ?',
            [hashed, decoded.id]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to change password' });
    }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const [rows] = await db.query(
            'SELECT id FROM notify_users WHERE email = ?',
            [email]
        );
        
        if (!rows || rows.length === 0) {
            return res.json({ message: 'If the email exists, a reset code has been sent' });
        }
        
        res.json({ message: 'If the email exists, a reset code has been sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

// Check institution by email domain
router.post('/check-institution', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.json({ found: false, message: 'Invalid email format' });
    }
    
    const emailDomain = email.split('@')[1].toLowerCase();
    console.log('Checking institution for domain:', emailDomain);
    
    try {
        const [institutions] = await db.query(
            `SELECT * FROM institutions 
             WHERE LOWER(staff_domain) = $1 
                OR LOWER(student_domain) = $1`,
            [emailDomain]
        );
        
        if (institutions && institutions.length > 0) {
            const inst = institutions[0];
            console.log('Institution found:', inst.name);
            return res.json({
                found: true,
                name: inst.name,
                domain: emailDomain
            });
        } else {
            console.log('No institution found for domain:', emailDomain);
            return res.json({
                found: false,
                message: 'Institution not registered',
                domain: emailDomain
            });
        }
    } catch (err) {
        console.error('Error checking institution:', err);
        return res.status(500).json({
            found: false,
            message: 'Unable to verify institution',
            error: err.message
        });
    }
});

module.exports = router;