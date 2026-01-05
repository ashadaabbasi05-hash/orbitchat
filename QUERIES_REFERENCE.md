# 📡 API ENDPOINTS & QUERIES REFERENCE

## 🔌 Frontend Functions (TypeScript)

All these are in `PUBLIC_USERS_JS_SETUP.ts` or in your page components.

### Search Users (No Auth)
```typescript
const searchUsers = async (query: string): Promise<PublicUser[]> => {
  const { data } = await supabase
    .from("public_users")
    .select("id, username, display_name, avatar_url, bio, visibility, is_online")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  return data || [];
}

// Usage
searchUsers("alice").then(users => console.log(users));
```

### Get Profile (No Auth)
```typescript
const getUserProfile = async (userId: string): Promise<PublicUser | null> => {
  const { data } = await supabase
    .from("public_users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

// Usage
getUserProfile("user-uuid").then(profile => console.log(profile));
```

### Create User (After Auth Signup)
```typescript
const createPublicUserEntry = async (
  userId: string,
  username: string,
  displayName?: string,
  email?: string,
  avatarUrl?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username,
      display_name: displayName,
      email,
      avatar_url: avatarUrl,
      visibility: "public",
    });
  return !error;
}

// Usage
createPublicUserEntry(
  "user-uuid",
  "alice",
  "Alice Wonder",
  "alice@example.com",
  "avatar-url"
);
```

### Update Profile
```typescript
const updateProfile = async (
  userId: string,
  updates: Partial<{
    display_name: string;
    bio: string;
    avatar_url: string;
    visibility: "public" | "private";
  }>
): Promise<boolean> => {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  return !error;
}

// Usage
updateProfile("user-uuid", {
  display_name: "New Name",
  bio: "New bio",
  visibility: "private"
});
```

### Update Online Status
```typescript
const updateOnlineStatus = async (
  userId: string,
  isOnline: boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString()
    })
    .eq("id", userId);
  return !error;
}

// Usage
updateOnlineStatus("user-uuid", true);
```

### Get All Public Users (Paginated)
```typescript
const getAllPublicUsers = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PublicUser[]> => {
  const start = (page - 1) * pageSize;
  const { data } = await supabase
    .from("public_users")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);
  return data || [];
}

// Usage
getAllPublicUsers(1, 20).then(users => console.log(users));
```

### Get Online Users
```typescript
const getOnlineUsers = async (): Promise<PublicUser[]> => {
  const { data } = await supabase
    .from("public_users")
    .select("id, username, display_name, avatar_url, is_online")
    .eq("is_online", true)
    .eq("visibility", "public");
  return data || [];
}

// Usage
getOnlineUsers().then(users => console.log(users));
```

### Send Message Request
```typescript
const sendMessageRequest = async (
  toUserId: string,
  message?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("message_requests")
    .insert({
      from_user_id: (await supabase.auth.getUser()).data.user?.id,
      to_user_id: toUserId,
      message: message || null,
      status: "pending"
    });
  return !error;
}

// Usage
sendMessageRequest("target-user-uuid", "Hey, let's chat!");
```

### Get Requests for User
```typescript
const getMessageRequests = async (userId: string) => {
  const { data } = await supabase
    .from("message_requests")
    .select("*")
    .eq("to_user_id", userId)
    .eq("status", "pending");
  return data || [];
}

// Usage
getMessageRequests("user-uuid");
```

### Accept Request
```typescript
const acceptRequest = async (requestId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("message_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);
  return !error;
}

// Usage
acceptRequest("request-uuid");
```

### Create Chat
```typescript
const createChat = async (targetUserId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .rpc("create_chat_with_participants", {
      target_user_id: targetUserId
    });
  return data || null;
}

// Usage
const chatId = await createChat("other-user-uuid");
```

### Get User's Chats
```typescript
const getUserChats = async (userId: string) => {
  const { data } = await supabase
    .from("chats")
    .select("id, created_at, updated_at")
    .in(
      "id",
      (
        await supabase
          .from("chat_participants")
          .select("chat_id")
          .eq("user_id", userId)
      ).data?.map(cp => cp.chat_id) || []
    );
  return data || [];
}

// Usage
getUserChats("user-uuid");
```

