File = require('qordova-file');
Http = require('qordova-http');
Zip = require('qordova-zip');    
msprintf = require('sprintf-js')
sprintf = msprintf.sprintf
extend = require('extend')
req = require('micro-req')


class LiveUpdate
  constructor: (options) ->
    @options = {
      updateUrl: "http://cordovaliveupdate.com/code",
      appEntryPoint: 'app.html',
      localStorageVar: 'buildno',
      recheckTimeoutMs: 5000,
      originalBuildId: 1,
      shouldDownload: (current_id, latest_id)->
        confirm(sprintf("Version %d is available for download (you are running %d). Update now?", latest_id, current_id))
      getCurrentBuildId: =>
        Math.max(parseInt(localStorage.getItem(@options.localStorageVar)), @options.originalBuildId)
      setCurrentBuildId: (build_id)=>
        localStorage.setItem(@options.localStorageVar, build_id)
    }
    extend(@options, options)
    
  checkRepeatedly: =>
    @checkOnce()
    .then(=>
      setTimeout(@checkRepeatedly, @options.recheckTimeoutMs)
    )
    
  checkOnce: =>
    d = Q.defer()
    current_build_id = @options.getCurrentBuildId()
    console.log("Current build version is ", current_build_id)
    @fetchLatestBuildInfo()
      .then((latest_build_id)=>
        if(latest_build_id != current_build_id)
          if(@options.shouldDownload(current_build_id, latest_build_id))
            @downloadAndInstall(latest_build_id)
            .then(=>
              @loadApp(latest_build_id)
            )
        else
          console.log("We are running the latest version")
      )
      .finally(=>
        d.resolve(current_build_id)
      )
    d.promise
    
  go: =>
    @checkOnce()
    .then((build_id)=>
      console.log("Loading app", arguments)
      @loadApp(build_id)
    )
    
  fetchLatestBuildInfo: =>
    deferred = Q.defer()
    console.log("Fetching latest build version info")
    req(sprintf('%s/liveupdate.json', @options.updateUrl), {json: true}, ((err, response)->
      if(response.statusCode == 200)
        latest_build_id = response.body
        console.log("Latest build is ", latest_build_id)
        deferred.resolve(latest_build_id)
      else
        console.log("Error fetching version info", err,response)
        deferred.reject(err)
    ))
    deferred.promise
    
  loadApp: (build_id)=>
    app_html = @options.appEntryPoint
    if(build_id)
      new_app_html = sprintf("%s%s/%s", cordova.file.dataDirectory, build_id, @options.appEntryPoint)
      File.exists(app_html)
      .then(->
        console.log("New app exists", new_app_html)
        app_html = new_app_html
      )
      .fail(->
        console.log("New app is missing, using default")
      )
    console.log("Navigating to ", app_html)
    window.location = app_html
    
  downloadAndInstall: (build_id)=>
    deferred = Q.defer()
    zip_fname = sprintf("%s%s.zip", cordova.file.dataDirectory, build_id)
    unzip_dir = sprintf("%s%s", cordova.file.dataDirectory, build_id)
    url = sprintf("%s/%d.zip", @options.updateUrl, build_id)
    Q.all([File.rm(zip_fname),File.rm(unzip_dir)])
      .then(=>
        Http.download(url, zip_fname)
      )
      .then(=>
        Zip.unzip(zip_fname, unzip_dir)
      )
      .then(=>
        console.log("New build version is ", build_id)
        @options.setCurrentBuildId(build_id)
      )
      .fail(=>
        console.log("Install failed", arguments)
        deferred.reject()
      )
      .finally(=>
        deferred.resolve()
      )
    deferred.promise

module.exports = LiveUpdate