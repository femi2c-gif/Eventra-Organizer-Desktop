
"use strict";

/* =========================================================
   EVENTRA — SCREEN 12: CREATE ACCOUNT
========================================================= */

const API_BASE_URL = "https://eventra-backend-aidf.onrender.com/api";

const ROUTES = {
  signIn: "../01_Sign In/index.html",
  verifyAccount: "../01_Sign In/index.html",
  welcome: "../01_Sign In/index.html"
};

const STORAGE_KEYS = {
  accessToken: "eventra_access_token",
  refreshToken: "eventra_refresh_token",
  user: "eventra_user",
  email: "eventra_registration_email"
};

const $ = (id) => document.getElementById(id);

const form = $("createAccountForm");

const firstNameInput = $("firstName");
const lastNameInput = $("lastName");
const emailInput = $("email");
const phoneInput = $("phone");
const passwordInput = $("password");
const confirmPasswordInput = $("confirmPassword");
const termsInput = $("terms");

const createAccountButton = $("createAccountButton");
const createAccountButtonText = $("createAccountButtonText");
const createAccountArrow = $("createAccountArrow");
const createAccountSpinner = $("createAccountSpinner");

const passwordStrengthFill = $("passwordStrengthFill");
const passwordStrengthText = $("passwordStrengthText");
const formMessage = $("formMessage");
const toast = $("toast");

let registrationInProgress = false;
let toastTimer = null;

/* ---------------------------------------------------------
   MESSAGES
--------------------------------------------------------- */

function showToast(message, type = "info") {
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show";

  if (type === "error") toast.classList.add("error");
  if (type === "success") toast.classList.add("success");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function showFormMessage(message, type = "error") {
  if (!formMessage) return;

  formMessage.textContent = message;
  formMessage.className =
    "mt-3 rounded-lg border px-3 py-2.5 text-[13px] leading-5";

  if (type === "success") {
    formMessage.classList.add(
      "border-green-200",
      "bg-green-50",
      "text-green-800"
    );
  } else {
    formMessage.classList.add(
      "border-red-200",
      "bg-red-50",
      "text-red-700"
    );
  }

  formMessage.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function clearFormMessage() {
  if (!formMessage) return;

  formMessage.textContent = "";
  formMessage.className = "hidden";
}

/* ---------------------------------------------------------
   FIELD ERRORS
--------------------------------------------------------- */

function setFieldError(input, errorId, message) {
  const errorElement = $(errorId);

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.toggle("show", Boolean(message));
  }

  if (input) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.classList.toggle("border-red-400", Boolean(message));
  }
}

function clearFieldErrors() {
  [
    [firstNameInput, "firstNameError"],
    [lastNameInput, "lastNameError"],
    [emailInput, "emailError"],
    [phoneInput, "phoneError"],
    [passwordInput, "passwordError"],
    [confirmPasswordInput, "confirmPasswordError"]
  ].forEach(([input, id]) => setFieldError(input, id, ""));

  setFieldError(null, "termsError", "");
}

/* ---------------------------------------------------------
   PASSWORD VISIBILITY
--------------------------------------------------------- */

function togglePasswordVisibility(input, button) {
  if (!input || !button) return;

  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";

  button.setAttribute("aria-pressed", String(showPassword));
  button.setAttribute(
    "aria-label",
    showPassword ? "Hide password" : "Show password"
  );
}

$("togglePassword")?.addEventListener("click", () => {
  togglePasswordVisibility(passwordInput, $("togglePassword"));
});

$("toggleConfirmPassword")?.addEventListener("click", () => {
  togglePasswordVisibility(
    confirmPasswordInput,
    $("toggleConfirmPassword")
  );
});

/* ---------------------------------------------------------
   PASSWORD STRENGTH
--------------------------------------------------------- */

