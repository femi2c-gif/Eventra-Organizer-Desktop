
// ============================================================
// EVENTRA ORGANIZER PORTAL
// SCREEN 09 — CHECK-IN DASHBOARD
// Tailwind CSS + Vanilla JavaScript
// ============================================================

"use strict";

// ------------------------------------------------------------
// API CONFIGURATION
// ------------------------------------------------------------

const API_BASE_URL = "https://eventra-backend-aidf.onrender.com/api";

const ROUTES = {
  dashboard: "../02_Organizer%20Dashboard/index.html",
  events: "../03_Create%20Event/index.html",
  attendees: "../08_Attendees%20Management/index.html",
  checkIn: "./index.html",
  analytics: "../10_Analytics/index.html",
  settings: "../11_Settings/index.html"
};

const STORAGE_KEYS = {
  token: "eventra_token",
  accessToken: "eventra_access_token",
  user: "eventra_user",
  eventId: "eventra_selected_event_id",
  event: "eventra_selected_event",
  checkInLog: "eventra_checkin_log"
};

// ------------------------------------------------------------
// INITIAL STATE
// ------------------------------------------------------------

const state = {
  events: [],
  selectedEvent: null,
  attendees: [],
  filteredAttendees: [],
  pendingTicket: null,
  currentPage: 1,
  pageSize: 6,
  gate: "all",
  status: "all",
  search: "",
  scannerMode: "hardware",
  cameraStream: null,
  dateStart: "",
  dateEnd: "",
  busy: false
};

// These initial records provide a preview of the design.
// Live data replaces them when the API returns usable records.
const DEMO_ATTENDEES = [
  {
    id: "demo-1",
    name: "Adeyemi Bakare",
    email: "adeyemi.bakare@lagostechlead.ng",
    initials: "AB",
    ticketType: "VIP Pass",
    ticketRef: "EVT-928374",
    gate: "Gate 02",
    device: "Handheld #2",
    timestamp: "10:48:12 AM",
    operator: "Tunde Ojo",
    status: "Admitted",
    role: "VP Engineering, Paystack",
    priority: "VIP Priority",
    zone: "Zone A — VIP Lounge Row 2, Seat 14",
    meal: "Meal Voucher Attached"
  },
  {
    id: "demo-2",
    name: "Chioma Eze",
    email: "chioma.eze@designsystems.io",
    initials: "CE",
    ticketType: "Regular",
    ticketRef: "EVT-819203",
    gate: "Gate 01",
    device: "Tablet #1",
    timestamp: "10:46:50 AM",
    operator: "Funke Adeleke",
    status: "Admitted",
    role: "Product Designer",
    priority: "",
    zone: "General Admission",
    meal: "Standard Access"
  },
  {
    id: "demo-3",
    name: "Babatunde Lawal",
    email: "b.lawal@cloudafrica.co",
    initials: "BL",
    ticketType: "Keynote Speaker",
    gate: "Gate 02",
    device: "Handheld #2",
    timestamp: "10:44:05 AM",
    operator: "Tunde Ojo",
    status: "Admitted",
    role: "Keynote Speaker",
    priority: "Speaker",
    zone: "Speaker Lounge",
    meal: "Speaker Access"
  },
  {
    id: "demo-4",
    name: "Folake Solanke",
    email: "f.solanke@ventureslagos.org",
    initials: "FS",
    ticketType: "Regular",
    ticketRef: "EVT-772184",
    gate: "Gate 01",
    device: "Tablet #1",
    timestamp: "10:42:19 AM",
    operator: "Funke Adeleke",
    status: "Admitted",
    role: "Investor Relations",
    priority: "",
    zone: "General Admission",
    meal: "Standard Access"
  },
  {
    id: "demo-5",
    name: "Damilola Alabi",
    email: "damilola@fintechpulse.ng",
    initials: "DA",
    ticketType: "Exhibitor Staff",
    ticketRef: "EVT-312948",
    gate: "Gate 03",
    device: "Rig #4",
    timestamp: "10:39:44 AM",
    operator: "Emeka Nwosu",
    status: "Admitted",
    role: "Exhibitor",
    priority: "",
    zone: "Exhibition Hall",
    meal: "Exhibitor Access"
  },
  {
    id: "demo-6",
    name: "Osas Ighodaro",
    email: "osas.ighodaro@creativeguild.africa",
    initials: "OI",
    ticketType: "VIP Pass",
    ticketRef: "EVT-993810",
    gate: "Gate 02",
    device: "Handheld #2",
    timestamp: "10:35:10 AM",
    operator: "Tunde Ojo",
    status: "Admitted",
    role: "Creative Director",
    priority: "VIP Priority",
    zone: "VIP Lounge",
    meal: "VIP Access"
  }
];

// ------------------------------------------------------------
// DOM HELPERS
// ------------------------------------------------------------

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function getToken() {
  return (
    localStorage.getItem(STORAGE_KEYS.accessToken) ||
    localStorage.getItem(STORAGE_KEYS.token) ||
    ""
  );
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "{}");
  } catch {
    return {};
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function initialsFor(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("") || "EV";
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue || "");

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(dateValue = new Date()) {
  const date = new Date(dateValue);
  return date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function todayISO() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value !== undefined && value !== null) {
    element.textContent = value;
  }
}

// ------------------------------------------------------------
// API REQUEST HELPER
// ------------------------------------------------------------

