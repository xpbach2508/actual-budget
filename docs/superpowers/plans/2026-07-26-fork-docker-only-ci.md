# Fork Docker-Only CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically run only the fork's native-ARM64 Docker publishing workflow on pushes to `master`.

**Architecture:** The fork image workflow uses GitHub-hosted `ubuntu-24.04-arm` to build `linux/arm64` natively. Upstream build, check, and CodeQL workflows retain manual dispatch but no longer subscribe to push events, preventing their queued jobs on every fork update.

**Tech Stack:** GitHub Actions, Docker Buildx, GHCR.

## Global Constraints

- Automatic master push CI is limited to `.github/workflows/publish-fork-image.yml`.
- Docker runner is `ubuntu-24.04-arm`.
- `build.yml`, `check.yml`, and `codeql.yml` remain manually dispatchable.

---

### Task 1: Use the native GitHub-hosted ARM64 runner

**Files:**
- Modify: `.github/workflows/publish-fork-image.yml`

- [ ] **Step 1: Change the runner**

```yaml
runs-on: ubuntu-24.04-arm
```

- [ ] **Step 2: Validate workflow syntax**

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color .github/workflows/publish-fork-image.yml
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish-fork-image.yml
git commit -m "ci: build fork image on native arm64 runner"
```

### Task 2: Make upstream push workflows manual-only

**Files:**
- Modify: `.github/workflows/build.yml`
- Modify: `.github/workflows/check.yml`
- Modify: `.github/workflows/codeql.yml`

- [ ] **Step 1: Preserve only manual dispatch in each trigger block**

Replace each push trigger with:

```yaml
on:
  workflow_dispatch:
```

Retain any existing non-push triggers only when required by that workflow's intended manual/security behavior.

- [ ] **Step 2: Validate all modified YAML**

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color .github/workflows/build.yml .github/workflows/check.yml .github/workflows/codeql.yml
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml .github/workflows/check.yml .github/workflows/codeql.yml
git commit -m "ci: disable upstream push checks in fork"
```

### Task 3: Publish and verify

- [ ] **Step 1: Push the commits**

```bash
git push origin master
```

- [ ] **Step 2: Check GitHub Actions**

Open the pushed commit's checks. Expected: only **Publish Fork ARM64 Image** is automatically queued; build/check/CodeQL are absent from the push run.

- [ ] **Step 3: Verify the image workflow**

Expected runner label: `ubuntu-24.04-arm`; successful GHCR tags include `master` and `sha-<commit>`.
