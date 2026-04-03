/**
 * search.js - Search page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    loadSearchHistory();
    setupEventListeners();
});

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