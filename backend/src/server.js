import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { ENV } from './config/env.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import diseaseRoutes from './routes/disease.routes.js';
import patientRoutes from './routes/patient.routes.js';
import medicalRecordRoutes from './routes/medical-record.routes.js';
import districtRoutes from './routes/district.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import preferencesRoutes from './routes/preferences.routes.js';
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/user.routes.js';
import publicRoutes from './routes/public.routes.js';


// Middleware imports
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// ─── Create Express app ─────────────────────────────────────────────────────
const app = express();

// ─── 1. Security: Helmet ────────────────────────────────────────────────────
app.use(helmet());

// ─── 2. Security: CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: ENV.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// ─── 3. Security: Rate Limiting ─────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts. Please try again later.' },
});

app.use('/api/', generalLimiter);

// ─── 4. Body Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── 5. HPP Protection ─────────────────────────────────────────────────────
app.use(hpp());
app.disable('x-powered-by');

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
);

// ─── Public Routes ──────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/public', publicRoutes);

// ─── Protected Routes (require valid JWT) ───────────────────────────────────
app.use('/api/v1/hospitals', authMiddleware, hospitalRoutes);
app.use('/api/v1/diseases', authMiddleware, diseaseRoutes);
app.use('/api/v1/patients', authMiddleware, patientRoutes);
app.use('/api/v1/medical-records', authMiddleware, medicalRecordRoutes);
app.use('/api/v1/districts', authMiddleware, districtRoutes);
app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);
app.use('/api/v1/users/preferences', authMiddleware, preferencesRoutes);
app.use('/api/v1/chat', authMiddleware, chatRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);


// ─── 404 + Global Error Handler ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
const PORT = ENV.PORT;
app.listen(PORT, () => {
  console.log(`Server running in ${ENV.NODE_ENV} mode on port ${PORT}`);
});
