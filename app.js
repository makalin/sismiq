// Map styles
const mapStyles = {
    default: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
};

// Initialize map centered on Türkiye
const map = L.map('map').setView([39.0, 35.0], 6);
let currentTileLayer = L.tileLayer(mapStyles.default, {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// State management
let userLocation = null;
let userZones = [];
let earthquakes = [];
let markers = [];
let isRefreshing = false;

// Theme management
function initTheme() {
    const theme = localStorage.getItem('sismiq_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('sismiq_theme', newTheme);
}

// Map style management
function changeMapStyle(style) {
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(mapStyles[style], {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    localStorage.setItem('sismiq_map_style', style);
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Load saved zones from localStorage
function loadZones() {
    const savedZones = localStorage.getItem('sismiq_zones');
    if (savedZones) {
        userZones = JSON.parse(savedZones);
        userZones.forEach(zone => addZoneToMap(zone));
    }
}

// Save zones to localStorage
function saveZones() {
    localStorage.setItem('sismiq_zones', JSON.stringify(userZones));
}

// Add zone to map
function addZoneToMap(zone) {
    const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius * 1000,
        color: '#2c3e50',
        fillColor: '#3498db',
        fillOpacity: 0.2
    }).addTo(map);
    
    circle.bindPopup(`<b>${zone.name}</b><br>Radius: ${zone.radius}km`);
    zone.circle = circle;
}

// Parse KOERI earthquake data
function parseKOERIData(text) {
    console.log('Raw input text:', text);
    const lines = text.split('\n');
    console.log('Number of lines:', lines.length);
    const quakes = [];
    
    // Find the start of the data (skip headers)
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        console.log('Checking line', i, ':', lines[i]);
        if (lines[i].includes('Büyüklük') && lines[i].includes('Tarih')) {
            startIndex = i + 2; // Skip the header line and the separator line
            console.log('Found header at line', i, 'starting data at line', startIndex);
            break;
        }
    }
    
    // Process each line
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            // Parse fixed-width columns
            const date = line.substring(0, 10).trim();
            const time = line.substring(11, 19).trim();
            const lat = parseFloat(line.substring(20, 28).trim());
            const lng = parseFloat(line.substring(29, 37).trim());
            const depth = parseFloat(line.substring(38, 47).trim());
            const md = line.substring(48, 52).trim();
            const ml = line.substring(53, 57).trim();
            const mw = line.substring(58, 62).trim();
            const location = line.substring(63).trim();
            
            console.log('Parsed line', i, ':', {
                date, time, lat, lng, depth, md, ml, mw, location
            });
            
            // Use ML magnitude if available, otherwise use MD or Mw
            let magnitude = parseFloat(ml);
            if (isNaN(magnitude)) {
                magnitude = parseFloat(md);
                if (isNaN(magnitude)) {
                    magnitude = parseFloat(mw);
                }
            }
            
            if (!isNaN(magnitude) && !isNaN(lat) && !isNaN(lng)) {
                // Convert date and time to ISO format
                const [year, month, day] = date.split('.');
                const dateTime = new Date(`${year}-${month}-${day}T${time}`);
                
                quakes.push({
                    time: dateTime.toISOString(),
                    magnitude,
                    location,
                    lat,
                    lng,
                    depth,
                    md: md === '-.-' ? null : parseFloat(md),
                    ml: ml === '-.-' ? null : parseFloat(ml),
                    mw: mw === '-.-' ? null : parseFloat(mw)
                });
                console.log('Successfully added quake:', quakes[quakes.length - 1]);
            } else {
                console.log('Invalid data in line', i, ':', {
                    magnitude, lat, lng,
                    parsedValues: { date, time, lat, lng, depth, md, ml, mw }
                });
            }
        } catch (error) {
            console.error('Error parsing line', i, ':', line, error);
        }
    }
    
    console.log('Total quakes parsed:', quakes.length);
    return quakes;
}

// Fetch earthquake data from KOERI
async function fetchEarthquakes() {
    if (isRefreshing) return;
    
    const refreshButton = document.querySelector('.refresh-button');
    refreshButton.classList.add('loading');
    isRefreshing = true;
    
    try {
        // First try to fetch from proxy
        const response = await fetch('proxy.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            try {
                // Log debug information
                console.log('Debug info:', result.debug);
                
                earthquakes = parseKOERIData(result.data);
                
                if (earthquakes.length === 0) {
                    throw new Error('No valid earthquake data found');
                }
                
                // Save to local storage as backup
                localStorage.setItem('sismiq_last_quakes', JSON.stringify(earthquakes));
                localStorage.setItem('sismiq_last_update', result.timestamp || new Date().toISOString());
                
                updateEarthquakeList();
                updateMapMarkers();
                
                showNotification(`Data updated successfully. Found ${earthquakes.length} earthquakes.`, 'success');
            } catch (parseError) {
                console.error('Error parsing earthquake data:', parseError);
                console.error('Raw data:', result.data);
                throw new Error('Failed to parse earthquake data');
            }
        } else {
            throw new Error(result.error || 'Failed to fetch data from proxy');
        }
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        
        // Try to load from local storage if fetch fails
        const savedQuakes = localStorage.getItem('sismiq_last_quakes');
        if (savedQuakes) {
            try {
                earthquakes = JSON.parse(savedQuakes);
                updateEarthquakeList();
                updateMapMarkers();
                
                const lastUpdate = localStorage.getItem('sismiq_last_update');
                showNotification(
                    `Using cached data. Last update: ${new Date(lastUpdate).toLocaleString()}`,
                    'warning'
                );
            } catch (parseError) {
                console.error('Error parsing cached data:', parseError);
                showNotification('Failed to load cached data', 'error');
            }
        } else {
            showNotification('Failed to load earthquake data. Please try again later.', 'error');
        }
    } finally {
        refreshButton.classList.remove('loading');
        isRefreshing = false;
    }
}

// Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Remove any existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Manual refresh handler
function handleRefresh() {
    if (!isRefreshing) {
        fetchEarthquakes();
    }
}

// Update earthquake list in UI
function updateEarthquakeList() {
    const container = document.getElementById('quakeContainer');
    const showDistances = document.getElementById('showDistances').checked;
    const minMagnitude = parseFloat(document.getElementById('minMagnitude').value) || 0;
    
    container.innerHTML = '';
    
    const filteredQuakes = earthquakes
        .filter(quake => quake.magnitude >= minMagnitude)
        .slice(0, 10);
    
    filteredQuakes.forEach(quake => {
        const div = document.createElement('div');
        div.className = 'quake-item';
        
        let distanceInfo = '';
        if (showDistances && userLocation) {
            const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                quake.lat,
                quake.lng
            );
            distanceInfo = `<span class="distance">${distance.toFixed(1)} km away</span>`;
        }
        
        div.innerHTML = `
            <span class="quake-magnitude">M${quake.magnitude}</span>
            <span>${quake.location}</span>
            <span>${new Date(quake.time).toLocaleString()}</span>
            ${distanceInfo}
        `;
        container.appendChild(div);
    });
}

// Update earthquake markers on map
function updateMapMarkers() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    const minMagnitude = parseFloat(document.getElementById('minMagnitude').value) || 0;
    
    earthquakes
        .filter(quake => quake.magnitude >= minMagnitude)
        .forEach(quake => {
            const marker = L.marker([quake.lat, quake.lng])
                .bindPopup(`
                    <b>Magnitude ${quake.magnitude}</b><br>
                    ${quake.location}<br>
                    ${new Date(quake.time).toLocaleString()}
                    ${userLocation ? `<br>${calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        quake.lat,
                        quake.lng
                    ).toFixed(1)} km away` : ''}
                `)
                .addTo(map);
            markers.push(marker);
        });
}

// Event Listeners
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

document.querySelector('.map-style-selector').addEventListener('change', (e) => {
    changeMapStyle(e.target.value);
});

document.getElementById('showDistances').addEventListener('change', () => {
    updateEarthquakeList();
    updateMapMarkers();
});

document.getElementById('minMagnitude').addEventListener('input', () => {
    updateEarthquakeList();
    updateMapMarkers();
});

document.getElementById('locateMe').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setView([userLocation.lat, userLocation.lng], 12);
            L.marker([userLocation.lat, userLocation.lng])
                .bindPopup('Your Location')
                .addTo(map);
        });
    }
});

document.getElementById('addZone').addEventListener('click', () => {
    document.getElementById('zoneModal').style.display = 'block';
});

document.getElementById('zoneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!userLocation) {
        alert('Please locate yourself first!');
        return;
    }
    
    const name = document.getElementById('zoneName').value;
    const radius = parseFloat(document.getElementById('zoneRadius').value);
    
    const zone = {
        name,
        radius,
        lat: userLocation.lat,
        lng: userLocation.lng
    };
    
    userZones.push(zone);
    addZoneToMap(zone);
    saveZones();
    
    document.getElementById('zoneModal').style.display = 'none';
    document.getElementById('zoneForm').reset();
});

document.getElementById('reportQuake').addEventListener('click', () => {
    document.getElementById('reportModal').style.display = 'block';
});

document.getElementById('reportForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const magnitude = document.getElementById('magnitude').value;
    const description = document.getElementById('description').value;
    
    // Here you would typically send this to a backend
    console.log('Reported quake:', { magnitude, description });
    
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
});

// Close modals when clicking cancel
document.querySelectorAll('.cancel').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

document.querySelector('.refresh-button').addEventListener('click', handleRefresh);

// Initialize
initTheme();
const savedMapStyle = localStorage.getItem('sismiq_map_style') || 'default';
document.querySelector('.map-style-selector').value = savedMapStyle;
changeMapStyle(savedMapStyle);
loadZones();

// Initial data load
fetchEarthquakes();

// Auto-refresh every minute
setInterval(fetchEarthquakes, 60000); 