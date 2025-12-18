const form = document.getElementById("productForm");
const pageTitle = document.getElementById("pageTitle");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

let mode = "create";
let productId = null;
let existingUrls = [];
let newFiles = [];
let newFileUrls = [];

const params = new URLSearchParams(window.location.search);
const productCategory = document.getElementById("productCategory");

async function loadCategories() {
    try {
        const res = await fetch("/api/admin/categories");
        if (!res.ok) return;
        const list = await res.json();
        list.forEach(c => {
             const opt = document.createElement("option");
             opt.value = c.name;
             opt.textContent = c.name;
             productCategory.appendChild(opt);
        });
    } catch(e) {
        console.error("Failed to load categories", e);
    }
}

loadCategories().then(() => {
    if (params.get("id")) {
        mode = "edit";
        productId = params.get("id");
        pageTitle.textContent = "Edit Product";
        loadProduct(productId);
    } else {
        pageTitle.textContent = "Create Product";
    }
});

async function loadProduct(id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Failed to load product");
        const p = await res.json();
        populateForm(p);
    } catch (err) {
        console.error(err);
        alert("Error loading product: " + err.message);
    }
}

function populateForm(p) {
    form.elements.name.value = p.name || "";
    form.elements.subtitle.value = p.subtitle || "";
    form.elements.price.value = p.price || 0;
    form.elements.tag.value = p.tag || "";
    if (form.elements.category) form.elements.category.value = p.category || "Uncategorized";
    form.elements.description.value = p.description || "";
    form.elements.features.value = (p.features || []).join("\n");
    form.elements.inStock.checked = p.inStock !== false;
    form.elements.isFeatured.checked = p.isFeatured === true; 

    
    if (p.imageUrls && p.imageUrls.length) {
        existingUrls = [...p.imageUrls];
    } else if (p.imageUrl) {
        existingUrls = [p.imageUrl];
    }
    renderPreviews();
}

function renderPreviews() {
    imagePreview.innerHTML = "";

    const totalItems = existingUrls.length + newFileUrls.length;

    const renderItem = (url, index, isNew) => {
        const div = document.createElement("div");
        div.className = "preview-item";

        if (selectedPrimary >= totalItems) selectedPrimary = 0;

        const isPrimary = (index === selectedPrimary);

        div.innerHTML = `
      <img src="${url}" style="${isPrimary ? 'border:2px solid var(--accent);' : ''}">
      <span class="badge" style="${isNew ? 'background:rgba(245, 200, 76, 0.8)' : ''}">${isNew ? 'New' : 'Existing'}</span>
      ${isPrimary ? '<span class="badge" style="top:auto; bottom:4px; left:4px; background:#22c55e;">Primary</span>' : ''}
      
      <div style="position:absolute; top:2px; right:2px; display:flex; flex-direction:column; gap:2px;">
         <button type="button" class="vv-btn danger" style="padding:2px 6px; font-size:10px;" onclick="${isNew ? `removeNew(${index - existingUrls.length})` : `removeExisting(${index})`}">x</button>
      </div>

      ${!isPrimary ? `<button type="button" class="vv-btn" style="position:absolute; bottom:2px; right:2px; padding:2px 6px; font-size:9px;" onclick="setPrimary(${index})">★</button>` : ''}
    `;
        imagePreview.appendChild(div);
    };

    existingUrls.forEach((url, i) => renderItem(url, i, false));
    newFileUrls.forEach((url, i) => renderItem(url, existingUrls.length + i, true));
}

let selectedPrimary = 0;

window.setPrimary = function (index) {
    selectedPrimary = index;
    renderPreviews();
}

window.removeExisting = function (index) {
    existingUrls.splice(index, 1);
    if (selectedPrimary === index) selectedPrimary = 0;
    else if (selectedPrimary > index) selectedPrimary--;
    renderPreviews();
};

