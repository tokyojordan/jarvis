import { BaseService } from './base.service';
import { Portfolio } from '../types';
import { COLLECTIONS, Timestamp } from '../config';

/**
 * Portfolio Service
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
    ownerId: string,
    userId: string,
    options?: {
      description?: string;
      color?: string;
      startDate?: Date;
      endDate?: Date;
      status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
      goals?: string[];
    }
  ): Promise<string> {
    return await this.create(
      {
        workspaceId,
        name,
        description: options?.description,
        color: options?.color,
        ownerId,
        startDate: options?.startDate ? Timestamp.fromDate(options.startDate) : undefined,
        endDate: options?.endDate ? Timestamp.fromDate(options.endDate) : undefined,
        status: options?.status || 'planning',
        goals: options?.goals || [],
        metrics: {},
        createdBy: userId,
        updatedBy: userId,
      } as Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get all portfolios in an organization
   */
  async getPortfoliosByOrganization(organizationId: string): Promise<Portfolio[]> {
    return await this.getByField('organizationId', organizationId);
  }

  /**
   * Get all portfolios in a workspace
   */
  async getPortfoliosByWorkspace(workspaceId: string): Promise<Portfolio[]> {
    return await this.getByField('workspaceId', workspaceId);
  }

  /**
   * Get portfolios owned by user
   */
  async getPortfoliosByOwner(ownerId: string): Promise<Portfolio[]> {
    return await this.getByField('ownerId', ownerId);
  }

  /**
   * Get portfolios by status
   */
  async getPortfoliosByStatus(
    organizationId: string,
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
  ): Promise<Portfolio[]> {
    const snapshot = await this.getCollection()
      .where('organizationId', '==', organizationId)
      .where('status', '==', status)
      .get();
    return this.snapshotToEntities(snapshot);
  }

  /**
   * Update portfolio status
   */
  async updateStatus(
    portfolioId: string,
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived',
    userId: string
  ): Promise<void> {
    await this.update(portfolioId, { status } as Partial<Portfolio>, userId);
  }

  /**
   * Update portfolio metrics
   */
  async updateMetrics(
    portfolioId: string,
    metrics: Record<string, any>,
    userId: string
  ): Promise<void> {
    await this.update(portfolioId, { metrics } as Partial<Portfolio>, userId);
  }

  /**
   * Add goal to portfolio
   */
  async addGoal(portfolioId: string, goal: string, userId: string): Promise<void> {
    await this.addToArray(portfolioId, 'goals', goal, userId);
  }

  /**
   * Remove goal from portfolio
   */
  async removeGoal(portfolioId: string, goal: string, userId: string): Promise<void> {
    await this.removeFromArray(portfolioId, 'goals', goal, userId);
  }

  /**
   * Check if user is portfolio owner
   */
  async isOwner(portfolioId: string, userId: string): Promise<boolean> {
    const portfolio = await this.getById(portfolioId);
    return portfolio ? portfolio.ownerId === userId : false;
  }
}