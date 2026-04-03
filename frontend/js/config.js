// frontend/js/config.js
// Global API Configuration - Loads FIRST

// Set API URL based on environment
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_URL = 'http://localhost:3000/api';
} else {
    window.API_URL = 'https://notify-sxkf.onrender.com/api';
}

// Also store in localStorage for other pages
localStorage.setItem('api_url', window.API_URL);

console.log('✅ API_URL configured:', window.API_URL);
console.log('📍 Environment:', window.location.hostname);