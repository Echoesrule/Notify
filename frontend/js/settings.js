/**
 * settings.js - Main settings functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
    loadUserSettings();
    setupEventListeners();
    
    // Check for hash on initial load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        setTimeout(() => loadSection(hash), 100);
    }
});

/**
 * Initialize settings page
 */
function initializeSettings() {
    console.log('Initializing settings page...');
    
    // Hide loader
    const loader = document.getElementById('lottieLoader');
    if (loader) {
        loader.classList.add('hide');
    }
    
    // Show settings content
    const settingsContent = document.getElementById('settingsContent');
    if (settingsContent) {
        settingsContent.classList.add('show');
    }
    
    // Show first section by default
    const firstSection = document.querySelector('section');
    if (firstSection) {
        firstSection.classList.add('active');
        setTimeout(() => firstSection.classList.add('animate'), 100);
    }
    
    // Highlight first nav link
    const firstLink = document.querySelector('#sectionLinks h2');
    if (firstLink) {
        firstLink.classList.add('active');
    }
}

/**
 * Load saved user settings from localStorage
 */
function loadUserSettings() {
    try {
        const savedSettings = localStorage.getItem('notifySettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            applySettings(settings);
        }
        
        // Load user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userName = localStorage.getItem('user_name') || '';
        const userEmail = localStorage.getItem('user_email') || '';
        
        // Populate profile fields
        const nameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        if (nameInput && userName) nameInput.value = userName;
        if (emailInput && userEmail) emailInput.value = userEmail;
        
        // Load schools and user enrollment
        loadSchools();
        if (user.id) {
            loadUserEnrollment(user.id);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Load schools from API and populate select
 */
async function loadSchools() {
    try {
        const res = await fetch(`${window.API_URL}/schools`);
        if (res.ok) {
            const schools = await res.json();
            const schoolSelect = document.getElementById('school');
            if (schoolSelect) {
                schoolSelect.innerHTML = '<option value="">Select School</option>';
                schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.id;
                    option.textContent = school.name;
                    schoolSelect.appendChild(option);
                });
                
                // Add event listener for school change
                schoolSelect.addEventListener('change', handleSchoolChange);
            }
        }
    } catch (error) {
        console.error('Error loading schools:', error);
    }
}

/**
 * Handle school selection change
 */
async function handleSchoolChange() {
    const schoolSelect = document.getElementById('school');
    const deptSelect = document.getElementById('department');
    const schoolId = schoolSelect.value;
    
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        if (schoolId) {
            try {
                const res = await fetch(`${window.API_URL}/schools/${schoolId}/departments`);
                if (res.ok) {
                    const departments = await res.json();
                    departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept.id;
                        option.textContent = dept.name;
                        deptSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading departments:', error);
            }
        }
    }
}

/**
 * Load user's current enrollment
 */
async function loadUserEnrollment(userId) {
    try {
        const res = await fetch(`${window.API_URL}/users/${userId}/enrollments`);
        if (res.ok) {
            const enrollments = await res.json();
            if (enrollments && enrollments.length > 0) {
                const enrollment = enrollments[0];
                // Wait for schools to load, then set selected
                setTimeout(() => {
                    const schoolSelect = document.getElementById('school');
                    if (schoolSelect) {
                        schoolSelect.value = enrollment.school_id;
                        // Trigger department load
                        handleSchoolChange().then(() => {
                            const deptSelect = document.getElementById('department');
                            if (deptSelect) deptSelect.value = enrollment.course_id;
                        });
                    }
                }, 500); // Small delay to ensure schools are loaded
            }
        }
    } catch (error) {
        console.error('Error loading user enrollment:', error);
    }
}

/**
 * Apply settings to form elements
 * @param {Object} settings - The settings object
 */
function applySettings(settings) {
    // Apply theme
    if (settings.theme) {
        const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
        if (themeRadio) themeRadio.checked = true;
    }
    
    // Apply accent color
    if (settings.accent) {
        const accentRadio = document.querySelector(`input[name="accent"][value="${settings.accent}"]`);
        if (accentRadio) {
            accentRadio.checked = true;
            document.documentElement.style.setProperty('--primary-color', getColorValue(settings.accent));
        }
    }
    
    // Apply font size
    if (settings.fontSize) {
        const fontSizeInput = document.getElementById('fontSize');
        if (fontSizeInput) {
            fontSizeInput.value = settings.fontSize;
            document.documentElement.style.fontSize = settings.fontSize + 'px';
        }
    }
    
    // Apply toggles
    applyToggleSettings(settings);
    
    // Apply profile data
    if (settings.profile) {
        applyProfileData(settings.profile);
    }
    
    // Apply radio groups
    if (settings.profileVisibility) {
        const radio = document.querySelector(`input[name="profileVisibility"][value="${settings.profileVisibility}"]`);
        if (radio) radio.checked = true;
    }
    
    if (settings.noteVisibility) {
        const radio = document.querySelector(`input[name="noteVisibility"][value="${settings.noteVisibility}"]`);
        if (radio) radio.checked = true;
    }
    
    if (settings.downloadQuality) {
        const radio = document.querySelector(`input[name="quality"][value="${settings.downloadQuality}"]`);
        if (radio) radio.checked = true;
    }
}

/**
 * Get color value from color name
 * @param {string} color - Color name
 * @returns {string} - Color hex value
 */
function getColorValue(color) {
    const colors = {
        blue: '#0066ff',
        purple: '#8b5cf6',
        green: '#10b981',
        orange: '#f59e0b',
        red: '#ef4444'
    };
    return colors[color] || colors.blue;
}

/**
 * Apply toggle settings
 * @param {Object} settings - Settings object
 */
function applyToggleSettings(settings) {
    const toggles = document.querySelectorAll('input[type="checkbox"]');
    toggles.forEach(toggle => {
        if (settings[toggle.id] !== undefined) {
            toggle.checked = settings[toggle.id];
            
            // Special handling for quiet hours
            if (toggle.id === 'quietHours') {
                const range = document.getElementById('quietHoursRange');
                if (range) {
                    range.style.display = settings[toggle.id] ? 'flex' : 'none';
                }
            }
        }
    });
}

/**
 * Apply profile data to form
 * @param {Object} profile - Profile data
 */
function applyProfileData(profile) {
    const profileFields = ['fullName', 'email', 'studentId', 'bio', 'linkedin', 'twitter'];
    profileFields.forEach(field => {
        const input = document.getElementById(field);
        if (input && profile[field]) {
            input.value = profile[field];
        }
    });
    
    // Apply selects
    if (profile.gradYear) {
        const gradYear = document.getElementById('gradYear');
        if (gradYear) gradYear.value = profile.gradYear;
    }
    
    if (profile.school) {
        const school = document.getElementById('school');
        if (school) school.value = profile.school;
    }
    
    if (profile.department) {
        const dept = document.getElementById('department');
        if (dept) dept.value = profile.department;
    }
    
    if (profile.yearOfStudy) {
        const year = document.getElementById('yearOfStudy');
        if (year) year.value = profile.yearOfStudy;
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Section navigation
    setupSectionNavigation();
    
    // Save button
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveSettings(false));
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetToDefault);
    }
    
    // Theme change
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });
    
    // Accent color change
    const accentRadios = document.querySelectorAll('input[name="accent"]');
    accentRadios.forEach(radio => {
        radio.addEventListener('change', handleAccentChange);
    });
    
    // Font size change
    const fontSize = document.getElementById('fontSize');
    if (fontSize) {
        fontSize.addEventListener('input', handleFontSizeChange);
    }
    
    // Profile image buttons
    setupProfileImageButtons();
    
    // Quiet hours toggle
    const quietHours = document.getElementById('quietHours');
    if (quietHours) {
        quietHours.addEventListener('change', toggleQuietHours);
    }
    
    // Change download path
    const changePathBtn = document.getElementById('changeDownloadPath');
    if (changePathBtn) {
        changePathBtn.addEventListener('click', () => {
            const newPath = prompt('Enter new download path:', '~/Downloads/Notify Notes');
            if (newPath) {
                document.getElementById('downloadPath').value = newPath;
            }
        });
    }
    
    // Clear cache
    const clearCacheBtn = document.getElementById('clearCache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            if (await friendlyConfirm({ title: 'Clear Cache?', message: 'Are you sure you want to clear all cached files?', confirmText: 'Clear' })) {
                showNotification('Cache cleared successfully', 'success');
            }
        });
    }
    
    // Update password
    const updatePwdBtn = document.getElementById('updatePassword');
    if (updatePwdBtn) {
        updatePwdBtn.addEventListener('click', handlePasswordUpdate);
    }
    
    // Enable 2FA
    const enable2FABtn = document.getElementById('enable2FA');
    if (enable2FABtn) {
        enable2FABtn.addEventListener('click', handle2FA);
    }
    
    // Logout all devices
    const logoutAllBtn = document.getElementById('logoutAll');
    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', async () => {
            if (await friendlyConfirm({ title: 'Logout Devices?', message: 'Are you sure you want to log out from all other devices?', confirmText: 'Logout' })) {
                showNotification('Logged out from all other devices', 'success');
            }
        });
    }
    
    // Deactivate account
    const deactivateBtn = document.getElementById('deactivateAccount');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            if (await friendlyConfirm({ title: 'Deactivate Account?', message: 'Are you sure you want to deactivate your account? You can reactivate later.', confirmText: 'Deactivate' })) {
                showNotification('Account deactivated', 'info');
            }
        });
    }
    
    // Delete account
    const deleteBtn = document.getElementById('deleteAccount');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (await friendlyConfirm({ title: 'Delete Account?', message: 'WARNING: This action is permanent! Your account and data will be permanently deleted.', confirmText: 'Delete', isDanger: true })) {
                showNotification('Account deletion requested', 'error');
            }
        });
    }
    
    // Auto-save on changes
    setupAutoSave();
    
    // Hash change navigation
    window.addEventListener('hashchange', handleHashChange);
}

