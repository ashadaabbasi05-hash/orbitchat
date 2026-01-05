# 🔧 ORBIT CHAT - SUPABASE QUICK FIX GUIDE

## 🚨 ISSUES YOU'RE EXPERIENCING

1. **Profile aint loading** - RLS policies blocking access or profile not created on signup
2. **Search aint working** - Query might be malformed or profiles not visible
3. **Nothing related w supabase working** - Missing triggers or incorrect RLS setup

---

## ✅ QUICK FIX (5 minutes)

### Step 1: Run This SQL in Supabase Editor
Open **Supabase Dashboard → SQL Editor** and copy-paste the entire contents of:
```
supabase/COMPLETE_SETUP.sql
```

Click **Execute** and wait for all queries to complete (should be green checkmarks).

### Step 2: Test in Browser Console
Open your browser DevTools (F12) and run:
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);
console.log('Data:', data);
console.log('Error:', error);
```

Should return at least 1 profile. If you see an error about "permission denied", the RLS is still broken.

### Step 3: Test Search
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .neq('id', (await supabase.auth.getUser()).data.user.id)
  .or('username.ilike.%test%,display_name.ilike.%test%')
  .limit(5);
console.log('Search results:', data);
console.log('Error:', error);
```

---

## 🔍 TROUBLESHOOTING

### Problem 1: "permission denied for relation profiles"

**Cause:** RLS policies are incorrect or too restrictive

**Fix:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this single query:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'profiles';
   ```
3. It should show `rowsecurity | true`
4. If it's false, RLS is disabled (run COMPLETE_SETUP.sql again)

### Problem 2: "relation 'profiles' does not exist"

**Cause:** Table wasn't created

**Fix:** The table definitely exists if you ran the migrations. Check if you're in the right database/project.

### Problem 3: Profile null in sidebar after login

**Cause:** Profile not created when user signed up

**Fix:**
1. Go to **Supabase Dashboard → SQL Editor**
2. Run:
   ```sql
   SELECT * FROM profiles;
   ```
3. If it's empty, the `handle_new_user()` trigger isn't working
4. Run COMPLETE_SETUP.sql to recreate the trigger

### Problem 4: Search returns no results

**Cause:** Either no profiles exist, or the query is wrong

**Fix:**
1. First check profiles exist:
   ```sql
   SELECT COUNT(*) FROM profiles;
   ```
   Should be > 0

2. Check LOWER() function works (it should):
   ```sql
   SELECT LOWER(username) FROM profiles LIMIT 1;
   ```

3. Try a simple exact match first:
   ```sql
   SELECT * FROM profiles WHERE username = 'yourUsername' LIMIT 1;
   ```

4. Then try ilike search:
   ```sql
   SELECT * FROM profiles WHERE LOWER(username) ILIKE '%test%' LIMIT 5;
   ```

---

## 📊 VERIFICATION CHECKLIST

After running COMPLETE_SETUP.sql, verify:

```sql
-- Should return 8
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN 
('profiles', 'chats', 'messages', 'chat_participants', 
 'message_requests', 'chat_keys', 'connection_logs', 'user_roles');

-- Should return 8 with 'true'
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN 
('profiles', 'chats', 'messages', 'chat_participants', 
 'message_requests', 'chat_keys', 'connection_logs', 'user_roles');

-- Should return multiple policies for each table
SELECT tablename, COUNT(*) as policy_count FROM pg_policies 
WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;

-- Should return at least 1 profile (if you've signed up)
SELECT COUNT(*) FROM profiles;
```

---

## 🛠️ WHAT EACH FILE DOES

### `supabase/COMPLETE_SETUP.sql` (THE MAIN ONE)
- Creates all tables from scratch
- Sets up RLS correctly
- Creates triggers for auto profile creation
- Creates indexes for performance
- Sets correct permissions

**Run this if:**
- Profile not loading
- Search not working
- RLS errors

### `supabase/fix_rls.sql` (ALTERNATIVE)
- Only fixes RLS policies
- Doesn't recreate tables
- Use if tables exist but policies are wrong

### `supabase/migrations/` (ORIGINAL SCHEMA)
- These created the tables originally
- Might have triggers/functions missing

---

## 🔐 WHAT THE COMPLETE_SETUP.sql FIXES

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Profile won't load | No profile created on signup | `handle_new_user()` trigger |
| Search not working | RLS blocking queries | Correct `FOR SELECT` policies |
| Nil profile in sidebar | Profile not fetched | Trigger + RLS fix |
| "permission denied" error | Too strict RLS | Public SELECT policy for profiles |
| Chat creation fails | Wrong function | `create_chat_with_participants()` function |
| Messages won't show | RLS blocking chat_id check | Correct `is_chat_participant()` policy |

---

## 💡 KEY POINTS

1. **Profiles must be public readable** - Anyone should be able to search users
2. **But only through authenticated clients** - RLS still protects with `auth.uid()`
3. **Messages are private** - Only chat participants can read
4. **Triggers matter** - Profile auto-creation happens via trigger, not frontend
5. **Search uses LOWER()** - Case-insensitive matching requires function

---

## 🚀 NEXT STEPS AFTER FIX

1. Sign out and sign back in
2. Your profile should appear in sidebar
3. Go to Search page
4. Search for any user
5. Should see results

If it STILL doesn't work:
1. Check browser console for SQL errors
2. Verify your `.env` has correct keys
3. Check Supabase project is accessible
4. Try incognito/private window (clears cache)

---

## ⚡ COMMON MISTAKES

❌ Using `SELECT *` in search - wrong
✅ Using `SELECT id, username, display_name` - correct

❌ Not checking `auth.uid()` - security issue
✅ Checking `auth.uid()` in RLS - secure

❌ Making profiles private - breaks search
✅ Making profiles public read, users can only update own - correct

❌ Having multiple conflicting policies
✅ Having one policy per action (SELECT, INSERT, UPDATE) - clear

---

## 📞 IF STILL STUCK

Check:
1. ✅ Ran COMPLETE_SETUP.sql completely (all green)
2. ✅ No errors in browser console
3. ✅ Supabase auth is working (can sign up/sign in)
4. ✅ Tables exist (run SELECT COUNT(*) FROM profiles;)
5. ✅ RLS enabled (rowsecurity = true)
6. ✅ Policies exist (pg_policies has rows)

If all ✅, take a screenshot of the SQL error and the browser console error, and we can debug from there!
