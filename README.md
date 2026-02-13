# CodeForge SDK Generation Action

Automatically trigger SDK regeneration on [CodeForge](https://code-forge.net) when your OpenAPI specification changes.

## Quick Start

```yaml
name: Regenerate SDKs

on:
  push:
    paths:
      - 'api/openapi.yaml'

jobs:
  generate-sdks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger SDK Generation
        uses: code-forge/generation-action@v1
        with:
          spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
          api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
          spec_path: api/openapi.yaml
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `spec_id` | Yes | — | CodeForge spec ID (find in the platform UI) |
| `api_token` | Yes | — | CodeForge API token (generate in Account Settings) |
| `spec_path` | Yes | — | Path to your OpenAPI spec file in the repo (e.g. `api/openapi.yaml`) |
| `sdk_ids` | No | all SDKs | Comma-separated SDK IDs to regenerate |
| `wait_for_completion` | No | `true` | Wait for generation to complete before finishing the step |
| `fail_on_error` | No | `true` | Fail the workflow if SDK generation fails |

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Generation status: `success`, `failed`, or `in_progress` |
| `generation_urls` | Comma-separated URLs to view logs on CodeForge |
| `published_packages` | JSON array of published package info (name, version, registry_url) |

### Using Outputs

```yaml
- name: Trigger SDK Generation
  id: generate
  uses: code-forge/generation-action@v1
  with:
    spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
    spec_path: api/openapi.yaml

- name: Print published packages
  run: echo "${{ steps.generate.outputs.published_packages }}"
```

## Setup Guide

### 1. Get your Spec ID

1. Log in to [code-forge.net](https://code-forge.net)
2. Navigate to your spec in the platform UI
3. The spec ID is shown in the URL: `code-forge.net/specs/**spec_123**/...`

### 2. Generate an API Token

1. Go to **Account Settings** → **API Tokens**
2. Click **Generate New Token**
3. Copy the token (it will only be shown once)

### 3. Add Secrets to GitHub

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Add `CODEFORGE_SPEC_ID` with your spec ID
3. Add `CODEFORGE_API_TOKEN` with your API token

## Examples

### Basic — Regenerate All SDKs

```yaml
- uses: code-forge/generation-action@v1
  with:
    spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
    spec_path: openapi.yaml
```

### Regenerate Specific SDKs Only

```yaml
- uses: code-forge/generation-action@v1
  with:
    spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
    spec_path: openapi.yaml
    sdk_ids: sdk_789,sdk_012
```

### Fire-and-Forget (Don't Wait for Completion)

```yaml
- uses: code-forge/generation-action@v1
  with:
    spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
    spec_path: openapi.yaml
    wait_for_completion: false
```

### Continue Even if Generation Fails

```yaml
- uses: code-forge/generation-action@v1
  with:
    spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
    spec_path: openapi.yaml
    fail_on_error: false
```

### Full Example with Multiple SDKs and Outputs

```yaml
name: Regenerate SDKs on Spec Change

on:
  push:
    branches: [main]
    paths:
      - 'api/openapi.yaml'

jobs:
  generate-sdks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger SDK Generation
        id: generate
        uses: code-forge/generation-action@v1
        with:
          spec_id: ${{ secrets.CODEFORGE_SPEC_ID }}
          api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
          spec_path: api/openapi.yaml
          sdk_ids: sdk_typescript,sdk_python,sdk_go
          wait_for_completion: true
          fail_on_error: true

      - name: Print results
        run: |
          echo "Status: ${{ steps.generate.outputs.status }}"
          echo "Logs: ${{ steps.generate.outputs.generation_urls }}"
          echo "Packages: ${{ steps.generate.outputs.published_packages }}"
```

## Troubleshooting

### `Invalid CodeForge API token`

- Verify the token is correctly copied to your GitHub secret (no trailing spaces)
- Check the token hasn't expired or been revoked in Account Settings
- Ensure the secret name in your workflow matches (`CODEFORGE_API_TOKEN`)

### `Spec not found` (404)

- Double-check the `spec_id` value — it should match the ID shown in the CodeForge platform URL
- Confirm the API token has access to this spec

### `Invalid OpenAPI spec`

- Your `openapi.yaml` file contains validation errors
- Run a local validator (e.g. `npx @redocly/cli lint openapi.yaml`) before pushing

### `No such file or directory` for spec_path

- The `spec_path` input must be relative to the repository root
- Ensure the file exists and the path is correct (e.g. `api/openapi.yaml`, not `/api/openapi.yaml`)
- Make sure `actions/checkout@v4` runs before this action

### `Generation timeout`

- Generation took longer than the 5-minute default polling window
- Set `wait_for_completion: false` to trigger generation without waiting, and check the CodeForge platform directly
- If this happens frequently, contact CodeForge support

### `SDK generation failed`

- Check the `generation_urls` output for detailed logs on the CodeForge platform
- Common causes: invalid spec, broken SDK configuration, or a temporary platform issue
- Set `fail_on_error: false` if you want the workflow to continue regardless

## Release Process

```bash
npm install
npm run build
git add dist/index.js
git commit -m "Build dist"
git tag -a v1 -m "v1.0.0"
git push origin main --tags
```

Then create a GitHub release from the `v1` tag.

## License

MIT
