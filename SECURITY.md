# Security Policy

## 🔒 Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities by emailing:

📧 **security@bomberman-online.com**

### What to Include

Please include as much of the following information as possible:

1. **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
2. **Location** of the affected code (file path, URL, component)
3. **Step-by-step instructions** to reproduce the issue
4. **Proof of concept** or exploit code (if available)
5. **Impact assessment** of the vulnerability
6. **Suggested fix** (if you have one)

### Response Timeline

| Action | Timeline |
|--------|----------|
| Initial response | Within 48 hours |
| Severity assessment | Within 5 days |
| Fix development | Varies by severity |
| Public disclosure | After fix is released |

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Remote code execution, data breach | 24-48 hours |
| **High** | Authentication bypass, privilege escalation | 3-5 days |
| **Medium** | XSS, CSRF, information disclosure | 1-2 weeks |
| **Low** | Minor issues, best practice violations | Next release |

## 🛡️ Security Measures

### Authentication

- User authentication handled by [Clerk](https://clerk.com)
- JWT tokens validated on both frontend and game server
- Session management follows OWASP guidelines
- Password policies enforced by Clerk

### Data Protection

- All data transmitted over HTTPS/WSS
- Database access controlled by Supabase RLS policies
- Sensitive data encrypted at rest
- PII handled according to privacy policy

### Game Server Security

- Server-authoritative game state (anti-cheat)
- Input validation and rate limiting
- JWT verification for all connections
- No sensitive data exposed to clients

### Infrastructure

- Deployed on Vercel (SOC 2 compliant)
- Game server on Railway (isolated containers)
- Supabase database (encrypted, managed PostgreSQL)
- Regular security updates applied

## ⚠️ Known Limitations

### Client-Side

- Game state can be inspected via browser dev tools
- Client predictions may briefly show incorrect state
- Replay files may reveal game metadata

### Network

- Latency can affect gameplay fairness
- Connection quality impacts experience
- WebSocket connections require stable network

## 🔐 Security Best Practices for Contributors

### Code Guidelines

```typescript
// ✅ DO: Validate all user input
const username = sanitizeInput(rawUsername);

// ❌ DON'T: Trust client data
const isAdmin = clientData.isAdmin; // Never do this!

// ✅ DO: Use parameterized queries
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);

// ❌ DON'T: Concatenate SQL
const query = `SELECT * FROM profiles WHERE id = '${userId}'`;
```

### Authentication

```typescript
// ✅ DO: Verify tokens server-side
const { userId } = await auth();
if (!userId) throw new Error('Unauthorized');

// ❌ DON'T: Trust client-provided user IDs
const userId = req.body.userId; // Can be spoofed!
```

### Sensitive Data

```typescript
// ✅ DO: Use environment variables
const apiKey = process.env.SECRET_API_KEY;

// ❌ DON'T: Hardcode secrets
const apiKey = 'sk_live_abc123'; // Never commit secrets!
```

### Rate Limiting

```typescript
// ✅ DO: Implement rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// ❌ DON'T: Allow unlimited requests
app.post('/api/action', handler); // Easy to abuse!
```

## 📋 Security Checklist for PRs

Before submitting a PR, ensure:

- [ ] No hardcoded secrets or API keys
- [ ] User input is validated and sanitized
- [ ] Authentication is properly verified
- [ ] SQL queries use parameterized statements
- [ ] Error messages don't expose sensitive info
- [ ] Rate limiting is implemented where needed
- [ ] CORS is properly configured
- [ ] Dependencies are up to date

## 🏆 Bug Bounty

We appreciate responsible disclosure. While we don't currently have a formal bug bounty program, we acknowledge security researchers in our:

- Security hall of fame (with permission)
- Release notes for significant findings
- Potential rewards for critical vulnerabilities

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Clerk Security](https://clerk.com/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

## 📞 Contact

For security-related inquiries:

- **Email:** security@bomberman-online.com
- **Response time:** Within 48 hours

For non-security issues, please use GitHub Issues.

---

*Last updated: December 2024*
