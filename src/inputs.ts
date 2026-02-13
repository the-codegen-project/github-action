import * as core from '@actions/core';

export interface ActionInputs {
  specId: string;
  apiToken: string;
  specPath: string;
  sdkIds?: string[];
  waitForCompletion: boolean;
  failOnError: boolean;
}

export function parseInputs(): ActionInputs {
  const specId = core.getInput('spec_id', { required: true });
  const apiToken = core.getInput('api_token', { required: true });
  const specPath = core.getInput('spec_path', { required: true });
  const sdkIdsInput = core.getInput('sdk_ids');
  const waitForCompletion = core.getInput('wait_for_completion') === 'true';
  const failOnError = core.getInput('fail_on_error') === 'true';

  return {
    specId,
    apiToken,
    specPath,
    sdkIds: sdkIdsInput ? sdkIdsInput.split(',').map(s => s.trim()) : undefined,
    waitForCompletion,
    failOnError
  };
}
