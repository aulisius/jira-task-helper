const { app, Tray, Menu, BrowserWindow, shell } = require("electron");
const path = require("path");
const Store = require("electron-store");
const platformInfo = require("electron-platform");
const JIRAService = require("./service");

const iconPath = platformInfo.isWin32
  ? path.join(__dirname, "build", "icon.ico")
  : path.join(__dirname, "build", "icons", "32x32.png");

const store = new Store();
const service = new JIRAService(store.store);
let appTray = null;
let win = null;

const configureHelper = () => {
  let configureWin = new BrowserWindow({
    width: 200,
    height: 200,
    resizable: false,
    movable: false,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false
    },
    alwaysOnTop: true,
    frame: true
  });
  configureWin.loadURL("file://" + path.join(__dirname, "configure.html"));
  configureWin.on("closed", () => {
    console.log("Configuration updated. Refreshing list");
    store.set("first_time", false);
    service.opts = store.store;
    getAllIssues();
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
      appTray.setContextMenu(Menu.buildFromTemplate(commonMenu));
    });
}

app.on("ready", function() {
  win = new BrowserWindow({
    autoHideMenuBar: true,
    title: "Configure the JIRA Helper",
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