async function apiRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
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
    payload = { message: text };
  }

  if (!response.ok) {
    const error = new Error(
      payload.message || `Request failed (${response.status})`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return payload.data ?? payload.result ?? payload;
}

function getEventArray(payload) {
  const root = unwrapPayload(payload);
  if (Array.isArray(root)) return root;

  const candidates = [
    root?.events,
    root?.Events,
    root?.data?.events,
    root?.data?.Events,
    payload?.events,
    payload?.data?.events
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object") return null;

  const id = event.id || event.event_id || event.eventId;
  const title = event.title || event.name || event.event_name;

  if (!id || !title) return null;

  return {
    id: String(id),
    title: String(title),
    venue: event.venue_name || event.venue || event.location || "Venue not provided",
    startDate: event.start_date || event.startDate || event.date || "",
    capacity: Number(event.capacity || event.total_capacity || 500),
    raw: event
  };
}

function normalizeAttendee(record, index = 0) {
  const name =
    record.name ||
    record.full_name ||
    [record.first_name, record.last_name].filter(Boolean).join(" ") ||
    record.attendee_name ||
    "Attendee";

  const ticket = record.Ticket || record.ticket || {};
  const ticketType = record.TicketType || record.ticket_type || ticket.TicketType || {};
  const gateValue = record.gate || record.gate_name || record.entrance || "Gate 01";
  const gate = /^gate/i.test(gateValue)
    ? gateValue.replace(/^gate\s*/i, "Gate ")
    : `Gate ${String(gateValue).padStart(2, "0")}`;

  const statusValue = String(record.status || record.check_in_status || "Admitted");
  const status = /pending/i.test(statusValue)
    ? "Pending"
    : /invalid|rejected/i.test(statusValue)
      ? "Invalid"
      : /valid|checked|admitted|success/i.test(statusValue)
        ? "Admitted"
        : statusValue;

  return {
    id: String(record.id || record.ticket_id || record.booking_id || `api-${index}`),
    name,
    email: record.email || record.attendee_email || record.user?.email || "",
    initials: initialsFor(name),
    ticketType: ticketType.name || record.ticket_type_name || record.ticketType || "Regular",
    ticketRef: record.ticket_code || record.ticket_ref || record.reference || record.code || record.id || "—",
    gate,
    device: record.device_name || record.device || record.scanner || "Scanner",
    timestamp: record.checked_in_at || record.timestamp || record.created_at
      ? formatTime(record.checked_in_at || record.timestamp || record.created_at)
      : "—",
    operator: record.operator_name || record.operator || "Organizer",
    status,
    role: record.role || "",
    priority: /vip|speaker/i.test(ticketType.name || record.ticket_type_name || "")
      ? "VIP Priority"
      : "",
    zone: record.zone || "General Admission",
    meal: record.meal || "Standard Access",
    raw: record
  };
}

// ------------------------------------------------------------
// TOAST AND MODAL
// ------------------------------------------------------------

let toastTimer;

function showToast(title, message, duration = 3500) {
  setText("toastTitle", title);
  setText("toastMessage", message);

  const toast = $("#toast");
  if (!toast) return;

  toast.classList.remove("hidden");
  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}

function openModal({
  title = "Eventra",
  description = "",
  content = "",
  actions = []
} = {}) {
  setText("modalTitle", title);
  setText("modalDescription", description);
  $("#modalContent").innerHTML = content;

  const actionsElement = $("#modalActions");
  actionsElement.replaceChildren();

  actions.forEach(action => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.className = action.className ||
      "rounded-lg bg-eventra px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-violet-700";
    button.addEventListener("click", () => {
      if (typeof action.onClick === "function") action.onClick();
      if (action.close !== false) closeModal();
    });
    actionsElement.appendChild(button);
  });

  $("#modalOverlay").classList.remove("hidden");
  $("#modalOverlay").classList.add("flex");
  $("#modalCloseButton").focus();
}

function closeModal() {
  $("#modalOverlay").classList.add("hidden");
  $("#modalOverlay").classList.remove("flex");
}

$("#modalCloseButton").addEventListener("click", closeModal);

$("#modalOverlay").addEventListener("click", event => {
  if (event.target === $("#modalOverlay")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
    closeEventDropdown();
    closeDatePopover();
    closeMobileMenu();
  }
});

/* Mobile drawer, profile, help and notifications live in the shared shell. */
function closeMobileMenu() {}

// ------------------------------------------------------------
// EVENT SELECTOR
// ------------------------------------------------------------

function openEventDropdown() {
  $("#eventDropdown").classList.remove("hidden");
  $("#eventSelectorButton").setAttribute("aria-expanded", "true");
}

function closeEventDropdown() {
  $("#eventDropdown").classList.add("hidden");
  $("#eventSelectorButton").setAttribute("aria-expanded", "false");
}

$("#eventSelectorButton").addEventListener("click", event => {
  event.stopPropagation();
  const isOpen = !$("#eventDropdown").classList.contains("hidden");
  isOpen ? closeEventDropdown() : openEventDropdown();
});

document.addEventListener("click", event => {
  if (!event.target.closest("#eventSelectorButton") &&
      !event.target.closest("#eventDropdown")) {
    closeEventDropdown();
  }
});

function selectEvent(eventRecord) {
  state.selectedEvent = eventRecord;

  setText("selectedEventTitle", eventRecord.title);
  setText("selectedEventMeta",
    [eventRecord.venue, eventRecord.startDate ? formatDate(eventRecord.startDate) : ""]
      .filter(Boolean).join(" • ")
  );

  try {
    localStorage.setItem(STORAGE_KEYS.eventId, eventRecord.id);
    localStorage.setItem(STORAGE_KEYS.event, JSON.stringify(eventRecord));
  } catch (error) {
    console.warn("Could not save selected event.", error);
  }

  closeEventDropdown();
  loadAttendanceData();
}

$$(".event-option").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.event;
    const match = state.events.find(event =>
      key === "tech"
        ? /tech conference/i.test(event.title)
        : /food|culture/i.test(event.title)
    );

    if (match) {
      selectEvent(match);
    } else {
      showToast(
        "Event not available",
        "This sample event is not available from the connected API. Select an event returned by the backend."
      );
    }
  });
});

