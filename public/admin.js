
(() => {
  // small utility: safe json parsing with content-type check
  async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(txt || `Request failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const txt = await res.text().catch(() => "");
      const err = new Error("Server returned HTML instead of JSON; you may be unauthenticated or there is a server error.");
      err.detail = txt;
      throw err;
    }
    return res.json();
  }

  // Tabs & panels
  const tabsEl = document.getElementById("tabs");
  const panels = {
    users: document.getElementById("panel-users"),
    products: document.getElementById("panel-products"),
    comments: document.getElementById("panel-comments"),
    statics: document.getElementById("panel-statics"),
    banned: document.getElementById("panel-banned"),
    orders: document.getElementById("panel-orders"),
    categories: document.getElementById("panel-categories"),
    converter: document.getElementById("panel-converter"),
    announcements: document.getElementById("panel-announcements"),
    developer: document.getElementById("panel-developer"),
  };

  function showTab(name) {
    Object.keys(panels).forEach(k => {
      panels[k].style.display = k === name ? "" : "none";
    });
    Array.from(tabsEl.children).forEach(t => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
  }

  tabsEl.addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (!t) return;
    const tabName = t.dataset.tab;
    showTab(tabName);
    if (tabName === "orders") loadOrders();
    if (tabName === "announcements") loadAnnouncements();
  });


  document.getElementById("refreshAll").addEventListener("click", () => {
    loadUsers();
    loadProducts();
    loadComments();
    loadStats();
    loadBanned();
    loadOrders();
    loadAnnouncements();
    if (panels.categories.style.display !== "none") loadCategories();
  });

  // ---------- CATEGORIES ----------
  const categoriesTbody = document.getElementById("categoriesTbody");
  const newCategoryName = document.getElementById("newCategoryName");
  const newCategoryDesc = document.getElementById("newCategoryDesc");
  const createCategoryBtn = document.getElementById("createCategoryBtn");

  async function loadCategories() {
    try {
      const list = await fetchJson("/api/admin/categories", { credentials: "include" });
      renderCategories(list || []);
    } catch (err) {
      console.error("loadCategories", err);
      if (window.htmlAlert) htmlAlert("error", "Load categories failed", err.message);
    }
  }

  function renderCategories(list) {
    categoriesTbody.innerHTML = "";
    list.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description || "")}</td>
        <td><code style="font-size:12px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:4px">${escapeHtml(c.slug)}</code></td>
        <td class="right">
          <button class="vv-btn danger sm" data-id="${c._id}" data-action="delete">Delete</button>
        </td>
      `;
      categoriesTbody.appendChild(tr);
    });

    categoriesTbody.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete category?")) return;
        try {
          await fetch(`/api/admin/categories/${id}`, { method: "DELETE", credentials: "include" });
          loadCategories();
        } catch (err) { alert("Delete failed"); }
      });
    });
  }

  createCategoryBtn.addEventListener("click", async () => {
    const name = newCategoryName.value.trim();
    const desc = newCategoryDesc.value.trim();
    if (!name) return alert("Category name required");

    try {
      createCategoryBtn.disabled = true;
      createCategoryBtn.textContent = "Creating...";
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc }),
        credentials: "include"
      });
      newCategoryName.value = "";
      newCategoryDesc.value = "";
      loadCategories();
    } catch (err) {
      alert("Failed to create category");
    } finally {
      createCategoryBtn.disabled = false;
      createCategoryBtn.textContent = "Add Category";
    }
  });

  // Load categories when tab opened
  tabsEl.addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (t && t.dataset.tab === "categories") loadCategories();
  });

  // ---------- USERS ----------
  const userSearch = document.getElementById("userSearch");
  const usersTbody = document.getElementById("usersTbody");
  const userPrev = document.getElementById("userPrev");
  const userNext = document.getElementById("userNext");
  const userPageInfo = document.getElementById("userPageInfo");
  let userPage = 1;
  const userLimit = 20;

  async function loadUsers() {
    try {
      const q = userSearch.value.trim();
      const data = await fetchJson(`/api/admin/users?search=${encodeURIComponent(q)}&page=${userPage}&limit=${userLimit}`, { credentials: "include" });
      renderUsers(data.items || []);
      const totalPages = Math.max(1, Math.ceil((data.total || 0) / userLimit));
      userPageInfo.textContent = `${userPage} / ${totalPages}`;
      userPrev.disabled = userPage <= 1;
      userNext.disabled = userPage >= totalPages;
    } catch (err) {
      console.error("loadUsers error", err);
      // If 403, might be a session issue - try refreshing the page
      if (err.status === 403 || err.message?.includes("403") || err.message?.includes("Access denied")) {
        console.warn("[BAN] Got 403, might be session issue. User may need to refresh page.");
        if (window.htmlToast) {
          htmlToast("Session issue detected. Please refresh the page.", { variant: "error", duration: 5000 });
        }
      } else {
        if (window.htmlAlert) htmlAlert("error", "Load users failed", err.message || (err.detail || "Unknown"));
        else alert(err.message || err.detail || "Load users failed");
      }
    }
  }

  function renderUsers(list) {
    usersTbody.innerHTML = "";
    list.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(u.name || "User")}</strong></td>
        <td class="muted">${escapeHtml(u.email || "-")}</td>
        <td>${u.isAdmin ? "Admin" : "User"}</td>
        <td class="muted">${new Date(u.createdAt || Date.now()).toLocaleString()}</td>
        <td class="right nowrap">
          <button class="vv-btn danger" data-id="${u._id}" data-action="ban" data-loading="false">
            <span class="btn-text">Ban</span>
            <span class="btn-spinner" style="display:none;">⏳</span>
          </button>
        </td>
      `;
      usersTbody.appendChild(tr);
    });
    usersTbody.querySelectorAll("[data-action='ban']").forEach(b => {
      b.addEventListener("click", async function () {
        // Prevent double-click
        if (this.dataset.loading === "true") return;
        this.dataset.loading = "true";
        const btnText = this.querySelector(".btn-text");
        const btnSpinner = this.querySelector(".btn-spinner");
        if (btnText) btnText.style.display = "none";
        if (btnSpinner) btnSpinner.style.display = "inline";
        this.disabled = true;

        try {
          await handleBan(b.dataset.id);
        } finally {
          // Reset button state after a delay
          setTimeout(() => {
            this.dataset.loading = "false";
            if (btnText) btnText.style.display = "inline";
            if (btnSpinner) btnSpinner.style.display = "none";
            this.disabled = false;
          }, 2000);
        }
      });
    });
  }

  userPrev.addEventListener("click", () => {
    if (userPage > 1) userPage--;
    loadUsers();
  });

  userNext.addEventListener("click", () => {
    userPage++;
    loadUsers();
  });

  userSearch.addEventListener("input", () => {
    userPage = 1;
    loadUsers();
  });

  async function handleBan(userId) {
    try {
      // Get user info for display
      const userData = await fetchJson(`/api/admin/users?search=&page=1&limit=1000`, { credentials: "include" });
      const user = userData.items?.find(u => String(u._id) === String(userId));
      const userName = user?.name || user?.email || "User";

      const banFormHtml = `
        <form id="vv-ban-form" style="display:flex;flex-direction:column;gap:12px;min-width:400px">
          <div style="padding:12px;background:rgba(220,38,38,0.1);border-radius:8px;margin-bottom:8px">
            <strong style="color:#dc2626">Banning:</strong> ${escapeHtml(userName)}
          </div>
          <label>
            Ban Type
            <select name="banType" id="banType" class="input" style="width:100%;margin-top:4px">
              <option value="permanent">Permanent Ban</option>
              <option value="temporary">Temporary Ban</option>
            </select>
          </label>
          <div id="durationField" style="display:none">
            <label>
              Duration (hours)
              <input type="number" name="banDuration" id="banDuration" class="input" min="1" value="24" style="width:100%;margin-top:4px">
            </label>
            <div style="font-size:12px;color:var(--muted);margin-top:4px">
              Common: 24h (1 day), 168h (1 week), 720h (30 days)
            </div>
          </div>
          <label>
            Reason for Ban <span style="color:#dc2626">*</span>
            <textarea name="reason" id="banReason" class="input" rows="3" required style="width:100%;margin-top:4px" placeholder="Enter the reason for banning this user...">Violation of terms</textarea>
          </label>
          <div style="font-size:12px;color:var(--muted);padding:8px;background:rgba(220,38,38,0.1);border-radius:6px">
            ⚠️ <strong>Warning:</strong> This will delete the user account and their data. A snapshot will be stored for recovery.
          </div>
          <div id="banStatus" style="display:none;padding:8px;border-radius:6px;font-size:13px;margin-top:4px"></div>
        </form>
      `;

      if (window.htmlAlert) {
        // Store form data globally
        window.__banFormData = null;

        // Add script to handle ban type change
        const formWithScript = banFormHtml + `
          <script>
            (function() {
              setTimeout(function() {
                const form = document.getElementById('vv-ban-form');
                if (!form) return;
                
                // Handle ban type change
                const banTypeSelect = form.querySelector('#banType');
                const durationField = form.querySelector('#durationField');
                if (banTypeSelect && durationField) {
                  banTypeSelect.addEventListener('change', function() {
                    durationField.style.display = this.value === 'temporary' ? 'block' : 'none';
                  });
                }
              }, 50);
            })();
          </script>
        `;

        // Use beforeClose callback to capture form data
        const confirmed = await htmlAlert("info", "Ban User", formWithScript, {
          beforeClose: function () {
            const form = document.getElementById('vv-ban-form');
            if (form) {
              const banType = form.querySelector('#banType')?.value || 'permanent';
              const reason = form.querySelector('#banReason')?.value.trim() || '';
              const banDuration = banType === 'temporary' ? form.querySelector('#banDuration')?.value : null;
              window.__banFormData = { banType, reason, banDuration };
            }
          }
        });

        if (!confirmed) {
          window.__banFormData = null;
          return;
        }

        // Get captured form data
        const formData = window.__banFormData;
        window.__banFormData = null;

        if (!formData) {
          console.error("[BAN] Form data not captured");
          if (window.htmlAlert) htmlAlert("error", "Error", "Failed to capture form data. Please try again.");
          return;
        }

        const { banType, reason, banDuration } = formData;

        if (!reason) {
          if (window.htmlAlert) htmlAlert("error", "Error", "Reason is required. Please provide a reason for the ban.");
          return;
        }

        // Validate duration for temporary bans
        if (banType === "temporary") {
          const duration = parseInt(banDuration);
          if (!duration || duration < 1) {
            if (window.htmlAlert) htmlAlert("error", "Error", "Please enter a valid duration (minimum 1 hour).");
            return;
          }
        }

        const banTypeText = banType === "temporary" ? `temporarily ban this user for ${banDuration} hours` : "permanently ban this user";
        const finalConfirm = await htmlConfirm(
          "Confirm Ban",
          `Are you sure you want to ${banTypeText}?\n\nThis action cannot be easily undone.`
        );
        if (!finalConfirm) return;

        // Show loading toast (form is already closed, so we can't use statusDiv)
        let loadingToast = null;
        if (window.htmlToast) {
          loadingToast = htmlToast("⏳ Processing ban request...", { duration: 10000 });
        }

        try {
          console.log("[BAN] Sending ban request:", { userId, reason, banType, banDuration });

          const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, banType, banDuration })
          });

          console.log("[BAN] Response status:", res.status, res.ok);

          if (!res.ok) {
            let errorMessage = `Request failed with status ${res.status}`;
            try {
              const errorData = await res.json();
              errorMessage = errorData.error || errorMessage;
              console.error("[BAN] Error response:", errorData);
            } catch (e) {
              try {
                const errorText = await res.text();
                errorMessage = errorText || errorMessage;
                console.error("[BAN] Error text:", errorText);
              } catch (e2) {
                console.error("[BAN] Failed to read error response:", e2);
                // Use default error message
              }
            }
            throw new Error(errorMessage);
          }

          const result = await res.json().catch((e) => {
            console.error("[BAN] Failed to parse success response:", e);
            return {};
          });

          console.log("[BAN] Success response:", result);

          // Remove loading toast safely
          if (loadingToast) {
            try {
              if (loadingToast.parentNode) {
                loadingToast.parentNode.removeChild(loadingToast);
              }
            } catch (e) {
              // Toast already removed, ignore
            }
          }

          // Show success toast with details
          const banTypeDisplay = banType === "temporary" ? `Temporary ban (${banDuration}h)` : "Permanent ban";
          if (window.htmlToast) {
            htmlToast(`✅ User banned successfully - ${banTypeDisplay}`, { variant: "success", duration: 5000 });
          }

          // Wait a moment before refreshing to ensure session is stable
          await new Promise(resolve => setTimeout(resolve, 500));

          // Refresh data with error handling
          try {
            await loadUsers();
          } catch (err) {
            console.error("[BAN] Failed to refresh users:", err);
            if (window.htmlToast) {
              htmlToast("User banned, but failed to refresh user list", { variant: "error", duration: 3000 });
            }
          }

          try {
            await loadBanned();
          } catch (err) {
            console.error("[BAN] Failed to refresh banned list:", err);
            if (window.htmlToast) {
              htmlToast("User banned, but failed to refresh banned list", { variant: "error", duration: 3000 });
            }
          }

          // Show additional success message only if refresh succeeded
          if (window.htmlToast) {
            setTimeout(() => {
              htmlToast("Lists updated", { variant: "success", duration: 2000 });
            }, 500);
          }

        } catch (fetchErr) {
          console.error("[BAN] Fetch error:", fetchErr);

          // Remove loading toast safely
          if (loadingToast) {
            try {
              if (loadingToast.parentNode) {
                loadingToast.parentNode.removeChild(loadingToast);
              }
            } catch (e) {
              // Toast already removed, ignore
            }
          }

          // Show error toast
          if (window.htmlToast) {
            htmlToast(`❌ Error: ${fetchErr.message || "Failed to ban user"}`, { variant: "error", duration: 5000 });
          }

          throw fetchErr;
        }
      } else {
        // Fallback to simple prompt
        const reason = prompt("Reason for ban", "Violation of terms");
        if (reason === null) return;
        const ok = confirm("Ban user? This will delete the user and their data.");
        if (!ok) return;

        // Show loading
        if (window.htmlToast) htmlToast("Processing ban...", { duration: 2000 });

        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, banType: "permanent" })
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `Status ${res.status}`);
        }
        if (window.htmlToast) htmlToast("User banned successfully", { variant: "success", duration: 5000 });
        await loadUsers();
        await loadBanned();
      }
    } catch (err) {
      console.error("ban error", err);
      if (window.htmlAlert) {
        htmlAlert("error", "Ban Failed", `Unable to ban user: ${err.message || err.detail || "Unknown error"}\n\nPlease try again or contact support if the issue persists.`);
      } else {
        alert(`Ban failed: ${err.message || err.detail || "Unknown error"}`);
      }
    }
  }

  // Add event listener for ban type change
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "banType") {
      const durationField = document.getElementById("durationField");
      if (durationField) {
        durationField.style.display = e.target.value === "temporary" ? "block" : "none";
      }
    }
  });

  // ---------- ORDERS ----------
  const ordersTbody = document.getElementById("ordersTbody");

  async function loadOrders() {
    try {
      const list = await fetchJson("/api/admin/orders", { credentials: "include" });
      renderOrders(list || []);
    } catch (err) {
      console.error("loadOrders", err);
      if (window.htmlAlert) htmlAlert("error", "Load orders failed", err.message);
    }
  }

  function renderOrders(list) {
    ordersTbody.innerHTML = "";
    if (list.length === 0) {
      ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No orders found</td></tr>';
      return;
    }

    list.forEach(o => {
      const tr = document.createElement("tr");
      const statusColor = o.status === "Pending" ? "var(--accent)" : (o.status === "Confirmed" ? "#22c55e" : (o.status === "Cancelled" ? "var(--danger)" : "var(--muted)"));

      tr.innerHTML = `
        <td style="font-family:monospace; font-size:12px;">${o._id.substring(o._id.length - 8)}</td>
        <td>
          <div style="font-weight:600">${escapeHtml(o.fullName)}</div>
          <div style="font-size:11px;color:var(--muted)">${escapeHtml(o.phone)}</div>
        </td>
        <td>${Number(o.total || 0).toLocaleString()}</td>
        <td>
           <select class="order-status-select input sm" data-id="${o._id}" style="color:${statusColor}; width:130px; padding: 4px 8px; font-size: 13px;">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
           </select>
        </td>
        <td style="font-size:11px">${new Date(o.createdAt).toLocaleDateString()}</td>
        <td class="right nowrap">
          <button class="vv-btn sm ghost" data-id="${o._id}" data-action="view-details">View Details</button>
          <button class="vv-btn danger sm" data-id="${o._id}" data-action="delete-order" title="Delete Order">x</button>
        </td>
      `;
      ordersTbody.appendChild(tr);
    });

    // Event listeners
    ordersTbody.querySelectorAll(".order-status-select").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const id = sel.dataset.id;
        const newStatus = e.target.value;
        try {
          await fetch(`/api/admin/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
            credentials: "include"
          });
          if (window.htmlToast) htmlToast(`Order ${newStatus}`, { variant: "success" });
          loadOrders();
        } catch (err) {
          if (window.htmlAlert) htmlAlert("error", "Update failed", err.message);
        }
      });
    });

    ordersTbody.querySelectorAll("[data-action='view-details']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const order = list.find(x => x._id === id);
        if (!order) return;
        showOrderDetails(order);
      });
    });

    ordersTbody.querySelectorAll("[data-action='delete-order']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ok = (window.htmlConfirm) ? await htmlConfirm("Delete order record?", "This cannot be undone.") : confirm("Delete this order record?");
        if (!ok) return;
        try {
          await fetch(`/api/admin/orders/${id}`, { method: "DELETE", credentials: "include" });
          if (window.htmlToast) htmlToast("Order deleted", { variant: "success" });
          loadOrders();
        } catch (err) { 
           if (window.htmlAlert) htmlAlert("error", "Delete failed", err.message);
        }
      });
    });
  }

  function showOrderDetails(o) {
    const itemsHtml = o.items.map(i => `
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
        <div>
          <div style="font-weight:600">${escapeHtml(i.name)}</div>
          <div style="font-size:12px; color:var(--text-muted)">Qty: ${i.quantity} × ${Number(i.price).toLocaleString()}</div>
        </div>
        <div style="font-weight:600">${Number(i.price * i.quantity).toLocaleString()}</div>
      </div>
    `).join("");

    const html = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; text-align:left;">
        <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:12px; border:1px solid var(--border)">
          <h4 style="margin-top:0; color:var(--accent); font-size:14px; text-transform:uppercase; letter-spacing:1px;">Customer Information</h4>
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-muted)">Full Name</div>
            <div style="font-weight:600; font-size:16px">${escapeHtml(o.fullName)}</div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-muted)">Email Address</div>
            <div style="font-weight:600">${escapeHtml(o.user?.email || "No Email")}</div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-muted)">Phone Number</div>
            <div style="font-weight:600">${escapeHtml(o.phone)}</div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-muted)">Date of Birth / Age</div>
            <div style="font-weight:600">${o.dob ? new Date(o.dob).toLocaleDateString() + ' (' + calculateAge(o.dob) + ' yrs)' : "-"}</div>
          </div>
          <div style="margin-bottom:12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted)">Postal Code</div>
              <div style="font-weight:600">${escapeHtml(o.postalCode || "-")}</div>
            </div>
            <div>
              <div style="font-size:12px; color:var(--text-muted)">Province</div>
              <div style="font-weight:600">${escapeHtml(o.province || "-")}</div>
            </div>
          </div>
          <div>
            <div style="font-size:12px; color:var(--text-muted)">Shipping Address</div>
            <div style="font-weight:500; line-height:1.5;">${escapeHtml(o.address)}</div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:12px; border:1px solid var(--border)">
          <h4 style="margin-top:0; color:var(--accent); font-size:14px; text-transform:uppercase; letter-spacing:1px;">Request Summary</h4>
          <div style="max-height:220px; overflow-y:auto; margin-bottom:16px; padding-right:8px">
            ${itemsHtml}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:2px solid var(--border)">
            <div style="font-weight:700; font-size:18px">Total</div>
            <div style="font-weight:800; font-size:22px; color:var(--accent)">${Number(o.total || 0).toLocaleString()}</div>
          </div>
          <div style="margin-top:20px; font-size:12px; color:var(--text-muted)">
            <div><strong>Request ID:</strong> ${o._id}</div>
            <div><strong>Date:</strong> ${new Date(o.createdAt).toLocaleString()}</div>
            <div style="margin-top:4px"><strong>Status:</strong> <span style="color:${o.status === 'Pending' ? 'var(--accent)' : '#22c55e'}">${o.status}</span></div>
          </div>
        </div>
      </div>
    `;

    if (window.htmlAlert) {
      htmlAlert("info", "Request Details", html, { onlyOk: true, okText: "Close" });
    } else {
      alert("Please ensure modals.js is loaded properly.");
    }
  }

  // ---------- PRODUCTS ----------
  const productsTbody = document.getElementById("productsTbody");
  const productSearch = document.getElementById("productSearch");
  const createProductBtn = document.getElementById("createProductBtn");

  async function loadProducts() {
    try {
      const list = await fetchJson("/api/admin/products", { credentials: "include" });
      renderProducts(list || []);
    } catch (err) {
      console.error("loadProducts", err);
      if (window.htmlAlert) htmlAlert("error", "Load products failed", err.message || (err.detail || ""));
      else alert("Load products failed");
    }
  }

  function renderProducts(list) {
    productsTbody.innerHTML = "";
    list.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${((p.imageUrls && p.imageUrls.length) ? p.imageUrls.map(u => `<img class="thumb" src="${u}">`).join('') : (p.imageUrl ? `<img class="thumb" src="${p.imageUrl}">` : "No"))}</td>
        <td>${escapeHtml(p.name)}${p.inStock === false ? ' <span style="color:var(--danger);font-size:12px;margin-left:6px">(Out of stock)</span>' : ''}${p.isFeatured === true ? ' <span style="color:var(--accent);font-size:12px;margin-left:6px">★ Featured</span>' : ''}</td>
        <td>${Number(p.price || 0).toLocaleString()}</td>
        <td>${escapeHtml(p.tag || "")}</td>
        <td class="right nowrap">
          <button class="vv-btn" data-id="${p._id}" data-action="edit">Edit</button>
          <button class="vv-btn danger" data-id="${p._id}" data-action="delete">Delete</button>
        </td>
      `;
      productsTbody.appendChild(tr);
    });

    // delete handlers
    productsTbody.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ok = (window.htmlConfirm) ? await htmlConfirm("Delete product?", "This action is permanent.", { okText: "Delete", cancelText: "Cancel" }) : confirm("Delete product?");
        if (!ok) return;
        const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          if (window.htmlAlert) htmlAlert("error", "Delete failed", t || `Status ${res.status}`);
          return;
        }
        if (window.htmlToast) htmlToast("Deleted", { variant: "success" });
        loadProducts();
      });
    });

    // edit handlers
    productsTbody.querySelectorAll("[data-action='edit']").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.id;
        openProductEditor(pid);
      });
    });
  }

  productSearch.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = (e.target.value || "").trim().toLowerCase();
      if (!q) return loadProducts();
      try {
        const list = await fetchJson("/api/admin/products", { credentials: "include" });
        const filtered = list.filter(p =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.subtitle || "").toLowerCase().includes(q) ||
          (p.tag || "").toLowerCase().includes(q)
        );
        renderProducts(filtered);
      } catch (err) {
        if (window.htmlAlert) htmlAlert("error", "Search failed", err.message || "");
      }
    }
  });

  createProductBtn.addEventListener("click", () => {
    openProductEditor();
  });
  window.loadProducts = loadProducts;

  function openProductModal(product, onSubmit) {
    const html = `
      <form id="vv-admin-product-form" enctype="multipart/form-data" style="display:flex;flex-direction:column;gap:10px;width:100%">
        <label>Name <input name="name" value="${escapeHtml(product?.name || "")}" class="input" required></label>
        <label>Subtitle <input name="subtitle" value="${escapeHtml(product?.subtitle || "")}" class="input"></label>
        <div style="display:flex;gap:10px">
          <label style="flex:1">Price <input name="price" type="number" value="${product?.price || 0}" class="input" required></label>
          <label style="width:140px">Category 
             <select name="category" id="productCategorySelect" class="input">
               <option value="">-- None --</option>
             </select>
          </label>
        </div>
        <label>Tag <input name="tag" value="${escapeHtml(product?.tag || "")}" class="input" placeholder="e.g. New"></label>
        <label>Features (one per line) <textarea name="features" rows="4" class="input">${(product?.features || []).join("\n")}</textarea></label>
        <label>Images <input type="file" name="images" accept="image/*" multiple></label>
        <div style="margin-top:8px">

          <label style="display:inline-flex;align-items:center;gap:8px"><input type="checkbox" name="inStock" value="true" ${product?.inStock === false ? '' : 'checked'}> In stock</label>
          <label style="display:inline-flex;align-items:center;gap:8px;margin-left:15px"><input type="checkbox" name="isFeatured" value="true" ${product?.isFeatured === true ? 'checked' : ''}> Featured</label>
        </div>
        <input type="hidden" name="primaryIndex" value="0">
        <div id="imagePreviewArea" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          ${product?.imageUrls ? (product.imageUrls.map((u, i) => `<div class="vv-img-preview" data-existing-index="${i}" style="position:relative;display:inline-block;margin-right:6px"><img src="${u}" style="height:60px;border-radius:6px"><div style="position:absolute;left:6px;top:6px;background:rgba(0,0,0,0.5);color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">Existing</div></div>`).join('')) : (product?.imageUrl ? `<div class="vv-img-preview"><img src="${product.imageUrl}" style="height:60px;border-radius:6px"></div>` : "")}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="vv-btn ghost" id="vv-form-cancel">Cancel</button>
          <button type="submit" class="vv-btn">${product ? "Save" : "Create"}</button>
        </div>
      </form>
    `;
    if (window.htmlAlert) {
      // Show modal and hide default buttons (form has its own buttons)
      htmlAlert("info", product ? "Edit product" : "Create product", html, { onlyOk: false });

      // Hide default modal buttons and attach form handlers
      setTimeout(() => {
        const actions = document.getElementById("vv-modal-actions");
        if (actions) actions.style.display = "none"; // Hide default OK/Cancel buttons

        const form = document.getElementById("vv-admin-product-form");
        const cancelBtn = document.getElementById("vv-form-cancel");

        // Image preview + existing-image reorder/delete + primary selection logic
        try {
          if (form) {
            const fileInput = form.querySelector('input[name="images"]');
            const previewArea = form.querySelector('#imagePreviewArea');
            const primaryInput = form.querySelector('input[name="primaryIndex"]');

            // State: existing image URLs (from product), newFiles (File objects), and object URLs for previews
            let existingUrls = Array.isArray(product?.imageUrls) ? product.imageUrls.slice() : (product?.imageUrl ? [product.imageUrl] : []);
            let newFiles = [];
            let newFileObjectUrls = [];
            let selectedPrimary = parseInt(primaryInput?.value || '0', 10) || 0;

            // Helper to clamp total images to 5
            function clampToFive() {
              while ((existingUrls.length + newFiles.length) > 5) {
                // remove last new file if exists, otherwise remove last existing
                if (newFiles.length) {
                  const f = newFiles.pop();
                  const objUrl = newFileObjectUrls.pop();
                  try { URL.revokeObjectURL(objUrl); } catch (e) { }
                } else {
                  existingUrls.pop();
                }
              }
            }

            function rebuildPreviewArea() {
              if (!previewArea) return;
              previewArea.innerHTML = '';

              // Build combined list: existingUrls then newFiles
              const combined = [];
              existingUrls.forEach((u, i) => combined.push({ type: 'existing', url: u }));
              newFiles.forEach((f, i) => combined.push({ type: 'new', file: f, url: newFileObjectUrls[i] }));

              combined.forEach((item, idx) => {
                const box = document.createElement('div');
                box.className = 'vv-img-preview';
                box.style.marginRight = '6px';
                box.style.display = 'inline-block';
                box.style.textAlign = 'center';

                const img = document.createElement('img');
                img.style.height = '60px';
                img.style.borderRadius = '6px';
                img.style.objectFit = 'cover';
                img.src = item.url;
                box.appendChild(img);

                // Controls container
                const ctrl = document.createElement('div');
                ctrl.style.display = 'flex';
                ctrl.style.gap = '4px';
                ctrl.style.justifyContent = 'center';
                ctrl.style.marginTop = '6px';

                // Move left
                const leftBtn = document.createElement('button');
                leftBtn.type = 'button';
                leftBtn.textContent = '◀';
                leftBtn.title = 'Move left';
                leftBtn.addEventListener('click', () => {
                  moveItemLeft(idx);
                });
                ctrl.appendChild(leftBtn);

                // Primary / set primary
                const primaryBtn = document.createElement('button');
                primaryBtn.type = 'button';
                primaryBtn.textContent = (idx === selectedPrimary) ? 'Primary' : 'Set';
                primaryBtn.title = 'Set as primary thumbnail';
                primaryBtn.addEventListener('click', () => {
                  selectedPrimary = idx;
                  if (primaryInput) primaryInput.value = String(selectedPrimary);
                  rebuildPreviewArea();
                });
                ctrl.appendChild(primaryBtn);

                // Move right
                const rightBtn = document.createElement('button');
                rightBtn.type = 'button';
                rightBtn.textContent = '▶';
                rightBtn.title = 'Move right';
                rightBtn.addEventListener('click', () => {
                  moveItemRight(idx);
                });
                ctrl.appendChild(rightBtn);

                // Delete
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '✕';
                delBtn.title = 'Remove image';
                delBtn.style.marginLeft = '6px';
                delBtn.addEventListener('click', () => {
                  removeItem(idx);
                });
                ctrl.appendChild(delBtn);

                box.appendChild(ctrl);

                previewArea.appendChild(box);
              });

              // Update hidden inputs for existing images (preserve order)
              // Remove old existingImageUrls inputs
              const old = form.querySelectorAll('input[name="existingImageUrls[]"]');
              old.forEach(n => n.remove());
              existingUrls.forEach(url => {
                const hi = document.createElement('input');
                hi.type = 'hidden';
                hi.name = 'existingImageUrls[]';
                hi.value = url;
                form.appendChild(hi);
              });

              // Ensure primaryInput is set correctly (clamp)
              const total = existingUrls.length + newFiles.length;
              if (selectedPrimary >= total) selectedPrimary = Math.max(0, total - 1);
              if (primaryInput) primaryInput.value = String(selectedPrimary);
            }

            function moveItemLeft(idx) {
              if (idx <= 0) return;
              const totalExisting = existingUrls.length;
              // if both items are in existingUrls
              if (idx - 1 < totalExisting && idx < totalExisting) {
                // swap in existingUrls
                const a = existingUrls[idx - 1];
                existingUrls[idx - 1] = existingUrls[idx];
                existingUrls[idx] = a;
              } else if (idx - 1 < totalExisting && idx >= totalExisting) {
                // move a new file into existing position
                const newIdx = idx - totalExisting;
                // Move by rebuilding the combined order (handles crossing existing/new boundary)
                rebuildCombinedOrderAfterMove(idx, idx - 1);
                return;
              } else {
                // both in newFiles
                const i1 = idx - totalExisting;
                const tmpF = newFiles[i1 - 1];
                newFiles[i1 - 1] = newFiles[i1];
                newFiles[i1] = tmpF;
                const tmpU = newFileObjectUrls[i1 - 1];
                newFileObjectUrls[i1 - 1] = newFileObjectUrls[i1];
                newFileObjectUrls[i1] = tmpU;
              }
              // adjust primary if needed
              if (selectedPrimary === idx) selectedPrimary = idx - 1;
              else if (selectedPrimary === idx - 1) selectedPrimary = idx;
              rebuildPreviewArea();
            }

            function moveItemRight(idx) {
              // symmetric
              const total = existingUrls.length + newFiles.length;
              if (idx >= total - 1) return;
              const totalExisting = existingUrls.length;
              if (idx < totalExisting && idx + 1 < totalExisting) {
                const a = existingUrls[idx + 1];
                existingUrls[idx + 1] = existingUrls[idx];
                existingUrls[idx] = a;
              } else if (idx < totalExisting && idx + 1 >= totalExisting) {
                // Crossing boundary between existing and new files — rebuild combined ordering
                rebuildCombinedOrderAfterMove(idx, idx + 1);
                return;
              } else {
                const i1 = idx - totalExisting;
                const tmpF = newFiles[i1 + 1];
                newFiles[i1 + 1] = newFiles[i1];
                newFiles[i1] = tmpF;
                const tmpU = newFileObjectUrls[i1 + 1];
                newFileObjectUrls[i1 + 1] = newFileObjectUrls[i1];
                newFileObjectUrls[i1] = tmpU;
              }
              if (selectedPrimary === idx) selectedPrimary = idx + 1;
              else if (selectedPrimary === idx + 1) selectedPrimary = idx;
              rebuildPreviewArea();
            }

            function rebuildCombinedOrderAfterMove(fromIdx, toIdx) {
              // Build combined array, perform swap, then split back into existingUrls and newFiles
              const combined = [];
              existingUrls.forEach(u => combined.push({ type: 'existing', url: u }));
              newFileObjectUrls.forEach((u, i) => combined.push({ type: 'new', url: u, file: newFiles[i] }));
              // move element
              const [item] = combined.splice(fromIdx, 1);
              combined.splice(toIdx, 0, item);
              // split back
              existingUrls = combined.filter(c => c.type === 'existing').map(c => c.url);
              const newList = combined.filter(c => c.type === 'new');
              newFiles = newList.map(n => n.file);
              newFileObjectUrls = newList.map(n => n.url);
              // adjust primary
              if (selectedPrimary === fromIdx) selectedPrimary = toIdx;
              else if (fromIdx < selectedPrimary && toIdx >= selectedPrimary) selectedPrimary--;
              else if (fromIdx > selectedPrimary && toIdx <= selectedPrimary) selectedPrimary++;
              rebuildPreviewArea();
            }

            function removeItem(idx) {
              const totalExisting = existingUrls.length;
              if (idx < totalExisting) {
                // remove existing
                const removed = existingUrls.splice(idx, 1)[0];
                // attempt to delete file preview not actual file until submit
              } else {
                const nfIdx = idx - totalExisting;
                const objUrl = newFileObjectUrls.splice(nfIdx, 1)[0];
                newFiles.splice(nfIdx, 1);
                try { URL.revokeObjectURL(objUrl); } catch (e) { }
              }
              // adjust primary
              if (selectedPrimary === idx) selectedPrimary = 0;
              else if (selectedPrimary > idx) selectedPrimary--;
              rebuildPreviewArea();
            }

            // when new files selected
            if (fileInput) {
              fileInput.addEventListener('change', (ev) => {
                const files = Array.from(fileInput.files || []);
                // append
                files.forEach(f => {
                  newFiles.push(f);
                  newFileObjectUrls.push(URL.createObjectURL(f));
                });
                clampToFive();
                rebuildPreviewArea();
              });
            }

            // initial render (existing images)
            rebuildPreviewArea();
          }
        } catch (e) {
          console.warn('Image preview/setup failed', e);
        }

        if (form) {
          form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";

            try {
              await onSubmit(form);
              // Close modal on success
              const backdrop = document.getElementById("vv-modal-backdrop");
              if (backdrop) {
                backdrop.style.display = "none";
                document.getElementById("vv-modal-title").textContent = "";
                document.getElementById("vv-modal-text").innerHTML = "";
                document.getElementById("vv-modal-actions").innerHTML = "";
              }
              if (window.htmlToast) htmlToast("Product saved successfully", { variant: "success" });
            } catch (err) {
              console.error("Product save error:", err);
              if (window.htmlAlert) {
                htmlAlert("error", "Save failed", err.message || err.detail || "Unknown error occurred");
              }
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
            }
          }, { once: false });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener("click", () => {
            const backdrop = document.getElementById("vv-modal-backdrop");
            if (backdrop) {
              backdrop.style.display = "none";
              document.getElementById("vv-modal-title").textContent = "";
              document.getElementById("vv-modal-text").innerHTML = "";
              document.getElementById("vv-modal-actions").innerHTML = "";
            }
          });
        }
      }, 100);
    } else {
      // fallback simple prompt if modal system not available
      alert("Modal system not available.");
    }
  }

  async function submitProductForm(form, method, url) {
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Form not found in DOM or is not a valid HTMLFormElement. This usually means the modal closed too early or the form could not be found. Please try again, and report this if it persists.");
    }
    const fd = new FormData(form);
    const featuresRaw = form.querySelector('[name="features"]').value || "";
    fd.set("features", JSON.stringify(featuresRaw.split("\n").map(s => s.trim()).filter(Boolean)));
    const res = await fetch(url, { method, credentials: "include", body: fd });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || `Status ${res.status}`);
    }
    if (window.htmlToast) htmlToast("Saved", { variant: "success" });
    loadProducts();
  }

  // ---------- COMMENTS ----------
  const commentsTbody = document.getElementById("commentsTbody");
  const commentFilter = document.getElementById("commentFilter");
  const refreshCommentsBtn = document.getElementById("refreshComments");

  async function loadComments() {
    try {
      const list = await fetchJson("/api/admin/comments/unreplied", { credentials: "include" });
      renderComments(list || []);
    } catch (err) {
      console.error("comments load", err);
      if (window.htmlAlert) htmlAlert("error", "Load comments failed", err.message || err.detail || "");
    }
  }

  function renderComments(list) {
    commentsTbody.innerHTML = "";
    list.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(c.userName || "User")}</td>
        <td>${escapeHtml((c.text || "").slice(0, 220))}</td>
        <td class="muted">${escapeHtml(String(c.product || c.productId || "-"))}</td>
        <td class="muted">${new Date(c.createdAt || Date.now()).toLocaleString()}</td>
        <td class="right nowrap">
          <button class="vv-btn" data-id="${c._id}" data-action="reply">Reply</button>
          <button class="vv-btn danger" data-id="${c._id}" data-pid="${c.product || c.productId}" data-action="delete">Delete</button>
        </td>
      `;
      commentsTbody.appendChild(tr);
    });

    commentsTbody.querySelectorAll("[data-action='reply']").forEach(b => {
      b.addEventListener("click", () => replyToComment(b.dataset.id));
    });

    commentsTbody.querySelectorAll("[data-action='delete']").forEach(b => {
      b.addEventListener("click", () => deleteComment(b.dataset.pid, b.dataset.id));
    });
  }

  async function replyToComment(id) {
    if (!window.htmlAlert) {
      const text = prompt("Reply text");
      if (!text) return;
      return sendReply(id, text);
    }

    const html = `
      <div style="display:flex;flex-direction:column;gap:8px">
        <label style="font-size:13px;font-weight:600">Enter your reply:</label>
        <textarea id="replyText" class="input" style="width:100%;min-height:100px;padding:8px;border-radius:6px;border:1px solid #ccc;background:#f9f9f9;color:#333" placeholder="Write a reply..."></textarea>
      </div>
      <script>
        setTimeout(() => document.getElementById('replyText')?.focus(), 50);
      </script>
    `;

    // We store the reply text in a global variable momentarily safely via closure or just read from DOM before close
    window.__replyTextVal = null;

    const ok = await htmlAlert("info", "Reply to Comment", html, {
      okText: "Send Reply",
      cancelText: "Cancel",
      onlyOk: false,
      beforeClose: () => {
        const el = document.getElementById("replyText");
        if (el) window.__replyTextVal = el.value.trim();
      }
    });

    if (!ok || !window.__replyTextVal) return;

    await sendReply(id, window.__replyTextVal);
    window.__replyTextVal = null;
  }

  async function sendReply(id, text) {
    try {
      const res = await fetch(`/api/admin/comments/${encodeURIComponent(id)}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Status ${res.status}`);
      }
      if (window.htmlToast) htmlToast("Replied successfully", { variant: "success" });
      loadComments();
    } catch (err) {
      if (window.htmlAlert) htmlAlert("error", "Reply failed", err.message || "");
      else alert("Reply failed: " + err.message);
    }
  }

  async function deleteComment(productId, commentId) {
    const ok = (window.htmlConfirm) ? await htmlConfirm("Delete comment?", "This will remove the comment permanently.") : confirm("Delete comment?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Status ${res.status}`);
      }
      if (window.htmlToast) htmlToast("Deleted", { variant: "success" });
      loadComments();
    } catch (err) {
      if (window.htmlAlert) htmlAlert("error", "Delete failed", err.message || "");
    }
  }

  refreshCommentsBtn.addEventListener("click", loadComments);
  commentFilter.addEventListener("input", async (e) => {
    const q = (e.target.value || "").toLowerCase();
    try {
      const list = await fetchJson("/api/admin/comments/unreplied", { credentials: "include" });
      const filtered = list.filter(c => (c.text || "").toLowerCase().includes(q) || (c.userName || "").toLowerCase().includes(q));
      renderComments(filtered);
    } catch (err) {
      if (window.htmlAlert) htmlAlert("error", "Filter failed", err.message || "");
    }
  });

  // ---------- STATISTICS ----------
  const statsWrap = document.getElementById("statsWrap");
  async function loadStats() {
    try {
      const s = await fetchJson("/api/admin/statistics", { credentials: "include" });
      const html = `
        <div class="stat-card">
          <div class="stat-value">${s.usersCount}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.productsCount}</div>
          <div class="stat-label">Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.commentsCount}</div>
          <div class="stat-label">Comments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.recentUsers}</div>
          <div class="stat-label">New Users (7d)</div>
        </div>
      `;
      statsWrap.innerHTML = html;
    } catch (err) {
      statsWrap.textContent = "Failed to load stats";
      console.error("stats", err);
    }
  }

  // ---------- DEVELOPER ----------
  document.getElementById("sendDev").addEventListener("click", async () => {
    const webhook = document.getElementById("devWebhook").value.trim();
    const message = document.getElementById("devMessage").value.trim();
    if (!webhook || !message) {
      if (window.htmlAlert) htmlAlert("error", "Missing", "Webhook and message required");
      return;
    }
    try {
      const res = await fetch("/api/admin/developer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhook, message })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Status ${res.status}`);
      }
      if (window.htmlToast) htmlToast("Sent", { variant: "success" });
    } catch (err) {
      if (window.htmlAlert) htmlAlert("error", "Send failed", err.message || "");
    }
  });

  // ---------- BANNED ----------
  const bannedTbody = document.getElementById("bannedTbody");
  async function loadBanned() {
    try {
      const list = await fetchJson("/api/admin/banned", { credentials: "include" });
      bannedTbody.innerHTML = "";
      list.forEach(b => {
        const tr = document.createElement("tr");
        const banType = b.banType || "permanent";
        const isExpired = b.expiresAt && new Date(b.expiresAt) <= new Date();
        const expiresText = b.expiresAt
          ? (isExpired ? " (Expired)" : ` (Expires: ${new Date(b.expiresAt).toLocaleString()})`)
          : " (Permanent)";
        tr.innerHTML = `
          <td><strong>${escapeHtml(b.user?.email || b.user?.name || "Snapshot")}</strong></td>
          <td class="muted">${escapeHtml(b.reason || "")}</td>
          <td class="muted">${new Date(b.bannedAt).toLocaleString()}</td>
          <td class="muted">${banType === "temporary" ? "Temporary" + expiresText : "Permanent"}</td>
          <td class="right nowrap">
            <button class="vv-btn" data-id="${b._id}" data-action="unban" data-loading="false">
              <span class="btn-text">Unban</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>
          </td>
        `;
        bannedTbody.appendChild(tr);
      });
      bannedTbody.querySelectorAll("[data-action='unban']").forEach(btn => {
        btn.addEventListener("click", async function () {
          // Prevent double-click
          if (this.dataset.loading === "true") return;
          this.dataset.loading = "true";
          const btnText = this.querySelector(".btn-text");
          const btnSpinner = this.querySelector(".btn-spinner");
          if (btnText) btnText.style.display = "none";
          if (btnSpinner) btnSpinner.style.display = "inline";
          this.disabled = true;

          try {
            await unbanUser(btn.dataset.id);
          } finally {
            // Reset button state after a delay
            setTimeout(() => {
              this.dataset.loading = "false";
              if (btnText) btnText.style.display = "inline";
              if (btnSpinner) btnSpinner.style.display = "none";
              this.disabled = false;
            }, 2000);
          }
        });
      });
    } catch (err) {
      console.error("loadBanned error", err);
      // If 403, might be a session issue
      if (err.status === 403 || err.message?.includes("403") || err.message?.includes("Access denied")) {
        console.warn("[BAN] Got 403 loading banned list, might be session issue.");
        if (window.htmlToast) {
          htmlToast("Session issue detected. Please refresh the page.", { variant: "error", duration: 5000 });
        }
      } else {
        if (window.htmlAlert) htmlAlert("error", "Load banned failed", err.message || "");
      }
    }
  }

  async function unbanUser(id) {
    try {
      // Get banned user info for display
      const bannedList = await fetchJson("/api/admin/banned", { credentials: "include" });
      const bannedUser = bannedList.find(b => String(b._id) === String(id));
      const userName = bannedUser?.user?.email || bannedUser?.user?.name || "User";

      const confirmMessage = `Are you sure you want to unban this user?\n\nUser: ${escapeHtml(userName)}\nReason: ${escapeHtml(bannedUser?.reason || "N/A")}\n\nThis will restore their account and data.`;
      const ok = (window.htmlConfirm)
        ? await htmlConfirm("Unban User", confirmMessage, { okText: "Unban", cancelText: "Cancel" })
        : confirm(confirmMessage);
      if (!ok) return;

      // Show loading toast
      let loadingToast = null;
      if (window.htmlToast) {
        loadingToast = htmlToast("⏳ Restoring user account...", { duration: 10000 });
      }

      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/unban`, {
          method: "POST",
          credentials: "include"
        });

        if (!res.ok) {
          let errorMessage = `Request failed with status ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            try {
              const errorText = await res.text();
              errorMessage = errorText || errorMessage;
            } catch (e2) {
              // Use default error message
            }
          }
          throw new Error(errorMessage);
        }

        const result = await res.json().catch(() => ({}));

        // Remove loading toast
        if (loadingToast && loadingToast.parentNode) {
          loadingToast.parentNode.removeChild(loadingToast);
        }

        // Show success
        if (window.htmlToast) {
          htmlToast(`✅ User unbanned successfully - Account restored`, { variant: "success", duration: 5000 });
        }

        // Refresh data
        await loadBanned();
        await loadUsers();

        // Show additional success message
        if (window.htmlToast) {
          setTimeout(() => {
            htmlToast("User list updated", { variant: "success", duration: 3000 });
          }, 500);
        }
      } catch (fetchErr) {
        // Remove loading toast
        if (loadingToast && loadingToast.parentNode) {
          loadingToast.parentNode.removeChild(loadingToast);
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error("unban error", err);
      if (window.htmlAlert) {
        htmlAlert("error", "Unban Failed", `Unable to unban user: ${err.message || "Unknown error"}\n\nPlease try again or check if the ban record still exists.`);
      } else {
        alert(`Unban failed: ${err.message || "Unknown error"}`);
      }
    }
  }

  // UTIL
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  // LOGOUT
  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.location.href = "/auth/logout";
  });

  // ---------- IMAGE CONVERTER ----------
  const dropZone = document.getElementById("dropZone");
  const converterInput = document.getElementById("converterInput");
  const previewArea = document.getElementById("previewArea");
  const previewGrid = document.getElementById("previewGrid");
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const customSizeInputs = document.getElementById("customSizeInputs");

  let convertedImages = [];

  // Quality slider
  if (qualitySlider) {
    qualitySlider.addEventListener("input", (e) => {
      qualityValue.textContent = e.target.value + "%";
    });
  }

  // Custom size toggle
  document.querySelectorAll('input[name="conversionMode"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (customSizeInputs) {
        customSizeInputs.style.display = e.target.value === "custom" ? "flex" : "none";
      }
    });
  });

  // Drop zone interactions
  if (dropZone) {
    dropZone.addEventListener("click", () => converterInput?.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--accent)";
      dropZone.style.background = "rgba(245, 200, 76, 0.1)";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "rgba(245, 200, 76, 0.3)";
      dropZone.style.background = "rgba(245, 200, 76, 0.05)";
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "rgba(245, 200, 76, 0.3)";
      dropZone.style.background = "rgba(245, 200, 76, 0.05)";

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (files.length) processImages(files);
    });
  }

  if (converterInput) {
    converterInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      if (files.length) processImages(files);
    });
  }

  function processImages(files) {
    convertedImages = [];
    previewGrid.innerHTML = "";
    previewArea.style.display = "block";

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const converted = convertImage(img, file.name, index);
          convertedImages.push(converted);
          renderPreview(converted, index);

          if (convertedImages.length > 1) {
            downloadAllBtn.style.display = "block";
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function convertImage(img, originalName, index) {
    const mode = document.querySelector('input[name="conversionMode"]:checked').value;
    let targetWidth, targetHeight;

    switch (mode) {
      case "800x600":
        targetWidth = 800;
        targetHeight = 600;
        break;
      case "1600x1200":
        targetWidth = 1600;
        targetHeight = 1200;
        break;
      case "custom":
        targetWidth = parseInt(document.getElementById("customWidth").value) || 1200;
        targetHeight = parseInt(document.getElementById("customHeight").value) || 900;
        break;
      default: // 1200x900
        targetWidth = 1200;
        targetHeight = 900;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    // Calculate scaling to cover (like object-fit: cover)
    const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (targetWidth - scaledWidth) / 2;
    const y = (targetHeight - scaledHeight) / 2;

    // Draw image
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    const quality = parseInt(qualitySlider.value) / 100;
    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    // Calculate file size
    const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
    const sizeInBytes = (base64Length * 3) / 4;
    const sizeInKB = (sizeInBytes / 1024).toFixed(1);

    return {
      dataUrl,
      name: originalName.replace(/\.[^/.]+$/, "") + `_${targetWidth}x${targetHeight}.jpg`,
      width: targetWidth,
      height: targetHeight,
      size: sizeInKB,
      index
    };
  }

  function renderPreview(converted, index) {
    const card = document.createElement("div");
    card.style.cssText = `
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-card);
    `;

    card.innerHTML = `
      <img src="${converted.dataUrl}" style="width:100%; height:150px; object-fit:cover; display:block;">
      <div style="padding:12px;">
        <div style="font-size:12px; font-weight:600; margin-bottom:4px; word-break:break-all;">${converted.name}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">
          ${converted.width}×${converted.height} • ${converted.size}KB
        </div>
        <button class="vv-btn" style="width:100%; padding:6px; font-size:12px;" onclick="downloadImage(${index})">
          Download
        </button>
      </div>
    `;

    previewGrid.appendChild(card);
  }

  window.downloadImage = function (index) {
    const img = convertedImages[index];
    if (!img) return;

    const link = document.createElement("a");
    link.download = img.name;
    link.href = img.dataUrl;
    link.click();
  };

  if (downloadAllBtn) {
    downloadAllBtn.addEventListener("click", () => {
      convertedImages.forEach((img, i) => {
        setTimeout(() => {
          const link = document.createElement("a");
          link.download = img.name;
          link.href = img.dataUrl;
          link.click();
        }, i * 200); // Stagger downloads
      });
    });
  }

  // ---------- ANNOUNCEMENTS ----------
  const announcementsTbody = document.getElementById("announcementsTbody");
  const announcementForm = document.getElementById("announcementForm");

  async function loadAnnouncements() {
    try {
      const list = await fetchJson("/api/admin/announcements", { credentials: "include" });
      renderAnnouncements(list || []);
    } catch (err) {
      console.error("loadAnnouncements", err);
      if (window.htmlAlert) htmlAlert("error", "Load announcements failed", err.message);
    }
  }

  function renderAnnouncements(list) {
    if (!announcementsTbody) return;
    announcementsTbody.innerHTML = "";
    if (list.length === 0) {
      announcementsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No announcements found</td></tr>';
      return;
    }

    list.forEach(a => {
      const tr = document.createElement("tr");
      const dotColor = a.isActive ? "#22c55e" : "#6b7280";
      const typeLabel = a.type.charAt(0).toUpperCase() + a.type.slice(1);

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:8px; height:8px; border-radius:50%; background:${dotColor}"></div>
            <span style="font-size:12px; color:${dotColor}">${a.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </td>
        <td style="font-weight:600">${escapeHtml(a.title)}</td>
        <td style="max-width:300px; font-size:13px; color:var(--text-muted)">${escapeHtml(a.message)}</td>
        <td><span class="product-tag" style="background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px; font-size:11px;">${typeLabel}</span></td>
        <td style="font-size:11px">${new Date(a.createdAt).toLocaleDateString()}</td>
        <td class="right">
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="vv-btn sm ghost" data-id="${a._id}" data-action="toggle-ann">${a.isActive ? 'Disable' : 'Enable'}</button>
            <button class="vv-btn danger sm" data-id="${a._id}" data-action="delete-ann">Delete</button>
          </div>
        </td>
      `;
      announcementsTbody.appendChild(tr);
    });

    announcementsTbody.querySelectorAll("[data-action='toggle-ann']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ann = list.find(x => x._id === id);
        try {
          await fetch(`/api/admin/announcements/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !ann.isActive }),
            credentials: "include"
          });
          if (window.htmlToast) htmlToast("Status updated", { variant: "success" });
          loadAnnouncements();
        } catch (err) {
          if (window.htmlAlert) htmlAlert("error", "Update failed", err.message);
        }
      });
    });

    announcementsTbody.querySelectorAll("[data-action='delete-ann']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ok = (window.htmlConfirm) ? await htmlConfirm("Delete announcement?", "This cannot be undone.") : confirm("Delete this announcement?");
        if (!ok) return;
        try {
          await fetch(`/api/admin/announcements/${id}`, { method: "DELETE", credentials: "include" });
          if (window.htmlToast) htmlToast("Announcement deleted", { variant: "success" });
          loadAnnouncements();
        } catch (err) {
          if (window.htmlAlert) htmlAlert("error", "Delete failed", err.message);
        }
      });
    });
  }

  if (announcementForm) {
    announcementForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        title: document.getElementById("annTitle").value,
        message: document.getElementById("annMessage").value,
        type: document.getElementById("annType").value,
        isActive: document.getElementById("annActive").checked
      };

      try {
        await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include"
        });
        if (window.htmlToast) htmlToast("Announcement created", { variant: "success" });
        announcementForm.reset();
        document.getElementById("annActive").checked = true;
        loadAnnouncements();
      } catch (err) {
        if (window.htmlAlert) htmlAlert("error", "Creation failed", err.message);
      }
    });
  }

  // INIT
  document.addEventListener("DOMContentLoaded", () => {
    showTab("users");

    // Fire off loads
    Promise.all([
      loadUsers(),
      loadProducts(),
      loadComments(),
      loadStats(),
      loadBanned(),
      loadOrders(),
      loadAnnouncements()
    ]).then(() => {
      // Once data is fetched (or at least requests started + small delay for effect)
      setTimeout(() => {
        const loader = document.getElementById("fire-loader");
        if (loader) loader.classList.add("slide-out");
        // Remove from DOM after transition
        setTimeout(() => { if (loader) loader.remove(); }, 800);
      }, 1000); // Wait 1s for the slide-in animation to be appreciated
    });
  });

})();

