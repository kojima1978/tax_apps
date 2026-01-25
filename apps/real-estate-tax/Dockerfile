FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
