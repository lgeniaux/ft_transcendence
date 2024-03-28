    // ----------- backend ----------- //

    // Pour Bootstrap 5


export async function loadChatbox()
{
    try
    {
        await loadContent('/static/html/chatbox/chatbox.html', '#chatBox', 'chatbox');
        await loadFriendList();
        initWebsocket();
        attachChatboxEvents();
    }
    catch (error)
    {
        console.error('Erreur lors du chargement de la chatbox :', error);
    }
}

function attachChatboxEvents()
{
    const chatboxCollapse = document.getElementById('chatboxCollapse');

    if (chatboxCollapse)
    {
        chatboxCollapse.addEventListener('show.bs.collapse', async function () {
            loadFriendList();
            try
            {
                await loadFriendList();
                console.log('Chatbox ouverte');
            }
            catch (error)
            {
                console.error('Erreur lors du chargement de la liste d’amis:', error);
            }
        });

        chatboxCollapse.addEventListener('hide.bs.collapse', function () {
            console.log('Chatbox fermée');
        });
    }
}


function initWebsocket()
{
    const auth_token = sessionStorage.getItem('authToken');
    const wsUrl = `ws://${window.location.host}/ws/chat/${auth_token}/`;
    const webSocket = new WebSocket(wsUrl);

    webSocket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        console.log('Target username:', window.targetUsername)
        console.log('Live message:', message);
        //get sender of the message
        const sender = message.sender;
        console.log('message :', message.message);
        if (sender === window.targetUsername)
            displayMessage(message.message, sender);
    };

    webSocket.onopen = function() {
        console.log('Chatbox WebSocket opened');
    };

    webSocket.onclose = function() {
        console.log('WebSocket closed');
    };

    webSocket.onerror = function(event) {
        console.error('WebSocket error:', event);
    };

    observeForm(webSocket); // Nouvelle fonction pour observer le formulaire
}

// Afin de ne pas rater le formulaire lorsqu'il est ajouté dynamiquement, nous allons observer le document entier.
function observeForm(webSocket)
{
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList")
            {
                const form = document.getElementById('form');

                // Si le formulaire est trouvé...
                if (form)
                {
                    attachFormSubmitListener(webSocket); // On récupère le formulaire et on attache l'écouteur.
                    // observer.disconnect();
                }
            }
        });
    });

    const config = { childList: true, subtree: true };
    observer.observe(document.body, config); // Commencez à observer le document entier.
}

function attachFormSubmitListener(webSocket)
{
    const form = document.getElementById('form');

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const messageInput = document.getElementById('message');
        const message = messageInput.value.trim();
        const targetUsername = window.targetUsername;

        if (message && webSocket.readyState === WebSocket.OPEN)
        {
            // Inclut le destinataire dans l'objet JSON envoyé
            webSocket.send(JSON.stringify({
                message: message,
                type: 'message', // Type du message
                username: targetUsername // Nom d'utilisateur du destinataire
            }));
            displayMessage(message, 'Moi');
            messageInput.value = ''; // Vide le champ après l'envoi
        }
    });
}

