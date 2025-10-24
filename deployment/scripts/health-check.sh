#!/bin/bash

# OKR AI Agent Health Check Script
# Usage: ./health-check.sh [--detailed] [--json] [--alerts]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
COMPOSE_FILE="$PROJECT_DIR/deployment/production/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/deployment/production/.env"

# Parse command line arguments
DETAILED=false
JSON_OUTPUT=false
CHECK_ALERTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --detailed)
            DETAILED=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --alerts)
            CHECK_ALERTS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--detailed] [--json] [--alerts]"
            exit 1
            ;;
    esac
done

# Colors for output (disabled for JSON)
if [[ "$JSON_OUTPUT" == "false" ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Global status tracking
OVERALL_STATUS="healthy"
FAILED_CHECKS=()
WARNINGS=()

# JSON output structure
JSON_RESULT='{
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "overall_status": "healthy",
    "services": {},
    "metrics": {},
    "alerts": [],
    "warnings": []
}'

# Logging functions
log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
    fi
}

warn() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
    fi
    WARNINGS+=("$1")
}

error() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    fi
    FAILED_CHECKS+=("$1")
    OVERALL_STATUS="unhealthy"
}

# Update JSON result
update_json() {
    local service="$1"
    local status="$2"
    local details="$3"

    JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg service "$service" --arg status "$status" --arg details "$details" \
        '.services[$service] = {"status": $status, "details": $details, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}')
}

# Check if Docker is running
check_docker() {
    log "Checking Docker status..."

    if docker info > /dev/null 2>&1; then
        log "✓ Docker is running"
        update_json "docker" "healthy" "Docker daemon is running"
        return 0
    else
        error "Docker is not running or not accessible"
        update_json "docker" "unhealthy" "Docker daemon is not running or not accessible"
        return 1
    fi
}

# Check service container status
check_service_containers() {
    log "Checking service container status..."

    local services=("nginx" "okr-server" "okr-client" "postgres" "redis" "prometheus" "grafana")

    for service in "${services[@]}"; do
        local container_name="okr-$service"
        [[ "$service" == "nginx" ]] && container_name="okr-nginx"

        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null)
            local health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_name" 2>/dev/null)

            if [[ "$status" == "running" ]]; then
                if [[ "$health" == "healthy" || "$health" == "no-healthcheck" ]]; then
                    log "✓ $service container is running and healthy"
                    update_json "$service" "healthy" "Container running, health: $health"
                else
                    warn "$service container is running but health check failed: $health"
                    update_json "$service" "warning" "Container running, health: $health"
                fi
            else
                error "$service container is not running (status: $status)"
                update_json "$service" "unhealthy" "Container not running, status: $status"
            fi
        else
            error "$service container not found"
            update_json "$service" "unhealthy" "Container not found"
        fi
    done
}

# Check application endpoints
check_endpoints() {
    log "Checking application endpoints..."

    # Server health endpoint
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        log "✓ Server health endpoint responding"
        update_json "server_endpoint" "healthy" "Health endpoint responding"
    else
        error "Server health endpoint not responding"
        update_json "server_endpoint" "unhealthy" "Health endpoint not responding"
    fi

    # Server API endpoint
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        log "✓ Server API endpoint responding"
        update_json "server_api" "healthy" "API endpoint responding"
    else
        error "Server API endpoint not responding"
        update_json "server_api" "unhealthy" "API endpoint not responding"
    fi

    # Client endpoint (if accessible)
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        log "✓ Client endpoint responding"
        update_json "client_endpoint" "healthy" "Client endpoint responding"
    else
        warn "Client endpoint not directly accessible (may be normal behind proxy)"
        update_json "client_endpoint" "warning" "Not directly accessible"
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."

    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U $DB_USER > /dev/null 2>&1; then
        log "✓ Database is accepting connections"
        update_json "database" "healthy" "Database accepting connections"

        # Check database stats if detailed
        if [[ "$DETAILED" == "true" ]]; then
            local conn_count=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' \n\r' || echo "unknown")
            log "  Database connections: $conn_count"
            JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg count "$conn_count" '.metrics.database_connections = $count')
        fi
    else
        error "Database is not accepting connections"
        update_json "database" "unhealthy" "Database not accepting connections"
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."

    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        log "✓ Redis is responding"
        update_json "redis" "healthy" "Redis responding to ping"

        # Check Redis memory usage if detailed
        if [[ "$DETAILED" == "true" ]]; then
            local memory_usage=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r\n' || echo "unknown")
            log "  Redis memory usage: $memory_usage"
            JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg usage "$memory_usage" '.metrics.redis_memory = $usage')
        fi
    else
        error "Redis is not responding"
        update_json "redis" "unhealthy" "Redis not responding to ping"
    fi
}

