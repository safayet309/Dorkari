 // =========================================================
// DORKARI — PUBLIC HOME JAVASCRIPT
// User-facing interactions, location state and emergency UI
// =========================================================

"use strict";


// =========================================================
// SUPABASE
// =========================================================

const supabaseConfig =
    typeof DORKARI_CONFIG !== "undefined" &&
        DORKARI_CONFIG?.SUPABASE
        ? DORKARI_CONFIG.SUPABASE
        : null;

const dorkariSupabase =
    window.supabase &&
        typeof window.supabase.createClient ===
        "function" &&
        supabaseConfig?.URL &&
        supabaseConfig?.PUBLISHABLE_KEY
        ? window.supabase.createClient(
            supabaseConfig.URL,
            supabaseConfig.PUBLISHABLE_KEY
        )
        : null;

// =========================================================
// DOM HELPERS
// =========================================================

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));


// =========================================================
// TOAST
// =========================================================

const toast =
    $("#toast");


function showToast(message) {

    if (!toast) return;

    toast.textContent =
        String(message ?? "");

    toast.classList.add("show");

    clearTimeout(
        window.dorkariToastTimer
    );

    window.dorkariToastTimer =
        window.setTimeout(() => {

            toast.classList.remove("show");

        }, 2400);
}


// =========================================================
// SAFE TEXT HELPERS
// =========================================================

function cleanText(value) {

    return String(value ?? "")
        .trim();
}


function escapeHTML(value) {

    return cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getDisplayName(record) {

    return (
        cleanText(record?.name_bn) ||
        cleanText(record?.name) ||
        "নাম পাওয়া যায়নি"
    );
}


function getPhone(record) {

    return (
        cleanText(record?.phone) ||
        cleanText(record?.emergency_phone) ||
        ""
    );
}


function normalizePhone(phone) {

    const bengaliDigits =
        "০১২৩৪৫৬৭৮৯";

    return cleanText(phone)
        .replace(
            /[০-৯]/g,
            (digit) =>
                bengaliDigits.indexOf(
                    digit
                )
        )
        .replace(
            /[^\d+]/g,
            ""
        );
}


function getLocationLabel(
    division,
    district,
    upazila
) {

    return [
        division,
        district,
        upazila
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(" → ");
}


// =========================================================
// LOCAL STORAGE
// =========================================================

const LOCATION_STORAGE_KEY =
    "dorkari.home.location";


function saveHomeLocation(data) {

    try {

        localStorage.setItem(
            LOCATION_STORAGE_KEY,
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "Location save failed:",
            error
        );
    }
}


function getSavedHomeLocation() {

    try {

        const stored =
            localStorage.getItem(
                LOCATION_STORAGE_KEY
            );

        if (!stored) {
            return null;
        }

        const parsed =
            JSON.parse(stored);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return null;
        }

        return parsed;

    } catch (error) {

        console.warn(
            "Location restore failed:",
            error
        );

        return null;
    }
}


function clearSavedHomeLocation() {

    try {

        localStorage.removeItem(
            LOCATION_STORAGE_KEY
        );

    } catch (error) {

        console.warn(
            "Location clear failed:",
            error
        );
    }
}


// =========================================================
// COPY SYSTEM
// =========================================================

async function copyText(
    value,
    successMessage = "✓ কপি হয়েছে"
) {

    const text =
        cleanText(value);

    if (!text) {
        return false;
    }

    try {

        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText ===
            "function"
        ) {

            await navigator.clipboard.writeText(
                text
            );

        } else {

            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value =
                text;

            textarea.setAttribute(
                "readonly",
                ""
            );

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();
        }

        showToast(
            successMessage
        );

        return true;

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

        showToast(
            "কপি করা যায়নি"
        );

        return false;
    }
}


// =========================================================
// GLOBAL COPY BUTTONS
// =========================================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "[data-copy]"
            );

        if (!button) {
            return;
        }

        const value =
            cleanText(
                button.dataset.copy
            );

        if (!value) {
            return;
        }

        await copyText(
            value,
            "✓ নম্বরটি কপি হয়েছে"
        );
    }
);


// =========================================================
// MOBILE MENU
// =========================================================

function initializeMobileMenu() {

    const button =
        $("#mobileMenuButton");

    const menu =
        $("#mobileMenu");

    if (!button || !menu) {
        return;
    }


    const closeMenu = () => {

        menu.hidden = true;

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        button.setAttribute(
            "aria-label",
            "মেনু খুলুন"
        );

        document.body.classList.remove(
            "menu-open"
        );
    };


    const openMenu = () => {

        menu.hidden = false;

        button.setAttribute(
            "aria-expanded",
            "true"
        );

        button.setAttribute(
            "aria-label",
            "মেনু বন্ধ করুন"
        );

        document.body.classList.add(
            "menu-open"
        );
    };


    button.addEventListener(
        "click",
        () => {

            const isOpen =
                button.getAttribute(
                    "aria-expanded"
                ) === "true";

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }
    );


    menu.addEventListener(
        "click",
        (event) => {

            const link =
                event.target.closest(
                    "a[href^='#']"
                );

            if (link) {
                closeMenu();
            }
        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {
                closeMenu();
            }
        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (menu.hidden) {
                return;
            }

            const clickedInside =
                menu.contains(
                    event.target
                );

            const clickedButton =
                button.contains(
                    event.target
                );

            if (
                !clickedInside &&
                !clickedButton
            ) {
                closeMenu();
            }
        }
    );


    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 900) {
                closeMenu();
            }
        },
        {
            passive: true
        }
    );
}


// =========================================================
// SEARCH
// =========================================================

const searchInput =
    $("#globalSearch");

const searchButton =
    $("#searchButton");

const searchForm =
    $("#globalSearchForm");


const searchLabels = {

    Hospital:
        "হাসপাতাল",

    Doctor:
        "ডাক্তার",

    Ambulance:
        "অ্যাম্বুলেন্স",

    "Blood Bank":
        "ব্লাড ব্যাংক",

    emergency:
        "জরুরি সেবা",

    hospital:
        "হাসপাতাল",

    doctor:
        "ডাক্তার",

    ambulance:
        "অ্যাম্বুলেন্স",

    government:
        "সরকারি সেবা",

    tests:
        "টেস্ট ও ফি",

    blood:
        "ব্লাড ব্যাংক",

    pharmacy:
        "ফার্মেসি"
};


function getSearchDisplayLabel(query) {

    return (
        searchLabels[query] ||
        query
    );
}


function focusSearch() {

    if (!searchInput) {
        return;
    }

    searchInput.focus();

    searchInput.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function handleSearch(
    queryOverride = null
) {

    const query =
        cleanText(
            queryOverride ??
            searchInput?.value
        );

    if (!query) {

        showToast(
            "আপনি কী খুঁজছেন লিখুন"
        );

        focusSearch();

        return;
    }


    if (
        searchInput &&
        queryOverride !== null
    ) {

        searchInput.value =
            query;
    }


    const label =
        getSearchDisplayLabel(
            query
        );


    console.info(
        "Dorkari search:",
        query
    );


    /*
     * Real public search results page
     * পরের development phase-এ connect হবে।
     * এখন user feedback পরিষ্কার রাখা হচ্ছে।
     */

    showToast(
        `“${label}” খোঁজা হচ্ছে...`
    );
}


function initializeSearch() {

    searchButton?.addEventListener(
        "click",
        () => {
            handleSearch();
        }
    );


    searchForm?.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            handleSearch();
        }
    );


    searchInput?.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();

            handleSearch();
        }
    );


    $$(".search-suggestions [data-search]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    handleSearch(
                        button.dataset.search
                    );

                    searchInput?.focus();
                }
            );
        });
}


// =========================================================
// BOTTOM SEARCH
// =========================================================

function initializeBottomSearch() {

    /*
     * Bottom Search এখন
     * initializeBottomNavigation()
     * দ্বারা সম্পূর্ণভাবে handle করা হয়।
     *
     * এখানে আলাদা click listener রাখা হয়নি,
     * যাতে একই button-এ duplicate action না হয়।
     */
}


// =========================================================
// SERVICE CARDS
// =========================================================

const serviceLabels = {

    emergency:
        "জরুরি সেবা",

    hospital:
        "হাসপাতাল",

    doctor:
        "ডাক্তার",

    ambulance:
        "অ্যাম্বুলেন্স",

    government:
        "সরকারি সেবা",

    tests:
        "টেস্ট ও ফি",

    blood:
        "ব্লাড ব্যাংক",

    pharmacy:
        "ফার্মেসি"
};

// =========================================================
// SERVICE INTERFACE SYSTEM
// =========================================================

let activeServiceInterface =
    null;

let previousScrollPosition =
    0;


function getServiceInterfaceLayer() {

    return $(
        "#serviceInterfaceLayer"
    );
}


function getServiceInterfaces() {

    return $$(
        ".service-interface[data-interface]"
    );
}


function getServiceInterface(
    service
) {

    return document.querySelector(
        `.service-interface[data-interface="${CSS.escape(
            service
        )}"]`
    );
}


function openServiceInterface(
    service,
    options = {}
) {

    const pushHistory =
        options.pushHistory !== false;

    const layer =
        getServiceInterfaceLayer();

    const interfaceElement =
        getServiceInterface(
            service
        );

    if (
        !layer ||
        !interfaceElement
    ) {

        console.warn(
            "Service interface not found:",
            service
        );

        showToast(
            "এই সেবার interface পাওয়া যায়নি"
        );

        return;
    }


    /*
     * যদি আগের কোনো interface খোলা থাকে,
     * আগে সেটা বন্ধ করি।
     */

    getServiceInterfaces()
        .forEach((item) => {

            item.hidden =
                true;

            item.setAttribute(
                "aria-hidden",
                "true"
            );
        });


    /*
     * User কোথা থেকে interface-এ গেল
     * সেটা মনে রাখি।
     */

    previousScrollPosition =
        window.scrollY;


    activeServiceInterface =
        service;


    /*
     * Selected interface দেখাই।
     */

    interfaceElement.hidden =
        false;

    interfaceElement.setAttribute(
        "aria-hidden",
        "false"
    );


    layer.hidden =
        false;

    layer.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "service-interface-open"
    );


    /*
     * Body scrolling এখন CSS দ্বারা
     * control করা যাবে।
     */

    document.documentElement.classList.add(
        "service-interface-open"
    );


    /*
     * Accessibility:
     * interface-এর heading-এ focus।
     */

    const heading =
        interfaceElement.querySelector(
            "h2"
        );


    if (heading) {

        heading.setAttribute(
            "tabindex",
            "-1"
        );

        window.requestAnimationFrame(
            () => {

                heading.focus({
                    preventScroll: true
                });

            }
        );
    }


    /*
     * Interface layer-এর শুরুতে যাই।
     */

    window.requestAnimationFrame(
        () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    /*
     * Browser history-তে state রাখি।
     * ফলে browser back চাপলেও
     * interface বন্ধ করা যাবে।
     */

    if (pushHistory) {

        try {

            window.history.pushState(
                {
                    dorkariService:
                        service
                },
                "",
                `#${service}`
            );

        } catch (error) {

            console.warn(
                "History state failed:",
                error
            );
        }
    }


    /*
     * Mobile menu খোলা থাকলে বন্ধ করি।
     */

    closeMobileMenu();
}


function closeServiceInterface(
    restoreScroll = true
) {

    const layer =
        getServiceInterfaceLayer();


    if (!layer) {
        return;
    }


    getServiceInterfaces()
        .forEach((item) => {

            item.hidden =
                true;

            item.setAttribute(
                "aria-hidden",
                "true"
            );
        });


    layer.hidden =
        true;

    layer.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "service-interface-open"
    );

    document.documentElement.classList.remove(
        "service-interface-open"
    );


    const shouldRestore =
        restoreScroll &&
        Number.isFinite(
            previousScrollPosition
        );


    activeServiceInterface =
        null;


    if (typeof setActiveBottomNav === "function") {
        setActiveBottomNav("home");
    }


    /*
     * #service বা #hospital টাইপ hash
     * Home URL থেকে সরিয়ে দিই।
     */

    try {

        const currentUrl =
            new URL(
                window.location.href
            );

        currentUrl.hash =
            "";

        window.history.replaceState(
            {},
            "",
            currentUrl.toString()
        );

    } catch (error) {

        console.warn(
            "URL cleanup failed:",
            error
        );
    }


    if (shouldRestore) {

        window.requestAnimationFrame(
            () => {

                window.scrollTo({
                    top:
                        previousScrollPosition,
                    behavior:
                        "smooth"
                });

            }
        );
    }
}
// =========================================================
// GLOBAL LOCATION NAME HELPER
// Doctor / Hospital public interface থেকে ব্যবহারযোগ্য
// =========================================================

function getLocationNameById(
    collection,
    id
) {

    if (!id) {
        return "";
    }


    const item =
        (collection || []).find(
            (entry) =>
                String(entry.id) ===
                String(id)
        );


    if (!item) {
        return "";
    }


    return (
        cleanText(item.name_bn) ||
        cleanText(item.name) ||
        ""
    );
}

// =========================================================
// DOCTOR PUBLIC DATA
// =========================================================

let doctorState = {
    doctors: [],
    hospitals: [],
    filtered: [],
    loading: false,
    loaded: false,
    locationOnly: false,
    currentPage: 1,
    pageSize: 12
};


// =========================================================
// DOCTOR DOM
// =========================================================

function getDoctorElements() {
    return {
        interface:
            getServiceInterface("doctor"),

        search:
            document.querySelector(
                '[data-interface-search="doctor"]'
            ),

        locationButton:
            document.querySelector(
                '[data-interface-location="doctor"]'
            ),

        specialtyFilter:
            document.querySelector(
                '[data-doctor-filter="specialty"]'
            ),

        hospitalFilter:
            document.querySelector(
                '[data-doctor-filter="hospital"]'
            ),

        divisionFilter:
            document.querySelector(
                '[data-doctor-filter="division"]'
            ),

        results:
            document.querySelector(
                '[data-interface-results="doctor"]'
            )
    };
}


// =========================================================
// DOCTOR HOSPITAL LABEL
// =========================================================

function getDoctorHospitalNames(
    doctor
) {
    return (
        doctor?.hospitalAssignments || []
    )
        .map(
            (assignment) =>
                cleanText(
                    assignment?.hospital?.name_bn
                ) ||
                cleanText(
                    assignment?.hospital?.name
                )
        )
        .filter(Boolean);
}


// =========================================================
// DOCTOR LOCATION LABEL
// =========================================================

function getDoctorLocationLabel(
    doctor
) {
    const divisionName =
        getLocationNameById(
            homeLocationState.divisions,
            doctor?.division_id
        );

    const districtName =
        getLocationNameById(
            homeLocationState.districts,
            doctor?.district_id
        );

    const upazilaName =
        getLocationNameById(
            homeLocationState.upazilas,
            doctor?.upazila_id
        );

    return getLocationLabel(
        divisionName,
        districtName,
        upazilaName
    );
}


// =========================================================
// DOCTOR SAVED LOCATION MATCH
// =========================================================

function doctorMatchesLocation(
    doctor,
    saved
) {
    if (!saved) {
        return true;
    }


    if (saved.upazilaId) {
        return (
            String(
                doctor?.upazila_id
            ) ===
            String(
                saved.upazilaId
            )
        );
    }


    if (saved.districtId) {
        return (
            String(
                doctor?.district_id
            ) ===
            String(
                saved.districtId
            )
        );
    }


    if (saved.divisionId) {
        return (
            String(
                doctor?.division_id
            ) ===
            String(
                saved.divisionId
            )
        );
    }


    return true;
}


// =========================================================
// DOCTOR FILTER OPTIONS
// =========================================================

function populateDoctorFilters() {

    const {
        specialtyFilter,
        hospitalFilter,
        divisionFilter
    } =
        getDoctorElements();


    /*
     * SPECIALIZATION
     */

    if (specialtyFilter) {

        const specializations =
            Array.from(
                new Set(
                    doctorState.doctors
                        .map(
                            (doctor) =>
                                cleanText(
                                    doctor.specialization
                                )
                        )
                        .filter(Boolean)
                )
            ).sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "bn"
                    )
            );


        specialtyFilter.innerHTML = `
            <option value="">
                সব বিশেষজ্ঞতা
            </option>
        `;


        specializations.forEach(
            (specialization) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    specialization;

                option.textContent =
                    specialization;

                specialtyFilter.appendChild(
                    option
                );
            }
        );
    }


    /*
     * HOSPITAL
     */

    if (hospitalFilter) {

        const hospitals =
            [...doctorState.hospitals]
                .sort(
                    (a, b) => {

                        const aName =
                            cleanText(
                                a.name_bn
                            ) ||
                            cleanText(
                                a.name
                            );

                        const bName =
                            cleanText(
                                b.name_bn
                            ) ||
                            cleanText(
                                b.name
                            );

                        return aName.localeCompare(
                            bName,
                            "bn"
                        );
                    }
                );


        hospitalFilter.innerHTML = `
            <option value="">
                সব হাসপাতাল
            </option>
        `;


        hospitals.forEach(
            (hospital) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    hospital.id;

                option.textContent =
                    cleanText(
                        hospital.name_bn
                    ) ||
                    cleanText(
                        hospital.name
                    ) ||
                    "নাম পাওয়া যায়নি";

                hospitalFilter.appendChild(
                    option
                );
            }
        );
    }


    /*
     * DIVISION
     */

    if (divisionFilter) {

        fillLocationSelect(
            divisionFilter,
            homeLocationState.divisions,
            "সব বিভাগ"
        );

        divisionFilter.disabled =
            homeLocationState.divisions.length === 0;
    }
}


// =========================================================
// DOCTOR SEARCHABLE TEXT
// =========================================================

