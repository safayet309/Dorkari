// =========================================================
// Dorkari — Admin Dashboard
// 2.8 Part F — Part 2
// Real Supabase Statistics + Division Overview
// =========================================================

(function () {

    "use strict";


    // =====================================================
    // CONFIG CHECK
    // =====================================================

    if (
        typeof DORKARI_CONFIG === "undefined" ||
        !DORKARI_CONFIG.SUPABASE ||
        !DORKARI_CONFIG.SUPABASE.URL ||
        !DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
    ) {

        console.error(
            "Dorkari Dashboard: Supabase configuration missing."
        );

        return;
    }


    // =====================================================
    // SUPABASE CHECK
    // =====================================================

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Dorkari Dashboard: Supabase library not loaded."
        );

        return;
    }


    // =====================================================
    // SUPABASE CLIENT
    // =====================================================

    let supabaseClient = null;


    // =====================================================
    // TABLE NAMES
    // =====================================================

    const TABLES = {

        divisions: "divisions",

        districts: "districts",

        upazilas: "upazilas",

        categories: "categories",

        emergencyContacts: "emergency_contacts",

        hospitals: "hospitals",

        doctors: "doctors",

        ambulances: "ambulances",

        policeStations: "police_stations",

        governmentOffices: "government_offices",

        bloodBanks: "blood_banks",

        pharmacies: "pharmacies",

        tests: "tests"

    };


    // =====================================================
    // DASHBOARD STATE
    // =====================================================

    let dashboardStats = {

        totalRecords: 0,

        hospitals: 0,

        doctors: 0,

        emergency: 0,

        ambulances: 0,

        policeStations: 0,

        governmentOffices: 0,

        bloodBanks: 0,

        pharmacies: 0,

        tests: 0,

        divisions: 0,

        districts: 0,

        upazilas: 0

    };


    let categoryData = [];

    let isLoading = false;


    // =====================================================
    // DOM HELPER
    // =====================================================

    function getElement(id) {

        return document.getElementById(id);

    }


    // =====================================================
    // NUMBER FORMAT
    // =====================================================

    function formatNumber(value) {

        const number =
            Number(value) || 0;


        return number.toLocaleString(
            "bn-BD"
        );
    }


    // =====================================================
    // SET TEXT
    // =====================================================

    function setText(
        id,
        value
    ) {

        const element =
            getElement(id);


        if (!element) {
            return;
        }


        element.textContent =
            value;
    }


    // =====================================================
    // SET NUMBER
    // =====================================================

    function setNumber(
        id,
        value
    ) {

        setText(
            id,
            formatNumber(value)
        );
    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

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


    // =====================================================
    // SHOW LOADING
    // =====================================================

    function showLoadingState() {

        const statIds = [

            "statTotalRecords",

            "statHospitals",

            "statDoctors",

            "statEmergency",

            "statAmbulances",

            "statDivisions",

            "statDistricts",

            "statUpazilas"

        ];


        statIds.forEach(
            function (id) {

                setText(
                    id,
                    "…"
                );

            }
        );


        setText(
            "statTotalStatus",
            "Database থেকে তথ্য আসছে..."
        );


        setText(
            "lastRefresh",
            "Updating..."
        );


        const divisionContainer =
            getElement(
                "divisionOverview"
            );


        if (divisionContainer) {

            divisionContainer.innerHTML = `
                <div class="category-loading">
                    বিভাগভিত্তিক তথ্য লোড হচ্ছে...
                </div>
            `;
        }
    }


    // =====================================================
    // SHOW ERROR STATE
    // =====================================================

    function showErrorState(
        message
    ) {

        setText(
            "statTotalRecords",
            "—"
        );


        setText(
            "statHospitals",
            "—"
        );


        setText(
            "statDoctors",
            "—"
        );


        setText(
            "statEmergency",
            "—"
        );


        setText(
            "statAmbulances",
            "—"
        );


        setText(
            "statDivisions",
            "—"
        );


        setText(
            "statDistricts",
            "—"
        );


        setText(
            "statUpazilas",
            "—"
        );


        setText(
            "statTotalStatus",
            "তথ্য লোড করা যায়নি"
        );


        setText(
            "lastRefresh",
            "Update failed"
        );


        const divisionContainer =
            getElement(
                "divisionOverview"
            );


        if (divisionContainer) {

            divisionContainer.innerHTML = `
                <div class="category-error">
                    বিভাগভিত্তিক তথ্য লোড করা যায়নি।
                </div>
            `;
        }


        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.showToast ===
                "function"
        ) {

            window.DorkariAdmin.showToast(
                message ||
                "Dashboard data load করা যায়নি।"
            );
        }
    }


    // =====================================================
    // COUNT ACTIVE RECORDS
    // =====================================================

    async function countActive(
        table
    ) {

        const {
            count,
            error
        } =
            await supabaseClient
                .from(table)
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
                );


        if (error) {

            throw error;

        }


        return Number(
            count || 0
        );
    }


    // =====================================================
    // LOAD LOCATION COUNTS
    // =====================================================

    async function loadLocationCounts() {

        const results =
            await Promise.all([

                countActive(
                    TABLES.divisions
                ),

                countActive(
                    TABLES.districts
                ),

                countActive(
                    TABLES.upazilas
                )

            ]);


        dashboardStats.divisions =
            results[0];


        dashboardStats.districts =
            results[1];


        dashboardStats.upazilas =
            results[2];
    }


    // =====================================================
    // LOAD SERVICE COUNTS
    // =====================================================

    async function loadServiceCounts() {

        const results =
            await Promise.all([

                countActive(
                    TABLES.hospitals
                ),

                countActive(
                    TABLES.doctors
                ),

                countActive(
                    TABLES.emergencyContacts
                ),

                countActive(
                    TABLES.ambulances
                ),

                countActive(
                    TABLES.policeStations
                ),

                countActive(
                    TABLES.governmentOffices
                ),

                countActive(
                    TABLES.bloodBanks
                ),

                countActive(
                    TABLES.pharmacies
                ),

                countActive(
                    TABLES.tests
                )

            ]);


        dashboardStats.hospitals =
            results[0];


        dashboardStats.doctors =
            results[1];


        dashboardStats.emergency =
            results[2];


        dashboardStats.ambulances =
            results[3];


        dashboardStats.policeStations =
            results[4];


        dashboardStats.governmentOffices =
            results[5];


        dashboardStats.bloodBanks =
            results[6];


        dashboardStats.pharmacies =
            results[7];


        dashboardStats.tests =
            results[8];


        dashboardStats.totalRecords =

            dashboardStats.hospitals +

            dashboardStats.doctors +

            dashboardStats.emergency +

            dashboardStats.ambulances +

            dashboardStats.policeStations +

            dashboardStats.governmentOffices +

            dashboardStats.bloodBanks +

            dashboardStats.pharmacies +

            dashboardStats.tests +

            dashboardStats.divisions +

            dashboardStats.districts +

            dashboardStats.upazilas;
    }


    // =====================================================
    // RENDER STATISTICS
    // =====================================================

    function renderStatistics() {

        // ================================================
        // TOTAL RECORDS
        // ================================================

        setNumber(
            "statTotalRecords",
            dashboardStats.totalRecords
        );


        setText(
            "statTotalStatus",
            "Active database records"
        );


        // ================================================
        // SERVICES
        // ================================================

        setNumber(
            "statHospitals",
            dashboardStats.hospitals
        );


        setNumber(
            "statDoctors",
            dashboardStats.doctors
        );


        setNumber(
            "statEmergency",
            dashboardStats.emergency
        );


        setNumber(
            "statAmbulances",
            dashboardStats.ambulances
        );


        // ================================================
        // LOCATION
        // ================================================

        setNumber(
            "statDivisions",
            dashboardStats.divisions
        );


        setNumber(
            "statDistricts",
            dashboardStats.districts
        );


        setNumber(
            "statUpazilas",
            dashboardStats.upazilas
        );
    }


    // =====================================================
    // LOAD EMERGENCY CATEGORIES
    // =====================================================

    async function loadCategoryOverview() {

        const {
            data: categories,
            error: categoriesError
        } =
            await supabaseClient
                .from(
                    TABLES.categories
                )
                .select(
                    "id,name,name_bn,sort_order"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "sort_order",
                    {
                        ascending: true
                    }
                );


        if (categoriesError) {

            throw categoriesError;

        }


        const {
            data: contacts,
            error: contactsError
        } =
            await supabaseClient
                .from(
                    TABLES.emergencyContacts
                )
                .select(
                    "id,category_id"
                )
                .eq(
                    "is_active",
                    true
                );


        if (contactsError) {

            throw contactsError;

        }


        const categoryRows =
            Array.isArray(categories)
                ? categories
                : [];


        const contactRows =
            Array.isArray(contacts)
                ? contacts
                : [];


        const categoryMap = {};


        categoryRows.forEach(
            function (category) {

                categoryMap[
                    category.id
                ] = {

                    id:
                        category.id,

                    name:
                        category.name,

                    name_bn:
                        category.name_bn,

                    count:
                        0

                };

            }
        );


        contactRows.forEach(
            function (contact) {

                if (
                    contact.category_id &&
                    categoryMap[
                        contact.category_id
                    ]
                ) {

                    categoryMap[
                        contact.category_id
                    ].count++;

                }

            }
        );


        categoryData =
            Object.values(
                categoryMap
            );


        // ================================================
        // UNCATEGORIZED
        // ================================================

        const uncategorized =
            contactRows.filter(
                function (contact) {

                    return (
                        !contact.category_id ||
                        !categoryMap[
                            contact.category_id
                        ]
                    );

                }
            ).length;


        if (
            uncategorized > 0
        ) {

            categoryData.push({

                id:
                    "uncategorized",

                name:
                    "Other",

                name_bn:
                    "অন্যান্য",

                count:
                    uncategorized

            });
        }


        // ================================================
        // SORT BY COUNT
        // ================================================

        categoryData.sort(
            function (a, b) {

                return (
                    b.count -
                    a.count
                );

            }
        );


        renderCategoryOverview();
    }


    // =====================================================
    // RENDER CATEGORY OVERVIEW
    // =====================================================

    function renderCategoryOverview() {

        const container =
            getElement(
                "categoryOverview"
            );


        if (!container) {
            return;
        }


        if (
            categoryData.length === 0
        ) {

            container.innerHTML = `
                <div class="category-loading">
                    এখনো কোনো emergency category data নেই।
                </div>
            `;

            return;
        }


        container.innerHTML =
            categoryData
                .map(
                    function (category) {

                        return `
                            <div class="category-card">

                                <div class="category-info">

                                    <span class="category-name">
                                        ${escapeHTML(
                                            category.name_bn ||
                                            category.name ||
                                            "অন্যান্য"
                                        )}
                                    </span>

                                    ${
                                        category.name &&
                                        category.name_bn &&
                                        category.name !==
                                            category.name_bn
                                            ? `
                                                <span class="category-name-bn">
                                                    ${escapeHTML(
                                                        category.name
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>

                                <strong class="category-count">
                                    ${formatNumber(
                                        category.count
                                    )}
                                </strong>

                            </div>
                        `;

                    }
                )
                .join("");
    }


    // =====================================================
    // F-4.2 — DISTRICT OVERVIEW
    // =====================================================

    async function loadDistrictOverview() {

        const container =
            document.getElementById(
                "districtOverview"
            );


        if (!container) {
            return;
        }


        container.innerHTML = `
            <div class="category-loading">
                জেলাভিত্তিক তথ্য লোড হচ্ছে...
            </div>
        `;


        try {

            // ---------------------------------------------
            // Load active districts
            // ---------------------------------------------

            const {
                data: districts,
                error: districtError
            } =
                await supabaseClient
                    .from(
                        TABLES.districts
                    )
                    .select(
                        "id, name, name_bn, division_id"
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


            if (districtError) {
                throw districtError;
            }


            // ---------------------------------------------
            // Load active hospitals
            // ---------------------------------------------

            const {
                data: hospitals,
                error: hospitalError
            } =
                await supabaseClient
                    .from(
                        TABLES.hospitals
                    )
                    .select(
                        "id, district_id"
                    )
                    .eq(
                        "is_active",
                        true
                    );


            if (hospitalError) {
                throw hospitalError;
            }


            // ---------------------------------------------
            // Count hospitals by district
            // ---------------------------------------------

            const hospitalCountByDistrict = {};


            (hospitals || []).forEach(
                function (hospital) {

                    if (!hospital.district_id) {
                        return;
                    }


                    if (
                        !hospitalCountByDistrict[
                            hospital.district_id
                        ]
                    ) {

                        hospitalCountByDistrict[
                            hospital.district_id
                        ] = 0;
                    }


                    hospitalCountByDistrict[
                        hospital.district_id
                    ]++;

                }
            );


            // ---------------------------------------------
            // No district data
            // ---------------------------------------------

            if (
                !districts ||
                districts.length === 0
            ) {

                container.innerHTML = `
                    <div class="category-loading">
                        কোনো active district পাওয়া যায়নি।
                    </div>
                `;

                return;
            }


            // ---------------------------------------------
            // Render district cards
            // ---------------------------------------------

            container.innerHTML =
                districts
                    .map(
                        function (district) {

                            const hospitalCount =
                                hospitalCountByDistrict[
                                    district.id
                                ] || 0;


                            return `
                                <div class="overview-card district-overview-card">

                                    <div class="overview-card-top">

                                        <div class="overview-icon">
                                            📍
                                        </div>

                                        <span>
                                            District
                                        </span>

                                    </div>


                                    <strong class="overview-number">
                                        ${formatNumber(
                                            hospitalCount
                                        )}
                                    </strong>


                                    <div class="overview-title">
                                        ${escapeHTML(
                                            district.name_bn ||
                                            district.name ||
                                            "District"
                                        )}
                                    </div>


                                    <small>
                                        Active hospitals
                                    </small>

                                </div>
                            `;

                        }
                    )
                    .join("");


        } catch (error) {

            console.error(
                "District Overview Error:",
                error
            );


            container.innerHTML = `
                <div class="category-error">
                    District data load করতে সমস্যা হয়েছে।
                </div>
            `;

        }

    }


    // =====================================================
    // F-5.2 — UPAZILA OVERVIEW
    // =====================================================

    async function loadUpazilaOverview() {

        // এখানে তোমার দেওয়া পুরো F-5.2 code

    }


    // =====================================================
    // LOAD DIVISION-WISE HOSPITAL OVERVIEW
    // =====================================================

    async function loadDivisionOverview() {

        const container =
            getElement(
                "divisionOverview"
            );


        if (!container) {
            return;
        }


        // =================================================
        // LOADING STATE
        // =================================================

        container.innerHTML = `
            <div class="category-loading">
                বিভাগভিত্তিক তথ্য লোড হচ্ছে...
            </div>
        `;


        try {

            // =============================================
            // LOAD ACTIVE DIVISIONS
            // =============================================

            const {
                data: divisions,
                error: divisionError
            } =
                await supabaseClient
                    .from(
                        TABLES.divisions
                    )
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


            if (divisionError) {

                throw divisionError;

            }


            // =============================================
            // LOAD ACTIVE HOSPITALS
            // =============================================

            const {
                data: hospitals,
                error: hospitalError
            } =
                await supabaseClient
                    .from(
                        TABLES.hospitals
                    )
                    .select(
                        "id,division_id"
                    )
                    .eq(
                        "is_active",
                        true
                    );


            if (hospitalError) {

                throw hospitalError;

            }


            // =============================================
            // COUNT HOSPITALS BY DIVISION
            // =============================================

            const hospitalCounts = {};


            (
                hospitals || []
            ).forEach(
                function (hospital) {

                    if (
                        !hospital.division_id
                    ) {

                        return;
                    }


                    if (
                        hospitalCounts[
                            hospital.division_id
                        ] === undefined
                    ) {

                        hospitalCounts[
                            hospital.division_id
                        ] = 0;
                    }


                    hospitalCounts[
                        hospital.division_id
                    ]++;

                }
            );


            // =============================================
            // EMPTY STATE
            // =============================================

            if (
                !divisions ||
                divisions.length === 0
            ) {

                container.innerHTML = `
                    <div class="category-empty">
                        কোনো সক্রিয় division পাওয়া যায়নি।
                    </div>
                `;

                return;
            }


            // =============================================
            // RENDER DIVISIONS
            // =============================================

            container.innerHTML =
                divisions
                    .map(
                        function (division) {

                            const count =
                                hospitalCounts[
                                    division.id
                                ] || 0;


                            return `
                                <div class="overview-card">

                                    <div class="overview-card-top">

                                        <div class="overview-icon">
                                            🇧🇩
                                        </div>

                                        <span>
                                            ${escapeHTML(
                                                division.name
                                            )}
                                        </span>

                                    </div>


                                    <strong
                                        class="overview-number"
                                    >
                                        ${formatNumber(
                                            count
                                        )}
                                    </strong>


                                    <small>
                                        ${escapeHTML(
                                            division.name_bn
                                        )}
                                        — সক্রিয় হাসপাতাল
                                    </small>

                                </div>
                            `;

                        }
                    )
                    .join("");


        } catch (error) {

            console.error(
                "Division overview loading failed:",
                error
            );


            container.innerHTML = `
                <div class="category-error">
                    বিভাগভিত্তিক তথ্য লোড করা যায়নি।
                </div>
            `;
        }
    }


    // =====================================================
    // UPDATE LAST REFRESH
    // =====================================================

    function updateLastRefresh() {

        const now =
            new Date();


        const time =
            now.toLocaleTimeString(
                "bn-BD",
                {
                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit"
                }
            );


        setText(
            "lastRefresh",
            "Updated " + time
        );
    }


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    async function loadDashboard() {

        if (isLoading) {
            return;
        }


        isLoading = true;


        document.body.classList.add(
            "dashboard-loading"
        );


        showLoadingState();


        try {

            /*
             * Location counts must finish first
             * because totalRecords depends on them.
             */

            await loadLocationCounts();


            await Promise.all([
                loadServiceCounts(),
                loadCategoryOverview(),
                loadDivisionOverview(),
                loadDistrictOverview(),
                loadUpazilaOverview()
            ]);


            renderStatistics();

            updateLastRefresh();


            document.body.classList.remove(
                "dashboard-data-error"
            );


            console.log(
                "Dorkari Dashboard Statistics:",
                dashboardStats
            );


        } catch (error) {

            console.error(
                "Dorkari Dashboard Error:",
                error
            );


            document.body.classList.add(
                "dashboard-data-error"
            );


            showErrorState(
                "Dashboard data load করতে সমস্যা হয়েছে।"
            );


        } finally {

            isLoading = false;


            document.body.classList.remove(
                "dashboard-loading"
            );
        }
    }


    // =====================================================
    // REFRESH BUTTON
    // =====================================================

    function setupRefreshButton() {

        const refreshButton =
            getElement(
                "refreshDashboard"
            );


        if (!refreshButton) {
            return;
        }


        refreshButton.addEventListener(
            "click",
            async function () {

                if (isLoading) {
                    return;
                }


                const originalHTML =
                    refreshButton.innerHTML;


                refreshButton.disabled =
                    true;


                refreshButton.classList.add(
                    "loading"
                );


                refreshButton.innerHTML =
                    "↻ Updating...";


                try {

                    await loadDashboard();


                } finally {

                    refreshButton.disabled =
                        false;


                    refreshButton.classList.remove(
                        "loading"
                    );


                    refreshButton.innerHTML =
                        originalHTML;
                }

            }
        );
    }


    // =====================================================
    // PUBLIC API
    // =====================================================

    window.DorkariDashboard = {

        load:
            loadDashboard,

        refresh:
            loadDashboard,

        getStats:
            function () {

                return {
                    ...dashboardStats
                };

            },

        getCategories:
            function () {

                return [
                    ...categoryData
                ];

            }

    };


    // =====================================================
    // INITIALIZE
    // =====================================================

    async function initializeDashboard() {

        /*
         * Wait for admin-guard.js.
         *
         * Security authority remains:
         *
         * Supabase Auth
         * +
         * admin_profiles
         * +
         * RLS
         */

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
            typeof window.DorkariAdmin.getProfile !==
                "function" ||
            !window.DorkariAdmin.getProfile()
        ) {

            console.warn(
                "Dorkari Dashboard: Admin guard not ready."
            );

            return;
        }


        // =================================================
        // USE SAME SUPABASE CLIENT FROM ADMIN GUARD
        // =================================================

        if (
            typeof window.DorkariAdmin.getSupabase !==
                "function"
        ) {

            console.error(
                "Dorkari Dashboard: Supabase client unavailable."
            );

            return;
        }


        supabaseClient =
            window.DorkariAdmin.getSupabase();


        if (!supabaseClient) {

            console.error(
                "Dorkari Dashboard: Supabase client is null."
            );

            return;
        }


        // =================================================
        // SETUP REFRESH
        // =================================================

        setupRefreshButton();


        // =================================================
        // LOAD DASHBOARD
        // =================================================

        await loadDashboard();

    }


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard
        );

    } else {

        initializeDashboard();

    }


})();
