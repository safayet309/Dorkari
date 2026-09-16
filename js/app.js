// =====================================
// Dorkari - Main JavaScript
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

    clearTimeout(
        window.dorkariToastTimer
    );

    window.dorkariToastTimer =
        setTimeout(
            () => {
                toast.classList.remove("show");
            },
            2200
        );
}


// =====================================
// Copy Emergency Number
// =====================================

document.addEventListener(
    "click",
    async (event) => {

        const copyButton =
            event.target.closest(
                "[data-copy]"
            );

        if (!copyButton) return;

        const value =
            copyButton.dataset.copy;

        if (!value) return;

        try {

            await navigator.clipboard.writeText(
                value
            );

            showToast(
                "✓ নম্বরটি কপি হয়েছে"
            );

        } catch (error) {

            console.error(
                "Copy failed:",
                error
            );

            showToast(
                "নম্বর কপি করা যায়নি"
            );
        }
    }
);


// =====================================
// Helpers
// =====================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getDisplayName(record) {

    return (
        record.name_bn ||
        record.name ||
        "নাম পাওয়া যায়নি"
    );
}


function getPhone(record) {

    return (
        record.phone ||
        record.emergency_phone ||
        ""
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
                <div class="emergency-item-content">
                    <p>
                        Supabase সংযোগ পাওয়া যায়নি।
                    </p>
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <div class="emergency-item">
            <div class="emergency-item-content">
                <p>
                    জরুরি তথ্য লোড হচ্ছে...
                </p>
            </div>
        </div>
    `;


    try {

        const {
            data,
            error
        } =
            await dorkariSupabase
                .from("emergency_contacts")
                .select(`
                    id,
                    name,
                    name_bn,
                    phone,
                    description,
                    is_verified,
                    is_active
                `)
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
            data || [];


        if (!records.length) {

            container.innerHTML = `
                <div class="emergency-item">
                    <div class="emergency-item-content">
                        <p>
                            বর্তমানে কোনো জরুরি তথ্য পাওয়া যায়নি।
                        </p>
                    </div>
                </div>
            `;

            return;
        }


        container.innerHTML =
            records
                .map(
                    (record) => {

                        const name =
                            getDisplayName(
                                record
                            );

                        const phone =
                            getPhone(
                                record
                            );

                        const description =
                            record.description ||
                            "জরুরি যোগাযোগের তথ্য";


                        return `
                            <article
                                class="emergency-item"
                            >

                                <div
                                    class="emergency-item-icon"
                                >
                                    🚨
                                </div>

                                <div
                                    class="emergency-item-content"
                                >

                                    <h3>
                                        ${escapeHTML(
                                            name
                                        )}
                                    </h3>

                                    <p>
                                        ${escapeHTML(
                                            description
                                        )}
                                    </p>

                                    ${
                                        phone
                                            ? `
                                                <strong
                                                    class="emergency-number"
                                                >
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
                                            <div
                                                class="emergency-actions"
                                            >

                                                <a
                                                    href="tel:${escapeHTML(
                                                        phone
                                                    )}"
                                                    class="call-btn"
                                                >
                                                    📞 কল
                                                </a>

                                                <button
                                                    type="button"
                                                    class="copy-btn"
                                                    data-copy="${escapeHTML(
                                                        phone
                                                    )}"
                                                >
                                                    ⧉ কপি
                                                </button>

                                            </div>
                                        `
                                        : ""
                                }

                            </article>
                        `;
                    }
                )
                .join("");


    } catch (error) {

        console.error(
            "Emergency preview load failed:",
            error
        );


        container.innerHTML = `
            <div class="emergency-item">
                <div class="emergency-item-content">
                    <p>
                        জরুরি তথ্য লোড করা সম্ভব হয়নি।
                    </p>
                </div>
            </div>
        `;
    }
}


// =====================================
// Global Search
// =====================================

const searchInput =
    document.getElementById(
        "globalSearch"
    );


const searchButton =
    document.getElementById(
        "searchButton"
    );


function handleSearch() {

    const query =
        searchInput?.value.trim();


    if (!query) {

        showToast(
            "আপনি কী খুঁজছেন লিখুন"
        );

        searchInput?.focus();

        return;
    }


    /*
     * Public search page will be connected
     * in the next integration phase.
     */

    console.log(
        "Dorkari search:",
        query
    );


    showToast(
        `"${query}" খোঁজা হচ্ছে...`
    );
}


searchButton?.addEventListener(
    "click",
    handleSearch
);


searchInput?.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            handleSearch();

        }

    }
);


// =====================================
// INIT
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadEmergencyPreview();

    }
);
