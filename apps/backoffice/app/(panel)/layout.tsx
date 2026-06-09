import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Separator } from '@oserp-community/ui/components/separator';

import { LogoutButton } from '@/components/logout-button';
import { PanelSidebar } from '@/components/panel-sidebar';
import { getCurrentAdmin } from '@/server/auth';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect('/login');
  }

  return (
    <div className="grid min-h-svh grid-cols-[16rem_1fr]">
      <aside className="bg-card flex flex-col border-r">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-4 text-sm font-semibold"
        >
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Sparkles className="size-4" />
          </span>
          oserp backoffice
        </Link>
        <Separator />
        <PanelSidebar />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="bg-background flex h-14 items-center justify-between gap-4 border-b px-6">
          <div className="text-muted-foreground truncate text-sm">
            Oturum: <span className="text-foreground font-mono">{admin.email}</span>
          </div>
          <LogoutButton />
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
