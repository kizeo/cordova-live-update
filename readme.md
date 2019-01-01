# cordova-live-update

## V2, fresh and ready for 2019!

`cordova-live-update` provides secure over-the-air web stack updates for Cordova applications. Many updates to hybrid applications involve
only web stack (JavaScript/HTML/CSS/fonts) changes and no native code changes at all. With this package, you can provide your users convenient
OTA updates like Expo does!

`cordova-live-update` also ships with a local server for hot reloading during development.

# Quickstart

```bash
npm i -g cordova-live-update
```

Generate and upload your first bundle to wherever you want to host it:

```bash
cd /my/vordova/app/root
liveupdate build -u http://my-liveupdate-host.com
rsync liveupdate/* user@my-live-update-host.com:/var/www
```

When you ran this, `liveupdate build` also generated a client stub for you in `www/liveupdate.js`. Reference it in  `www/index.html`:

```html
<script type="text/javascript" src="liveupdate.js"></script>
```

Install a couple native dependencies then run your app as usual:

```
cordova plugin add cordova-plugin-file
cordova run ios
```

Next time you want to release an update to your app, just push a new bundle using `liveupdate build` and all your apps will update automatically!

Pretty slick.

# Local Development

But it gets even better. What about using it for hot reloading during development? Of course you can!

`cordova-live-update` ships with hot reloading capabilities for rapid development. 

```bash
liveupdate serve
```

In this mode, `liveupdate` generates a `www/liveupdate.js` stub that points to this local server instead. `liveupdate serve` will monitor for source code changes, generate intermediate bundles, and instantly load the changes in your app without needing to recompile and restart.

Run your app as usual:

```bash
cordova run ios
```

Troubleshooting: `liveupdate serve` will work from any device on your LAN/WAN. It attempts to identify the host machine's external LAN/WAN IP. If `liveupdate serve` reports `External IP looks like: 192.168.1.4`, try browsing to `http://192.168.1.4/liveupdate.json` from another device and see if it answers. If there is no answer, you likely have a firewall issue or `liveupdate serve` was not able to identify the correct IP. In that case, use extended options:

```bash
liveupdate serve -h <host> -p <port> -e <external IP>
```




# Advanced Topics

## Local Server External IP
## Beta Tesing and Test Groups
## What happens when updates fail?
## What happens when apps are re-installed?
## Bundle archiving and maintenance
## Where to ost your bundles
## HMR
## Overriding `startLiveUpdating`
window.LIVEUPDATE={
  ...options
}
or modify before deviceready
    LiveUpdate.startLiveUpdating=function(options) {...}
## Migrating to a new live URL
## Native Platform Updates
  recommend minor versions for JS, major versions for native updates


# `build` options

# 'serve' options

# startLiveUpdating(*options*)

`startLiveUpdating()` is very configurable.

Name | Discussion
---- | ----------
updateUrl | **Required**. The URL where your update zips are located.
originalBuildId | **Required**. The build ID of the bundled/packaged version that the app shipped with.
appEntryPoint | The entry point to use when running your updated app. Defaults to `app.html`
recheckTimeoutMs | When LiveUpdate is set to check for udpates repeatedly, it will use this timeout between rechecks. Default 5 seconds. Note that this delay will happen between the end of one checkout and the beginning of the next.
afterUpdateAvailable | Called when an update is available. Override by returning a promise that resolves if LiveUpdate should proceed with downloading and rejects if LiveUpdate should not proceed with downloading.
afterDownloadComplete  | Called when download and unzip is complete. Override by returning a promise that resolves if LiveUpdate should proceed with installation and rejects if LiveUpdate should not proceed with installation.
afterInstallComplete | Called after installation has finished. At this point, an application reboot will load the new version. Override by returning a promise that resolves if LiveUpdate should proceed to the reboot step or rejects if LiveUpdate should proceed to the reboot step.
beforeReboot | Called before LiveUpdate reboots the application. Override with a promise that resolves if LiveUpdater should reboot and rejects if LiveUpdater should not reboot.
getCurrentBuildId | Function callback. Defaults to getting and setting build number from local storage, override if you would like to do something else.
setCurrentBuildId | Function callback taking the form `function(build_id)`. Defaults to local storage, override if you would like to do something else.
localStorageVar | The variable name used to hold the current version number. Defaults to `buildno`. If you don't want to change the functions above, you can use this to alter just the variable name used.
bundleRoot | The local file path to where bundles should be downloaded and unzipped. This must be a permanent storage location. Defaults to `cordova.file.dataDirectory`.

Overriding `afterDownloadComplete` can be useful if you wish to override the default `confirm()` behavior. Here is an Ionic confirmation example:

```
afterDownloadComplete: (currentId, latestId) => {
  var confirmPopup, d;
  d = $q.defer();
  confirmPopup = $ionicPopup.confirm({
    title: 'Update Available',
    template: sprintf("Version %d is available for download (you are running %d). Update now?", latestId, currentId),
    buttons: [
      {
        text: 'Update Later',
        onTap: (function() {
          return d.reject();
        })
      }, {
        text: 'Update Now',
        type: 'button-positive',
        onTap: (function() {
          return d.resolve();
        })
      }
    ]
  });
  return d.promise;
}
```
