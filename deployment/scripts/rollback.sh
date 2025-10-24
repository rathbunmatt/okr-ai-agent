#!/bin/bash

# OKR AI Agent Rollback Script
# Usage: ./rollback.sh [version] [reason]
# Example: ./rollback.sh 1.0.0 "Critical bug in authentication"

set -euo pipefail

# Configuration
ROLLBACK_VERSION=${1:-}
ROLLBACK_REASON=${2:-"Manual rollback"}
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

# Show available versions
show_versions() {
    log "Available versions:"
    docker images okr-server --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -10
}

# Validate rollback version
validate_version() {
    if [[ -z "$ROLLBACK_VERSION" ]]; then
        error "Rollback version not specified. Usage: $0 <version> [reason]"
    fi

    # Check if the specified version exists
    if ! docker images okr-server:$ROLLBACK_VERSION --format "{{.Tag}}" | grep -q "$ROLLBACK_VERSION"; then
        error "Version $ROLLBACK_VERSION not found. Available versions:"
        show_versions
    fi

    log "Validated rollback version: $ROLLBACK_VERSION"
}

# Create emergency backup
emergency_backup() {
    log "Creating emergency backup before rollback..."

    BACKUP_DIR="$PROJECT_DIR/backups/emergency_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup current database
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres | grep -q "Up"; then
        log "Backing up current database..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/pre_rollback_backup.sql"
        log "Emergency backup saved to $BACKUP_DIR"
    fi

    # Save current container versions
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format "table {{.Name}}\t{{.Image}}" > "$BACKUP_DIR/current_versions.txt"

    log "Emergency backup completed."
}

# Stop current services
stop_services() {
    log "Stopping current services..."

    # Graceful shutdown
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop

    log "Services stopped successfully."
}

# Rollback to specified version
execute_rollback() {
    log "Rolling back to version $ROLLBACK_VERSION..."

    # Update image tags to rollback version
    export APP_VERSION=$ROLLBACK_VERSION

    # Update docker-compose to use rollback version
    sed -i.backup "s/okr-server:latest/okr-server:$ROLLBACK_VERSION/g" "$COMPOSE_FILE"
    sed -i.backup "s/okr-client:latest/okr-client:$ROLLBACK_VERSION/g" "$COMPOSE_FILE"

    # Start services with rollback version
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    log "Rollback to version $ROLLBACK_VERSION initiated."
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T server curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log "Server health check passed after rollback."
            break
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            error "Server health check failed after rollback. Manual intervention required."
        fi

        log "Attempt $attempt/$max_attempts - waiting for server..."
        sleep 10
        ((attempt++))
    done

    # Verify version
    local current_version
    current_version=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T server node -e "console.log(process.env.APP_VERSION || 'unknown')" 2>/dev/null | tr -d '\r\n')

    if [[ "$current_version" == "$ROLLBACK_VERSION" ]]; then
        log "✓ Version verification passed: $current_version"
    else
        warn "Version verification failed. Expected: $ROLLBACK_VERSION, Got: $current_version"
    fi

    # Check service status
    log "Service status after rollback:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

    log "Rollback verification completed."
}

# Send rollback notification
send_notification() {
    log "Sending rollback notification..."

    # Create rollback log entry
    ROLLBACK_LOG="$PROJECT_DIR/logs/rollbacks.log"
    mkdir -p "$(dirname "$ROLLBACK_LOG")"

    cat >> "$ROLLBACK_LOG" << EOF
[$(date +'%Y-%m-%d %H:%M:%S')] ROLLBACK EXECUTED
Version: $ROLLBACK_VERSION
Reason: $ROLLBACK_REASON
User: $(whoami)
Host: $(hostname)
Status: SUCCESS
EOF

    # Here you could add email/Slack notifications
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"🚨 Production rollback executed to version $ROLLBACK_VERSION. Reason: $ROLLBACK_REASON\"}" \
    #   "$SLACK_WEBHOOK_URL"

    log "Rollback notification sent."
}

# Restore docker-compose backup if rollback fails
restore_compose_backup() {
    if [[ -f "$COMPOSE_FILE.backup" ]]; then
        log "Restoring docker-compose backup..."
        mv "$COMPOSE_FILE.backup" "$COMPOSE_FILE"
    fi
}

# Cleanup rollback artifacts
cleanup_rollback() {
    log "Cleaning up rollback artifacts..."

    # Remove backup files
    rm -f "$COMPOSE_FILE.backup"

    log "Rollback cleanup completed."
}

# Main rollback function
perform_rollback() {
    log "Starting emergency rollback to version $ROLLBACK_VERSION..."
    log "Reason: $ROLLBACK_REASON"

    # Confirm rollback
    read -p "Are you sure you want to rollback to version $ROLLBACK_VERSION? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Rollback cancelled."
        exit 0
    fi

    # Execute rollback steps
    validate_version
    emergency_backup
    stop_services

    # Trap to restore on failure
    trap 'restore_compose_backup; error "Rollback failed. Manual intervention required."' ERR

    execute_rollback
    verify_rollback
    send_notification
    cleanup_rollback

    # Remove trap
    trap - ERR

    log "Rollback completed successfully!"
    log "Current version: $ROLLBACK_VERSION"
    log "Rollback reason: $ROLLBACK_REASON"

    # Show final status
    log "Final service status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# Handle script arguments
case "${1:-rollback}" in
    "versions"|"list")
        show_versions
        ;;
    "status")
        log "Current deployment status:"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        ;;
    *)
        if [[ -n "${1:-}" ]] && [[ ! "$1" =~ ^- ]]; then
            perform_rollback
        else
            echo "Usage: $0 <version> [reason]"
            echo "       $0 versions    - Show available versions"
            echo "       $0 status      - Show current status"
            echo ""
            echo "Example: $0 1.0.0 \"Critical authentication bug\""
            echo ""
            show_versions
            exit 1
        fi
        ;;
esac