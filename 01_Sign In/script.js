// ============================================================
// EVENTRA
// SCREEN 09 - SIGN IN
// ============================================================


// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
    "https://eventra-backend-aidf.onrender.com/api";

    const LOGIN_ENDPOINT =
    `${API_BASE_URL}/auth/login`;


// ============================================================
// ROUTES
// ============================================================

const ROUTES = {

    signUp:
        "../12_Create Account/index.html",

    dashboard:
        "../02_Organizer Dashboard/index.html",
    
};


// ============================================================
// ELEMENTS
// ============================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const rememberMe =
    document.getElementById("rememberMe");

const togglePassword =
    document.getElementById("togglePassword");

const eyeOpen =
    document.getElementById("eyeOpen");

const eyeClosed =
    document.getElementById("eyeClosed");

const signInButton =
    document.getElementById("signInButton");

const signInText =
    document.getElementById("signInText");

const signInArrow =
    document.getElementById("signInArrow");

const loadingSpinner =
    document.getElementById("loadingSpinner");

const loginError =
    document.getElementById("loginError");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");


// ============================================================
// SHOW / HIDE PASSWORD
// ============================================================

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        function () {

            const isPassword =
                passwordInput.type === "password";


            if (isPassword) {

                passwordInput.type = "text";

                eyeOpen.classList.add(
                    "hidden"
                );

                eyeClosed.classList.remove(
                    "hidden"
                );

                togglePassword.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                passwordInput.type = "password";

                eyeClosed.classList.add(
                    "hidden"
                );

                eyeOpen.classList.remove(
                    "hidden"
                );

                togglePassword.setAttribute(
                    "aria-label",
                    "Show password"
                );

            }

        }
    );

}


// ============================================================
// CLEAR ERRORS
// ============================================================

function clearErrors() {

    loginError.classList.add(
        "hidden"
    );

    emailError.classList.add(
        "hidden"
    );

    passwordError.classList.add(
        "hidden"
    );

    loginError.textContent = "";

    emailError.textContent = "";

    passwordError.textContent = "";

}


// ============================================================
// SHOW LOGIN ERROR
// ============================================================

function showLoginError(message) {

    loginError.textContent =
        message;

    loginError.classList.remove(
        "hidden"
    );

}


// ============================================================
// EMAIL VALIDATION
// ============================================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


// ============================================================
// FORM VALIDATION
// ============================================================

function validateForm() {

    clearErrors();

    let valid = true;


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email) {

        emailError.textContent =
            "Please enter your email address.";

        emailError.classList.remove(
            "hidden"
        );

        valid = false;

    } else if (!isValidEmail(email)) {

        emailError.textContent =
            "Please enter a valid email address.";

        emailError.classList.remove(
            "hidden"
        );

        valid = false;

    }


    if (!password) {

        passwordError.textContent =
            "Please enter your password.";

        passwordError.classList.remove(
            "hidden"
        );

        valid = false;

    }


    return valid;

}


// ============================================================
// BUTTON LOADING STATE
// ============================================================

function setLoading(isLoading) {

    signInButton.disabled =
        isLoading;


    if (isLoading) {

        signInText.textContent =
            "Signing In...";

        signInArrow.classList.add(
            "hidden"
        );

        loadingSpinner.classList.remove(
            "hidden"
        );

    } else {

        signInText.textContent =
            "Sign In";

        signInArrow.classList.remove(
            "hidden"
        );

        loadingSpinner.classList.add(
            "hidden"
        );

    }

}


// ============================================================
// EXTRACT TOKEN
// ============================================================

function extractToken(responseData) {

    if (!responseData) {
        return null;
    }


    if (
        typeof responseData.token ===
        "string"
    ) {

        return responseData.token;

    }


    if (
        responseData.access_token
    ) {

        return responseData.access_token;

    }


    if (
        responseData.data &&
        typeof responseData.data.token ===
        "string"
    ) {

        return responseData.data.token;

    }


    if (
        responseData.data &&
        typeof responseData.data.access_token ===
        "string"
    ) {

        return responseData.data.access_token;

    }


    return null;

}


// ============================================================
// EXTRACT USER
// ============================================================

function extractUser(responseData) {

    if (!responseData) {
        return null;
    }


    if (responseData.user) {

        return responseData.user;

    }


    if (
        responseData.data &&
        responseData.data.user
    ) {

        return responseData.data.user;

    }


    return null;

}


// ============================================================
// SAVE AUTHENTICATION
// ============================================================

