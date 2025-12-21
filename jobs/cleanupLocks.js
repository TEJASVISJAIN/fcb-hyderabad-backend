// Cleanup job for expired seat locks
const pool = require('../config/database');

async function cleanupExpiredLocks() {
  try {
    const result = await pool.query(
      'DELETE FROM seat_locks WHERE expires_at < NOW() RETURNING *'
    );
    
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired seat locks`);
    }
  } catch (error) {
    console.error('Error cleaning up locks:', error);
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredLocks, 60 * 1000);

// Run immediately on startup
cleanupExpiredLocks();

module.exports = cleanupExpiredLocks;
