# OKR AI Agent API Reference

Complete REST API documentation for integrating with the OKR AI Agent system.

## Base Information

- **Base URL**: `https://yourdomain.com/api`
- **Version**: v1
- **Protocol**: HTTPS only
- **Authentication**: JWT Bearer tokens
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests per 15 minutes per user

## Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "industry": "technology",
    "preferences": {
      "theme": "light",
      "language": "en"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "Jane Smith",
  "industry": "technology",
  "role": "product_manager"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "name": "Jane Smith"
  }
}
```

#### POST /api/auth/refresh
Refresh JWT token before expiration.

**Request Body:**
```json
{
  "token": "current-jwt-token"
}
```

**Response (200):**
```json
{
  "token": "new-jwt-token",
  "expires_at": "2024-01-01T12:00:00Z"
}
```

## Conversations API

### GET /api/conversations
Retrieve user's conversation history.

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 20, max: 100)
- `offset` (optional): Number of conversations to skip (default: 0)
- `status` (optional): Filter by status (`active`, `completed`, `abandoned`)
- `industry` (optional): Filter by industry

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv-uuid-1",
      "title": "Q4 Product Development OKRs",
      "status": "completed",
      "industry": "technology",
      "role": "product_manager",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:45:00Z",
      "quality_score": 87.5,
      "message_count": 12,
      "completion_percentage": 100
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### POST /api/conversations
Start a new OKR conversation.

**Request Body:**
```json
{
  "industry": "technology",
  "role": "engineering_manager",
  "context": "Building a new mobile application platform",
  "objectives": [],
  "preferences": {
    "focus_area": "product_development",
    "time_horizon": "quarterly"
  }
}
```

**Response (201):**
```json
{
  "conversation": {
    "id": "new-conv-uuid",
    "title": "New OKR Conversation",
    "status": "active",
    "industry": "technology",
    "role": "engineering_manager",
    "created_at": "2024-01-16T09:00:00Z",
    "quality_score": null,
    "message_count": 0,
    "context": {
      "industry": "technology",
      "role": "engineering_manager",
      "focus_area": "product_development"
    }
  },
  "initial_message": {
    "id": "msg-uuid-1",
    "content": "Hello! I'm here to help you create high-quality OKRs for your engineering team...",
    "type": "ai_response",
    "timestamp": "2024-01-16T09:00:00Z"
  }
}
```

### GET /api/conversations/:id
Get specific conversation details.

**Response (200):**
```json
{
  "conversation": {
    "id": "conv-uuid-1",
    "title": "Q4 Product Development OKRs",
    "status": "completed",
    "industry": "technology",
    "role": "product_manager",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:45:00Z",
    "quality_score": 87.5,
    "context": {
      "industry": "technology",
      "role": "product_manager",
      "company_size": "startup",
      "time_horizon": "quarterly"
    },
    "objectives": [
      {
        "id": "obj-uuid-1",
        "text": "Deliver exceptional user experience in our mobile platform",
        "quality_score": 85,
        "key_results": [
          {
            "id": "kr-uuid-1",
            "text": "Achieve app store rating of 4.5+ stars",
            "baseline": "3.8 stars",
            "target": "4.5+ stars",
            "quality_score": 90
          }
        ]
      }
    ]
  }
}
```

### PUT /api/conversations/:id
Update conversation details.

**Request Body:**
```json
{
  "title": "Updated Conversation Title",
  "status": "completed",
  "objectives": [
    {
      "id": "obj-uuid-1",
      "text": "Updated objective text",
      "key_results": [
        {
          "id": "kr-uuid-1",
          "text": "Updated key result text",
          "baseline": "Updated baseline",
          "target": "Updated target"
        }
      ]
    }
  ]
}
```

**Response (200):**
```json
{
  "conversation": {
    "id": "conv-uuid-1",
    "title": "Updated Conversation Title",
    "status": "completed",
    "updated_at": "2024-01-16T10:00:00Z",
    "quality_score": 89.2
  }
}
```

### DELETE /api/conversations/:id
Delete a conversation.

**Response (200):**
```json
{
  "message": "Conversation deleted successfully"
}
```

## Messages API

### GET /api/conversations/:id/messages
Get messages for a specific conversation.

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50, max: 200)
- `offset` (optional): Number to skip (default: 0)

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg-uuid-1",
      "conversation_id": "conv-uuid-1",
      "content": "I need help creating OKRs for our product team.",
      "type": "user_message",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg-uuid-2",
      "conversation_id": "conv-uuid-1",
      "content": "I'd be happy to help! Let's start by understanding your product goals...",
      "type": "ai_response",
      "timestamp": "2024-01-15T10:30:15Z",
      "metadata": {
        "response_time_ms": 1200,
        "confidence_score": 0.95,
        "suggestions": ["product_goals", "user_metrics", "technical_okrs"]
      }
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 50,
    "offset": 0
  }
}
```

