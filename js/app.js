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

    return cleanText(phone)
        .replace(/[^\d+]/g, "");
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

    $("#bottomSearchNav")
        ?.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                focusSearch();
            }
        );
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
    service
) {

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
                    initialHash
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
        initializeDoctorInterface();

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
