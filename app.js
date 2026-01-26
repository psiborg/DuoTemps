// Temperature range constants for visualization
const MIN_TEMP_C = -50;
const MAX_TEMP_C = 60;
const TEMP_RANGE_C = MAX_TEMP_C - MIN_TEMP_C; // 110°C range

// DOM element references
const celsiusInput = document.getElementById('celsius');
const fahrenheitInput = document.getElementById('fahrenheit');
const windSpeedSlider = document.getElementById('wind-speed');
const humiditySlider = document.getElementById('humidity');
const windValueDisplay = document.getElementById('wind-value');
const humidityValueDisplay = document.getElementById('humidity-value');

const thermometerC = document.getElementById('thermometer-c');
const thermometerF = document.getElementById('thermometer-f');
const fillC = document.getElementById('fill-c');
const fillF = document.getElementById('fill-f');
const markerC = document.getElementById('marker-c');
const markerF = document.getElementById('marker-f');

const feelsLikeC = document.getElementById('feels-like-c');
const feelsLikeF = document.getElementById('feels-like-f');
const methodC = document.getElementById('method-c');
const methodF = document.getElementById('method-f');

// Position threshold lines on Celsius thermometer
// Wind Chill line at 10°C
const windChillLine = document.getElementById('wind-chill-line');
const windChillPercent = ((10 - MIN_TEMP_C) / TEMP_RANGE_C) * 100;
windChillLine.style.bottom = windChillPercent + '%';

// Heat Index line at 27°C
const heatIndexLine = document.getElementById('heat-index-line');
const heatIndexPercent = ((27 - MIN_TEMP_C) / TEMP_RANGE_C) * 100;
heatIndexLine.style.bottom = heatIndexPercent + '%';

/**
 * Convert Celsius to Fahrenheit
 * Formula: F = (C × 9/5) + 32
 */
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * Formula: C = (F - 32) × 5/9
 */
function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

/**
 * Calculate Wind Chill using Environment Canada formula
 *
 * Formula: WC = 13.12 + 0.6215×T - 11.37×V^0.16 + 0.3965×T×V^0.16
 * Where:
 *   T = Air Temperature (°C)
 *   V = Wind Speed (km/h)
 *
 * Applies when:
 *   - Temperature ≤ 10°C
 *   - Wind Speed ≥ 5 km/h
 *
 * Source: Environment Canada Wind Chill Calculator
 * Reference: https://www.canada.ca/en/environment-climate-change/services/weather-health/wind-chill-cold-weather.html
 */
function calculateWindChill(tempC, windKmh) {
    // Wind Chill only applies at or below 10°C and wind speed at or above 5 km/h
    if (tempC > 10 || windKmh < 5) {
        return null; // Not applicable
    }

    // Environment Canada Wind Chill formula
    const windChill = 13.12
                    + 0.6215 * tempC
                    - 11.37 * Math.pow(windKmh, 0.16)
                    + 0.3965 * tempC * Math.pow(windKmh, 0.16);

    return windChill;
}

/**
 * Calculate Heat Index using NOAA Rothfusz regression equation
 *
 * This is the most accurate Heat Index calculation used by NOAA.
 * The formula was developed by Lans P. Rothfusz and published in 1990.
 *
 * Why Fahrenheit?
 * - The original research and coefficients were developed using Fahrenheit
 * - Converting to Celsius and back maintains compatibility with official NOAA values
 * - All meteorological standards (NOAA, NWS) publish Heat Index tables in Fahrenheit
 *
 * Formula (simplified for readability):
 * HI = c₁ + c₂T + c₃R + c₄TR + c₅T² + c₆R² + c₇T²R + c₈TR² + c₉T²R²
 *
 * Where:
 *   T = Temperature (°F)
 *   R = Relative Humidity (%)
 *   c₁...c₉ = Rothfusz regression coefficients
 *
 * Valid Range:
 *   - Temperature: 80-110°F (27-43°C) - formula is not accurate outside this range
 *   - Relative Humidity: 40% to 100% (adjustments made for extremes)
 *
 * Applies when:
 *   - Temperature is between 27°C and 43°C (80-110°F)
 *
 * Source: NOAA National Weather Service Heat Index
 * Reference: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 */