window.removeNew = function (nfIndex) {
    newFiles.splice(nfIndex, 1);
    const url = newFileUrls[nfIndex];
    newFileUrls.splice(nfIndex, 1);
    URL.revokeObjectURL(url);

    
    const absoluteIndex = existingUrls.length + nfIndex;
    if (selectedPrimary === absoluteIndex) selectedPrimary = 0;
    else if (selectedPrimary > absoluteIndex) selectedPrimary--;

    renderPreviews();
};

imageInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentTotal = existingUrls.length + newFiles.length;
    const availableSlots = 5 - currentTotal;

    if (availableSlots <= 0) {
        alert("Maximum 5 images allowed per product. Please remove some images first.");
        imageInput.value = "";
        return;
    }

    if (files.length > availableSlots) {
        alert(`You can only add ${availableSlots} more image(s). Maximum 5 images per product.`);
    }

    const filesToProcess = files.slice(0, availableSlots);

    const processingMsg = document.createElement("div");
    processingMsg.style.cssText = "padding:8px; background:rgba(245,200,76,0.1); border-radius:6px; margin:8px 0; font-size:12px; color:var(--accent);";
    processingMsg.textContent = `⏳ Processing ${filesToProcess.length} image(s)...`;
    imagePreview.insertBefore(processingMsg, imagePreview.firstChild);

    let processed = 0;
    filesToProcess.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                
                const resizedBlob = resizeImageToBlob(img, file.name);
                resizedBlob.then(blob => {
                    const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
                    newFiles.push(resizedFile);
                    newFileUrls.push(URL.createObjectURL(resizedFile));

                    processed++;
                    if (processed === filesToProcess.length) {
                        processingMsg.remove();
                        renderPreviews();
                    }
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    
    imageInput.value = "";
});


function resizeImageToBlob(img, originalName) {
    return new Promise((resolve) => {
        const targetWidth = 1200;
        const targetHeight = 900;

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.85);
    });
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    const featuresRaw = form.elements.features.value;
    const featuresArr = featuresRaw.split("\n").map(s => s.trim()).filter(Boolean);
    fd.set("features", JSON.stringify(featuresArr));

    
    const descVal = document.getElementById("productDescription").value;
    fd.set("description", descVal);

    fd.set("inStock", form.elements.inStock.checked ? "true" : "false");
    fd.set("isFeatured", form.elements.isFeatured.checked ? "true" : "false");

    fd.delete("images");

    newFiles.forEach(f => fd.append("images", f));

    existingUrls.forEach(u => fd.append("existingImageUrls", u));

    fd.append("primaryIndex", selectedPrimary);

    const url = mode === "edit" ? `/api/admin/products/${productId}` : `/api/admin/products`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
        
        const btn = form.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        const res = await fetch(url, {
            method,
            body: fd,
            credentials: "include"
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || res.statusText);
        }

        
        alert("Saved successfully!");
        window.location.href = "/admin";

    } catch (err) {
        console.error(err);
        alert("Error saving: " + err.message);
        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = "Save Product";
        btn.disabled = false;
    }
});


window.insertTag = function(tag) {
    const area = document.getElementById("productDescription");
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const text = area.value;
    const selected = text.substring(start, end);

    let replacement;
    if (tag === 'br') {
        replacement = '<br>';
    } else {
        replacement = `<${tag}>${selected || 'text'}</${tag}>`;
    }

    area.value = text.substring(0, start) + replacement + text.substring(end);
    area.focus();
    
    if (selected.length === 0 && tag !== 'br') {
        area.setSelectionRange(start + tag.length + 2, start + tag.length + 6);
    }
};

window.insertLink = function() {
    const area = document.getElementById("productDescription");
    if (!area) return;
    
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const text = area.value;
    const selected = text.substring(start, end);

    const url = prompt("Enter the full URL:", "https:
    if(!url || url === "https:

    const linkText = selected || "Link Text";
    const replacement = `<a href="${url}" target="_blank" rel="noopener">${linkText}</a>`;
    
    area.value = text.substring(0, start) + replacement + text.substring(end);
    
    
    const newPos = start + replacement.length;
    area.setSelectionRange(newPos, newPos);
    area.focus();
};

