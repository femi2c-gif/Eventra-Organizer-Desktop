"use strict";

/* =========================================================
   EVENTRA ORGANIZER — SCREEN 07
   CREATE EVENT: STEP 5 — PUBLISHED & LIVE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const DASHBOARD_URL = "../02_Organizer%20Dashboard/index.html";
  const CREATE_EVENT_URL = "../03_Create%20Event/index.html";
  const ANALYTICS_URL = "../02_Organizer%20Dashboard/index.html";

  const STORAGE_KEYS = {
    event: "eventra_created_event",
    draft: "eventra_event_draft",
    wizard: "eventra_create_event",
    stepOne: "eventra_step1",
    stepTwo: "eventra_step2",
    stepThree: "eventra_step3",
    stepFour: "eventra_step4",
    selectedEvent: "eventra_selected_event",
    selectedEventId: "eventra_selected_event_id",
    published: "eventra_published_event"
  };

  const DEFAULT_EVENT = {
    id: "tech-conference-2026",
    title: "Tech Conference 2026",
    organizer: "Apex Live Events",
    organizerEmail: "organizer@eventra.io",
    venue: "Landmark Centre",
    address: "Water Corporation Drive, Victoria Island",
    city: "Lagos",
    date: "Saturday, Oct 12, 2026",
    time: "09:00 AM – 06:00 PM WAT",
    capacity: 500,
    publicUrl: "https://eventra.ng/e/tech-conference-2026-89241",
    coverImage: "",
    payoutDetails: "Payment account details will appear here when configured.",
    tickets: [
      { name: "Standard Pass", quantity: 350, price: 15000 },
      { name: "VIP Delegate", quantity: 120, price: 40000 },
      { name: "Executive Access", quantity: 30, price: 75000 }
    ]
  };

  const $ = (id) => document.getElementById(id);

  let toastTimer = null;
  let currentEvent = loadEventData();

  /* -------------------------------------------------------
     STORAGE HELPERS
  ------------------------------------------------------- */

  function safeReadStorage(storage, key) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function saveStorage(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
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

  function normalizeTicket(ticket, index) {
    const source = ticket || {};

    return {
      name: String(
        firstValue(
          [source],
          ["name", "title", "ticket_name", "ticketName", "type"],
          `Ticket Tier ${index + 1}`
        )
      ),
      quantity: Math.max(
        0,
        Number(
          firstValue(
            [source],
            ["quantity", "capacity", "available", "total_quantity"],
            0
          )
        ) || 0
      ),
      price: Math.max(
        0,
        Number(
          firstValue(
            [source],
            ["price", "amount", "ticket_price", "ticketPrice"],
            0
          )
        ) || 0
      )
    };
  }

  function normalizeEvent(raw) {
    const source = raw && typeof raw === "object" ? raw : {};

    const nestedEvent =
      source.event ||
      source.data?.event ||
      source.data ||
      source;

    const event = {
      id: String(
        firstValue(
          [nestedEvent, source],
          ["id", "event_id", "eventId", "slug"],
          DEFAULT_EVENT.id
        )
      ),

      title: String(
        firstValue(
          [nestedEvent, source],
          ["title", "name", "event_name", "eventName"],
          DEFAULT_EVENT.title
        )
      ),

      organizer: String(
        firstValue(
          [nestedEvent, source],
          ["organizer_name", "organizerName", "organizer"],
          DEFAULT_EVENT.organizer
        )
      ),

      organizerEmail: String(
        firstValue(
          [nestedEvent, source],
          ["organizer_email", "organizerEmail", "email"],
          DEFAULT_EVENT.organizerEmail
        )
      ),

      venue: String(
        firstValue(
          [nestedEvent, source],
          ["venue_name", "venueName", "venue", "location_name"],
          DEFAULT_EVENT.venue
        )
      ),

      address: String(
        firstValue(
          [nestedEvent, source],
          ["venue_address", "venueAddress", "address", "location"],
          DEFAULT_EVENT.address
        )
      ),

      city: String(
        firstValue(
          [nestedEvent, source],
          ["city", "location_city"],
          DEFAULT_EVENT.city
        )
      ),

      date: String(
        firstValue(
          [nestedEvent, source],
          [
            "formatted_date",
            "formattedDate",
            "date_label",
            "dateLabel",
            "date",
            "start_date",
            "startDate"
          ],
          DEFAULT_EVENT.date
        )
      ),

      time: String(
        firstValue(
          [nestedEvent, source],
          ["formatted_time", "formattedTime", "time", "start_time", "startTime"],
          DEFAULT_EVENT.time
        )
      ),

      capacity: Math.max(
        0,
        Number(
          firstValue(
            [nestedEvent, source],
            ["capacity", "total_capacity", "totalCapacity", "quantity"],
            DEFAULT_EVENT.capacity
          )
        ) || 0
      ),

      publicUrl: String(
        firstValue(
          [nestedEvent, source],
          [
            "public_url",
            "publicUrl",
            "event_url",
            "eventUrl",
            "url",
            "share_url"
          ],
          DEFAULT_EVENT.publicUrl
        )
      ),

      coverImage: String(
        firstValue(
          [nestedEvent, source],
          [
            "event_image_url",
            "eventImageUrl",
            "cover_image",
            "coverImage",
            "image_url",
            "image"
          ],
          DEFAULT_EVENT.coverImage
        )
      ),

      payoutDetails: String(
        firstValue(
          [nestedEvent, source],
          ["payout_details", "payoutDetails", "payout_account", "payoutAccount"],
          DEFAULT_EVENT.payoutDetails
        )
      ),

      tickets: []
    };

    const ticketCandidates = [
      nestedEvent.ticket_types,
      nestedEvent.ticketTypes,
      nestedEvent.TicketTypes,
      nestedEvent.tickets,
      source.ticket_types,
      source.ticketTypes,
      source.TicketTypes,
      source.tickets
    ];

    const rawTickets = ticketCandidates.find(
      (candidate) => Array.isArray(candidate)
    );

    if (rawTickets) {
      event.tickets = rawTickets.map(normalizeTicket);
    } else {
      const stepThree =
        safeReadStorage(localStorage, STORAGE_KEYS.stepThree) ||
        safeReadStorage(sessionStorage, STORAGE_KEYS.stepThree) ||
        {};

      const draftTickets =
        stepThree.tickets ||
        stepThree.ticket_types ||
        stepThree.ticketTypes ||
        stepThree.TicketTypes;

      if (Array.isArray(draftTickets)) {
        event.tickets = draftTickets.map(normalizeTicket);
      }
    }

    if (!event.tickets.length) {
      event.tickets = DEFAULT_EVENT.tickets.map(normalizeTicket);
    }

    if (!event.publicUrl || event.publicUrl === "undefined") {
      event.publicUrl = DEFAULT_EVENT.publicUrl;
    }

    return event;
  }

  function loadEventData() {
    const candidates = [
      safeReadStorage(localStorage, STORAGE_KEYS.published),
      safeReadStorage(sessionStorage, STORAGE_KEYS.published),
      safeReadStorage(localStorage, STORAGE_KEYS.event),
      safeReadStorage(sessionStorage, STORAGE_KEYS.event),
      safeReadStorage(localStorage, STORAGE_KEYS.selectedEvent),
      safeReadStorage(sessionStorage, STORAGE_KEYS.selectedEvent),
      safeReadStorage(localStorage, STORAGE_KEYS.draft),
      safeReadStorage(sessionStorage, STORAGE_KEYS.draft),
      safeReadStorage(localStorage, STORAGE_KEYS.wizard),
      safeReadStorage(sessionStorage, STORAGE_KEYS.wizard),
      safeReadStorage(localStorage, STORAGE_KEYS.stepOne),
      safeReadStorage(sessionStorage, STORAGE_KEYS.stepOne)
    ];

    const stored = candidates.find(
      (candidate) => candidate && typeof candidate === "object"
    );

    return normalizeEvent(stored || DEFAULT_EVENT);
  }

  /* -------------------------------------------------------
     FORMATTING
  ------------------------------------------------------- */

  function escapeHTML(value) {
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

  function formatMoney(amount) {
    return "₦" + Math.round(Number(amount) || 0).toLocaleString("en-NG");
  }

  function formatCapacity(amount) {
    return Math.max(0, Number(amount) || 0).toLocaleString("en-NG");
  }

  function calculateGrossSales(event) {
    return event.tickets.reduce((total, ticket) => {
      return total + ticket.price * ticket.quantity;
    }, 0);
  }

  function buildEventSlug(title) {
    return String(title || "event")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event";
  }

  function buildEventLink(event) {
    if (event.publicUrl && /^https?:\/\//i.test(event.publicUrl)) {
      return event.publicUrl;
    }

    return DEFAULT_EVENT.publicUrl;
  }

  function showToast(message, title = "Eventra") {
    const toast = $("toast");

    if (!toast) return;

    $("toastTitle").textContent = title;
    $("toastMessage").textContent = message;

    toast.classList.add("toast-visible");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("toast-visible");
    }, 3200);
  }

  /* -------------------------------------------------------
     RENDER TICKET TIERS
  ------------------------------------------------------- */

  function renderTicketTiers() {
    const container = $("ticketTiers");
    if (!container) return;

    container.innerHTML = currentEvent.tickets.map((ticket) => `
      <div class="flex items-start justify-between gap-3 text-[14px]">
        <span class="min-w-0 font-medium leading-5 text-navy">
          ${escapeHTML(ticket.name)} (${formatCapacity(ticket.quantity)} qty)
        </span>
        <span class="shrink-0 font-bold text-eventra">
          ${formatMoney(ticket.price)}
        </span>
      </div>
    `).join("");
  }

  /* -------------------------------------------------------
     RENDER EVENT DETAILS
  ------------------------------------------------------- */

  function renderEvent() {
    const event = currentEvent;
    const eventName = event.title || DEFAULT_EVENT.title;

    const eventLink = buildEventLink(event);

    const totalCapacity =
      event.capacity ||
      event.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

    const grossSales = calculateGrossSales(event);

    const setText = (id, value) => {
      const element = $(id);
      if (element) element.textContent = value;
    };

    setText("progressEventName", eventName);
    setText("heroEventName", eventName);
    setText("previewEventName", eventName);
    setText("previewOrganizer", event.organizer);
    setText("heroCapacity", `${formatCapacity(totalCapacity)} Tickets`);
    setText("heroVenue", `${event.venue}, ${event.city}`);
    setText("coverLocation", `${event.city}, NG`);
    setText("previewDate", event.date);
    setText("previewTime", event.time);
    setText("previewVenue", event.venue);
    setText("previewAddress", event.address);
    setText("payoutDetails", event.payoutDetails);
    setText("grossSales", formatMoney(grossSales));

    setText(
      "capacityNote",
      `100% capacity value (${event.tickets.length} ${
        event.tickets.length === 1 ? "tier" : "tiers"
      })`
    );

    const publicLink = $("publicEventLink");
    if (publicLink) publicLink.value = eventLink;

    const cover = $("eventCoverImage");
    const coverFallback = $("coverFallback");

    if (cover) {
      if (event.coverImage) {
        cover.src = event.coverImage;
        cover.classList.remove("hidden");

        if (coverFallback) {
          coverFallback.classList.add("hidden");
        }

        cover.onerror = () => {
          cover.classList.add("hidden");

          if (coverFallback) {
            coverFallback.classList.remove("hidden");
          }
        };
      } else {
        cover.removeAttribute("src");
        cover.classList.add("hidden");

        if (coverFallback) {
          coverFallback.classList.remove("hidden");
        }
      }
    }

    renderTicketTiers();
    renderQRCode(eventLink);
  }

  /* -------------------------------------------------------
     QR CODE
  ------------------------------------------------------- */

  function renderQRCode(url) {
    const qrContainer = $("qrCode");
    if (!qrContainer) return;

    qrContainer.innerHTML = "";

    if (typeof QRCode === "undefined") {
      qrContainer.innerHTML = `
        <div class="flex h-full w-full flex-col items-center justify-center text-center text-[12px] text-slate-500">
          <span class="text-3xl">▦</span>
          <span class="mt-2">QR library unavailable</span>
        </div>
      `;
      return;
    }

    try {
      new QRCode(qrContainer, {
        text: url,
        width: 320,
        height: 320,
        colorDark: "#081B31",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (error) {
      qrContainer.innerHTML = `
        <div class="p-3 text-center text-[12px] text-slate-500">
          Unable to generate QR code. Use Copy Link instead.
        </div>
      `;
    }
  }

  function getQRCodeCanvas() {
    const container = $("qrCode");
    if (!container) return null;

    const canvas = container.querySelector("canvas");

    if (canvas) return canvas;

    const image = container.querySelector("img");

    if (image && image.complete && image.naturalWidth) {
      const canvasCopy = document.createElement("canvas");

      canvasCopy.width = image.naturalWidth;
      canvasCopy.height = image.naturalHeight;

      const context = canvasCopy.getContext("2d");
      context.drawImage(image, 0, 0);

      return canvasCopy;
    }

    return null;
  }

  function downloadQRCode() {
    const canvas = getQRCodeCanvas();

    if (!canvas) {
      showToast(
        "The QR code is not ready yet. Check your internet connection and try again.",
        "QR Code"
      );
      return;
    }

    try {
      const downloadLink = document.createElement("a");

      downloadLink.download =
        `${buildEventSlug(currentEvent.title)}-eventra-qr.png`;

      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.click();

      showToast("Your QR code PNG has been downloaded.", "Download complete");
    } catch (error) {
      showToast(
        "Unable to download the QR code in this browser.",
        "Download unavailable"
      );
    }
  }

  function printQRCode() {
    const canvas = getQRCodeCanvas();

    if (!canvas) {
      showToast("The QR code is not ready yet. Please try again.", "QR Flyer");
      return;
    }

    const qrData = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=700,height=800");

    if (!printWindow) {
      showToast(
        "Allow pop-ups in your browser to print the QR flyer.",
        "Print blocked"
      );
      return;
    }

    const eventName = escapeHTML(currentEvent.title);
    const eventUrl = escapeHTML(buildEventLink(currentEvent));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${eventName} — Eventra QR Flyer</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px;
            color: #10223B;
            background: white;
            font-family: Arial, Helvetica, sans-serif;
            text-align: center;
          }
          .flyer {
            max-width: 520px;
            margin: 0 auto;
            border: 2px solid #E7EAF3;
            border-radius: 20px;
            padding: 32px;
          }
          .brand { color: #6D28FF; font-size: 15px; font-weight: 800; }
          h1 { margin: 20px 0 8px; font-size: 30px; line-height: 1.2; }
          p { font-size: 15px; line-height: 1.5; color: #5D687A; }
          img { display: block; width: 260px; max-width: 100%; margin: 28px auto; }
          .url { overflow-wrap: anywhere; font-size: 12px; }
          @media print {
            body { padding: 0; }
            .flyer { border: none; }
          }
        </style>
      </head>
      <body>
        <main class="flyer">
          <div class="brand">EVENTRA · DISCOVER. BOOK. EXPERIENCE.</div>
          <h1>${eventName}</h1>
          <p>Scan the QR code to view event details and tickets.</p>
          <img src="${qrData}" alt="Event QR code">
          <p class="url">${eventUrl}</p>
        </main>
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 350);
          };
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  /* -------------------------------------------------------
     COPY PUBLIC LINK
  ------------------------------------------------------- */

  async function copyEventLink() {
    const link = buildEventLink(currentEvent);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const temporaryInput = document.createElement("textarea");

        temporaryInput.value = link;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.left = "-9999px";

        document.body.appendChild(temporaryInput);
        temporaryInput.select();

        const copied = document.execCommand("copy");
        temporaryInput.remove();

        if (!copied) {
          throw new Error("Copy command failed");
        }
      }

      showToast(
        "The public event link has been copied to your clipboard.",
        "Link copied"
      );
    } catch (error) {
      const input = $("publicEventLink");

      if (input) {
        input.focus();
        input.select();
      }

      showToast("Select the event link and copy it manually.", "Copy link");
    }
  }

  /* -------------------------------------------------------
     PREVIEW EVENT
  ------------------------------------------------------- */

  function previewEvent() {
    const link = buildEventLink(currentEvent);

    const previewWindow = window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );

    if (!previewWindow) {
      showToast(
        "Your browser blocked the preview window. Allow pop-ups or copy the public link.",
        "Preview blocked"
      );
    }
  }

  /* -------------------------------------------------------
     SHARE EVENT
  ------------------------------------------------------- */

  function shareEvent(channel) {
    const url = buildEventLink(currentEvent);
    const title = currentEvent.title || "Event on Eventra";

    const message =
      `Join me at ${title}! View event details and tickets here: ${url}`;

    const shareUrls = {
      whatsapp:
        `https://wa.me/?text=${encodeURIComponent(message)}`,

      x:
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `Join me at ${title}!`
        )}&url=${encodeURIComponent(url)}`,

      linkedin:
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,

      stories:
        `https://wa.me/?text=${encodeURIComponent(message)}`,

      email:
        `mailto:?subject=${encodeURIComponent(
          `You're invited: ${title}`
        )}&body=${encodeURIComponent(message)}`
    };

    const target = shareUrls[channel];

    if (!target) {
      showToast("This sharing option is not available.", "Share event");
      return;
    }

    if (channel === "stories") {
      showToast(
        "Share the event link to WhatsApp Status or copy it to your preferred Stories platform.",
        "Share to Stories"
      );
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");

    if (!opened && channel !== "email") {
      window.location.href = target;
    }
  }

  /* -------------------------------------------------------
     SETTINGS MODAL
  ------------------------------------------------------- */

  function openSettingsModal() {
    $("settingsEventName").value = currentEvent.title;
    $("settingsVenue").value = currentEvent.venue;
    $("settingsAddress").value = currentEvent.address;
    $("settingsDate").value = currentEvent.date;
    $("settingsLink").value = buildEventLink(currentEvent);

    $("settingsModal").classList.remove("hidden");
    $("settingsModal").classList.add("flex");

    window.setTimeout(() => {
      $("settingsEventName").focus();
    }, 50);
  }

  function closeSettingsModal() {
    $("settingsModal").classList.add("hidden");
    $("settingsModal").classList.remove("flex");
  }

  function saveEventSettings(event) {
    event.preventDefault();

    currentEvent.title =
      $("settingsEventName").value.trim() || DEFAULT_EVENT.title;

    currentEvent.venue =
      $("settingsVenue").value.trim() || DEFAULT_EVENT.venue;

    currentEvent.address =
      $("settingsAddress").value.trim() || DEFAULT_EVENT.address;

    currentEvent.date =
      $("settingsDate").value.trim() || DEFAULT_EVENT.date;

    currentEvent.publicUrl =
      $("settingsLink").value.trim() || DEFAULT_EVENT.publicUrl;

    const saved = saveStorage(
      localStorage,
      STORAGE_KEYS.published,
      currentEvent
    );

    saveStorage(sessionStorage, STORAGE_KEYS.published, currentEvent);

    renderEvent();
    closeSettingsModal();

    if (saved) {
      showToast(
        "Event details have been updated on this screen.",
        "Changes saved"
      );
    } else {
      showToast(
        "Changes are active for this page, but the browser could not save them permanently.",
        "Changes applied"
      );
    }
  }

  /* -------------------------------------------------------
     MOBILE NAVIGATION
  ------------------------------------------------------- */

  /* The mobile menu, profile, help and notifications live in the shared shell. */
  function closeMobileMenu() {}

  /* -------------------------------------------------------
     NAVIGATION ACTIONS
  ------------------------------------------------------- */

  function createAnotherEvent() {
    try {
      [
        STORAGE_KEYS.draft,
        STORAGE_KEYS.stepOne,
        STORAGE_KEYS.stepTwo,
        STORAGE_KEYS.stepThree,
        STORAGE_KEYS.stepFour,
        STORAGE_KEYS.wizard
      ].forEach((key) => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      // Continue to the create-event page if storage is unavailable.
    }

    window.location.href = CREATE_EVENT_URL;
  }

  function goToDashboard() {
    window.location.href = DASHBOARD_URL;
  }

  function goToAnalytics() {
    window.location.href = ANALYTICS_URL;
  }

  /* -------------------------------------------------------
     EVENT LISTENERS
  ------------------------------------------------------- */

  $("copyLinkButton")?.addEventListener("click", copyEventLink);
  $("previewLinkButton")?.addEventListener("click", previewEvent);
  $("previewEventButton")?.addEventListener("click", previewEvent);

  $("editEventButton")?.addEventListener("click", openSettingsModal);
  $("editSettingsButton")?.addEventListener("click", openSettingsModal);
  $("closeSettingsModal")?.addEventListener("click", closeSettingsModal);
  $("cancelSettingsButton")?.addEventListener("click", closeSettingsModal);
  $("settingsForm")?.addEventListener("submit", saveEventSettings);

  $("settingsModal")?.addEventListener("click", (event) => {
    if (event.target === $("settingsModal")) {
      closeSettingsModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettingsModal();
      closeMobileMenu();
    }
  });

  document.querySelectorAll("[data-share]").forEach((button) => {
    button.addEventListener("click", () => {
      shareEvent(button.dataset.share);
    });
  });

  $("downloadQrButton")?.addEventListener("click", downloadQRCode);
  $("printQrButton")?.addEventListener("click", printQRCode);

  $("salesStreamButton")?.addEventListener("click", goToAnalytics);
  $("analyticsButton")?.addEventListener("click", goToAnalytics);

  $("createAnotherEventButton")?.addEventListener(
    "click",
    createAnotherEvent
  );

  /* -------------------------------------------------------
     INITIALIZE
  ------------------------------------------------------- */

  renderEvent();
});