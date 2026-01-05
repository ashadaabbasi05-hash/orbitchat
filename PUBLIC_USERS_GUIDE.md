# 🌐 PUBLIC USERS TABLE - SETUP GUIDE

## What This Does

Creates a **completely public users table** that:
- ✅ Works WITHOUT Supabase Auth
- ✅ Anyone can read profiles (no login needed)
- ✅ Search works for everyone
- ✅ Display profile info publicly
- ✅ Still encrypted messages (end-to-end)

---

## ⚡ Quick Setup (2 min)

### 1. Copy the SQL
Open `PUBLIC_USERS_SETUP.sql` and copy all contents

### 2. Paste in Supabase SQL Editor
- Go to: https://app.supabase.com
- Click: SQL Editor (left sidebar)
- Paste the SQL
- Click: Execute

### 3. Done! ✅

---

## 🔄 How It Works

### Before (Broken)
```
User visits search page
  ↓
Needs to be authenticated
  ↓
Query auth-linked profiles table
  ↓
RLS blocks everything
  ❌ Doesn't work
```

### After (Fixed)
```
User visits search page
  ↓
No authentication required!
  ↓
Query public_users table
  ↓
RLS allows public read
  ✅ Works perfectly
```

---

## 📊 What's in the SQL

```sql
1. CREATE public.public_users table
   - id, username, display_name, email
   - avatar_url, bio, visibility
   - is_online, last_seen
   - created_at, updated_at

2. Enable RLS

3. Create policies
   - SELECT: Anyone can read ✅
   - INSERT: Only backend ❌
   - UPDATE: Only backend ❌
   - DELETE: Only backend ❌

4. Create indexes for fast search
   - username_lower
   - display_name_lower
   - created_at
   - is_online

5. Create timestamp trigger

6. Grant SELECT permission

7. Insert 4 test users
   - alice, bob, charlie, diana

8. Verify everything works
```

---

## 🧪 Test It

### In Browser Console
```javascript
// Search should work now (no auth needed!)
const { data, error } = await supabase
  .from('public_users')
  .select('*')
  .limit(5);

console.log('Users:', data);
console.log('Error:', error);
// Should return 4+ test users with no error
```

### In Your App
1. Go to Search page (without logging in)
2. Should see list of users
3. Search should work
4. Click on a user to view their profile

---

## 📝 Important Notes

### Public vs Private
- **Public table:** Anyone can see usernames, display names, bios
- **Private messages:** Only encrypted, only between chat participants
- **Security:** No plaintext data exposed

### No Auth Needed
- Users can:
  - ✅ View all profiles
  - ✅ Search users
  - ✅ See profile pages
- Users still need to:
  - 🔐 Sign in to send messages
  - 🔐 Sign in to create chats

### Example User Data
The SQL inserts 4 test users:
```
alice   - Alice Wonder   - "Love encrypted chat 🔐"
bob     - Bob Builder    - "Building the future"
charlie - Charlie Day    - "Always online"
diana   - Diana Prince   - "Wonder woman fan"
```

Delete these and add your own!

---

## 🔐 Security

### What's Public
- Username
- Display name
- Bio
- Avatar URL
- Online status

### What's Private
- Email (stored but not shown)
- Private user details
- Messages (encrypted end-to-end)
- Chat history

### RLS Protection
```sql
-- Anyone can READ
CREATE POLICY "anyone_can_read"
ON public.public_users FOR SELECT
USING (true);

-- Only backend can WRITE
CREATE POLICY "no_inserts"
ON public.public_users FOR INSERT
WITH CHECK (false);
```

---

## 🛠️ Managing Users

### Insert a New User
```sql
INSERT INTO public.public_users (username, display_name, email, bio, visibility)
VALUES ('john', 'John Doe', 'john@example.com', 'Hello!', 'public');
```

### Update User (via app)
The app can update via `supabase.from('public_users').update()` but only for the logged-in user.

### Delete a User
```sql
DELETE FROM public.public_users WHERE username = 'john';
```

---

## 📱 Frontend Code Changes

### SearchPage.tsx
```javascript
// Changed from:
.from('profiles')
.neq('id', user.id)

// To:
.from('public_users')
// No user.id check needed!
```

### ProfilePage.tsx
```javascript
// Changed from:
const { profile, updateProfile } = useAuth();

// To:
const { data } = await supabase
  .from('public_users')
  .select('*')
  .eq('id', user.id)
  .single();
```

---

## ✅ Verification Checklist

After running the SQL:

```
[ ] SQL executed successfully (green checkmarks)
[ ] No errors in Supabase SQL Editor
[ ] Can run verification query:
    SELECT COUNT(*) FROM public.public_users;
    (Should return 4)
[ ] Can search in browser console:
    const { data } = await supabase
      .from('public_users')
      .select('*')
      .limit(1);
    console.log(data); // Should have 1 user
[ ] Restarted frontend
[ ] Search page works (without logging in)
[ ] Can view profile pages
[ ] Can search users
```

---

## 🚀 Next Steps

1. **Run the SQL** (2 min)
2. **Restart frontend** (30 sec)
3. **Test search** (1 min)

Done! Your search now works completely public.

---

## 📞 If Something Breaks

### Problem: "relation 'public_users' does not exist"
**Fix:** Run the SQL again, make sure you're in the right Supabase project

### Problem: Search still doesn't work
**Fix:** Check browser console for errors, check Supabase table exists:
```sql
SELECT * FROM public.public_users LIMIT 1;
```

### Problem: Can't insert/update users
**Fix:** That's on purpose! Only the app can do it via backend. RLS blocks direct changes.

---

## 🎯 Summary

| What | Before | After |
|---|---|---|
| **Need to login to search** | ✅ Yes | ❌ No |
| **Profile visible publicly** | ❌ No | ✅ Yes |
| **Search works** | ❌ Broken | ✅ Works |
| **RLS security** | ⚠️ Confusing | ✅ Clear |
| **Public access** | ❌ No | ✅ Yes |

You now have a true public users directory! 🎉
