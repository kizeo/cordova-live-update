class File {
  static exists(fname) {
    console.log('Checking to see if exists:', fname)
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(
        fname,
        fileEntry => resolve(fileEntry),
        fileError => reject(fileError),
      )
    })
  }

  static rm(fname) {
    return new Promise((resolve, reject) => {
      File.exists(fname)
        .then(function(fileEntry) {
          if (fileEntry.isFile) {
            console.log('Is a file', fname)
            fileEntry.remove(
              function(success) {
                console.log('Delete successful', success)
                return resolve()
              },
              function(err) {
                console.log('Delete unsuccessful', err)
                return reject(new FileDeleteError(fname, err))
              },
            )
          }
          if (fileEntry.isDirectory) {
            console.log('Is a directory', fname)
            return fileEntry.removeRecursively(
              function(success) {
                console.log('Dir was successfully removed', fname)
                return resolve()
              },
              function(err) {
                console.log('There was an error removing the directory', err)
                return reject(new DirectoryDeleteError(fname, err))
              },
            )
          }
        })
        .fail(function() {
          console.log('File does not exist', fname)
          return resolve()
        })
    })
  }
}

export { File }
