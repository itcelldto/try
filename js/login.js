[file name]: login.js
[file content begin]
// Configuration
const apiKey = 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4';
const sheetId = '11wvVQ2G41ke3g6RdfYX8AJAl0w-fnf2NQ_Agufz0wXY';
const settingsSheetName = 'settings';

// Initialize variables
let currentCaptcha = '';

// Mobile Device Detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768);
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Fix for Firefox PWA scope
        const scope = window.location.pathname.includes('/try/') ? '/try/' : '/';
        navigator.serviceWorker.register('/try/sw.js', { scope: scope })
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.log('Registration failed:', err));
    });
}

// Check if user is already logged in
// IMPORTANT: Also check for authentication token to prevent back button issue
const authToken = sessionStorage.getItem('eadmin_auth_token');
if (sessionStorage.getItem('isLoggedIn') === 'true' && authToken) {
    // Check if session is still valid (less than 15 minutes old)
    const loginTime = sessionStorage.getItem('loginTime');
    if (loginTime) {
        const currentTime = new Date().getTime();
        const sessionAge = currentTime - parseInt(loginTime);
        const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
        
        if (sessionAge < SESSION_TIMEOUT) {
            // Redirect to dashboard if already logged in and session is valid
            window.location.href = "eadmin.html";
        } else {
            // Session expired, clear all data
            sessionStorage.clear();
            localStorage.clear();
        }
    }
}

// Generate CAPTCHA function
function generateCaptcha() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captcha = '';
    const length = 6;
    
    for (let i = 0; i < length; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return captcha;
}

// Display CAPTCHA
function displayCaptcha() {
    currentCaptcha = generateCaptcha();
    document.getElementById('captcha-text').textContent = currentCaptcha;
    sessionStorage.setItem('captcha', currentCaptcha);
    document.getElementById('captcha-input').value = '';
    document.getElementById('captcha-error').style.display = 'none';
}

// Validate CAPTCHA
function validateCaptcha() {
    const userInput = document.getElementById('captcha-input').value.trim().toUpperCase();
    const storedCaptcha = sessionStorage.getItem('captcha') || currentCaptcha;
    
    if (userInput === storedCaptcha) {
        document.getElementById('captcha-error').style.display = 'none';
        return true;
    } else {
        document.getElementById('captcha-error').style.display = 'block';
        displayCaptcha();
        
        // Shake animation
        const captchaContainer = document.getElementById('captcha-section');
        captchaContainer.classList.add('shake');
        setTimeout(() => {
            captchaContainer.classList.remove('shake');
        }, 500);
        
        return false;
    }
}

// Toggle Password Visibility
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
});

// Refresh CAPTCHA
document.getElementById('refresh-captcha').addEventListener('click', function() {
    displayCaptcha();
    
    // Add animation effect
    const captchaDisplay = document.getElementById('captcha-text').parentElement;
    captchaDisplay.style.transform = 'scale(0.9)';
    setTimeout(() => {
        captchaDisplay.style.transform = 'scale(1)';
    }, 150);
});

// CAPTCHA input auto-uppercase
document.getElementById('captcha-input').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

