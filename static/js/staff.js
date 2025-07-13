document.addEventListener('DOMContentLoaded', function() {
    const addStaffForm = document.getElementById('addStaffForm');
    const staffListDiv = document.getElementById('staffList');
    const staffNameInput = document.getElementById('staffName');
    const staffEmailInput = document.getElementById('staffEmail');
    const API_BASE_URL = '/api';

    async function fetchStaff() {
        try {
            const response = await fetch(`${API_BASE_URL}/staff`);
            if (!response.ok) {
                throw new Error('Failed to fetch staff list.');
            }
            const staffList = await response.json();
            renderStaff(staffList);
        } catch (error) {
            console.error('Error fetching staff:', error);
            if (staffListDiv) staffListDiv.innerHTML = '<p class="alert alert-danger">Could not load staff list.</p>';
        }
    }

    function renderStaff(staffList) {
        if (!staffListDiv) return;

        if (staffList.length === 0) {
            staffListDiv.innerHTML = '<p>No staff members found. Add one using the form.</p>';
            return;
        }

        let tableHtml = `
            <table class="companies-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        staffList.forEach(staff => {
            tableHtml += `
                <tr>
                    <td>${escapeHTML(staff.staff_name)}</td>
                    <td>${escapeHTML(staff.staff_email)}</td>
                    <td class="action-buttons">
                        <button class="btn btn-danger btn-sm delete-staff-btn" data-id="${staff.id}" title="Delete">&#128465;</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table>';
        staffListDiv.innerHTML = tableHtml;

        // Add event listeners for new delete buttons
        document.querySelectorAll('.delete-staff-btn').forEach(button => {
            button.addEventListener('click', handleDeleteStaff);
        });
    }

    async function handleAddStaff(event) {
        event.preventDefault();
        const name = staffNameInput.value.trim();
        const email = staffEmailInput.value.trim();

        if (!name || !email) {
            alert('Please provide both name and email.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/staff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ staff_name: name, staff_email: email })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to add staff member.');
            }

            // alert('Staff member added successfully!'); // Or use a more subtle notification
            addStaffForm.reset(); // Clear the form
            fetchStaff(); // Refresh the list
        } catch (error) {
            console.error('Error adding staff:', error);
            alert(`Error: ${error.message}`);
        }
    }

    async function handleDeleteStaff(event) {
        const staffId = event.target.dataset.id;
        const staffRow = event.target.closest('tr');
        const staffName = staffRow.querySelector('td').textContent;

        if (confirm(`Are you sure you want to delete ${staffName}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/staff/${staffId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to delete staff member.');
                }

                // alert('Staff member deleted.');
                fetchStaff(); // Refresh the list
            } catch (error) {
                console.error('Error deleting staff:', error);
                alert(`Error: ${error.message}`);
            }
        }
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) {
            return '';
        }
        return String(str).replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    if (addStaffForm) {
        addStaffForm.addEventListener('submit', handleAddStaff);
    }

    // Initial load
    fetchStaff();
});
