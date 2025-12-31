
// Helper functions for the product editor modal
// Expects 'productEditorState' to be defined in global scope (from admin.js)

window.renderEditorPreviews = function() {
    const imagePreview = document.getElementById("productEditorImagePreview");
    if (!imagePreview) return;
    
    imagePreview.innerHTML = "";

    const { existingUrls, newFileUrls, selectedPrimary } = productEditorState;
    const totalItems = existingUrls.length + newFileUrls.length;

    const renderItem = (url, index, isNew) => {
        const div = document.createElement("div");
        div.className = "preview-item";

        // bounds check
        if (productEditorState.selectedPrimary >= totalItems) productEditorState.selectedPrimary = 0;
        const isPrimary = (index === productEditorState.selectedPrimary);

        div.innerHTML = `
      <img src="${url}" style="${isPrimary ? 'border:2px solid var(--accent);' : ''}">
      <span class="badge" style="${isNew ? 'background:rgba(245, 200, 76, 0.9)' : ''}">${isNew ? 'New' : 'Existing'}</span>
      ${isPrimary ? '<span class="badge" style="top:auto; bottom:6px; left:6px; background:#22c55e;">Primary</span>' : ''}
      
      <button type="button" class="remove-btn" title="Remove Image" onclick="${isNew ? `removeEditorNew(${index - existingUrls.length})` : `removeEditorExisting(${index})`}">×</button>

      ${!isPrimary ? `<button type="button" class="primary-btn" onclick="setEditorPrimary(${index})">Set Primary</button>` : ''}
    `;
        imagePreview.appendChild(div);
    };

    existingUrls.forEach((url, i) => renderItem(url, i, false));
    newFileUrls.forEach((url, i) => renderItem(url, existingUrls.length + i, true));
};

window.setEditorPrimary = function(index) {
    productEditorState.selectedPrimary = index;
    renderEditorPreviews();
}

window.removeEditorExisting = function(index) {
    productEditorState.existingUrls.splice(index, 1);
    if (productEditorState.selectedPrimary === index) productEditorState.selectedPrimary = 0;
    else if (productEditorState.selectedPrimary > index) productEditorState.selectedPrimary--;
    renderEditorPreviews();
};

window.removeEditorNew = function(nfIndex) {
    productEditorState.newFiles.splice(nfIndex, 1);
    const url = productEditorState.newFileUrls[nfIndex];
    productEditorState.newFileUrls.splice(nfIndex, 1);
    URL.revokeObjectURL(url);

    const absoluteIndex = productEditorState.existingUrls.length + nfIndex;
    if (productEditorState.selectedPrimary === absoluteIndex) productEditorState.selectedPrimary = 0;
    else if (productEditorState.selectedPrimary > absoluteIndex) productEditorState.selectedPrimary--;

    renderEditorPreviews();
};

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

// Initialize listeners
(() => {
    const imageInput = document.getElementById("productEditorImageInput");
    const form = document.getElementById("productEditorForm");
    const imagePreview = document.getElementById("productEditorImagePreview");

    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            const { existingUrls, newFiles } = productEditorState;
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
            if(imagePreview) imagePreview.insertBefore(processingMsg, imagePreview.firstChild);

            let processed = 0;
            filesToProcess.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const resizedBlob = resizeImageToBlob(img, file.name);
                        resizedBlob.then(blob => {
                            const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
                            productEditorState.newFiles.push(resizedFile);
                            productEditorState.newFileUrls.push(URL.createObjectURL(resizedFile));

                            processed++;
                            if (processed === filesToProcess.length) {
                                processingMsg.remove();
                                renderEditorPreviews();
                            }
                        });
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });

            imageInput.value = "";
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const fd = new FormData(form);
            const { existingUrls, newFiles, selectedPrimary, mode, productId } = productEditorState;

            const featuresRaw = form.elements.features.value;
            const featuresArr = featuresRaw.split("\n").map(s => s.trim()).filter(Boolean);
            fd.set("features", JSON.stringify(featuresArr));

            fd.set("inStock", form.elements.inStock.checked ? "true" : "false");
            fd.set("isFeatured", form.elements.isFeatured.checked ? "true" : "false");
            
            const catVal = form.elements.category.value;
            if (catVal) fd.set("category", catVal);
            else fd.delete("category");

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
                closeProductEditor();
                // Refresh products list in admin panel if available
                if (window.loadProducts) window.loadProducts();

            } catch (err) {
                console.error(err);
                alert("Error saving: " + err.message);
            } finally {
                const btn = form.querySelector('button[type="submit"]');
                btn.textContent = "Save Product";
                btn.disabled = false;
            }
        });
    }
})();
