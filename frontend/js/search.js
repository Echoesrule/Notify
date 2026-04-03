
let searchPage = 1;
let totalResults = 127;
let currentQuery = '';
let currentTab = 'all';
let searchTimeout;

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
        const [schoolsRes, deptsRes] = await Promise.all([
            fetch(`${API_URL}/schools`).then(r => r.json()).catch(() => []),
            fetch(`${API_URL}/departments`).then(r => r.json()).catch(() => [])
        ]);
        
        const courseSelect = document.getElementById('filterCourse');
        const deptSelect = document.getElementById('filterDepartment');
        const yearSelect = document.getElementById('filterYear');
        
        if (courseSelect) {
            courseSelect.innerHTML = '<option value="">All Courses</option>';
            if (Array.isArray(schoolsRes)) {
                schoolsRes.forEach(school => {
                    courseSelect.innerHTML += `<option value="${school.name}">${school.name}</option>`;
                });
            }
        }
        
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">All Departments</option>';
            if (Array.isArray(deptsRes)) {
                deptsRes.forEach(dept => {
                    deptSelect.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;
                });
            }
        }
        
        if (yearSelect) {
            const currentYear = new Date().getFullYear();
            yearSelect.innerHTML = '<option value="">All Years</option>';
            for (let i = 0; i < 4; i++) {
                yearSelect.innerHTML += `<option value="Year ${i + 1}">Year ${i + 1}</option>`;
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
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
}

/**
 * Check URL parameters for search query
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        const searchInput = document.getElementById('globalSearch');
        searchInput.value = query;
        performSearch(query);
    }
}

/**
 * Load search history from localStorage
 */
function loadSearchHistory() {
    try {
        const history = localStorage.getItem('notifySearchHistory');
        if (history) {
            const searches = JSON.parse(history);
            console.log('Search history loaded:', searches);
            // You could display recent searches here
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
        // Search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                performSearch(this.value.trim());
            }
        });
        
        // Real-time search with debounce
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
        
        // Clear button (if we add one)
        searchInput.addEventListener('search', function(e) {
            if (!this.value) {
                resetSearch();
            }
        });
    }
    
    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            performSearch(query);
        });
    }
    
    // Tab switching
    setupTabs();
    
    // Filters
    setupFilters();
    
    // Result actions
    setupResultActions();
    
    // Load more button
    const loadMore = document.getElementById('loadMore');
    if (loadMore) {
        loadMore.addEventListener('click', loadMoreResults);
    }
    
    // Related searches
    setupRelatedSearches();
    
    // Clear search button
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', resetSearch);
    }
    
    // Modal close
    setupModal();
}

/**
 * Setup search tabs
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Get tab type
            const tabType = this.dataset.tab;
            currentTab = tabType;
            
            // Filter results by tab
            filterByTab(tabType);
            
            // Update URL with tab
            updateURLParam('tab', tabType);
        });
    });
}

/**
 * Setup filter controls
 */
function setupFilters() {
    // Filter toggle button
    const filterToggle = document.getElementById('filterToggle');
    const filterContent = document.getElementById('filterContent');
    
    if (filterToggle && filterContent) {
        filterToggle.addEventListener('click', function() {
            filterToggle.classList.toggle('active');
            filterContent.classList.toggle('show');
        });
    }
    
    // Apply filters button
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyAdvancedFilters);
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAdvancedFilters);
    }
    
    // Filter inputs - update summary on change
    const filterInputs = [
        'filterCourse', 
        'filterDepartment', 
        'filterYear'
    ];
    
    filterInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', updateFilterSummary);
        }
    });
    
    // File type checkboxes
    const fileCheckboxes = document.querySelectorAll('.checkbox-group input');
    fileCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateFilterSummary);
    });
}

/**
 * Setup result action buttons
 */