/**
 * Setup section navigation
 */
function setupSectionNavigation() {
    const links = document.querySelectorAll('#sectionLinks h2');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionId = this.getAttribute('data-section-id');
            if (sectionId) {
                // Update active states
                links.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Load section
                loadSection(sectionId);
            }
        });
    });
}

/**
 * Load a specific section
 * @param {string} sectionId - The ID of the section to show
 */
function loadSection(sectionId) {
    console.log('Loading section:', sectionId);
    
    const sections = document.querySelectorAll('section');
    
    // Hide all sections
    sections.forEach(sect => {
        sect.classList.remove('active', 'animate');
    });

    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        
        // Trigger animation
        setTimeout(() => {
            target.classList.add('animate');
        }, 50);
        
        // Update URL hash without scrolling
        history.pushState(null, null, `#${sectionId}`);
    } else {
        console.warn(`No section found with id: "${sectionId}"`);
    }
}

/**
 * Handle hash change
 */
function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        loadSection(hash);
        
        // Highlight corresponding nav link
        const activeLink = document.querySelector(`#sectionLinks h2[data-section-id="${hash}"]`);
        if (activeLink) {
            document.querySelectorAll('#sectionLinks h2').forEach(l => l.classList.remove('active'));
            activeLink.classList.add('active');
        }
    }
}

