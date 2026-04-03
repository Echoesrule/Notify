
 // Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;


const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);


updateToggleIcons(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateToggleIcons(newTheme);
});

function updateToggleIcons(theme) {
    const sunIcon = themeToggle.querySelector('.fa-sun');
    const moonIcon = themeToggle.querySelector('.fa-moon');
    
    if (theme === 'light') {
        sunIcon.classList.add('active');
        moonIcon.classList.remove('active');
    } else {
        moonIcon.classList.add('active');
        sunIcon.classList.remove('active');
    }
}