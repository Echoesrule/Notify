const API_URL = window.API_URL || 'API_BASE/api';
const API_BASE = window.API_URL ? window.API_URL.replace('/api', '') : 'API_BASE';

// Global function assignments
window.logout = function(clearData = false) {
    if (clearData) {
        localStorage.clear();
    } else {
        const school = localStorage.getItem('selected_school');
        const schoolName = localStorage.getItem('selected_school_name');
        const user = localStorage.getItem('user');
        const role = localStorage.getItem('notify_role');
        const bookmarks = localStorage.getItem('notifyBookmarks');
        const theme = localStorage.getItem('theme');
        
        localStorage.clear();
        
        if (school) localStorage.setItem('selected_school', school);
        if (schoolName) localStorage.setItem('selected_school_name', schoolName);
        if (user) localStorage.setItem('user', user);
        if (role) localStorage.setItem('notify_role', role);
        if (bookmarks) localStorage.setItem('notifyBookmarks', bookmarks);
        if (theme) localStorage.setItem('theme', theme);
    }
    window.location.href = '../user_auth/index.html';
};

window.showLogoutModal = function() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `<div style="background:var(--bg-secondary,#fff);padding:30px;border-radius:12px;text-align:center;max-width:400px;">
        <h3 style="margin-top:0;">Logout Options</h3>
        <p>Choose how you want to logout:</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <button onclick="logout(false)" style="padding:12px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;">Keep My Data (Resume Later)</button>
            <button onclick="logout(true)" style="padding:12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">Clear All Data</button>
            <button onclick="this.closest('div').remove()" style="padding:12px;background:var(--bg-tertiary,#f1f5f9);border:1px solid var(--border);border-radius:8px;cursor:pointer;">Cancel</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

const API = {
    getSchools: () => fetch(`${API_URL}/schools`).then(r => r.json()),

    getDepartments: (schoolId) => fetch(`${API_URL}/schools/${schoolId}/departments`).then(r => r.json()),

    getUnits: (schoolId, deptId) => fetch(`${API_URL}/schools/${schoolId}/departments/${deptId}/units`).then(r => r.json()),

    getNotes: (schoolId, deptId, unitId) => fetch(`${API_URL}/schools/${schoolId}/departments/${deptId}/units/${unitId}/notes`).then(r => r.json()),

    getAllNotes: () => fetch(`${API_URL}/notes`).then(r => r.json()),
    
    getMyNotes: (userId) => {
        console.log('Fetching my notes for userId:', userId);
        return fetch(`${API_URL}/notes/my-notes?userId=${userId}`).then(r => r.json());
    },

    getUpdates: () => fetch(`${API_URL}/updates`).then(r => r.json()),
    
    getMyUpdates: (userId) => fetch(`${API_URL}/updates/my-updates?userId=${userId}`).then(r => r.json()),

    createSchool: (name) => fetch(`${API_URL}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }).then(r => r.json()),

    createDepartment: (name, code, schoolId) => fetch(`${API_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, school_id: schoolId })
    }).then(r => r.json()),

    createUnit: (name, code, schoolId, courseId, is_common = false) => fetch(`${API_URL}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, school_id: schoolId, course_id: courseId, is_common_unit })
    }).then(r => r.json()),

    createNote: async (data) => {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description || data.content || '');
        formData.append('school_id', data.school_id);
        formData.append('dept_id', data.dept_id);
        formData.append('unit_id', data.unit_id);
        formData.append('userId', data.userId || data.user_id || 1);
        if (data.file) {
            formData.append('file', data.file);
        }
        
        console.log('Creating note with data:', data);
        
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log('Note created response:', result);
        return result;
    },

    createUpdate: (data) => fetch(`${API_URL}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),

    deleteNote: (id, schoolId, deptId, unitId) => fetch(`${API_URL}/notes/${id}?schoolId=${schoolId}&deptId=${deptId}&unitId=${unitId}`, { method: 'DELETE' }).then(r => r.json()),
    deleteUpdate: (id) => fetch(`${API_URL}/updates/${id}`, { method: 'DELETE' }).then(r => r.json()),
    deleteUnit: (id) => fetch(`${API_URL}/units/${id}`, { method: 'DELETE' }).then(r => r.json()),
    deleteCourse: (id) => fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' }).then(r => r.json())
};

let notes = [];
let updates = [];
let schools = [];
let departments = [];
let units = [];

const user = JSON.parse(localStorage.getItem('user') || '{}');
const userRole = localStorage.getItem('notify_role') || '';

if (userRole !== 'lecturer' && userRole !== 'admin') {
    window.location.href = '../html/dashboard.html';
}

document.getElementById('userName').textContent = user.name || 'Lecturer';
document.getElementById('userNameDisplay').textContent = (user.name || 'Lecturer').split(' ')[0];

const sectionNames = {
    'home': 'Home',
    'browse': 'Browse',
    'departments': 'My Courses',
    'notes': 'Notes',
    'updates': 'Updates',
    'settings': 'Settings'
};

let confirmedCommonUnit = null;
let notesTab = 'my';
let updatesTab = 'my';
let browseLevel = { schoolId: null, deptId: null };
let unitNotes = {};

console.log('Fetching data');

async function fetchData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        
        const [schoolsData, notesData, updatesData, myNotesData, myUpdatesData] = await Promise.all([
            API.getSchools(),
            API.getAllNotes(),
            API.getUpdates(),
            userId ? API.getMyNotes(userId) : Promise.resolve([]),
            userId ? API.getMyUpdates(userId) : Promise.resolve([])
        ]);

        schools = schoolsData;
        
        const userCreatedCourseIds = [...new Set((myNotesData || []).map(n => n.dept_id).filter(Boolean))];
        
        departments = [];
        units = [];
        
        if (userCreatedCourseIds.length > 0) {
            schools.forEach(school => {
                school.departments?.forEach(dept => {
                    if (userCreatedCourseIds.includes(dept.id)) {
                        if (!departments.find(d => d.id === dept.id)) {
                            departments.push({ ...dept, schoolId: school.id });
                        }
                        dept.units?.forEach(unit => {
                            if (!units.find(u => u.id === unit.id)) {
                                units.push({ ...unit, courseId: dept.id, schoolId: school.id });
                            }
                        });
                    }
                });
            });
        }
        
        const userNoteUnitIds = [...new Set((myNotesData || []).map(n => n.unit_id).filter(Boolean))];
        userNoteUnitIds.forEach(unitId => {
            if (!units.find(u => u.id === unitId)) {
                schools.forEach(school => {
                    school.departments?.forEach(dept => {
                        const unit = dept.units?.find(u => u.id === unitId);
                            if (unit && !units.find(u => u.id === unit.id)) {
                            units.push({ ...unit, courseId: dept.id, schoolId: school.id });
                            if (!departments.find(d => d.id === dept.id)) {
                                departments.push({ ...dept, schoolId: school.id });
                            }
                        }
                    });
                });
            }
        });
        
        notes = myNotesData || [];
        updates = myUpdatesData || [];
    } 
    catch (err) {
        console.log('Using empty data - API not available', err);
        schools = [];
        notes = [];
        updates = [];
        departments = [];
        units = [];
    }
    initApp();
}

function initApp() {
    updateStats();
    renderRecentNotes();
    initSchoolSelect();
    initCourseSelect();
    initCourseSchoolSelect();
    initCourseSelect2();
    updateDate();
    showSection('home');
    initCommonUnitFeatures();
    
    document.querySelector('.mobile-menu-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', toggleSidebarMode);
}

// Common Unit Features
function initCommonUnitFeatures() {
    setupCommonUnitHandlers();
    setupCommonUnitCheckbox();
    
    // Also add the listener to commonUnitSchool dropdown
    const commonSchoolSelect = document.getElementById('commonUnitSchool');
    if (commonSchoolSelect) {
        commonSchoolSelect.addEventListener('change', function() {
            const school = schools.find(s => s.id == this.value);
            const depts = school?.departments || [];
            const commonDeptSelect = document.getElementById('commonUnitDept');
            if (commonDeptSelect) {
                commonDeptSelect.innerHTML = '<option value="">Select Department</option>' + 
                    depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                commonDeptSelect.disabled = !this.value;
            }
        });
    }
}

function setupCommonUnitHandlers() {
    const unitSelect = document.getElementById('unitSelect');
    if (!unitSelect) return;
    
    unitSelect.removeEventListener('change', handleUnitSelectForCommon);
    unitSelect.addEventListener('change', handleUnitSelectForCommon);
}

function handleUnitSelectForCommon() {
    const unitSelect = document.getElementById('unitSelect');
    const selectedValue = unitSelect.value;
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    
    if (selectedValue === '__common__') {
        unitSelect.value = '';
        document.getElementById('isCommonUnit').checked = true;
        document.getElementById('isCommonUnit').dispatchEvent(new Event('change'));
        return;
    }
    
    if (selectedValue && selectedOption && selectedOption.text.includes('✓')) {
        document.getElementById('isCommonUnit').checked = true;
        document.getElementById('isCommonUnit').dispatchEvent(new Event('change'));
        autoFillCommonUnitFromSelection();
    }
}

function autoFillCommonUnitFromSelection() {
    const schoolId = document.getElementById('schoolSelect').value;
    const deptId = document.getElementById('courseSelect').value;
    const unitId = document.getElementById('unitSelect').value;
    
    if (!schoolId || !deptId || !unitId) return;
    
    const school = schools.find(s => s.id == schoolId);
    const dept = school?.departments?.find(d => d.id == deptId);
    const unit = dept?.units?.find(u => u.id == unitId);
    
    if (unit) {
        const commonSchoolSelect = document.getElementById('commonUnitSchool');
        const commonDeptSelect = document.getElementById('commonUnitDept');
        const commonNameInput = document.getElementById('commonUnitName');
        const commonCodeInput = document.getElementById('commonUnitCode');
        
        if (commonSchoolSelect) {
            commonSchoolSelect.value = schoolId;
            commonSchoolSelect.dispatchEvent(new Event('change'));
            
            setTimeout(() => {
                if (commonDeptSelect) {
                    commonDeptSelect.value = deptId;
                    commonNameInput.value = unit.name;
                    commonCodeInput.value = unit.code || '';
                    
                    confirmedCommonUnit = {
                        unit: unit,
                        schoolId: parseInt(schoolId),
                        deptId: parseInt(deptId)
                    };
                    
                    const confirmedDiv = document.getElementById('commonUnitConfirmed');
                    const confirmBtn = document.getElementById('confirmCommonUnitBtn');
                    
                    if (confirmedDiv) confirmedDiv.style.display = 'block';
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Unit confirmed as Common';
                    }
                }
            }, 100);
        }
    }
}

function setupCommonUnitCheckbox() {
    const checkbox = document.getElementById('isCommonUnit');
    if (!checkbox) return;
    
    checkbox.removeEventListener('change', handleCommonUnitCheckbox);
    checkbox.addEventListener('change', handleCommonUnitCheckbox);
}

function handleCommonUnitCheckbox() {
    const commonSection = document.getElementById('commonUnitSection');
    const confirmedDiv = document.getElementById('commonUnitConfirmed');
    
    if (this.checked) {
        commonSection.style.display = 'block';
        
        const unitSelect = document.getElementById('unitSelect');
        const courseSelect = document.getElementById('courseSelect');
        const schoolSelect = document.getElementById('schoolSelect');
        
        if (unitSelect && unitSelect.value && courseSelect && courseSelect.value && schoolSelect && schoolSelect.value) {
            const schoolId = schoolSelect.value;
            const deptId = courseSelect.value;
            const school = schools.find(s => s.id == schoolId);
            const dept = school?.departments?.find(d => d.id == deptId);
            const unit = dept?.units?.find(u => u.id == unitSelect.value);
            
            if (unit) {
                const commonSchoolSelect = document.getElementById('commonUnitSchool');
                const commonDeptSelect = document.getElementById('commonUnitDept');
                const commonNameInput = document.getElementById('commonUnitName');
                const commonCodeInput = document.getElementById('commonUnitCode');
                
                if (commonSchoolSelect) {
                    commonSchoolSelect.innerHTML = '<option value="">Select School</option>' + 
                        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                    commonSchoolSelect.value = schoolId;
                    commonSchoolSelect.dispatchEvent(new Event('change'));
                    
                    setTimeout(() => {
                        if (commonDeptSelect) {
                            commonDeptSelect.value = deptId;
                            commonNameInput.value = unit.name;
                            commonCodeInput.value = unit.code || '';
                            
                            confirmedCommonUnit = {
                                unit: unit,
                                schoolId: parseInt(schoolId),
                                deptId: parseInt(deptId)
                            };
                            
                            if (confirmedDiv) confirmedDiv.style.display = 'block';
                            const confirmBtn = document.getElementById('confirmCommonUnitBtn');
                            if (confirmBtn) {
                                confirmBtn.disabled = true;
                                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Auto-filled from selection';
                            }
                        }
                    }, 100);
                }
                return;
            } else {
                // Unit selected but not found in this course - show message
                showNotification('This unit does not exist in the selected course. Please select an existing unit first or create one.', 'error');
                this.checked = false;
                return;
            }
        }
        
        const commonSchoolSelect = document.getElementById('commonUnitSchool');
        if (commonSchoolSelect) {
            commonSchoolSelect.innerHTML = '<option value="">Select School</option>' + 
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
            commonSchoolSelect.onchange = function() {
                const school = schools.find(s => s.id == this.value);
                const depts = school?.departments || [];
                const commonDeptSelect = document.getElementById('commonUnitDept');
                if (commonDeptSelect) {
                    commonDeptSelect.innerHTML = '<option value="">Select Department</option>' + 
                        depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                    commonDeptSelect.disabled = !this.value;
                }
            };
        }
    } else {
        commonSection.style.display = 'none';
        if (confirmedDiv) confirmedDiv.style.display = 'none';
        
        const commonSchoolSelect = document.getElementById('commonUnitSchool');
        const commonDeptSelect = document.getElementById('commonUnitDept');
        const commonNameInput = document.getElementById('commonUnitName');
        const commonCodeInput = document.getElementById('commonUnitCode');
        
        if (commonSchoolSelect) commonSchoolSelect.value = '';
        if (commonDeptSelect) {
            commonDeptSelect.value = '';
            commonDeptSelect.disabled = true;
        }
        if (commonNameInput) commonNameInput.value = '';
        if (commonCodeInput) commonCodeInput.value = '';
        
        confirmedCommonUnit = null;
        
        const confirmBtn = document.getElementById('confirmCommonUnitBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Common Unit';
        }
    }
}

async function confirmCommonUnitInline() {
    const schoolId = document.getElementById('commonUnitSchool').value;
    const deptId = document.getElementById('commonUnitDept').value;
    const unitName = document.getElementById('commonUnitName').value.trim();
    const unitCode = document.getElementById('commonUnitCode').value.trim();
    
    if (!schoolId || !deptId) {
        showNotification('Please select a school and department', 'error');
        return;
    }
    
    if (!unitName) {
        showNotification('Please enter a unit name', 'error');
        return;
    }
    
    try {
        const newUnit = await API.createUnit(unitName, unitCode || '', schoolId, deptId);
        
        newUnit.courseId = parseInt(deptId);
        newUnit.schoolId = parseInt(schoolId);
        newUnit.courseCount = 1;
        
        if (!units.find(u => u.id == newUnit.id)) {
            units.push(newUnit);
        }
        
        const school = schools.find(s => s.id == schoolId);
        const dept = school?.departments?.find(d => d.id == deptId);
        if (dept) {
            if (!dept.units) dept.units = [];
            if (!dept.units.find(u => u.id == newUnit.id)) {
                dept.units.push(newUnit);
            }
        }
        
        confirmedCommonUnit = {
            unit: newUnit,
            schoolId: parseInt(schoolId),
            deptId: parseInt(deptId)
        };
        
        document.getElementById('commonUnitConfirmed').style.display = 'block';
        document.getElementById('confirmCommonUnitBtn').disabled = true;
        document.getElementById('confirmCommonUnitBtn').innerHTML = '<i class="fas fa-check"></i> Confirmed';
        
        showNotification('Common unit created successfully!', 'success');
        
    } catch (err) {
        console.error('Error creating common unit:', err);
        showNotification('Failed to create common unit', 'error');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function toggleSidebarMode() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebarToggleBtn');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('expanded');
    btn.classList.toggle('expanded');
    
    if (sidebar.classList.contains('expanded')) {
        mainContent.style.marginLeft = '220px';
        mainContent.style.width = 'calc(100% - 220px)';
    } else {
        mainContent.style.marginLeft = '';
        mainContent.style.width = '';
    }
}

function initCourseSchoolSelect() {
    const select = document.getElementById('courseSchoolSelect');
    if (!select) return;
    
    const role = localStorage.getItem('notify_role');
    const enrolledSchoolId = localStorage.getItem('selected_school');
    
    select.innerHTML = '<option value="">Select School</option>' + 
        schools.map(school => `<option value="${school.id}">${school.name}</option>`).join('');
    
    if (enrolledSchoolId) {
        select.value = enrolledSchoolId;
        setTimeout(() => select.dispatchEvent(new Event('change')), 100);
    }
}

function updateStats() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    fetch(`${API_URL}/counts`)
        .then(r => r.json())
        .then(counts => {
            document.getElementById('totalNotes').textContent = notes.length;
            document.getElementById('totalCourses').textContent = departments.length;
            document.getElementById('totalUpdates').textContent = updates.length;
            document.getElementById('notifCount').textContent = updates.length;
        })
        .catch(() => {
            document.getElementById('totalNotes').textContent = notes.length;
            document.getElementById('totalCourses').textContent = departments.length;
            document.getElementById('totalUpdates').textContent = updates.length;
            document.getElementById('notifCount').textContent = updates.length;
        });
}

function renderRecentNotes() {
    const container = document.getElementById('recentNotes');
    const recent = notes.slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state-dashboard-notes">
            <img src="../images/dashboardImages/addNotes.jpg" alt="No notes">
            <p>No notes yet. Upload your first note!</p>
        </div>`;
        return;
    }

    container.innerHTML = recent.map(note => `
        <div class="feed-item" onclick="editNote('${note.id}')">
            <div class="feed-icon" style="background: #e3f2fd;">
                <i class="fas fa-file-alt" style="color: #1976d2;"></i>
            </div>
            <div class="feed-details">
                <p>${note.title}</p>
                <span>${note.date || 'N/A'}</span>
            </div>
        </div>
    `).join('');
}

