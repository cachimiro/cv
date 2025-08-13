document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const templatesList = document.getElementById('press-releases-list');
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

    async function loadPressReleases(query = '') {
        try {
            const response = await fetch('/api/press-releases');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            let press_releases = await response.json();

            if (query) {
                press_releases = press_releases.filter(press_release => press_release.name.toLowerCase().includes(query.toLowerCase()));
            }

            renderPressReleases(press_releases);
        } catch (error) {
            console.error('Error loading press releases:', error);
            templatesList.innerHTML = '<div class="empty-state"><p>Error loading press releases.</p></div>';
        }
    }

    function renderPressReleases(press_releases) {
        templatesList.innerHTML = '';
        if (press_releases.length === 0) {
            templatesList.innerHTML = '<div class="empty-state"><i class="bi bi-file-earmark-x-fill"></i><p>No press releases found. Upload one to get started.</p></div>';
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
        press_releases.forEach(press_release => {
            const fileExt = press_release.name.split('.').pop().toLowerCase();
            let fileIcon = 'bi-file-earmark-text-fill';
            if (fileExt === 'pdf') fileIcon = 'bi-file-earmark-pdf-fill';
            else if (fileExt === 'docx' || fileExt === 'doc') fileIcon = 'bi-file-earmark-word-fill';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="template-name-cell" title="${escapeHTML(press_release.name)}">
                    <i class="bi ${fileIcon}"></i>
                    <span>${escapeHTML(press_release.name)}</span>
                </td>
                <td><pre class="template-content">${escapeHTML(press_release.content.substring(0, 100))}${press_release.content.length > 100 ? '...' : ''}</pre></td>
                <td class="action-buttons text-right">
                    <button class="btn btn-secondary btn-sm" onclick="viewPressRelease(${press_release.id})"><i class="bi bi-eye-fill"></i> View</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePressRelease(${press_release.id})"><i class="bi bi-trash-fill"></i> Delete</button>
                    <a href="/outreach/${press_release.id}/subject" class="btn btn-primary btn-sm">Outreach</a>
                </td>
            `;
        });
        templatesList.appendChild(table);
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(uploadForm);

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="btn-spinner"></span> Uploading...';

            try {
                const response = await fetch('/api/upload-press-release', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showFlashMessage(result.message || 'Upload successful!', 'success');
                    uploadForm.reset();
                    fileNameDisplay.textContent = 'No file chosen';
                    uploadBtn.innerHTML = '<i class="bi bi-upload"></i><span>Upload</span>';
                    loadPressReleases();
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showFlashMessage(`Upload failed: ${error.message}`, 'danger');
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="bi bi-upload"></i><span>Upload</span>';
            }
        });
    }

    // Initial load of press releases
    loadPressReleases();

    const searchInput = document.getElementById('press-release-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            loadPressReleases(searchInput.value);
        });
    }

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
            const response = await fetch(`/api/press-release/${id}`, {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showFlashMessage(result.message || 'Press release updated successfully!', 'success');
                modal.style.display = 'none';
                loadPressReleases(); // Refresh the list
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
    if (str === null || str === undefined) return '';
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

async function viewPressRelease(id) {
    try {
        const response = await fetch(`/api/press-release/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const press_release = await response.json();

        const modal = document.getElementById('edit-modal');
        modal.querySelector('#edit-id').value = press_release.id;
        modal.querySelector('#edit-name').value = press_release.name;
        modal.querySelector('#edit-content').value = press_release.content;

        const iframe = document.getElementById('html-content-iframe');
        const responsiveStyle = `
            <style>
                body { font-family: sans-serif; word-wrap: break-word; }
                img { max-width: 100%; height: auto; }
            </style>
        `;
        iframe.srcdoc = responsiveStyle + press_release.html_content;
        iframe.onload = function() {
            // Make the iframe content editable
            iframe.contentDocument.body.contentEditable = true;
            iframe.contentDocument.designMode = 'on';
        };

        const imageView = modal.querySelector('#view-image');
        if (press_release.image) {
            imageView.src = `data:image/png;base64,${press_release.image}`;
            imageView.style.display = 'block';
        } else {
            imageView.style.display = 'none';
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching press release:', error);
        showFlashMessage('Could not fetch press release details.', 'danger');
    }
}


function deletePressRelease(id) {
    if (confirm(`Are you sure you want to delete press release ID: ${id}?`)) {
        fetch(`/api/press-release/${id}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete press release.');
                }
                return response.json();
            })
            .then(result => {
                showFlashMessage(result.message || 'Press release deleted successfully.', 'success');
                loadPressReleases();
            })
            .catch(error => {
                showFlashMessage(`Error: ${error.message}`, 'danger');
            });
    }
}
