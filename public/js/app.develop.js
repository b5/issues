(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],4:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher')
	, ServerConstants = require('../constants/ServerConstants')
	, ScreenConstants = require('../constants/ScreenConstants')
	, SessionStore = require('../stores/SessionStore')
	, DefaultPageOptions = require('../utils/DefaultPageOptions')
	, _ = require('underscore');

var ScreenActions = {
	fetch : function (id) {
		if (!_.isString(id)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : ScreenConstants.SCREEN_FETCH,
			requestType : ServerConstants.GET,
			url : "/api/screens/" + id
		});

		return true;
	},
	create : function () {
		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_CREATE
		});
	},
	save : function (screen) {
		if (!_.isObject(screen)) { return false; }

		// if ths screen has a cid, remove it
		if (screen.id.indexOf("screen") > -1) {
			screen.id == 0;
		}

		// AppDispatcher.handleServerAction({
		// 	actionType : ScreenConstants.SCREEN_SAVE,
		// 	requestType : (screen.id) ? ServerConstants.PUT : ServerConstants.POST,
		// 	url : (screen.id) ? '/api/screens/' + screen.id : '/api/screens',
		// 	data : screen
		// });

		return true;
	},
	update : function (screen) {
		if (!_.isObject(screen)) { return false; }
		// prep(screen);
		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_UPDATE,
			model : screen
		});

		return true;
	},
	del : function (id) {
		if (!id) { 
			return false;
		}
		AppDispatcher.handleServerAction({
			actionType : ScreenConstants.SCREEN_DELETE,
			requestType : ServerConstants.DELETE,
			url : '/api/screens/' + id,
			id : id
		});

		return true;
	},

	// issue actions
	addIssue : function (id) {
		if (!_.isString(id)) { return false; }

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_ADD_ISSUE,
			id : id
		});

		return true;
	},
	removeIssue : function (id, index) {

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_REMOVE_ISSUE,
			id : id,
			index : index
		});

		return true;
	},
	updateIssue : function (id, index, issue) {
		if (!_.isString(id) || !_.isObject(issue)) { return false; }

		AppDispatcher.handleViewAction({
			actionType : ScreenConstants.SCREEN_UPDATE_ISSUE,
			id : id,
			index : index,
			issue : issue
		});

		return true;
	},

	// routing actions
	toNew : function (role) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) + "/screens/new", { trigger : true });
	},
	toScreen : function (role, id) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) + "/screens/" + id, { trigger : true });
	},
	toScreens : function (role) {
		if (!_.isObject(role)) { return false; }
		window.router.navigate("/agency/" + role.agencySlug + "/" + roleName(role.roleType) +"/screens", { trigger : true });
	},
}

module.exports = ScreenActions;
},{"../constants/ScreenConstants":7,"../constants/ServerConstants":8,"../dispatcher/AppDispatcher":10,"../stores/SessionStore":14,"../utils/DefaultPageOptions":16,"underscore":3}],5:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher');

var ServerConstants = require('../constants/ServerConstants')
	, SessionConstants = require('../constants/SessionConstants');

var _ = require('underscore');

var SessionActions = {
	update : function (attrs) {
		if (!_.isObject(attrs)) { return false;}

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_UPDATE_ACCOUNT,
			requestType : ServerConstants.PUT,
			url : '/api/users/' + attrs.id,
			data : attrs
		});
		
		SessionActions.toHome()
		return true;
	},
	login : function (email, password) {
		if (!_.isString(email) || !_.isString(password)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_LOGIN,
			requestType : ServerConstants.POST,
			url : "/api/login",
			data : {
				"email" : email,
				"password" : password
			}
		});

		return true;
	},
	logout : function () {
		// simply navigating to logout will log the
		// account out.
		window.location.href = "/logout";
	},
	setPassword : function (password, repeat) {
		if (!password || !repeat) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_SET_PASSWORD,
			requestType : ServerConstants.PUT,
			url : "/api/me/setpassword",
			data : {
				password : password,
				repeat : repeat
			}
		});

		return true;
	},

	setCurrentRole : function (role) {
		if (!_.isObject(role)) { return false; }
		AppDispatcher.handleViewAction({
			actionType : SessionConstants.SESSION_SET_CURRENT_ROLE,
			role : role
		});

		return true;
	},

	setRoles : function (roles) {
		if (!_.isArray(roles)) { return false; }

		AppDispatcher.handleServerAction({
			actionType : SessionConstants.SESSION_SET_ROLES,
			requestType : ServerConstants.PUT,
			url : "/api/me/roles",
			data : roles
		});

		return true;
	},

	// routing
	logout : function () {
		window.location.href = "/logout";
		// window.router.navigate('/logout',  { trigger : true });
	},
	toHome : function () {
		window.router.navigate("/", { trigger : true });
	}
}

module.exports = SessionActions;
},{"../constants/ServerConstants":8,"../constants/SessionConstants":9,"../dispatcher/AppDispatcher":10,"underscore":3}],6:[function(require,module,exports){
var Router = require('./router/Router')
	, Navbar = require('./views/Navbar');

var AppDispatcher = require('./dispatcher/AppDispatcher')
	, SessionConstants = require('./constants/SessionConstants');

(function ($){

	// Hell yes we want touch events
	React.initializeTouchEvents(true);

	if (window.data) {
		// Bootstrap stores with window.data object.
		// See individual stores "SESSION_LOGIN"
		// handler for more.
		if (window.data.user) {
			AppDispatcher.dispatch({
				type : "SERVER_ACTION",
				action : {
					actionType : SessionConstants.SESSION_LOGIN,
					response : window.data
				}
			});
		}
	}
	
	// Activate Backbone Router, loading the first view
	Backbone.history.start({ pushState: true, root : "" });
})(jQuery);
},{"./constants/SessionConstants":9,"./dispatcher/AppDispatcher":10,"./router/Router":11,"./views/Navbar":22}],7:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror')

module.exports = keyMirror({
	SCREEN_FETCH_ALL : null,
	SCREEN_FETCH : null,
	SCREEN_CREATE : null,
	SCREEN_SAVE : null,
	SCREEN_UPDATE : null,
	SCREEN_DELETE : null,

	SCREEN_ADD_ISSUE : null,
	SCREEN_UPDATE_ISSUE : null,
	SCREEN_REMOVE_ISSUE : null,
});

},{"react/lib/keyMirror":55}],8:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror');

module.exports = keyMirror({
	GET : null,
	PUT : null,
	POST : null,
	DELETE : null,
	OPTIONS : null
});
},{"react/lib/keyMirror":55}],9:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror')

module.exports = keyMirror({
	SESSION_LOGIN : null,
	SESSION_LOGOUT : null,
	
	SESSION_SET_PASSWORD : null,
	SESSION_UPDATE_ACCOUNT : null,
	SESSION_DELETE_ACCOUNT : null,

	SESSION_SET_CURRENT_ROLE : null,
	SESSION_SET_ROLES : null,
});

},{"react/lib/keyMirror":55}],10:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * AppDispatcher
 *
 * A singleton that operates as the central hub for application updates.
 */

var Dispatcher = require('ff-react/dispatcher/Dispatcher');


var AppDispatcher = _.extend(Dispatcher.prototype, {
  
});


module.exports = AppDispatcher;

},{"ff-react/dispatcher/Dispatcher":38}],11:[function(require,module,exports){
var App = require('../views/App')
	, Login = require('../views/Login')
	, Screens = require('../views/Screens')
	, Screen = require('../views/Screen')
	, Issue = require('../views/Issue')

var SessionStore = require('../stores/SessionStore')

var currentView = undefined
	, _appView = undefined;


function changeView (view, options) {
	var main = document.getElementById('app');
	React.unmountComponentAtNode(main)
	currentView = React.createElement(view, options || {});
	React.render(currentView, main);
}

function AppView (component, options) {
	options || (options = {})
	var main = document.getElementById('app');

	options.element = component;

	_appView = React.createElement(App, options);
	React.unmountComponentAtNode(main)

	React.render(_appView, main)
}

var Router = Backbone.Router.extend({
	routes : {
		"" : "screens",
		"screens" : "screens",
		"screens/:id" : "screen",
		"screens/:id/:issueNum" : "issue",
		"login" : "login",
	},
	login : function () {
		var account = SessionStore.current();
		if (account) {
			if (account.id) {
				return window.router.navigate('/', { trigger : true });
			}
		}
		
		changeView(Login);
	},
	changePassword : function () {
		changeView(ChangePassword);
	},
	screens : function () {
		AppView(Screens);
	},
	screen : function (screenId) {
		AppView(Screen, { screenId : screenId });
	},
	issue : function (id, index) {
		AppView(Issue, { screenId : id, index : +index });
	}
});

module.exports = window.router = new Router();
},{"../stores/SessionStore":14,"../views/App":17,"../views/Issue":18,"../views/Login":21,"../views/Screen":23,"../views/Screens":25}],12:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"../stores/SessionStore":14,"../views/App":17,"../views/Issue":18,"../views/Login":21,"../views/Screen":23,"../views/Screens":25,"dup":11}],13:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher')
  , ScreenConstants = require('../constants/ScreenConstants')
  , SessionConstants = require('../constants/SessionConstants')
  , Store = require('./Store')
	, _ = require('underscore');


var agenciesThatHaveFetchedAllScreens = {}

