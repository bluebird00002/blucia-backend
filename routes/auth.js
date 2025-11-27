import express from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import db from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendEmail, emailTemplates } from '../config/email.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'blucia-labs-jwt-secret-change-in-production'

// Register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { name, username, email, password } = req.body

    // Check if user exists
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email])
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' })
    }

    const [existingUsername] = await db.query('SELECT id FROM users WHERE username = ?', [username])
    if (existingUsername.length > 0) {
      return res.status(400).json({ message: 'Username already taken' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [result] = await db.query(
      'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, username, email, hashedPassword, 'client']
    )

    // Get created user
    const [users] = await db.query(
      'SELECT id, name, username, email, phone, google_id, avatar_url, role FROM users WHERE id = ?',
      [result.insertId]
    )

    // Generate token
    const token = jwt.sign({ userId: users[0].id, role: users[0].role }, JWT_SECRET, { expiresIn: '7d' })

    // Send welcome email (non-blocking)
    sendEmail(email, emailTemplates.welcome(name)).catch(err => {
      console.error('Failed to send welcome email:', err)
    })

    res.status(201).json({
      message: 'User created successfully. Please check your email for a welcome message.',
      token,
      user: users[0]
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed' })
  }
})

// Login
router.post('/login', [
  body('identifier').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { identifier, password } = req.body

    const field = identifier.includes('@') ? 'email' : 'username'

    // Find user
    const [users] = await db.query(`SELECT * FROM users WHERE ${field} = ?`, [identifier])
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = users[0]

    // Check password
    if (!user.password) {
      return res.status(401).json({ message: 'Please sign in with Google' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        google_id: user.google_id,
        avatar_url: user.avatar_url,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed' })
  }
})

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, username, email, phone, google_id, avatar_url, role FROM users WHERE id = ?',
      [req.userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user: users[0] })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Failed to get user' })
  }
})

// Check if Google OAuth is enabled
router.get('/google/enabled', (req, res) => {
  const googleClientID = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const isEnabled = !!(googleClientID && googleClientSecret && googleClientID !== 'your-google-client-id')
  res.json({ enabled: isEnabled })
})

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const googleClientID = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!googleClientID || !googleClientSecret || googleClientID === 'your-google-client-id') {
    return res.status(400).json({ 
      message: 'Google OAuth is not configured. Please set up Google OAuth credentials in the backend .env file.' 
    })
  }
  
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user
      const token = jwt.sign({ userId: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '7d' })
      
      // Check if this is a new user (marked in passport strategy)
      // Or check by seeing if user was created recently (within last minute)
      const isNewUser = user._isNewUser || false
      const [recentUsers] = await db.query(
        'SELECT * FROM users WHERE id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
        [user.id]
      )
      
      // Send welcome email if it's a new user
      if (isNewUser || recentUsers.length > 0) {
        sendEmail(user.email, emailTemplates.welcome(user.name)).catch(err => {
          console.error('Failed to send welcome email:', err)
        })
      }
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
    } catch (error) {
      console.error('Google OAuth error:', error)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      res.redirect(`${frontendUrl}/login?error=oauth_failed`)
    }
  }
)

export default router

