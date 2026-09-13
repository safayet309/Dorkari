/* =========================================================
   DORKARI — HOSPITAL MANAGEMENT
   File: js/admin-hospital.js

   F-8.2 — Hospital Add

   Handles:
   - Hospital list
   - Search
   - Filters
   - Location dependency
   - Add Hospital
   - Validation
   - Duplicate validation
   - Supabase insert
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLE = "hospitals";
    const PAGE_SIZE = 10;


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

        isSaving: false
    };


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    function cleanText(value) {
        return String(value || "").trim();
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showToast(message, type) {

        let toast =
            document.getElementById(
                "hospitalToast"
            );

        if (!toast) {

            toast =
                document.createElement("div");

            toast.id =
                "hospitalToast";

            toast.className =
                "hospital-toast";

            document.body.appendChild(
                toast
            );
        }


        toast.textContent =
            message;


        toast.className =
            "hospital-toast " +
            (type || "info");


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                function () {

                    toast.className =
                        "hospital-toast";

                },
                3500
            );
    }


    function getErrorMessage(error) {

        if (!error) {
            return "একটি সমস্যা হয়েছে।";
        }


        if (
            error.code ===
            "23505"
        ) {
            return "এই Hospital তথ্যটি আগে থেকেই আছে।";
        }


        if (
            error.message
        ) {

            return error.message;
        }


        return "Hospital সংরক্ষণ করা যায়নি।";
    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    let supabaseClient = null;


    function initializeSupabase() {

        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.getSupabase ===
                "function"
        ) {

            supabaseClient =
                window.DorkariAdmin.getSupabase();

            return;
        }


        /*
         * Fallback:
         * যদি admin-auth.js/config.js থেকে
         * global Supabase client পাওয়া যায়।
         */

        if (
            window.supabaseClient
        ) {

            supabaseClient =
                window.supabaseClient;

            return;
        }


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
       DOM
       ===================================================== */

    const hospitalFormPanel =
        getElement(
            "hospitalFormPanel"
        );

    const hospitalForm =
        getElement(
            "hospitalForm"
        );

    const hospitalName =
        getElement(
            "hospitalName"
        );

    const hospitalNameBn =
        getElement(
            "hospitalNameBn"
        );

    const hospitalType =
        getElement(
            "hospitalType"
        );

    const hospitalDivision =
        getElement(
            "hospitalDivision"
        );

    const hospitalDistrict =
        getElement(
            "hospitalDistrict"
        );

    const hospitalUpazila =
        getElement(
            "hospitalUpazila"
        );

    const hospitalAddress =
        getElement(
            "hospitalAddress"
        );

    const hospitalPhone =
        getElement(
            "hospitalPhone"
        );

    const hospitalEmergencyPhone =
        getElement(
            "hospitalEmergencyPhone"
        );

    const hospitalEmail =
        getElement(
            "hospitalEmail"
        );

    const hospitalWebsite =
        getElement(
            "hospitalWebsite"
        );

    const hospitalDescription =
        getElement(
            "hospitalDescription"
        );

    const hospitalLatitude =
        getElement(
            "hospitalLatitude"
        );

    const hospitalLongitude =
        getElement(
            "hospitalLongitude"
        );

    const hospitalIsVerified =
        getElement(
            "hospitalIsVerified"
        );

    const hospitalIsActive =
        getElement(
            "hospitalIsActive"
        );

    const saveHospitalButton =
        getElement(
            "saveHospitalButton"
        );

    const hospitalSearch =
        getElement(
            "hospitalSearch"
        );

    const hospitalTypeFilter =
        getElement(
            "hospitalTypeFilter"
        );

    const hospitalDivisionFilter =
        getElement(
            "hospitalDivisionFilter"
        );

    const hospitalDistrictFilter =
        getElement(
            "hospitalDistrictFilter"
        );

    const hospitalUpazilaFilter =
        getElement(
            "hospitalUpazilaFilter"
        );

    const hospitalStatusFilter =
        getElement(
            "hospitalStatusFilter"
        );

    const hospitalVerificationFilter =
        getElement(
            "hospitalVerificationFilter"
        );


    /* =====================================================
       LOCATION DATA
       ===================================================== */

    async function loadDivisions() {

        const {
            data,
            error
        } =
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


        if (error) {
            throw error;
        }


        S.divisions =
            data || [];


        populateDivisionSelect(
            hospitalDivision,
            "বিভাগ নির্বাচন করুন",
            S.divisions
        );


        populateDivisionSelect(
            hospitalDivisionFilter,
            "সব বিভাগ",
            S.divisions
        );
    }


    async function loadDistricts() {

        const {
            data,
            error
        } =
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


        if (error) {
            throw error;
        }


        S.districts =
            data || [];


        populateDistrictSelect(
            hospitalDistrictFilter,
            "সব জেলা",
            S.districts
        );
    }


    async function loadUpazilas() {

        const {
            data,
            error
        } =
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


        if (error) {
            throw error;
        }


        S.upazilas =
            data || [];
    }


    function populateDivisionSelect(
        select,
        placeholder,
        rows
    ) {

        if (!select) {
            return;
        }


        select.innerHTML =
            `<option value="">${escapeHTML(
                placeholder
            )}</option>`;


        rows.forEach(
            function (row) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    row.id;

                option.textContent =
                    row.name_bn
                        ? `${row.name_bn} (${row.name})`
                        : row.name;

                select.appendChild(
                    option
                );
            }
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


        const filtered =
            divisionId
                ? rows.filter(
                    function (row) {
                        return (
                            row.division_id ===
                            divisionId
                        );
                    }
                )
                : rows;


        select.innerHTML =
            `<option value="">${escapeHTML(
                placeholder
            )}</option>`;


        filtered.forEach(
            function (row) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    row.id;

                option.textContent =
                    row.name_bn
                        ? `${row.name_bn} (${row.name})`
                        : row.name;

                select.appendChild(
                    option
                );
            }
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


        const filtered =
            districtId
                ? rows.filter(
                    function (row) {
                        return (
                            row.district_id ===
                            districtId
                        );
                    }
                )
                : rows;


        select.innerHTML =
            `<option value="">${escapeHTML(
                placeholder
            )}</option>`;


        filtered.forEach(
            function (row) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    row.id;

                option.textContent =
                    row.name_bn
                        ? `${row.name_bn} (${row.name})`
                        : row.name;

                select.appendChild(
                    option
                );
            }
        );
    }


    /* =====================================================
       LOCATION DEPENDENCY
       ===================================================== */

    function handleFormDivisionChange() {

        if (!hospitalDistrict) {
            return;
        }


        const divisionId =
            hospitalDivision
                ? hospitalDivision.value
                : "";


        populateDistrictSelect(
            hospitalDistrict,
            "জেলা নির্বাচন করুন",
            S.districts,
            divisionId
        );


        populateUpazilaSelect(
            hospitalUpazila,
            "উপজেলা নির্বাচন করুন",
            [],
            ""
        );
    }


    function handleFormDistrictChange() {

        if (!hospitalUpazila) {
            return;
        }


        const districtId =
            hospitalDistrict
                ? hospitalDistrict.value
                : "";


        populateUpazilaSelect(
            hospitalUpazila,
            "উপজেলা নির্বাচন করুন",
            S.upazilas,
            districtId
        );
    }


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
            [],
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
       HOSPITAL DATA
       ===================================================== */

    async function loadHospitals() {

        showLoadingState();


        const {
            data,
            error
        } =
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


        if (error) {
            throw error;
        }


        S.hospitals =
            data || [];


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
                function (item) {
                    return (
                        item.is_active ===
                        true
                    );
                }
            ).length;


        const verified =
            S.hospitals.filter(
                function (item) {
                    return (
                        item.is_verified ===
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


    function setNumber(
        id,
        value
    ) {

        const element =
            getElement(id);


        if (element) {

            element.textContent =
                Number(value || 0)
                    .toLocaleString(
                        "en-US"
                    );
        }
    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function applyFilters() {

        const search =
            cleanText(
                hospitalSearch
                    ? hospitalSearch.value
                    : ""
            ).toLowerCase();


        const type =
            hospitalTypeFilter
                ? hospitalTypeFilter.value
                : "";


        const division =
            hospitalDivisionFilter
                ? hospitalDivisionFilter.value
                : "";


        const district =
            hospitalDistrictFilter
                ? hospitalDistrictFilter.value
                : "";


        const upazila =
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

                    const matchesSearch =
                        !search ||
                        String(
                            hospital.name ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search) ||
                        String(
                            hospital.name_bn ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search);


                    const matchesType =
                        !type ||
                        hospital.hospital_type ===
                            type;


                    const matchesDivision =
                        !division ||
                        hospital.division_id ===
                            division;


                    const matchesDistrict =
                        !district ||
                        hospital.district_id ===
                            district;


                    const matchesUpazila =
                        !upazila ||
                        hospital.upazila_id ===
                            upazila;


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


        S.currentPage =
            1;


        renderHospitalTable();
    }


    /* =====================================================
       TABLE
       ===================================================== */

    function renderHospitalTable() {

        const tbody =
            getElement(
                "hospitalTableBody"
            );


        if (!tbody) {
            return;
        }


        if (
            S.filteredHospitals
                .length === 0
        ) {

            tbody.innerHTML = "";


            showTableState(
                "empty"
            );


            return;
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


        tbody.innerHTML =
            pageItems
                .map(
                    function (hospital) {

                        const division =
                            S.divisions.find(
                                function (item) {
                                    return (
                                        item.id ===
                                        hospital.division_id
                                    );
                                }
                            );


                        const district =
                            S.districts.find(
                                function (item) {
                                    return (
                                        item.id ===
                                        hospital.district_id
                                    );
                                }
                            );


                        const upazila =
                            S.upazilas.find(
                                function (item) {
                                    return (
                                        item.id ===
                                        hospital.upazila_id
                                    );
                                }
                            );


                        return `
                            <tr data-id="${escapeHTML(
                                hospital.id
                            )}">

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
                                            ? (
                                                division.name_bn ||
                                                division.name
                                            )
                                            : "—"
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        district
                                            ? (
                                                district.name_bn ||
                                                district.name
                                            )
                                            : "—"
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        upazila
                                            ? (
                                                upazila.name_bn ||
                                                upazila.name
                                            )
                                            : "—"
                                    )}
                                </td>


                                <td>
                                    <span class="hospital-status ${
                                        hospital.is_active
                                            ? "active"
                                            : "inactive"
                                    }">
                                        ${
                                            hospital.is_active
                                                ? "Active"
                                                : "Inactive"
                                        }
                                    </span>
                                </td>


                                <td>
                                    <span class="hospital-status ${
                                        hospital.is_verified
                                            ? "verified"
                                            : "unverified"
                                    }">
                                        ${
                                            hospital.is_verified
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


        showTableState(
            "table"
        );


        renderPagination();
    }


    function showTableState(
        state
    ) {

        const table =
            getElement(
                "hospitalTable"
            );

        const empty =
            getElement(
                "hospitalEmptyState"
            );

        const loading =
            getElement(
                "hospitalLoadingState"
            );

        const error =
            getElement(
                "hospitalErrorState"
            );


        if (table) {
            table.hidden =
                state !== "table";
        }


        if (empty) {
            empty.hidden =
                state !== "empty";
        }


        if (loading) {
            loading.hidden =
                state !== "loading";
        }


        if (error) {
            error.hidden =
                state !== "error";
        }
    }


    function showLoadingState() {

        showTableState(
            "loading"
        );
    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const controls =
            getElement(
                "hospitalPaginationControls"
            );

        const info =
            getElement(
                "hospitalPaginationInfo"
            );


        if (!controls) {
            return;
        }


        const total =
            S.filteredHospitals.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    PAGE_SIZE
                )
            );


        if (
            S.currentPage >
            totalPages
        ) {

            S.currentPage =
                totalPages;
        }


        if (info) {

            if (total === 0) {

                info.textContent =
                    "Showing 0 hospitals";

            } else {

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


                info.textContent =
                    `Showing ${start}–${end} of ${total} hospitals`;
            }
        }


        controls.innerHTML =
            "";


        if (
            totalPages <= 1
        ) {
            return;
        }


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "hospital-page-btn" +
                (
                    page ===
                    S.currentPage
                        ? " active"
                        : ""
                );


            button.textContent =
                page;


            button.addEventListener(
                "click",
                function () {

                    S.currentPage =
                        page;

                    renderHospitalTable();
                }
            );


            controls.appendChild(
                button
            );
        }
    }


    /* =====================================================
       ADD FORM
       ===================================================== */

    function openAddForm() {

        S.editingHospitalId =
            null;


        if (hospitalForm) {
            hospitalForm.reset();
        }


        clearFormErrors();


        if (
            hospitalFormPanel
        ) {

            hospitalFormPanel.hidden =
                false;
        }


        const title =
            getElement(
                "hospitalFormTitle"
            );


        if (title) {

            title.textContent =
                "Add Hospital";
        }


        /*
         * Default:
         * New hospital active থাকবে।
         */

        if (
            hospitalIsActive
        ) {

            hospitalIsActive.checked =
                true;
        }


        if (
            hospitalIsVerified
        ) {

            hospitalIsVerified.checked =
                false;
        }


        if (
            hospitalDistrict
        ) {

            populateDistrictSelect(
                hospitalDistrict,
                "জেলা নির্বাচন করুন",
                []
            );
        }


        if (
            hospitalUpazila
        ) {

            populateUpazilaSelect(
                hospitalUpazila,
                "উপজেলা নির্বাচন করুন",
                []
            );
        }
    }


    function closeForm() {

        if (
            hospitalFormPanel
        ) {

            hospitalFormPanel.hidden =
                true;
        }


        S.editingHospitalId =
            null;


        clearFormErrors();
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function clearFormErrors() {

        document
            .querySelectorAll(
                ".hospital-field-error"
            )
            .forEach(
                function (element) {

                    element.remove();
                }
            );


        document
            .querySelectorAll(
                ".hospital-input-error"
            )
            .forEach(
                function (element) {

                    element.classList.remove(
                        "hospital-input-error"
                    );
                }
            );
    }


    function setFieldError(
        field,
        message
    ) {

        if (!field) {
            return;
        }


        field.classList.add(
            "hospital-input-error"
        );


        const error =
            document.createElement(
                "div"
            );


        error.className =
            "hospital-field-error";


        error.textContent =
            message;


        field.parentElement.appendChild(
            error
        );
    }


    function validateHospitalForm() {

        clearFormErrors();


        let valid =
            true;


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


        const phone =
            cleanText(
                hospitalPhone
                    ? hospitalPhone.value
                    : ""
            );


        if (!name) {

            setFieldError(
                hospitalName,
                "Hospital name আবশ্যক।"
            );

            valid =
                false;
        }


        if (!nameBn) {

            setFieldError(
                hospitalNameBn,
                "বাংলা নাম আবশ্যক।"
            );

            valid =
                false;
        }


        if (!type) {

            setFieldError(
                hospitalType,
                "Hospital type নির্বাচন করুন।"
            );

            valid =
                false;
        }


        if (!divisionId) {

            setFieldError(
                hospitalDivision,
                "Division নির্বাচন করুন।"
            );

            valid =
                false;
        }


        if (!phone) {

            setFieldError(
                hospitalPhone,
                "Phone number আবশ্যক।"
            );

            valid =
                false;
        }


        if (
            hospitalEmail &&
            hospitalEmail.value &&
            !hospitalEmail.validity.valid
        ) {

            setFieldError(
                hospitalEmail,
                "সঠিক email দিন।"
            );

            valid =
                false;
        }


        return valid;
    }


    /* =====================================================
       DUPLICATE VALIDATION
       ===================================================== */

    async function checkHospitalDuplicate(
        name,
        nameBn
    ) {

        let query =
            supabaseClient
                .from(TABLE)
                .select(
                    "id,name,name_bn"
                );


        /*
         * Case-insensitive exact
         * name check.
         */

        const {
            data,
            error
        } =
            await query
                .or(
                    `name.ilike.${escapeForIlike(
                        name
                    )},name_bn.ilike.${escapeForIlike(
                        nameBn
                    )}`
                );


        if (error) {
            throw error;
        }


        return (
            data || []
        ).find(
            function (item) {

                return (
                    item.id !==
                        S.editingHospitalId &&
                    (
                        String(
                            item.name ||
                            ""
                        ).toLowerCase() ===
                            name.toLowerCase() ||
                        String(
                            item.name_bn ||
                            ""
                        ).toLowerCase() ===
                            nameBn.toLowerCase()
                    )
                );
            }
        ) || null;
    }


    function escapeForIlike(
        value
    ) {

        return String(
            value || ""
        )
            .replace(
                /\\/g,
                "\\\\"
            )
            .replace(
                /%/g,
                "\\%"
            )
            .replace(
                /_/g,
                "\\_"
            )
            .replace(
                /,/g,
                "\\,"
            );
    }


    /* =====================================================
       FORM DATA
       ===================================================== */

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
                parseCoordinate(
                    hospitalLatitude
                        ? hospitalLatitude.value
                        : ""
                ),

            longitude:
                parseCoordinate(
                    hospitalLongitude
                        ? hospitalLongitude.value
                        : ""
                ),

            is_verified:
                hospitalIsVerified
                    ? hospitalIsVerified.checked
                    : false,

            is_active:
                hospitalIsActive
                    ? hospitalIsActive.checked
                    : true
        };
    }


    function parseCoordinate(
        value
    ) {

        const text =
            cleanText(
                value
            );


        if (!text) {
            return null;
        }


        const number =
            Number(text);


        return Number.isFinite(
            number
        )
            ? number
            : null;
    }


    /* =====================================================
       SAVE — F-8.2
       ===================================================== */

    async function saveHospital() {

        if (S.isSaving) {
            return;
        }


        if (
            !validateHospitalForm()
        ) {
            return;
        }


        const payload =
            getHospitalPayload();


        S.isSaving =
            true;


        setSaveButtonLoading(
            true
        );


        try {

            /*
             * Duplicate check
             */

            const duplicate =
                await checkHospitalDuplicate(
                    payload.name,
                    payload.name_bn
                );


            if (duplicate) {

                if (
                    String(
                        duplicate.name ||
                        ""
                    ).toLowerCase() ===
                    payload.name.toLowerCase()
                ) {

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


            /*
             * F-8.2:
             * শুধুমাত্র INSERT।
             */

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(TABLE)
                    .insert(
                        payload
                    )
                    .select()
                    .single();


            if (error) {
                throw error;
            }


            if (!data) {

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
             * Dashboard যদি একই tab/session-এ
             * refresh API ব্যবহার করে, তাহলে
             * পরবর্তী integration phase-এ
             * সেটি আরও উন্নত করা হবে।
             */

        } catch (error) {

            console.error(
                "Hospital Add Error:",
                error
            );


            showToast(
                getErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            S.isSaving =
                false;


            setSaveButtonLoading(
                false
            );
        }
    }


    function setSaveButtonLoading(
        loading
    ) {

        if (
            !saveHospitalButton
        ) {
            return;
        }


        saveHospitalButton.disabled =
            loading;


        const text =
            saveHospitalButton.querySelector(
                "[data-save-text]"
            );


        if (text) {

            text.textContent =
                loading
                    ? "Saving..."
                    : "Save Hospital";

        } else {

            saveHospitalButton.textContent =
                loading
                    ? "Saving..."
                    : "Save Hospital";
        }
    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        /*
         * Add buttons
         */

        document
            .querySelectorAll(
                "#addHospitalButton, #sectionAddHospitalButton"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        openAddForm
                    );
                }
            );


        /*
         * Close buttons
         */

        document
            .querySelectorAll(
                "#closeHospitalForm, #cancelHospitalButton"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        closeForm
                    );
                }
            );


        /*
         * Form submit
         */

        if (
            hospitalForm
        ) {

            hospitalForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveHospital();
                }
            );
        }


        /*
         * Location dependency
         */

        if (
            hospitalDivision
        ) {

            hospitalDivision.addEventListener(
                "change",
                handleFormDivisionChange
            );
        }


        if (
            hospitalDistrict
        ) {

            hospitalDistrict.addEventListener(
                "change",
                handleFormDistrictChange
            );
        }


        if (
            hospitalDivisionFilter
        ) {

            hospitalDivisionFilter.addEventListener(
                "change",
                handleFilterDivisionChange
            );
        }


        if (
            hospitalDistrictFilter
        ) {

            hospitalDistrictFilter.addEventListener(
                "change",
                handleFilterDistrictChange
            );
        }


        if (
            hospitalSearch
        ) {

            hospitalSearch.addEventListener(
                "input",
                applyFilters
            );
        }


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


        /*
         * Edit buttons
         *
         * F-8.3-তে actual Edit/Update হবে।
         */

        const tableBody =
            getElement(
                "hospitalTableBody"
            );


        if (
            tableBody
        ) {

            tableBody.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-action='edit']"
                        );


                    if (!button) {
                        return;
                    }


                    showToast(
                        "Edit/Update পরবর্তী ধাপে যুক্ত হবে।",
                        "info"
                    );
                }
            );
        }
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        try {

            initializeSupabase();


            await Promise.all([
                loadDivisions(),
                loadDistricts(),
                loadUpazilas()
            ]);


            await loadHospitals();


            bindEvents();


        } catch (error) {

            console.error(
                "Hospital initialization failed:",
                error
            );


            const message =
                getElement(
                    "hospitalErrorMessage"
                );


            if (message) {

                message.textContent =
                    getErrorMessage(
                        error
                    );
            }


            showTableState(
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
