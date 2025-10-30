import { Timestamp } from 'firebase-admin/firestore';

/**
 * Icon configuration for workspaces, teams, etc.
 * Uses Material Icons (Google's official icon library)
 * 
 * Browse icons at: https://fonts.google.com/icons
 */
export interface IconConfig {
  /**
   * Material Icon name (snake_case format)
   * Examples: "rocket_launch", "group", "folder", "business_center"
   * 
   * Common workspace icons:
   * - rocket_launch, dashboard, workspace, business, folder
   * - analytics, construction, code, design_services
   * 
   * Browse all: https://fonts.google.com/icons
   */
  icon?: string;
  
  /**
   * Emoji fallback (if not using Material Icons)
   * Examples: "🚀", "👥", "📁"
   */
  emoji?: string;
  
  /**
   * Custom icon URL (for uploaded icons stored in Cloud Storage)
   * Example: "https://storage.googleapis.com/jarvis-icons/custom-icon.svg"
   */
  iconUrl?: string;
  
  /**
   * Icon color (hex code)
   * Example: "#4F46E5"
   */
  iconColor?: string;
  
  /**
   * Background color (hex code)
   * Example: "#EEF2FF"
   */
  bgColor?: string;
}

/**
 * Organization entity
 */
export interface Organization extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  settings?: {
    timezone?: string;
    locale?: string;
    [key: string]: any;
  };
}

/**
 * Workspace entity (belongs to Organization)
 */
export interface Workspace extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
  
  // Visual customization
  color?: string;           // Hex color: "#4F46E5"
  
  // Icon options (use ONE of these approaches):
  icon?: string;            // Icon library identifier: "rocket" or emoji: "🚀"
  iconConfig?: IconConfig;  // Full icon configuration object
}

/**
 * Team entity (optional, belongs to Workspace)
 * 
 * Note: Teams are optional organizational units.
 * If you want to associate projects with teams, create a separate
 * project-team mapping or add teamId to Project (but this violates
 * the direct-parent-only rule, so consider if you really need it).
 */
export interface Team extends BaseEntity {
  workspaceId: string;  // ✅ Only direct parent
  name: string;
  description?: string;
  memberIds: string[];
  leaderId?: string;
  
  // Visual customization
  color?: string;
  icon?: string;
  iconConfig?: IconConfig;
}

/**
 * Portfolio entity (belongs to Workspace)
 */
export interface Portfolio extends BaseEntity {
  workspaceId: string;  // ✅ Only direct parent
  name: string;
  description?: string;
  
  // Visual customization
  color?: string;
  icon?: string;
  iconConfig?: IconConfig;
  
  // Status fields (not a separate object)
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

/**
 * Portfolio status with rolled-up metrics
 */
export interface PortfolioStatus {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  projects: Array<{
    id: string;
    name: string;
    completionPercentage: number;
  }>;
}

/**
 * Project entity (v2.0 - child knows parent)
 * Projects can belong to MULTIPLE portfolios (many-to-many)
 * 
 * Note: Projects ONLY store portfolioIds (direct parent).
 * To get workspace/organization, traverse: Project → Portfolio → Workspace → Organization
 */
export interface Project extends BaseEntity {
  portfolioIds: string[];   // ✅ Direct parent only (v2.0 model, many-to-many)
  name: string;
  description?: string;
  
  // Visual customization
  color?: string;
  icon?: string;
  iconConfig?: IconConfig;
  
  status: 'not_started' | 'in_progress' | 'completed';
  completionPercentage: number;
}

/**
 * Task entity (v2.0 - child knows parent)
 * Tasks can belong to MULTIPLE projects (many-to-many)
 */
export interface Task extends BaseEntity {
  projectIds: string[];     // ✅ Array of project IDs (v2.0 model)
  userId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  
  // Organization
  tags?: string[];
  customFields?: { [key: string]: string };
  
  // Dependencies (other tasks that must complete first)
  // Use this instead of subtasks - just create dependent tasks!
  dependencies?: string[];  // Array of task IDs this task depends on
  
  // Status
  status: 'not_started' | 'in_progress' | 'completed';
}

/**
 * API Request/Response Types
 */
export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateWorkspaceRequest {
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  iconConfig?: IconConfig;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  iconConfig?: IconConfig;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Base entity interface - all entities extend this
 */
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}