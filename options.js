// Options page script for Website Whitelist Guard
document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const passwordSection = document.getElementById("passwordSection");
  const configInterface = document.getElementById("configInterface");
  const passwordInput = document.getElementById("passwordInput");
  const unlockBtn = document.getElementById("unlockBtn");
  const messageDiv = document.getElementById("messageDiv");

  // Configuration elements
  const currentStatus = document.getElementById("currentStatus");
  const currentWhitelistCount = document.getElementById(
    "currentWhitelistCount"
  );
  const currentRedirect = document.getElementById("currentRedirect");
  const currentPasswordStatus = document.getElementById(
    "currentPasswordStatus"
  );

  const extensionEnabled = document.getElementById("extensionEnabled");
  const updateStatusBtn = document.getElementById("updateStatusBtn");

  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const updatePasswordBtn = document.getElementById("updatePasswordBtn");

  const redirectUrl = document.getElementById("redirectUrl");
  const updateRedirectBtn = document.getElementById("updateRedirectBtn");

  const whitelistContainer = document.getElementById("whitelistContainer");
  const newDomain = document.getElementById("newDomain");
  const addDomainBtn = document.getElementById("addDomainBtn");
  const bulkDomains = document.getElementById("bulkDomains");
  const bulkUpdateBtn = document.getElementById("bulkUpdateBtn");
  const exportBtn = document.getElementById("exportBtn");
  const resetBtn = document.getElementById("resetBtn");

  let isUnlocked = false;

  // Utility functions
  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
    setTimeout(() => {
      messageDiv.style.display = "none";
    }, 5000);
  }

  function hashPassword(password) {
    // Simple hash for demo - in production, use proper crypto
    let hash = 0;
    if (password.length === 0) return hash;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  function validateDomain(domain) {
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  // Check authentication and show appropriate interface
  function checkAuth() {
    chrome.storage.sync.get(["password"], (result) => {
      const hasPassword = result.password && result.password !== "";

      if (!hasPassword) {
        // No password set, show config interface directly
        passwordSection.style.display = "none";
        configInterface.style.display = "block";
        isUnlocked = true;
        loadConfiguration();
      } else {
        // Password is set, require authentication
        passwordSection.style.display = "block";
        configInterface.style.display = "none";
      }
    });
  }

  // Authenticate user
  function authenticate() {
    const enteredPassword = passwordInput.value;

    chrome.storage.sync.get(["password"], (result) => {
      const storedPassword = result.password || "";

      if (!storedPassword) {
        // No password set
        unlockConfiguration();
      } else if (hashPassword(enteredPassword) === storedPassword) {
        // Correct password
        unlockConfiguration();
      } else if (enteredPassword === "" && storedPassword === "") {
        // Both empty
        unlockConfiguration();
      } else {
        // Wrong password
        showMessage("Incorrect password", "error");
        passwordInput.value = "";
      }
    });
  }

  function unlockConfiguration() {
    passwordSection.style.display = "none";
    configInterface.style.display = "block";
    isUnlocked = true;
    showMessage("Configuration unlocked successfully");
    loadConfiguration();
  }

  // Load current configuration
  function loadConfiguration() {
    chrome.storage.sync.get(
      ["isEnabled", "whitelist", "redirectUrl", "password"],
      (result) => {
        const isEnabled = result.isEnabled !== false;
        const whitelist = result.whitelist || [];
        const redirectUrlValue = result.redirectUrl || "https://www.google.com";
        const hasPassword = result.password && result.password !== "";

        // Update summary
        currentStatus.textContent = isEnabled ? "Enabled" : "Disabled";
        currentWhitelistCount.textContent = whitelist.length;
        currentRedirect.textContent = redirectUrlValue;
        currentPasswordStatus.textContent = hasPassword ? "Yes" : "No";

        // Update form fields
        redirectUrl.value = redirectUrlValue;
        extensionEnabled.checked = isEnabled;

        // Update whitelist display
        renderWhitelist(whitelist);

        // Update bulk textarea
        bulkDomains.value = whitelist.join("\n");
      }
    );
  }

  // Render whitelist items
  function renderWhitelist(whitelist) {
    whitelistContainer.innerHTML = "";

    if (whitelist.length === 0) {
      whitelistContainer.innerHTML =
        '<div style="color: #666; font-style: italic;">No domains whitelisted</div>';
      return;
    }

    whitelist.forEach((domain, index) => {
      const item = document.createElement("div");
      item.className = "whitelist-item";
      item.innerHTML = `
        <span class="domain">${domain}</span>
        <button class="remove-btn" data-index="${index}">Remove</button>
      `;
      whitelistContainer.appendChild(item);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        removeDomain(index);
      });
    });
  }

  // Remove domain from whitelist
  function removeDomain(index) {
    chrome.storage.sync.get(["whitelist"], (result) => {
      let whitelist = result.whitelist || [];
      whitelist.splice(index, 1);
      chrome.storage.sync.set({ whitelist: whitelist }, () => {
        showMessage("Domain removed successfully");
        loadConfiguration();
      });
    });
  }

  // Add domain to whitelist
  function addDomain() {
    const domain = newDomain.value.trim().toLowerCase();

    if (!domain) {
      showMessage("Please enter a domain", "error");
      return;
    }

    if (!validateDomain(domain)) {
      showMessage("Invalid domain format", "error");
      return;
    }

    chrome.storage.sync.get(["whitelist"], (result) => {
      let whitelist = result.whitelist || [];

      if (whitelist.includes(domain)) {
        showMessage("Domain already in whitelist", "error");
        return;
      }

      whitelist.push(domain);
      chrome.storage.sync.set({ whitelist: whitelist }, () => {
        showMessage("Domain added successfully");
        newDomain.value = "";
        loadConfiguration();
      });
    });
  }

  // Update extension enabled/disabled status
  function updateExtensionStatus() {
    const newStatus = extensionEnabled.checked;

    // If trying to disable and password is set, require authentication
    chrome.storage.sync.get(["isEnabled", "password"], (result) => {
      chrome.storage.sync.set({ isEnabled: newStatus }, () => {
        showMessage(
          `Protection ${newStatus ? "enabled" : "disabled"} successfully`
        );
        loadConfiguration();
      });
    });
  }

  // Update password
  function updatePassword() {
    const newPass = newPassword.value;
    const confirmPass = confirmPassword.value;

    if (newPass !== confirmPass) {
      showMessage("Passwords do not match", "error");
      return;
    }

    const hashedPassword = newPass ? hashPassword(newPass) : "";

    chrome.storage.sync.set({ password: hashedPassword }, () => {
      showMessage(
        newPass
          ? "Password updated successfully"
          : "Password removed successfully"
      );
      newPassword.value = "";
      confirmPassword.value = "";
      loadConfiguration();
    });
  }

  // Update redirect URL
  function updateRedirectUrl() {
    const url = redirectUrl.value.trim();

    if (!url) {
      showMessage("Please enter a redirect URL", "error");
      return;
    }

    try {
      new URL(url); // Validate URL
    } catch (e) {
      showMessage("Invalid URL format", "error");
      return;
    }

    chrome.storage.sync.set({ redirectUrl: url }, () => {
      showMessage("Redirect URL updated successfully");
      loadConfiguration();
    });
  }

  // Bulk update whitelist
  function bulkUpdateWhitelist() {
    const domains = bulkDomains.value
      .split("\n")
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d !== "");

    // Validate all domains
    for (const domain of domains) {
      if (!validateDomain(domain)) {
        showMessage(`Invalid domain: ${domain}`, "error");
        return;
      }
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(domains)];

    chrome.storage.sync.set({ whitelist: uniqueDomains }, () => {
      showMessage(`Whitelist updated with ${uniqueDomains.length} domains`);
      loadConfiguration();
    });
  }

  // Export whitelist
  function exportWhitelist() {
    chrome.storage.sync.get(["whitelist"], (result) => {
      const whitelist = result.whitelist || [];
      const blob = new Blob([whitelist.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "whitelist.txt";
      a.click();
      URL.revokeObjectURL(url);
      showMessage("Whitelist exported successfully");
    });
  }

  // Reset all settings
  function resetSettings() {
    if (
      !confirm(
        "Are you sure you want to reset all settings? This cannot be undone."
      )
    ) {
      return;
    }

    chrome.storage.sync.clear(() => {
      chrome.storage.sync.set(
        {
          password: "",
          whitelist: ["google.com", "github.com"],
          redirectUrl: "https://www.google.com",
          isEnabled: true,
        },
        () => {
          showMessage("All settings reset to default");
          loadConfiguration();
        }
      );
    });
  }

  // Event listeners
  unlockBtn.addEventListener("click", authenticate);
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") authenticate();
  });

  updateStatusBtn.addEventListener("click", updateExtensionStatus);
  updatePasswordBtn.addEventListener("click", updatePassword);
  updateRedirectBtn.addEventListener("click", updateRedirectUrl);
  addDomainBtn.addEventListener("click", addDomain);
  newDomain.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addDomain();
  });

  bulkUpdateBtn.addEventListener("click", bulkUpdateWhitelist);
  exportBtn.addEventListener("click", exportWhitelist);
  resetBtn.addEventListener("click", resetSettings);

  // Initialize
  checkAuth();
});
