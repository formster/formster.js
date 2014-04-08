var cookies = require('./cookies');
var randomstring = require('randomstring');
var Keen = require('./lib/keen_track');
var http = require('http');

module.exports = Api;

function Api(key) {
  this.host = 'http://signups.io';
  this.port = 80;
  this._path = '/projects/<key>/key';
  this._queue = [];
  this._active = false;

  this.key = key || "";
  if(key) this._getKeys(key);

  if(!cookies.hasItem('signups.io')) {
    this.cookie = randomstring.generate();
    cookies.setItem('signups.io', this.cookie, Infinity, '/'); 
  } else {
    this.cookie = cookies.getItem('signups.io');
  }
}

Api.Keen = Keen;

Api.prototype.path = function (key) {
  return this._path.replace('<key>', key);
};

Api.prototype._setKeys = function (key) {
  var parts;

  this._longKey = key;
  parts = key.split(':');
  this._projectId = parts[0];
  this._writeKey = parts[1];
  this._userId = parts[2];
  this._siteId = parts[3];
  this._public = !!parts[4];
  this._clearQueue();
};

Api.prototype._getKeys = function (key) {

  // mark the API as inactive until we get the new keys
  this_active = false;

  // grab the full key from signups.io
  getJSON({ host: this.host, port: this.port, path: this.path(key) }, function (err, json) {
    if(err) throw err;

    if(!json.key) throw new Error("No key in JSON response.");

    this._setKeys(json.key);
  });
};

Api.prototype._clearQueue = function () {
  this._active = true;
  var event;
  while(this._queue.length) {
    event = this._queue.shift();
    this._sendEvent(event.name, event.data, event.callback);
  }
};

Api.prototype.register = function (key) {
  this.key = key;
  if(this.key) this._getKeys(this.key);
};

Api.prototype.sendEvent = function (name, data, callback) {
  if(!this.key) {
    return callback(new Error("No site registered."));
  }

  // defaults
  data = data || {};
  callback = callback || function () {};

  // error checking
  if(data.meta) return callback(new Error("Meta data is reserved for Signups.io"));

  // log the time before we queue it so it's the actual request time, not the time it was sent
  data.keen = {
    timestamp: (new Date()).toISOString()
  };

  // reformat in a way that keen likes
  name = eventName(name);
  data = propNames(data);

  if(!this._active) {
    this._queue.push({
      name: name,
      data: data,
      callback: callback
    });
  } else {
    this._sendEvent(name, data, callback);
  }

};

Api.prototype._sendEvent = function (name, data, callback) {

  data.meta = {
    public: !!this._public,
    user: this._userId,
    site: this._siteId,
    ip_address: '${keen.ip}',
    user_agent: '${keen.user_agent}',
    protocol: document.location.protocol,
    url: document.location.pathname,
    host: document.location.hostname,
    cookie: this.cookie
  };

  Api.Keen.configure({
    projectId: this._projectId,
    writeKey: this._writeKey
  });

  Api.Keen.addEvent(name, data, function (success) {
    callback(null, success);
  }, function (err) {
    callback(err);
  });

};

// ref: https://keen.io/docs/event-data-modeling/event-data-intro/#event-collections
function eventName(name) {
  // cut down to 64
  if(name.length > 64) {
    name = name.slice(0, 64);
  }

  // replace non-ASCII characters
  name = name.replace(/[\x00-\x7F]/g, '_');

  // replace `$`
  name = name.replace(/\$/gi, '_');

  // can't start with `_` or `.`
  if(name[0] === '_' || name[0] === '.') {
    name = 'a' + name;
  }

  // can't end with `.`
  if(name[name.length-1] === '.') {
    name += '_';
  }

  return name;
}


// ref: https://keen.io/docs/event-data-modeling/event-data-intro/#event-properties
function propName(name) {
  // max length of 256
  if(name.length > 256) {
    name = name.slice(0, 256);
  }

  // can't start with `$`
  if(name[0] === '$') {
    name = '_' + name;
  }

  // no `.` allowed in the name
  name = name.replace(/\./gi, '_');

  return name;
}

function propNames(data) {
  for(var p in data) {
    if(data.hasOwnProperty(p)) {

      // recurse
      if(data[p] && typeof data[p] === 'object') {
        data[p] = propNames(data[p]);
      }

      // change the property name if necessary
      if(propName(p) !== p) {
        data[propName(p)] = data[p];
        delete data[p];
      }

    }
  }

  return data;
}


function getJSON(options, callback) {
  options = options || {};

  http.get({ host: options.host, port: options.port, path: options }, function (res) {

    var chunks = "";

    res.on('data', function (buf) {
      chunks += buf;
    });

    res.on('end', function () {
      if(res.statusCode >= 200 && res.statusCode < 400) {
        var json;

        try {
          json = JSON.parse(chunks);
        } catch(e) {
          return callback(new Error("Invalid JSON response"));
        }

        callback(null, json);
      } else {
        callback(new Error("HTTP Error: "+res.statusCode));
      }
    });

  }).on('error', function (e) {
    callback(e);
  });
}
