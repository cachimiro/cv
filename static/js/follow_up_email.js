document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const uploadIdSelect = document.getElementById('upload_id');
    const outletContainer = document.getElementById('outlet_name');
    const cityContainer = document.getElementById('city');

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

    // --- Core Functions for Client-Side Interactivity ---

    /**
     * Renders a list of items (outlets or cities) into a container as checkboxes.
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

            uploadIdSelect.innerHTML = '<option value="">Select a list to load filters</option>';
            uploads.forEach(upload => {
                const option = document.createElement('option');
                option.value = upload.id;
                option.textContent = escapeHTML(upload.name);
                uploadIdSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading uploads:', error);
        }
    }

    /**
     * Fetches outlets and cities based on the selected upload ID to populate filters.
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
            allOutlets = [];
            allCities = [];
            renderChoices(outletContainer, [], 'outlet_name');
            renderChoices(cityContainer, [], 'city');
        }
    }

    /**
     * Sets up event listeners for filter controls (select all, search).
     */
    function setupFilterControls(type, fieldName, container, getAllItems) {
        const selectAllBtn = document.getElementById(`select-all-${type}`);
        const searchInput = document.getElementById(`search-selected-${type}`);

        if (!selectAllBtn || !searchInput) return;

        selectAllBtn.addEventListener('click', () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const areAllChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !areAllChecked);
        });

        const handleSearch = debounce(async (query) => {
            const uploadId = uploadIdSelect.value;
            if (!query) {
                renderChoices(container, getAllItems(), type);
                return;
            }

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
        }, 300);

        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    // --- Initial Page Load ---
    function initializePage() {
        if (!uploadIdSelect) return; // Don't run if not on the right page

        loadUploads();
        loadFilters(''); // Load with no upload selected initially

        setupFilterControls('outlets', 'outletName', outletContainer, () => allOutlets);
        setupFilterControls('cities', 'City', cityContainer, () => allCities);

        uploadIdSelect.addEventListener('change', function() {
            loadFilters(this.value);
        });
    }

    initializePage();
});
