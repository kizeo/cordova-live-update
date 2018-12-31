import { HttpError } from './HttpError'

class Http {
  static download(url, dstFname) {
    return new Promise((resolve, reject) => {
      const ft = new FileTransfer()
      console.log('About to start transfer', url)
      ft.download(
        url,
        dstFname,
        function(entry) {
          console.log('File downloaded successfully')
          return resolve()
        },
        function(err) {
          console.log('Could not download file', err)
          return reject(new HttpError(url, dstFname, err))
        },
      )
    })
  }
}

export { Http }
