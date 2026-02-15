export interface GenerationResponse {
  checks_started: number;
  logs_url: string;
}

export async function verifyToken(token: string, apiBase: string): Promise<boolean> {
  const response = await fetch(new URL("/action/auth/token", apiBase), {
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
  apiBase: string;
  commitSha: string;
  commitMessage: string;
  repository: string;
}): Promise<GenerationResponse> {
  const url = new URL(`/document-instance/${params.specId}/generate`, params.apiBase);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      commit_sha: params.commitSha,
      commit_message: params.commitMessage,
      repository: params.repository,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(
      `CodeForge API error: ${error.error || response.statusText}`,
    );
  }

  return response.json() as Promise<GenerationResponse>;
}