async function loadEvents() {
  try {
    const response = await apiRequest("/events?page=1&limit=100");
    const events = getEventArray(response)
      .map(normalizeEvent)
      .filter(Boolean);

    if (!events.length) return;

    state.events = events;
    const storedId = localStorage.getItem(STORAGE_KEYS.eventId);
    let selected = events.find(event => event.id === storedId);

    if (!selected) {
      try {
        const storedEvent = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.event) || "null"
        );
        selected = events.find(event => event.id === storedEvent?.id);
      } catch {
        // Ignore malformed stored event data.
      }
    }

    if (!selected) {
      selected = events.find(event => /tech conference/i.test(event.title)) || events[0];
    }

    selectEvent(selected);
    renderEventOptions();
    setConnectionState(true, "Backend connected");
  } catch (error) {
    console.warn("Event list could not be loaded:", error.message);
    state.events = [];
    setConnectionState(false, "Preview mode");
  }
}

function renderEventOptions() {
  const dropdown = $("#eventDropdown");
  dropdown.innerHTML = `
    <p class="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Choose event</p>
  `;

  state.events.forEach(eventRecord => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "w-full rounded-lg px-3 py-3 text-left hover:bg-slate-50";
    button.innerHTML = `
      <span class="block text-[14px] font-semibold">${escapeHTML(eventRecord.title)}</span>
      <span class="block text-[12px] text-slate-500">${escapeHTML(eventRecord.venue)}</span>
    `;
    button.addEventListener("click", () => selectEvent(eventRecord));
    dropdown.appendChild(button);
  });
}

// ------------------------------------------------------------
// DATE RANGE PICKER
// ------------------------------------------------------------

/* The date range is chosen in the shared top bar (see applyDateRange below). */
function closeDatePopover() {}

function toISODate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDateLabel(start, end) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  const formatter = date => date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return `${formatter(startDate)} – ${formatter(endDate)}`;
}

window.addEventListener("eventra:daterange", event => {
  state.dateStart = event.detail.start;
  state.dateEnd = event.detail.end;
  loadAttendanceData();
});

// ------------------------------------------------------------
// CONNECTION STATE
// ------------------------------------------------------------

function setConnectionState(connected, label) {
  const badge = $("#connectionBadge");
  if (!badge) return;

  badge.className = connected
    ? "pill bg-emerald-50 text-emerald-700"
    : "pill bg-amber-50 text-amber-800";

  badge.innerHTML = connected
    ? `<span class="mr-1.5 h-2 w-2 rounded-full bg-emerald-500"></span>${escapeHTML(label || "Connected")}`
    : `<span class="mr-1.5 h-2 w-2 rounded-full bg-amber-500"></span>${escapeHTML(label || "Preview mode")}`;

  setText("footerConnectionStatus", connected
    ? "Backend connection available"
    : "Preview data — backend not connected");
}

// ------------------------------------------------------------
// ATTENDANCE API
// ------------------------------------------------------------

function getAttendanceArray(payload) {
  const root = unwrapPayload(payload);
  if (Array.isArray(root)) return root;

  const candidates = [
    root?.attendees,
    root?.tickets,
    root?.attendance,
    root?.records,
    root?.checkins,
    root?.check_ins,
    root?.data?.attendees,
    root?.data?.tickets,
    root?.data?.records,
    payload?.attendees,
    payload?.tickets,
    payload?.attendance
  ];

  return candidates.find(Array.isArray) || [];
}

async function loadAttendanceData() {
  if (!state.selectedEvent?.id) {
    renderTable();
    return;
  }

  try {
    const response = await apiRequest(
      `/organizer/${encodeURIComponent(state.selectedEvent.id)}/attendance`
    );

    const root = unwrapPayload(response);
    const records = getAttendanceArray(response);

    if (records.length) {
      state.attendees = records.map(normalizeAttendee);
      state.filteredAttendees = [...state.attendees];
      applyFilters();
      updateStatsFromApi(root, state.attendees);
      setConnectionState(true, "Live data");
      return;
    }

    if (root && typeof root === "object") {
      updateStatsFromApi(root, []);
    }

    if (!state.attendees.length) {
      state.attendees = DEMO_ATTENDEES.map(record => ({ ...record }));
      setConnectionState(true, "Stats connected");
    }

    applyFilters();
  } catch (error) {
    console.warn("Live attendance endpoint unavailable:", error.message);

    if (!state.attendees.length) {
      state.attendees = DEMO_ATTENDEES.map(record => ({ ...record }));
    }

    applyFilters();
    setConnectionState(false, "Preview mode");
  }
}

