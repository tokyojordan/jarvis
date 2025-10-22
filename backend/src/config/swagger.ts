// config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jarvis API',
      version: '1.0.0',
      description: 'API documentation for Jarvis project management system',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
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
        // Base timestamp fields
        BaseDoc: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
            },
            userId: {
              type: 'string',
              description: 'Owner user ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        
        // Organization
        Organization: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  description: 'Organization name',
                  example: 'Acme Corp',
                },
              },
            },
          ],
        },
        
        // Workspace
        Workspace: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['organizationId', 'name'],
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'Parent organization ID',
                },
                name: {
                  type: 'string',
                  description: 'Workspace name',
                  example: 'Engineering Workspace',
                },
                description: {
                  type: 'string',
                  description: 'Workspace description',
                },
              },
            },
          ],
        },
        
        // Team
        Team: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['workspaceId', 'name'],
              properties: {
                workspaceId: {
                  type: 'string',
                  description: 'Parent workspace ID',
                },
                name: {
                  type: 'string',
                  description: 'Team name',
                  example: 'Backend Team',
                },
                description: {
                  type: 'string',
                  description: 'Team description',
                },
                memberIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Array of member user IDs',
                },
              },
            },
          ],
        },
        
        // Portfolio
        Portfolio: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['workspaceId', 'name'],
              properties: {
                workspaceId: {
                  type: 'string',
                  description: 'Parent workspace ID',
                },
                name: {
                  type: 'string',
                  description: 'Portfolio name',
                  example: 'Q4 Initiatives',
                },
                description: {
                  type: 'string',
                  description: 'Portfolio description',
                },
                status: {
                  $ref: '#/components/schemas/PortfolioStatus',
                },
              },
            },
          ],
        },
        
        // Portfolio Status
        PortfolioStatus: {
          type: 'object',
          properties: {
            completionPercentage: {
              type: 'number',
              description: 'Overall completion percentage',
              example: 65.5,
            },
            totalTasks: {
              type: 'integer',
              description: 'Total number of tasks',
              example: 100,
            },
            completedTasks: {
              type: 'integer',
              description: 'Number of completed tasks',
              example: 65,
            },
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  completionPercentage: { type: 'number' },
                },
              },
            },
          },
        },
        
        // Project
        Project: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['portfolioId', 'name', 'status', 'completionPercentage'],
              properties: {
                portfolioId: {
                  type: 'string',
                  description: 'Parent portfolio ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Assigned team ID',
                },
                name: {
                  type: 'string',
                  description: 'Project name',
                  example: 'Mobile App Redesign',
                },
                description: {
                  type: 'string',
                  description: 'Project description',
                },
                status: {
                  type: 'string',
                  enum: ['not_started', 'in_progress', 'completed'],
                  description: 'Project status',
                },
                completionPercentage: {
                  type: 'number',
                  description: 'Project completion percentage',
                  example: 45.5,
                },
              },
            },
          ],
        },
        
        // Section
        Section: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['projectId', 'name'],
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Parent project ID',
                },
                name: {
                  type: 'string',
                  description: 'Section name',
                  example: 'Development Phase',
                },
              },
            },
          ],
        },
        
        // Task
        Task: {
          allOf: [
            { $ref: '#/components/schemas/BaseDoc' },
            {
              type: 'object',
              required: ['sectionId', 'projectId', 'title', 'status'],
              properties: {
                sectionId: {
                  type: 'string',
                  description: 'Parent section ID',
                },
                projectId: {
                  type: 'string',
                  description: 'Parent project ID',
                },
                parentTaskId: {
                  type: 'string',
                  description: 'Parent task ID (for subtasks)',
                },
                title: {
                  type: 'string',
                  description: 'Task title',
                  example: 'Implement user authentication',
                },
                description: {
                  type: 'string',
                  description: 'Task description',
                },
                assigneeId: {
                  type: 'string',
                  description: 'Assigned user ID',
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Task tags',
                },
                customFields: {
                  type: 'object',
                  additionalProperties: {
                    type: 'string',
                  },
                  description: 'Custom field key-value pairs',
                },
                subtaskIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Array of subtask IDs',
                },
                dependencies: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Array of dependent task IDs',
                },
                status: {
                  type: 'string',
                  enum: ['not_started', 'in_progress', 'completed'],
                  description: 'Task status',
                },
              },
            },
          ],
        },
        
        // Error response
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        
        // Success response
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            id: {
              type: 'string',
              description: 'Created resource ID',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Workspaces', description: 'Workspace management' },
      { name: 'Teams', description: 'Team management' },
      { name: 'Portfolios', description: 'Portfolio management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Sections', description: 'Section management' },
      { name: 'Tasks', description: 'Task management' },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);