function calculateHeatIndex(tempC, humidity) {
    // Heat Index only applies between 27°C and 43°C (80-110°F)
    // Outside this range, the Rothfusz regression produces invalid results
    if (tempC < 27 || tempC > 43) {
        return null; // Not applicable
    }

    // Convert Celsius to Fahrenheit for the calculation
    // The Rothfusz coefficients are calibrated for Fahrenheit
    const tempF = celsiusToFahrenheit(tempC);
    const rh = humidity;

    // Rothfusz regression coefficients
    const c1 = -42.379;
    const c2 = 2.04901523;
    const c3 = 10.14333127;
    const c4 = -0.22475541;
    const c5 = -0.00683783;
    const c6 = -0.05481717;
    const c7 = 0.00122874;
    const c8 = 0.00085282;
    const c9 = -0.00000199;

    // Calculate Heat Index in Fahrenheit using full Rothfusz equation
    let heatIndexF = c1
                    + c2 * tempF
                    + c3 * rh
                    + c4 * tempF * rh
                    + c5 * tempF * tempF
                    + c6 * rh * rh
                    + c7 * tempF * tempF * rh
                    + c8 * tempF * rh * rh
                    + c9 * tempF * tempF * rh * rh;

    // NOAA adjustments for extreme conditions
    // If RH < 13% and temperature is between 80-112°F, subtract from HI
    if (rh < 13 && tempF >= 80 && tempF <= 112) {
        const adjustment = ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
        heatIndexF -= adjustment;
    }
    // If RH > 85% and temperature is between 80-87°F, add to HI
    else if (rh > 85 && tempF >= 80 && tempF <= 87) {
        const adjustment = ((rh - 85) / 10) * ((87 - tempF) / 5);
        heatIndexF += adjustment;
    }

    // Convert back to Celsius for display
    const heatIndexC = fahrenheitToCelsius(heatIndexF);
    return heatIndexC;
}

/**
 * Calculate the "Feels Like" temperature based on current conditions
 * Returns an object with the feels-like temperature and the method used
 */
function calculateFeelsLike(tempC, windKmh, humidity) {
    // Check for Wind Chill first (≤10°C and wind ≥5 km/h)
    const windChill = calculateWindChill(tempC, windKmh);
    if (windChill !== null) {
        return {
            temp: windChill,
            method: 'Wind Chill'
        };
    }

    // Check for Heat Index (≥27°C)
    const heatIndex = calculateHeatIndex(tempC, humidity);
    if (heatIndex !== null) {
        return {
            temp: heatIndex,
            method: 'Heat Index'
        };
    }

    // Neither applies, return actual temperature
    return {
        temp: tempC,
        method: 'Actual Temperature'
    };
}

/**
 * Update all displays based on current temperature and environmental conditions
 */
function updateDisplay() {
    const tempC = parseFloat(celsiusInput.value) || 0;
    const tempF = parseFloat(fahrenheitInput.value) || 0;
    const windKmh = parseFloat(windSpeedSlider.value) || 0;
    const humidity = parseFloat(humiditySlider.value) || 50;

    // Clamp temperature for visualization (not for calculation)
    const clampedTempC = Math.max(MIN_TEMP_C, Math.min(MAX_TEMP_C, tempC));

    // Calculate fill percentage (0% at -50°C, 100% at 60°C)
    const fillPercentC = ((clampedTempC - MIN_TEMP_C) / TEMP_RANGE_C) * 100;

    // Check orientation
    const isHorizontal = fillC.classList.contains('horizontal');

    if (isHorizontal) {
        // Horizontal: use width instead of height
        fillC.style.width = fillPercentC + '%';
        fillF.style.width = fillPercentC + '%';
        fillC.style.height = '100%';
        fillF.style.height = '100%';

        // Update marker positions (horizontal: left position)
        markerC.style.left = `calc(${fillPercentC}% - 2px)`;
        markerF.style.left = `calc(${fillPercentC}% - 2px)`;
        markerC.style.bottom = 'auto';
        markerF.style.bottom = 'auto';
    } else {
        // Vertical: use height
        fillC.style.height = fillPercentC + '%';
        fillF.style.height = fillPercentC + '%';
        fillC.style.width = '100%';
        fillF.style.width = '100%';

        // Update marker positions (vertical: bottom position)
        markerC.style.bottom = `calc(${fillPercentC}% - 2px)`;
        markerF.style.bottom = `calc(${fillPercentC}% - 2px)`;
        markerC.style.left = '-10px';
        markerF.style.left = '-10px';
    }

    // Calculate and display Feels Like temperature
    const feelsLikeResult = calculateFeelsLike(tempC, windKmh, humidity);

    feelsLikeC.textContent = feelsLikeResult.temp.toFixed(1) + '°C';
    //feelsLikeC.textContent = Math.round(feelsLikeResult.temp) + '°C';
    feelsLikeF.textContent = celsiusToFahrenheit(feelsLikeResult.temp).toFixed(1) + '°F';
    //feelsLikeF.textContent = celsiusToFahrenheit(Math.round(feelsLikeResult.temp)) + '°F';
    methodC.textContent = feelsLikeResult.method;
    methodF.textContent = feelsLikeResult.method;
}

