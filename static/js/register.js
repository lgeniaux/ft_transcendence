// register.js

function checkPassword() {
    var password = document.querySelector('[name="password"]').value;
    var password2 = document.querySelector('[name="confirmPassword"]').value;
    if (password !== password2) {
        console.log('Passwords do not match');
        return false;
    }
    console.log('Passwords match');
    return true;
}

function initRegisterForm() {
    console.log("Initializing register form");
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission
            if (!checkPassword()) {
                return;
            }
            registerUser();
        });
    }
}

function registerUser() {
    var username = document.querySelector('[name="username"]').value;
    var email = document.querySelector('[name="email"]').value;
    var password = document.querySelector('[name="password"]').value;

    fetch('/api/register-user/', {
        method: 'POST',
        credentials: 'include', // Ensure credentials are included for CSRF
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ username: username, email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data); // For now, just log in the console
    })
    .catch(error => console.error('Error:', error));
}

function getCSRFToken() {
    let csrfToken = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 'csrftoken='.length) === 'csrftoken=') {
                csrfToken = decodeURIComponent(cookie.substring('csrftoken='.length));
                break;
            }
        }
    }
    return csrfToken;
}

window.initPage = initRegisterForm;
