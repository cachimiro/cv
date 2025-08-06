function showFlashMessage(message, category) {
    const container = document.getElementById('dynamic-flash-container');
    const flashMessage = document.createElement('div');
    flashMessage.className = `alert alert-${category}`;
    flashMessage.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = function() {
        container.removeChild(flashMessage);
    };

    flashMessage.appendChild(closeButton);
    container.appendChild(flashMessage);

    setTimeout(() => {
        if (container.contains(flashMessage)) {
            container.removeChild(flashMessage);
        }
    }, 5000); // Remove the message after 5 seconds
}
