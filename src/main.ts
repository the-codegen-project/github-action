import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { verifyToken, triggerGeneration, pollGenerationStatus } from './api';
import { parseInputs } from './inputs';
import { setOutputs } from './outputs';

async function run(): Promise<void> {
  try {
    // 1. Parse inputs
    const inputs = parseInputs();

    // 2. Read OpenAPI spec from repo
    const specContent = await fs.readFile(inputs.specPath, 'utf-8');

    // 3. Verify API token
    const isValid = await verifyToken(inputs.apiToken);
    if (!isValid) {
      throw new Error('Invalid CodeForge API token. Generate one at code-forge.net/settings');
    }

    // 4. Trigger generation
    const triggerResponse = await triggerGeneration({
      specId: inputs.specId,
      apiToken: inputs.apiToken,
      specContent,
      specPath: inputs.specPath,
      sdkIds: inputs.sdkIds,
      commitSha: process.env.GITHUB_SHA || '',
      commitMessage: (process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE) || '',
      repository: process.env.GITHUB_REPOSITORY || ''
    });

    core.info(`Generation triggered: ${triggerResponse.generation_run_id}`);

    // 5. Wait for completion (if enabled)
    let finalStatus = triggerResponse;
    if (inputs.waitForCompletion) {
      core.info('Waiting for generation to complete...');
      finalStatus = await pollGenerationStatus(
        triggerResponse.generation_run_id,
        inputs.apiToken
      );
    }

    // 6. Set outputs
    setOutputs(finalStatus);

    // 7. Fail if generation failed and fail_on_error is true
    if (finalStatus.status === 'failed' && inputs.failOnError) {
      core.setFailed(
        'SDK generation failed. Check logs at: ' +
        finalStatus.sdks.map(s => s.logs_url).join(', ')
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with an unknown error');
    }
  }
}

run();
