const { ipcRenderer } = require("electron");

let hostname = document.getElementById("hostname");
let username = document.getElementById("username");
let password = document.getElementById("password");

ipcRenderer.on("fill-values", (event, arg) => {
  console.log(arg);
  hostname.value = arg.hostname;
  username.value = arg.username;
  password.value = arg.password;
});

document.getElementById("store").addEventListener("click", e => {
  let values = {
    hostname: hostname.value,
    username: username.value,
    password: password.value
  };
  ipcRenderer.sendSync("updated-values", values);
  window.close();
});

document.getElementById("cancel").addEventListener("click", e => {
  window.close();
});
