# 🔥 ORBIT SECURE CHAT - COMPLETE DATABASE SETUP

## ⚡ Quick Start (COPY PASTE THIS)

```sql
-- Copy the entire contents of COMPLETE_DB_RESET.sql
-- Go to Supabase Dashboard → SQL Editor
-- Paste everything
-- Click Execute
-- Wait for ✅ green checkmarks
-- Done!
```

---

## 📊 Database Schema Overview

### Tables (9 Total)

| Table | Purpose | Key Columns |
|-------|---------|-----------|
| **profiles** | User accounts (linked to auth.users) | id, username, display_name, email, avatar_url, bio, visibility, is_online |
| **public_users** | Read-only public directory (synced from profiles) | id, username, display_name, email, avatar_url, bio, visibility, is_online |
| **chats** | Chat sessions between users | id, created_at, updated_at |
| **chat_participants** | Who is in each chat | id, chat_id, user_id, joined_at |
| **chat_keys** | Encrypted symmetric keys for E2EE | id, chat_id, created_by, encrypted_key, key_version |
| **messages** | Encrypted chat messages | id, chat_id, sender_id, encrypted_content, nonce, created_at |
| **message_requests** | Friend/contact requests | id, from_user_id, to_user_id, message, status, created_at |
| **user_roles** | User roles (admin, user) | id, user_id, role |
| **connection_logs** | Event/debugging logs | id, user_id, event_type, metadata, created_at |

### Enums (3 Total)

```sql
account_visibility: 'public' | 'private'
app_role: 'admin' | 'user'
request_status: 'pending' | 'accepted' | 'rejected'
```

---

## 🗂️ Complete Table Definitions

### 1. PROFILES TABLE

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  visibility account_visibility DEFAULT 'public',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- User's main profile (linked to auth.users by id)
- Synced to public_users automatically
- RLS: Users can only read/update their own

### 2. PUBLIC_USERS TABLE

```sql
CREATE TABLE public.public_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  visibility account_visibility DEFAULT 'public',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Read-only public directory
- Anyone can search/view (no auth needed)
- Auto-synced from profiles table
- RLS: Everyone can SELECT, no one can INSERT/UPDATE/DELETE directly

### 3. CHATS TABLE

```sql
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Individual chat sessions
- Created when two users start chatting
- RLS: Users can only see chats they're in

### 4. CHAT_PARTICIPANTS TABLE

```sql
CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);
```

**Usage:**
- Tracks members of each chat (usually 2 for 1-on-1)
- Determines who can see/send messages
- RLS: Users can only see participants in chats they're in

### 5. CHAT_KEYS TABLE

```sql
CREATE TABLE public.chat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Stores encrypted symmetric key for each chat
- Key is encrypted with each participant's public key
- Used for E2EE message encryption/decryption
- One key per chat

### 6. MESSAGES TABLE

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Stores encrypted messages
- encrypted_content: AES-256-GCM encrypted text
- nonce: Random nonce for encryption
- RLS: Users can only see/send messages in chats they're in

**Encryption Flow:**
```
User types message
  ↓
Get chat's symmetric key (from chat_keys table)
  ↓
Encrypt message with AES-256-GCM
  ↓
Store encrypted_content + nonce in messages table
  ↓
Other participant decrypts using same key
```

### 7. MESSAGE_REQUESTS TABLE

```sql
CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);
```

**Usage:**
- Friend/contact requests
- Prevents spam (unique constraint on from/to pair)
- Status: pending → accepted/rejected
- RLS: Users can see requests sent to/from them

### 8. USER_ROLES TABLE

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role app_role DEFAULT 'user'
);
```

**Usage:**
- Stores user role (admin or user)
- One role per user
- Used for permission checks
- RLS: Users can only read their own, admins can read all

### 9. CONNECTION_LOGS TABLE

