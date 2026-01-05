# Orbit Chat - Next Steps Implementation Guide

## Current Status
✅ **Frontend:** 90% Complete - All UI and client-side logic ready
❌ **Backend:** 0% Complete - Needs Node.js server
⚠️ **Infrastructure:** 70% Complete - Supabase configured, missing Edge Functions

---

## Phase 1: Create Supabase Edge Functions (2-3 hours)

### Required Edge Functions:

#### 1. `key-exchange/public-key` (GET)
**Purpose:** Returns server's RSA public key for client-side encryption

```typescript
// supabase/functions/key-exchange/public-key/index.ts
export async function handler(req: Request) {
  // Return server's RSA public key metadata
  // Should be stable and cached on client
  return {
    keyId: "server-key-v1",
    version: 1,
    // Note: Actual RSA key storage requires backend server
  }
}
```

#### 2. `key-exchange/register-key` (POST)
**Purpose:** Store encrypted symmetric key for chat

**Input:**
```json
{
  "chatId": "uuid",
  "encryptedKey": "base64-encoded-wrapped-key"
}
```

**Implementation:**
```typescript
// Store in chat_keys table
const { data, error } = await supabase
  .from('chat_keys')
  .insert({
    chat_id: chatId,
    encrypted_key: encryptedKey,
    created_by: userId
  });
```

#### 3. `key-exchange/sync-key` (POST)
**Purpose:** Retrieve encrypted symmetric key for existing chat

**Input:**
```json
{
  "chatId": "uuid"
}
```

**Implementation:**
```typescript
// Fetch from chat_keys table
const { data, error } = await supabase
  .from('chat_keys')
  .select('encrypted_key, key_version')
  .eq('chat_id', chatId)
  .single();
```

---

## Phase 2: Create Node.js Backend Server (4-6 hours)

### What the Backend Needs:

#### A. RSA Key Management
```typescript
// backend/src/crypto/keys.ts
import crypto from 'crypto';

export class RSAKeyManager {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  decryptSymmetricKey(encryptedKey: Buffer): Buffer {
    return crypto.privateDecrypt(
      this.privateKey,
      encryptedKey
    );
  }
}
```

#### B. Key Exchange Endpoint
```typescript
// backend/src/routes/keyExchange.ts
app.get('/api/key-exchange/public-key', (req, res) => {
  res.json({
    keyId: keyManager.getKeyId(),
    version: keyManager.getVersion(),
    publicKey: keyManager.getPublicKey()
  });
});
```

#### C. Connection Logging
```typescript
// backend/src/services/logging.ts
export async function logConnectionEvent(
  userId: string,
  eventType: 'connect' | 'disconnect' | 'key-exchange' | 'auth',
  metadata?: any
) {
  const { data, error } = await supabase
    .from('connection_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata || {}
    });
}
```

### Recommended Tech Stack for Backend:
- **Framework:** Express.js or Fastify
- **Database:** Supabase (already configured)
- **Auth:** Supabase Auth + JWT verification
- **Crypto:** Node.js built-in crypto module
- **Logging:** Winston or Pino
- **Validation:** Zod or Joi

### Minimal Backend Structure:
```
backend/
├── src/
│   ├── index.ts           # Entry point
│   ├── middleware/
│   │   ├── auth.ts        # JWT verification
│   │   └── logging.ts     # Request logging
│   ├── routes/
│   │   ├── keyExchange.ts # Key exchange endpoints
│   │   └── health.ts      # Health check
│   ├── services/
│   │   ├── crypto.ts      # RSA operations
│   │   └── logging.ts     # Event logging
│   └── config.ts          # Configuration
├── package.json
└── tsconfig.json
```

---

## Phase 3: Testing the Complete Flow (2-3 hours)

### Test Checklist:

1. **Authentication Test**
   ```
   [ ] Sign up with public account
   [ ] Sign up with private account
   [ ] Sign in with correct credentials
   [ ] Sign in with wrong credentials fails
   [ ] Session persists on reload
   [ ] Logout works
   ```

