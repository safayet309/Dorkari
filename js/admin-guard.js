// =========================================================
// Dorkari — Admin Guard
// Protected Admin Dashboard
// =========================================================

(function () {

    "use strict";


    // =====================================================
    // CONFIG CHECK
    // =====================================================

    if (
        typeof DORKARI_CONFIG === "undefined" ||
        !DORKARI_CONFIG.SUPABASE ||
        !DORKARI_CONFIG.SUPABASE.URL ||
        !DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY ||
        DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY ===
            "YOUR_SUPABASE_PUBLISHABLE_KEY"
    ) {

        console.error(
            "Dorkari: Supabase configuration is missing."
        );

        window.location.replace("./index.html");

        return;
    }


    // =====================================================
    // SUPABASE CHECK
    // =====================================================

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Dorkari: Supabase library was not loaded."
        );

        window.location.replace("./index.html");

        return;
    }


    // =====================================================
    // CREATE SUPABASE CLIENT
    // =====================================================

    const supabaseClient =
        window.supabase.createClient(
            DORKARI_CONFIG.SUPABASE.URL,
            DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
        );


    // =====================================================
    // CONSTANTS
    // =====================================================

    const PROFILE_STORAGE_KEY =
        "dorkari_admin_profile";


    const LOGIN_PAGE =
        "./index.html";


    const ALLOWED_ROLES = [
        "super_admin",
        "admin",
        "editor"
    ];


    // =====================================================
    // STATE
    // =====================================================

    let currentSession = null;

    let currentProfile = null;

    let isRedirecting = false;

    let authInitialized = false;


    // =====================================================
    // DOM HELPERS
    // =====================================================

    function getElement(id) {

        return document.getElementById(id);

    }


    // =====================================================
    // REDIRECT TO LOGIN
    // =====================================================

    function redirectToLogin() {

        if (isRedirecting) {
            return;
        }


        isRedirecting = true;


        try {

            sessionStorage.removeItem(
                PROFILE_STORAGE_KEY
            );

        } catch (error) {

            console.warn(
                "Could not clear admin profile cache.",
                error
            );
        }


        window.location.replace(
            LOGIN_PAGE
        );
    }


    // =====================================================
    // FORMAT ROLE
    // =====================================================

    function formatRole(role) {

        const roles = {

            super_admin:
                "Super Admin",

            admin:
                "Admin",

            editor:
                "Editor"

        };


        return (
            roles[role] ||
            "Admin"
        );
    }


    // =====================================================
    // GET INITIAL LETTER
    // =====================================================

    function getInitial(name) {

        if (
            !name ||
            typeof name !== "string"
        ) {

            return "A";
        }


        return (
            name
                .trim()
                .charAt(0)
                .toUpperCase()
        ) || "A";
    }


    // =====================================================
    // SAVE SAFE PROFILE
    // =====================================================

    function saveProfile(profile) {

        if (!profile) {
            return;
        }


        try {

            const safeProfile = {

                id:
                    profile.id,

                user_id:
                    profile.user_id,

                name:
                    profile.name,

                role:
                    profile.role,

                is_active:
                    profile.is_active

            };


            sessionStorage.setItem(
                PROFILE_STORAGE_KEY,
                JSON.stringify(
                    safeProfile
                )
            );


        } catch (error) {

            console.warn(
                "Could not save admin profile.",
                error
            );
        }
    }


    // =====================================================
    // VERIFY ADMIN PROFILE
    // =====================================================

    async function verifyAdminProfile(
        userId
    ) {

        if (!userId) {
            return null;
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("admin_profiles")
                .select(
                    "id,user_id,name,role,is_active"
                )
                .eq(
                    "user_id",
                    userId
                )
                .eq(
                    "is_active",
                    true
                )
                .maybeSingle();


        if (error) {

            console.error(
                "Admin profile verification failed:",
                error
            );

            return null;
        }


        if (!data) {
            return null;
        }


        if (
            !ALLOWED_ROLES.includes(
                data.role
            )
        ) {

            console.warn(
                "Invalid admin role:",
                data.role
            );

            return null;
        }


        return data;
    }


    // =====================================================
    // UPDATE ADMIN UI
    // =====================================================

    function updateAdminUI(
        profile
    ) {

        if (!profile) {
            return;
        }


        const name =
            profile.name ||
            "Admin";


        const role =
            formatRole(
                profile.role
            );


        const initial =
            getInitial(
                name
            );


        // =================================================
        // SIDEBAR
        // =================================================

        const sidebarName =
            getElement(
                "sidebarAdminName"
            );


        const sidebarRole =
            getElement(
                "sidebarAdminRole"
            );


        const sidebarAvatar =
            getElement(
                "adminAvatar"
            );


        if (sidebarName) {

            sidebarName.textContent =
                name;
        }


        if (sidebarRole) {

            sidebarRole.textContent =
                role;
        }


        if (sidebarAvatar) {

            sidebarAvatar.textContent =
                initial;
        }


        // =================================================
        // TOPBAR
        // =================================================

        const topbarName =
            getElement(
                "topbarAdminName"
            );


        const topbarRole =
            getElement(
                "topbarAdminRole"
            );


        const topbarAvatar =
            getElement(
                "topbarAvatar"
            );


        if (topbarName) {

            topbarName.textContent =
                name;
        }


        if (topbarRole) {

            topbarRole.textContent =
                role;
        }


        if (topbarAvatar) {

            topbarAvatar.textContent =
                initial;
        }


        // =================================================
        // WELCOME
        // =================================================

        const welcomeName =
            getElement(
                "welcomeAdminName"
            );


        if (welcomeName) {

            welcomeName.textContent =
                name;
        }


        // =================================================
        // ROLE BADGE
        // =================================================

        const roleBadge =
            getElement(
                "roleBadge"
            );


        if (roleBadge) {

            roleBadge.textContent =
                role;


            roleBadge.dataset.role =
                profile.role;
        }
    }


    // =====================================================
    // SHOW TOAST
    // =====================================================

    function showToast(
        message
    ) {

        const toast =
            getElement(
                "adminToast"
            );


        const toastMessage =
            getElement(
                "adminToastMessage"
            );


        if (
            !toast ||
            !toastMessage
        ) {

            return;
        }


        toastMessage.textContent =
            message;


        toast.classList.add(
            "show"
        );


        clearTimeout(
            showToast.timeout
        );


        showToast.timeout =
            setTimeout(
                function () {

                    toast.classList.remove(
                        "show"
                    );

                },
                2500
            );
    }


    // =====================================================
    // MODULE ACCESS
    // =====================================================

    function canManageContent(
        role
    ) {

        return (
            role ===
                "super_admin" ||
            role ===
                "admin"
        );
    }


    // =====================================================
    // APPLY ROLE UI
    // =====================================================

    function applyRolePermissions(
        profile
    ) {

        if (!profile) {
            return;
        }


        const role =
            profile.role;


        /*
         * IMPORTANT:
         *
         * This only controls the UI.
         *
         * Real database security is handled
         * by Supabase RLS.
         */


        // =================================================
        // CLEAR OLD ROLE CLASSES
        // =================================================

        document.body.classList.remove(
            "role-editor",
            "role-admin",
            "role-super-admin",
            "content-read-only"
        );


        // =================================================
        // EDITOR
        // =================================================

        if (
            role === "editor"
        ) {

            document.body.classList.add(
                "role-editor"
            );


            document.body.classList.add(
                "content-read-only"
            );


            showToast(
                "Editor mode: Read-only access"
            );
        }


        // =================================================
        // ADMIN
        // =================================================

        if (
            role === "admin"
        ) {

            document.body.classList.add(
                "role-admin"
            );
        }


        // =================================================
        // SUPER ADMIN
        // =================================================

        if (
            role === "super_admin"
        ) {

            document.body.classList.add(
                "role-super-admin"
            );
        }


        // =================================================
        // CONTENT PERMISSION
        // =================================================

        if (
            !canManageContent(
                role
            )
        ) {

            document.body.classList.add(
                "content-read-only"
            );
        }
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    async function logout() {

        if (isRedirecting) {
            return;
        }


        try {

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                /*
                 * Even if Supabase returns an error,
                 * we still clear the local cache and
                 * return the user to login.
                 */
            }


        } catch (error) {

            console.error(
                "Unexpected logout error:",
                error
            );


        } finally {

            currentSession =
                null;

            currentProfile =
                null;


            try {

                sessionStorage.removeItem(
                    PROFILE_STORAGE_KEY
                );

            } catch (error) {

                console.warn(
                    "Could not clear profile cache.",
                    error
                );
            }


            window.location.replace(
                LOGIN_PAGE
            );
        }
    }


    // =====================================================
    // CONNECT LOGOUT BUTTONS
    // =====================================================

    function setupLogoutButtons() {

        const sidebarLogout =
            getElement(
                "sidebarLogout"
            );


        const topbarLogout =
            getElement(
                "topbarLogout"
            );


        if (sidebarLogout) {

            sidebarLogout.addEventListener(
                "click",
                logout
            );
        }


        if (topbarLogout) {

            topbarLogout.addEventListener(
                "click",
                logout
            );
        }
    }


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    function setupSidebar() {

        const sidebar =
            getElement(
                "adminSidebar"
            );


        const toggle =
            getElement(
                "sidebarToggle"
            );


        const close =
            getElement(
                "sidebarClose"
            );


        const overlay =
            getElement(
                "sidebarOverlay"
            );


        function openSidebar() {

            if (sidebar) {

                sidebar.classList.add(
                    "open"
                );
            }


            if (overlay) {

                overlay.classList.add(
                    "show"
                );
            }


            document.body.style.overflow =
                "hidden";
        }


        function closeSidebar() {

            if (sidebar) {

                sidebar.classList.remove(
                    "open"
                );
            }


            if (overlay) {

                overlay.classList.remove(
                    "show"
                );
            }


            document.body.style.overflow =
                "";
        }


        if (toggle) {

            toggle.addEventListener(
                "click",
                openSidebar
            );
        }


        if (close) {

            close.addEventListener(
                "click",
                closeSidebar
            );
        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );
        }


        // =================================================
        // CLOSE SIDEBAR AFTER NAVIGATION
        // =================================================

        document
            .querySelectorAll(
                ".admin-nav-item"
            )
            .forEach(
                function (item) {

                    item.addEventListener(
                        "click",
                        function () {

                            if (
                                window.innerWidth <=
                                800
                            ) {

                                closeSidebar();
                            }

                        }
                    );

                }
            );
    }


    // =====================================================
    // FUTURE MODULE BUTTONS
    // =====================================================

    function setupModuleButtons() {

        document
            .querySelectorAll(
                ".module-item"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const module =
                                button.dataset.module ||
                                "module";


                            const moduleNames = {

                                emergency:
                                    "Emergency",

                                hospitals:
                                    "Hospitals",

                                doctors:
                                    "Doctors",

                                tests:
                                    "Tests & Fees",

                                ambulance:
                                    "Ambulance",

                                police:
                                    "Police",

                                government:
                                    "Government",

                                "blood-banks":
                                    "Blood Banks",

                                pharmacies:
                                    "Pharmacies"

                            };


                            const moduleName =
                                moduleNames[
                                    module
                                ] ||
                                "Module";


                            showToast(
                                moduleName +
                                " module পরবর্তী ধাপে আসছে।"
                            );

                        }
                    );

                }
            );
    }


    // =====================================================
    // AUTH STATE LISTENER
    // =====================================================

    function setupAuthListener() {

        supabaseClient
            .auth
            .onAuthStateChange(
                async function (
                    event,
                    session
                ) {

                    // =========================================
                    // SIGNED OUT
                    // =========================================

                    if (
                        event ===
                        "SIGNED_OUT"
                    ) {

                        currentSession =
                            null;

                        currentProfile =
                            null;

                        redirectToLogin();

                        return;
                    }


                    // =========================================
                    // TOKEN REFRESHED
                    // =========================================

                    if (
                        event ===
                        "TOKEN_REFRESHED"
                    ) {

                        if (!session) {

                            redirectToLogin();

                            return;
                        }


                        currentSession =
                            session;

                        return;
                    }


                    // =========================================
                    // USER SIGNED IN
                    // =========================================

                    if (
                        event ===
                        "SIGNED_IN"
                    ) {

                        if (!session) {

                            redirectToLogin();

                            return;
                        }


                        currentSession =
                            session;


                        /*
                         * Only verify profile again
                         * after the initial guard has already
                         * been initialized.
                         *
                         * This prevents unnecessary duplicate
                         * queries during page load.
                         */

                        if (
                            authInitialized
                        ) {

                            const profile =
                                await verifyAdminProfile(
                                    session.user.id
                                );


                            if (!profile) {

                                try {

                                    await supabaseClient
                                        .auth
                                        .signOut();

                                } catch (error) {

                                    console.warn(
                                        "Could not sign out invalid admin.",
                                        error
                                    );
                                }


                                redirectToLogin();

                                return;
                            }


                            currentProfile =
                                profile;


                            saveProfile(
                                profile
                            );


                            updateAdminUI(
                                profile
                            );


                            applyRolePermissions(
                                profile
                            );
                        }
                    }

                }
            );
    }


    // =====================================================
    // INITIAL AUTH CHECK
    // =====================================================

    async function initializeAdminGuard() {

        try {

            // =============================================
            // GET SUPABASE SESSION
            // =============================================

            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .getSession();


            if (error) {

                console.error(
                    "Session check failed:",
                    error
                );

                redirectToLogin();

                return;
            }


            const session =
                data?.session;


            // =============================================
            // NO SESSION
            // =============================================

            if (!session) {

                redirectToLogin();

                return;
            }


            currentSession =
                session;


            // =============================================
            // VERIFY ADMIN PROFILE
            // =============================================

            const profile =
                await verifyAdminProfile(
                    session.user.id
                );


            // =============================================
            // INVALID / NON-ADMIN USER
            // =============================================

            if (!profile) {

                console.warn(
                    "User does not have an active admin profile."
                );


                try {

                    await supabaseClient
                        .auth
                        .signOut();

                } catch (error) {

                    console.warn(
                        "Could not sign out invalid user.",
                        error
                    );
                }


                redirectToLogin();

                return;
            }


            // =============================================
            // STORE VERIFIED PROFILE
            // =============================================

            currentProfile =
                profile;


            saveProfile(
                profile
            );


            // =============================================
            // UPDATE UI
            // =============================================

            updateAdminUI(
                profile
            );


            applyRolePermissions(
                profile
            );


            // =============================================
            // SETUP INTERACTIONS
            // =============================================

            setupLogoutButtons();

            setupSidebar();

            setupModuleButtons();

            setupAuthListener();


            // =============================================
            // AUTH INITIALIZED
            // =============================================

            authInitialized =
                true;


            // =============================================
            // DASHBOARD READY
            // =============================================

            document.body.classList.add(
                "admin-authenticated"
            );


            console.log(
                "Dorkari Admin:",
                profile.role
            );


        } catch (error) {

            console.error(
                "Admin initialization error:",
                error
            );

            redirectToLogin();
        }
    }


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAdminGuard
        );

    } else {

        initializeAdminGuard();

    }


    // =====================================================
    // GLOBAL ADMIN ACCESS
    // =====================================================

    /*
     * Future admin modules can safely use:
     *
     * window.DorkariAdmin.getProfile()
     * window.DorkariAdmin.getSession()
     * window.DorkariAdmin.getRole()
     * window.DorkariAdmin.canManageContent()
     * window.DorkariAdmin.showToast()
     * window.DorkariAdmin.logout()
     *
     * IMPORTANT:
     *
     * sessionStorage is only used for UI convenience.
     * It is NOT trusted for database security.
     *
     * Supabase Auth + admin_profiles + RLS
     * remain the actual security layer.
     */

    window.DorkariAdmin = {

    // =================================================
    // VERIFIED ADMIN PROFILE
    // =================================================

    getProfile:
        function () {

            return currentProfile;

        },


    // =================================================
    // CURRENT SUPABASE SESSION
    // =================================================

    getSession:
        function () {

            return currentSession;

        },


    // =================================================
    // SUPABASE CLIENT
    // =================================================

    getSupabase:
        function () {

            return supabaseClient;

        },


    // =================================================
    // CURRENT ROLE
    // =================================================

    getRole:
        function () {

            return currentProfile
                ? currentProfile.role
                : null;

        },


    // =================================================
    // CONTENT MANAGEMENT PERMISSION
    // =================================================

    canManageContent:
        function () {

            return (
                currentProfile &&
                (
                    currentProfile.role ===
                        "super_admin" ||

                    currentProfile.role ===
                        "admin"
                )
            );

        },


    // =================================================
    // TOAST
    // =================================================

    showToast:
        showToast,


    // =================================================
    // LOGOUT
    // =================================================

    logout:
        logout

};


})();
