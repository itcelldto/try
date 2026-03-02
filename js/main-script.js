// Google Sheets configuration
const SPREADSHEET_ID = '1jd1xZe9x2mrZm5KAwGT12vMNYjbrnynsmelNKeK95jc';
const API_KEY = 'AIzaSyBB1V3vJpNZ9X1GIF-YOwoa6YSt_iXMLo0';
const MENU_SHEET = 'Menu';
const ICON_SHEET = 'icons';
const LOGIN_SHEET = 'Login';
const MENU_RANGE = 'A:D';
const ICON_RANGE = 'A:F';
const LOGIN_RANGE = 'B3:C3';

let menuData = [];
let iconData = new Map();
let isAuthenticated = false;

// Theme functions
function initTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.className = savedTheme;
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = savedTheme === 'dark-theme';
    } else {
        document.body.className = prefersDark ? 'dark-theme' : 'light-theme';
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = prefersDark;
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
}

// Show error message in login footer
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('errorMessageText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Hide error message
function hideLoginError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Login validation
async function validateLogin(username, password) {
    try {
        const loginUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${LOGIN_SHEET}!${LOGIN_RANGE}?key=${API_KEY}`;
        const response = await fetch(loginUrl);
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error);
            return false;
        }
        
        if (data.values && data.values[0] && data.values[0].length >= 2) {
            const storedUsername = data.values[0][0];
            const storedPassword = data.values[0][1];
            return username === storedUsername && password === storedPassword;
        }
        
        return false;
    } catch (error) {
        console.error('Login validation error:', error);
        return false;
    }
}

// Login handler
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginText = document.getElementById('loginText');
    const loginOverlay = document.getElementById('loginOverlay');
    
    // Hide any previous error
    hideLoginError();
    
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }
    
    // Show loading state
    loginBtn.disabled = true;
    loginSpinner.classList.remove('d-none');
    loginText.textContent = 'Verifying...';
    
    // Remove focus from inputs
    document.activeElement.blur();
    
    try {
        const isValid = await validateLogin(username, password);
        
        if (isValid) {
            isAuthenticated = true;
            loginOverlay.style.opacity = '0';
            
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                document.getElementById('dashboardContainer').style.display = 'block';
                loadMenuData();
            }, 500);
        } else {
            // Reset button state
            loginBtn.disabled = false;
            loginSpinner.classList.add('d-none');
            loginText.textContent = 'Login';
            
            // Clear password field for security
            document.getElementById('password').value = '';
            
            // Show error message
            showLoginError('Invalid username or password');
            
            // Focus on username field
            document.getElementById('username').focus();
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset button state
        loginBtn.disabled = false;
        loginSpinner.classList.add('d-none');
        loginText.textContent = 'Login';
        
        // Show error message
        showLoginError('Unable to verify credentials. Please try again.');
        
        // Focus on username field
        document.getElementById('username').focus();
    }
}

// Menu data functions
function processIconData(rows) {
    if (!rows || rows.length < 2) return;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 6) continue;
        const [mainMenu, mainIcon, subMenu, subIcon, linkItem, linkIcon] = row;
        if (mainMenu && subMenu && linkItem) {
            const key = `${mainMenu}|${subMenu}|${linkItem}`;
            iconData.set(key, {
                mainIcon: mainIcon || '<i class="bi bi-folder2"></i>',
                subIcon: subIcon || '<i class="bi bi-folder2"></i>',
                linkIcon: linkIcon || '<i class="bi bi-link-45deg"></i>'
            });
            const mainKey = `${mainMenu}||`;
            if (!iconData.has(mainKey)) iconData.set(mainKey, { mainIcon: mainIcon || '<i class="bi bi-grid"></i>' });
            const subKey = `${mainMenu}|${subMenu}|`;
            if (!iconData.has(subKey)) iconData.set(subKey, { subIcon: subIcon || '<i class="bi bi-folder"></i>' });
        }
    }
}

function getIcon(mainMenu, subMenu = '', linkItem = '', level) {
    const key = `${mainMenu}|${subMenu}|${linkItem}`;
    const icons = iconData.get(key);
    if (icons) {
        switch (level) {
            case 'main': return icons.mainIcon || '<i class="bi bi-grid"></i>';
            case 'sub': return icons.subIcon || '<i class="bi bi-folder"></i>';
            case 'link': return icons.linkIcon || '<i class="bi bi-link-45deg"></i>';
        }
    }
    if (level === 'main') {
        const mainKey = `${mainMenu}||`;
        const mainIcons = iconData.get(mainKey);
        if (mainIcons && mainIcons.mainIcon) return mainIcons.mainIcon;
    }
    if (level === 'sub') {
        const subKey = `${mainMenu}|${subMenu}|`;
        const subIcons = iconData.get(subKey);
        if (subIcons && subIcons.subIcon) return subIcons.subIcon;
    }
    switch (level) {
        case 'main': return '<i class="bi bi-grid"></i>';
        case 'sub': return '<i class="bi bi-folder"></i>';
        case 'link': return '<i class="bi bi-link-45deg"></i>';
        default: return '<i class="bi bi-folder2"></i>';
    }
}

function processMenuData(rows) {
    if (!rows || rows.length < 2) return [];
    const menuMap = new Map();
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        const [mainMenu, subMenu, linkItem, url] = row;
        if (!mainMenu || !subMenu || !linkItem || !url) continue;
        if (!menuMap.has(mainMenu)) menuMap.set(mainMenu, new Map());
        const subMenuMap = menuMap.get(mainMenu);
        if (!subMenuMap.has(subMenu)) subMenuMap.set(subMenu, []);
        subMenuMap.get(subMenu).push({
            title: linkItem,
            url: url,
            icon: getIcon(mainMenu, subMenu, linkItem, 'link')
        });
    }
    return Array.from(menuMap.entries()).map(([mainMenu, subMenuMap]) => ({
        title: mainMenu,
        icon: getIcon(mainMenu, '', '', 'main'),
        subMenus: Array.from(subMenuMap.entries()).map(([subMenu, items]) => ({
            title: subMenu,
            icon: getIcon(mainMenu, subMenu, '', 'sub'),
            items: items
        }))
    }));
}

async function fetchSheetData() {
    try {
        const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${MENU_SHEET}!${MENU_RANGE}?key=${API_KEY}`;
        const menuResponse = await fetch(menuUrl);
        const menuData_raw = await menuResponse.json();
        if (menuData_raw.error) throw new Error(menuData_raw.error.message);
        
        const iconUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${ICON_SHEET}!${ICON_RANGE}?key=${API_KEY}`;
        const iconResponse = await fetch(iconUrl);
        const iconData_raw = await iconResponse.json();
        if (!iconData_raw.error) processIconData(iconData_raw.values);
        
        return processMenuData(menuData_raw.values);
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('Error loading menu: ' + error.message);
        return [];
    }
}

async function loadMenuData() {
    try {
        menuData = await fetchSheetData();
        renderMenuCards(menuData, 'desktopSidebar');
        renderMenuCards(menuData, 'mobileSidebar');
        
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) welcomeMsg.style.display = 'block';
        
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    } catch (error) {
        console.error('Error loading menu data:', error);
        showError('Error loading menu data');
    }
}

function showError(message) {
    const desktop = document.getElementById('desktopSidebar');
    const mobile = document.getElementById('mobileSidebar');
    if (desktop) desktop.innerHTML = `<div class="error-message">${message}</div>`;
    if (mobile) mobile.innerHTML = `<div class="error-message">${message}</div>`;
}

function renderMenuCards(menuData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!menuData || menuData.length === 0) {
        container.innerHTML = '<div class="text-muted p-2">No menu items</div>';
        return;
    }
    let html = '';
    menuData.forEach(main => {
        let subHtml = '';
        main.subMenus.forEach(sub => {
            let linksHtml = '';
            sub.items.forEach(link => {
                linksHtml += `<li class="link-item" data-url="${link.url}">${link.icon} ${link.title}</li>`;
            });
            subHtml += `<div class="submenu-block">
                <div class="submenu-title">${sub.icon} ${sub.title}</div>
                <ul class="link-items">${linksHtml}</ul>
            </div>`;
        });
        html += `<div class="menu-card">
            <div class="menu-card-header">${main.icon} ${main.title}</div>
            <div class="menu-card-body">${subHtml}</div>
        </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.link-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const url = el.dataset.url;
            loadUrlInIframe(url);
            if (window.innerWidth < 992) {
                const offcanvasEl = document.getElementById('mobileMenuOffcanvas');
                if (offcanvasEl) {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                    if (bsOffcanvas) bsOffcanvas.hide();
                }
            }
        });
    });
}

