

async function getSchools() {
    try{
        const response=await fetch(`${window.API_URL}/schools`);
        if (!response.ok) throw new Error("Failed to fetch schools");
        return await response.json();
    }
    catch (err) {
        console.error("Error fetching schools:", err);
        return [];
    }
}

async function updateUserEnrollment(userId, schoolId) {
    try {
        await fetch(`${API_URL}/users/enroll-school`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, schoolId })
        });
    } catch (err) {
        console.error('Error updating enrollment:', err);
    }
}




const schoolIcons = {
    'computing': { icon: 'fa-laptop-code', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' },
    'natural': { icon: 'fa-leaf', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: '#fff' },
    'social': { icon: 'fa-users', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#fff' },
    'science': { icon: 'fa-flask', bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#fff' },
    'business': { icon: 'fa-briefcase', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' },
    'medicine': { icon: 'fa-heartbeat', bg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', color: '#fff' },
    'law': { icon: 'fa-gavel', bg: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', color: '#fff' },
    'engineering': { icon: 'fa-cogs', bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#fff' },
    'education': { icon: 'fa-graduation-cap', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#fff' },
    'arts': { icon: 'fa-palette', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', color: '#fff' },
    'default': { icon: 'fa-university', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }
};

const defaultSchoolImage = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80';

const schoolImages = {
    // Old URLs commented out
    // computing: 'url(https://i.pinimg.com/736x/1d/ff/81/1dff8198d3e2749c9907ab44060800bc.jpg)',
    // natural: 'url(https://i.pinimg.com/1200x/80/27/e1/8027e1d703307621a026dac15a69e1c4.jpg)',
    // social: 'url(https://i.pinimg.com/736x/61/6f/00/616f00a16b770266f9d9652dc1bbd638.jpg)',
    // science: 'url(https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&q=80)',
    // business: 'url(https://i.pinimg.com/1200x/c3/39/b2/c339b24fd0171d949492276a673422f6.jpg)',
    // medicine: 'url(https://i.pinimg.com/1200x/af/0e/ce/af0eced4407e9ade0813a2e71702b0d9.jpg)',
    // law: 'url(https://i.pinimg.com/1200x/e3/72/59/e37259713d2f9d7d2a22ad8b7dafca9d.jpg)',
    // engineering: 'url(https://i.pinimg.com/1200x/7b/2f/b0/7b2fb031b7f31708544ae7cb58d6c08a.jpg)',
    // education: 'url(https://i.pinimg.com/736x/e7/88/1f/e7881f718bf221f875401e9c4910335b.jpg)',
    // arts: 'url(https://i.pinimg.com/736x/61/6f/00/616f00a16b770266f9d9652dc1bbd638.jpg)',
    // default: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80)'
    
    // New Unsplash images - each tailored to the school type
    computing: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    natural: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    social: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    science: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
    business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    medicine: 'https://i.pinimg.com/736x/7e/46/2d/7e462debaf2b30815f413f98561e2e76.jpg',
    law: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
    engineering: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
    education: 'https://i.pinimg.com/736x/da/06/b2/da06b231abe068f97e8d1d37d21fec49.jpg',
    arts: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
    default: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80'
};
const defaultDescriptions = {
    'Science': 'Computer Science, Information Technology, Data Science, Software Engineering',
    'Engineering': 'Civil, Mechanical, Electrical, Electronics Engineering',
    'Business': 'Finance, Marketing, Accounting, Human Resources',
    'Health': 'Medicine, Nursing, Pharmacy, Public Health',
    'Arts': 'Literature, History, Philosophy, Languages',
    'Law': 'Constitutional Law, Criminal Law, Civil Law, International Law'
};

async function displaySchools() {
    try {
        const grid = document.getElementById('schoolsGrid');
        if (!grid) return;
        
        grid.innerHTML = `<div class="loader-container" id="lottieLoader">
            <div class="loader-ring"></div>
            <div class="loader-ring"></div>
            <div class="loader-ring"></div>
            <p>Loading Faculties...</p>
        </div>`;
        
        const schools = await getSchools();
          console.log('First school from API:', schools[0]);
    console.log('Available properties:', Object.keys(schools[0] || {}));
    console.log('courseCount:', schools[0]?.courseCount);
    console.log('studentCount:', schools[0]?.studentCount);
        
        if (!grid) return;
        
        if (schools.length === 0) {
            grid.innerHTML = `<div class="no-schools">No schools found</div>`;
            return;
        }
        
        let html = '';
        
        const currentSchoolId = localStorage.getItem('selected_school');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        schools.forEach((school, index) => {
            const deptCount = school.departments?.length || 0;
            const isEnrolled = currentSchoolId == school.id;

       

            const courseCount = school.courseCount || 0;
            const studentCount = school.studentCount || 0;
            
           


            // Find matching icon based on school name
            let iconData = schoolIcons['default'];
            const schoolNameLower = school.name?.toLowerCase() || '';
            for (const [key, value] of Object.entries(schoolIcons)) {
                if (schoolNameLower.includes(key)) {
                    iconData = value;
                    break;
                }
            }
            
            // Find matching bg image based on school name
            let bgImage = schoolImages['default'];
            const searchText = (schoolNameLower + ' ' + (school.description || '')).toLowerCase();
            for (const [key, value] of Object.entries(schoolImages)) {
                if (searchText.includes(key)) {
                    bgImage = value;
                    break;
                }
            }
            
            // Also check for partial matches
            const keywordMap = {
                'computer': 'computing',
                'tech': 'computing',
                'it': 'computing',
                'information': 'computing',
                'software': 'computing',
                'biology': 'natural',
                'agriculture': 'natural',
                'environment': 'natural',
                'physics': 'science',
                'chemistry': 'science',
                'math': 'science',
                'health': 'medicine',
                'medical': 'medicine',
                'nursing': 'medicine',
                'pharmacy': 'medicine',
                'law': 'law',
                'legal': 'law',
                'civil': 'engineering',
                'mechanical': 'engineering',
                'electrical': 'engineering',
                'architect': 'engineering',
                'management': 'business',
                'finance': 'business',
                'marketing': 'business',
                'accounting': 'business',
                'economics': 'business',
                'teacher': 'education',
                'teaching': 'education',
                'art': 'arts',
                'design': 'arts',
                'media': 'arts',
                'humanities': 'social',
                'social': 'social',
                'psychology': 'social'
            };
            
            for (const [keyword, imageKey] of Object.entries(keywordMap)) {
                if (searchText.includes(keyword)) {
                    bgImage = schoolImages[imageKey];
                    break;
                }
            }
            
            const departments = school.departments || [];
            const deptNames = departments.slice(0, 4).map(d => d.name).join(', ');
            const description = school.description || deptNames || 'Various courses and programs';
            
            const fallbackImage = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80';
            
            html += `
                <div class="school-card" data-school-id="${school.id}" data-school-name="${school.name}" style="animation-delay: ${index * 0.1}s;">
                    <div class="school-card-image" data-bg="${bgImage}" style="background-image: url('${bgImage}')" onerror="this.style.backgroundImage='url(${fallbackImage})'"></div>
                    <div class="school-card-content" data-school-id="${school.id}" data-school-name="${school.name}">
                        ${isEnrolled ? '<div class="enrolled-badge"><i class="fas fa-check-circle"></i> Enrolled</div>' : ''}
                        <div class="school-info">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div class="school-icon" style="background: ${iconData.bg};">
                                    <i class="fas ${iconData.icon}" style="color: ${iconData.color};"></i>
                                </div>
                                <div>
                                    <p class="school-hash">ID: ${school.id ? school.id.toString().slice(-8) : 'N/A'}</p>
                                    <h3>${school.name}</h3>
                                </div>
                            </div>
                            <p class="school-description">${description}</p>
                        </div>
                        <div class="school-meta">
                            <span><i class="fas fa-book-open"></i> ${courseCount} Courses</span>
                            <span><i class="fas fa-user-graduate"></i> ${studentCount} Students</span>
                        </div>
                        <button class="select-school-btn">
                            ${isEnrolled ? '<i class="fas fa-eye"></i> View Courses' : '<i class="fas fa-arrow-right"></i> Browse Courses'}
                        </button>
                    </div>
                </div>
              `;
        });
        
        grid.innerHTML = html;

        attachSchoolCardEvents();
        initScrollAnimations();
        updateSchoolInsights(schools);
        
    } catch (error) {
        console.error('Error displaying schools:', error);
        showSchoolError();
    }
}

// UPDATE INSIGHTS
async function updateSchoolInsights(schools) {
    const insightsGrid = document.getElementById('insightsGrid');
    if (!insightsGrid) return;
    
    try {
        const countsRes = await fetch(`${API_URL}/counts`);
        const counts = await countsRes.json();
        
        insightsGrid.innerHTML = `
            <div class="insight-card">
                <div class="insight-icon" style="background: #e3f2fd;">
                    <i class="fas fa-university" style="color: #1976d2;"></i>
                </div>
                <div class="insight-content">
                    <h4>Total Faculties</h4>
                    <p class="insight-value">${counts.schools || 0}</p>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon" style="background: #f3e5f5;">
                    <i class="fas fa-building" style="color: #7b1fa2;"></i>
                </div>
                <div class="insight-content">
                    <h4>Total Courses</h4>
                    <p class="insight-value">${counts.courses || 0}</p>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon" style="background: #e8f5e9;">
                    <i class="fas fa-users" style="color: #388e3c;"></i>
                </div>
                <div class="insight-content">
                    <h4>Total Students</h4>
                    <p class="insight-value">${counts.students || 0}</p>
                </div>
            </div>
            <div class="insight-card">
                <div class="insight-icon" style="background: #fff3e0;">
                    <i class="fas fa-file-pdf" style="color: #f57c00;"></i>
                </div>
                <div class="insight-content">
                    <h4>Total Notes</h4>
                    <p class="insight-value">${counts.notes || 0}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching counts:', error);
    }
}

function showEnrollNotification(message, type = 'success') {
    const existing = document.querySelector('.enroll-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `enroll-notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// SCHOOL SELECTION
async function selectSchool(schoolId, schoolName) {
    const userSchool = localStorage.getItem('selected_school');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (userSchool && userSchool != schoolId) {
        if (!await friendlyConfirm({ title: 'Switch Faculty?', message: `You are currently joined to a different faculty. Do you want to switch to ${schoolName}? Your current enrollment will be replaced.`, confirmText: 'Switch' })) {
            return;
        }
    } else if (userSchool == schoolId) {
        window.location.href = `../html/courses.html?school=${schoolId}`;
        return;
    }
    
    if (!await friendlyConfirm({ title: 'Join Faculty?', message: `Do you want to join ${schoolName}? You'll be able to view their courses and notes.`, confirmText: 'Join' })) {
        return;
    }
    
    const wasEnrolled = userSchool && userSchool != schoolId;
    
    if (user.id) {
        await updateUserEnrollment(user.id, schoolId);
    }
    
    // Clear old department/course selection when switching schools
    localStorage.removeItem('selected_department');
    localStorage.removeItem('selected_department_name');
    localStorage.removeItem('selected_course');
    localStorage.removeItem('selected_course_name');
    
    localStorage.setItem('chosen_faculty', 'true');
    localStorage.setItem('selected_school', schoolId);
    localStorage.setItem('selected_school_name', schoolName);

    // Show success notification
    showEnrollNotification(`Successfully enrolled in ${schoolName}!`);

    // Show loading briefly to let notification appear
    const contentArea = document.querySelector('.page-content');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">Loading departments for ${schoolName}...</p>
            </div>
        `;
    }
    
    // Redirect after showing notification
    setTimeout(() => {
        window.location.href = `../html/courses.html?school=${schoolId}`;
    }, 1500);
}

// ATTACH EVENTS
function attachSchoolCardEvents() {
    // Image card click
    const schoolCards = document.querySelectorAll('.school-card');
    
    schoolCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const schoolId = this.getAttribute('data-school-id');
            const schoolName = this.getAttribute('data-school-name');
            if (schoolId) selectSchool(schoolId, schoolName);
        });
    });
    
    // Content card click
    const contentCards = document.querySelectorAll('.school-card-content');
    
    contentCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.select-school-btn')) return;
            
            const schoolId = this.getAttribute('data-school-id');
            const schoolName = this.getAttribute('data-school-name');
            if (schoolId) selectSchool(schoolId, schoolName);
        });
        
        const button = card.querySelector('.select-school-btn');
        if (button) {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const schoolId = card.getAttribute('data-school-id');
                const schoolName = card.getAttribute('data-school-name');
                if (schoolId) selectSchool(schoolId, schoolName);
            });
        }
    });
}

// SHOW ERROR
function showSchoolError() {
    const grid = document.getElementById('schoolsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="error-message">
            <img src="../images/dashboardImages/Gemini_Generated_Image_gsaupdgsaupdgsau.png" alt="Error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load schools. Please try again.</p>
            <button onclick="displaySchools()" class="btn-primary btn-sm">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// FILTER SCHOOLS
function filterSchools(searchTerm) {
    const cards = document.querySelectorAll('.school-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.school-description')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || desc.includes(searchTerm)) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    const grid = document.getElementById('schoolsGrid');
    const noResults = grid.querySelector('.no-results');
    
    if (visibleCount === 0 && !noResults) {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results';
        noResultsMsg.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No schools matching "${searchTerm}"</p>
        `;
        grid.appendChild(noResultsMsg);
    } else if (noResults) {
        noResults.remove();
    }
}

function initScrollAnimations() {
    const cards = document.querySelectorAll('.school-card');
    if (!('IntersectionObserver' in window)) {
        cards.forEach(card => card.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });

    cards.forEach(card => observer.observe(card));
}

// INITIALIZE
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof getSchools !== 'function') {
        console.error('data-loader.js not loaded!');
        return;
    }
    
    await displaySchools();
    
    // Theme switcher
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function(e) {
            document.body.setAttribute('data-theme', e.target.value === 'dark' ? 'dark' : 'light');
        });
    }
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterSchools(e.target.value.toLowerCase());
        });
    }
});