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
app.use('/api/meetings', meetingsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/business-card', businessCardRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/integration/oauth', googleAuthRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'jarvis-backend'
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Jarvis API Documentation',
}));

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
      reports: '/api/reports'
    }
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
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
});

export default app;