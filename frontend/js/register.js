// frontend/js/register.js
// Ensure API_URL is defined
if (typeof window.API_URL === 'undefined') {
    window.API_URL = 'https://notify-sxkf.onrender.com/api';
}

console.log('Register.js using API_URL:', window.API_URL);

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const message = document.getElementById('registerMessage');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const name = registerForm.name?.value;
        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const confirmPassword = registerForm.Confirmpassword?.value;

        // Validate password match
        if (password !== confirmPassword) {
            if (message) {
                message.style.color = 'red';
                message.textContent = 'Passwords do not match';
            }
            return;
        }

        // Validate password length
        if (password.length < 6) {
            if (message) {
                message.style.color = 'red';
                message.textContent = 'Password must be at least 6 characters';
            }
            return;
        }

        const formData = {
            name: name,
            email: email,
            password: password,
            role: 'student' // Default role
        };

        try {
            const res = await fetch(`${window.API_URL}/user_auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                if (message) {
                    message.style.color = 'green';
                    message.textContent = 'Registration successful! Redirecting to login...';
                }
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                if (message) {
                    message.style.color = 'red';
                    message.textContent = data.message || 'Registration failed';
                }
            }
        } catch (err) {
            console.error('Register error:', err);
            if (message) {
                message.style.color = 'red';
                message.textContent = 'Failed to connect to server';
            }
        }
    });
});