# cordova-live-update

**v2, fresh and ready for 2019!**

`cordova-live-update` provides secure over-the-air web stack updates for Cordova applications.

## Quickstart

```bash
npm i -g cordova-live-update
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-zip
```

Build your first bundle and say where you plan to host it (more on that below).

```bash
liveupdate bundle -u http://my-liveupdate-host.com
```

Several things were just generated:

1. A zip bundle of web assets for each active platform in `./liveupdate/<platform>/*.zip`
2. A JSON metadata file in `./liveupdate/liveupdate.json`
3. A client stub for your app, in `./www/liveupdate.js`

Upload everything in `./liveupdate` to the host you specified. I like to use rsync:

```bash
rsync ./liveupdate/* user@my-live-update-host.com:/var/www
```

Reference the client stub in  `www/index.html`:

```html
<script type="text/javascript" src="liveupdate.js"></script>
```

Run your app as usual:

```bash
cordova run ios
```

Next time you want to release an update to your app, use `liveupdate bundle` instead of re-deploying to app stores. All your apps will update to the new bundle automatically. Pretty slick.

## Bundles, Hosting, and Pushing Live Updates

`cordova-live-update` works by bundling all the web assets as a zip file and attaching a build number (timestamp). The initial "bundle" ships compiled into your app. When a user installs and launches your app for the first time, that is what they see.

When the app is launched, it checks to see if an update is available by pinging the `-u <host>` you provided during bundling. If an update is available, it downloads the bundle, unzips it into local file storage, and navigates to the new app. All of this happens seamlessly and most users probably won't even notice.

After the app has been updated to an OTA bundle, that bundle stays in local storage. The next time the app launches, it goes immediately to that new bundle instead of the original bundle compiled into the code. 

Because the bundle lives in local storage, even offline access works.

To make all this happen, everything in `./liveupdate` (created by `liveupdate bundle`) needs to be hosted somewhere. S3 would work, but I use a normal server and `rsync` to quickly upload my bundles. 

Any time you run `liveupdate build`, you must publish the changes it creates. After you publish, all your installed apps will pick up the new bundle and run it instead of the base bundle that ships with the app.

## Customization and Options

### `build` options

Option | Effect
--------|-------
-u, --updateUrl <url>| **Required.** The production LiveUpdate URL/endpoint
-w, --watch | Watch for changes and re-bundle
-d, --directory <directory> | Set the output bundle directory. Default: `./liveupdate`

### `serve` options

Option | Effect
--------|-------
-h, --host <host> | The hostname/IP to listen on. Default: `0.0.0.0`
-p, --port <port> | The port to listen on. Default: `4000`
-d, --directory <directory> | Output bundle directory to use as the web root. Default: `./liveupdate`

### Customizing LiveUpdate

The `LiveUpdater` object created by the `./www/liveupdate.js` client bootstrap can be customized. Here are the default values:

```js
LiveUpdater.buildManifest = {
  updateUrl: null,
  appEntryPoint: 'index.html',
  localStorageVar: 'liveupdate',
  recheckTimeoutMs: 1000 * 60 * 10,
  currentBuildId: 0,
  bundleRoot: cordova.file.dataDirectory,
  onUpdateAvailable: buildInfo => {},
  onNoUpdateAvailable: buildInfo => {},
  onUpdateFailed: err => {},
  onDownloadComplete: buildInfo => {
    return new Promise((resolve, reject) => {
      const res = confirm(
        `Version ${
          buildInfo.currentBuildId
        } is available for download (you are running ${
          window.LiveUpdater.currentBuildId
        }). Update now?`,
      )
      if (res != null) {
        resolve()
      } else {
        reject(new Error('User canceled'))
      }
    })
  },
  onInstallComplete: buildInfo => {},
  onReboot: idToLoad => {},
}
```

Adjust them *after* `./www/liveupdate.js` loads, but *before* `document.addEventListener("deviceready")` is called. Effectively, this means `./www/index.js` is a good place:

```js
// ./www/index.js
LiveUpdate.buildManifest.onUpdateAvailable = buildInfo => {
	alert('A new update is available!')
}
document.addEventListener("deviceready", ()=>{
  // start your app here
})
```

## Local Development

`cordova-live-update` ships with a mini express server.

```bash
liveupdate serve
```

