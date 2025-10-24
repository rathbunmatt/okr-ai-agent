#!/bin/bash

# OKR AI Agent Server Setup Script
# This script sets up the server environment for development and production

set -e  # Exit on any error

echo "🚀 Setting up OKR AI Agent Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available. Please ensure npm is installed."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# Set proper permissions
chmod 755 data logs uploads backups
print_success "Directories created with proper permissions"

# Install dependencies
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before running the server"
    print_warning "Don't forget to set your ANTHROPIC_API_KEY!"
else
    print_success ".env file found"
fi

# Build the TypeScript project
print_status "Building TypeScript project..."
npm run build
if [ $? -eq 0 ]; then
    print_success "TypeScript build completed successfully"
else
    print_error "TypeScript build failed. Please check for compilation errors."
    exit 1
fi

# Initialize database
print_status "Initializing database..."
npm run db:init
if [ $? -eq 0 ]; then
    print_success "Database initialized successfully"
else
    print_warning "Database initialization may have failed. Check logs for details."
fi

# Run tests if they exist
if npm run test:check &> /dev/null; then
    print_status "Running tests..."
    npm test
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed. Review test output above."
    fi
else
    print_warning "No test script found, skipping tests"
fi

# Security checklist
echo ""
print_status "🔒 Security Checklist:"
echo "  □ Set strong JWT_SECRET in .env"
echo "  □ Set secure ANTHROPIC_API_KEY in .env"
echo "  □ Configure CORS_ORIGIN for production"
echo "  □ Review rate limiting settings"
echo "  □ Set appropriate LOG_LEVEL for production"
echo "  □ Configure SSL certificates for production"
echo "  □ Set up firewall rules"
echo "  □ Enable database encryption if needed"

# Production notes
echo ""
print_status "📋 Production Deployment Notes:"
echo "  • Use PM2 or similar process manager"
echo "  • Set up reverse proxy (nginx/Apache)"
echo "  • Configure SSL/TLS certificates"
echo "  • Set up automated backups"
echo "  • Configure log rotation"
echo "  • Monitor server resources"
echo "  • Set up health check endpoints"

echo ""
print_success "🎉 Setup completed successfully!"
print_status "To start the server in development mode: npm run dev"
print_status "To start the server in production mode: npm start"
print_status "To run Claude API tests: npm run test:claude"

echo ""
print_warning "Remember to:"
print_warning "1. Configure your .env file with actual values"
print_warning "2. Set your ANTHROPIC_API_KEY"
print_warning "3. Review security settings before production deployment"