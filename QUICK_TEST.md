# Quick Testing Checklist

## Before Testing
- [ ] Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- [ ] Open DevTools Console: `F12`
- [ ] Keep two browser windows/tabs open (one for each account)

## Test 1: Key Sharing ✅

### Step 1: Account 1 Opens Chat
1. Log in as Account 1
2. Find/create chat with Account 2
3. Open the chat
4. **Check Console for:**
   ```
   [crypto] Generated new symmetric key
   [crypto] ✅ Stored new shared key in database
   ```

### Step 2: Account 2 Opens Same Chat
1. Log in as Account 2 (in different window/tab)
2. Open same chat with Account 1
3. **Check Console for:**
   ```
   [crypto] ✅ Successfully using shared key from other user
   ```
4. **Verify:** Key in sessionStorage should be same Base64 string as Account 1
   - Open DevTools → Application → Session Storage
   - Search for `orbit_key_` 
   - Both should have identical value

**✅ PASS:** Both accounts show same key
**❌ FAIL:** Different keys or "gibberish" when account 2 receives messages

---

## Test 2: Message Encryption ✅

### Step 1: Send Message from Account 1
1. In Account 1's chat, type: "Testing encryption! 🔐"
2. Send the message
3. **Verify:**
   - ✅ Message appears immediately (not encrypted in UI)
   - ✅ Shows with blue bubble on right side
   - ✅ Smooth animation (slides up)

### Step 2: Check Account 2
1. Switch to Account 2 window/tab
2. **Verify:**
   - ✅ Message appears with animation
   - ✅ Text reads: "Testing encryption! 🔐" (NOT gibberish)
   - ✅ Shows with gray bubble on left side
   - ✅ No loading spinner appeared
   - ✅ Smooth slide-up animation

**✅ PASS:** Message is decrypted and readable
**❌ FAIL:** Message shows garbled/encrypted text (key sharing failed)

---

## Test 3: Chat Smoothness ✅

### Step 1: Rapid Messages
1. Account 1: Send 5 messages rapidly
   - "Message 1"
   - "Message 2"
   - "Message 3"
   - "Message 4"
   - "Message 5"

2. **Verify in Account 2:**
   - ✅ All messages appear without loading indicators
   - ✅ Each message has smooth slide-up animation
   - ✅ Chat scrolls down automatically
   - ✅ No UI flicker or jumping

### Step 2: Tab Switching
1. Send a message from Account 1
2. In Account 2: Switch to another tab
3. Wait 3 seconds
4. Switch back to chat tab
5. **Verify:**
   - ✅ Messages still there (not reloaded)
   - ✅ No loading spinner appeared
   - ✅ Chat content intact

**✅ PASS:** Smooth experience without loading states
**❌ FAIL:** Loading indicators, flicker, or lag

---

## Test 4: Back & Forth Messages ✅

1. Account 1 → Send: "Hi there! 👋"
2. Account 2 → Send: "Hey! How are you?"
3. Account 1 → Send: "All good! 😊"
4. Account 2 → Send: "Great to hear!"

**Verify:**
- ✅ All messages readable (properly encrypted/decrypted)
- ✅ Messages appear on correct side (sent right, received left)
- ✅ Smooth animations throughout
- ✅ No errors in console
- ✅ Scroll follows conversations

---

## Console Checks

### Good Signs 🟢
```
✅ [crypto] Found existing key in database
✅ [crypto] Successfully using shared key from other user
✅ [crypto] Stored new shared key in database
📌 New message received via realtime
✅ ALL STEPS COMPLETED SUCCESSFULLY
```

### Bad Signs 🔴
```
❌ STEP 3 FAILED: {code: 'PGRST116'...}
Failed to load chat
Decryption failed
Error fetching chat data
```

---

## Common Issues & Fixes

### Issue: Still Shows Gibberish
**Fix:** 
1. Hard refresh: `Ctrl+Shift+R`
2. Clear sessionStorage: DevTools → Application → Clear Storage
3. Close and reopen chat

### Issue: No Animation
**Fix:**
1. Check if `animate-slide-up` class is applied
2. Verify `src/App.css` has animation definitions
3. Check browser DevTools → Elements → see animation applied

### Issue: Loading Spinner Appears on New Messages
**Fix:**
1. Verify `setKeyExchanging(false)` is called after key exchange
2. Check no `setLoading(true)` on message receive
3. Message addition shouldn't trigger loading state

### Issue: Messages Not Appearing at All
**Check:**
1. Console for RLS errors (403 Forbidden)
2. Chat participants in database (both users should be there)
3. Message inserted but can't read back? → RLS policy issue
4. Check: `CREATE POLICY "Users can read messages"...`

---

## Success Criteria ✅

All of these must pass:
- [ ] Both users have same symmetric key
- [ ] Messages are readable (not gibberish)
- [ ] No loading spinners when messages arrive
- [ ] Smooth animations on message bubbles
- [ ] Tab switching doesn't cause re-renders
- [ ] Console shows no errors
- [ ] Chat scrolls automatically
- [ ] Encryption/decryption works both ways

**🎉 If all pass: You're done!**
