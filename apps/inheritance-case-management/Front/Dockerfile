# Frontend Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Set env var for build if needed (NEXT_PUBLIC_API_URL handles client side)
ARG NEXT_PUBLIC_API_URL=http://localhost:3021/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3020

COPY package*.json ./
# Install prod dependencies (next start needs them)
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# next.config.mjs might be needed if it exists, will verify listing
COPY --from=builder /app/next.config.ts ./next.config.ts 

EXPOSE 3020
CMD ["npm", "start"]