2. **Key Exchange Test**
   ```
   [ ] Client fetches server's public key
   [ ] Client generates symmetric key
   [ ] Client wraps symmetric key
   [ ] Server unwraps key correctly
   [ ] Key is stored in chat_keys table
   [ ] Key is retrievable on subsequent access
   ```

3. **Message Encryption Test**
   ```
   [ ] Message is encrypted before sending
   [ ] Encrypted content stored in database
   [ ] Nonce is unique per message
   [ ] Message decrypts correctly on receive
   [ ] Realtime updates decrypt properly
   ```

4. **Chat Features Test**
   ```
   [ ] Create chat between two users
   [ ] Message appears in both clients
   [ ] Search finds users correctly
   [ ] Private users receive message requests
   [ ] Accept/reject message requests works
   [ ] Online status updates
   ```

5. **Security Test**
   ```
   [ ] Cannot read messages of other chats
   [ ] Cannot access private user without request
   [ ] No plaintext in database
   [ ] No plaintext in logs
   [ ] RLS policies enforce access control
   ```

---

## Phase 4: Production Deployment (3-4 hours)

### Before Deploying:

1. **Environment Configuration**
   ```env
   # .env.production
   VITE_SUPABASE_URL=your_prod_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_prod_key
   BACKEND_API_URL=your_backend_url
   ```

2. **Security Headers** (Nginx/Vercel config)
   ```
   Strict-Transport-Security: max-age=31536000
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Content-Security-Policy: default-src 'self'
   ```

3. **CORS Configuration** (Backend)
   ```typescript
   const cors = require('cors');
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

4. **Rate Limiting** (Backend)
   ```typescript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   app.use('/api/', limiter);
   ```

### Deployment Steps:

1. **Frontend (Vercel/Netlify)**
   ```bash
   npm run build
   # Deploy dist folder
   ```

2. **Backend (Heroku/Railway/Fly.io)**
   ```bash
   npm run build
   npm start
   ```

3. **Supabase Edge Functions**
   ```bash
   supabase functions deploy key-exchange/public-key
   supabase functions deploy key-exchange/register-key
   supabase functions deploy key-exchange/sync-key
   ```

4. **Database Migrations**
   ```bash
   supabase migration up --local
   ```

---

## Implementation Timeline

**Week 1:**
- [ ] Day 1-2: Create Supabase Edge Functions
- [ ] Day 3-5: Create Node.js backend with key exchange

**Week 2:**
- [ ] Day 1-3: Integration testing
- [ ] Day 4-5: Bug fixes and optimizations

**Week 3:**
- [ ] Day 1-3: Production deployment
- [ ] Day 4-5: Load testing and monitoring setup

---

## Files Already in Place

These files are ready to use:
- ✅ Encryption module: `src/lib/crypto.ts` (complete)
- ✅ Auth context: `src/contexts/AuthContext.tsx` (complete)
- ✅ All UI components: `src/components/` (complete)
- ✅ All pages: `src/pages/` (complete)
- ✅ Database schema: `supabase/migrations/` (complete)

---

## Quick Reference: API Endpoints to Build

**Backend REST API:**
```
GET  /api/key-exchange/public-key        # Get server's public key
POST /api/key-exchange/register-key      # Register encrypted key
POST /api/key-exchange/sync-key          # Retrieve encrypted key
GET  /api/health                         # Health check
```

**Edge Functions:**
```
GET  /key-exchange/public-key
POST /key-exchange/register-key
POST /key-exchange/sync-key
```

---

## Questions?

Refer to these files for more context:
- `src/lib/crypto.ts` - Encryption implementation details
- `src/pages/ChatPage.tsx` - How encryption is used in chat
- `PROJECT_AUDIT.md` - Complete project analysis
- `README.md` - General documentation

Good luck with the implementation! 🚀