function setupResultActions() {
    // Bookmark buttons
    document.querySelectorAll('.action-btn[title="Save to bookmarks"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleBookmark(this);
        });
    });
    
    // Download buttons
    document.querySelectorAll('.action-btn[title="Download"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleDownload(this);
        });
    });
    
    // Watch later buttons
    document.querySelectorAll('.action-btn[title="Watch later"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleWatchLater(this);
        });
    });
    
    // Enroll buttons
    document.querySelectorAll('.action-btn[title="Enroll"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleEnroll(this);
        });
    });
    
    // Follow buttons
    document.querySelectorAll('.action-btn[title="Follow"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFollow(this);
        });
    });
    
    // Result links
    document.querySelectorAll('.result-content h3 a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const title = this.textContent;
            showNotification(`Opening: ${title}`, 'info');
            // In real app: window.open(this.href, '_blank');
        });
    });
    
    // Tag clicks
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const tagText = this.textContent;
            document.getElementById('globalSearch').value = tagText;
            performSearch(tagText);
        });
    });
}

/**
 * Setup related searches links
 */
function setupRelatedSearches() {
    const relatedLinks = document.querySelectorAll('.related-tags a');
    
    relatedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const query = this.textContent;
            document.getElementById('globalSearch').value = query;
            performSearch(query);
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}


function setupModal() {
    const modal = document.getElementById('quickViewModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

/**
 * Perform search with query
 * @param {string} query - Search query
 */
const API_URL = 'http://localhost:3000/api';

async function performSearch(query) {
    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    console.log('Searching for:', query);
    currentQuery = query;
    
    // Show loading state
    const results = document.getElementById('searchResults');
    results.innerHTML = '<div class="skeleton-loader">Searching...</div>';
    
    try {
        // Fetch from real APIs
        const [schoolsRes, notesRes, coursesRes] = await Promise.all([
            fetch(`${API_URL}/schools`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API_URL}/notes`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API_URL}/departments`).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        
        console.log('API Response - Schools:', schoolsRes);
        console.log('API Response - Notes:', notesRes);
        console.log('API Response - Courses:', coursesRes);
        
        const searchLower = query.toLowerCase().trim();
        
        // Filter schools
        const schools = Array.isArray(schoolsRes) ? schoolsRes.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchLower)) || 
            (s.code && s.code.toLowerCase().includes(searchLower))
        ) : [];
        
        // Filter notes
        const notes = Array.isArray(notesRes) ? notesRes.filter(n =>
            (n.title && n.title.toLowerCase().includes(searchLower)) ||
            (n.description && n.description.toLowerCase().includes(searchLower)) ||
            (n.unitName && n.unitName.toLowerCase().includes(searchLower)) ||
            (n.schoolName && n.schoolName.toLowerCase().includes(searchLower)) ||
            (n.deptName && n.deptName.toLowerCase().includes(searchLower)) ||
            (n.uploadedByName && n.uploadedByName.toLowerCase().includes(searchLower))
        ) : [];
        
        // Filter courses/departments
        const courses = Array.isArray(coursesRes) ? coursesRes.filter(c =>
            (c.name && c.name.toLowerCase().includes(searchLower)) ||
            (c.code && c.code.toLowerCase().includes(searchLower))
        ) : [];
        
        // Combine and render results
        renderSearchResults(query, schools, notes, courses);
        
        // Save to history
        saveToHistory(query);
        
        // Update URL
        updateURL(query);
        
        const total = schools.length + notes.length + courses.length;
        showNotification(`Found ${total} results for "${query}"`, 'success');
    } catch (error) {
        console.error('Search error:', error);
        updateSearchResults(query);
    }
}

/**
 * Render search results from real data
 * @param {string} query - Search query
 * @param {Array} schools - Schools array
 * @param {Array} notes - Notes array
 * @param {Array} courses - Courses/Departments array
 */
