"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database } from "lucide-react"
import { motion } from "framer-motion"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { ThemeToggle } from "@/components/theme-toggle"

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function Navbar() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const isDashboard = pathname?.startsWith("/dashboard")

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6"
    >
      <nav className="w-full border border-foreground/20 bg-background/80 backdrop-blur-sm px-6 py-3 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Database size={16} strokeWidth={1.5} />
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">
              Corpus
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/docs"
              className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Docs
            </Link>
            <Link
              href="/#pricing"
              className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Pricing
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center gap-4"
          >
            <ThemeToggle />
            {!isDashboard && (
              <Link
                href="/dashboard"
                className="hidden sm:block text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Dashboard
              </Link>
            )}
            {isConnected && address ? (
              <Link href="/dashboard">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-block bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase"
                >
                  {truncateAddress(address)}
                </motion.span>
              </Link>
            ) : (
              <Link href="/login?returnUrl=/dashboard">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-block bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase"
                >
                  Get started
                </motion.span>
              </Link>
            )}
          </motion.div>
        </div>
      </nav>
    </motion.div>
  )
}