function calculatePasswordStrength(password) {
  if (!password) {
    return {
      label: "Enter a password",
      color: "#DCE5F7",
      width: "0%"
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length < 8 || score <= 2) {
    return {
      label: "Weak password",
      color: "#EF4444",
      width: "30%"
    };
  }

  if (score <= 4) {
    return {
      label: "Medium Security",
      color: "#F59E0B",
      width: "65%"
    };
  }

  return {
    label: "✦ High Security",
    color: "#6326FF",
    width: "100%"
  };
}

function updatePasswordStrength() {
  const result = calculatePasswordStrength(passwordInput.value);

  passwordStrengthFill.style.width = result.width;
  passwordStrengthFill.style.backgroundColor = result.color;
  passwordStrengthText.textContent = result.label;
  passwordStrengthText.style.color = result.color;
}

passwordInput.addEventListener("input", updatePasswordStrength);

/* ---------------------------------------------------------
   PHONE NUMBER NORMALISATION
--------------------------------------------------------- */

function normalizePhoneNumber(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("234")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  return digits;
}

function isValidNigerianMobile(value) {
  return /^[789][01]\d{8}$/.test(normalizePhoneNumber(value));
}

phoneInput.addEventListener("input", () => {
  const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  phoneInput.value = digits.replace(
    /(\d{3})(\d{3})(\d{0,4})/,
    (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")
  );
});

/* ---------------------------------------------------------
   FORM VALIDATION
--------------------------------------------------------- */

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}

function validateForm() {
  clearFieldErrors();
  clearFormMessage();

  let valid = true;

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (firstName.length < 2) {
    setFieldError(
      firstNameInput,
      "firstNameError",
      "Enter a first name containing at least 2 characters."
    );
    valid = false;
  }

  if (lastName.length < 2) {
    setFieldError(
      lastNameInput,
      "lastNameError",
      "Enter a last name containing at least 2 characters."
    );
    valid = false;
  }

  if (!isValidEmail(email)) {
    setFieldError(
      emailInput,
      "emailError",
      "Enter a valid email address."
    );
    valid = false;
  }

  if (!isValidNigerianMobile(phone)) {
    setFieldError(
      phoneInput,
      "phoneError",
      "Enter a valid Nigerian mobile number."
    );
    valid = false;
  }

  if (password.length < 8) {
    setFieldError(
      passwordInput,
      "passwordError",
      "Your password must contain at least 8 characters."
    );
    valid = false;
  } else if (!/[0-9]/.test(password)) {
    setFieldError(
      passwordInput,
      "passwordError",
      "Include at least one number in your password."
    );
    valid = false;
  }

  if (!confirmPassword) {
    setFieldError(
      confirmPasswordInput,
      "confirmPasswordError",
      "Please confirm your password."
    );
    valid = false;
  } else if (password !== confirmPassword) {
    setFieldError(
      confirmPasswordInput,
      "confirmPasswordError",
      "Your passwords do not match."
    );
    valid = false;
  }

  if (!termsInput.checked) {
    setFieldError(
      null,
      "termsError",
      "Please accept the Terms of Service and Privacy Policy."
    );
    valid = false;
  }

  if (!valid) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    showToast("Please correct the highlighted fields.", "error");
  }

  return valid;
}

/* ---------------------------------------------------------
   SUBMIT BUTTON STATE
--------------------------------------------------------- */

function setSubmitting(isSubmitting) {
  registrationInProgress = isSubmitting;

  createAccountButton.disabled = isSubmitting;
  createAccountButton.setAttribute("aria-busy", String(isSubmitting));

  createAccountButtonText.textContent = isSubmitting
    ? "Creating Account..."
    : "Create Account";

  createAccountArrow.classList.toggle("hidden", isSubmitting);
  createAccountSpinner.classList.toggle("hidden", !isSubmitting);
}

/* ---------------------------------------------------------
   RESPONSE HELPERS
--------------------------------------------------------- */

async function readResponse(response) {
  const responseText = await response.text();

  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message: "The server returned an unexpected response."
    };
  }
}

function responseMessage(payload, fallback) {
  return (
    payload?.message ||
    payload?.error?.message ||
    payload?.data?.message ||
    fallback
  );
}

/* ---------------------------------------------------------
   REGISTER ACCOUNT
--------------------------------------------------------- */

