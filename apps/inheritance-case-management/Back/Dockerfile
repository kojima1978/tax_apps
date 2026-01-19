# Backend Dockerfile

# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install including devDependencies for tsc
RUN npm ci
COPY . .
RUN npm run build
# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Run
FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY package*.json ./
# Install only prod dependencies
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# We need prisma client in node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3021
ENTRYPOINT ["./docker-entrypoint.sh"]
