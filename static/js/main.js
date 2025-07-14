document.addEventListener('DOMContentLoaded', function() {
    // --- Element References (Declared ONCE) ---
    const companiesListDiv = document.getElementById('companiesList');

    // CSV Upload & Mapping Elements
    const uploadCsvBtn = document.getElementById('uploadCsvBtn');
    const csvFileInput = document.getElementById('csvFileInput');
    const mappingModal = document.getElementById('mappingModal');
    const closeMappingModalBtn = document.getElementById('closeMappingModalBtn');
    const cancelMappingBtn = document.getElementById('cancelMappingBtn');
    const runImportBtn = document.getElementById('runImportBtn');
    const mappingTableContainer = document.getElementById('mapping-table-container');

    // Webhook Elements
    const createOutreachBtn = document.getElementById('createOutreachBtn'); // Renamed from sendAllBtn

    // Outreach Modal Elements
    const outreachModal = document.getElementById('outreachModal');
    const closeOutreachModalBtn = document.getElementById('closeOutreachModalBtn');
    const outreachCancelBtn = document.getElementById('outreachCancelBtn');
    const outreachNextBtn = document.getElementById('outreachNextBtn');
    const outreachSendBtn = document.getElementById('outreachSendBtn');
    const outreachSteps = document.querySelectorAll('.outreach-step');

    const API_BASE_URL = '/api';
    let uploadedFile = null; // Variable to store the uploaded file temporarily

    // --- Event Listeners ---
    if (uploadCsvBtn) {
        uploadCsvBtn.addEventListener('click', () => {
            csvFileInput.click(); // Trigger hidden file input
        });
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleFileSelect);
    }

    if (closeMappingModalBtn) closeMappingModalBtn.addEventListener('click', closeMappingModal);
    if (cancelMappingBtn) cancelMappingBtn.addEventListener('click', closeMappingModal);
    if (runImportBtn) runImportBtn.addEventListener('click', handleRunImport);

    // New listeners for outreach modal
    if (createOutreachBtn) createOutreachBtn.addEventListener('click', openOutreachModal);
    if (closeOutreachModalBtn) closeOutreachModalBtn.addEventListener('click', resetOutreachModal);
    if (outreachCancelBtn) outreachCancelBtn.addEventListener('click', resetOutreachModal);
    if (outreachNextBtn) outreachNextBtn.addEventListener('click', handleOutreachNext);
    if (outreachSendBtn) outreachSendBtn.addEventListener('click', handleSendTargetedOutreach);


    window.addEventListener('click', (event) => {
        if (event.target === mappingModal) {
            closeMappingModal();
        }
    });

    // --- Load Initial Table Data ---
    async function fetchTableData(tableName = 'journalists') {
        try {
            const response = await fetch(`${API_BASE_URL}/table/${tableName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderTableData(data, tableName);
        } catch (error) {
            console.error(`Error fetching data for ${tableName}:`, error);
            if(companiesListDiv) companiesListDiv.innerHTML = `<p class="alert alert-danger">Error loading data for ${tableName}. Please try again later.</p>`;
        }
    }

    function renderTableData(data, tableName) {
        if (!companiesListDiv) return;
        if (data.length === 0) {
            companiesListDiv.innerHTML = `<p>No entries found in ${tableName}. Upload a CSV to get started!</p>`;
            return;
        }
        let tableHtml = `<div class="companies-table-container"><table class="companies-table"><thead><tr>
                        <th><!-- Avatar Col --></th><th>Name</th><th>Outlet Name</th><th>Email</th><th>Phone</th><th>Actions</th>
                        </tr></thead><tbody>`;
        data.forEach(row => {
            const avatarInitial = row.name ? row.name.charAt(0).toUpperCase() : '?';
            tableHtml += `<tr>
                    <td><div class="table-avatar-placeholder">${avatarInitial}</div></td>
                    <td>${escapeHTML(row.name)}</td>
                    <td>${escapeHTML(row.outletName)}</td>
                    <td>${escapeHTML(row.Email)}</td>
                    <td>${escapeHTML(row.phone)}</td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}" data-table="${tableName}" title="Edit">&#9998;</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}" data-table="${tableName}" title="Delete">&#128465;</button>
                    </td></tr>`;
        });
        tableHtml += '</tbody></table></div>';
        companiesListDiv.innerHTML = tableHtml;

        document.querySelectorAll('.edit-btn').forEach(button => button.addEventListener('click', handleEditEntry));
        document.querySelectorAll('.delete-btn').forEach(button => button.addEventListener('click', handleDeleteEntry));
    }

    // --- CSV Import Functions ---
    function openMappingModal() {
        if (mappingModal) mappingModal.style.display = 'block';
    }
    function closeMappingModal() {
        if (mappingModal) mappingModal.style.display = 'none';
        if (csvFileInput) csvFileInput.value = '';
        uploadedFile = null;
        if (mappingTableContainer) mappingTableContainer.innerHTML = '<p><i>Please upload a CSV file to begin mapping.</i></p>';
        if (runImportBtn) runImportBtn.disabled = true;
    }

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a valid .csv file.');
            csvFileInput.value = '';
            return;
        }
        uploadedFile = file;
        const formData = new FormData();
        formData.append('file', uploadedFile);
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
        // Advanced Debugging: Log the entire DOM body to see what the script sees.
        console.log("DEBUG: Document body HTML at the time of search:", document.body.outerHTML);

        const targetTableSelect = document.getElementById('targetTableSelect'); // Find element just-in-time
        if (!targetTableSelect) {
            console.error("CRITICAL: Could not find 'targetTableSelect' element in the modal.");
            alert("An unexpected error occurred. Could not find the target table dropdown.");
            return;
        }
        const targetTable = targetTableSelect.value;
        if (!targetTable) {
            alert("Please select a target table first.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/table/${targetTable}/schema`);
            if (!response.ok) throw new Error("Could not fetch table schema.");
            const schemaData = await response.json();
            const dbColumns = schemaData.columns;
            let optionsHtml = '<option value="">-- Ignore this column --</option>';
            dbColumns.forEach(col => {
                optionsHtml += `<option value="${col}">${col}</option>`;
            });
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
            if (runImportBtn) runImportBtn.disabled = false;
        } catch (error) {
            console.error("Error building mapping UI:", error);
            mappingTableContainer.innerHTML = `<p class="alert alert-danger">Error: Could not load database fields for mapping.</p>`;
        }
    }

    async function handleRunImport() {
        if (!uploadedFile) {
            alert("An error occurred. The uploaded file is missing.");
            return;
        }
        if (runImportBtn) {
            runImportBtn.disabled = true;
            runImportBtn.textContent = 'Importing...';
        }

        const targetTableSelect = document.getElementById('targetTableSelect'); // Find just-in-time
        const targetTable = targetTableSelect ? targetTableSelect.value : null;

        if (!targetTable) {
            alert("Could not find target table. Aborting import.");
            if (runImportBtn) {
                runImportBtn.disabled = false;
                runImportBtn.textContent = 'Run Import';
            }
            return;
        }

        const mappingSelects = mappingTableContainer.querySelectorAll('.mapping-select');
        const columnMapping = {};
        mappingSelects.forEach(select => {
            const csvHeader = select.dataset.csvHeader;
            const dbField = select.value;
            if (dbField) {
                columnMapping[csvHeader] = dbField;
            }
        });
        if (Object.keys(columnMapping).length === 0) {
            alert("Please map at least one column before running the import.");
            if (runImportBtn) {
                runImportBtn.disabled = false;
                runImportBtn.textContent = 'Run Import';
            }
            return;
        }
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('target_table', targetTable);
        formData.append('column_mapping', JSON.stringify(columnMapping));
        try {
            const response = await fetch(`${API_BASE_URL}/import/run`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred during import.');
            alert(result.message);
            closeMappingModal();
            fetchTableData(targetTable);
        } catch (error) {
            console.error("Error running import:", error);
            alert(`Import Failed: ${error.message}`);
        } finally {
            if (runImportBtn) {
                runImportBtn.disabled = false;
                runImportBtn.textContent = 'Run Import';
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

    // --- Initial Load ---
    fetchTableData('journalists');

    // --- Outreach Modal Logic ---
    let currentOutreachStep = 1;
    let outreachSelections = {
        staff: [],
        outlets: []
    };

    function showOutreachStep(stepNumber) {
        currentOutreachStep = stepNumber;
        outreachSteps.forEach(step => step.style.display = 'none');
        const currentStepElem = document.getElementById(`outreach-step-${stepNumber}`);
        if(currentStepElem) currentStepElem.style.display = 'block';

        outreachNextBtn.style.display = 'block';
        outreachSendBtn.style.display = 'none';

        if (stepNumber === 2 || stepNumber === 4) {
            outreachNextBtn.textContent = 'Confirm';
        } else {
            outreachNextBtn.textContent = 'Next';
        }

        if (stepNumber === 4) {
            outreachNextBtn.style.display = 'none';
            outreachSendBtn.style.display = 'inline-block';
        }
    }

    function resetOutreachModal() {
        outreachSelections = { staff: [], outlets: [] };
        showOutreachStep(1);
        const staffContainer = document.getElementById('outreach-staff-list-container');
        const outletsContainer = document.getElementById('outreach-outlets-list-container');
        if(staffContainer) staffContainer.innerHTML = '<p>Loading staff...</p>';
        if(outletsContainer) outletsContainer.innerHTML = '<p>Loading outlets...</p>';
        if (outreachModal) outreachModal.style.display = 'none';
    }

    async function openOutreachModal() {
        resetOutreachModal();
        if (outreachModal) outreachModal.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE_URL}/staff`);
            const staffList = await response.json();
            const container = document.getElementById('outreach-staff-list-container');
            let listHtml = '';
            staffList.forEach(staff => {
                listHtml += `<div class="multi-select-item">
                    <input type="checkbox" id="staff_${staff.id}" name="staff" value='${escapeHTML(JSON.stringify(staff))}'>
                    <label for="staff_${staff.id}">${escapeHTML(staff.staff_name)} (${escapeHTML(staff.staff_email)})</label>
                </div>`;
            });
            container.innerHTML = listHtml || '<p>No staff found. Please add staff members first.</p>';
        } catch (error) {
            console.error("Error loading staff for outreach:", error);
            document.getElementById('outreach-staff-list-container').innerHTML = '<p class="alert alert-danger">Could not load staff.</p>';
        }
    }

    async function handleOutreachNext() {
        if (currentOutreachStep === 1) {
            outreachSelections.staff = [];
            const checkedStaff = document.querySelectorAll('#outreach-staff-list-container input[type="checkbox"]:checked');
            if (checkedStaff.length === 0) {
                alert("Please select at least one staff member.");
                return;
            }
            checkedStaff.forEach(checkbox => {
                outreachSelections.staff.push(JSON.parse(checkbox.value));
            });
            const confirmList = document.getElementById('outreach-staff-confirm-list');
            confirmList.innerHTML = '<ul>' + outreachSelections.staff.map(s => `<li>${escapeHTML(s.staff_name)}</li>`).join('') + '</ul>';
            showOutreachStep(2);
        } else if (currentOutreachStep === 2) {
            showOutreachStep(3);
            try {
                const response = await fetch(`${API_BASE_URL}/outlets/all`);
                const outlets = await response.json();
                const container = document.getElementById('outreach-outlets-list-container');
                let listHtml = '';
                outlets.forEach(outlet => {
                    listHtml += `<div class="multi-select-item">
                        <input type="checkbox" id="outlet_${outlet.replace(/\s+/g, '')}" name="outlet" value="${escapeHTML(outlet)}">
                        <label for="outlet_${outlet.replace(/\s+/g, '')}">${escapeHTML(outlet)}</label>
                    </div>`;
                });
                container.innerHTML = listHtml || '<p>No outlets found in the database.</p>';
            } catch (error) {
                console.error("Error loading outlets for outreach:", error);
                document.getElementById('outreach-outlets-list-container').innerHTML = '<p class="alert alert-danger">Could not load outlets.</p>';
            }
        } else if (currentOutreachStep === 3) {
            outreachSelections.outlets = [];
            const checkedOutlets = document.querySelectorAll('#outreach-outlets-list-container input[type="checkbox"]:checked');
            if (checkedOutlets.length === 0) {
                alert("Please select at least one outlet.");
                return;
            }
            checkedOutlets.forEach(checkbox => {
                outreachSelections.outlets.push(checkbox.value);
            });
            document.getElementById('outreach-final-staff-list').innerHTML = '<ul>' + outreachSelections.staff.map(s => `<li>${escapeHTML(s.staff_name)}</li>`).join('') + '</ul>';
            document.getElementById('outreach-final-outlets-list').innerHTML = '<ul>' + outreachSelections.outlets.map(o => `<li>${escapeHTML(o)}</li>`).join('') + '</ul>';
            showOutreachStep(4);
        }
    }

    async function handleSendTargetedOutreach() {
        if(outreachSendBtn) {
            outreachSendBtn.disabled = true;
            outreachSendBtn.textContent = 'Sending...';
        }
        const payload = {
            target_table: 'journalists', // Defaulting to journalists, can be made dynamic
            outlet_names: outreachSelections.outlets,
            staff_members: outreachSelections.staff
        };
        try {
            const response = await fetch(`${API_BASE_URL}/webhook/send_targeted_outreach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            alert(result.message);
            resetOutreachModal();
        } catch(error) {
            alert(`Error: ${error.message}`);
        } finally {
            if(outreachSendBtn) {
                outreachSendBtn.disabled = false;
                outreachSendBtn.textContent = 'Send to Webhook';
            }
        }
    }
});