var ScreenStore = Store.extend({
  // check to see weather a model is valid.
  // call syncronously for simple true / false, 
  // or provide a callback for error reporting.
  // @param model {object} - the model to validate
  // @param cb {function} - optional callback for errors
  // @return true if valid, error if not
  valid : function (model, cb) {
    var errors = [];

    // all models must be objects
    if (!_.isObject(model)) {
      errors.push("model must be an object");
      if (_.isFunction(cb)) {
        cb(errors);
      }
      return false;
    }

    // must have either an id or cid property
    if (!model.id && !model.cid) { 
      errors.push("model must have an id or cid property");
    }

    if (model.issues) {
      model.issues = _.sortBy(model.issues, function(r){ return r.index; });
    } else {
      model.issues = []
    }

    if (_.isFunction(cb)) {
      cb(errors);
    }
    return (errors.length === 0);
  },

  // create a new screen
  // @return {object} - new screen
  newScreen : function () {
    var screen = {
      id : _.uniqueId("screen-"),
      name : "",
      endpoint : "",
      description : "",
      issues : []
    };
    
    return _.clone(screen);
  },

  // add a issue to a screen
  // @param id {string | object} - the id/cid of the screen
  // @return {object|undefined} - the updated screen object, undefined if not found
  addIssue : function (id) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues || (screen.issues = [])
    
    screen.issues.push({
      cid : _.uniqueId('issue-'),
      name : "",
      description : "",
      completed : false,
      difficulty : 0
    });


    return _.clone(screen);
  },

  // update an existing issue for a screen
  // @param id {string} - the id/cid of the screen
  // @param issue {object} - the issue object to update
  // @return {object|undefined} - the updated screen object, undefined if not found
  updateIssue : function (id, index, issue) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues[index] = issue;
    return _.clone(screen);
  },

  // remove a issue from a screen
  // @param id {string} - the id/cid of the screen
  // @param index {object} - the index to remove
  // @return {object|undefined} - the updated screen object, undefined if not found
  removeIssue : function (id, index) {
    var screen = this._one(id);
    if (!screen) { return undefined; }
    screen.issues.splice(index,1);
    return _.clone(screen);
  },
  hasFetchedAllAgencyScreens : function (agencyId) {
    return agenciesThatHaveFetchedAllScreens[agencyId] ? true : false;
  }
})

// Turn ScreenStore into a singleton.
ScreenStore = new ScreenStore();
if (window.data) {
  ScreenStore.add(window.data.screens);
}


AppDispatcher.register(function (payload){
	var action = payload.action;

	switch (action.actionType) {
    case ScreenConstants.SCREEN_FETCH_PAGE : 
      if (action.response) {
        ScreenStore.add(action.response);
        ScreenStore.addPagination(action);
        ScreenStore.emitChange();
      } else if (action.error) {
        ScreenStore.emitError(action);
      }
      break;
    case ScreenConstants.SCREEN_FETCH :
      if (action.response) {
        ScreenStore.add(action.response);
        ScreenStore.emitChange();
      } else if (action.error) {
        ScreenStore.emitError(action);
      }    
      break;
    case ScreenConstants.SCREEN_CREATE:
      ScreenStore.add(ScreenStore.newScreen());
      ScreenStore.emitChange();
      break;
		case ScreenConstants.SCREEN_SAVE :
			if (action.response) {
        if (action.data) {
          if (action.data.cid) {
            ScreenStore.remove(action.data.cid);
          }
        }
        ScreenStore.add(action.response);
				ScreenStore.emitChange(action);
			} else if (action.error) {
				ScreenStore.emitError(action);
			}
			break;
		case ScreenConstants.SCREEN_UPDATE :
      if (ScreenStore.update(action.model || action.data)) {
        ScreenStore.emitChange();
      }
			break;
		case ScreenConstants.SCREEN_DELETE:
			if (action.response) {
				ScreenStore.remove(action.id);
        ScreenStore.emitChange(action);
        ScreenStore.emitMessage('Screen Removed');
			} else if (action.error) {
				ScreenStore.emitError(action);
			}
			break;
      
    // Issue Handling
    case ScreenConstants.SCREEN_ADD_ISSUE:
      ScreenStore.addIssue(action.id);
      ScreenStore.emitChange();
      break;
    case ScreenConstants.SCREEN_UPDATE_ISSUE:
      if (ScreenStore.updateIssue(action.id, action.index, action.issue) !== undefined) {
        ScreenStore.emitChange();
      }
      break;
    case ScreenConstants.SCREEN_REMOVE_ISSUE:
      if (ScreenStore.removeIssue(action.id, action.index) !== undefined) {
        ScreenStore.emitChange();
      }
      break;

    // Screen Model Fetching
    case ScreenConstants.SCREEN_FETCH_MODELS_PAGE:
      if (action.response) {
        ScreenStore.addModels(action.id, action.response);
        ScreenStore.addPagination(action);
        ScreenStore.emitChange();
      }
      break;
    // Login Handling
    case SessionConstants.SESSION_LOGIN:
      if (action.response) {
        ScreenStore.add(action.response.screens);
      }
      break;
  }

	return true;
});

module.exports = ScreenStore;
},{"../constants/ScreenConstants":7,"../constants/SessionConstants":9,"../dispatcher/AppDispatcher":10,"./Store":15,"underscore":3}],14:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher')
	, SessionConstants = require('../constants/SessionConstants')
  , Store  = require('./Store')
  , _ = require('underscore');

var roleOrder = {
  "model" : 0,
  "booker" : 1,
  "accountant" : 2,
  "manager" : 3,
  "admin" : 4
};

var _current;

function login(user) {
  _current = user;
  SessionStore.emitChange();
}

var SessionStore = Store.extend({
  // get the currently logged in user, if any
  // @return {object|undefined}
  current : function () {
    return _current;
  },
  
  // checks to see if a password is valid
  // @param password {string} - the user-entered password 
  // @param repeat {string} - the user-entered confirmation
  // @param cb {func} - optional callback func that will return an array of errors
  // @return {bool} - weather the passwords are valid or not
  validPassword : function (password, repeat, cb) {
    var errors = [];
    if (!_.isString(password) || password === "") {
      errors.push("password field is required");
    }
    if (!_.isString(repeat) || repeat === "") {
      errors.push("please confirm your password by entering it again into the repeat field");
    }
    if (password.length < 7) { 
      errors.push("password must be at least 7 characters long");
    }
    if (!/\d+/g.test(password)) {
      errors.push("password must contain at least one number");
    }
    if (password !== repeat) { errors.push("passwords do not match"); }
    if (typeof cb === "function") {
      cb(errors);
    }
    return (errors.length === 0);
  }
});

// turn SessionStore into a singleton
SessionStore = new SessionStore();

AppDispatcher.register(function (payload){
	var action = payload.action;

	switch (action.actionType) {
    // Current Account Actions
    case SessionConstants.SESSION_LOGIN :
      if (action.response) {
        login(action.response.user);
        SessionStore.emitChange();
      } else if (action.error) {
        SessionStore.emitError(action);
      }
      break;
		case SessionConstants.SESSION_UPDATE_ACCOUNT :
			if (action.response) {
        _current = action.response;
				SessionStore.emitChange();
			} else if (action.error) {
				SessionStore.emitError(action);
			}
			break;
    case SessionConstants.SESSION_SET_PASSWORD:
      if (action.response) {
        if (window.data) {
          // clear the setPassword flag to make the app behave
          // normally
          window.data.setPassword = undefined;
        }
        SessionStore.emitChange(action);
      } else if (action.error) {
        SessionStore.emitError(action);
      }
      break;
    case SessionConstants.SESSION_SET_CURRENT_ROLE:
      if (action.role) {
        if (SessionStore.setCurrentRole(action.role)) {
          SessionStore.emitChange();
        }
      }
      break;
    case SessionConstants.SESSION_SAVE :
      break;
  }

	return true;
});

