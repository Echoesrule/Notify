const API_BASE = window.API_URL ? window.API_URL.replace('/api', '') : 'http://localhost:3000';

const sectionNames = {
    'home': 'Home',
    'users': 'Manage Users',
    'institutions': 'Universities',
    'schools': 'Schools/Faculties',
    'courses': 'Courses',
    'units': 'Units',
    'reports': 'Reports',
    'notes': 'Notes',
    'updates': 'Updates',
    'settings': 'Settings'
};

function showLoader() {
    const loader = document.getElementById("lottieLoader");
    if (loader) loader.style.display = 'flex';
}

function showContent() {
    setTimeout(() => {
        const loader = document.getElementById("lottieLoader");
        if (loader) loader.style.display = 'none';
    }, 1000);
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    document.getElementById('breadcrumb').textContent = sectionNames[sectionId] || sectionId;

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === sectionId) link.classList.add('active');
    });

    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    }

    loadSectionData(sectionId);
}

async function loadSectionData(sectionId) {
    if (sectionId === 'settings') return;

    if (sectionId === 'home') {
        document.getElementById('skeletonHome').style.display = 'block';
    } else {
        showLoader();
    }

    const token = localStorage.getItem('notify_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        switch (sectionId) {
            case 'home':         await loadDashboardStats(headers); break;
            case 'users':        await loadUsers(headers);          break;
            case 'institutions': await loadInstitutions(headers);   break;
            case 'schools':      await loadSchools(headers);        break;
            case 'courses':
                await loadCourses(headers);
                await loadSchoolsForSelect(headers);
                break;
            case 'units':   await loadUnits(headers);   break;
            case 'notes':   await loadNotes(headers);   break;
            case 'updates': await loadUpdates(headers); break;
        }
    } catch (err) {
        console.error('Error loading section:', err);
    } finally {
        if (sectionId === 'home') {
            setTimeout(() => {
                document.getElementById('skeletonHome').style.display = 'none';
            }, 500);
        } else {
            showContent();
        }
    }
}

