
console.log('Init DOM')
document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
});

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.log('Theme toggle not found on this page');
        return;
    }
    
    console.log('Theme toggle found, attaching event listener...');
    
    const html = document.documentElement;
    

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateToggleIcons(themeToggle, savedTheme);
    

    themeToggle.removeEventListener('click', handleThemeClick);
    
 
    themeToggle.addEventListener('click', handleThemeClick);
    
    function handleThemeClick(e) {
        e.preventDefault();
        console.log('Theme toggle clicked');
        
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        console.log('Switching from', currentTheme, 'to', newTheme);
        
 
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleIcons(themeToggle, newTheme);
        

        showThemeNotification(newTheme);
    }
}

function updateToggleIcons(toggle, theme) {
    const sunIcon = toggle.querySelector('.fa-sun');
    const moonIcon = toggle.querySelector('.fa-moon');
    
    if (!sunIcon || !moonIcon) {
        console.warn('Icons not found in toggle');
        return;
    }
    
    if (theme === 'light') {
        sunIcon.classList.add('active');
        moonIcon.classList.remove('active');
        console.log('Light mode icons activated');
    } else {
        moonIcon.classList.add('active');
        sunIcon.classList.remove('active');
        console.log('Dark mode icons activated');
    }
}

function showThemeNotification(theme) {
    const message = theme === 'light' ? 'Light mode activated' : 'Dark mode activated';
    
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        right:0;
        background: var(--success, #35eb25);
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 1000);
}

window.initThemeToggle = initThemeToggle;