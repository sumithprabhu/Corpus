/**
 * Corpus End-to-End Test Suite
 * Run: node e2e/test.mjs
 * Requires: Node 18+ (for native fetch & FormData)
 *
 * Set BASE_URL env to override default (default: http://localhost:3001)
 * Set WALLET_ADDRESS env to use a specific wallet address
 */

import http from "node:http";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

// Generate a valid 40-hex-char Ethereum address for testing
function randomEthAddress() {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0x${hex}`;
}

const WALLET_ADDRESS = process.env.WALLET_ADDRESS
  ? process.env.WALLET_ADDRESS.toLowerCase()
  : randomEthAddress();

// Second wallet for sharing tests — always random to avoid conflicts
const WALLET_ADDRESS_2 = randomEthAddress();

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function log(msg) {
  process.stdout.write(msg + "\n");
}

function ok(label) {
  passed++;
  log(`  ✓  ${label}`);
}

function fail(label, reason) {
  failed++;
  failures.push({ label, reason });
  log(`  ✗  ${label}`);
  log(`     └─ ${reason}`);
}

function skip(label, reason) {
  skipped++;
  log(`  ⚠  ${label} (skipped: ${reason})`);
}

function section(title) {
  log(`\n── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}`);
}

async function req(method, path, { headers = {}, body, form } = {}) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: { ...headers } };

  if (form) {
    opts.body = form;
  } else if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  let data;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.arrayBuffer();
  }
  return { status: res.status, data };
}

function authHeaders(apiKey) {
  return { "x-api-key": apiKey };
}

function assert(label, condition, reason = "assertion failed") {
  if (condition) ok(label);
  else fail(label, reason);
}

/**
 * Multipart POST using http.request — avoids undici headersTimeout for long uploads.
 */
async function multipartPost(path, apiKey, fileBlob, fileName, extraFields = {}) {
  const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

  return new Promise((resolve, reject) => {
    const boundary = "----E2EBoundary" + Math.random().toString(36).slice(2);
    const url = new URL(`${BASE_URL}${path}`);

    const parts = [];
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/plain\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from("\r\n"));
    for (const [key, value] of Object.entries(extraFields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        )
      );
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const options = {
      hostname: url.hostname,
      port: Number(url.port) || 3001,
      path: url.pathname + (url.search || ""),
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const reqHttp = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode, data });
        } catch {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });
    reqHttp.on("error", reject);
    reqHttp.write(body);
    reqHttp.end();
  });
}

function uploadFile(apiKey, blob, fileName, extraFields = {}) {
  return multipartPost("/dataset/upload", apiKey, blob, fileName, extraFields);
}

// ── State shared between tests ────────────────────────────────────────────────

let apiKey = null;
let additionalKeyId = null;
let additionalKey = null;
let uploadedCID = null;
let uploadedName = null;
let versionCID = null;
let provenanceHash = null;
let secondApiKey = null;  // for sharing tests

// ── Test Suites ───────────────────────────────────────────────────────────────

async function testHealth() {
  section("Health Check");
  try {
    const { status, data } = await req("GET", "/health");
    assert("GET /health → 200", status === 200, `status was ${status}`);
    assert("response has ok:true", data?.ok === true, JSON.stringify(data));
  } catch (e) {
    fail("GET /health", e.message);
  }
}

async function testUserCreate() {
  section("User: Create / Get");
  try {
    const { status, data } = await req("POST", "/user/create", {
      body: { walletAddress: WALLET_ADDRESS },
    });
    assert(
      "POST /user/create → 200 or 201",
      status === 200 || status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert(
      "response has apiKey",
      typeof data?.apiKey === "string" && data.apiKey.length > 0,
      JSON.stringify(data)
    );
    assert(
      "response has walletAddress",
      data?.walletAddress?.toLowerCase() === WALLET_ADDRESS.toLowerCase(),
      JSON.stringify(data)
    );
    apiKey = data?.apiKey;

    // Idempotency
    const { status: s2, data: d2 } = await req("POST", "/user/create", {
      body: { walletAddress: WALLET_ADDRESS },
    });
    assert("POST /user/create idempotent → 200", s2 === 200, `status was ${s2}`);
    assert(
      "idempotent call returns same apiKey",
      d2?.apiKey === apiKey,
      `got ${d2?.apiKey} vs ${apiKey}`
    );
    assert(
      'idempotent call has message "Existing user"',
      d2?.message === "Existing user",
      JSON.stringify(d2)
    );
  } catch (e) {
    fail("POST /user/create", e.message);
  }

  // Missing wallet address → 400
  try {
    const { status } = await req("POST", "/user/create", { body: {} });
    assert("POST /user/create without walletAddress → 400", status === 400, `status was ${status}`);
  } catch (e) {
    fail("POST /user/create (missing wallet) error handling", e.message);
  }
}

async function testUserCreateValidation() {
  section("User: EVM Address Validation");

  // Invalid address (not 0x + 40 hex)
  try {
    const { status, data } = await req("POST", "/user/create", {
      body: { walletAddress: "not-an-address" },
    });
    assert(
      "POST /user/create with invalid address → 400",
      status === 400,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert(
      "error mentions EVM address",
      typeof data?.error === "string" && data.error.toLowerCase().includes("evm"),
      JSON.stringify(data)
    );
  } catch (e) {
    fail("POST /user/create invalid address → 400", e.message);
  }

  // Too short address
  try {
    const { status } = await req("POST", "/user/create", {
      body: { walletAddress: "0x1234" },
    });
    assert(
      "POST /user/create with short address → 400",
      status === 400,
      `status was ${status}`
    );
  } catch (e) {
    fail("POST /user/create short address → 400", e.message);
  }

  // Valid second user (used in sharing tests later)
  try {
    const { status, data } = await req("POST", "/user/create", {
      body: { walletAddress: WALLET_ADDRESS_2 },
    });
    assert(
      "POST /user/create for second wallet → 200 or 201",
      status === 200 || status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    secondApiKey = data?.apiKey;
    log(`     second wallet: ${WALLET_ADDRESS_2}`);
  } catch (e) {
    fail("POST /user/create (second user)", e.message);
  }
}

async function testApiKeys() {
  section("User: API Key Management");
  if (!apiKey) {
    fail("GET /user/keys", "skipped — no apiKey from user create");
    return;
  }

  // List keys
  try {
    const { status, data } = await req("GET", "/user/keys", {
      headers: authHeaders(apiKey),
    });
    assert("GET /user/keys → 200", status === 200, `status was ${status}`);
    assert("keys is an array", Array.isArray(data?.keys), JSON.stringify(data));
    assert(
      "at least 1 key (primary)",
      data?.keys?.length >= 1,
      `got ${data?.keys?.length}`
    );
    // Each key has prefix, not full key value
    const first = data?.keys?.[0];
    assert(
      "key item has id, prefix, name",
      typeof first?.id === "string" && typeof first?.prefix === "string",
      JSON.stringify(first)
    );
  } catch (e) {
    fail("GET /user/keys", e.message);
  }

  // Create additional key
  try {
    const { status, data } = await req("POST", "/user/keys", {
      headers: authHeaders(apiKey),
      body: { name: "e2e-test-key" },
    });
    assert(
      "POST /user/keys → 201",
      status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("new key has id", typeof data?.id === "string", JSON.stringify(data));
    assert(
      "new key has key string",
      typeof data?.key === "string" && data.key.length > 0,
      JSON.stringify(data)
    );
    additionalKeyId = data?.id;
    additionalKey = data?.key;
  } catch (e) {
    fail("POST /user/keys", e.message);
  }

  // Additional key authenticates
  if (additionalKey) {
    try {
      const { status } = await req("GET", "/user/keys", {
        headers: authHeaders(additionalKey),
      });
      assert(
        "additional key authenticates successfully",
        status === 200,
        `status was ${status}`
      );
    } catch (e) {
      fail("additional key auth", e.message);
    }
  }

  // Auth error — bad key
  try {
    const { status } = await req("GET", "/user/keys", {
      headers: { "x-api-key": "invalid-key-xyz" },
    });
    assert("invalid x-api-key → 401", status === 401, `status was ${status}`);
  } catch (e) {
    fail("invalid key → 401", e.message);
  }

  // Auth error — missing header
  try {
    const { status } = await req("GET", "/user/keys");
    assert("missing x-api-key → 401", status === 401, `status was ${status}`);
  } catch (e) {
    fail("missing key → 401", e.message);
  }
}

async function testDatasetPrepare() {
  section("Dataset: Prepare (cost check)");
  if (!apiKey) {
    fail("GET /dataset/prepare", "skipped — no apiKey");
    return;
  }
  try {
    const { status, data } = await req("GET", "/dataset/prepare", {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset/prepare → 200", status === 200, `status was ${status}`);
    assert("response has debitPerUploadWei", "debitPerUploadWei" in (data || {}), JSON.stringify(data));
    assert("response has debitPerMonthWei", "debitPerMonthWei" in (data || {}), JSON.stringify(data));
    log(`     debitPerUploadWei: ${data?.debitPerUploadWei}`);
    log(`     debitPerMonthWei:  ${data?.debitPerMonthWei}`);
  } catch (e) {
    fail("GET /dataset/prepare", e.message);
  }
}

let treasuryInsufficient = false;

async function testDatasetUpload() {
  section("Dataset: Upload");
  if (!apiKey) {
    fail("POST /dataset/upload", "skipped — no apiKey");
    return;
  }

  const testFileName = `e2e-dataset-${Date.now()}`;
  uploadedName = testFileName;
  const baseContent = `Corpus E2E Test Dataset\nTimestamp: ${new Date().toISOString()}\nWallet: ${WALLET_ADDRESS}\nRandom: ${Math.random()}\n`;
  const content = baseContent.padEnd(256, "0");
  const blob = new Blob([content], { type: "text/plain" });

  try {
    log(`     Uploading (may take several minutes for on-chain TX)...`);
    let status, data;
    try {
      const result = await uploadFile(apiKey, blob, `${testFileName}.txt`, { name: testFileName });
      status = result.status;
      data = result.data;
    } catch (fetchErr) {
      fail("POST /dataset/upload", `http error: ${fetchErr.message}`);
      uploadedName = null;
      return;
    }

    if (status === 402 && data?.error === "INSUFFICIENT_STORAGE_BALANCE") {
      treasuryInsufficient = true;
      skip(
        "POST /dataset/upload",
        "treasury configured but wallet has 0 balance — deposit USDFC to StorageTreasury"
      );
      uploadedName = null;
      return;
    }

    if (status === 500 && typeof data?.error === "string" && data.error.includes("timed out")) {
      skip("POST /dataset/upload", `Synapse upload timed out — ${data.error}`);
      uploadedName = null;
      return;
    }

    assert(
      "POST /dataset/upload → 201",
      status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("response has cid", typeof data?.cid === "string", JSON.stringify(data));
    assert("response success:true", data?.success === true, JSON.stringify(data));
    uploadedCID = data?.cid;
    log(`     CID: ${uploadedCID}`);
  } catch (e) {
    fail("POST /dataset/upload (outer catch)", e.message);
  }

  // Upload without file → 400
  try {
    const form = new FormData();
    const { status } = await req("POST", "/dataset/upload", {
      headers: authHeaders(apiKey),
      form,
    });
    assert("POST /dataset/upload without file → 400", status === 400, `status was ${status}`);
  } catch (e) {
    fail("upload without file error handling", e.message);
  }
}

async function testDatasetList() {
  section("Dataset: List");
  if (!apiKey) {
    fail("GET /dataset", "skipped — no apiKey");
    return;
  }
  try {
    const { status, data } = await req("GET", "/dataset", {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset → 200", status === 200, `status was ${status}`);
    assert("datasets is an array", Array.isArray(data?.datasets), JSON.stringify(data));
    if (uploadedCID) {
      const found = data?.datasets?.some((d) => d.cid === uploadedCID);
      assert("uploaded dataset appears in list", found, `CID ${uploadedCID} not found`);
    }
    log(`     dataset count: ${data?.datasets?.length}`);
  } catch (e) {
    fail("GET /dataset", e.message);
  }
}

async function testDatasetGet() {
  section("Dataset: Get by CID");
  if (!apiKey || !uploadedCID) {
    if (treasuryInsufficient) skip("GET /dataset/:cid", "upload skipped due to treasury balance");
    else fail("GET /dataset/:cid", "skipped — no apiKey or uploadedCID");
    return;
  }

  // Metadata
  try {
    const { status, data } = await req(
      "GET",
      `/dataset/${uploadedCID}?metadata=true`,
      { headers: authHeaders(apiKey) }
    );
    assert("GET /dataset/:cid?metadata=true → 200", status === 200, `status was ${status}`);
    assert("metadata has cid field", data?.cid === uploadedCID, JSON.stringify(data));
  } catch (e) {
    fail("GET /dataset/:cid?metadata=true", e.message);
  }

  // File download
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}`, {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset/:cid (file) → 200", status === 200, `status was ${status}`);
    assert(
      "file download returns bytes",
      data instanceof ArrayBuffer && data.byteLength > 0,
      `got type ${typeof data}`
    );
    log(`     file size: ${data?.byteLength} bytes`);
  } catch (e) {
    fail("GET /dataset/:cid (file download)", e.message);
  }

  // 404 for unknown CID
  try {
    const { status } = await req("GET", "/dataset/bafyunknowncidxyz123", {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset/unknown-cid → 404", status === 404, `status was ${status}`);
  } catch (e) {
    fail("GET /dataset/:cid 404 handling", e.message);
  }
}

async function testDatasetByName() {
  section("Dataset: Named Access");
  if (!apiKey || !uploadedName) {
    if (treasuryInsufficient) skip("named dataset tests", "upload skipped due to treasury balance");
    else fail("GET /dataset/by-name/:name", "skipped — no apiKey or uploadedName");
    return;
  }

  // List versions
  try {
    const { status, data } = await req(
      "GET",
      `/dataset/by-name/${uploadedName}/versions`,
      { headers: authHeaders(apiKey) }
    );
    assert("GET /dataset/by-name/:name/versions → 200", status === 200, `status was ${status}`);
    assert("versions is an array", Array.isArray(data?.versions), JSON.stringify(data));
    assert("at least 1 version", data?.versions?.length >= 1, `got ${data?.versions?.length}`);
  } catch (e) {
    fail("GET /dataset/by-name/:name/versions", e.message);
  }

  // Download default
  try {
    const { status, data } = await req(
      "GET",
      `/dataset/by-name/${uploadedName}`,
      { headers: authHeaders(apiKey) }
    );
    assert("GET /dataset/by-name/:name → 200", status === 200, `status was ${status}`);
    assert(
      "file download returns bytes",
      data instanceof ArrayBuffer && data.byteLength > 0,
      `got type ${typeof data}`
    );
  } catch (e) {
    fail("GET /dataset/by-name/:name", e.message);
  }
}

async function testDatasetVersion() {
  section("Dataset: Versioning");
  if (!apiKey || !uploadedCID || !uploadedName) {
    if (treasuryInsufficient) skip("dataset version tests", "upload skipped due to treasury balance");
    else fail("dataset version tests", "skipped — missing prerequisites");
    return;
  }

  // Version by CID
  try {
    const content2 = `Corpus E2E Version 2\nTimestamp: ${new Date().toISOString()}\nPrevious: ${uploadedCID}\n`.padEnd(256, "0");
    const blob2 = new Blob([content2], { type: "text/plain" });
    log(`     Uploading version 2 (may take minutes)...`);
    const { status, data } = await multipartPost("/dataset/version", apiKey, blob2, "v2.txt", { previousCID: uploadedCID });
    assert(
      "POST /dataset/version → 201",
      status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("version has cid", typeof data?.cid === "string", JSON.stringify(data));
    versionCID = data?.cid;
    log(`     version CID: ${versionCID}`);
  } catch (e) {
    fail("POST /dataset/version", e.message);
  }

  // Missing previousCID → 400
  try {
    const blob = new Blob(["data".padEnd(256, "x")], { type: "text/plain" });
    const { status } = await multipartPost("/dataset/version", apiKey, blob, "missing-prev.txt");
    assert("POST /dataset/version without previousCID → 400", status === 400, `status was ${status}`);
  } catch (e) {
    fail("POST /dataset/version (missing previousCID)", e.message);
  }

  // Version by name
  let namedVersionCID = null;
  try {
    const content3 = `Corpus E2E Version by name\nTimestamp: ${new Date().toISOString()}\nName: ${uploadedName}\n`.padEnd(256, "0");
    const blob3 = new Blob([content3], { type: "text/plain" });
    log(`     Uploading version by name (may take minutes)...`);
    const { status, data } = await multipartPost(
      `/dataset/by-name/${uploadedName}/version`,
      apiKey,
      blob3,
      "v3.txt"
    );
    assert(
      "POST /dataset/by-name/:name/version → 201",
      status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    namedVersionCID = data?.cid;
  } catch (e) {
    fail("POST /dataset/by-name/:name/version", e.message);
  }

  // Set default version
  if (namedVersionCID) {
    try {
      const { status, data } = await req(
        "PUT",
        `/dataset/by-name/${uploadedName}/default`,
        { headers: authHeaders(apiKey), body: { cid: namedVersionCID } }
      );
      assert(
        "PUT /dataset/by-name/:name/default → 200",
        status === 200,
        `status was ${status} — ${JSON.stringify(data)}`
      );
      assert("defaultCid matches", data?.defaultCid === namedVersionCID, JSON.stringify(data));
    } catch (e) {
      fail("PUT /dataset/by-name/:name/default", e.message);
    }

    // PUT without cid → 400
    try {
      const { status } = await req(
        "PUT",
        `/dataset/by-name/${uploadedName}/default`,
        { headers: authHeaders(apiKey), body: {} }
      );
      assert("PUT default without cid → 400", status === 400, `status was ${status}`);
    } catch (e) {
      fail("PUT default without cid error handling", e.message);
    }
  }
}

async function testDatasetSharing() {
  section("Dataset: Sharing (ACL)");
  if (!apiKey || !uploadedCID) {
    if (treasuryInsufficient) skip("dataset sharing tests", "upload skipped due to treasury balance");
    else skip("dataset sharing tests", "no uploadedCID available");
    return;
  }
  if (!secondApiKey) {
    skip("dataset sharing tests", "second user not created");
    return;
  }

  // Before sharing: second user should NOT be able to access the dataset
  try {
    const { status } = await req("GET", `/dataset/${uploadedCID}?metadata=true`, {
      headers: authHeaders(secondApiKey),
    });
    assert(
      "second user cannot access unshared dataset → 404",
      status === 404,
      `status was ${status} (expected 404)`
    );
  } catch (e) {
    fail("second user unshared access check", e.message);
  }

  // Owner lists shares (should be empty)
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}/shares`, {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset/:cid/shares → 200", status === 200, `status was ${status}`);
    assert("shares is an array", Array.isArray(data?.shares), JSON.stringify(data));
    assert("initially no shares", data?.shares?.length === 0, `got ${data?.shares?.length}`);
  } catch (e) {
    fail("GET /dataset/:cid/shares (initial)", e.message);
  }

  // Share with invalid address → 400
  try {
    const { status } = await req("POST", `/dataset/${uploadedCID}/share`, {
      headers: authHeaders(apiKey),
      body: { walletAddress: "not-an-address" },
    });
    assert("share with invalid address → 400", status === 400, `status was ${status}`);
  } catch (e) {
    fail("share with invalid address error handling", e.message);
  }

  // Share with second wallet
  try {
    const { status, data } = await req("POST", `/dataset/${uploadedCID}/share`, {
      headers: authHeaders(apiKey),
      body: { walletAddress: WALLET_ADDRESS_2 },
    });
    assert(
      "POST /dataset/:cid/share → 200",
      status === 200,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("sharedWith matches", data?.sharedWith === WALLET_ADDRESS_2.toLowerCase(), JSON.stringify(data));
  } catch (e) {
    fail("POST /dataset/:cid/share", e.message);
  }

  // Idempotent share (same wallet again should not error)
  try {
    const { status } = await req("POST", `/dataset/${uploadedCID}/share`, {
      headers: authHeaders(apiKey),
      body: { walletAddress: WALLET_ADDRESS_2 },
    });
    assert("duplicate share is idempotent → 200", status === 200, `status was ${status}`);
  } catch (e) {
    fail("duplicate share idempotency", e.message);
  }

  // List shares — should now have 1
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}/shares`, {
      headers: authHeaders(apiKey),
    });
    assert("GET /dataset/:cid/shares after share → 200", status === 200, `status was ${status}`);
    assert("share count is 1", data?.shares?.length === 1, `got ${data?.shares?.length}`);
    assert(
      "share entry has correct wallet",
      data?.shares?.[0]?.sharedWithWalletAddress === WALLET_ADDRESS_2.toLowerCase(),
      JSON.stringify(data?.shares?.[0])
    );
  } catch (e) {
    fail("GET /dataset/:cid/shares (after share)", e.message);
  }

  // Shared user can now access dataset (metadata)
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}?metadata=true`, {
      headers: authHeaders(secondApiKey),
    });
    assert(
      "shared user can access dataset metadata → 200",
      status === 200,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("metadata has correct cid", data?.cid === uploadedCID, JSON.stringify(data));
  } catch (e) {
    fail("shared user dataset metadata access", e.message);
  }

  // Shared user can download file
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}`, {
      headers: authHeaders(secondApiKey),
    });
    assert(
      "shared user can download dataset file → 200",
      status === 200,
      `status was ${status}`
    );
    assert(
      "downloaded bytes non-empty",
      data instanceof ArrayBuffer && data.byteLength > 0,
      `got type ${typeof data}`
    );
    log(`     shared file size: ${data?.byteLength} bytes`);
  } catch (e) {
    fail("shared user dataset file download", e.message);
  }

  // Cannot share from second user (not owner) → 404
  try {
    const { status } = await req("POST", `/dataset/${uploadedCID}/share`, {
      headers: authHeaders(secondApiKey),
      body: { walletAddress: randomEthAddress() },
    });
    assert(
      "non-owner cannot share dataset → 404",
      status === 404,
      `status was ${status}`
    );
  } catch (e) {
    fail("non-owner share attempt", e.message);
  }

  // Revoke share
  try {
    const { status, data } = await req(
      "DELETE",
      `/dataset/${uploadedCID}/share/${WALLET_ADDRESS_2}`,
      { headers: authHeaders(apiKey) }
    );
    assert(
      "DELETE /dataset/:cid/share/:walletAddress → 200",
      status === 200,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("revoked:true", data?.revoked === true, JSON.stringify(data));
  } catch (e) {
    fail("DELETE /dataset/:cid/share/:walletAddress", e.message);
  }

  // After revoke: second user loses access
  try {
    const { status } = await req("GET", `/dataset/${uploadedCID}?metadata=true`, {
      headers: authHeaders(secondApiKey),
    });
    assert(
      "second user loses access after revoke → 404",
      status === 404,
      `status was ${status}`
    );
  } catch (e) {
    fail("second user access after revoke", e.message);
  }

  // Shares list should be empty again
  try {
    const { status, data } = await req("GET", `/dataset/${uploadedCID}/shares`, {
      headers: authHeaders(apiKey),
    });
    assert("shares empty after revoke", data?.shares?.length === 0, `got ${data?.shares?.length}`);
  } catch (e) {
    fail("shares list after revoke", e.message);
  }
}

