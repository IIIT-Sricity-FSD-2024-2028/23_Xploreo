import { apiPost } from "./utils/api.js";

export function initLogin() {

    /* ── password toggle ── */
    const togglePassword = document.getElementById("toggle-password");
    const passwordInput  = document.getElementById("login-password");

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.innerHTML =
                    '<img src="../../components/ui/eye.svg" alt="Hide Password" style="width:20px;height:20px;">';
            } else {
                passwordInput.type = "password";
                togglePassword.innerHTML =
                    '<img src="../../components/ui/eye-closed.svg" alt="Show Password" style="width:20px;height:20px;">';
            }
        });
    }

    /* ── clear errors on typing ── */
    const usernameInput = document.getElementById("login-username");
    if (usernameInput) usernameInput.addEventListener("input", () => clearError(usernameInput));
    if (passwordInput)  passwordInput.addEventListener("input", () => clearError(passwordInput));

    /* ── forgot password (local only) ── */
    const forgotLink = document.querySelector(".forgot-link");
    if (forgotLink) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            handleForgotPassword();
        });
    }

    /* ── login form ── */
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const usernameEl = document.getElementById("login-username");
        const passwordEl = document.getElementById("login-password");
        const submitBtn  = loginForm.querySelector("button[type='submit']");

        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        clearError(usernameEl);
        clearError(passwordEl);

        if (!username) { showError(usernameEl, "Username is required."); return; }
        if (!password) { showError(passwordEl, "Password is required."); return; }

        if (submitBtn) submitBtn.disabled = true;

        try {
            const result = await apiPost("/auth/login", { username, password });

            let loggedInUser = null;
            let userId = null;
            let userRole = null;

            if (result.success && result.data && result.data.success) {
                const apiData = result.data.data;
                loggedInUser = apiData.user;
                userId = apiData.headers?.["x-user-id"] || loggedInUser.id;
                userRole = apiData.headers?.["x-user-role"] || loggedInUser.role;
            } else {
                // Local fallback check
                const users = JSON.parse(localStorage.getItem("users") || "[]");
                const found = users.find(u => u.username === username && u.password === password);
                if (found) {
                    loggedInUser = found;
                    userId = found.id || "00001";
                    userRole = found.role || "traveller";
                }
            }

            if (loggedInUser) {
                localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
                localStorage.setItem("userID", userId || loggedInUser.id || "00001");
                localStorage.setItem("userRole", userRole || loggedInUser.role || "traveller");

                console.log("Login Successful");

                const role = (userRole || loggedInUser.role || "traveller").toLowerCase();

                if (role === "traveller" || role === "traveler")
                    window.location.href = "../traveller/traveller_dashboard.html";
                else if (role === "experience")
                    window.location.href = "../experiences/experience_home.html";
                else if (role === "guide")
                    window.location.href = "../guide/dashboard.html";
                else if (role === "partner" || role === "hotel")
                    window.location.href = "../hotels/hotelRooms.html";
                else if (role === "techadmin")
                    window.location.href = "../techadmin/tech_tickets.html";
                else if (role === "superadmin")
                    window.location.href = "../superadmin/users.html";
                else if (role === "nontechadmin")
                    window.location.href = "../nontechadmin/nta_dashboard.html";
                else
                    window.location.href = "../guide/dashboard.html";
            } else {
                alert(result.error || "Invalid username or password");
            }
        } catch (err) {
            console.error(err);
            alert("Server Error");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    /* ── forgot password: find user by username/email, reset password ── */
    function handleForgotPassword() {
        const identifier = prompt("Enter your username or email:");
        if (!identifier) return;

        const { readStorage } = { readStorage: (k, d) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(d)); } catch { return d; } }};
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const idx = users.findIndex(
            (u) => u.username === identifier.trim() || u.email === identifier.trim()
        );
        if (idx === -1) { alert("No account found with that username or email."); return; }

        const newPass = prompt("Enter your new password (min 6 chars):");
        if (!newPass || newPass.length < 6) { alert("Password must be at least 6 characters."); return; }

        users[idx].password = newPass;
        localStorage.setItem("users", JSON.stringify(users));
        alert("Password updated! You can now log in.");
    }

    /* ── UI helpers ── */
    function showError(input, message) {
        input.style.borderColor = "#EF4444";
        const wrapper = input.parentElement;
        let errorEl = wrapper.nextElementSibling;
        if (!errorEl || !errorEl.classList.contains("login-error-msg")) {
            errorEl = document.createElement("small");
            errorEl.className = "login-error-msg";
            errorEl.style.cssText = "color:#EF4444;font-size:12px;margin-top:4px;display:block;";
            wrapper.parentNode.insertBefore(errorEl, wrapper.nextSibling);
        }
        errorEl.innerText = message;
    }

    function clearError(input) {
        input.style.borderColor = "";
        const wrapper = input.parentElement;
        const errorEl = wrapper.nextElementSibling;
        if (errorEl && errorEl.classList.contains("login-error-msg")) errorEl.remove();
    }
}
