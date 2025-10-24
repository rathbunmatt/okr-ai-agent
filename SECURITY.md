# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of the OKR AI Agent seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until it has been addressed
- **Do not** exploit the vulnerability beyond what is necessary to demonstrate it

### Please Do

- **Report vulnerabilities privately** to the project maintainers
- **Provide detailed information** including:
  - Type of vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if you have one)
- **Allow reasonable time** for us to address the vulnerability before public disclosure

### Reporting Process

1. **Email**: Send details to matt.rathbun@gmail.com with the subject line "SECURITY: [Brief Description]"

2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any proof-of-concept code (if applicable)
   - Your contact information

3. **Response Time**: You can expect:
   - **Initial response**: Within 48 hours
   - **Status update**: Within 7 days
   - **Fix timeline**: Varies based on severity

### Vulnerability Severity

We classify vulnerabilities based on their potential impact:

- **Critical**: Remote code execution, data breach, authentication bypass
- **High**: Privilege escalation, SQL injection, XSS vulnerabilities
- **Medium**: Information disclosure, denial of service
- **Low**: Minor issues with limited impact

### Security Best Practices

When deploying the OKR AI Agent:

#### API Key Security
- **Never commit** API keys to version control
- **Use environment variables** for all secrets
- **Rotate keys regularly** and immediately if compromised
- **Limit API key permissions** to minimum required

#### Database Security
- **Enable authentication** for production databases
- **Use encrypted connections** (TLS/SSL)
- **Regular backups** with secure storage
- **Principle of least privilege** for database access

#### Network Security
- **Use HTTPS** in production (never HTTP)
- **Enable rate limiting** to prevent abuse
- **Implement proper CORS** policies
- **Use secure WebSocket connections** (WSS)

#### Application Security
- **Keep dependencies updated** regularly
- **Run security audits** (`npm audit`)
- **Validate all user input** on server side
- **Sanitize data** before storing or displaying

### Security Updates

Security patches are released as follows:

1. **Critical vulnerabilities**: Emergency patch within 24-48 hours
2. **High severity**: Patch within 7 days
3. **Medium severity**: Included in next regular release
4. **Low severity**: Bundled with feature releases

### Security Checklist for Contributors

Before submitting code:

- [ ] No hardcoded secrets or API keys
- [ ] All user input is validated and sanitized
- [ ] Dependencies are up to date (`npm audit` passes)
- [ ] Security-sensitive code has been reviewed
- [ ] Authentication/authorization is properly implemented
- [ ] Error messages don't leak sensitive information

### Known Security Considerations

#### Claude API Integration
- API keys must be kept secure and never exposed to clients
- Rate limiting is important to prevent API cost abuse
- Conversation data may contain sensitive business information

#### WebSocket Connections
- Authentication should be verified for each connection
- Messages should be validated before processing
- Rate limiting should be applied per connection

#### Database
- SQLite database file must have proper file permissions
- In production, consider using a more robust database system
- Regular backups are essential

### Acknowledgments

We appreciate the security research community and will acknowledge researchers who responsibly disclose vulnerabilities:

- Name will be added to our security hall of fame
- Credit in release notes (with permission)
- Direct communication with our security team

### Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NPM Security Advisories](https://www.npmjs.com/advisories)

---

**Thank you for helping keep the OKR AI Agent and our users safe!**
