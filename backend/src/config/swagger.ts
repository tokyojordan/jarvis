import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jarvis API Documentation',
      version: '1.0.0',
      description: 'AI-powered meeting assistant and personal CRM API',
      contact: {
        name: 'API Support',
        email: 'support@jarvis.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.run.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        UserAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID for authentication',
        },
      },
      schemas: {
        Meeting: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            duration: { type: 'string' },
            transcript: { type: 'string' },
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
            decisions: { type: 'array', items: { type: 'string' } },
            actionItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  assignee: { type: 'string' },
                  dueDate: { type: 'string' },
                },
              },
            },
            nextSteps: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            firstName: { type: 'string', description: 'First name / Given name' },
            lastName: { type: 'string', description: 'Last name / Family name' },
            name: { type: 'string', description: 'Full name' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company: { type: 'string' },
            title: { type: 'string' },
            website: { type: 'string' },
            linkedin: { type: 'string' },
            address: { type: 'string' },
            source: { type: 'string', enum: ['manual', 'business_card', 'google_contacts'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        UserAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);