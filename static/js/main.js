document.addEventListener('DOMContentLoaded', function() {
    console.log("DEBUG: main.js script loaded and DOMContentLoaded event fired.");

    const companiesListDiv = document.getElementById('companiesList');
    // --- Element References ---
    const companiesListDiv = document.getElementById('companiesList');

    // Old Company Modal (to be removed/refactored)
    const companyModal = document.getElementById('companyModal');
    // const closeModalBtn = document.getElementById('closeModalBtn');
    // const cancelModalBtn = document.getElementById('cancelModalBtn');
    const companyForm = document.getElementById('companyForm');
    // const modalTitle = document.getElementById('modalTitle');
    // const companyIdInput = document.getElementById('companyId');

    // CSV Upload & Mapping Elements
    const uploadCsvBtn = document.getElementById('uploadCsvBtn');
    const csvFileInput = document.getElementById('csvFileInput');
    const mappingModal = document.getElementById('mappingModal');
    const closeMappingModalBtn = document.getElementById('closeMappingModalBtn');
    const cancelMappingBtn = document.getElementById('cancelMappingBtn');
    const runImportBtn = document.getElementById('runImportBtn');
    const mappingTableContainer = document.getElementById('mapping-table-container');
    const targetTableSelect = document.getElementById('targetTableSelect');


    const API_BASE_URL = '/api'; // Assuming API is served from the same origin
    let uploadedFile = null; // Variable to store the uploaded file temporarily

    // --- Utility Functions ---
    function clearForm() {
        companyForm.reset();
        companyIdInput.value = ''; // Clear hidden ID field
        modalTitle.textContent = 'Add Company';
    }

    function openModal() {
        companyModal.style.display = 'block';
    }

    function closeModal() {
        clearForm();
        companyModal.style.display = 'none';
    }

    // --- Event Listeners ---
    if (uploadCsvBtn) {
        console.log("DEBUG: uploadCsvBtn element found. Attaching click listener.");
        uploadCsvBtn.addEventListener('click', () => {
            console.log("DEBUG: 'Upload New Data' button clicked. Triggering file input.");
            csvFileInput.click(); // Trigger hidden file input
        });
    } else {
        console.error("DEBUG: uploadCsvBtn element NOT found.");
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleFileSelect);
    }

    // Close mapping modal listeners
    if (closeMappingModalBtn) closeMappingModalBtn.addEventListener('click', closeMappingModal);
    if (cancelMappingBtn) cancelMappingBtn.addEventListener('click', closeMappingModal);
    if (runImportBtn) runImportBtn.addEventListener('click', handleRunImport); // Add listener for Run Import button

    window.addEventListener('click', (event) => {
        if (event.target === mappingModal) {
            closeMappingModal();
        }
    });

    // Old modal listeners (can be removed later)
    // if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    // if(cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    // window.addEventListener('click', (event) => {
    //     if (event.target === companyModal) {
    //         closeModal();
    //     }
    // });

    // --- Load Table Data ---
    async function fetchTableData(tableName = 'journalists') { // Default to journalists
        try {
            const response = await fetch(`${API_BASE_URL}/table/${tableName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderTableData(data, tableName);
        } catch (error) {
            console.error(`Error fetching data for ${tableName}:`, error);
            if(companiesListDiv) companiesListDiv.innerHTML = `<p>Error loading data for ${tableName}. Please try again later.</p>`;
        }
    }

    function renderTableData(data, tableName) {
        if (!companiesListDiv) return;

        if (data.length === 0) {
            companiesListDiv.innerHTML = `<p>No entries found in ${tableName}. Add one or import a CSV!</p>`;
            return;
        }

        // For now, we will show a few key, common fields.
        // This will need to be made more dynamic later.
        let tableHtml = `
            <div class="companies-table-container">
                <table class="companies-table">
                    <thead>
                        <tr>
                        <th><!-- Avatar Col --></th>
                        <th>Name</th>
                        <th>Outlet Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach(row => {
            const avatarInitial = row.name ? row.name.charAt(0).toUpperCase() : '?';

            tableHtml += `
                <tr>
                    <td><div class="table-avatar-placeholder">${avatarInitial}</div></td>
                    <td>${escapeHTML(row.name)}</td>
                    <td>${escapeHTML(row.outletName)}</td>
                    <td>${escapeHTML(row.Email)}</td>
                    <td>${escapeHTML(row.phone)}</td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}" data-table="${tableName}" title="Edit">&#9998;</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}" data-table="${tableName}" title="Delete">&#128465;</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table></div>';
        companiesListDiv.innerHTML = tableHtml;

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditEntry); // Generic handler
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteEntry); // Generic handler
        });
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) {
            return '';
        }
        return String(str).replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    async function buildMappingUI(csvHeaders) {
        const targetTable = targetTableSelect.value;
        if (!targetTable) {
            alert("Please select a target table first.");
            return;
        }

        try {
            // Fetch the schema for the selected target table
            const response = await fetch(`${API_BASE_URL}/table/${targetTable}/schema`);
            if (!response.ok) {
                throw new Error("Could not fetch table schema.");
            }
            const schemaData = await response.json();
            const dbColumns = schemaData.columns;

            let mappingHtml = `
                <table class="mapping-table">
                    <thead>
                        <tr>
                            <th>CSV Column</th>
                            <th>Database Field</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Create dropdown options html
            let optionsHtml = '<option value="">-- Ignore this column --</option>';
            dbColumns.forEach(col => {
                optionsHtml += `<option value="${col}">${col}</option>`;
            });

            // Create a row for each CSV header
            csvHeaders.forEach(header => {
                // Auto-select logic: check for a direct match (case-insensitive)
                const lowerHeader = header.toLowerCase();
                const matchingColumn = dbColumns.find(col => col.toLowerCase() === lowerHeader);

                mappingHtml += `
                    <tr>
                        <td>${escapeHTML(header)}</td>
                        <td>
                            <select class="form-control mapping-select" data-csv-header="${escapeHTML(header)}">
                                ${optionsHtml}
                            </select>
                        </td>
                    </tr>
                `;
            });

            mappingHtml += '</tbody></table>';
            mappingTableContainer.innerHTML = mappingHtml;

            // Now, go back and set the selected value for auto-matched columns
            csvHeaders.forEach(header => {
                const lowerHeader = header.toLowerCase();
                const matchingColumn = dbColumns.find(col => col.toLowerCase() === lowerHeader);
                if (matchingColumn) {
                    const selectElement = mappingTableContainer.querySelector(`select[data-csv-header="${escapeHTML(header)}"]`);
                    if(selectElement) selectElement.value = matchingColumn;
                }
            });

            if (runImportBtn) runImportBtn.disabled = false; // Enable run button

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
        if (runImportBtn) runImportBtn.disabled = true; // Prevent double clicks
        if (runImportBtn) runImportBtn.textContent = 'Importing...';

        const targetTable = targetTableSelect.value;
        const mappingSelects = mappingTableContainer.querySelectorAll('.mapping-select');

        const columnMapping = {};
        mappingSelects.forEach(select => {
            const csvHeader = select.dataset.csvHeader;
            const dbField = select.value;
            if (dbField) { // Only include if a DB field is selected
                columnMapping[csvHeader] = dbField;
            }
        });

        if (Object.keys(columnMapping).length === 0) {
            alert("Please map at least one column before running the import.");
            if (runImportBtn) runImportBtn.disabled = false;
            if (runImportBtn) runImportBtn.textContent = 'Run Import';
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('target_table', targetTable);
        formData.append('column_mapping', JSON.stringify(columnMapping));

        try {
            const response = await fetch(`${API_BASE_URL}/import/run`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred during import.');
            }

            alert(result.message); // Show success message
            closeMappingModal();
            fetchTableData(targetTable); // Refresh the data table

        } catch (error) {
            console.error("Error running import:", error);
            alert(`Import Failed: ${error.message}`);
        } finally {
            if (runImportBtn) runImportBtn.disabled = false;
            if (runImportBtn) runImportBtn.textContent = 'Run Import';
        }
    }


    // --- Form Submission (Add/Edit) ---
    // NOTE: This logic is still tied to the old 'companies' modal and API.
    // It will need to be made dynamic in a future step. For now, it will likely fail
    // if used with the new tables unless we create generic add/edit/delete endpoints.
    if (companyForm) {
        companyForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            alert("Add/Edit functionality for this table is not yet implemented.");
            // The logic below is for the old /api/companies endpoint and needs refactoring.
            return;
        });
    }

    // --- Edit Entry ---
    async function handleEditEntry(event) {
        alert("Edit functionality is not yet implemented for this table.");
        // const id = event.target.dataset.id;
        // const tableName = event.target.dataset.table;
        // Future: Fetch from `/api/table/${tableName}/${id}`
        // Future: Populate a dynamic modal based on table schema
    }

    // --- Delete Entry ---
    async function handleDeleteEntry(event) {
        alert("Delete functionality is not yet implemented for this table.");
        // const id = event.target.dataset.id;
        // const tableName = event.target.dataset.table;
        // if (confirm(`Are you sure you want to delete entry ID ${id} from ${tableName}?`)) {
        //     // Future: Call `DELETE /api/table/${tableName}/${id}`
        // }
    }

    // --- CSV Import Functions ---
    function openMappingModal() {
        if (mappingModal) mappingModal.style.display = 'block';
    }
    function closeMappingModal() {
        if (mappingModal) mappingModal.style.display = 'none';
        if (csvFileInput) csvFileInput.value = ''; // Reset file input
        uploadedFile = null; // Clear stored file
        if (mappingTableContainer) mappingTableContainer.innerHTML = '<p><i>Please upload a CSV file to begin mapping.</i></p>'; // Reset content
        if (runImportBtn) runImportBtn.disabled = true; // Disable run button
    }

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a valid .csv file.');
            csvFileInput.value = ''; // Reset file input
            return;
        }

        uploadedFile = file; // Store the file for later use

        const formData = new FormData();
        formData.append('file', uploadedFile);

        // Show loading state
        if (mappingTableContainer) mappingTableContainer.innerHTML = '<p><i>Analyzing CSV headers...</i></p>';
        openMappingModal();

        try {
            const response = await fetch(`${API_BASE_URL}/import/preview`, {
                method: 'POST',
                body: formData
                // No 'Content-Type' header needed, browser sets it for FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to preview CSV.');
            }

            const data = await response.json();
            buildMappingUI(data.headers); // Build the UI
        } catch (error) {
            console.error('Error during CSV preview:', error);
            alert(`Error: ${error.message}`);
            closeMappingModal();
        }
    }


    // Initial load
    fetchTableData('journalists'); // Load journalists by default
});
