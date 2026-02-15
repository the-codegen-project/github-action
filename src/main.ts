import * as core from '@actions/core';
import { verifyToken, triggerGeneration } from './api';
import { parseInputs } from './inputs';
import { setOutputs } from './outputs';

async function run(): Promise<void> {
  try {
    const inputs = parseInputs();

    const isValid = await verifyToken(inputs.apiToken, inputs.apiUrl);
    if (!isValid) {
      throw new Error('Invalid CodeForge API token. Generate one at code-forge.net/settings');
    }

    const response = await triggerGeneration({
      specId: inputs.specId,
      apiToken: inputs.apiToken,
      apiBase: inputs.apiUrl,
      commitSha: process.env.GITHUB_SHA || '',
      commitMessage: process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE || '',
      repository: process.env.GITHUB_REPOSITORY || '',
    });

    core.info(`Generation triggered: ${response.checks_started} check(s) started`);
    core.info(`Logs: ${response.logs_url}`);
    setOutputs(response);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with an unknown error');
    }
  }
}

run();
