# Multi-stage Dockerfile for Saudi Fleet & Workforce Management Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy application source
COPY . .

# Generate Prisma client and compile production artifacts
RUN npx prisma generate || true
RUN npm run build

# Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force

# Copy built distribution from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expose standard enterprise HTTP port
EXPOSE 3000

USER node

# Start compiled server
CMD ["node", "dist/server.cjs"]
