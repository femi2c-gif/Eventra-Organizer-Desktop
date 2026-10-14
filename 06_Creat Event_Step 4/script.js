
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "https://eventra-backend-aidf.onrender.com/api";

  const $ = (id) => document.getElementById(id);

  const toast = $("toast");
  let toastTimer;
  let selectedMode = "immediate";
  let eventDraft = {};
  let currentImageUrl = "";
  let isPublishing = false;


const DRAFT_KEYS = [
  "eventra_create_event_draft",
  "eventra_event_draft",
  "eventra_create_event",
  "eventra_event_data",
  "eventra_step1_draft",
  "eventra_step2_draft",
  "eventra_step3_draft",
  "eventra_step1",
  "eventra_step2",
  "eventra_step3",
  "createEventDraft",

  // Shared draft key used by the Basic Info and Date & Location screens.
  "eventra_organizer_create_event_draft"
];


  function showToast(message, type = "info") {
    if (!toast) return;

    const symbols = {
      success: "✓ ",
      error: "⚠ ",
      info: "ℹ "
    };

    toast.textContent = (symbols[type] || "") + message;
    toast.hidden = false;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3800);
  }

  function readStoredObject(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (error) {
      console.warn(`Could not read ${key}:`, error);
    }

    return null;
  }

  function mergeObjects(target, source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return target;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        target[key] &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        target[key] = mergeObjects(target[key], value);
      } else {
        target[key] = value;
      }
    });

    return target;
  }

  function loadDraft() {
    let combined = {};

    DRAFT_KEYS.forEach((key) => {
      const sessionValue = readStoredObject(sessionStorage, key);
      const localValue = readStoredObject(localStorage, key);

      if (localValue) combined = mergeObjects(combined, localValue);
      if (sessionValue) combined = mergeObjects(combined, sessionValue);
    });

    /*
      Also check the general Eventra checkout/draft object names
      sometimes used by the other wizard screens.
    */
    [
      "eventra_draft",
      "eventDraft",
      "eventra_current_event"
    ].forEach((key) => {
      const localValue = readStoredObject(localStorage, key);
      const sessionValue = readStoredObject(sessionStorage, key);

      if (localValue) combined = mergeObjects(combined, localValue);
      if (sessionValue) combined = mergeObjects(combined, sessionValue);
    });

    /*
      Some wizard implementations store individual values instead
      of one JSON object.
    */
    const individualFields = {
      title: [
        "eventra_event_name",
        "eventName",
        "eventTitle"
      ],
      category: [
        "eventra_event_category",
        "eventCategory"
      ],
      description: [
        "eventra_event_description",
        "eventDescription"
      ],
      venue: [
        "eventra_venue_name",
        "venueName"
      ],
      address: [
        "eventra_venue_address",
        "venueAddress"
      ],
      startDate: [
        "eventra_start_date",
        "eventStartDate"
      ],
      endDate: [
        "eventra_end_date",
        "eventEndDate"
      ],
      startTime: [
        "eventra_start_time",
        "eventStartTime"
      ],
      endTime: [
        "eventra_end_time",
        "eventEndTime"
      ]
    };

    Object.entries(individualFields).forEach(([field, keys]) => {
      if (getValue(combined, [field])) return;

      for (const key of keys) {
        const value =
          sessionStorage.getItem(key) ||
          localStorage.getItem(key);

        if (value) {
          combined[field] = value;
          break;
        }
      }
    });

    return normalizeDraft(combined);
  }

  function getValue(object, paths) {
    for (const path of paths) {
      const parts = path.split(".");
      let current = object;

      for (const part of parts) {
        if (
          current === null ||
          current === undefined ||
          typeof current !== "object"
        ) {
          current = undefined;
          break;
        }

        current = current[part];
      }

      if (
        current !== undefined &&
        current !== null &&
        current !== ""
      ) {
        return current;
      }
    }

    return undefined;
  }

  function normalizeDraft(raw) {
    const source = raw || {};

    const nestedEvent =
      source.event ||
      source.eventData ||
      source.basicInfo ||
      source.step1 ||
      source.details ||
      {};

    const nestedLocation =
      source.location ||
      source.venueDetails ||
      source.step2 ||
      {};

    const nestedTickets =
      source.ticketing ||
      source.pricing ||
      source.step3 ||
      {};

    const merged = {
      ...nestedEvent,
      ...nestedLocation,
      ...nestedTickets,
      ...source
    };

    const title = getValue(merged, [
      "title",
      "eventName",
      "event_name",
      "name",
      "basicInfo.eventName",
      "event.title"
    ]);

    const category = getValue(merged, [
      "category",
      "eventCategory",
      "event_category",
      "basicInfo.category"
    ]);

    const description = getValue(merged, [
      "description",
      "eventDescription",
      "event_description",
      "basicInfo.description"
    ]);

    const image = getValue(merged, [
      "imageUrl",
      "image_url",
      "eventImage",
      "event_image_url",
      "bannerUrl",
      "banner",
      "imageData",
      "image"
    ]);

    const venue = getValue(merged, [
      "venueName",
      "venue_name",
      "venue",
      "location.venueName",
      "location.name"
    ]);

    const address = getValue(merged, [
      "venueAddress",
      "venue_address",
      "address",
      "location.address"
    ]);

    const startDate = getValue(merged, [
      "startDate",
      "start_date",
      "eventDate",
      "date",
      "location.startDate"
    ]);

    const endDate = getValue(merged, [
      "endDate",
      "end_date",
      "location.endDate"
    ]);

    const startTime = getValue(merged, [
      "startTime",
      "start_time",
      "location.startTime"
    ]);

    const endTime = getValue(merged, [
      "endTime",
      "end_time",
      "location.endTime"
    ]);

    let tickets = getValue(merged, [
      "tickets",
      "ticketTypes",
      "ticket_types",
      "ticketTiers",
      "tiers",
      "pricing.tickets",
      "ticketing.tickets"
    ]);

    if (!Array.isArray(tickets)) {
      tickets = [];
    }

    tickets = tickets.map((ticket, index) => {
      const price = Number(
        getValue(ticket, ["price", "amount", "ticketPrice"]) || 0
      );

      const quantity = Number(
        getValue(ticket, [
          "quantity",
          "total",
          "capacity",
          "availableQuantity"
        ]) || 0
      );

      return {
        id: ticket.id || ticket.ticket_type_id || "",
        name:
          ticket.name ||
          ticket.type ||
          ticket.ticketName ||
          `Ticket Tier ${index + 1}`,
        price,
        quantity,
        description: ticket.description || "",
        badge: ticket.badge || ticket.label || ""
      };
    });

    const tags = getValue(merged, [
      "tags",
      "eventTags",
      "event_tags"
    ]);

    const organizerName = getValue(merged, [
      "organizerName",
      "organizer_name",
      "organizer.name"
    ]);

    const organizerEmail = getValue(merged, [
      "organizerEmail",
      "organizer_email",
      "organizer.email"
    ]);

    const eventId = getValue(merged, [
      "id",
      "eventId",
      "event_id"
    ]);

    return {
      ...merged,
      title: title || "",
      category: category || "",
      description: description || "",
      image: typeof image === "string" ? image : "",
      venue: venue || "",
      address: address || "",
      startDate: startDate || "",
      endDate: endDate || "",
      startTime: startTime || "",
      endTime: endTime || "",
      timezone: getValue(merged, ["timezone", "timeZone"]) || "WAT",
      venueExtra: getValue(merged, [
        "venueExtra",
        "venue_extra",
        "hall",
        "venueType"
      ]) || "",
      tickets,
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
          ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      organizerName: organizerName || "Event Organizer",
      organizerEmail: organizerEmail || "",
      eventId: eventId || "",
      payoutName: getValue(merged, [
        "payoutName",
        "payout_name",
        "bankName",
        "bank_name"
      ]) || "",
      payoutDetails: getValue(merged, [
        "payoutDetails",
        "payout_details",
        "bankAccount",
        "bank_account"
      ]) || "",
      payoutVerified: Boolean(
        getValue(merged, [
          "payoutVerified",
          "payout_verified",
          "bankVerified"
        ])
      ),
      platformFee: getValue(merged, [
        "platformFee",
        "platform_fee",
        "serviceFee"
      ]) || ""
    };
  }

  function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "₦0";

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(value, options = {}) {
    if (!value) return "Date not selected";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options
    }).format(date);
  }

  function formatTime(value) {
    if (!value) return "";

    const match = String(value).match(/^(\d{1,2}):(\d{2})/);

    if (!match) return String(value);

    let hours = Number(match[1]);
    const minutes = match[2];
    const suffix = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    return `${String(hours).padStart(2, "0")}:${minutes} ${suffix}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[character];
    });
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setImage(id, imageUrl) {
    const image = $(id);
    if (!image) return;

    if (
      typeof imageUrl === "string" &&
      imageUrl.trim() &&
      /^(https?:\/\/|data:image\/|blob:)/i.test(imageUrl)
    ) {
      image.src = imageUrl;
      image.onerror = () => {
        image.removeAttribute("src");
        image.style.background =
          "linear-gradient(135deg,#D9D0FF,#EEF3FF)";
      };
    } else {
      image.removeAttribute("src");
      image.style.background =
        "linear-gradient(135deg,#D9D0FF,#EEF3FF)";
    }
  }

  function getTicketTotal() {
    return eventDraft.tickets.reduce(
      (sum, ticket) => sum + Math.max(0, ticket.quantity),
      0
    );
  }

  function getLowestTicketPrice() {
    const pricedTickets = eventDraft.tickets
      .map((ticket) => ticket.price)
      .filter((price) => price > 0);

    return pricedTickets.length
      ? Math.min(...pricedTickets)
      : null;
  }

  function getGrossPotential(ticket) {
    return Math.max(0, ticket.price) * Math.max(0, ticket.quantity);
  }

  function renderTags() {
    const container = $("eventTags");
    if (!container) return;

    container.innerHTML = "";

    const tags = eventDraft.tags.length
      ? eventDraft.tags
      : [];

    tags.slice(0, 8).forEach((tag) => {
      const element = document.createElement("span");
      element.className =
        "rounded-md bg-white px-2 py-1 text-[12px] font-semibold text-[#5B6578]";
      element.textContent = `#${String(tag).replace(/^#/, "")}`;
      container.appendChild(element);
    });
  }

  function renderTickets() {
    const container = $("ticketList");
    if (!container) return;

    if (!eventDraft.tickets.length) {
      container.innerHTML = `
        <div class="rounded-xl border border-dashed border-[#D6DEED] p-5 text-center">
          <p class="font-semibold text-[#263952]">No ticket tiers found</p>
          <p class="mt-2 text-[14px] text-[#63718A]">
            Return to Tickets &amp; Pricing to add at least one ticket tier.
          </p>
          <button type="button" data-edit-step="3"
            class="mt-3 rounded-lg bg-[#E8EFFF] px-4 py-2 text-[14px] font-semibold text-[#18304E]">
            Add Ticket Tiers
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = eventDraft.tickets.map((ticket) => `
      <article class="ticket-row">
        <div class="flex min-w-0 items-start gap-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-eventra">▣</span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-bold">${escapeHtml(ticket.name)}</h3>
              ${ticket.badge
                ? `<span class="rounded-full bg-[#E4D8FF] px-2 py-1 text-[11px] font-bold text-[#5D25E8]">${escapeHtml(ticket.badge)}</span>`
                : ""}
              <span class="rounded-full bg-white px-2 py-1 font-mono text-[11px] font-semibold text-[#52627A]">
                ${ticket.quantity.toLocaleString("en-NG")} Total
              </span>
            </div>
            <p class="mt-2 text-[14px] leading-relaxed text-[#63718A]">
              ${escapeHtml(ticket.description || "Ticket access as defined by the organizer.")}
            </p>
          </div>
        </div>
        <div class="text-left sm:min-w-[150px] sm:text-right">
          <p class="text-[19px] font-extrabold text-eventra">${formatCurrency(ticket.price)}</p>
          <p class="mt-1 text-[12px] text-[#63718A]">Gross potential:</p>
          <p class="text-[13px] font-semibold text-[#52627A]">${formatCurrency(getGrossPotential(ticket))}</p>
        </div>
      </article>
    `).join("");
  }

  function buildReadinessItems() {
    const hasTitle = Boolean(eventDraft.title.trim());
    const hasDescription = Boolean(eventDraft.description.trim());
    const hasCategory = Boolean(eventDraft.category.trim());
    const hasDate = Boolean(eventDraft.startDate);
    const hasVenue = Boolean(eventDraft.venue.trim() || eventDraft.address.trim());
    const hasTickets = eventDraft.tickets.length > 0 &&
      eventDraft.tickets.every((ticket) => ticket.name && ticket.price >= 0 && ticket.quantity > 0);
    const hasPayout = eventDraft.payoutVerified;

    return [
      {
        label: "Event details",
        detail: "Name, category and description",
        complete: hasTitle && hasCategory && hasDescription
      },
      {
        label: "Date and venue",
        detail: "Event timing and location",
        complete: hasDate && hasVenue
      },
      {
        label: "Ticketing inventory",
        detail: "At least one ticket tier with a quantity",
        complete: hasTickets
      },
      {
        label: "Payout account",
        detail: eventDraft.payoutName || "Payout account needs confirmation",
        complete: hasPayout
      },
      {
        label: "Publishing preferences",
        detail: selectedMode === "scheduled"
          ? "Scheduled publishing selected"
          : selectedMode === "private"
            ? "Private / unlisted event selected"
            : "Publish immediately selected",
        complete: selectedMode !== "scheduled" ||
          Boolean($("publishAt").value)
      }
    ];
  }

  function renderReadiness() {
    const container = $("readinessList");
    if (!container) return;

    const items = buildReadinessItems();
    const completeCount = items.filter((item) => item.complete).length;
    const percentage = Math.round((completeCount / items.length) * 100);

    container.innerHTML = items.map((item) => `
      <div class="readiness-item">
        <span class="checkmark" style="${item.complete ? "" : "background:#F0F2F7;color:#8792A6"}">
          ${item.complete ? "✓" : "!"}
        </span>
        <div>
          <p class="font-semibold text-[#263952]">${escapeHtml(item.label)}</p>
          <p class="mt-0.5 text-[13px] text-[#63718A]">${escapeHtml(item.detail)}</p>
        </div>
      </div>
    `).join("");

    const badge = $("readinessBadge");
    badge.textContent = `${percentage}% Complete`;
    badge.className = percentage === 100
      ? "rounded-full bg-[#DDF8ED] px-2.5 py-1 text-[12px] font-bold text-[#087B58]"
      : "rounded-full bg-[#E9EFFF] px-2.5 py-1 text-[12px] font-bold text-[#5C35D8]";

    setText(
      "readinessMessage",
      percentage === 100
        ? "All checklist items are complete. Confirm the details and publish when you're ready."
        : `${completeCount} of ${items.length} readiness checks are complete. Review the outstanding items before publishing.`
    );

    setText(
      "launchPanelTitle",
      percentage === 100 ? "Ready to Launch" : "Review Before Launch"
    );

    setText(
      "launchPanelText",
      percentage === 100
        ? "Your checklist is complete. Publishing will be confirmed only after Eventra's server accepts the event."
        : "Review the outstanding items. You can save your progress as a draft and return later."
    );
  }

  function renderDraft() {
    const title = eventDraft.title || "Your Event";
    const startDate = eventDraft.startDate;
    const endDate = eventDraft.endDate;
    const dateText = startDate
      ? `${formatDate(startDate, { weekday: "long" })}${endDate && endDate !== startDate ? ` – ${formatDate(endDate)}` : ""}`
      : "Date not selected";

    const timeText = [
      eventDraft.startTime ? formatTime(eventDraft.startTime) : "",
      eventDraft.endTime ? formatTime(eventDraft.endTime) : ""
    ].filter(Boolean).join(" – ");

    const eventCode = eventDraft.eventId
      ? `Event ID • ${eventDraft.eventId}`
      : "Event ID • Draft";

    setText("pageEventName", `“${title}”`);
    setText("overviewEventName", title);
    setText("previewEventName", title);
    setText("modalEventName", title);

    setText("eventCategory", eventDraft.category || "Category not selected");
    setText("eventDescription", eventDraft.description || "Add an event description in Basic Info.");
    setText("previewDescription", eventDraft.description || "Your event description will appear here.");
    setText("eventDate", dateText);
    setText("eventTime", timeText || "Event time not selected");
    setText("eventTimezone", `◷ ${eventDraft.timezone || "Timezone not selected"}`);
    setText("venueName", eventDraft.venue || "Venue not added");
    setText("venueAddress", eventDraft.address || "Venue address not added");
    setText("venueExtra", eventDraft.venueExtra);
    setText("eventIdBadge", eventCode);
    setText("previewDateOverlay", startDate ? formatDate(startDate) : "Date not selected");
    setText("previewLocation", `⌖ ${eventDraft.venue || eventDraft.address || "Venue not added"}`);
    setText("previewOrganizer", eventDraft.organizerName);

    setText("modalDateLocation", `${dateText} · ${eventDraft.venue || eventDraft.address || "Venue not added"}`);
    setText("modalDescription", eventDraft.description || "No description provided.");
    setText(
      "modalPrice",
      getLowestTicketPrice() === null
        ? "Ticket price not set"
        : `From ${formatCurrency(getLowestTicketPrice())}`
    );

    const lowestPrice = getLowestTicketPrice();
    setText(
      "previewPrice",
      lowestPrice === null ? "Price TBD" : formatCurrency(lowestPrice)
    );

    setText(
      "ticketSummary",
      `${getTicketTotal().toLocaleString("en-NG")} total tickets across ${eventDraft.tickets.length} ticket tier${eventDraft.tickets.length === 1 ? "" : "s"}`
    );

    setText("payoutName", eventDraft.payoutName || "Payout account");
    setText("payoutDetails", eventDraft.payoutDetails || "Payout information has not been provided.");
    setText(
      "payoutStatus",
      eventDraft.payoutVerified ? "✓ Verified payout" : "Payout not verified"
    );
    setText(
      "platformFee",
      eventDraft.platformFee
        ? String(eventDraft.platformFee)
        : "Confirm in payout settings"
    );

    currentImageUrl = eventDraft.image || "";
    setImage("eventImage", currentImageUrl);
    setImage("attendeeImage", currentImageUrl);
    setImage("modalImage", currentImageUrl);

    renderTags();
    renderTickets();
    renderReadiness();
  }

  function persistDraft(showMessage = true) {
    const draftToSave = {
      ...eventDraft,
      publishingMode: selectedMode,
      scheduledPublishAt: $("publishAt").value || "",
      lastSavedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(
        "eventra_create_event_draft",
        JSON.stringify(draftToSave)
      );

      sessionStorage.setItem(
        "eventra_create_event_draft",
        JSON.stringify(draftToSave)
      );

      DRAFT_KEYS.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(draftToSave));
        }
      });

      const timestamp = new Date().toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit"
      });

      setText("draftSavedText", `◷ Draft Auto-Saved at ${timestamp}`);

      if (showMessage) {
        showToast("Your event draft has been saved on this device.", "success");
      }

      return true;
    } catch (error) {
      console.error("Draft save failed:", error);
      showToast("Could not save the draft in this browser.", "error");
      return false;
    }
  }

  function selectPublishingMode(mode) {
    selectedMode = mode;

    document.querySelectorAll("[data-mode]").forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));

      const radio = button.querySelector(".mode-radio");

      if (radio) {
        radio.className = selected
          ? "mode-radio grid h-4 w-4 place-items-center rounded-full border-2 border-eventra bg-eventra text-[9px] text-white"
          : "mode-radio grid h-4 w-4 place-items-center rounded-full border-2 border-[#D8E0EE]";
        radio.textContent = selected ? "●" : "";
      }
    });

    $("scheduleFields").classList.toggle("hidden", mode !== "scheduled");

    renderReadiness();
  }

  function getAccessToken() {
    return (
      localStorage.getItem("eventra_access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("eventra_token") ||
      sessionStorage.getItem("eventra_access_token") ||
      sessionStorage.getItem("access_token") ||
      ""
    );
  }

  function getPublishPayload() {
    const capacity = eventDraft.tickets.reduce(
      (sum, t) => sum + Math.max(0, Number(t.quantity) || 0),
      0
    );

    return {
      title: eventDraft.title,
      description: eventDraft.description,
      category: eventDraft.category,
      event_image_url: eventDraft.image || null,
      start_date: eventDraft.startDate || null,
      end_date: eventDraft.endDate || eventDraft.startDate || null,
      venue_name: eventDraft.venue || null,
      venue_address: eventDraft.address || null,
      capacity,
      status: "published",
      ticket_types: eventDraft.tickets.map((ticket) => ({
        name: ticket.name,
        description: ticket.description || "",
        price: Number(ticket.price),
        quantity: Number(ticket.quantity)
      }))
    };
  }

  function validateForPublishing() {
    if (!eventDraft.title.trim()) {
      showToast("The event name is missing. Return to Basic Info.", "error");
      return false;
    }

    if (!eventDraft.category.trim()) {
      showToast("Select an event category before publishing.", "error");
      return false;
    }

    if (!eventDraft.description.trim()) {
      showToast("Add an event description before publishing.", "error");
      return false;
    }

    if (!eventDraft.startDate) {
      showToast("Add the event date before publishing.", "error");
      return false;
    }

    if (!eventDraft.venue.trim() && !eventDraft.address.trim()) {
      showToast("Add the venue or event location before publishing.", "error");
      return false;
    }

    if (!eventDraft.tickets.length) {
      showToast("Add at least one ticket tier before publishing.", "error");
      return false;
    }

    const invalidTicket = eventDraft.tickets.some(
      (ticket) =>
        !ticket.name.trim() ||
        !Number.isFinite(ticket.price) ||
        ticket.price < 0 ||
        !Number.isFinite(ticket.quantity) ||
        ticket.quantity < 1
    );

    if (invalidTicket) {
      showToast("Check the name, price and quantity for each ticket tier.", "error");
      return false;
    }

    if (selectedMode === "scheduled") {
      const scheduledTime = new Date($("publishAt").value);

      if (
        !$("publishAt").value ||
        Number.isNaN(scheduledTime.getTime()) ||
        scheduledTime <= new Date()
      ) {
        showToast("Choose a valid future publishing date and time.", "error");
        $("publishAt").focus();
        return false;
      }

      showToast(
        "Scheduled publishing must be supported by the backend. Save the draft while that capability is confirmed.",
        "info"
      );
      return false;
    }

    return true;
  }

  async function uploadImageIfNeeded(token) {
    const image = eventDraft.image;
    if (!image || !image.startsWith("data:image/")) return image || null;

    try {
      const res = await fetch(image);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const file = new File([blob], `event-banner.${ext}`, { type: blob.type });

      const form = new FormData();
      form.append("event_banner", file);

      const uploadRes = await fetch(`${API_BASE_URL}/uploads/event-banner`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const uploadData = await uploadRes.json().catch(() => ({}));

      if (uploadRes.ok && uploadData?.data?.url) {
        return uploadData.data.url;
      }
    } catch (_) {}

    return null;
  }

  async function publishEvent() {
    if (isPublishing) return;

    if (!validateForPublishing()) return;

    const token = getAccessToken();

    if (!token) {
      showToast("Please sign in to your organizer account before publishing.", "error");
      return;
    }

    const confirmed = window.confirm(
      selectedMode === "private"
        ? "Submit this event as private/unlisted? The backend must support private visibility for this choice to take effect."
        : "Publish this event now? The event will only be considered published after the server confirms success."
    );

    if (!confirmed) return;

    isPublishing = true;
    setPublishButtonsDisabled(true);
    showToast("Uploading event image…", "info");

    const imageUrl = await uploadImageIfNeeded(token);
    if (imageUrl) eventDraft.image = imageUrl;

    showToast("Submitting your event to Eventra…", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(getPublishPayload())
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
          result.error ||
          `Publishing failed with HTTP ${response.status}.`
        );
      }

      if (
        result.status === "error" ||
        result.success === false
      ) {
        throw new Error(result.message || "The server did not accept the event.");
      }

      const publishedEvent =
        result.data?.event ||
        result.data ||
        result.event ||
        result;

      const returnedId =
        publishedEvent.id ||
        publishedEvent.event_id ||
        eventDraft.eventId;

      if (returnedId) {
        eventDraft.eventId = returnedId;
      }

      eventDraft.publishStatus = "submitted";
      eventDraft.publishedAt = new Date().toISOString();
      eventDraft.serverResponse = result;

      persistDraft(false);

      // Save published event data so Step 5 can read it.
      const publishedPayload = {
        ...eventDraft,
        id: returnedId || eventDraft.eventId,
        title: eventDraft.title,
        organizer: eventDraft.organizerName,
        organizerEmail: eventDraft.organizerEmail,
        venue: eventDraft.venue,
        address: eventDraft.address,
        date: eventDraft.startDate,
        time: eventDraft.startTime,
        tickets: eventDraft.tickets,
        publicUrl: publishedEvent.public_url || publishedEvent.publicUrl || publishedEvent.event_url ||
          (returnedId ? `https://eventra-backend-aidf.onrender.com/api/events/${returnedId}` : "")
      };

      try {
        localStorage.setItem("eventra_published_event", JSON.stringify(publishedPayload));
        sessionStorage.setItem("eventra_published_event", JSON.stringify(publishedPayload));
      } catch (_) {}

      showToast(
        "The server accepted your event submission. Confirm its status in your Events dashboard.",
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "../07_Creat%20Event_Step5/index.html";
      }, 1600);
    } catch (error) {
      console.error("Event publishing error:", error);
      showToast(
        error.message || "Could not publish the event. Your draft remains available.",
        "error"
      );
    } finally {
      isPublishing = false;
      setPublishButtonsDisabled(false);
    }
  }

  function setPublishButtonsDisabled(disabled) {
    [
      "publishNowBtn",
      "footerPublishBtn"
    ].forEach((id) => {
      const button = $(id);
      if (!button) return;

      button.disabled = disabled;
      button.classList.toggle("opacity-60", disabled);
      button.classList.toggle("cursor-not-allowed", disabled);
    });

    setText(
      "publishNowBtn",
      disabled ? "Submitting Event…" : "🚀 Publish Event Now"
    );

    setText(
      "footerPublishBtn",
      disabled ? "Submitting…" : "Publish Event Now ↗"
    );
  }

  function navigateToStep(step) {
    const target = "../03_Create Event/index.html?step=" + encodeURIComponent(step);
    window.location.href = target;
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");

    const closeButton = modal.querySelector("button");
    if (closeButton) closeButton.focus();
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");

    const anyModalOpen = [
      "previewModal",
      "guidelinesModal"
    ].some((modalId) => !$(modalId).classList.contains("hidden"));

    if (!anyModalOpen) {
      document.body.classList.remove("overflow-hidden");
    }
  }

  function openPreview() {
    setText("modalEventName", eventDraft.title || "Your Event");
    setText(
      "modalDateLocation",
      `${eventDraft.startDate ? formatDate(eventDraft.startDate) : "Date not selected"} · ${eventDraft.venue || eventDraft.address || "Venue not added"}`
    );
    setText(
      "modalDescription",
      eventDraft.description || "No description provided."
    );

    const lowestPrice = getLowestTicketPrice();

    setText(
      "modalPrice",
      lowestPrice === null ? "Ticket price not set" : `From ${formatCurrency(lowestPrice)}`
    );

    setImage("modalImage", currentImageUrl);
    openModal("previewModal");
  }

  function setupEvents() {
    document.querySelectorAll("[data-edit-step]").forEach((button) => {
      button.addEventListener("click", () => {
        navigateToStep(button.dataset.editStep);
      });
    });

    document.querySelectorAll("[data-goto-step]").forEach((button) => {
      button.addEventListener("click", () => {
        navigateToStep(button.dataset.gotoStep);
      });
    });

    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        selectPublishingMode(button.dataset.mode);
        persistDraft(false);
      });
    });

    $("publishAt").addEventListener("change", renderReadiness);

    $("previewBtn").addEventListener("click", openPreview);
    $("closePreviewBtn").addEventListener("click", () => closeModal("previewModal"));
    $("closePreviewFooterBtn").addEventListener("click", () => closeModal("previewModal"));

    $("guidelinesBtn").addEventListener("click", () => openModal("guidelinesModal"));
    $("closeGuidelinesBtn").addEventListener("click", () => closeModal("guidelinesModal"));
    $("closeGuidelinesFooterBtn").addEventListener("click", () => closeModal("guidelinesModal"));

    ["previewModal", "guidelinesModal"].forEach((id) => {
      $(id).addEventListener("click", (event) => {
        if (event.target === $(id)) closeModal(id);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal("previewModal");
        closeModal("guidelinesModal");
      }
    });

    $("publishNowBtn").addEventListener("click", publishEvent);
    $("footerPublishBtn").addEventListener("click", publishEvent);

    $("saveDraftBtn").addEventListener("click", () => {
      if (persistDraft(true)) {
        window.setTimeout(() => {
          window.location.href = "../02_Organizer Dashboard/index.html";
        }, 900);
      }
    });

    $("footerSaveBtn").addEventListener("click", () => {
      persistDraft(true);
    });

    $("backBtn").addEventListener("click", () => navigateToStep(3));

    $("bookmarkBtn").addEventListener("click", () => {
      showToast("This is a preview. The event has not been published or saved to attendee wishlists.", "info");
    });

    /*
      Event delegation keeps the Add Ticket Tiers button functional
      even when the empty-state ticket markup is generated dynamically.
    */
    $("ticketList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-step]");
      if (button) navigateToStep(button.dataset.editStep);
    });
  }

  function restoreMode() {
    const storedMode =
      eventDraft.publishingMode ||
      eventDraft.publishing_mode ||
      "immediate";

    const validModes = ["immediate", "scheduled", "private"];

    selectPublishingMode(
      validModes.includes(storedMode) ? storedMode : "immediate"
    );

    if (eventDraft.scheduledPublishAt) {
      $("publishAt").value = eventDraft.scheduledPublishAt;
    }
  }

  function initialize() {
    eventDraft = loadDraft();

    renderDraft();
    restoreMode();
    setupEvents();

    if (eventDraft.lastSavedAt) {
      const date = new Date(eventDraft.lastSavedAt);

      if (!Number.isNaN(date.getTime())) {
        setText(
          "draftSavedText",
          `◷ Draft Auto-Saved at ${date.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit"
          })}`
        );
      }
    }

    /*
      Save the selected publishing mode when the user changes it,
      without overwriting the current screen until initialization ends.
    */
    window.addEventListener("beforeunload", () => {
      try {
        const draft = {
          ...eventDraft,
          publishingMode: selectedMode,
          scheduledPublishAt: $("publishAt").value || ""
        };

        sessionStorage.setItem(
          "eventra_create_event_draft",
          JSON.stringify(draft)
        );
      } catch (error) {
        console.warn("Could not preserve draft on navigation:", error);
      }
    });
  }

  initialize();
});