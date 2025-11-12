// API Configuration
const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
const settingsSheetName = 'settings';

// App State
let currentApp = null;
let currentSubmenu = null;
let menuData = [];
let treasurySettings = [];
let appState = 'main';
let currentMenuSheetName = 'nav-links';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const appsGrid = document.getElementById('apps-grid');
const submenuPopup = document.getElementById('submenu-popup');
const submenuItems = document.getElementById('submenu-items');
const submenuTitle = document.getElementById('submenu-title');
const closeSubmenu = document.getElementById('close-submenu');
const contentPage = document.getElementById('content-page');
const contentArea = document.getElementById('content-area');
const contentTitle = document.getElementById('content-title');
const contentClose = document.getElementById('content-close');
const backBtn = document.getElementById('back-btn');
const appTitle = document.getElementById('app-title');
const userName = document.getElementById('user-name');
const chatIcon = document.getElementById('chat-icon');
const chatPopup = document.getElementById('chat-popup');
const closePopup = document.getElementById('close-popup');
const newsReel = document.getElementById('news-reel');

// Initialize the app
function initApp() {
    const state = history.state;
    if (state && state.page === 'content') {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        currentMenuSheetName = state.menuSheet || 'nav-links';
        loadApps(currentMenuSheetName, function() {
            restoreContentPage(state);
        });
    } else {
        setupEventListeners();
    }
}

// Setup event listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userid').value.trim();
        const password = document.getElementById('password').value.trim();
        
        loginButton.classList.add('loading');
        loginButton.disabled = true;
        const spinner = loginButton.querySelector('.loading-spinner');
        spinner.style.display = 'inline-block';
        loginError.style.display = 'none';
        
        const settingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${settingsSheetName}!A2:F?key=${apiKey}`;
        
        fetch(settingsUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                treasurySettings = data.values || [];
                let loginSuccessful = false;
                let treasuryName = '';
                let userNameValue = '';
                let userRole = '';
                let menuSheetName = 'nav-links';
                
                for (let i = 0; i < treasurySettings.length; i++) {
                    const row = treasurySettings[i];
                    if (row && row.length >= 3 && row[1] === userId && row[2] === password) {
                        loginSuccessful = true;
                        treasuryName = row[0] || 'Treasury';
                        userNameValue = row[1] || userId;
                        userRole = row[3] || 'User';
                        menuSheetName = row[5] || 'nav-links';
                        break;
                    }
                }
                
                if (loginSuccessful) {
                    loginContainer.style.display = 'none';
                    appContainer.style.display = 'flex';
                    userName.textContent = userNameValue;
                    
                    sessionStorage.setItem('treasuryName', treasuryName);
                    sessionStorage.setItem('userName', userNameValue);
                    sessionStorage.setItem('userRole', userRole);
                    
                    currentMenuSheetName = menuSheetName;
                    
                    history.replaceState({
                        page: 'main',
                        menuSheet: menuSheetName
                    }, '', window.location.href);
                    
                    loadApps(menuSheetName);
                    loadNewsReel();
                    // Start background notification check after successful login
                    setTimeout(startBackgroundNotificationCheck, 2000);
                } else {
                    loginError.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (userId && password) {
                    loginContainer.style.display = 'none';
                    appContainer.style.display = 'flex';
                    userName.textContent = userId;
                    
                    currentMenuSheetName = 'nav-links';
                    
                    history.replaceState({
                        page: 'main',
                        menuSheet: 'nav-links'
                    }, '', window.location.href);
                    
                    loadApps('nav-links');
                    loadNewsReel();
                    // Start background notification check after successful login
                    setTimeout(startBackgroundNotificationCheck, 2000);
                } else {
                    loginError.textContent = 'Error connecting to server. Please try again later.';
                    loginError.style.display = 'block';
                }
            })
            .finally(() => {
                loginButton.classList.remove('loading');
                loginButton.disabled = false;
                spinner.style.display = 'none';
            });
    });
    
    closeSubmenu.addEventListener('click', () => {
        submenuPopup.style.display = 'none';
        appState = 'main';
        history.pushState({
            page: 'main'
        }, '', window.location.href);
    });
    
    contentClose.addEventListener('click', () => {
        goBack();
    });
    
    backBtn.addEventListener('click', () => {
        goBack();
    });
    
    window.addEventListener('popstate', function(event) {
        if (event.state) {
            if (event.state.page === 'main') {
                contentPage.classList.remove('active');
                submenuPopup.style.display = 'none';
                backBtn.style.display = 'none';
                appTitle.textContent = 'eAdmin';
                appState = 'main';
            } else if (event.state.page === 'submenu') {
                contentPage.classList.remove('active');
                submenuPopup.style.display = 'flex';
                backBtn.style.display = 'block';
                appTitle.textContent = event.state.menuName;
                appState = 'submenu';
                
                if (event.state.menuName) {
                    const menu = findMenuByName(event.state.menuName);
                    if (menu) {
                        openSubmenu(menu, false);
                    }
                }
            } else if (event.state.page === 'content') {
                restoreContentPage(event.state);
            }
        } else {
            contentPage.classList.remove('active');
            submenuPopup.style.display = 'none';
            backBtn.style.display = 'none';
            appTitle.textContent = 'eAdmin';
            appState = 'main';
        }
    });
    
    chatIcon.addEventListener('click', () => {
        chatPopup.style.display = 'flex';
    });
    
    closePopup.addEventListener('click', () => {
        chatPopup.style.display = 'none';
    });
}

// Load News Reel
function loadNewsReel() {
    const reelSheetName = 'Scroll-reel';
    const reelUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${reelSheetName}?key=${apiKey}`;
    
    fetch(reelUrl)
        .then(response => response.json())
        .then(data => {
            const rows = data.values;
            let runningText = '';

            if (rows && rows.length > 1) {
                rows.slice(1).forEach(row => {
                    if (row[0]) {
                        runningText += row[0] + ' • ';
                    }
                });
            } else {
                runningText = 'Welcome to IT Cell HelpDesk - Your one-stop solution for IT support';
            }

            newsReel.textContent = runningText;
        })
        .catch(error => {
            console.error('Error loading news:', error);
            newsReel.textContent = 'Welcome to IT Cell HelpDesk - Stay connected with latest updates';
        });
}

