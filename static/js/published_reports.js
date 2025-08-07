document.addEventListener('DOMContentLoaded', function() {
    const addReportForm = document.getElementById('add-report-form');
    const reportsList = document.getElementById('reports-list');

    // Function to fetch and display reports
    async function loadReports() {
        try {
            const response = await fetch('/api/published-reports');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const reports = await response.json();

            reportsList.innerHTML = ''; // Clear current list
            if (reports.length === 0) {
                reportsList.innerHTML = '<p>No published reports found.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table'; // Use existing table style
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Link</th>
                        <th>Article</th>
                        <th>Date of Publish</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');
            reports.forEach(report => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td><a href="${escapeHTML(report.link)}" target="_blank">${escapeHTML(report.link)}</a></td>
                    <td>${escapeHTML(report.article)}</td>
                    <td>${escapeHTML(report.date_of_publish)}</td>
                `;
            });
            reportsList.appendChild(table);
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsList.innerHTML = '<p>Error loading reports. Please try again later.</p>';
        }
    }

    // Handle form submission
    if (addReportForm) {
        addReportForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const link = document.getElementById('link').value;
            const article = document.getElementById('article').value;
            const date_of_publish = document.getElementById('date_of_publish').value;
            const submitButton = addReportForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetch('/api/published-reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ link, article, date_of_publish })
                });

                const result = await response.json();

                if (response.ok) {
                    showFlashMessage(result.message || 'Report saved successfully!', 'success');
                    addReportForm.reset(); // Clear the form
                    loadReports(); // Refresh the list
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

    // Initial load of reports
    loadReports();

    // Helper function to escape HTML to prevent XSS
    function escapeHTML(str) {
        return str.toString().replace(/[&<>"']/g, function(match) {
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
