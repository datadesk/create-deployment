// packages
import { error, getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

// types
import type { ReposCreateDeploymentResponseData } from '@octokit/types/dist-types/generated/Endpoints';

type DeploymentStatusStates =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success';

async function run() {
  try {
    // The commit SHA that triggered the workflow run
    const { ref, sha } = context;

    // The owner and repo names of this repository
    const { owner, repo } = context.repo;

    // The prepared URL to the workflow check page
    const log_url = `https://github.com/${owner}/${repo}/commit/${sha}/checks`;

    // Inputs
    const token = getInput('github-token', { required: true });
    const environment = getInput('environment', { required: true });
    const description = getInput('description', { required: false });
    const state = getInput('initial-state', {
      required: true,
    }) as DeploymentStatusStates;
    const environment_url = getInput('environment-url', { required: false });

    // the authenticated GitHub client
    const client = getOctokit(token, { previews: ['ant-man', 'flash'] });

    // create the deployment
    const deployment = await client.repos.createDeployment({
      owner,
      repo,
      ref,
      auto_merge: false,
      required_contexts: [],
      environment,
      description,
    });

    // assert we get something back
    const data = deployment.data as ReposCreateDeploymentResponseData;

    // pull out the deployment ID
    const deployment_id = data.id;

    // create the initial deployment status
    const status = await client.repos.createDeploymentStatus({
      owner,
      repo,
      deployment_id,
      state,
      log_url,
      environment_url,
    });

    setOutput('deployment-id', deployment_id.toString());
    setOutput('deployment-status-id', status.data.id.toString());
  } catch (e) {
    error(e);
    setFailed(e.message);
  }
}

run();
