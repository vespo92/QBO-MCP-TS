# Contributing to QBO-MCP-TS

Thank you for your interest in contributing to the QuickBooks Online MCP TypeScript Server! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a new branch** for your feature or fix
4. **Make your changes** with clear, descriptive commits
5. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+ (use `.nvmrc` with nvm for version management)
- npm 9+
- QuickBooks Online Developer Account (for testing)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/QBO-MCP-TS.git
cd QBO-MCP-TS

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your QuickBooks credentials

# Build the project
npm run build

# Run in development mode
npm run dev
```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, Node version, npm version)
- **Relevant logs or error messages**
- **Code samples** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, provide:

- **Clear title and description**
- **Use case and motivation**
- **Possible implementation approach**
- **Alternative solutions considered**
- **Breaking changes** if any

### Your First Code Contribution

Look for issues labeled:
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Documentation improvements

## Pull Request Process

1. **Ensure all tests pass**: `npm test`
2. **Run code quality checks**: `npm run check:all`
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Update CHANGELOG.md** with your changes
6. **Ensure PR description** clearly describes the problem and solution

### PR Title Format

Use conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks
- `perf:` Performance improvements

Example: `feat: add batch invoice processing support`

## Coding Standards

### TypeScript Guidelines

- Use **strict type checking**
- Avoid `any` types - use `unknown` or specific types
- Prefer **interfaces over type aliases** for objects
- Use **const assertions** where appropriate
- Document complex types with JSDoc comments

### Code Style

- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for formatting (run `npm run format`)
- Keep functions small and focused
- Use descriptive variable and function names
- Add comments for complex logic

### File Organization

```
src/
├── api/        # QuickBooks API client
├── services/   # Business logic services
├── tools/      # MCP tool definitions
├── resources/  # MCP resource definitions
├── transports/ # Transport implementations
├── types/      # TypeScript type definitions
├── utils/      # Utility functions
└── index.ts    # Entry point
```

## Testing Guidelines

### Writing Tests

- Place tests next to the code they test (`*.test.ts`)
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Test edge cases and error conditions

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Coverage

- Aim for **80%+ code coverage**
- Focus on critical business logic
- Don't test trivial getters/setters
- Test error handling paths

## Documentation

### Code Documentation

- Add **JSDoc comments** for public APIs
- Include **parameter descriptions**
- Document **return values** and exceptions
- Provide **usage examples** for complex functions

### README Updates

Update README.md when:
- Adding new features
- Changing configuration
- Modifying installation steps
- Adding new dependencies

### API Documentation

- Document all MCP tools and resources
- Include request/response examples
- Describe error conditions
- Update `examples/` directory

## Review Process

### What We Look For

- **Code quality** and adherence to standards
- **Test coverage** and quality
- **Documentation** completeness
- **Performance** considerations
- **Security** best practices
- **Backward compatibility**

### Review Timeline

- Initial review within **3-5 business days**
- Follow-up reviews within **2-3 business days**
- Merge after approval from maintainer

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create GitHub release with tag
4. Publish to npm (maintainers only)

## Community

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Email**: vespo92@gmail.com for sensitive issues

### Recognition

Contributors are recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes for significant contributions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for any questions about contributing. We're here to help!

---

Thank you for contributing to QBO-MCP-TS! 🎉