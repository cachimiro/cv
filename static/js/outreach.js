document.addEventListener('DOMContentLoaded', function() {
    // --- STATE MANAGEMENT ---
    const state = {
        currentPage: 1,
        pageSize: 50,
        searchQuery: '',
        totalContacts: 0,
        totalPages: 1,
        selectedContacts: new Map(), // Use a Map to store full contact objects by ID
        pressReleaseId: window.location.pathname.split('/').pop()
    };

    // --- DOM ELEMENTS ---
    const contactSelectionContainer = document.getElementById('contact-selection-container');
    const searchInput = document.getElementById('contact-search');
    const contactsListDiv = document.getElementById('contacts-list');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageIndicator = document.getElementById('page-indicator');
    const pageSizeSelect = document.getElementById('page-size-select');
    const selectionSummary = document.getElementById('selection-summary');
    const confirmBtn = document.getElementById('confirm-outreach-btn');
    const payloadPreview = document.getElementById('payload-preview');
    const selectAllBtn = document.getElementById('select-all-visible-btn');

    // --- HELPER FUNCTIONS ---
    const normalizeEmail = e => (e || "").trim().toLowerCase();

    function dedupeByEmail(contacts) {
        const seen = new Set();
        return contacts.filter(contact => {
            const key = normalizeEmail(contact.email);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function buildPayload(pressReleaseId, contactsMap) {
        const contacts = Array.from(contactsMap.values());
        const uniqueContacts = dedupeByEmail(contacts);
        return {
            pressReleaseId: pressReleaseId || null,
            selectedContacts: uniqueContacts.map(c => ({
                contactId: String(c.id),
                contactName: c.contactName || "",
                email: c.email,
                outletName: c.outletName || null,
                categories: Array.isArray(c.categories) && c.categories.length ? c.categories : undefined
            })),
            total: uniqueContacts.length
        };
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- RENDER FUNCTIONS ---
    function renderContacts(contacts) {
        const fragment = document.createDocumentFragment();
        contactsListDiv.innerHTML = ''; // Clear previous list

        if (contacts.length === 0) {
            contactsListDiv.innerHTML = '<p style="text-align: center; padding: 2rem;">No contacts found.</p>';
            return;
        }

        contacts.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.innerHTML = `
                <input type="checkbox" id="contact-${contact.id}" data-contact-id="${contact.id}">
                <label for="contact-${contact.id}">
                    <span class="contact-name">${contact.contactName}</span>
                    <span class="contact-outlet">${contact.outletName || 'No outlet'}</span>
                    <span class="contact-email">${contact.email}</span>
                </label>
            `;
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.checked = state.selectedContacts.has(contact.id);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    state.selectedContacts.set(contact.id, contact);
                } else {
                    state.selectedContacts.delete(contact.id);
                }
                updateUI();
            });
            fragment.appendChild(item);
        });
        contactsListDiv.appendChild(fragment);
    }

    function updateUI() {
        // Update selection summary
        selectionSummary.textContent = `${state.selectedContacts.size} contacts selected`;
        confirmBtn.disabled = state.selectedContacts.size === 0;

        // Update pagination
        pageIndicator.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
        prevPageBtn.disabled = state.currentPage <= 1;
        nextPageBtn.disabled = state.currentPage >= state.totalPages;

        // Persist selection to sessionStorage
        sessionStorage.setItem(`selection-${state.pressReleaseId}`, JSON.stringify(Array.from(state.selectedContacts.entries())));
    }

    // --- API CALLS ---
    async function fetchContacts() {
        const { currentPage, pageSize, searchQuery } = state;
        const url = `/api/media-contacts?q=${encodeURIComponent(searchQuery)}&page=${currentPage}&page_size=${pageSize}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            state.totalContacts = data.total;
            state.totalPages = Math.ceil(data.total / state.pageSize) || 1;

            renderContacts(data.items);
            updateUI();
        } catch (error) {
            console.error('Error fetching contacts:', error);
            contactsListDiv.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Failed to load contacts.</p>';
        }
    }

    const debouncedFetch = debounce(fetchContacts, 300);

    // --- EVENT LISTENERS & INITIALIZATION ---
    function init() {
        // Load selection from sessionStorage
        const savedSelection = sessionStorage.getItem(`selection-${state.pressReleaseId}`);
        if (savedSelection) {
            state.selectedContacts = new Map(JSON.parse(savedSelection));
        }

        // Event listeners for staff selection (adapted from old logic)
        document.querySelectorAll('.staff-member').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelectorAll('.staff-member').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                contactSelectionContainer.style.display = 'block';
                fetchContacts();
            });
        });

        // This part is a bit tricky since the staff list is loaded async.
        // For now, let's assume the outreach page is only for contact selection.
        // The user prompt implies the staff selection might be on another page or a simpler component now.
        // Let's simplify and assume the contact selection is always visible if the user lands here.
        // The original logic shows staff first, then contacts. We'll keep that.

        // Search
        searchInput.addEventListener('input', () => {
            state.searchQuery = searchInput.value;
            state.currentPage = 1;
            debouncedFetch();
        });

        // Pagination
        pageSizeSelect.addEventListener('change', () => {
            state.pageSize = parseInt(pageSizeSelect.value, 10);
            state.currentPage = 1;
            fetchContacts();
        });

        prevPageBtn.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                fetchContacts();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                fetchContacts();
            }
        });

        // Confirm button
        confirmBtn.addEventListener('click', () => {
            const payload = buildPayload(state.pressReleaseId, state.selectedContacts);
            payloadPreview.textContent = JSON.stringify(payload, null, 2);
            payloadPreview.parentElement.open = true;
        });

        // Select All Visible button
        selectAllBtn.addEventListener('click', () => {
            const visibleCheckboxes = contactsListDiv.querySelectorAll('input[type="checkbox"]');
            if (visibleCheckboxes.length === 0) return;

            // If all are already checked, uncheck them. Otherwise, check all.
            const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);

            visibleCheckboxes.forEach(checkbox => {
                // We need the full contact object to add to the map
                // This is a bit inefficient, but necessary with the current structure.
                // We'll re-render to get the objects.
                checkbox.checked = !allChecked;
                // Manually trigger the change event to update the state
                checkbox.dispatchEvent(new Event('change'));
            });
        });

        // Initial load (if staff is already selected in a real app, this would trigger)
        // For now, we depend on the staff selection click to trigger the first fetch.
        // Let's hide the contact container until staff is selected.
        const staffListContainer = document.getElementById('staff-list-container');
        if (!staffListContainer.querySelector('.active')) {
            contactSelectionContainer.style.display = 'none';
        }
    }

    // The original script loaded staff first. We need to preserve that.
    // Let's re-integrate the staff loading part.
    const staffListContainer = document.getElementById('staff-list-container');
    const addStaffContainer = document.getElementById('add-staff-container');
    const addStaffForm = document.getElementById('add-staff-form');

    // Flash message function (re-add if not globally available)
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

    async function loadStaffAndInit() {
        try {
            const response = await fetch('/api/staff');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const staff = await response.json();

            if (staff.length === 0) {
                staffListContainer.innerHTML = '';
                addStaffContainer.style.display = 'block';

                addStaffForm.addEventListener('submit', async function onStaffSubmit(event) {
                    event.preventDefault();
                    const staffName = document.getElementById('staff-name').value;
                    const staffEmail = document.getElementById('staff-email').value;

                    try {
                        const response = await fetch('/api/staff', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ staff_name: staffName, staff_email: staffEmail }),
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error || 'Failed to add staff.');

                        showFlashMessage('Staff member added successfully!', 'success');
                        addStaffForm.reset();
                        addStaffContainer.style.display = 'none';

                        // Remove the listener to prevent duplicates, then reload everything
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

                // Now that staff is loaded, initialize the rest of the logic
                init();
            }
        } catch (error) {
            console.error('Error loading staff:', error);
            staffListContainer.innerHTML = '<p>Error loading staff. Please try again later.</p>';
        }
    }

    loadStaffAndInit();
});

// Gated webhook stub
window.OUTREACH_WEBHOOK_ENABLED = false;
async function sendToWebhook(url, payload) {
  if (!window.OUTREACH_WEBHOOK_ENABLED) {
      console.log("Webhook sending is disabled. Payload:", payload);
      return { skipped: true };
  }

  console.log("Sending payload to webhook:", url, payload);
  // In a real scenario, you would uncomment the following lines:
  /*
  try {
    const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    console.error("Error sending to webhook:", error);
    return { ok: false, error: error };
  }
  */
  return { ok: true, status: 200 }; // Mock success for now
}
