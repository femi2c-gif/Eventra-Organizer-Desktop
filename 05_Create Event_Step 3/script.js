"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = "eventra_create_event_draft";
  const STEP3_KEY = "eventra_create_event_step3";
  const STEP1_KEY = "eventra_create_event_step1";
  const STEP2_KEY = "eventra_create_event_step2";

  const DEFAULT_TIERS = [
    {
      id: "tier-regular",
      name: "Popular Access",
      price: 15000,
      quantity: 350,
      startDate: "2026-08-01",
      endDate: "2026-10-11",
      benefits: ["Standard Seating", "Conference Kit", "Coffee Breaks"],
      active: true
    },
    {
      id: "tier-vip",
      name: "VIP Fast-Track & Lounge",
      price: 40000,
      quantity: 100,
      startDate: "2026-08-01",
      endDate: "2026-10-10",
      benefits: ["Front Row Seating", "VIP Lounge Access", "Lunch Buffet", "Speaker Mixer"],
      active: true
    },
    {
      id: "tier-executive",
      name: "Executive All-Access & Dinner",
      price: 75000,
      quantity: 50,
      startDate: "2026-08-01",
      endDate: "2026-10-08",
      benefits: ["Backstage Access", "VIP Seating", "Exclusive Gala Dinner", "1-on-1 Mentorship Session"],
      active: true
    }
  ];

  let tiers = [];
  let draggedTierId = null;
  let toastTimer = null;
  let draftTimer = null;

  // --------------------------------------------------
  // UTILITIES
  // --------------------------------------------------

  function readJSON(key, fallback = {}) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`Could not read ${key}`, error);
      return fallback;
    }
  }

  function money(value) {
    return `₦${Math.round(Number(value) || 0).toLocaleString("en-NG")}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3200);
  }

  function getEventTitle() {
    const possibleSources = [
      readJSON("eventra_organizer_create_event_draft"),
      readJSON(STEP2_KEY),
      readJSON(STEP1_KEY),
      readJSON(STORAGE_KEY)
    ];

    for (const source of possibleSources) {
      const title =
        source.eventName ||
        source.eventTitle ||
        source.title ||
        source.name ||
        source.basicInfo?.eventName ||
        source.basicInfo?.title;

      if (title) return title;
    }

    return "Tech Conference 2026";
  }

  function updateEventTitle() {
    const title = getEventTitle();
    const element = $("eventTitle");

    if (element) {
      element.textContent = `"${title}"`;
    }

    document.title = `Create Event — ${title} | Eventra Organizer`;
  }

  function getDateTime() {
    return new Intl.DateTimeFormat("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());
  }

  function normalizeTier(tier, index) {
    return {
      id: String(tier.id || `tier-${Date.now()}-${index}`),
      name: String(tier.name || `Ticket Tier ${index + 1}`),
      price: Math.max(0, Number(tier.price) || 0),
      quantity: Math.max(1, Number(tier.quantity) || 1),
      startDate: tier.startDate || tier.salesStart || "",
      endDate: tier.endDate || tier.salesEnd || "",
      benefits: Array.isArray(tier.benefits)
        ? tier.benefits.map(String)
        : [],
      active: tier.active !== false
    };
  }

  // --------------------------------------------------
  // LOAD SAVED DATA
  // --------------------------------------------------

  function loadDraft() {
    const savedStep3 = readJSON(STEP3_KEY, null);
    const commonDraft = readJSON(STORAGE_KEY, null) || readJSON("eventra_organizer_create_event_draft", null);

    let savedTiers = null;

    if (savedStep3 && Array.isArray(savedStep3.tiers)) {
      savedTiers = savedStep3.tiers;
    } else if (commonDraft && Array.isArray(commonDraft.tiers)) {
      savedTiers = commonDraft.tiers;
    }

    tiers = (savedTiers && savedTiers.length)
      ? savedTiers.map(normalizeTier)
      : DEFAULT_TIERS.map(normalizeTier);

    const settings = savedStep3 || commonDraft || {};

    if (settings.passFees !== undefined) {
      $("passFees").checked = Boolean(settings.passFees);
    }

    if (settings.enableTransfers !== undefined) {
      $("enableTransfers").checked = Boolean(settings.enableTransfers);
    }

    if (settings.minOrder) {
      $("minOrder").value = String(settings.minOrder);
    }

    if (settings.maxOrder) {
      $("maxOrder").value = String(settings.maxOrder);
    }

    if (settings.requiredDetails) {
      $("detailNameEmail").checked =
        settings.requiredDetails.nameEmail !== false;

      $("detailJobOrg").checked =
        settings.requiredDetails.jobOrg !== false;

      $("detailPhone").checked =
        settings.requiredDetails.phone !== false;
    }

    updateEventTitle();
    renderTiers();
    updateSummary();
  }

  // --------------------------------------------------
  // SAVE DRAFT
  // --------------------------------------------------

  function collectDraft() {
    return {
      eventName: getEventTitle(),
      currentStep: 3,
      tiers: tiers.map((tier) => ({ ...tier, benefits: [...tier.benefits] })),
      passFees: $("passFees").checked,
      enableTransfers: $("enableTransfers").checked,
      minOrder: Number($("minOrder").value),
      maxOrder: Number($("maxOrder").value),
      requiredDetails: {
        nameEmail: $("detailNameEmail").checked,
        jobOrg: $("detailJobOrg").checked,
        phone: $("detailPhone").checked
      },
      updatedAt: new Date().toISOString()
    };
  }

  function saveDraft(showMessage = false) {
    const draft = collectDraft();

    try {
      localStorage.setItem(STEP3_KEY, JSON.stringify(draft));

      // Maintain a shared draft object for the multi-step wizard.
      const existingDraft = readJSON(STORAGE_KEY, {});
      const mergedDraft = {
        ...existingDraft,
        ...draft,
        step3: draft
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedDraft));
      sessionStorage.setItem(STEP3_KEY, JSON.stringify(draft));

      const savedLabel = $("lastSaved");
      if (savedLabel) savedLabel.textContent = getDateTime();

      if (showMessage) {
        showToast("Your ticket pricing draft has been saved.");
      }

      return true;
    } catch (error) {
      console.error("Unable to save the Eventra draft:", error);
      showToast("Could not save the draft. Check your browser storage.");
      return false;
    }
  }

  function scheduleAutoSave() {
    clearTimeout(draftTimer);

    draftTimer = setTimeout(() => {
      saveDraft(false);
    }, 400);
  }

  // --------------------------------------------------
  // TICKET TIER RENDERING
  // --------------------------------------------------

  function renderTiers() {
    const container = $("ticketTierList");
    if (!container) return;

    if (!tiers.length) {
      container.innerHTML = `
        <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div class="mb-3 text-3xl text-eventra">＋</div>
          <h3 class="text-[17px] font-bold text-navy">No ticket tiers yet</h3>
          <p class="mt-2 text-[14px] text-slate-500">
            Add your first ticket tier to start configuring event pricing.
          </p>
        </div>
      `;
      updateSummary();
      return;
    }

    container.innerHTML = tiers.map((tier, index) => {
      const statusClass = tier.active
        ? "bg-[#E5EDFF] text-eventra"
        : "bg-slate-100 text-slate-500";

      const statusLabel = tier.active ? "Active" : "Inactive";

      const benefits = tier.benefits.map((benefit) => `
        <span class="inline-flex items-center gap-1 rounded-full bg-[#F0F2FF] px-2.5 py-1 text-[12px] font-medium text-[#4B5268]">
          <span class="text-eventra">⊙</span>
          ${escapeHTML(benefit)}
        </span>
      `).join("");

      const salesWindow = tier.startDate || tier.endDate
        ? `${formatDate(tier.startDate)} – ${formatDate(tier.endDate)}`
        : "Sales dates not set";

      return `
        <article
          class="tier-card rounded-[16px] border border-[#EDF0F6] bg-white p-4 shadow-panel sm:p-5"
          data-tier-id="${escapeHTML(tier.id)}"
          draggable="true"
        >
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <button
                type="button"
                class="drag-handle mt-1 cursor-grab rounded-md px-1 text-xl tracking-[-5px] text-[#8B8FA3] hover:text-eventra"
                aria-label="Drag to reorder ${escapeHTML(tier.name)}"
                title="Drag to reorder"
              >⠿</button>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="break-words text-[16px] font-bold leading-6 text-navy sm:text-[17px]">
                    ${escapeHTML(tier.name)}
                  </h3>

                  ${index === 1 && tier.active ? `
                    <span class="rounded-full bg-[#FFF0D9] px-2.5 py-1 text-[12px] font-semibold text-[#9A5B00]">
                      ◉ High Demand
                    </span>
                  ` : ""}

                  <span class="rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusClass}">
                    <span class="mr-1">●</span>${statusLabel}
                  </span>
                </div>

                <p class="mt-2 flex flex-wrap items-center gap-2 text-[13px] leading-5 text-[#667085]">
                  <span>▦</span>
                  <span>Sales Window: ${escapeHTML(salesWindow)}</span>
                </p>

                <div class="mt-3 flex flex-wrap gap-2">
                  ${benefits || '<span class="text-[13px] text-slate-400">No benefits added</span>'}
                </div>
              </div>
            </div>

            <div class="tier-actions flex items-center justify-between gap-4 border-t border-slate-100 pt-4 xl:justify-end xl:border-0 xl:pt-0">
              <div class="min-w-0 xl:min-w-[150px] xl:text-right">
                <p class="tier-price whitespace-nowrap text-[29px] font-extrabold leading-tight tracking-tight text-navy sm:text-[32px]">
                  ${money(tier.price)}
                </p>
                <p class="mt-1 text-[13px] text-[#667085]">
                  ${Number(tier.quantity).toLocaleString("en-NG")} tickets available
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  data-action="edit"
                  data-id="${escapeHTML(tier.id)}"
                  class="icon-button"
                  aria-label="Edit ${escapeHTML(tier.name)}"
                  title="Edit ticket tier"
                >
                  <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z"/></svg>
                </button>

                <button
                  type="button"
                  data-action="duplicate"
                  data-id="${escapeHTML(tier.id)}"
                  class="icon-button"
                  aria-label="Duplicate ${escapeHTML(tier.name)}"
                  title="Duplicate ticket tier"
                >
                  <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
                </button>

                <button
                  type="button"
                  data-action="delete"
                  data-id="${escapeHTML(tier.id)}"
                  class="icon-button !bg-[#FFF0F0] !text-red-600 hover:!bg-red-100"
                  aria-label="Delete ${escapeHTML(tier.name)}"
                  title="Delete ticket tier"
                >
                  <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    updateSummary();
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Not set";

    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  // --------------------------------------------------
  // SUMMARY CALCULATIONS
  // --------------------------------------------------

  function updateSummary() {
    const activeTiers = tiers.filter((tier) => tier.active);

    const capacity = activeTiers.reduce((total, tier) => {
      return total + Math.max(0, Number(tier.quantity) || 0);
    }, 0);

    const grossRevenue = activeTiers.reduce((total, tier) => {
      return total + (
        Math.max(0, Number(tier.price) || 0) *
        Math.max(0, Number(tier.quantity) || 0)
      );
    }, 0);

    const payout = $("passFees").checked
      ? grossRevenue
      : grossRevenue * 0.985;

    $("tierCount").textContent = String(tiers.length);
    $("totalCapacity").textContent = capacity.toLocaleString("en-NG");
    $("grossRevenue").textContent = money(grossRevenue);
    $("estimatedPayout").textContent = money(payout);

    $("feeNote").textContent = $("passFees").checked
      ? "(Attendee absorbs 1.5% + ₦100 fee)"
      : "(Estimated after 1.5% processing fee; fixed fees may also apply)";

    $("tierReadyStatus").textContent = activeTiers.length === tiers.length
      ? "All tiers active & ready"
      : `${activeTiers.length} of ${tiers.length} tiers active`;

    $("tierReadyStatus").className = activeTiers.length === tiers.length
      ? "text-[13px] font-semibold text-eventra"
      : "text-[13px] font-semibold text-amber-600";

    validateOrderLimits();
  }

  // --------------------------------------------------
  // TIER EDITOR MODAL
  // --------------------------------------------------

  function openTierModal(tier = null) {
    $("tierForm").reset();

    const isEditing = Boolean(tier);

    $("tierModalTitle").textContent = isEditing
      ? "Edit ticket tier"
      : "Add ticket tier";

    $("editingTierId").value = tier?.id || "";
    $("tierNameInput").value = tier?.name || "";
    $("tierPriceInput").value = tier ? tier.price : "";
    $("tierQuantityInput").value = tier ? tier.quantity : "";
    $("tierStartInput").value = tier?.startDate || "";
    $("tierEndInput").value = tier?.endDate || "";
    $("tierBenefitsInput").value = tier
      ? tier.benefits.join(", ")
      : "";

    $("tierModal").classList.remove("hidden");
    $("tierModal").classList.add("flex");

    setTimeout(() => $("tierNameInput").focus(), 30);
  }

  function closeTierModal() {
    $("tierModal").classList.add("hidden");
    $("tierModal").classList.remove("flex");
  }

  function saveTierFromForm(event) {
    event.preventDefault();

    const id = $("editingTierId").value;
    const name = $("tierNameInput").value.trim();
    const price = Number($("tierPriceInput").value);
    const quantity = Number($("tierQuantityInput").value);
    const startDate = $("tierStartInput").value;
    const endDate = $("tierEndInput").value;

    if (!name) {
      showToast("Enter a name for this ticket tier.");
      $("tierNameInput").focus();
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showToast("Enter a valid ticket price.");
      $("tierPriceInput").focus();
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showToast("Ticket quantity must be at least 1.");
      $("tierQuantityInput").focus();
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      showToast("The sales end date must be after the start date.");
      $("tierEndInput").focus();
      return;
    }

    const benefits = $("tierBenefitsInput").value
      .split(",")
      .map((benefit) => benefit.trim())
      .filter(Boolean);

    const tierData = {
      id: id || `tier-${Date.now()}`,
      name,
      price,
      quantity,
      startDate,
      endDate,
      benefits,
      active: true
    };

    if (id) {
      const index = tiers.findIndex((tier) => tier.id === id);
      if (index !== -1) tiers[index] = tierData;
    } else {
      tiers.push(tierData);
    }

    closeTierModal();
    renderTiers();
    saveDraft(false);
    showToast(id ? "Ticket tier updated." : "Ticket tier added.");
  }

  // --------------------------------------------------
  // TIER ACTIONS
  // --------------------------------------------------

  $("ticketTierList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const tier = tiers.find((item) => item.id === id);

    if (!tier) return;

    if (action === "edit") {
      openTierModal(tier);
      return;
    }

    if (action === "duplicate") {
      const copy = {
        ...tier,
        id: `tier-${Date.now()}`,
        name: `${tier.name} Copy`,
        benefits: [...tier.benefits]
      };

      const index = tiers.findIndex((item) => item.id === id);
      tiers.splice(index + 1, 0, copy);

      renderTiers();
      saveDraft(false);
      showToast("Ticket tier duplicated.");
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete "${tier.name}"? This cannot be undone after you leave this page.`
      );

      if (!confirmed) return;

      tiers = tiers.filter((item) => item.id !== id);
      renderTiers();
      saveDraft(false);
      showToast("Ticket tier deleted.");
    }
  });

  $("addTierBtn").addEventListener("click", () => {
    openTierModal();
  });

  $("tierForm").addEventListener("submit", saveTierFromForm);
  $("closeTierModal").addEventListener("click", closeTierModal);
  $("cancelTierEdit").addEventListener("click", closeTierModal);

  $("tierModal").addEventListener("click", (event) => {
    if (event.target === $("tierModal")) closeTierModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTierModal();
  });

  // --------------------------------------------------
  // DRAG AND DROP REORDERING
  // --------------------------------------------------

  $("ticketTierList").addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-tier-id]");
    if (!card) return;

    draggedTierId = card.dataset.tierId;
    card.classList.add("dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedTierId);
    }
  });

  $("ticketTierList").addEventListener("dragover", (event) => {
    event.preventDefault();

    const card = event.target.closest("[data-tier-id]");
    if (!card || card.dataset.tierId === draggedTierId) return;

    $("ticketTierList").querySelectorAll(".tier-card")
      .forEach((item) => item.classList.remove("drag-over"));

    card.classList.add("drag-over");
  });

  $("ticketTierList").addEventListener("drop", (event) => {
    event.preventDefault();

    const targetCard = event.target.closest("[data-tier-id]");
    if (!targetCard || !draggedTierId) return;

    const fromIndex = tiers.findIndex((tier) => tier.id === draggedTierId);
    const toIndex = tiers.findIndex((tier) => tier.id === targetCard.dataset.tierId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [movedTier] = tiers.splice(fromIndex, 1);
    tiers.splice(toIndex, 0, movedTier);

    draggedTierId = null;
    renderTiers();
    saveDraft(false);
    showToast("Ticket tier order updated.");
  });

  $("ticketTierList").addEventListener("dragend", () => {
    draggedTierId = null;

    $("ticketTierList").querySelectorAll(".tier-card")
      .forEach((item) => {
        item.classList.remove("dragging", "drag-over");
      });
  });

  // --------------------------------------------------
  // PURCHASE LIMIT VALIDATION
  // --------------------------------------------------

  function validateOrderLimits() {
    const minOrder = Number($("minOrder").value);
    const maxOrder = Number($("maxOrder").value);
    const error = $("orderLimitError");

    const invalid = maxOrder < minOrder;

    error.classList.toggle("hidden", !invalid);

    $("maxOrder").classList.toggle("!border-red-500", invalid);
    $("maxOrder").setAttribute("aria-invalid", invalid ? "true" : "false");

    return !invalid;
  }

  $("minOrder").addEventListener("change", () => {
    if (Number($("maxOrder").value) < Number($("minOrder").value)) {
      const availableOption = [...$("maxOrder").options].find(
        (option) => Number(option.value) >= Number($("minOrder").value)
      );

      if (availableOption) $("maxOrder").value = availableOption.value;
    }

    updateSummary();
    scheduleAutoSave();
  });

  $("maxOrder").addEventListener("change", () => {
    updateSummary();
    scheduleAutoSave();
  });

  // --------------------------------------------------
  // SETTINGS AND AUTO-SAVE
  // --------------------------------------------------

  [
    "passFees",
    "enableTransfers",
    "detailNameEmail",
    "detailJobOrg",
    "detailPhone"
  ].forEach((id) => {
    $(id).addEventListener("change", () => {
      updateSummary();
      scheduleAutoSave();
    });
  });

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  $("saveDraftBtn").addEventListener("click", () => {
    saveDraft(true);
  });

  $("backBtn").addEventListener("click", () => {
    saveDraft(false);
    window.location.href = "../04_Creat%20Event_Step%202/index.html";
  });

  $("nextBtn").addEventListener("click", () => {
    if (!tiers.length) {
      showToast("Add at least one ticket tier before continuing.");
      return;
    }

    if (!tiers.some((tier) => tier.active)) {
      showToast("Activate at least one ticket tier before continuing.");
      return;
    }

    const invalidTier = tiers.find((tier) =>
      !tier.name.trim() ||
      !Number.isFinite(Number(tier.price)) ||
      Number(tier.price) < 0 ||
      !Number.isInteger(Number(tier.quantity)) ||
      Number(tier.quantity) < 1 ||
      (tier.startDate && tier.endDate && tier.startDate > tier.endDate)
    );

    if (invalidTier) {
      showToast(`Please check the details for "${invalidTier.name}".`);
      return;
    }

    if (!validateOrderLimits()) {
      showToast("Correct the purchase limits before continuing.");
      return;
    }

    if (!saveDraft(false)) return;

    /*
      The next screen is Step 4: Review Details.
      If your existing Step 4 folder uses a different name,
      update this path to match your actual folder name.
    */
    window.location.href = "../06_Creat%20Event_Step%204/index.html";
  });

  // --------------------------------------------------
  // PREVIEW AND GUIDELINES
  // --------------------------------------------------

  $("previewBtn").addEventListener("click", () => {
    saveDraft(false);
    showToast("Your ticket settings have been saved for the event preview.");
  });

  function showGuidelines() {
    showToast("Create clear ticket tiers, set accurate quantities, and review your sales windows before publishing.");
  }

  $("guidelinesBtn").addEventListener("click", showGuidelines);
  // Notifications, help, profile and the mobile menu live in the shared shell.

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  loadDraft();

  // Keep the page draft up to date if the user leaves or refreshes.
  window.addEventListener("beforeunload", () => {
    saveDraft(false);
  });
});