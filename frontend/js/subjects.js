
function showLoader() {
    console.log("Showing loader in unts");
    
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("unitsContent");
    
    if (loader) {
        loader.classList.remove('hide');
        loader.style.display = 'flex';
    }
    
    if (content) {
        content.classList.remove('show');
        content.style.display = 'none';
    }
}
function hideLoader() {
    const loader = document.getElementById("lottieLoader");
    if(loader) {
        loader.classList.add('hide');
        loader.style.display = 'none';
    }
}
function showContent() {
    console.log("Showing content");
    
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("unitsContent");
    
    // Hide loader
    if (loader) {
        loader.classList.add('hide');
        loader.style.display = 'none';
    }
    
    // Show ALL content at once
    if (content) {
        content.classList.add('show');
        content.style.display = 'block';
    }
}

async function getUnitsByDepartment(schoolId, deptId) {
    try {
        const res = await fetch(`http://localhost:3000/api/schools/${schoolId}/departments/${deptId}/units`);
        if (!res.ok) throw new Error('Failed to fetch units');
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function displaySubjects() {

    console.log("DisplayingUnits function started")
    showLoader();
    try{
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === 'true';
        
        let schoolId = localStorage.getItem('selected_school');
        let schoolName = localStorage.getItem('selected_school_name');
        let deptId = localStorage.getItem('selected_department');
        let deptName = localStorage.getItem('selected_department_name');
        
        if (isPreview) {
            schoolId = urlParams.get('school');
            deptId = urlParams.get('course');
            
            try {
                const [schoolRes, deptRes] = await Promise.all([
                    schoolId ? fetch(`http://localhost:3000/api/schools/${schoolId}`).then(r => r.json()) : Promise.resolve(null),
                    deptId ? fetch(`http://localhost:3000/api/schools/${schoolId}/departments/${deptId}`).then(r => r.json()) : Promise.resolve(null)
                ]);
                schoolName = schoolRes?.name || 'School';
                deptName = deptRes?.name || 'Department';
            } catch(e) {
                console.error('Error fetching preview info:', e);
            }
        }
         
        console.log('School ID:', schoolId);
        console.log('School Name:',schoolName)
        console.log('Department ID:', deptId);
        console.log('Department Name:', deptName);


        if (!deptId && !isPreview) {
            alert('No course selected')
            window.location.href='../html/courses.html';
            return
        }

    // Update breadcrumbs
        const currentSchoolEl = document.getElementById('currentSchool');
        const currentDeptEl = document.getElementById('currentDepartment');
        const schoolNameDisplay = document.getElementById('schoolNameDisplay');
        const deptNameDisplay = document.getElementById('departmentNameDisplay');
        const pageTitle = document.getElementById('pageTitle');
        
        if (currentSchoolEl) currentSchoolEl.textContent = schoolName || 'School';
        if (currentDeptEl) currentDeptEl.textContent = deptName || 'Department';
        if (schoolNameDisplay) schoolNameDisplay.textContent = schoolName || 'School';
        if (deptNameDisplay) deptNameDisplay.textContent = deptName || 'Department';
        if (pageTitle) pageTitle.textContent = `${deptName || 'Department'} - Subjects`;


console.log("Fetching subjects");
const [subjects] = await Promise.all([
getUnitsByDepartment(schoolId,deptId),           
    new Promise(resolve => setTimeout(resolve, 500))  
]);

  console.log("units Fetched",subjects);

  const grid=document.getElementById('unitsGrid');
const insightsGrid = document.getElementById('insightsGrid');

  if (!grid) {
    console.log("Error ,grid not found")
  }
        if (subjects.length === 0) {
            grid.innerHTML = `<div class="no-data">
                <img src="../images/dashboardImages/nodepts1.jpg" alt="No data">
                <p>No subjects found for this department</p>
            </div>`;
        }
else{

  let html = '';
        
        subjects.forEach(subject => {
         const notesCount = subject.noteCount || 0;
            html+=`
                        <div class="subject-card ${subject.popular ? 'popular' : ''}" data-aos="fade-up" 
                         onclick="selectSubject('${subject.id}', '${subject.name}')">
                        ${subject.popular ? '<span class="popular-badge">Popular</span>' : ''}
                        <div class="subject-icon" style="background: ${subject.iconBg || '#e3f2fd'};">
                            <i class="fas ${subject.icon || 'fa-book'}" style="color: ${subject.iconColor || '#1976d2'};"></i>
                        </div>
${subject.code ? `<span class="subject-code">${subject.code}</span>` : ''}
                        <h3>${subject.name}</h3>
                        <p class="subject-desc">${subject.description || 'No description available'}</p>
                        <div class="subject-meta">
                            <span><i class="fas fa-file-pdf"></i> ${notesCount} Notes</span>
                            <span><i class="fas fa-users"></i> ${subject.enrolled || 0} Enrolled</span>
                        </div>
                        <div class="subject-footer">
                            <span class="lecturer"><i class="fas fa-chalkboard-teacher"></i> ${subject.lecturer || 'Not assigned'}</span>
                            <span class="semester"><i class="fas fa-calendar"></i> ${subject.semester || 'This semester'}</span>
                        </div>
                        <button class="btn-primary btn-sm">
                            <i class="fas fa-arrow-right"></i> View Notes
                        </button>
                    </div>
            `;


        });
        grid.innerHTML=html;

        updateStats(subjects);


        if (insightsGrid) {
            console.log("getting Inights grid...");
            const totalNotes = subjects.reduce((sum, s) => sum + (s.noteCount || 0), 0);

            insightsGrid.innerHTML=`
             <div class="insight-card">
                        <div class="insight-icon" style="background: #e3f2fd;">
                            <i class="fas fa-book" style="color: #1976d2;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Subjects</h4>
                            <p class="insight-value">${subjects.length}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon" style="background: #f3e5f5;">
                            <i class="fas fa-file-pdf" style="color: #7b1fa2;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Notes</h4>
                            <p class="insight-value">${totalNotes}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon" style="background: #e8f5e9;">
                            <i class="fas fa-users" style="color: #388e3c;"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Total Students</h4>
                            <p class="insight-value">0</p>
                        </div>
                    </div>
            `;
             
        }
    }

    console.log("Showing full content");
    showContent();
}
      
catch(error){
    console.log("ERror loading data",error);

    const grid=document.getElementById('unitsGrid');
    if (grid) {
       grid.innerHTML=`
               <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading subjects. Please try again.</p>
                    <button onclick="displaySubjects()" class="btn-primary btn-sm">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
        `;
    }
    showContent();
}
    
}

function selectSubject(subjectId,subjectName) {
    console.log('Selected subject',subjectId,subjectName);

    localStorage.setItem('selected_subject',subjectId);
    localStorage.setItem('selected_subject_name',subjectName);


       document.querySelector('.page-content').innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading notes for ${subjectName}...</p>
        </div>
    `;

       setTimeout(() => {
        window.location.href = '../html/notes.html';
    }, 500);
}

function updateStats(subjects) {
    const totalSubjects = subjects.length;
    const totalNotes = subjects.reduce((sum, s) => sum + (s.noteCount || (s.notes?.length || 0)), 0);
    const totalStudents = subjects.reduce((sum, s) => sum + (s.studentCount || 0), 0);
    
    const totalSubjectsEl = document.getElementById('totalSubjects');
    const totalNotesEl = document.getElementById('totalNotes');
    const totalStudentsEl = document.getElementById('totalStudents');
    
    if (totalSubjectsEl) totalSubjectsEl.textContent = totalSubjects;
    if (totalNotesEl) totalNotesEl.textContent = totalNotes;
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents.toLocaleString();
}
/*
// Filter subjects by search
function filterSubjects(searchTerm) {
    const cards = document.querySelectorAll('.subject-card');
    searchTerm = searchTerm.toLowerCase();
    let visibleCount = 0;
    
    cards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const code = card.querySelector('.subject-code')?.textContent.toLowerCase() || '';
        const lecturer = card.querySelector('.lecturer')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || code.includes(searchTerm) || lecturer.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show "no results" message
    const grid = document.getElementById('unitsGrid');
    const existingMsg = grid.querySelector('.no-search-results');
    
    if (visibleCount === 0 && !existingMsg) {
        const noResults = document.createElement('div');
        noResults.className = 'no-search-results no-data';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No subjects matching "${searchTerm}"</p>
        `;
        grid.appendChild(noResults);
    } else if (visibleCount > 0 && existingMsg) {
        existingMsg.remove();
    }
}*/
document.addEventListener('DOMContentLoaded',function () {
console.log('DOM loaded, initializing units page');

const urlParams = new URLSearchParams(window.location.search);
const isPreview = urlParams.get('preview') === 'true';
const urlDeptId = urlParams.get('course');

const deptId=localStorage.getItem('selected_department') || urlDeptId;
if (!deptId && !isPreview) {
    console.log('No departemnt was selected');
    window.location.href='../html/courses.html';
    return;
}


displaySubjects();

});