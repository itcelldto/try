 
        // API Configuration
        const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
        const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
        const settingsSheetName = 'settings';
        
        // App State
        let currentApp = null;
        let currentSubmenu = null;
        let menuData = [];
        let treasurySettings = [];
        let appState = 'main'; // 'main', 'submenu', 'content'
        
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
            // Check if we're returning to a content page
            const state = history.state;
            if (state && state.page === 'content') {
                // We need to restore the content page
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                
                // Load the apps first
                loadApps(state.menuSheet || 'nav-links', function() {
                    // Then restore the content
                    restoreContentPage(state);
                });
            } else {
                // Normal initialization
                setupEventListeners();
            }
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Login Functionality
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const userId = document.getElementById('userid').value.trim();
                const password = document.getElementById('password').value.trim();
                
                // Show loading state
                loginButton.classList.add('loading');
                loginButton.disabled = true;
                const spinner = loginButton.querySelector('.loading-spinner');
                spinner.style.display = 'inline-block';
                loginError.style.display = 'none';
                
                // Fetch credentials from Google Sheets
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
                        
                        // Check each row for matching credentials
                        for (let i = 0; i < treasurySettings.length; i++) {
                            const row = treasurySettings[i];
                            if (row && row.length >= 3 && row[1] === userId && row[2] === password) {
                                loginSuccessful = true;
                                treasuryName = row[0] || 'Treasury'; // Treasury name
                                userNameValue = row[1] || userId; // User Name
                                userRole = row[3] || 'User'; // User Role
                                menuSheetName = row[5] || 'nav-links'; // Menu sheet name
                                break;
                            }
                        }
                        
                        if (loginSuccessful) {
                            // Successful login
                            loginContainer.style.display = 'none';
                            appContainer.style.display = 'flex';
                            
                            // Update user info
                            userName.textContent = userNameValue;
                            
                            // Store user information
                            sessionStorage.setItem('treasuryName', treasuryName);
                            sessionStorage.setItem('userName', userNameValue);
                            sessionStorage.setItem('userRole', userRole);
                            
                            // Add initial state to history
                            history.replaceState({
                                page: 'main',
                                menuSheet: menuSheetName
                            }, '', window.location.href);
                            
                            // Load apps and news
                            loadApps(menuSheetName);
                            loadNewsReel();
                        } else {
                            // Failed login
                            loginError.style.display = 'block';
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        // For demo purposes, allow login with any credentials
                        if (userId && password) {
                            loginContainer.style.display = 'none';
                            appContainer.style.display = 'flex';
                            userName.textContent = userId;
                            
                            // Add initial state to history
                            history.replaceState({
                                page: 'main',
                                menuSheet: 'nav-links'
                            }, '', window.location.href);
                            
                            loadApps('nav-links');
                            loadNewsReel();
                        } else {
                            loginError.textContent = 'Error connecting to server. Please try again later.';
                            loginError.style.display = 'block';
                        }
                    })
                    .finally(() => {
                        // Reset button state
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                        spinner.style.display = 'none';
                    });
            });
            
            // Close Submenu
            closeSubmenu.addEventListener('click', () => {
                submenuPopup.style.display = 'none';
                appState = 'main';
                
                // Update history
                history.pushState({
                    page: 'main'
                }, '', window.location.href);
            });
            
            // Close Content Page
            contentClose.addEventListener('click', () => {
                goBack();
            });
            
            // Back Button
            backBtn.addEventListener('click', () => {
                goBack();
            });
            
            // Handle browser back button
            window.addEventListener('popstate', function(event) {
                if (event.state) {
                    if (event.state.page === 'main') {
                        // Go back to main screen
                        contentPage.classList.remove('active');
                        submenuPopup.style.display = 'none';
                        backBtn.style.display = 'none';
                        appTitle.textContent = 'eAdmin';
                        appState = 'main';
                    } else if (event.state.page === 'submenu') {
                        // Go back to submenu
                        contentPage.classList.remove('active');
                        submenuPopup.style.display = 'flex';
                        backBtn.style.display = 'block';
                        appTitle.textContent = event.state.menuName;
                        appState = 'submenu';
                        
                        // Restore submenu
                        if (event.state.menuName) {
                            const menu = findMenuByName(event.state.menuName);
                            if (menu) {
                                openSubmenu(menu, false);
                            }
                        }
                    } else if (event.state.page === 'content') {
                        // Go back to content
                        restoreContentPage(event.state);
                    }
                } else {
                    // No state, go to main
                    contentPage.classList.remove('active');
                    submenuPopup.style.display = 'none';
                    backBtn.style.display = 'none';
                    appTitle.textContent = 'eAdmin';
                    appState = 'main';
                }
            });
            
            // Chatbot Functionality
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
                        // Combine all text from column A2:A into a single string
                        rows.slice(1).forEach(row => {
                            if (row[0]) {
                                runningText += row[0] + ' • '; // Add a separator between items
                            }
                        });
                    } else {
                        runningText = 'Welcome to IT Cell HelpDesk - Your one-stop solution for IT support';
                    }

                    // Set the running text content
                    newsReel.textContent = runningText;
                })
                .catch(error => {
                    console.error('Error loading news:', error);
                    newsReel.textContent = 'Welcome to IT Cell HelpDesk - Stay connected with latest updates';
                });
        }
        
        // Load Apps from Google Sheets
        function loadApps(menuSheetName, callback) {
            const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${menuSheetName}?key=${apiKey}`;
            
            fetch(menuUrl)
                .then(response => response.json())
                .then(data => {
                    menuData = data.values || [];
                    renderApps();
                    if (callback) callback();
                })
                .catch(error => {
                    console.error('Error loading menu:', error);
                    // Use demo data if API fails
                    menuData = [
                        ['Main Menu', 'Sub Menu', 'Link', 'Content', 'Icon'],
                        ['Dashboard', 'Overview', '/overview', '<div class="demo-content"><h3>Dashboard Overview</h3><p>Welcome to your IT HelpDesk dashboard.</p></div>', 'bi bi-speedometer2'],
                        ['Tickets', 'Create Ticket', '/create', '<div class="demo-content"><h3>Create New Ticket</h3><p>Submit a new support ticket here.</p></div>', 'bi bi-ticket-perforated'],
                        ['Tickets', 'View Tickets', '/view', '<div class="demo-content"><h3>My Tickets</h3><p>View and manage your support tickets.</p></div>', 'bi bi-ticket-perforated'],
                        ['Resources', 'Knowledge Base', '/kb', '<div class="demo-content"><h3>Knowledge Base</h3><p>Browse solutions to common problems.</p></div>', 'bi bi-journal-bookmark'],
                        ['Admin', 'User Management', '/users', '<div class="demo-content"><h3>User Management</h3><p>Manage user accounts and permissions.</p></div>', 'bi bi-people']
                    ];
                    renderApps();
                    if (callback) callback();
                });
        }
        
        // Render Apps as Tiles
        function renderApps() {
            appsGrid.innerHTML = '';
            
            if (!menuData || menuData.length < 2) {
                appsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px;">No apps available.</div>';
                return;
            }
            
            const mainMenus = {};
            
            // Group by main menu
            menuData.slice(1).forEach(row => {
                if (row && row.length >= 4) {
                    const mainMenu = row[0];
                    const subMenu = row[1];
                    const subMenuLink = row[2];
                    const dynamicContent = row[3];
                    const iconClass = row[4] || 'bi bi-folder'; // Default icon if none provided
                    
                    if (!mainMenus[mainMenu]) {
                        mainMenus[mainMenu] = {
                            name: mainMenu,
                            icon: iconClass,
                            submenus: []
                        };
                    }
                    
                    if (subMenu && subMenuLink) {
                        mainMenus[mainMenu].submenus.push({
                            name: subMenu,
                            link: subMenuLink,
                            content: dynamicContent
                        });
                    }
                }
            });
            
            // Create app tiles
            Object.values(mainMenus).forEach(menu => {
                const appTile = document.createElement('div');
                appTile.className = 'app-tile';
                appTile.setAttribute('data-menu', menu.name);
                
                // Use the icon from the spreadsheet or fallback to default
                const iconClass = menu.icon || 'bi bi-folder';
                
                appTile.innerHTML = `
                    <div class="app-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="app-name">${menu.name}</div>
                `;
                
                appTile.addEventListener('click', () => {
                    if (menu.submenus.length > 0) {
                        openSubmenu(menu);
                    } else {
                        // If no submenus, show a message
                        contentTitle.textContent = menu.name;
                        contentArea.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
                        contentPage.classList.add('active');
                        backBtn.style.display = 'block';
                        appTitle.textContent = menu.name;
                        appState = 'content';
                        
                        // Add to history
                        history.pushState({
                            page: 'content',
                            menuName: menu.name,
                            submenuName: null,
                            content: null
                        }, '', window.location.href);
                        
                        // Simulate loading content
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
                
                appsGrid.appendChild(appTile);
            });
            
            // If no apps were created, show a message
            if (Object.keys(mainMenus).length === 0) {
                appsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px;">No menu items found in the spreadsheet.</div>';
            }
        }
        
        // Find menu by name
        function findMenuByName(name) {
            const mainMenus = {};
            
            // Group by main menu
            menuData.slice(1).forEach(row => {
                if (row && row.length >= 4) {
                    const mainMenu = row[0];
                    const subMenu = row[1];
                    const subMenuLink = row[2];
                    const dynamicContent = row[3];
                    const iconClass = row[4] || 'bi bi-folder';
                    
                    if (!mainMenus[mainMenu]) {
                        mainMenus[mainMenu] = {
                            name: mainMenu,
                            icon: iconClass,
                            submenus: []
                        };
                    }
                    
                    if (subMenu && subMenuLink) {
                        mainMenus[mainMenu].submenus.push({
                            name: subMenu,
                            link: subMenuLink,
                            content: dynamicContent
                        });
                    }
                }
            });
            
            return mainMenus[name] || null;
        }
        
        // Open Submenu
        function openSubmenu(menu, addToHistory = true) {
            currentApp = menu;
            submenuTitle.textContent = menu.name;
            submenuItems.innerHTML = '';
            
            menu.submenus.forEach(submenu => {
                const item = document.createElement('div');
                item.className = 'submenu-item';
                item.textContent = submenu.name;
                item.addEventListener('click', () => {
                    loadContent(submenu);
                    submenuPopup.style.display = 'none';
                });
                submenuItems.appendChild(item);
            });
            
            submenuPopup.style.display = 'flex';
            appState = 'submenu';
            
            if (addToHistory) {
                // Add to history
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
            
            // Add to history
            history.pushState({
                page: 'content',
                menuName: currentApp.name,
                submenuName: submenu.name,
                content: submenu.content,
                link: submenu.link
            }, '', window.location.href);
            
            // Simulate loading content
            setTimeout(() => {
                if (submenu.content && submenu.content.startsWith('http')) {
                    // If content is a URL, create an iframe
                    let srcUrl = submenu.content;
                    
                    // Append treasury name as query parameter if it's not already there
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
                // Find the submenu
                const submenu = currentApp.submenus.find(s => s.name === state.submenuName);
                if (submenu) {
                    currentSubmenu = submenu;
                    contentTitle.textContent = `${currentApp.name} / ${submenu.name}`;
                    contentArea.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
                    contentPage.classList.add('active');
                    backBtn.style.display = 'block';
                    appTitle.textContent = `${currentApp.name} / ${submenu.name}`;
                    appState = 'content';
                    
                    // Load content
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
        
        // Go back function
        function goBack() {
            if (appState === 'content') {
                // Go back to submenu or main
                history.back();
            } else if (appState === 'submenu') {
                // Go back to main
                submenuPopup.style.display = 'none';
                backBtn.style.display = 'none';
                appTitle.textContent = 'eAdmin';
                appState = 'main';
                
                // Update history
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
        
        // Inactivity Timer (15 minutes)
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
    
