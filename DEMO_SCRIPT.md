# Corpus — 4-Minute Demo Script

---

## [0:00 – 0:40] What Is This?

> "AI training is increasingly collaborative — teams share datasets, run experiments, and build on each other's work. But today there's no reliable way to know: **where did this dataset come from? Who touched it? What model was trained on it?** And when models are deployed, there's no tamper-proof record tying the output back to the data."

**Corpus** solves that. It's a dataset and model provenance layer built on Filecoin.

- You upload datasets — they're stored on Filecoin via Synapse, decentralized and content-addressed by CID.
- Every upload is recorded on-chain via a smart contract, with an atomic balance deduction. Permanent proof of custody.
- When you train a model, you register the run — dataset CID, artifact CID, training config hash, code hash — and Corpus computes a **provenance hash** and anchors it on-chain. Anyone can verify the lineage.
- Storage is billed per month via an on-chain treasury (USDFC). You deposit once, access is sustained as long as your balance covers it.

> "Think of it as a version-controlled, cryptographically anchored data registry for ML teams."

---

## [0:40 – 1:30] Architecture

> "Here's how it's put together."

```
 Client (SDK / Frontend)
        │
        ▼
 Backend API  (Node.js + Express)
   ├─ Dataset Service   → encrypt → Synapse SDK → Filecoin
   ├─ Treasury Helper   → recordAndDeduct → StorageTreasury.sol (Filecoin Calibration)
   ├─ Model Service     → provenance hash → on-chain anchor tx
   └─ Billing Worker    → monthly debit sweep (every 30 days)
        │
        ▼
 MongoDB  (metadata, ownership, pending records)
```

**Five components:**

1. **StorageTreasury.sol** — On-chain contract on Filecoin Calibration. Holds USDFC deposits. Only the executor wallet can call `recordAndDeduct`, which atomically deducts balance and records the dataset CID in one transaction. Ownable + Pausable.

2. **Backend** — Express + TypeScript. Handles the full dataset flow: optional AES-256-GCM encryption → balance check → Synapse upload → `recordAndDeduct` → MongoDB write. If the on-chain call fails transiently, it's enqueued and retried every 60 seconds.

3. **MongoDB** — Stores dataset metadata (CID, ownership, versioning, ACL), API keys, model runs, and the pending treasury retry queue. File content never touches MongoDB — it lives on Filecoin.

4. **Synapse / Filecoin** — Content-addressed storage. Upload returns a piece CID that becomes the canonical dataset identifier everywhere — in the API, in the contract, in provenance hashes.

5. **SDK** — Thin TypeScript client. `corpus.datasets.upload()`, `corpus.models.register()`, `corpus.treasury.getBalance()` — wraps all API calls with typed responses.

---

## [1:30 – 3:00] Features

### Dataset Lifecycle

- **Upload** — `POST /dataset/upload` with a file. Backend encrypts (optional), checks treasury balance, uploads to Filecoin, calls `recordAndDeduct` on-chain, saves metadata. Returns the piece CID.
- **Named datasets** — Give a dataset a name (e.g. `railway-v1`). Names are unique per user. Upload to the same name creates versioned history.
- **Versioning** — `POST /dataset/by-name/:name/version` adds a new version; it becomes the default. `GET /dataset/by-name/:name/versions` lists the full history.
- **Download** — `GET /dataset/:cid` returns the file, auto-decrypting if needed. `?metadata=1` returns metadata only. `/raw` returns unprocessed bytes straight from Filecoin.
- **Delete** — Removes the MongoDB record. Data on Filecoin is immutable; the CID is simply no longer served via the API.

### Access Control (ACL)

- `POST /dataset/:cid/share` — grants read access to another wallet address.
- `DELETE /dataset/:cid/share/:walletAddress` — revokes it.
- Shared users can download the dataset; they cannot re-share or delete it.

### Model Provenance

- `POST /model/register` — takes `datasetCID`, `modelArtifactCID`, `trainingConfigHash`, `trainingCodeHash`. Backend computes `provenanceHash = keccak256(datasetCID + configHash + codeHash)` and submits a self-send on-chain transaction with the hash as calldata — creating an immutable, timestamped anchor on Filecoin.
- `GET /model/:provenanceHash` — retrieve the full run record including `anchorStatus` (none → pending → anchored) and `anchorTxHash`.

### Treasury & Billing

- Users deposit USDFC to the StorageTreasury contract.
- `GET /dataset/prepare` — returns `debitPerUploadWei` and `debitPerMonthWei` before committing.
- A background billing worker runs monthly debit sweeps across all active datasets. Wallets with insufficient balance see their datasets expire.
- `GET /treasury/balance` — live on-chain balance. `GET /billing/status` — active vs expired datasets per wallet.

### API Key Management

- `POST /user/keys` — create additional API keys (named, rotatable).
- `DELETE /user/keys/:id` — revoke a key. Revoked keys return 401 immediately.

---

## [3:00 – 3:45] Live Demo

> Walk through the `/demo` page at `localhost:3000/demo`.

Steps:
1. **Connect wallet** → `POST /user/create` → get API key
2. **Check cost** → `GET /dataset/prepare` → see debitPerUploadWei
3. **Upload dataset** → file hits Filecoin, on-chain `recordAndDeduct` fires, CID returned
4. **List + download** → verify the CID, download bytes match
5. **Share** → grant access to second wallet, show second wallet can download
6. **Register model run** → paste dataset CID + artifact CID → provenance hash computed + anchor tx submitted
7. **Verify** → `GET /model/:provenanceHash` → show `anchorStatus: pending → anchored`, link to tx on Filecoin explorer

> "Every step is reproducible. Every CID is verifiable. The provenance hash is on-chain."

---

## [3:45 – 4:00] Thank You

> "Corpus gives ML teams a single place to store datasets, track lineage, and prove reproducibility — anchored on Filecoin, verifiable by anyone."

**Links:**
- API: `http://localhost:3001`
- Dashboard: `http://localhost:3000`
- Contract: `StorageTreasury.sol` on Filecoin Calibration (`0x85c8629306c1976C1F3635288a6fE9BBFA4453ED`)

> "Happy to take questions — on the storage model, the provenance flow, or the billing mechanics."
