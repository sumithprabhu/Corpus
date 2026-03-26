/** Raw markdown for "Copy page" on Get started (human vs agents). */
export const GET_STARTED_HUMAN_MD = `# Get started — Corpus (human)

Corpus stores datasets on **Filecoin** (Synapse), tracks versions, and optionally records storage on **StorageTreasury** (USDFC on Calibration). You use an **API key** tied to your wallet.

## 1. Prerequisites

- **Wallet:** Filecoin Calibration (chain id \`314159\`). Fund with tFIL for gas.
- **USDFC:** For paid storage, deposit into the StorageTreasury contract (approve token, then \`deposit(amount)\`). See **Contracts** in docs for addresses.
- **Backend:** Running API (default \`http://localhost:3001\`) or your deployed URL.

## 2. Create an API key

1. Open the Corpus **Dashboard** and connect your wallet (RainbowKit).
2. On first connect, the app calls \`POST /user/create\` with your \`walletAddress\` and stores the returned \`apiKey\` (e.g. in localStorage).
3. Or call manually:

\`\`\`bash
curl -s -X POST http://localhost:3001/user/create \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"0xYourWallet..."}'
\`\`\`

Response includes \`apiKey\`. Send it on every protected request as:

\`\`\`
x-api-key: <your-api-key>
\`\`\`

## 3. Check costs (treasury)

If treasury is enabled on the backend:

\`\`\`bash
curl -s http://localhost:3001/dataset/prepare \\
  -H "x-api-key: YOUR_KEY"
\`\`\`

Use \`debitPerUploadWei\` and \`debitPerMonthWei\` to explain pricing to users and to ensure balance before upload.

## 4. Upload a dataset

\`\`\`bash
curl -s -X POST http://localhost:3001/dataset/upload \\
  -H "x-api-key: YOUR_KEY" \\
  -F "file=@./data.bin"
\`\`\`

Optional form fields: \`name\` (unique per user), \`encrypt\`, \`previousCID\` (for versioning).

## 5. List and download

- List: \`GET /dataset\` with \`x-api-key\`.
- Download: \`GET /dataset/{cid}\` returns the file (or \`?metadata=1\` for JSON).

## 6. Model provenance

\`POST /model/register\` with JSON: \`datasetCID\`, \`modelArtifactCID\`, \`trainingConfigHash\`, \`trainingCodeHash\`.

## Next steps

- **Contracts** — on-chain addresses and \`StorageTreasury\` behavior.
- **Architecture** — sequence diagrams and system overview.
- **Agent skill** — copy-paste instructions for LLM agents.
`

export const GET_STARTED_AGENTS_MD = `# Corpus — agent quick reference

You are integrating with the Corpus HTTP API. Do not hallucinate endpoints; use these exactly.

## Environment

- \`BASE_URL\`: API origin (e.g. \`http://localhost:3001\` or production).
- \`X_API_KEY\`: user API key from \`POST /user/create\` body field \`apiKey\`.
- Header on all protected routes: \`x-api-key: <X_API_KEY>\`.

## Auth flow

1. \`POST \${BASE_URL}/user/create\` JSON \`{"walletAddress":"<0x...>"}\` → store \`apiKey\`.
2. All subsequent dataset/model/treasury calls include \`x-api-key\`.

## Cost gate (treasury)

Before upload if treasury configured: \`GET \${BASE_URL}/dataset/prepare\` → read \`debitPerUploadWei\`, \`debitPerMonthWei\`. User must have on-chain treasury balance ≥ required debit; else \`402 INSUFFICIENT_STORAGE_BALANCE\`.

## Upload

- \`POST \${BASE_URL}/dataset/upload\` multipart \`file\` (required). Optional: \`name\`, \`encrypt\`, \`previousCID\`.
- Success \`201\`: JSON includes \`cid\` / \`pieceCID\`, \`storageCost\`.

## Read

- \`GET \${BASE_URL}/dataset\` → list.
- \`GET \${BASE_URL}/dataset/:cid\` → bytes; \`?metadata=1\` → JSON metadata.

## Treasury read

- \`GET \${BASE_URL}/treasury/balance\` → \`{ balance: "<wei string>" }\` or 503 if not configured.

## Model runs

- \`POST \${BASE_URL}/model/register\` JSON required fields: \`datasetCID\`, \`modelArtifactCID\`, \`trainingConfigHash\`, \`trainingCodeHash\`.

## Errors

- \`401\`: missing/invalid \`x-api-key\`.
- \`402\`: insufficient storage balance (treasury).
- Minimum upload size per Synapse SDK: **127 bytes**.

## Chain (reference)

- Filecoin Calibration \`314159\`; RPC e.g. Glif. USDFC + StorageTreasury addresses — see docs **Contracts** page.
`

export type GettingStartedAudience = "human" | "agents"

export function getGettingStartedMarkdown(audience: GettingStartedAudience): string {
  return audience === "human" ? GET_STARTED_HUMAN_MD : GET_STARTED_AGENTS_MD
}
