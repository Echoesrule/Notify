// backend/user_auth/routes.js - PostgreSQL Version with Role Assignment
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer'); 
const router = express.Router(); 

const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'notify_fallback_dev_key_change_in_production';

let transporter;
if (process.env.BREVO_API_KEY) {
    transporter = null;
} else if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

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

// Store reset codes in memory (resets on server restart - consider DB for production)
const resetCodes = new Map();

function generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// Forgot password - sends code
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const [rows] = await db.query(
            'SELECT id, name FROM notify_users WHERE email = $1',
            [email]
        );
        
        if (!rows || rows.length === 0) {
            return res.json({ message: 'If the email exists, a reset code has been sent' });
        }
        
        const user = rows[0];
        const code = generateResetCode();
        
        // Store code with 10 min expiry
        resetCodes.set(email, {
            code,
            userId: user.id,
            expires: Date.now() + 10 * 60 * 1000
        });
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Code</h2>
                <p>Hi ${user.name},</p>
                <p>Your password reset code is:</p>
                <h1 style="font-size: 36px; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">${code}</h1>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            </div>
        `;
        
        if (process.env.BREVO_API_KEY) {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.BREVO_API_KEY
                },
                body: JSON.stringify({
                    sender: { name: 'Notify App', email: process.env.BREVO_SENDER_EMAIL },
                    to: [{ email }],
                    subject: 'Password Reset Code - Notify App',
                    htmlContent
                })
            });
            
            if (!response.ok) {
                throw new Error('Brevo API error');
            }
        } else if (transporter) {
            const mailOptions = {
                from: `"Notify App" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Password Reset Code - Notify App',
                html: htmlContent
            };
            await transporter.sendMail(mailOptions);
        } else {
            throw new Error('No email service configured');
        }
        
        console.log('Password reset code sent to:', email, 'Code:', code);
        res.json({ message: 'Reset code sent to your email', email });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Failed to send reset code' });
    }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: 'Email, code, and new password required' });
    }
    
    const stored = resetCodes.get(email);
    
    if (!stored) {
        return res.status(400).json({ message: 'No reset code found. Request a new one.' });
    }
    
    if (Date.now() > stored.expires) {
        resetCodes.delete(email);
        return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }
    
    if (stored.code !== code) {
        return res.status(400).json({ message: 'Invalid code' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE notify_users SET password = $1 WHERE id = $2',
            [hashedPassword, stored.userId]
        );
        
        resetCodes.delete(email);
        
        console.log('Password reset successful for:', email);
        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password' });
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