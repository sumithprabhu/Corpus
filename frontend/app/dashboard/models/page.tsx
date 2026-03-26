"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiGet, apiPost } from "@/lib/api"
import { Copy } from "lucide-react"

type ModelRun = {
  id: string
  datasetCID: string
  modelArtifactCID: string
  trainingConfigHash?: string
  trainingCodeHash?: string
  provenanceHash: string
  createdAt: string
}

function truncate(s: string, left = 10, right = 8) {
  if (!s) return "—"
  if (s.length <= left + right + 1) return s
  return `${s.slice(0, left)}…${s.slice(-right)}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

export default function ModelsPage() {
  const [runs, setRuns] = useState<ModelRun[]>([])
  const [loading, setLoading] = useState(true)
  const [datasetCID, setDatasetCID] = useState("")
  const [modelArtifactCID, setModelArtifactCID] = useState("")
  const [trainingConfigHash, setTrainingConfigHash] = useState("")
  const [trainingCodeHash, setTrainingCodeHash] = useState("")
  const [filterDataset, setFilterDataset] = useState("")
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = filterDataset.trim().toLowerCase()
    if (!q) return runs
    return runs.filter((r) => r.datasetCID.toLowerCase().includes(q))
  }, [runs, filterDataset])

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ modelRuns: ModelRun[] }>("/model")
      setRuns(data.modelRuns ?? [])
    } catch {
      setRuns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const register = async () => {
    setBusy(true)
    try {
      const res = await apiPost<ModelRun>("/model/register", {
        datasetCID: datasetCID.trim(),
        modelArtifactCID: modelArtifactCID.trim(),
        trainingConfigHash: trainingConfigHash.trim(),
        trainingCodeHash: trainingCodeHash.trim(),
      })
      // refresh list to match server sort and show full fields
      await load()
      // clear
      setDatasetCID("")
      setModelArtifactCID("")
      setTrainingConfigHash("")
      setTrainingCodeHash("")
      // copy provenance hash for convenience
      if (res?.provenanceHash) navigator.clipboard.writeText(res.provenanceHash)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Register failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Models</h1>
        <p className="text-xs text-muted-foreground font-mono">Register and browse model runs (provenance hashes)</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-base font-mono uppercase tracking-wider">Register model run</CardTitle>
          <CardDescription className="text-xs font-mono">
            Stores dataset CID + artifact CID + hashes; server computes provenance hash.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Dataset CID</p>
              <Input className="font-mono" value={datasetCID} onChange={(e) => setDatasetCID(e.target.value)} placeholder="baga6ea4..." />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Model artifact CID</p>
              <Input className="font-mono" value={modelArtifactCID} onChange={(e) => setModelArtifactCID(e.target.value)} placeholder="baga6ea4..." />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Training config hash</p>
              <Input className="font-mono" value={trainingConfigHash} onChange={(e) => setTrainingConfigHash(e.target.value)} placeholder="0x..." />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Training code hash</p>
              <Input className="font-mono" value={trainingCodeHash} onChange={(e) => setTrainingCodeHash(e.target.value)} placeholder="0x..." />
            </div>
          </div>
          <Button
            className="font-mono uppercase bg-foreground text-background w-full"
            disabled={busy || !datasetCID.trim() || !modelArtifactCID.trim() || !trainingConfigHash.trim() || !trainingCodeHash.trim()}
            onClick={() => void register()}
          >
            {busy ? "Registering…" : "Register"}
          </Button>
          <p className="text-[10px] text-muted-foreground font-mono">
            Tip: after registering, provenance hash is copied automatically.
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-mono uppercase tracking-wider">Model runs</CardTitle>
            <CardDescription className="text-xs font-mono">Latest first</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input className="font-mono text-xs" value={filterDataset} onChange={(e) => setFilterDataset(e.target.value)} placeholder="Filter by dataset CID…" />
            <Button variant="outline" className="font-mono uppercase text-xs" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Time</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Dataset CID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Artifact CID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Provenance hash</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">No model runs</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="p-3">{formatDate(r.createdAt)}</td>
                      <td className="p-3" title={r.datasetCID}>{truncate(r.datasetCID, 14, 6)}</td>
                      <td className="p-3" title={r.modelArtifactCID}>{truncate(r.modelArtifactCID, 14, 6)}</td>
                      <td className="p-3" title={r.provenanceHash}>{truncate(r.provenanceHash, 14, 6)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(r.provenanceHash)}>
                          <Copy size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

