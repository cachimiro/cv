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
            const res = await fetch('/api/published-reports', {
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
            showFlashMessage(result.message || 'Report saved successfully!', 'success');
            f.reset();
            btn.disabled = true;
            loadReports();
        } catch (err) {
            showFlashMessage('Error saving report.', 'danger');
            btn.disabled = false;
        }
    });

    async function loadReports() {
        const tableArea = document.getElementById('table-area');
        try {
            const response = await fetch('/api/published-reports');
            if (!response.ok) throw new Error('Could not fetch reports');
            const reports = await response.json();

            if (reports.length === 0) {
                tableArea.innerHTML = '<div class="empty-state"><p>No reports yet. Add one to get started.</p></div>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'companies-table';
            let rows = reports.map(r => `
                <tr>
                    <td><a href="${r.link}" target="_blank" rel="noopener">${escapeHTML(r.link)}</a></td>
                    <td>${escapeHTML(r.article)}</td>
                    <td class="text-right">${r.date_of_publish}</td>
                </tr>
            `).join('');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Link</th>
                        <th>Article</th>
                        <th class="text-right">Published On</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            `;
            tableArea.innerHTML = '';
            tableArea.appendChild(table);
        } catch (error) {
            tableArea.innerHTML = '<div class="empty-state"><p>Error loading reports.</p></div>';
        }
    }

    // Initial and periodic loading
    loadReports();
    setInterval(loadReports, 10000); // Check for new reports every 10 seconds
});

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}
