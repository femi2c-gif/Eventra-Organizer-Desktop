
"use strict";

/*
 * EVENTRA ORGANIZER
 * SCREEN 04 — CREATE EVENT, STEP 2: DATE & LOCATION
 *
 * Uses the same local draft created by Step 1.
 * No backend event is created until the final publish flow.
 */

const STORAGE_KEY = "eventra_organizer_create_event_draft";

const $ = (id) => document.getElementById(id);

const form = $("eventDetailsForm");

const startDate = $("startDate");
const endDate = $("endDate");
const startTime = $("startTime");
const endTime = $("endTime");

const venueName = $("venueName");
const venueAddress = $("venueAddress");
const city = $("city");
const stateRegion = $("stateRegion");
const country = $("country");
const venueType = $("venueType");
const virtualUrl = $("virtualUrl");
const virtualUrlGroup = $("virtualUrlGroup");
const locationNotes = $("locationNotes");

const notesCounter = $("notesCounter");
const autosave = $("autosave");
const topDateSummary = $("topDateSummary");
const scheduleSummary = $("scheduleSummary");
const scheduleSummaryText = $("scheduleSummaryText");

const saveDraftBtn = $("saveDraftBtn");
const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const previewBtn = $("previewBtn");
const guidelinesBtn = $("guidelinesBtn");

const toast = $("toast");

let toastTimer = null;
let isRestoringDraft = false;

/* =====================================================
   TOAST MESSAGE
===================================================== */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* =====================================================
   DRAFT HELPERS
===================================================== */

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    console.warn("Could not read the saved Eventra draft:", error);
    return {};
  }
}

function collectStepTwoData() {
  return {
    startDate: startDate.value,
    endDate: endDate.value,
    startTime: startTime.value,
    endTime: endTime.value,
    venueName: venueName.value.trim(),
    venueAddress: venueAddress.value.trim(),
    city: city.value.trim(),
    stateRegion: stateRegion.value.trim(),
    country: country.value,
    venueType: venueType.value,
    virtualUrl: virtualUrl.value.trim(),
    locationNotes: locationNotes.value.trim()
  };
}

