/* =========================================================
   DORKARI — ADMIN CRUD FOUNDATION
   File: js/admin-crud.js

   Purpose:
   - Shared Supabase CRUD helpers
   - Permission checking
   - Validation helpers
   - Safe HTML escaping
   - Delete confirmation
   - Toast integration
   - Loading helpers

   IMPORTANT:
   This file does NOT modify dashboard UI directly.
   Individual modules will use these helpers.
   ========================================================= */


/* =========================================================
   CONFIGURATION CHECK
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       INTERNAL HELPERS
       ===================================================== */

    function getAdmin() {

        if (
            !window.DorkariAdmin
        ) {

            throw new Error(
                "DorkariAdmin is not initialized."
            );

        }

        return window.DorkariAdmin;

    }


    function getSupabase() {

        const admin =
            getAdmin();

        const client =
            admin.getSupabase();

        if (!client) {

            throw new Error(
                "Supabase client is unavailable."
            );

        }

        return client;

    }


    /* =====================================================
       ROLE / PERMISSION
       ===================================================== */

    function getRole() {

        try {

            return getAdmin()
                .getRole();

        } catch (error) {

            console.error(
                "CRUD Role Error:",
                error
            );

            return null;

        }

    }


    function canManageContent() {

        try {

            return getAdmin()
                .canManageContent();

        } catch (error) {

            console.error(
                "CRUD Permission Error:",
                error
            );

            return false;

        }

    }


    function requireContentPermission() {

        if (
            !canManageContent()
        ) {

            throw new Error(
                "আপনার এই তথ্য পরিবর্তন করার অনুমতি নেই।"
            );

        }

        return true;

    }


    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    function escapeHTML(value) {

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


    /* =====================================================
       TEXT HELPERS
       ===================================================== */

    function cleanText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .trim();

    }


    function isEmpty(value) {

        return cleanText(value)
            .length === 0;

    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function required(
        value,
        fieldName
    ) {

        if (
            isEmpty(value)
        ) {

            throw new Error(
                `${fieldName} আবশ্যক।`
            );

        }

        return true;

    }


    function validateRequiredFields(
        data,
        fields
    ) {

        if (
            !data ||
            typeof data !== "object"
        ) {

            throw new Error(
                "Invalid data."
            );

        }


        if (
            !Array.isArray(fields)
        ) {

            return true;

        }


        fields.forEach(
            function (field) {

                const label =
                    field.label ||
                    field.name ||
                    field;


                const name =
                    field.name ||
                    field;


                required(
                    data[name],
                    label
                );

            }
        );


        return true;

    }


    /* =====================================================
       SELECT ACTIVE RECORDS
       ===================================================== */

    async function getActive(
        table,
        options
    ) {

        const client =
            getSupabase();


        let query =
            client
                .from(table)
                .select(
                    options &&
                    options.select
                        ? options.select
                        : "*"
                );


        query =
            query.eq(
                "is_active",
                true
            );


        if (
            options &&
            options.order
        ) {

            query =
                query.order(
                    options.order.column,
                    {
                        ascending:
                            options.order.ascending !== false
                    }
                );

        }


        if (
            options &&
            options.limit
        ) {

            query =
                query.limit(
                    options.limit
                );

        }


        const {
            data,
            error
        } =
            await query;


        if (error) {

            throw error;

        }


        return data || [];

    }


    /* =====================================================
       GET SINGLE RECORD
       ===================================================== */

    async function getById(
        table,
        id,
        select
    ) {

        if (
            !id
        ) {

            throw new Error(
                "Record ID পাওয়া যায়নি।"
            );

        }


        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(table)
                .select(
                    select || "*"
                )
                .eq(
                    "id",
                    id
                )
                .maybeSingle();


        if (error) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       INSERT
       ===================================================== */

    async function insert(
        table,
        payload
    ) {

        requireContentPermission();


        if (
            !payload ||
            typeof payload !== "object"
        ) {

            throw new Error(
                "Invalid insert data."
            );

        }


        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(table)
                .insert(payload)
                .select()
                .single();


        if (error) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       UPDATE
       ===================================================== */

    async function update(
        table,
        id,
        payload
    ) {

        requireContentPermission();


        if (
            !id
        ) {

            throw new Error(
                "Update করার জন্য Record ID প্রয়োজন।"
            );

        }


        if (
            !payload ||
            typeof payload !== "object"
        ) {

            throw new Error(
                "Invalid update data."
            );

        }


        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(table)
                .update(payload)
                .eq(
                    "id",
                    id
                )
                .select()
                .single();


        if (error) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       SOFT DELETE
       ===================================================== */

    async function deactivate(
        table,
        id
    ) {

        requireContentPermission();


        if (
            !id
        ) {

            throw new Error(
                "Delete করার জন্য Record ID প্রয়োজন।"
            );

        }


        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(table)
                .update({
                    is_active: false
                })
                .eq(
                    "id",
                    id
                )
                .select()
                .single();


        if (error) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       RESTORE
       ===================================================== */

    async function activate(
        table,
        id
    ) {

        requireContentPermission();


        if (
            !id
        ) {

            throw new Error(
                "Restore করার জন্য Record ID প্রয়োজন।"
            );

        }


        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(table)
                .update({
                    is_active: true
                })
                .eq(
                    "id",
                    id
                )
                .select()
                .single();


        if (error) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       HARD DELETE
       ===================================================== */

    async function remove(
        table,
        id
    ) {

        requireContentPermission();


        if (
            !id
        ) {

            throw new Error(
                "Delete করার জন্য Record ID প্রয়োজন।"
            );

        }


        const client =
            getSupabase();


        const {
            error
        } =
            await client
                .from(table)
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;

        }


        return true;

    }


    /* =====================================================
       DELETE CONFIRMATION
       ===================================================== */

    function confirmDelete(
        itemName
    ) {

        const name =
            cleanText(itemName) ||
            "এই তথ্য";


        return window.confirm(
            `${name} মুছে ফেলতে চান?\n\nএই কাজটি করার আগে নিশ্চিত হয়ে নিন।`
        );

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        try {

            const admin =
                getAdmin();


            if (
                typeof admin.showToast ===
                "function"
            ) {

                admin.showToast(
                    message
                );

                return;

            }

        } catch (error) {

            console.warn(
                "Admin toast unavailable:",
                error
            );

        }


        console.log(
            message
        );

    }


    /* =====================================================
       ERROR MESSAGE
       ===================================================== */

    function getErrorMessage(
        error
    ) {

        if (!error) {

            return "অজানা সমস্যা হয়েছে।";

        }


        if (
            error.message
        ) {

            return error.message;

        }


        if (
            error.error_description
        ) {

            return error.error_description;

        }


        return "তথ্য প্রক্রিয়া করা যায়নি।";

    }


    /* =====================================================
       LOADING HELPER
       ===================================================== */

    function setLoading(
        element,
        loading,
        loadingText
    ) {

        if (
            !element
        ) {

            return;

        }


        if (
            loading
        ) {

            element.dataset
                .crudOriginalText =
                element.textContent;


            element.disabled = true;

            element.classList
                .add(
                    "crud-loading"
                );


            if (
                loadingText
            ) {

                element.textContent =
                    loadingText;

            }

        } else {

            element.disabled = false;

            element.classList
                .remove(
                    "crud-loading"
                );


            if (
                element.dataset
                    .crudOriginalText
            ) {

                element.textContent =
                    element.dataset
                        .crudOriginalText;

                delete element.dataset
                    .crudOriginalText;

            }

        }

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.DorkariCRUD = {

        /* Permission */
        getRole:
            getRole,

        canManageContent:
            canManageContent,

        requireContentPermission:
            requireContentPermission,


        /* Text */
        escapeHTML:
            escapeHTML,

        cleanText:
            cleanText,

        isEmpty:
            isEmpty,


        /* Validation */
        required:
            required,

        validateRequiredFields:
            validateRequiredFields,


        /* Read */
        getActive:
            getActive,

        getById:
            getById,


        /* Write */
        insert:
            insert,

        update:
            update,

        deactivate:
            deactivate,

        activate:
            activate,

        remove:
            remove,


        /* UI */
        confirmDelete:
            confirmDelete,

        showToast:
            showToast,

        getErrorMessage:
            getErrorMessage,

        setLoading:
            setLoading

    };


    /* =====================================================
       READY LOG
       ===================================================== */

    console.log(
        "Dorkari CRUD Foundation: Ready"
    );

})();
