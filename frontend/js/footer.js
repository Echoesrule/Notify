function includeFooter() {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        fetch('footer.html')
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
            })
            .catch(err => console.error('Error loading footer:', err));
    }
}

document.addEventListener('DOMContentLoaded', includeFooter);