function saveAuthentication(data) {

    const token =
        extractToken(data);

    const user =
        extractUser(data);


    if (!token) {

        throw new Error(
            "Login succeeded, but the authentication token was not returned."
        );

    }


    // Clear previous authentication

    localStorage.removeItem(
        "eventra_token"
    );

    localStorage.removeItem(
        "eventra_user"
    );

    localStorage.removeItem(
        "eventra_access_token"
    );

    localStorage.removeItem(
        "eventra_refresh_token"
    );


    sessionStorage.removeItem(
        "eventra_token"
    );

    sessionStorage.removeItem(
        "eventra_user"
    );


    // Choose storage

    const storage =
        rememberMe.checked
            ? localStorage
            : sessionStorage;


    // Access token

    storage.setItem(
        "eventra_token",
        token
    );


    storage.setItem(
        "eventra_access_token",
        token
    );


    // Refresh token

    const refreshToken =
        data?.refresh_token ||
        data?.data?.refresh_token ||
        null;


    if (refreshToken) {

        storage.setItem(
            "eventra_refresh_token",
            refreshToken
        );

    }


    // User

    if (user) {

        storage.setItem(
            "eventra_user",
            JSON.stringify(user)
        );

    }


    // Remember email

    if (rememberMe.checked) {

        localStorage.setItem(
            "eventra_email",
            emailInput.value.trim()
        );

    } else {

        localStorage.removeItem(
            "eventra_email"
        );

    }

}


// ============================================================
// LOGIN API
// ============================================================

async function loginUser(
    email,
    password
) {

    const loginURL =
        `${API_BASE_URL}/auth/login`;


    let response;


    try {

        response =
            await fetch(
                loginURL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email:
                                email,

                            password:
                                password
                        })
                }
            );

    } catch (networkError) {

        console.error(
            "Eventra Login Network Error:",
            networkError
        );

        throw new Error(
            "Unable to connect to Eventra. Please check your internet connection and try again."
        );

    }


    const responseText =
        await response.text();


    let data = null;


    if (responseText) {

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            console.warn(
                "Eventra returned a non-JSON response.",
                responseText
            );

        }

    }


    // Do not log authentication response bodies: they may contain tokens or user data.
    console.info("Eventra login response status:", response.status);


    // ========================================================
    // HTTP ERROR
    // ========================================================

    if (!response.ok) {

        let message =
            "Unable to sign in. Please check your email and password.";


        if (
            data &&
            typeof data.message ===
            "string"
        ) {

            message =
                data.message;

        }


        if (
            response.status === 401
        ) {

            message =
                "Incorrect email or password. Please try again.";

        }


        if (
            response.status === 403
        ) {

            message =
                data?.message ||
                "Please verify your email before signing in.";

        }


        throw new Error(
            message
        );

    }


    // ========================================================
    // SUCCESS
    // ========================================================

    return data;

}


// ============================================================
// LOGIN FORM SUBMIT
// ============================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                !validateForm()
            ) {

                return;

            }


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            setLoading(true);


            try {

                const data =
                    await loginUser(
                        email,
                        password
                    );


                saveAuthentication(
                    data
                );


                console.log(
                    "Eventra login successful."
                );


                // ------------------------------------------------
                // Check if user was sent to login from checkout
                // ------------------------------------------------

                const params =
                    new URLSearchParams(
                        window.location.search
                    );


                const returnPage =
                    params.get("return");


                if (
                    returnPage ===
                    "checkout"
                ) {

                    window.location.href =
                        "../02_Organizer%20Dashboard/index.html";

                    return;

                }


                // ------------------------------------------------
                // Normal login
                // ------------------------------------------------

                setTimeout(
                    function () {

                        window.location.href =
                            ROUTES.dashboard;

                    },
                    150
                );


            } catch (error) {

                console.error(
                    "Eventra Login Error:",
                    error
                );


                showLoginError(
                    error.message ||
                    "Something went wrong. Please try again."
                );


            } finally {

                setLoading(false);

            }

        }
    );

}


// ============================================================
// CLEAR ERRORS WHEN USER TYPES
// ============================================================

if (emailInput) {

    emailInput.addEventListener(
        "input",
        function () {

            emailError.classList.add(
                "hidden"
            );

            loginError.classList.add(
                "hidden"
            );

        }
    );

}


if (passwordInput) {

    passwordInput.addEventListener(
        "input",
        function () {

            passwordError.classList.add(
                "hidden"
            );

            loginError.classList.add(
                "hidden"
            );

        }
    );

}


// ============================================================
// SIGN-IN FIELDS START EMPTY ON A FRESH PAGE LOAD.
// Do not restore an email from signup or a previous session.
if (emailInput) emailInput.value = "";
if (passwordInput) passwordInput.value = "";
if (rememberMe) rememberMe.checked = false;

// REMEMBER ME
// ============================================================

if (rememberMe) rememberMe.addEventListener(
    "change",
    function () {

        if (
            !rememberMe.checked
        ) {

            localStorage.removeItem(
                "eventra_email"
            );

        }

    }
);


// ============================================================
// INITIAL CHECK
// ============================================================

console.log(
    "Eventra Sign In initialized."
);

// Avoid logging authentication endpoint details unnecessarily.
