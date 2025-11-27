import express from 'express'
import { body, validationResult } from 'express-validator'
import db from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Update user profile
router.put('/profile', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('username').optional().trim().notEmpty().withMessage('Username cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { name, username, email, phone } = req.body
    const updates = {}
    const values = []

    if (name !== undefined) {
      updates.name = name
      values.push(name)
    }
    if (username !== undefined) {
      const [existingUsernames] = await db.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.userId]
      )
      if (existingUsernames.length > 0) {
        return res.status(400).json({ message: 'Username already in use' })
      }
      updates.username = username
      values.push(username)
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.userId]
      )
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email already in use' })
      }
      updates.email = email
      values.push(email)
    }
    if (phone !== undefined) {
      updates.phone = phone
      values.push(phone)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    values.push(req.userId)

    await db.query(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      values
    )

    const [users] = await db.query(
      'SELECT id, name, username, email, phone, google_id, avatar_url, role FROM users WHERE id = ?',
      [req.userId]
    )

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
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
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

export default router

