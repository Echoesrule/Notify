console.log('updates.js loaded');

let currentUpdates = []; 

function showLoader() {
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("updatesContent");
    
    if (loader) {
        loader.classList.remove('hide');
        loader.style.display = 'flex';
    }
    if (content) {
        content.classList.remove('show');
        content.style.display = 'none';
    }
}

function showContent() {
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("updatesContent");
    
    setTimeout(() => {
        if (loader) {
            loader.classList.add('hide');
            loader.style.display = 'none';
        }
        if (content) {
            content.style.display = 'block';
            content.classList.add('show');
        }
    }, 800);
}

function getReadUpdates() {
    try {
        return JSON.parse(localStorage.getItem('readUpdates') || '[]');
    } catch {
        return [];
    }
}

function markUpdateAsRead(updateId) {
    const readUpdates = getReadUpdates();
    if (!readUpdates.includes(updateId)) {
        readUpdates.push(updateId);
        localStorage.setItem('readUpdates', JSON.stringify(readUpdates));
    }
}

function markAllAsRead() {
    currentUpdates.forEach(u => {
        markUpdateAsRead(u.id);
    });
}

async function loadUpdates() {
    console.log(' Loading updates...');
    showLoader();

    try {
        const userRole = localStorage.getItem('notify_role');
        let url;
        
        // Admin sees all updates, others see school-specific + global updates
        if (userRole === 'admin' || userRole === 'lecturer') {
            url = `${window.API_URL}/updates`;
        } else {
            const schoolId = localStorage.getItem('selected_school');
            url = `${window.API_URL}/updates?schoolId=${schoolId || ''}`;
        }

        const res = await fetch(url);

        if (!res.ok) throw new Error('Failed to fetch updates');

        const updates = await res.json();
        const readUpdates = getReadUpdates();
        
        // Mark updates as read based on localStorage
        currentUpdates = updates.map(u => ({
            ...u,
            read: readUpdates.includes(u.id)
        })); 

        displayUpdates(currentUpdates, 'all');
        updateStats(currentUpdates);
        
        // Update badge
        const unreadCount = currentUpdates.filter(u => !u.read).length;
        window.updateNotificationBadge(unreadCount);

        showContent();

    } catch (error) {
        console.error('Error loading updates:', error);
        showError();
    }
}

function displayUpdates(updates, filter = 'all') {
    const timeline = document.getElementById('updatesTimeline');

    // Calculate daysAgo for each update
    const now = new Date();
    const updatesWithDays = updates.map(u => {
        const createdAt = new Date(u.created_at);
        const diffTime = Math.abs(now - createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...u, daysAgo: diffDays - 1 };
    });

    let filteredUpdates = updatesWithDays;

    if (filter === 'today') {
        filteredUpdates = updatesWithDays.filter(u => u.daysAgo === 0);
    } else if (filter === 'week') {
        filteredUpdates = updatesWithDays.filter(u => u.daysAgo <= 7);
    } else if (filter === 'month') {
        filteredUpdates = updatesWithDays.filter(u => u.daysAgo <= 30);
    } else if (filter === 'unread') {
        filteredUpdates = updatesWithDays.filter(u => !u.read);
    }

    if (filteredUpdates.length === 0) {
        timeline.innerHTML = `
            <div class="no-updates">
                <img src="../images/dashboardImages/nodepts1.jpg" alt="No updates">
                <h3>All Caught Up!</h3>
                <p>No updates found.</p>
            </div>
        `;
        return;
    }

    const grouped = groupUpdatesByDate(filteredUpdates);
    let html = '';

    for (const [date, items] of Object.entries(grouped)) {
        html += `
            <div class="timeline-item">
                <div class="timeline-date">
                    <span> ${formatDate(date)}</span>
                </div>
        `;

        items.forEach(update => {
            const postedBy = update.postedByName || update.name || 'Unknown';
            const schoolId = update.school_id || update.schoolId;
            const courseId = update.course_id;
            
            const getCategoryStyle = (title, content) => {
                const text = ((title || '') + (content || '')).toLowerCase();
                if (text.includes('exam') || text.includes('test') || text.includes('quiz')) return { icon: 'fa-file-alt', bg: '#fef3c7', color: '#d97706', label: 'Exam' };
                if (text.includes('assignment') || text.includes('homework') || text.includes('task')) return { icon: 'fa-tasks', bg: '#dbeafe', color: '#2563eb', label: 'Assignment' };
                if (text.includes('lecture') || text.includes('note') || text.includes('material')) return { icon: 'fa-book-open', bg: '#d1fae5', color: '#059669', label: 'Lecture' };
                if (text.includes('schedule') || text.includes('time') || text.includes('class')) return { icon: 'fa-clock', bg: '#fce7f3', color: '#db2777', label: 'Schedule' };
                if (text.includes('result') || text.includes('grade') || text.includes('mark')) return { icon: 'fa-chart-line', bg: '#e0e7ff', color: '#6366f1', label: 'Results' };
                if (text.includes('notice') || text.includes('important') || text.includes('urgent')) return { icon: 'fa-exclamation-circle', bg: '#fee2e2', color: '#dc2626', label: 'Notice' };
                return { icon: 'fa-bullhorn', bg: '#e3f2fd', color: '#1976d2', label: 'Update' };
            };
            
            const cat = getCategoryStyle(update.title, update.content);
            
            html += `
<div class="update-card ${!update.read ? 'unread' : ''}">
    <div class="update-card-left">
        <div class="update-icon-box" style="background: ${cat.bg};">
            <i class="fas ${cat.icon}" style="color: ${cat.color};"></i>
        </div>
    </div>
    <div class="update-card-right">
        <div class="update-header">
            <div class="update-title-row">
                <h4>${update.title}</h4>
                ${!update.read ? '<span class="new">New</span>' : ''}
                <span class="update-category-tag" style="background: ${cat.bg}; color: ${cat.color};">${cat.label}</span>
            </div>
        </div>

        <div class="update-content">
            <p>${update.content || update.description || 'No content'}</p>
            <div class="update-meta-info">
                <small style="color: #666;"><i class="fas fa-user-circle"></i> ${postedBy}</small>
                ${update.courseName ? `<small style="color: #666;"><i class="fas fa-book"></i> ${update.courseName}</small>` : ''}
            </div>
        </div>

        <div class="update-actions">
            ${courseId ? `<button onclick="viewCourse('${schoolId}', '${courseId}')" class="btn-view"><i class="fas fa-eye"></i> View Course</button>` : ''}

            <button onclick="dismissUpdate('${update.id}', event)" class="btn-dismiss">
                <i class="fas fa-check"></i> Mark Read
            </button>
        </div>
    </div>

</div>
`;
        });

        html += '</div>';
    }

    timeline.innerHTML = html;
}

