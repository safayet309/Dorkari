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
       OPEN FORM
       ===================================================== */

    function openUpazilaForm() {

        if (!upazilaFormPanel) {
            return;
        }


        /*
         * Make sure District options are available
         * whenever the form opens.
         */

        loadDistrictOptions();


        upazilaFormPanel.classList.add("active");


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
       CLEAR ERRORS
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
       FORM SUBMIT — TEMPORARY UI ONLY
       ===================================================== */

    if (upazilaForm) {

        upazilaForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                console.log(
                    "Upazila form submit — Supabase logic will be added next."
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
            loadDistrictOptions

    };


})();
