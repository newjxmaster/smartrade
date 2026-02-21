# SmarTrade Deployment Guide

## Quick Deploy to VPS

### Option 1: Using Docker (Recommended)

1. **Upload files to VPS:**
```bash
# On your Mac, run:
cd /Users/saua
zip -r smartrade.zip smartrade --exclude 'smartrade/backend/target/*' 'smartrade/frontend/node_modules/*' 'smartrade/.git/*'
scp smartrade.zip root@76.13.52.122:/root/
```

2. **On VPS, deploy:**
```bash
ssh root@76.13.52.122
cd /root
unzip smartrade.zip
cd smartrade

# Install Docker if not present
curl -fsSL https://get.docker.com | sh

# Build and run
docker-compose up --build -d

# Check logs
docker-compose logs -f
```

3. **Access:**
- App: http://76.13.52.122
- Admin: admin@smartrade.com / AdminPass123!

---

### Option 2: Manual Deploy

1. **Upload and extract:**
```bash
scp /tmp/smartrade-deploy.tar.gz root@76.13.52.122:/tmp/
ssh root@76.13.52.122
cd /opt
tar -xzf /tmp/smartrade-deploy.tar.gz
mv StockMart smartrade
cd smartrade
```

2. **Install Rust & Node:**
```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Node
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

3. **Build backend:**
```bash
cd /opt/smartrade/backend
cargo build --release
```

4. **Build frontend:**
```bash
cd /opt/smartrade/frontend
npm install
npm run build
```

5. **Setup nginx:**
```bash
apt-get install -y nginx
cat > /etc/nginx/sites-available/smartrade << 'EOF'
server {
    listen 80;
    location / {
        root /opt/smartrade/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location /ws {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf /etc/nginx/sites-available/smartrade /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

6. **Create systemd service:**
```bash
cat > /etc/systemd/system/smartrade.service << 'EOF'
[Unit]
Description=SmarTrade
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/smartrade/backend
Environment=PORT=3001
Environment=DATA_DIR=/opt/smartrade/data
Environment=RUST_LOG=info
ExecStart=/opt/smartrade/backend/target/release/stockmart-backend
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable smartrade
systemctl start smartrade
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartrade.com | AdminPass123! |
| Investor | test1@smartrade.com | TestPass123! |
| Investor | test2@smartrade.com | TestPass123! |
| Business | test3@smartrade.com | TestPass123! |

All users start with 1,000,000 XOF virtual cash.

---

## Currency Configuration

Default: **XOF (CFA Franc)**

To change currency, edit `/opt/smartrade/data/config.json`:
- XOF: `"code": "XOF"` (no decimals)
- USD: `"code": "USD"` (2 decimals)
- EUR: `"code": "EUR"` (2 decimals)

Then restart: `systemctl restart smartrade`
