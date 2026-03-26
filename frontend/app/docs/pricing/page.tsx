import { MermaidBlock } from "@/components/docs/mermaid-block"
import Link from "next/link"

const FLOW = `flowchart LR
  A[GET /dataset/prepare] --> B[debitPerUploadWei]
  A --> C[debitPerMonthWei]
  B --> D[Upload deduct]
  C --> E[Monthly storage accrual]`

export default function PricingDocPage() {
  return (
    <article>
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
        Pricing
      </p>
      <h1 className="text-2xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-4 mb-8">
        Plans & metering
      </h1>

      <p className="text-sm text-foreground/90 mb-6 max-w-2xl">
        Corpus pricing is <strong>usage-based</strong>: no seat fee for API access. You pay from a treasury
        balance in USDFC for per-upload debits and ongoing monthly storage. Exact wei values come from{" "}
        <code>GET /dataset/prepare</code>.
      </p>

      <MermaidBlock chart={FLOW} caption="How prepare maps to debits" />

      <div className="grid gap-6 mt-10">
        <section className="border-2 border-foreground">
          <div className="px-4 py-2 border-b-2 border-foreground bg-muted/30">
            <span className="text-[10px] uppercase tracking-widest font-mono">Starter</span>
          </div>
          <div className="p-5 text-sm">
            <p className="font-mono text-xs uppercase text-muted-foreground mb-2">$0 platform fee</p>
            <ul className="text-xs space-y-2 font-mono list-disc pl-4">
              <li>Dashboard + API key via wallet connect</li>
              <li>Unlimited API calls; pay only storage debits</li>
              <li>Named datasets, versioning, optional encryption</li>
              <li>Model run registration (provenance hashes)</li>
            </ul>
          </div>
        </section>

        <section className="border-2 border-foreground bg-foreground text-background">
          <div className="px-4 py-2 border-b-2 border-background/20">
            <span className="text-[10px] uppercase tracking-widest font-mono">Storage (pay as you go)</span>
          </div>
          <div className="p-5 text-sm text-background/90">
            <p className="text-xs font-mono mb-3">
              Treasury holds USDFC. Each upload triggers <strong>debitPerUploadWei</strong>; ongoing retention
              bills <strong>debitPerMonthWei</strong>. Deposit so balance covers at least the monthly debit.
            </p>
            <ul className="text-xs space-y-2 font-mono list-disc pl-4 text-background/80">
              <li>402 <code className="text-[#ea580c]">INSUFFICIENT_STORAGE_BALANCE</code> if underfunded</li>
              <li>Compression applied when it saves space</li>
              <li>Dashboard: deposit + balance views</li>
            </ul>
          </div>
        </section>

        <section className="border-2 border-foreground">
          <div className="px-4 py-2 border-b-2 border-foreground bg-muted/30">
            <span className="text-[10px] uppercase tracking-widest font-mono">Developers</span>
          </div>
          <div className="p-5 text-sm flex flex-col gap-3">
            <p className="text-xs font-mono text-muted-foreground">
              REST + <code>corpus-sdk</code>; this documentation site for integration patterns.
            </p>
            <Link
              href="/docs/getting-started"
              className="inline-flex w-fit text-xs font-mono uppercase tracking-wider underline decoration-[#ea580c]"
            >
              Open get started →
            </Link>
          </div>
        </section>
      </div>
    </article>
  )
}
