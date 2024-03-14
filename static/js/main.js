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
        js: '/static/js/profile.js'
    },
    '/duel': {
        html: '/static/game/import.html',
        module: '/static/js/game.js',
        importmap: true,
        css: '/static/css/game.css'
    },
    '/dashboard': {
        html: '/static/html/dashboard.html',
        css: '/static/css/dashboard.css',
        js: '/static/js/dashboard.js'
    },
    '/tournament': {
        html: '/static/html/tournament.html',
        css: '/static/css/tournament.css',
        js: '/static/js/tournament.js'
    }
};


document.addEventListener('DOMContentLoaded', function ()
{
    navigate(window.location.pathname);
    window.addEventListener('popstate', function () {navigate(window.location.pathname);});
});


function getRedirectPath(path)
{
	if (!isAuthenticated() && path !== '/login' && path !== '/register' && path !== '/')
	{
		console.log('Unauthenticated user. Redirecting to login...');
		return '/'; // Redirect to login if not authenticated
	}

    if ((path === '/login' || path === '/register' || path === '/') && isAuthenticated())
	{
        console.log('Authenticated user. Redirecting to home...');
        return '/dashboard'; // Return the home path for redirection
    }

    return path;
}

// navigate to the page if a button is clicked, the location of the navigation is stored in the data-spa. example: <button data-spa="/login">Login</button>
document.addEventListener('click', function (event)
{
    if (event.target.dataset.spa)
	{
        event.preventDefault();

        // Exécuter une fonction donnée à un ID si l'élément cliqué a cet ID
        executeFunctionForId(event.target.id);

        navigate(event.target.dataset.spa);
        window.history.pushState({}, '', event.target.dataset.spa);
    }
});

// Sous-fonction pour exécuter une fonction donnée à un ID
function executeFunctionForId(id)
{
    // Définir les fonctions pour chaque ID
    const functionMap = {
        'logoutButton': logout,
		'loginBtn': loginUser,
        // Ajoutez d'autres ID avec leurs fonctions associées ici
    };

    // Vérifier si l'ID a une fonction associée et l'exécuter
    if (id in functionMap)
        functionMap[id](); // Exécuter la fonction associée à l'ID
}


function navigate(path)
{
    window.initPageFunctions = [];
    // Louis: On  redirecte l'utilisateur vers la page d'accueil si il est déjà connecté
    let finalPath = getRedirectPath(path);

    const route = routes[finalPath];

    if (!route)
	{
		console.error('Route not found');
		return;
	}
    if (route.html)
        loadHTML(route.html);
    if (route.css)
        loadCSS(route.css);
    if (route.js)
	{
        const scripts = Array.isArray(route.js) ? route.js : [route.js];
        loadJS(scripts, function () {
            // Execute all init functions
            if (Array.isArray(window.initPageFunctions)) {
                window.initPageFunctions.forEach(function (initFunction) {
                    if (typeof initFunction === 'function') {
                        initFunction();
                    }
                });
            }
        });
    }

    if (route.importmap)
        loadImportmap(route.importmap);
    if (route.module)
        loadModule(route.module);

	if (isAuthenticated())
		loadNavbar();
}

function loadContent(id, url)
{
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.querySelector(`#${id}`).innerHTML = html;
        })
        .catch(error => console.error(`Error loading content for ID ${id}:`, error));
}


function loadHTML(url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.querySelector('#app').innerHTML = html;
        })
        .catch(error => console.error('Error loading the HTML file:', error));
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
            if (loadedScripts === urls.length && finalCallback) {
                finalCallback(); // All scripts loaded
            }
        };
        document.body.appendChild(script);
    });
}

function isAuthenticated() {
    const authToken = localStorage.getItem('authToken');
    return authToken && authToken !== 'undefined' && authToken !== 'null';
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

// Vincent: Fonctions pour charger la barre de navigation et la chatbox, à modifier pour qu'elle soient affichées en fonction du token
function loadNavbar()
{
	loadContent('sidePanel', '/static/html/navbar/sidepanel.html');
	loadContent('profileModal', '/static/html/navbar/profilemodal.html');
	// loadContent('chatbox', '/static/html/chatbox.html');
}
