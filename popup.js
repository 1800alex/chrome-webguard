// Popup script for Website Whitelist Guard
document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const statusDiv = document.getElementById("extensionStatus");
  const statusText = document.getElementById("statusText");
  const currentSiteDiv = document.getElementById("currentSite");
  const currentHostSpan = document.getElementById("currentHost");
  const siteStatusSpan = document.getElementById("siteStatus");
  const configureBtn = document.getElementById("configureBtn");
  const whitelistCount = document.getElementById("whitelistCount");

  let currentHost = "";

  // Load current state
  function loadState() {
    chrome.storage.sync.get(
      ["isEnabled", "whitelist", "redirectUrl"],
      (result) => {
        const isEnabled = result.isEnabled !== false;
        const whitelist = result.whitelist || [];

        // Update extension status
        statusText.textContent = isEnabled
          ? "Protection Enabled"
          : "Protection Disabled";
        statusDiv.className = isEnabled ? "status enabled" : "status disabled";

        // Update whitelist count
        whitelistCount.textContent = `${whitelist.length} sites whitelisted`;

        // Get current tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            try {
              const url = new URL(tabs[0].url);
              currentHost = url.hostname;
              currentHostSpan.textContent = currentHost;

              // Check if current site is whitelisted
              let isAllowed = false;
              for (const domain of whitelist) {
                if (
                  currentHost === domain ||
                  currentHost.endsWith("." + domain)
                ) {
                  isAllowed = true;
                  break;
                }
              }

              if (
                url.protocol === "chrome:" ||
                url.protocol === "chrome-extension:"
              ) {
                siteStatusSpan.textContent = "System page (always allowed)";
                currentSiteDiv.className = "current-site allowed";
              } else if (!isEnabled) {
                siteStatusSpan.textContent = "Protection disabled";
                currentSiteDiv.className = "current-site";
              } else if (isAllowed) {
                siteStatusSpan.textContent = "✓ Whitelisted";
                currentSiteDiv.className = "current-site allowed";
              } else {
                siteStatusSpan.textContent = "✗ Blocked";
                currentSiteDiv.className = "current-site blocked";
              }
            } catch (error) {
              currentHostSpan.textContent = "Invalid URL";
              siteStatusSpan.textContent = "Cannot process";
            }
          }
        });
      }
    );
  }

  // Open configuration page
  configureBtn.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    window.close();
  });

  // Initial load
  loadState();
});
