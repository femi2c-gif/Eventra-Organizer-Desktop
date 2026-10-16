document.addEventListener("DOMContentLoaded", () => {

    if (window.EventraShell) window.EventraShell.customDatePicker = true;

    const eventSearch       = document.getElementById("eventSearch");
    const emptyEvents       = document.getElementById("emptyEvents");
    const newEventButton    = document.getElementById("newEventButton");
    const topDateButton     = document.getElementById("topDateButton");
    const dashboardDateButton = document.getElementById("dashboardDateButton");
    const eventMenu         = document.getElementById("eventMenu");
    const viewEventAction   = document.getElementById("viewEventAction");
    const editEventAction   = document.getElementById("editEventAction");
    const duplicateEventAction = document.getElementById("duplicateEventAction");
    const toast             = document.getElementById("toast");
    const toastTitle        = document.getElementById("toastTitle");
    const toastMessage      = document.getElementById("toastMessage");
    const dateRangePopover  = document.getElementById("dateRangePopover");
    const dateRangeStart    = document.getElementById("dateRangeStart");
    const dateRangeEnd      = document.getElementById("dateRangeEnd");
    const dateRangeApply    = document.getElementById("dateRangeApply");
    const dateRangeCancel   = document.getElementById("dateRangeCancel");
    const dateRangeClose    = document.getElementById("dateRangeClose");
    const datePresets       = document.querySelectorAll(".date-preset");

    let selectedEvent = "";
    let toastTimer = null;
    const dateRangeState = { start: "2026-10-01", end: "2026-10-31" };

    function showToast(title, message) {
        if (!toast) return;
        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;
        toast.classList.remove("hidden");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
    }

    function filterEvents() {
        if (!eventSearch) return;
        const search = eventSearch.value.trim().toLowerCase();
        const rows = document.querySelectorAll(".event-item");
        let visible = 0;
        rows.forEach(row => {
            const matches = search === "" || (row.dataset.event || "").includes(search);
            row.classList.toggle("hidden", !matches);
            if (matches) visible++;
        });
        if (emptyEvents) emptyEvents.classList.toggle("hidden", visible !== 0);
    }

    if (eventSearch) eventSearch.addEventListener("input", filterEvents);

    if (newEventButton) {
        newEventButton.addEventListener("click", () => {
            [
              "eventra_organizer_create_event_draft", "eventra_create_event_draft",
              "eventra_event_draft", "eventra_create_event", "eventra_event_data",
              "eventra_step1_draft", "eventra_step2_draft", "eventra_step3_draft",
              "eventra_step1", "eventra_step2", "eventra_step3", "eventra_step4",
              "eventra_published_event", "eventra_created_event", "eventra_selected_event",
              "eventra_selected_event_id", "createEventDraft"
            ].forEach(key => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
            window.location.href = "../03_Create Event/index.html";
        });
    }

    document.querySelectorAll(".manage-event-btn").forEach(button => {
        button.addEventListener("click", () => {
            showToast("Manage Event", `Opening ${button.dataset.eventName || "Event"}.`);
        });
    });

    function positionMenu(button) {
        if (!eventMenu) return;
        const rect = button.getBoundingClientRect();
        const w = 190, h = 160;
        let left = Math.min(Math.max(rect.right - w, 10), window.innerWidth - w - 10);
        let top = rect.bottom + 8;
        if (top > window.innerHeight - h - 10) top = rect.top - h - 8;
        eventMenu.style.left = `${Math.max(10, left)}px`;
        eventMenu.style.top = `${Math.max(10, top)}px`;
        eventMenu.classList.remove("hidden");
    }

    document.querySelectorAll(".event-menu-btn").forEach(button => {
        button.addEventListener("click", e => {
            e.stopPropagation();
            selectedEvent = button.dataset.eventName || "";
            positionMenu(button);
        });
    });

    document.addEventListener("click", e => {
        if (eventMenu && !eventMenu.contains(e.target) && !e.target.closest(".event-menu-btn")) {
            eventMenu.classList.add("hidden");
        }
    });

    if (viewEventAction) {
        viewEventAction.addEventListener("click", () => {
            eventMenu?.classList.add("hidden");
            showToast("View Event", `Viewing ${selectedEvent}.`);
        });
    }

    if (editEventAction) {
        editEventAction.addEventListener("click", () => {
            eventMenu?.classList.add("hidden");
            showToast("Edit Event", `Editing ${selectedEvent}.`);
        });
    }

    if (duplicateEventAction) {
        duplicateEventAction.addEventListener("click", () => {
            eventMenu?.classList.add("hidden");
            showToast("Duplicate Event", `${selectedEvent} selected for duplication.`);
        });
    }

    function formatDateLabel(value) {
        if (!value) return "";
        return new Date(`${value}T00:00:00`).toLocaleDateString("en-NG", {
            month: "short", day: "numeric", year: "numeric"
        });
    }

    function setDateInputs(start, end) {
        if (dateRangeStart) dateRangeStart.value = start;
        if (dateRangeEnd) dateRangeEnd.value = end;
    }

    function updateDateButtons(start, end) {
        const label = `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
        document.querySelectorAll(".date-range-label").forEach(el => el.textContent = label);
    }

    function positionDatePopover(button) {
        if (!dateRangePopover || !button) return;
        if (window.innerWidth <= 520) {
            dateRangePopover.style.left = "10px";
            dateRangePopover.style.top = "74px";
            return;
        }
        const rect = button.getBoundingClientRect();
        const pw = Math.min(390, window.innerWidth - 24);
        let left = Math.max(12, Math.min(rect.left, window.innerWidth - pw - 12));
        let top = rect.bottom + 10;
        if (top + 340 > window.innerHeight - 12) top = Math.max(12, rect.top - 340 - 10);
        dateRangePopover.style.left = `${left}px`;
        dateRangePopover.style.top = `${top}px`;
    }

    function openDateRange(button) {
        if (!dateRangePopover) return;
        setDateInputs(dateRangeState.start, dateRangeState.end);
        positionDatePopover(button);
        dateRangePopover.classList.add("open");
        dateRangePopover.setAttribute("aria-hidden", "false");
    }

    function closeDateRange() {
        if (!dateRangePopover) return;
        dateRangePopover.classList.remove("open");
        dateRangePopover.setAttribute("aria-hidden", "true");
    }

    if (topDateButton) {
        topDateButton.addEventListener("click", e => { e.stopPropagation(); openDateRange(topDateButton); });
    }

    if (dashboardDateButton) {
        dashboardDateButton.addEventListener("click", e => { e.stopPropagation(); openDateRange(dashboardDateButton); });
    }

    datePresets.forEach(button => {
        button.addEventListener("click", () => {
            datePresets.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            const range = button.dataset.range;
            const today = new Date();
            let start = new Date(today), end = new Date(today);
            if (range === "today") { start = new Date(today); end = new Date(today); }
            if (range === "7days") start.setDate(today.getDate() - 6);
            if (range === "30days") start.setDate(today.getDate() - 29);
            if (range === "month") {
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }
            const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            setDateInputs(fmt(start), fmt(end));
        });
    });

    if (dateRangeApply) {
        dateRangeApply.addEventListener("click", () => {
            const start = dateRangeStart?.value || "";
            const end = dateRangeEnd?.value || "";
            if (!start || !end) { showToast("Date Range", "Please select both start and end dates."); return; }
            if (start > end) { showToast("Date Range", "End date must be after the start date."); return; }
            dateRangeState.start = start;
            dateRangeState.end = end;
            updateDateButtons(start, end);
            closeDateRange();
            showToast("Date Range Updated", `${formatDateLabel(start)} – ${formatDateLabel(end)}`);
        });
    }

    if (dateRangeCancel) dateRangeCancel.addEventListener("click", closeDateRange);
    if (dateRangeClose) dateRangeClose.addEventListener("click", closeDateRange);

    document.addEventListener("click", e => {
        if (
            dateRangePopover &&
            dateRangePopover.classList.contains("open") &&
            !dateRangePopover.contains(e.target) &&
            !e.target.closest("#topDateButton") &&
            !e.target.closest("#dashboardDateButton")
        ) closeDateRange();
    });

    function closeMobileMenu() {}

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeMobileMenu();
        if (dateRangePopover && dateRangePopover.classList.contains("open")) {
            positionDatePopover(window.innerWidth <= 768 ? dashboardDateButton : topDateButton);
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeMobileMenu();
            closeDateRange();
            eventMenu?.classList.add("hidden");
        }
    });

    document.querySelectorAll(".chart-bar").forEach((bar, i) => {
        bar.style.cursor = "pointer";
        bar.addEventListener("click", () => showToast("Ticket Sales", `Month ${i + 1} selected.`));
    });

    document.querySelectorAll(".dashboard-card button").forEach(button => {
        const text = button.textContent.trim();
        if (/^Week [1-5]$/.test(text)) {
            button.addEventListener("click", () => {
                document.querySelectorAll(".dashboard-card button").forEach(item => {
                    if (/^Week [1-5]$/.test(item.textContent.trim())) {
                        item.classList.remove("bg-[#F1EDFF]", "text-eventraPurple", "font-semibold");
                        item.classList.add("bg-[#F7F9FD]", "text-slate-600", "font-medium");
                    }
                });
                button.classList.remove("bg-[#F7F9FD]", "text-slate-600", "font-medium");
                button.classList.add("bg-[#F1EDFF]", "text-eventraPurple", "font-semibold");
                showToast("Weekly Overview", `${text} selected.`);
            });
        }
    });

    setDateInputs(dateRangeState.start, dateRangeState.end);
    updateDateButtons(dateRangeState.start, dateRangeState.end);
    filterEvents();

    const BASE = "https://eventra-backend-aidf.onrender.com/api";

    function getToken() {
        return localStorage.getItem("eventra_access_token") ||
               localStorage.getItem("eventra_token") ||
               sessionStorage.getItem("eventra_access_token") ||
               sessionStorage.getItem("eventra_token") || null;
    }

    function el(id) { return document.getElementById(id); }

    function setEl(id, text) {
        const node = el(id);
        if (node) node.textContent = text;
    }

    function formatNaira(amount) {
        const n = Number(amount) || 0;
        if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
        if (n >= 1_000)     return "₦" + (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "K";
        return "₦" + n.toLocaleString("en-NG");
    }

    function formatEventDate(dateStr) {
        if (!dateStr) return "";
        // Date-only API values must be parsed as local calendar dates, not UTC timestamps.
        const match = String(dateStr).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
        const date = match
            ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
            : new Date(dateStr);
        if (Number.isNaN(date.getTime())) return String(dateStr);
        return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
    }

    function extractEvents(payload) {
        if (Array.isArray(payload)) return payload;
        // The API has returned event arrays under different wrappers across endpoints.
        const candidates = [
            payload?.events,
            payload?.data?.events,
            payload?.results,
            payload?.data?.results,
            payload?.data?.data,
            payload?.data,
            payload?.items,
            payload?.data?.items
        ];
        for (const candidate of candidates) {
            if (Array.isArray(candidate)) return candidate;
        }
        return [];
    }

    async function fetchEventList(url, headers) {
        const response = await fetch(url, {
            headers,
            cache: "no-store"
        });
        if (!response.ok) return { ok: false, events: [] };
        const payload = await response.json();
        return { ok: true, events: extractEvents(payload), payload };
    }

    function statusBadge(status) {
        const map = {
            published: { label: "Live",      cls: "bg-emerald-100 text-emerald-700" },
            draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600" },
            cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
            completed: { label: "Ended",     cls: "bg-blue-100 text-blue-700" },
        };
        const s = map[status] || { label: status || "—", cls: "bg-slate-100 text-slate-600" };
        return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}">${s.label}</span>`;
    }

    function renderChangeIndicator(id, change) {
        const node = el(id);
        if (!node) return;
        if (!change) {
            node.textContent = "No change data yet";
            return;
        }
        const sign = change > 0 ? "+" : "";
        node.textContent = `${sign}${Number(change).toFixed(1)}% from last period`;
        node.className = node.className
            .replace(/text-(slate-400|emerald-600|red-500)/g, change > 0 ? "text-emerald-600" : "text-red-500");
    }

    function renderAttendanceDonut(confirmed, total) {
        const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
        const deg = Math.round((pct / 100) * 360);
        setEl("donutPercent", pct + "%");
        setEl("confirmedCount", confirmed.toLocaleString("en-NG"));
        setEl("pendingCount", (total - confirmed).toLocaleString("en-NG"));
        const donut = el("attendanceDonut");
        if (donut) donut.style.background = `conic-gradient(#6d28ff 0deg ${deg}deg, #e3ebfa ${deg}deg 360deg)`;
    }

    function renderDashboardChart(labels, data) {
        const barsEl   = el("dashboardChartBars");
        const labelsEl = el("dashboardChartLabels");
        if (!barsEl || !labels?.length) return;

        const maxVal = Math.max(...data, 1);
        const yFmt = v => v >= 1_000_000 ? "₦" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
                        : v >= 1_000     ? "₦" + (v / 1_000).toFixed(0) + "K"
                        : "₦" + v;

        setEl("yAxisMax", yFmt(maxVal));
        setEl("yAxis75",  yFmt(Math.round(maxVal * 0.75)));
        setEl("yAxis50",  yFmt(Math.round(maxVal * 0.5)));
        setEl("yAxis25",  yFmt(Math.round(maxVal * 0.25)));

        barsEl.querySelectorAll(".chart-bar").forEach(b => b.remove());

        labels.forEach((label, i) => {
            const rev = data[i] || 0;
            const pct = Math.max(2, Math.round((rev / maxVal) * 100));
            const bar = document.createElement("div");
            bar.className = "chart-bar w-8 rounded-t-md bg-eventraPurple z-10";
            bar.style.height = pct + "%";
            bar.title = `${label}: ${yFmt(rev)}`;
            bar.dataset.label = label;
            bar.dataset.revenue = rev;
            barsEl.appendChild(bar);
        });

        if (labelsEl) {
            labelsEl.innerHTML = labels.map(l => `<span class="text-[12px]">${l}</span>`).join("");
        }
    }

    function renderEvents(events) {
        const list  = el("eventsList");
        const empty = el("emptyEvents");
        if (!list) return;

        if (!events?.length) {
            list.innerHTML = "";
            empty?.classList.remove("hidden");
            return;
        }

        empty?.classList.add("hidden");

        list.innerHTML = events.map(ev => {
            const title    = ev.title || "Untitled Event";
            const date     = formatEventDate(ev.start_date);
            const venue    = ev.venue_name || ev.venue_address || "";
            const cap      = ev.capacity || 0;
            const sold     = (ev.TicketTypes || []).reduce((s, t) => s + ((t.quantity || 0) - (t.available || 0)), 0);
            const img      = ev.event_image_url || "";
            const badge    = statusBadge(ev.status);
            const category = ev.category || "";
            const href     = `../09_Check-in%20Dashboard/index.html?event=${ev.id}`;

            return `<a href="${href}" class="event-row event-item flex items-center justify-between gap-5 rounded-xl bg-[#F7F9FD] p-4 mb-4 hover:bg-[#EEF2FF] transition-colors" data-event="${title.toLowerCase()}">
  <div class="flex items-center gap-4 min-w-0">
    <img src="${img}" alt="${title}" class="w-[66px] h-[66px] rounded-xl object-cover shrink-0 bg-[#EEF2FF]" onerror="this.onerror=null;this.style.background='#EEF2FF';this.removeAttribute('src')">
    <div class="min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <h4 class="font-semibold text-eventraText text-[15px] truncate max-w-[220px]">${title}</h4>
        ${badge}
      </div>
      <p class="secondary-text text-slate-500 mt-0.5 truncate">${date}${venue ? " · " + venue : ""}</p>
      <p class="secondary-text text-slate-400 mt-0.5">${sold} / ${cap} tickets${category ? " · " + category : ""}</p>
    </div>
  </div>
  <div class="flex items-center gap-2 shrink-0">
    <span class="manage-event-btn rounded-xl bg-eventraPurple text-white text-[13px] font-semibold px-4 py-2 whitespace-nowrap">Manage</span>
    <button class="event-menu-btn w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-lg" data-event-name="${title}" aria-label="${title} options">⋮</button>
  </div>
</a>`;
        }).join("");

        list.querySelectorAll(".event-menu-btn").forEach(button => {
            button.addEventListener("click", e => {
                e.stopPropagation();
                e.preventDefault();
                selectedEvent = button.dataset.eventName || "";
                positionMenu(button);
            });
        });
    }

    function initializeEmptyDashboard() {
        setEl("statTotalEvents", "0");
        setEl("statTicketsSold", "0");
        setEl("statRevenue", "₦0");
        setEl("statAttendanceRate", "0%");
        setEl("statChangeEvents", "No events yet");
        setEl("statChangeTickets", "No ticket sales yet");
        setEl("statChangeRevenue", "No revenue yet");
        renderAttendanceDonut(0, 0);
        setEl("yAxisMax", "₦0");
        setEl("yAxis75", "₦0");
        setEl("yAxis50", "₦0");
        setEl("yAxis25", "₦0");
        const bars = el("dashboardChartBars");
        if (bars) bars.querySelectorAll(".chart-bar").forEach(bar => bar.remove());
        const labels = el("dashboardChartLabels");
        if (labels) labels.innerHTML = "";
        renderEvents([]);
    }

    async function loadDashboard() {
        initializeEmptyDashboard();
        const token = getToken();
        if (!token) return;

        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        try {
            const [organizerEventsResult, analyticsRes] = await Promise.all([
                fetchEventList(`${BASE}/organizer/events`, headers),
                fetch(`${BASE}/organizer/analytics`, { headers, cache: "no-store" })
            ]);

            let events = organizerEventsResult.events;
            // Some deployed backend versions expose the authenticated organizer's event
            // list through /events rather than /organizer/events. Try that endpoint when
            // the first route returns an empty list, so a newly created event is not missed.
            if (!events.length) {
                try {
                    const fallback = await fetchEventList(`${BASE}/events?page=1&limit=100`, headers);
                    if (fallback.ok && fallback.events.length) {
                        const userRaw = localStorage.getItem("eventra_user") ||
                                         sessionStorage.getItem("eventra_user");
                        let user = {};
                        try { user = userRaw ? JSON.parse(userRaw) : {}; } catch (_) {}
                        const organizerId = user.id || user.user_id || user.organizer_id;
                        const owned = organizerId
                            ? fallback.events.filter(ev => {
                                const ownerId = ev.organizer_id || ev.organizerId ||
                                                ev.user_id || ev.userId ||
                                                ev.organizer?.id || ev.user?.id;
                                return ownerId == null || String(ownerId) === String(organizerId);
                              })
                            : fallback.events;
                        events = owned;
                    }
                } catch (fallbackError) {
                    console.warn("Fallback event list request failed:", fallbackError);
                }
            }

            setEl("statTotalEvents", events.length);
            const sold = events.reduce((sum, ev) => {
                const tiers = ev.TicketTypes || ev.ticket_types || ev.ticketTypes || [];
                return sum + tiers.reduce((subtotal, tier) => {
                    const quantity = Number(tier.quantity || tier.total_quantity || 0);
                    const available = Number(tier.available ?? tier.available_quantity ?? quantity);
                    return subtotal + Math.max(0, quantity - available);
                }, 0);
            }, 0);
            setEl("statTicketsSold", sold.toLocaleString("en-NG"));
            renderEvents(events);
            filterEvents();

            if (analyticsRes.ok) {
                const analyticsPayload = await analyticsRes.json();
                const a = analyticsPayload?.data || analyticsPayload || {};
                if (a.total_revenue != null) setEl("statRevenue", formatNaira(a.total_revenue));
                setEl("statAttendanceRate", (Number(a.conversion_rate) || 0).toFixed(1) + "%");
                renderChangeIndicator("statChangeRevenue", a.revenue_change ?? null);
                renderChangeIndicator("statChangeTickets",  a.bookings_change ?? null);
                renderChangeIndicator("statChangeEvents",   null);
                renderAttendanceDonut(Number(a.confirmed_bookings) || 0, Number(a.total_bookings) || 0);
                if (Array.isArray(a.revenue_labels) && Array.isArray(a.revenue_data)) {
                    renderDashboardChart(a.revenue_labels, a.revenue_data);
                }
            }
        } catch (err) {
            console.warn("Dashboard API error:", err);
        }
    }

    loadDashboard();

});
