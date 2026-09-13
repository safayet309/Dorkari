(function () {
    "use strict";

    /* =====================================================
       SUPABASE
       ===================================================== */

    const sb =
        window.supabase.createClient(
            DORKARI_CONFIG.SUPABASE.URL,
            DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY
        );


    /* =====================================================
       TABLES
       ===================================================== */

    const T = {
        contacts: "emergency_contacts",
        ambulances: "ambulances",
        police: "police_stations",
        blood: "blood_banks"
    };


    /* =====================================================
       STATE
       ===================================================== */

    const S = {
        entity: "contacts",

        records: [],
        filtered: [],

        divisions: [],
        districts: [],
        upazilas: [],
        categories: [],

        dm: {},
        zm: {},
        um: {},
        cm: {},

        page: 1,
        edit: null,

        canManage: false
    };


    /* =====================================================
       MODULE META
       ===================================================== */

    const M = {
        contacts: [
            "Emergency Contacts",
            "জাতীয় ও স্থানীয় জরুরি যোগাযোগের তথ্য।",
            "নাম, ফোন, বিবরণ দিয়ে খুঁজুন"
        ],

        ambulances: [
            "Ambulances",
            "অ্যাম্বুলেন্স ও পরিবেশকের তথ্য।",
            "নাম, ফোন, ঠিকানা দিয়ে খুঁজুন"
        ],

        police: [
            "Police Stations",
            "থানা ও জরুরি যোগাযোগের তথ্য।",
            "নাম, ফোন, অফিসারের নাম দিয়ে খুঁজুন"
        ],

        blood: [
            "Blood Banks",
            "রক্ত ব্যাংক ও রক্তের গ্রুপের তথ্য।",
            "নাম, ফোন, ঠিকানা দিয়ে খুঁজুন"
        ]
    };


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ =
        function (id) {
            return document.getElementById(id);
        };


    const esc =
        function (value) {
            return String(
                value ?? ""
            )
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };


    const map =
        function (array) {
            return array.reduce(
                function (result, item) {
                    result[item.id] = item;
                    return result;
                },
                {}
            );
        };


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    async function init() {

        bind();

        try {

            await auth();

            [
                S.divisions,
                S.districts,
                S.upazilas,
                S.categories
            ] =
                await Promise.all([
                    load(
                        "divisions",
                        "id,name,name_bn,is_active",
                        "name_bn"
                    ),

                    load(
                        "districts",
                        "id,name,name_bn,division_id,is_active",
                        "name_bn"
                    ),

                    load(
                        "upazilas",
                        "id,name,name_bn,district_id,is_active",
                        "name_bn"
                    ),

                    load(
                        "categories",
                        "id,name,name_bn,slug,is_active,sort_order",
                        "sort_order"
                    )
                ]);


            S.dm = map(S.divisions);
            S.zm = map(S.districts);
            S.um = map(S.upazilas);
            S.cm = map(S.categories);


            shell();

            await records();

        } catch (e) {

            err(
                e.message ||
                "Emergency Management লোড করা যায়নি।"
            );
        }
    }


    /* =====================================================
       EVENT BINDING
       ===================================================== */

    function bind() {

        document
            .querySelectorAll(".emergency-tab")
            .forEach(
                function (button) {

                    button.onclick =
                        async function () {

                            S.entity =
                                button.dataset.entity;

                            S.page = 1;

                            document
                                .querySelectorAll(
                                    ".emergency-tab"
                                )
                                .forEach(
                                    function (item) {
                                        item.classList.toggle(
                                            "is-active",
                                            item === button
                                        );
                                    }
                                );

                            shell();

                            await records();
                        };
                }
            );


        $("searchInput").oninput =
            debounce(
                function () {
                    S.page = 1;
                    filter();
                },
                180
            );


        $("divisionFilter").onchange =
            function () {

                S.page = 1;

                districts();

                filter();
            };


        $("districtFilter").onchange =
            function () {

                S.page = 1;

                filter();
            };


        $("statusFilter").onchange =
            function () {

                S.page = 1;

                filter();
            };


        $("refreshButton").onclick =
            records;


        $("addButton").onclick =
            function () {
                form();
            };


        $("recordForm").onsubmit =
            save;


        $("closeModalButton").onclick =
            close;


        $("cancelButton").onclick =
            close;


        $("modal").onclick =
            function (event) {

                if (
                    event.target.dataset.closeModal !==
                    undefined
                ) {
                    close();
                }
            };


        $("logoutButton").onclick =
            async function () {

                await sb.auth.signOut();

                location.href =
                    "./index.html";
            };


        $("tableBody").onclick =
            action;
    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function auth() {

        const {
            data,
            error
        } =
            await sb.auth.getSession();


        if (error) {
            throw error;
        }


        if (!data.session) {

            location.href =
                "./index.html";

            throw Error(
                "Authentication required"
            );
        }


        const result =
            await sb
                .from("admin_profiles")
                .select(
                    "id,user_id,name,role,is_active"
                )
                .eq(
                    "user_id",
                    data.session.user.id
                )
                .eq(
                    "is_active",
                    true
                )
                .maybeSingle();


        if (result.error) {
            throw result.error;
        }


        if (!result.data) {

            await sb.auth.signOut();

            location.href =
                "./index.html";

            throw Error(
                "এই account-এর Admin access নেই।"
            );
        }


        S.canManage =
            [
                "super_admin",
                "admin"
            ].includes(
                result.data.role
            );


        if (!S.canManage) {

            $("permissionNotice").textContent =
                "আপনার role view-only। Add, Edit ও Status পরিবর্তনের permission নেই।";

            $("permissionNotice").hidden =
                false;

            $("addButton").disabled =
                true;
        }
    }


    /* =====================================================
       LOAD REFERENCE DATA
       ===================================================== */

    async function load(
        table,
        columns,
        orderColumn
    ) {

        const result =
            await sb
                .from(table)
                .select(columns)
                .order(
                    orderColumn,
                    {
                        ascending: true
                    }
                );


        if (result.error) {
            throw result.error;
        }


        return result.data || [];
    }


    /* =====================================================
       SHELL
       ===================================================== */

    function shell() {

        const meta =
            M[S.entity];


        $("sectionTitle").textContent =
            meta[0];


        $("sectionDescription").textContent =
            meta[1];


        $("searchInput").placeholder =
            meta[2];


        head();


        $("divisionFilter").innerHTML =
            '<option value="">সব বিভাগ</option>' +

            S.divisions
                .filter(
                    function (item) {
                        return item.is_active;
                    }
                )
                .map(
                    function (item) {

                        return `
                            <option value="${esc(item.id)}">
                                ${esc(
                            item.name_bn ||
                            item.name
                        )}
                            </option>
                        `;
                    }
                )
                .join("");


        districts();
    }


    /* =====================================================
       DISTRICT FILTER
       ===================================================== */

    function districts() {

        const divisionId =
            $("divisionFilter").value;


        const available =
            S.districts.filter(
                function (item) {

                    return (
                        item.is_active &&
                        (
                            !divisionId ||
                            item.division_id ===
                            divisionId
                        )
                    );
                }
            );


        const district =
            $("districtFilter");


        const oldValue =
            district.value;


        district.innerHTML =
            '<option value="">সব জেলা</option>' +

            available
                .map(
                    function (item) {

                        return `
                            <option value="${esc(item.id)}">
                                ${esc(
                            item.name_bn ||
                            item.name
                        )}
                            </option>
                        `;
                    }
                )
                .join("");


        district.disabled =
            !available.length;


        if (
            available.some(
                function (item) {
                    return item.id === oldValue;
                }
            )
        ) {
            district.value =
                oldValue;
        }
    }


    /* =====================================================
       TABLE HEADER
       ===================================================== */

    function head() {

        const headers = {

            contacts: [
                "Name",
                "Phone",
                "Category",
                "Location",
                "Verified",
                "Status",
                "Updated",
                "Actions"
            ],

            ambulances: [
                "Name",
                "Provider",
                "Phone",
                "Location",
                "24 Hours",
                "Verified",
                "Status",
                "Actions"
            ],

            police: [
                "Name",
                "Emergency Phone",
                "District",
                "Upazila",
                "Officer",
                "Verified",
                "Status",
                "Actions"
            ],

            blood: [
                "Name",
                "Phone",
                "Location",
                "Blood Groups",
                "Verified",
                "Status",
                "Updated",
                "Actions"
            ]

        }[S.entity];


        $("tableHead").innerHTML =
            "<tr>" +

            headers
                .map(
                    function (item) {
                        return `<th>${item}</th>`;
                    }
                )
                .join("") +

            "</tr>";
    }


    /* =====================================================
       LOAD RECORDS
       ===================================================== */

    async function records() {

        $("tableBody").innerHTML =
            '<tr><td class="state-cell" colspan="8">' +
            "তথ্য লোড হচ্ছে..." +
            "</td></tr>";


        const result =
            await sb
                .from(
                    T[S.entity]
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (result.error) {

            err(
                result.error.message
            );

            return;
        }


        S.records =
            result.data || [];


        S.page = 1;


        filter();
    }


    /* =====================================================
       FILTER
       ===================================================== */

    function filter() {

        const query =
            $("searchInput")
                .value
                .trim()
                .toLowerCase();


        const divisionId =
            $("divisionFilter").value;


        const districtId =
            $("districtFilter").value;


        const statusValue =
            $("statusFilter").value;


        S.filtered =
            S.records.filter(
                function (record) {

                    const statusMatch =
                        (
                            statusValue === "all"
                        ) ||

                        (
                            statusValue ===
                            "active" &&
                            record.is_active ===
                            true
                        ) ||

                        (
                            statusValue ===
                            "inactive" &&
                            record.is_active ===
                            false
                        );


                    const divisionMatch =
                        (
                            !divisionId ||
                            record.division_id ===
                            divisionId
                        );


                    const districtMatch =
                        (
                            !districtId ||
                            record.district_id ===
                            districtId
                        );


                    const searchMatch =
                        (
                            !query ||
                            search(record)
                                .includes(query)
                        );


                    return (
                        statusMatch &&
                        divisionMatch &&
                        districtMatch &&
                        searchMatch
                    );
                }
            );


        render();
    }


    /* =====================================================
       SEARCH
       ===================================================== */

    function search(record) {

        return (
            {
                contacts: [
                    record.name,
                    record.name_bn,
                    record.phone,
                    record.description,
                    cat(record.category_id)
                ],

                ambulances: [
                    record.name,
                    record.provider_type,
                    record.phone,
                    record.alternative_phone,
                    record.address
                ],

                police: [
                    record.name,
                    record.name_bn,
                    record.phone,
                    record.emergency_phone,
                    record.officer_name,
                    record.officer_phone,
                    record.address
                ],

                blood: [
                    record.name,
                    record.phone,
                    record.address,
                    record.blood_groups
                ]

            }[S.entity]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
        );
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function render() {

        const rows =
            S.filtered.slice(
                (S.page - 1) * 10,
                S.page * 10
            );


        $("tableBody").innerHTML =
            rows.length

                ? rows
                    .map(row)
                    .join("")

                : `
                    <tr>
                        <td
                            class="state-cell"
                            colspan="8"
                        >
                            এই filter-এ কোনো record পাওয়া যায়নি।
                        </td>
                    </tr>
                `;


        $("recordSummary").textContent =
            `${S.filtered.length.toLocaleString(
                "bn-BD"
            )}টি record`;


        pages(
            Math.max(
                1,
                Math.ceil(
                    S.filtered.length / 10
                )
            )
        );
    }


    /* =====================================================
       ROW
       ===================================================== */

    function row(record) {

        const actions =
            S.canManage

                ? `
                    <div class="row-actions">

                        <button
                            class="action-button"
                            data-a="edit"
                            data-id="${esc(record.id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="action-button"
                            data-a="status"
                            data-id="${esc(record.id)}"
                        >
                            ${record.is_active
                    ? "Deactivate"
                    : "Activate"
                }
                        </button>

                    </div>
                `

                : "View only";


        if (
            S.entity === "contacts"
        ) {

            return `
                <tr>

                    <td>
                        <b>
                            ${esc(
                record.name_bn ||
                record.name
            )}
                        </b>

                        <br>

                        <span class="muted">
                            ${esc(
                record.name || ""
            )}
                        </span>
                    </td>

                    <td>
                        ${esc(
                record.phone
            )}
                    </td>

                    <td>
                        ${esc(
                cat(
                    record.category_id
                ) ||
                "অনির্ধারিত"
            )}
                    </td>

                    <td>
                        ${esc(
                loc(record)
            )}
                    </td>

                    <td>
                        ${ver(
                record.is_verified
            )}
                    </td>

                    <td>
                        ${status(
                record.is_active
            )}
                    </td>

                    <td>
                        ${esc(
                date(
                    record.last_updated ||
                    record.created_at
                )
            )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;
        }


        if (
            S.entity === "ambulances"
        ) {

            return `
                <tr>

                    <td>
                        <b>
                            ${esc(
                record.name
            )}
                        </b>
                    </td>

                    <td>
                        ${esc(
                record.provider_type
            )}
                    </td>

                    <td>
                        ${esc(
                record.phone
            )}
                    </td>

                    <td>
                        ${esc(
                loc(record)
            )}
                    </td>

                    <td>
                        ${record.is_24_hours
                    ? "Yes"
                    : "No"
                }
                    </td>

                    <td>
                        ${ver(
                    record.is_verified
                )}
                    </td>

                    <td>
                        ${status(
                    record.is_active
                )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;
        }


        if (
            S.entity === "police"
        ) {

            return `
                <tr>

                    <td>
                        <b>
                            ${esc(
                record.name_bn ||
                record.name
            )}
                        </b>
                    </td>

                    <td>
                        ${esc(
                record.emergency_phone ||
                record.phone ||
                "—"
            )}
                    </td>

                    <td>
                        ${esc(
                S.zm[
                    record.district_id
                ]?.name_bn ||
                S.zm[
                    record.district_id
                ]?.name ||
                "—"
            )}
                    </td>

                    <td>
                        ${esc(
                S.um[
                    record.upazila_id
                ]?.name_bn ||
                S.um[
                    record.upazila_id
                ]?.name ||
                "—"
            )}
                    </td>

                    <td>
                        ${esc(
                record.officer_name ||
                "—"
            )}
                    </td>

                    <td>
                        ${ver(
                record.is_verified
            )}
                    </td>

                    <td>
                        ${status(
                record.is_active
            )}
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;
        }


        return `
            <tr>

                <td>
                    <b>
                        ${esc(
            record.name
        )}
                    </b>
                </td>

                <td>
                    ${esc(
            record.phone ||
            "—"
        )}
                </td>

                <td>
                    ${esc(
            loc(record)
        )}
                </td>

                <td>
                    ${esc(
            record.blood_groups ||
            "—"
        )}
                </td>

                <td>
                    ${ver(
            record.is_verified
        )}
                </td>

                <td>
                    ${status(
            record.is_active
        )}
                </td>

                <td>
                    ${esc(
            date(
                record.updated_at ||
                record.created_at
            )
        )}
                </td>

                <td>
                    ${actions}
                </td>

            </tr>
        `;
    }


    /* =====================================================
       FORM
       ===================================================== */

    function form(record) {

        if (!S.canManage) {

            err(
                "আপনার এই পরিবর্তন করার permission নেই।"
            );

            return;
        }


        S.edit =
            record?.id ||
            null;


        $("modalTitle").textContent =
            record
                ? M[S.entity][0] + " Edit"
                : M[S.entity][0] + " Add";


        $("formFields").innerHTML =
            fields(
                record || {}
            );


        bindForm(
            record || {}
        );


        $("modal").hidden =
            false;


        document.body.style.overflow =
            "hidden";
    }


    /* =====================================================
       FORM FIELDS
       ===================================================== */

    function fields(record) {

        const locationFields =
            `
                ${sel(
                "division_id",
                "Division",
                S.divisions.filter(
                    function (item) {
                        return item.is_active;
                    }
                ),
                record.division_id,
                false
            )}

                ${sel(
                "district_id",
                "District",
                S.districts.filter(
                    function (item) {

                        return (
                            item.is_active &&
                            (
                                !record.division_id ||
                                item.division_id ===
                                record.division_id
                            )
                        );
                    }
                ),
                record.district_id,
                false
            )}

                ${sel(
                "upazila_id",
                "Upazila",
                S.upazilas.filter(
                    function (item) {

                        return (
                            item.is_active &&
                            (
                                !record.district_id ||
                                item.district_id ===
                                record.district_id
                            )
                        );
                    }
                ),
                record.upazila_id,
                false
            )}
            `;


        /* =================================================
           EMERGENCY CONTACTS
           ================================================= */

        if (
            S.entity === "contacts"
        ) {

            return (

                text(
                    "name",
                    "Name",
                    record.name,
                    true
                ) +

                text(
                    "name_bn",
                    "বাংলা নাম",
                    record.name_bn,
                    true
                ) +

                sel(
                    "category_id",
                    "Category",
                    S.categories,
                    record.category_id,
                    true
                ) +

                text(
                    "phone",
                    "Phone",
                    record.phone,
                    true
                ) +

                area(
                    "description",
                    "Description",
                    record.description
                ) +

                locationFields +

                check(
                    "is_national",
                    "National",
                    record.is_national
                ) +

                check(
                    "is_verified",
                    "Verified",
                    record.is_verified
                ) +

                check(
                    "is_active",
                    "Active",
                    record.id
                        ? record.is_active
                        : true
                )
            );
        }


        /* =================================================
           AMBULANCES
           ================================================= */

        if (
            S.entity === "ambulances"
        ) {

            return (

                text(
                    "name",
                    "Name",
                    record.name,
                    true
                ) +

                simple(
                    "provider_type",
                    "Provider Type",
                    [
                        "Private",
                        "Government",
                        "NGO",
                        "Hospital",
                        "Other"
                    ],
                    record.provider_type ||
                    "Private"
                ) +

                text(
                    "phone",
                    "Phone",
                    record.phone,
                    true
                ) +

                text(
                    "alternative_phone",
                    "Alternative Phone",
                    record.alternative_phone
                ) +

                text(
                    "address",
                    "Address",
                    record.address,
                    false,
                    true
                ) +

                locationFields +

                check(
                    "is_24_hours",
                    "24 Hours",
                    record.is_24_hours
                ) +

                check(
                    "is_verified",
                    "Verified",
                    record.is_verified
                ) +

                check(
                    "is_active",
                    "Active",
                    record.id
                        ? record.is_active
                        : true
                )
            );
        }


        /* =================================================
           POLICE
           ================================================= */

        if (
            S.entity === "police"
        ) {

            return (

                text(
                    "name",
                    "Name",
                    record.name,
                    true
                ) +

                text(
                    "name_bn",
                    "বাংলা নাম",
                    record.name_bn,
                    true
                ) +

                locationFields +

                text(
                    "address",
                    "Address",
                    record.address,
                    false,
                    true
                ) +

                text(
                    "phone",
                    "Phone",
                    record.phone
                ) +

                text(
                    "emergency_phone",
                    "Emergency Phone",
                    record.emergency_phone
                ) +

                text(
                    "officer_name",
                    "Officer Name",
                    record.officer_name
                ) +

                text(
                    "officer_phone",
                    "Officer Phone",
                    record.officer_phone
                ) +

                check(
                    "is_verified",
                    "Verified",
                    record.is_verified
                ) +

                check(
                    "is_active",
                    "Active",
                    record.id
                        ? record.is_active
                        : true
                )
            );
        }


        /* =================================================
           BLOOD BANKS
           ================================================= */

        return (

            text(
                "name",
                "Name",
                record.name,
                true
            ) +

            text(
                "phone",
                "Phone",
                record.phone
            ) +

            text(
                "address",
                "Address",
                record.address,
                false,
                true
            ) +

            locationFields +

            text(
                "blood_groups",
                "Blood Groups",
                record.blood_groups,
                false,
                true
            ) +

            check(
                "is_verified",
                "Verified",
                record.is_verified
            ) +

            check(
                "is_active",
                "Active",
                record.id
                    ? record.is_active
                    : true
            )
        );
    }


    /* =====================================================
       FORM DEPENDENCY
       ===================================================== */

    function bindForm(record) {

        const division =
            $("field_division_id");

        const district =
            $("field_district_id");

        const upazila =
            $("field_upazila_id");

        const national =
            $("field_is_national");


        /* =================================================
           NATIONAL CONTACT
           ================================================= */

        if (
            S.entity === "contacts" &&
            national
        ) {

            national.onchange =
                function () {

                    if (
                        national.checked
                    ) {

                        division.value =
                            "";

                        district.innerHTML =
                            '<option value="">নির্বাচন করুন</option>';

                        upazila.innerHTML =
                            '<option value="">নির্বাচন করুন</option>';

                        district.disabled =
                            true;

                        upazila.disabled =
                            true;

                    } else {

                        district.disabled =
                            false;

                        upazila.disabled =
                            true;

                        updateContactLocationRequirements();
                    }
                };
        }


        /* =================================================
           DIVISION CHANGE
           ================================================= */

        if (division) {

            division.onchange =
                function () {

                    const available =
                        S.districts.filter(
                            function (item) {

                                return (
                                    item.is_active &&
                                    item.division_id ===
                                    division.value
                                );
                            }
                        );


                    set(
                        district,
                        available
                    );


                    set(
                        upazila,
                        []
                    );


                    upazila.disabled =
                        true;


                    if (
                        S.entity ===
                        "contacts"
                    ) {
                        updateContactLocationRequirements();
                    }
                };
        }


        /* =================================================
           DISTRICT CHANGE
           ================================================= */

        if (district) {

            district.onchange =
                function () {

                    const available =
                        S.upazilas.filter(
                            function (item) {

                                return (
                                    item.is_active &&
                                    item.district_id ===
                                    district.value
                                );
                            }
                        );


                    set(
                        upazila,
                        available
                    );


                    if (
                        S.entity ===
                        "contacts"
                    ) {
                        updateContactLocationRequirements();
                    }
                };
        }


        /* =================================================
           INITIAL STATE
           ================================================= */

        if (
            S.entity ===
            "contacts"
        ) {

            if (
                national &&
                national.checked
            ) {

                district.disabled =
                    true;

                upazila.disabled =
                    true;

            } else {

                district.disabled =
                    !division.value;

                upazila.disabled =
                    !district.value;
            }


            updateContactLocationRequirements();

        } else {

            district.disabled =
                !division.value;

            upazila.disabled =
                !district.value;
        }
    }


    /* =====================================================
       CONTACT LOCATION REQUIRED STATE
       ===================================================== */

    function updateContactLocationRequirements() {

        if (
            S.entity !==
            "contacts"
        ) {
            return;
        }


        const national =
            $("field_is_national");

        const division =
            $("field_division_id");

        const district =
            $("field_district_id");


        if (
            !national ||
            !division ||
            !district
        ) {
            return;
        }


        const localContact =
            !national.checked;


        division.required =
            localContact;


        district.required =
            localContact;


        /*
         * Upazila remains optional.
         */

        const upazila =
            $("field_upazila_id");


        if (upazila) {
            upazila.required =
                false;
        }
    }


    /* =====================================================
       SELECT OPTIONS
       ===================================================== */

    function set(
        select,
        array
    ) {

        if (!select) {
            return;
        }


        select.innerHTML =
            '<option value="">নির্বাচন করুন</option>' +

            array
                .map(
                    function (item) {

                        return `
                            <option value="${esc(item.id)}">
                                ${esc(
                            item.name_bn ||
                            item.name
                        )}
                            </option>
                        `;
                    }
                )
                .join("");


        select.disabled =
            !array.length;
    }


    /* =====================================================
       SAVE
       ===================================================== */

    async function save(event) {

        event.preventDefault();


        if (!S.canManage) {
            return;
        }


        const form =
            $("recordForm");


        const fd =
            new FormData(form);


        const payload = {};


        fd.forEach(
            function (value, key) {

                if (
                    ![
                        "is_national",
                        "is_verified",
                        "is_active",
                        "is_24_hours"
                    ].includes(key)
                ) {

                    payload[key] =
                        String(
                            value
                        ).trim() ||
                        null;
                }
            }
        );


        [
            "is_national",
            "is_verified",
            "is_active",
            "is_24_hours"
        ].forEach(
            function (key) {

                const element =
                    $("field_" + key);


                if (element) {

                    payload[key] =
                        element.checked;
                }
            }
        );


        /* =================================================
           EMERGENCY CONTACT VALIDATION
           ================================================= */

        if (
            S.entity ===
            "contacts"
        ) {

            const phone =
                String(
                    payload.phone ||
                    ""
                ).trim();


            /*
             * Phone validation
             *
             * Supports:
             * 01XXXXXXXXX
             * +8801XXXXXXXXX
             * 8801XXXXXXXXX
             */

            const normalizedPhone =
                phone
                    .replace(
                        /[\s\-()]/g,
                        ""
                    );


            const phoneValid =
                /^(?:\+?8801|01)\d{9}$/
                    .test(
                        normalizedPhone
                    );


            if (!phoneValid) {

                err(
                    "সঠিক বাংলাদেশি mobile phone number দিন।"
                );

                return;
            }


            payload.phone =
                normalizedPhone;


            /*
             * National contact
             */

            if (
                payload.is_national
            ) {

                payload.division_id =
                    null;

                payload.district_id =
                    null;

                payload.upazila_id =
                    null;

            } else {

                /*
                 * Local contact
                 */

                if (
                    !payload.division_id
                ) {

                    err(
                        "Local emergency contact-এর জন্য Division নির্বাচন করুন।"
                    );

                    return;
                }


                if (
                    !payload.district_id
                ) {

                    err(
                        "Local emergency contact-এর জন্য District নির্বাচন করুন।"
                    );

                    return;
                }


                /*
                 * Check district belongs
                 * to selected division.
                 */

                const district =
                    S.zm[
                    payload.district_id
                    ];


                if (
                    !district ||
                    district.division_id !==
                    payload.division_id
                ) {

                    err(
                        "Selected District, selected Division-এর অন্তর্ভুক্ত নয়।"
                    );

                    return;
                }


                /*
                 * Upazila is optional,
                 * but if selected it must
                 * belong to selected district.
                 */

                if (
                    payload.upazila_id
                ) {

                    const upazila =
                        S.um[
                        payload.upazila_id
                        ];


                    if (
                        !upazila ||
                        upazila.district_id !==
                        payload.district_id
                    ) {

                        err(
                            "Selected Upazila, selected District-এর অন্তর্ভুক্ত নয়।"
                        );

                        return;
                    }
                }
            }


            /* =================================================
               DUPLICATE PHONE CHECK
               ================================================= */

            let duplicateQuery =
                sb
                    .from(
                        T.contacts
                    )
                    .select(
                        "id,name,phone"
                    )
                    .eq(
                        "phone",
                        payload.phone
                    );


            if (S.edit) {

                duplicateQuery =
                    duplicateQuery.neq(
                        "id",
                        S.edit
                    );
            }


            const duplicateResult =
                await duplicateQuery.limit(1);


            if (
                duplicateResult.error
            ) {

                err(
                    duplicateResult.error.message
                );

                return;
            }


            if (
                duplicateResult.data &&
                duplicateResult.data.length
            ) {

                err(
                    "এই phone number দিয়ে একটি Emergency Contact ইতিমধ্যে আছে।"
                );

                return;
            }
        }


        /* =================================================
           POLICE VALIDATION
           ================================================= */

        if (
            S.entity ===
            "police"
        ) {

            if (
                !payload.division_id
            ) {

                err(
                    "Police Station-এর Division প্রয়োজন।"
                );

                return;
            }


            if (
                !payload.district_id
            ) {

                err(
                    "Police Station-এর District প্রয়োজন।"
                );

                return;
            }


            const district =
                S.zm[
                payload.district_id
                ];


            if (
                !district ||
                district.division_id !==
                payload.division_id
            ) {

                err(
                    "Selected District, selected Division-এর অন্তর্ভুক্ত নয়।"
                );

                return;
            }


            if (
                payload.upazila_id
            ) {

                const upazila =
                    S.um[
                    payload.upazila_id
                    ];


                if (
                    !upazila ||
                    upazila.district_id !==
                    payload.district_id
                ) {

                    err(
                        "Selected Upazila, selected District-এর অন্তর্ভুক্ত নয়।"
                    );

                    return;
                }
            }
        }


        /* =================================================
           DISABLE SAVE
           ================================================= */

        $("saveButton").disabled =
            true;


        let result;


        try {

            if (S.edit) {

                result =
                    await sb
                        .from(
                            T[S.entity]
                        )
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            S.edit
                        );

            } else {

                result =
                    await sb
                        .from(
                            T[S.entity]
                        )
                        .insert(
                            payload
                        );
            }


            if (result.error) {
                throw result.error;
            }


            ok(
                S.edit
                    ? "Record update হয়েছে।"
                    : "Record যোগ হয়েছে।"
            );


            close();


            await records();

        } catch (error) {

            err(
                error.message ||
                "Record save করা যায়নি।"
            );

        } finally {

            $("saveButton").disabled =
                false;
        }
    }


    /* =====================================================
       ACTIONS
       ===================================================== */

    async function action(event) {

        const button =
            event.target.closest(
                "[data-a]"
            );


        if (
            !button ||
            !S.canManage
        ) {
            return;
        }


        const record =
            S.records.find(
                function (item) {
                    return (
                        item.id ===
                        button.dataset.id
                    );
                }
            );


        if (!record) {
            return;
        }


        if (
            button.dataset.a ===
            "edit"
        ) {

            form(record);

            return;
        }


        if (
            !confirm(
                record.is_active
                    ? "Deactivate করতে চান?"
                    : "Activate করতে চান?"
            )
        ) {
            return;
        }


        const result =
            await sb
                .from(
                    T[S.entity]
                )
                .update({
                    is_active:
                        !record.is_active
                })
                .eq(
                    "id",
                    record.id
                );


        if (result.error) {

            err(
                result.error.message
            );

        } else {

            ok(
                "Status update হয়েছে।"
            );

            await records();
        }
    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function pages(totalPages) {

        $("pagination").innerHTML =
            totalPages < 2

                ? ""

                : Array
                    .from(
                        {
                            length:
                                totalPages
                        },
                        function (_, index) {

                            return `
                                <button
                                    class="page-button ${index + 1 ===
                                    S.page
                                    ? "is-active"
                                    : ""
                                }"
                                    data-page="${index + 1
                                }"
                                >
                                    ${index + 1
                                }
                                </button>
                            `;
                        }
                    )
                    .join("");


        $("pagination")
            .querySelectorAll(
                "[data-page]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            S.page =
                                Number(
                                    button.dataset.page
                                );

                            render();
                        };
                }
            );
    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function close() {

        $("modal").hidden =
            true;


        document.body.style.overflow =
            "";


        S.edit =
            null;
    }


    /* =====================================================
       CATEGORY
       ===================================================== */

    function cat(id) {

        return (
            S.cm[id]?.name_bn ||
            S.cm[id]?.name ||
            ""
        );
    }


    /* =====================================================
       LOCATION
       ===================================================== */

    function loc(record) {

        return [
            S.dm[
            record.division_id
            ],

            S.zm[
            record.district_id
            ],

            S.um[
            record.upazila_id
            ]

        ]
            .filter(Boolean)
            .map(
                function (item) {
                    return (
                        item.name_bn ||
                        item.name
                    );
                }
            )
            .join(" / ") ||

            (
                record.is_national
                    ? "National"
                    : "—"
            );
    }


    /* =====================================================
       STATUS
       ===================================================== */

    function status(active) {

        return `
            <span
                class="status-badge ${active
                ? "status-active"
                : "status-inactive"
            }"
            >
                ${active
                ? "Active"
                : "Inactive"
            }
            </span>
        `;
    }


    /* =====================================================
       VERIFIED
       ===================================================== */

    function ver(verified) {

        return `
            <span
                class="verify-badge ${verified
                ? "verify-yes"
                : "verify-no"
            }"
            >
                ${verified
                ? "Verified"
                : "Unverified"
            }
            </span>
        `;
    }


    /* =====================================================
       DATE
       ===================================================== */

    function date(value) {

        const d =
            new Date(value);


        return isNaN(d)

            ? "—"

            : d.toLocaleDateString(
                "bn-BD"
            );
    }


    /* =====================================================
       TEXT INPUT
       ===================================================== */

    function text(
        name,
        label,
        value,
        required,
        full
    ) {

        return `
            <div
                class="form-field ${full
                ? "full"
                : ""
            }"
            >

                <label>
                    ${label}

                    ${required
                ? " *"
                : ""
            }
                </label>

                <input
                    id="field_${name}"
                    name="${name}"
                    value="${esc(
                value || ""
            )}"
                    ${required
                ? "required"
                : ""
            }
                >

            </div>
        `;
    }


    /* =====================================================
       TEXTAREA
       ===================================================== */

    function area(
        name,
        label,
        value
    ) {

        return `
            <div
                class="form-field full"
            >

                <label>
                    ${label}
                </label>

                <textarea
                    id="field_${name}"
                    name="${name}"
                >${esc(
            value || ""
        )}</textarea>

            </div>
        `;
    }


    /* =====================================================
       SELECT
       ===================================================== */

    function sel(
        name,
        label,
        array,
        value,
        required
    ) {

        return `
            <div
                class="form-field"
            >

                <label>
                    ${label}

                    ${required
                ? " *"
                : ""
            }
                </label>

                <select
                    id="field_${name}"
                    name="${name}"
                    ${required
                ? "required"
                : ""
            }
                >

                    <option value="">
                        নির্বাচন করুন
                    </option>

                    ${array
                .map(
                    function (item) {

                        return `
                                        <option
                                            value="${esc(
                            item.id
                        )}"
                                            ${item.id ===
                                value
                                ? "selected"
                                : ""
                            }
                                        >
                                            ${esc(
                                item.name_bn ||
                                item.name
                            )}
                                        </option>
                                    `;
                    }
                )
                .join("")
            }

                </select>

            </div>
        `;
    }


    /* =====================================================
       SIMPLE SELECT
       ===================================================== */

    function simple(
        name,
        label,
        array,
        value
    ) {

        return `
            <div
                class="form-field"
            >

                <label>
                    ${label}
                </label>

                <select
                    id="field_${name}"
                    name="${name}"
                >

                    ${array
                .map(
                    function (item) {

                        return `
                                        <option
                                            ${item ===
                                value
                                ? "selected"
                                : ""
                            }
                                        >
                                            ${esc(item)}
                                        </option>
                                    `;
                    }
                )
                .join("")
            }

                </select>

            </div>
        `;
    }


    /* =====================================================
       CHECKBOX
       ===================================================== */

    function check(
        name,
        label,
        value
    ) {

        return `
            <div
                class="form-field"
            >

                <label
                    class="check-field"
                >

                    <input
                        id="field_${name}"
                        name="${name}"
                        type="checkbox"
                        ${value
                ? "checked"
                : ""
            }
                    >

                    <span>
                        ${label}
                    </span>

                </label>

            </div>
        `;
    }


    /* =====================================================
       ERROR
       ===================================================== */

    function err(message) {

        $("pageError").textContent =
            message;


        $("pageError").hidden =
            false;


        $("pageSuccess").hidden =
            true;
    }


    /* =====================================================
       SUCCESS
       ===================================================== */

    function ok(message) {

        $("pageSuccess").textContent =
            message;


        $("pageSuccess").hidden =
            false;


        $("pageError").hidden =
            true;
    }


    /* =====================================================
       DEBOUNCE
       ===================================================== */

    function debounce(
        callback,
        timeout
    ) {

        let timer;


        return function () {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    callback,
                    timeout
                );
        };
    }

})();