async function testModelRuns() {
  section("Model Runs");
  if (!apiKey || !uploadedCID) {
    if (treasuryInsufficient) skip("model run tests", "upload skipped due to treasury balance");
    else fail("model run tests", "skipped — missing prerequisites");
    return;
  }

  const runPayload = {
    datasetCID: uploadedCID,
    modelArtifactCID: "bafymodelartifact" + Date.now(),
    trainingConfigHash: "0x" + "a".repeat(64),
    trainingCodeHash: "0x" + "b".repeat(64),
  };

  // Register
  try {
    const { status, data } = await req("POST", "/model/register", {
      headers: authHeaders(apiKey),
      body: runPayload,
    });
    assert(
      "POST /model/register → 201",
      status === 201,
      `status was ${status} — ${JSON.stringify(data)}`
    );
    assert("response has provenanceHash", typeof data?.provenanceHash === "string", JSON.stringify(data));
    provenanceHash = data?.provenanceHash;
    log(`     provenanceHash: ${provenanceHash}`);
  } catch (e) {
    fail("POST /model/register", e.message);
  }

  // Register — missing fields → 400
  try {
    const { status } = await req("POST", "/model/register", {
      headers: authHeaders(apiKey),
      body: { datasetCID: uploadedCID },
    });
    assert("POST /model/register (missing fields) → 400", status === 400, `status was ${status}`);
  } catch (e) {
    fail("POST /model/register (missing fields)", e.message);
  }

  // List all
  try {
    const { status, data } = await req("GET", "/model", { headers: authHeaders(apiKey) });
    assert("GET /model → 200", status === 200, `status was ${status}`);
    assert("modelRuns is an array", Array.isArray(data?.modelRuns), JSON.stringify(data));
  } catch (e) {
    fail("GET /model", e.message);
  }

  // Filter by datasetCID
  try {
    const { status, data } = await req(
      "GET",
      `/model?datasetCID=${uploadedCID}`,
      { headers: authHeaders(apiKey) }
    );
    assert("GET /model?datasetCID → 200", status === 200, `status was ${status}`);
    if (provenanceHash) {
      const found = data?.modelRuns?.some((r) => r.provenanceHash === provenanceHash);
      assert("registered run appears in filtered list", found, `provenanceHash not found`);
    }
  } catch (e) {
    fail("GET /model?datasetCID", e.message);
  }

  // Get by provenanceHash
  if (provenanceHash) {
    try {
      const { status, data } = await req("GET", `/model/${provenanceHash}`, {
        headers: authHeaders(apiKey),
      });
      assert("GET /model/:provenanceHash → 200", status === 200, `status was ${status}`);
      assert("provenanceHash matches", data?.provenanceHash === provenanceHash, JSON.stringify(data));
    } catch (e) {
      fail("GET /model/:provenanceHash", e.message);
    }

    // 404 for unknown hash
    try {
      const { status } = await req("GET", "/model/0xunknownhash123", {
        headers: authHeaders(apiKey),
      });
      assert("GET /model/unknown → 404", status === 404, `status was ${status}`);
    } catch (e) {
      fail("GET /model/:provenanceHash 404", e.message);
    }
  }
}