// Load Apps from Google Sheets
function loadApps(menuSheetName, callback) {
    const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${menuSheetName}!A:H?key=${apiKey}`;
    
    fetch(menuUrl)
        .then(response => response.json())
        .then(data => {
            menuData = data.values || [];
            renderApps();
            if (callback) callback();
        })
        .catch(error => {
            console.error('Error loading menu:', error);
            // Use demo data with notification values
            menuData = [
                ['Main Menu', 'Sub Menu', 'Link', 'Content', 'Icon', '', '5', '3'],
                ['Dashboard', 'Overview', '/overview', '<div class="demo-content"><h3>Dashboard Overview</h3><p>Welcome to your IT HelpDesk dashboard.</p></div>', 'bi bi-speedometer2', '', '2', '1'],
                ['Tickets', 'Create Ticket', '/create', '<div class="demo-content"><h3>Create New Ticket</h3><p>Submit a new support ticket here.</p></div>', 'bi bi-ticket-perforated', '', '5', '2'],
                ['Tickets', 'View Tickets', '/view', '<div class="demo-content"><h3>My Tickets</h3><p>View and manage your support tickets.</p></div>', 'bi bi-ticket-perforated', '', '0', '0'],
                ['Resources', 'Knowledge Base', '/kb', '<div class="demo-content"><h3>Knowledge Base</h3><p>Browse solutions to common problems.</p></div>', 'bi bi-journal-bookmark', '', '1', '4'],
                ['Admin', 'User Management', '/users', '<div class="demo-content"><h3>User Management</h3><p>Manage user accounts and permissions.</p></div>', 'bi bi-people', '', '3', '2']
            ];
            renderApps();
            if (callback) callback();
        });
}

// Render Apps as Tiles with Notification Badges
function renderApps() {
    appsGrid.innerHTML = '';
    
    if (!menuData || menuData.length < 2) {
        appsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px;">No apps available.</div>';
        return;
    }
    
    const mainMenus = {};
    
    // First pass: Create main menu structure and SUM submenu notifications
    menuData.slice(1).forEach(row => {
        if (row && row.length >= 4) {
            const mainMenu = row[0];
            const subMenu = row[1];
            const subMenuLink = row[2];
            const dynamicContent = row[3];
            const iconClass = row[4] || 'bi bi-folder';
            const subBadgeValue = row[7] || '0'; // H column - Submenu notifications
            
            if (!mainMenus[mainMenu]) {
                mainMenus[mainMenu] = {
                    name: mainMenu,
                    icon: iconClass,
                    mainBadge: 0, // Initialize sum as number
                    submenus: []
                };
            }
            
            // SUM submenu notification values for main menu badge
            if (subBadgeValue && subBadgeValue !== '0' && subBadgeValue.trim() !== '') {
                const badgeValue = parseInt(subBadgeValue) || 0;
                mainMenus[mainMenu].mainBadge += badgeValue;
            }
            
            if (subMenu && subMenuLink) {
                mainMenus[mainMenu].submenus.push({
                    name: subMenu,
                    link: subMenuLink,
                    content: dynamicContent,
                    badge: subBadgeValue
                });
            }
        }
    });
    
    console.log('Processed menus with submenu badge sums:', mainMenus);
    
    // Create app tiles with badges
    Object.values(mainMenus).forEach(menu => {
        const appTileWrapper = document.createElement('div');
        appTileWrapper.className = 'app-tile-wrapper';
        appTileWrapper.setAttribute('data-menu', menu.name);
        
        const appTile = document.createElement('div');
        appTile.className = 'app-tile';
        
        const iconClass = menu.icon || 'bi bi-folder';
        
        appTile.innerHTML = `
            <div class="app-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="app-name">${menu.name}</div>
        `;
        
        // Add badge container if sum of submenu notifications is greater than 0
        if (menu.mainBadge > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'badge-container';
            const badge = document.createElement('div');
            badge.className = 'main-menu-badge notification-badge';
            badge.textContent = menu.mainBadge.toString();
            badgeContainer.appendChild(badge);
            appTileWrapper.appendChild(badgeContainer);
            
            console.log(`Added initial badge for ${menu.name}: ${menu.mainBadge} (sum of submenus)`);
        }
        
        appTileWrapper.appendChild(appTile);
        
        appTile.addEventListener('click', () => {
            if (menu.submenus.length > 0) {
                openSubmenu(menu);
            } else {
                contentTitle.textContent = menu.name;
                contentArea.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
                contentPage.classList.add('active');
                backBtn.style.display = 'block';
                appTitle.textContent = menu.name;
                appState = 'content';
                
                history.pushState({
                    page: 'content',
                    menuName: menu.name,
                    submenuName: null,
                    content: null
                }, '', window.location.href);
                
                setTimeout(() => {
                    contentArea.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px;">
                            <i class="fas fa-info-circle" style="font-size: 3rem; color: #6c757d; margin-bottom: 20px;"></i>
                            <h3>No Content Available</h3>
                            <p>This app doesn't have any content yet.</p>
                        </div>
                    `;
                }, 1000);
            }
        });
        
        appsGrid.appendChild(appTileWrapper);
    });
}

