# GHCR ARM64 Deployment Design

## Goal
Build the public fork image on GitHub Actions and let the Armbian (`aarch64`) home server pull it without running a local source build.

## CI publishing
- A new workflow runs on pushes to `master` and via `workflow_dispatch`.
- It logs into GitHub Container Registry with the repository `GITHUB_TOKEN`.
- It builds `sync-server.Dockerfile` for `linux/arm64` only.
- It publishes public image tags:
  - `ghcr.io/xpbach2508/actual-budget:master`
  - `ghcr.io/xpbach2508/actual-budget:sha-<commit>`
- The workflow has `contents: read` and `packages: write` permissions.

## Home-server deployment
- The compose service uses `image: ghcr.io/xpbach2508/actual-budget:master`, not `build:`.
- It keeps the existing bind mount `${HOME}/projects/actual_budget/actual-data:/data` and port `5006:5006`.
- Upgrade command: `docker compose pull && docker compose up -d`.

## Non-goals
- No AMD64 image.
- No private registry credentials or PAT on the home server.
- No automatic SSH deployment; updates remain an explicit home-server command.
