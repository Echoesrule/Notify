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

// =====================
// AUTHENTICATION HELPERS
// =====================

function getAuthToken() {
    return localStorage.getItem('notify_token') || 
           localStorage.getItem('token') || 
           sessionStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function redirectToLogin() {
    localStorage.removeItem('notify_token');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '../user_auth/index.html';
}

async function checkAdminAuth() {
    const token = getAuthToken();
    if (!token) {
        console.log('No token found, redirecting to login...');
        redirectToLogin();
        return false;
    }
    
    // Check role from localStorage first
    const userRole = localStorage.getItem('notify_role');
    if (userRole === 'lecturer') {
        window.location.href = 'lecturer.html';
        return false;
    }
    if (userRole !== 'admin') {
        window.location.href = '../html/dashboard.html';
        return false;
    }
    
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
        
        if (res.status === 401) {
            console.log('Invalid or expired token, redirecting to login...');
            redirectToLogin();
            return false;
        }
        
        if (res.status === 403) {
            console.log('Not an admin user, redirecting...');
            window.location.href = '../html/dashboard.html';
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('Auth check failed:', err);
        return false;
    }
}

// =====================
// UI HELPERS
// =====================

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
    const section = document.getElementById(sectionId);
    if (section) section.style.display = 'block';
    
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
        const skeleton = document.getElementById('skeletonHome');
        if (skeleton) skeleton.style.display = 'block';
    } else if (sectionId === 'notes') {
        const skeleton = document.getElementById('skeletonNotes');
        if (skeleton) {
            skeleton.style.display = 'block';
            skeleton.classList.remove('hidden');
        }
    } else {
        showLoader();
    }

    try {
        switch (sectionId) {
            case 'home':         await loadDashboardStats(); break;
            case 'users':        await loadUsers(); break;
            case 'institutions': await loadInstitutions(); break;
            case 'schools':      await loadSchools(); break;
            case 'courses':
                await loadCourses();
                await loadSchoolsForSelect();
                break;
            case 'units':        await loadUnits(); break;
            case 'notes':        await loadNotes(); break;
            case 'updates':      await loadUpdates(); break;
        }
    } catch (err) {
        console.error('Error loading section:', err);
    } finally {
        if (sectionId === 'home') {
            setTimeout(() => {
                const skeleton = document.getElementById('skeletonHome');
                if (skeleton) skeleton.style.display = 'none';
            }, 500);
        } else if (sectionId === 'notes') {
            const skeleton = document.getElementById('skeletonNotes');
            if (skeleton) {
                skeleton.style.display = 'none';
                skeleton.classList.add('hidden');
            }
        } else {
            showContent();
        }
    }
}

// =====================
// DASHBOARD STATS
// =====================

