!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Signupsio=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  
  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

},{}],2:[function(_dereq_,module,exports){
module.exports = _dereq_("./lib/randomstring");
},{"./lib/randomstring":3}],3:[function(_dereq_,module,exports){
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
},{}],4:[function(_dereq_,module,exports){
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */

!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , twoHundo = /^(20\d|1223)$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , xDomainRequest = 'XDomainRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          'contentType': 'application/x-www-form-urlencoded'
        , 'requestedWith': xmlHttpRequest
        , 'accept': {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , 'xml':  'application/xml, text/xml'
            , 'html': 'text/html'
            , 'text': 'text/plain'
            , 'json': 'application/json, text/javascript'
            , 'js':   'application/javascript, text/javascript'
          }
      }

    , xhr = function(o) {
        // is it x-domain
        if (o['crossOrigin'] === true) {
          var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
          if (xhr && 'withCredentials' in xhr) {
            return xhr
          } else if (win[xDomainRequest]) {
            return new XDomainRequest()
          } else {
            throw new Error('Browser does not support cross-origin requests')
          }
        } else if (win[xmlHttpRequest]) {
          return new XMLHttpRequest()
        } else {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }
      }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (twoHundo.test(r.request.status)) success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o['headers'] || {}
      , h

    headers['Accept'] = headers['Accept']
      || defaultHeaders['accept'][o['type']]
      || defaultHeaders['accept']['*']

    // breaks cross-origin requests with legacy browsers
    if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
    if (!headers[contentType]) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
    for (h in headers)
      headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o['withCredentials']
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o['jsonpCallback'] || 'callback' // the 'callback' key
      , cbval = o['jsonpCallbackName'] || reqwest.getcallbackPrefix(reqId)
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      fn(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        err({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o['method'] || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o['url']
      // convert non-string objects to query-string form unless o['processData'] is false
      , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
        ? reqwest.toQueryString(o['data'])
        : (o['data'] || null)
      , http
      , sendWait = false

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o['type'] == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o['type'] == 'jsonp') return handleJsonp(o, fn, err, url)

    // get the xhr from the factory if passed
    // if the factory returns null, fall-back to ours
    http = (o.xhr && o.xhr(o)) || xhr(o)

    http.open(method, url, o['async'] === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
        http.onload = fn
        http.onerror = err
        // NOTE: see
        // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
        http.onprogress = function() {}
        sendWait = true
    } else {
      http.onreadystatechange = handleReadyState(this, fn, err)
    }
    o['before'] && o['before'](http)
    if (sendWait) {
      setTimeout(function () {
        http.send(data)
      }, 200)
    } else {
      http.send(data)
    }
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(header) {
    // json, javascript, text/plain, text/html, xml
    if (header.match('json')) return 'json'
    if (header.match('javascript')) return 'js'
    if (header.match('text')) return 'html'
    if (header.match('xml')) return 'xml'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o['url']
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._successHandler = function(){}
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this

    fn = fn || function () {}

    if (o['timeout']) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o['timeout'])
    }

    if (o['success']) {
      this._successHandler = function () {
        o['success'].apply(o, arguments)
      }
    }

    if (o['error']) {
      this._errorHandlers.push(function () {
        o['error'].apply(o, arguments)
      })
    }

    if (o['complete']) {
      this._completeHandlers.push(function () {
        o['complete'].apply(o, arguments)
      })
    }

    function complete (resp) {
      o['timeout'] && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      var type = o['type'] || setType(resp.getResponseHeader('Content-Type'))
      resp = (type !== 'jsonp') ? self.request : resp
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = filteredResponse
      try {
        resp.responseText = r
      } catch (e) {
        // can't assign this in IE<=8, just ignore
      }
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      self._successHandler(resp)
      while (self._fulfillmentHandlers.length > 0) {
        resp = self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      resp = self.request
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      success = success || function () {}
      fail = fail || function () {}
      if (this._fulfilled) {
        this._responseArgs.resp = success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o['disabled'])
            cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o, trad) {
    var prefix, i
      , traditional = trad || false
      , s = []
      , enc = encodeURIComponent
      , add = function (key, value) {
          // If value is a function, invoke it and return its value
          value = ('function' === typeof value) ? value() : (value == null ? '' : value)
          s[s.length] = enc(key) + '=' + enc(value)
        }
    // If an array was passed in, assume that it is an array of form elements.
    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
      }
    }

    // spaces should be + according to spec
    return s.join('&').replace(/%20/g, '+')
  }

  function buildParams(prefix, obj, traditional, add) {
    var name, i, v
      , rbracket = /\[\]$/

    if (isArray(obj)) {
      // Serialize array item.
      for (i = 0; obj && i < obj.length; i++) {
        v = obj[i]
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v)
        } else {
          buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
        }
      }
    } else if (obj && obj.toString() === '[object Object]') {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj)
    }
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o['type'] && (o['method'] = o['type']) && delete o['type']
      o['dataType'] && (o['type'] = o['dataType'])
      o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
      o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});

},{}],5:[function(_dereq_,module,exports){
var cookies = _dereq_('./cookies');
var randomstring = _dereq_('randomstring');
var Keen = _dereq_('./lib/keen_track');
var request = _dereq_('reqwest');

module.exports = Api;

function Api(key) {
  this._url = 'http://keys.signups.io/projects/<key>/key';
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

Api.prototype.url = function (key) {
  return this._url.replace('<key>', key);
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
  var api = this;

  // mark the API as inactive until we get the new keys
  api._active = false;

  // grab the full key from signups.io
  request({
    url: api.url(key),
    type: 'json',
    crossOrigin: true,
    success: function (resp) {
      if(!resp.key) throw new Error("No key in JSON response.");
      api._setKeys(resp.key);
    },
    error: function (err) {
      throw err;
    }
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
  name = name.replace(/[^\x00-\x7F]/g, '_');

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

},{"./cookies":6,"./lib/keen_track":8,"randomstring":2,"reqwest":4}],6:[function(_dereq_,module,exports){
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

},{}],7:[function(_dereq_,module,exports){
exports.each = each;
exports.addClass = addClass;
exports.removeClass = removeClass;
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
  var split = el.className.split(' ');
  if(!~split.indexOf(className)) {
    split.push(className);
    el.className = split.join(' ');
  }
}

function removeClass(el, className) {
  el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
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

},{}],8:[function(_dereq_,module,exports){
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

},{}],9:[function(_dereq_,module,exports){
var Api = _dereq_('./api'),
  qs = _dereq_('qs'),
  dom = _dereq_('./dom');

module.exports = Signupsio;

function Signupsio(key) {
  if(!(this instanceof Signupsio)) return new Signupsio(key);
  this.api = new Signupsio.Api(key);
}

Signupsio.Api = Api;

Signupsio._forms = [];
Signupsio._instances = {};

Signupsio.auto = function () {
  dom.ready(function () {
    dom.each("form.signupsio", function (form) {
      var href,
        key,
        signupsio;

      // pull the url from the form
      href = form.getAttribute('action');

      if(href && ~href.indexOf('?')) {

        // get the key from the query string
        key = qs.parse(href.slice(href.indexOf('?') + 1)).key;

        if(key) {

          if(~Signupsio._forms.indexOf(form)) {
            // we're already tracking this form
            return;
          }

          // don't track forms more than once
          Signupsio._forms.push(form);

          // create a new instance for this form
          signupsio = new Signupsio(key);

          // record a visit to the page
          signupsio.visit(document.title);

          // keep an eye on the form for IX
          signupsio.trackForm(form);
        }
      }
    });
  });
};

Signupsio.prototype.trackForm = function(form) {
  var self = this;
  form.addEventListener('submit', this._onSubmit(form));
  dom.each(form, "input, select, textarea, button", function (el) {
    el.addEventListener('click', self._onClick(el));
  });
};

Signupsio.prototype.visit = function (page) {
  this.api.sendEvent('visit', {
    page_name: page
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

    dom.addClass(form, 'signupsio-submitting');

    var values = {};

    dom.each(form, "input, select, textarea, button", function (el) {
      dom.val(el, values);
    });

    self.api.sendEvent('signup', values, function (err, signup) {
      dom.removeClass(form, 'signupsio-submitting');
      if(err) {
        dom.trigger(form, 'signup:error', err);
        dom.addClass(form, 'signupsio-error');
      } else {
        dom.trigger(form, 'signup', values);
        dom.addClass(form, 'signupsio-submitted');
      }
    });

  };
};

// automatically call `Signupsio.auto`. If it's not desired for forms to be scanned automatically, don't class them with `signupsio`.
Signupsio.auto();

},{"./api":5,"./dom":7,"qs":1}]},{},[9])
(9)
});