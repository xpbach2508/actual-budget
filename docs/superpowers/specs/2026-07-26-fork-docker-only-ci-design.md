# Fork Docker-Only CI Design

## Goal
Keep the public fork's automatic GitHub Actions workload limited to publishing its ARM64 Docker image.

## Behavior
- `Publish Fork ARM64 Image` remains triggered by pushes to `master`.
- Its runner changes to GitHub-hosted native ARM64: `ubuntu-24.04-arm`.
- Upstream CI workflows that currently run on push (`build.yml`, `check.yml`, and `codeql.yml`) become manual-only via `workflow_dispatch` in this fork.
- Their workflow files remain available for manually requested validation.

## Non-goals
- No self-hosted runner.
- No AMD64 image build.
- No removal of the workflows or their pull-request/scheduled behavior beyond the push trigger.
