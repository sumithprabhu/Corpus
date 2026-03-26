"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DOCS_NAV } from "@/lib/docs/nav"
import { cn } from "@/lib/utils"

export function DocsSidebarDesktop() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r-2 border-foreground bg-background/80 min-h-[calc(100vh-5.5rem)] sticky top-[5.5rem] self-start">
      <div className="p-4 border-b-2 border-foreground">
        <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono">
          Documentation
        </span>
        <p className="text-xs font-mono mt-1 uppercase tracking-tight font-bold">Corpus</p>
      </div>
      <nav className="p-2 flex flex-col gap-0.5">
        {DOCS_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/docs" && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-wide uppercase transition-colors border border-transparent",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
