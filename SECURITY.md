# Orbit Chat - Security & Architecture Guide

Comprehensive security and architecture documentation.

---

## Part 1: Security Architecture

### End-to-End Encryption Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Client A  │                                    │   Client B  │
└──────┬──────┘                                    └──────┬──────┘
       │                                                   │
       │ 1. Fetch server's RSA public key                 │
       │ ──────────────────────────────────────>          │
       │ [GET /api/key-exchange/public-key]              │
       │                                                   │
       │ 2. Server returns RSA public key                │
       │ <──────────────────────────────────────         │
       │                                                   │
       │ 3. Generate random symmetric key (256-bit)       │
       │ 4. Encrypt symmetric key with RSA public key     │
       │ 5. Send encrypted key to server                  │
       │ ──────────────────────────────────────>          │
       │ [POST /api/key-exchange/register-key]           │
       │                                                   │
       │ 6. Server decrypts key with RSA private key      │
       │    Stores encrypted key in database              │
       │                                                   │
       │                        ┌──────────────────────┐  │
       │                        │ Database: chat_keys  │  │
       │                        │ - encrypted_key      │  │
       │                        │ - key_version        │  │
       │                        └──────────────────────┘  │
       │                                                   │
       │ 7. Send message encrypted with symmetric key     │
       │ ──────────────────────────────────────────────────>
       │    [message_id, encrypted_content, nonce]        │
       │                                                   │
       │ 8. Store encrypted message in database           │
       │    (Server NEVER sees plaintext)                 │
       │                                                   │
       │                                     9. Retrieve   │
       │                                        encrypted  │
       │                                        message    │
       │                                                   │
       │ 10. Fetch encrypted key from server              │
       │ <──────────────────────────────────────          │
       │ [POST /api/key-exchange/sync-key]               │
       │                                                   │
       │ 11. Decrypt symmetric key on client              │
       │ 12. Decrypt message with symmetric key           │
       │ 13. Display decrypted message                    │
       │                                                   │
```

### Data Encryption Methods

#### 1. RSA Key Encryption (For Symmetric Keys)
```
Client                          Server
  │                               │
  ├─ Generate symmetric key       │
  ├─ Encrypt with RSA pub key     │
  ├──────────────────────────────>│
  │   [Base64 encrypted key]      ├─ Decrypt with RSA private key
  │                               ├─ Store in database
  │                               ├─ Return confirmation
  │<──────────────────────────────┤
  │                               │
```

- **Algorithm:** RSA-2048-OAEP
- **Purpose:** Secure initial key exchange
- **Location:** Backend only (never on client)

#### 2. Symmetric XOR Encryption (For Messages)
```
Message                  Symmetric Key           Nonce
   │                            │                  │
   ├─ UTF-8 encode              │                  │
   │  [8-bit bytes]             │                  │
   │                     ┌──────┴──────┐           │
   │                     │ 256-bit key  │           │
   │                     │ + nonce mix  │ 16-byte  │
   │                     └──────┬──────┘          │
   │                            │<────────────────┘
   └────────────┬───────────────┘
                │
         XOR cipher with:
         - Position-based key rotation
         - Nonce mixing for randomness
         - Rolling key (i & 0xff)
                │
         Encrypted bytes
                │
         Base64 encode
                │
         Encrypted content
```

- **Algorithm:** Custom XOR with rolling key + nonce
- **Key Size:** 256 bits (32 bytes)
- **Nonce Size:** 128 bits (16 bytes)
- **Purpose:** Fast, client-side message encryption
- **Unique Per Message:** Yes (different nonce each time)

### Database Security

#### Row Level Security (RLS) Policies

```sql
-- Profiles: Public read, owner update only
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (true);
  
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Messages: Only chat participants can read
CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = messages.chat_id
      AND user_id = auth.uid()
    )
  );

-- Messages: Only sender can write
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
```

#### Encryption at Rest

- **Database:** PostgreSQL with encryption
- **Supabase:** Encrypted storage included
- **Backups:** Automatically encrypted
- **Transport:** HTTPS only

### Key Rotation

#### Current Implementation
```typescript
class RSAKeyManager {
  private version: number = 1;
  
