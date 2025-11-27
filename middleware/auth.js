import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'blucia-labs-jwt-secret-change-in-production'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' })
    }
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  })
}

export const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

