// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;

// Use DATABASE_URL for production (Render)
if (process.env.DATABASE_URL) {
    console.log('📊 Connecting using DATABASE_URL');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }, // Render requires SSL for external connections
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        family: 4, // Force IPv4 (Render doesn't support IPv6)
    });
} else {
    // Local development fallback
    console.log('📊 Connecting using individual parameters');
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'notifydb_qu3i',
        user: process.env.DB_USER || 'notifydb_qu3i_user',
        password: process.env.DB_PASSWORD,
        ssl: false,
    });
}

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        release();
    }
});

// Wrapper for MySQL-style queries (converts ? to $1, $2)
const db = {
    query: async (sql, params = []) => {
        // Convert ? placeholders to PostgreSQL $1, $2 format
        let pgSql = sql;
        let counter = 1;
        pgSql = pgSql.replace(/\?/g, () => `$${counter++}`);
        
        try {
            const result = await pool.query(pgSql, params);
            return [result.rows, null];
        } catch (error) {
            console.error('Query error:', error.message);
            console.error('SQL:', pgSql);
            throw error;
        }
    },
    
    getClient: async () => {
        return await pool.connect();
    },
    
    // For transactions
    beginTransaction: async () => {
        const client = await pool.connect();
        await client.query('BEGIN');
        return client;
    },
    
    commit: async (client) => {
        await client.query('COMMIT');
        client.release();
    },
    
    rollback: async (client) => {
        await client.query('ROLLBACK');
        client.release();
    }
};

module.exports = db;