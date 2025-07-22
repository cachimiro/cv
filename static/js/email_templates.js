document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const templatesList = document.getElementById('templates-list');

    // Function to fetch and display templates
    async function loadTemplates() {
        try {
            const response = await fetch('/api/email-templates');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const templates = await response.json();

            templatesList.innerHTML = ''; // Clear current list
            if (templates.length === 0) {
                templatesList.innerHTML = '<p>No templates found.</p>';
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
            templates.forEach(template => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${escapeHTML(template.name)}</td>
                    <td><pre class="template-content">${escapeHTML(template.content.substring(0, 150))}${template.content.length > 150 ? '...' : ''}</pre></td>
                    <td class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="viewTemplate(${template.id})">View</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTemplate(${template.id})">Delete</button>
                    </td>
                `;
            });
            templatesList.appendChild(table);
        } catch (error) {
            console.error('Error loading templates:', error);
            templatesList.innerHTML = '<p>Error loading templates. Please try again later.</p>';
        }
    }

    // Handle form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(uploadForm);
            const fileInput = document.getElementById('file');
            const submitButton = uploadForm.querySelector('button[type="submit"]');

            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Please select a file to upload.');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Uploading...';

            try {
                const response = await fetch('/api/upload-template', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message || 'Upload successful!');
                    uploadForm.reset(); // Clear the form
                    loadTemplates(); // Refresh the list
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert(`Upload failed: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload';
            }
        });
    }

    // Initial load of templates
    loadTemplates();
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

async function viewTemplate(id) {
    try {
        const response = await fetch(`/api/email-template/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const template = await response.json();

        const modal = document.getElementById('edit-modal');
        modal.querySelector('#edit-id').value = template.id;
        modal.querySelector('#edit-name').value = template.name;
        modal.querySelector('#edit-content').value = template.content;

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching template:', error);
        alert('Could not fetch template details.');
    }
}


function deleteTemplate(id) {
    if (confirm(`Are you sure you want to delete template ID: ${id}?`)) {
        alert(`Deleting template ID: ${id}`);
        // Future implementation: send a DELETE request to an API endpoint
    }
}
