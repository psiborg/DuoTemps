/**
=====================================================================
Configuration

To use this file:
1. Get a free API key from https://openweathermap.org/api
2. Users will be prompted to enter their API key on first use
3. The API key will be stored in browser localStorage
4. For GitHub Pages with Actions secrets: use ?user=username URL parameter

=====================================================================
*/

const WEATHER_API_KEY = 'your_actual_api_key_here';

// Auto-update weather data on page load
const AUTO_UPDATE = false;

// Auto-hide delays in seconds (set to 0 to disable auto-hide)
const AUTO_HIDE_SUCCESS_SECS = 0;
const AUTO_HIDE_INFO_SECS = 0;

// Default location
const LOCATION = "Toronto, CA";

// Default environmental values
const WIND_SPEED_KPH = 10;
const HUMIDITY_PCT = 50;

// Thermometer orientation: 'vertical' or 'horizontal'
const THERMOMETER_ORIENTATION = 'vertical';
