document.addEventListener('DOMContentLoaded', function() {
    const f = document.getElementById('report-form');
    if (!f) return; // Don't run this script if the form isn't on the page

    const btn = document.getElementById('submit-btn');

    const validateForm = () => {
        return f.link.checkValidity() && f.article.value.trim() && f.date.value;
    };

    f.addEventListener('input', () => {
        btn.disabled = !validateForm();
    });

    f.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        try {
            const res = await fetch('/api/coverage-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    link: f.link.value.trim(),
                    article: f.article.value.trim(),
                    date_of_publish: f.date.value
                })
            });
            if (!res.ok) throw new Error('Request failed');
            const result = await res.json();
            showFlashMessage(result.message || 'Coverage report saved successfully!', 'success');
            f.reset();
            btn.disabled = true;
            location.reload();
        } catch (err) {
            showFlashMessage('Error saving coverage report.', 'danger');
            btn.disabled = false;
        }
    });

    async function loadCoverageReports() {
        const tableArea = document.getElementById('table-area');
        if (!tableArea) return;

        try {
            const response = await fetch('/api/coverage-reports');
            if (!response.ok) throw new Error('Could not fetch coverage reports');
            const reports = await response.json();

            if (reports.length === 0) {
                tableArea.innerHTML = '<div class="empty-state"><p>No coverage reports yet. Add one to get started.</p></div>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Link</th>
                        <th>Article</th>
                        <th>Published On</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            reports.forEach(r => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td><a href="${r.link}" target="_blank" rel="noopener">${escapeHTML(r.link)}</a></td>
                    <td>${escapeHTML(r.article)}</td>
                    <td>${r.date_of_publish}</td>
                    <td class="action-buttons text-right">
                        <button class="btn btn-secondary btn-sm edit-report-btn" data-id="${r.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-report-btn" data-id="${r.id}">Delete</button>
                    </td>
                `;
            });
            tableArea.innerHTML = '';
            tableArea.appendChild(table);

            // Add event listeners for the new buttons
            table.querySelectorAll('.edit-report-btn').forEach(btn => {
                btn.addEventListener('click', handleEditCoverageReport);
            });
            table.querySelectorAll('.delete-report-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteCoverageReport);
            });
        } catch (error) {
            tableArea.innerHTML = '<div class="empty-state"><p>Error loading coverage reports.</p></div>';
        }
    }

    function handleEditCoverageReport(event) {
        const reportId = event.target.dataset.id;
        const modal = document.getElementById('edit-report-modal');
        const form = document.getElementById('edit-report-form');
        const reportIdField = document.getElementById('edit-report-id');
        const linkField = document.getElementById('edit-link');
        const articleField = document.getElementById('edit-article');
        const dateField = document.getElementById('edit-date');

        fetch(`/api/coverage-reports/${reportId}`)
            .then(response => response.json())
            .then(report => {
                reportIdField.value = report.id;
                linkField.value = report.link;
                articleField.value = report.article;
                dateField.value = report.date_of_publish;
                modal.style.display = 'block';
            })
            .catch(error => showFlashMessage('Could not load coverage report data.', 'danger'));

        const closeModal = () => modal.style.display = 'none';
        document.getElementById('close-edit-modal').onclick = closeModal;
        document.getElementById('cancel-edit-btn').onclick = closeModal;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const updatedReport = {
                link: linkField.value,
                article: articleField.value,
                date_of_publish: dateField.value
            };

            try {
                const response = await fetch(`/api/coverage-reports/${reportId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedReport)
                });
                if (!response.ok) throw new Error('Failed to save changes.');
                const result = await response.json();
                showFlashMessage(result.message || 'Coverage report updated successfully!', 'success');
                closeModal();
                location.reload();
            } catch (error) {
                showFlashMessage(`Error: ${error.message}`, 'danger');
            }
        };
    }

    function handleDeleteCoverageReport(event) {
        const reportId = event.target.dataset.id;
        if (confirm('Are you sure you want to delete this coverage report?')) {
            fetch(`/api/coverage-reports/${reportId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to delete coverage report.');
                    return response.json();
                })
                .then(result => {
                    showFlashMessage(result.message || 'Coverage report deleted.', 'success');
                    location.reload();
                })
                .catch(error => showFlashMessage(`Error: ${error.message}`, 'danger'));
        }
    }

    // Initial loading
    loadCoverageReports();
});

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}
