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
Tools={},Tools.modal_opened=!1,Tools.generateRandomString=function(o){for(var e="",a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=0;n<o;n++)e+=a.charAt(Math.floor(Math.random()*a.length));return e},Tools.generateRandomInt=function(o){for(var e="",a=0;a<o;a++)e+="0123456789".charAt(Math.floor(Math.random()*"0123456789".length));return e},Tools.generateUUID=function(o){for(var e=o.split("-"),a="",n=0;n<e.length;n++){var t=e[n];n>0?a=a+"-"+Tools.generateRandomString(t.length):a+=Tools.generateRandomString(t.length)}return e=void 0,a},Tools.openModal=function(o,e,a,n){let t={allowBackdropRemoval:!0},r=null;3==arguments.length?r=a:4==arguments.length&&(t=a,r=n),$("body").hasClass("modal-open")||$.ajax({url:o+"/"+e+".html",success:function(o){$("body").append(o);var a=$("#"+e);a.find("button.close").on("click",o=>{o.preventDefault();const e=$(o.currentTarget).parent().parent().parent().parent();e.remove(),e.trigger("hidden.bs.modal"),e.modal("hide"),$("body").removeClass("modal-open").attr("style",null),$(".modal-backdrop").remove()}),a.on("hidden.bs.modal",()=>{$(this).remove(),$('[name^="__privateStripe"]').remove(),Tools.modal_opened=!1,1==t.allowBackdropRemoval&&$(".modal-backdrop").remove()}),a.modal("show"),r&&r(a)},dataType:"html"})},module.exports=Tools;

},{}],6:[function(require,module,exports){
const Logger=require("./logger");class API_Proxy{constructor(){}get(...e){const o="/api/"+e.join("/");return Logger.debug("API Proxy [GET] "+o),new Promise((e,n)=>{$.get(o,o=>{e(o)})})}post(...e){const o="/api/"+e.join("/");return Logger.debug("API Proxy [POST] "+o),new Promise((e,n)=>{$.post(o,o=>{e(o)})})}postData(e,o){const n="/api/"+e;return Logger.debug("API Proxy [POST] "+n),new Promise((e,t)=>{$.post(n,o,o=>{e(o)})})}upload(e,o){const n="/api/"+e;return new Promise((e,t)=>{$.ajax({url:n,type:"POST",data:o,processData:!1,contentType:!1}).done(o=>{e(o)}).fail(e=>{t(e)})})}download(e,o){const n="/api/"+e;return new Promise((e,t)=>{$.ajax({type:"POST",url:n,data:o,xhrFields:{responseType:"blob"},success:function(o,n,t){var r="",a=t.getResponseHeader("Content-Disposition");if(a&&-1!==a.indexOf("attachment")){var i=/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(a);null!=i&&i[1]&&(r=i[1].replace(/['"]/g,""))}if(void 0!==window.navigator.msSaveBlob)window.navigator.msSaveBlob(o,r),e();else{var s=window.URL||window.webkitURL,d=s.createObjectURL(o);if(r){var c=document.createElement("a");void 0===c.download?(window.location.href=d,e()):(c.href=d,c.download=r,document.body.appendChild(c),c.click(),e())}else window.location.href=d,e();setTimeout(function(){s.revokeObjectURL(d)},100)}}})})}}const api_proxy=new API_Proxy;module.exports=api_proxy;

},{"./logger":9}],7:[function(require,module,exports){
const PageHandler=require("./page_handler"),Logger=require("./logger");function main(){Logger.displayBanner(),PageHandler.init()}Date.prototype.getMonthName=function(){return["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][this.getMonth()]},Number.prototype.pad=function(t,e){let n=this;return e=e||"0",(n+="").length>=t?n:new Array(t-n.length+1).join(e)+n},Number.prototype.toDecimal=function(){return this.toFixed(2)},String.prototype.trunc=String.prototype.trunc||function(t){return this.length>t?this.substr(0,t-1)+"&hellip;":this},$(document).ready(()=>{main()});

},{"./logger":9,"./page_handler":12}],8:[function(require,module,exports){
const logger=require("./logger"),EventEmitter=require("events"),{stringify:stringify}=require("querystring");class PageCache extends EventEmitter{constructor(){super(),this.AgentList=[],this.ActiveAgent=null,this.SMLVersions=[],this.FicsitMods=GetLocalStorage("FicsitMods",[]),this.InstalledMods=[]}setAgentsList(t){this.AgentList=t,this.setActiveAgent(getCookie("currentAgentId")),this.emit("setagentslist")}getAgentsList(){return this.AgentList}setActiveAgent(t){if(null==t)return;const e=this.getAgentsList().find(e=>e.id==t);if(null==e&&this.getAgentsList().length>0)return this.ActiveAgent=this.getAgentsList()[0],setCookie("currentAgentId",this.ActiveAgent.id,10),void this.emit("setactiveagent");null!=e&&(null!=this.ActiveAgent&&this.ActiveAgent.id==e.id||(setCookie("currentAgentId",t,10),this.ActiveAgent=e,this.emit("setactiveagent")))}getActiveAgent(){return this.ActiveAgent}setSMLVersions(t){this.SMLVersions=t,this.emit("setsmlversions")}getSMLVersions(){return this.SMLVersions}setFicsitMods(t){this.FicsitMods=t,StoreInLocalStorage("FicsitMods",{data:this.FicsitMods},1),this.emit("setficsitmods")}getFicsitMods(){return this.FicsitMods}getAgentInstalledMods(){return this.InstalledMods}SetAgentInstalledMods(t){this.InstalledMods=t,this.emit("setinstalledmods")}}function StoreInLocalStorage(t,e,i){var s=new Date;s.setTime(s.getTime()+60*i*60*1e3),e.expiry=s.getTime();const n=JSON.stringify(e);localStorage.setItem(t,n)}function RemoveLocalStorage(t){localStorage.removeItem(t)}function GetLocalStorage(t,e){const i=localStorage.getItem(t),s=JSON.parse(i);return null==s?e:(new Date).getTime()>s.expiry?(RemoveLocalStorage(t),e):s.data}function setCookie(t,e,i){var s="";if(i){var n=new Date;n.setTime(n.getTime()+24*i*60*60*1e3),s="; expires="+n.toUTCString()}document.cookie=t+"="+(e||"")+s+"; path=/"}function getCookie(t){for(var e=t+"=",i=document.cookie.split(";"),s=0;s<i.length;s++){for(var n=i[s];" "==n.charAt(0);)n=n.substring(1,n.length);if(0==n.indexOf(e))return n.substring(e.length,n.length)}return null}const pageCache=new PageCache;module.exports=pageCache;

},{"./logger":9,"events":1,"querystring":4}],9:[function(require,module,exports){
const Logger={TYPES:{LOG:0,INFO:1,SUCCESS:2,WARNING:3,ERROR:4,DEBUG:5,RESET:6}};Logger.LEVEL=Logger.TYPES.DEBUG,Logger.STYLES=["padding: 2px 8px; margin-right:8px; background:#cccccc; color:#000; font-weight:bold; border:1px solid #000;","padding: 2px 8px; margin-right:8px; background:#008cba; color:#fff; font-weight:bold; border:1px solid #000;","padding: 2px 8px; margin-right:8px; background:#43ac6a; color:#fff; font-weight:bold; border:1px solid #3c9a5f;","padding: 2px 8px; margin-right:8px; background:#E99002; color:#fff; font-weight:bold; border:1px solid #d08002;","padding: 2px 8px; margin-right:8px; background:#F04124; color:#fff; font-weight:bold; border:1px solid #ea2f10;","padding: 2px 8px; margin-right:8px; background:#003aba; color:#fff; font-weight:bold; border:1px solid #000;",""],Logger.init=(()=>{Logger.displayBanner()}),Logger.displayBanner=(()=>{Logger.BannerMessage="\n%c #-----------------------------# \n #      _____ _____ __  __     # \n #     / ____/ ____|  \\/  |    # \n #    | (___| (___ | \\  / |    # \n #     \\___ \\\\___ \\| |\\/| |    # \n #     ____) |___) | |  | |    # \n #    |_____/_____/|_|  |_|    # \n #-----------------------------# \n # Satisfactory Server Manager # \n #-----------------------------# \n",console.log(Logger.BannerMessage,"background:#008cba;color:#fff;font-weight:bold")}),Logger.getLoggerTypeString=(g=>{switch(g){case 0:return"LOG";case 1:return"INFO";case 2:return"SUCCESS";case 3:return"WARN";case 4:return"ERROR";case 5:return"DEBUG"}}),Logger.toLog=((g,o)=>{if(null==g)return;if(g>Logger.LEVEL)return;const r=Logger.STYLES[g],e=Logger.STYLES[Logger.TYPES.RESET],n=Logger.getLoggerTypeString(g);console.log("%c"+n+"%c"+o,r,e)}),Logger.log=(g=>{Logger.toLog(Logger.TYPES.LOG,g)}),Logger.info=(g=>{Logger.toLog(Logger.TYPES.INFO,g)}),Logger.success=(g=>{Logger.toLog(Logger.TYPES.SUCCESS,g)}),Logger.warning=(g=>{Logger.toLog(Logger.TYPES.WARNING,g)}),Logger.error=(g=>{Logger.toLog(Logger.TYPES.ERROR,g)}),Logger.debug=(g=>{Logger.toLog(Logger.TYPES.DEBUG,g)}),module.exports=Logger;

},{}],10:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache");class Page_Backups{constructor(){this._ROLES=[]}init(){this.setupJqueryListeners(),this.SetupEventHandlers()}SetupEventHandlers(){PageCache.on("setactiveagent",()=>{this.MainDisplayFunction()})}setupJqueryListeners(){$("body").on("click",".download-backup-btn",a=>{this.DownloadBackup($(a.currentTarget))})}MainDisplayFunction(){this.DisplayBackupsTable()}DisplayBackupsTable(){const a={agentid:PageCache.getActiveAgent().id};API_Proxy.postData("agent/backups",a).then(a=>{const e=$.fn.dataTable.isDataTable("#backups-table"),t=[],n=a.data;if(null!=n&&n.length>0){let a=0;n.forEach(e=>{let n=$("<button/>").addClass("btn btn-danger float-end remove-backup-btn").html("<i class='fas fa-trash'></i>").attr("data-backup-name",e.filename),s=$("<button/>").addClass("btn btn-primary float-start download-backup-btn").html("<i class='fas fa-download'></i>").attr("data-backup-name",e.filename);const o=n.prop("outerHTML"),i=s.prop("outerHTML");t.push([e.filename,BackupDate(e.created),humanFileSize(e.size),o+i]),a++})}if(0==e)$("#backups-table").DataTable({paging:!0,searching:!1,info:!1,order:[[0,"desc"]],columnDefs:[],data:t});else{const a=$("#backups-table").DataTable();a.clear(),a.rows.add(t),a.draw()}})}DownloadBackup(a){const e=a.attr("data-backup-name"),t={agentid:PageCache.getActiveAgent().id,backupfile:e};console.log(t),API_Proxy.download("agent/backups/download",t).then(a=>{console.log(a)}).catch(a=>{console.log(a)})}}function BackupDate(a){const e=new Date(a);return e.getDate().pad(2)+"/"+(e.getMonth()+1).pad(2)+"/"+e.getFullYear()+" "+e.getHours().pad(2)+":"+e.getMinutes().pad(2)+":"+e.getSeconds().pad(2)}function humanFileSize(a,e=!1,t=1){const n=e?1e3:1024;if(Math.abs(a)<n)return a+" B";const s=e?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"];let o=-1;const i=10**t;do{a/=n,++o}while(Math.round(Math.abs(a)*i)/i>=n&&o<s.length-1);return a.toFixed(t)+" "+s[o]}const page=new Page_Backups;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8}],11:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache"),logger=require("./logger");class Page_Dashboard{constructor(){this.ServerState={}}init(){this.setupEventHandlers(),this.setupJqueryListeners(),this.DashboardBuilt=!1}setupEventHandlers(){PageCache.on("setagentslist",()=>{logger.info("Got Agents List!"),this.OnGotAgentsList()})}setupJqueryListeners(){$("#server-action-start").on("click",t=>{t.preventDefault(),this.ServerAction_Start()}),$("#server-action-stop").on("click",t=>{t.preventDefault(),this.ServerAction_Stop()}),$("#server-action-kill").on("click",t=>{t.preventDefault(),this.ServerAction_Kill()}),$("body").on("click",".server-action-btn",t=>{t.preventDefault();const e=$(t.currentTarget),s={agentid:e.attr("data-agent-id"),action:e.attr("data-action")};console.log(s),this.ExecuteServerAction(s)})}OnGotAgentsList(){const t=$("#server-count"),e=PageCache.getAgentsList().filter(t=>1==t.running&&1==t.active).length,s=PageCache.getAgentsList().length;t.text(`${e} / ${s}`);const n=$("#agents-wrapper");if(0==this.DashboardBuilt){n.empty(),0==PageCache.getAgentsList().length&&n.append('\n                <div class="alert alert-info">It looks there is no servers set up yet! Go to the <strong>Servers</strong> page to set up your first server.</div>\n                ');let t=$("<div/>").addClass("row");PageCache.getAgentsList().forEach((e,s)=>{t.append(this.BuildAgentsUI(e))}),n.append(t),PageCache.getAgentsList().forEach((t,e)=>{const s=$(`#server-card-${t.id}`);this.ToggleActionsButtons(t,s)}),this.DashboardBuilt=!0}else PageCache.getAgentsList().forEach((t,e)=>{const s=$(`#server-card-${t.id}`);this.UpdateAgentCardInfo(t),this.ToggleActionsButtons(t,s)})}BuildAgentsUI(t){console.log(t);const e=$("<div/>").addClass("col-12 col-md-6 col-lg-6 col-xl-3"),s=$("<div/>").addClass("card mb-3").attr("id",`server-card-${t.id}`);e.append(s);const n=$("<div/>").addClass("card-header"),r=$(`<a class="float-end" href="/server/${t.id}"><button class="btn btn-primary"><i class='fas fa-cog'></i></button></a>`);n.append(r),n.append(`<h5>Server: ${t.displayname}</h5>`),s.append(n);const a=$("<div/>").addClass("card-body");s.append(a);let i="Offline",o=0,l=0;if(null!=t&&t.running&&t.active){const e=t.info.serverstate,s=t.info.config.satisfactory;null!=e&&("notinstalled"==e.status||0==s.installed?i="Not Installed":"stopped"==e.status?i="Stopped":"running"==e.status&&(i="Running")),l=t.info.mods.length,o=t.info.usercount}const d=this.BuildAgentInfoCard("status","blue","Status",i,"fa-server");a.append(d);const c=this.BuildAgentInfoCard("users","orange","Users",o,"fa-user");a.append(c);const p=this.BuildAgentInfoCard("mods","green","Installed Mods",l,"fa-pencil-ruler");a.append(p),a.append("<hr/>");const u=$("<div/>").addClass("progress-bar-wrapper");a.append(u);const g=this.BuildAgentProgressBar(t.id,"cpu_progress","CPU");u.append(g);const f=this.BuildAgentProgressBar(t.id,"mem_progress","RAM");u.append(f);const v=t.info.serverstate;let h=0,b=0;null!=v&&(h=v.pcpu.toDecimal(),b=v.pmem.toDecimal()),g.circleProgress({startAngle:-Math.PI/4*2,value:h/100,size:150,lineCap:"round",emptyFill:"rgba(255, 255, 255, .1)",fill:{color:"#ffa500"}}).on("circle-animation-progress",function(t,e,s){$(this).find("strong").text(`${(100*s.toFixed(2)).toFixed(0)}%`)}),f.circleProgress({startAngle:-Math.PI/4*2,value:b/100,size:150,lineCap:"round",emptyFill:"rgba(255, 255, 255, .1)",fill:{color:"#ffa500"}}).on("circle-animation-progress",function(t,e,s){$(this).find("strong").text(`${(100*s.toFixed(2)).toFixed(0)}%`)}),a.append("<hr/>");const A=$('<div class="row"></div>');return a.append(A),A.append(this.BuildServerActionButton(t.id,"success","start","fa-play","Start Server")),A.append(this.BuildServerActionButton(t.id,"warning","stop","fa-stop","Stop Server")),A.append(this.BuildServerActionButton(t.id,"danger","kill","fa-skull-crossbones","Kill Server")),e}BuildAgentInfoCard(t,e,s,n,r){return $(`<div class="status-info-card ${e} info-card-${t}">\n        <div class="status-info-card-main">${s}:</div>\n        <div class="status-info-card-secondary">${n}</div>\n        <div class="status-info-card-icon">\n            <i class="fas ${r}"></i>\n        </div>\n    </div>`)}BuildAgentProgressBar(t,e,s){return $(`<div class="circle ${e}_${t}">\n        <strong></strong>\n        <h6>${s}</h6>\n    </div>`)}BuildServerActionButton(t,e,s,n,r){return $(`<div class='col-12 col-lg-4 mb-2'>\n        <div class="d-grid  gap-2" data-bs-toggle="tooltip" data-bs-placement="bottom"\n        title="Tooltip on bottom">\n        <button class='btn btn-${e} btn-block server-action-btn' data-agent-id='${t}' data-action='${s}'><i class="fas ${n}"></i> ${r}</button>\n        </div>\n        </div>`)}UpdateAgentCardInfo(t){const e=$(`#server-card-${t.id}`);let s="Offline",n=0,r=0;if(null!=t&&t.running&&t.active){const e=t.info.serverstate,a=t.info.config.satisfactory;null!=e&&("notinstalled"==e.status||0==a.installed?s="Not Installed":"stopped"==e.status?s="Stopped":"running"==e.status&&(s="Running")),r=t.info.mods.length,n=t.info.usercount}e.find(".info-card-status .status-info-card-secondary").text(s),e.find(".info-card-users .status-info-card-secondary").text(n),e.find(".info-card-mods .status-info-card-secondary").text(r);const a=t.info.serverstate;let i=0,o=0;null!=a&&(i=a.pcpu.toDecimal(),o=a.pmem.toDecimal()),e.find(`.cpu_progress_${t.id}`).circleProgress("value",i/100),e.find(`.mem_progress_${t.id}`).circleProgress("value",o/100)}ToggleActionsButtons(t,e){const s=e.find(".server-action-btn[data-action='start']"),n=e.find(".server-action-btn[data-action='stop']"),r=e.find(".server-action-btn[data-action='kill']");if(s.prop("disabled",!0),n.prop("disabled",!0),r.prop("disabled",!0),s.parent().attr("title",""),n.parent().attr("title",""),r.parent().attr("title",""),null!=t&&!0===t.running&&!0===t.active){const e=t.info.serverstate,a=t.info.config.satisfactory;if(null!=e){if("notinstalled"==e.status||0==a.installed)return s.parent().attr("title","SF Server Not Installed"),n.parent().attr("title","SF Server Not Installed"),r.parent().attr("title","SF Server Not Installed"),s.parent().tooltip("_fixTitle"),n.parent().tooltip("_fixTitle"),void r.parent().tooltip("_fixTitle");"stopped"==e.status?(s.prop("disabled",!1),n.prop("disabled",!0),r.prop("disabled",!0)):(s.prop("disabled",!0),n.prop("disabled",!1),r.prop("disabled",!1))}}else s.parent().attr("title","Server Not Online"),n.parent().attr("title","Server Not Online"),r.parent().attr("title","Server Not Online"),s.parent().tooltip("_fixTitle"),n.parent().tooltip("_fixTitle"),r.parent().tooltip("_fixTitle")}ExecuteServerAction(t){API_Proxy.postData("agent/serveraction",t).then(t=>{"success"==t.result?toastr.success("Server Action Completed!"):(toastr.error("Failed to Execute Server Action!"),logger.error(t.error))})}}const page=new Page_Dashboard;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8,"./logger":9}],12:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),PageCache=require("./cache"),Page_Dashboard=require("./page_dashboard"),Page_Mods=require("./page_mods"),Page_Logs=require("./page_logs"),Page_Saves=require("./page_saves"),Page_Settings=require("./page_settings"),Page_Servers=require("./page_servers"),Page_Server=require("./page_server"),Page_Users=require("./page_users"),Page_Backups=require("./page_backups"),Tools=require("../Mrhid6Utils/lib/tools"),Logger=require("./logger");class PageHandler{constructor(){this.page="",this.SETUP_CACHE={sfinstalls:[],selected_sfinstall:null}}init(){switch(toastr.options.closeButton=!0,toastr.options.closeMethod="fadeOut",toastr.options.closeDuration=300,toastr.options.closeEasing="swing",toastr.options.showEasing="swing",toastr.options.timeOut=3e4,toastr.options.extendedTimeOut=1e4,toastr.options.progressBar=!0,toastr.options.positionClass="toast-bottom-right",this.setupJqueryHandler(),this.getSSMVersion(),this.page=$(".page-container").attr("data-page"),this.page){case"dashboard":Page_Dashboard.init();break;case"mods":Page_Mods.init();break;case"logs":Page_Logs.init();break;case"saves":Page_Saves.init();break;case"servers":Page_Servers.init();break;case"server":Page_Server.init();break;case"admin":Page_Users.init(),Page_Settings.init();break;case"backups":Page_Backups.init()}this.getAgentsList(),this.startLoggedInCheck(),this.startPageInfoRefresh()}setupJqueryHandler(){$('[data-toggle="tooltip"]').tooltip(),$("body").on("click","#metrics-opt-in #cancel-action",e=>{$("#metrics-opt-in .close").trigger("click"),Tools.modal_opened=!1,this.sendRejectMetrics()}),$("body").on("click","#metrics-opt-in #confirm-action",e=>{$(e.currentTarget);$("#metrics-opt-in .close").trigger("click"),Tools.modal_opened=!1,this.sendAcceptMetrics()}).on("click","#btn_setup_findinstall",e=>{this.getSetupSFInstalls(e)}),$("#inp_server").on("change",e=>{e.preventDefault(),PageCache.setActiveAgent($(e.currentTarget).val())}),$("#viewport.minimal #sidebar .navbar .nav-item a").tooltip("_fixTitle")}getAgentsList(){API_Proxy.get("agent","agents").then(e=>{"success"==e.result?(PageCache.setAgentsList(e.data),this.populateServerSelection()):Logger.error(e.error)}).catch(e=>{console.log(e)})}populateServerSelection(){const e=$("#inp_server");e.find("option").not(":first").remove();for(let t=0;t<PageCache.getAgentsList().length;t++){const s=PageCache.getAgentsList()[t];e.append(`<option value="${s.id}">${s.name}</option>`)}e.val(getCookie("currentAgentId"))}getSSMVersion(){API_Proxy.get("info","ssmversion").then(e=>{const t=$("#ssm-version");"success"==e.result?(this.checkSSMVersion(e.data),t.text(e.data.current_version)):t.text("Server Error!")})}checkSSMVersion(e){const t="toast_"+e.current_version+"_"+e.github_version+"_"+e.version_diff;null==getCookie(t)&&("gt"==e.version_diff?toastr.warning("You are currently using a Development version of SSM"):"lt"==e.version_diff&&toastr.warning("SSM requires updating. Please update now"),setCookie(t,!0,30))}startLoggedInCheck(){const e=setInterval(()=>{Logger.debug("Checking Logged In!"),this.checkLoggedIn().then(t=>{1!=t&&(clearInterval(e),window.location.replace("/logout"))})},1e4)}checkLoggedIn(){return new Promise((e,t)=>{API_Proxy.get("info","loggedin").then(t=>{"success"==t.result?e(!0):e(!1)})})}startPageInfoRefresh(){setInterval(()=>{this.getAgentsList()},5e3)}}function setCookie(e,t,s){var r="";if(s){var o=new Date;o.setTime(o.getTime()+24*s*60*60*1e3),r="; expires="+o.toUTCString()}document.cookie=e+"="+(t||"")+r+"; path=/"}function getCookie(e){for(var t=e+"=",s=document.cookie.split(";"),r=0;r<s.length;r++){for(var o=s[r];" "==o.charAt(0);)o=o.substring(1,o.length);if(0==o.indexOf(t))return o.substring(t.length,o.length)}return null}function eraseCookie(e){document.cookie=e+"=; Max-Age=-99999999;"}const pagehandler=new PageHandler;module.exports=pagehandler;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8,"./logger":9,"./page_backups":10,"./page_dashboard":11,"./page_logs":13,"./page_mods":14,"./page_saves":15,"./page_server":16,"./page_servers":17,"./page_settings":18,"./page_users":19}],13:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache");class Page_Logs{constructor(){this.ServerState={},this._TotalSFLogLines=0,this._SFLogOffset=0}init(){this.setupJqueryListeners(),this.SetupEventHandlers()}setupJqueryListeners(){$("body").on("click",".sf-log-page-link",e=>{e.preventDefault();const t=$(e.currentTarget);console.log(parseInt(t.text())-1),this._SFLogOffset=500*(parseInt(t.text())-1),this.getSFServerLog(!0)})}SetupEventHandlers(){PageCache.on("setactiveagent",()=>{this.MainDisplayFunction()})}MainDisplayFunction(){null!=PageCache.getActiveAgent()?(this.getSSMLog(),this.getSFServerLog()):this.getSSMLog()}getSSMLog(){const e=PageCache.getActiveAgent(),t={};t.agentid=null==e?-1:e.id,API_Proxy.postData("agent/logs/ssmlog",t).then(e=>{const t=$("#ssm-log-viewer samp");t.empty(),"success"==e.result?e.data.forEach(e=>{t.append("<p>"+e+"</p>")}):t.text(e.error.message)})}getSFServerLog(e=!1){const t=PageCache.getActiveAgent(),s={offset:this._SFLogOffset};s.agentid=null==t?-1:t.id,API_Proxy.postData("agent/logs/sfserverlog",s).then(t=>{const s=$("#sf-log-viewer samp"),a=$("#sf-logins-viewer samp");s.empty(),a.empty(),"success"==t.result?t.data.lineCount==this._TotalSFLogLines&&1!=e||(this._TotalSFLogLines=t.data.lineCount,this.buildSFLogPagination(),t.data.logArray.forEach(e=>{s.append("<p>"+e+"</p>")}),t.data.playerJoins.forEach(e=>{a.append("<p>"+e+"</p>")})):(s.text(t.error),a.text(t.error))})}buildSFLogPagination(){const e=$("#SFLogPagination .pagination");e.empty();const t=Math.ceil(this._TotalSFLogLines/500)+1;for(let s=1;s<t;s++){const t=500*(s-1);e.append(`<li class="page-item ${this._SFLogOffset==t?"active":""}"><a class="page-link sf-log-page-link ">${s}</a></li>`)}}}const page=new Page_Logs;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8}],14:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache");class Page_Mods{constructor(){this.Agent=null}init(){this.setupJqueryListeners(),this.SetupEventHandlers()}SetupEventHandlers(){PageCache.on("setsmlversions",()=>{this.displayFicsitSMLVersions()}),PageCache.on("setficsitmods",()=>{this.displayFicsitModList(),this.displayInstalledMods()}),PageCache.on("setinstalledmods",()=>{this.displayInstalledMods()}),PageCache.on("setactiveagent",()=>{this.MainDisplayFunction()})}setupJqueryListeners(){$("body").on("change","#sel-add-mod-name",e=>{this.getFicsitModInfo()}).on("change","#sel-add-mod-version",e=>{-1==$(e.currentTarget).val()?this.lockInstallModBtn():this.unlockInstallModBtn()}).on("click",".btn-uninstall-mod",e=>{if(0==this.CheckServerIsRunning()){const t=$(e.currentTarget);this.uninstallMod(t)}}).on("click",".btn-update-mod",e=>{if(0==this.CheckServerIsRunning()){const t=$(e.currentTarget);this.updateModToLatest(t)}}),$("#btn-install-sml").on("click",e=>{if(0==this.CheckServerIsRunning()){const t=$(e.currentTarget);this.installSMLVersion(t)}}),$("#btn-install-mod").on("click",e=>{if(0==this.CheckServerIsRunning()){const t=$(e.currentTarget);this.installModVersion(t)}})}MainDisplayFunction(){const e=PageCache.getActiveAgent();null!=this.Agent&&this.Agent.id==e.id||(console.log("Is Different!"),this.Agent=e,this.LockAllInputs(),null!=this.Agent&&(this.getFicsitSMLVersions(),this.getFicsitModList(),1==this.Agent.running&&1==this.Agent.active?(this.UnlockAllInputs(),this.getInstalledMods(),this.getSMLInfo()):(PageCache.SetAgentInstalledMods([]),$("#mod-count").text("Server Not Running!"),$(".sml-status").text("Server Not Running!"))))}CheckServerIsRunning(){if("running"==PageCache.getActiveAgent().info.serverstate.status){if(1==Tools.modal_opened)return;return Tools.openModal("/public/modals","server-mods-error",e=>{e.find("#error-msg").text("Server needs to be stopped before making changes!")}),!0}return!1}LockAllInputs(){$("#radio-install-sml1").prop("disabled",!0),$("#radio-install-sml2").prop("disabled",!0),$("#sel-install-sml-ver").prop("disabled",!0),$("#btn-install-sml").prop("disabled",!0),$("#sel-add-mod-name").prop("disabled",!0),$("#sel-add-mod-version").prop("disabled",!0)}UnlockAllInputs(){$("#radio-install-sml1").prop("disabled",!1),$("#radio-install-sml2").prop("disabled",!1),$("#sel-install-sml-ver").prop("disabled",!1),$("#btn-install-sml").prop("disabled",!1),$("#sel-add-mod-name").prop("disabled",!1)}getInstalledMods(){const e={agentid:PageCache.getActiveAgent().id};API_Proxy.postData("agent/modinfo/installed",e).then(e=>{"success"==e.result?(console.log(e),PageCache.SetAgentInstalledMods(e.data)):PageCache.SetAgentInstalledMods([])})}displayInstalledMods(){if(0==PageCache.getFicsitMods().length)return;const e=$.fn.dataTable.isDataTable("#mods-table"),t=PageCache.getAgentInstalledMods(),s=PageCache.getActiveAgent();if(1==s.running&&1==s.active){$("#mod-count").text(t.length)}const o=[];for(let e=0;e<t.length;e++){const s=t[e],a=PageCache.getFicsitMods().find(e=>e.mod_reference==s.mod_reference);console.log(a);const n=s.version==a.latestVersion,i=$("<button/>").addClass("btn btn-secondary btn-update-mod float-right").attr("data-modid",s.mod_reference).attr("data-toggle","tooltip").attr("data-placement","bottom").attr("title","Update Mod").html("<i class='fas fa-arrow-alt-circle-up'></i>"),l=$("<button/>").addClass("btn btn-danger btn-block btn-uninstall-mod").attr("data-modid",s.mod_reference).html("<i class='fas fa-trash'></i> Uninstall"),d=s.version+" "+(0==n?i.prop("outerHTML"):"");o.push([s.name,d,l.prop("outerHTML")])}if(0==e)$("#mods-table").DataTable({paging:!0,searching:!1,info:!1,order:[[0,"asc"]],columnDefs:[{targets:2,orderable:!1}],data:o});else{const e=$("#mods-table").DataTable();e.clear(),e.rows.add(o),e.draw()}$('[data-toggle="tooltip"]').tooltip()}getSMLInfo(){const e={agentid:PageCache.getActiveAgent().id};API_Proxy.postData("agent/modinfo/smlinfo",e).then(e=>{const t=$(".sml-status"),s=$(".sml-version");console.log(e),"success"==e.result?"not_installed"==e.data.state?(t.text("Not Installed"),s.text("Not Installed")):(t.text("Installed"),s.text(e.data.version)):(t.text("Unknown"),s.text("N/A"))})}getFicsitSMLVersions(){API_Proxy.get("ficsitinfo","smlversions").then(e=>{"success"==e.result&&PageCache.setSMLVersions(e.data.versions)})}displayFicsitSMLVersions(){const e=$("#sel-install-sml-ver");$(".sml-latest-version").text(PageCache.getSMLVersions()[0].version),PageCache.getSMLVersions().forEach(t=>{e.append("<option value='"+t.version+"'>"+t.version+"</option")})}getFicsitModList(){PageCache.getFicsitMods().length>0?PageCache.emit("setficsitmods"):API_Proxy.get("ficsitinfo","modslist").then(e=>{console.log(e.data),"success"==e.result?PageCache.setFicsitMods(e.data):console.log(e)})}displayFicsitModList(){const e=$("#sel-add-mod-name");PageCache.getFicsitMods().forEach(t=>{e.append("<option value='"+t.mod_reference+"'>"+t.name+"</option")})}getFicsitModInfo(){const e=$("#sel-add-mod-name").val();"-1"==e?this.hideNewModInfo():API_Proxy.get("ficsitinfo","modinfo",e).then(e=>{this.showNewModInfo(e.data)})}hideNewModInfo(){$("#add-mod-logo").attr("src","/public/images/ssm_logo128_outline.png"),$("#sel-add-mod-version").prop("disabled",!0),$("#sel-add-mod-version").find("option").not(":first").remove(),this.lockInstallModBtn()}showNewModInfo(e){console.log(e),""==e.logo?$("#add-mod-logo").attr("src","https://ficsit.app/static/assets/images/no_image.png"):$("#add-mod-logo").attr("src",e.logo);const t=$("#sel-add-mod-version");t.prop("disabled",!1),t.find("option").not(":first").remove(),e.versions.forEach(e=>{t.append("<option value='"+e.version+"'>"+e.version+"</option")})}installSMLVersion(e){e.prop("disabled",!0),e.find("i").removeClass("fa-download").addClass("fa-sync fa-spin"),$("input[name='radio-install-sml']").prop("disabled",!0);const t=$("input[name='radio-install-sml']:checked").val(),s=$("#sel-install-sml-ver");s.prop("disabled",!0);let o="latest";if(1==t){if(-1==s.val())return void toastr.error("Please Select A SML Version!");o=s.val()}const a={agentid:PageCache.getActiveAgent().id,action:"installsml",version:o};API_Proxy.postData("agent/modaction",a).then(t=>{console.log(t),e.prop("disabled",!1),e.find("i").addClass("fa-download").removeClass("fa-sync fa-spin"),s.prop("disabled",!1),$("input[name='radio-install-sml']").prop("disabled",!1),"success"==t.result?toastr.success("Successfully installed SML"):toastr.error("Failed to install SML"),this.getInstalledMods(),this.getSMLInfo()})}unlockInstallModBtn(){$("#btn-install-mod").prop("disabled",!1)}lockInstallModBtn(){$("#btn-install-mod").prop("disabled",!0)}installModVersion(e){e.prop("disabled",!0),e.find("i").removeClass("fa-download").addClass("fa-sync fa-spin");const t=$("#sel-add-mod-name"),s=$("#sel-add-mod-version");t.prop("disabled",!0),s.prop("disabled",!0);const o=s.val();if(-1==o)return t.prop("disabled",!1),s.prop("disabled",!1),void toastr.error("Please Select A Mod Version!");const a={agentid:PageCache.getActiveAgent().id,action:"installmod",modReference:t.val(),versionid:o};API_Proxy.postData("agent/modaction",a).then(o=>{e.prop("disabled",!1),e.find("i").addClass("fa-download").removeClass("fa-sync fa-spin"),t.prop("disabled",!1),s.prop("disabled",!1),"success"==o.result?toastr.success("Successfully installed Mod"):toastr.error("Failed to install Mod"),this.getInstalledMods()})}uninstallMod(e){const t=e.attr("data-modid"),s={agentid:PageCache.getActiveAgent().id,action:"uninstallmod",modReference:t};API_Proxy.postData("agent/modaction",s).then(e=>{"success"==e.result?toastr.success("Successfully uninstalled Mod"):toastr.error("Failed to uninstall Mod"),this.getInstalledMods()})}updateModToLatest(e){const t=e.attr("data-modid"),s={agentid:PageCache.getActiveAgent().id,action:"updatemod",modReference:t};API_Proxy.postData("agent/modaction",s).then(e=>{"success"==e.result?toastr.success("Successfully updated Mod"):toastr.error("Failed to update Mod"),this.getInstalledMods()})}}const page=new Page_Mods;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8}],15:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache");class Page_Settings{constructor(){this.Config={},this.ServerState={}}init(){this.setupJqueryListeners(),this.SetupEventHandlers()}SetupEventHandlers(){PageCache.on("setactiveagent",()=>{this.MainDisplayFunction()})}setupJqueryListeners(){$("#refresh-saves").click(e=>{e.preventDefault();const a=$(e.currentTarget);a.prop("disabled",!0),a.find("i").addClass("fa-spin"),this.displaySaveTable()}),$("body").on("click",".select-save-btn",e=>{const a=$(e.currentTarget).attr("data-save");if("stopped"==this.ServerState.status)this.selectSave(a);else{if(1==Tools.modal_opened)return;Tools.openModal("server-settings-error",e=>{e.find("#error-msg").text("Server needs to be stopped before making changes!")})}}),$("#new-session-name").click(e=>{e.preventDefault(),Tools.openModal("server-session-new",e=>{e.find("#confirm-action").attr("data-action","new-session")})}),$("body").on("click","#cancel-action",e=>{$("#server-session-new .close").trigger("click"),Tools.modal_opened=!1}),$("#btn-save-upload").on("click",e=>{e.preventDefault(),this.uploadSaveFile()}),$("body").on("click",".remove-save-btn",e=>{e.preventDefault(),this.RemoveSave($(e.currentTarget))}),$("body").on("click",".download-save-btn",e=>{e.preventDefault(),this.DownloadSave($(e.currentTarget))}),$("body").on("click","#confirm-action",e=>{e.preventDefault();const a=$(e.currentTarget);"remove-save"==a.attr("data-action")&&this.RemoveSaveConfirmed(a)}),$("body").on("click","#cancel-action",e=>{e.preventDefault();$(e.currentTarget);$("#server-settings-confirm").find(".close").trigger("click")}),$("body").on("click","#cancel-action",e=>{e.preventDefault();$(e.currentTarget);$("#server-settings-confirm").find(".close").trigger("click")})}getConfig(){this.MainDisplayFunction()}MainDisplayFunction(){this.displaySaveTable()}displaySaveTable(){const e=$.fn.dataTable.isDataTable("#saves-table"),a={agentid:PageCache.getActiveAgent().id};API_Proxy.postData("agent/gamesaves",a).then(a=>{console.log(a),$("#refresh-saves").prop("disabled",!1),$("#refresh-saves").find("i").removeClass("fa-spin");const t=[];if("success"==a.result&&a.data.forEach(e=>{if("failed"==e.result)return;let a=$("<button/>").addClass("btn btn-danger float-end remove-save-btn").html("<i class='fas fa-trash'></i>").attr("data-save",e.savename);const s=$("<button/>").addClass("btn btn-primary float-start download-save-btn").html("<i class='fas fa-download'></i>").attr("data-save",e.savename).prop("outerHTML"),o=a.prop("outerHTML"),n=e.savebody.split("?");let r="Unknown";for(let e=0;e<n.length;e++){const a=n[e].split("=");"sessionName"==a[0]&&(r=a[1])}t.push([r.trunc(25),e.savename.trunc(40),saveDate(e.last_modified),s+o])}),0==e)$("#saves-table").DataTable({paging:!0,searching:!1,info:!1,order:[[2,"desc"]],columnDefs:[{type:"date-euro",targets:2}],data:t});else{const e=$("#saves-table").DataTable();e.clear(),e.rows.add(t),e.draw()}})}uploadSaveFile(){$("#btn-save-upload i").removeClass("fa-upload").addClass("fa-sync fa-spin"),$("#btn-save-upload").prop("disabled",!0);const e=new FormData($("#save-upload-form")[0]),a=PageCache.getActiveAgent();null!=a?API_Proxy.upload("agent/gamesaves/upload/"+a.id,e).then(e=>{"success"==e.result?toastr.success("Save has been uploaded!"):(console.log(e.error),toastr.error("Save couldn't be uploaded!")),$("#btn-save-upload i").addClass("fa-upload").removeClass("fa-sync fa-spin"),$("#btn-save-upload").prop("disabled",!1),$("#inp-save-file").prop("disabled",!1)}):toastr.error("Select A Server!")}RemoveSave(e){const a=e.attr("data-save");Tools.openModal("/public/modals","server-settings-confirm",e=>{e.find("#confirm-action").attr("data-action","remove-save").attr("data-save",a)})}RemoveSaveConfirmed(e){const a=e.attr("data-save"),t={agentid:PageCache.getActiveAgent().id,savefile:a};API_Proxy.postData("agent/gamesaves/delete",t).then(e=>{console.log(e)}).catch(e=>{console.log(e)})}DownloadSave(e){const a=e.attr("data-save"),t={agentid:PageCache.getActiveAgent().id,savefile:a};API_Proxy.download("agent/gamesaves/download",t).then(e=>{console.log(e)}).catch(e=>{console.log(e)})}}function saveDate(e){const a=new Date(e);return a.getDate().pad(2)+"/"+(a.getMonth()+1).pad(2)+"/"+a.getFullYear()+" "+a.getHours().pad(2)+":"+a.getMinutes().pad(2)+":"+a.getSeconds().pad(2)}const page=new Page_Settings;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8}],16:[function(require,module,exports){
const Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache"),Logger=require("./logger"),API_Proxy=require("./api_proxy");class Page_Server{init(){this.SetupEventHandlers(),this.setupJqueryListeners(),this.agentid=parseInt($(".page-container").attr("data-agentid")),this.Agent=PageCache.getAgentsList().find(e=>e.id==this.agentid)}SetupEventHandlers(){PageCache.on("setagentslist",()=>{this.Agent=PageCache.getAgentsList().find(e=>e.id==this.agentid),this.DisplayServerInfo()})}setupJqueryListeners(){$("#edit-backup-settings").click(e=>{e.preventDefault(),this.unlockBackupSettings()}),$("#save-backup-settings").on("click",e=>{e.preventDefault(),this.submitBackupSettings()}),$("#cancel-backup-settings").on("click",e=>{e.preventDefault(),this.lockBackupSettings()}),$("#edit-sf-settings").on("click",e=>{e.preventDefault();const t=this.Agent;if(null==t.info.serverstate||"running"!=t.info.serverstate.status)this.unlockSFSettings();else{if(1==Tools.modal_opened)return;Tools.openModal("/public/modals","server-settings-error",e=>{e.find("#error-msg").text("Server needs to be stopped before making changes!")})}}),$("#cancel-sf-settings").on("click",e=>{e.preventDefault(),this.lockSFSettings()}),$("#save-sf-settings").on("click",e=>{e.preventDefault(),this.submitSFSettings()}),$("#edit-mods-settings").on("click",e=>{e.preventDefault();const t=PageCache.getActiveAgent();if(null==t.info.serverstate||"running"!=t.info.serverstate.status)this.unlockModsSettings();else{if(1==Tools.modal_opened)return;Tools.openModal("/public/modals","server-settings-error",e=>{e.find("#error-msg").text("Server needs to be stopped before making changes!")})}}),$("#cancel-mods-settings").on("click",e=>{e.preventDefault(),this.lockModsSettings(),this.getConfig()}),$("#save-mods-settings").on("click",e=>{e.preventDefault(),this.submitModsSettings()}),$("#inp_maxplayers").on("input change",()=>{const e=$("#inp_maxplayers").val();$("#max-players-value").text(`${e} / 500`)}),$("#settings-dangerarea-installsf").on("click",e=>{e.preventDefault(),this.installSFServer()}),$("#server-dangerarea-delete").on("click",e=>{e.preventDefault(),this.OpenConfirmDeleteModal()}),$("#server-dangerarea-update").on("click",e=>{e.preventDefault(),this.OpenConfirmUpdateModal()}),$("body").on("click","#confirm-action",e=>{const t=$(e.currentTarget).attr("data-action");"delete-server"==t&&($("#server-action-confirm .close").trigger("click"),this.DeleteAgent()),"update-server"==t&&($("#server-action-confirm .close").trigger("click"),this.UpdateAgent())})}DisplayServerInfo(){if(this.LockAllEditButtons(),this.UnlockAllEditButtons(),$("#agent-publicip").text(window.location.hostname),0==this.Agent.running||0==this.Agent.active)return $("#agent-connectionport").text("Server Not Active!"),$("#setting-info-serverloc").text("Server Not Active!"),$("#setting-info-saveloc").text("Server Not Active!"),$("#setting-info-logloc").text("Server Not Active!"),$("#backup-location").text("Server Not Active!"),void $("#sfserver-version").text("Server Not Active!");const e=this.Agent.info.config.satisfactory,t=this.Agent.info.config.ssm;$("#agent-connectionport").text(this.Agent.ports.ServerQueryPort),$("#setting-info-serverloc").text(e.server_location),$("#setting-info-saveloc").text(e.save.location),$("#setting-info-logloc").text(e.log.location),$("#backup-location").text(t.backup.location),$("#sfserver-version").text(e.server_version),0==$("#edit-backup-settings").prop("disabled")&&($("#inp_backup-interval").val(t.backup.interval),$("#inp_backup-keep").val(t.backup.keep)),0==$("#edit-sf-settings").prop("disabled")&&this.populateSFSettings(),0==$("#edit-mods-settings").prop("disabled")&&this.populateModsSettings();const s=new Date(t.backup.nextbackup),a=`${s.getDate().pad(2)} ${s.getMonthName()} ${s.getFullYear()} ${s.getHours().pad(2)}:${s.getMinutes().pad(2)}:${s.getSeconds().pad(2)}`;$("#backup-nextbackup").text(a)}LockAllEditButtons(){const e=this.Agent;0!=e.running&&0!=e.active||($("i.fa-edit").parent().prop("disabled",!0),$("#settings-dangerarea-installsf").prop("disabled",!0))}UnlockAllEditButtons(){const e=this.Agent;1==e.running&&1==e.active&&($("i.fa-edit").parent().each((e,t)=>{0==$(t).attr("data-editing")&&$(t).prop("disabled",!1)}),$("#settings-dangerarea-installsf").prop("disabled",!1))}unlockBackupSettings(){$("#edit-backup-settings").prop("disabled",!0).attr("data-editing",!0),$("#save-backup-settings").prop("disabled",!1),$("#cancel-backup-settings").prop("disabled",!1),$("#inp_backup-interval").prop("disabled",!1),$("#inp_backup-keep").prop("disabled",!1)}lockBackupSettings(){$("#edit-backup-settings").prop("disabled",!1).attr("data-editing",!1),$("#save-backup-settings").prop("disabled",!0),$("#cancel-backup-settings").prop("disabled",!0),$("#inp_backup-interval").prop("disabled",!0),$("#inp_backup-keep").prop("disabled",!0)}submitBackupSettings(){const e=$("#inp_backup-interval").val(),t=$("#inp_backup-keep").val(),s={agentid:this.Agent.id,interval:e,keep:t};API_Proxy.postData("agent/config/backupsettings",s).then(e=>{"success"==e.result?(this.lockBackupSettings(),toastr.success("Settings Saved!")):(toastr.error("Failed To Save Settings!"),Logger.error(e.error))})}populateSFSettings(){const e=this.Agent,t=e.info.config.satisfactory;if($("#inp_updatesfonstart").bootstrapToggle("enable"),1==t.updateonstart?$("#inp_updatesfonstart").bootstrapToggle("on"):$("#inp_updatesfonstart").bootstrapToggle("off"),$("#inp_updatesfonstart").bootstrapToggle("disable"),"notinstalled"!=e.info.serverstate.status){const s=e.info.config.game;$("#inp_maxplayers").val(s.Game["/Script/Engine"].GameSession.MaxPlayers);const a=$("#inp_maxplayers").val();$("#max-players-value").text(`${a} / 500`),$("#inp_workerthreads").val(t.worker_threads)}else $("#edit-sf-settings").prop("disabled",!0)}unlockSFSettings(){$("#edit-sf-settings").prop("disabled",!0).attr("data-editing",!0),$("#save-sf-settings").prop("disabled",!1),$("#cancel-sf-settings").prop("disabled",!1),$("#inp_maxplayers").prop("disabled",!1),$("#inp_workerthreads").prop("disabled",!1),$("#inp_updatesfonstart").bootstrapToggle("enable")}lockSFSettings(){$("#edit-sf-settings").prop("disabled",!1).attr("data-editing",!1),$("#save-sf-settings").prop("disabled",!0),$("#cancel-sf-settings").prop("disabled",!0),$("#inp_maxplayers").prop("disabled",!0),$("#inp_workerthreads").prop("disabled",!0),$("#inp_updatesfonstart").bootstrapToggle("disable")}submitSFSettings(){const e=this.Agent,t=$("#inp_maxplayers").val(),s=$("#inp_workerthreads").val(),a=$("#inp_updatesfonstart").is(":checked"),o={agentid:e.id,maxplayers:t,updatesfonstart:a,workerthreads:s};API_Proxy.postData("agent/config/sfsettings",o).then(e=>{"success"==e.result?(this.lockSFSettings(),toastr.success("Settings Saved!")):(toastr.error("Failed To Save Settings!"),Logger.error(e.error))})}populateModsSettings(){const e=this.Agent.info.config.mods;$("#inp_mods_enabled").bootstrapToggle("enable"),1==e.enabled?$("#inp_mods_enabled").bootstrapToggle("on"):$("#inp_mods_enabled").bootstrapToggle("off"),$("#inp_mods_enabled").bootstrapToggle("disable"),$("#inp_mods_autoupdate").bootstrapToggle("enable"),1==e.autoupdate?$("#inp_mods_autoupdate").bootstrapToggle("on"):$("#inp_mods_autoupdate").bootstrapToggle("off"),$("#inp_mods_autoupdate").bootstrapToggle("disable")}unlockModsSettings(){$("#edit-mods-settings").prop("disabled",!0).attr("data-editing",!0),$("#save-mods-settings").prop("disabled",!1),$("#cancel-mods-settings").prop("disabled",!1),$("#inp_mods_enabled").bootstrapToggle("enable"),$("#inp_mods_autoupdate").bootstrapToggle("enable")}lockModsSettings(){$("#edit-mods-settings").prop("disabled",!1).attr("data-editing",!1),$("#save-mods-settings").prop("disabled",!0),$("#cancel-mods-settings").prop("disabled",!0),$("#inp_mods_enabled").bootstrapToggle("disable"),$("#inp_mods_autoupdate").bootstrapToggle("disable")}submitModsSettings(){const e=PageCache.getActiveAgent(),t=$("#inp_mods_enabled").is(":checked"),s=$("#inp_mods_autoupdate").is(":checked"),a={agentid:e.id,enabled:t,autoupdate:s};API_Proxy.postData("agent/config/modsettings",a).then(e=>{"success"==e.result?(this.lockModsSettings(),toastr.success("Settings Saved!")):(toastr.error("Failed To Save Settings!"),Logger.error(e.error))})}installSFServer(){const e=this.Agent;1!=Tools.modal_opened&&Tools.openModal("/public/modals","server-action-installsf",()=>{const t={agentid:e.id};API_Proxy.postData("agent/serveractions/installsf",t).then(e=>{"success"==e.result?(toastr.success("Server has been installed!"),$("#server-action-installsf .close").trigger("click")):($("#server-action-installsf .close").trigger("click"),toastr.error("Failed To Install Server!"),Logger.error(e.error))})})}OpenConfirmDeleteModal(){Tools.openModal("/public/modals","server-action-confirm",e=>{e.find("#confirm-action").attr("data-action","delete-server")})}OpenConfirmUpdateModal(){Tools.openModal("/public/modals","server-action-confirm",e=>{e.find("#confirm-action").attr("data-action","update-server")})}DeleteAgent(){const e={agentid:this.agentid};API_Proxy.postData("agent/delete",e).then(e=>{"success"==e.result?(toastr.success("Server Has Been Deleted!"),setTimeout(()=>{window.redirect("/servers")},1e4)):(toastr.error("Failed To Delete Server!"),Logger.error(e.error))})}UpdateAgent(){const e={agentid:this.agentid};API_Proxy.postData("agent/update",e).then(e=>{"success"==e.result?(toastr.success("Server Has Been Updated!"),setTimeout(()=>{window.redirect("/servers")},1e4)):(toastr.error("Failed To Update Server!"),Logger.error(e.error))})}}const page=new Page_Server;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8,"./logger":9}],17:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools"),PageCache=require("./cache"),Logger=require("./logger");class Page_Servers{constructor(){}init(){this.setupJqueryListeners(),this.SetupEventHandlers()}setupJqueryListeners(){$("body").on("click",".btn-startstop-docker",e=>{e.preventDefault();const r=$(e.currentTarget);"start"==r.attr("data-action")?this.StartDockerAgent(r.attr("data-agentid")):this.StopDockerAgent(r.attr("data-agentid"))}).on("click","#submit-create-server-btn",e=>{this.CreateNewServer()}),$("#btn-createserver").on("click",e=>{e.preventDefault(),this.OpenCreateServerModal()})}SetupEventHandlers(){PageCache.on("setagentslist",()=>{this.DisplayAgentsTable()})}DisplayAgentsTable(){const e=$.fn.dataTable.isDataTable("#agents-table"),r=[];if(PageCache.getAgentsList().forEach(e=>{const t=$("<a/>").attr("href",`/server/${e.id}`),a=$("<button/>").addClass("btn btn-primary float-start").html("<i class='fas fa-cog'></i>");t.append(a);const s=t.prop("outerHTML"),o=$("<button/>").addClass("btn btn-success float-end").html("<i class='fas fa-play'></i>").attr("data-action","start").attr("data-agentid",`${e.id}`).addClass("btn-startstop-docker");1==e.running&&(o.attr("data-action","stop").removeClass("btn-success").addClass("btn-danger"),o.find("i").removeClass("fa-play").addClass("fa-stop"));const n=s+o.prop("outerHTML"),c=$("<i/>").addClass("fas fa-2xl fa-circle-xmark text-danger"),l=$("<i/>").addClass("fas fa-2xl fa-circle-xmark text-danger");1==e.running&&c.removeClass("fa-circle-xmark text-danger").addClass("fa-circle-check text-success"),1==e.active&&l.removeClass("fa-circle-xmark text-danger").addClass("fa-circle-check text-success"),r.push([e.displayname,c.prop("outerHTML"),l.prop("outerHTML"),e.info.version||"Unknown",n])}),0==e)$("#agents-table").DataTable({paging:!0,searching:!1,info:!1,order:[[2,"desc"]],columnDefs:[{type:"date-euro",targets:2}],data:r});else{const e=$("#agents-table").DataTable();e.clear(),e.rows.add(r),e.draw()}}StartDockerAgent(e){API_Proxy.postData("agent/start",{id:e}).then(e=>{"success"==e.result?toastr.success("Server Started!"):(toastr.error("Failed to start server"),Logger.error(e.error))})}StopDockerAgent(e){API_Proxy.postData("agent/stop",{id:e}).then(e=>{"success"==e.result?toastr.success("Server Stopped!"):(toastr.error("Failed to stop server"),Logger.error(e.error))})}OpenCreateServerModal(){Tools.openModal("/public/modals","create-server-modal",e=>{})}CreateNewServer(){const e={name:$("#inp_servername").val(),port:parseInt($("#inp_serverport").val())};""==e.name||e.port<15777?$("#create-server-error").removeClass("hidden").text("Error: Server Name Is Required And Server Port must be more than 15776"):($("#create-server-modal .close").trigger("click"),API_Proxy.postData("agent/create",e).then(e=>{"success"==e.result?toastr.success("Server created!"):(toastr.error("Failed to create server"),Logger.error(e.error))}))}}const page=new Page_Servers;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6,"./cache":8,"./logger":9}],18:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools");class Page_Settings{constructor(){this._ROLES=[]}init(){this.setupJqueryListeners(),this.SetupEventHandlers(),this.MainDisplayFunction()}SetupEventHandlers(){}setupJqueryListeners(){$("body").on("click","#btn-addwebhook",a=>{const e=$(a.currentTarget);this.OpenAddWebhookModal(e)})}MainDisplayFunction(){this.DisplayUsersTable()}DisplayUsersTable(){API_Proxy.get("info/webhooks").then(a=>{const e=$.fn.dataTable.isDataTable("#webhooks-table"),s=[],o=a.data;if(console.log(o),o.forEach(a=>{const e=$("<button/>").addClass("btn btn-light btn-block configure-webhook").attr("data-user-id",a.id).html("<i class='fas fa-cog'></i>").prop("outerHTML"),o=$("<i/>").addClass("fas fa-2xl fa-circle-xmark text-danger");1==a.enabled&&o.removeClass("fa-circle-xmark text-danger").addClass("fa-circle-check text-success");const t=$("<i/>").addClass("fa-brands fa-discord fa-2xl");0==a.type&&t.removeClass("fa-brands fa-discord").addClass("fa-solid fa-bell"),s.push([a.id,a.name,o.prop("outerHTML"),t.prop("outerHTML"),e])}),console.log(s),0==e)$("#webhooks-table").DataTable({paging:!0,searching:!1,info:!1,order:[[0,"asc"]],columnDefs:[],data:s});else{const a=$("#webhooks-table").DataTable();a.clear(),a.rows.add(s),a.draw()}})}OpenAddWebhookModal(a){Tools.openModal("/public/modals","add-user-modal",a=>{const e=a.find("#sel_role");this._ROLES.forEach(a=>{e.append(`<option value='${a.id}'>${a.name}</option>`)})})}}const page=new Page_Settings;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6}],19:[function(require,module,exports){
const API_Proxy=require("./api_proxy"),Tools=require("../Mrhid6Utils/lib/tools");class Page_Users{constructor(){this._ROLES=[],this._PERMISSIONS=[]}init(){this.setupJqueryListeners(),this.SetupEventHandlers(),this.MainDisplayFunction()}SetupEventHandlers(){}setupJqueryListeners(){$("body").on("click","#btn-adduser",e=>{const t=$(e.currentTarget);this.OpenAddUserModal(t)}).on("click","#btn-addrole",e=>{const t=$(e.currentTarget);this.OpenAddRoleModal(t)}).on("change",".perm-category-checkbox",e=>{e.preventDefault();const t=$(e.currentTarget);this.SelectCategoryCheckboxes(t)}).on("change",".perm-checkbox",e=>{e.preventDefault();const t=$(e.currentTarget);this.CheckAllPermsChecked(t)}).on("click","#submit-add-role-btn",e=>{e.preventDefault(),this.SubmitAddRole()}).on("click","#submit-add-user-btn",e=>{e.preventDefault(),this.SubmitAddUser()})}MainDisplayFunction(){this.DisplayUsersTable(),this.DisplayRolesTable(),this.GetPermissions()}DisplayUsersTable(){API_Proxy.get("info/users").then(e=>{const t=$.fn.dataTable.isDataTable("#users-table"),a=[];if(e.data.forEach(e=>{const t=$("<button/>").addClass("btn btn-light btn-block configure-user").attr("data-user-id",e.id).html("<i class='fas fa-cog'></i>").prop("outerHTML");a.push([e.id,e.username,e.role.name,t])}),0==t)$("#users-table").DataTable({paging:!0,searching:!1,info:!1,order:[[0,"desc"]],columnDefs:[],data:a});else{const e=$("#users-table").DataTable();e.clear(),e.rows.add(a),e.draw()}})}DisplayRolesTable(){API_Proxy.get("info/roles").then(e=>{const t=$.fn.dataTable.isDataTable("#roles-table"),a=[],s=e.data;if(this._ROLES=s,s.forEach(e=>{const t=$("<button/>").addClass("btn btn-light btn-block configure-role").attr("data-role-id",e.id).html("<i class='fas fa-cog'></i>").prop("outerHTML");a.push([e.id,e.name,e.permissions.length,t])}),0==t)$("#roles-table").DataTable({paging:!0,searching:!1,info:!1,order:[[0,"desc"]],columnDefs:[],data:a});else{const e=$("#roles-table").DataTable();e.clear(),e.rows.add(a),e.draw()}})}GetPermissions(){API_Proxy.get("info/permissions").then(e=>{"success"==e.result&&(this._PERMISSIONS=[],e.data.forEach(e=>{const t=e,a=e.split(".");a.pop(),a.push("*");const s=a.join(".");0==this._PERMISSIONS.includes(s)&&this._PERMISSIONS.push(s),this._PERMISSIONS.push(t)}))})}OpenAddUserModal(e){Tools.openModal("/public/modals","add-user-modal",e=>{const t=e.find("#sel_role");this._ROLES.forEach(e=>{t.append(`<option value='${e.id}'>${e.name}</option>`)})})}OpenAddRoleModal(e){Tools.openModal("/public/modals","add-role-modal",e=>{const t=e.find("#permissions-accordion");t.empty();const a={},s=[];this._PERMISSIONS.forEach(e=>{if(e.includes(".*")){const t=e.split(".");t.pop();const o=t.join(".");s.push(e),a[`${o}`]=[]}else{const t=e.split(".");t.pop();const s=t.join(".");a[`${s}`].push(e)}});for(const[e,s]of Object.entries(a)){const a=this.MakePermissionCategory(e,s);t.append(a)}})}MakePermissionCategory(e,t){const a=e.replace(".","-"),s=$("<div/>").addClass("accordion-item"),o=$("<h4/>").addClass("accordion-header").attr("id",`perm-${a}`);s.append(o);const n=$("<input/>").addClass("form-check-input perm-category-checkbox").attr("type","checkbox").attr("value",`${e}.*`).attr("id",`category-checkbox-${a}`);o.append(n);const r=$("<button/>").addClass("accordion-button collapsed").attr("type","button").attr("data-bs-toggle","collapse").attr("data-bs-target",`#perms-content-${a}`).attr("aria-expanded","false").attr("aria-controls",`perms-content-${a}`);o.append(r),r.append(` ${e}.*`);const c=$("<div/>").addClass("accordion-collapse collapse").attr("id",`perms-content-${a}`).attr("aria-labelledby",`perm-${a}`).attr("data-bs-parent","permissions-accordion");s.append(c);const l=$("<div/>").addClass("accordion-body");c.append(l);for(let e=0;e<t.length;e++){const a=t[e],s=a.replace(".","-"),o=$("<div/>").addClass("form-check");l.append(o);const n=$("<input/>").addClass("form-check-input perm-checkbox").attr("type","checkbox").attr("value",`${a}`).attr("id",`perm-${s}`);o.append(n);const r=$("<label/>").addClass("form-check-label").attr("for",`perm-${s}`);r.text(a),o.append(r)}return s}SelectCategoryCheckboxes(e){e.parent().parent().find(".perm-checkbox").prop("checked",e.prop("checked"))}CheckAllPermsChecked(e){const t=e.parent().parent().parent().parent();let a=!0;t.find(".perm-checkbox").each((e,t)=>{0==$(t).prop("checked")&&(a=!1)}),a?t.find(".perm-category-checkbox").prop("checked",!0):t.find(".perm-category-checkbox").prop("checked",!1)}SubmitAddUser(){const e={username:$("#inp_username").val(),roleid:$("#sel_role").val()};API_Proxy.postData("admin/adduser",e).then(e=>{console.log(e)}).catch(e=>{console.log(e)})}SubmitAddRole(){const e=$("#inp_rolename");if(""==e.val())return e.addClass("is-invalid"),void e.parent().parent().addClass("has-danger");e.removeClass("is-invalid"),e.parent().parent().removeClass("has-danger");var t=[];$("#permissions-accordion input:checked").each(function(){t.push($(this).val())});const a=[];for(let e=0;e<t.length;e++){const s=t[e];if(0==s.includes("*")){const e=s.split(".");e.pop();const o=e.join(".");0==t.includes(`${o}.*`)&&a.push(s)}else a.push(s)}console.log(a)}}const page=new Page_Users;module.exports=page;

},{"../Mrhid6Utils/lib/tools":5,"./api_proxy":6}]},{},[7]);