module.exports = SessionStore;
},{"../constants/SessionConstants":9,"../dispatcher/AppDispatcher":10,"./Store":15,"underscore":3}],15:[function(require,module,exports){
var StandardStore = require('ff-react/stores/StandardStore')
	, _ = require('underscore')
	, DefaultPageOptions = require('../utils/DefaultPageOptions');

/*
 * BaseStore is the basic store that all standard
 * stores can inherit from.
 */
var Store = StandardStore.extend({
	// pagination stores information on paging through
	// an action that fetches multiple models.
	// the array should be a list of all pages that have been fetched
	// pagination : {
	//	ACTION_TYPE : {
	//		"created" : [1]
	// 	},
	//	PARENT_ACTION_TYPE : {
	// 		"id_string.created" : [1,3,4,5,6,7]
	// 	}
	// }
	pagination : {},

	// internal method for adding pagination from an action
	// @param action {object} - the action object (should be fed in after a confirmed response)
	addPagination : function (action) {
		var actionId;
		if (action && action.actionType && action.data && action.response) {
			this.pagination[action.actionType] || (this.pagination[action.actionType] = {})
			actionId = (action.data.parentId) ? action.data.parentId + "." + action.data.list : action.data.list;

			if (this.pagination[action.actionType][actionId]) {
				this.pagination[action.actionType][actionId].push(action.data.page);
			} else {
				this.pagination[action.actionType][actionId] = [action.data.page];
			}

			// if we've hit the end of the list, add false to the array to signify as much
			if (!action.response.length) {
				this.pagination[action.actionType][actionId].push(false);
			}
		}
	},

	// nextPage gives the next page in a sequence for a given actionType & param combination
	// @param actionType {string} - a contstant representing the action
	// @param options - the pagination options object, should include a "list" property
	// @return number - the page number to return, 0 if we've fetched all pages
	nextPage : function (actionType, options) {
		var nextPage = 1, actionId, list;

		options = DefaultPageOptions(options);

		if (!this.pagination[actionType] || typeof options != "object") {
			return nextPage;
		}

		actionId = (options.parentId) ? options.parentId + "." + options.list : options.list;
		list = this.pagination[actionType][actionId];
		nextPage = list[list.length - 1];

		if (!nextPage) {
			return false;
		} else {
			nextPage++;
		}

		return nextPage; 
	},

	prevPage : function (actionType, options) {
		var prevPage = 0, actionId;
		if (!this.pagination.actionType || typeof options != "object") {
			return prevPage;
		}
		if (!options.list || !this.pagination[actionType]) {
			return prevPage;
		}

		actionId = (options.parentId) ? options.parentId + options.list : options.list;
		return this.pagination[actionType][actionId][0] - 1;
	},


});

module.exports = Store;
},{"../utils/DefaultPageOptions":16,"ff-react/stores/StandardStore":51,"underscore":3}],16:[function(require,module,exports){
module.exports = function (options) {
	options || (options = {})
	options.list || (options.list = "created")
	options.page || (options.page = 1)
	options.pageSize || (options.pageSize = 20)
	
	return options;
}
},{}],17:[function(require,module,exports){
/** @jsx React.DOM */

/*
 * All Views that are part of the "App" are build with this view.
 * It includes standard navigation & structure for all components.
 * Should be used by the router to show individual pages.
 */

var _ = require('underscore');

var Navbar = require('./Navbar')
	, Message = require('ff-react/components/Message')

var SessionStore = require('../stores/SessionStore')
	, ScreenStore = require('../stores/ScreenStore')
	, DeviceStore = require('ff-react/stores/DeviceStore');

var stores = [ScreenStore];

var App = React.createClass({displayName: "App",
	propTypes : {
		// The component to display in the app's main window
		element : React.PropTypes.func.isRequired,
		messageDelayTime : React.PropTypes.number,
	},
	// Lifecycle
	componentDidMount : function () {
		var self = this;
		stores.forEach(function(store, i){
			store.onError(self.onError);
			store.onMessage(self.onMessage);
		});

	},
	componentWillUnmount : function () {
		var self = this;
		stores.forEach(function(store, i){
			store.offError(self.onError);
			store.offMessage(self.onMessage);
		});
	},
	getDefaultProps : function () {
		return {
			messageDelayTime : 8000
		}
	},
	getInitialState : function () {
		return {
			error : undefined,
			message : undefined,
		}
	},

	// Methods
	removeMessage : function () {
		if (this.isMounted()) {
			this.setState({ message : undefined, error : undefined });
		}
	},

	// Event Handlers
	onToggleMainMenu : function (e) {
		e.stopPropagation();
		this.setState({ showingMainMenu : !this.state.showingMainMenu });
	},
	onError : function (action) {
		this.setState({ message : undefined, error : action.error });
		setTimeout(this.removeMessage, this.props.messageDelayTime);
	},
	onMessage : function (msg) {
		this.setState({ message : msg, error : undefined });
		setTimeout(this.removeMessage, this.props.messageDelayTime);
	},
	onMenuSelect : function (e) {
		this.setState({ showingMainMenu : false });
	},
	onClickStage : function (e) {
		if (this.isMounted()) {
			// auto-hide menu if a click bubbles to html
			if (this.state.showingMainMenu === true) {
				this.setState({ showingMainMenu : false });
			}
		}
	},
	onScrollStage : function (e) {
		// here we manually call emitScroll with the stage's scrolling event
		// b/c our window never scrolls.
		// Stage is the width & height of the viewport,
		// so we need to listen to it's scrolling instead
		DeviceStore._emitScroll(e);
	},

	// Render
	render : function () {
		var role
			, user = SessionStore.current();

		// if we're fed an agencySlug prop we know that
		// we're operating within the context of an agency
		// and should feed navbar the current role
		if (this.props.agencySlug) {
			role = this.props.role || SessionStore.currentRole();
		}

		return (
			React.createElement("div", {id: "ivy"}, 
				React.createElement("div", {id: "stage", onClick: this.onClickStage, onScroll: this.onScrollStage}, 
					React.createElement(Navbar, {role: role, onToggleMainMenu: this.onToggleMainMenu, message: this.state.message, error: this.state.error}), 
					React.createElement(this.props.element, React.__spread({},  this.props))
				)
			)
		);
	}
});

module.exports = App;
},{"../stores/ScreenStore":13,"../stores/SessionStore":14,"./Navbar":22,"ff-react/components/Message":29,"ff-react/stores/DeviceStore":50,"underscore":3}],18:[function(require,module,exports){

var ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions');

var Issue = React.createClass({displayName: "Issue",
	propTypes : {
		id : React.PropTypes.string.isRequired,
		index : React.PropTypes.number.isRequired
	},

	// render
	render : function () {
		var issue = this.props.data
		return (
			React.createElement("h3", null, this.props.issue)
		);
	}
});

module.exports = Issue;
},{"../actions/ScreenActions":4,"../stores/ScreenStore":13}],19:[function(require,module,exports){

var ScreenActions = require('../actions/ScreenActions');

var TouchAnchor = require('ff-react/components/TouchAnchor')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchTextarea = require('ff-react/components/TouchTextarea')
	, TouchCheckbox = require('ff-react/components/TouchCheckbox');


var IssueItem = React.createClass({displayName: "IssueItem",

	// Component Liecycle
	getDefaultProps : function () {
		return {
			yTouchThreshold : 5,
			size : "standard"
		}
	},
	
	// Event Handlers
	onDelete : function () {
		ScreenActions.removeIssue(this.props.screenId, this.props.index);
	},
	onSelect : function () {
		if (this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}
	},
	onValueChange : function (value, name) {
		var issue = this.props.data;
		
		if (name === "difficulty") {
			value = +value;
		}

		issue[name] = value;
		ScreenActions.updateIssue(this.props.screenId, this.props.index, issue);
	},

	render : function () {
		var issue = this.props.data || {}
			, className = issue.completed ? "completed item span10" : "item span10";

		return (
			React.createElement("div", {className: className}, 
				React.createElement(TouchCheckbox, {name: "completed", className: "completed", value: issue.completed, onValueChange: this.onValueChange}), 
				React.createElement(TouchInput, {name: "name", className: "name", placeholder: "name", value: issue.name, onValueChange: this.onValueChange}), 
				React.createElement(TouchInput, {name: "difficulty", className: "difficulty", value: issue.difficulty, onValueChange: this.onValueChange}), 
				React.createElement(TouchAnchor, {className: "ss-icon right trash", onClick: this.onDelete, text: "trash"}), 
				React.createElement("div", {className: "clear"}), 
				React.createElement(TouchTextarea, {name: "description", className: "description", value: issue.description, onValueChange: this.onValueChange})
			)
		);
	}
});

module.exports = IssueItem;
},{"../actions/ScreenActions":4,"ff-react/components/TouchAnchor":31,"ff-react/components/TouchCheckbox":33,"ff-react/components/TouchInput":34,"ff-react/components/TouchTextarea":35}],20:[function(require,module,exports){

var ScreenActions = require('../actions/ScreenActions');

var IssueItem = require('./IssueItem')
var List = require('ff-react/components/List')

var TouchAnchor = require("ff-react/components/TouchAnchor")

var Issues = React.createClass({displayName: "Issues",
	propTypes : {
		screenId : React.PropTypes.string.isRequired,
		data : React.PropTypes.array.isRequired
	},

	// event handlers
	onSelectIssue : function (issue, index) {
		window.navigator.navigate("/screens/" + this.props.screenId + "/" + index, { trigger : true });
	},
	onAddIssue : function () {
		ScreenActions.addIssue(this.props.screenId);
	},

	// render
	render : function () {
		return (
			React.createElement("div", {className: "issues"}, 
				React.createElement("div", {className: "row span10"}, 
					React.createElement(TouchAnchor, {className: "ss-icon right", onClick: this.onAddIssue, text: "plus"}), 
					React.createElement("h4", null, "Issues")
				), 
				React.createElement(List, {data: this.props.data, screenId: this.props.screenId, element: IssueItem, onSelectItem: this.onSelectIssue, noItemsString: "No Issues"}), 
				React.createElement("div", {className: "clear"})
			)
		);
	}
});

module.exports = Issues;
},{"../actions/ScreenActions":4,"./IssueItem":19,"ff-react/components/List":27,"ff-react/components/TouchAnchor":31}],21:[function(require,module,exports){
/** @jsx React.DOM */

/*
 * Basic Login Component.
 */

var SessionActions = require('../actions/SessionActions')
	, SessionStore = require('../stores/SessionStore');

var Message = require('ff-react/components/message')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchButton = require('ff-react/components/TouchButton')
	, LoadingTouchButton = require('ff-react/components/LoadingTouchButton');


var Login = React.createClass({displayName: "Login",
	// Component lifecycle methods
	componentDidMount : function () {
		this.redirectIfLoggedIn();
		SessionStore.onChange(this.redirectIfLoggedIn);
		SessionStore.onError(this.onStoreError);
	},
	componentWillUnmount : function () {
		SessionStore.offChange(this.redirectIfLoggedIn);
		SessionStore.offError(this.onStoreError);
	},
	getInitialState : function () {
		return {
			error : undefined,
			loading : false,
			loggedIn : false
		}
	},

	// Methods
	redirectIfLoggedIn : function () {
		var account = SessionStore.current()
		if (account) {
			// double check to make sure we're *actually* logged in
			if (account.id) {
				if (this.state.loading) {
					this.setState({ loading : false, loggedIn : true });
					setTimeout(SessionActions.toHome, 600);
				} else if (!this.state.loggedIn) {
					// ensuring a state of loggedIn : false  will prevent 
					// additional calls from triggering toHome too early
					SessionActions.toHome();
				}
			}
		}
	},

	// Event Handlers
	onStoreError : function (action) {
		var message
		if (action.error) {
			message = action.error.message
		}
		this.setState({ error : message, loading : false });
	},
	onSubmit : function (e) {
		e.preventDefault();

		var email = this.refs["email"].getDOMNode().value
			, password = this.refs["password"].getDOMNode().value;
		
		SessionActions.login(email, password);
		this.setState({ error : undefined, loading : true });
	},

	// Render
	render : function () {
		var error
			, className = "login small form";
		
		if (this.state.error) {
			error = React.createElement(Message, {message: this.state.error})
		}

		if (this.state.loggedIn) {
			className += " fadeOut";
		}

		return (
			React.createElement("div", {className: className}, 
				React.createElement("div", {id: "logo"}, React.createElement("img", {src: "/svg/logotype.svg"})), 
				React.createElement("form", {className: "login", onSubmit: this.onSubmit}, 
					React.createElement("h3", null, "Login:"), 
					error, 
					React.createElement(TouchInput, {ref: "email", type: "email", name: "email", placeholder: "email", autoCapitalize: "none"}), 
					React.createElement(TouchInput, {ref: "password", type: "password", name: "password", placeholder: "password"}), 
					React.createElement(LoadingTouchButton, {type: "submit", text: "Login", onClick: this.onSubmit, loading: this.state.loading}), 
					React.createElement("hr", null), 
					React.createElement("em", null, React.createElement("a", {href: "/login/forgot"}, "forgot password"))
				)
			)
		);
	}
});

module.exports = Login;
},{"../actions/SessionActions":5,"../stores/SessionStore":14,"ff-react/components/LoadingTouchButton":28,"ff-react/components/TouchButton":32,"ff-react/components/TouchInput":34,"ff-react/components/message":36}],22:[function(require,module,exports){
/** @jsx React.DOM */
/*
 * Navbar for the top of the screen
 */

var SessionActions = require('../actions/SessionActions');

var Message = require('ff-react/components/message')
	, TouchAnchor = require('ff-react/components/TouchAnchor');

var Navbar = React.createClass({displayName: "Navbar",
	propTypes : {
		// the current role of the session account
		role : React.PropTypes.object,
		message : React.PropTypes.string,
		error : React.PropTypes.oneOf(React.PropTypes.object, React.PropTypes.string),

		onToggleMainMenu : React.PropTypes.func.isRequired
	},
	
	// Factory Functions
	navigate : function (href) {
		return function(e) {
			e.preventDefault();
			window.router.navigate(href, { trigger : true });
		}
	},

	// Render
	render : function () {
		var error, message

		if (this.props.error) {
			error = React.createElement(Message, {message: (typeof this.props.error === "object") ? this.props.error.message : this.props.error})
		} else if (this.props.message) {
			message = React.createElement(Message, {message: this.props.message})
		}


		return (
			React.createElement("nav", {id: "navbar"}, 
				React.createElement("a", {id: "logo", onClick: this.navigate('/'), onTouchEnd: this.navigate('/'), className: "logo"}, 
					React.createElement("img", {src: "https://s3-us-west-2.amazonaws.com/ivymodels/svg/logotype.svg"})
				), 
				React.createElement("div", {className: "container"}, 
					React.createElement("div", {className: "items span8 offset1"}, 
						React.createElement(TouchAnchor, {onClick: this.navigate("/"), text: "screens"})
					)
				), 
				React.createElement("div", {className: "clear"}), 
				error, 
				message
			)
		);
	}
});

module.exports = Navbar;
},{"../actions/SessionActions":5,"ff-react/components/TouchAnchor":31,"ff-react/components/message":36}],23:[function(require,module,exports){

var ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions');

var Issues = require('./Issues');

var TouchAnchor = require('ff-react/components/TouchAnchor')
	, TouchInput = require('ff-react/components/TouchInput')
	, TouchTextarea = require('ff-react/components/TouchTextarea')
	, FourOhFour = require('ff-react/components/FourOhFour')

var Screen = React.createClass({displayName: "Screen",
	propTypes : {
		screenId : React.PropTypes.string.isRequired
	},

	// lifecycle
	getInitialState : function () {
		return {
			screen : ScreenStore.one(this.props.screenId) || {}
		};
	},
	componentDidMount : function () {
		ScreenStore.onChange(this.onStoreChange);
	},
	componentWillUnmount : function () {
		ScreenStore.offChange(this.onStoreChange);
	},

	// event handlers
	onStoreChange : function () {
		this.setState({ screen : ScreenStore.one(this.props.screenId) });
	},
	onValueChange : function (value, name) {
		var screen = this.state.screen;
		screen[name] = value;
		ScreenActions.update(screen);
	},
	onSave : function () {
		ScreenActions.save(this.state.screen);
	},

	// render
	render : function () {
		var screen = this.state.screen;

		if (!screen) {
			return (
				React.createElement("div", {id: "page", className: "screen container"}, 
					React.createElement(FourOhFour, null)
				)
			);
		}

		return (
			React.createElement("div", {id: "page", className: "screen container"}, 
				React.createElement("div", {className: "row span10"}, 
					React.createElement(TouchAnchor, {className: "ss-icon right", onClick: this.onSave, text: "save"}), 
					React.createElement(TouchInput, {name: "name", placeholder: "name", className: "name", value: screen.name, onValueChange: this.onValueChange}), 
					React.createElement(TouchInput, {name: "endpoint", placeholder: "endpoint", className: "endpoint", value: screen.endpoint, onValueChange: this.onValueChange}), 
					React.createElement(TouchTextarea, {name: "description", className: "description", placeholder: "description", value: screen.description, onValueChange: this.onValueChange})
				), 
				React.createElement("div", {className: "clear"}), 
				React.createElement(Issues, {screenId: screen.id, data: screen.issues})
			)
		);
	}
});

module.exports = Screen;
},{"../actions/ScreenActions":4,"../stores/ScreenStore":13,"./Issues":20,"ff-react/components/FourOhFour":26,"ff-react/components/TouchAnchor":31,"ff-react/components/TouchInput":34,"ff-react/components/TouchTextarea":35}],24:[function(require,module,exports){

function copyTouch (t) {
	return { identifier: t.identifier, pageX: t.pageX, pageY: t.pageY, screenX : t.screenX, screenY : t.screenY };
}


var ScreenItem = React.createClass({displayName: "ScreenItem",

	// event handlers
	// And now a little uglyness:
	startTouch : undefined,
	endTouch : undefined,

	// Component Liecycle
	getDefaultProps : function () {
		return {
			yTouchThreshold : 5,
			size : "standard"
		}
	},

	// Event Handlers
	onClick : function (e) {
		e.preventDefault();
		if (this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}
	},
	onTouchStart : function (e) {
		this.startTouch = copyTouch(e.touches[0]);
	},
	onTouchEnd : function (e) {
		this.endTouch = copyTouch(e.changedTouches[0]);

		// Only trigger toClient if not scrolling
		if (Math.abs(this.startTouch.pageY - this.endTouch.pageY) < this.props.yTouchThreshold && this.isMounted()) {
			// VoucherActions.toVoucher(this.props.role, this.props.data.id);
			this.props.onSelectItem(this.props.data, this.props.index);
		}

		this.startTouch = undefined;
		this.endTouch = undefined;
	},


	// render 
	render : function () {
		return (
			React.createElement("div", {className: "item", onTouchStart: this.onTouchStart, onTouchEnd: this.onTouchEnd, onClick: this.onClick}, 
				React.createElement("h3", null, this.props.data.name || "Untitled Screen")
			)
		);
	}
});

module.exports = ScreenItem;
},{}],25:[function(require,module,exports){
/** @jsx React.DOM */

var ScreenStore = require('../stores/ScreenStore')
	, ScreenActions = require('../actions/ScreenActions')

var ScreenItem = require('./ScreenItem');

var List = require('ff-react/components/List')
	, TouchAnchor = require('ff-react/components/TouchAnchor')

var Screens = React.createClass({displayName: "Screens",
	// lifecycle
	getInitialState : function () {
		return {
			screens : ScreenStore.all()
		}
	},
	componentDidMount : function () {
		ScreenStore.onChange(this.onStoreChange);
	},
	componentWillUnmount : function () {
		ScreenStore.offChange(this.onStoreChange);
	},

	// event handlers
	onStoreChange : function () {
		this.setState({ screens : ScreenStore.all() });
	},
	onSelectScreen : function (screen) {
		window.router.navigate("/screens/" + screen.id, { trigger : true });
	},
	onNewScreen : function () {
		ScreenActions.create();
	},

	// render 
	render : function () {
		return (
			React.createElement("div", {id: "page", className: "screens container"}, 
				React.createElement("div", {className: "row span10"}, 
					React.createElement(TouchAnchor, {className: "ss-icon right", onClick: this.onNewScreen, text: "add"}), 
					React.createElement("h1", null, "Screens")
				), 
				React.createElement(List, {data: this.state.screens, element: ScreenItem, noItemsString: "No Screens", onSelectItem: this.onSelectScreen})
			)
		);
	}
});

module.exports = Screens;
},{"../actions/ScreenActions":4,"../stores/ScreenStore":13,"./ScreenItem":24,"ff-react/components/List":27,"ff-react/components/TouchAnchor":31}],26:[function(require,module,exports){
/** @jsx React.DOM */

/* Standard Not-Found Component with a go-back button. */

var FourOhFour = React.createClass({displayName: "FourOhFour",
	propTypes : {
		message : React.PropTypes.string,
		title : React.PropTypes.string
	},

	// Component lifecycle methods
	getDefaultProps : function () {
		return {
			title : "Not Found",
			message : "We Couldn't find what you were looking for."
		}
	},

	// Methods
	goBack : function () {
		if (window.history) {
			window.history.back()
		}
	},

	// Render
	render : function () {
		return (
			React.createElement("div", {className: "fourOhFour"}, 
				React.createElement("h3", null, this.props.title), 
				React.createElement("p", null, this.props.message), 
				React.createElement("button", {onClick: this.reloadPage, onTouchEnd: this.goBack}, "Reload")
			)
		);
	}
});

module.exports = FourOhFour;
},{}],27:[function(require,module,exports){
/** @jsx React.DOM */

var DeviceStore = require("../stores/DeviceStore")
	, _ = require('underscore');

var Spinner = require('./Spinner');

var List = React.createClass({displayName: "List",
	propTypes : {
		className : React.PropTypes.string,
		data : React.PropTypes.array.isRequired,
		loading : React.PropTypes.bool,
		// Func to call when we need more rows, typically 
		// from scrolling down the screen
		onLoadMore : React.PropTypes.func,
		// should be a react element that we can iterate with
		element : React.PropTypes.func,
		// string to display when we have no items in the list
		noItemsString : React.PropTypes.string,
		// array of indexes to add "selected" class to.
		// for a single selection, pass in a single element array :)
		selected : React.PropTypes.array
	},

	// Lifecycle
	getDefaultProps : function() {
		return {
			className : "list",
			noItemsString : "No Items",
			data : [],
			selected : []
		}
	},
	componentDidMount : function () {
		DeviceStore.onScroll(this.onScroll);
	},
	componentWillUnmount : function () {
		DeviceStore.offScroll(this.onScroll);
	},

	// Event Handlers
	onScroll : function (e) {
		if (typeof this.props.onLoadMore == "function" && !this.props.loading && this.isMounted()) {
			var height = e.target.scrollHeight;

			// only call onLoadMore if we're in the bottom 85% of the page and scrolling down
			if ((e.target.scrollTop + e.target.offsetHeight) > (height * 0.85) && e.lastScrollY < e.target.scrollTop) {
				this.props.onLoadMore();
			}
		}
	},

	// Render
	render : function () {
		var items = [], loader, selected;

		if (this.props.data.length) {
			for (var i=0,m; m=this.props.data[i]; i++) {
				selected = false;
				for (var j=0; j < this.props.selected.length; j++) {
					if (i === this.props.selected[j]) { selected = true; break; }
				}
				items.push(React.createElement(this.props.element, React.__spread({},  this.props, {selected: selected, data: m, index: i, key: m.id || m.cid || i})));
			}
		} else if (!this.props.loading) {
			items = React.createElement("div", {className: "noItems"}, React.createElement("h4", {className: "text-center"}, this.props.noItemsString))
		}

		if (this.props.loading) {
			loader = React.createElement(Spinner, null)
		}

		return (
				React.createElement("div", {className: this.props.className}, 
					items, 
					loader
				)
			);
	}
});

module.exports = List;
},{"../stores/DeviceStore":50,"./Spinner":30,"underscore":49}],28:[function(require,module,exports){
/** @jsx React.DOM */

/*
	TouchButtons work in conjunction with utils/clickbuster
	to create native-like buttons in js. They circumnavigate
	the delayed "ghost click" problem.
*/

var clickbuster = require('../utils/clickbuster');

var startX, startY;

var LoadingTouchButton = React.createClass({displayName: "LoadingTouchButton",
	propTypes : {
		// the text label for the button
		text : React.PropTypes.string,
		moveThreshold : React.PropTypes.number,
		// unified click fn handler will also be called on touchEnd
		onClick : React.PropTypes.func.isRequired,
		// a delay (in ms) before the component will respond.
		// good for when ui is changing under a ghost click
		initialInputDelay : React.PropTypes.number,
		loading : React.PropTypes.bool
	},

	// lifecycle
	getDefaultProps : function () {
		return {
			className : "loadingTouchButton",
			text : "button",
			moveThreshold : 10,
			initialInputDelay : 500,
			loading : false
		}
	},
	componentDidMount : function () {
		this.mountTime = new Date().valueOf();
	},

	// Event Handlers
	onTouchStart : function (e) {
		e.stopPropagation();

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  this.getDOMNode().addEventListener('touchend', this.onTouchEnd, false);
	  document.body.addEventListener('touchmove', this.onTouchMove, false);

	  startX = e.touches[0].clientX;
	  startY = e.touches[0].clientY;
	},
	onTouchMove : function (e){
	  if (Math.abs(e.touches[0].clientX - startX) > this.props.moveThreshold ||
	      Math.abs(e.touches[0].clientY - startY) > this.props.moveThreshold) {
	    this.onReset(e);
	  }
	},
	onTouchEnd : function (e) {
		this.onClick(e);
	},
	onInput : function (e) {
		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	onReset : function (e) {
		this.getDOMNode().removeEventListener('touchend', this.onTouchEnd, false);
	  document.body.removeEventListener('touchmove', this.onTouchMove, false);
	},
	onClick : function (e) {
		e.stopPropagation();
	  this.onReset(e);

	  if (e.type == 'touchend') {
	    clickbuster.preventGhostClick(startX, startY);
	  }

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  if (typeof this.props.onClick === "function") {
	  	this.props.onClick(e);
	  }
	},

	// Render
	render : function () {
		return (
			React.createElement("button", React.__spread({},  this.props, {disabled: this.props.disabled || this.props.loading, onClick: this.onClick, onMouseDown: this.onInput, onTouchStart: this.onTouchStart}), 
				(this.props.loading) ? React.createElement("div", {className: "spinner"}, 
																	React.createElement("div", {className: "bounce1"}), 
																	React.createElement("div", {className: "bounce2"}), 
																	React.createElement("div", {className: "bounce3"})
																) : this.props.text
			)
		);
	}
});

module.exports = LoadingTouchButton;
},{"../utils/clickbuster":53}],29:[function(require,module,exports){
/** @jsx React.DOM */

/* Message Box Compnent */

var Message = React.createClass({displayName: "Message",
	propTypes : {
		message : React.PropTypes.string.isRequired,
	},

	// Component lifecycle methods
	getDefaultProps : function () {
		return {
			message : "We Couldn&#39;t find what you were looking for."
		}
	},

	// Render
	render : function () {
		return (
			React.createElement("div", {className: "message"}, 
				React.createElement("p", null, this.props.message)
			)
		);
	}
});

module.exports = Message;
},{}],30:[function(require,module,exports){
/** @jsx React.DOM */

// A simple Spinner

var Spinner = React.createClass({displayName: "Spinner",
	propTypes : {
		// none
	},

	// Render
	render : function () {
		return (
			React.createElement("div", {className: "spinner"}, 
				React.createElement("div", {className: "bounce1"}), 
				React.createElement("div", {className: "bounce2"}), 
				React.createElement("div", {className: "bounce3"})
			)
		);
	}
});

module.exports = Spinner;
},{}],31:[function(require,module,exports){
/** @jsx React.DOM */

/*
	TouchAnchor is TouchButton for anchor (<a>) tags.
*/

var clickbuster = require('../utils/clickbuster');

var startX, startY;

var TouchAnchor = React.createClass({displayName: "TouchAnchor",
	propTypes : {
		// the text label for the button
		text : React.PropTypes.string,
		moveThreshold : React.PropTypes.number,
		// unified click fn handler will also be called on touchEnd
		onClick : React.PropTypes.func.isRequired,
		// a delay (in ms) before the component will respond
		initialInputDelay : React.PropTypes.number
	},

	// lifecycle
	getDefaultProps : function () {
		return {
			text : "link",
			moveThreshold : 10,
			initialInputDelay : 200,
		}
	},
	componentDidMount : function () {
		this.mountTime = new Date().valueOf();
	},

	// Event Handlers
	onTouchStart : function (e) {
		e.stopPropagation();

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  this.getDOMNode().addEventListener('touchend', this.onTouchEnd, false);
	  document.body.addEventListener('touchmove', this.onTouchMove, false);

	  startX = e.touches[0].clientX;
	  startY = e.touches[0].clientY;
	},
	onTouchMove : function (e){
	  if (Math.abs(e.touches[0].clientX - startX) > this.props.moveThreshold ||
	      Math.abs(e.touches[0].clientY - startY) > this.props.moveThreshold) {
	    this.onReset(e);
	  }
	},
	onTouchEnd : function (e) {
		this.onClick(e);
	},
	onInput : function (e) {
		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	onReset : function (e) {
		this.getDOMNode().removeEventListener('touchend', this.onTouchEnd, false);
	  document.body.removeEventListener('touchmove', this.onTouchMove, false);
	},
	onClick : function (e) {
		e.stopPropagation();
	  this.onReset(e);

	  if (e.type == 'touchend') {
	    clickbuster.preventGhostClick(startX, startY);
	  }

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  if (typeof this.props.onClick === "function") {
	  	this.props.onClick(e);
	  }
	},

	// Render
	render : function () {
		return (
			React.createElement("a", React.__spread({},  this.props, {onClick: this.onClick, onMouseDown: this.onInput, onTouchStart: this.onTouchStart}), this.props.text)
		);
	}
});

module.exports = TouchAnchor;
},{"../utils/clickbuster":53}],32:[function(require,module,exports){
/** @jsx React.DOM */

/*
	TouchButtons work in conjunction with utils/clickbuster
	to create native-like buttons in js. They circumnavigate
	the delayed "ghost click" problem.
*/

var clickbuster = require('../utils/clickbuster');

var startX, startY;

var TouchButton = React.createClass({displayName: "TouchButton",
	propTypes : {
		// the text label for the button
		text : React.PropTypes.string,
		moveThreshold : React.PropTypes.number,
		// unified click fn handler will also be called on touchEnd
		onClick : React.PropTypes.func.isRequired,
		// a delay (in ms) before the component will respond.
		// good for when ui is changing under a ghost click
		initialInputDelay : React.PropTypes.number
	},

	// lifecycle
	getDefaultProps : function () {
		return {
			text : "button",
			moveThreshold : 10,
			initialInputDelay : 500,
		}
	},
	componentDidMount : function () {
		this.mountTime = new Date().valueOf();
	},

	// Event Handlers
	onTouchStart : function (e) {
		e.stopPropagation();

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  this.getDOMNode().addEventListener('touchend', this.onTouchEnd, false);
	  document.body.addEventListener('touchmove', this.onTouchMove, false);

	  startX = e.touches[0].clientX;
	  startY = e.touches[0].clientY;
	},
	onTouchMove : function (e){
	  if (Math.abs(e.touches[0].clientX - startX) > this.props.moveThreshold ||
	      Math.abs(e.touches[0].clientY - startY) > this.props.moveThreshold) {
	    this.onReset(e);
	  }
	},
	onTouchEnd : function (e) {
		this.onClick(e);
	},
	onInput : function (e) {
		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	onReset : function (e) {
		this.getDOMNode().removeEventListener('touchend', this.onTouchEnd, false);
	  document.body.removeEventListener('touchmove', this.onTouchMove, false);
	},
	onClick : function (e) {
		e.stopPropagation();
	  this.onReset(e);

	  if (e.type == 'touchend') {
	    clickbuster.preventGhostClick(startX, startY);
	  }

		// check too make sure input is after the specified delay
		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			return;
		}

	  if (typeof this.props.onClick === "function") {
	  	this.props.onClick(e);
	  }
	},

	// Render
	render : function () {
		var className = this.props.className;
		if (this.props.loading) {
			className + " loading";
		}

		return (
			React.createElement("button", React.__spread({},  this.props, {className: className, onClick: this.onClick, onMouseDown: this.onInput, onTouchStart: this.onTouchStart}), this.props.text)
		);
	}
});

module.exports = TouchButton;
},{"../utils/clickbuster":53}],33:[function(require,module,exports){
/** @jsx React.DOM */

var Checkbox = React.createClass({displayName: "Checkbox",
	propTypes : {
		label : React.PropTypes.string,
		name : React.PropTypes.string,
		onValueChange : React.PropTypes.func,
		onChange : React.PropTypes.func
	},

	// lifecycle
	getDefaultProps : function () {
		return {
			label : "",
			name : "Checkbox"
		}
	},

	// event handlers
	onChange : function (e) {
		var checked = e.target.checked
		if (typeof this.props.onChange === "function") {
			this.props.onChange(e);
		} else if (typeof this.props.onValueChange === "function") {
			this.props.onValueChange(checked, this.props.name);
		}
	},

	// render
	render : function () {
		return (
			React.createElement("div", {className: "checkbox"}, 
				React.createElement("input", {id: "cb-" + this.props.name, name: this.props.name, type: "checkbox", checked: this.props.value, onChange: this.onChange}), 
				React.createElement("label", {htmlFor: "cb-" + this.props.name}, React.createElement("span", {className: "box"}), React.createElement("span", null, this.props.label))
			)
		);
	}
});


module.exports = Checkbox;
},{}],34:[function(require,module,exports){
/** @jsx React.DOM */


// @stateful
var TouchInput = React.createClass({displayName: "TouchInput",
	propTypes : {
		// a delay (in ms) before the component will respond.
		// good for when ui is changing under a ghost click
		initialInputDelay : React.PropTypes.number,
		// gotta name yo fields
		name : React.PropTypes.string.isRequired,
		onChange : React.PropTypes.func,
		onValueChange : React.PropTypes.func,
	},

	// Lifecycle
	getDefaultProps : function () {
		return {
			initialInputDelay : 450,
			name : "touchInput"
		}
	},
	getInitialState : function () {
		return {
			readOnly : true
		}
	},
	componentDidMount : function () {
		var self = this;
		this.mountTime = new Date().valueOf();
		
		// here we set the field to readonly for the duration
		// of the initialInputDelay time. This prevents ghost
		// clicks from focusing the field (which would activate
		// the keyboard on touch devices)
		setTimeout(function () {
			self.setState({ readOnly : self.props.readOnly || false });
		}, this.props.initialInputDelay);
	},

	// Event Handlers
	onMouseDown : function (e) {

		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		if (typeof this.props.onMouseDown === "function") {
			this.props.onMouseDown(e);
		}
	},
	onChange : function (e) {
		if (typeof this.props.onValueChange === "function") {
			this.props.onValueChange(e.target.value, this.props.name);
		} else if (typeof this.props.onChange === "function") {
			this.props.onChange(e);
		}
	},

	render : function () {
		return (
			React.createElement("input", React.__spread({},  this.props, {readOnly: this.state.readOnly, onChange: this.onChange, onMouseDown: this.onMouseDown}))
		);
	}
});

module.exports = TouchInput;
},{}],35:[function(require,module,exports){
/** @jsx React.DOM */

var TouchTextarea = React.createClass({displayName: "TouchTextarea",
	propTypes : {
		// default height for the field
		defaultHeight : React.PropTypes.number,
		// you should probably name yo fields
		name : React.PropTypes.string.isRequired,
		// value of the field
		value : React.PropTypes.string.isRequired,
		// a delay (in ms) before the component will respond.
		// good for when ui is changing under a ghost click
		initialInputDelay : React.PropTypes.number,
		// if true, the textarea will automatically grow
		// to match the height of the text it contains
		autoGrow : React.PropTypes.bool,
		// Use either onChange, or onValueChange. Not both.
		// Raw change event
		onChange : React.PropTypes.func,
		// change handler in the form (value, name)
		onValueChange : React.PropTypes.func,
	},

	// Lifecycle
	getDefaultProps : function () {
		return {
			name : "textarea",
			initialInputDelay : 500,
			autoGrow : true,
			defaultHeight : 30,
		}
	},
	getInitialState : function () {
		return {
			height : 0
		}
	},
	componentDidMount : function () {
		this.mountTime = new Date().valueOf();
		this.setHeight();
	},
	componentDidUpdate : function () {
		this.setHeight();
	},

	// Methods
	setHeight : function () {
		var el = this.getDOMNode();
		if (this.props.autoGrow) {
			// set the height to 1px before rendering
			el.setAttribute('style', "height : 1px");
			var newHeight = el.scrollHeight + 1;

			if (newHeight != this.state.height) {
				this.setState({ height : newHeight });
			}

			el.setAttribute('style', "height : " + this.state.height + "px");
		}
	},

	// Event Handlers
	onChange : function (e) {
		var value = e.target.value;
		
		this.setHeight();

		if (typeof this.props.onChange === "function") {
			this.props.onChange(e);
		} else if (typeof this.props.onValueChange === "function") {
			this.props.onValueChange(value, this.props.name);
		}
	},
	onMouseDown : function (e) {

		if (new Date().valueOf() < (this.mountTime + this.props.initialInputDelay)) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		if (typeof this.props.onMouseDown === "function") {
			this.props.onMouseDown(e);
		}
	},

	// Render
	style : function () {
		return {
			height : (this.state.height || this.props.defaultHeight)
		}
	},

	render : function () {
		return (
			React.createElement("textarea", React.__spread({},  this.props, {style: this.style(), onChange: this.onChange, onMouseDown: this.onMouseDown, value: this.props.value}))
		);
	}
});

module.exports = TouchTextarea;
},{}],36:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],37:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror');

module.exports = keyMirror({
	DEVICE_SCROLL : null,
	DEVICE_RESIZE : null,
	DEVICE_RESIZE_END : null,
	DEVICE_ORIENTATION_CHANGE : null,

	DEVICE_KEYDOWN : null,
	DEVICE_KEYUP : null,
	
});
},{"react/lib/keyMirror":55}],38:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Dispatcher
 *
 * The Dispatcher is capable of registering callbacks and invoking them.
 * More robust implementations than this would include a way to order the
 * callbacks for dependent Stores, and to guarantee that no two stores
 * created circular dependencies.
 */

