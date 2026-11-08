/**
 * Gamepad Configuration Factory for EmulatorJS
 * Provides 100% calibrated virtual gamepad layouts per emulation core.
 */

export function getVirtualGamepadSettings(core) {
  const stickDigital = {
    type: "zone",
    id: "stick",
    location: "left",
    left: "50%",
    top: "50%",
    joystickInput: false,
    inputValues: [4, 5, 6, 7], // Up (4), Down (5), Left (6), Right (7)
    color: "#6366f1"
  };

  const stickAnalogN64 = {
    type: "zone",
    id: "stick",
    location: "left",
    left: "50%",
    top: "50%",
    joystickInput: true,
    inputValues: [16, 17, 18, 19], // LeftStick X-, LeftStick X+, LeftStick Y-, LeftStick Y+
    color: "#6366f1"
  };

  switch (core) {
    case "mgba":
    case "gba":
      return [
        { ...stickDigital },
        { type: "button", text: "B", id: "b", location: "right", left: 10, top: 70, bold: true, input_value: 0 },
        { type: "button", text: "A", id: "a", location: "right", left: 81, top: 40, bold: true, input_value: 8 },
        { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
        { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 },
        { type: "button", text: "L", id: "l", location: "left", left: 3, top: -90, bold: true, block: true, input_value: 10 },
        { type: "button", text: "R", id: "r", location: "right", right: 3, top: -90, bold: true, block: true, input_value: 11 }
      ];

    case "gb":
      return [
        { ...stickDigital },
        { type: "button", text: "A", id: "a", location: "right", left: 81, top: 40, bold: true, input_value: 8 },
        { type: "button", text: "B", id: "b", location: "right", left: 10, top: 70, bold: true, input_value: 0 },
        { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
        { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 }
      ];

    case "segaMD":
      return [
        { ...stickDigital },
        { type: "button", text: "A", id: "a", location: "right", right: 145, top: 70, bold: true, input_value: 1 },
        { type: "button", text: "B", id: "b", location: "right", right: 75, top: 70, bold: true, input_value: 0 },
        { type: "button", text: "C", id: "c", location: "right", right: 5, top: 70, bold: true, input_value: 8 },
        { type: "button", text: "X", id: "x", location: "right", right: 145, top: 0, bold: true, input_value: 10 },
        { type: "button", text: "Y", id: "y", location: "right", right: 75, top: 0, bold: true, input_value: 9 },
        { type: "button", text: "Z", id: "z", location: "right", right: 5, top: 0, bold: true, input_value: 11 },
        { type: "button", text: "Mode", id: "mode", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 },
        { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 }
      ];

    case "n64":
      return [
        { ...stickAnalogN64 },
        { type: "button", text: "B", id: "b", location: "right", left: -10, top: 95, input_value: 1, bold: true },
        { type: "button", text: "A", id: "a", location: "right", left: 40, top: 150, input_value: 0, bold: true },
        { type: "button", text: "Start", id: "start", location: "center", left: 30, top: -10, fontSize: 15, block: true, input_value: 3 },
        { type: "button", text: "L", id: "l", block: true, location: "top", left: 10, top: -40, bold: true, input_value: 10 },
        { type: "button", text: "R", id: "r", block: true, location: "top", right: 10, top: -40, bold: true, input_value: 11 },
        { type: "button", text: "Z", id: "z", block: true, location: "top", left: 10, bold: true, input_value: 12 },
        { fontSize: 20, type: "button", text: "CU", id: "cu", joystickInput: true, location: "right", left: 25, top: -65, input_value: 23 },
        { fontSize: 20, type: "button", text: "CD", id: "cd", joystickInput: true, location: "right", left: 25, top: 15, input_value: 22 },
        { fontSize: 20, type: "button", text: "CL", id: "cl", joystickInput: true, location: "right", left: -15, top: -25, input_value: 21 },
        { fontSize: 20, type: "button", text: "CR", id: "cr", joystickInput: true, location: "right", left: 65, top: -25, input_value: 20 }
      ];

    case "snes9x":
    default:
      return [
        { ...stickDigital },
        { type: "button", text: "X", id: "x", location: "right", left: 40, bold: true, input_value: 9 },
        { type: "button", text: "Y", id: "y", location: "right", top: 40, bold: true, input_value: 1 },
        { type: "button", text: "A", id: "a", location: "right", left: 81, top: 40, bold: true, input_value: 8 },
        { type: "button", text: "B", id: "b", location: "right", left: 40, top: 80, bold: true, input_value: 0 },
        { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
        { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 },
        { type: "button", text: "L", id: "l", location: "left", left: 3, top: -100, bold: true, block: true, input_value: 10 },
        { type: "button", text: "R", id: "r", location: "right", right: 3, top: -100, bold: true, block: true, input_value: 11 }
      ];
  }
}

