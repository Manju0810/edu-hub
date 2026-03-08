# Use official Node image as a parent image
FROM node:24-slim AS build

# Set working directory inside container
WORKDIR /app

# Copy only package files to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . ./

# Generate Prisma client (required if schema changes)
RUN npx prisma generate

# Build TypeScript sources for production
RUN npm run build

FROM node:24-slim
WORKDIR /app

# Copy only package files from to leverage Docker cache
COPY/package*.json ./

# Install dependencies
# Use --omit=dev to install only production dependencies
RUN npm ci --omit=dev

# Copy compiled application
COPY --from=build /app/dist ./dist

# Copy only generated Prisma client from build node_modules
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Generate Prisma client (required if schema changes)
RUN npx prisma generate

# Expose application port (matches Express configuration)
# changed to 5000 per user requirement
EXPOSE 5000

# Default command: start the compiled app
# PORT environment variable should be used by the application (set via .env)
CMD ["npm", "start"]
