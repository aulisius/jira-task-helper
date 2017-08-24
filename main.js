const { app, Tray, Menu, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");
const platformInfo = require("electron-platform");
const JIRAService = require("./service");

const iconPath = platformInfo.isWin32
  ? path.join(__dirname, "build", "icon.ico")
  : path.join(__dirname, "build", "icons", "32x32.png");

const store = new Store({
  defaults: {
    hostname: "",
    password: "",
    username: "",
    first_time: true
  }
});
const service = new JIRAService(store.store);
let appTray = null;
let win = null;
let configureWindow = null;

const validateConfiguration = (type, value) => {
  if (type === "hostname") {
  }
};

const configureHelper = () => {
  if (configureWindow) {
    configureWindow.focus();
    return;
  }
  configureWindow = new BrowserWindow({
    width: 400,
    height: 250,
    title: "Configure the JIRA Helper",
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false
    },
    alwaysOnTop: false,
    frame: true
  });
  configureWindow.loadURL(
    "file://" + path.join(__dirname, "public", "configure.html")
  );
  configureWindow.webContents.on("did-finish-load", () => {
    configureWindow.webContents.send("fill-values", store.store);
  });
  ipcMain.on("updated-values", (event, arg) => {
    console.log("Configuration updated. Refreshing list");
    store.set("first_time", false);
    store.set(arg);
    service.opts = store.store;
    event.returnValue = true;
    getAllIssues();
  });
  configureWindow.on("closed", () => {
    configureWindow = null;
  });
};

const commonMenu = [
  {
    label: "Configure",
    click: configureHelper
  },
  {
    label: "Refresh",
    click: getAllIssues
  },
  {
    role: "quit"
  }
];

function getAllIssues() {
  appTray.setToolTip("Loading your issues...");
  appTray.setContextMenu(Menu.buildFromTemplate(commonMenu));
  service
    .fetchMyJIRAIssues()
    .then((issues = []) =>
      issues.map(({ summary, key, transitions = [] }) => ({
        label: `[${key}] ${summary}`,
        submenu: [
          ...transitions.map(({ name, id }) => ({
            label: `Mark as '${name}'`,
            click: () => service.doTransition(key, id).then(getAllIssues)
          })),
          { type: "separator" },
          {
            label: "Open in browser",
            click: () => {
              shell.openExternal(
                `https://${store.get("hostname")}/browse/${key}`
              );
            }
          }
        ]
      }))
    )
    .then(issuesMenu => [...issuesMenu, { type: "separator" }, ...commonMenu])
    .then(Menu.buildFromTemplate)
    .then(contextMenu => appTray.setContextMenu(contextMenu))
    .then(() => {
      console.info("Loaded issues succesfully.");
      appTray.setToolTip("Right-click to view your issues.");
    })
    .catch(error => {
      console.error(error.message);
      appTray.setToolTip("Error loading issues.");
    });
}

app.on("ready", function() {
  win = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false
    },
    show: false
  });
  appTray = new Tray(iconPath);
  if (store.get("first_time")) {
    configureHelper();
  } else {
    getAllIssues();
  }
});
