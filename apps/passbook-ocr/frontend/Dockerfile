# Frontend Dockerfile - Next.js 16
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Build the application (for production)
# RUN npm run build

# Expose port
EXPOSE 3000

# Run development server
CMD ["npm", "run", "dev"]

# For production, use:
# CMD ["npm", "start"]
