
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const state = {
    currency: "NGN",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    toastTimer: null,
    activePreset: 30
  };

  const moneyElements = [...document.querySelectorAll("[data-money]")];

  if (window.EventraShell) window.EventraShell.customDatePicker = true;

  const rangeButton = $("dateRangeButton");
  const rangeMenu = $("dateRangeMenu");
  const rangeLabel = $("dateRangeLabel");
  const topDateLabel = $("topDateLabel");
  const startDateInput = $("startDate");
  const endDateInput = $("endDate");
  const dateError = $("dateError");
  const currencyNGN = $("currencyNGN");
  const currencyUSD = $("currencyUSD");
  const generalModal = $("generalModal");

  const currencyRates = { NGN: 1, USD: 1 / 1600 };

  const currencySettings = {
    NGN: { locale: "en-NG", currency: "NGN", digits: 0 },
    USD: { locale: "en-US", currency: "USD", digits: 2 }
  };

  function formatMoney(amount) {
    const converted = Number(amount) * currencyRates[state.currency];
    const config = currencySettings[state.currency];
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      minimumFractionDigits: config.digits,
      maximumFractionDigits: config.digits
    }).format(converted);
  }

  function updateCurrency() {
    moneyElements.forEach((element) => {
      const amount = Number(element.dataset.money);
      if (Number.isFinite(amount)) element.textContent = formatMoney(amount);
    });

    currencyNGN.setAttribute("aria-pressed", String(state.currency === "NGN"));
    currencyUSD.setAttribute("aria-pressed", String(state.currency === "USD"));

    currencyNGN.classList.toggle("bg-[#F1ECFF]", state.currency === "NGN");
    currencyNGN.classList.toggle("text-eventra", state.currency === "NGN");
    currencyNGN.classList.toggle("font-bold", state.currency === "NGN");
    currencyNGN.classList.toggle("text-slate-600", state.currency !== "NGN");

    currencyUSD.classList.toggle("bg-[#F1ECFF]", state.currency === "USD");
    currencyUSD.classList.toggle("text-eventra", state.currency === "USD");
    currencyUSD.classList.toggle("font-bold", state.currency === "USD");
    currencyUSD.classList.toggle("text-slate-600", state.currency !== "USD");
  }

  function parseLocalDate(value) {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !part)) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null;
    return date;
  }

  function formatDate(value, options = {}) {
    const date = parseLocalDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", ...options }).format(date);
  }

  function formatDateRange(start, end) {
    const startDate = parseLocalDate(start);
    const endDate = parseLocalDate(end);
    if (!startDate || !endDate) return "Select date range";
    const fmt = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
    return `${fmt(startDate)} – ${fmt(endDate)}`;
  }

  function setDateRange(start, end, preset = null) {
    state.startDate = start;
    state.endDate = end;
    state.activePreset = preset;

    startDateInput.value = start;
    endDateInput.value = end;

    rangeLabel.textContent = preset === 30
      ? `Last 30 Days (${formatDate(start)} - ${formatDate(end)})`
      : preset === 7
        ? `Last 7 Days (${formatDate(start)} - ${formatDate(end)})`
        : preset === 90
          ? `Last 90 Days (${formatDate(start)} - ${formatDate(end)})`
          : preset === 365
            ? `Last 12 Months (${formatDate(start)} - ${formatDate(end)})`
            : formatDateRange(start, end);

    topDateLabel.textContent = formatDateRange(start, end);

    document.querySelectorAll(".range-option").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.range) === preset));
    });

    dateError.classList.add("hidden");
  }

  function dateToInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function applyPreset(days) {
    const end = parseLocalDate(state.endDate) || new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    setDateRange(dateToInputValue(start), dateToInputValue(end), days);
  }

  function openDateRange() {
    rangeMenu.hidden = false;
    rangeButton.setAttribute("aria-expanded", "true");
    startDateInput.value = state.startDate;
    endDateInput.value = state.endDate;
    dateError.classList.add("hidden");
  }

  function closeDateRange() {
    rangeMenu.hidden = true;
    rangeButton.setAttribute("aria-expanded", "false");
  }

  function applyCustomDateRange() {
    const start = parseLocalDate(startDateInput.value);
    const end = parseLocalDate(endDateInput.value);

    if (!start || !end || start > end) {
      dateError.textContent = "Choose a valid start date and an end date on or after it.";
      dateError.classList.remove("hidden");
      return;
    }

    const days = Math.round((end - start) / 86400000) + 1;
    const preset = [7, 30, 90, 365].includes(days) ? days : null;

    setDateRange(startDateInput.value, endDateInput.value, preset);
    closeDateRange();
    showToast("Date range updated", `Showing analytics for ${formatDateRange(state.startDate, state.endDate)}.`);
  }

  function showToast(title, message) {
    $("toastTitle").textContent = title;
    $("toastMessage").textContent = message;
    $("toast").hidden = false;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3500);
  }

  function openModal(title, description, contentHTML = "") {
    $("modalTitle").textContent = title;
    $("modalDescription").textContent = description;
    $("modalContent").innerHTML = contentHTML;
    generalModal.hidden = false;
    generalModal.classList.add("flex");
    $("closeGeneralModal").focus();
  }

  function closeModal() {
    generalModal.hidden = true;
    generalModal.classList.remove("flex");
  }

  function closeMobileNavigation() {}

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    const a = state.analyticsData || {};
    const fin = state.finances || {};

    const totalRevenue = Number(a.total_revenue) || 0;
    const totalBookings = Number(a.total_bookings) || 0;
    const confirmedBookings = Number(a.confirmed_bookings) || 0;
    const pendingBookings = Number(a.pending_bookings) || 0;
    const cancelledBookings = Number(a.cancelled_bookings) || 0;
    const conversionRate = Number(a.conversion_rate) || 0;
    const aovDivisor = confirmedBookings > 0 ? confirmedBookings : (totalBookings > 0 ? totalBookings : 1);
    const aov = totalRevenue > 0 && totalBookings > 0 ? Math.round(totalRevenue / aovDivisor) : 0;

    const tierLabels = Array.isArray(a.ticket_labels) ? a.ticket_labels : [];
    const tierData = Array.isArray(a.ticket_data) ? a.ticket_data : [];
    const tierRows = tierLabels.length > 0
      ? tierLabels.map((name, i) => [name, String(Number(tierData[i]) || 0)])
      : [["No ticket tier data", ""]];

    const topEvents = Array.isArray(a.top_events) ? a.top_events : [];
    const topEventRows = topEvents.length > 0
      ? topEvents.map((ev) => [ev.title || "Untitled", String(ev.bookings || 0), formatMoney(Number(ev.revenue) || 0)])
      : [["No events", "", ""]];

    const rows = [
      ["Eventra Analytics Report"],
      ["Date Range", formatDateRange(state.startDate, state.endDate)],
      ["Display Currency", state.currency],
      [],
      ["Metric", "Value"],
      ["Gross Ticket Revenue", formatMoney(totalRevenue)],
      ["Total Bookings", String(totalBookings)],
      ["Confirmed Bookings", String(confirmedBookings)],
      ["Pending Bookings", String(pendingBookings)],
      ["Cancelled Bookings", String(cancelledBookings)],
      ["Conversion Rate", `${conversionRate.toFixed(1)}%`],
      ["Average Order Value", aov > 0 ? formatMoney(aov) : "—"],
      [],
      ["Ticket Tier", "Tickets Sold"],
      ...tierRows,
      [],
      ["Top Event", "Bookings", "Revenue"],
      ...topEventRows,
      [],
      ["Finances", ""],
      ["Total Earnings", formatMoney(Number(fin.totalEarnings) || 0)],
      ["Available Balance", formatMoney(Number(fin.availableBalance) || 0)],
      ["Total Paid Out", formatMoney(Number(fin.totalPaidOut) || 0)],
      ["Pending Payouts", formatMoney(Number(fin.pendingPayouts) || 0)]
    ];

    const csv = "\uFEFF" + rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(csv, `eventra-analytics-${state.startDate}-to-${state.endDate}.csv`, "text/csv;charset=utf-8;");
    showToast("CSV exported", "Your analytics CSV report has been downloaded.");
  }

  function openFullReport() {
    showToast("Preparing report", "Use the print dialog to save the analytics report as a PDF.");
    setTimeout(() => window.print(), 250);
  }

  function showSettlementLedger() {
    const fin = state.finances || {};
    const totalEarnings = Number(fin.totalEarnings) || 0;
    const availableBalance = Number(fin.availableBalance) || 0;
    const totalPaidOut = Number(fin.totalPaidOut) || 0;
    const pendingPayouts = Number(fin.pendingPayouts) || 0;

    openModal(
      "Settlement Ledger",
      "Payout breakdown from your finances.",
      `
        <div class="overflow-hidden rounded-xl border border-slate-200">
          <div class="flex justify-between gap-3 border-b border-slate-100 p-4">
            <span class="text-[14px] text-slate-600">Total earnings</span>
            <strong>${formatMoney(totalEarnings)}</strong>
          </div>
          <div class="flex justify-between gap-3 border-b border-slate-100 p-4">
            <span class="text-[14px] text-slate-600">Available balance</span>
            <strong>${formatMoney(availableBalance)}</strong>
          </div>
          <div class="flex justify-between gap-3 border-b border-slate-100 p-4">
            <span class="text-[14px] text-slate-600">Total paid out</span>
            <strong>${formatMoney(totalPaidOut)}</strong>
          </div>
          <div class="flex justify-between gap-3 bg-[#F1ECFF] p-4">
            <span class="text-[14px] font-semibold">Pending payouts</span>
            <strong class="text-eventra">${formatMoney(pendingPayouts)}</strong>
          </div>
        </div>
        <p class="mt-3 text-[13px] leading-5 text-slate-500">
          These figures are sourced from the Eventra finances API and reflect current account balances.
        </p>
      `
    );
  }

  function showHelp() {
    openModal(
      "Analytics Help",
      "Understand the figures shown in your Organizer Portal.",
      `
        <div class="space-y-4">
          <div>
            <h3 class="text-[15px] font-bold">Revenue</h3>
            <p class="mt-1 text-[14px] leading-5 text-slate-600">Gross ticket revenue represents the ticket sales amount before applicable fees, refunds, or settlement adjustments.</p>
          </div>
          <div>
            <h3 class="text-[15px] font-bold">Ticket capacity</h3>
            <p class="mt-1 text-[14px] leading-5 text-slate-600">Tickets sold are compared with the event's stated capacity to calculate the capacity percentage.</p>
          </div>
          <div>
            <h3 class="text-[15px] font-bold">Date range</h3>
            <p class="mt-1 text-[14px] leading-5 text-slate-600">Choose a preset or set your own dates to label the reporting period.</p>
          </div>
        </div>
      `
    );
  }

  function showNotifications() {
    const a = state.analyticsData || {};
    const total = Number(a.total_bookings) || 0;
    const confirmed = Number(a.confirmed_bookings) || 0;

    openModal(
      "Notifications",
      "Recent organizer updates.",
      total > 0
        ? `
          <div class="space-y-3">
            <div class="rounded-xl bg-[#F1ECFF] p-4">
              <p class="text-[14px] font-bold">Revenue report available</p>
              <p class="mt-1 text-[13px] text-slate-600">Your analytics report is ready to export.</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="text-[14px] font-bold">Booking summary</p>
              <p class="mt-1 text-[13px] text-slate-600">${confirmed} of ${total} bookings confirmed.</p>
            </div>
          </div>
        `
        : `<p class="text-[13px] text-slate-400">No new notifications.</p>`
    );
  }

  function showOrganizerProfile() {
    let user = {};
    try {
      user = JSON.parse(
        localStorage.getItem("eventra_user") ||
        localStorage.getItem("eventraUser") ||
        "{}"
      );
    } catch {
      user = {};
    }

    const name = user.organization_name || user.organizer_name || user.full_name || user.name || "";
    const email = user.email || "";
    const initial = name ? String(name).charAt(0).toUpperCase() : email ? String(email).charAt(0).toUpperCase() : "O";

    openModal(
      "Organizer Profile",
      "Organizer account information.",
      `
        <div class="flex items-center gap-4 rounded-xl bg-[#F1ECFF] p-4">
          <div class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-eventra text-xl font-bold text-white">
            ${initial}
          </div>
          <div class="min-w-0">
            ${name ? `<p class="break-words text-[16px] font-bold">${escapeHTML(name)}</p>` : ""}
            ${email ? `<p class="break-words text-[14px] text-slate-600">${escapeHTML(email)}</p>` : ""}
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="../11_Settings/index.html" class="inline-flex min-h-11 items-center rounded-xl bg-eventra px-4 py-2 text-[14px] font-bold text-white">Account Settings</a>
          <button id="profileSignOut" class="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-[14px] font-bold hover:bg-slate-50">Sign Out</button>
        </div>
      `
    );

    const signOut = $("profileSignOut");
    if (signOut) signOut.addEventListener("click", signOutOrganizer);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  async function signOutOrganizer() {
    const token =
      localStorage.getItem("eventra_access_token") ||
      localStorage.getItem("eventra_token") ||
      localStorage.getItem("access_token");

    if (token) {
      try {
        await fetch("https://eventra-backend-aidf.onrender.com/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
      } catch {
        // logout endpoint unreachable
      }
    }

    ["eventra_access_token", "eventra_token", "access_token", "eventra_refresh_token", "eventra_user", "eventraUser"]
      .forEach((key) => localStorage.removeItem(key));

    window.location.href = "../01_Sign In/index.html";
  }

  function addChartTooltips() {
    const chart = $("salesChart");
    const tooltip = $("chartTooltip");

    chart.querySelectorAll("[data-week]").forEach((bar) => {
      function showTooltip() {
        const revenue = Number(bar.dataset.revenue);
        const units = Number(bar.dataset.units);
        tooltip.textContent = `${bar.dataset.week}: ${formatMoney(revenue * 1000000)}, ${units} tickets`;
        tooltip.hidden = false;

        const chartRect = chart.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        tooltip.style.left = `${Math.max(4, Math.min(barRect.left - chartRect.left, chartRect.width - tooltip.offsetWidth - 4))}px`;
        tooltip.style.top = "8px";
      }

      bar.addEventListener("mouseenter", showTooltip);
      bar.addEventListener("focus", showTooltip);
      bar.addEventListener("click", showTooltip);
      bar.addEventListener("mouseleave", () => { tooltip.hidden = true; });
      bar.addEventListener("blur", () => { tooltip.hidden = true; });
    });
  }

  rangeButton.addEventListener("click", () => {
    if (rangeMenu.hidden) openDateRange(); else closeDateRange();
  });

  $("topDateButton").addEventListener("click", openDateRange);
  $("closeDateRange").addEventListener("click", closeDateRange);
  $("cancelDateRange").addEventListener("click", closeDateRange);
  $("applyDateRange").addEventListener("click", applyCustomDateRange);

  document.querySelectorAll(".range-option").forEach((button) => {
    button.addEventListener("click", () => applyPreset(Number(button.dataset.range)));
  });

  startDateInput.addEventListener("change", () => dateError.classList.add("hidden"));
  endDateInput.addEventListener("change", () => dateError.classList.add("hidden"));

  document.addEventListener("click", (event) => {
    if (
      !rangeMenu.hidden &&
      !rangeMenu.contains(event.target) &&
      !rangeButton.contains(event.target) &&
      event.target !== $("topDateButton") &&
      !$("topDateButton").contains(event.target)
    ) {
      closeDateRange();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDateRange();
      closeModal();
      closeMobileNavigation();
    }
  });

  currencyNGN.addEventListener("click", () => { state.currency = "NGN"; updateCurrency(); });
  currencyUSD.addEventListener("click", () => { state.currency = "USD"; updateCurrency(); });

  $("exportCsvButton").addEventListener("click", exportCSV);
  $("fullReportButton").addEventListener("click", openFullReport);
  $("settlementButton").addEventListener("click", showSettlementLedger);

  $("closeGeneralModal").addEventListener("click", closeModal);
  $("modalDone").addEventListener("click", closeModal);

  generalModal.addEventListener("click", (event) => {
    if (event.target === generalModal) closeModal();
  });

  setDateRange("2026-10-01", "2026-10-31", 30);
  updateCurrency();
  addChartTooltips();

  async function loadAnalytics() {
    const token =
      localStorage.getItem("eventra_access_token") ||
      localStorage.getItem("eventra_token") ||
      sessionStorage.getItem("eventra_access_token") ||
      sessionStorage.getItem("eventra_token") ||
      null;

    if (!token) return;

    const BASE = "https://eventra-backend-aidf.onrender.com";
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      const [analyticsRes, financesRes] = await Promise.all([
        fetch(`${BASE}/api/organizer/analytics`, { headers }),
        fetch(`${BASE}/api/organizer/finances`, { headers })
      ]);

      const a = analyticsRes.ok ? ((await analyticsRes.json()).data || {}) : {};
      const f = financesRes.ok ? ((await financesRes.json()).data || {}) : {};

      const revenueEl = $("statRevenue");
      if (revenueEl && a.total_revenue != null) {
        const rev = Number(a.total_revenue);
        revenueEl.dataset.money = rev;
        revenueEl.textContent = formatMoney(rev);
        moneyElements.push(revenueEl);
      }

      const totalBookings = Number(a.total_bookings) || 0;
      const confirmedBookings = Number(a.confirmed_bookings) || 0;
      const ticketsEl = $("statTicketsSold");
      const capacityEl = $("statCapacity");
      const capacityPercentEl = $("capacityPercent");
      const capacityBarEl = $("capacityBar");
      const seatsLeftEl = $("seatsLeft");

      if (ticketsEl) {
        if (capacityEl) {
          ticketsEl.innerHTML = `${confirmedBookings} <span id="statCapacity" class="text-[17px] font-semibold tracking-normal text-slate-500">/ ${totalBookings} total</span>`;
        } else {
          ticketsEl.childNodes[0].textContent = String(confirmedBookings) + " ";
        }
      }

      const pct = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
      if (capacityPercentEl) capacityPercentEl.textContent = `${pct.toFixed(1)}% Booking Confirmation`;
      if (capacityBarEl) capacityBarEl.style.width = `${pct}%`;
      if (seatsLeftEl) seatsLeftEl.textContent = `${totalBookings - confirmedBookings} pending/cancelled`;

      const aovEl = $("statAOV");
      if (aovEl) {
        const totalRevenue = Number(a.total_revenue) || 0;
        if (totalRevenue > 0 && totalBookings > 0) {
          const divisor = confirmedBookings > 0 ? confirmedBookings : totalBookings;
          const aov = Math.round(totalRevenue / divisor);
          aovEl.dataset.money = aov;
          aovEl.textContent = formatMoney(aov);
          moneyElements.push(aovEl);
        } else {
          aovEl.removeAttribute("data-money");
          aovEl.textContent = "—";
        }
      }

      const chartBarsEl = $("analyticsChartBars");
      const chartLabelsEl = $("analyticsChartLabels");

      if (chartBarsEl && chartLabelsEl && Array.isArray(a.revenue_labels) && Array.isArray(a.revenue_data) && a.revenue_labels.length > 0) {
        const labels = a.revenue_labels;
        const data = a.revenue_data;
        const maxVal = Math.max(...data, 1);
        const barColors = ["#6D28FF", "#C8B6FF", "#6D28FF", "#C8B6FF", "#6D28FF", "#C8B6FF", "#6D28FF"];

        chartBarsEl.innerHTML = labels.map((label, i) => {
          const rev = Number(data[i]) || 0;
          const pctH = Math.max(3, Math.round((rev / maxVal) * 100));
          const revMil = (rev / 1_000_000).toFixed(2);
          const color = rev === maxVal && maxVal > 1 ? "#6D28FF" : barColors[i % barColors.length];
          return `<button class="chart-bar group relative flex h-full flex-1 items-end justify-center" data-week="${escapeHTML(label)}" data-revenue="${revMil}" data-units="0" aria-label="${escapeHTML(label)}: ${formatMoney(rev)}">
  <span class="w-full max-w-[28px] rounded-t-md" style="background:${color};height:${pctH}%"></span>
</button>`;
        }).join("\n");

        chartLabelsEl.style.gridTemplateColumns = `repeat(${labels.length}, minmax(0, 1fr))`;
        chartLabelsEl.innerHTML = labels.map((label) =>
          `<div class="text-[12px] text-slate-600"><p class="font-semibold">${escapeHTML(label)}</p></div>`
        ).join("\n");

        addChartTooltips();
      }

      const tierMixListEl = $("tierMixList");
      const donutEl = $("analyticsDonut");
      const donutTotalEl = $("donutTotal");
      const tierCountEl = $("tierCount");

      if (Array.isArray(a.ticket_labels) && Array.isArray(a.ticket_data)) {
        const tierLabels = a.ticket_labels;
        const tierData = a.ticket_data;
        const tierTotal = tierData.reduce((sum, v) => sum + Number(v), 0);
        const tierColors = ["#6D28FF", "#C8B6FF", "#FFB454", "#81E6D9", "#F6AD55"];

        if (donutTotalEl) donutTotalEl.textContent = String(tierTotal);
        if (tierCountEl) tierCountEl.textContent = `${tierLabels.length} Tiers`;

        if (donutEl && tierTotal > 0) {
          let cumulative = 0;
          const stops = tierLabels.map((_, i) => {
            const share = (Number(tierData[i]) / tierTotal) * 100;
            const from = cumulative;
            cumulative += share;
            return `${tierColors[i % tierColors.length]} ${from.toFixed(2)}% ${cumulative.toFixed(2)}%`;
          });
          donutEl.style.background = `conic-gradient(${stops.join(", ")})`;
        } else if (donutEl) {
          donutEl.style.background = "#E4EBFA";
        }

        if (tierMixListEl) {
          if (tierLabels.length === 0 || tierTotal === 0) {
            tierMixListEl.innerHTML = `<p class="text-[13px] text-slate-400">No ticket types</p>`;
          } else {
            tierMixListEl.innerHTML = tierLabels.map((name, i) => {
              const count = Number(tierData[i]) || 0;
              const share = tierTotal > 0 ? Math.round((count / tierTotal) * 100) : 0;
              const color = tierColors[i % tierColors.length];
              return `<div class="flex items-center justify-between gap-3 rounded-xl bg-[#EEF3FF] p-3">
  <div class="flex min-w-0 items-start gap-2">
    <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style="background:${color}"></span>
    <div><p class="text-[13px] font-semibold">${escapeHTML(name)}</p><p class="text-[12px] text-slate-500">${count} sold</p></div>
  </div>
  <div class="text-right"><p class="text-[11px] font-bold text-eventra">${share}% mix</p></div>
</div>`;
            }).join("\n");
          }
        }
      }

      const tierFooterEl = $("tierCapacityFooter");
      if (tierFooterEl) {
        const totalCap = Array.isArray(a.ticket_labels) && Array.isArray(a.ticket_data)
          ? a.ticket_data.reduce((s, v) => s + Number(v), 0) : 0;
        const totalConfirmed = Number(a.confirmed_bookings) || 0;
        const allocPct = totalCap > 0 ? Math.round((totalConfirmed / totalCap) * 100) : 0;
        tierFooterEl.innerHTML = totalCap > 0
          ? `<span>Total sold: ${totalConfirmed}</span><span class="text-eventra">${allocPct}% of capacity</span>`
          : "";
      }

      const bookingStatusEl = $("bookingStatusContent");
      if (bookingStatusEl) {
        const confirmed = Number(a.confirmed_bookings) || 0;
        const pending = Number(a.pending_bookings) || 0;
        const cancelled = Number(a.cancelled_bookings) || 0;
        const total = Number(a.total_bookings) || 0;

        if (total === 0) {
          bookingStatusEl.innerHTML = `<p class="text-[13px] text-slate-400">No bookings yet.</p>`;
        } else {
          const pctConfirmed = Math.round((confirmed / total) * 100);
          const pctPending = Math.round((pending / total) * 100);
          const pctCancelled = Math.round((cancelled / total) * 100);

          bookingStatusEl.innerHTML = `
<div>
  <div class="mb-1 flex items-center justify-between gap-3 text-[13px]">
    <span class="font-semibold text-green-700">Confirmed</span>
    <strong>${confirmed} (${pctConfirmed}%)</strong>
  </div>
  <div class="h-2 rounded-full bg-[#E4EBFA]"><div class="h-full rounded-full bg-green-500" style="width:${pctConfirmed}%"></div></div>
</div>
<div>
  <div class="mb-1 flex items-center justify-between gap-3 text-[13px]">
    <span class="font-semibold text-yellow-700">Pending</span>
    <strong>${pending} (${pctPending}%)</strong>
  </div>
  <div class="h-2 rounded-full bg-[#E4EBFA]"><div class="h-full rounded-full bg-yellow-400" style="width:${pctPending}%"></div></div>
</div>
<div>
  <div class="mb-1 flex items-center justify-between gap-3 text-[13px]">
    <span class="font-semibold text-red-700">Cancelled</span>
    <strong>${cancelled} (${pctCancelled}%)</strong>
  </div>
  <div class="h-2 rounded-full bg-[#E4EBFA]"><div class="h-full rounded-full bg-red-400" style="width:${pctCancelled}%"></div></div>
</div>
<p class="mt-2 text-[12px] text-slate-500">Total bookings: ${total} &nbsp;|&nbsp; Conversion rate: ${Number(a.conversion_rate || 0).toFixed(1)}%</p>`;
        }
      }

      const topEventsEl = $("topEventsContent");
      if (topEventsEl) {
        const topEvents = Array.isArray(a.top_events) ? a.top_events : [];
        if (topEvents.length === 0) {
          topEventsEl.innerHTML = `<p class="text-[13px] text-slate-400">No events yet.</p>`;
        } else {
          topEventsEl.innerHTML = topEvents.map((ev) => {
            const title = escapeHTML(ev.title || "Untitled Event");
            const bookings = Number(ev.bookings) || 0;
            const revenue = Number(ev.revenue) || 0;
            const capacity = Number(ev.capacity) || 0;
            const capPct = capacity > 0 ? Math.round((bookings / capacity) * 100) : 0;
            const href = ev.id ? `../09_Check-in%20Dashboard/index.html?event=${ev.id}` : "../08_Attendees Management/index.html";
            return `<a href="${href}" class="flex items-center justify-between gap-3 rounded-xl bg-[#EEF3FF] p-3 hover:bg-[#E4EBFF] transition-colors">
  <div class="min-w-0">
    <p class="truncate text-[13px] font-semibold">${title}</p>
    <p class="text-[12px] text-slate-500">${bookings} bookings${capacity > 0 ? ` · ${capPct}% capacity` : ""}</p>
  </div>
  <div class="flex items-center gap-2 text-right shrink-0">
    <p class="text-[13px] font-bold text-eventra">${formatMoney(revenue)}</p>
    <span class="text-slate-400 text-[12px]">›</span>
  </div>
</a>`;
          }).join("\n");
        }
      }

      const totalEarnings = Number(f.total_earnings) || 0;
      const availableBalance = Number(f.available_balance) || 0;
      const totalPaidOut = Number(f.total_paid_out) || 0;
      const pendingPayouts = Number(f.pending_payouts) || 0;

      const payoutTotalEl = $("payoutTotal");
      const payoutBalanceEl = $("payoutBalance");
      const payoutPaidOutEl = $("payoutPaidOut");
      const payoutPendingEl = $("payoutPending");

      if (payoutTotalEl) payoutTotalEl.textContent = formatMoney(totalEarnings);
      if (payoutBalanceEl) payoutBalanceEl.textContent = formatMoney(availableBalance);
      if (payoutPaidOutEl) payoutPaidOutEl.textContent = formatMoney(totalPaidOut);
      if (payoutPendingEl) payoutPendingEl.textContent = formatMoney(pendingPayouts);

      state.finances = { totalEarnings, availableBalance, totalPaidOut, pendingPayouts };
      state.analyticsData = a;

    } catch (err) {
      console.warn("Analytics API error:", err);
    }
  }

  loadAnalytics();
});
