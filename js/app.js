// =====================================
// Dorkari - Public Home JavaScript
// =====================================

"use strict";


// =====================================
// Supabase
// =====================================

const dorkariSupabase =
    window.supabase?.createClient(
        DORKARI_CONFIG.SUPABASE.URL,
        DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
    );


// =====================================
// Toast
// =====================================

const toast =
    document.getElementById("toast");


function showToast(message) {

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.dorkariToastTimer);

    window.dorkariToastTimer =
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2400);
}


// =====================================
// Safe Helpers
// =====================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function cleanText(value) {
    return String(value ?? "").trim();
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


// =====================================
// Copy Number
// =====================================

document.addEventListener("click", async (event) => {

    const copyButton =
        event.target.closest("[data-copy]");

    if (!copyButton) return;

    const value =
        cleanText(copyButton.dataset.copy);

    if (!value) return;

    try {

        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
        ) {

            await navigator.clipboard.writeText(value);

        } else {

            const textarea =
                document.createElement("textarea");

            textarea.value = value;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.select();

            document.execCommand("copy");

            textarea.remove();
        }

        showToast("✓ নম্বরটি কপি হয়েছে");

    } catch (error) {

        console.error("Copy failed:", error);

        showToast("নম্বর কপি করা যায়নি");
    }
});


// =====================================
// Mobile Menu
// =====================================

function initializeMobileMenu() {

    const button =
        document.getElementById("mobileMenuButton");

    const menu =
        document.getElementById("mobileMenu");

    if (!button || !menu) return;

    button.addEventListener("click", () => {

        const isOpen =
            button.getAttribute("aria-expanded") === "true";

        button.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );

        menu.hidden = isOpen;

        document.body.classList.toggle(
            "menu-open",
            !isOpen
        );
    });


    menu.addEventListener("click", (event) => {

        const link =
            event.target.closest("a[href^='#']");

        if (!link) return;

        menu.hidden = true;

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove(
            "menu-open"
        );
    });


    window.addEventListener("resize", () => {

        if (window.innerWidth > 900) {

            menu.hidden = true;

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            document.body.classList.remove(
                "menu-open"
            );
        }
    });
}


// =====================================
// Global Search
// =====================================

const searchInput =
    document.getElementById("globalSearch");

const searchButton =
    document.getElementById("searchButton");


function handleSearch(queryOverride = null) {

    const query =
        cleanText(
            queryOverride ?? searchInput?.value
        );

    if (!query) {

        showToast("আপনি কী খুঁজছেন লিখুন");

        searchInput?.focus();

        return;
    }


    /*
     * Public Search page এখনো আলাদা phase-এ তৈরি হবে।
     * আপাতত Home Page search interaction stable রাখা হচ্ছে।
     */

    if (
        searchInput &&
        queryOverride
    ) {

        searchInput.value = query;
    }


    console.log(
        "Dorkari search:",
        query
    );


    showToast(
        `“${query}” খোঁজা হচ্ছে...`
    );
}


searchButton?.addEventListener(
    "click",
    () => {
        handleSearch();
    }
);


searchInput?.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            handleSearch();
        }
    }
);


// =====================================
// Search Suggestion Chips
// =====================================

document
    .querySelectorAll("[data-search]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                handleSearch(
                    button.dataset.search
                );
            }
        );
    });


// =====================================
// Bottom Navigation Search
// =====================================

document
    .getElementById("bottomSearchNav")
    ?.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            searchInput?.focus();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );


// =====================================
// Service Cards
// =====================================

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


document.addEventListener(
    "click",
    (event) => {

        const serviceButton =
            event.target.closest(
                "[data-service]"
            );

        if (!serviceButton) return;

        const service =
            serviceButton.dataset.service;

        const label =
            serviceLabels[service] ||
            "সেবা";

        showToast(
            `${label} — বিস্তারিত পেজ পরবর্তী ধাপে যুক্ত হবে`
        );
    }
);


// =====================================
// Location State
// =====================================

const homeLocationState = {

    divisions: [],

    districts: [],

    upazilas: []
};


// =====================================
// Fill Location Select
// =====================================

function fillLocationSelect(
    select,
    items,
    placeholder
) {

    if (!select) return;

    select.innerHTML = "";

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
        placeholder;

    select.appendChild(
        defaultOption
    );


    items.forEach((item) => {

        const option =
            document.createElement("option");

        option.value = item.id;

        option.textContent =
            cleanText(item.name_bn) ||
            cleanText(item.name);

        select.appendChild(
            option
        );
    });
}


