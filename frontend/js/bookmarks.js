/**
 * bookmarks.js - Bookmarks page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    setupBookmarkActions();
    setupExportImport();
    renderBookmarksPage();
});

function setupBookmarkActions() {
    console.log('Setting up bookmark actions');
    
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    if (addBookmarkBtn) {
        addBookmarkBtn.addEventListener('click', showAddBookmarkForm);
    }
    
    const cancelFolderBtn = document.getElementById('cancelFolder');
    if (cancelFolderBtn) {
        cancelFolderBtn.addEventListener('click', closeFolderModal);
    }
    
    const createFolderBtn = document.getElementById('createFolder');
    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', createNewFolder);
    }
    
    const closeModalBtns = document.querySelectorAll('.close-modal');
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeFolderModal);
    });
}

function showAddBookmarkForm() {
    const modalHtml = `
    <div class="modal" id="addBookmarkModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-bookmark"></i> Add Bookmark</h3>
                <button class="close-modal" onclick="closeAddBookmarkModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Note ID or URL</label>
                    <input type="text" id="bookmarkNoteId" placeholder="Enter note ID or URL">
                </div>
                <div class="form-group">
                    <label>Select Folder</label>
                    <select id="bookmarkFormFolderSelect">
                        <option value="">Choose a folder...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Or Create New Folder</label>
                    <input type="text" id="bookmarkFormNewFolder" placeholder="New folder name">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-outline" onclick="closeAddBookmarkModal()">Cancel</button>
                <button class="btn-primary" onclick="addBookmarkFromForm()">Add Bookmark</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    updateBookmarkFormFolderSelect();
    document.getElementById('addBookmarkModal').style.display = 'flex';
    document.getElementById('addBookmarkModal').style.zIndex = '10000';
}

function updateBookmarkFormFolderSelect() {
    const select = document.getElementById('bookmarkFormFolderSelect');
    if (!select) return;
    
    const folders = getBookmarkFolders();
    select.innerHTML = '<option value="">Choose a folder...</option>';
    folders.forEach((folder, index) => {
        select.innerHTML += `<option value="${index}">${folder.name}</option>`;
    });
}

function closeAddBookmarkModal() {
    const modal = document.getElementById('addBookmarkModal');
    if (modal) {
        modal.remove();
    }
}

async function addBookmarkFromForm() {
    const noteIdInput = document.getElementById('bookmarkNoteId').value.trim();
    const folderSelect = document.getElementById('bookmarkFormFolderSelect');
    const newFolderInput = document.getElementById('bookmarkFormNewFolder');
    const selectedFolder = folderSelect.value;
    const newFolderName = newFolderInput.value.trim();
    
    if (!noteIdInput) {
        showNotificationModal('Please enter a note ID', 'error');
        return;
    }
    
    if (!selectedFolder && !newFolderName) {
        showNotificationModal('Please select or create a folder', 'error');
        return;
    }
    
    let folderIndex;
    
    if (newFolderName) {
        const folders = getBookmarkFolders();
        folders.push({
            name: newFolderName,
            color: '#4a90d9',
            created_at: new Date().toISOString()
        });
        saveBookmarkFolders(folders);
        folderIndex = folders.length - 1;
    } else {
        folderIndex = parseInt(selectedFolder);
    }
    
    try {
        const res = await fetch(`${window.API_URL}/notes/${noteIdInput}`);
        if (!res.ok) throw new Error('Note not found');
        const note = await res.json();
        
        const bookmarks = getBookmarks();
        bookmarks.push({
            id: Date.now(),
            noteId: note.id,
            title: note.title,
            description: note.description,
            uploadedByName: note.uploadedByName || note.uploadedBy,
            pages: note.pages || note.page_count,
            folderIndex: folderIndex,
            date: new Date().toISOString()
        });
        saveBookmarks(bookmarks);
        
        closeAddBookmarkModal();
        showNotificationModal('Bookmark added successfully!', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        console.error('Error adding bookmark:', err);
        showNotificationModal('Failed to add bookmark. Note not found.', 'error');
    }
}

function getBookmarkFolders() {
    return JSON.parse(localStorage.getItem('notifyBookmarkFolders') || '[]');
}

function saveBookmarkFolders(folders) {
    localStorage.setItem('notifyBookmarkFolders', JSON.stringify(folders));
}

function closeFolderModal() {
    const modal = document.getElementById('folderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function createNewFolder() {
    const folderName = document.getElementById('folderName').value.trim();
    const folderDesc = document.getElementById('folderDesc').value.trim();
    
    if (!folderName) {
        showNotificationModal('Please enter a folder name', 'error');
        return;
    }
    
    const folders = getBookmarkFolders();
    folders.push({
        name: folderName,
        description: folderDesc,
        color: '#4a90d9',
        created_at: new Date().toISOString()
    });
    
    saveBookmarkFolders(folders);
    closeFolderModal();
    showNotificationModal('Folder created successfully!', 'success');
    
    document.getElementById('folderName').value = '';
    document.getElementById('folderDesc').value = '';
    
    if (typeof renderBookmarksPage === 'function') {
        renderBookmarksPage();
    }
}

function getBookmarks() {
    return JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
}

function renderBookmarksPage() {
    console.log('Rendering bookmarks page...');
    
    const folders = getBookmarkFolders();
    const bookmarks = getBookmarks();
    
    renderFolders(folders);
    renderAllBookmarks(bookmarks);
    
    const countEl = document.getElementById('bookmarkCount');
    if (countEl) countEl.textContent = `${bookmarks.length} items`;
}

function renderFolders(folders) {
    const grid = document.getElementById('foldersGrid');
    if (!grid) return;
    
    if (folders.length === 0) {
        grid.innerHTML = '<p class="no-items">No folders yet. Create one!</p>';
        return;
    }
    
    grid.innerHTML = folders.map((folder, index) => `
        <div class="folder-card" onclick="openFolder(${index})">
            <div class="folder-icon" style="background: ${folder.color || '#4a90d9'}">
                <i class="fas fa-folder"></i>
            </div>
            <div class="folder-info">
                <h4>${folder.name}</h4>
                <p>${getBookmarksCountInFolder(index)} bookmarks</p>
            </div>
        </div>
    `).join('');
}

function getBookmarksCountInFolder(folderIndex) {
    const bookmarks = getBookmarks();
    return bookmarks.filter(b => b.folderIndex === folderIndex).length;
}

function openFolder(folderIndex) {
    const folders = getBookmarkFolders();
    const bookmarks = getBookmarks();
    const folder = folders[folderIndex];
    
    if (!folder) return;
    
    document.getElementById('folderViewName').textContent = folder.name;
    
    const folderBookmarks = bookmarks.filter(b => b.folderIndex === folderIndex);
    const countEl = document.getElementById('folderViewCount');
    if (countEl) countEl.textContent = folderBookmarks.length;
    
    const grid = document.getElementById('folderBookmarksGrid');
    if (grid) {
        if (folderBookmarks.length === 0) {
            grid.innerHTML = '<p class="no-items">No bookmarks in this folder</p>';
        } else {
            grid.innerHTML = folderBookmarks.map(bookmark => createBookmarkCard(bookmark)).join('');
        }
    }
    
    document.getElementById('foldersSection').style.display = 'none';
    document.getElementById('allBookmarksSection').style.display = 'none';
    document.getElementById('folderView').style.display = 'block';
}

function showFoldersView() {
    const folderView = document.getElementById('folderView');
    const noteDetailView = document.getElementById('noteDetailView');
    const foldersSection = document.getElementById('foldersSection');
    const allBookmarksSection = document.getElementById('allBookmarksSection');
    
    if (folderView) folderView.style.display = 'none';
    if (noteDetailView) noteDetailView.style.display = 'none';
    if (foldersSection) foldersSection.style.display = 'block';
    if (allBookmarksSection) allBookmarksSection.style.display = 'block';
}

function renderAllBookmarks(bookmarks) {
    const grid = document.getElementById('bookmarksGrid');
    if (!grid) return;
    
    if (bookmarks.length === 0) {
        grid.innerHTML = '<p class="no-items">No bookmarks yet. Bookmark notes from the notes page!</p>';
        return;
    }
    
    grid.innerHTML = bookmarks.map(bookmark => createBookmarkCard(bookmark)).join('');
}

function createBookmarkCard(bookmark) {
    const folders = getBookmarkFolders();
    const folderName = bookmark.folderIndex !== undefined && bookmark.folderIndex !== null ? folders[bookmark.folderIndex]?.name : '';
    
    return `
        <div class="bookmark-card" onclick="viewBookmarkDetail(${bookmark.id || bookmark.noteId})">
            <div class="bookmark-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="bookmark-info">
                <h4>${bookmark.title || 'Untitled'}</h4>
                <p>${bookmark.description || ''}</p>
                <div class="bookmark-meta">
                    <span><i class="fas fa-user"></i> ${bookmark.uploadedByName || 'Unknown'}</span>
                    ${folderName ? `<span><i class="fas fa-folder"></i> ${folderName}</span>` : ''}
                </div>
            </div>
            <div class="bookmark-actions">
                <button class="action-btn" onclick="event.stopPropagation(); previewBookmark(${bookmark.noteId})" title="Preview">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); downloadBookmark(${bookmark.noteId})" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="action-btn remove" onclick="event.stopPropagation(); removeBookmark(${bookmark.id || bookmark.noteId})" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function viewBookmarkDetail(bookmarkId) {
    const bookmarks = getBookmarks();
    const bookmark = bookmarks.find(b => (b.id || b.noteId) == bookmarkId);
    
    if (!bookmark || !bookmark.noteId) {
        showNotificationModal('Note details not available', 'error');
        return;
    }
    
    fetch(`${window.API_URL}/notes/${bookmark.noteId}`)
        .then(res => res.json())
        .then(note => {
            document.getElementById('noteDetailTitle').textContent = note.title || bookmark.title;
            document.getElementById('noteDetailAuthor').textContent = note.uploadedByName || note.uploadedBy || 'Unknown';
            document.getElementById('noteDetailDate').textContent = new Date(note.created_at).toLocaleDateString();
            document.getElementById('noteDetailPages').textContent = note.pages || note.page_count || '?';
            document.getElementById('noteDetailDescription').textContent = note.description || '';
            const downloadsEl = document.getElementById('noteDetailDownloads');
            if (downloadsEl) downloadsEl.textContent = note.downloads || 0;
            
            window.currentBookmarkNoteId = bookmark.noteId;
            window.currentBookmarkId = bookmarkId;
            
            document.getElementById('foldersSection').style.display = 'none';
            document.getElementById('allBookmarksSection').style.display = 'none';
            document.getElementById('folderView').style.display = 'none';
            document.getElementById('noteDetailView').style.display = 'block';
        })
        .catch(err => {
            console.error('Error loading note:', err);
            showNotificationModal('Failed to load note details', 'error');
        });
}

function previewBookmark(noteId) {
    if (noteId) {
        window.open(`${window.API_URL}/notes/${noteId}/preview`, '_blank');
    }
}

function downloadBookmark(noteId) {
    if (noteId) {
        window.location.href = `${window.API_URL}/notes/${noteId}/download`;
    }
}

function removeBookmark(bookmarkId) {
    let bookmarks = getBookmarks();
    bookmarks = bookmarks.filter(b => (b.id || b.noteId) != bookmarkId);
    saveBookmarks(bookmarks);
    showNotificationModal('Bookmark removed', 'success');
    renderBookmarksPage();
}

function removeBookmarkFromDetail() {
    if (window.currentBookmarkId) {
        removeBookmark(window.currentBookmarkId);
        showFoldersView();
    }
}

function goBackFromNoteDetail() {
    document.getElementById('noteDetailView').style.display = 'none';
    showFoldersView();
}

window.renderBookmarksPage = renderBookmarksPage;
window.openFolder = openFolder;
window.showFoldersView = showFoldersView;
window.viewBookmarkDetail = viewBookmarkDetail;
window.previewBookmark = previewBookmark;
window.downloadBookmark = downloadBookmark;
window.removeBookmark = removeBookmark;
window.removeBookmarkFromDetail = removeBookmarkFromDetail;
window.goBackFromNoteDetail = goBackFromNoteDetail;

function setupExportImport() {
    const exportBtn = document.getElementById('exportBookmarks');
    const importBtn = document.getElementById('importBookmarks');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportBookmarks);
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', importBookmarks);
    }
}

function exportBookmarks() {
    const bookmarks = getBookmarks();
    const folders = getBookmarkFolders();
    
    if (bookmarks.length === 0 && folders.length === 0) {
        showNotificationModal('No bookmarks to export', 'info');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        bookmarks: bookmarks,
        folders: folders
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notify-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotificationModal('Bookmarks exported successfully', 'success');
}

function importBookmarks() {
    const choiceModal = `
    <div class="modal" id="importChoiceModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-import"></i> Import</h3>
                <button class="close-modal" onclick="closeImportChoiceModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>Choose what to import:</p>
                <div class="import-options">
                    <button class="import-option" onclick="importFromJSON()">
                        <i class="fas fa-file-code"></i>
                        <span>Import Bookmarks (JSON)</span>
                    </button>
                    <button class="import-option" onclick="importFromLocalFolder()">
                        <i class="fas fa-folder-open"></i>
                        <span>Import from Local Folder</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', choiceModal);
    document.getElementById('importChoiceModal').style.display = 'flex';
    document.getElementById('importChoiceModal').style.zIndex = '10000';
}

function closeImportChoiceModal() {
    const modal = document.getElementById('importChoiceModal');
    if (modal) {
        modal.remove();
    }
}

function importFromJSON() {
    closeImportChoiceModal();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importData = JSON.parse(event.target.result);
                
                if (!importData.bookmarks && !importData.folders) {
                    showNotificationModal('Invalid bookmark file format', 'error');
                    return;
                }
                
                if (importData.folders && Array.isArray(importData.folders)) {
                    const existingFolders = getBookmarkFolders();
                    const mergedFolders = [...existingFolders, ...importData.folders];
                    saveBookmarkFolders(mergedFolders);
                }
                
                if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
                    const existingBookmarks = getBookmarks();
                    const existingIds = new Set(existingBookmarks.map(b => b.noteId));
                    const newBookmarks = importData.bookmarks.filter(b => !existingIds.has(b.noteId));
                    const mergedBookmarks = [...existingBookmarks, ...newBookmarks];
                    saveBookmarks(mergedBookmarks);
                }
                
                showNotificationModal('Bookmarks imported successfully', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                console.error('Import error:', err);
                showNotificationModal('Failed to import bookmarks', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function importFromLocalFolder() {
    closeImportChoiceModal();
    
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInputwebkitdirectory = true;
    folderInput.multiple = true;
    folderInput.accept = '.pdf,.doc,.docx,.txt,.md';
    
    folderInput.onchange = function(e) {
        const files = Array.from(e.target.files).filter(f => 
            f.name.match(/\.(pdf|doc|docx|txt|md)$/i)
        );
        
        if (files.length === 0) {
            showNotificationModal('No supported files found in folder', 'error');
            return;
        }
        
        const folderName = 'Imported Files';
        let folders = getBookmarkFolders();
        let folderIndex = folders.findIndex(f => f.name === folderName);
        
        if (folderIndex === -1) {
            folders.push({
                name: folderName,
                color: '#9ca3af',
                created_at: new Date().toISOString(),
                isLocal: true
            });
            saveBookmarkFolders(folders);
            folderIndex = folders.length - 1;
        }
        
        let bookmarks = getBookmarks();
        let imported = 0;
        
        files.forEach(file => {
            const bookmark = {
                id: Date.now() + Math.random(),
                noteId: null,
                title: file.name.replace(/\.[^/.]+$/, ''),
                description: `Imported from local folder: ${file.name}`,
                uploadedByName: 'Local Import',
                pages: '?',
                folderIndex: folderIndex,
                date: new Date().toISOString(),
                isLocal: true,
                fileName: file.name,
                fileSize: file.size
            };
            bookmarks.push(bookmark);
            imported++;
        });
        
        saveBookmarks(bookmarks);
        showNotificationModal(`Imported ${imported} files successfully`, 'success');
        setTimeout(() => location.reload(), 1500);
    };
    
    folderInput.click();
}

function initializeSearch() {
    console.log('Initializing search page...');
    
    // Show loader first
    const loader = document.getElementById('lottieLoader');
    const content = document.getElementById('searchContent');
    
    if (loader) {
        loader.classList.remove('hide');
        loader.style.display = 'flex';
    }
    if (content) {
        content.classList.remove('show');
        content.style.display = 'none';
    }
    
    // Hide loader after delay
    setTimeout(() => {
        if (loader) {
            loader.classList.add('hide');
            loader.style.display = 'none';
        }
        if (content) {
            content.classList.add('show');
            content.style.display = 'block';
        }
        
        // Focus search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }, 800);
    
    // Focus search input
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.focus();
    }
    
    // Check for URL params
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        searchInput.value = query;
        performSearch(query);
    }
}

function loadSearchHistory() {
    try {
        const history = localStorage.getItem('searchHistory');
        if (history) {
            console.log('Search history loaded:', JSON.parse(history));
        }
    } catch (error) {
        console.error('Error loading search history:', error);
    }
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('globalSearch');
    const searchButton = document.getElementById('searchButton');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
        
        searchInput.addEventListener('input', debounce(handleSearchTyping, 500));
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
    }
    
    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterByTab(this.dataset.tab);
        });
    });
    
    // Filters
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    
    if (applyFilters) {
        applyFilters.addEventListener('click', applyAdvancedFilters);
    }
    
    if (clearFilters) {
        clearFilters.addEventListener('click', clearAdvancedFilters);
    }
    
    // Filter inputs
    const filterInputs = document.querySelectorAll('#filterCourse, #filterDepartment, #filterYear');
    filterInputs.forEach(input => {
        input.addEventListener('change', updateFilterSummary);
    });
    
    const fileTypeCheckboxes = document.querySelectorAll('.checkbox-group input');
    fileTypeCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateFilterSummary);
    });
    
    const dateInputs = document.querySelectorAll('#dateFrom, #dateTo');
    dateInputs.forEach(input => {
        input.addEventListener('change', updateFilterSummary);
    });
    
    // Load more
    const loadMore = document.getElementById('loadMore');
    if (loadMore) {
        loadMore.addEventListener('click', loadMoreResults);
    }
    
    // Clear search
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            document.getElementById('globalSearch').value = '';
            document.getElementById('noResults').style.display = 'none';
            // Show default results or hide
        });
    }
    
    // Related searches
    const relatedLinks = document.querySelectorAll('.related-tags a');
    relatedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const query = this.textContent;
            document.getElementById('globalSearch').value = query;
            performSearch(query);
        });
    });
    
    // Result actions
    setupResultActions();
}

function handleSearchTyping(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
        // Show suggestions (in real app)
        showSuggestions(query);
    }
}

function showSuggestions(query) {
    // In a real app, this would fetch suggestions from API
    console.log('Showing suggestions for:', query);
}

function performSearch(query) {
    if (!query.trim()) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    console.log('Performing search for:', query);
    
    // Show loading state
    const results = document.getElementById('searchResults');
    results.innerHTML = '<div class="skeleton-loader">Loading...</div>';
    
    // Simulate search delay
    setTimeout(() => {
        // In real app, this would be an API call
        updateSearchResults(query);
        saveSearchHistory(query);
        updateURL(query);
    }, 500);
}

function updateSearchResults(query) {
    // Update result count
    document.getElementById('resultCount').textContent = '127 results';
    
    // Update search time
    document.getElementById('searchTime').textContent = '0.3 seconds';
    
    // Highlight search terms in results
    highlightSearchTerm(query);
    
    // Hide no results if visible
    document.getElementById('noResults').style.display = 'none';
    
    // Show results container
    document.getElementById('searchResults').style.display = 'block';
    
    // Update filter summary
    updateFilterSummary();
    
    showNotification(`Found results for "${query}"`, 'success');
}

function highlightSearchTerm(term) {
    const excerpts = document.querySelectorAll('.result-excerpt');
    const words = term.toLowerCase().split(' ');
    
    excerpts.forEach(excerpt => {
        let html = excerpt.textContent;
        words.forEach(word => {
            if (word.length > 2) {
                const regex = new RegExp(word, 'gi');
                html = html.replace(regex, match => `<mark>${match}</mark>`);
            }
        });
        excerpt.innerHTML = html;
    });
}

function saveSearchHistory(query) {
    try {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history = [query, ...history.filter(q => q !== query)].slice(0, 10);
        localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving search history:', error);
    }
}

function updateURL(query) {
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);
}

function filterByTab(tab) {
    const results = document.querySelectorAll('.result-card');
    let visibleCount = 0;
    
    results.forEach(result => {
        if (tab === 'all' || result.dataset.type === tab) {
            result.style.display = 'flex';
            visibleCount++;
        } else {
            result.style.display = 'none';
        }
    });
    
    document.getElementById('resultCount').textContent = `${visibleCount} results`;
    showNotification(`Showing ${tab} results`, 'info');
}

function applyAdvancedFilters() {
    const course = document.getElementById('filterCourse').value;
    const dept = document.getElementById('filterDepartment').value;
    const year = document.getElementById('filterYear').value;
    const fileTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    // Update filter summary
    updateFilterSummary();
    
    // In real app: filter results
    console.log('Applying filters:', { course, dept, year, fileTypes, dateFrom, dateTo });
    
    // Simulate filtering
    const results = document.querySelectorAll('.result-card');
    let visibleCount = 0;
    
    results.forEach(result => {
        let show = true;
        
        // Apply simple filters (in real app, check actual data)
        if (course && !result.textContent.includes(course)) show = false;
        if (dept && !result.textContent.includes(dept)) show = false;
        
        result.style.display = show ? 'flex' : 'none';
        if (show) visibleCount++;
    });
    
    document.getElementById('resultCount').textContent = `${visibleCount} results`;
    showNotification('Filters applied', 'success');
}

function clearAdvancedFilters() {
    // Reset all filters
    document.getElementById('filterCourse').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterYear').value = '';
    
    document.querySelectorAll('.checkbox-group input').forEach(cb => {
        cb.checked = true;
    });
    
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    // Show all results
    document.querySelectorAll('.result-card').forEach(r => {
        r.style.display = 'flex';
    });
    
    document.getElementById('resultCount').textContent = '127 results';
    
    // Clear filter tags
    const summary = document.getElementById('activeFilters');
    summary.innerHTML = '';
    
    showNotification('Filters cleared', 'info');
}

function updateFilterSummary() {
    const summary = document.getElementById('activeFilters');
    const filters = [];
    
    const course = document.getElementById('filterCourse').value;
    const dept = document.getElementById('filterDepartment').value;
    const year = document.getElementById('filterYear').value;
    const fileTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (course) filters.push({ type: 'course', value: course });
    if (dept) filters.push({ type: 'department', value: dept });
    if (year) filters.push({ type: 'year', value: year });
    if (fileTypes.length > 0 && fileTypes.length < 5) {
        filters.push({ type: 'type', value: fileTypes.join(', ') });
    }
    if (dateFrom) filters.push({ type: 'from', value: dateFrom });
    if (dateTo) filters.push({ type: 'to', value: dateTo });
    
    // Clear and rebuild
    summary.innerHTML = '';
    filters.forEach(filter => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${filter.type}: ${filter.value}
            <button onclick="removeFilter('${filter.type}')"><i class="fas fa-times"></i></button>
        `;
        summary.appendChild(tag);
    });
}

function removeFilter(type) {
    switch(type) {
        case 'course':
            document.getElementById('filterCourse').value = '';
            break;
        case 'department':
            document.getElementById('filterDepartment').value = '';
            break;
        case 'year':
            document.getElementById('filterYear').value = '';
            break;
        case 'from':
            document.getElementById('dateFrom').value = '';
            break;
        case 'to':
            document.getElementById('dateTo').value = '';
            break;
    }
    
    applyAdvancedFilters();
}

function loadMoreResults() {
    const button = document.getElementById('loadMore');
    button.textContent = 'Loading...';
    button.disabled = true;
    
    setTimeout(() => {
        // In real app: load next page
        button.textContent = 'Load More Results';
        button.disabled = false;
        showNotification('More results loaded', 'success');
    }, 1000);
}

function setupResultActions() {
    document.querySelectorAll('.result-card').forEach(card => {
        const bookmarkBtn = card.querySelector('.action-btn[title="Save to bookmarks"]');
        const downloadBtn = card.querySelector('.action-btn[title="Download"]');
        const watchBtn = card.querySelector('.action-btn[title="Watch later"]');
        const enrollBtn = card.querySelector('.action-btn[title="Enroll"]');
        const followBtn = card.querySelector('.action-btn[title="Follow"]');
        
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', function() {
                const icon = this.querySelector('i');
                if (icon.classList.contains('far')) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    icon.style.color = 'var(--primary-color)';
                    showNotification('Added to bookmarks', 'success');
                } else {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                    icon.style.color = '';
                    showNotification('Removed from bookmarks', 'info');
                }
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                showNotification('Download started', 'success');
            });
        }
        
        if (watchBtn) {
            watchBtn.addEventListener('click', function() {
                const icon = this.querySelector('i');
                icon.style.color = 'var(--warning-color)';
                showNotification('Added to watch later', 'success');
            });
        }
        
        if (enrollBtn) {
            enrollBtn.addEventListener('click', () => {
                showNotification('Enrolled successfully', 'success');
            });
        }
        
        if (followBtn) {
            followBtn.addEventListener('click', function() {
                this.innerHTML = '<i class="fas fa-check"></i> Following';
                this.classList.add('following');
                showNotification('Following professor', 'success');
            });
        }
    });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = document.createElement('i');
    icon.className = `fas fa-${
        type === 'success' ? 'check-circle' : 
        type === 'error' ? 'exclamation-circle' : 
        'info-circle'
    }`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(text);
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions global for onclick handlers
window.removeFilter = removeFilter;
window.clearSearch = function() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('noResults').style.display = 'none';
};
window.closeAddBookmarkModal = closeAddBookmarkModal;
window.addBookmarkFromForm = addBookmarkFromForm;
window.closeImportChoiceModal = closeImportChoiceModal;
window.importFromJSON = importFromJSON;
window.importFromLocalFolder = importFromLocalFolder;
window.closeFolderModal = closeFolderModal;
window.createNewFolder = createNewFolder;