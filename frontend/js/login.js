document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const message = document.getElementById('loginMessage');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            const res = await fetch(`${window.API_URL}/user_auth/login`, {
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

                message.style.color = 'green';
                message.textContent = 'Login successful! Redirecting...';

                

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
                message.style.color = 'red';
                message.textContent = userData.message || 'Invalid email or password';
            }
        } catch (err) {
            console.error(err);
            message.style.color = 'red';
            message.textContent = 'Failed please try again later';
        }
    });
});