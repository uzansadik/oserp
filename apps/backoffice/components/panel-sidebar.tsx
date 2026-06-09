'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Boxes,
  PackagePlus,
  Settings as SettingsIcon,
} from 'lucide-react';

import { cn } from '@oserp-community/ui/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Activity;
};

const ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Genel Bakış', icon: Activity },
  { href: '/install', label: 'Servis Kur', icon: PackagePlus },
  { href: '/services', label: 'Servisler', icon: Boxes },
  { href: '/settings', label: 'Ayarlar', icon: SettingsIcon },
];

export function PanelSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
