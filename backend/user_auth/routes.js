const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db'); 
const nodemailer = require('nodemailer'); 
const router = express.Router(); 

const SECRET = process.env.JWT_SECRET || 'notify_fallback_dev_key_change_in_production';

const transporter=nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { message: 'Too many OTP attempts, please try again after 5 minutes' },
    keyGenerator: (req) => req.body.email || 'anonymous',
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('Registration - Password received:', password);
    const emailDomain=email.split('@')[1];

    try {
        const [inst] = await pool.execute(
            'SELECT * FROM institutions WHERE staff_domain = ? OR student_domain = ?',
            [emailDomain, emailDomain]
        );

        if (inst.length === 0) {
            return res.status(400).json({ message: 'This institution is not supported yet.' });
        }

        const institution = inst[0];
        let role = (emailDomain === institution.staff_domain) ? 'lecturer' : 'student';
        
        if (emailDomain === 'admin.notify.com') {
            role = 'admin';
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60000);
        const otpHash = await bcrypt.hash(otp, 5);

        const hashed = await bcrypt.hash(password, 10);
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            await conn.execute(
                `INSERT INTO notify_users(name, email, password, role, institution_id, otp_code, otp_expires_at) 
                 VALUES(?,?,?,?,?,?,?)`,
                [name, email, hashed, role, institution.id, otpHash, expires]
            );

            await transporter.sendMail({
                from: '"Notify" <no-reply@notify.com>',
                to: email,
                subject: "Your Verification Code",
                text: `Your 6-digit code is: ${otp}. It expires in 15 minutes.`
            });

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        res.status(201).json({ message: 'OTP sent to your email. Please verify.' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration Failed' });
    }
});

router.post('/verify-otp', otpLimiter, async (req, res) => {
    const { email, otp } = req.body;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) return res.status(400).json({ message: 'Invalid code' });

        const user = rows[0];
        
        if (!user.otp_code || !(await bcrypt.compare(otp, user.otp_code))) {
            return res.status(400).json({ message: 'Invalid code' });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ message: 'Code expired' });
        }

        await pool.execute(
            'UPDATE notify_users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
            [user.id]
        );

        res.json({ message: 'Account verified successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Verification error' });
    }
});

router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );

        console.log('Login attempt - Email:', email, 'Found:', rows.length);

        if (rows.length === 0) {
            return res.status(400).json({ message: "Invalid details" });
        }

        const user = rows[0];
        console.log('User found - is_verified:', user.is_verified);
        
        if (!user.is_verified) return res.status(401).json({ message: "Please verify your email first" });
        
        const match = await bcrypt.compare(password, user.password);
        console.log('Password match:', match);

        if (!match) {
            return res.status(400).json({ message: "Invalid details" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            role: user.role,
            name: user.name,
            email: user.email,
            id: user.id,
            pfp: user.pfp || null
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/update-profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, SECRET);
        const { name, email } = req.body;
        
        // Check if email is being changed and if it's already taken
        if (email) {
            const [existing] = await pool.execute(
                'SELECT id FROM notify_users WHERE email = ? AND id != ?',
                [email, decoded.id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }
        
        await pool.execute(
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
        
        const [rows] = await pool.execute(
            'SELECT password FROM notify_users WHERE id = ?',
            [decoded.id]
        );
        
        const match = await bcrypt.compare(currentPassword, rows[0].password);
        if (!match) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE notify_users SET password = ? WHERE id = ?',
            [hashed, decoded.id]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to change password' });
    }
});

// Forgot password - send reset OTP
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const [rows] = await pool.execute(
            'SELECT id FROM notify_users WHERE email = ?',
            [email]
        );
        
        if (rows.length === 0) {
            return res.json({ message: 'If the email exists, a reset code has been sent' });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60000);
        const otpHash = await bcrypt.hash(otp, 5);
        
        await pool.execute(
            'UPDATE notify_users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
            [otpHash, expires, email]
        );
        
        await transporter.sendMail({
            from: '"Notify" <no-reply@notify.com>',
            to: email,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${otp}. It expires in 15 minutes.`
        });
        
        res.json({ message: 'If the email exists, a reset code has been sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM notify_users WHERE email = ?',
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        
        const user = rows[0];
        
        if (!user.otp_code || !(await bcrypt.compare(otp, user.otp_code))) {
            return res.status(400).json({ message: 'Invalid reset code' });
        }
        
        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ message: 'Reset code expired' });
        }
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE notify_users SET password = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
            [hashed, email]
        );
        
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

module.exports = router; 