/**
 * Handle theme change
 * @param {Event} e - Change event
 */
function handleThemeChange(e) {
    const theme = e.target.value;
    document.body.className = `theme-${theme}`;
    showNotification(`Theme changed to ${theme}`, 'info');
}

/**
 * Handle accent color change
 * @param {Event} e - Change event
 */
function handleAccentChange(e) {
    const color = e.target.value;
    const colorValue = getColorValue(color);
    document.documentElement.style.setProperty('--primary-color', colorValue);
}

/**
 * Handle font size change
 * @param {Event} e - Input event
 */
function handleFontSizeChange(e) {
    const size = e.target.value;
    document.documentElement.style.fontSize = size + 'px';
}

/**
 * Setup profile image buttons
 */
function setupProfileImageButtons() {
    const changeBtn = document.getElementById('changeProfileImage');
    const removeBtn = document.getElementById('removeProfileImage');
    const profileImg = document.getElementById('profileImage');
    
    // Load saved pfp
    const savedPfp = localStorage.getItem('user_pfp');
    if (profileImg && savedPfp) {
        profileImg.src = `${window.API_URL}${savedPfp}`;
    }
    
    if (changeBtn) {
        changeBtn.addEventListener('click', async function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png';
            
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        showNotification('File too large. Max 2MB', 'error');
                        return;
                    }
                    
                    // Upload to server
                    const token = localStorage.getItem('notify_token');
                    if (!token) {
                        showNotification('Please log in again', 'error');
                        return;
                    }
                    const formData = new FormData();
                    formData.append('pfp', file);
                    
                    try {
                        console.log('Uploading PFP to:', `${window.API_URL}/user/pfp`);
                        const res = await fetch(`${window.API_URL}/user/pfp`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                        
                        console.log('PFP response status:', res.status);
                        
                        if (res.ok) {
                            const data = await res.json();
                            console.log('PFP upload success:', data);
                            localStorage.setItem('user_pfp', data.pfp);
                            
                            // Update image display
                            if (profileImg) {
                                profileImg.src = `${window.API_URL}${data.pfp}`;
                            }
                            
                            // Update topbar
                            const topProfileImg = document.getElementById('profileImg');
                            if (topProfileImg) {
                                topProfileImg.src = `${window.API_URL}${data.pfp}`;
                            }
                            
                            showNotification('Profile image updated', 'success');
                        } else if (res.status === 401) {
                            showNotification('Session expired. Please log in again.', 'error');
                        
                        } else {
                            const errorData = await res.json().catch(() => ({}));
                            console.error('PFP upload failed:', res.status, errorData);
                            showNotification('Failed to upload image: ' + (errorData.message || res.status), 'error');
                        }
                    } catch (err) {
                        console.error('PFP upload error:', err);
                        showNotification('Error uploading image', 'error');
                    }
                }
            };
            
            input.click();
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', async function() {
            if (await friendlyConfirm({ title: 'Remove Profile Image?', message: 'Are you sure you want to remove your profile image?', confirmText: 'Remove' })) {
                localStorage.removeItem('user_pfp');
                if (profileImg) {
                    profileImg.src = '../images/dashboardImages/v3321_68.png';
                }
                const topProfileImg = document.getElementById('profileImg');
                if (topProfileImg) {
                    topProfileImg.src = '../images/dashboardImages/v3321_68.png';
                }
                showNotification('Profile image removed', 'info');
            }
        });
    }
}

