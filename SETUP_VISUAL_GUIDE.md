# 🖱️ STEP-BY-STEP: How to Run the SQL Setup

## ⏱️ This takes 2-3 minutes

---

## Step 1: Open Supabase Dashboard

Go to: **https://app.supabase.com**

You should see your project listed. Click on it.

---

## Step 2: Open SQL Editor

In the left sidebar, look for **"SQL Editor"** and click it.

```
Sidebar menu:
├── Project Settings
├── Database
├── Authentication  
├── Storage
├── Vectors
├── Realtime
├── SQL Editor  ← CLICK THIS
├── Logs
└── ...
```

---

## Step 3: Copy the SQL File

**Option A: Using VS Code/Editor**

1. Open: `supabase/COMPLETE_SETUP.sql` in your project
2. Select All: `Ctrl+A` (Windows) or `Cmd+A` (Mac)
3. Copy: `Ctrl+C` or `Cmd+C`

**Option B: Using GitHub Web**

If you have it on GitHub, click the file and then the Copy button

---

## Step 4: Paste into SQL Editor

1. In Supabase SQL Editor, you should see a text box
2. Click in the text box
3. Paste: `Ctrl+V` or `Cmd+V`

You should see the SQL appear:

```sql
-- ============================================================================
-- ORBIT CHAT - COMPLETE MISSING SETUP
-- ============================================================================
-- This file contains everything needed to set up Orbit Chat from scratch
...
(lots more SQL)
```

---

## Step 5: Execute the SQL

Look for the **Execute button** (usually a play button ▶ or a button that says "Run")

In Supabase, you can either:
- Click the Execute button in the top right
- Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows)

---

## Step 6: Wait for Completion

The SQL will start executing. You'll see a progress indicator.

Watch for the results at the bottom. You should see:

```
✅ Query 1 completed
✅ Query 2 completed
✅ Query 3 completed
...
(many more green checkmarks)
```

**All should be green ✅**

If you see any red ❌ text, it's an error. Note what it says.

---

## Step 7: Verify Success

After all queries complete, scroll to the bottom of the SQL editor.

You should see these verification queries return results:

```sql
-- Verify tables exist
SELECT COUNT(*) FROM information_schema.tables ...
-- Result: 8 (8 tables created)

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables ...
-- Result: Shows 8 tables with rowsecurity = true

-- Verify policies exist
SELECT COUNT(*) FROM pg_policies ...
-- Result: Should be > 0 (many policies created)

-- Show all policies by table
SELECT tablename, policyname FROM pg_policies ...
-- Result: Lists many policies
```

If you see these results, everything worked! ✅

---

## Step 8: Restart Your Frontend

Go to your terminal where `npm run dev` is running:

1. Stop it: Press `Ctrl+C`
2. Restart it: Type `npm run dev`
3. Wait for it to compile

---

## Step 9: Test in Browser

1. Open `http://localhost:5173` (your frontend)
2. Sign out if you're logged in
3. Sign back in
4. **Your profile should appear in the sidebar** ✅
5. Go to Search page
6. **Search should return results** ✅

If both work, you're done! 🎉

---

## 🚨 If You Get an Error

### Error: "Table already exists"

This means the tables were already created. You have two options:

**Option A: Use the simpler fix**

Instead of COMPLETE_SETUP.sql, use `supabase/fix_rls.sql`

It will just fix the RLS policies without recreating tables.

**Option B: Continue anyway**

The error message will say something like "relation 'profiles' already exists"

This is fine! The script will skip that create statement and continue.

Keep watching for more errors. If all errors are "already exists", it's fine.

### Error: "function already exists"

Same as above. This is fine. The script will skip and continue.

### Error: Something else

Look at the error message. Common ones:

- **"role does not exist"** - Make sure you're running as the right user
- **"permission denied"** - You might not have admin access
- **"syntax error"** - Could be a copy-paste issue, try copying the file again

If stuck, screenshot the error and check `SUPABASE_SETUP.md` under "Debugging Guide"

---

## ✅ Checklist

After running the SQL:

```
[ ] All SQL queries turned green (no errors)
[ ] Frontend restarted
[ ] Signed out and back in
[ ] Profile appears in sidebar
[ ] Search page shows users
[ ] Can create a chat
```

If all ✅, congratulations! Your Supabase is fixed. 🎉

---

## 📍 Where Each File Is

```
your-project/
├── supabase/
│   ├── COMPLETE_SETUP.sql  ← Run this in SQL Editor
│   ├── fix_rls.sql         ← Use this if tables already exist
│   ├── QUICK_FIX.md        ← Troubleshooting guide
│   ├── migrations/         ← Original migrations (don't modify)
│   └── functions/
├── SUPABASE_SETUP.md       ← Comprehensive guide
├── FIX_SUMMARY.md          ← This explains what was fixed
└── ...
```

---

## 🎯 TL;DR

1. Supabase Dashboard → SQL Editor
2. Copy `supabase/COMPLETE_SETUP.sql`
3. Paste into SQL Editor
4. Click Execute
5. Wait for all green ✅
6. Restart frontend
7. Test
8. Done! 🚀

---

## 🤔 Why Was This Needed?

Your Supabase had:
- ✅ Tables created
- ✅ Auth set up
- ❌ **Missing trigger to create profiles on signup**
- ❌ **Incorrect RLS policies**
- ❌ **Missing indexes**

This SQL file adds all three missing pieces.

Now when a user signs up:
1. Auth creates user
2. **Trigger automatically creates profile** ← This was missing!
3. Frontend can fetch profile
4. Everything works!

---

Need help? Check `SUPABASE_SETUP.md` 📖
