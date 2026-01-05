# Orbit Chat - Complete Deployment Guide

## Overview

Orbit Chat consists of three main components:
1. **Frontend** - React + Vite (client-side encryption)
2. **Backend** - Node.js Express (RSA key management)
3. **Database** - Supabase PostgreSQL (data storage with RLS)
4. **Edge Functions** - Supabase Deno (bridge frontend ↔ backend)

This guide covers deployment to production.

---

## Part 1: Backend Deployment

### Option A: Deploy to Heroku (Easiest)

#### Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed

#### Steps

```bash
# 1. Login to Heroku
heroku login

# 2. Create Heroku app
heroku create orbit-chat-backend

# 3. Set environment variables
heroku config:set \
  SUPABASE_URL=your_supabase_url \
  SUPABASE_SERVICE_KEY=your_service_key \
  SUPABASE_JWT_SECRET=your_jwt_secret \
  NODE_ENV=production \
  FRONTEND_URL=https://your-frontend-url.com \
  --app orbit-chat-backend

# 4. Generate and set RSA keys (optional)
heroku config:set \
  RSA_PRIVATE_KEY="$(cat private_key.pem)" \
  RSA_PUBLIC_KEY="$(cat public_key.pem)" \
  --app orbit-chat-backend

# 5. Deploy
git push heroku main

# 6. View logs
heroku logs --tail --app orbit-chat-backend
```

**Backend URL:** `https://orbit-chat-backend.herokuapp.com`

### Option B: Deploy to Railway

#### Prerequisites
- Railway account
- Railway CLI

#### Steps

```bash
# 1. Login
railway login

# 2. Initialize project
railway init

# 3. Add variables
railway variables set \
  SUPABASE_URL=your_supabase_url \
  SUPABASE_SERVICE_KEY=your_service_key

# 4. Deploy
railway up

# 5. Get URL
railway variables get APP_URL
```

### Option C: Deploy to Fly.io

```bash
# 1. Login
fly auth login

# 2. Create app
fly launch --name orbit-chat-backend

# 3. Set secrets
fly secrets set SUPABASE_URL=your_supabase_url \
  SUPABASE_SERVICE_KEY=your_service_key

# 4. Deploy
fly deploy
```

### Option D: Deploy to AWS EC2

```bash
# 1. SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# 2. Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 3. Clone repo and setup
git clone your-repo-url
cd orbit-secure-chat/backend
npm install

# 4. Create .env file
nano .env
# Add your environment variables

# 5. Install PM2 for process management
npm install -g pm2

# 6. Start application
pm2 start npm --name "orbit-backend" -- start
pm2 startup
pm2 save

# 7. Setup Nginx reverse proxy (optional but recommended)
sudo apt-get install nginx
# Configure nginx to proxy to localhost:3000
```

---

## Part 2: Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### Prerequisites
- Vercel account
- Vercel CLI

#### Steps

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Add environment variables in Vercel dashboard
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_KEY
# - VITE_BACKEND_API_URL (set to your backend URL)

# 4. Redeploy with environment variables
vercel --prod
```

### Option B: Deploy to Netlify

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build
npm run build

# 3. Deploy
netlify deploy --prod --dir=dist

# 4. Add environment variables in Netlify dashboard
```

### Option C: Deploy to GitHub Pages

```bash
# Add to package.json
"homepage": "https://yourusername.github.io/orbit-secure-chat"

# Update vite.config.ts
base: "/orbit-secure-chat/"

# Deploy
npm run build
gh-pages -d dist
```

### Option D: Self-hosted with Nginx

```bash
# 1. Build frontend
npm run build

# 2. Copy dist folder to server
scp -r dist/ user@your-server:/var/www/orbit-chat

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/orbit-chat

# Add this configuration:
server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    root /var/www/orbit-chat;
    try_files $uri $uri/ /index.html;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
  }

  location /api/ {
    proxy_pass http://backend-server:3000/api/;
    proxy_set_header Authorization $http_authorization;
    proxy_pass_header Authorization;
  }
}

# 4. Enable site
sudo ln -s /etc/nginx/sites-available/orbit-chat /etc/nginx/sites-enabled/

# 5. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Part 3: Supabase Configuration

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it "orbit-chat"
4. Choose a region close to your users
5. Set a strong database password

### 2. Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Run migrations
supabase migration up --project-ref your-project-ref
```

### 3. Deploy Edge Functions

