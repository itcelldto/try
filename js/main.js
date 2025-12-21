// Configuration
const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
const loginPageUrl = 'login.html'; // Your login page URL

// Authentication variables
let isAuthenticated = false;
const AUTH_KEY = 'eadmin_auth_token';
const LOGIN_TIME_KEY = 'eadmin_login_time';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

// Generate authentication token
function generateAuthToken() {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2);
    const userName = sessionStorage.getItem('userName') || 'anonymous';
    const token = btoa(`${timestamp}:${random}:${userName}`);
    sessionStorage.setItem(AUTH_KEY, token);
    sessionStorage.setItem(LOGIN_TIME_KEY, timestamp.toString());
    return token;
}

// Validate authentication token
function validateAuthToken() {
    const token = sessionStorage.getItem(AUTH_KEY);
    const loginTime = sessionStorage.getItem(LOGIN_TIME_KEY);
    
    if (!token || !loginTime) {
        return false;
    }
    
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length !== 3) return false;
        
        const tokenTimestamp = parseInt(parts[0]);
        const storedLoginTime = parseInt(loginTime);
        
        // Check if session has expired (15 minutes)
        const currentTime = new Date().getTime();
        if (currentTime - storedLoginTime > SESSION_TIMEOUT) {
            console.log('Session expired due to timeout');
            sessionStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem(LOGIN_TIME_KEY);
            return false;
        }
        
        // Refresh login time on successful validation
        sessionStorage.setItem(LOGIN_TIME_KEY, currentTime.toString());
        return true;
    } catch (e) {
        console.error('Error validating auth token:', e);
        return false;
    }
}

// Enhanced checkAuthentication function
function checkAuthentication() {
    // Check for authentication token first
    const authTokenValid = validateAuthToken();
    
    // Get values from sessionStorage
    const treasuryName = sessionStorage.getItem('treasuryName');
    const userName = sessionStorage.getItem('userName');
    
    console.log('Checking authentication...');
    console.log('treasuryName:', treasuryName);
    console.log('userName:', userName);
    console.log('Auth token valid:', authTokenValid);
    
    // Check if we have required session data AND valid auth token
    if (treasuryName && userName && authTokenValid) {
        // User is authenticated
        document.getElementById('auth-check').style.display = 'none';
        document.body.style.display = 'block';
        
        isAuthenticated = true;
        
        // Initialize the dashboard
        initializeDashboard();
        return true;
    } else {
        // Not authenticated - clear any existing auth data
        clearAllAuthData();
        
        document.getElementById('auth-message').style.display = 'none';
        document.getElementById('auth-error').style.display = 'block';
        
        // Redirect to login after 1 second
        setTimeout(() => {
            // Add cache-busting parameter
            const timestamp = new Date().getTime();
            window.location.href = `${loginPageUrl}?redirect=${timestamp}`;
        }, 1000);
        return false;
    }
}

// Clear all authentication data
function clearAllAuthData() {
    sessionStorage.removeItem('treasuryName');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('treasuryRow');
    sessionStorage.removeItem('menuSheet');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(LOGIN_TIME_KEY);
    
    // Clear related localStorage items
    localStorage.removeItem('treasuryName');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    
    isAuthenticated = false;
}

// Enhanced logout function
function logout() {
    console.log('Logging out...');
    clearAllAuthData();
    
    // Redirect to login page with cache-busting parameter
    const timestamp = new Date().getTime();
    window.location.replace(`${loginPageUrl}?logout=${timestamp}&nocache=${timestamp}`);
}

// Get user data from session storage
function getUserData() {
    // Always validate token before returning user data
    if (!validateAuthToken()) {
        console.log('Auth token invalid, logging out...');
        logout();
        return null;
    }
    
    return {
        treasuryName: sessionStorage.getItem('treasuryName') || 'IT Cell HelpDesk',
        userName: sessionStorage.getItem('userName') || 'Admin User',
        userRole: sessionStorage.getItem('userRole') || 'Administrator',
        menuSheetName: sessionStorage.getItem('menuSheet') || 'nav-links'
    };
}

// Set inactivity timeout to 15 minutes (900,000 milliseconds)
const INACTIVITY_TIMEOUT = SESSION_TIMEOUT;
let inactivityTimer;

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logout, INACTIVITY_TIMEOUT);
}

// Event listeners to detect activity
function setupActivityListeners() {
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart', 'touchmove'];
    
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });
}

// Initialize the timer and event listeners
function initInactivityTimer() {
    setupActivityListeners();
    resetInactivityTimer();
}

// Update date and time function
function updateDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateString = `${day}-${month}-${year}`;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

    const dateTimeString = `${dateString} ${timeString}`;
    document.getElementById('current-date-time').textContent = dateTimeString;
}

