import axios from 'axios'

class LiveUpdater {
  checkId = null

  constructor(options) {
    this.options = {
      updateUrl: null,
      originalBuildId: null,
      appEntryPoint: 'index.html',
      localStorageVar: 'liveupdate',
      recheckTimeoutMs: 1000 * 60 * 10,
      currentBuildId: 0,
      bundleRoot: cordova.file.dataDirectory,
      onUpdateAvailable: async (currentId, latestId) => {},
      onDownloadComplete: (currentId, latestId) => {
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
      onInstallComplete: async (currentId, latestId) => {},
      onReboot: async idToLoad => {},
      ...options,
    }

    if (!this.options.updateUrl || !this.options.originalBuildId) {
      alert('LiveUpdater *requres* update URL and original build ID')
      throw new Error('LiveUpdater *requres* update URL and original build ID')
    }
  }

  saveBuildInfo(buildInfo) {
    return localStorage.setItem(
      this.options.localStorageVar,
      JSON.stringify(buildInfo),
    )
  }

  loadBuildInfo() {
    return JSON.parse(localStorage.getItem(this.options.localStorageVar))
  }

  checkRepeatedly(timeoutMs = null) {
    const check = async () => {
      await this.checkOnce()
      setTimeout(check)
    }
    setTimeout(check, timeoutMs || this.options.recheckTimeoutMs)
  }

  stopCheckingRepeatedly() {
    clearInterval(this.checkId)
    this.checkid = null
  }

  async checkOnce() {
    const { currentBuildId } = this.options
    console.log('Current build version is ', currentBuildId)
    const latestBuildId = await this.fetchLatestBuildInfo()
    if (latestBuildId <= currentBuildId) {
      console.log('We have the latest build, no action needed')
      return
    }
    console.log('Update is requested')
    await this.options.onUpdateAvailable(currentBuildId, latestBuildId)
    await this.download(latestBuildId)
    await this.options.onDownloadComplete(currentBuildId, latestBuildId)
    await this.install(latestBuildId)
    await this.options.onInstallComplete(currentBuildId, latestBuildId)
    await this.loadApp(latestBuildId)
  }

  async go() {
    try {
      const buildId = await this.checkOnce()
      console.log('Loading app', arguments)
      await this.loadApp(buildId)
    } catch (err) {
      console.log('Check failed, loading current local build of app.', err)
      return this.loadApp(this.options.getCurrentBuildId())
    }
  }

  async fetchLatestBuildInfo() {
    console.log('Fetching latest build version info')
    const response = await axios.get(
      `${this.options.updateUrl}/liveupdate.json?r=${new Date().getTime()}`,
    )
    const buildInfo = response.data
    console.log('Latest build on server is ', buildInfo.currentBuildId)
    return buildInfo
  }

  loadApp(buildId) {
    if (!this.options.onReboot(buildId)) {
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
    this.setCurrentBuildId(buildId)
  }

  install(buildId) {
    this.setCurrentBuildId(buildId)
  }
}

function startLiveUpdating(config = {}) {
  const updater = new LiveUpdater({ config, ...window.LIVEUPDATE })
  updater.checkRepeatedly()
}

export { LiveUpdater, startLiveUpdating }
