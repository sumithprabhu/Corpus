import { MermaidBlock } from "@/components/docs/mermaid-block"

const UPLOAD_SEQUENCE = `sequenceDiagram
  participant Client
  participant API
  participant DatasetService
  participant Treasury
  participant Synapse
  participant DB

  Client->>API: POST /dataset/upload
  API->>DatasetService: uploadDataset
  opt Treasury configured
    DatasetService->>Treasury: getUserBalance
    Treasury-->>DatasetService: balance
  end
  DatasetService->>Synapse: upload
  Synapse-->>DatasetService: pieceCID
  opt Treasury configured
    DatasetService->>Treasury: recordAndDeduct
  end
  DatasetService->>DB: save metadata
  DatasetService-->>API: 201 + cid
  API-->>Client: pieceCID`

const RETRY_FLOW = `flowchart LR
  A["Startup / 60s tick"] --> B{"Treasury configured?"}
  B -->|No| Z[Skip]
  B -->|Yes| C{"Paused?"}
  C -->|Yes| Z
  C -->|No| D[Pending records]
  D --> E{"datasetExists?"}
  E -->|Yes| F[Remove stale pending]
  E -->|No| G[recordAndDeduct]`

const COMPONENTS = `flowchart TB
  subgraph Client
    FE[Next.js dashboard]
  end
  subgraph Backend["Express API"]
    R[Routes]
    DS[dataset.service]
    MS[model.service]
    SY[synapse.service]
    TH[treasury helper]
    RW[treasuryRetry]
  end
  subgraph External
    M[(MongoDB)]
    FIL[Filecoin / Synapse]
    SC[StorageTreasury]
  end
  FE --> R
  R --> DS
  R --> MS
  DS --> SY
  DS --> TH
  DS --> M
  RW --> TH
  TH --> SC
  SY --> FIL`

export default function ArchitecturePage() {
  return (
    <article>
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
        Architecture
      </p>
      <h1 className="text-2xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-4 mb-8">
        System design
      </h1>

      <p className="text-sm text-foreground/90 mb-8 max-w-2xl">
        Corpus is an Express + MongoDB control plane coordinating Synapse uploads and optional viem-driven
        calls to StorageTreasury. File bytes never land in Mongo—only metadata, hashes, and retry queues.
      </p>

      <h2 className="text-lg font-bold uppercase mb-2 border-l-4 border-[#ea580c] pl-3">
        Component graph
      </h2>
      <MermaidBlock chart={COMPONENTS} caption="Frontend, API, storage, chain" />

      <h2 className="text-lg font-bold uppercase mb-2 mt-12 border-l-4 border-[#ea580c] pl-3">
        Dataset upload sequence
      </h2>
      <MermaidBlock chart={UPLOAD_SEQUENCE} caption="Simplified happy path" />

      <h2 className="text-lg font-bold uppercase mb-2 mt-12 border-l-4 border-[#ea580c] pl-3">
        Treasury retry worker
      </h2>
      <MermaidBlock chart={RETRY_FLOW} caption="Reconciles pending onchain records" />

      <div className="mt-12 border-2 border-foreground p-5 text-xs font-mono text-muted-foreground space-y-3">
        <p>
          <span className="text-foreground font-bold uppercase">MongoDB</span> — users/API keys, dataset
          documents, pending treasury rows, model run registry.
        </p>
        <p>
          <span className="text-foreground font-bold uppercase">Executor wallet</span> — only actor that can
          call <code>recordAndDeduct</code>; must match configured private key.
        </p>
        <p>
          <span className="text-foreground font-bold uppercase">Minimum upload</span> — Synapse / piece-size
          floor (127 bytes) enforced before network upload.
        </p>
      </div>
    </article>
  )
}
