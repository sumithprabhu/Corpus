"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getApiKey, apiGet, API_BASE } from "@/lib/api"
import { TREASURY_ADDRESS } from "@/lib/treasury-contract"
import { Search, Upload, Copy, Download, ExternalLink } from "lucide-react"

type DatasetItem = {
  cid: string
  name?: string
  storageCost?: string
  sizeInBytes?: number
  datasetHash?: string
  uploadTimestamp?: string
  createdAt: string
  treasuryRecorded?: boolean
  encrypted?: boolean
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" })
  } catch {
    return iso
  }
}

function formatWei(wei: string) {
  const n = BigInt(wei)
  if (n >= BigInt(1e18)) return `${Number(n) / 1e18}`
  return wei
}

export function DatasetsPageContent() {
  const searchParams = useSearchParams()
  const [showUpload, setShowUpload] = useState(() => searchParams.get("upload") === "1")
  const [datasets, setDatasets] = useState<DatasetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [onlyOnchain, setOnlyOnchain] = useState(false)
  const [onlyEncrypted, setOnlyEncrypted] = useState(false)
  const [onlyNamed, setOnlyNamed] = useState(false)
  const [selected, setSelected] = useState<DatasetItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [page, setPage] = useState(0)
  const perPage = 10

  useEffect(() => {
    if (searchParams.get("upload") === "1") setShowUpload(true)
  }, [searchParams])

  const load = useCallback(async () => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    try {
      const data = await apiGet<{ datasets: DatasetItem[] }>("/treasury/datasets")
      setDatasets(data.datasets ?? [])
    } catch {
      setDatasets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = datasets.filter((d) => {
    const q = search.toLowerCase()
    const matchesText =
      d.cid.toLowerCase().includes(q) || (d.name || "").toLowerCase().includes(q)
    if (!matchesText) return false
    if (onlyOnchain && !d.treasuryRecorded) return false
    if (onlyEncrypted && !d.encrypted) return false
    if (onlyNamed && !d.name) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage)

  useEffect(() => {
    setPage(0)
  }, [search])

  const handleUpload = async () => {
    if (!uploadFile) return
    const key = getApiKey()
    if (!key) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", uploadFile)
      const res = await fetch(`${API_BASE}/dataset/upload`, {
        method: "POST",
        headers: { "x-api-key": key },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || "Upload failed")
      setUploadFile(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const copyCid = (cid: string) => {
    navigator.clipboard.writeText(cid)
  }

  const downloadUrl = (cid: string) => {
    const key = getApiKey()
    const base = API_BASE.replace(/\/$/, "")
    return `${base}/dataset/${encodeURIComponent(cid)}?x-api-key=${key}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Datasets</h1>
          <p className="text-xs text-muted-foreground font-mono">Manage uploaded datasets</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by CID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono"
          />
        </div>
        <Button
          className="font-mono uppercase tracking-wider bg-foreground text-background"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={14} className="mr-2" />
          Upload dataset
        </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={onlyOnchain ? "default" : "outline"}
            size="sm"
            className="font-mono uppercase text-xs"
            onClick={() => setOnlyOnchain((v) => !v)}
          >
            Onchain only
          </Button>
          <Button
            type="button"
            variant={onlyEncrypted ? "default" : "outline"}
            size="sm"
            className="font-mono uppercase text-xs"
            onClick={() => setOnlyEncrypted((v) => !v)}
          >
            Encrypted only
          </Button>
          <Button
            type="button"
            variant={onlyNamed ? "default" : "outline"}
            size="sm"
            className="font-mono uppercase text-xs"
            onClick={() => setOnlyNamed((v) => !v)}
          >
            Named only
          </Button>
        </div>
      </div>

      <Card className="border-2 border-foreground">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">CID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Upload date</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Size</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Cost</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Onchain</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-6 text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-muted-foreground">No datasets</td></tr>
                ) : (
                  paginated.map((d) => (
                    <tr
                      key={d.cid}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelected(d)}
                    >
                      <td className="p-3 font-mono truncate max-w-[140px]" title={d.cid}>{d.cid.slice(0, 14)}…</td>
                      <td className="p-3">{d.name || "—"}</td>
                      <td className="p-3">{formatDate(d.uploadTimestamp || d.createdAt)}</td>
                      <td className="p-3">{d.sizeInBytes ? `${(d.sizeInBytes / 1024).toFixed(1)} KB` : "—"}</td>
                      <td className="p-3">{d.storageCost ? formatWei(d.storageCost) : "—"}</td>
                      <td className="p-3">{d.treasuryRecorded ? "✓" : "—"}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyCid(d.cid)}>
                            <Copy size={12} />
                          </Button>
                          <a href={downloadUrl(d.cid)} download target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Download size={12} />
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > perPage && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs font-mono">
              <span className="text-muted-foreground">
                {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Dataset details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div><span className="text-muted-foreground">CID:</span> <span className="break-all">{selected.cid}</span></div>
              <div><span className="text-muted-foreground">Name:</span> {selected.name || "—"}</div>
              <div><span className="text-muted-foreground">Storage cost:</span> {selected.storageCost ? formatWei(selected.storageCost) : "—"}</div>
              <div><span className="text-muted-foreground">Size:</span> {selected.sizeInBytes ? `${selected.sizeInBytes} bytes` : "—"}</div>
              <div><span className="text-muted-foreground">Dataset hash:</span> <span className="break-all">{selected.datasetHash || "—"}</span></div>
              <div><span className="text-muted-foreground">Uploaded:</span> {formatDate(selected.uploadTimestamp || selected.createdAt)}</div>
              <div><span className="text-muted-foreground">Treasury recorded:</span> {selected.treasuryRecorded ? "Yes" : "No"}</div>
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => copyCid(selected.cid)}>Copy CID</Button>
                <a href={downloadUrl(selected.cid)} download>
                  <Button size="sm" variant="outline">Download</Button>
                </a>
                <a href={`https://calibration.filfox.info/en/address/${encodeURIComponent(TREASURY_ADDRESS)}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline"><ExternalLink size={12} className="mr-1" /> Treasury</Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUpload} onOpenChange={(o) => !uploading && setShowUpload(o)}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Upload dataset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">File</label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="font-mono"
              />
            </div>
            <Button
              disabled={!uploadFile || uploading}
              className="w-full font-mono uppercase"
              onClick={handleUpload}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
