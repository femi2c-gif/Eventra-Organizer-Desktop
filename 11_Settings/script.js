
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "https://eventra-backend-aidf.onrender.com/api";

  const STORAGE = {
    profile: "eventra_organizer_settings_profile",
    notifications: "eventra_organizer_notification_preferences",
    appearance: "eventra_organizer_appearance"
  };

  const $ = (id) => document.getElementById(id);

  const toast = $("toast");
  const toastTitle = $("toastTitle");
  const toastMessage = $("toastMessage");

  let toastTimer;
  let avatarData = "";
  let originalProfile = null;

  const defaultProfile = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organizationName: "",
    organizationBio: ""
  };

  const defaultNotifications = {
    events: true,
    sales: true,
    attendees: true,
    news: false
  };

  const defaultAppearance = {
    theme: "light",
    textSize: "normal"
  };

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`Could not read ${key}:`, error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Could not save ${key}:`, error);
      showToast(
        "Storage unavailable",
        "Your browser could not save these preferences. Check your browser storage settings."
      );
      return false;
    }
  }

  function getToken() {
    return (
      localStorage.getItem("eventra_access_token") ||
      localStorage.getItem("eventra_token") ||
      localStorage.getItem("access_token") ||
      ""
    );
  }

  function getStoredUser() {
    const keys = ["eventra_user", "user"];

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (error) {
        // Try the next known storage key.
      }
    }

    return {};
  }

  async function apiRequest(path, options = {}) {
    const token = getToken();

    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    let payload = {};

    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      const message =
        payload.message ||
        payload.error ||
        `Request failed (${response.status}).`;

      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }

    return payload;
  }

  function showToast(message, title = "Eventra") {
    if (!toast || !toastTitle || !toastMessage) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.remove("translate-y-3", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.add("translate-y-3", "opacity-0");
      toast.classList.remove("translate-y-0", "opacity-100");
    }, 3200);
  }

  /* --------------------------------------------------
     SETTINGS SECTION NAVIGATION
  -------------------------------------------------- */

  const sectionButtons = [
    ...document.querySelectorAll("[data-section]")
  ];

  const sections = [
    ...document.querySelectorAll(".settings-section")
  ];

  function showSection(sectionName, updateHash = true) {
    const target = $(`section-${sectionName}`);

    if (!target) return;

    sections.forEach((section) => {
      const active = section.id === `section-${sectionName}`;
      section.hidden = !active;
      section.classList.toggle("hidden", !active);
    });

    sectionButtons.forEach((button) => {
      const active = button.dataset.section === sectionName;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (updateHash) {
      history.replaceState(null, "", `#${sectionName}`);
    }
  }

  sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });

  const initialSection = window.location.hash.replace("#", "");
  const validSections = ["profile", "security", "notifications", "appearance"];

  showSection(
    validSections.includes(initialSection) ? initialSection : "profile",
    false
  );

  /* --------------------------------------------------
     PROFILE DATA
  -------------------------------------------------- */

  function getProfileFormData() {
    return {
      firstName: $("firstName").value.trim(),
      lastName: $("lastName").value.trim(),
      email: $("email").value.trim(),
      phone: $("phone").value.trim(),
      organizationName: $("organizationName").value.trim(),
      organizationBio: $("organizationBio").value.trim()
    };
  }

  function setProfileFormData(profile = {}) {
    $("firstName").value = profile.firstName || "";
    $("lastName").value = profile.lastName || "";
    $("email").value = profile.email || "";
    $("phone").value = profile.phone || "";
    $("organizationName").value = profile.organizationName || "";
    $("organizationBio").value = profile.organizationBio || "";

    avatarData = profile.avatarData || "";

    updateProfileIdentity();
    updateBioCounter();
    renderAvatar();
  }

  function updateProfileIdentity() {
    const firstName = $("firstName").value.trim();
    const lastName = $("lastName").value.trim();
    const email = $("email").value.trim();
    const organizationName = $("organizationName").value.trim();

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const displayName = fullName || organizationName || "Organizer Account";
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "O";

    $("profileDisplayName").textContent = displayName;
    if (window.EventraShell) {
      // Only real profile data goes to the shared top bar (never the placeholder name).
      window.EventraShell.setOrganizer(organizationName || fullName, email);
    }

    if (!avatarData) {
      $("avatarPreview").textContent = initials;
    }
  }

  function renderAvatar() {
    const avatar = $("avatarPreview");

    avatar.replaceChildren();

    if (avatarData) {
      const image = document.createElement("img");
      image.src = avatarData;
      image.alt = "Organizer profile preview";
      image.className = "h-full w-full rounded-2xl object-cover";
      avatar.appendChild(image);
    } else {
      const name =
        `${$("firstName").value} ${$("lastName").value}`.trim() ||
        $("organizationName").value.trim() ||
        "Organizer";

      avatar.textContent = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("") || "O";
    }
  }

  function updateBioCounter() {
    $("bioCounter").textContent = $("organizationBio").value.length;
  }

  function getBackendProfile(payload) {
    let result = payload?.data ?? payload;

    if (result?.user) result = result.user;
    if (result?.profile) result = result.profile;

    return result && typeof result === "object" ? result : {};
  }

  function normalizeBackendProfile(profile) {
    return {
      firstName:
        profile.first_name ??
        profile.firstName ??
        profile.first_name ??
        "",
      lastName:
        profile.last_name ??
        profile.lastName ??
        "",
      email: profile.email || "",
      phone: profile.phone || "",
      organizationName:
        profile.organization_name ??
        profile.organizationName ??
        profile.company_name ??
        "",
      organizationBio:
        profile.bio ??
        profile.organization_bio ??
        profile.organizationBio ??
        ""
    };
  }

  function toBackendProfile(profile) {
    return {
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      company: profile.organizationName,
      bio: profile.organizationBio
    };
  }

  async function loadProfileFromBackend() {
    if (!getToken()) return;

    try {
      const payload = await apiRequest("/users/profile", {
        method: "GET"
      });

      const profile = normalizeBackendProfile(
        getBackendProfile(payload)
      );

      setProfileFormData({
        ...defaultProfile,
        ...profile,
        avatarData
      });

      originalProfile = getProfileFormData();

      writeStorage(STORAGE.profile, {
        ...originalProfile,
        avatarData
      });
    } catch (error) {
      console.warn("Could not load organizer profile:", error);

      if (error.status !== 401 && error.status !== 403) {
        showToast(
          "Using locally saved profile information. The server profile could not be loaded.",
          "Profile"
        );
      }
    }
  }

  async function saveProfileToBackend(profile) {
    if (!getToken()) return false;

    try {
      await apiRequest("/users/profile", {
        method: "PUT",
        body: JSON.stringify(toBackendProfile(profile))
      });

      return true;
    } catch (error) {
      console.error("Profile update failed:", error);

      showToast(
        error.message || "The profile could not be updated on the server.",
        "Server update failed"
      );

      return false;
    }
  }

  async function saveProfile(event) {
    event?.preventDefault();

    const profile = getProfileFormData();

    if (!profile.firstName || !profile.lastName) {
      showToast("Enter your first name and last name.", "Check your details");
      showSection("profile");
      $("firstName").focus();
      return;
    }

    if (profile.email && !$("email").checkValidity()) {
      showToast("Enter a valid email address.", "Check your email");
      $("email").focus();
      return;
    }

    const saveButton = $("saveChangesButton");
    const originalButtonText = saveButton.innerHTML;

    saveButton.disabled = true;
    saveButton.textContent = "Saving…";

    try {
      const savedLocally = writeStorage(STORAGE.profile, {
        ...profile,
        avatarData
      });

      if (getToken()) {
        const savedRemotely = await saveProfileToBackend(profile);

        if (!savedRemotely) return;

        showToast("Your profile has been updated.", "Changes saved");
      } else if (savedLocally) {
        showToast(
          "Your profile is saved in this browser. Sign in to sync it with the server.",
          "Profile saved locally"
        );
      }

      originalProfile = { ...profile };
      updateProfileIdentity();
      renderAvatar();
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = originalButtonText;
    }
  }

  $("profileForm").addEventListener("submit", saveProfile);
  $("saveChangesButton").addEventListener("click", saveProfile);

  [
    "firstName",
    "lastName",
    "email",
    "organizationName"
  ].forEach((id) => {
    $(id).addEventListener("input", updateProfileIdentity);
  });

  $("organizationBio").addEventListener("input", updateBioCounter);

  $("avatarUpload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Choose a PNG, JPG, or WebP image.", "Unsupported image");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast("Choose an image smaller than 3MB.", "Image too large");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      avatarData = String(reader.result || "");
      renderAvatar();
      updateProfileIdentity();

      writeStorage(STORAGE.profile, {
        ...getProfileFormData(),
        avatarData
      });

      showToast(
        "Photo preview updated in this browser. Server upload is not connected.",
        "Photo preview"
      );
    };

    reader.onerror = () => {
      showToast("The selected image could not be read.", "Upload failed");
    };

    reader.readAsDataURL(file);
  });

  $("removeAvatarButton").addEventListener("click", () => {
    avatarData = "";
    $("avatarUpload").value = "";
    renderAvatar();
    updateProfileIdentity();

    writeStorage(STORAGE.profile, {
      ...getProfileFormData(),
      avatarData: ""
    });

    showToast("The local profile photo preview was removed.", "Photo removed");
  });

  /* --------------------------------------------------
     RESET CHANGES
  -------------------------------------------------- */

  $("resetChangesButton").addEventListener("click", () => {
    const storedProfile = readStorage(STORAGE.profile, null);

    if (storedProfile) {
      setProfileFormData(storedProfile);
    } else {
      setProfileFormData(defaultProfile);
    }

    showToast("Profile fields have been reset to the last locally saved values.", "Changes reset");
  });

  /* --------------------------------------------------
     NOTIFICATION PREFERENCES
  -------------------------------------------------- */

  function readNotificationForm() {
    return {
      events: $("notifyEvents").checked,
      sales: $("notifySales").checked,
      attendees: $("notifyAttendees").checked,
      news: $("notifyNews").checked
    };
  }

  function setNotificationForm(preferences) {
    $("notifyEvents").checked = preferences.events !== false;
    $("notifySales").checked = preferences.sales !== false;
    $("notifyAttendees").checked = preferences.attendees !== false;
    $("notifyNews").checked = preferences.news === true;
  }

  function saveNotificationPreferences() {
    const saved = writeStorage(
      STORAGE.notifications,
      readNotificationForm()
    );

    if (saved) {
      showToast(
        "Your notification preferences were saved in this browser.",
        "Preferences saved"
      );
    }
  }

  $("saveNotificationsButton").addEventListener(
    "click",
    saveNotificationPreferences
  );

  /* --------------------------------------------------
     APPEARANCE
  -------------------------------------------------- */

  function applyTextSize(size) {
    document.documentElement.classList.toggle(
      "text-size-large",
      size === "large"
    );

    if (size === "large") {
      document.body.style.fontSize = "16px";
    } else {
      document.body.style.fontSize = "";
    }
  }

  function readAppearanceForm() {
    return {
      theme:
        document.querySelector('input[name="theme"]:checked')?.value ||
        "light",
      textSize: $("textSize").value
    };
  }

  function saveAppearance() {
    const appearance = readAppearanceForm();

    if (writeStorage(STORAGE.appearance, appearance)) {
      applyTextSize(appearance.textSize);

      showToast(
        appearance.theme === "dark"
          ? "Dark preview preference saved. The page retains the approved light theme."
          : "Your appearance preferences have been saved.",
        "Appearance saved"
      );
    }
  }

  $("saveAppearanceButton").addEventListener("click", saveAppearance);

  /* --------------------------------------------------
     PASSWORD UPDATE
  -------------------------------------------------- */

  function setPasswordFormVisible(visible) {
    $("passwordForm").hidden = !visible;
    $("passwordForm").classList.toggle("hidden", !visible);

    if (visible) {
      $("currentPassword").focus();
    } else {
      $("passwordForm").reset();
    }
  }

  $("showPasswordFormButton").addEventListener("click", () => {
    setPasswordFormVisible(true);
  });

  $("cancelPasswordButton").addEventListener("click", () => {
    setPasswordFormVisible(false);
  });

  $("passwordForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentPassword = $("currentPassword").value;
    const newPassword = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (newPassword.length < 8) {
      showToast("Your new password must contain at least 8 characters.", "Password too short");
      $("newPassword").focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("The new password fields do not match.", "Check your password");
      $("confirmPassword").focus();
      return;
    }

    if (currentPassword === newPassword) {
      showToast("Choose a password different from your current password.", "Choose a new password");
      return;
    }

    if (!getToken()) {
      showToast(
        "Sign in to your account before changing your password.",
        "Authentication required"
      );
      return;
    }

    const submitButton = $("passwordForm").querySelector(
      'button[type="submit"]'
    );

    const previousText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Updating…";

    try {
      await apiRequest("/users/change-password", {
        method: "PUT",
        body: JSON.stringify({
          old_password: currentPassword,
          new_password: newPassword
        })
      });

      setPasswordFormVisible(false);

      showToast("Your password was updated successfully.", "Password updated");
    } catch (error) {
      showToast(
        error.message || "The password could not be changed.",
        "Password update failed"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = previousText;
    }
  });

  /* --------------------------------------------------
     SIGN OUT
  -------------------------------------------------- */

  $("signOutButton").addEventListener("click", async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;

    if (getToken()) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST"
        });
      } catch (error) {
        console.warn("Server sign-out request failed:", error);
      }
    }

    [
      "eventra_access_token",
      "eventra_token",
      "access_token",
      "eventra_refresh_token",
      "refresh_token",
      "eventra_user",
      "user"
    ].forEach((key) => localStorage.removeItem(key));

    sessionStorage.removeItem("eventra_user");

    window.location.href = "../01_Sign%20In/index.html";
  });

  /* --------------------------------------------------
     HEADER ACTIONS
  -------------------------------------------------- */

  $("contactSupportButton").addEventListener("click", () => {
    showToast(
      "Please contact your Eventra support team using your official support channel.",
      "Contact support"
    );
  });

  /* --------------------------------------------------
     INITIALIZE PAGE
  -------------------------------------------------- */

  function initializeLocalSettings() {
    const storedProfile = readStorage(STORAGE.profile, defaultProfile);
    const storedNotifications = readStorage(
      STORAGE.notifications,
      defaultNotifications
    );
    const storedAppearance = readStorage(
      STORAGE.appearance,
      defaultAppearance
    );

    const user = getStoredUser();

    const userProfile = {
      firstName: user.first_name || user.firstName || "",
      lastName: user.last_name || user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      organizationName:
        user.organization_name ||
        user.organizationName ||
        user.company_name ||
        "",
      organizationBio: user.bio || ""
    };

    const profile = {
      ...defaultProfile,
      ...userProfile,
      ...storedProfile
    };

    setProfileFormData(profile);

    originalProfile = getProfileFormData();

    setNotificationForm({
      ...defaultNotifications,
      ...storedNotifications
    });

    const selectedTheme = document.querySelector(
      `input[name="theme"][value="${storedAppearance.theme || "light"}"]`
    );

    if (selectedTheme) selectedTheme.checked = true;

    $("textSize").value = storedAppearance.textSize || "normal";
    applyTextSize($("textSize").value);
  }

  initializeLocalSettings();

  // Fetch the authenticated organizer profile when a token exists.
  loadProfileFromBackend();
});