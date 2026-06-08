import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@oserp-community/ui/components/button"

import { LogoutButton } from "@/components/logout-button"
import { getCurrentAdmin } from "@/server/auth"

export const dynamic = "force-dynamic"

export default async function Page() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">@oserp-community/backoffice</h1>
          <p className="text-muted-foreground">
            Giriş yapıldı: <span className="font-mono">{admin.email}</span>.
            Faz 3 ile birlikte Docker servis kontrolü eklenecek.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/demo">
              Component galerisini gez
              <ArrowRight />
            </Link>
          </Button>
          <LogoutButton />
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          (Tema değiştirmek için <kbd>d</kbd>)
        </p>
      </div>
    </div>
  )
}