// Global state for product editor
let productEditorState = {
  mode: 'create',
  productId: null,
  existingUrls: [],
  newFiles: [],
  newFileUrls: [],
  selectedPrimary: 0
};

// Global functions for product editor modal
window.openProductEditor = function(productId = null) {
  const modal = document.getElementById('productEditorModal');
  const title = document.getElementById('productEditorTitle');
  const form = document.getElementById('productEditorForm');
  const idField = document.getElementById('productEditorId');
  const categorySelect = document.getElementById('productEditorCategorySelect');
  
  // Reset state
  productEditorState = {
    mode: productId ? 'edit' : 'create',
    productId: productId,
    existingUrls: [],
    newFiles: [],
    newFileUrls: [],
    selectedPrimary: 0
  };
  
  // Reset form
  form.reset();
  document.getElementById('productEditorImagePreview').innerHTML = '';
  document.getElementById('productEditorImageInput').value = '';
  idField.value = productId || '';
  
  // Initialize categories if empty
  if (categorySelect.options.length <= 1) {
    loadEditorCategories();
  }
  
  if (productId) {
    title.textContent = 'Edit Product';
    loadEditorProduct(productId);
  } else {
    title.textContent = 'Create Product';
  }
  
  modal.style.display = 'flex';
};

window.closeProductEditor = function() {
  const modal = document.getElementById('productEditorModal');
  modal.style.display = 'none';
  
  // Clean up object URLs
  productEditorState.newFileUrls.forEach(url => URL.revokeObjectURL(url));
};

