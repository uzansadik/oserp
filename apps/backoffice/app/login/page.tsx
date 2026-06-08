import { redirect } from 'next/navigation';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';

import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const ctx = await getContext();
  const adminCount = await ctx.adminUsers.count();
  if (adminCount === 0) {
    redirect('/setup');
  }
  const current = await getCurrentAdmin();
  if (current) {
    redirect('/');
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <AuthForm mode="login" />
    </div>
  );
}
