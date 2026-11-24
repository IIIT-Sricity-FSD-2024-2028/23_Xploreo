import { getNavLinks } from "./internal-navbar-links.js";

export function renderinternalnavbar(containerId, currentActiveTab) {
    const container = document.getElementById(containerId);
    if (!container){
        console.log("this is excution"); 
        return;
    }
    else{
    const page = window.location.pathname.split("/").pop();
    console.log(page);
    const links = getNavLinks(page); // Get the 3 filtered objects
    console.log(links);
    container.innerHTML = links.map(link => {
        // Add 'active' class if this link matches our current state
        const isActive = link.status === currentActiveTab ? "active" : "";
        
        return `
            <button class="tab-btn ${isActive}" onclick="switchTab('${link.status}')">
                ${link.name}
            </button>
        `;
    }).join("");
}
}