"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { API_BASE } from "@/lib/api"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ChevronDown,
  ChevronRight,
  Play,
  Terminal,
  RotateCcw,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "done" | "error" | "skipped"

interface StepResult {
  status: StepStatus
  request?: unknown
  response?: unknown
  duration?: number
  error?: string
  note?: string
}

interface DemoStep {
  id: string
  label: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  endpoint: string
  description: string
}

// ── Steps definition ──────────────────────────────────────────────────

const STEPS: DemoStep[] = [
  {
    id: "health",
    label: "API Health Check",
    method: "GET",
    endpoint: "/health",
    description: "Verify the API is live and responding",
  },
  {
    id: "prepare",
    label: "Storage Cost Check",
    method: "GET",
    endpoint: "/dataset/prepare",
    description: "Fetch cost-per-upload and cost-per-month from the treasury",
  },
  {
    id: "upload",
    label: "Upload Dataset → Filecoin",
    method: "POST",
    endpoint: "/dataset/upload",
    description: "Compress, encrypt (optional), store on Filecoin via Synapse, record on-chain",
  },
  {
    id: "list",
    label: "List All Datasets",
    method: "GET",
    endpoint: "/dataset",
    description: "Enumerate every dataset version owned by this API key",
  },
  {
    id: "metadata",
    label: "Dataset Metadata",
    method: "GET",
    endpoint: "/dataset/:cid?metadata=1",
    description: "CID, size, keccak256 hash, storage cost, compression & encryption flags",
  },
  {
    id: "download",
    label: "Download File from Filecoin",
    method: "GET",
    endpoint: "/dataset/:cid",
    description: "Retrieve raw bytes — decompress and decrypt automatically",
  },
  {
    id: "model",
    label: "Register Model Provenance",
    method: "POST",
    endpoint: "/model/register",
    description: "Compute SHA-256 provenanceHash; submit on-chain anchor tx in background",
  },
  {
    id: "provenance",
    label: "Verify Provenance Record",
    method: "GET",
    endpoint: "/model/:provenanceHash",
    description: "Look up model run with anchor status and on-chain tx hash",
  },
  {
    id: "treasury",
    label: "Treasury Balance",
    method: "GET",
    endpoint: "/treasury/balance",
    description: "Read USDFC balance from the StorageTreasury smart contract",
  },
]

// ── Helpers ───────────────────────────────────────────────────────────

function methodColor(m: string) {
  if (m === "POST") return "text-orange-500 border-orange-500"
  if (m === "DELETE") return "text-red-500 border-red-500"
  if (m === "PUT") return "text-yellow-500 border-yellow-500"
  return "text-emerald-500 border-emerald-500"
}

function formatDuration(ms?: number) {
  if (ms == null) return ""
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function fmtJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function now() {
  return new Date().toLocaleTimeString("en-US", { hour12: false })
}

// ── StatusIcon ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
  if (status === "error")
    return <XCircle size={15} className="text-red-500 shrink-0" />
  if (status === "running")
    return <Loader2 size={15} className="animate-spin text-[hsl(var(--accent))] shrink-0" />
  if (status === "skipped")
    return <Circle size={15} className="text-muted-foreground shrink-0" />
  return <Circle size={15} className="text-border shrink-0" />
}

