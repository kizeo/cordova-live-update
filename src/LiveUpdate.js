import axios from 'axios'

const {
  LIVEUPDATE,
  confirm,
  localStorage,
  cordova,
  alert,
  File,
  Zip,
  Http,
} = window

class LiveUpdate {
  checkId = null

  constructor(options) {
    this.options = {
      updateUrl: null,
      originalBuildId: null,
      appEntryPoint: 'app.html',
      localStorageVar: 'buildno',
      recheckTimeoutMs: 500,
      afterUpdateAvailable: async (currentId, latestId) => {},
      afterDownloadComplete: (currentId, latestId) => {
        return new Promise((resolve, reject) => {
          const res = confirm(
            `Version ${latestId} is available for download (you are running ${currentId}). Update now?`,
          )
          if (res != null) {
            resolve()
          } else {
            reject(new Error('User canceled'))
          }
        })
      },
      afterInstallComplete: async (currentId, latestId) => {},
      beforeReboot: async idToLoad => {},
      currentBuildId: 0,
      setCurrentBuildId: buildId => {
        return localStorage.setItem(this.options.localStorageVar, buildId)
      },
      bundleRoot: cordova.file.dataDirectory,
      ...options,
    }

    if (!this.options.updateUrl || !this.options.originalBuildId) {
      alert('LiveUpdater *requres* update URL and original build ID')
      throw new Error('LiveUpdater *requres* update URL and original build ID')
    }
  }

  checkRepeatedly(timeoutMs = null) {
    this.checkId = setInterval(() => {
      console.log('Check failed', err)
      console.log('Check failed', err)
    }, timeoutMs || this.options.recheckTimeoutMs)
  }

  stopCheckingRepeatedly() {
    clearInterval(this.checkId)
    this.checkid = null
  }

  checkOnce() {
    return new Promise((resolve, reject) => {
      const { currentBuildId } = this.options
      console.log('Current build version is ', currentBuildId)
      this.fetchLatestBuildInfo()
        .then(latestBuildId => {
          if (latestBuildId <= currentBuildId) {
            console.log('We have the latest build, no action needed')
            return
          }
          console.log('Update is requested')
          return this.options
            .afterUpdateAvailable(currentBuildId, latestBuildId)
            .then(() => {
              return this.download(latestBuildId)
            })
            .then(() => {
              return this.options.afterDownloadComplete(
                currentBuildId,
                latestBuildId,
              )
            })
            .then(() => {
              return this.install(latestBuildId)
            })
            .then(() => {
              return this.options.afterInstallComplete(
                currentBuildId,
                latestBuildId,
              )
            })
            .then(() => {
              return this.loadApp(latestBuildId)
            })
        })
        .catch(err => {
          console.log('Check failed or was aborted', err)
          return reject(err)
        })
        .finally(() => {
          console.log('Done trying to download and install.')
          return resolve()
        })
    })
  }

  go() {
    return this.checkOnce()
      .then(buildId => {
        console.log('Loading app', arguments)
        return this.loadApp(buildId)
      })
      .catch(err => {
        console.log('Check failed, loading current local build of app.', err)
        return this.loadApp(this.options.getCurrentBuildId())
      })
  }

  fetchLatestBuildInfo() {
    console.log('Fetching latest build version info')
    return axios
      .get(
        `${this.options.updateUrl}/liveupdate.json?r=${new Date().getTime()}`,
      )
      .then(response => {
        if (response.statusCode === 200) {
          const latestBuildId = JSON.parse(response.body)
          console.log('Latest build on server is ', latestBuildId)
          return latestBuildId
        } else {
          console.log('Error fetching version info', err, response)
          throw err
        }
      })
  }

  loadApp(buildId) {
    if (!this.options.beforeReboot(buildId)) {
      return
    }
    let appHtml = this.options.appEntryPoint
    if (buildId) {
      const newAppHtml = `${this.options.bundleRoot}${buildId}/${
        this.options.appEntryPoint
      }`
      return File.exists(appHtml)
        .then(() => {
          console.log('New app exists', newAppHtml)
          return (appHtml = newAppHtml)
        })
        .catch(() => console.log('New app is missing, using default'))
        .finally(() => {
          console.log('Navigating to ', appHtml)
          return (window.location = appHtml)
        })
    } else {
      console.log('Navigating to ', appHtml)
      return (window.location = appHtml)
    }
  }

  async download(buildId) {
    const zipFname = `${this.options.bundleRoot}${buildId}.zip`
    const unzipDir = `${this.options.bundleRoot}${buildId}`
    const url = `${this.options.updateUrl}/${buildId}.zip`
    await Promise.all([File.rm(zipFname), File.rm(unzipDir)])
    await Http.download(url, zipFname)
    await Zip.unzip(zipFname, unzipDir)
    console.log('New build version is ', buildId)
    this.options.setCurrentBuildId(buildId)
  }

  install(buildId) {
    this.options.setCurrentBuildId(buildId)
  }
}

function startLiveUpdating(config = {}) {
  const updater = new LiveUpdate({
    currentBuildId: LIVEUPDATE.build,
    ...config,
  })
  if (NODE_ENV === 'development') {
    updater.checkRepeatedly()
  } else {
    updater.checkRepeatedly(1000 * 60 * 100)
  }
}

export { LiveUpdate, startLiveUpdating }
