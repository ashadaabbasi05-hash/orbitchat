# Orbit Chat - Testing Guide

Complete testing guide for Orbit Chat backend, frontend, and integration.

---

## Part 1: Unit Tests (Backend)

### Setup

```bash
cd backend
npm install --save-dev vitest @vitest/ui
```

### Test RSA Functions

Create `backend/src/utils/__tests__/rsa.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { RSAKeyManager } from '../rsa';

describe('RSAKeyManager', () => {
  let keyManager: RSAKeyManager;

  beforeEach(() => {
    keyManager = new RSAKeyManager();
  });

  it('should generate RSA key pair', () => {
    const publicKey = keyManager.getPublicKey();
    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(publicKey).toContain('END PUBLIC KEY');
  });

  it('should get key metadata', () => {
    const metadata = keyManager.getKeyMetadata();
    expect(metadata.keyId).toBe('server-key-v1');
    expect(metadata.version).toBe(1);
  });

  it('should encrypt and decrypt symmetric key', () => {
    // Simulate client encrypting a key
    const clientKey = Buffer.from('test-symmetric-key-32-bytes-long!!');
    
    // In real scenario, this would be done on client
    // For testing, we'd need to use the public key
    const publicKey = keyManager.getPublicKey();
    
    // Encrypt with public key
    const crypto = await import('crypto');
    const encrypted = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      clientKey
    );

    // Decrypt with server's private key
    const decrypted = keyManager.decryptSymmetricKey(encrypted.toString('base64'));
    expect(decrypted.toString()).toBe(clientKey.toString());
  });

  it('should rotate keys and increment version', () => {
    const v1 = keyManager.getVersion();
    keyManager.rotateKeys();
    const v2 = keyManager.getVersion();
    expect(v2).toBe(v1 + 1);
  });
});
```

### Run Tests

```bash
npm run test
npm run test:ui  # Visual test runner
```

---

## Part 2: Integration Tests (API)

### Setup

```bash
npm install --save-dev supertest
```

### Test API Endpoints

Create `backend/src/routes/__tests__/keyExchange.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../index';

describe('Key Exchange API', () => {
  let token: string;
  let chatId: string;

  beforeAll(() => {
    // Get auth token from Supabase
    // This is a mock token for testing
    token = 'test-token';
    chatId = 'test-chat-id';
  });

  it('GET /api/key-exchange/public-key should return public key', async () => {
    const res = await request(app).get('/api/key-exchange/public-key');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('publicKey');
    expect(res.body).toHaveProperty('keyId');
    expect(res.body).toHaveProperty('version');
    expect(res.body.algorithm).toBe('RSA-2048-OAEP');
  });

  it('POST /api/key-exchange/register-key should register key', async () => {
    const res = await request(app)
      .post('/api/key-exchange/register-key')
      .set('Authorization', `Bearer ${token}`)
      .send({
        chatId,
        encryptedKey: 'base64-encoded-key',
      });

    expect(res.status).toMatch(/200|403/);  // 403 if user not participant
  });

  it('POST /api/key-exchange/sync-key should retrieve key', async () => {
    const res = await request(app)
      .post('/api/key-exchange/sync-key')
      .set('Authorization', `Bearer ${token}`)
      .send({ chatId });

    expect(res.status).toMatch(/200|404/);
  });

  it('should require authentication for protected endpoints', async () => {
    const res = await request(app)
      .post('/api/key-exchange/register-key')
      .send({ chatId, encryptedKey: 'key' });

    expect(res.status).toBe(401);
  });
});
```

---

## Part 3: Frontend Tests

### Setup

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
```

### Test Encryption Module

Create `src/lib/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateSymmetricKey,
  generateNonce,
  encryptMessage,
  decryptMessage,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../crypto';

