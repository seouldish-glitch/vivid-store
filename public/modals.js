
(function () {
  function createModals() {
    if (window.__vv_modals_inited) return;
    window.__vv_modals_inited = true;



    const css = `

#vv-modal-backdrop { box-sizing:border-box; position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); z-index:9999; padding:10px; }
#vv-modal { box-sizing:border-box; width:min(640px, 100%); background:#fff; border-radius:16px; padding:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); font-family:Inter, system-ui, Arial; max-height:90vh; overflow-y:auto; display:flex; flex-direction:column; margin:auto; }
#vv-modal * { box-sizing: border-box; }
#vv-modal h3 { margin:0 0 12px 0; font-size:20px; font-weight:700; color:#111827; letter-spacing:-0.025em; word-wrap:break-word; }
#vv-modal .vv-body { margin-bottom:24px; color:#374151; font-size:15px; line-height:1.6; word-wrap:break-word; overflow-x:hidden; }
#vv-modal .vv-body img { max-width:100%; height:auto; }
#vv-modal .vv-actions { display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap; }
.vv-btn { padding:10px 18px; border-radius:10px; border:0; cursor:pointer; font-weight:600; background:#0f172a; color:#fff; font-size:14px; transition:all 0.2s; box-shadow:0 1px 2px 0 rgba(0,0,0,0.05); }
.vv-btn:hover { opacity:0.9; transform:translateY(-1px); }
.vv-btn:active { transform:translateY(0); }
.vv-btn.ghost { background:transparent; border:1px solid #e2e8f0; color:#0f172a; box-shadow:none; }
.vv-btn.ghost:hover { background:#f8fafc; border-color:#cbd5e1; }
.vv-btn.danger { background:#dc2626; color:#fff; }
.vv-btn.danger:hover { background:#b91c1c; }
#vv-toasts { position:fixed; right:20px; bottom:20px; z-index:10000; display:flex; flex-direction:column; gap:10px; pointer-events:none; }
.vv-toast { min-width:200px; padding:14px 18px; border-radius:10px; background:#111827; color:#fff; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); font-size:14px; font-weight:500; pointer-events:auto; display:flex; align-items:center; gap:8px; animation: slideInToast 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.vv-toast.success { background:#059669; }
.vv-toast.error { background:#dc2626; }
@keyframes slideInToast { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@media (max-width: 600px) {
  #vv-modal { width: 100%; max-width: 100%; margin: 0; border-radius: 16px; padding: 20px; }
  #vv-modal h3 { font-size: 19px; }
  .vv-btn { flex: 1 1 100%; text-align: center; justify-content: center; padding: 14px; margin-bottom: 4px; }
  #vv-modal .vv-actions { width: 100%; gap: 8px; }
  #vv-toasts { left: 16px; right: 16px; bottom: 20px; align-items: center; }
  .vv-toast { width: 100%; justify-content: center; }
}

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
