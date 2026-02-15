import * as core from '@actions/core';
import { GenerationResponse } from './api';

export function setOutputs(response: GenerationResponse): void {
  core.setOutput('checks_started', response.checks_started);
  core.setOutput('logs_url', response.logs_url);
}
