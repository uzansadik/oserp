1. IAM Context’in Sorumluluğu

IAM şunlardan sorumlu olmalı:

Authentication
- kullanıcı girişi
- şifre kontrolü
- session oluşturma
- refresh token yönetimi

Authorization
- role / permission kontrolü
- kullanıcı hangi şirkette ne yapabilir?
- hangi branch’e erişebilir?
- hangi module/action yetkisi var?

Identity
- user profili
- email doğrulama
- password reset
- MFA opsiyonel

Tenant Access
- company / branch bazlı erişim
- kullanıcı birden fazla şirkette çalışabilir mi?
- kullanıcı bir şirkette farklı role sahip olabilir mi?

Audit / Security
- login attempt
- session history
- password changed
- role assigned
- permission changed


2. Aggregate Tasarımı

IAM tarafında her şeyi tek UserAggregate içine koyma. Büyür ve hantallaşır.

Bence aggregate’ler şöyle olmalı:

UserAggregate
- User
- UserCredential
- UserEmailVerification
- UserSecuritySettings

RoleAggregate
- Role
- RolePermission

MembershipAggregate
- CompanyMembership
- BranchMembership
- UserRoleAssignment

SessionAggregate
- Session
- RefreshToken

ApiCredentialAggregate
- ApiKey
- PersonalAccessToken

InvitationAggregate
- UserInvitation

AuditLog
- event-sourcing/audit için append-only kayıt