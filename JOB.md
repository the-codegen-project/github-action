# Task: Implement CodeForge SDK Generation GitHub Action

You are building a GitHub Action that triggers SDK regeneration on CodeForge's platform when OpenAPI specs change.

## What This Action Does

When a developer commits changes to their OpenAPI specification file (e.g., `openapi.yaml`), this GitHub Action should:

1. Read the spec file from the repository
2. Authenticate with CodeForge's API
3. Trigger SDK regeneration for all SDKs associated with that spec
4. Wait for completion (optional)
5. Report success/failure back to GitHub workflow

## Repository Structure

Create a new GitHub repository with this structure:code-forge/generation-action/
├── action.yml # Action metadata (defines inputs/outputs)
├── dist/
│ └── index.js # Compiled bundle (created by @vercel/ncc)
├── src/
│ ├── main.ts # Entry point - orchestrates the flow
│ ├── api.ts # CodeForge API client
│ ├── inputs.ts # Parse and validate action inputs
│ └── outputs.ts # Set GitHub Action outputs
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md

## Action Inputs & Outputs

### Inputs (action.yml)

````yamlname: 'CodeForge SDK Generation'
description: 'Automatically generate and publish SDKs when your OpenAPI spec changes'
inputs:
spec_id:
description: 'CodeForge spec ID (find in platform UI)'
required: true
api_token:
description: 'CodeForge API token (generate in Account Settings)'
required: true
spec_path:
description: 'Path to OpenAPI spec file in repo (e.g., api/openapi.yaml)'
required: true
sdk_ids:
description: 'Comma-separated SDK IDs to regenerate (optional, defaults to all)'
required: false
wait_for_completion:
description: 'Wait for generation to complete (default: true)'
required: false
default: 'true'
fail_on_error:
description: 'Fail workflow if generation fails (default: true)'
required: false
default: 'true'
outputs:
status:
description: 'Generation status: success | failed | in_progress'
generation_urls:
description: 'Comma-separated URLs to view logs on CodeForge'
published_packages:
description: 'JSON array of published package info'
runs:
using: 'node20'
main: 'dist/index.js'

### Outputs

- `status` — "success" | "failed" | "in_progress"
- `generation_urls` — Comma-separated URLs to CodeForge log pages
- `published_packages` — JSON string: `[{"name":"@pkg/sdk","version":"1.0.0","registry_url":"..."}]`

## CodeForge API Specification

Your action will call these CodeForge API endpoints:

### 1. Verify Token
**Endpoint:** `POST https://code-forge.net/api/v1/auth/token`

**Request:**
```json{
"api_token": "cfk_xxx"
}

**Response (200 OK):**
```json{
"valid": true,
"user_id": "user_456"
}

**Response (401 Unauthorized):**
```json{
"valid": false,
"error": "Invalid token"
}

### 2. Trigger Generation
**Endpoint:** `POST https://code-forge.net/api/v1/specs/{spec_id}/generate`

**Headers:**Authorization: Bearer cfk_xxx
Content-Type: application/json

**Request:**
```json{
"spec_content": "<entire openapi.yaml file content as string>",
"spec_path": "api/openapi.yaml",
"sdk_ids": ["sdk_789", "sdk_012"],
"trigger_source": "github_action",
"commit_sha": "abc123def456",
"commit_message": "Update API endpoints",
"repository": "username/repo-name"
}

**Response (200 OK):**
```json{
"generation_run_id": "run_345",
"status": "queued",
"sdks": [
{
"id": "sdk_789",
"name": "TypeScript (Fetch)",
"status": "queued",
"logs_url": "https://code-forge.net/specs/spec_123/sdks/sdk_789/runs/run_345"
}
],
"estimated_completion_seconds": 120
}

**Response (400 Bad Request):**
```json{
"error": "Invalid OpenAPI spec",
"details": "Missing required field: paths"
}

**Response (404 Not Found):**
```json{
"error": "Spec not found"
}

### 3. Check Generation Status
**Endpoint:** `GET https://code-forge.net/api/v1/generation-runs/{run_id}`

**Headers:**Authorization: Bearer cfk_xxx

