// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to verify JWT token
async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log("Token verification failed", error);
      return null;
    }

    return { id: user.id, email: user.email || "" };
  } catch (error) {
    console.error("Error verifying token", error);
    return null;
  }
}

// Helper to call backend API
async function callBackendAPI(
  endpoint: string,
  method: string = "GET",
  body?: any,
  token?: string
): Promise<any> {
  const backendUrl = Deno.env.get("BACKEND_API_URL") || "http://localhost:3000";
  const url = `${backendUrl}/api${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/functions/v1/key-exchange")[1] || "";

    // GET /functions/v1/key-exchange/public-key - Get server's public key (no auth)
    if (path === "/public-key" && req.method === "GET") {
      const data = await callBackendAPI("/key-exchange/public-key", "GET");
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /functions/v1/key-exchange/register-key - Register encrypted key (auth required)
    if (path === "/register-key" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing authorization" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.slice(7);
      const user = await verifyToken(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const data = await callBackendAPI("/key-exchange/register-key", "POST", body, token);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /functions/v1/key-exchange/sync-key - Retrieve encrypted key (auth required)
    if (path === "/sync-key" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing authorization" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.slice(7);
      const user = await verifyToken(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const data = await callBackendAPI("/key-exchange/sync-key", "POST", body, token);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
