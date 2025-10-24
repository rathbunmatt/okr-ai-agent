# OKR AI Agent Monitoring Guide

Comprehensive monitoring, alerting, and observability guide for maintaining a healthy OKR AI Agent deployment.

## Monitoring Architecture

### Monitoring Stack Components

#### Prometheus (Metrics Collection)
- **Purpose**: Time-series metrics database
- **Port**: 9090
- **Configuration**: `deployment/monitoring/prometheus.yml`
- **Data Retention**: 15 days (configurable)

#### Grafana (Visualization)
- **Purpose**: Metrics dashboards and alerting
- **Port**: 3000
- **Default Login**: admin / [GRAFANA_ADMIN_PASSWORD]
- **Dashboards**: `deployment/monitoring/grafana-dashboards/`

#### Node Exporter (System Metrics)
- **Purpose**: Server hardware and OS metrics
- **Port**: 9100
- **Metrics**: CPU, memory, disk, network

#### Application Metrics (Custom)
- **Purpose**: Business and application-specific metrics
- **Endpoint**: `/metrics` on server (port 3001)
- **Format**: Prometheus format

## Key Metrics to Monitor

### System-Level Metrics

#### CPU Usage
- **Metric**: `node_cpu_seconds_total`
- **Alert Threshold**: >80% for 5+ minutes
- **Normal Range**: 10-50%
- **Investigation**: Check high CPU processes, scaling needs

#### Memory Usage
- **Metric**: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes`
- **Alert Threshold**: >85% utilized
- **Normal Range**: 40-70%
- **Investigation**: Memory leaks, cache size, application scaling

#### Disk Space
- **Metric**: `node_filesystem_avail_bytes / node_filesystem_size_bytes`
- **Alert Threshold**: >85% utilized
- **Normal Range**: <75%
- **Investigation**: Log rotation, backup cleanup, database growth

#### Network I/O
- **Metric**: `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`
- **Monitor**: Bandwidth utilization, error rates
- **Investigation**: Traffic patterns, DDoS attacks, scaling needs

### Application-Level Metrics

#### HTTP Request Metrics
```javascript
// Example metrics being collected
http_requests_total{method="GET", route="/api/conversations", status="200"}
http_request_duration_seconds{method="POST", route="/api/conversations"}
```

**Key Indicators**:
- **Request Rate**: Requests per second
- **Response Time**: 95th percentile latency
- **Error Rate**: 4xx/5xx error percentage
- **Throughput**: Successful requests per second

#### Database Metrics
- **Connection Pool**: Active connections vs. pool size
- **Query Performance**: Slow query count, average query time
- **Database Size**: Table sizes, index usage
- **Locks**: Lock waits, deadlocks

#### Business Metrics
- **Conversations**: Started, completed, abandoned
- **User Engagement**: Session duration, return rate
- **OKR Quality**: Average scores, improvement trends
- **AI Performance**: Response time, accuracy feedback

### Service Health Metrics

#### Service Availability
- **Metric**: `up{job="service_name"}`
- **Alert Threshold**: service down for >1 minute
- **Services Monitored**: nginx, server, postgres, redis

#### Health Check Endpoints
- **Server Health**: `GET /health`
- **Database Health**: Connection test
- **Redis Health**: Ping test
- **External Services**: OpenAI API connectivity

## Dashboard Configuration

### System Overview Dashboard

#### Key Panels
1. **System Status**: Service up/down indicators
2. **Response Times**: API response time trends
3. **Error Rates**: Error percentage over time
4. **Active Users**: Current user sessions
5. **Resource Usage**: CPU, memory, disk utilization
6. **Database Performance**: Query times, connections

#### Sample Grafana Queries
```promql
# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

### Business Intelligence Dashboard

#### Conversation Analytics
- **Conversation Volume**: Total conversations per day/week
- **Completion Rate**: Percentage of completed conversations
- **User Satisfaction**: Average feedback ratings
- **Response Quality**: OKR quality score trends

#### Performance Analytics
- **AI Response Time**: Time to generate responses
- **User Engagement**: Session duration, pages per session
- **Feature Usage**: Most used features, adoption rates
- **Geographic Usage**: User distribution by location

### Technical Performance Dashboard

#### Application Performance
- **Throughput**: Requests per second over time
- **Latency Distribution**: P50, P95, P99 response times
- **Error Breakdown**: Error types and frequencies
- **Cache Performance**: Hit rates, miss rates

