/* =========================================================
   Dorkari — Doctor Management
   F-9.1 — Doctor Foundation
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const TABLE = "doctors";
    const PAGE_SIZE = 10;


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        supabase: null,

        doctors: [],

        filteredDoctors: [],

        divisions: [],

        districts: [],

        upazilas: [],

        currentPage: 1,

        editingDoctorId: null,

        isSaving: false

    };


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function get(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       TEXT
    ===================================================== */

    function cleanText(value) {

        return String(value || "").trim();

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       NUMBER
    ===================================================== */

    function formatNumber(value) {

        return Number(value || 0)
            .toLocaleString("bn-BD");

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        const toast = get("doctorToast");

        const messageElement =
            get("doctorToastMessage");

        if (!toast || !messageElement) {
            return;
        }

        messageElement.textContent =
            message;

        toast.hidden = false;

        requestAnimationFrame(function () {

            toast.classList.add("show");

        });

        clearTimeout(showToast.timer);

        showToast.timer =
            setTimeout(function () {

                toast.classList.remove("show");

                setTimeout(function () {

                    toast.hidden = true;

                }, 200);

            }, 2500);

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function initializeSupabase() {

        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.getSupabase ===
            "function"
        ) {

            state.supabase =
                window.DorkariAdmin.getSupabase();

            return;

        }

        throw new Error(
            "Supabase client পাওয়া যায়নি।"
        );

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoadingState() {

        const list =
            get("doctorList");

        if (!list) {
            return;
        }

        list.innerHTML = `
            <div class="doctor-loading">
                ডাক্তারদের তথ্য লোড হচ্ছে...
            </div>
        `;

    }


    /* =====================================================
       ERROR
    ===================================================== */

    function showErrorState(message) {

        const list =
            get("doctorList");

        if (!list) {
            return;
        }

        list.innerHTML = `
            <div class="doctor-error">
                ${escapeHTML(
            message ||
            "Doctor data লোড করা যায়নি।"
        )}
            </div>
        `;

        renderPagination();

    }


    /* =====================================================
       EMPTY
    ===================================================== */

    function showEmptyState() {

        const list =
            get("doctorList");

        if (!list) {
            return;
        }

        list.innerHTML = `
            <div class="doctor-empty">
                কোনো Doctor পাওয়া যায়নি।
            </div>
        `;

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateSummary() {

        const total =
            state.doctors.length;

        const active =
            state.doctors.filter(
                function (doctor) {

                    return doctor.is_active === true;

                }
            ).length;

        const verified =
            state.doctors.filter(
                function (doctor) {

                    return doctor.is_verified === true;

                }
            ).length;


        const totalElement =
            get("doctorTotalCount");

        const activeElement =
            get("doctorActiveCount");

        const verifiedElement =
            get("doctorVerifiedCount");


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


    /* =====================================================
       RESULT COUNT
    ===================================================== */

    function updateResultCount() {

        const element =
            get("doctorResultCount");

        if (!element) {
            return;
        }

        element.textContent =
            `${formatNumber(
                state.filteredDoctors.length
            )} Doctors`;

    }


    /* =====================================================
       LOCATION LOAD
    ===================================================== */

    async function loadLocations() {

        if (!state.supabase) {
            initializeSupabase();
        }


        const [
            divisionResult,
            districtResult,
            upazilaResult
        ] = await Promise.all([

            state.supabase
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
                ),

            state.supabase
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
                ),

            state.supabase
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
                )

        ]);


        if (divisionResult.error) {
            throw divisionResult.error;
        }

        if (districtResult.error) {
            throw districtResult.error;
        }

        if (upazilaResult.error) {
            throw upazilaResult.error;
        }


        state.divisions =
            divisionResult.data || [];

        state.districts =
            districtResult.data || [];

        state.upazilas =
            upazilaResult.data || [];


        renderDivisionOptions();

        renderSpecializationOptions();

        renderDepartmentOptions();

    }


    /* =====================================================
       DIVISION OPTIONS
    ===================================================== */

    function renderDivisionOptions() {

        const formDivision =
            get("doctorDivision");

        const filterDivision =
            get("doctorDivisionFilter");


        if (formDivision) {

            formDivision.innerHTML = `
                <option value="">
                    বিভাগ নির্বাচন করুন
                </option>
            `;

            state.divisions.forEach(
                function (division) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        division.id;

                    option.textContent =
                        division.name_bn ||
                        division.name ||
                        "";

                    formDivision.appendChild(
                        option
                    );

                }
            );

        }


        if (filterDivision) {

            filterDivision.innerHTML = `
                <option value="">
                    সব বিভাগ
                </option>
            `;

            state.divisions.forEach(
                function (division) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        division.id;

                    option.textContent =
                        division.name_bn ||
                        division.name ||
                        "";

                    filterDivision.appendChild(
                        option
                    );

                }
            );

        }

    }


    /* =====================================================
       DISTRICT OPTIONS
    ===================================================== */

    function renderDistrictOptions(
        divisionId,
        targetId,
        placeholder
    ) {

        const select =
            get(targetId);

        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                ${escapeHTML(placeholder)}
            </option>
        `;


        if (!divisionId) {

            select.disabled = true;

            return;

        }


        const districts =
            state.districts.filter(
                function (district) {

                    return (
                        district.division_id ===
                        divisionId
                    );

                }
            );


        districts.forEach(
            function (district) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    district.id;

                option.textContent =
                    district.name_bn ||
                    district.name ||
                    "";

                select.appendChild(
                    option
                );

            }
        );


        select.disabled =
            false;

    }


    /* =====================================================
       UPAZILA OPTIONS
    ===================================================== */

    function renderUpazilaOptions(
        districtId,
        targetId,
        placeholder
    ) {

        const select =
            get(targetId);

        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                ${escapeHTML(placeholder)}
            </option>
        `;


        if (!districtId) {

            select.disabled = true;

            return;

        }


        const upazilas =
            state.upazilas.filter(
                function (upazila) {

                    return (
                        upazila.district_id ===
                        districtId
                    );

                }
            );


        upazilas.forEach(
            function (upazila) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    upazila.id;

                option.textContent =
                    upazila.name_bn ||
                    upazila.name ||
                    "";

                select.appendChild(
                    option
                );

            }
        );


        select.disabled =
            false;

    }


    /* =====================================================
       SPECIALIZATION OPTIONS
    ===================================================== */

    function renderSpecializationOptions() {

        const select =
            get("doctorSpecializationFilter");

        if (!select) {
            return;
        }


        const values = [
            ...new Set(
                state.doctors
                    .map(
                        function (doctor) {
                            return cleanText(
                                doctor.specialization
                            );
                        }
                    )
                    .filter(Boolean)
            )
        ].sort(
            function (a, b) {
                return a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity: "base"
                    }
                );
            }
        );


        select.innerHTML = `
            <option value="">
                সব Specialization
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = value;

                option.textContent =
                    value;

                select.appendChild(
                    option
                );

            }
        );

    }


    /* =====================================================
       DEPARTMENT OPTIONS
    ===================================================== */

    function renderDepartmentOptions() {

        const select =
            get("doctorDepartmentFilter");

        if (!select) {
            return;
        }


        const values = [
            ...new Set(
                state.doctors
                    .map(
                        function (doctor) {
                            return cleanText(
                                doctor.department
                            );
                        }
                    )
                    .filter(Boolean)
            )
        ].sort(
            function (a, b) {
                return a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity: "base"
                    }
                );
            }
        );


        select.innerHTML = `
            <option value="">
                সব Department
            </option>
        `;


        values.forEach(
            function (value) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = value;

                option.textContent =
                    value;

                select.appendChild(
                    option
                );

            }
        );

    }


    /* =====================================================
       LOCATION NAME HELPERS
    ===================================================== */

    function getDivisionName(id) {

        const item =
            state.divisions.find(
                function (division) {
                    return division.id === id;
                }
            );

        return item
            ? (
                item.name_bn ||
                item.name ||
                ""
            )
            : "";

    }


    function getDistrictName(id) {

        const item =
            state.districts.find(
                function (district) {
                    return district.id === id;
                }
            );

        return item
            ? (
                item.name_bn ||
                item.name ||
                ""
            )
            : "";

    }


    function getUpazilaName(id) {

        const item =
            state.upazilas.find(
                function (upazila) {
                    return upazila.id === id;
                }
            );

        return item
            ? (
                item.name_bn ||
                item.name ||
                ""
            )
            : "";

    }


    /* =====================================================
       DATA LOAD
    ===================================================== */

    async function loadDoctors() {

        showLoadingState();


        if (!state.supabase) {
            initializeSupabase();
        }


        const {
            data,
            error
        } =
            await state.supabase
                .from(TABLE)
                .select(`
                    id,
                    name,
                    name_bn,
                    degree,
                    specialization,
                    department,
                    phone,
                    email,
                    chamber_info,
                    visiting_hours,
                    division_id,
                    district_id,
                    upazila_id,
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


        state.doctors =
            data || [];


        state.filteredDoctors = [
            ...state.doctors
        ];


        state.currentPage =
            1;


        updateSummary();

        renderSpecializationOptions();

        renderDepartmentOptions();

        updateResultCount();

        renderList();

    }


    /* =====================================================
       FILTER LOGIC
    ===================================================== */

    function applyFilters() {

        const search =
            cleanText(
                get("doctorSearch")
                    ? get("doctorSearch").value
                    : ""
            ).toLocaleLowerCase(
                "bn-BD"
            );


        const divisionId =
            get("doctorDivisionFilter")
                ? get("doctorDivisionFilter").value
                : "";


        const districtId =
            get("doctorDistrictFilter")
                ? get("doctorDistrictFilter").value
                : "";


        const upazilaId =
            get("doctorUpazilaFilter")
                ? get("doctorUpazilaFilter").value
                : "";


        const specialization =
            cleanText(
                get("doctorSpecializationFilter")
                    ? get("doctorSpecializationFilter").value
                    : ""
            );


        const department =
            cleanText(
                get("doctorDepartmentFilter")
                    ? get("doctorDepartmentFilter").value
                    : ""
            );


        const status =
            get("doctorStatusFilter")
                ? get("doctorStatusFilter").value
                : "";


        const verification =
            get("doctorVerificationFilter")
                ? get("doctorVerificationFilter").value
                : "";


        state.filteredDoctors =
            state.doctors.filter(
                function (doctor) {

                    const searchableText = [

                        doctor.name,

                        doctor.name_bn,

                        doctor.degree,

                        doctor.specialization,

                        doctor.department,

                        doctor.phone,

                        doctor.email,

                        doctor.chamber_info,

                        doctor.visiting_hours,

                        getDivisionName(
                            doctor.division_id
                        ),

                        getDistrictName(
                            doctor.district_id
                        ),

                        getUpazilaName(
                            doctor.upazila_id
                        )

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLocaleLowerCase(
                            "bn-BD"
                        );


                    if (
                        search &&
                        !searchableText.includes(
                            search
                        )
                    ) {

                        return false;

                    }


                    if (
                        divisionId &&
                        doctor.division_id !==
                        divisionId
                    ) {

                        return false;

                    }


                    if (
                        districtId &&
                        doctor.district_id !==
                        districtId
                    ) {

                        return false;

                    }


                    if (
                        upazilaId &&
                        doctor.upazila_id !==
                        upazilaId
                    ) {

                        return false;

                    }


                    if (
                        specialization &&
                        doctor.specialization !==
                        specialization
                    ) {

                        return false;

                    }


                    if (
                        department &&
                        doctor.department !==
                        department
                    ) {

                        return false;

                    }


                    if (
                        status === "active" &&
                        doctor.is_active !== true
                    ) {

                        return false;

                    }


                    if (
                        status === "inactive" &&
                        doctor.is_active !== false
                    ) {

                        return false;

                    }


                    if (
                        verification === "verified" &&
                        doctor.is_verified !== true
                    ) {

                        return false;

                    }


                    if (
                        verification === "unverified" &&
                        doctor.is_verified !== false
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        state.currentPage =
            1;


        updateResultCount();

        renderList();

    }


    /* =====================================================
       RESET FILTERS
    ===================================================== */

    function clearFilters() {

        const search =
            get("doctorSearch");

        const division =
            get("doctorDivisionFilter");

        const district =
            get("doctorDistrictFilter");

        const upazila =
            get("doctorUpazilaFilter");

        const specialization =
            get("doctorSpecializationFilter");

        const department =
            get("doctorDepartmentFilter");

        const status =
            get("doctorStatusFilter");

        const verification =
            get("doctorVerificationFilter");


        if (search) {
            search.value = "";
        }

        if (division) {
            division.value = "";
        }

        if (district) {
            district.value = "";
        }

        if (district) {
            district.innerHTML = `
                <option value="">
                    সব জেলা
                </option>
            `;
            district.disabled = true;
        }

        if (upazila) {
            upazila.value = "";
            upazila.innerHTML = `
                <option value="">
                    সব উপজেলা
                </option>
            `;
            upazila.disabled = true;
        }

        if (specialization) {
            specialization.value = "";
        }

        if (department) {
            department.value = "";
        }

        if (status) {
            status.value = "";
        }

        if (verification) {
            verification.value = "";
        }


        state.currentPage =
            1;


        applyFilters();

    }


    /* =====================================================
       DOCTOR CARD
    ===================================================== */

    function renderDoctorCard(doctor) {

        const status =
            doctor.is_active
                ? "Active"
                : "Inactive";


        const verification =
            doctor.is_verified
                ? "Verified"
                : "Unverified";


        const divisionName =
            getDivisionName(
                doctor.division_id
            );


        const districtName =
            getDistrictName(
                doctor.district_id
            );


        const upazilaName =
            getUpazilaName(
                doctor.upazila_id
            );


        return `

            <article
                class="doctor-card"
                data-id="${escapeHTML(
            doctor.id
        )}"
            >

                <div class="doctor-card-main">

                    <h3 class="doctor-card-title">
                        ${escapeHTML(
            doctor.name_bn ||
            doctor.name ||
            "Unnamed Doctor"
        )}
                    </h3>


                    ${doctor.name &&
                doctor.name_bn &&
                doctor.name !== doctor.name_bn
                ? `
                                <div class="doctor-card-subtitle">
                                    ${escapeHTML(
                    doctor.name
                )}
                                </div>
                              `
                : ""
            }


                    <div class="doctor-card-meta">

                        ${doctor.degree
                ? `
                                    <span class="doctor-badge">
                                        ${escapeHTML(
                    doctor.degree
                )}
                                    </span>
                                  `
                : ""
            }


                        ${doctor.specialization
                ? `
                                    <span class="doctor-badge">
                                        ${escapeHTML(
                    doctor.specialization
                )}
                                    </span>
                                  `
                : ""
            }


                        ${doctor.department
                ? `
                                    <span class="doctor-badge">
                                        ${escapeHTML(
                    doctor.department
                )}
                                    </span>
                                  `
                : ""
            }


                        <span class="doctor-badge">
                            ${status}
                        </span>


                        <span class="doctor-badge">
                            ${verification}
                        </span>

                    </div>


                    ${divisionName ||
                districtName ||
                upazilaName
                ? `
                                <div class="doctor-card-subtitle">
                                    📍
                                    ${escapeHTML(
                    [
                        divisionName,
                        districtName,
                        upazilaName
                    ]
                        .filter(Boolean)
                        .join(" → ")
                )}
                                </div>
                              `
                : ""
            }


                    ${doctor.phone
                ? `
                                <div class="doctor-card-subtitle">
                                    ☎ ${escapeHTML(
                    doctor.phone
                )}
                                </div>
                              `
                : ""
            }

                </div>

                <div class="doctor-card-actions">

    <button
        type="button"
        class="doctor-card-btn"
        data-action="edit"
        data-id="${escapeHTML(
                doctor.id
            )}"
    >
        Edit
    </button>


    ${doctor.is_active
                ? `
                <button
                    type="button"
                    class="doctor-card-btn"
                    data-action="deactivate"
                    data-id="${escapeHTML(
                    doctor.id
                )}"
                >
                    Deactivate
                </button>
              `
                : `
                <button
                    type="button"
                    class="doctor-card-btn"
                    data-action="activate"
                    data-id="${escapeHTML(
                    doctor.id
                )}"
                >
                    Activate
                </button>
              `
            }


    ${doctor.is_verified
                ? `
                <button
                    type="button"
                    class="doctor-card-btn"
                    data-action="unverify"
                    data-id="${escapeHTML(
                    doctor.id
                )}"
                >
                    Unverify
                </button>
              `
                : `
                <button
                    type="button"
                    class="doctor-card-btn"
                    data-action="verify"
                    data-id="${escapeHTML(
                    doctor.id
                )}"
                >
                    Verify
                </button>
              `
            }

</div>

            </article>

        `;

    }


    /* =====================================================
       RENDER LIST
    ===================================================== */

    function renderList() {

        const list =
            get("doctorList");

        if (!list) {
            return;
        }


        if (
            state.filteredDoctors.length === 0
        ) {

            showEmptyState();

            renderPagination();

            updateResultCount();

            return;

        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filteredDoctors.length /
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


        const start =
            (
                state.currentPage -
                1
            ) *
            PAGE_SIZE;


        const pageItems =
            state.filteredDoctors.slice(
                start,
                start + PAGE_SIZE
            );


        list.innerHTML =
            pageItems
                .map(
                    renderDoctorCard
                )
                .join("");


        updateResultCount();

        renderPagination();

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        const pagination =
            get("doctorPagination");

        const info =
            get("doctorPaginationInfo");

        const buttons =
            get("doctorPaginationButtons");


        if (
            !pagination ||
            !info ||
            !buttons
        ) {
            return;
        }


        const total =
            state.filteredDoctors.length;


        if (total === 0) {

            pagination.hidden =
                true;

            info.textContent = "";

            buttons.innerHTML = "";

            return;

        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
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


        const start =
            (
                state.currentPage -
                1
            ) *
            PAGE_SIZE +
            1;


        const end =
            Math.min(
                state.currentPage *
                PAGE_SIZE,
                total
            );


        info.textContent =
            `Showing ${formatNumber(
                start
            )}–${formatNumber(
                end
            )} of ${formatNumber(
                total
            )} doctors`;


        buttons.innerHTML = "";


        if (totalPages <= 1) {

            pagination.hidden = true;

            return;

        }


        pagination.hidden = false;


        const previous =
            document.createElement(
                "button"
            );

        previous.type =
            "button";

        previous.className =
            "doctor-pagination-btn";

        previous.dataset.page =
            "prev";

        previous.textContent =
            "Previous";

        previous.disabled =
            state.currentPage === 1;

        buttons.appendChild(
            previous
        );


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
                "doctor-pagination-btn" +
                (
                    page ===
                        state.currentPage
                        ? " is-active"
                        : ""
                );

            button.dataset.page =
                String(page);

            button.textContent =
                formatNumber(page);

            buttons.appendChild(
                button
            );

        }


        const next =
            document.createElement(
                "button"
            );

        next.type =
            "button";

        next.className =
            "doctor-pagination-btn";

        next.dataset.page =
            "next";

        next.textContent =
            "Next";

        next.disabled =
            state.currentPage ===
            totalPages;

        buttons.appendChild(
            next
        );

    }


    /* =====================================================
       MODAL
    ===================================================== */

    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    function openEditModal(doctorId) {

        const doctor =
            state.doctors.find(
                function (item) {
                    return item.id === doctorId;
                }
            );

        if (!doctor) {

            showToast(
                "Doctor তথ্য পাওয়া যায়নি।"
            );

            return;

        }


        const modal =
            get("doctorModal");

        if (!modal) {
            return;
        }


        resetForm();


        state.editingDoctorId =
            doctor.id;


        const id =
            get("doctorId");

        const name =
            get("doctorName");

        const nameBn =
            get("doctorNameBn");

        const degree =
            get("doctorDegree");

        const specialization =
            get("doctorSpecialization");

        const department =
            get("doctorDepartment");


        if (id) {
            id.value = doctor.id || "";
        }

        if (name) {
            name.value = doctor.name || "";
        }

        if (nameBn) {
            nameBn.value = doctor.name_bn || "";
        }

        if (degree) {
            degree.value = doctor.degree || "";
        }

        if (specialization) {
            specialization.value =
                doctor.specialization || "";
        }

        if (department) {
            department.value =
                doctor.department || "";
        }


        const division =
            get("doctorDivision");

        const district =
            get("doctorDistrict");

        const upazila =
            get("doctorUpazila");


        if (division) {
            division.value =
                doctor.division_id || "";
        }


        renderDistrictOptions(
            doctor.division_id || "",
            "doctorDistrict",
            "জেলা নির্বাচন করুন"
        );


        if (district) {
            district.value =
                doctor.district_id || "";
        }


        renderUpazilaOptions(
            doctor.district_id || "",
            "doctorUpazila",
            "উপজেলা নির্বাচন করুন"
        );


        if (upazila) {
            upazila.value =
                doctor.upazila_id || "";
        }


        const phone =
            get("doctorPhone");

        const email =
            get("doctorEmail");

        const chamberInfo =
            get("doctorChamberInfo");

        const visitingHours =
            get("doctorVisitingHours");


        if (phone) {
            phone.value = doctor.phone || "";
        }

        if (email) {
            email.value = doctor.email || "";
        }

        if (chamberInfo) {
            chamberInfo.value =
                doctor.chamber_info || "";
        }

        if (visitingHours) {
            visitingHours.value =
                doctor.visiting_hours || "";
        }


        const verified =
            get("doctorVerified");

        const active =
            get("doctorActive");


        if (verified) {
            verified.checked =
                doctor.is_verified === true;
        }

        if (active) {
            active.checked =
                doctor.is_active === true;
        }


        const title =
            get("doctorModalTitle");

        if (title) {
            title.textContent =
                "Edit Doctor";
        }


        const saveButton =
            get("doctorSaveBtn");

        if (saveButton) {
            saveButton.textContent =
                "Update Doctor";
        }


        modal.classList.add(
            "is-open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        if (name) {

            setTimeout(
                function () {
                    name.focus();
                },
                0
            );

        }

    }


    function resetForm() {

        const form =
            get("doctorForm");

        if (form) {
            form.reset();
        }


        const id =
            get("doctorId");

        const active =
            get("doctorActive");

        const verified =
            get("doctorVerified");

        const division =
            get("doctorDivision");

        const district =
            get("doctorDistrict");

        const upazila =
            get("doctorUpazila");

        const title =
            get("doctorModalTitle");

        const saveButton =
            get("doctorSaveBtn");


        if (id) {
            id.value = "";
        }

        if (active) {
            active.checked = true;
        }

        if (verified) {
            verified.checked = false;
        }

        if (division) {
            division.value = "";
        }

        if (district) {

            district.innerHTML = `
                <option value="">
                    জেলা নির্বাচন করুন
                </option>
            `;

            district.disabled = true;

        }

        if (upazila) {

            upazila.innerHTML = `
                <option value="">
                    উপজেলা নির্বাচন করুন
                </option>
            `;

            upazila.disabled = true;

        }

        if (title) {
            title.textContent =
                "Add Doctor";
        }

        if (saveButton) {
            saveButton.textContent =
                "Save Doctor";
        }

        state.editingDoctorId =
            null;

    }


    function openModal() {

        const modal =
            get("doctorModal");

        if (!modal) {
            return;
        }


        resetForm();


        modal.classList.add(
            "is-open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        const name =
            get("doctorName");

        if (name) {

            setTimeout(
                function () {

                    name.focus();

                },
                0
            );

        }

    }


    function closeModal() {

        const modal =
            get("doctorModal");

        if (!modal) {
            return;
        }


        modal.classList.remove(
            "is-open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

        resetForm();

    }


    /* =====================================================
       TOGGLE DOCTOR STATUS
    ===================================================== */

    async function toggleDoctorStatus(
        doctorId,
        isActive
    ) {

        if (!state.supabase) {

            try {

                initializeSupabase();

            } catch (error) {

                console.error(
                    "Doctor Supabase error:",
                    error
                );

                showToast(
                    "Supabase client পাওয়া যায়নি।"
                );

                return;

            }

        }


        try {

            const {
                error
            } =
                await state.supabase
                    .from(TABLE)
                    .update({
                        is_active:
                            isActive,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        doctorId
                    );


            if (error) {
                throw error;
            }


            await loadDoctors();


            showToast(
                isActive
                    ? "Doctor সফলভাবে Activate হয়েছে।"
                    : "Doctor সফলভাবে Deactivate হয়েছে।"
            );


        } catch (error) {

            console.error(
                "Doctor status update error:",
                error
            );


            if (
                error &&
                error.code === "42501"
            ) {

                showToast(
                    isActive
                        ? "Doctor Activate করার অনুমতি নেই।"
                        : "Doctor Deactivate করার অনুমতি নেই।"
                );

            } else {

                showToast(
                    isActive
                        ? "Doctor Activate করা যায়নি।"
                        : "Doctor Deactivate করা যায়নি।"
                );

            }

        }

    }


    /* =====================================================
       VALIDATE DOCTOR FORM
    ===================================================== */

    function validateDoctorForm() {

        const name =
            cleanText(
                get("doctorName")
                    ? get("doctorName").value
                    : ""
            );

        const nameBn =
            cleanText(
                get("doctorNameBn")
                    ? get("doctorNameBn").value
                    : ""
            );

        const divisionId =
            get("doctorDivision")
                ? get("doctorDivision").value
                : "";

        const districtId =
            get("doctorDistrict")
                ? get("doctorDistrict").value
                : "";

        const upazilaId =
            get("doctorUpazila")
                ? get("doctorUpazila").value
                : "";


        if (!name) {

            showToast(
                "Doctor-এর Name দিতে হবে।"
            );

            const field =
                get("doctorName");

            if (field) {
                field.focus();
            }

            return false;

        }


        if (!nameBn) {

            showToast(
                "Doctor-এর বাংলা নাম দিতে হবে।"
            );

            const field =
                get("doctorNameBn");

            if (field) {
                field.focus();
            }

            return false;

        }


        if (districtId && !divisionId) {

            showToast(
                "জেলা নির্বাচন করার আগে বিভাগ নির্বাচন করুন।"
            );

            return false;

        }


        if (upazilaId && !districtId) {

            showToast(
                "উপজেলা নির্বাচন করার আগে জেলা নির্বাচন করুন।"
            );

            return false;

        }


        return true;

    }


    /* =====================================================
       SAVE DOCTOR
    ===================================================== */

    async function saveDoctor() {

        if (state.isSaving) {
            return;
        }


        if (!validateDoctorForm()) {
            return;
        }


        if (!state.supabase) {

            try {

                initializeSupabase();

            } catch (error) {

                console.error(
                    "Doctor Supabase error:",
                    error
                );

                showToast(
                    "Supabase client পাওয়া যায়নি।"
                );

                return;

            }

        }


        const saveButton =
            get("doctorSaveBtn");

        // Keep the mode available in success, catch, and finally.
        const editingDoctorId =
            state.editingDoctorId;


        state.isSaving = true;


        if (saveButton) {

            saveButton.disabled = true;

            saveButton.textContent =
                "Saving...";

        }


        try {

            const name =
                cleanText(
                    get("doctorName").value
                );

            const nameBn =
                cleanText(
                    get("doctorNameBn").value
                );

            const degree =
                cleanText(
                    get("doctorDegree").value
                );

            const specialization =
                cleanText(
                    get("doctorSpecialization").value
                );

            const department =
                cleanText(
                    get("doctorDepartment").value
                );

            const phone =
                cleanText(
                    get("doctorPhone").value
                );

            const email =
                cleanText(
                    get("doctorEmail").value
                );

            const chamberInfo =
                cleanText(
                    get("doctorChamberInfo").value
                );

            const visitingHours =
                cleanText(
                    get("doctorVisitingHours").value
                );

            const divisionId =
                get("doctorDivision")
                    ? get("doctorDivision").value
                    : "";

            const districtId =
                get("doctorDistrict")
                    ? get("doctorDistrict").value
                    : "";

            const upazilaId =
                get("doctorUpazila")
                    ? get("doctorUpazila").value
                    : "";

            const isVerified =
                get("doctorVerified")
                    ? get("doctorVerified").checked
                    : false;

            const isActive =
                get("doctorActive")
                    ? get("doctorActive").checked
                    : true;


            const payload = {

                name: name,

                name_bn: nameBn,

                degree:
                    degree || null,

                specialization:
                    specialization || null,

                department:
                    department || null,

                phone:
                    phone || null,

                email:
                    email || null,

                chamber_info:
                    chamberInfo || null,

                visiting_hours:
                    visitingHours || null,

                division_id:
                    divisionId || null,

                district_id:
                    districtId || null,

                upazila_id:
                    upazilaId || null,

                is_verified:
                    isVerified,

                is_active:
                    isActive

            };


            let query;


            if (editingDoctorId) {

                const updatePayload = {

                    ...payload,

                    updated_at:
                        new Date().toISOString()

                };


                query =
                    state.supabase
                        .from(TABLE)
                        .update(
                            updatePayload
                        )
                        .eq(
                            "id",
                            editingDoctorId
                        )
                        .select()
                        .single();

            } else {

                query =
                    state.supabase
                        .from(TABLE)
                        .insert(
                            payload
                        )
                        .select()
                        .single();

            }


            const {
                data,
                error
            } =
                await query;


            if (error) {
                throw error;
            }


            console.log(
                editingDoctorId
                    ? "Doctor updated successfully:"
                    : "Doctor added successfully:",
                data
            );


            closeModal();

            await loadDoctors();

            showToast(
                editingDoctorId
                    ? "Doctor সফলভাবে update হয়েছে।"
                    : "Doctor সফলভাবে যোগ হয়েছে।"
            );


        } catch (error) {

            console.error(
                "Doctor Add Error:",
                error
            );


            if (
                error &&
                error.code === "42501"
            ) {

                showToast(
                    editingDoctorId
                        ? "Doctor update করার অনুমতি নেই।"
                        : "Doctor যোগ করার অনুমতি নেই।"
                );

            } else {

                showToast(
                    (
                        error &&
                        error.message
                    )
                        ? error.message
                        : (
                            editingDoctorId
                                ? "Doctor update করা যায়নি।"
                                : "Doctor সংরক্ষণ করা যায়নি।"
                        )
                );

            }


        } finally {

            state.isSaving =
                false;


            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Doctor";

            }

        }

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        /* -------------------------------------------------
           REFRESH
        ------------------------------------------------- */

        const refreshButton =
            get("doctorRefresh");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                async function () {

                    try {

                        await loadLocations();

                        await loadDoctors();

                        showToast(
                            "Doctor data refresh হয়েছে।"
                        );

                    } catch (error) {

                        console.error(
                            "Doctor refresh error:",
                            error
                        );

                        showToast(
                            "Doctor data refresh করা যায়নি।"
                        );

                    }

                }
            );

        }


        /* -------------------------------------------------
           ADD DOCTOR
        ------------------------------------------------- */

        const addButton =
            get("doctorAddBtn");


        if (addButton) {

            addButton.addEventListener(
                "click",
                openModal
            );

        }


        /* -------------------------------------------------
           CLOSE
        ------------------------------------------------- */

        const closeButton =
            get("doctorModalClose");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeModal
            );

        }


        const cancelButton =
            get("doctorCancelBtn");


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }


        const modalOverlay =
            document.querySelector(
                ".doctor-modal-overlay"
            );


        if (modalOverlay) {

            modalOverlay.addEventListener(
                "click",
                closeModal
            );

        }


        /* -------------------------------------------------
           FORM DIVISION → DISTRICT
        ------------------------------------------------- */

        const formDivision =
            get("doctorDivision");


        if (formDivision) {

            formDivision.addEventListener(
                "change",
                function () {

                    const divisionId =
                        formDivision.value;

                    renderDistrictOptions(
                        divisionId,
                        "doctorDistrict",
                        "জেলা নির্বাচন করুন"
                    );


                    const upazila =
                        get("doctorUpazila");

                    if (upazila) {

                        upazila.innerHTML = `
                            <option value="">
                                উপজেলা নির্বাচন করুন
                            </option>
                        `;

                        upazila.disabled =
                            true;

                    }

                }
            );

        }


        /* -------------------------------------------------
           FORM DISTRICT → UPAZILA
        ------------------------------------------------- */

        const formDistrict =
            get("doctorDistrict");


        if (formDistrict) {

            formDistrict.addEventListener(
                "change",
                function () {

                    const districtId =
                        formDistrict.value;

                    renderUpazilaOptions(
                        districtId,
                        "doctorUpazila",
                        "উপজেলা নির্বাচন করুন"
                    );

                }
            );

        }


        /* -------------------------------------------------
           FILTER DIVISION → DISTRICT
        ------------------------------------------------- */

        const filterDivision =
            get("doctorDivisionFilter");


        if (filterDivision) {

            filterDivision.addEventListener(
                "change",
                function () {

                    const divisionId =
                        filterDivision.value;


                    renderDistrictOptions(
                        divisionId,
                        "doctorDistrictFilter",
                        "সব জেলা"
                    );


                    const upazila =
                        get("doctorUpazilaFilter");


                    if (upazila) {

                        upazila.innerHTML = `
                            <option value="">
                                সব উপজেলা
                            </option>
                        `;

                        upazila.disabled =
                            true;

                    }


                    applyFilters();

                }
            );

        }


        /* -------------------------------------------------
           FILTER DISTRICT → UPAZILA
        ------------------------------------------------- */

        const filterDistrict =
            get("doctorDistrictFilter");


        if (filterDistrict) {

            filterDistrict.addEventListener(
                "change",
                function () {

                    const districtId =
                        filterDistrict.value;


                    renderUpazilaOptions(
                        districtId,
                        "doctorUpazilaFilter",
                        "সব উপজেলা"
                    );


                    applyFilters();

                }
            );

        }


        /* -------------------------------------------------
           SEARCH
        ------------------------------------------------- */

        const search =
            get("doctorSearch");


        if (search) {

            search.addEventListener(
                "input",
                applyFilters
            );

        }


        /* -------------------------------------------------
           OTHER FILTERS
        ------------------------------------------------- */

        [

            get("doctorUpazilaFilter"),

            get("doctorSpecializationFilter"),

            get("doctorDepartmentFilter"),

            get("doctorStatusFilter"),

            get("doctorVerificationFilter")

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


        /* -------------------------------------------------
           CLEAR FILTERS
        ------------------------------------------------- */

        const clearButton =
            get("doctorClearFilters");


        if (clearButton) {

            clearButton.addEventListener(
                "click",
                clearFilters
            );

        }


        /* -------------------------------------------------
           LIST ACTION
        ------------------------------------------------- */

        const list =
            get("doctorList");


        if (list) {

            list.addEventListener(
                "click",
                async function (event) {

                    const button =
                        event.target.closest(
                            "[data-action]"
                        );


                    if (!button) {
                        return;
                    }


                    const doctorId =
                        button.dataset.id;


                    if (!doctorId) {
                        return;
                    }


                    const action =
                        button.dataset.action;


                    if (action === "edit") {

                        openEditModal(
                            doctorId
                        );

                        return;

                    }


                    if (action === "deactivate") {

                        await toggleDoctorStatus(
                            doctorId,
                            false
                        );

                        return;

                    }


                    if (action === "activate") {

                        await toggleDoctorStatus(
                            doctorId,
                            true
                        );

                    }

                }
            );

        }


        /* -------------------------------------------------
           PAGINATION
        ------------------------------------------------- */

        const paginationButtons =
            get("doctorPaginationButtons");


        if (paginationButtons) {

            paginationButtons.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-page]"
                        );


                    if (
                        !button ||
                        button.disabled
                    ) {
                        return;
                    }


                    const totalPages =
                        Math.max(
                            1,
                            Math.ceil(
                                state.filteredDoctors.length /
                                PAGE_SIZE
                            )
                        );


                    const page =
                        button.dataset.page;


                    if (page === "prev") {

                        if (
                            state.currentPage >
                            1
                        ) {

                            state.currentPage--;

                        }

                    } else if (
                        page === "next"
                    ) {

                        if (
                            state.currentPage <
                            totalPages
                        ) {

                            state.currentPage++;

                        }

                    } else {

                        const pageNumber =
                            Number(page);


                        if (
                            Number.isInteger(
                                pageNumber
                            ) &&
                            pageNumber >= 1 &&
                            pageNumber <= totalPages
                        ) {

                            state.currentPage =
                                pageNumber;

                        }

                    }


                    renderList();

                }
            );

        }


        /* -------------------------------------------------
           FORM SUBMIT
        ------------------------------------------------- */

        const form =
            get("doctorForm");


        if (form) {

            form.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    await saveDoctor();

                }
            );

        }


        /* -------------------------------------------------
           ESC KEY
        ------------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    const modal =
                        get("doctorModal");


                    if (
                        modal &&
                        modal.classList.contains(
                            "is-open"
                        )
                    ) {

                        closeModal();

                    }

                }

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initialize() {

        try {

            let attempts = 0;

            const maxAttempts = 100;


            while (
                attempts <
                maxAttempts
            ) {

                if (
                    window.DorkariAdmin &&
                    typeof window.DorkariAdmin.getProfile ===
                    "function" &&
                    window.DorkariAdmin.getProfile()
                ) {

                    break;

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


            if (
                !window.DorkariAdmin ||
                typeof window.DorkariAdmin.getSupabase !==
                "function"
            ) {

                throw new Error(
                    "Admin security guard ready হয়নি।"
                );

            }


            initializeSupabase();

            bindEvents();

            await loadLocations();

            await loadDoctors();


            console.log(
                "Dorkari Doctor Foundation ready."
            );


        } catch (error) {

            console.error(
                "Doctor initialization failed:",
                error
            );


            showErrorState(
                error.message ||
                "Doctor data লোড করা যায়নি।"
            );

        }

    }


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


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.DorkariDoctor = {

        refresh:
            async function () {

                await loadLocations();

                await loadDoctors();

            },


        getDoctors:
            function () {

                return [
                    ...state.doctors
                ];

            }

    };

})();
