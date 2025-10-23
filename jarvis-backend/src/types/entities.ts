import { Timestamp } from 'firebase-admin/firestore';

/**
 * Base interface for all entities with common fields
 */
export interface BaseEntity {
  id?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Organization - Top level entity
 */
export interface Organization extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[]; // User IDs who are members
  settings?: Record<string, any>;
}

/**
 * Workspace - Groups teams and portfolios under an organization
 */
export interface Workspace extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

/**
 * Team - Optional grouping for projects (belongs to workspace)
 */
export interface Team extends BaseEntity {
  organizationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  memberIds: string[]; // User IDs who are team members
  leaderId?: string; // Team lead user ID
}

/**
 * Portfolio - Groups multiple projects for reporting (belongs to workspace)
 */
export interface Portfolio extends BaseEntity {
  organizationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  goals?: string[];
  metrics?: Record<string, any>;
}

/**
 * Project - Can belong to MULTIPLE portfolios (many-to-many)
 * CRITICAL: Uses portfolioIds array (child knows parent)
 */
export interface Project extends BaseEntity {
  organizationId: string;
  workspaceId: string;
  portfolioIds: string[]; // ✅ Array of portfolio IDs (child knows parent)
  teamId?: string; // Optional team assignment
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[]; // Project team members
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Task - Can belong to MULTIPLE projects (many-to-many)
 * CRITICAL: Uses projectIds array (child knows parent)
 */
export interface Task extends BaseEntity {
  organizationId: string;
  workspaceId: string;
  projectIds: string[]; // ✅ Array of project IDs (child knows parent)
  title: string;
  description?: string;
  assigneeId?: string;
  reporterId?: string;
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Timestamp | Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  subtasks?: Subtask[];
  dependencies?: TaskDependency[];
  attachments?: Attachment[];
}

/**
 * Subtask - Belongs to a task
 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp | Date;
  completedBy?: string;
}

/**
 * Task Dependency - Defines relationship between tasks
 */
export interface TaskDependency {
  taskId: string; // The task that this task depends on
  type: 'blocks' | 'blocked_by' | 'relates_to';
}

/**
 * Attachment - File attached to a task
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Timestamp | Date;
  uploadedBy: string;
}