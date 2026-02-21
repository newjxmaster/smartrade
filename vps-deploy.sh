#!/bin/bash
# SmarTrade VPS Deployment Script
# Run this on the VPS to deploy the app

set -e

echo "=== SmarTrade VPS Deployment ==="

# Check if archive exists
if [ ! -f /tmp/smartrade-deploy.tar.gz ]; then
    echo "ERROR: /tmp/smartrade-deploy.tar.gz not found!"
    echo "Please upload the archive first using:"
    echo "  scp /tmp/smartrade-deploy.tar.gz root@76.13.52.122:/tmp/"
    exit 1
fi

# Create app directory
mkdir -p /opt/smartrade
cd /opt/smartrade

# Extract archive
echo "Extracting archive..."
tar -xzf /tmp/smartrade-deploy.tar.gz

# Build backend
echo "Building backend (Rust)..."
cd backend
cargo build --release 2>&1 | tee build.log
cd ..

# Install and build frontend
echo "Installing frontend dependencies..."
cd frontend
npm install 2>&1 | tee npm-install.log
npm run build 2>&1 | tee npm-build.log
cd ..

# Create data directory with config
mkdir -p data
cat > data/config.json << 'EOF'
{
    "registration_mode": "free",
    "allowed_regnos": [],
    "admin_username": "admin@smartrade.com",
    "admin_password": "AdminPass123!",
    "default_starting_money": 1000000000,
    "chat_enabled": true,
    "max_sessions_per_user": 1,
    "currency": {
        "symbol": "CFA",
        "code": "XOF",
        "locale": "fr-FR",
        "decimals": 0,
        "symbol_position": "after"
    },
    "available_currencies": [
        {
            "symbol": "$",
            "code": "USD",
            "locale": "en-US",
            "decimals": 2,
            "symbol_position": "before"
        },
        {
            "symbol": "CFA",
            "code": "XOF",
            "locale": "fr-FR",
            "decimals": 0,
            "symbol_position": "after"
        },
        {
            "symbol": "€",
            "code": "EUR",
            "locale": "de-DE",
            "decimals": 2,
            "symbol_position": "after"
        }
    ]
}
EOF

# Create test users data
cat > data/users.json << 'EOF'
{
  "users": [
    {
      "id": 1,
      "regno": "admin@smartrade.com",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",
      "full_name": "Administrator",
      "role": "admin",
      "kyc_status": "verified",
      "wallet_fiat": 0,
      "wallet_crypto_usdt": 0,
      "wallet_crypto_usdc": 0,
      "wallet_crypto_btc": 0,
      "wallet_crypto_eth": 0,
      "created_at": "2025-02-21T00:00:00Z"
    },
    {
      "id": 2,
      "regno": "test1@smartrade.com",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",
      "full_name": "Test User 1",
      "role": "investor",
      "kyc_status": "verified",
      "wallet_fiat": 1000000000,
      "wallet_crypto_usdt": 0,
      "wallet_crypto_usdc": 0,
      "wallet_crypto_btc": 0,
      "wallet_crypto_eth": 0,
      "created_at": "2025-02-21T00:00:00Z"
    },
    {
      "id": 3,
      "regno": "test2@smartrade.com",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",
      "full_name": "Test User 2",
      "role": "investor",
      "kyc_status": "verified",
      "wallet_fiat": 1000000000,
      "wallet_crypto_usdt": 0,
      "wallet_crypto_usdc": 0,
      "wallet_crypto_btc": 0,
      "wallet_crypto_eth": 0,
      "created_at": "2025-02-21T00:00:00Z"
    },
    {
      "id": 4,
      "regno": "test3@smartrade.com",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",
      "full_name": "Test User 3",
      "role": "business_owner",
      "kyc_status": "verified",
      "wallet_fiat": 1000000000,
      "wallet_crypto_usdt": 0,
      "wallet_crypto_usdc": 0,
      "wallet_crypto_btc": 0,
      "wallet_crypto_eth": 0,
      "created_at": "2025-02-21T00:00:00Z"
    }
  ]
}
EOF

# Create systemd service for backend
cat > /etc/systemd/system/smartrade-backend.service << 'EOF'
[Unit]
Description=SmarTrade Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/smartrade/backend
Environment=PORT=3001
Environment=DATA_DIR=/opt/smartrade/data
Environment=RUST_LOG=info
ExecStart=/opt/smartrade/backend/target/release/stockmart-backend
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create nginx config
cat > /etc/nginx/sites-available/smartrade << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        root /opt/smartrade/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/smartrade /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Reload systemd and start services
systemctl daemon-reload
systemctl enable smartrade-backend
systemctl restart smartrade-backend
nginx -t && systemctl restart nginx

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: http://76.13.52.122"
echo "Backend API: http://76.13.52.122/api"
echo ""
echo "=== Test Credentials ==="
echo "Admin: admin@smartrade.com / AdminPass123!"
echo "User 1: test1@smartrade.com / TestPass123!"
echo "User 2: test2@smartrade.com / TestPass123!"
echo "User 3 (Business): test3@smartrade.com / TestPass123!"
echo ""
echo "All users start with 1,000,000 XOF (virtual)"
