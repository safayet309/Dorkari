// =========================================================
// Dorkari — Admin Dashboard
// Part 2.8 F — Real Supabase Statistics
// =========================================================

(function () {

    "use strict";


    // =====================================================
    // CONFIG
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

    const supabaseClient =
        window.supabase.createClient(
            DORKARI_CONFIG.SUPABASE.URL,
            DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
        );


    // =====================================================
    // TABLES
    // =====================================================

    const TABLES = {

        divisions:
            "divisions",

        categories:
            "categories",

        emergencyContacts:
            "emergency_contacts",

        hospitals:
            "hospitals",

        doctors:
            "doctors",

        tests:
            "tests",

        ambulances:
            "ambulances",

        policeStations:
            "police_stations",

        governmentOffices:
            "government_offices",

        bloodBanks:
            "blood_banks",

        pharmacies:
            "pharmacies"

    };


    // =====================================================
    // STATE
    // =====================================================

    let dashboardStats = {

        hospitals: 0,

        doctors: 0,

        emergencyContacts: 0,

        ambulances: 0,

        policeStations: 0,

        governmentOffices: 0,

        bloodBanks: 0,

        pharmacies: 0,

        tests: 0

    };


    let divisionData = [];

    let categoryData = [];

    let isLoading = false;


    // =====================================================
    // DOM HELPERS
    // =====================================================

    function getElement(id) {

        return document.getElementById(id);

    }


    function getFirstElement(ids) {

        for (
            let i = 0;
            i < ids.length;
            i++
        ) {

            const element =
                document.getElementById(
                    ids[i]
                );


            if (element) {
                return element;
            }
        }


        return null;
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
    // FORMAT NUMBER
    // =====================================================

    function formatNumber(number) {

        const value =
            Number(number) || 0;


        return value.toLocaleString(
            "bn-BD"
        );
    }


    // =====================================================
    // SET STAT VALUE
    // =====================================================

    function setStatValue(
        ids,
        value
    ) {

        const element =
            getFirstElement(ids);


        if (!element) {
            return;
        }


        element.textContent =
            formatNumber(value);
    }


    // =====================================================
    // SHOW LOADING STATE
    // =====================================================

    function showStatsLoading() {

        const statSelectors = [

            [
                "totalHospitals",
                "statHospitals",
                "hospitalCount"
            ],

            [
                "totalDoctors",
                "statDoctors",
                "doctorCount"
            ],

            [
                "totalEmergencyContacts",
                "statEmergencyContacts",
                "emergencyCount"
            ],

            [
                "totalAmbulances",
                "statAmbulances",
                "ambulanceCount"
            ],

            [
                "totalPoliceStations",
                "statPoliceStations",
                "policeCount"
            ],

            [
                "totalGovernmentOffices",
                "statGovernmentOffices",
                "governmentCount"
            ],

            [
                "totalBloodBanks",
                "statBloodBanks",
                "bloodBankCount"
            ],

            [
                "totalPharmacies",
                "statPharmacies",
                "pharmacyCount"
            ],

            [
                "totalTests",
                "statTests",
                "testCount"
            ]

        ];


        statSelectors.forEach(
            function (ids) {

                const element =
                    getFirstElement(ids);


                if (element) {

                    element.textContent =
                        "…";
                }

            }
        );
    }


    // =====================================================
    // COUNT ACTIVE RECORDS
    // =====================================================

    async function countActiveRecords(
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
    // LOAD ALL STATISTICS
    // =====================================================

    async function loadStatistics() {

        showStatsLoading();


        const results =
            await Promise.all([

                countActiveRecords(
                    TABLES.hospitals
                ),

                countActiveRecords(
                    TABLES.doctors
                ),

                countActiveRecords(
                    TABLES.emergencyContacts
                ),

                countActiveRecords(
                    TABLES.ambulances
                ),

                countActiveRecords(
                    TABLES.policeStations
                ),

                countActiveRecords(
                    TABLES.governmentOffices
                ),

                countActiveRecords(
                    TABLES.bloodBanks
                ),

                countActiveRecords(
                    TABLES.pharmacies
                ),

                countActiveRecords(
                    TABLES.tests
                )

            ]);


        dashboardStats = {

            hospitals:
                results[0],

            doctors:
                results[1],

            emergencyContacts:
                results[2],

            ambulances:
                results[3],

            policeStations:
                results[4],

            governmentOffices:
                results[5],

            bloodBanks:
                results[6],

            pharmacies:
                results[7],

            tests:
                results[8]

        };


        renderStatistics();

        return dashboardStats;
    }


    // =====================================================
    // RENDER STATISTICS
    // =====================================================

    function renderStatistics() {

        setStatValue(
            [
                "totalHospitals",
                "statHospitals",
                "hospitalCount"
            ],
            dashboardStats.hospitals
        );


        setStatValue(
            [
                "totalDoctors",
                "statDoctors",
                "doctorCount"
            ],
            dashboardStats.doctors
        );


        setStatValue(
            [
                "totalEmergencyContacts",
                "statEmergencyContacts",
                "emergencyCount"
            ],
            dashboardStats.emergencyContacts
        );


        setStatValue(
            [
                "totalAmbulances",
                "statAmbulances",
                "ambulanceCount"
            ],
            dashboardStats.ambulances
        );


        setStatValue(
            [
                "totalPoliceStations",
                "statPoliceStations",
                "policeCount"
            ],
            dashboardStats.policeStations
        );


        setStatValue(
            [
                "totalGovernmentOffices",
                "statGovernmentOffices",
                "governmentCount"
            ],
            dashboardStats.governmentOffices
        );


        setStatValue(
            [
                "totalBloodBanks",
                "statBloodBanks",
                "bloodBankCount"
            ],
            dashboardStats.bloodBanks
        );


        setStatValue(
            [
                "totalPharmacies",
                "statPharmacies",
                "pharmacyCount"
            ],
            dashboardStats.pharmacies
        );


        setStatValue(
            [
                "totalTests",
                "statTests",
                "testCount"
            ],
            dashboardStats.tests
        );


        /*
         * Generic data-stat support.
         *
         * Example:
         *
         * <span data-stat="hospitals"></span>
         */

        document
            .querySelectorAll(
                "[data-stat]"
            )
            .forEach(
                function (element) {

                    const key =
                        element.dataset.stat;


                    if (
                        Object.prototype.hasOwnProperty.call(
                            dashboardStats,
                            key
                        )
                    ) {

                        element.textContent =
                            formatNumber(
                                dashboardStats[key]
                            );
                    }

                }
            );
    }


    // =====================================================
    // LOAD DIVISIONS
    // =====================================================

    async function loadDivisionOverview() {

        const {
            data,
            error
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


        if (error) {

            throw error;
        }


        const divisions =
            Array.isArray(data)
                ? data
                : [];


        // ================================================
        // Load active hospitals with division IDs
        // ================================================

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


        const hospitalRows =
            Array.isArray(hospitals)
                ? hospitals
                : [];


        // ================================================
        // Build division map
        // ================================================

        const divisionMap = {};


        divisions.forEach(
            function (division) {

                divisionMap[
                    division.id
                ] = {

                    id:
                        division.id,

                    name:
                        division.name,

                    name_bn:
                        division.name_bn,

                    hospitals:
                        0

                };

            }
        );


        hospitalRows.forEach(
            function (hospital) {

                const division =
                    divisionMap[
                        hospital.division_id
                    ];


                if (division) {

                    division.hospitals++;
                }

            }
        );


        divisionData =
            Object.values(
                divisionMap
            );


        renderDivisionOverview();

        return divisionData;
    }


    // =====================================================
    // RENDER DIVISION OVERVIEW
    // =====================================================

    function renderDivisionOverview() {

        const container =
            getFirstElement([
                "divisionOverview",
                "locationOverview",
                "divisionSummary",
                "locationSummary"
            ]);


        if (!container) {

            return;
        }


        if (
            !Array.isArray(
                divisionData
            ) ||
            divisionData.length === 0
        ) {

            container.innerHTML = `
                <div class="dashboard-empty">
                    এখনো কোনো বিভাগের তথ্য পাওয়া যায়নি।
                </div>
            `;

            return;
        }


        container.innerHTML =
            divisionData
                .map(
                    function (division) {

                        return `
                            <div class="overview-row">

                                <div class="overview-row-info">

                                    <span class="overview-row-name">
                                        ${escapeHTML(
                                            division.name_bn ||
                                            division.name ||
                                            "বিভাগ"
                                        )}
                                    </span>

                                    <span class="overview-row-subtitle">
                                        হাসপাতাল
                                    </span>

                                </div>

                                <span class="overview-row-count">
                                    ${formatNumber(
                                        division.hospitals
                                    )}
                                </span>

                            </div>
                        `;

                    }
                )
                .join("");
    }


    // =====================================================
    // LOAD EMERGENCY CATEGORY OVERVIEW
    // =====================================================

    async function loadCategoryOverview() {

        const {
            data: categories,
            error: categoryError
        } =
            await supabaseClient
                .from(
                    TABLES.categories
                )
                .select(
                    "id,name,name_bn"
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
                )
                .order(
                    "name_bn",
                    {
                        ascending: true
                    }
                );


        if (categoryError) {

            throw categoryError;
        }


        const {
            data: contacts,
            error: contactError
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


        if (contactError) {

            throw contactError;
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

                const category =
                    categoryMap[
                        contact.category_id
                    ];


                if (category) {

                    category.count++;
                }

            }
        );


        /*
         * Contacts without a category
         * are also counted.
         */

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


        if (uncategorized > 0) {

            categoryData =
                Object.values(
                    categoryMap
                );


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

        } else {

            categoryData =
                Object.values(
                    categoryMap
                );
        }


        // Sort by count
        categoryData.sort(
            function (a, b) {

                return b.count - a.count;

            }
        );


        renderCategoryOverview();

        return categoryData;
    }


    // =====================================================
    // RENDER CATEGORY OVERVIEW
    // =====================================================

    function renderCategoryOverview() {

        const container =
            getFirstElement([
                "categoryOverview",
                "emergencyCategoryOverview",
                "categorySummary",
                "emergencySummary"
            ]);


        if (!container) {

            return;
        }


        if (
            !Array.isArray(
                categoryData
            ) ||
            categoryData.length === 0
        ) {

            container.innerHTML = `
                <div class="dashboard-empty">
                    এখনো কোনো জরুরি সেবার ক্যাটাগরি তথ্য নেই।
                </div>
            `;

            return;
        }


        container.innerHTML =
            categoryData
                .map(
                    function (category) {

                        return `
                            <div class="overview-row">

                                <div class="overview-row-info">

                                    <span class="overview-row-name">
                                        ${escapeHTML(
                                            category.name_bn ||
                                            category.name ||
                                            "অন্যান্য"
                                        )}
                                    </span>

                                </div>

                                <span class="overview-row-count">
                                    ${formatNumber(
                                        category.count
                                    )}
                                </span>

                            </div>
                        `;

                    }
                )
                .join("");
    }


    // =====================================================
    // DASHBOARD ERROR
    // =====================================================

    function showDashboardError(
        error
    ) {

        console.error(
            "Dorkari Dashboard Error:",
            error
        );


        const message =
            error?.message ||
            "ড্যাশবোর্ডের তথ্য লোড করা যায়নি।";


        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.showToast ===
                "function"
        ) {

            window.DorkariAdmin.showToast(
                "তথ্য লোড করতে সমস্যা হয়েছে।"
            );
        }


        document
            .querySelectorAll(
                ".dashboard-error-message"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        message;

                }
            );
    }


    // =====================================================
    // LOAD COMPLETE DASHBOARD
    // =====================================================

    async function loadDashboard() {

        if (isLoading) {

            return;
        }


        isLoading = true;


        document.body.classList.add(
            "dashboard-loading"
        );


        try {

            await Promise.all([

                loadStatistics(),

                loadDivisionOverview(),

                loadCategoryOverview()

            ]);


            document.body.classList.remove(
                "dashboard-data-error"
            );


            console.log(
                "Dorkari Dashboard loaded:",
                dashboardStats
            );


        } catch (error) {

            document.body.classList.add(
                "dashboard-data-error"
            );


            showDashboardError(
                error
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
            getFirstElement([
                "dashboardRefresh",
                "refreshDashboard",
                "refreshButton",
                "refreshStats",
                "adminDashboardRefresh"
            ]);


        if (!refreshButton) {

            return;
        }


        refreshButton.addEventListener(
            "click",
            async function () {

                if (isLoading) {

                    return;
                }


                const originalText =
                    refreshButton.innerHTML;


                refreshButton.disabled =
                    true;


                refreshButton.classList.add(
                    "loading"
                );


                refreshButton.innerHTML =
                    "↻ লোড হচ্ছে...";


                try {

                    await loadDashboard();


                } finally {

                    refreshButton.disabled =
                        false;


                    refreshButton.classList.remove(
                        "loading"
                    );


                    refreshButton.innerHTML =
                        originalText;
                }

            }
        );
    }


    // =====================================================
    // LAST UPDATED
    // =====================================================

    function updateLastUpdated() {

        const element =
            getFirstElement([
                "dashboardLastUpdated",
                "lastUpdated",
                "statsLastUpdated"
            ]);


        if (!element) {

            return;
        }


        const now =
            new Date();


        element.textContent =
            "সর্বশেষ আপডেট: " +
            now.toLocaleTimeString(
                "bn-BD",
                {
                    hour:
                        "2-digit",

                    minute:
                        "2-digit"
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

        getDivisions:
            function () {

                return [
                    ...divisionData
                ];

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
         * admin-guard.js must authenticate the user first.
         *
         * We wait briefly for the verified admin profile
         * so this module never trusts sessionStorage alone.
         */

        let attempts = 0;

        const maxAttempts = 100;


        while (
            attempts < maxAttempts
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
                "Dorkari Dashboard: Admin guard is not ready."
            );

            return;
        }


        setupRefreshButton();

        await loadDashboard();

        updateLastUpdated();
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