describe('Encryption Module', () => {
  it('should generate 256-bit symmetric key', () => {
    const key = generateSymmetricKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);  // 256 bits = 32 bytes
  });

  it('should generate 16-byte nonce', () => {
    const nonce = generateNonce();
    expect(nonce).toBeInstanceOf(Uint8Array);
    expect(nonce.length).toBe(16);
  });

  it('should convert between base64 and ArrayBuffer', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    const base64 = arrayBufferToBase64(buffer);
    const decoded = base64ToArrayBuffer(base64);

    expect(decoded).toEqual(buffer);
  });

  it('should encrypt and decrypt messages', () => {
    const key = generateSymmetricKey();
    const message = 'Hello, Orbit Chat!';

    const { encryptedContent, nonce } = encryptMessage(message, key);
    const decrypted = decryptMessage(encryptedContent, nonce, key);

    expect(decrypted).toBe(message);
  });

  it('should use different nonce for each encryption', () => {
    const key = generateSymmetricKey();
    const message = 'Test message';

    const encrypt1 = encryptMessage(message, key);
    const encrypt2 = encryptMessage(message, key);

    expect(encrypt1.nonce).not.toBe(encrypt2.nonce);
    expect(encrypt1.encryptedContent).not.toBe(encrypt2.encryptedContent);
  });

  it('should fail to decrypt with wrong key', () => {
    const key1 = generateSymmetricKey();
    const key2 = generateSymmetricKey();
    const message = 'Secret message';

    const { encryptedContent, nonce } = encryptMessage(message, key1);
    const decrypted = decryptMessage(encryptedContent, nonce, key2);

    expect(decrypted).not.toBe(message);
  });
});
```

### Test Auth Context

Create `src/contexts/__tests__/AuthContext.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  const TestComponent = () => {
    const { user, profile, loading } = useAuth();
    return (
      <div>
        {loading && <div>Loading...</div>}
        {user && <div>User: {user.email}</div>}
        {profile && <div>Profile: {profile.username}</div>}
      </div>
    );
  };

  it('should provide auth context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/Loading|User|Profile/)).toBeInTheDocument();
  });
});
```

---

## Part 4: End-to-End Tests (E2E)

### Setup with Playwright

```bash
npm install --save-dev @playwright/test
```

### E2E Test Suite

Create `e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[placeholder="username"]', 'testuser');

    await page.click('text=Public Account');
    await page.click('button:has-text("Sign Up")');

    // Wait for redirect to home or success message
    await expect(page).toHaveURL(/\/(home|auth)/);
  });

  test('should sign in existing user', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');

    await page.click('text=Sign In');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/home/);
  });
});
```

Create `e2e/chat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test('should send and receive encrypted message', async ({ page, context }) => {
    // Login first user
    await page.goto('http://localhost:5173/auth');
    // ... login steps ...

    // Navigate to search
    await page.click('text=Search Users');

    // Search for another user
    await page.fill('input[placeholder="search"]', 'otheruser');
    await page.click('text=Message');

    // Type and send message
    await page.fill('textarea[placeholder*="message"]', 'Hello!');
    await page.click('button[title="Send"]');

    // Verify message appears
    await expect(page.locator('text=Hello!')).toBeVisible();

    // Verify message is marked as encrypted
    await expect(page.locator('text=E2E Encrypted')).toBeVisible();
  });
});
```

### Run E2E Tests

```bash
npm run test:e2e
npm run test:e2e:ui  # Visual mode
```

---

## Part 5: Security Tests

### Test for SQL Injection

```bash
curl -X POST http://localhost:3000/api/key-exchange/register-key \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "' OR 1=1 -- ",
    "encryptedKey": "test"
  }'

# Should return 400 Bad Request, not SQL error
```

### Test for XSS Vulnerabilities

```javascript
// In browser console
const xssPayload = '<img src=x onerror="alert(1)">';
// Try sending as message
// App should sanitize or escape the payload
```

### Test for CSRF

```bash
# Try making request without proper CORS headers
curl -X POST http://localhost:3000/api/key-exchange/register-key \
  -H "Origin: http://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Should return CORS error
```

### Test for Weak Encryption

```javascript
// Test that nonce is unique
const key = generateSymmetricKey();
const encrypted1 = encryptMessage("test", key);
const encrypted2 = encryptMessage("test", key);

// These should be different
console.assert(encrypted1.encryptedContent !== encrypted2.encryptedContent);
console.assert(encrypted1.nonce !== encrypted2.nonce);
```

---

## Part 6: Performance Tests

### Load Testing with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test public key endpoint
ab -n 1000 -c 100 http://localhost:3000/api/key-exchange/public-key

# Expected: thousands of requests per second
```

### Load Testing with k6

```bash
# Install k6
curl https://dl.k6.io/install/linux.sh | sudo bash

# Create load test script (k6-test.js)
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  let res = http.get('http://localhost:3000/api/key-exchange/public-key');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}

# Run test
k6 run k6-test.js
```

---

## Part 7: Test Coverage

### Generate Coverage Report

```bash
npm run test:coverage

# Expected output:
# Lines: >80%
# Statements: >80%
# Functions: >80%
# Branches: >70%
```

### View Coverage Report

```bash
# HTML report
open coverage/index.html
```

---

## Testing Checklist

### Unit Tests
```
[ ] Encryption functions
[ ] Key generation
[ ] Base64 conversion
[ ] RSA operations
[ ] Helper functions
```

### Integration Tests
```
[ ] Public key endpoint
[ ] Register key endpoint
[ ] Sync key endpoint
[ ] Authentication middleware
[ ] Error handling
[ ] Rate limiting
```

### E2E Tests
```
[ ] Sign up flow
[ ] Sign in flow
[ ] Chat creation
[ ] Message sending
[ ] Message receiving
[ ] User search
[ ] Message requests
[ ] Private user restrictions
```

### Security Tests
```
[ ] SQL injection prevention
[ ] XSS prevention
[ ] CSRF protection
[ ] Authentication bypass
[ ] Authorization bypass
[ ] Rate limiting
[ ] Input validation
```

### Performance Tests
```
[ ] Response time < 100ms
[ ] Concurrent requests > 1000/sec
[ ] Memory usage < 500MB
[ ] CPU usage < 50%
```

---

## Continuous Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: Build
        run: npm run build
```

---

## Debugging Tips

### Debug Backend Logs

```bash
# Set debug mode
DEBUG=* npm run dev

# Or use Node inspector
node --inspect src/index.ts

# Connect to chrome://inspect
```

### Debug Frontend

```javascript
// Set localStorage debug
localStorage.setItem('debug', '*');

// Check sessionStorage keys
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('orbit_key')) {
    console.log(key, sessionStorage.getItem(key));
  }
});
```

### Check Supabase Logs

```bash
# View realtime events
supabase log pull

# Or in dashboard: Monitoring > Logs
```

---

## Running All Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd backend && npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

**Good luck testing! 🧪**
