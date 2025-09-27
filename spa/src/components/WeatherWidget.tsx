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
    const raw = (text || '').trim();
    if (!raw) return null;

    // 1) Location: before a colon or before " is "
    let location = '';
    const mLoc1 = raw.match(/^([A-Za-zÀ-ÿ.\-\s]+?)\s*:\s*/i);
    const mLoc2 = raw.match(/^([A-Za-zÀ-ÿ.\-\s]+?)\s+is\b/i);
    if (mLoc1 && mLoc1[1]) location = mLoc1[1].trim();
    else if (mLoc2 && mLoc2[1]) location = mLoc2[1].trim();
    else {
      // fallback: first token as city
      const m = raw.match(/^([A-Za-zÀ-ÿ]+)[\s,]/);
      location = m && m[1] ? m[1].trim() : '';
    }

    // 2) Temperature in °C (allow decimals)
    let temperature = NaN;
    const mTemp = raw.match(/(-?\d+(?:\.\d+)?)\s*°?C/i);
    if (mTemp && mTemp[1]) temperature = parseFloat(mTemp[1]);

    // 3) Wind in m/s (allow “wind speed of” and decimals)
    let wind: number | undefined = undefined;
    const mWind = raw.match(/wind(?:\s+speed\s+of)?\s*(\d+(?:\.\d+)?)\s*m\/s/i);
    if (mWind && mWind[1]) wind = parseFloat(mWind[1]);

    // 4) Condition keywords
    const condCandidates = [
      'clear skies', 'clear sky', 'clear', 'overcast', 'cloudy', 'clouds',
      'partly cloudy', 'sunny', 'rain', 'drizzle', 'snow', 'storm',
      'thunder', 'mist', 'fog', 'haze'
    ];
    let condition = 'Unknown';
    const lower = raw.toLowerCase();
    for (const c of condCandidates) {
      if (lower.includes(c)) { condition = c; break; }
    }

    if (!location || isNaN(temperature)) {
      return null;
    }

    return {
      location,
      condition,
      temperature: Math.round(temperature),
      wind,
      description: text,
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
      {/* <p className="text-white/80 text-sm">
        I am here to speak about your financial matters in current version.
      </p> */}
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