/**
 * Handle Celsius input change
 */
celsiusInput.addEventListener('input', function() {
    const tempC = parseFloat(this.value) || 0;
    const tempF = celsiusToFahrenheit(tempC);
    fahrenheitInput.value = tempF.toFixed(1);
    //fahrenheitInput.value = Math.round(tempF);
    updateDisplay();
});

/**
 * Handle Fahrenheit input change
 */
fahrenheitInput.addEventListener('input', function() {
    const tempF = parseFloat(this.value) || 0;
    const tempC = fahrenheitToCelsius(tempF);
    celsiusInput.value = tempC.toFixed(1);
    //celsiusInput.value = Math.round(tempC);
    updateDisplay();
});

/**
 * Handle wind speed slider change
 */
windSpeedSlider.addEventListener('input', function() {
    windValueDisplay.textContent = this.value;
    updateDisplay();
});

/**
 * Handle humidity slider change
 */
humiditySlider.addEventListener('input', function() {
    humidityValueDisplay.textContent = this.value;
    updateDisplay();
});

/**
 * Thermometer dragging functionality
 * Supports both mouse and touch events for mobile compatibility
 */
let isDragging = false;
let currentThermometer = null;

function startDrag(thermometer, event) {
    isDragging = true;
    currentThermometer = thermometer;
    event.preventDefault();
    updateTempFromDrag(event);
}

function updateTempFromDrag(event) {
    if (!isDragging || !currentThermometer) return;

    const rect = currentThermometer.getBoundingClientRect();
    const isHorizontal = currentThermometer.classList.contains('horizontal');

    let relativePos;

    if (isHorizontal) {
        // Horizontal: use X position
        const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
        // Calculate position relative to thermometer (0 at left, 1 at right)
        relativePos = (clientX - rect.left) / rect.width;
    } else {
        // Vertical: use Y position
        const clientY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY;
        // Calculate position relative to thermometer (0 at top, 1 at bottom)
        relativePos = (clientY - rect.top) / rect.height;
    }

    relativePos = Math.max(0, Math.min(1, relativePos)); // Clamp between 0 and 1

    // Convert to temperature
    let tempC;
    if (isHorizontal) {
        // Horizontal: left = min temp, right = max temp
        tempC = MIN_TEMP_C + (relativePos * TEMP_RANGE_C);
    } else {
        // Vertical: top = max temp, bottom = min temp (invert)
        tempC = MAX_TEMP_C - (relativePos * TEMP_RANGE_C);
    }

    // Update inputs
    celsiusInput.value = tempC.toFixed(1);
    //celsiusInput.value = Math.round(tempC);
    fahrenheitInput.value = celsiusToFahrenheit(tempC).toFixed(1);
    //fahrenheitInput.value = Math.round(celsiusToFahrenheit(tempC));

    updateDisplay();
}

function stopDrag() {
    isDragging = false;
    currentThermometer = null;
}

// Mouse events for desktop
markerC.addEventListener('mousedown', (e) => startDrag(thermometerC, e));
markerF.addEventListener('mousedown', (e) => startDrag(thermometerF, e));
thermometerC.addEventListener('mousedown', (e) => startDrag(thermometerC, e));
thermometerF.addEventListener('mousedown', (e) => startDrag(thermometerF, e));

// Touch events for mobile
markerC.addEventListener('touchstart', (e) => startDrag(thermometerC, e));
markerF.addEventListener('touchstart', (e) => startDrag(thermometerF, e));
thermometerC.addEventListener('touchstart', (e) => startDrag(thermometerC, e));
thermometerF.addEventListener('touchstart', (e) => startDrag(thermometerF, e));

// Global move and end events
document.addEventListener('mousemove', updateTempFromDrag);
document.addEventListener('mouseup', stopDrag);
document.addEventListener('touchmove', updateTempFromDrag);
document.addEventListener('touchend', stopDrag);

/**
 * Weather Data Fetching Functionality
 */
