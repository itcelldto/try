// Configuration
const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
const loginPageUrl = 'login.html'; // Your login page URL

// Check if user is logged in (compatible with your current login system)
function checkAuthentication() {
    // Get values from sessionStorage (set by your login page)
    const treasuryName = sessionStorage.getItem('treasuryName');
    const userName = sessionStorage.getItem('userName');
    
    console.log('Checking authentication...');
    console.log('treasuryName:', treasuryName);
    console.log('userName:', userName);
    console.log('All sessionStorage:', JSON.stringify(sessionStorage, null, 2));
    
    // Check if we have required session data
    if (treasuryName && userName) {
        // User is authenticated
        document.getElementById('auth-check').style.display = 'none';
        document.body.style.display = 'block';
        
        // Set a flag to indicate user is authenticated
        sessionStorage.setItem('isAuthenticated', 'true');
        
        // Initialize the dashboard
        initializeDashboard();
        return true;
    } else {
        // Not authenticated
        document.getElementById('auth-message').style.display = 'none';
        document.getElementById('auth-error').style.display = 'block';
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = loginPageUrl;
        }, 3000);
        return false;
    }
}

// Logout function
function logout() {
    // Clear all session data
    sessionStorage.clear();
    localStorage.clear();
    // Redirect to login page
    window.location.href = loginPageUrl;
}

// Get user data from session storage
function getUserData() {
    return {
        treasuryName: sessionStorage.getItem('treasuryName') || 'IT Cell HelpDesk',
        userName: sessionStorage.getItem('userName') || 'Admin User',
        userRole: sessionStorage.getItem('userRole') || 'Administrator',
        menuSheetName: sessionStorage.getItem('menuSheet') || 'nav-links'
    };
}

// Set inactivity timeout to 15 minutes (900,000 milliseconds)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
let inactivityTimer;

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logout, INACTIVITY_TIMEOUT);
}

// Event listeners to detect activity
function setupActivityListeners() {
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('touchmove', resetInactivityTimer);
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
            
            const userData = getUserData();
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
    
    console.log('Initializing dashboard with:', userData);
    
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
}

// Function to load dashboard content
function loadDashboardContent(userData) {
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

// Start authentication check when page loads
$(document).ready(function() {
    // Check authentication immediately
    checkAuthentication();
    
    // Also restart timer when page becomes visible again
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            resetInactivityTimer();
        }
    });
});
