// 天气代码转图标
function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "☁️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌈";
}

// 获取IP定位
fetch("https://xmstc.com:8443/api/ipinfo")
  .then(res => res.json())
  .then(loc => {
    const city = loc.city;
    const lat = loc.latitude;
    const lon = loc.longitude;

    // 获取天气
    return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
      .then(res => res.json())
      .then(weather => {
        const temp = weather.current_weather.temperature;
        const code = weather.current_weather.weathercode;
        const icon = getWeatherIcon(code);

        document.getElementById("weatherBox").innerHTML =
          `<span class="weather-icon">${icon}</span> ${city} ${temp}°C`;
      });
  })
  .catch(err => {
    document.getElementById("weatherBox").innerText = "天气获取失败";
    console.error(err);
  });