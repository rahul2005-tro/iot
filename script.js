// Import Firebase modular SDK
// Ensure to add your Firebase config before running
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyARivF9kHKQC4QXe0k-3G4wAF5SW_XoOlw",
    authDomain: "madhan-99da1.firebaseapp.com",
    databaseURL: "https://madhan-99da1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "madhan-99da1",
    storageBucket: "madhan-99da1.firebasestorage.app",
    messagingSenderId: "120571023152",
    appId: "1:120571023152:web:bd319fa103074dce8e82f5",
    measurementId: "G-H9CBYL7NZJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global State
let motorState = false;

// DOM Elements
const elements = {
    connectionIndicator: document.getElementById('connection-indicator'),
    connectionText: document.getElementById('connection-text'),
    lastUpdate: document.getElementById('last-update'),

    // Air Quality
    aqValue: document.getElementById('aq-value'),
    aqStatus: document.getElementById('aq-status'),
    aqBar: document.getElementById('aq-bar'),
    aqIconContainer: document.getElementById('aq-icon-container'),
    aqIcon: document.getElementById('aq-icon'),

    // Temperature
    tempValue: document.getElementById('temp-value'),
    tempBar: document.getElementById('temp-bar'),
    tempIconContainer: document.getElementById('temp-icon-container'),
    tempIcon: document.getElementById('temp-icon'),

    // Vibration
    vibStatus: document.getElementById('vib-status'),
    vibRipple: document.getElementById('vib-ripple'),
    vibIconContainer: document.getElementById('vib-icon-container'),
    vibIcon: document.getElementById('vib-icon'),

    // Motor
    motorToggle: document.getElementById('motor-toggle'),
    motorStateText: document.getElementById('motor-state-text'),
    motorFanIcon: document.getElementById('motor-fan-icon'),
    motorCard: document.getElementById('motor-card')
};

// --- Chart Initialization ---
// Global defaults for dark theme
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = "'Inter', sans-serif";

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 800,
        easing: 'easeOutQuart'
    },
    scales: {
        x: {
            grid: {
                display: false,
                drawBorder: false
            },
            ticks: {
                maxTicksLimit: 6
            }
        },
        y: {
            grid: {
                color: 'rgba(75, 85, 99, 0.2)',
                drawBorder: false,
                borderDash: [5, 5]
            },
            beginAtZero: true
        }
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(75, 85, 99, 0.5)',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            cornerRadius: 8
        }
    }
};

// Temperature Chart
const tempCtx = document.getElementById('tempChart').getContext('2d');
const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 400);
tempGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
tempGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

const tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Temperature °C',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: tempGradient,
            borderWidth: 3,
            pointBackgroundColor: '#1e3a8a',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, max: 100 }
        }
    }
});

// Air Quality Chart
const aqCtx = document.getElementById('aqChart').getContext('2d');
const aqGradient = aqCtx.createLinearGradient(0, 0, 0, 400);
aqGradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
aqGradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

const aqChart = new Chart(aqCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Air Quality (PPM)',
            data: [],
            borderColor: '#a855f7',
            backgroundColor: aqGradient,
            borderWidth: 3,
            pointBackgroundColor: '#581c87',
            pointBorderColor: '#a855f7',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, max: 500 }
        }
    }
});

const maxDataPoints = 15;

function updateChart(chart, label, data) {
    if (!chart.data.labels) chart.data.labels = [];
    if (!chart.data.datasets[0].data) chart.data.datasets[0].data = [];

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data);

    if (chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update('none'); // Update without full redeal animation for performance
}


// --- UI Update Functions ---

