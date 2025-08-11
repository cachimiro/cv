document.addEventListener('DOMContentLoaded', function() {
    const uploadId = window.location.pathname.split('/').pop();
    const uploadNameSpan = document.getElementById('upload-name');
    const uploadDataContainer = document.getElementById('upload-data-container');

    function getResponseClass(response) {
        if (!response) return '';
        const lowerCaseResponse = response.toLowerCase();
        if (lowerCaseResponse === 'yes') {
            return 'response-yes';
        } else if (lowerCaseResponse === 'no') {
            return 'response-no';
        } else if (lowerCaseResponse === 'out of office') {
            return 'response-ooo';
        } else if (lowerCaseResponse === 'not valid') {
            return 'response-not-valid';
        } else if (lowerCaseResponse === 'not interested') {
            return 'response-not-interested';
        }
        return '';
    }

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
                    if (header === 'response') {
                        tableHtml += `<td class="response-cell"><span class="response-badge ${getResponseClass(record[header])}">${escapeHTML(record[header])}</span></td>`;
                    } else {
                        tableHtml += `<td>${escapeHTML(record[header])}</td>`;
                    }
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
