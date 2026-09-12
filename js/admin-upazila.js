/* =========================================================
   DORKARI — ADMIN UPAZILA MANAGEMENT
   F-7.4 — UPAZILA LIST + ADD
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLE_UPAZILAS =
        "upazilas";

    const PAGE_SIZE =
        10;


    /* =====================================================
       STATE
       ===================================================== */

    let supabaseClient =
        null;

    let allUpazilas =
        [];

    let filteredUpazilas =
        [];

    let currentPage =
        1;


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
       LIST ELEMENTS
       ===================================================== */

    const upazilaSearch =
        document.getElementById(
            "upazilaSearch"
        );

    const upazilaDivisionFilter =
        document.getElementById(
            "upazilaDivisionFilter"
        );

    const upazilaDistrictFilter =
        document.getElementById(
            "upazilaDistrictFilter"
        );

    const upazilaStatusFilter =
        document.getElementById(
            "upazilaStatusFilter"
        );

    const upazilaLoadingState =
        document.getElementById(
            "upazilaLoadingState"
        );

    const upazilaEmptyState =
        document.getElementById(
            "upazilaEmptyState"
        );

    const upazilaErrorState =
        document.getElementById(
            "upazilaErrorState"
        );

    const upazilaTable =
        document.getElementById(
            "upazilaTable"
        );

    const upazilaTableBody =
        document.getElementById(
            "upazilaTableBody"
        );

    const upazilaPagination =
        document.getElementById(
            "upazilaPagination"
        );

    const upazilaPaginationInfo =
        document.getElementById(
            "upazilaPaginationInfo"
        );

    const upazilaPaginationControls =
        document.getElementById(
            "upazilaPaginationControls"
        );


    /* =====================================================
       ADMIN
       ===================================================== */

    function getAdmin() {

        return window.DorkariAdmin ||
            null;

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    function initializeSupabase() {

        const admin =
            getAdmin();


        if (
            !admin ||
            typeof admin.getSupabase !==
            "function"
        ) {

            return false;

        }


        supabaseClient =
            admin.getSupabase();


        return !!supabaseClient;

    }


    /* =====================================================
       TEXT HELPERS
       ===================================================== */

    function cleanText(value) {

        return String(
            value || ""
        ).trim();

    }


    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function formatNumber(value) {

        return Number(
            value || 0
        ).toLocaleString(
            "bn-BD"
        );

    }


    function formatDate(value) {

        if (!value) {

            return "—";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleDateString(
            "bn-BD",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message,
        type
    ) {

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
       LOAD DISTRICTS FOR ADD FORM
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
       FORM VALIDATION
       ===================================================== */

    function validateUpazilaForm() {

        clearFormErrors();


        let isValid =
            true;


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
       LIST STATES
       ===================================================== */

    function hideListStates() {

        if (upazilaLoadingState) {

            upazilaLoadingState.hidden =
                true;

        }


        if (upazilaEmptyState) {

            upazilaEmptyState.hidden =
                true;

        }


        if (upazilaErrorState) {

            upazilaErrorState.hidden =
                true;

        }

    }


    function showListLoading() {

        hideListStates();


        if (upazilaTable) {

            upazilaTable.hidden =
                true;

        }


        if (upazilaPagination) {

            upazilaPagination.hidden =
                true;

        }


        if (upazilaLoadingState) {

            upazilaLoadingState.hidden =
                false;

        }

    }


    function showListEmpty() {

        hideListStates();


        if (upazilaTable) {

            upazilaTable.hidden =
                true;

        }


        if (upazilaPagination) {

            upazilaPagination.hidden =
                true;

        }


        if (upazilaEmptyState) {

            upazilaEmptyState.hidden =
                false;

        }

    }


    function showListError(
        message
    ) {

        hideListStates();


        if (upazilaTable) {

            upazilaTable.hidden =
                true;

        }


        if (upazilaPagination) {

            upazilaPagination.hidden =
                true;

        }


        const errorText =
            upazilaErrorState
                ? upazilaErrorState.querySelector(
                    "p"
                )
                : null;


        if (errorText) {

            errorText.textContent =
                message;

        }


        if (upazilaErrorState) {

            upazilaErrorState.hidden =
                false;

        }

    }


    /* =====================================================
       LOAD UPAZILAS FROM SUPABASE
       ===================================================== */

    async function loadUpazilas() {

        showListLoading();


        if (!supabaseClient) {

            if (
                !initializeSupabase()
            ) {

                showListError(
                    "Supabase connection পাওয়া যায়নি।"
                );

                return;

            }

        }


        const {
            data,
            error
        } = await supabaseClient
            .from(
                TABLE_UPAZILAS
            )
            .select(`
                id,
                district_id,
                name,
                name_bn,
                slug,
                is_active,
                created_at,
                districts (
                    id,
                    name,
                    name_bn,
                    division_id,
                    divisions (
                        id,
                        name,
                        name_bn
                    )
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Upazila load error:",
                error
            );


            showListError(
                error.message ||
                "Upazila data লোড করা যায়নি।"
            );


            return;

        }


        allUpazilas =
            data || [];


        filteredUpazilas =
            allUpazilas.filter(
                function (upazila) {

                    return (
                        upazila.is_active ===
                        true
                    );

                }
            );


        currentPage =
            1;


        renderUpazilaTable();

    }


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function renderUpazilaTable() {

        if (!upazilaTableBody) {

            return;

        }


        const total =
            filteredUpazilas.length;


        if (total === 0) {

            showListEmpty();

            updatePaginationInfo();

            return;

        }


        hideListStates();


        if (upazilaTable) {

            upazilaTable.hidden =
                false;

        }


        const start =
            (currentPage - 1) *
            PAGE_SIZE;


        const end =
            start +
            PAGE_SIZE;


        const pageItems =
            filteredUpazilas.slice(
                start,
                end
            );


        upazilaTableBody.innerHTML =
            pageItems
                .map(
                    function (upazila) {

                        return createUpazilaRow(
                            upazila
                        );

                    }
                )
                .join("");


        renderPagination();

    }


    /* =====================================================
       CREATE TABLE ROW
       ===================================================== */

    function createUpazilaRow(
        upazila
    ) {

        const district =
            upazila.districts ||
            {};


        const division =
            district.divisions ||
            {};


        const statusClass =
            upazila.is_active
                ? "crud-status-active"
                : "crud-status-inactive";


        const statusText =
            upazila.is_active
                ? "Active"
                : "Inactive";


        return `
            <tr>

                <td>

                    <div class="location-table-name">

                        <strong>
                            ${escapeHTML(
                                upazila.name_bn ||
                                upazila.name ||
                                "—"
                            )}
                        </strong>

                        ${
                            upazila.name &&
                            upazila.name_bn
                                ? `
                                    <small>
                                        ${escapeHTML(
                                            upazila.name
                                        )}
                                    </small>
                                  `
                                : ""
                        }

                    </div>

                </td>


                <td>

                    <div class="location-table-name">

                        <strong>
                            ${escapeHTML(
                                district.name_bn ||
                                district.name ||
                                "—"
                            )}
                        </strong>

                        ${
                            district.name &&
                            district.name_bn
                                ? `
                                    <small>
                                        ${escapeHTML(
                                            district.name
                                        )}
                                    </small>
                                  `
                                : ""
                        }

                    </div>

                </td>


                <td>

                    <div class="location-table-name">

                        <strong>
                            ${escapeHTML(
                                division.name_bn ||
                                division.name ||
                                "—"
                            )}
                        </strong>

                        ${
                            division.name &&
                            division.name_bn
                                ? `
                                    <small>
                                        ${escapeHTML(
                                            division.name
                                        )}
                                    </small>
                                  `
                                : ""
                        }

                    </div>

                </td>


                <td>

                    <code>
                        ${escapeHTML(
                            upazila.slug
                        )}
                    </code>

                </td>


                <td>

                    <span
                        class="crud-status ${statusClass}"
                    >
                        ${statusText}
                    </span>

                </td>


                <td>

                    ${formatDate(
                        upazila.created_at
                    )}

                </td>


                <td>

                    <span class="crud-muted">
                        —
                    </span>

                </td>

            </tr>
        `;

    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function updatePaginationInfo() {

        if (!upazilaPaginationInfo) {

            return;

        }


        const total =
            filteredUpazilas.length;


        if (total === 0) {

            upazilaPaginationInfo.textContent =
                "Showing 0 upazilas";

            return;

        }


        const start =
            ((currentPage - 1) *
            PAGE_SIZE) + 1;


        const end =
            Math.min(
                currentPage *
                PAGE_SIZE,
                total
            );


        upazilaPaginationInfo.textContent =
            `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)} upazilas`;

    }


    function renderPagination() {

        if (!upazilaPagination) {

            return;

        }


        const total =
            filteredUpazilas.length;


        const totalPages =
            Math.ceil(
                total /
                PAGE_SIZE
            );


        updatePaginationInfo();


        if (
            totalPages <= 1
        ) {

            upazilaPagination.hidden =
                true;

            return;

        }


        upazilaPagination.hidden =
            false;


        if (
            !upazilaPaginationControls
        ) {

            return;

        }


        let html =
            "";


        html += `
            <button
                type="button"
                class="crud-pagination-btn"
                data-upazila-page="prev"
                ${currentPage === 1 ? "disabled" : ""}
            >
                ←
            </button>
        `;


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            html += `
                <button
                    type="button"
                    class="crud-pagination-btn ${
                        page === currentPage
                            ? "active"
                            : ""
                    }"
                    data-upazila-page="${page}"
                >
                    ${page}
                </button>
            `;

        }


        html += `
            <button
                type="button"
                class="crud-pagination-btn"
                data-upazila-page="next"
                ${
                    currentPage === totalPages
                        ? "disabled"
                        : ""
                }
            >
                →
            </button>
        `;


        upazilaPaginationControls.innerHTML =
            html;

    }


    function handlePagination(
        event
    ) {

        const button =
            event.target.closest(
                "[data-upazila-page]"
            );


        if (!button) {

            return;

        }


        const value =
            button.dataset
                .upazilaPage;


        const totalPages =
            Math.ceil(
                filteredUpazilas.length /
                PAGE_SIZE
            );


        if (
            value === "prev"
        ) {

            if (
                currentPage > 1
            ) {

                currentPage--;

                renderUpazilaTable();

            }

            return;

        }


        if (
            value === "next"
        ) {

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderUpazilaTable();

            }

            return;

        }


        const page =
            Number(value);


        if (
            Number.isInteger(page) &&
            page >= 1 &&
            page <= totalPages
        ) {

            currentPage =
                page;

            renderUpazilaTable();

        }

    }


    /* =====================================================
       FILTER — BASIC CURRENT STATUS
       ===================================================== */

    function applyUpazilaFilters() {

        const search =
            cleanText(
                upazilaSearch
                    ? upazilaSearch.value
                    : ""
            ).toLowerCase();


        const status =
            upazilaStatusFilter
                ? upazilaStatusFilter.value
                : "active";


        filteredUpazilas =
            allUpazilas.filter(
                function (upazila) {

                    /* Search */

                    if (search) {

                        const district =
                            upazila.districts ||
                            {};

                        const division =
                            district.divisions ||
                            {};

                        const searchText =
                            [
                                upazila.name,
                                upazila.name_bn,
                                upazila.slug,
                                district.name,
                                district.name_bn,
                                division.name,
                                division.name_bn
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();


                        if (
                            !searchText.includes(
                                search
                            )
                        ) {

                            return false;

                        }

                    }


                    /* Status */

                    if (
                        status ===
                        "active" &&
                        upazila.is_active !==
                        true
                    ) {

                        return false;

                    }


                    if (
                        status ===
                        "inactive" &&
                        upazila.is_active !==
                        false
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        currentPage =
            1;


        renderUpazilaTable();

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
       SAVE UPAZILA
       ===================================================== */

    async function saveUpazila() {

        if (
            !validateUpazilaForm()
        ) {

            return;

        }


        const admin =
            getAdmin();


        if (
            !admin ||
            typeof admin.canManageContent !==
            "function" ||
            !admin.canManageContent()
        ) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "warning"
            );

            return;

        }


        if (!supabaseClient) {

            if (
                !initializeSupabase()
            ) {

                showToast(
                    "Supabase connection পাওয়া যায়নি।",
                    "error"
                );

                return;

            }

        }


        const payload = {

            district_id:
                cleanText(
                    upazilaDistrict.value
                ),

            name:
                cleanText(
                    upazilaName.value
                ),

            name_bn:
                cleanText(
                    upazilaNameBn.value
                ),

            slug:
                cleanText(
                    upazilaSlug.value
                ).toLowerCase(),

            is_active:
                upazilaIsActive
                    ? upazilaIsActive.checked
                    : true

        };


        if (saveUpazilaButton) {

            saveUpazilaButton.disabled =
                true;

            saveUpazilaButton.textContent =
                "Saving...";

        }


        try {

            const {
                error
            } = await supabaseClient
                .from(
                    TABLE_UPAZILAS
                )
                .insert(
                    payload
                );


            if (error) {

                if (
                    error.code ===
                    "23505"
                ) {

                    throw new Error(
                        "এই District-এর মধ্যে এই Slug ইতোমধ্যে আছে।"
                    );

                }


                if (
                    error.code ===
                    "23503"
                ) {

                    throw new Error(
                        "নির্বাচিত District সঠিক নয়।"
                    );

                }


                if (
                    error.code ===
                    "42501"
                ) {

                    throw new Error(
                        "আপনার এই কাজের অনুমতি নেই।"
                    );

                }


                throw error;

            }


            showToast(
                "Upazila সফলভাবে যোগ হয়েছে।",
                "success"
            );


            resetUpazilaForm();

            closeUpazilaFormPanel();


            /*
             * IMPORTANT:
             * Newly inserted Upazila immediately
             * appears in the list.
             */

            await loadUpazilas();

        } catch (error) {

            console.error(
                "Upazila save error:",
                error
            );


            showToast(
                error.message ||
                "Upazila সংরক্ষণ করতে সমস্যা হয়েছে।",
                "error"
            );

        } finally {

            if (saveUpazilaButton) {

                const adminNow =
                    getAdmin();


                saveUpazilaButton.disabled =
                    !(
                        adminNow &&
                        typeof adminNow
                            .canManageContent ===
                        "function" &&
                        adminNow
                            .canManageContent()
                    );


                saveUpazilaButton.textContent =
                    "Save Upazila";

            }

        }

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function setupEvents() {

        if (
            sectionAddUpazilaButton
        ) {

            sectionAddUpazilaButton
                .addEventListener(
                    "click",
                    function () {

                        resetUpazilaForm();

                        openUpazilaForm();

                    }
                );

        }


        if (closeUpazilaForm) {

            closeUpazilaForm
                .addEventListener(
                    "click",
                    closeUpazilaFormPanel
                );

        }


        if (cancelUpazilaButton) {

            cancelUpazilaButton
                .addEventListener(
                    "click",
                    closeUpazilaFormPanel
                );

        }


        if (upazilaName) {

            upazilaName
                .addEventListener(
                    "input",
                    handleNameInput
                );

        }


        if (upazilaForm) {

            upazilaForm
                .addEventListener(
                    "submit",
                    function (event) {

                        event.preventDefault();

                        saveUpazila();

                    }
                );

        }


        if (upazilaSearch) {

            upazilaSearch
                .addEventListener(
                    "input",
                    applyUpazilaFilters
                );

        }


        if (upazilaStatusFilter) {

            upazilaStatusFilter
                .addEventListener(
                    "change",
                    applyUpazilaFilters
                );

        }


        if (
            upazilaPaginationControls
        ) {

            upazilaPaginationControls
                .addEventListener(
                    "click",
                    handlePagination
                );

        }

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initializeUpazila() {

        if (!upazilaFormPanel) {

            return;

        }


        if (
            !initializeSupabase()
        ) {

            showListError(
                "Supabase connection পাওয়া যায়নি।"
            );

            return;

        }


        setupEvents();

        loadDistrictOptions();

        await loadUpazilas();

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
            "function"
        ) {

            const profile =
                admin.getProfile();


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

        reload:
            loadUpazilas,

        refresh:
            loadUpazilas,

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
