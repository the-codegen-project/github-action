import * as core from '@actions/core';
import { GenerationResponse } from './api';

export function setOutputs(response: GenerationResponse): void {
  core.setOutput('status', response.status);

  const urls = response.sdks.map(sdk => sdk.logs_url).join(',');
  core.setOutput('generation_urls', urls);

  const packages = response.sdks
    .filter(sdk => sdk.published_package)
    .map(sdk => sdk.published_package);
  core.setOutput('published_packages', JSON.stringify(packages));
}
