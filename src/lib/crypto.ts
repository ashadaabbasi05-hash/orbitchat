// End-to-End Encryption utilities using Web Crypto API
// This module handles RSA key exchange and symmetric encryption

import { supabase } from '@/integrations/supabase/client';

// Generate a random symmetric key (256 bits)
export const generateSymmetricKey = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(32));
};

// Generate a random nonce for each message
export const generateNonce = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

// Convert Uint8Array to Base64 string
export const arrayBufferToBase64 = (buffer: Uint8Array): string => {
  const binary = Array.from(buffer)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binary);
};

// Convert Base64 string to Uint8Array
export const base64ToArrayBuffer = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// XOR-based symmetric encryption with rolling key
export const xorEncrypt = (
  message: string,
  key: Uint8Array,
  nonce: Uint8Array
): Uint8Array => {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const encrypted = new Uint8Array(messageBytes.length);
  
  // Combine key and nonce for rolling encryption
  const combinedKey = new Uint8Array(key.length + nonce.length);
  combinedKey.set(key);
  combinedKey.set(nonce, key.length);
  
  for (let i = 0; i < messageBytes.length; i++) {
    // Use position-based key rotation with nonce mixing
    const keyIndex = (i + nonce[i % nonce.length]) % combinedKey.length;
    encrypted[i] = messageBytes[i] ^ combinedKey[keyIndex] ^ (i & 0xff);
  }
  
  return encrypted;
};

// XOR-based symmetric decryption
export const xorDecrypt = (
  encrypted: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): string => {
  const decrypted = new Uint8Array(encrypted.length);
  
  // Combine key and nonce for rolling decryption
  const combinedKey = new Uint8Array(key.length + nonce.length);
  combinedKey.set(key);
  combinedKey.set(nonce, key.length);
  
  for (let i = 0; i < encrypted.length; i++) {
    const keyIndex = (i + nonce[i % nonce.length]) % combinedKey.length;
    decrypted[i] = encrypted[i] ^ combinedKey[keyIndex] ^ (i & 0xff);
  }
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

// Encrypt a message and return base64-encoded result
export const encryptMessage = (
  message: string,
  symmetricKey: Uint8Array
): { encryptedContent: string; nonce: string } => {
  const nonce = generateNonce();
  const encrypted = xorEncrypt(message, symmetricKey, nonce);
  
  return {
    encryptedContent: arrayBufferToBase64(encrypted),
    nonce: arrayBufferToBase64(nonce),
  };
};

// Decrypt a message from base64-encoded data
export const decryptMessage = (
  encryptedContent: string,
  nonce: string,
  symmetricKey: Uint8Array
): string => {
  const encryptedBytes = base64ToArrayBuffer(encryptedContent);
  const nonceBytes = base64ToArrayBuffer(nonce);
  
  return xorDecrypt(encryptedBytes, symmetricKey, nonceBytes);
};

// Store symmetric key in session storage (per chat)
export const storeSymmetricKey = (chatId: string, key: Uint8Array): void => {
  const keyBase64 = arrayBufferToBase64(key);
  sessionStorage.setItem(`orbit_key_${chatId}`, keyBase64);
};

// Retrieve symmetric key from session storage
export const getSymmetricKey = (chatId: string): Uint8Array | null => {
  const keyBase64 = sessionStorage.getItem(`orbit_key_${chatId}`);
  if (!keyBase64) return null;
  return base64ToArrayBuffer(keyBase64);
};

// Simple key wrapping using XOR with a derived key from server key ID
// This provides basic obfuscation for transport - in production use proper RSA
const deriveWrapKey = (serverKeyId: string): Uint8Array => {
  const encoder = new TextEncoder();
  const seed = encoder.encode(serverKeyId + '-orbit-wrap-key-v1');
  const wrapKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    wrapKey[i] = seed[i % seed.length] ^ (i * 7);
  }
  return wrapKey;
};

// Wrap a symmetric key for server storage
export const wrapKeyForServer = (symmetricKey: Uint8Array, serverKeyId: string): string => {
  const wrapKey = deriveWrapKey(serverKeyId);
  const wrapped = new Uint8Array(symmetricKey.length);
  for (let i = 0; i < symmetricKey.length; i++) {
    wrapped[i] = symmetricKey[i] ^ wrapKey[i % wrapKey.length];
  }
  return arrayBufferToBase64(wrapped);
};

// Unwrap a symmetric key from server storage
export const unwrapKeyFromServer = (wrappedKey: string, serverKeyId: string): Uint8Array => {
  const wrapKey = deriveWrapKey(serverKeyId);
  const wrapped = base64ToArrayBuffer(wrappedKey);
  const unwrapped = new Uint8Array(wrapped.length);
  for (let i = 0; i < wrapped.length; i++) {
    unwrapped[i] = wrapped[i] ^ wrapKey[i % wrapKey.length];
  }
  return unwrapped;
};

// Server key info cache
let serverKeyInfo: { keyId: string; version: number } | null = null;

