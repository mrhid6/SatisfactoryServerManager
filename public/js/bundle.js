(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],4:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":2,"./encode":3}],5:[function(require,module,exports){
const Logger = require("./logger");

class API_Proxy {
    constructor() {}

    get(...args) {
        const url = "/api/" + args.join("/");
        Logger.debug("API Proxy [GET] " + url);
        return new Promise((resolve, reject) => {
            $.get(url, (result) => {
                resolve(result);
            });
        });
    }

    post(...args) {
        const url = "/api/" + args.join("/");
        Logger.debug("API Proxy [POST] " + url);
        return new Promise((resolve, reject) => {
            $.post(url, (result) => {
                resolve(result);
            });
        });
    }

    postData(posturl, data) {
        const url = "/api/" + posturl;
        Logger.debug("API Proxy [POST] " + url);
        return new Promise((resolve, reject) => {
            $.post(url, data, (result) => {
                resolve(result);
            });
        });
    }

    upload(uploadurl, formdata) {
        const url = "/api/" + uploadurl;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: "POST",
                data: formdata, // The form with the file inputs.
                processData: false,
                contentType: false, // Using FormData, no need to process data.
            })
                .done((data) => {
                    resolve(data);
                })
                .fail((err) => {
                    reject(err);
                });
        });
    }

    download(posturl, data) {
        const url = "/api/" + posturl;
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                url: url,
                data: data,
                xhrFields: {
                    responseType: "blob", // to avoid binary data being mangled on charset conversion
                },
                success: function (blob, status, xhr) {
                    // check for a filename
                    var filename = "";
                    var disposition = xhr.getResponseHeader(
                        "Content-Disposition"
                    );
                    if (
                        disposition &&
                        disposition.indexOf("attachment") !== -1
                    ) {
                        var filenameRegex =
                            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        var matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1])
                            filename = matches[1].replace(/['"]/g, "");
                    }

                    if (typeof window.navigator.msSaveBlob !== "undefined") {
                        // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
                        window.navigator.msSaveBlob(blob, filename);
                        resolve();
                    } else {
                        var URL = window.URL || window.webkitURL;
                        var downloadUrl = URL.createObjectURL(blob);

                        if (filename) {
                            // use HTML5 a[download] attribute to specify filename
                            var a = document.createElement("a");
                            // safari doesn't support this yet
                            if (typeof a.download === "undefined") {
                                window.location.href = downloadUrl;
                                resolve();
                            } else {
                                a.href = downloadUrl;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                resolve();
                            }
                        } else {
                            window.location.href = downloadUrl;
                            resolve();
                        }

                        setTimeout(function () {
                            URL.revokeObjectURL(downloadUrl);
                        }, 100); // cleanup
                    }
                },
            });
        });
    }
}

