
(function () {
  function createModals() {
    if (window.__vv_modals_inited) return;
    window.__vv_modals_inited = true;

    const css = `
#vv-modal-backdrop { position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); z-index:9999; }
#vv-modal { width:min(780px,96vw); background:#fff; border-radius:12px; padding:18px; box-shadow:0 20px 60px rgba(2,6,23,0.2); font-family:Inter, system-ui, Arial; }
#vv-modal h3 { margin:0 0 8px 0; font-size:18px; }
#vv-modal .vv-body { margin-bottom:12px; color:#111827; font-size:14px; line-height:1.4; }
#vv-modal .vv-actions { display:flex; gap:8px; justify-content:flex-end; }
.vv-btn { padding:8px 12px; border-radius:8px; border:0; cursor:pointer; font-weight:700; background:#0f172a;color:#fff; }
.vv-btn.ghost { background:transparent;border:1px solid #e6eef6;color:#071127; }
.vv-btn.danger { background:#dc2626; color:#fff; }
#vv-toasts { position:fixed; right:18px; bottom:18px; z-index:10000; display:flex; flex-direction:column; gap:8px; }
.vv-toast { min-width:160px; padding:10px 12px; border-radius:8px; background:#111827; color:#fff; box-shadow:0 6px 20px rgba(2,6,23,0.2); font-size:13px; }
.vv-toast.success { background:#059669; }
.vv-toast.error { background:#dc2626; }
`;
    const style = document.createElement("style");
    style.id = "vv-modal-styles";
    style.innerText = css;
    document.head.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.id = "vv-modal-backdrop";
    backdrop.innerHTML = `
      <div id="vv-modal" role="dialog" aria-modal="true" aria-labelledby="vv-modal-title">
        <h3 id="vv-modal-title"></h3>
        <div class="vv-body" id="vv-modal-text"></div>
        <div class="vv-actions" id="vv-modal-actions"></div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const toasts = document.createElement("div");
    toasts.id = "vv-toasts";
    document.body.appendChild(toasts);

    function closeModal() {
      backdrop.style.display = "none";
      document.getElementById("vv-modal-title").textContent = "";
      document.getElementById("vv-modal-text").innerHTML = "";
      document.getElementById("vv-modal-actions").innerHTML = "";
    }

    async function htmlAlert(type = "info", title = "", text = "", opts = {}) {
      return new Promise((resolve) => {
        const actions = document.getElementById("vv-modal-actions");
        const titleEl = document.getElementById("vv-modal-title");
        const textEl = document.getElementById("vv-modal-text");

        titleEl.textContent = title || (type === "error" ? "Error" : "Notice");
        if (typeof text === "string") textEl.innerHTML = text;
        else textEl.innerHTML = text || "";

        actions.innerHTML = "";
        const ok = document.createElement("button");
        ok.className = "vv-btn";
        ok.textContent = opts.okText || "OK";
        ok.onclick = () => {
          if (opts.beforeClose && typeof opts.beforeClose === "function") {
            opts.beforeClose();
          }
          closeModal();
          resolve(true);
        };
        const cancel = document.createElement("button");
        cancel.className = "vv-btn ghost";
        cancel.textContent = opts.cancelText || "Cancel";
        cancel.onclick = () => {
          closeModal();
          resolve(false);
        };
        if (opts.onlyOk) actions.appendChild(ok);
        else {
          actions.appendChild(cancel);
          actions.appendChild(ok);
        }

        backdrop.style.display = "flex";
        ok.focus();
      });
    }

    async function htmlConfirm(title = "Confirm", text = "", opts = {}) {
      const ok = await htmlAlert("confirm", title, text, { okText: opts.okText || "OK", cancelText: opts.cancelText || "Cancel", onlyOk: false });
      return !!ok;
    }

    function htmlToast(message = "", options = {}) {
      const t = document.createElement("div");
      t.className = "vv-toast";
      if (options.variant === "success") t.classList.add("success");
      if (options.variant === "error") t.classList.add("error");
      t.textContent = message;
      const container = document.getElementById("vv-toasts");
      container.appendChild(t);
      const ms = options.duration || 3500;
      setTimeout(() => {
        t.style.transition = "opacity 200ms, transform 200ms";
        t.style.opacity = 0;
        t.style.transform = "translateY(8px)";
        setTimeout(() => {
          if (container && t.parentNode === container) {
            container.removeChild(t);
          }
        }, 220);
      }, ms);
      return t;
    }

    window.htmlAlert = htmlAlert;
    window.htmlConfirm = htmlConfirm;
    window.htmlToast = htmlToast;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createModals);
  } else {
    createModals();
  }
})();