var Promise = require('es6-promise').Promise;
var _ = require('underscore');

var _callbacks = [];
var _promises = [];

var Dispatcher = function() {};
Dispatcher.prototype = _.extend(Dispatcher.prototype, {
  /**
   * Register a Store's callback so that it may be invoked by an action.
   * @param {function} callback The callback to be registered.
   * @return {number} The index of the callback within the _callbacks array.
   */
  register: function(callback) {
    _callbacks.push(callback);
    return _callbacks.length - 1; // index
  },

  /**
   * dispatch
   * @param  {object} payload The data from the action.
   */
  dispatch: function(payload) {
    // First create array of promises for callbacks to reference.
    var resolves = [];
    var rejects = [];
    _promises = _callbacks.map(function(_, i) {
      return new Promise(function(resolve, reject) {
        resolves[i] = resolve;
        rejects[i] = reject;
      });
    });
    // Dispatch to callbacks and resolve/reject promises.
    _callbacks.forEach(function(callback, i) {
      // Callback can return an obj, to resolve, or a promise, to chain.
      // See waitFor() for why this might be useful.
      Promise.resolve(callback(payload)).then(function() {
        resolves[i](payload);
      }, function() {
        rejects[i](new Error('Dispatcher callback unsuccessful'));
      });
    });
    _promises = [];
  },

  /**
   * Allows a store to wait for the registered callbacks of other stores
   * to get invoked before its own does.
   * This function is not used by this TodoMVC example application, but
   * it is very useful in a larger, more complex application.
   *
   * Example usage where StoreB waits for StoreA:
   *
   *   var StoreA = merge(EventEmitter.prototype, {
   *     // other methods omitted
   *
   *     dispatchIndex: Dispatcher.register(function(payload) {
   *       // switch statement with lots of cases
   *     })
   *   }
   *
   *   var StoreB = merge(EventEmitter.prototype, {
   *     // other methods omitted
   *
   *     dispatchIndex: Dispatcher.register(function(payload) {
   *       switch(payload.action.actionType) {
   *
   *         case MyConstants.FOO_ACTION:
   *           Dispatcher.waitFor([StoreA.dispatchIndex], function() {
   *             // Do stuff only after StoreA's callback returns.
   *           });
   *       }
   *     })
   *   }
   *
   * It should be noted that if StoreB waits for StoreA, and StoreA waits for
   * StoreB, a circular dependency will occur, but no error will be thrown.
   * A more robust Dispatcher would issue a warning in this scenario.
   */
  /**
   * @param {array} promiseIndexes
   * @param {function} callback
   */
  waitFor: function(promiseIndexes, callback) {
    var selectedPromises = promiseIndexes.map(function(index) {
      return _promises[index];
    });
    return Promise.all(selectedPromises).then(callback);
  },

  /**
   * A bridge function between the views and the dispatcher, marking the action
   * as a view action.  Another variant here could be handleServerAction.
   * @param  {object} action The data coming from the view.
   */
  handleViewAction: function(action) {
    this.dispatch({
      source: 'VIEW_ACTION',
      action: action
    });
  },

  parseServerResponse : function (r) { return r; },
  parseServerError : function (r) { return r; },
  handleServerAction : function(action) {
    var self = this
      , data = action.data;

    if (!action.url) { console.warn('server actions require a url param'); }
    if (!action.requestType) { console.warn('server actions require a type param, defaulting to GET request'); }
    
    if (action.requestType != "GET") {
      data = JSON.stringify(data);
    }
    
    $.ajax({
      dataType : "json",
      cache : false,
      async : true,
      url : action.url,
      type : action.requestType,
      data : data
    }).done(function (response){
      action.response = response.data;
      action.error = response.meta.error;
      action.pagination = response.pagination;
      self.dispatch({
        source : "SERVER_ACTION",
        action : action,
      });
    }).error(function (response){
      if (response.meta) {
        action.error = response.meta.error;
      } else {
        if (response.statusText) {
          action.error = { message : response.statusText };
        }
      }
      self.dispatch({
        source : "SERVER_ACTION",
        action : action
      });
    });
  }
});

