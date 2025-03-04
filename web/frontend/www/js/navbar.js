import { loadContent, getRequestHeaders, initLogoutButton } from './utils.js';

export async function loadNavbar()
{
    try
    {
        await loadContent('/frontend/www/html/navbar/sidepanel.html', '#sidePanel', 'barre de navigation');
        await loadContent('/frontend/www/html/navbar/profilemodal.html', '#profileModal', 'bouton de profil');
        await loadUsernameIntoModal();
        initLogoutButton();
    }
    catch (error)
    {
        console.error('Error loading navbar:', error);
    }
}

async function loadUsernameIntoModal()
{
    try
	{
        const response = await fetch('/api/me/', {
            method: 'GET',
            credentials: 'include',
            headers: getRequestHeaders()
        });

        if (!response.ok)
            throw new Error('Failed to fetch user profile');

        const data = await response.json();

        const modalUsernameElement = document.getElementById('modal-username');

        if (modalUsernameElement)
            modalUsernameElement.innerText = data.username;

        const modalAvatarElement = document.getElementById('modal-avatar');

        if (modalAvatarElement && data.avatar)
            modalAvatarElement.src = data.avatar;
    }
	catch (error)
	{
        console.error('Error loading username into modal:', error);
    }
}
