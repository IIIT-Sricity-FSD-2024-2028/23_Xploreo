// hotelprofile.js
import { users } from '../api/legacyData.js';

export function initHotelProfile() {
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) {
        console.error("Profile form not found in the DOM.");
        return;
    }

    // --- FORM VALIDATION RULES ---
    function validateHotelName(val) {
        if (!val.trim()) return "Hotel Name is required";
        if (val.trim().length < 3) return "Minimum 3 characters required";
        if (!/^[a-zA-Z0-9\s]+$/.test(val)) return "Only letters, numbers, spaces allowed";
        return "";
    }

    function validateLocation(val) {
        if (!val.trim()) return "Location is required";
        if (val.trim().length < 3) return "Minimum 3 characters required";
        return "";
    }

    function validateDescription(val) {
        if (val.length > 300) return "Maximum 300 characters allowed";
        return "";
    }

    function validateContactNumber(val) {
        if (!val.trim()) return "Contact number is required";
        if (!/^[0-9]{10,15}$/.test(val)) return "Contact number must be 10–15 digits";
        if (/^0+$/.test(val)) return "Contact number cannot be all zeroes";
        return "";
    }

    function validateEmail(val) {
        if (!val.trim()) return "Email is required";
        if (!/^\S+@\S+\.\S+$/.test(val)) return "Please enter a valid email address";
        return "";
    }

    function validateGST(val) {
        if (!val.trim()) return "";
        if (!/^[A-Za-z0-9]{8,15}$/.test(val)) return "Must be alphanumeric, 8-15 characters";
        return "";
    }

    function validateBank(val) {
        if (!val.trim() || val.includes('*')) return "";
        if (!/^[0-9]{8,}$/.test(val)) return "Must be at least 8 digits";
        return "";
    }

    function validateCheckInTime(cin) {
        if (!cin) return "Check-in time is required";
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(cin)) return "Format must be HH:MM";
        return "";
    }

    function validateCheckOutTime(cin, cout) {
        if (!cout) return "Check-out time is required";
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(cout)) return "Format must be HH:MM";
        // Convert JS readable times
        if (cin && cout) {
            const dateIn = new Date(`1970/01/01 ${cin}`);
            const dateOut = new Date(`1970/01/01 ${cout}`);
            if (dateOut <= dateIn) return "Check-out must be after check-in";
        }
        return "";
    }

    // -- UI ERROR INJECTION HELPERS --
    function updateError(inputNode, errorMessage) {
        if (!inputNode) return;

        let parent = inputNode.closest('.input-group') || inputNode.parentElement;
        let errNode = parent.querySelector('.error-text');

        if (!errNode) {
            errNode = document.createElement('span');
            errNode.className = 'error-text';

            // Append properly for nested icon forms
            if (inputNode.parentElement.classList.contains('input-with-icon') ||
                inputNode.parentElement.classList.contains('fake-input-wrapper')) {
                inputNode.parentElement.after(errNode);
            } else {
                inputNode.after(errNode);
            }
        }

        if (errorMessage) {
            errNode.textContent = errorMessage;
            inputNode.classList.add('is-invalid');
        } else {
            errNode.textContent = '';
            inputNode.classList.remove('is-invalid');
        }
    }

    function runFieldValidation(inputNode, type, contextContext = null) {
        if (!inputNode) return "";
        let err = "";
        const val = inputNode.value;

        switch (type) {
            case 'hotelName': err = validateHotelName(val); break;
            case 'location': err = validateLocation(val); break;
            case 'description': err = validateDescription(val); break;
            case 'contactNumber': err = validateContactNumber(val); break;
            case 'email': err = validateEmail(val); break;
            case 'gst': err = validateGST(val); break;
            case 'bankAccount': err = validateBank(val); break;
            case 'checkIn': err = validateCheckInTime(val); break;
            case 'checkOut':
                const cinNode = contextContext ? contextContext.querySelector('input[name="checkInTime"]') : null;
                const cinVal = cinNode ? cinNode.value : "";
                err = validateCheckOutTime(cinVal, val);
                break;
        }

        updateError(inputNode, err);
        return err;
    }

    // --- MAIN FORM SETUP ---
    const mainRules = [
        { node: profileForm.querySelector('input[name="hotelName"]'), type: 'hotelName' },
        { node: profileForm.querySelector('input[name="location"]'), type: 'location' },
        { node: profileForm.querySelector('textarea[name="description"]'), type: 'description' },
        { node: profileForm.querySelector('input[name="contactNumber"]'), type: 'contactNumber' },
        { node: profileForm.querySelector('input[name="email"]'), type: 'email' },
        { node: profileForm.querySelector('input[name="gst"]'), type: 'gst' },
        { node: profileForm.querySelector('input[name="bankAccount"]'), type: 'bankAccount' },
        { node: profileForm.querySelector('input[name="checkInTime"]'), type: 'checkIn' },
        { node: profileForm.querySelector('input[name="checkOutTime"]'), type: 'checkOut' }
    ];

    // --- DYNAMIC DATA FETCHING ---
    const activeHotel = users.find(u => u.role === "hotel");
    if (activeHotel) {
        // Load into mapped fields
        const nameInput = mainRules.find(r => r.type === 'hotelName')?.node;
        const locInput = mainRules.find(r => r.type === 'location')?.node;
        const phoneInput = mainRules.find(r => r.type === 'contactNumber')?.node;
        const emailInput = mainRules.find(r => r.type === 'email')?.node;

        if (nameInput) nameInput.value = activeHotel.name || "";
        if (locInput) locInput.value = activeHotel.address || "";
        if (phoneInput) phoneInput.value = activeHotel.phno || "";
        if (emailInput) emailInput.value = activeHotel.email || "";

        // Load into top card display profile header
        const displayHotelName = document.querySelector('.profile-hotel-info h2');
        const displayLocation = document.querySelector('.profile-hotel-info .location-text');
        if (displayHotelName) displayHotelName.textContent = activeHotel.name || "";
        if (displayLocation) displayLocation.innerHTML = `<span class="loc-pin"></span> ${activeHotel.address}`;
    }

    const saveMainBtn = document.getElementById('saveProfileBtn');

    function checkMainFormValid() {
        let isValid = true;
        mainRules.forEach(rule => {
            if (rule.node) {
                const err = runFieldValidation(rule.node, rule.type, profileForm);
                if (err) isValid = false;
            }
        });
        if (saveMainBtn) saveMainBtn.disabled = !isValid;
        return isValid;
    }

    mainRules.forEach(rule => {
        if (rule.node) {
            rule.node.addEventListener('input', () => {
                runFieldValidation(rule.node, rule.type, profileForm);
                checkMainFormValid(); // auto toggle save btn
            });
            rule.node.addEventListener('blur', () => {
                runFieldValidation(rule.node, rule.type, profileForm);
                checkMainFormValid();
            });
        }
    });

    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!checkMainFormValid()) return; // Abort if validation fails

        const formData = new FormData(profileForm);
        const hotelData = {};
        for (let [key, value] of formData.entries()) { hotelData[key] = value; }

        const bankAccountInput = profileForm.querySelector('input[name="bankAccount"]');
        if (bankAccountInput) hotelData.bankAccount = bankAccountInput.value;

        console.log("===============================");
        console.log("💾 Hotel Profile Data Saved successfully!");
        console.log(hotelData);
        console.log("===============================");

        // update title globally on save
        const displayHotelName = document.querySelector('.profile-hotel-info h2');
        const displayLocation = document.querySelector('.profile-hotel-info .location-text');
        if (displayHotelName && hotelData.hotelName) displayHotelName.textContent = hotelData.hotelName;
        if (displayLocation && hotelData.location) displayLocation.innerHTML = `<span class="loc-pin"></span> ${hotelData.location}`;

    });

    // --- BLOCK-BASED VIEW / EDIT MODE TOGGLE ---
    const blocks = document.querySelectorAll('.hotel-content-card.section-card');
    
    blocks.forEach(block => {
        const editBtn = block.querySelector('.edit-block-btn');
        const cancelBtn = block.querySelector('.cancel-block-btn');
        const saveBtn = block.querySelector('.save-block-btn');
        const actionsDiv = block.querySelector('.block-actions');
        let blockInitialState = {};

        function saveBlockState() {
            blockInitialState = {};
            const inputs = block.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.name) blockInitialState[input.name] = input.value;
            });
        }

        function revertBlockState() {
            const inputs = block.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.name && blockInitialState[input.name] !== undefined) {
                    input.value = blockInitialState[input.name];
                }
                updateError(input, ""); // clear error
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                saveBlockState();
                block.classList.remove('block-view-mode');
                if (actionsDiv) actionsDiv.classList.remove('hidden');
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                revertBlockState();
                block.classList.add('block-view-mode');
                if (actionsDiv) actionsDiv.classList.add('hidden');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // validate main form
                if (!checkMainFormValid()) {
                    // It will show validation errors using existing logic
                    return;
                }
                
                // if valid, mimic form save
                if (saveMainBtn) {
                    saveMainBtn.click(); // trigger form submit to run existing save code
                }
                
                // visually update button then revert to view mode
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = "✅ Saved!";
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    block.classList.add('block-view-mode');
                    if (actionsDiv) actionsDiv.classList.add('hidden');
                }, 1000);
            });
        }
    });

    // --- MODAL FORM SETUP ---
    const editProfileModal = document.getElementById("editProfileModal");
    const editBtn = document.querySelector('.edit-profile-btn');
    const closeEditModalBtn = document.getElementById("closeEditModalBtn");
    const cancelEditModalBtn = document.getElementById("cancelEditModalBtn");
    const saveEditModalBtn = document.getElementById("saveEditModalBtn");

    const modalNodes = {
        hotelName: document.getElementById("modalHotelName"),
        location: document.getElementById("modalLocation"),
        description: document.getElementById("modalDescription"),
        contactNumber: document.getElementById("modalContactNumber"),
        email: document.getElementById("modalEmail")
    };

    const modalRules = [
        { node: modalNodes.hotelName, type: 'hotelName' },
        { node: modalNodes.location, type: 'location' },
        { node: modalNodes.description, type: 'description' },
        { node: modalNodes.contactNumber, type: 'contactNumber' },
        { node: modalNodes.email, type: 'email' }
    ];

    function checkModalFormValid() {
        let isValid = true;
        modalRules.forEach(rule => {
            if (rule.node) {
                const err = runFieldValidation(rule.node, rule.type, null);
                if (err) isValid = false;
            }
        });
        if (saveEditModalBtn) saveEditModalBtn.disabled = !isValid;
        return isValid;
    }

    modalRules.forEach(rule => {
        if (rule.node) {
            rule.node.addEventListener('input', () => {
                runFieldValidation(rule.node, rule.type, null);
                checkModalFormValid();
            });
            rule.node.addEventListener('blur', () => {
                runFieldValidation(rule.node, rule.type, null);
                checkModalFormValid();
            });
        }
    });

    function openModal() {
        if (!editProfileModal) return;

        // Sync Data to Modal smoothly
        if (mainRules[0].node && modalNodes.hotelName) modalNodes.hotelName.value = mainRules[0].node.value;
        if (mainRules[1].node && modalNodes.location) modalNodes.location.value = mainRules[1].node.value;
        if (mainRules[2].node && modalNodes.description) modalNodes.description.value = mainRules[2].node.value;
        if (mainRules[3].node && modalNodes.contactNumber) modalNodes.contactNumber.value = mainRules[3].node.value;
        if (mainRules[4].node && modalNodes.email) modalNodes.email.value = mainRules[4].node.value;

        // Clear modal errors
        modalRules.forEach(rule => updateError(rule.node, ""));
        if (saveEditModalBtn) saveEditModalBtn.disabled = false;

        editProfileModal.classList.remove('hidden');
    }

    function closeModal() {
        if (editProfileModal) editProfileModal.classList.add('hidden');
    }

    if (editBtn) editBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeModal);
    if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === editProfileModal) closeModal(); });

    if (saveEditModalBtn) {
        saveEditModalBtn.addEventListener('click', () => {
            if (!checkModalFormValid()) return; // Abort if invalid

            const newData = {
                hotelName: modalNodes.hotelName?.value || "",
                location: modalNodes.location?.value || "",
                description: modalNodes.description?.value || "",
                contactNumber: modalNodes.contactNumber?.value || "",
                email: modalNodes.email?.value || ""
            };

            // Reverse sync mapping
            if (mainRules[0].node) mainRules[0].node.value = newData.hotelName;
            if (mainRules[1].node) mainRules[1].node.value = newData.location;
            if (mainRules[2].node) mainRules[2].node.value = newData.description;
            if (mainRules[3].node) mainRules[3].node.value = newData.contactNumber;
            if (mainRules[4].node) mainRules[4].node.value = newData.email;

            // Clear potential main form errors now that valid payload forced top-down
            mainRules.forEach(rule => updateError(rule.node, ""));
            checkMainFormValid(); // refresh saveMainBtn

            // Visual update map
            const displayHotelName = document.querySelector('.profile-hotel-info h2');
            const displayLocation = document.querySelector('.profile-hotel-info .location-text');
            if (displayHotelName) displayHotelName.textContent = newData.hotelName;
            if (displayLocation) displayLocation.innerHTML = `<span class="loc-pin"></span> ${newData.location}`;

            console.log("===============================");
            console.log("✅ Edit Profile Modal: Data Validated & Saved Successfully!");
            console.log(newData);
            console.log("===============================");

            closeModal();
        });
    }

    // Edge-case standard UX interactions
    const updateLink = document.querySelector('.update-link');
    if (updateLink) {
        updateLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert("Bank account update flow will be implemented soon.");
        });
    }
}

document.addEventListener("DOMContentLoaded", initHotelProfile);
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initHotelProfile, 1);
}
