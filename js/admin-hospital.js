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

        loading: false,

        editingHospitalId: null

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
    // F-8.2 — FORM VALIDATION
    // =====================================================

    function clearHospitalFormErrors() {

        document
            .querySelectorAll(
                "#hospitalForm .hospital-field-error"
            )
            .forEach(function (element) {

                element.remove();

            });


        document
            .querySelectorAll(
                "#hospitalForm .hospital-input-error"
            )
            .forEach(function (element) {

                element.classList.remove(
                    "hospital-input-error"
                );

            });

    }


    function setHospitalFieldError(
        field,
        message
    ) {

        if (!field) {
            return;
        }


        field.classList.add(
            "hospital-input-error"
        );


        const parent =
            field.parentElement;

        if (!parent) {
            return;
        }


        const oldError =
            parent.querySelector(
                ".hospital-field-error"
            );

        if (oldError) {
            oldError.remove();
        }


        const error =
            document.createElement(
                "div"
            );

        error.className =
            "hospital-field-error";

        error.textContent =
            message;


        parent.appendChild(
            error
        );

    }


    function validateHospitalForm() {

        clearHospitalFormErrors();


        let valid = true;


        const name =
            get("hospitalName");

        const nameBn =
            get("hospitalNameBn");

        const type =
            get("hospitalType");

        const division =
            get("hospitalDivision");

        const phone =
            get("hospitalPhone");

        const email =
            get("hospitalEmail");

        const website =
            get("hospitalWebsite");


        // ---------------------------------------------
        // Name
        // ---------------------------------------------

        if (
            !name ||
            !String(
                name.value || ""
            ).trim()
        ) {

            setHospitalFieldError(
                name,
                "Hospital name আবশ্যক।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Bangla name
        // ---------------------------------------------

        if (
            !nameBn ||
            !String(
                nameBn.value || ""
            ).trim()
        ) {

            setHospitalFieldError(
                nameBn,
                "বাংলা নাম আবশ্যক।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Type
        // ---------------------------------------------

        const allowedTypes = [
            "Government",
            "Private",
            "Specialized",
            "Clinic",
            "Diagnostic"
        ];


        if (
            !type ||
            !allowedTypes.includes(
                type.value
            )
        ) {

            setHospitalFieldError(
                type,
                "Hospital type নির্বাচন করুন।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Division
        // ---------------------------------------------

        if (
            !division ||
            !division.value
        ) {

            setHospitalFieldError(
                division,
                "Division নির্বাচন করুন।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Phone
        // ---------------------------------------------

        if (
            !phone ||
            !String(
                phone.value || ""
            ).trim()
        ) {

            setHospitalFieldError(
                phone,
                "Phone number আবশ্যক।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Email
        // ---------------------------------------------

        if (
            email &&
            String(
                email.value || ""
            ).trim() &&
            !email.validity.valid
        ) {

            setHospitalFieldError(
                email,
                "সঠিক email দিন।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Website
        // ---------------------------------------------

        if (
            website &&
            String(
                website.value || ""
            ).trim() &&
            !website.validity.valid
        ) {

            setHospitalFieldError(
                website,
                "সঠিক website URL দিন।"
            );

            valid = false;

        }


        // ---------------------------------------------
        // Latitude
        // ---------------------------------------------

        const latitude =
            get("hospitalLatitude");

        if (
            latitude &&
            String(
                latitude.value || ""
            ).trim()
        ) {

            const value =
                Number(
                    latitude.value
                );

            if (
                !Number.isFinite(value) ||
                value < -90 ||
                value > 90
            ) {

                setHospitalFieldError(
                    latitude,
                    "Latitude -90 থেকে 90 এর মধ্যে হতে হবে।"
                );

                valid = false;

            }

        }


        // ---------------------------------------------
        // Longitude
        // ---------------------------------------------

        const longitude =
            get("hospitalLongitude");

        if (
            longitude &&
            String(
                longitude.value || ""
            ).trim()
        ) {

            const value =
                Number(
                    longitude.value
                );

            if (
                !Number.isFinite(value) ||
                value < -180 ||
                value > 180
            ) {

                setHospitalFieldError(
                    longitude,
                    "Longitude -180 থেকে 180 এর মধ্যে হতে হবে।"
                );

                valid = false;

            }

        }


        return valid;

    }


    // =====================================================
    // F-8.2 — DUPLICATE CHECK
    // =====================================================

    function findHospitalDuplicate(
        name,
        nameBn
    ) {

        const normalizedName =
            String(
                name || ""
            )
                .trim()
                .toLocaleLowerCase();


        const normalizedNameBn =
            String(
                nameBn || ""
            )
                .trim()
                .toLocaleLowerCase();


        return (
            state.hospitals.find(
                function (hospital) {

                    // Edit করার সময় একই hospital-কে duplicate
                    // হিসেবে ধরা হবে না
                    if (
                        state.editingHospitalId &&
                        hospital.id === state.editingHospitalId
                    ) {
                        return false;
                    }


                    const existingName =
                        String(
                            hospital.name || ""
                        )
                            .trim()
                            .toLocaleLowerCase();


                    const existingNameBn =
                        String(
                            hospital.name_bn || ""
                        )
                            .trim()
                            .toLocaleLowerCase();


                    return (
                        (
                            normalizedName &&
                            existingName ===
                            normalizedName
                        ) ||
                        (
                            normalizedNameBn &&
                            existingNameBn ===
                            normalizedNameBn
                        )
                    );

                }
            ) || null
        );

    }


    // =====================================================
    // F-8.2 — PAYLOAD
    // =====================================================

    function getHospitalPayload() {

        const getValue =
            function (id) {

                const element =
                    get(id);

                return element
                    ? String(
                        element.value || ""
                    ).trim()
                    : "";

            };


        const getNumber =
            function (id) {

                const value =
                    getValue(id);

                if (!value) {
                    return null;
                }

                const number =
                    Number(value);

                return Number.isFinite(
                    number
                )
                    ? number
                    : null;

            };


        const active =
            get("hospitalActive");

        const verified =
            get("hospitalVerified");


        return {

            name:
                getValue(
                    "hospitalName"
                ),

            name_bn:
                getValue(
                    "hospitalNameBn"
                ),

            hospital_type:
                getValue(
                    "hospitalType"
                ),

            division_id:
                getValue(
                    "hospitalDivision"
                ) || null,

            district_id:
                getValue(
                    "hospitalDistrict"
                ) || null,

            upazila_id:
                getValue(
                    "hospitalUpazila"
                ) || null,

            address:
                getValue(
                    "hospitalAddress"
                ) || null,

            phone:
                getValue(
                    "hospitalPhone"
                ),

            emergency_phone:
                getValue(
                    "hospitalEmergencyPhone"
                ) || null,

            email:
                getValue(
                    "hospitalEmail"
                ) || null,

            website:
                getValue(
                    "hospitalWebsite"
                ) || null,

            description:
                getValue(
                    "hospitalDescription"
                ) || null,

            latitude:
                getNumber(
                    "hospitalLatitude"
                ),

            longitude:
                getNumber(
                    "hospitalLongitude"
                ),

            is_verified:
                verified
                    ? verified.checked
                    : false,

            is_active:
                active
                    ? active.checked
                    : true

        };

    }


    // =====================================================
    // F-8.2 — SAVE BUTTON STATE
    // =====================================================

    function setHospitalSaving(
        saving
    ) {

        const button =
            get("hospitalSaveBtn");

        if (!button) {
            return;
        }


        button.disabled =
            saving;


        button.textContent =
            saving
                ? "Saving..."
                : "Save Hospital";

    }


    // =====================================================
    // F-8.2 — SAVE HOSPITAL
    // =====================================================

    async function saveHospital() {

        const button =
            get("hospitalSaveBtn");


        if (
            button &&
            button.disabled
        ) {
            return;
        }


        if (
            !validateHospitalForm()
        ) {

            showToast(
                "দয়া করে প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।"
            );

            return;

        }


        const payload =
            getHospitalPayload();


        // ---------------------------------------------
        // Duplicate
        // ---------------------------------------------

        const duplicate =
            findHospitalDuplicate(
                payload.name,
                payload.name_bn
            );


        if (duplicate) {

            const sameName =
                String(
                    duplicate.name || ""
                )
                    .trim()
                    .toLocaleLowerCase() ===
                payload.name
                    .trim()
                    .toLocaleLowerCase();


            if (sameName) {

                setHospitalFieldError(
                    get("hospitalName"),
                    "এই Hospital name ইতোমধ্যে আছে।"
                );

            } else {

                setHospitalFieldError(
                    get("hospitalNameBn"),
                    "এই বাংলা নাম ইতোমধ্যে আছে।"
                );

            }


            showToast(
                "Duplicate Hospital পাওয়া গেছে।"
            );

            return;

        }


        setHospitalSaving(true);


        try {



            let result;


            if (state.editingHospitalId) {

                result =
                    await state.supabase
                        .from("hospitals")
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            state.editingHospitalId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await state.supabase
                        .from("hospitals")
                        .insert(
                            payload
                        )
                        .select()
                        .single();

            }


            const data =
                result.data;

            const error =
                result.error;


            if (error) {

                console.error(
                    "Hospital Save/Update Error:",
                    error
                );

                throw error;

            }


            if (!data) {

                throw new Error(
                    state.editingHospitalId
                        ? "Hospital update সফল হয়নি।"
                        : "Hospital insert সফল হয়নি।"
                );

            }



            showToast(
                state.editingHospitalId
                    ? "Hospital সফলভাবে update হয়েছে।"
                    : "Hospital সফলভাবে যোগ হয়েছে।"
            );

            // Close modal
            closeModal();

            state.editingHospitalId = null;


            // Refresh list + statistics
            await loadHospitals();


            console.log(
                "Hospital added successfully:",
                data
            );


        } catch (error) {

            console.error(
                "Hospital Add Error:",
                error
            );


            if (
                error &&
                error.code ===
                "23505"
            ) {

                showToast(
                    "এই Hospital তথ্যটি আগে থেকেই আছে।"
                );

            } else if (
                error &&
                error.code ===
                "42501"
            ) {

                showToast(
                    "Hospital যোগ করার অনুমতি নেই।"
                );

            } else {

                showToast(
                    (
                        error &&
                        error.message
                    )
                        ? error.message
                        : "Hospital সংরক্ষণ করা যায়নি।"
                );

            }


        } finally {

            setHospitalSaving(
                false
            );

        }

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

                                ${hospital.name &&
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

                                    ${hospital.hospital_type
                            ? `
                                                <span class="hospital-badge">
                                                    ${escapeHTML(
                                hospital.hospital_type
                            )}
                                                </span>
                                              `
                            : ""
                        }


                                    ${locationParts.length
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


                                ${hospital.phone
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
        state.editingHospitalId = null;

        const modal =
            get("hospitalModal");

        const form =
            get("hospitalForm");

        if (!modal) {
            return;
        }



        // ---------------------------------------------
        // F-8.2 — Reset form for new Hospital
        // ---------------------------------------------

        if (form) {
            form.reset();
        }


        const hospitalId =
            get("hospitalId");

        if (hospitalId) {
            hospitalId.value = "";
        }


        const hospitalActive =
            get("hospitalActive");

        if (hospitalActive) {
            hospitalActive.checked = true;
        }


        const hospitalVerified =
            get("hospitalVerified");

        if (hospitalVerified) {
            hospitalVerified.checked = false;
        }


        // ---------------------------------------------
        // Reset location dependency
        // ---------------------------------------------

        const district =
            get("hospitalDistrict");

        if (district) {

            district.innerHTML = `
            <option value="">
                Select District
            </option>
        `;

            district.disabled = true;
        }


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


        // ---------------------------------------------
        // Clear previous validation state
        // ---------------------------------------------

        document
            .querySelectorAll(
                ".hospital-field-error"
            )
            .forEach(function (element) {

                element.remove();

            });


        document
            .querySelectorAll(
                ".hospital-input-error"
            )
            .forEach(function (element) {

                element.classList.remove(
                    "hospital-input-error"
                );

            });


        // ---------------------------------------------
        // Open modal
        // ---------------------------------------------

        modal.classList.add("is-open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        const title =
            get("hospitalModalTitle");

        if (title) {

            title.textContent =
                "Add Hospital";

        }


        const saveButton =
            get("hospitalSaveBtn");

        if (saveButton) {

            saveButton.textContent =
                "Save Hospital";

        }

    }


    function openEditModal(hospitalId) {

        const hospital =
            state.hospitals.find(
                function (item) {
                    return item.id === hospitalId;
                }
            );


        if (!hospital) {

            showToast(
                "Hospital তথ্য পাওয়া যায়নি।"
            );

            return;

        }


        state.editingHospitalId =
            hospital.id;


        const form =
            get("hospitalForm");

        if (form) {
            form.reset();
        }


        clearHospitalFormErrors();


        get("hospitalId").value =
            hospital.id || "";


        get("hospitalName").value =
            hospital.name || "";


        get("hospitalNameBn").value =
            hospital.name_bn || "";


        get("hospitalType").value =
            hospital.hospital_type || "";


        get("hospitalAddress").value =
            hospital.address || "";


        get("hospitalPhone").value =
            hospital.phone || "";


        get("hospitalEmergencyPhone").value =
            hospital.emergency_phone || "";


        get("hospitalEmail").value =
            hospital.email || "";


        get("hospitalWebsite").value =
            hospital.website || "";


        get("hospitalDescription").value =
            hospital.description || "";


        get("hospitalLatitude").value =
            hospital.latitude ??
            "";


        get("hospitalLongitude").value =
            hospital.longitude ??
            "";


        const verified =
            get("hospitalVerified");

        if (verified) {

            verified.checked =
                hospital.is_verified === true;

        }


        const active =
            get("hospitalActive");

        if (active) {

            active.checked =
                hospital.is_active === true;

        }


        const saveButton =
            get("hospitalSaveBtn");

        if (saveButton) {

            saveButton.textContent =
                "Update Hospital";

        }


        // ---------------------------------------------
        // Division
        // ---------------------------------------------

        const division =
            get("hospitalDivision");

        if (division) {

            division.value =
                hospital.division_id || "";

        }


        // ---------------------------------------------
        // District
        // ---------------------------------------------

        renderDistrictOptions(
            hospital.division_id || "",
            "hospitalDistrict",
            "Select District"
        );


        const district =
            get("hospitalDistrict");

        if (district) {

            district.value =
                hospital.district_id || "";

        }


        // ---------------------------------------------
        // Upazila
        // ---------------------------------------------

        renderUpazilaOptions(
            hospital.district_id || "",
            "hospitalUpazila",
            "Select Upazila"
        );


        const upazila =
            get("hospitalUpazila");

        if (upazila) {

            upazila.value =
                hospital.upazila_id || "";

        }


        // ---------------------------------------------
        // Modal title
        // ---------------------------------------------

        const title =
            get("hospitalModalTitle");

        if (title) {

            title.textContent =
                "Edit Hospital";

        }


        const modal =
            get("hospitalModal");

        if (!modal) {
            return;
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


        const nameField =
            get("hospitalName");

        if (nameField) {

            setTimeout(
                function () {
                    nameField.focus();
                },
                0
            );

        }

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


        const form =
            get("hospitalForm");

        if (form) {
            form.reset();
        }


        const district =
            get("hospitalDistrict");

        if (district) {

            district.innerHTML = `
                <option value="">
                    Select District
                </option>
            `;

            district.disabled = true;

        }


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


        clearHospitalFormErrors();

        state.editingHospitalId = null;

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

                    saveHospital();

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


                    openEditModal(
                        button.dataset.id
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


}) ();