// ── StepCard ──────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  result,
}: {
  step: DemoStep
  index: number
  result: StepResult
}) {
  const [expanded, setExpanded] = useState(false)
  const status = result.status

  // Auto-expand when done or error
  useEffect(() => {
    if (status === "done" || status === "error") setExpanded(true)
  }, [status])

  const isActive = status !== "idle"
  const hasDetail = status === "done" || status === "error"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={`border-2 transition-colors duration-300 overflow-hidden ${
        status === "running"
          ? "border-[hsl(var(--accent))]"
          : status === "done"
          ? "border-foreground"
          : status === "error"
          ? "border-red-500"
          : "border-border"
      }`}
    >
      {/* Step header */}
      <div
        className={`flex items-start gap-3 p-4 ${hasDetail ? "cursor-pointer select-none" : ""}`}
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        {/* Number */}
        <span
          className={`text-[10px] font-mono tracking-widest shrink-0 mt-[2px] ${
            isActive ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Method badge */}
            <span
              className={`text-[9px] font-mono tracking-widest border px-1.5 py-0.5 shrink-0 ${methodColor(
                step.method
              )}`}
            >
              {step.method}
            </span>
            {/* Endpoint */}
            <code className="text-[10px] font-mono text-muted-foreground truncate">
              {step.endpoint}
            </code>
          </div>
          <p
            className={`text-xs font-mono mt-1 uppercase tracking-wider font-semibold ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {step.label}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 leading-relaxed">
            {step.description}
          </p>

          {/* Running note */}
          {status === "running" && step.id === "upload" && (
            <p className="text-[10px] font-mono text-[hsl(var(--accent))] mt-1 animate-pulse">
              ⚡ Writing to Filecoin — may take 2–5 min due to on-chain TX
            </p>
          )}
          {status === "running" && step.id !== "upload" && (
            <p className="text-[10px] font-mono text-[hsl(var(--accent))] mt-1 animate-pulse">
              Executing…
            </p>
          )}

          {/* Duration / error summary */}
          {status === "done" && result.duration != null && (
            <p className="text-[10px] font-mono text-emerald-500 mt-1">
              ✓ Completed in {formatDuration(result.duration)}
              {result.note && (
                <span className="text-muted-foreground"> — {result.note}</span>
              )}
            </p>
          )}
          {status === "error" && (
            <p className="text-[10px] font-mono text-red-500 mt-1">✗ {result.error}</p>
          )}
        </div>

        {/* Status icon + expand toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusIcon status={status} />
          {hasDetail && (
            <span className="text-muted-foreground">
              {expanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-border">
              {result.request != null && (
                <div className="border-b border-border">
                  <div className="px-4 py-2 bg-muted/30">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                      Request
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono p-4 text-muted-foreground leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                    {fmtJson(result.request)}
                  </pre>
                </div>
              )}
              <div>
                <div className="px-4 py-2 bg-muted/30">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    Response
                  </span>
                </div>
                <pre
                  className={`text-[10px] font-mono p-4 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap break-all ${
                    status === "error" ? "text-red-400" : "text-foreground"
                  }`}
                >
                  {status === "error"
                    ? result.error
                    : fmtJson(result.response)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Log panel ─────────────────────────────────────────────────────────

function LogPanel({ logs }: { logs: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="border-2 border-foreground h-full flex flex-col">
      <div className="border-b-2 border-foreground px-4 py-3 flex items-center gap-2 bg-muted/20 shrink-0">
        <Terminal size={12} />
        <span className="text-[10px] font-mono uppercase tracking-widest">Live Log</span>
      </div>
      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-background/50 min-h-0"
        style={{ fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}
      >
        {logs.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">
            {">"} Corpus E2E Demo v1.0
            <br />
            {">"} Enter your API key and press EXECUTE.
            <br />
            {">"} _
          </p>
        ) : (
          logs.map((line, i) => (
            <p
              key={i}
              className={`text-[10px] leading-relaxed ${
                line.startsWith("✓")
                  ? "text-emerald-500"
                  : line.startsWith("✗")
                  ? "text-red-400"
                  : line.startsWith("⚡")
                  ? "text-[hsl(var(--accent))]"
                  : line.startsWith("──")
                  ? "text-foreground/40"
                  : "text-muted-foreground"
              }`}
            >
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Demo Page ────────────────────────────────────────────────────

export default function DemoPage() {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_DEMO_API_KEY ?? "")
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<Record<string, StepResult>>(
    () => Object.fromEntries(STEPS.map((s) => [s.id, { status: "idle" }]))
  )
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev, `[${now()}] ${line}`])
  }, [])

  const setResult = useCallback((id: string, r: Partial<StepResult>) => {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...r } }))
  }, [])

  const reset = () => {
    setRunning(false)
    setDone(false)
    setProgress(0)
    setLogs([])
    setResults(Object.fromEntries(STEPS.map((s) => [s.id, { status: "idle" }])))
  }

  async function runStep<T>(
    id: string,
    fn: () => Promise<{ req?: unknown; res: T; note?: string }>
  ): Promise<T> {
    setResult(id, { status: "running" })
    const t0 = Date.now()
    try {
      const { req, res, note } = await fn()
      const duration = Date.now() - t0
      setResult(id, { status: "done", request: req, response: res, duration, note })
      addLog(`✓  ${STEPS.find((s) => s.id === id)?.label} (${formatDuration(duration)})`)
      return res
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e)
      setResult(id, { status: "error", error, duration: Date.now() - t0 })
      addLog(`✗  ${STEPS.find((s) => s.id === id)?.label}: ${error}`)
      throw e
    }
  }

  const execute = async () => {
    if (!apiKey.trim()) return
    reset()
    setRunning(true)
    addLog("── Starting Corpus end-to-end demo ──")
    addLog(`⚡ API base: ${API_BASE}`)

    const key = apiKey.trim()
    const headers = { "x-api-key": key }
    const total = STEPS.length
    let step = 0

    let uploadedCID = ""
    let provenanceHash = ""
    const datasetName = `demo-${Date.now()}`

    try {
      // ── 01 Health ─────────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      await runStep("health", async () => {
        const res = await fetch(`${API_BASE}/health`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return { res: data }
      })

      // ── 02 Prepare ────────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      await runStep("prepare", async () => {
        const res = await fetch(`${API_BASE}/dataset/prepare`, { headers })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
        const data = await res.json()
        return {
          res: {
            success: data.success,
            debitPerUploadWei: data.debitPerUploadWei,
            debitPerMonthWei: data.debitPerMonthWei,
          },
          note: `${BigInt(data.debitPerUploadWei) / BigInt(1e15)} mUSDFC / upload`,
        }
      })

      // ── 03 Upload ─────────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      addLog(`⚡  Uploading to Filecoin — on-chain TX may take 2–5 min…`)
      const fileContent = [
        "# Corpus Live Demo Dataset",
        `Generated: ${new Date().toISOString()}`,
        `Name: ${datasetName}`,
        `Demo: Corpus end-to-end API walkthrough`,
        `Stack: Filecoin + Synapse + StorageTreasury`,
        "Data: 0x" + "cafebabe".repeat(24),
      ]
        .join("\n")
        .padEnd(512, "\n")

      const req03 = { name: datasetName, file: "<256-byte text blob>" }
      const cid = await runStep("upload", async () => {
        const form = new FormData()
        form.append("file", new Blob([fileContent], { type: "text/plain" }), "corpus-demo.txt")
        form.append("name", datasetName)
        const res = await fetch(`${API_BASE}/dataset/upload`, {
          method: "POST",
          headers, // no Content-Type — browser sets it with boundary
          body: form,
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(d.error || res.statusText)
        }
        const data = await res.json()
        uploadedCID = data.cid
        return { req: req03, res: data, note: data.cid.slice(0, 20) + "…" }
      })
      addLog(`⚡  CID: ${(cid as { cid: string }).cid}`)

      // ── 04 List ───────────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      await runStep("list", async () => {
        const res = await fetch(`${API_BASE}/dataset`, { headers })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
        const data = await res.json()
        const total = data.datasets?.length ?? 0
        const preview = (data.datasets ?? []).slice(0, 3).map((d: { cid: string; name?: string; createdAt: string; compressed?: boolean }) => ({
          cid: d.cid,
          name: d.name ?? "(unnamed)",
          createdAt: d.createdAt,
          compressed: d.compressed,
        }))
        return {
          res: { success: true, total, showing: Math.min(3, total), datasets: preview },
          note: `${total} dataset${total !== 1 ? "s" : ""} total`,
        }
      })

      // ── 05 Metadata ───────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      if (uploadedCID) {
        await runStep("metadata", async () => {
          const res = await fetch(`${API_BASE}/dataset/${encodeURIComponent(uploadedCID)}?metadata=1`, { headers })
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
          const data = await res.json()
          return {
            res: data,
            note: `${data.sizeInBytes ?? "—"} bytes, hash: ${data.datasetHash?.slice(0, 12) ?? "—"}…`,
          }
        })
      } else {
        setResult("metadata", { status: "skipped", note: "no CID from upload" })
        addLog("⚠  metadata: skipped (no CID)")
      }

      // ── 06 Download ───────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      if (uploadedCID) {
        await runStep("download", async () => {
          const res = await fetch(`${API_BASE}/dataset/${encodeURIComponent(uploadedCID)}`, { headers })
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as {error?: string}).error || res.statusText) }
          const buf = await res.arrayBuffer()
          return {
            res: { bytes: buf.byteLength, preview: new TextDecoder().decode(buf.slice(0, 120)) + "…" },
            note: `${buf.byteLength} bytes retrieved`,
          }
        })
      } else {
        setResult("download", { status: "skipped" })
        addLog("⚠  download: skipped (no CID)")
      }

      // ── 07 Model Register ─────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      const modelPayload = {
        datasetCID: uploadedCID || "bafk_demo_cid",
        modelArtifactCID: "bafkdemo_artifact_" + Date.now(),
        trainingConfigHash: "0x" + "a1b2c3d4".repeat(8),
        trainingCodeHash: "0x" + "e5f60718".repeat(8),
      }
      const modelRes = await runStep("model", async () => {
        const res = await fetch(`${API_BASE}/model/register`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(modelPayload),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
        const data = await res.json()
        provenanceHash = data.provenanceHash
        return {
          req: modelPayload,
          res: data,
          note: `anchorStatus: ${data.anchorStatus ?? "—"}`,
        }
      })
      addLog(`⚡  provenanceHash: ${(modelRes as { provenanceHash?: string }).provenanceHash?.slice(0, 20)}…`)
      if ((modelRes as { anchorTxHash?: string }).anchorTxHash) {
        addLog(`⚡  anchorTxHash: ${(modelRes as { anchorTxHash?: string }).anchorTxHash?.slice(0, 20)}…`)
      }

      // ── 08 Provenance lookup ──────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      if (provenanceHash) {
        await runStep("provenance", async () => {
          const res = await fetch(`${API_BASE}/model/${provenanceHash}`, { headers })
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
          const data = await res.json()
          return { res: data, note: `anchorStatus: ${data.anchorStatus}` }
        })
      } else {
        setResult("provenance", { status: "skipped" })
        addLog("⚠  provenance: skipped (no provenanceHash)")
      }

      // ── 09 Treasury ───────────────────────────────────────────
      step++; setProgress(Math.round((step / total) * 100))
      await runStep("treasury", async () => {
        const res = await fetch(`${API_BASE}/treasury/balance`, { headers })
        if (res.status === 503) return { res: { message: "Treasury not configured (503)" }, note: "not configured" }
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
        const data = await res.json()
        const wei = BigInt(data.balance || "0")
        const fmt = wei >= BigInt(1e18) ? `${Number(wei) / 1e18} USDFC` : `${wei} wei`
        return { res: data, note: fmt }
      })

      addLog("── Demo complete ✓ ──")
      setDone(true)
    } catch {
      addLog("── Demo stopped due to error ──")
    } finally {
      setRunning(false)
      setProgress(100)
    }
  }

  const completedCount = Object.values(results).filter((r) => r.status === "done").length
  const errorCount = Object.values(results).filter((r) => r.status === "error").length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 px-4 pt-6 pb-12 lg:px-6 overflow-x-hidden">
        <div className="max-w-[80%] mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-3">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {"// CORPUS:"}
            </span>
            <div className="flex-1 border-t border-border" />
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${
                running
                  ? "text-[hsl(var(--accent))]"
                  : done
                  ? "text-emerald-500"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  running
                    ? "bg-[hsl(var(--accent))] animate-pulse"
                    : done
                    ? "bg-emerald-500"
                    : "bg-muted-foreground"
                }`}
              />
              {running ? "RUNNING" : done ? "COMPLETE" : "READY"}
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold font-mono uppercase tracking-tight mb-2">
            Live API Demo
          </h1>
          <p className="text-sm text-muted-foreground font-mono max-w-2xl">
            Watch a full dataset lifecycle execute against the live Corpus API — upload to
            Filecoin, retrieve, register model provenance, and verify the on-chain anchor.
          </p>
        </motion.div>

        {/* API key input + controls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="border-2 border-foreground p-5 mb-8"
        >
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-2">
            API Key
          </label>
          <div className="flex flex-row gap-3 items-stretch">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="corpus_xxxxxxxxxxxxxxxx"
              disabled={running}
              className="flex-1 min-w-0 border-2 border-foreground bg-background px-3 py-2 text-xs font-mono tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex gap-2 shrink-0">
              {done || errorCount > 0 ? (
                <motion.button
                  onClick={reset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 border-2 border-foreground bg-background text-foreground px-5 py-2 text-xs font-mono tracking-widest uppercase"
                >
                  <RotateCcw size={12} />
                  Reset
                </motion.button>
              ) : null}
              <motion.button
                onClick={execute}
                disabled={running || !apiKey.trim()}
                whileHover={!running && apiKey.trim() ? { scale: 1.02 } : {}}
                whileTap={!running && apiKey.trim() ? { scale: 0.97 } : {}}
                className="flex items-center gap-2 bg-foreground text-background px-5 py-2 text-xs font-mono tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    Execute
                  </>
                )}
              </motion.button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
            Your API key from{" "}
            <a href="/dashboard/security" className="underline hover:text-foreground transition-colors">
              Dashboard → Security
            </a>
            . Not stored — used only for this session.
          </p>

          {/* Progress bar */}
          {(running || done || errorCount > 0) && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Progress
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {completedCount}/{STEPS.length} steps
                  {errorCount > 0 && (
                    <span className="text-red-400"> · {errorCount} error</span>
                  )}
                </span>
              </div>
              <div className="h-1 bg-muted w-full overflow-hidden">
                <motion.div
                  className={`h-full ${done ? "bg-emerald-500" : "bg-[hsl(var(--accent))]"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Main layout: steps + log */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Steps column */}
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                result={results[step.id]}
              />
            ))}

            {/* Completion banner */}
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="border-2 border-emerald-500 p-5"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-500">
                        Demo Complete
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {completedCount} steps executed successfully. Dataset uploaded to Filecoin, model
                        provenance anchored on-chain, treasury queried.
                      </p>
                      <div className="flex gap-3 mt-3">
                        <a href="/dashboard/datasets">
                          <motion.span
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-block bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-widest uppercase"
                          >
                            View Datasets →
                          </motion.span>
                        </a>
                        <a href="/dashboard/models">
                          <motion.span
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-block border-2 border-foreground px-4 py-2 text-[10px] font-mono tracking-widest uppercase"
                          >
                            View Models →
                          </motion.span>
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Log column (sticky on desktop) */}
          <div className="lg:sticky lg:top-6 self-start h-[520px] lg:h-[calc(100vh-8rem)]">
            <LogPanel logs={logs} />
          </div>
        </div>

        {/* API reference footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 border-t-2 border-border pt-8"
        >
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
            {"// API ENDPOINTS USED IN THIS DEMO"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="border border-border p-3 flex items-center gap-3"
              >
                <span
                  className={`text-[9px] font-mono border px-1.5 py-0.5 shrink-0 ${methodColor(
                    s.method
                  )}`}
                >
                  {s.method}
                </span>
                <code className="text-[10px] font-mono text-muted-foreground truncate">
                  {s.endpoint}
                </code>
              </div>
            ))}
          </div>
        </motion.div>
        </div>{/* end max-w-[80%] wrapper */}
      </div>
    </div>
  )
}
