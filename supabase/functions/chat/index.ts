import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, webSearchEnabled } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI with", messages.length, "messages, web search:", webSearchEnabled);

    const basePrompt = "You are Cloud, a helpful and friendly AI assistant created by Panagiotis. When anyone asks who made you, who created you, or who your creator is, always respond that you were made by Panagiotis.";
    
    // Check if this is an image search request
    const lastMessage = messages[messages.length - 1];
    const lastMessageText = typeof lastMessage?.content === 'string' 
      ? lastMessage.content 
      : lastMessage?.content?.find((c: any) => c.type === 'text')?.text || '';
    
    const imageSearchPatterns = [
      /show\s+(?:me\s+)?(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
      /(?:find|search|get|look\s+for)\s+(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
      /(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
      /what\s+does?\s+(?:a\s+)?(.+?)\s+look\s+like/i,
    ];
    
    let imageSearchQuery = null;
    for (const pattern of imageSearchPatterns) {
      const match = lastMessageText.match(pattern);
      if (match) {
        imageSearchQuery = match[1]?.trim();
        break;
      }
    }
    
    const systemPrompt = webSearchEnabled 
      ? `${basePrompt} You have access to current web information. When users ask questions, search the web for the most up-to-date information and cite your sources. Be conversational but informative. If the user asks to see images/pictures/photos of something, respond naturally about what you're showing them.`
      : `${basePrompt} You provide clear, concise, and accurate responses. Be conversational but informative.`;
    
    // If image search detected and web search enabled, fetch images
    let imageResults = null;
    if (webSearchEnabled && imageSearchQuery) {
      console.log("Detected image search request for:", imageSearchQuery);
      try {
        const imageResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageSearchQuery)}&per_page=6`,
          {
            headers: {
              Authorization: "Client-ID AqB6qvvQlXyT-m9-h0HN9pDkWwqSM3c4RnZkVGmUlUU",
            },
          }
        );
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageResults = imageData.results.map((img: any) => ({
            id: img.id,
            url: img.urls.regular,
            thumbnail: img.urls.small,
            alt: img.alt_description || imageSearchQuery,
            photographer: img.user.name,
          }));
          console.log(`Found ${imageResults.length} images`);
        }
      } catch (e) {
        console.error("Image search failed:", e);
      }
    }

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    // Add web search grounding if enabled (native Gemini grounding)
    if (webSearchEnabled) {
      requestBody.tools = [
        {
          googleSearch: {}
        }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully received response from AI gateway");

    // If we have image results, we need to inject them into the stream
    if (imageResults && imageResults.length > 0) {
      const encoder = new TextEncoder();
      const reader = response.body!.getReader();
      
      const stream = new ReadableStream({
        async start(controller) {
          // First, send the image results as a special event
          const imageEvent = `data: ${JSON.stringify({
            type: "images",
            images: imageResults,
          })}\n\n`;
          controller.enqueue(encoder.encode(imageEvent));
          
          // Then pipe through the rest of the AI response
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