// Function to load dynamic content
function loadDynamicContent(content) {
    // Always validate authentication before loading content
    if (!validateAuthToken()) {
        console.log('Authentication failed while loading content');
        logout();
        return;
    }
    
    const userData = getUserData();
    if (!userData) {
        logout();
        return;
    }
    
    const contentArea = $('#dynamic-content');
    $('#loading-spinner').removeClass('hidden');
    
    if (content) {
        contentArea.empty();
        
        if (content.startsWith('<iframe') || content.includes('src="')) {
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = 'calc(100vh - 1px)';
            iframe.style.border = 'none';
            
            let srcUrl;
            if (content.startsWith('http')) {
                srcUrl = content;
            } else {
                const srcMatch = content.match(/src="([^"]*)"/);
                srcUrl = srcMatch ? srcMatch[1] : '';
            }
            
            if (userData.treasuryName) {
                const urlObj = new URL(srcUrl, window.location.href);
                if (!urlObj.searchParams.has('treasury')) {
                    urlObj.searchParams.append('treasury', userData.treasuryName);
                    srcUrl = urlObj.toString();
                }
            }
            
            iframe.src = srcUrl;
            contentArea.append(iframe);
        } else {
            contentArea.html(content);
            contentArea.find('script').each(function() {
                try {
                    eval($(this).text());
                } catch (error) {
                    console.error('Error executing script:', error);
                }
            });
        }
        
        $('#loading-spinner').addClass('hidden');
    } else {
        contentArea.html('<div class="alert alert-info">No content available for this item.</div>');
        $('#loading-spinner').addClass('hidden');
    }
}

// Initialize dashboard
function initializeDashboard() {
    const userData = getUserData();
    if (!userData) {
        logout();
        return;
    }
    
    console.log('Initializing dashboard with:', userData);
    
    // Generate or refresh auth token
    generateAuthToken();
    
    // Display user information
    $('#treasury-name-display').text(userData.treasuryName);
    $('#session-storage-value').text(userData.userName);
    $('#user-name-display').text(userData.treasuryName);
    $('#user-role-display').text(userData.userRole);
    
    // Start date/time updates
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Start inactivity timer
    initInactivityTimer();
    
    // Load menu and initial content
    loadDashboardContent(userData);
    
    // Initialize chatbot
    initializeChatbot();
    
    // Add beforeunload event to prevent caching
    window.addEventListener('beforeunload', function() {
        if (!isAuthenticated) {
            clearAllAuthData();
        }
    });
}

