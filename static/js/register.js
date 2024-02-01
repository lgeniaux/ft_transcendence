// register.js

function initRegisterForm() {
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission
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
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ username: username, email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        
    })
    .catch(error => console.error('Error:', error));
}

// CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

window.initializeForm('registerForm', initRegisterForm);
