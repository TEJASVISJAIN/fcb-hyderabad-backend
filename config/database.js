const { Pool } = require('pg');
require('dotenv').config();

// For Vercel, use DATABASE_URL if available, otherwise use individual env vars
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

pool.on('connect', () => {
  console.log('🔵🔴 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
  // Don't exit on error in serverless environment
  if (!process.env.VERCEL) {
    process.exit(-1);
  }
});

module.exports = pool;
