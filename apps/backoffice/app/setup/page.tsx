import { redirect } from 'next/navigation';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';

import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const ctx = await getContext();
  const adminCount = await ctx.adminUsers.count();
  if (adminCount > 0) {
    const current = await getCurrentAdmin();
    redirect(current ? '/' : '/login');
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <AuthForm mode="setup" />
    </div>
  );
}
