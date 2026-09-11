// =========================================================
// Dorkari — Admin Dashboard Statistics
// Real Supabase Data
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
            "Dorkari: Supabase configuration is missing."
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
            "Dorkari: Supabase library was not loaded."
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
    // DOM HELPER
    // =====================================================

    function getElement(id) {

        return document.getElementById(id);

    }


    // =====================================================
    // FORMAT NUMBER
    // =====================================================

    function formatNumber(value) {

        if (
            typeof value !== "number" ||
            Number.isNaN(value)
        ) {
            return "0";
        }

        return value.toLocaleString(
            "en-US"
        );
    }


    // =====================================================
    // GET ACTIVE COUNT
    // =====================================================

    async function getActiveCount(
        tableName
    ) {

        const {
            count,
            error
        } =
            await supabaseClient
                .from(tableName)
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

            throw new Error(
                tableName +
                ": " +
                error.message
            );
        }


        return count || 0;
    }


    // =====================================================
    // GET TABLE COUNT
    // =====================================================

    async function getTableCount(
        tableName
    ) {

        const {
            count,
            error
        } =
            await supabaseClient
                .from(tableName)
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                );


        if (error) {

            throw new Error(
                tableName +
                ": " +
                error.message
            );
        }


        return count || 0;
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
    // SET LOADING STATE
    // =====================================================

    function setStatsLoading() {

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
                    "..."
                );

            }
        );


        setText(
            "statTotalStatus",
            "Updating..."
        );
    }


    // =====================================================
    // LOAD MAIN STATISTICS
    // =====================================================

    async function loadMainStatistics() {

        /*
         * These are all ACTIVE content records.
         *
         * Relationship tables such as:
         * - doctor_hospitals
         * - hospital_tests
         *
         * are intentionally not included in Total Active Records.
         *
         * They are relationship data, not primary content records.
         */


        const tables = [
            "emergency_contacts",
            "hospitals",
            "doctors",
            "tests",
            "ambulances",
            "police_stations",
            "government_offices",
            "blood_banks",
            "pharmacies"
        ];


        const counts =
            await Promise.all(
                tables.map(
                    function (table) {

                        return getActiveCount(
                            table
                        );

                    }
                )
            );


        const [
            emergencyCount,
            hospitalCount,
            doctorCount,
            testCount,
            ambulanceCount,
            policeCount,
            governmentCount,
            bloodBankCount,
            pharmacyCount
        ] = counts;


        const totalActiveRecords =
            emergencyCount +
            hospitalCount +
            doctorCount +
            testCount +
            ambulanceCount +
            policeCount +
            governmentCount +
            bloodBankCount +
            pharmacyCount;


        setText(
            "statTotalRecords",
            formatNumber(
                totalActiveRecords
            )
        );


        setText(
            "statHospitals",
            formatNumber(
                hospitalCount
            )
        );


        setText(
            "statDoctors",
            formatNumber(
                doctorCount
            )
        );


        setText(
            "statEmergency",
            formatNumber(
                emergencyCount
            )
        );


        setText(
            "statAmbulances",
            formatNumber(
                ambulanceCount
            )
        );


        setText(
            "statTotalStatus",
            "Live from Supabase"
        );
    }


    // =====================================================
    // LOAD LOCATION STATISTICS
    // =====================================================

    async function loadLocationStatistics() {

        const [
            divisions,
            districts,
            upazilas
        ] =
            await Promise.all([

                getActiveCount(
                    "divisions"
                ),

                getActiveCount(
                    "districts"
                ),

                getActiveCount(
                    "upazilas"
                )

            ]);


        setText(
            "statDivisions",
            formatNumber(
                divisions
            )
        );


        setText(
            "statDistricts",
            formatNumber(
                districts
            )
        );


        setText(
            "statUpazilas",
            formatNumber(
                upazilas
            )
        );
    }


    // =====================================================
    // CATEGORY ICON
    // =====================================================

    function getCategoryIcon(
        category
    ) {

        const value =
            (
                category.slug ||
                category.name ||
                ""
            )
            .toLowerCase();


        if (
            value.includes("fire") ||
            value.includes("ফায়ার") ||
            value.includes("fire-service")
        ) {
            return "🔥";
        }


        if (
            value.includes("police") ||
            value.includes("পুলিশ")
        ) {
            return "👮";
        }


        if (
            value.includes("ambulance") ||
            value.includes("অ্যাম্বুলেন্স")
        ) {
            return "🚑";
        }


        if (
            value.includes("child") ||
            value.includes("শিশু")
        ) {
            return "👶";
        }


        if (
            value.includes("women") ||
            value.includes("নারী")
        ) {
            return "👩";
        }


        if (
            value.includes("health") ||
            value.includes("স্বাস্থ্য")
        ) {
            return "🏥";
        }


        if (
            value.includes("national") ||
            value.includes("জাতীয়")
        ) {
            return "🇧🇩";
        }


        return "📞";
    }


    // =====================================================
    // LOAD CATEGORY DATA
    // =====================================================

    async function loadCategoryOverview() {

        const container =
            getElement(
                "categoryOverview"
            );


        if (!container) {
            return;
        }


        container.innerHTML = `
            <div class="category-loading">
                Loading categories...
            </div>
        `;


        /*
         * Load active categories
         */

        const {
            data: categories,
            error: categoryError
        } =
            await supabaseClient
                .from("categories")
                .select(
                    "id,name,name_bn,slug,icon,sort_order"
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

            throw new Error(
                "categories: " +
                categoryError.message
            );
        }


        if (
            !categories ||
            categories.length === 0
        ) {

            container.innerHTML = `
                <div class="category-empty">
                    এখনো কোনো active category নেই।
                </div>
            `;

            return;
        }


        /*
         * Load active emergency contacts
         */

        const {
            data: contacts,
            error: contactError
        } =
            await supabaseClient
                .from("emergency_contacts")
                .select(
                    "id,category_id"
                )
                .eq(
                    "is_active",
                    true
                );


        if (contactError) {

            throw new Error(
                "emergency_contacts: " +
                contactError.message
            );
        }


        /*
         * Count contacts by category
         */

        const categoryCounts =
            {};


        (contacts || [])
            .forEach(
                function (contact) {

                    const categoryId =
                        contact.category_id;


                    if (!categoryId) {
                        return;
                    }


                    if (
                        !categoryCounts[
                            categoryId
                        ]
                    ) {

                        categoryCounts[
                            categoryId
                        ] = 0;
                    }


                    categoryCounts[
                        categoryId
                    ] += 1;

                }
            );


        /*
         * Build category cards
         */

        const html =
            categories
                .map(
                    function (category) {

                        const count =
                            categoryCounts[
                                category.id
                            ] || 0;


                        const icon =
                            category.icon ||
                            getCategoryIcon(
                                category
                            );


                        const englishName =
                            category.name ||
                            "Category";


                        const banglaName =
                            category.name_bn ||
                            "";


                        return `
                            <div class="category-card">

                                <div class="category-icon">
                                    ${escapeHtml(icon)}
                                </div>


                                <div class="category-info">

                                    <strong class="category-name">
                                        ${escapeHtml(
                                            banglaName ||
                                            englishName
                                        )}
                                    </strong>


                                    ${
                                        banglaName &&
                                        englishName
                                            ? `
                                                <span class="category-name-bn">
                                                    ${escapeHtml(
                                                        englishName
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>


                                <span class="category-count">
                                    ${formatNumber(count)}
                                </span>

                            </div>
                        `;

                    }
                )
                .join("");


        container.innerHTML =
            html;
    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        return String(value)
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
    // UPDATE REFRESH TIME
    // =====================================================

    function updateRefreshTime() {

        const element =
            getElement(
                "lastRefresh"
            );


        if (!element) {
            return;
        }


        const now =
            new Date();


        element.textContent =
            "Updated " +
            now.toLocaleTimeString(
                "en-BD",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }


    // =====================================================
    // SHOW DASHBOARD ERROR
    // =====================================================

    function showDashboardError(
        error
    ) {

        console.error(
            "Dorkari Dashboard:",
            error
        );


        setText(
            "statTotalRecords",
            "!"
        );


        setText(
            "statTotalStatus",
            "Unable to load data"
        );


        setText(
            "statHospitals",
            "!"
        );


        setText(
            "statDoctors",
            "!"
        );


        setText(
            "statEmergency",
            "!"
        );


        setText(
            "statAmbulances",
            "!"
        );


        setText(
            "statDivisions",
            "!"
        );


        setText(
            "statDistricts",
            "!"
        );


        setText(
            "statUpazilas",
            "!"
        );


        const categoryContainer =
            getElement(
                "categoryOverview"
            );


        if (categoryContainer) {

            categoryContainer.innerHTML = `
                <div class="category-error">
                    Dashboard data load করা যায়নি।
                    Supabase connection বা permission check করুন।
                </div>
            `;
        }


        if (
            window.DorkariAdmin &&
            typeof window.DorkariAdmin.showToast ===
                "function"
        ) {

            window.DorkariAdmin.showToast(
                "Dashboard data load করা যায়নি।"
            );
        }
    }


    // =====================================================
    // LOAD EVERYTHING
    // =====================================================

    async function loadDashboardData() {

        const refreshButton =
            getElement(
                "refreshDashboard"
            );


        if (refreshButton) {

            refreshButton.classList.add(
                "loading"
            );

            refreshButton.textContent =
                "↻ Updating...";
        }


        setStatsLoading();


        try {

            await Promise.all([

                loadMainStatistics(),

                loadLocationStatistics(),

                loadCategoryOverview()

            ]);


            updateRefreshTime();


        } catch (error) {

            showDashboardError(
                error
            );


        } finally {

            if (refreshButton) {

                refreshButton.classList.remove(
                    "loading"
                );

                refreshButton.textContent =
                    "↻ Refresh";
            }
        }
    }


    // =====================================================
    // REFRESH BUTTON
    // =====================================================

    function setupRefreshButton() {

        const button =
            getElement(
                "refreshDashboard"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            loadDashboardData
        );
    }


    // =====================================================
    // START AFTER AUTH
    // =====================================================

    async function startDashboard() {

        /*
         * admin-guard.js runs before this file.
         *
         * We wait briefly for the guard to finish
         * authentication verification.
         */

        let attempts = 0;

        const maxAttempts = 50;


        while (
            attempts < maxAttempts
        ) {

            if (
                document.body.classList.contains(
                    "admin-authenticated"
                )
            ) {
                break;
            }


            attempts += 1;


            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        100
                    );

                }
            );
        }


        if (
            !document.body.classList.contains(
                "admin-authenticated"
            )
        ) {

            console.warn(
                "Dashboard statistics waiting for authentication."
            );

            return;
        }


        setupRefreshButton();

        await loadDashboardData();
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
            startDashboard
        );

    } else {

        startDashboard();

    }


    // =====================================================
    // GLOBAL ACCESS
    // =====================================================

    window.DorkariDashboard = {

        refresh:
            loadDashboardData

    };

})();
