const Store = require("electron-store");
let store = new Store({
  defaults: {
    hostname: "",
    password: "",
    username: "",
    first_time: true
  }
});

let hostname = document.getElementById("hostname");
let username = document.getElementById("username");
let password = document.getElementById("pass");

hostname.value = store.get("hostname");
username.value = store.get("username");
password.value = store.get("password");

document.getElementById("store").addEventListener("click", e => {
  store.set("hostname", hostname.value);
  store.set("username", username.value);
  store.set("password", password.value);
  window.close();
});