function getDoctorSearchText(
    doctor
) {

    const hospitalNames =
        getDoctorHospitalNames(
            doctor
        );


    return [
        doctor?.name,
        doctor?.name_bn,
        doctor?.degree,
        doctor?.specialization,
        doctor?.department,
        doctor?.chamber_info,
        doctor?.visiting_hours,
        getDoctorLocationLabel(
            doctor
        ),
        ...hospitalNames
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


// =========================================================
// DOCTOR FILTERING
// =========================================================

function applyDoctorFilters() {

    const {
        search,
        specialtyFilter,
        hospitalFilter,
        divisionFilter
    } =
        getDoctorElements();


    const searchText =
        cleanText(
            search?.value
        ).toLowerCase();


    const specialization =
        cleanText(
            specialtyFilter?.value
        );


    const hospitalId =
        cleanText(
            hospitalFilter?.value
        );


    const divisionId =
        cleanText(
            divisionFilter?.value
        );


    const savedLocation =
        getSavedHomeLocation();


    doctorState.filtered =
        doctorState.doctors.filter(
            (doctor) => {

                /*
                 * SPECIALIST
                 */

                if (
                    specialization &&
                    cleanText(
                        doctor.specialization
                    ) !==
                    specialization
                ) {
                    return false;
                }


                /*
                 * HOSPITAL
                 */

                if (hospitalId) {

                    const matchesHospital =
                        (
                            doctor
                                .hospitalAssignments ||
                            []
                        ).some(
                            (assignment) =>
                                String(
                                    assignment?.hospital_id
                                ) ===
                                String(
                                    hospitalId
                                )
                        );


                    if (
                        !matchesHospital
                    ) {
                        return false;
                    }
                }


                /*
                 * DIVISION
                 */

                if (
                    divisionId &&
                    String(
                        doctor.division_id
                    ) !==
                    String(
                        divisionId
                    )
                ) {
                    return false;
                }


                /*
                 * SAVED HOME LOCATION
                 */

                if (
                    doctorState.locationOnly &&
                    !doctorMatchesLocation(
                        doctor,
                        savedLocation
                    )
                ) {
                    return false;
                }


                /*
                 * TEXT SEARCH
                 */

                if (!searchText) {
                    return true;
                }


                return getDoctorSearchText(
                    doctor
                ).includes(
                    searchText
                );
            }
        );


    doctorState.currentPage =
        1;


    renderDoctorResults();
}


// =========================================================
// DOCTOR CARD
// =========================================================

function buildDoctorCard(
    doctor
) {

    const name =
        getDisplayName(
            doctor
        );


    const englishName =
        cleanText(
            doctor?.name
        );


    const degree =
        cleanText(
            doctor?.degree
        );


    const specialization =
        cleanText(
            doctor?.specialization
        );


    const department =
        cleanText(
            doctor?.department
        );


    const phone =
        cleanText(
            doctor?.phone
        );


    const chamberInfo =
        cleanText(
            doctor?.chamber_info
        );


    const visitingHours =
        cleanText(
            doctor?.visiting_hours
        );


    const locationLabel =
        getDoctorLocationLabel(
            doctor
        );


    const hospitalNames =
        getDoctorHospitalNames(
            doctor
        );


    const verifiedBadge =
        doctor?.is_verified
            ? `
                <span
                    class="doctor-interface-badge is-verified"
                >
                    ✓ যাচাইকৃত
                </span>
            `
            : `
                <span
                    class="doctor-interface-badge"
                >
                    যাচাই চলমান
                </span>
            `;


    const specialtyBadge =
        specialization
            ? `
                <span
                    class="doctor-interface-badge"
                >
                    ${escapeHTML(
                specialization
            )}
                </span>
            `
            : "";


    const phoneAction =
        phone
            ? `
                <a
                    href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                    class="doctor-interface-action is-primary"
                >
                    ☎ কল করুন
                </a>
            `
            : "";


    const hospitalBlock =
        hospitalNames.length
            ? `
                <div
                    class="doctor-interface-meta"
                >
                    <span
                        aria-hidden="true"
                    >
                        ♧
                    </span>

                    <span>
                        ${hospitalNames
                .map(
                    (hospitalName) =>
                        escapeHTML(
                            hospitalName
                        )
                )
                .join(
                    " · "
                )}
                    </span>
                </div>
            `
            : "";


    const locationBlock =
        locationLabel
            ? `
                <div
                    class="doctor-interface-meta"
                >
                    <span
                        aria-hidden="true"
                    >
                        ◇
                    </span>

                    <span>
                        ${escapeHTML(
                locationLabel
            )}
                    </span>
                </div>
            `
            : "";


    const phoneBlock =
        phone
            ? `
                <div
                    class="doctor-interface-phone"
                >
                    ${escapeHTML(
                phone
            )}
                </div>
            `
            : "";


    return `
        <article
            class="doctor-interface-card"
        >

            <div
                class="doctor-interface-card-main"
            >

                <div
                    class="doctor-interface-avatar"
                    aria-hidden="true"
                >
                    D
                </div>


                <div
                    class="doctor-interface-card-content"
                >

                    <div
                        class="doctor-interface-card-heading"
                    >

                        <div>

                            <h3
                                class="doctor-interface-card-title"
                            >
                                ${escapeHTML(
        name
    )}
                            </h3>


                            ${englishName &&
            englishName !== name
            ? `
                                        <p
                                            class="doctor-interface-card-subtitle"
                                        >
                                            ${escapeHTML(
                englishName
            )}
                                        </p>
                                    `
            : ""
        }

                        </div>


                        <span
                            class="doctor-interface-card-mark"
                            aria-hidden="true"
                        >
                            ♡
                        </span>

                    </div>


                    <div
                        class="doctor-interface-badges"
                    >
                        ${specialtyBadge}
                        ${verifiedBadge}
                    </div>


                    ${degree
            ? `
                                <div
                                    class="doctor-interface-qualification"
                                >
                                    ${escapeHTML(
                degree
            )}
                                </div>
                            `
            : ""
        }


                    ${department
            ? `
                                <div
                                    class="doctor-interface-department"
                                >
                                    ${escapeHTML(
                department
            )}
                                </div>
                            `
            : ""
        }

                </div>

            </div>


            ${hospitalBlock}
            ${locationBlock}
            ${phoneBlock}


            <div
                class="doctor-interface-actions"
            >
                ${phoneAction}
            </div>


            <details
                class="doctor-interface-details"
            >

                <summary>
                    বিস্তারিত দেখুন
                </summary>


                <div
                    class="doctor-interface-details-body"
                >

                    ${degree
            ? `
                                <p>
                                    <strong>
                                        ডিগ্রি:
                                    </strong>

                                    ${escapeHTML(
                degree
            )}
                                </p>
                            `
            : ""
        }


                    ${specialization
            ? `
                                <p>
                                    <strong>
                                        বিশেষজ্ঞতা:
                                    </strong>

                                    ${escapeHTML(
                specialization
            )}
                                </p>
                            `
            : ""
        }


                    ${department
            ? `
                                <p>
                                    <strong>
                                        বিভাগ:
                                    </strong>

                                    ${escapeHTML(
                department
            )}
                                </p>
                            `
            : ""
        }


                    ${hospitalNames.length
            ? `
                                <p>
                                    <strong>
                                        হাসপাতাল:
                                    </strong>

                                    ${hospitalNames
                .map(
                    (
                        hospitalName
                    ) =>
                        escapeHTML(
                            hospitalName
                        )
                )
                .join(
                    " · "
                )}
                                </p>
                            `
            : ""
        }


                    ${chamberInfo
            ? `
                                <p>
                                    <strong>
                                        চেম্বার:
                                    </strong>

                                    ${escapeHTML(
                chamberInfo
            )}
                                </p>
                            `
            : ""
        }


                    ${visitingHours
            ? `
                                <p>
                                    <strong>
                                        ভিজিটিং সময়:
                                    </strong>

                                    ${escapeHTML(
                visitingHours
            )}
                                </p>
                            `
            : ""
        }


                    ${locationLabel
            ? `
                                <p>
                                    <strong>
                                        লোকেশন:
                                    </strong>

                                    ${escapeHTML(
                locationLabel
            )}
                                </p>
                            `
            : ""
        }


                    ${phone
            ? `
                                <p>
                                    <strong>
                                        ফোন:
                                    </strong>

                                    <a
                                        href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                                    >
                                        ${escapeHTML(
                phone
            )}
                                    </a>
                                </p>
                            `
            : ""
        }

                </div>

            </details>

        </article>
    `;
}


// =========================================================
// DOCTOR PAGINATION
// =========================================================

function renderDoctorPagination(
    totalPages
) {

    if (
        totalPages <= 1
    ) {
        return "";
    }


    const currentPage =
        doctorState.currentPage;


    const pageButtons = [];


    const startPage =
        Math.max(
            1,
            currentPage - 2
        );


    const endPage =
        Math.min(
            totalPages,
            startPage + 4
        );


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        pageButtons.push(`
            <button
                type="button"
                class="doctor-interface-page ${page === currentPage
                ? "is-active"
                : ""
            }"
                data-doctor-page="${page}"
                aria-label="পৃষ্ঠা ${page}"
                ${page === currentPage
                ? 'aria-current="page"'
                : ""
            }
            >
                ${page}
            </button>
        `);
    }


    return `
        <div
            class="doctor-interface-pagination"
        >

            <button
                type="button"
                class="doctor-interface-page"
                data-doctor-page="${Math.max(
        1,
        currentPage - 1
    )
        }"
                ${currentPage === 1
            ? "disabled"
            : ""
        }
                aria-label="আগের পৃষ্ঠা"
            >
                ←
            </button>


            ${pageButtons.join("")}


            <button
                type="button"
                class="doctor-interface-page"
                data-doctor-page="${Math.min(
            totalPages,
            currentPage + 1
        )
        }"
                ${currentPage === totalPages
            ? "disabled"
            : ""
        }
                aria-label="পরের পৃষ্ঠা"
            >
                →
            </button>

        </div>
    `;
}


// =========================================================
// DOCTOR RESULTS
// =========================================================

function renderDoctorResults() {

    const {
        results
    } =
        getDoctorElements();


    if (!results) {
        return;
    }


    if (
        doctorState.filtered.length === 0
    ) {

        let message =
            "কোনো ডাক্তারের তথ্য পাওয়া যায়নি।";


        if (
            doctorState.locationOnly
        ) {
            message =
                "আপনার নির্বাচিত এলাকায় কোনো ডাক্তার পাওয়া যায়নি।";
        }


        results.innerHTML = `
            <div
                class="interface-empty"
            >
                ${escapeHTML(
            message
        )}
            </div>
        `;


        return;
    }


    const total =
        doctorState.filtered.length;


    const totalPages =
        Math.ceil(
            total /
            doctorState.pageSize
        );


    if (
        doctorState.currentPage >
        totalPages
    ) {
        doctorState.currentPage =
            totalPages;
    }


    const startIndex =
        (
            doctorState.currentPage -
            1
        ) *
        doctorState.pageSize;


    const currentDoctors =
        doctorState.filtered.slice(
            startIndex,
            startIndex +
            doctorState.pageSize
        );


    results.innerHTML = `
        <div
            class="doctor-interface-results-head"
        >
            <div>
                <strong>
                    ${total}
                </strong>

                <span>
                    জন ডাক্তার পাওয়া গেছে
                </span>
            </div>
        </div>


        <div
            class="doctor-interface-list"
        >
            ${currentDoctors
            .map(
                buildDoctorCard
            )
            .join("")}
        </div>


        ${renderDoctorPagination(
                totalPages
            )}
    `;
}


// =========================================================
// DOCTOR LOCATION FILTER SYNC
// =========================================================

function syncDoctorDivisionFilter() {

    const {
        divisionFilter
    } =
        getDoctorElements();


    if (!divisionFilter) {
        return;
    }


    fillLocationSelect(
        divisionFilter,
        homeLocationState.divisions,
        "সব বিভাগ"
    );


    divisionFilter.disabled =
        homeLocationState.divisions.length === 0;
}


// =========================================================
// LOAD DOCTORS
// =========================================================

async function loadDoctorData() {

    const {
        results
    } =
        getDoctorElements();


    if (!results) {
        return;
    }


    if (
        doctorState.loading
    ) {
        return;
    }


    if (
        doctorState.loaded
    ) {
        applyDoctorFilters();
        return;
    }


    if (!dorkariSupabase) {

        results.innerHTML = `
            <div
                class="interface-empty"
            >
                Supabase সংযোগ পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    doctorState.loading =
        true;


    results.innerHTML = `
        <div
            class="interface-empty"
        >
            ডাক্তারদের তথ্য লোড হচ্ছে...
        </div>
    `;


    try {

        const [
            doctorsResult,
            hospitalsResult,
            relationshipResult
        ] =
            await Promise.all([

                dorkariSupabase
                    .from("doctors")
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
                        is_active
                    `)
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


                dorkariSupabase
                    .from("hospitals")
                    .select(`
                        id,
                        name,
                        name_bn,
                        division_id,
                        district_id,
                        upazila_id,
                        address
                    `)
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


                dorkariSupabase
                    .from("doctor_hospitals")
                    .select(`
                        id,
                        doctor_id,
                        hospital_id,
                        department,
                        designation,
                        visiting_days,
                        visiting_hours
                    `)
            ]);


        if (
            doctorsResult.error
        ) {
            throw doctorsResult.error;
        }


        if (
            hospitalsResult.error
        ) {
            throw hospitalsResult.error;
        }


        if (
            relationshipResult.error
        ) {
            throw relationshipResult.error;
        }


        const doctors =
            doctorsResult.data || [];


        const hospitals =
            hospitalsResult.data || [];


        const relationships =
            relationshipResult.data || [];


        const hospitalById =
            new Map(
                hospitals.map(
                    (hospital) => [
                        String(
                            hospital.id
                        ),
                        hospital
                    ]
                )
            );


        const assignmentsByDoctor =
            new Map();


        relationships.forEach(
            (assignment) => {

                const doctorId =
                    String(
                        assignment.doctor_id
                    );


                const hospital =
                    hospitalById.get(
                        String(
                            assignment.hospital_id
                        )
                    );


                if (!hospital) {
                    return;
                }


                if (
                    !assignmentsByDoctor.has(
                        doctorId
                    )
                ) {
                    assignmentsByDoctor.set(
                        doctorId,
                        []
                    );
                }


                assignmentsByDoctor
                    .get(
                        doctorId
                    )
                    .push({
                        ...assignment,
                        hospital
                    });
            }
        );


        doctorState.hospitals =
            hospitals;


        doctorState.doctors =
            doctors.map(
                (doctor) => ({
                    ...doctor,
                    hospitalAssignments:
                        assignmentsByDoctor.get(
                            String(
                                doctor.id
                            )
                        ) || []
                })
            );


        doctorState.loaded =
            true;

        doctorState.loading =
            false;


        populateDoctorFilters();
        applyDoctorFilters();


        console.info(
            "Dorkari public doctors loaded:",
            doctorState.doctors.length
        );


    } catch (error) {

        doctorState.loading =
            false;


        console.error(
            "Doctor public data load failed:",
            error
        );


        results.innerHTML = `
            <div
                class="interface-empty"
            >
                ডাক্তারদের তথ্য লোড করতে সমস্যা হয়েছে।
            </div>
        `;


        showToast(
            "ডাক্তারদের তথ্য লোড করা যায়নি"
        );
    }
}


// =========================================================
// INITIALIZE DOCTOR INTERFACE
// =========================================================

function initializeDoctorInterface() {

    const {
        search,
        locationButton,
        specialtyFilter,
        hospitalFilter,
        divisionFilter,
        results
    } =
        getDoctorElements();


    /*
     * Home location data পরে আসবে।
     */
    syncDoctorDivisionFilter();


    document.addEventListener(
        "dorkari:locations-loaded",
        () => {
            syncDoctorDivisionFilter();

            if (
                doctorState.loaded
            ) {
                renderDoctorResults();
            }
        }
    );


    /*
     * SEARCH
     */

    search?.addEventListener(
        "input",
        () => {

            doctorState.locationOnly =
                false;


            if (locationButton) {
                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyDoctorFilters();
        }
    );


    /*
     * SPECIALTY
     */

    specialtyFilter?.addEventListener(
        "change",
        () => {

            doctorState.locationOnly =
                false;


            if (locationButton) {
                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyDoctorFilters();
        }
    );


    /*
     * HOSPITAL
     */

    hospitalFilter?.addEventListener(
        "change",
        () => {

            doctorState.locationOnly =
                false;


            if (locationButton) {
                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyDoctorFilters();
        }
    );


    /*
     * DIVISION
     */

    divisionFilter?.addEventListener(
        "change",
        () => {

            doctorState.locationOnly =
                false;


            if (locationButton) {
                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyDoctorFilters();
        }
    );


    /*
     * MY AREA
     */

    locationButton?.addEventListener(
        "click",
        () => {

            const saved =
                getSavedHomeLocation();


            if (!saved) {

                showToast(
                    "আগে Home থেকে আপনার লোকেশন সেট করুন"
                );

                return;
            }


            doctorState.locationOnly =
                !doctorState.locationOnly;


            if (
                doctorState.locationOnly
            ) {

                locationButton.textContent =
                    "✓ আমার এলাকা";


                if (
                    divisionFilter &&
                    saved.divisionId
                ) {

                    divisionFilter.value =
                        saved.divisionId;
                }

            } else {

                locationButton.textContent =
                    "⌖ এলাকা";


                if (divisionFilter) {
                    divisionFilter.value =
                        "";
                }

            }


            applyDoctorFilters();
        }
    );


    /*
     * PAGINATION
     */

    results?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-doctor-page]"
                );


            if (!button) {
                return;
            }


            const page =
                Number(
                    button.dataset.doctorPage
                );


            if (
                !Number.isFinite(page) ||
                page < 1
            ) {
                return;
            }


            doctorState.currentPage =
                page;


            renderDoctorResults();


            const interfaceElement =
                getServiceInterface(
                    "doctor"
                );


            interfaceElement?.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );
}

// =========================================================
// AMBULANCE PUBLIC DATA
// =========================================================

let ambulanceState = {
    ambulances: [],
    filtered: [],
    loading: false,
    loaded: false,
    locationOnly: false
};


// =========================================================
// AMBULANCE DOM
// =========================================================

function getAmbulanceElements() {

    return {

        interface:
            getServiceInterface(
                "ambulance"
            ),

        search:
            document.querySelector(
                '[data-interface-search="ambulance"]'
            ),

        locationButton:
            document.querySelector(
                '[data-interface-location="ambulance"]'
            ),

        providerTypeFilter:
            document.querySelector(
                '[data-ambulance-filter="provider_type"]'
            ),

        divisionFilter:
            document.querySelector(
                '[data-ambulance-filter="division"]'
            ),

        districtFilter:
            document.querySelector(
                '[data-ambulance-filter="district"]'
            ),

        upazilaFilter:
            document.querySelector(
                '[data-ambulance-filter="upazila"]'
            ),

        results:
            document.querySelector(
                '[data-interface-results="ambulance"]'
            )
    };
}


// =========================================================
// AMBULANCE LOCATION
// =========================================================

function getAmbulanceLocationLabel(
    ambulance
) {

    const divisionName =
        getLocationNameById(
            homeLocationState.divisions,
            ambulance?.division_id
        );

    const districtName =
        getLocationNameById(
            homeLocationState.districts,
            ambulance?.district_id
        );

    const upazilaName =
        getLocationNameById(
            homeLocationState.upazilas,
            ambulance?.upazila_id
        );

    return getLocationLabel(
        divisionName,
        districtName,
        upazilaName
    );
}


function ambulanceMatchesLocation(
    ambulance,
    saved
) {

    if (!saved) {
        return true;
    }


    if (saved.upazilaId) {

        return (
            String(
                ambulance?.upazila_id
            ) ===
            String(
                saved.upazilaId
            )
        );
    }


    if (saved.districtId) {

        return (
            String(
                ambulance?.district_id
            ) ===
            String(
                saved.districtId
            )
        );
    }


    if (saved.divisionId) {

        return (
            String(
                ambulance?.division_id
            ) ===
            String(
                saved.divisionId
            )
        );
    }


    return true;
}


// =========================================================
// AMBULANCE FILTER OPTIONS
// =========================================================

function populateAmbulanceFilters() {

    const {
        providerTypeFilter,
        divisionFilter
    } =
        getAmbulanceElements();


    /*
     * PROVIDER TYPE
     */

    if (providerTypeFilter) {

        const providerTypes =
            Array.from(
                new Set(
                    ambulanceState.ambulances
                        .map(
                            (ambulance) =>
                                cleanText(
                                    ambulance.provider_type
                                )
                        )
                        .filter(Boolean)
                )
            ).sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "bn"
                    )
            );


        providerTypeFilter.innerHTML = `
            <option value="">
                সব ধরনের
            </option>
        `;


        providerTypes.forEach(
            (providerType) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    providerType;

                option.textContent =
                    providerType;

                providerTypeFilter.appendChild(
                    option
                );
            }
        );
    }


    /*
     * DIVISION
     */

    if (divisionFilter) {

        fillLocationSelect(
            divisionFilter,
            homeLocationState.divisions,
            "সব বিভাগ"
        );

        divisionFilter.disabled =
            homeLocationState.divisions.length === 0;
    }
}


// =========================================================
// AMBULANCE SEARCH TEXT
// =========================================================

