module.exports =

{ env: process.env.NODE_ENV || 'development'

, loggerFormat: [ ':remote-addr'
                , '-'
                , ':response-timems'
                , '[:date]'
                , '":method :url HTTP/:http-version"'
                , ':status'
                , ':res[content-length]'
                , '":referrer"'
                , '":user-agent"'
                ].join(' ')

, sessionSecret: '8dce9a5af7733469651f81390d2cb3dda5bfb1ef'

, host: '0.0.0.0'
, port: 3030

, webHost: '0.0.0.0'
, webPort: 8080

}
