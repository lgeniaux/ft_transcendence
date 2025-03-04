import { launchGame, createGame } from "/frontend/www/js/game/main.js";

async function getUserInfos(auth_token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (auth_token && auth_token !== 'undefined' && auth_token !== 'null') {
        headers['Authorization'] = 'Token ' + auth_token;
    }
	else {
		return null;
	}

    return fetch('/api/me/', {
        method: 'GET',
        credentials: 'include',
        headers: headers
    })
	.then(response => response.json())
}

async function startGame() {
    document.getElementById("game").removeEventListener("click", startGame);
    properties = window.properties;
    setTimeout(() => {
        for (let i = 0; i < document.getElementsByClassName("score").length; i++) {
            document.getElementsByClassName("score")[i].style.opacity = 1;
        }
    }, 3000);
    const userInfos = await getUserInfos(sessionStorage.getItem('authToken'));
    if (userInfos && userInfos.username)
        await launchGame(userInfos.username, "Guest", properties)
    else
        await launchGame("Left player", "Right player", properties);
}

window.properties = await createGame();
document.getElementById("game").addEventListener("click", startGame);
