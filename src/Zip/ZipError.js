class ZipError {
  constructor(zipFname, unzipDir, errorInfo) {
    this.zipFname = zipFname
    this.unzipDir = unzipDir
    this.errorInfo = errorInfo
  }
}

export { ZipError }
