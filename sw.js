/* =========================================================
   DORKARI — SERVICE WORKER
   PWA app-shell caching + offline fallback
   ========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
   ========================================================= */

const CACHE_NAME =
    "dorkari-user-v1";


/* =========================================================
   APP SHELL
   ========================================================= */

const APP_SHELL = [

    "./",

    "./index.html",

    "./css/variables.css",
    "./css/global.css",
    "./css/components.css",

    "./js/config.js",
    "./js/app.js",

    "./manifest.webmanifest",

    "./assets/images/logo.png",
    "./assets/images/icon-192.png",
    "./assets/images/icon-512.png",
    "./assets/images/icon-maskable-512.png",

    "./assets/icons/emergency.png",
    "./assets/icons/emergency.svg"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then((cache) => {

                    return cache.addAll(
                        APP_SHELL
                    );

                })
                .then(() => {

                    /*
                     * নতুন service worker-কে
                     * waiting অবস্থায় আটকে না রেখে
                     * activate করার জন্য প্রস্তুত রাখি।
                     */

                    return self.skipWaiting();

                })
        );
    }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
    "activate",
    (event) => {

        event.waitUntil(

            Promise.all([

                /*
                 * পুরোনো Dorkari cache remove করি।
                 */

                caches.keys().then(
                    (cacheNames) => {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    (cacheName) =>
                                        cacheName !==
                                        CACHE_NAME
                                )
                                .map(
                                    (cacheName) =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        );

                    }
                ),

                /*
                 * নতুন worker-কে
                 * সব active client-এর নিয়ন্ত্রণ দিই।
                 */

                self.clients.claim()

            ])
        );
    }
);


/* =========================================================
   FETCH STRATEGY
   ========================================================= */

self.addEventListener(
    "fetch",
    (event) => {

        const request =
            event.request;


        /*
         * শুধু GET request handle করব।
         */

        if (
            request.method !==
            "GET"
        ) {
            return;
        }


        const url =
            new URL(
                request.url
            );


        /*
         * External resource
         * যেমন Supabase/CDN
         * service worker cache করবে না।
         *
         * এগুলো normal browser network
         * request হিসেবেই চলবে।
         */

        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }


        event.respondWith(
            handleSameOriginRequest(
                request
            )
        );
    }
);


/* =========================================================
   SAME-ORIGIN REQUEST HANDLER
   ========================================================= */

async function handleSameOriginRequest(
    request
) {

    /*
     * আগে cache থেকে response নেওয়ার চেষ্টা।
     */

    const cachedResponse =
        await caches.match(
            request
        );


    /*
     * Cached file পাওয়া গেলে
     * user-কে সঙ্গে সঙ্গে দিই।
     *
     * একইসাথে background-এ
     * নতুন version network থেকে update করার
     * চেষ্টা করা হবে।
     */

    if (cachedResponse) {

        updateCacheInBackground(
            request
        );

        return cachedResponse;
    }


    /*
     * Cache-এ না থাকলে network।
     */

    try {

        const networkResponse =
            await fetch(
                request
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            /*
             * Future request-এর জন্য
             * successful same-origin response cache করি।
             */

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            cache.put(
                request,
                networkResponse.clone()
            );
        }


        return networkResponse;

    } catch (error) {

        /*
         * Navigation request হলে
         * offline Home Page ফেরত দিই।
         */

        if (
            request.mode ===
            "navigate"
        ) {

            const offlineHome =
                await caches.match(
                    "./index.html"
                );


            if (offlineHome) {
                return offlineHome;
            }
        }


        /*
         * Image offline থাকলে
         * cached asset না পাওয়া গেলে
         * empty response না দিয়ে
         * standard error reject করি।
         */

        throw error;
    }
}


/* =========================================================
   BACKGROUND CACHE UPDATE
   ========================================================= */

function updateCacheInBackground(
    request
) {

    fetch(request)
        .then((response) => {

            if (
                !response ||
                !response.ok
            ) {
                return;
            }


            return caches
                .open(CACHE_NAME)
                .then((cache) => {

                    return cache.put(
                        request,
                        response
                    );

                });

        })
        .catch(() => {

            /*
             * Offline হলে background update
             * silently fail করবে।
             */

        });
}
