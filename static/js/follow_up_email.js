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
        // Implementation for loading emails can be added here if needed.
        // For now, this is a placeholder.
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
     * Sets up event listeners for filter controls (select all, search).
     * @param {string} type - The type of filter ('outlets' or 'cities').
     * @param {HTMLElement} container - The container for the choices.
     * @param {string[]} allItems - The full list of items for this filter.
     */
    function setupFilterControls(type, container, allItems) {
        const selectAllBtn = document.getElementById(`select-all-${type}`);
        const searchInput = document.getElementById(`search-selected-${type}`);

        selectAllBtn.addEventListener('click', () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const areAllChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !areAllChecked);
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const choiceItems = container.querySelectorAll('.choice-item');
            choiceItems.forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();
                item.style.display = label.includes(query) ? '' : 'none';
            });
        });
    }

    // --- Initial Page Load ---
    function initializePage() {
        loadUploads();
        loadFilters(''); // Load with no upload selected initially
        loadFollowUpEmails();

        setupFilterControls('outlets', outletContainer, allOutlets);
        setupFilterControls('cities', cityContainer, allCities);
    }

    initializePage();
});
