// =================================================================
// Forever Living UI Module - v19.3 (Definitive Final)
// Builds and renders all HTML for the FL business section.
// =================================================================

function renderFLHomepage(about, jobs, testimonies) {
    if (!about) return;

    const homepageContainer = document.getElementById('main-content');
    homepageContainer.innerHTML = `
        <div id="homepage" class="tab-content active">
            <section id="homepage-hero" class="hero-section">
                <h2>${about.CompanyName || 'Welcome'}</h2>
                <p>${about.Slogan || 'High-quality wellness products'}</p>
            </section>
            
            <section id="why-choose-us" class="dynamic-content-wrapper">
                <h2>${about.WhyChooseUs_Title}</h2>
                <div class="why-choose-us-grid">
                    <div><i class="${about.Point1_Icon}"></i><p>${about.Point1_Text}</p></div>
                    <div><i class="${about.Point2_Icon}"></i><p>${about.Point2_Text}</p></div>
                    <div><i class="${about.Point3_Icon}"></i><p>${about.Point3_Text}</p></div>
                </div>
            </section>
            
            <section id="youtube-videos" class="dynamic-content-wrapper">
                <h2>Learn More</h2>
                <div id="youtube-videos-container"></div>
            </section>
            
            <section id="homepage-testimonies" class="dynamic-content-wrapper">
                <h2>What Our Customers Say</h2>
                <div id="testimonies-container"></div>
            </section>

            <section id="homepage-featured-jobs" class="dynamic-content-wrapper">
                <h2>Join Our Team</h2>
                <div id="featured-jobs-container"></div>
                <a onclick="showTab('jobs')" class="btn btn-secondary" style="display: table; margin: 20px auto 0;">View All Career Opportunities</a>
            </section>
        </div>
        <div id="products" class="tab-content"></div>
        <div id="about" class="tab-content"></div>
        <div id="jobs" class="tab-content"></div>
        <div id="enquiries" class="tab-content"></div>
    `;

    const videosContainer = document.getElementById('youtube-videos-container');
    const videoUrls = about.YoutubeURL ? about.YoutubeURL.split(',').map(url => url.trim()) : [];
    if (videoUrls.length > 0 && videosContainer) {
        videosContainer.innerHTML = videoUrls.map(url => {
            try {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } catch(e) { console.error("Invalid YouTube URL:", url); }
            return '';
        }).join('');
    } else if (videosContainer) {
        document.getElementById('youtube-videos').style.display = 'none';
    }

    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimonies && testimonies.length > 0 && testimoniesContainer) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            for (let i = 0; i < 5; i++) {
                stars += `<i class="fa-solid fa-star" style="color: ${i < t.Rating ? 'var(--secondary-color)' : '#ccc'}"></i>`;
            }
            return `
                <div class="testimony-card">
                    <div class="testimony-header">
                        <img src="${t.Customer_Image_URL}" alt="${t.Customer_Name}" class="testimony-img">
                        <div>
                            <h4>${t.Customer_Name}</h4>
                            <div class="testimony-rating">${stars}</div>
                        </div>
                    </div>
                    <p>"${t.Testimony_Text}"</p>
                </div>`;
        }).join('');
    } else if (testimoniesContainer) {
        document.getElementById('homepage-testimonies').style.display = 'none';
    }

    const featuredJobsContainer = document.getElementById('featured-jobs-container');
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobs.length > 0 && featuredJobsContainer) {
        featuredJobsContainer.innerHTML = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${job.position}</h4><p>${job.location} | ${job.type}</p></div>`).join('');
    } else if (featuredJobsContainer) {
        document.getElementById('homepage-featured-jobs').style.display = 'none';
    }
}

function renderFLProducts(productsToRender) {
    const container = document.getElementById('products');
    if (!container) return;
    container.innerHTML = `<div id="product-list-container"><p class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</p></div>`;
    const productListContainer = document.getElementById('product-list-container');
    if (!productsToRender || productsToRender.length === 0) {
        productListContainer.innerHTML = `<p>No products available.</p>`;
        return;
    }
    productListContainer.innerHTML = `<div class="product-list">${productsToRender.map(p => `
        <div class="product">
            <div class="product-image-container"><img src="${p.image}" alt="${p.name}"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-section"><span class="new-price">RM ${p.price.toFixed(2)}</span></div>
                <div class="product-actions"><button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button></div>
            </div>
        </div>`).join('')}</div>`;
}

function renderFLAboutUs(content) {
    const container = document.getElementById('about');
    if (!container) return;
    if (!content) { 
        container.innerHTML = '<section class="dynamic-content-wrapper"><p>About information is unavailable.</p></section>'; 
        return; 
    }
    container.innerHTML = `
        <section id="about-us-content" class="dynamic-content-wrapper">
            <h2>About ${content.CompanyName}</h2>
            <div class="owner-profile">
                <div class="owner-details">
                    <h3>${content.Owner} - ${content.Role}</h3>
                    <div>${content.MoreDetails}</div>
                    <hr>
                    <h4>Our Mission</h4>
                    <p>${content.OurMission}</p>
                    <h4>Our Vision</h4>
                    <p>${content.OurVision}</p>
                </div>
            </div>
        </section>`;
}

function renderFLJobs(jobs) {
    const container = document.getElementById('jobs');
    if (!container) return;
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<section class="dynamic-content-wrapper"><h2>Join Our Team</h2><p>There are currently no open positions.</p></section>';
        return;
    }
    container.innerHTML = `
        <section id="jobs-content" class="dynamic-content-wrapper">
            <h2>All Career Opportunities</h2>
            <div id="job-listings-container">
                ${jobs.map(job => `
                    <div class="job-listing">
                        <h3>${job.position}</h3>
                        <ul>
                            <li><strong>Location:</strong> ${job.location}</li>
                            <li><strong>Type:</strong> ${job.type}</li>
                            <li><strong>Citizenship:</strong> ${job.citizenship}</li>
                            <li><strong>Gender:</strong> ${job.gender}</li>
                            <li><strong>Age Range:</strong> ${job.ageRange}</li>
                            <li><strong>Salary:</strong> ${job.salary} SGD</li>
                            <li><strong>Accommodation:</strong> ${job.accommodation}</li>
                            <li><strong>Work Pattern:</strong> ${job.workDayPattern}</li>
                            <li><strong>Availability:</strong> ${job.availability}</li>
                        </ul>
                        <div class="job-description">${job.description}</div>
                        <button class="btn btn-primary" onclick="toggleJobModal(true, '${job.jobId}', '${job.position}')">Apply Now</button>
                    </div>
                `).join('')}
            </div>
        </section>`;
}

function buildFLEnquiryForm() {
    const container = document.getElementById('enquiries');
    if (!container) return;
    container.innerHTML = `
        <section id="enquiries-form-content" class="dynamic-content-wrapper">
            <h2>Send us an Enquiry</h2>
            <form id="enquiry-form" class="enquiry-form">
                <input type="text" id="enquiry-name" placeholder="Your Full Name" required>
                <input type="email" id="enquiry-email" placeholder="Your Email Address" required>
                <input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required>
                <select id="enquiry-type" required>
                    <option value="" disabled selected>Select Enquiry Type...</option>
                    <option value="General Question">General Question</option>
                    <option value="Product Support">Product Support</option>
                </select>
                <textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea>
                <button type="submit" class="btn btn-primary">Submit Enquiry</button>
                <p id="enquiry-status"></p>
            </form>
        </section>`;
    document.getElementById('enquiry-form').addEventListener('submit', handleEnquirySubmit);
}

function buildFLCartModal() {
    const container = document.getElementById('cart-modal');
    if (!container) return;
    container.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="toggleCart(true)">×</span>
            <h2>Your Shopping Cart</h2>
            <div id="cart-items"><p>Your cart is currently empty.</p></div>
            <div class="cart-summary">
                <div class="summary-line"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                <div class="summary-line"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div>
                <div class="summary-line total"><span>Total</span><span id="cart-total">RM 0.00</span></div>
            </div>
            <div class="customer-info-form">
                <h3>Customer Info</h3>
                <input type="text" id="customer-name" placeholder="Full Name" required>
                <input type="tel" id="customer-phone" placeholder="WhatsApp Number" required>
                <input type="email" id="customer-email" placeholder="Email" required>
                <textarea id="customer-address" placeholder="Address" rows="4" required></textarea>
            </div>
            <button class="btn btn-primary" onclick="initiateCheckout()">Complete Order</button>
        </div>`;
}

function buildFLJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    if (!container) return;
    container.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="toggleJobModal(false)">×</span>
            <h2>Apply for <span id="job-modal-title"></span></h2>
            <form id="job-application-form" class="enquiry-form">
                <input type="hidden" id="job-id-input">
                <input type="hidden" id="job-position-input">
                <input type="text" id="applicant-name" placeholder="Full Name" required>
                <input type="email" id="applicant-email" placeholder="Email" required>
                <input type="tel" id="applicant-phone" placeholder="Phone" required>
                <input type="text" id="applicant-citizenship" placeholder="Citizenship" required>
                <textarea id="applicant-message" placeholder="Tell us about yourself" rows="4"></textarea>
                <label for="applicant-resume">Upload Resume (Mandatory)</label>
                <input type="file" id="applicant-resume" required>
                <button type="submit" class="btn btn-primary">Submit Application</button>
                <p id="job-application-status"></p>
            </form>
        </div>`;
    document.getElementById('job-application-form').addEventListener('submit', handleJobApplicationSubmit);
}
