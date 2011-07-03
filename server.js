var fs = require('fs')
  , net = require('net')
  , express = require('express')
  , RedisStore = require('connect-redis')(express)
  , socketIO = require('socket.io')
  , config = require('./config')
  , tools = require('./tools')

  // tcp server, communicates w/ Deferred host
  , server

  // express and socket.io app
  , app
  , io

  // Event log
  , events = []

exports.start = function() {
  startEventListener()
  startWebServer()
}

function parseEvents(s) {
  var eventStrings = s.trim().split('\r\n')
  eventStrings.forEach(function(s) {
    var i = s.indexOf(' ')
      , j = s.indexOf(' ', i + 1)
      , ev = {}
    if (j === -1) j = s.length
    ev.name = s.slice(0, i)
    ev.id = s.slice(i + 1, j)
    ev.payload = s.slice(j + 1) || null
    events.push(ev)
    io.sockets.emit('event', ev)
  })
}

function startEventListener() {
  server = net.createServer(function(conn) {
    var buf = ''

    console.log(conn.fd + ' CONNECT')

    conn.on('data', function(d) {
      buf += d
      if (buf[buf.length - 1] === '\n') {
        parseEvents(buf)
        buf = ''
      }
    })

    conn.on('end', function() {
      console.log(conn.fd + ' END')
    })
  })

  server.on('error', function(e) {
    console.log(e)
    console.log(e.stack)
  })

  server.listen(config.port, config.host)
}

// A custom static file handler

var FileTypes =
{ css:  'text/css'
, html: 'text/html'
, js:   'application/javascript'
}

function staticFileHandler(file, type) {
  var path = file.charAt(0) === '/' ? file : (__dirname + '/public/' + file)
    , data = fs.readFileSync(path)
    , dev = config.env === 'development'
    , ext

  if (!type) {
    ext = (file || '').toLowerCase().split('.').pop()
    type = '' + (FileTypes[ext] || 'application/octet-stream')
  }

  return function(req, res) {
    // Always reload in development
    if (dev) data = fs.readFileSync(path, 'binary')
    res.send(data, { 'content-type': type })
  }
}

function startWebServer() {
  app = express.createServer(
    express.logger({ format: config.loggerFormat })
  , express.bodyParser()
  , express.methodOverride()
  , express.cookieParser()
  , express.session({ secret: config.sessionSecret, store: new RedisStore() })
  )

  app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
  })

  app.configure('production', function() {
    app.use(express.errorHandler())
  })

  app.get('/', staticFileHandler('index.html'))
  app.get('/js/main.js', staticFileHandler('js/main.js'))
  app.get('/js/arbor.js', staticFileHandler('js/arbor.js'))
  app.get('/js/arbor-tween.js', staticFileHandler('js/arbor-tween.js'))
  app.get('/css/style.css', staticFileHandler('css/style.css'))

  socketize(app)
  app.listen(config.webPort, config.webHost)
}

function socketize(app) {
  io = socketIO.listen(app)
  io.sockets.on('connection', function(socket) {
    // New clients get the backlog of events
    events.forEach(function(ev) {
      socket.emit('event', ev)
    })
  })
}

if (require.main === module) exports.start()