// Function to load dashboard content
function loadDashboardContent(userData) {
    // Validate authentication first
    if (!validateAuthToken()) {
        logout();
        return;
    }
    
    // Fetch data for the running text
    const reelSheetName = 'Scroll-reel';
    const reelUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${reelSheetName}?key=${apiKey}`;

    $.get(reelUrl, function(data) {
        const rows = data.values;
        let runningText = '';

        if (rows && rows.length > 1) {
            rows.slice(1).forEach(row => {
                if (row[0]) {
                    runningText += row[0] + ' • ';
                }
            });
        }

        $('#news-reel').text(runningText || 'Welcome to IT Cell HelpDesk Dashboard');
    }).fail(function() {
        console.log('Could not load running text');
        $('#news-reel').text('Welcome to IT Cell HelpDesk Dashboard');
    });

    // Fetch and populate the sidebar menu
    const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${userData.menuSheetName}?key=${apiKey}`;

    fetch(menuUrl)
        .then(response => response.json())
        .then(data => {
            const rows = data.values;
            let currentMainMenu = '';
            let mainMenuLi = null;
            let subMenuUl = null;
            let firstSubmenuItem = null;

            if (rows && rows.length > 1) {
                rows.slice(1).forEach((row, index) => {
                    const mainMenu = row[0];
                    const subMenu = row[1];
                    const subMenuLink = row[2];
                    const dynamicContent = row[3];
                    const mainMenuIcon = row[4] || 'bi bi-folder';
                    const subMenuIcon = row[5] || 'bi bi-circle';

                    if (mainMenu !== currentMainMenu) {
                        currentMainMenu = mainMenu;
                        mainMenuLi = $('<li>').addClass('nav-item has-treeview');
                        subMenuUl = $('<ul>').addClass('nav nav-treeview');

                        const mainMenuLink = $('<a>')
                            .addClass('nav-link')
                            .append($('<i>').addClass('nav-icon ' + mainMenuIcon))
                            .append('<p>' + mainMenu + '<i class="right fas fa-angle-left"></i></p>')
                            .click(function(e) {
                                e.preventDefault();
                                $('.nav-item.has-treeview').not(mainMenuLi).removeClass('menu-open');
                                mainMenuLi.toggleClass('menu-open');
                            });

                        mainMenuLi.append(mainMenuLink);
                        mainMenuLi.append(subMenuUl);
                        $('#sidebar-menu').append(mainMenuLi);
                    }

                    if (subMenu && subMenuLink) {
                        const subMenuLi = $('<li>').addClass('nav-item').append(
                            $('<a>').addClass('nav-link').attr('href', '#').append(
                                $('<i>').addClass('nav-icon ' + subMenuIcon)
                            ).append('<p>' + subMenu + '</p>').click(function(e) {
                                e.preventDefault();
                                loadDynamicContent(dynamicContent);
                            })
                        );
                        subMenuUl.append(subMenuLi);
                        
                        if (!firstSubmenuItem && dynamicContent) {
                            firstSubmenuItem = dynamicContent;
                        }
                    }
                });
            } else {
                // If no menu data, show default message
                $('#sidebar-menu').html(`
                    <li class="nav-item">
                        <a href="#" class="nav-link">
                            <i class="nav-icon bi bi-info-circle"></i>
                            <p>No menu available</p>
                        </a>
                    </li>
                `);
            }
            
            // Initialize treeview
            $('[data-widget="treeview"]').Treeview('init');
            $('#loading-spinner').addClass('hidden');
            
            // Load first item's content automatically
            if (firstSubmenuItem) {
                loadDynamicContent(firstSubmenuItem);
            } else {
                $('#dynamic-content').html(`
                    <div style="padding: 20px;">
                        <div class="alert alert-info">
                            <h4><i class="icon fas fa-info"></i> Welcome to IT Cell HelpDesk Dashboard!</h4>
                            <p>Select a menu item from the sidebar to view content.</p>
                            <p><strong>Treasury:</strong> ${userData.treasuryName}</p>
                            <p><strong>User:</strong> ${userData.userName} (${userData.userRole})</p>
                        </div>
                    </div>
                `);
            }
        })
        .catch(error => {
            console.error('Error loading menu:', error);
            $('#dynamic-content').html(`
                <div style="padding: 20px;">
                    <div class="alert alert-warning">
                        <h4><i class="icon fas fa-exclamation-triangle"></i> Menu Loading Error</h4>
                        <p>Failed to load menu. Please try again later.</p>
                        <p>Error: ${error.message}</p>
                        <button onclick="window.location.reload()" class="btn btn-primary mt-2">Retry</button>
                    </div>
                </div>
            `);
            $('#loading-spinner').addClass('hidden');
        });
}

// Chatbot functionality
function initializeChatbot() {
    const chatIcon = document.getElementById('chatIcon');
    const chatPopup = document.getElementById('chatPopup');
    const closePopup = document.getElementById('closePopup');
    const overlay = document.getElementById('overlay');
    
    if (!chatIcon || !chatPopup) return;
    
    chatIcon.addEventListener('click', function() {
        if (!validateAuthToken()) {
            logout();
            return;
        }
        chatPopup.style.display = 'flex';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    closePopup.addEventListener('click', function() {
        chatPopup.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    overlay.addEventListener('click', function() {
        chatPopup.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            chatPopup.style.display = 'none';
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
    console.log('Browser navigation detected, checking authentication...');
    if (!validateAuthToken()) {
        logout();
    }
});

// Handle page load from cache (bfcache)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Page loaded from browser cache, validating authentication...');
        if (!validateAuthToken()) {
            logout();
        }
    }
});

// Prevent page caching
function disablePageCaching() {
    // Add no-cache headers
    const metaTags = [
        { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
        { httpEquiv: 'Pragma', content: 'no-cache' },
        { httpEquiv: 'Expires', content: '0' }
    ];
    
    metaTags.forEach(tag => {
        let meta = document.querySelector(`meta[http-equiv="${tag.httpEquiv}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.httpEquiv = tag.httpEquiv;
            document.head.appendChild(meta);
        }
        meta.content = tag.content;
    });
}

// Start authentication check when page loads
$(document).ready(function() {
    // Disable page caching
    disablePageCaching();
    
    // Check URL parameters for logout or redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
        console.log('Logout parameter detected, clearing auth data');
        clearAllAuthData();
    }
    
    // Check authentication immediately
    checkAuthentication();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page became visible, checking authentication...');
            if (!validateAuthToken()) {
                logout();
            } else {
                resetInactivityTimer();
            }
        }
    });
    
    // Add periodic authentication check (every 30 seconds)
    setInterval(function() {
        if (!validateAuthToken()) {
            console.log('Periodic authentication check failed');
            logout();
        }
    }, 30000);
    
    // Replace history state to prevent back navigation to cached page
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.href);
    }
});
