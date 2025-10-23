import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Firebase to initialize
import './config/firebase';

const app: Application = express();
const PORT = process.env.PORT || 8080;

// ============= MIDDLEWARE =============

// Security
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============= ROUTES =============

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Jarvis backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Jarvis Backend API',
    version: '2.0.0',
    description: 'Hierarchy management system with child-knows-parent architecture',
    endpoints: {
      health: '/health',
      organizations: '/api/organizations',
      workspaces: '/api/workspaces',
      teams: '/api/teams',
      portfolios: '/api/portfolios',
      projects: '/api/projects',
      tasks: '/api/tasks',
    },
  });
});

import workspaceRoutes from './routes/workspace.routes';
app.use('/api/workspaces', workspaceRoutes);

// API routes will be added here
import organizationRoutes from './routes/organization.routes';

app.use('/api/organizations', organizationRoutes);

// ============= ERROR HANDLING =============

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ============= START SERVER =============

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log(`✅ Jarvis Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API info: http://localhost:${PORT}/`);
  console.log('🚀 ============================================');
  console.log('');
});

export default app;