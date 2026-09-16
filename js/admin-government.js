```javascript
/* =========================================================
   DORKARI — GOVERNMENT MANAGEMENT
   File: js/admin-government.js

   Purpose:
   - Government office CRUD
   - Search
   - Office type filter
   - Division / District / Upazila filtering
   - Status filter
   - Verification filter
   - Pagination
   - Add / Edit
   - Active / Inactive
   - Verified / Unverified
   - Location cascade
   - Admin permission protection

   Database:
   government_offices
   divisions
   districts
   upazilas
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const GOVERNMENT_TABLE =
        "government_offices";

    const DIVISION_TABLE =
        "divisions";

    const DISTRICT_TABLE =
        "districts";

    const UPAZILA_TABLE =
        "upazilas";

    const PAGE_SIZE =
        10;


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        supabase:
            null,

        profile:
            null,

        offices:
            [],

        filteredOffices:
            [],

        divisions:
            [],

        districts:
            [],

        upazilas:
            [],

        currentPage:
            1,

        editingId:
            null,

        initialized:
            false,

        isSaving:
            false,

        isLoading:
            false

    };


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function get(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       TEXT HELPERS
    ===================================================== */

    function cleanText(value) {

        return String(
            value ?? ""
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
        ).toLocaleString("bn-BD");

    }


    function getErrorMessage(error) {

        if (!error) {

            return "অজানা সমস্যা হয়েছে।";

        }

        return (
            cleanText(error.message) ||
            cleanText(error.error_description) ||
            cleanText(error.details) ||
            cleanText(error.hint) ||
            "অজানা সমস্যা হয়েছে।"
        );

    }


    /* =====================================================
       ADMIN
    ===================================================== */

    function getAdmin() {

        return window.DorkariAdmin || null;

    }


    function canManageGovernment() {

        const admin =
            getAdmin();

        return Boolean(

            admin &&

            typeof admin.canManageContent ===
            "function" &&

            admin.canManageContent()

        );

    }


    function initializeSupabase() {

        const admin =
            getAdmin();

        if (
            !admin ||
            typeof admin.getSupabase !==
            "function"
        ) {

            throw new Error(
                "Admin security system পাওয়া যায়নি।"
            );

        }

        state.supabase =
            admin.getSupabase();

        if (!state.supabase) {

            throw new Error(
                "Supabase client পাওয়া যায়নি।"
            );

        }

        state.profile =
            typeof admin.getProfile ===
            "function"
                ? admin.getProfile()
                : null;

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        const toast =
            get("governmentToast");

        const toastMessage =
            get("governmentToastMessage");

        if (
            !toast ||
            !toastMessage
        ) {
            return;
        }

        toastMessage.textContent =
            cleanText(message);

        toast.hidden =
            false;

        clearTimeout(
            showToast.timer
        );

        showToast.timer =
            setTimeout(
                function () {

                    toast.hidden =
                        true;

                },
                2800
            );

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function renderLoading() {

        const body =
            get("governmentTableBody");

        if (!body) {
            return;
        }

        body.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="government-state-cell"
                >
                    সরকারি অফিসের তথ্য লোড হচ্ছে...
                </td>
            </tr>
        `;

    }


    function renderError(message) {

        const body =
            get("governmentTableBody");

        if (!body) {
            return;
        }

        body.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="government-state-cell"
                >
                    ${escapeHTML(
                        message ||
                        "তথ্য লোড করা যায়নি।"
                    )}
                </td>
            </tr>
        `;

        const resultCount =
            get("governmentResultCount");

        if (resultCount) {

            resultCount.textContent =
                "0 results";

        }

        renderPagination();

    }


    /* =====================================================
       FIND BY ID
    ===================================================== */

    function findDivision(id) {

        return state.divisions.find(
            function (item) {

                return String(item.id) ===
                    String(id);

            }
        ) || null;

    }


    function findDistrict(id) {

        return state.districts.find(
            function (item) {

                return String(item.id) ===
                    String(id);

            }
        ) || null;

    }


    function findUpazila(id) {

        return state.upazilas.find(
            function (item) {

                return String(item.id) ===
                    String(id);

            }
        ) || null;

    }


    /* =====================================================
       LOCATION NAME
    ===================================================== */

    function getLocationText(office) {

        const division =
            findDivision(
                office.division_id
            );

        const district =
            findDistrict(
                office.district_id
            );

        const upazila =
            findUpazila(
                office.upazila_id
            );

        const parts = [];


        if (upazila) {

            parts.push(
                cleanText(
                    upazila.name_bn ||
                    upazila.name
                )
            );

        }


        if (district) {

            parts.push(
                cleanText(
                    district.name_bn ||
                    district.name
                )
            );

        }


        if (division) {

            parts.push(
                cleanText(
                    division.name_bn ||
                    division.name
                )
            );

        }


        if (
            !parts.length &&
            cleanText(office.address)
        ) {

            return cleanText(
                office.address
            );

        }


        return parts.length
            ? parts.join(", ")
            : "—";

    }


    /* =====================================================
       POPULATE SELECT
    ===================================================== */

    function populateSelect(
        select,
        items,
        placeholder
    ) {

        if (!select) {
            return;
        }

        const currentValue =
            select.value;

        select.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value =
            "";

        defaultOption.textContent =
            placeholder;

        select.appendChild(
            defaultOption
        );


        items.forEach(
            function (item) {

                const option =
                    document.createElement("option");

                option.value =
                    item.id;

                option.textContent =
                    cleanText(
                        item.name_bn ||
                        item.name
                    );

                select.appendChild(
                    option
                );

            }
        );


        if (
            currentValue &&
            items.some(
                function (item) {

                    return String(item.id) ===
                        String(currentValue);

                }
            )
        ) {

            select.value =
                currentValue;

        }

    }


    /* =====================================================
       LOCATION LOADING
    ===================================================== */

    async function loadDivisions() {

        const {
            data,
            error
        } =
            await state.supabase
                .from(DIVISION_TABLE)
                .select(
                    "id,name,name_bn"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "name"
                );

        if (error) {

            throw error;

        }

        state.divisions =
            Array.isArray(data)
                ? data
                : [];

    }


    async function loadDistricts() {

        const {
            data,
            error
        } =
            await state.supabase
                .from(DISTRICT_TABLE)
                .select(
                    "id,name,name_bn,division_id"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "name"
                );

        if (error) {

            throw error;

        }

        state.districts =
            Array.isArray(data)
                ? data
                : [];

    }


    async function loadUpazilas() {

        const {
            data,
            error
        } =
            await state.supabase
                .from(UPAZILA_TABLE)
                .select(
                    "id,name,name_bn,district_id,division_id"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "name"
                );

        if (error) {

            throw error;

        }

        state.upazilas =
            Array.isArray(data)
                ? data
                : [];

    }


    function resetDistrictSelect(
        selectId
    ) {

        const select =
            get(selectId);

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                সব জেলা
            </option>
        `;

        select.disabled =
            true;

    }


    function resetUpazilaSelect(
        selectId
    ) {

        const select =
            get(selectId);

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                সব উপজেলা
            </option>
        `;

        select.disabled =
            true;

    }


    function updateDistrictOptions(
        divisionId,
        selectId
    ) {

        const select =
            get(selectId);

        if (!select) {
            return;
        }

        if (!divisionId) {

            resetDistrictSelect(
                selectId
            );

            return;

        }

        const districts =
            state.districts.filter(
                function (district) {

                    return String(
                        district.division_id
                    ) === String(
                        divisionId
                    );

                }
            );

        populateSelect(
            select,
            districts,
            selectId ===
                "governmentDistrictFilter"
                ? "সব জেলা"
                : "জেলা নির্বাচন করুন"
        );

        select.disabled =
            districts.length === 0;

    }


    function updateUpazilaOptions(
        districtId,
        selectId
    ) {

        const select =
            get(selectId);

        if (!select) {
            return;
        }

        if (!districtId) {

            resetUpazilaSelect(
                selectId
            );

            return;

        }

        const upazilas =
            state.upazilas.filter(
                function (upazila) {

                    return String(
                        upazila.district_id
                    ) === String(
                        districtId
                    );

                }
            );

        populateSelect(
            select,
            upazilas,
            selectId ===
                "governmentUpazilaFilter"
                ? "সব উপজেলা"
                : "উপজেলা নির্বাচন করুন"
        );

        select.disabled =
            upazilas.length === 0;

    }


    function initializeLocationSelects() {

        populateSelect(
            get("governmentDivisionFilter"),
            state.divisions,
            "সব বিভাগ"
        );

        populateSelect(
            get("governmentDivision"),
            state.divisions,
            "বিভাগ নির্বাচন করুন"
        );

        resetDistrictSelect(
            "governmentDistrictFilter"
        );

        resetUpazilaSelect(
            "governmentUpazilaFilter"
        );

        resetDistrictSelect(
            "governmentDistrict"
        );

        resetUpazilaSelect(
            "governmentUpazila"
        );

    }


    /* =====================================================
       DATA LOAD
    ===================================================== */

    async function loadOffices() {

        state.isLoading =
            true;

        renderLoading();

        try {

            const {
                data,
                error
            } =
                await state.supabase
                    .from(
                        GOVERNMENT_TABLE
                    )
                    .select(
                        `
                        id,
                        name,
                        name_bn,
                        office_type,
                        division_id,
                        district_id,
                        upazila_id,
                        address,
                        phone,
                        email,
                        website,
                        description,
                        is_verified,
                        is_active,
                        created_at,
                        updated_at
                        `
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );

            if (error) {

                throw error;

            }

            state.offices =
                Array.isArray(data)
                    ? data
                    : [];

            state.currentPage =
                1;

            applyFilters();

        } catch (error) {

            console.error(
                "Government offices load error:",
                error
            );

            state.offices =
                [];

            state.filteredOffices =
                [];

            renderError(
                getErrorMessage(error)
            );

        } finally {

            state.isLoading =
                false;

        }

    }


    /* =====================================================
       OFFICE TYPE OPTIONS
    ===================================================== */

    function loadOfficeTypes() {

        const types = [];

        state.offices.forEach(
            function (office) {

                const type =
                    cleanText(
                        office.office_type
                    );

                if (
                    type &&
                    !types.some(
                        function (item) {

                            return item.toLowerCase() ===
                                type.toLowerCase();

                        }
                    )
                ) {

                    types.push(type);

                }

            }
        );

        types.sort(
            function (a, b) {

                return a.localeCompare(
                    b,
                    "en"
                );

            }
        );


        const select =
            get("governmentTypeFilter");

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                সব office type
            </option>
        `;


        types.forEach(
            function (type) {

                const option =
                    document.createElement("option");

                option.value =
                    type;

                option.textContent =
                    type;

                select.appendChild(
                    option
                );

            }
        );

    }


    /* =====================================================
       FILTERING
    ===================================================== */

    function applyFilters() {

        const search =
            cleanText(
                get("governmentSearch")
                    ?.value
            ).toLowerCase();

        const type =
            cleanText(
                get("governmentTypeFilter")
                    ?.value
            ).toLowerCase();

        const divisionId =
            cleanText(
                get("governmentDivisionFilter")
                    ?.value
            );

        const districtId =
            cleanText(
                get("governmentDistrictFilter")
                    ?.value
            );

        const upazilaId =
            cleanText(
                get("governmentUpazilaFilter")
                    ?.value
            );

        const status =
            cleanText(
                get("governmentStatusFilter")
                    ?.value
            );

        const verification =
            cleanText(
                get(
                    "governmentVerificationFilter"
                )?.value
            );


        state.filteredOffices =
            state.offices.filter(
                function (office) {

                    const searchable =
                        [
                            office.name,
                            office.name_bn,
                            office.office_type,
                            office.address,
                            office.phone,
                            office.email,
                            office.description
                        ]
                            .map(cleanText)
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


                    if (
                        type &&
                        cleanText(
                            office.office_type
                        ).toLowerCase() !==
                        type
                    ) {

                        return false;

                    }


                    if (
                        divisionId &&
                        String(
                            office.division_id
                        ) !==
                        String(
                            divisionId
                        )
                    ) {

                        return false;

                    }


                    if (
                        districtId &&
                        String(
                            office.district_id
                        ) !==
                        String(
                            districtId
                        )
                    ) {

                        return false;

                    }


                    if (
                        upazilaId &&
                        String(
                            office.upazila_id
                        ) !==
                        String(
                            upazilaId
                        )
                    ) {

                        return false;

                    }


                    if (
                        status ===
                        "active" &&
                        office.is_active !== true
                    ) {

                        return false;

                    }


                    if (
                        status ===
                        "inactive" &&
                        office.is_active !== false
                    ) {

                        return false;

                    }


                    if (
                        verification ===
                        "verified" &&
                        office.is_verified !== true
                    ) {

                        return false;

                    }


                    if (
                        verification ===
                        "unverified" &&
                        office.is_verified !== false
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filteredOffices.length /
                    PAGE_SIZE
                )
            );


        if (
            state.currentPage >
            totalPages
        ) {

            state.currentPage =
                totalPages;

        }


        renderOfficeTable();

        renderPagination();

        updateStatistics();

        updateResultCount();

    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    function updateStatistics() {

        const total =
            state.offices.length;

        const active =
            state.offices.filter(
                function (office) {

                    return office.is_active ===
                        true;

                }
            ).length;

        const verified =
            state.offices.filter(
                function (office) {

                    return office.is_verified ===
                        true;

                }
            ).length;


        const totalElement =
            get(
                "governmentTotalCount"
            );

        const activeElement =
            get(
                "governmentActiveCount"
            );

        const verifiedElement =
            get(
                "governmentVerifiedCount"
            );


        if (totalElement) {

            totalElement.textContent =
                formatNumber(total);

        }

        if (activeElement) {

            activeElement.textContent =
                formatNumber(active);

        }

        if (verifiedElement) {

            verifiedElement.textContent =
                formatNumber(verified);

        }

    }


    function updateResultCount() {

        const element =
            get(
                "governmentResultCount"
            );

        if (!element) {
            return;
        }

        const total =
            state.filteredOffices.length;


        element.textContent =
            `${formatNumber(total)} results`;

    }


    /* =====================================================
       BADGES
    ===================================================== */

    function verificationBadge(
        verified
    ) {

        if (verified) {

            return `
                <span
                    class="government-status-badge government-status-verified"
                >
                    Verified
                </span>
            `;

        }

        return `
            <span
                class="government-status-badge government-status-unverified"
            >
                Unverified
            </span>
        `;

    }


    function activeBadge(
        active
    ) {

        if (active) {

            return `
                <span
                    class="government-status-badge government-status-active"
                >
                    Active
                </span>
            `;

        }

        return `
            <span
                class="government-status-badge government-status-inactive"
            >
                Inactive
            </span>
        `;

    }


    /* =====================================================
       TABLE ACTIONS
    ===================================================== */

    function actionMenu(
        office
    ) {

        const toggleLabel =
            office.is_active
                ? "Deactivate"
                : "Activate";

        const verificationLabel =
            office.is_verified
                ? "Mark Unverified"
                : "Mark Verified";


        return `
            <div class="government-row-actions">

                <button
                    type="button"
                    class="government-row-btn"
                    data-action="edit"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="government-row-btn"
                    data-action="toggle"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    ${toggleLabel}
                </button>

                <button
                    type="button"
                    class="government-row-btn"
                    data-action="verify"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    ${verificationLabel}
                </button>

                <button
                    type="button"
                    class="government-row-btn government-row-btn-danger"
                    data-action="delete"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    Delete
                </button>

            </div>
        `;

    }


    /* =====================================================
       TABLE
    ===================================================== */

    function renderOfficeTable() {

        const body =
            get(
                "governmentTableBody"
            );

        if (!body) {
            return;
        }


        const total =
            state.filteredOffices.length;


        if (!total) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="government-state-cell"
                    >
                        কোনো সরকারি অফিস পাওয়া যায়নি।
                    </td>
                </tr>
            `;

            return;

        }


        const start =
            (
                state.currentPage -
                1
            ) *
            PAGE_SIZE;

        const end =
            start +
            PAGE_SIZE;

        const items =
            state.filteredOffices.slice(
                start,
                end
            );


        body.innerHTML =
            items.map(
                function (office) {

                    const name =
                        cleanText(
                            office.name
                        ) || "—";

                    const nameBn =
                        cleanText(
                            office.name_bn
                        );

                    const type =
                        cleanText(
                            office.office_type
                        ) || "—";

                    const location =
                        getLocationText(
                            office
                        );

                    const phone =
                        cleanText(
                            office.phone
                        );


                    return `
                        <tr>

                            <td>

                                <div class="government-office-cell">

                                    <strong>
                                        ${escapeHTML(
                                            name
                                        )}
                                    </strong>

                                    ${
                                        nameBn
                                            ? `
                                                <span>
                                                    ${escapeHTML(
                                                        nameBn
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    type
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    location
                                )}
                            </td>


                            <td>
                                ${phone
                                    ? `
                                        <a
                                            href="tel:${escapeHTML(
                                                phone
                                            )}"
                                            class="government-phone-link"
                                        >
                                            ${escapeHTML(
                                                phone
                                            )}
                                        </a>
                                      `
                                    : "—"
                                }
                            </td>


                            <td>
                                ${verificationBadge(
                                    office.is_verified
                                )}
                            </td>


                            <td>
                                ${activeBadge(
                                    office.is_active
                                )}
                            </td>


                            <td>
                                ${actionMenu(
                                    office
                                )}
                            </td>

                        </tr>
                    `;

                }
            ).join("");

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        const container =
            get(
                "governmentPagination"
            );

        if (!container) {
            return;
        }


        const total =
            state.filteredOffices.length;


        if (
            total <= PAGE_SIZE
        ) {

            container.innerHTML =
                "";

            return;

        }


        const totalPages =
            Math.ceil(
                total /
                PAGE_SIZE
            );


        const current =
            state.currentPage;


        let html =
            "";


        html += `
            <button
                type="button"
                data-page="${current - 1}"
                ${current <= 1 ? "disabled" : ""}
            >
                ‹
            </button>
        `;


        const maxVisible =
            5;

        let startPage =
            Math.max(
                1,
                current -
                Math.floor(
                    maxVisible / 2
                )
            );

        let endPage =
            Math.min(
                totalPages,
                startPage +
                maxVisible -
                1
            );


        if (
            endPage -
            startPage +
            1 <
            maxVisible
        ) {

            startPage =
                Math.max(
                    1,
                    endPage -
                    maxVisible +
                    1
                );

        }


        for (
            let page = startPage;
            page <= endPage;
            page++
        ) {

            html += `
                <button
                    type="button"
                    data-page="${page}"
                    class="${
                        page === current
                            ? "active"
                            : ""
                    }"
                >
                    ${page}
                </button>
            `;

        }


        html += `
            <button
                type="button"
                data-page="${current + 1}"
                ${
                    current >= totalPages
                        ? "disabled"
                        : ""
                }
            >
                ›
            </button>
        `;


        container.innerHTML =
            html;

    }


    function goToPage(
        page
    ) {

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filteredOffices.length /
                    PAGE_SIZE
                )
            );


        const nextPage =
            Number(page);


        if (
            !Number.isInteger(
                nextPage
            )
        ) {
            return;
        }


        if (
            nextPage < 1 ||
            nextPage > totalPages
        ) {
            return;
        }


        state.currentPage =
            nextPage;


        renderOfficeTable();

        renderPagination();

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function openModal(
        office = null
    ) {

        const modal =
            get(
                "governmentModal"
            );

        const title =
            get(
                "governmentModalTitle"
            );

        if (!modal || !title) {
            return;
        }


        state.editingId =
            office
                ? office.id
                : null;


        get(
            "governmentId"
        ).value =
            office?.id ||
            "";


        get(
            "governmentName"
        ).value =
            office?.name ||
            "";


        get(
            "governmentNameBn"
        ).value =
            office?.name_bn ||
            "";


        get(
            "governmentOfficeType"
        ).value =
            office?.office_type ||
            "";


        get(
            "governmentDescription"
        ).value =
            office?.description ||
            "";


        get(
            "governmentPhone"
        ).value =
            office?.phone ||
            "";


        get(
            "governmentEmail"
        ).value =
            office?.email ||
            "";


        get(
            "governmentWebsite"
        ).value =
            office?.website ||
            "";


        get(
            "governmentAddress"
        ).value =
            office?.address ||
            "";


        get(
            "governmentIsActive"
        ).checked =
            office
                ? office.is_active === true
                : true;


        get(
            "governmentIsVerified"
        ).checked =
            office
                ? office.is_verified === true
                : false;


        const divisionSelect =
            get(
                "governmentDivision"
            );

        const districtSelect =
            get(
                "governmentDistrict"
            );

        const upazilaSelect =
            get(
                "governmentUpazila"
            );


        initializeLocationSelects();


        if (
            office?.division_id
        ) {

            divisionSelect.value =
                office.division_id;

            updateDistrictOptions(
                office.division_id,
                "governmentDistrict"
            );

            if (
                office.district_id
            ) {

                districtSelect.value =
                    office.district_id;

                updateUpazilaOptions(
                    office.district_id,
                    "governmentUpazila"
                );

            }


            if (
                office.upazila_id
            ) {

                upazilaSelect.value =
                    office.upazila_id;

            }

        }


        title.textContent =
            office
                ? "Edit Government Office"
                : "Add Government Office";


        const saveButton =
            get(
                "governmentSaveBtn"
            );

        if (saveButton) {

            saveButton.textContent =
                office
                    ? "Update Government Office"
                    : "Save Government Office";

        }


        modal.hidden =
            false;

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "government-modal-open"
        );

        const firstInput =
            get(
                "governmentName"
            );

        if (firstInput) {

            setTimeout(
                function () {

                    firstInput.focus();

                },
                50
            );

        }

    }


    function closeModal() {

        const modal =
            get(
                "governmentModal"
            );

        if (!modal) {
            return;
        }


        if (
            state.isSaving
        ) {
            return;
        }


        modal.hidden =
            true;

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        state.editingId =
            null;


        const form =
            get(
                "governmentForm"
            );

        if (form) {

            form.reset();

        }


        initializeLocationSelects();


        get(
            "governmentId"
        ).value =
            "";

        document.body.classList.remove(
            "government-modal-open"
        );

    }


    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateURL(
        value
    ) {

        const text =
            cleanText(value);

        if (!text) {
            return true;
        }

        try {

            const url =
                new URL(text);

            return (
                url.protocol ===
                "http:" ||
                url.protocol ===
                "https:"
            );

        } catch (error) {

            return false;

        }

    }


    function validateEmail(
        value
    ) {

        const text =
            cleanText(value);

        if (!text) {
            return true;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            text
        );

    }


    function validateGovernmentForm() {

        const name =
            cleanText(
                get(
                    "governmentName"
                )?.value
            );

        const nameBn =
            cleanText(
                get(
                    "governmentNameBn"
                )?.value
            );

        const email =
            cleanText(
                get(
                    "governmentEmail"
                )?.value
            );

        const website =
            cleanText(
                get(
                    "governmentWebsite"
                )?.value
            );

        const divisionId =
            cleanText(
                get(
                    "governmentDivision"
                )?.value
            );

        const districtId =
            cleanText(
                get(
                    "governmentDistrict"
                )?.value
            );


        if (!name) {

            showToast(
                "Office Name আবশ্যক।"
            );

            get(
                "governmentName"
            )?.focus();

            return false;

        }


        if (!nameBn) {

            showToast(
                "বাংলা নাম আবশ্যক।"
            );

            get(
                "governmentNameBn"
            )?.focus();

            return false;

        }


        if (!divisionId) {

            showToast(
                "Division নির্বাচন করুন।"
            );

            get(
                "governmentDivision"
            )?.focus();

            return false;

        }


        if (!districtId) {

            showToast(
                "District নির্বাচন করুন।"
            );

            get(
                "governmentDistrict"
            )?.focus();

            return false;

        }


        if (
            email &&
            !validateEmail(email)
        ) {

            showToast(
                "সঠিক email address দিন।"
            );

            get(
                "governmentEmail"
            )?.focus();

            return false;

        }


        if (
            website &&
            !validateURL(
                website
            )
        ) {

            showToast(
                "Website URL সঠিক নয়।"
            );

            get(
                "governmentWebsite"
            )?.focus();

            return false;

        }


        return true;

    }


    /* =====================================================
       DUPLICATE CHECK
    ===================================================== */

    async function checkDuplicate(
        name,
        nameBn,
        excludeId = null
    ) {

        const normalizedName =
            cleanText(name)
                .toLowerCase();

        const normalizedNameBn =
            cleanText(nameBn)
                .toLowerCase();


        const duplicate =
            state.offices.find(
                function (office) {

                    if (
                        excludeId &&
                        String(
                            office.id
                        ) === String(
                            excludeId
                        )
                    ) {

                        return false;

                    }


                    const existingName =
                        cleanText(
                            office.name
                        ).toLowerCase();

                    const existingNameBn =
                        cleanText(
                            office.name_bn
                        ).toLowerCase();


                    return (
                        existingName ===
                        normalizedName ||

                        existingNameBn ===
                        normalizedNameBn
                    );

                }
            );


        return duplicate || null;

    }


    /* =====================================================
       FORM DATA
    ===================================================== */

    function getFormData() {

        return {

            name:
                cleanText(
                    get(
                        "governmentName"
                    ).value
                ),

            name_bn:
                cleanText(
                    get(
                        "governmentNameBn"
                    ).value
                ),

            office_type:
                cleanText(
                    get(
                        "governmentOfficeType"
                    ).value
                ) || null,

            division_id:
                cleanText(
                    get(
                        "governmentDivision"
                    ).value
                ) || null,

            district_id:
                cleanText(
                    get(
                        "governmentDistrict"
                    ).value
                ) || null,

            upazila_id:
                cleanText(
                    get(
                        "governmentUpazila"
                    ).value
                ) || null,

            address:
                cleanText(
                    get(
                        "governmentAddress"
                    ).value
                ) || null,

            phone:
                cleanText(
                    get(
                        "governmentPhone"
                    ).value
                ) || null,

            email:
                cleanText(
                    get(
                        "governmentEmail"
                    ).value
                ) || null,

            website:
                cleanText(
                    get(
                        "governmentWebsite"
                    ).value
                ) || null,

            description:
                cleanText(
                    get(
                        "governmentDescription"
                    ).value
                ) || null,

            is_verified:
                Boolean(
                    get(
                        "governmentIsVerified"
                    ).checked
                ),

            is_active:
                Boolean(
                    get(
                        "governmentIsActive"
                    ).checked
                )

        };

    }


    /* =====================================================
       SAVE
    ===================================================== */

    async function saveGovernmentOffice() {

        if (
            state.isSaving
        ) {
            return;
        }


        if (
            !canManageGovernment()
        ) {

            showToast(
                "আপনার এই তথ্য পরিবর্তন করার অনুমতি নেই।"
            );

            return;

        }


        if (
            !validateGovernmentForm()
        ) {

            return;

        }


        const data =
            getFormData();


        const duplicate =
            await checkDuplicate(
                data.name,
                data.name_bn,
                state.editingId
            );


        if (duplicate) {

            showToast(
                "একই নামের Government Office ইতোমধ্যে আছে।"
            );

            return;

        }


        const saveButton =
            get(
                "governmentSaveBtn"
            );


        state.isSaving =
            true;


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                state.editingId
                    ? "Updating..."
                    : "Saving...";

        }


        try {

            if (
                state.editingId
            ) {

                const {
                    error
                } =
                    await state.supabase
                        .from(
                            GOVERNMENT_TABLE
                        )
                        .update(
                            {
                                ...data,
                                updated_at:
                                    new Date()
                                        .toISOString()
                            }
                        )
                        .eq(
                            "id",
                            state.editingId
                        );

                if (error) {

                    throw error;

                }


                showToast(
                    "Government Office সফলভাবে update হয়েছে।"
                );

            } else {

                const {
                    error
                } =
                    await state.supabase
                        .from(
                            GOVERNMENT_TABLE
                        )
                        .insert(
                            data
                        );

                if (error) {

                    throw error;

                }


                showToast(
                    "Government Office সফলভাবে যোগ হয়েছে।"
                );

            }


            closeModal();

            await loadOffices();

        } catch (error) {

            console.error(
                "Government save error:",
                error
            );

            showToast(
                getErrorMessage(
                    error
                )
            );

        } finally {

            state.isSaving =
                false;

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    state.editingId
                        ? "Update Government Office"
                        : "Save Government Office";

            }

        }

    }


    /* =====================================================
       STATUS CHANGE
    ===================================================== */

    async function updateStatus(
        id
    ) {

        if (
            !canManageGovernment()
        ) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।"
            );

            return;

        }


        const office =
            state.offices.find(
                function (item) {

                    return String(
                        item.id
                    ) === String(id);

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const nextActive =
            office.is_active !== true;


        try {

            const {
                error
            } =
                await state.supabase
                    .from(
                        GOVERNMENT_TABLE
                    )
                    .update(
                        {
                            is_active:
                                nextActive,

                            updated_at:
                                new Date()
                                    .toISOString()
                        }
                    )
                    .eq(
                        "id",
                        id
                    );


            if (error) {

                throw error;

            }


            showToast(
                nextActive
                    ? "Office active হয়েছে।"
                    : "Office inactive হয়েছে।"
            );


            await loadOffices();

        } catch (error) {

            console.error(
                "Government status update error:",
                error
            );

            showToast(
                getErrorMessage(
                    error
                )
            );

        }

    }


    /* =====================================================
       VERIFICATION CHANGE
    ===================================================== */

    async function updateVerification(
        id
    ) {

        if (
            !canManageGovernment()
        ) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।"
            );

            return;

        }


        const office =
            state.offices.find(
                function (item) {

                    return String(
                        item.id
                    ) === String(id);

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const nextVerified =
            office.is_verified !== true;


        try {

            const {
                error
            } =
                await state.supabase
                    .from(
                        GOVERNMENT_TABLE
                    )
                    .update(
                        {
                            is_verified:
                                nextVerified,

                            updated_at:
                                new Date()
                                    .toISOString()
                        }
                    )
                    .eq(
                        "id",
                        id
                    );


            if (error) {

                throw error;

            }


            showToast(
                nextVerified
                    ? "Office verified হয়েছে।"
                    : "Office unverified করা হয়েছে।"
            );


            await loadOffices();

        } catch (error) {

            console.error(
                "Government verification update error:",
                error
            );

            showToast(
                getErrorMessage(
                    error
                )
            );

        }

    }


    /* =====================================================
       DELETE
    ===================================================== */

    async function deleteOffice(
        id
    ) {

        if (
            !canManageGovernment()
        ) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।"
            );

            return;

        }


        const office =
            state.offices.find(
                function (item) {

                    return String(
                        item.id
                    ) === String(id);

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const confirmed =
            window.confirm(
                `“${cleanText(
                    office.name_bn ||
                    office.name
                )}” delete করতে চান?`
            );


        if (!confirmed) {

            return;

        }


        try {

            const {
                error
            } =
                await state.supabase
                    .from(
                        GOVERNMENT_TABLE
                    )
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (error) {

                throw error;

            }


            showToast(
                "Government Office delete হয়েছে।"
            );


            await loadOffices();

        } catch (error) {

            console.error(
                "Government delete error:",
                error
            );

            showToast(
                getErrorMessage(
                    error
                )
            );

        }

    }


    /* =====================================================
       EDIT
    ===================================================== */

    function editOffice(
        id
    ) {

        const office =
            state.offices.find(
                function (item) {

                    return String(
                        item.id
                    ) === String(id);

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        openModal(
            office
        );

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        const addButton =
            get(
                "governmentAddBtn"
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                function () {

                    if (
                        !canManageGovernment()
                    ) {

                        showToast(
                            "আপনার এই কাজের অনুমতি নেই।"
                        );

                        return;

                    }

                    openModal();

                }
            );

        }


        const refreshButton =
            get(
                "governmentRefresh"
            );

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                function () {

                    loadOfficeTypes();

                    loadOffices();

                }
            );

        }


        const cancelButton =
            get(
                "governmentCancelBtn"
            );

        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }


        const modalClose =
            get(
                "governmentModalClose"
            );

        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeModal
            );

        }


        const modal =
            get(
                "governmentModal"
            );

        if (modal) {

            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target
                            .dataset
                            .closeModal ===
                        "true"
                    ) {

                        closeModal();

                    }

                }
            );

        }


        const form =
            get(
                "governmentForm"
            );

        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveGovernmentOffice();

                }
            );

        }


        const search =
            get(
                "governmentSearch"
            );

        if (search) {

            search.addEventListener(
                "input",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        const typeFilter =
            get(
                "governmentTypeFilter"
            );

        if (typeFilter) {

            typeFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        const divisionFilter =
            get(
                "governmentDivisionFilter"
            );

        if (divisionFilter) {

            divisionFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    updateDistrictOptions(
                        this.value,
                        "governmentDistrictFilter"
                    );

                    resetUpazilaSelect(
                        "governmentUpazilaFilter"
                    );

                    applyFilters();

                }
            );

        }


        const districtFilter =
            get(
                "governmentDistrictFilter"
            );

        if (districtFilter) {

            districtFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    updateUpazilaOptions(
                        this.value,
                        "governmentUpazilaFilter"
                    );

                    applyFilters();

                }
            );

        }


        const upazilaFilter =
            get(
                "governmentUpazilaFilter"
            );

        if (upazilaFilter) {

            upazilaFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        const statusFilter =
            get(
                "governmentStatusFilter"
            );

        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        const verificationFilter =
            get(
                "governmentVerificationFilter"
            );

        if (verificationFilter) {

            verificationFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        const formDivision =
            get(
                "governmentDivision"
            );

        if (formDivision) {

            formDivision.addEventListener(
                "change",
                function () {

                    updateDistrictOptions(
                        this.value,
                        "governmentDistrict"
                    );

                    resetUpazilaSelect(
                        "governmentUpazila"
                    );

                }
            );

        }


        const formDistrict =
            get(
                "governmentDistrict"
            );

        if (formDistrict) {

            formDistrict.addEventListener(
                "change",
                function () {

                    updateUpazilaOptions(
                        this.value,
                        "governmentUpazila"
                    );

                }
            );

        }


        const pagination =
            get(
                "governmentPagination"
            );

        if (pagination) {

            pagination.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "button[data-page]"
                        );

                    if (!button) {
                        return;
                    }

                    goToPage(
                        Number(
                            button.dataset.page
                        )
                    );

                }
            );

        }


        const tableBody =
            get(
                "governmentTableBody"
            );

        if (tableBody) {

            tableBody.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "button[data-action]"
                        );

                    if (!button) {
                        return;
                    }


                    const id =
                        button.dataset.id;

                    const action =
                        button.dataset.action;


                    if (
                        action ===
                        "edit"
                    ) {

                        editOffice(
                            id
                        );

                        return;

                    }


                    if (
                        action ===
                        "toggle"
                    ) {

                        updateStatus(
                            id
                        );

                        return;

                    }


                    if (
                        action ===
                        "verify"
                    ) {

                        updateVerification(
                            id
                        );

                        return;

                    }


                    if (
                        action ===
                        "delete"
                    ) {

                        deleteOffice(
                            id
                        );

                    }

                }
            );

        }


        const sidebarToggle =
            get(
                "sidebarToggle"
            );

        if (sidebarToggle) {

            sidebarToggle.addEventListener(
                "click",
                openSidebar
            );

        }


        const sidebarClose =
            get(
                "sidebarClose"
            );

        if (sidebarClose) {

            sidebarClose.addEventListener(
                "click",
                closeSidebar
            );

        }


        const sidebarOverlay =
            get(
                "sidebarOverlay"
            );

        if (sidebarOverlay) {

            sidebarOverlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        const logout =
            get(
                "sidebarLogout"
            );

        if (logout) {

            logout.addEventListener(
                "click",
                handleLogout
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    const modal =
                        get(
                            "governmentModal"
                        );

                    if (
                        modal &&
                        !modal.hidden
                    ) {

                        closeModal();

                        return;

                    }


                    closeSidebar();

                }

            }
        );

    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        const sidebar =
            get(
                "adminSidebar"
            );

        const overlay =
            get(
                "sidebarOverlay"
            );

        if (sidebar) {

            sidebar.classList.add(
                "open"
            );

        }

        if (overlay) {

            overlay.classList.add(
                "active"
            );

        }

    }


    function closeSidebar() {

        const sidebar =
            get(
                "adminSidebar"
            );

        const overlay =
            get(
                "sidebarOverlay"
            );

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }

        if (overlay) {

            overlay.classList.remove(
                "active"
            );

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {

        const admin =
            getAdmin();


        if (
            !admin ||
            typeof admin.logout !==
            "function"
        ) {

            window.location.href =
                "./index.html";

            return;

        }


        try {

            await admin.logout();

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

            window.location.href =
                "./index.html";

        }

    }


    /* =====================================================
       ADMIN WAIT
    ===================================================== */

    async function waitForAdminSystem() {

        let attempts =
            0;

        const maxAttempts =
            200;


        while (
            attempts <
            maxAttempts
        ) {

            if (
                window.DorkariAdmin &&
                typeof
                    window.DorkariAdmin.getSupabase ===
                    "function"
            ) {

                return true;

            }


            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        50
                    );

                }
            );


            attempts++;

        }


        return false;

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initialize() {

        if (
            state.initialized
        ) {

            return;

        }


        try {

            const ready =
                await waitForAdminSystem();


            if (!ready) {

                throw new Error(
                    "Admin security system initialize হয়নি।"
                );

            }


            initializeSupabase();


            if (
                !canManageGovernment()
            ) {

                const addButton =
                    get(
                        "governmentAddBtn"
                    );

                if (addButton) {

                    addButton.disabled =
                        true;

                }

            }


            renderLoading();

            bindEvents();


            await Promise.all(
                [
                    loadDivisions(),
                    loadDistricts(),
                    loadUpazilas()
                ]
            );


            initializeLocationSelects();


            await loadOffices();


            loadOfficeTypes();


            updateStatistics();

            updateResultCount();


            state.initialized =
                true;


        } catch (error) {

            console.error(
                "Government initialization error:",
                error
            );

            renderError(
                getErrorMessage(
                    error
                )
            );

        }

    }


    /* =====================================================
       PUBLIC DEBUG HELPERS
       ===================================================== */

    window.DorkariGovernment =
        {

            refresh:
                function () {

                    return loadOffices();

                },

            getState:
                function () {

                    return {
                        offices:
                            [
                                ...state.offices
                            ],

                        filteredOffices:
                            [
                                ...state.filteredOffices
                            ],

                        currentPage:
                            state.currentPage,

                        initialized:
                            state.initialized

                    };

                }

        };


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();
```
