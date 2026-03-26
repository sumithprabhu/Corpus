"use client"

import { useState } from "react"
import Link from "next/link"
import { useAccount, useChainId, useConfig, useSwitchChain, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "wagmi/actions"
import { parseUnits } from "viem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Wallet, ArrowLeft } from "lucide-react"
import {
  erc20Abi,
  FILECOIN_CALIBRATION_CHAIN_ID,
  TREASURY_ADDRESS,
  treasuryAbi,
  USDFC_ADDRESS,
} from "@/lib/treasury-contract"
import { appendDepositEvent } from "@/lib/deposit-history"

export default function DepositPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onDeposit = async () => {
    setError(null)
    setStatus(null)
    if (!address) return
    const trimmed = amount.trim()
    if (!trimmed || Number(trimmed) <= 0) return

    let value: bigint
    try {
      value = parseUnits(trimmed, 18)
    } catch {
      setError("Invalid amount")
      return
    }

    setBusy(true)
    try {
      if (chainId !== FILECOIN_CALIBRATION_CHAIN_ID) {
        setStatus("Switching network…")
        await switchChainAsync({ chainId: FILECOIN_CALIBRATION_CHAIN_ID })
      }

      setStatus("Checking allowance…")
      const allowance = await readContract(config, {
        address: USDFC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, TREASURY_ADDRESS],
      })

      if (allowance < value) {
        setStatus("Approve USDFC in wallet…")
        const approveHash = await writeContractAsync({
          address: USDFC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [TREASURY_ADDRESS, value],
        })
        await waitForTransactionReceipt(config, { hash: approveHash })
      }

      setStatus("Confirm deposit in wallet…")
      const depositHash = await writeContractAsync({
        address: TREASURY_ADDRESS,
        abi: treasuryAbi,
        functionName: "deposit",
        args: [value],
      })
      await waitForTransactionReceipt(config, { hash: depositHash })

      appendDepositEvent({
        at: new Date().toISOString(),
        wallet: address,
        txHash: depositHash,
        amountWei: value.toString(),
        amountLabel: `${trimmed} USDFC`,
      })

      setStatus(`Success. Tx: ${depositHash.slice(0, 10)}…`)
      setAmount("")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed"
      setError(msg)
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Back to Billing
      </Link>
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Deposit funds</h1>
        <p className="text-xs text-muted-foreground font-mono">Add USDFC to your treasury on Filecoin Calibration</p>
      </div>
      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Treasury deposit</CardTitle>
          <CardDescription className="text-xs font-mono">
            Approve USDFC if needed, then call <code className="text-[#ea580c]">deposit</code>. Ensure your wallet holds USDFC on Calibration.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!isConnected ? (
            <p className="text-xs text-muted-foreground font-mono">Connect your wallet to deposit.</p>
          ) : (
            <>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground space-y-1">
                <p>Treasury: <span className="break-all text-foreground">{TREASURY_ADDRESS}</span></p>
                <p>USDFC: <span className="break-all text-foreground">{USDFC_ADDRESS}</span></p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Amount (USDFC)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono"
                  disabled={busy}
                />
              </div>
              <Button
                className="w-full font-mono uppercase bg-foreground text-background"
                disabled={!amount.trim() || Number(amount) <= 0 || busy}
                onClick={() => void onDeposit()}
              >
                <Wallet size={14} className="mr-2" />
                {busy ? "Working…" : "Deposit"}
              </Button>
              {status && <p className="text-xs font-mono text-muted-foreground">{status}</p>}
              {error && <p className="text-xs font-mono text-destructive break-words">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
