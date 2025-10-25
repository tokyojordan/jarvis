import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jarvis API',
      version: '2.0.0',
      description: 'Hierarchy management system with child-knows-parent architecture',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://your-cloud-run-url.run.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        UserIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID for authentication (TODO: Replace with Firebase Auth token)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error Type',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Organization: {
          type: 'object',
          required: ['name', 'ownerId', 'memberIds'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'string' },
            memberIds: {
              type: 'array',
              items: { type: 'string' },
            },
            settings: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Workspace: {
          type: 'object',
          required: ['organizationId', 'name'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            icon: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Team: {
          type: 'object',
          required: ['organizationId', 'workspaceId', 'name', 'memberIds'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            workspaceId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            memberIds: {
              type: 'array',
              items: { type: 'string' },
            },
            leaderId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Portfolio: {
          type: 'object',
          required: ['organizationId', 'workspaceId', 'name', 'ownerId', 'status'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            workspaceId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            ownerId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
            },
            goals: {
              type: 'array',
              items: { type: 'string' },
            },
            metrics: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Project: {
          type: 'object',
          required: ['organizationId', 'workspaceId', 'portfolioIds', 'name', 'ownerId', 'memberIds', 'status'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            workspaceId: { type: 'string' },
            portfolioIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of portfolio IDs (child-knows-parent)',
            },
            teamId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'string' },
            memberIds: {
              type: 'array',
              items: { type: 'string' },
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            customFields: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Task: {
          type: 'object',
          required: ['organizationId', 'workspaceId', 'projectIds', 'title', 'status'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            workspaceId: { type: 'string' },
            projectIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of project IDs (child-knows-parent)',
            },
            title: { type: 'string' },
            description: { type: 'string' },
            assigneeId: { type: 'string' },
            reporterId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'review', 'blocked', 'done', 'archived'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            dueDate: { type: 'string', format: 'date-time' },
            estimatedHours: { type: 'number' },
            actualHours: { type: 'number' },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            customFields: { type: 'object' },
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  completed: { type: 'boolean' },
                },
              },
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskId: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['blocks', 'blocked_by', 'relates_to'],
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        UserIdHeader: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js', './src/controllers/*.ts', './src/controllers/*.js'], // Path to route and controller files
};

export const swaggerSpec = swaggerJsdoc(options);