function fetchAndDisplayStoredMessages()
{
    const auth_token = sessionStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Token ${auth_token}`
    };

    fetch('/api/get-messages/', { // Ensure you have an endpoint to fetch stored messages
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({ username: window.targetUsername, message_max_count: 100})
    })
        .then(response => response.json())
        .then(data => {
            // Assuming data is an array of messages
            data.forEach(message => {
                displayStoredMessage(message);
            });
        }).catch(error => console.error('Error fetching messages:', error));
}

function displayMessage(content, sender)
{
    const messageElement = document.createElement('div');
    messageElement.innerText = sender + ': ' + content;
    document.getElementById('messages').appendChild(messageElement);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function displayStoredMessage(message)
{
    const messageElement = document.createElement('div');
    if (message.sender !== window.targetUsername)
        message.sender = 'Moi';
    messageElement.innerText = message.sender + ': ' + message.content;
    const messagesContainer = document.getElementById('messages');
    messagesContainer.appendChild(messageElement);
    console.log('Stored message displayed');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// ----------- frontend ----------- //

document.addEventListener('userStatusChange', async (event) => {
    const { username, newStatus } = event.detail;
    // Vous pourriez avoir besoin de récupérer à nouveau les données de l'utilisateur ici
    // Pour l'exemple, on va simplement rafraîchir toute la liste d'amis
    await loadFriendList();
});

window.loadFriendList = async () =>
{
    try
    {
        const users = await cb_fetchAllUsers();
        await cb_displayUsers(users);
        attachClickEventToFriends();
        document.getElementById('chatboxHeader').innerText = 'Chat';
    }
    catch (error)
    {
        // Gère les erreurs potentielles survenues lors de la récupération ou l'affichage des utilisateurs
        console.error("Une erreur s'est produite lors du chargement des amis :", error);
    }
}

async function cb_fetchAllUsers()
{
    try
    {
        const response = await fetch('/api/get-users/', {
            method: 'GET',
            credentials: 'include',
            headers: getRequestHeaders()
        });

        if (!response.ok)
            throw new Error('Erreur lors de la récupération des utilisateurs');

        const data = await response.json();

        return data;
    }
    catch (error)
    {
        throw error; // L'erreur est renvoyée pour être gérée par l'appelant
    }
}


async function cb_displayUsers(users)
{
	let usersList = document.getElementById('chatboxContainer');
	usersList.innerHTML = ''; // Réinitialiser le contenu de la liste
	
	if (users.length === 0) {
		usersList.innerHTML = "<p>Aucun ami pour le moment</p>";
		return;
	}
	
	users.forEach(user => {
		// Utilisation du username pour générer un ID unique pour chaque élément de menu
		let dropdownId = `dropdown-${user.username}`;
		let avatarSrc = user.avatar ? user.avatar : 'static/img/person-fill.svg';
        let userHTML = '';

        console.log(user);
        if (user.online_status)
        {
		    userHTML = `
			<button class="user dropdown-toggle" type="button" data-username="${user.username}" data-bs-toggle="dropdown" aria-expanded="false" id="${dropdownId}">
				<div id="profilePicture"><img src="${avatarSrc}" alt="User avatar" class="avatar"></div>
				<div>${user.username}</div>
                <span class="badge bg-success">Online</span>
			</button>
			<div class="dropdown-menu dropdown-menu-end action-buttons-container" aria-labelledby="${dropdownId}">
				${getChatboxActionButtonsHtml(user)}
			</div>
		`;
        }
        else
        {
		    userHTML = `
			<button class="user dropdown-toggle" type="button" data-username="${user.username}" data-bs-toggle="dropdown" aria-expanded="false" id="${dropdownId}">
				<div id="profilePicture"><img src="${avatarSrc}" alt="User avatar" class="avatar"></div>
				<div>${user.username}</div>
                <span class="badge bg-danger">Offline</span>
			</button>
			<div class="dropdown-menu dropdown-menu-end action-buttons-container" aria-labelledby="${dropdownId}">
				${getChatboxActionButtonsHtml(user)}
			</div>
		`;
        }
            

		usersList.innerHTML += userHTML;
	});
}

window.startGameWithUser = async (username)=>{
    const authToken = sessionStorage.getItem('authToken');
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${authToken}`
    };
    const data = { username: username };

    fetch('/api/game/invite/', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    }).then(response => {
        return response.json();
    }).then(data => {
        console.log(data);
    });

}


window.sendMessage = async (username) =>
{
    const messagesUrl = '/static/html/chatbox/messagebox.html';
    loadContent(messagesUrl, '#chatboxContainer', messages);
    fetchAndDisplayStoredMessages();
    document.getElementById('chatboxHeader').innerText = window.targetUsername;
}

