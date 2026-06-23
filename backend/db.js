// backend/db.js
const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

let pool;

async function createPool() {
    if (process.env.DATABASE_URL) {
        console.log('📊 Connecting using DATABASE_URL');

        const url = new URL(process.env.DATABASE_URL);
        console.log('🔍 Resolving hostname to IPv4:', url.hostname);

        // Resolve IPv4 address (Render doesn't support outbound IPv6)
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4(url.hostname, (err, addresses) => {
                if (err) reject(err);
                else resolve(addresses);
            });
        });

        const ipv4 = addresses[0];
        console.log('✅ Resolved', url.hostname, '->', ipv4);

        pool = new Pool({
            host: ipv4,
            port: parseInt(url.port || '5432'),
            database: url.pathname.slice(1),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            ssl: {
                rejectUnauthorized: false
            },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
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
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        client.release();
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
    }
}

createPool();

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