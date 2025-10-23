export * from './base.service';
export * from './organization.service';
export * from './workspace.service';
export * from './team.service';
export * from './portfolio.service';
export * from './project.service';
export * from './task.service';

// Service instances for easy import
import { OrganizationService } from './organization.service';
import { WorkspaceService } from './workspace.service';
import { TeamService } from './team.service';
import { PortfolioService } from './portfolio.service';
import { ProjectService } from './project.service';
import { TaskService } from './task.service';

export const organizationService = new OrganizationService();
export const workspaceService = new WorkspaceService();
export const teamService = new TeamService();
export const portfolioService = new PortfolioService();
export const projectService = new ProjectService();
export const taskService = new TaskService();