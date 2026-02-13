import * as core from "@actions/core";

const API_BASE = "https://api.code-forge.net/";

export interface GenerationResponse {
  generation_run_id: string;
  status: "queued" | "running" | "completed" | "failed";
  sdks: Array<{
    id: string;
    name: string;
    status: string;
    logs_url: string;
    published_package?: {
      name: string;
      version: string;
      registry_url: string;
    };
  }>;
}

export async function verifyToken(token: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/action/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_token: token }),
  });

  if (!response.ok) return false;
  const data = (await response.json()) as { valid: boolean };
  return data.valid === true;
}

export async function triggerGeneration(params: {
  specId: string;
  apiToken: string;
  specContent: string;
  specPath: string;
  sdkIds?: string[];
  commitSha: string;
  commitMessage: string;
  repository: string;
}): Promise<GenerationResponse> {
  const response = await fetch(
    `${API_BASE}/generation-entity/${params.specId}/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spec_content: params.specContent,
        spec_path: params.specPath,
        sdk_ids: params.sdkIds,
        trigger_source: "github_action",
        commit_sha: params.commitSha,
        commit_message: params.commitMessage,
        repository: params.repository,
      }),
    },
  );

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(
      `CodeForge API error: ${error.error || response.statusText}`,
    );
  }

  return response.json() as Promise<GenerationResponse>;
}

export async function pollGenerationStatus(
  runId: string,
  apiToken: string,
  maxAttempts = 60,
  intervalMs = 5000,
): Promise<GenerationResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${API_BASE}/generation-runs/${runId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to check generation status: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GenerationResponse;

    if (data.status === "completed" || data.status === "failed") {
      return data;
    }

    core.info(`Generation status: ${data.status} (${i + 1}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Generation timeout: took longer than expected");
}
