export function getSuperAdminProfileHTML() {
    let userStr = localStorage.getItem('currentUser');
    
    // TEMPORARY FALLBACK: If storage is empty, inject a fake user so the UI still loads!
    if (!userStr) {
        console.warn("No user found in local storage! Injecting mock superadmin data for testing.");
        const mockUser = {
            name: "Rahul Varma",
            email: "rahul.varma@xploreo.com",
            role: "superadmin",
            initials: "RV",
            avatarBg: "#007b83" // Using the teal color from your design
        };
        // Save the mock user to memory so it works
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        userStr = JSON.stringify(mockUser);
    }

    // Parse the data (either the real one or the mock one)
    const user = JSON.parse(userStr);

    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    // 3. Return the exact HTML for the profile UI
    return `
        <div style="max-width: 1000px; margin: 0 auto;">
            <button onclick="window.history.back()" style="margin-bottom:24px; cursor:pointer; background:none; border:1px solid #cbd5e0; padding:8px 16px; border-radius:8px; color: #4a5568; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                ← Back to Dashboard
            </button>
            
            <h1 style="font-size: 28px; margin-bottom: 4px; color: #1a202c;">My Profile</h1>
            <p style="color: #718096; margin-bottom: 32px; font-size: 14px;">Manage your superadmin account settings and system preferences.</p>

            <div style="display: grid; grid-template-columns: 320px 1fr; gap: 32px; align-items: start;">
                
                <div style="background: #fff; border: 1px solid #edf2f7; border-radius: 20px; padding: 40px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="width: 100px; height: 100px; background: ${user.avatarBg || '#3182ce'}; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 0 auto 20px;">
                        ${user.initials || 'A'}
                    </div>
                    <h2 style="margin: 0; font-size: 22px; color: #2d3748;">${user.name}</h2>
                    <p style="color: #3182ce; font-weight: 600; margin: 8px 0; font-size: 14px; text-transform: uppercase;">System ${user.role}</p>
                    <div style="background: #e6f4ea; color: #1e8e3e; display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-top: 8px; letter-spacing: 0.5px;">
                        ● ACTIVE
                    </div>
                    
                    <div style="margin-top: 32px; text-align: left; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 24px;">
                        <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                            <strong>LAST LOGIN</strong> <span style="color: #4a5568;">Just Now</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <strong>MEMBER SINCE</strong> <span style="color: #4a5568;">Oct 2023</span>
                        </div>
                    </div>
                </div>

                <div style="background: #fff; border: 1px solid #edf2f7; border-radius: 20px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; margin-bottom: 24px; color: #2d3748; font-size: 18px;">Account Information</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                        <div>
                            <label style="display:block; font-size: 11px; color: #a0aec0; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">First Name</label>
                            <input type="text" value="${firstName}" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; color: #4a5568; font-size: 14px; outline: none; transition: border-color 0.2s;">
                        </div>
                        <div>
                            <label style="display:block; font-size: 11px; color: #a0aec0; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Last Name</label>
                            <input type="text" value="${lastName}" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; color: #4a5568; font-size: 14px; outline: none; transition: border-color 0.2s;">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
                        <div>
                            <label style="display:block; font-size: 11px; color: #a0aec0; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</label>
                            <input type="email" value="${user.email}" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; color: #a0aec0; font-size: 14px; outline: none; cursor: not-allowed;" readonly>
                        </div>
                        <div>
                            <label style="display:block; font-size: 11px; color: #a0aec0; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Phone Number</label>
                            <input type="text" value="+91 98765 43210" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; color: #4a5568; font-size: 14px; outline: none; transition: border-color 0.2s;">
                        </div>
                    </div>
                    
                    <div style="text-align: right; border-top: 1px solid #edf2f7; padding-top: 24px;">
                        <button style="background: #3182ce; color: #fff; border: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#2b6cb0'" onmouseout="this.style.background='#3182ce'">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}