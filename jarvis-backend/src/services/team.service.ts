import { BaseService } from './base.service';
import { Team } from '../types';
import { COLLECTIONS } from '../config';

/**
 * Team Service
 * Handles all team-related database operations
 */
export class TeamService extends BaseService<Team> {
  constructor() {
    super(COLLECTIONS.TEAMS);
  }

  /**
   * Create a new team
   */
  async createTeam(
    organizationId: string,
    workspaceId: string,
    name: string,
    userId: string,
    description?: string,
    memberIds?: string[],
    leaderId?: string
  ): Promise<string> {
    return await this.create(
      {
        organizationId,
        workspaceId,
        name,
        description,
        memberIds: memberIds || [],
        leaderId,
        createdBy: userId,
        updatedBy: userId,
      } as Omit<Team, 'id' | 'createdAt' | 'updatedAt'>,
      userId
    );
  }

  /**
   * Get teams by workspace
   */
  async getTeamsByWorkspace(workspaceId: string): Promise<Team[]> {
    return await this.getByField('workspaceId', workspaceId);
  }

  /**
   * Get teams by organization
   */
  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    return await this.getByField('organizationId', organizationId);
  }

  /**
   * Get teams where user is a member
   */
  async getTeamsByMember(userId: string): Promise<Team[]> {
    return await this.getByArrayContains('memberIds', userId);
  }

  /**
   * Get teams led by user
   */
  async getTeamsByLeader(leaderId: string): Promise<Team[]> {
    return await this.getByField('leaderId', leaderId);
  }

  /**
   * Add member to team
   */
  async addMember(teamId: string, userId: string, updatedBy: string): Promise<void> {
    await this.addToArray(teamId, 'memberIds', userId, updatedBy);
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, userId: string, updatedBy: string): Promise<void> {
    await this.removeFromArray(teamId, 'memberIds', userId, updatedBy);
  }

  /**
   * Set team leader
   */
  async setLeader(teamId: string, leaderId: string, updatedBy: string): Promise<void> {
    await this.update(teamId, { leaderId } as Partial<Team>, updatedBy);
  }

  /**
   * Check if user is member of team
   */
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const team = await this.getById(teamId);
    return team ? team.memberIds.includes(userId) : false;
  }

  /**
   * Check if user is team leader
   */
  async isLeader(teamId: string, userId: string): Promise<boolean> {
    const team = await this.getById(teamId);
    return team ? team.leaderId === userId : false;
  }
}