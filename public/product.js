const WHATSAPP_PHONE = "9477XXXXXXX";

function formatPrice(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-LK");
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const productId = getQueryParam("pid");

let currentReplyTo = null;
let currentReplyToName = null;
let commentTextElGlobal = null;
let commentStatusElGlobal = null;

let slideIndex = 0;

window.changeSlide = function (n) {
  showSlides(slideIndex += n);
};

window.goToSlide = function (n) {
  showSlides(slideIndex = n);
};

function showSlides(n) {
  const slides = document.getElementsByClassName("carousel-slide");
  const thumbs = document.getElementsByClassName("carousel-thumb-item");
  if (!slides.length) return;

  if (n >= slides.length) slideIndex = 0;
  if (n < 0) slideIndex = slides.length - 1;

  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.remove("active");
    slides[i].style.display = "none";
  }

  for (let i = 0; i < thumbs.length; i++) {
    thumbs[i].classList.remove("active");
  }

  slides[slideIndex].style.display = "block";
  slides[slideIndex].classList.add("active");

  if (thumbs.length > 0 && thumbs[slideIndex]) {
    thumbs[slideIndex].classList.add("active");
  }
}

async function loadProduct() {
  const container = document.getElementById("detailContainer");
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!productId) {
    if (container) container.innerHTML = "<p>Product not found.</p>";
    return;
  }

  try {
    const res = await fetch("/api/products/" + productId);
    if (!res.ok) {
      if (container) container.innerHTML = "<p>Product not found.</p>";
      return;
    }
    const p = await res.json();

    if (!container) return;

    const imageUrls = Array.isArray(p.imageUrls) && p.imageUrls.length > 0
      ? p.imageUrls
      : (p.imageUrl ? [p.imageUrl] : []);

    let imageHtml = '';

    if (imageUrls.length === 0) {
      imageHtml = `<div class="detail-image" style="display:flex;align-items:center;justify-content:center;font-size:13px;color:#9ca3af;height:100%;">No image</div>`;
    } else {
      const slides = imageUrls.map((url, idx) => `
        <img src="${url}" class="carousel-slide ${idx === 0 ? 'active' : ''}" alt="${p.name} - ${idx + 1}" data-index="${idx}">
      `).join("");

      const thumbsHtml = imageUrls.length > 1 ? `
        <div class="carousel-thumbs-row">
          ${imageUrls.map((url, idx) => `
            <div class="carousel-thumb-item ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})">
              <img src="${url}" alt="Thumb ${idx + 1}">
            </div>
          `).join("")}
        </div>
      ` : '';

      imageHtml = `
        <div class="carousel-wrapper">
          <div class="carousel-main-display">
            ${slides}
          </div>
          ${thumbsHtml}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="detail-layout">
        <div class="detail-image-wrap">
          ${imageHtml}
        </div>
        <div class="detail-info">
          <h1 class="detail-name">${p.name}</h1>
          <p class="detail-subtitle">${p.subtitle || ""}</p>
          <div class="detail-price">${formatPrice(p.price)}</div>
          ${p.inStock === false ? '<div class="product-tag out-of-stock" style="margin:8px 0;display:inline-flex;">Out of Stock</div>' : ''}
          <ul class="detail-features">
            ${(p.features || []).map((f) => `<li>${f}</li>`).join("")}
          </ul>
          <div class="detail-actions">
            <button id="detailWhatsapp" class="btn-primary" ${p.inStock === false ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              ${p.inStock === false ? 'Out of Stock' : 'Order via WhatsApp'}
            </button>
            <a href="/" class="btn-outline">Back to store</a>
          </div>
        </div>
      </div>
    `;

    const waBtn = document.getElementById("detailWhatsapp");
    if (waBtn && p.inStock !== false) {
      waBtn.addEventListener("click", () => {
        const messageLines = [
          "Hello, I'm interested in this product:",
          "",
          p.name,
          p.subtitle || "",
          "",
          "Price: " + formatPrice(p.price),
        ];
        const message = encodeURIComponent(messageLines.join("\n"));
        window.location.href = `https://wa.me/${WHATSAPP_PHONE}?text=${message}`;
      });
    }
  } catch (err) {
    console.error("Error loading product", err);
    if (container) container.innerHTML = "<p>Error loading product.</p>";
  }
}