function renderSearchResults(query, schools, notes, courses = []) {
    let html = '';
    const queryLower = query.toLowerCase();
    
    // Render schools
    if (schools.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-university"></i> Schools/Faculties</h3>`;
        schools.forEach(school => {
            html += `
                <div class="result-card clickable" data-type="school" onclick="selectSchoolFromSearch(${school.id}, '${(school.name || '').replace(/'/g, "\\'")}')">
                    <div class="result-icon" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(school.name, query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-code"></i> ${school.code || 'N/A'}</span>
                            <span><i class="fas fa-users"></i> ${school.studentCount || 0} Students</span>
                            <span><i class="fas fa-book"></i> ${school.courseCount || 0} Courses</span>
                        </div>
                    </div>
                    <div class="result-actions" onclick="event.stopPropagation()">
                        <button class="action-btn" title="Save to bookmarks"><i class="far fa-bookmark"></i></button>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    // Render courses/departments
    if (courses.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-book"></i> Courses/Departments</h3>`;
        courses.forEach(course => {
            html += `
                <div class="result-card clickable" data-type="course" onclick="selectCourseFromSearch('${course.school_id || ''}', '${(course.name || '').replace(/'/g, "\\'")}', ${course.id})">
                    <div class="result-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(course.name, query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-code"></i> ${course.code || 'N/A'}</span>
                            <span><i class="fas fa-layer-group"></i> ${course.year || 'N/A'}</span>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    // Render notes
    if (notes.length > 0) {
        html += `<div class="search-section"><h3><i class="fas fa-file-pdf"></i> Notes</h3>`;
        notes.forEach(note => {
            const icon = note.file_path?.includes('.pdf') ? 'fa-file-pdf' : 'fa-file-alt';
            html += `
                <div class="result-card clickable" data-type="note" onclick="openNoteFromSearch('${note.schoolId || ''}', '${note.deptId || ''}', '${note.unitId || ''}')">
                    <div class="result-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="result-content">
                        <h3>${highlightMatch(note.title, query)}</h3>
                        <div class="result-meta">
                            <span><i class="fas fa-school"></i> ${note.schoolName || 'N/A'}</span>
                            <span><i class="fas fa-book"></i> ${note.deptName || note.courseName || 'N/A'}</span>
                            <span><i class="fas fa-chalkboard-teacher"></i> ${note.unitName || 'N/A'}</span>
                            <span><i class="fas fa-user"></i> ${note.uploadedByName || 'Unknown'}</span>
                        </div>
                        <p class="result-excerpt">${note.description || ''}</p>
                    </div>
                    <div class="result-actions" onclick="event.stopPropagation()">
                        <button class="action-btn" title="Save to bookmarks" onclick="bookmarkFromSearch(${note.id}, '${note.title.replace(/'/g, "\\'")}', '${(note.description || '').replace(/'/g, "\\'")}', '${(note.uploadedByName || '').replace(/'/g, "\\'")}')"><i class="far fa-bookmark"></i></button>
                    </div>
                </div>`;
        });
        html += '</div>';
    }
    
    if (!html) {
        html = '<div class="no-results"><i class="fas fa-search"></i><p>No results found</p></div>';
    }
    
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = html;
    
    totalResults = schools.length + notes.length;
    document.getElementById('resultCount').textContent = `${totalResults} results`;
    document.getElementById('searchTime').textContent = '0.00 seconds';
    document.getElementById('resultsStats').style.display = 'flex';
    
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('searchResults').style.display = 'block';
    
    // Show related searches
    updateRelatedSearches(schools, notes);
    
    searchPage = 1;
    setupResultActions();
}

function updateRelatedSearches(schools, notes) {
    const relatedSection = document.getElementById('relatedSearches');
    const relatedTags = document.getElementById('relatedTags');
    
    if (!relatedSection || !relatedTags) return;
    
    const keywords = new Set();
    
    schools.forEach(s => {
        if (s.name) keywords.add(s.name.toLowerCase().split(' ')[0]);
    });
    
    notes.forEach(n => {
        if (n.title) {
            n.title.toLowerCase().split(' ').forEach(w => {
                if (w.length > 3) keywords.add(w);
            });
        }
    });
    
    const related = Array.from(keywords).slice(0, 6);
    
    if (related.length > 0) {
        relatedTags.innerHTML = related.map(k => 
            `<a href="#" onclick="performSearch('${k}'); return false;">${k}</a>`
        ).join('');
        relatedSection.style.display = 'block';
    } else {
        relatedSection.style.display = 'none';
    }
}

function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Update search results UI
 * @param {string} query - Search query
 */
function updateSearchResults(query) {
    // Update result count (random for demo)
    const resultCount = Math.floor(Math.random() * 200) + 50;
    totalResults = resultCount;
    
    document.getElementById('resultCount').textContent = 
        `${resultCount.toLocaleString()} results`;
    
    document.getElementById('searchTime').textContent = 
        `${(Math.random() * 0.5 + 0.2).toFixed(2)} seconds`;
    
    // Highlight search terms
    highlightSearchTerm(query);
    
    // Hide no results if visible
    document.getElementById('noResults').style.display = 'none';
    
    // Show results
    document.getElementById('searchResults').style.display = 'block';
    
    // Reset to first page
    searchPage = 1;
}

/**
 * Highlight search terms in excerpts
 * @param {string} term - Search term
 */
function highlightSearchTerm(term) {
    const excerpts = document.querySelectorAll('.result-excerpt');
    const words = term.toLowerCase().split(' ').filter(w => w.length > 2);
    
    excerpts.forEach(excerpt => {
        let html = excerpt.innerHTML;
        
        words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            html = html.replace(regex, '<mark>$1</mark>');
        });
        
        excerpt.innerHTML = html;
    });
}

/**
 * Show search suggestions
 * @param {string} query - Partial query
 */
function showSuggestions(query) {
    // In real app, fetch from API
    console.log('Showing suggestions for:', query);
    
    // For demo, just log
    const suggestions = [
        query + ' notes',
        query + ' course',
        query + ' professor',
        query + ' tutorial'
    ];
    
    // You could display these in a dropdown
}

/**
 * Hide suggestions dropdown
 */
function hideSuggestions() {
    // Hide suggestions dropdown
}

/**
 * Save search to history
 * @param {string} query - Search query
 */
function saveToHistory(query) {
    try {
        let history = JSON.parse(localStorage.getItem('notifySearchHistory') || '[]');
        
        // Remove if exists, add to front
        history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
        history.unshift(query);
        
        // Keep only last 10
        history = history.slice(0, 10);
        
        localStorage.setItem('notifySearchHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving search history:', error);
    }
}

/**
 * Update URL with search query
 * @param {string} query - Search query
 */
function updateURL(query) {
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);
}

/**
 * Update URL parameter
 * @param {string} key - Parameter name
 * @param {string} value - Parameter value
 */
function updateURLParam(key, value) {
    const url = new URL(window.location);
    if (value && value !== 'all') {
        url.searchParams.set(key, value);
    } else {
        url.searchParams.delete(key);
    }
    window.history.pushState({}, '', url);
}

/**
 * Filter results by tab
 * @param {string} tab - Tab type
 */
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
    
    // Update count
    document.getElementById('resultCount').textContent = 
        `${visibleCount} results`;
    
    // Show/hide no results
    if (visibleCount === 0) {
        showNoResults(`No ${tab} found`);
    }
    
    showNotification(`Showing ${tab} results`, 'info');
}

/**
 * Apply advanced filters
 */
function applyAdvancedFilters() {
    // Get filter values
    const course = document.getElementById('filterCourse')?.value || '';
    const dept = document.getElementById('filterDepartment')?.value || '';
    const year = document.getElementById('filterYear')?.value || '';
    const fileTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
        .map(cb => cb.value);
    
    console.log('Applying filters:', { course, dept, year, fileTypes });
    
    // Update filter summary
    updateFilterSummary();
    
    // Filter results (simulated)
    const results = document.querySelectorAll('.result-card');
    let visibleCount = 0;
    
    results.forEach(result => {
        let show = true;
        const text = result.textContent.toLowerCase();
        
        // Apply filters (simplified for demo)
        if (course && !text.includes(course.toLowerCase())) show = false;
        if (dept && !text.includes(dept.toLowerCase())) show = false;
        if (year && !text.includes(year.toLowerCase())) show = false;
        
        result.style.display = show ? 'flex' : 'none';
        if (show) visibleCount++;
    });
    
    // Update count
    document.getElementById('resultCount').textContent = 
        `${visibleCount} results`;
    
    // Show notification
    showNotification('Filters applied', 'success');
    
    // Show no results message if needed
    if (visibleCount === 0) {
        showNoResults('No results match your filters');
    }
}

/**
 * Clear all advanced filters
 */
function clearAdvancedFilters() {
    // Reset selects
    document.getElementById('filterCourse').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterYear').value = '';
    
    // Reset checkboxes
    document.querySelectorAll('.checkbox-group input').forEach(cb => {
        cb.checked = true;
    });
    
    // Reset dates
    if (document.getElementById('dateFrom')) document.getElementById('dateFrom').value = '';
    if (document.getElementById('dateTo')) document.getElementById('dateTo').value = '';
    
    // Show all results
    document.querySelectorAll('.result-card').forEach(r => {
        r.style.display = 'flex';
    });
    
    // Update count
    document.getElementById('resultCount').textContent = 
        `${totalResults} results`;
    
    // Clear filter tags
    document.getElementById('activeFilters').innerHTML = '';
    
    // Hide no results message
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = 'none';
    
    showNotification('Filters cleared', 'info');
}

/**
 * Update filter summary tags
 */
function updateFilterSummary() {
    const summary = document.getElementById('activeFilters');
    const filters = [];
    
    // Collect active filters
    const course = document.getElementById('filterCourse')?.value || '';
    const dept = document.getElementById('filterDepartment')?.value || '';
    const year = document.getElementById('filterYear')?.value || '';
    const fileTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
        .map(cb => cb.value);
    
    if (course) filters.push({ type: 'course', value: course });
    if (dept) filters.push({ type: 'department', value: dept });
    if (year) filters.push({ type: 'year', value: year });
    if (fileTypes.length > 0 && fileTypes.length < 5) {
        filters.push({ type: 'type', value: fileTypes.join(', ') });
    }
    
    // Clear and rebuild
    summary.innerHTML = '';
    
    filters.forEach(filter => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${filter.type}: ${filter.value}
            <button onclick="removeFilter('${filter.type}')" title="Remove filter">
                <i class="fas fa-times"></i>
            </button>
        `;
        summary.appendChild(tag);
    });
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

/**
 * Remove a specific filter
 * @param {string} type - Filter type to remove
 */
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
            if (document.getElementById('dateFrom')) document.getElementById('dateFrom').value = '';
            break;
        case 'to':
            if (document.getElementById('dateTo')) document.getElementById('dateTo').value = '';
            break;
        case 'type':
            document.querySelectorAll('.checkbox-group input').forEach(cb => {
                cb.checked = true;
            });
            break;
    }
    
    applyAdvancedFilters();
}

/**
 * Load more results
 */
function loadMoreResults() {
    const button = document.getElementById('loadMore');
    button.textContent = 'Loading...';
    button.disabled = true;
    
    setTimeout(() => {
        searchPage++;
        
        // Simulate new results
        const newResults = createMoreResults();
        
        // Add to DOM
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.insertAdjacentHTML('beforeend', newResults);
        
        // Re-attach event listeners to new results
        setupResultActions();
        
        // Update button
        button.textContent = 'Load More Results';
        button.disabled = false;
        
        // Update count
        totalResults += 6;
        document.getElementById('resultCount').textContent = 
            `${totalResults} results`;
        
        showNotification('More results loaded', 'success');
    }, 1000);
}

/**
 * Create more result HTML (simulated)
 * @returns {string} - HTML string
 */
function createMoreResults() {
    const types = ['note', 'video', 'course'];
    const titles = [
        'Advanced Calculus Problems',
        'Physics Lab Experiments',
        'Programming Interview Questions',
        'Machine Learning Basics',
        'Organic Chemistry Guide',
        'Statistics Cheat Sheet'
    ];
    
    let html = '';
    
    for (let i = 0; i < 6; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const title = titles[i % titles.length];
        const icon = type === 'note' ? 'fa-file-pdf' : 
                    type === 'video' ? 'fa-file-video' : 'fa-book';
        
        html += `
            <div class="result-card" data-type="${type}">
                <div class="result-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="result-content">
                    <h3>
                        <a href="#">${title} (Page ${searchPage})</a>
                        <span class="result-badge">${type.toUpperCase()}</span>
                    </h3>
                    <div class="result-meta">
                        <span><i class="fas fa-book"></i> Course ${searchPage}01</span>
                        <span><i class="fas fa-user"></i> Dr. Smith</span>
                        <span><i class="fas fa-calendar"></i> May 2024</span>
                    </div>
                    <p class="result-excerpt">
                        New content loaded from page ${searchPage}. 
                        This is a sample result with highlighted <mark>search terms</mark>.
                    </p>
                    <div class="result-tags">
                        <span class="tag">new</span>
                        <span class="tag">page${searchPage}</span>
                    </div>
                </div>
                <div class="result-actions">
                    <button class="action-btn" title="Save to bookmarks"><i class="far fa-bookmark"></i></button>
                    <button class="action-btn" title="Download"><i class="fas fa-download"></i></button>
                </div>
            </div>
        `;
    }
    
    return html;
}

/**
 * Toggle bookmark
 * @param {HTMLElement} btn - Button element
 */
function toggleBookmark(btn) {
    const icon = btn.querySelector('i');
    const card = btn.closest('.result-card');
    const title = card ? card.querySelector('h3 a')?.textContent : '';
    
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = 'var(--primary-color)';
        btn.style.background = 'rgba(0, 102, 255, 0.1)';
        showNotification('Saved to bookmarks', 'success');
        
        // Save to localStorage
        saveBookmark(btn);
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
        btn.style.background = '';
        showNotification('Removed from bookmarks', 'info');
        
        // Remove from localStorage
        removeBookmark(title);
    }
}

/**
 * Save bookmark to localStorage
 * @param {HTMLElement} btn - Button element
 */
function saveBookmark(btn) {
    try {
        const card = btn.closest('.result-card');
        const title = card.querySelector('h3 a').textContent;
        
        let bookmarks = JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
        
        bookmarks.push({
            id: Date.now(),
            title: title,
            date: new Date().toISOString(),
            type: card.dataset.type
        });
        
        localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Error saving bookmark:', error);
    }
}

/**
 * Remove bookmark from localStorage
 * @param {string} title - Bookmark title to remove
 */
function removeBookmark(title) {
    try {
        let bookmarks = JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
        bookmarks = bookmarks.filter(b => b.title !== title);
        localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Error removing bookmark:', error);
    }
}

/**
 * Handle download
 * @param {HTMLElement} btn - Button element
 */
function handleDownload(btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = 'var(--success-color)';
        btn.style.color = 'white';
        
        showNotification('Download started', 'success');
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-download"></i>';
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }, 1000);
}