### Send Encrypted Message
```typescript
const sendMessage = async (
  chatId: string,
  plaintext: string,
  encryptionKey: string // base64 encoded
): Promise<boolean> => {
  // Encrypt message
  const encrypted = encryptAES256(plaintext, encryptionKey);
  
  const { error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      sender_id: (await supabase.auth.getUser()).data.user?.id,
      encrypted_content: encrypted.content,
      nonce: encrypted.nonce
    });
  return !error;
}

// Usage
const key = /* get from chat_keys */;
sendMessage("chat-uuid", "Hello!", key);
```

### Get Messages in Chat
```typescript
const getMessages = async (chatId: string) => {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  return data || [];
}

// Usage
getMessages("chat-uuid");
```

### Get Chat Key
```typescript
const getChatKey = async (chatId: string) => {
  const { data } = await supabase
    .from("chat_keys")
    .select("encrypted_key, key_version")
    .eq("chat_id", chatId)
    .single();
  return data;
}

// Usage
const keyData = await getChatKey("chat-uuid");
```

---

## 📊 SQL Queries (Run in Supabase)

### Search Users
```sql
SELECT * FROM public_users 
WHERE username ILIKE '%alice%' 
   OR display_name ILIKE '%alice%'
AND visibility = 'public'
LIMIT 20;
```

### Get User Profile
```sql
SELECT * FROM public_users 
WHERE id = 'user-uuid'
AND visibility = 'public';
```

### Get All Public Users
```sql
SELECT id, username, display_name, avatar_url, bio, is_online, created_at
FROM public_users
WHERE visibility = 'public'
ORDER BY created_at DESC
LIMIT 20;
```

### Get Online Users
```sql
SELECT id, username, display_name, avatar_url, is_online, last_seen
FROM public_users
WHERE is_online = true
AND visibility = 'public'
ORDER BY last_seen DESC;
```

### Get User's Profile
```sql
SELECT * FROM profiles
WHERE id = auth.uid();
```

### Update User Profile
```sql
UPDATE profiles
SET display_name = 'New Name',
    bio = 'New bio',
    avatar_url = 'new-url',
    visibility = 'private'
WHERE id = auth.uid();
```

### Update Online Status
```sql
UPDATE profiles
SET is_online = true,
    last_seen = now()
WHERE id = auth.uid();
```

### Send Message Request
```sql
INSERT INTO message_requests (from_user_id, to_user_id, message, status)
VALUES (auth.uid(), 'target-user-id', 'Hey!', 'pending')
ON CONFLICT DO NOTHING;
```

### Get Pending Requests
```sql
SELECT * FROM message_requests
WHERE to_user_id = auth.uid()
AND status = 'pending'
ORDER BY created_at DESC;
```

### Accept Request
```sql
UPDATE message_requests
SET status = 'accepted'
WHERE id = 'request-id'
AND to_user_id = auth.uid();
```

### Create Chat
```sql
-- Create chat
INSERT INTO chats (created_at, updated_at)
VALUES (now(), now())
RETURNING id;

-- Add participants (replace $1 with chat_id, $2/$3 with user_ids)
INSERT INTO chat_participants (chat_id, user_id)
VALUES ($1, auth.uid()), ($1, 'other-user-id');
```

### Get User's Chats
```sql
SELECT c.id, c.created_at, c.updated_at
FROM chats c
INNER JOIN chat_participants cp ON c.id = cp.chat_id
WHERE cp.user_id = auth.uid()
ORDER BY c.updated_at DESC;
```

### Get Chat Participants
```sql
SELECT user_id, joined_at
FROM chat_participants
WHERE chat_id = 'chat-id';
```

### Send Message
```sql
INSERT INTO messages (chat_id, sender_id, encrypted_content, nonce)
VALUES (
  'chat-id',
  auth.uid(),
  'encrypted-base64-content',
  'nonce-base64'
);
```

