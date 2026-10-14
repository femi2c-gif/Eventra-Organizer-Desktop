
"use strict";

/* =========================================================
   EVENTRA ORGANIZER — SCREEN 08
   ATTENDEES MANAGEMENT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "https://eventra-backend-aidf.onrender.com/api";
  const PAGE_SIZE = 7;

  const $ = (id) => document.getElementById(id);

  const state = {
    events: [],
    attendees: [],
    filtered: [],
    currentPage: 1,
    activeFilter: "all",
    search: "",
    selectedEventId: "",
    loading: false,
    requestVersion: 0
  };

  let toastTimer = null;
  let activeMenuAttendee = null;

  const elements = {
    search: $("attendeeSearch"),
    eventSelect: $("eventSelect"),
    tableBody: $("attendeeTableBody"),
    mobileList: $("mobileAttendeeList"),
    loading: $("loadingState"),
    error: $("errorState"),
    errorMessage: $("errorMessage"),
    empty: $("emptyState"),
    emptyDescription: $("emptyDescription"),
    footer: $("tableFooter"),
    showing: $("showingText"),
    pagination: $("pagination"),
    actionMenu: $("actionMenu"),
    toast: $("toast")
  };

  /* ---------------------------------------------------------
     GENERAL HELPERS
  --------------------------------------------------------- */

  function safeJson(value, fallback = null) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function getStoredUser() {
    return (
      safeJson(localStorage.getItem("eventra_user")) ||
      safeJson(localStorage.getItem("user")) ||
      safeJson(sessionStorage.getItem("eventra_user")) ||
      {}
    );
  }

  function getToken() {
    return (
      localStorage.getItem("eventra_access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("eventra_token") ||
      sessionStorage.getItem("eventra_access_token") ||
      sessionStorage.getItem("access_token") ||
      ""
    );
  }

  function getInitialEventId() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("eventId") ||
      params.get("event_id") ||
      sessionStorage.getItem("eventra_selected_event_id") ||
      localStorage.getItem("eventra_selected_event_id") ||
      ""
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return entities[character];
    });
  }

  function firstValue(objects, keys, fallback = "") {
    for (const object of objects) {
      if (!object || typeof object !== "object") continue;

      for (const key of keys) {
        const value = object[key];

        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          return value;
        }
      }
    }

    return fallback;
  }

  function unwrapPayload(payload) {
    if (!payload || typeof payload !== "object") return payload;
    return payload.data ?? payload.result ?? payload;
  }

  function extractArray(payload, possibleKeys) {
    if (Array.isArray(payload)) return payload;

    const candidates = [
      payload,
      payload?.data,
      payload?.result,
      payload?.data?.data,
      payload?.result?.data
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;

      if (!candidate || typeof candidate !== "object") continue;

      for (const key of possibleKeys) {
        if (Array.isArray(candidate[key])) return candidate[key];
      }
    }

    return [];
  }

  async function apiRequest(path, options = {}) {
    const token = getToken();
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text || "The server returned an invalid response." };
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}.`;

      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove("hidden");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.add("hidden");
    }, 3200);
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    elements.loading.classList.toggle("hidden", !isLoading);

    if (isLoading) {
      elements.error.classList.add("hidden");
      elements.empty.classList.add("hidden");
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-12 text-center text-[15px] text-slate-500">
            Loading attendee records…
          </td>
        </tr>`;
      elements.mobileList.innerHTML = "";
    }
  }

  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.error.classList.remove("hidden");
    elements.empty.classList.add("hidden");
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-10 text-center text-[15px] text-slate-500">
          Unable to load attendee records.
        </td>
      </tr>`;
    elements.mobileList.innerHTML = "";
    elements.footer.classList.add("hidden");
  }

  function hideError() {
    elements.error.classList.add("hidden");
    elements.footer.classList.remove("hidden");
  }

  function normalizeEvent(event) {
    const source = event || {};

    return {
      id: String(
        firstValue([source], ["id", "event_id", "eventId"], "")
      ),
      title: String(
        firstValue([source], ["title", "name", "event_name"], "Untitled event")
      ),
      venue: String(
        firstValue(
          [source],
          ["venue_name", "venue", "location", "venue_address"],
          ""
        )
      ),
      date: firstValue(
        [source],
        ["start_date", "event_date", "date", "startDate"],
        ""
      )
    };
  }

  function normalizeAttendee(item, index, event = null) {
    const source = item || {};
    const ticket =
      source.Ticket ||
      source.ticket ||
      source.ticket_type ||
      source.TicketType ||
      source.Ticket_Type ||
      {};

    const user =
      source.User ||
      source.user ||
      source.attendee ||
      source.Attendee ||
      source.customer ||
      {};

    const booking =
      source.Booking ||
      source.booking ||
      source.order ||
      {};

    const fullName = firstValue(
      [source, user, booking],
      [
        "attendee_name",
        "full_name",
        "fullName",
        "name",
        "customer_name",
        "user_name"
      ],
      ""
    );

    const firstName = firstValue([source, user], ["first_name", "firstName"], "");
    const lastName = firstValue([source, user], ["last_name", "lastName"], "");

    const combinedName = [firstName, lastName].filter(Boolean).join(" ");

    const email = firstValue(
      [source, user, booking],
      ["email", "attendee_email", "customer_email"],
      ""
    );

    const ticketName = firstValue(
      [source, ticket],
      ["ticket_type_name", "ticketTypeName", "ticket_type", "type", "name"],
      firstValue([ticket], ["title"], "General Admission")
    );

    const rawStatus = String(
      firstValue(
        [source, ticket],
        ["status", "ticket_status", "booking_status"],
        "valid"
      )
    ).toLowerCase();

    const checkInValue = firstValue(
      [source, ticket],
      [
        "checked_in_at",
        "check_in_time",
        "checkin_time",
        "check_in_timestamp",
        "checkedInAt"
      ],
      ""
    );

    const explicitlyChecked = firstValue(
      [source, ticket],
      ["checked_in", "is_checked_in", "isCheckedIn", "checkedIn"],
      null
    );

    const checkedIn =
      Boolean(checkInValue) ||
      explicitlyChecked === true ||
      explicitlyChecked === 1 ||
      ["checked-in", "checked_in", "used", "checked"].includes(rawStatus);

    const orderId = String(
      firstValue(
        [source, booking],
        ["order_id", "orderId", "booking_id", "bookingId", "reference"],
        ""
      )
    );

    const ticketCode = String(
      firstValue([source, ticket], ["ticket_code", "ticketCode", "code"], "")
    );

    const id = String(
      firstValue(
        [source, ticket],
        ["id", "ticket_id", "ticketId", "attendee_id", "attendeeId"],
        `${orderId || "attendee"}-${index}`
      )
    );

    return {
      id,
      name: String(fullName || combinedName || email || "Attendee"),
      email: String(email || "Email not provided"),
      orderId: orderId || ticketCode || "—",
      ticketCode,
      ticketType: String(ticketName),
      status: rawStatus.includes("invalid")
        ? "invalid"
        : rawStatus.includes("cancel")
        ? "cancelled"
        : rawStatus.includes("refund")
        ? "refunded"
        : "valid",
      checkedIn,
      checkedInAt: checkInValue,
      eventId: String(
        firstValue(
          [source, ticket, booking],
          ["event_id", "eventId"],
          event?.id || ""
        )
      ),
      eventTitle: event?.title || "",
      original: source
    };
  }

  function normalizeEventsResponse(payload) {
    const rawEvents = extractArray(payload, [
      "events",
      "organizer_events",
      "items",
      "rows"
    ]);

    return rawEvents.map(normalizeEvent).filter((event) => event.id);
  }

  function normalizeAttendeesResponse(payload, event) {
    const rawAttendees = extractArray(payload, [
      "attendees",
      "tickets",
      "items",
      "rows",
      "results"
    ]);

    return rawAttendees.map((item, index) =>
      normalizeAttendee(item, index, event)
    );
  }

  /* ---------------------------------------------------------
     ORGANIZER HEADER
  --------------------------------------------------------- */

  function renderOrganizerDetails() {
    const user = getStoredUser();

    const name = firstValue(
      [user],
      ["organization_name", "organizer_name", "business_name", "name", "full_name"],
      "Apex Live Events"
    );

    const email = firstValue(
      [user],
      ["email", "organizer_email"],
      "organizer@eventra.io"
    );

    if (window.EventraShell) window.EventraShell.setOrganizer(name, email);
  }

  /* ---------------------------------------------------------
     LOAD EVENTS AND ATTENDEES
  --------------------------------------------------------- */

  async function loadEvents() {
    const payload = await apiRequest("/organizer/events");
    const events = normalizeEventsResponse(payload);

    state.events = events;
    renderEventOptions();

    return events;
  }

  function renderEventOptions() {
    const previousValue = state.selectedEventId;
    const initialId = getInitialEventId();

    elements.eventSelect.innerHTML = `
      <option value="">All available events</option>
      ${state.events.map((event) => `
        <option value="${escapeHtml(event.id)}">${escapeHtml(event.title)}</option>
      `).join("")}
    `;

    const preferredId = previousValue || initialId;

    if (preferredId && state.events.some((event) => event.id === preferredId)) {
      state.selectedEventId = preferredId;
      elements.eventSelect.value = preferredId;
    } else {
      state.selectedEventId = "";
      elements.eventSelect.value = "";
    }

    updateEventHeading();
  }

  function updateEventHeading() {
    const selected = state.events.find(
      (event) => event.id === state.selectedEventId
    );

    if (selected) {
      $("eventTitle").textContent = selected.title;
      $("eventContext").textContent = selected.venue
        ? `${selected.title} • ${selected.venue}`
        : selected.title;
      return;
    }

    $("eventTitle").textContent = "All Events";
    $("eventContext").textContent =
      state.events.length > 0
        ? `${state.events.length} event${state.events.length === 1 ? "" : "s"} available`
        : "Organizer event attendees";
  }

  async function fetchAttendeesForEvent(event) {
    const payload = await apiRequest(
      `/organizer/${encodeURIComponent(event.id)}/bookings?page=1&limit=100`
    );

    return normalizeAttendeesResponse(payload, event);
  }

  async function loadAttendees() {
    const requestVersion = ++state.requestVersion;
    setLoading(true);
    hideError();

    try {
      if (!state.events.length) {
        await loadEvents();
      }

      if (requestVersion !== state.requestVersion) return;

      let selectedEvents = state.selectedEventId
        ? state.events.filter((event) => event.id === state.selectedEventId)
        : state.events;

      if (!selectedEvents.length) {
        state.attendees = [];
        state.filtered = [];
        renderAll();
        setLoading(false);
        showToast("No events are available for this organizer account.");
        return;
      }

      const results = await Promise.allSettled(
        selectedEvents.map((event) => fetchAttendeesForEvent(event))
      );

      if (requestVersion !== state.requestVersion) return;

      const loaded = [];
      const failedEvents = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          loaded.push(...result.value);
        } else {
          failedEvents.push(selectedEvents[index].title);
        }
      });

      state.attendees = deduplicateAttendees(loaded);
      state.currentPage = 1;
      applyFilters();
      setLoading(false);

      if (failedEvents.length && state.attendees.length === 0) {
        showError(
          "The attendee endpoint could not return records. Check that you are signed in as an organizer and that the selected event belongs to your account."
        );
        return;
      }

      if (failedEvents.length) {
        showToast("Some event attendee lists could not be loaded.");
      }

      renderAll();
    } catch (error) {
      if (requestVersion !== state.requestVersion) return;

      setLoading(false);
      showError(
        error.status === 401
          ? "Your session may have expired. Sign in again, then return to Attendees."
          : error.message || "Check your connection and try again."
      );
    }
  }

  function deduplicateAttendees(attendees) {
    const seen = new Set();

    return attendees.filter((attendee) => {
      const key =
        attendee.id ||
        `${attendee.email}-${attendee.orderId}-${attendee.ticketCode}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /* ---------------------------------------------------------
     SEARCH, FILTERS AND COUNTS
  --------------------------------------------------------- */

  function applyFilters() {
    const search = state.search.trim().toLowerCase();

    state.filtered = state.attendees.filter((attendee) => {
      const matchesSearch =
        !search ||
        attendee.name.toLowerCase().includes(search) ||
        attendee.email.toLowerCase().includes(search) ||
        attendee.orderId.toLowerCase().includes(search) ||
        attendee.ticketCode.toLowerCase().includes(search) ||
        attendee.ticketType.toLowerCase().includes(search);

      const matchesFilter =
        state.activeFilter === "all" ||
        (state.activeFilter === "valid" && attendee.status === "valid") ||
        (state.activeFilter === "checked" && attendee.checkedIn) ||
        (state.activeFilter === "notchecked" && !attendee.checkedIn);

      return matchesSearch && matchesFilter;
    });

    const pageCount = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    state.currentPage = Math.min(state.currentPage, pageCount);
    renderCounts();
  }

  function renderCounts() {
    const total = state.attendees.length;
    const checked = state.attendees.filter((item) => item.checkedIn).length;
    const valid = state.attendees.filter((item) => item.status === "valid").length;
    const notChecked = total - checked;
    const rate = total ? Math.round((checked / total) * 100) : 0;

    $("checkedInCount").textContent = checked.toLocaleString();
    $("totalCountTop").textContent = total.toLocaleString();
    $("checkedInRate").textContent = rate;

    $("allCount").textContent = total.toLocaleString();
    $("validCount").textContent = valid.toLocaleString();
    $("checkedCount").textContent = checked.toLocaleString();
    $("notCheckedCount").textContent = notChecked.toLocaleString();

    document.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === state.activeFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  /* ---------------------------------------------------------
     ATTENDEE STATUS AND AVATARS
  --------------------------------------------------------- */

  function getInitials(name) {
    const parts = String(name || "A").trim().split(/\s+/).filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function avatarClass(name) {
    const palette = [
      "bg-[#E8DDFF] text-[#6426E8]",
      "bg-[#DDE5FF] text-[#344A9A]",
      "bg-[#FFE0BB] text-[#84510A]",
      "bg-[#D9F5E9] text-[#087F5B]",
      "bg-[#E6E9F5] text-[#334155]"
    ];

    let hash = 0;
    for (const character of String(name)) {
      hash = (hash + character.charCodeAt(0)) % palette.length;
    }

    return palette[hash];
  }

  function statusMarkup(status) {
    if (status === "invalid") {
      return `<span class="status-pill bg-rose-100 text-rose-700">Invalid</span>`;
    }

    if (status === "cancelled") {
      return `<span class="status-pill bg-slate-100 text-slate-600">Cancelled</span>`;
    }

    if (status === "refunded") {
      return `<span class="status-pill bg-amber-100 text-amber-800">Refunded</span>`;
    }

    return `
      <span class="status-pill status-valid">
        <span class="h-1.5 w-1.5 rounded-full bg-eventra"></span> Valid
      </span>`;
  }

  function checkInMarkup(attendee) {
    if (attendee.checkedIn) {
      return `
        <span class="status-pill status-checked">
          <span class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-eventra text-white">
            <i data-lucide="check" class="h-2.5 w-2.5"></i>
          </span>
          Checked-in
        </span>`;
    }

    return `
      <span class="status-pill status-pending">
        <i data-lucide="clock-3" class="h-3.5 w-3.5"></i>
        Not checked
      </span>`;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  /* ---------------------------------------------------------
     DESKTOP TABLE
  --------------------------------------------------------- */

  function renderTable() {
    const start = (state.currentPage - 1) * PAGE_SIZE;
    const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

    if (!pageItems.length) {
      elements.tableBody.innerHTML = "";
      return;
    }

    elements.tableBody.innerHTML = pageItems.map((attendee) => `
      <tr class="attendee-row">
        <td class="px-4 py-3.5">
          <div class="flex min-w-[200px] items-center gap-3">
            <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarClass(attendee.name)}">
              ${escapeHtml(getInitials(attendee.name))}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-[14px] font-semibold text-ink">${escapeHtml(attendee.name)}</span>
              <span class="mt-0.5 block max-w-[210px] truncate text-[12px] text-slate-500">${escapeHtml(attendee.email)}</span>
            </span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-[12px] font-medium text-slate-500">${escapeHtml(attendee.orderId)}</td>
        <td class="px-4 py-3.5">
          <span class="inline-flex rounded-md bg-[#E6EEFF] px-2.5 py-1 text-[12px] font-semibold text-[#33445D]">${escapeHtml(attendee.ticketType)}</span>
        </td>
        <td class="px-4 py-3.5">${statusMarkup(attendee.status)}</td>
        <td class="px-4 py-3.5">${checkInMarkup(attendee)}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center justify-center gap-1">
            <button type="button" data-action="view" data-attendee-id="${escapeHtml(attendee.id)}"
              class="rounded-lg p-2 text-slate-600 hover:bg-[#EEF2FF] hover:text-eventra"
              aria-label="View ${escapeHtml(attendee.name)}" title="View attendee">
              <i data-lucide="contact-round" class="h-[18px] w-[18px]"></i>
            </button>
            <button type="button" data-action="menu" data-attendee-id="${escapeHtml(attendee.id)}"
              class="rounded-lg p-2 text-slate-600 hover:bg-[#EEF2FF] hover:text-eventra"
              aria-label="More actions for ${escapeHtml(attendee.name)}" title="More actions">
              <i data-lucide="ellipsis-vertical" class="h-[18px] w-[18px]"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  /* ---------------------------------------------------------
     MOBILE CARDS
  --------------------------------------------------------- */

  function renderMobileCards() {
    const start = (state.currentPage - 1) * PAGE_SIZE;
    const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

    elements.mobileList.innerHTML = pageItems.map((attendee) => `
      <article class="rounded-xl border border-slate-100 bg-white p-4">
        <div class="flex items-start gap-3">
          <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarClass(attendee.name)}">
            ${escapeHtml(getInitials(attendee.name))}
          </span>
          <div class="min-w-0 flex-1">
            <h3 class="break-words text-[15px] font-semibold text-ink">${escapeHtml(attendee.name)}</h3>
            <p class="mt-1 break-all text-[13px] text-slate-500">${escapeHtml(attendee.email)}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              ${statusMarkup(attendee.status)}
              ${checkInMarkup(attendee)}
            </div>
          </div>
          <button type="button" data-action="menu" data-attendee-id="${escapeHtml(attendee.id)}"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="More attendee actions">
            <i data-lucide="ellipsis-vertical" class="h-5 w-5"></i>
          </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <div class="min-w-0">
            <p class="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Ticket type</p>
            <p class="mt-1 break-words text-[14px] font-medium text-ink">${escapeHtml(attendee.ticketType)}</p>
          </div>
          <div class="min-w-0">
            <p class="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Order ID</p>
            <p class="mt-1 break-all text-[13px] font-medium text-slate-600">${escapeHtml(attendee.orderId)}</p>
          </div>
        </div>

        <button type="button" data-action="view" data-attendee-id="${escapeHtml(attendee.id)}"
          class="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#F0EBFF] px-3 py-2 text-[14px] font-semibold text-eventra hover:bg-[#E6DDFF]">
          <i data-lucide="contact-round" class="h-4 w-4"></i> View attendee
        </button>
      </article>
    `).join("");
  }

  /* ---------------------------------------------------------
     PAGINATION AND EMPTY STATE
  --------------------------------------------------------- */

  function renderPagination() {
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = total ? (state.currentPage - 1) * PAGE_SIZE + 1 : 0;
    const end = Math.min(state.currentPage * PAGE_SIZE, total);

    elements.showing.innerHTML = total
      ? `Showing <strong class="font-semibold text-ink">${start}–${end}</strong> of <strong class="font-semibold text-ink">${total.toLocaleString()}</strong> attendees`
      : "Showing 0 attendees";

    elements.pagination.innerHTML = "";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "pagination-button";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", "Previous page");
    previous.disabled = state.currentPage <= 1;
    previous.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderAll();
      }
    });
    elements.pagination.appendChild(previous);

    const pages = getPageNumbers(state.currentPage, pageCount);

    pages.forEach((page) => {
      if (page === "…") {
        const dots = document.createElement("span");
        dots.className = "px-1 text-[14px] text-slate-500";
        dots.textContent = "…";
        elements.pagination.appendChild(dots);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = `pagination-button ${page === state.currentPage ? "active" : ""}`;
      button.textContent = String(page);
      button.setAttribute("aria-label", `Page ${page}`);
      button.setAttribute("aria-current", page === state.currentPage ? "page" : "false");
      button.addEventListener("click", () => {
        state.currentPage = page;
        renderAll();
      });
      elements.pagination.appendChild(button);
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "pagination-button";
    next.textContent = "›";
    next.setAttribute("aria-label", "Next page");
    next.disabled = state.currentPage >= pageCount;
    next.addEventListener("click", () => {
      if (state.currentPage < pageCount) {
        state.currentPage++;
        renderAll();
      }
    });
    elements.pagination.appendChild(next);
  }

  function getPageNumbers(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 3) return [1, 2, 3, "…", total - 1, total];
    if (current >= total - 2) return [1, 2, "…", total - 2, total - 1, total];

    return [1, "…", current - 1, current, current + 1, "…", total];
  }

  function renderEmptyState() {
    const empty = state.filtered.length === 0;
    elements.empty.classList.toggle("hidden", !empty);
    elements.footer.classList.toggle("hidden", empty);
    elements.tableBody.closest("table").classList.toggle("hidden", empty);
    elements.mobileList.classList.toggle("hidden", empty);

    if (empty) {
      elements.emptyDescription.textContent =
        state.attendees.length === 0
          ? "No attendee records are available for this event yet."
          : "Try changing your search or filter.";
    }
  }

  function renderAll() {
    renderCounts();
    renderTable();
    renderMobileCards();
    renderPagination();
    renderEmptyState();

    if (window.lucide) window.lucide.createIcons();
  }

  /* ---------------------------------------------------------
     ACTION MENU AND ATTENDEE DETAILS
  --------------------------------------------------------- */

  function findAttendee(id) {
    return state.attendees.find((attendee) => attendee.id === id);
  }

  function closeActionMenu() {
    elements.actionMenu.classList.add("hidden");
    activeMenuAttendee = null;
  }

  function openActionMenu(button, attendee) {
    if (
      !elements.actionMenu.classList.contains("hidden") &&
      activeMenuAttendee === attendee.id
    ) {
      closeActionMenu();
      return;
    }

    activeMenuAttendee = attendee.id;

    elements.actionMenu.innerHTML = `
      <button type="button" data-menu-action="view"><i data-lucide="user-round" class="h-4 w-4"></i> View attendee</button>
      <button type="button" data-menu-action="copy-email"><i data-lucide="mail" class="h-4 w-4"></i> Copy email</button>
      <button type="button" data-menu-action="copy-ticket"><i data-lucide="copy" class="h-4 w-4"></i> Copy ticket code</button>
      <button type="button" data-menu-action="copy-order"><i data-lucide="clipboard" class="h-4 w-4"></i> Copy order ID</button>
    `;

    elements.actionMenu.classList.remove("hidden");

    const rect = button.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 190;
    const left = Math.min(
      window.innerWidth - menuWidth - 10,
      Math.max(10, rect.right - menuWidth)
    );

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - menuHeight - 6);
    }

    elements.actionMenu.style.position = "fixed";
    elements.actionMenu.style.top = `${top}px`;
    elements.actionMenu.style.left = `${left}px`;
    elements.actionMenu.style.right = "auto";

    if (window.lucide) window.lucide.createIcons();
  }

  function showAttendeeDetails(attendee) {
    const details = [
      `Name: ${attendee.name}`,
      `Email: ${attendee.email}`,
      `Order ID: ${attendee.orderId}`,
      `Ticket type: ${attendee.ticketType}`,
      `Ticket status: ${attendee.status}`,
      `Check-in: ${attendee.checkedIn ? "Checked-in" : "Not checked-in"}`,
      attendee.checkedInAt ? `Checked-in at: ${formatDate(attendee.checkedInAt)}` : ""
    ].filter(Boolean).join("\n");

    window.alert(details);
  }

  async function copyText(value, label) {
    if (!value || value === "—" || value === "Email not provided") {
      showToast(`No ${label.toLowerCase()} is available to copy.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied.`);
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = value;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";
      document.body.appendChild(temporaryInput);
      temporaryInput.select();

      try {
        document.execCommand("copy");
        showToast(`${label} copied.`);
      } catch {
        showToast("Copy failed. Please copy the value manually.");
      }

      temporaryInput.remove();
    }
  }

  document.addEventListener("click", async (event) => {
    const rowAction = event.target.closest("[data-action]");

    if (rowAction) {
      const attendee = findAttendee(rowAction.dataset.attendeeId);
      if (!attendee) return;

      const action = rowAction.dataset.action;

      if (action === "view") {
        closeActionMenu();
        showAttendeeDetails(attendee);
      }

      if (action === "menu") {
        openActionMenu(rowAction, attendee);
      }

      return;
    }

    const menuAction = event.target.closest("[data-menu-action]");

    if (menuAction && activeMenuAttendee) {
      const attendee = findAttendee(activeMenuAttendee);
      if (!attendee) return;

      const action = menuAction.dataset.menuAction;
      closeActionMenu();

      if (action === "view") showAttendeeDetails(attendee);
      if (action === "copy-email") await copyText(attendee.email, "Email");
      if (action === "copy-ticket") await copyText(attendee.ticketCode, "Ticket code");
      if (action === "copy-order") await copyText(attendee.orderId, "Order ID");

      return;
    }

    if (!event.target.closest("#actionMenu")) closeActionMenu();
  });

  window.addEventListener("scroll", closeActionMenu, true);
  window.addEventListener("resize", closeActionMenu);

  /* ---------------------------------------------------------
     CSV EXPORT
  --------------------------------------------------------- */

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!state.filtered.length) {
      showToast("There are no attendee records to export.");
      return;
    }

    const headers = [
      "Attendee Name",
      "Email",
      "Order ID",
      "Ticket Code",
      "Ticket Type",
      "Ticket Status",
      "Check-in Status",
      "Check-in Time",
      "Event"
    ];

    const rows = state.filtered.map((attendee) => [
      attendee.name,
      attendee.email,
      attendee.orderId,
      attendee.ticketCode,
      attendee.ticketType,
      attendee.status,
      attendee.checkedIn ? "Checked-in" : "Not checked-in",
      attendee.checkedInAt ? formatDate(attendee.checkedInAt) : "",
      attendee.eventTitle
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const selectedEvent = state.events.find(
      (event) => event.id === state.selectedEventId
    );

    link.href = url;
    link.download = `eventra-attendees-${slugify(selectedEvent?.title || "all-events")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast(`${state.filtered.length} attendee records exported.`);
  }

  function slugify(value) {
    return String(value || "attendees")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /* ---------------------------------------------------------
     MOBILE NAVIGATION
  --------------------------------------------------------- */

  /* The mobile drawer lives in the shared shell. */
  function closeMobileDrawer() {}

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileDrawer();
      closeActionMenu();
    }
  });

  /* ---------------------------------------------------------
     EVENT LISTENERS
  --------------------------------------------------------- */

  let searchTimer = null;

  elements.search.addEventListener("input", () => {
    state.search = elements.search.value;
    window.clearTimeout(searchTimer);

    searchTimer = window.setTimeout(() => {
      state.currentPage = 1;
      applyFilters();
      renderAll();
    }, 160);
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      state.currentPage = 1;
      applyFilters();
      renderAll();
    });
  });

  elements.eventSelect.addEventListener("change", async () => {
    state.selectedEventId = elements.eventSelect.value;
    state.currentPage = 1;
    updateEventHeading();
    await loadAttendees();
  });

  $("exportCsvButton").addEventListener("click", exportCsv);
  $("retryButton").addEventListener("click", loadAttendees);

  $("clearFiltersButton").addEventListener("click", () => {
    state.search = "";
    state.activeFilter = "all";
    state.currentPage = 1;
    elements.search.value = "";

    applyFilters();
    renderAll();
  });

  /* ---------------------------------------------------------
     INITIALIZATION
  --------------------------------------------------------- */

  async function initialize() {
    renderOrganizerDetails();

    if (window.lucide) window.lucide.createIcons();

    state.selectedEventId = getInitialEventId();

    await loadAttendees();
  }

  initialize();
});