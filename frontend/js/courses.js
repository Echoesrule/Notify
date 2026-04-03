
const API_URL = 'http://localhost:3000/api';

const deptIcons = {
    'computer': { icon: 'fa-laptop-code', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' },
    'information': { icon: 'fa-database', bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#fff' },
    'data': { icon: 'fa-chart-line', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: '#fff' },
    'software': { icon: 'fa-code', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' },
    'math': { icon: 'fa-calculator', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#fff' },
    'physics': { icon: 'fa-atom', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#fff' },
    'chemistry': { icon: 'fa-flask', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: '#fff' },
    'biology': { icon: 'fa-dna', bg: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)', color: '#fff' },
    'business': { icon: 'fa-briefcase', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' },
    'accounting': { icon: 'fa-calculator', bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#fff' },
    'finance': { icon: 'fa-coins', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: '#fff' },
    'marketing': { icon: 'fa-bullhorn', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', color: '#fff' },
    'medicine': { icon: 'fa-heartbeat', bg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', color: '#fff' },
    'nursing': { icon: 'fa-user-nurse', bg: 'linear-gradient(135deg, #f472b6 0%, #f9a8d4 100%)', color: '#fff' },
    'pharmacy': { icon: 'fa-pills', bg: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)', color: '#fff' },
    'law': { icon: 'fa-gavel', bg: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', color: '#fff' },
    'engineering': { icon: 'fa-cogs', bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#fff' },
    'mechanical': { icon: 'fa-cogs', bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#fff' },
    'electrical': { icon: 'fa-bolt', bg: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)', color: '#fff' },
    'civil': { icon: 'fa-hard-hat', bg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', color: '#fff' },
    'education': { icon: 'fa-graduation-cap', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#fff' },
    'psychology': { icon: 'fa-brain', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', color: '#fff' },
    'sociology': { icon: 'fa-users', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#fff' },
    'history': { icon: 'fa-landmark', bg: 'linear-gradient(135deg, #78716c 0%, #a8a29e 100%)', color: '#fff' },
    'arts': { icon: 'fa-palette', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', color: '#fff' },
    'literature': { icon: 'fa-book', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#fff' },
    'language': { icon: 'fa-language', bg: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', color: '#fff' },
    'default': { icon: 'fa-book-open', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }
};

async function updateUserEnrollment(userId, schoolId, courseId) {
    console.log('Enrolling user:', userId, 'school:', schoolId, 'course:', courseId);
    try {
        const res = await fetch(`${API_URL}/users/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, schoolId, courseId })
        });
        const data = await res.json();
        console.log('Enrollment response:', data);
    } catch (err) {
        console.error('Error updating enrollment:', err);
    }
}

function showLoader() {
    console.log("Showing loader");
    
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("courseContent");
    
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
    const content = document.getElementById("courseContent");

    if (loader) {
        loader.classList.add('hide');
        loader.style.display = 'none';
    }

    if (content) {
       
        requestAnimationFrame(() => {
            content.style.display = 'block';
            content.classList.add('show');
        });
    }
}

async function getDepartmentsBySchool(schoolId) {
    try {
        const res = await fetch(`http://localhost:3000/api/schools/${schoolId}/departments`);
        if (!res.ok) throw new Error('Failed to fetch departments');
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}


async function displayDepartments() {
    showLoader();
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === 'true';
        let schoolId = urlParams.get('school');
        let schoolName = localStorage.getItem('selected_school_name');
        
        if (schoolId) {
            try {
                const school = await fetch(`${API_URL}/schools/${schoolId}`).then(r => r.json());
                schoolName = school?.name || 'School';
            } catch(e) {
                console.error('Error getting school name:', e);
                schoolName = 'School';
            }
        } else if (!isPreview) {
            schoolId = localStorage.getItem('selected_school');
            schoolName = localStorage.getItem('selected_school_name');
        }
        
        if (!schoolId && !isPreview) {
            window.location.href = '../html/schools.html';
            return;
        }


        const currentSchool=document.getElementById('currentSchool');
       const currentSchoolDisplay= document.getElementById('schoolNameDisplay');

       if (currentSchool) currentSchool.textContent=schoolName || 'School';
       if (currentSchoolDisplay) currentSchoolDisplay .textContent = schoolName || 'School';
        

        console.log('Fetching departments...');

           const [departments] = await Promise.all([
    getDepartmentsBySchool(schoolId),           
    new Promise(resolve => setTimeout(resolve, 1500))  
]);

          console.log('Departments received:', departments);
        const grid = document.getElementById('courseGrid');
        const insightsGrid = document.getElementById('insightsGrid');
        
        if (!grid) return;
        
        if (departments.length === 0) {
            grid.innerHTML = 
            `<div class="no-data">
                <img src="../images/dashboardImages/nodepts1.jpg" alt="Error img">
    
          <p> No departments found!<P/> 
            </div>`;
        } else {
            let html = '';
            const schoolId = localStorage.getItem('selected_school');
            let counts = { students: 0 };
            try {
                const res = await fetch(`${API_URL}/schools/${schoolId}/counts`);
                counts = await res.json();
            } catch(e) {}
            
            const currentDept = localStorage.getItem('selected_department');
            
            departments.forEach(dept => {
                console.log('Rendering dept:', dept.name, 'studentCount:', dept.studentCount, 'unitCount:', dept.unitCount);
                const unitCount = dept.unitCount || 0;
                const isEnrolled = currentDept == dept.id;
                
                // Find matching icon based on department name
                let iconData = deptIcons['default'];
                const deptNameLower = dept.name?.toLowerCase() || '';
                for (const [key, value] of Object.entries(deptIcons)) {
                    if (deptNameLower.includes(key)) {
                        iconData = value;
                        break;
                    }
                }
                
                html += `
                    <div class="course-card ${dept.popular ? 'popular' : ''} ${isEnrolled ? 'enrolled' : ''}" 
                         onclick="selectDepartments('${dept.id}', '${dept.name}')">
                        ${dept.popular ? '<span class="popular-badge">Popular</span>' : ''}
                        ${isEnrolled ? '<span class="enrolled-badge"><i class="fas fa-check-circle"></i> Enrolled</span>' : ''}
                        <div class="dept-icon" style="background: ${iconData.bg};">
                            <i class="fas ${iconData.icon}" style="color: ${iconData.color};"></i>
                        </div>
                        <span class="dept-code">${dept.code}</span>
                        <h3>${dept.name}</h3>
                        <p class="dept-desc">${dept.description}</p>
                        <div class="dept-meta">
                            <span><i class="fas fa-book"></i> ${unitCount} Units</span>
                            <span><i class="fas fa-users"></i> ${dept.studentCount || 0} Students Enrolled</span>
                        </div>
                        <button class="btn-primary btn-sm">
                            <i class="fas fa-arrow-right"></i> ${isEnrolled ? 'View' : 'Enroll'}
                        </button>
                    </div>
                `;
            });
            
            grid.innerHTML = html;
            
            // Update stats
            updateStats(departments);
            
            
            // Update insights
            console.log("Updating Insights")
            if (insightsGrid) {
                const schoolId = localStorage.getItem('selected_school');
                let counts = { courses: 0, students: 0, notes: 0 };
                try {
                    const countsRes = await fetch(`${API_URL}/schools/${schoolId}/counts`);
                    counts = await countsRes.json();
                } catch (e) {
                    console.log('Using default counts');
                }
                
                insightsGrid.innerHTML = `
                    <div class="insight-card">
                        <div class="insight-icon" style="background: #e3f2fd;">
                            <i class="fas fa-book" style="color: #1976d2;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Courses</h4>
                            <p class="insight-value">${counts.courses ?? departments.length}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon" style="background: #f3e5f5;">
                            <i class="fas fa-users" style="color: #7b1fa2;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Enrolled</h4>
                            <p class="insight-value">${counts.students ?? 0}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon" style="background: #fff3e0;">
                            <i class="fas fa-file-pdf" style="color: #f57c00;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Notes</h4>
                            <p class="insight-value">${counts.notes ?? 0}</p>
                        </div>
                    </div>
                `;
            }
        }
        
        console.log("Showing Full Content")
        showContent();


    } 
    
    catch (error) {
        console.error('Error:', error);
        
        const grid = document.getElementById('errorMessage');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                <img src="../images/dashboardImages/Gemini_Generated_Image_gsaupdgsaupdgsau.png" alt="Error img">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading departments</p>
                    <button onclick="displayDepartments()" class="btn-primary btn-sm">Retry</button>
                </div>
            `;
        }

        console.log("Error loading Data")
        showContent();

        
    }
}

console.log('SelectDepartments function')

async function selectDepartments(deptId, deptName) {
    console.log('Selected department:', deptId, deptName);
    
    const userDept = localStorage.getItem('selected_department');
    const schoolId = localStorage.getItem('selected_school');
    const schoolName = localStorage.getItem('selected_school_name');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (userDept && userDept != deptId) {
        if (!await friendlyConfirm({ title: 'Switch Course?', message: `You are currently in a different course. Do you want to switch to ${deptName}? Your current enrollment will be replaced.`, confirmText: 'Switch' })) {
            return;
        }
    } else if (userDept == deptId) {
        window.location.href = '../html/units.html';
        return;
    }
    
    if (!await friendlyConfirm({ title: 'Join Course?', message: `Do you want to join ${deptName} in ${schoolName}? You'll be able to view their units and notes.`, confirmText: 'Join' })) {
        return;
    }
    
    if (user.id && schoolId) {
        updateUserEnrollment(user.id, parseInt(schoolId), parseInt(deptId));
    }
    
    localStorage.setItem('selected_department', deptId);
    localStorage.setItem('selected_department_name', deptName);
    
    window.location.href = '../html/units.html';
  
}

function updateStats(departments) {
   
    const totalDepts = departments.length;
    // use the counts returned by the API route
    const totalCourses = departments.reduce((sum, d) => sum + (d.unitCount || (d.units?.length || 0)), 0);
    const totalStudents = departments.reduce((sum, d) => sum + (d.studentCount || 0), 0);
    
    const totalDeptsEl = document.getElementById('totalDepts');
    const totalCoursesEl = document.getElementById('totalCourses');
    const totalStudentsEl = document.getElementById('totalStudents');
    
    if (totalDeptsEl) totalDeptsEl.textContent = totalDepts;
    if (totalCoursesEl) totalCoursesEl.textContent = totalCourses;
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents.toLocaleString();
}

console.log("Dom loading...")
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';
    const urlSchoolId = urlParams.get('school');
    
    const schoolId = localStorage.getItem('selected_school') || urlSchoolId;
    if (!schoolId && !isPreview) {
        window.location.href = '../html/schools.html';
        return;
    }
    
    displayDepartments();
});