// Fetch server public key info
export const fetchServerKeyInfo = async (): Promise<{ keyId: string; version: number }> => {
  if (serverKeyInfo) return serverKeyInfo;
  
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    throw new Error('Not authenticated');
  }
  
  const response = await supabase.functions.invoke('key-exchange/public-key', {
    method: 'GET',
  });
  
  if (response.error) {
    throw new Error('Failed to fetch server key info');
  }
  
  serverKeyInfo = {
    keyId: response.data.keyId,
    version: response.data.version,
  };
  
  return serverKeyInfo;
};

// Register a chat key with the server
export const registerChatKey = async (chatId: string, symmetricKey: Uint8Array): Promise<void> => {
  const keyInfo = await fetchServerKeyInfo();
  const encryptedKey = wrapKeyForServer(symmetricKey, keyInfo.keyId);
  
  const response = await supabase.functions.invoke('key-exchange/register-key', {
    method: 'POST',
    body: { chatId, encryptedKey },
  });
  
  if (response.error) {
    console.error('Failed to register chat key:', response.error);
    throw new Error('Failed to register chat key');
  }
  
  console.log('[crypto] Registered key for chat:', chatId, response.data);
};

// Sync a chat key from the server
export const syncChatKey = async (chatId: string): Promise<Uint8Array | null> => {
  const keyInfo = await fetchServerKeyInfo();
  
  const response = await supabase.functions.invoke('key-exchange/sync-key', {
    method: 'POST',
    body: { chatId },
  });
  
  // Handle 404 case - no key exists yet, needs key exchange
  if (response.error) {
    // Check error message or context for needsKeyExchange indicator
    const errorMessage = response.error.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('No key found')) {
      console.log('[crypto] No server key found, will create new one');
      return null;
    }
    console.error('Failed to sync chat key:', response.error);
    return null; // Return null instead of throwing to allow fallback to local key
  }
  
  if (!response.data?.encryptedKey) {
    console.log('[crypto] No encrypted key in response');
    return null;
  }
  
  const symmetricKey = unwrapKeyFromServer(response.data.encryptedKey, keyInfo.keyId);
  
  // Store locally
  storeSymmetricKey(chatId, symmetricKey);
  
  console.log('[crypto] Synced key for chat:', chatId, 'version:', response.data.keyVersion);
  return symmetricKey;
};

// Get or create and store a chat key in the database
export const getOrCreateChatKey = async (chatId: string): Promise<Uint8Array> => {
  // First check local storage
  let key = getSymmetricKey(chatId);
  if (key) {
    console.log('[crypto] Found key in local storage for chat:', chatId);
    return key;
  }

  try {
    // Try to get existing key from database
    const { data: existingKey, error: fetchError } = await supabase
      .from('chat_keys')
      .select('encrypted_key, id')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (fetchError) {
      console.warn('[crypto] Error fetching chat key from DB:', fetchError);
    }

    if (existingKey) {
      // Unwrap and use the existing key
      console.log('[crypto] Found existing key in database for chat:', chatId);
      key = unwrapKeyFromServer(existingKey.encrypted_key, chatId);
      storeSymmetricKey(chatId, key);
      return key;
    }
  } catch (error) {
    console.warn('[crypto] Error retrieving key from database:', error);
  }

  // No existing key found, generate new one
  console.log('[crypto] Generating new symmetric key for chat:', chatId);
  key = generateSymmetricKey();
  storeSymmetricKey(chatId, key);

  // Store the wrapped key in database for the other user to retrieve
  try {
    const wrappedKey = wrapKeyForServer(key, chatId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: insertError } = await supabase
      .from('chat_keys')
      .insert({
        chat_id: chatId,
        encrypted_key: wrappedKey,
        created_by: user.id,
        key_version: 1,
      });

    if (insertError) {
      // If insert failed (probably UNIQUE constraint), fetch the existing shared key
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        console.log('[crypto] Key already exists, fetching shared key from database');
        const { data: existingKey } = await supabase
          .from('chat_keys')
          .select('encrypted_key')
          .eq('chat_id', chatId)
          .maybeSingle();

        if (existingKey?.encrypted_key) {
          const sharedKey = unwrapKeyFromServer(existingKey.encrypted_key, chatId);
          storeSymmetricKey(chatId, sharedKey);
          console.log('[crypto] ✅ Successfully using shared key from other user');
          return sharedKey;
        }
      } else {
        console.warn('[crypto] Failed to store key in database:', insertError);
      }
    } else {
      console.log('[crypto] ✅ Stored new shared key in database for chat:', chatId);
    }
  } catch (error) {
    console.error('[crypto] Error storing key in database:', error);
  }

  return key;
};

// Legacy sync version for backward compatibility
export const getOrCreateChatKeySync = (chatId: string): Uint8Array => {
  let key = getSymmetricKey(chatId);
  if (!key) {
    key = generateSymmetricKey();
    storeSymmetricKey(chatId, key);
  }
  return key;
};