In this mode, `liveupdate` generates a `./www/liveupdate.js` stub that points to this local server instead. You'll need to recompile your app with this 'local' stub:

```bash
cordova build ios
```

Once you have the two working, you can run `liveupdate bundle` to create test bundles. `./www/liveupdate.js` runs a `LiveUpdater` instance that checks for updates periodically, or you can trigger one from within your app using:

```javascript
LiveUpdater.instance.check()
```

**Troubleshooting:** `liveupdate serve` attempts to auto-discover its external LAN/WAN IP so any device on your LAN/WAN can talk to it. For instance, if it reports `External IP looks like: 192.168.1.4`, try browsing to `http://192.168.1.4/liveupdate.json` from your test device and see if it answers. If there is no answer, you likely have a firewall issue or `liveupdate serve` was not able to identify the correct IP. In that case, use extended options to manually specify the correct information:

```bash
liveupdate serve -h <host> -p <port> -e <external IP>
```

## Advanced Topics

### Motivation

Many updates to hybrid applications involve only web stack (JavaScript/HTML/CSS/font) changes and no native code changes at all. Rebuilding and reshipping the native app container just for a few JS changes is too cumbersome. With this package, you can provide your users convenient OTA updates like Expo does!

The normal development cycle for Cordova is painful, too. Every JS changes requires needless recompiling and reloading on the simulator or device. This package fixes that by enabling hot reloading of web assets without exiting/recompiling/relaunching the native Cordova app container.

### Beta Tesing and Test Groups



### Anti-bricking

You just bricked your app with a live update. It fails so dismally that it won't even update anymore. You could push a new compiled app store update, but we try to avoid that in two ways:

1. Keeping the live update client code very small (less surface area to fail)
2. Implementing anti-bricking measures

When your app first launches, the `./www/liveupdate.js` bootstrap executes before anything else. At the top, we set a `localStorage` flag. At the bottom, we reset it. If the app launches and that flag is still set, we know that `'./liveupdate.js` failed, either because we issued a bad release of `cordova-live-update` or you did something in your code that broke it. Either way, we simply revert back to the base version compiled into the app and try again.

There is one surefire way to break things that we can't fix: issue an OTA with a bad update URL. The app will continue pinging the bad URL attempting to find further updates. The only way to fix this is to push a new native release.

### What happens when apps are re-installed?

Not much. It defaults to the base compiled version and attempts to download the latest update.

### Migrating to a new bundle URL

I don't recommend this because the *old* bundle URL still needs to hang around. However, if you need to update to a new bundle URL, follow these steps:

1. Ensure the old host remains active 
2. Use `liveupdate bundle -h <newhost>` to create a bundle pointing to the new host.
3. Upload the new bundle as the terminal (last) bundle to the old host
4. Upload the same new bundle to the new host
5. Issue future bundles using the new host only

### How to roll back an OTA

`cordova-live-update` will always launch the version specified in the `./liveupdate/liveupdate.json` manifest, even if it is older. If you happen to push a release that just wasn't quite ready and you can safely roll back without negatively affecting the user experience, just manually set the manifest bundle ID to whatever bundle you want.

### Bundle archiving and maintenance

In practical terms, you only need to keep your newest bundle around. Old bundles can be deleted as soon as you are sure you won't need to roll back.

### Where to host your bundles

Any static hosting site will do. I like virutal servers, but some people like AWS S3. You do you. Bottom line, static content servers are cheap and abundant. 

### HMR During Development

[Corpack](http://github.com/benallfree/corpack). Just sayin.



### Native Platform Updates

Sometimes you need to make native updates, such as adding Cordova native plugins. That means an app store push.

Type of Change | Recommended Bundle Strategy
---------------|-------------------
Native bugfix  | No change. Keep on truckin'
Minor native capability | Write conditional JS logic around its availability and take advantage of the feature when it's available. Not everyone will be running your latest app store version, so be careful to check for availability of new native capabilities.
Major native capability | Use the same strategy for minor capabilities, or see "bundle forking" below.

**Bundle Forking:** Bundle Forking is required when native features in your app versions vary so widely that you end up maintaining two or more branches of your JS code. In that case, I recommend doing a major version bump on your native app and creating a new **liveupdate endpoint** to correspond.

```bash
liveupdate bundle -u http://my-liveupdate-host.com/v2
```

