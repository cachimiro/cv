document.addEventListener('DOMContentLoaded', function() {
    const companiesListDiv = document.getElementById('companiesList');
    const companyModal = document.getElementById('companyModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addNewCompanyBtn = document.getElementById('addNewCompanyBtn');
    const companyForm = document.getElementById('companyForm');
    const modalTitle = document.getElementById('modalTitle');
    const companyIdInput = document.getElementById('companyId');

    const API_BASE_URL = '/api'; // Assuming API is served from the same origin

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
    if(addNewCompanyBtn) {
        addNewCompanyBtn.addEventListener('click', () => {
            clearForm(); // Ensure form is clear for adding
            modalTitle.textContent = 'Add Company';
            openModal();
        });
    }

    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if(cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }

    window.addEventListener('click', (event) => {
        if (event.target === companyModal) {
            closeModal();
        }
    });

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

    // Initial load
    fetchTableData('journalists'); // Load journalists by default
});