### POST /api/conversations/:id/messages
Send a message to continue the conversation.

**Request Body:**
```json
{
  "content": "We want to improve our mobile app user experience.",
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "session_id": "session-uuid"
  }
}
```

**Response (201):**
```json
{
  "message": {
    "id": "new-msg-uuid",
    "conversation_id": "conv-uuid-1",
    "content": "We want to improve our mobile app user experience.",
    "type": "user_message",
    "timestamp": "2024-01-16T09:15:00Z"
  },
  "ai_response": {
    "id": "ai-msg-uuid",
    "conversation_id": "conv-uuid-1",
    "content": "Excellent goal! Let's create OKRs around mobile UX. Tell me about your current app rating and key user pain points...",
    "type": "ai_response",
    "timestamp": "2024-01-16T09:15:02Z",
    "suggestions": [
      {
        "type": "objective",
        "text": "Deliver exceptional mobile user experience",
        "confidence": 0.88
      },
      {
        "type": "key_result",
        "text": "Improve app store rating from X to Y",
        "confidence": 0.92
      }
    ],
    "metadata": {
      "response_time_ms": 1850,
      "model_version": "gpt-4",
      "industry_context": "technology"
    }
  }
}
```

## Feedback API

### POST /api/conversations/:id/feedback
Provide feedback on AI responses.

**Request Body:**
```json
{
  "message_id": "ai-msg-uuid",
  "rating": "positive",
  "feedback_type": "quality",
  "comment": "Great suggestion for the key result!",
  "categories": ["helpful", "accurate", "industry_specific"]
}
```

**Response (201):**
```json
{
  "feedback": {
    "id": "feedback-uuid",
    "message_id": "ai-msg-uuid",
    "rating": "positive",
    "feedback_type": "quality",
    "created_at": "2024-01-16T09:20:00Z"
  },
  "message": "Feedback recorded successfully"
}
```

### GET /api/feedback/analytics
Get aggregated feedback analytics (admin only).

**Query Parameters:**
- `start_date` (optional): Start date for analytics
- `end_date` (optional): End date for analytics
- `industry` (optional): Filter by industry

**Response (200):**
```json
{
  "analytics": {
    "total_feedback": 1250,
    "positive_rate": 0.847,
    "average_quality_score": 4.2,
    "feedback_categories": {
      "helpful": 892,
      "accurate": 756,
      "industry_specific": 623,
      "needs_improvement": 89
    },
    "trends": {
      "daily_feedback": [
        {"date": "2024-01-15", "positive": 45, "negative": 8},
        {"date": "2024-01-16", "positive": 52, "negative": 6}
      ]
    }
  }
}
```

## Templates API

### GET /api/templates
Get OKR templates and examples.

**Query Parameters:**
- `industry` (optional): Filter by industry
- `role` (optional): Filter by role
- `category` (optional): Template category
- `search` (optional): Search term

**Response (200):**
```json
{
  "templates": [
    {
      "id": "template-uuid-1",
      "title": "Product Development OKRs for SaaS",
      "industry": "technology",
      "role": "product_manager",
      "category": "product_development",
      "description": "Comprehensive OKRs for SaaS product development teams",
      "objectives": [
        {
          "text": "Accelerate product development velocity",
          "key_results": [
            "Increase sprint velocity from 45 to 60 story points",
            "Reduce bug escape rate to <2% of released features",
            "Ship 3 major features ahead of roadmap schedule"
          ],
          "quality_score": 89
        }
      ],
      "usage_count": 156,
      "rating": 4.7,
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 89,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /api/templates/:id
Get specific template details.

**Response (200):**
```json
{
  "template": {
    "id": "template-uuid-1",
    "title": "Product Development OKRs for SaaS",
    "industry": "technology",
    "role": "product_manager",
    "category": "product_development",
    "description": "Comprehensive OKRs for SaaS product development teams focusing on velocity, quality, and customer value delivery.",
    "objectives": [
      {
        "text": "Accelerate product development velocity while maintaining quality",
        "explanation": "This objective focuses on shipping faster without compromising on quality or customer value.",
        "key_results": [
          {
            "text": "Increase sprint velocity from 45 to 60 story points per sprint",
            "type": "efficiency",
            "measurement_method": "Story points completed per sprint over 8-week period",
            "baseline_explanation": "Current team velocity based on last 6 sprints"
          }
        ]
      }
    ],
    "implementation_notes": [
      "Establish baseline measurements before starting",
      "Review and adjust targets after first month",
      "Ensure team alignment on story point estimation"
    ],
    "success_factors": [
      "Team buy-in and commitment",
      "Clear measurement processes",
      "Regular progress reviews"
    ],
    "common_pitfalls": [
      "Focusing only on velocity without quality",
      "Not accounting for team learning curve",
      "Setting unrealistic stretch goals"
    ]
  }
}
```

## Analytics API

### GET /api/analytics/dashboard
Get user dashboard analytics.

**Response (200):**
```json
{
  "dashboard": {
    "user_stats": {
      "total_conversations": 12,
      "completed_conversations": 8,
      "average_quality_score": 84.2,
      "improvement_trend": "+5.3%"
    },
    "recent_activity": [
      {
        "type": "conversation_completed",
        "title": "Q4 Engineering OKRs",
        "quality_score": 87.5,
        "date": "2024-01-15T11:45:00Z"
      }
    ],
    "quality_breakdown": {
      "objective_quality": 86.2,
      "key_result_quality": 82.8,
      "overall_alignment": 85.5
    },
    "industry_benchmarks": {
      "your_score": 84.2,
      "industry_average": 78.6,
      "top_quartile": 88.1
    }
  }
}
```

### GET /api/analytics/quality-trends
Get quality score trends over time.

**Query Parameters:**
- `period` (optional): `week`, `month`, `quarter` (default: month)
- `metric` (optional): Specific metric to track

**Response (200):**
```json
{
  "trends": {
    "period": "month",
    "data_points": [
      {
        "date": "2024-01-01",
        "average_quality": 79.2,
        "conversations_count": 3
      },
      {
        "date": "2024-01-08",
        "average_quality": 82.1,
        "conversations_count": 2
      },
      {
        "date": "2024-01-15",
        "average_quality": 84.2,
        "conversations_count": 4
      }
    ],
    "summary": {
      "total_improvement": "+5.0 points",
      "trend_direction": "improving",
      "consistency_score": 0.78
    }
  }
}
```

## User Management API

### GET /api/users/profile
Get current user profile.

**Response (200):**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "product_manager",
    "industry": "technology",
    "created_at": "2023-12-01T00:00:00Z",
    "preferences": {
      "theme": "light",
      "language": "en",
      "email_notifications": true,
      "industry_insights": true
    },
    "stats": {
      "total_conversations": 15,
      "average_quality_score": 84.2,
      "favorite_templates": ["product_development", "user_growth"]
    }
  }
}
```

