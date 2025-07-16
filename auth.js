// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isGuest = false;
        this.users = this.loadUsers();
        this.setupEventListeners();
    }

    loadUsers() {
        return JSON.parse(localStorage.getItem('mtg_users') || '[]');
    }

    saveUsers() {
        localStorage.setItem('mtg_users', JSON.stringify(this.users));
    }

    setupEventListeners() {
        // Form switching
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('register');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        document.getElementById('continue-guest').addEventListener('click', (e) => {
            e.preventDefault();
            this.loginAsGuest();
        });

        document.getElementById('continue-guest-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.loginAsGuest();
        });

        document.getElementById('confirm-guest').addEventListener('click', () => {
            this.loginAsGuest();
        });

        document.getElementById('cancel-guest').addEventListener('click', () => {
            this.showForm('login');
        });

        // Form submissions
        document.getElementById('login-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        document.getElementById('register-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e);
        });

        // Real-time validation
        document.getElementById('register-username').addEventListener('input', (e) => {
            this.validateUsername(e.target);
        });

        document.getElementById('register-password').addEventListener('input', (e) => {
            this.validatePassword(e.target);
        });

        document.getElementById('register-confirm-password').addEventListener('input', (e) => {
            this.validateConfirmPassword(e.target);
        });
    }

    showForm(formType) {
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${formType}-form`).classList.add('active');
        this.clearErrors();
    }

    clearErrors() {
        document.querySelectorAll('.auth-error').forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
        document.querySelectorAll('input').forEach(input => {
            input.classList.remove('error', 'success');
        });
    }

    showError(formType, message) {
        const errorElement = document.getElementById(`${formType}-error`);
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    validateUsername(input) {
        const username = input.value.trim();
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        
        if (username.length < 3) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        } else if (!usernameRegex.test(username)) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        } else if (this.users.some(user => user.username === username)) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        } else {
            input.classList.remove('error');
            input.classList.add('success');
            return true;
        }
    }

    validatePassword(input) {
        const password = input.value;
        
        if (password.length < 6) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        } else {
            input.classList.remove('error');
            input.classList.add('success');
            return true;
        }
    }

    validateConfirmPassword(input) {
        const password = document.getElementById('register-password').value;
        const confirmPassword = input.value;
        
        if (password !== confirmPassword) {
            input.classList.add('error');
            input.classList.remove('success');
            return false;
        } else {
            input.classList.remove('error');
            input.classList.add('success');
            return true;
        }
    }

    async handleLogin(e) {
        const formData = new FormData(e.target);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        if (!username || !password) {
            this.showError('login', 'Please fill in all fields');
            return;
        }

        // Add loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user = this.users.find(u => u.username === username);
        
        if (!user) {
            this.showError('login', 'Username not found');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            return;
        }

        if (user.password !== this.hashPassword(password)) {
            this.showError('login', 'Incorrect password');
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            return;
        }

        // Login successful
        this.currentUser = user;
        this.isGuest = false;
        this.saveSession();
        this.redirectToApp();
    }

    async handleRegister(e) {
        const formData = new FormData(e.target);
        const username = formData.get('username').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        // Validate all fields
        const usernameInput = document.getElementById('register-username');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');

        const isUsernameValid = this.validateUsername(usernameInput);
        const isPasswordValid = this.validatePassword(passwordInput);
        const isConfirmPasswordValid = this.validateConfirmPassword(confirmPasswordInput);

        if (!isUsernameValid) {
            this.showError('register', 'Username must be 3-20 characters, letters and numbers only, and not already taken');
            return;
        }

        if (!isPasswordValid) {
            this.showError('register', 'Password must be at least 6 characters');
            return;
        }

        if (!isConfirmPasswordValid) {
            this.showError('register', 'Passwords do not match');
            return;
        }

        // Add loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            collection: [],
            decks: [],
            settings: {
                theme: 'default',
                autoBackup: true
            }
        };

        this.users.push(newUser);
        this.saveUsers();

        // Auto-login after registration
        this.currentUser = newUser;
        this.isGuest = false;
        this.saveSession();
        this.redirectToApp();
    }

    loginAsGuest() {
        this.currentUser = {
            id: 'guest',
            username: 'Guest User',
            isGuest: true
        };
        this.isGuest = true;
        this.saveSession();
        this.redirectToApp();
    }

    hashPassword(password) {
        // Simple hash function for demo purposes
        // In production, use a proper hashing library like bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    saveSession() {
        const sessionData = {
            currentUser: this.currentUser,
            isGuest: this.isGuest,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('mtg_session', JSON.stringify(sessionData));
    }

    redirectToApp() {
        window.location.href = 'main.html';
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const session = sessionStorage.getItem('mtg_session');
    if (session) {
        const sessionData = JSON.parse(session);
        // Check if session is still valid (less than 24 hours old)
        const loginTime = new Date(sessionData.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursSinceLogin < 24) {
            // Session is still valid, redirect to app
            window.location.href = 'main.html';
        } else {
            // Session expired, clear it
            sessionStorage.removeItem('mtg_session');
        }
    }
});
