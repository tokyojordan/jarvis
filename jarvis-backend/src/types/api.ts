import { Organization, Workspace, Team, Portfolio, Project, Task } from './entities';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============= CREATE REQUEST TYPES =============

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateWorkspaceRequest {
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CreateTeamRequest {
  organizationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  memberIds?: string[];
  leaderId?: string;
}

export interface CreatePortfolioRequest {
  organizationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  goals?: string[];
}

export interface CreateProjectRequest {
  organizationId: string;
  workspaceId: string;
  portfolioIds: string[]; // ✅ Array of portfolio IDs
  teamId?: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds?: string[];
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CreateTaskRequest {
  organizationId: string;
  workspaceId: string;
  projectIds: string[]; // ✅ Array of project IDs
  title: string;
  description?: string;
  assigneeId?: string;
  reporterId?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string; // ISO date string
  estimatedHours?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  subtasks?: Array<{ title: string }>;
  dependencies?: Array<{ taskId: string; type: 'blocks' | 'blocked_by' | 'relates_to' }>;
}

// ============= UPDATE REQUEST TYPES =============

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  memberIds?: string[];
  leaderId?: string;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  color?: string;
  ownerId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  goals?: string[];
  metrics?: Record<string, any>;
}

export interface UpdateProjectRequest {
  portfolioIds?: string[]; // ✅ Update portfolio associations
  teamId?: string;
  name?: string;
  description?: string;
  ownerId?: string;
  memberIds?: string[];
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateTaskRequest {
  projectIds?: string[]; // ✅ Update project associations
  title?: string;
  description?: string;
  assigneeId?: string;
  reporterId?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  subtasks?: Array<{
    id?: string;
    title: string;
    completed?: boolean;
  }>;
  dependencies?: Array<{
    taskId: string;
    type: 'blocks' | 'blocked_by' | 'relates_to';
  }>;
}

// ============= QUERY FILTER TYPES =============

export interface ProjectFilters extends PaginationParams {
  organizationId?: string;
  workspaceId?: string;
  portfolioId?: string; // Query by single portfolio
  teamId?: string;
  ownerId?: string;
  status?: string;
  priority?: string;
}

export interface TaskFilters extends PaginationParams {
  organizationId?: string;
  workspaceId?: string;
  projectId?: string; // Query by single project
  assigneeId?: string;
  reporterId?: string;
  status?: string;
  priority?: string;
}

// ============= RESPONSE TYPES =============

export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
}

export interface PortfolioWithStats extends Portfolio {
  projectCount: number;
  taskCount: number;
  completionPercentage: number;
}