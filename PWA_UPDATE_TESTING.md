# PWA Update Testing Guide

## Overview
The PWA update mechanism has been implemented to ensure users receive the latest version of the app when updates are deployed.

## How It Works

### 1. Service Worker Versioning
- The service worker now uses a dynamic cache name with version: `fidgit-v${CACHE_VERSION}-${scope}`
- When deploying updates, increment the `CACHE_VERSION` in `service-worker.js`
- Old caches are automatically cleaned up during activation

### 2. Update Detection
- The app checks for updates every 60 seconds via `registration.update()`
- When a new service worker is detected, the app listens for the `updatefound` event
- A notification banner appears when a new version is ready

### 3. User-Controlled Updates
- Users see a banner: "New version available!"
- Users can choose to:
  - **Update**: Immediately apply the new version (triggers reload)
  - **Later**: Dismiss the banner and continue using the current version

### 4. Automatic Reload
- When user clicks "Update", a message is sent to the waiting service worker
- The service worker calls `skipWaiting()` to activate immediately
- The `controllerchange` event triggers a page reload with the new content

## Testing the Update Flow

### Manual Testing Steps

1. **Initial Setup**
   ```bash
   # Start local server
   npm start
   # Open http://localhost:3000 in browser
   ```

2. **Register Service Worker**
   - Open the app in a browser
   - Open DevTools > Application > Service Workers
   - Verify the service worker is registered and active

3. **Simulate an Update**
   - In `service-worker.js`, increment the `CACHE_VERSION`:
     ```javascript
     const CACHE_VERSION = '1.0.1'; // Changed from 1.0.0
     ```
   - Save the file
   - In DevTools, check "Update on reload" temporarily
   - Refresh the page once to load the new service worker file
   - Uncheck "Update on reload"

4. **Test Update Notification**
   - You should see two service workers in DevTools (one active, one waiting)
   - The app should automatically detect the waiting service worker
   - Within 60 seconds (or immediately if you manually call `registration.update()`), the update banner should appear

5. **Test Update Flow**
   - Click the "Update" button on the banner
   - The page should reload automatically
   - In DevTools, verify the new service worker is now active
   - Check the cache name has updated to include the new version

6. **Test Dismiss Flow**
   - Repeat steps 3-4 to get a new update
   - Click "Later" to dismiss the banner
   - The banner should disappear
   - The app continues working with the current version
   - The update will still be applied on the next page load/refresh

### Automated Testing (Chrome DevTools)

```javascript
// In browser console:

// Force update check
navigator.serviceWorker.getRegistration().then(reg => reg.update());

// Check current state
navigator.serviceWorker.getRegistration().then(reg => {
    console.log('Active:', reg.active?.state);
    console.log('Waiting:', reg.waiting?.state);
    console.log('Installing:', reg.installing?.state);
});

// Simulate skip waiting (normally done by clicking Update button)
navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
```

## Deployment Checklist

Before deploying a new version:
- [ ] Increment `CACHE_VERSION` in `service-worker.js`
- [ ] Test locally following the steps above
- [ ] Verify update notification appears correctly
- [ ] Verify clicking "Update" reloads and shows new content
- [ ] Verify clicking "Later" dismisses the banner

## Troubleshooting

### Update not detected
- Check that `CACHE_VERSION` was actually changed
- Verify the service worker file itself was updated on the server
- Check browser DevTools > Network tab to ensure service-worker.js isn't cached by the browser
- Try hard refresh (Ctrl+Shift+R) once to clear browser cache

### Banner doesn't appear
- Check browser console for errors
- Verify `updatefound` event is firing (add console.log in app.js)
- Ensure there's actually a waiting service worker in DevTools

### Update button doesn't work
- Check that the message listener is working in service-worker.js
- Verify the message is being sent from app.js
- Check for JavaScript errors in console

## Best Practices

1. **Version Numbering**: Use semantic versioning (e.g., 1.0.0, 1.0.1, 1.1.0)
2. **Testing**: Always test updates locally before deploying
3. **Cache Strategy**: Consider what assets need to be in the initial cache
4. **Update Frequency**: The 60-second check interval balances responsiveness with server load
5. **User Experience**: The dismissible banner allows users to finish their current task before updating
