document.addEventListener('DOMContentLoaded', function() {
    const staffListContainer = document.getElementById('staff-list-container');
    const addStaffContainer = document.getElementById('add-staff-container');
    const addStaffForm = document.getElementById('add-staff-form');

    async function loadStaff() {
        try {
            const response = await fetch('/api/staff');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const staff = await response.json();

            if (staff.length === 0) {
                staffListContainer.innerHTML = '';
                addStaffContainer.style.display = 'block';
            } else {
                let staffListHTML = '<ul>';
                staff.forEach(member => {
                    staffListHTML += `<li>${member.staff_name} (${member.staff_email})</li>`;
                });
                staffListHTML += '</ul>';
                staffListContainer.innerHTML = staffListHTML;
                addStaffContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading staff:', error);
            staffListContainer.innerHTML = '<p>Error loading staff. Please try again later.</p>';
        }
    }

    addStaffForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const staffName = document.getElementById('staff-name').value;
        const staffEmail = document.getElementById('staff-email').value;

        try {
            const response = await fetch('/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    staff_name: staffName,
                    staff_email: staffEmail,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Staff member added successfully!');
                addStaffForm.reset();
                loadStaff(); // Refresh the list
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Error adding staff:', error);
            alert(`Failed to add staff member: ${error.message}`);
        }
    });

    loadStaff();
});
