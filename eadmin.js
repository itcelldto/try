
        // Chatbot functionality
        document.addEventListener('DOMContentLoaded', function() {
            const chatIcon = document.getElementById('chatIcon');
            const chatPopup = document.getElementById('chatPopup');
            const closePopup = document.getElementById('closePopup');
            const overlay = document.getElementById('overlay');
            
            // Open popup when chat icon is clicked
            chatIcon.addEventListener('click', function() {
                chatPopup.style.display = 'flex';
                overlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
            
            // Close popup when X button is clicked
            closePopup.addEventListener('click', function() {
                chatPopup.style.display = 'none';
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
            
            // Close popup when clicking outside
            overlay.addEventListener('click', function() {
                chatPopup.style.display = 'none';
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
            
            // Close popup when pressing Escape key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    chatPopup.style.display = 'none';
                    overlay.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        });

        // Set inactivity timeout to 15 minutes (900,000 milliseconds)
        const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
        let inactivityTimer;

        // Function to reset the inactivity timer
        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(reloadPage, INACTIVITY_TIMEOUT);
        }

        // Function to reload the page
        function reloadPage() {
            window.location.reload(true); // Force reload from server
        }

        // Event listeners to detect activity
        function setupActivityListeners() {
            // Mouse movement
            document.addEventListener('mousemove', resetInactivityTimer);
            // Mouse clicks
            document.addEventListener('click', resetInactivityTimer);
            // Keyboard input
            document.addEventListener('keydown', resetInactivityTimer);
            // Touch events for mobile
            document.addEventListener('touchstart', resetInactivityTimer);
            document.addEventListener('touchmove', resetInactivityTimer);
        }

        // Initialize the timer and event listeners
        function initInactivityTimer() {
            setupActivityListeners();
            resetInactivityTimer(); // Start the initial timer
        }

        // Start the inactivity monitoring when page loads
        window.addEventListener('load', initInactivityTimer);

        // Also restart timer when page becomes visible again
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                resetInactivityTimer();
            }
        });

        // Update date and time function
        function updateDateTime() {
            const now = new Date();

            // Format date as dd-mm-yyyy
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateString = `${day}-${month}-${year}`;

            // Format time in 12-hour base with AM/PM
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

            // Combine date and time
            const dateTimeString = `${dateString} ${timeString}`;

            // Update the date and time in the navbar
            document.getElementById('current-date-time').textContent = dateTimeString;
        }

        // Function to load dynamic content
        function loadDynamicContent(content) {
            const contentArea = $('#dynamic-content');
            $('#loading-spinner').removeClass('hidden');
            
            if (content) {
                // First empty the content area
                contentArea.empty();
                
                // Check if content is an iframe URL
                if (content.startsWith('<iframe') || content.includes('src="')) {
                    // Create iframe element
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = 'calc(100vh - 1px)';
                    iframe.style.border = 'none';
                    
                    // Set src attribute - extract URL from content if needed
                    let srcUrl;
                    if (content.startsWith('http')) {
                        srcUrl = content;
                    } else {
                        // Extract URL from iframe HTML string
                        const srcMatch = content.match(/src="([^"]*)"/);
                        srcUrl = srcMatch ? srcMatch[1] : '';
                    }
                    
                    // Append treasury name as query parameter if it's not already there
                    const treasuryName = sessionStorage.getItem('treasuryName');
                    if (treasuryName) {
                        const urlObj = new URL(srcUrl, window.location.href);
                        if (!urlObj.searchParams.has('treasury')) {
                            urlObj.searchParams.append('treasury', treasuryName);
                            srcUrl = urlObj.toString();
                        }
                    }
                    
                    iframe.src = srcUrl;
                    contentArea.append(iframe);
                } else {
                    // Regular content handling
                    contentArea.html(content);
                    
                    // Execute any scripts in the content
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

        // Login functionality
        $(document).ready(function() {
            const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
            const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
            const settingsSheetName = 'settings';
            
            // Current step in forgot password process
            let currentStep = 1;
            let otp = '';
            let treasuryRow = -1;
            let treasurySettings = [];
            
            // Handle login form submission
            $('#login-form').submit(function(e) {
                e.preventDefault();
                
                // Get button and disable it
                const loginButton = $('#login-button');
                loginButton.prop('disabled', true);
                loginButton.addClass('loading');
                
                const userId = $('#userid').val().trim();
                const password = $('#password').val().trim();
                
                // Show loading state
                $('#login-error').hide();
                
                // Fetch credentials
                const settingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${settingsSheetName}!A2:F?key=${apiKey}`;
                
                fetch(settingsUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        treasurySettings = data.values;
                        let loginSuccessful = false;
                        let treasuryName = '';
                        let userName = '';
                        let userRole = '';
                        
                        // Check each row for matching credentials
                        for (let i = 0; i < treasurySettings.length; i++) {
                            const row = treasurySettings[i];
                            if (row[1] === userId && row[2] === password) {
                                loginSuccessful = true;
                                treasuryName = row[0]; // A column - Treasury name
                                userName = row[1] || userId; // D column - User Name
                                userRole = row[3] || UserRole; // E column - User Role
                                treasuryRow = i; // Store the row index for later use
                                break;
                            }
                        }
                        
                        if (loginSuccessful) {
                            // Successful login
                            $('#login-error').hide();
                            $('#login-overlay').hide();
                            
                            // Display treasury name in sidebar
                            $('#treasury-name-display').text(treasuryName);
                            
                            // Store user information in session storage
                            sessionStorage.setItem('treasuryName', treasuryName);
                            sessionStorage.setItem('userName', userName);
                            sessionStorage.setItem('userRole', userRole);
                            
                            // Update user display in navbar
                            $('#session-storage-value').text(userName);
                            $('#user-name-display').text(treasuryName);
                            $('#user-role-display').text(userRole);
                            
                            // Show the main content wrapper
                            $('#main-wrapper').show();
                            
                            // Initialize the main application with the menu sheet name from column F
                            initializeApplication(treasurySettings[treasuryRow][5] || 'nav-links');
                        } else {
                            // Failed login
                            $('#login-error').text('Invalid User ID or Password').show();
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        $('#login-error').text('Error connecting to server. Please try again later.').show();
                    })
                    .finally(() => {
                        // Re-enable button
                        loginButton.prop('disabled', false);
                        loginButton.removeClass('loading');
                    });
            });
            
            // Function to initialize the application after successful login
            function initializeApplication(menuSheetName) {
                // Start updating date and time
                updateDateTime();
                setInterval(updateDateTime, 1000);
                
                // Fetch data for the sidebar menu
                const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${menuSheetName}?key=${apiKey}`;

                // Fetch data for the running text
                const reelSheetName = 'Scroll-reel';
                const reelUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${reelSheetName}?key=${apiKey}`;

                // Fetch and populate the running text
                $.get(reelUrl, function(data) {
                    const rows = data.values;
                    let runningText = '';

                    // Combine all text from column A2:A into a single string
                    rows.slice(1).forEach(row => {
                        if (row[0]) {
                            runningText += row[0] + ' • '; // Add a separator between items
                        }
                    });

                    // Set the running text content
                    $('#news-reel').text(runningText);
                });

                // Fetch and populate the sidebar menu with Bootstrap Icons
                fetch(menuUrl)
                    .then(response => response.json())
                    .then(data => {
                        const rows = data.values;
                        let currentMainMenu = '';
                        let mainMenuLi = null;
                        let subMenuUl = null;
                        let firstSubmenuItem = null;

                        rows.slice(1).forEach((row, index) => {
                            const mainMenu = row[0];
                            const subMenu = row[1];
                            const subMenuLink = row[2];
                            const dynamicContent = row[3]; // Content from column D
                            const mainMenuIcon = row[4] || 'bi bi-folder'; // Column E - Main menu icon (default: folder)
                            const subMenuIcon = row[5] || 'bi bi-circle'; // Column F - Submenu icon (default: circle)

                            if (mainMenu !== currentMainMenu) {
                                currentMainMenu = mainMenu;
                                mainMenuLi = $('<li>').addClass('nav-item has-treeview');
                                subMenuUl = $('<ul>').addClass('nav nav-treeview');

                                // Add main menu item with Bootstrap Icon
                                const mainMenuLink = $('<a>')
                                    .addClass('nav-link')
                                    .append($('<i>').addClass('nav-icon ' + mainMenuIcon))
                                    .append('<p>' + mainMenu + '<i class="right fas fa-angle-left"></i></p>')
                                    .click(function(e) {
                                        e.preventDefault();
                                        // Close other open menus
                                        $('.nav-item.has-treeview').not(mainMenuLi).removeClass('menu-open');
                                        // Toggle current menu
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
                                
                                // Store the first submenu item to load its content automatically
                                if (!firstSubmenuItem && dynamicContent) {
                                    firstSubmenuItem = dynamicContent;
                                }
                            }
                        });
                        
                        // Initialize the treeview after adding new elements
                        $('[data-widget="treeview"]').Treeview('init');
                        $('#loading-spinner').addClass('hidden');
                        
                        // Load the first submenu item's content automatically
                        if (firstSubmenuItem) {
                            loadDynamicContent(firstSubmenuItem);
                        } else {
                            $('#dynamic-content').html('<div class="alert alert-info">Select a menu item to view content</div>');
                        }
                    })
                    .catch(error => {
                        console.error('Error loading menu:', error);
                        $('#dynamic-content').html('<div class="alert alert-danger">Failed to load menu. Please try again later.</div>');
                        $('#loading-spinner').addClass('hidden');
                    });
            }
        });
        
        function openForgotPasswordPopup() {
            // Set your desired popup dimensions
            const width = 600;
            const height = 500;
            
            // Calculate centered position
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            
            // Open popup window
            window.open(
                'https://script.google.com/macros/s/AKfycbztfDzKffRaQXd5-_JyYGr_I26_7cXbmCApixAxv6ps/dev',
                'ForgotPasswordPopup',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,toolbar=no,location=no`
            );
        }
    