async function loadDashboardStats() {
    try {
        const headers = getAuthHeaders();
        
        const [usersRes, instRes, notesRes, updatesRes] = await Promise.all([
            fetch(`${API_BASE}/api/admin/users`, { headers }),
            fetch(`${API_BASE}/api/admin/institutions`, { headers }),
            fetch(`${API_BASE}/api/admin/notes`, { headers }),
            fetch(`${API_BASE}/api/admin/updates`, { headers })
        ]);

        if (usersRes.status === 401) {
            redirectToLogin();
            return;
        }

        const users = await usersRes.json();
        const institutions = await instRes.json();
        const notes = await notesRes.json();
        const updates = await updatesRes.json();

        const totalUsersEl = document.getElementById('totalUsers');
        const totalInstitutionsEl = document.getElementById('totalInstitutions');
        const totalNotesEl = document.getElementById('totalNotes');
        const totalUpdatesEl = document.getElementById('totalUpdates');
        
        if (totalUsersEl) totalUsersEl.textContent = Array.isArray(users) ? users.length : 0;
        if (totalInstitutionsEl) totalInstitutionsEl.textContent = Array.isArray(institutions) ? institutions.length : 0;
        if (totalNotesEl) totalNotesEl.textContent = Array.isArray(notes) ? notes.length : 0;
        if (totalUpdatesEl) totalUpdatesEl.textContent = Array.isArray(updates) ? updates.length : 0;

        const skeleton = document.getElementById('skeletonHome');
        if (skeleton) skeleton.classList.add('hidden');
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

// =====================
// USERS MANAGEMENT
// =====================

async function loadUsers() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const users = await res.json();
        const tbody = document.getElementById('userList');
        if (tbody) {
            if (Array.isArray(users) && users.length > 0) {
                tbody.innerHTML = users.map(user => {
                    const role = user.role || 'student';
                    return `
                    <tr>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td><span class="role-badge ${role}">${role}</span></td>
                        <td>${user.schoolName || user.institutionName || 'N/A'}</td>
                        <td class="action-buttons">
                            ${role === 'student' ? `<button class="btn-sm promote-btn" onclick="promoteUser('${user.id}', 'lecturer')" title="Promote to Lecturer"><i class="fas fa-user-plus"></i></button>` : ''}
                            ${role === 'lecturer' ? `<button class="btn-sm promote-btn" onclick="promoteUser('${user.id}', 'admin')" title="Promote to Admin"><i class="fas fa-crown"></i></button>` : ''}
                            ${role !== 'admin' ? `<button class="btn-sm" onclick="editUser('${user.id}')" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                            <button class="btn-sm btn-danger" onclick="deleteUser('${user.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found</td></tr>';
            }
        }
    } catch (err) {
        console.error('Error loading users:', err);
        const tbody = document.getElementById('userList');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error loading users</td></tr>';
    }
}

function filterUsers() {
    const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const rows = document.querySelectorAll('#userList tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const showSearch = text.includes(search);
        const showRole = !roleFilter || text.includes(roleFilter);
        row.style.display = (showSearch && showRole) ? '' : 'none';
    });
}

async function editUser(userId) {
    const newRole = prompt('Enter new role (student, lecturer, admin):');
    if (newRole && ['student', 'lecturer', 'admin'].includes(newRole)) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) { 
                showNotification('User role updated!', 'success'); 
                loadSectionData('users'); 
            } else {
                showNotification('Failed to update user role', 'error');
            }
        } catch (err) { 
            console.error('Error updating user:', err); 
            showNotification('Error updating user', 'error');
        }
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('User deleted!', 'success'); 
                loadSectionData('users'); 
            } else {
                showNotification('Failed to delete user', 'error');
            }
        } catch (err) { 
            console.error('Error deleting user:', err); 
            showNotification('Error deleting user', 'error');
        }
    }
}

