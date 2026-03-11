# Corpus SDK

Production-grade JavaScript/TypeScript client for the Corpus API. Init with an API key, then use namespaced methods that map to every backend endpoint.

## Install

```bash
npm install corpus-sdk
```

## Quick start

```ts
import Corpus from "corpus-sdk";

const corpus = new Corpus({
  apiKey: process.env.CORPUS_API_KEY,
  baseUrl: "https://your-api.example.com", // optional; default http://localhost:3001
});

// Health (no API key required)
await corpus.health.check();

// User — get API key by wallet (no auth)
const { apiKey } = await corpus.user.create({ walletAddress: "0x..." });

// Datasets
const { cid } = await corpus.datasets.upload(file, { name: "my-dataset", encrypt: true });
const bytes = await corpus.datasets.get(cid);
const list = await corpus.datasets.list();

// Named datasets: versions, set default, download by name
await corpus.datasets.addVersionByName("my-dataset", file);
const { versions } = await corpus.datasets.listVersionsByName("my-dataset");
await corpus.datasets.setDefault("my-dataset", versions[0].cid);
const defaultFile = await corpus.datasets.getByName("my-dataset");

// Models
const run = await corpus.models.register({
  datasetCID: "...",
  modelArtifactCID: "...",
  trainingConfigHash: "...",
  trainingCodeHash: "...",
});
const runs = await corpus.models.list({ datasetCID: "..." });

// Treasury
const { balance } = await corpus.treasury.getBalance();
const { datasets } = await corpus.treasury.getDatasets();
```

## API surface

| Namespace   | Methods |
|------------|---------|
| **health** | `check()` |
| **user**   | `create({ walletAddress })` |
| **datasets** | `upload(file, options?)`, `createVersion(file, previousCID, options?)`, `list()`, `get(cid, { metadata? })`, `getMetadata(cid)`, `getByName(name, versionCid?)`, `listVersionsByName(name)`, `addVersionByName(name, file, options?)`, `setDefault(name, cid)`, `getRaw(cid)`, `deleteByCid(cid)`, `deleteByName(name)` |
| **models** | `register(input)`, `list({ datasetCID? })`, `get(provenanceHash)` |
| **treasury** | `getBalance()`, `getDatasets()` |

## Environment

- **CORPUS_API_URL** — Base URL when not passed in config (e.g. `https://api.example.com`).
- **apiKey** — From `POST /user/create`; required for dataset, model, and treasury calls.

## Errors

Failed API calls throw `CorpusApiError` with `status` and `message`:

```ts
import Corpus, { CorpusApiError } from "corpus-sdk";
try {
  await corpus.datasets.get("bad-cid");
} catch (e) {
  if (e instanceof CorpusApiError) {
    console.log(e.status, e.message);
  }
}
```

## Types

All request/response types are exported (e.g. `DatasetItem`, `ModelRun`, `RegisterModelRunInput`, `UploadOptions`).
