document.addEventListener('DOMContentLoaded', function() {
    const addFollowUpForm = document.getElementById('add-follow-up-form');
    const followUpEmailsList = document.getElementById('follow-up-emails-list');

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
                        <th>Name</th>
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
                    <td><pre class="template-content">${escapeHTML(email.content.substring(0, 150))}${email.content.length > 150 ? '...' : ''}</pre></td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="viewFollowUpEmail(${email.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFollowUpEmail(${email.id})">Delete</button>
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
            const submitButton = addFollowUpForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetch('/api/follow-up-emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, content })
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

        try {
            const response = await fetch(`/api/follow-up-email/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, content })
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
});

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

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching follow-up email:', error);
        showFlashMessage('Could not fetch follow-up email details.', 'danger');
    }
}


async function deleteFollowUpEmail(id) {
    if (confirm(`Are you sure you want to delete this follow-up email?`)) {
        try {
            const response = await await fetch(`/api/follow-up-email/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if(response.ok) {
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
