// frontend/js/config.js
// Global API Configuration - Loads FIRST

// Set API URL based on environment
const hostname = window.location.hostname;
let apiUrl;

if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiUrl = 'http://localhost:3000/api';
} else {
    // Production - use the same host for both API and static files
    const protocol = window.location.protocol;
    apiUrl = `${protocol}//${hostname}/api`;
}

// Also extract base URL for static files (images, uploads)
const baseUrl = apiUrl.replace(/\/api$/, '');

window.API_URL = apiUrl;
window.BASE_URL = baseUrl;

console.log('✅ API_URL configured:', window.API_URL);
console.log('✅ BASE_URL configured:', window.BASE_URL);
console.log('📍 Environment:', hostname);