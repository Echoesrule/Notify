
let chosen_faculty = localStorage.getItem('chosen_faculty') === 'true';
let buttons = [];
const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';

// Global functions - available immediately
window.showLogoutModal = function() {
    console.log('showLogoutModal called');
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `<div style="background:var(--bg-secondary,#fff);padding:30px;border-radius:12px;text-align:center;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;color:var(--text-primary,#333);">Logout Options</h3>
        <p style="color:var(--text-secondary,#666);margin-bottom:25px;">Choose how you want to logout:</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <button onclick="logout(false)" style="padding:12px 20px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;"><i class="fas fa-user"></i> Keep My Data (Resume Later)</button>
            <button onclick="logout(true)" style="padding:12px 20px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;"><i class="fas fa-trash"></i> Clear All Data</button>
            <button onclick="this.closest('#logoutModal').remove()" style="padding:12px 20px;background:var(--bg-tertiary,#f1f5f9);color:var(--text-primary,#333);border:1px solid var(--border,#e2e8f0);border-radius:8px;cursor:pointer;font-size:15px;">Cancel</button>
        </div>
        <p style="font-size:12px;color:var(--text-tertiary,#94a3b8);margin-top:20px;">"Keep My Data" saves your enrollment, bookmarks, and preferences.</p>
    </div>`;
    document.body.appendChild(modal);
};

window.logout = function(clearData = false) {
    console.log('logout called with clearData:', clearData);
    
    if (clearData) {
        // Clear everything
        localStorage.clear();
        sessionStorage.clear();
    } else {
        // Keep user data but clear session-specific items
        const userData = {
            user: localStorage.getItem('user'),
            user_name: localStorage.getItem('user_name'),
            user_email: localStorage.getItem('user_email'),
            user_pfp: localStorage.getItem('user_pfp'),
            notify_token: localStorage.getItem('notify_token'),
            notify_role: localStorage.getItem('notify_role'),
            selected_school: localStorage.getItem('selected_school'),
            selected_school_name: localStorage.getItem('selected_school_name'),
            selected_department: localStorage.getItem('selected_department'),
            selected_department_name: localStorage.getItem('selected_department_name'),
            chosen_faculty: localStorage.getItem('chosen_faculty'),
            notifyBookmarkFolders: localStorage.getItem('notifyBookmarkFolders'),
            notifyBookmarks: localStorage.getItem('notifyBookmarks'),
            api_url: localStorage.getItem('api_url'),
            theme: localStorage.getItem('theme')
        };
        
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore user data
        Object.keys(userData).forEach(key => {
            if (userData[key]) {
                localStorage.setItem(key, userData[key]);
            }
        });
    }
    
    window.location.href = '../user_auth/index.html';
};

window.toggleProfileMenu = function() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
};

window.updateNotificationBadge = function(count = 0) {
    const notifBadge = document.getElementById('notifBadge');
    if (notifBadge) {
        notifBadge.textContent = count;
        notifBadge.style.display = count > 0 ? 'flex' : 'none';
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    includeNavigation();
    
    const justSelected = sessionStorage.getItem('just_selected_faculty');
    if (justSelected) {
        chosen_faculty = true;
        localStorage.setItem('chosen_faculty', 'true');
        sessionStorage.removeItem('just_selected_faculty');
    }
});

// ===== LOAD NAVIGATION =====
async function includeNavigation() {
    console.log('Including navigation...');

    if (document.querySelector('.sidebar')) {
        console.log('Navigation already exists');
        reinitializeAfterNavLoad();
        return;
    }

    try {
        const response = await fetch('../html/navigations.html');
        if (!response.ok) throw new Error('Failed to load navigation');

        const html = await response.text();
        const container = document.querySelector('.dashboard-cont');
        if (!container) return;

        const existingPageContent = document.querySelector('.page-content');
        container.insertAdjacentHTML('afterbegin', html);

        const mainContent = document.querySelector('.main-content');
        if (mainContent && existingPageContent) {
            mainContent.appendChild(existingPageContent);
        }

        const wrapper = document.getElementById('page-content-wrapper');
        if (wrapper) wrapper.remove();

        console.log('Navigation injected');
        
        // NOW reinitialize everything after nav is loaded
        reinitializeAfterNavLoad();

    } catch (error) {
        console.error('Failed to load navigation:', error);
    }
}