async function loadDashboardStats(headers) {
    try {
        const [usersRes, instRes, notesRes, updatesRes] = await Promise.all([
            fetch(`${API_BASE}/api/admin/users`,    { headers }),
            fetch(`${API_BASE}/api/admin/institutions`, { headers }),
            fetch(`${API_BASE}/api/admin/notes`,    { headers }),
            fetch(`${API_BASE}/api/admin/updates`,  { headers })
        ]);

        const users        = await usersRes.json();
        const institutions = await instRes.json();
        const notes        = await notesRes.json();
        const updates      = await updatesRes.json();

        document.getElementById('totalUsers').textContent        = Array.isArray(users)        ? users.length        : 0;
        document.getElementById('totalInstitutions').textContent = Array.isArray(institutions) ? institutions.length : 0;
        document.getElementById('totalNotes').textContent        = Array.isArray(notes)        ? notes.length        : 0;
        document.getElementById('totalUpdates').textContent      = Array.isArray(updates)      ? updates.length      : 0;

        document.getElementById('skeletonHome')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

async function loadUsers(headers) {
    try {
        const res   = await fetch(`${API_BASE}/api/admin/users`, { headers });
        const users = await res.json();
        const tbody = document.getElementById('userList');
        if (tbody) {
            tbody.innerHTML = users.map(user => {
                const role = user.role || 'student';
                return `
                <tr>
                    <td>${user.name  || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="role-badge ${role}">${role}</span></td>
                    <td>${user.schoolName || user.institutionName || 'N/A'}</td>
                    <td class="action-buttons">
                        ${role === 'student'  ? `<button class="btn-sm promote-btn" onclick="promoteUser('${user.id}', 'lecturer')" title="Promote to Lecturer"><i class="fas fa-user-plus"></i></button>` : ''}
                        ${role === 'lecturer' ? `<button class="btn-sm promote-btn" onclick="promoteUser('${user.id}', 'admin')"    title="Promote to Admin"><i class="fas fa-crown"></i></button>`    : ''}
                        ${role !== 'admin'    ? `<button class="btn-sm" onclick="editUser('${user.id}')"   title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                        <button class="btn-sm btn-danger" onclick="deleteUser('${user.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

function filterUsers() {
    const search     = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    document.querySelectorAll('#userList tr').forEach(row => {
        const text       = row.textContent.toLowerCase();
        const showSearch = text.includes(search);
        const showRole   = !roleFilter || text.includes(roleFilter);
        row.style.display = (showSearch && showRole) ? '' : 'none';
    });
}

async function loadInstitutions(headers) {
    try {
        const res          = await fetch(`${API_BASE}/api/admin/institutions`, { headers });
        const institutions = await res.json();
        const container    = document.getElementById('institutionList');
        if (container) {
            container.innerHTML = institutions.map(inst => `
                <div class="institution-card">
                    <h3>${inst.name}</h3>
                    <p>Staff Domain: ${inst.staff_domain   || 'N/A'}</p>
                    <p>Student Domain: ${inst.student_domain || 'N/A'}</p>
                    <button class="btn-sm" onclick="editInstitution('${inst.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="deleteInstitution('${inst.id}')"><i class="fas fa-trash"></i></button>
                </div>`
            ).join('');
        }
    } catch (err) {
        console.error('Error loading institutions:', err);
    }
}

async function loadSchools(headers) {
    try {
        const res       = await fetch(`${API_BASE}/api/admin/schools`, { headers });
        const schools   = await res.json();
        const container = document.getElementById('schoolList');
        if (container) {
            container.innerHTML = schools.map(school => `
                <div class="institution-card">
                    <h3>${school.name}</h3>
                    <p>Students: ${school.studentCount || 0} | Courses: ${school.courseCount || 0} | Notes: ${school.noteCount || 0}</p>
                    <button class="btn-sm" onclick="editSchool('${school.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="deleteSchool('${school.id}')"><i class="fas fa-trash"></i></button>
                </div>`
            ).join('');
        }
        document.getElementById('skeletonSchools')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading schools:', err);
    }
}

async function loadCourses(headers) {
    try {
        const res       = await fetch(`${API_BASE}/api/admin/courses`, { headers });
        const courses   = await res.json();
        const container = document.getElementById('courseList');
        if (container) {
            container.innerHTML = courses.map(course => `
                <div class="course-card">
                    <h3>${course.name}</h3>
                    <p>${course.schoolName || 'N/A'}</p>
                    <p>Students: ${course.studentCount || 0} | Units: ${course.unitCount || 0} | Notes: ${course.noteCount || 0}</p>
                    <button class="btn-sm" onclick="editCourse('${course.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i></button>
                </div>`
            ).join('');
        }
        await loadSchoolsForSelect(headers);
        document.getElementById('skeletonCourses')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading courses:', err);
    }
}

async function loadSchoolsForSelect(headers) {
    try {
        const res     = await fetch(`${API_BASE}/api/admin/schools`, { headers });
        const schools = await res.json();
        const select  = document.getElementById('courseSchoolSelect');
        if (select) {
            select.innerHTML = '<option value="">Select School</option>' +
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading schools for select:', err);
    }
}

async function loadUnits(headers) {
    try {
        const res       = await fetch(`${API_BASE}/api/admin/units`, { headers });
        const units     = await res.json();
        const container = document.getElementById('unitList');
        if (container) {
            container.innerHTML = units.map(unit => `
                <div class="course-card">
                    <h3>${unit.name}</h3>
                    <p>Code: ${unit.code || 'N/A'} | Course: ${unit.courseName || 'N/A'} | School: ${unit.schoolName || 'N/A'}</p>
                    <p>Notes: ${unit.noteCount || 0}</p>
                    <button class="btn-sm" onclick="editUnit('${unit.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="deleteUnit('${unit.id}')"><i class="fas fa-trash"></i></button>
                </div>`
            ).join('');
        }
        document.getElementById('skeletonUnits')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading units:', err);
    }
}

async function loadNotes(headers) {
    try {
        const res       = await fetch(`${API_BASE}/api/admin/notes`, { headers });
        const notes     = await res.json();
        const container = document.getElementById('notesList');
        if (container) {
            container.innerHTML = notes.map(note => `
                <div class="note-card">
                    <h3>${note.title}</h3>
                    <p>Course: ${note.courseName   || 'N/A'}</p>
                    <p>School: ${note.schoolName   || 'N/A'}</p>
                    <p>Uploaded by: ${note.uploadedByName || 'N/A'}</p>
                    <small>${new Date(note.created_at).toLocaleDateString()}</small>
                    <div class="note-actions">
                        <button class="btn-sm" onclick="viewNote('${note.id}')"><i class="fas fa-eye"></i></button>
                        <button class="btn-sm btn-danger" onclick="deleteNote('${note.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`
            ).join('');
        }
        document.getElementById('skeletonNotes')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading notes:', err);
    }
}

async function loadUpdates(headers) {
    try {
        const res       = await fetch(`${API_BASE}/api/admin/updates`, { headers });
        const updates   = await res.json();
        const container = document.getElementById('updatesList');
        if (container) {
            container.innerHTML = updates.map(update => `
                <div class="update-card">
                    <h3>${update.title}</h3>
                    <p>${update.content}</p>
                    <small>Posted by: ${update.postedByName || 'Unknown'} | ${new Date(update.created_at).toLocaleDateString()}</small>
                    <button class="btn-sm" onclick="editUpdate('${update.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="deleteUpdate('${update.id}')"><i class="fas fa-trash"></i></button>
                </div>`
            ).join('');
        }
        document.getElementById('skeletonUpdates')?.classList.add('hidden');
    } catch (err) {
        console.error('Error loading updates:', err);
    }
}

// =====================
// CRUD ACTIONS
// =====================

async function editUser(userId) {
    const newRole = prompt('Enter new role (student, lecturer, admin):');
    if (newRole && ['student', 'lecturer', 'admin'].includes(newRole)) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) { alert('User role updated successfully!'); loadSectionData('users'); }
            else alert('Failed to update user role');
        } catch (err) { console.error('Error updating user:', err); }
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('User deleted successfully!'); loadSectionData('users'); }
            else alert('Failed to delete user');
        } catch (err) { console.error('Error deleting user:', err); }
    }
}

async function promoteUser(userId, newRole) {
    const token = localStorage.getItem('notify_token');
    try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/promote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role: newRole })
        });
        if (res.ok) { alert(`User promoted to ${newRole}!`); loadSectionData('users'); }
        else alert('Failed to promote user');
    } catch (err) { console.error('Error promoting user:', err); }
}

