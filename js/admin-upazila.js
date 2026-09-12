/* =========================================================
   DORKARI — ADMIN UPAZILA MANAGEMENT
   F-7.4 — ADD UPAZILA
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLE_UPAZILAS =
        "upazilas";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const sectionAddUpazilaButton =
        document.getElementById(
            "sectionAddUpazilaButton"
        );

    const upazilaFormPanel =
        document.getElementById(
            "upazilaFormPanel"
        );

    const closeUpazilaForm =
        document.getElementById(
            "closeUpazilaForm"
        );

    const cancelUpazilaButton =
        document.getElementById(
            "cancelUpazilaButton"
        );

    const upazilaForm =
        document.getElementById(
            "upazilaForm"
        );

    const upazilaDistrict =
        document.getElementById(
            "upazilaDistrict"
        );

    const upazilaName =
        document.getElementById(
            "upazilaName"
        );

    const upazilaNameBn =
        document.getElementById(
            "upazilaNameBn"
        );

    const upazilaSlug =
        document.getElementById(
            "upazilaSlug"
        );

    const upazilaIsActive =
        document.getElementById(
            "upazilaIsActive"
        );

    const saveUpazilaButton =
        document.getElementById(
            "saveUpazilaButton"
        );


    /* =====================================================
       ADMIN
       ===================================================== */

    function getAdmin() {

        return window.DorkariAdmin || null;

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabaseClient() {

        const admin =
            getAdmin();


        if (
            !admin ||
            typeof admin.getSupabase !==
            "function"
        ) {

            return null;

        }


        return admin.getSupabase();

    }


    /* =====================================================
       PERMISSION
       ===================================================== */

    function canManageUpazila() {

        const admin =
            getAdmin();


        if (
            !admin ||
            typeof admin.canManageContent !==
            "function"
        ) {

            return false;

        }


        return admin.canManageContent();

    }


    function updatePermissionUI() {

        const allowed =
            canManageUpazila();


        if (sectionAddUpazilaButton) {

            sectionAddUpazilaButton.hidden =
                !allowed;

        }


        if (saveUpazilaButton) {

            saveUpazilaButton.disabled =
                !allowed;

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message,
        type
    ) {

        const admin =
            getAdmin();


        /*
         * Prefer the existing Admin toast system.
         */

        if (
            admin &&
            typeof admin.showToast ===
            "function"
        ) {

            admin.showToast(
                message,
                type || "success"
            );

            return;

        }


        /*
         * Fallback for safety.
         */

        const toast =
            document.getElementById(
                "adminToast"
            );

        const toastMessage =
            document.getElementById(
                "adminToastMessage"
            );


        if (
            !toast ||
            !toastMessage
        ) {

            console.log(
                message
            );

            return;

        }


        toastMessage.textContent =
            message;


        toast.classList.remove(
            "success",
            "error",
            "warning",
            "show"
        );


        toast.classList.add(
            type || "success"
        );


        window.setTimeout(
            function () {

                toast.classList.add(
                    "show"
                );

            },
            10
        );


        window.clearTimeout(
            showToast.timer
        );


        showToast.timer =
            window.setTimeout(
                function () {

                    toast.classList.remove(
                        "show"
                    );

                },
                3000
            );

    }


    /* =====================================================
       TEXT
       ===================================================== */

    function cleanText(value) {

        return String(
            value || ""
        ).trim();

    }


    /* =====================================================
       SLUG
       ===================================================== */

    function slugify(value) {

        return cleanText(value)
            .toLowerCase()
            .replace(
                /[^a-z0-9\s-]/g,
                ""
            )
            .replace(
                /\s+/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            );

    }


    function handleNameInput() {

        if (
            !upazilaName ||
            !upazilaSlug
        ) {

            return;

        }


        const name =
            cleanText(
                upazilaName.value
            );


        if (!name) {

            upazilaSlug.value =
                "";

            return;

        }


        upazilaSlug.value =
            slugify(name);

    }


    /* =====================================================
       LOAD DISTRICTS
       ===================================================== */

    function loadDistrictOptions() {

        if (!upazilaDistrict) {

            return;

        }


        const districtAPI =
            window.DorkariDistrict;


        if (
            !districtAPI ||
            typeof districtAPI.getDistricts !==
            "function"
        ) {

            window.setTimeout(
                loadDistrictOptions,
                200
            );

            return;

        }


        const districts =
            districtAPI.getDistricts();


        const activeDistricts =
            (districts || []).filter(
                function (district) {

                    return (
                        district.is_active ===
                        true
                    );

                }
            );


        upazilaDistrict.innerHTML =
            "";


        const defaultOption =
            document.createElement(
                "option"
            );


        defaultOption.value =
            "";


        defaultOption.textContent =
            "District নির্বাচন করুন";


        upazilaDistrict.appendChild(
            defaultOption
        );


        activeDistricts.forEach(
            function (district) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    district.id;


                option.textContent =
                    district.name_bn ||
                    district.name;


                upazilaDistrict.appendChild(
                    option
                );

            }
        );

    }


    /* =====================================================
       FORM ERROR
       ===================================================== */

    function clearFormErrors() {

        const errors = [

            "upazilaDistrictError",

            "upazilaNameError",

            "upazilaNameBnError",

            "upazilaSlugError"

        ];


        errors.forEach(
            function (id) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.textContent =
                        "";

                    element.classList.remove(
                        "show"
                    );

                }

            }
        );


        const fields = [

            "upazilaDistrict",

            "upazilaName",

            "upazilaNameBn",

            "upazilaSlug"

        ];


        fields.forEach(
            function (id) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.classList.remove(
                        "is-invalid"
                    );

                }

            }
        );

    }


    function setFieldError(
        field,
        errorId,
        message
    ) {

        if (field) {

            field.classList.add(
                "is-invalid"
            );

        }


        const error =
            document.getElementById(
                errorId
            );


        if (error) {

            error.textContent =
                message;

            error.classList.add(
                "show"
            );

        }

    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateUpazilaForm() {

        clearFormErrors();


        let isValid =
            true;


        /* ---------------------------------------------
           District
           --------------------------------------------- */

        if (
            !upazilaDistrict ||
            !cleanText(
                upazilaDistrict.value
            )
        ) {

            setFieldError(
                upazilaDistrict,
                "upazilaDistrictError",
                "District নির্বাচন করুন।"
            );

            isValid =
                false;

        }


        /* ---------------------------------------------
           English Name
           --------------------------------------------- */

        if (
            !upazilaName ||
            !cleanText(
                upazilaName.value
            )
        ) {

            setFieldError(
                upazilaName,
                "upazilaNameError",
                "Name (English) দিন।"
            );

            isValid =
                false;

        }


        /* ---------------------------------------------
           Bangla Name
           --------------------------------------------- */

        if (
            !upazilaNameBn ||
            !cleanText(
                upazilaNameBn.value
            )
        ) {

            setFieldError(
                upazilaNameBn,
                "upazilaNameBnError",
                "নাম (বাংলা) দিন।"
            );

            isValid =
                false;

        }


        /* ---------------------------------------------
           Slug
           --------------------------------------------- */

        if (
            !upazilaSlug ||
            !cleanText(
                upazilaSlug.value
            )
        ) {

            setFieldError(
                upazilaSlug,
                "upazilaSlugError",
                "Slug তৈরি হয়নি। English Name পরীক্ষা করুন।"
            );

            isValid =
                false;

        }


        return isValid;

    }


    /* =====================================================
       SUPABASE ERROR MESSAGE
       ===================================================== */

    function getSupabaseErrorMessage(
        error
    ) {

        if (!error) {

            return "তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।";

        }


        /*
         * Unique constraint
         */

        if (
            error.code ===
            "23505"
        ) {

            return "এই District-এর মধ্যে এই Slug ইতোমধ্যে আছে।";

        }


        /*
         * Foreign key
         */

        if (
            error.code ===
            "23503"
        ) {

            return "নির্বাচিত District সঠিক নয়।";

        }


        /*
         * Permission / RLS
         */

        if (
            error.code ===
            "42501"
        ) {

            return "আপনার এই কাজের অনুমতি নেই।";

        }


        return (
            error.message ||
            "তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।"
        );

    }


    /* =====================================================
       OPEN FORM
       ===================================================== */

    function openUpazilaForm() {

        if (!upazilaFormPanel) {

            return;

        }


        loadDistrictOptions();


        upazilaFormPanel.classList.add(
            "active"
        );


        if (upazilaDistrict) {

            upazilaDistrict.focus();

        }

    }


    /* =====================================================
       CLOSE FORM
       ===================================================== */

    function closeUpazilaFormPanel() {

        if (!upazilaFormPanel) {

            return;

        }


        upazilaFormPanel.classList.remove(
            "active"
        );

    }


    /* =====================================================
       RESET FORM
       ===================================================== */

    function resetUpazilaForm() {

        if (!upazilaForm) {

            return;

        }


        upazilaForm.reset();


        if (upazilaIsActive) {

            upazilaIsActive.checked =
                true;

        }


        clearFormErrors();

    }


    /* =====================================================
       SAVE — INSERT UPAZILA
       ===================================================== */

    async function saveUpazila() {

        /* ---------------------------------------------
           Validation
           --------------------------------------------- */

        const isValid =
            validateUpazilaForm();


        if (!isValid) {

            return;

        }


        /* ---------------------------------------------
           Permission
           --------------------------------------------- */

        if (!canManageUpazila()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "warning"
            );

            return;

        }


        /* ---------------------------------------------
           Supabase
           --------------------------------------------- */

        const supabase =
            getSupabaseClient();


        if (!supabase) {

            showToast(
                "Supabase connection পাওয়া যায়নি।",
                "error"
            );

            return;

        }


        /* ---------------------------------------------
           Values
           --------------------------------------------- */

        const districtId =
            cleanText(
                upazilaDistrict.value
            );


        const name =
            cleanText(
                upazilaName.value
            );


        const nameBn =
            cleanText(
                upazilaNameBn.value
            );


        const slug =
            cleanText(
                upazilaSlug.value
            ).toLowerCase();


        /* ---------------------------------------------
           Verify District
           --------------------------------------------- */

        const districtAPI =
            window.DorkariDistrict;


        if (
            districtAPI &&
            typeof districtAPI.getDistricts ===
            "function"
        ) {

            const districts =
                districtAPI.getDistricts();


            const districtExists =
                (districts || []).some(
                    function (district) {

                        return (
                            district.id ===
                            districtId &&
                            district.is_active ===
                            true
                        );

                    }
                );


            if (!districtExists) {

                setFieldError(
                    upazilaDistrict,
                    "upazilaDistrictError",
                    "নির্বাচিত District সঠিক নয়।"
                );

                return;

            }

        }


        /* ---------------------------------------------
           Loading state
           --------------------------------------------- */

        if (saveUpazilaButton) {

            saveUpazilaButton.disabled =
                true;

            saveUpazilaButton.textContent =
                "Saving...";

        }


        try {

            /* -----------------------------------------
               Payload
               ----------------------------------------- */

            const payload = {

                district_id:
                    districtId,

                name:
                    name,

                name_bn:
                    nameBn,

                slug:
                    slug,

                is_active:
                    upazilaIsActive
                        ? upazilaIsActive.checked
                        : true

            };


            /* -----------------------------------------
               INSERT
               ----------------------------------------- */

            const {
                error
            } = await supabase
                .from(
                    TABLE_UPAZILAS
                )
                .insert(
                    payload
                );


            if (error) {

                throw error;

            }


            /* -----------------------------------------
               SUCCESS
               ----------------------------------------- */

            showToast(
                "Upazila সফলভাবে যোগ হয়েছে।",
                "success"
            );


            resetUpazilaForm();

            closeUpazilaFormPanel();


            /* -----------------------------------------
               Refresh location data if available
               ----------------------------------------- */

            if (
                window.DorkariLocation &&
                typeof window.DorkariLocation
                    .refreshSummary ===
                "function"
            ) {

                window.DorkariLocation
                    .refreshSummary();

            }

        } catch (error) {

            console.error(
                "Upazila save error:",
                error
            );


            showToast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            /*
             * IMPORTANT:
             * Restore permission-based state,
             * not simply disabled = false.
             */

            updatePermissionUI();


            if (saveUpazilaButton) {

                saveUpazilaButton.textContent =
                    "Save Upazila";

            }

        }

    }


    /* =====================================================
       EVENT SETUP
       ===================================================== */

    function setupEvents() {

        /* ---------------------------------------------
           Add
           --------------------------------------------- */

        if (sectionAddUpazilaButton) {

            sectionAddUpazilaButton.addEventListener(
                "click",
                function () {

                    resetUpazilaForm();

                    openUpazilaForm();

                }
            );

        }


        /* ---------------------------------------------
           Close
           --------------------------------------------- */

        if (closeUpazilaForm) {

            closeUpazilaForm.addEventListener(
                "click",
                function () {

                    closeUpazilaFormPanel();

                }
            );

        }


        /* ---------------------------------------------
           Cancel
           --------------------------------------------- */

        if (cancelUpazilaButton) {

            cancelUpazilaButton.addEventListener(
                "click",
                function () {

                    closeUpazilaFormPanel();

                }
            );

        }


        /* ---------------------------------------------
           Auto Slug
           --------------------------------------------- */

        if (upazilaName) {

            upazilaName.addEventListener(
                "input",
                handleNameInput
            );

        }


        /* ---------------------------------------------
           Submit
           --------------------------------------------- */

        if (upazilaForm) {

            upazilaForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveUpazila();

                }
            );

        }

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initializeUpazila() {

        if (!upazilaFormPanel) {

            return;

        }


        updatePermissionUI();

        setupEvents();

        loadDistrictOptions();

    }


    /* =====================================================
       WAIT FOR ADMIN GUARD
       ===================================================== */

    function waitForAdmin() {

        const admin =
            window.DorkariAdmin;


        if (
            admin &&
            typeof admin.getSupabase ===
            "function" &&
            typeof admin.getProfile ===
            "function" &&
            typeof admin.canManageContent ===
            "function"
        ) {

            const profile =
                admin.getProfile();


            /*
             * Admin profile is loaded asynchronously.
             * Wait until it is available.
             */

            if (!profile) {

                window.setTimeout(
                    waitForAdmin,
                    100
                );

                return;

            }


            initializeUpazila();

            return;

        }


        window.setTimeout(
            waitForAdmin,
            100
        );

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DorkariUpazila = {

        openForm:
            openUpazilaForm,

        closeForm:
            closeUpazilaFormPanel,

        resetForm:
            resetUpazilaForm,

        reloadDistricts:
            loadDistrictOptions,

        validateForm:
            validateUpazilaForm,

        save:
            saveUpazila

    };


    /* =====================================================
       START
       ===================================================== */

    waitForAdmin();


})();
