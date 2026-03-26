"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useTheme } from "next-themes"

type Props = { chart: string; caption?: string }

export function MermaidBlock({ chart, caption }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reactId = useId().replace(/:/g, "")
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    let cancelled = false
    setError(null)

    const run = async () => {
      try {
        const mermaid = (await import("mermaid")).default
        const isDark = resolvedTheme === "dark"
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: isDark ? "dark" : "neutral",
          themeVariables: isDark
            ? {
                primaryColor: "#292524",
                primaryTextColor: "#f5f5f4",
                primaryBorderColor: "#ea580c",
                lineColor: "#78716c",
                secondaryColor: "#ea580c",
                tertiaryColor: "#44403c",
              }
            : {
                primaryColor: "#f5f5f4",
                primaryTextColor: "#1c1917",
                primaryBorderColor: "#1c1917",
                lineColor: "#44403c",
                secondaryColor: "#ea580c",
                tertiaryColor: "#e7e5e4",
                background: "#fafaf9",
              },
          fontFamily: "var(--font-mono), ui-monospace, monospace",
        })
        if (!ref.current || cancelled) return
        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`
        const { svg } = await mermaid.render(id, chart.trim())
        if (!cancelled && ref.current) ref.current.innerHTML = svg
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram render failed")
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [chart, reactId, resolvedTheme])

  return (
    <figure className="my-10 border-2 border-foreground bg-muted/20 overflow-hidden">
      <div
        ref={ref}
        className="flex justify-center p-4 md:p-6 min-h-[200px] [&_svg]:max-w-full [&_svg]:h-auto"
        aria-label={caption || "Diagram"}
      />
      {error && (
        <div className="px-4 py-3 text-xs font-mono text-destructive border-t border-foreground">
          {error}
        </div>
      )}
      {caption && (
        <figcaption className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono px-4 py-2 border-t border-foreground bg-background/80">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