// Functions to be used by admin-product-editor.js refactored code
window.loadEditorCategories = async function(selectedId = null) {
  const categorySelect = document.getElementById("productEditorCategorySelect");
  try {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) return;
    const categories = await res.json();
    
    categorySelect.innerHTML = '<option value="">-- No Category --</option>';
    
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c._id;
      opt.textContent = c.name;
      if (selectedId && c._id === selectedId) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load categories", err);
  }
};

window.loadEditorProduct = async function(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error("Failed to load product");
    const p = await res.json();
    await loadEditorCategories(p.category);
    populateEditorForm(p);
  } catch (err) {
    console.error(err);
    alert("Error loading product: " + err.message);
  }
};

window.populateEditorForm = function(p) {
  const form = document.getElementById('productEditorForm');
  form.elements.name.value = p.name || "";
  form.elements.subtitle.value = p.subtitle || "";
  form.elements.price.value = p.price || 0;
  form.elements.tag.value = p.tag || "";
  form.elements.features.value = (p.features || []).join("\n");
  form.elements.inStock.checked = p.inStock !== false;
  form.elements.isFeatured.checked = p.isFeatured === true;
  if (form.elements.category) form.elements.category.value = p.category || "";

  if (p.imageUrls && p.imageUrls.length) {
    productEditorState.existingUrls = [...p.imageUrls];
  } else if (p.imageUrl) {
    productEditorState.existingUrls = [p.imageUrl];
  }
  renderEditorPreviews();
};

