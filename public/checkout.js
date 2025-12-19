document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("checkout-form");
    const errorMsg = document.getElementById("error-msg");
    const loadingOverlay = document.getElementById("loading-overlay");
    const successModal = document.getElementById("success-modal");
    
    document.querySelector(".page")?.classList.add("loaded");

    const phoneInput = document.getElementsByName("phone")[0];
    if (phoneInput && !phoneInput.id) phoneInput.id = "phone-input";

    if (phoneInput) {
        phoneInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
        });
    }

    async function loadSummary() {
        try {
            const res = await fetch("/api/checkout/summary", { credentials: "include" });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);

            const summaryContainer = document.getElementById("summary-items");
            const totalPriceEl = document.getElementById("total-price");
            const itemCountEl = document.getElementById("item-count");

            if (data.items && data.items.length > 0) {
                itemCountEl.textContent = `${data.items.length} ${data.items.length === 1 ? 'item' : 'items'}`;
                summaryContainer.innerHTML = data.items.map(item => `
                    <div class="summary-item">
                        <img src="${item.image || 'https://www.vividvision.lk/l.png'}" class="item-img" alt="${item.name}">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-meta">Quantity: ${item.quantity}</div>
                        </div>
                        <div class="item-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
                    </div>
                `).join("");
                totalPriceEl.textContent = `Rs. ${data.total.toLocaleString()}`;
            } else {
                window.location.href = "/";
            }
        } catch (err) {
            console.error("Summary load error", err);
            window.location.href = "/";
        }
    }

    loadSummary();

    const params = new URLSearchParams(window.location.search);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMsg.style.display = "none";

        const formData = new FormData(form);
        const phone = formData.get("phone")?.trim() || "";
        const fullName = formData.get("fullName")?.trim() || "";
        const address = formData.get("address")?.trim() || "";
        const postalCode = formData.get("postalCode")?.trim() || "";
        const dob = formData.get("dob");
        const province = formData.get("province");
        const agree = form.elements.agree.checked;

        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 16) {
                showError("You must be at least 16 years old to place a request.");
                return;
            }
        }

        if (!/^\d{9,10}$/.test(phone)) {
            showError("Please enter a valid phone number (9 or 10 digits).");
            return;
        }

        const normalizedPhone = phone.length === 10 && phone.startsWith("0") ? phone.substring(1) : phone;

        if (address.length < 10) {
            showError("Please provide a more detailed address.");
            return;
        }

        loadingOverlay.classList.remove("hidden");

        try {
            const res = await fetch("/api/checkout/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    fullName,
                    address,
                    phone: normalizedPhone,
                    postalCode,
                    dob,
                    province,
                    agree
                })
            });

            const result = await res.json();
            
            if (!res.ok) {
                showError(result.error || "Submission failed");
                loadingOverlay.classList.add("hidden");
                return;
            }

            loadingOverlay.classList.add("hidden");
            successModal.style.display = "flex";

        } catch (err) {
            console.error("Submit error", err);
            showError("A connection error occurred. Please try again.");
            loadingOverlay.classList.add("hidden");
        }
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});