async function promoteUser(userId, newRole) {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/promote`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ role: newRole })
        });
        if (res.ok) { 
            alert(`User promoted to ${newRole}!`); 
            loadSectionData('users'); 
        } else {
            showNotification('Failed to promote user', 'info');
        }
    } catch (err) { 
        console.error('Error promoting user:', err); 
        showNotification('Error promoting user', 'info');
    }
}

// =====================
// INSTITUTIONS MANAGEMENT
// =====================

async function loadInstitutions() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/institutions`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const institutions = await res.json();
        const container = document.getElementById('institutionList');
        if (container) {
            if (Array.isArray(institutions) && institutions.length > 0) {
                container.innerHTML = institutions.map(inst => `
                    <div class="institution-card">
                        <h3>${inst.name}</h3>
                        <p>Staff Domain: ${inst.staff_domain || 'N/A'}</p>
                        <p>Student Domain: ${inst.student_domain || 'N/A'}</p>
                        <div class="action-buttons">
                            <button class="btn-sm" onclick="editInstitution('${inst.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-sm btn-danger" onclick="deleteInstitution('${inst.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<div class="empty-state">No institutions found. Create your first institution above.</div>';
            }
        }
    } catch (err) {
        console.error('Error loading institutions:', err);
    }
}

async function editInstitution(institutionId) {
    const name = prompt('Enter new university/institution name:');
    if (name) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/institutions/${institutionId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ name })
            });
            if (res.ok) { 
                showNotification('University updated!', 'info'); 
                loadSectionData('institutions'); 
            } else {
                showNotification('Failed to update institution', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error updating institution', 'info');
        }
    }
}

async function deleteInstitution(institutionId) {
    if (confirm('Delete this university/institution?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/institutions/${institutionId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('University deleted!', 'info'); 
                loadSectionData('institutions'); 
            } else {
                showNotification('Failed to delete institution', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting institution', 'info');
        }
    }
}

// =====================
// SCHOOLS MANAGEMENT
// =====================

async function loadSchools() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/schools`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const schools = await res.json();
        const container = document.getElementById('schoolList');
        if (container) {
            if (Array.isArray(schools) && schools.length > 0) {
                container.innerHTML = schools.map(school => `
                    <div class="institution-card">
                        <h3>${school.name}</h3>
                        <p>Students: ${school.studentCount || 0} | Courses: ${school.courseCount || 0} | Notes: ${school.noteCount || 0}</p>
                        <div class="action-buttons">
                            <button class="btn-sm" onclick="editSchool('${school.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-sm btn-danger" onclick="deleteSchool('${school.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<div class="empty-state">No schools found. Create your first school above.</div>';
            }
        }
        const skeleton = document.getElementById('skeletonSchools');
        if (skeleton) skeleton.classList.add('hidden');
    } catch (err) {
        console.error('Error loading schools:', err);
    }
}

async function editSchool(schoolId) {
    const name = prompt('Enter new school name:');
    if (name) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/schools/${schoolId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ name })
            });
            if (res.ok) { 
                showNotification('School updated!', 'info'); 
                loadSectionData('schools'); 
            } else {
                showNotification('Failed to update school', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error updating school', 'info');
        }
    }
}

async function deleteSchool(schoolId) {
    if (confirm('Delete this school/faculty?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/schools/${schoolId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('School deleted!', 'info'); 
                loadSectionData('schools'); 
            } else {
                showNotification('Failed to delete school', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting school', 'info');
        }
    }
}

// =====================
// COURSES MANAGEMENT
// =====================

async function loadCourses() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/courses`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const courses = await res.json();
        const container = document.getElementById('courseList');
        if (container) {
            if (Array.isArray(courses) && courses.length > 0) {
                container.innerHTML = courses.map(course => `
                    <div class="course-card">
                        <h3>${course.name}</h3>
                        <p>${course.description || 'No description'}</p>
                        <p>${course.schoolName || 'N/A'}</p>
                        <p>Students: ${course.studentCount || 0} | Units: ${course.unitCount || 0}</p>
                        <div class="action-buttons">
                            <button class="btn-sm" onclick="editCourse('${course.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-sm btn-danger" onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<div class="empty-state">No courses found. Create your first course above.</div>';
            }
        }
        await loadSchoolsForSelect();
        const skeleton = document.getElementById('skeletonCourses');
        if (skeleton) skeleton.classList.add('hidden');
    } catch (err) {
        console.error('Error loading courses:', err);
    }
}

async function loadSchoolsForSelect() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/schools`, { headers });
        const schools = await res.json();
        const select = document.getElementById('courseSchoolSelect');
        if (select && Array.isArray(schools)) {
            select.innerHTML = '<option value="">Select School</option>' +
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        const unitSchoolSelect = document.getElementById('unitSchoolSelect');
        if (unitSchoolSelect && Array.isArray(schools)) {
            unitSchoolSelect.innerHTML = '<option value="">Select School</option>' +
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading schools for select:', err);
    }
}

async function loadCoursesForUnitForm() {
    const schoolId = document.getElementById('unitSchoolSelect')?.value;
    const courseSelect = document.getElementById('unitCourseSelect');
    if (!courseSelect) return;
    
    if (!schoolId) {
        courseSelect.innerHTML = '<option value="">Select Course (select school first)</option>';
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/schools/${schoolId}/courses`, { headers });
        const courses = await res.json();
        courseSelect.innerHTML = '<option value="">Select Course</option>' +
            (Array.isArray(courses) ? courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('') : '');
    } catch (err) {
        console.error('Error loading courses for unit form:', err);
    }
}

async function editCourse(courseId) {
    const name = prompt('Enter new course name:');
    const description = prompt('Enter course description:');
    if (name) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/courses/${courseId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ name, description: description || '' })
            });
            if (res.ok) { 
                showNotification('Course updated!', 'info'); 
                loadSectionData('courses'); 
            } else {
                showNotification('Failed to update course', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error updating course', 'info');
        }
    }
}

async function deleteCourse(courseId) {
    if (confirm('Delete this course?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/courses/${courseId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('Course deleted!', 'info'); 
                loadSectionData('courses'); 
            } else {
                showNotification('Failed to delete course', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting course', 'info');
        }
    }
}

// =====================
// UNITS MANAGEMENT
// =====================

async function loadUnits() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/units`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const units = await res.json();
        const container = document.getElementById('unitList');
        if (container) {
            if (Array.isArray(units) && units.length > 0) {
                container.innerHTML = units.map(unit => `
                    <div class="course-card">
                        <h3>${unit.name} ${unit.is_common_unit ? '<span class="common-badge">Common</span>' : ''}</h3>
                        <p>${unit.description || 'No description'}</p>
                        <p>Code: ${unit.code || 'N/A'} | Course: ${unit.courseName || 'N/A'}</p>
                        <p>Notes: ${unit.noteCount || 0}</p>
                        <div class="action-buttons">
                            <button class="btn-sm" onclick="shareUnit('${unit.id}')" title="Share to other courses"><i class="fas fa-share-alt"></i></button>
                            <button class="btn-sm" onclick="editUnit('${unit.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-sm btn-danger" onclick="deleteUnit('${unit.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<div class="empty-state">No units found. Create your first unit above.</div>';
            }
        }
        const skeleton = document.getElementById('skeletonUnits');
        if (skeleton) skeleton.classList.add('hidden');
    } catch (err) {
        console.error('Error loading units:', err);
    }
}

let allCourses = [];
let allUnits = [];
let allInstitutions = [];
let allSchools = [];

function filterCourses() {
    const search = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#courseList .course-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

function filterUnits() {
    const search = document.getElementById('unitSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#unitList .course-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

function filterInstitutions() {
    const search = document.getElementById('institutionSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#institutionList .institution-card, #institutionList .course-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

function filterSchools() {
    const search = document.getElementById('schoolSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#schoolList .school-card, #schoolList .course-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

async function editUnit(unitId) {
    const name = prompt('Enter new unit name:');
    const description = prompt('Enter unit description:');
    if (name) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/units/${unitId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ name, description: description || '' })
            });
            if (res.ok) { 
                showNotification('Unit updated!', 'info'); 
                loadSectionData('units'); 
            } else {
                showNotification('Failed to update unit', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error updating unit', 'info');
        }
    }
}

async function shareUnit(unitId) {
    try {
        const headers = getAuthHeaders();
        
        // Get courses to share with
        const coursesRes = await fetch(`${API_BASE}/api/admin/courses`, { headers });
        const allCourses = await coursesRes.json();
        
        // Get currently linked courses
        const linkedRes = await fetch(`${API_BASE}/api/units/${unitId}/courses`, { headers });
        const linkedCourses = await linkedRes.json();
        const linkedIds = linkedCourses.map(c => c.id);
        
        // Filter out already linked courses
        const availableCourses = allCourses.filter(c => !linkedIds.includes(c.id));
        
        if (!availableCourses.length) {
            showNotification('This unit is already shared with all available courses!', 'info');
            return;
        }
        
        // Show modal with dropdown
        const modal = document.createElement('div');
        modal.id = 'shareUnitModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        
        const optionsHtml = availableCourses.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
        
        modal.innerHTML = `
            <div style="background:white;padding:24px;border-radius:12px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;">
                <h3 style="margin-bottom:16px;">Share Unit to Other Courses</h3>
                <p style="margin-bottom:12px;font-size:14px;color:#666;">Select courses to share this unit with (hold Ctrl/Cmd for multiple):</p>
                <select id="shareCourseSelect" multiple style="width:100%;height:150px;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:16px;">
                    ${optionsHtml}
                </select>
                <div style="display:flex;gap:8px;">
                    <button id="confirmShareBtn" style="flex:1;padding:10px;background:var(--primary);color:white;border:none;border-radius:6px;cursor:pointer;">Share</button>
                    <button onclick="document.getElementById('shareUnitModal').remove()" style="flex:1;padding:10px;background:#64748b;color:white;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmShareBtn').onclick = async () => {
            const select = document.getElementById('shareCourseSelect');
            const selectedIds = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
            
            if (!selectedIds.length) {
                showNotification('Please select at least one course', 'info');
                return;
            }
            
            const res = await fetch(`${API_BASE}/api/units/${unitId}/link-courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_ids: selectedIds })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                document.getElementById('shareUnitModal').remove();
                alert(`Unit shared successfully! Linked to ${data.linked?.length || 0} course(s)`);
                loadSectionData('units');
            } else {
                showNotification('Failed to share unit: ' + data.error);
            }
        };
    } catch (err) {
        console.error('Error sharing unit:', err);
        showNotification('Error sharing unit', 'info');
    }
}

async function deleteUnit(unitId) {
    if (confirm('Delete this unit?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/units/${unitId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('Unit deleted!', 'info'); 
                loadSectionData('units'); 
            } else {
                showNotification('Failed to delete unit', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting unit', 'info');
        }
    }
}

// =====================
// NOTES MANAGEMENT
// =====================

let allNotes = [];

async function loadNotes() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/notes`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        allNotes = await res.json();
        
        await loadSchoolsForNotesFilter();
        
        renderNotes(allNotes);
        
        const skeleton = document.getElementById('skeletonNotes');
        if (skeleton) {
            skeleton.style.display = 'none';
            skeleton.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error loading notes:', err);
    }
}

async function loadSchoolsForNotesFilter() {
    try {
        const headers = getAuthHeaders();
        
        const [schoolsRes, coursesRes] = await Promise.all([
            fetch(`${API_BASE}/api/admin/schools`, { headers }),
            fetch(`${API_BASE}/api/admin/courses`, { headers })
        ]);
        
        const schools = await schoolsRes.json();
        const courses = await coursesRes.json();
        
        const schoolFilter = document.getElementById('notesSchoolFilter');
        const courseFilter = document.getElementById('notesCourseFilter');
        
        if (schoolFilter) {
            schoolFilter.innerHTML = '<option value="">All Schools</option>' +
                (Array.isArray(schools) ? schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('') : '');
        }
        
        if (courseFilter) {
            courseFilter.innerHTML = '<option value="">All Courses</option>' +
                (Array.isArray(courses) ? courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('') : '');
        }
    } catch (err) {
        console.error('Error loading filter options:', err);
    }
}

function filterNotes() {
    const searchInput = document.getElementById('notesSearch');
    const schoolFilter = document.getElementById('notesSchoolFilter');
    const courseFilter = document.getElementById('notesCourseFilter');
    const statusFilter = document.getElementById('notesStatusFilter');
    
    const search = searchInput?.value.toLowerCase() || '';
    const schoolId = schoolFilter?.value || '';
    const courseId = courseFilter?.value || '';
    const status = statusFilter?.value || '';
    
    let filtered = [...allNotes];
    
    if (search) {
        filtered = filtered.filter(note => 
            note.title?.toLowerCase().includes(search) ||
            note.courseName?.toLowerCase().includes(search) ||
            note.schoolName?.toLowerCase().includes(search) ||
            note.uploadedByName?.toLowerCase().includes(search)
        );
    }
    
    if (schoolId) {
        filtered = filtered.filter(note => note.schoolId == schoolId);
    }
    
    if (courseId) {
        filtered = filtered.filter(note => note.courseId == courseId);
    }
    
    if (status) {
        filtered = filtered.filter(note => (note.status || 'pending') === status);
    }
    
    renderNotes(filtered);
}

function renderNotes(notes) {
    const container = document.getElementById('notesList');
    if (container) {
        if (Array.isArray(notes) && notes.length > 0) {
            container.innerHTML = notes.map(note => {
                const status = note.status || 'pending';
                const statusClass = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
                return `
                <div class="note-card">
                    <div class="note-card-header">
                        <h3>${note.title}</h3>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </div>
                    <div class="note-card-body">
                        <p class="note-meta"><i class="fas fa-building"></i> ${note.institutionName || 'N/A'}</p>
                        <p class="note-meta"><i class="fas fa-graduation-cap"></i> ${note.schoolName || 'N/A'}</p>
                        <p class="note-meta"><i class="fas fa-book"></i> ${note.courseName || 'N/A'} - ${note.unitName || 'N/A'}</p>
                        <p class="note-meta"><i class="fas fa-user"></i> Uploaded by: ${note.uploadedByName || 'Unknown'}</p>
                    </div>
                    <div class="note-card-footer">
                        <small class="note-date"><i class="fas fa-calendar"></i> ${new Date(note.created_at).toLocaleDateString()}</small>
                        <div class="note-actions">
                            <button class="btn-sm" onclick="viewNote('${note.id}')" title="View"><i class="fas fa-eye"></i></button>
                            ${status === 'pending' ? `
                            <button class="btn-sm btn-success" onclick="approveNote('${note.id}')" title="Approve"><i class="fas fa-check"></i></button>
                            <button class="btn-sm btn-warning" onclick="rejectNote('${note.id}')" title="Reject"><i class="fas fa-times"></i></button>
                            ` : ''}
                            <button class="btn-sm btn-danger" onclick="deleteNote('${note.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No notes found.</div>';
        }
    }
}

function viewNote(noteId) {
    const baseUrl = window.BASE_URL || window.API_URL?.replace('/api', '') || window.location.origin;
    window.open(`${baseUrl}/api/notes/${noteId}/preview`, '_blank');
}

async function deleteNote(noteId) {
    if (confirm('Delete this note?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/notes/${noteId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('Note deleted!', 'info'); 
                loadSectionData('notes'); 
            } else {
                showNotification('Failed to delete note', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting note', 'info');
        }
    }
}

async function approveNote(noteId) {
    const message = prompt('Enter message for the lecturer (optional):');
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${API_BASE}/api/admin/notes/${noteId}/status`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ status: 'approved', message: message || '' })
        });
        if (res.ok) { 
            showNotification('Note approved!', 'info'); 
            loadSectionData('notes'); 
        } else {
            showNotification('Failed to approve note', 'info');
        }
    } catch (err) { 
        console.error(err); 
        showNotification('Error approving note', 'info');
    }
}

async function rejectNote(noteId) {
    const message = prompt('Enter reason for rejection:');
    if (message === null) return;
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${API_BASE}/api/admin/notes/${noteId}/status`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ status: 'rejected', message: message || '' })
        });
        if (res.ok) { 
            showNotification('Note rejected!', 'info'); 
            loadSectionData('notes'); 
        } else {
            showNotification('Failed to reject note', 'info');
        }
    } catch (err) { 
        console.error(err); 
        showNotification('Error rejecting note', 'info');
    }
}

// =====================
// UPDATES MANAGEMENT
// =====================

async function loadUpdates() {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/admin/updates`, { headers });
        
        if (res.status === 401) {
            redirectToLogin();
            return;
        }
        
        const updates = await res.json();
        const container = document.getElementById('updatesList');
        if (container) {
            if (Array.isArray(updates) && updates.length > 0) {
                container.innerHTML = updates.map(update => `
                    <div class="update-card">
                        <h3>${update.title}</h3>
                        <p>${update.content}</p>
                        <small>Posted by: ${update.postedByName || 'Unknown'} | ${new Date(update.created_at).toLocaleDateString()}</small>
                        <div class="action-buttons">
                            <button class="btn-sm" onclick="editUpdate('${update.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-sm btn-danger" onclick="deleteUpdate('${update.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`
                ).join('');
            } else {
                container.innerHTML = '<div class="empty-state">No updates found. Create your first update above.</div>';
            }
        }
        const skeleton = document.getElementById('skeletonUpdates');
        if (skeleton) skeleton.classList.add('hidden');
    } catch (err) {
        console.error('Error loading updates:', err);
    }
}

async function editUpdate(updateId) {
    const title = prompt('Enter new title:');
    const content = prompt('Enter new content:');
    if (title && content) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/updates/${updateId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ title, content })
            });
            if (res.ok) { 
                showNotification('Update edited!', 'info'); 
                loadSectionData('updates'); 
            } else {
                showNotification('Failed to update', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error updating update', 'info');
        }
    }
}

async function deleteUpdate(updateId) {
    if (confirm('Delete this update?')) {
        const headers = getAuthHeaders();
        try {
            const res = await fetch(`${API_BASE}/api/admin/updates/${updateId}`, {
                method: 'DELETE',
                headers: headers
            });
            if (res.ok) { 
                showNotification('Update deleted!', 'info'); 
                loadSectionData('updates'); 
            } else {
                showNotification('Failed to delete update', 'info');
            }
        } catch (err) { 
            console.error(err); 
            showNotification('Error deleting update', 'info');
        }
    }
}

// =====================
// AUTH / PROFILE
// =====================

function logout(clearData = false) {
    if (clearData) {
        localStorage.clear();
    } else {
        const school = localStorage.getItem('selected_school');
        const schoolName = localStorage.getItem('selected_school_name');
        const user = localStorage.getItem('user');
        const role = localStorage.getItem('notify_role');
        const theme = localStorage.getItem('theme');
        localStorage.clear();
        if (school) localStorage.setItem('selected_school', school);
        if (schoolName) localStorage.setItem('selected_school_name', schoolName);
        if (user) localStorage.setItem('user', user);
        if (role) localStorage.setItem('notify_role', role);
        if (theme) localStorage.setItem('theme', theme);
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
                <button onclick="logout(true)" style="padding:12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">Clear All Data</button>
                <button onclick="this.closest('[style*=\'position:fixed\']')?.remove()" style="padding:12px;background:var(--bg-tertiary,#f1f5f9);border:1px solid var(--border,#e2e8f0);border-radius:8px;cursor:pointer;">Cancel</button>
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
    const menu = document.getElementById('profileMenu');
    if (profile && menu && !profile.contains(e.target)) menu.classList.remove('active');
});

function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

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

    if (toggleBtn && sidebar) toggleBtn.addEventListener('click', toggleSidebar);
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
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = 'padding:15px 20px;border-radius:8px;color:white;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;min-width:250px;';
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    notification.style.background = colors[type] || colors.info;
    notification.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =====================
// SETTINGS
// =====================

function loadUserDataForSettings() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = localStorage.getItem('user_name') || user.name || '';
    const userEmail = localStorage.getItem('user_email') || user.email || '';
    const userPfp = localStorage.getItem('user_pfp') || user.pfp || '';

    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const adminIdInput = document.getElementById('adminId');

    if (nameInput) nameInput.value = userName;
    if (emailInput) emailInput.value = userEmail;
    if (adminIdInput && user.id) adminIdInput.value = 'ADM' + String(user.id).padStart(4, '0');

    const topPfp = document.getElementById('profileImg');
    if (topPfp && userPfp) topPfp.src = `${API_BASE}${userPfp}`;

    const updatePasswordBtn = document.getElementById('updatePassword');
    if (updatePasswordBtn) updatePasswordBtn.onclick = handleAdminPasswordChange;
}

async function handleAdminPasswordChange() {
    const current = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!current || !newPwd || !confirm) { 
        showNotification('Please fill all password fields', 'info'); 
        return; 
    }
    if (newPwd !== confirm) { 
        showNotification('New passwords do not match', 'info'); 
        return; 
    }
    if (newPwd.length < 8) { 
        showNotification('Password must be at least 8 characters', 'info'); 
        return; 
    }

    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${API_BASE}/api/user_auth/change-password`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Password updated successfully!', 'info');
            ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } else {
            alert(data.message || 'Failed to update password');
        }
    } catch (err) { 
        showNotification('Error connecting to server', 'info'); 
    }
}

async function saveAdminSettings() {
    const name = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const headers = getAuthHeaders();

    try {
        const res = await fetch(`${API_BASE}/api/user_auth/update-profile`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Settings saved successfully!', 'info');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.name = name;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', email);

            const userNameEl = document.getElementById('userName');
            const topUserNameEl = document.getElementById('topUserName');
            if (userNameEl) userNameEl.textContent = name;
            if (topUserNameEl) topUserNameEl.textContent = name;
        } else {
            alert(data.message || 'Failed to save settings');
        }
    } catch (err) { 
        showNotification('Error connecting to server', 'info'); 
    }
}

function loadAdminPfp() {
    const savedPfp = localStorage.getItem('user_pfp');
    const defaultPfp = '../images/dashboardImages/v3321_68.png';
    const timestamp = Date.now();

    const profileImg = document.getElementById('profileImage');
    if (profileImg) {
        profileImg.onerror = function() { this.src = defaultPfp; };
        profileImg.src = savedPfp ? `${API_BASE}${savedPfp}?v=${timestamp}` : defaultPfp;
    }

    const topPfp = document.getElementById('profileImg');
    if (topPfp) {
        topPfp.onerror = function() { this.src = defaultPfp; };
        topPfp.src = savedPfp ? `${API_BASE}${savedPfp}?v=${timestamp}` : defaultPfp;
    }

    const changePfpBtn = document.getElementById('changeProfileImage');
    if (changePfpBtn) {
        changePfpBtn.onclick = async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { 
                    showNotification('File too large. Max 2MB', 'info'); 
                    return; 
                }

                const token = getAuthToken();
                const formData = new FormData();
                formData.append('pfp', file);

                try {
                    const res = await fetch(`${API_BASE}/api/user/pfp`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (res.ok) {
                        const data = await res.json();
                        localStorage.setItem('user_pfp', data.pfp);
                        const timestamp = Date.now();
                        const pfpImg = document.getElementById('profileImage');
                        const topPfpEl = document.getElementById('profileImg');
                        if (pfpImg) pfpImg.src = `${API_BASE}${data.pfp}?v=${timestamp}`;
                        if (topPfpEl) topPfpEl.src = `${API_BASE}${data.pfp}?v=${timestamp}`;
                        showNotification('Profile picture updated!', 'info');
                    } else {
                        showNotification('Failed to upload image', 'info');
                    }
                } catch (err) { 
                    showNotification('Error uploading image', 'info'); 
                }
            };
            input.click();
        };
    }
}

// =====================
// INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) return;
    
    // Initialize UI
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
            const formData = new FormData(institutionForm);
            const headers = getAuthHeaders();
            try {
                const res = await fetch(`${API_BASE}/api/admin/institutions`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        name: formData.get('name'),
                        staff_domain: formData.get('staffDomain'),
                        student_domain: formData.get('studentDomain')
                    })
                });
                if (res.ok) { 
                    showNotification('Institution created successfully!', 'info'); 
                    institutionForm.reset(); 
                    loadSectionData('institutions'); 
                } else {
                    showNotification('Failed to create institution', 'info');
                }
            } catch (err) { 
                console.error(err); 
                showNotification('Error creating institution', 'info');
            }
        });
    }

    // School form
    const schoolForm = document.getElementById('schoolForm');
    if (schoolForm) {
        schoolForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(schoolForm);
            const headers = getAuthHeaders();
            try {
                const res = await fetch(`${API_BASE}/api/admin/schools`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ name: formData.get('name') })
                });
                if (res.ok) { 
                    showNotification('School created successfully!', 'info'); 
                    schoolForm.reset(); 
                    loadSectionData('schools'); 
                } else {
                    showNotification('Failed to create school', 'info');
                }
            } catch (err) { 
                console.error(err); 
                showNotification('Error creating school', 'info');
            }
        });
    }

    // Course form
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(courseForm);
            const headers = getAuthHeaders();
            try {
                const res = await fetch(`${API_BASE}/api/admin/courses`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        name: formData.get('name'),
                        code: 'NEW',
                        school_id: formData.get('school'),
                        description: formData.get('description') || ''
                    })
                });
                if (res.ok) { 
                    showNotification('Course created successfully!', 'info'); 
                    courseForm.reset(); 
                    loadSectionData('courses'); 
                } else {
                    showNotification('Failed to create course', 'info');
                }
            } catch (err) { 
                console.error(err); 
                showNotification('Error creating course', 'info');
            }
        });
    }

    // Unit form
    const unitForm = document.getElementById('unitForm');
    if (unitForm) {
        unitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(unitForm);
            const headers = getAuthHeaders();
            try {
                const res = await fetch(`${API_BASE}/api/admin/units`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        name: formData.get('name'),
                        code: formData.get('code'),
                        course_id: formData.get('course'),
                        is_common_unit: formData.get('is_common_unit') === 'on',
                        description: formData.get('description') || ''
                    })
                });
                if (res.ok) { 
                    showNotification('Unit created successfully!', 'info'); 
                    unitForm.reset(); 
                    loadSectionData('units'); 
                } else {
                    showNotification('Failed to create unit', 'info');
                }
            } catch (err) { 
                console.error(err); 
                showNotification('Error creating unit', 'info');
            }
        });
    }

    // Create update button
    const createUpdateBtn = document.getElementById('createUpdateBtn');
    if (createUpdateBtn) {
        createUpdateBtn.addEventListener('click', async () => {
            const title = prompt('Enter update title:');
            const content = prompt('Enter update content:');
            if (title && content) {
                const headers = getAuthHeaders();
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                try {
                    const res = await fetch(`${API_BASE}/api/admin/updates`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ title, content, userId: user.id })
                    });
                    if (res.ok) { 
                        showNotification('Update created successfully!', 'info'); 
                        loadSectionData('updates'); 
                    } else {
                        showNotification('Failed to create update', 'info');
                    }
                } catch (err) { 
                    console.error(err); 
                    showNotification('Error creating update', 'info');
                }
            }
        });
    }

    // Notes filter event listeners
    const notesSearch = document.getElementById('notesSearch');
    const notesSchoolFilter = document.getElementById('notesSchoolFilter');
    const notesCourseFilter = document.getElementById('notesCourseFilter');
    const notesStatusFilter = document.getElementById('notesStatusFilter');
    
    if (notesSearch) notesSearch.addEventListener('input', filterNotes);
    if (notesSchoolFilter) notesSchoolFilter.addEventListener('change', filterNotes);
    if (notesCourseFilter) notesCourseFilter.addEventListener('change', filterNotes);
    if (notesStatusFilter) notesStatusFilter.addEventListener('change', filterNotes);
    
    // Load home section by default
    loadSectionData('home');
});