const api_proxy = new API_Proxy();
module.exports = api_proxy;

},{"./logger":8}],6:[function(require,module,exports){
const PageHandler = require("./page_handler");
const Logger = require("./logger");

Date.prototype.getMonthName = function () {
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    return monthNames[this.getMonth()];
};

Number.prototype.pad = function (width, z) {
    let n = this;
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

Number.prototype.toDecimal = function () {
    return this.toFixed(2);
};

String.prototype.trunc =
    String.prototype.trunc ||
    function (n) {
        return this.length > n ? this.substr(0, n - 1) + "&hellip;" : this;
    };

function main() {
    Logger.displayBanner();
    PageHandler.init();
}

$(document).ready(() => {
    main();
});

},{"./logger":8,"./page_handler":11}],7:[function(require,module,exports){
const logger = require("./logger");

const EventEmitter = require("events");
const { stringify } = require("querystring");

class PageCache extends EventEmitter {
    constructor() {
        super();

        this.AgentList = [];
        this.ActiveAgent = null;
        this.SMLVersions = [];
        this.FicsitMods = GetLocalStorage("FicsitMods", []);
        this.InstalledMods = [];
    }

    setAgentsList(agentList) {
        this.AgentList = agentList;
        this.setActiveAgent(getCookie("currentAgentId"));
        this.emit("setagentslist");
    }

    getAgentsList() {
        return this.AgentList;
    }

    setActiveAgent(id) {
        if (id == null) {
            return;
        }

        const Agent = this.getAgentsList().find((agent) => agent.id == id);

        if (Agent == null && this.getAgentsList().length > 0) {
            this.ActiveAgent = this.getAgentsList()[0];
            setCookie("currentAgentId", this.ActiveAgent.id, 10);
            this.emit("setactiveagent");
            return;
        } else if (Agent == null) {
            return;
        }

        if (this.ActiveAgent != null && this.ActiveAgent.id == Agent.id) {
            return;
        }

        setCookie("currentAgentId", id, 10);

        this.ActiveAgent = Agent;
        this.emit("setactiveagent");
    }

    getActiveAgent() {
        return this.ActiveAgent;
    }

    setSMLVersions(versions) {
        this.SMLVersions = versions;
        this.emit("setsmlversions");
    }

    getSMLVersions() {
        return this.SMLVersions;
    }

    setFicsitMods(mods) {
        this.FicsitMods = mods;

        const StorageData = {
            data: this.FicsitMods,
        };

        StoreInLocalStorage("FicsitMods", StorageData, 1);
        this.emit("setficsitmods");
    }

    getFicsitMods() {
        return this.FicsitMods;
    }

    getAgentInstalledMods() {
        return this.InstalledMods;
    }

    SetAgentInstalledMods(mods) {
        this.InstalledMods = mods;
        this.emit("setinstalledmods");
    }
}

function StoreInLocalStorage(Key, Data, ExpiryHrs) {
    var date = new Date();
    date.setTime(date.getTime() + ExpiryHrs * 60 * 60 * 1000);
    Data.expiry = date.getTime();

    const DataStr = JSON.stringify(Data);

    localStorage.setItem(Key, DataStr);
}

function RemoveLocalStorage(Key) {
    localStorage.removeItem(Key);
}

function GetLocalStorage(Key, defaultReturn) {
    const LSdata = localStorage.getItem(Key);
    const data = JSON.parse(LSdata);

    if (data == null) {
        return defaultReturn;
    }

    var date = new Date();
    if (date.getTime() > data.expiry) {
        RemoveLocalStorage(Key);
        return defaultReturn;
    }

    return data.data;
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

const pageCache = new PageCache();

module.exports = pageCache;

},{"./logger":8,"events":1,"querystring":4}],8:[function(require,module,exports){
const Logger = {};

Logger.TYPES = {
    LOG: 0,
    INFO: 1,
    SUCCESS: 2,
    WARNING: 3,
    ERROR: 4,
    DEBUG: 5,
    RESET: 6,
};

Logger.LEVEL = Logger.TYPES.DEBUG;

Logger.STYLES = [
    "padding: 2px 8px; margin-right:8px; background:#cccccc; color:#000; font-weight:bold; border:1px solid #000;",
    "padding: 2px 8px; margin-right:8px; background:#008cba; color:#fff; font-weight:bold; border:1px solid #000;",
    "padding: 2px 8px; margin-right:8px; background:#43ac6a; color:#fff; font-weight:bold; border:1px solid #3c9a5f;",
    "padding: 2px 8px; margin-right:8px; background:#E99002; color:#fff; font-weight:bold; border:1px solid #d08002;",
    "padding: 2px 8px; margin-right:8px; background:#F04124; color:#fff; font-weight:bold; border:1px solid #ea2f10;",
    "padding: 2px 8px; margin-right:8px; background:#003aba; color:#fff; font-weight:bold; border:1px solid #000;",
    "",
];

Logger.init = () => {
    Logger.displayBanner();
};

Logger.displayBanner = () => {
    Logger.BannerMessage = `
%c #-----------------------------# 
 #      _____ _____ __  __     # 
 #     / ____/ ____|  \\/  |    # 
 #    | (___| (___ | \\  / |    # 
 #     \\___ \\\\___ \\| |\\/| |    # 
 #     ____) |___) | |  | |    # 
 #    |_____/_____/|_|  |_|    # 
 #-----------------------------# 
 # Satisfactory Server Manager # 
 #-----------------------------# 
`;

    console.log(
        Logger.BannerMessage,
        "background:#008cba;color:#fff;font-weight:bold"
    );
};

Logger.getLoggerTypeString = (LoggerType) => {
    switch (LoggerType) {
        case 0:
            return "LOG";
        case 1:
            return "INFO";
        case 2:
            return "SUCCESS";
        case 3:
            return "WARN";
        case 4:
            return "ERROR";
        case 5:
            return "DEBUG";
    }
};

Logger.toLog = (LoggerType, Message) => {
    if (LoggerType == null) return;

    if (LoggerType > Logger.LEVEL) return;

    const style = Logger.STYLES[LoggerType];
    const resetStyle = Logger.STYLES[Logger.TYPES.RESET];
    const typeString = Logger.getLoggerTypeString(LoggerType);

    console.log("%c" + typeString + "%c" + Message, style, resetStyle);
};

Logger.log = (Message) => {
    Logger.toLog(Logger.TYPES.LOG, Message);
};

Logger.info = (Message) => {
    Logger.toLog(Logger.TYPES.INFO, Message);
};

Logger.success = (Message) => {
    Logger.toLog(Logger.TYPES.SUCCESS, Message);
};

Logger.warning = (Message) => {
    Logger.toLog(Logger.TYPES.WARNING, Message);
};

Logger.error = (Message) => {
    Logger.toLog(Logger.TYPES.ERROR, Message);
};

Logger.debug = (Message) => {
    Logger.toLog(Logger.TYPES.DEBUG, Message);
};

module.exports = Logger;

},{}],9:[function(require,module,exports){
const API_Proxy = require("./api_proxy");

const PageCache = require("./cache");

class Page_Backups {
    constructor() {
        this._ROLES = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        });
    }

    setupJqueryListeners() {
        $("body").on("click", ".download-backup-btn", (e) => {
            this.DownloadBackup($(e.currentTarget));
        });
    }

    MainDisplayFunction() {
        this.DisplayBackupsTable();
    }

    DisplayBackupsTable() {
        const Agent = PageCache.getActiveAgent();

        const postData = {
            agentid: Agent.id,
        };

        API_Proxy.postData("agent/backups", postData).then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#backups-table");
            const tableData = [];

            const backups = res.data;

            if (backups != null && backups.length > 0) {
                let index = 0;
                backups.forEach((backup) => {
                    let deleteBackupEl = $("<button/>")
                        .addClass("btn btn-danger float-end remove-backup-btn")
                        .html("<i class='fas fa-trash'></i>")
                        .attr("data-backup-name", backup.filename);

                    let downloadBackupEl = $("<button/>")
                        .addClass(
                            "btn btn-primary float-start download-backup-btn"
                        )
                        .html("<i class='fas fa-download'></i>")
                        .attr("data-backup-name", backup.filename);

                    const downloadSaveStr = deleteBackupEl.prop("outerHTML");
                    const deleteSaveStr = downloadBackupEl.prop("outerHTML");

                    tableData.push([
                        backup.filename,
                        BackupDate(backup.created),
                        humanFileSize(backup.size),
                        downloadSaveStr + deleteSaveStr,
                    ]);
                    index++;
                });
            }

            if (isDataTable == false) {
                $("#backups-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#backups-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DownloadBackup($btn) {
        const BackupFile = $btn.attr("data-backup-name");

        const Agent = PageCache.getActiveAgent();

        const postData = {
            agentid: Agent.id,
            backupfile: BackupFile,
        };

        console.log(postData);

        API_Proxy.download("agent/backups/download", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }
}

function BackupDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().pad(2);
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + " B";
    }

    const units = si
        ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
        : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (
        Math.round(Math.abs(bytes) * r) / r >= thresh &&
        u < units.length - 1
    );

    return bytes.toFixed(dp) + " " + units[u];
}

const page = new Page_Backups();

module.exports = page;

},{"./api_proxy":5,"./cache":7}],10:[function(require,module,exports){
const API_Proxy = require("./api_proxy");

const PageCache = require("./cache");
const logger = require("./logger");

class Page_Dashboard {
    constructor() {
        this.ServerState = {};
    }

    init() {
        this.setupEventHandlers();
        this.setupJqueryListeners();
        this.DashboardBuilt = false;
    }

    setupEventHandlers() {
        PageCache.on("setagentslist", () => {
            logger.info("Got Agents List!");
            this.OnGotAgentsList();
        });
    }

    setupJqueryListeners() {
        $("#server-action-start").on("click", (e) => {
            e.preventDefault();
            this.ServerAction_Start();
        });

        $("#server-action-stop").on("click", (e) => {
            e.preventDefault();
            this.ServerAction_Stop();
        });

        $("#server-action-kill").on("click", (e) => {
            e.preventDefault();
            this.ServerAction_Kill();
        });

        $("body").on("click", ".server-action-btn", (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const postData = {
                agentid: $btn.attr("data-agent-id"),
                action: $btn.attr("data-action"),
            };
            console.log(postData);

            this.ExecuteServerAction(postData);
        });
    }

    OnGotAgentsList() {
        const el = $("#server-count");

        const runningCount = PageCache.getAgentsList().filter(
            (agent) => agent.running == true && agent.active == true
        ).length;
        const maxCount = PageCache.getAgentsList().length;

        el.text(`${runningCount} / ${maxCount}`);

        const $AgentWrapper = $("#agents-wrapper");
        if (this.DashboardBuilt == false) {
            $AgentWrapper.empty();

            if (PageCache.getAgentsList().length == 0) {
                $AgentWrapper.append(`
                <div class="alert alert-info">It looks there is no servers set up yet! Go to the <strong>Servers</strong> page to set up your first server.</div>
                `);
            }

            let $Row = $("<div/>").addClass("row");

            PageCache.getAgentsList().forEach((Agent, index) => {
                $Row.append(this.BuildAgentsUI(Agent));
            });

            $AgentWrapper.append($Row);

            PageCache.getAgentsList().forEach((Agent, index) => {
                const $Card = $(`#server-card-${Agent.id}`);
                this.ToggleActionsButtons(Agent, $Card);
            });

            this.DashboardBuilt = true;
        } else {
            PageCache.getAgentsList().forEach((Agent, index) => {
                const $Card = $(`#server-card-${Agent.id}`);
                this.UpdateAgentCardInfo(Agent);
                this.ToggleActionsButtons(Agent, $Card);
            });
        }
    }

    BuildAgentsUI(Agent) {
        console.log(Agent);

        const $Col = $("<div/>").addClass("col-12 col-md-6 col-lg-6 col-xl-3");

        const $Card = $("<div/>")
            .addClass("card mb-3")
            .attr("id", `server-card-${Agent.id}`);
        $Col.append($Card);

        const $CardHeader = $("<div/>").addClass("card-header");
        const $CardServerSettingsBtn = $(
            `<a class="float-end" href="/server/${Agent.id}"><button class="btn btn-primary"><i class='fas fa-cog'></i></button></a>`
        );
        $CardHeader.append($CardServerSettingsBtn);
        $CardHeader.append(`<h5>Server: ${Agent.displayname}</h5>`);
        $Card.append($CardHeader);

        const $CardBody = $("<div/>").addClass("card-body");
        $Card.append($CardBody);

        let StatusText = "Offline";
        let UsersText = 0;
        let ModCount = 0;

        if (Agent != null && Agent.running && Agent.active) {
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {
                if (
                    serverState.status == "notinstalled" ||
                    SFConfig.installed == false
                ) {
                    StatusText = "Not Installed";
                } else if (serverState.status == "stopped") {
                    StatusText = "Stopped";
                } else if (serverState.status == "running") {
                    StatusText = "Running";
                }
            }

            ModCount = Agent.info.mods.length;
            UsersText = Agent.info.usercount;
        }

        const $StatusInfoCard = this.BuildAgentInfoCard(
            "status",
            "blue",
            "Status",
            StatusText,
            "fa-server"
        );
        $CardBody.append($StatusInfoCard);

        const $UsersInfoCard = this.BuildAgentInfoCard(
            "users",
            "orange",
            "Users",
            UsersText,
            "fa-user"
        );
        $CardBody.append($UsersInfoCard);

        const $ModsInfoCard = this.BuildAgentInfoCard(
            "mods",
            "green",
            "Installed Mods",
            ModCount,
            "fa-pencil-ruler"
        );
        $CardBody.append($ModsInfoCard);

        $CardBody.append("<hr/>");

        const $ProgressBarwrapper = $("<div/>").addClass(
            "progress-bar-wrapper"
        );
        $CardBody.append($ProgressBarwrapper);

        const $cpuProgress = this.BuildAgentProgressBar(
            Agent.id,
            "cpu_progress",
            "CPU"
        );
        $ProgressBarwrapper.append($cpuProgress);

        const $memProgress = this.BuildAgentProgressBar(
            Agent.id,
            "mem_progress",
            "RAM"
        );
        $ProgressBarwrapper.append($memProgress);

        const serverState = Agent.info.serverstate;
        let cpuPercent = 0;
        let memPercent = 0;
        if (serverState != null) {
            cpuPercent = serverState.pcpu.toDecimal();
            memPercent = serverState.pmem.toDecimal();
        }

        $cpuProgress
            .circleProgress({
                startAngle: (-Math.PI / 4) * 2,
                value: cpuPercent / 100,
                size: 150,
                lineCap: "round",
                emptyFill: "rgba(255, 255, 255, .1)",
                fill: {
                    color: "#ffa500",
                },
            })
            .on(
                "circle-animation-progress",
                function (event, progress, stepValue) {
                    $(this)
                        .find("strong")
                        .text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
                }
            );

        $memProgress
            .circleProgress({
                startAngle: (-Math.PI / 4) * 2,
                value: memPercent / 100,
                size: 150,
                lineCap: "round",
                emptyFill: "rgba(255, 255, 255, .1)",
                fill: {
                    color: "#ffa500",
                },
            })
            .on(
                "circle-animation-progress",
                function (event, progress, stepValue) {
                    $(this)
                        .find("strong")
                        .text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
                }
            );

        $CardBody.append("<hr/>");

        const $ActionButtonWrapper = $(`<div class="row"></div>`);
        $CardBody.append($ActionButtonWrapper);

        $ActionButtonWrapper.append(
            this.BuildServerActionButton(
                Agent.id,
                "success",
                "start",
                "fa-play",
                "Start Server"
            )
        );
        $ActionButtonWrapper.append(
            this.BuildServerActionButton(
                Agent.id,
                "warning",
                "stop",
                "fa-stop",
                "Stop Server"
            )
        );
        $ActionButtonWrapper.append(
            this.BuildServerActionButton(
                Agent.id,
                "danger",
                "kill",
                "fa-skull-crossbones",
                "Kill Server"
            )
        );

        return $Col;
    }

    BuildAgentInfoCard(ClassID, ClassColour, Title, Data, Icon) {
        const $infoCard =
            $(`<div class="status-info-card ${ClassColour} info-card-${ClassID}">
        <div class="status-info-card-main">${Title}:</div>
        <div class="status-info-card-secondary">${Data}</div>
        <div class="status-info-card-icon">
            <i class="fas ${Icon}"></i>
        </div>
    </div>`);

        return $infoCard;
    }

    BuildAgentProgressBar(AgentId, elID, Title) {
        return $(`<div class="circle ${elID}_${AgentId}">
        <strong></strong>
        <h6>${Title}</h6>
    </div>`);
    }

    BuildServerActionButton(AgentID, styleClass, action, icon, Text) {
        return $(`<div class='col-12 col-lg-4 mb-2'>
        <div class="d-grid  gap-2" data-bs-toggle="tooltip" data-bs-placement="bottom"
        title="Tooltip on bottom">
        <button class='btn btn-${styleClass} btn-block server-action-btn' data-agent-id='${AgentID}' data-action='${action}'><i class="fas ${icon}"></i> ${Text}</button>
        </div>
        </div>`);
    }

    UpdateAgentCardInfo(Agent) {
        const $Card = $(`#server-card-${Agent.id}`);

        let StatusText = "Offline";
        let UsersText = 0;
        let ModCount = 0;

        if (Agent != null && Agent.running && Agent.active) {
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {
                if (
                    serverState.status == "notinstalled" ||
                    SFConfig.installed == false
                ) {
                    StatusText = "Not Installed";
                } else if (serverState.status == "stopped") {
                    StatusText = "Stopped";
                } else if (serverState.status == "running") {
                    StatusText = "Running";
                }
            }

            ModCount = Agent.info.mods.length;
            UsersText = Agent.info.usercount;
        }

        $Card
            .find(`.info-card-status .status-info-card-secondary`)
            .text(StatusText);
        $Card
            .find(`.info-card-users .status-info-card-secondary`)
            .text(UsersText);
        $Card
            .find(`.info-card-mods .status-info-card-secondary`)
            .text(ModCount);

        const serverState = Agent.info.serverstate;
        let cpuPercent = 0;
        let memPercent = 0;
        if (serverState != null) {
            cpuPercent = serverState.pcpu.toDecimal();
            memPercent = serverState.pmem.toDecimal();
        }

        const $cpuProgress = $Card.find(`.cpu_progress_${Agent.id}`);
        $cpuProgress.circleProgress("value", cpuPercent / 100);

        const $memProgress = $Card.find(`.mem_progress_${Agent.id}`);
        $memProgress.circleProgress("value", memPercent / 100);
    }

    ToggleActionsButtons(Agent, $Card) {
        const $StartButton = $Card.find(
            ".server-action-btn[data-action='start']"
        );
        const $StopButton = $Card.find(
            ".server-action-btn[data-action='stop']"
        );
        const $KillButton = $Card.find(
            ".server-action-btn[data-action='kill']"
        );

        $StartButton.prop("disabled", true);
        $StopButton.prop("disabled", true);
        $KillButton.prop("disabled", true);

        $StartButton.parent().attr("title", "");
        $StopButton.parent().attr("title", "");
        $KillButton.parent().attr("title", "");

        if (Agent != null && Agent.running === true && Agent.active === true) {
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {
                if (
                    serverState.status == "notinstalled" ||
                    SFConfig.installed == false
                ) {
                    $StartButton
                        .parent()
                        .attr("title", "SF Server Not Installed");
                    $StopButton
                        .parent()
                        .attr("title", "SF Server Not Installed");
                    $KillButton
                        .parent()
                        .attr("title", "SF Server Not Installed");

                    $StartButton.parent().tooltip("_fixTitle");
                    $StopButton.parent().tooltip("_fixTitle");
                    $KillButton.parent().tooltip("_fixTitle");
                    return;
                } else if (serverState.status == "stopped") {
                    $StartButton.prop("disabled", false);
                    $StopButton.prop("disabled", true);
                    $KillButton.prop("disabled", true);
                } else {
                    $StartButton.prop("disabled", true);
                    $StopButton.prop("disabled", false);
                    $KillButton.prop("disabled", false);
                }
            }
        } else {
            $StartButton.parent().attr("title", "Server Not Online");
            $StopButton.parent().attr("title", "Server Not Online");
            $KillButton.parent().attr("title", "Server Not Online");
            $StartButton.parent().tooltip("_fixTitle");
            $StopButton.parent().tooltip("_fixTitle");
            $KillButton.parent().tooltip("_fixTitle");
        }
    }

    ExecuteServerAction(postData) {
        API_Proxy.postData("agent/serveraction", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Server Action Completed!");
            } else {
                toastr.error("Failed to Execute Server Action!");
                logger.error(res.error);
            }
        });
    }
}

const page = new Page_Dashboard();

module.exports = page;

},{"./api_proxy":5,"./cache":7,"./logger":8}],11:[function(require,module,exports){
const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Logs = require("./page_logs");
const Page_Saves = require("./page_saves");
const Page_Settings = require("./page_settings");
const Page_Servers = require("./page_servers");
const Page_Server = require("./page_server");
const Page_Users = require("./page_users");
const Page_Backups = require("./page_backups");

const Logger = require("./logger");

class PageHandler {
    constructor() {
        this.page = "";
        this.SETUP_CACHE = {
            sfinstalls: [],
            selected_sfinstall: null,
        };
    }

    init() {
        toastr.options.closeButton = true;
        toastr.options.closeMethod = "fadeOut";
        toastr.options.closeDuration = 300;
        toastr.options.closeEasing = "swing";
        toastr.options.showEasing = "swing";
        toastr.options.timeOut = 30000;
        toastr.options.extendedTimeOut = 10000;
        toastr.options.progressBar = true;
        toastr.options.positionClass = "toast-bottom-right";

        this.setupJqueryHandler();
        this.getSSMVersion();

        this.page = $(".page-container").attr("data-page");

        switch (this.page) {
            case "dashboard":
                Page_Dashboard.init();
                break;
            case "mods":
                Page_Mods.init();
                break;
            case "logs":
                Page_Logs.init();
                break;
            case "saves":
                Page_Saves.init();
                break;
            case "servers":
                Page_Servers.init();
                break;
            case "server":
                Page_Server.init();
                break;
            case "admin":
                Page_Users.init();
                Page_Settings.init();
                break;
            case "backups":
                Page_Backups.init();
                break;
        }

        this.getAgentsList();
        this.startLoggedInCheck();
        this.startPageInfoRefresh();
    }

    setupJqueryHandler() {
        $('[data-toggle="tooltip"]').tooltip();

        $("#inp_server").on("change", (e) => {
            e.preventDefault();
            PageCache.setActiveAgent($(e.currentTarget).val());
        });

        $("#viewport.minimal #sidebar .navbar .nav-item a").tooltip(
            "_fixTitle"
        );
    }

    getAgentsList() {
        API_Proxy.get("agent", "agents")
            .then((res) => {
                if (res.result == "success") {
                    PageCache.setAgentsList(res.data);

                    this.populateServerSelection();
                } else {
                    Logger.error(res.error);
                }
            })
            .catch((err) => {
                console.log(err);
            });
    }

    populateServerSelection() {
        const $el = $("#inp_server");
        $el.find("option").not(":first").remove();
        for (let i = 0; i < PageCache.getAgentsList().length; i++) {
            const Agent = PageCache.getAgentsList()[i];
            $el.append(`<option value="${Agent.id}">${Agent.name}</option>`);
        }

        $el.val(getCookie("currentAgentId"));
    }

    getSSMVersion() {
        API_Proxy.get("info", "ssmversion").then((res) => {
            const el = $("#ssm-version");
            if (res.result == "success") {
                this.checkSSMVersion(res.data);
                el.text(res.data.current_version);
            } else {
                el.text("Server Error!");
            }
        });
    }

    checkSSMVersion(version_data) {
        const ToastId =
            "toast_" +
            version_data.current_version +
            "_" +
            version_data.github_version +
            "_" +
            version_data.version_diff;
        const ToastDisplayed = getCookie(ToastId);

        if (ToastDisplayed == null) {
            if (version_data.version_diff == "gt") {
                toastr.warning(
                    "You are currently using a Development version of SSM"
                );
            } else if (version_data.version_diff == "lt") {
                toastr.warning("SSM requires updating. Please update now");
            }

            setCookie(ToastId, true, 30);
        }
    }

    startLoggedInCheck() {
        const interval = setInterval(() => {
            Logger.debug("Checking Logged In!");
            this.checkLoggedIn().then((loggedin) => {
                if (loggedin != true) {
                    clearInterval(interval);
                    window.location.replace("/logout");
                }
            });
        }, 10000);
    }

    checkLoggedIn() {
        return new Promise((resolve, reject) => {
            API_Proxy.get("info", "loggedin").then((res) => {
                if (res.result == "success") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    startPageInfoRefresh() {
        setInterval(() => {
            this.getAgentsList();
        }, 5 * 1000);
    }
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";
}

window.openModal = function (modal_dir, modal_name, var1, var2) {
    let options = {
        allowBackdropRemoval: true,
    };

    let callback = null;

    if (arguments.length == 3) {
        callback = var1;
    } else if (arguments.length == 4) {
        options = var1;
        callback = var2;
    }

    if ($("body").hasClass("modal-open")) {
        return;
    }

    $.ajax({
        url: modal_dir + "/" + modal_name + ".html",
        success: function (data) {
            $("body").append(data);

            var modalEl = $("#" + modal_name);

            modalEl.find("button.close").on("click", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget)
                    .parent()
                    .parent()
                    .parent()
                    .parent();
                $this.remove();
                $this.trigger("hidden.bs.modal");
                $this.modal("hide");
                $("body").removeClass("modal-open").attr("style", null);
                $(".modal-backdrop").remove();
            });

            modalEl.on("hidden.bs.modal", () => {
                $(this).remove();
                $('[name^="__privateStripe"]').remove();
                if (options.allowBackdropRemoval == true)
                    $(".modal-backdrop").remove();
            });
            modalEl.modal("show");
            if (callback) callback(modalEl);
        },
        dataType: "html",
    });
};

const pagehandler = new PageHandler();

module.exports = pagehandler;

},{"./api_proxy":5,"./cache":7,"./logger":8,"./page_backups":9,"./page_dashboard":10,"./page_logs":12,"./page_mods":13,"./page_saves":14,"./page_server":15,"./page_servers":16,"./page_settings":17,"./page_users":18}],12:[function(require,module,exports){
const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

class Page_Logs {
    constructor() {
        this.ServerState = {};

        this._TotalSFLogLines = 0;
        this._SFLogOffset = 0;
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    setupJqueryListeners() {
        $("body").on("click", ".sf-log-page-link", (e) => {
            e.preventDefault();
            const $pageBtn = $(e.currentTarget);
            console.log(parseInt($pageBtn.text()) - 1);
            this._SFLogOffset = (parseInt($pageBtn.text()) - 1) * 500;

            this.getSFServerLog(true);
        });
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        });
    }

    MainDisplayFunction() {
        const Agent = PageCache.getActiveAgent();

        if (Agent == null) {
            this.getSSMLog();
            return;
        }

        this.getSSMLog();
        this.getSFServerLog();
    }

    getSSMLog() {
        const Agent = PageCache.getActiveAgent();
        const postData = {};

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/ssmlog", postData).then((res) => {
            const el = $("#ssm-log-viewer samp");
            el.empty();
            if (res.result == "success") {
                res.data.forEach((logline) => {
                    el.append("<p>" + logline + "</p>");
                });
            } else {
                el.text(res.error.message);
            }
        });
    }

    getSFServerLog(force = false) {
        const Agent = PageCache.getActiveAgent();
        const postData = {
            offset: this._SFLogOffset,
        };

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/sfserverlog", postData).then((res) => {
            const el = $("#sf-log-viewer samp");
            const el2 = $("#sf-logins-viewer samp");
            el.empty();
            el2.empty();
            if (res.result == "success") {
                if (
                    res.data.lineCount != this._TotalSFLogLines ||
                    force == true
                ) {
                    this._TotalSFLogLines = res.data.lineCount;
                    this.buildSFLogPagination();
                    res.data.logArray.forEach((logline) => {
                        el.append("<p>" + logline + "</p>");
                    });

                    res.data.playerJoins.forEach((logline) => {
                        el2.append("<p>" + logline + "</p>");
                    });
                }
            } else {
                el.text(res.error);
                el2.text(res.error);
            }
        });
    }

    buildSFLogPagination() {
        const $el = $("#SFLogPagination .pagination");
        $el.empty();

        const pageCount = Math.ceil(this._TotalSFLogLines / 500) + 1;
        for (let i = 1; i < pageCount; i++) {
            const pageOffset = (i - 1) * 500;

            $el.append(
                `<li class="page-item ${
                    this._SFLogOffset == pageOffset ? "active" : ""
                }"><a class="page-link sf-log-page-link ">${i}</a></li>`
            );
        }
    }
}