const cityInput = document.getElementById('city-input');
const fetchWeatherBtn = document.getElementById('fetch-weather');
const autoUpdateCheckbox = document.getElementById('auto-update');
const weatherStatus = document.getElementById('weather-status');
const cityDropdownBtn = document.getElementById('city-dropdown-btn');
const cityDropdown = document.getElementById('city-dropdown');
let autoUpdateInterval = null;
let recentLocations = [];

// Load recent locations from localStorage
function loadRecentLocations() {
    const stored = localStorage.getItem('recentLocations');
    if (stored) {
        try {
            recentLocations = JSON.parse(stored);
            updateRecentLocationsDropdown();
        } catch (e) {
            recentLocations = [];
        }
    }
}

// Save recent locations to localStorage
function saveRecentLocations() {
    localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
}

// Add a location to recent locations list
function addRecentLocation(location) {
    // Normalize the location string for comparison (trim and lowercase)
    const normalizedLocation = location.trim();
    const normalizedLower = normalizedLocation.toLowerCase();

    // Remove if already exists (case-insensitive comparison)
    recentLocations = recentLocations.filter(loc => loc.toLowerCase() !== normalizedLower);

    // Add to beginning of array
    recentLocations.unshift(normalizedLocation);

    // Keep only last 10 unique locations
    if (recentLocations.length > 10) {
        recentLocations = recentLocations.slice(0, 10);
    }

    saveRecentLocations();
    updateRecentLocationsDropdown();
}

// Update the dropdown with recent locations
function updateRecentLocationsDropdown() {
    console.log('Updating dropdown with locations:', recentLocations);

    cityDropdown.innerHTML = '';

    if (recentLocations.length === 0) {
        cityDropdown.innerHTML = '<div style="padding: 10px 12px; color: #999; font-size: 14px;">No recent locations</div>';
    } else {
        recentLocations.forEach(location => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = location;
            item.addEventListener('click', function() {
                cityInput.value = location;
                cityDropdown.style.display = 'none';
            });
            cityDropdown.appendChild(item);
            console.log('Added option:', location);
        });
    }
    console.log('Dropdown now has', recentLocations.length, 'location options');
}

// Toggle dropdown visibility
function toggleDropdown() {
    if (cityDropdown.style.display === 'none' || cityDropdown.style.display === '') {
        cityDropdown.style.display = 'block';
    } else {
        cityDropdown.style.display = 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    if (!cityInput.contains(event.target) &&
        !cityDropdownBtn.contains(event.target) &&
        !cityDropdown.contains(event.target)) {
        cityDropdown.style.display = 'none';
    }
});

// Get current timestamp in readable format
function getTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// OpenWeatherMap API key
// Will be loaded from config.js if it exists, otherwise uses placeholder
let API_KEY = 'YOUR_API_KEY_HERE';

// Check if config.js loaded the API key
if (typeof WEATHER_API_KEY !== 'undefined') {
    API_KEY = WEATHER_API_KEY;
}

/**
 * Display status message to the user
 */
function showStatus(message, type = 'info') {
    weatherStatus.textContent = message;
    weatherStatus.style.display = 'block';

    if (type === 'success') {
        weatherStatus.style.background = '#d4edda';
        weatherStatus.style.color = '#155724';
        weatherStatus.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        weatherStatus.style.background = '#f8d7da';
        weatherStatus.style.color = '#721c24';
        weatherStatus.style.border = '1px solid #f5c6cb';
    } else {
        weatherStatus.style.background = '#d1ecf1';
        weatherStatus.style.color = '#0c5460';
        weatherStatus.style.border = '1px solid #bee5eb';
    }

    // Auto-hide based on config (0 = no auto-hide)
    let hideDelay = 0;
    if (type === 'success') {
        hideDelay = (typeof AUTO_HIDE_SUCCESS_SECS !== 'undefined' ? AUTO_HIDE_SUCCESS_SECS : 10) * 1000;
    } else if (type === 'info') {
        hideDelay = (typeof AUTO_HIDE_INFO_SECS !== 'undefined' ? AUTO_HIDE_INFO_SECS : 5) * 1000;
    } else if (type === 'error') {
        hideDelay = 5000; // Always auto-hide errors after 5 seconds
    }

    if (hideDelay > 0) {
        setTimeout(() => {
            weatherStatus.style.display = 'none';
        }, hideDelay);
    }
}

/**
 * Fetch weather data from OpenWeatherMap API
 */
