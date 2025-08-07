document.addEventListener('DOMContentLoaded', function() {
    const uploadId = window.location.pathname.split('/').pop();
    const uploadNameSpan = document.getElementById('upload-name');
    const uploadDataContainer = document.getElementById('upload-data-container');

    async function loadUploadData() {
        try {
            const response = await fetch(`/api/upload/${uploadId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (uploadNameSpan) {
                uploadNameSpan.textContent = data.upload_name;
            }

            if (data.records.length === 0) {
                uploadDataContainer.innerHTML = '<p>No data found for this upload.</p>';
                return;
            }

            let tableHtml = '<table class="companies-table"><thead><tr><th>Name</th><th>Outlet</th><th>Email</th><th>Phone</th></tr></thead><tbody>';
            data.records.forEach(record => {
                tableHtml += `
                    <tr>
                        <td>${escapeHTML(record.name)}</td>
                        <td>${escapeHTML(record.outletName)}</td>
                        <td>${escapeHTML(record.Email)}</td>
                        <td>${escapeHTML(record.phone)}</td>
                    </tr>
                `;
            });
            tableHtml += '</tbody></table>';
            uploadDataContainer.innerHTML = tableHtml;

        } catch (error) {
            console.error('Error loading upload data:', error);
            uploadDataContainer.innerHTML = '<p class="alert alert-danger">Error loading data. Please try again later.</p>';
        }
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    }

    loadUploadData();
});
