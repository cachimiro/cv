// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Dashboard: Toggle active chip
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Dashboard: Basic tooltip on action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('mouseover', (e) => {
            const title = e.currentTarget.getAttribute('title');
            if (title) {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = title;
                document.body.appendChild(tooltip);
                const rect = e.currentTarget.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top - 30}px`;
            }
        });
        btn.addEventListener('mouseout', () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });

    // Modal: Auto-match identical names
    const autoMatchBtn = document.getElementById('auto-match-btn');
    if (autoMatchBtn) {
        autoMatchBtn.addEventListener('click', () => {
            const rows = document.querySelectorAll('.mapping-row');
            rows.forEach(row => {
                const csvColumn = row.querySelector('td:first-child span').textContent.toLowerCase().trim();
                const select = row.querySelector('.mapping-select');
                const options = select.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].value.toLowerCase().trim() === csvColumn) {
                        select.value = options[i].value;
                        const checkIcon = row.querySelector('.check-icon');
                        checkIcon.style.opacity = '1';
                        setTimeout(() => {
                            checkIcon.style.opacity = '0';
                        }, 1000);
                        break;
                    }
                }
            });
        });
    }

    // Modal: Live filter CSV column list
    const filterInput = document.getElementById('filter-csv-columns');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const filterText = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.mapping-row');
            rows.forEach(row => {
                const csvColumn = row.querySelector('td:first-child span').textContent.toLowerCase();
                if (csvColumn.includes(filterText)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Modal: Ignore-row toggle
    const ignoreButtons = document.querySelectorAll('.ghost-btn');
    ignoreButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const select = e.currentTarget.closest('td').querySelector('.mapping-select');
            select.value = '';
        });
    });
});
