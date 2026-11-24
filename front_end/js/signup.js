import { apiPost } from "./utils/api.js";

let selectedRole = null;

window.togglePasswordVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = '<img src="../../components/ui/eye.svg" alt="Hide Password" style="width:20px;height:20px;">';
    } else {
        input.type = "password";
        btn.innerHTML = '<img src="../../components/ui/eye-closed.svg" alt="Show Password" style="width:20px;height:20px;">';
    }
};

export function initSignup() {
    const cards        = document.querySelectorAll(".role-card");
    const step1NextBtn = document.querySelector(".step-1 .next-btn");
    const step2NextBtn = document.querySelector(".step-2 .next-btn");
    const backBtn      = document.querySelector(".step-2 .back-btn");

    /* ── role selection ── */
    cards.forEach((card) => {
        card.addEventListener("click", () => {
            cards.forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedRole = card.querySelector("h4").innerText.trim();
        });
    });

    /* ── step 1 → step 2 ── */
    if (step1NextBtn) {
        step1NextBtn.addEventListener("click", () => {
            if (!selectedRole) { alert("Please select a role first"); return; }
            if (selectedRole === "Service Partner") showStep("1-partner");
            else showStep(2);
        });
    }

    /* ── service partner sub-type ── */
    const step1PartnerNextBtn = document.querySelector(".step1-partner-next-btn");
    const step1PartnerBackBtn = document.querySelector(".step1-partner-back-btn");
    const partnerTypeCards    = document.querySelectorAll(".partner-type-card");

    partnerTypeCards.forEach((card) => {
        card.addEventListener("click", () => {
            partnerTypeCards.forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedRole = card.querySelector("h4").innerText.trim();
        });
    });

    if (step1PartnerNextBtn) {
        step1PartnerNextBtn.addEventListener("click", () => {
            if (selectedRole === "Service Partner") { alert("Please choose a Service Type (Hotel or Experiences)"); return; }
            showStep(2);
        });
    }
    if (step1PartnerBackBtn) {
        step1PartnerBackBtn.addEventListener("click", () => {
            selectedRole = "Service Partner";
            showStep(1);
            cards.forEach((c) => c.classList.remove("selected"));
            const pc = Array.from(cards).find((c) => c.querySelector("h4").innerText === "Service Partner");
            if (pc) pc.classList.add("selected");
        });
    }

    /* ── step 2 back ── */
    if (backBtn) backBtn.addEventListener("click", () => showStep(1));

    /* ── step 2 next ── */
    if (step2NextBtn) {
        step2NextBtn.addEventListener("click", () => {
            setStep2RequestMessage("");
            if (validateStep2()) showRoleStep3(selectedRole);
        });
    }

    /* ── step 3 traveler ── */
    const step3BackBtn     = document.querySelector(".step3-back-btn");
    const step3CompleteBtn = document.querySelector(".step3-traveler-complete-btn");
    if (step3BackBtn)     step3BackBtn.addEventListener("click", () => showStep(2));
    if (step3CompleteBtn) {
        step3CompleteBtn.addEventListener("click", async () => {
            if (!validateStep3()) return;
            step3CompleteBtn.disabled = true;
            try { await submitRegistration(); showStep4(); }
            catch (err) { alert("Signup failed: " + err.message); }
            finally { step3CompleteBtn.disabled = false; }
        });
    }

    /* ── step 3 guide ── */
    const guideBackBtn     = document.querySelector(".guide-back-btn");
    const guideCompleteBtn = document.querySelector(".guide-complete-btn");
    if (guideBackBtn)     guideBackBtn.addEventListener("click", () => showStep(2));
    if (guideCompleteBtn) {
        guideCompleteBtn.addEventListener("click", async () => {
            if (!validateStep3()) return;
            guideCompleteBtn.disabled = true;
            try { await submitRegistration(); showStep4(); }
            catch (err) { alert("Signup failed: " + err.message); }
            finally { guideCompleteBtn.disabled = false; }
        });
    }

    /* ── step 3 partner ── */
    const partnerBackBtn     = document.getElementById("partner-back-btn");
    const partnerCompleteBtn = document.getElementById("partner-complete-btn");
    if (partnerBackBtn)     partnerBackBtn.addEventListener("click", () => showStep(2));
    if (partnerCompleteBtn) {
        partnerCompleteBtn.addEventListener("click", async () => {
            if (!validateStep3()) return;
            partnerCompleteBtn.disabled = true;
            try { await submitRegistration(); showStep4(); }
            catch (err) { alert("Signup failed: " + err.message); }
            finally { partnerCompleteBtn.disabled = false; }
        });
    }

    /* ── step 4 buttons ── */
    const step4LoginBtn = document.querySelector(".step4-login-btn");
    const step4HomeBtn  = document.querySelector(".step4-home-btn");
    if (step4LoginBtn) step4LoginBtn.addEventListener("click", () => { window.location.href = "./login.html"; });
    if (step4HomeBtn)  step4HomeBtn.addEventListener("click",  () => { window.location.href = "../../index.html"; });
}

