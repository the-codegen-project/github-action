import * as core from '@actions/core';

export interface ActionInputs {
  specId: string;
  apiToken: string;
}

export function parseInputs(): ActionInputs {
  const specId = core.getInput('spec_id', { required: true });
  const apiToken = core.getInput('api_token', { required: true });

  return { specId, apiToken };
}
