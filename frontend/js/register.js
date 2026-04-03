console.log('Registering script loaded.....')
document.addEventListener('DOMContentLoaded', function() {
    postRegForm();
});

function postRegForm(){
const form=document.getElementById("registerForm");
const message=document.getElementById("registerMessage");
    if (!form){
        console.err("Could not find form in html",error);
        return;
    };

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData={
            name:form.name.value,
            email:form.email.value,
            password:form.password.value
        };

        try{
            const res=await fetch ('http://localhost:3000/user_auth/register',{
                method:'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

        const data = await res.json();
            console.log("Server Response",data);
        if (res.ok) {
            form.style.display = 'none';
            message.style.color = 'green';
            message.textContent = 'OTP sent! Check your email and enter the code below.';
            showOtpInput(form.email.value);
        } 
        else {
            message.style.color = 'red';
            message.textContent = data.message || 'Registration failed';
        }
    }
     catch (err) {
        message.style.color = 'red';
        message.textContent = 'Server error';
        console.error(err);
    }

  });
}

function showOtpInput(email) {
    const container = document.getElementById('registerMessage').parentElement;
    
    const otpForm = document.createElement('form');
    otpForm.id = 'otpForm';
    otpForm.innerHTML = `
        <input type="text" id="otpInput" placeholder="Enter 6-digit OTP" maxlength="6" required>
        <button type="submit">Verify</button>
    `;
    container.appendChild(otpForm);

    otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const otp = document.getElementById('otpInput').value;

        try {
            const res = await fetch('http://localhost:3000/user_auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();
            if (res.ok) {
                document.getElementById('registerMessage').style.color = 'green';
                document.getElementById('registerMessage').textContent = 'Verified! Redirecting to login...';
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                document.getElementById('registerMessage').style.color = 'red';
                document.getElementById('registerMessage').textContent = data.message;
            }
        } catch (err) {
            document.getElementById('registerMessage').style.color = 'red';
            document.getElementById('registerMessage').textContent = 'Verification error';
        }
    });
}
