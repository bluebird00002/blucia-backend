import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blucia_labs',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

let pool = null

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

const initialize = async () => {
  try {
    // First, connect without database to create it if it doesn't exist
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    })

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``)
    await tempConnection.end()

    // Create pool with database
    pool = createPool()

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
  const connection = await pool.getConnection()
  
  try {
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        phone VARCHAR(50),
        google_id VARCHAR(255) UNIQUE,
        avatar_url VARCHAR(500),
        role ENUM('client', 'admin') DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_google_id (google_id),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE AFTER name,
      ADD COLUMN IF NOT EXISTS role ENUM('client','admin') DEFAULT 'client' AFTER avatar_url
    `)

    // Service requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        project_description TEXT NOT NULL,
        budget VARCHAR(50),
        budget_amount DECIMAL(15, 2),
        budget_currency VARCHAR(10) DEFAULT 'USD',
        timeline VARCHAR(50),
        status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // Add new columns if they don't exist (for existing databases)
    await connection.query(`
      ALTER TABLE service_requests
      ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(15, 2) AFTER budget,
      ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(10) DEFAULT 'USD' AFTER budget_amount,
      ADD COLUMN IF NOT EXISTS client_type ENUM('individual', 'company') DEFAULT 'individual' AFTER phone,
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) AFTER client_type,
      ADD COLUMN IF NOT EXISTS company_location VARCHAR(255) AFTER company_name,
      ADD COLUMN IF NOT EXISTS industry VARCHAR(100) AFTER company_location,
      ADD COLUMN IF NOT EXISTS project_reason VARCHAR(100) AFTER industry,
      ADD COLUMN IF NOT EXISTS hear_about_us VARCHAR(100) AFTER timeline
    `).catch(() => {
      // Ignore if columns already exist
    })

    console.log('✅ Tables created successfully')
  } catch (error) {
    console.error('Table creation error:', error)
    throw error
  } finally {
    connection.release()
  }
}

const ensureAdminUser = async () => {
  const adminName = process.env.ADMIN_NAME || 'Chief Executive Officer'
  const adminUsername = process.env.ADMIN_USERNAME || 'ceo'
  const adminEmail = process.env.ADMIN_EMAIL || 'ceo@blucialabs.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'ceo0001'

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const pool = getPool()

  const [existing] = await pool.query(
    'SELECT id, role FROM users WHERE username = ? OR email = ? LIMIT 1',
    [adminUsername, adminEmail]
  )

  if (existing.length > 0) {
    const adminId = existing[0].id
    await pool.query(
      `UPDATE users 
       SET username = ?, role = 'admin', password = ?, email = ? 
       WHERE id = ?`,
      [adminUsername, hashedPassword, adminEmail, adminId]
    )
    console.log('✅ Admin account synced')
    return
  }

  await pool.query(
    `INSERT INTO users (name, username, email, password, role) 
     VALUES (?, ?, ?, ?, 'admin')`,
    [adminName, adminUsername, adminEmail, hashedPassword]
  )

  console.log('✅ Admin account created')
}

const getPool = () => {
  if (!pool) {
    pool = createPool()
  }
  return pool
}

export default {
  initialize,
  getPool,
  query: async (sql, params) => {
    const pool = getPool()
    return await pool.query(sql, params)
  },
  getConnection: async () => {
    const pool = getPool()
    return await pool.getConnection()
  }
}

