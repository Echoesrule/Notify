// frontend/js/login.js

const API_URL = 'https://notify-sxkf.onrender.com/api';

window.API_URL = API_URL;

console.log('Login.js - HARDCODED API_URL:', API_URL);

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('loginMessage');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email?.value;
        const password = loginForm.password?.value;

        if (!email || !password) {
            if (message) {
                message.style.color = 'red';
                message.textContent = 'Please enter email and password';
            }
            return;
        }

        const loginUrl = `${API_URL}/user_auth/login`;
        console.log('📡 Attempting login to:', loginUrl);

        try {
            const res = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const userData = await res.json();

            if (res.ok) {
                localStorage.setItem('notify_token', userData.token || '');
                localStorage.setItem('notify_role', userData.role || 'student');
                localStorage.setItem('user_name', userData.name || 'User');
                localStorage.setItem('user_email', userData.email || email);
                if (userData.pfp) {
                    localStorage.setItem('user_pfp', userData.pfp);
                }
                localStorage.setItem('user', JSON.stringify({
                    id: userData.id,
                    name: userData.name || 'User',
                    email: userData.email || email,
                    role: userData.role || 'student',
                    pfp: userData.pfp || null
                }));

                if (message) {
                    message.style.color = 'green';
                    message.textContent = 'Login successful! Redirecting...';
                }

                setTimeout(() => {
                    if (userData.role === 'admin') {
                        window.location.href = '../admin/admin.html';
                    } else if (userData.role === 'lecturer') {
                        window.location.href = '../admin/lecturer.html';
                    } else {
                        window.location.href = '../html/dashboard.html';
                    }
                }, 1500);
            } else {
                if (message) {
                    message.style.color = 'red';
                    message.textContent = userData.message || 'Invalid email or password';
                }
            }
        } catch (err) {
            console.error('❌ Login fetch error:', err);
            if (message) {
                message.style.color = 'red';
                message.textContent = 'Failed to connect to server. Please try again later.';
            }
        }
    });
});