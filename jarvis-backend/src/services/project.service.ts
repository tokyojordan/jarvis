import { BaseService } from './base.service';
import { Project } from '../types';
import { COLLECTIONS, Timestamp } from '../config';

/**
 * Project Service
 * Handles all project-related database operations
 * CRITICAL: Projects can belong to MULTIPLE portfolios (many-to-many)
 * Uses portfolioIds array (child-knows-parent architecture)
 */
export class ProjectService extends BaseService<Project> {
  constructor() {
    super(COLLECTIONS.PROJECTS);
  }

  /**
   * Create a new project
   * IMPORTANT: portfolioIds is an array (can belong to multiple portfolios)
   */
  async createProject(
    organizationId: string,
    workspaceId: string,
    portfolioIds: string[], // ✅ Array of portfolio IDs
    name: string,
    ownerId: string,
    userId: string,
    options?: {
      teamId?: string;
      description?: string;
      memberIds?: string[];
      startDate?: Date;
      endDate?: Date;
      status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      customFields?: Record<string, any>;
    }
  ): Promise<string> {
    return await this.create(
      {
        organizationId,
        workspaceId,
        portfolioIds, // ✅ Store array of portfolio IDs
        teamId: options?.teamId,
        name,
        description: options?.description,
        ownerId,
        memberIds: options?.memberIds || [],
        startDate: options?.startDate ? Timestamp.fromDate(options.startDate) : undefined,
        endDate: options?.endDate ? Timestamp.fromDate(options.endDate) : undefined,
        status: options?.status || 'planning',
        priority: options?.priority || 'medium',
        tags: options?.tags || [],
        customFields: options?.customFields || {},
        createdBy: userId,
        updatedBy: userId,
      } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all projects in an organization
   */
  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return await this.getByField('organizationId', organizationId);
  }

  /**
   * Get all projects in a workspace
   */
  async getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    return await this.getByField('workspaceId', workspaceId);
  }

  /**
   * Get all projects in a portfolio
   * ✅ Uses array-contains query (child-knows-parent)
   */
  async getProjectsByPortfolio(portfolioId: string): Promise<Project[]> {
    return await this.getByArrayContains('portfolioIds', portfolioId);
  }

  /**
   * Get all projects in a team
   */
  async getProjectsByTeam(teamId: string): Promise<Project[]> {
    return await this.getByField('teamId', teamId);
  }

  /**
   * Get projects owned by user
   */
  async getProjectsByOwner(ownerId: string): Promise<Project[]> {
    return await this.getByField('ownerId', ownerId);
  }

  /**
   * Get projects where user is a member
   */
  async getProjectsByMember(userId: string): Promise<Project[]> {
    return await this.getByArrayContains('memberIds', userId);
  }

  /**
   * Add project to portfolio (many-to-many)
   * ✅ Atomic array operation
   */
  async addToPortfolio(projectId: string, portfolioId: string, userId: string): Promise<void> {
    await this.addToArray(projectId, 'portfolioIds', portfolioId, userId);
  }

  /**
   * Remove project from portfolio (many-to-many)
   * ✅ Atomic array operation
   */
  async removeFromPortfolio(projectId: string, portfolioId: string, userId: string): Promise<void> {
    await this.removeFromArray(projectId, 'portfolioIds', portfolioId, userId);
  }

  /**
   * Update project portfolios (replace entire array)
   */
  async updatePortfolios(projectId: string, portfolioIds: string[], userId: string): Promise<void> {
    await this.update(projectId, { portfolioIds } as Partial<Project>, userId);
  }

  /**
   * Add member to project
   */
  async addMember(projectId: string, userId: string, updatedBy: string): Promise<void> {
    await this.addToArray(projectId, 'memberIds', userId, updatedBy);
  }

  /**
   * Remove member from project
   */
  async removeMember(projectId: string, userId: string, updatedBy: string): Promise<void> {
    await this.removeFromArray(projectId, 'memberIds', userId, updatedBy);
  }

  /**
   * Update project status
   */
  async updateStatus(
    projectId: string,
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived',
    userId: string
  ): Promise<void> {
    await this.update(projectId, { status } as Partial<Project>, userId);
  }

  /**
   * Update project priority
   */
  async updatePriority(
    projectId: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    userId: string
  ): Promise<void> {
    await this.update(projectId, { priority } as Partial<Project>, userId);
  }

  /**
   * Add tag to project
   */
  async addTag(projectId: string, tag: string, userId: string): Promise<void> {
    await this.addToArray(projectId, 'tags', tag, userId);
  }

  /**
   * Remove tag from project
   */
  async removeTag(projectId: string, tag: string, userId: string): Promise<void> {
    await this.removeFromArray(projectId, 'tags', tag, userId);
  }

  /**
   * Check if user is project owner
   */
  async isOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getById(projectId);
    return project ? project.ownerId === userId : false;
  }

  /**
   * Check if user is project member
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getById(projectId);
    return project ? project.memberIds.includes(userId) : false;
  }
}