function saveDraft(showMessage = false) {
  if (isRestoringDraft) return;

  const draft = readDraft();

  Object.assign(draft, collectStepTwoData(), {
    currentStep: 2,
    updatedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    if (autosave) {
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

      autosave.textContent = `Draft Auto-Saved at ${time}`;
    }

    updateScheduleSummary();

    if (showMessage) {
      showToast("Your event draft has been saved.");
    }

    return true;
  } catch (error) {
    console.error("Could not save the Eventra draft:", error);
    showToast("Could not save this draft. Check your browser storage.");
    return false;
  }
}

/* =====================================================
   RESTORE STEP 1 AND STEP 2 DATA
===================================================== */

function restoreDraft() {
  isRestoringDraft = true;

  const draft = readDraft();

  const fields = {
    startDate,
    endDate,
    startTime,
    endTime,
    venueName,
    venueAddress,
    city,
    stateRegion,
    country,
    venueType,
    virtualUrl,
    locationNotes
  };

  Object.entries(fields).forEach(([key, element]) => {
    if (element && draft[key] !== undefined && draft[key] !== null) {
      element.value = draft[key];
    }
  });

  if (draft.updatedAt && autosave) {
    const date = new Date(draft.updatedAt);

    if (!Number.isNaN(date.getTime())) {
      autosave.textContent =
        `Last saved at ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
    }
  }

  isRestoringDraft = false;

  updateVirtualFields();
  updateDateConstraints();
  updateNotesCounter();
  updateScheduleSummary();
}

/* =====================================================
   DATE CONSTRAINTS AND VALIDATION
===================================================== */

function updateDateConstraints() {
  if (startDate.value) {
    endDate.min = startDate.value;
  } else {
    endDate.removeAttribute("min");
  }

  if (endDate.value) {
    startDate.max = endDate.value;
  } else {
    startDate.removeAttribute("max");
  }

  if (
    startDate.value &&
    endDate.value &&
    endDate.value < startDate.value
  ) {
    endDate.setCustomValidity(
      "The end date must be the same as or after the start date."
    );
  } else {
    endDate.setCustomValidity("");
  }

  updateScheduleSummary();
}

function validateStepTwo() {
  const requiredFields = [
    {
      element: startDate,
      message: "Please select the event start date."
    },
    {
      element: endDate,
      message: "Please select the event end date."
    },
    {
      element: startTime,
      message: "Please select the event start time."
    },
    {
      element: endTime,
      message: "Please select the event end time."
    },
    {
      element: venueName,
      message: "Please enter the venue name."
    },
    {
      element: venueAddress,
      message: "Please enter the venue street address."
    },
    {
      element: city,
      message: "Please enter the event city."
    },
    {
      element: country,
      message: "Please select the event country."
    },
    {
      element: venueType,
      message: "Please select the event format."
    }
  ];

  for (const field of requiredFields) {
    if (!field.element.value.trim()) {
      showToast(field.message);
      field.element.focus();
      return false;
    }
  }

  if (endDate.value < startDate.value) {
    showToast("The end date cannot be before the start date.");
    endDate.focus();
    return false;
  }

  if (
    endDate.value === startDate.value &&
    endTime.value &&
    startTime.value &&
    endTime.value <= startTime.value
  ) {
    showToast(
      "For a same-day event, the end time must be after the start time. If it ends after midnight, select the next end date."
    );
    endTime.focus();
    return false;
  }

  if (
    (venueType.value === "virtual" || venueType.value === "hybrid") &&
    !virtualUrl.value.trim()
  ) {
    showToast("Please enter the virtual event link.");
    virtualUrl.focus();
    return false;
  }

  if (
    (venueType.value === "virtual" || venueType.value === "hybrid") &&
    virtualUrl.value.trim()
  ) {
    try {
      const parsedUrl = new URL(virtualUrl.value.trim());

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid URL protocol");
      }
    } catch (error) {
      showToast("Please enter a valid link beginning with https://");
      virtualUrl.focus();
      return false;
    }
  }

  return true;
}

/* =====================================================
   SCHEDULE SUMMARY
===================================================== */

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(timeString) {
  if (!timeString) return "";

  const [hours, minutes] = timeString.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return timeString;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function updateScheduleSummary() {
  const hasSchedule =
    startDate.value ||
    endDate.value ||
    startTime.value ||
    endTime.value;

  if (scheduleSummary) {
    scheduleSummary.classList.toggle("hidden", !hasSchedule);
  }

  if (scheduleSummaryText) {
    const datePart = [
      formatDate(startDate.value),
      formatDate(endDate.value)
    ].filter(Boolean);

    const timePart = [
      formatTime(startTime.value),
      formatTime(endTime.value)
    ].filter(Boolean);

    let summary = "";

    if (datePart.length === 2) {
      summary = datePart[0] === datePart[1]
        ? datePart[0]
        : `${datePart[0]} – ${datePart[1]}`;
    } else if (datePart.length === 1) {
      summary = datePart[0];
    }

    if (timePart.length === 2) {
      summary += `${summary ? " · " : ""}${timePart[0]} – ${timePart[1]}`;
    } else if (timePart.length === 1) {
      summary += `${summary ? " · " : ""}${timePart[0]}`;
    }

    if (venueName.value.trim()) {
      summary += `${summary ? " · " : ""}${venueName.value.trim()}`;
    }

    if (city.value.trim()) {
      summary += `${summary ? ", " : ""}${city.value.trim()}`;
    }

    scheduleSummaryText.textContent =
      summary || "Complete the dates, times and venue to preview the schedule.";
  }

  if (topDateSummary) {
    if (startDate.value && endDate.value) {
      topDateSummary.textContent =
        `${formatDate(startDate.value)} – ${formatDate(endDate.value)}`;
    } else {
      topDateSummary.textContent = "Date & Location";
    }
  }
}

/* =====================================================
   VIRTUAL / HYBRID EVENT FIELDS
===================================================== */

function updateVirtualFields() {
  const requiresLink =
    venueType.value === "virtual" ||
    venueType.value === "hybrid";

  virtualUrlGroup.classList.toggle("hidden", !requiresLink);
  virtualUrl.required = requiresLink;

  if (venueType.value === "virtual") {
    venueName.required = false;
    venueAddress.required = false;
    city.required = false;
    country.required = false;

    venueName.placeholder = "Optional for a virtual event";
    venueAddress.placeholder = "Optional for a virtual event";
    city.placeholder = "Optional for a virtual event";
  } else {
    venueName.required = true;
    venueAddress.required = true;
    city.required = true;
    country.required = true;

    venueName.placeholder = "e.g. Landmark Centre";
    venueAddress.placeholder = "Enter the street address";
    city.placeholder = "e.g. Lagos";
  }
}

/* =====================================================
   LOCATION NOTES COUNTER
===================================================== */

function updateNotesCounter() {
  if (notesCounter) {
    notesCounter.textContent = `${locationNotes.value.length}/500`;
  }
}

/* =====================================================
   INPUT EVENTS
===================================================== */

[
  startDate,
  endDate,
  startTime,
  endTime,
  venueName,
  venueAddress,
  city,
  stateRegion,
  country,
  venueType,
  virtualUrl,
  locationNotes
].forEach((element) => {
  element.addEventListener("input", () => {
    if (element === startDate || element === endDate) {
      updateDateConstraints();
    }

    if (element === venueType) {
      updateVirtualFields();
    }

    if (element === locationNotes) {
      updateNotesCounter();
    }

    updateScheduleSummary();
    saveDraft(false);
  });

  element.addEventListener("change", () => {
    if (element === startDate || element === endDate) {
      updateDateConstraints();
    }

    if (element === venueType) {
      updateVirtualFields();
    }

    updateScheduleSummary();
    saveDraft(false);
  });
});

/* =====================================================
   SAVE DRAFT BUTTON
===================================================== */

saveDraftBtn.addEventListener("click", () => {
  saveDraft(true);
});

/* =====================================================
   BACK BUTTON
===================================================== */

backBtn.addEventListener("click", () => {
  saveDraft(false);
  window.location.href = "../03_Create%20Event/index.html";
});

/* =====================================================
   CONTINUE BUTTON
===================================================== */

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateStepTwo()) {
    return;
  }

  if (!saveDraft(false)) {
    return;
  }

  const draft = readDraft();

  draft.currentStep = 3;
  draft.stepOneComplete = true;
  draft.stepTwoComplete = true;
  draft.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    showToast("Could not save the draft. Please try again.");
    return;
  }

  showToast("Date and location saved. Opening Tickets & Pricing…");

  window.setTimeout(() => {
    window.location.href = "../05_Create%20Event_Step%203/index.html";
  }, 350);
});

/* =====================================================
   PREVIEW
===================================================== */

previewBtn.addEventListener("click", () => {
  const draft = readDraft();

  const eventName = draft.eventName || "Your event";
  showToast(`Preview for "${eventName}" will be available when the event is ready.`);
});

/* =====================================================
   ORGANIZER GUIDELINES
===================================================== */

guidelinesBtn.addEventListener("click", () => {
  showToast(
    "Choose accurate dates and times, and provide a complete venue address so attendees can plan their visit."
  );
});

/* Notifications, help, profile and the mobile menu live in the shared
   top bar / sidebar (../shared/eventra-shell.js). */

/* =====================================================
   INITIALIZE
===================================================== */

restoreDraft();