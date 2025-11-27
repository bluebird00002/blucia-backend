import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import db from './database.js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT id, name, username, email, phone, google_id, avatar_url, role FROM users WHERE id = ?', [id])
    if (rows.length === 0) {
      return done(null, false)
    }
    done(null, rows[0])
  } catch (error) {
    done(error, null)
  }
})

// Google OAuth Strategy - Only initialize if credentials are provided
const googleClientID = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (googleClientID && googleClientSecret && googleClientID !== 'your-google-client-id') {
  passport.use(new GoogleStrategy({
    clientID: googleClientID,
    clientSecret: googleClientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists with this Google ID
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE google_id = ?',
      [profile.id]
    )

    if (existingUsers.length > 0) {
      return done(null, existingUsers[0])
    }

    // Check if user exists with this email
    const [emailUsers] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [profile.emails[0].value]
    )

    if (emailUsers.length > 0) {
      // Update existing user with Google ID
      await db.query(
        'UPDATE users SET google_id = ?, avatar_url = ? WHERE email = ?',
        [profile.id, profile.photos[0]?.value || null, profile.emails[0].value]
      )
      const [updatedUsers] = await db.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value])
      return done(null, updatedUsers[0])
    }

    // Create new user
    const baseUsername = profile.emails[0].value.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user'
    let uniqueUsername = baseUsername
    let suffix = 1

    while (true) {
      const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [uniqueUsername])
      if (existing.length === 0) break
      uniqueUsername = `${baseUsername}${suffix}`
      suffix += 1
    }

    const [result] = await db.query(
      'INSERT INTO users (name, username, email, google_id, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)',
      [
        profile.displayName,
        uniqueUsername,
        profile.emails[0].value,
        profile.id,
        profile.photos[0]?.value || null,
        'client'
      ]
    )

    const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId])
    const newUser = newUsers[0]
    
    // Mark as new user for email sending
    newUser._isNewUser = true
    return done(null, newUser)
  } catch (error) {
    return done(error, null)
  }
  }))
} else {
  console.log('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable.')
}