async function testModelRunOwnership() {
  section("Model Runs: Ownership & Provenance Anchoring");
  if (!apiKey || !uploadedCID || !provenanceHash) {
    skip("model ownership tests", "prerequisites missing");
    return;
  }

  // Get the registered run and check ownerWalletAddress
  try {
    const { status, data } = await req("GET", `/model/${provenanceHash}`, {
      headers: authHeaders(apiKey),
    });
    assert("GET /model/:provenanceHash → 200", status === 200, `status was ${status}`);
    assert(
      "ownerWalletAddress is set",
      typeof data?.ownerWalletAddress === "string" && data.ownerWalletAddress.length > 0,
      JSON.stringify(data)
    );
    assert(
      "ownerWalletAddress matches registering wallet",
      data?.ownerWalletAddress?.toLowerCase() === WALLET_ADDRESS.toLowerCase(),
      `got ${data?.ownerWalletAddress} vs ${WALLET_ADDRESS}`
    );
    log(`     ownerWalletAddress: ${data?.ownerWalletAddress}`);
  } catch (e) {
    fail("model run ownerWalletAddress check", e.message);
  }

  // Filter ?mine=true — should include our run
  try {
    const { status, data } = await req("GET", "/model?mine=true", {
      headers: authHeaders(apiKey),
    });
    assert("GET /model?mine=true → 200", status === 200, `status was ${status}`);
    assert("modelRuns is an array", Array.isArray(data?.modelRuns), JSON.stringify(data));
    const found = data?.modelRuns?.some((r) => r.provenanceHash === provenanceHash);
    assert("own run appears in ?mine=true list", found, `provenanceHash not found in ${JSON.stringify(data?.modelRuns?.map(r => r.provenanceHash))}`);
  } catch (e) {
    fail("GET /model?mine=true", e.message);
  }

  // anchorStatus field is present
  try {
    const { status, data } = await req("GET", `/model/${provenanceHash}`, {
      headers: authHeaders(apiKey),
    });
    assert(
      "anchorStatus field is present",
      ["none", "pending", "anchored", "failed"].includes(data?.anchorStatus),
      `anchorStatus was ${JSON.stringify(data?.anchorStatus)}`
    );
    log(`     anchorStatus: ${data?.anchorStatus}`);
    if (data?.anchorTxHash) {
      log(`     anchorTxHash: ${data?.anchorTxHash}`);
      assert(
        "anchorTxHash looks like a tx hash",
        typeof data.anchorTxHash === "string" && data.anchorTxHash.startsWith("0x"),
        data.anchorTxHash
      );
    }
    if (data?.anchorBlock) {
      log(`     anchorBlock: ${data?.anchorBlock}`);
    }
    if (data?.anchorStatus === "none") {
      log("     (provenance anchoring not configured — set TREASURY_EXECUTOR_PRIVATE_KEY + RPC_URL to enable)");
    }
  } catch (e) {
    fail("anchorStatus field check", e.message);
  }

  // Second user registers a run — ?mine=true from second user should NOT return first user's run
  if (secondApiKey) {
    try {
      const secondRunPayload = {
        datasetCID: uploadedCID,
        modelArtifactCID: "bafymodel2nd" + Date.now(),
        trainingConfigHash: "0x" + "c".repeat(64),
        trainingCodeHash: "0x" + "d".repeat(64),
      };
      await req("POST", "/model/register", {
        headers: authHeaders(secondApiKey),
        body: secondRunPayload,
      });

      // First user's ?mine=true should not contain second user's run
      const { data: mine1 } = await req("GET", "/model?mine=true", {
        headers: authHeaders(apiKey),
      });
      // Second user's ?mine=true should not contain first user's run
      const { data: mine2 } = await req("GET", "/model?mine=true", {
        headers: authHeaders(secondApiKey),
      });
      const crossContaminated = mine1?.modelRuns?.some(
        (r) => mine2?.modelRuns?.some((r2) => r2.provenanceHash === r.provenanceHash && r.provenanceHash !== provenanceHash)
      );
      assert(
        "?mine=true isolates runs by owner",
        !crossContaminated,
        "cross-user runs leaked into mine filter"
      );
      log(`     user1 mine count: ${mine1?.modelRuns?.length}, user2 mine count: ${mine2?.modelRuns?.length}`);
    } catch (e) {
      fail("?mine=true cross-user isolation", e.message);
    }
  }
}

