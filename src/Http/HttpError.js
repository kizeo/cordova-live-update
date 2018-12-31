class HttpError {
  constructor(url, dstFname, errorInfo) {
    this.url = url
    this.dstFname = dstFname
    this.errorInfo = errorInfo
  }
}

export { HttpError }
