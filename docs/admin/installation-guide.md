# OKR AI Agent Installation Guide

Complete guide for installing and deploying the OKR AI Agent system in production environments.

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 50GB SSD (100GB recommended)
- **Network**: 100Mbps+ internet connection

### Production Hardware Requirements
- **CPU**: 8+ cores
- **RAM**: 32GB+
- **Storage**: 200GB+ SSD with backup
- **Network**: Dedicated connection with load balancing
- **Redundancy**: Multi-server setup for high availability

### Software Dependencies
- **Docker**: Version 24.0+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+ (for development/building)
- **PostgreSQL**: Version 15+ (containerized or external)
- **Redis**: Version 7+ (containerized or external)
- **Nginx**: Version 1.20+ (reverse proxy)

## Pre-Installation Checklist

### System Preparation
- [ ] Server provisioned with adequate resources
- [ ] Operating system updated (Ubuntu 20.04+ LTS recommended)
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] SSL certificates obtained
- [ ] Domain name configured and pointing to server
- [ ] Backup strategy planned and implemented

### External Services
- [ ] OpenAI API key obtained
- [ ] SMTP server credentials available (for notifications)
- [ ] S3 bucket configured (for backups, optional)
- [ ] Monitoring tools prepared (optional)

## Installation Methods

### Method 1: Production Deployment (Recommended)

#### Step 1: Clone Repository
```bash
git clone https://github.com/yourdomain/okr-ai-agent.git
cd okr-ai-agent
```

#### Step 2: Configure Environment
```bash
# Copy environment template
cp deployment/production/environment.prod deployment/production/.env

# Edit configuration
nano deployment/production/.env
```

**Required Configuration**:
```bash
# Application
APP_VERSION=1.0.0
DOMAIN=yourdomain.com

# Database
DB_NAME=okr_production
DB_USER=okr_user
DB_PASSWORD=your_secure_password_here

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters
SESSION_SECRET=your_session_secret_minimum_32_characters

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key_here

# Monitoring
GRAFANA_ADMIN_PASSWORD=your_grafana_password_here
```

#### Step 3: SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p deployment/production/ssl-certificates

# Copy your SSL certificates
cp /path/to/yourdomain.com.crt deployment/production/ssl-certificates/
cp /path/to/yourdomain.com.key deployment/production/ssl-certificates/