function initSchoolSelect() {
    const select = document.getElementById('schoolSelect');
    if (!select) return;
    
    const enrolledSchoolId = localStorage.getItem('selected_school');
    
    select.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (enrolledSchoolId) {
        select.value = enrolledSchoolId;
        setTimeout(() => select.dispatchEvent(new Event('change')), 100);
    }
}

function initCourseSelect() {
    const select = document.getElementById('updateCourse');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Courses</option>' + 
        departments.map(c => `<option value="${c.id}">${c.name} - ${c.code}</option>`).join('');
}

async function createNew(type) {
    const name = prompt(`Enter new ${type} name:`);
    if (!name) return;

    const isNoteModal = document.getElementById('noteModal').style.display === 'flex';
    const isCourseModal = document.getElementById('courseModal').style.display === 'flex';
    
    let schoolSelect, courseSelect, unitSelect;
    
    if (isNoteModal) {
        schoolSelect = document.getElementById('schoolSelect');
        courseSelect = document.getElementById('courseSelect');
        unitSelect = document.getElementById('unitSelect');
    } else if (isCourseModal) {
        schoolSelect = document.getElementById('courseSchoolSelect');
        courseSelect = document.getElementById('courseCourseSelect');
        unitSelect = document.getElementById('courseUnitSelect');
    } else {
        schoolSelect = document.getElementById('schoolSelect');
        courseSelect = document.getElementById('courseSelect');
        unitSelect = document.getElementById('unitSelect');
    }

    try {
        if (type === 'school') {
            const existingSchool = schools.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (existingSchool) {
                alert('This school already exists!');
                return;
            }
            const newSchool = await API.createSchool(name);
            if (newSchool.exists) {
                alert('This school already exists. Using existing school.');
            }
            const existingIdx = schools.findIndex(s => s.id == newSchool.id);
            if (existingIdx === -1) {
                schools.push(newSchool);
            }
            initSchoolSelect();
            initCourseSchoolSelect();
            initCourseSelect2();
            if (schoolSelect) {
                schoolSelect.value = newSchool.id;
                schoolSelect.dispatchEvent(new Event('change'));
            }
        } else if (type === 'course') {
            const schoolId = schoolSelect?.value;
            if (!schoolId) {
                alert('Please select a school first');
                return;
            }
            
            const school = schools.find(s => s.id == schoolId);
            const existingCourse = school?.departments?.find(d => d.name.toLowerCase() === name.toLowerCase());
            if (existingCourse) {
                alert('This course already exists in this school!');
                return;
            }
            
            const code = prompt('Enter course code:');
            
            const duplicateCheck = departments.find(d => 
                d.name.toLowerCase() === name.toLowerCase() && d.schoolId == schoolId
            );
            if (duplicateCheck) {
                alert('This course already exists in this school!');
                return;
            }
            
            const newCourse = await API.createDepartment(name, code, schoolId);
            if (newCourse.exists) {
                alert('This course already exists in this school. Using existing course.');
            }
            newCourse.schoolId = schoolId;
            newCourse.units = newCourse.units || [];
            const existingIdx = departments.findIndex(d => d.id == newCourse.id);
            if (existingIdx === -1) {
                departments.push(newCourse);
            }
            if (school) {
                const deptExists = school.departments?.find(d => d.id == newCourse.id);
                if (!deptExists) {
                    school.departments = school.departments || [];
                    school.departments.push(newCourse);
                } else {
                    if (!deptExists.units) deptExists.units = [];
                }
            }
            initSchoolSelect();
            initCourseSchoolSelect();
            initCourseSelect2();
            if (schoolSelect) schoolSelect.dispatchEvent(new Event('change'));
            if (courseSelect && newCourse.id) {
                setTimeout(() => {
                    courseSelect.value = newCourse.id;
                    courseSelect.dispatchEvent(new Event('change'));
                }, 100);
            }
        } else if (type === 'unit') {
            const schoolId = schoolSelect?.value;
            const deptId = courseSelect?.value;
            if (!deptId) {
                alert('Please select a course first');
                return;
            }
            
            const school = schools.find(s => s.id == schoolId);
            const dept = school?.departments?.find(d => d.id == deptId);
            const existingUnit = dept?.units?.find(u => u.name.toLowerCase() === name.toLowerCase());
            if (existingUnit) {
                alert('This unit already exists in this course!');
                return;
            }
            
            const duplicateCheck = units.find(u => 
                u.name.toLowerCase() === name.toLowerCase() && u.courseId == deptId
            );
            if (duplicateCheck) {
                alert('This unit already exists in this course!');
                return;
            }
            
            const code = prompt('Enter unit code:');
            const newUnit = await API.createUnit(name, code || '', schoolId, deptId);
            if (newUnit.exists) {
                alert('This unit already exists in this course. Using existing unit.');
            }
            newUnit.courseId = parseInt(deptId);
            newUnit.schoolId = parseInt(schoolId);
            const existingIdx = units.findIndex(u => u.id == newUnit.id);
            if (existingIdx === -1) {
                units.push(newUnit);
            }
            if (dept) {
                const unitExists = dept.units?.find(u => u.id == newUnit.id);
                if (!unitExists) {
                    dept.units = dept.units || [];
                    dept.units.push(newUnit);
                }
            }
            const schoolRef = schools.find(s => s.id == schoolId);
            if (schoolRef) {
                const schoolDept = schoolRef.departments?.find(d => d.id == deptId);
                if (schoolDept) {
                    const schoolUnitExists = schoolDept.units?.find(u => u.id == newUnit.id);
                    if (!schoolUnitExists) {
                        schoolDept.units = schoolDept.units || [];
                        schoolDept.units.push(newUnit);
                    }
                }
            }
            initCourseSelect2();
            if (courseSelect) courseSelect.dispatchEvent(new Event('change'));
            if (unitSelect && newUnit.id) {
                setTimeout(() => {
                    unitSelect.value = newUnit.id;
                }, 100);
            }
        }
    } catch (err) {
        console.error('Error creating:', err);
    }
}