```bash
# From project root
supabase functions deploy key-exchange --project-ref your-project-ref

# Set secrets
supabase secrets set BACKEND_API_URL=https://your-backend-url.com \
  --project-ref your-project-ref
```

### 4. Enable RLS (Row Level Security)

Go to Supabase Dashboard → SQL Editor:

```sql
-- Already configured in migrations, but verify:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
```

### 5. Set Up Auth

Go to Supabase Dashboard → Authentication:

1. Go to "Settings"
2. Set "Site URL" to your frontend domain
3. Add redirect URLs:
   - `https://yourdomain.com`
   - `https://yourdomain.com/auth`
4. Go to "Providers" and enable Email

---

## Part 4: Environment Variables

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_BACKEND_API_URL=https://your-backend-url.com
```

### Backend (.env)

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

RSA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
RSA_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
RSA_KEY_ID=server-key-v1

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
```

---

## Part 5: SSL/TLS Certificate

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Using Cloudflare

1. Go to [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at registrar
4. Enable "Full" SSL mode
5. Set up "Always Use HTTPS"

---

## Part 6: Security Hardening

### Backend Security

```bash
# 1. Create non-root user
sudo useradd -m -s /bin/bash orbitchat

# 2. Set up firewall
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 3. Enable fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban

# 4. Keep system updated
sudo apt-get update && sudo apt-get upgrade
```

### Application Security

1. **Enable HTTPS only** - Redirect HTTP to HTTPS
2. **Set Security Headers** - CSP, HSTS, X-Frame-Options
3. **Enable CORS properly** - Only allow your frontend domain
4. **Rate limiting** - Prevent brute force attacks
5. **Database backups** - Daily automated backups
6. **Monitoring** - Set up error tracking (Sentry, Rollbar)

---

## Part 7: Monitoring & Maintenance

### Set Up Monitoring

```bash
# Install node-exporter for metrics
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
```

### Error Tracking

```bash
# Install Sentry for error tracking
npm install @sentry/node

# In your backend code:
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Logging

```bash
# Logs are written to:
# - error.log (errors)
# - combined.log (all requests)

# View logs
tail -f error.log
tail -f combined.log

# Or use PM2
pm2 logs orbit-backend
```

---

## Part 8: Backup & Recovery

### Database Backups

```bash
# Supabase automatic backups (enabled by default)
# Go to Supabase Dashboard → Settings → Backups

# Manual backup
pg_dump -h host -U user -d database > backup.sql

# Restore
psql -h host -U user -d database < backup.sql
```

### Code Backups

```bash
# Use Git for code version control
git push origin main

# Set up automated backups to AWS S3
aws s3 sync ./backup s3://your-bucket/orbit-chat/
```

---

## Deployment Checklist

Before going live:

```
[ ] Backend deployed and running
[ ] Frontend deployed and accessible
[ ] SSL certificates installed
[ ] Environment variables configured
[ ] Database migrations applied
[ ] Edge Functions deployed
[ ] CORS properly configured
[ ] Rate limiting enabled
[ ] Security headers set
[ ] Error tracking configured
[ ] Monitoring set up
[ ] Backups scheduled
[ ] Domain configured
[ ] DNS records updated
[ ] Email notifications working
[ ] HTTPS redirect enabled
[ ] Admin user created
[ ] Tested end-to-end encryption
[ ] Tested message sending
[ ] Tested user auth
[ ] Performance tested
[ ] Security audit passed
[ ] Documentation updated
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs orbit-backend

# Verify environment variables
env | grep SUPABASE

# Test Supabase connection
npm run dev  # Local test first
```

### Frontend won't load

```bash
# Check browser console for errors
# Verify Supabase credentials in .env
# Check CORS errors in network tab
# Verify backend API URL is correct
```

### Key exchange fails

```bash
# Check backend logs
pm2 logs orbit-backend

# Verify RSA keys are generated
curl http://localhost:3000/api/key-exchange/public-key

# Test with curl
curl -X POST http://localhost:3000/api/key-exchange/register-key \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"your-id","encryptedKey":"base64-key"}'
```

### Database connection issues

```bash
# Check Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test connection
psql postgresql://user:password@host:5432/database
```

---

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Review backend README: `backend/README.md`
- Check Supabase status: https://status.supabase.com
- Review security guide: `DEPLOYMENT.md`

---

**Good luck with your deployment! 🚀**
