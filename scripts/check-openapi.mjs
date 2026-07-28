const baseUrl = (
  process.env.NEXT_PUBLIC_BESEEN_API_URL ?? "http://localhost:5000/v1"
).replace(/\/$/, "");

const requiredPaths = [
  "/v1/auth/config",
  "/v1/auth/login/challenge",
  "/v1/auth/login",
  "/v1/auth/registration/challenge",
  "/v1/auth/register",
  "/v1/auth/refresh",
  "/v1/auth/logout",
  "/v1/users/me",
  "/v1/users/username/availability",
  "/v1/users/{username}/keys",
  "/v1/broadcasts/feed",
  "/v1/broadcasts/drafts",
  "/v1/broadcasts/drafts/{draftId}",
  "/v1/broadcasts/drafts/{draftId}/recipients",
  "/v1/broadcasts/drafts/{draftId}/recipient-keys",
  "/v1/broadcasts/drafts/{draftId}/finalize",
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

const openapi = await fetchJson(`${baseUrl}/openapi.json`);
if (typeof openapi.openapi !== "string" || !openapi.openapi.startsWith("3.1")) {
  throw new Error(`Expected OpenAPI 3.1, received ${openapi.openapi ?? "unknown"}`);
}

const missingPaths = requiredPaths.filter((path) => !openapi.paths?.[path]);
if (missingPaths.length > 0) {
  throw new Error(`Missing required API paths:\n- ${missingPaths.join("\n- ")}`);
}
if (openapi.paths?.["/v1/auth/registration/verify"]) {
  throw new Error("Legacy registration verification path must not be exposed.");
}

for (const [path, method] of [
  ["/v1/auth/login", "post"],
  ["/v1/auth/register", "post"],
]) {
  const properties =
    openapi.paths?.[path]?.[method]?.requestBody?.content?.["application/json"]
      ?.schema?.properties ?? {};
  if (!properties.signedTransactionXdr || properties.signature) {
    throw new Error(`${method.toUpperCase()} ${path} must accept signedTransactionXdr only.`);
  }
}

const authEnvelope = await fetchJson(`${baseUrl}/auth/config`);
const config = authEnvelope.result;

if (config?.protocol?.stellarNetwork !== "testnet") {
  throw new Error(
    `BeSeen API must run on Stellar Testnet; received ${config?.protocol?.stellarNetwork ?? "unknown"}`,
  );
}

if (
  config.protocol.authenticationStandard !== "SEP-10" ||
  config.protocol.walletMethod !== "signTransaction" ||
  config.protocol.transactionSubmissionRequired !== false ||
  config.keyDerivation?.source !== "CLIENT_GENERATED" ||
  config.keyDerivation?.kdf?.name !== "HKDF-SHA-256" ||
  config.keyDerivation?.kdf?.input !==
    "CLIENT-RANDOM-32-BYTE-MASTER-SECRET"
) {
  throw new Error("Authentication or key-derivation protocol no longer matches the client.");
}

console.log(
  `Contract OK: OpenAPI ${openapi.openapi}, ${requiredPaths.length} required paths, Stellar Testnet, SEP-10, client-generated HKDF-SHA-256 keys.`,
);