async function editInstitution(institutionId) {
    const name = prompt('Enter new university/institution name:');
    if (name) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/institutions/${institutionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            });
            if (res.ok) { alert('University updated!'); loadSectionData('institutions'); }
        } catch (err) { console.error(err); }
    }
}

async function deleteInstitution(institutionId) {
    if (confirm('Delete this university/institution?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/institutions/${institutionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('University deleted!'); loadSectionData('institutions'); }
        } catch (err) { console.error(err); }
    }
}

async function editSchool(schoolId) {
    const name = prompt('Enter new school name:');
    if (name) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/schools/${schoolId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            });
            if (res.ok) { alert('School updated!'); loadSectionData('schools'); }
        } catch (err) { console.error(err); }
    }
}

async function deleteSchool(schoolId) {
    if (confirm('Delete this school/faculty?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/schools/${schoolId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('School deleted!'); loadSectionData('schools'); }
        } catch (err) { console.error(err); }
    }
}

async function editCourse(courseId) {
    const name = prompt('Enter new course name:');
    if (name) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/courses/${courseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            });
            if (res.ok) { alert('Course updated!'); loadSectionData('courses'); }
        } catch (err) { console.error(err); }
    }
}

async function deleteCourse(courseId) {
    if (confirm('Delete this course?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/courses/${courseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('Course deleted!'); loadSectionData('courses'); }
        } catch (err) { console.error(err); }
    }
}

async function editUnit(unitId) {
    const name = prompt('Enter new unit name:');
    if (name) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/units/${unitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            });
            if (res.ok) { alert('Unit updated!'); loadSectionData('units'); }
        } catch (err) { console.error(err); }
    }
}

async function deleteUnit(unitId) {
    if (confirm('Delete this unit?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/units/${unitId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('Unit deleted!'); loadSectionData('units'); }
        } catch (err) { console.error(err); }
    }
}

function viewNote(noteId) {
    window.open(`../html/notes.html?id=${noteId}`, '_blank');
}

async function deleteNote(noteId) {
    if (confirm('Delete this note?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('Note deleted!'); loadSectionData('notes'); }
        } catch (err) { console.error(err); }
    }
}

async function editUpdate(updateId) {
    const title   = prompt('Enter new title:');
    const content = prompt('Enter new content:');
    if (title && content) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/updates/${updateId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, content })
            });
            if (res.ok) { alert('Update edited!'); loadSectionData('updates'); }
        } catch (err) { console.error(err); }
    }
}

async function deleteUpdate(updateId) {
    if (confirm('Delete this update?')) {
        const token = localStorage.getItem('notify_token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/updates/${updateId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { alert('Update deleted!'); loadSectionData('updates'); }
        } catch (err) { console.error(err); }
    }
}

// =====================
// AUTH / PROFILE
// =====================

