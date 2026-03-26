"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiKey, apiGet, API_BASE } from "@/lib/api"
import { UploadActivityChart } from "@/components/dashboard/upload-activity-chart"
import { Database, HardDrive, Wallet, Upload, Coins, Clock } from "lucide-react"

type DatasetItem = {
  cid: string
  name?: string
  storageCost?: string
  sizeInBytes?: number
  datasetHash?: string
  uploadTimestamp?: string
  createdAt: string
  treasuryRecorded?: boolean
}

function formatWei(wei: string) {
  const n = BigInt(wei)
  if (n >= BigInt(1e18)) return `${Number(n) / 1e18} USDFC`
  if (n >= BigInt(1e15)) return `${Number(n) / 1e15} mUSDFC`
  return `${wei} wei`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

export default function OverviewPage() {
  const [datasets, setDatasets] = useState<DatasetItem[]>([])
  const [balance, setBalance] = useState<string | null>(null)
  const [prepare, setPrepare] = useState<{ debitPerUploadWei: string; debitPerMonthWei: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    try {
      const [listRes, balRes, prepRes] = await Promise.all([
        fetch(`${API_BASE}/dataset`, { headers: { "x-api-key": key } }),
        fetch(`${API_BASE}/treasury/balance`, { headers: { "x-api-key": key } }),
        fetch(`${API_BASE}/dataset/prepare`, { headers: { "x-api-key": key } }),
      ])
      const listData = listRes.ok ? await listRes.json() : null
      const balData = balRes.ok ? await balRes.json() : null
      const prepData = prepRes.ok ? await prepRes.json() : null
      setDatasets(listData?.datasets ?? [])
      setBalance(balData?.balance != null ? String(balData.balance) : null)
      setPrepare(prepData?.debitPerUploadWei ? { debitPerUploadWei: prepData.debitPerUploadWei, debitPerMonthWei: prepData.debitPerMonthWei } : null)
    } catch {
      setDatasets([])
      setBalance(null)
      setPrepare(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalCost = datasets.reduce((acc, d) => acc + BigInt(d.storageCost || "0"), BigInt(0))
  const totalBytes = datasets.reduce((acc, d) => acc + BigInt(d.sizeInBytes || 0), BigInt(0))

  const metrics = [
    { label: "Datasets Stored", value: loading ? "—" : String(datasets.length), icon: Database },
    { label: "Total Uploads", value: loading ? "—" : String(datasets.length), icon: Upload },
    { label: "Available Treasury Balance", value: loading ? "—" : (balance != null ? formatWei(balance) : "—"), icon: Wallet },
    { label: "Storage Cost Spent", value: loading ? "—" : formatWei(totalCost.toString()), icon: Coins },
    { label: "Total Storage Used", value: loading ? "—" : `${Number(totalBytes) / (1024 * 1024) < 0.01 ? `${Number(totalBytes) / 1024} KB` : `${(Number(totalBytes) / (1024 * 1024)).toFixed(2)} MB`}`, icon: HardDrive },
    { label: "Cost per Upload", value: prepare ? formatWei(prepare.debitPerUploadWei) : "—", icon: HardDrive },
    { label: "Cost per Month", value: prepare ? formatWei(prepare.debitPerMonthWei) : "—", icon: Clock },
  ]

  const recent = datasets.slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Overview</h1>
        <p className="text-xs text-muted-foreground font-mono">Quick status of your account and usage</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-2 border-foreground">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
                <Icon size={14} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-mono font-bold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage usage placeholder + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-foreground">
          <CardHeader className="border-b-2 border-foreground">
            <CardTitle className="text-base font-mono uppercase tracking-wider">Storage & uploads</CardTitle>
            <CardDescription className="text-xs font-mono">Uploads per day (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <UploadActivityChart datasets={datasets} />
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground">
          <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-mono uppercase tracking-wider">Recent activity</CardTitle>
              <CardDescription className="text-xs font-mono">Last actions</CardDescription>
            </div>
            <Link href="/dashboard/datasets">
              <Button variant="outline" size="sm" className="font-mono text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Time</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Action</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">CID</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-3 text-muted-foreground">Loading…</td></tr>
                  ) : recent.length === 0 ? (
                    <tr><td colSpan={4} className="p-3 text-muted-foreground">No activity yet</td></tr>
                  ) : (
                    recent.map((d) => (
                      <tr key={d.cid} className="border-b border-border last:border-0">
                        <td className="p-3">{formatDate(d.uploadTimestamp || d.createdAt)}</td>
                        <td className="p-3">Dataset uploaded</td>
                        <td className="p-3 font-mono truncate max-w-[120px]" title={d.cid}>{d.cid.slice(0, 12)}…</td>
                        <td className="p-3">{d.treasuryRecorded ? "✓ Onchain" : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex flex-wrap gap-4">
          <Link href="/dashboard/datasets?upload=1">
            <Button className="font-mono uppercase tracking-wider bg-foreground text-background">
              <Upload size={14} className="mr-2" />
              Upload dataset
            </Button>
          </Link>
          <Link href="/dashboard/datasets">
            <Button variant="outline" className="font-mono uppercase tracking-wider">
              <Database size={14} className="mr-2" />
              View all datasets
            </Button>
          </Link>
          <Link href="/dashboard/billing">
            <Button variant="outline" className="font-mono uppercase tracking-wider">
              <Wallet size={14} className="mr-2" />
              Deposit funds
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
