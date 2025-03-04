import { getRequestHeaders } from '../../js/utils.js';

if (!window.allUsers)
{
    window.allUsers = [];
}

// Friends management

export async function init()
{
    initFriendsSearch();
    initNotifications();
    initTournamentsList();
}

async function fetchAllUsers()
{
    try
    {
        const response = await fetch('/api/get-users/', {
            method: 'GET',
            credentials: 'include',
            headers: getRequestHeaders()
        });

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        allUsers = data;
        displayUsers(allUsers);
    }
    catch (error)
    {
        console.error('Error:', error);
    }
}

function initFriendsSearch()
{
    var input = document.getElementById('userSearch');

    if (input)
        input.addEventListener('input', filterUsersByUsername);

    fetchAllUsers();
}

function filterUsersByUsername(event)
{
    const searchTerm = event.target.value

    const filteredUsers = allUsers.filter(user => user.username.includes(searchTerm));

    displayUsers(filteredUsers);
}

function displayUsers(users)
{
    var usersList = document.getElementById('users-list');
    usersList.innerHTML = '';

    users.forEach(user => {
        var actionContainerId = `actions-${user.username}`;
        var avatarSrc = user.avatar ? user.avatar : 'static/img/person-fill.svg';
        var userHTML = `
        <div class="card bg-dark text-white mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <img src="${avatarSrc}" alt="User avatar" class="rounded-circle me-3" style="width: 60px; height: 60px; object-fit: cover;">
                        <div>
                            <h3 class="h5 mb-0">${user.username}</h3>
                            <p class="mb-0" id="status-${user.username}" style="display: none;">Status: <span>${user.status}</span></p>
                        </div>
                    </div>
                    <div id="${actionContainerId}" class="btn-group">
                        ${getActionButtonsHtml(user)}
                    </div>
                </div>
            </div>
        </div>
        `;

        usersList.innerHTML += userHTML;
    });
}

export async function updateDashboardInterface(username, newStatus)
{
    const statusTexts = {
        'blocked': 'blocked',
        'none': 'none',
        'friends': 'friends',
        'not friends yet': 'not friends yet'
    };

    const statusText = statusTexts[newStatus] || 'unknown';
    document.getElementById(`status-${username}`).textContent = statusText;
    document.getElementById(`actions-${username}`).innerHTML = getActionButtonsHtml({username: username, status: newStatus});
}

function getActionButtonsHtml(user)
{
    let buttonsHtml = '';

    if (user.status === 'friends')
        buttonsHtml += `<button class="btn btn-outline-danger btn-sm" type="button" onclick="window.handleUserAction('${user.username}', 'delete')">Delete</button>`;
    else if (user.status === 'blocked')
        buttonsHtml += '<div class="badge bg-danger">Blocked</div>';
    else
        buttonsHtml += `<button class="btn btn-outline-success btn-sm" type="button" onclick="window.handleUserAction('${user.username}', 'add')">Add</button>`;

    return buttonsHtml;
}


// Notifications
export async function manageInvite(notificationId, action)
{
    try
    {
        const response = await fetch('/api/respond-to-invite/', {
            method: 'POST',
            credentials: 'include',
            headers: getRequestHeaders(),
            body: JSON.stringify({ notification_id: notificationId, action: action })
        });

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const notificationElement = document.querySelector(`.notification[data-notification-id="${notificationId}"]`);

        if (notificationElement.classList.contains('tournament-invite'))
            initTournamentsList();

        if (notificationElement)
            notificationElement.remove();


    }
    catch (error)
    {
        alert('Error responding to invite: ' + error);
    }
}

window.manageInvite = manageInvite;

function getActionButtonsNotification(notification)
{
    let buttonsHtml = '';

    if (notification.notification_type === 'tournament-invite')
    {
        buttonsHtml = `
            <button class="btn btn-success" onclick="window.manageInvite(${notification.id}, 'accept')">Accept</button>
            <button class="btn btn-danger" onclick="window.manageInvite(${notification.id}, 'deny')">Deny</button>
        `;
    }
    else if (notification.notification_type === 'game-start')
    {
        buttonsHtml = `
            <button class="btn btn-success" onclick="window.goToGame(${notification.data.game_id}, 'game')">PLAY</button>
        `;
    }
    else if (notification.notification_type === 'game-invite')
    {
        buttonsHtml = `
            <button class="btn btn-success" onclick="window.manageInvite(${notification.id}, 'accept')">Accept</button>
            <button class="btn btn-danger" onclick="window.manageInvite(${notification.id}, 'deny')">Deny</button>
        `;
    }

    return buttonsHtml; 
}

function displayNotification(notification)
{
    const notificationsList = document.querySelector('.notifications-list');

    if (notificationsList)
    {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification' + ' ' + notification.notification_type;
        const dateString = new Date(notification.created_at).toLocaleString();
        notificationElement.setAttribute('data-notification-id', notification.id);
        notificationElement.innerHTML = `
        <div class="card bg-dark text-white">
            <div class="card-body d-flex justify-content-between align-items-center">
                <img src="/static/img/trophy.svg" alt="Notification icon" class="me-3" style="width: 40px; height: 40px;">
                <h5>${notification.message}</h5>
                <div class="card-footer bg-transparent border-top-0">
                    ${getActionButtonsNotification(notification)}
                </div>
            </div> 
        </div>
    `;
        notificationsList.prepend(notificationElement);
    }
}


async function fetchAndDisplayStoredNotifications()
{
    try
    {
        const response = await fetch('/api/get-notifications/', {
            method: 'GET',
            credentials: 'include',
            headers: getRequestHeaders() // Utilisation de getRequestHeaders
        });

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        data.forEach(notification => {
            displayNotification(notification);
        });
    }
    catch (error)
    {
        console.error('Error fetching notifications:', error);
    }
}


async function initNotifications()
{
    await fetchAndDisplayStoredNotifications(); // Fetch and display stored notifications on page load

    const auth_token = sessionStorage.getItem('authToken');
    const wsUrl = `wss://${window.location.host}/ws/notifications/${auth_token}/`;
    const webSocket = new WebSocket(wsUrl);

    webSocket.onmessage = function (event) {
        const notification = JSON.parse(event.data);
        displayNotification(notification);
    }

    webSocket.onerror = function (event) {
        console.error('WebSocket error:', event);
    }
}




// Tournaments

function displayTournaments(tournaments)
{
    const tournamentsList = document.querySelector('.tournaments-list');
    tournamentsList.innerHTML = '';

    if (tournamentsList)
    {
        tournaments.forEach(tournament => {
            if (tournament.state.status !== 'finished')
            {
                const tournamentCard = document.createElement('div');
                tournamentCard.className = 'card bg-dark text-white mb-3';
                tournamentCard.setAttribute('role', 'button');
                tournamentCard.setAttribute('tabindex', '0');
                tournamentCard.setAttribute('data-spa', '/tournament');
                tournamentCard.setAttribute('data-spa-id', tournament.id);
                tournamentCard.innerHTML = `
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${tournament.name}</h5>
                        <span class="badge bg-success rounded-pill">${tournament.state.status}</span>
                    </div>
                `;

                tournamentsList.appendChild(tournamentCard);
            }
        });
    }
}

async function initTournamentsList()
{
    try
    {
        const response = await fetch('/api/tournament/get-tournaments/', {
            method: 'GET',
            credentials: 'include',
            headers: getRequestHeaders() // Utilisation de getRequestHeaders
        });

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        displayTournaments(data);
    }
    catch (error)
    {
        console.error('Error fetching tournaments:', error);
    }
}