// Find menu by name
function findMenuByName(name) {
    const mainMenus = {};
    
    menuData.slice(1).forEach(row => {
        if (row && row.length >= 4) {
            const mainMenu = row[0];
            const subMenu = row[1];
            const subMenuLink = row[2];
            const dynamicContent = row[3];
            const iconClass = row[4] || 'bi bi-folder';
            const subBadgeValue = row[7] || '0'; // H column - Submenu notifications
            
            if (!mainMenus[mainMenu]) {
                mainMenus[mainMenu] = {
                    name: mainMenu,
                    icon: iconClass,
                    mainBadge: 0, // Initialize as number
                    submenus: []
                };
            }
            
            // SUM submenu notification values for main menu badge
            if (subBadgeValue && subBadgeValue !== '0' && subBadgeValue.trim() !== '') {
                const badgeValue = parseInt(subBadgeValue) || 0;
                mainMenus[mainMenu].mainBadge += badgeValue;
            }
            
            if (subMenu && subMenuLink) {
                mainMenus[mainMenu].submenus.push({
                    name: subMenu,
                    link: subMenuLink,
                    content: dynamicContent,
                    badge: subBadgeValue
                });
            }
        }
    });
    
    return mainMenus[name] || null;
}

// Open Submenu with Notification Badges
function openSubmenu(menu, addToHistory = true) {
    currentApp = menu;
    submenuTitle.textContent = menu.name;
    submenuItems.innerHTML = '';
    
    menu.submenus.forEach(submenu => {
        const item = document.createElement('div');
        item.className = 'submenu-item';
        
        let badgeHTML = '';
        if (submenu.badge && submenu.badge !== '0' && submenu.badge.trim() !== '') {
            badgeHTML = `<div class="submenu-badge notification-badge">${submenu.badge}</div>`;
        }
        
        item.innerHTML = `${submenu.name}${badgeHTML}`;
        
        item.addEventListener('click', () => {
            loadContent(submenu);
            submenuPopup.style.display = 'none';
        });
        
        submenuItems.appendChild(item);
    });
    
    submenuPopup.style.display = 'flex';
    appState = 'submenu';
    
    if (addToHistory) {
        history.pushState({
            page: 'submenu',
            menuName: menu.name
        }, '', window.location.href);
    }
}