function groupUpdatesByDate(updates) {
    const grouped = {};

    updates.forEach(update => {
        const dateRaw = update.date || update.created_at || '';
        const date = dateRaw.split('T')[0] || 'Unknown';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(update);
    });

    return grouped;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) return 'Today';

    return date.toLocaleDateString();
}

function updateStats(updates) {
    const now = new Date();
    const updatesWithDays = updates.map(u => {
        const createdAt = new Date(u.created_at);
        const diffTime = Math.abs(now - createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...u, daysAgo: diffDays - 1 };
    });
    
    document.getElementById('totalUpdates').textContent = updates.length;
    document.getElementById('newToday').textContent = updatesWithDays.filter(u => u.daysAgo === 0).length;
    document.getElementById('unread').textContent = updates.filter(u => !u.read).length;
}

function viewNote(noteId, unitId, deptId, schoolId) {
    localStorage.setItem('selected_school', schoolId);
    localStorage.setItem('selected_department', deptId);
    localStorage.setItem('selected_course', unitId);
    localStorage.setItem('selected_note', noteId);

    window.location.href = 'notes.html';
}

function viewCourse(schoolId, courseId) {
    localStorage.setItem('selected_school', schoolId);
    localStorage.setItem('selected_department', courseId);
    window.location.href = 'courses.html';
}

function dismissUpdate(updateId, event) {
    const card = event.target.closest('.update-card');

    if (card) {
        markUpdateAsRead(updateId);
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            currentUpdates = currentUpdates.filter(u => u.id != updateId);
            updateStats(currentUpdates);
            const unreadCount = currentUpdates.filter(u => !u.read).length;
            window.updateNotificationBadge(unreadCount);
        }, 300);
    }
}

function showError() {
    const timeline = document.getElementById('updatesTimeline');
    timeline.innerHTML = `<p>Error loading updates</p>`;
    showContent();
}


function applyFilter(filter) {
    displayUpdates(currentUpdates, filter);
}


document.addEventListener('DOMContentLoaded', () => {
    loadUpdates();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;
            applyFilter(filter); 
        });
    });

    // Mark all read button
    document.getElementById('markAllRead')?.addEventListener('click', async () => {
        markAllAsRead();
        currentUpdates.forEach(update => {
            update.read = true;
        });
        displayUpdates(currentUpdates, 'all');
        updateStats(currentUpdates);
        window.updateNotificationBadge(0);
        showNotification('All updates marked as read');
    });

    // Refresh button
    document.getElementById('refreshUpdates')?.addEventListener('click', () => {
        loadUpdates();
    });
});