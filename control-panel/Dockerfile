# Stage 1: Build the app (on any platform)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
COPY .npmrc* ./
RUN npm install -g pnpm && pnpm install

# Copy the rest of the source code
COPY . .

# Build the app (Vite will output to dist/)
RUN pnpm run build

# Stage 2: Serve with nginx (target ARM)
FROM --platform=$TARGETPLATFORM nginx:stable-alpine-slim

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