#### Infrastructure Performance
- **Container Metrics**: CPU, memory per container
- **Network Performance**: Bandwidth utilization
- **Storage I/O**: Disk read/write operations
- **Database Performance**: Query execution times

## Alerting Configuration

### Critical Alerts (Immediate Action Required)

#### Service Down
```yaml
alert: ServiceDown
expr: up{job=~"okr-.*"} == 0
for: 1m
severity: critical
description: "{{ $labels.job }} service is down"
```

#### High Error Rate
```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
for: 2m
severity: critical
description: "Error rate above 5% for {{ $labels.job }}"
```

#### Database Connection Issues
```yaml
alert: DatabaseConnectionFailure
expr: increase(db_connection_errors_total[5m]) > 10
for: 1m
severity: critical
description: "Database connection errors detected"
```

### Warning Alerts (Monitor and Plan Action)

#### High Response Time
```yaml
alert: HighResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
severity: warning
description: "95th percentile response time above 2 seconds"
```

#### High CPU Usage
```yaml
alert: HighCPUUsage
expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
for: 5m
severity: warning
description: "CPU usage above 80% on {{ $labels.instance }}"
```

#### Low Disk Space
```yaml
alert: LowDiskSpace
expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
for: 1m
severity: warning
description: "Disk usage above 85% on {{ $labels.instance }}"
```

### Information Alerts (Awareness)

#### Unusual Traffic Patterns
- Sudden traffic spikes (>3x normal)
- Traffic drops (>50% below normal)
- Geographic anomalies

#### Business Metrics
- Low user engagement trends
- Decreasing conversation completion rates
- Quality score degradation

## Log Monitoring

### Log Aggregation Strategy

#### Log Sources
- **Application Logs**: Server application logs
- **Access Logs**: Nginx request logs
- **System Logs**: System and Docker logs
- **Database Logs**: PostgreSQL query and error logs

#### Log Levels
- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues that should be monitored
- **INFO**: General operational information
- **DEBUG**: Detailed troubleshooting information

### Important Log Patterns to Monitor

#### Application Errors
```bash
# Monitor for application errors
grep -i "error\|exception\|fatal" logs/server/app.log

# OpenAI API errors
grep "OpenAI API error" logs/server/app.log

# Database connection issues
grep "database.*error\|connection.*failed" logs/server/app.log
```

#### Security Events
```bash
# Failed authentication attempts
grep "authentication failed\|invalid token" logs/server/app.log

# Suspicious request patterns
grep "rate limit\|blocked request" logs/nginx/access.log

# SQL injection attempts
grep -i "select.*union\|drop.*table" logs/nginx/access.log
```

#### Performance Issues
```bash
# Slow database queries
grep "slow query\|execution time" logs/postgres/postgres.log

# High memory usage warnings
grep "memory.*high\|out of memory" logs/server/app.log

# Request timeouts
grep "timeout\|request.*too long" logs/nginx/error.log
```

## Performance Monitoring

### Response Time Monitoring

#### Target Response Times
- **API Endpoints**: <500ms for 95th percentile
- **Database Queries**: <100ms average
- **Static Assets**: <200ms
- **Full Page Load**: <3 seconds

#### Performance Benchmarks
```bash
# API endpoint performance test
curl -w "@curl-format.txt" -s -o /dev/null https://yourdomain.com/api/health

# Database query performance
docker-compose exec postgres psql -U okr_user -d okr_production -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;"
```

### Capacity Planning

#### Growth Trending
- **User Growth**: Track user registration and activity trends
- **Data Growth**: Monitor database and storage growth
- **Traffic Growth**: Analyze request volume trends
- **Resource Utilization**: Track CPU, memory, and disk trends

#### Scaling Indicators
- **CPU**: Consistently >70% utilization
- **Memory**: >80% utilization with growth trend
- **Database**: Connection pool exhaustion, slow queries
- **Disk I/O**: High wait times, queue depths

### Load Testing Integration

#### Automated Load Tests
```bash
# Run load test against staging
artillery run performance-tests/load-testing.yml

# Monitor performance during test
./deployment/scripts/health-check.sh --detailed
```

#### Load Test Scenarios
- **Normal Load**: Expected daily traffic patterns
- **Peak Load**: Maximum expected traffic (2x normal)
- **Stress Test**: Breaking point identification (5x normal)
- **Spike Test**: Sudden traffic increases

