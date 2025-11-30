// Database adapter that works with both MySQL and PostgreSQL
// This normalizes the differences between the two databases

let db, queryMethod;

if (process.env.NODE_ENV === 'production') {
  // Use PostgreSQL for production
  const prodDb = await import('./database-production.js');
  db = prodDb.default;
  
  // PostgreSQL adapter
  queryMethod = async (sql, params = []) => {
    const client = await db.connect();
    try {
      // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let insertId = null;
      
      if (params.length > 0) {
        let paramIndex = 1;
        pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      }
      
      // For INSERT queries, add RETURNING id to get the inserted ID
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // Check if RETURNING is already present
        if (!pgSql.toUpperCase().includes('RETURNING')) {
          // Add RETURNING id at the end
          pgSql = pgSql.replace(/;?\s*$/, '') + ' RETURNING id';
        }
      }
      
      const result = await client.query(pgSql, params);
      
      // Extract insertId if this was an INSERT
      if (sql.trim().toUpperCase().startsWith('INSERT') && result.rows.length > 0) {
        insertId = result.rows[0].id;
      }
      
      // Return in MySQL format: [rows, metadata]
      // For PostgreSQL INSERT with RETURNING, rows contains the returned data
      const metadata = insertId ? { insertId } : {};
      return [result.rows, metadata];
    } finally {
      client.release();
    }
  };
} else {
  // Use MySQL for development
  const devDb = await import('./database.js');
  db = devDb.default;
  
  // MySQL already returns [rows, metadata] format
  queryMethod = db.query.bind(db);
}

// Export a database object with a query method that works for both
export default {
  query: queryMethod,
  getConnection: async () => {
    if (process.env.NODE_ENV === 'production') {
      return await db.connect();
    } else {
      return await db.getConnection();
    }
  }
};
