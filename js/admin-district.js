// =====================================================
// Dorkari - Admin District Management
// F-7.3.2
// =====================================================

(function () {

    "use strict";


    // =================================================
    // CONFIG
    // =================================================

    const TABLE_DISTRICTS = "districts";
    const TABLE_DIVISIONS = "divisions";

    const PAGE_SIZE = 10;


    // =================================================
    // STATE
    // =================================================

    let supabaseClient = null;

    let currentPage = 1;

    let editingDistrictId = null;

    let allDistricts = [];

    let filteredDistricts = [];

    let allDivisions = [];


    // =================================================
    // DOM
    // =================================================

    const districtSection =
        document.getElementById(
            "districtManagementSection"
        );

    const districtFormPanel =
        document.getElementById(
            "districtFormPanel"
        );

    const districtForm =
        document.getElementById(
            "districtForm"
        );

    const districtFormTitle =
        document.getElementById(
            "districtFormTitle"
        );

    const districtDivision =
        document.getElementById(
            "districtDivision"
        );

    const districtName =
        document.getElementById(
            "districtName"
        );

    const districtNameBn =
        document.getElementById(
            "districtNameBn"
        );

    const districtSlug =
        document.getElementById(
            "districtSlug"
        );

    const districtIsActive =
        document.getElementById(
            "districtIsActive"
        );

    const districtSearch =
        document.getElementById(
            "districtSearch"
        );

    const districtDivisionFilter =
        document.getElementById(
            "districtDivisionFilter"
        );

    const districtStatusFilter =
        document.getElementById(
            "districtStatusFilter"
        );

    const districtLoadingState =
        document.getElementById(
            "districtLoadingState"
        );

    const districtEmptyState =
        document.getElementById(
            "districtEmptyState"
        );

    const districtErrorState =
        document.getElementById(
            "districtErrorState"
        );

    const districtErrorMessage =
        document.getElementById(
            "districtErrorMessage"
        );

    const districtTable =
        document.getElementById(
            "districtTable"
        );

    const districtTableBody =
        document.getElementById(
            "districtTableBody"
        );

    const districtPagination =
        document.getElementById(
            "districtPagination"
        );

    const districtPaginationInfo =
        document.getElementById(
            "districtPaginationInfo"
        );

    const districtPaginationControls =
        document.getElementById(
            "districtPaginationControls"
        );

    const sectionAddDistrictButton =
        document.getElementById(
            "sectionAddDistrictButton"
        );

    const closeDistrictForm =
        document.getElementById(
            "closeDistrictForm"
        );

    const cancelDistrictButton =
        document.getElementById(
            "cancelDistrictButton"
        );

    const saveDistrictButton =
        document.getElementById(
            "saveDistrictButton"
        );


    // =================================================
    // BASIC HELPERS
    // =================================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function cleanText(value) {

        return String(value ?? "").trim();

    }


    function formatNumber(value) {

        return Number(value || 0)
            .toLocaleString("bn-BD");

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
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


    function slugify(value) {

        return cleanText(value)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

    }


    // =================================================
    // TOAST
    // =================================================

    function showToast(message, type = "success") {

        const toast =
            document.getElementById("adminToast");

        const toastMessage =
            document.getElementById(
                "adminToastMessage"
            );

        if (!toast || !toastMessage) {
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

        toast.classList.add(type);

        requestAnimationFrame(function () {

            toast.classList.add("show");

        });

        window.clearTimeout(
            showToast.timer
        );

        showToast.timer =
            window.setTimeout(function () {

                toast.classList.remove("show");

            }, 2800);

    }


    // =================================================
    // PERMISSION
    // =================================================

    function canManageDistrict() {

        const admin =
            window.DorkariAdmin;

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
            canManageDistrict();

        if (sectionAddDistrictButton) {

            sectionAddDistrictButton.hidden =
                !allowed;

        }

        if (saveDistrictButton) {

            saveDistrictButton.disabled =
                !allowed;

        }

    }


    // =================================================
    // SUPABASE
    // =================================================

    function initializeSupabase() {

        if (
            !window.DorkariAdmin ||
            typeof window.DorkariAdmin.getSupabase !==
            "function"
        ) {
            return false;
        }

        supabaseClient =
            window.DorkariAdmin.getSupabase();

        return !!supabaseClient;

    }


    // =================================================
    // FORM ERRORS
    // =================================================

    function clearFormErrors() {

        const errors = [
            "districtDivisionError",
            "districtNameError",
            "districtNameBnError",
            "districtSlugError"
        ];

        errors.forEach(function (id) {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = "";
            }

        });


        [
            districtDivision,
            districtName,
            districtNameBn,
            districtSlug
        ].forEach(function (element) {

            if (element) {

                element.classList.remove(
                    "has-error"
                );

            }

        });

    }


    function setFieldError(
        field,
        errorId,
        message
    ) {

        if (field) {

            field.classList.add(
                "has-error"
            );

        }

        const error =
            document.getElementById(
                errorId
            );

        if (error) {

            error.textContent =
                message;

        }

    }


    // =================================================
    // FORM
    // =================================================

    function resetDistrictForm() {

        if (!districtForm) {
            return;
        }


        districtForm.reset();

        editingDistrictId = null;

        clearFormErrors();


        if (districtFormTitle) {

            districtFormTitle.textContent =
                "Add District";

        }


        if (districtIsActive) {

            districtIsActive.checked =
                true;

        }


        if (saveDistrictButton) {

            saveDistrictButton.textContent =
                "Save District";

            saveDistrictButton.disabled =
                !canManageDistrict();

        }

    }


    // =================================================
    // OPEN FORM
    // =================================================

    function openDistrictForm(district = null) {

        // =============================================
        // Permission Check
        // =============================================

        if (!canManageDistrict()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "warning"
            );

            return;

        }


        // =============================================
        // Reset Form
        // =============================================

        resetDistrictForm();


        // =============================================
        // EDIT MODE
        // =============================================

        if (district) {

            editingDistrictId =
                district.id;


            if (districtFormTitle) {

                districtFormTitle.textContent =
                    "Edit District";

            }


            if (districtDivision) {

                districtDivision.value =
                    district.division_id || "";

            }


            if (districtName) {

                districtName.value =
                    district.name || "";

            }


            if (districtNameBn) {

                districtNameBn.value =
                    district.name_bn || "";

            }


            if (districtSlug) {

                districtSlug.value =
                    district.slug || "";

            }


            if (districtIsActive) {

                districtIsActive.checked =
                    district.is_active !== false;

            }


            if (saveDistrictButton) {

                saveDistrictButton.textContent =
                    "Update District";

            }

        }


        // =============================================
        // OPEN FORM
        // =============================================

        if (districtFormPanel) {

            districtFormPanel.classList.add(
                "active"
            );

            districtFormPanel.hidden = false;

            districtFormPanel.removeAttribute(
                "aria-hidden"
            );


            window.setTimeout(function () {

                districtFormPanel.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 50);

        }


        // =============================================
        // Focus
        // =============================================

        if (districtName) {

            window.setTimeout(function () {

                districtName.focus();

            }, 150);

        }

    }


    // =================================================
    // CLOSE FORM
    // =================================================

    function closeDistrictFormPanel() {

        if (districtFormPanel) {

            districtFormPanel.classList.remove(
                "active"
            );

            districtFormPanel.hidden = true;

            districtFormPanel.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        resetDistrictForm();

    }


    // =================================================
    // LOAD DIVISIONS
    // =================================================

    async function loadDivisions() {

        if (!supabaseClient) {
            return;
        }


        const {
            data,
            error
        } = await supabaseClient
            .from(TABLE_DIVISIONS)
            .select(
                "id,name,name_bn,slug,is_active"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "name_bn",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Division load error:",
                error
            );

            showToast(
                "Division data লোড করা যায়নি।",
                "error"
            );

            return;

        }


        allDivisions =
            data || [];

        renderDivisionOptions();

    }


    function renderDivisionOptions() {

        if (!districtDivision) {
            return;
        }


        const currentValue =
            districtDivision.value;


        districtDivision.innerHTML =
            `
            <option value="">
                Division নির্বাচন করুন
            </option>
            `;


        allDivisions.forEach(
            function (division) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    division.id;


                option.textContent =
                    division.name_bn ||
                    division.name;


                districtDivision.appendChild(
                    option
                );

            }
        );


        if (
            currentValue &&
            allDivisions.some(
                function (item) {

                    return (
                        item.id ===
                        currentValue
                    );

                }
            )
        ) {

            districtDivision.value =
                currentValue;

        }

    }


    function renderDivisionFilter() {

        if (!districtDivisionFilter) {
            return;
        }


        const currentValue =
            districtDivisionFilter.value;


        districtDivisionFilter.innerHTML =
            `
            <option value="">
                সব Division
            </option>
            `;


        allDivisions.forEach(
            function (division) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    division.id;


                option.textContent =
                    division.name_bn ||
                    division.name;


                districtDivisionFilter.appendChild(
                    option
                );

            }
        );


        if (
            currentValue &&
            allDivisions.some(
                function (item) {

                    return (
                        item.id ===
                        currentValue
                    );

                }
            )
        ) {

            districtDivisionFilter.value =
                currentValue;

        }

    }


    // =================================================
    // LOAD DISTRICTS
    // =================================================

    async function loadDistricts() {

        showDistrictLoading();

        if (!supabaseClient) {

            showDistrictError(
                "Supabase connection পাওয়া যায়নি।"
            );

            return;

        }


        const {
            data,
            error
        } = await supabaseClient
            .from(TABLE_DISTRICTS)
            .select(`
                id,
                division_id,
                name,
                name_bn,
                slug,
                is_active,
                created_at,
                divisions (
                    id,
                    name,
                    name_bn
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
                "District load error:",
                error
            );

            showDistrictError(
                getSupabaseErrorMessage(
                    error
                )
            );

            return;

        }


        allDistricts =
            data || [];

        applyDistrictFilters();

    }


    // =================================================
    // FILTER
    // =================================================

    function applyDistrictFilters() {

        const search =
            cleanText(
                districtSearch
                    ? districtSearch.value
                    : ""
            ).toLowerCase();

        const divisionId =
            districtDivisionFilter
                ? districtDivisionFilter.value
                : "";

        const status =
            districtStatusFilter
                ? districtStatusFilter.value
                : "active";


        filteredDistricts =
            allDistricts.filter(
                function (district) {

                    // -----------------------------
                    // Search
                    // -----------------------------

                    const searchable =
                        [
                            district.name,
                            district.name_bn,
                            district.slug,
                            district.divisions
                                ? district.divisions.name
                                : "",
                            district.divisions
                                ? district.divisions.name_bn
                                : ""
                        ]
                        .join(" ")
                        .toLowerCase();


                    if (
                        search &&
                        !searchable.includes(
                            search
                        )
                    ) {

                        return false;

                    }


                    // -----------------------------
                    // Division
                    // -----------------------------

                    if (
                        divisionId &&
                        district.division_id !==
                        divisionId
                    ) {

                        return false;

                    }


                    // -----------------------------
                    // Status
                    // -----------------------------

                    if (
                        status === "active" &&
                        district.is_active !== true
                    ) {

                        return false;

                    }


                    if (
                        status === "inactive" &&
                        district.is_active !== false
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        currentPage = 1;

        renderDistrictTable();

    }


    // =================================================
    // TABLE
    // =================================================

    function renderDistrictTable() {

        if (!districtTableBody) {
            return;
        }


        const total =
            filteredDistricts.length;


        if (total === 0) {

            showDistrictEmpty();

            return;

        }


        hideDistrictStates();

        districtTable.hidden = false;


        const start =
            (currentPage - 1) *
            PAGE_SIZE;

        const end =
            start + PAGE_SIZE;


        const pageItems =
            filteredDistricts.slice(
                start,
                end
            );


        districtTableBody.innerHTML =
            pageItems
                .map(
                    function (district) {

                        return createDistrictRow(
                            district
                        );

                    }
                )
                .join("");


        renderPagination();

    }


    function createDistrictRow(
        district
    ) {

        const division =
            district.divisions || {};


        const statusClass =
            district.is_active
                ? "crud-status-active"
                : "crud-status-inactive";


        const statusText =
            district.is_active
                ? "Active"
                : "Inactive";


        let actions = "";


        if (canManageDistrict()) {

            actions =
                `
                <div class="crud-table-actions">

                    <button
                        type="button"
                        class="crud-action-btn crud-action-edit"
                        data-district-action="edit"
                        data-id="${escapeHTML(district.id)}"
                    >
                        Edit
                    </button>

                    ${
                        district.is_active
                            ? `
                                <button
                                    type="button"
                                    class="crud-action-btn crud-action-delete"
                                    data-district-action="deactivate"
                                    data-id="${escapeHTML(district.id)}"
                                >
                                    Delete
                                </button>
                              `
                            : `
                                <button
                                    type="button"
                                    class="crud-action-btn crud-action-activate"
                                    data-district-action="activate"
                                    data-id="${escapeHTML(district.id)}"
                                >
                                    Activate
                                </button>
                              `
                    }

                </div>
                `;

        } else {

            actions =
                `<span class="crud-muted">View only</span>`;

        }


        return `
            <tr>

                <td>

                    <div class="location-table-name">

                        <strong>
                            ${escapeHTML(
                                district.name_bn ||
                                district.name
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
                            district.slug
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
                        district.created_at
                    )}
                </td>


                <td>
                    ${actions}
                </td>

            </tr>
        `;

    }


    // =================================================
    // PAGINATION
    // =================================================

    function renderPagination() {

        if (!districtPagination) {
            return;
        }


        const total =
            filteredDistricts.length;


        const totalPages =
            Math.ceil(
                total / PAGE_SIZE
            );


        if (totalPages <= 1) {

            districtPagination.hidden =
                true;

            return;

        }


        districtPagination.hidden =
            false;


        const start =
            ((currentPage - 1) *
            PAGE_SIZE) + 1;


        const end =
            Math.min(
                currentPage * PAGE_SIZE,
                total
            );


        if (districtPaginationInfo) {

            districtPaginationInfo.textContent =
                `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)} districts`;

        }


        if (!districtPaginationControls) {
            return;
        }


        let html = "";


        html += `
            <button
                type="button"
                class="crud-pagination-btn"
                data-district-page="prev"
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

            if (
                totalPages > 7 &&
                page > 3 &&
                page < totalPages - 2 &&
                Math.abs(
                    page - currentPage
                ) > 1
            ) {

                if (
                    page === 4 ||
                    page === totalPages - 3
                ) {

                    html += `
                        <span class="crud-pagination-dots">
                            …
                        </span>
                    `;

                }

                continue;

            }


            html += `
                <button
                    type="button"
                    class="crud-pagination-btn ${
                        page === currentPage
                            ? "active"
                            : ""
                    }"
                    data-district-page="${page}"
                >
                    ${page}
                </button>
            `;

        }


        html += `
            <button
                type="button"
                class="crud-pagination-btn"
                data-district-page="next"
                ${currentPage === totalPages ? "disabled" : ""}
            >
                →
            </button>
        `;


        districtPaginationControls.innerHTML =
            html;

    }


    function changePage(page) {

        const totalPages =
            Math.ceil(
                filteredDistricts.length /
                PAGE_SIZE
            );


        if (
            page < 1 ||
            page > totalPages
        ) {

            return;

        }


        currentPage =
            page;

        renderDistrictTable();

    }


    // =================================================
    // STATES
    // =================================================

    function hideDistrictStates() {

        if (districtLoadingState) {

            districtLoadingState.hidden =
                true;

        }


        if (districtEmptyState) {

            districtEmptyState.hidden =
                true;

        }


        if (districtErrorState) {

            districtErrorState.hidden =
                true;

        }

    }


    function showDistrictLoading() {

        hideDistrictStates();


        if (districtTable) {

            districtTable.hidden =
                true;

        }


        if (districtPagination) {

            districtPagination.hidden =
                true;

        }


        if (districtLoadingState) {

            districtLoadingState.hidden =
                false;

        }

    }


    function showDistrictEmpty() {

        hideDistrictStates();


        if (districtTable) {

            districtTable.hidden =
                true;

        }


        if (districtPagination) {

            districtPagination.hidden =
                true;

        }


        if (districtEmptyState) {

            districtEmptyState.hidden =
                false;

        }

    }


    function showDistrictError(
        message
    ) {

        hideDistrictStates();


        if (districtTable) {

            districtTable.hidden =
                true;

        }


        if (districtPagination) {

            districtPagination.hidden =
                true;

        }


        if (districtErrorMessage) {

            districtErrorMessage.textContent =
                message;

        }


        if (districtErrorState) {

            districtErrorState.hidden =
                false;

        }

    }


    // =================================================
    // VALIDATION
    // =================================================

    function validateDistrictForm() {

        clearFormErrors();

        let valid = true;


        if (
            !districtDivision ||
            !cleanText(
                districtDivision.value
            )
        ) {

            setFieldError(
                districtDivision,
                "districtDivisionError",
                "Division নির্বাচন করুন।"
            );

            valid = false;

        }


        if (
            !districtName ||
            !cleanText(
                districtName.value
            )
        ) {

            setFieldError(
                districtName,
                "districtNameError",
                "English name দিন।"
            );

            valid = false;

        }


        if (
            !districtNameBn ||
            !cleanText(
                districtNameBn.value
            )
        ) {

            setFieldError(
                districtNameBn,
                "districtNameBnError",
                "বাংলা নাম দিন।"
            );

            valid = false;

        }


        if (
            !districtSlug ||
            !cleanText(
                districtSlug.value
            )
        ) {

            setFieldError(
                districtSlug,
                "districtSlugError",
                "Slug দিন।"
            );

            valid = false;

        } else {

            const slug =
                cleanText(
                    districtSlug.value
                );


            if (
                !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                    slug
                )
            ) {

                setFieldError(
                    districtSlug,
                    "districtSlugError",
                    "Slug শুধু ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও hyphen হতে পারবে।"
                );

                valid = false;

            }

        }


        return valid;

    }


    // =================================================
    // DUPLICATE CHECK
    // =================================================

    async function checkDuplicateDistrict() {

        const divisionId =
            cleanText(
                districtDivision.value
            );


        const name =
            cleanText(
                districtName.value
            );


        const nameBn =
            cleanText(
                districtNameBn.value
            );


        const slug =
            cleanText(
                districtSlug.value
            );


        let query =
            supabaseClient
                .from(TABLE_DISTRICTS)
                .select(
                    "id,name,name_bn,slug,division_id"
                )
                .eq(
                    "division_id",
                    divisionId
                );


        const duplicateSearch = [
            `name.ilike.${name}`,
            `name_bn.ilike.${nameBn}`,
            `slug.ilike.${slug}`
        ].join(",");


        query =
            query.or(
                duplicateSearch
            );


        const {
            data,
            error
        } = await query;


        if (error) {

            throw error;

        }


        const duplicates =
            (data || []).filter(
                function (item) {

                    return item.id !==
                        editingDistrictId;

                }
            );


        return duplicates[0] || null;

    }


    // =================================================
    // SAVE
    // =================================================

    async function saveDistrict(
        event
    ) {

        event.preventDefault();


        if (!canManageDistrict()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "warning"
            );

            return;

        }


        if (!validateDistrictForm()) {

            return;

        }


        if (!supabaseClient) {

            showToast(
                "Supabase connection পাওয়া যায়নি।",
                "error"
            );

            return;

        }


        const divisionId =
            cleanText(
                districtDivision.value
            );


        const name =
            cleanText(
                districtName.value
            );


        const nameBn =
            cleanText(
                districtNameBn.value
            );


        const slug =
            cleanText(
                districtSlug.value
            ).toLowerCase();


        // =============================================
        // Division validation
        // =============================================

        const divisionExists =
            allDivisions.some(
                function (division) {

                    return (
                        division.id ===
                        divisionId
                    );

                }
            );


        if (!divisionExists) {

            setFieldError(
                districtDivision,
                "districtDivisionError",
                "নির্বাচিত Division সঠিক নয়।"
            );

            return;

        }


        // =============================================
        // Duplicate validation
        // =============================================

        if (saveDistrictButton) {

            saveDistrictButton.disabled =
                true;

            saveDistrictButton.textContent =
                editingDistrictId
                    ? "Updating..."
                    : "Saving...";

        }


        try {

            const duplicate =
                await checkDuplicateDistrict();


            if (duplicate) {

                if (
                    duplicate.slug
                        .toLowerCase() ===
                    slug
                ) {

                    setFieldError(
                        districtSlug,
                        "districtSlugError",
                        "এই Division-এর মধ্যে এই Slug ইতোমধ্যে আছে।"
                    );

                } else if (
                    duplicate.name
                        .toLowerCase() ===
                    name.toLowerCase()
                ) {

                    setFieldError(
                        districtName,
                        "districtNameError",
                        "এই Division-এর মধ্যে এই District ইতোমধ্যে আছে।"
                    );

                } else {

                    setFieldError(
                        districtNameBn,
                        "districtNameBnError",
                        "এই Division-এর মধ্যে এই District ইতোমধ্যে আছে।"
                    );

                }

                return;

            }


            const payload = {

                division_id:
                    divisionId,

                name:
                    name,

                name_bn:
                    nameBn,

                slug:
                    slug,

                is_active:
                    districtIsActive
                        ? districtIsActive.checked
                        : true

            };


            // =========================================
            // UPDATE
            // =========================================

            if (editingDistrictId) {

                const {
                    error
                } = await supabaseClient
                    .from(TABLE_DISTRICTS)
                    .update(payload)
                    .eq(
                        "id",
                        editingDistrictId
                    );


                if (error) {

                    throw error;

                }


                showToast(
                    "District সফলভাবে আপডেট হয়েছে।",
                    "success"
                );

            }


            // =========================================
            // INSERT
            // =========================================

            else {

                const {
                    error
                } = await supabaseClient
                    .from(TABLE_DISTRICTS)
                    .insert(
                        payload
                    );


                if (error) {

                    throw error;

                }


                showToast(
                    "District সফলভাবে যোগ হয়েছে।",
                    "success"
                );

            }


            closeDistrictFormPanel();

            await loadDistricts();


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
                "District save error:",
                error
            );


            showToast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            if (saveDistrictButton) {

                saveDistrictButton.disabled =
                    !canManageDistrict();

                saveDistrictButton.textContent =
                    editingDistrictId
                        ? "Update District"
                        : "Save District";

            }

        }

    }


    // =================================================
    // DELETE / ACTIVATE
    // =================================================

    async function changeDistrictStatus(
        id,
        active
    ) {

        if (!canManageDistrict()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "warning"
            );

            return;

        }


        if (!id) {
            return;
        }


        const district =
            allDistricts.find(
                function (item) {

                    return item.id === id;

                }
            );


        if (!district) {
            return;
        }


        const actionText =
            active
                ? "Activate"
                : "Delete";


        const confirmed =
            window.confirm(
                active
                    ? `“${district.name_bn || district.name}” District আবার Active করতে চান?`
                    : `“${district.name_bn || district.name}” District Deactivate করতে চান?`
            );


        if (!confirmed) {
            return;
        }


        try {

            const {
                error
            } = await supabaseClient
                .from(TABLE_DISTRICTS)
                .update({
                    is_active: active
                })
                .eq(
                    "id",
                    id
                );


            if (error) {

                throw error;

            }


            showToast(
                active
                    ? "District আবার Active হয়েছে।"
                    : "District Deactivate হয়েছে।",
                "success"
            );


            await loadDistricts();


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
                `District ${actionText} error:`,
                error
            );


            showToast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        }

    }


    // =================================================
    // EDIT
    // =================================================

    function editDistrict(id) {

        const district =
            allDistricts.find(
                function (item) {

                    return item.id === id;

                }
            );


        if (!district) {

            showToast(
                "District পাওয়া যায়নি।",
                "error"
            );

            return;

        }


        openDistrictForm(
            district
        );

    }


    // =================================================
    // AUTO SLUG
    // =================================================

    function handleNameInput() {

        if (
            editingDistrictId ||
            !districtSlug ||
            !districtName
        ) {

            return;

        }


        const name =
            cleanText(
                districtName.value
            );


        if (!name) {
            return;
        }


        districtSlug.value =
            slugify(name);

    }


    // =================================================
    // TABLE ACTIONS
    // =================================================

    function handleTableAction(
        event
    ) {

        const button =
            event.target.closest(
                "[data-district-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.dataset
                .districtAction;


        const id =
            button.dataset.id;


        if (action === "edit") {

            editDistrict(id);

        }


        if (
            action === "deactivate"
        ) {

            changeDistrictStatus(
                id,
                false
            );

        }


        if (
            action === "activate"
        ) {

            changeDistrictStatus(
                id,
                true
            );

        }

    }


    // =================================================
    // PAGINATION ACTION
    // =================================================

    function handlePagination(
        event
    ) {

        const button =
            event.target.closest(
                "[data-district-page]"
            );


        if (!button) {
            return;
        }


        const value =
            button.dataset
                .districtPage;


        const totalPages =
            Math.ceil(
                filteredDistricts.length /
                PAGE_SIZE
            );


        if (value === "prev") {

            changePage(
                currentPage - 1
            );

            return;

        }


        if (value === "next") {

            changePage(
                currentPage + 1
            );

            return;

        }


        const page =
            Number(value);


        if (
            Number.isInteger(page) &&
            page >= 1 &&
            page <= totalPages
        ) {

            changePage(page);

        }

    }


    // =================================================
    // EVENTS
    // =================================================

    function setupEvents() {

        if (
            sectionAddDistrictButton
        ) {

            sectionAddDistrictButton
                .addEventListener(
                    "click",
                    function () {

                        openDistrictForm();

                    }
                );

        }


        if (closeDistrictForm) {

            closeDistrictForm
                .addEventListener(
                    "click",
                    closeDistrictFormPanel
                );

        }


        if (cancelDistrictButton) {

            cancelDistrictButton
                .addEventListener(
                    "click",
                    closeDistrictFormPanel
                );

        }


        if (districtForm) {

            districtForm
                .addEventListener(
                    "submit",
                    saveDistrict
                );

        }


        if (districtName) {

            districtName
                .addEventListener(
                    "input",
                    handleNameInput
                );

        }


        if (districtSearch) {

            districtSearch
                .addEventListener(
                    "input",
                    applyDistrictFilters
                );

        }


        if (
            districtDivisionFilter
        ) {

            districtDivisionFilter
                .addEventListener(
                    "change",
                    applyDistrictFilters
                );

        }


        if (
            districtStatusFilter
        ) {

            districtStatusFilter
                .addEventListener(
                    "change",
                    applyDistrictFilters
                );

        }


        if (districtTableBody) {

            districtTableBody
                .addEventListener(
                    "click",
                    handleTableAction
                );

        }


        if (
            districtPaginationControls
        ) {

            districtPaginationControls
                .addEventListener(
                    "click",
                    handlePagination
                );

        }

    }


    // =================================================
    // SUPABASE ERROR
    // =================================================

    function getSupabaseErrorMessage(
        error
    ) {

        if (!error) {

            return "অজানা একটি সমস্যা হয়েছে।";

        }


        if (
            error.code === "23505"
        ) {

            return "এই তথ্যটি ইতোমধ্যে রয়েছে।";

        }


        if (
            error.code === "23503"
        ) {

            return "নির্বাচিত Division-এর সাথে সম্পর্ক স্থাপন করা যায়নি।";

        }


        if (
            error.code === "42501"
        ) {

            return "আপনার এই কাজের অনুমতি নেই।";

        }


        return (
            error.message ||
            "তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।"
        );

    }


    // =================================================
    // INITIALIZE
    // =================================================

    async function initializeDistrict() {

        if (!districtSection) {
            return;
        }


        if (
            !initializeSupabase()
        ) {

            return;

        }


        updatePermissionUI();

        setupEvents();

        await loadDivisions();

        renderDivisionFilter();

        await loadDistricts();

    }


    // =================================================
    // WAIT FOR ADMIN GUARD
    // =================================================

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


            initializeDistrict();

            return;

        }


        window.setTimeout(
            waitForAdmin,
            100
        );

    }


    // =================================================
    // PUBLIC API
    // =================================================

    window.DorkariDistrict = {

        reload:
            loadDistricts,

        refresh:
            loadDistricts,

        openForm:
            openDistrictForm,

        closeForm:
            closeDistrictFormPanel,

        getDistricts:
            function () {

                return allDistricts;

            },

        getDivisions:
            function () {

                return allDivisions;

            }

    };


    // =================================================
    // START
    // =================================================

    waitForAdmin();


})();