## Troubleshooting Playbooks

### High Response Time Investigation

#### Step 1: Identify the Bottleneck
```bash
# Check system resources
docker stats

# Check database performance
docker-compose exec postgres psql -U okr_user -d okr_production -c "
  SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check application logs
docker-compose logs server | tail -100
```

#### Step 2: Common Causes and Solutions
- **Database Issues**: Optimize queries, add indexes, scale database
- **Memory Issues**: Restart services, investigate memory leaks
- **Network Issues**: Check bandwidth, CDN configuration
- **Code Issues**: Profile application, identify bottlenecks

### Error Rate Spike Investigation

#### Step 1: Categorize Errors
```bash
# Check error distribution
grep -E "4[0-9]{2}|5[0-9]{2}" logs/nginx/access.log |
  awk '{print $9}' | sort | uniq -c | sort -nr

# Check application errors
grep -i "error" logs/server/app.log | tail -20
```

#### Step 2: Common Error Patterns
- **500 Errors**: Application bugs, database issues, dependency failures
- **502/503 Errors**: Service unavailability, proxy issues
- **429 Errors**: Rate limiting, DDoS protection
- **400 Errors**: Client-side issues, validation failures

### Service Down Recovery

#### Step 1: Quick Assessment
```bash
# Check service status
docker-compose ps

# Check health endpoints
curl -f http://localhost:3001/health || echo "Server unhealthy"
curl -f http://localhost:3000/health || echo "Client unhealthy"
```

#### Step 2: Recovery Actions
```bash
# Restart individual service
docker-compose restart server

# Restart all services
docker-compose restart

# Emergency rollback if needed
./deployment/scripts/rollback.sh [previous_version] "Service recovery"
```

## Maintenance and Optimization

### Regular Monitoring Tasks

#### Daily
- Review dashboard alerts and clear resolved issues
- Check system resource trends
- Verify backup completion
- Monitor user activity patterns

#### Weekly
- Analyze performance trends and capacity needs
- Review and tune alert thresholds
- Update monitoring documentation
- Conduct load testing if needed

#### Monthly
- Review and archive old metrics data
- Update monitoring tools and dashboards
- Conduct monitoring system health checks
- Plan capacity upgrades if needed

### Dashboard Maintenance

#### Dashboard Best Practices
- **Keep It Simple**: Focus on key metrics, avoid clutter
- **Use Consistent Timeframes**: Standardize time ranges across panels
- **Color Coding**: Use consistent colors for status indicators
- **Annotations**: Mark deployments, incidents, and changes

#### Regular Updates
- Add new metrics as features are added
- Remove obsolete metrics and panels
- Update alert thresholds based on historical data
- Optimize query performance for large time ranges

## Integration with External Tools

### Incident Management
```bash
# Create incident response webhook
curl -X POST https://your-incident-tool.com/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "OKR Service Down", "severity": "critical"}'
```

### Communication Channels
- **Slack Integration**: Alert notifications to team channels
- **Email Alerts**: Critical issues to on-call engineers
- **PagerDuty**: Escalation for after-hours incidents
- **Status Page**: Public status updates for users

### Monitoring as Code
```yaml
# Example: monitoring configuration in version control
monitoring:
  dashboards:
    - name: "System Overview"
      file: "system-overview.json"
    - name: "Business Metrics"
      file: "business-metrics.json"

  alerts:
    - name: "Service Down"
      file: "service-down.yml"
    - name: "High Error Rate"
      file: "high-error-rate.yml"
```

---

## Monitoring Checklist

### Setup Verification
- [ ] Prometheus collecting metrics from all services
- [ ] Grafana dashboards imported and functional
- [ ] Alert rules configured and tested
- [ ] Log aggregation working correctly
- [ ] Health check endpoints responding

### Operational Readiness
- [ ] Alert notification channels configured
- [ ] On-call rotation established
- [ ] Incident response procedures documented
- [ ] Monitoring documentation updated
- [ ] Team trained on monitoring tools

### Ongoing Maintenance
- [ ] Regular dashboard and alert review scheduled
- [ ] Capacity planning process established
- [ ] Monitoring system backup procedures
- [ ] Performance baseline documentation
- [ ] Troubleshooting runbooks updated

Ready to monitor your OKR AI Agent deployment? Follow this guide and establish comprehensive observability for your production system.