# Check system resources
check_system_resources() {
    if [[ "$DETAILED" == "false" ]]; then
        return 0
    fi

    log "Checking system resources..."

    # Memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    log "  Memory usage: $mem_usage"
    JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg usage "$mem_usage" '.metrics.memory_usage = $usage')

    # Disk usage
    local disk_usage=$(df / | awk 'NR==2{print $5}')
    log "  Disk usage: $disk_usage"
    JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg usage "$disk_usage" '.metrics.disk_usage = $usage')

    # Load average
    local load_avg=$(uptime | awk '{print $(NF-2) $(NF-1) $(NF)}' | tr -d ',')
    log "  Load average: $load_avg"
    JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg load "$load_avg" '.metrics.load_average = $load')

    # Check for high resource usage
    local mem_percent=$(echo "$mem_usage" | tr -d '%')
    if (( $(echo "$mem_percent > 85" | bc -l) )); then
        warn "High memory usage: $mem_usage"
    fi

    local disk_percent=$(echo "$disk_usage" | tr -d '%')
    if (( $(echo "$disk_percent > 85" | bc -l) )); then
        warn "High disk usage: $disk_usage"
    fi
}

# Check monitoring systems
check_monitoring() {
    log "Checking monitoring systems..."

    # Prometheus
    if curl -f -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
        log "✓ Prometheus is healthy"
        update_json "prometheus" "healthy" "Prometheus health endpoint responding"
    else
        warn "Prometheus health check failed"
        update_json "prometheus" "warning" "Health endpoint not responding"
    fi

    # Grafana
    if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log "✓ Grafana is healthy"
        update_json "grafana" "healthy" "Grafana health endpoint responding"
    else
        warn "Grafana health check failed"
        update_json "grafana" "warning" "Health endpoint not responding"
    fi
}

# Check for active alerts
check_active_alerts() {
    if [[ "$CHECK_ALERTS" == "false" ]]; then
        return 0
    fi

    log "Checking for active alerts..."

    # Query Prometheus for active alerts
    local alerts_response=$(curl -s http://localhost:9090/api/v1/alerts 2>/dev/null || echo '{"data":{"alerts":[]}}')
    local active_alerts=$(echo "$alerts_response" | jq -r '.data.alerts[] | select(.state=="firing") | .labels.alertname' 2>/dev/null || true)

    if [[ -n "$active_alerts" ]]; then
        while IFS= read -r alert; do
            warn "Active alert: $alert"
            JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg alert "$alert" '.alerts += [$alert]')
        done <<< "$active_alerts"
    else
        log "✓ No active alerts"
    fi
}

# Generate final report
generate_report() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        # Update overall status and warnings in JSON
        JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg status "$OVERALL_STATUS" '.overall_status = $status')

        # Add warnings to JSON
        for warning in "${WARNINGS[@]}"; do
            JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg warning "$warning" '.warnings += [$warning]')
        done

        # Add failed checks to JSON
        for check in "${FAILED_CHECKS[@]}"; do
            JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg check "$check" '.failed_checks += [$check]')
        done

        echo "$JSON_RESULT" | jq .
    else
        echo ""
        log "=== HEALTH CHECK SUMMARY ==="
        log "Overall Status: $OVERALL_STATUS"
        log "Timestamp: $(date)"

        if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
            echo -e "\n${RED}Failed Checks:${NC}"
            for check in "${FAILED_CHECKS[@]}"; do
                echo -e "${RED}  ✗ $check${NC}"
            done
        fi

        if [[ ${#WARNINGS[@]} -gt 0 ]]; then
            echo -e "\n${YELLOW}Warnings:${NC}"
            for warning in "${WARNINGS[@]}"; do
                echo -e "${YELLOW}  ⚠ $warning${NC}"
            done
        fi

        echo ""
    fi

    # Exit with appropriate code
    if [[ "$OVERALL_STATUS" == "unhealthy" ]]; then
        exit 1
    elif [[ ${#WARNINGS[@]} -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

# Main health check function
main() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        log "Starting OKR AI Agent health check..."
    fi

    # Initialize JSON output
    JSON_RESULT=$(echo "$JSON_RESULT" | jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" '.timestamp = $timestamp')

    # Run all health checks
    check_docker
    check_service_containers
    check_endpoints
    check_database
    check_redis
    check_system_resources
    check_monitoring
    check_active_alerts

    # Generate final report
    generate_report
}

# Run main function
main