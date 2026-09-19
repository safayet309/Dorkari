/* =========================================================
   DORKARI — SERVICE WORKER
   Production PWA
   App-shell caching + offline fallback + safe updates
   ========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
   ========================================================= */

const CACHE_NAME =
    "dorkari-user-v2";


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
   STATIC FILE EXTENSIONS
   ========================================================= */

const STATIC_FILE_PATTERN =
    /\.(?:css|js|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf)$/i;


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    async (cache) => {

                        /*
                         * একটি file missing থাকলেও
                         * পুরো service worker install
                         * যেন fail না করে।
                         */

                        await Promise.allSettled(

                            APP_SHELL.map(
                                async (url) => {

                                    try {

                                        const response =
                                            await fetch(
                                                url,
                                                {
                                                    cache:
                                                        "no-cache"
                                                }
                                            );

                                        if (
                                            !response ||
                                            !response.ok
                                        ) {
                                            return;
                                        }

                                        await cache.put(
                                            url,
                                            response
                                        );

                                    } catch (error) {

                                        console.warn(
                                            "Dorkari SW cache skipped:",
                                            url,
                                            error
                                        );
                                    }

                                }
                            )

                        );

                    }
                )
                .then(
                    () => {

                        /*
                         * নতুন worker-কে
                         * waiting অবস্থায় আটকে রাখি না।
                         */

                        return self.skipWaiting();

                    }
                )

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

                caches
                    .keys()
                    .then(
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
                 * active clients-এর control দিই।
                 */

                self.clients.claim()

            ])

        );

    }
);


/* =========================================================
   FETCH
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
         * যেমন Supabase / CDN
         * service worker cache করবে না।
         */

        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }


        /*
         * Admin route cache করব না।
         *
         * Admin area always network-driven থাকবে।
         */

        if (
            url.pathname ===
                "/admin" ||
            url.pathname.startsWith(
                "/admin/"
            )
        ) {

            return;

        }


        /*
         * Navigation request
         * → Network first
         * → Offline হলে cached index.html
         */

        if (
            request.mode ===
            "navigate"
        ) {

            event.respondWith(
                handleNavigationRequest(
                    request
                )
            );

            return;
        }


        /*
         * Static asset
         * → Cache first
         * → Background update
         */

        if (
            STATIC_FILE_PATTERN.test(
                url.pathname
            )
        ) {

            event.respondWith(
                handleStaticRequest(
                    request
                )
            );

            return;
        }


        /*
         * অন্য same-origin GET
         * → Network first
         * → Cache fallback
         */

        event.respondWith(
            handleNetworkFirstRequest(
                request
            )
        );

    }
);


/* =========================================================
   NAVIGATION REQUEST
   ========================================================= */

async function handleNavigationRequest(
    request
) {

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );

            await cache.put(
                "./index.html",
                networkResponse.clone()
            );

        }


        return networkResponse;

    } catch (error) {

        /*
         * Offline হলে cached Home page।
         */

        const cachedHome =
            await caches.match(
                "./index.html"
            );


        if (cachedHome) {
            return cachedHome;
        }


        /*
         * একেবারেই কিছু না থাকলে
         * error propagate করি।
         */

        throw error;

    }

}


/* =========================================================
   STATIC REQUEST
   ========================================================= */

async function handleStaticRequest(
    request
) {

    const cachedResponse =
        await caches.match(
            request
        );


    /*
     * Cached version থাকলে
     * সঙ্গে সঙ্গে সেটাই দিই।
     */

    if (cachedResponse) {

        /*
         * Background update।
         */

        updateStaticCache(
            request
        );

        return cachedResponse;
    }


    /*
     * প্রথমবার network থেকে load।
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

            const cache =
                await caches.open(
                    CACHE_NAME
                );

            await cache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    } catch (error) {

        throw error;

    }

}


/* =========================================================
   NETWORK FIRST
   ========================================================= */

async function handleNetworkFirstRequest(
    request
) {

    try {

        const networkResponse =
            await fetch(
                request
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );

            await cache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    } catch (error) {

        const cachedResponse =
            await caches.match(
                request
            );


        if (cachedResponse) {
            return cachedResponse;
        }


        throw error;

    }

}


/* =========================================================
   BACKGROUND STATIC UPDATE
   ========================================================= */

function updateStaticCache(
    request
) {

    fetch(
        request,
        {
            cache:
                "no-store"
        }
    )
        .then(
            (response) => {

                if (
                    !response ||
                    !response.ok
                ) {
                    return;
                }


                return caches
                    .open(
                        CACHE_NAME
                    )
                    .then(
                        (cache) => {

                            return cache.put(
                                request,
                                response
                            );

                        }
                    );

            }
        )
        .catch(
            () => {

                /*
                 * Offline হলে
                 * background update silently fail করবে।
                 */

            }
        );

}


/* =========================================================
   MESSAGE — FORCE UPDATE
   ========================================================= */

self.addEventListener(
    "message",
    (event) => {

        if (
            event.data &&
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);
