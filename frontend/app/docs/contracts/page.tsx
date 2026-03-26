import { MermaidBlock } from "@/components/docs/mermaid-block"

const ACCESS_DIAGRAM = `flowchart TB
  subgraph Users
    U[EOA]
  end
  subgraph StorageTreasury
    D[deposit / withdraw]
    R[recordAndDeduct — executor only]
  end
  U --> D
  Backend[Corpus executor wallet] --> R`

export default function ContractsDocPage() {
  return (
    <article>
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
        Contracts
      </p>
      <h1 className="text-2xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-4 mb-8">
        On-chain references
      </h1>
      <p className="text-sm text-foreground/90 mb-8 max-w-2xl">
        Production accounting uses <strong>StorageTreasury</strong> on Filecoin Calibration. Hardhat
        packages also ship <strong>DatasetRegistry</strong> and <strong>ModelRegistry</strong> for optional
        lightweight metadata; wire addresses in the backend when deployed.
      </p>

      <MermaidBlock chart={ACCESS_DIAGRAM} caption="Who calls what on StorageTreasury" />

      <h2 className="text-lg font-bold uppercase mt-12 mb-4 border-l-4 border-[#ea580c] pl-3">
        StorageTreasury + USDFC (Calibration)
      </h2>
      <div className="overflow-x-auto border-2 border-foreground mb-10">
        <table className="w-full text-xs font-mono">
          <thead className="border-b-2 border-foreground bg-muted/50">
            <tr>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                Item
              </th>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                Detail
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">Network</td>
              <td className="p-3">Filecoin Calibration · chain id 314159</td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">RPC</td>
              <td className="p-3">
                <code className="break-all">https://api.calibration.node.glif.io/rpc/v1</code>
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">StorageTreasury</td>
              <td className="p-3 break-all">
                <code>0x85c8629306c1976C1F3635288a6fE9BBFA4453ED</code>
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">USDFC token</td>
              <td className="p-3 break-all">
                <code>0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0</code>
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">User flows</td>
              <td className="p-3">
                <code>approve</code> USDFC → <code>deposit(amount)</code>; <code>withdraw(amount)</code> to exit
                internal balance
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">Executor</td>
              <td className="p-3">
                Backend wallet calls <code>recordAndDeduct(user, cid, cost, size, datasetHash)</code> after
                Filecoin upload succeeds
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">Safety</td>
              <td className="p-3">OpenZeppelin Ownable, Pausable, ReentrancyGuard; CID length 1–96 bytes</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        DatasetRegistry & ModelRegistry (Hardhat)
      </h2>
      <div className="overflow-x-auto border-2 border-foreground">
        <table className="w-full text-xs font-mono">
          <thead className="border-b-2 border-foreground bg-muted/50">
            <tr>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest">Contract</th>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest">Role</th>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest">Notable entrypoints</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">DatasetRegistry</td>
              <td className="p-3">Optional CID / version graph on-chain</td>
              <td className="p-3">
                <code>registerDataset</code>, <code>registerDatasetVersion</code>, <code>getDataset</code>
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="p-3 font-bold">ModelRegistry</td>
              <td className="p-3">Register model runs with hashes + CIDs</td>
              <td className="p-3">
                <code>registerModelRun</code>, <code>getModelRun</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Deploy with Hardhat, then set <code>DATASET_REGISTRY_ADDRESS</code> and{" "}
        <code>MODEL_REGISTRY_ADDRESS</code> in the backend environment if you use them.
      </p>
    </article>
  )
}