// Load Content
function loadContent(submenu) {
    currentSubmenu = submenu;
    contentTitle.textContent = `${currentApp.name} / ${submenu.name}`;
    contentArea.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    contentPage.classList.add('active');
    backBtn.style.display = 'block';
    appTitle.textContent = `${currentApp.name} / ${submenu.name}`;
    appState = 'content';
    
    history.pushState({
        page: 'content',
        menuName: currentApp.name,
        submenuName: submenu.name,
        content: submenu.content,
        link: submenu.link
    }, '', window.location.href);
    
    setTimeout(() => {
        if (submenu.content && submenu.content.startsWith('http')) {
            let srcUrl = submenu.content;
            const treasuryName = sessionStorage.getItem('treasuryName');
            if (treasuryName) {
                const urlObj = new URL(srcUrl, window.location.href);
                if (!urlObj.searchParams.has('treasury')) {
                    urlObj.searchParams.append('treasury', treasuryName);
                    srcUrl = urlObj.toString();
                }
            }
            
            contentArea.innerHTML = `
                <iframe src="${srcUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
            `;
        } else if (submenu.content) {
            contentArea.innerHTML = submenu.content;
        } else {
            contentArea.innerHTML = `
                <div class="demo-content">
                    <h3>${submenu.name}</h3>
                    <p>This is the content for ${submenu.name}.</p>
                    <p>Content would be loaded from: ${submenu.link}</p>
                </div>
            `;
        }
    }, 1000);
}

// Restore content page from history state
function restoreContentPage(state) {
    currentApp = findMenuByName(state.menuName);
    
    if (currentApp && state.submenuName) {
        const submenu = currentApp.submenus.find(s => s.name === state.submenuName);
        if (submenu) {
            currentSubmenu = submenu;
            contentTitle.textContent = `${currentApp.name} / ${submenu.name}`;
            contentArea.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
            contentPage.classList.add('active');
            backBtn.style.display = 'block';
            appTitle.textContent = `${currentApp.name} / ${submenu.name}`;
            appState = 'content';
            
            setTimeout(() => {
                if (submenu.content && submenu.content.startsWith('http')) {
                    let srcUrl = submenu.content;
                    const treasuryName = sessionStorage.getItem('treasuryName');
                    if (treasuryName) {
                        const urlObj = new URL(srcUrl, window.location.href);
                        if (!urlObj.searchParams.has('treasury')) {
                            urlObj.searchParams.append('treasury', treasuryName);
                            srcUrl = urlObj.toString();
                        }
                    }
                    
                    contentArea.innerHTML = `
                        <iframe src="${srcUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
                    `;
                } else if (submenu.content) {
                    contentArea.innerHTML = submenu.content;
                } else {
                    contentArea.innerHTML = `
                        <div class="demo-content">
                            <h3>${submenu.name}</h3>
                            <p>This is the content for ${submenu.name}.</p>
                            <p>Content would be loaded from: ${submenu.link}</p>
                        </div>
                    `;
                }
            }, 500);
        }
    }
}

