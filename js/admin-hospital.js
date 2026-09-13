// =========================================================
// Dorkari — Hospital Management
// F-8.1 — Hospital Foundation
// =========================================================

(function () {

    "use strict";


    // =====================================================
    // STATE
    // =====================================================

    const state = {

        supabase: null,

        hospitals: [],

        divisions: [],

        districts: [],

        upazilas: [],

        filteredHospitals: [],

        loading: false

    };


    // =====================================================
    // DOM
    // =====================================================

    function get(id) {

        return document.getElementById(id);

    }


    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // =====================================================
    // NUMBER
    // =====================================================

    function formatNumber(value) {

        return Number(value || 0).toLocaleString("bn-BD");

    }


    // =====================================================
    // TOAST
    // =====================================================

    function showToast(message) {

        const toast = get("hospitalToast");
        const messageElement = get("hospitalToastMessage");

        if (!toast || !messageElement) {
            return;
        }

        messageElement.textContent = message;

        toast.classList.add("show");

        clearTimeout(showToast.timer);

        showToast.timer = setTimeout(function () {

            toast.classList.remove("show");

        }, 2500);

    }


    // =====================================================
    // LOADING
    // =====================================================

    function showLoading() {

        const list = get("hospitalList");

        if (!list) {
            return;
        }

        list.innerHTML = `
            <div class="hospital-loading">
                হাসপাতালের তথ্য লোড হচ্ছে...
            </div>
        `;

    }


    // =====================================================
    // ERROR
    // =====================================================

    function showError(message) {

        const list = get("hospitalList");

        if (!list) {
            return;
        }

        list.innerHTML = `
            <div class="hospital-error">
                ${escapeHTML(
                    message ||
                    "হাসপাতালের তথ্য লোড করা যায়নি।"
                )}
            </div>
        `;

    }


    // =====================================================
    // LOAD LOCATIONS
    // =====================================================

    async function loadLocations() {

        const [

            divisionResult,

            districtResult,

            upazilaResult

        ] = await Promise.all([

            state.supabase
                .from("divisions")
                .select("id,name,name_bn")
                .eq("is_active", true)
                .order("name_bn", {
                    ascending: true
                }),

            state.supabase
                .from("districts")
                .select("id,name,name_bn,division_id")
                .eq("is_active", true)
                .order("name_bn", {
                    ascending: true
                }),

            state.supabase
                .from("upazilas")
                .select("id,name,name_bn,district_id")
                .eq("is_active", true)
                .order("name_bn", {
                    ascending: true
                })

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


        state.divisions = divisionResult.data || [];

        state.districts = districtResult.data || [];

        state.upazilas = upazilaResult.data || [];


        renderDivisionOptions();

    }


    // =====================================================
    // DIVISION OPTIONS
    // =====================================================

    function renderDivisionOptions() {

        const filter = get("hospitalDivisionFilter");
        const form = get("hospitalDivision");

        if (filter) {

            filter.innerHTML = `
                <option value="">
                    সব বিভাগ
                </option>
            `;

            state.divisions.forEach(function (division) {

                filter.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(division.id)}">
                        ${escapeHTML(
                            division.name_bn ||
                            division.name
                        )}
                    </option>
                    `
                );

            });

        }


        if (form) {

            form.innerHTML = `
                <option value="">
                    Select Division
                </option>
            `;

            state.divisions.forEach(function (division) {

                form.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(division.id)}">
                        ${escapeHTML(
                            division.name_bn ||
                            division.name
                        )}
                    </option>
                    `
                );

            });

        }

    }


    // =====================================================
    // DISTRICT OPTIONS
    // =====================================================

    function renderDistrictOptions(
        divisionId,
        targetId,
        placeholder
    ) {

        const select = get(targetId);

        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                ${placeholder}
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


        districts.forEach(function (district) {

            select.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${escapeHTML(district.id)}">
                    ${escapeHTML(
                        district.name_bn ||
                        district.name
                    )}
                </option>
                `
            );

        });


        select.disabled = false;

    }


    // =====================================================
    // UPAZILA OPTIONS
    // =====================================================

    function renderUpazilaOptions(
        districtId,
        targetId,
        placeholder
    ) {

        const select = get(targetId);

        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                ${placeholder}
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


        upazilas.forEach(function (upazila) {

            select.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${escapeHTML(upazila.id)}">
                    ${escapeHTML(
                        upazila.name_bn ||
                        upazila.name
                    )}
                </option>
                `
            );

        });


        select.disabled = false;

    }


    // =====================================================
    // LOAD HOSPITALS
    // =====================================================

    async function loadHospitals() {

        state.loading = true;

        showLoading();


        const {

            data,

            error

        } = await state.supabase
            .from("hospitals")
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
            .order("name_bn", {
                ascending: true
            });


        state.loading = false;


        if (error) {

            console.error(
                "Hospital Load Error:",
                error
            );

            showError(
                "Hospital data load করতে সমস্যা হয়েছে।"
            );

            return;

        }


        state.hospitals = data || [];

        state.filteredHospitals =
            [...state.hospitals];


        renderStatistics();

        applyFilters();

    }


    // =====================================================
    // STATISTICS
    // =====================================================

    function renderStatistics() {

        const total =
            state.hospitals.length;


        const active =
            state.hospitals.filter(
                function (hospital) {

                    return hospital.is_active === true;

                }
            ).length;


        const verified =
            state.hospitals.filter(
                function (hospital) {

                    return hospital.is_verified === true;

                }
            ).length;


        const totalElement =
            get("hospitalTotalCount");

        const activeElement =
            get("hospitalActiveCount");

        const verifiedElement =
            get("hospitalVerifiedCount");


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


    // =====================================================
    // GET LOCATION NAME
    // =====================================================

    function getDivisionName(id) {

        const item =
            state.divisions.find(
                function (division) {

                    return division.id === id;

                }
            );

        return item
            ? (item.name_bn || item.name)
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
            ? (item.name_bn || item.name)
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
            ? (item.name_bn || item.name)
            : "";

    }


    // =====================================================
    // RENDER LIST
    // =====================================================

    function renderList() {

        const list =
            get("hospitalList");


        if (!list) {
            return;
        }


        if (
            state.filteredHospitals.length === 0
        ) {

            list.innerHTML = `
                <div class="hospital-empty">
                    কোনো হাসপাতাল পাওয়া যায়নি।
                </div>
            `;

            updateResultCount();

            return;

        }


        list.innerHTML =
            state.filteredHospitals
                .map(function (hospital) {

                    const locationParts = [

                        getDivisionName(
                            hospital.division_id
                        ),

                        getDistrictName(
                            hospital.district_id
                        ),

                        getUpazilaName(
                            hospital.upazila_id
                        )

                    ].filter(Boolean);


                    const status =
                        hospital.is_active
                            ? "Active"
                            : "Inactive";


                    const verification =
                        hospital.is_verified
                            ? "Verified"
                            : "Unverified";


                    return `
                        <article
                            class="hospital-card"
                            data-id="${escapeHTML(
                                hospital.id
                            )}"
                        >

                            <div class="hospital-card-main">

                                <h3 class="hospital-card-title">
                                    ${escapeHTML(
                                        hospital.name_bn ||
                                        hospital.name ||
                                        "Unnamed Hospital"
                                    )}
                                </h3>

                                ${
                                    hospital.name &&
                                    hospital.name_bn &&
                                    hospital.name !==
                                        hospital.name_bn

                                        ? `
                                            <div class="hospital-card-subtitle">
                                                ${escapeHTML(
                                                    hospital.name
                                                )}
                                            </div>
                                          `
                                        : ""
                                }


                                <div class="hospital-card-meta">

                                    ${
                                        hospital.hospital_type
                                            ? `
                                                <span class="hospital-badge">
                                                    ${escapeHTML(
                                                        hospital.hospital_type
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }


                                    ${
                                        locationParts.length
                                            ? `
                                                <span class="hospital-badge">
                                                    📍
                                                    ${escapeHTML(
                                                        locationParts.join(" • ")
                                                    )}
                                                </span>
                                              `
                                            : ""
                                    }


                                    <span class="hospital-badge">
                                        ${status}
                                    </span>


                                    <span class="hospital-badge">
                                        ${verification}
                                    </span>

                                </div>


                                ${
                                    hospital.phone
                                        ? `
                                            <div class="hospital-card-subtitle">
                                                ☎ ${escapeHTML(
                                                    hospital.phone
                                                )}
                                            </div>
                                          `
                                        : ""
                                }

                            </div>


                            <div class="hospital-card-actions">

                                <button
                                    type="button"
                                    class="hospital-card-btn"
                                    data-action="edit"
                                    data-id="${escapeHTML(
                                        hospital.id
                                    )}"
                                >
                                    Edit
                                </button>

                            </div>

                        </article>
                    `;

                })
                .join("");


        updateResultCount();

    }


    // =====================================================
    // FILTER
    // =====================================================

    function applyFilters() {

        const search =
            (
                get("hospitalSearch")?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const type =
            get("hospitalTypeFilter")?.value ||
            "";


        const divisionId =
            get("hospitalDivisionFilter")?.value ||
            "";


        const districtId =
            get("hospitalDistrictFilter")?.value ||
            "";


        const upazilaId =
            get("hospitalUpazilaFilter")?.value ||
            "";


        const status =
            get("hospitalStatusFilter")?.value ||
            "";


        const verification =
            get("hospitalVerificationFilter")?.value ||
            "";


        state.filteredHospitals =
            state.hospitals.filter(
                function (hospital) {

                    const searchText = [

                        hospital.name,

                        hospital.name_bn,

                        hospital.hospital_type,

                        hospital.address,

                        hospital.phone

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    if (
                        search &&
                        !searchText.includes(search)
                    ) {

                        return false;

                    }


                    if (
                        type &&
                        hospital.hospital_type !== type
                    ) {

                        return false;

                    }


                    if (
                        divisionId &&
                        hospital.division_id !== divisionId
                    ) {

                        return false;

                    }


                    if (
                        districtId &&
                        hospital.district_id !== districtId
                    ) {

                        return false;

                    }


                    if (
                        upazilaId &&
                        hospital.upazila_id !== upazilaId
                    ) {

                        return false;

                    }


                    if (
                        status === "active" &&
                        hospital.is_active !== true
                    ) {

                        return false;

                    }


                    if (
                        status === "inactive" &&
                        hospital.is_active !== false
                    ) {

                        return false;

                    }


                    if (
                        verification === "verified" &&
                        hospital.is_verified !== true
                    ) {

                        return false;

                    }


                    if (
                        verification === "unverified" &&
                        hospital.is_verified !== false
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        renderList();

    }


    // =====================================================
    // RESULT COUNT
    // =====================================================

    function updateResultCount() {

        const element =
            get("hospitalResultCount");


        if (!element) {
            return;
        }


        element.textContent =
            formatNumber(
                state.filteredHospitals.length
            ) +
            "টি হাসপাতাল";

    }


    // =====================================================
    // MODAL
    // =====================================================

    function openModal() {

        const modal =
            get("hospitalModal");


        if (!modal) {
            return;
        }


        modal.classList.add("is-open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        get("hospitalModalTitle")
            .textContent =
            "Add Hospital";

    }


    function closeModal() {

        const modal =
            get("hospitalModal");


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

    }


    // =====================================================
    // EVENT BINDINGS
    // =====================================================

    function bindEvents() {

        const addButton =
            get("hospitalAddBtn");


        if (addButton) {

            addButton.addEventListener(
                "click",
                openModal
            );

        }


        const refreshButton =
            get("hospitalRefresh");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadHospitals
            );

        }


        const closeButton =
            get("hospitalModalClose");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeModal
            );

        }


        const cancelButton =
            get("hospitalCancelBtn");


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }


        const backdrop =
            document.querySelector(
                ".hospital-modal-backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeModal
            );

        }


        const search =
            get("hospitalSearch");


        if (search) {

            search.addEventListener(
                "input",
                applyFilters
            );

        }


        [

            "hospitalTypeFilter",

            "hospitalStatusFilter",

            "hospitalVerificationFilter"

        ].forEach(function (id) {

            const element = get(id);

            if (element) {

                element.addEventListener(
                    "change",
                    applyFilters
                );

            }

        });


        const divisionFilter =
            get("hospitalDivisionFilter");


        if (divisionFilter) {

            divisionFilter.addEventListener(
                "change",
                function () {

                    renderDistrictOptions(
                        this.value,
                        "hospitalDistrictFilter",
                        "সব জেলা"
                    );


                    const upazila =
                        get(
                            "hospitalUpazilaFilter"
                        );


                    if (upazila) {

                        upazila.innerHTML = `
                            <option value="">
                                সব উপজেলা
                            </option>
                        `;

                        upazila.disabled = true;

                    }


                    applyFilters();

                }
            );

        }


        const districtFilter =
            get("hospitalDistrictFilter");


        if (districtFilter) {

            districtFilter.addEventListener(
                "change",
                function () {

                    renderUpazilaOptions(
                        this.value,
                        "hospitalUpazilaFilter",
                        "সব উপজেলা"
                    );

                    applyFilters();

                }
            );

        }


        const upazilaFilter =
            get("hospitalUpazilaFilter");


        if (upazilaFilter) {

            upazilaFilter.addEventListener(
                "change",
                applyFilters
            );

        }


        const divisionForm =
            get("hospitalDivision");


        if (divisionForm) {

            divisionForm.addEventListener(
                "change",
                function () {

                    renderDistrictOptions(
                        this.value,
                        "hospitalDistrict",
                        "Select District"
                    );


                    const upazila =
                        get("hospitalUpazila");


                    if (upazila) {

                        upazila.innerHTML = `
                            <option value="">
                                Select Upazila
                            </option>
                        `;

                        upazila.disabled = true;

                    }

                }
            );

        }


        const districtForm =
            get("hospitalDistrict");


        if (districtForm) {

            districtForm.addEventListener(
                "change",
                function () {

                    renderUpazilaOptions(
                        this.value,
                        "hospitalUpazila",
                        "Select Upazila"
                    );

                }
            );

        }


        const clearButton =
            get("hospitalClearFilters");


        if (clearButton) {

            clearButton.addEventListener(
                "click",
                function () {

                    get("hospitalSearch").value = "";

                    get("hospitalTypeFilter").value = "";

                    get("hospitalDivisionFilter").value = "";

                    get("hospitalDistrictFilter").innerHTML = `
                        <option value="">
                            সব জেলা
                        </option>
                    `;

                    get("hospitalDistrictFilter").disabled = true;

                    get("hospitalUpazilaFilter").innerHTML = `
                        <option value="">
                            সব উপজেলা
                        </option>
                    `;

                    get("hospitalUpazilaFilter").disabled = true;

                    get("hospitalStatusFilter").value = "";

                    get("hospitalVerificationFilter").value = "";

                    applyFilters();

                }
            );

        }


        const form =
            get("hospitalForm");


        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    showToast(
                        "Hospital Save functionality পরবর্তী ধাপে যুক্ত হবে।"
                    );

                }
            );

        }


        const list =
            get("hospitalList");


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
                        "Hospital Edit functionality পরবর্তী ধাপে যুক্ত হবে।"
                    );

                }
            );

        }

    }


    // =====================================================
    // INITIALIZE
    // =====================================================

    async function initialize() {

        try {

            // Wait for admin guard

            let attempts = 0;

            const maxAttempts = 100;


            while (
                attempts < maxAttempts
            ) {

                if (
                    window.DorkariAdmin &&
                    typeof
                        window.DorkariAdmin.getProfile ===
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
                typeof
                    window.DorkariAdmin.getSupabase !==
                    "function"
            ) {

                showError(
                    "Admin security guard ready হয়নি।"
                );

                return;

            }


            state.supabase =
                window.DorkariAdmin.getSupabase();


            if (!state.supabase) {

                showError(
                    "Supabase client পাওয়া যায়নি।"
                );

                return;

            }


            bindEvents();


            await loadLocations();

            await loadHospitals();


            console.log(
                "Dorkari Hospital Foundation ready."
            );

        } catch (error) {

            console.error(
                "Hospital Initialization Error:",
                error
            );


            showError(
                "Hospital module initialize করতে সমস্যা হয়েছে।"
            );

        }

    }


    // =====================================================
    // PUBLIC API
    // =====================================================

    window.DorkariHospital = {

        refresh: loadHospitals,

        getHospitals: function () {

            return [
                ...state.hospitals
            ];

        },

        getFilteredHospitals: function () {

            return [
                ...state.filteredHospitals
            ];

        }

    };


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


})();
