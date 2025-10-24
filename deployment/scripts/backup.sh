#!/bin/bash

# OKR AI Agent Backup Script
# Usage: ./backup.sh [--type full|incremental] [--retention days] [--upload]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
COMPOSE_FILE="$PROJECT_DIR/deployment/production/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/deployment/production/.env"
BACKUP_BASE_DIR="$PROJECT_DIR/backups"

# Default values
BACKUP_TYPE="full"
RETENTION_DAYS=30
UPLOAD_TO_S3=false
COMPRESS_BACKUP=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --upload)
            UPLOAD_TO_S3=true
            shift
            ;;
        --no-compress)
            COMPRESS_BACKUP=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--type full|incremental] [--retention days] [--upload] [--no-compress]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
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

# Create backup directory structure
setup_backup_directory() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="$BACKUP_BASE_DIR/${BACKUP_TYPE}_${timestamp}"

    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"/{database,redis,application,logs,config}

    # Create backup manifest
    cat > "$BACKUP_DIR/backup_manifest.json" << EOF
{
    "backup_id": "${BACKUP_TYPE}_${timestamp}",
    "type": "$BACKUP_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "hostname": "$(hostname)",
    "version": "$(git -C "$PROJECT_DIR" describe --tags --always 2>/dev/null || echo "unknown")",
    "compress": $COMPRESS_BACKUP,
    "components": []
}
EOF
}

# Backup PostgreSQL database
backup_database() {
    log "Backing up PostgreSQL database..."

    local db_backup_file="$BACKUP_DIR/database/postgres_backup.sql"

    # Check if PostgreSQL is running
    if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres | grep -q "Up"; then
        warn "PostgreSQL container is not running, skipping database backup"
        return 0
    fi

    # Create database backup
    if [[ "$BACKUP_TYPE" == "full" ]]; then
        # Full backup
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump \
            -U $DB_USER \
            -d $DB_NAME \
            --verbose \
            --clean \
            --if-exists \
            --create > "$db_backup_file"

        log "✓ Full database backup completed: $(du -h "$db_backup_file" | cut -f1)"
    else
        # Incremental backup (WAL files)
        local wal_backup_dir="$BACKUP_DIR/database/wal"
        mkdir -p "$wal_backup_dir"

        # Archive WAL files
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            find /var/lib/postgresql/data/pg_wal -name "*.backup" -o -name "00*" -type f \
            -exec cp {} /tmp/ \; 2>/dev/null || true

        # Copy WAL files to backup directory
        docker cp "$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q postgres):/tmp/" "$wal_backup_dir/" 2>/dev/null || true

        log "✓ Incremental database backup (WAL) completed"
    fi

    # Update manifest
    jq --arg component "database" --arg status "completed" --arg size "$(du -sb "$BACKUP_DIR/database" | cut -f1)" \
        '.components += [{"name": $component, "status": $status, "size_bytes": ($size | tonumber)}]' \
        "$BACKUP_DIR/backup_manifest.json" > "$BACKUP_DIR/backup_manifest.json.tmp"
    mv "$BACKUP_DIR/backup_manifest.json.tmp" "$BACKUP_DIR/backup_manifest.json"
}

# Backup Redis data
backup_redis() {
    log "Backing up Redis data..."

    # Check if Redis is running
    if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps redis | grep -q "Up"; then
        warn "Redis container is not running, skipping Redis backup"
        return 0
    fi

    local redis_backup_dir="$BACKUP_DIR/redis"

    # Force Redis to save current state
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli BGSAVE

    # Wait for background save to complete
    local save_complete=false
    local attempts=0
    while [[ $save_complete == false && $attempts -lt 30 ]]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli LASTSAVE | grep -q "^[0-9]*$"; then
            save_complete=true
        else
            sleep 1
            ((attempts++))
        fi
    done

    # Copy Redis data files
    docker cp "$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q redis):/data/" "$redis_backup_dir/"

    log "✓ Redis backup completed: $(du -h "$redis_backup_dir" | cut -f1)"

    # Update manifest
    jq --arg component "redis" --arg status "completed" --arg size "$(du -sb "$redis_backup_dir" | cut -f1)" \
        '.components += [{"name": $component, "status": $status, "size_bytes": ($size | tonumber)}]' \
        "$BACKUP_DIR/backup_manifest.json" > "$BACKUP_DIR/backup_manifest.json.tmp"
    mv "$BACKUP_DIR/backup_manifest.json.tmp" "$BACKUP_DIR/backup_manifest.json"
}