// ===== REINITIALIZE AFTER NAV LOADS =====
function reinitializeAfterNavLoad() {
    console.log('Reinitializing after nav load...');
    
    // Get buttons AFTER they exist in DOM
    buttons = document.querySelectorAll('.sidebar-nav a');
    console.log('Found', buttons.length, 'nav buttons');
    
    // Attach event listeners NOW that buttons exist
    attachNavEventListeners();
    
    // Attach logout handler
    const logoutLinks = document.querySelectorAll('a[onclick*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showLogoutModal();
        });
    });

    updateActiveLinkFromPage(currentPage);
    updateBreadcrumbs();
    updateSidebarFooter();
    updateTopbar();
    initTopSearch();
    

    initializePageScripts(currentPage);
    


        if (window.initThemeToggle) {
        window.initThemeToggle();
    }

    if (currentPage === 'logout') {
        console.log('On logout page - triggering logout');
        initLogout();
    }
    
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Mark body as loaded to hide skeleton loaders
    document.body.classList.add('loaded');
}


function initSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            const icon = menuBtn.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            if (menuBtn) {
                const icon = menuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            toggleBtn.classList.toggle('expanded');
            
            const icon = toggleBtn.querySelector('i') || toggleBtn;
            if (sidebar.classList.contains('expanded')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
            
            if (mainContent) {
                if (sidebar.classList.contains('expanded')) {
                    mainContent.style.marginLeft = '220px';
                    mainContent.style.width = 'calc(100% - 220px)';
                } else {
                    mainContent.style.marginLeft = '80px';
                    mainContent.style.width = 'calc(100% - 80px)';
                }
            }
        });
    }
}


function attachNavEventListeners() {
    buttons.forEach(button => {

        button.removeEventListener('click', handleNavClick);
        button.addEventListener('click', handleNavClick);
    });
}


function handleNavClick(event) {
    event.preventDefault();
    
    const page = this.getAttribute('data-page');
    console.log('Nav clicked:', page);

    if (page === 'logout') {
        console.log('Logout clicked');
        handleLogout();
        return;
    }

    if (page === currentPage) {
        console.log(`Already on ${page} page`);
        return;
    }

    if (page) {
        updateActiveLink(this);
        window.location.href = `../html/${page}.html`;
    }
}

// ===== LOGOUT FUNCTIONS =====
function initLogout() {
    console.log('Logout page initialized');
    handleLogout();
}

function handleLogout() {
    // Redirect to showLogoutModal instead
    showLogoutModal();
}

function showLogoutMessage() {
    const contentArea = document.querySelector('.page-content');
    if (!contentArea) return;
    
    contentArea.innerHTML = `
        <div class="logout-container">
            <i class="fas fa-check-circle logout-icon"></i>
            <h3>Logged Out Successfully</h3>
            <p>You have been successfully logged out.</p>
            <p class="redirect-message">
                <i class="fas fa-spinner fa-spin"></i> 
                Redirecting to login page...
            </p>
        </div>
    `;
}

// ===== PAGE CONTENT LOADING =====
async function loadPageContent(page) {
    try {
        if (page === 'schools') {
            await loadSchoolsPage();
            return;
        }
        
        if (!chosen_faculty && page !== 'dashboard') {
            showError('Please select a faculty first');
            setTimeout(() => window.location.href = '../html/schools.html', 2000);
            return;
        }
        
        const response = await fetch(`${page}.html`);
        if (!response.ok) throw new Error('Failed to load page');
        
        const html = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newContent = tempDiv.querySelector('.page-content');
        
        const targetContent = document.querySelector('.page-content');
        if (targetContent) {
            if (newContent) {
                targetContent.innerHTML = newContent.innerHTML;
            } else {
                targetContent.innerHTML = html;
            }
        }
        
        initializePageScripts(page);
        history.pushState({ page: page }, '', `${page}.html`);
        
    } catch (error) {
        console.error('Error loading page:', error);
        showError('Failed to load page. Please try again later.');
    }
}

async function loadSchoolsPage() {
    const response = await fetch('schools.html');
    if (!response.ok) throw new Error('Failed to load schools');
    
    const html = await response.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const newContent = tempDiv.querySelector('.page-content');
    
    const targetContent = document.querySelector('.page-content');
    if (targetContent) {
        if (newContent) {
            targetContent.innerHTML = newContent.innerHTML;
        } else {
            targetContent.innerHTML = html;
        }
    }
    
    attachSchoolCardEvents();
}

// ===== PAGE INITIALIZERS =====
function initializePageScripts(page) {
    console.log('Initializing scripts for:', page);
    
    const initializers = {
        'dashboard': initDashboard,
        'schools': initSchools,
        'courses': initCourses,
        'units': initUnits,
        'notes': initNotes,
        'updates': initUpdates,
        'search': initSearch,
        'bookmarks': initBookmarks,
        'settings': initSettings,
        'logout': initLogout
    };
    
    const initFunction = initializers[page];
    if (initFunction) {
        initFunction();
    } else {
        console.log(`No initializer for: ${page}`);
    }
}