function logout(clearData = false) {
    if (clearData) {
        localStorage.clear();
    } else {
        const school     = localStorage.getItem('selected_school');
        const schoolName = localStorage.getItem('selected_school_name');
        const user       = localStorage.getItem('user');
        const role       = localStorage.getItem('notify_role');
        const theme      = localStorage.getItem('theme');
        localStorage.clear();
        if (school)     localStorage.setItem('selected_school',      school);
        if (schoolName) localStorage.setItem('selected_school_name', schoolName);
        if (user)       localStorage.setItem('user',                 user);
        if (role)       localStorage.setItem('notify_role',          role);
        if (theme)      localStorage.setItem('theme',                theme);
    }
    window.location.href = '../user_auth/index.html';
}

function showLogoutModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:var(--bg-secondary,#fff);padding:30px;border-radius:12px;text-align:center;max-width:400px;">
            <h3 style="margin-top:0;">Logout Options</h3>
            <p>Choose how you want to logout:</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <button onclick="logout(false)" style="padding:12px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;">Keep My Data (Resume Later)</button>
                <button onclick="logout(true)"  style="padding:12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">Clear All Data</button>
                <button onclick="this.closest('[style]').remove()" style="padding:12px;background:var(--bg-tertiary,#f1f5f9);border:1px solid var(--border);border-radius:8px;cursor:pointer;">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) menu.classList.toggle('active');
}

document.addEventListener('click', function(e) {
    const profile = document.getElementById('profileDropdown');
    const menu    = document.getElementById('profileMenu');
    if (profile && menu && !profile.contains(e.target)) menu.classList.remove('active');
});

function toggleTheme() {
    const html     = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function initSidebarToggle() {
    const toggleBtn    = document.getElementById('sidebarToggleBtn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar      = document.querySelector('.sidebar');
    const overlay      = document.getElementById('sidebarOverlay');

    function isMobile() { return window.innerWidth <= 768; }

    function toggleSidebar() {
        if (isMobile()) {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('expanded');
            if (toggleBtn) toggleBtn.classList.toggle('expanded');
        }
    }

    if (toggleBtn   && sidebar) toggleBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuBtn && sidebar) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    window.addEventListener('resize', () => {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    });
}

function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function loadUserDataForSettings() {
    const user      = JSON.parse(localStorage.getItem('user') || '{}');
    const userName  = localStorage.getItem('user_name')  || '';
    const userEmail = localStorage.getItem('user_email') || '';
    const userPfp   = localStorage.getItem('user_pfp')   || '';

    const nameInput  = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const adminIdInput = document.getElementById('adminId');

    if (nameInput)    nameInput.value  = userName;
    if (emailInput)   emailInput.value = userEmail;
    if (adminIdInput && user.id) adminIdInput.value = 'ADM' + String(user.id).padStart(4, '0');

    const topPfp = document.getElementById('profileImg');
    if (topPfp && userPfp) topPfp.src = `${API_BASE}${userPfp}`;

    const updatePasswordBtn = document.getElementById('updatePassword');
    if (updatePasswordBtn) updatePasswordBtn.onclick = handleAdminPasswordChange;
}

async function handleAdminPasswordChange() {
    const current = document.getElementById('currentPassword').value;
    const newPwd  = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!current || !newPwd || !confirm) { alert('Please fill all password fields'); return; }
    if (newPwd !== confirm)              { alert('New passwords do not match');       return; }
    if (newPwd.length < 8)              { alert('Password must be at least 8 characters'); return; }

    const token = localStorage.getItem('notify_token');
    try {
        const res  = await fetch(`${API_BASE}/user_auth/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Password updated successfully!');
            ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                document.getElementById(id).value = '';
            });
        } else {
            alert(data.message || 'Failed to update password');
        }
    } catch (err) { alert('Error connecting to server'); }
}

async function saveAdminSettings() {
    const token = localStorage.getItem('notify_token');
    const name  = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;

    try {
        const res  = await fetch(`${API_BASE}/user_auth/update-profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Settings saved successfully!');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.name  = name;
            user.email = email;
            localStorage.setItem('user',       JSON.stringify(user));
            localStorage.setItem('user_name',  name);
            localStorage.setItem('user_email', email);

            const userNameEl    = document.getElementById('userName');
            const topUserNameEl = document.getElementById('topUserName');
            if (userNameEl)    userNameEl.textContent    = name;
            if (topUserNameEl) topUserNameEl.textContent = name;
        } else {
            alert(data.message || 'Failed to save settings');
        }
    } catch (err) { alert('Error connecting to server'); }
}

