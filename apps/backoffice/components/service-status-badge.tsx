import { Badge } from '@oserp-community/ui/components/badge';

type Props = {
  dbStatus: 'installing' | 'running' | 'stopped' | 'updating' | 'failed';
  running: boolean;
  exists: boolean;
  error: string | null;
};

export function ServiceStatusBadge({ dbStatus, running, exists, error }: Props) {
  if (error) {
    return <Badge variant="destructive">hata</Badge>;
  }
  if (dbStatus === 'installing') {
    return <Badge variant="secondary">kuruluyor</Badge>;
  }
  if (dbStatus === 'updating') {
    return <Badge variant="secondary">güncelleniyor</Badge>;
  }
  if (dbStatus === 'failed') {
    return <Badge variant="destructive">başarısız</Badge>;
  }
  if (!exists) {
    return <Badge variant="outline">yok</Badge>;
  }
  if (running) {
    return <Badge>çalışıyor</Badge>;
  }
  return <Badge variant="outline">durduruldu</Badge>;
}
