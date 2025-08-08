document.addEventListener('DOMContentLoaded', function() {
    const addFollowUpForm = document.getElementById('add-follow-up-form');
    const followUpEmailsList = document.getElementById('follow-up-emails-list');
    const outletNameSelect = document.getElementById('outlet_name');
    const citySelect = document.getElementById('city');
    const editOutletNameSelect = document.getElementById('edit-outlet_name');
    const editCitySelect = document.getElementById('edit-city');

    // Function to populate a select element
    function populateSelect(selectElement, items, defaultOptionText) {
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }

    // Function to fetch and populate outlets
    async function loadOutlets() {
        try {
            const response = await fetch('/api/outlets/all');
            if (!response.ok) throw new Error('Failed to fetch outlets');
            const outlets = await response.json();
            populateSelect(outletNameSelect, outlets, 'Select an outlet');
            populateSelect(editOutletNameSelect, outlets, 'Select an outlet');
        } catch (error) {
            console.error('Error loading outlets:', error);
        }
    }

    // Function to fetch and populate cities
    async function loadCities() {
        try {
            const response = await fetch('/api/cities/all');
            if (!response.ok) throw new Error('Failed to fetch cities');
            const cities = await response.json();
            populateSelect(citySelect, cities, 'Select a city');
            populateSelect(editCitySelect, cities, 'Select a city');
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
                row.innerHTML = `
                    <td>${escapeHTML(email.name)}</td>
                    <td>${escapeHTML(email.outlet_name || '')}</td>
                    <td>${escapeHTML(email.city || '')}</td>
                    <td><pre class="template-content">${escapeHTML(email.content.substring(0, 100))}${email.content.length > 100 ? '...' : ''}</pre></td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm btn-edit" data-id="${email.id}">Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete" data-id="${email.id}">Delete</button>
                    </td>
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
            const outlet_name = document.getElementById('outlet_name').value;
            const city = document.getElementById('city').value;
            const submitButton = addFollowUpForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetch('/api/follow-up-emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, content, outlet_name, city })
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
        const outlet_name = document.getElementById('edit-outlet_name').value;
        const city = document.getElementById('edit-city').value;

        try {
            const response = await fetch(`/api/follow-up-email/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, content, outlet_name, city })
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
            modal.querySelector('#edit-outlet_name').value = email.outlet_name || '';
            modal.querySelector('#edit-city').value = email.city || '';

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
