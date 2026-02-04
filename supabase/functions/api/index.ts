import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface DataFeedItem {
  id?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key. Include x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and get user_id
    const { data: userId, error: keyError } = await supabase
      .rpc('get_user_id_from_api_key', { key: apiKey });

    if (keyError || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase.rpc('update_api_key_last_used', { key: apiKey });

    const url = new URL(req.url);
    const path = url.pathname.replace('/api', '');

    // Route handling
    switch (true) {
      // GET /data - List all data feed items
      case req.method === 'GET' && path === '/data': {
        const { data, error } = await supabase
          .from('api_data_feed')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /data - Add new data to feed
      case req.method === 'POST' && path === '/data': {
        const body: DataFeedItem = await req.json();
        
        if (!body.title || !body.content) {
          return new Response(
            JSON.stringify({ error: 'title and content are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('api_data_feed')
          .insert({
            user_id: userId,
            title: body.title,
            content: body.content,
            metadata: body.metadata || {},
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PUT /data/:id - Update data feed item
      case req.method === 'PUT' && path.startsWith('/data/'): {
        const id = path.replace('/data/', '');
        const body: Partial<DataFeedItem> = await req.json();

        const { data, error } = await supabase
          .from('api_data_feed')
          .update({
            ...(body.title && { title: body.title }),
            ...(body.content && { content: body.content }),
            ...(body.metadata && { metadata: body.metadata }),
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE /data/:id - Delete data feed item
      case req.method === 'DELETE' && path.startsWith('/data/'): {
        const id = path.replace('/data/', '');

        const { error } = await supabase
          .from('api_data_feed')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'Data deleted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /query - Query data (returns all data for AI context)
      case req.method === 'GET' && path === '/query': {
        const search = url.searchParams.get('q');
        
        let query = supabase
          .from('api_data_feed')
          .select('title, content, metadata, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (search) {
          query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Format for AI consumption
        const formattedData = data.map(item => 
          `## ${item.title}\n${item.content}${item.metadata ? `\nMetadata: ${JSON.stringify(item.metadata)}` : ''}`
        ).join('\n\n---\n\n');

        return new Response(
          JSON.stringify({ 
            success: true, 
            count: data.length,
            formatted: formattedData,
            raw: data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /info - Get API info and stats
      case req.method === 'GET' && path === '/info': {
        const { count } = await supabase
          .from('api_data_feed')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ 
            success: true,
            api_version: '1.0.0',
            data_items: count || 0,
            endpoints: [
              { method: 'GET', path: '/data', description: 'List all data items' },
              { method: 'POST', path: '/data', description: 'Add new data item' },
              { method: 'PUT', path: '/data/:id', description: 'Update data item' },
              { method: 'DELETE', path: '/data/:id', description: 'Delete data item' },
              { method: 'GET', path: '/query', description: 'Query data (use ?q=search)' },
              { method: 'GET', path: '/info', description: 'API info and stats' },
            ]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Not found',
            available_endpoints: ['/data', '/query', '/info']
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
