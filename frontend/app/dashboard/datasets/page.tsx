"use client"

import { Suspense } from "react"
import { DatasetsPageContent } from "./datasets-content"

function Fallback() {
  return (
    <div className="p-6 text-xs font-mono text-muted-foreground uppercase tracking-widest">
      Loading…
    </div>
  )
}

export default function DatasetsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DatasetsPageContent />
    </Suspense>
  )
}
