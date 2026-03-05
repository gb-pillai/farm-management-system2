const axios = require("axios");

const API_KEY = process.env.WEATHER_API_KEY;

async function getForecast(city) {
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city},IN&units=metric&appid=${API_KEY}`
  );

  return response.data.list;
}

function isWeatherSuitable(forecastItem) {
  const rain = forecastItem.rain?.["3h"] || 0;
  const wind = forecastItem.wind.speed * 3.6; // m/s → km/h
  const temp = forecastItem.main.temp;

  if (rain > 20) return { ok: false, reason: "Heavy rain expected" };
  if (wind > 20) return { ok: false, reason: "High wind speed" };
  if (temp > 35) return { ok: false, reason: "High temperature" };

  return { ok: true, reason: "Weather suitable" };
}
function getForecastForDate(forecastList, targetDate) {

  for (let item of forecastList) {

    if (item.dt_txt.startsWith(targetDate)) {
      return item;
    }

  }

  return null;
}

module.exports = {
  getForecast,
  isWeatherSuitable,
  getForecastForDate
};