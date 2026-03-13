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
2. **Set up** Docker Buildx
3. **Generate** `.env` file with GitHub secrets
4. **Build** Docker image using the Dockerfile (multi-stage build)
5. **Save** the image to a tar file
6. **Prepare** deployment package with docker-compose.prod.yml, Dockerfile, scripts, .env, and image tar
7. **Transfer** the package to the VM via SCP
8. **Extract** files on the VM
9. **Load** the Docker image
10. **Stop & Remove** existing containers
11. **Start** new containers with `docker compose up -d`
12. **Verify** backend health with `/api/ping` endpoint
13. **Cleanup** old unused images

## Deployment Validation

After deployment, verify the backend is running:

```bash
# Check container status
docker ps

# Test the health endpoint
curl http://your-vm-ip:5000/api/ping

# View logs
docker compose -f ~/edu-hub-deploy/docker-compose.prod.yml logs -f
```

## Rollback (if needed)

The workflow keeps the previous image on the VM. To manually rollback:

```bash
cd ~/edu-hub-deploy
docker compose down
# Find previous image
docker images | grep edu-hub-backend
# Tag the previous version as latest
docker tag edu-hub-backend:previous-tag edu-hub-backend:latest
docker compose up -d
```

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

## Notes

- The workflow runs automatically on pushes to the `main` branch
- The Docker image is built on GitHub Actions, not on the VM
- The `.env` file is generated at build time with secrets injected
- The `docker-compose.prod.yml` uses `npm start` which runs Prisma migrations automatically via `scripts/start.sh`
- The workflow includes a health check that will fail the deployment if the backend doesn't respond with "server is running" on `/api/ping`