/**
 * Toggle quiet hours section
 * @param {Event} e - Change event
 */
function toggleQuietHours(e) {
    const range = document.getElementById('quietHoursRange');
    if (range) {
        range.style.display = e.target.checked ? 'flex' : 'none';
    }
}

/**
 * Handle password update
 */
async function handlePasswordUpdate() {
    const current = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (!current || !newPwd || !confirm) {
        showNotification('Please fill all password fields', 'error');
        return;
    }
    
    if (newPwd !== confirm) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPwd.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }
    
    const token = localStorage.getItem('notify_token');
    try {
        const res = await fetch(`${window.API_URL}/user_auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showNotification('Password updated successfully', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification(data.message || 'Failed to update password', 'error');
        }
    } catch (err) {
        showNotification('Error connecting to server', 'error');
    }
}

/**
 * Save profile to server
 */
async function saveProfileToServer() {
    const token = localStorage.getItem('notify_token');
    const name = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const schoolSelect = document.getElementById('school');
    const deptSelect = document.getElementById('department');
    const schoolId = schoolSelect?.value;
    const courseId = deptSelect?.value;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    
    try {
        // Save name and email
        const profileRes = await fetch(`${window.API_URL}/user_auth/update-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email })
        });
        
        const profileData = await profileRes.json();
        
        if (profileRes.ok) {
            // Update local storage
            user.name = name;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', email);
            
            // Update topbar if exists
            const topUserName = document.getElementById('topUserName');
            if (topUserName) topUserName.textContent = name;
        } else {
            showNotification(profileData.message || 'Failed to save profile', 'error');
            return;
        }
        
        // Handle enrollment changes
        if (schoolId && courseId && userId) {
            const enrollRes = await fetch(`${window.API_URL}/users/enrollments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, schoolId, courseId })
            });
            
            const enrollData = await enrollRes.json();
            
            if (enrollRes.ok) {
                showNotification('Profile and enrollment saved successfully', 'success');
                // Refresh the enrollment display
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.id) {
                    loadUserEnrollment(user.id);
                }
            } else {
                showNotification(enrollData.error || 'Failed to update enrollment', 'error');
            }
        } else {
            showNotification('Profile saved successfully', 'success');
        }
    } catch (err) {
        showNotification('Error connecting to server', 'error');
    }
}

/**
 * Handle 2FA toggle
 */
async function handle2FA() {
    const status = document.getElementById('twoFAStatus');
    const isEnabled = status.classList.contains('enabled');
    
    if (isEnabled) {
        if (await friendlyConfirm({ title: 'Disable 2FA?', message: 'Are you sure you want to disable two-factor authentication?', confirmText: 'Disable' })) {
            status.className = 'status-badge disabled';
            status.innerHTML = '<i class="fas fa-times-circle"></i> Disabled';
            showNotification('2FA disabled', 'info');
        }
    } else {
        showNotification('2FA setup guide would appear here', 'info');
    }
}

/**
 * Setup auto-save
 */
function setupAutoSave() {
    const inputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
    let saveTimeout;
    
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveSettings(true);
            }, 2000);
        });
    });
}

/**
 * Save settings to localStorage
 * @param {boolean} silent - Whether to show notification
 */
function saveSettings(silent = false) {
    try {
        const settings = collectSettings();
        localStorage.setItem('notifySettings', JSON.stringify(settings));
        
        // Save profile to server
        saveProfileToServer();
        
        if (!silent) {
            showNotification('Settings saved successfully!', 'success');
        }
        
        console.log('Settings saved:', settings);
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

/**
 * Collect all settings from form
 * @returns {Object} - Collected settings
 */
function collectSettings() {
    const settings = {};
    
    // Get theme
    const themeRadio = document.querySelector('input[name="theme"]:checked');
    if (themeRadio) settings.theme = themeRadio.value;
    
    // Get accent color
    const accentRadio = document.querySelector('input[name="accent"]:checked');
    if (accentRadio) settings.accent = accentRadio.value;
    
    // Get font size
    const fontSize = document.getElementById('fontSize');
    if (fontSize) settings.fontSize = fontSize.value;
    
    // Get all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.id) settings[cb.id] = cb.checked;
    });
    
    // Get profile data
    settings.profile = collectProfileData();
    
    // Get radio groups
    const profileVis = document.querySelector('input[name="profileVisibility"]:checked');
    if (profileVis) settings.profileVisibility = profileVis.value;
    
    const noteVis = document.querySelector('input[name="noteVisibility"]:checked');
    if (noteVis) settings.noteVisibility = noteVis.value;
    
    const quality = document.querySelector('input[name="quality"]:checked');
    if (quality) settings.downloadQuality = quality.value;
    
    // Get selects
    const fileNaming = document.getElementById('fileNaming');
    if (fileNaming) settings.fileNaming = fileNaming.value;
    
    const quietStart = document.getElementById('quietStart');
    if (quietStart) settings.quietStart = quietStart.value;
    
    const quietEnd = document.getElementById('quietEnd');
    if (quietEnd) settings.quietEnd = quietEnd.value;
    
    return settings;
}

/**
 * Collect profile form data
 * @returns {Object} - Profile data
 */
function collectProfileData() {
    const profile = {};
    
    const textInputs = ['fullName', 'email', 'studentId', 'bio', 'linkedin', 'twitter'];
    textInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) profile[id] = input.value;
    });
    
    const selects = ['gradYear', 'school', 'department', 'yearOfStudy'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) profile[id] = select.value;
    });
    
    return profile;
}

/**
 * Reset settings to default
 */
async function resetToDefault() {
    if (await friendlyConfirm({ title: 'Reset Settings?', message: 'Are you sure you want to reset all settings to default?', confirmText: 'Reset' })) {
        localStorage.removeItem('notifySettings');
        window.location.reload();
    }
}

/**
 * Show notification message
 * @param {string} message - Message to show
 * @param {string} type - Type (success, error, info)
 */
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