// School Select Change Handler
document.getElementById('schoolSelect').addEventListener('change', function() {
    document.getElementById('commonUnitConfirmed').style.display = 'none';
    const confirmBtn = document.getElementById('confirmCommonUnitBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Common Unit';
    }
    confirmedCommonUnit = null;
    
    const courseSelect = document.getElementById('courseSelect');
    const unitSelect = document.getElementById('unitSelect');
    const courseBtn = courseSelect.nextElementSibling;
    
    const school = schools.find(s => s.id == this.value);
    const filtered = school?.departments || [];
    
    courseSelect.innerHTML = '<option value="">Select Course</option>' + 
        filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    courseSelect.disabled = !this.value;
    courseBtn.disabled = !this.value;
    
    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    unitSelect.disabled = true;
    unitSelect.nextElementSibling.disabled = true;
});

// Common Unit School Change Handler
document.getElementById('commonUnitSchool')?.addEventListener('change', function() {
    const commonDeptSelect = document.getElementById('commonUnitDept');
    const school = schools.find(s => s.id == this.value);
    const filtered = school?.departments || [];
    
    if (commonDeptSelect) {
        commonDeptSelect.innerHTML = '<option value="">Select Department</option>' + 
            filtered.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
});

// Course Select Change Handler
document.getElementById('courseSelect').addEventListener('change', function() {
    document.getElementById('commonUnitConfirmed').style.display = 'none';
    const confirmBtn = document.getElementById('confirmCommonUnitBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Common Unit';
    }
    confirmedCommonUnit = null;
    
    const unitSelect = document.getElementById('unitSelect');
    const unitBtn = unitSelect.nextElementSibling;
    const schoolSelect = document.getElementById('schoolSelect');
    
    const school = schools.find(s => s.id == schoolSelect.value);
    const course = school?.departments?.find(d => d.id == this.value);
    const filtered = course?.units || [];
    
    let unitOptions = '<option value="">Select Unit</option>';
    if (filtered.length > 0) {
        unitOptions += filtered.map(u => `<option value="${u.id}">${u.name}${u.isCommon ? ' ✓ (Common)' : ''}</option>`).join('');
    }
    unitOptions += '<option value="__common__" style="color: var(--primary); font-weight: bold;">✨ + Mark as Common Unit</option>';
    
    unitSelect.innerHTML = unitOptions;
    unitSelect.disabled = !this.value;
    if (unitBtn) unitBtn.disabled = !this.value;
});

// Unit Select Change Handler
document.getElementById('unitSelect').addEventListener('change', function() {
    if (this.value === '__common__') {
        this.value = '';
        document.getElementById('isCommonUnit').checked = true;
        document.getElementById('isCommonUnit').dispatchEvent(new Event('change'));
    } else if (this.value) {
        const selectedOption = this.options[this.selectedIndex];
        const isCommon = selectedOption.text.includes('✓');
        
        if (isCommon) {
            document.getElementById('isCommonUnit').checked = true;
            document.getElementById('isCommonUnit').dispatchEvent(new Event('change'));
        }
    }
});

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    const activeSection = document.getElementById(sectionId);
    activeSection.style.display = 'block';
    activeSection.classList.add('active');
    
    document.getElementById('breadcrumb').textContent = sectionNames[sectionId] || sectionId;
    
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[onclick="showSection('${sectionId}')"]`);
    if (activeLink) activeLink.classList.add('active');

    if (sectionId === 'notes') {
        switchNotesTab('my');
    }
    if (sectionId === 'updates') {
        switchUpdatesTab('all');
    }
    if (sectionId === 'courses') renderCourses();
    if (sectionId === 'browse') renderBrowse();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.querySelector('.sidebar-overlay').classList.remove('active');
    }
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    if (notes.length === 0) {
        container.innerHTML = `<div class="empty-state-notes">
            <img src="../images/dashboardImages/v3321_105.png" alt="No notes">
            <p>No notes yet. Click "Upload Note" to add one.</p>
        </div>`;
        return;
    }

    container.innerHTML = notes.map(note => {
        const course = departments.find(c => c.id == (note.deptId || note.dept_id));
        const unit = units.find(u => u.id == (note.unitId || note.unit_id));
        return `
            <div class="note-card">
                <div class="note-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="note-details">
                    <h4>${note.title}</h4>
                    <div class="note-meta">
                        <span><i class="fas fa-book"></i> ${course?.name || 'N/A'} - ${unit?.name || 'N/A'}</span>
                        <span><i class="fas fa-calendar"></i> ${note.date || new Date().toLocaleDateString()}</span>
                    </div>
                    <p class="note-description">${note.description || 'No description'}</p>
                </div>
                <div class="note-footer">
                    <div class="note-actions">
                        <button onclick="viewNote('${note.id}')" title="View"><i class="fas fa-eye"></i> View</button>
                        <button onclick="editNote('${note.id}')" title="Edit"><i class="fas fa-edit"></i> Edit</button>
                        <button onclick="deleteNote('${note.id}', '${note.schoolId || note.school_id}', '${note.deptId || note.dept_id}', '${note.unitId || note.unit_id}')" title="Delete" class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderUpdates() {
    const container = document.getElementById('updatesContainer');
    if (updates.length === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/v3331_93.png" alt="No updates" style="width:50%;height:auto;opacity:0.7;">
                <p>No updates yet. Post your first update!</p>
            </div>`;
        return;
    }

    container.innerHTML = updates.map(update => `
        <div class="update-card">
            <div class="update-header">
                <h4>${update.title}</h4>
                <span class="update-date">${new Date(update.createdAt).toLocaleDateString()}</span>
            </div>
            <p>${update.content}</p>
            <div class="update-meta">
                <span><i class="fas fa-user"></i> ${update.postedByName || 'Unknown'}</span>
                <span><i class="fas fa-book"></i> ${update.courseName || 'All Courses'}</span>
            </div>
            <div class="update-actions">
                <button onclick="deleteUpdate(${update.id})" class="btn-sm"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

async function switchNotesTab(tab) {
    notesTab = tab;
    document.getElementById('tabMyNotes').classList.toggle('active', tab === 'my');
    document.getElementById('tabAllNotes').classList.toggle('active', tab === 'all');
    
    if (tab === 'my') {
        const userId = user.id || 1;
        const myNotes = await API.getMyNotes(userId);
        renderNotesList(myNotes);
    } else {
        renderNotesList(notes);
    }
}

async function switchUpdatesTab(tab) {
    updatesTab = tab;
    document.getElementById('tabMyUpdates').classList.toggle('active', tab === 'my');
    document.getElementById('tabAllUpdates').classList.toggle('active', tab === 'all');
    
    if (tab === 'my') {
        const userId = user.id || 1;
        const myUpdates = await API.getMyUpdates(userId);
        renderUpdatesList(myUpdates);
    } else {
        renderUpdatesList(updates);
    }
}

function renderNotesList(notesList) {
    const container = document.getElementById('notesContainer');
    if (!notesList || notesList.length === 0) {
        container.innerHTML = `<div class="empty-state-notes">
            <img src="../images/dashboardImages/v3321_105.png" alt="No notes">
            <p>No notes found.</p>
        </div>`;
        return;
    }

    container.innerHTML = notesList.map(note => {
        return `
            <div class="note-card">
                <div class="note-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="note-details">
                    <h4>${note.title}</h4>
                    <div class="note-meta">
                        <span><i class="fas fa-book"></i> ${note.courseName || note.deptName || 'N/A'} - ${note.unitName || 'N/A'}</span>
                        <span><i class="fas fa-user"></i> ${note.uploadedByName || 'Unknown'}</span>
                        <span><i class="fas fa-calendar"></i> ${note.created_at ? new Date(note.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <p class="note-description">${note.description || 'No description'}</p>
                </div>
                <div class="note-footer">
                    <div class="note-actions">
                        <button onclick="viewNote('${note.id}')" title="View"><i class="fas fa-eye"></i> View</button>
                        ${note.user_id == user.id ? `
                        <button onclick="editNote('${note.id}')" title="Edit"><i class="fas fa-edit"></i> Edit</button>
                        <button onclick="deleteNote('${note.id}', '${note.schoolId || note.school_id}', '${note.deptId || note.dept_id}', '${note.unitId || note.unit_id}')" title="Delete" class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderUpdatesList(updatesList) {
    const container = document.getElementById('updatesContainer');
    if (!updatesList || updatesList.length === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/no notes.jpg" alt="No updates" style="width:90px;height:auto;opacity:0.7;">
                <p>No updates found.</p>
            </div>`;
        return;
    }

    container.innerHTML = updatesList.map(update => `
        <div class="update-card">
            <div class="update-header">
                <h4>${update.title}</h4>
                <span class="update-date">${update.created_at ? new Date(update.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <p>${update.content}</p>
            <div class="update-meta">
                <span><i class="fas fa-user"></i> ${update.postedByName || 'Unknown'}</span>
                <span><i class="fas fa-book"></i> ${update.courseName || 'All Courses'}</span>
            </div>
            ${update.user_id == user.id ? `
            <div class="update-actions">
                <button onclick="deleteUpdate(${update.id})" class="btn-sm"><i class="fas fa-trash"></i> Delete</button>
            </div>
            ` : ''}
        </div>
    `).join('');
}

function renderCourses() {
    const container = document.getElementById('coursesContainer');
    if (!container) return;
    
    if (departments.length === 0) {
        container.innerHTML = `<div class="empty-state-courses">
            <img src="../images/dashboardImages/Gemini_Generated_Image_r15vymr15vymr15v-removebg-preview.png" alt="No departments">
            <p>No departments in this school. Click "Add Course" to create one.</p>
        </div>`;
        return;
    }

    container.innerHTML = departments.map(course => {
        const courseUnits = units.filter(u => u.courseId == course.id);
        const school = schools.find(s => s.id == course.schoolId);
        return `
            <div class="course-item">
                <div class="course-header" onclick="toggleCourseUnits('${course.id}')">
                    <div class="course-info">
                        <h3>${course.name}</h3>
                        <span>${course.code || ''} - ${school?.name || 'Unknown School'}</span>
                    </div>
                    <div class="course-actions" onclick="event.stopPropagation()">
                        <button onclick="addUnitToCourse('${course.id}')"><i class="fas fa-plus"></i> Add Unit</button>
                        <button onclick="editCourse('${course.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="course-units" id="courseUnits${course.id}">
                    ${courseUnits.length === 0 ? '<p style="padding:10px;color:var(--text-secondary)">No units yet</p>' : 
                        courseUnits.map(unit => `
                            <div class="unit-item">
                                <span>${unit.name} (${unit.code || ''})</span>
                                <div>
                                    ${unit.isCommon ? '<span class="common-badge">Common</span>' : ''}
                                    <button onclick="deleteUnit('${unit.id}')" style="margin-left:10px;padding:5px 10px;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);cursor:pointer;"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

function toggleCourseUnits(deptId) {
    const el = document.getElementById(`courseUnits${deptId}`);
    if (el) el.classList.toggle('show');
}

function openCourseModal(deptId = null) {
    const modal = document.getElementById('courseModal');
    const title = document.getElementById('courseModalTitle');
    const schoolSelect = document.getElementById('courseSchoolSelect');
    const courseSelect = document.getElementById('courseCourseSelect');
    const unitSelect = document.getElementById('courseUnitSelect');
    const enrolledSchoolId = localStorage.getItem('selected_school');
    
    schoolSelect.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    courseSelect.innerHTML = '<option value="">Select Course</option>';
    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    
    courseSelect.disabled = true;
    unitSelect.disabled = true;
    
    courseSelect.nextElementSibling.disabled = true;
    unitSelect.nextElementSibling.disabled = true;
    
    schoolSelect.onchange = function() {
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        courseSelect.disabled = !this.value;
        unitSelect.disabled = true;
        courseSelect.nextElementSibling.disabled = !this.value;
        unitSelect.nextElementSibling.disabled = true;
        
        if (this.value) {
            const school = schools.find(s => s.id == this.value);
            const schoolCourses = school?.departments || [];
            
            if (schoolCourses.length === 0) {
                courseSelect.innerHTML = '<option value="">No courses - click + to create one</option>';
                courseSelect.disabled = false;
                courseSelect.nextElementSibling.disabled = false;
            } else {
                courseSelect.innerHTML = '<option value="">Select Course</option>' + 
                    schoolCourses.map(c => `<option value="${c.id}">${c.name} (${c.code || ''})</option>`).join('');
                courseSelect.disabled = false;
                courseSelect.nextElementSibling.disabled = false;
            }
        }
    };
    
    courseSelect.onchange = function() {
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        unitSelect.disabled = !this.value;
        unitSelect.nextElementSibling.disabled = !this.value;
        
        if (this.value) {
            const school = schools.find(s => s.id == schoolSelect.value);
            const course = school?.departments?.find(d => d.id == this.value);
            const courseUnits = course?.units || [];
            
            let optionsHtml = '<option value="">Select Unit</option>';
            
            if (courseUnits.length > 0) {
                optionsHtml += courseUnits.map(u => `<option value="${u.id}">${u.name} (${u.code || ''})</option>`).join('');
            }
            
            optionsHtml += '<option value="__common__">+ Mark as Common Unit</option>';
            
            unitSelect.innerHTML = optionsHtml;
            unitSelect.disabled = false;
            unitSelect.nextElementSibling.disabled = false;
        }
    };
    
    unitSelect.onchange = function() {
        if (this.value === '__common__') {
            this.value = '';
            openCommonUnitModal();
        }
    };
    
    if (deptId) {
        title.textContent = 'Select Course/Unit';
        const course = departments.find(c => c.id == deptId);
        if (course) {
            schoolSelect.value = course.schoolId;
            courseSelect.disabled = false;
            courseSelect.nextElementSibling.disabled = false;
            
            const school = schools.find(s => s.id == course.schoolId);
            const schoolCourses = school?.departments || [];
            
            courseSelect.innerHTML = '<option value="">Select Course</option>' + 
                schoolCourses.map(c => `<option value="${c.id}">${c.name} (${c.code || ''})</option>`).join('');
            courseSelect.value = course.id;
            
            const dept = school?.departments?.find(d => d.id == course.id);
            const courseUnits = dept?.units || [];
            
            let unitOptions = '<option value="">Select Unit</option>';
            if (courseUnits.length > 0) {
                unitOptions += courseUnits.map(u => `<option value="${u.id}">${u.name} (${u.code || ''})</option>`).join('');
            }
            unitOptions += '<option value="__common__">+ Mark as Common Unit</option>';
            
            unitSelect.innerHTML = unitOptions;
            unitSelect.disabled = false;
            unitSelect.nextElementSibling.disabled = false;
        }
    } else {
        title.textContent = 'Select Course/Unit';
        document.getElementById('courseForm').reset();
        
        if (enrolledSchoolId) {
            schoolSelect.value = enrolledSchoolId;
            schoolSelect.dispatchEvent(new Event('change'));
        }
    }
    
    modal.style.display = 'flex';
}

function initCourseSelect2() {
    const schoolSelect = document.getElementById('courseSchoolSelect');
    const courseSelect = document.getElementById('courseCourseSelect');
    const unitSelect = document.getElementById('courseUnitSelect');
    
    if (!schoolSelect) return;
    
    const enrolledSchoolId = localStorage.getItem('selected_school');
    
    schoolSelect.addEventListener('change', function() {
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        courseSelect.disabled = !this.value;
        unitSelect.disabled = true;
        courseSelect.nextElementSibling.disabled = !this.value;
        unitSelect.nextElementSibling.disabled = true;
        
        if (this.value) {
            const school = schools.find(s => s.id == this.value);
            const schoolCourses = school?.departments || [];
            
            courseSelect.innerHTML = '<option value="">Select Course</option>' + 
                schoolCourses.map(c => `<option value="${c.id}">${c.name} (${c.code || ''})</option>`).join('');
            courseSelect.disabled = false;
            courseSelect.nextElementSibling.disabled = false;
        }
    });
    
    courseSelect.addEventListener('change', function() {
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        unitSelect.disabled = !this.value;
        unitSelect.nextElementSibling.disabled = !this.value;
        
        if (this.value) {
            const school = schools.find(s => s.id == schoolSelect.value);
            const course = school?.departments?.find(d => d.id == this.value);
            const courseUnits = course?.units || [];
            
            let optionsHtml = '<option value="">Select Unit</option>';
            
            if (courseUnits.length > 0) {
                optionsHtml += courseUnits.map(u => `<option value="${u.id}">${u.name} (${u.code || ''})</option>`).join('');
            }
            
            optionsHtml += '<option value="__common__">+ Mark as Common Unit</option>';
            
            unitSelect.innerHTML = optionsHtml;
            unitSelect.disabled = false;
            unitSelect.nextElementSibling.disabled = false;
        }
    });
    
    unitSelect.addEventListener('change', function() {
        if (this.value === '__common__') {
            this.value = '';
            openCommonUnitModal();
        }
    });
    
    if (enrolledSchoolId) {
        schoolSelect.value = enrolledSchoolId;
        schoolSelect.dispatchEvent(new Event('change'));
    }
}

function openCommonUnitModal() {
    const modal = document.getElementById('commonUnitModal');
    const schoolSelect = document.getElementById('commonUnitSchoolSelect');
    const deptSelect = document.getElementById('commonUnitDeptSelect');
    const shareWithSelect = document.getElementById('commonUnitShareWith');
    
    schoolSelect.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    deptSelect.innerHTML = '<option value="">Select Department</option>';
    deptSelect.disabled = true;
    
    shareWithSelect.innerHTML = '<option value="">Select courses to share with</option>';
    
    modal.style.display = 'flex';
    
    schoolSelect.onchange = function() {
        const schoolId = this.value;
        
        const school = schools.find(s => s.id == schoolId);
        const filteredDepts = school?.departments || [];
        
        deptSelect.innerHTML = '<option value="">Select Department</option>' + 
            filteredDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        deptSelect.disabled = !this.value;
        
        const selectedDeptId = deptSelect.value;
        const selectedDept = filteredDepts.find(d => d.id == selectedDeptId);
        
        let availableCourses = [];
        if (selectedDept) {
            schools.forEach(s => {
                s.departments?.forEach(d => {
                    if (d.id != selectedDeptId) {
                        availableCourses.push({ id: d.id, name: `${s.name} - ${d.name}` });
                    }
                });
            });
        }
        
        shareWithSelect.innerHTML = '<option value="">Select courses to share with</option>' +
            availableCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    };
    
    deptSelect.onchange = function() {
        const selectedDeptId = this.value;
        const schoolId = schoolSelect.value;
        const school = schools.find(s => s.id == schoolId);
        
        let availableCourses = [];
        schools.forEach(s => {
            s.departments?.forEach(d => {
                if (d.id != selectedDeptId) {
                    availableCourses.push({ id: d.id, name: `${s.name} - ${d.name}` });
                }
            });
        });
        
        shareWithSelect.innerHTML = '<option value="">Select courses to share with</option>' +
            availableCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    };
}

function closeCommonUnitModal() {
    document.getElementById('commonUnitModal').style.display = 'none';
    document.getElementById('commonUnitModal').querySelector('.modal-header h3').innerHTML = '<i class="fas fa-share-alt"></i> Share Common Unit';
    pendingNoteData = null;
}

let pendingNoteData = null;
function openCommonUnitModalFromCheckbox() {
    pendingNoteData = {
        title: document.getElementById('noteTitle').value,
        content: document.getElementById('noteContent').value,
        description: document.getElementById('noteContent').value,
        schoolId: document.getElementById('schoolSelect').value,
        deptId: document.getElementById('courseSelect').value,
        file: document.getElementById('noteFile').files[0]
    };
    
    const modal = document.getElementById('commonUnitModal');
    const schoolSelect = document.getElementById('commonUnitSchoolSelect');
    const deptSelect = document.getElementById('commonUnitDeptSelect');
    
    schoolSelect.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    deptSelect.innerHTML = '<option value="">Select Department</option>';
    deptSelect.disabled = true;
    
    document.getElementById('commonUnitModal').querySelector('.modal-header h3').innerHTML = '<i class="fas fa-share-alt"></i> Create Common Unit & Upload Note';
    
    modal.style.display = 'flex';
    
    schoolSelect.onchange = function() {
        const schoolId = this.value;
        
        // FIX: Get departments from global departments array
        const filteredDepts = departments.filter(d => d.schoolId == schoolId);
        
        if (filteredDepts.length === 0) {
            deptSelect.innerHTML = '<option value="">No departments available</option>';
            deptSelect.disabled = true;
        } else {
            deptSelect.innerHTML = '<option value="">Select Department</option>' + 
                filteredDepts.map(d => `<option value="${d.id}">${d.name} ${d.code ? '(' + d.code + ')' : ''}</option>`).join('');
            deptSelect.disabled = false;
        }
    };
}

async function confirmCommonUnit() {
    const schoolId = document.getElementById('commonUnitSchoolSelect').value;
    const deptId = document.getElementById('commonUnitDeptSelect').value;
    const shareWithSelect = document.getElementById('commonUnitShareWith');
    const selectedShareWith = Array.from(shareWithSelect.selectedOptions).map(opt => parseInt(opt.value));
    
    if (!schoolId || !deptId) {
        showNotification('Please select both school and department', 'error');
        return;
    }
    
    const school = schools.find(s => s.id == schoolId);
    const dept = school?.departments?.find(d => d.id == deptId);
    
    if (!school) {
        showNotification('Selected school not found', 'error');
        return;
    }
    
    if (!dept) {
        showNotification('Selected department not found', 'error');
        return;
    }
    
    const unitName = prompt('Enter the name of the common unit you want to share:');
    if (!unitName || unitName.trim() === '') {
        showNotification('Unit name is required', 'error');
        return;
    }
    
    const unitCode = prompt('Enter unit code (optional):');
    
    const confirmBtn = document.querySelector('#commonUnitModal button[onclick="confirmCommonUnit()"]');
    const originalBtnText = confirmBtn?.innerHTML || 'Confirm';
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        confirmBtn.disabled = true;
    }
    
    try {
        const newUnit = await API.createUnit(unitName.trim(), unitCode?.trim() || '', schoolId, deptId, true);
        
        newUnit.courseId = parseInt(deptId);
        newUnit.schoolId = parseInt(schoolId);
        
        if (!units.find(u => u.id == newUnit.id)) {
            units.push(newUnit);
        }
        
        if (dept) {
            if (!dept.units) dept.units = [];
            if (!dept.units.find(u => u.id == newUnit.id)) {
                dept.units.push(newUnit);
            }
        }
        
        if (school && school.departments) {
            const schoolDept = school.departments.find(d => d.id == deptId);
            if (schoolDept) {
                if (!schoolDept.units) schoolDept.units = [];
                if (!schoolDept.units.find(u => u.id == newUnit.id)) {
                    schoolDept.units.push(newUnit);
                }
            }
        }
        
        for (const shareCourseId of selectedShareWith) {
            try {
                const shareSchool = schools.find(s => s.departments?.some(d => d.id == shareCourseId));
                await API.createUnit(newUnit.name, newUnit.code || '', shareSchool?.id || schoolId, shareCourseId, true);
                
                const shareDept = shareSchool?.departments?.find(d => d.id == shareCourseId);
                if (shareDept) {
                    if (!shareDept.units) shareDept.units = [];
                    if (!shareDept.units.find(u => u.id == newUnit.id)) {
                        shareDept.units.push(newUnit);
                    }
                }
            } catch (e) {
                console.warn(`Failed to share unit with course ${shareCourseId}:`, e);
            }
        }
        
        closeCommonUnitModal();
        
        if (pendingNoteData) {
            await handlePendingNoteUpload(newUnit, schoolId, deptId);
        } else {
            await handleUnitSelectionOnly(newUnit, schoolId, deptId);
        }
        
        showNotification(`Common unit "${newUnit.name}" created and shared with ${selectedShareWith.length} course(s)!`, 'success');
        
    } catch (err) {
        console.error('Error creating common unit:', err);
        let errorMessage = 'Failed to create common unit';
        
        if (err.message) {
            errorMessage += `: ${err.message}`;
        } else if (err.error) {
            errorMessage += `: ${err.error}`;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.innerHTML = originalBtnText;
            confirmBtn.disabled = false;
        }
    }
}

// Helper function to handle pending note upload
async function handlePendingNoteUpload(newUnit, schoolId, deptId) {
    const data = {
        title: pendingNoteData.title,
        content: pendingNoteData.content,
        description: pendingNoteData.description,
        uploadedBy: user.name || 'Unknown',
        uploadedByName: user.name || 'Unknown',
        userId: user.id,
        user_id: user.id,
        file: pendingNoteData.file,
        school_id: parseInt(schoolId),
        dept_id: parseInt(deptId),
        unit_id: newUnit.id
    };
    
    try {
        const newNote = await API.createNote(data);
        if (!notes.find(n => n.id == newNote.id)) {
            notes.unshift(newNote);
        }
        showNotification('Note uploaded successfully!', 'success');
    } catch (err) {
        console.error('Error saving note:', err);
        // Fallback to local storage
        data.id = Date.now();
        data.school_id = parseInt(schoolId);
        data.dept_id = parseInt(deptId);
        data.unit_id = newUnit.id;
        data.created_at = new Date().toISOString();
        notes.unshift(data);
        showNotification('Note saved locally (server error)', 'warning');
    }
    
    // Clean up
    document.getElementById('isCommonUnit').checked = false;
    pendingNoteData = null;
    closeNoteModal();
    renderNotes();
    updateStats();
    renderRecentNotes();
}

// Helper function to handle unit selection only (no pending note)
async function handleUnitSelectionOnly(newUnit, schoolId, deptId) {
    const schoolSelect = document.getElementById('schoolSelect');
    const courseSelect = document.getElementById('courseSelect');
    const unitSelect = document.getElementById('unitSelect');
    
    if (schoolSelect) {
        schoolSelect.value = schoolId;
        schoolSelect.dispatchEvent(new Event('change'));
        
        // Wait for school change to populate courses
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (courseSelect) {
            courseSelect.value = deptId;
            courseSelect.dispatchEvent(new Event('change'));
            
            // Wait for course change to populate units
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (unitSelect) {
                // Check if unit already exists in dropdown
                let unitOption = Array.from(unitSelect.options).find(opt => opt.value == newUnit.id);
                
                if (!unitOption) {
                    // Add new unit option
                    const option = document.createElement('option');
                    option.value = newUnit.id;
                    option.textContent = `${newUnit.name} ${newUnit.code ? '(' + newUnit.code + ')' : ''} ✓ (Common)`;
                    unitSelect.appendChild(option);
                }
                
                unitSelect.value = newUnit.id;
            }
        }
    }
    
    showNotification(`Common unit "${newUnit.name}" created and selected!`, 'success');
}

function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
}

function addUnitRow() {
    const container = document.getElementById('unitsContainer');
    const row = document.createElement('div');
    row.className = 'unit-input-row';
    row.innerHTML = `
        <input type="text" class="unit-name" placeholder="Unit name">
        <input type="text" class="unit-code" placeholder="Code">
        <button type="button" class="btn-remove-unit" onclick="removeUnitRow(this)"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

function removeUnitRow(btn) {
    const container = document.getElementById('unitsContainer');
    if (container.children.length > 1) {
        btn.parentElement.remove();
    }
}

function addUnitToCourse(deptId) {
    const course = departments.find(c => c.id == deptId);
    if (!course) {
        alert('Course not found');
        return;
    }
    
    const isCommon = confirm('Is this a shared/common unit across departments? Click OK for Yes, Cancel for No.');
    
    let targetDeptId = deptId;
    let targetSchoolId = course.schoolId;
    
    if (isCommon) {
        const sharedDeptId = prompt(`Enter the department ID to share this unit with (different from ${course.name}):`);
        if (!sharedDeptId) return;
        
        const dept = departments.find(d => d.id == sharedDeptId);
        if (dept) {
            targetDeptId = sharedDeptId;
            targetSchoolId = dept.schoolId;
        }
    }
    
    const unitName = prompt(`Add new unit to ${course.name}:`);
    if (!unitName) return;
    
    const unitCode = prompt('Unit code:');
    
    (async () => {
        try {
            const newUnit = await API.createUnit(unitName, unitCode || '', targetSchoolId, targetDeptId);
            newUnit.courseId = targetDeptId;
            newUnit.schoolId = targetSchoolId;
            
            if (!units.find(u => u.id == newUnit.id)) {
                units.push(newUnit);
            }
            
            const dept = departments.find(d => d.id == targetDeptId);
            if (dept) {
                if (!dept.units) dept.units = [];
                if (!dept.units.find(u => u.id == newUnit.id)) {
                    dept.units.push(newUnit);
                }
            }
            
            const school = schools.find(s => s.id == targetSchoolId);
            if (school) {
                const schoolDept = school.departments?.find(d => d.id == targetDeptId);
                if (schoolDept) {
                    if (!schoolDept.units) schoolDept.units = [];
                    if (!schoolDept.units.find(u => u.id == newUnit.id)) {
                        schoolDept.units.push(newUnit);
                    }
                }
            }
            
            renderCourses();
            alert(`Unit "${newUnit.name}" created successfully!`);
        } catch (err) {
            console.error('Error creating unit:', err);
            alert('Failed to create unit');
        }
    })();
}

function editCourse(id) {
    openCourseModal(id);
}

async function deleteCourse(id) {
    if (!confirm('Delete this course and all its units?')) return;
    try {
        await API.deleteCourse(id);
    } catch (err) {
        console.error('Error deleting course:', err);
    }
    departments = departments.filter(c => c.id != id);
    units = units.filter(u => u.courseId != id);
    renderCourses();
    updateStats();
}

async function deleteUnit(id) {
    if (!confirm('Delete this unit?')) return;
    try {
        await API.deleteUnit(id);
    } catch (err) {
        console.error('Error deleting unit:', err);
    }
    units = units.filter(u => u.id != id);
    renderCourses();
}

function addDeptToSchool(schoolId) {
    const school = schools.find(s => s.id == schoolId);
    const name = prompt(`Add new department to ${school?.name}:`);
    if (!name) return;
    
    const code = prompt('Department code (e.g., BCS):');
    
    (async () => {
        try {
            const newDept = await API.createDepartment(name, code || '', schoolId);
            newDept.schoolId = parseInt(schoolId);
            
            if (!departments.find(d => d.id == newDept.id)) {
                departments.push(newDept);
            }
            
            if (school) {
                if (!school.departments) school.departments = [];
                if (!school.departments.find(d => d.id == newDept.id)) {
                    school.departments.push(newDept);
                }
            }
            
            renderBrowse();
            updateStats();
            alert(`Department "${newDept.name}" created successfully!`);
        } catch (err) {
            console.error('Error creating department:', err);
            alert('Failed to create department');
        }
    })();
}

function addUnitToDept(schoolId, deptId) {
    const school = schools.find(s => s.id == schoolId);
    const dept = school?.departments?.find(d => d.id == deptId);
    
    const name = prompt(`Add new unit to ${dept?.name}:`);
    if (!name) return;
    
    const code = prompt('Unit code (e.g., BCS 101):');
    
    (async () => {
        try {
            const newUnit = await API.createUnit(name, code || '', schoolId, deptId);
            newUnit.courseId = parseInt(deptId);
            newUnit.schoolId = parseInt(schoolId);
            
            if (!units.find(u => u.id == newUnit.id)) {
                units.push(newUnit);
            }
            
            if (dept) {
                if (!dept.units) dept.units = [];
                if (!dept.units.find(u => u.id == newUnit.id)) {
                    dept.units.push(newUnit);
                }
            }
            
            renderBrowse();
            updateStats();
            alert(`Unit "${newUnit.name}" created successfully!`);
        } catch (err) {
            console.error('Error creating unit:', err);
            alert('Failed to create unit');
        }
    })();
}

async function deleteNote(noteId, schoolId, deptId, unitId) {
    if (!confirm('Delete this note?')) return;
    try {
        await API.deleteNote(noteId, schoolId, deptId, unitId);
    } catch (err) {
        console.error('Error deleting note:', err);
    }
    notes = notes.filter(n => n.id != noteId);
    renderNotes();
    showNotification('Note deleted successfully!', 'info');
}

document.getElementById('courseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const schoolId = document.getElementById('courseSchoolSelect').value;
    const courseId = document.getElementById('courseCourseSelect').value;
    const unitId = document.getElementById('courseUnitSelect').value;
    
    if (!schoolId || !courseId) {
        alert('Please select a school and course');
        return;
    }
    
    if (unitId) {
        console.log('Selected unit:', unitId);
    }
    
    const course = departments.find(c => c.id == courseId);
    alert(`Saved to: ${course?.name || 'course'}`);
    closeCourseModal();
    renderCourses();
});

// Browse Icons and Colors
const schoolIcons = ['fa-university', 'fa-graduation-cap', 'fa-book-reader', 'fa-school', 'fa-building', 'fa-award'];
const schoolColors = [
    { bg: '#e3f2fd', color: '#1565c0' },
    { bg: '#fff3e0', color: '#e65100' },
    { bg: '#e8f5e9', color: '#2e7d32' },
    { bg: '#f3e5f5', color: '#7b1fa2' },
    { bg: '#ffebee', color: '#c62828' },
    { bg: '#e0f7fa', color: '#00695c' }
];

const deptIcons = ['fa-laptop-code', 'fa-calculator', 'fa-flask', 'fa-palette', 'fa-gavel', 'fa-heartbeat', 'fa-cogs', 'fa-leaf', 'fa-dna', 'fa-music'];
const deptColors = [
    { bg: '#f3e5f5', color: '#7b1fa2' },
    { bg: '#e3f2fd', color: '#1565c0' },
    { bg: '#fff3e0', color: '#e65100' },
    { bg: '#e8f5e9', color: '#2e7d32' },
    { bg: '#ffebee', color: '#c62828' },
    { bg: '#e0f7fa', color: '#00695c' },
    { bg: '#fce4ec', color: '#ad1457' },
    { bg: '#fff8e1', color: '#ff8f00' },
    { bg: '#e8eaf6', color: '#3f51b5' },
    { bg: '#f1f8e9', color: '#689f38' }
];

const unitIcons = ['fa-code', 'fa-database', 'fa-brain', 'fa-network-wired', 'fa-robot', 'fa-shield-alt', 'fa-chart-line', 'fa-pen-nib', 'fa-atom', 'fa-draw-polygon'];
const unitColors = [
    { bg: '#e8f5e9', color: '#388e3c' },
    { bg: '#e3f2fd', color: '#1976d2' },
    { bg: '#fff3e0', color: '#f57c00' },
    { bg: '#f3e5f5', color: '#7b1fa2' },
    { bg: '#ffebee', color: '#d32f2f' },
    { bg: '#e0f7fa', color: '#0097a7' },
    { bg: '#fce4ec', color: '#c2185b' },
    { bg: '#f5f5f5', color: '#616161' },
    { bg: '#e8eaf6', color: '#5c6bc0' },
    { bg: '#efebe9', color: '#795548' }
];

function getIcon(index, icons) {
    return icons[index % icons.length];
}

function getColor(index, colors) {
    return colors[index % colors.length];
}

async function renderBrowse() {
    const container = document.getElementById('browseGrid');
    const breadcrumb = document.getElementById('browseBreadcrumb');
    
    if (!browseLevel.schoolId && !browseLevel.deptId) {
        breadcrumb.innerHTML = '<span>All Schools</span>';
        
        if (schools.length === 0) {
            container.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/v3331_93.png" alt="No schools" style="width:150px;height:auto;opacity:0.7;">
                <p>No schools available. Click the + button to create one.</p>
            </div>`;
            return;
        }
        
        container.innerHTML = schools.map((school, idx) => {
            const color = getColor(idx, schoolColors);
            return `
                <div class="browse-item" onclick="showSchoolDepartments('${school.id}')">
                    <div class="browse-icon" style="background: ${color.bg}; color: ${color.color};">
                        <i class="fas ${getIcon(idx, schoolIcons)}"></i>
                    </div>
                    <div class="browse-info">
                        <h4>${school.name}</h4>
                        <span>${school.departments?.length || 0} departments</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }).join('');
        
    } 
    else if (browseLevel.schoolId && !browseLevel.deptId) {
        const school = schools.find(s => s.id == browseLevel.schoolId);
        const depts = school.departments || [];
        
        breadcrumb.innerHTML = `
            <a href="#" onclick="resetBrowse()">Schools</a>
            <i class="fas fa-chevron-right"></i>
            <span>${school?.name || 'Unknown'}</span>
        `;
        
        if (depts.length === 0) {
            container.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/Gemini_Generated_Image_r15vymr15vymr15v.png" alt="No departments" style="width:400px;height:400px;opacity:0.7;">
                <p>No departments in this school.</p>
                <button class="btn-primary" onclick="addDeptToSchool('${browseLevel.schoolId}')" style="margin-top:16px;">
                    <i class="fas fa-plus"></i> Add Department
                </button>
            </div>`;
            return;
        }
        
        container.innerHTML = depts.map((dept, idx) => {
            const color = getColor(idx, deptColors);
            return `
                <div class="browse-item" onclick="showDeptUnits('${dept.id}')">
                    <div class="browse-icon" style="background: ${color.bg}; color: ${color.color};">
                        <i class="fas ${getIcon(idx, deptIcons)}"></i>
                    </div>
                    <div class="browse-info">
                        <h4>${dept.name}</h4>
                        <span>${dept.code || ''} - ${dept.units?.length || 0} units</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }).join('');
        
    } else if (browseLevel.deptId) {
        const school = schools.find(s => s.id == browseLevel.schoolId);
        const dept = (school.departments || []).find(d => d.id == browseLevel.deptId);
        const unitsList = dept?.units || [];
        
        breadcrumb.innerHTML = `
            <a href="#" onclick="resetBrowse()">Schools</a>
            <i class="fas fa-chevron-right"></i>
            <a href="#" onclick="showSchoolDepartments('${browseLevel.schoolId}')">${school?.name || 'School'}</a>
            <i class="fas fa-chevron-right"></i>
            <span>${dept?.name || 'Department'}</span>
        `;
        
        if (unitsList.length === 0) {
            container.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/Gemini_Generated_Image_r15vymr15vymr15v.png" alt="No units" style="width:400px;height:150px;opacity:0.7;">
                <p>No units in this department.</p>
                <button class="btn-primary" onclick="addUnitToDept('${browseLevel.schoolId}', '${browseLevel.deptId}')" style="margin-top:16px;">
                    <i class="fas fa-plus"></i> Add Unit
                </button>
            </div>`;
            return;
        }
        
        container.innerHTML = unitsList.map((unit, idx) => {
            const color = getColor(idx, unitColors);
            return `
                <div class="browse-item" onclick="showUnitNotes('${unit.id}')">
                    <div class="browse-icon" style="background: ${color.bg}; color: ${color.color};">
                        <i class="fas ${getIcon(idx, unitIcons)}"></i>
                    </div>
                    <div class="browse-info">
                        <h4>${unit.name}</h4>
                        <span>${unit.code || ''}</span>
                        <p>Upload ${unit.name} notes here</p>
                    </div>
                    <button class="btn-sm" onclick="event.stopPropagation(); quickUploadToUnit('${unit.id}')">
                        <i class="fas fa-upload"></i> Upload
                    </button>
                </div>
            `;
        }).join('');
    }
}

function showSchoolDepartments(schoolId) {
    browseLevel.schoolId = schoolId;
    browseLevel.deptId = null;
    renderBrowse();
}

function showDeptUnits(deptId) {
    browseLevel.deptId = deptId;
    renderBrowse();
}

function resetBrowse() {
    browseLevel = { schoolId: null, deptId: null };
    renderBrowse();
}

async function showUnitNotes(unitId) {
    const schoolId = browseLevel.schoolId;
    const deptId = browseLevel.deptId;
    unitNotes[unitId] = await API.getNotes(schoolId, deptId, unitId);
    alert(`Notes for this unit: ${JSON.stringify(unitNotes[unitId])}`);
}

function quickUploadToUnit(unitId) {
    const unit = units.find(u => u.id == unitId);
    const course = departments.find(c => c.id == unit?.deptId);
    const school = schools.find(s => s.id == (course?.schoolId || unit?.schoolId));
    
    document.getElementById('schoolSelect').value = school?.id || '';
    document.getElementById('schoolSelect').dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        document.getElementById('courseSelect').value = course?.id || '';
        document.getElementById('courseSelect').dispatchEvent(new Event('change'));
        setTimeout(() => {
            document.getElementById('unitSelect').value = unitId;
        }, 100);
    }, 100);
    
    showSection('notes');
    openNoteModal();
}

function openNoteModal(noteId = null) {
    const modal = document.getElementById('noteModal');
    const title = document.getElementById('noteModalTitle');
    const schoolSelect = document.getElementById('schoolSelect');
    const courseSelect = document.getElementById('courseSelect');
    const unitSelect = document.getElementById('unitSelect');
    const enrolledSchoolId = localStorage.getItem('selected_school');
    
    schoolSelect.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (noteId) {
        const note = notes.find(n => n.id == noteId);
        if (!note) {
            alert('Note not found');
            return;
        }
        title.textContent = 'Edit Note';
        document.getElementById('noteId').value = note.id;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.description || note.content || '';
        
        const schoolId = note.schoolId || note.school_id;
        const deptId = note.deptId || note.course_id || note.dept_id;
        const unitIdVal = note.unitId || note.unit_id;
        
        document.getElementById('schoolSelect').value = schoolId || '';
        document.getElementById('schoolSelect').dispatchEvent(new Event('change'));
        
        setTimeout(() => {
            document.getElementById('courseSelect').value = deptId || '';
            document.getElementById('courseSelect').dispatchEvent(new Event('change'));
            setTimeout(() => {
                document.getElementById('unitSelect').value = unitIdVal || '';
            }, 100);
        }, 100);
    } else {
        title.textContent = 'Upload Note';
        document.getElementById('noteForm').reset();
        document.getElementById('noteId').value = '';
        courseSelect.disabled = true;
        unitSelect.disabled = true;
        courseSelect.nextElementSibling.disabled = true;
        unitSelect.nextElementSibling.disabled = true;
        
        if (browseLevel.schoolId) {
            schoolSelect.value = browseLevel.schoolId;
            schoolSelect.dispatchEvent(new Event('change'));
            setTimeout(() => {
                if (browseLevel.deptId) {
                    courseSelect.value = browseLevel.deptId;
                    courseSelect.dispatchEvent(new Event('change'));
                }
            }, 150);
        } else if (enrolledSchoolId) {
            schoolSelect.value = enrolledSchoolId;
            schoolSelect.dispatchEvent(new Event('change'));
        }
    }
    
    modal.style.display = 'flex';
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
    document.getElementById('isCommonUnit').checked = false;
    document.getElementById('commonUnitSection').style.display = 'none';
    document.getElementById('commonUnitConfirmed').style.display = 'none';
    document.getElementById('commonUnitSchool').value = '';
    document.getElementById('commonUnitDept').value = '';
    document.getElementById('commonUnitName').value = '';
    document.getElementById('commonUnitCode').value = '';
    const confirmBtn = document.getElementById('confirmCommonUnitBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Common Unit';
    }
    confirmedCommonUnit = null;
}

function editNote(id) {
    openNoteModal(id);
}

function viewNote(id) {
    const note = notes.find(n => n.id == id);
    if (!note) {
        alert('Note not found');
        return;
    }
    alert(`Title: ${note.title}\nContent: ${note.content || 'No description'}`);
}

document.getElementById('isCommonUnit').addEventListener('change', function() {
    const commonSection = document.getElementById('commonUnitSection');
    const confirmedDiv = document.getElementById('commonUnitConfirmed');
    if (this.checked) {
        commonSection.style.display = 'block';
        
        const unitSelect = document.getElementById('unitSelect');
        const courseSelect = document.getElementById('courseSelect');
        const schoolSelect = document.getElementById('schoolSelect');
        
        if (unitSelect.value && courseSelect.value && schoolSelect.value) {
            const schoolId = schoolSelect.value;
            const deptId = courseSelect.value;
            const school = schools.find(s => s.id == schoolId);
            const dept = school?.departments?.find(d => d.id == deptId);
            const unit = dept?.units?.find(u => u.id == unitSelect.value);
            
            if (unit) {
                const commonSchoolSelect = document.getElementById('commonUnitSchool');
                const commonDeptSelect = document.getElementById('commonUnitDept');
                const commonNameInput = document.getElementById('commonUnitName');
                const commonCodeInput = document.getElementById('commonUnitCode');
                
                if (commonSchoolSelect) {
                    commonSchoolSelect.innerHTML = '<option value="">Select School</option>' + 
                        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                    commonSchoolSelect.value = schoolId;
                    commonSchoolSelect.dispatchEvent(new Event('change'));
                    
                    setTimeout(() => {
                        if (commonDeptSelect) {
                            commonDeptSelect.value = deptId;
                            commonNameInput.value = unit.name;
                            commonCodeInput.value = unit.code || '';
                            
                            confirmedCommonUnit = {
                                unit: unit,
                                schoolId: parseInt(schoolId),
                                deptId: parseInt(deptId)
                            };
                            
                            if (confirmedDiv) confirmedDiv.style.display = 'block';
                            const confirmBtn = document.getElementById('confirmCommonUnitBtn');
                            if (confirmBtn) {
                                confirmBtn.disabled = true;
                                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Auto-filled from selection';
                            }
                        }
                    }, 100);
                }
                return;
            }
        }
        
        const commonSchoolSelect = document.getElementById('commonUnitSchool');
        if (commonSchoolSelect) {
            commonSchoolSelect.innerHTML = '<option value="">Select School</option>' + 
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
            commonSchoolSelect.onchange = function() {
                const school = schools.find(s => s.id == this.value);
                const depts = school?.departments || [];
                const commonDeptSelect = document.getElementById('commonUnitDept');
                if (commonDeptSelect) {
                    commonDeptSelect.innerHTML = '<option value="">Select Department</option>' + 
                        depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                    commonDeptSelect.disabled = !this.value;
                }
            };
        }
    } else {
        commonSection.style.display = 'none';
        if (confirmedDiv) confirmedDiv.style.display = 'none';
        document.getElementById('commonUnitSchool').value = '';
        document.getElementById('commonUnitDept').value = '';
        document.getElementById('commonUnitName').value = '';
        document.getElementById('commonUnitCode').value = '';
        confirmedCommonUnit = null;
        const confirmBtn = document.getElementById('confirmCommonUnitBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Common Unit';
        }
    }
});

document.getElementById('noteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const isCommonUnitChecked = document.getElementById('isCommonUnit').checked;
    
    let schoolId, deptId, unitId;
    
    if (isCommonUnitChecked) {
        if (!confirmedCommonUnit) {
            alert('Please confirm/select the common unit (auto-filled or manual)');
            return;
        }
        schoolId = confirmedCommonUnit.schoolId;
        deptId = confirmedCommonUnit.deptId;
        unitId = confirmedCommonUnit.unit.id;
    } else {
        schoolId = document.getElementById('schoolSelect').value;
        deptId = document.getElementById('courseSelect').value;
        unitId = document.getElementById('unitSelect').value;
    }
    
    if (!schoolId || !deptId || !unitId) {
        alert('Please select School → Course → Unit (or confirm common unit)');
        return;
    }
    
    const fileInput = document.getElementById('noteFile');
    
    const data = {
        title: document.getElementById('noteTitle').value,
        content: document.getElementById('noteContent').value,
        description: document.getElementById('noteContent').value,
        uploadedBy: user.name || 'Unknown',
        uploadedByName: user.name || 'Unknown',
        user_id: user.id,
        userId: user.id,
        file: fileInput.files[0] || null,
        school_id: parseInt(schoolId),
        dept_id: parseInt(deptId),
        unit_id: parseInt(unitId),
        isCommon: isCommonUnitChecked
    };

    const id = document.getElementById('noteId').value;
    
    try {
        if (!Array.isArray(notes)) notes = [];
        if (id) {
            await fetch(`${API_URL}/notes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const idx = notes.findIndex(n => n.id == id);
            if (idx > -1) notes[idx] = { ...notes[idx], ...data };
        } else {
            const newNote = await API.createNote(data);
            notes.unshift(newNote);
        }
    } catch (err) {
        console.error('Error saving note:', err);
        if (!Array.isArray(notes)) notes = [];
        data.id = Date.now();
        data.school_id = parseInt(schoolId);
        data.dept_id = parseInt(deptId);
        data.unit_id = parseInt(unitId);
        data.created_at = new Date().toISOString();
        notes.unshift(data);
    }

    closeNoteModal();
    renderNotes();
    updateStats();
    renderRecentNotes();
    showNotification('Note uploaded successfully!', 'success');
});

function openUpdateModal() {
    document.getElementById('updateModal').style.display = 'flex';
}

function closeUpdateModal() {
    document.getElementById('updateModal').style.display = 'none';
}

document.getElementById('updateForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('updateTitle').value,
        content: document.getElementById('updateContent').value,
        course_id: document.getElementById('updateCourse').value ? parseInt(document.getElementById('updateCourse').value) : null,
        userId: user.id,
        user_id: user.id,
        postedBy: user.name || 'Unknown',
        postedByName: user.name || 'Unknown'
    };

    try {
        if (!Array.isArray(updates)) updates = [];
        const newUpdate = await API.createUpdate(data);
        updates.unshift(newUpdate);
    } catch (err) {
        console.error('Error posting update:', err);
        if (!Array.isArray(updates)) updates = [];
        data.id = Date.now();
        data.created_at = new Date().toISOString();
        updates.unshift(data);
    }

    closeUpdateModal();
    document.getElementById('updateForm').reset();
    renderUpdates();
    updateStats();
    showNotification('Update posted successfully!', 'success');
});

async function deleteUpdate(id) {
    if (!confirm('Delete this update?')) return;
    try {
        await API.deleteUpdate(id);
        updates = updates.filter(u => u.id != id);
    } catch (err) {
        updates = updates.filter(u => u.id != id);
    }
    renderUpdates();
    updateStats();
    showNotification('Update deleted successfully!', 'info');
}

function handleSearch(query) {
    if (!query) {
        renderNotes();
        renderUpdatesList(updates);
        renderCourses();
        return;
    }
    
    query = query.toLowerCase();
    
    // Search notes
    const filteredNotes = notes.filter(n => 
        n.title?.toLowerCase().includes(query) || 
        n.description?.toLowerCase().includes(query) ||
        n.content?.toLowerCase().includes(query)
    );
    
    // Search updates
    const filteredUpdates = updates.filter(u => 
        u.title?.toLowerCase().includes(query) || 
        u.content?.toLowerCase().includes(query)
    );
    
    // Get current section
    const currentSection = document.querySelector('.section[style*="block"]')?.id || 'home';
    
    if (currentSection === 'notes' || document.getElementById('notes').style.display === 'block') {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        
        if (filteredNotes.length === 0) {
            container.innerHTML = `<div class="empty-state-notes">
                <img src="../images/dashboardImages/v3321_105.png" alt="No notes">
                <p>No notes found for "${query}"</p>
            </div>`;
            return;
        }
        
        container.innerHTML = filteredNotes.map(note => {
        const course = departments.find(c => c.id == (note.courseId || note.course_id || note.dept_id));
            const unit = units.find(u => u.id == (note.unitId || note.unit_id));
            return `
            <div class="note-card">
                <div class="note-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="note-details">
                    <h4>${note.title}</h4>
                    <div class="note-meta">
                        <span><i class="fas fa-book"></i> ${course?.name || 'N/A'} - ${unit?.name || 'N/A'}</span>
                        <span><i class="fas fa-calendar"></i> ${note.date || new Date().toLocaleDateString()}</span>
                    </div>
                    <p class="note-description">${note.description || 'No description'}</p>
                </div>
                <div class="note-footer">
                    <div class="note-actions">
                        <button onclick="viewNote('${note.id}')" title="View"><i class="fas fa-eye"></i> View</button>
                        <button onclick="editNote('${note.id}')" title="Edit"><i class="fas fa-edit"></i> Edit</button>
                        <button onclick="deleteNote('${note.id}', '${note.schoolId || note.school_id}', '${note.deptId || note.dept_id}', '${note.unitId || note.unit_id}')" title="Delete" class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        `}).join('');
    }
    
    if (currentSection === 'updates' || document.getElementById('updates').style.display === 'block') {
        const updatesContainer = document.getElementById('updatesContainer');
        if (!updatesContainer) return;
        
        if (filteredUpdates.length === 0) {
            updatesContainer.innerHTML = `<div class="empty-state" style="text-align:center;">
                <img src="../images/dashboardImages/no notes.jpg" alt="No updates" style="width:90px;height:auto;opacity:0.7;">
                <p>No updates found for "${query}"</p>
            </div>`;
            return;
        }
        
        updatesContainer.innerHTML = filteredUpdates.map(update => `
            <div class="update-card">
                <div class="update-header">
                    <h4>${update.title}</h4>
                    <span class="update-date">${update.created_at ? new Date(update.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <p>${update.content}</p>
                <div class="update-meta">
                    <span><i class="fas fa-user"></i> ${update.postedByName || 'Unknown'}</span>
                    <span><i class="fas fa-book"></i> ${update.courseName || 'All Courses'}</span>
                </div>
                ${update.user_id == user.id ? `
                <div class="update-actions">
                    <button onclick="deleteUpdate(${update.id})" class="btn-sm"><i class="fas fa-trash"></i> Delete</button>
                </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    if (currentSection === 'courses' || document.getElementById('courses').style.display === 'block') {
        const coursesContainer = document.getElementById('coursesContainer');
        if (!coursesContainer) return;
        
        const filteredDepartments = departments.filter(c => 
            c.name?.toLowerCase().includes(query) || 
            c.code?.toLowerCase().includes(query)
        );
        
        if (filteredDepartments.length === 0) {
            coursesContainer.innerHTML = `<div class="empty-state-courses">
                <img src="../images/dashboardImages/Gemini_Generated_Image_r15vymr15vymr15v-removebg-preview.png" alt="No departments">
                <p>No courses found for "${query}"</p>
            </div>`;
            return;
        }
        
        coursesContainer.innerHTML = filteredDepartments.map(course => {
        const courseUnits = units.filter(u => u.courseId == course.id);
            const school = schools.find(s => s.id == course.schoolId);
            return `
                <div class="course-item">
                    <div class="course-header" onclick="toggleCourseUnits('${course.id}')">
                        <div class="course-info">
                            <h3>${course.name}</h3>
                            <span>${course.code || ''} - ${school?.name || 'Unknown School'}</span>
                        </div>
                        <div class="course-actions" onclick="event.stopPropagation()">
                            <button onclick="addUnitToCourse('${course.id}')"><i class="fas fa-plus"></i> Add Unit</button>
                            <button onclick="editCourse('${course.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </div>
                    <div class="course-units" id="courseUnits${course.id}">
                        ${courseUnits.length === 0 ? '<p style="padding:10px;color:var(--text-secondary)">No units yet</p>' : 
                            courseUnits.map(unit => `
                                <div class="unit-item">
                                    <span>${unit.name} (${unit.code || ''})</span>
                                    <div>
                                        ${unit.isCommon ? '<span class="common-badge">Common</span>' : ''}
                                        <button onclick="deleteUnit('${unit.id}')" style="margin-left:10px;padding:5px 10px;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);cursor:pointer;"><i class="fas fa-trash"></i></button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }).join('');
    }
}

function openProfileModal() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = localStorage.getItem('user_name') || '';
    const userEmail = localStorage.getItem('user_email') || '';
    const userPfp = localStorage.getItem('user_pfp') || '';
    
    const pfpSrc = userPfp ? API_BASE + userPfp : '../images/dashboardImages/v3321_68.png';
    
    const modal = document.createElement('div');
    modal.id = 'profileEditModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:var(--bg-secondary,#fff);padding:30px;border-radius:12px;max-width:400px;width:90%;">
            <h3 style="margin-top:0;">Edit Profile</h3>
            <div style="text-align:center;margin-bottom:15px;">
                <img id="lecturerPfpPreview" src="${pfpSrc}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
                <div style="margin-top:10px;">
                    <button onclick="document.getElementById('lecturerPfpInput').click()" style="padding:5px 10px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Change Photo</button>
                    <input type="file" id="lecturerPfpInput" accept="image/*" style="display:none;" onchange="uploadLecturerPfp(this)">
                </div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;margin-bottom:5px;">Full Name</label>
                <input type="text" id="editProfileName" value="${userName}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;margin-bottom:5px;">Email</label>
                <input type="email" id="editProfileEmail" value="${userEmail}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block;margin-bottom:5px;">Current Password (required to save)</label>
                <input type="password" id="editProfilePassword" placeholder="Enter password" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div style="display:flex;gap:10px;">
                <button onclick="saveProfileChanges()" style="flex:1;padding:10px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;">Save Changes</button>
                <button onclick="this.closest('[id*=modal]').remove()" style="padding:10px;background:#666;color:white;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
            </div>
            <p id="profileEditMsg" style="margin-top:10px;text-align:center;"></p>
        </div>
    `;
    document.body.appendChild(modal);
}

async function uploadLecturerPfp(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert('File too large. Max 2MB');
        return;
    }
    
    const token = localStorage.getItem('notify_token');
    const formData = new FormData();
    formData.append('pfp', file);
    
    try {
        const res = await fetch('API_BASE/api/user/pfp', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('user_pfp', data.pfp);
            
            document.getElementById('lecturerPfpPreview').src = 'API_BASE' + data.pfp;
            
            const topPfp = document.getElementById('profileImg');
            if (topPfp) topPfp.src = 'API_BASE' + data.pfp;
        } else {
            alert('Failed to upload image');
        }
    } catch (err) {
        alert('Error uploading image');
    }
}

async function saveProfileChanges() {
    const token = localStorage.getItem('notify_token');
    const name = document.getElementById('editProfileName').value;
    const email = document.getElementById('editProfileEmail').value;
    const password = document.getElementById('editProfilePassword').value;
    const msgEl = document.getElementById('profileEditMsg');
    
    if (!password) {
        msgEl.textContent = 'Please enter your password to save changes';
        msgEl.style.color = 'red';
        return;
    }
    
    try {
        const loginRes = await fetch('API_BASE/user_auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: localStorage.getItem('user_email'), password })
        });
        
        if (!loginRes.ok) {
            msgEl.textContent = 'Incorrect password';
            msgEl.style.color = 'red';
            return;
        }
        
        const res = await fetch('API_BASE/user_auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            msgEl.textContent = 'Profile updated successfully!';
            msgEl.style.color = 'green';
            
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.name = name;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', email);
            
            document.getElementById('userName').textContent = name;
            document.getElementById('userNameDisplay').textContent = name.split(' ')[0];
            
            setTimeout(() => document.getElementById('profileEditModal')?.remove(), 1500);
        } else {
            msgEl.textContent = data.message || 'Failed to update';
            msgEl.style.color = 'red';
        }
    } catch (err) {
        msgEl.textContent = 'Error connecting to server';
        msgEl.style.color = 'red';
    }
}

function toggleTheme() {
    document.body.toggleAttribute('data-theme');
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
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
};

fetchData();