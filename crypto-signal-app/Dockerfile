# Production Dockerfile
FROM node:18-alpine AS base

# Install build dependencies for better-sqlite3 build (alpine requires build-base)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package management files
COPY package*.json ./

# Install dependencies including native build toolchain
RUN npm ci

# Copy the rest of the application
COPY . .

# Set env to production
ENV NODE_ENV=production
ENV PORT=3000

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check using native Node HTTP client
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

# Start the Next.js server
CMD ["npm", "start"]
