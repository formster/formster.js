!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Signupsio=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = _dereq_("./lib/randomstring");
},{"./lib/randomstring":2}],2:[function(_dereq_,module,exports){
var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz';

exports.generate = function(length) {
  length = length ? length : 32;
  
  var string = '';
  
  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }
  
  return string;
}
},{}],3:[function(_dereq_,module,exports){
var cookies = _dereq_('./cookies');
var randomstring = _dereq_('randomstring');
var Keen = _dereq_('./lib/keen_track');

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

},{"./cookies":4,"./lib/keen_track":6,"randomstring":1}],4:[function(_dereq_,module,exports){
/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

module.exports = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

},{}],5:[function(_dereq_,module,exports){
exports.each = each;
exports.addClass = addClass;
exports.ready = ready;
exports.val = val;
exports.trigger = trigger;

function each(el, selector, fn) {
  if(arguments.length < 3) {
    fn = selector;
    selector = el;
    el = document;
  }

  Array.prototype.forEach.call(el.querySelectorAll(selector), fn); 
}

function addClass(el, className) {
  if (el.classList) {
    el.classList.add(className);
  } else if(!~el.className.split(' ').indexOf(className)) {
    el.className += ' ' + className;
  }
}

function ready(fn) {
  document.addEventListener('DOMContentLoaded', fn);
}

function val(el, values) {
  if(!el.getAttribute('name')) return values;

  if('input' === el.tagName) {
    if('radio' === el.getAttribute('type')) {
      values[el.getAttribute('name')] = el.value;
    }
    if('checkbox' === el.getAttribute('type')) {
      values[el.getAttribute('name')] = values[el.getAttribute('name')] || [];
      values[el.getAttribute('name')].push(el.value);
    }
  }

  values[el.getAttribute('name')] = el.value;

  return values;
}

function trigger(el, evt, data) {
  var event;

  if (window.CustomEvent) {
    event = new CustomEvent(evt, {detail: data});
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(evt, true, true, data);
  }

  el.dispatchEvent(event);
}

},{}],6:[function(_dereq_,module,exports){
var Keen = exports;

// deal with some browsers not supporting console.log
var alertFallback = false; //only use in dev
if (typeof console === "undefined" || typeof console.log === "undefined") {
    console = {};
    if (alertFallback) {
        console.log = function(msg) {
            alert(msg);
        };
    } else {
        console.log = function() {};
    }
}

/*
 * -----------INHERITANCE STUFF-----------
 *
 * This is to give us inheritance capabilities in vanilla javascript.
 *
 * Docs: http://dean.edwards.name/weblog/2006/03/base/
 * Base.js, version 1.1a
 * Copyright 2006-2010, Dean Edwards
 * License: http://www.opensource.org/licenses/mit-license.php
 */

var Base = function() {
    // dummy
};

Base.extend = function(_instance, _static) { // subclass
    var extend = Base.prototype.extend;

    // build the prototype
    Base._prototyping = true;
    var proto = new this;
    extend.call(proto, _instance);
    proto.base = function() {
        // call this method from any other method to invoke that method's ancestor
    };
    delete Base._prototyping;

    // create the wrapper for the constructor function
    //var constructor = proto.constructor.valueOf(); //-dean
    var constructor = proto.constructor;
    var klass = proto.constructor = function() {
        if (!Base._prototyping) {
            if (this._constructing || this.constructor == klass) { // instantiation
                this._constructing = true;
                constructor.apply(this, arguments);
                delete this._constructing;
            } else if (arguments[0] != null) { // casting
                return (arguments[0].extend || extend).call(arguments[0], proto);
            }
        }
    };

    // build the class interface
    klass.ancestor = this;
    klass.extend = this.extend;
    klass.forEach = this.forEach;
    klass.implement = this.implement;
    klass.prototype = proto;
    klass.toString = this.toString;
    klass.valueOf = function(type) {
        //return (type == "object") ? klass : constructor; //-dean
        return (type == "object") ? klass : constructor.valueOf();
    };
    extend.call(klass, _static);
    // class initialisation
    if (typeof klass.init == "function") klass.init();
    return klass;
};

Base.prototype = {
    extend: function(source, value) {
        if (arguments.length > 1) { // extending with a name/value pair
            var ancestor = this[source];
            if (ancestor && (typeof value == "function") && // overriding a method?
                // the valueOf() comparison is to avoid circular references
                (!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
                /\bbase\b/.test(value)) {
                // get the underlying method
                var method = value.valueOf();
                // override
                value = function() {
                    var previous = this.base || Base.prototype.base;
                    this.base = ancestor;
                    var returnValue = method.apply(this, arguments);
                    this.base = previous;
                    return returnValue;
                };
                // point to the underlying method
                value.valueOf = function(type) {
                    return (type == "object") ? value : method;
                };
                value.toString = Base.toString;
            }
            this[source] = value;
        } else if (source) { // extending with an object literal
            var extend = Base.prototype.extend;
            // if this object has a customised extend method then use it
            if (!Base._prototyping && typeof this != "function") {
                extend = this.extend || extend;
            }
            var proto = {toSource: null};
            // do the "toString" and other methods manually
            var hidden = ["constructor", "toString", "valueOf"];
            // if we are prototyping then include the constructor
            var i = Base._prototyping ? 0 : 1;
            while (key = hidden[i++]) {
                if (source[key] != proto[key]) {
                    extend.call(this, key, source[key]);

                }
            }
            // copy each of the source object's properties to this object
            for (var key in source) {
                if (!proto[key]) extend.call(this, key, source[key]);
            }
        }
        return this;
    }
};

// initialise
Base = Base.extend({
    constructor: function() {
        this.extend(arguments[0]);
    }
}, {
    ancestor: Object,
    version: "1.1",

    forEach: function(object, block, context) {
        for (var key in object) {
            if (this.prototype[key] === undefined) {
                block.call(context, object[key], key, object);
            }
        }
    },

    implement: function() {
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] == "function") {
                // if it's a function, call it
                arguments[i](this.prototype);
            } else {
                // add the interface using the extend method
                this.prototype.extend(arguments[i]);
            }
        }
        return this;
    },

    toString: function() {
        return String(this.valueOf());
    }
});

