/**
 * Firestore Collection Names
 * Following the child-knows-parent architecture
 */
export const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  WORKSPACES: 'workspaces',
  TEAMS: 'teams',
  PORTFOLIOS: 'portfolios',
  PROJECTS: 'projects',
  TASKS: 'tasks',
} as const;

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Status values
 */
export const STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  BLOCKED: 'blocked',
  DONE: 'done',
  ARCHIVED: 'archived',
} as const;

/**
 * Priority levels
 */
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

/**
 * Validation limits
 */
export const VALIDATION = {
  MAX_NAME_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_ARRAY_SIZE: 100,
  MAX_CUSTOM_FIELDS: 50,
} as const;