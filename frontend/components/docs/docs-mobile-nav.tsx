"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DOCS_NAV } from "@/lib/docs/nav"
import { cn } from "@/lib/utils"

export function DocsMobileNav() {
  const pathname = usePathname()

  return (
    <div className="lg:hidden border-b-2 border-foreground bg-background/90 backdrop-blur shrink-0 sticky top-0 z-40">
      <div className="flex gap-1 overflow-x-auto px-3 py-2">
        {DOCS_NAV.map(({ href, label }) => {
          const active = pathname === href || (href !== "/docs" && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border-2 transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/30 hover:bg-muted/50"
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
