# leveldb-http

This tiny project takes the [multilevel-http](https://www.npmjs.org/package/multilevel-http) HTTP API for [LevelDB](https://code.google.com/p/leveldb/) and adds:

* [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) headers to make the API available for consumption from any webpage, credits to [cors](https://www.npmjs.org/package/cors)
* [HTTP Digest authentication](https://www.npmjs.org/package/cors) for write operations, thanks to [http-digest-auth](https://www.npmjs.org/package/http-digest-auth)
* An endpoint to easily get the latest value for any key prefix

## Starting

    $ export DB_USER=foo
    $ export DB_PASS=bar
    $ ./app.js

## API

See [multilevel-http](https://github.com/juliangruber/multilevel-http#http-api) for the generic LevelDB API.

This project adds the convenience endpoint:

### GET /latest/:prefix

Get the value associated with the largest key starting with this prefix, assuming ASCII keys.

```
$ http get http://pi:5000/latest/temperature
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: Content-Type,WWW-Authenticate
Connection: keep-alive
Content-Type: application/json
Date: Mon, 04 Aug 2014 18:21:12 GMT
Transfer-Encoding: chunked
X-Powered-By: Express

{
    "timestamp": 1407176469778, 
    "value": 24.812
}
```

## History

This small app was written to serve as a lightweight time-series db for 
my 'web thermostat' project. I'm using a Raspberry Pi to monitor the
current temperature, provide a web UI to set the desired temperature, and
control my central heating based on that.

The components mentioned above made it quite easy to put this together.
The only downside that I've run into so far is that due to LevelDB's
single-process nature, it's not possible to keep the POST API up while
restarting the read-only part of the app. A minor drawback.
