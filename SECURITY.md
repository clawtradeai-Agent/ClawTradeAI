# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email**: security@clawtrade.ai
2. **GitHub Security Advisory**: Use the "Report a vulnerability" feature

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: Within 30 days (depending on severity)

### Security Best Practices

When using ClawTrade AI:

1. **Never share your private keys**
2. **Use strong, unique passwords**
3. **Enable two-factor authentication** (when available)
4. **Keep your environment updated**
5. **Test in mock mode** before using real funds
6. **Use environment variables** for secrets
7. **Review transaction details** before confirming

## Security Measures

### Implemented Security Features

- **Encryption**: AES-256 for wallet private keys
- **Authentication**: JWT-based with configurable expiration
- **Rate Limiting**: Configurable per-endpoint limits
- **Input Validation**: Zod schemas for all inputs
- **Transaction Simulation**: Pre-execution validation
- **Audit Logging**: All agent decisions logged

### Security Considerations

**Important**: This software interacts with cryptocurrency and real financial assets.

- Always test thoroughly in mock mode
- Start with small amounts
- Monitor agent behavior closely
- Keep backups of important data
- Never deploy with default configuration

## Vulnerability Disclosure

We follow a coordinated disclosure process:

1. Reporter submits vulnerability
2. We assess and validate the issue
3. We develop and test a fix
4. Fix is deployed
5. Public disclosure (after 30 days or by mutual agreement)

### Recognition

We appreciate responsible disclosure and will acknowledge reporters in our security advisories (unless they prefer to remain anonymous).

## Contact

For security-related questions:
- Email: security@clawtrade.ai

---

**Remember**: Cryptocurrency trading involves risk. This software is provided as-is without warranty.