module.exports = Dispatcher;
},{"es6-promise":39,"underscore":49}],39:[function(require,module,exports){
"use strict";
var Promise = require("./promise/promise").Promise;
var polyfill = require("./promise/polyfill").polyfill;
exports.Promise = Promise;
exports.polyfill = polyfill;
},{"./promise/polyfill":43,"./promise/promise":44}],40:[function(require,module,exports){
"use strict";
/* global toString */

var isArray = require("./utils").isArray;
var isFunction = require("./utils").isFunction;

/**
  Returns a promise that is fulfilled when all the given promises have been
  fulfilled, or rejected if any of them become rejected. The return promise
  is fulfilled with an array that gives all the values in the order they were
  passed in the `promises` array argument.

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.resolve(2);
  var promise3 = RSVP.resolve(3);
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `RSVP.all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.reject(new Error("2"));
  var promise3 = RSVP.reject(new Error("3"));
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @for RSVP
  @param {Array} promises
  @param {String} label
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
*/
function all(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to all.');
  }

  return new Promise(function(resolve, reject) {
    var results = [], remaining = promises.length,
    promise;

    if (remaining === 0) {
      resolve([]);
    }

    function resolver(index) {
      return function(value) {
        resolveAll(index, value);
      };
    }

    function resolveAll(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        resolve(results);
      }
    }

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && isFunction(promise.then)) {
        promise.then(resolver(i), reject);
      } else {
        resolveAll(i, promise);
      }
    }
  });
}

