# Supabase Edge Functions for Orbit Chat

Edge Functions handle the bridge between the frontend and backend for key exchange operations.

## Setup

### 1. Create Function

```bash
supabase functions new key-exchange
```

This creates `supabase/functions/key-exchange/index.ts`

### 2. Deploy to Production

```bash
supabase functions deploy key-exchange --project-ref your-project-ref
```

### 3. Deploy to Local Development

```bash
supabase functions serve
```

## Available Endpoints

### GET /functions/v1/key-exchange

Returns server's public key and metadata.

**No authentication required** (public endpoint)

**Response:**
```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "keyId": "server-key-v1",
  "version": 1,
  "algorithm": "RSA-2048-OAEP"
}
```

## Environment Variables

Add these to your Supabase project:

```
BACKEND_API_URL=https://your-backend-url.com
JWT_SECRET=your_jwt_secret_from_supabase
```

### Setting Environment Variables

```bash
# Local development (in supabase/functions/.env.local)
BACKEND_API_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret

# Production
supabase secrets set BACKEND_API_URL https://your-backend-url.com --project-ref your-project-ref
supabase secrets set JWT_SECRET your_jwt_secret --project-ref your-project-ref
```

## Flow

1. **Frontend** calls the Edge Function
2. **Edge Function** forwards request to backend
3. **Backend** handles RSA operations
4. **Edge Function** returns response to frontend

This architecture keeps RSA keys secure on the backend and uses Edge Functions as a proxy.

## Security Notes

- Edge Functions run in a secure Deno runtime
- CORS is properly configured
- All requests must include authorization token
- Backend validates all requests
- No sensitive data is logged

## Testing

```bash
# Test locally
curl http://localhost:54321/functions/v1/key-exchange

# Test in production
curl https://your-project.supabase.co/functions/v1/key-exchange
```

## Troubleshooting

### Function not found
- Ensure function is deployed: `supabase functions list`
- Check project reference: `supabase projects list`

### Backend connection fails
- Verify `BACKEND_API_URL` is set correctly
- Check backend is running and accessible
- Review Edge Function logs: `supabase functions logs key-exchange`

### CORS errors
- Verify frontend URL is in CORS whitelist
- Check backend CORS configuration

## Advanced: Using Secrets Manager

For production security, use Supabase Secrets:

```bash
supabase secrets list --project-ref your-project-ref
supabase secrets set MY_SECRET value --project-ref your-project-ref
```

In the function, access via:
```typescript
const secret = Deno.env.get("MY_SECRET");
```
