export function getAnalogGamepadSettings(core) {
  if (core === "segaMD") {
    return [
      { type: "button", text: "C", id: "c", location: "right", top: 40, left: 80, bold: true, input_value: 8 },
      { type: "button", text: "B", id: "b", location: "right", top: 80, left: 40, bold: true, input_value: 1 },
      { type: "button", text: "A", id: "a", location: "right", top: 40, bold: true, input_value: 0 },
      { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
      { type: "button", text: "Start", id: "start", location: "center", left: 30, fontSize: 15, block: true, input_value: 3 }
    ];
  }

  if (core === "gb") {
    return [
      { type: "button", text: "A", id: "a", location: "right", left: 81, top: 40, bold: true, input_value: 8 },
      { type: "button", text: "B", id: "b", location: "right", left: 10, top: 70, bold: true, input_value: 0 },
      { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
      { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
      { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 }
    ];
  }

  // Default SNES
  return [
    { type: "button", text: "X", id: "x", location: "right", left: 40, bold: true, input_value: 9 },
    { type: "button", text: "Y", id: "y", location: "right", top: 40, bold: true, input_value: 0 },
    { type: "button", text: "B", id: "b", location: "right", top: 80, left: 40, bold: true, input_value: 1 },
    { type: "button", text: "A", id: "a", location: "right", top: 40, left: 80, bold: true, input_value: 8 },
    { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
    { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
    { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 },
    { type: "button", text: "L", id: "l", location: "left", left: 3, top: -90, bold: true, block: true, input_value: 10 },
    { type: "button", text: "R", id: "r", location: "right", right: 3, top: -90, bold: true, block: true, input_value: 11 }
  ];
}
