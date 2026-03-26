"use client"

import { useCallback, useState } from "react"
import { Copy, Check } from "lucide-react"
import { DocsMarkdown } from "@/components/docs/docs-markdown"
import { Button } from "@/components/ui/button"
import { CORPUS_SKILL_MD } from "@/lib/docs/skill-content"

export default function SkillDocPage() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CORPUS_SKILL_MD)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [])

  return (
    <article>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 border-b-2 border-foreground pb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
            Agent skill
          </p>
          <h1 className="text-2xl font-bold tracking-tight uppercase">SKILL.md</h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Drop this into your agent instructions or <code className="text-[#ea580c]">.cursor/skills</code>{" "}
            style workflow. Copy the raw file for versioning in your repo.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono uppercase text-xs border-2 border-foreground shrink-0"
          onClick={() => void copy()}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy SKILL.md
            </>
          )}
        </Button>
      </div>

      <DocsMarkdown source={CORPUS_SKILL_MD} />
    </article>
  )
}
