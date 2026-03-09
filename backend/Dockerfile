# Use official Node image as a parent image
FROM node:24-slim AS build

# Set working directory inside container
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl-dev

# Copy only package files to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . ./

# Generate prisma client
RUN npx prisma generate

# Build TypeScript sources for production
RUN npm run build


# -------- Production Image --------

FROM node:24-slim

WORKDIR /app

# Install OpenSSL for production runtime
RUN apt-get update -y && apt-get install -y openssl libssl-dev

# Copy only package files from to leverage Docker cache
COPY package*.json ./

# Install dependencies
# Use --omit=dev to install only production dependencies
RUN npm ci --omit=dev

# Copy compiled application
COPY --from=build /app/dist ./dist

# Copy only generated Prisma client from build node_modules
COPY --from=build /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Expose port
EXPOSE 5000

# Startup script
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"]