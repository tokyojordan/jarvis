import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jarvis API',
      version: version || '1.0.0',
      description: 'AI-Powered Meeting Assistant & Personal CRM API',
      contact: {
        name: 'API Support',
        email: 'support@jarvis.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://jarvis-api.example.com',
        description: 'Production server',
      },
    ],
    // 🔑 SECURITY SCHEMES - This is what was missing!
    components: {
      securitySchemes: {
        userAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID for authentication (use: user-123 for testing)',
        },
      },
      schemas: {
        // Error Response Schema
        ErrorResponse: {
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
              example: 'Error message description',
            },
          },
        },
        // Organization Schema
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'org-123abc',
            },
            name: {
              type: 'string',
              example: 'Acme Corporation',
            },
            description: {
              type: 'string',
              example: 'A leading software development company',
            },
            ownerId: {
              type: 'string',
              example: 'user-123',
            },
            memberIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['user-123', 'user-456'],
            },
            settings: {
              type: 'object',
              example: { timezone: 'America/Los_Angeles', locale: 'en-US' },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T00:00:00.000Z',
            },
          },
        },
        // Workspace Schema
        Workspace: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'workspace-456def',
            },
            organizationId: {
              type: 'string',
              example: 'org-123abc',
            },
            name: {
              type: 'string',
              example: 'Engineering Workspace',
            },
            description: {
              type: 'string',
              example: 'All engineering teams and projects',
            },
            color: {
              type: 'string',
              example: '#4F46E5',
            },
            icon: {
              type: 'string',
              description: 'Material Icon name (browse at https://fonts.google.com/icons)',
              example: 'rocket_launch',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T00:00:00.000Z',
            },
          },
        },
        // Portfolio Schema
        Portfolio: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'portfolio-789ghi',
            },
            workspaceId: {
              type: 'string',
              example: 'workspace-456def',
            },
            name: {
              type: 'string',
              example: 'Q4 Roadmap',
            },
            description: {
              type: 'string',
              example: 'High-priority initiatives for Q4 2025',
            },
            status: {
              type: 'object',
              properties: {
                completionPercentage: {
                  type: 'number',
                  example: 65,
                },
                totalTasks: {
                  type: 'number',
                  example: 100,
                },
                completedTasks: {
                  type: 'number',
                  example: 65,
                },
                projects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                      },
                      name: {
                        type: 'string',
                      },
                      completionPercentage: {
                        type: 'number',
                      },
                    },
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Project Schema (with portfolioIds array - v2.0 model)
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'project-abc123',
            },
            portfolioIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of portfolio IDs (direct parent, many-to-many). Get workspace via Portfolio.',
              example: ['portfolio-789ghi', 'portfolio-xyz999'],
            },
            name: {
              type: 'string',
              example: 'Mobile App Redesign',
            },
            description: {
              type: 'string',
              example: 'Complete overhaul of iOS and Android apps',
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed'],
              example: 'in_progress',
            },
            completionPercentage: {
              type: 'number',
              example: 45,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Task Schema (with projectIds array - v2.0 model)
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'task-001',
            },
            projectIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of project IDs (many-to-many relationship)',
              example: ['project-abc123', 'project-def456'],
            },
            userId: {
              type: 'string',
              example: 'user-123',
            },
            title: {
              type: 'string',
              example: 'Research competitor apps',
            },
            description: {
              type: 'string',
              example: 'Analyze top 10 mobile apps in our category',
            },
            assigneeId: {
              type: 'string',
              example: 'user-456',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['research', 'competitive-analysis'],
            },
            customFields: {
              type: 'object',
              example: { Priority: 'High', 'Estimated Hours': '8' },
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of task IDs this task depends on (use this instead of subtasks)',
              example: ['task-000'],
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed'],
              example: 'in_progress',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Team Schema
        Team: {
          type: 'object',
          required: ['organizationId', 'workspaceId', 'name', 'memberIds'],
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string', description: 'The ID of the organization the team belongs to' },
            workspaceId: { type: 'string', description: 'The ID of the workspace the team belongs to' },
            name: { type: 'string', description: 'The name of the team' },
            description: { type: 'string', description: 'Optional description of the team' },
            memberIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of user IDs who are members of the team',
            },
            leaderId: { type: 'string', description: 'Optional ID of the team leader' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
      },
    },
    // Apply security globally to all endpoints
    security: [
      {
        userAuth: [],
      },
    ],
  },
  // Path to files containing Swagger annotations
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);