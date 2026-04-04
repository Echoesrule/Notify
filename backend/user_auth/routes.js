// backend/user_auth/routes.js - PostgreSQL Version
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer'); 
const router = express.Router(); 

// Import db wrapper (NOT pool directly)
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'notify_fallback_dev_key_change_in_production';

// Email transporter (optional - for production use real SMTP)
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

// Test route - to verify auth routes are working
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working on PostgreSQL!' });
});

// Login route - PostgreSQL compatible
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    try {
        // Use db.query (NOT pool.execute) - wrapper converts ? to $1
        const [rows] = await db.query(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );

        console.log('📊 Query result:', rows ? rows.length : 0, 'rows');

        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = rows[0];
        console.log('👤 User found:', user.email, 'Role:', user.role);
        
        // Check if verified (if your table has is_verified column)
        // If not, comment this out
        // if (user.is_verified === false) {
        //     return res.status(401).json({ message: "Please verify your email first" });
        // }
        
        // Compare password
        const match = await bcrypt.compare(password, user.password);
        console.log('🔑 Password match:', match);

        if (!match) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (excluding password)
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
        console.error('❌ Login error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// Register route - PostgreSQL compatible
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('📝 Registration attempt for:', email);

    try {
        // Check if user exists
        const [existing] = await db.query(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );

        if (existing && existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user - PostgreSQL syntax (wrapper handles ? conversion)
        await db.query(
            `INSERT INTO notify_users (name, email, password, role) 
             VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, 'student']
        );

        res.status(201).json({ 
            success: true,
            message: 'Registration successful! Please login.'
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
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
        console.error('❌ Auth error:', err);
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

// Forgot password - send reset OTP (simplified)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const [rows] = await db.query(
            'SELECT id FROM notify_users WHERE email = ?',
            [email]
        );
        
        if (!rows || rows.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If the email exists, a reset code has been sent' });
        }
        
        // For production, implement OTP sending here
        // For now, just return success
        res.json({ message: 'If the email exists, a reset code has been sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

module.exports = router;