# Backup application files
backup_application() {
    log "Backing up application files..."

    local app_backup_dir="$BACKUP_DIR/application"

    # Important application files to backup
    local files_to_backup=(
        "$PROJECT_DIR/package.json"
        "$PROJECT_DIR/package-lock.json"
        "$PROJECT_DIR/server/package.json"
        "$PROJECT_DIR/client/package.json"
        "$PROJECT_DIR/deployment"
    )

    for file in "${files_to_backup[@]}"; do
        if [[ -e "$file" ]]; then
            local relative_path="${file#$PROJECT_DIR/}"
            local target_dir="$app_backup_dir/$(dirname "$relative_path")"
            mkdir -p "$target_dir"
            cp -r "$file" "$target_dir/"
        fi
    done

    # Backup any uploaded files or user data
    local user_data_dir="$PROJECT_DIR/server/uploads"
    if [[ -d "$user_data_dir" ]]; then
        cp -r "$user_data_dir" "$app_backup_dir/"
    fi

    log "✓ Application files backup completed: $(du -h "$app_backup_dir" | cut -f1)"

    # Update manifest
    jq --arg component "application" --arg status "completed" --arg size "$(du -sb "$app_backup_dir" | cut -f1)" \
        '.components += [{"name": $component, "status": $status, "size_bytes": ($size | tonumber)}]' \
        "$BACKUP_DIR/backup_manifest.json" > "$BACKUP_DIR/backup_manifest.json.tmp"
    mv "$BACKUP_DIR/backup_manifest.json.tmp" "$BACKUP_DIR/backup_manifest.json"
}

# Backup logs
backup_logs() {
    log "Backing up application logs..."

    local logs_backup_dir="$BACKUP_DIR/logs"

    # Application logs
    local log_dirs=(
        "$PROJECT_DIR/server/logs"
        "$PROJECT_DIR/deployment/logs"
        "$PROJECT_DIR/logs"
    )

    for log_dir in "${log_dirs[@]}"; do
        if [[ -d "$log_dir" ]]; then
            local dir_name=$(basename "$log_dir")
            cp -r "$log_dir" "$logs_backup_dir/$dir_name"
        fi
    done

    # Docker container logs
    local containers=(
        "okr-nginx"
        "okr-server"
        "okr-client"
        "okr-postgres"
        "okr-redis"
        "okr-prometheus"
        "okr-grafana"
    )

    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            docker logs "$container" > "$logs_backup_dir/${container}.log" 2>&1 || true
        fi
    done

    log "✓ Logs backup completed: $(du -h "$logs_backup_dir" | cut -f1)"

    # Update manifest
    jq --arg component "logs" --arg status "completed" --arg size "$(du -sb "$logs_backup_dir" | cut -f1)" \
        '.components += [{"name": $component, "status": $status, "size_bytes": ($size | tonumber)}]' \
        "$BACKUP_DIR/backup_manifest.json" > "$BACKUP_DIR/backup_manifest.json.tmp"
    mv "$BACKUP_DIR/backup_manifest.json.tmp" "$BACKUP_DIR/backup_manifest.json"
}

# Backup configuration
backup_configuration() {
    log "Backing up configuration files..."

    local config_backup_dir="$BACKUP_DIR/config"

    # Configuration files to backup
    local config_files=(
        "$ENV_FILE"
        "$COMPOSE_FILE"
        "$PROJECT_DIR/deployment/production/nginx.conf"
        "$PROJECT_DIR/deployment/monitoring/prometheus.yml"
        "$PROJECT_DIR/deployment/monitoring/alerting-rules.yml"
    )

    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            local relative_path="${config_file#$PROJECT_DIR/}"
            local target_dir="$config_backup_dir/$(dirname "$relative_path")"
            mkdir -p "$target_dir"
            cp "$config_file" "$target_dir/"
        fi
    done

    log "✓ Configuration backup completed: $(du -h "$config_backup_dir" | cut -f1)"

    # Update manifest
    jq --arg component "configuration" --arg status "completed" --arg size "$(du -sb "$config_backup_dir" | cut -f1)" \
        '.components += [{"name": $component, "status": $status, "size_bytes": ($size | tonumber)}]' \
        "$BACKUP_DIR/backup_manifest.json" > "$BACKUP_DIR/backup_manifest.json.tmp"
    mv "$BACKUP_DIR/backup_manifest.json.tmp" "$BACKUP_DIR/backup_manifest.json"
}

