var cookies = require('./cookies');
var randomstring = require('randomstring');
var Keen = require('./lib/keen_track');

module.exports = Api;

function Api(key) {
  this.key = key || "";
  if(key) this._setKeys(key);
  if(!cookies.hasItem('signups.io')) {
    this.cookie = randomstring.generate();
    cookies.setItem('signups.io', this.cookie, Infinity, '/'); 
  } else {
    this.cookie = cookies.getItem('signups.io');
  }
}

Api.prototype._setKeys = function (key) {
  var parts = key.split(':');
  this._projectId = parts[0];
  this._writeKey = parts[1];
  this._userId = parts[2];
  this._siteId = parts[3];
};

Api.prototype.register = function (key) {
  this.key = key;
  if(this.key) this._setKeys(this.key);
};

Api.prototype.sendEvent = function (name, data, callback) {
  if(!this.key) {
    throw new Error("No site registered.");
  }

  callback = callback || function () {};

  // add meta properties that we always want
  data = data || {};

  if(data.meta) throw new Error("Meta data is reserved for Signups.io");

  data.meta = {
    user: this._userId,
    site: this._siteId,
    ip_address: '${keen.ip}',
    user_agent: '${keen.user_agent}',
    protocol: document.location.protocol,
    url: document.location.pathname,
    host: document.location.hostname,
    cookie: this.cookie
  };

  // fix up names to be appropriate keen property names
  if(name[0] === '$') name = '_' + name;
  name = name.replace(/\./gi, '_');
  if(name.length > 256) {
    name = name.slice(0, 256);
  }

  Keen.configure({
    projectId: this._projectId,
    writeKey: this._writeKey
  });

  Keen.addEvent(name, data, function (success) {
    callback(null, success);
  }, function (err) {
    callback(err);
  });
};
