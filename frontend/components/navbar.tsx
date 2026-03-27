"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAccount, useDisconnect } from "wagmi"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRef, useState, useEffect } from "react"

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function WalletDropdown({ address }: { address: string }) {
  const [open, setOpen] = useState(false)
  const { disconnect } = useDisconnect()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2 text-xs font-mono tracking-widest uppercase"
      >
        {truncateAddress(address)}
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-1 w-44 border-2 border-foreground bg-background z-50"
          >
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150"
            >
              <LayoutDashboard size={11} />
              Dashboard
            </Link>
            <div className="border-t border-border" />
            <button
              onClick={() => { disconnect(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[10px] font-mono tracking-widest uppercase text-red-500 hover:bg-red-500/10 transition-colors duration-150"
            >
              <LogOut size={11} />
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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
        <div className="grid grid-cols-3 items-center w-full">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Corpus" width={28} height={28} className="object-contain dark:invert" />
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">
              Corpus
            </span>
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8">
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
            <Link
              href="/demo"
              className={`text-xs font-mono tracking-widest uppercase transition-colors duration-200 ${
                pathname === "/demo"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Demo
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center justify-end gap-4"
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
              <WalletDropdown address={address} />
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
