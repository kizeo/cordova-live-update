import axios from 'axios'

class LiveUpdater {
  checkId = null

  constructor(options) {
    this.options = {
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
      ...options,
    }
    if (!this.options.updateUrl || !this.options.currentBuildId) {
      throw new Error('LiveUpdater *requires* update URL and build ID')
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
      setTimeout(check, timeoutMs || this.options.recheckTimeoutMs)
    }
    setTimeout(check, timeoutMs || this.options.recheckTimeoutMs)
    check()
  }

  async checkOnce() {
    const { currentBuildId } = this.options
    console.log('Local build is ', currentBuildId)
    try {
      const buildInfo = await this.fetchLatestBuildInfo()
      const latestBuildId = buildInfo.currentBuildId
      console.log('Remote build is', latestBuildId)
      if (latestBuildId === currentBuildId) {
        console.log('We have the current build, no action needed')
        this.options.onNoUpdateAvailable()
        return
      }
      console.log('Update is requested')
      await this.options.onUpdateAvailable(buildInfo)
      await this.download(buildInfo)
      await this.options.onDownloadComplete(buildInfo)
      await this.install(buildInfo)
      await this.options.onInstallComplete(buildInfo)
      await this.loadApp(buildInfo)
    } catch (err) {
      console.error('Remote update failed', err)
      this.options.onUpdateFailed(err)
    }
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
      {
        timeout: 1000,
      },
    )
    const buildInfo = response.data
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

function factory(config = {}) {
  return new LiveUpdater(config)
}
export { factory as LiveUpdater }
