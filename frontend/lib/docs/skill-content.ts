/** Corpus agent skill — paste into SKILL.md or agent instructions. */
export const CORPUS_SKILL_MD = `---
name: corpus
description: Use the Corpus HTTP API for dataset storage on Filecoin (Synapse), treasury-backed debits (StorageTreasury / USDFC), and model-run provenance. Requires x-api-key from POST /user/create.
---

# Corpus (SKILL)

## When to use

- Uploading or versioning datasets with on-chain cost accounting.
- Listing/downloading datasets by CID or by name.
- Registering model training provenance linked to dataset and artifact CIDs.
- Reading treasury balance or per-upload / per-month debit quotes.

## Base configuration

- \`CORPUS_API_BASE\`: API root, no trailing slash (e.g. \`https://api.example.com\` or \`http://localhost:3001\`).
- \`CORPUS_API_KEY\`: value returned as \`apiKey\` from user creation.

## Obtain API key

\`\`\`http
POST {CORPUS_API_BASE}/user/create
Content-Type: application/json

{"walletAddress":"0x..."}
\`\`\`

Store \`apiKey\`. The wallet must match the user for treasury balance checks.

## Required header

\`\`\`
x-api-key: {CORPUS_API_KEY}
\`\`\`

## Preflight: costs

\`\`\`http
GET {CORPUS_API_BASE}/dataset/prepare
x-api-key: {CORPUS_API_KEY}
\`\`\`

Returns \`debitPerUploadWei\` and \`debitPerMonthWei\` (strings). If treasury is off, behavior follows backend config.

## Upload file

\`\`\`http
POST {CORPUS_API_BASE}/dataset/upload
x-api-key: {CORPUS_API_KEY}
Content-Type: multipart/form-data

file=<binary>
\`\`\`

Optional fields: \`name\`, \`encrypt\`, \`previousCID\`. Response includes \`cid\` (piece CID).

## List datasets

\`\`\`http
GET {CORPUS_API_BASE}/dataset
x-api-key: {CORPUS_API_KEY}
\`\`\`

## Download

\`\`\`http
GET {CORPUS_API_BASE}/dataset/{cid}
x-api-key: {CORPUS_API_KEY}
\`\`\`

Append \`?metadata=1\` for JSON only.

## Treasury balance

\`\`\`http
GET {CORPUS_API_BASE}/treasury/balance
x-api-key: {CORPUS_API_KEY}
\`\`\`

## Register model run

\`\`\`http
POST {CORPUS_API_BASE}/model/register
x-api-key: {CORPUS_API_KEY}
Content-Type: application/json

{
  "datasetCID": "...",
  "modelArtifactCID": "...",
  "trainingConfigHash": "0x...",
  "trainingCodeHash": "0x..."
}
\`\`\`

## Hard constraints

- Do not send user private keys to Corpus; only API key + wallet linkage from /user/create.
- File must be ≥ **127 bytes** (Synapse minimum).
- On \`402\` / \`INSUFFICIENT_STORAGE_BALANCE\`, user must deposit USDFC to StorageTreasury before retry.

## On-chain reference

- StorageTreasury: executor calls \`recordAndDeduct\` after upload; users \`deposit\`/\`withdraw\`.
- Calibration deployments and token address: see project \`docs/contracts/storage-treasury.md\`.
`