/**
 * Toggle watch later
 * @param {HTMLElement} btn - Button element
 */
function toggleWatchLater(btn) {
    const icon = btn.querySelector('i');
    
    if (!btn.classList.contains('watched')) {
        icon.style.color = 'var(--warning-color)';
        btn.classList.add('watched');
        showNotification('Added to watch later', 'success');
    } else {
        icon.style.color = '';
        btn.classList.remove('watched');
        showNotification('Removed from watch later', 'info');
    }
}

/**
 * Handle enroll
 * @param {HTMLElement} btn - Button element
 */
function handleEnroll(btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Enrolled';
        btn.style.background = 'var(--success-color)';
        btn.style.color = 'white';
        btn.style.width = 'auto';
        btn.style.padding = '0 15px';
        
        showNotification('Successfully enrolled!', 'success');
    }, 800);
}

/**
 * Toggle follow
 * @param {HTMLElement} btn - Button element
 */
function toggleFollow(btn) {
    if (!btn.classList.contains('following')) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Following';
            btn.classList.add('following');
            showNotification('Now following', 'success');
        }, 500);
    } else {
        btn.innerHTML = '<i class="fas fa-user-plus"></i>';
        btn.classList.remove('following');
        showNotification('Unfollowed', 'info');
    }
}

/**
 * Show no results message
 * @param {string} message - Message to display
 */
