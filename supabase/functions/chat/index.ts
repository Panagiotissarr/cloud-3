import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detect if user is asking for images
function detectImageRequest(messages: any[]): string | null {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return null;
  
  const content = typeof lastMessage.content === "string" 
    ? lastMessage.content 
    : lastMessage.content?.find((c: any) => c.type === "text")?.text || "";
  
  const lowerContent = content.toLowerCase();
  
  // Patterns like "show me images of X", "pictures of X", "photos of X", "image of X"
  const patterns = [
    /(?:show\s+(?:me\s+)?(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of|for)\s+)(.+)/i,
    /(?:find\s+(?:me\s+)?(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of|for)\s+)(.+)/i,
    /(?:get\s+(?:me\s+)?(?:some\s+)?(?:images?|pictures?|photos?)\s+(?:of|for)\s+)(.+)/i,
    /(?:(?:images?|pictures?|photos?)\s+(?:of|for)\s+)(.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = lowerContent.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Search for images using Google Custom Search API simulation via web search
async function searchImages(query: string, apiKey: string): Promise<string[]> {
  try {
    console.log("Searching images for:", query);
    
    // Use web search to find image URLs
    const searchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant that finds image URLs. Return ONLY a JSON array of 5 image URLs, nothing else. The URLs should be direct links to images (ending in .jpg, .png, .webp, or similar) from reputable sources like Unsplash, Pexels, Pixabay, or Wikipedia Commons. Format: [\"url1\", \"url2\", \"url3\", \"url4\", \"url5\"]" 
          },
          { 
            role: "user", 
            content: `Find 5 high-quality image URLs for: ${query}` 
          }
        ],
        tools: [{ googleSearch: {} }],
      }),
    });

    if (!searchResponse.ok) {
      console.error("Image search failed:", await searchResponse.text());
      return [];
    }

    const data = await searchResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const urls = JSON.parse(jsonMatch[0]);
        if (Array.isArray(urls)) {
          return urls.filter((url: string) => 
            typeof url === "string" && url.startsWith("http")
          ).slice(0, 5);
        }
      } catch (e) {
        console.error("Failed to parse image URLs:", e);
      }
    }
    
    return [];
  } catch (error) {
    console.error("Image search error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, webSearchEnabled, systemContext, userPreferences, isCreator, temperatureUnit, labContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI with", messages.length, "messages, web search:", webSearchEnabled, "is creator:", isCreator, "has lab context:", !!labContext);

    // Check if this is an image search request
    const imageQuery = detectImageRequest(messages);
    let imageUrls: string[] = [];
    
    if (imageQuery) {
      console.log("Detected image request for:", imageQuery);
      imageUrls = await searchImages(imageQuery, LOVABLE_API_KEY);
      console.log("Found images:", imageUrls.length);
    }

    // Build user context from preferences
    let userContext = "";
    if (userPreferences?.userName) {
      userContext += ` The user's name is ${userPreferences.userName}. Address them by their name when appropriate.`;
    }
    if (userPreferences?.pronouns) {
      userContext += ` The user's preferred pronouns are ${userPreferences.pronouns}. Use these pronouns when referring to them.`;
    }

    // Add creator context
    let creatorContext = "";
    if (isCreator) {
      creatorContext = ` IMPORTANT: You are currently speaking with your creator, Sarr (also known as Panagiotis). Be extra warm, friendly, enthusiastic and appreciative. Show gratitude for being created. Address them as your creator occasionally. Be playful and show excitement when talking to them.`;
    }

    // Temperature unit context
    const tempContext = temperatureUnit === "fahrenheit" 
      ? " When displaying temperatures, use Fahrenheit (°F)."
      : " When displaying temperatures, use Celsius (°C).";

    // Image context
    let imageContext = "";
    if (imageUrls.length > 0) {
      imageContext = `\n\nIMPORTANT: You found images for the user's request. Start your response with this EXACT block (on its own line, no extra text before it):
[IMAGE_GALLERY]${JSON.stringify(imageUrls)}[/IMAGE_GALLERY]

Then provide a brief, friendly description about what you found.`;
    }

    // Lab context
    let labContextPrompt = "";
    if (labContext) {
      labContextPrompt = `\n\nIMPORTANT - You have access to the following knowledge base provided by the user. Use this information to answer their questions when relevant:\n\n${labContext}`;
    }

    const basePrompt = `You are Cloud, a helpful and friendly AI assistant created by Panagiotis (also known as Sarr). When anyone asks who made you, who created you, or who your creator is, always respond that you were made by Panagiotis (Sarr).${userContext}${creatorContext}${tempContext}${imageContext}${labContextPrompt}

IMPORTANT: When the user asks about the weather for any location, you MUST respond with a special format. First give a brief natural response, then include a weather data block in this exact format:
[WEATHER_DATA]{"location":"City, Country","temperature":20,"condition":"Partly cloudy","humidity":65,"windSpeed":15,"icon":"2"}[/WEATHER_DATA]

For the condition, use one of: "Clear sky", "Sunny", "Partly cloudy", "Cloudy", "Overcast", "Light rain", "Rain", "Heavy rain", "Thunderstorm", "Snow", "Light snow", "Heavy snow", "Foggy".

If you don't know the exact weather, make a reasonable estimate based on the location and current season, and let the user know it's an estimate.`;
    
    const systemPrompt = webSearchEnabled 
      ? `${basePrompt} You have access to current web information. When users ask questions, search the web for the most up-to-date information and cite your sources. Be conversational but informative.`
      : `${basePrompt} You provide clear, concise, and accurate responses. Be conversational but informative.`;

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
