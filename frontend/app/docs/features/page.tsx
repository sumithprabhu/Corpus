export default function FeaturesPage() {
  return (
    <article>
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-mono mb-2">
        Features
      </p>
      <h1 className="text-2xl font-bold tracking-tight uppercase border-b-2 border-foreground pb-4 mb-8">
        Feature reference
      </h1>

      {/* Dataset Lifecycle */}
      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        Dataset lifecycle
      </h2>
      <div className="space-y-4 mb-12">
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Upload</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">POST /dataset/upload</code> — optional AES-256-GCM encryption,
            treasury balance check, Synapse upload to Filecoin, <code className="bg-muted px-1">recordAndDeduct</code> on-chain.
            Returns a piece CID that becomes the permanent, canonical identifier.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Named datasets</p>
          <p className="text-muted-foreground">
            Give a dataset a name (e.g. <code className="bg-muted px-1">railway-v1</code>). Names are unique per wallet.
            Uploading to the same name creates versioned history — each version stored on Filecoin with its own CID.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Versioning</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">POST /dataset/by-name/:name/version</code> adds a new version and sets it as default.{" "}
            <code className="bg-muted px-1">GET /dataset/by-name/:name/versions</code> lists the full history.
            Every version is immutably stored on Filecoin — addressed by CID forever.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Download</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">GET /dataset/:cid</code> returns the file, auto-decrypting if needed.
            Append <code className="bg-muted px-1">?metadata=1</code> for metadata only.
            <code className="bg-muted px-1">/raw</code> returns unprocessed bytes straight from Filecoin.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Delete</p>
          <p className="text-muted-foreground">
            Removes the dataset from the API. Data on Filecoin is immutable — the CID is simply no longer served.
            Use <code className="bg-muted px-1">DELETE /dataset/by-name/:name</code> to remove all versions.
          </p>
        </div>
      </div>

      {/* Access Control */}
      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        Access control (ACL)
      </h2>
      <div className="space-y-4 mb-12">
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Share</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">POST /dataset/:cid/share</code> — grants read access to another wallet address.
            Shared users can download; they cannot re-share or delete.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Revoke</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">DELETE /dataset/:cid/share/:walletAddress</code> — immediately revokes access.
            Subsequent requests from the revoked wallet return 403.
          </p>
        </div>
      </div>

      {/* Model Provenance */}
      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        Model provenance
      </h2>
      <div className="space-y-4 mb-12">
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Register model run</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">POST /model/register</code> — takes <code className="bg-muted px-1">datasetCID</code>,{" "}
            <code className="bg-muted px-1">modelArtifactCID</code>, <code className="bg-muted px-1">trainingConfigHash</code>,{" "}
            <code className="bg-muted px-1">trainingCodeHash</code>. Backend computes{" "}
            <code className="bg-muted px-1">provenanceHash = keccak256(...)</code> and submits a self-send on-chain
            transaction with the hash as calldata — an immutable, timestamped anchor on Filecoin.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Verify provenance</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">GET /model/:provenanceHash</code> — returns the full run record including{" "}
            <code className="bg-muted px-1">anchorStatus</code> (none → pending → anchored) and{" "}
            <code className="bg-muted px-1">anchorTxHash</code>. Anyone can verify lineage on-chain.
          </p>
        </div>
      </div>

      {/* Treasury & Billing */}
      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        Treasury &amp; billing
      </h2>
      <div className="space-y-4 mb-12">
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">USDFC deposits</p>
          <p className="text-muted-foreground">
            Users deposit USDFC to the StorageTreasury contract on Filecoin Calibration.
            The executor wallet calls <code className="bg-muted px-1">recordAndDeduct</code> atomically on every upload.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Cost preview</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">GET /dataset/prepare</code> — returns <code className="bg-muted px-1">debitPerUploadWei</code> and{" "}
            <code className="bg-muted px-1">debitPerMonthWei</code> before committing to an upload.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Monthly billing worker</p>
          <p className="text-muted-foreground">
            A background worker runs monthly debit sweeps across all active datasets.
            Wallets with insufficient balance see their datasets expire. Check status via{" "}
            <code className="bg-muted px-1">GET /billing/status</code>.
          </p>
        </div>
      </div>

      {/* API Key Management */}
      <h2 className="text-lg font-bold uppercase mb-4 border-l-4 border-[#ea580c] pl-3">
        API key management
      </h2>
      <div className="space-y-4 mb-4">
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Create &amp; rotate</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">POST /user/keys</code> — create additional named API keys.
            Use separate keys for dev and prod environments. Each key has a prefix shown in the dashboard.
          </p>
        </div>
        <div className="border-2 border-foreground p-4 text-xs font-mono">
          <p className="text-foreground font-bold uppercase mb-1">Revoke</p>
          <p className="text-muted-foreground">
            <code className="bg-muted px-1">DELETE /user/keys/:id</code> — revoked keys return 401 immediately.
            Revoke any leaked key without affecting other keys tied to the same wallet.
          </p>
        </div>
      </div>
    </article>
  )
}