async function registerAccount(event) {
  event.preventDefault();

  if (registrationInProgress || !validateForm()) return;

  const email = emailInput.value.trim().toLowerCase();

  const registrationPayload = {
    first_name: firstNameInput.value.trim(),
    last_name: lastNameInput.value.trim(),
    email,
    phone: `+234${normalizePhoneNumber(phoneInput.value)}`,
    password: passwordInput.value,
    role: "attendee"
  };

  setSubmitting(true);
  clearFormMessage();

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(registrationPayload)
    });

    const result = await readResponse(response);

    if (!response.ok) {
      const message = responseMessage(
        result,
        response.status === 409
          ? "An account with this email may already exist. Try signing in."
          : "We could not create your account. Please try again."
      );

      showFormMessage(message, "error");
      showToast(message, "error");
      return;
    }

    const data = result?.data || {};
    const user = data?.user || result?.user || {};

    const verificationId =
      data?.verification_id ||
      result?.verification_id ||
      "";

    const verificationRequired =
      data?.verification_required === true ||
      result?.verification_required === true;

    localStorage.setItem(STORAGE_KEYS.email, email);
    localStorage.setItem(
      STORAGE_KEYS.verificationRequired,
      String(verificationRequired)
    );

    sessionStorage.setItem(
      STORAGE_KEYS.verificationRequired,
      String(verificationRequired)
    );

    if (verificationId) {
      localStorage.setItem(STORAGE_KEYS.verificationId, verificationId);
      sessionStorage.setItem(STORAGE_KEYS.verificationId, verificationId);
    }

    if (user && Object.keys(user).length) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    }

    if (data?.access_token) {
      localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    }

    if (data?.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    }

    if (verificationRequired) {
      if (!verificationId) {
        showFormMessage(
          "Your account was created, but the server did not return a verification ID. Please contact support before retrying registration.",
          "error"
        );
        return;
      }

      showToast("Account created. Opening email verification...", "success");

      const destination = new URL(
        ROUTES.verifyAccount,
        window.location.href
      );

      destination.searchParams.set("email", email);

      window.setTimeout(() => {
        window.location.assign(destination.href);
      }, 700);

      return;
    }

    showFormMessage(
      result?.message ||
        "Your account was created successfully. Please sign in.",
      "success"
    );

    showToast("Account created successfully.", "success");

    window.setTimeout(() => {
      const destination = new URL(
        ROUTES.signIn,
        window.location.href
      );

      destination.searchParams.set("registered", "true");
      window.location.assign(destination.href);
    }, 1000);

  } catch (error) {
    console.error("Eventra registration request failed:", error);

    const message =
      "Unable to connect to Eventra. Check your internet connection and try again.";

    showFormMessage(message, "error");
    showToast(message, "error");

  } finally {
    setSubmitting(false);
  }
}

/* ---------------------------------------------------------
   CLEAR ERRORS WHILE TYPING
--------------------------------------------------------- */

[
  [firstNameInput, "firstNameError"],
  [lastNameInput, "lastNameError"],
  [emailInput, "emailError"],
  [phoneInput, "phoneError"],
  [passwordInput, "passwordError"],
  [confirmPasswordInput, "confirmPasswordError"]
].forEach(([input, errorId]) => {
  input.addEventListener("input", () => {
    setFieldError(input, errorId, "");
    clearFormMessage();
  });
});

termsInput.addEventListener("change", () => {
  setFieldError(null, "termsError", "");
});

/* ---------------------------------------------------------
   FORM SUBMISSION
--------------------------------------------------------- */

form.addEventListener("submit", registerAccount);

/* ---------------------------------------------------------
   BACK BUTTON
--------------------------------------------------------- */

$("backButton")?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.assign(ROUTES.welcome);
  }
});

/* ---------------------------------------------------------
   SOCIAL SIGN-UP
--------------------------------------------------------- */

$("googleSignup")?.addEventListener("click", () => {
  showToast("Google sign-up is not configured yet.");
});

$("appleSignup")?.addEventListener("click", () => {
  showToast("Apple sign-up is not configured yet.");
});

/* ---------------------------------------------------------
   INITIALISE
--------------------------------------------------------- */

updatePasswordStrength();

console.info("Eventra Create Account screen initialised.");