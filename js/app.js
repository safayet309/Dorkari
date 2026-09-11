// =====================================
// Dorkari - Main JavaScript
// =====================================


// =====================================
// Toast
// =====================================

const toast = document.getElementById("toast");


function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(window.dorkariToastTimer);

    window.dorkariToastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}


// =====================================
// Copy Emergency Number
// =====================================

document.addEventListener("click", async (event) => {

    const copyButton =
        event.target.closest("[data-copy]");

    if (!copyButton) return;


    const value =
        copyButton.dataset.copy;

    if (!value) return;


    try {

        await navigator.clipboard.writeText(value);

        showToast("✓ নম্বরটি কপি হয়েছে");

    } catch (error) {

        showToast("নম্বর কপি করা যায়নি");

        console.error(
            "Copy failed:",
            error
        );

    }

});


// =====================================
// Global Search
// =====================================

const searchInput =
    document.getElementById("globalSearch");

const searchButton =
    document.getElementById("searchButton");


function handleSearch() {

    const query =
        searchInput?.value.trim();

    if (!query) {

        showToast("আপনি কী খুঁজছেন লিখুন");

        searchInput?.focus();

        return;
    }


    // Search system will be connected
    // with Supabase in a later step.

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

        if (event.key === "Enter") {

            handleSearch();

        }

    }
);