function showNoResults(message) {
    let noResults = document.getElementById('noResults');
    
    if (!noResults) {
        noResults = document.createElement('div');
        noResults.id = 'noResults';
        noResults.className = 'no-results';
        
        const results = document.getElementById('searchResults');
        results.parentNode.insertBefore(noResults, results.nextSibling);
    }
    
    noResults.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>No results found</h3>
        <p>${message || 'Try adjusting your search or filters'}</p>
        <button class="btn-outline" onclick="resetSearch()">Clear Search</button>
    `;
    
    noResults.style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
}

/**
 * Reset search
 */
function resetSearch() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('searchResults').style.display = 'block';
    
    // Reset to default view
    document.querySelectorAll('.result-card').forEach(r => {
        r.style.display = 'flex';
    });
    
    document.getElementById('resultCount').textContent = '127 results';
    
    // Clear filters
    clearAdvancedFilters();
    
    // Update URL
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);
    
    // Focus search
    document.getElementById('globalSearch').focus();
}

function bookmarkFromSearch(noteId, title, description, uploadedByName) {
    const folders = JSON.parse(localStorage.getItem('notifyBookmarkFolders') || '[]');
    
    if (folders.length === 0) {
        const folderName = prompt('Create a folder for this bookmark:');
        if (!folderName) return;
        folders.push({ name: folderName, color: '#4a90d9', created_at: new Date().toISOString() });
        localStorage.setItem('notifyBookmarkFolders', JSON.stringify(folders));
    }
    
    const folderIndex = 0;
    const bookmarks = JSON.parse(localStorage.getItem('notifyBookmarks') || '[]');
    bookmarks.push({
        id: Date.now(),
        noteId: noteId,
        title: title,
        description: description,
        uploadedByName: uploadedByName,
        folderIndex: folderIndex,
        date: new Date().toISOString()
    });
    localStorage.setItem('notifyBookmarks', JSON.stringify(bookmarks));
    showNotification('Note bookmarked!', 'success');
}

function selectSchoolFromSearch(schoolId, schoolName) {
    window.location.href = 'courses.html?school=' + schoolId + '&preview=true';
}

function selectCourseFromSearch(schoolId, courseName, courseId) {
    window.location.href = 'units.html?school=' + schoolId + '&course=' + courseId + '&preview=true';
}

function openNoteFromSearch(schoolId, deptId, unitId) {
    window.location.href = 'notes.html?school=' + schoolId + '&dept=' + deptId + '&unit=' + unitId + '&preview=true';
}

/**
 * Show notification
 * @param {string} message - Message to show
 * @param {string} type - Type (success, error, info)
 */
function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    
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

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
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
window.resetSearch = resetSearch;