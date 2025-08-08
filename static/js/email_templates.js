document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const templatesList = document.getElementById('templates-list');
    const fileInput = document.getElementById('file');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadBtn = document.getElementById('upload-btn');

    if (fileInput && fileNameDisplay && uploadBtn) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileNameDisplay.textContent = fileInput.files[0].name;
                uploadBtn.disabled = false;
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                uploadBtn.disabled = true;
            }
        });
    }

    async function loadTemplates() {
        try {
            const response = await fetch('/api/email-templates');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const templates = await response.json();

            templatesList.innerHTML = '';
            if (templates.length === 0) {
                templatesList.innerHTML = '<div class="empty-state"><p>No templates found. Upload one to get started.</p></div>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="width: 40%;">Name</th>
                        <th>Content Preview</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            templates.forEach(template => {
                const fileExt = template.name.split('.').pop().toLowerCase();
                let fileIcon = 'bi-file-earmark-text-fill';
                if (fileExt === 'pdf') fileIcon = 'bi-file-earmark-pdf-fill';
                else if (fileExt === 'docx' || fileExt === 'doc') fileIcon = 'bi-file-earmark-word-fill';

                const row = tbody.insertRow();
                row.innerHTML = `
                    <td class="template-name-cell" title="${escapeHTML(template.name)}">
                        <i class="bi ${fileIcon}"></i>
                        <span>${escapeHTML(template.name)}</span>
                    </td>
                    <td><pre class="template-content">${escapeHTML(template.content.substring(0, 100))}${template.content.length > 100 ? '...' : ''}</pre></td>
                    <td class="action-buttons text-right">
                        <button class="btn btn-secondary btn-sm" onclick="viewTemplate(${template.id})">View</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTemplate(${template.id})">Delete</button>
                        <a href="/outreach/${template.id}" class="btn btn-primary btn-sm">Outreach</a>
                    </td>
                `;
            });
            templatesList.appendChild(table);
        } catch (error) {
            console.error('Error loading templates:', error);
            templatesList.innerHTML = '<div class="empty-state"><p>Error loading templates.</p></div>';
        }
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(uploadForm);

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="btn-spinner"></span> Uploading...';

            try {
                const response = await fetch('/api/upload-template', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showFlashMessage(result.message || 'Upload successful!', 'success');
                    uploadForm.reset(); // Clear the form
                    loadTemplates(); // Refresh the list
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showFlashMessage(`Upload failed: ${error.message}`, 'danger');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload';
            }
        });
    }

    // Initial load of templates
    loadTemplates();

    const modal = document.getElementById('edit-modal');
    const closeButton = modal.querySelector('.close-btn');
    const editForm = document.getElementById('edit-form');

    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
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
        const iframe = document.getElementById('html-content-iframe');
        const content = iframe.contentDocument.body.innerHTML;
        const imageInput = document.getElementById('replace-image-input');
        const imageFile = imageInput.files[0];

        const formData = new FormData();
        formData.append('name', name);
        formData.append('content', content);
        formData.append('html_content', content);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const response = await fetch(`/api/email-template/${id}`, {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showFlashMessage(result.message || 'Template updated successfully!', 'success');
                modal.style.display = 'none';
                loadTemplates(); // Refresh the list
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Update error:', error);
            showFlashMessage(`Update failed: ${error.message}`, 'danger');
        }
    });

    const previewButton = document.getElementById('preview-btn');
    previewButton.addEventListener('click', function() {
        const htmlContent = document.getElementById('html-content-iframe').srcdoc;
        const previewWindow = window.open();
        previewWindow.document.write(htmlContent);
        previewWindow.document.close();
    });

    const replaceImageButton = document.getElementById('replace-image-btn');
    const replaceImageInput = document.getElementById('replace-image-input');
    const viewImage = document.getElementById('view-image');

    replaceImageButton.addEventListener('click', function() {
        replaceImageInput.click();
    });

    replaceImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                viewImage.src = e.target.result;
                viewImage.style.display = 'block';

                const iframe = document.getElementById('html-content-iframe');
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const img = iframeDoc.querySelector('img');
                if (img) {
                    img.src = e.target.result;
                }
            }
            reader.readAsDataURL(file);
        }
    });

    function resizeIframe() {
        const iframe = document.getElementById('html-content-iframe');
        const container = document.getElementById('html-content-container');
        iframe.style.height = container.clientHeight + 'px';
    }

    window.addEventListener('resize', resizeIframe);
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

        const iframe = document.getElementById('html-content-iframe');
        const responsiveStyle = `
            <style>
                body { font-family: sans-serif; word-wrap: break-word; }
                img { max-width: 100%; height: auto; }
            </style>
        `;
        iframe.srcdoc = responsiveStyle + template.html_content;
        iframe.onload = function() {
            // Make the iframe content editable
            iframe.contentDocument.body.contentEditable = true;
            iframe.contentDocument.designMode = 'on';
        };

        const imageView = modal.querySelector('#view-image');
        if (template.image) {
            imageView.src = `data:image/png;base64,${template.image}`;
            imageView.style.display = 'block';
        } else {
            imageView.style.display = 'none';
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching template:', error);
        showFlashMessage('Could not fetch template details.', 'danger');
    }
}


function deleteTemplate(id) {
    if (confirm(`Are you sure you want to delete template ID: ${id}?`)) {
        alert(`Deleting template ID: ${id}`);
        // Future implementation: send a DELETE request to an API endpoint
    }
}
