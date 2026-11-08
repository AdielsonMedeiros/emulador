export class SettingsModule {
  constructor() {
    this.controlType = localStorage.getItem("retro_control_type") || "dpad";
    this.modal = document.getElementById("settings-modal");
    this.btnOpen = document.getElementById("btn-open-settings");
    this.btnClose = document.getElementById("btn-close-settings");

    this.initListeners();
  }

  initListeners() {
    if (this.btnOpen && this.modal) {
      this.btnOpen.addEventListener("click", () => this.modal.classList.remove("hidden"));
    }
    if (this.btnClose && this.modal) {
      this.btnClose.addEventListener("click", () => this.modal.classList.add("hidden"));
    }
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.modal.classList.add("hidden");
      });
    }

    const currentRadio = document.querySelector(`input[name="control-type"][value="${this.controlType}"]`);
    if (currentRadio) currentRadio.checked = true;

    document.querySelectorAll('input[name="control-type"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.controlType = e.target.value;
        localStorage.setItem("retro_control_type", this.controlType);
      });
    });
  }

  getControlType() {
    return this.controlType;
  }
}