# Compress backup
compress_backup() {
    if [[ "$COMPRESS_BACKUP" == "false" ]]; then
        return 0
    fi

    log "Compressing backup..."

    local compressed_file="$BACKUP_DIR.tar.gz"
    local original_size=$(du -sb "$BACKUP_DIR" | cut -f1)

    # Create compressed archive
    tar -czf "$compressed_file" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"

    local compressed_size=$(du -sb "$compressed_file" | cut -f1)
    local compression_ratio=$(echo "scale=1; $compressed_size * 100 / $original_size" | bc)

    log "✓ Backup compressed: $(du -h "$compressed_file" | cut -f1) (${compression_ratio}% of original)"

    # Remove uncompressed directory
    rm -rf "$BACKUP_DIR"

    # Update paths
    BACKUP_DIR="$compressed_file"

    # Update manifest compression info
    local manifest_file="${compressed_file%.tar.gz}/backup_manifest.json"
    if [[ -f "$manifest_file" ]]; then
        jq --arg compressed "true" --arg size "$compressed_size" \
            '.compressed = ($compressed | test("true")) | .compressed_size_bytes = ($size | tonumber)' \
            "$manifest_file" > "${manifest_file}.tmp"
        mv "${manifest_file}.tmp" "$manifest_file"
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [[ "$UPLOAD_TO_S3" == "false" ]]; then
        return 0
    fi

    log "Uploading backup to S3..."

    # Check if AWS CLI and credentials are available
    if ! command -v aws > /dev/null 2>&1; then
        warn "AWS CLI not found, skipping S3 upload"
        return 0
    fi

    # Load S3 configuration from environment
    if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        warn "BACKUP_S3_BUCKET not set, skipping S3 upload"
        return 0
    fi

    local backup_filename=$(basename "$BACKUP_DIR")
    local s3_key="okr-backups/$(date +%Y/%m)/$backup_filename"

    # Upload to S3
    if aws s3 cp "$BACKUP_DIR" "s3://$BACKUP_S3_BUCKET/$s3_key"; then
        log "✓ Backup uploaded to S3: s3://$BACKUP_S3_BUCKET/$s3_key"

        # Add S3 location to manifest
        local manifest_file
        if [[ "$COMPRESS_BACKUP" == "true" ]]; then
            manifest_file="${BACKUP_DIR%.tar.gz}/backup_manifest.json"
        else
            manifest_file="$BACKUP_DIR/backup_manifest.json"
        fi

        if [[ -f "$manifest_file" ]]; then
            jq --arg s3_uri "s3://$BACKUP_S3_BUCKET/$s3_key" '.s3_location = $s3_uri' \
                "$manifest_file" > "${manifest_file}.tmp"
            mv "${manifest_file}.tmp" "$manifest_file"
        fi
    else
        warn "Failed to upload backup to S3"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    # Local cleanup
    find "$BACKUP_BASE_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_BASE_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

    # S3 cleanup (if configured)
    if [[ "$UPLOAD_TO_S3" == "true" && -n "${BACKUP_S3_BUCKET:-}" ]]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3 ls "s3://$BACKUP_S3_BUCKET/okr-backups/" --recursive | \
            awk -v cutoff="$cutoff_date" '$1 < cutoff {print "s3://'$BACKUP_S3_BUCKET'/" $4}' | \
            xargs -r aws s3 rm 2>/dev/null || true
    fi

    log "✓ Old backup cleanup completed"
}

# Generate backup report
generate_report() {
    log "Generating backup report..."

    local manifest_file
    if [[ "$COMPRESS_BACKUP" == "true" ]]; then
        manifest_file="${BACKUP_DIR%.tar.gz}/backup_manifest.json"
    else
        manifest_file="$BACKUP_DIR/backup_manifest.json"
    fi

    if [[ -f "$manifest_file" ]]; then
        # Update manifest with final status
        jq --arg status "completed" --arg end_time "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
            '.status = $status | .end_time = $end_time' \
            "$manifest_file" > "${manifest_file}.tmp"
        mv "${manifest_file}.tmp" "$manifest_file"

        # Display summary
        log "=== BACKUP SUMMARY ==="
        log "Backup ID: $(jq -r '.backup_id' "$manifest_file")"
        log "Type: $(jq -r '.type' "$manifest_file")"
        log "Status: $(jq -r '.status' "$manifest_file")"

        if [[ "$COMPRESS_BACKUP" == "true" ]]; then
            log "Location: $BACKUP_DIR"
            log "Size: $(du -h "$BACKUP_DIR" | cut -f1)"
        else
            log "Location: $BACKUP_DIR"
            log "Size: $(du -h "$BACKUP_DIR" | cut -f1)"
        fi

        if [[ "$UPLOAD_TO_S3" == "true" ]]; then
            local s3_location=$(jq -r '.s3_location // "not uploaded"' "$manifest_file")
            log "S3 Location: $s3_location"
        fi

        # Component summary
        log "Components backed up:"
        jq -r '.components[] | "  ✓ \(.name): \(.size_bytes | tostring | tonumber | . / 1024 / 1024 | floor)MB"' "$manifest_file"

        log "Backup completed successfully!"
    else
        warn "Backup manifest not found"
    fi
}

# Main backup function
main() {
    log "Starting $BACKUP_TYPE backup..."

    # Setup
    setup_backup_directory

    # Execute backup components
    backup_database
    backup_redis
    backup_application
    backup_logs
    backup_configuration

    # Post-processing
    compress_backup
    upload_to_s3
    cleanup_old_backups
    generate_report

    log "Backup process completed!"
}

# Trap for cleanup on exit
trap 'rm -f /tmp/backup_*.lock 2>/dev/null || true' EXIT

# Create lock file to prevent concurrent backups
LOCK_FILE="/tmp/backup_okr.lock"
if [[ -f "$LOCK_FILE" ]]; then
    error "Another backup is already running (lock file exists: $LOCK_FILE)"
fi

echo $$ > "$LOCK_FILE"

# Run main backup process
main

# Clean up lock file
rm -f "$LOCK_FILE"