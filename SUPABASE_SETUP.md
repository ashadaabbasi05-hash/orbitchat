# 🛠️ Orbit Chat - Complete Supabase Setup & Debugging Guide

> **Your profile ain't loading, search ain't working, Supabase connection is broken?**  
> **Follow this guide step-by-step. It will fix everything.**

---

## Table of Contents

1. [Quick Fix (5 min)](#quick-fix-5-min)
2. [What Was Wrong](#what-was-wrong)
3. [Complete Setup (15 min)](#complete-setup-15-min)
4. [Verify Everything Works](#verify-everything-works)
5. [Debugging Guide](#debugging-guide)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## ⚡ Quick Fix (5 min)

### 1. Open Supabase SQL Editor

Go to: **Supabase Dashboard → SQL Editor** (left sidebar)

### 2. Copy & Paste This File

Open: `supabase/COMPLETE_SETUP.sql` from your project folder

Copy the **entire contents** and paste into the SQL Editor.

### 3. Execute

Click the **Execute** button (or Cmd+Enter).

Watch for all queries to turn ✅ green (no red errors).

### 4. Restart Your App

```bash
# Kill the frontend dev server (Ctrl+C)
# Restart it
npm run dev
```

### 5. Test

- Sign out and sign back in
- Your profile should appear in the sidebar
- Search should work

---

## 🤔 What Was Wrong

Your Supabase setup was **99% complete** but missing one critical piece:

| Missing Component | Impact | How It Was Fixed |
|---|---|---|
| **Profile Creation Trigger** | New users couldn't see their profile | Added `handle_new_user()` trigger |
| **Proper RLS Policies** | Search/profile access blocked by overly restrictive rules | Recreated all policies correctly |
| **Query Error Handling** | Couldn't debug what was failing | Added detailed error logging |

The **trigger** is critical: When a user signs up in Supabase Auth, we need to automatically create a row in the `profiles` table. This wasn't happening!

---

## 📋 Complete Setup (15 min)

If you want to understand what's happening or need manual setup:

### Option A: Automatic (Recommended)

1. Run `supabase/COMPLETE_SETUP.sql` in the SQL Editor (see above)
2. Done! ✅

### Option B: Manual Step-by-Step

#### Step 1: Verify Tables Exist

```sql
SELECT tablename FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see 8 tables:
- profiles
- chats
- messages
- chat_participants
- message_requests
- user_roles
- connection_logs
- chat_keys

If any are missing, run `COMPLETE_SETUP.sql`.

#### Step 2: Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';
```

Should return:
```
tablename  | rowsecurity
-----------|-----
profiles   | t
```

If `false`, the RLS was disabled. Re-run `COMPLETE_SETUP.sql`.

#### Step 3: Verify Trigger Exists

```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'profiles';
```

Should show `update_profiles_updated_at` trigger.

```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'public';
```

Should show `on_auth_user_created` trigger.

If missing, run `COMPLETE_SETUP.sql`.

#### Step 4: Verify Policies Exist

```sql
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies WHERE schemaname = 'public' 
GROUP BY tablename 
ORDER BY tablename;
```

Should have multiple policies per table:
- profiles: 3+ policies
- chats: 2+ policies
- messages: 2+ policies
- etc.

If missing, run `COMPLETE_SETUP.sql`.

#### Step 5: Verify Functions Exist

```sql
SELECT proname FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('is_chat_participant', 'has_role', 'create_chat_with_participants', 'handle_new_user');
```

Should return 4 functions.

If missing, run `COMPLETE_SETUP.sql`.

---

## ✅ Verify Everything Works

After running setup, test each piece:

### Test 1: Auth is Working

```bash
# Open browser console (F12)
const { data } = await supabase.auth.getSession();
console.log('User:', data.session?.user?.id);
```

Should print your user ID.

### Test 2: Profiles Are Visible

```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);
console.log('Data:', data);
console.log('Error:', error);
```

Should return at least 1 profile. If error about "permission denied", RLS is broken.

### Test 3: Search Works

```javascript
const user = (await supabase.auth.getUser()).data.user;
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .neq('id', user.id)
  .limit(5);
console.log('Search results:', data);
console.log('Error:', error);
```

Should return multiple profiles.

### Test 4: Profile Loading in UI

1. Sign out
2. Sign back in
3. You should see your profile in the sidebar (top left)
4. Go to Search page
5. Should see list of users

---

## 🔍 Debugging Guide

### If Profile Still Not Loading

**Step 1: Check if profile exists**

```bash
# In browser console
const user = (await supabase.auth.getUser()).data.user;
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id);
console.log('Profile found:', data);
```

If `null` or empty array, the profile wasn't created.

**Fix:**

1. Go to Supabase SQL Editor
2. Create the profile manually:

```sql
INSERT INTO public.profiles (id, username, display_name, visibility)
VALUES (
  'YOUR_USER_ID_HERE',
  'yourUsername',
  'Your Display Name',
  'public'
);
```

Get `YOUR_USER_ID_HERE` from Supabase Dashboard → Authentication → Users

**Or:**

Trigger might be broken. Run `COMPLETE_SETUP.sql` again.

### If Search Not Working

**Step 1: Check profiles exist**

```sql
SELECT COUNT(*) FROM profiles;
```

If 0, create test profiles. If >0, continue to Step 2.

**Step 2: Test the exact query**

```sql
SELECT * FROM profiles 
WHERE username ILIKE '%test%' 
LIMIT 5;
```

If this works in SQL Editor but not in your app, the issue is in your app code.

**Step 3: Check RLS**

```javascript
// In browser console
const { data, error } = await supabase
  .from('profiles')
  .select('*');
console.log('Error:', error?.message);
```

If "permission denied", run `COMPLETE_SETUP.sql` to fix RLS.

### If "Permission Denied" Error

This means RLS is too restrictive.

**Quick fix:**

```sql
-- Check profiles policy
SELECT policyname FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Should see at least:
-- - profiles_select
-- - profiles_update
-- - profiles_insert
```

If missing, run `COMPLETE_SETUP.sql`.

### If Tables Don't Exist

Run the migrations:

```bash
supabase migration up --project-ref YOUR_PROJECT_REF
```

Or copy-paste `supabase/COMPLETE_SETUP.sql` into SQL Editor and execute.

---

## 🚨 Common Issues & Solutions

### Issue 1: Profile Won't Load in Sidebar

**Symptom:** Sidebar shows "Profile" but it's null/empty

**Root Cause:** Profile wasn't created when user signed up

**Solution:**

```sql
-- Check if profile exists
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';

-- If nothing, create it manually
INSERT INTO public.profiles (id, username, display_name, visibility)
VALUES ('YOUR_USER_ID', 'username', 'Display Name', 'public');

-- Then refresh your browser
```

### Issue 2: Search Returns No Results

**Symptom:** Search page loads, but typing returns "No users found"

**Root Cause:** Either no profiles exist, or RLS is blocking the query

**Solution:**

1. **Check profiles exist:**

```sql
SELECT COUNT(*) FROM profiles;
```

If 0, create a test profile:

```sql
INSERT INTO public.profiles VALUES (
  gen_random_uuid(),
  'testuser',
  'Test User',
  NULL,
  NULL,
  'public',
  false,
  now(),
  now(),
  now()
);
```

2. **Check RLS isn't blocking:**

```javascript
// In browser console
const { data, error } = await supabase
  .from('profiles')
  .select('*');
console.log('Error:', error);
```

If error, run `COMPLETE_SETUP.sql`.

### Issue 3: "Permission Denied for Relation Profiles"

**Symptom:** Browser console shows SQL error about permissions

**Root Cause:** RLS policies are too restrictive or missing

**Solution:**

```sql
-- Drop all bad policies
DROP POLICY IF EXISTS * ON public.profiles;

-- Then run COMPLETE_SETUP.sql to recreate correctly
```

### Issue 4: Profile Updates Not Saving

**Symptom:** You can update your profile, but changes don't persist

**Root Cause:** Missing RLS policy for UPDATE

**Solution:**

```sql
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

Or run `COMPLETE_SETUP.sql`.

### Issue 5: Messages Won't Send

**Symptom:** Clicking "Send" does nothing, or error about chat participation

**Root Cause:** `is_chat_participant()` function not working or RLS blocking inserts

**Solution:**

```sql
-- Check function exists
SELECT * FROM pg_proc 
WHERE proname = 'is_chat_participant';

-- If missing, run COMPLETE_SETUP.sql
```

### Issue 6: Chat Creation Fails

**Symptom:** When you try to message someone, nothing happens

**Root Cause:** `create_chat_with_participants()` function missing

**Solution:**

```sql
-- Check function exists
SELECT * FROM pg_proc 
WHERE proname = 'create_chat_with_participants';

-- If missing, run COMPLETE_SETUP.sql
```

---

## 📝 Testing Checklist

After setup, verify each item:

```
[ ] Can sign up
[ ] Can sign in
[ ] Profile appears in sidebar after login
[ ] Profile has correct username & display name
[ ] Can visit Profile page
[ ] Can search for users
[ ] Search results appear
[ ] Can create a chat with another user
[ ] Can send a message
[ ] Message appears encrypted in database
[ ] Can receive message from another user
[ ] Message requests work for private users
```

---

## 🚀 Next Steps

Once everything is working:

1. **Deploy backend** (see DEPLOYMENT.md)
2. **Deploy Edge Functions** (see supabase/functions/key-exchange/README.md)
3. **Run tests** (see TESTING.md)
4. **Deploy to production** (see DEPLOYMENT.md)

---

## 💬 Need More Help?

If you're still stuck:

1. Take a screenshot of the error
2. Run this in browser console and screenshot output:

```javascript
const user = (await supabase.auth.getUser()).data.user;
console.log('User ID:', user?.id);
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id);
console.log('Profile:', data);
```

3. Check browser console (F12) for SQL error messages
4. Share the error message and we can debug!

---

## 📚 Related Files

- `supabase/COMPLETE_SETUP.sql` - Full setup (run this first!)
- `supabase/fix_rls.sql` - Just fixes RLS if schema already exists
- `supabase/QUICK_FIX.md` - 5-minute fix guide
- `DEPLOYMENT.md` - Production deployment
- `TESTING.md` - How to test everything

Good luck! 🚀