async function fetchWeatherData() {
    const city = cityInput.value.trim();

    if (!city) {
        showStatus('Please enter a city name', 'error');
        return;
    }

    showStatus('Fetching weather data...', 'info');

    try {
        // Using OpenWeatherMap API (free tier)
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('API key invalid. Please get a free API key from openweathermap.org');
            } else if (response.status === 404) {
                throw new Error('City not found. Please check the city name.');
            } else {
                throw new Error(`Error fetching weather data (${response.status})`);
            }
        }

        const data = await response.json();

        // Extract weather data
        const temperature = data.main.temp; // in Celsius
        const windSpeed = data.wind.speed * 3.6; // Convert m/s to km/h
        const humidity = data.main.humidity; // in percentage
        const locationName = `${data.name}, ${data.sys.country}`;

        // Update the UI
        celsiusInput.value = temperature.toFixed(1);
        fahrenheitInput.value = celsiusToFahrenheit(temperature).toFixed(1);
        windSpeedSlider.value = Math.min(100, Math.round(windSpeed)); // Cap at 100 km/h for slider
        windValueDisplay.textContent = Math.round(windSpeed);
        humiditySlider.value = humidity;
        humidityValueDisplay.textContent = humidity;

        // Update display
        updateDisplay();

        // Add to recent locations
        addRecentLocation(locationName);

        // Get timestamp
        const timestamp = getTimestamp();

        showStatus(
            `Weather updated for ${locationName}: ${temperature.toFixed(1)}°C, Wind: ${windSpeed.toFixed(1)} km/h, Humidity: ${humidity}% (${timestamp})`,
            'success'
        );
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Weather fetch error:', error);
    }
}

/**
 * Toggle auto-update functionality
 */
function toggleAutoUpdate() {
    if (autoUpdateCheckbox.checked) {
        // Start auto-update (fetch every 10 minutes)
        fetchWeatherData(); // Fetch immediately
        autoUpdateInterval = setInterval(fetchWeatherData, 10 * 60 * 1000); // 10 minutes
        showStatus('Auto-update enabled (updates every 10 minutes)', 'success');
    } else {
        // Stop auto-update
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
        }
        showStatus('Auto-update disabled', 'info');
    }
}

// Event listeners
fetchWeatherBtn.addEventListener('click', fetchWeatherData);
autoUpdateCheckbox.addEventListener('change', toggleAutoUpdate);

// Handle dropdown button click
cityDropdownBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleDropdown();
});

// Allow pressing Enter in city input to fetch weather
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchWeatherData();
    }
});

// Load recent locations from storage
loadRecentLocations();

// Apply configuration values from config.js if available
function applyConfigValues() {
    // Set default location
    if (typeof LOCATION !== 'undefined') {
        cityInput.value = LOCATION;
    } else {
        cityInput.value = 'Arkell, ON'; // Fallback default
    }

    // Set default wind speed
    if (typeof WIND_SPEED_KPH !== 'undefined') {
        windSpeedSlider.value = WIND_SPEED_KPH;
        windValueDisplay.textContent = WIND_SPEED_KPH;
    }

    // Set default humidity
    if (typeof HUMIDITY_PCT !== 'undefined') {
        humiditySlider.value = HUMIDITY_PCT;
        humidityValueDisplay.textContent = HUMIDITY_PCT;
    }

    // Set auto-update checkbox
    if (typeof AUTO_UPDATE !== 'undefined') {
        autoUpdateCheckbox.checked = AUTO_UPDATE;
        if (AUTO_UPDATE) {
            toggleAutoUpdate();
        }
    }

    // Apply thermometer orientation
    applyThermometerOrientation();
}

/**
 * Apply thermometer orientation from config
 */
