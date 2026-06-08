/**
 * API route'larında kullanılan izin kodları (`module.resource.action`).
 * IAM modülü için `iam` ön ekini kullanır.
 */
export const IamPermissions = {
  userRead: 'iam.user.read',
  userList: 'iam.user.list',
  userCreate: 'iam.user.create',
  userUpdate: 'iam.user.update',

  roleRead: 'iam.role.read',
  roleList: 'iam.role.list',
  roleCreate: 'iam.role.create',
  roleUpdate: 'iam.role.update',

  permissionList: 'iam.permission.list',
  permissionCreate: 'iam.permission.create',

  membershipCreate: 'iam.membership.create',
  membershipUpdate: 'iam.membership.update',

  apiCredentialCreate: 'iam.apikey.create',
  apiCredentialUpdate: 'iam.apikey.update',
} as const;
