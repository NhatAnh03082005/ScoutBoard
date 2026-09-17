# ==============================================================================
# ScoutBoard Frontend Production Dockerfile (Multi-Stage)
# ==============================================================================

# Stage 1: Build React Vite SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy TypeScript configs, Vite config, HTML entrypoint, public assets, and source code
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# Build-time environment variable for Vite
# Declared and exposed before running npm run build so Vite inlines it
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle with inlined VITE_API_BASE_URL
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
