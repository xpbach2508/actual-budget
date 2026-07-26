# Deploy the Fork on an Armbian Home Server

The home server is `aarch64`, so it pulls the ARM64 image built by GitHub Actions. It must keep using the existing Actual data directory.

## First publish

1. Push `master` and wait for **Publish Fork ARM64 Image** to succeed in GitHub Actions.
2. In GitHub, open the repository **Packages** tab, select `actual-budget`, then **Package settings** → **Change visibility** → **Public**. Do this once after the package exists.
3. Verify the image is public:

```bash
docker manifest inspect ghcr.io/xpbach2508/actual-budget:master
```

## Home-server compose

Keep the original official compose at `~/projects/actual_budget/docker-compose.yml` for rollback. In a separate directory, create `~/projects/actual-budget-fork/docker-compose.production.yml`:

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
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'node -e "fetch(\"http://localhost:5006/health\").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"',
        ]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 20s
    restart: unless-stopped
```

Do not replace the bind mount with a new Docker volume: `actual-data` contains the existing budgets.

## Initial switch

```bash
cd ~/projects/actual_budget
docker compose down
tar czf ../actual-data-backup-$(date +%F-%H%M).tgz actual-data

cd ~/projects/actual-budget-fork
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
curl http://localhost:5006/health
```

## Upgrade after a new fork push

```bash
cd ~/projects/actual-budget-fork
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

## Roll back to the official image

```bash
cd ~/projects/actual-budget-fork
docker compose -f docker-compose.production.yml down

cd ~/projects/actual_budget
docker compose up -d
```

Both deployments use the same `actual-data` bind mount. Neither command deletes data.
