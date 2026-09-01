import { loginWithApi } from "./api/services.js";

/* =======================================================
   LOGIN MODULE
======================================================= */
export function initLogin() {
  const togglePassword = document.getElementById("toggle-password");
  const passwordInput = document.getElementById("login-password");

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.innerHTML =
          '<img src="../components/ui/eye.svg" alt="Hide Password" style="width: 20px; height: 20px;">';
      } else {
        passwordInput.type = "password";
        togglePassword.innerHTML =
          '<img src="../components/ui/eye-closed.svg" alt="Show Password" style="width: 20px; height: 20px;">';
      }
    });
  }

  const usernameInput = document.getElementById("login-username");
  if (usernameInput) {
    usernameInput.addEventListener("input", () => clearError(usernameInput));
  }
  if (passwordInput) {
    passwordInput.addEventListener("input", () => clearError(passwordInput));
  }

  const forgotLink = document.querySelector(".forgot-link");
  const modal = document.getElementById("forgot-password-modal");
  const closeModal = document.getElementById("close-forgot-modal");

  const step1 = document.getElementById("forgot-step-1");
  const step2 = document.getElementById("forgot-step-2");
  const step3 = document.getElementById("forgot-step-3");

  const identifierInput = document.getElementById("forgot-identifier");
  const verifyBtn = document.getElementById("forgot-verify-btn");
  const error1 = document.getElementById("forgot-error-1");

  const newPasswordInput = document.getElementById("forgot-new-password");
  const resetBtn = document.getElementById("forgot-reset-btn");
  const error2 = document.getElementById("forgot-error-2");

  const closeBtn = document.getElementById("forgot-close-btn");

  let targetUserIndex = -1;

  if (forgotLink && modal) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      alert(
        "Password reset is managed on the backend. Please contact support.",
      );
    });
  }

  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const usernameElement = document.getElementById("login-username");
      const passwordElement = document.getElementById("login-password");
      const submitBtn = loginForm.querySelector("button[type='submit']");

      const username = usernameElement.value.trim();
      const password = passwordElement.value;

      // Clear existing UI errors
      clearError(usernameElement);
      clearError(passwordElement);

      if (!username) {
        showError(usernameElement, "Username is required.");
        return;
      }
      if (!password) {
        showError(passwordElement, "Password is required.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        // Use the centralised service; it stores RBAC headers and currentUser.
        const currentUser = await loginWithApi({ username, password });

        // Redirect based on role
        const role = (currentUser.role || "").toLowerCase();
        if (role === "traveller") {
          window.location.href = "./traveller_dashboard.html";
        } else if ( role === "experience_partner" || role === "experience") {
          window.location.href = "./experience_home.html";
        } else if(role === "guide") {
          window.location.href = "./dashboard.html";
        } else if (role === "partner" || role === "hotel") {
          window.location.href = "./dashboard.html";
        } else if (role === "tech_admin" || role === "techadmin") {
          window.location.href = "./tech_tickets.html";
        } else if (role === "admin") {
          window.location.href = "./dashboard.html";
          } 
        else {
          window.location.href = "./dashboard.html";
        }
      } catch (err) {
        console.error("Login error:", err);
        showError(
          passwordElement,
          err.message || "Invalid username or password.",
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ===============================
       UI ERROR LOGIC
    =============================== */
  function showError(input, message) {
    input.style.borderColor = "#EF4444";
    const wrapper = input.parentElement;
    let errorEl = wrapper.nextElementSibling;

    if (!errorEl || !errorEl.classList.contains("login-error-msg")) {
      errorEl = document.createElement("small");
      errorEl.className = "login-error-msg";
      errorEl.style.color = "#EF4444";
      errorEl.style.fontSize = "12px";
      errorEl.style.marginTop = "4px";
      errorEl.style.display = "block";
      wrapper.parentNode.insertBefore(errorEl, wrapper.nextSibling);
    }
    errorEl.innerText = message;
  }

  function clearError(input) {
    input.style.borderColor = "";
    const wrapper = input.parentElement;
    const errorEl = wrapper.nextElementSibling;
    if (errorEl && errorEl.classList.contains("login-error-msg")) {
      errorEl.remove();
    }
  }
}
