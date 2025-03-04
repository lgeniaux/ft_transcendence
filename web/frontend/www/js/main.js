import { navigate, handleNavigationClick, isAuthenticated } from './navigation.js';
import { loadNavbar } from './navbar.js';
import { loadChatbox } from './chatbox/chatbox.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (isAuthenticated())
    {
        await loadNavbar();
        await loadChatbox();
    }
    navigate(window.location.pathname);

    window.addEventListener('popstate', () => {
        navigate(window.location.pathname);
    });
});

document.addEventListener('click', handleNavigationClick);