import { BaseService } from './base.service';
import { Portfolio } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Portfolio Service (v2.0 - Child knows parent)
 * Handles all portfolio-related database operations
 */
export class PortfolioService extends BaseService<Portfolio> {
  constructor() {
    super(COLLECTIONS.PORTFOLIOS);
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(
    workspaceId: string,
    name: string,
    userId: string,
    options?: {
      description?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<string> {
    return await this.create(
      {
        workspaceId,
        name,
        description: options?.description,
        color: options?.color,
        icon: options?.icon,
        completionPercentage: 0,
        totalTasks: 0,
        completedTasks: 0,
      } as Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all portfolios in a workspace
   */
  async getPortfoliosByWorkspace(workspaceId: string): Promise<Portfolio[]> {
    return await this.getByField('workspaceId', workspaceId);
  }
}