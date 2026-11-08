export class SettingsModule {
  constructor() {
    this.controlType = localStorage.getItem("retro_control_type") || "dpad";
    this.autoFire = localStorage.getItem("retro_autofire") === "true";
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

    const currentAutofireRadio = document.querySelector(`input[name="autofire-setting"][value="${String(this.autoFire)}"]`);
    if (currentAutofireRadio) currentAutofireRadio.checked = true;

    document.querySelectorAll('input[name="autofire-setting"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.autoFire = e.target.value === "true";
        localStorage.setItem("retro_autofire", String(this.autoFire));
      });
    });
  }

  getControlType() {
    return this.controlType;
  }

  getAutoFire() {
    return this.autoFire;
  }
}

