// --- Global State Variables ---
let uploadedFile = null;
let currentOutreachStep = 1;
let outreachSelections = { staff: [], outlets: [] };
const API_BASE_URL = '/api';

// --- Main App Initialization ---
function initApp() {
    console.log("Sway PR Data App Initializing...");

    // --- Element Attachments ---
    const uploadCsvBtn = document.getElementById('uploadCsvBtn');
    const csvFileInput = document.getElementById('csvFileInput');
    const createOutreachBtn = document.getElementById('createOutreachBtn');
    const mappingModal = document.getElementById('mappingModal');
    const outreachModal = document.getElementById('outreachModal');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const leftSidebar = document.querySelector('.left-sidebar');
    const uploadSearchInput = document.getElementById('upload-search');
    const togglePassword = document.querySelector('.toggle-password');
    const loginForm = document.getElementById('login-form');

    if (uploadCsvBtn && csvFileInput) {
        uploadCsvBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', handleFileSelect);
    }

    if (createOutreachBtn) {
        createOutreachBtn.addEventListener('click', () => openOutreachModal());
    }

    if (mappingModal) {
        mappingModal.addEventListener('click', (event) => {
            if (event.target.id === 'closeMappingModalBtn' || event.target.id === 'cancelMappingBtn') closeMappingModal();
            else if (event.target.id === 'runImportBtn') handleRunImport();
            else if (event.target === mappingModal) closeMappingModal();
        });
    }

    if (outreachModal) {
        outreachModal.addEventListener('click', (event) => {
            if (event.target.id === 'closeOutreachModalBtn' || event.target.id === 'outreachCancelBtn') resetOutreachModal();
            else if (event.target.id === 'outreachNextBtn') handleOutreachNext();
            else if (event.target.id === 'outreachSendBtn') handleSendTargetedOutreach();
            else if (event.target === outreachModal) resetOutreachModal();
        });
    }

    if (mobileNavToggle && leftSidebar) {
        mobileNavToggle.addEventListener('click', () => leftSidebar.classList.toggle('is-open'));
    }

    if (uploadSearchInput) {
        uploadSearchInput.addEventListener('input', () => loadUploads(uploadSearchInput.value));
    }

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('bi-eye-slash-fill');
                icon.classList.add('bi-eye-fill');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('bi-eye-fill');
                icon.classList.add('bi-eye-slash-fill');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function() {
            const loginButton = document.getElementById('login-button');
            const btnText = loginButton.querySelector('.btn-text');
            const btnSpinner = loginButton.querySelector('.btn-spinner');

            loginButton.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';
        });
    }

    // --- Initial Data Load ---
    if (document.getElementById('uploadsList')) {
        loadUploads();
    }
}

document.addEventListener('DOMContentLoaded', initApp);


// --- Core Functions ---

async function loadUploads(query = '') {
    const uploadsListDiv = document.getElementById('uploadsList');
    if (!uploadsListDiv) return;
    try {
        const url = query ? `${API_BASE_URL}/search?q=${encodeURIComponent(query)}` : `${API_BASE_URL}/table/uploads`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const uploads = await response.json();
        renderUploadsList(uploads);
    } catch (error) {
        console.error('Error fetching uploads:', error);
        uploadsListDiv.innerHTML = `<p class="alert alert-danger">Error loading uploads. Please try again later.</p>`;
    }
}

function renderUploadsList(uploads) {
    const uploadsListDiv = document.getElementById('uploadsList');
    if (!uploadsListDiv) return;

    if (uploads.length === 0) {
        uploadsListDiv.innerHTML = `<div class="card empty-state"><p>No uploads found. Upload a CSV to get started!</p></div>`;
        return;
    }

    let listHtml = ''; // The container is already in the HTML
    uploads.forEach(upload => {
        const date = new Date(upload.created_at).toLocaleDateString();
        // Simple logic for file type icon
        const fileIcon = upload.name.toLowerCase().includes('.xlsx') ? 'bi-file-earmark-excel-fill' : 'bi-file-earmark-spreadsheet-fill';

        listHtml += `
            <a href="/upload/${upload.id}" class="upload-card">
                <div class="upload-card-header">
                    <i class="bi ${fileIcon} file-type-icon"></i>
                    <div>
                        <div class="upload-card-title">${escapeHTML(upload.name)}</div>
                        <div class="upload-card-date">Uploaded on: ${date}</div>
                    </div>
                </div>
                <div class="upload-card-body">
                    <div class="upload-card-details">
                        <div>
                            <strong>Email Stage:</strong>
                            <span>${escapeHTML(upload.email_stage)}</span>
                        </div>
                        <div>
                            <strong>Response Status:</strong>
                            <span>${escapeHTML(upload.response_status)}</span>
                        </div>
                    </div>
                </div>
                <div class="upload-card-footer">
                    <button class="btn btn-secondary btn-sm edit-upload-btn" data-id="${upload.id}" data-name="${escapeHTML(upload.name)}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-upload-btn" data-id="${upload.id}">Delete</button>
                </div>
            </a>
        `;
    });

    uploadsListDiv.innerHTML = listHtml;

    // Re-attach event listeners for the new buttons
    uploadsListDiv.querySelectorAll('.edit-upload-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent navigation
            handleEditUploadName(event);
        });
    });

    uploadsListDiv.querySelectorAll('.delete-upload-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent navigation
            handleDeleteUpload(event);
        });
    });
}

