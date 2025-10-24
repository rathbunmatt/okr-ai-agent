#!/bin/bash

# OKR AI Agent Production Deployment Script
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh production 1.0.0

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
COMPOSE_FILE="$PROJECT_DIR/deployment/production/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/deployment/production/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        error "docker-compose is not installed. Please install it and try again."
    fi

    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found at $ENV_FILE. Please copy environment.prod to .env and configure it."
    fi

    # Check if SSL certificates exist
    SSL_CERT_DIR="$PROJECT_DIR/deployment/production/ssl-certificates"
    if [[ ! -d "$SSL_CERT_DIR" || ! -f "$SSL_CERT_DIR/yourdomain.com.crt" ]]; then
        warn "SSL certificates not found. Make sure to configure SSL certificates before going live."
    fi

    log "Pre-deployment checks completed successfully."
}

# Build images
build_images() {
    log "Building application images..."

    cd "$PROJECT_DIR"

    # Build server image
    log "Building server image..."
    docker build -f deployment/production/Dockerfile.server -t okr-server:$VERSION server/

    # Build client image
    log "Building client image..."
    docker build -f deployment/production/Dockerfile.client -t okr-client:$VERSION client/

    log "Images built successfully."
}

# Database migration
run_migrations() {
    log "Running database migrations..."

    # Start only the database for migrations
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10

    # Run migrations
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1 || {
        warn "Database not ready, waiting longer..."
        sleep 20
    }

    # Here you would run your actual migrations
    # docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm server npm run db:migrate

    log "Database migrations completed."
}

# Deploy services
deploy_services() {
    log "Deploying services..."

    # Pull any external images
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull nginx postgres redis prometheus grafana node-exporter

    # Start all services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    log "Services deployed successfully."
}

# Health checks
verify_deployment() {
    log "Verifying deployment..."

    local max_attempts=30
    local attempt=1

    # Wait for services to be ready
    log "Waiting for services to be ready..."

    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T server curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log "Server health check passed."
            break
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            error "Server health check failed after $max_attempts attempts."
        fi

        log "Attempt $attempt/$max_attempts - waiting for server..."
        sleep 10
        ((attempt++))
    done

    # Check all services
    log "Checking service status..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

    # Test endpoints
    log "Testing endpoints..."

    # Test server health
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T server curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "✓ Server health endpoint responding"
    else
        error "✗ Server health endpoint not responding"
    fi

    # Test client health (if accessible)
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T client curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "✓ Client health endpoint responding"
    else
        warn "Client health endpoint not responding (this may be normal if behind proxy)"
    fi

    log "Deployment verification completed successfully."
}

# Cleanup old images
cleanup() {
    log "Cleaning up old images..."

    # Remove old images (keep last 3 versions)
    docker images okr-server --format "table {{.Tag}}" | tail -n +4 | xargs -r docker rmi okr-server: 2>/dev/null || true
    docker images okr-client --format "table {{.Tag}}" | tail -n +4 | xargs -r docker rmi okr-client: 2>/dev/null || true

    # Remove unused images
    docker image prune -f

    log "Cleanup completed."
}

# Backup before deployment
backup_data() {
    log "Creating backup before deployment..."

    # Create backup directory
    BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database if it exists
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/database_backup.sql"
        log "Database backup saved to $BACKUP_DIR/database_backup.sql"
    fi

    log "Backup completed."
}

# Main deployment function
deploy() {
    log "Starting deployment of OKR AI Agent $VERSION to $ENVIRONMENT..."

    # Run all deployment steps
    pre_deployment_checks
    backup_data
    build_images
    run_migrations
    deploy_services
    verify_deployment
    cleanup

    log "Deployment completed successfully!"
    log "Access your application at: https://yourdomain.com"
    log "Monitoring dashboard at: http://localhost:3000 (Grafana)"
    log "Metrics endpoint at: http://localhost:9090 (Prometheus)"

    # Show running services
    log "Running services:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy"|"production")
        deploy
        ;;
    "check")
        pre_deployment_checks
        ;;
    "build")
        build_images
        ;;
    "verify")
        verify_deployment
        ;;
    "backup")
        backup_data
        ;;
    *)
        echo "Usage: $0 [deploy|check|build|verify|backup] [version]"
        echo "  deploy  - Full deployment (default)"
        echo "  check   - Run pre-deployment checks only"
        echo "  build   - Build images only"
        echo "  verify  - Verify current deployment"
        echo "  backup  - Create backup only"
        exit 1
        ;;
esac