import pkg from 'pg'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

const { Pool } = pkg
dotenv.config()

// PostgreSQL connection for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Initialize database for production
export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing PostgreSQL database...')
    
    // Create tables
    await createTables()
    
    // Seed admin user
    await ensureAdminUser()
    
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

const createTables = async () => {
  const client = await pool.connect()
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        phone VARCHAR(50),
        google_id VARCHAR(255) UNIQUE,
        avatar_url VARCHAR(500),
        role VARCHAR(20) DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `)

    // Service requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        client_type VARCHAR(20) DEFAULT 'individual',
        company_name VARCHAR(255),
        company_location VARCHAR(255),
        industry VARCHAR(100),
        project_reason VARCHAR(100),
        service_type VARCHAR(100) NOT NULL,
        project_description TEXT NOT NULL,
        budget VARCHAR(50),
        budget_amount DECIMAL(15, 2),
        budget_currency VARCHAR(10) DEFAULT 'USD',
        timeline VARCHAR(50),
        hear_about_us VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for service requests
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
    `)

    console.log('✅ Tables created successfully')
  } catch (error) {
    console.error('Table creation error:', error)
    throw error
  } finally {
    client.release()
  }
}

const ensureAdminUser = async () => {
  const adminName = process.env.ADMIN_NAME || 'Chief Executive Officer'
  const adminUsername = process.env.ADMIN_USERNAME || 'ceo'
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'ceo@blucialabs.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'ceo0001'

  try {
    const client = await pool.connect()
    
    try {
      // Check if admin user exists
      const result = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin'])
      
      if (result.rows.length === 0) {
        // Create admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 10)
        
        await client.query(
          `INSERT INTO users (name, username, email, password, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [adminName, adminUsername, adminEmail, hashedPassword, 'admin']
        )
        
        console.log('✅ Admin user created successfully')
        console.log(`   Username: ${adminUsername}`)
        console.log(`   Password: ${adminPassword}`)
        console.log('   ⚠️  Please change the default password after first login!')
      } else {
        console.log('ℹ️  Admin user already exists')
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Admin user creation error:', error)
    throw error
  }
}

export default pool