exports.all = all;
},{"./utils":48}],41:[function(require,module,exports){
(function (process,global){
"use strict";
var browserGlobal = (typeof window !== 'undefined') ? window : {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

// node
function useNextTick() {
  return function() {
    process.nextTick(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function useSetTimeout() {
  return function() {
    local.setTimeout(flush, 1);
  };
}

var queue = [];
function flush() {
  for (var i = 0; i < queue.length; i++) {
    var tuple = queue[i];
    var callback = tuple[0], arg = tuple[1];
    callback(arg);
  }
  queue = [];
}

var scheduleFlush;

// Decide what async method to use to triggering processing of queued callbacks:
if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else {
  scheduleFlush = useSetTimeout();
}

function asap(callback, arg) {
  var length = queue.push([callback, arg]);
  if (length === 1) {
    // If length is 1, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}

exports.asap = asap;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":2}],42:[function(require,module,exports){
"use strict";
var config = {
  instrument: false
};

function configure(name, value) {
  if (arguments.length === 2) {
    config[name] = value;
  } else {
    return config[name];
  }
}

exports.config = config;
exports.configure = configure;
},{}],43:[function(require,module,exports){
(function (global){
"use strict";
/*global self*/
var RSVPPromise = require("./promise").Promise;
var isFunction = require("./utils").isFunction;

function polyfill() {
  var local;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof window !== 'undefined' && window.document) {
    local = window;
  } else {
    local = self;
  }

  var es6PromiseSupport = 
    "Promise" in local &&
    // Some of these methods are missing from
    // Firefox/Chrome experimental implementations
    "resolve" in local.Promise &&
    "reject" in local.Promise &&
    "all" in local.Promise &&
    "race" in local.Promise &&
    // Older version of the spec had a resolver object
    // as the arg rather than a function
    (function() {
      var resolve;
      new local.Promise(function(r) { resolve = r; });
      return isFunction(resolve);
    }());

  if (!es6PromiseSupport) {
    local.Promise = RSVPPromise;
  }
}

exports.polyfill = polyfill;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./promise":44,"./utils":48}],44:[function(require,module,exports){
"use strict";
var config = require("./config").config;
var configure = require("./config").configure;
var objectOrFunction = require("./utils").objectOrFunction;
var isFunction = require("./utils").isFunction;
var now = require("./utils").now;
var all = require("./all").all;
var race = require("./race").race;
var staticResolve = require("./resolve").resolve;
var staticReject = require("./reject").reject;
var asap = require("./asap").asap;

var counter = 0;

config.async = asap; // default async is asap;

function Promise(resolver) {
  if (!isFunction(resolver)) {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  if (!(this instanceof Promise)) {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  this._subscribers = [];

  invokeResolver(resolver, this);
}

function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    try {
      value = callback(detail);
      succeeded = true;
    } catch(e) {
      failed = true;
      error = e;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (handleThenable(promise, value)) {
    return;
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    resolve(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

var PENDING   = void 0;
var SEALED    = 0;
var FULFILLED = 1;
var REJECTED  = 2;

function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;
}

function publish(promise, settled) {
  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    invokeCallback(settled, child, callback, detail);
  }

  promise._subscribers = null;
}

Promise.prototype = {
  constructor: Promise,

  _state: undefined,
  _detail: undefined,
  _subscribers: undefined,

  then: function(onFulfillment, onRejection) {
    var promise = this;

    var thenPromise = new this.constructor(function() {});

    if (this._state) {
      var callbacks = arguments;
      config.async(function invokePromiseCallback() {
        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
      });
    } else {
      subscribe(this, thenPromise, onFulfillment, onRejection);
    }

    return thenPromise;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = all;
Promise.race = race;
Promise.resolve = staticResolve;
Promise.reject = staticReject;

function handleThenable(promise, value) {
  var then = null,
  resolved;

  try {
    if (promise === value) {
      throw new TypeError("A promises callback cannot return that same promise.");
    }

    if (objectOrFunction(value)) {
      then = value.then;

      if (isFunction(then)) {
        then.call(value, function(val) {
          if (resolved) { return true; }
          resolved = true;

          if (value !== val) {
            resolve(promise, val);
          } else {
            fulfill(promise, val);
          }
        }, function(val) {
          if (resolved) { return true; }
          resolved = true;

          reject(promise, val);
        });

        return true;
      }
    }
  } catch (error) {
    if (resolved) { return true; }
    reject(promise, error);
    return true;
  }

  return false;
}

function resolve(promise, value) {
  if (promise === value) {
    fulfill(promise, value);
  } else if (!handleThenable(promise, value)) {
    fulfill(promise, value);
  }
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = value;

  config.async(publishFulfillment, promise);
}

function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = reason;

  config.async(publishRejection, promise);
}

function publishFulfillment(promise) {
  publish(promise, promise._state = FULFILLED);
}

function publishRejection(promise) {
  publish(promise, promise._state = REJECTED);
}

exports.Promise = Promise;
},{"./all":40,"./asap":41,"./config":42,"./race":45,"./reject":46,"./resolve":47,"./utils":48}],45:[function(require,module,exports){
"use strict";
/* global toString */
var isArray = require("./utils").isArray;

/**
  `RSVP.race` allows you to watch a series of promises and act as soon as the
  first promise given to the `promises` argument fulfills or rejects.

  Example:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 2");
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // result === "promise 2" because it was resolved before promise1
    // was resolved.
  });
  ```

  `RSVP.race` is deterministic in that only the state of the first completed
  promise matters. For example, even if other promises given to the `promises`
  array argument are resolved, but the first completed promise has become
  rejected before the other promises became fulfilled, the returned promise
  will become rejected:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error("promise 2"));
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // Code here never runs because there are rejected promises!
  }, function(reason){
    // reason.message === "promise2" because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  @method race
  @for RSVP
  @param {Array} promises array of promises to observe
  @param {String} label optional string for describing the promise returned.
  Useful for tooling.
  @return {Promise} a promise that becomes fulfilled with the value the first
  completed promises is resolved with if the first completed promise was
  fulfilled, or rejected with the reason that the first completed promise
  was rejected with.
*/
function race(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to race.');
  }
  return new Promise(function(resolve, reject) {
    var results = [], promise;

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && typeof promise.then === 'function') {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
  });
}

exports.race = race;
},{"./utils":48}],46:[function(require,module,exports){
"use strict";
/**
  `RSVP.reject` returns a promise that will become rejected with the passed
  `reason`. `RSVP.reject` is essentially shorthand for the following:

  ```javascript
  var promise = new RSVP.Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  var promise = RSVP.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @for RSVP
  @param {Any} reason value that the returned promise will be rejected with.
  @param {String} label optional string for identifying the returned promise.
  Useful for tooling.
  @return {Promise} a promise that will become rejected with the given
  `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Promise = this;

  return new Promise(function (resolve, reject) {
    reject(reason);
  });
}

exports.reject = reject;
},{}],47:[function(require,module,exports){
"use strict";
function resolve(value) {
  /*jshint validthis:true */
  if (value && typeof value === 'object' && value.constructor === this) {
    return value;
  }

  var Promise = this;

  return new Promise(function(resolve) {
    resolve(value);
  });
}

exports.resolve = resolve;
},{}],48:[function(require,module,exports){
"use strict";
function objectOrFunction(x) {
  return isFunction(x) || (typeof x === "object" && x !== null);
}

function isFunction(x) {
  return typeof x === "function";
}

function isArray(x) {
  return Object.prototype.toString.call(x) === "[object Array]";
}

// Date.now is not available in browsers < IE9
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
var now = Date.now || function() { return new Date().getTime(); };


exports.objectOrFunction = objectOrFunction;
exports.isFunction = isFunction;
exports.isArray = isArray;
exports.now = now;
},{}],49:[function(require,module,exports){
//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],50:[function(require,module,exports){
var Store = require("./Store")
	, DeviceConstants = require("../constants/DeviceConstants");

var resizeTimer;

var DeviceStore = Store.extend({
	scrolling : {
		lastScrollY : window.scrollY,
		lastScrollX : window.scrollX
	},

	onScroll : function (fn) {
		this.on(DeviceConstants.DEVICE_SCROLL, fn);
	},
	offScroll : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_SCROLL, fn);
	},
	_emitScroll : function (e) {
		e.lastScrollY = DeviceStore.scrolling.lastScrollY;
		e.lastScrollX = DeviceStore.scrolling.lastScrollX;

		DeviceStore.emit(DeviceConstants.DEVICE_SCROLL, e);
		
		DeviceStore.scrolling.lastScrollY = e.target.scrollTop;
		DeviceStore.scrolling.lastScrollX = e.target.scrollLeft;
	},

	onOrientationChange : function (fn) {
		this.on(DeviceConstants.DEVICE_ORIENTATION_CHANGE, fn);
	},
	offOrientationChange : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_ORIENTATION_CHANGE, fn);
	},
	_emitOrientationChange : function (e) {
		this.emit(DeviceConstants.DEVICE_ORIENTATION_CHANGE, e);
	},

	onResize : function (fn) {
		this.on(DeviceConstants.DEVICE_RESIZE, fn);
	},
	offResize : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_RESIZE, fn);
	},
	_emitResize : function (e) {
		this.emit(DeviceConstants.DEVICE_RESIZE, e);
	},

	onResizeEnd : function (fn) {
		this.on(DeviceConstants.DEVICE_RESIZE_END, fn);
	},
	offResizeEnd : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_RESIZE_END, fn);
	},

	_emitKeyDown : function (e) {
		this.emit(DeviceConstants.DEVICE_KEYDOWN, e);
	},
	onKeyDown : function (fn) {
		this.on(DeviceConstants.DEVICE_KEYDOWN, fn);
	},
	offKeyDown : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_KEYDOWN, fn);
	},

	_emitKeyUp : function (e) {
		this.emit(DeviceConstants.DEVICE_KEYUP, e);
	},
	onKeyUp : function (fn) {
		this.on(DeviceConstants.DEVICE_KEYUP, fn);
	},
	offKeyUp : function (fn) {
		this.removeListener(DeviceConstants.DEVICE_KEYUP, fn);
	}
});

// Turn DeviceStore into a singleton
DeviceStore = new DeviceStore();

window.addEventListener("scroll", DeviceStore._emitScroll);

window.addEventListener("resize", function(e){
	DeviceStore._emitResize(e);

	clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
  	DeviceStore.emit(DeviceConstants.DEVICE_RESIZE_END, e);
  }, 250);
});

window.addEventListener("orientationchange", function(e){
	DeviceStore._emitOrientationChange(e);
});

window.addEventListener("keydown", function(e){
	DeviceStore._emitKeyDown(e);
});

window.addEventListener("keyup", function(e){
	DeviceStore._emitKeyUp(e);
});

// export a singleton
module.exports = DeviceStore
},{"../constants/DeviceConstants":37,"./Store":52}],51:[function(require,module,exports){
var Store = require('./Store')
	, _ = require('underscore');

/*
 * StandardStore is an extension on Store that provides standard
 * behaviours for storing a model
 *
 */

// update the first matched element in an array
// using underscore's extend method
// @param list {array} the list of objects
// @param fn {function} truth test function
// @param element {anything} updates to make
// @return true if modified, otherwise false
function update(list, fn, element) {
	for (var i=0,e; e=list[i]; i++) {
		if (fn(e)) {
			list[i] = _.extend(list[i], element)
			return true;
		}
	}
	return false;
}

// remove the first element in an array
// that passes the truth test function
// @param list {array} - array to modify
// @param fn {function} - truth test function
// @return true if modified, otherwise false
function remove(list, fn) {
	for (var i=0,e; e=list[i]; i++) {
		if (fn(e)) {
			list.splice(i, 1);
			return true;
		}
	}
	return false;
}

// @param id {string|number} - id we're looking for
// @return {func(model)} - 
function idMatcher (id) {
	return function (m) {
		return (m.id === id || m.cid === id);
	}
}

var StandardStore = Store.extend({
	// @private
	constructor : function () {
		this._models = [];
		return this;
	},

	// @private
	// internal models array. will be defined on construction
	_models : undefined,

	// @private - internal "one" method that returns a reference to the stored
	// model object
	// @param {string} id - the id or client id (cid) of the object being retrieved
	// private method because it returns a direct reference to the object in the store. 
	_one : function (id) {
		if (!id) { return false; }
		return _.find(this._models, idMatcher(id));
	},
	
	// public method returns a clone of the object
	// to prevent unintended modification of the stored model
	// @param {string} id - the id or client id (cid) of the object being retrieved
	// @return {object|undefined} - the model object, or undefined if not found
	one : function (id) {
		if (!id) { return undefined; }
		return _.clone(this._one(id));
	},

	// get all models in this store
	// returns a clone of the array to prevent
	// unintended modification
	// @return {array} - copy of all models
	all : function () {
		return _.clone(this._models)
	},

	// check to see weather a model is valid. call
	// syncronously for simple true / false, or provide a
	// callback for error reporting.
	// Feel free to override this method, keeping it's format.
	// @param model {object} - the model to validate
	// @param cb {function} - optional callback for errors
	// @return true if valid, error if not
	valid : function (model, cb) {
		var errors = [];
		return this.isModelObject(model, cb);
	},

	// add a model to the store
	// if it's already in the store, the stored model will be updated.
	// the object must have either an id or cid field
	// @param {object} model - the model object to add to the store
	add : function (model) {
		if (_.isArray(model)) {
			_.each(model, this.add, this);
			return model;
		}

		// make sure we're valid
		if (!this.valid(model)) {
			return false;
		}

		// check to see if we already have the model
		if (update(this._models, idMatcher(model.id || model.cid), model)) {
			return model;
		}

		// otherwise push to the end of the list
		this._models.push(model);

		return model;
	},

	// update a stored model
	// @param {object} model - the model object to be updated
	update : function (model) {
		if (!this.valid(model)) { 
			return false;
		}
		return update(this._models, idMatcher(model.id || model.cid || ''), model);
	},

	// @param model {object|string|number} - either the model object to be removed OR
	// 																			 just it's id / cid
	remove : function (model) {
		if (!model) { return false; }
		// support passing in just the id
		if (_.isString(model) || _.isNumber(model)) {
			model = { id : model };
		}
		return remove(this._models, idMatcher(model.id || model.cid || ''));
	},

	// helper func to see if something is a model object.
	// call syncronously for simple true / false, or provide a
	// callback for error reporting.
	// Feel free to override this method, keeping it's format.
	// @param model {object} - the model to validate
	// @return {boolean} - weather it's a model object or not
	isModelObject : function (model) {
		// all models must be objects
		if (!_.isObject(model)) { 
			return false;
		}

		// must have either an id or cid property
		if (!model.id && !model.cid) { 
			return false;
		}

		return true;
	},

	// tries to format obj as an "id object"
	// @param arg {object|string|number}
	// @return {object|undefined} in the form { id : [arg] }
	//														undefined if the conversion cannot be made
	idObject : function (obj) {
		if (!obj) { return undefined; }
		if (this.isModelObject(obj)) { return obj; }
		if (_.isString(obj) || _.isNumber(obj)) { return { id : obj}; }
		return undefined;
	}
});

module.exports = StandardStore;
},{"./Store":52,"underscore":49}],52:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , _ = require('underscore')

