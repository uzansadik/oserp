import { MembershipAggregate } from '../../domain/aggregates/MembershipAggregate';
import { RoleAssignmentService } from '../../domain/services/RoleAssignmentService';
import { CompanyId } from '../../domain/value-objects/CompanyId';
import { MembershipId } from '../../domain/value-objects/MembershipId';
import { RoleId } from '../../domain/value-objects/RoleId';
import { UserId } from '../../domain/value-objects/UserId';
import {
  type AssignRoleToMemberCommand,
  assignRoleToMemberSchema,
  type GrantMembershipCommand,
  grantMembershipSchema,
  type RevokeRoleFromMemberCommand,
  revokeRoleFromMemberSchema,
  type SuspendMembershipCommand,
  suspendMembershipSchema,
} from '../commands/MembershipCommands';
import type { CommandHandler } from '../Handler';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

const roleAssignmentService = new RoleAssignmentService();

export class GrantMembershipHandler
  implements CommandHandler<GrantMembershipCommand, { membershipId: string }>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: GrantMembershipCommand): Promise<{ membershipId: string }> {
    const command = grantMembershipSchema.parse(input);
    const userId = UserId.create(command.userId);
    const companyId = CompanyId.create(command.companyId);
    const roleIds = (command.roleIds ?? []).map((id) => RoleId.create(id));

    return this.uow.execute(async (ctx) => {
      const user = await ctx.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (await ctx.memberships.findByUserAndCompany(userId, companyId)) {
        throw new Error('User already has a membership in this company');
      }

      const membership = MembershipAggregate.grant({ userId, companyId, roleIds });

      for (const roleId of roleIds) {
        const role = await ctx.roles.findById(roleId);
        if (!role) {
          throw new Error(`Role ${roleId.toString()} not found`);
        }
        roleAssignmentService.ensureAssignable(role, membership);
      }

      await ctx.memberships.save(membership);
      await ctx.outbox.enqueue(membership.getDomainEvents());
      membership.clearDomainEvents();

      return { membershipId: membership.getId().toString() };
    });
  }
}

export class AssignRoleToMemberHandler implements CommandHandler<AssignRoleToMemberCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: AssignRoleToMemberCommand): Promise<void> {
    const command = assignRoleToMemberSchema.parse(input);
    const membershipId = MembershipId.create(command.membershipId);
    const roleId = RoleId.create(command.roleId);

    await this.uow.execute(async (ctx) => {
      const membership = await ctx.memberships.findById(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      const role = await ctx.roles.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      roleAssignmentService.ensureAssignable(role, membership);
      membership.assignRole(roleId);

      await ctx.memberships.save(membership);
      await ctx.outbox.enqueue(membership.getDomainEvents());
      membership.clearDomainEvents();
    });
  }
}

export class RevokeRoleFromMemberHandler implements CommandHandler<RevokeRoleFromMemberCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: RevokeRoleFromMemberCommand): Promise<void> {
    const command = revokeRoleFromMemberSchema.parse(input);
    const membershipId = MembershipId.create(command.membershipId);
    const roleId = RoleId.create(command.roleId);

    await this.uow.execute(async (ctx) => {
      const membership = await ctx.memberships.findById(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      membership.revokeRole(roleId);

      await ctx.memberships.save(membership);
      await ctx.outbox.enqueue(membership.getDomainEvents());
      membership.clearDomainEvents();
    });
  }
}

export class SuspendMembershipHandler implements CommandHandler<SuspendMembershipCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: SuspendMembershipCommand): Promise<void> {
    const command = suspendMembershipSchema.parse(input);
    const membershipId = MembershipId.create(command.membershipId);

    await this.uow.execute(async (ctx) => {
      const membership = await ctx.memberships.findById(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      membership.suspend();

      await ctx.memberships.save(membership);
      await ctx.outbox.enqueue(membership.getDomainEvents());
      membership.clearDomainEvents();
    });
  }
}