//-------KEEN OBJECT-----------

/**
 * Configure the Keen IO JS Library with a Project ID and API Keys.
 * @param {Object} config Contains the project ID and optional keys.
 * @param {String} config.projectId the Keen IO Project ID
 * @param {String} [config.writeKey] the Keen IO Scoped Write Key
 * @param {String} [config.readKey] the Keen IO Scoped Read Key
 * @param {String} [config.keenUrl] the base url for the Keen IO API
 *
 * @returns {Keen.Client} An instance of Keen.Client that has been configured
 */
Keen.configure = function (config) {
    this.client = new Keen.Client(config);
    return this.client;
};

/**
 * Add an event to Keen IO.
 * @param {String} eventCollection The name of the event collection
 * @param {Object} event The actual event to send
 * @param {Function} [success] Invoked on success
 * @param {Function} [error] Invoked on failure
 */
Keen.addEvent = function (eventCollection, event, success, error) {
    if (this.client) {
        this.client.uploadEvent(eventCollection, event, success, error);
    }
};

/**
 * Add an event to Keen IO before navigating to an external page/submitting form
 * @param {Element} htmlElement The html element being clicked/submitted
 * @param {String} eventCollection The name of the event to be recorded
 * @param {Object} event The event properties
 * @param {Integer} [timeout=500] The amount of time to wait in milliseconds before timing out
 * @param {Function} [timeoutCallback] Invoked on timeout
 *
 * @returns {Boolean} Returns false to prevent a default action from taking place
 */
Keen.trackExternalLink = function(htmlElementOrEvent, eventCollection, event, timeout, timeoutCallback){

    var htmlElement = htmlElementOrEvent;
    var jsEvent = null;
    var newTab = false;
  
    if (!htmlElementOrEvent.nodeName) {
      // htmlElementOrEvent == event
      jsEvent = htmlElementOrEvent;
      htmlElement = jsEvent.target;
      newTab = (htmlElementOrEvent.metaKey || false);
    
    } else if (window.event && window.event.metaKey == true) {
      // htmlElementOrEvent == element, new tab == true
      newTab = true;
    }

    if (timeout === undefined){
      timeout = 500;
    }
    
    var triggered = false;
    var callback = function(){};


    if( htmlElement.nodeName === "A"){
      callback = function(){
        if(!newTab && !triggered){
          triggered = true;
          window.location = htmlElement.href;
        }
      };
    }
    else if (htmlElement.nodeName === "FORM"){
      callback = function(){
        if(!triggered){
          triggered = true;
          htmlElement.submit();
        }
      }
    }

    if(timeoutCallback){
      callback = function(){
        if(!triggered){
          triggered = true;
          timeoutCallback();
        }
      }
    }

    Keen.addEvent(eventCollection, event, callback, callback);

    setTimeout(function() {
      callback();
    }, timeout);

    if (!newTab) {
      return false;
    }
};
/**
 * Retrieve an array of event collection names and their properties
 * @param {Function} [success] Invoked on success
 * @param {Function} [error] Invoked on failure
 */
