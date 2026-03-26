"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getApiKey, apiGet, apiPost, apiDelete } from "@/lib/api"
import { Copy, BookOpen, Plus, Trash2 } from "lucide-react"

type ApiKeyRow = {
  id: string
  name?: string
  prefix: string
  createdAt: string
  lastUsed?: string
  revokedAt?: string
}

function formatDate(iso: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" })
  } catch {
    return iso
  }
}

export default function SecurityPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const key = getApiKey()
    if (!key) return
    setLoading(true)
    try {
      const data = await apiGet<{ keys?: ApiKeyRow[] }>("/user/keys")
      setKeys((data.keys ?? []).filter((k) => !k.revokedAt))
    } catch {
      const k = getApiKey()
      if (k) {
        setKeys([
          {
            id: "current",
            name: "Primary",
            prefix: k.slice(0, 16),
            createdAt: "",
          },
        ])
      } else setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const copyFullKey = () => {
    const k = getApiKey()
    if (k) navigator.clipboard.writeText(k)
  }

  const createKey = async () => {
    setBusy(true)
    try {
      const res = await apiPost<{ key?: string }>("/user/keys", { name: newKeyName || "API Key" })
      if (res.key) setCreatedKey(res.key)
      setNewKeyName("")
      setCreateOpen(false)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create key failed")
    } finally {
      setBusy(false)
    }
  }

  const revokeKey = async (id: string) => {
    if (!id || id === "current") return
    setBusy(true)
    try {
      await apiDelete(`/user/keys/${id}`)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Revoke failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold tracking-tight uppercase mb-1">Security & access</h1>
        <p className="text-xs text-muted-foreground font-mono">API key tied to your wallet</p>
      </div>

      <Card className="border-2 border-foreground">
        <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base font-mono uppercase tracking-wider">API keys</CardTitle>
            <CardDescription className="text-xs font-mono">
              Keys are tied to your wallet. Use separate keys for dev/prod and revoke when leaked.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="font-mono uppercase bg-foreground text-background"
              onClick={() => setCreateOpen(true)}
              disabled={busy}
            >
              <Plus size={14} className="mr-2" />
              Create API key
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="font-mono uppercase border-2 border-foreground"
              onClick={() => setInfoOpen(true)}
            >
              <BookOpen size={14} className="mr-2" />
              How keys work
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Key name</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Prefix</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Created</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Last used</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">Loading…</td></tr>
                ) : keys.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">Connect via login to receive an API key.</td></tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="border-b border-border">
                      <td className="p-3">{k.name || "—"}</td>
                      <td className="p-3 font-mono">{k.prefix}…</td>
                      <td className="p-3">{k.createdAt ? formatDate(k.createdAt) : "Login"}</td>
                      <td className="p-3">{k.lastUsed ? formatDate(k.lastUsed) : "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyFullKey} title="Copy full API key">
                            <Copy size={12} />
                          </Button>
                          {k.name !== "Primary" && k.id !== "current" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => void revokeKey(k.id)}
                              title="Revoke key"
                              disabled={busy}
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
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
          <CardTitle className="text-base font-mono uppercase tracking-wider">API usage</CardTitle>
          <CardDescription className="text-xs font-mono">Request metrics when telemetry is enabled</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Requests today</p>
            <p className="text-lg font-mono font-bold">—</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Requests this month</p>
            <p className="text-lg font-mono font-bold">—</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Rate limit status</p>
            <p className="text-lg font-mono font-bold">OK</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">API keys</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              Your <strong className="text-foreground">x-api-key</strong> is created when you connect your wallet on the login page.
              Store it like a secret; it grants full access to your datasets and treasury reads for that wallet.
            </p>
            <p>
              To use a fresh key today, sign out / clear site data for this origin and connect again — the backend will return the same key for the same wallet.
            </p>
            <Button asChild variant="outline" className="w-full font-mono uppercase border-2 border-foreground mt-2">
              <Link href="/docs/getting-started">Open documentation</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Create API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Key name</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production"
                className="font-mono"
              />
            </div>
            <Button className="w-full font-mono uppercase" onClick={() => void createKey()} disabled={busy}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="font-mono border-2 border-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Copy your key</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">
            This is the only time you will see the full key. Store it securely.
          </p>
          {createdKey && (
            <div className="flex gap-2">
              <Input readOnly value={createdKey} className="font-mono text-xs" />
              <Button size="sm" onClick={() => navigator.clipboard.writeText(createdKey)}><Copy size={14} /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
