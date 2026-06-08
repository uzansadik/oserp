export const IamEventNames = {
  // User
  UserCreated: 'iam.user.created',
  UserEmailVerified: 'iam.user.email_verified',
  UserStatusChanged: 'iam.user.status_changed',
  UserPasswordChanged: 'iam.user.password_changed',

  // Role
  RoleCreated: 'iam.role.created',
  RoleRenamed: 'iam.role.renamed',
  RolePermissionAssigned: 'iam.role.permission_assigned',
  RolePermissionRevoked: 'iam.role.permission_revoked',
  RoleDeactivated: 'iam.role.deactivated',

  // Membership
  MembershipGranted: 'iam.membership.granted',
  MembershipRoleAssigned: 'iam.membership.role_assigned',
  MembershipRoleRevoked: 'iam.membership.role_revoked',
  MembershipSuspended: 'iam.membership.suspended',

  // Session
  SessionStarted: 'iam.session.started',
  SessionRefreshed: 'iam.session.refreshed',
  SessionRevoked: 'iam.session.revoked',

  // ApiCredential
  ApiCredentialIssued: 'iam.api_credential.issued',
  ApiCredentialRotated: 'iam.api_credential.rotated',
  ApiCredentialRevoked: 'iam.api_credential.revoked',
} as const;

export type IamEventName = (typeof IamEventNames)[keyof typeof IamEventNames];
