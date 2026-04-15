// frontend/js/search.js - Search page functionality
// Note: API_URL is set by config.js

const API_URL = window.API_URL;

let searchPage = 1;
let totalResults = 0;
let currentQuery = '';
let currentTab = 'all';
let searchTimeout;
let isLoading = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    loadSearchHistory();
    setupEventListeners();
    checkUrlParams();
    loadFilterOptions();
});

async function loadFilterOptions() {
    try {
        // Use existing endpoints that work
        const [schoolsRes] = await Promise.all([
            fetch(`${API_URL}/schools`).then(r => r.json()).catch(() => [])
        ]);
        
        const courseSelect = document.getElementById('filterCourse');
        
        if (courseSelect && Array.isArray(schoolsRes)) {
            courseSelect.innerHTML = '<option value="">All Schools</option>';
            schoolsRes.forEach(school => {
                courseSelect.innerHTML += `<option value="${school.id}">${school.name}</option>`;
            });
        }
        
        // Load courses from schools data (since /api/courses doesn't exist)
        if (schoolsRes.length > 0) {
            const allCourses = [];
            for (const school of schoolsRes) {
                if (school.departments && Array.isArray(school.departments)) {
                    school.departments.forEach(dept => {
                        allCourses.push({
                            id: dept.id,
                            name: dept.name,
                            code: dept.code,
                            school_id: school.id
                        });
                    });
                }
            }
            
            const deptSelect = document.getElementById('filterDepartment');
            if (deptSelect) {
                deptSelect.innerHTML = '<option value="">All Courses</option>';
                allCourses.forEach(course => {
                    deptSelect.innerHTML += `<option value="${course.id}">${course.name}</option>`;
                });
            }
        }
        
        const yearSelect = document.getElementById('filterYear');
        if (yearSelect) {
            const currentYear = new Date().getFullYear();
            yearSelect.innerHTML = '<option value="">All Years</option>';
            for (let i = 0; i < 4; i++) {
                yearSelect.innerHTML += `<option value="${currentYear - i}">${currentYear - i}</option>`;
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

function initializeSearch() {
    console.log('Initializing search page...');
    
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
    
    setTimeout(() => {
        if (loader) {
            loader.classList.add('hide');
            loader.style.display = 'none';
        }
        if (content) {
            content.classList.add('show');
            content.style.display = 'block';
        }
        
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }, 800);
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = query;
        performSearch(query);
    }
}

function loadSearchHistory() {
    try {
        const history = localStorage.getItem('notifySearchHistory');
        if (history) {
            const searches = JSON.parse(history);
            console.log('Search history loaded:', searches.length, 'items');
            displayRecentSearches(searches);
        }
    } catch (error) {
        console.error('Error loading search history:', error);
    }
}

function displayRecentSearches(searches) {
    const historyContainer = document.getElementById('recentSearches');
    if (!historyContainer || searches.length === 0) return;
    
    historyContainer.innerHTML = `
        <div class="recent-searches">
            <h4>Recent Searches</h4>
            <div class="recent-tags">
                ${searches.slice(0, 5).map(s => 
                    `<a href="#" onclick="performSearch('${s.replace(/'/g, "\\'")}'); return false;">${escapeHtml(s)}</a>`
                ).join('')}
            </div>
        </div>
    `;
}

function setupEventListeners() {
    const searchInput = document.getElementById('globalSearch');
    const searchButton = document.getElementById('searchButton');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.value.trim());
            }
        });
        
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    showSuggestions(query);
                }, 500);
            } else {
                hideSuggestions();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            const query = searchInput?.value.trim();
            if (query) performSearch(query);
        });
    }
    
    setupTabs();
    setupFilters();
    setupResultActions();
    
    const loadMore = document.getElementById('loadMore');
    if (loadMore) {
        loadMore.addEventListener('click', loadMoreResults);
    }
    
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', resetSearch);
    }
    
    setupModal();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            currentTab = this.dataset.tab;
            filterByTab(currentTab);
            updateURLParam('tab', currentTab);
        });
    });
}

function setupFilters() {
    const filterToggle = document.getElementById('filterToggle');
    const filterContent = document.getElementById('filterContent');
    
    if (filterToggle && filterContent) {
        filterToggle.addEventListener('click', function() {
            filterToggle.classList.toggle('active');
            filterContent.classList.toggle('show');
        });
    }
    
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyAdvancedFilters);
    }
    
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAdvancedFilters);
    }
    
    ['filterCourse', 'filterDepartment', 'filterYear'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', updateFilterSummary);
        }
    });
}

function setupResultActions() {
    document.querySelectorAll('.bookmark-btn, .action-btn[title="Save to bookmarks"]').forEach(btn => {
        btn.removeEventListener('click', handleBookmarkClick);
        btn.addEventListener('click', handleBookmarkClick);
    });
    
    document.querySelectorAll('.download-btn, .action-btn[title="Download"]').forEach(btn => {
        btn.removeEventListener('click', handleDownloadClick);
        btn.addEventListener('click', handleDownloadClick);
    });
}

function handleBookmarkClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    toggleBookmark(btn);
}

function handleDownloadClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    handleDownload(btn);
}

function setupModal() {
    const modal = document.getElementById('quickViewModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.classList.remove('show');
        });
    }
    
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
}

async function performSearch(query) {
    if (!query || isLoading) return;
    
    console.log('🔍 Searching for:', query);
    currentQuery = query;
    searchPage = 1;
    isLoading = true;
    
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="skeleton-loader">Searching...</div>';
    }
    
    try {
        // Use existing endpoints
        await performLocalSearch(query);
    } catch (error) {
        console.error('Search error:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>Search failed. Please try again.</p></div>';
        }
    } finally {
        isLoading = false;
    }
}

async function performLocalSearch(query) {
    console.log('Performing search for:', query);
    
    try {
        // Fetch from existing endpoints
        const [schoolsRes, notesRes] = await Promise.all([
            fetch(`${API_URL}/schools`).then(r => r.json()).catch(() => []),
            fetch(`${API_URL}/notes`).then(r => r.json()).catch(() => [])
        ]);
        
        const searchLower = query.toLowerCase().trim();
        
        // Filter schools
        const filteredSchools = Array.isArray(schoolsRes) ? schoolsRes.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchLower)) ||
            (s.code && s.code.toLowerCase().includes(searchLower))
        ) : [];
        
        // Filter courses from within schools data
        let allCourses = [];
        if (Array.isArray(schoolsRes)) {
            schoolsRes.forEach(school => {
                if (school.departments && Array.isArray(school.departments)) {
                    school.departments.forEach(dept => {
                        allCourses.push({
                            ...dept,
                            school_id: school.id,
                            school_name: school.name
                        });
                    });
                }
            });
        }
        
        const filteredCourses = allCourses.filter(c =>
            (c.name && c.name.toLowerCase().includes(searchLower)) ||
            (c.code && c.code.toLowerCase().includes(searchLower))
        );
        
        // Filter units from within schools data
        let allUnits = [];
        if (Array.isArray(schoolsRes)) {
            schoolsRes.forEach(school => {
                if (school.departments && Array.isArray(school.departments)) {
                    school.departments.forEach(dept => {
                        if (dept.units && Array.isArray(dept.units)) {
                            dept.units.forEach(unit => {
                                allUnits.push({
                                    ...unit,
                                    dept_id: dept.id,
                                    dept_name: dept.name,
                                    school_id: school.id,
                                    school_name: school.name
                                });
                            });
                        }
                    });
                }
            });
        }
        
        const filteredUnits = allUnits.filter(u =>
            (u.name && u.name.toLowerCase().includes(searchLower)) ||
            (u.code && u.code.toLowerCase().includes(searchLower))
        );
        
        // Filter notes
        const filteredNotes = Array.isArray(notesRes) ? notesRes.filter(n =>
            (n.title && n.title.toLowerCase().includes(searchLower)) ||
            (n.description && n.description.toLowerCase().includes(searchLower)) ||
            (n.unitName && n.unitName.toLowerCase().includes(searchLower)) ||
            (n.schoolName && n.schoolName.toLowerCase().includes(searchLower)) ||
            (n.deptName && n.deptName.toLowerCase().includes(searchLower)) ||
            (n.uploadedByName && n.uploadedByName.toLowerCase().includes(searchLower))
        ) : [];
        
        renderResults(query, filteredSchools, filteredCourses, filteredUnits, filteredNotes);
        
        const total = filteredSchools.length + filteredCourses.length + filteredUnits.length + filteredNotes.length;
        if (total > 0) {
            showNotification(`Found ${total} results for "${query}"`, 'success');
        } else {
            showNotification(`No results found for "${query}"`, 'info');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>Search failed. Please try again.</p></div>';
        }
    }
}

function renderResults(query, schools, courses, units, notes) {
    let html = '';
    
    // Schools section
    if (schools.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-university"></i> Schools (${schools.length})</h3>`;
        schools.forEach(school => {
            html += `
                <div class="result-card clickable" data-type="school" onclick="selectSchoolFromSearch(${school.id}, '${escapeHtml(school.name)}')">
                    <div class="result-icon" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(escapeHtml(school.name), query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-code"></i> ${school.code || 'N/A'}</span>
                            <span><i class="fas fa-users"></i> ${school.studentCount || 0} Students</span>
                            <span><i class="fas fa-book"></i> ${school.courseCount || 0} Courses</span>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    // Courses section
    if (courses.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-book"></i> Courses (${courses.length})</h3>`;
        courses.forEach(course => {
            html += `
                <div class="result-card clickable" data-type="course" onclick="selectCourseFromSearch('${course.school_id || ''}', '${escapeHtml(course.name)}', ${course.id})">
                    <div class="result-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(escapeHtml(course.name), query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-code"></i> ${course.code || 'N/A'}</span>
                            <span><i class="fas fa-school"></i> ${course.school_name || 'N/A'}</span>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    // Units section
    if (units.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-layer-group"></i> Units (${units.length})</h3>`;
        units.forEach(unit => {
            html += `
                <div class="result-card clickable" data-type="unit" onclick="openUnitFromSearch(${unit.id})">
                    <div class="result-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(escapeHtml(unit.name), query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-code"></i> ${unit.code || 'N/A'}</span>
                            <span><i class="fas fa-book"></i> ${unit.dept_name || 'N/A'}</span>
                            <span><i class="fas fa-school"></i> ${unit.school_name || 'N/A'}</span>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    // Notes section
    if (notes.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-file-pdf"></i> Notes (${notes.length})</h3>`;
        notes.forEach(note => {
            const icon = note.file_path?.includes('.pdf') ? 'fa-file-pdf' : 'fa-file-alt';
            html += `
                <div class="result-card" data-type="note">
                    <div class="result-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(escapeHtml(note.title), query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-school"></i> ${note.schoolName || 'N/A'}</span>
                            <span><i class="fas fa-book"></i> ${note.deptName || note.courseName || 'N/A'}</span>
                            <span><i class="fas fa-layer-group"></i> ${note.unitName || 'N/A'}</span>
                            <span><i class="fas fa-user"></i> ${note.uploadedByName || 'Unknown'}</span>
                        </div>
                        <p class="result-excerpt">${escapeHtml(note.description || '').substring(0, 200)}...</p>
                    </div>
                    <div class="result-actions" onclick="event.stopPropagation()">
                        <button class="action-btn bookmark-btn" title="Save to bookmarks" data-note-id="${note.id}" data-title="${escapeHtml(note.title)}"><i class="far fa-bookmark"></i></button>
                        ${note.file_path ? `<button class="action-btn download-btn" title="Download" data-file="${note.file_path}"><i class="fas fa-download"></i></button>` : ''}
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    if (!html) {
        html = '<div class="no-results"><i class="fas fa-search"></i><p>No results found for "' + escapeHtml(query) + '"</p></div>';
    }
    
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = html;
    }
    
    const total = schools.length + courses.length + units.length + notes.length;
    totalResults = total;
    
    const resultCountEl = document.getElementById('resultCount');
    if (resultCountEl) resultCountEl.textContent = `${total} results`;
    
    const resultsStats = document.getElementById('resultsStats');
    if (resultsStats) resultsStats.style.display = 'flex';
    
    setupResultActions();
}

function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function filterByTab(tab) {
    const sections = document.querySelectorAll('.search-section');
    let visibleCount = 0;
    
    sections.forEach(section => {
        const sectionType = section.querySelector('h3 i').className;
        let show = false;
        
        if (tab === 'all') {
            show = true;
        } else if (tab === 'schools' && sectionType.includes('fa-university')) {
            show = true;
        } else if (tab === 'courses' && (sectionType.includes('fa-book') || sectionType.includes('fa-layer-group'))) {
            show = true;
        } else if (tab === 'notes' && sectionType.includes('fa-file')) {
            show = true;
        }
        
        section.style.display = show ? 'block' : 'none';
        if (show) visibleCount += section.querySelectorAll('.result-card').length;
    });
    
    const resultCountEl = document.getElementById('resultCount');
    if (resultCountEl) resultCountEl.textContent = `${visibleCount} results`;
    
    if (visibleCount === 0) {
        showNoResults(`No ${tab} found`);
    }
}

function applyAdvancedFilters() {
    console.log('Applying filters...');
    if (currentQuery) {
        performSearch(currentQuery);
    }
    showNotification('Filters applied', 'success');
}

function clearAdvancedFilters() {
    const selects = ['filterCourse', 'filterDepartment', 'filterYear'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    if (currentQuery) {
        performSearch(currentQuery);
    }
    
    showNotification('Filters cleared', 'info');
}

function updateFilterSummary() {
    const summary = document.getElementById('activeFilters');
    if (!summary) return;
    
    const filters = [];
    const school = document.getElementById('filterCourse')?.value;
    const course = document.getElementById('filterDepartment')?.value;
    const year = document.getElementById('filterYear')?.value;
    
    if (school) filters.push(`School: ${school}`);
    if (course) filters.push(`Course: ${course}`);
    if (year) filters.push(`Year: ${year}`);
    
    summary.innerHTML = filters.map(f => `
        <span class="filter-tag">
            ${f}
            <button onclick="removeFilterValue('${f.split(':')[0].toLowerCase()}')">&times;</button>
        </span>
    `).join('');
}

function removeFilterValue(type) {
    const map = {
        'school': 'filterCourse',
        'course': 'filterDepartment', 
        'year': 'filterYear'
    };
    
    const elementId = map[type];
    if (elementId) {
        const el = document.getElementById(elementId);
        if (el) el.value = '';
    }
    
    if (currentQuery) {
        performSearch(currentQuery);
    }
}

function saveToHistory(query) {
    try {
        let history = JSON.parse(localStorage.getItem('notifySearchHistory') || '[]');
        history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
        history.unshift(query);
        history = history.slice(0, 10);
        localStorage.setItem('notifySearchHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving search history:', error);
    }
}

function updateURL(query) {
    const url = new URL(window.location);
    if (query) {
        url.searchParams.set('q', query);
    } else {
        url.searchParams.delete('q');
    }
    window.history.pushState({}, '', url);
}

function updateURLParam(key, value) {
    const url = new URL(window.location);
    if (value && value !== 'all') {
        url.searchParams.set(key, value);
    } else {
        url.searchParams.delete(key);
    }
    window.history.pushState({}, '', url);
}

function showSuggestions(query) {
    console.log('Showing suggestions for:', query);
}

function hideSuggestions() {}

function loadMoreResults() {
    if (isLoading) return;
    searchPage++;
    performSearch(currentQuery);
}

function toggleBookmark(btn) {
    const icon = btn.querySelector('i');
    const noteId = btn.dataset.noteId;
    const title = btn.dataset.title;
    
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        saveBookmarkToLocal(noteId, title);
        showNotification('Saved to bookmarks', 'success');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        removeBookmarkFromLocal(noteId);
        showNotification('Removed from bookmarks', 'info');
    }
}

function saveBookmarkToLocal(noteId, title) {
    try {
        let bookmarks = JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
        if (!bookmarks.find(b => b.noteId == noteId)) {
            bookmarks.push({
                id: Date.now(),
                noteId: noteId,
                title: title,
                date: new Date().toISOString()
            });
            localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
        }
    } catch (error) {
        console.error('Error saving bookmark:', error);
    }
}

function removeBookmarkFromLocal(noteId) {
    try {
        let bookmarks = JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
        bookmarks = bookmarks.filter(b => b.noteId != noteId);
        localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Error removing bookmark:', error);
    }
}

function handleDownload(btn) {
    const filePath = btn.dataset.file;
    if (filePath) {
        window.open(`${API_URL}${filePath}`, '_blank');
        showNotification('Download started', 'success');
    } else {
        showNotification('Download not available', 'error');
    }
}

function showNoResults(message) {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>${escapeHtml(message)}</p></div>`;
    }
}

function resetSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.value = '';
    currentQuery = '';
    searchPage = 1;
    
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    clearAdvancedFilters();
    
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);
    
    if (searchInput) searchInput.focus();
}

function selectSchoolFromSearch(schoolId, schoolName) {
    window.location.href = `courses.html?school=${schoolId}&preview=true`;
}

function selectCourseFromSearch(schoolId, courseName, courseId) {
    window.location.href = `units.html?school=${schoolId}&course=${courseId}&preview=true`;
}

function openUnitFromSearch(unitId) {
    window.location.href = `notes.html?unit=${unitId}&preview=true`;
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
    notification.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions global
window.performSearch = performSearch;
window.resetSearch = resetSearch;
window.selectSchoolFromSearch = selectSchoolFromSearch;
window.selectCourseFromSearch = selectCourseFromSearch;
window.openUnitFromSearch = openUnitFromSearch;
window.removeFilterValue = removeFilterValue;