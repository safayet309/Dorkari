/* =========================================================
   DORKARI — LOCATION MANAGEMENT
   File: js/admin-location.js

   F-7.2 — Division Management CRUD

   Handles:
   - Division list
   - Search
   - Status filter
   - Add
   - Edit
   - Update
   - Soft delete
   - Activate
   - Validation
   - Pagination
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLE = "divisions";

    const PAGE_SIZE = 10;

    let currentPage = 1;
    let editingDivisionId = null;

    let allDivisions = [];
    let filteredDivisions = [];


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const divisionFormPanel =
        getElement("divisionFormPanel");

    const divisionForm =
        getElement("divisionForm");

    const divisionFormTitle =
        getElement("divisionFormTitle");

    const divisionName =
        getElement("divisionName");

    const divisionNameBn =
        getElement("divisionNameBn");

    const divisionSlug =
        getElement("divisionSlug");

    const divisionIsActive =
        getElement("divisionIsActive");

    const divisionSearch =
        getElement("divisionSearch");

    const divisionStatusFilter =
        getElement("divisionStatusFilter");

    const divisionTable =
        getElement("divisionTable");

    const divisionTableBody =
        getElement("divisionTableBody");

    const divisionLoadingState =
        getElement("divisionLoadingState");

    const divisionEmptyState =
        getElement("divisionEmptyState");

    const divisionErrorState =
        getElement("divisionErrorState");

    const divisionErrorMessage =
        getElement("divisionErrorMessage");

    const divisionPagination =
        getElement("divisionPagination");

    const divisionPaginationInfo =
        getElement("divisionPaginationInfo");

    const divisionPaginationControls =
        getElement("divisionPaginationControls");

    const locationDivisionCount =
        getElement("locationDivisionCount");

    const locationDistrictCount =
        getElement("locationDistrictCount");

    const locationUpazilaCount =
        getElement("locationUpazilaCount");

    const addLocationButton =
        getElement("addLocationButton");

    const sectionAddDivisionButton =
        getElement("sectionAddDivisionButton");

    const closeDivisionForm =
        getElement("closeDivisionForm");

    const cancelDivisionButton =
        getElement("cancelDivisionButton");

    const saveDivisionButton =
        getElement("saveDivisionButton");

    const divisionTab =
        getElement("divisionTab");

    const districtTab =
        getElement("districtTab");

    const upazilaTab =
        getElement("upazilaTab");

    const divisionManagementSection =
        getElement("divisionManagementSection");

    const districtManagementSection =
        getElement("districtManagementSection");

    const upazilaManagementSection =
        getElement("upazilaManagementSection");

    const locationPermissionNotice =
        getElement("locationPermissionNotice");


    /* =====================================================
       SUPABASE
       ===================================================== */

    let supabaseClient = null;


    function getAdmin() {
        return window.DorkariAdmin || null;
    }


    function getCRUD() {
        return window.DorkariCRUD || null;
    }


    function initializeSupabase() {

        const admin = getAdmin();

        if (!admin) {
            throw new Error(
                "DorkariAdmin is not available."
            );
        }

        supabaseClient =
            admin.getSupabase();

        if (!supabaseClient) {
            throw new Error(
                "Supabase client is not available."
            );
        }
    }


    /* =====================================================
       PERMISSION
       ===================================================== */

    function canManageLocation() {

        const admin = getAdmin();

        if (!admin) {
            return false;
        }

        return admin.canManageContent();
    }


    function updatePermissionUI() {

        const canManage =
            canManageLocation();

        if (locationPermissionNotice) {
            locationPermissionNotice.classList.toggle(
                "show",
                !canManage
            );
        }

        if (addLocationButton) {
            addLocationButton.style.display =
                canManage ? "" : "none";
        }

        if (sectionAddDivisionButton) {
            sectionAddDivisionButton.style.display =
                canManage ? "" : "none";
        }
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function cleanText(value) {
        return String(value || "").trim();
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
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    function slugify(value) {

        return cleanText(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }


    /* =====================================================
       STATE UI
       ===================================================== */

    function showState(state) {

        if (divisionLoadingState) {
            divisionLoadingState.hidden =
                state !== "loading";
        }

        if (divisionEmptyState) {
            divisionEmptyState.hidden =
                state !== "empty";
        }

        if (divisionErrorState) {
            divisionErrorState.hidden =
                state !== "error";
        }

        if (divisionTable) {
            divisionTable.hidden =
                state !== "table";
        }

        if (divisionPagination) {
            divisionPagination.hidden =
                state !== "table";
        }
    }


    /* =====================================================
       FORM
       ===================================================== */

    function clearFormErrors() {

        [
            "divisionName",
            "divisionNameBn",
            "divisionSlug"
        ].forEach(function (id) {

            const input =
                getElement(id);

            if (input) {
                input.classList.remove(
                    "is-invalid"
                );
            }

            const error =
                getElement(
                    id + "Error"
                );

            if (error) {
                error.textContent = "";
                error.classList.remove(
                    "show"
                );
            }
        });
    }


    function setFieldError(
        inputId,
        message
    ) {

        const input =
            getElement(inputId);

        const error =
            getElement(
                inputId + "Error"
            );

        if (input) {
            input.classList.add(
                "is-invalid"
            );
        }

        if (error) {
            error.textContent =
                message;

            error.classList.add(
                "show"
            );
        }
    }


    function openDivisionForm(
        division = null
    ) {

        if (!canManageLocation()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "error"
            );

            return;
        }

        clearFormErrors();

        if (!division) {

            editingDivisionId = null;

            divisionFormTitle.textContent =
                "Add Division";

            divisionName.value = "";
            divisionNameBn.value = "";
            divisionSlug.value = "";

            divisionIsActive.checked =
                true;

            saveDivisionButton.textContent =
                "Save Division";

        } else {

            editingDivisionId =
                division.id;

            divisionFormTitle.textContent =
                "Edit Division";

            divisionName.value =
                division.name || "";

            divisionNameBn.value =
                division.name_bn || "";

            divisionSlug.value =
                division.slug || "";

            divisionIsActive.checked =
                division.is_active !== false;

            saveDivisionButton.textContent =
                "Update Division";
        }

        divisionFormPanel.classList.add(
            "active"
        );

        setTimeout(function () {

            if (divisionName) {
                divisionName.focus();
            }

        }, 50);

        divisionFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }


    function closeForm() {

        editingDivisionId = null;

        clearFormErrors();

        if (divisionForm) {
            divisionForm.reset();
        }

        if (divisionIsActive) {
            divisionIsActive.checked =
                true;
        }

        if (divisionFormTitle) {
            divisionFormTitle.textContent =
                "Add Division";
        }

        if (saveDivisionButton) {
            saveDivisionButton.textContent =
                "Save Division";
        }

        if (divisionFormPanel) {
            divisionFormPanel.classList.remove(
                "active"
            );
        }
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateDivisionForm() {

        clearFormErrors();

        const name =
            cleanText(
                divisionName.value
            );

        const nameBn =
            cleanText(
                divisionNameBn.value
            );

        const slug =
            cleanText(
                divisionSlug.value
            );

        let valid = true;


        if (!name) {

            setFieldError(
                "divisionName",
                "English name দিন।"
            );

            valid = false;
        }


        if (!nameBn) {

            setFieldError(
                "divisionNameBn",
                "বাংলা নাম দিন।"
            );

            valid = false;
        }


        if (!slug) {

            setFieldError(
                "divisionSlug",
                "Slug দিন।"
            );

            valid = false;

        } else if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                slug
            )
        ) {

            setFieldError(
                "divisionSlug",
                "Slug শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা ও hyphen হতে পারে।"
            );

            valid = false;
        }


        return valid;
    }


    /* =====================================================
       DUPLICATE CHECK
       ===================================================== */

    async function checkDuplicate(
        name,
        nameBn,
        slug,
        currentId
    ) {

        const { data, error } =
            await supabaseClient
                .from(TABLE)
                .select(
                    "id,name,name_bn,slug"
                )
                .or(
                    [
                        "name.ilike." +
                        name,

                        "name_bn.ilike." +
                        nameBn,

                        "slug.ilike." +
                        slug
                    ].join(",")
                );

        if (error) {
            throw error;
        }

        const duplicates =
            (data || []).filter(
                function (item) {

                    return item.id !==
                        currentId;
                }
            );

        return duplicates.length > 0
            ? duplicates[0]
            : null;
    }


    /* =====================================================
       LOAD DIVISIONS
       ===================================================== */

    async function loadDivisions() {

        showState("loading");

        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(TABLE)
                    .select(
                        "id,name,name_bn,slug,is_active,created_at"
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

            allDivisions =
                data || [];

            currentPage = 1;

            applyDivisionFilters();

            updateDivisionCount();

        } catch (error) {

            console.error(
                "Division Load Error:",
                error
            );

            if (divisionErrorMessage) {

                divisionErrorMessage.textContent =
                    getErrorMessage(error);
            }

            showState("error");
        }
    }


    /* =====================================================
       FILTER
       ===================================================== */

    function applyDivisionFilters() {

        const search =
            cleanText(
                divisionSearch
                    ? divisionSearch.value
                    : ""
            ).toLowerCase();

        const status =
            divisionStatusFilter
                ? divisionStatusFilter.value
                : "active";


        filteredDivisions =
            allDivisions.filter(
                function (division) {

                    const matchesSearch =
                        !search ||
                        String(
                            division.name || ""
                        ).toLowerCase()
                            .includes(search) ||

                        String(
                            division.name_bn || ""
                        ).toLowerCase()
                            .includes(search) ||

                        String(
                            division.slug || ""
                        ).toLowerCase()
                            .includes(search);


                    let matchesStatus =
                        true;

                    if (status === "active") {

                        matchesStatus =
                            division.is_active === true;
                    }

                    if (status === "inactive") {

                        matchesStatus =
                            division.is_active === false;
                    }


                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredDivisions.length /
                    PAGE_SIZE
                )
            );


        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        renderDivisionTable();
    }


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function renderDivisionTable() {

        if (!divisionTableBody) {
            return;
        }


        if (
            !filteredDivisions ||
            filteredDivisions.length === 0
        ) {

            divisionTableBody.innerHTML = "";

            showState("empty");

            renderPagination();

            return;
        }


        const start =
            (currentPage - 1) *
            PAGE_SIZE;

        const end =
            start + PAGE_SIZE;

        const pageItems =
            filteredDivisions.slice(
                start,
                end
            );


        divisionTableBody.innerHTML =
            pageItems.map(
                function (division) {

                    const isActive =
                        division.is_active === true;

                    return `
                        <tr data-id="${escapeHTML(division.id)}">

                            <td>
                                <div class="location-table-name">

                                    <div class="location-table-icon">
                                        🗺️
                                    </div>

                                    <div class="location-table-name-text">

                                        <span class="location-table-name-bn">
                                            ${escapeHTML(
                                                division.name_bn ||
                                                division.name ||
                                                "—"
                                            )}
                                        </span>

                                        <span class="location-table-name-en">
                                            ${escapeHTML(
                                                division.name ||
                                                "—"
                                            )}
                                        </span>

                                    </div>

                                </div>
                            </td>


                            <td>
                                <span class="location-table-slug">
                                    ${escapeHTML(
                                        division.slug ||
                                        "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="location-status ${
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
                                ${formatDate(
                                    division.created_at
                                )}
                            </td>


                            <td>

                                <div class="location-table-actions">

                                    ${
                                        canManageLocation()
                                            ? `
                                                <button
                                                    type="button"
                                                    class="location-action-btn edit"
                                                    data-action="edit"
                                                    data-id="${escapeHTML(division.id)}"
                                                >
                                                    Edit
                                                </button>

                                                ${
                                                    isActive
                                                        ? `
                                                            <button
                                                                type="button"
                                                                class="location-action-btn delete"
                                                                data-action="delete"
                                                                data-id="${escapeHTML(division.id)}"
                                                            >
                                                                Delete
                                                            </button>
                                                        `
                                                        : `
                                                            <button
                                                                type="button"
                                                                class="location-action-btn activate"
                                                                data-action="activate"
                                                                data-id="${escapeHTML(division.id)}"
                                                            >
                                                                Activate
                                                            </button>
                                                        `
                                                }
                                            `
                                            : `
                                                <span>
                                                    —
                                                </span>
                                            `
                                    }

                                </div>

                            </td>

                        </tr>
                    `;
                }
            ).join("");


        showState("table");

        renderPagination();
    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        if (!divisionPaginationControls) {
            return;
        }

        const total =
            filteredDivisions.length;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total / PAGE_SIZE
                )
            );


        if (total === 0) {

            divisionPaginationControls.innerHTML =
                "";

            if (divisionPaginationInfo) {
                divisionPaginationInfo.textContent =
                    "Showing 0 divisions";
            }

            return;
        }


        const start =
            ((currentPage - 1) *
                PAGE_SIZE) + 1;

        const end =
            Math.min(
                currentPage * PAGE_SIZE,
                total
            );


        if (divisionPaginationInfo) {

            divisionPaginationInfo.textContent =
                `Showing ${start}–${end} of ${total} divisions`;
        }


        let html = "";


        html += `
            <button
                type="button"
                class="location-page-btn"
                data-page-action="prev"
                ${currentPage <= 1 ? "disabled" : ""}
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
                    class="location-page-btn ${
                        page === currentPage
                            ? "active"
                            : ""
                    }"
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }


        html += `
            <button
                type="button"
                class="location-page-btn"
                data-page-action="next"
                ${
                    currentPage >= totalPages
                        ? "disabled"
                        : ""
                }
            >
                →
            </button>
        `;


        divisionPaginationControls.innerHTML =
            html;
    }


    /* =====================================================
       COUNT
       ===================================================== */

    function updateDivisionCount() {

        if (locationDivisionCount) {

            const activeCount =
                allDivisions.filter(
                    function (item) {
                        return item.is_active === true;
                    }
                ).length;

            locationDivisionCount.textContent =
                formatNumber(activeCount);
        }
    }


    async function loadLocationSummary() {

        try {

            const [
                divisionsResult,
                districtsResult,
                upazilasResult
            ] = await Promise.all([

                supabaseClient
                    .from("divisions")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "is_active",
                        true
                    ),

                supabaseClient
                    .from("districts")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "is_active",
                        true
                    ),

                supabaseClient
                    .from("upazilas")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "is_active",
                        true
                    )
            ]);


            if (divisionsResult.error) {
                throw divisionsResult.error;
            }

            if (districtsResult.error) {
                throw districtsResult.error;
            }

            if (upazilasResult.error) {
                throw upazilasResult.error;
            }


            if (locationDivisionCount) {

                locationDivisionCount.textContent =
                    formatNumber(
                        divisionsResult.count || 0
                    );
            }


            if (locationDistrictCount) {

                locationDistrictCount.textContent =
                    formatNumber(
                        districtsResult.count || 0
                    );
            }


            if (locationUpazilaCount) {

                locationUpazilaCount.textContent =
                    formatNumber(
                        upazilasResult.count || 0
                    );
            }

        } catch (error) {

            console.error(
                "Location Summary Error:",
                error
            );
        }
    }


    /* =====================================================
       ADD / UPDATE
       ===================================================== */

    async function saveDivision() {

        if (!canManageLocation()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "error"
            );

            return;
        }


        if (!validateDivisionForm()) {
            return;
        }


        const name =
            cleanText(
                divisionName.value
            );

        const nameBn =
            cleanText(
                divisionNameBn.value
            );

        const slug =
            cleanText(
                divisionSlug.value
            ).toLowerCase();

        const isActive =
            divisionIsActive.checked;


        setSaveButtonLoading(true);


        try {

            const duplicate =
                await checkDuplicate(
                    name,
                    nameBn,
                    slug,
                    editingDivisionId
                );


            if (duplicate) {

                if (
                    String(
                        duplicate.slug
                    ).toLowerCase() === slug
                ) {

                    setFieldError(
                        "divisionSlug",
                        "এই slug ইতোমধ্যে ব্যবহার করা হয়েছে।"
                    );

                } else if (
                    String(
                        duplicate.name
                    ).toLowerCase() ===
                    name.toLowerCase()
                ) {

                    setFieldError(
                        "divisionName",
                        "এই Division name ইতোমধ্যে আছে।"
                    );

                } else {

                    setFieldError(
                        "divisionNameBn",
                        "এই বাংলা নাম ইতোমধ্যে আছে।"
                    );
                }

                return;
            }


            const payload = {
                name: name,
                name_bn: nameBn,
                slug: slug,
                is_active: isActive
            };


            let result;


            if (editingDivisionId) {

                result =
                    await supabaseClient
                        .from(TABLE)
                        .update(payload)
                        .eq(
                            "id",
                            editingDivisionId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await supabaseClient
                        .from(TABLE)
                        .insert(payload)
                        .select()
                        .single();
            }


            if (result.error) {
                throw result.error;
            }


            if (editingDivisionId) {

                showToast(
                    "Division সফলভাবে update হয়েছে।",
                    "success"
                );

            } else {

                showToast(
                    "Division সফলভাবে যোগ হয়েছে।",
                    "success"
                );
            }


            closeForm();

            await loadDivisions();

            await loadLocationSummary();

        } catch (error) {

            console.error(
                "Division Save Error:",
                error
            );

            showToast(
                getErrorMessage(error),
                "error"
            );

        } finally {

            setSaveButtonLoading(false);
        }
    }


    /* =====================================================
       BUTTON LOADING
       ===================================================== */

    function setSaveButtonLoading(
        loading
    ) {

        if (!saveDivisionButton) {
            return;
        }

        if (loading) {

            saveDivisionButton.disabled =
                true;

            saveDivisionButton.dataset
                .originalText =
                saveDivisionButton.textContent;

            saveDivisionButton.textContent =
                editingDivisionId
                    ? "Updating..."
                    : "Saving...";

        } else {

            saveDivisionButton.disabled =
                false;

            saveDivisionButton.textContent =
                editingDivisionId
                    ? "Update Division"
                    : "Save Division";
        }
    }


    /* =====================================================
       EDIT
       ===================================================== */

    function editDivision(id) {

        const division =
            allDivisions.find(
                function (item) {
                    return item.id === id;
                }
            );

        if (!division) {

            showToast(
                "Division পাওয়া যায়নি।",
                "error"
            );

            return;
        }

        openDivisionForm(
            division
        );
    }


    /* =====================================================
       DELETE / ACTIVATE
       ===================================================== */

    async function changeDivisionStatus(
        id,
        active
    ) {

        if (!canManageLocation()) {

            showToast(
                "আপনার এই কাজের অনুমতি নেই।",
                "error"
            );

            return;
        }


        const division =
            allDivisions.find(
                function (item) {
                    return item.id === id;
                }
            );


        if (!division) {

            showToast(
                "Division পাওয়া যায়নি।",
                "error"
            );

            return;
        }


        const divisionNameText =
            division.name_bn ||
            division.name ||
            "এই Division";


        let confirmed;


        if (active) {

            confirmed =
                window.confirm(
                    `"${divisionNameText}" আবার Active করতে চান?`
                );

        } else {

            confirmed =
                window.confirm(
                    `"${divisionNameText}" Deactivate করতে চান?`
                );
        }


        if (!confirmed) {
            return;
        }


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(TABLE)
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
                    ? "Division আবার Active হয়েছে।"
                    : "Division Deactivate হয়েছে।",
                "success"
            );


            await loadDivisions();

            await loadLocationSummary();

        } catch (error) {

            console.error(
                "Division Status Error:",
                error
            );

            showToast(
                getErrorMessage(error),
                "error"
            );
        }
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message,
        type = "success"
    ) {

        const admin =
            getAdmin();

        if (
            admin &&
            typeof admin.showToast ===
            "function"
        ) {

            admin.showToast(
                message
            );

            return;
        }


        const toast =
            getElement("adminToast");

        const toastMessage =
            getElement(
                "adminToastMessage"
            );


        if (!toast) {
            return;
        }


        if (toastMessage) {
            toastMessage.textContent =
                message;
        }


        toast.classList.remove(
            "show",
            "success",
            "error"
        );

        toast.classList.add(
            type,
            "show"
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
       ERROR MESSAGE
       ===================================================== */

    function getErrorMessage(
        error
    ) {

        if (!error) {
            return "একটি অজানা সমস্যা হয়েছে।";
        }


        const message =
            String(
                error.message ||
                error.error_description ||
                ""
            );


        if (
            message
                .toLowerCase()
                .includes("row-level security")
        ) {

            return "এই কাজটি করার অনুমতি নেই।";
        }


        if (
            message
                .toLowerCase()
                .includes("duplicate")
        ) {

            return "এই তথ্যটি ইতোমধ্যে রয়েছে।";
        }


        if (
            message
                .toLowerCase()
                .includes("unique")
        ) {

            return "এই তথ্যটি ইতোমধ্যে ব্যবহার করা হয়েছে।";
        }


        return message ||
            "তথ্য সংরক্ষণ করা যায়নি।";
    }


    /* =====================================================
       TABS
       ===================================================== */

    function switchLocationTab(
        tab
    ) {

        const tabs = [
            {
                button: divisionTab,
                section: divisionManagementSection,
                name: "division"
            },
            {
                button: districtTab,
                section: districtManagementSection,
                name: "district"
            },
            {
                button: upazilaTab,
                section: upazilaManagementSection,
                name: "upazila"
            }
        ];


        tabs.forEach(
            function (item) {

                const active =
                    item.name === tab;

                if (item.button) {

                    item.button.classList.toggle(
                        "active",
                        active
                    );

                    item.button.setAttribute(
                        "aria-selected",
                        active
                            ? "true"
                            : "false"
                    );
                }

                if (item.section) {
                    item.section.hidden =
                        !active;
                }
            }
        );


        if (tab === "district") {

            showToast(
                "District Management পরবর্তী ধাপে যুক্ত হবে।"
            );
        }


        if (tab === "upazila") {

            showToast(
                "Upazila Management পরবর্তী ধাপে যুক্ত হবে।"
            );
        }
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    function setupEventListeners() {


        /* -----------------------------------------------
           Add buttons
           ----------------------------------------------- */

        if (addLocationButton) {

            addLocationButton.addEventListener(
                "click",
                function () {

                    openDivisionForm();
                }
            );
        }


        if (sectionAddDivisionButton) {

            sectionAddDivisionButton.addEventListener(
                "click",
                function () {

                    openDivisionForm();
                }
            );
        }


        /* -----------------------------------------------
           Form
           ----------------------------------------------- */

        if (divisionForm) {

            divisionForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveDivision();
                }
            );
        }


        /* -----------------------------------------------
           Close form
           ----------------------------------------------- */

        if (closeDivisionForm) {

            closeDivisionForm.addEventListener(
                "click",
                closeForm
            );
        }


        if (cancelDivisionButton) {

            cancelDivisionButton.addEventListener(
                "click",
                closeForm
            );
        }


        /* -----------------------------------------------
           Search
           ----------------------------------------------- */

        if (divisionSearch) {

            divisionSearch.addEventListener(
                "input",
                function () {

                    currentPage = 1;

                    applyDivisionFilters();
                }
            );
        }


        /* -----------------------------------------------
           Status filter
           ----------------------------------------------- */

        if (divisionStatusFilter) {

            divisionStatusFilter.addEventListener(
                "change",
                function () {

                    currentPage = 1;

                    applyDivisionFilters();
                }
            );
        }


        /* -----------------------------------------------
           Table actions
           ----------------------------------------------- */

        if (divisionTableBody) {

            divisionTableBody.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-action]"
                        );

                    if (!button) {
                        return;
                    }


                    const action =
                        button.dataset.action;

                    const id =
                        button.dataset.id;


                    if (!id) {
                        return;
                    }


                    if (action === "edit") {

                        editDivision(id);
                    }


                    if (action === "delete") {

                        changeDivisionStatus(
                            id,
                            false
                        );
                    }


                    if (action === "activate") {

                        changeDivisionStatus(
                            id,
                            true
                        );
                    }
                }
            );
        }


        /* -----------------------------------------------
           Pagination
           ----------------------------------------------- */

        if (divisionPaginationControls) {

            divisionPaginationControls.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "button"
                        );

                    if (!button) {
                        return;
                    }


                    const page =
                        button.dataset.page;

                    const action =
                        button.dataset.pageAction;


                    if (page) {

                        currentPage =
                            Number(page);

                    } else if (
                        action === "prev" &&
                        currentPage > 1
                    ) {

                        currentPage--;

                    } else if (
                        action === "next"
                    ) {

                        const totalPages =
                            Math.ceil(
                                filteredDivisions.length /
                                PAGE_SIZE
                            );

                        if (
                            currentPage <
                            totalPages
                        ) {
                            currentPage++;
                        }
                    }


                    renderDivisionTable();
                }
            );
        }


        /* -----------------------------------------------
           Tabs
           ----------------------------------------------- */

        if (divisionTab) {

            divisionTab.addEventListener(
                "click",
                function () {

                    switchLocationTab(
                        "division"
                    );
                }
            );
        }


        if (districtTab) {

            districtTab.addEventListener(
                "click",
                function () {

                    switchLocationTab(
                        "district"
                    );
                }
            );
        }


        if (upazilaTab) {

            upazilaTab.addEventListener(
                "click",
                function () {

                    switchLocationTab(
                        "upazila"
                    );
                }
            );
        }


        /* -----------------------------------------------
           Auto slug
           ----------------------------------------------- */

        if (divisionName) {

            divisionName.addEventListener(
                "input",
                function () {

                    if (
                        !editingDivisionId &&
                        divisionSlug &&
                        !divisionSlug.dataset.manual
                    ) {

                        divisionSlug.value =
                            slugify(
                                divisionName.value
                            );
                    }
                }
            );
        }


        if (divisionSlug) {

            divisionSlug.addEventListener(
                "input",
                function () {

                    divisionSlug.dataset.manual =
                        divisionSlug.value.trim()
                            ? "true"
                            : "";
                }
            );
        }


        /* -----------------------------------------------
           Keyboard
           ----------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    divisionFormPanel &&
                    divisionFormPanel.classList.contains(
                        "active"
                    )
                ) {

                    closeForm();
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initializeLocationPage() {

        try {

            initializeSupabase();

            updatePermissionUI();

            setupEventListeners();

            await loadDivisions();

            await loadLocationSummary();


            console.log(
                "Dorkari Location Management: Ready"
            );

        } catch (error) {

            console.error(
                "Dorkari Location Initialization Error:",
                error
            );

            if (divisionErrorMessage) {

                divisionErrorMessage.textContent =
                    getErrorMessage(error);
            }

            showState("error");
        }
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DorkariLocation = {

        reload: async function () {

            await loadDivisions();

            await loadLocationSummary();
        },

        openAddDivision: function () {

            openDivisionForm();
        },

        getDivisions: function () {

            return [
                ...allDivisions
            ];
        }

    };


 /* =====================================================
   WAIT FOR ADMIN GUARD
   ===================================================== */

function waitForAdmin() {

    const admin =
        window.DorkariAdmin;

    /*
     * DorkariAdmin object তৈরি হলেই যথেষ্ট নয়।
     *
     * Admin Guard-এর Supabase session এবং
     * admin_profiles verification সম্পূর্ণ হওয়া পর্যন্ত
     * Location Management অপেক্ষা করবে।
     */

    if (
        admin &&
        typeof admin.getSupabase === "function" &&
        typeof admin.getProfile === "function"
    ) {

        const profile =
            admin.getProfile();

        /*
         * Profile এখনো verify না হলে অপেক্ষা করবে।
         */

        if (!profile) {

            window.setTimeout(
                waitForAdmin,
                100
            );

            return;
        }

        /*
         * Verified admin profile পাওয়া গেছে।
         * এখন Location Management initialize হবে।
         */

        initializeLocationPage();

        return;
    }


    /*
     * Admin Guard এখনো তৈরি হয়নি।
     */

    window.setTimeout(
        waitForAdmin,
        100
    );
}


waitForAdmin();

})();
