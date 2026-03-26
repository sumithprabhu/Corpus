"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAccount, useConfig } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiKey, apiGet, API_BASE } from "@/lib/api"
import { getDepositEventsForWallet, sumDepositWeiForWallet } from "@/lib/deposit-history"
import { getDepositLogsForUser } from "@/lib/treasury-logs"
import { Wallet } from "lucide-react"

function formatWei(wei: string) {
  const n = BigInt(wei)
  if (n >= BigInt(1e18)) return `${Number(n) / 1e18} USDFC`
  if (n >= BigInt(1e15)) return `${Number(n) / 1e15} mUSDFC`
  return `${wei} wei`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

type BillingRow = { date: string; action: string; amount: string; cid?: string }

type DatasetRow = {
  cid: string
  storageCost?: string
  uploadTimestamp?: string
  createdAt: string
}

export default function BillingPage() {
  const { address } = useAccount()
  const config = useConfig()
  const [balance, setBalance] = useState<string | null>(null)
  const [prepare, setPrepare] = useState<{ debitPerUploadWei: string; debitPerMonthWei: string } | null>(null)
  const [history, setHistory] = useState<BillingRow[]>([])
  const [totalDepositedWei, setTotalDepositedWei] = useState<string | null>(null)
  const [totalSpentWei, setTotalSpentWei] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/treasury/balance`, { headers: { "x-api-key": key } }).then((r) => (r.ok ? r.json() : {})),
      fetch(`${API_BASE}/dataset/prepare`, { headers: { "x-api-key": key } }).then((r) => (r.ok ? r.json() : {})),
      apiGet<{ datasets: DatasetRow[] }>("/dataset").catch(() => ({ datasets: [] as DatasetRow[] })),
    ])
      .then(async ([bal, prep, list]) => {
        setBalance(bal.balance != null ? String(bal.balance) : null)
        setPrepare(
          prep.debitPerUploadWei
            ? { debitPerUploadWei: prep.debitPerUploadWei, debitPerMonthWei: prep.debitPerMonthWei }
            : null
        )
        const datasets = list.datasets ?? []
        const spent = datasets.reduce((acc, d) => acc + BigInt(d.storageCost || "0"), BigInt(0))
        setTotalSpentWei(spent > BigInt(0) ? spent.toString() : null)

        // Deposits: prefer on-chain Deposit logs; fallback to local history if RPC/logs fail.
        let depositRows: Array<BillingRow & { t: number }> = []
        if (address) {
          try {
            const logs = await getDepositLogsForUser(config, address as `0x${string}`)
            const client = (await import("wagmi/actions")).getPublicClient(config)
            const uniqueBlocks = Array.from(new Set(logs.map((l) => l.blockNumber.toString()))).map((b) => BigInt(b))
            const blockTimes = new Map<string, number>()
            await Promise.all(
              uniqueBlocks.map(async (bn) => {
                const block = await client.getBlock({ blockNumber: bn })
                blockTimes.set(bn.toString(), Number(block.timestamp) * 1000)
              })
            )
            depositRows = logs.map((l) => {
              const t = blockTimes.get(l.blockNumber.toString()) ?? Date.now()
              return {
                date: new Date(t).toISOString(),
                action: "Deposit",
                amount: formatWei(l.amount.toString()),
                cid: l.txHash,
                t,
              }
            })
            const deposited = logs.reduce((acc, l) => acc + l.amount, BigInt(0))
            setTotalDepositedWei(deposited > BigInt(0) ? deposited.toString() : null)
          } catch {
            const deposits = getDepositEventsForWallet(address)
            depositRows = deposits.map((e) => ({
              date: e.at,
              action: "Deposit",
              amount: e.amountLabel || formatWei(e.amountWei),
              cid: e.txHash,
              t: new Date(e.at).getTime(),
            }))
            const deposited = sumDepositWeiForWallet(address)
            setTotalDepositedWei(deposited > BigInt(0) ? deposited.toString() : null)
          }
        } else {
          setTotalDepositedWei(null)
        }

        const deductionRows = datasets.map((d) => ({
          date: d.uploadTimestamp || d.createdAt,
          action: "Storage deduction",
          amount: d.storageCost ? formatWei(d.storageCost) : "—",
          cid: d.cid,
          t: new Date(d.uploadTimestamp || d.createdAt).getTime(),
        }))
        const merged = [...depositRows, ...deductionRows].sort((a, b) => b.t - a.t)
        setHistory(merged.map(({ t: _t, ...row }) => row))
      })
      .catch(() => {
        setBalance(null)
        setPrepare(null)
        setHistory([])
        setTotalDepositedWei(null)
        setTotalSpentWei(null)
      })
      .finally(() => setLoading(false))
  }, [address])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Billing</h1>
        <p className="text-xs text-muted-foreground font-mono">Treasury balance and storage cost</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Treasury balance</CardTitle>
          <CardDescription className="text-xs font-mono">On-chain (executor debits on upload)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Available balance</p>
            <p className="text-xl font-mono font-bold">{loading ? "—" : balance != null ? formatWei(balance) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total deposited (this browser)</p>
            <p className="text-xl font-mono font-bold">
              {loading ? "—" : totalDepositedWei ? formatWei(totalDepositedWei) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Tracks deposits via Corpus deposit page only</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total spent (uploads)</p>
            <p className="text-xl font-mono font-bold">{loading ? "—" : totalSpentWei ? formatWei(totalSpentWei) : "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sum of recorded storage costs for your datasets</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Deposit funds</CardTitle>
          <Button asChild className="font-mono uppercase bg-foreground text-background">
            <Link href="/dashboard/billing/deposit">
              <Wallet size={14} className="mr-2" />
              Deposit funds
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-mono">
            Approve USDFC and call the treasury contract on Calibration. After confirming, refresh balance on this page.
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Billing history</CardTitle>
          <CardDescription className="text-xs font-mono">
            Deposits from this app + storage rows from your datasets
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Action</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Amount / ref</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Dataset / tx</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-muted-foreground">
                      No rows yet. Deposit from the deposit page or upload a dataset.
                    </td>
                  </tr>
                ) : (
                  history.map((row, i) => (
                    <tr key={`${row.date}-${row.action}-${i}`} className="border-b border-border">
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3">{row.action}</td>
                      <td className="p-3">{row.amount}</td>
                      <td className="p-3 font-mono truncate max-w-[140px]" title={row.cid}>
                        {row.cid ? (row.cid.length > 20 ? `${row.cid.slice(0, 10)}…${row.cid.slice(-6)}` : row.cid) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Storage pricing</CardTitle>
          <CardDescription className="text-xs font-mono">Cost model</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cost per upload</p>
            <p className="text-lg font-mono font-bold">{prepare ? formatWei(prepare.debitPerUploadWei) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cost per month</p>
            <p className="text-lg font-mono font-bold">{prepare ? formatWei(prepare.debitPerMonthWei) : "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