Keen.getEventCollections = function(success, error) {
    var url = this.client.getKeenUrl("/events");
    this.client.getJSON(url, success, error);
};

/**
 * Retrieve the properties of a given event collection
 * @param eventCollection string, name of the event collection
 * @param {Function} [success] Invoked on success
 * @param {Function} [error] Invoked on failure
 */
Keen.getEventCollectionProperties = function (eventCollection, success, error) {
    var url = this.client.getKeenUrl("/events/" + eventCollection);
    this.client.getJSON(url, success, error);
};

/**
 * Sets the global properties to use.
 * @param {Function} newGlobalProperties A function that returns an object of properties
 */
Keen.setGlobalProperties = function (newGlobalProperties) {
    if (this.client) {
        if (newGlobalProperties && typeof(newGlobalProperties) == "function") {
            this.client.globalProperties = newGlobalProperties;
        } else {
            throw new Error("Invalid value for global properties: " + newGlobalProperties);
        }
    }
};

// KEEN CLIENT OBJECT

Keen.Client = function (config) {
    if(typeof config.projectId === "undefined" || !config.projectId) {
        throw new Error("Configuration must include a valid projectId");
    } else {
        this.projectId = config.projectId;
    }
    this.writeKey = config.writeKey;
    this.readKey = config.readKey;
    this.globalProperties = null;
    this.keenUrl = "https://api.keen.io";
    if(config !== undefined && config.keenUrl !== undefined){
        this.keenUrl = config.keenUrl;
    }
};

/**
 * Uploads a single event to the Keen IO servers.
 * @param {String} eventCollection The name of the event collection to use
 * @param {Object} event The actual event properties to send
 * @param {Function} [success] Invoked on success
 * @param {Function} [error] Invoked on failure
 */
Keen.Client.prototype.uploadEvent = function (eventCollection, event, success, error) {
    var url = this.getKeenUrl("/events/" + eventCollection);

    // handle global properties
    var newEvent = {};
    if (this.globalProperties) {
        newEvent = this.globalProperties(eventCollection);
    }
    // now add in the properties from the user-defined event
    for (var property in event) {
        if (event.hasOwnProperty(property)) {
            newEvent[property] = event[property];
        }
    }

    if (supportsXhr()) {
        sendXhr("POST", url, null, newEvent, this.writeKey, success, error);
    } else {
        var jsonBody = JSON.stringify(newEvent);
        var base64Body = Keen.Base64.encode(jsonBody);
        url = url + "?api_key=" + this.writeKey;
        url = url + "&data=" + base64Body;
        url = url + "&modified=" + new Date().getTime();
        sendJsonpRequest(url, null, success, error);
    }
};

/**
 * Returns a full URL by appending the provided path to the root Keen IO URL.
 * @param {String} path The path of the desired url
 * @returns {String} A fully formed URL for use in an API call.
 */
Keen.Client.prototype.getKeenUrl = function (path) {
    return this.keenUrl + "/3.0/projects/" + this.projectId + path;
};

function supportsXhr() {
    if (typeof XMLHttpRequest === 'undefined') {
        return false
    } else {
        return "withCredentials" in new XMLHttpRequest();
    }
}

function sendXhr(method, url, headers, body, apiKey, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                var response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.log("Could not JSON parse HTTP response: " + xhr.responseText);
                    if (error) {
                        error(xhr, e);
                    }
                }

                if (response) {
                    if (success) {
                        success(response);
                    }
                }
            } else {
                console.log("HTTP request failed.");
                if (error) {
                    error(xhr, null);
                }
            }
        }
    };

    xhr.open(method, url, true);

    if (apiKey){
        xhr.setRequestHeader("Authorization", apiKey);
    }
    if (body) {
        xhr.setRequestHeader("Content-Type", "application/json");
    }
    if (headers) {
        for (var headerName in headers) {
            if (headers.hasOwnProperty(headerName)) {
                xhr.setRequestHeader(headerName, headers[headerName]);
            }
        }
    }

    var toSend = body ? JSON.stringify(body) : null;
    xhr.send(toSend);
}