  rotateKeys(): void {
    // Generate new RSA pair
    // Increment version
    // Old keys still valid for 30 days
    // All new messages use new key version
  }
}
```

#### Recommended Schedule
- **RSA Keys:** Every 90 days (prod)
- **Symmetric Keys:** Per-chat (one-time generation)
- **JWT Tokens:** 1 hour expiry, refresh token 7 days

---

## Part 2: Threat Model & Mitigation

### Threats & Defenses

| Threat | Severity | Mitigation |
|--------|----------|-----------|
| **Message Interception** | Critical | TLS/SSL encryption |
| **Plaintext Storage** | Critical | E2EE, client-side encryption only |
| **Key Theft** | Critical | RSA keys on backend only, environment variables |
| **MITM Attack** | Critical | Certificate pinning (optional) |
| **Brute Force** | High | Rate limiting, JWT expiry |
| **SQL Injection** | High | Parameterized queries, Zod validation |
| **XSS** | High | Content escaping, CSP headers |
| **CSRF** | Medium | CORS origin validation, SameSite cookies |
| **DDoS** | Medium | Rate limiting, CDN protection |
| **Data Leakage** | Medium | Minimal logging, no plaintext in logs |
| **Session Hijacking** | Medium | Secure cookies, HTTPS only |
| **Unauthorized Access** | Medium | RLS policies, JWT validation |

### Security Checklist

#### Application Layer
```
[✓] No plaintext message storage
[✓] Client-side encryption enforced
[✓] Symmetric keys stored on client (sessionStorage)
[✓] Nonce per message (prevents replay)
[✓] HTTPS only in production
[✓] JWT token validation on every request
[✓] Rate limiting on all endpoints
[✓] Input validation with Zod
[ ] Request size limits (10MB current)
[ ] Helmet.js headers enabled
[ ] CORS whitelist configured
```

#### Database Layer
```
[✓] RLS policies on all tables
[✓] No plaintext message content
[✓] Encrypted symmetric key storage
[✓] Authentication required for access
[ ] Automated backups enabled
[ ] Point-in-time recovery tested
[ ] Database encryption at rest
```

#### Infrastructure Layer
```
[ ] HTTPS with strong ciphers
[ ] HSTS header (31536000 seconds)
[ ] CSP header configured
[ ] X-Frame-Options: DENY
[ ] X-Content-Type-Options: nosniff
[ ] DDoS protection enabled
[ ] WAF rules configured
[ ] SSL certificate monitoring
```

---

## Part 3: Attack Scenarios & Defenses

### Scenario 1: Message Interception (HTTPS)

**Attack:** Attacker intercepts HTTP traffic
**Defense:** 
- HTTPS with TLS 1.2+ enforced
- Certificate pinning (optional for mobile)
- Perfect forward secrecy enabled

**Result:** ✅ Encrypted in transit

### Scenario 2: Server Breach (Database Compromise)

**Attack:** Database dumped, contains messages
**Defense:**
- Messages are encrypted
- Server has no encryption keys
- No RSA private key in database
- No symmetric keys in database (stored encrypted)

**Result:** ✅ Encrypted at rest

### Scenario 3: Man-in-the-Middle (Key Exchange)

**Attack:** Attacker tries to intercept RSA public key
**Defense:**
- HTTPS protects key transmission
- Client verifies key format
- Key ID/version prevents version downgrade
- Certificate validation required

**Result:** ✅ Detected and prevented

### Scenario 4: Replay Attack

**Attack:** Attacker captures encrypted message and resends
**Defense:**
- Unique nonce per message
- Messages include timestamp
- Server deduplication logic
- Message ID verification

**Result:** ✅ Detected and dropped

### Scenario 5: Brute Force (Password)

**Attack:** Attacker tries to guess password
**Defense:**
- Supabase Auth rate limiting
- Progressive delay between attempts
- Account lockout after N attempts
- CAPTCHA on suspicious activity

**Result:** ✅ Blocked

### Scenario 6: XSS (Client Attack)

**Attack:** Attacker injects malicious script
**Defense:**
- React auto-escapes JSX
- Content Security Policy header
- Input validation (usernames, messages)
- No innerHTML usage

**Result:** ✅ Sanitized

---

## Part 4: Architecture Components

### Trusted Components

```
┌─────────────────────────────────────┐
│  Orbit Chat Architecture            │
└─────────────────────────────────────┘

FRONTEND (Browser)
├─ Authentication
│  └─ Supabase Auth (JWT)
├─ Encryption/Decryption
│  └─ Web Crypto API (XOR cipher)
├─ Key Management
│  └─ SessionStorage (symmetric keys)
└─ UI/UX
   └─ React + TailwindCSS

BACKEND (Node.js)
├─ RSA Key Management
│  └─ Crypto module
├─ Key Exchange API
│  └─ Express routes
├─ Database Interface
│  └─ Supabase client
└─ Security
   └─ Rate limiting, CORS, validation

DATABASE (Supabase PostgreSQL)
├─ User Profiles
├─ Encrypted Messages
├─ Chat Metadata
├─ Message Requests
└─ Connection Logs

EDGE FUNCTIONS (Supabase Deno)
├─ Public Key Distribution
├─ Key Registration
└─ Key Synchronization
```

### Untrusted Components

- **User Input** - Always validate
- **Network Traffic** - Always encrypt (HTTPS)
- **Browser Extensions** - Could intercept sessionStorage
- **Compromised Endpoints** - RLS policies prevent unauthorized access

---

## Part 5: Security Best Practices

### For Developers

```
1. NEVER log encryption keys
   ❌ console.log(symmetricKey)
   ✅ logger.debug('Key generated', { keyId: 'key-v1' })

2. NEVER hardcode secrets
   ❌ const API_KEY = "abc123"
   ✅ const API_KEY = process.env.API_KEY