function applyThermometerOrientation() {
    const orientation = (typeof THERMOMETER_ORIENTATION !== 'undefined') ? THERMOMETER_ORIENTATION : 'vertical';
    const thermometerSection = document.querySelector('.thermometer-section');
    const thermometerContainers = document.querySelectorAll('.thermometer-container');
    const thermometerDisplays = document.querySelectorAll('.thermometer-display');
    const thermometerWrappers = document.querySelectorAll('.thermometer-wrapper');
    const thermometers = document.querySelectorAll('.thermometer');
    const thermometerFills = document.querySelectorAll('.thermometer-fill');
    const thermometerMarkers = document.querySelectorAll('.thermometer-marker');
    const thermometerScales = document.querySelectorAll('.thermometer-scale');
    const thresholdLines = document.querySelectorAll('.threshold-line');
    const thresholdLabels = document.querySelectorAll('.threshold-label');

    if (orientation === 'horizontal') {
        thermometerSection.classList.add('horizontal');
        thermometerContainers.forEach(container => container.classList.add('horizontal'));
        thermometerDisplays.forEach(display => display.classList.add('horizontal'));
        thermometerWrappers.forEach(wrapper => wrapper.classList.add('horizontal'));
        thermometers.forEach(thermo => thermo.classList.add('horizontal'));
        thermometerFills.forEach(fill => fill.classList.add('horizontal'));
        thermometerMarkers.forEach(marker => marker.classList.add('horizontal'));
        thermometerScales.forEach(scale => scale.classList.add('horizontal'));
        thresholdLines.forEach(line => line.classList.add('horizontal'));
        thresholdLabels.forEach(label => label.classList.add('horizontal'));
    } else {
        thermometerSection.classList.remove('horizontal');
        thermometerContainers.forEach(container => container.classList.remove('horizontal'));
        thermometerDisplays.forEach(display => display.classList.remove('horizontal'));
        thermometerWrappers.forEach(wrapper => wrapper.classList.remove('horizontal'));
        thermometers.forEach(thermo => thermo.classList.remove('horizontal'));
        thermometerFills.forEach(fill => fill.classList.remove('horizontal'));
        thermometerMarkers.forEach(marker => marker.classList.remove('horizontal'));
        thermometerScales.forEach(scale => scale.classList.remove('horizontal'));
        thresholdLines.forEach(line => line.classList.remove('horizontal'));
        thresholdLabels.forEach(label => label.classList.remove('horizontal'));
    }

    // Update display to recalculate positions
    updateDisplay();
}

/**
 * Toggle between vertical and horizontal orientation
 */
let currentOrientation = (typeof THERMOMETER_ORIENTATION !== 'undefined') ? THERMOMETER_ORIENTATION : 'vertical';

function toggleOrientation() {
    currentOrientation = (currentOrientation === 'vertical') ? 'horizontal' : 'vertical';

    const thermometerSection = document.querySelector('.thermometer-section');
    const thermometerContainers = document.querySelectorAll('.thermometer-container');
    const thermometerDisplays = document.querySelectorAll('.thermometer-display');
    const thermometerWrappers = document.querySelectorAll('.thermometer-wrapper');
    const thermometers = document.querySelectorAll('.thermometer');
    const thermometerFills = document.querySelectorAll('.thermometer-fill');
    const thermometerMarkers = document.querySelectorAll('.thermometer-marker');
    const thermometerScales = document.querySelectorAll('.thermometer-scale');
    const thresholdLines = document.querySelectorAll('.threshold-line');
    const thresholdLabels = document.querySelectorAll('.threshold-label');

    if (currentOrientation === 'horizontal') {
        thermometerSection.classList.add('horizontal');
        thermometerContainers.forEach(container => container.classList.add('horizontal'));
        thermometerDisplays.forEach(display => display.classList.add('horizontal'));
        thermometerWrappers.forEach(wrapper => wrapper.classList.add('horizontal'));
        thermometers.forEach(thermo => thermo.classList.add('horizontal'));
        thermometerFills.forEach(fill => fill.classList.add('horizontal'));
        thermometerMarkers.forEach(marker => marker.classList.add('horizontal'));
        thermometerScales.forEach(scale => scale.classList.add('horizontal'));
        thresholdLines.forEach(line => line.classList.add('horizontal'));
        thresholdLabels.forEach(label => label.classList.add('horizontal'));
    } else {
        thermometerSection.classList.remove('horizontal');
        thermometerContainers.forEach(container => container.classList.remove('horizontal'));
        thermometerDisplays.forEach(display => display.classList.remove('horizontal'));
        thermometerWrappers.forEach(wrapper => wrapper.classList.remove('horizontal'));
        thermometers.forEach(thermo => thermo.classList.remove('horizontal'));
        thermometerFills.forEach(fill => fill.classList.remove('horizontal'));
        thermometerMarkers.forEach(marker => marker.classList.remove('horizontal'));
        thermometerScales.forEach(scale => scale.classList.remove('horizontal'));
        thresholdLines.forEach(line => line.classList.remove('horizontal'));
        thresholdLabels.forEach(label => label.classList.remove('horizontal'));
    }

    // Update display to recalculate positions
    updateDisplay();
}

// Add event listener for toggle button
const toggleOrientationBtn = document.getElementById('toggle-orientation');
toggleOrientationBtn.addEventListener('click', toggleOrientation);

// Apply config values
applyConfigValues();

// Initialize display
updateDisplay();