function updateTimestamp() {
    const now = new Date();
    elements.lastUpdate.textContent = now.toLocaleTimeString();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    let icon = 'fa-info-circle';
    let bgColor = 'bg-blue-900 border-blue-500';
    let textColor = 'text-blue-200';

    if (type === 'warning') {
        icon = 'fa-exclamation-triangle';
        bgColor = 'bg-yellow-900 border-yellow-500';
        textColor = 'text-yellow-200';
    } else if (type === 'danger') {
        icon = 'fa-shield-halved';
        bgColor = 'bg-red-900 border-red-500';
        textColor = 'text-red-200';
    } else if (type === 'success') {
        icon = 'fa-check-circle';
        bgColor = 'bg-emerald-900 border-emerald-500';
        textColor = 'text-emerald-200';
    }

    toast.className = `flex items-center space-x-3 px-4 py-3 rounded-lg border bg-opacity-90 backdrop-blur-md shadow-lg ${bgColor} toast-enter`;
    toast.innerHTML = `
        <i class="fa-solid ${icon} ${textColor}"></i>
        <span class="text-white text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slide-out-top 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function setConnectionStatus(connected) {
    if (connected) {
        if (elements.connectionIndicator) {
            elements.connectionIndicator.classList.replace('bg-red-500', 'bg-emerald-500');
            elements.connectionIndicator.classList.replace('shadow-[0_0_10px_rgba(239,68,68,0.7)]', 'shadow-[0_0_10px_rgba(16,185,129,0.7)]');
        }
        if (elements.connectionText) {
            elements.connectionText.textContent = 'Connected (Live)';
            elements.connectionText.classList.replace('text-gray-400', 'text-emerald-400');
        }
        if (elements.motorToggle) elements.motorToggle.disabled = false;
    } else {
        if (elements.connectionIndicator) {
            elements.connectionIndicator.classList.replace('bg-emerald-500', 'bg-red-500');
            elements.connectionIndicator.classList.replace('shadow-[0_0_10px_rgba(16,185,129,0.7)]', 'shadow-[0_0_10px_rgba(239,68,68,0.7)]');
        }
        if (elements.connectionText) {
            elements.connectionText.textContent = 'Disconnected';
            elements.connectionText.classList.replace('text-emerald-400', 'text-gray-400');
        }
        if (elements.motorToggle) elements.motorToggle.disabled = true;
    }
}

// Data Processors
function updateAirQuality(value) {
    if (!elements.aqValue) return;

    elements.aqValue.textContent = value;

    // Calculate percentage (assuming 500 is max scale for MQ135 PPM conceptually here)
    const percentage = Math.min((value / 500) * 100, 100);
    elements.aqBar.style.width = `${percentage}%`;

    elements.aqIconContainer.className = 'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ';

    // Status Logic
    elements.aqValue.classList.remove('neon-text-emerald', 'neon-text-yellow', 'neon-text-red');
    if (value <= 100) {
        elements.aqStatus.textContent = 'Good';
        elements.aqStatus.className = 'text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-900 bg-opacity-50 text-emerald-400 border border-emerald-800';
        elements.aqBar.className = 'h-1.5 rounded-full transition-all duration-1000 bg-emerald-500';
        elements.aqIconContainer.classList.add('bg-emerald-500', 'bg-opacity-20', 'glow-emerald');
        elements.aqIcon.className = 'fa-solid fa-leaf text-emerald-400';
        elements.aqValue.classList.add('neon-text-emerald');
    } else if (value <= 300) {
        elements.aqStatus.textContent = 'Moderate';
        elements.aqStatus.className = 'text-sm font-medium px-2.5 py-0.5 rounded-full bg-yellow-900 bg-opacity-50 text-yellow-400 border border-yellow-800';
        elements.aqBar.className = 'h-1.5 rounded-full transition-all duration-1000 bg-yellow-500';
        elements.aqIconContainer.classList.add('bg-yellow-500', 'bg-opacity-20', 'glow-yellow');
        elements.aqIcon.className = 'fa-solid fa-wind text-yellow-400';
        elements.aqValue.classList.add('neon-text-yellow');
    } else {
        elements.aqStatus.textContent = 'Hazardous';
        elements.aqStatus.className = 'text-sm font-medium px-2.5 py-0.5 rounded-full bg-red-900 bg-opacity-50 text-red-400 border border-red-800';
        elements.aqBar.className = 'h-1.5 rounded-full transition-all duration-1000 bg-red-500';
        elements.aqIconContainer.classList.add('bg-red-500', 'bg-opacity-20', 'glow-red');
        elements.aqIcon.className = 'fa-solid fa-skull-crossbones text-red-400';
        elements.aqValue.classList.add('neon-text-red');
    }
}

function updateTemperature(value) {
    if (!elements.tempValue) return;

    elements.tempValue.textContent = value.toFixed(1);

    const maxTemp = 100;
    const percentage = Math.min((value / maxTemp) * 100, 100);
    elements.tempBar.style.width = `${percentage}%`;

    elements.tempIconContainer.className = 'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ';

    elements.tempValue.classList.remove('neon-text-blue', 'neon-text-yellow', 'neon-text-red');
    if (value < 40) {
        elements.tempBar.classList.replace('bg-red-500', 'bg-blue-500') || elements.tempBar.classList.replace('bg-yellow-500', 'bg-blue-500') || elements.tempBar.classList.add('bg-blue-500');
        elements.tempIconContainer.classList.add('bg-blue-500', 'bg-opacity-20', 'glow-blue');
        elements.tempIcon.className = 'fa-solid fa-droplet text-blue-400';
        elements.tempValue.classList.add('neon-text-blue');
    } else if (value < 65) {
        elements.tempBar.classList.replace('bg-blue-500', 'bg-yellow-500') || elements.tempBar.classList.replace('bg-red-500', 'bg-yellow-500');
        elements.tempIconContainer.classList.add('bg-yellow-500', 'bg-opacity-20', 'glow-yellow');
        elements.tempIcon.className = 'fa-solid fa-temperature-half text-yellow-400';
        elements.tempValue.classList.add('neon-text-yellow');
    } else {
        elements.tempBar.classList.replace('bg-blue-500', 'bg-red-500') || elements.tempBar.classList.replace('bg-yellow-500', 'bg-red-500');
        elements.tempIconContainer.classList.add('bg-red-500', 'bg-opacity-20', 'glow-red');
        elements.tempIcon.className = 'fa-solid fa-fire text-red-400';
        elements.tempValue.classList.add('neon-text-red');

        // Auto shut off logic visualization (actual shutoff should be done by hardware/firebase rules, UI just reflects)
        showToast(`High temperature warning: ${value}°C`, 'warning');
    }
}

let lastVibrationState = 0;
function updateVibration(value) {
    if (!elements.vibStatus) return;
    // value 0 = safe, 1 = detected

    if (value === 1 && lastVibrationState === 0) {
        showToast('Vibration detected!', 'danger');
    }
    lastVibrationState = value;

    if (value === 1) {
        elements.vibStatus.textContent = 'DETECTED';
        elements.vibStatus.classList.replace('text-emerald-400', 'text-red-400');
        elements.vibRipple.classList.add('vib-active');

        // Update core dot
        const core = document.getElementById('vib-core');
        core.classList.replace('bg-emerald-500', 'bg-red-500');
        core.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';

        // Update rings
        document.getElementById('vib-circle-1').classList.replace('border-emerald-500', 'border-red-500');
        document.getElementById('vib-circle-2').classList.replace('border-emerald-500', 'border-red-500');

        elements.vibIconContainer.className = 'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 bg-red-500 bg-opacity-20 glow-red';
        elements.vibIcon.className = 'fa-solid fa-wave-square text-red-400 animate-pulse';

    } else {
        elements.vibStatus.textContent = 'SAFE';
        elements.vibStatus.classList.replace('text-red-400', 'text-emerald-400');
        elements.vibRipple.classList.remove('vib-active');

        // Update core dot
        const core = document.getElementById('vib-core');
        core.classList.replace('bg-red-500', 'bg-emerald-500');
        core.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.5)';

        // Update rings
        document.getElementById('vib-circle-1').classList.replace('border-red-500', 'border-emerald-500');
        document.getElementById('vib-circle-2').classList.replace('border-red-500', 'border-emerald-500');

        elements.vibIconContainer.className = 'w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 bg-emerald-500 bg-opacity-20 glow-emerald';
        elements.vibIcon.className = 'fa-solid fa-shield-halved text-emerald-400';
    }
}

function updateMotorUI(isOn) {
    if (!elements.motorStateText) return;

    if (motorState === isOn) return; // Prevent redundant UI updates
    motorState = isOn;

    // Also explicitly force the toggle in case the update came from another client
    if (elements.motorToggle) elements.motorToggle.checked = isOn;

    if (isOn) {
        elements.motorStateText.textContent = 'ON';
        elements.motorStateText.classList.replace('text-gray-300', 'text-blue-400');
        elements.motorStateText.classList.add('neon-text-blue');
        elements.motorFanIcon.classList.add('animate-spin-slow', 'text-blue-400');
        elements.motorFanIcon.classList.remove('text-gray-400');

        elements.motorCard.classList.add('glow-blue');
        elements.motorCard.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        showToast('Motor started', 'success');
    } else {
        elements.motorStateText.textContent = 'OFF';
        elements.motorStateText.classList.replace('text-blue-400', 'text-gray-300');
        elements.motorStateText.classList.remove('neon-text-blue');
        elements.motorFanIcon.classList.remove('animate-spin-slow', 'text-blue-400');
        elements.motorFanIcon.classList.add('text-gray-400');

        elements.motorCard.classList.remove('glow-blue');
        elements.motorCard.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        showToast('Motor stopped', 'info');
    }
}


// --- Firebase Listeners & Controls ---

// Listen to System Data
const systemRef = ref(db, 'motorSystem');
onValue(systemRef, (snapshot) => {
    setConnectionStatus(true);
    updateTimestamp();

    if (snapshot.exists()) {
        const data = snapshot.val();

        // Time label for charts
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (data.air_quality !== undefined) {
            updateAirQuality(data.air_quality);
            updateChart(aqChart, timeLabel, data.air_quality);
        }

        if (data.temperature !== undefined) {
            updateTemperature(data.temperature);
            updateChart(tempChart, timeLabel, data.temperature);
        }

        if (data.vibration !== undefined) {
            updateVibration(data.vibration);
        }

        if (data.motor_on !== undefined) {
            updateMotorUI(data.motor_on);
        }

    } else {
        console.log("No data available at /motorSystem");
    }
}, (error) => {
    console.error("Firebase Read Error:", error);
    setConnectionStatus(false);
    showToast('Failed to connect to database', 'danger');
});


// Handle Motor Control Toggle
if (elements.motorToggle) {
    elements.motorToggle.addEventListener('change', (e) => {
        const desiredState = e.target.checked;

        // Write to Firebase
        const commandRef = ref(db, 'motorControl/command');
        set(commandRef, desiredState)
            .then(() => {
                console.log(`Command sent: Motor ${desiredState ? 'ON' : 'OFF'}`);
            })
            .catch((error) => {
                console.error("Firebase Write Error:", error);
                showToast('Failed to send command to motor', 'danger');
                // Revert toggle on failure
                elements.motorToggle.checked = !desiredState;
            });
    });
}

// Initial Offline state styling
setConnectionStatus(false);
