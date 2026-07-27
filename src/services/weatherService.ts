export interface DayWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitationProb: number | null;
  windMax: number | null;
  uvIndexMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  description: string;
  icon: string;
}

// Mapeamento de WMO Weather interpretation codes
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Céu Limpo", icon: "☀️" },
  1: { description: "Predominantemente Limpo", icon: "🌤️" },
  2: { description: "Parcialmente Nublado", icon: "⛅" },
  3: { description: "Encoberto", icon: "☁️" },
  45: { description: "Nevoeiro", icon: "🌫️" },
  48: { description: "Nevoeiro com Geada", icon: "🌫️" },
  51: { description: "Garoa Leve", icon: "🌦️" },
  53: { description: "Garoa Moderada", icon: "🌦️" },
  55: { description: "Garoa Densa", icon: "🌧️" },
  61: { description: "Chuva Leve", icon: "🌧️" },
  63: { description: "Chuva Moderada", icon: "🌧️" },
  65: { description: "Chuva Forte", icon: "🌧️" },
  71: { description: "Neve Leve", icon: "🌨️" },
  73: { description: "Neve Moderada", icon: "🌨️" },
  75: { description: "Neve Forte", icon: "🌨️" },
  80: { description: "Pancadas de Chuva Leves", icon: "🌦️" },
  81: { description: "Pancadas de Chuva Moderadas", icon: "🌧️" },
  82: { description: "Pancadas de Chuva Violentas", icon: "⛈️" },
  95: { description: "Trovoada", icon: "🌩️" },
  96: { description: "Trovoada com Granizo Leve", icon: "⛈️" },
  99: { description: "Trovoada com Granizo Forte", icon: "⛈️" },
};

/**
 * Previsão gratuita do Open-Meteo para até 16 dias.
 * Não exige chave de API e retorna somente dados necessários para planejamento da viagem.
 */
export async function fetchWeatherForecast(
  lat: number,
  lon: number
): Promise<Record<string, DayWeather>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: [
        "weathercode",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "uv_index_max",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: "auto",
      forecast_days: "16",
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

    if (!response.ok) return {};

    const data = await response.json();
    if (!data?.daily?.time) return {};

    const weatherByDate: Record<string, DayWeather> = {};

    data.daily.time.forEach((dateStr: string, index: number) => {
      const code = data.daily.weathercode?.[index] ?? data.daily.weather_code?.[index] ?? 0;
      const info = WEATHER_CODES[code] || { description: "Variável", icon: "🌡️" };

      weatherByDate[dateStr] = {
        date: dateStr,
        maxTemp: Math.round(data.daily.temperature_2m_max?.[index] ?? 0),
        minTemp: Math.round(data.daily.temperature_2m_min?.[index] ?? 0),
        weatherCode: code,
        precipitationProb: data.daily.precipitation_probability_max?.[index] ?? null,
        windMax: data.daily.wind_speed_10m_max?.[index] ?? null,
        uvIndexMax: data.daily.uv_index_max?.[index] ?? null,
        sunrise: data.daily.sunrise?.[index] ?? null,
        sunset: data.daily.sunset?.[index] ?? null,
        description: info.description,
        icon: info.icon,
      };
    });

    return weatherByDate;
  } catch (error) {
    console.error("Erro ao buscar previsão do tempo:", error);
    return {};
  }
}
