export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    next()
  }
}

export default authorizeRole