async function loadComments() {
  if (!productId) return;

  try {
    const res = await fetch(`/api/products/${productId}/comments`, {
      credentials: "include",
    });

    if (!res.ok) {
      console.error("Failed to load comments", res.status);
      return;
    }

    const comments = await res.json();
    renderComments(comments);
  } catch (e) {
    console.error("Failed to load comments", e);
  }
}

function renderComments(comments) {
  const container = document.getElementById("commentsList");
  if (!container) return;

  container.innerHTML = "";

  if (!comments || comments.length === 0) {
    container.innerHTML =
      '<p class="comment-status">No comments yet. Be the first to comment!</p>';
    return;
  }

  for (const c of comments) {
    const div = document.createElement("div");
    const isReply = !!c.parentCommentId;
    const isAdmin = !!c.isAdmin;
    const isAdminReply = !!c.isAdminReply;

    div.className = isReply
      ? "comment-item comment-item-reply"
      : "comment-item";

    const dateStr = new Date(c.createdAt).toLocaleString();

    const nameClass = isAdmin
      ? "comment-name comment-name-admin"
      : "comment-name";

    const avatarSrc = c.avatarUrl || c.userPicture || "/default-user.jpeg";

    const deleteBtnHtml = c.canDelete
      ? `<button class="comment-delete" data-id="${c.id}" title="Delete comment" aria-label="Delete comment">
           🗑
         </button>`
      : "";

    const replyBtnHtml = c.canReply
      ? `<button class="comment-reply" data-id="${c.id}" data-user="${escapeHtml(
        c.userName || "User"
      )}" title="Reply as admin" aria-label="Reply as admin">
           ↩
         </button>`
      : "";

    const replyLabel =
      isReply && c.parentCommentUserName
        ? `<div class="comment-reply-label">Replying to ${escapeHtml(
          c.parentCommentUserName
        )}</div>`
        : "";

    const badgeHtml = isAdmin
      ? `<span class="comment-badge">${isAdminReply ? "Admin reply" : "Admin"}</span>`
      : "";

    div.innerHTML = `
      <img class="comment-avatar" src="${avatarSrc}" alt="avatar">
      <div>
        <div class="comment-meta">
          <span class="${nameClass}">
            ${escapeHtml(c.userName || "User")}
          </span>
          ${badgeHtml}
          <span> · ${dateStr}</span>
          ${replyBtnHtml}
          ${deleteBtnHtml}
        </div>
        ${replyLabel}
        <div class="comment-text">${escapeHtml(c.text || "")}</div>
      </div>
    `;

    const delBtn = div.querySelector(".comment-delete");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        const ok = window.htmlConfirm
          ? await htmlConfirm("Delete Comment", "Are you sure you want to delete this comment?")
          : confirm("Delete this comment?");

        if (!ok) return;

        try {
          const res = await fetch(
            `/api/products/${productId}/comments/${c.id}`,
            {
              method: "DELETE",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (res.status === 401) {
            if (window.htmlAlert) await htmlAlert("error", "Not Logged In", "Please log in to delete comments.");
            else alert("Please log in to delete comments.");
            return;
          }
          if (res.status === 403) {
            if (window.htmlAlert) await htmlAlert("error", "Permission Denied", "You are not allowed to delete this comment.");
            else alert("You are not allowed to delete this comment.");
            return;
          }
          if (!res.ok) {
            if (window.htmlAlert) await htmlAlert("error", "Error", "Failed to delete comment.");
            else alert("Failed to delete comment.");
            return;
          }

          if (window.htmlToast) htmlToast("Comment deleted", { variant: "success" });
          await loadComments();
        } catch (e) {
          console.error("Error deleting comment", e);
          if (window.htmlAlert) await htmlAlert("error", "Error", "An unexpected error occurred while deleting.");
          else alert("Error deleting comment.");
        }
      });
    }

    const replyBtn = div.querySelector(".comment-reply");
    if (replyBtn && commentTextElGlobal && commentStatusElGlobal) {
      replyBtn.addEventListener("click", () => {
        currentReplyTo = c.id;
        currentReplyToName = c.userName || "User";

        commentStatusElGlobal.textContent = `Replying to ${currentReplyToName}`;
        commentStatusElGlobal.className = "comment-status";

        commentTextElGlobal.focus();
      });
    }

    container.appendChild(div);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function initCommentForm() {
  const textEl = document.getElementById("commentText");
  const submitBtn = document.getElementById("commentSubmit");
  const statusEl = document.getElementById("commentStatus");

  if (!textEl || !submitBtn || !statusEl || !productId) return;

  commentTextElGlobal = textEl;
  commentStatusElGlobal = statusEl;

  submitBtn.addEventListener("click", async () => {
    const text = textEl.value.trim();
    statusEl.textContent = "";
    statusEl.className = "comment-status";

    if (!text) {
      statusEl.textContent = "Please enter a comment.";
      statusEl.classList.add("error");
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          parentCommentId: currentReplyTo,
        }),
      });

      if (res.status === 401) {
        if (window.htmlConfirm) {
          const doLogin = await htmlConfirm("Login Required", "You must be logged in to post a comment. Would you like to log in now?", { okText: "Login", cancelText: "Cancel" });
          if (doLogin) window.location.href = "/login";
        } else {
          alert("Please log in to comment.");
        }
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        const msg = data.error || "Comment blocked by moderation.";
        if (window.htmlAlert) await htmlAlert("error", "Comment Blocked", msg + (data.banType === 'temporary' ? " You have been temporarily banned." : ""));
        else alert(msg);

        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        const msg = data.error || "You must wait before commenting again.";
        if (window.htmlAlert) await htmlAlert("error", "Slow Down", msg);
        else statusEl.textContent = msg;
        statusEl.classList.add("error");
        return;
      }

      if (!res.ok) {
        if (window.htmlAlert) await htmlAlert("error", "Error", "Failed to post comment.");
        statusEl.textContent = "Failed to post comment.";
        statusEl.classList.add("error");
        return;
      }

      textEl.value = "";
      currentReplyTo = null;
      currentReplyToName = null;

      if (window.htmlToast) htmlToast("Comment posted successfully!", { variant: "success" });
      statusEl.textContent = "";
      statusEl.className = "comment-status";

      await loadComments();
    } catch (e) {
      console.error("Error posting comment", e);
      if (window.htmlAlert) await htmlAlert("error", "Error", "Error posting comment. Please try again.");
      else statusEl.textContent = "Error posting comment.";
      statusEl.classList.add("error");
    }
  });
}

