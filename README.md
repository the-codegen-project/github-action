# CodeForge SDK Generation Action

Automatically trigger SDK regeneration on [CodeForge](https://code-forge.net)
when your OpenAPI specification changes.

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
        uses: code-forge/generation-action@v0.2.0
        with:
          spec_id: 4aa2cde8-3978-4b0a-b9b8-4fef6d440e0e
          api_token: ${{ secrets.CODEFORGE_API_TOKEN }}
```

## Inputs

| Input       | Required | Description                                              |
| ----------- | -------- | -------------------------------------------------------- |
| `spec_id`   | Yes      | CodeForge document instance ID (find in the platform UI) |
| `api_token` | Yes      | CodeForge API token (generate in Account Settings)       |

## Outputs

| Output           | Description                                   |
| ---------------- | --------------------------------------------- |
| `checks_started` | Number of generation checks that were started |
| `logs_url`       | URL to view generation logs on CodeForge      |

### Using Outputs

```yaml
- name: Trigger SDK Generation
  id: generate
  uses: code-forge/generation-action@v0.2.0
  with:
    spec_id: 4aa2cde8-3978-4b0a-b9b8-4fef6d440e0e
    api_token: ${{ secrets.CODEFORGE_API_TOKEN }}

- name: Print logs URL
  run: echo "${{ steps.generate.outputs.logs_url }}"
```

## Setup Guide

### 1. Get your Document Instance ID

1. Log in to [code-forge.net](https://code-forge.net)
2. Navigate to your document instance in the platform UI
3. The ID is shown in the URL:
   `code-forge.net/platform/document-instances/**your-id**/...`

### 2. Generate an API Token

1. Go to **Account Settings** → **API Tokens**
2. Click **Generate New Token**
3. Copy the token (it will only be shown once)

### 3. Add your API Token to GitHub

1. Go to your repository → **Settings** → **Secrets and variables** →
   **Actions**
2. Under **Secrets**, add `CODEFORGE_API_TOKEN` with your API token

## Troubleshooting

### `Invalid CodeForge API token`

- Verify the token is correctly copied to your GitHub secret (no trailing
  spaces)
- Check the token hasn't expired or been revoked in Account Settings
- Ensure the secret name in your workflow matches (`CODEFORGE_API_TOKEN`)

### `Specification not found` (404)

- Double-check the `spec_id` value — it should match the document instance ID
  shown in the CodeForge platform URL
- Confirm the API token has access to this document instance

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
