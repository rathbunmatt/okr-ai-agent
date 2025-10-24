# Contributing to OKR AI Agent

First off, thank you for considering contributing to the OKR AI Agent! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, logs, screenshots)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any similar features** in other projects if applicable

### Pull Requests

- **Fill in the pull request template** completely
- **Follow the TypeScript styleguide**
- **Include tests** for new functionality
- **Update documentation** as needed
- **End files with a newline**
- **Follow the existing code structure and patterns**

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Anthropic Claude API key

### Getting Started

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/rathbunmatt/okr-ai-agent.git
   cd okr-ai-agent
   ```

2. **Install dependencies**:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Set up environment**:
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your API key
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Start development servers**:
   ```bash
   # Terminal 1: Start backend
   cd server
   npm run dev

   # Terminal 2: Start frontend
   cd client
   npm run dev
   ```

## Styleguide

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line

### TypeScript Styleguide

- Use TypeScript strict mode
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing code formatting (we use Prettier)
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw Promises where possible

### Testing Styleguide

- Write tests for all new features
- Ensure existing tests pass before submitting PR
- Aim for >80% code coverage
- Use descriptive test names
- Group related tests using `describe` blocks

## Project Structure

```
okrs/
├── server/              # Backend API and services
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── controllers/ # API endpoint handlers
│   │   ├── services/    # Business logic
│   │   ├── models/      # Database models
│   │   └── utils/       # Utility functions
│   └── tests/           # Backend tests
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API clients
│   │   └── utils/       # Utility functions
│   └── tests/           # Frontend tests
└── docs/                # Project documentation
```

## Pull Request Process

1. **Update documentation** as needed for your changes
2. **Add tests** that prove your fix/feature works
3. **Ensure all tests pass** (`npm test`)
4. **Update the CHANGELOG.md** (once created) with your changes
5. **Request review** from maintainers
6. **Address review feedback** promptly and respectfully

## Recognition

Contributors who submit accepted pull requests will be:
- Added to the CONTRIBUTORS file
- Mentioned in release notes
- Credited in the project documentation

## Questions?

Feel free to open an issue with your question, or reach out to the maintainers directly.

---

**Thank you for contributing!**