/* ── core registration (API + localStorage) ── */
async function submitRegistration() {
    const roleMap = {
        "Traveler":        "traveller",
        "Local Guide":     "guide",
        "Hotel":           "hotel",
        "Experiences":     "experience",
        "Service Partner": "partner",
    };

    const username = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value;
    const name     = document.getElementById("fullName")?.value.trim();
    const email    = document.getElementById("email")?.value.trim();
    const phone    = document.getElementById("phone")?.value.replace(/\D/g, "");
    const dob      = document.getElementById("dob")?.value;
    const gender   = document.getElementById("gender")?.value;

    const role = roleMap[selectedRole] || "traveller";

    const payload = { username, password, name, email, phone, dob, gender, role };

    const res = await apiPost("/auth/register", payload);
    const userData = res.success ? (res.data.data || res.data) : payload;

    // Sync to localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    users.push(userData);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(userData));
    if (userData.id) localStorage.setItem("userID", userData.id);
    if (userData.role) localStorage.setItem("userRole", userData.role);
}

/* ── step navigation ── */
function showStep(stepNumber) {
    document.querySelectorAll(".signup-step").forEach((s) => s.classList.add("hidden"));
    document.querySelector(".step-" + stepNumber)?.classList.remove("hidden");
    document.querySelector(".signup-card")?.classList.remove("step4-active");
}

function showRoleStep3(role) {
    document.querySelectorAll(".signup-step").forEach((s) => s.classList.add("hidden"));
    document.querySelector(".signup-card")?.classList.remove("step4-active");
    if (role === "Traveler")       document.querySelector(".step-3-traveler")?.classList.remove("hidden");
    else if (role === "Local Guide") document.querySelector(".step-3-guide")?.classList.remove("hidden");
    else                           document.querySelector(".step-3-partner")?.classList.remove("hidden");
}

function showStep4() {
    document.querySelectorAll(".signup-step").forEach((s) => s.classList.add("hidden"));
    document.querySelector(".step-4")?.classList.remove("hidden");
    document.querySelector(".signup-card")?.classList.add("step4-active");

    const heroContent = document.querySelector(".signup-hero-content");
    if (heroContent) {
        heroContent.innerHTML = `<h1>Congratulations</h1>
        <p style="font-family:'Pacifico',cursive;font-size:32px;font-weight:normal;margin-top:-10px;">Start your journey</p>`;
    }

    const username = document.getElementById("username")?.value.trim() || "explorer";
    document.getElementById("step4-dynamic-subtitle")?.innerText.replace("", `Welcome to Xploreo! Your ${selectedRole?.toLowerCase()} account is ready.`);
    if (document.getElementById("step4-dynamic-subtitle")) document.getElementById("step4-dynamic-subtitle").innerText = `Welcome to Xploreo! Your ${(selectedRole || "").toLowerCase()} account is ready.`;
    if (document.getElementById("step4-username"))         document.getElementById("step4-username").innerText = username;
    if (document.getElementById("step4-role"))             document.getElementById("step4-role").innerText = selectedRole || "";
}

