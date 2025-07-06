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

    // --- Load Companies ---
    async function fetchCompanies() {
        try {
            const response = await fetch(`${API_BASE_URL}/companies`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const companies = await response.json();
            renderCompanies(companies);
        } catch (error) {
            console.error('Error fetching companies:', error);
            if(companiesListDiv) companiesListDiv.innerHTML = '<p>Error loading companies. Please try again later.</p>';
        }
    }

    function renderCompanies(companies) {
        if (!companiesListDiv) return;

        if (companies.length === 0) {
            companiesListDiv.innerHTML = '<p>No companies found. Add one!</p>';
            return;
        }

        let tableHtml = `
            <div class="companies-table-container">
                <table class="companies-table">
                    <thead>
                        <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>URL</th>
                        <th>Industry</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        companies.forEach(company => {
            tableHtml += `
                <tr>
                    <td>${company.id}</td>
                    <td>${escapeHTML(company.name)}</td>
                    <td><a href="${escapeHTML(company.url || '')}" target="_blank" rel="noopener noreferrer">${escapeHTML(company.url || '')}</a></td>
                    <td>${escapeHTML(company.industry || '')}</td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${company.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${company.id}">Delete</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table></div>'; // Close .companies-table-container
        companiesListDiv.innerHTML = tableHtml;

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditCompany);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteCompany);
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
    if (companyForm) {
        companyForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const id = companyIdInput.value;
            const companyData = {
                name: document.getElementById('name').value,
                url: document.getElementById('url').value,
                industry: document.getElementById('industry').value
            };

            let url = `${API_BASE_URL}/companies`;
            let method = 'POST';

            if (id) { // If ID exists, it's an update
                url += `/${id}`;
                method = 'PUT';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        // Future: 'X-API-Key': 'YOUR_API_KEY_HERE'
                    },
                    body: JSON.stringify(companyData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                // const result = await response.json(); // Or handle based on status code for POST (201) / PUT (200)
                // console.log('Success:', result);
                closeModal();
                fetchCompanies(); // Refresh the list
                // TODO: Add user feedback (e.g., "Company saved successfully")
            } catch (error) {
                console.error('Error saving company:', error);
                alert(`Error saving company: ${error.message}`); // Simple alert for now
                // TODO: Display error more gracefully within the modal or page
            }
        });
    }

    // --- Edit Company ---
    async function handleEditCompany(event) {
        const id = event.target.dataset.id;
        try {
            const response = await fetch(`${API_BASE_URL}/companies/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const company = await response.json();

            // Populate form
            companyIdInput.value = company.id;
            document.getElementById('name').value = company.name || '';
            document.getElementById('url').value = company.url || '';
            document.getElementById('industry').value = company.industry || '';

            modalTitle.textContent = 'Edit Company';
            openModal();
        } catch (error) {
            console.error('Error fetching company details for edit:', error);
            alert('Could not load company details for editing.');
        }
    }

    // --- Delete Company ---
    async function handleDeleteCompany(event) {
        const id = event.target.dataset.id;
        if (confirm(`Are you sure you want to delete company ID ${id}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
                    method: 'DELETE',
                    headers: {
                        // Future: 'X-API-Key': 'YOUR_API_KEY_HERE'
                    }
                });

                if (!response.ok) {
                     const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                // console.log('Delete successful');
                fetchCompanies(); // Refresh the list
                // TODO: Add user feedback (e.g., "Company deleted successfully")
            } catch (error) {
                console.error('Error deleting company:', error);
                alert(`Error deleting company: ${error.message}`); // Simple alert for now
            }
        }
    }

    // Initial load
    fetchCompanies();
});
