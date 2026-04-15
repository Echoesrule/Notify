
// frontend/js/login.js - Login functionality
// Note: API_URL is set by config.js

const API_URL = window.API_URL;

console.log('Login.js - API_URL:', API_URL);

// Popup notification function
function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('loginMessage');
    const emailInput = document.getElementById('loginEmail');
    const institutionDisplay = document.getElementById('institution-display');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    // Check institution on email blur
    if (emailInput) {
        emailInput.addEventListener('blur', async () => {
            const email = emailInput.value.trim();
            
            if (!email || !email.includes('@')) {
                institutionDisplay.style.display = 'none';
                return;
            }

            try {
                console.log('Checking institution for email:', email);
                const res = await fetch(`${API_URL}/user_auth/check-institution`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                console.log('Institution response:', data);

                if (data.found) {
                    institutionDisplay.innerHTML = `<i class="fas fa-university"></i> <strong>${data.name}</strong> detected`;
                    institutionDisplay.className = 'institution-info success';
                    institutionDisplay.style.display = 'block';
                } else {
                    institutionDisplay.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Institution <strong>${data.domain}</strong> not registered. Please contact admin.`;
                    institutionDisplay.className = 'institution-info warning';
                    institutionDisplay.style.display = 'block';
                }
            } catch (err) {
                console.error('Institution check error:', err);
                institutionDisplay.style.display = 'none';
            }
        });

        // Clear institution display when email is cleared
        emailInput.addEventListener('input', () => {
            if (!emailInput.value.includes('@')) {
                institutionDisplay.style.display = 'none';
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email?.value;
        const password = loginForm.password?.value;

        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }

        const loginUrl = `${API_URL}/user_auth/login`;
        console.log('Attempting login to:', loginUrl);

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        showNotification('Signing in...', 'info');

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
                localStorage.setItem('justLoggedIn', 'true');

                showNotification('Login successful! Redirecting...', 'success');

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
                localStorage.setItem('loginError', userData.message || 'Invalid email or password');
                showNotification(userData.message || 'Invalid email or password', 'error');
            }
        } catch (err) {
            console.error(' Login fetch error:', err);
            showNotification('Failed to connect to server. Please try again later.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
});