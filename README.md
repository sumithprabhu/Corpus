# ![Corpus](frontend/public/logo.png) Corpus

**Dataset and model provenance on Filecoin.**

Corpus is a version-controlled, cryptographically anchored data registry for ML teams. Upload datasets to Filecoin, track lineage across versions, share with collaborators, and anchor model provenance hashes on-chain — so every trained model can be traced back to the exact data it was built on.


## Features

- **Decentralized storage** — datasets uploaded via Synapse to Filecoin, content-addressed by piece CID. Every version gets its own immutable CID.
- **On-chain custody** — every upload calls `recordAndDeduct` on StorageTreasury.sol atomically, creating a permanent on-chain record.
- **Named datasets + versioning** — give datasets a name, upload new versions, list history, set default. All versions live on Filecoin.
- **Access control (ACL)** — share datasets with other wallet addresses; revoke access at any time.
- **Model provenance** — register a model run (dataset CID + artifact CID + config hash + code hash). Backend computes `keccak256` provenance hash and anchors it on-chain via a self-send transaction.
- **Treasury billing** — USDFC-denominated storage fees via StorageTreasury.sol on Filecoin Calibration. Monthly debit worker sweeps active datasets.
- **API key management** — create, rotate, and revoke named API keys per wallet. Each key returns 401 immediately on revoke.
- **TypeScript SDK** — `corpus-sdk` on npm wraps all endpoints with typed responses.


## Future scope

- **Encryption at rest** — AES-256-GCM dataset encryption with per-user key management.
- **Cross-chain treasury** — accept deposits from other EVM chains via bridge, not just Filecoin Calibration.
- **Dataset marketplace** — list datasets publicly, allow other wallets to purchase access via on-chain payment.
- **Provenance verification API** — public endpoint to verify any provenance hash against the on-chain anchor without an API key.
- **Fine-grained ACL** — time-limited access grants, read vs. write permissions, team-level sharing.
- **IPFS gateway fallback** — serve CIDs via public IPFS gateway when Synapse retrieval is unavailable.
- **CLI tool** — `corpus upload`, `corpus get`, `corpus register` as first-class terminal commands.


## Quick start

```bash
cp backend/.env.example backend/.env
# fill in PRIVATE_KEY, SYNAPSE_*, TREASURY_ADDRESS

cd backend && npm install && npm run dev
cd ../frontend && npm install && npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## SDK

```bash
npm install corpus-sdk
```

```ts
import Corpus from "corpus-sdk"

const corpus = new Corpus({ apiKey: "your-api-key" })

const { cid } = await corpus.datasets.upload(file, { name: "my-dataset" })
const bytes   = await corpus.datasets.get(cid)

await corpus.models.register({
  datasetCID: cid,
  modelArtifactCID: "baga6ea4...",
  trainingConfigHash: "0x...",
  trainingCodeHash: "0x...",
})
```

Full SDK docs: [npmjs.com/package/corpus-sdk](https://www.npmjs.com/package/corpus-sdk)