function getAmbulanceSearchText(
    ambulance
) {

    return [
        ambulance?.name,
        ambulance?.name_bn,
        ambulance?.provider_type,
        ambulance?.phone,
        ambulance?.alternative_phone,
        ambulance?.address,
        getAmbulanceLocationLabel(
            ambulance
        )
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


// =========================================================
// AMBULANCE MAP URL
// =========================================================

function buildAmbulanceMapUrl(
    ambulance
) {

    const searchText = [
        cleanText(
            ambulance?.name
        ),
        cleanText(
            ambulance?.address
        ),
        getAmbulanceLocationLabel(
            ambulance
        )
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(", ");


    if (!searchText) {
        return "";
    }


    return (
        "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(
            searchText
        )}`
    );
}


// =========================================================
// AMBULANCE FILTERING
// =========================================================

function applyAmbulanceFilters() {

    const {
        search,
        providerTypeFilter,
        divisionFilter,
        districtFilter,
        upazilaFilter
    } =
        getAmbulanceElements();


    const searchText =
        cleanText(
            search?.value
        ).toLowerCase();


    const providerType =
        cleanText(
            providerTypeFilter?.value
        );


    const divisionId =
        cleanText(
            divisionFilter?.value
        );


    const districtId =
        cleanText(
            districtFilter?.value
        );


    const upazilaId =
        cleanText(
            upazilaFilter?.value
        );


    const savedLocation =
        getSavedHomeLocation();


    ambulanceState.filtered =
        ambulanceState.ambulances.filter(
            (ambulance) => {


                /*
                 * PROVIDER TYPE
                 */

                if (
                    providerType &&
                    cleanText(
                        ambulance.provider_type
                    ) !==
                    providerType
                ) {
                    return false;
                }


                /*
                 * DIVISION
                 */

                if (
                    divisionId &&
                    String(
                        ambulance.division_id
                    ) !==
                    String(
                        divisionId
                    )
                ) {
                    return false;
                }


                /*
                 * DISTRICT
                 */

                if (
                    districtId &&
                    String(
                        ambulance.district_id
                    ) !==
                    String(
                        districtId
                    )
                ) {
                    return false;
                }


                /*
                 * UPAZILA
                 */

                if (
                    upazilaId &&
                    String(
                        ambulance.upazila_id
                    ) !==
                    String(
                        upazilaId
                    )
                ) {
                    return false;
                }


                /*
                 * MY AREA
                 */

                if (
                    ambulanceState.locationOnly &&
                    !ambulanceMatchesLocation(
                        ambulance,
                        savedLocation
                    )
                ) {
                    return false;
                }


                /*
                 * SEARCH
                 */

                if (!searchText) {
                    return true;
                }


                return getAmbulanceSearchText(
                    ambulance
                ).includes(
                    searchText
                );
            }
        );


    renderAmbulanceResults();
}


// =========================================================
// AMBULANCE CARD
// =========================================================

function buildAmbulanceCard(
    ambulance
) {

    const name =
        cleanText(
            ambulance?.name_bn
        ) ||
        cleanText(
            ambulance?.name
        ) ||
        "অ্যাম্বুলেন্স সার্ভিস";


    const englishName =
        cleanText(
            ambulance?.name
        );


    const providerType =
        cleanText(
            ambulance?.provider_type
        );


    const phone =
        cleanText(
            ambulance?.phone
        );


    const alternativePhone =
        cleanText(
            ambulance?.alternative_phone
        );


    const address =
        cleanText(
            ambulance?.address
        );


    const locationLabel =
        getAmbulanceLocationLabel(
            ambulance
        );


    const mapUrl =
        buildAmbulanceMapUrl(
            ambulance
        );


    const verifiedBadge =
        ambulance?.is_verified
            ? `
                <span
                    class="ambulance-interface-badge is-verified"
                >
                    ✓ যাচাইকৃত
                </span>
            `
            : `
                <span
                    class="ambulance-interface-badge"
                >
                    যাচাই চলমান
                </span>
            `;


    const providerBadge =
        providerType
            ? `
                <span
                    class="ambulance-interface-badge"
                >
                    ${escapeHTML(
                providerType
            )}
                </span>
            `
            : "";


    const hoursBadge =
        ambulance?.is_24_hours
            ? `
                <span
                    class="ambulance-interface-badge is-24h"
                >
                    ২৪ ঘণ্টা সেবা
                </span>
            `
            : "";


    const phoneAction =
        phone
            ? `
                <a
                    href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                    class="ambulance-interface-action is-primary"
                >
                    ☎ কল করুন
                </a>
            `
            : "";


    const mapAction =
        mapUrl
            ? `
                <a
                    href="${escapeHTML(
                mapUrl
            )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ambulance-interface-action"
                >
                    ⌖ ম্যাপে দেখুন
                </a>
            `
            : "";


    return `
        <article
            class="ambulance-interface-card"
        >

            <div
                class="ambulance-interface-card-main"
            >

                <div
                    class="ambulance-interface-avatar"
                    aria-hidden="true"
                >
                    🚑
                </div>


                <div
                    class="ambulance-interface-card-content"
                >

                    <div
                        class="ambulance-interface-card-heading"
                    >

                        <div>

                            <h3
                                class="ambulance-interface-card-title"
                            >
                                ${escapeHTML(
        name
    )}
                            </h3>


                            ${englishName &&
            englishName !== name
            ? `
                                    <p
                                        class="ambulance-interface-card-subtitle"
                                    >
                                        ${escapeHTML(
                englishName
            )}
                                    </p>
                                `
            : ""
        }

                        </div>


                        <span
                            class="ambulance-interface-card-mark"
                            aria-hidden="true"
                        >
                            +
                        </span>

                    </div>


                    <div
                        class="ambulance-interface-badges"
                    >
                        ${providerBadge}
                        ${verifiedBadge}
                        ${hoursBadge}
                    </div>

                </div>

            </div>


            ${phone || alternativePhone
            ? `
                        <div
                            class="ambulance-interface-phone-row"
                        >

                            ${phone
                ? `
                                        <span>
                                            ☎
                                            ${escapeHTML(
                    phone
                )}
                                        </span>
                                      `
                : ""
            }

                            ${alternativePhone
                ? `
                                        <span>
                                            |
                                            ${escapeHTML(
                    alternativePhone
                )}
                                        </span>
                                      `
                : ""
            }

                        </div>
                      `
            : ""
        }


            ${locationLabel
            ? `
                        <div
                            class="ambulance-interface-meta"
                        >

                            <span
                                aria-hidden="true"
                            >
                                ⌖
                            </span>

                            <span>
                                ${escapeHTML(
                locationLabel
            )}
                            </span>

                        </div>
                      `
            : ""
        }


            ${address
            ? `
                        <div
                            class="ambulance-interface-meta"
                        >

                            <span
                                aria-hidden="true"
                            >
                                ⌂
                            </span>

                            <span>
                                ${escapeHTML(
                address
            )}
                            </span>

                        </div>
                      `
            : ""
        }


            <div
                class="ambulance-interface-actions"
            >

                ${phoneAction}

                ${mapAction}

            </div>


            <details
                class="ambulance-interface-details"
            >

                <summary>
                    বিস্তারিত দেখুন
                </summary>


                <div
                    class="ambulance-interface-details-body"
                >

                    ${providerType
            ? `
                                <p>
                                    <strong>
                                        সেবা ধরন:
                                    </strong>

                                    ${escapeHTML(
                providerType
            )}
                                </p>
                              `
            : ""
        }


                    ${ambulance?.is_24_hours
            ? `
                                <p>
                                    <strong>
                                        সেবা:
                                    </strong>

                                    ২৪ ঘণ্টা
                                </p>
                              `
            : ""
        }


                    ${phone
            ? `
                                <p>
                                    <strong>
                                        ফোন:
                                    </strong>

                                    <a
                                        href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                                    >
                                        ${escapeHTML(
                phone
            )}
                                    </a>
                                </p>
                              `
            : ""
        }


                    ${alternativePhone
            ? `
                                <p>
                                    <strong>
                                        বিকল্প ফোন:
                                    </strong>

                                    <a
                                        href="tel:${escapeHTML(
                normalizePhone(
                    alternativePhone
                )
            )}"
                                    >
                                        ${escapeHTML(
                alternativePhone
            )}
                                    </a>
                                </p>
                              `
            : ""
        }


                    ${address
            ? `
                                <p>
                                    <strong>
                                        ঠিকানা:
                                    </strong>

                                    ${escapeHTML(
                address
            )}
                                </p>
                              `
            : ""
        }


                    ${locationLabel
            ? `
                                <p>
                                    <strong>
                                        লোকেশন:
                                    </strong>

                                    ${escapeHTML(
                locationLabel
            )}
                                </p>
                              `
            : ""
        }

                </div>

            </details>

        </article>
    `;
}


// =========================================================
// AMBULANCE RESULTS
// =========================================================

function renderAmbulanceResults() {

    const {
        results
    } =
        getAmbulanceElements();


    if (!results) {
        return;
    }


    if (
        ambulanceState.filtered.length === 0
    ) {

        let message =
            "কোনো অ্যাম্বুলেন্স সার্ভিস পাওয়া যায়নি।";


        if (
            ambulanceState.locationOnly
        ) {

            message =
                "আপনার নির্বাচিত এলাকায় কোনো অ্যাম্বুলেন্স সার্ভিস পাওয়া যায়নি।";

        } else {

            const {
                providerTypeFilter,
                divisionFilter,
                districtFilter,
                upazilaFilter
            } =
                getAmbulanceElements();


            if (
                providerTypeFilter?.value ||
                divisionFilter?.value ||
                districtFilter?.value ||
                upazilaFilter?.value
            ) {

                message =
                    "নির্বাচিত ফিল্টারে কোনো অ্যাম্বুলেন্স সার্ভিস পাওয়া যায়নি।";
            }
        }


        results.innerHTML = `
            <div
                class="interface-empty"
            >
                ${escapeHTML(
            message
        )}
            </div>
        `;


        return;
    }


    results.innerHTML = `
        <div
            class="ambulance-interface-results-head"
        >

            <div>

                <strong>
                    ${ambulanceState.filtered.length}
                </strong>

                <span>
                    টি অ্যাম্বুলেন্স সার্ভিস পাওয়া গেছে
                </span>

            </div>

        </div>


        <div
            class="ambulance-interface-list"
        >
            ${ambulanceState.filtered
            .map(
                buildAmbulanceCard
            )
            .join("")}
        </div>
    `;
}


// =========================================================
// LOAD AMBULANCE DATA
// =========================================================

async function loadAmbulanceData() {

    const {
        results
    } =
        getAmbulanceElements();


    if (!results) {
        return;
    }


    if (
        ambulanceState.loading
    ) {
        return;
    }


    if (
        ambulanceState.loaded
    ) {
        applyAmbulanceFilters();
        return;
    }


    if (!dorkariSupabase) {

        results.innerHTML = `
            <div
                class="interface-empty"
            >
                Supabase সংযোগ পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    ambulanceState.loading =
        true;


    results.innerHTML = `
        <div
            class="interface-empty"
        >
            অ্যাম্বুলেন্সের তথ্য লোড হচ্ছে...
        </div>
    `;


    try {

        const {
            data,
            error
        } =
            await dorkariSupabase
                .from("ambulances")
                .select(`
                    id,
                    name,
                    provider_type,
                    division_id,
                    district_id,
                    upazila_id,
                    phone,
                    alternative_phone,
                    address,
                    is_24_hours,
                    is_verified,
                    is_active
                `)
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        ambulanceState.ambulances =
            Array.isArray(data)
                ? data
                : [];


        ambulanceState.loaded =
            true;

        ambulanceState.loading =
            false;


        populateAmbulanceFilters();

        applyAmbulanceFilters();


        console.info(
            "Dorkari public ambulances loaded:",
            ambulanceState.ambulances.length
        );

    } catch (error) {

        ambulanceState.loading =
            false;


        console.error(
            "Ambulance public data load failed:",
            error
        );


        results.innerHTML = `
            <div
                class="interface-empty"
            >
                অ্যাম্বুলেন্সের তথ্য লোড করতে সমস্যা হয়েছে।
            </div>
        `;


        showToast(
            "অ্যাম্বুলেন্সের তথ্য লোড করা যায়নি"
        );
    }
}


// =========================================================
// INITIALIZE AMBULANCE INTERFACE
// =========================================================

function initializeAmbulanceInterface() {

    const {
        search,
        locationButton,
        providerTypeFilter,
        divisionFilter,
        districtFilter,
        upazilaFilter,
        results
    } =
        getAmbulanceElements();


    /*
     * INITIAL LOCATION OPTIONS
     */

    if (divisionFilter) {

        fillLocationSelect(
            divisionFilter,
            homeLocationState.divisions,
            "সব বিভাগ"
        );

        divisionFilter.disabled =
            homeLocationState.divisions.length === 0;
    }


    /*
     * LOCATION DATA READY হলে
     * filters আবার sync করি।
     */

    document.addEventListener(
        "dorkari:locations-loaded",
        () => {

            if (divisionFilter) {

                fillLocationSelect(
                    divisionFilter,
                    homeLocationState.divisions,
                    "সব বিভাগ"
                );

                divisionFilter.disabled =
                    homeLocationState.divisions.length === 0;
            }


            if (
                ambulanceState.loaded
            ) {

                applyAmbulanceFilters();
            }

        }
    );


    /*
     * SEARCH
     */

    search?.addEventListener(
        "input",
        () => {

            ambulanceState.locationOnly =
                false;


            if (locationButton) {

                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * PROVIDER TYPE
     */

    providerTypeFilter?.addEventListener(
        "change",
        () => {

            ambulanceState.locationOnly =
                false;


            if (locationButton) {

                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * DIVISION
     */

    divisionFilter?.addEventListener(
        "change",
        () => {

            ambulanceState.locationOnly =
                false;


            if (locationButton) {

                locationButton.textContent =
                    "⌖ এলাকা";
            }


            const selectedDivision =
                divisionFilter.value;


            if (districtFilter) {

                const districts =
                    selectedDivision
                        ? homeLocationState.districts.filter(
                            (district) =>
                                String(
                                    district.division_id
                                ) ===
                                String(
                                    selectedDivision
                                )
                        )
                        : [];


                fillLocationSelect(
                    districtFilter,
                    districts,
                    "সব জেলা"
                );


                districtFilter.disabled =
                    districts.length === 0;


                districtFilter.value =
                    "";
            }


            if (upazilaFilter) {

                resetLocationSelect(
                    upazilaFilter,
                    "সব উপজেলা"
                );
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * DISTRICT
     */

    districtFilter?.addEventListener(
        "change",
        () => {

            ambulanceState.locationOnly =
                false;


            if (locationButton) {

                locationButton.textContent =
                    "⌖ এলাকা";
            }


            const selectedDistrict =
                districtFilter.value;


            if (upazilaFilter) {

                const upazilas =
                    selectedDistrict
                        ? homeLocationState.upazilas.filter(
                            (upazila) =>
                                String(
                                    upazila.district_id
                                ) ===
                                String(
                                    selectedDistrict
                                )
                        )
                        : [];


                fillLocationSelect(
                    upazilaFilter,
                    upazilas,
                    "সব উপজেলা"
                );


                upazilaFilter.disabled =
                    upazilas.length === 0;


                upazilaFilter.value =
                    "";
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * UPAZILA
     */

    upazilaFilter?.addEventListener(
        "change",
        () => {

            ambulanceState.locationOnly =
                false;


            if (locationButton) {

                locationButton.textContent =
                    "⌖ এলাকা";
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * MY AREA
     */

    locationButton?.addEventListener(
        "click",
        () => {

            const saved =
                getSavedHomeLocation();


            if (!saved) {

                showToast(
                    "আগে Home থেকে আপনার লোকেশন সেট করুন"
                );

                return;
            }


            ambulanceState.locationOnly =
                !ambulanceState.locationOnly;


            if (
                ambulanceState.locationOnly
            ) {

                locationButton.textContent =
                    "✓ আমার এলাকা";


                if (
                    divisionFilter &&
                    saved.divisionId
                ) {

                    divisionFilter.value =
                        saved.divisionId;


                    divisionFilter.dispatchEvent(
                        new Event(
                            "change"
                        )
                    );

                }


                if (
                    districtFilter &&
                    saved.districtId
                ) {

                    districtFilter.value =
                        saved.districtId;


                    districtFilter.dispatchEvent(
                        new Event(
                            "change"
                        )
                    );

                }


                if (
                    upazilaFilter &&
                    saved.upazilaId
                ) {

                    upazilaFilter.value =
                        saved.upazilaId;
                }

            } else {

                locationButton.textContent =
                    "⌖ এলাকা";


                if (providerTypeFilter) {
                    providerTypeFilter.value =
                        "";
                }


                if (divisionFilter) {
                    divisionFilter.value =
                        "";
                }


                if (districtFilter) {

                    resetLocationSelect(
                        districtFilter,
                        "সব জেলা"
                    );
                }


                if (upazilaFilter) {

                    resetLocationSelect(
                        upazilaFilter,
                        "সব উপজেলা"
                    );
                }
            }


            applyAmbulanceFilters();
        }
    );


    /*
     * প্রথম অবস্থায় results untouched থাকবে।
     * Service open হলে loadAmbulanceData()
     * থেকে data render হবে।
     */

    void results;
}
// =========================================================
// DORKARI — GOVERNMENT PUBLIC DATA
// Public Government Office / Service Listing
// =========================================================

const governmentState = {
    offices: [],
    filtered: [],
    divisions: [],
    districts: [],
    upazilas: [],
    loading: false,
    loaded: false,
    locationOnly: false
};


function getGovernmentElements() {
    return {
        search: $(
            '[data-interface-search="government"]'
        ),

        locationButton: $(
            '[data-interface-location="government"]'
        ),

        results: $(
            '[data-interface-results="government"]'
        ),

        serviceType: $(
            "#governmentFilterServiceType"
        ),

        division: $(
            "#governmentFilterDivision"
        ),

        district: $(
            "#governmentFilterDistrict"
        ),

        upazila: $(
            "#governmentFilterUpazila"
        ),

        sort: $(
            "#governmentSort"
        ),

        resultCount: $(
            "#governmentResultCount"
        )
    };
}


/* =========================================================
   LOCATION HELPERS
   ========================================================= */

function getGovernmentDivisionName(id) {
    const item =
        governmentState.divisions.find(
            (division) =>
                String(division.id) === String(id)
        );

    return (
        cleanText(item?.name_bn) ||
        cleanText(item?.name) ||
        ""
    );
}


function getGovernmentDistrictName(id) {
    const item =
        governmentState.districts.find(
            (district) =>
                String(district.id) === String(id)
        );

    return (
        cleanText(item?.name_bn) ||
        cleanText(item?.name) ||
        ""
    );
}


function getGovernmentUpazilaName(id) {
    const item =
        governmentState.upazilas.find(
            (upazila) =>
                String(upazila.id) === String(id)
        );

    return (
        cleanText(item?.name_bn) ||
        cleanText(item?.name) ||
        ""
    );
}


function getGovernmentLocationLabel(
    office
) {
    return [
        getGovernmentDivisionName(
            office?.division_id
        ),

        getGovernmentDistrictName(
            office?.district_id
        ),

        getGovernmentUpazilaName(
            office?.upazila_id
        )
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(" → ");
}


function getGovernmentSavedLocation() {
    const saved =
        getSavedHomeLocation();

    if (!saved) {
        return null;
    }

    return {
        divisionId:
            cleanText(
                saved.divisionId
            ),

        districtId:
            cleanText(
                saved.districtId
            ),

        upazilaId:
            cleanText(
                saved.upazilaId
            )
    };
}


function governmentMatchesLocation(
    office,
    saved
) {
    if (!saved) {
        return true;
    }

    if (
        saved.upazilaId &&
        String(office.upazila_id) ===
        String(saved.upazilaId)
    ) {
        return true;
    }

    if (
        saved.districtId &&
        String(office.district_id) ===
        String(saved.districtId)
    ) {
        return true;
    }

    if (
        saved.divisionId &&
        String(office.division_id) ===
        String(saved.divisionId)
    ) {
        return true;
    }

    return false;
}


function getGovernmentLocationScore(
    office,
    saved
) {
    if (!saved) {
        return 0;
    }

    if (
        saved.upazilaId &&
        String(office.upazila_id) ===
        String(saved.upazilaId)
    ) {
        return 3;
    }

    if (
        saved.districtId &&
        String(office.district_id) ===
        String(saved.districtId)
    ) {
        return 2;
    }

    if (
        saved.divisionId &&
        String(office.division_id) ===
        String(saved.divisionId)
    ) {
        return 1;
    }

    return 0;
}


/* =========================================================
   SEARCH TEXT
   ========================================================= */

function getGovernmentSearchText(
    office
) {
    return [
        office?.name_bn,
        office?.name,
        office?.office_type,
        office?.address,
        office?.phone,
        office?.email,
        office?.website,
        office?.description,
        getGovernmentLocationLabel(
            office
        )
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


/* =========================================================
   MAP
   ========================================================= */

function buildGovernmentMapUrl(
    office
) {
    const searchText = [
        cleanText(
            office?.name_bn
        ) ||
        cleanText(
            office?.name
        ),

        cleanText(
            office?.address
        ),

        getGovernmentLocationLabel(
            office
        )
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(", ");

    if (!searchText) {
        return "";
    }

    return (
        "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(
            searchText
        )}`
    );
}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

function populateGovernmentServiceTypes() {
    const {
        serviceType
    } =
        getGovernmentElements();

    if (!serviceType) {
        return;
    }

    const currentValue =
        cleanText(
            serviceType.value
        );

    const types = Array.from(
        new Set(
            governmentState.offices
                .map(
                    (office) =>
                        cleanText(
                            office.office_type
                        )
                )
                .filter(Boolean)
        )
    ).sort(
        (a, b) =>
            a.localeCompare(
                b,
                "bn"
            )
    );

    serviceType.innerHTML = `
        <option value="">
            সব ধরনের সেবা
        </option>
        ${types
            .map(
                (type) => `
                    <option
                        value="${escapeHTML(
                    type
                )}"
                    >
                        ${escapeHTML(
                    type
                )}
                    </option>
                `
            )
            .join("")}
    `;

    if (
        types.includes(
            currentValue
        )
    ) {
        serviceType.value =
            currentValue;
    }
}


function populateGovernmentDivisionFilter() {
    const {
        division
    } =
        getGovernmentElements();

    if (!division) {
        return;
    }

    const currentValue =
        cleanText(
            division.value
        );

    division.innerHTML = `
        <option value="">
            সব বিভাগ
        </option>
        ${governmentState.divisions
            .map(
                (item) => `
                    <option
                        value="${escapeHTML(
                    item.id
                )}"
                    >
                        ${escapeHTML(
                    item.name_bn ||
                    item.name
                )}
                    </option>
                `
            )
            .join("")}
    `;

    if (
        governmentState.divisions.some(
            (item) =>
                String(item.id) ===
                String(currentValue)
        )
    ) {
        division.value =
            currentValue;
    }
}


function populateGovernmentDistrictFilter() {
    const {
        division,
        district
    } =
        getGovernmentElements();

    if (!district) {
        return;
    }

    const divisionId =
        cleanText(
            division?.value
        );

    const currentValue =
        cleanText(
            district.value
        );

    const districts =
        governmentState.districts.filter(
            (item) =>
                !divisionId ||
                String(
                    item.division_id
                ) ===
                String(
                    divisionId
                )
        );

    district.innerHTML = `
        <option value="">
            সব জেলা
        </option>
        ${districts
            .map(
                (item) => `
                    <option
                        value="${escapeHTML(
                    item.id
                )}"
                    >
                        ${escapeHTML(
                    item.name_bn ||
                    item.name
                )}
                    </option>
                `
            )
            .join("")}
    `;

    district.disabled =
        districts.length === 0;

    if (
        districts.some(
            (item) =>
                String(item.id) ===
                String(currentValue)
        )
    ) {
        district.value =
            currentValue;
    }
}


function populateGovernmentUpazilaFilter() {
    const {
        district
    } =
        getGovernmentElements();

    const {
        upazila
    } =
        getGovernmentElements();

    if (!upazila) {
        return;
    }

    const districtId =
        cleanText(
            district?.value
        );

    const currentValue =
        cleanText(
            upazila.value
        );

    const upazilas =
        governmentState.upazilas.filter(
            (item) =>
                !districtId ||
                String(
                    item.district_id
                ) ===
                String(
                    districtId
                )
        );

    upazila.innerHTML = `
        <option value="">
            সব উপজেলা
        </option>
        ${upazilas
            .map(
                (item) => `
                    <option
                        value="${escapeHTML(
                    item.id
                )}"
                    >
                        ${escapeHTML(
                    item.name_bn ||
                    item.name
                )}
                    </option>
                `
            )
            .join("")}
    `;

    upazila.disabled =
        upazilas.length === 0;

    if (
        upazilas.some(
            (item) =>
                String(item.id) ===
                String(currentValue)
        )
    ) {
        upazila.value =
            currentValue;
    }
}


/* =========================================================
   CARD ICON
   ========================================================= */

function getGovernmentCardIcon(
    officeType
) {
    const type =
        cleanText(
            officeType
        ).toLowerCase();

    if (
        type.includes("শিক্ষা") ||
        type.includes("education")
    ) {
        return `
            <svg
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="m8 25 24-12 24 12-24 12L8 25Z"
                    stroke="currentColor"
                    stroke-width="3.5"
                    stroke-linejoin="round"
                />
                <path
                    d="M18 31v12c0 3 6 7 14 7s14-4 14-7V31"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linecap="round"
                />
                <path
                    d="M56 26v13"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    if (
        type.includes("ভূমি") ||
        type.includes("land")
    ) {
        return `
            <svg
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M16 9h25l10 10v36H16V9Z"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linejoin="round"
                />
                <path
                    d="M41 9v11h10"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linejoin="round"
                />
                <path
                    d="M24 28h18M24 36h18M24 44h12"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    if (
        type.includes("কর") ||
        type.includes("tax")
    ) {
        return `
            <svg
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
            >
                <rect
                    x="12"
                    y="9"
                    width="40"
                    height="46"
                    rx="6"
                    stroke="currentColor"
                    stroke-width="3.2"
                />
                <path
                    d="M22 23h20M22 32h20M22 41h11"
                    stroke="currentColor"
                    stroke-width="3.2"
                    stroke-linecap="round"
                />
                <path
                    d="M39 40h6"
                    stroke="currentColor"
                    stroke-width="3.5"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    if (
        type.includes("পাসপোর্ট") ||
        type.includes("passport") ||
        type.includes("পরিচয়") ||
        type.includes("nid")
    ) {
        return `
            <svg
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
            >
                <rect
                    x="10"
                    y="13"
                    width="44"
                    height="38"
                    rx="5"
                    stroke="currentColor"
                    stroke-width="3.2"
                />
                <circle
                    cx="25"
                    cy="26"
                    r="5"
                    stroke="currentColor"
                    stroke-width="3"
                />
                <path
                    d="M18 41c1-5 4-7 7-7s6 2 7 7M37 25h10M37 33h10M37 41h7"
                    stroke="currentColor"
                    stroke-width="3.1"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    return `
        <svg
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M10 27 32 14l22 13"
                stroke="currentColor"
                stroke-width="3.4"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            <path
                d="M14 29h36"
                stroke="currentColor"
                stroke-width="3.2"
                stroke-linecap="round"
            />

            <path
                d="M18 29v21M28 29v21M36 29v21M46 29v21"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
            />

            <path
                d="M11 51h42"
                stroke="currentColor"
                stroke-width="3.4"
                stroke-linecap="round"
            />
        </svg>
    `;
}


/* =========================================================
   CARD
   ========================================================= */

function buildGovernmentCard(
    office
) {
    const name =
        cleanText(
            office?.name_bn
        ) ||
        cleanText(
            office?.name
        ) ||
        "নাম পাওয়া যায়নি";

    const englishName =
        cleanText(
            office?.name
        );

    const officeType =
        cleanText(
            office?.office_type
        );

    const phone =
        cleanText(
            office?.phone
        );

    const email =
        cleanText(
            office?.email
        );

    const website =
        cleanText(
            office?.website
        );

    const address =
        cleanText(
            office?.address
        );

    const description =
        cleanText(
            office?.description
        );

    const locationLabel =
        getGovernmentLocationLabel(
            office
        );

    const mapUrl =
        buildGovernmentMapUrl(
            office
        );

    const verifiedBadge =
        office?.is_verified
            ? `
                <span
                    class="government-interface-badge is-verified"
                >
                    ✓ যাচাইকৃত
                </span>
            `
            : "";

    const serviceBadge =
        officeType
            ? `
                <span
                    class="government-interface-badge is-service"
                >
                    ${escapeHTML(
                officeType
            )}
                </span>
            `
            : "";

    const callAction =
        phone
            ? `
                <a
                    href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                    class="government-interface-action is-primary"
                >
                    ☎ কল করুন
                </a>
            `
            : `
                <span
                    class="government-interface-action"
                    aria-disabled="true"
                >
                    ফোন নেই
                </span>
            `;

    const mapAction =
        mapUrl
            ? `
                <a
                    href="${escapeHTML(
                mapUrl
            )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="government-interface-action"
                >
                    ⌖ ম্যাপে দেখুন
                </a>
            `
            : "";

    return `
        <article
            class="government-interface-card"
        >

            <div
                class="government-interface-card-top"
            >

                <div
                    class="government-interface-card-icon"
                    aria-hidden="true"
                >
                    ${getGovernmentCardIcon(
        officeType
    )}
                </div>

                <div
                    class="government-interface-card-content"
                >

                    <h3
                        class="government-interface-card-title"
                    >
                        ${escapeHTML(
        name
    )}
                    </h3>

                    ${englishName &&
            englishName !== name
            ? `
                                <p
                                    class="government-interface-card-subtitle"
                                >
                                    ${escapeHTML(
                englishName
            )}
                                </p>
                            `
            : ""
        }

                </div>

            </div>


            <span
                class="government-interface-card-mark"
                aria-hidden="true"
            >
                +
            </span>


            <div
                class="government-interface-badges"
            >
                ${serviceBadge}
                ${verifiedBadge}
            </div>


            <div
                class="government-interface-contact-row"
            >

                ${phone
            ? `
                            <div
                                class="government-interface-contact-item"
                            >
                                <span
                                    aria-hidden="true"
                                >
                                    ☎
                                </span>

                                <span>
                                    ${escapeHTML(
                phone
            )}
                                </span>
                            </div>
                        `
            : ""
        }

                ${email
            ? `
                            <div
                                class="government-interface-contact-item"
                            >
                                <span
                                    aria-hidden="true"
                                >
                                    @
                                </span>

                                <span>
                                    ${escapeHTML(
                email
            )}
                                </span>
                            </div>
                        `
            : ""
        }

            </div>


            ${locationLabel
            ? `
                        <div
                            class="government-interface-meta"
                        >
                            <span
                                aria-hidden="true"
                            >
                                ⌖
                            </span>

                            <span>
                                ${escapeHTML(
                locationLabel
            )}
                            </span>
                        </div>
                    `
            : ""
        }


            ${address
            ? `
                        <div
                            class="government-interface-meta"
                        >
                            <span
                                aria-hidden="true"
                            >
                                ⌂
                            </span>

                            <span>
                                ${escapeHTML(
                address
            )}
                            </span>
                        </div>
                    `
            : ""
        }


            <div
                class="government-interface-actions"
            >
                ${callAction}

                ${mapAction}

                ${website
            ? `
                            <a
                                href="${escapeHTML(
                website
            )}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="government-interface-action"
                            >
                                ওয়েবসাইট
                            </a>
                        `
            : `
                            <button
                                type="button"
                                class="government-interface-action"
                                data-government-details
                            >
                                বিস্তারিত
                            </button>
                        `
        }
            </div>


            <details
                class="government-interface-details"
            >

                <summary>
                    বিস্তারিত দেখুন
                </summary>

                <div
                    class="government-interface-details-content"
                >

                    ${description
            ? `
                                <p>
                                    ${escapeHTML(
                description
            )}
                                </p>
                            `
            : ""
        }

                    ${website
            ? `
                                <p>
                                    <strong>
                                        ওয়েবসাইট:
                                    </strong>
                                    <a
                                        href="${escapeHTML(
                website
            )}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        ${escapeHTML(
                website
            )}
                                    </a>
                                </p>
                            `
            : ""
        }

                    ${email
            ? `
                                <p>
                                    <strong>
                                        ইমেইল:
                                    </strong>
                                    ${escapeHTML(
                email
            )}
                                </p>
                            `
            : ""
        }

                </div>

            </details>

        </article>
    `;
}


/* =========================================================
   RENDER
   ========================================================= */

function renderGovernmentResults() {
    const {
        results,
        resultCount
    } =
        getGovernmentElements();

    if (!results) {
        return;
    }

    const search =
        cleanText(
            getGovernmentElements()
                .search
                ?.value
        ).toLowerCase();

    const serviceType =
        cleanText(
            getGovernmentElements()
                .serviceType
                ?.value
        );

    const divisionId =
        cleanText(
            getGovernmentElements()
                .division
                ?.value
        );

    const districtId =
        cleanText(
            getGovernmentElements()
                .district
                ?.value
        );

    const upazilaId =
        cleanText(
            getGovernmentElements()
                .upazila
                ?.value
        );

    const saved =
        getGovernmentSavedLocation();


    governmentState.filtered =
        governmentState.offices.filter(
            (office) => {

                if (
                    governmentState.locationOnly &&
                    !governmentMatchesLocation(
                        office,
                        saved
                    )
                ) {
                    return false;
                }


                if (
                    serviceType &&
                    cleanText(
                        office.office_type
                    ) !==
                    serviceType
                ) {
                    return false;
                }


                if (
                    divisionId &&
                    String(
                        office.division_id
                    ) !==
                    String(
                        divisionId
                    )
                ) {
                    return false;
                }


                if (
                    districtId &&
                    String(
                        office.district_id
                    ) !==
                    String(
                        districtId
                    )
                ) {
                    return false;
                }


                if (
                    upazilaId &&
                    String(
                        office.upazila_id
                    ) !==
                    String(
                        upazilaId
                    )
                ) {
                    return false;
                }


                if (
                    search &&
                    !getGovernmentSearchText(
                        office
                    ).includes(
                        search
                    )
                ) {
                    return false;
                }


                return true;
            }
        );


    const sortValue =
        cleanText(
            getGovernmentElements()
                .sort
                ?.value
        ) || "nearest";


    const sorted =
        [...governmentState.filtered];


    if (
        sortValue === "nearest"
    ) {
        sorted.sort(
            (a, b) => {

                const scoreA =
                    getGovernmentLocationScore(
                        a,
                        saved
                    );

                const scoreB =
                    getGovernmentLocationScore(
                        b,
                        saved
                    );

                if (
                    scoreA !== scoreB
                ) {
                    return (
                        scoreB -
                        scoreA
                    );
                }

                if (
                    Boolean(
                        b.is_verified
                    ) !==
                    Boolean(
                        a.is_verified
                    )
                ) {
                    return (
                        Number(
                            Boolean(
                                b.is_verified
                            )
                        ) -
                        Number(
                            Boolean(
                                a.is_verified
                            )
                        )
                    );
                }

                return (
                    getDisplayName(
                        a
                    ).localeCompare(
                        getDisplayName(
                            b
                        ),
                        "bn"
                    )
                );
            }
        );
    }


    if (
        sortValue === "name"
    ) {
        sorted.sort(
            (a, b) =>
                getDisplayName(
                    a
                ).localeCompare(
                    getDisplayName(
                        b
                    ),
                    "bn"
                )
        );
    }


    if (
        sortValue ===
        "service_type"
    ) {
        sorted.sort(
            (a, b) =>
                cleanText(
                    a.office_type
                ).localeCompare(
                    cleanText(
                        b.office_type
                    ),
                    "bn"
                )
        );
    }


    governmentState.filtered =
        sorted;


    if (resultCount) {
        resultCount.textContent =
            Number(
                sorted.length
            ).toLocaleString(
                "bn-BD"
            );
    }


    if (
        sorted.length === 0
    ) {
        results.innerHTML = `
            <div class="interface-empty">
                ${governmentState.locationOnly
                ? "আপনার নির্বাচিত এলাকায় কোনো সরকারি অফিস পাওয়া যায়নি।"
                : "কোনো সরকারি অফিস বা সেবার তথ্য পাওয়া যায়নি।"
            }
            </div>
        `;

        return;
    }


    results.innerHTML = `
        <div
            class="government-interface-list"
        >
            ${sorted
            .map(
                buildGovernmentCard
            )
            .join("")}
        </div>
    `;
}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadGovernmentData() {
    const {
        results
    } =
        getGovernmentElements();

    if (!results) {
        return;
    }

    if (
        governmentState.loading
    ) {
        return;
    }

    if (
        governmentState.loaded
    ) {
        renderGovernmentResults();
        return;
    }

    if (
        !dorkariSupabase
    ) {
        results.innerHTML = `
            <div class="interface-empty">
                Supabase সংযোগ পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    governmentState.loading =
        true;


    results.innerHTML = `
        <div class="interface-empty">
            সরকারি সেবার তথ্য লোড হচ্ছে...
        </div>
    `;


    try {

        const [
            officesResult,
            divisionsResult,
            districtsResult,
            upazilasResult
        ] =
            await Promise.all([

                dorkariSupabase
                    .from(
                        "government_offices"
                    )
                    .select(`
                        id,
                        name,
                        name_bn,
                        office_type,
                        division_id,
                        district_id,
                        upazila_id,
                        address,
                        phone,
                        email,
                        website,
                        description,
                        is_verified,
                        is_active,
                        created_at,
                        updated_at
                    `)
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from(
                        "divisions"
                    )
                    .select(
                        "id,name,name_bn"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from(
                        "districts"
                    )
                    .select(
                        "id,name,name_bn,division_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from(
                        "upazilas"
                    )
                    .select(
                        "id,name,name_bn,district_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    )
            ]);


        if (
            officesResult.error
        ) {
            throw (
                officesResult.error
            );
        }

        if (
            divisionsResult.error
        ) {
            throw (
                divisionsResult.error
            );
        }

        if (
            districtsResult.error
        ) {
            throw (
                districtsResult.error
            );
        }

        if (
            upazilasResult.error
        ) {
            throw (
                upazilasResult.error
            );
        }


        governmentState.offices =
            officesResult.data ||
            [];

        governmentState.divisions =
            divisionsResult.data ||
            [];

        governmentState.districts =
            districtsResult.data ||
            [];

        governmentState.upazilas =
            upazilasResult.data ||
            [];

        governmentState.loaded =
            true;


        populateGovernmentServiceTypes();

        populateGovernmentDivisionFilter();

        populateGovernmentDistrictFilter();

        populateGovernmentUpazilaFilter();

        renderGovernmentResults();


        console.info(
            "Dorkari Government loaded:",
            {
                offices:
                    governmentState
                        .offices
                        .length,
                divisions:
                    governmentState
                        .divisions
                        .length,
                districts:
                    governmentState
                        .districts
                        .length,
                upazilas:
                    governmentState
                        .upazilas
                        .length
            }
        );

    } catch (
    error
    ) {

        console.error(
            "Government data load failed:",
            error
        );

        results.innerHTML = `
            <div class="interface-empty">
                সরকারি সেবার তথ্য লোড করা যায়নি।
            </div>
        `;

        showToast(
            "সরকারি সেবার তথ্য লোড করা যায়নি"
        );

    } finally {

        governmentState.loading =
            false;

    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeGovernmentInterface() {
    const {
        search,
        locationButton,
        serviceType,
        division,
        district,
        upazila,
        sort
    } =
        getGovernmentElements();


    search?.addEventListener(
        "input",
        () => {
            renderGovernmentResults();
        }
    );


    serviceType?.addEventListener(
        "change",
        () => {
            renderGovernmentResults();
        }
    );


    division?.addEventListener(
        "change",
        () => {

            populateGovernmentDistrictFilter();

            populateGovernmentUpazilaFilter();

            renderGovernmentResults();

        }
    );


    district?.addEventListener(
        "change",
        () => {

            populateGovernmentUpazilaFilter();

            renderGovernmentResults();

        }
    );


    upazila?.addEventListener(
        "change",
        () => {
            renderGovernmentResults();
        }
    );


    sort?.addEventListener(
        "change",
        () => {
            renderGovernmentResults();
        }
    );


    locationButton?.addEventListener(
        "click",
        () => {

            const saved =
                getGovernmentSavedLocation();

            if (!saved) {
                showToast(
                    "আগে আপনার এলাকা নির্বাচন করে সংরক্ষণ করুন"
                );

                return;
            }


            governmentState.locationOnly =
                !governmentState.locationOnly;


            locationButton.textContent =
                governmentState.locationOnly
                    ? "✓ আমার এলাকা"
                    : "⌖ আমার এলাকা";


            renderGovernmentResults();

        }
    );


    document.addEventListener(
        "dorkari:locations-loaded",
        () => {

            if (
                governmentState.loaded
            ) {
                renderGovernmentResults();
            }

        }
    );

}

function initializeServiceInterfaces() {
    /*
     * =========================================================
     * HOSPITAL PUBLIC DATA
     * =========================================================
     */
    let hospitalState = {
        hospitals: [],
        filtered: [],
        loading: false,
        locationOnly: false
    };

    function getHospitalElements() {
        return {
            interface:
                getServiceInterface("hospital"),

            search:
                document.querySelector(
                    '[data-interface-search="hospital"]'
                ),

            locationButton:
                document.querySelector(
                    '[data-interface-location="hospital"]'
                ),

            divisionFilter:
                document.querySelector(
                    '[data-hospital-filter="division"]'
                ),

            districtFilter:
                document.querySelector(
                    '[data-hospital-filter="district"]'
                ),

            upazilaFilter:
                document.querySelector(
                    '[data-hospital-filter="upazila"]'
                ),

            results:
                document.querySelector(
                    '[data-interface-results="hospital"]'
                )
        };
    }


    function getLocationNameById(
        collection,
        id
    ) {
        if (!id) {
            return "";
        }

        const item =
            (collection || []).find(
                (entry) =>
                    String(entry.id) ===
                    String(id)
            );

        if (!item) {
            return "";
        }

        return (
            cleanText(item.name_bn) ||
            cleanText(item.name) ||
            ""
        );
    }


    function getHospitalLocationLabel(
        hospital
    ) {
        const divisionName =
            getLocationNameById(
                homeLocationState.divisions,
                hospital.division_id
            );

        const districtName =
            getLocationNameById(
                homeLocationState.districts,
                hospital.district_id
            );

        const upazilaName =
            getLocationNameById(
                homeLocationState.upazilas,
                hospital.upazila_id
            );

        return getLocationLabel(
            divisionName,
            districtName,
            upazilaName
        );
    }


    function getSavedHospitalLocation() {
        const saved =
            getSavedHomeLocation();

        if (!saved) {
            return null;
        }

        return {
            divisionId:
                cleanText(
                    saved.divisionId
                ),

            districtId:
                cleanText(
                    saved.districtId
                ),

            upazilaId:
                cleanText(
                    saved.upazilaId
                ),

            divisionName:
                cleanText(
                    saved.divisionName
                ),

            districtName:
                cleanText(
                    saved.districtName
                ),

            upazilaName:
                cleanText(
                    saved.upazilaName
                )
        };
    }


    function hospitalMatchesLocation(
        hospital,
        saved
    ) {
        if (!saved) {
            return true;
        }


        /*
         * সবচেয়ে নির্দিষ্ট location আগে ব্যবহার করি।
         */

        if (saved.upazilaId) {
            return (
                String(
                    hospital.upazila_id
                ) ===
                String(
                    saved.upazilaId
                )
            );
        }


        if (saved.districtId) {
            return (
                String(
                    hospital.district_id
                ) ===
                String(
                    saved.districtId
                )
            );
        }


        if (saved.divisionId) {
            return (
                String(
                    hospital.division_id
                ) ===
                String(
                    saved.divisionId
                )
            );
        }


        return true;
    }


    function buildHospitalMapUrl(
        hospital
    ) {
        const latitude =
            cleanText(
                hospital.latitude
            );

        const longitude =
            cleanText(
                hospital.longitude
            );


        if (
            latitude &&
            longitude
        ) {
            return (
                "https://www.google.com/maps/search/?api=1" +
                `&query=${encodeURIComponent(
                    `${latitude},${longitude}`
                )}`
            );
        }


        const searchText = [
            getDisplayName(hospital),
            hospital.address,
            getHospitalLocationLabel(
                hospital
            )
        ]
            .map(cleanText)
            .filter(Boolean)
            .join(", ");


        if (!searchText) {
            return "";
        }


        return (
            "https://www.google.com/maps/search/?api=1" +
            `&query=${encodeURIComponent(
                searchText
            )}`
        );
    }


    function buildHospitalCard(
        hospital
    ) {
        const name =
            getDisplayName(
                hospital
            );

        const englishName =
            cleanText(
                hospital.name
            );


        const hospitalType =
            cleanText(
                hospital.hospital_type
            );


        const locationLabel =
            getHospitalLocationLabel(
                hospital
            );


        const phone =
            cleanText(
                hospital.phone
            );


        const emergencyPhone =
            cleanText(
                hospital.emergency_phone
            );


        const address =
            cleanText(
                hospital.address
            );


        const website =
            cleanText(
                hospital.website
            );


        const description =
            cleanText(
                hospital.description
            );


        const mapUrl =
            buildHospitalMapUrl(
                hospital
            );


        const verifiedBadge =
            hospital.is_verified
                ? `
                    <span
                        class="hospital-interface-badge is-verified"
                    >
                        ✓ যাচাইকৃত
                    </span>
                `
                : `
                    <span
                        class="hospital-interface-badge"
                    >
                        যাচাই চলমান
                    </span>
                `;


        const typeBadge =
            hospitalType
                ? `
                    <span
                        class="hospital-interface-badge"
                    >
                        ${escapeHTML(
                    hospitalType
                )}
                    </span>
                `
                : "";


        const phoneAction =
            phone
                ? `
                    <a
                        href="tel:${escapeHTML(
                    normalizePhone(phone)
                )}"
                        class="hospital-interface-action is-primary"
                    >
                        কল করুন
                    </a>
                `
                : "";


        const emergencyAction =
            emergencyPhone
                ? `
                    <a
                        href="tel:${escapeHTML(
                    normalizePhone(
                        emergencyPhone
                    )
                )}"
                        class="hospital-interface-action is-danger"
                    >
                        জরুরি কল
                    </a>
                `
                : "";


        const mapAction =
            mapUrl
                ? `
                    <a
                        href="${escapeHTML(
                    mapUrl
                )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hospital-interface-action"
                    >
                        ম্যাপে দেখুন
                    </a>
                `
                : "";


        const websiteAction =
            website
                ? `
                    <a
                        href="${escapeHTML(
                    website
                )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hospital-interface-action"
                    >
                        ওয়েবসাইট
                    </a>
                `
                : "";


        return `
            <article
                class="hospital-interface-card"
            >

                <div
                    class="hospital-interface-card-top"
                >

                    <div>
                        <h3
                            class="hospital-interface-card-title"
                        >
                            ${escapeHTML(
            name
        )}
                        </h3>

                        ${englishName &&
                englishName !== name
                ? `
                                    <p
                                        class="hospital-interface-card-subtitle"
                                    >
                                        ${escapeHTML(
                    englishName
                )}
                                    </p>
                                `
                : ""
            }
                    </div>


                    <span
                        class="hospital-interface-card-mark"
                        aria-hidden="true"
                    >
                        +
                    </span>

                </div>


                <div
                    class="hospital-interface-badges"
                >
                    ${typeBadge}
                    ${verifiedBadge}
                </div>


                ${locationLabel
                ? `
                            <div
                                class="hospital-interface-meta"
                            >
                                <span
                                    aria-hidden="true"
                                >
                                    ◇
                                </span>

                                <span>
                                    ${escapeHTML(
                    locationLabel
                )}
                                </span>
                            </div>
                        `
                : ""
            }


                ${address
                ? `
                            <div
                                class="hospital-interface-meta"
                            >
                                <span
                                    aria-hidden="true"
                                >
                                    ⌂
                                </span>

                                <span>
                                    ${escapeHTML(
                    address
                )}
                                </span>
                            </div>
                        `
                : ""
            }


                ${phone
                ? `
                            <div
                                class="hospital-interface-phone"
                            >
                                ${escapeHTML(
                    phone
                )}
                            </div>
                        `
                : ""
            }


                <div
                    class="hospital-interface-actions"
                >
                    ${phoneAction}
                    ${emergencyAction}
                    ${mapAction}
                    ${websiteAction}
                </div>


                <details
                    class="hospital-interface-details"
                >

                    <summary>
                        বিস্তারিত দেখুন
                    </summary>


                    <div
                        class="hospital-interface-details-body"
                    >

                        ${emergencyPhone
                ? `
                                    <p>
                                        <strong>
                                            জরুরি নম্বর:
                                        </strong>

                                        <a
                                            href="tel:${escapeHTML(
                    normalizePhone(
                        emergencyPhone
                    )
                )}"
                                        >
                                            ${escapeHTML(
                    emergencyPhone
                )}
                                        </a>
                                    </p>
                                `
                : ""
            }


                        ${phone
                ? `
                                    <p>
                                        <strong>
                                            ফোন:
                                        </strong>

                                        ${escapeHTML(
                    phone
                )}
                                    </p>
                                `
                : ""
            }


                        ${address
                ? `
                                    <p>
                                        <strong>
                                            ঠিকানা:
                                        </strong>

                                        ${escapeHTML(
                    address
                )}
                                    </p>
                                `
                : ""
            }


                        ${description
                ? `
                                    <p>
                                        <strong>
                                            তথ্য:
                                        </strong>

                                        ${escapeHTML(
                    description
                )}
                                    </p>
                                `
                : ""
            }


                        ${website
                ? `
                                    <p>
                                        <strong>
                                            ওয়েবসাইট:
                                        </strong>

                                        <a
                                            href="${escapeHTML(
                    website
                )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ${escapeHTML(
                    website
                )}
                                        </a>
                                    </p>
                                `
                : ""
            }


                        ${locationLabel
                ? `
                                    <p>
                                        <strong>
                                            লোকেশন:
                                        </strong>

                                        ${escapeHTML(
                    locationLabel
                )}
                                    </p>
                                `
                : ""
            }

                    </div>

                </details>

            </article>
        `;
    }

    function renderHospitalResults() {
        const {
            search,
            divisionFilter,
            districtFilter,
            upazilaFilter,
            results
        } =
            getHospitalElements();

        if (!results) {
            return;
        }

        const searchText =
            cleanText(
                search?.value
            ).toLowerCase();

        const divisionId =
            cleanText(
                divisionFilter?.value
            );

        const districtId =
            cleanText(
                districtFilter?.value
            );

        const upazilaId =
            cleanText(
                upazilaFilter?.value
            );

        const savedLocation =
            getSavedHospitalLocation();

        hospitalState.filtered =
            hospitalState.hospitals.filter(
                (hospital) => {

                    /*
                     * =================================================
                     * MANUAL LOCATION FILTER
                     * Division -> District -> Upazila
                     * যেটা নির্বাচন করা হবে সেটি অনুযায়ী filter হবে।
                     * =================================================
                     */

                    if (
                        divisionId &&
                        String(
                            hospital.division_id
                        ) !==
                        String(
                            divisionId
                        )
                    ) {
                        return false;
                    }

                    if (
                        districtId &&
                        String(
                            hospital.district_id
                        ) !==
                        String(
                            districtId
                        )
                    ) {
                        return false;
                    }

                    if (
                        upazilaId &&
                        String(
                            hospital.upazila_id
                        ) !==
                        String(
                            upazilaId
                        )
                    ) {
                        return false;
                    }


                    /*
                     * =================================================
                     * HOME SAVED LOCATION
                     * পুরোনো "আমার এলাকা" option
                     * =================================================
                     */

                    if (
                        hospitalState.locationOnly &&
                        !hospitalMatchesLocation(
                            hospital,
                            savedLocation
                        )
                    ) {
                        return false;
                    }


                    /*
                     * =================================================
                     * TEXT SEARCH
                     * =================================================
                     */

                    if (!searchText) {
                        return true;
                    }


                    const searchableText = [
                        hospital.name,
                        hospital.name_bn,
                        hospital.hospital_type,
                        hospital.address,
                        hospital.phone,
                        hospital.emergency_phone
                    ]
                        .map(cleanText)
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return searchableText.includes(
                        searchText
                    );
                }
            );


        /*
         * =========================================================
         * EMPTY STATE
         * =========================================================
         */

        if (
            hospitalState.filtered.length === 0
        ) {
            let emptyMessage =
                "কোনো হাসপাতালের তথ্য পাওয়া যায়নি।";

            if (
                hospitalState.locationOnly
            ) {
                emptyMessage =
                    "আপনার নির্বাচিত এলাকায় কোনো সক্রিয় হাসপাতাল পাওয়া যায়নি।";
            } else if (
                divisionId ||
                districtId ||
                upazilaId
            ) {
                emptyMessage =
                    "নির্বাচিত লোকেশনে কোনো সক্রিয় হাসপাতাল পাওয়া যায়নি।";
            }

            results.innerHTML = `
            <div class="interface-empty">
                ${emptyMessage}
            </div>
        `;

            return;
        }


        /*
         * =========================================================
         * RESULTS
         * =========================================================
         */

        results.innerHTML = `
        <div
            class="hospital-interface-results-head"
        >
            <strong>
                ${hospitalState.filtered.length}
            </strong>

            <span>
                টি হাসপাতাল পাওয়া গেছে
            </span>
        </div>

        <div
            class="hospital-interface-list"
        >
            ${hospitalState.filtered
                .map(
                    buildHospitalCard
                )
                .join("")}
        </div>
    `;
    }

    async function loadHospitalData() {
        const {
            results
        } =
            getHospitalElements();


        if (!results) {
            return;
        }


        if (hospitalState.loading) {
            return;
        }


        if (!dorkariSupabase) {
            results.innerHTML = `
                <div class="interface-empty">
                    Supabase সংযোগ পাওয়া যায়নি।
                </div>
            `;

            return;
        }


        hospitalState.loading =
            true;


        results.innerHTML = `
            <div class="interface-empty">
                হাসপাতালের তথ্য লোড হচ্ছে...
            </div>
        `;


        try {
            const {
                data,
                error
            } =
                await dorkariSupabase
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
                        is_active
                    `)
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


            hospitalState.hospitals =
                data || [];


            hospitalState.loading =
                false;


            renderHospitalResults();


            console.info(
                "Dorkari public hospitals loaded:",
                hospitalState.hospitals.length
            );

        } catch (error) {

            hospitalState.loading =
                false;


            console.error(
                "Hospital public data load failed:",
                error
            );


            results.innerHTML = `
                <div class="interface-empty">
                    হাসপাতালের তথ্য লোড করতে সমস্যা হয়েছে।
                </div>
            `;


            showToast(
                "হাসপাতালের তথ্য লোড করা যায়নি"
            );
        }
    }

    function initializeHospitalInterface() {

        const {
            search,
            locationButton,
            divisionFilter,
            districtFilter,
            upazilaFilter
        } =
            getHospitalElements();


        /*
         * =========================================================
         * LOCATION FILTER BUILDER
         * =========================================================
         */

        function populateHospitalDivisionFilter() {

            if (!divisionFilter) {
                return;
            }

            fillLocationSelect(
                divisionFilter,
                homeLocationState.divisions,
                "সব বিভাগ"
            );

            divisionFilter.disabled =
                homeLocationState.divisions.length === 0;

            /*
             * District / Upazila reset
             */
            if (districtFilter) {
                resetLocationSelect(
                    districtFilter,
                    "সব জেলা"
                );
            }

            if (upazilaFilter) {
                resetLocationSelect(
                    upazilaFilter,
                    "সব উপজেলা"
                );
            }
        }


        function populateHospitalDistrictFilter(
            divisionId
        ) {

            if (
                !districtFilter ||
                !upazilaFilter
            ) {
                return;
            }

            if (!divisionId) {

                resetLocationSelect(
                    districtFilter,
                    "সব জেলা"
                );

                resetLocationSelect(
                    upazilaFilter,
                    "সব উপজেলা"
                );

                return;
            }


            const districts =
                homeLocationState.districts.filter(
                    (district) =>
                        String(
                            district.division_id
                        ) ===
                        String(
                            divisionId
                        )
                );


            fillLocationSelect(
                districtFilter,
                districts,
                "সব জেলা"
            );

            districtFilter.disabled =
                districts.length === 0;


            resetLocationSelect(
                upazilaFilter,
                "সব উপজেলা"
            );


            /*
             * filter empty রাখি
             * কারণ Division শুধু নির্বাচন করলেও
             * সেই Division-এর সব hospital দেখাতে হবে।
             */
            districtFilter.value =
                "";
        }


        function populateHospitalUpazilaFilter(
            districtId
        ) {

            if (!upazilaFilter) {
                return;
            }


            if (!districtId) {

                resetLocationSelect(
                    upazilaFilter,
                    "সব উপজেলা"
                );

                return;
            }


            const upazilas =
                homeLocationState.upazilas.filter(
                    (upazila) =>
                        String(
                            upazila.district_id
                        ) ===
                        String(
                            districtId
                        )
                );


            fillLocationSelect(
                upazilaFilter,
                upazilas,
                "সব উপজেলা"
            );

            upazilaFilter.disabled =
                upazilas.length === 0;


            upazilaFilter.value =
                "";
        }

        /*
 * =========================================================
 * INITIAL FILTER LOAD
 * =========================================================
 */

        function syncHospitalLocationFilters() {
            populateHospitalDivisionFilter();

            /*
             * Location data পরে load হলে
             * existing hospital cards-ও refresh হবে।
             */
            if (
                hospitalState.hospitals.length
            ) {
                renderHospitalResults();
            }
        }


        syncHospitalLocationFilters();


        /*
         * Home location data asynchronousভাবে
         * load শেষ হলে Hospital filters আবার sync করি।
         */
        document.addEventListener(
            "dorkari:locations-loaded",
            syncHospitalLocationFilters
        );


        /*
         * =========================================================
         * TEXT SEARCH
         * =========================================================
         */

        search?.addEventListener(
            "input",
            () => {

                /*
                 * Manual search শুরু করলে
                 * "আমার এলাকা" mode বন্ধ হবে।
                 */
                hospitalState.locationOnly =
                    false;


                if (locationButton) {
                    locationButton.textContent =
                        "⌖ এলাকা";
                }


                renderHospitalResults();
            }
        );


        /*
         * =========================================================
         * DIVISION CHANGE
         * =========================================================
         */

        divisionFilter?.addEventListener(
            "change",
            () => {

                /*
                 * Manual location selection করলে
                 * saved-area mode বন্ধ।
                 */
                hospitalState.locationOnly =
                    false;


                if (locationButton) {
                    locationButton.textContent =
                        "⌖ এলাকা";
                }


                populateHospitalDistrictFilter(
                    divisionFilter.value
                );


                renderHospitalResults();
            }
        );


        /*
         * =========================================================
         * DISTRICT CHANGE
         * =========================================================
         */

        districtFilter?.addEventListener(
            "change",
            () => {

                hospitalState.locationOnly =
                    false;


                if (locationButton) {
                    locationButton.textContent =
                        "⌖ এলাকা";
                }


                populateHospitalUpazilaFilter(
                    districtFilter.value
                );


                renderHospitalResults();
            }
        );


        /*
         * =========================================================
         * UPAZILA CHANGE
         * =========================================================
         */

        upazilaFilter?.addEventListener(
            "change",
            () => {

                hospitalState.locationOnly =
                    false;


                if (locationButton) {
                    locationButton.textContent =
                        "⌖ এলাকা";
                }


                renderHospitalResults();
            }
        );


        /*
         * =========================================================
         * MY AREA BUTTON
         * =========================================================
         */

        locationButton?.addEventListener(
            "click",
            () => {

                const saved =
                    getSavedHospitalLocation();


                if (!saved) {

                    showToast(
                        "আগে Home থেকে আপনার লোকেশন সেট করুন"
                    );

                    return;
                }


                hospitalState.locationOnly =
                    !hospitalState.locationOnly;

                if (
                    hospitalState.locationOnly
                ) {
                    locationButton.textContent =
                        "✓ আমার এলাকা";

                    /*
                     * Saved Home location-টাও
                     * Hospital dropdown-এ দেখাই।
                     */
                    if (
                        divisionFilter &&
                        saved.divisionId
                    ) {
                        divisionFilter.value =
                            saved.divisionId;

                        populateHospitalDistrictFilter(
                            saved.divisionId
                        );
                    }

                    if (
                        districtFilter &&
                        saved.districtId
                    ) {
                        districtFilter.value =
                            saved.districtId;

                        populateHospitalUpazilaFilter(
                            saved.districtId
                        );
                    }

                    if (
                        upazilaFilter &&
                        saved.upazilaId
                    ) {
                        upazilaFilter.value =
                            saved.upazilaId;
                    }

                } else {
                    locationButton.textContent =
                        "⌖ এলাকা";

                    /*
                     * "আমার এলাকা" mode বন্ধ করলে
                     * manual dropdown-এর filter পরিষ্কার করি।
                     */
                    if (divisionFilter) {
                        divisionFilter.value = "";
                    }

                    if (districtFilter) {
                        resetLocationSelect(
                            districtFilter,
                            "সব জেলা"
                        );
                    }

                    if (upazilaFilter) {
                        resetLocationSelect(
                            upazilaFilter,
                            "সব উপজেলা"
                        );
                    }
                }

                renderHospitalResults();
            }
        );
    }



    /*
     * Hospital interface-এর controls একবারই bind করি।
     */

    initializeHospitalInterface();


    /*
     * =========================================================
     * ORIGINAL SERVICE INTERFACE SYSTEM
     * =========================================================
     */

    $$(
        "[data-interface-open]"
    )
        .forEach((trigger) => {

            trigger.addEventListener(
                "click",
                (event) => {

                    if (
                        trigger.tagName ===
                        "BUTTON"
                    ) {
                        event.preventDefault();
                    }


                    const service =
                        cleanText(
                            trigger.dataset
                                .interfaceOpen
                        );


                    if (!service) {
                        return;
                    }


                    openServiceInterface(
                        service
                    );


                    /*
                     * Hospital open হলে
                     * real Supabase data load করি।
                     */

                    if (
                        service ===
                        "hospital"
                    ) {
                        loadHospitalData();
                    }
                    if (
                        service ===
                        "doctor"
                    ) {
                        loadDoctorData();
                    }
                    if (
                        service ===
                        "ambulance"
                    ) {
                        loadAmbulanceData();
                    }
                    if (service === "government") {
                        loadGovernmentData();
                    }
                    if (service === "blood") {
                        loadBloodData();

                        window.dispatchEvent(
                            new Event("dorkari:blood-open")
                        );
                    }
                    if (service === "tests") {

                        loadTestFeesData();

                        window.dispatchEvent(
                            new Event("dorkari:tests-open")
                        );

                    }
                }
            );

        });


    /*
     * Back buttons
     */

    $$(
        "[data-interface-back]"
    )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const currentState =
                        window.history.state;

                    if (
                        activeServiceInterface &&
                        currentState &&
                        currentState.dorkariService
                    ) {
                        window.history.back();
                        return;
                    }

                    closeServiceInterface(
                        true
                    );

                }
            );

        });


    /*
     * Browser Back
     */

    window.addEventListener(
        "popstate",
        () => {

            const targetService =
                cleanText(
                    window.location.hash.replace(
                        "#",
                        ""
                    )
                );

            /*
             * Doctor/Hospital ইত্যাদি থেকে browser বা
             * interface back করলে #services-এ ফিরে এলে
             * আগের Services screen-টাই আবার দেখাই।
             */
            if (
                targetService &&
                getServiceInterface(targetService)
            ) {

                if (targetService === "services") {
                    setActiveBottomNav("services");
                } else if (targetService === "emergency") {
                    setActiveBottomNav("emergency");
                } else if (targetService === "location") {
                    setActiveBottomNav("location");
                }

                openServiceInterface(
                    targetService,
                    {
                        pushHistory: false
                    }
                );

                return;
            }


            if (
                activeServiceInterface
            ) {
                closeServiceInterface(
                    true
                );
            }

        }
    );


    /*
     * Escape = close
     */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                activeServiceInterface
            ) {
                closeServiceInterface(
                    true
                );
            }

        }
    );


    /*
     * Direct URL hash support
     */

    const initialHash =
        cleanText(
            window.location.hash
                .replace(
                    "#",
                    ""
                )
        );

    if (
        initialHash &&
        getServiceInterface(
            initialHash
        )
    ) {

        window.setTimeout(
            () => {

                openServiceInterface(
                    initialHash,
                    {
                        pushHistory: false
                    }
                );


                if (
                    initialHash ===
                    "hospital"
                ) {

                    loadHospitalData();

                } else if (
                    initialHash ===
                    "doctor"
                ) {

                    loadDoctorData();

                }

                else if (
                    initialHash ===
                    "ambulance"
                ) {

                    loadAmbulanceData();

                }
                if (initialHash === "government") {
                    loadGovernmentData();
                }
                if (initialHash === "blood") {
                    loadBloodData();
                }
                if (initialHash === "tests") {
                    loadTestFeesData();
                }

            },
            80
        );

    }

}



function handleServiceClick(
    serviceButton
) {

    const service =
        cleanText(
            serviceButton?.dataset?.interfaceOpen ||
            serviceButton?.dataset?.service
        );

    if (!service) {
        return;
    }

    openServiceInterface(
        service
    );
}


function initializeServiceCards() {

    $$(".service-card[data-service]")
        .forEach((card) => {

            /*
             * Interface system যদি data-interface-open
             * handle করে, তাহলে এই listener আরেকবার
             * একই action চালাবে না।
             */

            card.addEventListener(
                "click",
                () => {

                    if (
                        card.dataset.interfaceOpen
                    ) {
                        return;
                    }

                    handleServiceClick(
                        card
                    );

                }
            );

        });
}




// =========================================================
// LOCATION STATE
// =========================================================

const homeLocationState = {

    divisions: [],

    districts: [],

    upazilas: []
};


// =========================================================
// LOCATION DOM
// =========================================================

function getLocationElements() {

    return {

        division:
            $("#homeDivision"),

        district:
            $("#homeDistrict"),

        upazila:
            $("#homeUpazila"),

        searchButton:
            $("#locationSearchButton"),

        savedState:
            $("#locationSavedState"),

        headerStatus:
            $("#headerLocationStatus")
    };
}


// =========================================================
// LOCATION SELECT BUILDER
// =========================================================

function fillLocationSelect(
    select,
    items,
    placeholder
) {

    if (!select) {
        return;
    }


    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );

    defaultOption.value =
        "";

    defaultOption.textContent =
        placeholder;

    select.appendChild(
        defaultOption
    );


    (items || []).forEach(
        (item) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.id;

            option.textContent =
                cleanText(
                    item.name_bn
                ) ||
                cleanText(
                    item.name
                ) ||
                "নাম পাওয়া যায়নি";

            select.appendChild(
                option
            );
        }
    );
}


// =========================================================
// RESET LOCATION SELECT
// =========================================================

function resetLocationSelect(
    select,
    placeholder
) {

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            ${escapeHTML(placeholder)}
        </option>
    `;

    select.value =
        "";

    select.disabled =
        true;
}


// =========================================================
// UPDATE HEADER LOCATION STATUS
// =========================================================

function updateHeaderLocationStatus() {

    const {
        division,
        district,
        upazila,
        headerStatus
    } =
        getLocationElements();


    if (!headerStatus) {
        return;
    }


    const divisionName =
        cleanText(
            division?.selectedOptions
                ?.item(0)
                ?.textContent
        );

    const districtName =
        cleanText(
            district?.selectedOptions
                ?.item(0)
                ?.textContent
        );

    const upazilaName =
        cleanText(
            upazila?.selectedOptions
                ?.item(0)
                ?.textContent
        );


    const label =
        getLocationLabel(
            divisionName,
            districtName,
            upazilaName
        );


    headerStatus.textContent =
        label ||
        "লোকেশন সেট করুন";
}


// =========================================================
// UPDATE SAVED STATE TEXT
// =========================================================

function updateLocationSavedState(
    message
) {

    const savedState =
        $("#locationSavedState");

    if (!savedState) {
        return;
    }

    savedState.textContent =
        message;
}


// =========================================================
// UPDATE DISTRICTS
// =========================================================

function updateHomeDistricts(
    divisionId,
    selectedDistrictId = ""
) {

    const districtSelect =
        $("#homeDistrict");

    const upazilaSelect =
        $("#homeUpazila");


    if (
        !districtSelect ||
        !upazilaSelect
    ) {
        return;
    }


    if (!divisionId) {

        resetLocationSelect(
            districtSelect,
            "জেলা নির্বাচন করুন"
        );

        resetLocationSelect(
            upazilaSelect,
            "উপজেলা নির্বাচন করুন"
        );

        updateHeaderLocationStatus();

        return;
    }


    const districts =
        homeLocationState.districts.filter(
            (district) =>
                String(
                    district.division_id
                ) ===
                String(
                    divisionId
                )
        );


    fillLocationSelect(
        districtSelect,
        districts,
        "জেলা নির্বাচন করুন"
    );


    districtSelect.disabled =
        districts.length === 0;


    if (
        selectedDistrictId &&
        districts.some(
            (district) =>
                String(district.id) ===
                String(selectedDistrictId)
        )
    ) {

        districtSelect.value =
            selectedDistrictId;

    } else {

        districtSelect.value =
            "";
    }


    updateHomeUpazilas(
        districtSelect.value
    );

    updateHeaderLocationStatus();
}


// =========================================================
// UPDATE UPAZILAS
// =========================================================

function updateHomeUpazilas(
    districtId,
    selectedUpazilaId = ""
) {

    const upazilaSelect =
        $("#homeUpazila");


    if (!upazilaSelect) {
        return;
    }


    if (!districtId) {

        resetLocationSelect(
            upazilaSelect,
            "উপজেলা নির্বাচন করুন"
        );

        updateHeaderLocationStatus();

        return;
    }


    const upazilas =
        homeLocationState.upazilas.filter(
            (upazila) =>
                String(
                    upazila.district_id
                ) ===
                String(
                    districtId
                )
        );


    fillLocationSelect(
        upazilaSelect,
        upazilas,
        "উপজেলা নির্বাচন করুন"
    );


    upazilaSelect.disabled =
        upazilas.length === 0;


    if (
        selectedUpazilaId &&
        upazilas.some(
            (upazila) =>
                String(upazila.id) ===
                String(selectedUpazilaId)
        )
    ) {

        upazilaSelect.value =
            selectedUpazilaId;

    } else {

        upazilaSelect.value =
            "";
    }


    updateHeaderLocationStatus();
}


// =========================================================
// RESTORE SAVED LOCATION
// =========================================================

function restoreSavedHomeLocation() {

    const saved =
        getSavedHomeLocation();


    if (!saved) {
        return;
    }


    const divisionSelect =
        $("#homeDivision");


    if (!divisionSelect) {
        return;
    }


    const divisionExists =
        homeLocationState.divisions.some(
            (division) =>
                String(division.id) ===
                String(saved.divisionId)
        );


    if (!divisionExists) {
        return;
    }


    divisionSelect.value =
        saved.divisionId;


    updateHomeDistricts(
        saved.divisionId,
        saved.districtId || ""
    );


    if (
        saved.districtId
    ) {

        updateHomeUpazilas(
            saved.districtId,
            saved.upazilaId || ""
        );
    }


    updateHeaderLocationStatus();


    const locationLabel =
        getLocationLabel(
            saved.divisionName,
            saved.districtName,
            saved.upazilaName
        );


    updateLocationSavedState(
        locationLabel
            ? `✓ ${locationLabel} সংরক্ষিত আছে`
            : "আপনার নির্বাচন এই ডিভাইসে মনে রাখা হবে।"
    );
}


// =========================================================
// LOAD HOME LOCATIONS
// =========================================================

async function loadHomeLocations() {

    const {
        division,
        district,
        upazila
    } =
        getLocationElements();


    if (
        !division ||
        !district ||
        !upazila
    ) {
        return;
    }


    if (!dorkariSupabase) {

        console.warn(
            "Supabase client পাওয়া যায়নি।"
        );

        return;
    }


    try {

        const [
            divisionsResult,
            districtsResult,
            upazilasResult
        ] =
            await Promise.all([

                dorkariSupabase
                    .from("divisions")
                    .select(
                        "id,name,name_bn"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from("districts")
                    .select(
                        "id,name,name_bn,division_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from("upazilas")
                    .select(
                        "id,name,name_bn,district_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
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


        homeLocationState.divisions =
            divisionsResult.data || [];

        homeLocationState.districts =
            districtsResult.data || [];

        homeLocationState.upazilas =
            upazilasResult.data || [];


        fillLocationSelect(
            division,
            homeLocationState.divisions,
            "বিভাগ নির্বাচন করুন"
        );


        resetLocationSelect(
            district,
            "জেলা নির্বাচন করুন"
        );


        resetLocationSelect(
            upazila,
            "উপজেলা নির্বাচন করুন"
        );


        restoreSavedHomeLocation();


        /*
         * Hospital interface-কে জানাই যে
         * Division / District / Upazila data এখন ready।
         */
        document.dispatchEvent(
            new CustomEvent(
                "dorkari:locations-loaded"
            )
        );


        console.info(
            "Dorkari locations loaded:",
            {
                divisions:
                    homeLocationState.divisions.length,

                districts:
                    homeLocationState.districts.length,

                upazilas:
                    homeLocationState.upazilas.length
            }
        );


        console.info(
            "Dorkari locations loaded:",
            {
                divisions:
                    homeLocationState.divisions.length,

                districts:
                    homeLocationState.districts.length,

                upazilas:
                    homeLocationState.upazilas.length
            }
        );

    } catch (error) {

        console.error(
            "Home locations load failed:",
            error
        );

        updateLocationSavedState(
            "লোকেশন তথ্য লোড করা যায়নি।"
        );

        showToast(
            "লোকেশন তথ্য লোড করা যায়নি"
        );
    }
}


// =========================================================
// LOCATION SAVE
// =========================================================

function saveCurrentHomeLocation() {

    const {
        division,
        district,
        upazila
    } =
        getLocationElements();


    if (!division?.value) {

        showToast(
            "প্রথমে বিভাগ নির্বাচন করুন"
        );

        division?.focus();

        return false;
    }


    const divisionOption =
        division.selectedOptions?.item(0);

    const districtOption =
        district?.selectedOptions?.item(0);

    const upazilaOption =
        upazila?.selectedOptions?.item(0);


    const locationData = {

        divisionId:
            division.value,

        divisionName:
            cleanText(
                divisionOption?.textContent
            ),

        districtId:
            district?.value || "",

        districtName:
            cleanText(
                districtOption?.textContent
            ),

        upazilaId:
            upazila?.value || "",

        upazilaName:
            cleanText(
                upazilaOption?.textContent
            )
    };


    saveHomeLocation(
        locationData
    );


    const label =
        getLocationLabel(
            locationData.divisionName,
            locationData.districtName,
            locationData.upazilaName
        );


    updateHeaderLocationStatus();


    updateLocationSavedState(
        label
            ? `✓ ${label} সংরক্ষিত আছে`
            : "আপনার নির্বাচন এই ডিভাইসে মনে রাখা হবে।"
    );


    showToast(
        `${label} — লোকেশন সংরক্ষণ হয়েছে`
    );


    return true;
}


// =========================================================
// LOCATION EVENTS
// =========================================================

function initializeHomeLocationEvents() {

    const {
        division,
        district,
        upazila,
        searchButton
    } =
        getLocationElements();


    division?.addEventListener(
        "change",
        () => {

            updateHomeDistricts(
                division.value
            );

            updateLocationSavedState(
                "জেলা নির্বাচন করুন।"
            );
        }
    );


    district?.addEventListener(
        "change",
        () => {

            updateHomeUpazilas(
                district.value
            );

            updateLocationSavedState(
                "উপজেলা নির্বাচন করুন বা নিচে সংরক্ষণ করুন।"
            );
        }
    );


    upazila?.addEventListener(
        "change",
        () => {

            updateHeaderLocationStatus();

            updateLocationSavedState(
                "আপনার নির্বাচন সংরক্ষণ করতে নিচের বাটনে চাপুন।"
            );
        }
    );


    searchButton?.addEventListener(
        "click",
        () => {

            saveCurrentHomeLocation();
        }
    );
}


// =========================================================
// EMERGENCY PREVIEW
// =========================================================

function renderEmergencyEmptyState() {

    const container =
        $("#emergencyPreviewList");

    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="emergency-item">

            <div
                class="emergency-item-icon"
                aria-hidden="true"
            >
                !
            </div>

            <div class="emergency-item-content">

                <h3>
                    এখন কোনো তথ্য পাওয়া যায়নি
                </h3>

                <p>
                    বর্তমানে সক্রিয় কোনো জরুরি যোগাযোগ নেই।
                </p>

            </div>

        </div>
    `;
}


function renderEmergencyErrorState() {

    const container =
        $("#emergencyPreviewList");

    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="emergency-item">

            <div
                class="emergency-item-icon"
                aria-hidden="true"
            >
                !
            </div>

            <div class="emergency-item-content">

                <h3>
                    তথ্য লোড করা যায়নি
                </h3>

                <p>
                    জরুরি তথ্য সাময়িকভাবে পাওয়া যাচ্ছে না।
                </p>

            </div>

        </div>
    `;
}


function renderEmergencyRecords(
    records
) {

    const container =
        $("#emergencyPreviewList");

    if (!container) {
        return;
    }


    container.innerHTML =
        records
            .map((record) => {

                const name =
                    getDisplayName(
                        record
                    );


                const phone =
                    getPhone(
                        record
                    );


                const safePhone =
                    normalizePhone(
                        phone
                    );


                const description =
                    cleanText(
                        record.description
                    ) ||
                    "জরুরি যোগাযোগের তথ্য";


                const verifiedBadge =
                    record.is_verified
                        ? `
                            <span class="verified-badge">
                                ✓ যাচাইকৃত
                            </span>
                          `
                        : "";


                const phoneMarkup =
                    safePhone
                        ? `
                            <strong class="emergency-number">
                                ${escapeHTML(phone)}
                            </strong>
                          `
                        : "";


                const actionsMarkup =
                    safePhone
                        ? `
                            <div class="emergency-actions">

                                <a
                                    href="tel:${escapeHTML(
                            safePhone
                        )}"
                                    class="call-btn"
                                    aria-label="${escapeHTML(
                            `${name} - কল করুন`
                        )}"
                                >
                                    📞 কল
                                </a>

                                <button
                                    type="button"
                                    class="copy-btn"
                                    data-copy="${escapeHTML(
                            phone
                        )}"
                                    aria-label="${escapeHTML(
                            `${name} - নম্বর কপি করুন`
                        )}"
                                >
                                    ⧉ কপি
                                </button>

                            </div>
                          `
                        : "";


                return `
                    <article
                        class="emergency-item"
                    >

                        <div
                            class="emergency-item-icon"
                            aria-hidden="true"
                        >
                            !
                        </div>


                        <div
                            class="emergency-item-content"
                        >

                            <div
                                class="emergency-title-row"
                            >

                                <h3>
                                    ${escapeHTML(
                    name
                )}
                                </h3>

                                ${verifiedBadge}

                            </div>


                            <p>
                                ${escapeHTML(
                    description
                )}
                            </p>


                            ${phoneMarkup}

                        </div>


                        ${actionsMarkup}

                    </article>
                `;
            })
            .join("");
}


async function loadEmergencyPreview() {

    const container =
        $("#emergencyPreviewList");


    if (!container) {
        return;
    }


    if (!dorkariSupabase) {

        renderEmergencyErrorState();

        return;
    }


    try {

        const {
            data,
            error
        } =
            await dorkariSupabase
                .from(
                    "emergency_contacts"
                )
                .select(
                    `
                    id,
                    name,
                    name_bn,
                    phone,
                    description,
                    is_verified,
                    is_active,
                    created_at
                    `
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )
                .limit(3);


        if (error) {
            throw error;
        }


        const records =
            Array.isArray(data)
                ? data
                : [];


        if (!records.length) {

            renderEmergencyEmptyState();

            return;
        }


        renderEmergencyRecords(
            records
        );

    } catch (error) {

        console.error(
            "Emergency preview load failed:",
            error
        );

        renderEmergencyErrorState();
    }
}


// =========================================================
// SMOOTH SECTION NAVIGATION
// =========================================================

function closeMobileMenu() {

    const menu =
        $("#mobileMenu");

    const button =
        $("#mobileMenuButton");


    if (menu) {
        menu.hidden = true;
    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        button.setAttribute(
            "aria-label",
            "মেনু খুলুন"
        );
    }


    document.body.classList.remove(
        "menu-open"
    );
}


// =========================================================
// DESKTOP / NORMAL ANCHOR NAVIGATION
// Bottom navigation এবং service interface trigger
// এখানে handle করা হবে না।
// =========================================================

function initializeSmoothNavigation() {

    document.addEventListener(
        "click",
        (event) => {

            /*
             * Bottom navigation নিজে handle করবে।
             */
            if (
                event.target.closest(
                    "[data-bottom-nav]"
                )
            ) {
                return;
            }


            /*
             * Service interface trigger
             * নিজে handle করবে।
             */
            if (
                event.target.closest(
                    "[data-interface-open]"
                )
            ) {
                return;
            }


            const link =
                event.target.closest(
                    'a[href^="#"]'
                );


            if (!link) {
                return;
            }


            const targetId =
                cleanText(
                    link.getAttribute("href")
                )
                    .replace(/^#/, "");


            if (!targetId) {
                return;
            }


            const target =
                document.getElementById(
                    targetId
                );


            if (!target) {
                return;
            }


            event.preventDefault();


            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


            closeMobileMenu();
        }
    );
}


// =========================================================
// BOTTOM NAVIGATION
// =========================================================

function setActiveBottomNav(
    targetId
) {

    $$("[data-bottom-nav]")
        .forEach((item) => {

            const itemTarget =
                cleanText(
                    item.dataset.sectionTarget
                );

            item.classList.toggle(
                "active",
                itemTarget === targetId
            );
        });
}

// =========================================================
// BOTTOM NAVIGATION — APP STYLE
// এখানে কোনো scroll হবে না।
// প্রতিটি button একটি আলাদা app view খুলবে।
// =========================================================

function initializeBottomNavigation() {

    const navItems =
        $$("[data-bottom-nav]");


    if (!navItems.length) {
        return;
    }


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                event.stopPropagation();


                const targetId =
                    cleanText(
                        item.dataset.sectionTarget
                    );


                if (!targetId) {
                    return;
                }


                /*
                 * HOME
                 */

                if (
                    targetId === "home"
                ) {

                    closeServiceInterface(
                        false
                    );


                    setActiveBottomNav(
                        "home"
                    );


                    window.history.replaceState(
                        {},
                        "",
                        window.location.pathname +
                        window.location.search
                    );


                    window.requestAnimationFrame(
                        () => {

                            window.scrollTo({
                                top: 0,
                                behavior: "smooth"
                            });

                        }
                    );


                    return;
                }


                /*
                 * SERVICES
                 */

                if (
                    targetId === "services"
                ) {

                    setActiveBottomNav(
                        "services"
                    );


                    openServiceInterface(
                        "services"
                    );


                    return;
                }


                /*
                 * EMERGENCY
                 */

                if (
                    targetId === "emergency"
                ) {

                    setActiveBottomNav(
                        "emergency"
                    );


                    openServiceInterface(
                        "emergency"
                    );


                    return;
                }


                /*
                 * LOCATION
                 */

                if (
                    targetId === "location"
                ) {

                    setActiveBottomNav(
                        "location"
                    );


                    openServiceInterface(
                        "location"
                    );


                    return;
                }


                /*
                 * SEARCH
                 */

                if (
                    item.id ===
                    "bottomSearchNav"
                ) {

                    openServiceInterface(
                        "search"
                    );


                    return;
                }

            }
        );

    });


    /*
     * কোনো IntersectionObserver আর নেই।
     *
     * কারণ user scroll করলে bottom nav-এর
     * active state আর বদলাবে না।
     *
     * Active state এখন navigation click-এর
     * উপর নির্ভর করবে।
     */

    setActiveBottomNav(
        "home"
    );
}

// =========================================================
// 999 QUICK ACTIONS
// =========================================================

function initializeEmergencyQuickActions() {

    const quickCall =
        $("#quickEmergencyCall");

    const quickCopy =
        $("#quickEmergencyCopy");


    quickCall?.addEventListener(
        "click",
        () => {

            window.location.href =
                "tel:999";
        }
    );


    quickCopy?.addEventListener(
        "click",
        async () => {

            await copyText(
                "999",
                "✓ 999 নম্বর কপি হয়েছে"
            );
        }
    );
}


// =========================================================
// HEADER SCROLL STATE
// =========================================================

function initializeHeaderScroll() {

    const header =
        $(".site-header");


    if (!header) {
        return;
    }


    let ticking =
        false;


    const updateHeader =
        () => {

            header.classList.toggle(
                "is-scrolled",
                window.scrollY > 12
            );

            ticking = false;
        };


    updateHeader();


    window.addEventListener(
        "scroll",
        () => {

            if (ticking) {
                return;
            }

            ticking = true;

            window.requestAnimationFrame(
                updateHeader
            );
        },
        {
            passive: true
        }
    );
}


// =========================================================
// PWA INSTALL UI
// =========================================================

let deferredInstallPrompt =
    null;


function setInstallButtonState(
    visible
) {

    $$("[data-install-app]")
        .forEach((button) => {

            button.hidden =
                !visible;
        });
}


function initializePWAInstall() {

    setInstallButtonState(
        false
    );


    window.addEventListener(
        "beforeinstallprompt",
        (event) => {

            event.preventDefault();

            deferredInstallPrompt =
                event;

            setInstallButtonState(
                true
            );
        }
    );


    $$("[data-install-app]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                async () => {

                    if (
                        !deferredInstallPrompt
                    ) {
                        showToast(
                            "এই ডিভাইসে এখন Install অপশন পাওয়া যাচ্ছে না"
                        );

                        return;
                    }


                    deferredInstallPrompt.prompt();


                    try {

                        await deferredInstallPrompt
                            .userChoice;

                    } catch (error) {

                        console.warn(
                            "Install choice failed:",
                            error
                        );
                    }


                    deferredInstallPrompt =
                        null;

                    setInstallButtonState(
                        false
                    );
                }
            );
        });


    window.addEventListener(
        "appinstalled",
        () => {

            deferredInstallPrompt =
                null;

            setInstallButtonState(
                false
            );

            showToast(
                "✓ Dorkari অ্যাপ ইনস্টল হয়েছে"
            );
        }
    );
}


// =========================================================
// IMAGE SAFETY
// =========================================================

function initializeImageFallbacks() {

    $$("img").forEach((image) => {

        image.addEventListener(
            "error",
            () => {

                image.classList.add(
                    "image-load-failed"
                );
            },
            {
                once: true
            }
        );
    });
}

// =========================================================
// PWA SERVICE WORKER
// =========================================================
function initializeServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {
        return;
    }


    // =====================================================
    // NETWORK STATUS
    // =====================================================

    function showOfflineNotice() {

        showToast(
            "⚠ You are offline — live data is unavailable."
        );
    }


    window.addEventListener(
        "offline",
        showOfflineNotice
    );


    window.addEventListener(
        "online",
        () => {

            showToast(
                "✓ You are now connected "
            );
        }
    );


    /*
     * App যদি শুরু হওয়ার সময়ই offline থাকে,
     * তাহলে offline event নাও fire করতে পারে।
     * তাই initial state-ও check করি।
     */

    if (
        !navigator.onLine
    ) {

        window.setTimeout(
            showOfflineNotice,
            300
        );
    }


    /*
     * Local development এবং HTTPS production
     * উভয় ক্ষেত্রেই browser service worker
     * register করার চেষ্টা করবে।
     */

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .then((registration) => {

                    console.info(
                        "Dorkari Service Worker registered:",
                        registration.scope
                    );

                })
                .catch((error) => {

                    console.warn(
                        "Dorkari Service Worker registration failed:",
                        error
                    );

                });

        }
    );
}
 

// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeMobileMenu();

        initializeSearch();

        initializeBottomSearch();
        initializeServiceCards();
        initializeServiceInterfaces();
        initializeBloodInterface();
        initializeBloodGuidelinePopup();
        initializeTestFeesInterface();
        initializeGovernmentInterface();
        initializeDoctorInterface();
        initializeAmbulanceInterface();

        initializeHomeLocationEvents();

        initializeBottomNavigation();

        initializeEmergencyQuickActions();

        initializeSmoothNavigation();

        initializeHeaderScroll();

        initializePWAInstall();
        initializeServiceWorker();

        initializeImageFallbacks();

        loadHomeLocations();

        loadEmergencyPreview();
    }
);
/* =========================================================
   DORKARI — BLOOD BANK PUBLIC INTERFACE
   ========================================================= */

const bloodBankState = {
    banks: [],
    filtered: [],
    divisions: [],
    districts: [],
    upazilas: [],
    selectedBloodGroup: "",
    locationOnly: false,
    loading: false,
    loaded: false
};


/* =========================================================
   BLOOD BANK — HELPERS
   ========================================================= */

function getBloodBankElements() {

    return {
        interface:
            document.querySelector(
                '[data-interface="blood"]'
            ),

        search:
            document.querySelector(
                '[data-interface-search="blood"]'
            ),

        locationButton:
            document.querySelector(
                '[data-interface-location="blood"]'
            ),

        resultCount:
            document.querySelector(
                "[data-blood-result-count]"
            ),

        results:
            document.querySelector(
                '[data-interface-results="blood"]'
            ),

        groupButtons:
            Array.from(
                document.querySelectorAll(
                    "[data-blood-group]"
                )
            ),

        clearGroup:
            document.querySelector(
                "[data-blood-group-clear]"
            )
    };

}


/* =========================================================
   BLOOD GROUP NORMALIZATION
   ========================================================= */

function normalizeBloodGroupValue(value) {

    return cleanText(value)
        .replace(/[−–—]/g, "-")
        .replace(/\s+/g, "")
        .toUpperCase();

}


function extractBloodGroups(value) {

    if (Array.isArray(value)) {

        return value
            .flatMap((item) =>
                extractBloodGroups(item)
            )
            .filter(Boolean);

    }


    if (
        value !== null &&
        typeof value === "object"
    ) {

        return Object.values(value)
            .flatMap((item) =>
                extractBloodGroups(item)
            )
            .filter(Boolean);

    }


    const text =
        cleanText(value);

    if (!text) {
        return [];
    }


    return text
        .replace(/[()[\]{}"]/g, " ")
        .split(/[,;|/]+/)
        .map(normalizeBloodGroupValue)
        .filter((group) =>
            [
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-"
            ].includes(group)
        );

}


/* =========================================================
   BLOOD BANK — LOCATION
   ========================================================= */

function getBloodBankLocationLabel(
    bank
) {

    const divisionName =
        getLocationNameById(
            bloodBankState.divisions,
            bank.division_id
        );

    const districtName =
        getLocationNameById(
            bloodBankState.districts,
            bank.district_id
        );

    const upazilaName =
        getLocationNameById(
            bloodBankState.upazilas,
            bank.upazila_id
        );


    return getLocationLabel(
        divisionName,
        districtName,
        upazilaName
    );

}


function getSavedBloodBankLocation() {

    const saved =
        getSavedHomeLocation();

    if (!saved) {
        return null;
    }


    return {

        divisionId:
            cleanText(
                saved.divisionId
            ),

        districtId:
            cleanText(
                saved.districtId
            ),

        upazilaId:
            cleanText(
                saved.upazilaId
            ),

        divisionName:
            cleanText(
                saved.divisionName
            ),

        districtName:
            cleanText(
                saved.districtName
            ),

        upazilaName:
            cleanText(
                saved.upazilaName
            )
    };

}


function bloodBankMatchesLocation(
    bank,
    saved
) {

    if (!saved) {
        return true;
    }


    if (saved.upazilaId) {

        return (
            String(
                bank.upazila_id
            ) ===
            String(
                saved.upazilaId
            )
        );

    }


    if (saved.districtId) {

        return (
            String(
                bank.district_id
            ) ===
            String(
                saved.districtId
            )
        );

    }


    if (saved.divisionId) {

        return (
            String(
                bank.division_id
            ) ===
            String(
                saved.divisionId
            )
        );

    }


    return true;

}


function getBloodBankLocationScore(
    bank,
    saved
) {

    if (!saved) {
        return 0;
    }


    if (
        saved.upazilaId &&
        String(
            bank.upazila_id
        ) ===
        String(
            saved.upazilaId
        )
    ) {
        return 3;
    }


    if (
        saved.districtId &&
        String(
            bank.district_id
        ) ===
        String(
            saved.districtId
        )
    ) {
        return 2;
    }


    if (
        saved.divisionId &&
        String(
            bank.division_id
        ) ===
        String(
            saved.divisionId
        )
    ) {
        return 1;
    }


    return 0;

}


/* =========================================================
   BLOOD BANK — MAP
   ========================================================= */

function buildBloodBankMapUrl(
    bank
) {

    const searchText = [
        getDisplayName(bank),
        bank.address,
        getBloodBankLocationLabel(bank)
    ]
        .map(cleanText)
        .filter(Boolean)
        .join(", ");


    if (!searchText) {
        return "";
    }


    return (
        "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(
            searchText
        )}`
    );

}


/* =========================================================
   BLOOD BANK — CARD
   ========================================================= */

function buildBloodBankCard(
    bank
) {

    const name =
        getDisplayName(bank);

    const englishName =
        cleanText(
            bank.name
        );

    const phone =
        cleanText(
            bank.phone
        );

    const safePhone =
        normalizePhone(
            phone
        );

    const address =
        cleanText(
            bank.address
        );

    const locationLabel =
        getBloodBankLocationLabel(
            bank
        );

    const mapUrl =
        buildBloodBankMapUrl(
            bank
        );

    const groups =
        extractBloodGroups(
            bank.blood_groups
        );


    const verifiedBadge =
        bank.is_verified
            ? `
                <span
                    class="blood-interface-badge is-verified"
                >
                    ✓ যাচাইকৃত
                </span>
            `
            : "";


    const groupBadges =
        groups.length
            ? groups
                .map(
                    (group) => `
                        <span
                            class="blood-interface-badge is-blood"
                        >
                            ${escapeHTML(group)}
                        </span>
                    `
                )
                .join("")
            : `
                <span
                    class="blood-interface-badge"
                >
                    গ্রুপ তথ্য নেই
                </span>
            `;


    const phoneAction =
        safePhone
            ? `
                <a
                    href="tel:${escapeHTML(
                safePhone
            )}"
                    class="blood-interface-action is-primary"
                >
                    কল করুন
                </a>
            `
            : "";


    const copyAction =
        phone
            ? `
                <button
                    type="button"
                    class="blood-interface-action"
                    data-copy="${escapeHTML(
                phone
            )}"
                >
                    নম্বর কপি
                </button>
            `
            : "";


    const mapAction =
        mapUrl
            ? `
                <a
                    href="${escapeHTML(
                mapUrl
            )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="blood-interface-action is-danger"
                >
                    ম্যাপে দেখুন
                </a>
            `
            : "";


    const englishNameMarkup =
        englishName &&
            englishName !== name
            ? `
                <p
                    class="blood-interface-card-subtitle"
                >
                    ${escapeHTML(
                englishName
            )}
                </p>
            `
            : "";


    const phoneMarkup =
        phone
            ? `
                <div
                    class="blood-interface-phone"
                >
                    ${escapeHTML(phone)}
                </div>
            `
            : "";


    const locationMarkup =
        locationLabel
            ? `
                <div
                    class="blood-interface-meta"
                >
                    <span
                        aria-hidden="true"
                    >
                        ◇
                    </span>

                    <span>
                        ${escapeHTML(
                locationLabel
            )}
                    </span>
                </div>
            `
            : "";


    const addressMarkup =
        address
            ? `
                <div
                    class="blood-interface-meta"
                >
                    <span
                        aria-hidden="true"
                    >
                        ⌂
                    </span>

                    <span>
                        ${escapeHTML(
                address
            )}
                    </span>
                </div>
            `
            : "";


    const detailsMarkup = `
        <details
            class="blood-interface-details"
        >
            <summary>
                বিস্তারিত দেখুন
            </summary>

            <div
                class="blood-interface-details-body"
            >
                ${locationLabel
            ? `
                            <div>
                                <strong>এলাকা:</strong>
                                ${escapeHTML(
                locationLabel
            )}
                            </div>
                        `
            : ""
        }

                ${address
            ? `
                            <div>
                                <strong>ঠিকানা:</strong>
                                ${escapeHTML(
                address
            )}
                            </div>
                        `
            : ""
        }

                ${phone
            ? `
                            <div>
                                <strong>ফোন:</strong>
                                ${escapeHTML(
                phone
            )}
                            </div>
                        `
            : ""
        }

                ${groups.length
            ? `
                            <div>
                                <strong>রক্তের গ্রুপ:</strong>
                                ${escapeHTML(
                groups.join(
                    ", "
                )
            )}
                            </div>
                        `
            : ""
        }
            </div>
        </details>
    `;


    return `
        <article
            class="blood-interface-card"
        >

            <div
                class="blood-interface-card-top"
            >

                <div>

                    <h3
                        class="blood-interface-card-title"
                    >
                        ${escapeHTML(name)}
                    </h3>

                    ${englishNameMarkup}

                </div>


                <span
                    class="blood-interface-card-mark"
                    aria-hidden="true"
                >
                    ♥
                </span>

            </div>


            <div
                class="blood-interface-badges"
            >

                ${groupBadges}

                ${verifiedBadge}

            </div>


            ${locationMarkup}

            ${addressMarkup}

            ${phoneMarkup}


            ${groups.length
            ? `
                        <div
                            class="blood-interface-groups"
                        >
                            ${groups
                .map(
                    (group) => `
                                        <span
                                            class="blood-interface-group-pill"
                                        >
                                            ${escapeHTML(
                        group
                    )}
                                        </span>
                                    `
                )
                .join("")}
                        </div>
                    `
            : ""
        }


            <div
                class="blood-interface-actions"
            >

                ${phoneAction}

                ${copyAction}

                ${mapAction}

            </div>


            ${detailsMarkup}

        </article>
    `;

}


/* =========================================================
   BLOOD BANK — EMPTY / LOADING
   ========================================================= */

function renderBloodBankMessage(
    title,
    message
) {

    const {
        results
    } =
        getBloodBankElements();


    if (!results) {
        return;
    }


    results.innerHTML = `
        <div
            class="blood-interface-empty"
        >
            <strong>
                ${escapeHTML(title)}
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>
        </div>
    `;

}


/* =========================================================
   BLOOD BANK — RESULT COUNT
   ========================================================= */

function formatBloodBankCount(
    count
) {

    const bengaliDigits =
        "০১২৩৪৫৬৭৮৯";


    return String(count)
        .replace(
            /\d/g,
            (digit) =>
                bengaliDigits[
                Number(digit)
                ]
        );

}


/* =========================================================
   BLOOD BANK — SEARCH MATCH
   ========================================================= */

function bloodBankMatchesSearch(
    bank,
    query
) {

    if (!query) {
        return true;
    }


    const locationLabel =
        getBloodBankLocationLabel(
            bank
        );

    const bloodGroups =
        extractBloodGroups(
            bank.blood_groups
        ).join(" ");


    const haystack = [
        bank.name,
        bank.address,
        bank.phone,
        bloodGroups,
        locationLabel
    ]
        .map(cleanText)
        .join(" ")
        .toLocaleLowerCase();


    return haystack.includes(
        query
    );

}


/* =========================================================
   BLOOD BANK — RENDER RESULTS
   ========================================================= */

function renderBloodBankResults() {

    const {
        search,
        locationButton,
        resultCount,
        results
    } =
        getBloodBankElements();


    if (!results) {
        return;
    }


    const query =
        cleanText(
            search?.value
        ).toLocaleLowerCase();


    const saved =
        getSavedBloodBankLocation();


    let filtered =
        bloodBankState.banks.filter(
            (bank) => {

                if (
                    bloodBankState.selectedBloodGroup
                ) {

                    const groups =
                        extractBloodGroups(
                            bank.blood_groups
                        );

                    if (
                        !groups.includes(
                            normalizeBloodGroupValue(
                                bloodBankState
                                    .selectedBloodGroup
                            )
                        )
                    ) {
                        return false;
                    }

                }


                if (
                    bloodBankState.locationOnly
                ) {

                    if (!saved) {
                        return false;
                    }

                    if (
                        !bloodBankMatchesLocation(
                            bank,
                            saved
                        )
                    ) {
                        return false;
                    }

                }


                if (
                    !bloodBankMatchesSearch(
                        bank,
                        query
                    )
                ) {
                    return false;
                }


                return true;

            }
        );


    filtered.sort(
        (a, b) => {

            const scoreA =
                getBloodBankLocationScore(
                    a,
                    saved
                );

            const scoreB =
                getBloodBankLocationScore(
                    b,
                    saved
                );


            if (
                scoreA !== scoreB
            ) {
                return (
                    scoreB -
                    scoreA
                );
            }


            return (
                getDisplayName(a)
                    .localeCompare(
                        getDisplayName(b),
                        "bn"
                    )
            );

        }
    );


    bloodBankState.filtered =
        filtered;


    if (resultCount) {

        resultCount.textContent =
            `${formatBloodBankCount(
                filtered.length
            )}টি`;

    }


    if (locationButton) {

        locationButton.setAttribute(
            "aria-pressed",
            bloodBankState.locationOnly
                ? "true"
                : "false"
        );


        locationButton.textContent =
            bloodBankState.locationOnly
                ? "✓ আমার এলাকা"
                : "⌖ আমার এলাকা";

    }


    if (!filtered.length) {

        renderBloodBankMessage(
            "কোনো ব্লাড ব্যাংক পাওয়া যায়নি।",
            bloodBankState.locationOnly &&
                !saved
                ? "আগে হোম পেজে আপনার এলাকা সংরক্ষণ করুন।"
                : "অন্য রক্তের গ্রুপ, নাম বা এলাকা দিয়ে আবার চেষ্টা করুন।"
        );

        return;

    }


    results.innerHTML = `
        <div
            class="blood-interface-list"
        >
            ${filtered
            .map(
                (bank) =>
                    buildBloodBankCard(
                        bank
                    )
            )
            .join("")}
        </div>
    `;

}


/* =========================================================
   BLOOD BANK — LOAD DATA
   ========================================================= */

async function loadBloodData() {

    if (
        bloodBankState.loaded ||
        bloodBankState.loading
    ) {
        renderBloodBankResults();
        return;
    }


    const {
        results
    } =
        getBloodBankElements();


    if (!results) {
        return;
    }


    if (!dorkariSupabase) {

        renderBloodBankMessage(
            "তথ্য লোড করা যাচ্ছে না।",
            "Supabase সংযোগ পাওয়া যায়নি।"
        );

        return;

    }


    bloodBankState.loading =
        true;


    renderBloodBankMessage(
        "ব্লাড ব্যাংকের তথ্য লোড হচ্ছে...",
        "একটু অপেক্ষা করুন।"
    );


    try {

        const [
            banksResult,
            divisionsResult,
            districtsResult,
            upazilasResult
        ] =
            await Promise.all([
                dorkariSupabase
                    .from("blood_banks")
                    .select(`
                        id,
                        name,
                        division_id,
                        district_id,
                        upazila_id,
                        address,
                        phone,
                        blood_groups,
                        is_verified,
                        is_active,
                        created_at,
                        updated_at
                    `)
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from("divisions")
                    .select(
                        "id,name,name_bn"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from("districts")
                    .select(
                        "id,name,name_bn,division_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    ),

                dorkariSupabase
                    .from("upazilas")
                    .select(
                        "id,name,name_bn,district_id"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "name"
                    )
            ]);


        if (banksResult.error) {
            throw banksResult.error;
        }


        if (divisionsResult.error) {
            throw divisionsResult.error;
        }


        if (districtsResult.error) {
            throw districtsResult.error;
        }


        if (upazilasResult.error) {
            throw upazilasResult.error;
        }


        bloodBankState.banks =
            banksResult.data || [];


        bloodBankState.divisions =
            divisionsResult.data || [];


        bloodBankState.districts =
            districtsResult.data || [];


        bloodBankState.upazilas =
            upazilasResult.data || [];


        /*
         * Home location tables ইতিমধ্যে
         * load হয়ে থাকলে সেগুলোর data-কে
         * fallback হিসেবে ব্যবহার করা যাবে।
         */
        if (
            !bloodBankState.divisions.length &&
            homeLocationState.divisions.length
        ) {

            bloodBankState.divisions =
                homeLocationState.divisions;

        }


        if (
            !bloodBankState.districts.length &&
            homeLocationState.districts.length
        ) {

            bloodBankState.districts =
                homeLocationState.districts;

        }


        if (
            !bloodBankState.upazilas.length &&
            homeLocationState.upazilas.length
        ) {

            bloodBankState.upazilas =
                homeLocationState.upazilas;

        }


        bloodBankState.loaded =
            true;


        console.info(
            "Dorkari Blood Bank data loaded:",
            {
                banks:
                    bloodBankState
                        .banks
                        .length,

                divisions:
                    bloodBankState
                        .divisions
                        .length,

                districts:
                    bloodBankState
                        .districts
                        .length,

                upazilas:
                    bloodBankState
                        .upazilas
                        .length
            }
        );


        renderBloodBankResults();

    } catch (error) {

        console.error(
            "Blood Bank data load failed:",
            error
        );


        renderBloodBankMessage(
            "ব্লাড ব্যাংকের তথ্য লোড হয়নি।",
            "পরে আবার চেষ্টা করুন।"
        );

    } finally {

        bloodBankState.loading =
            false;

    }

}


/* =========================================================
   BLOOD BANK — INITIALIZE UI
   ========================================================= */

function initializeBloodInterface() {

    const {
        interface:
        bloodInterface,
        search,
        locationButton,
        groupButtons,
        clearGroup
    } =
        getBloodBankElements();


    if (!bloodInterface) {
        return;
    }


    groupButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const group =
                        normalizeBloodGroupValue(
                            button.dataset
                                .bloodGroup
                        );


                    if (
                        bloodBankState
                            .selectedBloodGroup ===
                        group
                    ) {

                        bloodBankState
                            .selectedBloodGroup =
                            "";

                    } else {

                        bloodBankState
                            .selectedBloodGroup =
                            group;

                    }


                    groupButtons.forEach(
                        (item) => {

                            const itemGroup =
                                normalizeBloodGroupValue(
                                    item.dataset
                                        .bloodGroup
                                );

                            const active =
                                itemGroup ===
                                bloodBankState
                                    .selectedBloodGroup;


                            item.setAttribute(
                                "aria-pressed",
                                active
                                    ? "true"
                                    : "false"
                            );

                        }
                    );


                    renderBloodBankResults();

                }
            );

        }
    );


    clearGroup?.addEventListener(
        "click",
        () => {

            bloodBankState
                .selectedBloodGroup =
                "";


            groupButtons.forEach(
                (button) => {

                    button.setAttribute(
                        "aria-pressed",
                        "false"
                    );

                }
            );


            renderBloodBankResults();

        }
    );


    search?.addEventListener(
        "input",
        () => {
            renderBloodBankResults();
        }
    );


    locationButton?.addEventListener(
        "click",
        () => {

            const saved =
                getSavedBloodBankLocation();


            if (!saved) {

                bloodBankState
                    .locationOnly =
                    false;


                locationButton.setAttribute(
                    "aria-pressed",
                    "false"
                );


                locationButton.textContent =
                    "⌖ আমার এলাকা";


                showToast(
                    "আগে হোম পেজে আপনার এলাকা নির্বাচন করুন"
                );


                return;

            }


            bloodBankState
                .locationOnly =
                !bloodBankState
                    .locationOnly;


            renderBloodBankResults();

        }
    );


    /*
     * Interface খুলে যাওয়ার পর data না এলে
     * প্রথমবার এখান থেকেই load হবে।
     */
    if (
        !bloodBankState.loaded &&
        !bloodBankState.loading
    ) {

        /*
         * Data immediately load করছি না,
         * যাতে Home initial load-এর উপর
         * অপ্রয়োজনীয় Supabase request না পড়ে।
         */
    }

}


/* =========================================================
   BLOOD BANK — HASH / URL SUPPORT
   ========================================================= */

function initializeBloodInterfaceHashSupport() {

    const initialHash =
        cleanText(
            window.location.hash
        )
            .replace(
                /^#/,
                ""
            )
            .toLowerCase();


    if (
        initialHash === "blood"
    ) {

        window.setTimeout(
            () => {
                loadBloodData();
            },
            0
        );

    }

}


/* =========================================================
   BLOOD BANK — AUTO REFRESH WHEN OPENED
   ========================================================= */

window.addEventListener(
    "dorkari:blood-open",
    () => {
        loadBloodData();
    }
);
/* =========================================================
   DORKARI — BLOOD BANK GUIDELINE POPUP BEHAVIOR
   ========================================================= */

function initializeBloodGuidelinePopup() {

    const modal =
        document.querySelector(
            "#bloodGuidelineModal"
        );

    const dialog =
        modal?.querySelector(
            ".blood-guideline-dialog"
        );

    if (!modal) {
        return;
    }


    function openBloodGuideline() {

        modal.hidden = false;

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "blood-guideline-open"
        );

        /*
         * Popup open হওয়ার পর close button-এ
         * focus দিলে keyboard accessibility-ও ঠিক থাকে।
         */
        window.requestAnimationFrame(
            () => {

                modal
                    .querySelector(
                        ".blood-guideline-close"
                    )
                    ?.focus();

            }
        );

    }


    function closeBloodGuideline() {

        modal.hidden = true;

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "blood-guideline-open"
        );

    }


    /*
     * X এবং "বুঝেছি, রক্ত খুঁজুন"
     * — দুইটিই একই close handler ব্যবহার করবে।
     */
    modal
        .querySelectorAll(
            "[data-blood-guideline-close]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {
                        closeBloodGuideline();
                    }
                );

            }
        );


    /*
     * Popup-এর বাইরের backdrop-এ click করলে close।
     */
    modal
        .querySelector(
            ".blood-guideline-backdrop"
        )
        ?.addEventListener(
            "click",
            () => {
                closeBloodGuideline();
            }
        );


    /*
     * Dialog-এর ভেতরে click করলে যেন
     * accidentally close না হয়।
     */
    dialog?.addEventListener(
        "click",
        (event) => {
            event.stopPropagation();
        }
    );


    /*
     * ESC চাপলেও popup বন্ধ হবে।
     */
    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            if (
                modal.hidden
            ) {
                return;
            }


            closeBloodGuideline();

        }
    );


    /*
     * Blood Bank interface open হলেই
     * popup দেখাবে।
     */
    window.addEventListener(
        "dorkari:blood-open",
        () => {

            openBloodGuideline();

        }
    );


    /*
     * কিছু ক্ষেত্রে custom event-এর আগে interface
     * already visible হয়ে যেতে পারে।
     * তাই Blood Bank interface-এর direct open-ও
     * support করছি।
     */
    window.openDorkariBloodGuideline =
        openBloodGuideline;

    window.closeDorkariBloodGuideline =
        closeBloodGuideline;

}
/* =========================================================
   DORKARI — TEST & FEES PUBLIC INTERFACE
   Public test listing + hospital-wise pricing
   ========================================================= */

const testFeesState = {

    tests: [],

    hospitalTests: [],

    hospitals: [],

    divisions: [],

    districts: [],

    upazilas: [],

    filtered: [],

    selectedCategory: "",

    locationOnly: false,

    loading: false,

    loaded: false

};


/* =========================================================
   TEST & FEES — DOM
   ========================================================= */

function getTestFeesElements() {

    return {

        interface:
            document.querySelector(
                '[data-interface="tests"]'
            ),

        search:
            document.querySelector(
                '[data-interface-search="tests"]'
            ),

        locationButton:
            document.querySelector(
                '[data-interface-location="tests"]'
            ),

        resultCount:
            document.querySelector(
                "[data-tests-result-count]"
            ),

        results:
            document.querySelector(
                '[data-interface-results="tests"]'
            ),

        categoryButtons:
            Array.from(
                document.querySelectorAll(
                    "[data-tests-category]"
                )
            ),

        categoryClear:
            document.querySelector(
                "[data-tests-category-clear]"
            )

    };

}


/* =========================================================
   TEST & FEES — CATEGORY NORMALIZATION
   ========================================================= */

function normalizeTestCategory(value) {

    const category =
        cleanText(value)
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    const categoryMap = {

        "routine":
            "রুটিন",

        "রুটিন":
            "রুটিন",

        "pathology":
            "প্যাথলজি",

        "প্যাথলজি":
            "প্যাথলজি",

        "radiology":
            "রেডিওলজি",

        "রেডিওলজি":
            "রেডিওলজি",

        "hormone":
            "হরমোন",

        "hormones":
            "হরমোন",

        "হরমোন":
            "হরমোন",

        "special":
            "বিশেষ পরীক্ষা",

        "special test":
            "বিশেষ পরীক্ষা",

        "special tests":
            "বিশেষ পরীক্ষা",

        "বিশেষ পরীক্ষা":
            "বিশেষ পরীক্ষা",

        "other":
            "অন্যান্য",

        "others":
            "অন্যান্য",

        "অন্যান্য":
            "অন্যান্য"

    };

    return (
        categoryMap[category] ||
        cleanText(value) ||
        "অন্যান্য"
    );

}


/* =========================================================
   TEST & FEES — NUMBER FORMAT
   ========================================================= */

function formatTestFeesNumber(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "";
    }

    const rounded =
        Number.isInteger(number)
            ? number.toString()
            : number.toFixed(2).replace(
                /\.?0+$/,
                ""
            );

    const parts =
        rounded.split(".");

    const integerPart =
        parts[0];

    const decimalPart =
        parts[1] || "";

    const formattedInteger =
        Number(integerPart).toLocaleString(
            "en-US"
        );

    const bengaliDigits =
        "০১২৩৪৫৬৭৮৯";

    const convertToBengali =
        (text) =>
            String(text).replace(
                /\d/g,
                (digit) =>
                    bengaliDigits[
                    Number(digit)
                    ]
            );

    return (
        convertToBengali(
            decimalPart
                ? `${formattedInteger}.${decimalPart}`
                : formattedInteger
        )
    );

}


/* =========================================================
   TEST & FEES — DATE FORMAT
   ========================================================= */

function formatTestFeesDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    try {

        return new Intl.DateTimeFormat(
            "bn-BD",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        ).format(date);

    } catch (error) {

        return date.toLocaleDateString(
            "bn-BD"
        );

    }

}


/* =========================================================
   TEST & FEES — LOCATION HELPERS
   ========================================================= */

function getTestFeesHospitalLocation(
    hospital
) {

    const divisionName =
        getLocationNameById(
            testFeesState.divisions,
            hospital?.division_id
        );

    const districtName =
        getLocationNameById(
            testFeesState.districts,
            hospital?.district_id
        );

    const upazilaName =
        getLocationNameById(
            testFeesState.upazilas,
            hospital?.upazila_id
        );

    return getLocationLabel(
        divisionName,
        districtName,
        upazilaName
    );

}


function testFeesMatchesLocation(
    hospital,
    saved
) {

    if (!saved) {
        return true;
    }

    if (saved.upazilaId) {

        return (
            String(
                hospital?.upazila_id
            ) ===
            String(
                saved.upazilaId
            )
        );

    }

    if (saved.districtId) {

        return (
            String(
                hospital?.district_id
            ) ===
            String(
                saved.districtId
            )
        );

    }

    if (saved.divisionId) {

        return (
            String(
                hospital?.division_id
            ) ===
            String(
                saved.divisionId
            )
        );

    }

    return true;

}


/* =========================================================
   TEST & FEES — RECORD HELPERS
   ========================================================= */

function getTestFeesHospitalById(
    hospitalId
) {

    return (
        testFeesState.hospitals.find(
            (hospital) =>
                String(hospital.id) ===
                String(hospitalId)
        ) ||
        null
    );

}


function getTestFeesHospitalRows(
    testId
) {

    return testFeesState.hospitalTests

        .filter(
            (row) =>
                String(row.test_id) ===
                String(testId)
        )

        .map(
            (row) => ({

                ...row,

                hospital:
                    getTestFeesHospitalById(
                        row.hospital_id
                    )

            })
        )

        .filter(
            (row) =>
                row.hospital
        );

}


function getEffectiveTestPrice(
    row
) {

    const price =
        Number(row?.price);

    const discountPrice =
        Number(
            row?.discount_price
        );

    if (
        Number.isFinite(
            discountPrice
        ) &&
        discountPrice > 0 &&
        Number.isFinite(price) &&
        discountPrice < price
    ) {

        return discountPrice;

    }

    return Number.isFinite(price)
        ? price
        : null;

}


function getLowestTestPrice(
    rows
) {

    const availableRows =
        rows.filter(
            (row) =>
                row?.is_available !== false
        );

    const prices =
        availableRows

            .map(
                (row) =>
                    getEffectiveTestPrice(
                        row
                    )
            )

            .filter(
                (price) =>
                    Number.isFinite(
                        price
                    )
            );

    if (!prices.length) {
        return null;
    }

    return Math.min(
        ...prices
    );

}


function getLatestTestUpdate(
    rows
) {

    const dates =
        rows

            .map(
                (row) =>
                    row?.last_updated ||
                    row?.created_at
            )

            .filter(Boolean)

            .map(
                (value) =>
                    new Date(value)
            )

            .filter(
                (date) =>
                    !Number.isNaN(
                        date.getTime()
                    )
            );

    if (!dates.length) {
        return null;
    }

    return new Date(
        Math.max(
            ...dates.map(
                (date) =>
                    date.getTime()
            )
        )
    ).toISOString();

}


/* =========================================================
   TEST & FEES — SEARCH TEXT
   ========================================================= */

function getTestFeesSearchText(
    test,
    rows
) {

    const hospitalText =
        rows

            .map(
                (row) =>
                    row?.hospital
            )

            .filter(Boolean)

            .flatMap(
                (hospital) => [

                    hospital?.name,

                    hospital?.name_bn,

                    hospital?.address,

                    getTestFeesHospitalLocation(
                        hospital
                    )

                ]
            );

    return [

        test?.name,

        test?.name_bn,

        test?.category,

        normalizeTestCategory(
            test?.category
        ),

        test?.description,

        ...hospitalText

    ]

        .map(cleanText)

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

}


function testFeesMatchesSearch(
    test,
    rows,
    searchText
) {

    if (!searchText) {
        return true;
    }

    return getTestFeesSearchText(
        test,
        rows
    ).includes(
        searchText
    );

}


/* =========================================================
   TEST & FEES — LOCATION FILTER
   ========================================================= */

function getTestFeesSavedLocation() {

    return getSavedHomeLocation();

}


function testFeesFilterRowsByLocation(
    rows,
    saved
) {

    if (!saved) {
        return rows;
    }

    return rows.filter(
        (row) =>
            testFeesMatchesLocation(
                row?.hospital,
                saved
            )
    );

}


/* =========================================================
   TEST & FEES — APPLY FILTERS
   ========================================================= */

function applyTestFeesFilters() {

    const {
        search
    } =
        getTestFeesElements();

    const searchText =
        cleanText(
            search?.value
        ).toLowerCase();

    const savedLocation =
        getTestFeesSavedLocation();

    testFeesState.filtered =
        testFeesState.tests.filter(
            (test) => {

                const normalizedCategory =
                    normalizeTestCategory(
                        test?.category
                    );

                if (
                    testFeesState
                        .selectedCategory &&
                    normalizedCategory !==
                    testFeesState
                        .selectedCategory
                ) {

                    return false;

                }

                let rows =
                    getTestFeesHospitalRows(
                        test.id
                    );

                if (
                    testFeesState
                        .locationOnly
                ) {

                    if (!savedLocation) {
                        return false;
                    }

                    rows =
                        testFeesFilterRowsByLocation(
                            rows,
                            savedLocation
                        );

                }

                if (
                    !testFeesMatchesSearch(
                        test,
                        rows,
                        searchText
                    )
                ) {

                    return false;

                }

                return true;

            }
        );

}


/* =========================================================
   TEST & FEES — PRICE ROW
   ========================================================= */

function buildTestFeesPriceRow(
    row
) {

    const hospital =
        row?.hospital;

    if (!hospital) {
        return "";
    }

    const hospitalName =
        getDisplayName(
            hospital
        );

    const price =
        Number(
            row?.price
        );

    const discountPrice =
        Number(
            row?.discount_price
        );

    const hasDiscount =
        Number.isFinite(
            discountPrice
        ) &&
        discountPrice > 0 &&
        Number.isFinite(price) &&
        discountPrice < price;

    const effectivePrice =
        hasDiscount
            ? discountPrice
            : price;

    const availability =
        row?.is_available !== false;

    return `

        <div class="tests-interface-price-row">

            <span
                class="tests-interface-price-row-name"
                title="${escapeHTML(
        hospitalName
    )}"
            >
                ${escapeHTML(
        hospitalName
    )}
            </span>

            <span
                class="tests-interface-price-row-value"
            >
                ${Number.isFinite(
        effectivePrice
    )
            ? `৳ ${formatTestFeesNumber(
                effectivePrice
            )}`
            : "ফি নেই"
        }
            </span>

        </div>

    `;

}


/* =========================================================
   TEST & FEES — HOSPITAL DETAIL
   ========================================================= */

function buildTestFeesHospitalDetail(
    row
) {

    const hospital =
        row?.hospital;

    if (!hospital) {
        return "";
    }

    const hospitalName =
        getDisplayName(
            hospital
        );

    const phone =
        cleanText(
            hospital?.phone
        );

    const address =
        cleanText(
            hospital?.address
        );

    const locationLabel =
        getTestFeesHospitalLocation(
            hospital
        );

    const price =
        Number(
            row?.price
        );

    const discountPrice =
        Number(
            row?.discount_price
        );

    const hasDiscount =
        Number.isFinite(
            discountPrice
        ) &&
        discountPrice > 0 &&
        Number.isFinite(price) &&
        discountPrice < price;

    const effectivePrice =
        hasDiscount
            ? discountPrice
            : price;

    const availability =
        row?.is_available !== false;

    const callAction =
        phone
            ? `
                <a
                    href="tel:${escapeHTML(
                normalizePhone(
                    phone
                )
            )}"
                    class="tests-interface-action is-primary"
                >
                    ☎ কল
                </a>
            `
            : "";

    return `

        <div class="tests-interface-detail-hospital">

            <div class="tests-interface-detail-hospital-head">

                <strong>
                    ${escapeHTML(
        hospitalName
    )}
                </strong>

                <span
                    class="
                        tests-interface-badge
                        ${availability
            ? "is-available"
            : "is-unavailable"
        }
                    "
                >
                    ${availability
            ? "✓ পাওয়া যাচ্ছে"
            : "✕ বর্তমানে নেই"
        }
                </span>

            </div>

            <div class="tests-interface-detail-hospital-price">

                <span>
                    ফি
                </span>

                <strong>
                    ${Number.isFinite(
            effectivePrice
        )
            ? `৳ ${formatTestFeesNumber(
                effectivePrice
            )}`
            : "তথ্য নেই"
        }
                </strong>

                ${hasDiscount
            ? `
                            <span
                                class="tests-interface-price-old"
                            >
                                ৳ ${formatTestFeesNumber(
                price
            )}
                            </span>
                        `
            : ""
        }

            </div>

            ${locationLabel
            ? `
                        <div
                            class="tests-interface-meta"
                        >
                            <span>
                                ◇
                            </span>

                            <span>
                                ${escapeHTML(
                locationLabel
            )}
                            </span>
                        </div>
                    `
            : ""
        }

            ${address
            ? `
                        <div
                            class="tests-interface-meta"
                        >
                            <span>
                                ⌖
                            </span>

                            <span>
                                ${escapeHTML(
                address
            )}
                            </span>
                        </div>
                    `
            : ""
        }

            ${phone
            ? `
                        <div
                            class="tests-interface-meta"
                        >
                            <span>
                                ☎
                            </span>

                            <span>
                                ${escapeHTML(
                phone
            )}
                            </span>
                        </div>
                    `
            : ""
        }

            ${cleanText(
            row?.notes
        )
            ? `
                        <div
                            class="tests-interface-description"
                        >
                            <p>
                                <strong>
                                    নোট:
                                </strong>

                                ${escapeHTML(
                row.notes
            )}
                            </p>
                        </div>
                    `
            : ""
        }

            <div
                class="tests-interface-detail-actions"
            >
                ${callAction}
            </div>

        </div>

    `;

}


/* =========================================================
   TEST & FEES — CARD
   ========================================================= */

function buildTestFeesCard(
    test
) {

    const allRows =
        getTestFeesHospitalRows(
            test.id
        );

    const savedLocation =
        getTestFeesSavedLocation();

    const visibleRows =
        testFeesState.locationOnly &&
            savedLocation
            ? testFeesFilterRowsByLocation(
                allRows,
                savedLocation
            )
            : allRows;

    const sortedRows =
        [...visibleRows]
            .sort(
                (a, b) => {

                    const priceA =
                        getEffectiveTestPrice(
                            a
                        );

                    const priceB =
                        getEffectiveTestPrice(
                            b
                        );

                    if (
                        !Number.isFinite(
                            priceA
                        ) &&
                        !Number.isFinite(
                            priceB
                        )
                    ) {
                        return 0;
                    }

                    if (
                        !Number.isFinite(
                            priceA
                        )
                    ) {
                        return 1;
                    }

                    if (
                        !Number.isFinite(
                            priceB
                        )
                    ) {
                        return -1;
                    }

                    return (
                        priceA -
                        priceB
                    );

                }
            );

    const availableRows =
        sortedRows.filter(
            (row) =>
                row?.is_available !== false
        );

    const lowestPrice =
        getLowestTestPrice(
            sortedRows
        );

    const latestUpdate =
        getLatestTestUpdate(
            sortedRows
        );

    const normalizedCategory =
        normalizeTestCategory(
            test?.category
        );

    const englishName =
        cleanText(
            test?.name
        );

    const description =
        cleanText(
            test?.description
        );

    const hospitalCount =
        new Set(
            sortedRows.map(
                (row) =>
                    String(
                        row.hospital_id
                    )
            )
        ).size;

    const availableCount =
        availableRows.length;

    const previewRows =
        sortedRows
            .slice(
                0,
                4
            );

    const detailsRows =
        sortedRows;

    const firstCallableHospital =
        sortedRows.find(
            (row) =>
                cleanText(
                    row?.hospital?.phone
                )
        );

    const callAction =
        firstCallableHospital
            ? `
                <a
                    href="tel:${escapeHTML(
                normalizePhone(
                    firstCallableHospital
                        .hospital
                        .phone
                )
            )}"
                    class="
                        tests-interface-action
                        is-primary
                    "
                >
                    ☎ কল করুন
                </a>
            `
            : "";

    return `

        <article
            class="tests-interface-card"
        >

            <div
                class="tests-interface-card-main"
            >

                <div
                    class="tests-interface-card-top"
                >

                    <div>

                        <h3
                            class="tests-interface-card-title"
                        >
                            ${escapeHTML(
        cleanText(
            test?.name_bn
        ) ||
        englishName ||
        "টেস্টের নাম পাওয়া যায়নি"
    )}
                        </h3>

                        ${englishName &&
            englishName !==
            cleanText(
                test?.name_bn
            )
            ? `
                                    <p
                                        class="
                                            tests-interface-card-subtitle
                                        "
                                    >
                                        ${escapeHTML(
                englishName
            )}
                                    </p>
                                `
            : ""
        }

                    </div>

                    <span
                        class="tests-interface-card-mark"
                        aria-hidden="true"
                    >
                        T
                    </span>

                </div>


                <div
                    class="tests-interface-badges"
                >

                    ${normalizedCategory
            ? `
                                <span
                                    class="
                                        tests-interface-badge
                                        is-category
                                    "
                                >
                                    ${escapeHTML(
                normalizedCategory
            )}
                                </span>
                            `
            : ""
        }

                    ${availableCount
            ? `
                                <span
                                    class="
                                        tests-interface-badge
                                        is-available
                                    "
                                >
                                    ✓ ${formatTestFeesNumber(
                availableCount
            )}টি কেন্দ্রে পাওয়া যাচ্ছে
                                </span>
                            `
            : `
                                <span
                                    class="
                                        tests-interface-badge
                                        is-unavailable
                                    "
                                >
                                    বর্তমানে availability নেই
                                </span>
                            `
        }

                </div>


                ${description
            ? `
                            <div
                                class="
                                    tests-interface-description
                                "
                            >
                                <p>
                                    ${escapeHTML(
                description
            )}
                                </p>
                            </div>
                        `
            : ""
        }


                <div
                    class="
                        tests-interface-hospital-count
                    "
                >
                    ${formatTestFeesNumber(
            hospitalCount
        )}টি হাসপাতালের তথ্য
                </div>


                <div
                    class="tests-interface-price-comparison"
                >

                    ${previewRows.length
            ? previewRows
                .map(
                    buildTestFeesPriceRow
                )
                .join("")
            : `
                                <div
                                    class="
                                        tests-interface-empty
                                    "
                                >
                                    <strong>
                                        হাসপাতালভিত্তিক ফি নেই
                                    </strong>

                                    <span>
                                        এই টেস্টের ফি এখনো যুক্ত হয়নি।
                                    </span>
                                </div>
                            `
        }

                </div>


                <div
                    class="tests-interface-actions"
                >

                    ${callAction}

                </div>


                ${latestUpdate
            ? `
                            <div
                                class="
                                    tests-interface-meta
                                "
                            >
                                <span>
                                    ↻
                                </span>

                                <span>
                                    সর্বশেষ আপডেট:
                                    ${escapeHTML(
                formatTestFeesDate(
                    latestUpdate
                )
            )}
                                </span>
                            </div>
                        `
            : ""
        }


                <details
                    class="tests-interface-details"
                >

                    <summary>
                        হাসপাতালভিত্তিক বিস্তারিত দেখুন
                    </summary>

                    <div
                        class="
                            tests-interface-details-body
                        "
                    >

                        ${detailsRows.length
            ? detailsRows
                .map(
                    buildTestFeesHospitalDetail
                )
                .join("")
            : `
                                    <p>
                                        এই টেস্টের সঙ্গে কোনো হাসপাতাল যুক্ত নেই।
                                    </p>
                                `
        }

                    </div>

                </details>

            </div>


            <aside
                class="tests-interface-price-panel"
            >

                <span
                    class="
                        tests-interface-price-label
                    "
                >
                    সর্বনিম্ন বর্তমান ফি
                </span>


                <div
                    class="
                        tests-interface-price
                    "
                >

                    <span
                        class="
                            tests-interface-price-prefix
                        "
                    >
                        ৳
                    </span>

                    <span>
                        ${Number.isFinite(
            lowestPrice
        )
            ? formatTestFeesNumber(
                lowestPrice
            )
            : "—"
        }
                    </span>

                </div>


                ${Number.isFinite(
            lowestPrice
        )
            ? `
                            <span
                                class="
                                    tests-interface-best-price
                                "
                            >
                                ✓ পাওয়া সর্বনিম্ন ফি
                            </span>
                        `
            : `
                            <span
                                class="
                                    tests-interface-price-note
                                "
                            >
                                এখনো মূল্য তথ্য যুক্ত হয়নি
                            </span>
                        `
        }

            </aside>

        </article>

    `;

}


/* =========================================================
   TEST & FEES — EMPTY / ERROR
   ========================================================= */

function renderTestFeesMessage(
    title,
    message
) {

    const {
        results
    } =
        getTestFeesElements();

    if (!results) {
        return;
    }

    results.innerHTML = `

        <div
            class="tests-interface-empty"
        >

            <strong>
                ${escapeHTML(
        title
    )}
            </strong>

            <span>
                ${escapeHTML(
        message
    )}
            </span>

        </div>

    `;

}


/* =========================================================
   TEST & FEES — RESULTS
   ========================================================= */

function renderTestFeesResults() {

    const {
        resultCount,
        results,
        locationButton
    } =
        getTestFeesElements();

    if (!results) {
        return;
    }

    applyTestFeesFilters();

    if (resultCount) {

        resultCount.textContent =
            `${formatTestFeesNumber(
                testFeesState
                    .filtered
                    .length
            )}টি`;

    }

    if (locationButton) {

        locationButton.setAttribute(
            "aria-pressed",
            testFeesState
                .locationOnly
                ? "true"
                : "false"
        );

        locationButton.textContent =
            testFeesState
                .locationOnly
                ? "✓ আমার এলাকা"
                : "⌖ আমার এলাকা";

    }

    if (
        !testFeesState
            .filtered
            .length
    ) {

        if (
            testFeesState
                .locationOnly &&
            !getTestFeesSavedLocation()
        ) {

            renderTestFeesMessage(
                "আগে আপনার এলাকা নির্বাচন করুন",
                "Home থেকে বিভাগ, জেলা ও উপজেলা নির্বাচন করে আবার চেষ্টা করুন।"
            );

        } else {

            renderTestFeesMessage(
                "কোনো টেস্ট পাওয়া যায়নি",
                "অন্য নাম, category বা হাসপাতালের নাম দিয়ে আবার চেষ্টা করুন।"
            );

        }

        return;

    }

    results.innerHTML = `

        <div
            class="tests-interface-list"
        >

            ${testFeesState
            .filtered
            .map(
                buildTestFeesCard
            )
            .join("")}

        </div>

    `;

}


/* =========================================================
   TEST & FEES — LOAD DATA
   ========================================================= */

async function loadTestFeesData() {

    if (
        testFeesState.loaded ||
        testFeesState.loading
    ) {

        renderTestFeesResults();

        return;

    }

    const {
        results
    } =
        getTestFeesElements();

    if (!results) {
        return;
    }

    if (!dorkariSupabase) {

        renderTestFeesMessage(
            "তথ্য লোড করা যাচ্ছে না",
            "Supabase সংযোগ পাওয়া যায়নি।"
        );

        return;

    }

    testFeesState.loading =
        true;

    renderTestFeesMessage(
        "টেস্ট ও ফি-এর তথ্য লোড হচ্ছে...",
        "একটু অপেক্ষা করুন।"
    );

    try {

        const [

            testsResult,

            hospitalTestsResult,

            hospitalsResult,

            divisionsResult,

            districtsResult,

            upazilasResult

        ] =
            await Promise.all([

                dorkariSupabase
                    .from("tests")
                    .select(`
                        id,
                        name,
                        name_bn,
                        category,
                        description,
                        is_active,
                        created_at
                    `)
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


                dorkariSupabase
                    .from("hospital_tests")
                    .select(`
                        id,
                        hospital_id,
                        test_id,
                        price,
                        discount_price,
                        notes,
                        is_available,
                        last_updated,
                        created_at
                    `)
                    .order(
                        "last_updated",
                        {
                            ascending: false
                        }
                    ),


                dorkariSupabase
                    .from("hospitals")
                    .select(`
                        id,
                        name,
                        name_bn,
                        division_id,
                        district_id,
                        upazila_id,
                        address,
                        phone,
                        is_verified,
                        is_active
                    `)
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


                dorkariSupabase
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


                dorkariSupabase
                    .from("districts")
                    .select(`
                        id,
                        name,
                        name_bn,
                        division_id
                    `)
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


                dorkariSupabase
                    .from("upazilas")
                    .select(`
                        id,
                        name,
                        name_bn,
                        district_id
                    `)
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


        if (
            testsResult.error
        ) {
            throw testsResult.error;
        }

        if (
            hospitalTestsResult.error
        ) {
            throw hospitalTestsResult.error;
        }

        if (
            hospitalsResult.error
        ) {
            throw hospitalsResult.error;
        }

        if (
            divisionsResult.error
        ) {
            throw divisionsResult.error;
        }

        if (
            districtsResult.error
        ) {
            throw districtsResult.error;
        }

        if (
            upazilasResult.error
        ) {
            throw upazilasResult.error;
        }


        testFeesState.tests =
            Array.isArray(
                testsResult.data
            )
                ? testsResult.data
                : [];


        testFeesState.hospitalTests =
            Array.isArray(
                hospitalTestsResult.data
            )
                ? hospitalTestsResult.data
                : [];


        testFeesState.hospitals =
            Array.isArray(
                hospitalsResult.data
            )
                ? hospitalsResult.data
                : [];


        testFeesState.divisions =
            Array.isArray(
                divisionsResult.data
            )
                ? divisionsResult.data
                : [];


        testFeesState.districts =
            Array.isArray(
                districtsResult.data
            )
                ? districtsResult.data
                : [];


        testFeesState.upazilas =
            Array.isArray(
                upazilasResult.data
            )
                ? upazilasResult.data
                : [];


        /*
         * Home location data আগে load হয়ে থাকলে
         * fallback হিসেবে ব্যবহার করা যাবে।
         */

        if (
            !testFeesState
                .divisions
                .length &&
            homeLocationState
                .divisions
                .length
        ) {

            testFeesState.divisions =
                homeLocationState
                    .divisions;

        }


        if (
            !testFeesState
                .districts
                .length &&
            homeLocationState
                .districts
                .length
        ) {

            testFeesState.districts =
                homeLocationState
                    .districts;

        }


        if (
            !testFeesState
                .upazilas
                .length &&
            homeLocationState
                .upazilas
                .length
        ) {

            testFeesState.upazilas =
                homeLocationState
                    .upazilas;

        }


        testFeesState.loaded =
            true;


        console.info(
            "Dorkari public Test & Fees loaded:",
            {
                tests:
                    testFeesState
                        .tests
                        .length,

                hospitalTests:
                    testFeesState
                        .hospitalTests
                        .length,

                hospitals:
                    testFeesState
                        .hospitals
                        .length
            }
        );


        renderTestFeesResults();

    } catch (error) {

        console.error(
            "Test & Fees data load failed:",
            error
        );

        renderTestFeesMessage(
            "টেস্ট ও ফি-এর তথ্য লোড হয়নি",
            "পরে আবার চেষ্টা করুন।"
        );

        showToast(
            "টেস্ট ও ফি-এর তথ্য লোড করা যায়নি"
        );

    } finally {

        testFeesState.loading =
            false;

    }

}


/* =========================================================
   TEST & FEES — CATEGORY BUTTON STATE
   ========================================================= */

function updateTestFeesCategoryButtons() {

    const {
        categoryButtons
    } =
        getTestFeesElements();

    categoryButtons
        .forEach(
            (button) => {

                const category =
                    normalizeTestCategory(
                        button.dataset
                            .testsCategory
                    );

                const active =
                    testFeesState
                        .selectedCategory ===
                    category;

                const isAll =
                    !testFeesState
                        .selectedCategory &&
                    !cleanText(
                        button.dataset
                            .testsCategory
                    );

                button.classList.toggle(
                    "is-active",
                    active || isAll
                );

                button.setAttribute(
                    "aria-pressed",
                    active || isAll
                        ? "true"
                        : "false"
                );

            }
        );

}


/* =========================================================
   TEST & FEES — INITIALIZE INTERFACE
   ========================================================= */

function initializeTestFeesInterface() {

    const {
        interface:
        testInterface,

        search,

        locationButton,

        categoryButtons,

        categoryClear

    } =
        getTestFeesElements();


    if (!testInterface) {
        return;
    }


    updateTestFeesCategoryButtons();


    /*
     * SEARCH
     */

    search?.addEventListener(
        "input",
        () => {

            testFeesState
                .locationOnly =
                false;

            if (locationButton) {

                locationButton
                    .textContent =
                    "⌖ আমার এলাকা";

                locationButton
                    .setAttribute(
                        "aria-pressed",
                        "false"
                    );

            }

            renderTestFeesResults();

        }
    );


    /*
     * CATEGORY
     */

    categoryButtons
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const rawCategory =
                            cleanText(
                                button.dataset
                                    .testsCategory
                            );

                        testFeesState
                            .selectedCategory =
                            rawCategory
                                ? normalizeTestCategory(
                                    rawCategory
                                )
                                : "";

                        updateTestFeesCategoryButtons();

                        renderTestFeesResults();

                    }
                );

            }
        );


    /*
     * CATEGORY CLEAR
     */

    categoryClear?.addEventListener(
        "click",
        () => {

            testFeesState
                .selectedCategory =
                "";

            updateTestFeesCategoryButtons();

            renderTestFeesResults();

        }
    );


    /*
     * MY AREA
     */

    locationButton?.addEventListener(
        "click",
        () => {

            const saved =
                getTestFeesSavedLocation();

            if (!saved) {

                testFeesState
                    .locationOnly =
                    false;

                locationButton
                    .setAttribute(
                        "aria-pressed",
                        "false"
                    );

                locationButton
                    .textContent =
                    "⌖ আমার এলাকা";

                showToast(
                    "আগে হোম পেজে আপনার এলাকা নির্বাচন করুন"
                );

                return;

            }


            testFeesState
                .locationOnly =
                !testFeesState
                    .locationOnly;


            renderTestFeesResults();

        }
    );


    /*
     * Home location data পরে এলে
     * result আবার render করি।
     */

    document.addEventListener(
        "dorkari:locations-loaded",
        () => {

            if (
                testFeesState.loaded
            ) {

                renderTestFeesResults();

            }

        }
    );


    /*
     * Interface খুললে data load করার
     * custom event handle করি।
     */

    window.addEventListener(
        "dorkari:tests-open",
        () => {

            loadTestFeesData();

        }
    );

}


/* =========================================================
   TEST & FEES — INITIAL HASH SUPPORT
   ========================================================= */

function initializeTestFeesInterfaceHashSupport() {

    const initialHash =
        cleanText(
            window.location.hash
        )
            .replace(
                /^#/,
                ""
            )
            .toLowerCase();

    if (
        initialHash ===
        "tests"
    ) {

        window.setTimeout(
            () => {

                loadTestFeesData();

            },
            0
        );

    }

}
 
