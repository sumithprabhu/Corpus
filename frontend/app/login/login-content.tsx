"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Navbar } from "@/components/navbar"
import { motion } from "framer-motion"

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_CORPUS_API_URL || "http://localhost:3001")
  : "http://localhost:3001"

export function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/dashboard"
  const { address, isConnected } = useAccount()
  const didCreateUser = useRef(false)

  useEffect(() => {
    if (!isConnected || !address) return
    if (didCreateUser.current) return
    didCreateUser.current = true
    fetch(`${API_BASE}/user/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey && typeof window !== "undefined") {
          window.localStorage.setItem("corpus_api_key", data.apiKey)
        }
        router.replace(returnUrl)
      })
      .catch(() => {
        didCreateUser.current = false
      })
  }, [isConnected, address, router, returnUrl])

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main className="w-full max-w-md mx-auto px-6 py-24 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full border-2 border-foreground p-8 flex flex-col items-center gap-6"
        >
          <h1 className="text-xl font-mono font-bold tracking-tight uppercase">
            Connect wallet
          </h1>
          <p className="text-xs text-muted-foreground font-mono text-center">
            Connect with Filecoin Calibration to access the dashboard. We’ll create or retrieve your API key.
          </p>
          <div className="[&_button]:font-mono [&_button]:text-xs [&_button]:tracking-widest [&_button]:uppercase">
            <ConnectButton />
          </div>
        </motion.div>
      </main>
    </div>
  )
}
