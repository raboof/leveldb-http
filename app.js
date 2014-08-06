#!/usr/bin/env node

var multilevel = require('multilevel-http')
var express = require('express')
var digestAuth = require('http-digest-auth')
var JSONStream = require('JSONStream')
var levelup = require('level')
var cors = require('cors')
var liveStream = require('level-live-stream')

var app = express()

// Authentication 
var username = process.env.DB_USER
var password = process.env.DB_PASS

app.use(cors({
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'WWW-Authenticate']
}))

var realm = 'Data section'
var users = {};
users[username] = digestAuth.passhash(realm, username, password)

var auth = function(req, res, next) {
   digestAuth.login(req, res, realm, users)
   next()
}
app.options('*', auth)
app.post('*', auth)
app.put('*', auth)
app.delete('*', auth)

// Database access
var db = levelup('./thermodata.db')
app.use(multilevel.server(db, { }))

// Getting the latest value
app.get('/latest/:prefix', function (req, res) {
  var opts = {}
  opts.lt = req.params['prefix'] + '~'
  opts.gt = req.params['prefix']
  opts.limit = 1
  opts.reverse = true
  opts.keys = false

  res.type('json')
  db.readStream(opts)
    .pipe(res)
})

app.get('/stream/:prefix', function (req, res) {
  var opts = {}
  opts.gt = req.params['prefix']
  opts.lt = req.params['prefix'] + '~'
  opts.old = false

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n')

  var stream = liveStream(db, opts)
  stream.on('data', function(d) {
    res.write('id: ' + d.key + '\n')
    res.write('data: ' + d.value + '\n\n')
  })

  res.on('close', function() {
    stream.end()
  })
})

// And off we go!
app.listen(5000)