**Response (200 OK):**
```json{
"id": "run_345",
"status": "completed",
"sdks": [
{
"id": "sdk_789",
"name": "TypeScript (Fetch)",
"status": "completed",
"published_package": {
"name": "@mycompany/api-sdk",
"version": "1.2.3",
"registry_url": "https://www.npmjs.com/package/@mycompany/api-sdk"
},
"logs_url": "https://code-forge.net/specs/spec_123/sdks/sdk_789/runs/run_345"
}
],
"completed_at": "2025-02-13T10:30:00Z",
"duration_seconds": 87
}

**Possible status values:** `queued`, `running`, `completed`, `failed`

## Implementation Requirements

### src/main.ts

Entry point that orchestrates the flow:
```typescriptimport * as core from '@actions/core';
import * as fs from 'fs/promises';
import { verifyToken, triggerGeneration, pollGenerationStatus } from './api';
import { parseInputs } from './inputs';
import { setOutputs } from './outputs';async function run() {
try {
// 1. Parse inputs
const inputs = parseInputs();// 2. Read OpenAPI spec from repo
const specContent = await fs.readFile(inputs.specPath, 'utf-8');// 3. Verify API token
const isValid = await verifyToken(inputs.apiToken);
if (!isValid) {
  throw new Error('Invalid CodeForge API token. Generate one at code-forge.net/settings');
}// 4. Trigger generation
const triggerResponse = await triggerGeneration({
  specId: inputs.specId,
  apiToken: inputs.apiToken,
  specContent,
  specPath: inputs.specPath,
  sdkIds: inputs.sdkIds,
  commitSha: process.env.GITHUB_SHA || '',
  commitMessage: process.env.GITHUB_EVENT?.head_commit?.message || '',
  repository: process.env.GITHUB_REPOSITORY || ''
});core.info(`✓ Generation triggered: ${triggerResponse.generation_run_id}`);// 5. Wait for completion (if enabled)
let finalStatus = triggerResponse;
if (inputs.waitForCompletion) {
  core.info('Waiting for generation to complete...');
  finalStatus = await pollGenerationStatus(
    triggerResponse.generation_run_id,
    inputs.apiToken
  );
}// 6. Set outputs
setOutputs(finalStatus);// 7. Fail if generation failed and fail_on_error is true
if (finalStatus.status === 'failed' && inputs.failOnError) {
  core.setFailed('SDK generation failed. Check logs at: ' +
    finalStatus.sdks.map(s => s.logs_url).join(', '));
}} catch (error) {
core.setFailed(Action failed: ${error.message});
}
}run();

### src/api.ts

CodeForge API client with all network calls:
```typescriptimport * as core from '@actions/core';const API_BASE = 'https://code-forge.net/api/v1';export async function verifyToken(token: string): Promise<boolean> {
const response = await fetch(${API_BASE}/auth/token, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ api_token: token })
});if (!response.ok) return false;
const data = await response.json();
return data.valid === true;
}export async function triggerGeneration(params: {
specId: string;
apiToken: string;
specContent: string;
specPath: string;
sdkIds?: string[];
commitSha: string;
commitMessage: string;
repository: string;
}): Promise<GenerationResponse> {
const response = await fetch(${API_BASE}/specs/${params.specId}/generate, {
method: 'POST',
headers: {
'Authorization': Bearer ${params.apiToken},
'Content-Type': 'application/json'
},
body: JSON.stringify({
spec_content: params.specContent,
spec_path: params.specPath,
sdk_ids: params.sdkIds,
trigger_source: 'github_action',
commit_sha: params.commitSha,
commit_message: params.commitMessage,
repository: params.repository
})
});if (!response.ok) {
const error = await response.json();
throw new Error(CodeForge API error: ${error.error || response.statusText});
}return response.json();
}export async function pollGenerationStatus(
runId: string,
apiToken: string,
maxAttempts = 60,
intervalMs = 5000
): Promise<GenerationResponse> {
for (let i = 0; i < maxAttempts; i++) {
const response = await fetch(${API_BASE}/generation-runs/${runId}, {
headers: { 'Authorization': Bearer ${apiToken} }
});if (!response.ok) {
  throw new Error(`Failed to check generation status: ${response.statusText}`);
}const data = await response.json();if (data.status === 'completed' || data.status === 'failed') {
  return data;
}core.info(`Generation status: ${data.status} (${i + 1}/${maxAttempts})`);
await new Promise(resolve => setTimeout(resolve, intervalMs));
}throw new Error('Generation timeout: took longer than expected');
}interface GenerationResponse {
generation_run_id: string;
status: 'queued' | 'running' | 'completed' | 'failed';
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

### src/inputs.ts

Parse and validate all action inputs:
```typescriptimport * as core from '@actions/core';export interface ActionInputs {
specId: string;
apiToken: string;
specPath: string;
sdkIds?: string[];
waitForCompletion: boolean;
failOnError: boolean;
}export function parseInputs(): ActionInputs {
const specId = core.getInput('spec_id', { required: true });
const apiToken = core.getInput('api_token', { required: true });
const specPath = core.getInput('spec_path', { required: true });
const sdkIdsInput = core.getInput('sdk_ids');
const waitForCompletion = core.getInput('wait_for_completion') === 'true';
const failOnError = core.getInput('fail_on_error') === 'true';return {
specId,
apiToken,
specPath,
sdkIds: sdkIdsInput ? sdkIdsInput.split(',').map(s => s.trim()) : undefined,
waitForCompletion,
failOnError
};
}

