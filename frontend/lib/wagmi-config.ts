import "@/lib/ssr-storage-polyfill"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"

const filecoinCalibration = {
  id: 314159,
  name: "Filecoin Calibration",
  iconBackground: "#fff",
  nativeCurrency: { name: "FIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
  },
  blockExplorers: {
    default: { name: "Calibration Explorer", url: "https://calibration.filfox.info" },
  },
} as const

export const config = getDefaultConfig({
  appName: "Corpus",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [filecoinCalibration],
  transports: {
    [filecoinCalibration.id]: http("https://api.calibration.node.glif.io/rpc/v1"),
  },
  ssr: true,
})
