importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
    console.log(`Workbox is loaded`);
} else {
    console.log(`Workbox didn't load`);
}

workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
        cacheName: 'images',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

workbox.precaching.precacheAndRoute([
    { url: './', revision: '1' },
    { url: './index.html', revision: '1' },
    { url: './styles.css', revision: '1' },
    { url: './app.js', revision: '1' },
    { url: './manifest.json', revision: '1' },
    { url: './icons/manifest-icon-192.maskable.png', revision: '1' },
    { url: './icons/manifest-icon-512.maskable.png', revision: '1' }
]);

// Cache CSS, JS, and Web Worker files with a Stale While Revalidate strategy
workbox.routing.registerRoute(
    ({request}) => request.destination === 'script' ||
                  request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'static-resources',
    })
);

// Cache images with a Cache First strategy
workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
        cacheName: 'images',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// Default catch-all handler
workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkFirst({
        cacheName: 'default',
    })
);
