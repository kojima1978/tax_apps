# Development stage
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,id=npm-stock-valuation-form,target=/root/.npm \
    npm install
COPY . .
EXPOSE 3014
CMD ["npx", "vite", "--host", "--port", "3014"]

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,id=npm-stock-valuation-form,target=/root/.npm \
    npm install
COPY . .
RUN --mount=type=cache,id=vite-stock-valuation-form,target=/app/node_modules/.vite \
    npm run build

# Production stage
FROM nginx:1.27-alpine AS runner
RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html/stock-valuation-form
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
