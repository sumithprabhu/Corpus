"use client"

import { useState, useCallback } from "react"
import { Copy, Check } from "lucide-react"
import { DocsMarkdown } from "@/components/docs/docs-markdown"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  GET_STARTED_HUMAN_MD,
  GET_STARTED_AGENTS_MD,
  getGettingStartedMarkdown,
  type GettingStartedAudience,
} from "@/lib/docs/getting-started-content"

export default function GettingStartedPage() {
  const [audience, setAudience] = useState<GettingStartedAudience>("human")
  const [copied, setCopied] = useState(false)

  const md = audience === "human" ? GET_STARTED_HUMAN_MD : GET_STARTED_AGENTS_MD

  const copyAll = useCallback(async () => {
    const text = getGettingStartedMarkdown(audience)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [audience])

  return (
    <article>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 border-b-2 border-foreground pb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
            Get started
          </p>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Onboarding</h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Switch between explanations for people and terse instructions for agents. Copy exports
            the full markdown for the active mode.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          <ToggleGroup
            type="single"
            value={audience}
            onValueChange={(v) => v && setAudience(v as GettingStartedAudience)}
            className="border-2 border-foreground p-1"
          >
            <ToggleGroupItem
              value="human"
              aria-label="Human"
              className="px-4 py-2 text-xs font-mono uppercase data-[state=on]:bg-foreground data-[state=on]:text-background"
            >
              Human
            </ToggleGroupItem>
            <ToggleGroupItem
              value="agents"
              aria-label="Agents"
              className="px-4 py-2 text-xs font-mono uppercase data-[state=on]:bg-foreground data-[state=on]:text-background"
            >
              Agents
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-mono uppercase text-xs border-2 border-foreground"
            onClick={() => void copyAll()}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy all as markdown
              </>
            )}
          </Button>
        </div>
      </div>

      <DocsMarkdown source={md} />
    </article>
  )
}
