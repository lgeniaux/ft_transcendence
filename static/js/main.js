// main.js

const routes = {
    '/': {
        html: '/static/html/home.html',
        css: '/static/css/home.css',
    },
    '/login': {
        html: '/static/html/auth/login.html',
        css: '/static/css/auth/auth.css',
        js: ['/static/js/oauth.js', '/static/js/login.js']
    },
    '/register': {
        html: '/static/html/auth/register.html',
        css: '/static/css/auth/auth.css',
        js: '/static/js/register.js'
    },
    '/oauth_callback': {
        html: '/static/html/oauth_callback.html',
        js: '/static/js/oauth.js'
    },
    '/profile': {
        html: '/static/html/profile.html',
        css: '/static/css/profile.css',
        js: '/static/js/profile.js',
        requires_auth: true
    },
    '/duel': {
        html: '/static/game/import.html',
        module: '/static/js/game.js',
        importmap: true,
        css: '/static/css/game.css',
        requires_auth: true
    },
    '/dashboard': {
        html: '/static/html/dashboard.html',
        css: '/static/css/dashboard.css',
        js: '/static/js/dashboard.js',
        requires_auth: true
    },
    '/tournament': {
        html: '/static/html/tournament.html',
        css: '/static/css/tournament.css',
        js: '/static/js/tournament.js',
        requires_auth: true
    }
};

document.addEventListener('DOMContentLoaded', function () {
    navigate(window.location.pathname);

    window.addEventListener('popstate', function () {
        navigate(window.location.pathname);
    });

    // Vincent: Pour charger la barre de navigation
    if (isAuthenticated()) {
        loadNavbar();
        loadChatbox();
    }
});

function getRedirectPath(path) {
    if ((path === '/' || path === '/login' || path === '/register') && isAuthenticated())
        return '/dashboard';

    if (routes[path].requires_auth && !isAuthenticated())
        return '/';

    return path;
}

// navigate to the page if a button is clicked, the location of the navigation is stored in the data-spa. example: <button data-spa="/login">Login</button>
document.addEventListener('click', function (event) {
    if (event.target.dataset.spa) {
        event.preventDefault();

        let originalPath = event.target.dataset.spa;
        let finalPath = getRedirectPath(originalPath);

        // check if the path is /tournament if it has an id data-spa-id, stores the id in the session storage
        if (originalPath === '/tournament' && event.target.dataset.spaId)
            sessionStorage.setItem('currentTournamentId', event.target.dataset.spaId);

        navigate(finalPath);
        window.history.pushState({}, '', finalPath);

    }
});

function isAuthenticated() {
    const authToken = sessionStorage.getItem('authToken');

    return authToken && authToken !== 'undefined' && authToken !== 'null';
}

function navigate(path) {
    window.initPageFunctions = [];

    let finalPath = getRedirectPath(path);
    const route = routes[finalPath];

    if (!route) {
        console.error('Route not found');
        return;
    }

    // Update the browser's address bar
    if (window.location.pathname !== finalPath) {
        window.history.pushState({}, '', finalPath);
    }

    // Load the HTML first
    loadHTML(route.html, () => {
        // After HTML is loaded, load the CSS
        if (route.css) {
            loadCSS(route.css);
        }

        // After HTML and CSS, load the JavaScript
        if (route.js) {
            const scripts = Array.isArray(route.js) ? route.js : [route.js];
            document.querySelectorAll('script[type="text/javascript"]').forEach(script => script.remove());
            loadJS(scripts, () => {
                // Execute all initialization functions after scripts are loaded
                if (Array.isArray(window.initPageFunctions)) {
                    window.initPageFunctions.forEach(function (initFunction) {
                        if (typeof initFunction === 'function') {
                            initFunction();
                        }
                    });
                }
            });
        }
    });

    // Load any additional modules or import maps if they exist
    if (route.module) {
        loadModule(route.module);
    }
    if (route.importmap) {
        loadImportmap();
    }
}

async function loadHTML(url, callback) {
    try {
        const response = await fetch(url);

        if (!response.ok)
            throw new Error(`HTTP Error: ${response.status}`);

        const html = await response.text();
        document.querySelector('#app').innerHTML = html;

        // Execute the callback after the content is loaded
        if (typeof callback === 'function') {
            callback();
        }
    } catch (error) {
        console.error('Error loading the HTML file:', error);
    }
}



function loadCSS(url) {
    const head = document.getElementsByTagName('head')[0];
    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    head.appendChild(link);
}

function loadJS(urls, finalCallback) {
    let loadedScripts = 0;

    urls.forEach((url) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        script.async = false;
        script.onload = () => {
            loadedScripts++;
            if (loadedScripts === urls.length && finalCallback)
                finalCallback();
        };
        document.body.appendChild(script);
    });
}

function loadModule(url) {
    const module = document.createElement('script');
    module.src = url;
    module.type = 'module';
    module.async = false;
    document.body.appendChild(module);
}

function loadImportmap() {
    if (document.querySelector('script[type="importmap"]'))
        return;

    const importmap = document.createElement('script');
    importmap.type = 'importmap';
    importmap.innerHTML = JSON.stringify({
        imports: {
            'three': 'https://unpkg.com/three@0.160.1/build/three.module.js',
            'three/addons/': 'https://unpkg.com/three@0.160.1/examples/jsm/',
        },
    });
    importmap.async = false;
    document.head.appendChild(importmap);
}