async function testTreasury() {
  section("Treasury");
  if (!apiKey) {
    fail("treasury tests", "skipped — no apiKey");
    return;
  }

  // Balance
  try {
    const { status, data } = await req("GET", "/treasury/balance", {
      headers: authHeaders(apiKey),
    });
    if (status === 503) {
      log("  ⚠  GET /treasury/balance → 503 (treasury not configured — skipping)");
    } else {
      assert("GET /treasury/balance → 200", status === 200, `status was ${status} — ${JSON.stringify(data)}`);
      assert("balance is a string (wei)", typeof data?.balance === "string", JSON.stringify(data));
      log(`     balance: ${data?.balance} wei`);
    }
  } catch (e) {
    fail("GET /treasury/balance", e.message);
  }

  // Datasets with treasury status
  try {
    const { status, data } = await req("GET", "/treasury/datasets", {
      headers: authHeaders(apiKey),
    });
    assert("GET /treasury/datasets → 200", status === 200, `status was ${status}`);
    assert("datasets is an array", Array.isArray(data?.datasets), JSON.stringify(data));
    log(`     treasury-tracked datasets: ${data?.datasets?.length}`);
  } catch (e) {
    fail("GET /treasury/datasets", e.message);
  }
}

async function testCleanup() {
  section("Cleanup");
  if (!apiKey) return;

  // Revoke additional key
  if (additionalKeyId) {
    try {
      const { status, data } = await req(
        "DELETE",
        `/user/keys/${additionalKeyId}`,
        { headers: authHeaders(apiKey) }
      );
      assert(
        "DELETE /user/keys/:id → 200",
        status === 200,
        `status was ${status} — ${JSON.stringify(data)}`
      );
      assert("revoked:true", data?.revoked === true, JSON.stringify(data));

      // Revoked key should now fail with 401
      const { status: s2, data: d2 } = await req("GET", "/user/keys", {
        headers: authHeaders(additionalKey),
      });
      assert(
        "revoked key → 401",
        s2 === 401,
        `status was ${s2} (expected 401)`
      );
      assert(
        "revoked key error message",
        typeof d2?.error === "string" && d2.error.toLowerCase().includes("revok"),
        `error was: ${d2?.error}`
      );
    } catch (e) {
      fail("DELETE /user/keys/:id", e.message);
    }
  }

  // Delete named dataset (removes all versions)
  if (uploadedCID && uploadedName) {
    try {
      const { status, data } = await req(
        "DELETE",
        `/dataset/by-name/${uploadedName}`,
        { headers: authHeaders(apiKey) }
      );
      assert(
        "DELETE /dataset/by-name/:name → 200",
        status === 200,
        `status was ${status} — ${JSON.stringify(data)}`
      );
      assert("deletedCount >= 1", data?.deletedCount >= 1, `got ${data?.deletedCount}`);
      log(`     deleted ${data?.deletedCount} version(s)`);
    } catch (e) {
      fail("DELETE /dataset/by-name/:name", e.message);
    }
  }

  // Delete standalone version (if it has no name)
  if (versionCID && !uploadedName) {
    try {
      const { status } = await req("DELETE", `/dataset/${versionCID}`, {
        headers: authHeaders(apiKey),
      });
      assert("DELETE /dataset/:cid → 200", status === 200, `status was ${status}`);
    } catch (e) {
      fail("DELETE /dataset/:cid", e.message);
    }
  }
}

