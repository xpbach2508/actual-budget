# GHCR ARM64 Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a public ARM64 Docker image of the fork on pushes to `master`, so the Armbian home server pulls rather than builds it.

**Architecture:** A GitHub Actions workflow uses Buildx and the repository `GITHUB_TOKEN` to push `sync-server.Dockerfile` to GHCR. Docker metadata supplies stable `master` and immutable commit-SHA tags. The home server changes from a compose build to the published image while retaining its data bind mount.

**Tech Stack:** GitHub Actions, Docker Buildx, GitHub Container Registry, Docker Compose.

## Global Constraints

- Build only `linux/arm64` for the Armbian `aarch64` home server.
- Publish `ghcr.io/xpbach2508/actual-budget:master` and a commit-SHA tag.
- Use no home-server PAT because the GHCR package is public.
- Preserve `${HOME}/projects/actual_budget/actual-data:/data` and port `5006:5006`.

---

## File Structure

- `.github/workflows/publish-fork-image.yml` — ARM64 GHCR build/push workflow.
- `docs/deployment/home-server-ghcr.md` — exact home-server image-pull compose and update commands.

### Task 1: Add the publishing workflow

**Files:**
- Create: `.github/workflows/publish-fork-image.yml`

**Interfaces:**
- Produces: public GHCR tags `master` and `sha-<short commit>`.
- Consumes: `sync-server.Dockerfile`, GitHub `GITHUB_TOKEN`, public repository package permissions.

- [ ] **Step 1: Add workflow YAML**

Create a workflow triggered on `push` to `master` and `workflow_dispatch`, with:

```yaml
permissions:
  contents: read
  packages: write
```

Use checkout, `docker/setup-buildx-action`, GHCR login with `${{ github.actor }}` / `${{ secrets.GITHUB_TOKEN }}`, `docker/metadata-action`, and `docker/build-push-action`.

- [ ] **Step 2: Configure metadata and ARM64 build**

Use:

```yaml
images: ghcr.io/${{ github.repository_owner }}/actual-budget
tags: |
  type=raw,value=master
  type=sha,format=short
```

Build with:

```yaml
context: .
file: sync-server.Dockerfile
platforms: linux/arm64
push: true
```

- [ ] **Step 3: Validate workflow syntax locally**

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color .github/workflows/publish-fork-image.yml
```

Expected: exit 0. If Docker cannot pull `rhysd/actionlint`, run the workflow manually from GitHub Actions and inspect its YAML validation result before merging.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish-fork-image.yml
git commit -m "ci: publish arm64 fork image to ghcr"
```

### Task 2: Document home-server pull deployment

**Files:**
- Create: `docs/deployment/home-server-ghcr.md`

**Interfaces:**
- Consumes: public `ghcr.io/xpbach2508/actual-budget:master` image and existing `actual-data` bind mount.
- Produces: production compose and update/rollback commands for the home server.

- [ ] **Step 1: Write deployment compose example**

Document this service configuration:

```yaml
services:
  actual_server:
    image: ghcr.io/xpbach2508/actual-budget:master
    ports:
      - '5006:5006'
    environment:
      ACTUAL_DATA_DIR: /data
      TZ: Asia/Ho_Chi_Minh
    volumes:
      - ${HOME}/projects/actual_budget/actual-data:/data
    restart: unless-stopped
```

- [ ] **Step 2: Document operational commands**

Include backup, pull/update, health check, and rollback commands:

```bash
tar czf ../actual-data-backup-$(date +%F-%H%M).tgz actual-data
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
curl http://localhost:5006/health
```

Rollback starts the original compose from `~/projects/actual_budget`; neither path deletes `actual-data`.

- [ ] **Step 3: Commit**

```bash
git add docs/deployment/home-server-ghcr.md
git commit -m "docs: add GHCR home server deployment guide"
```

### Task 3: Publish and verify

- [ ] **Step 1: Push master**

```bash
git push origin master
```

- [ ] **Step 2: Run or inspect GitHub workflow**

Open GitHub Actions, run `Publish Fork ARM64 Image` if necessary, and wait for a successful publish.

- [ ] **Step 3: Verify manifest from the Armbian server**

```bash
docker manifest inspect ghcr.io/xpbach2508/actual-budget:master
docker pull ghcr.io/xpbach2508/actual-budget:master
docker image inspect ghcr.io/xpbach2508/actual-budget:master --format '{{.Architecture}}'
```

Expected: `arm64`.

- [ ] **Step 4: Deploy with the documented compose**

Run the commands from Task 2 Step 2 and verify `{"status":"UP"}` from the health endpoint.
