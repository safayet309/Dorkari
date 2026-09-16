/* =========================================================
   DORKARI — TESTS & FEES MANAGEMENT
   File: js/admin-test.js

   Handles:
   - Test list
   - Search
   - Category filter
   - Status filter
   - Pagination
   - Add Test
   - Edit Test
   - Update Test
   - Activate / Deactivate
   - Supabase integration
   - Role-based content permission
========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const TEST_TABLE = "tests";
    const HOSPITAL_TEST_TABLE = "hospital_tests";

    const PAGE_SIZE = 10;


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        supabase: null,

        tests: [],
        filteredTests: [],

        currentPage: 1,

        editingTestId: null,

        isLoading: false,
        isSaving: false
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


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        const box = get("testToast");
        const text = get("testToastMessage");

        if (!box || !text) {
            return;
        }

        text.textContent = cleanText(message);

        box.hidden = false;

        clearTimeout(
            showToast.timer
        );

        showToast.timer =
            setTimeout(
                function () {

                    box.hidden = true;

                },
                3000
            );
    }


    /* =====================================================
       ERROR MESSAGE
    ===================================================== */

    function getErrorMessage(error) {

        if (!error) {
            return "একটি সমস্যা হয়েছে।";
        }


        if (
            error.code === "23505"
        ) {

            return "এই Test তথ্যটি আগে থেকেই আছে।";

        }


        if (
            error.message
        ) {

            return error.message;

        }


        return "Test সংরক্ষণ করা যায়নি।";
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

        }


        if (!state.supabase) {

            throw new Error(
                "Supabase client পাওয়া যায়নি।"
            );

        }
    }


    /* =====================================================
       CONTENT MANAGEMENT PERMISSION
    ===================================================== */

    function canManageTests() {

        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.canManageContent ===
                "function"
        ) {

            return Boolean(
                window.DorkariAdmin.canManageContent()
            );

        }

        return false;
    }


    /* =====================================================
       PERMISSION UI
    ===================================================== */

    function applyPermissionUI() {

        const canManage =
            canManageTests();


        const addButton =
            get("testAddBtn");

        if (addButton) {

            addButton.disabled =
                !canManage;

            addButton.title =
                canManage
                    ? ""
                    : "আপনার এই action-এর permission নেই।";
        }


        const saveButton =
            get("testSaveBtn");

        if (saveButton) {

            saveButton.disabled =
                !canManage;
        }
    }


    /* =====================================================
       LOAD TESTS
    ===================================================== */

    async function loadTests() {

        if (state.isLoading) {
            return;
        }


        if (!state.supabase) {
            return;
        }


        state.isLoading = true;


        const tableBody =
            get("testTableBody");


        if (tableBody) {

            tableBody.innerHTML =
                `
                <tr>
                    <td
                        colspan="5"
                        class="test-empty"
                    >
                        Loading tests...
                    </td>
                </tr>
                `;

        }


        try {

            const result =
                await state.supabase
                    .from(TEST_TABLE)
                    .select(
                        [
                            "id",
                            "name",
                            "name_bn",
                            "category",
                            "description",
                            "is_active",
                            "created_at"
                        ].join(",")
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (result.error) {
                throw result.error;
            }


            state.tests =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            populateCategories();

            state.currentPage = 1;

            applyFilters();


        } catch (error) {

            console.error(
                "Tests load error:",
                error
            );


            if (tableBody) {

                tableBody.innerHTML =
                    `
                    <tr>
                        <td
                            colspan="5"
                            class="test-empty"
                        >
                            Tests data লোড করা যায়নি।
                        </td>
                    </tr>
                    `;
            }


            showToast(
                getErrorMessage(error)
            );


        } finally {

            state.isLoading = false;

        }
    }


    /* =====================================================
       CATEGORY OPTIONS
    ===================================================== */

    function populateCategories() {

        const select =
            get("testCategoryFilter");


        if (!select) {
            return;
        }


        const currentValue =
            select.value;


        const categories =
            Array.from(
                new Set(
                    state.tests
                        .map(
                            function (row) {

                                return cleanText(
                                    row.category
                                );

                            }
                        )
                        .filter(Boolean)
                )
            )
            .sort(
                function (a, b) {

                    return a.localeCompare(
                        b,
                        "en",
                        {
                            sensitivity: "base"
                        }
                    );

                }
            );


        select.innerHTML =
            `
            <option value="">
                সব category
            </option>
            ` +
            categories
                .map(
                    function (category) {

                        return `
                        <option value="${escapeHTML(category)}">
                            ${escapeHTML(category)}
                        </option>
                        `;

                    }
                )
                .join("");


        if (
            categories.includes(
                currentValue
            )
        ) {

            select.value =
                currentValue;

        }
    }


    /* =====================================================
       FILTERS
    ===================================================== */

    function applyFilters() {

        const searchInput =
            get("testSearch");

        const categorySelect =
            get("testCategoryFilter");

        const statusSelect =
            get("testStatusFilter");


        const search =
            cleanText(
                searchInput
                    ? searchInput.value
                    : ""
            )
            .toLocaleLowerCase();


        const category =
            categorySelect
                ? categorySelect.value
                : "";


        const status =
            statusSelect
                ? statusSelect.value
                : "";


        state.filteredTests =
            state.tests.filter(
                function (row) {

                    const searchableText =
                        [
                            row.name,
                            row.name_bn,
                            row.category,
                            row.description
                        ]
                            .map(
                                function (value) {

                                    return cleanText(
                                        value
                                    )
                                    .toLocaleLowerCase();

                                }
                            )
                            .join(" ");


                    if (
                        search &&
                        !searchableText.includes(
                            search
                        )
                    ) {

                        return false;

                    }


                    if (
                        category &&
                        cleanText(
                            row.category
                        ) !== category
                    ) {

                        return false;

                    }


                    if (
                        status === "active" &&
                        !row.is_active
                    ) {

                        return false;

                    }


                    if (
                        status === "inactive" &&
                        row.is_active
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
                    state.filteredTests.length /
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


        renderTests();

    }


    /* =====================================================
       RENDER TESTS
    ===================================================== */

    function renderTests() {

        const tableBody =
            get("testTableBody");


        if (!tableBody) {
            return;
        }


        const startIndex =
            (state.currentPage - 1) *
            PAGE_SIZE;


        const pageRows =
            state.filteredTests.slice(
                startIndex,
                startIndex + PAGE_SIZE
            );


        updateStatistics();


        const resultCount =
            get("testResultCount");


        if (resultCount) {

            resultCount.textContent =
                `${state.filteredTests.length} result(s)`;

        }


        if (
            pageRows.length === 0
        ) {

            tableBody.innerHTML =
                `
                <tr>
                    <td
                        colspan="5"
                        class="test-empty"
                    >
                        কোনো Test পাওয়া যায়নি।
                    </td>
                </tr>
                `;


            renderPagination();

            return;
        }


        tableBody.innerHTML =
            pageRows
                .map(
                    function (row) {

                        const statusClass =
                            row.is_active
                                ? "test-status-active"
                                : "test-status-inactive";


                        const statusText =
                            row.is_active
                                ? "Active"
                                : "Inactive";


                        const toggleText =
                            row.is_active
                                ? "Deactivate"
                                : "Activate";


                        return `
                        <tr>

                            <td>

                                <strong>
                                    ${escapeHTML(
                                        row.name_bn ||
                                        row.name ||
                                        "—"
                                    )}
                                </strong>

                                <br>

                                <small>
                                    ${escapeHTML(
                                        row.name || ""
                                    )}
                                </small>

                            </td>


                            <td>
                                ${escapeHTML(
                                    row.category ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    row.description ||
                                    "—"
                                )}
                            </td>


                            <td>

                                <span
                                    class="test-status-badge ${statusClass}"
                                >
                                    ${statusText}
                                </span>

                            </td>


                            <td>

                                <div
                                    class="test-action-group"
                                >

                                    <button
                                        type="button"
                                        class="test-action-btn"
                                        data-action="edit"
                                        data-id="${escapeHTML(
                                            row.id
                                        )}"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        type="button"
                                        class="test-action-btn"
                                        data-action="toggle"
                                        data-id="${escapeHTML(
                                            row.id
                                        )}"
                                    >
                                        ${toggleText}
                                    </button>

                                </div>

                            </td>

                        </tr>
                        `;

                    }
                )
                .join("");


        renderPagination();

    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    function updateStatistics() {

        const totalCount =
            get("testTotalCount");

        const activeCount =
            get("testActiveCount");


        const total =
            state.tests.length;


        const active =
            state.tests.filter(
                function (row) {

                    return Boolean(
                        row.is_active
                    );

                }
            ).length;


        if (totalCount) {

            totalCount.textContent =
                String(total);

        }


        if (activeCount) {

            activeCount.textContent =
                String(active);

        }


        loadAssignedCount();

    }


    /* =====================================================
       ASSIGNED TEST COUNT
    ===================================================== */

    async function loadAssignedCount() {

        const countElement =
            get("testAssignedCount");


        if (!countElement) {
            return;
        }


        try {

            const result =
                await state.supabase
                    .from(
                        HOSPITAL_TEST_TABLE
                    )
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    );


            if (
                result.error
            ) {

                console.warn(
                    "Assigned test count error:",
                    result.error
                );

                countElement.textContent =
                    "0";

                return;
            }


            countElement.textContent =
                String(
                    result.count || 0
                );


        } catch (error) {

            console.warn(
                "Assigned test count failed:",
                error
            );

            countElement.textContent =
                "0";
        }
    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        const container =
            get("testPagination");


        if (!container) {
            return;
        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filteredTests.length /
                    PAGE_SIZE
                )
            );


        if (
            totalPages <= 1
        ) {

            container.innerHTML = "";

            return;
        }


        let html = "";


        html += `
            <button
                type="button"
                class="test-page-btn"
                data-page="prev"
                ${state.currentPage === 1
                    ? "disabled"
                    : ""}
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
                    class="test-page-btn ${
                        page === state.currentPage
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
                class="test-page-btn"
                data-page="next"
                ${
                    state.currentPage === totalPages
                        ? "disabled"
                        : ""
                }
            >
                →
            </button>
        `;


        container.innerHTML =
            html;
    }


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    function openAddModal() {

        state.editingTestId =
            null;


        const modal =
            get("testModal");


        const form =
            get("testForm");


        const title =
            get("testModalTitle");


        const testId =
            get("testId");


        if (!modal || !form) {
            return;
        }


        if (title) {

            title.textContent =
                "Add Test";

        }


        form.reset();


        if (testId) {

            testId.value = "";

        }


        const activeCheckbox =
            get("testIsActive");


        if (activeCheckbox) {

            activeCheckbox.checked =
                true;

        }


        modal.hidden =
            false;


        const nameInput =
            get("testName");


        if (nameInput) {

            nameInput.focus();

        }
    }


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    function openEditModal(testId) {

        const row =
            state.tests.find(
                function (item) {

                    return item.id ===
                        testId;

                }
            );


        if (!row) {
            return;
        }


        state.editingTestId =
            row.id;


        const modal =
            get("testModal");


        if (!modal) {
            return;
        }


        const title =
            get("testModalTitle");


        const hiddenId =
            get("testId");


        const nameInput =
            get("testName");


        const nameBnInput =
            get("testNameBn");


        const categoryInput =
            get("testCategory");


        const descriptionInput =
            get("testDescription");


        const activeCheckbox =
            get("testIsActive");


        if (title) {

            title.textContent =
                "Edit Test";

        }


        if (hiddenId) {

            hiddenId.value =
                row.id || "";

        }


        if (nameInput) {

            nameInput.value =
                row.name || "";

        }


        if (nameBnInput) {

            nameBnInput.value =
                row.name_bn || "";

        }


        if (categoryInput) {

            categoryInput.value =
                row.category || "";

        }


        if (descriptionInput) {

            descriptionInput.value =
                row.description || "";

        }


        if (activeCheckbox) {

            activeCheckbox.checked =
                Boolean(
                    row.is_active
                );

        }


        modal.hidden =
            false;


        if (nameInput) {

            nameInput.focus();

        }
    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        const modal =
            get("testModal");


        const form =
            get("testForm");


        if (modal) {

            modal.hidden =
                true;

        }


        if (form) {

            form.reset();

        }


        const hiddenId =
            get("testId");


        if (hiddenId) {

            hiddenId.value =
                "";

        }


        state.editingTestId =
            null;

    }


    /* =====================================================
       VALIDATE FORM
    ===================================================== */

    function validateForm() {

        const name =
            cleanText(
                get("testName")
                    ? get("testName").value
                    : ""
            );


        const nameBn =
            cleanText(
                get("testNameBn")
                    ? get("testNameBn").value
                    : ""
            );


        if (!name) {

            showToast(
                "English Test name আবশ্যক।"
            );

            const input =
                get("testName");

            if (input) {
                input.focus();
            }

            return false;
        }


        if (!nameBn) {

            showToast(
                "বাংলা Test name আবশ্যক।"
            );

            const input =
                get("testNameBn");

            if (input) {
                input.focus();
            }

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
        excludeId
    ) {

        const normalizedName =
            cleanText(name)
                .toLocaleLowerCase();


        const normalizedNameBn =
            cleanText(nameBn)
                .toLocaleLowerCase();


        return state.tests.find(
            function (row) {

                if (
                    excludeId &&
                    row.id === excludeId
                ) {

                    return false;

                }


                const rowName =
                    cleanText(
                        row.name
                    )
                    .toLocaleLowerCase();


                const rowNameBn =
                    cleanText(
                        row.name_bn
                    )
                    .toLocaleLowerCase();


                return (
                    (
                        normalizedName &&
                        rowName ===
                            normalizedName
                    ) ||
                    (
                        normalizedNameBn &&
                        rowNameBn ===
                            normalizedNameBn
                    )
                );

            }
        ) || null;
    }


    /* =====================================================
       SAVE TEST
    ===================================================== */

    async function saveTest(event) {

        event.preventDefault();


        if (!canManageTests()) {

            showToast(
                "আপনার Test management permission নেই।"
            );

            return;
        }


        if (state.isSaving) {
            return;
        }


        if (!validateForm()) {
            return;
        }


        const name =
            cleanText(
                get("testName").value
            );


        const nameBn =
            cleanText(
                get("testNameBn").value
            );


        const category =
            cleanText(
                get("testCategory")
                    ? get("testCategory").value
                    : ""
            );


        const description =
            cleanText(
                get("testDescription")
                    ? get("testDescription").value
                    : ""
            );


        const isActive =
            get("testIsActive")
                ? Boolean(
                    get("testIsActive").checked
                )
                : true;


        const duplicate =
            findDuplicate(
                name,
                nameBn,
                state.editingTestId
            );


        if (duplicate) {

            showToast(
                "এই Test name ইতোমধ্যে আছে।"
            );

            return;
        }


        const payload = {

            name: name,

            name_bn: nameBn,

            category:
                category ||
                null,

            description:
                description ||
                null,

            is_active:
                isActive

        };


        state.isSaving =
            true;


        const saveButton =
            get("testSaveBtn");


        const originalText =
            saveButton
                ? saveButton.textContent
                : "Save Test";


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";

        }


        const editingId =
            state.editingTestId;


        try {

            let result;


            if (editingId) {

                result =
                    await state.supabase
                        .from(TEST_TABLE)
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            editingId
                        )
                        .select(
                            [
                                "id",
                                "name",
                                "name_bn",
                                "category",
                                "description",
                                "is_active",
                                "created_at"
                            ].join(",")
                        )
                        .single();

            } else {

                result =
                    await state.supabase
                        .from(TEST_TABLE)
                        .insert(
                            payload
                        )
                        .select(
                            [
                                "id",
                                "name",
                                "name_bn",
                                "category",
                                "description",
                                "is_active",
                                "created_at"
                            ].join(",")
                        )
                        .single();

            }


            if (result.error) {
                throw result.error;
            }


            if (!result.data) {

                throw new Error(
                    editingId
                        ? "Test update সফল হয়নি।"
                        : "Test insert সফল হয়নি।"
                );

            }


            closeModal();


            showToast(
                editingId
                    ? "Test সফলভাবে update হয়েছে।"
                    : "Test সফলভাবে যোগ হয়েছে।"
            );


            await loadTests();


        } catch (error) {

            console.error(
                "Test save/update error:",
                error
            );


            showToast(
                getErrorMessage(error)
            );


        } finally {

            state.isSaving =
                false;


            if (saveButton) {

                saveButton.disabled =
                    !canManageTests();

                saveButton.textContent =
                    originalText;

            }
        }
    }


    /* =====================================================
       TOGGLE STATUS
    ===================================================== */

    async function toggleTest(testId) {

        if (!canManageTests()) {

            showToast(
                "আপনার Test status পরিবর্তনের permission নেই।"
            );

            return;
        }


        const row =
            state.tests.find(
                function (item) {

                    return item.id ===
                        testId;

                }
            );


        if (!row) {
            return;
        }


        const nextStatus =
            !Boolean(
                row.is_active
            );


        try {

            const result =
                await state.supabase
                    .from(TEST_TABLE)
                    .update(
                        {
                            is_active:
                                nextStatus
                        }
                    )
                    .eq(
                        "id",
                        testId
                    )
                    .select(
                        "id,is_active"
                    )
                    .single();


            if (result.error) {
                throw result.error;
            }


            showToast(
                nextStatus
                    ? "Test activate হয়েছে।"
                    : "Test deactivate হয়েছে।"
            );


            await loadTests();


        } catch (error) {

            console.error(
                "Test status update error:",
                error
            );


            showToast(
                getErrorMessage(error)
            );
        }
    }


    /* =====================================================
       TABLE ACTIONS
    ===================================================== */

    function handleTableAction(event) {

        const button =
            event.target.closest(
                "button[data-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.dataset.action;


        const testId =
            button.dataset.id;


        if (
            action === "edit"
        ) {

            openEditModal(
                testId
            );

            return;
        }


        if (
            action === "toggle"
        ) {

            toggleTest(
                testId
            );

        }
    }


    /* =====================================================
       PAGINATION EVENTS
    ===================================================== */

    function handlePagination(event) {

        const button =
            event.target.closest(
                "button[data-page]"
            );


        if (!button) {
            return;
        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.filteredTests.length /
                    PAGE_SIZE
                )
            );


        const pageValue =
            button.dataset.page;


        if (
            pageValue === "prev"
        ) {

            state.currentPage =
                Math.max(
                    1,
                    state.currentPage - 1
                );

        } else if (
            pageValue === "next"
        ) {

            state.currentPage =
                Math.min(
                    totalPages,
                    state.currentPage + 1
                );

        } else {

            const page =
                Number(pageValue);


            if (
                Number.isFinite(page) &&
                page >= 1 &&
                page <= totalPages
            ) {

                state.currentPage =
                    page;

            }
        }


        renderTests();
    }


    /* =====================================================
       SEARCH / FILTER EVENTS
    ===================================================== */

    function handleSearchInput() {

        state.currentPage =
            1;

        applyFilters();
    }


    function handleFilterChange() {

        state.currentPage =
            1;

        applyFilters();
    }


    /* =====================================================
       MODAL ESCAPE
    ===================================================== */

    function handleEscape(event) {

        if (
            event.key !== "Escape"
        ) {

            return;
        }


        const modal =
            get("testModal");


        if (
            modal &&
            !modal.hidden
        ) {

            closeModal();

        }
    }


    /* =====================================================
       REFRESH
    ===================================================== */

    async function handleRefresh() {

        await loadTests();

        showToast(
            "Tests list refresh হয়েছে।"
        );
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function setupEvents() {

        const search =
            get("testSearch");

        const categoryFilter =
            get("testCategoryFilter");

        const statusFilter =
            get("testStatusFilter");

        const addButton =
            get("testAddBtn");

        const refreshButton =
            get("testRefresh");

        const modalClose =
            get("testModalClose");

        const cancelButton =
            get("testCancelBtn");

        const form =
            get("testForm");

        const tableBody =
            get("testTableBody");

        const pagination =
            get("testPagination");

        const sidebarToggle =
            get("sidebarToggle");

        const sidebarClose =
            get("sidebarClose");


        if (search) {

            search.addEventListener(
                "input",
                handleSearchInput
            );
        }


        if (categoryFilter) {

            categoryFilter.addEventListener(
                "change",
                handleFilterChange
            );
        }


        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                handleFilterChange
            );
        }


        if (addButton) {

            addButton.addEventListener(
                "click",
                openAddModal
            );
        }


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                handleRefresh
            );
        }


        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeModal
            );
        }


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );
        }


        if (form) {

            form.addEventListener(
                "submit",
                saveTest
            );
        }


        if (tableBody) {

            tableBody.addEventListener(
                "click",
                handleTableAction
            );
        }


        if (pagination) {

            pagination.addEventListener(
                "click",
                handlePagination
            );
        }


        if (sidebarToggle) {

            sidebarToggle.addEventListener(
                "click",
                function () {

                    const sidebar =
                        get("adminSidebar");


                    if (sidebar) {

                        sidebar.classList.add(
                            "open"
                        );

                    }

                }
            );
        }


        if (sidebarClose) {

            sidebarClose.addEventListener(
                "click",
                function () {

                    const sidebar =
                        get("adminSidebar");


                    if (sidebar) {

                        sidebar.classList.remove(
                            "open"
                        );

                    }

                }
            );
        }


        document.addEventListener(
            "keydown",
            handleEscape
        );
    }


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        try {

            initializeSupabase();

            setupEvents();

            applyPermissionUI();

            await loadTests();


        } catch (error) {

            console.error(
                "Tests page initialization error:",
                error
            );


            showToast(
                getErrorMessage(error)
            );
        }
    }


    /* =====================================================
       START
    ===================================================== */

    init();

})();
