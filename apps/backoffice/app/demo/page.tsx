"use client"

import * as React from "react"
import {
  Bell,
  Check,
  ChevronRight,
  Container,
  Cpu,
  Database,
  GitBranch,
  Globe,
  HardDrive,
  Info,
  Lock,
  Mail,
  Network,
  Plus,
  Search,
  Server,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@oserp-community/ui/components/alert"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@oserp-community/ui/components/avatar"
import { Badge } from "@oserp-community/ui/components/badge"
import { Button } from "@oserp-community/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@oserp-community/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@oserp-community/ui/components/dialog"
import { Input } from "@oserp-community/ui/components/input"
import { Label } from "@oserp-community/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@oserp-community/ui/components/select"
import { Separator } from "@oserp-community/ui/components/separator"
import { Switch } from "@oserp-community/ui/components/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@oserp-community/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@oserp-community/ui/components/tabs"
import { Textarea } from "@oserp-community/ui/components/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@oserp-community/ui/components/tooltip"

type ServiceStatus = "running" | "stopped" | "updating" | "failed"

type ServiceRow = {
  name: string
  image: string
  version: string
  status: ServiceStatus
  uptime: string
}

const SERVICES: ServiceRow[] = [
  { name: "iam", image: "ghcr.io/uzansadik/oserp-api", version: "latest", status: "running", uptime: "3d 4h" },
  { name: "postgres", image: "postgres", version: "16-bookworm", status: "running", uptime: "3d 4h" },
  { name: "catalog", image: "ghcr.io/uzansadik/oserp-catalog", version: "0.2.1", status: "updating", uptime: "11m" },
  { name: "sales", image: "ghcr.io/uzansadik/oserp-sales", version: "0.1.0", status: "stopped", uptime: "—" },
  { name: "worker", image: "ghcr.io/uzansadik/oserp-worker", version: "edge", status: "failed", uptime: "—" },
]

const STATUS_VARIANT: Record<ServiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "outline",
  updating: "secondary",
  failed: "destructive",
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <div className="rounded-xl border bg-card p-6">{children}</div>
    </section>
  )
}

