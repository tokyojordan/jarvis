import { BaseService } from './base.service';
import { Organization } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Organization Service
 * Handles all organization-related database operations
 */
export class OrganizationService extends BaseService<Organization> {
  constructor() {
    super(COLLECTIONS.ORGANIZATIONS);
  }

  /**
   * Create a new organization
   */
  async createOrganization(
    name: string,
    ownerId: string,
    description?: string,
    settings?: Record<string, any>
  ): Promise<string> {
    return await this.create(
      {
        name,
        description,
        ownerId,
        memberIds: [ownerId], // Owner is automatically a member
        settings: settings || {},
        createdBy: ownerId,
        updatedBy: ownerId,
      } as Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>,
      ownerId
    );
  }

  /**
   * Get organizations where user is a member
   */
  async getOrganizationsByMember(userId: string): Promise<Organization[]> {
    return await this.getByArrayContains('memberIds', userId);
  }

  /**
   * Get organizations owned by user
   */
  async getOrganizationsByOwner(ownerId: string): Promise<Organization[]> {
    return await this.getByField('ownerId', ownerId);
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId: string, userId: string, updatedBy: string): Promise<void> {
    await this.addToArray(organizationId, 'memberIds', userId, updatedBy);
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, updatedBy: string): Promise<void> {
    await this.removeFromArray(organizationId, 'memberIds', userId, updatedBy);
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    organizationId: string,
    settings: Record<string, any>,
    userId: string
  ): Promise<void> {
    await this.update(organizationId, { settings } as Partial<Organization>, userId);
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    console.log(`OrganizationService.isMember called with orgId: ${organizationId}, userId: ${userId}`);
    const org = await this.getById(organizationId);
    console.log(`Organization fetched:`, org);
    console.log(`memberIds:`, org?.memberIds);
    console.log(`includes check:`, org?.memberIds.includes(userId));
    return org ? org.memberIds.includes(userId) : false;
  }

  /**
   * Check if user is owner of organization
   */
  async isOwner(organizationId: string, userId: string): Promise<boolean> {
    const org = await this.getById(organizationId);
    return org ? org.ownerId === userId : false;
  }
}