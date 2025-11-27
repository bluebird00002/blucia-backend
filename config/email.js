import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// Create reusable transporter
const createTransporter = () => {
  // Use Gmail by default, but support other SMTP services
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
    },
  })

  return transporter
}

// Email templates
export const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to BluCia Labs! 🚀',
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
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #5a0080 0%, #7d00a3 100%); 
                     color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to BluCia Labs!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for joining <strong>BluCia Labs</strong> - Beyond Limits Ultimate Creativity and Intelligence Advancement!</p>
              <p>We're excited to have you on board. Your account has been successfully created.</p>
              <p>You can now:</p>
              <ul>
                <li>Access your dashboard to track your service requests</li>
                <li>Submit new project requests</li>
                <li>Update your profile information</li>
                <li>Get 24/7 support from our team</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
              <p>If you have any questions, feel free to reach out to us at <a href="mailto:contact@blucialabs.com">contact@blucialabs.com</a></p>
              <p>Best regards,<br><strong>The BluCia Labs Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BluCia Labs. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to BluCia Labs!
      
      Hello ${name},
      
      Thank you for joining BluCia Labs - Beyond Limits Ultimate Creativity and Intelligence Advancement!
      
      We're excited to have you on board. Your account has been successfully created.
      
      You can now:
      - Access your dashboard to track your service requests
      - Submit new project requests
      - Update your profile information
      - Get 24/7 support from our team
      
      Visit your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
      
      If you have any questions, feel free to reach out to us at contact@blucialabs.com
      
      Best regards,
      The BluCia Labs Team
    `
  }),

  accountConfirmation: (name, confirmationLink) => ({
    subject: 'Confirm Your BluCia Labs Account',
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
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #5a0080 0%, #7d00a3 100%); 
                     color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirm Your Account</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for registering with <strong>BluCia Labs</strong>!</p>
              <p>Please confirm your email address by clicking the button below:</p>
              <a href="${confirmationLink}" class="button">Confirm Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #5a0080;">${confirmationLink}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with us, please ignore this email.</p>
              <p>Best regards,<br><strong>The BluCia Labs Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BluCia Labs. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Confirm Your Account
      
      Hello ${name},
      
      Thank you for registering with BluCia Labs!
      
      Please confirm your email address by visiting this link:
      ${confirmationLink}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      Best regards,
      The BluCia Labs Team
    `
  }),

  serviceRequestReceived: (name, requestId) => ({
    subject: 'Service Request Received - BluCia Labs',
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
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #5a0080 0%, #7d00a3 100%); 
                     color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Request Received</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for submitting your service request to <strong>BluCia Labs</strong>!</p>
              <p>We have received your request (ID: <strong>${requestId}</strong>) and our team will review it shortly.</p>
              <p>You can track the status of your request in your dashboard.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
              <p>We'll get back to you within 24 hours with next steps.</p>
              <p>If you have any urgent questions, please contact us at <a href="mailto:contact@blucialabs.com">contact@blucialabs.com</a></p>
              <p>Best regards,<br><strong>The BluCia Labs Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BluCia Labs. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Request Received
      
      Hello ${name},
      
      Thank you for submitting your service request to BluCia Labs!
      
      We have received your request (ID: ${requestId}) and our team will review it shortly.
      
      You can track the status of your request in your dashboard.
      Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
      
      We'll get back to you within 24 hours with next steps.
      
      Best regards,
      The BluCia Labs Team
    `
  }),

  adminRequestNotification: (clientName, clientEmail, requestId, serviceType, description, budget, timeline, clientType, companyName, companyLocation, projectReason) => ({
    subject: `🔔 New Service Request from ${clientName} - #${requestId}`,
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
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5a0080; }
            .label { font-weight: bold; color: #5a0080; margin-bottom: 5px; }
            .value { margin-bottom: 15px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #5a0080 0%, #7d00a3 100%); 
                     color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Service Request</h1>
            </div>
            <div class="content">
              <h2>Request #${requestId}</h2>
              <p>A new service request has been submitted by a client and requires your attention.</p>
              
              <div class="info-box">
                <div class="label">Client Information:</div>
                <div class="value">
                  <strong>Name:</strong> ${clientName}<br>
                  <strong>Email:</strong> ${clientEmail}<br>
                  <strong>Type:</strong> ${clientType === 'company' ? 'Company' : 'Individual'}
                  ${companyName ? `<br><strong>Company:</strong> ${companyName}` : ''}
                  ${companyLocation ? `<br><strong>Location:</strong> ${companyLocation}` : ''}
                </div>
                
                <div class="label">Service Type:</div>
                <div class="value">${serviceType}</div>
                
                ${projectReason ? `<div class="label">Project Reason:</div><div class="value">${projectReason.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>` : ''}
                
                <div class="label">Project Description:</div>
                <div class="value">${description}</div>
                
                ${budget ? `<div class="label">Budget:</div><div class="value">${budget}</div>` : ''}
                ${timeline ? `<div class="label">Timeline:</div><div class="value">${timeline}</div>` : ''}
                
                <div class="label">Request ID:</div>
                <div class="value">#${requestId}</div>
              </div>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="button">View in Admin Dashboard</a>
              
              <p><strong>Action Required:</strong> Please review this request and update its status in the admin dashboard.</p>
              
              <p>Best regards,<br><strong>BluCia Labs Automated System</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BluCia Labs. All rights reserved.</p>
              <p>This is an automated notification from your service request system.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      🔔 New Service Request #${requestId}
      
      A new service request has been submitted by a client.
      
      CLIENT INFORMATION:
      Name: ${clientName}
      Email: ${clientEmail}
      
      SERVICE TYPE: ${serviceType}
      
      PROJECT DESCRIPTION:
      ${description}
      
      ${budget ? `BUDGET: ${budget}` : ''}
      ${timeline ? `TIMELINE: ${timeline}` : ''}
      
      REQUEST ID: #${requestId}
      
      ACTION REQUIRED:
      Please review this request and update its status in the admin dashboard.
      Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin
      
      Best regards,
      BluCia Labs Automated System
    `
  })
}

// Send email function
export const sendEmail = async (to, template, data = {}) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email not configured. Email sending is disabled.')
      console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in .env to enable emails')
      return { success: false, message: 'Email service not configured' }
    }

    const transporter = createTransporter()
    const emailContent = typeof template === 'function' ? template(data) : template

    const mailOptions = {
      from: `"BluCia Labs" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.BLUCIA_EMAIL || process.env.EMAIL_USER,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return { success: false, error: error.message }
  }
}

export default { sendEmail, emailTemplates }

