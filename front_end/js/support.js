import { apiPostAndSync } from "./utils/api.js";

export function renderSupportPage(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const supportData = JSON.parse(localStorage.getItem("supportData")) || { contactInfo: { email: "support@xploreo.com" } };
    const techAdminData = JSON.parse(localStorage.getItem("techAdminData")) || { tickets: [], userActivity: [] };

    // Filter tickets for THIS specific user from the master tech list
    const userTickets = (techAdminData.tickets || []).filter(t => t.userId === user?.id);

    container.innerHTML = `
        <div class="support-page">
            <div class="support-main">
                <div class="support-header">
                    <h1 class="support-title">Support & Help</h1>
                    <p class="support-subtitle">Get help and answers to your questions</p>
                </div>

                <!-- Create Ticket -->
                <div class="support-section">
                    <h3 class="section-title">Create Support Ticket</h3>
                    <span class="section-desc">Describe your issue and we'll get back to you soon</span>
                    <form id="ticketForm">
                        <div class="form-group">
                            <span class="label">Subject</span>
                            <input type="text" class="input-field" name="subject" placeholder="Brief description of your issue" required>
                        </div>
                        <div class="form-group">
                            <span class="label">Category</span>
                            <select class="input-field" name="category">
                                <option>General Question</option>
                                <option>Technical Issue</option>
                                <option>Payment Issue</option>
                                <option>Account Settings</option>
                                <option>Tours & Bookings</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <span class="label">Message</span>
                            <textarea class="input-field" name="message" placeholder="Please provide as much detail as possible..." required></textarea>
                        </div>
                        <button type="submit" class="submit-btn" style="background: #2563EB; color: white;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                            Submit Ticket
                        </button>
                    </form>
                </div>

                <!-- FAQs -->
                <div class="support-section">
                    <h3 class="section-title">Frequently Asked Questions</h3>
                    <span class="section-desc">Quick answers to common questions</span>
                    <div class="faq-list">
                        ${(supportData.faqs || []).map(faq => `
                            <div class="faq-item">
                                <button class="faq-question">
                                    <span>${faq.question}</span>
                                    <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                <div class="faq-answer">${faq.answer}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Tickets History -->
                <div class="support-section">
                    <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 class="section-title" style="margin-bottom: 0;">Your Support Tickets</h3>
                    </div>
                    <div class="history-list" id="ticketList">
                        ${userTickets.length === 0 ? '<p style="color: #6B7280; font-size: 14px;">No tickets found.</p>' : 
                        userTickets.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => `
                            <div class="ticket-card">
                                <div class="ticket-main">
                                    <span class="ticket-title">${t.subject}</span>
                                    <div class="ticket-meta">
                                        <span>${t.category}</span>
                                        <span>•</span>
                                        <span>${new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span class="status-pill ${t.status.toLowerCase()}">${t.status}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="support-sidebar">
                <!-- Contact Us -->
                <div class="sidebar-card">
                    <h3 class="section-title" style="margin-bottom: 1rem; font-size: 1.1rem;">Contact Us</h3>
                    <div class="contact-item email">
                        <div class="icon-box" style="background: white;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
                        <div class="contact-info">
                            <span class="contact-label">Email Support</span>
                            <span class="contact-value">${supportData.contactInfo?.email || "support@xploreo.com"}</span>
                            <span class="contact-meta">Response within 24 hours</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Links -->
                <div class="sidebar-card">
                    <h3 class="section-title" style="margin-bottom: 0.5rem; font-size: 1.1rem;">Quick Links</h3>
                    <div class="quick-links">
                        <a href="#" class="quick-link"><span>Help Center</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a>
                        <a href="#" class="quick-link"><span>Terms of Service</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupSupportListeners(user, techAdminData);
}


function setupSupportListeners(user, techAdminData) {
    // FAQ Accordion
    document.querySelectorAll(".faq-question").forEach(q => {
        q.onclick = (e) => {
            const item = e.target.closest(".faq-item");
            const wasActive = item.classList.contains("active");
            document.querySelectorAll(".faq-item").forEach(i => i.classList.remove("active"));
            if (!wasActive) item.classList.add("active");
        };
    });

    // Form Submit
    const form = document.getElementById("ticketForm");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const newTicket = {
                id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
                userId: user?.id || "00001",
                userName: user?.name || user?.username || "Explorer",
                userRole: user?.role || "traveller",
                subject: formData.get("subject"),
                description: formData.get("message"),
                status: "pending",
                priority: "medium",
                category: formData.get("category"),
                createdAt: new Date().toISOString()
            };

            // Post to backend API
            await apiPostAndSync("/tickets", newTicket, "tickets");

            // Sync to Master Tech List & LocalStorage
            techAdminData.tickets = techAdminData.tickets || [];
            techAdminData.userActivity = techAdminData.userActivity || [];
            techAdminData.tickets.push(newTicket);
            
            techAdminData.userActivity.unshift({
                id: `ACT-${Date.now()}`,
                userId: user?.id || "00001",
                userName: user?.name || user?.username || "Explorer",
                action: `Created support ticket: "${newTicket.subject}"`,
                timestamp: new Date().toISOString()
            });

            localStorage.setItem("techAdminData", JSON.stringify(techAdminData));

            alert("Ticket submitted successfully! ID: " + newTicket.id);
            renderSupportPage("main", user);
        };
    }
}