// ===== PAGE-SPECIFIC INITIALIZERS =====
function initDashboard() { console.log('Dashboard initialized'); }
function initSchools() { attachSchoolCardEvents(); }
function initCourses() { validateSchoolSelected(); }
function initUnits() { console.log('Units initialized'); }
function initNotes() { console.log('Notes initialized'); }
function initUpdates() { console.log('Updates initialized'); }
function initSearch() { console.log('Search initialized'); }
function initBookmarks() { console.log('Bookmarks initialized'); }
function initSettings() { console.log('Settings initialized'); }

function validateSchoolSelected() {
    const selectedSchool = localStorage.getItem('selected_school');
    if (!selectedSchool) {
        showError('Please select a school first');
        setTimeout(() => window.location.href = '../html/schools.html', 2000);
    }
}

// ===== SCHOOL CARDS =====
function attachSchoolCardEvents() {
    const schoolCards = document.querySelectorAll('.school-card');
    schoolCards.forEach(card => {
        card.addEventListener('click', function() {
            setFacultyChosen();
            
            const schoolName = this.querySelector('h3')?.textContent || 'School';
            const schoolId = this.getAttribute('data-id');
            
            if (schoolId) localStorage.setItem('selected_school', schoolId);
            localStorage.setItem('selected_school_name', schoolName);
            
            setTimeout(() => window.location.href = '../html/courses.html', 500);
        });
    });
}

function setFacultyChosen() {
    chosen_faculty = true;
    localStorage.setItem('chosen_faculty', 'true');
}

// ===== UI UPDATES =====
function updateActiveLink(activeButton) {
    buttons.forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
}

function updateActiveLinkFromPage(page) {
    buttons.forEach(button => {
        const buttonPage = button.getAttribute('data-page');
        button.classList.toggle('active', buttonPage === page);
    });
}

function updateBreadcrumbs() {
    const breadCrumbsContainer = document.querySelector('.breadcrumbs');
    if (!breadCrumbsContainer) return;

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const schoolName = localStorage.getItem('selected_school_name') || 'Faculty';
    const deptName = localStorage.getItem('selected_department_name') || 'Department';
    const unitName = localStorage.getItem('selected_subject_name') || 'Subject';
    
    const pageNames = {
        'dashboard': 'Dashboard',
        'schools': 'Faculties',
        'courses': 'My Courses',
        'units': 'My Units',
        'notes': 'My Notes',
        'updates': 'Updates',
        'search': 'Search Notes',
        'bookmarks': 'Bookmarks',
        'settings': 'Settings',
        'logout': 'Logout'
    };

    let breadHtml = '<a href="dashboard.html">Home</a>';
    breadHtml += '<i class="fas fa-chevron-right"></i>';

    if (currentPage === 'schools') {
        breadHtml += '<span>Faculties</span>';
    } else if (currentPage === 'courses') {
        breadHtml += `<a href="schools.html">${schoolName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<span>${pageNames[currentPage]}</span>`;
    } else if (currentPage === 'units') {
        breadHtml += `<a href="schools.html">${schoolName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<a href="courses.html">${deptName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<span>${pageNames[currentPage]}</span>`;
    } else if (currentPage === "notes") {
        breadHtml += `<a href="schools.html">${schoolName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<a href="courses.html">${deptName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<a href="units.html">${unitName}</a>`;
        breadHtml += '<i class="fas fa-chevron-right"></i>';
        breadHtml += `<span>${pageNames[currentPage]}</span>`;
    } else {
        breadHtml += `<span>${pageNames[currentPage] || currentPage}</span>`;
    }

    breadCrumbsContainer.innerHTML = breadHtml;
}

function updateSidebarFooter() {
    const footer = document.getElementById('sidebarFooter');
    const schoolName = localStorage.getItem('selected_school_name');
    if (footer && schoolName) footer.innerHTML = schoolName;
}

