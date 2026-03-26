import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MermaidBlock } from "@/components/docs/mermaid-block"

const OVERVIEW_DIAGRAM = `flowchart LR
  subgraph Client
    UI[Dashboard / SDK]
  end
  subgraph API["Corpus API"]
    R[Routes]
    DS[Dataset service]
    TR[Treasury helper]
  end
  subgraph External
    M[(MongoDB)]
    F[Filecoin / Synapse]
    C[StorageTreasury]
  end
  UI --> R
  R --> DS
  DS --> TR
  DS --> M
  DS --> F
  TR --> C`

export default function DocsOverviewPage() {
  return (
    <article>
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
        Overview
      </p>
      <h1 className="text-3xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-4 mb-8">
        Corpus documentation
      </h1>
      <p className="text-sm leading-relaxed text-foreground/90 mb-6 max-w-2xl">
        Corpus is a stack for <strong>dataset storage on Filecoin</strong> (via Synapse), optional{" "}
        <strong>treasury-backed</strong> debits on-chain (USDFC + StorageTreasury), and{" "}
        <strong>model-run provenance</strong>. This site mirrors the structure of classic product docs:
        get started, agent skill file, contracts, pricing, and architecture.
      </p>

      <MermaidBlock chart={OVERVIEW_DIAGRAM} caption="High-level data plane" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
        <Link
          href="/docs/getting-started"
          className="group border-2 border-foreground p-5 hover:bg-foreground hover:text-background transition-colors"
        >
          <span className="text-[10px] uppercase tracking-widest text-[#ea580c] group-hover:text-background font-mono">
            Start here
          </span>
          <h2 className="text-lg font-bold uppercase mt-2 font-mono">Get started</h2>
          <p className="text-xs text-muted-foreground group-hover:text-background/80 mt-2">
            Human steps or compact agent reference — copy full markdown with one click.
          </p>
        </Link>
        <Link
          href="/docs/architecture"
          className="group border-2 border-foreground p-5 hover:bg-foreground hover:text-background transition-colors"
        >
          <span className="text-[10px] uppercase tracking-widest text-[#ea580c] group-hover:text-background font-mono">
            Deep dive
          </span>
          <h2 className="text-lg font-bold uppercase mt-2 font-mono">Architecture</h2>
          <p className="text-xs text-muted-foreground group-hover:text-background/80 mt-2">
            Sequence diagrams for upload flow, retries, and component graph.
          </p>
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline" className="font-mono uppercase text-xs">
          <Link href="/docs/skill">Agent skill (SKILL.md)</Link>
        </Button>
        <Button asChild variant="outline" className="font-mono uppercase text-xs">
          <Link href="/docs/contracts">Contracts</Link>
        </Button>
        <Button asChild variant="outline" className="font-mono uppercase text-xs">
          <Link href="/docs/pricing">Pricing</Link>
        </Button>
      </div>
    </article>
  )
}
