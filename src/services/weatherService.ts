export interface DayWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitationProb: number | null;
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

export async function fetchWeatherForecast(
  lat: number,
  lon: number
): Promise<Record<string, DayWeather>> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );

    if (!response.ok) return {};

    const data = await response.json();
    if (!data?.daily?.time) return {};

    const weatherByDate: Record<string, DayWeather> = {};

    data.daily.time.forEach((dateStr: string, index: number) => {
      const code = data.daily.weathercode?.[index] ?? 0;
      const info = WEATHER_CODES[code] || { description: "Variável", icon: "🌡️" };

      weatherByDate[dateStr] = {
        date: dateStr,
        maxTemp: Math.round(data.daily.temperature_2m_max?.[index] ?? 0),
        minTemp: Math.round(data.daily.temperature_2m_min?.[index] ?? 0),
        weatherCode: code,
        precipitationProb: data.daily.precipitation_probability_max?.[index] ?? null,
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
