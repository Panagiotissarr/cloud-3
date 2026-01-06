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
    const { location } = await req.json();
    
    if (!location) {
      return new Response(JSON.stringify({ error: "Location is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("VISUAL_CROSSING_API_KEY");
    if (!apiKey) {
      console.error("VISUAL_CROSSING_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Weather service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching weather for location:", location);

    const weatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/today?unitGroup=metric&include=current&key=${apiKey}&contentType=json`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error("Visual Crossing API error:", errorText);
      return new Response(JSON.stringify({ error: "Location not found or API error" }), {
        status: weatherResponse.status === 400 ? 404 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weatherData = await weatherResponse.json();

    if (!weatherData.currentConditions) {
      return new Response(JSON.stringify({ error: "Failed to fetch weather data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const current = weatherData.currentConditions;
    const resolvedAddress = weatherData.resolvedAddress || location;

    const result = {
      location: resolvedAddress,
      temperature: current.temp,
      condition: current.conditions || "Unknown",
      humidity: current.humidity,
      windSpeed: current.windspeed,
      icon: current.icon || "cloudy",
    };

    console.log("Weather data:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weather function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
