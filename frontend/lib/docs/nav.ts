import type { LucideIcon } from "lucide-react"
import { BookOpen, Rocket, Bot, FileCode2, Coins, Boxes, Layers } from "lucide-react"

export type DocsNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const DOCS_NAV: DocsNavItem[] = [
  { href: "/docs", label: "Overview", icon: BookOpen },
  { href: "/docs/getting-started", label: "Get started", icon: Rocket },
  { href: "/docs/features", label: "Features", icon: Layers },
  { href: "/docs/architecture", label: "Architecture", icon: Boxes },
  { href: "/docs/skill", label: "Agent skill", icon: Bot },
  { href: "/docs/contracts", label: "Contracts", icon: FileCode2 },
  { href: "/docs/pricing", label: "Pricing", icon: Coins },
]
