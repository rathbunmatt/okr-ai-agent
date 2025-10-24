# OKR AI Agent Server

A sophisticated Node.js/TypeScript backend server for the OKR AI Agent application, featuring conversational AI integration with Claude API, real-time WebSocket communication, and comprehensive OKR management.

## 🚀 Features

- **Claude AI Integration**: Conversational OKR coaching with Anthropic's Claude Sonnet 4
- **Multi-Phase Conversations**: Guided OKR creation through discovery, refinement, key result discovery, and validation phases
- **Real-time Communication**: WebSocket support for instant messaging and updates
- **REST API**: Complete RESTful API for session management and OKR operations
- **SQLite Database**: Efficient local database with comprehensive analytics tracking
- **Enterprise Security**: Rate limiting, input sanitization, CORS protection, and helmet security headers
- **Production Ready**: PM2 configuration, health monitoring, and deployment scripts

## 📋 Requirements

- Node.js 18+
- npm or yarn
- Anthropic API key (Claude access)

## ⚡ Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Run setup script (creates directories, builds project, initializes database)
./scripts/setup.sh
```

### 2. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**
- `ANTHROPIC_API_KEY`: Your Claude API key
- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 3000)

**Optional Environment Variables:**
- `DB_PATH`: SQLite database file path
- `CLAUDE_MODEL`: Claude model to use (default: claude-sonnet-4-20250514)
- `CORS_ORIGIN`: Allowed CORS origins
- `JWT_SECRET`: Secret for JWT tokens
- `LOG_LEVEL`: Logging verbosity

### 3. Database Setup

```bash
# Initialize database with schema and indexes
npm run db:init
```

### 4. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

The server will start on `http://localhost:3000` with the following endpoints:

- `GET /health` - Health check endpoint
- `POST /api/sessions` - Create new conversation session
- `GET /api/sessions/:id` - Get session details
- `WebSocket` - Real-time conversation on same port

## 🏗️ Architecture

### Core Components

- **DatabaseService**: SQLite database management with connection pooling
- **ClaudeService**: Anthropic API integration with rate limiting and caching
- **ConversationManager**: Multi-phase conversation orchestration
- **WebSocketHandler**: Real-time communication management
- **Security Middleware**: Comprehensive security layer

### Database Schema

- `sessions` - Conversation sessions with user context
- `messages` - Chat messages with AI responses and metadata
- `okr_sets` - Generated OKR objectives with quality scores
- `key_results` - Measurable key results linked to objectives
- `analytics_events` - Usage analytics and system events
- `feedback_data` - User feedback and ratings

### Conversation Phases

1. **Discovery** - Understanding user context and objectives
2. **Refinement** - Improving objective clarity and focus
3. **KR Discovery** - Creating measurable key results
4. **Validation** - Final quality assessment and scoring

## 🔒 Security Features

- **Rate Limiting**: Multi-tier rate limiting for different endpoint types
- **Input Sanitization**: XSS, SQL injection, and path traversal protection
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Comprehensive HTTP security headers via Helmet
- **Request Validation**: Suspicious pattern detection and blocking

## 🛠️ API Endpoints

### Sessions
- `POST /api/sessions` - Create new conversation session
- `GET /api/sessions/:id` - Retrieve session state and history
- `POST /api/sessions/:id/messages` - Send message (REST fallback for WebSocket)
- `POST /api/sessions/:id/transition` - Force phase transition
- `GET /api/sessions/:id/okrs` - Get current OKR state
- `DELETE /api/sessions/:id` - Delete session and data

### Export
- `GET /api/export/session/:id` - Export session data as JSON
- `GET /api/export/session/:id/pdf` - Export as PDF (future)

### Monitoring
- `GET /api/metrics` - System metrics and statistics
- `GET /api/monitor/sessions` - Active session monitoring

## 🔌 WebSocket Events

### Client → Server
- `join_session` - Join conversation session
- `send_message` - Send chat message
- `get_session_status` - Request session status
- `leave_session` - Leave session

### Server → Client
- `session_joined` - Successful session join
- `message_response` - AI response to user message
- `typing_indicator` - Typing status updates
- `phase_transition` - Conversation phase changes
- `session_error` - Error notifications

## 📊 Monitoring & Health Checks

### Health Check Response
```json
{
  "status": "healthy|degraded|error",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": { "status": "connected" },
  "claude": { "status": "connected" },
  "memory": { "used": 150.5, "total": 512.0 }
}
```

### System Metrics
- Server uptime and resource usage
- Database connection status and record counts
- WebSocket connection statistics
- Claude API usage and response times

## 🚀 Production Deployment

### PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 configuration
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 monit

# View logs
pm2 logs okr-ai-agent-server
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

1. **Database**: Configure persistent storage location
2. **SSL/TLS**: Set up reverse proxy (nginx) with certificates
3. **Monitoring**: Configure health checks and alerting
4. **Backups**: Implement automated database backups
5. **Logging**: Set up log rotation and centralized logging

## 🧪 Testing

```bash
# Run all tests
npm test

# Test Claude API integration
npm run test:claude-api

# Test conversation flows
npm run test:conversation-flow

# Run with coverage
npm run test:coverage
```

## 🔧 Development

### Project Structure
```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── database/        # Database schema and connection
│   ├── models/          # Repository pattern data access
│   ├── routes/          # Express route handlers
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── websocket/       # WebSocket handlers
├── scripts/             # Setup and utility scripts
├── logs/               # Log files (generated)
├── data/               # SQLite database files
└── dist/               # Compiled JavaScript output
```

### Code Style
- TypeScript with strict configuration
- ESLint for code linting
- Prettier for code formatting
- Repository pattern for data access
- Dependency injection for services

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit changes: `git commit -am 'Add new feature'`
7. Push to branch: `git push origin feature/new-feature`
8. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Ensure data directory exists and has proper permissions
- Check SQLite3 installation: `npm list sqlite3`
- Verify database path in environment variables

**Claude API Issues**
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API quota and rate limits
- Review Claude API status page

**WebSocket Connection Issues**
- Verify CORS configuration for WebSocket origins
- Check firewall rules for WebSocket connections
- Ensure client uses correct connection URL

**Memory/Performance Issues**
- Monitor memory usage: `GET /api/metrics`
- Adjust PM2 memory limits in `ecosystem.config.js`
- Review database query performance

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for detailed logging:

```bash
NODE_ENV=development LOG_LEVEL=debug npm run dev
```

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting guide above
- Review server logs for error details