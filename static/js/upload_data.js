document.addEventListener('DOMContentLoaded', function() {
    const uploadId = window.location.pathname.split('/').pop();
    const uploadNameSpan = document.getElementById('upload-name');
    const uploadDataContainer = document.getElementById('upload-data-container');

    async function loadUploadData() {
        try {
            const uploadResponse = await fetch(`/api/upload/${uploadId}`);
            if (!uploadResponse.ok) {
                throw new Error(`HTTP error! status: ${uploadResponse.status}`);
            }
            const uploadData = await uploadResponse.json();

            if (uploadNameSpan) {
                uploadNameSpan.textContent = uploadData.upload_name;
            }

            if (uploadData.records.length === 0) {
                uploadDataContainer.innerHTML = '<p>No data found for this upload.</p>';
                return;
            }

            const schemaResponse = await fetch(`/api/table/${uploadData.table_name}/schema`);
            if (!schemaResponse.ok) {
                throw new Error(`HTTP error! status: ${schemaResponse.status}`);
            }
            const schemaData = await schemaResponse.json();
            const headers = schemaData.columns;

            let tableHtml = '<table class="companies-table"><thead><tr>';
            headers.forEach(header => {
                tableHtml += `<th>${escapeHTML(header)}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';

            uploadData.records.forEach(record => {
                tableHtml += '<tr>';
                headers.forEach(header => {
                    tableHtml += `<td>${escapeHTML(record[header])}</td>`;
                });
                tableHtml += '</tr>';
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
