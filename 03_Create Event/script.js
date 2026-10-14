const STORAGE_KEY = "eventra_organizer_create_event_draft";

const eventName = document.getElementById("eventName");
const category = document.getElementById("category");
const description = document.getElementById("description");

const nameCounter = document.getElementById("nameCounter");
const descriptionCounter = document.getElementById("descriptionCounter");

const previewName = document.getElementById("previewName");
const previewImage = document.getElementById("previewImage");

const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadArea = document.getElementById("uploadArea");

const saveDraftBtn = document.getElementById("saveDraftBtn");
const nextBtn = document.getElementById("nextBtn");

const toast = document.getElementById("toast");
const autosave = document.getElementById("autosave");

const tagText = document.getElementById("tagText");
const tagInput = document.getElementById("tagInput");

const stepProgress = document.getElementById("stepProgress");
const steps = [...document.querySelectorAll(".step")];

let currentImageData = null;

/* =====================================================
   TOAST MESSAGE
===================================================== */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/* =====================================================
   COUNTERS AND LIVE PREVIEW
===================================================== */

function updateCounters() {
  if (eventName && nameCounter) {
    nameCounter.textContent = `${eventName.value.length}/80`;
  }

  if (description && descriptionCounter) {
    descriptionCounter.textContent =
      `${description.value.length}/300 chars`;
  }

  if (eventName && previewName) {
    previewName.textContent =
      eventName.value.trim() || "Tech Conference 2026";
  }
}

/* =====================================================
   GET TAGS
===================================================== */

function getTags() {
  if (!tagInput) return [];

  return [...tagInput.querySelectorAll(".tag")]
    .map(tag => {
      const removeButton = tag.querySelector("button");
      const clone = tag.cloneNode(true);

      if (removeButton) {
        clone.querySelector("button")?.remove();
      }

      return clone.textContent
        .replace("×", "")
        .replace("#", "")
        .trim();
    })
    .filter(Boolean);
}

/* =====================================================
   COLLECT DRAFT
===================================================== */

function collectDraft() {
  return {
    eventName: eventName?.value.trim() || "",
    category: category?.value || "",
    description: description?.value.trim() || "",
    tags: getTags(),
    imageData: currentImageData,
    updatedAt: new Date().toISOString()
  };
}

/* =====================================================
   SAVE DRAFT
===================================================== */

function saveDraft(showMessage = true) {
  try {
    const draft = collectDraft();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(draft)
    );

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    if (autosave) {
      autosave.textContent = `Draft Auto-Saved at ${time}`;
    }

    if (showMessage) {
      showToast("Draft saved successfully.");
    }

    return true;
  } catch (error) {
    console.error("Could not save event draft:", error);
    showToast("Could not save draft. Check your browser storage.");
    return false;
  }
}

/* =====================================================
   ADD TAG
===================================================== */

function renderTag(value) {
  const clean = String(value || "")
    .trim()
    .replace(/^#/, "");

  if (!clean || !tagInput || !tagText) return;

  const existing = getTags().map(tag => tag.toLowerCase());

  if (existing.includes(clean.toLowerCase())) {
    tagText.value = "";
    showToast("That tag has already been added.");
    return;
  }

  const tag = document.createElement("span");
  tag.className = "tag";

  const text = document.createTextNode(`# ${clean} `);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.setAttribute("aria-label", `Remove ${clean}`);
  remove.dataset.tag = clean;
  remove.textContent = "×";

  tag.appendChild(text);
  tag.appendChild(remove);

  tagInput.insertBefore(tag, tagText);

  tagText.value = "";
  saveDraft(false);
}

/* =====================================================
   RESTORE DRAFT
===================================================== */

function restoreDraft() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null"
    );

    if (!stored) {
      updateCounters();
      return;
    }

    if (eventName && typeof stored.eventName === "string") {
      eventName.value = stored.eventName;
    }

    if (category && stored.category) {
      category.value = stored.category;
    }

    if (
      description &&
      typeof stored.description === "string"
    ) {
      description.value = stored.description;
    }

    if (tagInput && tagText && Array.isArray(stored.tags)) {
      tagInput.querySelectorAll(".tag").forEach(tag => tag.remove());

      stored.tags.forEach(tag => renderTag(tag));
    }

    if (stored.imageData && previewImage) {
      currentImageData = stored.imageData;
      previewImage.src = stored.imageData;
      previewImage.style.display = "block";
    }

    if (stored.updatedAt && autosave) {
      const savedDate = new Date(stored.updatedAt);

      if (!Number.isNaN(savedDate.getTime())) {
        const time = savedDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });

        autosave.textContent = `Draft Auto-Saved at ${time}`;
      }
    }

    updateCounters();
  } catch (error) {
    console.warn("Could not restore draft:", error);
  }
}

/* =====================================================
   VALIDATE STEP ONE
===================================================== */

function validateStepOne() {
  if (!eventName.value.trim()) {
    eventName.focus();
    showToast("Please enter an event name.");
    return false;
  }

  if (!category.value.trim()) {
    category.focus();
    showToast("Please select an event category.");
    return false;
  }

  if (!description.value.trim()) {
    description.focus();
    showToast("Please add a short description.");
    return false;
  }

  return true;
}

