import { BaseService } from './base.service';
import { Project } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Project Service (v2.0 - Child knows parent)
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
    portfolioIds: string[], // ✅ Array of portfolio IDs (direct parent)
    name: string,
    userId: string,
    options?: {
      description?: string;
      color?: string;
      icon?: string;
      status?: 'not_started' | 'in_progress' | 'completed';
    }
  ): Promise<string> {
    return await this.create(
      {
        portfolioIds,
        name,
        description: options?.description,
        color: options?.color,
        icon: options?.icon,
        status: options?.status || 'not_started',
        completionPercentage: 0,
      } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all projects in a portfolio
   * ✅ Uses array-contains query (child-knows-parent)
   */
  async getProjectsByPortfolio(portfolioId: string): Promise<Project[]> {
    return await this.getByArrayContains('portfolioIds', portfolioId);
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
   * Update project status
   */
  async updateStatus(
    projectId: string,
    status: 'not_started' | 'in_progress' | 'completed',
    userId: string
  ): Promise<void> {
    await this.update(projectId, { status } as Partial<Project>, userId);
  }

  /**
   * Update completion percentage
   */
  async updateCompletionPercentage(
    projectId: string,
    completionPercentage: number,
    userId: string
  ): Promise<void> {
    await this.update(projectId, { completionPercentage } as Partial<Project>, userId);
  }
}