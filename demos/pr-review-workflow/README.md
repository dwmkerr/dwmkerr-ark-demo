# pr-review-workflow

This workflow demonstrates the orchestration of a pull-request review process against configurable guidelines for a GitHub process.

This demonstrates a combination of agentic and procedural/deterministic operations, along the way highlighting a number of [Ark](https://github.com/mckinsey/agents-at-scale/ark) and Argo capabilities, such as: validation of configuration, risk-management for credentials, running workflow steps in isolated and customised containers, human-in-the-loop approval, recording of actions for audit/forensics, file-management and isolation across a workflow, procedural/deterministic operations, fan-out of work across multiple parallel steps, agentic operations, agentic attribution or 'breadcrumbs', telemetry across complex processes and more.

Along this way, a number of [good practices and risk management considerations](TODO) are highlighted, and described in more detail in this write-up. [Minio](https://www.min.io/)[^1]TODO is used for file-storage - for enterprise environments this can be switched to Amazon S3, Google Cloud Storage, etc.

TODO session id
TODO note claude upcoming

<!-- vim-markdown-toc GFM -->

- [Overview](#overview)
- [Installation](#installation)
- [Running the Workflow](#running-the-workflow)
- [Inspecting Output, Reports and Artifacts](#inspecting-output-reports-and-artifacts)
- [Viewing Telemetry Data](#viewing-telemetry-data)
- [TODO](#todo)

<!-- vim-markdown-toc -->

## Overview

The workflow performs the following actions:

**Preparation and Validation of Configuration**

The first step validates that the required resources and capabilities are installed, such as agents, models and MCP servers. It also ensures that the configuration parameters passed to the workflow are valid.

**Approval**

The second requests approval, after summarising the potential impact or risk of the workflow. This includes assessing provided credentials to determine whether permissions are overly permissive or risky.

A summary of the approval is written if/when approval completes. The approval can be skipped with via configuration parameters - this is not recommended but can be used to make it easier to demo or test the process.

**Listing open Pull Requests in a Repository**

This operation is deterministic, rather than agentic, highlighting when simple procedural operations should be performed over agentic operations. Least-privilege and scalable approaches are used.

**Agentic Review of Pull Requests against Configurable Standards**

An agent is used to review each pull request, against a configurable and version controlled set of standards, via MCP. TODO note that model could be configured based on complexity/scope.
4. Labels for attribution
3. Structured output? TODO avoid magic strings

**Optional Commentary on Pull Requests, with Attribution**

In this optional step, the review of the pull request is published, along with labels and tags that attribute the work to the specific agent, as 'breadcrumbs' for later review.
4. Partial tool calls?
4. MCP 'currying'
4. Optionally comment on each PR - but update/replace comment if already commented

**Final Summarisation and Report with optional Cleanup**

A final summarisation of all steps is made, with a final report saved to long-term storage.
TODO: Show summary with `ark query output` or `ark dashboard`
5. Clean up?

## Installation

First, ensure that [Ark](http://github.com/mckinsey/agents-at-scale-ark) is installed. Run the commands below, or follow the [Ark Quickstart Guide](https://mckinsey.github.io/agents-at-scale-ark/quickstart/):

```bash
# Install the Ark CLI (Node.JS and NPM required).
npm install -g @agents-at-scale/ark

# Install Ark. Wait for up to 5m for ark to be ready.
ark install
ark status --wait-for-ready=5m

# Use the dashboard to configure a default model (or check the docs).
ark dashboard
```

You must have a default model configured, run `ark dashboard` and follow the instructions, or check [the docs](https://mckinsey.github.io/agents-at-scale-ark/quickstart/).

Now install [Argo Workflows for Ark](https://mckinsey.github.io/agents-at-scale-ark/developer-guide/workflows/argo-workflows), along with [Minio as an Artifact Repository](https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/#configuring-minio) for artifact storage. Note that at a later date Argo will be optionally installed as part of the main Ark installation and this step will not be required:

```bash
# First install Minio, which will be used for file storage.
helm upgrade minio-operator operator \
  --install \
  --repo https://operator.min.io \
  --namespace minio-operator \
  --create-namespace \
  --version 7.1.1

# Now install Argo workflows, with minio enabled.
helm upgrade argo-workflows \
  oci://ghcr.io/mckinsey/agents-at-scale-ark/charts/argo-workflows \
  --install \
  --set minio.enabled=true

# These services can take a while to install, check the status with:
kubectl get tenant                                           # will show 'green'
kubectl get pods -n minio-operator                           # will show 'ready'
kubectl get pods -l app.kubernetes.io/part-of=argo-workflows # will show 'ready'
```

You can now check the Argo Workflows dashboard as well as the Minio dashboard:

```bash
# Show the Argo Workflows dashboard:
kubectl port-forward svc/argo-workflows-server 2746:2746
# http://localhost:2746

# Show the minio dashboard:
kubectl port-forward svc/myminio-console 9443:9443
# https://localhost:9443
# Username: minio
# Password: minio123
```

**TODO**

Install required MCP servers and Ark resources. These must be configured to use a shared file-system so that files can be shared between steps of the workflow (more detailed descriptions of workflow and MCP file management are being added to the Ark documentation and best-practices):

```bash
TODO install X   # comment why
# Install ark-demo as usual, ensuring shell and GitHub MCP servers are enabled:
# e.g:
# make install
# Then upgrade to add workspace configuration:
helm upgrade ark-demo oci://ghcr.io/dwmkerr/charts/ark-demo \
  --set shell-mcp.volumes[0].name=workspace \
  --set shell-mcp.volumes[0].persistentVolumeClaim.claimName=github-mcp-workspace \
  --set shell-mcp.volumeMounts[0].name=workspace \
  --set shell-mcp.volumeMounts[0].mountPath=/workspace \
  --reuse-values
```

TODO telemetry phoenix kubectl port-forward -n phoenix svc/phoenix-svc 6006:6006


Install the workflow itself:

```
kubectl apply -f ./pr-review-workflow.yaml
```

## Running the Workflow

TODO
TODO show services in ark

```bash
# To run the workflow, option 1 is to use the argo cli:
argo submit --from workflowtemplate/pr-review-workflow \
    -p github-org=mckinsey \
    -p github-repo=agents-at-scale-ark \
    --watch

# Option 2 is to use the UI. If you are using `devspace dev` for
# `ark-workflows` this port is automatically forwarded.
kubectl port-forward 2746:2746 &
open http://localhost:2746
```

## Inspecting Output, Reports and Artifacts

## Viewing Telemetry Data


TODO S3 CLI

```
# Create a secret for argo to access minio.
kubectl create secret generic minio-credentials \
    --from-literal=accessKey="${username}" \
    --from-literal=secretKey="${password}"

# We're going to configure argo to point to minio. This requires the namespace
# qualified service name. This little snippet is janky - we're grabbing the kube
# context namespace (as all the other commands in this script don't use '-n' we
# are essentially doing everything in the current context namespace).
# Get that namespace - we need it for the service URL used in the S3 config
# below.
namespace="$(kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}')"
namespace="${namespace:-default}"
```

## TODO
TODO Dashboard
any way to pull out scripts? configmap?