// big, universal contants for store events
var CHANGE_EVENT = 'change'
  , ERROR_EVENT = 'error'
  , MESSAGE_EVENT = 'message';

function Store () {}

_.extend(Store.prototype, EventEmitter.prototype, {
  // empty constructor func
  constructor : function () {},

  emitChange: function(data) {
    return this.emit(CHANGE_EVENT, data);
  },
  /**
   * @param {function} callback
   * @return {int} number of current listeners
   */
  onChange: function(callback) {
    this.on(CHANGE_EVENT, callback);
    return this.listeners(CHANGE_EVENT).length;
  },
  /**
   * @param {function} callback
   * @return {int} number of change event listeners
   */
  offChange: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
    return this.listeners(CHANGE_EVENT).length;
  },

  emitError : function (err) {
    return this.emit(ERROR_EVENT, err);
  },
  /**
   * @param {function} callback
   * @return {int} number of change event listeners
   */
  onError : function (callback) {
    this.on(ERROR_EVENT, callback);
    return this.listeners(ERROR_EVENT).length;
  },
  /**
   * @param {function} callback
   * @return {int} number of change event listeners
   */
  offError : function (callback) {
    this.removeListener(ERROR_EVENT, callback);
    return this.listeners(ERROR_EVENT).length;
  },
  
  emitMessage : function (msg) {
    return this.emit(MESSAGE_EVENT, msg);
  },
  /**
   * @param {function} callback
   * @return {int} number of change event listeners
   */
  onMessage : function (callback) {
    this.on(MESSAGE_EVENT, callback);
    return this.listeners(MESSAGE_EVENT).length;
  },
  /**
   * @param {function} callback
   * @return {int} number of change event listeners
   */
  offMessage : function (callback) {
    this.removeListener(MESSAGE_EVENT, callback);
    return this.listeners(MESSAGE_EVENT).length;
  }
});

