/* =========================================================
   DORKARI — GOVERNMENT MANAGEMENT
   File: js/admin-government.js

   PURPOSE
   ---------------------------------------------------------
   1. Government office listing.
   2. Search.
   3. Office type filter.
   4. Division / District / Upazila filter.
   5. Active / Inactive filter.
   6. Verified / Unverified filter.
   7. Pagination.
   8. Add Government Office.
   9. Edit Government Office.
   10. Activate / Deactivate.
   11. Verify / Unverify.
   12. Delete.
   13. Location cascade.
   14. Admin permission protection.

   DATABASE
   ---------------------------------------------------------
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

        isSaving:
            false,

        initialized:
            false

    };


    /* =====================================================
       DOM
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
        ).toLocaleString(
            "bn-BD"
        );

    }


    function getErrorMessage(error) {

        if (!error) {

            return "অজানা সমস্যা হয়েছে।";

        }

        return (
            cleanText(
                error.message
            ) ||
            cleanText(
                error.error_description
            ) ||
            cleanText(
                error.details
            ) ||
            cleanText(
                error.hint
            ) ||
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


    /* =====================================================
       WAIT FOR ADMIN SECURITY SYSTEM
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

            const admin =
                getAdmin();


            if (

                admin &&

                typeof admin.getProfile ===
                    "function" &&

                typeof admin.getSupabase ===
                    "function" &&

                typeof admin.canManageContent ===
                    "function"

            ) {

                const profile =
                    admin.getProfile();

                const supabase =
                    admin.getSupabase();


                if (
                    profile &&
                    supabase
                ) {

                    return;

                }

            }


            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        50
                    );

                }
            );


            attempts +=
                1;

        }


        throw new Error(
            "Admin security system ready হয়নি।"
        );

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

            throw new Error(
                "DorkariAdmin Supabase access পাওয়া যায়নি।"
            );

        }


        state.supabase =
            admin.getSupabase();


        if (!state.supabase) {

            throw new Error(
                "Supabase client পাওয়া যায়নি।"
            );

        }

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        const toast =
            get(
                "governmentToast"
            );

        const messageElement =
            get(
                "governmentToastMessage"
            );


        if (
            !toast ||
            !messageElement
        ) {

            return;

        }


        messageElement.textContent =
            cleanText(
                message
            );


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
       STATE MESSAGE
    ===================================================== */

    function renderLoading() {

        const body =
            get(
                "governmentTableBody"
            );


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
            get(
                "governmentTableBody"
            );


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


        const resultElement =
            get(
                "governmentResultCount"
            );


        if (resultElement) {

            resultElement.textContent =
                "0 results";

        }


        renderPagination();

    }


    /* =====================================================
       LOCATION HELPERS
    ===================================================== */

    function findDivision(id) {

        return state.divisions.find(
            function (item) {

                return String(
                    item.id
                ) === String(
                    id
                );

            }
        ) || null;

    }


    function findDistrict(id) {

        return state.districts.find(
            function (item) {

                return String(
                    item.id
                ) === String(
                    id
                );

            }
        ) || null;

    }


    function findUpazila(id) {

        return state.upazilas.find(
            function (item) {

                return String(
                    item.id
                ) === String(
                    id
                );

            }
        ) || null;

    }


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


        const parts =
            [];


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


        if (parts.length) {

            return parts.join(
                ", "
            );

        }


        if (
            cleanText(
                office.address
            )
        ) {

            return cleanText(
                office.address
            );

        }


        return "—";

    }


    /* =====================================================
       SELECT HELPERS
    ===================================================== */

    function fillSelect(
        select,
        items,
        placeholder
    ) {

        if (!select) {

            return;

        }


        select.innerHTML = "";


        const defaultOption =
            document.createElement(
                "option"
            );


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
                    document.createElement(
                        "option"
                    );


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

    }


    function resetDistrictSelect(
        selectId
    ) {

        const select =
            get(
                selectId
            );


        if (!select) {

            return;

        }


        select.innerHTML = `
            <option value="">
                ${
                    selectId ===
                    "governmentDistrict"
                        ? "জেলা নির্বাচন করুন"
                        : "সব জেলা"
                }
            </option>
        `;


        select.disabled =
            true;

    }


    function resetUpazilaSelect(
        selectId
    ) {

        const select =
            get(
                selectId
            );


        if (!select) {

            return;

        }


        select.innerHTML = `
            <option value="">
                ${
                    selectId ===
                    "governmentUpazila"
                        ? "উপজেলা নির্বাচন করুন"
                        : "সব উপজেলা"
                }
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
            get(
                selectId
            );


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


        fillSelect(
            select,
            districts,
            selectId ===
                "governmentDistrict"
                    ? "জেলা নির্বাচন করুন"
                    : "সব জেলা"
        );


        select.disabled =
            districts.length ===
            0;

    }


    function updateUpazilaOptions(
        districtId,
        selectId
    ) {

        const select =
            get(
                selectId
            );


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


        fillSelect(
            select,
            upazilas,
            selectId ===
                "governmentUpazila"
                    ? "উপজেলা নির্বাচন করুন"
                    : "সব উপজেলা"
        );


        select.disabled =
            upazilas.length ===
            0;

    }


    function populateLocationSelects() {

        fillSelect(
            get(
                "governmentDivisionFilter"
            ),
            state.divisions,
            "সব বিভাগ"
        );


        fillSelect(
            get(
                "governmentDivision"
            ),
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
       LOAD LOCATIONS
    ===================================================== */

    async function loadLocations() {

        const [
            divisionsResult,
            districtsResult,
            upazilasResult
        ] =
            await Promise.all(
                [

                    state.supabase
                        .from(
                            DIVISION_TABLE
                        )
                        .select(
                            "id,name,name_bn"
                        )
                        .eq(
                            "is_active",
                            true
                        )
                        .order(
                            "name"
                        ),

                    state.supabase
                        .from(
                            DISTRICT_TABLE
                        )
                        .select(
                            "id,name,name_bn,division_id"
                        )
                        .eq(
                            "is_active",
                            true
                        )
                        .order(
                            "name"
                        ),

                    state.supabase
                        .from(
                            UPAZILA_TABLE
                        )
                        .select(
                            "id,name,name_bn,district_id,division_id"
                        )
                        .eq(
                            "is_active",
                            true
                        )
                        .order(
                            "name"
                        )

                ]
            );


        if (
            divisionsResult.error
        ) {

            throw divisionsResult.error;

        }


        if (
            districtsResult.error
        ) {

            throw districtsResult.error;

        }


        if (
            upazilasResult.error
        ) {

            throw upazilasResult.error;

        }


        state.divisions =
            divisionsResult.data || [];

        state.districts =
            districtsResult.data || [];

        state.upazilas =
            upazilasResult.data || [];


        populateLocationSelects();

    }


    /* =====================================================
       LOAD GOVERNMENT OFFICES
    ===================================================== */

    async function loadOffices() {

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
                            ascending:
                                false
                        }
                    );


            if (error) {

                throw error;

            }


            state.offices =
                Array.isArray(data)
                    ? data
                    : [];


            loadOfficeTypes();


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
                getErrorMessage(
                    error
                )
            );

        }

    }


    /* =====================================================
       OFFICE TYPES
    ===================================================== */

    function loadOfficeTypes() {

        const select =
            get(
                "governmentTypeFilter"
            );


        if (!select) {

            return;

        }


        const typeMap =
            new Map();


        state.offices.forEach(
            function (office) {

                const type =
                    cleanText(
                        office.office_type
                    );


                if (type) {

                    typeMap.set(
                        type.toLowerCase(),
                        type
                    );

                }

            }
        );


        const types =
            Array.from(
                typeMap.values()
            ).sort(
                function (a, b) {

                    return a.localeCompare(
                        b
                    );

                }
            );


        select.innerHTML = `
            <option value="">
                সব office type
            </option>
        `;


        types.forEach(
            function (type) {

                const option =
                    document.createElement(
                        "option"
                    );


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
       FILTERS
    ===================================================== */

    function applyFilters() {

        const search =
            cleanText(
                get(
                    "governmentSearch"
                )?.value
            ).toLowerCase();


        const type =
            cleanText(
                get(
                    "governmentTypeFilter"
                )?.value
            ).toLowerCase();


        const divisionId =
            cleanText(
                get(
                    "governmentDivisionFilter"
                )?.value
            );


        const districtId =
            cleanText(
                get(
                    "governmentDistrictFilter"
                )?.value
            );


        const upazilaId =
            cleanText(
                get(
                    "governmentUpazilaFilter"
                )?.value
            );


        const status =
            cleanText(
                get(
                    "governmentStatusFilter"
                )?.value
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
                            office.website,
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
                        ) !== String(
                            divisionId
                        )
                    ) {

                        return false;

                    }


                    if (
                        districtId &&
                        String(
                            office.district_id
                        ) !== String(
                            districtId
                        )
                    ) {

                        return false;

                    }


                    if (
                        upazilaId &&
                        String(
                            office.upazila_id
                        ) !== String(
                            upazilaId
                        )
                    ) {

                        return false;

                    }


                    if (
                        status === "active" &&
                        office.is_active !== true
                    ) {

                        return false;

                    }


                    if (
                        status === "inactive" &&
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


        updateStatistics();
        updateResultCount();

        renderOfficeTable();
        renderPagination();

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
                formatNumber(
                    total
                );

        }


        if (activeElement) {

            activeElement.textContent =
                formatNumber(
                    active
                );

        }


        if (verifiedElement) {

            verifiedElement.textContent =
                formatNumber(
                    verified
                );

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


        element.textContent =
            `${formatNumber(
                state.filteredOffices.length
            )} results`;

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


    function statusBadge(
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
                        কোনো Government Office পাওয়া যায়নি।
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


        const items =
            state.filteredOffices.slice(
                start,
                start +
                PAGE_SIZE
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

                                <div
                                    class="government-office-cell"
                                >

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

                                ${
                                    phone
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
                                ${statusBadge(
                                    office.is_active
                                )}
                            </td>


                            <td>
                                ${renderRowActions(
                                    office
                                )}
                            </td>

                        </tr>
                    `;

                }
            ).join("");

    }


    function renderRowActions(
        office
    ) {

        const statusLabel =
            office.is_active
                ? "Deactivate"
                : "Activate";


        const verifyLabel =
            office.is_verified
                ? "Unverify"
                : "Verify";


        return `
            <div
                class="government-row-actions"
            >

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
                    data-action="status"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    ${statusLabel}
                </button>


                <button
                    type="button"
                    class="government-row-btn"
                    data-action="verify"
                    data-id="${escapeHTML(
                        office.id
                    )}"
                >
                    ${verifyLabel}
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


        const totalPages =
            Math.ceil(
                state.filteredOffices.length /
                PAGE_SIZE
            );


        if (
            totalPages <= 1
        ) {

            container.innerHTML =
                "";

            return;

        }


        const currentPage =
            state.currentPage;


        let html =
            "";


        html += `
            <button
                type="button"
                data-page="${
                    currentPage - 1
                }"
                ${
                    currentPage <= 1
                        ? "disabled"
                        : ""
                }
            >
                ‹
            </button>
        `;


        const startPage =
            Math.max(
                1,
                currentPage - 2
            );


        const endPage =
            Math.min(
                totalPages,
                startPage + 4
            );


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
                        page === currentPage
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
                data-page="${
                    currentPage + 1
                }"
                ${
                    currentPage >= totalPages
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


        if (!modal) {

            return;

        }


        state.editingId =
            office
                ? office.id
                : null;


        get(
            "governmentId"
        ).value =
            office?.id || "";


        get(
            "governmentName"
        ).value =
            office?.name || "";


        get(
            "governmentNameBn"
        ).value =
            office?.name_bn || "";


        get(
            "governmentOfficeType"
        ).value =
            office?.office_type || "";


        get(
            "governmentDescription"
        ).value =
            office?.description || "";


        get(
            "governmentPhone"
        ).value =
            office?.phone || "";


        get(
            "governmentEmail"
        ).value =
            office?.email || "";


        get(
            "governmentWebsite"
        ).value =
            office?.website || "";


        get(
            "governmentAddress"
        ).value =
            office?.address || "";


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


        populateLocationSelects();


        const division =
            get(
                "governmentDivision"
            );

        const district =
            get(
                "governmentDistrict"
            );

        const upazila =
            get(
                "governmentUpazila"
            );


        if (
            office?.division_id
        ) {

            division.value =
                office.division_id;


            updateDistrictOptions(
                office.division_id,
                "governmentDistrict"
            );

        }


        if (
            office?.district_id
        ) {

            district.value =
                office.district_id;


            updateUpazilaOptions(
                office.district_id,
                "governmentUpazila"
            );

        }


        if (
            office?.upazila_id
        ) {

            upazila.value =
                office.upazila_id;

        }


        const title =
            get(
                "governmentModalTitle"
            );


        if (title) {

            title.textContent =
                office
                    ? "Edit Government Office"
                    : "Add Government Office";

        }


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


        setTimeout(
            function () {

                get(
                    "governmentName"
                )?.focus();

            },
            50
        );

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


        get(
            "governmentForm"
        )?.reset();


        populateLocationSelects();

    }


    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateEmail(
        value
    ) {

        if (!value) {

            return true;

        }


        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value
        );

    }


    function validateWebsite(
        value
    ) {

        if (!value) {

            return true;

        }


        try {

            const url =
                new URL(
                    value
                );


            return (
                url.protocol ===
                    "http:" ||

                url.protocol ===
                    "https:"
            );

        } catch {

            return false;

        }

    }


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


    function validateForm(
        data
    ) {

        if (!data.name) {

            showToast(
                "Office Name আবশ্যক।"
            );

            get(
                "governmentName"
            )?.focus();

            return false;

        }


        if (!data.name_bn) {

            showToast(
                "বাংলা নাম আবশ্যক।"
            );

            get(
                "governmentNameBn"
            )?.focus();

            return false;

        }


        if (
            data.email &&
            !validateEmail(
                data.email
            )
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
            data.website &&
            !validateWebsite(
                data.website
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

    function findDuplicate(
        name,
        nameBn,
        excludeId = null
    ) {

        const normalizedName =
            cleanText(
                name
            ).toLowerCase();


        const normalizedNameBn =
            cleanText(
                nameBn
            ).toLowerCase();


        return state.offices.find(
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
        ) || null;

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
                "আপনার এই তথ্য পরিবর্তনের অনুমতি নেই।"
            );

            return;

        }


        const data =
            getFormData();


        if (
            !validateForm(
                data
            )
        ) {

            return;

        }


        const duplicate =
            findDuplicate(
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


        const button =
            get(
                "governmentSaveBtn"
            );


        state.isSaving =
            true;


        if (button) {

            button.disabled =
                true;

            button.textContent =
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
                    "Government Office update হয়েছে।"
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
                    "Government Office যোগ হয়েছে।"
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


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    state.editingId
                        ? "Update Government Office"
                        : "Save Government Office";

            }

        }

    }


    /* =====================================================
       STATUS
    ===================================================== */

    async function toggleStatus(
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
                    ) === String(
                        id
                    );

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const nextStatus =
            office.is_active !==
            true;


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
                                nextStatus,

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
                nextStatus
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
       VERIFICATION
    ===================================================== */

    async function toggleVerification(
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
                    ) === String(
                        id
                    );

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const nextValue =
            office.is_verified !==
            true;


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
                                nextValue,

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
                nextValue
                    ? "Office verified হয়েছে।"
                    : "Office unverified করা হয়েছে।"
            );


            await loadOffices();


        } catch (error) {

            console.error(
                "Government verification error:",
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
                    ) === String(
                        id
                    );

                }
            );


        if (!office) {

            showToast(
                "Office পাওয়া যায়নি।"
            );

            return;

        }


        const label =
            cleanText(
                office.name_bn ||
                office.name
            );


        const confirmed =
            window.confirm(
                `“${label}” স্থায়ীভাবে delete করতে চান?`
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
       EVENTS
    ===================================================== */

    function bindEvents() {

        get(
            "governmentAddBtn"
        )?.addEventListener(
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


        get(
            "governmentRefresh"
        )?.addEventListener(
            "click",
            function () {

                loadLocations()
                    .then(
                        loadOffices
                    )
                    .catch(
                        function (error) {

                            console.error(
                                "Government refresh error:",
                                error
                            );

                            showToast(
                                getErrorMessage(
                                    error
                                )
                            );

                        }
                    );

            }
        );


        get(
            "governmentCancelBtn"
        )?.addEventListener(
            "click",
            closeModal
        );


        get(
            "governmentModalClose"
        )?.addEventListener(
            "click",
            closeModal
        );


        get(
            "governmentModal"
        )?.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.dataset.closeModal ===
                    "true"
                ) {

                    closeModal();

                }

            }
        );


        get(
            "governmentForm"
        )?.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                saveGovernmentOffice();

            }
        );


        get(
            "governmentSearch"
        )?.addEventListener(
            "input",
            function () {

                state.currentPage =
                    1;

                applyFilters();

            }
        );


        get(
            "governmentTypeFilter"
        )?.addEventListener(
            "change",
            function () {

                state.currentPage =
                    1;

                applyFilters();

            }
        );


        get(
            "governmentDivisionFilter"
        )?.addEventListener(
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


        get(
            "governmentDistrictFilter"
        )?.addEventListener(
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


        get(
            "governmentUpazilaFilter"
        )?.addEventListener(
            "change",
            function () {

                state.currentPage =
                    1;

                applyFilters();

            }
        );


        get(
            "governmentStatusFilter"
        )?.addEventListener(
            "change",
            function () {

                state.currentPage =
                    1;

                applyFilters();

            }
        );


        get(
            "governmentVerificationFilter"
        )?.addEventListener(
            "change",
            function () {

                state.currentPage =
                    1;

                applyFilters();

            }
        );


        get(
            "governmentDivision"
        )?.addEventListener(
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


        get(
            "governmentDistrict"
        )?.addEventListener(
            "change",
            function () {

                updateUpazilaOptions(
                    this.value,
                    "governmentUpazila"
                );

            }
        );


        get(
            "governmentPagination"
        )?.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "button[data-page]"
                    );


                if (!button) {

                    return;

                }


                const page =
                    Number(
                        button.dataset.page
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
                    !Number.isInteger(
                        page
                    ) ||
                    page < 1 ||
                    page > totalPages
                ) {

                    return;

                }


                state.currentPage =
                    page;


                renderOfficeTable();
                renderPagination();

            }
        );


        get(
            "governmentTableBody"
        )?.addEventListener(
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

                    const office =
                        state.offices.find(
                            function (item) {

                                return String(
                                    item.id
                                ) === String(
                                    id
                                );

                            }
                        );


                    if (office) {

                        openModal(
                            office
                        );

                    }


                    return;

                }


                if (
                    action ===
                    "status"
                ) {

                    toggleStatus(
                        id
                    );

                    return;

                }


                if (
                    action ===
                    "verify"
                ) {

                    toggleVerification(
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


        get(
            "sidebarToggle"
        )?.addEventListener(
            "click",
            openSidebar
        );


        get(
            "sidebarClose"
        )?.addEventListener(
            "click",
            closeSidebar
        );


        get(
            "sidebarOverlay"
        )?.addEventListener(
            "click",
            closeSidebar
        );


        get(
            "sidebarLogout"
        )?.addEventListener(
            "click",
            handleLogout
        );


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


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
        );

    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        get(
            "adminSidebar"
        )?.classList.add(
            "open"
        );


        get(
            "sidebarOverlay"
        )?.classList.add(
            "active"
        );

    }


    function closeSidebar() {

        get(
            "adminSidebar"
        )?.classList.remove(
            "open"
        );


        get(
            "sidebarOverlay"
        )?.classList.remove(
            "active"
        );

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
       INITIALIZE
    ===================================================== */

    async function initialize() {

        if (
            state.initialized
        ) {

            return;

        }


        try {

            /*
             * Wait until the existing
             * Admin Guard has completed
             * authentication + profile verification.
             */

            await waitForAdminSystem();


            state.profile =
                getAdmin().getProfile();


            /*
             * Use existing verified
             * Supabase client.
             */

            initializeSupabase();


            /*
             * Attach events before
             * loading data.
             */

            bindEvents();


            /*
             * Keep page safe while
             * data is loading.
             */

            renderLoading();


            /*
             * Load location master data
             * first.
             */

            await loadLocations();


            /*
             * Then load government offices.
             */

            await loadOffices();


            state.initialized =
                true;


            console.log(
                "Dorkari Government Management ready."
            );


        } catch (error) {

            console.error(
                "Government initialization failed:",
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
       PUBLIC API
    ===================================================== */

    window.DorkariGovernment = {

        refresh:
            function () {

                return loadOffices();

            },


        getOffices:
            function () {

                return [
                    ...state.offices
                ];

            },


        getFilteredOffices:
            function () {

                return [
                    ...state.filteredOffices
                ];

            },


        openAddForm:
            function () {

                openModal(
                    null
                );

            },


        closeForm:
            closeModal,


        getState:
            function () {

                return {

                    initialized:
                        state.initialized,

                    offices:
                        [
                            ...state.offices
                        ],

                    filteredOffices:
                        [
                            ...state.filteredOffices
                        ],

                    currentPage:
                        state.currentPage

                };

            }

    };


    /* =====================================================
       START
    ===================================================== */

    function start() {

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

    }


    start();


})();
