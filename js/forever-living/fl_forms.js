// =================================================================
// Forever Living Forms Module - v19.4 (Definitive Final)
// Handles all form submission logic for the FL business.
// =================================================================

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    if (!statusEl) return;
    
    statusEl.textContent = 'Sending...';
    statusEl.style.color = 'blue';

    try {
        const payload = {
            action: 'logEnquiry',
            data: {
                name: document.getElementById('enquiry-name').value,
                email: document.getElementById('enquiry-email').value,
                phone: document.getElementById('enquiry-phone').value,
                type: document.getElementById('enquiry-type').value,
                message: document.getElementById('enquiry-message').value
            }
        };
        
        const result = await postDataToGScript(payload);
        
        statusEl.textContent = 'Your enquiry has been sent successfully!';
        statusEl.style.color = 'green';
        event.target.reset();
        setTimeout(() => { statusEl.textContent = ''; }, 5000);

    } catch (error) {
        statusEl.textContent = `An error occurred: ${error.message}`;
        statusEl.style.color = 'red';
        console.error('Enquiry form submission error:', error);
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (!statusEl || !fileInput) return;

    if (fileInput.files.length === 0) {
        statusEl.textContent = 'Resume upload is mandatory.';
        statusEl.style.color = 'red';
        return;
    }

    statusEl.textContent = 'Submitting...';
    statusEl.style.color = 'blue';

    try {
        const file = fileInput.files[0];
        const base64File = await getBase64(file);
        
        const payload = {
            action: 'logJobApplication',
            data: {
                jobId: document.getElementById('job-id-input').value,
                position: document.getElementById('job-position-input').value,
                name: document.getElementById('applicant-name').value,
                email: document.getElementById('applicant-email').value,
                phone: document.getElementById('applicant-phone').value,
                citizenship: document.getElementById('applicant-citizenship').value,
                message: document.getElementById('applicant-message').value,
                resumeFile: base64File.split(',')[1],
                resumeMimeType: file.type,
                resumeFileName: file.name
            }
        };

        const result = await postDataToGScript(payload);

        statusEl.textContent = 'Application submitted successfully!';
        statusEl.style.color = 'green';
        setTimeout(() => {
            toggleJobModal(false);
        }, 3000);

    } catch (error) {
        statusEl.textContent = `An error occurred: ${error.message}`;
        statusEl.style.color = 'red';
        console.error('Job application submission error:', error);
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
