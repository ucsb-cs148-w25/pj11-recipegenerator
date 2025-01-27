// Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('sw.js')
        .then(() => console.log('Service Worker registered successfully.'))
        .catch(err => console.error('Service Worker registration failed:', err));
}

// Online/Offline status handling
function updateOnlineStatus() {
    const statusBadge = document.getElementById('connection-status');
    if (navigator.onLine) {
        statusBadge.textContent = 'Online';
        statusBadge.style.backgroundColor = '#4CAF50';
    } else {
        statusBadge.textContent = 'Offline';
        statusBadge.style.backgroundColor = '#f44336';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();
