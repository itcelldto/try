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
        navigator.serviceWorker.register('/try/sw.js', { scope: '/try/' })
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Registration failed:', err));
    });
}

// Check if user is already logged in
if (sessionStorage.getItem('isLoggedIn') === 'true') {
    // Redirect to dashboard if already logged in
    window.location.href = "eadmin.html";
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
        // Fetch credentials from Google Sheets
        const settingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${settingsSheetName}!A2:F?key=${apiKey}`;
        
        const response = await fetch(settingsUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
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
            sessionStorage.setItem('loginTime', new Date().getTime());
            
            // Show success and redirect to main dashboard
            loginButton.innerHTML = '<i class="bi bi-check-circle me-2"></i> Success!...';
            loginButton.style.background = 'linear-gradient(135deg, #00a65a 0%, #008548 100%)';
            
            setTimeout(() => {
                // Redirect to your main dashboard HTML file
                window.location.href = "eadmin.html"; // Your main dashboard file
            }, 1000);
            
        } else {
            // Failed login
            errorText.textContent = 'Invalid User ID or Password';
            errorDiv.style.display = 'block';
            displayCaptcha();
            
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

// Initialize CAPTCHA on page load
window.addEventListener('DOMContentLoaded', () => {
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
});
