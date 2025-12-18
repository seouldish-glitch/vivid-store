

(function () {
  function createModals() {

    if (window.__vv_modals_inited) return;
    window.__vv_modals_inited = true;


const css = `
#vv-modal-backdrop { 
  position:fixed; top:0; left:0; right:0; bottom:0; 
  display:none; align-items:center; justify-content:center; 
  background:rgba(0,0,0,0.85); z-index:9999; backdrop-filter: blur(5px);
  padding: 10px; 
}

#vv-modal { 
  width: 100%;
  max-width: 400px;
  max-height: 85vh;
  overflow-y: auto;
  
  background: #11111a; 
  border: 1px solid rgba(255,255,255,0.08); 
  border-radius: 16px; 
  padding: 20px; 
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7); 
  
  font-family: inherit; 
  color: #f9fafb;
  position: relative;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.94) translateY(4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

#vv-modal h3 { 
  margin: 0 0 8px 0; 
  font-size: 1.1rem; 
  font-weight: 600; 
  color: #fff; 
  letter-spacing: -0.01em; 
}

#vv-modal .vv-body { 
  margin-bottom: 20px; 
  color: #cbd5e1; 
  font-size: 0.9rem; 
  line-height: 1.5; 
}

#vv-modal .vv-actions { 
  display: flex; 
  gap: 8px; 
  justify-content: flex-end; 
}

.vv-btn { 
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px; 
  border-radius: 8px; 
  border: 0; 
  cursor: pointer; 
  font-weight: 600; 
  font-size: 0.85rem; 
  background: #f5c84c; 
  color: #050509; 
  transition: all 0.15s ease;
}

.vv-btn:active { transform: scale(0.96); }

.vv-btn.ghost { 
  background: transparent; 
  border: 1px solid rgba(255,255,255,0.1); 
  color: #e2e8f0; 
}

.vv-btn.danger { background: #ef4444; color: #fff; }

#vv-toasts { 
  position: fixed; 
  right: 16px; 
  bottom: 16px; 
  z-index: 10000; 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  pointer-events: none;
}

.vv-toast { 
  pointer-events: auto;
  background: #1e1e2d;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 25px rgba(0,0,0,0.4);
  padding: 12px 16px; 
  border-radius: 8px; 
  font-size: 0.85rem; 
  display: flex;
  align-items: center;
  max-width: 320px;
  animation: toastSlide 0.25s ease-out;
}

@keyframes toastSlide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.vv-toast.success { border-left: 3px solid #10b981; }
.vv-toast.error { border-left: 3px solid #ef4444; }


@media (max-width: 600px) {
  #vv-modal {
    margin: 16px; 
    width: auto; 
  }
  
  #vv-modal .vv-actions {
    margin-top: 16px;
  }
  
  .vv-btn {
    flex: 1; 
    padding: 10px;
  }

  #vv-toasts {
    left: 16px;
    right: 16px;
    align-items: center;
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