/* ── validation ── */
function setStep2RequestMessage(message = "", variant = "error") {
    const step2 = document.querySelector(".step-2");
    if (!step2) return;
    let el = step2.querySelector(".signup-request-message");
    if (!el) {
        el = document.createElement("div");
        el.className = "signup-request-message";
        el.style.cssText = "margin-top:12px;font-size:13px;font-weight:500;grid-column:1/-1;";
        step2.querySelector(".form-actions")?.before(el);
    }
    el.textContent = message;
    el.style.color = variant === "success" ? "#15803d" : "#dc2626";
    el.style.display = message ? "block" : "none";
}

function showError(input, message) {
    input.style.borderColor = "#FF4D4D";
    let target = input;
    if (input.parentElement.classList.contains("password-wrapper") ||
        input.parentElement.classList.contains("phone-input-wrapper")) {
        target = input.parentElement;
    }
    let errorEl = target.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains("validation-error-msg")) {
        errorEl = document.createElement("small");
        errorEl.className = "validation-error-msg";
        errorEl.style.cssText = "color:#FF4D4D;font-size:12px;margin-top:4px;display:block;";
        target.parentNode.insertBefore(errorEl, target.nextSibling);
    }
    errorEl.innerText = message;
}

function clearError(input) {
    input.style.borderColor = "";
    let check = input;
    if (input.parentElement.classList.contains("password-wrapper") ||
        input.parentElement.classList.contains("phone-input-wrapper")) {
        check = input.parentElement;
    }
    const errorEl = check.nextElementSibling;
    if (errorEl?.classList.contains("validation-error-msg")) errorEl.remove();
}

function validateStep2() {
    let isValid = true, firstInvalid = null;
    ["fullName","username","email","phone","dob","gender","password","confirmPassword"].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        if (!input.dataset.listenerAttached) {
            input.addEventListener("input", () => clearError(input));
            input.dataset.listenerAttached = "true";
        }
        clearError(input);
        if (!input.value.trim()) {
            isValid = false;
            showError(input, "This field is required");
            if (!firstInvalid) firstInvalid = input;
        }
    });

    const un = document.getElementById("username");
    if (un?.value.trim() && !/^[A-Za-z]{6,}$/.test(un.value.trim())) {
        isValid = false;
        showError(un, "Username: letters only, min 6 characters.");
        if (!firstInvalid) firstInvalid = un;
    }

    const em = document.getElementById("email");
    if (em?.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) {
        isValid = false;
        showError(em, "Please enter a valid email address.");
        if (!firstInvalid) firstInvalid = em;
    }

    const ph = document.getElementById("phone");
    if (ph?.value.trim()) {
        const pv = ph.value.replace(/\D/g, "");
        if (!/^\d{10}$/.test(pv)) {
            isValid = false;
            showError(ph, "Please enter a valid 10-digit phone number.");
            if (!firstInvalid) firstInvalid = ph;
        }
    }

    const dob = document.getElementById("dob");
    if (dob?.value) {
        const age = Math.floor((Date.now() - new Date(dob.value)) / (365.25 * 24 * 3600 * 1000));
        if (age < 18) {
            isValid = false;
            showError(dob, "You must be at least 18 years old.");
            if (!firstInvalid) firstInvalid = dob;
        }
    }

    const pw  = document.getElementById("password");
    const cpw = document.getElementById("confirmPassword");
    if (pw?.value && cpw?.value && pw.value !== cpw.value) {
        isValid = false;
        showError(cpw, "Passwords should match.");
        if (!firstInvalid) firstInvalid = cpw;
    }

    if (!isValid && firstInvalid) firstInvalid.focus();
    return isValid;
}

function validateStep3() {
    let isValid = true, firstInvalid = null;
    let container = null;
    if (selectedRole === "Traveler")       container = document.querySelector(".step-3-traveler");
    else if (selectedRole === "Local Guide") container = document.querySelector(".step-3-guide");
    else                                   container = document.querySelector(".step-3-partner");
    if (!container) return false;

    container.querySelectorAll("input:not([type='file']):not([type='checkbox']):not([type='radio']), select, textarea").forEach((input) => {
        clearError(input);
        if (input.placeholder?.includes("Coastal")) return; // optional field
        if (!input.value.trim() || input.value.trim().startsWith("Select ")) {
            isValid = false;
            showError(input, "This field is required");
            if (!firstInvalid) firstInvalid = input;
        }
    });

    if (!isValid && firstInvalid) firstInvalid.focus();
    return isValid;
}