function updateTopbar() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('notify_role') || 'student';
    let userPfp = localStorage.getItem('user_pfp') || '';
    
    const userNameEl = document.getElementById('topUserName');
    const userRoleEl = document.getElementById('topUserRole');
    const menuUserName = document.getElementById('menuUserName');
    const menuUserRole = document.getElementById('menuUserRole');
    const notifBadge = document.getElementById('notifBadge');
    const profileImg = document.getElementById('profileImg');
    
    const displayName = user.name || 'User';
    const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
    
    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    if (userRoleEl) {
        userRoleEl.textContent = displayRole;
    }
    if (menuUserName) {
        menuUserName.textContent = displayName;
    }
    if (menuUserRole) {
        menuUserRole.textContent = displayRole;
    }
    if (profileImg) {
        if (userPfp) {
            let pfpUrl = userPfp;
            if (userPfp.startsWith('/uploads/')) {
                pfpUrl = (window.BASE_URL || window.location.origin) + userPfp;
            } else if (userPfp.startsWith('http')) {
                pfpUrl = userPfp;
            }
            profileImg.src = pfpUrl;
        } else {
            profileImg.src = '../images/dashboardImages/v3321_68.png';
        }
    }
    
    fetch(`${window.API_URL}/updates`)
        .then(r => r.json())
        .then(updates => {
            // Get read updates from localStorage
            let readUpdates = [];
            try {
                readUpdates = JSON.parse(localStorage.getItem('readUpdates') || '[]');
            } catch {}
            
            // Filter out read updates
            const unreadUpdates = updates.filter(u => !readUpdates.includes(u.id));
            
            if (notifBadge) {
                notifBadge.textContent = unreadUpdates.length || 0;
                notifBadge.style.display = unreadUpdates.length > 0 ? 'flex' : 'none';
            }
        })
        .catch(() => {});
}

function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

let topSearchTimeout;
function handleTopSearch(query, event) {
    if (event && event.key === 'Enter') {
        if (query.length > 0) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    } else {
        clearTimeout(topSearchTimeout);
        if (query.length > 2) {
            topSearchTimeout = setTimeout(() => {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }, 500);
        }
    }
}

function initTopSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            handleTopSearch(this.value, event);
        });
    }
}

// ===== ERROR HANDLING =====
function showError(message) {
    const contentArea = document.querySelector('.page-content');
    if (!contentArea) return;
    
    contentArea.innerHTML = `
        <div class="error-container">
            <i class="fas fa-exclamation-triangle error-icon"></i>
            <h3 class="error-title">Oops!</h3>
            <p class="error-message">${message}</p>
            <button class="btn-primary retry-button" onclick="window.location.reload()">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// ===== STYLES =====
const style = document.createElement('style');
style.textContent = `
    .error-container {
        text-align: center;
        padding: 60px 20px;
        background: var(--card-bg, #ffffff);
        border-radius: 12px;
        margin: 20px;
        box-shadow: var(--card-shadow, 0 2px 4px rgba(0,0,0,0.05));
    }
    
    .error-icon {
        font-size: 4rem;
        color: var(--error, #ef4444);
        margin-bottom: 20px;
    }
    
    .error-title {
        font-size: 1.5rem;
        margin-bottom: 10px;
        color: var(--text-primary, #1e293b);
    }
    
    .error-message {
        color: var(--text-secondary, #64748b);
        margin-bottom: 20px;
    }
    
    .retry-button {
        padding: 10px 24px;
        background: var(--primary, #2563eb);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
    }
    
    .logout-container {
        text-align: center;
        padding: 80px 20px;
        background: var(--card-bg, #ffffff);
        border-radius: 12px;
        margin: 40px 20px;
    }
    
    .logout-icon {
        font-size: 4rem;
        color: var(--success, #10b981);
        margin-bottom: 20px;
    }
    
    .redirect-message {
        color: var(--text-tertiary, #94a3b8);
        font-size: 0.9rem;
        margin-top: 20px;
    }
`;

document.head.appendChild(style);

// ===== BROWSER HISTORY =====
window.addEventListener('popstate', function(event) {
    const page = event.state ? event.state.page : 'dashboard';
    updateActiveLinkFromPage(page);
    loadPageContent(page);
});

// Close profile menu when clicking outside
document.addEventListener('click', function(e) {
    const profile = document.getElementById('profileDropdown');
    const menu = document.getElementById('profileMenu');
    if (profile && menu && !profile.contains(e.target)) {
        menu.classList.remove('show');
    }
});

// ===== ADDITIONAL STYLES =====
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .profile-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--card-bg, #fff);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 160px;
        display: none;
        z-index: 1000;
    }
    .profile-menu.show {
        display: block;
    }
    .profile-menu a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        color: var(--text-primary, #1e293b);
        text-decoration: none;
        transition: background 0.2s;
    }
    .profile-menu a:hover {
        background: var(--bg-tertiary, #f1f5f9);
    }
    .profile-menu a:first-child {
        border-radius: 8px 8px 0 0;
    }
    .profile-menu a:last-child {
        border-radius: 0 0 8px 8px;
        color: var(--error, #ef4444);
    }
    .notif-badge {
        display: flex !important;
    }
`;
document.head.appendChild(additionalStyles);