function updateStatsFromApi(data, attendees = []) {
  if (!data || typeof data !== "object") return;

  const admitted = Number(
    data.checked_in ??
    data.checkedIn ??
    data.total_admitted ??
    data.totalAdmitted ??
    data.admitted_count
  );

  const capacity = Number(
    data.capacity ??
    data.total_capacity ??
    state.selectedEvent?.capacity ??
    500
  );

  if (Number.isFinite(admitted) && admitted >= 0) {
    setText("totalAdmitted", admitted.toLocaleString("en-NG"));
    const percentage = capacity > 0 ? Math.min(100, admitted / capacity * 100) : 0;
    $("#admittedBar").style.width = `${percentage}%`;
    setText("admittedRate", `${percentage.toFixed(1)}% checked in`);
  }

  const vip = Number(data.vip_checked_in ?? data.vipCount ?? data.vip_count);
  if (Number.isFinite(vip) && vip >= 0) {
    setText("vipCount", vip.toLocaleString("en-NG"));
  }

  const regular = Number(
    data.regular_checked_in ?? data.regularCount ?? data.regular_count
  );

  if (Number.isFinite(regular) && regular >= 0) {
    setText("regularCount", regular.toLocaleString("en-NG"));
  }

  if (attendees.length) {
    const admittedCount = attendees.filter(item => item.status === "Admitted").length;
    const pendingCount = attendees.filter(item => item.status === "Pending").length;

    if (!Number.isFinite(admitted)) {
      setText("totalAdmitted", admittedCount.toLocaleString("en-NG"));
    }

    setText("reEntries", `${pendingCount} Pending`);
  }
}

// ------------------------------------------------------------
// SEARCH, FILTERS, PAGINATION
// ------------------------------------------------------------

$("#attendeeSearch").addEventListener("input", event => {
  state.search = event.target.value.trim().toLowerCase();
  state.currentPage = 1;
  applyFilters();
});

$("#gateFilter").addEventListener("change", event => {
  state.gate = event.target.value;
  state.currentPage = 1;
  applyFilters();
});

$("#statusFilter").addEventListener("change", event => {
  state.status = event.target.value;
  state.currentPage = 1;
  applyFilters();
});

$("#clearFiltersButton").addEventListener("click", () => {
  state.search = "";
  state.gate = "all";
  state.status = "all";
  state.currentPage = 1;

  $("#attendeeSearch").value = "";
  $("#gateFilter").value = "all";
  $("#statusFilter").value = "all";

  applyFilters();
});