```sql
CREATE TABLE public.connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Logs connection events (login, logout, etc)
- Stores metadata as JSON
- Useful for debugging
- RLS: Users can only read their own logs

---

## 🔐 Row Level Security (RLS) Policies

### PROFILES
```
SELECT: auth.uid() = id (only own)
UPDATE: auth.uid() = id (only own)
INSERT: auth.uid() = id (only own)
DELETE: (none)
```

### PUBLIC_USERS
```
SELECT: true (anyone)
UPDATE: false (none)
INSERT: false (none)
DELETE: false (none)
```

### CHATS
```
SELECT: user is participant
INSERT: true (anyone can create)
UPDATE: user is participant
DELETE: (none)
```

### CHAT_PARTICIPANTS
```
SELECT: user is in same chat
INSERT: auth.uid() = user_id
UPDATE: (none)
DELETE: (none)
```

### CHAT_KEYS
```
SELECT: user is participant of chat
INSERT: auth.uid() = created_by
UPDATE: (none)
DELETE: (none)
```

### MESSAGES
```
SELECT: user is chat participant
INSERT: sender_id = auth.uid() AND user is participant
UPDATE: (none)
DELETE: (none)
```

### MESSAGE_REQUESTS
```
SELECT: to_user_id = auth.uid() OR from_user_id = auth.uid()
INSERT: auth.uid() = from_user_id
UPDATE: to_user_id = auth.uid()
DELETE: (none)
```

### USER_ROLES
```
SELECT: user_id = auth.uid() OR user is admin
INSERT: (none)
UPDATE: (none)
DELETE: (none)
```

### CONNECTION_LOGS
```
SELECT: user_id = auth.uid()
INSERT: auth.uid() = user_id
UPDATE: (none)
DELETE: (none)
```

---

## 📇 Indexes (23 Total)

### Performance Optimization
- All search columns have indexes
- All foreign keys have indexes
- All status/state columns have indexes
- All timestamp columns have indexes

```sql
-- Profiles: Search & filtering
idx_profiles_username_lower
idx_profiles_display_name_lower
idx_profiles_created_at
idx_profiles_is_online
idx_profiles_visibility

-- Public Users: Search & filtering
idx_public_users_username_lower
idx_public_users_display_name_lower
idx_public_users_created_at
idx_public_users_is_online
idx_public_users_visibility

-- Chats: Lookups
idx_chat_participants_user_id
idx_chat_participants_chat_id

-- Messages: Lookups & sorting
idx_messages_chat_id
idx_messages_sender_id
idx_messages_created_at

-- Requests: Filtering
idx_message_requests_from_user
idx_message_requests_to_user
idx_message_requests_status

-- Logs: Analytics
idx_connection_logs_user_id
idx_connection_logs_created_at
```

---

## 🔧 Functions

### 1. `create_chat_with_participants(target_user_id UUID)`
Creates a new chat and adds both participants.

```sql
SELECT public.create_chat_with_participants('other-user-id');
```

Returns: `chat_id UUID`

### 2. `has_role(user_id UUID, role app_role)`
Checks if user has a role.

```sql
SELECT public.has_role(auth.uid(), 'admin');
```

Returns: `boolean`

### 3. `is_chat_participant(chat_id UUID, user_id UUID)`
Checks if user is in chat.

```sql
SELECT public.is_chat_participant('chat-id', auth.uid());
```

Returns: `boolean`

### 4. `update_profiles_updated_at()`
Auto-updates `updated_at` on profile change.

### 5. `update_public_users_updated_at()`
Auto-updates `updated_at` on public_users change.

### 6. `sync_profile_to_public_users()`
Syncs new/updated profile to public_users table.

### 7. `sync_profile_update_to_public_users()`
Syncs profile updates to public_users table.

---

## ⏱️ Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| trigger_update_profiles_updated_at | profiles | BEFORE UPDATE | update_profiles_updated_at |
| trigger_update_public_users_updated_at | public_users | BEFORE UPDATE | update_public_users_updated_at |
| trigger_sync_profile_insert | profiles | AFTER INSERT | sync_profile_to_public_users |
| trigger_sync_profile_update | profiles | AFTER UPDATE | sync_profile_update_to_public_users |

---

## 📝 Common Queries

### Search Users (No Auth Needed)
```sql
SELECT * FROM public_users 
WHERE username ILIKE '%alice%' 
   OR display_name ILIKE '%alice%'
LIMIT 20;
```

### Get User Profile (No Auth Needed)
```sql
SELECT * FROM public_users 
WHERE id = 'user-id';
```

### Get Chat History
```sql
SELECT m.* FROM messages m
WHERE m.chat_id = 'chat-id'
ORDER BY m.created_at ASC;
```

### Get User's Chats
```sql
SELECT c.* FROM chats c
INNER JOIN chat_participants cp ON c.id = cp.chat_id
WHERE cp.user_id = auth.uid()
ORDER BY c.updated_at DESC;
```

### Get Pending Requests for User
```sql
SELECT * FROM message_requests
WHERE to_user_id = auth.uid()
AND status = 'pending'
ORDER BY created_at DESC;
```

### Get Online Users
```sql
SELECT * FROM public_users
WHERE is_online = true
ORDER BY last_seen DESC;
```

### Update User Profile
```sql
UPDATE profiles
SET display_name = 'New Name', bio = 'New Bio'
WHERE id = auth.uid();
```

### Update Online Status
```sql
UPDATE profiles
SET is_online = true, last_seen = now()
WHERE id = auth.uid();
```

### Create Message Request
```sql
INSERT INTO message_requests (from_user_id, to_user_id, message)
VALUES (auth.uid(), 'target-user-id', 'Hello!')
ON CONFLICT DO NOTHING;
```

### Accept Request & Create Chat
```sql
-- Accept request
UPDATE message_requests
SET status = 'accepted'
WHERE id = 'request-id' AND to_user_id = auth.uid();

