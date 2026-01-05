# 🎯 QUICK REFERENCE CARD

## 🚀 Setup (3 Steps)

```
STEP 1: RUN SQL (5 min)
├─ Open COMPLETE_DB_RESET.sql
├─ Copy entire file
├─ Go to Supabase → SQL Editor
├─ Paste everything
├─ Click Execute
└─ Wait for ✅

STEP 2: RESTART FRONTEND (1 min)
├─ Kill: Ctrl+C
└─ Run: npm run dev

STEP 3: TEST (5 min)
├─ Go to http://localhost:5173
├─ Don't login yet
├─ Click Search
├─ Should see users
├─ Search should work
├─ Click profile → loads
├─ Login → message works
└─ Done! 🎉
```

---

## 📊 Database Tables (9 Total)

```
profiles
├─ id (UUID), username (TEXT), display_name (TEXT)
├─ email, avatar_url, bio, visibility, is_online
├─ last_seen, created_at, updated_at

public_users (synced from profiles)
├─ Same fields as profiles
├─ Read-only (RLS: SELECT=true, others=false)

chats
├─ id, created_at, updated_at

chat_participants
├─ id, chat_id (FK), user_id (FK), joined_at

chat_keys (E2EE)
├─ id, chat_id, created_by, encrypted_key, key_version, created_at

messages (encrypted)
├─ id, chat_id, sender_id, encrypted_content, nonce, created_at

message_requests
├─ id, from_user_id, to_user_id, message, status, created_at, updated_at

user_roles
├─ id, user_id, role (admin|user)

connection_logs
├─ id, user_id, event_type, metadata, created_at
```

---

## 🔐 Security

```
PUBLIC
✅ public_users table (search without auth)

PRIVATE
🔒 profiles table (only own)
🔒 Messages (encrypted, can't read plaintext)

PROTECTED
🛡️ All tables have RLS
🛡️ 81 policies total
🛡️ Access strictly controlled
```

---

## 📡 Main Functions

| Function | Auth | SQL |
|----------|------|-----|
| searchUsers(query) | ❌ | SELECT FROM public_users WHERE username/display_name ILIKE |
| getUserProfile(id) | ❌ | SELECT FROM public_users WHERE id |
| sendMessageRequest(toId, msg) | ✅ | INSERT INTO message_requests |
| createChat(targetId) | ✅ | CALL create_chat_with_participants |
| sendMessage(chatId, content) | ✅ | INSERT INTO messages (encrypted) |
| getMessages(chatId) | ✅ | SELECT FROM messages WHERE chat_id |
| updateProfile(updates) | ✅ | UPDATE profiles (triggers sync) |
| updateOnlineStatus(isOnline) | ✅ | UPDATE profiles is_online |

---

## 🧪 Quick Tests

```
✅ Search without login → Should see users
✅ View profile without login → Should load
✅ Login → Should work
✅ Send request → Should be pending
✅ Accept request → Should create chat
✅ Send message → Should encrypt & store
✅ Online status → Should show indicator
```

---

## 📚 Files at a Glance

| File | Purpose | When |
|------|---------|------|
| COMPLETE_DB_RESET.sql | Setup database | Run once |
| DATABASE_SCHEMA.md | Full reference | Anytime |
| QUERIES_REFERENCE.md | Code examples | While coding |
| SETUP_SUMMARY.md | Overview | At start |
| PUBLIC_USERS_JS_SETUP.ts | Reusable code | Copy snippets |
| DOCUMENTATION.md | Index | Find things |
| DELIVERY.md | Summary | Now |

---

## 💻 Copy-Paste Code

```typescript
// Search
const users = await searchUsers("alice");

// Get profile
const profile = await getUserProfile(userId);

// Send request
await sendMessageRequest(targetId, "Hi!");

// Create chat
const chatId = await createChat(targetId);

// Send message
await sendMessage(chatId, plaintext, key);

// React hook
const { results, search } = useSearchUsers();
search("alice");
```

---

## 🚀 You're Ready!

1. Run **COMPLETE_DB_RESET.sql** in Supabase
2. Restart frontend: `npm run dev`
3. Test: Search → Profile → Login → Message
4. Deploy! 🎉

---

**Complete, secure, encrypted, production-ready!** ✨
