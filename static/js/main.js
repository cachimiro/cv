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
    // const targetTableSelect = document.getElementById('targetTableSelect'); // DEFER looking for this

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
});
