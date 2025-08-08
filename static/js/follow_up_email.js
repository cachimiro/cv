document.addEventListener('DOMContentLoaded', function() {
    const addFollowUpForm = document.getElementById('add-follow-up-form');
    const followUpEmailsList = document.getElementById('follow-up-emails-list');
    const outletNameSelect = document.getElementById('outlet_name');
    const citySelect = document.getElementById('city');
    const editOutletNameSelect = document.getElementById('edit-outlet_name');
    const editCitySelect = document.getElementById('edit-city');
    const uploadIdSelect = document.getElementById('upload_id');

    const outletNameChoices = new Choices(outletNameSelect, {
        removeItemButton: true,
    });
    const cityChoices = new Choices(citySelect, {
        removeItemButton: true,
    });
    const editOutletNameChoices = new Choices(editOutletNameSelect, {
        removeItemButton: true,
    });
    const editCityChoices = new Choices(editCitySelect, {
        removeItemButton: true,
    });


    // Function to populate uploads
    async function loadUploads() {
        try {
            const response = await fetch('/api/uploads');
            if (!response.ok) throw new Error('Failed to fetch uploads');
            const uploads = await response.json();
            uploadIdSelect.innerHTML = '<option value="">Select a list</option>';
            uploads.forEach(upload => {
                const option = document.createElement('option');
                option.value = upload.id;
                option.textContent = upload.name;
                uploadIdSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading uploads:', error);
        }
    }

    // Function to fetch and populate outlets
    async function loadOutlets(uploadId) {
        try {
            const url = uploadId ? `/api/outlets/all?upload_id=${uploadId}` : '/api/outlets/all';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch outlets');
            const outlets = await response.json();
            const choices = outlets.map(outlet => ({ value: outlet, label: outlet }));
            outletNameChoices.setChoices(choices, 'value', 'label', true);
            editOutletNameChoices.setChoices(choices, 'value', 'label', true);
        } catch (error) {
            console.error('Error loading outlets:', error);
        }
    }

    // Function to fetch and populate cities
    async function loadCities(uploadId) {
        try {
            const url = uploadId ? `/api/cities/all?upload_id=${uploadId}` : '/api/cities/all';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch cities');
            const cities = await response.json();
            const choices = cities.map(city => ({ value: city, label: city }));
            cityChoices.setChoices(choices, 'value', 'label', true);
            editCityChoices.setChoices(choices, 'value', 'label', true);
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    }

    // Function to fetch and display follow-up emails
    async function loadFollowUpEmails() {
        try {
            const response = await fetch('/api/follow-up-emails');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const emails = await response.json();

            followUpEmailsList.innerHTML = ''; // Clear current list
            if (emails.length === 0) {
                followUpEmailsList.innerHTML = '<p>No follow-up emails found.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table'; // Use existing table style
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Subject Line</th>
                        <th>Outlet Name</th>
                        <th>City</th>
                        <th>Content</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');
            emails.forEach(email => {
                const row = tbody.insertRow();
                row.className = 'main-row';
                const outletNames = JSON.parse(email.outlet_name || '[]');
                const cities = JSON.parse(email.city || '[]');

                row.innerHTML = `
                    <td><button class="expand-btn"><i class="bi bi-chevron-right"></i></button> ${escapeHTML(email.name)}</td>
                    <td>${outletNames.length} outlets</td>
                    <td>${cities.length} cities</td>
                    <td><pre class="template-content">${escapeHTML(email.content.substring(0, 50))}${email.content.length > 50 ? '...' : ''}</pre></td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm btn-edit" data-id="${email.id}"><i class="bi bi-pencil"></i> Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete" data-id="${email.id}"><i class="bi bi-trash"></i> Delete</button>
                    </td>
                `;

                const expandableRow = tbody.insertRow();
                expandableRow.className = 'expandable-row';
                expandableRow.style.display = 'none';
                const expandableCell = expandableRow.insertCell();
                expandableCell.colSpan = 5;
                expandableCell.innerHTML = `
                    <div class="expanded-content">
                        <h5>Selected Outlets</h5>
                        <div class="tag-container">${outletNames.map(o => `<span class="tag">${escapeHTML(o)}</span>`).join('')}</div>
                        <hr>
                        <h5>Selected Cities</h5>
                        <div class="tag-container">${cities.map(c => `<span class="tag">${escapeHTML(c)}</span>`).join('')}</div>
                    </div>
                `;
            });
            followUpEmailsList.appendChild(table);
        } catch (error) {
            console.error('Error loading follow-up emails:', error);
            followUpEmailsList.innerHTML = '<p>Error loading follow-up emails. Please try again later.</p>';
        }
    }

    // Handle form submission
    if (addFollowUpForm) {
        addFollowUpForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const name = document.getElementById('name').value;
            const content = document.getElementById('content').value;
            const outlet_name = outletNameChoices.getValue(true);
            const city = cityChoices.getValue(true);
            const submitButton = addFollowUpForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetch('/api/follow-up-emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, content, outlet_name: JSON.stringify(outlet_name), city: JSON.stringify(city) })
                });

                const result = await response.json();

                if (response.ok) {
                    showFlashMessage(result.message || 'Follow-up email saved successfully!', 'success');
                    addFollowUpForm.reset(); // Clear the form
                    loadFollowUpEmails(); // Refresh the list
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Save error:', error);
                showFlashMessage(`Save failed: ${error.message}`, 'danger');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save';
            }
        });
    }

    // Initial load of follow-up emails
    loadFollowUpEmails();
    loadOutlets();
    loadCities();
    loadUploads();

    uploadIdSelect.addEventListener('change', function() {
        const uploadId = this.value;
        loadOutlets(uploadId);
        loadCities(uploadId);
    });

    document.getElementById('select-all-outlets').addEventListener('click', async function() {
        const uploadId = uploadIdSelect.value;
        const url = uploadId ? `/api/outlets/all?upload_id=${uploadId}` : '/api/outlets/all';
        const response = await fetch(url);
        const outlets = await response.json();
        const selectedOutlets = outletNameChoices.getValue(true);

        if (selectedOutlets.length === outlets.length) {
            outletNameChoices.clearStore();
            this.textContent = 'Select All';
        } else {
            outletNameChoices.setValue(outlets);
            this.textContent = 'Deselect All';
        }
    });

    document.getElementById('select-all-cities').addEventListener('click', async function() {
        const uploadId = uploadIdSelect.value;
        const url = uploadId ? `/api/cities/all?upload_id=${uploadId}` : '/api/cities/all';
        const response = await fetch(url);
        const cities = await response.json();
        const selectedCities = cityChoices.getValue(true);

        if (selectedCities.length === cities.length) {
            cityChoices.clearStore();
            this.textContent = 'Select All';
        } else {
            cityChoices.setValue(cities);
            this.textContent = 'Deselect All';
        }
    });

    document.getElementById('edit-select-all-outlets').addEventListener('click', async function() {
        const uploadId = uploadIdSelect.value;
        const url = uploadId ? `/api/outlets/all?upload_id=${uploadId}` : '/api/outlets/all';
        const response = await fetch(url);
        const outlets = await response.json();
        const selectedOutlets = editOutletNameChoices.getValue(true);

        if (selectedOutlets.length === outlets.length) {
            editOutletNameChoices.clearStore();
            this.textContent = 'Select All';
        } else {
            editOutletNameChoices.setValue(outlets);
            this.textContent = 'Deselect All';
        }
    });

    document.getElementById('edit-select-all-cities').addEventListener('click', async function() {
        const uploadId = uploadIdSelect.value;
        const url = uploadId ? `/api/cities/all?upload_id=${uploadId}` : '/api/cities/all';
        const response = await fetch(url);
        const cities = await response.json();
        const selectedCities = editCityChoices.getValue(true);

        if (selectedCities.length === cities.length) {
            editCityChoices.clearStore();
            this.textContent = 'Select All';
        } else {
            editCityChoices.setValue(cities);
            this.textContent = 'Deselect All';
        }
    });

    outletNameSelect.addEventListener('search', async function(event) {
        const search = event.detail.value;
        const uploadId = uploadIdSelect.value;
        if (search) {
            const url = `/api/search/outletName?q=${search}&upload_id=${uploadId}`;
            const response = await fetch(url);
            const data = await response.json();
            const choices = data.map(item => ({ value: item, label: item }));
            outletNameChoices.clearChoices();
            outletNameChoices.setChoices(choices, 'value', 'label', false);
        }
    });

    citySelect.addEventListener('search', async function(event) {
        const search = event.detail.value;
        const uploadId = uploadIdSelect.value;
        if (search) {
            const url = `/api/search/City?q=${search}&upload_id=${uploadId}`;
            const response = await fetch(url);
            const data = await response.json();
            const choices = data.map(item => ({ value: item, label: item }));
            cityChoices.clearChoices();
            cityChoices.setChoices(choices, 'value', 'label', false);
        }
    });

    editOutletNameSelect.addEventListener('search', async function(event) {
        const search = event.detail.value;
        const uploadId = uploadIdSelect.value;
        if (search) {
            const url = `/api/search/outletName?q=${search}&upload_id=${uploadId}`;
            const response = await fetch(url);
            const data = await response.json();
            const choices = data.map(item => ({ value: item, label: item }));
            editOutletNameChoices.clearChoices();
            editOutletNameChoices.setChoices(choices, 'value', 'label', false);
        }
    });

    editCitySelect.addEventListener('search', async function(event) {
        const search = event.detail.value;
        const uploadId = uploadIdSelect.value;
        if (search) {
            const url = `/api/search/City?q=${search}&upload_id=${uploadId}`;
            const response = await fetch(url);
            const data = await response.json();
            const choices = data.map(item => ({ value: item, label: item }));
            editCityChoices.clearChoices();
            editCityChoices.setChoices(choices, 'value', 'label', false);
        }
    });

    document.getElementById('show-more-outlets').addEventListener('click', function() {
        const container = this.previousElementSibling;
        container.classList.toggle('expanded');
        this.textContent = container.classList.contains('expanded') ? 'Show Less' : 'Show More';
    });

    document.getElementById('show-more-cities').addEventListener('click', function() {
        const container = this.previousElementSibling;
        container.classList.toggle('expanded');
        this.textContent = container.classList.contains('expanded') ? 'Show Less' : 'Show More';
    });

    document.getElementById('edit-show-more-outlets').addEventListener('click', function() {
        const container = this.previousElementSibling;
        container.classList.toggle('expanded');
        this.textContent = container.classList.contains('expanded') ? 'Show Less' : 'Show More';
    });

    document.getElementById('edit-show-more-cities').addEventListener('click', function() {
        const container = this.previousElementSibling;
        container.classList.toggle('expanded');
        this.textContent = container.classList.contains('expanded') ? 'Show Less' : 'Show More';
    });

    document.getElementById('search-selected-outlets').addEventListener('input', function() {
        const search = this.value.toLowerCase();
        const choices = outletNameChoices.choiceList.element.querySelectorAll('.choices__item');
        choices.forEach(choice => {
            const text = choice.textContent.toLowerCase();
            if (text.includes(search)) {
                choice.style.display = 'block';
            } else {
                choice.style.display = 'none';
            }
        });
    });

    document.getElementById('search-selected-cities').addEventListener('input', function() {
        const search = this.value.toLowerCase();
        const choices = cityChoices.choiceList.element.querySelectorAll('.choices__item');
        choices.forEach(choice => {
            const text = choice.textContent.toLowerCase();
            if (text.includes(search)) {
                choice.style.display = 'block';
            } else {
                choice.style.display = 'none';
            }
        });
    });

    document.getElementById('edit-search-selected-outlets').addEventListener('input', function() {
        const search = this.value.toLowerCase();
        const choices = editOutletNameChoices.choiceList.element.querySelectorAll('.choices__item');
        choices.forEach(choice => {
            const text = choice.textContent.toLowerCase();
            if (text.includes(search)) {
                choice.style.display = 'block';
            } else {
                choice.style.display = 'none';
            }
        });
    });

    document.getElementById('edit-search-selected-cities').addEventListener('input', function() {
        const search = this.value.toLowerCase();
        const choices = editCityChoices.choiceList.element.querySelectorAll('.choices__item');
        choices.forEach(choice => {
            const text = choice.textContent.toLowerCase();
            if (text.includes(search)) {
                choice.style.display = 'block';
            } else {
                choice.style.display = 'none';
            }
        });
    });

    const modal = document.getElementById('edit-modal');
    const closeButtons = modal.querySelectorAll('.close-btn');
    const editForm = document.getElementById('edit-form');

    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    });


    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    editForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const id = document.getElementById('edit-id').value;
        const name = document.getElementById('edit-name').value;
        const content = document.getElementById('edit-content').value;
        const outlet_name = editOutletNameChoices.getValue(true);
        const city = editCityChoices.getValue(true);

        try {
            const response = await fetch(`/api/follow-up-email/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, content, outlet_name: JSON.stringify(outlet_name), city: JSON.stringify(city) })
            });

            const result = await response.json();

            if (response.ok) {
                showFlashMessage(result.message || 'Follow-up email updated successfully!', 'success');
                modal.style.display = 'none';
                loadFollowUpEmails(); // Refresh the list
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Update error:', error);
            showFlashMessage(`Update failed: ${error.message}`, 'danger');
        }
    });

    // Event delegation for view and delete buttons
    followUpEmailsList.addEventListener('click', function(event) {
        const target = event.target;
        const expandBtn = target.closest('.expand-btn');

        if (expandBtn) {
            const row = expandBtn.closest('.main-row');
            const expandableRow = row.nextElementSibling;
            const icon = expandBtn.querySelector('i');

            if (expandableRow.style.display === 'none') {
                expandableRow.style.display = 'table-row';
                icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
            } else {
                expandableRow.style.display = 'none';
                icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
            }
        }

        if (target.classList.contains('btn-delete')) {
            const emailId = target.dataset.id;
            deleteFollowUpEmail(emailId);
        }
        if (target.classList.contains('btn-edit')) {
            const emailId = target.dataset.id;
            viewFollowUpEmail(emailId);
        }
    });

    async function viewFollowUpEmail(id) {
        try {
            const response = await fetch(`/api/follow-up-email/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const email = await response.json();

            const modal = document.getElementById('edit-modal');
            modal.querySelector('#edit-id').value = email.id;
            modal.querySelector('#edit-name').value = email.name;
            modal.querySelector('#edit-content').value = email.content;

            if (email.outlet_name) {
                editOutletNameChoices.setValue(JSON.parse(email.outlet_name));
            }
            if (email.city) {
                editCityChoices.setValue(JSON.parse(email.city));
            }

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error fetching follow-up email:', error);
            showFlashMessage('Could not fetch follow-up email details.', 'danger');
        }
    }

    async function deleteFollowUpEmail(id) {
        if (confirm(`Are you sure you want to delete this follow-up email?`)) {
            try {
                const response = await fetch(`/api/follow-up-email/${id}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (response.ok) {
                    showFlashMessage(result.message || 'Follow-up email deleted successfully!', 'success');
                    loadFollowUpEmails(); // Refresh the list
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showFlashMessage(`Delete failed: ${error.message}`, 'danger');
            }
        }
    }

    // Helper function to escape HTML to prevent XSS
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }
});
