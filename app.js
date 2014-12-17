#!/usr/bin/env node

var multilevel = require('multilevel-http')
var express = require('express')
var auth = require('http-auth')
var JSONStream = require('JSONStream')
var levelup = require('level')
var cors = require('cors')
var liveStream = require('level-live-stream')
var crypto = require('crypto')

var app = express()

// Authentication 
var authUsername = process.env.DB_USER
var authPassword = process.env.DB_PASS
var authRealm = 'Data section'

app.use(cors({
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'WWW-Authenticate']
}))

var digest = auth.digest({ 
    realm: authRealm
  }, function (username, callback) { // Expecting md5(username:realm:password) in callback.		
    if (username === authUsername)
      callback(crypto.createHash('md5').update(username + ':' + authRealm + ':' + authPassword).digest('hex'))
    else
      throw "Invalid username"
  }
)

app.options('*', auth.connect(digest))
app.post('*', auth.connect(digest))
app.put('*', auth.connect(digest))
app.delete('*', auth.connect(digest))

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

function getOpts (opts) {
  if (opts.limit) opts.limit = Number(opts.limit)
  return opts
}

app.get('/stream/:prefix', function (req, res) {
  var opts = getOpts(req.query);
  if (!opts.gt) {
    opts.gt = req.params['prefix'];
    opts.limit = 1;
    opts.reverse = true;
  }
  if (!opts.lt)
    opts.lt = req.params['prefix'] + '~';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  function writeEvent(d) {
    res.write('id: ' + d.key + '\n');
    res.write('data: ' + d.value + '\n\n');
  }

  var lastKey = opts.gt
  db.readStream(opts)
    .on('data', function(d) {
      // Past event(s)
      writeEvent(d);
      lastKey = d.key;
    })
    .on('end', function(d) {
      // Stream subsequent events
      var streamOpts = {}
      streamOpts.gt = lastKey
      streamOpts.lt = opts.lt
      streamOpts.old = false
  
      var stream = liveStream(db, streamOpts)
      stream.on('data', writeEvent)
      res.on('close', function() {
        stream.end()
      })
    })
})

// And off we go!
app.listen(5000)