### PUT /api/users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "role": "engineering_manager",
  "preferences": {
    "theme": "dark",
    "email_notifications": false
  }
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-uuid",
    "name": "John Smith",
    "role": "engineering_manager",
    "updated_at": "2024-01-16T10:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

## System Health API

### GET /api/health
System health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-16T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy"
  },
  "metrics": {
    "response_time_ms": 45,
    "active_connections": 127,
    "memory_usage_mb": 245
  }
}
```

### GET /api/health/detailed
Detailed health information (admin only).

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-16T10:00:00Z",
  "uptime_seconds": 864000,
  "services": {
    "database": {
      "status": "healthy",
      "connection_pool": {
        "active": 5,
        "idle": 15,
        "total": 20
      },
      "query_performance": {
        "avg_query_time_ms": 23,
        "slow_query_count": 2
      }
    },
    "redis": {
      "status": "healthy",
      "memory_usage": "45MB",
      "connected_clients": 12
    },
    "openai": {
      "status": "healthy",
      "api_response_time_ms": 1200,
      "rate_limit_remaining": 89
    }
  }
}
```

## Error Responses

### Standard Error Format
All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "industry",
        "message": "Industry is required"
      }
    ],
    "timestamp": "2024-01-16T10:00:00Z",
    "request_id": "req-uuid-123"
  }
}
```

### Common Error Codes

#### Authentication Errors (401)
- `INVALID_TOKEN`: JWT token is invalid or expired
- `MISSING_TOKEN`: Authorization header missing
- `TOKEN_EXPIRED`: JWT token has expired

#### Authorization Errors (403)
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_FORBIDDEN`: Cannot access requested resource

#### Validation Errors (400)
- `VALIDATION_ERROR`: Request parameters are invalid
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_FORMAT`: Field format is incorrect

#### Rate Limiting (429)
- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `QUOTA_EXCEEDED`: User has exceeded usage quota

#### Server Errors (500)
- `INTERNAL_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: External service dependency unavailable
- `DATABASE_ERROR`: Database connection or query error

## Rate Limiting

### Default Limits
- **Authentication**: 5 requests per minute
- **Conversations**: 10 conversations per hour
- **Messages**: 100 messages per hour
- **General API**: 100 requests per 15 minutes

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642320000
X-RateLimit-Window: 900
```

### Handling Rate Limits
When rate limited, implement exponential backoff:

```javascript
async function apiRequest(url, options) {
  let delay = 1000; // Start with 1 second

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // Exponential backoff
  }

  throw new Error('Rate limit exceeded after retries');
}
```

---

## SDK and Integration Examples

For detailed integration examples and SDK documentation, see:
- [Integration Examples](/docs/api/integration-examples)
- [Authentication Guide](/docs/api/authentication)
- [JavaScript SDK](/docs/api/javascript-sdk)
- [Python SDK](/docs/api/python-sdk)

Need help with integration? Contact our API support team at api-support@yourdomain.com.