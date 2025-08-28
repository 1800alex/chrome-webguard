A simple Chrome extension called "Website Whitelist Guard" that allows parents to restrict access to websites using a simple password protected options page.

I highly recommend installing the uBlock Origin Lite Chrome extension along side this to further quite down ads on busy websites.

## 🛡️ **Key Features:**

### **Whitelist Monitoring:**
- Continuously polls `window.location.host` every 2 seconds
- Monitors for navigation changes in single-page applications
- Instant redirection when non-whitelisted sites are detected
- Watches iframes

### **Password Protection:**
- Secure password-protected configuration
- Simple hash-based authentication
- Option to remove password protection

### **Flexible Configuration:**
- Add/remove individual domains
- Bulk whitelist management
- Export/import functionality
- Configurable redirect destination
- Enable/disable protection toggle

### **User-Friendly Interface:**
- Modern, clean design
- Real-time status indicators
- Current site whitelisting status
- Domain validation and error handling

## 📦 **Installation Instructions:**

1. Save all the files in a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select your folder
5. You should see Website Whitelist Guard listed under all All Extensions. Click Details and enable the 'Allow in Incognito' checkbox to ensure the extension always runs.
6. The extension will appear in your toolbar under extensions (and also in Incognito mode)

## 🚀 **How to Use:**

1. **Initial Setup:** Click the extension icon and go to "Configure"
2. **Set Password:** (Optional) Set a password to protect configuration
3. **Configure Whitelist:** Add domains you want to allow
4. **Set Redirect:** Choose where blocked sites should redirect to
5. **Enable Protection:** Toggle the extension on/off as needed

## 🔄 **How It Works:**

- **Background monitoring** catches navigation at the browser level
- **Content script** provides real-time checking within pages
- **Domain matching** supports both exact matches and subdomains
- **Instant redirect** when unauthorized sites are detected
