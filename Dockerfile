# Multi-stage build for SmarTrade

# Stage 1: Build Rust backend
FROM rust:1.84-slim as backend-builder
WORKDIR /app/backend
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
RUN cargo build --release

# Stage 2: Build Node frontend
FROM node:20-slim as frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 3: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/backend/target/release/stockmart-backend /app/backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy data with XOF config
COPY data/ /app/data/

# Nginx config
RUN echo 'server { \
    listen 80; \
    location / { \
        root /var/www/html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://localhost:3001/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
    } \
    location /ws { \
        proxy_pass http://localhost:3001/ws; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
    } \
}' > /etc/nginx/sites-available/default

# Startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80 3001
CMD ["/app/start.sh"]