const page = new Page_Logs();

module.exports = page;

},{"./api_proxy":5,"./cache":7}],13:[function(require,module,exports){
const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

class Page_Mods {
    constructor() {
        this.Agent = null;
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setsmlversions", () => {
            this.displayFicsitSMLVersions();
        });

        PageCache.on("setficsitmods", () => {
            this.displayFicsitModList();
            this.displayInstalledMods();
        });

        PageCache.on("setinstalledmods", () => {
            this.displayInstalledMods();
        });

        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        });
    }

    setupJqueryListeners() {
        $("body")
            .on("change", "#sel-add-mod-name", (e) => {
                this.getFicsitModInfo();
            })
            .on("change", "#sel-add-mod-version", (e) => {
                const $self = $(e.currentTarget);

                if ($self.val() == -1) {
                    this.lockInstallModBtn();
                } else {
                    this.unlockInstallModBtn();
                }
            })
            .on("click", ".btn-uninstall-mod", (e) => {
                if (this.CheckServerIsRunning() == false) {
                    const $self = $(e.currentTarget);
                    this.uninstallMod($self);
                }
            })
            .on("click", ".btn-update-mod", (e) => {
                if (this.CheckServerIsRunning() == false) {
                    const $self = $(e.currentTarget);
                    this.updateModToLatest($self);
                }
            });

        $("#btn-install-sml").on("click", (e) => {
            if (this.CheckServerIsRunning() == false) {
                const $self = $(e.currentTarget);
                this.installSMLVersion($self);
            }
        });

        $("#btn-install-mod").on("click", (e) => {
            if (this.CheckServerIsRunning() == false) {
                const $self = $(e.currentTarget);
                this.installModVersion($self);
            }
        });
    }

    MainDisplayFunction() {
        const ActiveAgent = PageCache.getActiveAgent();

        if (this.Agent != null && this.Agent.id == ActiveAgent.id) {
            return;
        }

        console.log("Is Different!");

        this.Agent = ActiveAgent;

        this.LockAllInputs();

        if (this.Agent == null) {
            return;
        }

        this.getFicsitSMLVersions();
        this.getFicsitModList();

        if (this.Agent.running == true && this.Agent.active == true) {
            this.UnlockAllInputs();
            this.getInstalledMods();
            this.getSMLInfo();
        } else {
            PageCache.SetAgentInstalledMods([]);

            $("#mod-count").text("Server Not Running!");
            $(".sml-status").text("Server Not Running!");
        }
    }

    CheckServerIsRunning() {
        const Agent = PageCache.getActiveAgent();
        if (Agent.info.serverstate.status == "running") {
            window.openModal(
                "/public/modals",
                "server-mods-error",
                (modal_el) => {
                    modal_el
                        .find("#error-msg")
                        .text(
                            "Server needs to be stopped before making changes!"
                        );
                }
            );
            return true;
        }

        return false;
    }

    LockAllInputs() {
        $("#radio-install-sml1").prop("disabled", true);
        $("#radio-install-sml2").prop("disabled", true);
        $("#sel-install-sml-ver").prop("disabled", true);
        $("#btn-install-sml").prop("disabled", true);
        $("#sel-add-mod-name").prop("disabled", true);
        $("#sel-add-mod-version").prop("disabled", true);
    }

    UnlockAllInputs() {
        $("#radio-install-sml1").prop("disabled", false);
        $("#radio-install-sml2").prop("disabled", false);
        $("#sel-install-sml-ver").prop("disabled", false);
        $("#btn-install-sml").prop("disabled", false);
        $("#sel-add-mod-name").prop("disabled", false);
    }

    getInstalledMods() {
        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
        };
        API_Proxy.postData("agent/modinfo/installed", postData).then((res) => {
            if (res.result == "success") {
                console.log(res);
                PageCache.SetAgentInstalledMods(res.data);
            } else {
                PageCache.SetAgentInstalledMods([]);
            }
        });
    }

    displayInstalledMods() {
        if (PageCache.getFicsitMods().length == 0) {
            return;
        }

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table");
        const installedMods = PageCache.getAgentInstalledMods();
        const Agent = PageCache.getActiveAgent();

        if (Agent.running == true && Agent.active == true) {
            const $ModCountEl = $("#mod-count");
            $ModCountEl.text(installedMods.length);
        }

        const tableData = [];
        for (let i = 0; i < installedMods.length; i++) {
            const mod = installedMods[i];

            const ficsitMod = PageCache.getFicsitMods().find(
                (el) => el.mod_reference == mod.mod_reference
            );
            console.log(ficsitMod);
            const latestVersion = mod.version == ficsitMod.latestVersion;

            const $btn_update = $("<button/>")
                .addClass("btn btn-secondary btn-update-mod float-right")
                .attr("data-modid", mod.mod_reference)
                .attr("data-toggle", "tooltip")
                .attr("data-placement", "bottom")
                .attr("title", "Update Mod")
                .html("<i class='fas fa-arrow-alt-circle-up'></i>");

            // Create uninstall btn
            const $btn_uninstall = $("<button/>")
                .addClass("btn btn-danger btn-block btn-uninstall-mod")
                .attr("data-modid", mod.mod_reference)
                .html("<i class='fas fa-trash'></i> Uninstall");

            const versionStr =
                mod.version +
                " " +
                (latestVersion == false ? $btn_update.prop("outerHTML") : "");
            tableData.push([
                mod.name,
                versionStr,
                $btn_uninstall.prop("outerHTML"),
            ]);
        }

        if (isDataTable == false) {
            $("#mods-table").DataTable({
                paging: true,
                searching: false,
                info: false,
                order: [[0, "asc"]],
                columnDefs: [
                    {
                        targets: 2,
                        orderable: false,
                    },
                ],
                data: tableData,
            });
        } else {
            const datatable = $("#mods-table").DataTable();
            datatable.clear();
            datatable.rows.add(tableData);
            datatable.draw();
        }

        $('[data-toggle="tooltip"]').tooltip();
    }

    getSMLInfo() {
        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
        };

        API_Proxy.postData("agent/modinfo/smlinfo", postData).then((res) => {
            const el = $(".sml-status");
            const el2 = $(".sml-version");
            console.log(res);
            if (res.result == "success") {
                if (res.data.state == "not_installed") {
                    el.text("Not Installed");
                    el2.text("Not Installed");
                } else {
                    el.text("Installed");
                    el2.text(res.data.version);
                }
            } else {
                el.text("Unknown");
                el2.text("N/A");
            }
        });
    }

    getFicsitSMLVersions() {
        API_Proxy.get("ficsitinfo", "smlversions").then((res) => {
            if (res.result == "success") {
                //console.log(res.data.versions)
                PageCache.setSMLVersions(res.data.versions);
            }
        });
    }

    displayFicsitSMLVersions() {
        const el1 = $("#sel-install-sml-ver");
        const el2 = $(".sml-latest-version");
        el2.text(PageCache.getSMLVersions()[0].version);
        PageCache.getSMLVersions().forEach((sml) => {
            el1.append(
                "<option value='" +
                    sml.version +
                    "'>" +
                    sml.version +
                    "</option"
            );
        });
    }

    getFicsitModList() {
        if (PageCache.getFicsitMods().length > 0) {
            PageCache.emit("setficsitmods");
            return;
        }

        API_Proxy.get("ficsitinfo", "modslist").then((res) => {
            console.log(res.data);
            if (res.result == "success") {
                PageCache.setFicsitMods(res.data);
            } else {
                console.log(res);
            }
        });
    }

    displayFicsitModList() {
        const el = $("#sel-add-mod-name");
        PageCache.getFicsitMods().forEach((mod) => {
            el.append(
                "<option value='" +
                    mod.mod_reference +
                    "'>" +
                    mod.name +
                    "</option"
            );
        });
    }

    getFicsitModInfo() {
        const modid = $("#sel-add-mod-name").val();

        if (modid == "-1") {
            this.hideNewModInfo();
        } else {
            API_Proxy.get("ficsitinfo", "modinfo", modid).then((res) => {
                this.showNewModInfo(res.data);
            });
        }
    }

    hideNewModInfo() {
        $("#add-mod-logo").attr(
            "src",
            "/public/images/ssm_logo128_outline.png"
        );
        $("#sel-add-mod-version").prop("disabled", true);
        $("#sel-add-mod-version").find("option").not(":first").remove();
        this.lockInstallModBtn();
    }

    showNewModInfo(data) {
        console.log(data);
        if (data.logo == "") {
            $("#add-mod-logo").attr(
                "src",
                "https://ficsit.app/static/assets/images/no_image.png"
            );
        } else {
            $("#add-mod-logo").attr("src", data.logo);
        }

        const sel_el = $("#sel-add-mod-version");
        sel_el.prop("disabled", false);
        sel_el.find("option").not(":first").remove();
        data.versions.forEach((mod_version) => {
            sel_el.append(
                "<option value='" +
                    mod_version.version +
                    "'>" +
                    mod_version.version +
                    "</option"
            );
        });
    }

    installSMLVersion($btn) {
        $btn.prop("disabled", true);
        $btn.find("i").removeClass("fa-download").addClass("fa-sync fa-spin");
        $("input[name='radio-install-sml']").prop("disabled", true);

        const radioVal = $("input[name='radio-install-sml']:checked").val();
        const $selEl = $("#sel-install-sml-ver");
        $selEl.prop("disabled", true);

        let version = "latest";

        if (radioVal == 1) {
            if ($selEl.val() == -1) {
                toastr.error("Please Select A SML Version!");
                return;
            } else {
                version = $selEl.val();
            }
        }

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "installsml",
            version,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            console.log(res);

            $btn.prop("disabled", false);
            $btn.find("i")
                .addClass("fa-download")
                .removeClass("fa-sync fa-spin");
            $selEl.prop("disabled", false);
            $("input[name='radio-install-sml']").prop("disabled", false);

            if (res.result == "success") {
                toastr.success("Successfully installed SML");
            } else {
                toastr.error("Failed to install SML");
            }

            this.getInstalledMods();
            this.getSMLInfo();
        });
    }

    unlockInstallModBtn() {
        $("#btn-install-mod").prop("disabled", false);
    }

    lockInstallModBtn() {
        $("#btn-install-mod").prop("disabled", true);
    }

    installModVersion($btn) {
        $btn.prop("disabled", true);
        $btn.find("i").removeClass("fa-download").addClass("fa-sync fa-spin");

        const $selModEl = $("#sel-add-mod-name");
        const $selVersionEl = $("#sel-add-mod-version");

        $selModEl.prop("disabled", true);
        $selVersionEl.prop("disabled", true);

        const modVersion = $selVersionEl.val();

        if (modVersion == -1) {
            $selModEl.prop("disabled", false);
            $selVersionEl.prop("disabled", false);

            toastr.error("Please Select A Mod Version!");
            return;
        }

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "installmod",
            modReference: $selModEl.val(),
            versionid: modVersion,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            $btn.prop("disabled", false);
            $btn.find("i")
                .addClass("fa-download")
                .removeClass("fa-sync fa-spin");
            $selModEl.prop("disabled", false);
            $selVersionEl.prop("disabled", false);

            if (res.result == "success") {
                toastr.success("Successfully installed Mod");
            } else {
                toastr.error("Failed to install Mod");
            }
            this.getInstalledMods();
        });
    }

    uninstallMod($btn) {
        const modid = $btn.attr("data-modid");

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "uninstallmod",
            modReference: modid,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Successfully uninstalled Mod");
            } else {
                toastr.error("Failed to uninstall Mod");
            }
            this.getInstalledMods();
        });
    }

    updateModToLatest($btn) {
        const modid = $btn.attr("data-modid");

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "updatemod",
            modReference: modid,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Successfully updated Mod");
            } else {
                toastr.error("Failed to update Mod");
            }
            this.getInstalledMods();
        });
    }
}

