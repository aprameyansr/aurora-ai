const BASE = "http://localhost:8000";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || json.error || "Request failed");
  return json;
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

// ── DATASET ────────────────────────────────────────────────
export async function uploadDataset(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/dataset/upload`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "Upload failed");
  return json;
}

// ── BIAS ───────────────────────────────────────────────────
export async function analyzeBias(data: {
  file_path: string; target: string; sensitive: string; extra_sensitive?: string[];
}) {
  return post("/bias/analyze", data);
}

// ── EXPLAIN ────────────────────────────────────────────────
export async function getExplanation(biasMetrics: unknown) {
  return post("/explain", { bias_metrics: biasMetrics });
}

// ── MITIGATION ─────────────────────────────────────────────
export async function runMitigation(data: { file_path: string; target: string; sensitive: string }) {
  return post("/mitigation/run", data);
}

// ── AUDIT ──────────────────────────────────────────────────
export async function generateAudit(data: {
  filename: string; target: string; sensitive: string;
  bias_result: unknown; explanation: unknown; mitigation_result?: unknown;
}) {
  return post("/audit/generate", data);
}

// ── SIMULATION ─────────────────────────────────────────────
export async function initSimulation(file_path: string, target: string, sensitive_feature = "") {
  return post("/simulation/init", { file_path, target, sensitive_feature });
}

export async function simPredict(input: Record<string, unknown>) {
  return post("/simulation/predict", { input });
}

export async function simWhatIf(input: Record<string, unknown>, modified: Record<string, unknown>) {
  return post("/simulation/what-if", { input, modified });
}

export async function simCounterfactual(input: Record<string, unknown>, desired_outcome = 1, n = 5) {
  return post("/simulation/counterfactual", { input, desired_outcome, n });
}

export async function simBiasTest(input: Record<string, unknown>, sensitive_feature: string) {
  return post("/simulation/bias-test", { input, sensitive_feature });
}

export async function simScenarios(base_input: Record<string, unknown>, n_scenarios = 4) {
  return post("/simulation/scenarios", { base_input, n_scenarios });
}

export async function simSweep(base_input: Record<string, unknown>, feature: string, steps = 12) {
  return post("/simulation/sweep", { base_input, feature, steps });
}