// --- CSV Import Functions ---
function openMappingModal() {
    const mappingModal = document.getElementById('mappingModal');
    if (mappingModal) mappingModal.style.display = 'block';
}

function closeMappingModal() {
    const mappingModal = document.getElementById('mappingModal');
    const csvFileInput = document.getElementById('csvFileInput');
    const mappingTableContainer = document.getElementById('mapping-table-container');
    const runImportBtn = document.getElementById('runImportBtn');

    if (mappingModal) mappingModal.style.display = 'none';
    if (csvFileInput) csvFileInput.value = '';
    uploadedFile = null;
    if (mappingTableContainer) mappingTableContainer.innerHTML = '<p><i>Please upload a CSV file to begin mapping.</i></p>';
    if (runImportBtn) runImportBtn.disabled = true;
}

async function handleFileSelect(event) {
    uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a valid .csv file.');
        event.target.value = '';
        return;
    }
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const mappingTableContainer = document.getElementById('mapping-table-container');
    if (mappingTableContainer) mappingTableContainer.innerHTML = '<p><i>Analyzing CSV headers...</i></p>';
    openMappingModal();

    try {
        const response = await fetch(`${API_BASE_URL}/import/preview`, { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to preview CSV.');
        }
        const data = await response.json();
        buildMappingUI(data.headers);
    } catch (error) {
        console.error('Error during CSV preview:', error);
        alert(`Error: ${error.message}`);
        closeMappingModal();
    }
}

async function buildMappingUI(csvHeaders) {
    const targetTableSelect = document.getElementById('targetTableSelect');
    const mappingTableContainer = document.getElementById('mapping-table-container');
    const runImportBtn = document.getElementById('runImportBtn');
    if (!targetTableSelect || !mappingTableContainer || !runImportBtn) {
        alert("Mapping modal elements are missing. Cannot proceed."); return;
    }
    const targetTable = targetTableSelect.value;
    try {
        const response = await fetch(`${API_BASE_URL}/table/${targetTable}/schema`);
        if (!response.ok) throw new Error("Could not fetch table schema.");
        const schemaData = await response.json();
        const dbColumns = schemaData.columns;
        let optionsHtml = '<option value="">-- Ignore this column --</option>';
        dbColumns.forEach(col => { optionsHtml += `<option value="${col}">${col}</option>`; });
        let mappingHtml = `<table class="mapping-table"><thead><tr><th>CSV Column</th><th>Database Field</th></tr></thead><tbody>`;
        csvHeaders.forEach(header => {
            mappingHtml += `<tr><td>${escapeHTML(header)}</td><td><select class="form-control mapping-select" data-csv-header="${escapeHTML(header)}">${optionsHtml}</select></td></tr>`;
        });
        mappingHtml += '</tbody></table>';
        mappingTableContainer.innerHTML = mappingHtml;
        csvHeaders.forEach(header => {
            const matchingColumn = dbColumns.find(col => col.toLowerCase() === header.toLowerCase().trim());
            if (matchingColumn) {
                const selectElement = mappingTableContainer.querySelector(`select[data-csv-header="${escapeHTML(header)}"]`);
                if(selectElement) selectElement.value = matchingColumn;
            }
        });
        runImportBtn.disabled = false;
    } catch (error) {
        console.error("Error building mapping UI:", error);
        mappingTableContainer.innerHTML = `<p class="alert alert-danger">Error: Could not load database fields for mapping.</p>`;
    }
}