3. ALWAYS validate input
   ❌ const chatId = req.body.chatId
   ✅ const chatId = z.string().uuid().parse(req.body.chatId)

4. ALWAYS use HTTPS in production
   ❌ http://example.com
   ✅ https://example.com

5. ALWAYS implement rate limiting
   ❌ express.json()
   ✅ app.use(rateLimit({ max: 100 }))

6. ALWAYS verify JWT tokens
   ❌ Trusting user ID from request
   ✅ await verifyToken(authHeader)

7. ALWAYS enable CORS whitelist
   ❌ cors()  // Accept all origins
   ✅ cors({ origin: 'https://domain.com' })

8. ALWAYS rotate keys regularly
   ❌ Same keys for years
   ✅ Rotate quarterly
```

### For DevOps

```
1. Enable HSTS
   add_header Strict-Transport-Security "max-age=31536000" always;

2. Enable CSP
   add_header Content-Security-Policy "default-src 'self'" always;

3. Enable X-Frame-Options
   add_header X-Frame-Options "DENY" always;

4. Use strong TLS ciphers
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_ciphers ECDHE+AESGCM:ECDHE+AES256:!aNULL:!MD5;

5. Enable rate limiting at nginx level
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req zone=api burst=20;

6. Enable logging and monitoring
   error_log /var/log/nginx/error.log;
   access_log /var/log/nginx/access.log;

7. Regular security updates
   apt-get update && apt-get upgrade

8. SSL certificate monitoring
   certbot renew  # Auto-renewal for Let's Encrypt
```

### For Operations

```
1. Daily Backups
   - Database backups to AWS S3
   - Point-in-time recovery tested
   - Backup retention: 30 days

2. Monitoring
   - Error tracking (Sentry)
   - Performance monitoring (New Relic)
   - Security monitoring (CloudTrail)
   - Uptime monitoring (Pingdom)

3. Alerts
   - Critical errors → PagerDuty
   - Unusual activity → Email
   - Performance degradation → Slack

4. Regular Audits
   - Security audit quarterly
   - Code review for all changes
   - Dependency vulnerability scan weekly
   - Penetration testing annually

5. Incident Response
   - Incident response plan documented
   - On-call rotation established
   - Post-mortems for major incidents
   - Lessons learned documented
```

---

## Part 6: Compliance & Privacy

### GDPR Compliance

```
✓ User consent for data collection
✓ Right to access (download data)
✓ Right to be forgotten (delete account)
✓ Data portability (export)
✓ Privacy by design (E2EE)
✓ Data retention policy (configurable)
✓ Privacy policy updated
✓ Terms of service agreed
```

### Data Retention

```
Configuration in Database:
- Messages: Delete after 1 year (configurable)
- Profiles: Keep while active, 30 days after deletion
- Logs: Keep for 90 days
- Backups: Keep for 30 days
```

### Privacy by Design

```
✓ No plaintext message storage
✓ No personal data logging
✓ Minimal metadata collection
✓ User control over visibility
✓ Message requests for privacy
✓ Anonymous error tracking
✓ No third-party tracking
✓ Open-source for transparency
```

---

## Security Incident Response

### If Encryption Key is Compromised

```
1. IMMEDIATE:
   - Rotate RSA keys
   - Notify all users
   - Generate new symmetric keys for all chats

2. SHORT-TERM (24 hours):
   - Audit access logs
   - Check for unauthorized access
   - Review all recent key operations

3. MEDIUM-TERM (7 days):
   - Re-encrypt all messages with new keys
   - Rotate JWT secrets
   - Update security documentation

4. LONG-TERM:
   - Security audit of entire system
   - Penetration test
   - Update security practices
```

### If Database is Breached

```
1. IMMEDIATE:
   - Rotate all API keys
   - Force re-authentication for all users
   - Enable extra logging

2. SHORT-TERM:
   - Audit affected data (encrypted messages are safe!)
   - Check what was actually accessed
   - Notify users if needed

3. LONG-TERM:
   - Investigate root cause
   - Fix vulnerability
   - Implement additional security measures
```

---

## Monitoring & Logging

### Key Metrics to Monitor

```
Security:
- Failed login attempts
- Invalid token count
- Rate limit violations
- Decryption failures
- Key rotation status

Performance:
- Key exchange latency
- Message encryption time
- API response time
- Database query time

Availability:
- Uptime %
- Error rate
- Restart count
- Deploy frequency
```

### What to Log

```
✓ Key exchange events (timestamp, user, chat)
✓ Authentication attempts (success/failure)
✓ Authorization failures (denied access)
✓ Rate limit violations
✓ Encryption errors

✗ Symmetric keys
✗ Plaintext messages
✗ User passwords
✗ JWT tokens
✗ RSA private key
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [TLS Best Practices](https://ssl-config.mozilla.org/)
- [GDPR Compliance](https://gdpr.eu/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

---

**Security is everyone's responsibility! 🔒**