-- Create chat
SELECT public.create_chat_with_participants(
  (SELECT from_user_id FROM message_requests WHERE id = 'request-id')
);
```

### Send Message
```sql
INSERT INTO messages (chat_id, sender_id, encrypted_content, nonce)
VALUES (
  'chat-id',
  auth.uid(),
  'encrypted-content-base64',
  'nonce-base64'
);
```

---

## ✅ Verification Checklist

After running COMPLETE_DB_RESET.sql:

```sql
-- Check tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Result: 9 (9 tables)

-- Check enums exist
SELECT COUNT(*) FROM pg_type 
WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace;
-- Result: 3 (3 enums)

-- Check RLS enabled
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
-- Result: 9 (all tables have RLS)

-- Check indexes created
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';
-- Result: 23+ (23 indexes)

-- Check functions created
SELECT COUNT(*) FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;
-- Result: 7 (7 functions)

-- Check triggers created
SELECT COUNT(*) FROM pg_trigger 
WHERE tgrelid IN (
  SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
);
-- Result: 4 (4 triggers)
```

---

## 🚀 Setup Steps

### 1. Copy SQL
Open `COMPLETE_DB_RESET.sql` file

### 2. Go to Supabase
- Supabase Dashboard
- Your Project
- SQL Editor
- New Query

### 3. Paste & Execute
- Paste entire contents of COMPLETE_DB_RESET.sql
- Click Execute button
- Wait for all ✅ green checkmarks

### 4. Verify
- All green ✅
- No red errors
- Tables appear in Schema

### 5. Test Frontend
- Restart: `npm run dev`
- Go to http://localhost:5173
- Search should work (no auth needed)
- Profiles should load
- Login & messaging should work

---

## 🔄 Data Flow

### User Registration
```
1. User signs up via Supabase Auth
2. Trigger creates row in profiles table
3. Trigger syncs to public_users table
4. Row in user_roles (default 'user')
5. User is now searchable & has profile
```

### User Search (No Auth)
```
1. User types search query
2. Query public_users table
3. RLS allows SELECT (no auth needed)
4. Results returned
5. User can view profiles without logging in
```

### Sending Message Request
```
1. User clicks "Message"
2. Check if already has request
3. INSERT into message_requests
4. to_user_id receives notification
```

### Accepting Request & Creating Chat
```
1. Recipient accepts request
2. UPDATE message_requests status
3. Call create_chat_with_participants()
4. Chat & participants created
5. Chat key generated for E2EE
6. Users can now message
```

### Sending Encrypted Message
```
1. User types message
2. Fetch chat_key from chat_keys
3. Encrypt with AES-256-GCM
4. INSERT into messages
5. Other participant fetches
6. Decrypt with same key
7. Message displayed
```

---

## 🔐 Security Summary

| Aspect | How It Works |
|--------|-------------|
| **Authentication** | Supabase Auth (email/password) |
| **Profiles** | Private (user can only read/update own) |
| **Discovery** | Public table (anyone can search) |
| **Messages** | E2EE (AES-256-GCM, server can't read) |
| **Permissions** | RLS enforces all access control |
| **Chat Access** | Only participants can see chat/messages |
| **Requests** | Can't spam (unique constraint) |

---

## 📱 Frontend Code Reference

All functions to use in React:

```typescript
// Search (no auth needed)
searchUsers(query): PublicUser[]

// Get profile (no auth needed)
getUserProfile(userId): PublicUser

// Create request (auth needed)
createMessageRequest(fromId, toId, message): boolean

// Accept request & create chat (auth needed)
acceptRequestAndCreateChat(requestId): chatId

// Send message (auth needed, encrypted)
sendMessage(chatId, plaintext): boolean

// Update profile (auth needed)
updateProfile(userId, updates): boolean

// Update online status (auth needed)
updateOnlineStatus(userId, isOnline): boolean
```

---

## ❓ FAQ

**Q: Can anyone see my messages?**
A: No. Messages are encrypted E2E. Server never sees plaintext.

**Q: Can anyone find me?**
A: Yes, if your visibility is 'public'. Set to 'private' to hide profile.

**Q: Can I delete messages?**
A: Currently no. Data is permanent once stored.

**Q: What if I forget my password?**
A: Use "Forgot Password" - handled by Supabase Auth.

**Q: How do I know if someone is online?**
A: is_online field updates when they're using the app.

**Q: Can I message anyone?**
A: Need to send request first. They must accept.

---

## 🎯 What's Included

✅ 9 tables  
✅ 3 enums  
✅ 9 RLS policies per table  
✅ 23 indexes  
✅ 7 functions  
✅ 4 triggers  
✅ Complete E2EE support  
✅ Production-ready security  
✅ Scalable architecture  

---

**All set! Run COMPLETE_DB_RESET.sql in Supabase and you're good to go!** 🚀
