/* =========================================================
   DORKARI — HOSPITAL MANAGEMENT
   File: js/admin-hospital.js

   F-8.2 — Hospital Add

   Handles:
   - Hospital list
   - Search
   - Hospital type filter
   - Division → District → Upazila dependency
   - Status filter
   - Verification filter
   - Pagination
   - Add Hospital
   - Modal open / close
   - Validation
   - Duplicate validation
   - Supabase insert

   NOTE:
   - Edit / Update intentionally belongs to F-8.3
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLE = "hospitals";
    const PAGE_SIZE = 10;

    const HOSPITAL_TYPES = [
        "Government",
        "Private",
        "Specialized",
        "Clinic",
        "Diagnostic"
    ];


    /* =====================================================
       STATE
       ===================================================== */

    const S = {
        hospitals: [],
        filteredHospitals: [],

        divisions: [],
        districts: [],
        upazilas: [],

        currentPage: 1,
        editingHospitalId: null,

        isSaving: false,
        initialized: false
    };


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    function cleanText(value) {
        return String(value ?? "").trim();
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = String(value ?? "");
        }
    }


    function setNumber(id, value) {
        setText(
            id,
            Number(value || 0).toLocaleString("en-US")
        );
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(message, type) {
        const toast = getElement("hospitalToast");
        const toastMessage = getElement("hospitalToastMessage");

        if (!toast) {
            return;
        }

        if (toastMessage) {
            toastMessage.textContent = String(message || "");
        } else {
            toast.textContent = String(message || "");
        }

        toast.className =
            "hospital-toast" +
            (type ? " " + type : "");

        clearTimeout(toast._dorkariTimer);

        toast._dorkariTimer = setTimeout(function () {
            toast.className = "hospital-toast";
        }, 3500);
    }


    /* =====================================================
       ERROR MESSAGE
       ===================================================== */

    function getErrorMessage(error) {
        if (!error) {
            return "একটি সমস্যা হয়েছে।";
        }

        if (error.code === "23505") {
            return "এই Hospital তথ্যটি আগে থেকেই আছে।";
        }

        if (error.code === "42501") {
            return "এই কাজটি করার অনুমতি নেই।";
        }

        if (error.message) {
            return error.message;
        }

        return "Hospital তথ্য সংরক্ষণ করা যায়নি।";
    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    let supabaseClient = null;


    function initializeSupabase() {
        /*
         * Primary:
         * Existing admin system client
         */
        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.getSupabase ===
                "function"
        ) {
            const client =
                window.DorkariAdmin.getSupabase();

            if (client) {
                supabaseClient = client;
                return;
            }
        }


        /*
         * Fallback:
         * Existing global client
         */
        if (window.supabaseClient) {
            supabaseClient =
                window.supabaseClient;

            return;
        }


        /*
         * Final fallback:
         * Create client from config
         */
        if (
            window.supabase &&
            typeof window.supabase.createClient ===
                "function"
        ) {
            const config =
                window.DorkariConfig ||
                window.DorkariConfigData ||
                window.CONFIG;

            if (
                config &&
                config.supabaseUrl &&
                config.supabaseAnonKey
            ) {
                supabaseClient =
                    window.supabase.createClient(
                        config.supabaseUrl,
                        config.supabaseAnonKey
                    );

                return;
            }
        }


        throw new Error(
            "Supabase client পাওয়া যায়নি।"
        );
    }


    /* =====================================================
       DOM REFERENCES
       ===================================================== */

    /* Modal */
    const hospitalModal =
        getElement("hospitalModal");

    const hospitalModalTitle =
        getElement("hospitalModalTitle");

    const hospitalModalClose =
        getElement("hospitalModalClose");


    /* Form */
    const hospitalForm =
        getElement("hospitalForm");

    const hospitalId =
        getElement("hospitalId");

    const hospitalName =
        getElement("hospitalName");

    const hospitalNameBn =
        getElement("hospitalNameBn");

    const hospitalType =
        getElement("hospitalType");

    const hospitalDivision =
        getElement("hospitalDivision");

    const hospitalDistrict =
        getElement("hospitalDistrict");

    const hospitalUpazila =
        getElement("hospitalUpazila");

    const hospitalAddress =
        getElement("hospitalAddress");

    const hospitalPhone =
        getElement("hospitalPhone");

    const hospitalEmergencyPhone =
        getElement("hospitalEmergencyPhone");

    const hospitalEmail =
        getElement("hospitalEmail");

    const hospitalWebsite =
        getElement("hospitalWebsite");

    const hospitalDescription =
        getElement("hospitalDescription");

    const hospitalLatitude =
        getElement("hospitalLatitude");

    const hospitalLongitude =
        getElement("hospitalLongitude");

    const hospitalVerified =
        getElement("hospitalVerified");

    const hospitalActive =
        getElement("hospitalActive");

    const hospitalCancelBtn =
        getElement("hospitalCancelBtn");

    const hospitalSaveBtn =
        getElement("hospitalSaveBtn");


    /* Filters */
    const hospitalSearch =
        getElement("hospitalSearch");

    const hospitalTypeFilter =
        getElement("hospitalTypeFilter");

    const hospitalDivisionFilter =
        getElement("hospitalDivisionFilter");

    const hospitalDistrictFilter =
        getElement("hospitalDistrictFilter");

    const hospitalUpazilaFilter =
        getElement("hospitalUpazilaFilter");

    const hospitalStatusFilter =
        getElement("hospitalStatusFilter");

    const hospitalVerificationFilter =
        getElement("hospitalVerificationFilter");


    /* List */
    const hospitalList =
        getElement("hospitalList");


    /* =====================================================
       MODAL
       ===================================================== */

    function setModalVisible(visible) {
        if (!hospitalModal) {
            return;
        }

        hospitalModal.setAttribute(
            "aria-hidden",
            visible ? "false" : "true"
        );

        hospitalModal.hidden = !visible;

        hospitalModal.style.display =
            visible ? "flex" : "none";

        document.body.classList.toggle(
            "hospital-modal-open",
            visible
        );
    }


    /* =====================================================
       FORM ERROR
       ===================================================== */

    function clearFormErrors() {
        document
            .querySelectorAll(
                "#hospitalForm .hospital-field-error"
            )
            .forEach(function (element) {
                element.remove();
            });

        document
            .querySelectorAll(
                "#hospitalForm .hospital-input-error"
            )
            .forEach(function (element) {
                element.classList.remove(
                    "hospital-input-error"
                );
            });
    }


    function setFieldError(field, message) {
        if (!field) {
            return;
        }

        field.classList.add(
            "hospital-input-error"
        );

        const parent =
            field.parentElement;

        if (!parent) {
            return;
        }

        const oldError =
            parent.querySelector(
                ".hospital-field-error"
            );

        if (oldError) {
            oldError.remove();
        }

        const errorElement =
            document.createElement("div");

        errorElement.className =
            "hospital-field-error";

        errorElement.textContent =
            String(message || "");

        parent.appendChild(
            errorElement
        );
    }


    /* =====================================================
       SELECT HELPERS
       ===================================================== */

    function setSelectDisabled(
        select,
        disabled
    ) {
        if (select) {
            select.disabled =
                Boolean(disabled);
        }
    }


    function resetSelect(
        select,
        placeholder,
        disabled
    ) {
        if (!select) {
            return;
        }

        select.innerHTML = "";

        const option =
            document.createElement("option");

        option.value = "";
        option.textContent =
            placeholder;

        select.appendChild(
            option
        );

        select.value = "";

        setSelectDisabled(
            select,
            disabled
        );
    }


    function appendLocationOptions(
        select,
        rows
    ) {
        if (!select) {
            return;
        }

        (rows || []).forEach(
            function (row) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    row.id;

                option.textContent =
                    row.name_bn
                        ? `${row.name_bn} (${row.name || ""})`
                        : (
                            row.name || ""
                        );

                select.appendChild(
                    option
                );
            }
        );
    }


    function populateDivisionSelect(
        select,
        placeholder,
        rows
    ) {
        if (!select) {
            return;
        }

        resetSelect(
            select,
            placeholder,
            false
        );

        appendLocationOptions(
            select,
            rows
        );
    }


    function populateDistrictSelect(
        select,
        placeholder,
        rows,
        divisionId
    ) {
        if (!select) {
            return;
        }

        const filteredRows =
            divisionId
                ? (rows || []).filter(
                    function (row) {
                        return (
                            row.division_id ===
                            divisionId
                        );
                    }
                )
                : [];

        resetSelect(
            select,
            placeholder,
            !divisionId
        );

        appendLocationOptions(
            select,
            filteredRows
        );
    }


    function populateUpazilaSelect(
        select,
        placeholder,
        rows,
        districtId
    ) {
        if (!select) {
            return;
        }

        const filteredRows =
            districtId
                ? (rows || []).filter(
                    function (row) {
                        return (
                            row.district_id ===
                            districtId
                        );
                    }
                )
                : [];

        resetSelect(
            select,
            placeholder,
            !districtId
        );

        appendLocationOptions(
            select,
            filteredRows
        );
    }


    /* =====================================================
       LOCATION LOAD
       ===================================================== */

    async function loadDivisions() {
        const result =
            await supabaseClient
                .from("divisions")
                .select(
                    "id,name,name_bn"
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

        if (result.error) {
            throw result.error;
        }

        S.divisions =
            result.data || [];

        populateDivisionSelect(
            hospitalDivision,
            "Select Division",
            S.divisions
        );

        populateDivisionSelect(
            hospitalDivisionFilter,
            "সব বিভাগ",
            S.divisions
        );
    }


    async function loadDistricts() {
        const result =
            await supabaseClient
                .from("districts")
                .select(
                    "id,name,name_bn,division_id"
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

        if (result.error) {
            throw result.error;
        }

        S.districts =
            result.data || [];

        populateDistrictSelect(
            hospitalDistrictFilter,
            "সব জেলা",
            S.districts,
            ""
        );
    }


    async function loadUpazilas() {
        const result =
            await supabaseClient
                .from("upazilas")
                .select(
                    "id,name,name_bn,district_id"
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

        if (result.error) {
            throw result.error;
        }

        S.upazilas =
            result.data || [];
    }


    /* =====================================================
       FORM LOCATION DEPENDENCY
       ===================================================== */

    function handleFormDivisionChange() {
        const divisionId =
            hospitalDivision
                ? hospitalDivision.value
                : "";

        populateDistrictSelect(
            hospitalDistrict,
            "Select District",
            S.districts,
            divisionId
        );

        populateUpazilaSelect(
            hospitalUpazila,
            "Select Upazila",
            S.upazilas,
            ""
        );
    }


    function handleFormDistrictChange() {
        const districtId =
            hospitalDistrict
                ? hospitalDistrict.value
                : "";

        populateUpazilaSelect(
            hospitalUpazila,
            "Select Upazila",
            S.upazilas,
            districtId
        );
    }


    /* =====================================================
       FILTER LOCATION DEPENDENCY
       ===================================================== */

    function handleFilterDivisionChange() {
        const divisionId =
            hospitalDivisionFilter
                ? hospitalDivisionFilter.value
                : "";

        populateDistrictSelect(
            hospitalDistrictFilter,
            "সব জেলা",
            S.districts,
            divisionId
        );

        populateUpazilaSelect(
            hospitalUpazilaFilter,
            "সব উপজেলা",
            S.upazilas,
            ""
        );

        applyFilters();
    }


    function handleFilterDistrictChange() {
        const districtId =
            hospitalDistrictFilter
                ? hospitalDistrictFilter.value
                : "";

        populateUpazilaSelect(
            hospitalUpazilaFilter,
            "সব উপজেলা",
            S.upazilas,
            districtId
        );

        applyFilters();
    }


    /* =====================================================
       HOSPITAL LOAD
       ===================================================== */

    async function loadHospitals() {
        showLoadingState();

        const result =
            await supabaseClient
                .from(TABLE)
                .select(`
                    id,
                    name,
                    name_bn,
                    hospital_type,
                    division_id,
                    district_id,
                    upazila_id,
                    address,
                    phone,
                    emergency_phone,
                    email,
                    website,
                    description,
                    latitude,
                    longitude,
                    is_verified,
                    is_active,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (result.error) {
            throw result.error;
        }

        S.hospitals =
            result.data || [];

        updateSummary();

        applyFilters();
    }


    /* =====================================================
       SUMMARY
       ===================================================== */

    function updateSummary() {
        const total =
            S.hospitals.length;

        const active =
            S.hospitals.filter(
                function (hospital) {
                    return (
                        hospital.is_active ===
                        true
                    );
                }
            ).length;

        const verified =
            S.hospitals.filter(
                function (hospital) {
                    return (
                        hospital.is_verified ===
                        true
                    );
                }
            ).length;

        setNumber(
            "hospitalTotalCount",
            total
        );

        setNumber(
            "hospitalActiveCount",
            active
        );

        setNumber(
            "hospitalVerifiedCount",
            verified
        );
    }


    /* =====================================================
       FILTERING
       ===================================================== */

    function normalizeSearch(value) {
        return cleanText(value)
            .toLocaleLowerCase();
    }


    function applyFilters() {
        const search =
            normalizeSearch(
                hospitalSearch
                    ? hospitalSearch.value
                    : ""
            );

        const type =
            hospitalTypeFilter
                ? hospitalTypeFilter.value
                : "";

        const divisionId =
            hospitalDivisionFilter
                ? hospitalDivisionFilter.value
                : "";

        const districtId =
            hospitalDistrictFilter
                ? hospitalDistrictFilter.value
                : "";

        const upazilaId =
            hospitalUpazilaFilter
                ? hospitalUpazilaFilter.value
                : "";

        const status =
            hospitalStatusFilter
                ? hospitalStatusFilter.value
                : "";

        const verification =
            hospitalVerificationFilter
                ? hospitalVerificationFilter.value
                : "";


        S.filteredHospitals =
            S.hospitals.filter(
                function (hospital) {

                    const name =
                        normalizeSearch(
                            hospital.name
                        );

                    const nameBn =
                        normalizeSearch(
                            hospital.name_bn
                        );


                    const matchesSearch =
                        !search ||
                        name.includes(search) ||
                        nameBn.includes(search);


                    const matchesType =
                        !type ||
                        hospital.hospital_type ===
                            type;


                    const matchesDivision =
                        !divisionId ||
                        hospital.division_id ===
                            divisionId;


                    const matchesDistrict =
                        !districtId ||
                        hospital.district_id ===
                            districtId;


                    const matchesUpazila =
                        !upazilaId ||
                        hospital.upazila_id ===
                            upazilaId;


                    const matchesStatus =
                        !status ||
                        (
                            status === "active"
                                ? hospital.is_active ===
                                    true
                                : hospital.is_active ===
                                    false
                        );


                    const matchesVerification =
                        !verification ||
                        (
                            verification ===
                                "verified"
                                ? hospital.is_verified ===
                                    true
                                : hospital.is_verified ===
                                    false
                        );


                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesDivision &&
                        matchesDistrict &&
                        matchesUpazila &&
                        matchesStatus &&
                        matchesVerification
                    );
                }
            );


        S.currentPage = 1;

        renderHospitalList();
    }


    /* =====================================================
       LOCATION NAMES
       ===================================================== */

    function getDivisionName(id) {
        const row =
            S.divisions.find(
                function (item) {
                    return (
                        item.id === id
                    );
                }
            );

        return row
            ? (
                row.name_bn ||
                row.name ||
                "—"
            )
            : "—";
    }


    function getDistrictName(id) {
        const row =
            S.districts.find(
                function (item) {
                    return (
                        item.id === id
                    );
                }
            );

        return row
            ? (
                row.name_bn ||
                row.name ||
                "—"
            )
            : "—";
    }


    function getUpazilaName(id) {
        const row =
            S.upazilas.find(
                function (item) {
                    return (
                        item.id === id
                    );
                }
            );

        return row
            ? (
                row.name_bn ||
                row.name ||
                "—"
            )
            : "—";
    }


    /* =====================================================
       LIST STATES
       ===================================================== */

    function setResultCount(count) {
        setText(
            "hospitalResultCount",
            `${Number(count || 0).toLocaleString("en-US")} টি হাসপাতাল`
        );
    }


    function showLoadingState() {
        if (!hospitalList) {
            return;
        }

        hospitalList.innerHTML = `
            <div class="hospital-loading">
                হাসপাতালের তথ্য লোড হচ্ছে...
            </div>
        `;
    }


    function showErrorState(message) {
        if (!hospitalList) {
            return;
        }

        hospitalList.innerHTML = `
            <div class="hospital-error-state">
                ${escapeHTML(
                    message ||
                    "Hospital তথ্য লোড করা যায়নি।"
                )}
            </div>
        `;
    }


    function showEmptyState() {
        if (!hospitalList) {
            return;
        }

        hospitalList.innerHTML = `
            <div class="hospital-empty-state">
                কোনো Hospital পাওয়া যায়নি।
            </div>
        `;
    }


    /* =====================================================
       HOSPITAL LIST RENDER
       ===================================================== */

    function renderHospitalList() {
        if (!hospitalList) {
            return;
        }

        const total =
            S.filteredHospitals.length;

        setResultCount(total);


        if (total === 0) {
            showEmptyState();
            return;
        }


        const totalPages =
            Math.ceil(
                total /
                PAGE_SIZE
            );


        if (
            S.currentPage >
            totalPages
        ) {
            S.currentPage =
                totalPages;
        }


        const start =
            (
                S.currentPage -
                1
            ) *
            PAGE_SIZE;


        const pageItems =
            S.filteredHospitals.slice(
                start,
                start + PAGE_SIZE
            );


        const rows =
            pageItems.map(
                function (hospital) {

                    const division =
                        getDivisionName(
                            hospital.division_id
                        );

                    const district =
                        getDistrictName(
                            hospital.district_id
                        );

                    const upazila =
                        getUpazilaName(
                            hospital.upazila_id
                        );

                    const isActive =
                        hospital.is_active ===
                        true;

                    const isVerified =
                        hospital.is_verified ===
                        true;


                    return `
                        <tr
                            data-id="${escapeHTML(
                                hospital.id
                            )}"
                        >

                            <td>
                                <div class="hospital-table-name">

                                    <div class="hospital-table-icon">
                                        🏥
                                    </div>

                                    <div class="hospital-table-name-text">

                                        <span class="hospital-table-name-bn">
                                            ${escapeHTML(
                                                hospital.name_bn ||
                                                hospital.name ||
                                                "—"
                                            )}
                                        </span>

                                        <span class="hospital-table-name-en">
                                            ${escapeHTML(
                                                hospital.name ||
                                                "—"
                                            )}
                                        </span>

                                    </div>

                                </div>
                            </td>


                            <td>
                                ${escapeHTML(
                                    hospital.hospital_type ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    division
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    district
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    upazila
                                )}
                            </td>


                            <td>

                                <span class="hospital-status ${
                                    isActive
                                        ? "active"
                                        : "inactive"
                                }">

                                    ${
                                        isActive
                                            ? "Active"
                                            : "Inactive"
                                    }

                                </span>

                            </td>


                            <td>

                                <span class="hospital-status ${
                                    isVerified
                                        ? "verified"
                                        : "unverified"
                                }">

                                    ${
                                        isVerified
                                            ? "Verified"
                                            : "Not verified"
                                    }

                                </span>

                            </td>


                            <td>

                                <span class="hospital-phone">

                                    ${escapeHTML(
                                        hospital.phone ||
                                        "—"
                                    )}

                                </span>

                            </td>


                            <td>

                                <div class="hospital-table-actions">

                                    <button
                                        type="button"
                                        class="hospital-action-btn edit"
                                        data-action="edit"
                                        data-id="${escapeHTML(
                                            hospital.id
                                        )}"
                                    >
                                        Edit
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");


        hospitalList.innerHTML = `
            <div class="hospital-table-wrapper">

                <table class="hospital-table">

                    <thead>

                        <tr>

                            <th>
                                Hospital
                            </th>

                            <th>
                                Type
                            </th>

                            <th>
                                Division
                            </th>

                            <th>
                                District
                            </th>

                            <th>
                                Upazila
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Verification
                            </th>

                            <th>
                                Phone
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>


                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>


            ${renderPaginationHTML(
                total,
                totalPages
            )}
        `;


        bindDynamicListEvents();
    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPaginationHTML(
        total,
        totalPages
    ) {
        if (totalPages <= 1) {
            return "";
        }

        const start =
            (
                S.currentPage -
                1
            ) *
            PAGE_SIZE +
            1;

        const end =
            Math.min(
                S.currentPage *
                    PAGE_SIZE,
                total
            );


        let buttons = "";


        for (
            let page = 1;
            page <= totalPages;
            page += 1
        ) {
            buttons += `
                <button
                    type="button"
                    class="hospital-page-btn ${
                        page ===
                        S.currentPage
                            ? "active"
                            : ""
                    }"
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }


        return `
            <div class="hospital-pagination">

                <div class="hospital-pagination-info">
                    Showing ${start}–${end} of ${total} hospitals
                </div>


                <div class="hospital-pagination-controls">
                    ${buttons}
                </div>

            </div>
        `;
    }


    function bindDynamicListEvents() {
        if (!hospitalList) {
            return;
        }


        hospitalList
            .querySelectorAll(
                "[data-page]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const page =
                                Number(
                                    button.dataset.page
                                );

                            if (
                                !Number.isFinite(
                                    page
                                )
                            ) {
                                return;
                            }

                            S.currentPage =
                                page;

                            renderHospitalList();
                        }
                    );

                }
            );


        hospitalList
            .querySelectorAll(
                "[data-action='edit']"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            /*
                             * F-8.3
                             */
                            showToast(
                                "Edit/Update পরবর্তী ধাপে যুক্ত হবে।",
                                "info"
                            );

                        }
                    );

                }
            );
    }


    /* =====================================================
       FORM RESET
       ===================================================== */

    function resetForm() {
        if (hospitalForm) {
            hospitalForm.reset();
        }


        if (hospitalId) {
            hospitalId.value = "";
        }


        S.editingHospitalId =
            null;


        if (hospitalActive) {
            hospitalActive.checked =
                true;
        }


        if (hospitalVerified) {
            hospitalVerified.checked =
                false;
        }


        if (hospitalDivision) {
            hospitalDivision.value =
                "";
        }


        resetSelect(
            hospitalDistrict,
            "Select District",
            true
        );


        resetSelect(
            hospitalUpazila,
            "Select Upazila",
            true
        );


        clearFormErrors();
    }


    /* =====================================================
       ADD MODAL
       ===================================================== */

    function openAddForm() {
        if (S.isSaving) {
            return;
        }

        resetForm();


        if (hospitalModalTitle) {
            hospitalModalTitle.textContent =
                "Add Hospital";
        }


        setModalVisible(true);


        setTimeout(
            function () {
                if (hospitalName) {
                    hospitalName.focus();
                }
            },
            0
        );
    }


    function closeForm() {
        if (S.isSaving) {
            return;
        }

        setModalVisible(false);

        clearFormErrors();

        S.editingHospitalId =
            null;
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateCoordinate(
        field,
        label,
        min,
        max
    ) {
        if (!field) {
            return true;
        }


        const raw =
            cleanText(
                field.value
            );


        if (!raw) {
            return true;
        }


        const number =
            Number(raw);


        if (!Number.isFinite(number)) {
            setFieldError(
                field,
                `${label} সঠিক সংখ্যা হতে হবে।`
            );

            return false;
        }


        if (
            number < min ||
            number > max
        ) {
            setFieldError(
                field,
                `${label} ${min} থেকে ${max} এর মধ্যে হতে হবে।`
            );

            return false;
        }


        return true;
    }


    function validateHospitalForm() {
        clearFormErrors();

        let valid = true;


        const name =
            cleanText(
                hospitalName
                    ? hospitalName.value
                    : ""
            );


        const nameBn =
            cleanText(
                hospitalNameBn
                    ? hospitalNameBn.value
                    : ""
            );


        const type =
            cleanText(
                hospitalType
                    ? hospitalType.value
                    : ""
            );


        const divisionId =
            hospitalDivision
                ? hospitalDivision.value
                : "";


        const districtId =
            hospitalDistrict
                ? hospitalDistrict.value
                : "";


        const upazilaId =
            hospitalUpazila
                ? hospitalUpazila.value
                : "";


        const phone =
            cleanText(
                hospitalPhone
                    ? hospitalPhone.value
                    : ""
            );


        /* Name */
        if (!name) {
            setFieldError(
                hospitalName,
                "Hospital name আবশ্যক।"
            );

            valid = false;
        }


        /* Bangla name */
        if (!nameBn) {
            setFieldError(
                hospitalNameBn,
                "বাংলা নাম আবশ্যক।"
            );

            valid = false;
        }


        /* Type */
        if (
            !type ||
            !HOSPITAL_TYPES.includes(type)
        ) {
            setFieldError(
                hospitalType,
                "Hospital type নির্বাচন করুন।"
            );

            valid = false;
        }


        /* Division */
        if (!divisionId) {
            setFieldError(
                hospitalDivision,
                "Division নির্বাচন করুন।"
            );

            valid = false;
        }


        /* District dependency */
        if (
            districtId &&
            !S.districts.some(
                function (row) {
                    return (
                        row.id === districtId &&
                        row.division_id ===
                            divisionId
                    );
                }
            )
        ) {
            setFieldError(
                hospitalDistrict,
                "নির্বাচিত District সঠিক Division-এর নয়।"
            );

            valid = false;
        }


        /* Upazila dependency */
        if (
            upazilaId &&
            !S.upazilas.some(
                function (row) {
                    return (
                        row.id === upazilaId &&
                        row.district_id ===
                            districtId
                    );
                }
            )
        ) {
            setFieldError(
                hospitalUpazila,
                "নির্বাচিত Upazila সঠিক District-এর নয়।"
            );

            valid = false;
        }


        /* Phone */
        if (!phone) {
            setFieldError(
                hospitalPhone,
                "Phone number আবশ্যক।"
            );

            valid = false;
        }


        /* Email */
        if (
            hospitalEmail &&
            cleanText(
                hospitalEmail.value
            ) &&
            !hospitalEmail.validity.valid
        ) {
            setFieldError(
                hospitalEmail,
                "সঠিক email দিন।"
            );

            valid = false;
        }


        /* Website */
        if (
            hospitalWebsite &&
            cleanText(
                hospitalWebsite.value
            ) &&
            !hospitalWebsite.validity.valid
        ) {
            setFieldError(
                hospitalWebsite,
                "সঠিক website URL দিন।"
            );

            valid = false;
        }


        /* Latitude */
        if (
            !validateCoordinate(
                hospitalLatitude,
                "Latitude",
                -90,
                90
            )
        ) {
            valid = false;
        }


        /* Longitude */
        if (
            !validateCoordinate(
                hospitalLongitude,
                "Longitude",
                -180,
                180
            )
        ) {
            valid = false;
        }


        return valid;
    }


    /* =====================================================
       DUPLICATE CHECK
       ===================================================== */

    function normalizeExact(value) {
        return cleanText(value)
            .toLocaleLowerCase();
    }


    function findHospitalDuplicate(
        name,
        nameBn
    ) {
        const normalizedName =
            normalizeExact(name);

        const normalizedNameBn =
            normalizeExact(nameBn);


        return (
            S.hospitals.find(
                function (hospital) {

                    if (
                        S.editingHospitalId &&
                        hospital.id ===
                            S.editingHospitalId
                    ) {
                        return false;
                    }


                    return (
                        normalizeExact(
                            hospital.name
                        ) ===
                            normalizedName ||

                        normalizeExact(
                            hospital.name_bn
                        ) ===
                            normalizedNameBn
                    );
                }
            ) || null
        );
    }


    /* =====================================================
       FORM PAYLOAD
       ===================================================== */

    function parseNullableNumber(field) {
        if (!field) {
            return null;
        }

        const raw =
            cleanText(
                field.value
            );

        if (!raw) {
            return null;
        }

        const value =
            Number(raw);

        return Number.isFinite(value)
            ? value
            : null;
    }


    function getHospitalPayload() {
        return {

            name:
                cleanText(
                    hospitalName
                        ? hospitalName.value
                        : ""
                ),


            name_bn:
                cleanText(
                    hospitalNameBn
                        ? hospitalNameBn.value
                        : ""
                ),


            hospital_type:
                cleanText(
                    hospitalType
                        ? hospitalType.value
                        : ""
                ),


            division_id:
                hospitalDivision &&
                hospitalDivision.value
                    ? hospitalDivision.value
                    : null,


            district_id:
                hospitalDistrict &&
                hospitalDistrict.value
                    ? hospitalDistrict.value
                    : null,


            upazila_id:
                hospitalUpazila &&
                hospitalUpazila.value
                    ? hospitalUpazila.value
                    : null,


            address:
                cleanText(
                    hospitalAddress
                        ? hospitalAddress.value
                        : ""
                ) || null,


            phone:
                cleanText(
                    hospitalPhone
                        ? hospitalPhone.value
                        : ""
                ),


            emergency_phone:
                cleanText(
                    hospitalEmergencyPhone
                        ? hospitalEmergencyPhone.value
                        : ""
                ) || null,


            email:
                cleanText(
                    hospitalEmail
                        ? hospitalEmail.value
                        : ""
                ) || null,


            website:
                cleanText(
                    hospitalWebsite
                        ? hospitalWebsite.value
                        : ""
                ) || null,


            description:
                cleanText(
                    hospitalDescription
                        ? hospitalDescription.value
                        : ""
                ) || null,


            latitude:
                parseNullableNumber(
                    hospitalLatitude
                ),


            longitude:
                parseNullableNumber(
                    hospitalLongitude
                ),


            is_verified:
                hospitalVerified
                    ? hospitalVerified.checked
                    : false,


            is_active:
                hospitalActive
                    ? hospitalActive.checked
                    : true
        };
    }


    /* =====================================================
       SAVE BUTTON
       ===================================================== */

    function setSaveButtonLoading(
        loading
    ) {
        if (!hospitalSaveBtn) {
            return;
        }

        hospitalSaveBtn.disabled =
            Boolean(loading);

        hospitalSaveBtn.textContent =
            loading
                ? "Saving..."
                : "Save Hospital";
    }


    /* =====================================================
       SAVE — F-8.2
       ===================================================== */

    async function saveHospital() {
        if (S.isSaving) {
            return;
        }


        if (!validateHospitalForm()) {
            return;
        }


        const payload =
            getHospitalPayload();


        /*
         * Client-side duplicate check.
         * This avoids unnecessary Supabase
         * request for obvious duplicates.
         */
        const duplicate =
            findHospitalDuplicate(
                payload.name,
                payload.name_bn
            );


        if (duplicate) {

            const sameEnglish =
                normalizeExact(
                    duplicate.name
                ) ===
                normalizeExact(
                    payload.name
                );


            if (sameEnglish) {
                setFieldError(
                    hospitalName,
                    "এই Hospital name ইতোমধ্যে আছে।"
                );
            } else {
                setFieldError(
                    hospitalNameBn,
                    "এই বাংলা নাম ইতোমধ্যে আছে।"
                );
            }


            showToast(
                "Duplicate Hospital পাওয়া গেছে।",
                "error"
            );

            return;
        }


        S.isSaving = true;

        setSaveButtonLoading(true);


        try {

            /*
             * F-8.2 = INSERT only
             */
            const result =
                await supabaseClient
                    .from(TABLE)
                    .insert(
                        payload
                    )
                    .select()
                    .single();


            if (result.error) {
                throw result.error;
            }


            if (!result.data) {
                throw new Error(
                    "Hospital insert সফল হয়নি।"
                );
            }


            showToast(
                "Hospital সফলভাবে যোগ হয়েছে।",
                "success"
            );


            closeForm();


            await loadHospitals();


            /*
             * Optional same-window integration event.
             * Existing Dashboard code remains untouched.
             */
            window.dispatchEvent(
                new CustomEvent(
                    "dorkari:hospital-changed",
                    {
                        detail: {
                            action: "added",
                            hospital: result.data
                        }
                    }
                )
            );


        } catch (error) {

            console.error(
                "Hospital Add Error:",
                error
            );


            showToast(
                getErrorMessage(error),
                "error"
            );


        } finally {

            S.isSaving = false;

            setSaveButtonLoading(
                false
            );
        }
    }


    /* =====================================================
       CLEAR FILTERS
       ===================================================== */

    function clearFilters() {

        if (hospitalSearch) {
            hospitalSearch.value = "";
        }


        if (hospitalTypeFilter) {
            hospitalTypeFilter.value = "";
        }


        if (hospitalDivisionFilter) {
            hospitalDivisionFilter.value = "";
        }


        populateDistrictSelect(
            hospitalDistrictFilter,
            "সব জেলা",
            S.districts,
            ""
        );


        populateUpazilaSelect(
            hospitalUpazilaFilter,
            "সব উপজেলা",
            S.upazilas,
            ""
        );


        if (hospitalStatusFilter) {
            hospitalStatusFilter.value = "";
        }


        if (hospitalVerificationFilter) {
            hospitalVerificationFilter.value = "";
        }


        applyFilters();
    }


    /* =====================================================
       EVENT BINDING
       ===================================================== */

    function bindEvents() {

        /* ---------------------------------------------
           Add Hospital
           --------------------------------------------- */

        const addButton =
            getElement(
                "hospitalAddBtn"
            );

        if (addButton) {
            addButton.addEventListener(
                "click",
                openAddForm
            );
        }


        /* ---------------------------------------------
           Refresh
           --------------------------------------------- */

        const refreshButton =
            getElement(
                "hospitalRefresh"
            );

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                async function () {

                    try {

                        await loadHospitals();

                        showToast(
                            "Hospital list refresh হয়েছে।",
                            "success"
                        );

                    } catch (error) {

                        console.error(
                            "Hospital refresh error:",
                            error
                        );

                        showErrorState(
                            getErrorMessage(
                                error
                            )
                        );

                        showToast(
                            getErrorMessage(
                                error
                            ),
                            "error"
                        );
                    }
                }
            );
        }


        /* ---------------------------------------------
           Clear Filters
           --------------------------------------------- */

        const clearFiltersButton =
            getElement(
                "hospitalClearFilters"
            );

        if (clearFiltersButton) {
            clearFiltersButton.addEventListener(
                "click",
                clearFilters
            );
        }


        /* ---------------------------------------------
           Modal close
           --------------------------------------------- */

        if (hospitalModalClose) {
            hospitalModalClose.addEventListener(
                "click",
                closeForm
            );
        }


        /* ---------------------------------------------
           Cancel
           --------------------------------------------- */

        if (hospitalCancelBtn) {
            hospitalCancelBtn.addEventListener(
                "click",
                closeForm
            );
        }


        /* ---------------------------------------------
           Form submit
           --------------------------------------------- */

        if (hospitalForm) {

            hospitalForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveHospital();

                }
            );
        }


        /* ---------------------------------------------
           Form Division → District
           --------------------------------------------- */

        if (hospitalDivision) {

            hospitalDivision.addEventListener(
                "change",
                handleFormDivisionChange
            );
        }


        /* ---------------------------------------------
           Form District → Upazila
           --------------------------------------------- */

        if (hospitalDistrict) {

            hospitalDistrict.addEventListener(
                "change",
                handleFormDistrictChange
            );
        }


        /* ---------------------------------------------
           Filter Division → District
           --------------------------------------------- */

        if (
            hospitalDivisionFilter
        ) {

            hospitalDivisionFilter.addEventListener(
                "change",
                handleFilterDivisionChange
            );
        }


        /* ---------------------------------------------
           Filter District → Upazila
           --------------------------------------------- */

        if (
            hospitalDistrictFilter
        ) {

            hospitalDistrictFilter.addEventListener(
                "change",
                handleFilterDistrictChange
            );
        }


        /* ---------------------------------------------
           Search
           --------------------------------------------- */

        if (hospitalSearch) {

            hospitalSearch.addEventListener(
                "input",
                applyFilters
            );
        }


        /* ---------------------------------------------
           Other filters
           --------------------------------------------- */

        [
            hospitalTypeFilter,
            hospitalUpazilaFilter,
            hospitalStatusFilter,
            hospitalVerificationFilter
        ]
            .filter(Boolean)
            .forEach(
                function (element) {

                    element.addEventListener(
                        "change",
                        applyFilters
                    );

                }
            );


        /* ---------------------------------------------
           Modal backdrop
           --------------------------------------------- */

        if (hospitalModal) {

            hospitalModal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        hospitalModal
                    ) {
                        closeForm();
                        return;
                    }


                    if (
                        event.target.classList &&
                        event.target.classList.contains(
                            "hospital-modal-backdrop"
                        )
                    ) {
                        closeForm();
                    }
                }
            );
        }


        /* ---------------------------------------------
           Escape
           --------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    hospitalModal &&
                    hospitalModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {
                    closeForm();
                }

            }
        );
    }


    /* =====================================================
       ADMIN SYSTEM WAIT
       ===================================================== */

    async function waitForAdminSystem() {

        let attempts = 0;

        const maxAttempts = 120;


        while (
            attempts <
            maxAttempts
        ) {

            if (
                window.DorkariAdmin &&
                typeof window.DorkariAdmin
                    .canManageContent ===
                    "function"
            ) {
                return;
            }


            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        50
                    );

                }
            );


            attempts += 1;
        }


        throw new Error(
            "Admin system ready হয়নি।"
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        if (S.initialized) {
            return;
        }


        try {

            await waitForAdminSystem();


            if (
                !window.DorkariAdmin.canManageContent()
            ) {
                throw new Error(
                    "আপনার Hospital Management ব্যবহারের অনুমতি নেই।"
                );
            }


            initializeSupabase();


            /*
             * Bind events before data loading.
             */
            bindEvents();


            /*
             * Start with modal hidden.
             */
            setModalVisible(false);


            /*
             * Load location data.
             */
            await Promise.all([
                loadDivisions(),
                loadDistricts(),
                loadUpazilas()
            ]);


            /*
             * Load hospitals.
             */
            await loadHospitals();


            S.initialized = true;


        } catch (error) {

            console.error(
                "Hospital initialization failed:",
                error
            );


            showErrorState(
                getErrorMessage(error)
            );


            setText(
                "hospitalResultCount",
                "লোড হয়নি"
            );


            showToast(
                getErrorMessage(error),
                "error"
            );
        }
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DorkariHospital = {

        refresh:
            loadHospitals,


        getHospitals:
            function () {
                return [
                    ...S.hospitals
                ];
            },


        getFilteredHospitals:
            function () {
                return [
                    ...S.filteredHospitals
                ];
            },


        openAddForm:
            openAddForm,


        closeForm:
            closeForm
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
