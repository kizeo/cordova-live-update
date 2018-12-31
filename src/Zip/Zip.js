import { ZipError } from './ZipError'

class Zip {
  static unzip(zipFname, unzipDir, progressCb = () => {}) {
    return new Promise((resolve, reject) => {
      console.log('Unzipping to ', zipFname, unzipDir)
      zip.unzip(
        zipFname,
        unzipDir,
        function(err) {
          if (err) {
            console.log('Error unzipping to ', unzipDir, err)
            return reject(new ZipError(zipFname, unzipDir, err))
          } else {
            console.log('Successfully unzipped to ', unzipDir)
            return resolve()
          }
        },
        progressCb,
      )
    })
  }
}

export { Zip }