// BACKGROUND NOTIFICATION CHECK
function startBackgroundNotificationCheck() {
    console.log('Starting background notification check...');
    
    // Check immediately first time
    checkAndUpdateNotifications();
    
    // Then check every 30 seconds
    setInterval(checkAndUpdateNotifications, 30000);
}

// Notification check function
function checkAndUpdateNotifications() {
    console.log('Checking for notification updates...');
    
    const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${currentMenuSheetName}!A:H?key=${apiKey}`;
    
    fetch(menuUrl)
        .then(response => response.json())
        .then(data => {
            if (data.values && data.values.length > 1) {
                updateAllBadgesCompletelyFixed(data.values);
            }
        })
        .catch(error => {
            console.error('Error checking notifications:', error);
        });
}

// COMPLETELY FIXED BADGE UPDATE - Sum submenu values for main menu badges
function updateAllBadgesCompletelyFixed(newMenuData) {
    console.log('Completely fixed badge update started...');
    
    // Create a map to SUM all SUBMENU notification values for each main menu
    const menuBadgeSums = new Map();
    
    // Process all rows and SUM SUBMENU notification values (column H) for each main menu
    newMenuData.slice(1).forEach(row => {
        if (row && row.length >= 8) {
            const mainMenu = row[0];
            const subBadgeValue = row[7] || '0'; // H column - Submenu notifications
            
            if (mainMenu && subBadgeValue && subBadgeValue !== '0' && subBadgeValue.trim() !== '') {
                const currentSum = menuBadgeSums.get(mainMenu) || 0;
                const newValue = parseInt(subBadgeValue) || 0;
                menuBadgeSums.set(mainMenu, currentSum + newValue);
            }
        }
    });
    
    console.log('Main menu badge sums (from submenus):', Array.from(menuBadgeSums.entries()));
    
    // Get all app tile wrappers
    const appWrappers = document.querySelectorAll('.app-tile-wrapper');
    console.log('Total app wrappers found:', appWrappers.length);
    
    // Update each wrapper
    appWrappers.forEach(wrapper => {
        const menuName = wrapper.getAttribute('data-menu');
        const badgeSum = menuBadgeSums.get(menuName);
        
        console.log(`Processing: ${menuName} - Badge Sum: ${badgeSum}`);
        
        // Remove existing badge container
        const existingBadgeContainer = wrapper.querySelector('.badge-container');
        if (existingBadgeContainer) {
            existingBadgeContainer.remove();
        }
        
        // Create new badge if sum exists and is greater than 0
        if (badgeSum && badgeSum > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'badge-container';
            
            const badge = document.createElement('div');
            badge.className = 'main-menu-badge notification-badge';
            badge.textContent = badgeSum.toString();
            
            badgeContainer.appendChild(badge);
            wrapper.insertBefore(badgeContainer, wrapper.firstChild);
            
            console.log(`Added/Updated badge for ${menuName}: ${badgeSum}`);
        } else {
            console.log(`No badge for ${menuName} (sum: ${badgeSum})`);
        }
    });
    
    console.log('Completely fixed badge update completed');
}

// Go back function
function goBack() {
    if (appState === 'content') {
        history.back();
    } else if (appState === 'submenu') {
        submenuPopup.style.display = 'none';
        backBtn.style.display = 'none';
        appTitle.textContent = 'eAdmin';
        appState = 'main';
        history.back();
    }
}

// Forgot Password
function openForgotPasswordPopup() {
    const width = 600;
    const height = 500;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    window.open(
        'https://script.google.com/macros/s/AKfycbztfDzKffRaQXd5-_JyYGr_I26_7cXbmCApixAxv6ps/dev',
        'ForgotPasswordPopup',
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,toolbar=no,location=no`
    );
}

// Inactivity Timer
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        window.location.reload(true);
    }, INACTIVITY_TIMEOUT);
}

function setupActivityListeners() {
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('touchmove', resetInactivityTimer);
}

function initInactivityTimer() {
    setupActivityListeners();
    resetInactivityTimer();
}

// Initialize the app when the page loads
window.addEventListener('load', function() {
    initApp();
    initInactivityTimer();
});

document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        resetInactivityTimer();
    }
});