function sendJsonpRequest(url, apiKey, success, error) {
    // have to fall back to JSONP for GET and sending data base64 encoded for POST

    // add api_key if it's not there
    if (apiKey && url.indexOf("api_key") < 0) {
        var delimiterChar = url.indexOf("?") > 0 ? "&" : "?";
        url = url + delimiterChar + "api_key=" + apiKey;
    }

    // do JSONP
    var callbackName = "keenJSONPCallback" + new Date().getTime();
    while (callbackName in window) {
        callbackName += "a";
    }

    var loaded = false;
    window[callbackName] = function (response) {
        loaded = true;

        if (success && response) {
            success(response);
        }

        // now remove this from the namespace
        window[callbackName] = undefined;
    };

    url = url + "&jsonp=" + callbackName;
    var script = document.createElement("script");
    script.id = "keen-jsonp";
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);

    // for early IE w/ no onerror event
    script.onreadystatechange = function() {
        if (loaded === false && this.readyState === "loaded") {
            loaded = true;
            if (error) {
                error();
            }
        }
    }

    // non-ie, etc
    script.onerror = function() {
        if (loaded === false) { // on IE9 both onerror and onreadystatechange are called
            loaded = true;
            if (error) {
                error();
            }
        }
    }
}

/**
 * Asynchronously sends an HTTP GET via XHR or JSONP
 *
 * Automatically sets the Content-Type of the request to "application/json" and sets the Authorization
 * header.
 *
 * @param {String} url what URL to send the request to
 * @param {Function} [success] Invoked on success
 * @param {Function} [error] Invoked on failure
 */
Keen.Client.prototype.getJSON = function (url, success, error) {
    if (supportsXhr()) {
        sendXhr("GET", url, null, null, this.readKey, success, error);
    } else {
        sendJsonpRequest(url, this.readKey, success, error);
    }
};

/**
 *
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 *
 **/
Keen.Base64 = {
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Keen.Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                Keen.Base64._keyStr.charAt(enc1) + Keen.Base64._keyStr.charAt(enc2) +
                Keen.Base64._keyStr.charAt(enc3) + Keen.Base64._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = Keen.Base64._keyStr.indexOf(input.charAt(i++));
            enc2 = Keen.Base64._keyStr.indexOf(input.charAt(i++));
            enc3 = Keen.Base64._keyStr.indexOf(input.charAt(i++));
            enc4 = Keen.Base64._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Keen.Base64._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }
        return string;
    }
};

// handle any queued commands
if (Keen._cf) {
    Keen.configure(Keen._cf);
    Keen._cf = null;
}
if (Keen._gp) {
    Keen.setGlobalProperties(Keen._gp);
    Keen._gp = null;
}
if (Keen._eq && Keen._eq.length > 0) {
    for (var i = 0; i < Keen._eq.length; i++) {
        var eventCollection = Keen._eq[i].shift();
        var event = Keen._eq[i].shift();
        var success = Keen._eq[i].shift();
        var error = Keen._eq[i].shift();
        Keen.addEvent(eventCollection, event, success, error);
    }
    Keen._eq = null;
}
if (Keen._ocrq && Keen._ocrq.length > 0) {
    for (var i = 0; i < Keen._ocrq.length; i++) {
        var onChartsReadyHandler = Keen._ocrq[i];
        Keen.onChartsReady(onChartsReadyHandler);
    }
    Keen._ocrq = null;
}

},{}],7:[function(_dereq_,module,exports){
var Api = _dereq_('./api'),
  dom = _dereq_('./dom');

module.exports = Signupsio;

function Signupsio(key) {
  if(!(this instanceof Signupsio)) return new Signupsio(key);
  this.api = new Signupsio.Api(key);
}

Signupsio.Api = Api;

Signupsio.prototype.trackForm = function(form) {
  var self = this;
  form.addEventListener('submit', this._onSubmit(form));
  dom.each(form, "input, select, textarea, button", function (el) {
    el.addEventListener('click', self._onClick(el));
  });
};

Signupsio.prototype.visit = function (page) {
  api.sendEvent('visit', {
    page_name: page
  });
};

Signupsio.prototype.auto = function () {
  var self = this;
  dom.ready(function () {
    self.visit(document.title);
    dom.each("form.signupsio", self.trackForm.bind(self));
  });
};

Signupsio.prototype._onClick = function () {
  var self = this;
  return function (e) {
    self.api.sendEvent('click', {
      input_name: this.getAttribute('name'),
      input_type: this.tagName.toLowerCase() === 'input' ? this.getAttribute('type') : this.tagName.toLowerCase()
    });
  };
};

Signupsio.prototype._onSubmit = function (form) {
  var self = this;

  return function (e) {
    e.preventDefault();

    var values = {};

    dom.each(form, "input, select, textarea, button", function (el) {
      dom.val(el, values);
    });

    self.api.sendEvent('signup', values, function (err, signup) {
      if(err) {
        dom.trigger(form, 'signup:error', err);
        dom.addClass(form, 'error');
      } else {
        dom.trigger(form, 'signup', values);
        dom.addClass(form, 'submitted');
      }
    });

  };
};



},{"./api":3,"./dom":5}]},{},[7])
(7)
});