import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRouter } from './routes/authRoutes.js';
import { discoveryRouter } from './routes/discoveryRoutes.js';
import { notificationRouter } from './routes/notificationRoutes.js';
import { opportunityRouter } from './routes/opportunityRoutes.js';
import { studentRouter } from './routes/studentRoutes.js';
import { whatsappRouter } from './routes/whatsappRoutes.js';

export const app = express();

// Enable CORS for frontend Vite dev server and production origin
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-role', 'x-student-id'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Elite Track Discovery & Distribution Backend (Obj3)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Root landing handler with automatic redirect to frontend
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elite Track — Backend Active</title>
  <meta http-equiv="refresh" content="3;url=http://localhost:3000">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F6F1E9; color: #011425; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.06); text-align: center; max-width: 480px; border: 1px solid #e2d9cd; }
    h1 { color: #1F4959; margin-top: 0; font-size: 1.5rem; }
    p { color: #5C7C89; line-height: 1.6; font-size: 0.95rem; }
    .btn { display: inline-block; background: #1F4959; color: white; text-decoration: none; padding: 0.85rem 1.75rem; border-radius: 0.5rem; font-weight: 600; margin-top: 1.25rem; transition: background 0.2s; }
    .btn:hover { background: #163642; }
    .status { display: inline-flex; align-items: center; gap: 0.5rem; color: #10b981; font-weight: 600; font-size: 0.875rem; margin-bottom: 1rem; background: #ecfdf5; padding: 0.35rem 0.75rem; border-radius: 9999px; }
    .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status"><span class="dot"></span> Backend Engine Online (Port 5000)</div>
    <h1>Elite Track API Server</h1>
    <p>You have reached the backend API service. The interactive student and mentor dashboards run on the frontend port (<strong>3000</strong>).</p>
    <a class="btn" href="http://localhost:3000">Open Elite Track Web App (Port 3000) &rarr;</a>
    <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 1rem;">Redirecting to http://localhost:3000 in 3 seconds...</p>
  </div>
</body>
</html>`);
});

// Authentication context middleware
app.use(authMiddleware as any);

// API Endpoints
app.use('/api/discovery', discoveryRouter);
app.use('/api/opportunities', opportunityRouter);
app.use('/api/student', studentRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/auth', authRouter);

// Centralized error handling
app.use(errorHandler);
