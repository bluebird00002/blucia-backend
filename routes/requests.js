import express from 'express'
import { body, validationResult } from 'express-validator'
import db from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendEmail, emailTemplates } from '../config/email.js'

const router = express.Router()

// Get all requests for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT * FROM service_requests 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.userId]
    )

    res.json({ requests })
  } catch (error) {
    console.error('Get requests error:', error)
    res.status(500).json({ message: 'Failed to fetch requests' })
  }
})

// Create new service request
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('serviceType').notEmpty().withMessage('Service type is required'),
  body('projectDescription').trim().notEmpty().withMessage('Project description is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const {
      name,
      email,
      phone,
      clientType,
      companyName,
      companyLocation,
      industry,
      projectReason,
      serviceType,
      projectDescription,
      budget,
      budgetAmount,
      budgetCurrency,
      timeline,
      hearAboutUs
    } = req.body

    const [result] = await db.query(
      `INSERT INTO service_requests 
       (user_id, name, email, phone, client_type, company_name, company_location, industry, project_reason, 
        service_type, project_description, budget, budget_amount, budget_currency, timeline, hear_about_us) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, name, email, phone, 
        clientType || 'individual',
        companyName || null,
        companyLocation || null,
        industry || null,
        projectReason || null,
        serviceType, 
        projectDescription, 
        budget || null, 
        budgetAmount || null, 
        budgetCurrency || 'USD', 
        timeline || null,
        hearAboutUs || null
      ]
    )

    const [requests] = await db.query('SELECT * FROM service_requests WHERE id = ?', [result.insertId])
    const request = requests[0]

    // Send confirmation email to client (non-blocking)
    sendEmail(email, emailTemplates.serviceRequestReceived(name, request.id)).catch(err => {
      console.error('Failed to send service request confirmation email:', err)
    })

    // Send notification email to admin (non-blocking)
    const adminEmail = process.env.ADMIN_EMAIL || 'ellybarikiceo@gmail.com'
    sendEmail(
      adminEmail, 
      emailTemplates.adminRequestNotification(
        name, 
        email, 
        request.id, 
        serviceType, 
        projectDescription,
        budget,
        timeline,
        clientType,
        companyName,
        companyLocation,
        projectReason
      )
    ).catch(err => {
      console.error('Failed to send admin notification email:', err)
    })

    res.status(201).json({
      message: 'Service request submitted successfully. A confirmation email has been sent.',
      request: request
    })
  } catch (error) {
    console.error('Create request error:', error)
    res.status(500).json({ message: 'Failed to submit request' })
  }
})

// Get single request
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [requests] = await db.query(
      'SELECT * FROM service_requests WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' })
    }

    res.json({ request: requests[0] })
  } catch (error) {
    console.error('Get request error:', error)
    res.status(500).json({ message: 'Failed to fetch request' })
  }
})

export default router

