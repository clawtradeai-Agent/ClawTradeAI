# Contributing to ClawTrade AI

Thank you for your interest in contributing to ClawTrade AI! This document provides guidelines and instructions for contributing.

## 🌟 How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node version, etc.)

**Example**:
```markdown
**Bug**: Agent fails to process tokens with special characters

**Steps to Reproduce**:
1. Add token with special character in name
2. Run agent scan
3. See error

**Expected**: Token should be processed
**Actual**: Error thrown

**Environment**: Node 20, macOS
```

### Suggesting Features

Feature suggestions are welcome! Please provide:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push** to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with project config
- **Linting**: ESLint with TypeScript rules
- **Naming**: Descriptive, camelCase for variables, PascalCase for types

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

**Examples**:
```
feat: add trailing stop loss to StrategyAgent
fix: resolve memory leak in agent loop
docs: update API documentation
refactor: extract quote logic to separate function
test: add unit tests for JupiterClient
```

### Testing

- Write tests for new features
- Maintain or improve code coverage
- Run tests before submitting PR:
  ```bash
  npm test
  ```

### Documentation

- Update README.md if adding features
- Add JSDoc comments for public APIs
- Update API docs if changing endpoints

## 🏗️ Architecture Overview

### Project Structure

```
clawtrade-ai/
├── apps/           # Applications (web, api)
├── packages/       # Shared packages
├── infra/          # Infrastructure configs
└── docs/           # Documentation
```

### Key Packages

- `@clawtrade/agents` - Multi-agent system
- `@clawtrade/blockchain` - Solana utilities
- `@clawtrade/trading` - Jupiter integration
- `@clawtrade/database` - Prisma schema
- `@clawtrade/ui` - UI components
- `@clawtrade/config` - Configuration

## 🧪 Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (for PostgreSQL, Redis)

### Setup

```bash
# Clone and install
git clone https://github.com/your-fork/clawtrade-ai.git
cd clawtrade-ai
npm install

# Setup environment
cp .env.example .env

# Start infrastructure
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate --workspace=@clawtrade/database

# Start development
npm run dev
```

## 📝 Areas for Contribution

### High Priority

- [ ] Unit tests for agents
- [ ] Performance optimizations
- [ ] Documentation improvements
- [ ] Bug fixes

### Nice to Have

- [ ] Additional technical indicators
- [ ] More trading strategies
- [ ] UI/UX improvements
- [ ] Mobile responsiveness

### Future Features

- [ ] Machine learning integration
- [ ] Additional blockchain support
- [ ] Advanced analytics dashboard
- [ ] Social trading features

## 🔒 Security Guidelines

When contributing:

1. **Never commit secrets** or API keys
2. **Validate all inputs** using Zod schemas
3. **Encrypt sensitive data** (wallet keys)
4. **Follow rate limiting** guidelines
5. **Test in mock mode** before real trading

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Discord**: Community support

## 🎯 Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by maintainers
3. **Testing** on staging environment
4. **Merge** to main branch

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ClawTrade AI! 🦾