export default function DemoPage() {
  const [notifications, setNotifications] = React.useState(true)
  const [autoUpdate, setAutoUpdate] = React.useState(false)

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-svh bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h1 className="text-base font-semibold">@oserp-community/ui</h1>
                <p className="text-muted-foreground text-xs">
                  shadcn/ui • Tailwind v4 • radix-nova preset
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Repo">
                    <GitBranch />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Repo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Bildirimler">
                    <Bell />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bildirimler</TooltipContent>
              </Tooltip>
              <Button>
                <Plus />
                Yeni servis
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-12 px-6 py-10">
          <div className="space-y-2">
            <Badge variant="secondary">/demo</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Component galerisi</h1>
            <p className="text-muted-foreground max-w-2xl">
              Backoffice arayüzünde kullanılan tüm shadcn/ui primitiflerinin canlı önizlemesi.
              Tema değiştirmek için klavyeden <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">d</kbd> tuşuna basabilirsin.
            </p>
          </div>

          <Section title="Butonlar" description="Tüm varyant ve boyutlar.">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled>Disabled</Button>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="xs">XS</Button>
                <Button size="sm">SM</Button>
                <Button>Default</Button>
                <Button size="lg">LG</Button>
                <Button size="icon" aria-label="Ara">
                  <Search />
                </Button>
                <Button>
                  <Upload />
                  Yükle
                </Button>
                <Button variant="outline">
                  Devam et
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Rozetler & avatarlar">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">Badge varyantları</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge>
                    <Check className="size-3" />
                    Sağlıklı
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">Avatar grupları</p>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="https://i.pravatar.cc/96?img=12" alt="Sadık" />
                    <AvatarFallback>SU</AvatarFallback>
                    <AvatarBadge className="bg-emerald-500" />
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>OS</AvatarFallback>
                  </Avatar>
                  <AvatarGroup>
                    <Avatar>
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <AvatarGroupCount>+4</AvatarGroupCount>
                  </AvatarGroup>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Kartlar">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="text-muted-foreground size-4" />
                    CPU
                  </CardTitle>
                  <CardDescription>Son 5 dakika ortalama</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">12%</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">12.4%</div>
                  <p className="text-muted-foreground text-xs">8 çekirdek aktif</p>
                </CardContent>
                <CardFooter className="text-muted-foreground text-xs">Güncellendi az önce</CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="text-muted-foreground size-4" />
                    Disk
                  </CardTitle>
                  <CardDescription>/var/lib/docker</CardDescription>
                  <CardAction>
                    <Badge>Sağlıklı</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">68 GB</div>
                  <p className="text-muted-foreground text-xs">240 GB toplam, %28 dolu</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">
                    Detay
                    <ChevronRight />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="text-muted-foreground size-4" />
                    Ağ
                  </CardTitle>
                  <CardDescription>oserp-net köprüsü</CardDescription>
                  <CardAction>
                    <Badge variant="outline">5 container</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">142 KB/s</div>
                  <p className="text-muted-foreground text-xs">Egress, son 1 dk</p>
                </CardContent>
                <CardFooter className="text-muted-foreground text-xs">10.10.0.0/24</CardFooter>
              </Card>
            </div>
          </Section>

          <Section title="Alert">
            <div className="space-y-3">
              <Alert>
                <Info />
                <AlertTitle>Yeni sürüm hazır</AlertTitle>
                <AlertDescription>
                  <code>oserp-api</code> imajı için <code>1.4.2</code> sürümü GHCR&apos;de yayında.
                </AlertDescription>
                <AlertAction>
                  <Button size="sm" variant="outline">
                    Güncelle
                  </Button>
                </AlertAction>
              </Alert>
              <Alert variant="destructive">
                <Info />
                <AlertTitle>worker servisi durdu</AlertTitle>
                <AlertDescription>Son 5 dakikada 3 kez yeniden başlatma denendi.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Section title="Form alanları">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" placeholder="admin@ornek.tr" />
                <p className="text-muted-foreground text-xs">İlk kurulumda kullanılacak yönetici hesabı.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry">Registry</Label>
                <Select defaultValue="ghcr">
                  <SelectTrigger id="registry" className="w-full">
                    <SelectValue placeholder="Registry seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ghcr">ghcr.io (GitHub Container Registry)</SelectItem>
                    <SelectItem value="docker">docker.io (Docker Hub)</SelectItem>
                    <SelectItem value="local">Yerel registry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="env">Ek ortam değişkenleri</Label>
                <Textarea id="env" placeholder={"KEY=value\nANOTHER=value"} rows={4} />
              </div>
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="text-muted-foreground size-4" />
                    <div>
                      <div className="text-sm font-medium">E-posta bildirimleri</div>
                      <p className="text-muted-foreground text-xs">Servis çöktüğünde admin&apos;e bildir.</p>
                    </div>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Upload className="text-muted-foreground size-4" />
                    <div>
                      <div className="text-sm font-medium">Otomatik güncelleme</div>
                      <p className="text-muted-foreground text-xs">GHCR&apos;de yeni latest tag çıkarsa pull et.</p>
                    </div>
                  </div>
                  <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Sekmeler">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">
                  <Globe />
                  Genel
                </TabsTrigger>
                <TabsTrigger value="services">
                  <Container />
                  Servisler
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings />
                  Ayarlar
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="text-muted-foreground pt-4 text-sm">
                Sunucudaki tüm container&apos;ların özet görünümü.
              </TabsContent>
              <TabsContent value="services" className="pt-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {SERVICES.slice(0, 3).map((s) => (
                    <Card key={s.name}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Server className="text-muted-foreground size-4" />
                          {s.name}
                        </CardTitle>
                        <CardDescription>{s.image}</CardDescription>
                        <CardAction>
                          <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="text-muted-foreground text-xs">
                        v{s.version} • {s.uptime}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="settings" className="text-muted-foreground pt-4 text-sm">
                Registry, ağ ve yedekleme ayarları.
              </TabsContent>
            </Tabs>
          </Section>

          <Section title="Tablo" description="Backoffice&apos;in canlı servis listesi örneği.">
            <Table>
              <TableCaption>Sunucudaki tüm container&apos;lar.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Servis</TableHead>
                  <TableHead>İmaj</TableHead>
                  <TableHead>Sürüm</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead className="text-right">Eylem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SERVICES.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.name === "postgres" ? (
                          <Database className="text-muted-foreground size-4" />
                        ) : (
                          <Container className="text-muted-foreground size-4" />
                        )}
                        {s.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{s.image}</TableCell>
                    <TableCell className="text-xs">{s.version}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.uptime}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Dialog">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 />
                    Servisi sil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>worker servisi silinsin mi?</DialogTitle>
                    <DialogDescription>
                      Bu container ve ona ait volume kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">İptal</Button>
                    </DialogClose>
                    <Button variant="destructive">
                      <Trash2 />
                      Evet, sil
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Mail />
                    Davet gönder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yönetici davet et</DialogTitle>
                    <DialogDescription>Davet linki e-posta ile gönderilecek.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">E-posta</Label>
                      <Input id="invite-email" type="email" placeholder="ornek@oserp.dev" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Rol</Label>
                      <Select defaultValue="admin">
                        <SelectTrigger id="invite-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Vazgeç</Button>
                    </DialogClose>
                    <Button>
                      <Lock />
                      Daveti gönder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Section>

          <footer className="text-muted-foreground border-t pt-6 text-xs">
            packages/ui · components: button, badge, card, alert, avatar, input, label, select,
            switch, separator, tabs, table, textarea, tooltip, dialog
          </footer>
        </main>
      </div>
    </TooltipProvider>
  )
}
