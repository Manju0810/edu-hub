# Backend Deployment to GCP VM - Setup Guide

## Overview
This workflow deploys the backend to a Google Cloud Platform (GCP) Virtual Machine via SSH using Docker. The Docker image is built on GitHub Actions and transferred to the VM for deployment.

## Required GitHub Secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

### 1. `GCP_VM_HOST`
- **Description**: The external IP address or hostname of your GCP VM
- **Example**: `35.123.45.67` or `your-vm-name.us-central1-a.project-id.internal`

### 2. `GCP_VM_USERNAME`
- **Description**: Username for SSH authentication
- **Example**: `root`, `ubuntu`, or your custom username
- **Note**: The user must have Docker permissions

### 3. `GCP_SSH_PRIVATE_KEY`
- **Description**: The private SSH key (full content) to authenticate with the VM
- **Format**: The complete private key file content (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
- **How to generate**:
  ```bash
  # If you don't have an SSH key pair:
  ssh-keygen -t rsa -f ~/.ssh/gcp_vm_key -N ""
  
  # Copy the public key to the VM:
  ssh-copy-id -i ~/.ssh/gcp_vm_key.pub username@vm-ip
  
  # Add the private key content as the secret:
  cat ~/.ssh/gcp_vm_key
  ```

### 4. `GCP_VM_PORT` (Optional)
- **Description**: SSH port number (default: `22`)
- **Example**: `22` or custom port if configured

### 5. `JWT_SECRET`
- **Description**: The JWT secret for your backend application
- **Example**: `your-super-secret-jwt-key-change-this-in-production`

### 6. `DATABASE_URL`
- **Description**: Database connection URL
- **Example**: `postgresql://user:password@host:port/database?sslmode=require`

## VM Prerequisites

On your GCP VM, ensure the following are installed:

### 1. Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### 2. Docker Compose
```bash
# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 3. Verify Installation
```bash
docker --version
docker compose version
```

### 4. Create Deploy Directory
```bash
mkdir -p ~/edu-hub-deploy
```

## Workflow Behavior

The workflow performs these steps:

1. **Checkout** repository code
2. **Set up SSH key** - Configures SSH key and adds VM to known hosts
3. **Set up Docker Buildx** - Prepares Docker Buildx for building
4. **Generate .env file** - Creates a `.env` file with:
   - `PORT=5000`
   - `JWT_SECRET` from GitHub secrets
   - `DATABASE_URL` from GitHub secrets
5. **Build Docker image** - Uses multi-stage build:
   - **Build stage**: Installs dependencies, generates Prisma client, builds TypeScript
   - **Production stage**: Copies production dependencies, compiled dist, and Prisma client
   - Uses Docker layer caching with local cache
   - Tags image as `edu-hub-backend:latest`
6. **Save Docker image** - Exports the built image to `backend-image.tar`
7. **Archive deployment files** - Creates `deploy-files.tar.gz` containing:
   - `docker-compose.prod.yml`
   - `Dockerfile`
   - `scripts/start.sh`
   - `.env` (with secrets)
   - `backend-image.tar`
8. **Copy files to GCP VM** - Transfers the archive to `/home/{username}/edu-hub-deploy/` using SCP
9. **Deploy on GCP VM** via SSH:
   - Extract the archive
   - Load Docker image from tar: `docker load -i backend-image.tar`
   - Stop and remove existing containers: `docker compose -f docker-compose.prod.yml down`
   - Start new containers: `docker compose -f docker-compose.prod.yml up -d`
   - Cleanup unused images: `docker image prune -f`

## Deployment Configuration

### Docker Image
- **Image name**: `edu-hub-backend:latest`
- **Base image**: Node.js 24 (slim variant)
- **Port**: 5000 (exposed and mapped)
- **Working directory**: `/app`

### Docker Compose
- **Production compose file**: `docker-compose.prod.yml`
- **Extends**: `docker-compose.yml` (base configuration)
- **Environment**: `NODE_ENV=production`
- **Command**: `npm start` which executes `node dist/index.js`
- **Entry point on container startup**: `scripts/start.sh`
  - Runs `npx prisma migrate deploy` to apply database migrations
  - Then starts the server with `npm start`

### Start Script
The `scripts/start.sh` ensures Prisma migrations are applied before starting the server:
```bash
#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting server..."
npm start
```

## Deployment Validation

After deployment, verify the backend is running:

```bash
# Check container status
docker ps

# Check logs
docker compose -f ~/edu-hub-deploy/docker-compose.prod.yml logs -f

# Test the ping endpoint with deployment info
curl http://your-vm-ip:5000/api/ping
```

The response will include deployment metadata:

```json
{
  "message": "server is running",
  "deployment": {
    "commitHash": "abc123...",
    "commitDate": "2025-03-14 08:30:00 +0000",
    "buildTime": "2025-03-14T08:30:00Z"
  }
}
```

**Fields:**
- `commitHash`: The Git commit hash that was deployed
- `commitDate`: The date/time of the commit (from Git)
- `buildTime`: The timestamp when the Docker image was built (UTC)

## Rollback (if needed)

If the new deployment fails, you can manually rollback:

```bash
cd ~/edu-hub-deploy

# Stop current containers
docker compose -f docker-compose.prod.yml down

# List Docker images to find the previous edu-hub-backend image
docker images | grep edu-hub-backend

# Load a previously saved image if you have a backup tar file, or
# rebuild from previous git commit by triggering a deployment from an earlier commit

# If you have a backup of the previous image tar:
docker load -i previous-backup.tar

# Or if the previous image still exists in Docker storage:
# Tag the previous version as latest (find the correct image ID)
docker tag <previous-image-id> edu-hub-backend:latest

# Restart with the previous image
docker compose -f docker-compose.prod.yml up -d
```

**Note**: The workflow does not keep versioned images. For proper rollback capability, consider:
- Using version tags instead of `latest`
- Keeping backup tar files of previous deployments
- Implementing a blue-green deployment strategy

## Troubleshooting

### SSH Connection Fails
- Verify the VM's external IP and SSH port are correct
- Check firewall rules allow SSH (port 22 or custom)
- Ensure the private key matches the public key on the VM
- Test SSH manually: `ssh -i ~/.ssh/gcp_vm_key username@vm-ip`

### Docker Permission Denied
- Add user to docker group: `sudo usermod -aG docker $USER`
- Log out and back in

### Port Already in Use
- Check what's using port 5000: `sudo lsof -i :5000`
- Stop conflicting service or change port in docker-compose.prod.yml

### Database Connection Errors
- Verify `DATABASE_URL` is correct and allows connections from VM IP
- Check Neon/PostgreSQL firewall/connection settings
- Ensure SSL mode is properly configured

### Build Fails on GitHub Actions
- Check the Dockerfile syntax
- Ensure all dependencies are listed in package.json
- Verify Prisma schema is valid
- Check that the build step completes successfully (TypeScript compilation)

### Commit Info Not Showing
- Verify the `commit-info.json` file is created during the Docker build (check build logs)
- The file is generated from the Git repository during the build stage
- If building locally without `.git` directory, it will show `"unknown"` values

### Prisma Migration Failures
- The `start.sh` script runs `npx prisma migrate deploy` which requires the database to be accessible
- Check that `DATABASE_URL` is correctly set in the `.env` file on the VM
- Verify the database user has permissions to create/modify tables
- Check Prisma migration history: `npx prisma migrate status`

## Notes

- The workflow runs automatically on pushes to the `main` branch
- The Docker image is built on GitHub Actions using a multi-stage build for optimal production image size
- The `.env` file is generated at build time with secrets injected from GitHub Secrets
- The `docker-compose.prod.yml` uses `npm start` which runs Prisma migrations automatically via `scripts/start.sh`
- The working directory for all GitHub Actions steps is the `backend` folder (set via `defaults.run.working-directory`)
- The Docker image is built with `load: true` to save it locally for tar export, not pushed to a registry
- The workflow includes Docker layer caching to speed up builds (`cache-from` and `cache-to` with local cache)
- The `docker image prune -f` command removes intermediate and dangling images to free up space on the VM
- The database migrations are applied during container startup, not during image build
- The production image uses only production dependencies (`npm ci --omit=dev`)

## Deployment Information Endpoint

The `/api/ping` endpoint now returns deployment metadata including the Git commit hash, commit date, and build timestamp. This information is captured during the Docker build process and stored in a `commit-info.json` file inside the container.

**Implementation details:**
- The Docker build stage captures Git information and writes it to `commit-info.json`
- This file is copied to the production image
- The `/api/ping` endpoint reads this file and returns it in the response
- If the file is missing or unreadable, the endpoint returns `"unknown"` values
- This allows you to verify which exact version is deployed on the server