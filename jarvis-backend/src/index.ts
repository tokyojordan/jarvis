import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, setupSwaggerJsonEndpoint } from './config/swagger.config';

// Load environment variables
dotenv.config();

// Import Firebase to initialize
import './config/firebase';

const app = express();
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

// ============= SWAGGER DOCUMENTATION =============

// Swagger JSON spec (must be defined BEFORE Swagger UI)
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI - pointing to the JSON endpoint
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(null, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Jarvis API Documentation',
  swaggerOptions: {
    url: '/api-docs.json', // This makes it fetch from URL and display the link
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

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
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      docsJson: '/api-docs.json',
      organizations: '/api/organizations',
      workspaces: '/api/workspaces',
      teams: '/api/teams',
      portfolios: '/api/portfolios',
      projects: '/api/projects',
      tasks: '/api/tasks',
    },
  });
});

// Import routes
import organizationRoutes from './routes/organization.routes';
import workspaceRoutes from './routes/workspace.routes';
import teamRoutes from './routes/team.routes';
import portfolioRoutes from './routes/portfolio.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

app.use('/api/teams', teamRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/workspaces', workspaceRoutes);

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
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log('🚀 ============================================');
  console.log('');
});

export default app;