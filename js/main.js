// =================================================================
// Main Controller - v19.4 (Definitive Final)
// Initializes the application and orchestrates all other modules.
// =================================================================

let products = [];
let allJobs = [];
let allTestimonies = [];
let aboutContent = {};

document.addEventListener('DOMContentLoaded', main);

async function main() {
    try {
        const productContainer = document.getElementById('product-list-container');
        if (productContainer) {
            productContainer.innerHTML = `<p class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading store data...</p>`;
        }

        const data = await fetchInitialData();

        const marketing = data.marketing || {};
        if (marketing.MaintenanceMode === true) {
            const maintenanceOverlay = document.getElementById('maintenance-overlay');
            if (maintenanceOverlay) {
                maintenanceOverlay.innerHTML = `<div><h1>Under Maintenance</h1><p>${marketing.MaintenanceMessage || "We'll be back shortly."}</p></div>`;
                maintenanceOverlay.style.display = 'flex';
            }
            return;
        }

        // Store data globally
        products = data.products || [];
        allJobs = data.jobsListings || [];
        allTestimonies = data.testimonies || [];
        aboutContent = data.aboutUsContent || {};
        
        // Initial Page Render
        renderStaticContent(aboutContent);
        renderFLHomepage(aboutContent, allJobs, allTestimonies);
        renderFLProducts(products);
        renderFLAboutUs(aboutContent);
        renderFLJobs(allJobs);
        buildFLEnquiryForm();
        buildFLCartModal();
        buildFLJobApplicationModal();
        
        const timestampEl = document.getElementById('update-timestamp');
        if (timestampEl) {
            timestampEl.textContent = new Date().toLocaleDateString('en-GB');
        }

        // Activate the homepage tab
        showTab('homepage');

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const productContainer = document.getElementById('product-list-container');
        if(productContainer) {
            productContainer.innerHTML = `<p style="text-align: center; color: red;">Error: Could not load store data. Please try again later.</p>`;
        }
    }
}

function renderStaticContent(content) {
    const headerEl = document.getElementById('company-name-header');
    const footerEl = document.getElementById('footer-text');
    const bannerTextEl = document.getElementById('promo-banner-text');
    const banner = document.getElementById('promo-running-banner');

    if (headerEl) {
        headerEl.innerHTML = `${content.CompanyName || ''} <span class="by-line">${content.Owner} - ${content.Role}</span> <span class="slogan">${content.Slogan}</span>`;
    }
    if (footerEl) {
        footerEl.textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName}`;
    }
    if (banner && bannerTextEl && content.RunningBanner) {
        bannerTextEl.textContent = content.RunningBanner;
        banner.style.display = 'block';
    } else if (banner) {
        banner.style.display = 'none';
    }
}

function showTab(tabId) {
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        if (tab) tab.classList.remove('active');
    });
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Global helper to make it easier for other modules to access products
function getProductById(id) {
    return products.find(p => p.id === id);
}