const page = new Page_Mods();

module.exports = page;

},{"./api_proxy":5,"./cache":7}],14:[function(require,module,exports){
const API_Proxy = require("./api_proxy");

const PageCache = require("./cache");

class Page_Settings {
    constructor() {
        this.Config = {};
        this.ServerState = {};
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        });
    }

    setupJqueryListeners() {
        $("#refresh-saves").click((e) => {
            e.preventDefault();

            const $self = $(e.currentTarget);

            $self.prop("disabled", true);
            $self.find("i").addClass("fa-spin");

            this.displaySaveTable();
        });

        $("body").on("click", ".select-save-btn", (e) => {
            const $self = $(e.currentTarget);
            const savename = $self.attr("data-save");

            if (this.ServerState.status != "stopped") {
                window.openModal("server-settings-error", (modal_el) => {
                    modal_el
                        .find("#error-msg")
                        .text(
                            "Server needs to be stopped before making changes!"
                        );
                });
                return;
            }

            this.selectSave(savename);
        });

        $("#btn-save-upload").on("click", (e) => {
            e.preventDefault();
            this.uploadSaveFile();
        });

        $("body").on("click", ".remove-save-btn", (e) => {
            e.preventDefault();
            this.RemoveSave($(e.currentTarget));
        });

        $("body").on("click", ".download-save-btn", (e) => {
            e.preventDefault();
            this.DownloadSave($(e.currentTarget));
        });

        $("body").on("click", "#confirm-action", (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const Action = $btn.attr("data-action");
            if (Action == "remove-save") {
                this.RemoveSaveConfirmed($btn);
            }
        });

        $("body").on("click", "#cancel-action", (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);

            $("#server-settings-confirm").find(".close").trigger("click");
        });

        $("body").on("click", "#cancel-action", (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);

            $("#server-settings-confirm").find(".close").trigger("click");
        });
    }

    getConfig() {
        this.MainDisplayFunction();
    }

    MainDisplayFunction() {
        this.displaySaveTable();
    }

    displaySaveTable() {
        const isDataTable = $.fn.dataTable.isDataTable("#saves-table");

        const Agent = PageCache.getActiveAgent();

        const postData = {
            agentid: Agent.id,
        };

        API_Proxy.postData("agent/gamesaves", postData).then((res) => {
            console.log(res);
            $("#refresh-saves").prop("disabled", false);
            $("#refresh-saves").find("i").removeClass("fa-spin");

            const tableData = [];
            if (res.result == "success") {
                res.data.forEach((save) => {
                    if (save.result == "failed") return;

                    let deleteSaveEl = $("<button/>")
                        .addClass("btn btn-danger float-end remove-save-btn")
                        .html("<i class='fas fa-trash'></i>")
                        .attr("data-save", save.savename);

                    let downloadSaveEl = $("<button/>")
                        .addClass(
                            "btn btn-primary float-start download-save-btn"
                        )
                        .html("<i class='fas fa-download'></i>")
                        .attr("data-save", save.savename);

                    const downloadSaveStr = downloadSaveEl.prop("outerHTML");
                    const deleteSaveStr = deleteSaveEl.prop("outerHTML");

                    const saveOptions = save.savebody.split("?");
                    let saveSessionName = "Unknown";

                    for (let i = 0; i < saveOptions.length; i++) {
                        const option = saveOptions[i];
                        const optionData = option.split("=");

                        if (optionData[0] == "sessionName") {
                            saveSessionName = optionData[1];
                        }
                    }

                    tableData.push([
                        saveSessionName.trunc(25),
                        save.savename.trunc(40),
                        saveDate(save.last_modified),
                        downloadSaveStr + deleteSaveStr,
                    ]);
                });
            }

            if (isDataTable == false) {
                $("#saves-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[2, "desc"]],
                    columnDefs: [
                        {
                            type: "date-euro",
                            targets: 2,
                        },
                    ],
                    data: tableData,
                });
            } else {
                const datatable = $("#saves-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    uploadSaveFile() {
        $("#btn-save-upload i")
            .removeClass("fa-upload")
            .addClass("fa-sync fa-spin");
        $("#btn-save-upload").prop("disabled", true);
        //$("#inp-save-file").prop("disabled", true);

        const formData = new FormData($("#save-upload-form")[0]);

        const Agent = PageCache.getActiveAgent();

        if (Agent == null) {
            toastr.error("Select A Server!");
            return;
        }

        API_Proxy.upload("agent/gamesaves/upload/" + Agent.id, formData).then(
            (res) => {
                if (res.result == "success") {
                    toastr.success("Save has been uploaded!");
                } else {
                    console.log(res.error);
                    toastr.error("Save couldn't be uploaded!");
                }

                $("#btn-save-upload i")
                    .addClass("fa-upload")
                    .removeClass("fa-sync fa-spin");
                $("#btn-save-upload").prop("disabled", false);
                $("#inp-save-file").prop("disabled", false);
            }
        );
    }

    RemoveSave(btn) {
        const SaveFile = btn.attr("data-save");

        window.openModal(
            "/public/modals",
            "server-settings-confirm",
            ($modalEl) => {
                $modalEl
                    .find("#confirm-action")
                    .attr("data-action", "remove-save")
                    .attr("data-save", SaveFile);
            }
        );
    }

    RemoveSaveConfirmed(btn) {
        const SaveFile = btn.attr("data-save");

        const Agent = PageCache.getActiveAgent();

        const postData = {
            agentid: Agent.id,
            savefile: SaveFile,
        };

        API_Proxy.postData("agent/gamesaves/delete", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    DownloadSave(btn) {
        const SaveFile = btn.attr("data-save");

        const Agent = PageCache.getActiveAgent();

        const postData = {
            agentid: Agent.id,
            savefile: SaveFile,
        };

        API_Proxy.download("agent/gamesaves/download", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }
}

function saveDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().pad(2);
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;

},{"./api_proxy":5,"./cache":7}],15:[function(require,module,exports){
const PageCache = require("./cache");
const Logger = require("./logger");
const API_Proxy = require("./api_proxy");

class Page_Server {
    init() {
        this.SetupEventHandlers();
        this.setupJqueryListeners();

        this.agentid = parseInt($(".page-container").attr("data-agentid"));
        this.Agent = PageCache.getAgentsList().find(
            (agent) => agent.id == this.agentid
        );
    }

    SetupEventHandlers() {
        PageCache.on("setagentslist", () => {
            this.Agent = PageCache.getAgentsList().find(
                (agent) => agent.id == this.agentid
            );
            this.DisplayServerInfo();
        });
    }

    setupJqueryListeners() {
        $("#edit-backup-settings").click((e) => {
            e.preventDefault();
            this.unlockBackupSettings();
        });

        $("#save-backup-settings").on("click", (e) => {
            e.preventDefault();
            this.submitBackupSettings();
        });

        $("#cancel-backup-settings").on("click", (e) => {
            e.preventDefault();
            this.lockBackupSettings();
        });

        $("#edit-sf-settings").on("click", (e) => {
            e.preventDefault();

            const Agent = this.Agent;
            if (
                Agent.info.serverstate != null &&
                Agent.info.serverstate.status == "running"
            ) {
                window.openModal(
                    "/public/modals",
                    "server-settings-error",
                    (modal_el) => {
                        modal_el
                            .find("#error-msg")
                            .text(
                                "Server needs to be stopped before making changes!"
                            );
                    }
                );
                return;
            }

            this.unlockSFSettings();
        });

        $("#cancel-sf-settings").on("click", (e) => {
            e.preventDefault();
            this.lockSFSettings();
        });

        $("#save-sf-settings").on("click", (e) => {
            e.preventDefault();
            this.submitSFSettings();
        });

        $("#edit-mods-settings").on("click", (e) => {
            e.preventDefault();

            const Agent = PageCache.getActiveAgent();
            if (
                Agent.info.serverstate != null &&
                Agent.info.serverstate.status == "running"
            ) {
                window.openModal(
                    "/public/modals",
                    "server-settings-error",
                    (modal_el) => {
                        modal_el
                            .find("#error-msg")
                            .text(
                                "Server needs to be stopped before making changes!"
                            );
                    }
                );
                return;
            }

            this.unlockModsSettings();
        });

        $("#cancel-mods-settings").on("click", (e) => {
            e.preventDefault();
            this.lockModsSettings();
            this.getConfig();
        });

        $("#save-mods-settings").on("click", (e) => {
            e.preventDefault();
            this.submitModsSettings();
        });

        $("#inp_maxplayers").on("input change", () => {
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`);
        });

        $("#settings-dangerarea-installsf").on("click", (e) => {
            e.preventDefault();
            this.installSFServer();
        });

        $("#server-dangerarea-delete").on("click", (e) => {
            e.preventDefault();
            this.OpenConfirmDeleteModal();
        });

        $("#server-dangerarea-update").on("click", (e) => {
            e.preventDefault();
            this.OpenConfirmUpdateModal();
        });

        $("body").on("click", "#confirm-action", (e) => {
            const $btn = $(e.currentTarget);

            const action = $btn.attr("data-action");

            if (action == "delete-server") {
                $("#server-action-confirm .close").trigger("click");
                this.DeleteAgent();
            }
            if (action == "update-server") {
                $("#server-action-confirm .close").trigger("click");
                this.UpdateAgent();
            }
        });
    }

    DisplayServerInfo() {
        this.LockAllEditButtons();
        this.UnlockAllEditButtons();

        $("#agent-publicip").text(window.location.hostname);

        if (this.Agent.running == false || this.Agent.active == false) {
            $("#agent-connectionport").text("Server Not Active!");
            $("#setting-info-serverloc").text("Server Not Active!");
            $("#setting-info-saveloc").text("Server Not Active!");
            $("#setting-info-logloc").text("Server Not Active!");
            $("#backup-location").text("Server Not Active!");
            $("#sfserver-version").text("Server Not Active!");
            return;
        }
        const sfConfig = this.Agent.info.config.satisfactory;
        const ssmConfig = this.Agent.info.config.ssm;

        $("#agent-connectionport").text(this.Agent.ports.ServerQueryPort);
        $("#setting-info-serverloc").text(sfConfig.server_location);
        $("#setting-info-saveloc").text(sfConfig.save.location);
        $("#setting-info-logloc").text(sfConfig.log.location);
        $("#backup-location").text(ssmConfig.backup.location);
        $("#sfserver-version").text(sfConfig.server_version);

        if ($("#edit-backup-settings").prop("disabled") == false) {
            $("#inp_backup-interval").val(ssmConfig.backup.interval);
            $("#inp_backup-keep").val(ssmConfig.backup.keep);
        }

        if ($("#edit-sf-settings").prop("disabled") == false) {
            this.populateSFSettings();
        }

        if ($("#edit-mods-settings").prop("disabled") == false) {
            this.populateModsSettings();
        }

        const date = new Date(ssmConfig.backup.nextbackup);
        const day = date.getDate().pad(2);
        const month = date.getMonthName();
        const year = date.getFullYear();

        const hour = date.getHours().pad(2);
        const min = date.getMinutes().pad(2);
        const sec = date.getSeconds().pad(2);

        const dateStr = `${day} ${month} ${year} ${hour}:${min}:${sec}`;
        $("#backup-nextbackup").text(dateStr);
    }

    LockAllEditButtons() {
        const Agent = this.Agent;

        if (Agent.running == false || Agent.active == false) {
            $("i.fa-edit").parent().prop("disabled", true);
            $("#settings-dangerarea-installsf").prop("disabled", true);
        }
    }

    UnlockAllEditButtons() {
        const Agent = this.Agent;
        if (Agent.running == true && Agent.active == true) {
            $("i.fa-edit")
                .parent()
                .each((index, el) => {
                    if ($(el).attr("data-editing") == false) {
                        $(el).prop("disabled", false);
                    }
                });

            $("#settings-dangerarea-installsf").prop("disabled", false);
        }
    }

    unlockBackupSettings() {
        $("#edit-backup-settings")
            .prop("disabled", true)
            .attr("data-editing", true);
        $("#save-backup-settings").prop("disabled", false);
        $("#cancel-backup-settings").prop("disabled", false);
        $("#inp_backup-interval").prop("disabled", false);
        $("#inp_backup-keep").prop("disabled", false);
    }

    lockBackupSettings() {
        $("#edit-backup-settings")
            .prop("disabled", false)
            .attr("data-editing", false);
        $("#save-backup-settings").prop("disabled", true);
        $("#cancel-backup-settings").prop("disabled", true);
        $("#inp_backup-interval").prop("disabled", true);
        $("#inp_backup-keep").prop("disabled", true);
    }

    submitBackupSettings() {
        const interval = $("#inp_backup-interval").val();
        const keep = $("#inp_backup-keep").val();

        const postData = {
            agentid: this.Agent.id,
            interval,
            keep,
        };

        API_Proxy.postData("agent/config/backupsettings", postData).then(
            (res) => {
                if (res.result == "success") {
                    this.lockBackupSettings();
                    toastr.success("Settings Saved!");
                } else {
                    toastr.error("Failed To Save Settings!");
                    Logger.error(res.error);
                }
            }
        );
    }

    populateSFSettings() {
        const Agent = this.Agent;
        const ssmConfig = Agent.info.config.satisfactory;

        $("#inp_updatesfonstart").bootstrapToggle("enable");
        if (ssmConfig.updateonstart == true) {
            $("#inp_updatesfonstart").bootstrapToggle("on");
        } else {
            $("#inp_updatesfonstart").bootstrapToggle("off");
        }
        $("#inp_updatesfonstart").bootstrapToggle("disable");

        if (Agent.info.serverstate.status != "notinstalled") {
            const gameConfig = Agent.info.config.game;
            $("#inp_maxplayers").val(
                gameConfig.Game["/Script/Engine"].GameSession.MaxPlayers
            );
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`);

            $("#inp_workerthreads").val(ssmConfig.worker_threads);
        } else {
            $("#edit-sf-settings").prop("disabled", true);
        }
    }

    unlockSFSettings() {
        $("#edit-sf-settings")
            .prop("disabled", true)
            .attr("data-editing", true);

        $("#save-sf-settings").prop("disabled", false);
        $("#cancel-sf-settings").prop("disabled", false);
        $("#inp_maxplayers").prop("disabled", false);
        $("#inp_workerthreads").prop("disabled", false);
        $("#inp_updatesfonstart").bootstrapToggle("enable");
    }

    lockSFSettings() {
        $("#edit-sf-settings")
            .prop("disabled", false)
            .attr("data-editing", false);

        $("#save-sf-settings").prop("disabled", true);
        $("#cancel-sf-settings").prop("disabled", true);
        $("#inp_maxplayers").prop("disabled", true);
        $("#inp_workerthreads").prop("disabled", true);
        $("#inp_updatesfonstart").bootstrapToggle("disable");
    }

    submitSFSettings() {
        const Agent = this.Agent;
        const maxplayers = $("#inp_maxplayers").val();
        const workerthreads = $("#inp_workerthreads").val();
        const updatesfonstart = $("#inp_updatesfonstart").is(":checked");

        const postData = {
            agentid: Agent.id,
            maxplayers,
            updatesfonstart,
            workerthreads,
        };

        API_Proxy.postData("agent/config/sfsettings", postData).then((res) => {
            if (res.result == "success") {
                this.lockSFSettings();
                toastr.success("Settings Saved!");
            } else {
                toastr.error("Failed To Save Settings!");
                Logger.error(res.error);
            }
        });
    }

    populateModsSettings() {
        const Agent = this.Agent;
        const modsConfig = Agent.info.config.mods;
        $("#inp_mods_enabled").bootstrapToggle("enable");
        if (modsConfig.enabled == true) {
            $("#inp_mods_enabled").bootstrapToggle("on");
        } else {
            $("#inp_mods_enabled").bootstrapToggle("off");
        }
        $("#inp_mods_enabled").bootstrapToggle("disable");

        $("#inp_mods_autoupdate").bootstrapToggle("enable");
        if (modsConfig.autoupdate == true) {
            $("#inp_mods_autoupdate").bootstrapToggle("on");
        } else {
            $("#inp_mods_autoupdate").bootstrapToggle("off");
        }
        $("#inp_mods_autoupdate").bootstrapToggle("disable");
    }

    unlockModsSettings() {
        $("#edit-mods-settings")
            .prop("disabled", true)
            .attr("data-editing", true);

        $("#save-mods-settings").prop("disabled", false);
        $("#cancel-mods-settings").prop("disabled", false);
        $("#inp_mods_enabled").bootstrapToggle("enable");
        $("#inp_mods_autoupdate").bootstrapToggle("enable");
    }

    lockModsSettings() {
        $("#edit-mods-settings")
            .prop("disabled", false)
            .attr("data-editing", false);

        $("#save-mods-settings").prop("disabled", true);
        $("#cancel-mods-settings").prop("disabled", true);
        $("#inp_mods_enabled").bootstrapToggle("disable");
        $("#inp_mods_autoupdate").bootstrapToggle("disable");
    }

    submitModsSettings() {
        const Agent = PageCache.getActiveAgent();
        const enabled = $("#inp_mods_enabled").is(":checked");
        const autoupdate = $("#inp_mods_autoupdate").is(":checked");
        const postData = {
            agentid: Agent.id,
            enabled,
            autoupdate,
        };

        API_Proxy.postData("agent/config/modsettings", postData).then((res) => {
            if (res.result == "success") {
                this.lockModsSettings();
                toastr.success("Settings Saved!");
            } else {
                toastr.error("Failed To Save Settings!");
                Logger.error(res.error);
            }
        });
    }

    installSFServer() {
        const Agent = this.Agent;
        window.openModal("/public/modals", "server-action-installsf", () => {
            const postData = {
                agentid: Agent.id,
            };

            API_Proxy.postData("agent/serveractions/installsf", postData).then(
                (res) => {
                    if (res.result == "success") {
                        toastr.success("Server has been installed!");
                        $("#server-action-installsf .close").trigger("click");
                    } else {
                        $("#server-action-installsf .close").trigger("click");

                        toastr.error("Failed To Install Server!");
                        Logger.error(res.error);
                    }
                }
            );
        });
    }

    OpenConfirmDeleteModal() {
        window.openModal("/public/modals", "server-action-confirm", (modal) => {
            modal.find("#confirm-action").attr("data-action", "delete-server");
        });
    }

    OpenConfirmUpdateModal() {
        window.openModal("/public/modals", "server-action-confirm", (modal) => {
            modal.find("#confirm-action").attr("data-action", "update-server");
        });
    }

    DeleteAgent() {
        const postData = {
            agentid: this.agentid,
        };

        API_Proxy.postData("agent/delete", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Server Has Been Deleted!");

                setTimeout(() => {
                    window.redirect("/servers");
                }, 10000);
            } else {
                toastr.error("Failed To Delete Server!");
                Logger.error(res.error);
            }
        });
    }

    UpdateAgent() {
        const postData = {
            agentid: this.agentid,
        };

        API_Proxy.postData("agent/update", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Server Has Been Updated!");

                setTimeout(() => {
                    window.redirect("/servers");
                }, 10000);
            } else {
                toastr.error("Failed To Update Server!");
                Logger.error(res.error);
            }
        });
    }
}

const page = new Page_Server();

module.exports = page;

},{"./api_proxy":5,"./cache":7,"./logger":8}],16:[function(require,module,exports){
const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");
const Logger = require("./logger");

class Page_Servers {
    constructor() {}

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    setupJqueryListeners() {
        $("body")
            .on("click", ".btn-startstop-docker", (e) => {
                e.preventDefault();

                const $button = $(e.currentTarget);

                if ($button.attr("data-action") == "start") {
                    this.StartDockerAgent($button.attr("data-agentid"));
                } else {
                    this.StopDockerAgent($button.attr("data-agentid"));
                }
            })
            .on("click", "#submit-create-server-btn", (e) => {
                this.CreateNewServer();
            });

        $("#btn-createserver").on("click", (e) => {
            e.preventDefault();
            this.OpenCreateServerModal();
            //this.CreateNewServer();
        });
    }

    SetupEventHandlers() {
        PageCache.on("setagentslist", () => {
            this.DisplayAgentsTable();
        });
    }

    DisplayAgentsTable() {
        const isDataTable = $.fn.dataTable.isDataTable("#agents-table");
        const tableData = [];
        PageCache.getAgentsList().forEach((agent) => {
            const $AgentLink = $("<a/>").attr("href", `/server/${agent.id}`);
            const $btn_info = $("<button/>")
                .addClass("btn btn-primary float-start")
                .html("<i class='fas fa-cog'></i>");

            $AgentLink.append($btn_info);
            const OpenAgentStr = $AgentLink.prop("outerHTML");

            const $btn_stopstart = $("<button/>")
                .addClass("btn btn-success float-end")
                .html("<i class='fas fa-play'></i>")
                .attr("data-action", "start")
                .attr("data-agentid", `${agent.id}`)
                .addClass("btn-startstop-docker");

            if (agent.running == true) {
                $btn_stopstart
                    .attr("data-action", "stop")
                    .removeClass("btn-success")
                    .addClass("btn-danger");
                $btn_stopstart
                    .find("i")
                    .removeClass("fa-play")
                    .addClass("fa-stop");
            }

            const OptionStr = OpenAgentStr + $btn_stopstart.prop("outerHTML");

            const $RunningIcon = $("<i/>").addClass(
                "fas fa-2xl fa-circle-xmark text-danger"
            );
            const $ActiveIcon = $("<i/>").addClass(
                "fas fa-2xl fa-circle-xmark text-danger"
            );

            if (agent.running == true) {
                $RunningIcon
                    .removeClass("fa-circle-xmark text-danger")
                    .addClass("fa-circle-check text-success");
            }

            if (agent.active == true) {
                $ActiveIcon
                    .removeClass("fa-circle-xmark text-danger")
                    .addClass("fa-circle-check text-success");
            }

            tableData.push([
                agent.displayname,
                $RunningIcon.prop("outerHTML"),
                $ActiveIcon.prop("outerHTML"),
                agent.info.version || "Unknown",
                OptionStr,
            ]);
        });

        if (isDataTable == false) {
            $("#agents-table").DataTable({
                paging: true,
                searching: false,
                info: false,
                order: [[2, "desc"]],
                columnDefs: [
                    {
                        type: "date-euro",
                        targets: 2,
                    },
                ],
                data: tableData,
            });
        } else {
            const datatable = $("#agents-table").DataTable();
            datatable.clear();
            datatable.rows.add(tableData);
            datatable.draw();
        }
    }

    StartDockerAgent(id) {
        API_Proxy.postData("agent/start", {
            id: id,
        }).then((res) => {
            if (res.result == "success") {
                toastr.success("Server Started!");
            } else {
                toastr.error("Failed to start server");
                Logger.error(res.error);
            }
        });
    }

    StopDockerAgent(id) {
        API_Proxy.postData("agent/stop", {
            id: id,
        }).then((res) => {
            if (res.result == "success") {
                toastr.success("Server Stopped!");
            } else {
                toastr.error("Failed to stop server");
                Logger.error(res.error);
            }
        });
    }

    OpenCreateServerModal() {
        window.openModal(
            "/public/modals",
            "create-server-modal",
            (modal) => {}
        );
    }

    CreateNewServer() {
        const postData = {
            name: $("#inp_servername").val(),
            port: parseInt($("#inp_serverport").val()),
        };

        if (postData.name == "" || postData.port < 15777) {
            $("#create-server-error")
                .removeClass("hidden")
                .text(
                    "Error: Server Name Is Required And Server Port must be more than 15776"
                );
            return;
        }

        $("#create-server-modal .close").trigger("click");

        API_Proxy.postData("agent/create", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Server created!");
            } else {
                toastr.error("Failed to create server");
                Logger.error(res.error);
            }
        });
    }
}