function getChatboxActionButtonsHtml(user, actionContainerId)
{
    let buttonsHtml = `<div id="${actionContainerId}">`;

    if (user.status === 'friends')
    {
        // Les utilisateurs qui sont déjà amis
        buttonsHtml += `<a class="dropdown-item" id="messages" onclick="sendMessage('${user.username}')">Send message</a>`;
        buttonsHtml += `<a class="dropdown-item" id="seeProfile" onclick="viewProfile('${user.username}')">See profile page</a>`;
        buttonsHtml += `<a class="dropdown-item" onclick="startGameWithUser('${user.username}')">Invite to 1v1</a>`;
        // Si l'url actuelle est /tournament et que on possede un sessionStorage.currentTournamentId
        buttonsHtml += `<hr>`
        buttonsHtml += `<a class="dropdown-item dangerBtn" onclick="handleUserAction('${user.username}', 'delete')">Delete</a>`;
    }
    else if (user.status === 'blocked')
    {
        // Les utilisateurs qui sont bloqués
        buttonsHtml += `<a class="dropdown-item dangerBtn" onclick="handleUserAction('${user.username}', 'unblock')">Unblock</a>`;
    }
    else
    { 
        // Tous les autres cas, y compris ceux où l'utilisateur peut être ajouté en ami
        buttonsHtml += `<a class="dropdown-item" onclick="handleUserAction('${user.username}', 'add')">Add contact</a>`;
        buttonsHtml += `<a class="dropdown-item dangerBtn" onclick="handleUserAction('${user.username}', 'block')">Block</a>`;
    }

    buttonsHtml += '</div>';

    return buttonsHtml;
}

function attachClickEventToFriends()
{
    // Attache un gestionnaire d'événements à tous les éléments avec la classe 'user'
    document.querySelectorAll('.user').forEach(userElement => {
        userElement.addEventListener('click', function(event) {
            // Vérifie si l'élément cliqué ou l'un de ses parents est le menu déroulant
            if (!event.target.closest('.dropdown-menu'))
            {
                const username = this.getAttribute('data-username');
                console.log("Ami cliqué :", username);
                window.targetUsername = username;
                // Ici, tu peux ajouter la logique pour afficher la chatbox ou effectuer d'autres actions
            }
        });
    });
}

window.handleUserAction = async (username, action) =>
{
    let statusAfterAction;

    switch (action)
	{
        case 'block':
            statusAfterAction = 'blocked';
            break;
        case 'unblock':
            statusAfterAction = 'none';
            break;
        case 'add':
            statusAfterAction = 'friends';
            break;
        case 'delete':
            statusAfterAction = 'None';
            break;
        default:
            console.error(`Unknown action: ${action}`);
            return;
    }

    try
	{
        await sendUserAction(username, action);
        console.log(`User ${action}ed successfully`);
        updateUserInterface(username, statusAfterAction);
        emitUserStatusChangeEvent(username, statusAfterAction);
    }
	catch (error)
	{
        console.error(`Error ${action}ing user ${username}:`, error);
    }
}

window.sendUserAction = async(username, action) =>
{
    const headers = getRequestHeaders();
    const data = { username, action };

    const endpointMap =
	{
        "block": 'api/block-user/',
        "unblock": 'api/unblock-user/',
        "add": 'api/add-friend/',
        "delete": 'api/delete-friend/',
    };

    try
	{
        const response = await fetch(endpointMap[action], {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok)
            throw new Error(`Failed to ${action} user. Status: ${response.status}`);
        
        return await response.json(); // Assuming the API returns JSON.
    }
	catch (error)
	{
        console.error(`Error performing ${action} on user: ${username}`, error);
        throw error; // Re-throw to handle it outside or log it.
    }
}

window.updateUserInterface= async (username, newStatus)=>
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

window.emitUserStatusChangeEvent = async (username, newStatus) =>
{
    const event = new CustomEvent('userStatusChange', { detail: { username, newStatus } });
    document.dispatchEvent(event);
}
// On ajoute initWebsocket à window.initPageFunctions pour qu'il soit appelé lors de l'initialisation de la page.
// window.initPageFunctions = window.initPageFunctions || [];
// window.initPageFunctions.push(initWebsocket);
