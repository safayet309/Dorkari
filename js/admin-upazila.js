/* =========================================================
   DORKARI — ADMIN UPAZILA MANAGEMENT
   F-7.4 — UI FOUNDATION
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const sectionAddUpazilaButton =
        document.getElementById("sectionAddUpazilaButton");

    const upazilaFormPanel =
        document.getElementById("upazilaFormPanel");

    const closeUpazilaForm =
        document.getElementById("closeUpazilaForm");

    const cancelUpazilaButton =
        document.getElementById("cancelUpazilaButton");

    const upazilaForm =
        document.getElementById("upazilaForm");

    const upazilaDistrict =
        document.getElementById("upazilaDistrict");

    const upazilaName =
        document.getElementById("upazilaName");

    const upazilaSlug =
        document.getElementById("upazilaSlug");


    /* =====================================================
       SLUG
       ===================================================== */

    function cleanText(value) {

        return String(value || "").trim();

    }


    function slugify(value) {

        return cleanText(value)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

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

            upazilaSlug.value = "";

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
            typeof districtAPI.getDistricts !== "function"
        ) {

            window.setTimeout(
                loadDistrictOptions,
                200
            );

            return;

        }


        const districts =
            districtAPI.getDistricts();


        /*
         * Only active Districts should be available
         * for creating an Upazila.
         */

        const activeDistricts =
            (districts || []).filter(
                function (district) {

                    return district.is_active === true;

                }
            );


        upazilaDistrict.innerHTML = "";


        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";

        defaultOption.textContent =
            "District নির্বাচন করুন";

        upazilaDistrict.appendChild(
            defaultOption
        );


        activeDistricts.forEach(
            function (district) {

                const option =
                    document.createElement("option");


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
       FORM VALIDATION
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
                    document.getElementById(id);


                if (element) {

                    element.textContent = "";

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
                    document.getElementById(id);


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


    function validateUpazilaForm() {

        clearFormErrors();


        let isValid = true;


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

            isValid = false;

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

            isValid = false;

        }


        /* ---------------------------------------------
           Bangla Name
           --------------------------------------------- */

        const upazilaNameBn =
            document.getElementById(
                "upazilaNameBn"
            );


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

            isValid = false;

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

            isValid = false;

        }


        return isValid;

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


        const firstField =
            document.getElementById(
                "upazilaDistrict"
            );


        if (firstField) {

            firstField.focus();

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


        const isActive =
            document.getElementById(
                "upazilaIsActive"
            );


        if (isActive) {

            isActive.checked = true;

        }


        clearFormErrors();

    }


    /* =====================================================
       ADD BUTTON
       ===================================================== */

    if (sectionAddUpazilaButton) {

        sectionAddUpazilaButton.addEventListener(
            "click",
            function () {

                resetUpazilaForm();

                openUpazilaForm();

            }
        );

    }


    /* =====================================================
       CLOSE BUTTON
       ===================================================== */

    if (closeUpazilaForm) {

        closeUpazilaForm.addEventListener(
            "click",
            function () {

                closeUpazilaFormPanel();

            }
        );

    }


    /* =====================================================
       CANCEL BUTTON
       ===================================================== */

    if (cancelUpazilaButton) {

        cancelUpazilaButton.addEventListener(
            "click",
            function () {

                closeUpazilaFormPanel();

            }
        );

    }


    /* =====================================================
       AUTO SLUG
       ===================================================== */

    if (upazilaName) {

        upazilaName.addEventListener(
            "input",
            handleNameInput
        );

    }


    /* =====================================================
       FORM SUBMIT — VALIDATION ONLY
       ===================================================== */

    if (upazilaForm) {

        upazilaForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const isValid =
                    validateUpazilaForm();


                if (!isValid) {

                    console.log(
                        "Upazila form validation failed."
                    );

                    return;

                }


                console.log(
                    "Upazila form validation passed. Supabase insert will be added next."
                );

            }
        );

    }


    /* =====================================================
       INITIAL DISTRICT LOAD
       ===================================================== */

    loadDistrictOptions();


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DorkariUpazila = {

        openForm:
            openUpazilaForm,

        closeForm:
            closeUpazilaForm,

        resetForm:
            resetUpazilaForm,

        reloadDistricts:
            loadDistrictOptions,

        validateForm:
            validateUpazilaForm

    };


})();