function loadUrlInIframe(url) {
    const iframe = document.getElementById('content-frame');
    const loading = document.getElementById('loading');
    const welcomeMessage = document.getElementById('welcome-message');
    
    if (welcomeMessage) welcomeMessage.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    
    let fullUrl = url;
   // if (!url.startsWith('http://') && !url.startsWith('https://')) {
    //    fullUrl = 'https://' + url;
   // }
    
    iframe.onload = function() { 
        if (loading) loading.style.display = 'none'; 
    };
    
    iframe.onerror = function() { 
        if (loading) loading.style.display = 'none'; 
        alert('Error loading page: ' + fullUrl); 
    };
    
    iframe.src = fullUrl;
}

function initDesktopSidebarToggle() {
    const btn = document.getElementById('desktopSidebarToggle');
    const sidebar = document.getElementById('desktopSidebarContainer');
    if (!btn || !sidebar) return;
    btn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    if (username) {
        username.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (password) password.focus();
            }
        });
    }
    
    if (password) {
        password.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
    
    // Clear error when user starts typing
    if (username) {
        username.addEventListener('input', hideLoginError);
    }
    if (password) {
        password.addEventListener('input', hideLoginError);
    }
    
    initDesktopSidebarToggle();
    
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.style.display = 'none';
    
    // Focus on username field initially
    setTimeout(() => {
        if (username) username.focus();
    }, 100);
});

// Iframe load event
const contentFrame = document.getElementById('content-frame');
if (contentFrame) {
    contentFrame.addEventListener('load', function() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    });
}
// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/network/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered successfully with scope:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
