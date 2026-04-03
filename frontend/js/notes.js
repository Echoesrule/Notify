
function showLoader() {
    console.log("Showing loader in notes");
    
    const loader = document.getElementById("lottieLoader");
    const content = document.getElementById("notesContent");
    
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
    const content = document.getElementById("notesContent");
    
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

async function fetchNotesByUnit(schoolId, deptId, unitId) {
    try {
        const res = await fetch(`http://localhost:3000/api/schools/${schoolId}/departments/${deptId}/units/${unitId}/notes`);
        if (!res.ok) {
            throw new Error(`Failed to fetch notes: ${res.status} ${res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        console.error("Error in getNotesByUnit:", err); 
        return [];
    }
}




async function displayNotes() {
    console.log(' displayNotes started');
    showLoader();
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === 'true';
        
        let schoolId, schoolName, deptId, deptName, unitId, unitName;
        
        if (isPreview) {
            schoolId = urlParams.get('school');
            deptId = urlParams.get('dept');
            unitId = urlParams.get('unit');
            
            try {
                const [schoolRes, deptRes, unitRes] = await Promise.all([
                    schoolId ? fetch(`http://localhost:3000/api/schools/${schoolId}`).then(r => r.json()) : Promise.resolve(null),
                    deptId ? fetch(`http://localhost:3000/api/schools/${schoolId}/departments/${deptId}`).then(r => r.json()) : Promise.resolve(null),
                    unitId ? fetch(`http://localhost:3000/api/schools/${schoolId}/departments/${deptId}/units/${unitId}`).then(r => r.json()) : Promise.resolve(null)
                ]);
                schoolName = schoolRes?.name || 'School';
                deptName = deptRes?.name || 'Department';
                unitName = unitRes?.name || 'Subject';
            } catch(e) {
                console.error('Error fetching preview info:', e);
                schoolName = 'Preview School';
                deptName = 'Preview Dept';
                unitName = 'Preview Subject';
            }
        } else {
            schoolId = localStorage.getItem('selected_school');
            schoolName = localStorage.getItem('selected_school_name');
            deptId = localStorage.getItem('selected_department');
            deptName = localStorage.getItem('selected_department_name');
            unitId = localStorage.getItem('selected_subject');
            unitName = localStorage.getItem('selected_subject_name');
        }
        
        console.log('School:', schoolName, 'ID:', schoolId);
        console.log('Department:', deptName, 'ID:', deptId);
        console.log('Unit:', unitName, 'ID:', unitId);

        console.log('Checking errors...')
        if (!unitId) {
            console.log('No subject selected, redirecting');
            window.location.href = '../html/units.html';
            return;
        }

        console.log('Loading Breadcrumbs...')

   const currentSchool=document.getElementById('currentSchool')
        if (currentSchool) currentSchool.textContent = schoolName || 'School';
  const currentDepartment= document.getElementById('currentDepartment')
         if(currentDepartment)currentDepartment.textContent = deptName || 'Department';
    
const currentSubject= document.getElementById('currentSubject')

        if(currentSubject)currentSubject .textContent = unitName || 'Subject';

       const schoolNameDisplay= document.getElementById('schoolNameDisplay');
        if(schoolNameDisplay) schoolNameDisplay.textContent = schoolName || 'School';

        const departmentNameDisplay=document.getElementById('departmentNameDisplay');
        if(departmentNameDisplay) departmentNameDisplay.textContent= deptName || 'Department';

        
        const subjectNameDisplay=document.getElementById('subjectNameDisplay');
        if(subjectNameDisplay) subjectNameDisplay.textContent = unitName || 'Subject';

        const subjectSubtitle=document.getElementById('subjectSubtitle');
        if(subjectSubtitle) subjectSubtitle.textContent = `Notes for ${unitName || 'Subject'}`;

        const pageTitle=document.getElementById('pageTitle');
        if(pageTitle) pageTitle.textContent = `${unitName || 'Subject'} - Notes`;

        console.log('Fetching notes...');
        const [notes] = await Promise.all([
        fetchNotesByUnit(schoolId,deptId,unitId),
                new Promise(resolve => setTimeout(resolve, 1500)) 
        ]);
    console.log('Notes Fetched')
        
        const grid = document.getElementById('notesGrid');
        
        if (!grid) {
            console.error('Notes grid not found!');
            return;
        }
        
        if (!notes || notes.length === 0) {
            grid.innerHTML = `<div class="no-data">
                <img src="../images/dashboardImages/no notes.jpg" alt="No notes">
                <p>No notes found for this subject</p>
            </div>`;
        } else {
            let html = '';
            notes.forEach(note => {
              
                const downloads = note.downloads || 0;
                
                html += `
                    <div class="note-card ${note.popular ? 'popular' : ''}">
                        <div class="note-icon">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <h3>${note.title}</h3>
                        <p class="note-description">${note.description ? (note.description.length > 100 ? note.description.substring(0, 100) + '...' : note.description) : 'No description available'}</p>
                        <div class="note-meta">
                            <span><i class="fas fa-user"></i> ${note.uploadedByName || 'Unknown'}</span>
                            <span><i class="fas fa-calendar"></i> ${note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Not dated'}</span>
                            <span><i class="fas fa-file"></i> ${note.pages || '?'} pages</span>
                        </div>
                        <div class="note-footer">
                            <div class="note-meta">
                                <span><i class="fas fa-download"></i> ${downloads} downloads</span>
                            </div>
                            <div class="note-actions">
                                <button class="btn-bookmark" onclick="bookmarkNote('${note.id}')" title="Bookmark">
                                    <i class="fas fa-bookmark"></i>
                                </button>
                                <button class="btn-preview" onclick="previewNote('${note.id}')">
                                    <i class="fas fa-eye"></i> Preview
                                </button>
                                <button class="btn-download" onclick="downloadNote('${note.id}')">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            grid.innerHTML = html;
            updateStats(notes);
        }
        
        console.log("Showing content");
        showContent();

    } catch (error) {
        console.error(' Error loading notes:', error);
        
        const grid = document.getElementById('notesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading notes. Please try again.</p>
                    <button onclick="displayNotes()" class="btn-primary btn-sm">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
        showContent();
    }
}

function updateStats(notes) {
    const totalNotes = notes.length;
    const totalDownloads = notes.reduce((sum, note) => sum + (note.downloads || 0), 0);
    
    // Find most recent note
    const dates = notes.map(n => n.date).filter(d => d);
    const latestDate = dates.length > 0 ? dates.sort().reverse()[0] : '-';
    
    document.getElementById('totalNotes').textContent = totalNotes;
    document.getElementById('totalDownloads').textContent = totalDownloads.toLocaleString();
    document.getElementById('lastUpdated').textContent = latestDate;
}


function previewNote(noteId) {
    console.log('Preview note:', noteId);
    
    fetch(`http://localhost:3000/api/notes/${noteId}`)
        .then(res => res.json())
        .then(note => {
            if (!note.file_path) {
                alert('No file attached to this note');
                return;
            }
            window.open(`http://localhost:3000/api/notes/${noteId}/preview`, '_blank');
        })
        .catch(err => {
            console.error('Error fetching note:', err);
            alert('Failed to load note');
        });
}


function downloadNote(noteId) {
    console.log('Download note:', noteId);
    
    fetch(`http://localhost:3000/api/notes/${noteId}`)
        .then(res => res.json())
        .then(note => {
            if (!note.file_path) {
                alert('No file attached to this note');
                return;
            }
            window.location.href = `http://localhost:3000/api/notes/${noteId}/download`;
        })
        .catch(err => {
            console.error('Error fetching note:', err);
            alert('Failed to download note');
        });
}


function sortRecent() {
    console.log('Sorting by recent');
 
}

function sortPopular() {
    console.log('Sorting by popular');
  
}

function sortDownloads() {
    console.log('Sorting by downloads');
    
}

function getBookmarkFolders() {
    return JSON.parse(localStorage.getItem('notifyBookmarkFolders') || '[]');
}

function saveBookmarkFolders(folders) {
    localStorage.setItem('notifyBookmarkFolders', JSON.stringify(folders));
}

function getBookmarks() {
    return JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
}

function bookmarkNote(noteId) {
    fetch(`http://localhost:3000/api/notes/${noteId}`)
        .then(res => res.json())
        .then(note => {
            showBookmarkModal(note);
        })
        .catch(err => {
            console.error('Error fetching note:', err);
            showNotification('Failed to load note for bookmarking', 'error');
        });
}

function showBookmarkModal(note) {
    let modal = document.getElementById('bookmarkModal');
    if (!modal) {
        const modalHtml = `
        <div class="modal" id="bookmarkModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-bookmark"></i> Save to Bookmarks</h3>
                    <button class="close-modal" onclick="closeBookmarkModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="bookmark-note-preview">
                        <h4>${note.title}</h4>
                        <p>${note.description || ''}</p>
                    </div>
                    <div class="form-group">
                        <label>Select Folder</label>
                        <select id="bookmarkFolderSelect">
                            <option value="">Choose a folder...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Or Create New Folder</label>
                        <input type="text" id="newFolderName" placeholder="New folder name">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline" onclick="closeBookmarkModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveBookmark('${note.id}')">Save</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('bookmarkModal');
    }
    
    updateFolderSelect();
    document.querySelector('#bookmarkModal .bookmark-note-preview h4').textContent = note.title;
    document.querySelector('#bookmarkModal .bookmark-note-preview p').textContent = note.description || '';
    modal.dataset.noteId = note.id;
    modal.style.display = 'flex';
}

function updateFolderSelect() {
    const select = document.getElementById('bookmarkFolderSelect');
    const folders = getBookmarkFolders();
    
    select.innerHTML = '<option value="">Choose a folder...</option>';
    folders.forEach((folder, index) => {
        select.innerHTML += `<option value="${index}">${folder.name}</option>`;
    });
}

function closeBookmarkModal() {
    const modal = document.getElementById('bookmarkModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('newFolderName').value = '';
        document.getElementById('bookmarkFolderSelect').value = '';
    }
}

function saveBookmark(noteId) {
    const folderSelect = document.getElementById('bookmarkFolderSelect');
    const newFolderInput = document.getElementById('newFolderName');
    const selectedFolder = folderSelect.value;
    const newFolderName = newFolderInput.value.trim();
    
    if (!selectedFolder && !newFolderName) {
        showNotificationModal('Please select or create a folder', 'error');
        return;
    }
    
    let folderIndex = selectedFolder;
    
    if (newFolderName) {
        const folders = getBookmarkFolders();
        folders.push({
            name: newFolderName,
            color: '#4a90d9',
            created_at: new Date().toISOString()
        });
        saveBookmarkFolders(folders);
        folderIndex = folders.length - 1;
    }
    
    fetch(`http://localhost:3000/api/notes/${noteId}`)
        .then(res => res.json())
        .then(note => {
            const bookmarks = getBookmarks();
            bookmarks.push({
                id: Date.now(),
                noteId: note.id,
                title: note.title,
                description: note.description,
                uploadedByName: note.uploadedByName,
                pages: note.pages,
                folderIndex: folderIndex,
                date: new Date().toISOString()
            });
            saveBookmarks(bookmarks);
            closeBookmarkModal();
            showNotificationModal('Note bookmarked successfully!', 'success');
        })
        .catch(err => {
            console.error('Error saving bookmark:', err);
            showNotificationModal('Failed to save bookmark', 'error');
        });
}

function showNotificationModal(message, type = 'info') {
    const container = document.getElementById('notification-container') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Notes page DOM loaded');

    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';
    const urlUnitId = urlParams.get('unit');
    
    const subjectId = localStorage.getItem('selected_subject') || urlUnitId;
    if (!subjectId && !isPreview) {
        console.log('No subject selected, redirecting');
        window.location.href = '../html/units.html';
        return;
    }
    
    displayNotes();
    

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function(e) {
            if(e.target.value === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
            }
        });
    }

    document.getElementById('sortRecent')?.addEventListener('click', sortRecent);
    document.getElementById('sortPopular')?.addEventListener('click', sortPopular);
    document.getElementById('sortDownloads')?.addEventListener('click', sortDownloads);
});