// =====================================
// Reset Location Select
// =====================================

function resetLocationSelect(
    select,
    placeholder
) {

    if (!select) return;

    select.innerHTML =
        `<option value="">${escapeHTML(
            placeholder
        )}</option>`;

    select.disabled = true;
}


// =====================================
// Update Districts
// =====================================

function updateHomeDistricts(
    divisionId
) {

    const districtSelect =
        document.getElementById(
            "homeDistrict"
        );

    const upazilaSelect =
        document.getElementById(
            "homeUpazila"
        );

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

        return;
    }


    const districts =
        homeLocationState.districts.filter(
            (district) =>
                String(
                    district.division_id
                ) === String(
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


    resetLocationSelect(
        upazilaSelect,
        "উপজেলা নির্বাচন করুন"
    );
}


// =====================================
// Update Upazilas
// =====================================

function updateHomeUpazilas(
    districtId
) {

    const upazilaSelect =
        document.getElementById(
            "homeUpazila"
        );

    if (!upazilaSelect) return;


    if (!districtId) {

        resetLocationSelect(
            upazilaSelect,
            "উপজেলা নির্বাচন করুন"
        );

        return;
    }


    const upazilas =
        homeLocationState.upazilas.filter(
            (upazila) =>
                String(
                    upazila.district_id
                ) === String(
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
}


// =====================================
// Load Home Locations
// =====================================

async function loadHomeLocations() {

    const divisionSelect =
        document.getElementById(
            "homeDivision"
        );

    const districtSelect =
        document.getElementById(
            "homeDistrict"
        );

    const upazilaSelect =
        document.getElementById(
            "homeUpazila"
        );


    if (
        !divisionSelect ||
        !districtSelect ||
        !upazilaSelect
    ) {
        return;
    }


    if (!dorkariSupabase) {

        console.error(
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
            divisionSelect,
            homeLocationState.divisions,
            "বিভাগ নির্বাচন করুন"
        );


        resetLocationSelect(
            districtSelect,
            "জেলা নির্বাচন করুন"
        );


        resetLocationSelect(
            upazilaSelect,
            "উপজেলা নির্বাচন করুন"
        );


        console.log(
            "Home locations loaded:",
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

        showToast(
            "লোকেশন তথ্য লোড করা যায়নি"
        );
    }
}


// =====================================
// Location Events
// =====================================

function initializeHomeLocationEvents() {

    const divisionSelect =
        document.getElementById(
            "homeDivision"
        );

    const districtSelect =
        document.getElementById(
            "homeDistrict"
        );

    const upazilaSelect =
        document.getElementById(
            "homeUpazila"
        );

    const locationSearchButton =
        document.getElementById(
            "locationSearchButton"
        );


    divisionSelect?.addEventListener(
        "change",
        () => {

            updateHomeDistricts(
                divisionSelect.value
            );
        }
    );


    districtSelect?.addEventListener(
        "change",
        () => {

            updateHomeUpazilas(
                districtSelect.value
            );
        }
    );


    locationSearchButton?.addEventListener(
        "click",
        () => {

            const selectedDivision =
                divisionSelect
                    ?.selectedOptions
                    ?.item(0);

            const selectedDistrict =
                districtSelect
                    ?.selectedOptions
                    ?.item(0);

            const selectedUpazila =
                upazilaSelect
                    ?.selectedOptions
                    ?.item(0);


            const division =
                cleanText(
                    selectedDivision?.textContent
                );

            const district =
                cleanText(
                    selectedDistrict?.textContent
                );

            const upazila =
                cleanText(
                    selectedUpazila?.textContent
                );


            if (
                !divisionSelect?.value
            ) {

                showToast(
                    "প্রথমে বিভাগ নির্বাচন করুন"
                );

                divisionSelect?.focus();

                return;
            }


            const parts =
                [
                    division,
                    district,
                    upazila
                ].filter(Boolean);


            showToast(
                `${parts.join(
                    " → "
                )} — লোকেশন ফলাফল পরবর্তী ধাপে যুক্ত হবে`
            );
        }
    );
}


// =====================================
// Public Emergency Preview
// =====================================

async function loadEmergencyPreview() {

    const container =
        document.getElementById(
            "emergencyPreviewList"
        );


    if (!container) return;


    if (!dorkariSupabase) {

        container.innerHTML = `
            <div class="emergency-item">

                <div class="emergency-item-icon">
                    ⚠️
                </div>

                <div class="emergency-item-content">

                    <h3>
                        সংযোগ পাওয়া যায়নি
                    </h3>

                    <p>
                        Supabase সংযোগ পাওয়া যায়নি।
                    </p>

                </div>

            </div>
        `;

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
                    is_active
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

            container.innerHTML = `
                <div class="emergency-item">

                    <div class="emergency-item-icon">
                        🚨
                    </div>

                    <div class="emergency-item-content">

                        <h3>
                            কোনো জরুরি তথ্য পাওয়া যায়নি
                        </h3>

                        <p>
                            বর্তমানে সক্রিয় কোনো জরুরি যোগাযোগ নেই।
                        </p>

                    </div>

                </div>
            `;

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


                    return `
                        <article class="emergency-item">

                            <div class="emergency-item-icon">
                                🚨
                            </div>


                            <div class="emergency-item-content">

                                <div class="emergency-title-row">

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


                                ${
                                    phone
                                        ? `
                                            <strong class="emergency-number">
                                                ${escapeHTML(
                                                    phone
                                                )}
                                            </strong>
                                          `
                                        : ""
                                }

                            </div>


                            ${
                                phone
                                    ? `
                                        <div class="emergency-actions">

                                            <a
                                                href="tel:${escapeHTML(
                                                    phone
                                                )}"
                                                class="call-btn"
                                                aria-label="কল করুন"
                                            >
                                                📞 কল
                                            </a>


                                            <button
                                                type="button"
                                                class="copy-btn"
                                                data-copy="${escapeHTML(
                                                    phone
                                                )}"
                                                aria-label="নম্বর কপি করুন"
                                            >
                                                ⧉ কপি
                                            </button>

                                        </div>
                                      `
                                    : ""
                            }

                        </article>
                    `;
                })
                .join("");

    } catch (error) {

        console.error(
            "Emergency preview load failed:",
            error
        );


        container.innerHTML = `
            <div class="emergency-item">

                <div class="emergency-item-icon">
                    ⚠️
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
}


// =====================================
// Smooth Section Navigation
// =====================================

document.addEventListener(
    "click",
    (event) => {

        const link =
            event.target.closest(
                'a[href^="#"]'
            );

        if (!link) return;

        const targetId =
            link.getAttribute("href");


        if (
            !targetId ||
            targetId === "#"
        ) {
            return;
        }


        const target =
            document.querySelector(
                targetId
            );


        if (!target) return;


        event.preventDefault();


        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


        const mobileMenu =
            document.getElementById(
                "mobileMenu"
            );

        const mobileMenuButton =
            document.getElementById(
                "mobileMenuButton"
            );


        if (mobileMenu) {

            mobileMenu.hidden = true;
        }


        if (mobileMenuButton) {

            mobileMenuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }


        document.body.classList.remove(
            "menu-open"
        );
    }
);


// =====================================
// Bottom Navigation Active State
// =====================================

function initializeBottomNavigation() {

    const navItems =
        document.querySelectorAll(
            "[data-bottom-nav]"
        );


    if (!navItems.length) return;


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                navItems.forEach(
                    (navItem) => {
                        navItem.classList.remove(
                            "active"
                        );
                    }
                );


                item.classList.add(
                    "active"
                );
            }
        );
    });
}


// =====================================
// Emergency 999 Quick Actions
// =====================================

function initializeEmergencyQuickActions() {

    const quickCall =
        document.getElementById(
            "quickEmergencyCall"
        );


    const quickCopy =
        document.getElementById(
            "quickEmergencyCopy"
        );


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

            try {

                if (
                    navigator.clipboard &&
                    typeof navigator.clipboard.writeText ===
                        "function"
                ) {

                    await navigator.clipboard.writeText(
                        "999"
                    );

                } else {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );

                    textarea.value =
                        "999";

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
                    "✓ 999 নম্বর কপি হয়েছে"
                );

            } catch (error) {

                console.error(
                    "999 copy failed:",
                    error
                );

                showToast(
                    "999 নম্বর কপি করা যায়নি"
                );
            }
        }
    );
}


// =====================================
// Header Scroll State
// =====================================

function initializeHeaderScroll() {

    const header =
        document.querySelector(
            ".site-header"
        );


    if (!header) return;


    const updateHeader =
        () => {

            header.classList.toggle(
                "is-scrolled",
                window.scrollY > 12
            );
        };


    updateHeader();


    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true
        }
    );
}


// =====================================
// Home Initializer
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeMobileMenu();

        initializeHomeLocationEvents();

        initializeBottomNavigation();

        initializeEmergencyQuickActions();

        initializeHeaderScroll();

        loadHomeLocations();

        loadEmergencyPreview();
    }
);
