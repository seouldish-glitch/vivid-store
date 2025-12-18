

const categoryList = document.getElementById("categoryList");
const productsGrid = document.getElementById("productsGridPage"); 
const productSearch = document.getElementById("productSearchPage");

let allProducts = [];
let currentCategory = "all";
let searchQuery = "";








function formatMoney(n) {
  return "Rs. " + Number(n).toLocaleString("en-LK");
}

async function initProductsPage() {
  try {
    
    const catRes = await fetch("/api/categories");
    const categories = await catRes.json();
    renderSidebar(categories);

    
    const prodRes = await fetch("/api/products");
    allProducts = await prodRes.json();
    
    
    filterAndRender();

  } catch (err) {
    console.error("Products Page Init Failed:", err);
    productsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--danger)">Failed to load products.</div>`;
  }
}

function renderSidebar(categories) {
  
  const allBtn = categoryList.firstElementChild;
  categoryList.innerHTML = "";
  categoryList.appendChild(allBtn);

  
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.cat = cat.name;
    btn.textContent = cat.name;
    categoryList.appendChild(btn);
  });

  
  categoryList.addEventListener("click", (e) => {
    if (e.target.classList.contains("category-btn")) {
      
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      
      currentCategory = e.target.dataset.cat;
      filterAndRender();
    }
  });
}

function filterAndRender() {
  let filtered = allProducts;

  
  if (currentCategory && currentCategory !== "all") {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.subtitle || "").toLowerCase().includes(q) ||
      (p.tag || "").toLowerCase().includes(q)
    );
  }

  renderGrid(filtered);
}

function renderGrid(products) {
  if (!productsGrid) return;
  productsGrid.innerHTML = "";

  if (products.length === 0) {
    productsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px;">No products found in this category.</div>`;
    return;
  }

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card reveal-on-scroll";
    
    
    
    
    
    
    setTimeout(() => card.classList.add("is-visible"), 50);

    const imageUrl = Array.isArray(p.imageUrls) && p.imageUrls[0] ? p.imageUrls[0] : (p.imageUrl || "");

    card.innerHTML = `
      <a href="/product?pid=${p._id}" class="product-link">
        ${imageUrl ? `<img src="${imageUrl}" class="product-image" loading="lazy" />` : ""}
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ""}
        ${p.inStock === false ? `<div class="product-tag out-of-stock">Out of Stock</div>` : ""}
        <div class="product-name">${p.name}</div>
        <div class="product-subtitle">${p.subtitle || ""}</div>
      </a>

      <div class="product-bottom">
        <div class="product-price">${formatMoney(p.price)}</div>
        <button class="btn-secondary add-cart-btn" ${p.inStock === false ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          ${p.inStock === false ? 'Out of Stock' : 'Add to cart'}
        </button>
      </div>
    `;

    
    const cartBtn = card.querySelector(".add-cart-btn");
    if (cartBtn && p.inStock !== false) {
      cartBtn.addEventListener("click", () => {
        
        if (typeof window.addToCart === "function") {
            window.addToCart(p);
        } else {
            console.warn("addToCart function not found");
        }
      });
    }

    
    const strength = 10;
    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const midX = rect.width / 2;
        const midY = rect.height / 2;
        const rotateY = ((x - midX) / midX) * strength;
        const rotateX = -((y - midY) / midY) * strength;
        card.classList.add("is-tilting");
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
        card.classList.remove("is-tilting");
        card.style.transform = "";
    });

    productsGrid.appendChild(card);
  });
}


if (productSearch) {
    productSearch.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        filterAndRender();
    });
}


document.addEventListener("DOMContentLoaded", initProductsPage);

