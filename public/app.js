const WHATSAPP_PHONE = "94783024455"; // replace with your number

// DOM refs
const productGrid = document.getElementById("productGrid");
const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const closeCartBtn = document.getElementById("closeCartBtn");
const hideCartBtn = document.getElementById("hideCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartCountEl = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const loginBtn = document.getElementById("loginBtn");
const yearEl = document.getElementById("year");
const searchInput = document.getElementById("searchInput");
const loadingOverlay = document.getElementById("vv-loader");
const loadingCounter = document.getElementById("vv-loader-counter");

// year in footer
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Mobile Nav Toggle
const navToggle = document.getElementById("navToggle");
const navCenter = document.querySelector(".nav-center");

if (navToggle && navCenter) {
  navToggle.addEventListener("click", () => {
    navCenter.classList.toggle("open");
  });

  // Close nav when a link is clicked
  const navLinks = navCenter.querySelectorAll(".nav-link");
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      navCenter.classList.remove("open");
    });
  });
}

// state
const cart = [];
let productsCache = [];
let API_LOCKED = false;

// helper: format price
function formatPrice(n) {
  return "Rs. " + Number(n).toLocaleString("en-LK");
}

async function safeFetch(url, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  if (API_LOCKED && method !== "GET") {
    alert("Debug tools detected. Actions are blocked.");
    return Promise.reject("API Locked");
  }
  return fetch(url, opts);
}

// simple client log
function logClient(action, data) {
  console.log("[client-log]", action, data);
}

// ----------------------
// SCROLL OBSERVER
// ----------------------
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      scrollObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

// ----------------------
// HERO TYPEWRITER
// ----------------------
function initHeroTypewriter() {
  const el = document.getElementById("heroTypewriter");
  if (!el) return;

  const fullText = el.textContent.trim().replace(/\s+/g, " "); // Clean up newlines/spaces
  el.textContent = "";

  let i = 0;
  let isDeleting = false;
  let speed = 50;

  function type() {
    const currentText = el.textContent;

    if (isDeleting) {
      el.textContent = fullText.substring(0, currentText.length - 1);
      speed = 30; // Deleting is faster
    } else {
      el.textContent = fullText.substring(0, currentText.length + 1);
      speed = 50; // Typing speed
    }

    if (!isDeleting && el.textContent === fullText) {
      // Finished typing, pause before deleting
      isDeleting = true;
      speed = 2000;
    } else if (isDeleting && el.textContent === "") {
      // Finished deleting, pause before typing
      isDeleting = false;
      speed = 500;
    }

    setTimeout(type, speed);
  }

  // Start the loop
  setTimeout(type, 1000);
}

// ----------------------
// SNOWFALL EFFECT
// ----------------------
function createSnowflakes() {
  const snowflakeCount = 50;
  for (let i = 0; i < snowflakeCount; i++) {
    const flake = document.createElement("div");
    flake.classList.add("snowflake");

    // Random size between 2px and 5px
    const size = Math.random() * 3 + 2 + "px";
    flake.style.width = size;
    flake.style.height = size;

    // Random position
    flake.style.left = Math.random() * 100 + "vw";

    // Random animation duration between 5s and 10s
    flake.style.animationDuration = Math.random() * 5 + 5 + "s";

    // Random delay
    flake.style.animationDelay = Math.random() * 5 + "s";

    // Random opacity
    flake.style.opacity = Math.random() * 0.5 + 0.3;

    document.body.appendChild(flake);
  }
}

// ---------------------------
// PREMIUM LOADER (upgraded)
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("vv-loader");
  const counter = document.getElementById("vv-loader-counter");
  const barFill = document.getElementById("vv-loader-bar-fill");

  if (!loader || !counter) return;

  let value = 0;

  const interval = setInterval(() => {
    // random-ish increment like Lyceum
    value += Math.floor(Math.random() * 7) + 1;
    if (value >= 100) value = 100;

    counter.textContent = value + "%";

    // update bar fill
    if (barFill) {
      const scale = value / 100;
      barFill.style.transform = `scaleX(${scale})`;
    }

    // retrigger tick animation
    counter.classList.remove("vv-tick");
    // force reflow to restart animation
    void counter.offsetWidth;
    counter.classList.add("vv-tick");

    if (value === 100) {
      clearInterval(interval);

      // final bounce
      counter.classList.remove("vv-tick");
      counter.classList.add("vv-done");

      setTimeout(() => {
        loader.classList.add("hidden");
        // Trigger page entrance animations
        const page = document.querySelector(".page");
        if (page) page.classList.add("loaded");
      }, 450);
    }
  }, 80);
});

// ----------------------
// AUTH UI
// ----------------------
async function initAuthUI() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) throw new Error("api/me failed");

    const data = await res.json();

    const userInfo = document.getElementById("userInfo");
    const userPic = document.getElementById("userPic");
    const userName = document.getElementById("userName");

    if (data.loggedIn) {
      if (userInfo) {
        userInfo.style.display = "flex";

        // Dropdown toggle
        userInfo.onclick = (e) => {
          e.stopPropagation();
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.toggle("show");
        };

        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.remove("show");
        });
      }
      if (userName) userName.textContent = data.user.name || "User";

      // ✅ Use avatar proxy so Google cookies/CSP don't break the image
      if (userPic) userPic.src = "/avatar?" + Date.now();

      loginBtn?.classList.add("hidden");
    } else {
      if (userInfo) userInfo.style.display = "none";
      loginBtn?.classList.remove("hidden");
      if (userPic) userPic.src = "/default-user.jpeg";
    }
  } catch (err) {
    console.error("Auth UI error:", err);
  }
}

loginBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/login";
});

