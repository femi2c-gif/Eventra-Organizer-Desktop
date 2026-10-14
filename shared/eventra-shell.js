/* ==========================================================================
   Eventra organizer shell (sidebar + top bar), shared by every organizer page.

   Usage on a page:
     <head>  <link rel="stylesheet" href="../shared/eventra-shell.css"> </head>
     <body data-eventra-nav="dashboard">
       <script src="../shared/eventra-shell.js"></script>   <!-- first thing in body -->
       ...page content...

   data-eventra-nav = dashboard | events | attendees | checkin | analytics | settings

   Element ids the shell provides (page scripts may use them):
     topDateButton, topDateLabel, notificationButton, helpButton, profileButton,
     organizerName, organizerEmail, mobileMenuButton, mobileDrawer, mobileMenuOverlay

   Page API:  window.EventraShell
     .setOrganizer(name, email)   update name / email / avatar initial
     .setDateLabel(text)          update the date pill text
     .customDatePicker = true     set by a page that has its own date-range UI
                                  (the shell then leaves clicks on the pill alone)
     .openDrawer() / .closeDrawer()
   ========================================================================== */
(function () {
  "use strict";

  if (window.EventraShell) return;

  var script = document.currentScript;
  var SHARED = script.src.replace(/[^\/]*$/, "");          // .../shared/
  var ROOT = SHARED.replace(/shared\/$/, "");              // project root
  var ASSETS = SHARED + "assets/";

  var NAV = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard_icon.png", href: ROOT + "02_Organizer%20Dashboard/index.html" },
    { key: "events",    label: "Events",    icon: "events_icon.png",    href: ROOT + "03_Create%20Event/index.html" },
    { key: "attendees", label: "Attendees", icon: "attendees_icon.png", href: ROOT + "08_Attendees%20Management/index.html" },
    { key: "checkin",   label: "Check-in",  icon: "check_in_icon.png",  href: ROOT + "09_Check-in%20Dashboard/index.html" },
    { key: "analytics", label: "Analytics", icon: "analytics_icon.png", href: ROOT + "10_Analytics/index.html" },
    { key: "settings",  label: "Settings",  icon: "settings_icon.png",  href: ROOT + "11_Settings/index.html" }
  ];
  var SIGN_IN = ROOT + "01_Sign%20In/index.html";
  var LOGOUT_URL = "https://eventra-backend-aidf.onrender.com/api/auth/logout";
  var DATE_KEY = "eventra_shell_date_label";
  var DEFAULT_DATE = "1 Oct 2026 – 31 Oct 2026";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var body = document.body;
  var activeKey = (body && body.getAttribute("data-eventra-nav")) || "";

  /* ---------- helpers ---------- */
  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byId(id) { return document.getElementById(id); }
  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key) || "null"); } catch (e) { return null; }
  }
  function getUser() {
    var u = readJSON(localStorage, "eventra_user") || readJSON(localStorage, "eventraUser") ||
            readJSON(localStorage, "user") || readJSON(sessionStorage, "eventra_user") || {};
    return {
      name: u.organization_name || u.organizer_name || u.full_name || u.name || "Apex Live Events",
      email: u.email || "organizer@eventra.io"
    };
  }
  function initial(name) { return (String(name).trim().charAt(0) || "A").toUpperCase(); }

  /* ---------- markup ---------- */
  function navLinks(prefix) {
    return NAV.map(function (n) {
      var on = n.key === activeKey;
      return '<a class="es-link' + (on ? " is-active" : "") + '" href="' + n.href + '"' +
        (on ? ' aria-current="page"' : "") + ">" +
        '<img src="' + ASSETS + n.icon + '" alt="" aria-hidden="true"><span>' + n.label + "</span></a>";
    }).join("");
  }
  function accountCard(withGear) {
    return '<div class="es-account"><div class="es-account-card">' +
      '<span class="es-bolt" aria-hidden="true">ϟ</span>' +
      '<div><p class="es-acc-title">Pro Organizer</p><p class="es-acc-sub">Live Portal</p></div>' +
      (withGear ? '<a class="es-gear" href="' + NAV[5].href + '" aria-label="Settings" id="sidebarSettings">⚙</a>' : "") +
      "</div></div>";
  }

  var user = getUser();
  var storedDate = null;
  try { storedDate = localStorage.getItem(DATE_KEY); } catch (e) {}

  var html =
    '<aside class="es-sidebar" id="eventraSidebar" aria-label="Organizer sidebar">' +
      '<a class="es-brand" href="' + NAV[0].href + '" aria-label="Eventra dashboard"><img src="' + ASSETS + 'eventra-logo-white.png" alt="Eventra"></a>' +
      '<p class="es-workspace">Organizer Workspace</p>' +
      '<nav class="es-nav" aria-label="Organizer navigation">' + navLinks() + "</nav>" +
      accountCard(true) +
    "</aside>" +

    '<div class="es-overlay" id="mobileMenuOverlay" aria-hidden="true"></div>' +
    '<aside class="es-drawer" id="mobileDrawer" aria-label="Organizer menu" aria-hidden="true">' +
      '<div class="es-drawer-head"><img src="' + ASSETS + 'eventra-logo-white.png" alt="Eventra">' +
        '<button type="button" class="es-drawer-close" id="mobileMenuClose" aria-label="Close organizer menu">×</button></div>' +
      '<nav class="es-nav" aria-label="Mobile organizer navigation">' + navLinks() + "</nav>" +
      accountCard(false) +
    "</aside>" +

    '<header class="es-topbar" id="eventraTopbar">' +
      '<div class="es-left">' +
        '<button type="button" class="es-burger" id="mobileMenuButton" aria-label="Open organizer menu" aria-expanded="false" aria-controls="mobileDrawer">☰</button>' +
        '<p class="es-title">Organizer Portal</p>' +
        '<button type="button" class="es-date" id="topDateButton" aria-haspopup="dialog" aria-expanded="false" title="Date range">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' +
          '<span id="topDateLabel" class="date-range-label">' + esc(storedDate || DEFAULT_DATE) + "</span>" +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
        "</button>" +
      "</div>" +
      '<div class="es-right">' +
        '<button type="button" class="es-icon-btn" id="notificationButton" aria-label="Notifications" title="Notifications" aria-haspopup="true" aria-expanded="false">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>' +
        "</button>" +
        '<button type="button" class="es-icon-btn es-help" id="helpButton" aria-label="Help" title="Help" aria-haspopup="true" aria-expanded="false">?</button>' +
        '<div class="es-who"><p class="es-name" id="organizerName">' + esc(user.name) + '</p><p class="es-email" id="organizerEmail">' + esc(user.email) + "</p></div>" +
        '<button type="button" class="es-avatar" id="profileButton" aria-label="Organizer profile" title="Profile" aria-haspopup="true" aria-expanded="false">' + esc(initial(user.name)) + "</button>" +
      "</div>" +
    "</header>" +

    '<div class="es-menu" id="eventraMenu" role="menu"></div>' +

    '<div class="es-date-pop" id="eventraDatePop" role="dialog" aria-label="Select date range">' +
      "<h2>Date range</h2>" +
      '<div class="es-presets" id="esPresets">' +
        '<button type="button" class="es-preset" data-preset="month">This month</button>' +
        '<button type="button" class="es-preset" data-preset="30">Last 30 days</button>' +
        '<button type="button" class="es-preset" data-preset="7">Last 7 days</button>' +
        '<button type="button" class="es-preset" data-preset="quarter">This quarter</button>' +
      "</div>" +
      '<div class="es-date-grid">' +
        '<label>Start date<input type="date" id="esStart"></label>' +
        '<label>End date<input type="date" id="esEnd"></label>' +
      "</div>" +
      '<p class="es-date-error" id="esDateError" role="alert"></p>' +
      '<div class="es-date-actions"><button type="button" class="es-btn" id="esCancel">Cancel</button>' +
        '<button type="button" class="es-btn es-primary" id="esApply">Apply</button></div>' +
    "</div>";

  body.classList.add("eventra-shell");
  body.insertAdjacentHTML("afterbegin", html);

  /* ---------- drawer ---------- */
  var drawer = byId("mobileDrawer");
  var overlay = byId("mobileMenuOverlay");
  var burger = byId("mobileMenuButton");

  function openDrawer() {
    closeMenus();
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    body.classList.add("es-drawer-open");
    var close = byId("mobileMenuClose");
    if (close) close.focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    body.classList.remove("es-drawer-open");
    burger.focus();
  }
  burger.addEventListener("click", openDrawer);
  byId("mobileMenuClose").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) closeDrawer();
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) closeDrawer();
  });

  /* ---------- dropdown menus ---------- */
  var menu = byId("eventraMenu");
  var menuOwner = null;
  var triggers = {
    notifications: byId("notificationButton"),
    help: byId("helpButton"),
    profile: byId("profileButton")
  };

  function menuContent(kind) {
    if (kind === "notifications") {
      return '<p class="es-menu-head">Notifications</p>' +
        '<p class="es-menu-body">You’re all caught up. New organizer notifications will appear here.</p>';
    }
    if (kind === "help") {
      return '<p class="es-menu-head">Need help?</p>' +
        '<a href="' + NAV[1].href + '" role="menuitem">Creating an event</a>' +
        '<a href="' + NAV[2].href + '" role="menuitem">Managing attendees</a>' +
        '<a href="' + NAV[3].href + '" role="menuitem">Running check-in</a>' +
        '<a href="' + NAV[4].href + '" role="menuitem">Reading your analytics</a>';
    }
    var name = (byId("organizerName") || {}).textContent || user.name;
    var email = (byId("organizerEmail") || {}).textContent || user.email;
    return '<div class="es-profile-card"><span class="es-avatar" aria-hidden="true">' + esc(initial(name)) + "</span>" +
      '<div><p class="es-pname">' + esc(name) + '</p><p class="es-pemail">' + esc(email) + "</p></div></div><hr>" +
      '<a href="' + NAV[5].href + '" role="menuitem">Account settings</a>' +
      '<button type="button" class="es-menu-item es-danger" id="esSignOut" role="menuitem">Sign out</button>';
  }
  function closeMenus() {
    menu.classList.remove("is-open");
    Object.keys(triggers).forEach(function (k) { triggers[k].setAttribute("aria-expanded", "false"); });
    menuOwner = null;
  }
  function toggleMenu(kind) {
    var wasOpen = menuOwner === kind;
    closeMenus();
    closeDatePop();
    if (wasOpen) return;
    menu.innerHTML = menuContent(kind);
    menu.classList.add("is-open");
    triggers[kind].setAttribute("aria-expanded", "true");
    menuOwner = kind;
    var so = byId("esSignOut");
    if (so) so.addEventListener("click", signOut);
  }
  Object.keys(triggers).forEach(function (k) {
    triggers[k].addEventListener("click", function (e) { e.stopPropagation(); toggleMenu(k); });
  });

  function signOut() {
    var token = null;
    try {
      token = localStorage.getItem("eventra_access_token") || localStorage.getItem("eventra_token") || localStorage.getItem("access_token");
    } catch (e) {}
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      ["eventra_access_token", "eventra_token", "access_token", "eventra_refresh_token", "refresh_token",
       "eventra_user", "eventraUser", "user"].forEach(function (k) {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      try { sessionStorage.removeItem("eventra_user"); } catch (e) {}
      window.location.href = SIGN_IN;
    }
    if (!token || !window.fetch) { finish(); return; }
    setTimeout(finish, 2500);                       // never trap the user on a slow server
    fetch(LOGOUT_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }
    }).then(finish, finish);
  }

  /* ---------- default date-range popover ---------- */
  var datePop = byId("eventraDatePop");
  var dateBtn = byId("topDateButton");
  var dateLabel = byId("topDateLabel");
  var startInput = byId("esStart");
  var endInput = byId("esEnd");
  var dateError = byId("esDateError");

  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseISO(s) {
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmtDay(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function fmtRange(a, b) { return fmtDay(a) + " – " + fmtDay(b); }
  function presetRange(key) {
    var end = new Date(), start = new Date();
    if (key === "month") { start = new Date(end.getFullYear(), end.getMonth(), 1); end = new Date(end.getFullYear(), end.getMonth() + 1, 0); }
    else if (key === "30") { start.setDate(end.getDate() - 29); }
    else if (key === "7") { start.setDate(end.getDate() - 6); }
    else if (key === "quarter") {
      var q = Math.floor(end.getMonth() / 3) * 3;
      start = new Date(end.getFullYear(), q, 1); end = new Date(end.getFullYear(), q + 3, 0);
    }
    return [start, end];
  }
  function setPresetActive(key) {
    Array.prototype.forEach.call(document.querySelectorAll("#esPresets .es-preset"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-preset") === key);
    });
  }
  function closeDatePop() {
    datePop.classList.remove("is-open");
    dateBtn.setAttribute("aria-expanded", "false");
  }
  function openDatePop() {
    closeMenus();
    var r = dateBtn.getBoundingClientRect();
    var width = Math.min(390, window.innerWidth - 24);
    datePop.style.top = Math.round(r.bottom + 8) + "px";
    datePop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12)) + "px";
    dateError.textContent = "";
    setPresetActive("");
    datePop.classList.add("is-open");
    dateBtn.setAttribute("aria-expanded", "true");
    startInput.focus();
  }
  dateBtn.addEventListener("click", function (e) {
    if (api.customDatePicker) return;               // the page owns its own picker
    e.stopPropagation();
    if (datePop.classList.contains("is-open")) closeDatePop(); else openDatePop();
  });
  Array.prototype.forEach.call(document.querySelectorAll("#esPresets .es-preset"), function (b) {
    b.addEventListener("click", function () {
      var r = presetRange(b.getAttribute("data-preset"));
      startInput.value = iso(r[0]);
      endInput.value = iso(r[1]);
      setPresetActive(b.getAttribute("data-preset"));
      dateError.textContent = "";
    });
  });
  byId("esCancel").addEventListener("click", closeDatePop);
  byId("esApply").addEventListener("click", function () {
    if (!startInput.value || !endInput.value) { dateError.textContent = "Choose a start and end date."; return; }
    var a = parseISO(startInput.value), b = parseISO(endInput.value);
    if (a > b) { dateError.textContent = "The end date must be after the start date."; return; }
    var label = fmtRange(a, b);
    api.setDateLabel(label);
    closeDatePop();
    window.dispatchEvent(new CustomEvent("eventra:daterange", { detail: { start: startInput.value, end: endInput.value, label: label } }));
  });

  /* ---------- global dismiss ---------- */
  document.addEventListener("click", function (e) {
    if (menu.classList.contains("is-open") && !menu.contains(e.target)) closeMenus();
    if (datePop.classList.contains("is-open") && !datePop.contains(e.target) && !dateBtn.contains(e.target)) closeDatePop();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeMenus();
    closeDatePop();
    closeDrawer();
  });

  /* ---------- keep the date label identical across pages ---------- */
  if (window.MutationObserver) {
    new MutationObserver(function () {
      try { localStorage.setItem(DATE_KEY, dateLabel.textContent.trim()); } catch (e) {}
    }).observe(dateLabel, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- public API ---------- */
  var api = window.EventraShell = {
    customDatePicker: false,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    setDateLabel: function (text) { if (text) dateLabel.textContent = text; },
    setOrganizer: function (name, email) {
      if (name) {
        byId("organizerName").textContent = name;
        byId("profileButton").textContent = initial(name);
      }
      if (email) byId("organizerEmail").textContent = email;
    }
  };
})();
