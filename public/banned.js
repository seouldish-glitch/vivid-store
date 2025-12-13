// banned.js - Frontend logic for banned page

async function loadBanInfo() {
    try {
        const res = await fetch('/api/ban-info', {
            credentials: 'include'
        });

        if (!res.ok) {
            console.error('Failed to load ban info');
            return;
        }

        const data = await res.json();

        if (!data.isBanned) {
            // Not banned, redirect to home
            window.location.href = '/';
            return;
        }

        // Display ban information
        const banTypeEl = document.getElementById('banType');
        const banReasonEl = document.getElementById('banReason');
        const banDateEl = document.getElementById('banDate');
        const banExpiryEl = document.getElementById('banExpiry');
        const expiryRow = document.getElementById('expiryRow');
        const countdownContainer = document.getElementById('countdownContainer');
        const appealEmailEl = document.getElementById('appealEmail');

        // Set ban type
        if (data.banType === 'temporary') {
            banTypeEl.textContent = 'Temporary Ban';
            banTypeEl.style.color = '#f59e0b';
        } else {
            banTypeEl.textContent = 'Permanent Ban';
            banTypeEl.style.color = '#ef4444';
        }

        // Set reason
        banReasonEl.textContent = data.reason || 'Violation of terms';

        // Set ban date
        if (data.bannedAt) {
            banDateEl.textContent = new Date(data.bannedAt).toLocaleString();
        }

        // Set email for appeal form
        if (data.email) {
            appealEmailEl.value = data.email;
        }

        // Show expiry for temporary bans
        if (data.banType === 'temporary' && data.expiresAt) {
            expiryRow.style.display = 'flex';
            banExpiryEl.textContent = new Date(data.expiresAt).toLocaleString();

            // Show countdown
            countdownContainer.style.display = 'block';
            startCountdown(data.expiresAt);
        }

    } catch (err) {
        console.error('Error loading ban info:', err);
    }
}

function startCountdown(expiresAt) {
    const countdownEl = document.getElementById('countdown');

    function updateCountdown() {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
            countdownEl.textContent = 'Ban expired - please refresh';
            countdownEl.style.color = '#10b981';
            return;
        }

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        countdownEl.textContent = `${hours}h ${minutes}m ${seconds}s remaining`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Handle appeal form submission
document.getElementById('appealForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const statusEl = document.getElementById('appealStatus');
    const emailEl = document.getElementById('appealEmail');
    const messageEl = document.getElementById('appealMessage');

    const email = emailEl.value.trim();
    const message = messageEl.value.trim();

    if (!email || !message) {
        statusEl.textContent = 'Please fill in all fields';
        statusEl.className = 'appeal-status error';
        return;
    }

    try {
        const res = await fetch('/api/ban-appeal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, message })
        });

        const data = await res.json();

        if (!res.ok) {
            statusEl.textContent = data.error || 'Failed to submit appeal';
            statusEl.className = 'appeal-status error';
            return;
        }

        statusEl.textContent = 'Appeal submitted successfully! Admins will review your request.';
        statusEl.className = 'appeal-status success';
        messageEl.value = '';

        // Disable form after successful submission
        messageEl.disabled = true;
        e.target.querySelector('button[type="submit"]').disabled = true;

    } catch (err) {
        console.error('Error submitting appeal:', err);
        statusEl.textContent = 'Error submitting appeal. Please try again.';
        statusEl.className = 'appeal-status error';
    }
});

// Load ban info on page load
document.addEventListener('DOMContentLoaded', loadBanInfo);
