import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

import swaggerUi from 'swagger-ui-express'; 
import { swaggerSpec } from './config/swagger';

// Import routes
import meetingsRoutes from './routes/meetings';
import contactsRoutes from './routes/contacts';
import calendarRoutes from './routes/calendar';
import businessCardRoutes from './routes/businessCard';
import integrationRoutes from './routes/integration';
import integrationsRoutes from './routes/integration';
import reportsRoutes from './routes/reports';
import googleAuthRoutes from './routes/googleAuth';

//Project Management routes
import organizationRoutes from './routes/organization';
import workspaceRoutes from './routes/workspace';
import teamRoutes from './routes/team';
import portfolioRoutes from './routes/portfolio';
import projectRoutes from './routes/project';
import sectionRoutes from './routes/section';
import taskRoutes from './routes/task';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// ... all your existing code ...

// Routes - KEEP ALL YOUR EXISTING ROUTES
app.use('/api/meetings', meetingsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/business-card', businessCardRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/integration/oauth', googleAuthRoutes);

// Project Management routes - these should come BEFORE the 404 handler
app.use('/api', organizationRoutes);
app.use('/api', workspaceRoutes);
app.use('/api', teamRoutes);
app.use('/api', portfolioRoutes);
app.use('/api', projectRoutes);
app.use('/api', sectionRoutes);
app.use('/api', taskRoutes);

// Swagger documentation
app.use('/api-swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Jarvis API Documentation',
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'jarvis-backend'
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Jarvis API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      meetings: '/api/meetings',
      contacts: '/api/contacts',
      calendar: '/api/calendar',
      businessCard: '/api/business-card',
      integration: '/api/integration',
      reports: '/api/reports',
      organizations: '/api/organizations',  // ADD THESE
      workspaces: '/api/workspaces',
      teams: '/api/teams',
      portfolios: '/api/portfolios',
      projects: '/api/projects',
      sections: '/api/sections',
      tasks: '/api/tasks',
    }
  });
});

// 404 handler - MUST COME AFTER ALL ROUTES
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler - MUST COME LAST
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Jarvis backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
});

export default app;