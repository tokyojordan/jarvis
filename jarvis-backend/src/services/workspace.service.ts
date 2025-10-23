import { BaseService } from './base.service';
import { Workspace } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Workspace Service
 * Handles all workspace-related database operations
 */
export class WorkspaceService extends BaseService<Workspace> {
  constructor() {
    super(COLLECTIONS.WORKSPACES);
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    organizationId: string,
    name: string,
    userId: string,
    description?: string,
    color?: string,
    icon?: string
  ): Promise<string> {
    return await this.create(
      {
        organizationId,
        name,
        description,
        color,
        icon,
        createdBy: userId,
        updatedBy: userId,
      } as Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all workspaces in an organization
   */
  async getWorkspacesByOrganization(organizationId: string): Promise<Workspace[]> {
    return await this.getByField('organizationId', organizationId);
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    updates: Partial<Pick<Workspace, 'name' | 'description' | 'color' | 'icon'>>,
    userId: string
  ): Promise<void> {
    await this.update(workspaceId, updates as Partial<Workspace>, userId);
  }
}