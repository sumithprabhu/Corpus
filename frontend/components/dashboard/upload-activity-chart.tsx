"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type DatasetLike = { uploadTimestamp?: string; createdAt: string }

function dayKey(iso: string) {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

export function UploadActivityChart({ datasets }: { datasets: DatasetLike[] }) {
  const data = useMemo(() => {
    const days = 14
    const labels: string[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(d.toISOString().slice(0, 10))
    }
    const counts = new Map<string, number>()
    for (const k of labels) counts.set(k, 0)
    for (const ds of datasets) {
      const k = dayKey(ds.uploadTimestamp || ds.createdAt)
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return labels.map((date) => ({
      date: date.slice(5),
      uploads: counts.get(date) ?? 0,
    }))
  }, [datasets])

  if (datasets.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">Upload data appears after first dataset</span>
      </div>
    )
  }

  return (
    <div className="h-48 w-full font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--foreground))" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--foreground))" }} width={28} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "2px solid hsl(var(--foreground))",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11,
            }}
            formatter={(v: number) => [`${v} uploads`, "Count"]}
            labelFormatter={(l) => `Day ${l}`}
          />
          <Bar dataKey="uploads" fill="#ea580c" radius={[0, 0, 0, 0]} stroke="hsl(var(--foreground))" strokeWidth={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