// Fetch data with CORS proxy for Firefox compatibility
async function fetchWithCORS(url) {
    try {
        // First try direct fetch (works in Chrome)
        const directResponse = await fetch(url);
        if (directResponse.ok) {
            return await directResponse.json();
        }
    } catch (directError) {
        console.log('Direct fetch failed, trying CORS proxy:', directError);
    }
    
    // Fallback to CORS proxy for Firefox
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Form Submission
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userid').value.trim();
    const password = document.getElementById('password').value.trim();
    const captchaInput = document.getElementById('captcha-input').value.trim();
    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('error-message-text');
    const captchaError = document.getElementById('captcha-error');
    
    // Reset errors
    errorDiv.style.display = 'none';
    captchaError.style.display = 'none';
    
    // Basic validation
    if (!userId || !password) {
        errorText.textContent = 'Please enter User ID and Password';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Validate CAPTCHA
    if (!validateCaptcha()) {
        return;
    }
    
    // Show loading state
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    
    try {
        // Fetch credentials from Google Sheets with CORS proxy
        const settingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${settingsSheetName}!A2:F?key=${apiKey}`;
        
        const data = await fetchWithCORS(settingsUrl);
        const treasurySettings = data.values || [];
        
        let loginSuccessful = false;
        let treasuryName = '';
        let userName = '';
        let userRole = '';
        let treasuryRow = -1;
        
        // Check each row for matching credentials
        for (let i = 0; i < treasurySettings.length; i++) {
            const row = treasurySettings[i];
            if (row[1] === userId && row[2] === password) {
                loginSuccessful = true;
                treasuryName = row[0] || 'Unknown Treasury';
                userName = row[1] || userId;
                userRole = row[3] || 'User';
                treasuryRow = i;
                break;
            }
        }
        
        if (loginSuccessful) {
            // Store user information
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('treasuryName', treasuryName);
            sessionStorage.setItem('userName', userName);
            sessionStorage.setItem('userRole', userRole);
            sessionStorage.setItem('treasuryRow', treasuryRow);
            sessionStorage.setItem('menuSheet', treasurySettings[treasuryRow][5] || 'nav-links');
            
            // Set login timestamp for session management
            const loginTime = new Date().getTime();
            sessionStorage.setItem('loginTime', loginTime);
            
            // Generate authentication token (MATCHING main.js format)
            const timestamp = loginTime;
            const random = Math.random().toString(36).substring(2);
            const authToken = btoa(`${timestamp}:${random}:${userName}`);
            
            // Store both tokens (compatible with main.js)
            sessionStorage.setItem('eadmin_auth_token', authToken);
            sessionStorage.setItem('eadmin_login_time', timestamp.toString());
            
            // Clear any previous CAPTCHA data
            sessionStorage.removeItem('captcha');
            
            // Show success and redirect to main dashboard
            loginButton.innerHTML = '<i class="bi bi-check-circle me-2"></i> Success!...';
            loginButton.style.background = 'linear-gradient(135deg, #00a65a 0%, #008548 100%)';
            
            setTimeout(() => {
                // Use replaceState to prevent back navigation to login page
                window.history.replaceState(null, '', 'eadmin.html');
                window.location.replace("eadmin.html");
            }, 1000);
            
        } else {
            // Failed login
            errorText.textContent = 'Invalid User ID or Password';
            errorDiv.style.display = 'block';
            displayCaptcha();
            
            // Clear any sensitive data
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('eadmin_auth_token');
            sessionStorage.removeItem('eadmin_login_time');
            
            // Shake animation for form
            const form = document.getElementById('login-form');
            form.classList.add('shake');
            setTimeout(() => {
                form.classList.remove('shake');
            }, 500);
        }
        
    } catch (error) {
        console.error('Error:', error);
        errorText.textContent = 'Error connecting to server. Please try again later.';
        errorDiv.style.display = 'block';
        displayCaptcha();
        
        // Clear any sensitive data on error
        sessionStorage.clear();
        
    } finally {
        // Reset button state
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
        if (!loginButton.innerHTML.includes('Success')) {
            loginButton.innerHTML = '<span class="button-text">Sign In</span><span class="spinner"><i class="bi bi-arrow-repeat"></i></span>';
        }
    }
});

// Forgot Password Popup
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

// Clear any leftover authentication data on page load
window.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for logout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout') || urlParams.has('redirect')) {
        // Clear all session data if coming from logout
        sessionStorage.clear();
        localStorage.clear();
    }
    
    displayCaptcha();
    document.getElementById('userid').focus();
    
    // Auto-focus on CAPTCHA after password
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('captcha-input').focus();
        }
    });
    
    // Auto-submit on CAPTCHA enter
    document.getElementById('captcha-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('login-form').dispatchEvent(new Event('submit'));
        }
    });
    
    // Prevent caching of login page
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was loaded from cache, refresh
            window.location.reload();
        }
    });
    
    // Firefox-specific fixes
    if (typeof InstallTrigger !== 'undefined') {
        // This is Firefox
        console.log('Firefox browser detected, applying specific fixes');
        
        // Add specific Firefox CSS fixes
        const style = document.createElement('style');
        style.textContent = `
            /* Firefox specific fixes */
            @-moz-document url-prefix() {
                .bg-overlay {
                    background: rgba(6, 0, 44, 0.9);
                }
                
                .login-container {
                    background: rgba(255, 255, 255, 0.08);
                }
                
                input.form-control {
                    background-color: #ffffff;
                }
            }
        `;
        document.head.appendChild(style);
    }
});

// Add cache prevention meta tags dynamically
(function() {
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
})();
[file content end]