// ----------------------
// PRODUCTS
// ----------------------
async function loadProducts() {
  try {
    const res = await safeFetch("/api/products");
    const products = await res.json();
    productsCache = products;

    await restoreCartFromServer();
    renderProducts(productsCache);

    logClient("PRODUCTS_VIEW", { total: products.length });
  } catch (err) {
    console.error("loadProducts failed", err);
  }
}

// attach cursor-follow tilt to a card
function attachCardTilt(card) {
  const strength = 10; // max rotation in degrees

  function handleMove(e) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // cursor x within card
    const y = e.clientY - rect.top;  // cursor y within card
    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const rotateY = ((x - midX) / midX) * strength;   // left/right
    const rotateX = -((y - midY) / midY) * strength;  // up/down (invert for natural tilt)

    card.classList.add("is-tilting");
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  }

  function handleLeave() {
    card.classList.remove("is-tilting");
    card.style.transform = "";
  }

  card.addEventListener("mousemove", handleMove);
  card.addEventListener("mouseleave", handleLeave);
}

function renderProducts(arr) {
  productGrid.innerHTML = "";
  arr.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card reveal-on-scroll";
    scrollObserver.observe(card); // Observe for scroll animation


    // Support both new imageUrls array and legacy imageUrl
    const imageUrl = Array.isArray(p.imageUrls) && p.imageUrls[0]
      ? p.imageUrls[0]
      : p.imageUrl;

    card.innerHTML = `
      <a href="/product?pid=${p._id}" class="product-link">
        ${imageUrl ? `<img src="${imageUrl}" class="product-image" />` : ""}
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ""}
        ${p.inStock === false ? `<div class="product-tag out-of-stock">Out of Stock</div>` : ""}
        <div class="product-name">${p.name}</div>
        <div class="product-subtitle">${p.subtitle || ""}</div>
      </a>

      <div class="product-bottom">
        <div class="product-price">${formatPrice(p.price)}</div>
        <button class="btn-secondary add-cart-btn" ${p.inStock === false ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          ${p.inStock === false ? 'Out of Stock' : 'Add to cart'}
        </button>
      </div>
    `;

    // attach tilt
    attachCardTilt(card);

    // cart button
    const cartBtn = card.querySelector(".add-cart-btn");
    if (cartBtn && p.inStock !== false) {
      cartBtn.addEventListener("click", () => {
        addToCart(p);
      });
    }

    productGrid.appendChild(card);
  });
}

// ----------------------
// CART
// ----------------------
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.remove("hidden");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.add("hidden");
}

cartBtn?.addEventListener("click", openCart);
closeCartBtn?.addEventListener("click", closeCart);
hideCartBtn?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", closeCart);

function updateCartUI() {
  cartItemsEl.innerHTML = "";

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<div class="cart-empty">Your cart is empty.</div>`;
  } else {
    cart.forEach((item) => {
      const el = document.createElement("div");
      el.className = "cart-item";
      el.innerHTML = `
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.quantity} × ${formatPrice(item.price)}</div>
        </div>

        <div>
          <div class="cart-item-total">${formatPrice(item.price * item.quantity)}</div>
          <div class="cart-item-remove">Remove</div>
        </div>
      `;
      el.querySelector(".cart-item-remove").addEventListener("click", () => {
        removeFromCart(item.id);
      });
      cartItemsEl.appendChild(el);
    });
  }

  cartSubtotalEl.textContent = formatPrice(
    cart.reduce((t, i) => t + i.price * i.quantity, 0)
  );
  cartCountEl.textContent = cart.length;
}

async function addToCart(p) {
  const existing = cart.find((i) => i.id === p._id);
  if (existing) existing.quantity += 1;
  else
    cart.push({
      id: p._id,
      name: p.name,
      price: p.price,
      quantity: 1,
    });

  updateCartUI();
  openCart();
  await syncCartToServer();
}

async function removeFromCart(id) {
  const i = cart.findIndex((c) => c.id === id);
  if (i !== -1) cart.splice(i, 1);

  updateCartUI();
  await syncCartToServer();
}

async function syncCartToServer() {
  try {
    const items = cart.map((i) => ({
      productId: i.id,
      quantity: i.quantity,
    }));
    await safeFetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    console.error("cart sync failed", err);
  }
}

async function restoreCartFromServer() {
  try {
    const res = await safeFetch("/api/cart", { credentials: "include" });
    if (!res.ok) return;
    const items = await res.json();
    cart.length = 0;

    items.forEach((i) => {
      const p = productsCache.find((pr) => pr._id === i.productId);
      if (!p) return;
      cart.push({
        id: p._id,
        name: p.name,
        price: p.price,
        quantity: i.quantity,
      });
    });

    updateCartUI();
  } catch (err) {
    console.error("restore cart failed", err);
  }
}

// ----------------------
// CHECKOUT → WhatsApp
// ----------------------
checkoutBtn?.addEventListener("click", () => {
  if (!cart.length) return;

  const lines = [
    "Hello, I would like to order:",
    "",
    ...cart.map((item, idx) => `${idx + 1}. ${item.name}`),
  ];

  const message = encodeURIComponent(lines.join("\n"));
  window.location.href = `https://wa.me/${WHATSAPP_PHONE}?text=${message}`;
});

// ----------------------
// SEARCH
// ----------------------
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // Prevent form submission if inside a form
    const q = searchInput.value.toLowerCase().trim();
    if (!q) return renderProducts(productsCache);

    const arr = productsCache.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q) ||
        (p.features || []).some((f) => f.toLowerCase().includes(q))
      );
    });

    renderProducts(arr);
  }
});

// ----------------------
// INIT
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  loadProducts();
  initHeroTypewriter();
  createSnowflakes();

  // Observe static scroll elements
  document.querySelectorAll(".reveal-on-scroll").forEach(el => scrollObserver.observe(el));
});