// straight up ripoff of the Backbone.js extend method
Store.extend = function extend (protoProps, staticProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  _.extend(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype;

  return child;
}


module.exports = Store;
},{"events":1,"underscore":49}],53:[function(require,module,exports){
// https://developers.google.com/mobile/articles/fast_buttons

var clickbuster = {
	coordinates : [],
	preventGhostClick : function(x, y) {
	  clickbuster.coordinates.push(x, y);
	  window.setTimeout(clickbuster.pop, 2500);
	},
	pop : function() {
	  clickbuster.coordinates.splice(0, 2);
	},
	onClick : function(e) {
	  for (var i = 0; i < clickbuster.coordinates.length; i += 2) {
	    var x = clickbuster.coordinates[i];
	    var y = clickbuster.coordinates[i + 1];
	    if (Math.abs(event.clientX - x) < 25 && Math.abs(e.clientY - y) < 25) {
	      e.stopPropagation();
	      e.preventDefault();
	    }
	  }
	},
}

document.addEventListener('click', clickbuster.onClick, true);

module.exports = clickbuster;
},{}],54:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== process.env.NODE_ENV) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require('_process'))
},{"_process":2}],55:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule keyMirror
 * @typechecks static-only
 */

'use strict';

var invariant = require("./invariant");

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  ("production" !== process.env.NODE_ENV ? invariant(
    obj instanceof Object && !Array.isArray(obj),
    'keyMirror(...): Argument must be an object.'
  ) : invariant(obj instanceof Object && !Array.isArray(obj)));
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

}).call(this,require('_process'))
},{"./invariant":54,"_process":2}]},{},[4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25]);
