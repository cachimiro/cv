document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENTS ---
    const staffListContainer = document.getElementById('staff-list-container');
    const addStaffContainer = document.getElementById('add-staff-container');
    const addStaffForm = document.getElementById('add-staff-form');
    const mediaListSelectionContainer = document.getElementById('media-list-selection-container');
    const mediaListContainer = document.getElementById('media-list-container');
    const confirmBtn = document.getElementById('confirm-outreach-btn');

    // --- STATE ---
    let selectedStaff = null;
    const state = {
        pressReleaseId: window.location.pathname.split('/').pop()
    };

    // --- Flash message function ---
    function showFlashMessage(message, category) {
        const container = document.getElementById('dynamic-flash-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `flash-message ${category}`;
        alert.textContent = message;
        container.appendChild(alert);
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    }

    // --- RENDER FUNCTIONS ---
    function renderMediaLists(lists) {
        mediaListContainer.innerHTML = ''; // Clear loading message
        if (lists.length === 0) {
            mediaListContainer.innerHTML = '<p>No media lists found. Please upload one first.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        lists.forEach(list => {
            const item = document.createElement('div');
            item.className = 'multi-select-item';
            item.innerHTML = `
                <input type="checkbox" id="list-${list.id}" name="media_lists" value="${list.id}">
                <label for="list-${list.id}">${list.name}</label>
            `;
            fragment.appendChild(item);
        });
        mediaListContainer.appendChild(fragment);

        // Add event listeners to checkboxes to enable/disable confirm button
        document.querySelectorAll('input[name="media_lists"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const anyChecked = Array.from(document.querySelectorAll('input[name="media_lists"]:checked')).length > 0;
                confirmBtn.disabled = !anyChecked;
            });
        });
    }

    // --- API CALLS ---
    async function fetchMediaLists() {
        try {
            const response = await fetch('/api/uploads');
            if (!response.ok) throw new Error('Failed to fetch media lists.');
            const lists = await response.json();
            renderMediaLists(lists);
        } catch (error) {
            console.error('Error fetching media lists:', error);
            mediaListContainer.innerHTML = '<p style="color: red;">Error loading media lists.</p>';
        }
    }

    // --- INITIALIZATION ---
    async function loadStaffAndInit() {
        try {
            const response = await fetch('/api/staff');
            if (!response.ok) throw new Error('Failed to fetch staff.');
            const staff = await response.json();

            if (staff.length === 0) {
                staffListContainer.innerHTML = '';
                addStaffContainer.style.display = 'block';

                addStaffForm.addEventListener('submit', async function onStaffSubmit(event) {
                    event.preventDefault();
                    const staffName = document.getElementById('staff-name').value;
                    const staffEmail = document.getElementById('staff-email').value;

                    try {
                        const postResponse = await fetch('/api/staff', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ staff_name: staffName, staff_email: staffEmail }),
                        });
                        const result = await postResponse.json();
                        if (!postResponse.ok) throw new Error(result.error || 'Failed to add staff.');

                        showFlashMessage('Staff member added successfully!', 'success');
                        addStaffForm.reset();
                        addStaffContainer.style.display = 'none';

                        addStaffForm.removeEventListener('submit', onStaffSubmit);
                        loadStaffAndInit();

                    } catch (error) {
                        showFlashMessage(`Error: ${error.message}`, 'danger');
                    }
                });
            } else {
                let staffListHTML = '<ul>';
                staff.forEach(member => {
                    staffListHTML += `<li data-staff-id="${member.id}" class="staff-member">${member.staff_name} (${member.staff_email})</li>`;
                });
                staffListHTML += '</ul>';
                staffListContainer.innerHTML = staffListHTML;

                document.querySelectorAll('.staff-member').forEach(item => {
                    item.addEventListener('click', function() {
                        selectedStaff = { id: this.dataset.staffId };
                        document.querySelectorAll('.staff-member').forEach(el => el.classList.remove('active'));
                        this.classList.add('active');
                        mediaListSelectionContainer.style.display = 'block';
                        fetchMediaLists();
                    });
                });
            }
        } catch (error) {
            console.error('Error loading staff:', error);
            staffListContainer.innerHTML = '<p style="color: red;">Error loading staff.</p>';
        }
    }

    // --- CONFIRM BUTTON LOGIC ---
    confirmBtn.addEventListener('click', async () => {
        const selectedListIds = Array.from(document.querySelectorAll('input[name="media_lists"]:checked')).map(cb => cb.value);
        const subject = document.getElementById('outreach-subject').value;

        if (!selectedStaff || selectedListIds.length === 0) {
            showFlashMessage('Please select a staff member and at least one media list.', 'warning');
            return;
        }

        if (!subject) {
            showFlashMessage('A subject line is required. Please go back and set one.', 'danger');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Preparing...';

        try {
            const response = await fetch('/api/outreach/prepare-follow-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    press_release_id: state.pressReleaseId,
                    staff_id: selectedStaff.id,
                    upload_ids: selectedListIds,
                    subject: subject
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to prepare follow-up.');
            }

            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                throw new Error('Could not retrieve redirect URL.');
            }

        } catch (error) {
            showFlashMessage(`Error: ${error.message}`, 'danger');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Next: Create Follow-up';
        }
    });

    loadStaffAndInit();
});
