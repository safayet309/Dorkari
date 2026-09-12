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


    /* =====================================================
       OPEN FORM
       ===================================================== */

    function openUpazilaForm() {

        if (!upazilaFormPanel) {
            return;
        }

        upazilaFormPanel.classList.add("active");

        const firstField =
            document.getElementById("upazilaDistrict");

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

        upazilaFormPanel.classList.remove("active");
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
            document.getElementById("upazilaIsActive");

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

        errors.forEach(function (id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent = "";

                element.classList.remove("show");
            }
        });


        const fields = [
            "upazilaDistrict",
            "upazilaName",
            "upazilaNameBn",
            "upazilaSlug"
        ];

        fields.forEach(function (id) {

            const element =
                document.getElementById(id);

            if (element) {
                element.classList.remove("is-invalid");
            }
        });
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
       PUBLIC API
       ===================================================== */

    window.DorkariUpazila = {

        openForm: openUpazilaForm,

        closeForm: closeUpazilaFormPanel,

        resetForm: resetUpazilaForm

    };

})();
