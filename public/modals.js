

(function () {
  function createModals() {

    if (window.__vv_modals_inited) return;
    window.__vv_modals_inited = true;


const css = `
#vv-modal-backdrop { 
  position:fixed; inset:0; display:none; align-items:center; justify-content:center; 
  background:rgba(0,0,0,0.8); z-index:9999; backdrop-filter: blur(8px);
  padding: 20px;
}

#vv-modal { 
  width: min(560px, 100%); 
  max-height: 90vh;
  overflow-y: auto;
  background: #11111a; 
  border: 1px solid rgba(255,255,255,0.08); 
  border-radius: 24px; 
  padding: 32px; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
  font-family: inherit; 
  color: #f9fafb;
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

#vv-modal h3 { 
  margin: 0 0 16px 0; 
  font-size: 1.5rem; 
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.02em;
}

#vv-modal .vv-body { 
  margin-bottom: 24px; 
  color: #9ca3af; 
  font-size: 1rem; 
  line-height: 1.6; 
}

#vv-modal .vv-actions { 
  display: flex; 
  gap: 12px; 
  justify-content: flex-end; 
  margin-top: 32px;
}

.vv-btn { 
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px; 
  border-radius: 999px; 
  border: 0; 
  cursor: pointer; 
  font-weight: 600; 
  font-size: 0.95rem;
  background: #f5c84c; 
  color: #000; 
  transition: all 0.2s ease;
}

.vv-btn:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 16px rgba(245, 200, 76, 0.25);
}

.vv-btn:active {
  transform: translateY(0);
}

.vv-btn.ghost { 
  background: transparent; 
  border: 1px solid rgba(255,255,255,0.15); 
  color: #e5e7eb; 
}

.vv-btn.ghost:hover { 
  background: rgba(255,255,255,0.05); 
  border-color: #fff;
  color: #fff;
  box-shadow: none;
}

.vv-btn.danger { 
  background: #ef4444; 
  color: #fff; 
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.vv-btn.danger:hover {
  background: #dc2626;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

#vv-toasts { 
  position: fixed; 
  right: 24px; 
  bottom: 24px; 
  z-index: 10000; 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  pointer-events: none;
}

.vv-toast { 
  pointer-events: auto;
  min-width: 260px; 
  padding: 16px 20px; 
  border-radius: 16px; 
  background: rgba(17, 17, 26, 0.95); 
  backdrop-filter: blur(12px);
  color: #fff; 
  box-shadow: 0 15px 30px rgba(0,0,0,0.3); 
  font-size: 0.9rem; 
  border: 1px solid rgba(255,255,255,0.08); 
  display: flex;
  align-items: center;
  animation: toastSlide 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes toastSlide {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.vv-toast.success { border-left: 4px solid #10b981; }
.vv-toast.error { border-left: 4px solid #ef4444; }

/* Mobile Reponsiveness */
@media (max-width: 640px) {
  #vv-modal { 
    width: 100%; 
    padding: 24px; 
    border-radius: 20px;
    margin: 10px;
  }
  
  #vv-modal h3 {
    font-size: 1.25rem;
  }
  
  #vv-modal .vv-actions { 
    flex-direction: column; 
    gap: 10px;
  }
  
  .vv-btn { 
    width: 100%; 
    padding: 14px;
    font-size: 1rem;
  }
  
  #vv-toasts {
    left: 20px;
    right: 20px;
    bottom: 20px;
    align-items: stretch;
  }
  
  .vv-toast {
    width: 100%;
    justify-content: center;
  }
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

