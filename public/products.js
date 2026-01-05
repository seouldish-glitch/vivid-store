const WHATSAPP_PHONE = "94783024455";

const productGrid = document.getElementById("productGrid");
const categoryListEl = document.getElementById("categoryList");
const currentCategoryTitle = document.getElementById("currentCategoryTitle");
const productCountEl = document.getElementById("productCount");
const searchInput = document.getElementById("searchInput");
const featuredFilter = document.getElementById("featuredFilter");

const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const hideCartBtn = document.getElementById("hideCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartCountEl = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const loginBtn = document.getElementById("loginBtn");
const yearEl = document.getElementById("year");

const cart = [];
let productsCache = [];
let categoriesCache = [];
let activeCategoryId = "all";

function formatPrice(n) {
  return "Rs. " + Number(n).toLocaleString("en-LK");
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      scrollObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

async function initAuthUI() {
  try {
    const res = await fetch("/auth/me", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();

    const userInfo = document.getElementById("userInfo");
    const userPic = document.getElementById("userPic");
    const userName = document.getElementById("userName");

    if (data.user) {
      if (userInfo) {
        userInfo.style.display = "flex";
        userInfo.onclick = (e) => {
          e.stopPropagation();
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.toggle("show");
        };
        document.addEventListener("click", () => {
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.remove("show");
        });
      }
      if (userName) userName.textContent = data.user.name || "User";
      
      if (userPic) {
        const avatarUrl = data.user.avatar || data.user.picture || "/default-user.jpeg";
        userPic.src = avatarUrl;
        userPic.onerror = () => {
          userPic.src = "/default-user.jpeg";
        };
      }
      
      loginBtn?.classList.add("hidden");
    } else {
      if (userInfo) userInfo.style.display = "none";
      loginBtn?.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Auth UI error:", err);
  }
}

async function loadData() {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);

    productsCache = await prodRes.json();
    categoriesCache = await catRes.json();

    renderCategories();
    renderProducts();
    await restoreCartFromServer();
  } catch (err) {
    console.error("Load data failed", err);
    productCountEl.textContent = "Error loading products.";
  }
}

function renderCategories() {
  const allItem = categoryListEl.querySelector('[data-id="all"]');
  categoryListEl.innerHTML = "";
  categoryListEl.appendChild(allItem);

  categoriesCache.forEach(cat => {
    const li = document.createElement("li");
    li.className = "category-item";
    li.dataset.id = cat._id;
    li.textContent = cat.name;
    li.onclick = () => {
      setActiveCategory(cat._id, cat.name);
    };
    categoryListEl.appendChild(li);
  });

  allItem.onclick = () => {
    setActiveCategory("all", "All Products");
  };
}

function setActiveCategory(id, name) {
  activeCategoryId = id;
  currentCategoryTitle.textContent = name;
  
  categoryListEl.querySelectorAll(".category-item").forEach(item => {
    item.classList.toggle("active", item.dataset.id === id);
  });

  renderProducts();
  
  if (window.innerWidth <= 900) {
    window.scrollTo({ top: document.querySelector('.products-main').offsetTop - 100, behavior: 'smooth' });
  }
}

function attachCardTilt(card) {
  const strength = 10;
  function handleMove(e) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * strength;
    const rotateX = -((y - midY) / midY) * strength;
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

function renderProducts() {
  productGrid.innerHTML = "";
  
  const q = searchInput.value.toLowerCase().trim();
  
  let filtered = productsCache;
  
  if (activeCategoryId !== "all") {
    filtered = filtered.filter(p => p.category === activeCategoryId);
  }

  if (featuredFilter && featuredFilter.checked) {
    filtered = filtered.filter(p => p.isFeatured === true);
  }
  
  if (q) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.subtitle || "").toLowerCase().includes(q) ||
      (p.tag || "").toLowerCase().includes(q)
    );
  }

  productCountEl.textContent = `Showing ${filtered.length} products`;

  if (filtered.length === 0) {
    productGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--muted);">No products found in this category.</div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card reveal-on-scroll";
    
    const imageUrl = Array.isArray(p.imageUrls) && p.imageUrls[0] ? p.imageUrls[0] : (p.imageUrl || "");

    card.innerHTML = `
      <a href="/product?pid=${p._id}" class="product-link">
        ${imageUrl ? `<img src="${imageUrl}" class="product-image" loading="lazy" />` : ""}
        ${p.tag ? `<div class="product-tag">${escapeHtml(p.tag)}</div>` : ""}
        ${p.inStock === false ? `<div class="product-tag out-of-stock">Out of Stock</div>` : ""}
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-subtitle">${escapeHtml(p.subtitle || "")}</div>
      </a>
      <div class="product-bottom">
        <div class="product-price">${formatPrice(p.price)}</div>
        <button class="btn-secondary add-cart-btn" ${p.inStock === false ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          ${p.inStock === false ? 'Out of Stock' : 'Add to cart'}
        </button>
      </div>
    `;

    attachCardTilt(card);

    const cartBtn = card.querySelector(".add-cart-btn");
    if (cartBtn && p.inStock !== false) {
      cartBtn.onclick = (e) => {
        e.preventDefault();
        addToCart(p);
      };
    }

    productGrid.appendChild(card);
    setTimeout(() => scrollObserver.observe(card), 10);
  });
}

