# Deployment Guide

This guide covers deploying the OKR AI Agent to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [Build Process](#build-process)
- [Deployment Methods](#deployment-methods)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **Storage**: Minimum 500MB for application and database
- **OS**: Linux, macOS, or Windows Server

### Required Accounts

- **Anthropic API Key**: Sign up at [Anthropic Console](https://console.anthropic.com/)
  - Ensure sufficient API credits for production usage
  - Monitor usage to avoid rate limits

### Optional Services

- **Reverse Proxy**: Nginx or Apache (recommended for production)
- **SSL Certificate**: Let's Encrypt or commercial provider
- **Process Manager**: PM2 or systemd (for production uptime)
- **Monitoring**: Datadog, New Relic, or custom monitoring

## Environment Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/rathbunmatt/okr-ai-agent.git
cd okr-ai-agent

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create environment files for server and client:

**Server (server/.env):**

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=./data/okr_agent.db

# Claude API
ANTHROPIC_API_KEY=your_actual_api_key_here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your_secure_random_secret_here

# CORS (adjust for your domain)
ALLOWED_ORIGINS=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

**Client (client/.env):**

```bash
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=wss://yourdomain.com
```

### 3. Security Checklist

- [ ] Generate strong SESSION_SECRET (minimum 32 characters)
- [ ] Never commit .env files to version control
- [ ] Restrict API key permissions to minimum required
- [ ] Configure CORS to allow only your domain
- [ ] Enable rate limiting appropriate for your traffic
- [ ] Set up SSL/TLS certificates

## Database Configuration

### Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### Production Database Considerations

**SQLite (Default):**
- Good for small to medium deployments (<1000 concurrent users)
- File-based, no separate database server needed
- Set appropriate file permissions:
  ```bash
  chmod 640 data/okr_agent.db
  chown appuser:appgroup data/okr_agent.db
  ```

**Upgrading to PostgreSQL/MySQL:**

For larger deployments, consider migrating to a more robust database:

1. Update DATABASE_URL in .env
2. Modify database configuration in `server/src/config/database.ts`
3. Run migrations against new database

### Backup Strategy

```bash
# Backup SQLite database
cp data/okr_agent.db data/backups/okr_agent_$(date +%Y%m%d_%H%M%S).db

# Automated daily backups (cron)
0 2 * * * /path/to/okr-ai-agent/scripts/backup-db.sh
```

## Build Process

### Production Build

```bash
# Build both server and client
npm run build

# Or build individually
npm run build:server
npm run build:client
```

### Pre-Deployment Validation

```bash
# Run all tests
npm run validate:production

# This includes:
# - Unit tests
# - Integration tests
# - E2E tests
# - Security tests
# - Performance tests
```

### Build Output

- **Server**: `server/dist/` - Compiled JavaScript
- **Client**: `client/dist/` - Static files for serving

## Deployment Methods

### Method 1: Docker (Recommended)

**Dockerfile** (provided in repository):

```bash
# Build image
docker build -t okr-ai-agent:latest .

# Run container
docker run -d \
  --name okr-agent \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  -v /path/to/logs:/app/logs \
  --env-file .env \
  okr-ai-agent:latest
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  okr-agent:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
```

### Method 2: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "okr-agent" -- run dev

# Or with ecosystem file
pm2 start ecosystem.config.js

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'okr-agent-server',
    script: 'server/dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Method 3: Systemd Service (Linux)

**Create service file** (`/etc/systemd/system/okr-agent.service`):

```ini
[Unit]
Description=OKR AI Agent
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/okr-ai-agent
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable okr-agent
sudo systemctl start okr-agent
sudo systemctl status okr-agent
```

### Method 4: Cloud Platform Deployment

#### Heroku

```bash
heroku create okr-ai-agent
heroku config:set ANTHROPIC_API_KEY=your_key
git push heroku main
```

#### AWS (EC2)

1. Launch EC2 instance (t3.medium recommended)
2. Install Node.js and npm
3. Clone repository and build
4. Configure security groups (port 80/443)
5. Use PM2 or systemd for process management

#### Vercel/Netlify (Client Only)

Deploy frontend separately:

```bash
cd client
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-24T..."}
```

### Monitoring Script

```bash
# Run health monitor
npm run health-check

# Schedule with cron (every 5 minutes)
*/5 * * * * /path/to/okr-ai-agent/scripts/health-monitor.sh
```

### Key Metrics to Monitor

1. **Application Health**
   - Response time (<100ms target)
   - Error rate (<1% target)
   - WebSocket connections
   - Memory usage

2. **API Usage**
   - Claude API calls per minute
   - API cost tracking
   - Rate limit proximity
   - Token usage

3. **Database**
   - Query performance
   - Database size
   - Connection pool usage
   - Backup status

4. **System Resources**
   - CPU usage
   - Memory usage
   - Disk space
   - Network bandwidth

### Logging Configuration

**Log Levels:**
- `error`: Critical issues requiring immediate attention
- `warn`: Important warnings
- `info`: General application flow
- `debug`: Detailed debugging (dev only)

**Log Rotation:**

```bash
# Install logrotate configuration
sudo cp scripts/logrotate.conf /etc/logrotate.d/okr-agent
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
tail -f logs/app.log

# Verify environment variables
env | grep ANTHROPIC

# Check port availability
lsof -i :3000
```

#### 2. Claude API Errors

- **Rate Limits**: Implement exponential backoff
- **Invalid API Key**: Verify key in Anthropic Console
- **Token Limits**: Monitor conversation history size

#### 3. Database Connection Issues

```bash
# Check database file permissions
ls -la data/okr_agent.db

# Verify database integrity
sqlite3 data/okr_agent.db "PRAGMA integrity_check;"
```

#### 4. WebSocket Connection Failures

- Verify firewall allows WebSocket traffic
- Check proxy configuration (Nginx needs special config)
- Ensure WSS (secure WebSocket) in production

#### 5. High Memory Usage

```bash
# Check Node.js memory
node --max-old-space-size=4096 server/dist/index.js

# Monitor with PM2
pm2 monit
```

### Performance Optimization

1. **Enable Caching**: Configure Redis or in-memory cache
2. **Load Balancing**: Use Nginx to distribute traffic
3. **Database Optimization**: Add indexes, optimize queries
4. **CDN**: Serve static assets via CDN
5. **Compression**: Enable gzip compression

### Emergency Procedures

**Rollback:**

```bash
# If using Docker
docker stop okr-agent
docker run -d --name okr-agent okr-ai-agent:previous

# If using PM2
pm2 stop okr-agent
git checkout previous-stable-tag
npm run build
pm2 restart okr-agent
```

**Data Recovery:**

```bash
# Restore from backup
cp data/backups/okr_agent_YYYYMMDD.db data/okr_agent.db
sudo systemctl restart okr-agent
```

## Support

For deployment issues not covered in this guide:

- Check [GitHub Issues](https://github.com/rathbunmatt/okr-ai-agent/issues)
- Review [Security Policy](SECURITY.md)
- Consult [Contributing Guidelines](CONTRIBUTING.md)

---

**Last Updated:** 2025-10-24
