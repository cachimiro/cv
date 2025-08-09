document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const uploadIdSelect = document.getElementById('upload_id');
    const outletContainer = document.getElementById('outlet_name');
    const cityContainer = document.getElementById('city');
    const followUpEmailsList = document.getElementById('follow-up-emails-list');
    const addFollowUpForm = document.getElementById('add-follow-up-form');

    // --- State Management ---
    let allOutlets = [];
    let allCities = [];

    // --- Utility Functions ---
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    };

    // --- Core Functions ---

    /**
     * Renders a list of items (outlets or cities) into a container.
     * @param {HTMLElement} container - The container element for the checkboxes.
     * @param {string[]} items - An array of strings to render as choices.
     * @param {string} name - The name attribute for the input checkboxes.
     */
    function renderChoices(container, items, name) {
        container.innerHTML = ''; // Clear previous choices
        if (items.length === 0) {
            container.innerHTML = '<p class="empty-choice-text">No options available.</p>';
            return;
        }
        items.forEach(item => {
            const choiceDiv = document.createElement('div');
            choiceDiv.className = 'choice-item';
            choiceDiv.innerHTML = `
                <input type="checkbox" id="${name}-${escapeHTML(item)}" name="${name}" value="${escapeHTML(item)}">
                <label for="${name}-${escapeHTML(item)}">${escapeHTML(item)}</label>
            `;
            container.appendChild(choiceDiv);
        });
    }

    /**
     * Fetches the list of uploaded journalist lists and populates the dropdown.
     */
    async function loadUploads() {
        try {
            const response = await fetch('/api/uploads');
            if (!response.ok) throw new Error('Failed to fetch uploads');
            const uploads = await response.json();

            uploadIdSelect.innerHTML = '<option value="">Select a journalist list</option>';
            uploads.forEach(upload => {
                const option = document.createElement('option');
                option.value = upload.id;
                option.textContent = escapeHTML(upload.name);
                uploadIdSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading uploads:', error);
            showFlashMessage('Could not load journalist lists.', 'danger');
        }
    }

    /**
     * Fetches outlets and cities based on the selected upload ID.
     * @param {string} uploadId - The ID of the selected upload.
     */
    async function loadFilters(uploadId) {
        const fetchUrl = (type) => uploadId ? `/api/${type}/all?upload_id=${uploadId}` : `/api/${type}/all`;

        try {
            const [outletsRes, citiesRes] = await Promise.all([
                fetch(fetchUrl('outlets')),
                fetch(fetchUrl('cities'))
            ]);

            if (!outletsRes.ok) throw new Error('Failed to fetch outlets');
            if (!citiesRes.ok) throw new Error('Failed to fetch cities');

            allOutlets = await outletsRes.json();
            allCities = await citiesRes.json();

            renderChoices(outletContainer, allOutlets, 'outlet_name');
            renderChoices(cityContainer, allCities, 'city');

        } catch (error) {
            console.error('Error loading filters:', error);
            showFlashMessage('Could not load filtering options.', 'danger');
            allOutlets = [];
            allCities = [];
            renderChoices(outletContainer, [], 'outlet_name');
            renderChoices(cityContainer, [], 'city');
        }
    }

    /**
     * Fetches and displays the list of existing follow-up emails.
     */
    async function loadFollowUpEmails() {
        try {
            const response = await fetch('/api/follow-up-emails');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const emails = await response.json();

            followUpEmailsList.innerHTML = ''; // Clear current list

            if (emails.length === 0) {
                followUpEmailsList.innerHTML = `
                    <div class="empty-state">
                        <i class="bi bi-envelope-open"></i>
                        <h3>No Follow-Ups Yet</h3>
                        <p>Create a new follow-up email using the form on the left.</p>
                    </div>`;
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Subject Line</th>
                        <th>Content</th>
                        <th class="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            emails.forEach(email => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${escapeHTML(email.name)}</td>
                    <td><pre class="content-preview">${escapeHTML(email.content.substring(0, 70))}${email.content.length > 70 ? '...' : ''}</pre></td>
                    <td class="action-buttons text-center">
                        <button class="btn btn-secondary btn-sm btn-edit" data-id="${email.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete" data-id="${email.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
            });
            followUpEmailsList.appendChild(table);
        } catch (error) {
            console.error('Error loading follow-up emails:', error);
            followUpEmailsList.innerHTML = '<div class="empty-state"><p>Error loading follow-up emails.</p></div>';
        }
    }

    // --- Event Listeners ---

    /**
     * Handles changes to the journalist list dropdown.
     */
    uploadIdSelect.addEventListener('change', function() {
        loadFilters(this.value);
    });

    /**
     * Handles form submission for adding a new follow-up email.
     */
    addFollowUpForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData(addFollowUpForm);
        const submitButton = addFollowUpForm.querySelector('button[type="submit"]');

        const data = {
            upload_id: formData.get('upload_id'),
            name: formData.get('name'),
            content: formData.get('content'),
            outlet_name: JSON.stringify(formData.getAll('outlet_name')),
            city: JSON.stringify(formData.getAll('city'))
        };

        if (!data.upload_id) {
            showFlashMessage('Please select a journalist list.', 'danger');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';

        try {
            const response = await fetch('/api/follow-up-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save.');

            showFlashMessage(result.message || 'Follow-up email saved successfully!', 'success');
            addFollowUpForm.reset();
            // After reset, re-render empty choices
            renderChoices(outletContainer, [], 'outlet_name');
            renderChoices(cityContainer, [], 'city');
            loadFollowUpEmails(); // Refresh the list
        } catch (error) {
            console.error('Save error:', error);
            showFlashMessage(`Save failed: ${error.message}`, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Follow-Up';
        }
    });

    /**
     * Debounce function to limit the rate at which a function gets called.
     */
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    /**
     * Sets up event listeners for filter controls (select all, search).
     * @param {string} type - The type of filter ('outlets' or 'cities').
     * @param {string} fieldName - The database field name for searching ('outletName' or 'City').
     * @param {HTMLElement} container - The container for the choices.
     * @param {function} getAllItems - A function that returns the full list of items for this filter.
     */
    function setupFilterControls(type, fieldName, container, getAllItems) {
        const selectAllBtn = document.getElementById(`select-all-${type}`);
        const searchInput = document.getElementById(`search-selected-${type}`);

        selectAllBtn.addEventListener('click', () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const areAllChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !areAllChecked);
        });

        const handleSearch = debounce(async (query) => {
            const uploadId = uploadIdSelect.value;

            // If the query is empty, restore the full list for the selected upload.
            if (!query) {
                renderChoices(container, getAllItems(), type);
                return;
            }

            // If query is not empty, perform the search.
            try {
                const url = `/api/search/${fieldName}?q=${encodeURIComponent(query)}&upload_id=${uploadId || ''}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Search request failed');
                const results = await response.json();
                renderChoices(container, results, type);
            } catch (error) {
                console.error(`Error searching ${type}:`, error);
                container.innerHTML = `<p class="empty-choice-text">Search failed.</p>`;
            }
        }, 300); // 300ms debounce delay

        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    // --- Edit and Delete Logic ---

    const modal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeButtons = modal.querySelectorAll('.close-btn');

    async function viewFollowUpEmail(id) {
        try {
            const response = await fetch(`/api/follow-up-email/${id}`);
            if (!response.ok) throw new Error('Failed to fetch email details.');
            const email = await response.json();

            // Populate the modal form
            editForm.querySelector('#edit-id').value = email.id;
            editForm.querySelector('#edit-name').value = email.name;
            editForm.querySelector('#edit-content').value = email.content;

            // Note: The select boxes for outlets and cities in the modal are not populated
            // from the saved email data in this implementation, as the context might have changed.
            // They will retain their current filter state. This can be enhanced later if needed.

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error viewing email:', error);
            showFlashMessage(error.message, 'danger');
        }
    }

    async function deleteFollowUpEmail(id) {
        if (!confirm('Are you sure you want to delete this follow-up email?')) return;

        try {
            const response = await fetch(`/api/follow-up-email/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete.');

            showFlashMessage(result.message || 'Email deleted successfully!', 'success');
            loadFollowUpEmails(); // Refresh the list
        } catch (error) {
            console.error('Error deleting email:', error);
            showFlashMessage(error.message, 'danger');
        }
    }

    // Event listener for the whole list container (delegation)
    followUpEmailsList.addEventListener('click', function(event) {
        const editButton = event.target.closest('.btn-edit');
        const deleteButton = event.target.closest('.btn-delete');

        if (editButton) {
            viewFollowUpEmail(editButton.dataset.id);
        } else if (deleteButton) {
            deleteFollowUpEmail(deleteButton.dataset.id);
        }
    });

    // Event listener for the edit form submission
    editForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const id = editForm.querySelector('#edit-id').value;
        const data = {
            name: editForm.querySelector('#edit-name').value,
            content: editForm.querySelector('#edit-content').value,
            // Again, not re-submitting outlets/cities from the modal in this simplified version.
            // This would require its own set of select boxes in the modal HTML.
        };

        try {
            const response = await fetch(`/api/follow-up-email/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Update failed.');

            showFlashMessage(result.message || 'Update successful!', 'success');
            modal.style.display = 'none';
            loadFollowUpEmails(); // Refresh the list
        } catch (error) {
            console.error('Error updating email:', error);
            showFlashMessage(error.message, 'danger');
        }
    });

    // Listeners to close the modal
    closeButtons.forEach(button => button.addEventListener('click', () => modal.style.display = 'none'));
    window.addEventListener('click', event => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });


    // --- Initial Page Load ---
    function initializePage() {
        loadUploads();
        loadFilters(''); // Load with no upload selected initially
        loadFollowUpEmails();

        setupFilterControls('outlets', 'outletName', outletContainer, () => allOutlets);
        setupFilterControls('cities', 'City', cityContainer, () => allCities);
    }

    initializePage();
});