async function initAuthUI() {
  try {
    const res = await fetch("/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error("auth/me failed");

    const data = await res.json();

    const loginBtn = document.getElementById("loginBtn");
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
      if (userPic) userPic.src = "/default-user.jpeg";
    }
  } catch (err) {
    console.error("Auth UI error:", err);
    // Fallback on error
    const userInfo = document.getElementById("userInfo");
    const loginBtn = document.getElementById("loginBtn");
    if (userInfo) userInfo.style.display = "none";
    if (loginBtn) loginBtn.classList.remove("hidden");
  }
}

const loginBtn = document.getElementById("loginBtn");
loginBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/login";
});

function createSnowflakes() {
  const snowflakeCount = 50;
  for (let i = 0; i < snowflakeCount; i++) {
    const flake = document.createElement("div");
    flake.classList.add("snowflake");

    const size = Math.random() * 3 + 2 + "px";
    flake.style.width = size;
    flake.style.height = size;
    flake.style.left = Math.random() * 100 + "vw";
    flake.style.animationDuration = Math.random() * 5 + 5 + "s";
    flake.style.animationDelay = Math.random() * 5 + "s";
    flake.style.opacity = Math.random() * 0.5 + 0.3;

    document.body.appendChild(flake);
  }
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
  initAuthUI();
  loadProduct();
  loadComments();
  initCommentForm();
  initAnnouncements();
  createSnowflakes();

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

  const page = document.querySelector(".page");
  if (page) {
    setTimeout(() => page.classList.add("loaded"), 100);
  }

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll(".reveal-on-scroll").forEach(el => scrollObserver.observe(el));
});
