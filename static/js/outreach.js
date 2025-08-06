document.addEventListener('DOMContentLoaded', function() {
    const staffListContainer = document.getElementById('staff-list-container');
    const addStaffContainer = document.getElementById('add-staff-container');
    const addStaffForm = document.getElementById('add-staff-form');
    const outletSelectionContainer = document.getElementById('outlet-selection-container');
    const outletListContainer = document.getElementById('outlet-list-container');
    const confirmOutreachBtn = document.getElementById('confirm-outreach-btn');

    let selectedStaff = null;

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
                    staffListHTML += `<li data-staff-id="${member.id}" data-staff-name="${member.staff_name}" data-staff-email="${member.staff_email}" class="staff-member">${member.staff_name} (${member.staff_email})</li>`;
                });
                staffListHTML += '</ul>';
                staffListContainer.innerHTML = staffListHTML;
                addStaffContainer.style.display = 'none';

                document.querySelectorAll('.staff-member').forEach(item => {
                    item.addEventListener('click', function() {
                        selectedStaff = {
                            id: this.dataset.staffId,
                            name: this.dataset.staffName,
                            email: this.dataset.staffEmail,
                        };
                        document.querySelectorAll('.staff-member').forEach(el => el.classList.remove('active'));
                        this.classList.add('active');
                        outletSelectionContainer.style.display = 'block';
                        loadOutlets();
                    });
                });
            }
        } catch (error) {
            console.error('Error loading staff:', error);
            staffListContainer.innerHTML = '<p>Error loading staff. Please try again later.</p>';
        }
    }

    async function loadOutlets() {
        try {
            const response = await fetch('/api/outlets/all');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const outlets = await response.json();
            let outletListHTML = '';
            outlets.forEach(outlet => {
                outletListHTML += `
                    <div class="multi-select-item">
                        <input type="checkbox" id="outlet-${outlet}" name="outlets" value="${outlet}">
                        <label for="outlet-${outlet}">${outlet}</label>
                    </div>
                `;
            });
            outletListContainer.innerHTML = outletListHTML;

            document.querySelectorAll('input[name="outlets"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const anyCheckboxChecked = Array.from(document.querySelectorAll('input[name="outlets"]')).some(i => i.checked);
                    confirmOutreachBtn.disabled = !anyCheckboxChecked;
                });
            });

        } catch (error) {
            console.error('Error loading outlets:', error);
            outletListContainer.innerHTML = '<p>Error loading outlets. Please try again later.</p>';
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

    confirmOutreachBtn.addEventListener('click', async function() {
        const selectedOutlets = Array.from(document.querySelectorAll('input[name="outlets"]:checked')).map(cb => cb.value);
        const templateId = window.location.pathname.split('/').pop();

        if (!selectedStaff || selectedOutlets.length === 0) {
            alert('Please select a staff member and at least one outlet.');
            return;
        }

        try {
            const response = await fetch('/api/outreach/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    template_id: templateId,
                    staff_member: selectedStaff,
                    outlet_names: selectedOutlets,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Outreach data sent successfully!');
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Error sending outreach data:', error);
            alert(`Failed to send outreach data: ${error.message}`);
        }
    });

    loadStaff();
});