function loadAdminPfp() {
    const savedPfp   = localStorage.getItem('user_pfp');
    const defaultPfp = '../images/dashboardImages/v3321_68.png';

    const profileImg = document.getElementById('profileImage');
    if (profileImg) profileImg.src = savedPfp ? `${API_BASE}${savedPfp}` : defaultPfp;

    const topPfp = document.getElementById('profileImg');
    if (topPfp)   topPfp.src = savedPfp ? `${API_BASE}${savedPfp}` : defaultPfp;

    const changePfpBtn = document.getElementById('changeProfileImage');
    if (changePfpBtn) {
        changePfpBtn.onclick = async () => {
            const input  = document.createElement('input');
            input.type   = 'file';
            input.accept = 'image/jpeg,image/png';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert('File too large. Max 2MB'); return; }

                const token    = localStorage.getItem('notify_token');
                const formData = new FormData();
                formData.append('pfp', file);

                try {
                    const res = await fetch(`${API_BASE}/api/user/pfp`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (res.ok) {
                        const data    = await res.json();
                        localStorage.setItem('user_pfp', data.pfp);
                        const pfpImg  = document.getElementById('profileImage');
                        const topPfpEl = document.getElementById('profileImg');
                        if (pfpImg)   pfpImg.src   = `${API_BASE}${data.pfp}`;
                        if (topPfpEl) topPfpEl.src = `${API_BASE}${data.pfp}`;
                        alert('Profile picture updated!');
                    } else {
                        alert('Failed to upload image');
                    }
                } catch (err) { alert('Error uploading image'); }
            };
            input.click();
        };
    }
}

// =====================
// DOMContentLoaded
// =====================
document.addEventListener('DOMContentLoaded', function () {
    initSidebarToggle();
    loadUserDataForSettings();
    loadAdminPfp();

    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) saveSettingsBtn.onclick = saveAdminSettings;

    // Institution form
    const institutionForm = document.getElementById('institutionForm');
    if (institutionForm) {
        institutionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token    = localStorage.getItem('notify_token');
            const formData = new FormData(institutionForm);
            try {
                const res = await fetch(`${API_BASE}/api/admin/institutions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name:           formData.get('name'),
                        staff_domain:   formData.get('staffDomain'),
                        student_domain: formData.get('studentDomain')
                    })
                });
                if (res.ok) { alert('Institution created successfully!'); institutionForm.reset(); loadSectionData('institutions'); }
                else alert('Failed to create institution');
            } catch (err) { console.error(err); }
        });
    }

    // School form
    const schoolForm = document.getElementById('schoolForm');
    if (schoolForm) {
        schoolForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token    = localStorage.getItem('notify_token');
            const formData = new FormData(schoolForm);
            try {
                const res = await fetch(`${API_BASE}/api/admin/schools`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: formData.get('name') })
                });
                if (res.ok) { alert('School created successfully!'); schoolForm.reset(); loadSectionData('schools'); }
                else alert('Failed to create school');
            } catch (err) { console.error(err); }
        });
    }

    // Course form
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token    = localStorage.getItem('notify_token');
            const formData = new FormData(courseForm);
            try {
                const res = await fetch(`${API_BASE}/api/admin/courses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name:      formData.get('name'),
                        code:      'NEW',
                        school_id: formData.get('school')
                    })
                });
                if (res.ok) { alert('Course created successfully!'); courseForm.reset(); loadSectionData('courses'); }
                else alert('Failed to create course');
            } catch (err) { console.error(err); }
        });
    }

    // Unit form
    const unitForm = document.getElementById('unitForm');
    if (unitForm) {
        unitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token    = localStorage.getItem('notify_token');
            const formData = new FormData(unitForm);
            try {
                const res = await fetch(`${API_BASE}/api/admin/units`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name:    formData.get('name'),
                        code:    formData.get('code'),
                        dept_id: formData.get('course')
                    })
                });
                if (res.ok) { alert('Unit created successfully!'); unitForm.reset(); loadSectionData('units'); }
                else alert('Failed to create unit');
            } catch (err) { console.error(err); }
        });
    }

    // Create update button
    const createUpdateBtn = document.getElementById('createUpdateBtn');
    if (createUpdateBtn) {
        createUpdateBtn.addEventListener('click', async () => {
            const title   = prompt('Enter update title:');
            const content = prompt('Enter update content:');
            if (title && content) {
                const token = localStorage.getItem('notify_token');
                const user  = JSON.parse(localStorage.getItem('user') || '{}');
                try {
                    const res = await fetch(`${API_BASE}/api/admin/updates`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ title, content, userId: user.id })
                    });
                    if (res.ok) { alert('Update created successfully!'); loadSectionData('updates'); }
                    else alert('Failed to create update');
                } catch (err) { console.error(err); }
            }
        });
    }
});