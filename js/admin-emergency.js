(function () {
    "use strict";

    const sb = window.supabase.createClient(DORKARI_CONFIG.SUPABASE.URL, DORKARI_CONFIG.SUPABASE.PUBLISHABLE_KEY),
        T = {
            contacts: "emergency_contacts",
            ambulances: "ambulances",
            police: "police_stations",
            blood: "blood_banks"
        },
        S = {
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
        },
        M = {
            contacts: ["Emergency Contacts", "জাতীয় ও স্থানীয় জরুরি যোগাযোগের তথ্য।", "নাম, ফোন, বিবরণ দিয়ে খুঁজুন"],
            ambulances: ["Ambulances", "অ্যাম্বুলেন্স ও পরিবেশকের তথ্য।", "নাম, ফোন, ঠিকানা দিয়ে খুঁজুন"],
            police: ["Police Stations", "থানা ও জরুরি যোগাযোগের তথ্য।", "নাম, ফোন, অফিসারের নাম দিয়ে খুঁজুন"],
            blood: ["Blood Banks", "রক্ত ব্যাংক ও রক্তের গ্রুপের তথ্য।", "নাম, ফোন, ঠিকানা দিয়ে খুঁজুন"]
        },
        $ = id => document.getElementById(id),
        esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"),
        map = a => a.reduce((m, x) => (m[x.id] = x, m), {});

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        bind();
        try {
            await auth();
            [S.divisions, S.districts, S.upazilas, S.categories] = await Promise.all([
                load("divisions", "id,name,name_bn,is_active", "name_bn"),
                load("districts", "id,name,name_bn,division_id,is_active", "name_bn"),
                load("upazilas", "id,name,name_bn,district_id,is_active", "name_bn"),
                load("categories", "id,name,name_bn,slug,is_active,sort_order", "sort_order")
            ]);
            
            S.dm = map(S.divisions);
            S.zm = map(S.districts);
            S.um = map(S.upazilas);
            S.cm = map(S.categories);
            
            shell();
            await records();
        } catch (e) {
            err(e.message || "Emergency Management লোড করা যায়নি।");
        }
    }

    function bind() {
        document.querySelectorAll(".emergency-tab").forEach(b => {
            b.onclick = async () => {
                S.entity = b.dataset.entity;
                S.page = 1;
                document.querySelectorAll(".emergency-tab").forEach(x => x.classList.toggle("is-active", x === b));
                shell();
                await records();
            };
        });

        $("searchInput").oninput = debounce(() => {
            S.page = 1;
            filter();
        }, 180);

        $("divisionFilter").onchange = () => {
            S.page = 1;
            districts();
            filter();
        };

        $("districtFilter").onchange = () => {
            S.page = 1;
            filter();
        };

        $("statusFilter").onchange = () => {
            S.page = 1;
            filter();
        };

        $("refreshButton").onclick = records;
        $("addButton").onclick = () => form();
        $("recordForm").onsubmit = save;
        $("closeModalButton").onclick = close;
        $("cancelButton").onclick = close;
        
        $("modal").onclick = e => {
            if (e.target.dataset.closeModal !== undefined) close();
        };

        $("logoutButton").onclick = async () => {
            await sb.auth.signOut();
            location.href = "./index.html";
        };

        $("tableBody").onclick = action;
    }

    async function auth() {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        
        if (!data.session) {
            location.href = "./index.html";
            throw Error("Authentication required");
        }
        
        const r = await sb.from("admin_profiles")
            .select("id,user_id,name,role,is_active")
            .eq("user_id", data.session.user.id)
            .eq("is_active", true)
            .maybeSingle();
            
        if (r.error) throw r.error;
        
        if (!r.data) {
            await sb.auth.signOut();
            location.href = "./index.html";
            throw Error("এই account-এর Admin access নেই।");
        }
        
        S.canManage = ["super_admin", "admin"].includes(r.data.role);
        
        if (!S.canManage) {
            $("permissionNotice").textContent = "আপনার role view-only। Add, Edit ও Status পরিবর্তনের permission নেই।";
            $("permissionNotice").hidden = false;
            $("addButton").disabled = true;
        }
    }

    async function load(t, c, o) {
        const r = await sb.from(t).select(c).order(o, { ascending: true });
        if (r.error) throw r.error;
        return r.data || [];
    }

    function shell() {
        const m = M[S.entity];
        $("sectionTitle").textContent = m[0];
        $("sectionDescription").textContent = m[1];
        $("searchInput").placeholder = m[2];
        head();
        
        $("divisionFilter").innerHTML = '<option value="">সব বিভাগ</option>' + 
            S.divisions.filter(x => x.is_active).map(x => `<option value="${esc(x.id)}">${esc(x.name_bn || x.name)}</option>`).join("");
            
        districts();
    }

    function districts() {
        const v = $("divisionFilter").value,
              a = S.districts.filter(x => x.is_active && (!v || x.division_id === v)),
              d = $("districtFilter"),
              old = d.value;
              
        d.innerHTML = '<option value="">সব জেলা</option>' + 
            a.map(x => `<option value="${esc(x.id)}">${esc(x.name_bn || x.name)}</option>`).join("");
            
        d.disabled = !a.length;
        if (a.some(x => x.id === old)) d.value = old;
    }

    function head() {
        const h = {
            contacts: ["Name", "Phone", "Category", "Location", "Verified", "Status", "Updated", "Actions"],
            ambulances: ["Name", "Provider", "Phone", "Location", "24 Hours", "Verified", "Status", "Actions"],
            police: ["Name", "Emergency Phone", "District", "Upazila", "Officer", "Verified", "Status", "Actions"],
            blood: ["Name", "Phone", "Location", "Blood Groups", "Verified", "Status", "Updated", "Actions"]
        }[S.entity];
        
        $("tableHead").innerHTML = "<tr>" + h.map(x => `<th>${x}</th>`).join("") + "</tr>";
    }

    async function records() {
        $("tableBody").innerHTML = '<tr><td class="state-cell" colspan="8">তথ্য লোড হচ্ছে...</td></tr>';
        
        const r = await sb.from(T[S.entity]).select("*").order("created_at", { ascending: false });
        
        if (r.error) {
            err(r.error.message);
            return;
        }
        
        S.records = r.data || [];
        S.page = 1;
        filter();
    }

    function filter() {
        const q = $("searchInput").value.trim().toLowerCase(),
              dv = $("divisionFilter").value,
              di = $("districtFilter").value,
              st = $("statusFilter").value;
              
        S.filtered = S.records.filter(r => 
            (st === "all" || (st === "active" ? r.is_active === true : r.is_active === false)) && 
            (!dv || r.division_id === dv) && 
            (!di || r.district_id === di) && 
            (!q || search(r).includes(q))
        );
        
        render();
    }

    function search(r) {
        return ({
            contacts: [r.name, r.name_bn, r.phone, r.description, cat(r.category_id)],
            ambulances: [r.name, r.provider_type, r.phone, r.alternative_phone, r.address],
            police: [r.name, r.name_bn, r.phone, r.emergency_phone, r.officer_name, r.officer_phone, r.address],
            blood: [r.name, r.phone, r.address, r.blood_groups]
        }[S.entity].filter(Boolean).join(" ").toLowerCase());
    }

    function render() {
        const rows = S.filtered.slice((S.page - 1) * 10, S.page * 10);
        
        $("tableBody").innerHTML = rows.length 
            ? rows.map(row).join("") 
            : '<tr><td class="state-cell" colspan="8">এই filter-এ কোনো record পাওয়া যায়নি।</td></tr>';
            
        $("recordSummary").textContent = `${S.filtered.length.toLocaleString("bn-BD")}টি record`;
        pages(Math.max(1, Math.ceil(S.filtered.length / 10)));
    }

    function row(r) {
        const a = S.canManage 
            ? `<div class="row-actions">
                 <button class="action-button" data-a="edit" data-id="${esc(r.id)}">Edit</button>
                 <button class="action-button" data-a="status" data-id="${esc(r.id)}">${r.is_active ? "Deactivate" : "Activate"}</button>
               </div>` 
            : "View only";

        if (S.entity === "contacts") {
            return `<tr>
                <td><b>${esc(r.name_bn || r.name)}</b><br><span class="muted">${esc(r.name || "")}</span></td>
                <td>${esc(r.phone)}</td>
                <td>${esc(cat(r.category_id) || "অনির্ধারিত")}</td>
                <td>${esc(loc(r))}</td>
                <td>${ver(r.is_verified)}</td>
                <td>${status(r.is_active)}</td>
                <td>${esc(date(r.last_updated || r.created_at))}</td>
                <td>${a}</td>
            </tr>`;
        }
        
        if (S.entity === "ambulances") {
            return `<tr>
                <td><b>${esc(r.name)}</b></td>
                <td>${esc(r.provider_type)}</td>
                <td>${esc(r.phone)}</td>
                <td>${esc(loc(r))}</td>
                <td>${r.is_24_hours ? "Yes" : "No"}</td>
                <td>${ver(r.is_verified)}</td>
                <td>${status(r.is_active)}</td>
                <td>${a}</td>
            </tr>`;
        }
        
        if (S.entity === "police") {
            return `<tr>
                <td><b>${esc(r.name_bn || r.name)}</b></td>
                <td>${esc(r.emergency_phone || r.phone || "—")}</td>
                <td>${esc(S.zm[r.district_id]?.name_bn || S.zm[r.district_id]?.name || "—")}</td>
                <td>${esc(S.um[r.upazila_id]?.name_bn || S.um[r.upazila_id]?.name || "—")}</td>
                <td>${esc(r.officer_name || "—")}</td>
                <td>${ver(r.is_verified)}</td>
                <td>${status(r.is_active)}</td>
                <td>${a}</td>
            </tr>`;
        }
        
        return `<tr>
            <td><b>${esc(r.name)}</b></td>
            <td>${esc(r.phone || "—")}</td>
            <td>${esc(loc(r))}</td>
            <td>${esc(r.blood_groups || "—")}</td>
            <td>${ver(r.is_verified)}</td>
            <td>${status(r.is_active)}</td>
            <td>${esc(date(r.updated_at || r.created_at))}</td>
            <td>${a}</td>
        </tr>`;
    }

    function form(r) {
        if (!S.canManage) {
            err("আপনার এই পরিবর্তন করার permission নেই।");
            return;
        }
        
        S.edit = r?.id || null;
        $("modalTitle").textContent = r ? M[S.entity][0] + " Edit" : M[S.entity][0] + " Add";
        $("formFields").innerHTML = fields(r || {});
        bindForm(r || {});
        
        $("modal").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function fields(r) {
        const locf = `${sel("division_id", "Division", S.divisions.filter(x => x.is_active), r.division_id, true)}
                      ${sel("district_id", "District", S.districts.filter(x => x.is_active && (!r.division_id || x.division_id === r.division_id)), r.district_id, true)}
                      ${sel("upazila_id", "Upazila", S.upazilas.filter(x => x.is_active && (!r.district_id || x.district_id === r.district_id)), r.upazila_id, false)}`;

        if (S.entity === "contacts") {
            return text("name", "Name", r.name, true) + 
                   text("name_bn", "বাংলা নাম", r.name_bn, true) + 
                   sel("category_id", "Category", S.categories.filter(x => x.is_active), r.category_id, true) + 
                   text("phone", "Phone", r.phone, true) + 
                   area("description", "Description", r.description) + 
                   locf + 
                   check("is_national", "National", r.is_national) + 
                   check("is_verified", "Verified", r.is_verified) + 
                   check("is_active", "Active", r.id ? r.is_active : true);
        }
        
        if (S.entity === "ambulances") {
            return text("name", "Name", r.name, true) + 
                   simple("provider_type", "Provider Type", ["Private", "Government", "NGO", "Hospital", "Other"], r.provider_type || "Private") + 
                   text("phone", "Phone", r.phone, true) + 
                   text("alternative_phone", "Alternative Phone", r.alternative_phone) + 
                   text("address", "Address", r.address, false, true) + 
                   locf + 
                   check("is_24_hours", "24 Hours", r.is_24_hours) + 
                   check("is_verified", "Verified", r.is_verified) + 
                   check("is_active", "Active", r.id ? r.is_active : true);
        }
        
        if (S.entity === "police") {
            return text("name", "Name", r.name, true) + 
                   text("name_bn", "বাংলা নাম", r.name_bn, true) + 
                   locf.replace('division_id","Division",', 'division_id","Division",').replace('district_id","District",', 'district_id","District",') + 
                   text("address", "Address", r.address, false, true) + 
                   text("phone", "Phone", r.phone) + 
                   text("emergency_phone", "Emergency Phone", r.emergency_phone) + 
                   text("officer_name", "Officer Name", r.officer_name) + 
                   text("officer_phone", "Officer Phone", r.officer_phone) + 
                   check("is_verified", "Verified", r.is_verified) + 
                   check("is_active", "Active", r.id ? r.is_active : true);
        }
        
        return text("name", "Name", r.name, true) + 
               text("phone", "Phone", r.phone) + 
               text("address", "Address", r.address, false, true) + 
               locf + 
               text("blood_groups", "Blood Groups", r.blood_groups, false, true) + 
               check("is_verified", "Verified", r.is_verified) + 
               check("is_active", "Active", r.id ? r.is_active : true);
    }

    function bindForm(r) {
        const d = $("field_division_id"),
              z = $("field_district_id"),
              u = $("field_upazila_id");
              
        if (!d || !z || !u) return;
        
        d.onchange = () => {
            const a = S.districts.filter(x => x.is_active && x.division_id === d.value);
            set(z, a);
            set(u, []);
            u.disabled = true;
        };
        
        z.onchange = () => {
            const a = S.upazilas.filter(x => x.is_active && x.district_id === z.value);
            set(u, a);
            u.disabled = !a.length;
        };
        
        z.disabled = !d.value;
        u.disabled = !z.value;
    }

    function set(s, a) {
        s.innerHTML = '<option value="">নির্বাচন করুন</option>' + 
            a.map(x => `<option value="${esc(x.id)}">${esc(x.name_bn || x.name)}</option>`).join("");
        s.disabled = !a.length;
    }

    async function save(e) {
        e.preventDefault();
        if (!S.canManage) return;
        
        const fd = new FormData($("recordForm")), p = {};
        
        fd.forEach((v, k) => {
            if (!["is_national", "is_verified", "is_active", "is_24_hours"].includes(k)) {
                p[k] = String(v).trim() || null;
            }
        });
        
        ["is_national", "is_verified", "is_active", "is_24_hours"].forEach(k => {
            const x = $("field_" + k);
            if (x) p[k] = x.checked;
        });
        
        if (S.entity === "contacts" && p.is_national) {
            p.division_id = p.district_id = p.upazila_id = null;
        } else if (S.entity === "contacts" && (!p.division_id || !p.district_id)) {
            err("Local emergency contact-এর জন্য Division ও District নির্বাচন করুন।");
            return;
        }
        
        if (S.entity === "police" && (!p.division_id || !p.district_id)) {
            err("Police Station-এর Division ও District প্রয়োজন।");
            return;
        }
        
        $("saveButton").disabled = true;
        
        const q = S.edit 
            ? sb.from(T[S.entity]).update(p).eq("id", S.edit) 
            : sb.from(T[S.entity]).insert(p);
            
        const r = await q;
        
        if (r.error) {
            err(r.error.message);
        } else {
            ok(S.edit ? "Record update হয়েছে।" : "Record যোগ হয়েছে।");
            close();
            await records();
        }
        
        $("saveButton").disabled = false;
    }

    async function action(e) {
        const b = e.target.closest("[data-a]");
        if (!b || !S.canManage) return;
        
        const r = S.records.find(x => x.id === b.dataset.id);
        
        if (b.dataset.a === "edit") {
            form(r);
        } else {
            if (!confirm(r.is_active ? "Deactivate করতে চান?" : "Activate করতে চান?")) return;
            
            const q = await sb.from(T[S.entity]).update({ is_active: !r.is_active }).eq("id", r.id);
            
            if (q.error) {
                err(q.error.message);
            } else {
                ok("Status update হয়েছে।");
                await records();
            }
        }
    }

    function pages(n) {
        $("pagination").innerHTML = n < 2 ? "" : Array.from({ length: n }, (_, i) => 
            `<button class="page-button ${i + 1 === S.page ? "is-active" : ""}" data-page="${i + 1}">${i + 1}</button>`
        ).join("");
        
        $("pagination").querySelectorAll("[data-page]").forEach(b => {
            b.onclick = () => {
                S.page = +b.dataset.page;
                render();
            };
        });
    }

    function close() {
        $("modal").hidden = true;
        document.body.style.overflow = "";
        S.edit = null;
    }

    function cat(id) {
        return S.cm[id]?.name_bn || S.cm[id]?.name || "";
    }

    function loc(r) {
        return [S.dm[r.division_id], S.zm[r.district_id], S.um[r.upazila_id]]
            .filter(Boolean)
            .map(x => x.name_bn || x.name)
            .join(" / ") || (r.is_national ? "National" : "—");
    }

    function status(x) {
        return `<span class="status-badge ${x ? "status-active" : "status-inactive"}">${x ? "Active" : "Inactive"}</span>`;
    }

    function ver(x) {
        return `<span class="verify-badge ${x ? "verify-yes" : "verify-no"}">${x ? "Verified" : "Unverified"}</span>`;
    }

    function date(x) {
        const d = new Date(x);
        return isNaN(d) ? "—" : d.toLocaleDateString("bn-BD");
    }

    function text(n, l, v, req, full) {
        return `<div class="form-field ${full ? "full" : ""}">
                  <label>${l}${req ? " *" : ""}</label>
                  <input id="field_${n}" name="${n}" value="${esc(v || "")}" ${req ? "required" : ""}>
                </div>`;
    }

    function area(n, l, v) {
        return `<div class="form-field full">
                  <label>${l}</label>
                  <textarea id="field_${n}" name="${n}">${esc(v || "")}</textarea>
                </div>`;
    }

    function sel(n, l, a, v, req) {
        return `<div class="form-field">
                  <label>${l}${req ? " *" : ""}</label>
                  <select id="field_${n}" name="${n}" ${req ? "required" : ""}>
                    <option value="">নির্বাচন করুন</option>
                    ${a.map(x => `<option value="${esc(x.id)}" ${x.id === v ? "selected" : ""}>${esc(x.name_bn || x.name)}</option>`).join("")}
                  </select>
                </div>`;
    }

    function simple(n, l, a, v) {
        return `<div class="form-field">
                  <label>${l}</label>
                  <select id="field_${n}" name="${n}">
                    ${a.map(x => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("")}
                  </select>
                </div>`;
    }

    function check(n, l, v) {
        return `<div class="form-field">
                  <label class="check-field">
                    <input id="field_${n}" name="${n}" type="checkbox" ${v ? "checked" : ""}>
                    <span>${l}</span>
                  </label>
                </div>`;
    }

    function err(m) {
        $("pageError").textContent = m;
        $("pageError").hidden = false;
        $("pageSuccess").hidden = true;
    }

    function ok(m) {
        $("pageSuccess").textContent = m;
        $("pageSuccess").hidden = false;
        $("pageError").hidden = true;
    }

    function debounce(f, t) {
        let x;
        return () => {
            clearTimeout(x);
            x = setTimeout(f, t);
        };
    }
})();
