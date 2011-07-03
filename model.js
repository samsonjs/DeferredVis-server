//////////////
/// Models ///
//////////////

function RemoteDataSource(conn, id) {
  this.id = id
  this.connection = conn
  this.deferreds = []
  this.executed = false
  this.cancelled = false
  this.completed = false
  this.result = null
  this.events = []

  this.addEvent('created')
}

RemoteDataSource.prototype.addEvent = function(/* name, ... */) {
  var args = [].slice.call(arguments)
  args.unshift(new Date())
  this.events.push(args)
  // TODO emit a node event
}

RemoteDataSource.prototype.removeDeferred = function(d) {
  this.deferreds.push(d)
}

RemoteDataSource.prototype.removeDeferred = function(d) {
  var i = this.deferreds.indexOf(d)
  if (i > -1) {
    this.deferreds.splice(i, 1)
  }
}

RemoteDataSource.prototype.remove = function(data) {
  this.addEvent('removed', data)
}

RemoteDataSource.prototype.cancel = function(data) {
  this.cancelled = new Date()
  this.addEvent('cancelled', data)
}

RemoteDataSource.prototype.execute = function(data) {
  this.executed = new Date()
  this.addEvent('executed', data)
}

RemoteDataSource.prototype.complete = function(result, data) {
  this.completed = new Date()
  this.result = result
  this.addEvent('completed', result, data)
}

function RemoteDeferred(conn, id, data) {
  this.id = id
  this.connection = conn
  this.links = []
  this.linkIndex = 0
  this.called = false
  this.running = false
  this.pauseCount = 0
  this.finalized = false
  this.hasFinalizer = false
  this.resolved = false
  this.rejected = false
  this.result = null
  this.events = []

  this.addEvent('created', data)
}

RemoteDeferred.prototype.addEvent = function(/* name, ... */) {
  var args = [].slice.call(arguments)
  args.unshift(new Date())
  this.events.push(args)
  // TODO emit a node event
}

RemoteDeferred.prototype.remove = function(data) {
  if (this.dataSource) {
    this.dataSource.removeDeferred(this)
  }
  this.addEvent('removed', data)
}

RemoteDeferred.prototype.cancel = function(data) {
  this.cancelled = new Date()
  this.addEvent('cancelled', data)
}

RemoteDeferred.prototype.resolve = function(data) {
  this.resolved = new Date()
  this.result = data.result
  this.addEvent('resolved', data)
}

RemoteDeferred.prototype.reject = function(data) {
  this.rejected = new Date()
  this.result = data.result
  this.addEvent('rejected', data)
}

RemoteDeferred.prototype.addLink = function(data) {
  this.links.push(tools.mixin({ ran: false }, data))
  this.addEvent('link-added', data)
}

RemoteDeferred.prototype.runLink = function(data) {
  var link = this.links[this.linkIndex++]
  link.ran = new Date()
  tools.mixin(link, data) // data contains: result, file, and line
  this.addEvent('link-ran', data)
}

RemoteDeferred.prototype.addFinalizer = function(data) {
  this.hasFinalizer = new Date()
  this.addEvent('finalizer-added', data)
}

RemoteDeferred.prototype.finalize = function(data) {
  this.finalized = new Date()
  this.addEvent('finalized', data)
}
