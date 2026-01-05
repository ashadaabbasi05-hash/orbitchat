import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple RSA-like key derivation using Web Crypto for key wrapping
// For production, use proper RSA or ECDH key exchange

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Route handling
    if (req.method === 'GET' && path === 'public-key') {
      // Return a server identifier for key derivation
      // In a real implementation, this would be an RSA public key
      const serverKeyId = 'orbit-server-v1';
      
      console.log(`[key-exchange] User ${user.id} requested public key`);
      
      return new Response(
        JSON.stringify({ 
          keyId: serverKeyId,
          algorithm: 'AES-GCM-256-WRAP',
          version: 1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && path === 'register-key') {
      const { chatId, encryptedKey } = await req.json();

      if (!chatId || !encryptedKey) {
        return new Response(
          JSON.stringify({ error: 'Missing chatId or encryptedKey' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is a participant in this chat
      const { data: isParticipant } = await supabaseClient
        .rpc('is_chat_participant', { _user_id: user.id, _chat_id: chatId });

      if (!isParticipant) {
        console.error(`[key-exchange] User ${user.id} is not a participant in chat ${chatId}`);
        return new Response(
          JSON.stringify({ error: 'Not a participant in this chat' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if key already exists for this chat
      const { data: existingKey } = await supabaseClient
        .from('chat_keys')
        .select('id, key_version')
        .eq('chat_id', chatId)
        .single();

      if (existingKey) {
        // Update existing key with incremented version
        const { error: updateError } = await supabaseClient
          .from('chat_keys')
          .update({
            encrypted_key: encryptedKey,
            key_version: existingKey.key_version + 1,
          })
          .eq('id', existingKey.id);

        if (updateError) {
          console.error('[key-exchange] Error updating key:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[key-exchange] Updated key for chat ${chatId}, version ${existingKey.key_version + 1}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            keyVersion: existingKey.key_version + 1,
            action: 'updated'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert new key
      const { error: insertError } = await supabaseClient
        .from('chat_keys')
        .insert({
          chat_id: chatId,
          encrypted_key: encryptedKey,
          created_by: user.id,
        });

      if (insertError) {
        console.error('[key-exchange] Error inserting key:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to register key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the key exchange event
      await supabaseClient.from('connection_logs').insert({
        user_id: user.id,
        event_type: 'key_registered',
        metadata: { chat_id: chatId }
      });

      console.log(`[key-exchange] Registered new key for chat ${chatId}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          keyVersion: 1,
          action: 'created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && path === 'sync-key') {
      const { chatId } = await req.json();

      if (!chatId) {
        return new Response(
          JSON.stringify({ error: 'Missing chatId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is a participant in this chat
      const { data: isParticipant } = await supabaseClient
        .rpc('is_chat_participant', { _user_id: user.id, _chat_id: chatId });

      if (!isParticipant) {
        return new Response(
          JSON.stringify({ error: 'Not a participant in this chat' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the encrypted key for this chat
      const { data: chatKey, error: keyError } = await supabaseClient
        .from('chat_keys')
        .select('encrypted_key, key_version')
        .eq('chat_id', chatId)
        .single();

      if (keyError || !chatKey) {
        console.log(`[key-exchange] No key found for chat ${chatId}`);
        return new Response(
          JSON.stringify({ error: 'No key found for this chat', needsKeyExchange: true }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the key sync event
      await supabaseClient.from('connection_logs').insert({
        user_id: user.id,
        event_type: 'key_synced',
        metadata: { chat_id: chatId, key_version: chatKey.key_version }
      });

      console.log(`[key-exchange] Synced key for chat ${chatId}, version ${chatKey.key_version}`);
      
      return new Response(
        JSON.stringify({ 
          encryptedKey: chatKey.encrypted_key,
          keyVersion: chatKey.key_version
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[key-exchange] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