const page = new Page_Servers();

module.exports = page;

},{"./api_proxy":5,"./cache":7,"./logger":8}],17:[function(require,module,exports){
const API_Proxy = require("./api_proxy");

const logger = require("./logger");

class Page_Settings {
    constructor() {
        this._ROLES = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();

        this.MainDisplayFunction();
    }

    SetupEventHandlers() {}

    setupJqueryListeners() {
        $("body")
            .on("click", "#btn-addwebhook", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddWebhookModal($btn);
            })
            .on("click", "#btn-generatedebug", (e) => {
                e.preventDefault();
                this.GenerateDebugInfo();
            })
            .on("click", ".download-debugreport-btn", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget);
                this.DownloadDebugReport($this.attr("data-debugreport-id"));
            })
            .on("click", ".remove-debugreport-btn", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget);
                this.RemoveDebugReport($this.attr("data-debugreport-id"));
            })
            .on("click", "#submit-add-webhook-btn", (e) => {
                e.preventDefault();
                this.SubmitNewWebhook();
            })
            
    }

    MainDisplayFunction() {
        this.DisplayWebhooksTable();
        this.DisplayDebugReportsTable();
    }

    DisplayWebhooksTable() {
        API_Proxy.get("info/webhooks").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#webhooks-table");
            const tableData = [];

            const webhooks = res.data;
            console.log(webhooks);

            webhooks.forEach((webhook) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-webhook")
                    .attr("data-user-id", webhook.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop("outerHTML");

                const $RunningIcon = $("<i/>").addClass(
                    "fas fa-2xl fa-circle-xmark text-danger"
                );

                if (webhook.enabled == true) {
                    $RunningIcon
                        .removeClass("fa-circle-xmark text-danger")
                        .addClass("fa-circle-check text-success");
                }

                const $typeIcon = $("<i/>").addClass(
                    "fa-brands fa-discord fa-2xl"
                );

                if (webhook.type == 0) {
                    $typeIcon
                        .removeClass("fa-brands fa-discord")
                        .addClass("fa-solid fa-globe");
                }

                tableData.push([
                    webhook.id,
                    webhook.name,
                    $RunningIcon.prop("outerHTML"),
                    $typeIcon.prop("outerHTML"),
                    OpenUserStr,
                ]);
            });

            console.log(tableData);

            if (isDataTable == false) {
                $("#webhooks-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "asc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#webhooks-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    OpenAddWebhookModal(btn) {
        window.openModal("/public/modals", "add-webhook-modal", (modal) => {
            modal.find("#inp_webhook_enabled").bootstrapToggle();

            const events = [
                "ssm.startup",
                "ssm.shutdown",
                "agent.created",
                "agent.started",
                "agent.shutdown",
                "server.starting",
                "server.running",
                "server.stopping",
                "server.offline",
            ];

            const $webhookEventsDiv = modal.find("#webhook-events");

            events.forEach((webhook_event) => {
                $webhookEventsDiv.append(`<div class="mb-2 event_wrapper">
                <div class="checkbox" style="display:inline-block;">
                    <input data-event-data="${webhook_event}" type="checkbox" data-on="Enabled" data-off="Disabled"
                        data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="100"
                        data-size="small">
                </div>
                <b class="ms-2 text-black">${webhook_event}</b>
                </div>`);
            });

            $webhookEventsDiv.find("input").bootstrapToggle();
        });
    }

    SubmitNewWebhook() {
        const $webhookEventsDiv = $("#webhook-events");
        const events = [];
        $webhookEventsDiv.find("input:checkbox:checked").each(function () {
            events.push($(this).attr("data-event-data"));
        });

        const postData = {
            name: $("#inp_webhookname").val(),
            url: $("#inp_webhookurl").val(),
            events,
            enabled: $("#inp_webhook_enabled").is(":checked"),
        };

        let hasError = false;

        if (postData.name.trim() == "") {
            $("#inp_webhookname").addClass("is-invalid");
            $("#inp_webhookname")
                .parent()
                .find(".input-group-text")
                .addClass("bg-danger text-white border-danger");
            $("#inp_webhookname").parent().parent().addClass("has-danger");
            hasError = true;
        }

        if (postData.url.trim() == "") {
            $("#inp_webhookurl").addClass("is-invalid");
            $("#inp_webhookurl")
                .parent()
                .find(".input-group-text")
                .addClass("bg-danger text-white border-danger");
            $("#inp_webhookurl").parent().parent().addClass("has-danger");
            hasError = true;
        }

        if (hasError == false) {
            $("#inp_webhookname").removeClass("is-invalid");
            $("#inp_webhookname")
                .parent()
                .find(".input-group-text")
                .removeClass("bg-danger text-white border-danger");
            $("#inp_webhookname").parent().parent().removeClass("has-danger");
            $("#inp_webhookurl").removeClass("is-invalid");
            $("#inp_webhookurl")
                .parent()
                .find(".input-group-text")
                .removeClass("bg-danger text-white border-danger");
            $("#inp_webhookurl").parent().parent().removeClass("has-danger");

            API_Proxy.postData("admin/addwebhook", postData).then((res) => {
                if (res.result == "success") {
                    toastr.success("Webhook Added!");
                    $("#add-webhook-modal .btn-close").trigger("click");
                } else {
                    toastr.error("Failed To Add Webhook!");
                    logger.error(res.error);
                }

                this.DisplayWebhooksTable();
            });
        }
    }

    GenerateDebugInfo() {
        API_Proxy.postData("admin/generatedebugreport", {}).then((res) => {
            if (res.result == "success") {
                toastr.success("Generated Debug Report!");
            } else {
                toastr.error("Failed To Generate Debug Report!");
                logger.error(res.error);
            }

            this.DisplayDebugReportsTable();
        });
    }

    DisplayDebugReportsTable() {
        API_Proxy.get("admin/debugreports").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable(
                "#debugreports-table"
            );
            const tableData = [];

            const debugreports = res.data;

            debugreports.forEach((debugreport) => {
                let deleteBackupEl = $("<button/>")
                    .addClass("btn btn-danger float-end remove-debugreport-btn")
                    .html("<i class='fas fa-trash'></i>")
                    .attr("data-debugreport-id", debugreport.dr_id);

                let downloadBackupEl = $("<button/>")
                    .addClass(
                        "btn btn-primary float-start download-debugreport-btn"
                    )
                    .html("<i class='fas fa-download'></i>")
                    .attr("data-debugreport-id", debugreport.dr_id);

                const downloadSaveStr = deleteBackupEl.prop("outerHTML");
                const deleteSaveStr = downloadBackupEl.prop("outerHTML");

                tableData.push([
                    debugreport.dr_id,
                    readableDate(parseInt(debugreport.dr_created)),
                    downloadSaveStr + deleteSaveStr,
                ]);
            });

            if (isDataTable == false) {
                $("#debugreports-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[1, "asc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#debugreports-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DownloadDebugReport(id) {
        const postData = {
            debugreportid: id,
        };

        API_Proxy.download("admin/debugreport/download", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    RemoveDebugReport(id) {
        const postData = {
            debugreportid: id,
        };

        API_Proxy.postData("admin/debugreport/remove", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Removed Debug Report!");
            } else {
                toastr.error("Failed To Remove Debug Report!");
                logger.error(res.error);
            }
            this.DisplayDebugReportsTable();
        });
    }
}

function readableDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().pad(2);
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;

},{"./api_proxy":5,"./logger":8}],18:[function(require,module,exports){
const API_Proxy = require("./api_proxy");
const logger = require("./logger");

class Page_Users {
    constructor() {
        this._USERS = [];
        this._ROLES = [];
        this._PERMISSIONS = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();

        this.MainDisplayFunction();
    }

    SetupEventHandlers() {}

    setupJqueryListeners() {
        $("body")
            .on("click", "#btn-adduser", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddUserModal($btn);
            })
            .on("click", "#btn-addrole", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddRoleModal($btn);
            })
            .on("change", ".perm-category-checkbox", (e) => {
                e.preventDefault();
                const $btn = $(e.currentTarget);
                this.SelectCategoryCheckboxes($btn);
            })
            .on("change", ".perm-checkbox", (e) => {
                e.preventDefault();
                const $btn = $(e.currentTarget);
                this.CheckAllPermsChecked($btn);
            })
            .on("click", "#submit-add-role-btn", (e) => {
                e.preventDefault();
                this.SubmitAddRole();
            })
            .on("click", "#submit-add-user-btn", (e) => {
                e.preventDefault();
                this.SubmitAddUser();
            })
            .on("click", "#btn-addapikey", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddAPIKeyModal($btn);
            })
            .on("click", "#submit-add-apikey-btn", (e) => {
                const $btn = $(e.currentTarget);
                this.SubmitAddApiKey();
            })
            .on("click", "#confirm-action", (e) => {
                const $btn = $(e.currentTarget);
                const action = $btn.attr("data-action");

                if (action == "revokeapikey") {
                    this.RevokeAPIKey($btn);
                }
            })
            .on("click", ".btn-revoke-apikey", (e) => {
                const $btn = $(e.currentTarget);
                window.openModal(
                    "/public/modals",
                    "server-action-confirm",
                    (modal) => {
                        modal
                            .find("#confirm-action")
                            .attr("data-action", "revokeapikey")
                            .attr(
                                "data-apikey-id",
                                $btn.attr("data-apikey-id")
                            );
                    }
                );
            })
            .on("click", ".btn-generateapikey", (e) => {
                e.preventDefault();
                const newAPIKey = this.GenerateAPIKey();
                $("#inp_apikey").val(newAPIKey);

                if (!navigator.clipboard) {
                    // use old commandExec() way
                } else {
                    navigator.clipboard
                        .writeText($("#inp_apikey").val())
                        .then(function () {
                            $("#inp_apikey").addClass("is-valid");
                            $("#inp_apikey")
                                .parent()
                                .parent()
                                .find(".valid-feedback")
                                .text("Copied to clipboard!")
                                .show();

                            $("#inp_apikey")
                                .parent()
                                .parent()
                                .addClass("has-success");

                            $("#submit-add-apikey-btn").prop("disabled", false);
                        });
                }
            });
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
        this.DisplayRolesTable();
        this.DisplayAPIKeysTable();
        this.GetPermissions();
    }

    DisplayUsersTable() {
        API_Proxy.get("info/users").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#users-table");
            const tableData = [];

            const users = res.data;
            this._USERS = users;

            users.forEach((user) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-user")
                    .attr("data-user-id", user.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop("outerHTML");

                tableData.push([
                    user.id,
                    user.username,
                    user.role.name,
                    OpenUserStr,
                ]);
            });

            if (isDataTable == false) {
                $("#users-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#users-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DisplayRolesTable() {
        API_Proxy.get("info/roles").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#roles-table");
            const tableData = [];

            const roles = res.data;
            this._ROLES = roles;

            roles.forEach((role) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-role")
                    .attr("data-role-id", role.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop("outerHTML");

                tableData.push([
                    role.id,
                    role.name,
                    role.permissions.length,
                    OpenUserStr,
                ]);
            });

            if (isDataTable == false) {
                $("#roles-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#roles-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DisplayAPIKeysTable() {
        API_Proxy.get("info/apikeys").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#apikeys-table");
            const tableData = [];

            const apikeys = res.data;

            apikeys.forEach((apikey) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-danger btn-block btn-revoke-apikey")
                    .attr("data-apikey-id", apikey.id)
                    .html("<i class='fas fa-trash'></i>");

                const revokeApiStr = $btn_info.prop("outerHTML");
                const User = this._USERS.find(
                    (user) => user.id == apikey.user_id
                );
                tableData.push([
                    apikey.id,
                    User.username,
                    apikey.shortkey,
                    revokeApiStr,
                ]);
            });

            if (isDataTable == false) {
                $("#apikeys-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#apikeys-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    GetPermissions() {
        API_Proxy.get("info/permissions").then((res) => {
            if (res.result == "success") {
                this._PERMISSIONS = [];

                res.data.forEach((perm) => {
                    const fullPerm = perm;
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    permSplit.push("*");
                    const WildcardPerm = permSplit.join(".");

                    if (this._PERMISSIONS.includes(WildcardPerm) == false) {
                        this._PERMISSIONS.push(WildcardPerm);
                    }

                    this._PERMISSIONS.push(fullPerm);
                });
            }
        });
    }

    OpenAddUserModal(btn) {
        window.openModal("/public/modals", "add-user-modal", (modal) => {
            const $roleSelect = modal.find("#sel_role");

            this._ROLES.forEach((role) => {
                $roleSelect.append(
                    `<option value='${role.id}'>${role.name}</option>`
                );
            });
        });
    }

    OpenAddRoleModal(btn) {
        window.openModal("/public/modals", "add-role-modal", (modal) => {
            const $permissionsaccordion = modal.find("#permissions-accordion");
            $permissionsaccordion.empty();

            const data = {};
            const categories = [];
            this._PERMISSIONS.forEach((perm) => {
                if (perm.includes(".*")) {
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    const category = permSplit.join(".");

                    categories.push(perm);
                    data[`${category}`] = [];
                } else {
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    const category = permSplit.join(".");
                    data[`${category}`].push(perm);
                }
            });

            for (const [key, value] of Object.entries(data)) {
                const $item = this.MakePermissionCategory(key, value);

                $permissionsaccordion.append($item);
            }
        });
    }

    MakePermissionCategory(category, perms) {
        //console.log(category, perms)

        const cleanCategory = category.replace(".", "-");

        const $item = $("<div/>").addClass("accordion-item");
        const $header = $("<h4/>")
            .addClass("accordion-header")
            .attr("id", `perm-${cleanCategory}`);
        $item.append($header);
        const $categoryCheckbox = $("<input/>")
            .addClass("form-check-input perm-category-checkbox")
            .attr("type", "checkbox")
            .attr("value", `${category}.*`)
            .attr("id", `category-checkbox-${cleanCategory}`);
        $header.append($categoryCheckbox);

        const $headerButton = $("<button/>")
            .addClass("accordion-button collapsed")
            .attr("type", "button")
            .attr("data-bs-toggle", "collapse")
            .attr("data-bs-target", `#perms-content-${cleanCategory}`)
            .attr("aria-expanded", "false")
            .attr("aria-controls", `perms-content-${cleanCategory}`);
        $header.append($headerButton);

        $headerButton.append(` ${category}.*`);

        const $content = $("<div/>")
            .addClass("accordion-collapse collapse")
            .attr("id", `perms-content-${cleanCategory}`)
            .attr("aria-labelledby", `perm-${cleanCategory}`)
            .attr("data-bs-parent", `permissions-accordion`);
        $item.append($content);

        const $contentBody = $("<div/>").addClass("accordion-body");
        $content.append($contentBody);

        for (let i = 0; i < perms.length; i++) {
            const perm = perms[i];
            const cleanPerm = perm.replace(".", "-");
            const $permCheckboxDiv = $("<div/>").addClass("form-check");
            $contentBody.append($permCheckboxDiv);

            const $permCheckbox = $("<input/>")
                .addClass("form-check-input perm-checkbox")
                .attr("type", "checkbox")
                .attr("value", `${perm}`)
                .attr("id", `perm-${cleanPerm}`);
            $permCheckboxDiv.append($permCheckbox);

            const $permCheckboxLabel = $("<label/>")
                .addClass("form-check-label")
                .attr("for", `perm-${cleanPerm}`);
            $permCheckboxLabel.text(perm);
            $permCheckboxDiv.append($permCheckboxLabel);
        }

        return $item;
    }

    SelectCategoryCheckboxes($el) {
        const $item = $el.parent().parent();
        $item.find(".perm-checkbox").prop("checked", $el.prop("checked"));
    }

    CheckAllPermsChecked($el) {
        const $item = $el.parent().parent().parent().parent();
        let canCheckCategory = true;
        $item.find(".perm-checkbox").each((index, input) => {
            const $input = $(input);
            if ($input.prop("checked") == false) {
                canCheckCategory = false;
            }
        });
        if (canCheckCategory) {
            $item.find(".perm-category-checkbox").prop("checked", true);
        } else {
            $item.find(".perm-category-checkbox").prop("checked", false);
        }
    }

    SubmitAddUser() {
        const Username = $("#inp_username").val();
        const RoleID = $("#sel_role").val();

        const postData = {
            username: Username,
            roleid: RoleID,
        };

        API_Proxy.postData("admin/adduser", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    SubmitAddRole() {
        const $roleName = $("#inp_rolename");

        if ($roleName.val() == "") {
            $roleName.addClass("is-invalid");
            $roleName.parent().parent().addClass("has-danger");
            return;
        }

        $roleName.removeClass("is-invalid");
        $roleName.parent().parent().removeClass("has-danger");

        var selected = [];
        $("#permissions-accordion input:checked").each(function () {
            selected.push($(this).val());
        });

        const PermData = [];

        for (let i = 0; i < selected.length; i++) {
            const perm = selected[i];
            if (perm.includes("*") == false) {
                const permSplit = perm.split(".");
                permSplit.pop();
                const permPrefix = permSplit.join(".");
                if (selected.includes(`${permPrefix}.*`) == false) {
                    PermData.push(perm);
                }
            } else {
                PermData.push(perm);
            }
        }

        console.log(PermData);
    }

    OpenAddAPIKeyModal() {
        window.openModal("/public/modals", "add-apikey-modal", (modal) => {
            const $userSel = modal.find("#inp_apiuser");

            for (let i = 0; i < this._USERS.length; i++) {
                const user = this._USERS[i];
                $userSel.append(
                    `<option value='${user.id}'>${user.username}</option>`
                );
            }
        });
    }

    GenerateAPIKey() {
        const format = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        var formatdata = format.split("-");

        var ret_str = "";

        for (var i = 0; i < formatdata.length; i++) {
            var d = formatdata[i];
            if (i > 0) {
                ret_str = ret_str + "-" + this.generateRandomString(d.length);
            } else {
                ret_str = ret_str + this.generateRandomString(d.length);
            }
        }

        formatdata = undefined;
        return `API-${ret_str}`;
    }

    generateRandomString(length) {
        var text = "";
        var possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < length; i++)
            text += possible.charAt(
                Math.floor(Math.random() * possible.length)
            );

        return text;
    }

    SubmitAddApiKey() {
        const userid = $("#inp_apiuser").val();
        const apiKey = $("#inp_apikey").val();

        if (userid == null || apiKey.trim() == "") {
            $("#inp_apikey").addClass("is-invalid");
            logger.error("Must Fill out new api key form!");
            return;
        }

        const postData = {
            userid: userid,
            apikey: apiKey,
        };

        API_Proxy.postData("admin/addapikey", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("API Key Added!");
                $("#add-apikey-modal .btn-close").trigger("click");
                this.DisplayAPIKeysTable();
            } else {
                toastr.error("Failed To Add API Key!");
                logger.error(res.error);
            }
        });
    }

    RevokeAPIKey($btn) {
        const apikeyid = $btn.attr("data-apikey-id");

        API_Proxy.postData("admin/revokeapikey", { id: apikeyid }).then(
            (res) => {
                if (res.result == "success") {
                    toastr.success("API Key Revoked!");
                    $("#server-action-confirm .btn-close").trigger("click");
                    this.DisplayAPIKeysTable();
                } else {
                    toastr.error("Failed To Revoke API Key!");
                    logger.error(res.error);
                }
            }
        );
    }
}

const page = new Page_Users();

module.exports = page;

},{"./api_proxy":5,"./logger":8}]},{},[6]);