# Set proper permissions
chmod 600 deployment/production/ssl-certificates/*.key
chmod 644 deployment/production/ssl-certificates/*.crt
```

#### Step 4: Deploy Application
```bash
# Run deployment script
./deployment/scripts/deploy.sh production 1.0.0
```

### Method 2: Manual Docker Compose Deployment

#### Step 1: Build Images
```bash
# Build server image
docker build -f deployment/production/Dockerfile.server -t okr-server:1.0.0 server/

# Build client image
docker build -f deployment/production/Dockerfile.client -t okr-client:1.0.0 client/
```

#### Step 2: Start Services
```bash
cd deployment/production
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

#### Step 3: Verify Deployment
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Run health checks
../../scripts/health-check.sh --detailed
```

## Database Setup

### Initial Database Configuration

#### Option 1: Automated Setup (Recommended)
The deployment script handles database initialization automatically.

#### Option 2: Manual Setup
```bash
# Connect to PostgreSQL container
docker-compose -f docker-compose.prod.yml exec postgres psql -U okr_user -d okr_production

# Create necessary tables (run migrations)
docker-compose -f docker-compose.prod.yml exec server npm run db:migrate

# Seed initial data
docker-compose -f docker-compose.prod.yml exec server npm run db:seed
```

### Database Migration
```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec server npm run db:migrate

# Rollback if needed
docker-compose -f docker-compose.prod.yml exec server npm run db:rollback
```

## SSL/TLS Configuration

### Obtaining SSL Certificates

#### Option 1: Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to deployment directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deployment/production/ssl-certificates/yourdomain.com.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deployment/production/ssl-certificates/yourdomain.com.key
```

#### Option 2: Commercial Certificate
1. Purchase SSL certificate from trusted CA
2. Generate CSR and private key
3. Submit CSR to CA and receive certificate
4. Copy certificate files to `deployment/production/ssl-certificates/`

### Certificate Renewal
```bash
# Add to crontab for automatic renewal
0 2 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml restart nginx
```

## Monitoring Setup

### Prometheus Configuration
The monitoring stack is automatically deployed with the main application.

#### Access Prometheus
- URL: `http://your-server:9090`
- Default configuration: `deployment/monitoring/prometheus.yml`

#### Custom Metrics
Add custom application metrics in the server application:
```javascript
// server/src/metrics/custom-metrics.js
const promClient = require('prom-client');

const conversationDuration = new promClient.Histogram({
  name: 'okr_conversation_duration_seconds',
  help: 'Duration of OKR conversations',
  buckets: [1, 5, 15, 30, 60, 120, 300]
});
```

### Grafana Setup
#### Access Grafana
- URL: `http://your-server:3000`
- Username: `admin`
- Password: Set in `GRAFANA_ADMIN_PASSWORD` environment variable

#### Import Dashboards
1. Log into Grafana
2. Go to "+" → Import
3. Upload dashboard JSON files from `deployment/monitoring/grafana-dashboards/`

## Backup Configuration

### Automated Backups
```bash
# Create backup
./deployment/scripts/backup.sh --type full --upload

# Schedule daily backups
# Add to crontab:
0 2 * * * /path/to/okr-ai-agent/deployment/scripts/backup.sh --type incremental --upload
```

### Manual Backup
```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U okr_user okr_production > backup_$(date +%Y%m%d).sql

# Application data backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz server/uploads/ deployment/production/.env
```

## Security Hardening

### Firewall Configuration
```bash
# Ubuntu UFW example
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Container Security
```bash
# Run security scan on images
docker scan okr-server:1.0.0
docker scan okr-client:1.0.0

# Update base images regularly
docker pull node:18-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull nginx:1.25-alpine
```

### Environment Security
```bash
# Secure environment file
chmod 600 deployment/production/.env
chown root:root deployment/production/.env

# Secure SSL certificates
chmod 600 deployment/production/ssl-certificates/*.key
chmod 644 deployment/production/ssl-certificates/*.crt
```

## Performance Optimization

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_feedback_conversation_id ON feedback(conversation_id);
```

### Application Tuning
```bash
# Set Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=2048"

# Tune PostgreSQL settings
# Edit postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
max_connections = 200
```

### Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable compression
gzip on;
gzip_comp_level 6;
gzip_min_length 1000;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs server
docker-compose -f docker-compose.prod.yml logs client

# Check environment configuration
cat deployment/production/.env | grep -v PASSWORD

# Verify database connection
docker-compose -f docker-compose.prod.yml exec server npm run db:test
```

#### 2. SSL Certificate Issues
```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate validity
openssl x509 -in deployment/production/ssl-certificates/yourdomain.com.crt -text -noout

# Verify certificate chain
curl -I https://yourdomain.com
```

#### 3. Performance Issues
```bash
# Check system resources
docker stats

# Monitor database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U okr_user -d okr_production -c "SELECT * FROM pg_stat_activity;"

# Check application metrics
curl http://localhost:3001/metrics
```

#### 4. Database Connection Issues
```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U okr_user

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart database service
docker-compose -f docker-compose.prod.yml restart postgres
```

### Log Analysis
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f server

# Error logs only
docker-compose -f docker-compose.prod.yml logs server 2>&1 | grep -i error

# Access logs
tail -f deployment/logs/nginx/access.log

# System logs
journalctl -u docker -f
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health with health-check script
- [ ] Monitor disk space and resource usage
- [ ] Review error logs for issues

#### Weekly
- [ ] Run full backup verification
- [ ] Update system packages
- [ ] Review security logs
- [ ] Performance metrics analysis

#### Monthly
- [ ] Update Docker images
- [ ] Certificate renewal check
- [ ] Capacity planning review
- [ ] Security vulnerability scan

### Update Procedure
```bash
# 1. Backup current system
./deployment/scripts/backup.sh --type full

# 2. Pull latest code
git pull origin main

# 3. Build new images
docker build -f deployment/production/Dockerfile.server -t okr-server:1.1.0 server/
docker build -f deployment/production/Dockerfile.client -t okr-client:1.1.0 client/

# 4. Update docker-compose.yml with new version tags

# 5. Deploy update
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify deployment
./deployment/scripts/health-check.sh --detailed
```

### Rollback Procedure
```bash
# Emergency rollback to previous version
./deployment/scripts/rollback.sh 1.0.0 "Critical issue in new version"
```

## Support and Documentation

### Log Locations
- **Application Logs**: `deployment/logs/server/`
- **Nginx Logs**: `deployment/logs/nginx/`
- **Database Logs**: `deployment/logs/postgres/`
- **System Logs**: `/var/log/syslog`

### Configuration Files
- **Environment**: `deployment/production/.env`
- **Docker Compose**: `deployment/production/docker-compose.prod.yml`
- **Nginx**: `deployment/production/nginx.conf`
- **Monitoring**: `deployment/monitoring/`

### Getting Help
- **Documentation**: `/docs/admin/`
- **Health Checks**: `./deployment/scripts/health-check.sh`
- **Support Email**: support@yourdomain.com
- **Emergency Contact**: [Emergency contact information]

---

## Installation Checklist

### Pre-Installation
- [ ] Hardware requirements verified
- [ ] Software dependencies installed
- [ ] SSL certificates obtained
- [ ] Environment configuration prepared
- [ ] Backup strategy planned

### Installation
- [ ] Repository cloned
- [ ] Environment configured
- [ ] SSL certificates installed
- [ ] Application deployed
- [ ] Database initialized
- [ ] Health checks passed

### Post-Installation
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security hardening applied
- [ ] Performance optimization completed
- [ ] Documentation updated
- [ ] Team training scheduled

Ready to deploy? Follow the step-by-step installation process and contact support if you need assistance.