// frontend/js/register.js
// Ensure API_URL is defined
if (typeof window.API_URL === 'undefined') {
    window.API_URL = localStorage.getItem('api_url') || 'https://notify-sxkf.onrender.com/api';
}

console.log('Register.js using API_URL:', window.API_URL);

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const message = document.getElementById('registerMessage');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: registerForm.name?.value,
            email: registerForm.email.value,
            password: registerForm.password.value,
            role: registerForm.role?.value || 'student'
        };

        try {
            const res = await fetch(`${window.API_URL}/user_auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                message.style.color = 'green';
                message.textContent = 'Registration successful! Redirecting to login...';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                message.style.color = 'red';
                message.textContent = data.message || 'Registration failed';
            }
        } catch (err) {
            console.error('Register error:', err);
            message.style.color = 'red';
            message.textContent = 'Failed to connect to server';
        }
    });
});