function applyFilters() {
  state.filteredAttendees = state.attendees.filter(attendee => {
    const searchText = [
      attendee.name,
      attendee.email,
      attendee.ticketRef,
      attendee.ticketType,
      attendee.operator
    ].join(" ").toLowerCase();

    const matchesSearch = !state.search || searchText.includes(state.search);
    const matchesGate = state.gate === "all" || attendee.gate === state.gate;
    const matchesStatus = state.status === "all" || attendee.status === state.status;

    return matchesSearch && matchesGate && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(state.filteredAttendees.length / state.pageSize)
  );

  state.currentPage = Math.min(state.currentPage, totalPages);
  renderTable();
}

function statusBadge(status) {
  const safeStatus = escapeHTML(status);

  if (status === "Admitted") {
    return `<span class="pill bg-emerald-100 text-emerald-700">✓ Admitted</span>`;
  }

  if (status === "Pending") {
    return `<span class="pill bg-amber-100 text-amber-800">● Pending</span>`;
  }

  return `<span class="pill bg-red-100 text-red-700">× ${safeStatus}</span>`;
}

function ticketBadge(ticketType) {
  const safeType = escapeHTML(ticketType);
  const vip = /vip/i.test(ticketType);
  const speaker = /speaker|keynote/i.test(ticketType);
  const exhibitor = /exhibitor/i.test(ticketType);

  const classes = vip
    ? "bg-violet-100 text-violet-800"
    : speaker
      ? "bg-orange-100 text-orange-800"
      : exhibitor
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";

  return `<span class="pill ${classes}">${safeType}</span>`;
}

function renderTable() {
  const body = $("#admissionTableBody");
  const total = state.filteredAttendees.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const pageRows = state.filteredAttendees.slice(
    startIndex,
    startIndex + state.pageSize
  );

  if (!pageRows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-10 text-center text-[14px] text-slate-500">
          No admission records match these filters.
        </td>
      </tr>`;
  } else {
    body.innerHTML = pageRows.map(attendee => `
      <tr>
        <td>
          <div class="flex min-w-[190px] items-center gap-3">
            <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e5e8ff] text-[11px] font-bold text-[#5440a5]">${escapeHTML(attendee.initials || initialsFor(attendee.name))}</span>
            <div class="min-w-0">
              <p class="font-semibold text-slate-800">${escapeHTML(attendee.name)}</p>
              <p class="mt-0.5 break-all text-[11px] text-slate-500">${escapeHTML(attendee.email)}</p>
            </div>
          </div>
        </td>
        <td>${ticketBadge(attendee.ticketType)}</td>
        <td class="text-slate-600">${escapeHTML(attendee.ticketRef)}</td>
        <td>
          <p class="font-medium">${escapeHTML(attendee.gate)}</p>
          <p class="mt-0.5 text-[11px] text-slate-500">${escapeHTML(attendee.device)}</p>
        </td>
        <td class="whitespace-nowrap">${escapeHTML(attendee.timestamp)}</td>
        <td>${escapeHTML(attendee.operator)}</td>
        <td>${statusBadge(attendee.status)}</td>
      </tr>
    `).join("");
  }

  const displayStart = total ? startIndex + 1 : 0;
  const displayEnd = Math.min(startIndex + state.pageSize, total);
  setText(
    "tableSummary",
    `Showing ${displayStart}–${displayEnd} of ${total.toLocaleString("en-NG")} admission records`
  );

  $("#previousPageButton").disabled = state.currentPage <= 1;
  $("#nextPageButton").disabled = state.currentPage >= totalPages;

  const pagination = $("#paginationButtons");
  pagination.replaceChildren();

  const pages = getVisiblePages(state.currentPage, totalPages);

  pages.forEach(page => {
    if (page === "...") {
      const dots = document.createElement("span");
      dots.className = "px-1 text-[12px] text-slate-500";
      dots.textContent = "…";
      pagination.appendChild(dots);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(page);
    button.className = page === state.currentPage
      ? "h-8 min-w-8 rounded-lg bg-eventra px-2 text-[12px] font-bold text-white"
      : "h-8 min-w-8 rounded-lg px-2 text-[12px] font-medium text-slate-700 hover:bg-white";

    button.setAttribute("aria-label", `Page ${page}`);
    button.setAttribute("aria-current", page === state.currentPage ? "page" : "false");
    button.addEventListener("click", () => {
      state.currentPage = page;
      renderTable();
    });

    pagination.appendChild(button);
  });
}

function getVisiblePages(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);

  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];

  return [1, "...", current - 1, current, current + 1, "...", total];
}

$("#previousPageButton").addEventListener("click", () => {
  if (state.currentPage > 1) {
    state.currentPage--;
    renderTable();
  }
});

$("#nextPageButton").addEventListener("click", () => {
  const totalPages = Math.max(
    1,
    Math.ceil(state.filteredAttendees.length / state.pageSize)
  );

  if (state.currentPage < totalPages) {
    state.currentPage++;
    renderTable();
  }
});

// ------------------------------------------------------------
// CSV EXPORT
// ------------------------------------------------------------

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

$("#exportButton").addEventListener("click", () => {
  const rows = state.filteredAttendees;

  if (!rows.length) {
    showToast("Nothing to export", "There are no admission records matching your current filters.");
    return;
  }

  const headers = [
    "Attendee",
    "Email",
    "Ticket Type",
    "Ticket Reference",
    "Gate",
    "Device",
    "Timestamp",
    "Gate Operator",
    "Status"
  ];

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map(row => [
      row.name,
      row.email,
      row.ticketType,
      row.ticketRef,
      row.gate,
      row.device,
      row.timestamp,
      row.operator,
      row.status
    ].map(csvCell).join(","))
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eventra-checkin-log-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("Export complete", `${rows.length} admission record(s) exported to CSV.`);
});

// ------------------------------------------------------------
// SCANNER MODE
// ------------------------------------------------------------

function setScannerMode(mode) {
  state.scannerMode = mode;

  const hardware = mode === "hardware";
  $("#hardwareScannerTab").className = hardware
    ? "rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-eventra shadow-sm"
    : "rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-white/70";

  $("#webcamScannerTab").className = !hardware
    ? "rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-eventra shadow-sm"
    : "rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-white/70";

  $("#webcamControls").classList.toggle("hidden", hardware);
  $("#webcamControls").classList.toggle("flex", !hardware);
  $("#cameraMessage").classList.toggle("hidden", hardware);

  if (hardware) {
    stopCamera();
    setText("scannerPrompt", "AWAITING NEXT TICKET");
    setText("readerStatus", "Optical Reader Ready");
    $("#ticketCodeInput").focus();
  } else {
    setText("scannerPrompt", "CAMERA SCANNER MODE");
    setText("readerStatus", "Camera not started");
  }
}

$("#hardwareScannerTab").addEventListener("click", () => setScannerMode("hardware"));
$("#webcamScannerTab").addEventListener("click", () => setScannerMode("webcam"));

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Camera unavailable", "Use HTTPS or localhost and a supported browser to access the camera.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    state.cameraStream = stream;

    let video = $("#scannerVideo");
    if (!video) {
      video = document.createElement("video");
      video.id = "scannerVideo";
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.className = "absolute inset-0 h-full w-full object-cover opacity-80";
      $("#scannerScreen").prepend(video);
    }

    video.srcObject = stream;
    await video.play();

    setText("readerStatus", "Camera active");
    setText("scannerPrompt", "CAMERA ACTIVE — READY TO SCAN");
    $("#readerStatusDot").className = "h-2 w-2 rounded-full bg-emerald-400";
    showToast("Camera started", "Camera access is active. Enter the ticket code after scanning it.");
  } catch (error) {
    console.error("Could not start camera:", error);
    setText("readerStatus", "Camera permission unavailable");
    showToast("Camera could not start", "Allow camera access in your browser, or use a hardware scanner.");
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }

  const video = $("#scannerVideo");
  if (video) {
    video.pause();
    video.srcObject = null;
    video.remove();
  }

  if (state.scannerMode === "webcam") {
    setText("readerStatus", "Camera stopped");
    setText("scannerPrompt", "CAMERA SCANNER MODE");
  }
}

$("#startCameraButton").addEventListener("click", startCamera);
$("#stopCameraButton").addEventListener("click", stopCamera);

// A hardware scanner commonly types the scanned value and sends Enter.
// The focused input below supports that interaction.
$("#ticketCodeInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#scanForm").requestSubmit();
  }
});

// ------------------------------------------------------------
// TICKET VALIDATION
// ------------------------------------------------------------

function showScanFeedback(message, type = "info") {
  const feedback = $("#scanFeedback");
  feedback.textContent = message;
  feedback.classList.remove(
    "hidden",
    "bg-emerald-50",
    "text-emerald-800",
    "bg-red-50",
    "text-red-800",
    "bg-amber-50",
    "text-amber-800",
    "bg-blue-50",
    "text-blue-800"
  );

  const classes = {
    success: ["bg-emerald-50", "text-emerald-800"],
    error: ["bg-red-50", "text-red-800"],
    warning: ["bg-amber-50", "text-amber-800"],
    info: ["bg-blue-50", "text-blue-800"]
  };

  feedback.classList.add(...(classes[type] || classes.info));
}

function findLocalTicket(code) {
  const normalized = code.trim().toLowerCase();

  return state.attendees.find(attendee =>
    String(attendee.ticketRef).toLowerCase() === normalized ||
    String(attendee.id).toLowerCase() === normalized
  );
}

async function validateTicket(code) {
  if (state.busy) return;

  const ticketCode = String(code || "").trim();

  if (!ticketCode) {
    showScanFeedback("Enter or scan a ticket code first.", "warning");
    $("#ticketCodeInput").focus();
    return;
  }

  if (!state.selectedEvent?.id) {
    showScanFeedback("Select an event before validating tickets.", "warning");
    return;
  }

  state.busy = true;
  $("#verifyTicketButton").disabled = true;
  setText("verifyButtonText", "Verifying…");
  setText("readerStatus", "Checking ticket…");
  setText("scannerPrompt", "VALIDATING TICKET");

  try {
    // The backend ticket-validation endpoint expects a real ticket ID.
    // A scanned ticket code may differ from the ticket database ID.
    // If a matching record exists in the current list, prefer its ID.
    const localTicket = findLocalTicket(ticketCode);
    const ticketId = localTicket?.id || ticketCode;

    const response = await apiRequest(
      `/tickets/${encodeURIComponent(ticketId)}/validate`,
      {
        method: "POST",
        body: JSON.stringify({
          event_id: state.selectedEvent.id,
          ticket_code: ticketCode
        })
      }
    );

    const result = unwrapPayload(response) || {};
    const rawStatus = String(
      result.status ||
      result.validation_status ||
      result.ticket?.status ||
      response.status ||
      ""
    ).toLowerCase();

    const alreadyUsed =
      /already_used|already_checked|checked_in/.test(rawStatus);

    const valid =
      response.success === true ||
      result.valid === true ||
      result.is_valid === true ||
      ["valid", "success", "successful", "verified"].includes(rawStatus);

    if (alreadyUsed) {
      showScanFeedback("This ticket has already been checked in. Do not admit it again.", "warning");
      setText("readerStatus", "Ticket already used");
      setText("scannerPrompt", "TICKET ALREADY USED");
      return;
    }

    if (!valid) {
      showScanFeedback(
        result.message || "The ticket could not be verified. Check the code and try again.",
        "error"
      );
      setText("readerStatus", "Ticket not verified");
      setText("scannerPrompt", "VALIDATION UNSUCCESSFUL");
      return;
    }

    const ticket = normalizeTicketResult(result, localTicket, ticketCode);
    state.pendingTicket = ticket;
    renderPendingTicket(ticket);

    showScanFeedback("Ticket verified. Confirm admission to complete check-in.", "success");
    setText("readerStatus", "Ticket verified");
    setText("scannerPrompt", "TICKET VERIFIED");
  } catch (error) {
    console.error("Ticket validation failed:", error);

    const localTicket = findLocalTicket(ticketCode);

    if (localTicket && localTicket.status === "Admitted") {
      showScanFeedback(
        "This sample record is already marked as admitted. A live ticket validation response is required to admit a real attendee.",
        "warning"
      );
    } else {
      showScanFeedback(
        error.message || "Ticket validation failed. Check the connection and ticket code.",
        "error"
      );
    }

    setText("readerStatus", "Validation unavailable");
    setText("scannerPrompt", "AWAITING VALIDATION");
  } finally {
    state.busy = false;
    $("#verifyTicketButton").disabled = false;
    setText("verifyButtonText", "Verify & Admit");
  }
}

function normalizeTicketResult(result, localTicket, code) {
  const ticket = result.ticket || result.attendee || result.data?.ticket || result;
  const name =
    ticket.name ||
    ticket.full_name ||
    [ticket.first_name, ticket.last_name].filter(Boolean).join(" ") ||
    localTicket?.name ||
    "Verified attendee";

  const ticketType = ticket.ticket_type?.name ||
    ticket.ticketType?.name ||
    ticket.ticket_type_name ||
    localTicket?.ticketType ||
    "Ticket";

  return {
    ...(localTicket || {}),
    id: String(ticket.id || ticket.ticket_id || localTicket?.id || code),
    name,
    email: ticket.email || localTicket?.email || "",
    initials: initialsFor(name),
    ticketType,
    ticketRef: ticket.ticket_code || ticket.code || code,
    gate: localTicket?.gate || "Gate 01",
    device: localTicket?.device || "Scanner",
    timestamp: formatTime(),
    operator: localTicket?.operator || "Organizer",
    status: "Pending",
    role: ticket.role || localTicket?.role || "",
    priority: /vip|speaker/i.test(ticketType) ? "VIP Priority" : "",
    zone: ticket.zone || localTicket?.zone || "General Admission",
    meal: ticket.meal || localTicket?.meal || "Standard Access",
    raw: ticket
  };
}

function renderPendingTicket(ticket) {
  setText("ticketValidationBadge", "✓ Valid Ticket Verified — Just Now");
  $("#ticketValidationBadge").className = "pill bg-emerald-100 text-emerald-700";

  setText("ticketGateMeta", ticket.gate || "Ticket verified");
  setText("ticketCodeLabel", `CODE: ${ticket.ticketRef}`);
  setText("attendeeAvatar", ticket.initials || initialsFor(ticket.name));
  setText("attendeeName", ticket.name);
  setText("attendeeRole", ticket.role || ticket.ticketType);
  setText("attendeeEmail", ticket.email || "Email not provided");
  setText("attendeePriority", ticket.priority || ticket.ticketType);
  setText("attendeeZone", ticket.zone || "General Admission");
  setText("attendeeMeal", ticket.meal || "Standard Access");

  $("#confirmAdmitButton").disabled = false;
  $("#confirmAdmitButton").textContent = "✓ Confirm & Next";
}

$("#scanForm").addEventListener("submit", event => {
  event.preventDefault();
  validateTicket($("#ticketCodeInput").value);
});

// ------------------------------------------------------------
// CONFIRM ADMISSION
// ------------------------------------------------------------

async function confirmAdmission() {
  const ticket = state.pendingTicket;

  if (!ticket) {
    showToast("No ticket selected", "Scan and verify a ticket before confirming admission.");
    return;
  }

  if (state.busy) return;

  state.busy = true;
  $("#confirmAdmitButton").disabled = true;
  $("#confirmAdmitButton").textContent = "Confirming…";

  try {
    // The backend validates ticket status. A successful verification
    // alone is not treated as proof that admission has been recorded.
    const response = await apiRequest(
      `/tickets/${encodeURIComponent(ticket.id)}/validate`,
      {
        method: "POST",
        body: JSON.stringify({
          event_id: state.selectedEvent.id,
          confirm_check_in: true
        })
      }
    );

    const result = unwrapPayload(response) || {};
    const status = String(
      result.status ||
      result.validation_status ||
      result.ticket?.status ||
      ""
    ).toLowerCase();

    const alreadyUsed = /already_used|already checked|checked_in/.test(status);

    if (alreadyUsed) {
      showScanFeedback("The backend reports that this ticket has already been used.", "warning");
      setText("readerStatus", "Already checked in");
      return;
    }

    const success =
      response.success === true ||
      result.success === true ||
      result.checked_in === true ||
      result.check_in_success === true ||
      ["admitted", "checked_in", "checked-in", "success", "valid"].includes(status);

    if (!success) {
      showScanFeedback(
        result.message || "The backend did not confirm admission. Please try again.",
        "error"
      );
      return;
    }

    completeLocalAdmission(ticket);
    showScanFeedback(`${ticket.name} has been admitted successfully.`, "success");
    showToast("Admission confirmed", `${ticket.name} has been checked in.`);
  } catch (error) {
    console.error("Admission confirmation failed:", error);
    showScanFeedback(
      error.message || "Could not confirm admission with the backend.",
      "error"
    );
    showToast("Admission not confirmed", "Check the connection and try again.");
  } finally {
    state.busy = false;
    $("#confirmAdmitButton").disabled = false;
    $("#confirmAdmitButton").textContent = "✓ Confirm & Next";
  }
}

function completeLocalAdmission(ticket) {
  const record = {
    ...ticket,
    status: "Admitted",
    timestamp: formatTime(),
    gate: ticket.gate || "Gate 01",
    device: ticket.device || "Scanner"
  };

  const existingIndex = state.attendees.findIndex(item =>
    item.id === record.id || item.ticketRef === record.ticketRef
  );

  if (existingIndex >= 0) {
    state.attendees[existingIndex] = record;
  } else {
    state.attendees.unshift(record);
  }

  try {
    const oldLog = JSON.parse(localStorage.getItem(STORAGE_KEYS.checkInLog) || "[]");
    oldLog.unshift({
      ticketRef: record.ticketRef,
      attendee: record.name,
      eventId: state.selectedEvent?.id || "",
      timestamp: new Date().toISOString(),
      status: "Admitted"
    });
    localStorage.setItem(STORAGE_KEYS.checkInLog, JSON.stringify(oldLog.slice(0, 300)));
  } catch (error) {
    console.warn("Local check-in log could not be saved.", error);
  }

  const admitted = Number($("#totalAdmitted").textContent.replace(/,/g, "")) || 0;
  setText("totalAdmitted", (admitted + 1).toLocaleString("en-NG"));

  const capacity = Number(
    String(state.selectedEvent?.capacity || 500).replace(/,/g, "")
  ) || 500;

  $("#admittedBar").style.width = `${Math.min(100, (admitted + 1) / capacity * 100)}%`;
  setText("admittedRate", `${Math.min(100, (admitted + 1) / capacity * 100).toFixed(1)}% checked in`);

  state.pendingTicket = null;
  state.currentPage = 1;
  applyFilters();

  setText("ticketValidationBadge", "✓ Admission Confirmed");
  $("#ticketValidationBadge").className = "pill bg-emerald-100 text-emerald-700";
  setText("ticketGateMeta", record.gate);
  setText("readerStatus", "Optical Reader Ready");
  setText("scannerPrompt", "AWAITING NEXT TICKET");
  $("#ticketCodeInput").value = "";
  $("#ticketCodeInput").focus();
}

$("#confirmAdmitButton").addEventListener("click", confirmAdmission);

// ------------------------------------------------------------
// PRINT BADGE
// ------------------------------------------------------------

$("#printBadgeButton").addEventListener("click", () => {
  const ticket = state.pendingTicket || {
    name: $("#attendeeName").textContent,
    email: $("#attendeeEmail").textContent,
    ticketRef: $("#ticketCodeLabel").textContent.replace("CODE: ", ""),
    ticketType: $("#attendeePriority").textContent
  };

  const printWindow = window.open("", "_blank", "width=640,height=700");

  if (!printWindow) {
    showToast("Popup blocked", "Allow pop-ups to print the attendee badge.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Eventra Attendee Badge</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:32px;background:#f5f7fc;color:#10223b}
        .badge{max-width:420px;margin:20px auto;background:#fff;border:2px solid #6d28ff;border-radius:20px;padding:28px;text-align:center}
        h1{margin:0;color:#6d28ff;font-size:27px}h2{font-size:22px;margin:25px 0 8px}
        p{font-size:14px;color:#64748b;overflow-wrap:anywhere}.type{display:inline-block;background:#eee8ff;color:#5620bf;border-radius:30px;padding:8px 15px;font-weight:bold}
        .code{margin-top:25px;padding:14px;background:#edf2ff;border-radius:10px;font-weight:bold;letter-spacing:1px}
        @media print{body{padding:0;background:#fff}.badge{margin:0 auto;box-shadow:none}}
      </style>
    </head>
    <body>
      <div class="badge">
        <h1>Eventra</h1>
        <p>Discover. Book. Experience.</p>
        <h2>${escapeHTML(ticket.name)}</h2>
        <p>${escapeHTML(ticket.email || "")}</p>
        <p><span class="type">${escapeHTML(ticket.ticketType || "Attendee")}</span></p>
        <div class="code">${escapeHTML(ticket.ticketRef || "Ticket reference unavailable")}</div>
        <p>${escapeHTML(state.selectedEvent?.title || "Eventra Event")}</p>
      </div>
      <script>window.addEventListener("load",()=>window.print());<\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
});

// ------------------------------------------------------------
// ASSIGN ADDITIONAL SCANNER
// ------------------------------------------------------------

$("#assignScannerButton").addEventListener("click", () => {
  openModal({
    title: "Assign Scanner Device",
    description: "Choose the gate and device for an additional scanner.",
    content: `
      <form id="assignScannerForm" class="space-y-4">
        <label class="block text-[13px] font-semibold text-slate-700">Gate
          <select id="assignGate" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-[13px]">
            <option>Gate 01 — Main Concourse</option>
            <option>Gate 02 — VIP Red Carpet</option>
            <option>Gate 03 — Exhibitors &amp; Media</option>
          </select>
        </label>
        <label class="block text-[13px] font-semibold text-slate-700">Device name
          <input id="assignDeviceName" required maxlength="80" placeholder="e.g. Handheld Scanner #5" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-[13px]">
        </label>
        <label class="block text-[13px] font-semibold text-slate-700">Operator
          <input id="assignOperatorName" required maxlength="80" placeholder="Staff member name" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-[13px]">
        </label>
      </form>`,
    actions: [
      {
        label: "Cancel",
        className: "rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50"
      },
      {
        label: "Assign device",
        onClick: () => {
          const gate = $("#assignGate").value;
          const device = $("#assignDeviceName").value.trim();
          const operator = $("#assignOperatorName").value.trim();

          if (!device || !operator) {
            showToast("Missing details", "Enter both a device name and an operator.");
            return;
          }

          showToast("Device details captured", `${device} for ${gate}. Connect an assignment endpoint to persist this configuration.`);
        },
        close: true
      }
    ]
  });

  // Validate the modal form before its action can proceed.
  const actions = $$("#modalActions button");
  const assignButton = actions[1];

  if (assignButton) {
    assignButton.addEventListener("click", event => {
      const device = $("#assignDeviceName")?.value.trim();
      const operator = $("#assignOperatorName")?.value.trim();

      if (!device || !operator) {
        event.stopImmediatePropagation();
        event.preventDefault();
        showToast("Missing details", "Enter both a device name and an operator.");
      }
    }, true);
  }
});

// ------------------------------------------------------------
// DATE AND EVENT META INITIALIZATION
// ------------------------------------------------------------

function initializeDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  state.dateStart = toISODate(start);
  state.dateEnd = toISODate(end);

  if (window.EventraShell) {
    window.EventraShell.setDateLabel(formatDateLabel(state.dateStart, state.dateEnd));
  }
}

function initializeOrganizer() {
  const user = getStoredUser();

  const name =
    user.organization_name ||
    user.organizer_name ||
    user.name ||
    user.full_name;

  const email = user.email;

  if (window.EventraShell) window.EventraShell.setOrganizer(name, email);
}

// ------------------------------------------------------------
// CLEANUP
// ------------------------------------------------------------

window.addEventListener("beforeunload", stopCamera);

// ------------------------------------------------------------
// STARTUP
// ------------------------------------------------------------

async function initializeDashboard() {
  initializeDateRange();
  initializeOrganizer();

  // The screenshot-like preview remains visible if the backend
  // cannot be reached. Real API data replaces it when available.
  state.attendees = DEMO_ATTENDEES.map(record => ({ ...record }));
  applyFilters();

  await loadEvents();

  if (state.selectedEvent) {
    await loadAttendanceData();
  }
}

initializeDashboard();