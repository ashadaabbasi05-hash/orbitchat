# Orbit Chat Backend

Secure backend server for Orbit Chat with RSA key management and encrypted symmetric key handling.

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# RSA Keys (optional - will auto-generate if not provided)
RSA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
RSA_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
RSA_KEY_ID=server-key-v1

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Development

```bash
npm run dev
```

Server will start on http://localhost:3000

## Building

```bash
npm run build
```

## Starting Production Server

```bash
npm start
```

## API Endpoints

### Key Exchange

- `GET /api/key-exchange/public-key` - Get server's public key
- `POST /api/key-exchange/register-key` - Register encrypted symmetric key
- `POST /api/key-exchange/sync-key` - Retrieve encrypted symmetric key
- `GET /api/key-exchange/health` - Health check

### Health

- `GET /api/health` - Server health check
- `POST /api/auth/log-event` - Log authentication events

## Security Features

✅ Helmet.js for HTTP security headers
✅ CORS protection with origin whitelist
✅ Rate limiting on all API endpoints
✅ Request validation with Zod
✅ JWT token verification
✅ RSA 2048-bit key pair management
✅ Encrypted symmetric key storage
✅ Comprehensive request logging
✅ Error handling and validation

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment configuration
│   │   └── logger.ts       # Winston logger setup
│   ├── middleware/
│   │   └── auth.ts         # JWT auth, logging, error handling
│   ├── routes/
│   │   ├── keyExchange.ts  # RSA key exchange endpoints
│   │   └── health.ts       # Health and logging endpoints
│   ├── services/
│   │   └── supabase.ts     # Supabase client and queries
│   ├── utils/
│   │   └── rsa.ts          # RSA key management
│   └── index.ts            # Express app setup
├── package.json
└── tsconfig.json
```

## Key Exchange Flow

1. **Client requests public key** → `GET /api/key-exchange/public-key`
   - Server returns RSA public key

2. **Client generates symmetric key** → Local generation with Web Crypto API
   - 256-bit random key
   - Used for XOR encryption of messages

3. **Client encrypts symmetric key** → Using server's RSA public key
   - Symmetric key encrypted with RSA
   - Sent to backend

4. **Server receives encrypted key** → `POST /api/key-exchange/register-key`
   - Server decrypts with private key
   - Stores encrypted key in database

5. **Client retrieves key later** → `POST /api/key-exchange/sync-key`
   - Server returns encrypted key
   - Client decrypts to restore symmetric key

## Logging

Logs are written to:
- Console (with colors in development)
- `error.log` - Error level logs
- `combined.log` - All logs

Connection events are logged to Supabase `connection_logs` table:
- `connect` - User connected
- `disconnect` - User disconnected
- `key-exchange` - Key exchange operation
- `auth` - Authentication events
- `error` - Error occurred

## Production Deployment

### Important Security Notes

1. **Store RSA Keys Securely**
   - Use AWS KMS, Azure Key Vault, or HashiCorp Vault
   - Do not commit keys to version control
   - Rotate keys regularly

2. **Enable HTTPS**
   - Use a reverse proxy (Nginx)
   - Install SSL certificates (Let's Encrypt)
   - Enforce HSTS

3. **Database Security**
   - Use Supabase RLS policies
   - Enable database encryption
   - Use service role key for backend only

4. **Rate Limiting**
   - Adjust based on expected traffic
   - Consider per-IP rate limiting
   - Use DDoS protection service

5. **Monitoring**
   - Set up error tracking (Sentry, Rollbar)
   - Monitor database performance
   - Track key exchange success rates

### Deployment Example (Heroku)

```bash
# Create Heroku app
heroku create orbit-chat-backend

# Set environment variables
heroku config:set PORT=3000 --app orbit-chat-backend
heroku config:set SUPABASE_URL=your_url --app orbit-chat-backend
heroku config:set SUPABASE_SERVICE_KEY=your_key --app orbit-chat-backend

# Deploy
git push heroku main

# View logs
heroku logs --tail --app orbit-chat-backend
```

## Troubleshooting

### RSA Keys Not Loaded
- Check that `RSA_PRIVATE_KEY` and `RSA_PUBLIC_KEY` are properly formatted
- New keys will auto-generate if not provided
- Ensure line breaks are preserved (use literal newlines)

### Key Exchange Fails
- Verify client is sending properly formatted encrypted key (base64)
- Check Supabase connection and permissions
- Review logs for specific error messages

### Rate Limiting Errors
- Adjust `RATE_LIMIT_MAX_REQUESTS` if needed
- Ensure clients handle 429 responses

## Support

For issues or questions:
1. Check the logs for error details
2. Verify all environment variables are set
3. Ensure Supabase credentials are correct
4. Check network connectivity and CORS settings
