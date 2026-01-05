import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Thermometer } from "lucide-react";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface WeatherCardProps {
  weather: WeatherData;
  unit: "celsius" | "fahrenheit";
}

const getWeatherIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes("thunder") || conditionLower.includes("lightning")) {
    return <CloudLightning className="h-12 w-12" />;
  }
  if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
    return <CloudRain className="h-12 w-12" />;
  }
  if (conditionLower.includes("snow") || conditionLower.includes("sleet")) {
    return <CloudSnow className="h-12 w-12" />;
  }
  if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) {
    return <Cloud className="h-12 w-12" />;
  }
  if (conditionLower.includes("clear") || conditionLower.includes("sunny")) {
    return <Sun className="h-12 w-12" />;
  }
  return <Cloud className="h-12 w-12" />;
};

const getWeatherBackground = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes("thunder") || conditionLower.includes("lightning")) {
    return "bg-gradient-to-br from-slate-700 via-purple-900 to-slate-800";
  }
  if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
    return "bg-gradient-to-br from-slate-500 via-blue-600 to-slate-700";
  }
  if (conditionLower.includes("snow") || conditionLower.includes("sleet")) {
    return "bg-gradient-to-br from-blue-100 via-slate-200 to-blue-200";
  }
  if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) {
    return "bg-gradient-to-br from-slate-400 via-gray-500 to-slate-600";
  }
  if (conditionLower.includes("clear") || conditionLower.includes("sunny")) {
    return "bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-400";
  }
  return "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600";
};

const getTextColor = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes("snow") || conditionLower.includes("sleet")) {
    return "text-slate-800";
  }
  return "text-white";
};

export function WeatherCard({ weather, unit }: WeatherCardProps) {
  const background = getWeatherBackground(weather.condition);
  const textColor = getTextColor(weather.condition);
  const icon = getWeatherIcon(weather.condition);
  
  const displayTemp = unit === "fahrenheit" 
    ? Math.round((weather.temperature * 9/5) + 32)
    : Math.round(weather.temperature);
  
  const tempUnit = unit === "fahrenheit" ? "°F" : "°C";

  return (
    <div className={`rounded-2xl p-6 shadow-lg ${background} ${textColor} min-w-[280px] max-w-sm`}>
      {/* Location */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold opacity-90">{weather.location}</h3>
        <p className="text-sm opacity-75 capitalize">{weather.condition}</p>
      </div>

      {/* Main temp and icon */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline">
          <span className="text-6xl font-light">{displayTemp}</span>
          <span className="text-2xl ml-1">{tempUnit}</span>
        </div>
        <div className="opacity-90">
          {icon}
        </div>
      </div>

      {/* Details */}
      <div className="flex gap-6 pt-4 border-t border-white/20">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 opacity-75" />
          <span className="text-sm">{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 opacity-75" />
          <span className="text-sm">{Math.round(weather.windSpeed)} km/h</span>
        </div>
      </div>
    </div>
  );
}

// Parse weather data from AI response
export function parseWeatherFromText(text: string): WeatherData | null {
  // Look for weather data markers in the response
  const weatherMatch = text.match(/\[WEATHER_DATA\]([\s\S]*?)\[\/WEATHER_DATA\]/);
  if (!weatherMatch) return null;
  
  try {
    return JSON.parse(weatherMatch[1]);
  } catch {
    return null;
  }
}
