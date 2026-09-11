// ============================================
// DORKARI — Admin Authentication
// Step 2.8 — Part D
// ============================================

(function () {

    "use strict";


    // ========================================
    // CONFIG CHECK
    // ========================================

    if (
        typeof DORKARI_CONFIG === "undefined" ||
        !DORKARI_CONFIG.SUPABASE ||
        !DORKARI_CONFIG.SUPABASE.URL ||
        !DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
    ) {

        console.error(
            "Dorkari: Supabase configuration is missing."
        );

        showError(
            "Supabase configuration পাওয়া যাচ্ছে না।"
        );

        return;

    }


    // ========================================
    // SUPABASE LIBRARY CHECK
    // ========================================

    if (
        typeof window.supabase === "undefined"
    ) {

        console.error(
            "Dorkari: Supabase library failed to load."
        );

        showError(
            "Supabase library load হয়নি।"
        );

        return;

    }


    // ========================================
    // CREATE SUPABASE CLIENT
    // ========================================

    const supabaseClient =
        window.supabase.createClient(

            DORKARI_CONFIG.SUPABASE.URL,

            DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY

        );


    // ========================================
    // DOM ELEMENTS
    // ========================================

    const loginForm =
        document.getElementById(
            "adminLoginForm"
        );


    const emailInput =
        document.getElementById(
            "adminEmail"
        );


    const passwordInput =
        document.getElementById(
            "adminPassword"
        );


    const loginButton =
        document.getElementById(
            "adminLoginButton"
        );


    const loginButtonText =
        document.getElementById(
            "adminLoginButtonText"
        );


    const loginSpinner =
        document.getElementById(
            "adminLoginSpinner"
        );


    const errorBox =
        document.getElementById(
            "adminLoginError"
        );


    const togglePassword =
        document.getElementById(
            "togglePassword"
        );


    // ========================================
    // PASSWORD TOGGLE
    // ========================================

    if (togglePassword) {

        togglePassword.addEventListener(
            "click",
            function () {

                const isPassword =
                    passwordInput.type === "password";


                passwordInput.type =
                    isPassword
                        ? "text"
                        : "password";


                togglePassword.textContent =
                    isPassword
                        ? "লুকান"
                        : "দেখুন";


                togglePassword.setAttribute(
                    "aria-label",
                    isPassword
                        ? "Password লুকান"
                        : "Password দেখান"
                );

            }
        );

    }


    // ========================================
    // CHECK EXISTING SESSION
    // ========================================

    checkExistingSession();


    async function checkExistingSession() {

        try {

            const {
                data,
                error
            } =
                await supabaseClient.auth.getSession();


            if (error) {

                console.error(
                    "Session check error:",
                    error
                );

                return;

            }


            const session =
                data?.session;


            if (!session) {

                return;

            }


            await verifyAdminAndRedirect(
                session.user
            );

        }
        catch (error) {

            console.error(
                "Existing session error:",
                error
            );

        }

    }


    // ========================================
    // LOGIN FORM
    // ========================================

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    // ========================================
    // LOGIN
    // ========================================

    async function handleLogin(event) {

        event.preventDefault();

        clearError();


        const email =
            emailInput.value.trim();


        const password =
            passwordInput.value;


        // ------------------------------------
        // VALIDATION
        // ------------------------------------

        if (!email) {

            showError(
                "আপনার email address দিন।"
            );

            emailInput.focus();

            return;

        }


        if (!password) {

            showError(
                "আপনার password দিন।"
            );

            passwordInput.focus();

            return;

        }


        setLoading(true);


        try {

            // --------------------------------
            // SUPABASE AUTH LOGIN
            // --------------------------------

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .signInWithPassword({

                        email: email,

                        password: password

                    });


            if (error) {

                console.error(
                    "Login error:",
                    error
                );

                showError(
                    getLoginErrorMessage(error)
                );

                return;

            }


            const user =
                data?.user;


            if (!user) {

                showError(
                    "Login session পাওয়া যায়নি। আবার চেষ্টা করুন।"
                );

                return;

            }


            // --------------------------------
            // VERIFY ADMIN PROFILE
            // --------------------------------

            const isAdmin =
                await verifyAdminAndRedirect(
                    user
                );


            // --------------------------------
            // SIGN OUT NON-ADMIN
            // --------------------------------

            if (!isAdmin) {

                await supabaseClient.auth.signOut();

            }

        }
        catch (error) {

            console.error(
                "Unexpected login error:",
                error
            );

            showError(
                "Login করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
            );

        }
        finally {

            setLoading(false);

        }

    }


    // ========================================
    // VERIFY ADMIN PROFILE
    // ========================================

    async function verifyAdminAndRedirect(user) {

        if (
            !user ||
            !user.id
        ) {

            showError(
                "User information পাওয়া যায়নি।"
            );

            return false;

        }


        try {

            const {
                data,
                error
            } =
                await supabaseClient

                    .from("admin_profiles")

                    .select(
                        "id, user_id, name, role, is_active"
                    )

                    .eq(
                        "user_id",
                        user.id
                    )

                    .eq(
                        "is_active",
                        true
                    )

                    .maybeSingle();


            if (error) {

                console.error(
                    "Admin profile error:",
                    error
                );

                showError(
                    "Admin profile যাচাই করা যায়নি।"
                );

                return false;

            }


            // --------------------------------
            // NO PROFILE
            // --------------------------------

            if (!data) {

                showError(
                    "এই account-এর Admin access নেই।"
                );

                return false;

            }


            // --------------------------------
            // VALID ROLE CHECK
            // --------------------------------

            const allowedRoles = [

                "super_admin",

                "admin",

                "editor"

            ];


            if (
                !allowedRoles.includes(
                    data.role
                )
            ) {

                showError(
                    "এই account-এর valid Admin role নেই।"
                );

                return false;

            }


            // --------------------------------
            // SAVE SAFE PROFILE INFO
            // --------------------------------

            sessionStorage.setItem(

                "dorkari_admin_profile",

                JSON.stringify({

                    id: data.id,

                    user_id: data.user_id,

                    name: data.name,

                    role: data.role

                })

            );


            // --------------------------------
            // REDIRECT
            // --------------------------------

            window.location.href =
                "./dashboard.html";


            return true;

        }
        catch (error) {

            console.error(
                "Admin verification error:",
                error
            );

            showError(
                "Admin access যাচাই করার সময় সমস্যা হয়েছে।"
            );

            return false;

        }

    }


    // ========================================
    // LOGIN ERROR MESSAGE
    // ========================================

    function getLoginErrorMessage(error) {

        const message =
            String(
                error?.message || ""
            ).toLowerCase();


        if (
            message.includes(
                "invalid login credentials"
            )
        ) {

            return (
                "Email অথবা password সঠিক নয়।"
            );

        }


        if (
            message.includes(
                "email not confirmed"
            )
        ) {

            return (
                "এই email এখনো confirm করা হয়নি।"
            );

        }


        if (
            message.includes(
                "too many requests"
            )
        ) {

            return (
                "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
            );

        }


        return (
            "Login করা যায়নি। তথ্যগুলো পরীক্ষা করে আবার চেষ্টা করুন।"
        );

    }


    // ========================================
    // LOADING STATE
    // ========================================

    function setLoading(isLoading) {

        if (!loginButton) {

            return;

        }


        loginButton.disabled =
            isLoading;


        if (loginButtonText) {

            loginButtonText.textContent =
                isLoading
                    ? "Login হচ্ছে..."
                    : "Login";

        }


        if (loginSpinner) {

            loginSpinner.hidden =
                !isLoading;

        }

    }


    // ========================================
    // SHOW ERROR
    // ========================================

    function showError(message) {

        if (!errorBox) {

            return;

        }


        errorBox.textContent =
            message ||
            "একটি সমস্যা হয়েছে।";


        errorBox.hidden =
            false;

    }


    // ========================================
    // CLEAR ERROR
    // ========================================

    function clearError() {

        if (!errorBox) {

            return;

        }


        errorBox.textContent =
            "";

        errorBox.hidden =
            true;

    }


})();
