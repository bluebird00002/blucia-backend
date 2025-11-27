import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";
// Import database configuration based on environment
let db, initializeDatabase;
if (process.env.NODE_ENV === 'production') {
  const prodDb = await import('./config/database-production.js');
  db = prodDb.default;
  initializeDatabase = prodDb.initializeDatabase;
} else {
  const devDb = await import('./config/database.js');
  db = devDb.default;
  initializeDatabase = devDb.initialize;
}

// Import routes
import authRoutes from "./routes/auth.js";
import requestRoutes from "./routes/requests.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Allow CORS from local network and production frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  /^http:\/\/192\.168\.\d+\.\d+:3000$/, // Allow any local network IP
  /^http:\/\/10\.\d+\.\d+\.\d+:3000$/, // Allow 10.x.x.x network
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/, // Allow 172.16-31.x.x network
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // In production, allow frontend URL and Netlify preview URLs
      if (process.env.NODE_ENV === 'production') {
        const frontendUrl = process.env.FRONTEND_URL;
        if (frontendUrl && origin.startsWith(frontendUrl)) {
          return callback(null, true);
        }
        // Allow Netlify preview URLs
        if (origin.includes('.netlify.app') || origin.includes('.netlify.com')) {
          return callback(null, true);
        }
      }

      // Check if origin matches allowed patterns
      if (
        allowedOrigins.some((pattern) => {
          if (pattern instanceof RegExp) {
            return pattern.test(origin);
          }
          return pattern === origin;
        })
      ) {
        callback(null, true);
      } else {
        // In development, allow all origins
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "blucia-labs-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "BluCia Labs API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 BluCia Labs server running on port ${PORT}`);
      console.log(`📱 Access from network: http://YOUR_IP:${PORT}`);
      console.log(`💻 Access locally: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

export default app;
