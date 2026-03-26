"use client"

import "@/lib/ssr-storage-polyfill"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { config } from "@/lib/wagmi-config"

import "@rainbow-me/rainbowkit/styles.css"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#ea580c",
            accentColorForeground: "white",
            borderRadius: "none",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