### src/outputs.ts

Set GitHub Action outputs:
```typescriptimport * as core from '@actions/core';export function setOutputs(response: any) {
core.setOutput('status', response.status);const urls = response.sdks.map((sdk: any) => sdk.logs_url).join(',');
core.setOutput('generation_urls', urls);const packages = response.sdks
.filter((sdk: any) => sdk.published_package)
.map((sdk: any) => sdk.published_package);
core.setOutput('published_packages', JSON.stringify(packages));
}

## Build Configuration

### package.json
```json{
"name": "codegen-action",
"version": "1.0.0",
"main": "dist/index.js",
"scripts": {
"build": "ncc build src/main.ts -o dist --source-map --minify",
"test": "jest"
},
"dependencies": {
"@actions/core": "^1.10.0"
},
"devDependencies": {
"@vercel/ncc": "^0.38.0",
"typescript": "^5.0.0"
}
}

### tsconfig.json
```json{
"compilerOptions": {
"target": "ES2022",
"module": "commonjs",
"lib": ["ES2022"],
"outDir": "./dist",
"strict": true,
"esModuleInterop": true,
"skipLibCheck": true,
"forceConsistentCasingInFileNames": true
},
"include": ["src/**/*"],
"exclude": ["node_modules", "dist"]
}

## Testing Requirements

Before releasing v1, test:

1. **Valid token:** Action authenticates successfully
2. **Invalid token:** Action fails with clear error message
3. **Missing spec file:** Action fails with file not found error
4. **Invalid spec_id:** API returns 404, action fails gracefully
5. **Generation success:** Action completes, sets correct outputs
6. **Generation failure:** Action fails if `fail_on_error=true`
7. **Multiple SDKs:** Action handles multiple SDKs in response
8. **Polling timeout:** Action handles long-running generations
9. **Network errors:** Action retries and fails gracefully

## README.md Content

Write a comprehensive README with:

1. **Quick start** — Copy-paste workflow example
2. **Inputs** — Table of all inputs with descriptions
3. **Outputs** — Table of all outputs
4. **Setup guide** — How to get `spec_id` and `api_token`
5. **Examples** — Basic, multiple SDKs, specific SDK only
6. **Troubleshooting** — Common errors and solutions

## Release Process

1. Build: `npm run build`
2. Commit `dist/index.js` (required for GitHub Actions)
3. Tag: `git tag -a v1 -m "v1.0.0"`
4. Push: `git push origin v1`
5. Create GitHub release

Users will reference as: `uses: code-forge/generation-action@v1`

## Success Criteria

Action is complete when:
- ✅ A developer can copy the example workflow and it works
- ✅ Action authenticates with CodeForge API
- ✅ Action reads spec file and triggers generation
- ✅ Action waits for completion and reports status
- ✅ Action sets all outputs correctly
- ✅ Action handles errors gracefully with clear messages
- ✅ README has everything needed to use it without support
````
