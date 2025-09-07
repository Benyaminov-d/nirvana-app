import React from 'react';

interface WeatherData {
  location: string;
  condition: string;
  temperature: number;
  wind?: number;
  humidity?: number;
  description?: string;
}

interface WeatherWidgetProps {
  text: string;
}

// Parse weather information from assistant response
function parseWeatherResponse(text: string): WeatherData | null {
  try {
    // Look for pattern like "Location: condition, temperature, wind"
    // Updated pattern to handle "Bogotá: overcast, 17°C, wind 12 m/s."
    const weatherPattern = /([A-Za-zÀ-ÿ\s]+):\s*([^,]+),\s*(-?\d+)°?C?\s*,?\s*(?:wind\s+(\d+)\s*m\/s)?/i;
    const match = text.match(weatherPattern);
    
    if (!match) {
      // Fallback: try simpler pattern for different formats
      const simplePattern = /(\w+).*?(-?\d+)°C.*?wind\s+(\d+)\s*m\/s/i;
      const simpleMatch = text.match(simplePattern);
      
      if (simpleMatch) {
        // Extract condition from original text
        const conditionMatch = text.match(/:\s*([^,]+),/i);
        return {
          location: simpleMatch[1].trim(),
          condition: conditionMatch ? conditionMatch[1].trim() : 'Unknown',
          temperature: parseInt(simpleMatch[2]),
          wind: parseInt(simpleMatch[3]),
          description: text
        };
      }
      
      return null;
    }
    
    return {
      location: match[1].trim(),
      condition: match[2].trim(),
      temperature: parseInt(match[3]),
      wind: match[4] ? parseInt(match[4]) : undefined,
      description: text
    };
  } catch (e) {
    return null;
  }
}

// Weather condition to icon mapping
function getWeatherIcon(condition: string): string {
  const cond = condition.toLowerCase();
  if (cond.includes('sunny') || cond.includes('clear')) return '☀️';
  if (cond.includes('cloudy') || cond.includes('overcast')) return '☁️';
  if (cond.includes('partly')) return '⛅';
  if (cond.includes('rain') || cond.includes('shower')) return '🌧️';
  if (cond.includes('snow')) return '❄️';
  if (cond.includes('storm') || cond.includes('thunder')) return '⛈️';
  if (cond.includes('fog') || cond.includes('mist')) return '🌫️';
  return '🌤️'; // default
}

export default function WeatherWidget({ text }: WeatherWidgetProps) {
  const weather = parseWeatherResponse(text);
  
  if (!weather) {
    // Not a weather response, return regular text
    return <span>{text}</span>;
  }

  return (
    <div className="space-y-3">
      <div className="weather-widget bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 rounded-xl p-3 max-w-lg">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Location */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getWeatherIcon(weather.condition)}</span>
            <div>
              <h3 className="text-white font-medium text-lg leading-tight">{weather.location}</h3>
              <p className="text-white/70 text-sm capitalize leading-tight">{weather.condition}</p>
            </div>
          </div>
          
          {/* Center: Temperature */}
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">{weather.temperature}</span>
            <span className="text-white/70 text-xl mb-1">°C</span>
          </div>
          
          {/* Right: Wind info */}
          <div className="text-right">
            {weather.wind && (
              <div className="flex items-center gap-1 text-sm text-white/80">
                <span>💨</span>
                <span>{weather.wind} m/s</span>
              </div>
            )}
            {weather.humidity && (
              <div className="flex items-center gap-1 text-sm text-white/80 mt-1">
                <span>💧</span>
                <span>{weather.humidity}%</span>
              </div>
            )}
            <p className="text-xs text-white/50 mt-1">Current</p>
          </div>
        </div>
      </div>
      
      {/* Financial focus reminder for off-topic weather queries */}
      <p className="text-white/80 text-sm">
        I am here to speak about your financial matters in current version.
      </p>
    </div>
  );
}

// Helper function to detect if message is weather-related
export function isWeatherResponse(text: string): boolean {
  const weatherKeywords = [
    'temperature', 'weather', 'overcast', 'sunny', 'cloudy', 'rain', 'wind',
    '°C', 'degrees', 'celsius', 'fahrenheit', 'm/s', 'humidity'
  ];
  
  const lowerText = text.toLowerCase();
  const hasWeatherKeyword = weatherKeywords.some(keyword => lowerText.includes(keyword));
  const hasFormatting = lowerText.includes(':') || lowerText.includes('°');
  
  return hasWeatherKeyword && hasFormatting;
}
