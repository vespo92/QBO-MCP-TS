# Security Policy

## Supported Versions

We actively maintain security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of QBO-MCP-TS seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Create a Public Issue

Please **DO NOT** create a public GitHub issue for security vulnerabilities. This helps prevent malicious exploitation of the vulnerability before it can be addressed.

### 2. Contact Us Privately

Report security vulnerabilities by emailing: **vespo92@gmail.com**

Please include:
- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

## Security Best Practices

When using QBO-MCP-TS, follow these security best practices:

### Authentication & Authorization

- **Never commit credentials** to version control
- **Use environment variables** for sensitive configuration
- **Rotate OAuth tokens** regularly
- **Implement rate limiting** in production
- **Use HTTPS** for all API communications

### QuickBooks OAuth2 Security

```bash
# Store credentials securely
export QB_CLIENT_ID="your_client_id"
export QB_CLIENT_SECRET="your_client_secret"  # Never commit!
export QB_REDIRECT_URI="https://your-domain.com/callback"
```

### Token Storage

- Store refresh tokens **encrypted** in production
- Use secure key management services (AWS KMS, Azure Key Vault)
- Implement token expiry checks
- Never log tokens or sensitive data

### API Security

- Validate all input data
- Sanitize data before sending to QuickBooks
- Implement request signing if available
- Monitor for suspicious activity

## Known Security Considerations

### 1. Token Management

The server handles OAuth2 tokens which must be protected:
- Tokens are never logged
- Token refresh is automatic
- Expired tokens are invalidated

### 2. Rate Limiting

Implement rate limiting to prevent abuse:
```typescript
// Built-in rate limiting for SSE transport
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
```

### 3. Input Validation

All inputs are validated using Zod schemas:
- Date ranges are limited
- String lengths are capped
- SQL injection prevention

### 4. CORS Configuration

Configure CORS appropriately for production:
```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
};
```

## Security Features

### Built-in Protections

- **Input validation** using Zod schemas
- **SQL injection prevention** in query building
- **XSS protection** in response handling
- **Rate limiting** for API endpoints
- **Request timeouts** to prevent DoS
- **Error message sanitization**

### Audit Logging

Enable comprehensive logging for security monitoring:
```typescript
// Security-relevant events are logged
logger.security('OAuth token refreshed', { userId, timestamp });
logger.security('Failed authentication attempt', { ip, timestamp });
```

## Dependency Security

### Automated Scanning

- Regular dependency updates
- npm audit on CI/CD pipeline
- Automated security PR reviews

### Manual Review

Run security audit locally:
```bash
# Check for vulnerabilities
npm audit

# Auto-fix when possible
npm audit fix

# Check for outdated packages
npm outdated
```

## Compliance

### Data Protection

- No storage of sensitive QuickBooks data
- Temporary caching with TTL
- Secure data transmission only
- PII handling compliance

### Standards

We aim to comply with:
- OWASP Top 10 guidelines
- OAuth 2.0 security best practices
- Node.js security best practices

## Security Updates

### Notification Process

Security updates are announced via:
1. GitHub Security Advisories
2. Release notes for patched versions
3. Direct notification for critical issues

### Update Instructions

When security updates are released:
```bash
# Update to latest secure version
npm update qbo-mcp-ts

# Verify installation
npm list qbo-mcp-ts

# Rebuild and restart
npm run build
npm start
```

## Responsible Disclosure

We support responsible disclosure:
1. Reporter submits vulnerability privately
2. We acknowledge and investigate
3. We develop and test a fix
4. We release the fix
5. We publicly disclose the vulnerability (with credit to reporter)

## Security Checklist for Contributors

Before submitting code:
- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date
- [ ] Security tests included
- [ ] Documentation updated

## Contact

**Security Team Email**: vespo92@gmail.com

For general bugs and features, use [GitHub Issues](https://github.com/vespo92/QBO-MCP-TS/issues).

## Acknowledgments

We thank the security researchers who responsibly disclose vulnerabilities and help us keep QBO-MCP-TS secure.

---

Last Updated: December 2024