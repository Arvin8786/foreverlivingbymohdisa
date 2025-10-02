// =================================================================
// Main Portal Controller - v19.6 (Definitive Final & Complete)
// =================================================================

// Global state variables
let products = [];
let allJobs = [];
let allTestimonies = [];
let aboutContent = {};

// This is the main entry point of the application
document.addEventListener('DOMContentLoaded', main);

/**
 * The main function that initializes the entire portal.
 */
async function main() {
    try {
        // --- In the future, this section will have logic to decide which business to load ---
        // For now, we will directly load the "Forever Living" module as the default.
        await loadBusinessModule('forever-living');

    } catch (error) {
        console.error("Fatal Error initializing the application:", error);
        const mainContent = document.getElementById('main-content');
        if(mainContent) {
            mainContent.innerHTML = `<p style="text-align: center; color: red; font-weight: bold;">Error: Could not load the application. The server may be offline. Please try again later.</p>`;
        }
    }
}

/**
 * Dynamically loads the CSS and JS for a specific business module.
 * This is the core of the multi-business portal.
 * @param {string} businessName - The name of the business folder (e.g., 'forever-living').
 */
async function loadBusinessModule(businessName) {
    if (businessName === 'forever-living') {
        
        // Step 1: Dynamically load all the necessary CSS files for this module
        loadCss('css/forever-living/fl_homepage.css');
        loadCss('css/forever-living/fl_products.css');
        loadCss('css/forever-living/fl_cart.css');
        loadCss('css/forever-living/fl_chatbot.css');
        loadCss('css/forever-living/fl_pages.css');

        // Step 2: Fetch the initial data required for this module
        const data = await fetchInitialFLData();

        // Step 3: Check for maintenance mode before proceeding
        const marketing = data.marketing || {};
        if (marketing.MaintenanceMode === true) {
            const maintenanceOverlay = document.getElementById('maintenance-overlay');
            if (maintenanceOverlay) {
                maintenanceOverlay.innerHTML = `<div><h1>Under Maintenance</h1><p>${marketing.MaintenanceMessage || "We'll be back shortly."}</p></div>`;
                maintenanceOverlay.style.display = 'flex';
            }
            return; // Stop execution if in maintenance mode
        }

        // Step 4: Store fetched data in global variables for other FL modules to access
        products = data.products || [];
        allJobs = data.jobsListings || [];
        allTestimonies = data.testimonies || [];
        aboutContent = data.aboutUsContent || {};
        
        // Step 5: Render all UI components for the FL module by calling functions in fl_ui.js
        renderStaticFLContent(aboutContent);
        renderFLHomepage(aboutContent, allJobs, allTestimonies);
        
        // Build the modals (cart, job application) so they are ready to be opened
        buildFLCartModal();
        buildFLJobApplicationModal();
        
        // Step 6: Update the timestamp in the footer
        const timestampEl = document.getElementById('update-timestamp');
        if (timestampEl) {
            timestampEl.textContent = new Date().toLocaleDateString('en-GB');
        }

        // Step 7: Activate the homepage tab by default
        showTab('homepage');
    }
    // In the future, you can add other businesses here:
    // else if (businessName === 'khind-rto') { /* load Khind module */ }
}

/**
 * A helper function to dynamically create and append a <link> tag for a CSS file.
 * This ensures that CSS files are only loaded when they are needed.
 * @param {string} href - The path to the CSS file.
 */
function loadCss(href) {
    // Check if the stylesheet is already loaded to avoid duplicates
    if (document.querySelector(`link[href="${href}"]`)) {
        return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * Shows a specific content tab within the main content area and hides the others.
 * @param {string} tabId - The ID of the tab to show (e.g., 'homepage', 'products').
 */
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

/**
 * A global helper function to allow other modules to easily find product data by its ID.
 * @param {number} id - The product ID.
 * @returns {object|undefined} The product object or undefined if not found.
 */
function getProductById(id) {
    if (!products) return undefined;
    return products.find(p => p.id === id);
}
