"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAccount } from "wagmi"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Database,
  Shield,
  CreditCard,
  Boxes,
  Activity,
  Settings,
} from "lucide-react"

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/datasets", label: "Datasets", icon: Database },
  { href: "/dashboard/models", label: "Models", icon: Boxes },
  { href: "/dashboard/security", label: "Security & Access", icon: Shield },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isConnected, status } = useAccount()

  useEffect(() => {
    if (status === "connected" && !isConnected) return
    if (status === "disconnected" || !isConnected) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname || "/dashboard")}`)
    }
  }, [isConnected, status, router, pathname])

  if (status !== "connected" || !isConnected) {
    return (
      <div className="min-h-screen dot-grid-bg flex items-center justify-center">
        <p className="text-xs font-mono text-muted-foreground">Redirecting to login…</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden dot-grid-bg">
      <header className="shrink-0 sticky top-0 z-50">
        <Navbar />
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="w-56 border-r-2 border-foreground shrink-0 hidden lg:flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <nav className="p-4 flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground px-3 py-2">
              Dashboard
            </span>
            {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-wider uppercase transition-colors",
                  pathname === href
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={14} strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