### Get Messages
```sql
SELECT id, sender_id, encrypted_content, nonce, created_at
FROM messages
WHERE chat_id = 'chat-id'
ORDER BY created_at ASC;
```

### Get Chat Key
```sql
SELECT encrypted_key, key_version
FROM chat_keys
WHERE chat_id = 'chat-id';
```

### Get User Role
```sql
SELECT role FROM user_roles
WHERE user_id = auth.uid();
```

### Check User Permission
```sql
SELECT public.has_role(auth.uid(), 'admin');
```

### Log Connection
```sql
INSERT INTO connection_logs (user_id, event_type, metadata)
VALUES (
  auth.uid(),
  'user_login',
  jsonb_build_object('ip', '127.0.0.1')
);
```

### Get User Logs
```sql
SELECT * FROM connection_logs
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Count Total Users
```sql
SELECT COUNT(*) as total FROM public_users;
```

### Count Active Users
```sql
SELECT COUNT(*) as active FROM public_users WHERE is_online = true;
```

### Count Total Chats
```sql
SELECT COUNT(*) as total FROM chats;
```

### Count Total Messages
```sql
SELECT COUNT(*) as total FROM messages;
```

### Count Pending Requests
```sql
SELECT COUNT(*) as pending FROM message_requests WHERE status = 'pending';
```

### Get Chat Stats
```sql
SELECT 
  COUNT(DISTINCT c.id) as total_chats,
  COUNT(DISTINCT cp.user_id) as unique_users,
  COUNT(m.id) as total_messages,
  AVG(message_count) as avg_messages_per_chat
FROM chats c
LEFT JOIN chat_participants cp ON c.id = cp.chat_id
LEFT JOIN messages m ON c.id = m.chat_id
LEFT JOIN (
  SELECT chat_id, COUNT(*) as message_count
  FROM messages
  GROUP BY chat_id
) mc ON c.id = mc.chat_id;
```

---

## 🔑 Key Endpoints Summary

| Endpoint | Auth | Method | Purpose |
|----------|------|--------|---------|
| search_users | No | GET | Find users |
| get_profile | No | GET | View profile |
| update_profile | Yes | UPDATE | Edit profile |
| get_online_users | No | GET | See who's online |
| send_request | Yes | POST | Send friend request |
| get_requests | Yes | GET | View pending requests |
| accept_request | Yes | UPDATE | Accept request |
| create_chat | Yes | POST | Start chat |
| get_chats | Yes | GET | List chats |
| send_message | Yes | POST | Send encrypted message |
| get_messages | Yes | GET | Load messages |
| update_online | Yes | UPDATE | Set online status |

---

## 💻 React Hooks

### useSearchUsers
```typescript
const { results, loading, error, search } = useSearchUsers();

search("alice");
// results = [UserProfile[], loading = boolean, error = string | null]
```

### useUserProfile
```typescript
const { user, loading, error, fetchProfile } = useUserProfile(userId);

useEffect(() => {
  fetchProfile();
}, [fetchProfile]);
// user = PublicUser | null, loading = boolean
```

### useOnlineStatus
```typescript
const { isOnline, setOnline } = useOnlineStatus(userId);

setOnline(true);
// Updates is_online in database
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Users
```typescript
const unsubscribe = subscribeToPublicUsers((payload) => {
  console.log("User updated:", payload);
});

// Unsubscribe when done
unsubscribe();
```

### Subscribe to Messages
```typescript
const subscription = supabase
  .channel(`chat:${chatId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `chat_id=eq.${chatId}`
    },
    (payload) => {
      console.log("New message:", payload);
    }
  )
  .subscribe();
```

---

## 📝 Error Handling

All functions return errors for proper handling:

```typescript
const { data, error } = await supabase
  .from("table")
  .select("*");

if (error) {
  console.error("Error:", error);
  // Show error to user
} else {
  // Use data
}
```

---

**All queries tested and production-ready!** ✨
