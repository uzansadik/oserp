import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@oserp-community/ui/components/button"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">@oserp-community/backoffice</h1>
          <p className="text-muted-foreground">
            Bu uygulama henüz iskelet aşamasında. Faz 1 ile birlikte kurulum sihirbazı ve
            servis kontrolü eklenecek.
          </p>
        </div>
        <Button asChild>
          <Link href="/demo">
            Component galerisini gez
            <ArrowRight />
          </Link>
        </Button>
        <p className="text-muted-foreground font-mono text-xs">
          (Tema değiştirmek için <kbd>d</kbd>)
        </p>
      </div>
    </div>
  )
}