// ── Billing ───────────────────────────────────────────────────────────────────

const BILLING_SECRET = process.env.BILLING_SECRET || "corpus-billing-secret-2026";

async function testBilling() {
  section("Billing: Status + Monthly Debit");

  // GET /billing/status — no secret → 401
  try {
    const { status } = await req("GET", "/billing/status");
    assert("GET /billing/status without secret → 401", status === 401, `status was ${status}`);
  } catch (e) {
    fail("GET /billing/status no secret", e.message);
  }

  // GET /billing/status — wrong secret → 401
  try {
    const { status } = await req("GET", "/billing/status", {
      headers: { "x-billing-secret": "wrong-secret" },
    });
    assert("GET /billing/status wrong secret → 401", status === 401, `status was ${status}`);
  } catch (e) {
    fail("GET /billing/status wrong secret", e.message);
  }

  // GET /billing/status — correct secret → 200
  try {
    const { status, data } = await req("GET", "/billing/status", {
      headers: { "x-billing-secret": BILLING_SECRET },
    });
    assert("GET /billing/status → 200", status === 200, `status was ${status} — ${JSON.stringify(data)}`);
    assert("status has totalDatasets", typeof data?.totalDatasets === "number", JSON.stringify(data));
    assert("status has activeDatasets", typeof data?.activeDatasets === "number", JSON.stringify(data));
    assert("status has expiredDatasets", typeof data?.expiredDatasets === "number", JSON.stringify(data));
    assert("status has walletsAtRisk", typeof data?.walletsAtRisk === "number", JSON.stringify(data));
    assert("status has details array", Array.isArray(data?.details), JSON.stringify(data));
  } catch (e) {
    fail("GET /billing/status", e.message);
  }

  // POST /billing/run-monthly-debit — no secret → 401
  try {
    const { status } = await req("POST", "/billing/run-monthly-debit");
    assert("POST /billing/run-monthly-debit without secret → 401", status === 401, `status was ${status}`);
  } catch (e) {
    fail("POST /billing/run-monthly-debit no secret", e.message);
  }

  // POST /billing/run-monthly-debit — correct secret → 200
  try {
    const { status, data } = await req("POST", "/billing/run-monthly-debit", {
      headers: { "x-billing-secret": BILLING_SECRET },
    });
    assert("POST /billing/run-monthly-debit → 200", status === 200, `status was ${status} — ${JSON.stringify(data)}`);
    assert("result has processedDatasets", typeof data?.processedDatasets === "number", JSON.stringify(data));
    assert("result has processedWallets", typeof data?.processedWallets === "number", JSON.stringify(data));
    assert("result has renewed", typeof data?.renewed === "number", JSON.stringify(data));
    assert("result has expired", typeof data?.expired === "number", JSON.stringify(data));
    assert("result has errors", typeof data?.errors === "number", JSON.stringify(data));
    assert("result has details array", Array.isArray(data?.details), JSON.stringify(data));
    assert("no billing errors", data?.errors === 0, `${data?.errors} billing errors`);
    log(`     processed ${data?.processedDatasets} datasets across ${data?.processedWallets} wallets`);
    log(`     renewed: ${data?.renewed}  expired: ${data?.expired}`);
  } catch (e) {
    fail("POST /billing/run-monthly-debit", e.message);
  }

  // After billing run: check that our uploaded dataset (if any) is still active
  if (uploadedCID && apiKey) {
    try {
      const { status, data } = await req("GET", `/dataset/${uploadedCID}?metadata=1`, {
        headers: authHeaders(apiKey),
      });
      assert(
        "uploaded dataset still accessible after billing run",
        status === 200,
        `status was ${status} — ${JSON.stringify(data)}`
      );
      assert(
        "dataset billingStatus is active",
        data?.billingStatus === "active",
        `billingStatus was ${data?.billingStatus}`
      );
      assert(
        "monthlyStorageCostWei is present",
        typeof data?.monthlyStorageCostWei === "string",
        `monthlyStorageCostWei was ${data?.monthlyStorageCostWei}`
      );
      assert(
        "lastBilledAt is set after billing run",
        data?.lastBilledAt != null,
        `lastBilledAt was ${data?.lastBilledAt}`
      );
    } catch (e) {
      fail("dataset accessible after billing run", e.message);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log(`\nCorpus E2E Test Suite`);
  log(`BASE_URL:        ${BASE_URL}`);
  log(`WALLET_ADDRESS:  ${WALLET_ADDRESS}`);
  log(`WALLET_ADDRESS2: ${WALLET_ADDRESS_2}`);
  log(`Started at:      ${new Date().toISOString()}`);

  try {
    await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
  } catch {
    log(`\n✗ Cannot reach server at ${BASE_URL}`);
    log(`  Make sure the backend is running: npm run dev`);
    process.exit(1);
  }

  await testHealth();
  await testUserCreate();
  await testUserCreateValidation();
  await testApiKeys();
  await testDatasetPrepare();
  await testDatasetUpload();
  await testDatasetList();
  await testDatasetGet();
  await testDatasetByName();
  await testDatasetVersion();
  await testDatasetSharing();
  await testModelRuns();
  await testModelRunOwnership();
  await testTreasury();
  await testBilling();
  await testCleanup();

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  log(`\n${"═".repeat(60)}`);
  log(`Results: ${passed}/${total} passed${skipped > 0 ? `  (${skipped} skipped)` : ""}`);
  if (failures.length > 0) {
    log(`\nFailed tests:`);
    failures.forEach(({ label, reason }) => {
      log(`  ✗  ${label}`);
      log(`     └─ ${reason}`);
    });
  }
  if (skipped > 0) {
    log(`\nNote: ${skipped} test(s) were skipped.`);
    log(`  Treasury: deposit USDFC to StorageTreasury, or unset TREASURY_CONTRACT_ADDRESS`);
    log(`  Provenance anchoring: set TREASURY_EXECUTOR_PRIVATE_KEY + RPC_URL`);
  }
  log(`${"═".repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  log(`\nUnhandled error: ${e.message}`);
  process.exit(1);
});
