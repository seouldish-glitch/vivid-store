
document.addEventListener("DOMContentLoaded", () => {
    
    initCheckout();

    
    const tosLink = document.getElementById("tosLink");
    if (tosLink) {
        tosLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.htmlAlert) {
                window.htmlAlert("info", "Terms of Service", `
                    <div style="font-size: 0.9rem; line-height: 1.6; color: #cbd5e1;">
                        <p>Welcome to Vivid Vision. By placing an order, you agree to the following:</p>
                        <ul style="padding-left: 20px;">
                            <li>All orders are subject to confirmation by our team.</li>
                            <li>Pricing and availability are subject to change without notice.</li>
                            <li>We reserve the right to cancel any order for any reason.</li>
                            <li>Personal data provided during checkout is used only for processing your order.</li>
                        </ul>
                        <p>Thank you for choosing Vivid Vision!</p>
                    </div>
                `, { onlyOk: true, okText: "Close" });
            }
        });
    }
});

async function initCheckout() {
    
    
    
    
    const params = new URLSearchParams(window.location.search);
    if (!params.get("q")) {
        window.location.href = "/products"; 
        return;
    }

    try {
        const res = await fetch("/api/cart", { credentials: "include" });
        if (!res.ok) {
            
            window.location.href = "/login";
            return;
        }
        
        const cartItems = await res.json();
        if (!cartItems || cartItems.length === 0) {
            alert("Your cart is empty. Redirecting to store.");
            window.location.href = "/products";
            return;
        }

        renderOrderSummary(cartItems);

    } catch(e) {
        console.error("Checkout init failed", e);
    }
}




let checkoutCart = [];

async function renderOrderSummary(items) {
    const list = document.getElementById("checkoutItems");
    const totalEl = document.getElementById("checkoutTotal");
    const productsRes = await fetch("/api/products");
    const allProducts = await productsRes.json();

    checkoutCart = [];
    let total = 0;

    list.innerHTML = "";
    
    
    items.forEach(item => {
        const p = allProducts.find(prod => prod._id === item.productId);
        if (p) {
            checkoutCart.push({ ...p, quantity: item.quantity });
            const itemTotal = p.price * item.quantity;
            total += itemTotal;

            const row = document.createElement("div");
            row.className = "summary-row";
            row.innerHTML = `
                <span>${p.name} (x${item.quantity})</span>
                <span>Rs. ${itemTotal.toLocaleString()}</span>
            `;
            list.appendChild(row);
        }
    });

    totalEl.textContent = "Rs. " + total.toLocaleString();
}



const form = document.getElementById("checkoutForm");
const dobInput = form.querySelector('[name="dob"]');
const dobError = document.getElementById("dobError");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    
    if (!validateAge(dobInput.value)) {
        dobError.style.display = "block";
        dobInput.focus();
        return;
    } else {
        dobError.style.display = "none";
        dobError.style.display = "none";
    }

    
    const phoneInput = form.querySelector('[name="phone"]');
    const phoneVal = phoneInput.value.replace(/\D/g, ''); 
    if (!/^\d{10}$/.test(phoneVal)) {
        if(window.htmlAlert) window.htmlAlert("error", "Invalid Phone", "Phone number must be exactly 10 digits.");
        else alert("Phone number must be exactly 10 digits.");
        phoneInput.focus();
        return;
    }

    
    const addressInput = form.querySelector('[name="address"]');
    if (addressInput.value.trim().length < 10) {
        if(window.htmlAlert) window.htmlAlert("error", "Invalid Address", "Please provide a more detailed address (at least 10 characters).");
        else alert("Please provide a more detailed address.");
        addressInput.focus();
        return;
    }

    
    const termsCheckbox = document.getElementById("termsCheckbox");
    if (termsCheckbox && !termsCheckbox.checked) {
        if(window.htmlAlert) window.htmlAlert("error", "Terms of Service", "You must agree to the Terms of Service to proceed.");
        else alert("You must agree to the Terms of Service to proceed.");
        return;
    }
    const captchaError = document.getElementById("captchaError");
    const captchaResponse = grecaptcha.getResponse();
    
    if (captchaResponse.length === 0) {
        captchaError.style.display = "block";
        return;
    } else {
        captchaError.style.display = "none";
    }

    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    
    const params = new URLSearchParams(window.location.search);
    data.checkoutToken = params.get("q");
    data.recaptchaResponse = grecaptcha.getResponse();
    
    
    const btn = document.getElementById("placeOrderBtn");
    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            credentials: "include"
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Order failed");
        }

        const resData = await res.json();
        
        
        if (window.htmlAlert) {
            await window.htmlAlert("success", "Order Request Sent", "Your request has been sent please wait for the team to contact you for the confirmation of the order.");
        } else {
            alert("Your request has been sent please wait for the team to contact you for the confirmation of the order.");
        }

        
        window.location.href = "/";

    } catch (err) {
        if (window.htmlAlert) window.htmlAlert("error", "Error", err.message);
        else alert(err.message);
        
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

function validateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 16;
}



