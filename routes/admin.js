import express from 'express'
import db from '../config/database.js'
import { authenticateToken, isAdmin } from '../middleware/auth.js'
import { sendEmail, emailTemplates } from '../config/email.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticateToken, isAdmin)

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM service_requests
    `)

    const [[userStats]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `)

    const [recentRequests] = await db.query(`
      SELECT 
        sr.*,
        u.name as user_name,
        u.email as user_email
      FROM service_requests sr
      JOIN users u ON sr.user_id = u.id
      ORDER BY sr.created_at DESC
      LIMIT 5
    `)

    res.json({
      stats: {
        requests: stats,
        clients: userStats.clients,
        admins: userStats.admins
      },
      recentRequests
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Failed to fetch statistics' })
  }
})

// Get all service requests
router.get('/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT 
        sr.*,
        u.name as user_name,
        u.email as user_email
      FROM service_requests sr
      JOIN users u ON sr.user_id = u.id
      ORDER BY sr.created_at DESC
    `)

    res.json({ requests })
  } catch (error) {
    console.error('Admin get requests error:', error)
    res.status(500).json({ message: 'Failed to fetch requests' })
  }
})

// Update request status
router.patch('/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const { id } = req.params

    if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    await db.query(
      'UPDATE service_requests SET status = ? WHERE id = ?',
      [status, id]
    )

    const [requests] = await db.query('SELECT * FROM service_requests WHERE id = ?', [id])

    res.json({
      message: 'Status updated successfully',
      request: requests[0]
    })
  } catch (error) {
    console.error('Admin update status error:', error)
    res.status(500).json({ message: 'Failed to update status' })
  }
})

// Send email to client
router.post('/requests/:id/email', async (req, res) => {
  try {
    const { id } = req.params
    const { subject, message } = req.body

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' })
    }

    // Get request details
    const [requests] = await db.query(`
      SELECT sr.*, u.name as user_name, u.email as user_email
      FROM service_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = ?
    `, [id])

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' })
    }

    const request = requests[0]

    // Create custom email template
    const emailContent = {
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Roboto', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b0064 0%, #5a0080 50%, #7d00a3 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5a0080; white-space: pre-wrap; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .request-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>BluCia Labs</h1>
                <p style="margin: 0; opacity: 0.9;">Beyond Limits Ultimate Creativity and Intelligence Advancement</p>
              </div>
              <div class="content">
                <h2>Hello ${request.user_name},</h2>
                <div class="message">${message.replace(/\n/g, '<br>')}</div>
                <div class="request-info">
                  <strong>Regarding your request:</strong><br>
                  Request ID: #${request.id}<br>
                  Service: ${request.service_type}<br>
                  Status: ${request.status}
                </div>
                <p>If you have any questions or need further assistance, please don't hesitate to reply to this email.</p>
                <p>Best regards,<br><strong>The BluCia Labs Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} BluCia Labs. All rights reserved.</p>
                <p>This email was sent regarding service request #${request.id}</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        BluCia Labs
        
        Hello ${request.user_name},
        
        ${message}
        
        Regarding your request:
        Request ID: #${request.id}
        Service: ${request.service_type}
        Status: ${request.status}
        
        If you have any questions or need further assistance, please don't hesitate to reply to this email.
        
        Best regards,
        The BluCia Labs Team
      `
    }

    // Send email
    const result = await sendEmail(request.user_email, emailContent)

    if (result.success) {
      res.json({ 
        message: 'Email sent successfully',
        recipient: request.user_email
      })
    } else {
      res.status(500).json({ 
        message: 'Failed to send email',
        error: result.error
      })
    }
  } catch (error) {
    console.error('Admin send email error:', error)
    res.status(500).json({ message: 'Failed to send email' })
  }
})

export default router