/* =====================================================
   STEPPER
===================================================== */

function setStep(stepNumber) {
  steps.forEach((step, index) => {
    const number = index + 1;

    step.classList.toggle("active", number === stepNumber);
    step.classList.toggle("completed", number < stepNumber);

    const note = step.querySelector(".step-note");

    if (!note) return;

    if (number < stepNumber) {
      note.textContent = "Completed";
    } else if (number === stepNumber) {
      note.textContent = "In Progress";
    } else if (number === 2) {
      note.textContent = "Next";
    } else if (number === 3) {
      note.textContent = "Tiers & Pricing";
    } else if (number === 4) {
      note.textContent = "Summary";
    } else {
      note.textContent = "Go Live";
    }
  });

  if (stepProgress) {
    const progress = ((stepNumber - 1) / 4) * 78 + 10.5;
    stepProgress.style.width = `${progress}%`;
  }

  const stepPill = document.getElementById("stepPill");

  if (stepPill) {
    stepPill.textContent = `Step ${stepNumber} of 5`;
  }
}

/* =====================================================
   IMAGE UPLOAD
===================================================== */

function handleImage(file) {
  if (!file) return;

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showToast("Please choose a PNG, JPG or WebP image.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("Image must be 10MB or smaller.");
    return;
  }

  const reader = new FileReader();

  reader.onload = event => {
    currentImageData = event.target.result;

    if (previewImage) {
      previewImage.src = currentImageData;
      previewImage.style.display = "block";
    }

    const sizeMB = file.size / (1024 * 1024);
    const imageSize = document.getElementById("imageSize");

    if (imageSize) {
      imageSize.textContent =
        `${sizeMB < 0.1 ? "0.1" : sizeMB.toFixed(1)} MB`;
    }

    saveDraft(false);
    showToast("Cover image updated.");
  };

  reader.onerror = () => {
    showToast("The image could not be loaded. Please try another file.");
  };

  reader.readAsDataURL(file);
}

/* =====================================================
   INPUT EVENTS
===================================================== */

if (eventName) {
  eventName.addEventListener("input", () => {
    updateCounters();
    saveDraft(false);
  });
}

if (description) {
  description.addEventListener("input", () => {
    updateCounters();
    saveDraft(false);
  });
}

if (category) {
  category.addEventListener("change", () => {
    saveDraft(false);
  });
}

/* =====================================================
   IMAGE BUTTON
===================================================== */

if (uploadBtn && imageInput) {
  uploadBtn.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", event => {
    handleImage(event.target.files?.[0]);
    event.target.value = "";
  });
}

/* =====================================================
   DRAG AND DROP
===================================================== */

if (uploadArea) {
  ["dragenter", "dragover"].forEach(eventName => {
    uploadArea.addEventListener(eventName, event => {
      event.preventDefault();
      uploadArea.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    uploadArea.addEventListener(eventName, event => {
      event.preventDefault();
      uploadArea.classList.remove("dragging");
    });
  });

  uploadArea.addEventListener("drop", event => {
    const file = event.dataTransfer?.files?.[0];
    handleImage(file);
  });
}

/* =====================================================
   TAG INPUT
===================================================== */

if (tagText) {
  tagText.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderTag(tagText.value);
    }

    if (event.key === "Backspace" && !tagText.value) {
      const tags = tagInput.querySelectorAll(".tag");
      const lastTag = tags[tags.length - 1];

      if (lastTag) {
        lastTag.remove();
        saveDraft(false);
      }
    }
  });
}

/* =====================================================
   REMOVE TAG
===================================================== */

if (tagInput) {
  tagInput.addEventListener("click", event => {
    if (event.target.matches(".tag button")) {
      event.target.closest(".tag")?.remove();
      saveDraft(false);
    }
  });
}

/* =====================================================
   SAVE BUTTON
===================================================== */

if (saveDraftBtn) {
  saveDraftBtn.addEventListener("click", () => {
    saveDraft(true);
  });
}

/* =====================================================
   NEXT BUTTON
===================================================== */

nextBtn.addEventListener("click", () => {
  if (!validateStepOne()) {
    return;
  }

  // Save Step 1 information before navigating.
  saveDraft(false);

  // Open the separate Step 2 page.
  window.location.href =
    "../04_Creat%20Event_Step%202/index.html";
});

/* =====================================================
   PREVIEW BUTTON
===================================================== */

const previewBtn = document.getElementById("previewBtn");

if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    showToast(
      "Preview Portal will open once the event has been saved."
    );
  });
}

/* =====================================================
   GUIDELINES BUTTON
===================================================== */

const guidelinesBtn = document.getElementById("guidelinesBtn");

if (guidelinesBtn) {
  guidelinesBtn.addEventListener("click", () => {
    showToast(
      "Organizer guidelines are coming with the full portal."
    );
  });
}

/* =====================================================
   INITIALIZE
===================================================== */

restoreDraft();
updateCounters();
setStep(1);