searchInput.addEventListener("input", () => {
  renderProducts();
});

featuredFilter?.addEventListener("change", () => {
  renderProducts();
});

function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.remove("hidden");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.add("hidden");
}

cartBtn?.addEventListener("click", () => {
    const userInfo = document.getElementById("userInfo");
    if (!userInfo || userInfo.style.display === "none") {
      alert("Please login to view your cart.");
      window.location.href = "/login";
      return;
    }
    openCart();
});
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
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-meta">${item.quantity} × ${formatPrice(item.price)}</div>
        </div>
        <div>
          <div class="cart-item-total">${formatPrice(item.price * item.quantity)}</div>
          <div class="cart-item-remove">Remove</div>
        </div>
      `;
      el.querySelector(".cart-item-remove").onclick = () => removeFromCart(item.id);
      cartItemsEl.appendChild(el);
    });
  }
  cartSubtotalEl.textContent = formatPrice(cart.reduce((t, i) => t + i.price * i.quantity, 0));
  cartCountEl.textContent = cart.length;
}

async function addToCart(p) {
  const existing = cart.find((i) => i.id === p._id);
  if (existing) existing.quantity += 1;
  else cart.push({ id: p._id, name: p.name, price: p.price, quantity: 1 });

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
    const items = cart.map((i) => ({ productId: i.id, quantity: i.quantity }));
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items }),
    });
  } catch (err) {}
}

async function restoreCartFromServer() {
  try {
    const res = await fetch("/api/cart", { credentials: "include" });
    if (!res.ok) return;
    const items = await res.json();
    cart.length = 0;
    items.forEach((i) => {
      const p = productsCache.find((pr) => pr._id === i.productId);
      if (p) cart.push({ id: p._id, name: p.name, price: p.price, quantity: i.quantity });
    });
    updateCartUI();
  } catch (err) {}
}

checkoutBtn?.addEventListener("click", () => {
  if (!cart.length) return;
  window.location.href = "/checkout";
});

function initLoader() {
  const loader = document.getElementById("vv-loader");
  const counter = document.getElementById("vv-loader-counter");
  const barFill = document.getElementById("vv-loader-bar-fill");
  if (!loader || !counter) return;

  let value = 0;
  const interval = setInterval(() => {
    value += Math.floor(Math.random() * 7) + 5;
    if (value >= 100) value = 100;
    counter.textContent = value + "%";
    if (barFill) barFill.style.transform = `scaleX(${value / 100})`;
    
    if (value === 100) {
      clearInterval(interval);
      setTimeout(() => {
        loader.classList.add("hidden");
        document.querySelector(".page")?.classList.add("loaded");
      }, 300);
    }
  }, 50);
}

async function initAnnouncements() {
  const bar = document.getElementById("announcement-bar");
  const content = document.getElementById("ann-content");
  const closeBtn = document.getElementById("close-ann");
  if (!bar || !content) return;

  try {
    const res = await fetch("/api/announcements/active");
    const active = await res.json();
    if (active && active.length > 0) {
      const ann = active[0];
      content.innerHTML = `<span class="ann-title">${ann.title}</span> ${ann.message}`;
      bar.className = `announcement-bar ${ann.type}`;
      bar.classList.remove("hidden");
      closeBtn.onclick = () => {
        bar.classList.add("hidden");
        sessionStorage.setItem("ann-closed-" + ann._id, "true");
      };
      if (sessionStorage.getItem("ann-closed-" + ann._id)) {
        bar.classList.add("hidden");
      }
    }
  } catch (err) {}
}

document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initAuthUI();
  loadData();
  initAnnouncements();
  
  // Navigation Toggle
  const navToggle = document.getElementById("navToggle");
  const navCenter = document.querySelector(".nav-center");
  if (navToggle && navCenter) {
    navToggle.addEventListener("click", () => {
      navCenter.classList.toggle("open");
    });
    navCenter.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => navCenter.classList.remove("open"));
    });
  }

  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
