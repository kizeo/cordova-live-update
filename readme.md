# cordova-live-update

Over-the-air updates for Cordova. 

# Installation

`npm install cordova-live-update`

# Usage

```
updater = new LiveUpdate({...options...});
updater.go(); // Check for updates, install, and then launch
```

# Configuration

Supply these options to the LiveUpdate constructor.

The following options are required.

Name | Discussion
---- | ----------
updateUrl | **Required**. The URL where your update zips are located.
originalBuildId | **Required**. The build ID of the bundled/packaged version that the app shipped with.

The following options are sent to sensible defaults but can be overridden if custom behavior is needed.

Name | Discussion
---- | ----------
appEntryPoint | The entry point to use when running your updated app. Defaults to `app.html`
recheckTimeoutMs | When LiveUpdate is set to check for udpates repeatedly, it will use this timeout between rechecks. Default 5 seconds. Note that this delay will happen between the end of one checkout and the beginning of the next.
shouldDownload | Function callback taking the form `function(currentBuildId, latestBuildId)`. Return `true` to cuase LiveUpdater to download and install an update, `false` otherwise. Defaults to prompting the user via `confirm()` to ask permission to download and install the latest update when one is available.
getCurrentBuildId | Function callback taking the form `function()`. Defaults to getting and setting build number from local storage, override if you would like to do something else.
setCurrentBuildId | Function callback taking the form `function(build_id)`. Defaults to local storage, override if you would like to do something else.
localStorageVar | The variable name used to hold the current version number. Defaults to `buildno`. If you don't want to change the functions above, you can use this to alter just the variable name used.

## go()

Check for updates, install, and then launch.

## checkOnce

Check for an update. If the update is 

```
updater.checkOnce()
.then(function(current\_build\_id) {
  console.log("The current build ID is", current\_build\_id);
});
```

## checkRepeatedly

Check for updates repeatedly. Useful for debugging mode. 

```
updater.checkRepeatedly();
```
