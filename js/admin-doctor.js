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

        const toast =
            get("doctorToast");

        const messageElement =
            get("doctorToastMessage");

        if (!toast || !messageElement) {
            return;
        }

        messageElement.textContent =
            message;

        toast.classList.add("show");

        clearTimeout(showToast.timer);

        showToast.timer =
            setTimeout(function () {

                toast.classList.remove("show");

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
       LOADING STATE
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
       ERROR STATE
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

                    return (
                        doctor.is_active === true
                    );

                }
            ).length;

        const verified =
            state.doctors.filter(
                function (doctor) {

                    return (
                        doctor.is_verified === true
                    );

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

        state.filteredDoctors =
            [
                ...state.doctors
            ];

        state.currentPage =
            1;


        updateSummary();

        updateResultCount();

        renderList();

    }


    /* =====================================================
       CARD
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


                    ${
                        doctor.name &&
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

                        ${
                            doctor.degree
                                ? `
                                    <span class="doctor-badge">
                                        ${escapeHTML(
                                            doctor.degree
                                        )}
                                    </span>
                                  `
                                : ""
                        }


                        ${
                            doctor.specialization
                                ? `
                                    <span class="doctor-badge">
                                        ${escapeHTML(
                                            doctor.specialization
                                        )}
                                    </span>
                                  `
                                : ""
                        }


                        ${
                            doctor.department
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


                    ${
                        doctor.phone
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

            list.innerHTML = `
                <div class="doctor-empty">
                    কোনো Doctor পাওয়া যায়নি।
                </div>
            `;

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

            info.textContent =
                "";

            buttons.innerHTML =
                "";

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
            `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)} doctors`;


        buttons.innerHTML =
            "";


        if (totalPages <= 1) {

            pagination.hidden =
                true;

            return;

        }


        pagination.hidden =
            false;


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
                    page === state.currentPage
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

    function openModal() {

        const modal =
            get("doctorModal");

        const form =
            get("doctorForm");

        if (!modal) {
            return;
        }


        state.editingDoctorId =
            null;


        if (form) {

            form.reset();

        }


        const active =
            get("doctorActive");

        const verified =
            get("doctorVerified");

        const id =
            get("doctorId");

        const title =
            get("doctorModalTitle");

        const saveButton =
            get("doctorSaveBtn");


        if (id) {
            id.value =
                "";
        }

        if (active) {
            active.checked =
                true;
        }

        if (verified) {
            verified.checked =
                false;
        }

        if (title) {
            title.textContent =
                "Add Doctor";
        }

        if (saveButton) {
            saveButton.textContent =
                "Save Doctor";
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

    }


    function closeModal() {

        const modal =
            get("doctorModal");

        const form =
            get("doctorForm");

        if (!modal) {
            return;
        }


        if (form) {
            form.reset();
        }


        state.editingDoctorId =
            null;


        modal.classList.remove(
            "is-open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        const refreshButton =
            get("doctorRefresh");

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                async function () {

                    try {

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


        const addButton =
            get("doctorAddBtn");

        if (addButton) {

            addButton.addEventListener(
                "click",
                openModal
            );

        }


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


        const backdrop =
            document.querySelector(
                ".doctor-modal-backdrop"
            );

        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeModal
            );

        }


        const list =
            get("doctorList");

        if (list) {

            list.addEventListener(
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
                        "Edit/Update পরবর্তী ধাপে যুক্ত হবে।"
                    );

                }
            );

        }


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


                    if (
                        page === "prev"
                    ) {

                        if (
                            state.currentPage > 1
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


        const form =
            get("doctorForm");

        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    showToast(
                        "Doctor Save পরবর্তী ধাপে যুক্ত হবে।"
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

            let attempts =
                0;

            const maxAttempts =
                100;


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
            loadDoctors,

        getDoctors:
            function () {

                return [
                    ...state.doctors
                ];

            }

    };

})();
