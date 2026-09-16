/* =========================================================
   Dorkari — Tests & Fees Management

   PURPOSE
   ---------------------------------------------------------
   1. Manage master medical tests.
   2. Assign tests to hospitals.
   3. Store hospital-wise price.
   4. Store discount price.
   5. Store hospital-specific notes.
   6. Store hospital-specific availability.
   7. Search tests.
   8. Filter by category.
   9. Filter by active/inactive status.
   10. Pagination.
   11. Respect Dorkari admin permissions.

   DATABASE
   ---------------------------------------------------------
   tests
   hospital_tests
   hospitals
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const TEST_TABLE =
        "tests";

    const HOSPITAL_TABLE =
        "hospitals";

    const HOSPITAL_TEST_TABLE =
        "hospital_tests";

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

        tests:
            [],

        hospitals:
            [],

        assignments:
            [],

        filteredTests:
            [],

        currentPage:
            1,

        editingTestId:
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
       TOAST
    ===================================================== */

    function showToast(message) {

        const toast =
            get("testToast");

        const toastMessage =
            get("testToastMessage");


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
       ADMIN
    ===================================================== */

    function getAdmin() {

        return window.DorkariAdmin || null;

    }


    function canManageTests() {

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
       PERMISSION UI
    ===================================================== */

    function updatePermissionUI() {

        const allowed =
            canManageTests();


        const addButton =
            get("testAddBtn");

        const saveButton =
            get("testSaveBtn");

        const addAssignmentButton =
            get("testAddAssignmentBtn");


        if (addButton) {

            addButton.disabled =
                !allowed;

            addButton.title =
                allowed
                    ? "Add Test"
                    : "এই role-এর Test Management permission নেই";

        }


        if (saveButton) {

            saveButton.disabled =
                !allowed;

        }


        if (addAssignmentButton) {

            addAssignmentButton.disabled =
                !allowed;

        }

    }


    /* =====================================================
       LOAD TESTS
    ===================================================== */

    async function loadTests() {

        const tbody =
            get("testTableBody");


        if (tbody) {

            tbody.innerHTML =
                `
                <tr>
                    <td
                        colspan="5"
                        class="test-state-cell"
                    >
                        Loading tests...
                    </td>
                </tr>
                `;

        }


        const {
            data,
            error
        } =
            await state.supabase

                .from(
                    TEST_TABLE
                )

                .select(
                    `
                    id,
                    name,
                    name_bn,
                    category,
                    description,
                    is_active,
                    created_at
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


        state.tests =
            Array.isArray(data)
                ? data
                : [];


        state.currentPage =
            1;


        rebuildCategoryFilter();


        applyFilters();


        await loadAssignments();

    }


    /* =====================================================
       LOAD HOSPITALS
    ===================================================== */

    async function loadHospitals() {

        const {
            data,
            error
        } =
            await state.supabase

                .from(
                    HOSPITAL_TABLE
                )

                .select(
                    `
                    id,
                    name,
                    name_bn,
                    is_active
                    `
                )

                .order(
                    "name",
                    {
                        ascending:
                            true
                    }
                );


        if (error) {

            throw error;

        }


        state.hospitals =
            Array.isArray(data)
                ? data
                : [];

    }


    /* =====================================================
       LOAD HOSPITAL TEST ASSIGNMENTS
    ===================================================== */

    async function loadAssignments() {

        const {
            data,
            error
        } =
            await state.supabase

                .from(
                    HOSPITAL_TEST_TABLE
                )

                .select(
                    `
                    id,
                    test_id,
                    hospital_id,
                    price,
                    discount_price,
                    notes,
                    is_available
                    `
                );


        if (error) {

            throw error;

        }


        state.assignments =
            Array.isArray(data)
                ? data
                : [];


        renderStats();


        renderTable();

    }


    /* =====================================================
       STATS
    ===================================================== */

    function renderStats() {

        const total =
            state.tests.length;


        const active =
            state.tests.filter(
                function (test) {

                    return (
                        test.is_active ===
                        true
                    );

                }
            ).length;


        const assignedTestIds =
            new Set(

                state.assignments.map(
                    function (assignment) {

                        return assignment.test_id;

                    }
                )

            );


        const totalElement =
            get("testTotalCount");

        const activeElement =
            get("testActiveCount");

        const assignedElement =
            get("testAssignedCount");


        if (totalElement) {

            totalElement.textContent =
                String(total);

        }


        if (activeElement) {

            activeElement.textContent =
                String(active);

        }


        if (assignedElement) {

            assignedElement.textContent =
                String(
                    assignedTestIds.size
                );

        }

    }


    /* =====================================================
       CATEGORY FILTER OPTIONS
    ===================================================== */

    function rebuildCategoryFilter() {

        const select =
            get(
                "testCategoryFilter"
            );


        if (!select) {
            return;
        }


        const selected =
            select.value;


        const categories =
            Array.from(

                new Set(

                    state.tests

                        .map(
                            function (test) {

                                return cleanText(
                                    test.category
                                );

                            }
                        )

                        .filter(
                            Boolean
                        )

                )

            ).sort(
                function (a, b) {

                    return a.localeCompare(
                        b
                    );

                }
            );


        select.innerHTML =
            `
            <option value="">
                সব category
            </option>
            ` +

            categories.map(
                function (category) {

                    return (
                        '<option value="' +
                        escapeHTML(category) +
                        '">' +
                        escapeHTML(category) +
                        "</option>"
                    );

                }
            ).join("");


        if (
            categories.indexOf(
                selected
            ) !== -1
        ) {

            select.value =
                selected;

        }

    }


    /* =====================================================
       APPLY FILTERS
    ===================================================== */

    function applyFilters() {

        const search =
            cleanText(
                get("testSearch")?.value
            ).toLowerCase();


        const category =
            cleanText(
                get("testCategoryFilter")?.value
            );


        const status =
            cleanText(
                get("testStatusFilter")?.value
            );


        state.filteredTests =
            state.tests.filter(
                function (test) {

                    const haystack =
                        [
                            test.name,
                            test.name_bn,
                            test.category,
                            test.description
                        ]

                            .map(
                                function (value) {

                                    return cleanText(
                                        value
                                    ).toLowerCase();

                                }
                            )

                            .join(" ");


                    const searchMatch =
                        !search ||
                        haystack.includes(
                            search
                        );


                    const categoryMatch =
                        !category ||
                        cleanText(
                            test.category
                        ) === category;


                    const statusMatch =

                        !status ||

                        (
                            status ===
                                "active" &&

                            test.is_active ===
                                true
                        ) ||

                        (
                            status ===
                                "inactive" &&

                            test.is_active !==
                                true
                        );


                    return (

                        searchMatch &&

                        categoryMatch &&

                        statusMatch

                    );

                }
            );


        state.currentPage =
            1;


        renderTable();

    }


    /* =====================================================
       ASSIGNMENT COUNT
    ===================================================== */

    function getTestAssignmentCount(
        testId
    ) {

        return state.assignments.filter(
            function (assignment) {

                return (
                    assignment.test_id ===
                    testId
                );

            }
        ).length;

    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderTable() {

        const tbody =
            get(
                "testTableBody"
            );


        const resultCount =
            get(
                "testResultCount"
            );


        if (!tbody) {
            return;
        }


        const total =
            state.filteredTests.length;


        if (resultCount) {

            resultCount.textContent =
                total +
                (
                    total === 1
                        ? " test"
                        : " tests"
                );

        }


        if (total === 0) {

            tbody.innerHTML =
                `
                <tr>
                    <td
                        colspan="5"
                        class="test-state-cell"
                    >
                        কোনো Test পাওয়া যায়নি।
                    </td>
                </tr>
                `;


            renderPagination();


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


        state.currentPage =
            Math.min(
                Math.max(
                    1,
                    state.currentPage
                ),
                totalPages
            );


        const start =
            (
                state.currentPage -
                1
            ) *
            PAGE_SIZE;


        const pageRows =
            state.filteredTests.slice(
                start,
                start + PAGE_SIZE
            );


        tbody.innerHTML =
            pageRows.map(
                function (test) {

                    const assignmentCount =
                        getTestAssignmentCount(
                            test.id
                        );


                    const statusClass =
                        test.is_active ===
                        true

                            ? "active"
                            : "inactive";


                    const statusText =
                        test.is_active ===
                        true

                            ? "Active"
                            : "Inactive";


                    const toggleText =
                        test.is_active ===
                        true

                            ? "Deactivate"
                            : "Activate";


                    const description =
                        cleanText(
                            test.description
                        );


                    return `
                        <tr>

                            <td>

                                <div class="test-name-main">
                                    ${escapeHTML(
                                        test.name ||
                                        "—"
                                    )}
                                </div>

                                <div class="test-name-bn">
                                    ${escapeHTML(
                                        test.name_bn ||
                                        "—"
                                    )}
                                </div>

                                ${
                                    description
                                        ? `
                                            <div class="test-description">
                                                ${escapeHTML(
                                                    description
                                                )}
                                            </div>
                                        `
                                        : ""
                                }

                            </td>


                            <td>
                                ${escapeHTML(
                                    test.category ||
                                    "—"
                                )}
                            </td>


                            <td>

                                <span class="test-hospital-count">

                                    ${
                                        assignmentCount ===
                                        0

                                            ? "Not assigned"

                                            : assignmentCount +
                                              (
                                                  assignmentCount ===
                                                  1

                                                      ? " hospital"

                                                      : " hospitals"
                                              )
                                    }

                                </span>

                            </td>


                            <td>

                                <span class="test-status ${statusClass}">
                                    ${statusText}
                                </span>

                            </td>


                            <td>

                                <div class="test-actions">

                                    <button
                                        type="button"
                                        data-test-action="edit"
                                        data-test-id="${escapeHTML(
                                            test.id
                                        )}"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        type="button"
                                        data-test-action="toggle"
                                        data-test-id="${escapeHTML(
                                            test.id
                                        )}"
                                        ${
                                            canManageTests()
                                                ? ""
                                                : "disabled"
                                        }
                                    >
                                        ${toggleText}
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                }
            ).join("");


        renderPagination();

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        const pagination =
            get(
                "testPagination"
            );


        if (!pagination) {
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


        if (totalPages <= 1) {

            pagination.innerHTML =
                "";

            return;

        }


        let html =
            `
            <button
                type="button"
                data-page="prev"
                ${
                    state.currentPage === 1
                        ? "disabled"
                        : ""
                }
            >
                ←
            </button>
            `;


        for (
            let page = 1;
            page <= totalPages;
            page += 1
        ) {

            html +=
                `
                <button
                    type="button"
                    class="${
                        page ===
                        state.currentPage
                            ? "active"
                            : ""
                    }"
                    data-page="${page}"
                >
                    ${page}
                </button>
                `;

        }


        html +=
            `
            <button
                type="button"
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


        pagination.innerHTML =
            html;

    }


    /* =====================================================
       RESET MODAL
    ===================================================== */

    function resetModalForm() {

        const form =
            get(
                "testForm"
            );

        const testId =
            get(
                "testId"
            );

        const active =
            get(
                "testIsActive"
            );

        const title =
            get(
                "testModalTitle"
            );

        const saveButton =
            get(
                "testSaveBtn"
            );


        if (form) {

            form.reset();

        }


        if (testId) {

            testId.value =
                "";

        }


        if (active) {

            active.checked =
                true;

        }


        if (title) {

            title.textContent =
                "Add Test";

        }


        if (saveButton) {

            saveButton.textContent =
                "Save Test";

        }


        state.editingTestId =
            null;


        renderAssignmentRows(
            []
        );

    }


    /* =====================================================
       OPEN MODAL
    ===================================================== */

    function openModal(test) {

        if (!canManageTests()) {

            showToast(
                "এই role-এর Test Management permission নেই।"
            );

            return;

        }


        const modal =
            get(
                "testModal"
            );


        if (!modal) {

            showToast(
                "Test modal পাওয়া যায়নি।"
            );

            return;

        }


        resetModalForm();


        if (test) {

            state.editingTestId =
                test.id;


            get(
                "testId"
            ).value =
                test.id || "";


            get(
                "testName"
            ).value =
                test.name || "";


            get(
                "testNameBn"
            ).value =
                test.name_bn || "";


            get(
                "testCategory"
            ).value =
                test.category || "";


            get(
                "testDescription"
            ).value =
                test.description || "";


            get(
                "testIsActive"
            ).checked =
                test.is_active ===
                true;


            get(
                "testModalTitle"
            ).textContent =
                "Edit Test";


            get(
                "testSaveBtn"
            ).textContent =
                "Update Test";


            const existingAssignments =
                state.assignments.filter(
                    function (assignment) {

                        return (
                            assignment.test_id ===
                            test.id
                        );

                    }
                );


            renderAssignmentRows(
                existingAssignments
            );

        }


        modal.hidden =
            false;

        modal.classList.add(
            "is-open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        setTimeout(
            function () {

                const nameInput =
                    get(
                        "testName"
                    );

                if (nameInput) {

                    nameInput.focus();

                }

            },
            0
        );

    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        const modal =
            get(
                "testModal"
            );


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

        modal.hidden =
            true;

        document.body.style.overflow =
            "";


        resetModalForm();

    }


    /* =====================================================
       HOSPITAL OPTIONS
    ===================================================== */

    function makeHospitalOptions(
        selectedId
    ) {

        const selected =
            cleanText(
                selectedId
            );


        return (

            '<option value="">Select hospital</option>' +

            state.hospitals

                .map(
                    function (hospital) {

                        const label =
                            cleanText(
                                hospital.name_bn
                            ) ||
                            cleanText(
                                hospital.name
                            ) ||
                            "Hospital";


                        const english =
                            cleanText(
                                hospital.name
                            );


                        const inactive =
                            hospital.is_active ===
                            true

                                ? ""

                                : " (Inactive)";


                        const text =
                            english &&
                            label !== english

                                ? (
                                    english +
                                    " — " +
                                    label +
                                    inactive
                                )

                                : (
                                    label +
                                    inactive
                                );


                        const selectedAttr =
                            hospital.id ===
                            selected

                                ? " selected"

                                : "";


                        return (

                            '<option value="' +
                            escapeHTML(
                                hospital.id
                            ) +
                            '"' +
                            selectedAttr +
                            ">" +
                            escapeHTML(
                                text
                            ) +
                            "</option>"

                        );

                    }
                )

                .join("")

        );

    }


    /* =====================================================
       RENDER ASSIGNMENT ROWS
    ===================================================== */

    function renderAssignmentRows(
        rows
    ) {

        const container =
            get(
                "testAssignments"
            );


        if (!container) {
            return;
        }


        const list =
            Array.isArray(rows)
                ? rows
                : [];


        container.innerHTML =
            "";


        if (list.length === 0) {

            const emptyElement =
                document.createElement(
                    "div"
                );


            emptyElement.className =
                "test-assignment-empty";


            emptyElement.id =
                "testAssignmentEmpty";


            emptyElement.textContent =
                "এখনো কোনো hospital assignment যোগ করা হয়নি।";


            container.appendChild(
                emptyElement
            );


            return;

        }


        list.forEach(
            function (row, index) {

                container.appendChild(

                    createAssignmentRow(
                        row,
                        index
                    )

                );

            }
        );

    }


    /* =====================================================
       CREATE ASSIGNMENT ROW
    ===================================================== */

    function createAssignmentRow(
        row,
        index
    ) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "test-assignment-row";


        wrapper.dataset.assignmentIndex =
            String(index);


        wrapper.innerHTML =
            `
            <div class="test-assignment-row-head">

                <strong>
                    Hospital Fee #${index + 1}
                </strong>

                <div class="test-assignment-row-actions">

                    <button
                        type="button"
                        class="test-danger"
                        data-remove-assignment="true"
                    >
                        Remove
                    </button>

                </div>

            </div>


            <div class="test-assignment-row-grid">

                <div class="test-field test-field-full">

                    <label>
                        Hospital *
                    </label>

                    <select data-assignment-field="hospital_id">
                        ${makeHospitalOptions(
                            row?.hospital_id ||
                            ""
                        )}
                    </select>

                </div>


                <div class="test-field">

                    <label>
                        Price (৳) *
                    </label>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-assignment-field="price"
                        value="${escapeHTML(
                            row?.price ??
                            0
                        )}"
                    >

                </div>


                <div class="test-field">

                    <label>
                        Discount Price (৳)
                    </label>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-assignment-field="discount_price"
                        value="${escapeHTML(
                            row?.discount_price ??
                            ""
                        )}"
                    >

                </div>


                <div class="test-field test-field-full">

                    <label>
                        Notes
                    </label>

                    <textarea
                        rows="2"
                        data-assignment-field="notes"
                        placeholder="Optional fee note..."
                    >${escapeHTML(
                        row?.notes ||
                        ""
                    )}</textarea>

                </div>

            </div>


            <div class="test-assignment-row-actions">

                <label class="test-assignment-available">

                    <input
                        type="checkbox"
                        data-assignment-field="is_available"
                        ${
                            row?.is_available !==
                            false
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Available at this hospital
                    </span>

                </label>

            </div>
            `;


        const removeButton =
            wrapper.querySelector(
                '[data-remove-assignment="true"]'
            );


        if (removeButton) {

            removeButton.addEventListener(
                "click",
                function () {

                    wrapper.remove();

                    ensureAssignmentEmptyState();

                }
            );

        }


        return wrapper;

    }


    /* =====================================================
       EMPTY ASSIGNMENT STATE
    ===================================================== */

    function ensureAssignmentEmptyState() {

        const container =
            get(
                "testAssignments"
            );


        if (!container) {
            return;
        }


        if (
            container.querySelector(
                ".test-assignment-row"
            )
        ) {

            return;

        }


        renderAssignmentRows(
            []
        );

    }


    /* =====================================================
       ADD ASSIGNMENT ROW
    ===================================================== */

    function addAssignmentRow() {

        if (!canManageTests()) {

            showToast(
                "এই role-এর Test Management permission নেই।"
            );

            return;

        }


        const container =
            get(
                "testAssignments"
            );


        if (!container) {
            return;
        }


        const existingRows =
            container.querySelectorAll(
                ".test-assignment-row"
            );


        const row =
            createAssignmentRow(
                {
                    hospital_id:
                        "",

                    price:
                        0,

                    discount_price:
                        "",

                    notes:
                        "",

                    is_available:
                        true

                },
                existingRows.length
            );


        const empty =
            get(
                "testAssignmentEmpty"
            );


        if (empty) {

            empty.remove();

        }


        container.appendChild(
            row
        );


        const select =
            row.querySelector(
                '[data-assignment-field="hospital_id"]'
            );


        if (select) {

            select.focus();

        }

    }


    /* =====================================================
       COLLECT ASSIGNMENTS
    ===================================================== */

    function collectAssignmentsFromForm() {

        const container =
            get(
                "testAssignments"
            );


        if (!container) {
            return [];
        }


        const rows =
            Array.from(
                container.querySelectorAll(
                    ".test-assignment-row"
                )
            );


        const seenHospitals =
            new Set();


        const assignments =
            [];


        for (
            let i = 0;
            i < rows.length;
            i += 1
        ) {

            const row =
                rows[i];


            const hospitalId =
                cleanText(
                    row.querySelector(
                        '[data-assignment-field="hospital_id"]'
                    )?.value
                );


            const priceRaw =
                cleanText(
                    row.querySelector(
                        '[data-assignment-field="price"]'
                    )?.value
                );


            const discountRaw =
                cleanText(
                    row.querySelector(
                        '[data-assignment-field="discount_price"]'
                    )?.value
                );


            const notes =
                cleanText(
                    row.querySelector(
                        '[data-assignment-field="notes"]'
                    )?.value
                );


            const isAvailable =
                row.querySelector(
                    '[data-assignment-field="is_available"]'
                )?.checked !==
                false;


            if (!hospitalId) {

                throw new Error(
                    "Hospital Fee row #" +
                    (i + 1) +
                    "-এ hospital নির্বাচন করুন।"
                );

            }


            if (
                seenHospitals.has(
                    hospitalId
                )
            ) {

                throw new Error(
                    "একটি test-এর জন্য একই hospital একাধিকবার assign করা যাবে না।"
                );

            }


            const price =
                priceRaw === ""
                    ? 0
                    : Number(
                        priceRaw
                    );


            const discountPrice =
                discountRaw === ""
                    ? null
                    : Number(
                        discountRaw
                    );


            if (
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                throw new Error(
                    "Hospital Fee row #" +
                    (i + 1) +
                    "-এর price সঠিক নয়।"
                );

            }


            if (

                discountPrice !== null &&

                (
                    !Number.isFinite(
                        discountPrice
                    ) ||

                    discountPrice < 0 ||

                    discountPrice > price
                )

            ) {

                throw new Error(
                    "Hospital Fee row #" +
                    (i + 1) +
                    "-এর discount price সঠিক নয়।"
                );

            }


            seenHospitals.add(
                hospitalId
            );


            assignments.push(
                {

                    hospital_id:
                        hospitalId,

                    price:
                        price,

                    discount_price:
                        discountPrice,

                    notes:
                        notes ||
                        null,

                    is_available:
                        isAvailable

                }
            );

        }


        return assignments;

    }


    /* =====================================================
       VALIDATE TEST
    ===================================================== */

    function validateTestForm() {

        const name =
            cleanText(
                get("testName")?.value
            );


        const nameBn =
            cleanText(
                get("testNameBn")?.value
            );


        if (!name) {

            showToast(
                "English Test Name দিন।"
            );


            get(
                "testName"
            )?.focus();


            return false;

        }


        if (!nameBn) {

            showToast(
                "বাংলা Test Name দিন।"
            );


            get(
                "testNameBn"
            )?.focus();


            return false;

        }


        return true;

    }


    /* =====================================================
       DUPLICATE TEST CHECK
    ===================================================== */

    function findDuplicateTest(
        name,
        nameBn,
        editingId
    ) {

        const nameLower =
            name.toLowerCase();


        const nameBnLower =
            nameBn.toLowerCase();


        return (

            state.tests.find(
                function (test) {

                    if (
                        editingId &&
                        test.id ===
                            editingId
                    ) {

                        return false;

                    }


                    const existingName =
                        cleanText(
                            test.name
                        ).toLowerCase();


                    const existingNameBn =
                        cleanText(
                            test.name_bn
                        ).toLowerCase();


                    return (

                        existingName ===
                            nameLower ||

                        existingNameBn ===
                            nameBnLower

                    );

                }
            ) ||

            null

        );

    }


    /* =====================================================
       REPLACE HOSPITAL ASSIGNMENTS
    ===================================================== */

    async function replaceHospitalAssignments(
        testId,
        newAssignments
    ) {

        const oldRows =
            state.assignments.filter(
                function (assignment) {

                    return (
                        assignment.test_id ===
                        testId
                    );

                }
            );


        const {
            error: deleteError
        } =
            await state.supabase

                .from(
                    HOSPITAL_TEST_TABLE
                )

                .delete()

                .eq(
                    "test_id",
                    testId
                );


        if (deleteError) {

            throw deleteError;

        }


        if (
            !newAssignments.length
        ) {

            return;

        }


        const payload =
            newAssignments.map(
                function (assignment) {

                    return {

                        test_id:
                            testId,

                        hospital_id:
                            assignment.hospital_id,

                        price:
                            assignment.price,

                        discount_price:
                            assignment.discount_price,

                        notes:
                            assignment.notes,

                        is_available:
                            assignment.is_available

                    };

                }
            );


        const {
            error: insertError
        } =
            await state.supabase

                .from(
                    HOSPITAL_TEST_TABLE
                )

                .insert(
                    payload
                );


        if (!insertError) {

            return;

        }


        /*
         * Roll back old hospital fee
         * records if replacement fails.
         */

        if (
            oldRows.length
        ) {

            const rollbackPayload =
                oldRows.map(
                    function (row) {

                        return {

                            test_id:
                                row.test_id,

                            hospital_id:
                                row.hospital_id,

                            price:
                                row.price ??
                                0,

                            discount_price:
                                row.discount_price ??
                                null,

                            notes:
                                row.notes ??
                                null,

                            is_available:
                                row.is_available !==
                                false

                        };

                    }
                );


            const {
                error:
                    rollbackError
            } =
                await state.supabase

                    .from(
                        HOSPITAL_TEST_TABLE
                    )

                    .insert(
                        rollbackPayload
                    );


            if (rollbackError) {

                console.error(
                    "Hospital fee rollback failed:",
                    rollbackError
                );

            }

        }


        throw insertError;

    }


    /* =====================================================
       SAVE TEST
    ===================================================== */

    async function saveTest(
        event
    ) {

        event.preventDefault();


        if (!canManageTests()) {

            showToast(
                "এই role-এর Test Management permission নেই।"
            );

            return;

        }


        if (state.isSaving) {
            return;
        }


        if (!validateTestForm()) {
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
                get("testCategory").value
            );


        const description =
            cleanText(
                get("testDescription").value
            );


        const isActive =
            get(
                "testIsActive"
            ).checked;


        const editingId =
            state.editingTestId;


        const duplicate =
            findDuplicateTest(
                name,
                nameBn,
                editingId
            );


        if (duplicate) {

            showToast(

                cleanText(
                    duplicate.name
                ).toLowerCase() ===
                    name.toLowerCase()

                    ? "এই Test name ইতোমধ্যে আছে।"

                    : "এই বাংলা Test name ইতোমধ্যে আছে।"

            );


            return;

        }


        let assignments;


        try {

            assignments =
                collectAssignmentsFromForm();

        } catch (error) {

            showToast(
                getErrorMessage(
                    error
                )
            );


            return;

        }


        state.isSaving =
            true;


        const saveButton =
            get(
                "testSaveBtn"
            );


        if (saveButton) {

            saveButton.disabled =
                true;


            saveButton.textContent =
                editingId
                    ? "Updating..."
                    : "Saving...";

        }


        try {

            const payload = {

                name:
                    name,

                name_bn:
                    nameBn,

                category:
                    category ||
                    null,

                description:
                    description ||
                    null,

                is_active:
                    isActive

            };


            let savedId =
                editingId;


            /*
             * UPDATE
             */

            if (editingId) {

                const {
                    error
                } =
                    await state.supabase

                        .from(
                            TEST_TABLE
                        )

                        .update(
                            payload
                        )

                        .eq(
                            "id",
                            editingId
                        );


                if (error) {
                    throw error;
                }


                await replaceHospitalAssignments(
                    editingId,
                    assignments
                );


                showToast(
                    "Test সফলভাবে update হয়েছে।"
                );

            }


            /*
             * INSERT
             */

            else {

                const {
                    data,
                    error
                } =
                    await state.supabase

                        .from(
                            TEST_TABLE
                        )

                        .insert(
                            payload
                        )

                        .select(
                            "id"
                        )

                        .single();


                if (error) {
                    throw error;
                }


                if (
                    !data?.id
                ) {

                    throw new Error(
                        "Test save হয়েছে, কিন্তু Test ID পাওয়া যায়নি।"
                    );

                }


                savedId =
                    data.id;


                if (
                    assignments.length
                ) {

                    try {

                        await replaceHospitalAssignments(
                            savedId,
                            assignments
                        );

                    } catch (
                        assignmentError
                    ) {

                        try {

                            await state.supabase

                                .from(
                                    TEST_TABLE
                                )

                                .delete()

                                .eq(
                                    "id",
                                    savedId
                                );

                        } catch (
                            cleanupError
                        ) {

                            console.error(
                                "New test cleanup failed:",
                                cleanupError
                            );

                        }


                        throw assignmentError;

                    }

                }


                showToast(
                    "Test সফলভাবে যোগ হয়েছে।"
                );

            }


            closeModal();


            await loadTests();

        } catch (error) {

            console.error(
                "Test Save Error:",
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
                    !canManageTests();


                saveButton.textContent =
                    "Save Test";

            }

        }

    }


    /* =====================================================
       TOGGLE TEST
    ===================================================== */

    async function toggleTest(
        testId
    ) {

        if (!canManageTests()) {

            showToast(
                "এই role-এর Test Management permission নেই।"
            );

            return;

        }


        const test =
            state.tests.find(
                function (item) {

                    return (
                        item.id ===
                        testId
                    );

                }
            );


        if (!test) {

            showToast(
                "Test পাওয়া যায়নি।"
            );

            return;

        }


        const nextStatus =
            test.is_active !==
            true;


        const {
            error
        } =
            await state.supabase

                .from(
                    TEST_TABLE
                )

                .update(
                    {
                        is_active:
                            nextStatus
                    }
                )

                .eq(
                    "id",
                    testId
                );


        if (error) {

            console.error(
                "Test Status Error:",
                error
            );


            showToast(
                getErrorMessage(
                    error
                )
            );


            return;

        }


        showToast(

            nextStatus

                ? "Test activate হয়েছে।"

                : "Test deactivate হয়েছে।"

        );


        await loadTests();

    }


    /* =====================================================
       TABLE CLICK
    ===================================================== */

    function handleTableClick(
        event
    ) {

        const button =
            event.target.closest(
                "button[data-test-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.getAttribute(
                "data-test-action"
            );


        const testId =
            button.getAttribute(
                "data-test-id"
            );


        const test =
            state.tests.find(
                function (item) {

                    return (
                        item.id ===
                        testId
                    );

                }
            );


        if (
            action ===
            "edit"
        ) {

            openModal(
                test ||
                null
            );


            return;

        }


        if (
            action ===
            "toggle"
        ) {

            toggleTest(
                testId
            );

        }

    }


    /* =====================================================
       PAGINATION CLICK
    ===================================================== */

    function handlePagination(
        event
    ) {

        const button =
            event.target.closest(
                "button[data-page]"
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
                    state.filteredTests.length /
                    PAGE_SIZE
                )
            );


        const value =
            button.getAttribute(
                "data-page"
            );


        if (
            value ===
            "prev"
        ) {

            state.currentPage -=
                1;

        }


        else if (
            value ===
            "next"
        ) {

            state.currentPage +=
                1;

        }


        else {

            state.currentPage =
                Number(
                    value
                ) || 1;

        }


        state.currentPage =
            Math.min(
                Math.max(
                    1,
                    state.currentPage
                ),
                totalPages
            );


        renderTable();

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
                "is-open"
            );

        }


        if (overlay) {

            overlay.classList.add(
                "is-open"
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
                "is-open"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "is-open"
            );

        }

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        const addButton =
            get(
                "testAddBtn"
            );


        const refreshButton =
            get(
                "testRefresh"
            );


        const closeButton =
            get(
                "testModalClose"
            );


        const cancelButton =
            get(
                "testCancelBtn"
            );


        const form =
            get(
                "testForm"
            );


        const tableBody =
            get(
                "testTableBody"
            );


        const pagination =
            get(
                "testPagination"
            );


        const search =
            get(
                "testSearch"
            );


        const categoryFilter =
            get(
                "testCategoryFilter"
            );


        const statusFilter =
            get(
                "testStatusFilter"
            );


        const assignmentButton =
            get(
                "testAddAssignmentBtn"
            );


        const sidebarToggle =
            get(
                "sidebarToggle"
            );


        const sidebarClose =
            get(
                "sidebarClose"
            );


        const sidebarOverlay =
            get(
                "sidebarOverlay"
            );


        const sidebarLogout =
            get(
                "sidebarLogout"
            );


        const modal =
            get(
                "testModal"
            );


        /* -------------------------------------------------
           ADD TEST
        ------------------------------------------------- */

        if (addButton) {

            addButton.addEventListener(
                "click",
                function () {

                    openModal(
                        null
                    );

                }
            );

        }


        /* -------------------------------------------------
           REFRESH
        ------------------------------------------------- */

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                function () {

                    loadTests()
                        .catch(
                            function (error) {

                                console.error(
                                    "Test refresh failed:",
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

        }


        /* -------------------------------------------------
           MODAL CLOSE
        ------------------------------------------------- */

        if (closeButton) {

            closeButton.addEventListener(
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


        /* -------------------------------------------------
           TABLE
        ------------------------------------------------- */

        if (tableBody) {

            tableBody.addEventListener(
                "click",
                handleTableClick
            );

        }


        /* -------------------------------------------------
           PAGINATION
        ------------------------------------------------- */

        if (pagination) {

            pagination.addEventListener(
                "click",
                handlePagination
            );

        }


        /* -------------------------------------------------
           ADD HOSPITAL FEE
        ------------------------------------------------- */

        if (assignmentButton) {

            assignmentButton.addEventListener(
                "click",
                addAssignmentRow
            );

        }


        /* -------------------------------------------------
           SEARCH
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           CATEGORY
        ------------------------------------------------- */

        if (
            categoryFilter
        ) {

            categoryFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        /* -------------------------------------------------
           STATUS
        ------------------------------------------------- */

        if (
            statusFilter
        ) {

            statusFilter.addEventListener(
                "change",
                function () {

                    state.currentPage =
                        1;

                    applyFilters();

                }
            );

        }


        /* -------------------------------------------------
           MODAL BACKDROP
        ------------------------------------------------- */

        if (modal) {

            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target &&
                        event.target.getAttribute(
                            "data-close-modal"
                        ) ===
                            "true"
                    ) {

                        closeModal();

                    }

                }
            );

        }


        /* -------------------------------------------------
           SIDEBAR
        ------------------------------------------------- */

        if (
            sidebarToggle
        ) {

            sidebarToggle.addEventListener(
                "click",
                openSidebar
            );

        }


        if (
            sidebarClose
        ) {

            sidebarClose.addEventListener(
                "click",
                closeSidebar
            );

        }


        if (
            sidebarOverlay
        ) {

            sidebarOverlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        /* -------------------------------------------------
           LOGOUT
        ------------------------------------------------- */

        if (
            sidebarLogout
        ) {

            sidebarLogout.addEventListener(
                "click",
                function () {

                    const admin =
                        getAdmin();


                    if (
                        admin &&
                        typeof admin.logout ===
                            "function"
                    ) {

                        admin.logout();

                    }

                }
            );

        }


        /* -------------------------------------------------
           ESCAPE
        ------------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                const currentModal =
                    get(
                        "testModal"
                    );


                if (
                    currentModal &&
                    currentModal.getAttribute(
                        "aria-hidden"
                    ) ===
                        "false"
                ) {

                    closeModal();


                    return;

                }


                closeSidebar();

            }
        );

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
             * Wait until admin guard has
             * verified the current profile.
             */

            await waitForAdminSystem();


            state.profile =
                getAdmin().getProfile();


            /*
             * Use the existing verified
             * Supabase client.
             */

            initializeSupabase();


            /*
             * Events must be attached
             * before any data loading.
             */

            bindEvents();


            updatePermissionUI();


            /*
             * Guarantee closed state
             * before page rendering.
             */

            closeModal();


            /*
             * Load both independent
             * datasets.
             */

            await Promise.all(
                [

                    loadHospitals(),

                    loadTests()

                ]
            );


            state.initialized =
                true;


            console.log(
                "Dorkari Tests & Fees Management ready."
            );

        } catch (error) {

            console.error(
                "Tests & Fees initialization failed:",
                error
            );


            updatePermissionUI();


            showToast(
                getErrorMessage(
                    error
                )
            );

        }

    }


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


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.DorkariTest = {

        refresh:
            function () {

                return loadTests();

            },


        getTests:
            function () {

                return [
                    ...state.tests
                ];

            },


        getFilteredTests:
            function () {

                return [
                    ...state.filteredTests
                ];

            },


        openAddForm:
            function () {

                openModal(
                    null
                );

            },


        closeForm:
            closeModal

    };


    /* =====================================================
       RUN
    ===================================================== */

    start();


})();