async function handleRunImport() {
    const uploadName = prompt("Please enter a name for this upload batch:", uploadedFile.name);
    if (!uploadName) {
        showFlashMessage("Upload cancelled: A name is required.", "warning");
        return;
    }

    const runImportBtn = document.getElementById('runImportBtn');
    const targetTableSelect = document.getElementById('targetTableSelect');
    if (!uploadedFile) { showFlashMessage("An error occurred. The uploaded file is missing.", "danger"); return; }
    if (runImportBtn) { runImportBtn.disabled = true; runImportBtn.textContent = 'Importing...'; }
    const targetTable = targetTableSelect.value;
    const mappingSelects = document.querySelectorAll('#mapping-table-container .mapping-select');
    const columnMapping = {};
    mappingSelects.forEach(select => {
        if (select.value) { columnMapping[select.dataset.csvHeader] = select.value; }
    });
    if (Object.keys(columnMapping).length === 0) {
        showFlashMessage("Please map at least one column.", "warning");
        if (runImportBtn) { runImportBtn.disabled = false; runImportBtn.textContent = 'Run Import'; }
        return;
    }
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('target_table', targetTable);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    formData.append('upload_name', uploadName);
    try {
        const response = await fetch(`${API_BASE_URL}/import/run`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
        showFlashMessage(result.message, 'success');
        closeMappingModal();
        loadUploads();
    } catch (error) {
        console.error("Error running import:", error);
        showFlashMessage(`Import Failed: ${error.message}`, 'danger');
    } finally {
        if (runImportBtn) { runImportBtn.disabled = false; runImportBtn.textContent = 'Run Import'; }
    }
}

// --- Outreach Modal Logic ---
function showOutreachStep(stepNumber) {
    const outreachNextBtn = document.getElementById('outreachNextBtn');
    const outreachSendBtn = document.getElementById('outreachSendBtn');
    const outreachSteps = document.querySelectorAll('.outreach-step');
    if (!outreachNextBtn || !outreachSendBtn || !outreachSteps.length) return;
    currentOutreachStep = stepNumber;
    outreachSteps.forEach(step => step.style.display = 'none');
    const currentStepElem = document.getElementById(`outreach-step-${stepNumber}`);
    if(currentStepElem) currentStepElem.style.display = 'block';
    outreachNextBtn.style.display = 'block';
    outreachSendBtn.style.display = 'none';
    if (stepNumber === 2 || stepNumber === 4) { outreachNextBtn.textContent = 'Confirm'; }
    else { outreachNextBtn.textContent = 'Next'; }
    if (stepNumber === 4) { outreachNextBtn.style.display = 'none'; outreachSendBtn.style.display = 'inline-block'; }
}

function resetOutreachModal() {
    const outreachModal = document.getElementById('outreachModal');
    const staffContainer = document.getElementById('outreach-staff-list-container');
    const outletsContainer = document.getElementById('outreach-outlets-list-container');
    outreachSelections = { staff: [], outlets: [] };
    showOutreachStep(1);
    if(staffContainer) staffContainer.innerHTML = '<p>Loading staff...</p>';
    if(outletsContainer) outletsContainer.innerHTML = '<p>Loading outlets...</p>';
    if (outreachModal) outreachModal.style.display = 'none';
}

async function openOutreachModal() {
    const outreachModal = document.getElementById('outreachModal');
    const staffContainer = document.getElementById('outreach-staff-list-container');
    if(!staffContainer || !outreachModal) return;
    resetOutreachModal();
    outreachModal.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE_URL}/staff`);
        const staffList = await response.json();
        let listHtml = '';
        staffList.forEach(staff => {
            listHtml += `<div class="multi-select-item"><input type="checkbox" id="staff_${staff.id}" name="staff" value='${escapeHTML(JSON.stringify(staff))}'><label for="staff_${staff.id}">${escapeHTML(staff.staff_name)} (${escapeHTML(staff.staff_email)})</label></div>`;
        });
        staffContainer.innerHTML = listHtml || '<p>No staff found. Please add staff members first.</p>';
    } catch (error) {
        console.error("Error loading staff for outreach:", error);
        staffContainer.innerHTML = '<p class="alert alert-danger">Could not load staff.</p>';
    }
}

async function handleOutreachNext() {
    if (currentOutreachStep === 1) {
        outreachSelections.staff = [];
        const checkedStaff = document.querySelectorAll('#outreach-staff-list-container input[type="checkbox"]:checked');
        if (checkedStaff.length === 0) { alert("Please select at least one staff member."); return; }
        checkedStaff.forEach(checkbox => { outreachSelections.staff.push(JSON.parse(checkbox.value)); });
        document.getElementById('outreach-staff-confirm-list').innerHTML = '<ul>' + outreachSelections.staff.map(s => `<li>${escapeHTML(s.staff_name)}</li>`).join('') + '</ul>';
        showOutreachStep(2);
    } else if (currentOutreachStep === 2) {
        showOutreachStep(3);
        const outletsContainer = document.getElementById('outreach-outlets-list-container');
        try {
            const response = await fetch(`${API_BASE_URL}/outlets/all`);
            const outlets = await response.json();
            let listHtml = '';
            outlets.forEach(outlet => {
                listHtml += `<div class="multi-select-item"><input type="checkbox" id="outlet_${outlet.replace(/\s+/g, '')}" name="outlet" value="${escapeHTML(outlet)}"><label for="outlet_${outlet.replace(/\s+/g, '')}">${escapeHTML(outlet)}</label></div>`;
            });
            outletsContainer.innerHTML = listHtml || '<p>No outlets found in the database.</p>';
        } catch (error) {
            console.error("Error loading outlets for outreach:", error);
            outletsContainer.innerHTML = '<p class="alert alert-danger">Could not load outlets.</p>';
        }
    } else if (currentOutreachStep === 3) {
        outreachSelections.outlets = [];
        const checkedOutlets = document.querySelectorAll('#outreach-outlets-list-container input[type="checkbox"]:checked');
        if (checkedOutlets.length === 0) { alert("Please select at least one outlet."); return; }
        checkedOutlets.forEach(checkbox => { outreachSelections.outlets.push(checkbox.value); });
        document.getElementById('outreach-final-staff-list').innerHTML = '<ul>' + outreachSelections.staff.map(s => `<li>${escapeHTML(s.staff_name)}</li>`).join('') + '</ul>';
        document.getElementById('outreach-final-outlets-list').innerHTML = '<ul>' + outreachSelections.outlets.map(o => `<li>${escapeHTML(o)}</li>`).join('') + '</ul>';
        showOutreachStep(4);
    }
}

async function handleSendTargetedOutreach() {
    const outreachSendBtn = document.getElementById('outreachSendBtn');
    if(outreachSendBtn) { outreachSendBtn.disabled = true; outreachSendBtn.textContent = 'Sending...'; }
    const payload = {
        target_table: 'journalists',
        outlet_names: outreachSelections.outlets,
        staff_members: outreachSelections.staff
    };
    try {
        const response = await fetch(`${API_BASE_URL}/webhook/send_targeted_outreach`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
        alert(result.message);
        resetOutreachModal();
    } catch(error) {
        alert(`Error: ${error.message}`);
    } finally {
        if(outreachSendBtn) { outreachSendBtn.disabled = false; outreachSendBtn.textContent = 'Send to Webhook'; }
    }
}

async function handleEditUploadName(event) {
    const uploadId = event.target.dataset.id;
    const currentName = event.target.dataset.name;
    const newName = prompt("Enter a new name for the upload:", currentName);

    if (newName && newName.trim() !== '' && newName !== currentName) {
        try {
            const response = await fetch(`${API_BASE_URL}/upload/${uploadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            showFlashMessage(result.message, 'success');
            loadUploads(); // Refresh the list
        } catch (error) {
            console.error("Error updating upload name:", error);
            showFlashMessage(`Error: ${error.message}`, 'danger');
        }
    }
}

async function handleDeleteUpload(event) {
    const uploadId = event.target.dataset.id;
    const confirmation = confirm("Are you sure you want to delete this upload and all its data? This action cannot be undone.");

    if (confirmation) {
        try {
            const response = await fetch(`${API_BASE_URL}/upload/${uploadId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            showFlashMessage(result.message, 'success');
            loadUploads(); // Refresh the list
        } catch (error) {
            console.error("Error deleting upload:", error);
            showFlashMessage(`Error: ${error.message}`, 'danger');
        }
    }
}

// --- Placeholder Handlers for Edit/Delete ---
function handleEditEntry() { alert("Edit functionality is not yet implemented."); }
function handleDeleteEntry() { alert("Delete functionality is not yet implemented."); }

// --- HTML Escaping Utility ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}
