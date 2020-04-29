window.__require = function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var b = o.split("/");
        b = b[b.length - 1];
        if (!t[b]) {
          var a = "function" == typeof __require && __require;
          if (!u && a) return a(b, !0);
          if (i) return i(b, !0);
          throw new Error("Cannot find module '" + o + "'");
        }
      }
      var f = n[o] = {
        exports: {}
      };
      t[o][0].call(f.exports, function(e) {
        var n = t[o][1][e];
        return s(n || e);
      }, f, f.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = "function" == typeof __require && __require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
}({
  1: [ function(require, module, exports) {
    var asn1 = exports;
    asn1.bignum = require("bn.js");
    asn1.define = require("./asn1/api").define;
    asn1.base = require("./asn1/base");
    asn1.constants = require("./asn1/constants");
    asn1.decoders = require("./asn1/decoders");
    asn1.encoders = require("./asn1/encoders");
  }, {
    "./asn1/api": 2,
    "./asn1/base": 4,
    "./asn1/constants": 8,
    "./asn1/decoders": 10,
    "./asn1/encoders": 13,
    "bn.js": 16
  } ],
  2: [ function(require, module, exports) {
    var asn1 = require("../asn1");
    var inherits = require("inherits");
    var api = exports;
    api.define = function define(name, body) {
      return new Entity(name, body);
    };
    function Entity(name, body) {
      this.name = name;
      this.body = body;
      this.decoders = {};
      this.encoders = {};
    }
    Entity.prototype._createNamed = function createNamed(base) {
      var named;
      try {
        named = require("vm").runInThisContext("(function " + this.name + "(entity) {\n  this._initNamed(entity);\n})");
      } catch (e) {
        named = function(entity) {
          this._initNamed(entity);
        };
      }
      inherits(named, base);
      named.prototype._initNamed = function initnamed(entity) {
        base.call(this, entity);
      };
      return new named(this);
    };
    Entity.prototype._getDecoder = function _getDecoder(enc) {
      enc = enc || "der";
      this.decoders.hasOwnProperty(enc) || (this.decoders[enc] = this._createNamed(asn1.decoders[enc]));
      return this.decoders[enc];
    };
    Entity.prototype.decode = function decode(data, enc, options) {
      return this._getDecoder(enc).decode(data, options);
    };
    Entity.prototype._getEncoder = function _getEncoder(enc) {
      enc = enc || "der";
      this.encoders.hasOwnProperty(enc) || (this.encoders[enc] = this._createNamed(asn1.encoders[enc]));
      return this.encoders[enc];
    };
    Entity.prototype.encode = function encode(data, enc, reporter) {
      return this._getEncoder(enc).encode(data, reporter);
    };
  }, {
    "../asn1": 1,
    inherits: 101,
    vm: 155
  } ],
  3: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Reporter = require("../base").Reporter;
    var Buffer = require("buffer").Buffer;
    function DecoderBuffer(base, options) {
      Reporter.call(this, options);
      if (!Buffer.isBuffer(base)) {
        this.error("Input not Buffer");
        return;
      }
      this.base = base;
      this.offset = 0;
      this.length = base.length;
    }
    inherits(DecoderBuffer, Reporter);
    exports.DecoderBuffer = DecoderBuffer;
    DecoderBuffer.prototype.save = function save() {
      return {
        offset: this.offset,
        reporter: Reporter.prototype.save.call(this)
      };
    };
    DecoderBuffer.prototype.restore = function restore(save) {
      var res = new DecoderBuffer(this.base);
      res.offset = save.offset;
      res.length = this.offset;
      this.offset = save.offset;
      Reporter.prototype.restore.call(this, save.reporter);
      return res;
    };
    DecoderBuffer.prototype.isEmpty = function isEmpty() {
      return this.offset === this.length;
    };
    DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
      return this.offset + 1 <= this.length ? this.base.readUInt8(this.offset++, true) : this.error(fail || "DecoderBuffer overrun");
    };
    DecoderBuffer.prototype.skip = function skip(bytes, fail) {
      if (!(this.offset + bytes <= this.length)) return this.error(fail || "DecoderBuffer overrun");
      var res = new DecoderBuffer(this.base);
      res._reporterState = this._reporterState;
      res.offset = this.offset;
      res.length = this.offset + bytes;
      this.offset += bytes;
      return res;
    };
    DecoderBuffer.prototype.raw = function raw(save) {
      return this.base.slice(save ? save.offset : this.offset, this.length);
    };
    function EncoderBuffer(value, reporter) {
      if (Array.isArray(value)) {
        this.length = 0;
        this.value = value.map(function(item) {
          item instanceof EncoderBuffer || (item = new EncoderBuffer(item, reporter));
          this.length += item.length;
          return item;
        }, this);
      } else if ("number" === typeof value) {
        if (!(0 <= value && value <= 255)) return reporter.error("non-byte EncoderBuffer value");
        this.value = value;
        this.length = 1;
      } else if ("string" === typeof value) {
        this.value = value;
        this.length = Buffer.byteLength(value);
      } else {
        if (!Buffer.isBuffer(value)) return reporter.error("Unsupported type: " + typeof value);
        this.value = value;
        this.length = value.length;
      }
    }
    exports.EncoderBuffer = EncoderBuffer;
    EncoderBuffer.prototype.join = function join(out, offset) {
      out || (out = new Buffer(this.length));
      offset || (offset = 0);
      if (0 === this.length) return out;
      if (Array.isArray(this.value)) this.value.forEach(function(item) {
        item.join(out, offset);
        offset += item.length;
      }); else {
        "number" === typeof this.value ? out[offset] = this.value : "string" === typeof this.value ? out.write(this.value, offset) : Buffer.isBuffer(this.value) && this.value.copy(out, offset);
        offset += this.length;
      }
      return out;
    };
  }, {
    "../base": 4,
    buffer: 47,
    inherits: 101
  } ],
  4: [ function(require, module, exports) {
    var base = exports;
    base.Reporter = require("./reporter").Reporter;
    base.DecoderBuffer = require("./buffer").DecoderBuffer;
    base.EncoderBuffer = require("./buffer").EncoderBuffer;
    base.Node = require("./node");
  }, {
    "./buffer": 3,
    "./node": 5,
    "./reporter": 6
  } ],
  5: [ function(require, module, exports) {
    var Reporter = require("../base").Reporter;
    var EncoderBuffer = require("../base").EncoderBuffer;
    var DecoderBuffer = require("../base").DecoderBuffer;
    var assert = require("minimalistic-assert");
    var tags = [ "seq", "seqof", "set", "setof", "objid", "bool", "gentime", "utctime", "null_", "enum", "int", "objDesc", "bitstr", "bmpstr", "charstr", "genstr", "graphstr", "ia5str", "iso646str", "numstr", "octstr", "printstr", "t61str", "unistr", "utf8str", "videostr" ];
    var methods = [ "key", "obj", "use", "optional", "explicit", "implicit", "def", "choice", "any", "contains" ].concat(tags);
    var overrided = [ "_peekTag", "_decodeTag", "_use", "_decodeStr", "_decodeObjid", "_decodeTime", "_decodeNull", "_decodeInt", "_decodeBool", "_decodeList", "_encodeComposite", "_encodeStr", "_encodeObjid", "_encodeTime", "_encodeNull", "_encodeInt", "_encodeBool" ];
    function Node(enc, parent) {
      var state = {};
      this._baseState = state;
      state.enc = enc;
      state.parent = parent || null;
      state.children = null;
      state.tag = null;
      state.args = null;
      state.reverseArgs = null;
      state.choice = null;
      state.optional = false;
      state.any = false;
      state.obj = false;
      state.use = null;
      state.useDecoder = null;
      state.key = null;
      state["default"] = null;
      state.explicit = null;
      state.implicit = null;
      state.contains = null;
      if (!state.parent) {
        state.children = [];
        this._wrap();
      }
    }
    module.exports = Node;
    var stateProps = [ "enc", "parent", "children", "tag", "args", "reverseArgs", "choice", "optional", "any", "obj", "use", "alteredUse", "key", "default", "explicit", "implicit", "contains" ];
    Node.prototype.clone = function clone() {
      var state = this._baseState;
      var cstate = {};
      stateProps.forEach(function(prop) {
        cstate[prop] = state[prop];
      });
      var res = new this.constructor(cstate.parent);
      res._baseState = cstate;
      return res;
    };
    Node.prototype._wrap = function wrap() {
      var state = this._baseState;
      methods.forEach(function(method) {
        this[method] = function _wrappedMethod() {
          var clone = new this.constructor(this);
          state.children.push(clone);
          return clone[method].apply(clone, arguments);
        };
      }, this);
    };
    Node.prototype._init = function init(body) {
      var state = this._baseState;
      assert(null === state.parent);
      body.call(this);
      state.children = state.children.filter(function(child) {
        return child._baseState.parent === this;
      }, this);
      assert.equal(state.children.length, 1, "Root node can have only one child");
    };
    Node.prototype._useArgs = function useArgs(args) {
      var state = this._baseState;
      var children = args.filter(function(arg) {
        return arg instanceof this.constructor;
      }, this);
      args = args.filter(function(arg) {
        return !(arg instanceof this.constructor);
      }, this);
      if (0 !== children.length) {
        assert(null === state.children);
        state.children = children;
        children.forEach(function(child) {
          child._baseState.parent = this;
        }, this);
      }
      if (0 !== args.length) {
        assert(null === state.args);
        state.args = args;
        state.reverseArgs = args.map(function(arg) {
          if ("object" !== typeof arg || arg.constructor !== Object) return arg;
          var res = {};
          Object.keys(arg).forEach(function(key) {
            key == (0 | key) && (key |= 0);
            var value = arg[key];
            res[value] = key;
          });
          return res;
        });
      }
    };
    overrided.forEach(function(method) {
      Node.prototype[method] = function _overrided() {
        var state = this._baseState;
        throw new Error(method + " not implemented for encoding: " + state.enc);
      };
    });
    tags.forEach(function(tag) {
      Node.prototype[tag] = function _tagMethod() {
        var state = this._baseState;
        var args = Array.prototype.slice.call(arguments);
        assert(null === state.tag);
        state.tag = tag;
        this._useArgs(args);
        return this;
      };
    });
    Node.prototype.use = function use(item) {
      assert(item);
      var state = this._baseState;
      assert(null === state.use);
      state.use = item;
      return this;
    };
    Node.prototype.optional = function optional() {
      var state = this._baseState;
      state.optional = true;
      return this;
    };
    Node.prototype.def = function def(val) {
      var state = this._baseState;
      assert(null === state["default"]);
      state["default"] = val;
      state.optional = true;
      return this;
    };
    Node.prototype.explicit = function explicit(num) {
      var state = this._baseState;
      assert(null === state.explicit && null === state.implicit);
      state.explicit = num;
      return this;
    };
    Node.prototype.implicit = function implicit(num) {
      var state = this._baseState;
      assert(null === state.explicit && null === state.implicit);
      state.implicit = num;
      return this;
    };
    Node.prototype.obj = function obj() {
      var state = this._baseState;
      var args = Array.prototype.slice.call(arguments);
      state.obj = true;
      0 !== args.length && this._useArgs(args);
      return this;
    };
    Node.prototype.key = function key(newKey) {
      var state = this._baseState;
      assert(null === state.key);
      state.key = newKey;
      return this;
    };
    Node.prototype.any = function any() {
      var state = this._baseState;
      state.any = true;
      return this;
    };
    Node.prototype.choice = function choice(obj) {
      var state = this._baseState;
      assert(null === state.choice);
      state.choice = obj;
      this._useArgs(Object.keys(obj).map(function(key) {
        return obj[key];
      }));
      return this;
    };
    Node.prototype.contains = function contains(item) {
      var state = this._baseState;
      assert(null === state.use);
      state.contains = item;
      return this;
    };
    Node.prototype._decode = function decode(input, options) {
      var state = this._baseState;
      if (null === state.parent) return input.wrapResult(state.children[0]._decode(input, options));
      var result = state["default"];
      var present = true;
      var prevKey = null;
      null !== state.key && (prevKey = input.enterKey(state.key));
      if (state.optional) {
        var tag = null;
        null !== state.explicit ? tag = state.explicit : null !== state.implicit ? tag = state.implicit : null !== state.tag && (tag = state.tag);
        if (null !== tag || state.any) {
          present = this._peekTag(input, tag, state.any);
          if (input.isError(present)) return present;
        } else {
          var save = input.save();
          try {
            null === state.choice ? this._decodeGeneric(state.tag, input, options) : this._decodeChoice(input, options);
            present = true;
          } catch (e) {
            present = false;
          }
          input.restore(save);
        }
      }
      var prevObj;
      state.obj && present && (prevObj = input.enterObject());
      if (present) {
        if (null !== state.explicit) {
          var explicit = this._decodeTag(input, state.explicit);
          if (input.isError(explicit)) return explicit;
          input = explicit;
        }
        var start = input.offset;
        if (null === state.use && null === state.choice) {
          if (state.any) var save = input.save();
          var body = this._decodeTag(input, null !== state.implicit ? state.implicit : state.tag, state.any);
          if (input.isError(body)) return body;
          state.any ? result = input.raw(save) : input = body;
        }
        options && options.track && null !== state.tag && options.track(input.path(), start, input.length, "tagged");
        options && options.track && null !== state.tag && options.track(input.path(), input.offset, input.length, "content");
        result = state.any ? result : null === state.choice ? this._decodeGeneric(state.tag, input, options) : this._decodeChoice(input, options);
        if (input.isError(result)) return result;
        state.any || null !== state.choice || null === state.children || state.children.forEach(function decodeChildren(child) {
          child._decode(input, options);
        });
        if (state.contains && ("octstr" === state.tag || "bitstr" === state.tag)) {
          var data = new DecoderBuffer(result);
          result = this._getUse(state.contains, input._reporterState.obj)._decode(data, options);
        }
      }
      state.obj && present && (result = input.leaveObject(prevObj));
      null === state.key || null === result && true !== present ? null !== prevKey && input.exitKey(prevKey) : input.leaveKey(prevKey, state.key, result);
      return result;
    };
    Node.prototype._decodeGeneric = function decodeGeneric(tag, input, options) {
      var state = this._baseState;
      if ("seq" === tag || "set" === tag) return null;
      if ("seqof" === tag || "setof" === tag) return this._decodeList(input, tag, state.args[0], options);
      if (/str$/.test(tag)) return this._decodeStr(input, tag, options);
      if ("objid" === tag && state.args) return this._decodeObjid(input, state.args[0], state.args[1], options);
      if ("objid" === tag) return this._decodeObjid(input, null, null, options);
      if ("gentime" === tag || "utctime" === tag) return this._decodeTime(input, tag, options);
      if ("null_" === tag) return this._decodeNull(input, options);
      if ("bool" === tag) return this._decodeBool(input, options);
      if ("objDesc" === tag) return this._decodeStr(input, tag, options);
      if ("int" === tag || "enum" === tag) return this._decodeInt(input, state.args && state.args[0], options);
      return null !== state.use ? this._getUse(state.use, input._reporterState.obj)._decode(input, options) : input.error("unknown tag: " + tag);
    };
    Node.prototype._getUse = function _getUse(entity, obj) {
      var state = this._baseState;
      state.useDecoder = this._use(entity, obj);
      assert(null === state.useDecoder._baseState.parent);
      state.useDecoder = state.useDecoder._baseState.children[0];
      if (state.implicit !== state.useDecoder._baseState.implicit) {
        state.useDecoder = state.useDecoder.clone();
        state.useDecoder._baseState.implicit = state.implicit;
      }
      return state.useDecoder;
    };
    Node.prototype._decodeChoice = function decodeChoice(input, options) {
      var state = this._baseState;
      var result = null;
      var match = false;
      Object.keys(state.choice).some(function(key) {
        var save = input.save();
        var node = state.choice[key];
        try {
          var value = node._decode(input, options);
          if (input.isError(value)) return false;
          result = {
            type: key,
            value: value
          };
          match = true;
        } catch (e) {
          input.restore(save);
          return false;
        }
        return true;
      }, this);
      if (!match) return input.error("Choice not matched");
      return result;
    };
    Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
      return new EncoderBuffer(data, this.reporter);
    };
    Node.prototype._encode = function encode(data, reporter, parent) {
      var state = this._baseState;
      if (null !== state["default"] && state["default"] === data) return;
      var result = this._encodeValue(data, reporter, parent);
      if (void 0 === result) return;
      if (this._skipDefault(result, reporter, parent)) return;
      return result;
    };
    Node.prototype._encodeValue = function encode(data, reporter, parent) {
      var state = this._baseState;
      if (null === state.parent) return state.children[0]._encode(data, reporter || new Reporter());
      var result = null;
      this.reporter = reporter;
      if (state.optional && void 0 === data) {
        if (null === state["default"]) return;
        data = state["default"];
      }
      var content = null;
      var primitive = false;
      if (state.any) result = this._createEncoderBuffer(data); else if (state.choice) result = this._encodeChoice(data, reporter); else if (state.contains) {
        content = this._getUse(state.contains, parent)._encode(data, reporter);
        primitive = true;
      } else if (state.children) {
        content = state.children.map(function(child) {
          if ("null_" === child._baseState.tag) return child._encode(null, reporter, data);
          if (null === child._baseState.key) return reporter.error("Child should have a key");
          var prevKey = reporter.enterKey(child._baseState.key);
          if ("object" !== typeof data) return reporter.error("Child expected, but input is not object");
          var res = child._encode(data[child._baseState.key], reporter, data);
          reporter.leaveKey(prevKey);
          return res;
        }, this).filter(function(child) {
          return child;
        });
        content = this._createEncoderBuffer(content);
      } else if ("seqof" === state.tag || "setof" === state.tag) {
        if (!(state.args && 1 === state.args.length)) return reporter.error("Too many args for : " + state.tag);
        if (!Array.isArray(data)) return reporter.error("seqof/setof, but data is not Array");
        var child = this.clone();
        child._baseState.implicit = null;
        content = this._createEncoderBuffer(data.map(function(item) {
          var state = this._baseState;
          return this._getUse(state.args[0], data)._encode(item, reporter);
        }, child));
      } else if (null !== state.use) result = this._getUse(state.use, parent)._encode(data, reporter); else {
        content = this._encodePrimitive(state.tag, data);
        primitive = true;
      }
      var result;
      if (!state.any && null === state.choice) {
        var tag = null !== state.implicit ? state.implicit : state.tag;
        var cls = null === state.implicit ? "universal" : "context";
        null === tag ? null === state.use && reporter.error("Tag could be omitted only for .use()") : null === state.use && (result = this._encodeComposite(tag, primitive, cls, content));
      }
      null !== state.explicit && (result = this._encodeComposite(state.explicit, false, "context", result));
      return result;
    };
    Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
      var state = this._baseState;
      var node = state.choice[data.type];
      node || assert(false, data.type + " not found in " + JSON.stringify(Object.keys(state.choice)));
      return node._encode(data.value, reporter);
    };
    Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
      var state = this._baseState;
      if (/str$/.test(tag)) return this._encodeStr(data, tag);
      if ("objid" === tag && state.args) return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);
      if ("objid" === tag) return this._encodeObjid(data, null, null);
      if ("gentime" === tag || "utctime" === tag) return this._encodeTime(data, tag);
      if ("null_" === tag) return this._encodeNull();
      if ("int" === tag || "enum" === tag) return this._encodeInt(data, state.args && state.reverseArgs[0]);
      if ("bool" === tag) return this._encodeBool(data);
      if ("objDesc" === tag) return this._encodeStr(data, tag);
      throw new Error("Unsupported tag: " + tag);
    };
    Node.prototype._isNumstr = function isNumstr(str) {
      return /^[0-9 ]*$/.test(str);
    };
    Node.prototype._isPrintstr = function isPrintstr(str) {
      return /^[A-Za-z0-9 '\(\)\+,\-\.\/:=\?]*$/.test(str);
    };
  }, {
    "../base": 4,
    "minimalistic-assert": 105
  } ],
  6: [ function(require, module, exports) {
    var inherits = require("inherits");
    function Reporter(options) {
      this._reporterState = {
        obj: null,
        path: [],
        options: options || {},
        errors: []
      };
    }
    exports.Reporter = Reporter;
    Reporter.prototype.isError = function isError(obj) {
      return obj instanceof ReporterError;
    };
    Reporter.prototype.save = function save() {
      var state = this._reporterState;
      return {
        obj: state.obj,
        pathLen: state.path.length
      };
    };
    Reporter.prototype.restore = function restore(data) {
      var state = this._reporterState;
      state.obj = data.obj;
      state.path = state.path.slice(0, data.pathLen);
    };
    Reporter.prototype.enterKey = function enterKey(key) {
      return this._reporterState.path.push(key);
    };
    Reporter.prototype.exitKey = function exitKey(index) {
      var state = this._reporterState;
      state.path = state.path.slice(0, index - 1);
    };
    Reporter.prototype.leaveKey = function leaveKey(index, key, value) {
      var state = this._reporterState;
      this.exitKey(index);
      null !== state.obj && (state.obj[key] = value);
    };
    Reporter.prototype.path = function path() {
      return this._reporterState.path.join("/");
    };
    Reporter.prototype.enterObject = function enterObject() {
      var state = this._reporterState;
      var prev = state.obj;
      state.obj = {};
      return prev;
    };
    Reporter.prototype.leaveObject = function leaveObject(prev) {
      var state = this._reporterState;
      var now = state.obj;
      state.obj = prev;
      return now;
    };
    Reporter.prototype.error = function error(msg) {
      var err;
      var state = this._reporterState;
      var inherited = msg instanceof ReporterError;
      err = inherited ? msg : new ReporterError(state.path.map(function(elem) {
        return "[" + JSON.stringify(elem) + "]";
      }).join(""), msg.message || msg, msg.stack);
      if (!state.options.partial) throw err;
      inherited || state.errors.push(err);
      return err;
    };
    Reporter.prototype.wrapResult = function wrapResult(result) {
      var state = this._reporterState;
      if (!state.options.partial) return result;
      return {
        result: this.isError(result) ? null : result,
        errors: state.errors
      };
    };
    function ReporterError(path, msg) {
      this.path = path;
      this.rethrow(msg);
    }
    inherits(ReporterError, Error);
    ReporterError.prototype.rethrow = function rethrow(msg) {
      this.message = msg + " at: " + (this.path || "(shallow)");
      Error.captureStackTrace && Error.captureStackTrace(this, ReporterError);
      if (!this.stack) try {
        throw new Error(this.message);
      } catch (e) {
        this.stack = e.stack;
      }
      return this;
    };
  }, {
    inherits: 101
  } ],
  7: [ function(require, module, exports) {
    var constants = require("../constants");
    exports.tagClass = {
      0: "universal",
      1: "application",
      2: "context",
      3: "private"
    };
    exports.tagClassByName = constants._reverse(exports.tagClass);
    exports.tag = {
      0: "end",
      1: "bool",
      2: "int",
      3: "bitstr",
      4: "octstr",
      5: "null_",
      6: "objid",
      7: "objDesc",
      8: "external",
      9: "real",
      10: "enum",
      11: "embed",
      12: "utf8str",
      13: "relativeOid",
      16: "seq",
      17: "set",
      18: "numstr",
      19: "printstr",
      20: "t61str",
      21: "videostr",
      22: "ia5str",
      23: "utctime",
      24: "gentime",
      25: "graphstr",
      26: "iso646str",
      27: "genstr",
      28: "unistr",
      29: "charstr",
      30: "bmpstr"
    };
    exports.tagByName = constants._reverse(exports.tag);
  }, {
    "../constants": 8
  } ],
  8: [ function(require, module, exports) {
    var constants = exports;
    constants._reverse = function reverse(map) {
      var res = {};
      Object.keys(map).forEach(function(key) {
        (0 | key) == key && (key |= 0);
        var value = map[key];
        res[value] = key;
      });
      return res;
    };
    constants.der = require("./der");
  }, {
    "./der": 7
  } ],
  9: [ function(require, module, exports) {
    var inherits = require("inherits");
    var asn1 = require("../../asn1");
    var base = asn1.base;
    var bignum = asn1.bignum;
    var der = asn1.constants.der;
    function DERDecoder(entity) {
      this.enc = "der";
      this.name = entity.name;
      this.entity = entity;
      this.tree = new DERNode();
      this.tree._init(entity.body);
    }
    module.exports = DERDecoder;
    DERDecoder.prototype.decode = function decode(data, options) {
      data instanceof base.DecoderBuffer || (data = new base.DecoderBuffer(data, options));
      return this.tree._decode(data, options);
    };
    function DERNode(parent) {
      base.Node.call(this, "der", parent);
    }
    inherits(DERNode, base.Node);
    DERNode.prototype._peekTag = function peekTag(buffer, tag, any) {
      if (buffer.isEmpty()) return false;
      var state = buffer.save();
      var decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
      if (buffer.isError(decodedTag)) return decodedTag;
      buffer.restore(state);
      return decodedTag.tag === tag || decodedTag.tagStr === tag || decodedTag.tagStr + "of" === tag || any;
    };
    DERNode.prototype._decodeTag = function decodeTag(buffer, tag, any) {
      var decodedTag = derDecodeTag(buffer, 'Failed to decode tag of "' + tag + '"');
      if (buffer.isError(decodedTag)) return decodedTag;
      var len = derDecodeLen(buffer, decodedTag.primitive, 'Failed to get length of "' + tag + '"');
      if (buffer.isError(len)) return len;
      if (!any && decodedTag.tag !== tag && decodedTag.tagStr !== tag && decodedTag.tagStr + "of" !== tag) return buffer.error('Failed to match tag: "' + tag + '"');
      if (decodedTag.primitive || null !== len) return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
      var state = buffer.save();
      var res = this._skipUntilEnd(buffer, 'Failed to skip indefinite length body: "' + this.tag + '"');
      if (buffer.isError(res)) return res;
      len = buffer.offset - state.offset;
      buffer.restore(state);
      return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
    };
    DERNode.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
      while (true) {
        var tag = derDecodeTag(buffer, fail);
        if (buffer.isError(tag)) return tag;
        var len = derDecodeLen(buffer, tag.primitive, fail);
        if (buffer.isError(len)) return len;
        var res;
        res = tag.primitive || null !== len ? buffer.skip(len) : this._skipUntilEnd(buffer, fail);
        if (buffer.isError(res)) return res;
        if ("end" === tag.tagStr) break;
      }
    };
    DERNode.prototype._decodeList = function decodeList(buffer, tag, decoder, options) {
      var result = [];
      while (!buffer.isEmpty()) {
        var possibleEnd = this._peekTag(buffer, "end");
        if (buffer.isError(possibleEnd)) return possibleEnd;
        var res = decoder.decode(buffer, "der", options);
        if (buffer.isError(res) && possibleEnd) break;
        result.push(res);
      }
      return result;
    };
    DERNode.prototype._decodeStr = function decodeStr(buffer, tag) {
      if ("bitstr" === tag) {
        var unused = buffer.readUInt8();
        if (buffer.isError(unused)) return unused;
        return {
          unused: unused,
          data: buffer.raw()
        };
      }
      if ("bmpstr" === tag) {
        var raw = buffer.raw();
        if (raw.length % 2 === 1) return buffer.error("Decoding of string type: bmpstr length mismatch");
        var str = "";
        for (var i = 0; i < raw.length / 2; i++) str += String.fromCharCode(raw.readUInt16BE(2 * i));
        return str;
      }
      if ("numstr" === tag) {
        var numstr = buffer.raw().toString("ascii");
        if (!this._isNumstr(numstr)) return buffer.error("Decoding of string type: numstr unsupported characters");
        return numstr;
      }
      if ("octstr" === tag) return buffer.raw();
      if ("objDesc" === tag) return buffer.raw();
      if ("printstr" === tag) {
        var printstr = buffer.raw().toString("ascii");
        if (!this._isPrintstr(printstr)) return buffer.error("Decoding of string type: printstr unsupported characters");
        return printstr;
      }
      return /str$/.test(tag) ? buffer.raw().toString() : buffer.error("Decoding of string type: " + tag + " unsupported");
    };
    DERNode.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
      var result;
      var identifiers = [];
      var ident = 0;
      while (!buffer.isEmpty()) {
        var subident = buffer.readUInt8();
        ident <<= 7;
        ident |= 127 & subident;
        if (0 === (128 & subident)) {
          identifiers.push(ident);
          ident = 0;
        }
      }
      128 & subident && identifiers.push(ident);
      var first = identifiers[0] / 40 | 0;
      var second = identifiers[0] % 40;
      result = relative ? identifiers : [ first, second ].concat(identifiers.slice(1));
      if (values) {
        var tmp = values[result.join(" ")];
        void 0 === tmp && (tmp = values[result.join(".")]);
        void 0 !== tmp && (result = tmp);
      }
      return result;
    };
    DERNode.prototype._decodeTime = function decodeTime(buffer, tag) {
      var str = buffer.raw().toString();
      if ("gentime" === tag) {
        var year = 0 | str.slice(0, 4);
        var mon = 0 | str.slice(4, 6);
        var day = 0 | str.slice(6, 8);
        var hour = 0 | str.slice(8, 10);
        var min = 0 | str.slice(10, 12);
        var sec = 0 | str.slice(12, 14);
      } else {
        if ("utctime" !== tag) return buffer.error("Decoding " + tag + " time is not supported yet");
        var year = 0 | str.slice(0, 2);
        var mon = 0 | str.slice(2, 4);
        var day = 0 | str.slice(4, 6);
        var hour = 0 | str.slice(6, 8);
        var min = 0 | str.slice(8, 10);
        var sec = 0 | str.slice(10, 12);
        year = year < 70 ? 2e3 + year : 1900 + year;
      }
      return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
    };
    DERNode.prototype._decodeNull = function decodeNull(buffer) {
      return null;
    };
    DERNode.prototype._decodeBool = function decodeBool(buffer) {
      var res = buffer.readUInt8();
      return buffer.isError(res) ? res : 0 !== res;
    };
    DERNode.prototype._decodeInt = function decodeInt(buffer, values) {
      var raw = buffer.raw();
      var res = new bignum(raw);
      values && (res = values[res.toString(10)] || res);
      return res;
    };
    DERNode.prototype._use = function use(entity, obj) {
      "function" === typeof entity && (entity = entity(obj));
      return entity._getDecoder("der").tree;
    };
    function derDecodeTag(buf, fail) {
      var tag = buf.readUInt8(fail);
      if (buf.isError(tag)) return tag;
      var cls = der.tagClass[tag >> 6];
      var primitive = 0 === (32 & tag);
      if (31 === (31 & tag)) {
        var oct = tag;
        tag = 0;
        while (128 === (128 & oct)) {
          oct = buf.readUInt8(fail);
          if (buf.isError(oct)) return oct;
          tag <<= 7;
          tag |= 127 & oct;
        }
      } else tag &= 31;
      var tagStr = der.tag[tag];
      return {
        cls: cls,
        primitive: primitive,
        tag: tag,
        tagStr: tagStr
      };
    }
    function derDecodeLen(buf, primitive, fail) {
      var len = buf.readUInt8(fail);
      if (buf.isError(len)) return len;
      if (!primitive && 128 === len) return null;
      if (0 === (128 & len)) return len;
      var num = 127 & len;
      if (num > 4) return buf.error("length octect is too long");
      len = 0;
      for (var i = 0; i < num; i++) {
        len <<= 8;
        var j = buf.readUInt8(fail);
        if (buf.isError(j)) return j;
        len |= j;
      }
      return len;
    }
  }, {
    "../../asn1": 1,
    inherits: 101
  } ],
  10: [ function(require, module, exports) {
    var decoders = exports;
    decoders.der = require("./der");
    decoders.pem = require("./pem");
  }, {
    "./der": 9,
    "./pem": 11
  } ],
  11: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Buffer = require("buffer").Buffer;
    var DERDecoder = require("./der");
    function PEMDecoder(entity) {
      DERDecoder.call(this, entity);
      this.enc = "pem";
    }
    inherits(PEMDecoder, DERDecoder);
    module.exports = PEMDecoder;
    PEMDecoder.prototype.decode = function decode(data, options) {
      var lines = data.toString().split(/[\r\n]+/g);
      var label = options.label.toUpperCase();
      var re = /^-----(BEGIN|END) ([^-]+)-----$/;
      var start = -1;
      var end = -1;
      for (var i = 0; i < lines.length; i++) {
        var match = lines[i].match(re);
        if (null === match) continue;
        if (match[2] !== label) continue;
        if (-1 !== start) {
          if ("END" !== match[1]) break;
          end = i;
          break;
        }
        if ("BEGIN" !== match[1]) break;
        start = i;
      }
      if (-1 === start || -1 === end) throw new Error("PEM section not found for: " + label);
      var base64 = lines.slice(start + 1, end).join("");
      base64.replace(/[^a-z0-9\+\/=]+/gi, "");
      var input = new Buffer(base64, "base64");
      return DERDecoder.prototype.decode.call(this, input, options);
    };
  }, {
    "./der": 9,
    buffer: 47,
    inherits: 101
  } ],
  12: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Buffer = require("buffer").Buffer;
    var asn1 = require("../../asn1");
    var base = asn1.base;
    var der = asn1.constants.der;
    function DEREncoder(entity) {
      this.enc = "der";
      this.name = entity.name;
      this.entity = entity;
      this.tree = new DERNode();
      this.tree._init(entity.body);
    }
    module.exports = DEREncoder;
    DEREncoder.prototype.encode = function encode(data, reporter) {
      return this.tree._encode(data, reporter).join();
    };
    function DERNode(parent) {
      base.Node.call(this, "der", parent);
    }
    inherits(DERNode, base.Node);
    DERNode.prototype._encodeComposite = function encodeComposite(tag, primitive, cls, content) {
      var encodedTag = encodeTag(tag, primitive, cls, this.reporter);
      if (content.length < 128) {
        var header = new Buffer(2);
        header[0] = encodedTag;
        header[1] = content.length;
        return this._createEncoderBuffer([ header, content ]);
      }
      var lenOctets = 1;
      for (var i = content.length; i >= 256; i >>= 8) lenOctets++;
      var header = new Buffer(2 + lenOctets);
      header[0] = encodedTag;
      header[1] = 128 | lenOctets;
      for (var i = 1 + lenOctets, j = content.length; j > 0; i--, j >>= 8) header[i] = 255 & j;
      return this._createEncoderBuffer([ header, content ]);
    };
    DERNode.prototype._encodeStr = function encodeStr(str, tag) {
      if ("bitstr" === tag) return this._createEncoderBuffer([ 0 | str.unused, str.data ]);
      if ("bmpstr" === tag) {
        var buf = new Buffer(2 * str.length);
        for (var i = 0; i < str.length; i++) buf.writeUInt16BE(str.charCodeAt(i), 2 * i);
        return this._createEncoderBuffer(buf);
      }
      if ("numstr" === tag) {
        if (!this._isNumstr(str)) return this.reporter.error("Encoding of string type: numstr supports only digits and space");
        return this._createEncoderBuffer(str);
      }
      if ("printstr" === tag) {
        if (!this._isPrintstr(str)) return this.reporter.error("Encoding of string type: printstr supports only latin upper and lower case letters, digits, space, apostrophe, left and rigth parenthesis, plus sign, comma, hyphen, dot, slash, colon, equal sign, question mark");
        return this._createEncoderBuffer(str);
      }
      return /str$/.test(tag) ? this._createEncoderBuffer(str) : "objDesc" === tag ? this._createEncoderBuffer(str) : this.reporter.error("Encoding of string type: " + tag + " unsupported");
    };
    DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
      if ("string" === typeof id) {
        if (!values) return this.reporter.error("string objid given, but no values map found");
        if (!values.hasOwnProperty(id)) return this.reporter.error("objid not found in values map");
        id = values[id].split(/[\s\.]+/g);
        for (var i = 0; i < id.length; i++) id[i] |= 0;
      } else if (Array.isArray(id)) {
        id = id.slice();
        for (var i = 0; i < id.length; i++) id[i] |= 0;
      }
      if (!Array.isArray(id)) return this.reporter.error("objid() should be either array or string, got: " + JSON.stringify(id));
      if (!relative) {
        if (id[1] >= 40) return this.reporter.error("Second objid identifier OOB");
        id.splice(0, 2, 40 * id[0] + id[1]);
      }
      var size = 0;
      for (var i = 0; i < id.length; i++) {
        var ident = id[i];
        for (size++; ident >= 128; ident >>= 7) size++;
      }
      var objid = new Buffer(size);
      var offset = objid.length - 1;
      for (var i = id.length - 1; i >= 0; i--) {
        var ident = id[i];
        objid[offset--] = 127 & ident;
        while ((ident >>= 7) > 0) objid[offset--] = 128 | 127 & ident;
      }
      return this._createEncoderBuffer(objid);
    };
    function two(num) {
      return num < 10 ? "0" + num : num;
    }
    DERNode.prototype._encodeTime = function encodeTime(time, tag) {
      var str;
      var date = new Date(time);
      "gentime" === tag ? str = [ two(date.getFullYear()), two(date.getUTCMonth() + 1), two(date.getUTCDate()), two(date.getUTCHours()), two(date.getUTCMinutes()), two(date.getUTCSeconds()), "Z" ].join("") : "utctime" === tag ? str = [ two(date.getFullYear() % 100), two(date.getUTCMonth() + 1), two(date.getUTCDate()), two(date.getUTCHours()), two(date.getUTCMinutes()), two(date.getUTCSeconds()), "Z" ].join("") : this.reporter.error("Encoding " + tag + " time is not supported yet");
      return this._encodeStr(str, "octstr");
    };
    DERNode.prototype._encodeNull = function encodeNull() {
      return this._createEncoderBuffer("");
    };
    DERNode.prototype._encodeInt = function encodeInt(num, values) {
      if ("string" === typeof num) {
        if (!values) return this.reporter.error("String int or enum given, but no values map");
        if (!values.hasOwnProperty(num)) return this.reporter.error("Values map doesn't contain: " + JSON.stringify(num));
        num = values[num];
      }
      if ("number" !== typeof num && !Buffer.isBuffer(num)) {
        var numArray = num.toArray();
        !num.sign && 128 & numArray[0] && numArray.unshift(0);
        num = new Buffer(numArray);
      }
      if (Buffer.isBuffer(num)) {
        var size = num.length;
        0 === num.length && size++;
        var out = new Buffer(size);
        num.copy(out);
        0 === num.length && (out[0] = 0);
        return this._createEncoderBuffer(out);
      }
      if (num < 128) return this._createEncoderBuffer(num);
      if (num < 256) return this._createEncoderBuffer([ 0, num ]);
      var size = 1;
      for (var i = num; i >= 256; i >>= 8) size++;
      var out = new Array(size);
      for (var i = out.length - 1; i >= 0; i--) {
        out[i] = 255 & num;
        num >>= 8;
      }
      128 & out[0] && out.unshift(0);
      return this._createEncoderBuffer(new Buffer(out));
    };
    DERNode.prototype._encodeBool = function encodeBool(value) {
      return this._createEncoderBuffer(value ? 255 : 0);
    };
    DERNode.prototype._use = function use(entity, obj) {
      "function" === typeof entity && (entity = entity(obj));
      return entity._getEncoder("der").tree;
    };
    DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
      var state = this._baseState;
      var i;
      if (null === state["default"]) return false;
      var data = dataBuffer.join();
      void 0 === state.defaultBuffer && (state.defaultBuffer = this._encodeValue(state["default"], reporter, parent).join());
      if (data.length !== state.defaultBuffer.length) return false;
      for (i = 0; i < data.length; i++) if (data[i] !== state.defaultBuffer[i]) return false;
      return true;
    };
    function encodeTag(tag, primitive, cls, reporter) {
      var res;
      "seqof" === tag ? tag = "seq" : "setof" === tag && (tag = "set");
      if (der.tagByName.hasOwnProperty(tag)) res = der.tagByName[tag]; else {
        if ("number" !== typeof tag || (0 | tag) !== tag) return reporter.error("Unknown tag: " + tag);
        res = tag;
      }
      if (res >= 31) return reporter.error("Multi-octet tag encoding unsupported");
      primitive || (res |= 32);
      res |= der.tagClassByName[cls || "universal"] << 6;
      return res;
    }
  }, {
    "../../asn1": 1,
    buffer: 47,
    inherits: 101
  } ],
  13: [ function(require, module, exports) {
    var encoders = exports;
    encoders.der = require("./der");
    encoders.pem = require("./pem");
  }, {
    "./der": 12,
    "./pem": 14
  } ],
  14: [ function(require, module, exports) {
    var inherits = require("inherits");
    var DEREncoder = require("./der");
    function PEMEncoder(entity) {
      DEREncoder.call(this, entity);
      this.enc = "pem";
    }
    inherits(PEMEncoder, DEREncoder);
    module.exports = PEMEncoder;
    PEMEncoder.prototype.encode = function encode(data, options) {
      var buf = DEREncoder.prototype.encode.call(this, data);
      var p = buf.toString("base64");
      var out = [ "-----BEGIN " + options.label + "-----" ];
      for (var i = 0; i < p.length; i += 64) out.push(p.slice(i, i + 64));
      out.push("-----END " + options.label + "-----");
      return out.join("\n");
    };
  }, {
    "./der": 12,
    inherits: 101
  } ],
  15: [ function(require, module, exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = "undefined" !== typeof Uint8Array ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len = b64.length;
      if (len % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
      var validLen = b64.indexOf("=");
      -1 === validLen && (validLen = len);
      var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
      return [ validLen, placeHoldersLen ];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return 3 * (validLen + placeHoldersLen) / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return 3 * (validLen + placeHoldersLen) / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i;
      for (i = 0; i < len; i += 4) {
        tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = 255 & tmp;
      }
      if (2 === placeHoldersLen) {
        tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
        arr[curByte++] = 255 & tmp;
      }
      if (1 === placeHoldersLen) {
        tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = 255 & tmp;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[63 & num];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16 & 16711680) + (uint8[i + 1] << 8 & 65280) + (255 & uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
      if (1 === extraBytes) {
        tmp = uint8[len - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
      } else if (2 === extraBytes) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
      }
      return parts.join("");
    }
  }, {} ],
  16: [ function(require, module, exports) {
    (function(module, exports) {
      "use strict";
      function assert(val, msg) {
        if (!val) throw new Error(msg || "Assertion failed");
      }
      function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
      function BN(number, base, endian) {
        if (BN.isBN(number)) return number;
        this.negative = 0;
        this.words = null;
        this.length = 0;
        this.red = null;
        if (null !== number) {
          if ("le" === base || "be" === base) {
            endian = base;
            base = 10;
          }
          this._init(number || 0, base || 10, endian || "be");
        }
      }
      "object" === typeof module ? module.exports = BN : exports.BN = BN;
      BN.BN = BN;
      BN.wordSize = 26;
      var Buffer;
      try {
        Buffer = require("buffer").Buffer;
      } catch (e) {}
      BN.isBN = function isBN(num) {
        if (num instanceof BN) return true;
        return null !== num && "object" === typeof num && num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
      };
      BN.max = function max(left, right) {
        if (left.cmp(right) > 0) return left;
        return right;
      };
      BN.min = function min(left, right) {
        if (left.cmp(right) < 0) return left;
        return right;
      };
      BN.prototype._init = function init(number, base, endian) {
        if ("number" === typeof number) return this._initNumber(number, base, endian);
        if ("object" === typeof number) return this._initArray(number, base, endian);
        "hex" === base && (base = 16);
        assert(base === (0 | base) && base >= 2 && base <= 36);
        number = number.toString().replace(/\s+/g, "");
        var start = 0;
        "-" === number[0] && start++;
        16 === base ? this._parseHex(number, start) : this._parseBase(number, base, start);
        "-" === number[0] && (this.negative = 1);
        this.strip();
        if ("le" !== endian) return;
        this._initArray(this.toArray(), base, endian);
      };
      BN.prototype._initNumber = function _initNumber(number, base, endian) {
        if (number < 0) {
          this.negative = 1;
          number = -number;
        }
        if (number < 67108864) {
          this.words = [ 67108863 & number ];
          this.length = 1;
        } else if (number < 4503599627370496) {
          this.words = [ 67108863 & number, number / 67108864 & 67108863 ];
          this.length = 2;
        } else {
          assert(number < 9007199254740992);
          this.words = [ 67108863 & number, number / 67108864 & 67108863, 1 ];
          this.length = 3;
        }
        if ("le" !== endian) return;
        this._initArray(this.toArray(), base, endian);
      };
      BN.prototype._initArray = function _initArray(number, base, endian) {
        assert("number" === typeof number.length);
        if (number.length <= 0) {
          this.words = [ 0 ];
          this.length = 1;
          return this;
        }
        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) this.words[i] = 0;
        var j, w;
        var off = 0;
        if ("be" === endian) for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
          w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
          this.words[j] |= w << off & 67108863;
          this.words[j + 1] = w >>> 26 - off & 67108863;
          off += 24;
          if (off >= 26) {
            off -= 26;
            j++;
          }
        } else if ("le" === endian) for (i = 0, j = 0; i < number.length; i += 3) {
          w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
          this.words[j] |= w << off & 67108863;
          this.words[j + 1] = w >>> 26 - off & 67108863;
          off += 24;
          if (off >= 26) {
            off -= 26;
            j++;
          }
        }
        return this.strip();
      };
      function parseHex(str, start, end) {
        var r = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r <<= 4;
          r |= c >= 49 && c <= 54 ? c - 49 + 10 : c >= 17 && c <= 22 ? c - 17 + 10 : 15 & c;
        }
        return r;
      }
      BN.prototype._parseHex = function _parseHex(number, start) {
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) this.words[i] = 0;
        var j, w;
        var off = 0;
        for (i = number.length - 6, j = 0; i >= start; i -= 6) {
          w = parseHex(number, i, i + 6);
          this.words[j] |= w << off & 67108863;
          this.words[j + 1] |= w >>> 26 - off & 4194303;
          off += 24;
          if (off >= 26) {
            off -= 26;
            j++;
          }
        }
        if (i + 6 !== start) {
          w = parseHex(number, start, i + 6);
          this.words[j] |= w << off & 67108863;
          this.words[j + 1] |= w >>> 26 - off & 4194303;
        }
        this.strip();
      };
      function parseBase(str, start, end, mul) {
        var r = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r *= mul;
          r += c >= 49 ? c - 49 + 10 : c >= 17 ? c - 17 + 10 : c;
        }
        return r;
      }
      BN.prototype._parseBase = function _parseBase(number, base, start) {
        this.words = [ 0 ];
        this.length = 1;
        for (var limbLen = 0, limbPow = 1; limbPow <= 67108863; limbPow *= base) limbLen++;
        limbLen--;
        limbPow = limbPow / base | 0;
        var total = number.length - start;
        var mod = total % limbLen;
        var end = Math.min(total, total - mod) + start;
        var word = 0;
        for (var i = start; i < end; i += limbLen) {
          word = parseBase(number, i, i + limbLen, base);
          this.imuln(limbPow);
          this.words[0] + word < 67108864 ? this.words[0] += word : this._iaddn(word);
        }
        if (0 !== mod) {
          var pow = 1;
          word = parseBase(number, i, number.length, base);
          for (i = 0; i < mod; i++) pow *= base;
          this.imuln(pow);
          this.words[0] + word < 67108864 ? this.words[0] += word : this._iaddn(word);
        }
      };
      BN.prototype.copy = function copy(dest) {
        dest.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) dest.words[i] = this.words[i];
        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
      };
      BN.prototype.clone = function clone() {
        var r = new BN(null);
        this.copy(r);
        return r;
      };
      BN.prototype._expand = function _expand(size) {
        while (this.length < size) this.words[this.length++] = 0;
        return this;
      };
      BN.prototype.strip = function strip() {
        while (this.length > 1 && 0 === this.words[this.length - 1]) this.length--;
        return this._normSign();
      };
      BN.prototype._normSign = function _normSign() {
        1 === this.length && 0 === this.words[0] && (this.negative = 0);
        return this;
      };
      BN.prototype.inspect = function inspect() {
        return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
      };
      var zeros = [ "", "0", "00", "000", "0000", "00000", "000000", "0000000", "00000000", "000000000", "0000000000", "00000000000", "000000000000", "0000000000000", "00000000000000", "000000000000000", "0000000000000000", "00000000000000000", "000000000000000000", "0000000000000000000", "00000000000000000000", "000000000000000000000", "0000000000000000000000", "00000000000000000000000", "000000000000000000000000", "0000000000000000000000000" ];
      var groupSizes = [ 0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ];
      var groupBases = [ 0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 1e7, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64e6, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 243e5, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176 ];
      BN.prototype.toString = function toString(base, padding) {
        base = base || 10;
        padding = 0 | padding || 1;
        var out;
        if (16 === base || "hex" === base) {
          out = "";
          var off = 0;
          var carry = 0;
          for (var i = 0; i < this.length; i++) {
            var w = this.words[i];
            var word = (16777215 & (w << off | carry)).toString(16);
            carry = w >>> 24 - off & 16777215;
            out = 0 !== carry || i !== this.length - 1 ? zeros[6 - word.length] + word + out : word + out;
            off += 2;
            if (off >= 26) {
              off -= 26;
              i--;
            }
          }
          0 !== carry && (out = carry.toString(16) + out);
          while (out.length % padding !== 0) out = "0" + out;
          0 !== this.negative && (out = "-" + out);
          return out;
        }
        if (base === (0 | base) && base >= 2 && base <= 36) {
          var groupSize = groupSizes[base];
          var groupBase = groupBases[base];
          out = "";
          var c = this.clone();
          c.negative = 0;
          while (!c.isZero()) {
            var r = c.modn(groupBase).toString(base);
            c = c.idivn(groupBase);
            out = c.isZero() ? r + out : zeros[groupSize - r.length] + r + out;
          }
          this.isZero() && (out = "0" + out);
          while (out.length % padding !== 0) out = "0" + out;
          0 !== this.negative && (out = "-" + out);
          return out;
        }
        assert(false, "Base should be between 2 and 36");
      };
      BN.prototype.toNumber = function toNumber() {
        var ret = this.words[0];
        2 === this.length ? ret += 67108864 * this.words[1] : 3 === this.length && 1 === this.words[2] ? ret += 4503599627370496 + 67108864 * this.words[1] : this.length > 2 && assert(false, "Number can only safely store up to 53 bits");
        return 0 !== this.negative ? -ret : ret;
      };
      BN.prototype.toJSON = function toJSON() {
        return this.toString(16);
      };
      BN.prototype.toBuffer = function toBuffer(endian, length) {
        assert("undefined" !== typeof Buffer);
        return this.toArrayLike(Buffer, endian, length);
      };
      BN.prototype.toArray = function toArray(endian, length) {
        return this.toArrayLike(Array, endian, length);
      };
      BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
        var byteLength = this.byteLength();
        var reqLength = length || Math.max(1, byteLength);
        assert(byteLength <= reqLength, "byte array longer than desired length");
        assert(reqLength > 0, "Requested array length <= 0");
        this.strip();
        var littleEndian = "le" === endian;
        var res = new ArrayType(reqLength);
        var b, i;
        var q = this.clone();
        if (littleEndian) {
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(255);
            q.iushrn(8);
            res[i] = b;
          }
          for (;i < reqLength; i++) res[i] = 0;
        } else {
          for (i = 0; i < reqLength - byteLength; i++) res[i] = 0;
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(255);
            q.iushrn(8);
            res[reqLength - i - 1] = b;
          }
        }
        return res;
      };
      Math.clz32 ? BN.prototype._countBits = function _countBits(w) {
        return 32 - Math.clz32(w);
      } : BN.prototype._countBits = function _countBits(w) {
        var t = w;
        var r = 0;
        if (t >= 4096) {
          r += 13;
          t >>>= 13;
        }
        if (t >= 64) {
          r += 7;
          t >>>= 7;
        }
        if (t >= 8) {
          r += 4;
          t >>>= 4;
        }
        if (t >= 2) {
          r += 2;
          t >>>= 2;
        }
        return r + t;
      };
      BN.prototype._zeroBits = function _zeroBits(w) {
        if (0 === w) return 26;
        var t = w;
        var r = 0;
        if (0 === (8191 & t)) {
          r += 13;
          t >>>= 13;
        }
        if (0 === (127 & t)) {
          r += 7;
          t >>>= 7;
        }
        if (0 === (15 & t)) {
          r += 4;
          t >>>= 4;
        }
        if (0 === (3 & t)) {
          r += 2;
          t >>>= 2;
        }
        0 === (1 & t) && r++;
        return r;
      };
      BN.prototype.bitLength = function bitLength() {
        var w = this.words[this.length - 1];
        var hi = this._countBits(w);
        return 26 * (this.length - 1) + hi;
      };
      function toBitArray(num) {
        var w = new Array(num.bitLength());
        for (var bit = 0; bit < w.length; bit++) {
          var off = bit / 26 | 0;
          var wbit = bit % 26;
          w[bit] = (num.words[off] & 1 << wbit) >>> wbit;
        }
        return w;
      }
      BN.prototype.zeroBits = function zeroBits() {
        if (this.isZero()) return 0;
        var r = 0;
        for (var i = 0; i < this.length; i++) {
          var b = this._zeroBits(this.words[i]);
          r += b;
          if (26 !== b) break;
        }
        return r;
      };
      BN.prototype.byteLength = function byteLength() {
        return Math.ceil(this.bitLength() / 8);
      };
      BN.prototype.toTwos = function toTwos(width) {
        if (0 !== this.negative) return this.abs().inotn(width).iaddn(1);
        return this.clone();
      };
      BN.prototype.fromTwos = function fromTwos(width) {
        if (this.testn(width - 1)) return this.notn(width).iaddn(1).ineg();
        return this.clone();
      };
      BN.prototype.isNeg = function isNeg() {
        return 0 !== this.negative;
      };
      BN.prototype.neg = function neg() {
        return this.clone().ineg();
      };
      BN.prototype.ineg = function ineg() {
        this.isZero() || (this.negative ^= 1);
        return this;
      };
      BN.prototype.iuor = function iuor(num) {
        while (this.length < num.length) this.words[this.length++] = 0;
        for (var i = 0; i < num.length; i++) this.words[i] = this.words[i] | num.words[i];
        return this.strip();
      };
      BN.prototype.ior = function ior(num) {
        assert(0 === (this.negative | num.negative));
        return this.iuor(num);
      };
      BN.prototype.or = function or(num) {
        if (this.length > num.length) return this.clone().ior(num);
        return num.clone().ior(this);
      };
      BN.prototype.uor = function uor(num) {
        if (this.length > num.length) return this.clone().iuor(num);
        return num.clone().iuor(this);
      };
      BN.prototype.iuand = function iuand(num) {
        var b;
        b = this.length > num.length ? num : this;
        for (var i = 0; i < b.length; i++) this.words[i] = this.words[i] & num.words[i];
        this.length = b.length;
        return this.strip();
      };
      BN.prototype.iand = function iand(num) {
        assert(0 === (this.negative | num.negative));
        return this.iuand(num);
      };
      BN.prototype.and = function and(num) {
        if (this.length > num.length) return this.clone().iand(num);
        return num.clone().iand(this);
      };
      BN.prototype.uand = function uand(num) {
        if (this.length > num.length) return this.clone().iuand(num);
        return num.clone().iuand(this);
      };
      BN.prototype.iuxor = function iuxor(num) {
        var a;
        var b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        for (var i = 0; i < b.length; i++) this.words[i] = a.words[i] ^ b.words[i];
        if (this !== a) for (;i < a.length; i++) this.words[i] = a.words[i];
        this.length = a.length;
        return this.strip();
      };
      BN.prototype.ixor = function ixor(num) {
        assert(0 === (this.negative | num.negative));
        return this.iuxor(num);
      };
      BN.prototype.xor = function xor(num) {
        if (this.length > num.length) return this.clone().ixor(num);
        return num.clone().ixor(this);
      };
      BN.prototype.uxor = function uxor(num) {
        if (this.length > num.length) return this.clone().iuxor(num);
        return num.clone().iuxor(this);
      };
      BN.prototype.inotn = function inotn(width) {
        assert("number" === typeof width && width >= 0);
        var bytesNeeded = 0 | Math.ceil(width / 26);
        var bitsLeft = width % 26;
        this._expand(bytesNeeded);
        bitsLeft > 0 && bytesNeeded--;
        for (var i = 0; i < bytesNeeded; i++) this.words[i] = 67108863 & ~this.words[i];
        bitsLeft > 0 && (this.words[i] = ~this.words[i] & 67108863 >> 26 - bitsLeft);
        return this.strip();
      };
      BN.prototype.notn = function notn(width) {
        return this.clone().inotn(width);
      };
      BN.prototype.setn = function setn(bit, val) {
        assert("number" === typeof bit && bit >= 0);
        var off = bit / 26 | 0;
        var wbit = bit % 26;
        this._expand(off + 1);
        this.words[off] = val ? this.words[off] | 1 << wbit : this.words[off] & ~(1 << wbit);
        return this.strip();
      };
      BN.prototype.iadd = function iadd(num) {
        var r;
        if (0 !== this.negative && 0 === num.negative) {
          this.negative = 0;
          r = this.isub(num);
          this.negative ^= 1;
          return this._normSign();
        }
        if (0 === this.negative && 0 !== num.negative) {
          num.negative = 0;
          r = this.isub(num);
          num.negative = 1;
          return r._normSign();
        }
        var a, b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (0 | a.words[i]) + (0 | b.words[i]) + carry;
          this.words[i] = 67108863 & r;
          carry = r >>> 26;
        }
        for (;0 !== carry && i < a.length; i++) {
          r = (0 | a.words[i]) + carry;
          this.words[i] = 67108863 & r;
          carry = r >>> 26;
        }
        this.length = a.length;
        if (0 !== carry) {
          this.words[this.length] = carry;
          this.length++;
        } else if (a !== this) for (;i < a.length; i++) this.words[i] = a.words[i];
        return this;
      };
      BN.prototype.add = function add(num) {
        var res;
        if (0 !== num.negative && 0 === this.negative) {
          num.negative = 0;
          res = this.sub(num);
          num.negative ^= 1;
          return res;
        }
        if (0 === num.negative && 0 !== this.negative) {
          this.negative = 0;
          res = num.sub(this);
          this.negative = 1;
          return res;
        }
        if (this.length > num.length) return this.clone().iadd(num);
        return num.clone().iadd(this);
      };
      BN.prototype.isub = function isub(num) {
        if (0 !== num.negative) {
          num.negative = 0;
          var r = this.iadd(num);
          num.negative = 1;
          return r._normSign();
        }
        if (0 !== this.negative) {
          this.negative = 0;
          this.iadd(num);
          this.negative = 1;
          return this._normSign();
        }
        var cmp = this.cmp(num);
        if (0 === cmp) {
          this.negative = 0;
          this.length = 1;
          this.words[0] = 0;
          return this;
        }
        var a, b;
        if (cmp > 0) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (0 | a.words[i]) - (0 | b.words[i]) + carry;
          carry = r >> 26;
          this.words[i] = 67108863 & r;
        }
        for (;0 !== carry && i < a.length; i++) {
          r = (0 | a.words[i]) + carry;
          carry = r >> 26;
          this.words[i] = 67108863 & r;
        }
        if (0 === carry && i < a.length && a !== this) for (;i < a.length; i++) this.words[i] = a.words[i];
        this.length = Math.max(this.length, i);
        a !== this && (this.negative = 1);
        return this.strip();
      };
      BN.prototype.sub = function sub(num) {
        return this.clone().isub(num);
      };
      function smallMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        var len = self.length + num.length | 0;
        out.length = len;
        len = len - 1 | 0;
        var a = 0 | self.words[0];
        var b = 0 | num.words[0];
        var r = a * b;
        var lo = 67108863 & r;
        var carry = r / 67108864 | 0;
        out.words[0] = lo;
        for (var k = 1; k < len; k++) {
          var ncarry = carry >>> 26;
          var rword = 67108863 & carry;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j | 0;
            a = 0 | self.words[i];
            b = 0 | num.words[j];
            r = a * b + rword;
            ncarry += r / 67108864 | 0;
            rword = 67108863 & r;
          }
          out.words[k] = 0 | rword;
          carry = 0 | ncarry;
        }
        0 !== carry ? out.words[k] = 0 | carry : out.length--;
        return out.strip();
      }
      var comb10MulTo = function comb10MulTo(self, num, out) {
        var a = self.words;
        var b = num.words;
        var o = out.words;
        var c = 0;
        var lo;
        var mid;
        var hi;
        var a0 = 0 | a[0];
        var al0 = 8191 & a0;
        var ah0 = a0 >>> 13;
        var a1 = 0 | a[1];
        var al1 = 8191 & a1;
        var ah1 = a1 >>> 13;
        var a2 = 0 | a[2];
        var al2 = 8191 & a2;
        var ah2 = a2 >>> 13;
        var a3 = 0 | a[3];
        var al3 = 8191 & a3;
        var ah3 = a3 >>> 13;
        var a4 = 0 | a[4];
        var al4 = 8191 & a4;
        var ah4 = a4 >>> 13;
        var a5 = 0 | a[5];
        var al5 = 8191 & a5;
        var ah5 = a5 >>> 13;
        var a6 = 0 | a[6];
        var al6 = 8191 & a6;
        var ah6 = a6 >>> 13;
        var a7 = 0 | a[7];
        var al7 = 8191 & a7;
        var ah7 = a7 >>> 13;
        var a8 = 0 | a[8];
        var al8 = 8191 & a8;
        var ah8 = a8 >>> 13;
        var a9 = 0 | a[9];
        var al9 = 8191 & a9;
        var ah9 = a9 >>> 13;
        var b0 = 0 | b[0];
        var bl0 = 8191 & b0;
        var bh0 = b0 >>> 13;
        var b1 = 0 | b[1];
        var bl1 = 8191 & b1;
        var bh1 = b1 >>> 13;
        var b2 = 0 | b[2];
        var bl2 = 8191 & b2;
        var bh2 = b2 >>> 13;
        var b3 = 0 | b[3];
        var bl3 = 8191 & b3;
        var bh3 = b3 >>> 13;
        var b4 = 0 | b[4];
        var bl4 = 8191 & b4;
        var bh4 = b4 >>> 13;
        var b5 = 0 | b[5];
        var bl5 = 8191 & b5;
        var bh5 = b5 >>> 13;
        var b6 = 0 | b[6];
        var bl6 = 8191 & b6;
        var bh6 = b6 >>> 13;
        var b7 = 0 | b[7];
        var bl7 = 8191 & b7;
        var bh7 = b7 >>> 13;
        var b8 = 0 | b[8];
        var bl8 = 8191 & b8;
        var bh8 = b8 >>> 13;
        var b9 = 0 | b[9];
        var bl9 = 8191 & b9;
        var bh9 = b9 >>> 13;
        out.negative = self.negative ^ num.negative;
        out.length = 19;
        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = mid + Math.imul(ah0, bl0) | 0;
        hi = Math.imul(ah0, bh0);
        var w0 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
        w0 &= 67108863;
        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = mid + Math.imul(ah1, bl0) | 0;
        hi = Math.imul(ah1, bh0);
        lo = lo + Math.imul(al0, bl1) | 0;
        mid = mid + Math.imul(al0, bh1) | 0;
        mid = mid + Math.imul(ah0, bl1) | 0;
        hi = hi + Math.imul(ah0, bh1) | 0;
        var w1 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
        w1 &= 67108863;
        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = mid + Math.imul(ah2, bl0) | 0;
        hi = Math.imul(ah2, bh0);
        lo = lo + Math.imul(al1, bl1) | 0;
        mid = mid + Math.imul(al1, bh1) | 0;
        mid = mid + Math.imul(ah1, bl1) | 0;
        hi = hi + Math.imul(ah1, bh1) | 0;
        lo = lo + Math.imul(al0, bl2) | 0;
        mid = mid + Math.imul(al0, bh2) | 0;
        mid = mid + Math.imul(ah0, bl2) | 0;
        hi = hi + Math.imul(ah0, bh2) | 0;
        var w2 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
        w2 &= 67108863;
        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = mid + Math.imul(ah3, bl0) | 0;
        hi = Math.imul(ah3, bh0);
        lo = lo + Math.imul(al2, bl1) | 0;
        mid = mid + Math.imul(al2, bh1) | 0;
        mid = mid + Math.imul(ah2, bl1) | 0;
        hi = hi + Math.imul(ah2, bh1) | 0;
        lo = lo + Math.imul(al1, bl2) | 0;
        mid = mid + Math.imul(al1, bh2) | 0;
        mid = mid + Math.imul(ah1, bl2) | 0;
        hi = hi + Math.imul(ah1, bh2) | 0;
        lo = lo + Math.imul(al0, bl3) | 0;
        mid = mid + Math.imul(al0, bh3) | 0;
        mid = mid + Math.imul(ah0, bl3) | 0;
        hi = hi + Math.imul(ah0, bh3) | 0;
        var w3 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
        w3 &= 67108863;
        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = mid + Math.imul(ah4, bl0) | 0;
        hi = Math.imul(ah4, bh0);
        lo = lo + Math.imul(al3, bl1) | 0;
        mid = mid + Math.imul(al3, bh1) | 0;
        mid = mid + Math.imul(ah3, bl1) | 0;
        hi = hi + Math.imul(ah3, bh1) | 0;
        lo = lo + Math.imul(al2, bl2) | 0;
        mid = mid + Math.imul(al2, bh2) | 0;
        mid = mid + Math.imul(ah2, bl2) | 0;
        hi = hi + Math.imul(ah2, bh2) | 0;
        lo = lo + Math.imul(al1, bl3) | 0;
        mid = mid + Math.imul(al1, bh3) | 0;
        mid = mid + Math.imul(ah1, bl3) | 0;
        hi = hi + Math.imul(ah1, bh3) | 0;
        lo = lo + Math.imul(al0, bl4) | 0;
        mid = mid + Math.imul(al0, bh4) | 0;
        mid = mid + Math.imul(ah0, bl4) | 0;
        hi = hi + Math.imul(ah0, bh4) | 0;
        var w4 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
        w4 &= 67108863;
        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = mid + Math.imul(ah5, bl0) | 0;
        hi = Math.imul(ah5, bh0);
        lo = lo + Math.imul(al4, bl1) | 0;
        mid = mid + Math.imul(al4, bh1) | 0;
        mid = mid + Math.imul(ah4, bl1) | 0;
        hi = hi + Math.imul(ah4, bh1) | 0;
        lo = lo + Math.imul(al3, bl2) | 0;
        mid = mid + Math.imul(al3, bh2) | 0;
        mid = mid + Math.imul(ah3, bl2) | 0;
        hi = hi + Math.imul(ah3, bh2) | 0;
        lo = lo + Math.imul(al2, bl3) | 0;
        mid = mid + Math.imul(al2, bh3) | 0;
        mid = mid + Math.imul(ah2, bl3) | 0;
        hi = hi + Math.imul(ah2, bh3) | 0;
        lo = lo + Math.imul(al1, bl4) | 0;
        mid = mid + Math.imul(al1, bh4) | 0;
        mid = mid + Math.imul(ah1, bl4) | 0;
        hi = hi + Math.imul(ah1, bh4) | 0;
        lo = lo + Math.imul(al0, bl5) | 0;
        mid = mid + Math.imul(al0, bh5) | 0;
        mid = mid + Math.imul(ah0, bl5) | 0;
        hi = hi + Math.imul(ah0, bh5) | 0;
        var w5 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
        w5 &= 67108863;
        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = mid + Math.imul(ah6, bl0) | 0;
        hi = Math.imul(ah6, bh0);
        lo = lo + Math.imul(al5, bl1) | 0;
        mid = mid + Math.imul(al5, bh1) | 0;
        mid = mid + Math.imul(ah5, bl1) | 0;
        hi = hi + Math.imul(ah5, bh1) | 0;
        lo = lo + Math.imul(al4, bl2) | 0;
        mid = mid + Math.imul(al4, bh2) | 0;
        mid = mid + Math.imul(ah4, bl2) | 0;
        hi = hi + Math.imul(ah4, bh2) | 0;
        lo = lo + Math.imul(al3, bl3) | 0;
        mid = mid + Math.imul(al3, bh3) | 0;
        mid = mid + Math.imul(ah3, bl3) | 0;
        hi = hi + Math.imul(ah3, bh3) | 0;
        lo = lo + Math.imul(al2, bl4) | 0;
        mid = mid + Math.imul(al2, bh4) | 0;
        mid = mid + Math.imul(ah2, bl4) | 0;
        hi = hi + Math.imul(ah2, bh4) | 0;
        lo = lo + Math.imul(al1, bl5) | 0;
        mid = mid + Math.imul(al1, bh5) | 0;
        mid = mid + Math.imul(ah1, bl5) | 0;
        hi = hi + Math.imul(ah1, bh5) | 0;
        lo = lo + Math.imul(al0, bl6) | 0;
        mid = mid + Math.imul(al0, bh6) | 0;
        mid = mid + Math.imul(ah0, bl6) | 0;
        hi = hi + Math.imul(ah0, bh6) | 0;
        var w6 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
        w6 &= 67108863;
        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = mid + Math.imul(ah7, bl0) | 0;
        hi = Math.imul(ah7, bh0);
        lo = lo + Math.imul(al6, bl1) | 0;
        mid = mid + Math.imul(al6, bh1) | 0;
        mid = mid + Math.imul(ah6, bl1) | 0;
        hi = hi + Math.imul(ah6, bh1) | 0;
        lo = lo + Math.imul(al5, bl2) | 0;
        mid = mid + Math.imul(al5, bh2) | 0;
        mid = mid + Math.imul(ah5, bl2) | 0;
        hi = hi + Math.imul(ah5, bh2) | 0;
        lo = lo + Math.imul(al4, bl3) | 0;
        mid = mid + Math.imul(al4, bh3) | 0;
        mid = mid + Math.imul(ah4, bl3) | 0;
        hi = hi + Math.imul(ah4, bh3) | 0;
        lo = lo + Math.imul(al3, bl4) | 0;
        mid = mid + Math.imul(al3, bh4) | 0;
        mid = mid + Math.imul(ah3, bl4) | 0;
        hi = hi + Math.imul(ah3, bh4) | 0;
        lo = lo + Math.imul(al2, bl5) | 0;
        mid = mid + Math.imul(al2, bh5) | 0;
        mid = mid + Math.imul(ah2, bl5) | 0;
        hi = hi + Math.imul(ah2, bh5) | 0;
        lo = lo + Math.imul(al1, bl6) | 0;
        mid = mid + Math.imul(al1, bh6) | 0;
        mid = mid + Math.imul(ah1, bl6) | 0;
        hi = hi + Math.imul(ah1, bh6) | 0;
        lo = lo + Math.imul(al0, bl7) | 0;
        mid = mid + Math.imul(al0, bh7) | 0;
        mid = mid + Math.imul(ah0, bl7) | 0;
        hi = hi + Math.imul(ah0, bh7) | 0;
        var w7 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
        w7 &= 67108863;
        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = mid + Math.imul(ah8, bl0) | 0;
        hi = Math.imul(ah8, bh0);
        lo = lo + Math.imul(al7, bl1) | 0;
        mid = mid + Math.imul(al7, bh1) | 0;
        mid = mid + Math.imul(ah7, bl1) | 0;
        hi = hi + Math.imul(ah7, bh1) | 0;
        lo = lo + Math.imul(al6, bl2) | 0;
        mid = mid + Math.imul(al6, bh2) | 0;
        mid = mid + Math.imul(ah6, bl2) | 0;
        hi = hi + Math.imul(ah6, bh2) | 0;
        lo = lo + Math.imul(al5, bl3) | 0;
        mid = mid + Math.imul(al5, bh3) | 0;
        mid = mid + Math.imul(ah5, bl3) | 0;
        hi = hi + Math.imul(ah5, bh3) | 0;
        lo = lo + Math.imul(al4, bl4) | 0;
        mid = mid + Math.imul(al4, bh4) | 0;
        mid = mid + Math.imul(ah4, bl4) | 0;
        hi = hi + Math.imul(ah4, bh4) | 0;
        lo = lo + Math.imul(al3, bl5) | 0;
        mid = mid + Math.imul(al3, bh5) | 0;
        mid = mid + Math.imul(ah3, bl5) | 0;
        hi = hi + Math.imul(ah3, bh5) | 0;
        lo = lo + Math.imul(al2, bl6) | 0;
        mid = mid + Math.imul(al2, bh6) | 0;
        mid = mid + Math.imul(ah2, bl6) | 0;
        hi = hi + Math.imul(ah2, bh6) | 0;
        lo = lo + Math.imul(al1, bl7) | 0;
        mid = mid + Math.imul(al1, bh7) | 0;
        mid = mid + Math.imul(ah1, bl7) | 0;
        hi = hi + Math.imul(ah1, bh7) | 0;
        lo = lo + Math.imul(al0, bl8) | 0;
        mid = mid + Math.imul(al0, bh8) | 0;
        mid = mid + Math.imul(ah0, bl8) | 0;
        hi = hi + Math.imul(ah0, bh8) | 0;
        var w8 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
        w8 &= 67108863;
        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = mid + Math.imul(ah9, bl0) | 0;
        hi = Math.imul(ah9, bh0);
        lo = lo + Math.imul(al8, bl1) | 0;
        mid = mid + Math.imul(al8, bh1) | 0;
        mid = mid + Math.imul(ah8, bl1) | 0;
        hi = hi + Math.imul(ah8, bh1) | 0;
        lo = lo + Math.imul(al7, bl2) | 0;
        mid = mid + Math.imul(al7, bh2) | 0;
        mid = mid + Math.imul(ah7, bl2) | 0;
        hi = hi + Math.imul(ah7, bh2) | 0;
        lo = lo + Math.imul(al6, bl3) | 0;
        mid = mid + Math.imul(al6, bh3) | 0;
        mid = mid + Math.imul(ah6, bl3) | 0;
        hi = hi + Math.imul(ah6, bh3) | 0;
        lo = lo + Math.imul(al5, bl4) | 0;
        mid = mid + Math.imul(al5, bh4) | 0;
        mid = mid + Math.imul(ah5, bl4) | 0;
        hi = hi + Math.imul(ah5, bh4) | 0;
        lo = lo + Math.imul(al4, bl5) | 0;
        mid = mid + Math.imul(al4, bh5) | 0;
        mid = mid + Math.imul(ah4, bl5) | 0;
        hi = hi + Math.imul(ah4, bh5) | 0;
        lo = lo + Math.imul(al3, bl6) | 0;
        mid = mid + Math.imul(al3, bh6) | 0;
        mid = mid + Math.imul(ah3, bl6) | 0;
        hi = hi + Math.imul(ah3, bh6) | 0;
        lo = lo + Math.imul(al2, bl7) | 0;
        mid = mid + Math.imul(al2, bh7) | 0;
        mid = mid + Math.imul(ah2, bl7) | 0;
        hi = hi + Math.imul(ah2, bh7) | 0;
        lo = lo + Math.imul(al1, bl8) | 0;
        mid = mid + Math.imul(al1, bh8) | 0;
        mid = mid + Math.imul(ah1, bl8) | 0;
        hi = hi + Math.imul(ah1, bh8) | 0;
        lo = lo + Math.imul(al0, bl9) | 0;
        mid = mid + Math.imul(al0, bh9) | 0;
        mid = mid + Math.imul(ah0, bl9) | 0;
        hi = hi + Math.imul(ah0, bh9) | 0;
        var w9 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
        w9 &= 67108863;
        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = mid + Math.imul(ah9, bl1) | 0;
        hi = Math.imul(ah9, bh1);
        lo = lo + Math.imul(al8, bl2) | 0;
        mid = mid + Math.imul(al8, bh2) | 0;
        mid = mid + Math.imul(ah8, bl2) | 0;
        hi = hi + Math.imul(ah8, bh2) | 0;
        lo = lo + Math.imul(al7, bl3) | 0;
        mid = mid + Math.imul(al7, bh3) | 0;
        mid = mid + Math.imul(ah7, bl3) | 0;
        hi = hi + Math.imul(ah7, bh3) | 0;
        lo = lo + Math.imul(al6, bl4) | 0;
        mid = mid + Math.imul(al6, bh4) | 0;
        mid = mid + Math.imul(ah6, bl4) | 0;
        hi = hi + Math.imul(ah6, bh4) | 0;
        lo = lo + Math.imul(al5, bl5) | 0;
        mid = mid + Math.imul(al5, bh5) | 0;
        mid = mid + Math.imul(ah5, bl5) | 0;
        hi = hi + Math.imul(ah5, bh5) | 0;
        lo = lo + Math.imul(al4, bl6) | 0;
        mid = mid + Math.imul(al4, bh6) | 0;
        mid = mid + Math.imul(ah4, bl6) | 0;
        hi = hi + Math.imul(ah4, bh6) | 0;
        lo = lo + Math.imul(al3, bl7) | 0;
        mid = mid + Math.imul(al3, bh7) | 0;
        mid = mid + Math.imul(ah3, bl7) | 0;
        hi = hi + Math.imul(ah3, bh7) | 0;
        lo = lo + Math.imul(al2, bl8) | 0;
        mid = mid + Math.imul(al2, bh8) | 0;
        mid = mid + Math.imul(ah2, bl8) | 0;
        hi = hi + Math.imul(ah2, bh8) | 0;
        lo = lo + Math.imul(al1, bl9) | 0;
        mid = mid + Math.imul(al1, bh9) | 0;
        mid = mid + Math.imul(ah1, bl9) | 0;
        hi = hi + Math.imul(ah1, bh9) | 0;
        var w10 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
        w10 &= 67108863;
        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = mid + Math.imul(ah9, bl2) | 0;
        hi = Math.imul(ah9, bh2);
        lo = lo + Math.imul(al8, bl3) | 0;
        mid = mid + Math.imul(al8, bh3) | 0;
        mid = mid + Math.imul(ah8, bl3) | 0;
        hi = hi + Math.imul(ah8, bh3) | 0;
        lo = lo + Math.imul(al7, bl4) | 0;
        mid = mid + Math.imul(al7, bh4) | 0;
        mid = mid + Math.imul(ah7, bl4) | 0;
        hi = hi + Math.imul(ah7, bh4) | 0;
        lo = lo + Math.imul(al6, bl5) | 0;
        mid = mid + Math.imul(al6, bh5) | 0;
        mid = mid + Math.imul(ah6, bl5) | 0;
        hi = hi + Math.imul(ah6, bh5) | 0;
        lo = lo + Math.imul(al5, bl6) | 0;
        mid = mid + Math.imul(al5, bh6) | 0;
        mid = mid + Math.imul(ah5, bl6) | 0;
        hi = hi + Math.imul(ah5, bh6) | 0;
        lo = lo + Math.imul(al4, bl7) | 0;
        mid = mid + Math.imul(al4, bh7) | 0;
        mid = mid + Math.imul(ah4, bl7) | 0;
        hi = hi + Math.imul(ah4, bh7) | 0;
        lo = lo + Math.imul(al3, bl8) | 0;
        mid = mid + Math.imul(al3, bh8) | 0;
        mid = mid + Math.imul(ah3, bl8) | 0;
        hi = hi + Math.imul(ah3, bh8) | 0;
        lo = lo + Math.imul(al2, bl9) | 0;
        mid = mid + Math.imul(al2, bh9) | 0;
        mid = mid + Math.imul(ah2, bl9) | 0;
        hi = hi + Math.imul(ah2, bh9) | 0;
        var w11 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
        w11 &= 67108863;
        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = mid + Math.imul(ah9, bl3) | 0;
        hi = Math.imul(ah9, bh3);
        lo = lo + Math.imul(al8, bl4) | 0;
        mid = mid + Math.imul(al8, bh4) | 0;
        mid = mid + Math.imul(ah8, bl4) | 0;
        hi = hi + Math.imul(ah8, bh4) | 0;
        lo = lo + Math.imul(al7, bl5) | 0;
        mid = mid + Math.imul(al7, bh5) | 0;
        mid = mid + Math.imul(ah7, bl5) | 0;
        hi = hi + Math.imul(ah7, bh5) | 0;
        lo = lo + Math.imul(al6, bl6) | 0;
        mid = mid + Math.imul(al6, bh6) | 0;
        mid = mid + Math.imul(ah6, bl6) | 0;
        hi = hi + Math.imul(ah6, bh6) | 0;
        lo = lo + Math.imul(al5, bl7) | 0;
        mid = mid + Math.imul(al5, bh7) | 0;
        mid = mid + Math.imul(ah5, bl7) | 0;
        hi = hi + Math.imul(ah5, bh7) | 0;
        lo = lo + Math.imul(al4, bl8) | 0;
        mid = mid + Math.imul(al4, bh8) | 0;
        mid = mid + Math.imul(ah4, bl8) | 0;
        hi = hi + Math.imul(ah4, bh8) | 0;
        lo = lo + Math.imul(al3, bl9) | 0;
        mid = mid + Math.imul(al3, bh9) | 0;
        mid = mid + Math.imul(ah3, bl9) | 0;
        hi = hi + Math.imul(ah3, bh9) | 0;
        var w12 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
        w12 &= 67108863;
        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = mid + Math.imul(ah9, bl4) | 0;
        hi = Math.imul(ah9, bh4);
        lo = lo + Math.imul(al8, bl5) | 0;
        mid = mid + Math.imul(al8, bh5) | 0;
        mid = mid + Math.imul(ah8, bl5) | 0;
        hi = hi + Math.imul(ah8, bh5) | 0;
        lo = lo + Math.imul(al7, bl6) | 0;
        mid = mid + Math.imul(al7, bh6) | 0;
        mid = mid + Math.imul(ah7, bl6) | 0;
        hi = hi + Math.imul(ah7, bh6) | 0;
        lo = lo + Math.imul(al6, bl7) | 0;
        mid = mid + Math.imul(al6, bh7) | 0;
        mid = mid + Math.imul(ah6, bl7) | 0;
        hi = hi + Math.imul(ah6, bh7) | 0;
        lo = lo + Math.imul(al5, bl8) | 0;
        mid = mid + Math.imul(al5, bh8) | 0;
        mid = mid + Math.imul(ah5, bl8) | 0;
        hi = hi + Math.imul(ah5, bh8) | 0;
        lo = lo + Math.imul(al4, bl9) | 0;
        mid = mid + Math.imul(al4, bh9) | 0;
        mid = mid + Math.imul(ah4, bl9) | 0;
        hi = hi + Math.imul(ah4, bh9) | 0;
        var w13 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
        w13 &= 67108863;
        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = mid + Math.imul(ah9, bl5) | 0;
        hi = Math.imul(ah9, bh5);
        lo = lo + Math.imul(al8, bl6) | 0;
        mid = mid + Math.imul(al8, bh6) | 0;
        mid = mid + Math.imul(ah8, bl6) | 0;
        hi = hi + Math.imul(ah8, bh6) | 0;
        lo = lo + Math.imul(al7, bl7) | 0;
        mid = mid + Math.imul(al7, bh7) | 0;
        mid = mid + Math.imul(ah7, bl7) | 0;
        hi = hi + Math.imul(ah7, bh7) | 0;
        lo = lo + Math.imul(al6, bl8) | 0;
        mid = mid + Math.imul(al6, bh8) | 0;
        mid = mid + Math.imul(ah6, bl8) | 0;
        hi = hi + Math.imul(ah6, bh8) | 0;
        lo = lo + Math.imul(al5, bl9) | 0;
        mid = mid + Math.imul(al5, bh9) | 0;
        mid = mid + Math.imul(ah5, bl9) | 0;
        hi = hi + Math.imul(ah5, bh9) | 0;
        var w14 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
        w14 &= 67108863;
        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = mid + Math.imul(ah9, bl6) | 0;
        hi = Math.imul(ah9, bh6);
        lo = lo + Math.imul(al8, bl7) | 0;
        mid = mid + Math.imul(al8, bh7) | 0;
        mid = mid + Math.imul(ah8, bl7) | 0;
        hi = hi + Math.imul(ah8, bh7) | 0;
        lo = lo + Math.imul(al7, bl8) | 0;
        mid = mid + Math.imul(al7, bh8) | 0;
        mid = mid + Math.imul(ah7, bl8) | 0;
        hi = hi + Math.imul(ah7, bh8) | 0;
        lo = lo + Math.imul(al6, bl9) | 0;
        mid = mid + Math.imul(al6, bh9) | 0;
        mid = mid + Math.imul(ah6, bl9) | 0;
        hi = hi + Math.imul(ah6, bh9) | 0;
        var w15 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
        w15 &= 67108863;
        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = mid + Math.imul(ah9, bl7) | 0;
        hi = Math.imul(ah9, bh7);
        lo = lo + Math.imul(al8, bl8) | 0;
        mid = mid + Math.imul(al8, bh8) | 0;
        mid = mid + Math.imul(ah8, bl8) | 0;
        hi = hi + Math.imul(ah8, bh8) | 0;
        lo = lo + Math.imul(al7, bl9) | 0;
        mid = mid + Math.imul(al7, bh9) | 0;
        mid = mid + Math.imul(ah7, bl9) | 0;
        hi = hi + Math.imul(ah7, bh9) | 0;
        var w16 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
        w16 &= 67108863;
        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = mid + Math.imul(ah9, bl8) | 0;
        hi = Math.imul(ah9, bh8);
        lo = lo + Math.imul(al8, bl9) | 0;
        mid = mid + Math.imul(al8, bh9) | 0;
        mid = mid + Math.imul(ah8, bl9) | 0;
        hi = hi + Math.imul(ah8, bh9) | 0;
        var w17 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
        w17 &= 67108863;
        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = mid + Math.imul(ah9, bl9) | 0;
        hi = Math.imul(ah9, bh9);
        var w18 = (c + lo | 0) + ((8191 & mid) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
        w18 &= 67108863;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;
        if (0 !== c) {
          o[19] = c;
          out.length++;
        }
        return out;
      };
      Math.imul || (comb10MulTo = smallMulTo);
      function bigMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        out.length = self.length + num.length;
        var carry = 0;
        var hncarry = 0;
        for (var k = 0; k < out.length - 1; k++) {
          var ncarry = hncarry;
          hncarry = 0;
          var rword = 67108863 & carry;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j;
            var a = 0 | self.words[i];
            var b = 0 | num.words[j];
            var r = a * b;
            var lo = 67108863 & r;
            ncarry = ncarry + (r / 67108864 | 0) | 0;
            lo = lo + rword | 0;
            rword = 67108863 & lo;
            ncarry = ncarry + (lo >>> 26) | 0;
            hncarry += ncarry >>> 26;
            ncarry &= 67108863;
          }
          out.words[k] = rword;
          carry = ncarry;
          ncarry = hncarry;
        }
        0 !== carry ? out.words[k] = carry : out.length--;
        return out.strip();
      }
      function jumboMulTo(self, num, out) {
        var fftm = new FFTM();
        return fftm.mulp(self, num, out);
      }
      BN.prototype.mulTo = function mulTo(num, out) {
        var res;
        var len = this.length + num.length;
        res = 10 === this.length && 10 === num.length ? comb10MulTo(this, num, out) : len < 63 ? smallMulTo(this, num, out) : len < 1024 ? bigMulTo(this, num, out) : jumboMulTo(this, num, out);
        return res;
      };
      function FFTM(x, y) {
        this.x = x;
        this.y = y;
      }
      FFTM.prototype.makeRBT = function makeRBT(N) {
        var t = new Array(N);
        var l = BN.prototype._countBits(N) - 1;
        for (var i = 0; i < N; i++) t[i] = this.revBin(i, l, N);
        return t;
      };
      FFTM.prototype.revBin = function revBin(x, l, N) {
        if (0 === x || x === N - 1) return x;
        var rb = 0;
        for (var i = 0; i < l; i++) {
          rb |= (1 & x) << l - i - 1;
          x >>= 1;
        }
        return rb;
      };
      FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
        for (var i = 0; i < N; i++) {
          rtws[i] = rws[rbt[i]];
          itws[i] = iws[rbt[i]];
        }
      };
      FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
        this.permute(rbt, rws, iws, rtws, itws, N);
        for (var s = 1; s < N; s <<= 1) {
          var l = s << 1;
          var rtwdf = Math.cos(2 * Math.PI / l);
          var itwdf = Math.sin(2 * Math.PI / l);
          for (var p = 0; p < N; p += l) {
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;
            for (var j = 0; j < s; j++) {
              var re = rtws[p + j];
              var ie = itws[p + j];
              var ro = rtws[p + j + s];
              var io = itws[p + j + s];
              var rx = rtwdf_ * ro - itwdf_ * io;
              io = rtwdf_ * io + itwdf_ * ro;
              ro = rx;
              rtws[p + j] = re + ro;
              itws[p + j] = ie + io;
              rtws[p + j + s] = re - ro;
              itws[p + j + s] = ie - io;
              if (j !== l) {
                rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                rtwdf_ = rx;
              }
            }
          }
        }
      };
      FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
        var N = 1 | Math.max(m, n);
        var odd = 1 & N;
        var i = 0;
        for (N = N / 2 | 0; N; N >>>= 1) i++;
        return 1 << i + 1 + odd;
      };
      FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
        if (N <= 1) return;
        for (var i = 0; i < N / 2; i++) {
          var t = rws[i];
          rws[i] = rws[N - i - 1];
          rws[N - i - 1] = t;
          t = iws[i];
          iws[i] = -iws[N - i - 1];
          iws[N - i - 1] = -t;
        }
      };
      FFTM.prototype.normalize13b = function normalize13b(ws, N) {
        var carry = 0;
        for (var i = 0; i < N / 2; i++) {
          var w = 8192 * Math.round(ws[2 * i + 1] / N) + Math.round(ws[2 * i] / N) + carry;
          ws[i] = 67108863 & w;
          carry = w < 67108864 ? 0 : w / 67108864 | 0;
        }
        return ws;
      };
      FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
        var carry = 0;
        for (var i = 0; i < len; i++) {
          carry += 0 | ws[i];
          rws[2 * i] = 8191 & carry;
          carry >>>= 13;
          rws[2 * i + 1] = 8191 & carry;
          carry >>>= 13;
        }
        for (i = 2 * len; i < N; ++i) rws[i] = 0;
        assert(0 === carry);
        assert(0 === (-8192 & carry));
      };
      FFTM.prototype.stub = function stub(N) {
        var ph = new Array(N);
        for (var i = 0; i < N; i++) ph[i] = 0;
        return ph;
      };
      FFTM.prototype.mulp = function mulp(x, y, out) {
        var N = 2 * this.guessLen13b(x.length, y.length);
        var rbt = this.makeRBT(N);
        var _ = this.stub(N);
        var rws = new Array(N);
        var rwst = new Array(N);
        var iwst = new Array(N);
        var nrws = new Array(N);
        var nrwst = new Array(N);
        var niwst = new Array(N);
        var rmws = out.words;
        rmws.length = N;
        this.convert13b(x.words, x.length, rws, N);
        this.convert13b(y.words, y.length, nrws, N);
        this.transform(rws, _, rwst, iwst, N, rbt);
        this.transform(nrws, _, nrwst, niwst, N, rbt);
        for (var i = 0; i < N; i++) {
          var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
          iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
          rwst[i] = rx;
        }
        this.conjugate(rwst, iwst, N);
        this.transform(rwst, iwst, rmws, _, N, rbt);
        this.conjugate(rmws, _, N);
        this.normalize13b(rmws, N);
        out.negative = x.negative ^ y.negative;
        out.length = x.length + y.length;
        return out.strip();
      };
      BN.prototype.mul = function mul(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
      };
      BN.prototype.mulf = function mulf(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return jumboMulTo(this, num, out);
      };
      BN.prototype.imul = function imul(num) {
        return this.clone().mulTo(num, this);
      };
      BN.prototype.imuln = function imuln(num) {
        assert("number" === typeof num);
        assert(num < 67108864);
        var carry = 0;
        for (var i = 0; i < this.length; i++) {
          var w = (0 | this.words[i]) * num;
          var lo = (67108863 & w) + (67108863 & carry);
          carry >>= 26;
          carry += w / 67108864 | 0;
          carry += lo >>> 26;
          this.words[i] = 67108863 & lo;
        }
        if (0 !== carry) {
          this.words[i] = carry;
          this.length++;
        }
        return this;
      };
      BN.prototype.muln = function muln(num) {
        return this.clone().imuln(num);
      };
      BN.prototype.sqr = function sqr() {
        return this.mul(this);
      };
      BN.prototype.isqr = function isqr() {
        return this.imul(this.clone());
      };
      BN.prototype.pow = function pow(num) {
        var w = toBitArray(num);
        if (0 === w.length) return new BN(1);
        var res = this;
        for (var i = 0; i < w.length; i++, res = res.sqr()) if (0 !== w[i]) break;
        if (++i < w.length) for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
          if (0 === w[i]) continue;
          res = res.mul(q);
        }
        return res;
      };
      BN.prototype.iushln = function iushln(bits) {
        assert("number" === typeof bits && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        var carryMask = 67108863 >>> 26 - r << 26 - r;
        var i;
        if (0 !== r) {
          var carry = 0;
          for (i = 0; i < this.length; i++) {
            var newCarry = this.words[i] & carryMask;
            var c = (0 | this.words[i]) - newCarry << r;
            this.words[i] = c | carry;
            carry = newCarry >>> 26 - r;
          }
          if (carry) {
            this.words[i] = carry;
            this.length++;
          }
        }
        if (0 !== s) {
          for (i = this.length - 1; i >= 0; i--) this.words[i + s] = this.words[i];
          for (i = 0; i < s; i++) this.words[i] = 0;
          this.length += s;
        }
        return this.strip();
      };
      BN.prototype.ishln = function ishln(bits) {
        assert(0 === this.negative);
        return this.iushln(bits);
      };
      BN.prototype.iushrn = function iushrn(bits, hint, extended) {
        assert("number" === typeof bits && bits >= 0);
        var h;
        h = hint ? (hint - hint % 26) / 26 : 0;
        var r = bits % 26;
        var s = Math.min((bits - r) / 26, this.length);
        var mask = 67108863 ^ 67108863 >>> r << r;
        var maskedWords = extended;
        h -= s;
        h = Math.max(0, h);
        if (maskedWords) {
          for (var i = 0; i < s; i++) maskedWords.words[i] = this.words[i];
          maskedWords.length = s;
        }
        if (0 === s) ; else if (this.length > s) {
          this.length -= s;
          for (i = 0; i < this.length; i++) this.words[i] = this.words[i + s];
        } else {
          this.words[0] = 0;
          this.length = 1;
        }
        var carry = 0;
        for (i = this.length - 1; i >= 0 && (0 !== carry || i >= h); i--) {
          var word = 0 | this.words[i];
          this.words[i] = carry << 26 - r | word >>> r;
          carry = word & mask;
        }
        maskedWords && 0 !== carry && (maskedWords.words[maskedWords.length++] = carry);
        if (0 === this.length) {
          this.words[0] = 0;
          this.length = 1;
        }
        return this.strip();
      };
      BN.prototype.ishrn = function ishrn(bits, hint, extended) {
        assert(0 === this.negative);
        return this.iushrn(bits, hint, extended);
      };
      BN.prototype.shln = function shln(bits) {
        return this.clone().ishln(bits);
      };
      BN.prototype.ushln = function ushln(bits) {
        return this.clone().iushln(bits);
      };
      BN.prototype.shrn = function shrn(bits) {
        return this.clone().ishrn(bits);
      };
      BN.prototype.ushrn = function ushrn(bits) {
        return this.clone().iushrn(bits);
      };
      BN.prototype.testn = function testn(bit) {
        assert("number" === typeof bit && bit >= 0);
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;
        if (this.length <= s) return false;
        var w = this.words[s];
        return !!(w & q);
      };
      BN.prototype.imaskn = function imaskn(bits) {
        assert("number" === typeof bits && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        assert(0 === this.negative, "imaskn works only with positive numbers");
        if (this.length <= s) return this;
        0 !== r && s++;
        this.length = Math.min(s, this.length);
        if (0 !== r) {
          var mask = 67108863 ^ 67108863 >>> r << r;
          this.words[this.length - 1] &= mask;
        }
        return this.strip();
      };
      BN.prototype.maskn = function maskn(bits) {
        return this.clone().imaskn(bits);
      };
      BN.prototype.iaddn = function iaddn(num) {
        assert("number" === typeof num);
        assert(num < 67108864);
        if (num < 0) return this.isubn(-num);
        if (0 !== this.negative) {
          if (1 === this.length && (0 | this.words[0]) < num) {
            this.words[0] = num - (0 | this.words[0]);
            this.negative = 0;
            return this;
          }
          this.negative = 0;
          this.isubn(num);
          this.negative = 1;
          return this;
        }
        return this._iaddn(num);
      };
      BN.prototype._iaddn = function _iaddn(num) {
        this.words[0] += num;
        for (var i = 0; i < this.length && this.words[i] >= 67108864; i++) {
          this.words[i] -= 67108864;
          i === this.length - 1 ? this.words[i + 1] = 1 : this.words[i + 1]++;
        }
        this.length = Math.max(this.length, i + 1);
        return this;
      };
      BN.prototype.isubn = function isubn(num) {
        assert("number" === typeof num);
        assert(num < 67108864);
        if (num < 0) return this.iaddn(-num);
        if (0 !== this.negative) {
          this.negative = 0;
          this.iaddn(num);
          this.negative = 1;
          return this;
        }
        this.words[0] -= num;
        if (1 === this.length && this.words[0] < 0) {
          this.words[0] = -this.words[0];
          this.negative = 1;
        } else for (var i = 0; i < this.length && this.words[i] < 0; i++) {
          this.words[i] += 67108864;
          this.words[i + 1] -= 1;
        }
        return this.strip();
      };
      BN.prototype.addn = function addn(num) {
        return this.clone().iaddn(num);
      };
      BN.prototype.subn = function subn(num) {
        return this.clone().isubn(num);
      };
      BN.prototype.iabs = function iabs() {
        this.negative = 0;
        return this;
      };
      BN.prototype.abs = function abs() {
        return this.clone().iabs();
      };
      BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
        var len = num.length + shift;
        var i;
        this._expand(len);
        var w;
        var carry = 0;
        for (i = 0; i < num.length; i++) {
          w = (0 | this.words[i + shift]) + carry;
          var right = (0 | num.words[i]) * mul;
          w -= 67108863 & right;
          carry = (w >> 26) - (right / 67108864 | 0);
          this.words[i + shift] = 67108863 & w;
        }
        for (;i < this.length - shift; i++) {
          w = (0 | this.words[i + shift]) + carry;
          carry = w >> 26;
          this.words[i + shift] = 67108863 & w;
        }
        if (0 === carry) return this.strip();
        assert(-1 === carry);
        carry = 0;
        for (i = 0; i < this.length; i++) {
          w = -(0 | this.words[i]) + carry;
          carry = w >> 26;
          this.words[i] = 67108863 & w;
        }
        this.negative = 1;
        return this.strip();
      };
      BN.prototype._wordDiv = function _wordDiv(num, mode) {
        var shift = this.length - num.length;
        var a = this.clone();
        var b = num;
        var bhi = 0 | b.words[b.length - 1];
        var bhiBits = this._countBits(bhi);
        shift = 26 - bhiBits;
        if (0 !== shift) {
          b = b.ushln(shift);
          a.iushln(shift);
          bhi = 0 | b.words[b.length - 1];
        }
        var m = a.length - b.length;
        var q;
        if ("mod" !== mode) {
          q = new BN(null);
          q.length = m + 1;
          q.words = new Array(q.length);
          for (var i = 0; i < q.length; i++) q.words[i] = 0;
        }
        var diff = a.clone()._ishlnsubmul(b, 1, m);
        if (0 === diff.negative) {
          a = diff;
          q && (q.words[m] = 1);
        }
        for (var j = m - 1; j >= 0; j--) {
          var qj = 67108864 * (0 | a.words[b.length + j]) + (0 | a.words[b.length + j - 1]);
          qj = Math.min(qj / bhi | 0, 67108863);
          a._ishlnsubmul(b, qj, j);
          while (0 !== a.negative) {
            qj--;
            a.negative = 0;
            a._ishlnsubmul(b, 1, j);
            a.isZero() || (a.negative ^= 1);
          }
          q && (q.words[j] = qj);
        }
        q && q.strip();
        a.strip();
        "div" !== mode && 0 !== shift && a.iushrn(shift);
        return {
          div: q || null,
          mod: a
        };
      };
      BN.prototype.divmod = function divmod(num, mode, positive) {
        assert(!num.isZero());
        if (this.isZero()) return {
          div: new BN(0),
          mod: new BN(0)
        };
        var div, mod, res;
        if (0 !== this.negative && 0 === num.negative) {
          res = this.neg().divmod(num, mode);
          "mod" !== mode && (div = res.div.neg());
          if ("div" !== mode) {
            mod = res.mod.neg();
            positive && 0 !== mod.negative && mod.iadd(num);
          }
          return {
            div: div,
            mod: mod
          };
        }
        if (0 === this.negative && 0 !== num.negative) {
          res = this.divmod(num.neg(), mode);
          "mod" !== mode && (div = res.div.neg());
          return {
            div: div,
            mod: res.mod
          };
        }
        if (0 !== (this.negative & num.negative)) {
          res = this.neg().divmod(num.neg(), mode);
          if ("div" !== mode) {
            mod = res.mod.neg();
            positive && 0 !== mod.negative && mod.isub(num);
          }
          return {
            div: res.div,
            mod: mod
          };
        }
        if (num.length > this.length || this.cmp(num) < 0) return {
          div: new BN(0),
          mod: this
        };
        if (1 === num.length) {
          if ("div" === mode) return {
            div: this.divn(num.words[0]),
            mod: null
          };
          if ("mod" === mode) return {
            div: null,
            mod: new BN(this.modn(num.words[0]))
          };
          return {
            div: this.divn(num.words[0]),
            mod: new BN(this.modn(num.words[0]))
          };
        }
        return this._wordDiv(num, mode);
      };
      BN.prototype.div = function div(num) {
        return this.divmod(num, "div", false).div;
      };
      BN.prototype.mod = function mod(num) {
        return this.divmod(num, "mod", false).mod;
      };
      BN.prototype.umod = function umod(num) {
        return this.divmod(num, "mod", true).mod;
      };
      BN.prototype.divRound = function divRound(num) {
        var dm = this.divmod(num);
        if (dm.mod.isZero()) return dm.div;
        var mod = 0 !== dm.div.negative ? dm.mod.isub(num) : dm.mod;
        var half = num.ushrn(1);
        var r2 = num.andln(1);
        var cmp = mod.cmp(half);
        if (cmp < 0 || 1 === r2 && 0 === cmp) return dm.div;
        return 0 !== dm.div.negative ? dm.div.isubn(1) : dm.div.iaddn(1);
      };
      BN.prototype.modn = function modn(num) {
        assert(num <= 67108863);
        var p = (1 << 26) % num;
        var acc = 0;
        for (var i = this.length - 1; i >= 0; i--) acc = (p * acc + (0 | this.words[i])) % num;
        return acc;
      };
      BN.prototype.idivn = function idivn(num) {
        assert(num <= 67108863);
        var carry = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var w = (0 | this.words[i]) + 67108864 * carry;
          this.words[i] = w / num | 0;
          carry = w % num;
        }
        return this.strip();
      };
      BN.prototype.divn = function divn(num) {
        return this.clone().idivn(num);
      };
      BN.prototype.egcd = function egcd(p) {
        assert(0 === p.negative);
        assert(!p.isZero());
        var x = this;
        var y = p.clone();
        x = 0 !== x.negative ? x.umod(p) : x.clone();
        var A = new BN(1);
        var B = new BN(0);
        var C = new BN(0);
        var D = new BN(1);
        var g = 0;
        while (x.isEven() && y.isEven()) {
          x.iushrn(1);
          y.iushrn(1);
          ++g;
        }
        var yp = y.clone();
        var xp = x.clone();
        while (!x.isZero()) {
          for (var i = 0, im = 1; 0 === (x.words[0] & im) && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            x.iushrn(i);
            while (i-- > 0) {
              if (A.isOdd() || B.isOdd()) {
                A.iadd(yp);
                B.isub(xp);
              }
              A.iushrn(1);
              B.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; 0 === (y.words[0] & jm) && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            y.iushrn(j);
            while (j-- > 0) {
              if (C.isOdd() || D.isOdd()) {
                C.iadd(yp);
                D.isub(xp);
              }
              C.iushrn(1);
              D.iushrn(1);
            }
          }
          if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
          } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
          }
        }
        return {
          a: C,
          b: D,
          gcd: y.iushln(g)
        };
      };
      BN.prototype._invmp = function _invmp(p) {
        assert(0 === p.negative);
        assert(!p.isZero());
        var a = this;
        var b = p.clone();
        a = 0 !== a.negative ? a.umod(p) : a.clone();
        var x1 = new BN(1);
        var x2 = new BN(0);
        var delta = b.clone();
        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
          for (var i = 0, im = 1; 0 === (a.words[0] & im) && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            a.iushrn(i);
            while (i-- > 0) {
              x1.isOdd() && x1.iadd(delta);
              x1.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; 0 === (b.words[0] & jm) && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            b.iushrn(j);
            while (j-- > 0) {
              x2.isOdd() && x2.iadd(delta);
              x2.iushrn(1);
            }
          }
          if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
          } else {
            b.isub(a);
            x2.isub(x1);
          }
        }
        var res;
        res = 0 === a.cmpn(1) ? x1 : x2;
        res.cmpn(0) < 0 && res.iadd(p);
        return res;
      };
      BN.prototype.gcd = function gcd(num) {
        if (this.isZero()) return num.abs();
        if (num.isZero()) return this.abs();
        var a = this.clone();
        var b = num.clone();
        a.negative = 0;
        b.negative = 0;
        for (var shift = 0; a.isEven() && b.isEven(); shift++) {
          a.iushrn(1);
          b.iushrn(1);
        }
        do {
          while (a.isEven()) a.iushrn(1);
          while (b.isEven()) b.iushrn(1);
          var r = a.cmp(b);
          if (r < 0) {
            var t = a;
            a = b;
            b = t;
          } else if (0 === r || 0 === b.cmpn(1)) break;
          a.isub(b);
        } while (true);
        return b.iushln(shift);
      };
      BN.prototype.invm = function invm(num) {
        return this.egcd(num).a.umod(num);
      };
      BN.prototype.isEven = function isEven() {
        return 0 === (1 & this.words[0]);
      };
      BN.prototype.isOdd = function isOdd() {
        return 1 === (1 & this.words[0]);
      };
      BN.prototype.andln = function andln(num) {
        return this.words[0] & num;
      };
      BN.prototype.bincn = function bincn(bit) {
        assert("number" === typeof bit);
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;
        if (this.length <= s) {
          this._expand(s + 1);
          this.words[s] |= q;
          return this;
        }
        var carry = q;
        for (var i = s; 0 !== carry && i < this.length; i++) {
          var w = 0 | this.words[i];
          w += carry;
          carry = w >>> 26;
          w &= 67108863;
          this.words[i] = w;
        }
        if (0 !== carry) {
          this.words[i] = carry;
          this.length++;
        }
        return this;
      };
      BN.prototype.isZero = function isZero() {
        return 1 === this.length && 0 === this.words[0];
      };
      BN.prototype.cmpn = function cmpn(num) {
        var negative = num < 0;
        if (0 !== this.negative && !negative) return -1;
        if (0 === this.negative && negative) return 1;
        this.strip();
        var res;
        if (this.length > 1) res = 1; else {
          negative && (num = -num);
          assert(num <= 67108863, "Number is too big");
          var w = 0 | this.words[0];
          res = w === num ? 0 : w < num ? -1 : 1;
        }
        if (0 !== this.negative) return 0 | -res;
        return res;
      };
      BN.prototype.cmp = function cmp(num) {
        if (0 !== this.negative && 0 === num.negative) return -1;
        if (0 === this.negative && 0 !== num.negative) return 1;
        var res = this.ucmp(num);
        if (0 !== this.negative) return 0 | -res;
        return res;
      };
      BN.prototype.ucmp = function ucmp(num) {
        if (this.length > num.length) return 1;
        if (this.length < num.length) return -1;
        var res = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var a = 0 | this.words[i];
          var b = 0 | num.words[i];
          if (a === b) continue;
          a < b ? res = -1 : a > b && (res = 1);
          break;
        }
        return res;
      };
      BN.prototype.gtn = function gtn(num) {
        return 1 === this.cmpn(num);
      };
      BN.prototype.gt = function gt(num) {
        return 1 === this.cmp(num);
      };
      BN.prototype.gten = function gten(num) {
        return this.cmpn(num) >= 0;
      };
      BN.prototype.gte = function gte(num) {
        return this.cmp(num) >= 0;
      };
      BN.prototype.ltn = function ltn(num) {
        return -1 === this.cmpn(num);
      };
      BN.prototype.lt = function lt(num) {
        return -1 === this.cmp(num);
      };
      BN.prototype.lten = function lten(num) {
        return this.cmpn(num) <= 0;
      };
      BN.prototype.lte = function lte(num) {
        return this.cmp(num) <= 0;
      };
      BN.prototype.eqn = function eqn(num) {
        return 0 === this.cmpn(num);
      };
      BN.prototype.eq = function eq(num) {
        return 0 === this.cmp(num);
      };
      BN.red = function red(num) {
        return new Red(num);
      };
      BN.prototype.toRed = function toRed(ctx) {
        assert(!this.red, "Already a number in reduction context");
        assert(0 === this.negative, "red works only with positives");
        return ctx.convertTo(this)._forceRed(ctx);
      };
      BN.prototype.fromRed = function fromRed() {
        assert(this.red, "fromRed works only with numbers in reduction context");
        return this.red.convertFrom(this);
      };
      BN.prototype._forceRed = function _forceRed(ctx) {
        this.red = ctx;
        return this;
      };
      BN.prototype.forceRed = function forceRed(ctx) {
        assert(!this.red, "Already a number in reduction context");
        return this._forceRed(ctx);
      };
      BN.prototype.redAdd = function redAdd(num) {
        assert(this.red, "redAdd works only with red numbers");
        return this.red.add(this, num);
      };
      BN.prototype.redIAdd = function redIAdd(num) {
        assert(this.red, "redIAdd works only with red numbers");
        return this.red.iadd(this, num);
      };
      BN.prototype.redSub = function redSub(num) {
        assert(this.red, "redSub works only with red numbers");
        return this.red.sub(this, num);
      };
      BN.prototype.redISub = function redISub(num) {
        assert(this.red, "redISub works only with red numbers");
        return this.red.isub(this, num);
      };
      BN.prototype.redShl = function redShl(num) {
        assert(this.red, "redShl works only with red numbers");
        return this.red.shl(this, num);
      };
      BN.prototype.redMul = function redMul(num) {
        assert(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.mul(this, num);
      };
      BN.prototype.redIMul = function redIMul(num) {
        assert(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.imul(this, num);
      };
      BN.prototype.redSqr = function redSqr() {
        assert(this.red, "redSqr works only with red numbers");
        this.red._verify1(this);
        return this.red.sqr(this);
      };
      BN.prototype.redISqr = function redISqr() {
        assert(this.red, "redISqr works only with red numbers");
        this.red._verify1(this);
        return this.red.isqr(this);
      };
      BN.prototype.redSqrt = function redSqrt() {
        assert(this.red, "redSqrt works only with red numbers");
        this.red._verify1(this);
        return this.red.sqrt(this);
      };
      BN.prototype.redInvm = function redInvm() {
        assert(this.red, "redInvm works only with red numbers");
        this.red._verify1(this);
        return this.red.invm(this);
      };
      BN.prototype.redNeg = function redNeg() {
        assert(this.red, "redNeg works only with red numbers");
        this.red._verify1(this);
        return this.red.neg(this);
      };
      BN.prototype.redPow = function redPow(num) {
        assert(this.red && !num.red, "redPow(normalNum)");
        this.red._verify1(this);
        return this.red.pow(this, num);
      };
      var primes = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      };
      function MPrime(name, p) {
        this.name = name;
        this.p = new BN(p, 16);
        this.n = this.p.bitLength();
        this.k = new BN(1).iushln(this.n).isub(this.p);
        this.tmp = this._tmp();
      }
      MPrime.prototype._tmp = function _tmp() {
        var tmp = new BN(null);
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
      };
      MPrime.prototype.ireduce = function ireduce(num) {
        var r = num;
        var rlen;
        do {
          this.split(r, this.tmp);
          r = this.imulK(r);
          r = r.iadd(this.tmp);
          rlen = r.bitLength();
        } while (rlen > this.n);
        var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
        if (0 === cmp) {
          r.words[0] = 0;
          r.length = 1;
        } else cmp > 0 ? r.isub(this.p) : r.strip();
        return r;
      };
      MPrime.prototype.split = function split(input, out) {
        input.iushrn(this.n, 0, out);
      };
      MPrime.prototype.imulK = function imulK(num) {
        return num.imul(this.k);
      };
      function K256() {
        MPrime.call(this, "k256", "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f");
      }
      inherits(K256, MPrime);
      K256.prototype.split = function split(input, output) {
        var mask = 4194303;
        var outLen = Math.min(input.length, 9);
        for (var i = 0; i < outLen; i++) output.words[i] = input.words[i];
        output.length = outLen;
        if (input.length <= 9) {
          input.words[0] = 0;
          input.length = 1;
          return;
        }
        var prev = input.words[9];
        output.words[output.length++] = prev & mask;
        for (i = 10; i < input.length; i++) {
          var next = 0 | input.words[i];
          input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
          prev = next;
        }
        prev >>>= 22;
        input.words[i - 10] = prev;
        0 === prev && input.length > 10 ? input.length -= 10 : input.length -= 9;
      };
      K256.prototype.imulK = function imulK(num) {
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2;
        var lo = 0;
        for (var i = 0; i < num.length; i++) {
          var w = 0 | num.words[i];
          lo += 977 * w;
          num.words[i] = 67108863 & lo;
          lo = 64 * w + (lo / 67108864 | 0);
        }
        if (0 === num.words[num.length - 1]) {
          num.length--;
          0 === num.words[num.length - 1] && num.length--;
        }
        return num;
      };
      function P224() {
        MPrime.call(this, "p224", "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001");
      }
      inherits(P224, MPrime);
      function P192() {
        MPrime.call(this, "p192", "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff");
      }
      inherits(P192, MPrime);
      function P25519() {
        MPrime.call(this, "25519", "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed");
      }
      inherits(P25519, MPrime);
      P25519.prototype.imulK = function imulK(num) {
        var carry = 0;
        for (var i = 0; i < num.length; i++) {
          var hi = 19 * (0 | num.words[i]) + carry;
          var lo = 67108863 & hi;
          hi >>>= 26;
          num.words[i] = lo;
          carry = hi;
        }
        0 !== carry && (num.words[num.length++] = carry);
        return num;
      };
      BN._prime = function prime(name) {
        if (primes[name]) return primes[name];
        var prime;
        if ("k256" === name) prime = new K256(); else if ("p224" === name) prime = new P224(); else if ("p192" === name) prime = new P192(); else {
          if ("p25519" !== name) throw new Error("Unknown prime " + name);
          prime = new P25519();
        }
        primes[name] = prime;
        return prime;
      };
      function Red(m) {
        if ("string" === typeof m) {
          var prime = BN._prime(m);
          this.m = prime.p;
          this.prime = prime;
        } else {
          assert(m.gtn(1), "modulus must be greater than 1");
          this.m = m;
          this.prime = null;
        }
      }
      Red.prototype._verify1 = function _verify1(a) {
        assert(0 === a.negative, "red works only with positives");
        assert(a.red, "red works only with red numbers");
      };
      Red.prototype._verify2 = function _verify2(a, b) {
        assert(0 === (a.negative | b.negative), "red works only with positives");
        assert(a.red && a.red === b.red, "red works only with red numbers");
      };
      Red.prototype.imod = function imod(a) {
        if (this.prime) return this.prime.ireduce(a)._forceRed(this);
        return a.umod(this.m)._forceRed(this);
      };
      Red.prototype.neg = function neg(a) {
        if (a.isZero()) return a.clone();
        return this.m.sub(a)._forceRed(this);
      };
      Red.prototype.add = function add(a, b) {
        this._verify2(a, b);
        var res = a.add(b);
        res.cmp(this.m) >= 0 && res.isub(this.m);
        return res._forceRed(this);
      };
      Red.prototype.iadd = function iadd(a, b) {
        this._verify2(a, b);
        var res = a.iadd(b);
        res.cmp(this.m) >= 0 && res.isub(this.m);
        return res;
      };
      Red.prototype.sub = function sub(a, b) {
        this._verify2(a, b);
        var res = a.sub(b);
        res.cmpn(0) < 0 && res.iadd(this.m);
        return res._forceRed(this);
      };
      Red.prototype.isub = function isub(a, b) {
        this._verify2(a, b);
        var res = a.isub(b);
        res.cmpn(0) < 0 && res.iadd(this.m);
        return res;
      };
      Red.prototype.shl = function shl(a, num) {
        this._verify1(a);
        return this.imod(a.ushln(num));
      };
      Red.prototype.imul = function imul(a, b) {
        this._verify2(a, b);
        return this.imod(a.imul(b));
      };
      Red.prototype.mul = function mul(a, b) {
        this._verify2(a, b);
        return this.imod(a.mul(b));
      };
      Red.prototype.isqr = function isqr(a) {
        return this.imul(a, a.clone());
      };
      Red.prototype.sqr = function sqr(a) {
        return this.mul(a, a);
      };
      Red.prototype.sqrt = function sqrt(a) {
        if (a.isZero()) return a.clone();
        var mod3 = this.m.andln(3);
        assert(mod3 % 2 === 1);
        if (3 === mod3) {
          var pow = this.m.add(new BN(1)).iushrn(2);
          return this.pow(a, pow);
        }
        var q = this.m.subn(1);
        var s = 0;
        while (!q.isZero() && 0 === q.andln(1)) {
          s++;
          q.iushrn(1);
        }
        assert(!q.isZero());
        var one = new BN(1).toRed(this);
        var nOne = one.redNeg();
        var lpow = this.m.subn(1).iushrn(1);
        var z = this.m.bitLength();
        z = new BN(2 * z * z).toRed(this);
        while (0 !== this.pow(z, lpow).cmp(nOne)) z.redIAdd(nOne);
        var c = this.pow(z, q);
        var r = this.pow(a, q.addn(1).iushrn(1));
        var t = this.pow(a, q);
        var m = s;
        while (0 !== t.cmp(one)) {
          var tmp = t;
          for (var i = 0; 0 !== tmp.cmp(one); i++) tmp = tmp.redSqr();
          assert(i < m);
          var b = this.pow(c, new BN(1).iushln(m - i - 1));
          r = r.redMul(b);
          c = b.redSqr();
          t = t.redMul(c);
          m = i;
        }
        return r;
      };
      Red.prototype.invm = function invm(a) {
        var inv = a._invmp(this.m);
        if (0 !== inv.negative) {
          inv.negative = 0;
          return this.imod(inv).redNeg();
        }
        return this.imod(inv);
      };
      Red.prototype.pow = function pow(a, num) {
        if (num.isZero()) return new BN(1).toRed(this);
        if (0 === num.cmpn(1)) return a.clone();
        var windowSize = 4;
        var wnd = new Array(1 << windowSize);
        wnd[0] = new BN(1).toRed(this);
        wnd[1] = a;
        for (var i = 2; i < wnd.length; i++) wnd[i] = this.mul(wnd[i - 1], a);
        var res = wnd[0];
        var current = 0;
        var currentLen = 0;
        var start = num.bitLength() % 26;
        0 === start && (start = 26);
        for (i = num.length - 1; i >= 0; i--) {
          var word = num.words[i];
          for (var j = start - 1; j >= 0; j--) {
            var bit = word >> j & 1;
            res !== wnd[0] && (res = this.sqr(res));
            if (0 === bit && 0 === current) {
              currentLen = 0;
              continue;
            }
            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (0 !== i || 0 !== j)) continue;
            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
          }
          start = 26;
        }
        return res;
      };
      Red.prototype.convertTo = function convertTo(num) {
        var r = num.umod(this.m);
        return r === num ? r.clone() : r;
      };
      Red.prototype.convertFrom = function convertFrom(num) {
        var res = num.clone();
        res.red = null;
        return res;
      };
      BN.mont = function mont(num) {
        return new Mont(num);
      };
      function Mont(m) {
        Red.call(this, m);
        this.shift = this.m.bitLength();
        this.shift % 26 !== 0 && (this.shift += 26 - this.shift % 26);
        this.r = new BN(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);
        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
      }
      inherits(Mont, Red);
      Mont.prototype.convertTo = function convertTo(num) {
        return this.imod(num.ushln(this.shift));
      };
      Mont.prototype.convertFrom = function convertFrom(num) {
        var r = this.imod(num.mul(this.rinv));
        r.red = null;
        return r;
      };
      Mont.prototype.imul = function imul(a, b) {
        if (a.isZero() || b.isZero()) {
          a.words[0] = 0;
          a.length = 1;
          return a;
        }
        var t = a.imul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        u.cmp(this.m) >= 0 ? res = u.isub(this.m) : u.cmpn(0) < 0 && (res = u.iadd(this.m));
        return res._forceRed(this);
      };
      Mont.prototype.mul = function mul(a, b) {
        if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
        var t = a.mul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        u.cmp(this.m) >= 0 ? res = u.isub(this.m) : u.cmpn(0) < 0 && (res = u.iadd(this.m));
        return res._forceRed(this);
      };
      Mont.prototype.invm = function invm(a) {
        var res = this.imod(a._invmp(this.m).mul(this.r2));
        return res._forceRed(this);
      };
    })("undefined" === typeof module || module, this);
  }, {
    buffer: 18
  } ],
  17: [ function(require, module, exports) {
    var r;
    module.exports = function rand(len) {
      r || (r = new Rand(null));
      return r.generate(len);
    };
    function Rand(rand) {
      this.rand = rand;
    }
    module.exports.Rand = Rand;
    Rand.prototype.generate = function generate(len) {
      return this._rand(len);
    };
    Rand.prototype._rand = function _rand(n) {
      if (this.rand.getBytes) return this.rand.getBytes(n);
      var res = new Uint8Array(n);
      for (var i = 0; i < res.length; i++) res[i] = this.rand.getByte();
      return res;
    };
    if ("object" === typeof self) self.crypto && self.crypto.getRandomValues ? Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.crypto.getRandomValues(arr);
      return arr;
    } : self.msCrypto && self.msCrypto.getRandomValues ? Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.msCrypto.getRandomValues(arr);
      return arr;
    } : "object" === typeof window && (Rand.prototype._rand = function() {
      throw new Error("Not implemented yet");
    }); else try {
      var crypto = require("crypto");
      if ("function" !== typeof crypto.randomBytes) throw new Error("Not supported");
      Rand.prototype._rand = function _rand(n) {
        return crypto.randomBytes(n);
      };
    } catch (e) {}
  }, {
    crypto: 18
  } ],
  18: [ function(require, module, exports) {}, {} ],
  19: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    function asUInt32Array(buf) {
      Buffer.isBuffer(buf) || (buf = Buffer.from(buf));
      var len = buf.length / 4 | 0;
      var out = new Array(len);
      for (var i = 0; i < len; i++) out[i] = buf.readUInt32BE(4 * i);
      return out;
    }
    function scrubVec(v) {
      for (var i = 0; i < v.length; v++) v[i] = 0;
    }
    function cryptBlock(M, keySchedule, SUB_MIX, SBOX, nRounds) {
      var SUB_MIX0 = SUB_MIX[0];
      var SUB_MIX1 = SUB_MIX[1];
      var SUB_MIX2 = SUB_MIX[2];
      var SUB_MIX3 = SUB_MIX[3];
      var s0 = M[0] ^ keySchedule[0];
      var s1 = M[1] ^ keySchedule[1];
      var s2 = M[2] ^ keySchedule[2];
      var s3 = M[3] ^ keySchedule[3];
      var t0, t1, t2, t3;
      var ksRow = 4;
      for (var round = 1; round < nRounds; round++) {
        t0 = SUB_MIX0[s0 >>> 24] ^ SUB_MIX1[s1 >>> 16 & 255] ^ SUB_MIX2[s2 >>> 8 & 255] ^ SUB_MIX3[255 & s3] ^ keySchedule[ksRow++];
        t1 = SUB_MIX0[s1 >>> 24] ^ SUB_MIX1[s2 >>> 16 & 255] ^ SUB_MIX2[s3 >>> 8 & 255] ^ SUB_MIX3[255 & s0] ^ keySchedule[ksRow++];
        t2 = SUB_MIX0[s2 >>> 24] ^ SUB_MIX1[s3 >>> 16 & 255] ^ SUB_MIX2[s0 >>> 8 & 255] ^ SUB_MIX3[255 & s1] ^ keySchedule[ksRow++];
        t3 = SUB_MIX0[s3 >>> 24] ^ SUB_MIX1[s0 >>> 16 & 255] ^ SUB_MIX2[s1 >>> 8 & 255] ^ SUB_MIX3[255 & s2] ^ keySchedule[ksRow++];
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;
      }
      t0 = (SBOX[s0 >>> 24] << 24 | SBOX[s1 >>> 16 & 255] << 16 | SBOX[s2 >>> 8 & 255] << 8 | SBOX[255 & s3]) ^ keySchedule[ksRow++];
      t1 = (SBOX[s1 >>> 24] << 24 | SBOX[s2 >>> 16 & 255] << 16 | SBOX[s3 >>> 8 & 255] << 8 | SBOX[255 & s0]) ^ keySchedule[ksRow++];
      t2 = (SBOX[s2 >>> 24] << 24 | SBOX[s3 >>> 16 & 255] << 16 | SBOX[s0 >>> 8 & 255] << 8 | SBOX[255 & s1]) ^ keySchedule[ksRow++];
      t3 = (SBOX[s3 >>> 24] << 24 | SBOX[s0 >>> 16 & 255] << 16 | SBOX[s1 >>> 8 & 255] << 8 | SBOX[255 & s2]) ^ keySchedule[ksRow++];
      t0 >>>= 0;
      t1 >>>= 0;
      t2 >>>= 0;
      t3 >>>= 0;
      return [ t0, t1, t2, t3 ];
    }
    var RCON = [ 0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54 ];
    var G = function() {
      var d = new Array(256);
      for (var j = 0; j < 256; j++) d[j] = j < 128 ? j << 1 : j << 1 ^ 283;
      var SBOX = [];
      var INV_SBOX = [];
      var SUB_MIX = [ [], [], [], [] ];
      var INV_SUB_MIX = [ [], [], [], [] ];
      var x = 0;
      var xi = 0;
      for (var i = 0; i < 256; ++i) {
        var sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
        sx = sx >>> 8 ^ 255 & sx ^ 99;
        SBOX[x] = sx;
        INV_SBOX[sx] = x;
        var x2 = d[x];
        var x4 = d[x2];
        var x8 = d[x4];
        var t = 257 * d[sx] ^ 16843008 * sx;
        SUB_MIX[0][x] = t << 24 | t >>> 8;
        SUB_MIX[1][x] = t << 16 | t >>> 16;
        SUB_MIX[2][x] = t << 8 | t >>> 24;
        SUB_MIX[3][x] = t;
        t = 16843009 * x8 ^ 65537 * x4 ^ 257 * x2 ^ 16843008 * x;
        INV_SUB_MIX[0][sx] = t << 24 | t >>> 8;
        INV_SUB_MIX[1][sx] = t << 16 | t >>> 16;
        INV_SUB_MIX[2][sx] = t << 8 | t >>> 24;
        INV_SUB_MIX[3][sx] = t;
        if (0 === x) x = xi = 1; else {
          x = x2 ^ d[d[d[x8 ^ x2]]];
          xi ^= d[d[xi]];
        }
      }
      return {
        SBOX: SBOX,
        INV_SBOX: INV_SBOX,
        SUB_MIX: SUB_MIX,
        INV_SUB_MIX: INV_SUB_MIX
      };
    }();
    function AES(key) {
      this._key = asUInt32Array(key);
      this._reset();
    }
    AES.blockSize = 16;
    AES.keySize = 32;
    AES.prototype.blockSize = AES.blockSize;
    AES.prototype.keySize = AES.keySize;
    AES.prototype._reset = function() {
      var keyWords = this._key;
      var keySize = keyWords.length;
      var nRounds = keySize + 6;
      var ksRows = 4 * (nRounds + 1);
      var keySchedule = [];
      for (var k = 0; k < keySize; k++) keySchedule[k] = keyWords[k];
      for (k = keySize; k < ksRows; k++) {
        var t = keySchedule[k - 1];
        if (k % keySize === 0) {
          t = t << 8 | t >>> 24;
          t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 255] << 16 | G.SBOX[t >>> 8 & 255] << 8 | G.SBOX[255 & t];
          t ^= RCON[k / keySize | 0] << 24;
        } else keySize > 6 && k % keySize === 4 && (t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 255] << 16 | G.SBOX[t >>> 8 & 255] << 8 | G.SBOX[255 & t]);
        keySchedule[k] = keySchedule[k - keySize] ^ t;
      }
      var invKeySchedule = [];
      for (var ik = 0; ik < ksRows; ik++) {
        var ksR = ksRows - ik;
        var tt = keySchedule[ksR - (ik % 4 ? 0 : 4)];
        invKeySchedule[ik] = ik < 4 || ksR <= 4 ? tt : G.INV_SUB_MIX[0][G.SBOX[tt >>> 24]] ^ G.INV_SUB_MIX[1][G.SBOX[tt >>> 16 & 255]] ^ G.INV_SUB_MIX[2][G.SBOX[tt >>> 8 & 255]] ^ G.INV_SUB_MIX[3][G.SBOX[255 & tt]];
      }
      this._nRounds = nRounds;
      this._keySchedule = keySchedule;
      this._invKeySchedule = invKeySchedule;
    };
    AES.prototype.encryptBlockRaw = function(M) {
      M = asUInt32Array(M);
      return cryptBlock(M, this._keySchedule, G.SUB_MIX, G.SBOX, this._nRounds);
    };
    AES.prototype.encryptBlock = function(M) {
      var out = this.encryptBlockRaw(M);
      var buf = Buffer.allocUnsafe(16);
      buf.writeUInt32BE(out[0], 0);
      buf.writeUInt32BE(out[1], 4);
      buf.writeUInt32BE(out[2], 8);
      buf.writeUInt32BE(out[3], 12);
      return buf;
    };
    AES.prototype.decryptBlock = function(M) {
      M = asUInt32Array(M);
      var m1 = M[1];
      M[1] = M[3];
      M[3] = m1;
      var out = cryptBlock(M, this._invKeySchedule, G.INV_SUB_MIX, G.INV_SBOX, this._nRounds);
      var buf = Buffer.allocUnsafe(16);
      buf.writeUInt32BE(out[0], 0);
      buf.writeUInt32BE(out[3], 4);
      buf.writeUInt32BE(out[2], 8);
      buf.writeUInt32BE(out[1], 12);
      return buf;
    };
    AES.prototype.scrub = function() {
      scrubVec(this._keySchedule);
      scrubVec(this._invKeySchedule);
      scrubVec(this._key);
    };
    module.exports.AES = AES;
  }, {
    "safe-buffer": 143
  } ],
  20: [ function(require, module, exports) {
    var aes = require("./aes");
    var Buffer = require("safe-buffer").Buffer;
    var Transform = require("cipher-base");
    var inherits = require("inherits");
    var GHASH = require("./ghash");
    var xor = require("buffer-xor");
    var incr32 = require("./incr32");
    function xorTest(a, b) {
      var out = 0;
      a.length !== b.length && out++;
      var len = Math.min(a.length, b.length);
      for (var i = 0; i < len; ++i) out += a[i] ^ b[i];
      return out;
    }
    function calcIv(self, iv, ck) {
      if (12 === iv.length) {
        self._finID = Buffer.concat([ iv, Buffer.from([ 0, 0, 0, 1 ]) ]);
        return Buffer.concat([ iv, Buffer.from([ 0, 0, 0, 2 ]) ]);
      }
      var ghash = new GHASH(ck);
      var len = iv.length;
      var toPad = len % 16;
      ghash.update(iv);
      if (toPad) {
        toPad = 16 - toPad;
        ghash.update(Buffer.alloc(toPad, 0));
      }
      ghash.update(Buffer.alloc(8, 0));
      var ivBits = 8 * len;
      var tail = Buffer.alloc(8);
      tail.writeUIntBE(ivBits, 0, 8);
      ghash.update(tail);
      self._finID = ghash.state;
      var out = Buffer.from(self._finID);
      incr32(out);
      return out;
    }
    function StreamCipher(mode, key, iv, decrypt) {
      Transform.call(this);
      var h = Buffer.alloc(4, 0);
      this._cipher = new aes.AES(key);
      var ck = this._cipher.encryptBlock(h);
      this._ghash = new GHASH(ck);
      iv = calcIv(this, iv, ck);
      this._prev = Buffer.from(iv);
      this._cache = Buffer.allocUnsafe(0);
      this._secCache = Buffer.allocUnsafe(0);
      this._decrypt = decrypt;
      this._alen = 0;
      this._len = 0;
      this._mode = mode;
      this._authTag = null;
      this._called = false;
    }
    inherits(StreamCipher, Transform);
    StreamCipher.prototype._update = function(chunk) {
      if (!this._called && this._alen) {
        var rump = 16 - this._alen % 16;
        if (rump < 16) {
          rump = Buffer.alloc(rump, 0);
          this._ghash.update(rump);
        }
      }
      this._called = true;
      var out = this._mode.encrypt(this, chunk);
      this._decrypt ? this._ghash.update(chunk) : this._ghash.update(out);
      this._len += chunk.length;
      return out;
    };
    StreamCipher.prototype._final = function() {
      if (this._decrypt && !this._authTag) throw new Error("Unsupported state or unable to authenticate data");
      var tag = xor(this._ghash.final(8 * this._alen, 8 * this._len), this._cipher.encryptBlock(this._finID));
      if (this._decrypt && xorTest(tag, this._authTag)) throw new Error("Unsupported state or unable to authenticate data");
      this._authTag = tag;
      this._cipher.scrub();
    };
    StreamCipher.prototype.getAuthTag = function getAuthTag() {
      if (this._decrypt || !Buffer.isBuffer(this._authTag)) throw new Error("Attempting to get auth tag in unsupported state");
      return this._authTag;
    };
    StreamCipher.prototype.setAuthTag = function setAuthTag(tag) {
      if (!this._decrypt) throw new Error("Attempting to set auth tag in unsupported state");
      this._authTag = tag;
    };
    StreamCipher.prototype.setAAD = function setAAD(buf) {
      if (this._called) throw new Error("Attempting to set AAD in unsupported state");
      this._ghash.update(buf);
      this._alen += buf.length;
    };
    module.exports = StreamCipher;
  }, {
    "./aes": 19,
    "./ghash": 24,
    "./incr32": 25,
    "buffer-xor": 46,
    "cipher-base": 49,
    inherits: 101,
    "safe-buffer": 143
  } ],
  21: [ function(require, module, exports) {
    var ciphers = require("./encrypter");
    var deciphers = require("./decrypter");
    var modes = require("./modes/list.json");
    function getCiphers() {
      return Object.keys(modes);
    }
    exports.createCipher = exports.Cipher = ciphers.createCipher;
    exports.createCipheriv = exports.Cipheriv = ciphers.createCipheriv;
    exports.createDecipher = exports.Decipher = deciphers.createDecipher;
    exports.createDecipheriv = exports.Decipheriv = deciphers.createDecipheriv;
    exports.listCiphers = exports.getCiphers = getCiphers;
  }, {
    "./decrypter": 22,
    "./encrypter": 23,
    "./modes/list.json": 33
  } ],
  22: [ function(require, module, exports) {
    var AuthCipher = require("./authCipher");
    var Buffer = require("safe-buffer").Buffer;
    var MODES = require("./modes");
    var StreamCipher = require("./streamCipher");
    var Transform = require("cipher-base");
    var aes = require("./aes");
    var ebtk = require("evp_bytestokey");
    var inherits = require("inherits");
    function Decipher(mode, key, iv) {
      Transform.call(this);
      this._cache = new Splitter();
      this._last = void 0;
      this._cipher = new aes.AES(key);
      this._prev = Buffer.from(iv);
      this._mode = mode;
      this._autopadding = true;
    }
    inherits(Decipher, Transform);
    Decipher.prototype._update = function(data) {
      this._cache.add(data);
      var chunk;
      var thing;
      var out = [];
      while (chunk = this._cache.get(this._autopadding)) {
        thing = this._mode.decrypt(this, chunk);
        out.push(thing);
      }
      return Buffer.concat(out);
    };
    Decipher.prototype._final = function() {
      var chunk = this._cache.flush();
      if (this._autopadding) return unpad(this._mode.decrypt(this, chunk));
      if (chunk) throw new Error("data not multiple of block length");
    };
    Decipher.prototype.setAutoPadding = function(setTo) {
      this._autopadding = !!setTo;
      return this;
    };
    function Splitter() {
      this.cache = Buffer.allocUnsafe(0);
    }
    Splitter.prototype.add = function(data) {
      this.cache = Buffer.concat([ this.cache, data ]);
    };
    Splitter.prototype.get = function(autoPadding) {
      var out;
      if (autoPadding) {
        if (this.cache.length > 16) {
          out = this.cache.slice(0, 16);
          this.cache = this.cache.slice(16);
          return out;
        }
      } else if (this.cache.length >= 16) {
        out = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        return out;
      }
      return null;
    };
    Splitter.prototype.flush = function() {
      if (this.cache.length) return this.cache;
    };
    function unpad(last) {
      var padded = last[15];
      if (padded < 1 || padded > 16) throw new Error("unable to decrypt data");
      var i = -1;
      while (++i < padded) if (last[i + (16 - padded)] !== padded) throw new Error("unable to decrypt data");
      if (16 === padded) return;
      return last.slice(0, 16 - padded);
    }
    function createDecipheriv(suite, password, iv) {
      var config = MODES[suite.toLowerCase()];
      if (!config) throw new TypeError("invalid suite type");
      "string" === typeof iv && (iv = Buffer.from(iv));
      if ("GCM" !== config.mode && iv.length !== config.iv) throw new TypeError("invalid iv length " + iv.length);
      "string" === typeof password && (password = Buffer.from(password));
      if (password.length !== config.key / 8) throw new TypeError("invalid key length " + password.length);
      if ("stream" === config.type) return new StreamCipher(config.module, password, iv, true);
      if ("auth" === config.type) return new AuthCipher(config.module, password, iv, true);
      return new Decipher(config.module, password, iv);
    }
    function createDecipher(suite, password) {
      var config = MODES[suite.toLowerCase()];
      if (!config) throw new TypeError("invalid suite type");
      var keys = ebtk(password, false, config.key, config.iv);
      return createDecipheriv(suite, keys.key, keys.iv);
    }
    exports.createDecipher = createDecipher;
    exports.createDecipheriv = createDecipheriv;
  }, {
    "./aes": 19,
    "./authCipher": 20,
    "./modes": 32,
    "./streamCipher": 35,
    "cipher-base": 49,
    evp_bytestokey: 84,
    inherits: 101,
    "safe-buffer": 143
  } ],
  23: [ function(require, module, exports) {
    var MODES = require("./modes");
    var AuthCipher = require("./authCipher");
    var Buffer = require("safe-buffer").Buffer;
    var StreamCipher = require("./streamCipher");
    var Transform = require("cipher-base");
    var aes = require("./aes");
    var ebtk = require("evp_bytestokey");
    var inherits = require("inherits");
    function Cipher(mode, key, iv) {
      Transform.call(this);
      this._cache = new Splitter();
      this._cipher = new aes.AES(key);
      this._prev = Buffer.from(iv);
      this._mode = mode;
      this._autopadding = true;
    }
    inherits(Cipher, Transform);
    Cipher.prototype._update = function(data) {
      this._cache.add(data);
      var chunk;
      var thing;
      var out = [];
      while (chunk = this._cache.get()) {
        thing = this._mode.encrypt(this, chunk);
        out.push(thing);
      }
      return Buffer.concat(out);
    };
    var PADDING = Buffer.alloc(16, 16);
    Cipher.prototype._final = function() {
      var chunk = this._cache.flush();
      if (this._autopadding) {
        chunk = this._mode.encrypt(this, chunk);
        this._cipher.scrub();
        return chunk;
      }
      if (!chunk.equals(PADDING)) {
        this._cipher.scrub();
        throw new Error("data not multiple of block length");
      }
    };
    Cipher.prototype.setAutoPadding = function(setTo) {
      this._autopadding = !!setTo;
      return this;
    };
    function Splitter() {
      this.cache = Buffer.allocUnsafe(0);
    }
    Splitter.prototype.add = function(data) {
      this.cache = Buffer.concat([ this.cache, data ]);
    };
    Splitter.prototype.get = function() {
      if (this.cache.length > 15) {
        var out = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        return out;
      }
      return null;
    };
    Splitter.prototype.flush = function() {
      var len = 16 - this.cache.length;
      var padBuff = Buffer.allocUnsafe(len);
      var i = -1;
      while (++i < len) padBuff.writeUInt8(len, i);
      return Buffer.concat([ this.cache, padBuff ]);
    };
    function createCipheriv(suite, password, iv) {
      var config = MODES[suite.toLowerCase()];
      if (!config) throw new TypeError("invalid suite type");
      "string" === typeof password && (password = Buffer.from(password));
      if (password.length !== config.key / 8) throw new TypeError("invalid key length " + password.length);
      "string" === typeof iv && (iv = Buffer.from(iv));
      if ("GCM" !== config.mode && iv.length !== config.iv) throw new TypeError("invalid iv length " + iv.length);
      if ("stream" === config.type) return new StreamCipher(config.module, password, iv);
      if ("auth" === config.type) return new AuthCipher(config.module, password, iv);
      return new Cipher(config.module, password, iv);
    }
    function createCipher(suite, password) {
      var config = MODES[suite.toLowerCase()];
      if (!config) throw new TypeError("invalid suite type");
      var keys = ebtk(password, false, config.key, config.iv);
      return createCipheriv(suite, keys.key, keys.iv);
    }
    exports.createCipheriv = createCipheriv;
    exports.createCipher = createCipher;
  }, {
    "./aes": 19,
    "./authCipher": 20,
    "./modes": 32,
    "./streamCipher": 35,
    "cipher-base": 49,
    evp_bytestokey: 84,
    inherits: 101,
    "safe-buffer": 143
  } ],
  24: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    var ZEROES = Buffer.alloc(16, 0);
    function toArray(buf) {
      return [ buf.readUInt32BE(0), buf.readUInt32BE(4), buf.readUInt32BE(8), buf.readUInt32BE(12) ];
    }
    function fromArray(out) {
      var buf = Buffer.allocUnsafe(16);
      buf.writeUInt32BE(out[0] >>> 0, 0);
      buf.writeUInt32BE(out[1] >>> 0, 4);
      buf.writeUInt32BE(out[2] >>> 0, 8);
      buf.writeUInt32BE(out[3] >>> 0, 12);
      return buf;
    }
    function GHASH(key) {
      this.h = key;
      this.state = Buffer.alloc(16, 0);
      this.cache = Buffer.allocUnsafe(0);
    }
    GHASH.prototype.ghash = function(block) {
      var i = -1;
      while (++i < block.length) this.state[i] ^= block[i];
      this._multiply();
    };
    GHASH.prototype._multiply = function() {
      var Vi = toArray(this.h);
      var Zi = [ 0, 0, 0, 0 ];
      var j, xi, lsbVi;
      var i = -1;
      while (++i < 128) {
        xi = 0 !== (this.state[~~(i / 8)] & 1 << 7 - i % 8);
        if (xi) {
          Zi[0] ^= Vi[0];
          Zi[1] ^= Vi[1];
          Zi[2] ^= Vi[2];
          Zi[3] ^= Vi[3];
        }
        lsbVi = 0 !== (1 & Vi[3]);
        for (j = 3; j > 0; j--) Vi[j] = Vi[j] >>> 1 | (1 & Vi[j - 1]) << 31;
        Vi[0] = Vi[0] >>> 1;
        lsbVi && (Vi[0] = Vi[0] ^ 225 << 24);
      }
      this.state = fromArray(Zi);
    };
    GHASH.prototype.update = function(buf) {
      this.cache = Buffer.concat([ this.cache, buf ]);
      var chunk;
      while (this.cache.length >= 16) {
        chunk = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        this.ghash(chunk);
      }
    };
    GHASH.prototype.final = function(abl, bl) {
      this.cache.length && this.ghash(Buffer.concat([ this.cache, ZEROES ], 16));
      this.ghash(fromArray([ 0, abl, 0, bl ]));
      return this.state;
    };
    module.exports = GHASH;
  }, {
    "safe-buffer": 143
  } ],
  25: [ function(require, module, exports) {
    function incr32(iv) {
      var len = iv.length;
      var item;
      while (len--) {
        item = iv.readUInt8(len);
        if (255 !== item) {
          item++;
          iv.writeUInt8(item, len);
          break;
        }
        iv.writeUInt8(0, len);
      }
    }
    module.exports = incr32;
  }, {} ],
  26: [ function(require, module, exports) {
    var xor = require("buffer-xor");
    exports.encrypt = function(self, block) {
      var data = xor(block, self._prev);
      self._prev = self._cipher.encryptBlock(data);
      return self._prev;
    };
    exports.decrypt = function(self, block) {
      var pad = self._prev;
      self._prev = block;
      var out = self._cipher.decryptBlock(block);
      return xor(out, pad);
    };
  }, {
    "buffer-xor": 46
  } ],
  27: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    var xor = require("buffer-xor");
    function encryptStart(self, data, decrypt) {
      var len = data.length;
      var out = xor(data, self._cache);
      self._cache = self._cache.slice(len);
      self._prev = Buffer.concat([ self._prev, decrypt ? data : out ]);
      return out;
    }
    exports.encrypt = function(self, data, decrypt) {
      var out = Buffer.allocUnsafe(0);
      var len;
      while (data.length) {
        if (0 === self._cache.length) {
          self._cache = self._cipher.encryptBlock(self._prev);
          self._prev = Buffer.allocUnsafe(0);
        }
        if (!(self._cache.length <= data.length)) {
          out = Buffer.concat([ out, encryptStart(self, data, decrypt) ]);
          break;
        }
        len = self._cache.length;
        out = Buffer.concat([ out, encryptStart(self, data.slice(0, len), decrypt) ]);
        data = data.slice(len);
      }
      return out;
    };
  }, {
    "buffer-xor": 46,
    "safe-buffer": 143
  } ],
  28: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    function encryptByte(self, byteParam, decrypt) {
      var pad;
      var i = -1;
      var len = 8;
      var out = 0;
      var bit, value;
      while (++i < len) {
        pad = self._cipher.encryptBlock(self._prev);
        bit = byteParam & 1 << 7 - i ? 128 : 0;
        value = pad[0] ^ bit;
        out += (128 & value) >> i % 8;
        self._prev = shiftIn(self._prev, decrypt ? bit : value);
      }
      return out;
    }
    function shiftIn(buffer, value) {
      var len = buffer.length;
      var i = -1;
      var out = Buffer.allocUnsafe(buffer.length);
      buffer = Buffer.concat([ buffer, Buffer.from([ value ]) ]);
      while (++i < len) out[i] = buffer[i] << 1 | buffer[i + 1] >> 7;
      return out;
    }
    exports.encrypt = function(self, chunk, decrypt) {
      var len = chunk.length;
      var out = Buffer.allocUnsafe(len);
      var i = -1;
      while (++i < len) out[i] = encryptByte(self, chunk[i], decrypt);
      return out;
    };
  }, {
    "safe-buffer": 143
  } ],
  29: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    function encryptByte(self, byteParam, decrypt) {
      var pad = self._cipher.encryptBlock(self._prev);
      var out = pad[0] ^ byteParam;
      self._prev = Buffer.concat([ self._prev.slice(1), Buffer.from([ decrypt ? byteParam : out ]) ]);
      return out;
    }
    exports.encrypt = function(self, chunk, decrypt) {
      var len = chunk.length;
      var out = Buffer.allocUnsafe(len);
      var i = -1;
      while (++i < len) out[i] = encryptByte(self, chunk[i], decrypt);
      return out;
    };
  }, {
    "safe-buffer": 143
  } ],
  30: [ function(require, module, exports) {
    var xor = require("buffer-xor");
    var Buffer = require("safe-buffer").Buffer;
    var incr32 = require("../incr32");
    function getBlock(self) {
      var out = self._cipher.encryptBlockRaw(self._prev);
      incr32(self._prev);
      return out;
    }
    var blockSize = 16;
    exports.encrypt = function(self, chunk) {
      var chunkNum = Math.ceil(chunk.length / blockSize);
      var start = self._cache.length;
      self._cache = Buffer.concat([ self._cache, Buffer.allocUnsafe(chunkNum * blockSize) ]);
      for (var i = 0; i < chunkNum; i++) {
        var out = getBlock(self);
        var offset = start + i * blockSize;
        self._cache.writeUInt32BE(out[0], offset + 0);
        self._cache.writeUInt32BE(out[1], offset + 4);
        self._cache.writeUInt32BE(out[2], offset + 8);
        self._cache.writeUInt32BE(out[3], offset + 12);
      }
      var pad = self._cache.slice(0, chunk.length);
      self._cache = self._cache.slice(chunk.length);
      return xor(chunk, pad);
    };
  }, {
    "../incr32": 25,
    "buffer-xor": 46,
    "safe-buffer": 143
  } ],
  31: [ function(require, module, exports) {
    exports.encrypt = function(self, block) {
      return self._cipher.encryptBlock(block);
    };
    exports.decrypt = function(self, block) {
      return self._cipher.decryptBlock(block);
    };
  }, {} ],
  32: [ function(require, module, exports) {
    var modeModules = {
      ECB: require("./ecb"),
      CBC: require("./cbc"),
      CFB: require("./cfb"),
      CFB8: require("./cfb8"),
      CFB1: require("./cfb1"),
      OFB: require("./ofb"),
      CTR: require("./ctr"),
      GCM: require("./ctr")
    };
    var modes = require("./list.json");
    for (var key in modes) modes[key].module = modeModules[modes[key].mode];
    module.exports = modes;
  }, {
    "./cbc": 26,
    "./cfb": 27,
    "./cfb1": 28,
    "./cfb8": 29,
    "./ctr": 30,
    "./ecb": 31,
    "./list.json": 33,
    "./ofb": 34
  } ],
  33: [ function(require, module, exports) {
    module.exports = {
      "aes-128-ecb": {
        cipher: "AES",
        key: 128,
        iv: 0,
        mode: "ECB",
        type: "block"
      },
      "aes-192-ecb": {
        cipher: "AES",
        key: 192,
        iv: 0,
        mode: "ECB",
        type: "block"
      },
      "aes-256-ecb": {
        cipher: "AES",
        key: 256,
        iv: 0,
        mode: "ECB",
        type: "block"
      },
      "aes-128-cbc": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      "aes-192-cbc": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      "aes-256-cbc": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      aes128: {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      aes192: {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      aes256: {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CBC",
        type: "block"
      },
      "aes-128-cfb": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CFB",
        type: "stream"
      },
      "aes-192-cfb": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CFB",
        type: "stream"
      },
      "aes-256-cfb": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CFB",
        type: "stream"
      },
      "aes-128-cfb8": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CFB8",
        type: "stream"
      },
      "aes-192-cfb8": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CFB8",
        type: "stream"
      },
      "aes-256-cfb8": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CFB8",
        type: "stream"
      },
      "aes-128-cfb1": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CFB1",
        type: "stream"
      },
      "aes-192-cfb1": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CFB1",
        type: "stream"
      },
      "aes-256-cfb1": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CFB1",
        type: "stream"
      },
      "aes-128-ofb": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "OFB",
        type: "stream"
      },
      "aes-192-ofb": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "OFB",
        type: "stream"
      },
      "aes-256-ofb": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "OFB",
        type: "stream"
      },
      "aes-128-ctr": {
        cipher: "AES",
        key: 128,
        iv: 16,
        mode: "CTR",
        type: "stream"
      },
      "aes-192-ctr": {
        cipher: "AES",
        key: 192,
        iv: 16,
        mode: "CTR",
        type: "stream"
      },
      "aes-256-ctr": {
        cipher: "AES",
        key: 256,
        iv: 16,
        mode: "CTR",
        type: "stream"
      },
      "aes-128-gcm": {
        cipher: "AES",
        key: 128,
        iv: 12,
        mode: "GCM",
        type: "auth"
      },
      "aes-192-gcm": {
        cipher: "AES",
        key: 192,
        iv: 12,
        mode: "GCM",
        type: "auth"
      },
      "aes-256-gcm": {
        cipher: "AES",
        key: 256,
        iv: 12,
        mode: "GCM",
        type: "auth"
      }
    };
  }, {} ],
  34: [ function(require, module, exports) {
    (function(Buffer) {
      var xor = require("buffer-xor");
      function getBlock(self) {
        self._prev = self._cipher.encryptBlock(self._prev);
        return self._prev;
      }
      exports.encrypt = function(self, chunk) {
        while (self._cache.length < chunk.length) self._cache = Buffer.concat([ self._cache, getBlock(self) ]);
        var pad = self._cache.slice(0, chunk.length);
        self._cache = self._cache.slice(chunk.length);
        return xor(chunk, pad);
      };
    }).call(this, require("buffer").Buffer);
  }, {
    buffer: 47,
    "buffer-xor": 46
  } ],
  35: [ function(require, module, exports) {
    var aes = require("./aes");
    var Buffer = require("safe-buffer").Buffer;
    var Transform = require("cipher-base");
    var inherits = require("inherits");
    function StreamCipher(mode, key, iv, decrypt) {
      Transform.call(this);
      this._cipher = new aes.AES(key);
      this._prev = Buffer.from(iv);
      this._cache = Buffer.allocUnsafe(0);
      this._secCache = Buffer.allocUnsafe(0);
      this._decrypt = decrypt;
      this._mode = mode;
    }
    inherits(StreamCipher, Transform);
    StreamCipher.prototype._update = function(chunk) {
      return this._mode.encrypt(this, chunk, this._decrypt);
    };
    StreamCipher.prototype._final = function() {
      this._cipher.scrub();
    };
    module.exports = StreamCipher;
  }, {
    "./aes": 19,
    "cipher-base": 49,
    inherits: 101,
    "safe-buffer": 143
  } ],
  36: [ function(require, module, exports) {
    var DES = require("browserify-des");
    var aes = require("browserify-aes/browser");
    var aesModes = require("browserify-aes/modes");
    var desModes = require("browserify-des/modes");
    var ebtk = require("evp_bytestokey");
    function createCipher(suite, password) {
      suite = suite.toLowerCase();
      var keyLen, ivLen;
      if (aesModes[suite]) {
        keyLen = aesModes[suite].key;
        ivLen = aesModes[suite].iv;
      } else {
        if (!desModes[suite]) throw new TypeError("invalid suite type");
        keyLen = 8 * desModes[suite].key;
        ivLen = desModes[suite].iv;
      }
      var keys = ebtk(password, false, keyLen, ivLen);
      return createCipheriv(suite, keys.key, keys.iv);
    }
    function createDecipher(suite, password) {
      suite = suite.toLowerCase();
      var keyLen, ivLen;
      if (aesModes[suite]) {
        keyLen = aesModes[suite].key;
        ivLen = aesModes[suite].iv;
      } else {
        if (!desModes[suite]) throw new TypeError("invalid suite type");
        keyLen = 8 * desModes[suite].key;
        ivLen = desModes[suite].iv;
      }
      var keys = ebtk(password, false, keyLen, ivLen);
      return createDecipheriv(suite, keys.key, keys.iv);
    }
    function createCipheriv(suite, key, iv) {
      suite = suite.toLowerCase();
      if (aesModes[suite]) return aes.createCipheriv(suite, key, iv);
      if (desModes[suite]) return new DES({
        key: key,
        iv: iv,
        mode: suite
      });
      throw new TypeError("invalid suite type");
    }
    function createDecipheriv(suite, key, iv) {
      suite = suite.toLowerCase();
      if (aesModes[suite]) return aes.createDecipheriv(suite, key, iv);
      if (desModes[suite]) return new DES({
        key: key,
        iv: iv,
        mode: suite,
        decrypt: true
      });
      throw new TypeError("invalid suite type");
    }
    function getCiphers() {
      return Object.keys(desModes).concat(aes.getCiphers());
    }
    exports.createCipher = exports.Cipher = createCipher;
    exports.createCipheriv = exports.Cipheriv = createCipheriv;
    exports.createDecipher = exports.Decipher = createDecipher;
    exports.createDecipheriv = exports.Decipheriv = createDecipheriv;
    exports.listCiphers = exports.getCiphers = getCiphers;
  }, {
    "browserify-aes/browser": 21,
    "browserify-aes/modes": 32,
    "browserify-des": 37,
    "browserify-des/modes": 38,
    evp_bytestokey: 84
  } ],
  37: [ function(require, module, exports) {
    var CipherBase = require("cipher-base");
    var des = require("des.js");
    var inherits = require("inherits");
    var Buffer = require("safe-buffer").Buffer;
    var modes = {
      "des-ede3-cbc": des.CBC.instantiate(des.EDE),
      "des-ede3": des.EDE,
      "des-ede-cbc": des.CBC.instantiate(des.EDE),
      "des-ede": des.EDE,
      "des-cbc": des.CBC.instantiate(des.DES),
      "des-ecb": des.DES
    };
    modes.des = modes["des-cbc"];
    modes.des3 = modes["des-ede3-cbc"];
    module.exports = DES;
    inherits(DES, CipherBase);
    function DES(opts) {
      CipherBase.call(this);
      var modeName = opts.mode.toLowerCase();
      var mode = modes[modeName];
      var type;
      type = opts.decrypt ? "decrypt" : "encrypt";
      var key = opts.key;
      Buffer.isBuffer(key) || (key = Buffer.from(key));
      "des-ede" !== modeName && "des-ede-cbc" !== modeName || (key = Buffer.concat([ key, key.slice(0, 8) ]));
      var iv = opts.iv;
      Buffer.isBuffer(iv) || (iv = Buffer.from(iv));
      this._des = mode.create({
        key: key,
        iv: iv,
        type: type
      });
    }
    DES.prototype._update = function(data) {
      return Buffer.from(this._des.update(data));
    };
    DES.prototype._final = function() {
      return Buffer.from(this._des.final());
    };
  }, {
    "cipher-base": 49,
    "des.js": 57,
    inherits: 101,
    "safe-buffer": 143
  } ],
  38: [ function(require, module, exports) {
    exports["des-ecb"] = {
      key: 8,
      iv: 0
    };
    exports["des-cbc"] = exports.des = {
      key: 8,
      iv: 8
    };
    exports["des-ede3-cbc"] = exports.des3 = {
      key: 24,
      iv: 8
    };
    exports["des-ede3"] = {
      key: 24,
      iv: 0
    };
    exports["des-ede-cbc"] = {
      key: 16,
      iv: 8
    };
    exports["des-ede"] = {
      key: 16,
      iv: 0
    };
  }, {} ],
  39: [ function(require, module, exports) {
    (function(Buffer) {
      var bn = require("bn.js");
      var randomBytes = require("randombytes");
      module.exports = crt;
      function blind(priv) {
        var r = getr(priv);
        var blinder = r.toRed(bn.mont(priv.modulus)).redPow(new bn(priv.publicExponent)).fromRed();
        return {
          blinder: blinder,
          unblinder: r.invm(priv.modulus)
        };
      }
      function crt(msg, priv) {
        var blinds = blind(priv);
        var len = priv.modulus.byteLength();
        var mod = bn.mont(priv.modulus);
        var blinded = new bn(msg).mul(blinds.blinder).umod(priv.modulus);
        var c1 = blinded.toRed(bn.mont(priv.prime1));
        var c2 = blinded.toRed(bn.mont(priv.prime2));
        var qinv = priv.coefficient;
        var p = priv.prime1;
        var q = priv.prime2;
        var m1 = c1.redPow(priv.exponent1);
        var m2 = c2.redPow(priv.exponent2);
        m1 = m1.fromRed();
        m2 = m2.fromRed();
        var h = m1.isub(m2).imul(qinv).umod(p);
        h.imul(q);
        m2.iadd(h);
        return new Buffer(m2.imul(blinds.unblinder).umod(priv.modulus).toArray(false, len));
      }
      crt.getr = getr;
      function getr(priv) {
        var len = priv.modulus.byteLength();
        var r = new bn(randomBytes(len));
        while (r.cmp(priv.modulus) >= 0 || !r.umod(priv.prime1) || !r.umod(priv.prime2)) r = new bn(randomBytes(len));
        return r;
      }
    }).call(this, require("buffer").Buffer);
  }, {
    "bn.js": 16,
    buffer: 47,
    randombytes: 125
  } ],
  40: [ function(require, module, exports) {
    module.exports = require("./browser/algorithms.json");
  }, {
    "./browser/algorithms.json": 41
  } ],
  41: [ function(require, module, exports) {
    module.exports = {
      sha224WithRSAEncryption: {
        sign: "rsa",
        hash: "sha224",
        id: "302d300d06096086480165030402040500041c"
      },
      "RSA-SHA224": {
        sign: "ecdsa/rsa",
        hash: "sha224",
        id: "302d300d06096086480165030402040500041c"
      },
      sha256WithRSAEncryption: {
        sign: "rsa",
        hash: "sha256",
        id: "3031300d060960864801650304020105000420"
      },
      "RSA-SHA256": {
        sign: "ecdsa/rsa",
        hash: "sha256",
        id: "3031300d060960864801650304020105000420"
      },
      sha384WithRSAEncryption: {
        sign: "rsa",
        hash: "sha384",
        id: "3041300d060960864801650304020205000430"
      },
      "RSA-SHA384": {
        sign: "ecdsa/rsa",
        hash: "sha384",
        id: "3041300d060960864801650304020205000430"
      },
      sha512WithRSAEncryption: {
        sign: "rsa",
        hash: "sha512",
        id: "3051300d060960864801650304020305000440"
      },
      "RSA-SHA512": {
        sign: "ecdsa/rsa",
        hash: "sha512",
        id: "3051300d060960864801650304020305000440"
      },
      "RSA-SHA1": {
        sign: "rsa",
        hash: "sha1",
        id: "3021300906052b0e03021a05000414"
      },
      "ecdsa-with-SHA1": {
        sign: "ecdsa",
        hash: "sha1",
        id: ""
      },
      sha256: {
        sign: "ecdsa",
        hash: "sha256",
        id: ""
      },
      sha224: {
        sign: "ecdsa",
        hash: "sha224",
        id: ""
      },
      sha384: {
        sign: "ecdsa",
        hash: "sha384",
        id: ""
      },
      sha512: {
        sign: "ecdsa",
        hash: "sha512",
        id: ""
      },
      "DSA-SHA": {
        sign: "dsa",
        hash: "sha1",
        id: ""
      },
      "DSA-SHA1": {
        sign: "dsa",
        hash: "sha1",
        id: ""
      },
      DSA: {
        sign: "dsa",
        hash: "sha1",
        id: ""
      },
      "DSA-WITH-SHA224": {
        sign: "dsa",
        hash: "sha224",
        id: ""
      },
      "DSA-SHA224": {
        sign: "dsa",
        hash: "sha224",
        id: ""
      },
      "DSA-WITH-SHA256": {
        sign: "dsa",
        hash: "sha256",
        id: ""
      },
      "DSA-SHA256": {
        sign: "dsa",
        hash: "sha256",
        id: ""
      },
      "DSA-WITH-SHA384": {
        sign: "dsa",
        hash: "sha384",
        id: ""
      },
      "DSA-SHA384": {
        sign: "dsa",
        hash: "sha384",
        id: ""
      },
      "DSA-WITH-SHA512": {
        sign: "dsa",
        hash: "sha512",
        id: ""
      },
      "DSA-SHA512": {
        sign: "dsa",
        hash: "sha512",
        id: ""
      },
      "DSA-RIPEMD160": {
        sign: "dsa",
        hash: "rmd160",
        id: ""
      },
      ripemd160WithRSA: {
        sign: "rsa",
        hash: "rmd160",
        id: "3021300906052b2403020105000414"
      },
      "RSA-RIPEMD160": {
        sign: "rsa",
        hash: "rmd160",
        id: "3021300906052b2403020105000414"
      },
      md5WithRSAEncryption: {
        sign: "rsa",
        hash: "md5",
        id: "3020300c06082a864886f70d020505000410"
      },
      "RSA-MD5": {
        sign: "rsa",
        hash: "md5",
        id: "3020300c06082a864886f70d020505000410"
      }
    };
  }, {} ],
  42: [ function(require, module, exports) {
    module.exports = {
      "1.3.132.0.10": "secp256k1",
      "1.3.132.0.33": "p224",
      "1.2.840.10045.3.1.1": "p192",
      "1.2.840.10045.3.1.7": "p256",
      "1.3.132.0.34": "p384",
      "1.3.132.0.35": "p521"
    };
  }, {} ],
  43: [ function(require, module, exports) {
    (function(Buffer) {
      var createHash = require("create-hash");
      var stream = require("stream");
      var inherits = require("inherits");
      var sign = require("./sign");
      var verify = require("./verify");
      var algorithms = require("./algorithms.json");
      Object.keys(algorithms).forEach(function(key) {
        algorithms[key].id = new Buffer(algorithms[key].id, "hex");
        algorithms[key.toLowerCase()] = algorithms[key];
      });
      function Sign(algorithm) {
        stream.Writable.call(this);
        var data = algorithms[algorithm];
        if (!data) throw new Error("Unknown message digest");
        this._hashType = data.hash;
        this._hash = createHash(data.hash);
        this._tag = data.id;
        this._signType = data.sign;
      }
      inherits(Sign, stream.Writable);
      Sign.prototype._write = function _write(data, _, done) {
        this._hash.update(data);
        done();
      };
      Sign.prototype.update = function update(data, enc) {
        "string" === typeof data && (data = new Buffer(data, enc));
        this._hash.update(data);
        return this;
      };
      Sign.prototype.sign = function signMethod(key, enc) {
        this.end();
        var hash = this._hash.digest();
        var sig = sign(hash, key, this._hashType, this._signType, this._tag);
        return enc ? sig.toString(enc) : sig;
      };
      function Verify(algorithm) {
        stream.Writable.call(this);
        var data = algorithms[algorithm];
        if (!data) throw new Error("Unknown message digest");
        this._hash = createHash(data.hash);
        this._tag = data.id;
        this._signType = data.sign;
      }
      inherits(Verify, stream.Writable);
      Verify.prototype._write = function _write(data, _, done) {
        this._hash.update(data);
        done();
      };
      Verify.prototype.update = function update(data, enc) {
        "string" === typeof data && (data = new Buffer(data, enc));
        this._hash.update(data);
        return this;
      };
      Verify.prototype.verify = function verifyMethod(key, sig, enc) {
        "string" === typeof sig && (sig = new Buffer(sig, enc));
        this.end();
        var hash = this._hash.digest();
        return verify(sig, hash, key, this._signType, this._tag);
      };
      function createSign(algorithm) {
        return new Sign(algorithm);
      }
      function createVerify(algorithm) {
        return new Verify(algorithm);
      }
      module.exports = {
        Sign: createSign,
        Verify: createVerify,
        createSign: createSign,
        createVerify: createVerify
      };
    }).call(this, require("buffer").Buffer);
  }, {
    "./algorithms.json": 41,
    "./sign": 44,
    "./verify": 45,
    buffer: 47,
    "create-hash": 52,
    inherits: 101,
    stream: 152
  } ],
  44: [ function(require, module, exports) {
    (function(Buffer) {
      var createHmac = require("create-hmac");
      var crt = require("browserify-rsa");
      var EC = require("elliptic").ec;
      var BN = require("bn.js");
      var parseKeys = require("parse-asn1");
      var curves = require("./curves.json");
      function sign(hash, key, hashType, signType, tag) {
        var priv = parseKeys(key);
        if (priv.curve) {
          if ("ecdsa" !== signType && "ecdsa/rsa" !== signType) throw new Error("wrong private key type");
          return ecSign(hash, priv);
        }
        if ("dsa" === priv.type) {
          if ("dsa" !== signType) throw new Error("wrong private key type");
          return dsaSign(hash, priv, hashType);
        }
        if ("rsa" !== signType && "ecdsa/rsa" !== signType) throw new Error("wrong private key type");
        hash = Buffer.concat([ tag, hash ]);
        var len = priv.modulus.byteLength();
        var pad = [ 0, 1 ];
        while (hash.length + pad.length + 1 < len) pad.push(255);
        pad.push(0);
        var i = -1;
        while (++i < hash.length) pad.push(hash[i]);
        var out = crt(pad, priv);
        return out;
      }
      function ecSign(hash, priv) {
        var curveId = curves[priv.curve.join(".")];
        if (!curveId) throw new Error("unknown curve " + priv.curve.join("."));
        var curve = new EC(curveId);
        var key = curve.keyFromPrivate(priv.privateKey);
        var out = key.sign(hash);
        return new Buffer(out.toDER());
      }
      function dsaSign(hash, priv, algo) {
        var x = priv.params.priv_key;
        var p = priv.params.p;
        var q = priv.params.q;
        var g = priv.params.g;
        var r = new BN(0);
        var k;
        var H = bits2int(hash, q).mod(q);
        var s = false;
        var kv = getKey(x, q, hash, algo);
        while (false === s) {
          k = makeKey(q, kv, algo);
          r = makeR(g, k, p, q);
          s = k.invm(q).imul(H.add(x.mul(r))).mod(q);
          if (0 === s.cmpn(0)) {
            s = false;
            r = new BN(0);
          }
        }
        return toDER(r, s);
      }
      function toDER(r, s) {
        r = r.toArray();
        s = s.toArray();
        128 & r[0] && (r = [ 0 ].concat(r));
        128 & s[0] && (s = [ 0 ].concat(s));
        var total = r.length + s.length + 4;
        var res = [ 48, total, 2, r.length ];
        res = res.concat(r, [ 2, s.length ], s);
        return new Buffer(res);
      }
      function getKey(x, q, hash, algo) {
        x = new Buffer(x.toArray());
        if (x.length < q.byteLength()) {
          var zeros = new Buffer(q.byteLength() - x.length);
          zeros.fill(0);
          x = Buffer.concat([ zeros, x ]);
        }
        var hlen = hash.length;
        var hbits = bits2octets(hash, q);
        var v = new Buffer(hlen);
        v.fill(1);
        var k = new Buffer(hlen);
        k.fill(0);
        k = createHmac(algo, k).update(v).update(new Buffer([ 0 ])).update(x).update(hbits).digest();
        v = createHmac(algo, k).update(v).digest();
        k = createHmac(algo, k).update(v).update(new Buffer([ 1 ])).update(x).update(hbits).digest();
        v = createHmac(algo, k).update(v).digest();
        return {
          k: k,
          v: v
        };
      }
      function bits2int(obits, q) {
        var bits = new BN(obits);
        var shift = (obits.length << 3) - q.bitLength();
        shift > 0 && bits.ishrn(shift);
        return bits;
      }
      function bits2octets(bits, q) {
        bits = bits2int(bits, q);
        bits = bits.mod(q);
        var out = new Buffer(bits.toArray());
        if (out.length < q.byteLength()) {
          var zeros = new Buffer(q.byteLength() - out.length);
          zeros.fill(0);
          out = Buffer.concat([ zeros, out ]);
        }
        return out;
      }
      function makeKey(q, kv, algo) {
        var t;
        var k;
        do {
          t = new Buffer(0);
          while (8 * t.length < q.bitLength()) {
            kv.v = createHmac(algo, kv.k).update(kv.v).digest();
            t = Buffer.concat([ t, kv.v ]);
          }
          k = bits2int(t, q);
          kv.k = createHmac(algo, kv.k).update(kv.v).update(new Buffer([ 0 ])).digest();
          kv.v = createHmac(algo, kv.k).update(kv.v).digest();
        } while (-1 !== k.cmp(q));
        return k;
      }
      function makeR(g, k, p, q) {
        return g.toRed(BN.mont(p)).redPow(k).fromRed().mod(q);
      }
      module.exports = sign;
      module.exports.getKey = getKey;
      module.exports.makeKey = makeKey;
    }).call(this, require("buffer").Buffer);
  }, {
    "./curves.json": 42,
    "bn.js": 16,
    "browserify-rsa": 39,
    buffer: 47,
    "create-hmac": 54,
    elliptic: 67,
    "parse-asn1": 111
  } ],
  45: [ function(require, module, exports) {
    (function(Buffer) {
      var BN = require("bn.js");
      var EC = require("elliptic").ec;
      var parseKeys = require("parse-asn1");
      var curves = require("./curves.json");
      function verify(sig, hash, key, signType, tag) {
        var pub = parseKeys(key);
        if ("ec" === pub.type) {
          if ("ecdsa" !== signType && "ecdsa/rsa" !== signType) throw new Error("wrong public key type");
          return ecVerify(sig, hash, pub);
        }
        if ("dsa" === pub.type) {
          if ("dsa" !== signType) throw new Error("wrong public key type");
          return dsaVerify(sig, hash, pub);
        }
        if ("rsa" !== signType && "ecdsa/rsa" !== signType) throw new Error("wrong public key type");
        hash = Buffer.concat([ tag, hash ]);
        var len = pub.modulus.byteLength();
        var pad = [ 1 ];
        var padNum = 0;
        while (hash.length + pad.length + 2 < len) {
          pad.push(255);
          padNum++;
        }
        pad.push(0);
        var i = -1;
        while (++i < hash.length) pad.push(hash[i]);
        pad = new Buffer(pad);
        var red = BN.mont(pub.modulus);
        sig = new BN(sig).toRed(red);
        sig = sig.redPow(new BN(pub.publicExponent));
        sig = new Buffer(sig.fromRed().toArray());
        var out = padNum < 8 ? 1 : 0;
        len = Math.min(sig.length, pad.length);
        sig.length !== pad.length && (out = 1);
        i = -1;
        while (++i < len) out |= sig[i] ^ pad[i];
        return 0 === out;
      }
      function ecVerify(sig, hash, pub) {
        var curveId = curves[pub.data.algorithm.curve.join(".")];
        if (!curveId) throw new Error("unknown curve " + pub.data.algorithm.curve.join("."));
        var curve = new EC(curveId);
        var pubkey = pub.data.subjectPrivateKey.data;
        return curve.verify(hash, sig, pubkey);
      }
      function dsaVerify(sig, hash, pub) {
        var p = pub.data.p;
        var q = pub.data.q;
        var g = pub.data.g;
        var y = pub.data.pub_key;
        var unpacked = parseKeys.signature.decode(sig, "der");
        var s = unpacked.s;
        var r = unpacked.r;
        checkValue(s, q);
        checkValue(r, q);
        var montp = BN.mont(p);
        var w = s.invm(q);
        var v = g.toRed(montp).redPow(new BN(hash).mul(w).mod(q)).fromRed().mul(y.toRed(montp).redPow(r.mul(w).mod(q)).fromRed()).mod(p).mod(q);
        return 0 === v.cmp(r);
      }
      function checkValue(b, q) {
        if (b.cmpn(0) <= 0) throw new Error("invalid sig");
        if (b.cmp(q) >= q) throw new Error("invalid sig");
      }
      module.exports = verify;
    }).call(this, require("buffer").Buffer);
  }, {
    "./curves.json": 42,
    "bn.js": 16,
    buffer: 47,
    elliptic: 67,
    "parse-asn1": 111
  } ],
  46: [ function(require, module, exports) {
    (function(Buffer) {
      module.exports = function xor(a, b) {
        var length = Math.min(a.length, b.length);
        var buffer = new Buffer(length);
        for (var i = 0; i < length; ++i) buffer[i] = a[i] ^ b[i];
        return buffer;
      };
    }).call(this, require("buffer").Buffer);
  }, {
    buffer: 47
  } ],
  47: [ function(require, module, exports) {
    (function(global) {
      "use strict";
      var base64 = require("base64-js");
      var ieee754 = require("ieee754");
      var isArray = require("isarray");
      exports.Buffer = Buffer;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      Buffer.TYPED_ARRAY_SUPPORT = void 0 !== global.TYPED_ARRAY_SUPPORT ? global.TYPED_ARRAY_SUPPORT : typedArraySupport();
      exports.kMaxLength = kMaxLength();
      function typedArraySupport() {
        try {
          var arr = new Uint8Array(1);
          arr.__proto__ = {
            __proto__: Uint8Array.prototype,
            foo: function() {
              return 42;
            }
          };
          return 42 === arr.foo() && "function" === typeof arr.subarray && 0 === arr.subarray(1, 1).byteLength;
        } catch (e) {
          return false;
        }
      }
      function kMaxLength() {
        return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
      }
      function createBuffer(that, length) {
        if (kMaxLength() < length) throw new RangeError("Invalid typed array length");
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          that = new Uint8Array(length);
          that.__proto__ = Buffer.prototype;
        } else {
          null === that && (that = new Buffer(length));
          that.length = length;
        }
        return that;
      }
      function Buffer(arg, encodingOrOffset, length) {
        if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) return new Buffer(arg, encodingOrOffset, length);
        if ("number" === typeof arg) {
          if ("string" === typeof encodingOrOffset) throw new Error("If encoding is specified then the first argument must be a string");
          return allocUnsafe(this, arg);
        }
        return from(this, arg, encodingOrOffset, length);
      }
      Buffer.poolSize = 8192;
      Buffer._augment = function(arr) {
        arr.__proto__ = Buffer.prototype;
        return arr;
      };
      function from(that, value, encodingOrOffset, length) {
        if ("number" === typeof value) throw new TypeError('"value" argument must not be a number');
        if ("undefined" !== typeof ArrayBuffer && value instanceof ArrayBuffer) return fromArrayBuffer(that, value, encodingOrOffset, length);
        if ("string" === typeof value) return fromString(that, value, encodingOrOffset);
        return fromObject(that, value);
      }
      Buffer.from = function(value, encodingOrOffset, length) {
        return from(null, value, encodingOrOffset, length);
      };
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        Buffer.prototype.__proto__ = Uint8Array.prototype;
        Buffer.__proto__ = Uint8Array;
        "undefined" !== typeof Symbol && Symbol.species && Buffer[Symbol.species] === Buffer && Object.defineProperty(Buffer, Symbol.species, {
          value: null,
          configurable: true
        });
      }
      function assertSize(size) {
        if ("number" !== typeof size) throw new TypeError('"size" argument must be a number');
        if (size < 0) throw new RangeError('"size" argument must not be negative');
      }
      function alloc(that, size, fill, encoding) {
        assertSize(size);
        if (size <= 0) return createBuffer(that, size);
        if (void 0 !== fill) return "string" === typeof encoding ? createBuffer(that, size).fill(fill, encoding) : createBuffer(that, size).fill(fill);
        return createBuffer(that, size);
      }
      Buffer.alloc = function(size, fill, encoding) {
        return alloc(null, size, fill, encoding);
      };
      function allocUnsafe(that, size) {
        assertSize(size);
        that = createBuffer(that, size < 0 ? 0 : 0 | checked(size));
        if (!Buffer.TYPED_ARRAY_SUPPORT) for (var i = 0; i < size; ++i) that[i] = 0;
        return that;
      }
      Buffer.allocUnsafe = function(size) {
        return allocUnsafe(null, size);
      };
      Buffer.allocUnsafeSlow = function(size) {
        return allocUnsafe(null, size);
      };
      function fromString(that, string, encoding) {
        "string" === typeof encoding && "" !== encoding || (encoding = "utf8");
        if (!Buffer.isEncoding(encoding)) throw new TypeError('"encoding" must be a valid string encoding');
        var length = 0 | byteLength(string, encoding);
        that = createBuffer(that, length);
        var actual = that.write(string, encoding);
        actual !== length && (that = that.slice(0, actual));
        return that;
      }
      function fromArrayLike(that, array) {
        var length = array.length < 0 ? 0 : 0 | checked(array.length);
        that = createBuffer(that, length);
        for (var i = 0; i < length; i += 1) that[i] = 255 & array[i];
        return that;
      }
      function fromArrayBuffer(that, array, byteOffset, length) {
        array.byteLength;
        if (byteOffset < 0 || array.byteLength < byteOffset) throw new RangeError("'offset' is out of bounds");
        if (array.byteLength < byteOffset + (length || 0)) throw new RangeError("'length' is out of bounds");
        array = void 0 === byteOffset && void 0 === length ? new Uint8Array(array) : void 0 === length ? new Uint8Array(array, byteOffset) : new Uint8Array(array, byteOffset, length);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          that = array;
          that.__proto__ = Buffer.prototype;
        } else that = fromArrayLike(that, array);
        return that;
      }
      function fromObject(that, obj) {
        if (Buffer.isBuffer(obj)) {
          var len = 0 | checked(obj.length);
          that = createBuffer(that, len);
          if (0 === that.length) return that;
          obj.copy(that, 0, 0, len);
          return that;
        }
        if (obj) {
          if ("undefined" !== typeof ArrayBuffer && obj.buffer instanceof ArrayBuffer || "length" in obj) {
            if ("number" !== typeof obj.length || isnan(obj.length)) return createBuffer(that, 0);
            return fromArrayLike(that, obj);
          }
          if ("Buffer" === obj.type && isArray(obj.data)) return fromArrayLike(that, obj.data);
        }
        throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.");
      }
      function checked(length) {
        if (length >= kMaxLength()) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + kMaxLength().toString(16) + " bytes");
        return 0 | length;
      }
      function SlowBuffer(length) {
        +length != length && (length = 0);
        return Buffer.alloc(+length);
      }
      Buffer.isBuffer = function isBuffer(b) {
        return !!(null != b && b._isBuffer);
      };
      Buffer.compare = function compare(a, b) {
        if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) throw new TypeError("Arguments must be Buffers");
        if (a === b) return 0;
        var x = a.length;
        var y = b.length;
        for (var i = 0, len = Math.min(x, y); i < len; ++i) if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break;
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
         case "hex":
         case "utf8":
         case "utf-8":
         case "ascii":
         case "latin1":
         case "binary":
         case "base64":
         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return true;

         default:
          return false;
        }
      };
      Buffer.concat = function concat(list, length) {
        if (!isArray(list)) throw new TypeError('"list" argument must be an Array of Buffers');
        if (0 === list.length) return Buffer.alloc(0);
        var i;
        if (void 0 === length) {
          length = 0;
          for (i = 0; i < list.length; ++i) length += list[i].length;
        }
        var buffer = Buffer.allocUnsafe(length);
        var pos = 0;
        for (i = 0; i < list.length; ++i) {
          var buf = list[i];
          if (!Buffer.isBuffer(buf)) throw new TypeError('"list" argument must be an Array of Buffers');
          buf.copy(buffer, pos);
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer.isBuffer(string)) return string.length;
        if ("undefined" !== typeof ArrayBuffer && "function" === typeof ArrayBuffer.isView && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) return string.byteLength;
        "string" !== typeof string && (string = "" + string);
        var len = string.length;
        if (0 === len) return 0;
        var loweredCase = false;
        for (;;) switch (encoding) {
         case "ascii":
         case "latin1":
         case "binary":
          return len;

         case "utf8":
         case "utf-8":
         case void 0:
          return utf8ToBytes(string).length;

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return 2 * len;

         case "hex":
          return len >>> 1;

         case "base64":
          return base64ToBytes(string).length;

         default:
          if (loweredCase) return utf8ToBytes(string).length;
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
        }
      }
      Buffer.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        var loweredCase = false;
        (void 0 === start || start < 0) && (start = 0);
        if (start > this.length) return "";
        (void 0 === end || end > this.length) && (end = this.length);
        if (end <= 0) return "";
        end >>>= 0;
        start >>>= 0;
        if (end <= start) return "";
        encoding || (encoding = "utf8");
        while (true) switch (encoding) {
         case "hex":
          return hexSlice(this, start, end);

         case "utf8":
         case "utf-8":
          return utf8Slice(this, start, end);

         case "ascii":
          return asciiSlice(this, start, end);

         case "latin1":
         case "binary":
          return latin1Slice(this, start, end);

         case "base64":
          return base64Slice(this, start, end);

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return utf16leSlice(this, start, end);

         default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
        }
      }
      Buffer.prototype._isBuffer = true;
      function swap(b, n, m) {
        var i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer.prototype.swap16 = function swap16() {
        var len = this.length;
        if (len % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (var i = 0; i < len; i += 2) swap(this, i, i + 1);
        return this;
      };
      Buffer.prototype.swap32 = function swap32() {
        var len = this.length;
        if (len % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (var i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer.prototype.swap64 = function swap64() {
        var len = this.length;
        if (len % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
        for (var i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer.prototype.toString = function toString() {
        var length = 0 | this.length;
        if (0 === length) return "";
        if (0 === arguments.length) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer.prototype.equals = function equals(b) {
        if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return 0 === Buffer.compare(this, b);
      };
      Buffer.prototype.inspect = function inspect() {
        var str = "";
        var max = exports.INSPECT_MAX_BYTES;
        if (this.length > 0) {
          str = this.toString("hex", 0, max).match(/.{2}/g).join(" ");
          this.length > max && (str += " ... ");
        }
        return "<Buffer " + str + ">";
      };
      Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (!Buffer.isBuffer(target)) throw new TypeError("Argument must be a Buffer");
        void 0 === start && (start = 0);
        void 0 === end && (end = target ? target.length : 0);
        void 0 === thisStart && (thisStart = 0);
        void 0 === thisEnd && (thisEnd = this.length);
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) throw new RangeError("out of range index");
        if (thisStart >= thisEnd && start >= end) return 0;
        if (thisStart >= thisEnd) return -1;
        if (start >= end) return 1;
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        var x = thisEnd - thisStart;
        var y = end - start;
        var len = Math.min(x, y);
        var thisCopy = this.slice(thisStart, thisEnd);
        var targetCopy = target.slice(start, end);
        for (var i = 0; i < len; ++i) if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break;
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (0 === buffer.length) return -1;
        if ("string" === typeof byteOffset) {
          encoding = byteOffset;
          byteOffset = 0;
        } else byteOffset > 2147483647 ? byteOffset = 2147483647 : byteOffset < -2147483648 && (byteOffset = -2147483648);
        byteOffset = +byteOffset;
        isNaN(byteOffset) && (byteOffset = dir ? 0 : buffer.length - 1);
        byteOffset < 0 && (byteOffset = buffer.length + byteOffset);
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (!dir) return -1;
          byteOffset = 0;
        }
        "string" === typeof val && (val = Buffer.from(val, encoding));
        if (Buffer.isBuffer(val)) {
          if (0 === val.length) return -1;
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        }
        if ("number" === typeof val) {
          val &= 255;
          if (Buffer.TYPED_ARRAY_SUPPORT && "function" === typeof Uint8Array.prototype.indexOf) return dir ? Uint8Array.prototype.indexOf.call(buffer, val, byteOffset) : Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
          return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        var indexSize = 1;
        var arrLength = arr.length;
        var valLength = val.length;
        if (void 0 !== encoding) {
          encoding = String(encoding).toLowerCase();
          if ("ucs2" === encoding || "ucs-2" === encoding || "utf16le" === encoding || "utf-16le" === encoding) {
            if (arr.length < 2 || val.length < 2) return -1;
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i) {
          return 1 === indexSize ? buf[i] : buf.readUInt16BE(i * indexSize);
        }
        var i;
        if (dir) {
          var foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) if (read(arr, i) === read(val, -1 === foundIndex ? 0 : i - foundIndex)) {
            -1 === foundIndex && (foundIndex = i);
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
          } else {
            -1 !== foundIndex && (i -= i - foundIndex);
            foundIndex = -1;
          }
        } else {
          byteOffset + valLength > arrLength && (byteOffset = arrLength - valLength);
          for (i = byteOffset; i >= 0; i--) {
            var found = true;
            for (var j = 0; j < valLength; j++) if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break;
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
        return -1 !== this.indexOf(val, byteOffset, encoding);
      };
      Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        var remaining = buf.length - offset;
        if (length) {
          length = Number(length);
          length > remaining && (length = remaining);
        } else length = remaining;
        var strLen = string.length;
        if (strLen % 2 !== 0) throw new TypeError("Invalid hex string");
        length > strLen / 2 && (length = strLen / 2);
        for (var i = 0; i < length; ++i) {
          var parsed = parseInt(string.substr(2 * i, 2), 16);
          if (isNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function latin1Write(buf, string, offset, length) {
        return asciiWrite(buf, string, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer.prototype.write = function write(string, offset, length, encoding) {
        if (void 0 === offset) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (void 0 === length && "string" === typeof offset) {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else {
          if (!isFinite(offset)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
          offset |= 0;
          if (isFinite(length)) {
            length |= 0;
            void 0 === encoding && (encoding = "utf8");
          } else {
            encoding = length;
            length = void 0;
          }
        }
        var remaining = this.length - offset;
        (void 0 === length || length > remaining) && (length = remaining);
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) throw new RangeError("Attempt to write outside buffer bounds");
        encoding || (encoding = "utf8");
        var loweredCase = false;
        for (;;) switch (encoding) {
         case "hex":
          return hexWrite(this, string, offset, length);

         case "utf8":
         case "utf-8":
          return utf8Write(this, string, offset, length);

         case "ascii":
          return asciiWrite(this, string, offset, length);

         case "latin1":
         case "binary":
          return latin1Write(this, string, offset, length);

         case "base64":
          return base64Write(this, string, offset, length);

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return ucs2Write(this, string, offset, length);

         default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
        }
      };
      Buffer.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        return 0 === start && end === buf.length ? base64.fromByteArray(buf) : base64.fromByteArray(buf.slice(start, end));
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        var res = [];
        var i = start;
        while (i < end) {
          var firstByte = buf[i];
          var codePoint = null;
          var bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            var secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
             case 1:
              firstByte < 128 && (codePoint = firstByte);
              break;

             case 2:
              secondByte = buf[i + 1];
              if (128 === (192 & secondByte)) {
                tempCodePoint = (31 & firstByte) << 6 | 63 & secondByte;
                tempCodePoint > 127 && (codePoint = tempCodePoint);
              }
              break;

             case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if (128 === (192 & secondByte) && 128 === (192 & thirdByte)) {
                tempCodePoint = (15 & firstByte) << 12 | (63 & secondByte) << 6 | 63 & thirdByte;
                tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343) && (codePoint = tempCodePoint);
              }
              break;

             case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if (128 === (192 & secondByte) && 128 === (192 & thirdByte) && 128 === (192 & fourthByte)) {
                tempCodePoint = (15 & firstByte) << 18 | (63 & secondByte) << 12 | (63 & thirdByte) << 6 | 63 & fourthByte;
                tempCodePoint > 65535 && tempCodePoint < 1114112 && (codePoint = tempCodePoint);
              }
            }
          }
          if (null === codePoint) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | 1023 & codePoint;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        var len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) return String.fromCharCode.apply(String, codePoints);
        var res = "";
        var i = 0;
        while (i < len) res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
        return res;
      }
      function asciiSlice(buf, start, end) {
        var ret = "";
        end = Math.min(buf.length, end);
        for (var i = start; i < end; ++i) ret += String.fromCharCode(127 & buf[i]);
        return ret;
      }
      function latin1Slice(buf, start, end) {
        var ret = "";
        end = Math.min(buf.length, end);
        for (var i = start; i < end; ++i) ret += String.fromCharCode(buf[i]);
        return ret;
      }
      function hexSlice(buf, start, end) {
        var len = buf.length;
        (!start || start < 0) && (start = 0);
        (!end || end < 0 || end > len) && (end = len);
        var out = "";
        for (var i = start; i < end; ++i) out += toHex(buf[i]);
        return out;
      }
      function utf16leSlice(buf, start, end) {
        var bytes = buf.slice(start, end);
        var res = "";
        for (var i = 0; i < bytes.length; i += 2) res += String.fromCharCode(bytes[i] + 256 * bytes[i + 1]);
        return res;
      }
      Buffer.prototype.slice = function slice(start, end) {
        var len = this.length;
        start = ~~start;
        end = void 0 === end ? len : ~~end;
        if (start < 0) {
          start += len;
          start < 0 && (start = 0);
        } else start > len && (start = len);
        if (end < 0) {
          end += len;
          end < 0 && (end = 0);
        } else end > len && (end = len);
        end < start && (end = start);
        var newBuf;
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          newBuf = this.subarray(start, end);
          newBuf.__proto__ = Buffer.prototype;
        } else {
          var sliceLen = end - start;
          newBuf = new Buffer(sliceLen, void 0);
          for (var i = 0; i < sliceLen; ++i) newBuf[i] = this[i + start];
        }
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset];
        var mul = 1;
        var i = 0;
        while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
        return val;
      };
      Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset + --byteLength];
        var mul = 1;
        while (byteLength > 0 && (mul *= 256)) val += this[offset + --byteLength] * mul;
        return val;
      };
      Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        noAssert || checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + 16777216 * this[offset + 3];
      };
      Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return 16777216 * this[offset] + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset];
        var mul = 1;
        var i = 0;
        while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
        mul *= 128;
        val >= mul && (val -= Math.pow(2, 8 * byteLength));
        return val;
      };
      Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var i = byteLength;
        var mul = 1;
        var val = this[offset + --i];
        while (i > 0 && (mul *= 256)) val += this[offset + --i] * mul;
        mul *= 128;
        val >= mul && (val -= Math.pow(2, 8 * byteLength));
        return val;
      };
      Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
        noAssert || checkOffset(offset, 1, this.length);
        if (!(128 & this[offset])) return this[offset];
        return -1 * (255 - this[offset] + 1);
      };
      Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        var val = this[offset] | this[offset + 1] << 8;
        return 32768 & val ? 4294901760 | val : val;
      };
      Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        var val = this[offset + 1] | this[offset] << 8;
        return 32768 & val ? 4294901760 | val : val;
      };
      Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        noAssert || checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        noAssert || checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        byteLength |= 0;
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1;
          checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        var mul = 1;
        var i = 0;
        this[offset] = 255 & value;
        while (++i < byteLength && (mul *= 256)) this[offset + i] = value / mul & 255;
        return offset + byteLength;
      };
      Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        byteLength |= 0;
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1;
          checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        var i = byteLength - 1;
        var mul = 1;
        this[offset + i] = 255 & value;
        while (--i >= 0 && (mul *= 256)) this[offset + i] = value / mul & 255;
        return offset + byteLength;
      };
      Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 1, 255, 0);
        Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value));
        this[offset] = 255 & value;
        return offset + 1;
      };
      function objectWriteUInt16(buf, value, offset, littleEndian) {
        value < 0 && (value = 65535 + value + 1);
        for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) buf[offset + i] = (value & 255 << 8 * (littleEndian ? i : 1 - i)) >>> 8 * (littleEndian ? i : 1 - i);
      }
      Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 65535, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
        } else objectWriteUInt16(this, value, offset, true);
        return offset + 2;
      };
      Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 65535, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 8;
          this[offset + 1] = 255 & value;
        } else objectWriteUInt16(this, value, offset, false);
        return offset + 2;
      };
      function objectWriteUInt32(buf, value, offset, littleEndian) {
        value < 0 && (value = 4294967295 + value + 1);
        for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) buf[offset + i] = value >>> 8 * (littleEndian ? i : 3 - i) & 255;
      }
      Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 4294967295, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset + 3] = value >>> 24;
          this[offset + 2] = value >>> 16;
          this[offset + 1] = value >>> 8;
          this[offset] = 255 & value;
        } else objectWriteUInt32(this, value, offset, true);
        return offset + 4;
      };
      Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 4294967295, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = 255 & value;
        } else objectWriteUInt32(this, value, offset, false);
        return offset + 4;
      };
      Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        if (!noAssert) {
          var limit = Math.pow(2, 8 * byteLength - 1);
          checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        var i = 0;
        var mul = 1;
        var sub = 0;
        this[offset] = 255 & value;
        while (++i < byteLength && (mul *= 256)) {
          value < 0 && 0 === sub && 0 !== this[offset + i - 1] && (sub = 1);
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength;
      };
      Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        if (!noAssert) {
          var limit = Math.pow(2, 8 * byteLength - 1);
          checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        var i = byteLength - 1;
        var mul = 1;
        var sub = 0;
        this[offset + i] = 255 & value;
        while (--i >= 0 && (mul *= 256)) {
          value < 0 && 0 === sub && 0 !== this[offset + i + 1] && (sub = 1);
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength;
      };
      Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 1, 127, -128);
        Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value));
        value < 0 && (value = 255 + value + 1);
        this[offset] = 255 & value;
        return offset + 1;
      };
      Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 32767, -32768);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
        } else objectWriteUInt16(this, value, offset, true);
        return offset + 2;
      };
      Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 32767, -32768);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 8;
          this[offset + 1] = 255 & value;
        } else objectWriteUInt16(this, value, offset, false);
        return offset + 2;
      };
      Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
          this[offset + 2] = value >>> 16;
          this[offset + 3] = value >>> 24;
        } else objectWriteUInt32(this, value, offset, true);
        return offset + 4;
      };
      Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648);
        value < 0 && (value = 4294967295 + value + 1);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = 255 & value;
        } else objectWriteUInt32(this, value, offset, false);
        return offset + 4;
      };
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        noAssert || checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38);
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        noAssert || checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308);
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer.prototype.copy = function copy(target, targetStart, start, end) {
        start || (start = 0);
        end || 0 === end || (end = this.length);
        targetStart >= target.length && (targetStart = target.length);
        targetStart || (targetStart = 0);
        end > 0 && end < start && (end = start);
        if (end === start) return 0;
        if (0 === target.length || 0 === this.length) return 0;
        if (targetStart < 0) throw new RangeError("targetStart out of bounds");
        if (start < 0 || start >= this.length) throw new RangeError("sourceStart out of bounds");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        end > this.length && (end = this.length);
        target.length - targetStart < end - start && (end = target.length - targetStart + start);
        var len = end - start;
        var i;
        if (this === target && start < targetStart && targetStart < end) for (i = len - 1; i >= 0; --i) target[i + targetStart] = this[i + start]; else if (len < 1e3 || !Buffer.TYPED_ARRAY_SUPPORT) for (i = 0; i < len; ++i) target[i + targetStart] = this[i + start]; else Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
        return len;
      };
      Buffer.prototype.fill = function fill(val, start, end, encoding) {
        if ("string" === typeof val) {
          if ("string" === typeof start) {
            encoding = start;
            start = 0;
            end = this.length;
          } else if ("string" === typeof end) {
            encoding = end;
            end = this.length;
          }
          if (1 === val.length) {
            var code = val.charCodeAt(0);
            code < 256 && (val = code);
          }
          if (void 0 !== encoding && "string" !== typeof encoding) throw new TypeError("encoding must be a string");
          if ("string" === typeof encoding && !Buffer.isEncoding(encoding)) throw new TypeError("Unknown encoding: " + encoding);
        } else "number" === typeof val && (val &= 255);
        if (start < 0 || this.length < start || this.length < end) throw new RangeError("Out of range index");
        if (end <= start) return this;
        start >>>= 0;
        end = void 0 === end ? this.length : end >>> 0;
        val || (val = 0);
        var i;
        if ("number" === typeof val) for (i = start; i < end; ++i) this[i] = val; else {
          var bytes = Buffer.isBuffer(val) ? val : utf8ToBytes(new Buffer(val, encoding).toString());
          var len = bytes.length;
          for (i = 0; i < end - start; ++i) this[i + start] = bytes[i % len];
        }
        return this;
      };
      var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = stringtrim(str).replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) str += "=";
        return str;
      }
      function stringtrim(str) {
        if (str.trim) return str.trim();
        return str.replace(/^\s+|\s+$/g, "");
      }
      function toHex(n) {
        if (n < 16) return "0" + n.toString(16);
        return n.toString(16);
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        var codePoint;
        var length = string.length;
        var leadSurrogate = null;
        var bytes = [];
        for (var i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                (units -= 3) > -1 && bytes.push(239, 191, 189);
                continue;
              }
              if (i + 1 === length) {
                (units -= 3) > -1 && bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              (units -= 3) > -1 && bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = 65536 + (leadSurrogate - 55296 << 10 | codePoint - 56320);
          } else leadSurrogate && (units -= 3) > -1 && bytes.push(239, 191, 189);
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(codePoint >> 6 | 192, 63 & codePoint | 128);
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
          } else {
            if (!(codePoint < 1114112)) throw new Error("Invalid code point");
            if ((units -= 4) < 0) break;
            bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        var byteArray = [];
        for (var i = 0; i < str.length; ++i) byteArray.push(255 & str.charCodeAt(i));
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        var c, hi, lo;
        var byteArray = [];
        for (var i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        for (var i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isnan(val) {
        return val !== val;
      }
    }).call(this, "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    "base64-js": 15,
    ieee754: 99,
    isarray: 48
  } ],
  48: [ function(require, module, exports) {
    var toString = {}.toString;
    module.exports = Array.isArray || function(arr) {
      return "[object Array]" == toString.call(arr);
    };
  }, {} ],
  49: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    var Transform = require("stream").Transform;
    var StringDecoder = require("string_decoder").StringDecoder;
    var inherits = require("inherits");
    function CipherBase(hashMode) {
      Transform.call(this);
      this.hashMode = "string" === typeof hashMode;
      this.hashMode ? this[hashMode] = this._finalOrDigest : this.final = this._finalOrDigest;
      if (this._final) {
        this.__final = this._final;
        this._final = null;
      }
      this._decoder = null;
      this._encoding = null;
    }
    inherits(CipherBase, Transform);
    CipherBase.prototype.update = function(data, inputEnc, outputEnc) {
      "string" === typeof data && (data = Buffer.from(data, inputEnc));
      var outData = this._update(data);
      if (this.hashMode) return this;
      outputEnc && (outData = this._toString(outData, outputEnc));
      return outData;
    };
    CipherBase.prototype.setAutoPadding = function() {};
    CipherBase.prototype.getAuthTag = function() {
      throw new Error("trying to get auth tag in unsupported state");
    };
    CipherBase.prototype.setAuthTag = function() {
      throw new Error("trying to set auth tag in unsupported state");
    };
    CipherBase.prototype.setAAD = function() {
      throw new Error("trying to set aad in unsupported state");
    };
    CipherBase.prototype._transform = function(data, _, next) {
      var err;
      try {
        this.hashMode ? this._update(data) : this.push(this._update(data));
      } catch (e) {
        err = e;
      } finally {
        next(err);
      }
    };
    CipherBase.prototype._flush = function(done) {
      var err;
      try {
        this.push(this.__final());
      } catch (e) {
        err = e;
      }
      done(err);
    };
    CipherBase.prototype._finalOrDigest = function(outputEnc) {
      var outData = this.__final() || Buffer.alloc(0);
      outputEnc && (outData = this._toString(outData, outputEnc, true));
      return outData;
    };
    CipherBase.prototype._toString = function(value, enc, fin) {
      if (!this._decoder) {
        this._decoder = new StringDecoder(enc);
        this._encoding = enc;
      }
      if (this._encoding !== enc) throw new Error("can't switch encodings");
      var out = this._decoder.write(value);
      fin && (out += this._decoder.end());
      return out;
    };
    module.exports = CipherBase;
  }, {
    inherits: 101,
    "safe-buffer": 143,
    stream: 152,
    string_decoder: 153
  } ],
  50: [ function(require, module, exports) {
    (function(Buffer) {
      function isArray(arg) {
        if (Array.isArray) return Array.isArray(arg);
        return "[object Array]" === objectToString(arg);
      }
      exports.isArray = isArray;
      function isBoolean(arg) {
        return "boolean" === typeof arg;
      }
      exports.isBoolean = isBoolean;
      function isNull(arg) {
        return null === arg;
      }
      exports.isNull = isNull;
      function isNullOrUndefined(arg) {
        return null == arg;
      }
      exports.isNullOrUndefined = isNullOrUndefined;
      function isNumber(arg) {
        return "number" === typeof arg;
      }
      exports.isNumber = isNumber;
      function isString(arg) {
        return "string" === typeof arg;
      }
      exports.isString = isString;
      function isSymbol(arg) {
        return "symbol" === typeof arg;
      }
      exports.isSymbol = isSymbol;
      function isUndefined(arg) {
        return void 0 === arg;
      }
      exports.isUndefined = isUndefined;
      function isRegExp(re) {
        return "[object RegExp]" === objectToString(re);
      }
      exports.isRegExp = isRegExp;
      function isObject(arg) {
        return "object" === typeof arg && null !== arg;
      }
      exports.isObject = isObject;
      function isDate(d) {
        return "[object Date]" === objectToString(d);
      }
      exports.isDate = isDate;
      function isError(e) {
        return "[object Error]" === objectToString(e) || e instanceof Error;
      }
      exports.isError = isError;
      function isFunction(arg) {
        return "function" === typeof arg;
      }
      exports.isFunction = isFunction;
      function isPrimitive(arg) {
        return null === arg || "boolean" === typeof arg || "number" === typeof arg || "string" === typeof arg || "symbol" === typeof arg || "undefined" === typeof arg;
      }
      exports.isPrimitive = isPrimitive;
      exports.isBuffer = Buffer.isBuffer;
      function objectToString(o) {
        return Object.prototype.toString.call(o);
      }
    }).call(this, {
      isBuffer: require("../../is-buffer/index.js")
    });
  }, {
    "../../is-buffer/index.js": 102
  } ],
  51: [ function(require, module, exports) {
    (function(Buffer) {
      var elliptic = require("elliptic");
      var BN = require("bn.js");
      module.exports = function createECDH(curve) {
        return new ECDH(curve);
      };
      var aliases = {
        secp256k1: {
          name: "secp256k1",
          byteLength: 32
        },
        secp224r1: {
          name: "p224",
          byteLength: 28
        },
        prime256v1: {
          name: "p256",
          byteLength: 32
        },
        prime192v1: {
          name: "p192",
          byteLength: 24
        },
        ed25519: {
          name: "ed25519",
          byteLength: 32
        },
        secp384r1: {
          name: "p384",
          byteLength: 48
        },
        secp521r1: {
          name: "p521",
          byteLength: 66
        }
      };
      aliases.p224 = aliases.secp224r1;
      aliases.p256 = aliases.secp256r1 = aliases.prime256v1;
      aliases.p192 = aliases.secp192r1 = aliases.prime192v1;
      aliases.p384 = aliases.secp384r1;
      aliases.p521 = aliases.secp521r1;
      function ECDH(curve) {
        this.curveType = aliases[curve];
        this.curveType || (this.curveType = {
          name: curve
        });
        this.curve = new elliptic.ec(this.curveType.name);
        this.keys = void 0;
      }
      ECDH.prototype.generateKeys = function(enc, format) {
        this.keys = this.curve.genKeyPair();
        return this.getPublicKey(enc, format);
      };
      ECDH.prototype.computeSecret = function(other, inenc, enc) {
        inenc = inenc || "utf8";
        Buffer.isBuffer(other) || (other = new Buffer(other, inenc));
        var otherPub = this.curve.keyFromPublic(other).getPublic();
        var out = otherPub.mul(this.keys.getPrivate()).getX();
        return formatReturnValue(out, enc, this.curveType.byteLength);
      };
      ECDH.prototype.getPublicKey = function(enc, format) {
        var key = this.keys.getPublic("compressed" === format, true);
        "hybrid" === format && (key[key.length - 1] % 2 ? key[0] = 7 : key[0] = 6);
        return formatReturnValue(key, enc);
      };
      ECDH.prototype.getPrivateKey = function(enc) {
        return formatReturnValue(this.keys.getPrivate(), enc);
      };
      ECDH.prototype.setPublicKey = function(pub, enc) {
        enc = enc || "utf8";
        Buffer.isBuffer(pub) || (pub = new Buffer(pub, enc));
        this.keys._importPublic(pub);
        return this;
      };
      ECDH.prototype.setPrivateKey = function(priv, enc) {
        enc = enc || "utf8";
        Buffer.isBuffer(priv) || (priv = new Buffer(priv, enc));
        var _priv = new BN(priv);
        _priv = _priv.toString(16);
        this.keys = this.curve.genKeyPair();
        this.keys._importPrivate(_priv);
        return this;
      };
      function formatReturnValue(bn, enc, len) {
        Array.isArray(bn) || (bn = bn.toArray());
        var buf = new Buffer(bn);
        if (len && buf.length < len) {
          var zeros = new Buffer(len - buf.length);
          zeros.fill(0);
          buf = Buffer.concat([ zeros, buf ]);
        }
        return enc ? buf.toString(enc) : buf;
      }
    }).call(this, require("buffer").Buffer);
  }, {
    "bn.js": 16,
    buffer: 47,
    elliptic: 67
  } ],
  52: [ function(require, module, exports) {
    "use strict";
    var inherits = require("inherits");
    var MD5 = require("md5.js");
    var RIPEMD160 = require("ripemd160");
    var sha = require("sha.js");
    var Base = require("cipher-base");
    function Hash(hash) {
      Base.call(this, "digest");
      this._hash = hash;
    }
    inherits(Hash, Base);
    Hash.prototype._update = function(data) {
      this._hash.update(data);
    };
    Hash.prototype._final = function() {
      return this._hash.digest();
    };
    module.exports = function createHash(alg) {
      alg = alg.toLowerCase();
      if ("md5" === alg) return new MD5();
      if ("rmd160" === alg || "ripemd160" === alg) return new RIPEMD160();
      return new Hash(sha(alg));
    };
  }, {
    "cipher-base": 49,
    inherits: 101,
    "md5.js": 103,
    ripemd160: 142,
    "sha.js": 145
  } ],
  53: [ function(require, module, exports) {
    var MD5 = require("md5.js");
    module.exports = function(buffer) {
      return new MD5().update(buffer).digest();
    };
  }, {
    "md5.js": 103
  } ],
  54: [ function(require, module, exports) {
    "use strict";
    var inherits = require("inherits");
    var Legacy = require("./legacy");
    var Base = require("cipher-base");
    var Buffer = require("safe-buffer").Buffer;
    var md5 = require("create-hash/md5");
    var RIPEMD160 = require("ripemd160");
    var sha = require("sha.js");
    var ZEROS = Buffer.alloc(128);
    function Hmac(alg, key) {
      Base.call(this, "digest");
      "string" === typeof key && (key = Buffer.from(key));
      var blocksize = "sha512" === alg || "sha384" === alg ? 128 : 64;
      this._alg = alg;
      this._key = key;
      if (key.length > blocksize) {
        var hash = "rmd160" === alg ? new RIPEMD160() : sha(alg);
        key = hash.update(key).digest();
      } else key.length < blocksize && (key = Buffer.concat([ key, ZEROS ], blocksize));
      var ipad = this._ipad = Buffer.allocUnsafe(blocksize);
      var opad = this._opad = Buffer.allocUnsafe(blocksize);
      for (var i = 0; i < blocksize; i++) {
        ipad[i] = 54 ^ key[i];
        opad[i] = 92 ^ key[i];
      }
      this._hash = "rmd160" === alg ? new RIPEMD160() : sha(alg);
      this._hash.update(ipad);
    }
    inherits(Hmac, Base);
    Hmac.prototype._update = function(data) {
      this._hash.update(data);
    };
    Hmac.prototype._final = function() {
      var h = this._hash.digest();
      var hash = "rmd160" === this._alg ? new RIPEMD160() : sha(this._alg);
      return hash.update(this._opad).update(h).digest();
    };
    module.exports = function createHmac(alg, key) {
      alg = alg.toLowerCase();
      if ("rmd160" === alg || "ripemd160" === alg) return new Hmac("rmd160", key);
      if ("md5" === alg) return new Legacy(md5, key);
      return new Hmac(alg, key);
    };
  }, {
    "./legacy": 55,
    "cipher-base": 49,
    "create-hash/md5": 53,
    inherits: 101,
    ripemd160: 142,
    "safe-buffer": 143,
    "sha.js": 145
  } ],
  55: [ function(require, module, exports) {
    "use strict";
    var inherits = require("inherits");
    var Buffer = require("safe-buffer").Buffer;
    var Base = require("cipher-base");
    var ZEROS = Buffer.alloc(128);
    var blocksize = 64;
    function Hmac(alg, key) {
      Base.call(this, "digest");
      "string" === typeof key && (key = Buffer.from(key));
      this._alg = alg;
      this._key = key;
      key.length > blocksize ? key = alg(key) : key.length < blocksize && (key = Buffer.concat([ key, ZEROS ], blocksize));
      var ipad = this._ipad = Buffer.allocUnsafe(blocksize);
      var opad = this._opad = Buffer.allocUnsafe(blocksize);
      for (var i = 0; i < blocksize; i++) {
        ipad[i] = 54 ^ key[i];
        opad[i] = 92 ^ key[i];
      }
      this._hash = [ ipad ];
    }
    inherits(Hmac, Base);
    Hmac.prototype._update = function(data) {
      this._hash.push(data);
    };
    Hmac.prototype._final = function() {
      var h = this._alg(Buffer.concat(this._hash));
      return this._alg(Buffer.concat([ this._opad, h ]));
    };
    module.exports = Hmac;
  }, {
    "cipher-base": 49,
    inherits: 101,
    "safe-buffer": 143
  } ],
  56: [ function(require, module, exports) {
    "use strict";
    exports.randomBytes = exports.rng = exports.pseudoRandomBytes = exports.prng = require("randombytes");
    exports.createHash = exports.Hash = require("create-hash");
    exports.createHmac = exports.Hmac = require("create-hmac");
    var algos = require("browserify-sign/algos");
    var algoKeys = Object.keys(algos);
    var hashes = [ "sha1", "sha224", "sha256", "sha384", "sha512", "md5", "rmd160" ].concat(algoKeys);
    exports.getHashes = function() {
      return hashes;
    };
    var p = require("pbkdf2");
    exports.pbkdf2 = p.pbkdf2;
    exports.pbkdf2Sync = p.pbkdf2Sync;
    var aes = require("browserify-cipher");
    exports.Cipher = aes.Cipher;
    exports.createCipher = aes.createCipher;
    exports.Cipheriv = aes.Cipheriv;
    exports.createCipheriv = aes.createCipheriv;
    exports.Decipher = aes.Decipher;
    exports.createDecipher = aes.createDecipher;
    exports.Decipheriv = aes.Decipheriv;
    exports.createDecipheriv = aes.createDecipheriv;
    exports.getCiphers = aes.getCiphers;
    exports.listCiphers = aes.listCiphers;
    var dh = require("diffie-hellman");
    exports.DiffieHellmanGroup = dh.DiffieHellmanGroup;
    exports.createDiffieHellmanGroup = dh.createDiffieHellmanGroup;
    exports.getDiffieHellman = dh.getDiffieHellman;
    exports.createDiffieHellman = dh.createDiffieHellman;
    exports.DiffieHellman = dh.DiffieHellman;
    var sign = require("browserify-sign");
    exports.createSign = sign.createSign;
    exports.Sign = sign.Sign;
    exports.createVerify = sign.createVerify;
    exports.Verify = sign.Verify;
    exports.createECDH = require("create-ecdh");
    var publicEncrypt = require("public-encrypt");
    exports.publicEncrypt = publicEncrypt.publicEncrypt;
    exports.privateEncrypt = publicEncrypt.privateEncrypt;
    exports.publicDecrypt = publicEncrypt.publicDecrypt;
    exports.privateDecrypt = publicEncrypt.privateDecrypt;
    var rf = require("randomfill");
    exports.randomFill = rf.randomFill;
    exports.randomFillSync = rf.randomFillSync;
    exports.createCredentials = function() {
      throw new Error([ "sorry, createCredentials is not implemented yet", "we accept pull requests", "https://github.com/crypto-browserify/crypto-browserify" ].join("\n"));
    };
    exports.constants = {
      DH_CHECK_P_NOT_SAFE_PRIME: 2,
      DH_CHECK_P_NOT_PRIME: 1,
      DH_UNABLE_TO_CHECK_GENERATOR: 4,
      DH_NOT_SUITABLE_GENERATOR: 8,
      NPN_ENABLED: 1,
      ALPN_ENABLED: 1,
      RSA_PKCS1_PADDING: 1,
      RSA_SSLV23_PADDING: 2,
      RSA_NO_PADDING: 3,
      RSA_PKCS1_OAEP_PADDING: 4,
      RSA_X931_PADDING: 5,
      RSA_PKCS1_PSS_PADDING: 6,
      POINT_CONVERSION_COMPRESSED: 2,
      POINT_CONVERSION_UNCOMPRESSED: 4,
      POINT_CONVERSION_HYBRID: 6
    };
  }, {
    "browserify-cipher": 36,
    "browserify-sign": 43,
    "browserify-sign/algos": 40,
    "create-ecdh": 51,
    "create-hash": 52,
    "create-hmac": 54,
    "diffie-hellman": 63,
    pbkdf2: 112,
    "public-encrypt": 119,
    randombytes: 125,
    randomfill: 126
  } ],
  57: [ function(require, module, exports) {
    "use strict";
    exports.utils = require("./des/utils");
    exports.Cipher = require("./des/cipher");
    exports.DES = require("./des/des");
    exports.CBC = require("./des/cbc");
    exports.EDE = require("./des/ede");
  }, {
    "./des/cbc": 58,
    "./des/cipher": 59,
    "./des/des": 60,
    "./des/ede": 61,
    "./des/utils": 62
  } ],
  58: [ function(require, module, exports) {
    "use strict";
    var assert = require("minimalistic-assert");
    var inherits = require("inherits");
    var proto = {};
    function CBCState(iv) {
      assert.equal(iv.length, 8, "Invalid IV length");
      this.iv = new Array(8);
      for (var i = 0; i < this.iv.length; i++) this.iv[i] = iv[i];
    }
    function instantiate(Base) {
      function CBC(options) {
        Base.call(this, options);
        this._cbcInit();
      }
      inherits(CBC, Base);
      var keys = Object.keys(proto);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        CBC.prototype[key] = proto[key];
      }
      CBC.create = function create(options) {
        return new CBC(options);
      };
      return CBC;
    }
    exports.instantiate = instantiate;
    proto._cbcInit = function _cbcInit() {
      var state = new CBCState(this.options.iv);
      this._cbcState = state;
    };
    proto._update = function _update(inp, inOff, out, outOff) {
      var state = this._cbcState;
      var superProto = this.constructor.super_.prototype;
      var iv = state.iv;
      if ("encrypt" === this.type) {
        for (var i = 0; i < this.blockSize; i++) iv[i] ^= inp[inOff + i];
        superProto._update.call(this, iv, 0, out, outOff);
        for (var i = 0; i < this.blockSize; i++) iv[i] = out[outOff + i];
      } else {
        superProto._update.call(this, inp, inOff, out, outOff);
        for (var i = 0; i < this.blockSize; i++) out[outOff + i] ^= iv[i];
        for (var i = 0; i < this.blockSize; i++) iv[i] = inp[inOff + i];
      }
    };
  }, {
    inherits: 101,
    "minimalistic-assert": 105
  } ],
  59: [ function(require, module, exports) {
    "use strict";
    var assert = require("minimalistic-assert");
    function Cipher(options) {
      this.options = options;
      this.type = this.options.type;
      this.blockSize = 8;
      this._init();
      this.buffer = new Array(this.blockSize);
      this.bufferOff = 0;
    }
    module.exports = Cipher;
    Cipher.prototype._init = function _init() {};
    Cipher.prototype.update = function update(data) {
      if (0 === data.length) return [];
      return "decrypt" === this.type ? this._updateDecrypt(data) : this._updateEncrypt(data);
    };
    Cipher.prototype._buffer = function _buffer(data, off) {
      var min = Math.min(this.buffer.length - this.bufferOff, data.length - off);
      for (var i = 0; i < min; i++) this.buffer[this.bufferOff + i] = data[off + i];
      this.bufferOff += min;
      return min;
    };
    Cipher.prototype._flushBuffer = function _flushBuffer(out, off) {
      this._update(this.buffer, 0, out, off);
      this.bufferOff = 0;
      return this.blockSize;
    };
    Cipher.prototype._updateEncrypt = function _updateEncrypt(data) {
      var inputOff = 0;
      var outputOff = 0;
      var count = (this.bufferOff + data.length) / this.blockSize | 0;
      var out = new Array(count * this.blockSize);
      if (0 !== this.bufferOff) {
        inputOff += this._buffer(data, inputOff);
        this.bufferOff === this.buffer.length && (outputOff += this._flushBuffer(out, outputOff));
      }
      var max = data.length - (data.length - inputOff) % this.blockSize;
      for (;inputOff < max; inputOff += this.blockSize) {
        this._update(data, inputOff, out, outputOff);
        outputOff += this.blockSize;
      }
      for (;inputOff < data.length; inputOff++, this.bufferOff++) this.buffer[this.bufferOff] = data[inputOff];
      return out;
    };
    Cipher.prototype._updateDecrypt = function _updateDecrypt(data) {
      var inputOff = 0;
      var outputOff = 0;
      var count = Math.ceil((this.bufferOff + data.length) / this.blockSize) - 1;
      var out = new Array(count * this.blockSize);
      for (;count > 0; count--) {
        inputOff += this._buffer(data, inputOff);
        outputOff += this._flushBuffer(out, outputOff);
      }
      inputOff += this._buffer(data, inputOff);
      return out;
    };
    Cipher.prototype.final = function final(buffer) {
      var first;
      buffer && (first = this.update(buffer));
      var last;
      last = "encrypt" === this.type ? this._finalEncrypt() : this._finalDecrypt();
      return first ? first.concat(last) : last;
    };
    Cipher.prototype._pad = function _pad(buffer, off) {
      if (0 === off) return false;
      while (off < buffer.length) buffer[off++] = 0;
      return true;
    };
    Cipher.prototype._finalEncrypt = function _finalEncrypt() {
      if (!this._pad(this.buffer, this.bufferOff)) return [];
      var out = new Array(this.blockSize);
      this._update(this.buffer, 0, out, 0);
      return out;
    };
    Cipher.prototype._unpad = function _unpad(buffer) {
      return buffer;
    };
    Cipher.prototype._finalDecrypt = function _finalDecrypt() {
      assert.equal(this.bufferOff, this.blockSize, "Not enough data to decrypt");
      var out = new Array(this.blockSize);
      this._flushBuffer(out, 0);
      return this._unpad(out);
    };
  }, {
    "minimalistic-assert": 105
  } ],
  60: [ function(require, module, exports) {
    "use strict";
    var assert = require("minimalistic-assert");
    var inherits = require("inherits");
    var utils = require("./utils");
    var Cipher = require("./cipher");
    function DESState() {
      this.tmp = new Array(2);
      this.keys = null;
    }
    function DES(options) {
      Cipher.call(this, options);
      var state = new DESState();
      this._desState = state;
      this.deriveKeys(state, options.key);
    }
    inherits(DES, Cipher);
    module.exports = DES;
    DES.create = function create(options) {
      return new DES(options);
    };
    var shiftTable = [ 1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1 ];
    DES.prototype.deriveKeys = function deriveKeys(state, key) {
      state.keys = new Array(32);
      assert.equal(key.length, this.blockSize, "Invalid key length");
      var kL = utils.readUInt32BE(key, 0);
      var kR = utils.readUInt32BE(key, 4);
      utils.pc1(kL, kR, state.tmp, 0);
      kL = state.tmp[0];
      kR = state.tmp[1];
      for (var i = 0; i < state.keys.length; i += 2) {
        var shift = shiftTable[i >>> 1];
        kL = utils.r28shl(kL, shift);
        kR = utils.r28shl(kR, shift);
        utils.pc2(kL, kR, state.keys, i);
      }
    };
    DES.prototype._update = function _update(inp, inOff, out, outOff) {
      var state = this._desState;
      var l = utils.readUInt32BE(inp, inOff);
      var r = utils.readUInt32BE(inp, inOff + 4);
      utils.ip(l, r, state.tmp, 0);
      l = state.tmp[0];
      r = state.tmp[1];
      "encrypt" === this.type ? this._encrypt(state, l, r, state.tmp, 0) : this._decrypt(state, l, r, state.tmp, 0);
      l = state.tmp[0];
      r = state.tmp[1];
      utils.writeUInt32BE(out, l, outOff);
      utils.writeUInt32BE(out, r, outOff + 4);
    };
    DES.prototype._pad = function _pad(buffer, off) {
      var value = buffer.length - off;
      for (var i = off; i < buffer.length; i++) buffer[i] = value;
      return true;
    };
    DES.prototype._unpad = function _unpad(buffer) {
      var pad = buffer[buffer.length - 1];
      for (var i = buffer.length - pad; i < buffer.length; i++) assert.equal(buffer[i], pad);
      return buffer.slice(0, buffer.length - pad);
    };
    DES.prototype._encrypt = function _encrypt(state, lStart, rStart, out, off) {
      var l = lStart;
      var r = rStart;
      for (var i = 0; i < state.keys.length; i += 2) {
        var keyL = state.keys[i];
        var keyR = state.keys[i + 1];
        utils.expand(r, state.tmp, 0);
        keyL ^= state.tmp[0];
        keyR ^= state.tmp[1];
        var s = utils.substitute(keyL, keyR);
        var f = utils.permute(s);
        var t = r;
        r = (l ^ f) >>> 0;
        l = t;
      }
      utils.rip(r, l, out, off);
    };
    DES.prototype._decrypt = function _decrypt(state, lStart, rStart, out, off) {
      var l = rStart;
      var r = lStart;
      for (var i = state.keys.length - 2; i >= 0; i -= 2) {
        var keyL = state.keys[i];
        var keyR = state.keys[i + 1];
        utils.expand(l, state.tmp, 0);
        keyL ^= state.tmp[0];
        keyR ^= state.tmp[1];
        var s = utils.substitute(keyL, keyR);
        var f = utils.permute(s);
        var t = l;
        l = (r ^ f) >>> 0;
        r = t;
      }
      utils.rip(l, r, out, off);
    };
  }, {
    "./cipher": 59,
    "./utils": 62,
    inherits: 101,
    "minimalistic-assert": 105
  } ],
  61: [ function(require, module, exports) {
    "use strict";
    var assert = require("minimalistic-assert");
    var inherits = require("inherits");
    var Cipher = require("./cipher");
    var DES = require("./des");
    function EDEState(type, key) {
      assert.equal(key.length, 24, "Invalid key length");
      var k1 = key.slice(0, 8);
      var k2 = key.slice(8, 16);
      var k3 = key.slice(16, 24);
      this.ciphers = "encrypt" === type ? [ DES.create({
        type: "encrypt",
        key: k1
      }), DES.create({
        type: "decrypt",
        key: k2
      }), DES.create({
        type: "encrypt",
        key: k3
      }) ] : [ DES.create({
        type: "decrypt",
        key: k3
      }), DES.create({
        type: "encrypt",
        key: k2
      }), DES.create({
        type: "decrypt",
        key: k1
      }) ];
    }
    function EDE(options) {
      Cipher.call(this, options);
      var state = new EDEState(this.type, this.options.key);
      this._edeState = state;
    }
    inherits(EDE, Cipher);
    module.exports = EDE;
    EDE.create = function create(options) {
      return new EDE(options);
    };
    EDE.prototype._update = function _update(inp, inOff, out, outOff) {
      var state = this._edeState;
      state.ciphers[0]._update(inp, inOff, out, outOff);
      state.ciphers[1]._update(out, outOff, out, outOff);
      state.ciphers[2]._update(out, outOff, out, outOff);
    };
    EDE.prototype._pad = DES.prototype._pad;
    EDE.prototype._unpad = DES.prototype._unpad;
  }, {
    "./cipher": 59,
    "./des": 60,
    inherits: 101,
    "minimalistic-assert": 105
  } ],
  62: [ function(require, module, exports) {
    "use strict";
    exports.readUInt32BE = function readUInt32BE(bytes, off) {
      var res = bytes[0 + off] << 24 | bytes[1 + off] << 16 | bytes[2 + off] << 8 | bytes[3 + off];
      return res >>> 0;
    };
    exports.writeUInt32BE = function writeUInt32BE(bytes, value, off) {
      bytes[0 + off] = value >>> 24;
      bytes[1 + off] = value >>> 16 & 255;
      bytes[2 + off] = value >>> 8 & 255;
      bytes[3 + off] = 255 & value;
    };
    exports.ip = function ip(inL, inR, out, off) {
      var outL = 0;
      var outR = 0;
      for (var i = 6; i >= 0; i -= 2) {
        for (var j = 0; j <= 24; j += 8) {
          outL <<= 1;
          outL |= inR >>> j + i & 1;
        }
        for (var j = 0; j <= 24; j += 8) {
          outL <<= 1;
          outL |= inL >>> j + i & 1;
        }
      }
      for (var i = 6; i >= 0; i -= 2) {
        for (var j = 1; j <= 25; j += 8) {
          outR <<= 1;
          outR |= inR >>> j + i & 1;
        }
        for (var j = 1; j <= 25; j += 8) {
          outR <<= 1;
          outR |= inL >>> j + i & 1;
        }
      }
      out[off + 0] = outL >>> 0;
      out[off + 1] = outR >>> 0;
    };
    exports.rip = function rip(inL, inR, out, off) {
      var outL = 0;
      var outR = 0;
      for (var i = 0; i < 4; i++) for (var j = 24; j >= 0; j -= 8) {
        outL <<= 1;
        outL |= inR >>> j + i & 1;
        outL <<= 1;
        outL |= inL >>> j + i & 1;
      }
      for (var i = 4; i < 8; i++) for (var j = 24; j >= 0; j -= 8) {
        outR <<= 1;
        outR |= inR >>> j + i & 1;
        outR <<= 1;
        outR |= inL >>> j + i & 1;
      }
      out[off + 0] = outL >>> 0;
      out[off + 1] = outR >>> 0;
    };
    exports.pc1 = function pc1(inL, inR, out, off) {
      var outL = 0;
      var outR = 0;
      for (var i = 7; i >= 5; i--) {
        for (var j = 0; j <= 24; j += 8) {
          outL <<= 1;
          outL |= inR >> j + i & 1;
        }
        for (var j = 0; j <= 24; j += 8) {
          outL <<= 1;
          outL |= inL >> j + i & 1;
        }
      }
      for (var j = 0; j <= 24; j += 8) {
        outL <<= 1;
        outL |= inR >> j + i & 1;
      }
      for (var i = 1; i <= 3; i++) {
        for (var j = 0; j <= 24; j += 8) {
          outR <<= 1;
          outR |= inR >> j + i & 1;
        }
        for (var j = 0; j <= 24; j += 8) {
          outR <<= 1;
          outR |= inL >> j + i & 1;
        }
      }
      for (var j = 0; j <= 24; j += 8) {
        outR <<= 1;
        outR |= inL >> j + i & 1;
      }
      out[off + 0] = outL >>> 0;
      out[off + 1] = outR >>> 0;
    };
    exports.r28shl = function r28shl(num, shift) {
      return num << shift & 268435455 | num >>> 28 - shift;
    };
    var pc2table = [ 14, 11, 17, 4, 27, 23, 25, 0, 13, 22, 7, 18, 5, 9, 16, 24, 2, 20, 12, 21, 1, 8, 15, 26, 15, 4, 25, 19, 9, 1, 26, 16, 5, 11, 23, 8, 12, 7, 17, 0, 22, 3, 10, 14, 6, 20, 27, 24 ];
    exports.pc2 = function pc2(inL, inR, out, off) {
      var outL = 0;
      var outR = 0;
      var len = pc2table.length >>> 1;
      for (var i = 0; i < len; i++) {
        outL <<= 1;
        outL |= inL >>> pc2table[i] & 1;
      }
      for (var i = len; i < pc2table.length; i++) {
        outR <<= 1;
        outR |= inR >>> pc2table[i] & 1;
      }
      out[off + 0] = outL >>> 0;
      out[off + 1] = outR >>> 0;
    };
    exports.expand = function expand(r, out, off) {
      var outL = 0;
      var outR = 0;
      outL = (1 & r) << 5 | r >>> 27;
      for (var i = 23; i >= 15; i -= 4) {
        outL <<= 6;
        outL |= r >>> i & 63;
      }
      for (var i = 11; i >= 3; i -= 4) {
        outR |= r >>> i & 63;
        outR <<= 6;
      }
      outR |= (31 & r) << 1 | r >>> 31;
      out[off + 0] = outL >>> 0;
      out[off + 1] = outR >>> 0;
    };
    var sTable = [ 14, 0, 4, 15, 13, 7, 1, 4, 2, 14, 15, 2, 11, 13, 8, 1, 3, 10, 10, 6, 6, 12, 12, 11, 5, 9, 9, 5, 0, 3, 7, 8, 4, 15, 1, 12, 14, 8, 8, 2, 13, 4, 6, 9, 2, 1, 11, 7, 15, 5, 12, 11, 9, 3, 7, 14, 3, 10, 10, 0, 5, 6, 0, 13, 15, 3, 1, 13, 8, 4, 14, 7, 6, 15, 11, 2, 3, 8, 4, 14, 9, 12, 7, 0, 2, 1, 13, 10, 12, 6, 0, 9, 5, 11, 10, 5, 0, 13, 14, 8, 7, 10, 11, 1, 10, 3, 4, 15, 13, 4, 1, 2, 5, 11, 8, 6, 12, 7, 6, 12, 9, 0, 3, 5, 2, 14, 15, 9, 10, 13, 0, 7, 9, 0, 14, 9, 6, 3, 3, 4, 15, 6, 5, 10, 1, 2, 13, 8, 12, 5, 7, 14, 11, 12, 4, 11, 2, 15, 8, 1, 13, 1, 6, 10, 4, 13, 9, 0, 8, 6, 15, 9, 3, 8, 0, 7, 11, 4, 1, 15, 2, 14, 12, 3, 5, 11, 10, 5, 14, 2, 7, 12, 7, 13, 13, 8, 14, 11, 3, 5, 0, 6, 6, 15, 9, 0, 10, 3, 1, 4, 2, 7, 8, 2, 5, 12, 11, 1, 12, 10, 4, 14, 15, 9, 10, 3, 6, 15, 9, 0, 0, 6, 12, 10, 11, 1, 7, 13, 13, 8, 15, 9, 1, 4, 3, 5, 14, 11, 5, 12, 2, 7, 8, 2, 4, 14, 2, 14, 12, 11, 4, 2, 1, 12, 7, 4, 10, 7, 11, 13, 6, 1, 8, 5, 5, 0, 3, 15, 15, 10, 13, 3, 0, 9, 14, 8, 9, 6, 4, 11, 2, 8, 1, 12, 11, 7, 10, 1, 13, 14, 7, 2, 8, 13, 15, 6, 9, 15, 12, 0, 5, 9, 6, 10, 3, 4, 0, 5, 14, 3, 12, 10, 1, 15, 10, 4, 15, 2, 9, 7, 2, 12, 6, 9, 8, 5, 0, 6, 13, 1, 3, 13, 4, 14, 14, 0, 7, 11, 5, 3, 11, 8, 9, 4, 14, 3, 15, 2, 5, 12, 2, 9, 8, 5, 12, 15, 3, 10, 7, 11, 0, 14, 4, 1, 10, 7, 1, 6, 13, 0, 11, 8, 6, 13, 4, 13, 11, 0, 2, 11, 14, 7, 15, 4, 0, 9, 8, 1, 13, 10, 3, 14, 12, 3, 9, 5, 7, 12, 5, 2, 10, 15, 6, 8, 1, 6, 1, 6, 4, 11, 11, 13, 13, 8, 12, 1, 3, 4, 7, 10, 14, 7, 10, 9, 15, 5, 6, 0, 8, 15, 0, 14, 5, 2, 9, 3, 2, 12, 13, 1, 2, 15, 8, 13, 4, 8, 6, 10, 15, 3, 11, 7, 1, 4, 10, 12, 9, 5, 3, 6, 14, 11, 5, 0, 0, 14, 12, 9, 7, 2, 7, 2, 11, 1, 4, 14, 1, 7, 9, 4, 12, 10, 14, 8, 2, 13, 0, 15, 6, 12, 10, 9, 13, 0, 15, 3, 3, 5, 5, 6, 8, 11 ];
    exports.substitute = function substitute(inL, inR) {
      var out = 0;
      for (var i = 0; i < 4; i++) {
        var b = inL >>> 18 - 6 * i & 63;
        var sb = sTable[64 * i + b];
        out <<= 4;
        out |= sb;
      }
      for (var i = 0; i < 4; i++) {
        var b = inR >>> 18 - 6 * i & 63;
        var sb = sTable[256 + 64 * i + b];
        out <<= 4;
        out |= sb;
      }
      return out >>> 0;
    };
    var permuteTable = [ 16, 25, 12, 11, 3, 20, 4, 15, 31, 17, 9, 6, 27, 14, 1, 22, 30, 24, 8, 18, 0, 5, 29, 23, 13, 19, 2, 26, 10, 21, 28, 7 ];
    exports.permute = function permute(num) {
      var out = 0;
      for (var i = 0; i < permuteTable.length; i++) {
        out <<= 1;
        out |= num >>> permuteTable[i] & 1;
      }
      return out >>> 0;
    };
    exports.padSplit = function padSplit(num, size, group) {
      var str = num.toString(2);
      while (str.length < size) str = "0" + str;
      var out = [];
      for (var i = 0; i < size; i += group) out.push(str.slice(i, i + group));
      return out.join(" ");
    };
  }, {} ],
  63: [ function(require, module, exports) {
    (function(Buffer) {
      var generatePrime = require("./lib/generatePrime");
      var primes = require("./lib/primes.json");
      var DH = require("./lib/dh");
      function getDiffieHellman(mod) {
        var prime = new Buffer(primes[mod].prime, "hex");
        var gen = new Buffer(primes[mod].gen, "hex");
        return new DH(prime, gen);
      }
      var ENCODINGS = {
        binary: true,
        hex: true,
        base64: true
      };
      function createDiffieHellman(prime, enc, generator, genc) {
        if (Buffer.isBuffer(enc) || void 0 === ENCODINGS[enc]) return createDiffieHellman(prime, "binary", enc, generator);
        enc = enc || "binary";
        genc = genc || "binary";
        generator = generator || new Buffer([ 2 ]);
        Buffer.isBuffer(generator) || (generator = new Buffer(generator, genc));
        if ("number" === typeof prime) return new DH(generatePrime(prime, generator), generator, true);
        Buffer.isBuffer(prime) || (prime = new Buffer(prime, enc));
        return new DH(prime, generator, true);
      }
      exports.DiffieHellmanGroup = exports.createDiffieHellmanGroup = exports.getDiffieHellman = getDiffieHellman;
      exports.createDiffieHellman = exports.DiffieHellman = createDiffieHellman;
    }).call(this, require("buffer").Buffer);
  }, {
    "./lib/dh": 64,
    "./lib/generatePrime": 65,
    "./lib/primes.json": 66,
    buffer: 47
  } ],
  64: [ function(require, module, exports) {
    (function(Buffer) {
      var BN = require("bn.js");
      var MillerRabin = require("miller-rabin");
      var millerRabin = new MillerRabin();
      var TWENTYFOUR = new BN(24);
      var ELEVEN = new BN(11);
      var TEN = new BN(10);
      var THREE = new BN(3);
      var SEVEN = new BN(7);
      var primes = require("./generatePrime");
      var randomBytes = require("randombytes");
      module.exports = DH;
      function setPublicKey(pub, enc) {
        enc = enc || "utf8";
        Buffer.isBuffer(pub) || (pub = new Buffer(pub, enc));
        this._pub = new BN(pub);
        return this;
      }
      function setPrivateKey(priv, enc) {
        enc = enc || "utf8";
        Buffer.isBuffer(priv) || (priv = new Buffer(priv, enc));
        this._priv = new BN(priv);
        return this;
      }
      var primeCache = {};
      function checkPrime(prime, generator) {
        var gen = generator.toString("hex");
        var hex = [ gen, prime.toString(16) ].join("_");
        if (hex in primeCache) return primeCache[hex];
        var error = 0;
        if (prime.isEven() || !primes.simpleSieve || !primes.fermatTest(prime) || !millerRabin.test(prime)) {
          error += 1;
          error += "02" === gen || "05" === gen ? 8 : 4;
          primeCache[hex] = error;
          return error;
        }
        millerRabin.test(prime.shrn(1)) || (error += 2);
        var rem;
        switch (gen) {
         case "02":
          prime.mod(TWENTYFOUR).cmp(ELEVEN) && (error += 8);
          break;

         case "05":
          rem = prime.mod(TEN);
          rem.cmp(THREE) && rem.cmp(SEVEN) && (error += 8);
          break;

         default:
          error += 4;
        }
        primeCache[hex] = error;
        return error;
      }
      function DH(prime, generator, malleable) {
        this.setGenerator(generator);
        this.__prime = new BN(prime);
        this._prime = BN.mont(this.__prime);
        this._primeLen = prime.length;
        this._pub = void 0;
        this._priv = void 0;
        this._primeCode = void 0;
        if (malleable) {
          this.setPublicKey = setPublicKey;
          this.setPrivateKey = setPrivateKey;
        } else this._primeCode = 8;
      }
      Object.defineProperty(DH.prototype, "verifyError", {
        enumerable: true,
        get: function() {
          "number" !== typeof this._primeCode && (this._primeCode = checkPrime(this.__prime, this.__gen));
          return this._primeCode;
        }
      });
      DH.prototype.generateKeys = function() {
        this._priv || (this._priv = new BN(randomBytes(this._primeLen)));
        this._pub = this._gen.toRed(this._prime).redPow(this._priv).fromRed();
        return this.getPublicKey();
      };
      DH.prototype.computeSecret = function(other) {
        other = new BN(other);
        other = other.toRed(this._prime);
        var secret = other.redPow(this._priv).fromRed();
        var out = new Buffer(secret.toArray());
        var prime = this.getPrime();
        if (out.length < prime.length) {
          var front = new Buffer(prime.length - out.length);
          front.fill(0);
          out = Buffer.concat([ front, out ]);
        }
        return out;
      };
      DH.prototype.getPublicKey = function getPublicKey(enc) {
        return formatReturnValue(this._pub, enc);
      };
      DH.prototype.getPrivateKey = function getPrivateKey(enc) {
        return formatReturnValue(this._priv, enc);
      };
      DH.prototype.getPrime = function(enc) {
        return formatReturnValue(this.__prime, enc);
      };
      DH.prototype.getGenerator = function(enc) {
        return formatReturnValue(this._gen, enc);
      };
      DH.prototype.setGenerator = function(gen, enc) {
        enc = enc || "utf8";
        Buffer.isBuffer(gen) || (gen = new Buffer(gen, enc));
        this.__gen = gen;
        this._gen = new BN(gen);
        return this;
      };
      function formatReturnValue(bn, enc) {
        var buf = new Buffer(bn.toArray());
        return enc ? buf.toString(enc) : buf;
      }
    }).call(this, require("buffer").Buffer);
  }, {
    "./generatePrime": 65,
    "bn.js": 16,
    buffer: 47,
    "miller-rabin": 104,
    randombytes: 125
  } ],
  65: [ function(require, module, exports) {
    var randomBytes = require("randombytes");
    module.exports = findPrime;
    findPrime.simpleSieve = simpleSieve;
    findPrime.fermatTest = fermatTest;
    var BN = require("bn.js");
    var TWENTYFOUR = new BN(24);
    var MillerRabin = require("miller-rabin");
    var millerRabin = new MillerRabin();
    var ONE = new BN(1);
    var TWO = new BN(2);
    var FIVE = new BN(5);
    var SIXTEEN = new BN(16);
    var EIGHT = new BN(8);
    var TEN = new BN(10);
    var THREE = new BN(3);
    var SEVEN = new BN(7);
    var ELEVEN = new BN(11);
    var FOUR = new BN(4);
    var TWELVE = new BN(12);
    var primes = null;
    function _getPrimes() {
      if (null !== primes) return primes;
      var limit = 1048576;
      var res = [];
      res[0] = 2;
      for (var i = 1, k = 3; k < limit; k += 2) {
        var sqrt = Math.ceil(Math.sqrt(k));
        for (var j = 0; j < i && res[j] <= sqrt; j++) if (k % res[j] === 0) break;
        if (i !== j && res[j] <= sqrt) continue;
        res[i++] = k;
      }
      primes = res;
      return res;
    }
    function simpleSieve(p) {
      var primes = _getPrimes();
      for (var i = 0; i < primes.length; i++) if (0 === p.modn(primes[i])) return 0 === p.cmpn(primes[i]);
      return true;
    }
    function fermatTest(p) {
      var red = BN.mont(p);
      return 0 === TWO.toRed(red).redPow(p.subn(1)).fromRed().cmpn(1);
    }
    function findPrime(bits, gen) {
      if (bits < 16) return new BN(2 === gen || 5 === gen ? [ 140, 123 ] : [ 140, 39 ]);
      gen = new BN(gen);
      var num, n2;
      while (true) {
        num = new BN(randomBytes(Math.ceil(bits / 8)));
        while (num.bitLength() > bits) num.ishrn(1);
        num.isEven() && num.iadd(ONE);
        num.testn(1) || num.iadd(TWO);
        if (gen.cmp(TWO)) {
          if (!gen.cmp(FIVE)) while (num.mod(TEN).cmp(THREE)) num.iadd(FOUR);
        } else while (num.mod(TWENTYFOUR).cmp(ELEVEN)) num.iadd(FOUR);
        n2 = num.shrn(1);
        if (simpleSieve(n2) && simpleSieve(num) && fermatTest(n2) && fermatTest(num) && millerRabin.test(n2) && millerRabin.test(num)) return num;
      }
    }
  }, {
    "bn.js": 16,
    "miller-rabin": 104,
    randombytes: 125
  } ],
  66: [ function(require, module, exports) {
    module.exports = {
      modp1: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a63a3620ffffffffffffffff"
      },
      modp2: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381ffffffffffffffff"
      },
      modp5: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca237327ffffffffffffffff"
      },
      modp14: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aacaa68ffffffffffffffff"
      },
      modp15: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a93ad2caffffffffffffffff"
      },
      modp16: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c934063199ffffffffffffffff"
      },
      modp17: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dcc4024ffffffffffffffff"
      },
      modp18: {
        gen: "02",
        prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dbe115974a3926f12fee5e438777cb6a932df8cd8bec4d073b931ba3bc832b68d9dd300741fa7bf8afc47ed2576f6936ba424663aab639c5ae4f5683423b4742bf1c978238f16cbe39d652de3fdb8befc848ad922222e04a4037c0713eb57a81a23f0c73473fc646cea306b4bcbc8862f8385ddfa9d4b7fa2c087e879683303ed5bdd3a062b3cf5b3a278a66d2a13f83f44f82ddf310ee074ab6a364597e899a0255dc164f31cc50846851df9ab48195ded7ea1b1d510bd7ee74d73faf36bc31ecfa268359046f4eb879f924009438b481c6cd7889a002ed5ee382bc9190da6fc026e479558e4475677e9aa9e3050e2765694dfc81f56e880b96e7160c980dd98edd3dfffffffffffffffff"
      }
    };
  }, {} ],
  67: [ function(require, module, exports) {
    "use strict";
    var elliptic = exports;
    elliptic.version = require("../package.json").version;
    elliptic.utils = require("./elliptic/utils");
    elliptic.rand = require("brorand");
    elliptic.curve = require("./elliptic/curve");
    elliptic.curves = require("./elliptic/curves");
    elliptic.ec = require("./elliptic/ec");
    elliptic.eddsa = require("./elliptic/eddsa");
  }, {
    "../package.json": 82,
    "./elliptic/curve": 70,
    "./elliptic/curves": 73,
    "./elliptic/ec": 74,
    "./elliptic/eddsa": 77,
    "./elliptic/utils": 81,
    brorand: 17
  } ],
  68: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var utils = require("../utils");
    var getNAF = utils.getNAF;
    var getJSF = utils.getJSF;
    var assert = utils.assert;
    function BaseCurve(type, conf) {
      this.type = type;
      this.p = new BN(conf.p, 16);
      this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);
      this.zero = new BN(0).toRed(this.red);
      this.one = new BN(1).toRed(this.red);
      this.two = new BN(2).toRed(this.red);
      this.n = conf.n && new BN(conf.n, 16);
      this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);
      this._wnafT1 = new Array(4);
      this._wnafT2 = new Array(4);
      this._wnafT3 = new Array(4);
      this._wnafT4 = new Array(4);
      this._bitLength = this.n ? this.n.bitLength() : 0;
      var adjustCount = this.n && this.p.div(this.n);
      if (!adjustCount || adjustCount.cmpn(100) > 0) this.redN = null; else {
        this._maxwellTrick = true;
        this.redN = this.n.toRed(this.red);
      }
    }
    module.exports = BaseCurve;
    BaseCurve.prototype.point = function point() {
      throw new Error("Not implemented");
    };
    BaseCurve.prototype.validate = function validate() {
      throw new Error("Not implemented");
    };
    BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
      assert(p.precomputed);
      var doubles = p._getDoubles();
      var naf = getNAF(k, 1, this._bitLength);
      var I = (1 << doubles.step + 1) - (doubles.step % 2 === 0 ? 2 : 1);
      I /= 3;
      var repr = [];
      for (var j = 0; j < naf.length; j += doubles.step) {
        var nafW = 0;
        for (var k = j + doubles.step - 1; k >= j; k--) nafW = (nafW << 1) + naf[k];
        repr.push(nafW);
      }
      var a = this.jpoint(null, null, null);
      var b = this.jpoint(null, null, null);
      for (var i = I; i > 0; i--) {
        for (var j = 0; j < repr.length; j++) {
          var nafW = repr[j];
          nafW === i ? b = b.mixedAdd(doubles.points[j]) : nafW === -i && (b = b.mixedAdd(doubles.points[j].neg()));
        }
        a = a.add(b);
      }
      return a.toP();
    };
    BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
      var w = 4;
      var nafPoints = p._getNAFPoints(w);
      w = nafPoints.wnd;
      var wnd = nafPoints.points;
      var naf = getNAF(k, w, this._bitLength);
      var acc = this.jpoint(null, null, null);
      for (var i = naf.length - 1; i >= 0; i--) {
        for (var k = 0; i >= 0 && 0 === naf[i]; i--) k++;
        i >= 0 && k++;
        acc = acc.dblp(k);
        if (i < 0) break;
        var z = naf[i];
        assert(0 !== z);
        acc = "affine" === p.type ? z > 0 ? acc.mixedAdd(wnd[z - 1 >> 1]) : acc.mixedAdd(wnd[-z - 1 >> 1].neg()) : z > 0 ? acc.add(wnd[z - 1 >> 1]) : acc.add(wnd[-z - 1 >> 1].neg());
      }
      return "affine" === p.type ? acc.toP() : acc;
    };
    BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
      var wndWidth = this._wnafT1;
      var wnd = this._wnafT2;
      var naf = this._wnafT3;
      var max = 0;
      for (var i = 0; i < len; i++) {
        var p = points[i];
        var nafPoints = p._getNAFPoints(defW);
        wndWidth[i] = nafPoints.wnd;
        wnd[i] = nafPoints.points;
      }
      for (var i = len - 1; i >= 1; i -= 2) {
        var a = i - 1;
        var b = i;
        if (1 !== wndWidth[a] || 1 !== wndWidth[b]) {
          naf[a] = getNAF(coeffs[a], wndWidth[a], this._bitLength);
          naf[b] = getNAF(coeffs[b], wndWidth[b], this._bitLength);
          max = Math.max(naf[a].length, max);
          max = Math.max(naf[b].length, max);
          continue;
        }
        var comb = [ points[a], null, null, points[b] ];
        if (0 === points[a].y.cmp(points[b].y)) {
          comb[1] = points[a].add(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        } else if (0 === points[a].y.cmp(points[b].y.redNeg())) {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].add(points[b].neg());
        } else {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        }
        var index = [ -3, -1, -5, -7, 0, 7, 5, 1, 3 ];
        var jsf = getJSF(coeffs[a], coeffs[b]);
        max = Math.max(jsf[0].length, max);
        naf[a] = new Array(max);
        naf[b] = new Array(max);
        for (var j = 0; j < max; j++) {
          var ja = 0 | jsf[0][j];
          var jb = 0 | jsf[1][j];
          naf[a][j] = index[3 * (ja + 1) + (jb + 1)];
          naf[b][j] = 0;
          wnd[a] = comb;
        }
      }
      var acc = this.jpoint(null, null, null);
      var tmp = this._wnafT4;
      for (var i = max; i >= 0; i--) {
        var k = 0;
        while (i >= 0) {
          var zero = true;
          for (var j = 0; j < len; j++) {
            tmp[j] = 0 | naf[j][i];
            0 !== tmp[j] && (zero = false);
          }
          if (!zero) break;
          k++;
          i--;
        }
        i >= 0 && k++;
        acc = acc.dblp(k);
        if (i < 0) break;
        for (var j = 0; j < len; j++) {
          var z = tmp[j];
          var p;
          if (0 === z) continue;
          z > 0 ? p = wnd[j][z - 1 >> 1] : z < 0 && (p = wnd[j][-z - 1 >> 1].neg());
          acc = "affine" === p.type ? acc.mixedAdd(p) : acc.add(p);
        }
      }
      for (var i = 0; i < len; i++) wnd[i] = null;
      return jacobianResult ? acc : acc.toP();
    };
    function BasePoint(curve, type) {
      this.curve = curve;
      this.type = type;
      this.precomputed = null;
    }
    BaseCurve.BasePoint = BasePoint;
    BasePoint.prototype.eq = function eq() {
      throw new Error("Not implemented");
    };
    BasePoint.prototype.validate = function validate() {
      return this.curve.validate(this);
    };
    BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      bytes = utils.toArray(bytes, enc);
      var len = this.p.byteLength();
      if ((4 === bytes[0] || 6 === bytes[0] || 7 === bytes[0]) && bytes.length - 1 === 2 * len) {
        6 === bytes[0] ? assert(bytes[bytes.length - 1] % 2 === 0) : 7 === bytes[0] && assert(bytes[bytes.length - 1] % 2 === 1);
        var res = this.point(bytes.slice(1, 1 + len), bytes.slice(1 + len, 1 + 2 * len));
        return res;
      }
      if ((2 === bytes[0] || 3 === bytes[0]) && bytes.length - 1 === len) return this.pointFromX(bytes.slice(1, 1 + len), 3 === bytes[0]);
      throw new Error("Unknown point format");
    };
    BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
      return this.encode(enc, true);
    };
    BasePoint.prototype._encode = function _encode(compact) {
      var len = this.curve.p.byteLength();
      var x = this.getX().toArray("be", len);
      if (compact) return [ this.getY().isEven() ? 2 : 3 ].concat(x);
      return [ 4 ].concat(x, this.getY().toArray("be", len));
    };
    BasePoint.prototype.encode = function encode(enc, compact) {
      return utils.encode(this._encode(compact), enc);
    };
    BasePoint.prototype.precompute = function precompute(power) {
      if (this.precomputed) return this;
      var precomputed = {
        doubles: null,
        naf: null,
        beta: null
      };
      precomputed.naf = this._getNAFPoints(8);
      precomputed.doubles = this._getDoubles(4, power);
      precomputed.beta = this._getBeta();
      this.precomputed = precomputed;
      return this;
    };
    BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
      if (!this.precomputed) return false;
      var doubles = this.precomputed.doubles;
      if (!doubles) return false;
      return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
    };
    BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
      if (this.precomputed && this.precomputed.doubles) return this.precomputed.doubles;
      var doubles = [ this ];
      var acc = this;
      for (var i = 0; i < power; i += step) {
        for (var j = 0; j < step; j++) acc = acc.dbl();
        doubles.push(acc);
      }
      return {
        step: step,
        points: doubles
      };
    };
    BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
      if (this.precomputed && this.precomputed.naf) return this.precomputed.naf;
      var res = [ this ];
      var max = (1 << wnd) - 1;
      var dbl = 1 === max ? null : this.dbl();
      for (var i = 1; i < max; i++) res[i] = res[i - 1].add(dbl);
      return {
        wnd: wnd,
        points: res
      };
    };
    BasePoint.prototype._getBeta = function _getBeta() {
      return null;
    };
    BasePoint.prototype.dblp = function dblp(k) {
      var r = this;
      for (var i = 0; i < k; i++) r = r.dbl();
      return r;
    };
  }, {
    "../utils": 81,
    "bn.js": 16
  } ],
  69: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var BN = require("bn.js");
    var inherits = require("inherits");
    var Base = require("./base");
    var assert = utils.assert;
    function EdwardsCurve(conf) {
      this.twisted = 1 !== (0 | conf.a);
      this.mOneA = this.twisted && -1 === (0 | conf.a);
      this.extended = this.mOneA;
      Base.call(this, "edwards", conf);
      this.a = new BN(conf.a, 16).umod(this.red.m);
      this.a = this.a.toRed(this.red);
      this.c = new BN(conf.c, 16).toRed(this.red);
      this.c2 = this.c.redSqr();
      this.d = new BN(conf.d, 16).toRed(this.red);
      this.dd = this.d.redAdd(this.d);
      assert(!this.twisted || 0 === this.c.fromRed().cmpn(1));
      this.oneC = 1 === (0 | conf.c);
    }
    inherits(EdwardsCurve, Base);
    module.exports = EdwardsCurve;
    EdwardsCurve.prototype._mulA = function _mulA(num) {
      return this.mOneA ? num.redNeg() : this.a.redMul(num);
    };
    EdwardsCurve.prototype._mulC = function _mulC(num) {
      return this.oneC ? num : this.c.redMul(num);
    };
    EdwardsCurve.prototype.jpoint = function jpoint(x, y, z, t) {
      return this.point(x, y, z, t);
    };
    EdwardsCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new BN(x, 16);
      x.red || (x = x.toRed(this.red));
      var x2 = x.redSqr();
      var rhs = this.c2.redSub(this.a.redMul(x2));
      var lhs = this.one.redSub(this.c2.redMul(this.d).redMul(x2));
      var y2 = rhs.redMul(lhs.redInvm());
      var y = y2.redSqrt();
      if (0 !== y.redSqr().redSub(y2).cmp(this.zero)) throw new Error("invalid point");
      var isOdd = y.fromRed().isOdd();
      (odd && !isOdd || !odd && isOdd) && (y = y.redNeg());
      return this.point(x, y);
    };
    EdwardsCurve.prototype.pointFromY = function pointFromY(y, odd) {
      y = new BN(y, 16);
      y.red || (y = y.toRed(this.red));
      var y2 = y.redSqr();
      var lhs = y2.redSub(this.c2);
      var rhs = y2.redMul(this.d).redMul(this.c2).redSub(this.a);
      var x2 = lhs.redMul(rhs.redInvm());
      if (0 === x2.cmp(this.zero)) {
        if (odd) throw new Error("invalid point");
        return this.point(this.zero, y);
      }
      var x = x2.redSqrt();
      if (0 !== x.redSqr().redSub(x2).cmp(this.zero)) throw new Error("invalid point");
      x.fromRed().isOdd() !== odd && (x = x.redNeg());
      return this.point(x, y);
    };
    EdwardsCurve.prototype.validate = function validate(point) {
      if (point.isInfinity()) return true;
      point.normalize();
      var x2 = point.x.redSqr();
      var y2 = point.y.redSqr();
      var lhs = x2.redMul(this.a).redAdd(y2);
      var rhs = this.c2.redMul(this.one.redAdd(this.d.redMul(x2).redMul(y2)));
      return 0 === lhs.cmp(rhs);
    };
    function Point(curve, x, y, z, t) {
      Base.BasePoint.call(this, curve, "projective");
      if (null === x && null === y && null === z) {
        this.x = this.curve.zero;
        this.y = this.curve.one;
        this.z = this.curve.one;
        this.t = this.curve.zero;
        this.zOne = true;
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        this.z = z ? new BN(z, 16) : this.curve.one;
        this.t = t && new BN(t, 16);
        this.x.red || (this.x = this.x.toRed(this.curve.red));
        this.y.red || (this.y = this.y.toRed(this.curve.red));
        this.z.red || (this.z = this.z.toRed(this.curve.red));
        this.t && !this.t.red && (this.t = this.t.toRed(this.curve.red));
        this.zOne = this.z === this.curve.one;
        if (this.curve.extended && !this.t) {
          this.t = this.x.redMul(this.y);
          this.zOne || (this.t = this.t.redMul(this.z.redInvm()));
        }
      }
    }
    inherits(Point, Base.BasePoint);
    EdwardsCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
      return Point.fromJSON(this, obj);
    };
    EdwardsCurve.prototype.point = function point(x, y, z, t) {
      return new Point(this, x, y, z, t);
    };
    Point.fromJSON = function fromJSON(curve, obj) {
      return new Point(curve, obj[0], obj[1], obj[2]);
    };
    Point.prototype.inspect = function inspect() {
      if (this.isInfinity()) return "<EC Point Infinity>";
      return "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + " z: " + this.z.fromRed().toString(16, 2) + ">";
    };
    Point.prototype.isInfinity = function isInfinity() {
      return 0 === this.x.cmpn(0) && (0 === this.y.cmp(this.z) || this.zOne && 0 === this.y.cmp(this.curve.c));
    };
    Point.prototype._extDbl = function _extDbl() {
      var a = this.x.redSqr();
      var b = this.y.redSqr();
      var c = this.z.redSqr();
      c = c.redIAdd(c);
      var d = this.curve._mulA(a);
      var e = this.x.redAdd(this.y).redSqr().redISub(a).redISub(b);
      var g = d.redAdd(b);
      var f = g.redSub(c);
      var h = d.redSub(b);
      var nx = e.redMul(f);
      var ny = g.redMul(h);
      var nt = e.redMul(h);
      var nz = f.redMul(g);
      return this.curve.point(nx, ny, nz, nt);
    };
    Point.prototype._projDbl = function _projDbl() {
      var b = this.x.redAdd(this.y).redSqr();
      var c = this.x.redSqr();
      var d = this.y.redSqr();
      var nx;
      var ny;
      var nz;
      if (this.curve.twisted) {
        var e = this.curve._mulA(c);
        var f = e.redAdd(d);
        if (this.zOne) {
          nx = b.redSub(c).redSub(d).redMul(f.redSub(this.curve.two));
          ny = f.redMul(e.redSub(d));
          nz = f.redSqr().redSub(f).redSub(f);
        } else {
          var h = this.z.redSqr();
          var j = f.redSub(h).redISub(h);
          nx = b.redSub(c).redISub(d).redMul(j);
          ny = f.redMul(e.redSub(d));
          nz = f.redMul(j);
        }
      } else {
        var e = c.redAdd(d);
        var h = this.curve._mulC(this.z).redSqr();
        var j = e.redSub(h).redSub(h);
        nx = this.curve._mulC(b.redISub(e)).redMul(j);
        ny = this.curve._mulC(e).redMul(c.redISub(d));
        nz = e.redMul(j);
      }
      return this.curve.point(nx, ny, nz);
    };
    Point.prototype.dbl = function dbl() {
      if (this.isInfinity()) return this;
      return this.curve.extended ? this._extDbl() : this._projDbl();
    };
    Point.prototype._extAdd = function _extAdd(p) {
      var a = this.y.redSub(this.x).redMul(p.y.redSub(p.x));
      var b = this.y.redAdd(this.x).redMul(p.y.redAdd(p.x));
      var c = this.t.redMul(this.curve.dd).redMul(p.t);
      var d = this.z.redMul(p.z.redAdd(p.z));
      var e = b.redSub(a);
      var f = d.redSub(c);
      var g = d.redAdd(c);
      var h = b.redAdd(a);
      var nx = e.redMul(f);
      var ny = g.redMul(h);
      var nt = e.redMul(h);
      var nz = f.redMul(g);
      return this.curve.point(nx, ny, nz, nt);
    };
    Point.prototype._projAdd = function _projAdd(p) {
      var a = this.z.redMul(p.z);
      var b = a.redSqr();
      var c = this.x.redMul(p.x);
      var d = this.y.redMul(p.y);
      var e = this.curve.d.redMul(c).redMul(d);
      var f = b.redSub(e);
      var g = b.redAdd(e);
      var tmp = this.x.redAdd(this.y).redMul(p.x.redAdd(p.y)).redISub(c).redISub(d);
      var nx = a.redMul(f).redMul(tmp);
      var ny;
      var nz;
      if (this.curve.twisted) {
        ny = a.redMul(g).redMul(d.redSub(this.curve._mulA(c)));
        nz = f.redMul(g);
      } else {
        ny = a.redMul(g).redMul(d.redSub(c));
        nz = this.curve._mulC(f).redMul(g);
      }
      return this.curve.point(nx, ny, nz);
    };
    Point.prototype.add = function add(p) {
      if (this.isInfinity()) return p;
      if (p.isInfinity()) return this;
      return this.curve.extended ? this._extAdd(p) : this._projAdd(p);
    };
    Point.prototype.mul = function mul(k) {
      return this._hasDoubles(k) ? this.curve._fixedNafMul(this, k) : this.curve._wnafMul(this, k);
    };
    Point.prototype.mulAdd = function mulAdd(k1, p, k2) {
      return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, false);
    };
    Point.prototype.jmulAdd = function jmulAdd(k1, p, k2) {
      return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, true);
    };
    Point.prototype.normalize = function normalize() {
      if (this.zOne) return this;
      var zi = this.z.redInvm();
      this.x = this.x.redMul(zi);
      this.y = this.y.redMul(zi);
      this.t && (this.t = this.t.redMul(zi));
      this.z = this.curve.one;
      this.zOne = true;
      return this;
    };
    Point.prototype.neg = function neg() {
      return this.curve.point(this.x.redNeg(), this.y, this.z, this.t && this.t.redNeg());
    };
    Point.prototype.getX = function getX() {
      this.normalize();
      return this.x.fromRed();
    };
    Point.prototype.getY = function getY() {
      this.normalize();
      return this.y.fromRed();
    };
    Point.prototype.eq = function eq(other) {
      return this === other || 0 === this.getX().cmp(other.getX()) && 0 === this.getY().cmp(other.getY());
    };
    Point.prototype.eqXToP = function eqXToP(x) {
      var rx = x.toRed(this.curve.red).redMul(this.z);
      if (0 === this.x.cmp(rx)) return true;
      var xc = x.clone();
      var t = this.curve.redN.redMul(this.z);
      for (;;) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0) return false;
        rx.redIAdd(t);
        if (0 === this.x.cmp(rx)) return true;
      }
    };
    Point.prototype.toP = Point.prototype.normalize;
    Point.prototype.mixedAdd = Point.prototype.add;
  }, {
    "../utils": 81,
    "./base": 68,
    "bn.js": 16,
    inherits: 101
  } ],
  70: [ function(require, module, exports) {
    "use strict";
    var curve = exports;
    curve.base = require("./base");
    curve.short = require("./short");
    curve.mont = require("./mont");
    curve.edwards = require("./edwards");
  }, {
    "./base": 68,
    "./edwards": 69,
    "./mont": 71,
    "./short": 72
  } ],
  71: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var inherits = require("inherits");
    var Base = require("./base");
    var utils = require("../utils");
    function MontCurve(conf) {
      Base.call(this, "mont", conf);
      this.a = new BN(conf.a, 16).toRed(this.red);
      this.b = new BN(conf.b, 16).toRed(this.red);
      this.i4 = new BN(4).toRed(this.red).redInvm();
      this.two = new BN(2).toRed(this.red);
      this.a24 = this.i4.redMul(this.a.redAdd(this.two));
    }
    inherits(MontCurve, Base);
    module.exports = MontCurve;
    MontCurve.prototype.validate = function validate(point) {
      var x = point.normalize().x;
      var x2 = x.redSqr();
      var rhs = x2.redMul(x).redAdd(x2.redMul(this.a)).redAdd(x);
      var y = rhs.redSqrt();
      return 0 === y.redSqr().cmp(rhs);
    };
    function Point(curve, x, z) {
      Base.BasePoint.call(this, curve, "projective");
      if (null === x && null === z) {
        this.x = this.curve.one;
        this.z = this.curve.zero;
      } else {
        this.x = new BN(x, 16);
        this.z = new BN(z, 16);
        this.x.red || (this.x = this.x.toRed(this.curve.red));
        this.z.red || (this.z = this.z.toRed(this.curve.red));
      }
    }
    inherits(Point, Base.BasePoint);
    MontCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      return this.point(utils.toArray(bytes, enc), 1);
    };
    MontCurve.prototype.point = function point(x, z) {
      return new Point(this, x, z);
    };
    MontCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
      return Point.fromJSON(this, obj);
    };
    Point.prototype.precompute = function precompute() {};
    Point.prototype._encode = function _encode() {
      return this.getX().toArray("be", this.curve.p.byteLength());
    };
    Point.fromJSON = function fromJSON(curve, obj) {
      return new Point(curve, obj[0], obj[1] || curve.one);
    };
    Point.prototype.inspect = function inspect() {
      if (this.isInfinity()) return "<EC Point Infinity>";
      return "<EC Point x: " + this.x.fromRed().toString(16, 2) + " z: " + this.z.fromRed().toString(16, 2) + ">";
    };
    Point.prototype.isInfinity = function isInfinity() {
      return 0 === this.z.cmpn(0);
    };
    Point.prototype.dbl = function dbl() {
      var a = this.x.redAdd(this.z);
      var aa = a.redSqr();
      var b = this.x.redSub(this.z);
      var bb = b.redSqr();
      var c = aa.redSub(bb);
      var nx = aa.redMul(bb);
      var nz = c.redMul(bb.redAdd(this.curve.a24.redMul(c)));
      return this.curve.point(nx, nz);
    };
    Point.prototype.add = function add() {
      throw new Error("Not supported on Montgomery curve");
    };
    Point.prototype.diffAdd = function diffAdd(p, diff) {
      var a = this.x.redAdd(this.z);
      var b = this.x.redSub(this.z);
      var c = p.x.redAdd(p.z);
      var d = p.x.redSub(p.z);
      var da = d.redMul(a);
      var cb = c.redMul(b);
      var nx = diff.z.redMul(da.redAdd(cb).redSqr());
      var nz = diff.x.redMul(da.redISub(cb).redSqr());
      return this.curve.point(nx, nz);
    };
    Point.prototype.mul = function mul(k) {
      var t = k.clone();
      var a = this;
      var b = this.curve.point(null, null);
      var c = this;
      for (var bits = []; 0 !== t.cmpn(0); t.iushrn(1)) bits.push(t.andln(1));
      for (var i = bits.length - 1; i >= 0; i--) if (0 === bits[i]) {
        a = a.diffAdd(b, c);
        b = b.dbl();
      } else {
        b = a.diffAdd(b, c);
        a = a.dbl();
      }
      return b;
    };
    Point.prototype.mulAdd = function mulAdd() {
      throw new Error("Not supported on Montgomery curve");
    };
    Point.prototype.jumlAdd = function jumlAdd() {
      throw new Error("Not supported on Montgomery curve");
    };
    Point.prototype.eq = function eq(other) {
      return 0 === this.getX().cmp(other.getX());
    };
    Point.prototype.normalize = function normalize() {
      this.x = this.x.redMul(this.z.redInvm());
      this.z = this.curve.one;
      return this;
    };
    Point.prototype.getX = function getX() {
      this.normalize();
      return this.x.fromRed();
    };
  }, {
    "../utils": 81,
    "./base": 68,
    "bn.js": 16,
    inherits: 101
  } ],
  72: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var BN = require("bn.js");
    var inherits = require("inherits");
    var Base = require("./base");
    var assert = utils.assert;
    function ShortCurve(conf) {
      Base.call(this, "short", conf);
      this.a = new BN(conf.a, 16).toRed(this.red);
      this.b = new BN(conf.b, 16).toRed(this.red);
      this.tinv = this.two.redInvm();
      this.zeroA = 0 === this.a.fromRed().cmpn(0);
      this.threeA = 0 === this.a.fromRed().sub(this.p).cmpn(-3);
      this.endo = this._getEndomorphism(conf);
      this._endoWnafT1 = new Array(4);
      this._endoWnafT2 = new Array(4);
    }
    inherits(ShortCurve, Base);
    module.exports = ShortCurve;
    ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
      if (!this.zeroA || !this.g || !this.n || 1 !== this.p.modn(3)) return;
      var beta;
      var lambda;
      if (conf.beta) beta = new BN(conf.beta, 16).toRed(this.red); else {
        var betas = this._getEndoRoots(this.p);
        beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
        beta = beta.toRed(this.red);
      }
      if (conf.lambda) lambda = new BN(conf.lambda, 16); else {
        var lambdas = this._getEndoRoots(this.n);
        if (0 === this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta))) lambda = lambdas[0]; else {
          lambda = lambdas[1];
          assert(0 === this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)));
        }
      }
      var basis;
      basis = conf.basis ? conf.basis.map(function(vec) {
        return {
          a: new BN(vec.a, 16),
          b: new BN(vec.b, 16)
        };
      }) : this._getEndoBasis(lambda);
      return {
        beta: beta,
        lambda: lambda,
        basis: basis
      };
    };
    ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
      var red = num === this.p ? this.red : BN.mont(num);
      var tinv = new BN(2).toRed(red).redInvm();
      var ntinv = tinv.redNeg();
      var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);
      var l1 = ntinv.redAdd(s).fromRed();
      var l2 = ntinv.redSub(s).fromRed();
      return [ l1, l2 ];
    };
    ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
      var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));
      var u = lambda;
      var v = this.n.clone();
      var x1 = new BN(1);
      var y1 = new BN(0);
      var x2 = new BN(0);
      var y2 = new BN(1);
      var a0;
      var b0;
      var a1;
      var b1;
      var a2;
      var b2;
      var prevR;
      var i = 0;
      var r;
      var x;
      while (0 !== u.cmpn(0)) {
        var q = v.div(u);
        r = v.sub(q.mul(u));
        x = x2.sub(q.mul(x1));
        var y = y2.sub(q.mul(y1));
        if (!a1 && r.cmp(aprxSqrt) < 0) {
          a0 = prevR.neg();
          b0 = x1;
          a1 = r.neg();
          b1 = x;
        } else if (a1 && 2 === ++i) break;
        prevR = r;
        v = u;
        u = r;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
      }
      a2 = r.neg();
      b2 = x;
      var len1 = a1.sqr().add(b1.sqr());
      var len2 = a2.sqr().add(b2.sqr());
      if (len2.cmp(len1) >= 0) {
        a2 = a0;
        b2 = b0;
      }
      if (a1.negative) {
        a1 = a1.neg();
        b1 = b1.neg();
      }
      if (a2.negative) {
        a2 = a2.neg();
        b2 = b2.neg();
      }
      return [ {
        a: a1,
        b: b1
      }, {
        a: a2,
        b: b2
      } ];
    };
    ShortCurve.prototype._endoSplit = function _endoSplit(k) {
      var basis = this.endo.basis;
      var v1 = basis[0];
      var v2 = basis[1];
      var c1 = v2.b.mul(k).divRound(this.n);
      var c2 = v1.b.neg().mul(k).divRound(this.n);
      var p1 = c1.mul(v1.a);
      var p2 = c2.mul(v2.a);
      var q1 = c1.mul(v1.b);
      var q2 = c2.mul(v2.b);
      var k1 = k.sub(p1).sub(p2);
      var k2 = q1.add(q2).neg();
      return {
        k1: k1,
        k2: k2
      };
    };
    ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new BN(x, 16);
      x.red || (x = x.toRed(this.red));
      var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
      var y = y2.redSqrt();
      if (0 !== y.redSqr().redSub(y2).cmp(this.zero)) throw new Error("invalid point");
      var isOdd = y.fromRed().isOdd();
      (odd && !isOdd || !odd && isOdd) && (y = y.redNeg());
      return this.point(x, y);
    };
    ShortCurve.prototype.validate = function validate(point) {
      if (point.inf) return true;
      var x = point.x;
      var y = point.y;
      var ax = this.a.redMul(x);
      var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
      return 0 === y.redSqr().redISub(rhs).cmpn(0);
    };
    ShortCurve.prototype._endoWnafMulAdd = function _endoWnafMulAdd(points, coeffs, jacobianResult) {
      var npoints = this._endoWnafT1;
      var ncoeffs = this._endoWnafT2;
      for (var i = 0; i < points.length; i++) {
        var split = this._endoSplit(coeffs[i]);
        var p = points[i];
        var beta = p._getBeta();
        if (split.k1.negative) {
          split.k1.ineg();
          p = p.neg(true);
        }
        if (split.k2.negative) {
          split.k2.ineg();
          beta = beta.neg(true);
        }
        npoints[2 * i] = p;
        npoints[2 * i + 1] = beta;
        ncoeffs[2 * i] = split.k1;
        ncoeffs[2 * i + 1] = split.k2;
      }
      var res = this._wnafMulAdd(1, npoints, ncoeffs, 2 * i, jacobianResult);
      for (var j = 0; j < 2 * i; j++) {
        npoints[j] = null;
        ncoeffs[j] = null;
      }
      return res;
    };
    function Point(curve, x, y, isRed) {
      Base.BasePoint.call(this, curve, "affine");
      if (null === x && null === y) {
        this.x = null;
        this.y = null;
        this.inf = true;
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        if (isRed) {
          this.x.forceRed(this.curve.red);
          this.y.forceRed(this.curve.red);
        }
        this.x.red || (this.x = this.x.toRed(this.curve.red));
        this.y.red || (this.y = this.y.toRed(this.curve.red));
        this.inf = false;
      }
    }
    inherits(Point, Base.BasePoint);
    ShortCurve.prototype.point = function point(x, y, isRed) {
      return new Point(this, x, y, isRed);
    };
    ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
      return Point.fromJSON(this, obj, red);
    };
    Point.prototype._getBeta = function _getBeta() {
      if (!this.curve.endo) return;
      var pre = this.precomputed;
      if (pre && pre.beta) return pre.beta;
      var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
      if (pre) {
        var curve = this.curve;
        var endoMul = function(p) {
          return curve.point(p.x.redMul(curve.endo.beta), p.y);
        };
        pre.beta = beta;
        beta.precomputed = {
          beta: null,
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(endoMul)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(endoMul)
          }
        };
      }
      return beta;
    };
    Point.prototype.toJSON = function toJSON() {
      if (!this.precomputed) return [ this.x, this.y ];
      return [ this.x, this.y, this.precomputed && {
        doubles: this.precomputed.doubles && {
          step: this.precomputed.doubles.step,
          points: this.precomputed.doubles.points.slice(1)
        },
        naf: this.precomputed.naf && {
          wnd: this.precomputed.naf.wnd,
          points: this.precomputed.naf.points.slice(1)
        }
      } ];
    };
    Point.fromJSON = function fromJSON(curve, obj, red) {
      "string" === typeof obj && (obj = JSON.parse(obj));
      var res = curve.point(obj[0], obj[1], red);
      if (!obj[2]) return res;
      function obj2point(obj) {
        return curve.point(obj[0], obj[1], red);
      }
      var pre = obj[2];
      res.precomputed = {
        beta: null,
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: [ res ].concat(pre.doubles.points.map(obj2point))
        },
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: [ res ].concat(pre.naf.points.map(obj2point))
        }
      };
      return res;
    };
    Point.prototype.inspect = function inspect() {
      if (this.isInfinity()) return "<EC Point Infinity>";
      return "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + ">";
    };
    Point.prototype.isInfinity = function isInfinity() {
      return this.inf;
    };
    Point.prototype.add = function add(p) {
      if (this.inf) return p;
      if (p.inf) return this;
      if (this.eq(p)) return this.dbl();
      if (this.neg().eq(p)) return this.curve.point(null, null);
      if (0 === this.x.cmp(p.x)) return this.curve.point(null, null);
      var c = this.y.redSub(p.y);
      0 !== c.cmpn(0) && (c = c.redMul(this.x.redSub(p.x).redInvm()));
      var nx = c.redSqr().redISub(this.x).redISub(p.x);
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };
    Point.prototype.dbl = function dbl() {
      if (this.inf) return this;
      var ys1 = this.y.redAdd(this.y);
      if (0 === ys1.cmpn(0)) return this.curve.point(null, null);
      var a = this.curve.a;
      var x2 = this.x.redSqr();
      var dyinv = ys1.redInvm();
      var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
      var nx = c.redSqr().redISub(this.x.redAdd(this.x));
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };
    Point.prototype.getX = function getX() {
      return this.x.fromRed();
    };
    Point.prototype.getY = function getY() {
      return this.y.fromRed();
    };
    Point.prototype.mul = function mul(k) {
      k = new BN(k, 16);
      return this.isInfinity() ? this : this._hasDoubles(k) ? this.curve._fixedNafMul(this, k) : this.curve.endo ? this.curve._endoWnafMulAdd([ this ], [ k ]) : this.curve._wnafMul(this, k);
    };
    Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
      var points = [ this, p2 ];
      var coeffs = [ k1, k2 ];
      return this.curve.endo ? this.curve._endoWnafMulAdd(points, coeffs) : this.curve._wnafMulAdd(1, points, coeffs, 2);
    };
    Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
      var points = [ this, p2 ];
      var coeffs = [ k1, k2 ];
      return this.curve.endo ? this.curve._endoWnafMulAdd(points, coeffs, true) : this.curve._wnafMulAdd(1, points, coeffs, 2, true);
    };
    Point.prototype.eq = function eq(p) {
      return this === p || this.inf === p.inf && (this.inf || 0 === this.x.cmp(p.x) && 0 === this.y.cmp(p.y));
    };
    Point.prototype.neg = function neg(_precompute) {
      if (this.inf) return this;
      var res = this.curve.point(this.x, this.y.redNeg());
      if (_precompute && this.precomputed) {
        var pre = this.precomputed;
        var negate = function(p) {
          return p.neg();
        };
        res.precomputed = {
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(negate)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(negate)
          }
        };
      }
      return res;
    };
    Point.prototype.toJ = function toJ() {
      if (this.inf) return this.curve.jpoint(null, null, null);
      var res = this.curve.jpoint(this.x, this.y, this.curve.one);
      return res;
    };
    function JPoint(curve, x, y, z) {
      Base.BasePoint.call(this, curve, "jacobian");
      if (null === x && null === y && null === z) {
        this.x = this.curve.one;
        this.y = this.curve.one;
        this.z = new BN(0);
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        this.z = new BN(z, 16);
      }
      this.x.red || (this.x = this.x.toRed(this.curve.red));
      this.y.red || (this.y = this.y.toRed(this.curve.red));
      this.z.red || (this.z = this.z.toRed(this.curve.red));
      this.zOne = this.z === this.curve.one;
    }
    inherits(JPoint, Base.BasePoint);
    ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
      return new JPoint(this, x, y, z);
    };
    JPoint.prototype.toP = function toP() {
      if (this.isInfinity()) return this.curve.point(null, null);
      var zinv = this.z.redInvm();
      var zinv2 = zinv.redSqr();
      var ax = this.x.redMul(zinv2);
      var ay = this.y.redMul(zinv2).redMul(zinv);
      return this.curve.point(ax, ay);
    };
    JPoint.prototype.neg = function neg() {
      return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
    };
    JPoint.prototype.add = function add(p) {
      if (this.isInfinity()) return p;
      if (p.isInfinity()) return this;
      var pz2 = p.z.redSqr();
      var z2 = this.z.redSqr();
      var u1 = this.x.redMul(pz2);
      var u2 = p.x.redMul(z2);
      var s1 = this.y.redMul(pz2.redMul(p.z));
      var s2 = p.y.redMul(z2.redMul(this.z));
      var h = u1.redSub(u2);
      var r = s1.redSub(s2);
      if (0 === h.cmpn(0)) return 0 !== r.cmpn(0) ? this.curve.jpoint(null, null, null) : this.dbl();
      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(p.z).redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.mixedAdd = function mixedAdd(p) {
      if (this.isInfinity()) return p.toJ();
      if (p.isInfinity()) return this;
      var z2 = this.z.redSqr();
      var u1 = this.x;
      var u2 = p.x.redMul(z2);
      var s1 = this.y;
      var s2 = p.y.redMul(z2).redMul(this.z);
      var h = u1.redSub(u2);
      var r = s1.redSub(s2);
      if (0 === h.cmpn(0)) return 0 !== r.cmpn(0) ? this.curve.jpoint(null, null, null) : this.dbl();
      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.dblp = function dblp(pow) {
      if (0 === pow) return this;
      if (this.isInfinity()) return this;
      if (!pow) return this.dbl();
      if (this.curve.zeroA || this.curve.threeA) {
        var r = this;
        for (var i = 0; i < pow; i++) r = r.dbl();
        return r;
      }
      var a = this.curve.a;
      var tinv = this.curve.tinv;
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();
      var jyd = jy.redAdd(jy);
      for (var i = 0; i < pow; i++) {
        var jx2 = jx.redSqr();
        var jyd2 = jyd.redSqr();
        var jyd4 = jyd2.redSqr();
        var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
        var t1 = jx.redMul(jyd2);
        var nx = c.redSqr().redISub(t1.redAdd(t1));
        var t2 = t1.redISub(nx);
        var dny = c.redMul(t2);
        dny = dny.redIAdd(dny).redISub(jyd4);
        var nz = jyd.redMul(jz);
        i + 1 < pow && (jz4 = jz4.redMul(jyd4));
        jx = nx;
        jz = nz;
        jyd = dny;
      }
      return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
    };
    JPoint.prototype.dbl = function dbl() {
      if (this.isInfinity()) return this;
      return this.curve.zeroA ? this._zeroDbl() : this.curve.threeA ? this._threeDbl() : this._dbl();
    };
    JPoint.prototype._zeroDbl = function _zeroDbl() {
      var nx;
      var ny;
      var nz;
      if (this.zOne) {
        var xx = this.x.redSqr();
        var yy = this.y.redSqr();
        var yyyy = yy.redSqr();
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        var m = xx.redAdd(xx).redIAdd(xx);
        var t = m.redSqr().redISub(s).redISub(s);
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        nx = t;
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        nz = this.y.redAdd(this.y);
      } else {
        var a = this.x.redSqr();
        var b = this.y.redSqr();
        var c = b.redSqr();
        var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
        d = d.redIAdd(d);
        var e = a.redAdd(a).redIAdd(a);
        var f = e.redSqr();
        var c8 = c.redIAdd(c);
        c8 = c8.redIAdd(c8);
        c8 = c8.redIAdd(c8);
        nx = f.redISub(d).redISub(d);
        ny = e.redMul(d.redISub(nx)).redISub(c8);
        nz = this.y.redMul(this.z);
        nz = nz.redIAdd(nz);
      }
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype._threeDbl = function _threeDbl() {
      var nx;
      var ny;
      var nz;
      if (this.zOne) {
        var xx = this.x.redSqr();
        var yy = this.y.redSqr();
        var yyyy = yy.redSqr();
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
        var t = m.redSqr().redISub(s).redISub(s);
        nx = t;
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        nz = this.y.redAdd(this.y);
      } else {
        var delta = this.z.redSqr();
        var gamma = this.y.redSqr();
        var beta = this.x.redMul(gamma);
        var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
        alpha = alpha.redAdd(alpha).redIAdd(alpha);
        var beta4 = beta.redIAdd(beta);
        beta4 = beta4.redIAdd(beta4);
        var beta8 = beta4.redAdd(beta4);
        nx = alpha.redSqr().redISub(beta8);
        nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
        var ggamma8 = gamma.redSqr();
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
      }
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype._dbl = function _dbl() {
      var a = this.curve.a;
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();
      var jx2 = jx.redSqr();
      var jy2 = jy.redSqr();
      var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
      var jxd4 = jx.redAdd(jx);
      jxd4 = jxd4.redIAdd(jxd4);
      var t1 = jxd4.redMul(jy2);
      var nx = c.redSqr().redISub(t1.redAdd(t1));
      var t2 = t1.redISub(nx);
      var jyd8 = jy2.redSqr();
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      var ny = c.redMul(t2).redISub(jyd8);
      var nz = jy.redAdd(jy).redMul(jz);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.trpl = function trpl() {
      if (!this.curve.zeroA) return this.dbl().add(this);
      var xx = this.x.redSqr();
      var yy = this.y.redSqr();
      var zz = this.z.redSqr();
      var yyyy = yy.redSqr();
      var m = xx.redAdd(xx).redIAdd(xx);
      var mm = m.redSqr();
      var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      e = e.redIAdd(e);
      e = e.redAdd(e).redIAdd(e);
      e = e.redISub(mm);
      var ee = e.redSqr();
      var t = yyyy.redIAdd(yyyy);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
      var yyu4 = yy.redMul(u);
      yyu4 = yyu4.redIAdd(yyu4);
      yyu4 = yyu4.redIAdd(yyu4);
      var nx = this.x.redMul(ee).redISub(yyu4);
      nx = nx.redIAdd(nx);
      nx = nx.redIAdd(nx);
      var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.mul = function mul(k, kbase) {
      k = new BN(k, kbase);
      return this.curve._wnafMul(this, k);
    };
    JPoint.prototype.eq = function eq(p) {
      if ("affine" === p.type) return this.eq(p.toJ());
      if (this === p) return true;
      var z2 = this.z.redSqr();
      var pz2 = p.z.redSqr();
      if (0 !== this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0)) return false;
      var z3 = z2.redMul(this.z);
      var pz3 = pz2.redMul(p.z);
      return 0 === this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0);
    };
    JPoint.prototype.eqXToP = function eqXToP(x) {
      var zs = this.z.redSqr();
      var rx = x.toRed(this.curve.red).redMul(zs);
      if (0 === this.x.cmp(rx)) return true;
      var xc = x.clone();
      var t = this.curve.redN.redMul(zs);
      for (;;) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0) return false;
        rx.redIAdd(t);
        if (0 === this.x.cmp(rx)) return true;
      }
    };
    JPoint.prototype.inspect = function inspect() {
      if (this.isInfinity()) return "<EC JPoint Infinity>";
      return "<EC JPoint x: " + this.x.toString(16, 2) + " y: " + this.y.toString(16, 2) + " z: " + this.z.toString(16, 2) + ">";
    };
    JPoint.prototype.isInfinity = function isInfinity() {
      return 0 === this.z.cmpn(0);
    };
  }, {
    "../utils": 81,
    "./base": 68,
    "bn.js": 16,
    inherits: 101
  } ],
  73: [ function(require, module, exports) {
    "use strict";
    var curves = exports;
    var hash = require("hash.js");
    var curve = require("./curve");
    var utils = require("./utils");
    var assert = utils.assert;
    function PresetCurve(options) {
      "short" === options.type ? this.curve = new curve.short(options) : "edwards" === options.type ? this.curve = new curve.edwards(options) : this.curve = new curve.mont(options);
      this.g = this.curve.g;
      this.n = this.curve.n;
      this.hash = options.hash;
      assert(this.g.validate(), "Invalid curve");
      assert(this.g.mul(this.n).isInfinity(), "Invalid curve, G*N != O");
    }
    curves.PresetCurve = PresetCurve;
    function defineCurve(name, options) {
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        get: function() {
          var curve = new PresetCurve(options);
          Object.defineProperty(curves, name, {
            configurable: true,
            enumerable: true,
            value: curve
          });
          return curve;
        }
      });
    }
    defineCurve("p192", {
      type: "short",
      prime: "p192",
      p: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff",
      a: "ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc",
      b: "64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1",
      n: "ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831",
      hash: hash.sha256,
      gRed: false,
      g: [ "188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012", "07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811" ]
    });
    defineCurve("p224", {
      type: "short",
      prime: "p224",
      p: "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001",
      a: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe",
      b: "b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4",
      n: "ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d",
      hash: hash.sha256,
      gRed: false,
      g: [ "b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21", "bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34" ]
    });
    defineCurve("p256", {
      type: "short",
      prime: null,
      p: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff",
      a: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc",
      b: "5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b",
      n: "ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551",
      hash: hash.sha256,
      gRed: false,
      g: [ "6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296", "4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5" ]
    });
    defineCurve("p384", {
      type: "short",
      prime: null,
      p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 ffffffff",
      a: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 fffffffc",
      b: "b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f 5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef",
      n: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 f4372ddf 581a0db2 48b0a77a ecec196a ccc52973",
      hash: hash.sha384,
      gRed: false,
      g: [ "aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 5502f25d bf55296c 3a545e38 72760ab7", "3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 0a60b1ce 1d7e819d 7a431d7c 90ea0e5f" ]
    });
    defineCurve("p521", {
      type: "short",
      prime: null,
      p: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
      a: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffc",
      b: "00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b 99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd 3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00",
      n: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409",
      hash: hash.sha512,
      gRed: false,
      g: [ "000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66", "00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 3fad0761 353c7086 a272c240 88be9476 9fd16650" ]
    });
    defineCurve("curve25519", {
      type: "mont",
      prime: "p25519",
      p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
      a: "76d06",
      b: "1",
      n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
      hash: hash.sha256,
      gRed: false,
      g: [ "9" ]
    });
    defineCurve("ed25519", {
      type: "edwards",
      prime: "p25519",
      p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
      a: "-1",
      c: "1",
      d: "52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3",
      n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
      hash: hash.sha256,
      gRed: false,
      g: [ "216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a", "6666666666666666666666666666666666666666666666666666666666666658" ]
    });
    var pre;
    try {
      pre = require("./precomputed/secp256k1");
    } catch (e) {
      pre = void 0;
    }
    defineCurve("secp256k1", {
      type: "short",
      prime: "k256",
      p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f",
      a: "0",
      b: "7",
      n: "ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141",
      h: "1",
      hash: hash.sha256,
      beta: "7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",
      lambda: "5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72",
      basis: [ {
        a: "3086d221a7d46bcde86c90e49284eb15",
        b: "-e4437ed6010e88286f547fa90abfe4c3"
      }, {
        a: "114ca50f7a8e2f3f657c1108d9d44cfd8",
        b: "3086d221a7d46bcde86c90e49284eb15"
      } ],
      gRed: false,
      g: [ "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8", pre ]
    });
  }, {
    "./curve": 70,
    "./precomputed/secp256k1": 80,
    "./utils": 81,
    "hash.js": 86
  } ],
  74: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var HmacDRBG = require("hmac-drbg");
    var utils = require("../utils");
    var curves = require("../curves");
    var rand = require("brorand");
    var assert = utils.assert;
    var KeyPair = require("./key");
    var Signature = require("./signature");
    function EC(options) {
      if (!(this instanceof EC)) return new EC(options);
      if ("string" === typeof options) {
        assert(curves.hasOwnProperty(options), "Unknown curve " + options);
        options = curves[options];
      }
      options instanceof curves.PresetCurve && (options = {
        curve: options
      });
      this.curve = options.curve.curve;
      this.n = this.curve.n;
      this.nh = this.n.ushrn(1);
      this.g = this.curve.g;
      this.g = options.curve.g;
      this.g.precompute(options.curve.n.bitLength() + 1);
      this.hash = options.hash || options.curve.hash;
    }
    module.exports = EC;
    EC.prototype.keyPair = function keyPair(options) {
      return new KeyPair(this, options);
    };
    EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
      return KeyPair.fromPrivate(this, priv, enc);
    };
    EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
      return KeyPair.fromPublic(this, pub, enc);
    };
    EC.prototype.genKeyPair = function genKeyPair(options) {
      options || (options = {});
      var drbg = new HmacDRBG({
        hash: this.hash,
        pers: options.pers,
        persEnc: options.persEnc || "utf8",
        entropy: options.entropy || rand(this.hash.hmacStrength),
        entropyEnc: options.entropy && options.entropyEnc || "utf8",
        nonce: this.n.toArray()
      });
      var bytes = this.n.byteLength();
      var ns2 = this.n.sub(new BN(2));
      do {
        var priv = new BN(drbg.generate(bytes));
        if (priv.cmp(ns2) > 0) continue;
        priv.iaddn(1);
        return this.keyFromPrivate(priv);
      } while (true);
    };
    EC.prototype._truncateToN = function truncateToN(msg, truncOnly) {
      var delta = 8 * msg.byteLength() - this.n.bitLength();
      delta > 0 && (msg = msg.ushrn(delta));
      return !truncOnly && msg.cmp(this.n) >= 0 ? msg.sub(this.n) : msg;
    };
    EC.prototype.sign = function sign(msg, key, enc, options) {
      if ("object" === typeof enc) {
        options = enc;
        enc = null;
      }
      options || (options = {});
      key = this.keyFromPrivate(key, enc);
      msg = this._truncateToN(new BN(msg, 16));
      var bytes = this.n.byteLength();
      var bkey = key.getPrivate().toArray("be", bytes);
      var nonce = msg.toArray("be", bytes);
      var drbg = new HmacDRBG({
        hash: this.hash,
        entropy: bkey,
        nonce: nonce,
        pers: options.pers,
        persEnc: options.persEnc || "utf8"
      });
      var ns1 = this.n.sub(new BN(1));
      for (var iter = 0; true; iter++) {
        var k = options.k ? options.k(iter) : new BN(drbg.generate(this.n.byteLength()));
        k = this._truncateToN(k, true);
        if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0) continue;
        var kp = this.g.mul(k);
        if (kp.isInfinity()) continue;
        var kpX = kp.getX();
        var r = kpX.umod(this.n);
        if (0 === r.cmpn(0)) continue;
        var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
        s = s.umod(this.n);
        if (0 === s.cmpn(0)) continue;
        var recoveryParam = (kp.getY().isOdd() ? 1 : 0) | (0 !== kpX.cmp(r) ? 2 : 0);
        if (options.canonical && s.cmp(this.nh) > 0) {
          s = this.n.sub(s);
          recoveryParam ^= 1;
        }
        return new Signature({
          r: r,
          s: s,
          recoveryParam: recoveryParam
        });
      }
    };
    EC.prototype.verify = function verify(msg, signature, key, enc) {
      msg = this._truncateToN(new BN(msg, 16));
      key = this.keyFromPublic(key, enc);
      signature = new Signature(signature, "hex");
      var r = signature.r;
      var s = signature.s;
      if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0) return false;
      if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0) return false;
      var sinv = s.invm(this.n);
      var u1 = sinv.mul(msg).umod(this.n);
      var u2 = sinv.mul(r).umod(this.n);
      if (!this.curve._maxwellTrick) {
        var p = this.g.mulAdd(u1, key.getPublic(), u2);
        if (p.isInfinity()) return false;
        return 0 === p.getX().umod(this.n).cmp(r);
      }
      var p = this.g.jmulAdd(u1, key.getPublic(), u2);
      if (p.isInfinity()) return false;
      return p.eqXToP(r);
    };
    EC.prototype.recoverPubKey = function(msg, signature, j, enc) {
      assert((3 & j) === j, "The recovery param is more than two bits");
      signature = new Signature(signature, enc);
      var n = this.n;
      var e = new BN(msg);
      var r = signature.r;
      var s = signature.s;
      var isYOdd = 1 & j;
      var isSecondKey = j >> 1;
      if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey) throw new Error("Unable to find sencond key candinate");
      r = isSecondKey ? this.curve.pointFromX(r.add(this.curve.n), isYOdd) : this.curve.pointFromX(r, isYOdd);
      var rInv = signature.r.invm(n);
      var s1 = n.sub(e).mul(rInv).umod(n);
      var s2 = s.mul(rInv).umod(n);
      return this.g.mulAdd(s1, r, s2);
    };
    EC.prototype.getKeyRecoveryParam = function(e, signature, Q, enc) {
      signature = new Signature(signature, enc);
      if (null !== signature.recoveryParam) return signature.recoveryParam;
      for (var i = 0; i < 4; i++) {
        var Qprime;
        try {
          Qprime = this.recoverPubKey(e, signature, i);
        } catch (e) {
          continue;
        }
        if (Qprime.eq(Q)) return i;
      }
      throw new Error("Unable to find valid recovery factor");
    };
  }, {
    "../curves": 73,
    "../utils": 81,
    "./key": 75,
    "./signature": 76,
    "bn.js": 16,
    brorand: 17,
    "hmac-drbg": 98
  } ],
  75: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var utils = require("../utils");
    var assert = utils.assert;
    function KeyPair(ec, options) {
      this.ec = ec;
      this.priv = null;
      this.pub = null;
      options.priv && this._importPrivate(options.priv, options.privEnc);
      options.pub && this._importPublic(options.pub, options.pubEnc);
    }
    module.exports = KeyPair;
    KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
      if (pub instanceof KeyPair) return pub;
      return new KeyPair(ec, {
        pub: pub,
        pubEnc: enc
      });
    };
    KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
      if (priv instanceof KeyPair) return priv;
      return new KeyPair(ec, {
        priv: priv,
        privEnc: enc
      });
    };
    KeyPair.prototype.validate = function validate() {
      var pub = this.getPublic();
      if (pub.isInfinity()) return {
        result: false,
        reason: "Invalid public key"
      };
      if (!pub.validate()) return {
        result: false,
        reason: "Public key is not a point"
      };
      if (!pub.mul(this.ec.curve.n).isInfinity()) return {
        result: false,
        reason: "Public key * N != O"
      };
      return {
        result: true,
        reason: null
      };
    };
    KeyPair.prototype.getPublic = function getPublic(compact, enc) {
      if ("string" === typeof compact) {
        enc = compact;
        compact = null;
      }
      this.pub || (this.pub = this.ec.g.mul(this.priv));
      if (!enc) return this.pub;
      return this.pub.encode(enc, compact);
    };
    KeyPair.prototype.getPrivate = function getPrivate(enc) {
      return "hex" === enc ? this.priv.toString(16, 2) : this.priv;
    };
    KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
      this.priv = new BN(key, enc || 16);
      this.priv = this.priv.umod(this.ec.curve.n);
    };
    KeyPair.prototype._importPublic = function _importPublic(key, enc) {
      if (key.x || key.y) {
        "mont" === this.ec.curve.type ? assert(key.x, "Need x coordinate") : "short" !== this.ec.curve.type && "edwards" !== this.ec.curve.type || assert(key.x && key.y, "Need both x and y coordinate");
        this.pub = this.ec.curve.point(key.x, key.y);
        return;
      }
      this.pub = this.ec.curve.decodePoint(key, enc);
    };
    KeyPair.prototype.derive = function derive(pub) {
      return pub.mul(this.priv).getX();
    };
    KeyPair.prototype.sign = function sign(msg, enc, options) {
      return this.ec.sign(msg, this, enc, options);
    };
    KeyPair.prototype.verify = function verify(msg, signature) {
      return this.ec.verify(msg, signature, this);
    };
    KeyPair.prototype.inspect = function inspect() {
      return "<Key priv: " + (this.priv && this.priv.toString(16, 2)) + " pub: " + (this.pub && this.pub.inspect()) + " >";
    };
  }, {
    "../utils": 81,
    "bn.js": 16
  } ],
  76: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var utils = require("../utils");
    var assert = utils.assert;
    function Signature(options, enc) {
      if (options instanceof Signature) return options;
      if (this._importDER(options, enc)) return;
      assert(options.r && options.s, "Signature without r or s");
      this.r = new BN(options.r, 16);
      this.s = new BN(options.s, 16);
      void 0 === options.recoveryParam ? this.recoveryParam = null : this.recoveryParam = options.recoveryParam;
    }
    module.exports = Signature;
    function Position() {
      this.place = 0;
    }
    function getLength(buf, p) {
      var initial = buf[p.place++];
      if (!(128 & initial)) return initial;
      var octetLen = 15 & initial;
      var val = 0;
      for (var i = 0, off = p.place; i < octetLen; i++, off++) {
        val <<= 8;
        val |= buf[off];
      }
      p.place = off;
      return val;
    }
    function rmPadding(buf) {
      var i = 0;
      var len = buf.length - 1;
      while (!buf[i] && !(128 & buf[i + 1]) && i < len) i++;
      if (0 === i) return buf;
      return buf.slice(i);
    }
    Signature.prototype._importDER = function _importDER(data, enc) {
      data = utils.toArray(data, enc);
      var p = new Position();
      if (48 !== data[p.place++]) return false;
      var len = getLength(data, p);
      if (len + p.place !== data.length) return false;
      if (2 !== data[p.place++]) return false;
      var rlen = getLength(data, p);
      var r = data.slice(p.place, rlen + p.place);
      p.place += rlen;
      if (2 !== data[p.place++]) return false;
      var slen = getLength(data, p);
      if (data.length !== slen + p.place) return false;
      var s = data.slice(p.place, slen + p.place);
      0 === r[0] && 128 & r[1] && (r = r.slice(1));
      0 === s[0] && 128 & s[1] && (s = s.slice(1));
      this.r = new BN(r);
      this.s = new BN(s);
      this.recoveryParam = null;
      return true;
    };
    function constructLength(arr, len) {
      if (len < 128) {
        arr.push(len);
        return;
      }
      var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
      arr.push(128 | octets);
      while (--octets) arr.push(len >>> (octets << 3) & 255);
      arr.push(len);
    }
    Signature.prototype.toDER = function toDER(enc) {
      var r = this.r.toArray();
      var s = this.s.toArray();
      128 & r[0] && (r = [ 0 ].concat(r));
      128 & s[0] && (s = [ 0 ].concat(s));
      r = rmPadding(r);
      s = rmPadding(s);
      while (!s[0] && !(128 & s[1])) s = s.slice(1);
      var arr = [ 2 ];
      constructLength(arr, r.length);
      arr = arr.concat(r);
      arr.push(2);
      constructLength(arr, s.length);
      var backHalf = arr.concat(s);
      var res = [ 48 ];
      constructLength(res, backHalf.length);
      res = res.concat(backHalf);
      return utils.encode(res, enc);
    };
  }, {
    "../utils": 81,
    "bn.js": 16
  } ],
  77: [ function(require, module, exports) {
    "use strict";
    var hash = require("hash.js");
    var curves = require("../curves");
    var utils = require("../utils");
    var assert = utils.assert;
    var parseBytes = utils.parseBytes;
    var KeyPair = require("./key");
    var Signature = require("./signature");
    function EDDSA(curve) {
      assert("ed25519" === curve, "only tested with ed25519 so far");
      if (!(this instanceof EDDSA)) return new EDDSA(curve);
      var curve = curves[curve].curve;
      this.curve = curve;
      this.g = curve.g;
      this.g.precompute(curve.n.bitLength() + 1);
      this.pointClass = curve.point().constructor;
      this.encodingLength = Math.ceil(curve.n.bitLength() / 8);
      this.hash = hash.sha512;
    }
    module.exports = EDDSA;
    EDDSA.prototype.sign = function sign(message, secret) {
      message = parseBytes(message);
      var key = this.keyFromSecret(secret);
      var r = this.hashInt(key.messagePrefix(), message);
      var R = this.g.mul(r);
      var Rencoded = this.encodePoint(R);
      var s_ = this.hashInt(Rencoded, key.pubBytes(), message).mul(key.priv());
      var S = r.add(s_).umod(this.curve.n);
      return this.makeSignature({
        R: R,
        S: S,
        Rencoded: Rencoded
      });
    };
    EDDSA.prototype.verify = function verify(message, sig, pub) {
      message = parseBytes(message);
      sig = this.makeSignature(sig);
      var key = this.keyFromPublic(pub);
      var h = this.hashInt(sig.Rencoded(), key.pubBytes(), message);
      var SG = this.g.mul(sig.S());
      var RplusAh = sig.R().add(key.pub().mul(h));
      return RplusAh.eq(SG);
    };
    EDDSA.prototype.hashInt = function hashInt() {
      var hash = this.hash();
      for (var i = 0; i < arguments.length; i++) hash.update(arguments[i]);
      return utils.intFromLE(hash.digest()).umod(this.curve.n);
    };
    EDDSA.prototype.keyFromPublic = function keyFromPublic(pub) {
      return KeyPair.fromPublic(this, pub);
    };
    EDDSA.prototype.keyFromSecret = function keyFromSecret(secret) {
      return KeyPair.fromSecret(this, secret);
    };
    EDDSA.prototype.makeSignature = function makeSignature(sig) {
      if (sig instanceof Signature) return sig;
      return new Signature(this, sig);
    };
    EDDSA.prototype.encodePoint = function encodePoint(point) {
      var enc = point.getY().toArray("le", this.encodingLength);
      enc[this.encodingLength - 1] |= point.getX().isOdd() ? 128 : 0;
      return enc;
    };
    EDDSA.prototype.decodePoint = function decodePoint(bytes) {
      bytes = utils.parseBytes(bytes);
      var lastIx = bytes.length - 1;
      var normed = bytes.slice(0, lastIx).concat(-129 & bytes[lastIx]);
      var xIsOdd = 0 !== (128 & bytes[lastIx]);
      var y = utils.intFromLE(normed);
      return this.curve.pointFromY(y, xIsOdd);
    };
    EDDSA.prototype.encodeInt = function encodeInt(num) {
      return num.toArray("le", this.encodingLength);
    };
    EDDSA.prototype.decodeInt = function decodeInt(bytes) {
      return utils.intFromLE(bytes);
    };
    EDDSA.prototype.isPoint = function isPoint(val) {
      return val instanceof this.pointClass;
    };
  }, {
    "../curves": 73,
    "../utils": 81,
    "./key": 78,
    "./signature": 79,
    "hash.js": 86
  } ],
  78: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var assert = utils.assert;
    var parseBytes = utils.parseBytes;
    var cachedProperty = utils.cachedProperty;
    function KeyPair(eddsa, params) {
      this.eddsa = eddsa;
      this._secret = parseBytes(params.secret);
      eddsa.isPoint(params.pub) ? this._pub = params.pub : this._pubBytes = parseBytes(params.pub);
    }
    KeyPair.fromPublic = function fromPublic(eddsa, pub) {
      if (pub instanceof KeyPair) return pub;
      return new KeyPair(eddsa, {
        pub: pub
      });
    };
    KeyPair.fromSecret = function fromSecret(eddsa, secret) {
      if (secret instanceof KeyPair) return secret;
      return new KeyPair(eddsa, {
        secret: secret
      });
    };
    KeyPair.prototype.secret = function secret() {
      return this._secret;
    };
    cachedProperty(KeyPair, "pubBytes", function pubBytes() {
      return this.eddsa.encodePoint(this.pub());
    });
    cachedProperty(KeyPair, "pub", function pub() {
      if (this._pubBytes) return this.eddsa.decodePoint(this._pubBytes);
      return this.eddsa.g.mul(this.priv());
    });
    cachedProperty(KeyPair, "privBytes", function privBytes() {
      var eddsa = this.eddsa;
      var hash = this.hash();
      var lastIx = eddsa.encodingLength - 1;
      var a = hash.slice(0, eddsa.encodingLength);
      a[0] &= 248;
      a[lastIx] &= 127;
      a[lastIx] |= 64;
      return a;
    });
    cachedProperty(KeyPair, "priv", function priv() {
      return this.eddsa.decodeInt(this.privBytes());
    });
    cachedProperty(KeyPair, "hash", function hash() {
      return this.eddsa.hash().update(this.secret()).digest();
    });
    cachedProperty(KeyPair, "messagePrefix", function messagePrefix() {
      return this.hash().slice(this.eddsa.encodingLength);
    });
    KeyPair.prototype.sign = function sign(message) {
      assert(this._secret, "KeyPair can only verify");
      return this.eddsa.sign(message, this);
    };
    KeyPair.prototype.verify = function verify(message, sig) {
      return this.eddsa.verify(message, sig, this);
    };
    KeyPair.prototype.getSecret = function getSecret(enc) {
      assert(this._secret, "KeyPair is public only");
      return utils.encode(this.secret(), enc);
    };
    KeyPair.prototype.getPublic = function getPublic(enc) {
      return utils.encode(this.pubBytes(), enc);
    };
    module.exports = KeyPair;
  }, {
    "../utils": 81
  } ],
  79: [ function(require, module, exports) {
    "use strict";
    var BN = require("bn.js");
    var utils = require("../utils");
    var assert = utils.assert;
    var cachedProperty = utils.cachedProperty;
    var parseBytes = utils.parseBytes;
    function Signature(eddsa, sig) {
      this.eddsa = eddsa;
      "object" !== typeof sig && (sig = parseBytes(sig));
      Array.isArray(sig) && (sig = {
        R: sig.slice(0, eddsa.encodingLength),
        S: sig.slice(eddsa.encodingLength)
      });
      assert(sig.R && sig.S, "Signature without R or S");
      eddsa.isPoint(sig.R) && (this._R = sig.R);
      sig.S instanceof BN && (this._S = sig.S);
      this._Rencoded = Array.isArray(sig.R) ? sig.R : sig.Rencoded;
      this._Sencoded = Array.isArray(sig.S) ? sig.S : sig.Sencoded;
    }
    cachedProperty(Signature, "S", function S() {
      return this.eddsa.decodeInt(this.Sencoded());
    });
    cachedProperty(Signature, "R", function R() {
      return this.eddsa.decodePoint(this.Rencoded());
    });
    cachedProperty(Signature, "Rencoded", function Rencoded() {
      return this.eddsa.encodePoint(this.R());
    });
    cachedProperty(Signature, "Sencoded", function Sencoded() {
      return this.eddsa.encodeInt(this.S());
    });
    Signature.prototype.toBytes = function toBytes() {
      return this.Rencoded().concat(this.Sencoded());
    };
    Signature.prototype.toHex = function toHex() {
      return utils.encode(this.toBytes(), "hex").toUpperCase();
    };
    module.exports = Signature;
  }, {
    "../utils": 81,
    "bn.js": 16
  } ],
  80: [ function(require, module, exports) {
    module.exports = {
      doubles: {
        step: 4,
        points: [ [ "e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a", "f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821" ], [ "8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508", "11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf" ], [ "175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739", "d3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695" ], [ "363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640", "4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9" ], [ "8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c", "4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36" ], [ "723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda", "96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f" ], [ "eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa", "5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999" ], [ "100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0", "cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09" ], [ "e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d", "9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d" ], [ "feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d", "e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088" ], [ "da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1", "9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d" ], [ "53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0", "5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8" ], [ "8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047", "10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a" ], [ "385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862", "283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453" ], [ "6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7", "7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160" ], [ "3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd", "56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0" ], [ "85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83", "7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6" ], [ "948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a", "53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589" ], [ "6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8", "bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17" ], [ "e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d", "4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda" ], [ "e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725", "7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd" ], [ "213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754", "4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2" ], [ "4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c", "17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6" ], [ "fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6", "6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f" ], [ "76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39", "c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01" ], [ "c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891", "893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3" ], [ "d895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b", "febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f" ], [ "b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03", "2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7" ], [ "e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d", "eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78" ], [ "a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070", "7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1" ], [ "90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4", "e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150" ], [ "8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da", "662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82" ], [ "e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11", "1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc" ], [ "8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e", "efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b" ], [ "e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41", "2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51" ], [ "b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef", "67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45" ], [ "d68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8", "db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120" ], [ "324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d", "648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84" ], [ "4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96", "35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d" ], [ "9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd", "ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d" ], [ "6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5", "9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8" ], [ "a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266", "40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8" ], [ "7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71", "34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac" ], [ "928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac", "c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f" ], [ "85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751", "1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962" ], [ "ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e", "493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907" ], [ "827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241", "c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec" ], [ "eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3", "be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d" ], [ "e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f", "4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414" ], [ "1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19", "aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd" ], [ "146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be", "b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0" ], [ "fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9", "6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811" ], [ "da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2", "8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1" ], [ "a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13", "7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c" ], [ "174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c", "ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73" ], [ "959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba", "2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd" ], [ "d2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151", "e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405" ], [ "64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073", "d99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589" ], [ "8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458", "38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e" ], [ "13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b", "69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27" ], [ "bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366", "d3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1" ], [ "8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa", "40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482" ], [ "8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0", "620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945" ], [ "dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787", "7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573" ], [ "f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e", "ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82" ] ]
      },
      naf: {
        wnd: 7,
        points: [ [ "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9", "388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672" ], [ "2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4", "d8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6" ], [ "5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc", "6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da" ], [ "acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe", "cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37" ], [ "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb", "d984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b" ], [ "f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8", "ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81" ], [ "d7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e", "581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58" ], [ "defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34", "4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77" ], [ "2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c", "85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a" ], [ "352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5", "321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c" ], [ "2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f", "2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67" ], [ "9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714", "73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402" ], [ "daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729", "a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55" ], [ "c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db", "2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482" ], [ "6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4", "e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82" ], [ "1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5", "b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396" ], [ "605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479", "2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49" ], [ "62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d", "80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf" ], [ "80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f", "1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a" ], [ "7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb", "d0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7" ], [ "d528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9", "eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933" ], [ "49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963", "758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a" ], [ "77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74", "958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6" ], [ "f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530", "e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37" ], [ "463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b", "5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e" ], [ "f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247", "cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6" ], [ "caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1", "cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476" ], [ "2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120", "4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40" ], [ "7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435", "91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61" ], [ "754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18", "673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683" ], [ "e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8", "59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5" ], [ "186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb", "3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b" ], [ "df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f", "55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417" ], [ "5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143", "efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868" ], [ "290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba", "e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a" ], [ "af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45", "f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6" ], [ "766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a", "744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996" ], [ "59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e", "c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e" ], [ "f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8", "e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d" ], [ "7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c", "30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2" ], [ "948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519", "e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e" ], [ "7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab", "100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437" ], [ "3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca", "ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311" ], [ "d3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf", "8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4" ], [ "1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610", "68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575" ], [ "733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4", "f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d" ], [ "15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c", "d56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d" ], [ "a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940", "edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629" ], [ "e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980", "a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06" ], [ "311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3", "66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374" ], [ "34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf", "9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee" ], [ "f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63", "4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1" ], [ "d7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448", "fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b" ], [ "32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf", "5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661" ], [ "7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5", "8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6" ], [ "ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6", "8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e" ], [ "16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5", "5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d" ], [ "eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99", "f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc" ], [ "78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51", "f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4" ], [ "494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5", "42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c" ], [ "a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5", "204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b" ], [ "c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997", "4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913" ], [ "841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881", "73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154" ], [ "5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5", "39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865" ], [ "36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66", "d2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc" ], [ "336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726", "ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224" ], [ "8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede", "6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e" ], [ "1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94", "60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6" ], [ "85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31", "3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511" ], [ "29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51", "b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b" ], [ "a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252", "ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2" ], [ "4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5", "cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c" ], [ "d24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b", "6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3" ], [ "ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4", "322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d" ], [ "af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f", "6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700" ], [ "e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889", "2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4" ], [ "591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246", "b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196" ], [ "11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984", "998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4" ], [ "3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a", "b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257" ], [ "cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030", "bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13" ], [ "c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197", "6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096" ], [ "c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593", "c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38" ], [ "a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef", "21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f" ], [ "347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38", "60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448" ], [ "da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a", "49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a" ], [ "c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111", "5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4" ], [ "4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502", "7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437" ], [ "3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea", "be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7" ], [ "cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26", "8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d" ], [ "b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986", "39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a" ], [ "d4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e", "62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54" ], [ "48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4", "25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77" ], [ "dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda", "ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517" ], [ "6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859", "cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10" ], [ "e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f", "f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125" ], [ "eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c", "6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e" ], [ "13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942", "fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1" ], [ "ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a", "1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2" ], [ "b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80", "5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423" ], [ "ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d", "438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8" ], [ "8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1", "cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758" ], [ "52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63", "c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375" ], [ "e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352", "6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d" ], [ "7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193", "ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec" ], [ "5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00", "9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0" ], [ "32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58", "ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c" ], [ "e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7", "d3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4" ], [ "8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8", "c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f" ], [ "4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e", "67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649" ], [ "3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d", "cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826" ], [ "674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b", "299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5" ], [ "d32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f", "f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87" ], [ "30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6", "462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b" ], [ "be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297", "62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc" ], [ "93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a", "7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c" ], [ "b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c", "ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f" ], [ "d5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52", "4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a" ], [ "d3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb", "bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46" ], [ "463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065", "bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f" ], [ "7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917", "603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03" ], [ "74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9", "cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08" ], [ "30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3", "553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8" ], [ "9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57", "712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373" ], [ "176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66", "ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3" ], [ "75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8", "9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8" ], [ "809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721", "9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1" ], [ "1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180", "4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9" ] ]
      }
    };
  }, {} ],
  81: [ function(require, module, exports) {
    "use strict";
    var utils = exports;
    var BN = require("bn.js");
    var minAssert = require("minimalistic-assert");
    var minUtils = require("minimalistic-crypto-utils");
    utils.assert = minAssert;
    utils.toArray = minUtils.toArray;
    utils.zero2 = minUtils.zero2;
    utils.toHex = minUtils.toHex;
    utils.encode = minUtils.encode;
    function getNAF(num, w, bits) {
      var naf = new Array(Math.max(num.bitLength(), bits) + 1);
      naf.fill(0);
      var ws = 1 << w + 1;
      var k = num.clone();
      for (var i = 0; i < naf.length; i++) {
        var z;
        var mod = k.andln(ws - 1);
        if (k.isOdd()) {
          z = mod > (ws >> 1) - 1 ? (ws >> 1) - mod : mod;
          k.isubn(z);
        } else z = 0;
        naf[i] = z;
        k.iushrn(1);
      }
      return naf;
    }
    utils.getNAF = getNAF;
    function getJSF(k1, k2) {
      var jsf = [ [], [] ];
      k1 = k1.clone();
      k2 = k2.clone();
      var d1 = 0;
      var d2 = 0;
      while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
        var m14 = k1.andln(3) + d1 & 3;
        var m24 = k2.andln(3) + d2 & 3;
        3 === m14 && (m14 = -1);
        3 === m24 && (m24 = -1);
        var u1;
        if (0 === (1 & m14)) u1 = 0; else {
          var m8 = k1.andln(7) + d1 & 7;
          u1 = 3 !== m8 && 5 !== m8 || 2 !== m24 ? m14 : -m14;
        }
        jsf[0].push(u1);
        var u2;
        if (0 === (1 & m24)) u2 = 0; else {
          var m8 = k2.andln(7) + d2 & 7;
          u2 = 3 !== m8 && 5 !== m8 || 2 !== m14 ? m24 : -m24;
        }
        jsf[1].push(u2);
        2 * d1 === u1 + 1 && (d1 = 1 - d1);
        2 * d2 === u2 + 1 && (d2 = 1 - d2);
        k1.iushrn(1);
        k2.iushrn(1);
      }
      return jsf;
    }
    utils.getJSF = getJSF;
    function cachedProperty(obj, name, computer) {
      var key = "_" + name;
      obj.prototype[name] = function cachedProperty() {
        return void 0 !== this[key] ? this[key] : this[key] = computer.call(this);
      };
    }
    utils.cachedProperty = cachedProperty;
    function parseBytes(bytes) {
      return "string" === typeof bytes ? utils.toArray(bytes, "hex") : bytes;
    }
    utils.parseBytes = parseBytes;
    function intFromLE(bytes) {
      return new BN(bytes, "hex", "le");
    }
    utils.intFromLE = intFromLE;
  }, {
    "bn.js": 16,
    "minimalistic-assert": 105,
    "minimalistic-crypto-utils": 106
  } ],
  82: [ function(require, module, exports) {
    module.exports = {
      _from: "elliptic@^6.0.0",
      _id: "elliptic@6.5.2",
      _inBundle: false,
      _integrity: "sha1-BcVnjXFzwEnYykM1UiJKSV0ON2I=",
      _location: "/elliptic",
      _phantomChildren: {},
      _requested: {
        type: "range",
        registry: true,
        raw: "elliptic@^6.0.0",
        name: "elliptic",
        escapedName: "elliptic",
        rawSpec: "^6.0.0",
        saveSpec: null,
        fetchSpec: "^6.0.0"
      },
      _requiredBy: [ "/browserify-sign", "/create-ecdh" ],
      _resolved: "https://registry.npm.taobao.org/elliptic/download/elliptic-6.5.2.tgz",
      _shasum: "05c5678d7173c049d8ca433552224a495d0e3762",
      _spec: "elliptic@^6.0.0",
      _where: "/Users/nantas/fireball-x/fireball_2.2.0-release/dist/CocosCreator.app/Contents/Resources/app/node_modules/browserify-sign",
      author: {
        name: "Fedor Indutny",
        email: "fedor@indutny.com"
      },
      bugs: {
        url: "https://github.com/indutny/elliptic/issues"
      },
      bundleDependencies: false,
      dependencies: {
        "bn.js": "^4.4.0",
        brorand: "^1.0.1",
        "hash.js": "^1.0.0",
        "hmac-drbg": "^1.0.0",
        inherits: "^2.0.1",
        "minimalistic-assert": "^1.0.0",
        "minimalistic-crypto-utils": "^1.0.0"
      },
      deprecated: false,
      description: "EC cryptography",
      devDependencies: {
        brfs: "^1.4.3",
        coveralls: "^3.0.8",
        grunt: "^1.0.4",
        "grunt-browserify": "^5.0.0",
        "grunt-cli": "^1.2.0",
        "grunt-contrib-connect": "^1.0.0",
        "grunt-contrib-copy": "^1.0.0",
        "grunt-contrib-uglify": "^1.0.1",
        "grunt-mocha-istanbul": "^3.0.1",
        "grunt-saucelabs": "^9.0.1",
        istanbul: "^0.4.2",
        jscs: "^3.0.7",
        jshint: "^2.10.3",
        mocha: "^6.2.2"
      },
      files: [ "lib" ],
      homepage: "https://github.com/indutny/elliptic",
      keywords: [ "EC", "Elliptic", "curve", "Cryptography" ],
      license: "MIT",
      main: "lib/elliptic.js",
      name: "elliptic",
      repository: {
        type: "git",
        url: "git+ssh://git@github.com/indutny/elliptic.git"
      },
      scripts: {
        jscs: "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
        jshint: "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
        lint: "npm run jscs && npm run jshint",
        test: "npm run lint && npm run unit",
        unit: "istanbul test _mocha --reporter=spec test/index.js",
        version: "grunt dist && git add dist/"
      },
      version: "6.5.2"
    };
  }, {} ],
  83: [ function(require, module, exports) {
    function EventEmitter() {
      this._events = this._events || {};
      this._maxListeners = this._maxListeners || void 0;
    }
    module.exports = EventEmitter;
    EventEmitter.EventEmitter = EventEmitter;
    EventEmitter.prototype._events = void 0;
    EventEmitter.prototype._maxListeners = void 0;
    EventEmitter.defaultMaxListeners = 10;
    EventEmitter.prototype.setMaxListeners = function(n) {
      if (!isNumber(n) || n < 0 || isNaN(n)) throw TypeError("n must be a positive number");
      this._maxListeners = n;
      return this;
    };
    EventEmitter.prototype.emit = function(type) {
      var er, handler, len, args, i, listeners;
      this._events || (this._events = {});
      if ("error" === type && (!this._events.error || isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) throw er;
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ")");
        err.context = er;
        throw err;
      }
      handler = this._events[type];
      if (isUndefined(handler)) return false;
      if (isFunction(handler)) switch (arguments.length) {
       case 1:
        handler.call(this);
        break;

       case 2:
        handler.call(this, arguments[1]);
        break;

       case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;

       default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
      } else if (isObject(handler)) {
        args = Array.prototype.slice.call(arguments, 1);
        listeners = handler.slice();
        len = listeners.length;
        for (i = 0; i < len; i++) listeners[i].apply(this, args);
      }
      return true;
    };
    EventEmitter.prototype.addListener = function(type, listener) {
      var m;
      if (!isFunction(listener)) throw TypeError("listener must be a function");
      this._events || (this._events = {});
      this._events.newListener && this.emit("newListener", type, isFunction(listener.listener) ? listener.listener : listener);
      this._events[type] ? isObject(this._events[type]) ? this._events[type].push(listener) : this._events[type] = [ this._events[type], listener ] : this._events[type] = listener;
      if (isObject(this._events[type]) && !this._events[type].warned) {
        m = isUndefined(this._maxListeners) ? EventEmitter.defaultMaxListeners : this._maxListeners;
        if (m && m > 0 && this._events[type].length > m) {
          this._events[type].warned = true;
          console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[type].length);
          "function" === typeof console.trace && console.trace();
        }
      }
      return this;
    };
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;
    EventEmitter.prototype.once = function(type, listener) {
      if (!isFunction(listener)) throw TypeError("listener must be a function");
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
    EventEmitter.prototype.removeListener = function(type, listener) {
      var list, position, length, i;
      if (!isFunction(listener)) throw TypeError("listener must be a function");
      if (!this._events || !this._events[type]) return this;
      list = this._events[type];
      length = list.length;
      position = -1;
      if (list === listener || isFunction(list.listener) && list.listener === listener) {
        delete this._events[type];
        this._events.removeListener && this.emit("removeListener", type, listener);
      } else if (isObject(list)) {
        for (i = length; i-- > 0; ) if (list[i] === listener || list[i].listener && list[i].listener === listener) {
          position = i;
          break;
        }
        if (position < 0) return this;
        if (1 === list.length) {
          list.length = 0;
          delete this._events[type];
        } else list.splice(position, 1);
        this._events.removeListener && this.emit("removeListener", type, listener);
      }
      return this;
    };
    EventEmitter.prototype.removeAllListeners = function(type) {
      var key, listeners;
      if (!this._events) return this;
      if (!this._events.removeListener) {
        0 === arguments.length ? this._events = {} : this._events[type] && delete this._events[type];
        return this;
      }
      if (0 === arguments.length) {
        for (key in this._events) {
          if ("removeListener" === key) continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners("removeListener");
        this._events = {};
        return this;
      }
      listeners = this._events[type];
      if (isFunction(listeners)) this.removeListener(type, listeners); else if (listeners) while (listeners.length) this.removeListener(type, listeners[listeners.length - 1]);
      delete this._events[type];
      return this;
    };
    EventEmitter.prototype.listeners = function(type) {
      var ret;
      ret = this._events && this._events[type] ? isFunction(this._events[type]) ? [ this._events[type] ] : this._events[type].slice() : [];
      return ret;
    };
    EventEmitter.prototype.listenerCount = function(type) {
      if (this._events) {
        var evlistener = this._events[type];
        if (isFunction(evlistener)) return 1;
        if (evlistener) return evlistener.length;
      }
      return 0;
    };
    EventEmitter.listenerCount = function(emitter, type) {
      return emitter.listenerCount(type);
    };
    function isFunction(arg) {
      return "function" === typeof arg;
    }
    function isNumber(arg) {
      return "number" === typeof arg;
    }
    function isObject(arg) {
      return "object" === typeof arg && null !== arg;
    }
    function isUndefined(arg) {
      return void 0 === arg;
    }
  }, {} ],
  84: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    var MD5 = require("md5.js");
    function EVP_BytesToKey(password, salt, keyBits, ivLen) {
      Buffer.isBuffer(password) || (password = Buffer.from(password, "binary"));
      if (salt) {
        Buffer.isBuffer(salt) || (salt = Buffer.from(salt, "binary"));
        if (8 !== salt.length) throw new RangeError("salt should be Buffer with 8 byte length");
      }
      var keyLen = keyBits / 8;
      var key = Buffer.alloc(keyLen);
      var iv = Buffer.alloc(ivLen || 0);
      var tmp = Buffer.alloc(0);
      while (keyLen > 0 || ivLen > 0) {
        var hash = new MD5();
        hash.update(tmp);
        hash.update(password);
        salt && hash.update(salt);
        tmp = hash.digest();
        var used = 0;
        if (keyLen > 0) {
          var keyStart = key.length - keyLen;
          used = Math.min(keyLen, tmp.length);
          tmp.copy(key, keyStart, 0, used);
          keyLen -= used;
        }
        if (used < tmp.length && ivLen > 0) {
          var ivStart = iv.length - ivLen;
          var length = Math.min(ivLen, tmp.length - used);
          tmp.copy(iv, ivStart, used, used + length);
          ivLen -= length;
        }
      }
      tmp.fill(0);
      return {
        key: key,
        iv: iv
      };
    }
    module.exports = EVP_BytesToKey;
  }, {
    "md5.js": 103,
    "safe-buffer": 143
  } ],
  85: [ function(require, module, exports) {
    "use strict";
    var Buffer = require("safe-buffer").Buffer;
    var Transform = require("stream").Transform;
    var inherits = require("inherits");
    function throwIfNotStringOrBuffer(val, prefix) {
      if (!Buffer.isBuffer(val) && "string" !== typeof val) throw new TypeError(prefix + " must be a string or a buffer");
    }
    function HashBase(blockSize) {
      Transform.call(this);
      this._block = Buffer.allocUnsafe(blockSize);
      this._blockSize = blockSize;
      this._blockOffset = 0;
      this._length = [ 0, 0, 0, 0 ];
      this._finalized = false;
    }
    inherits(HashBase, Transform);
    HashBase.prototype._transform = function(chunk, encoding, callback) {
      var error = null;
      try {
        this.update(chunk, encoding);
      } catch (err) {
        error = err;
      }
      callback(error);
    };
    HashBase.prototype._flush = function(callback) {
      var error = null;
      try {
        this.push(this.digest());
      } catch (err) {
        error = err;
      }
      callback(error);
    };
    HashBase.prototype.update = function(data, encoding) {
      throwIfNotStringOrBuffer(data, "Data");
      if (this._finalized) throw new Error("Digest already called");
      Buffer.isBuffer(data) || (data = Buffer.from(data, encoding));
      var block = this._block;
      var offset = 0;
      while (this._blockOffset + data.length - offset >= this._blockSize) {
        for (var i = this._blockOffset; i < this._blockSize; ) block[i++] = data[offset++];
        this._update();
        this._blockOffset = 0;
      }
      while (offset < data.length) block[this._blockOffset++] = data[offset++];
      for (var j = 0, carry = 8 * data.length; carry > 0; ++j) {
        this._length[j] += carry;
        carry = this._length[j] / 4294967296 | 0;
        carry > 0 && (this._length[j] -= 4294967296 * carry);
      }
      return this;
    };
    HashBase.prototype._update = function() {
      throw new Error("_update is not implemented");
    };
    HashBase.prototype.digest = function(encoding) {
      if (this._finalized) throw new Error("Digest already called");
      this._finalized = true;
      var digest = this._digest();
      void 0 !== encoding && (digest = digest.toString(encoding));
      this._block.fill(0);
      this._blockOffset = 0;
      for (var i = 0; i < 4; ++i) this._length[i] = 0;
      return digest;
    };
    HashBase.prototype._digest = function() {
      throw new Error("_digest is not implemented");
    };
    module.exports = HashBase;
  }, {
    inherits: 101,
    "safe-buffer": 143,
    stream: 152
  } ],
  86: [ function(require, module, exports) {
    var hash = exports;
    hash.utils = require("./hash/utils");
    hash.common = require("./hash/common");
    hash.sha = require("./hash/sha");
    hash.ripemd = require("./hash/ripemd");
    hash.hmac = require("./hash/hmac");
    hash.sha1 = hash.sha.sha1;
    hash.sha256 = hash.sha.sha256;
    hash.sha224 = hash.sha.sha224;
    hash.sha384 = hash.sha.sha384;
    hash.sha512 = hash.sha.sha512;
    hash.ripemd160 = hash.ripemd.ripemd160;
  }, {
    "./hash/common": 87,
    "./hash/hmac": 88,
    "./hash/ripemd": 89,
    "./hash/sha": 90,
    "./hash/utils": 97
  } ],
  87: [ function(require, module, exports) {
    "use strict";
    var utils = require("./utils");
    var assert = require("minimalistic-assert");
    function BlockHash() {
      this.pending = null;
      this.pendingTotal = 0;
      this.blockSize = this.constructor.blockSize;
      this.outSize = this.constructor.outSize;
      this.hmacStrength = this.constructor.hmacStrength;
      this.padLength = this.constructor.padLength / 8;
      this.endian = "big";
      this._delta8 = this.blockSize / 8;
      this._delta32 = this.blockSize / 32;
    }
    exports.BlockHash = BlockHash;
    BlockHash.prototype.update = function update(msg, enc) {
      msg = utils.toArray(msg, enc);
      this.pending ? this.pending = this.pending.concat(msg) : this.pending = msg;
      this.pendingTotal += msg.length;
      if (this.pending.length >= this._delta8) {
        msg = this.pending;
        var r = msg.length % this._delta8;
        this.pending = msg.slice(msg.length - r, msg.length);
        0 === this.pending.length && (this.pending = null);
        msg = utils.join32(msg, 0, msg.length - r, this.endian);
        for (var i = 0; i < msg.length; i += this._delta32) this._update(msg, i, i + this._delta32);
      }
      return this;
    };
    BlockHash.prototype.digest = function digest(enc) {
      this.update(this._pad());
      assert(null === this.pending);
      return this._digest(enc);
    };
    BlockHash.prototype._pad = function pad() {
      var len = this.pendingTotal;
      var bytes = this._delta8;
      var k = bytes - (len + this.padLength) % bytes;
      var res = new Array(k + this.padLength);
      res[0] = 128;
      for (var i = 1; i < k; i++) res[i] = 0;
      len <<= 3;
      if ("big" === this.endian) {
        for (var t = 8; t < this.padLength; t++) res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = len >>> 24 & 255;
        res[i++] = len >>> 16 & 255;
        res[i++] = len >>> 8 & 255;
        res[i++] = 255 & len;
      } else {
        res[i++] = 255 & len;
        res[i++] = len >>> 8 & 255;
        res[i++] = len >>> 16 & 255;
        res[i++] = len >>> 24 & 255;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        for (t = 8; t < this.padLength; t++) res[i++] = 0;
      }
      return res;
    };
  }, {
    "./utils": 97,
    "minimalistic-assert": 105
  } ],
  88: [ function(require, module, exports) {
    "use strict";
    var utils = require("./utils");
    var assert = require("minimalistic-assert");
    function Hmac(hash, key, enc) {
      if (!(this instanceof Hmac)) return new Hmac(hash, key, enc);
      this.Hash = hash;
      this.blockSize = hash.blockSize / 8;
      this.outSize = hash.outSize / 8;
      this.inner = null;
      this.outer = null;
      this._init(utils.toArray(key, enc));
    }
    module.exports = Hmac;
    Hmac.prototype._init = function init(key) {
      key.length > this.blockSize && (key = new this.Hash().update(key).digest());
      assert(key.length <= this.blockSize);
      for (var i = key.length; i < this.blockSize; i++) key.push(0);
      for (i = 0; i < key.length; i++) key[i] ^= 54;
      this.inner = new this.Hash().update(key);
      for (i = 0; i < key.length; i++) key[i] ^= 106;
      this.outer = new this.Hash().update(key);
    };
    Hmac.prototype.update = function update(msg, enc) {
      this.inner.update(msg, enc);
      return this;
    };
    Hmac.prototype.digest = function digest(enc) {
      this.outer.update(this.inner.digest());
      return this.outer.digest(enc);
    };
  }, {
    "./utils": 97,
    "minimalistic-assert": 105
  } ],
  89: [ function(require, module, exports) {
    "use strict";
    var utils = require("./utils");
    var common = require("./common");
    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_3 = utils.sum32_3;
    var sum32_4 = utils.sum32_4;
    var BlockHash = common.BlockHash;
    function RIPEMD160() {
      if (!(this instanceof RIPEMD160)) return new RIPEMD160();
      BlockHash.call(this);
      this.h = [ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ];
      this.endian = "little";
    }
    utils.inherits(RIPEMD160, BlockHash);
    exports.ripemd160 = RIPEMD160;
    RIPEMD160.blockSize = 512;
    RIPEMD160.outSize = 160;
    RIPEMD160.hmacStrength = 192;
    RIPEMD160.padLength = 64;
    RIPEMD160.prototype._update = function update(msg, start) {
      var A = this.h[0];
      var B = this.h[1];
      var C = this.h[2];
      var D = this.h[3];
      var E = this.h[4];
      var Ah = A;
      var Bh = B;
      var Ch = C;
      var Dh = D;
      var Eh = E;
      for (var j = 0; j < 80; j++) {
        var T = sum32(rotl32(sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)), s[j]), E);
        A = E;
        E = D;
        D = rotl32(C, 10);
        C = B;
        B = T;
        T = sum32(rotl32(sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)), sh[j]), Eh);
        Ah = Eh;
        Eh = Dh;
        Dh = rotl32(Ch, 10);
        Ch = Bh;
        Bh = T;
      }
      T = sum32_3(this.h[1], C, Dh);
      this.h[1] = sum32_3(this.h[2], D, Eh);
      this.h[2] = sum32_3(this.h[3], E, Ah);
      this.h[3] = sum32_3(this.h[4], A, Bh);
      this.h[4] = sum32_3(this.h[0], B, Ch);
      this.h[0] = T;
    };
    RIPEMD160.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h, "little") : utils.split32(this.h, "little");
    };
    function f(j, x, y, z) {
      return j <= 15 ? x ^ y ^ z : j <= 31 ? x & y | ~x & z : j <= 47 ? (x | ~y) ^ z : j <= 63 ? x & z | y & ~z : x ^ (y | ~z);
    }
    function K(j) {
      return j <= 15 ? 0 : j <= 31 ? 1518500249 : j <= 47 ? 1859775393 : j <= 63 ? 2400959708 : 2840853838;
    }
    function Kh(j) {
      return j <= 15 ? 1352829926 : j <= 31 ? 1548603684 : j <= 47 ? 1836072691 : j <= 63 ? 2053994217 : 0;
    }
    var r = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13 ];
    var rh = [ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11 ];
    var s = [ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6 ];
    var sh = [ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ];
  }, {
    "./common": 87,
    "./utils": 97
  } ],
  90: [ function(require, module, exports) {
    "use strict";
    exports.sha1 = require("./sha/1");
    exports.sha224 = require("./sha/224");
    exports.sha256 = require("./sha/256");
    exports.sha384 = require("./sha/384");
    exports.sha512 = require("./sha/512");
  }, {
    "./sha/1": 91,
    "./sha/224": 92,
    "./sha/256": 93,
    "./sha/384": 94,
    "./sha/512": 95
  } ],
  91: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var common = require("../common");
    var shaCommon = require("./common");
    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_5 = utils.sum32_5;
    var ft_1 = shaCommon.ft_1;
    var BlockHash = common.BlockHash;
    var sha1_K = [ 1518500249, 1859775393, 2400959708, 3395469782 ];
    function SHA1() {
      if (!(this instanceof SHA1)) return new SHA1();
      BlockHash.call(this);
      this.h = [ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ];
      this.W = new Array(80);
    }
    utils.inherits(SHA1, BlockHash);
    module.exports = SHA1;
    SHA1.blockSize = 512;
    SHA1.outSize = 160;
    SHA1.hmacStrength = 80;
    SHA1.padLength = 64;
    SHA1.prototype._update = function _update(msg, start) {
      var W = this.W;
      for (var i = 0; i < 16; i++) W[i] = msg[start + i];
      for (;i < W.length; i++) W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];
      for (i = 0; i < W.length; i++) {
        var s = ~~(i / 20);
        var t = sum32_5(rotl32(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
        e = d;
        d = c;
        c = rotl32(b, 30);
        b = a;
        a = t;
      }
      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
    };
    SHA1.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h, "big") : utils.split32(this.h, "big");
    };
  }, {
    "../common": 87,
    "../utils": 97,
    "./common": 96
  } ],
  92: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var SHA256 = require("./256");
    function SHA224() {
      if (!(this instanceof SHA224)) return new SHA224();
      SHA256.call(this);
      this.h = [ 3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428 ];
    }
    utils.inherits(SHA224, SHA256);
    module.exports = SHA224;
    SHA224.blockSize = 512;
    SHA224.outSize = 224;
    SHA224.hmacStrength = 192;
    SHA224.padLength = 64;
    SHA224.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h.slice(0, 7), "big") : utils.split32(this.h.slice(0, 7), "big");
    };
  }, {
    "../utils": 97,
    "./256": 93
  } ],
  93: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var common = require("../common");
    var shaCommon = require("./common");
    var assert = require("minimalistic-assert");
    var sum32 = utils.sum32;
    var sum32_4 = utils.sum32_4;
    var sum32_5 = utils.sum32_5;
    var ch32 = shaCommon.ch32;
    var maj32 = shaCommon.maj32;
    var s0_256 = shaCommon.s0_256;
    var s1_256 = shaCommon.s1_256;
    var g0_256 = shaCommon.g0_256;
    var g1_256 = shaCommon.g1_256;
    var BlockHash = common.BlockHash;
    var sha256_K = [ 1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298 ];
    function SHA256() {
      if (!(this instanceof SHA256)) return new SHA256();
      BlockHash.call(this);
      this.h = [ 1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225 ];
      this.k = sha256_K;
      this.W = new Array(64);
    }
    utils.inherits(SHA256, BlockHash);
    module.exports = SHA256;
    SHA256.blockSize = 512;
    SHA256.outSize = 256;
    SHA256.hmacStrength = 192;
    SHA256.padLength = 64;
    SHA256.prototype._update = function _update(msg, start) {
      var W = this.W;
      for (var i = 0; i < 16; i++) W[i] = msg[start + i];
      for (;i < W.length; i++) W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);
      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];
      var f = this.h[5];
      var g = this.h[6];
      var h = this.h[7];
      assert(this.k.length === W.length);
      for (i = 0; i < W.length; i++) {
        var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
        var T2 = sum32(s0_256(a), maj32(a, b, c));
        h = g;
        g = f;
        f = e;
        e = sum32(d, T1);
        d = c;
        c = b;
        b = a;
        a = sum32(T1, T2);
      }
      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
      this.h[5] = sum32(this.h[5], f);
      this.h[6] = sum32(this.h[6], g);
      this.h[7] = sum32(this.h[7], h);
    };
    SHA256.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h, "big") : utils.split32(this.h, "big");
    };
  }, {
    "../common": 87,
    "../utils": 97,
    "./common": 96,
    "minimalistic-assert": 105
  } ],
  94: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var SHA512 = require("./512");
    function SHA384() {
      if (!(this instanceof SHA384)) return new SHA384();
      SHA512.call(this);
      this.h = [ 3418070365, 3238371032, 1654270250, 914150663, 2438529370, 812702999, 355462360, 4144912697, 1731405415, 4290775857, 2394180231, 1750603025, 3675008525, 1694076839, 1203062813, 3204075428 ];
    }
    utils.inherits(SHA384, SHA512);
    module.exports = SHA384;
    SHA384.blockSize = 1024;
    SHA384.outSize = 384;
    SHA384.hmacStrength = 192;
    SHA384.padLength = 128;
    SHA384.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h.slice(0, 12), "big") : utils.split32(this.h.slice(0, 12), "big");
    };
  }, {
    "../utils": 97,
    "./512": 95
  } ],
  95: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var common = require("../common");
    var assert = require("minimalistic-assert");
    var rotr64_hi = utils.rotr64_hi;
    var rotr64_lo = utils.rotr64_lo;
    var shr64_hi = utils.shr64_hi;
    var shr64_lo = utils.shr64_lo;
    var sum64 = utils.sum64;
    var sum64_hi = utils.sum64_hi;
    var sum64_lo = utils.sum64_lo;
    var sum64_4_hi = utils.sum64_4_hi;
    var sum64_4_lo = utils.sum64_4_lo;
    var sum64_5_hi = utils.sum64_5_hi;
    var sum64_5_lo = utils.sum64_5_lo;
    var BlockHash = common.BlockHash;
    var sha512_K = [ 1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591 ];
    function SHA512() {
      if (!(this instanceof SHA512)) return new SHA512();
      BlockHash.call(this);
      this.h = [ 1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762, 1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547, 1541459225, 327033209 ];
      this.k = sha512_K;
      this.W = new Array(160);
    }
    utils.inherits(SHA512, BlockHash);
    module.exports = SHA512;
    SHA512.blockSize = 1024;
    SHA512.outSize = 512;
    SHA512.hmacStrength = 192;
    SHA512.padLength = 128;
    SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
      var W = this.W;
      for (var i = 0; i < 32; i++) W[i] = msg[start + i];
      for (;i < W.length; i += 2) {
        var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);
        var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
        var c1_hi = W[i - 14];
        var c1_lo = W[i - 13];
        var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);
        var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
        var c3_hi = W[i - 32];
        var c3_lo = W[i - 31];
        W[i] = sum64_4_hi(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo);
        W[i + 1] = sum64_4_lo(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo);
      }
    };
    SHA512.prototype._update = function _update(msg, start) {
      this._prepareBlock(msg, start);
      var W = this.W;
      var ah = this.h[0];
      var al = this.h[1];
      var bh = this.h[2];
      var bl = this.h[3];
      var ch = this.h[4];
      var cl = this.h[5];
      var dh = this.h[6];
      var dl = this.h[7];
      var eh = this.h[8];
      var el = this.h[9];
      var fh = this.h[10];
      var fl = this.h[11];
      var gh = this.h[12];
      var gl = this.h[13];
      var hh = this.h[14];
      var hl = this.h[15];
      assert(this.k.length === W.length);
      for (var i = 0; i < W.length; i += 2) {
        var c0_hi = hh;
        var c0_lo = hl;
        var c1_hi = s1_512_hi(eh, el);
        var c1_lo = s1_512_lo(eh, el);
        var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
        var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
        var c3_hi = this.k[i];
        var c3_lo = this.k[i + 1];
        var c4_hi = W[i];
        var c4_lo = W[i + 1];
        var T1_hi = sum64_5_hi(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
        var T1_lo = sum64_5_lo(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
        c0_hi = s0_512_hi(ah, al);
        c0_lo = s0_512_lo(ah, al);
        c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
        c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);
        var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
        var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);
        hh = gh;
        hl = gl;
        gh = fh;
        gl = fl;
        fh = eh;
        fl = el;
        eh = sum64_hi(dh, dl, T1_hi, T1_lo);
        el = sum64_lo(dl, dl, T1_hi, T1_lo);
        dh = ch;
        dl = cl;
        ch = bh;
        cl = bl;
        bh = ah;
        bl = al;
        ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
        al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
      }
      sum64(this.h, 0, ah, al);
      sum64(this.h, 2, bh, bl);
      sum64(this.h, 4, ch, cl);
      sum64(this.h, 6, dh, dl);
      sum64(this.h, 8, eh, el);
      sum64(this.h, 10, fh, fl);
      sum64(this.h, 12, gh, gl);
      sum64(this.h, 14, hh, hl);
    };
    SHA512.prototype._digest = function digest(enc) {
      return "hex" === enc ? utils.toHex32(this.h, "big") : utils.split32(this.h, "big");
    };
    function ch64_hi(xh, xl, yh, yl, zh) {
      var r = xh & yh ^ ~xh & zh;
      r < 0 && (r += 4294967296);
      return r;
    }
    function ch64_lo(xh, xl, yh, yl, zh, zl) {
      var r = xl & yl ^ ~xl & zl;
      r < 0 && (r += 4294967296);
      return r;
    }
    function maj64_hi(xh, xl, yh, yl, zh) {
      var r = xh & yh ^ xh & zh ^ yh & zh;
      r < 0 && (r += 4294967296);
      return r;
    }
    function maj64_lo(xh, xl, yh, yl, zh, zl) {
      var r = xl & yl ^ xl & zl ^ yl & zl;
      r < 0 && (r += 4294967296);
      return r;
    }
    function s0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 28);
      var c1_hi = rotr64_hi(xl, xh, 2);
      var c2_hi = rotr64_hi(xl, xh, 7);
      var r = c0_hi ^ c1_hi ^ c2_hi;
      r < 0 && (r += 4294967296);
      return r;
    }
    function s0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 28);
      var c1_lo = rotr64_lo(xl, xh, 2);
      var c2_lo = rotr64_lo(xl, xh, 7);
      var r = c0_lo ^ c1_lo ^ c2_lo;
      r < 0 && (r += 4294967296);
      return r;
    }
    function s1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 14);
      var c1_hi = rotr64_hi(xh, xl, 18);
      var c2_hi = rotr64_hi(xl, xh, 9);
      var r = c0_hi ^ c1_hi ^ c2_hi;
      r < 0 && (r += 4294967296);
      return r;
    }
    function s1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 14);
      var c1_lo = rotr64_lo(xh, xl, 18);
      var c2_lo = rotr64_lo(xl, xh, 9);
      var r = c0_lo ^ c1_lo ^ c2_lo;
      r < 0 && (r += 4294967296);
      return r;
    }
    function g0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 1);
      var c1_hi = rotr64_hi(xh, xl, 8);
      var c2_hi = shr64_hi(xh, xl, 7);
      var r = c0_hi ^ c1_hi ^ c2_hi;
      r < 0 && (r += 4294967296);
      return r;
    }
    function g0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 1);
      var c1_lo = rotr64_lo(xh, xl, 8);
      var c2_lo = shr64_lo(xh, xl, 7);
      var r = c0_lo ^ c1_lo ^ c2_lo;
      r < 0 && (r += 4294967296);
      return r;
    }
    function g1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 19);
      var c1_hi = rotr64_hi(xl, xh, 29);
      var c2_hi = shr64_hi(xh, xl, 6);
      var r = c0_hi ^ c1_hi ^ c2_hi;
      r < 0 && (r += 4294967296);
      return r;
    }
    function g1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 19);
      var c1_lo = rotr64_lo(xl, xh, 29);
      var c2_lo = shr64_lo(xh, xl, 6);
      var r = c0_lo ^ c1_lo ^ c2_lo;
      r < 0 && (r += 4294967296);
      return r;
    }
  }, {
    "../common": 87,
    "../utils": 97,
    "minimalistic-assert": 105
  } ],
  96: [ function(require, module, exports) {
    "use strict";
    var utils = require("../utils");
    var rotr32 = utils.rotr32;
    function ft_1(s, x, y, z) {
      if (0 === s) return ch32(x, y, z);
      if (1 === s || 3 === s) return p32(x, y, z);
      if (2 === s) return maj32(x, y, z);
    }
    exports.ft_1 = ft_1;
    function ch32(x, y, z) {
      return x & y ^ ~x & z;
    }
    exports.ch32 = ch32;
    function maj32(x, y, z) {
      return x & y ^ x & z ^ y & z;
    }
    exports.maj32 = maj32;
    function p32(x, y, z) {
      return x ^ y ^ z;
    }
    exports.p32 = p32;
    function s0_256(x) {
      return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
    }
    exports.s0_256 = s0_256;
    function s1_256(x) {
      return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
    }
    exports.s1_256 = s1_256;
    function g0_256(x) {
      return rotr32(x, 7) ^ rotr32(x, 18) ^ x >>> 3;
    }
    exports.g0_256 = g0_256;
    function g1_256(x) {
      return rotr32(x, 17) ^ rotr32(x, 19) ^ x >>> 10;
    }
    exports.g1_256 = g1_256;
  }, {
    "../utils": 97
  } ],
  97: [ function(require, module, exports) {
    "use strict";
    var assert = require("minimalistic-assert");
    var inherits = require("inherits");
    exports.inherits = inherits;
    function isSurrogatePair(msg, i) {
      if (55296 !== (64512 & msg.charCodeAt(i))) return false;
      if (i < 0 || i + 1 >= msg.length) return false;
      return 56320 === (64512 & msg.charCodeAt(i + 1));
    }
    function toArray(msg, enc) {
      if (Array.isArray(msg)) return msg.slice();
      if (!msg) return [];
      var res = [];
      if ("string" === typeof msg) if (enc) {
        if ("hex" === enc) {
          msg = msg.replace(/[^a-z0-9]+/gi, "");
          msg.length % 2 !== 0 && (msg = "0" + msg);
          for (i = 0; i < msg.length; i += 2) res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
      } else {
        var p = 0;
        for (var i = 0; i < msg.length; i++) {
          var c = msg.charCodeAt(i);
          if (c < 128) res[p++] = c; else if (c < 2048) {
            res[p++] = c >> 6 | 192;
            res[p++] = 63 & c | 128;
          } else if (isSurrogatePair(msg, i)) {
            c = 65536 + ((1023 & c) << 10) + (1023 & msg.charCodeAt(++i));
            res[p++] = c >> 18 | 240;
            res[p++] = c >> 12 & 63 | 128;
            res[p++] = c >> 6 & 63 | 128;
            res[p++] = 63 & c | 128;
          } else {
            res[p++] = c >> 12 | 224;
            res[p++] = c >> 6 & 63 | 128;
            res[p++] = 63 & c | 128;
          }
        }
      } else for (i = 0; i < msg.length; i++) res[i] = 0 | msg[i];
      return res;
    }
    exports.toArray = toArray;
    function toHex(msg) {
      var res = "";
      for (var i = 0; i < msg.length; i++) res += zero2(msg[i].toString(16));
      return res;
    }
    exports.toHex = toHex;
    function htonl(w) {
      var res = w >>> 24 | w >>> 8 & 65280 | w << 8 & 16711680 | (255 & w) << 24;
      return res >>> 0;
    }
    exports.htonl = htonl;
    function toHex32(msg, endian) {
      var res = "";
      for (var i = 0; i < msg.length; i++) {
        var w = msg[i];
        "little" === endian && (w = htonl(w));
        res += zero8(w.toString(16));
      }
      return res;
    }
    exports.toHex32 = toHex32;
    function zero2(word) {
      return 1 === word.length ? "0" + word : word;
    }
    exports.zero2 = zero2;
    function zero8(word) {
      return 7 === word.length ? "0" + word : 6 === word.length ? "00" + word : 5 === word.length ? "000" + word : 4 === word.length ? "0000" + word : 3 === word.length ? "00000" + word : 2 === word.length ? "000000" + word : 1 === word.length ? "0000000" + word : word;
    }
    exports.zero8 = zero8;
    function join32(msg, start, end, endian) {
      var len = end - start;
      assert(len % 4 === 0);
      var res = new Array(len / 4);
      for (var i = 0, k = start; i < res.length; i++, k += 4) {
        var w;
        w = "big" === endian ? msg[k] << 24 | msg[k + 1] << 16 | msg[k + 2] << 8 | msg[k + 3] : msg[k + 3] << 24 | msg[k + 2] << 16 | msg[k + 1] << 8 | msg[k];
        res[i] = w >>> 0;
      }
      return res;
    }
    exports.join32 = join32;
    function split32(msg, endian) {
      var res = new Array(4 * msg.length);
      for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
        var m = msg[i];
        if ("big" === endian) {
          res[k] = m >>> 24;
          res[k + 1] = m >>> 16 & 255;
          res[k + 2] = m >>> 8 & 255;
          res[k + 3] = 255 & m;
        } else {
          res[k + 3] = m >>> 24;
          res[k + 2] = m >>> 16 & 255;
          res[k + 1] = m >>> 8 & 255;
          res[k] = 255 & m;
        }
      }
      return res;
    }
    exports.split32 = split32;
    function rotr32(w, b) {
      return w >>> b | w << 32 - b;
    }
    exports.rotr32 = rotr32;
    function rotl32(w, b) {
      return w << b | w >>> 32 - b;
    }
    exports.rotl32 = rotl32;
    function sum32(a, b) {
      return a + b >>> 0;
    }
    exports.sum32 = sum32;
    function sum32_3(a, b, c) {
      return a + b + c >>> 0;
    }
    exports.sum32_3 = sum32_3;
    function sum32_4(a, b, c, d) {
      return a + b + c + d >>> 0;
    }
    exports.sum32_4 = sum32_4;
    function sum32_5(a, b, c, d, e) {
      return a + b + c + d + e >>> 0;
    }
    exports.sum32_5 = sum32_5;
    function sum64(buf, pos, ah, al) {
      var bh = buf[pos];
      var bl = buf[pos + 1];
      var lo = al + bl >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      buf[pos] = hi >>> 0;
      buf[pos + 1] = lo;
    }
    exports.sum64 = sum64;
    function sum64_hi(ah, al, bh, bl) {
      var lo = al + bl >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      return hi >>> 0;
    }
    exports.sum64_hi = sum64_hi;
    function sum64_lo(ah, al, bh, bl) {
      var lo = al + bl;
      return lo >>> 0;
    }
    exports.sum64_lo = sum64_lo;
    function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
      var carry = 0;
      var lo = al;
      lo = lo + bl >>> 0;
      carry += lo < al ? 1 : 0;
      lo = lo + cl >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = lo + dl >>> 0;
      carry += lo < dl ? 1 : 0;
      var hi = ah + bh + ch + dh + carry;
      return hi >>> 0;
    }
    exports.sum64_4_hi = sum64_4_hi;
    function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
      var lo = al + bl + cl + dl;
      return lo >>> 0;
    }
    exports.sum64_4_lo = sum64_4_lo;
    function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var carry = 0;
      var lo = al;
      lo = lo + bl >>> 0;
      carry += lo < al ? 1 : 0;
      lo = lo + cl >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = lo + dl >>> 0;
      carry += lo < dl ? 1 : 0;
      lo = lo + el >>> 0;
      carry += lo < el ? 1 : 0;
      var hi = ah + bh + ch + dh + eh + carry;
      return hi >>> 0;
    }
    exports.sum64_5_hi = sum64_5_hi;
    function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var lo = al + bl + cl + dl + el;
      return lo >>> 0;
    }
    exports.sum64_5_lo = sum64_5_lo;
    function rotr64_hi(ah, al, num) {
      var r = al << 32 - num | ah >>> num;
      return r >>> 0;
    }
    exports.rotr64_hi = rotr64_hi;
    function rotr64_lo(ah, al, num) {
      var r = ah << 32 - num | al >>> num;
      return r >>> 0;
    }
    exports.rotr64_lo = rotr64_lo;
    function shr64_hi(ah, al, num) {
      return ah >>> num;
    }
    exports.shr64_hi = shr64_hi;
    function shr64_lo(ah, al, num) {
      var r = ah << 32 - num | al >>> num;
      return r >>> 0;
    }
    exports.shr64_lo = shr64_lo;
  }, {
    inherits: 101,
    "minimalistic-assert": 105
  } ],
  98: [ function(require, module, exports) {
    "use strict";
    var hash = require("hash.js");
    var utils = require("minimalistic-crypto-utils");
    var assert = require("minimalistic-assert");
    function HmacDRBG(options) {
      if (!(this instanceof HmacDRBG)) return new HmacDRBG(options);
      this.hash = options.hash;
      this.predResist = !!options.predResist;
      this.outLen = this.hash.outSize;
      this.minEntropy = options.minEntropy || this.hash.hmacStrength;
      this._reseed = null;
      this.reseedInterval = null;
      this.K = null;
      this.V = null;
      var entropy = utils.toArray(options.entropy, options.entropyEnc || "hex");
      var nonce = utils.toArray(options.nonce, options.nonceEnc || "hex");
      var pers = utils.toArray(options.pers, options.persEnc || "hex");
      assert(entropy.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
      this._init(entropy, nonce, pers);
    }
    module.exports = HmacDRBG;
    HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
      var seed = entropy.concat(nonce).concat(pers);
      this.K = new Array(this.outLen / 8);
      this.V = new Array(this.outLen / 8);
      for (var i = 0; i < this.V.length; i++) {
        this.K[i] = 0;
        this.V[i] = 1;
      }
      this._update(seed);
      this._reseed = 1;
      this.reseedInterval = 281474976710656;
    };
    HmacDRBG.prototype._hmac = function hmac() {
      return new hash.hmac(this.hash, this.K);
    };
    HmacDRBG.prototype._update = function update(seed) {
      var kmac = this._hmac().update(this.V).update([ 0 ]);
      seed && (kmac = kmac.update(seed));
      this.K = kmac.digest();
      this.V = this._hmac().update(this.V).digest();
      if (!seed) return;
      this.K = this._hmac().update(this.V).update([ 1 ]).update(seed).digest();
      this.V = this._hmac().update(this.V).digest();
    };
    HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
      if ("string" !== typeof entropyEnc) {
        addEnc = add;
        add = entropyEnc;
        entropyEnc = null;
      }
      entropy = utils.toArray(entropy, entropyEnc);
      add = utils.toArray(add, addEnc);
      assert(entropy.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
      this._update(entropy.concat(add || []));
      this._reseed = 1;
    };
    HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
      if (this._reseed > this.reseedInterval) throw new Error("Reseed is required");
      if ("string" !== typeof enc) {
        addEnc = add;
        add = enc;
        enc = null;
      }
      if (add) {
        add = utils.toArray(add, addEnc || "hex");
        this._update(add);
      }
      var temp = [];
      while (temp.length < len) {
        this.V = this._hmac().update(this.V).digest();
        temp = temp.concat(this.V);
      }
      var res = temp.slice(0, len);
      this._update(add);
      this._reseed++;
      return utils.encode(res, enc);
    };
  }, {
    "hash.js": 86,
    "minimalistic-assert": 105,
    "minimalistic-crypto-utils": 106
  } ],
  99: [ function(require, module, exports) {
    exports.read = function(buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = 8 * nBytes - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];
      i += d;
      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (;nBits > 0; e = 256 * e + buffer[offset + i], i += d, nBits -= 8) ;
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (;nBits > 0; m = 256 * m + buffer[offset + i], i += d, nBits -= 8) ;
      if (0 === e) e = 1 - eBias; else {
        if (e === eMax) return m ? NaN : Infinity * (s ? -1 : 1);
        m += Math.pow(2, mLen);
        e -= eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };
    exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = 8 * nBytes - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = 23 === mLen ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d = isLE ? 1 : -1;
      var s = value < 0 || 0 === value && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || Infinity === value) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        value += e + eBias >= 1 ? rt / c : rt * Math.pow(2, 1 - eBias);
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e += eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }
      for (;mLen >= 8; buffer[offset + i] = 255 & m, i += d, m /= 256, mLen -= 8) ;
      e = e << mLen | m;
      eLen += mLen;
      for (;eLen > 0; buffer[offset + i] = 255 & e, i += d, e /= 256, eLen -= 8) ;
      buffer[offset + i - d] |= 128 * s;
    };
  }, {} ],
  100: [ function(require, module, exports) {
    var indexOf = [].indexOf;
    module.exports = function(arr, obj) {
      if (indexOf) return arr.indexOf(obj);
      for (var i = 0; i < arr.length; ++i) if (arr[i] === obj) return i;
      return -1;
    };
  }, {} ],
  101: [ function(require, module, exports) {
    "function" === typeof Object.create ? module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    } : module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
    };
  }, {} ],
  102: [ function(require, module, exports) {
    module.exports = function(obj) {
      return null != obj && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
    };
    function isBuffer(obj) {
      return !!obj.constructor && "function" === typeof obj.constructor.isBuffer && obj.constructor.isBuffer(obj);
    }
    function isSlowBuffer(obj) {
      return "function" === typeof obj.readFloatLE && "function" === typeof obj.slice && isBuffer(obj.slice(0, 0));
    }
  }, {} ],
  103: [ function(require, module, exports) {
    "use strict";
    var inherits = require("inherits");
    var HashBase = require("hash-base");
    var Buffer = require("safe-buffer").Buffer;
    var ARRAY16 = new Array(16);
    function MD5() {
      HashBase.call(this, 64);
      this._a = 1732584193;
      this._b = 4023233417;
      this._c = 2562383102;
      this._d = 271733878;
    }
    inherits(MD5, HashBase);
    MD5.prototype._update = function() {
      var M = ARRAY16;
      for (var i = 0; i < 16; ++i) M[i] = this._block.readInt32LE(4 * i);
      var a = this._a;
      var b = this._b;
      var c = this._c;
      var d = this._d;
      a = fnF(a, b, c, d, M[0], 3614090360, 7);
      d = fnF(d, a, b, c, M[1], 3905402710, 12);
      c = fnF(c, d, a, b, M[2], 606105819, 17);
      b = fnF(b, c, d, a, M[3], 3250441966, 22);
      a = fnF(a, b, c, d, M[4], 4118548399, 7);
      d = fnF(d, a, b, c, M[5], 1200080426, 12);
      c = fnF(c, d, a, b, M[6], 2821735955, 17);
      b = fnF(b, c, d, a, M[7], 4249261313, 22);
      a = fnF(a, b, c, d, M[8], 1770035416, 7);
      d = fnF(d, a, b, c, M[9], 2336552879, 12);
      c = fnF(c, d, a, b, M[10], 4294925233, 17);
      b = fnF(b, c, d, a, M[11], 2304563134, 22);
      a = fnF(a, b, c, d, M[12], 1804603682, 7);
      d = fnF(d, a, b, c, M[13], 4254626195, 12);
      c = fnF(c, d, a, b, M[14], 2792965006, 17);
      b = fnF(b, c, d, a, M[15], 1236535329, 22);
      a = fnG(a, b, c, d, M[1], 4129170786, 5);
      d = fnG(d, a, b, c, M[6], 3225465664, 9);
      c = fnG(c, d, a, b, M[11], 643717713, 14);
      b = fnG(b, c, d, a, M[0], 3921069994, 20);
      a = fnG(a, b, c, d, M[5], 3593408605, 5);
      d = fnG(d, a, b, c, M[10], 38016083, 9);
      c = fnG(c, d, a, b, M[15], 3634488961, 14);
      b = fnG(b, c, d, a, M[4], 3889429448, 20);
      a = fnG(a, b, c, d, M[9], 568446438, 5);
      d = fnG(d, a, b, c, M[14], 3275163606, 9);
      c = fnG(c, d, a, b, M[3], 4107603335, 14);
      b = fnG(b, c, d, a, M[8], 1163531501, 20);
      a = fnG(a, b, c, d, M[13], 2850285829, 5);
      d = fnG(d, a, b, c, M[2], 4243563512, 9);
      c = fnG(c, d, a, b, M[7], 1735328473, 14);
      b = fnG(b, c, d, a, M[12], 2368359562, 20);
      a = fnH(a, b, c, d, M[5], 4294588738, 4);
      d = fnH(d, a, b, c, M[8], 2272392833, 11);
      c = fnH(c, d, a, b, M[11], 1839030562, 16);
      b = fnH(b, c, d, a, M[14], 4259657740, 23);
      a = fnH(a, b, c, d, M[1], 2763975236, 4);
      d = fnH(d, a, b, c, M[4], 1272893353, 11);
      c = fnH(c, d, a, b, M[7], 4139469664, 16);
      b = fnH(b, c, d, a, M[10], 3200236656, 23);
      a = fnH(a, b, c, d, M[13], 681279174, 4);
      d = fnH(d, a, b, c, M[0], 3936430074, 11);
      c = fnH(c, d, a, b, M[3], 3572445317, 16);
      b = fnH(b, c, d, a, M[6], 76029189, 23);
      a = fnH(a, b, c, d, M[9], 3654602809, 4);
      d = fnH(d, a, b, c, M[12], 3873151461, 11);
      c = fnH(c, d, a, b, M[15], 530742520, 16);
      b = fnH(b, c, d, a, M[2], 3299628645, 23);
      a = fnI(a, b, c, d, M[0], 4096336452, 6);
      d = fnI(d, a, b, c, M[7], 1126891415, 10);
      c = fnI(c, d, a, b, M[14], 2878612391, 15);
      b = fnI(b, c, d, a, M[5], 4237533241, 21);
      a = fnI(a, b, c, d, M[12], 1700485571, 6);
      d = fnI(d, a, b, c, M[3], 2399980690, 10);
      c = fnI(c, d, a, b, M[10], 4293915773, 15);
      b = fnI(b, c, d, a, M[1], 2240044497, 21);
      a = fnI(a, b, c, d, M[8], 1873313359, 6);
      d = fnI(d, a, b, c, M[15], 4264355552, 10);
      c = fnI(c, d, a, b, M[6], 2734768916, 15);
      b = fnI(b, c, d, a, M[13], 1309151649, 21);
      a = fnI(a, b, c, d, M[4], 4149444226, 6);
      d = fnI(d, a, b, c, M[11], 3174756917, 10);
      c = fnI(c, d, a, b, M[2], 718787259, 15);
      b = fnI(b, c, d, a, M[9], 3951481745, 21);
      this._a = this._a + a | 0;
      this._b = this._b + b | 0;
      this._c = this._c + c | 0;
      this._d = this._d + d | 0;
    };
    MD5.prototype._digest = function() {
      this._block[this._blockOffset++] = 128;
      if (this._blockOffset > 56) {
        this._block.fill(0, this._blockOffset, 64);
        this._update();
        this._blockOffset = 0;
      }
      this._block.fill(0, this._blockOffset, 56);
      this._block.writeUInt32LE(this._length[0], 56);
      this._block.writeUInt32LE(this._length[1], 60);
      this._update();
      var buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32LE(this._a, 0);
      buffer.writeInt32LE(this._b, 4);
      buffer.writeInt32LE(this._c, 8);
      buffer.writeInt32LE(this._d, 12);
      return buffer;
    };
    function rotl(x, n) {
      return x << n | x >>> 32 - n;
    }
    function fnF(a, b, c, d, m, k, s) {
      return rotl(a + (b & c | ~b & d) + m + k | 0, s) + b | 0;
    }
    function fnG(a, b, c, d, m, k, s) {
      return rotl(a + (b & d | c & ~d) + m + k | 0, s) + b | 0;
    }
    function fnH(a, b, c, d, m, k, s) {
      return rotl(a + (b ^ c ^ d) + m + k | 0, s) + b | 0;
    }
    function fnI(a, b, c, d, m, k, s) {
      return rotl(a + (c ^ (b | ~d)) + m + k | 0, s) + b | 0;
    }
    module.exports = MD5;
  }, {
    "hash-base": 85,
    inherits: 101,
    "safe-buffer": 143
  } ],
  104: [ function(require, module, exports) {
    var bn = require("bn.js");
    var brorand = require("brorand");
    function MillerRabin(rand) {
      this.rand = rand || new brorand.Rand();
    }
    module.exports = MillerRabin;
    MillerRabin.create = function create(rand) {
      return new MillerRabin(rand);
    };
    MillerRabin.prototype._randbelow = function _randbelow(n) {
      var len = n.bitLength();
      var min_bytes = Math.ceil(len / 8);
      do {
        var a = new bn(this.rand.generate(min_bytes));
      } while (a.cmp(n) >= 0);
      return a;
    };
    MillerRabin.prototype._randrange = function _randrange(start, stop) {
      var size = stop.sub(start);
      return start.add(this._randbelow(size));
    };
    MillerRabin.prototype.test = function test(n, k, cb) {
      var len = n.bitLength();
      var red = bn.mont(n);
      var rone = new bn(1).toRed(red);
      k || (k = Math.max(1, len / 48 | 0));
      var n1 = n.subn(1);
      for (var s = 0; !n1.testn(s); s++) ;
      var d = n.shrn(s);
      var rn1 = n1.toRed(red);
      var prime = true;
      for (;k > 0; k--) {
        var a = this._randrange(new bn(2), n1);
        cb && cb(a);
        var x = a.toRed(red).redPow(d);
        if (0 === x.cmp(rone) || 0 === x.cmp(rn1)) continue;
        for (var i = 1; i < s; i++) {
          x = x.redSqr();
          if (0 === x.cmp(rone)) return false;
          if (0 === x.cmp(rn1)) break;
        }
        if (i === s) return false;
      }
      return prime;
    };
    MillerRabin.prototype.getDivisor = function getDivisor(n, k) {
      var len = n.bitLength();
      var red = bn.mont(n);
      var rone = new bn(1).toRed(red);
      k || (k = Math.max(1, len / 48 | 0));
      var n1 = n.subn(1);
      for (var s = 0; !n1.testn(s); s++) ;
      var d = n.shrn(s);
      var rn1 = n1.toRed(red);
      for (;k > 0; k--) {
        var a = this._randrange(new bn(2), n1);
        var g = n.gcd(a);
        if (0 !== g.cmpn(1)) return g;
        var x = a.toRed(red).redPow(d);
        if (0 === x.cmp(rone) || 0 === x.cmp(rn1)) continue;
        for (var i = 1; i < s; i++) {
          x = x.redSqr();
          if (0 === x.cmp(rone)) return x.fromRed().subn(1).gcd(n);
          if (0 === x.cmp(rn1)) break;
        }
        if (i === s) {
          x = x.redSqr();
          return x.fromRed().subn(1).gcd(n);
        }
      }
      return false;
    };
  }, {
    "bn.js": 16,
    brorand: 17
  } ],
  105: [ function(require, module, exports) {
    module.exports = assert;
    function assert(val, msg) {
      if (!val) throw new Error(msg || "Assertion failed");
    }
    assert.equal = function assertEqual(l, r, msg) {
      if (l != r) throw new Error(msg || "Assertion failed: " + l + " != " + r);
    };
  }, {} ],
  106: [ function(require, module, exports) {
    "use strict";
    var utils = exports;
    function toArray(msg, enc) {
      if (Array.isArray(msg)) return msg.slice();
      if (!msg) return [];
      var res = [];
      if ("string" !== typeof msg) {
        for (var i = 0; i < msg.length; i++) res[i] = 0 | msg[i];
        return res;
      }
      if ("hex" === enc) {
        msg = msg.replace(/[^a-z0-9]+/gi, "");
        msg.length % 2 !== 0 && (msg = "0" + msg);
        for (var i = 0; i < msg.length; i += 2) res.push(parseInt(msg[i] + msg[i + 1], 16));
      } else for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        var hi = c >> 8;
        var lo = 255 & c;
        hi ? res.push(hi, lo) : res.push(lo);
      }
      return res;
    }
    utils.toArray = toArray;
    function zero2(word) {
      return 1 === word.length ? "0" + word : word;
    }
    utils.zero2 = zero2;
    function toHex(msg) {
      var res = "";
      for (var i = 0; i < msg.length; i++) res += zero2(msg[i].toString(16));
      return res;
    }
    utils.toHex = toHex;
    utils.encode = function encode(arr, enc) {
      return "hex" === enc ? toHex(arr) : arr;
    };
  }, {} ],
  107: [ function(require, module, exports) {
    module.exports = {
      "2.16.840.1.101.3.4.1.1": "aes-128-ecb",
      "2.16.840.1.101.3.4.1.2": "aes-128-cbc",
      "2.16.840.1.101.3.4.1.3": "aes-128-ofb",
      "2.16.840.1.101.3.4.1.4": "aes-128-cfb",
      "2.16.840.1.101.3.4.1.21": "aes-192-ecb",
      "2.16.840.1.101.3.4.1.22": "aes-192-cbc",
      "2.16.840.1.101.3.4.1.23": "aes-192-ofb",
      "2.16.840.1.101.3.4.1.24": "aes-192-cfb",
      "2.16.840.1.101.3.4.1.41": "aes-256-ecb",
      "2.16.840.1.101.3.4.1.42": "aes-256-cbc",
      "2.16.840.1.101.3.4.1.43": "aes-256-ofb",
      "2.16.840.1.101.3.4.1.44": "aes-256-cfb"
    };
  }, {} ],
  108: [ function(require, module, exports) {
    "use strict";
    var asn1 = require("asn1.js");
    exports.certificate = require("./certificate");
    var RSAPrivateKey = asn1.define("RSAPrivateKey", function() {
      this.seq().obj(this.key("version").int(), this.key("modulus").int(), this.key("publicExponent").int(), this.key("privateExponent").int(), this.key("prime1").int(), this.key("prime2").int(), this.key("exponent1").int(), this.key("exponent2").int(), this.key("coefficient").int());
    });
    exports.RSAPrivateKey = RSAPrivateKey;
    var RSAPublicKey = asn1.define("RSAPublicKey", function() {
      this.seq().obj(this.key("modulus").int(), this.key("publicExponent").int());
    });
    exports.RSAPublicKey = RSAPublicKey;
    var PublicKey = asn1.define("SubjectPublicKeyInfo", function() {
      this.seq().obj(this.key("algorithm").use(AlgorithmIdentifier), this.key("subjectPublicKey").bitstr());
    });
    exports.PublicKey = PublicKey;
    var AlgorithmIdentifier = asn1.define("AlgorithmIdentifier", function() {
      this.seq().obj(this.key("algorithm").objid(), this.key("none").null_().optional(), this.key("curve").objid().optional(), this.key("params").seq().obj(this.key("p").int(), this.key("q").int(), this.key("g").int()).optional());
    });
    var PrivateKeyInfo = asn1.define("PrivateKeyInfo", function() {
      this.seq().obj(this.key("version").int(), this.key("algorithm").use(AlgorithmIdentifier), this.key("subjectPrivateKey").octstr());
    });
    exports.PrivateKey = PrivateKeyInfo;
    var EncryptedPrivateKeyInfo = asn1.define("EncryptedPrivateKeyInfo", function() {
      this.seq().obj(this.key("algorithm").seq().obj(this.key("id").objid(), this.key("decrypt").seq().obj(this.key("kde").seq().obj(this.key("id").objid(), this.key("kdeparams").seq().obj(this.key("salt").octstr(), this.key("iters").int())), this.key("cipher").seq().obj(this.key("algo").objid(), this.key("iv").octstr()))), this.key("subjectPrivateKey").octstr());
    });
    exports.EncryptedPrivateKey = EncryptedPrivateKeyInfo;
    var DSAPrivateKey = asn1.define("DSAPrivateKey", function() {
      this.seq().obj(this.key("version").int(), this.key("p").int(), this.key("q").int(), this.key("g").int(), this.key("pub_key").int(), this.key("priv_key").int());
    });
    exports.DSAPrivateKey = DSAPrivateKey;
    exports.DSAparam = asn1.define("DSAparam", function() {
      this.int();
    });
    var ECPrivateKey = asn1.define("ECPrivateKey", function() {
      this.seq().obj(this.key("version").int(), this.key("privateKey").octstr(), this.key("parameters").optional().explicit(0).use(ECParameters), this.key("publicKey").optional().explicit(1).bitstr());
    });
    exports.ECPrivateKey = ECPrivateKey;
    var ECParameters = asn1.define("ECParameters", function() {
      this.choice({
        namedCurve: this.objid()
      });
    });
    exports.signature = asn1.define("signature", function() {
      this.seq().obj(this.key("r").int(), this.key("s").int());
    });
  }, {
    "./certificate": 109,
    "asn1.js": 1
  } ],
  109: [ function(require, module, exports) {
    "use strict";
    var asn = require("asn1.js");
    var Time = asn.define("Time", function() {
      this.choice({
        utcTime: this.utctime(),
        generalTime: this.gentime()
      });
    });
    var AttributeTypeValue = asn.define("AttributeTypeValue", function() {
      this.seq().obj(this.key("type").objid(), this.key("value").any());
    });
    var AlgorithmIdentifier = asn.define("AlgorithmIdentifier", function() {
      this.seq().obj(this.key("algorithm").objid(), this.key("parameters").optional(), this.key("curve").objid().optional());
    });
    var SubjectPublicKeyInfo = asn.define("SubjectPublicKeyInfo", function() {
      this.seq().obj(this.key("algorithm").use(AlgorithmIdentifier), this.key("subjectPublicKey").bitstr());
    });
    var RelativeDistinguishedName = asn.define("RelativeDistinguishedName", function() {
      this.setof(AttributeTypeValue);
    });
    var RDNSequence = asn.define("RDNSequence", function() {
      this.seqof(RelativeDistinguishedName);
    });
    var Name = asn.define("Name", function() {
      this.choice({
        rdnSequence: this.use(RDNSequence)
      });
    });
    var Validity = asn.define("Validity", function() {
      this.seq().obj(this.key("notBefore").use(Time), this.key("notAfter").use(Time));
    });
    var Extension = asn.define("Extension", function() {
      this.seq().obj(this.key("extnID").objid(), this.key("critical").bool().def(false), this.key("extnValue").octstr());
    });
    var TBSCertificate = asn.define("TBSCertificate", function() {
      this.seq().obj(this.key("version").explicit(0).int().optional(), this.key("serialNumber").int(), this.key("signature").use(AlgorithmIdentifier), this.key("issuer").use(Name), this.key("validity").use(Validity), this.key("subject").use(Name), this.key("subjectPublicKeyInfo").use(SubjectPublicKeyInfo), this.key("issuerUniqueID").implicit(1).bitstr().optional(), this.key("subjectUniqueID").implicit(2).bitstr().optional(), this.key("extensions").explicit(3).seqof(Extension).optional());
    });
    var X509Certificate = asn.define("X509Certificate", function() {
      this.seq().obj(this.key("tbsCertificate").use(TBSCertificate), this.key("signatureAlgorithm").use(AlgorithmIdentifier), this.key("signatureValue").bitstr());
    });
    module.exports = X509Certificate;
  }, {
    "asn1.js": 1
  } ],
  110: [ function(require, module, exports) {
    var findProc = /Proc-Type: 4,ENCRYPTED[\n\r]+DEK-Info: AES-((?:128)|(?:192)|(?:256))-CBC,([0-9A-H]+)[\n\r]+([0-9A-z\n\r\+\/\=]+)[\n\r]+/m;
    var startRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----/m;
    var fullRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----([0-9A-z\n\r\+\/\=]+)-----END \1-----$/m;
    var evp = require("evp_bytestokey");
    var ciphers = require("browserify-aes");
    var Buffer = require("safe-buffer").Buffer;
    module.exports = function(okey, password) {
      var key = okey.toString();
      var match = key.match(findProc);
      var decrypted;
      if (match) {
        var suite = "aes" + match[1];
        var iv = Buffer.from(match[2], "hex");
        var cipherText = Buffer.from(match[3].replace(/[\r\n]/g, ""), "base64");
        var cipherKey = evp(password, iv.slice(0, 8), parseInt(match[1], 10)).key;
        var out = [];
        var cipher = ciphers.createDecipheriv(suite, cipherKey, iv);
        out.push(cipher.update(cipherText));
        out.push(cipher.final());
        decrypted = Buffer.concat(out);
      } else {
        var match2 = key.match(fullRegex);
        decrypted = new Buffer(match2[2].replace(/[\r\n]/g, ""), "base64");
      }
      var tag = key.match(startRegex)[1];
      return {
        tag: tag,
        data: decrypted
      };
    };
  }, {
    "browserify-aes": 21,
    evp_bytestokey: 84,
    "safe-buffer": 143
  } ],
  111: [ function(require, module, exports) {
    var asn1 = require("./asn1");
    var aesid = require("./aesid.json");
    var fixProc = require("./fixProc");
    var ciphers = require("browserify-aes");
    var compat = require("pbkdf2");
    var Buffer = require("safe-buffer").Buffer;
    module.exports = parseKeys;
    function parseKeys(buffer) {
      var password;
      if ("object" === typeof buffer && !Buffer.isBuffer(buffer)) {
        password = buffer.passphrase;
        buffer = buffer.key;
      }
      "string" === typeof buffer && (buffer = Buffer.from(buffer));
      var stripped = fixProc(buffer, password);
      var type = stripped.tag;
      var data = stripped.data;
      var subtype, ndata;
      switch (type) {
       case "CERTIFICATE":
        ndata = asn1.certificate.decode(data, "der").tbsCertificate.subjectPublicKeyInfo;

       case "PUBLIC KEY":
        ndata || (ndata = asn1.PublicKey.decode(data, "der"));
        subtype = ndata.algorithm.algorithm.join(".");
        switch (subtype) {
         case "1.2.840.113549.1.1.1":
          return asn1.RSAPublicKey.decode(ndata.subjectPublicKey.data, "der");

         case "1.2.840.10045.2.1":
          ndata.subjectPrivateKey = ndata.subjectPublicKey;
          return {
            type: "ec",
            data: ndata
          };

         case "1.2.840.10040.4.1":
          ndata.algorithm.params.pub_key = asn1.DSAparam.decode(ndata.subjectPublicKey.data, "der");
          return {
            type: "dsa",
            data: ndata.algorithm.params
          };

         default:
          throw new Error("unknown key id " + subtype);
        }
        throw new Error("unknown key type " + type);

       case "ENCRYPTED PRIVATE KEY":
        data = asn1.EncryptedPrivateKey.decode(data, "der");
        data = decrypt(data, password);

       case "PRIVATE KEY":
        ndata = asn1.PrivateKey.decode(data, "der");
        subtype = ndata.algorithm.algorithm.join(".");
        switch (subtype) {
         case "1.2.840.113549.1.1.1":
          return asn1.RSAPrivateKey.decode(ndata.subjectPrivateKey, "der");

         case "1.2.840.10045.2.1":
          return {
            curve: ndata.algorithm.curve,
            privateKey: asn1.ECPrivateKey.decode(ndata.subjectPrivateKey, "der").privateKey
          };

         case "1.2.840.10040.4.1":
          ndata.algorithm.params.priv_key = asn1.DSAparam.decode(ndata.subjectPrivateKey, "der");
          return {
            type: "dsa",
            params: ndata.algorithm.params
          };

         default:
          throw new Error("unknown key id " + subtype);
        }
        throw new Error("unknown key type " + type);

       case "RSA PUBLIC KEY":
        return asn1.RSAPublicKey.decode(data, "der");

       case "RSA PRIVATE KEY":
        return asn1.RSAPrivateKey.decode(data, "der");

       case "DSA PRIVATE KEY":
        return {
          type: "dsa",
          params: asn1.DSAPrivateKey.decode(data, "der")
        };

       case "EC PRIVATE KEY":
        data = asn1.ECPrivateKey.decode(data, "der");
        return {
          curve: data.parameters.value,
          privateKey: data.privateKey
        };

       default:
        throw new Error("unknown key type " + type);
      }
    }
    parseKeys.signature = asn1.signature;
    function decrypt(data, password) {
      var salt = data.algorithm.decrypt.kde.kdeparams.salt;
      var iters = parseInt(data.algorithm.decrypt.kde.kdeparams.iters.toString(), 10);
      var algo = aesid[data.algorithm.decrypt.cipher.algo.join(".")];
      var iv = data.algorithm.decrypt.cipher.iv;
      var cipherText = data.subjectPrivateKey;
      var keylen = parseInt(algo.split("-")[1], 10) / 8;
      var key = compat.pbkdf2Sync(password, salt, iters, keylen, "sha1");
      var cipher = ciphers.createDecipheriv(algo, key, iv);
      var out = [];
      out.push(cipher.update(cipherText));
      out.push(cipher.final());
      return Buffer.concat(out);
    }
  }, {
    "./aesid.json": 107,
    "./asn1": 108,
    "./fixProc": 110,
    "browserify-aes": 21,
    pbkdf2: 112,
    "safe-buffer": 143
  } ],
  112: [ function(require, module, exports) {
    exports.pbkdf2 = require("./lib/async");
    exports.pbkdf2Sync = require("./lib/sync");
  }, {
    "./lib/async": 113,
    "./lib/sync": 116
  } ],
  113: [ function(require, module, exports) {
    (function(process, global) {
      var checkParameters = require("./precondition");
      var defaultEncoding = require("./default-encoding");
      var sync = require("./sync");
      var Buffer = require("safe-buffer").Buffer;
      var ZERO_BUF;
      var subtle = global.crypto && global.crypto.subtle;
      var toBrowser = {
        sha: "SHA-1",
        "sha-1": "SHA-1",
        sha1: "SHA-1",
        sha256: "SHA-256",
        "sha-256": "SHA-256",
        sha384: "SHA-384",
        "sha-384": "SHA-384",
        "sha-512": "SHA-512",
        sha512: "SHA-512"
      };
      var checks = [];
      function checkNative(algo) {
        if (global.process && !global.process.browser) return Promise.resolve(false);
        if (!subtle || !subtle.importKey || !subtle.deriveBits) return Promise.resolve(false);
        if (void 0 !== checks[algo]) return checks[algo];
        ZERO_BUF = ZERO_BUF || Buffer.alloc(8);
        var prom = browserPbkdf2(ZERO_BUF, ZERO_BUF, 10, 128, algo).then(function() {
          return true;
        }).catch(function() {
          return false;
        });
        checks[algo] = prom;
        return prom;
      }
      function browserPbkdf2(password, salt, iterations, length, algo) {
        return subtle.importKey("raw", password, {
          name: "PBKDF2"
        }, false, [ "deriveBits" ]).then(function(key) {
          return subtle.deriveBits({
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: {
              name: algo
            }
          }, key, length << 3);
        }).then(function(res) {
          return Buffer.from(res);
        });
      }
      function resolvePromise(promise, callback) {
        promise.then(function(out) {
          process.nextTick(function() {
            callback(null, out);
          });
        }, function(e) {
          process.nextTick(function() {
            callback(e);
          });
        });
      }
      module.exports = function(password, salt, iterations, keylen, digest, callback) {
        if ("function" === typeof digest) {
          callback = digest;
          digest = void 0;
        }
        digest = digest || "sha1";
        var algo = toBrowser[digest.toLowerCase()];
        if (!algo || "function" !== typeof global.Promise) return process.nextTick(function() {
          var out;
          try {
            out = sync(password, salt, iterations, keylen, digest);
          } catch (e) {
            return callback(e);
          }
          callback(null, out);
        });
        checkParameters(password, salt, iterations, keylen);
        if ("function" !== typeof callback) throw new Error("No callback provided to pbkdf2");
        Buffer.isBuffer(password) || (password = Buffer.from(password, defaultEncoding));
        Buffer.isBuffer(salt) || (salt = Buffer.from(salt, defaultEncoding));
        resolvePromise(checkNative(algo).then(function(resp) {
          if (resp) return browserPbkdf2(password, salt, iterations, keylen, algo);
          return sync(password, salt, iterations, keylen, digest);
        }), callback);
      };
    }).call(this, require("_process"), "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    "./default-encoding": 114,
    "./precondition": 115,
    "./sync": 116,
    _process: 118,
    "safe-buffer": 143
  } ],
  114: [ function(require, module, exports) {
    (function(process) {
      var defaultEncoding;
      if (process.browser) defaultEncoding = "utf-8"; else {
        var pVersionMajor = parseInt(process.version.split(".")[0].slice(1), 10);
        defaultEncoding = pVersionMajor >= 6 ? "utf-8" : "binary";
      }
      module.exports = defaultEncoding;
    }).call(this, require("_process"));
  }, {
    _process: 118
  } ],
  115: [ function(require, module, exports) {
    (function(Buffer) {
      var MAX_ALLOC = Math.pow(2, 30) - 1;
      function checkBuffer(buf, name) {
        if ("string" !== typeof buf && !Buffer.isBuffer(buf)) throw new TypeError(name + " must be a buffer or string");
      }
      module.exports = function(password, salt, iterations, keylen) {
        checkBuffer(password, "Password");
        checkBuffer(salt, "Salt");
        if ("number" !== typeof iterations) throw new TypeError("Iterations not a number");
        if (iterations < 0) throw new TypeError("Bad iterations");
        if ("number" !== typeof keylen) throw new TypeError("Key length not a number");
        if (keylen < 0 || keylen > MAX_ALLOC || keylen !== keylen) throw new TypeError("Bad key length");
      };
    }).call(this, {
      isBuffer: require("../../is-buffer/index.js")
    });
  }, {
    "../../is-buffer/index.js": 102
  } ],
  116: [ function(require, module, exports) {
    var md5 = require("create-hash/md5");
    var RIPEMD160 = require("ripemd160");
    var sha = require("sha.js");
    var checkParameters = require("./precondition");
    var defaultEncoding = require("./default-encoding");
    var Buffer = require("safe-buffer").Buffer;
    var ZEROS = Buffer.alloc(128);
    var sizes = {
      md5: 16,
      sha1: 20,
      sha224: 28,
      sha256: 32,
      sha384: 48,
      sha512: 64,
      rmd160: 20,
      ripemd160: 20
    };
    function Hmac(alg, key, saltLen) {
      var hash = getDigest(alg);
      var blocksize = "sha512" === alg || "sha384" === alg ? 128 : 64;
      key.length > blocksize ? key = hash(key) : key.length < blocksize && (key = Buffer.concat([ key, ZEROS ], blocksize));
      var ipad = Buffer.allocUnsafe(blocksize + sizes[alg]);
      var opad = Buffer.allocUnsafe(blocksize + sizes[alg]);
      for (var i = 0; i < blocksize; i++) {
        ipad[i] = 54 ^ key[i];
        opad[i] = 92 ^ key[i];
      }
      var ipad1 = Buffer.allocUnsafe(blocksize + saltLen + 4);
      ipad.copy(ipad1, 0, 0, blocksize);
      this.ipad1 = ipad1;
      this.ipad2 = ipad;
      this.opad = opad;
      this.alg = alg;
      this.blocksize = blocksize;
      this.hash = hash;
      this.size = sizes[alg];
    }
    Hmac.prototype.run = function(data, ipad) {
      data.copy(ipad, this.blocksize);
      var h = this.hash(ipad);
      h.copy(this.opad, this.blocksize);
      return this.hash(this.opad);
    };
    function getDigest(alg) {
      function shaFunc(data) {
        return sha(alg).update(data).digest();
      }
      function rmd160Func(data) {
        return new RIPEMD160().update(data).digest();
      }
      if ("rmd160" === alg || "ripemd160" === alg) return rmd160Func;
      if ("md5" === alg) return md5;
      return shaFunc;
    }
    function pbkdf2(password, salt, iterations, keylen, digest) {
      checkParameters(password, salt, iterations, keylen);
      Buffer.isBuffer(password) || (password = Buffer.from(password, defaultEncoding));
      Buffer.isBuffer(salt) || (salt = Buffer.from(salt, defaultEncoding));
      digest = digest || "sha1";
      var hmac = new Hmac(digest, password, salt.length);
      var DK = Buffer.allocUnsafe(keylen);
      var block1 = Buffer.allocUnsafe(salt.length + 4);
      salt.copy(block1, 0, 0, salt.length);
      var destPos = 0;
      var hLen = sizes[digest];
      var l = Math.ceil(keylen / hLen);
      for (var i = 1; i <= l; i++) {
        block1.writeUInt32BE(i, salt.length);
        var T = hmac.run(block1, hmac.ipad1);
        var U = T;
        for (var j = 1; j < iterations; j++) {
          U = hmac.run(U, hmac.ipad2);
          for (var k = 0; k < hLen; k++) T[k] ^= U[k];
        }
        T.copy(DK, destPos);
        destPos += hLen;
      }
      return DK;
    }
    module.exports = pbkdf2;
  }, {
    "./default-encoding": 114,
    "./precondition": 115,
    "create-hash/md5": 53,
    ripemd160: 142,
    "safe-buffer": 143,
    "sha.js": 145
  } ],
  117: [ function(require, module, exports) {
    (function(process) {
      "use strict";
      "undefined" === typeof process || !process.version || 0 === process.version.indexOf("v0.") || 0 === process.version.indexOf("v1.") && 0 !== process.version.indexOf("v1.8.") ? module.exports = {
        nextTick: nextTick
      } : module.exports = process;
      function nextTick(fn, arg1, arg2, arg3) {
        if ("function" !== typeof fn) throw new TypeError('"callback" argument must be a function');
        var len = arguments.length;
        var args, i;
        switch (len) {
         case 0:
         case 1:
          return process.nextTick(fn);

         case 2:
          return process.nextTick(function afterTickOne() {
            fn.call(null, arg1);
          });

         case 3:
          return process.nextTick(function afterTickTwo() {
            fn.call(null, arg1, arg2);
          });

         case 4:
          return process.nextTick(function afterTickThree() {
            fn.call(null, arg1, arg2, arg3);
          });

         default:
          args = new Array(len - 1);
          i = 0;
          while (i < args.length) args[i++] = arguments[i];
          return process.nextTick(function afterTick() {
            fn.apply(null, args);
          });
        }
      }
    }).call(this, require("_process"));
  }, {
    _process: 118
  } ],
  118: [ function(require, module, exports) {
    var process = module.exports = {};
    var cachedSetTimeout;
    var cachedClearTimeout;
    function defaultSetTimout() {
      throw new Error("setTimeout has not been defined");
    }
    function defaultClearTimeout() {
      throw new Error("clearTimeout has not been defined");
    }
    (function() {
      try {
        cachedSetTimeout = "function" === typeof setTimeout ? setTimeout : defaultSetTimout;
      } catch (e) {
        cachedSetTimeout = defaultSetTimout;
      }
      try {
        cachedClearTimeout = "function" === typeof clearTimeout ? clearTimeout : defaultClearTimeout;
      } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
      }
    })();
    function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) return setTimeout(fun, 0);
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
      }
      try {
        return cachedSetTimeout(fun, 0);
      } catch (e) {
        try {
          return cachedSetTimeout.call(null, fun, 0);
        } catch (e) {
          return cachedSetTimeout.call(this, fun, 0);
        }
      }
    }
    function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) return clearTimeout(marker);
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
      }
      try {
        return cachedClearTimeout(marker);
      } catch (e) {
        try {
          return cachedClearTimeout.call(null, marker);
        } catch (e) {
          return cachedClearTimeout.call(this, marker);
        }
      }
    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;
    function cleanUpNextTick() {
      if (!draining || !currentQueue) return;
      draining = false;
      currentQueue.length ? queue = currentQueue.concat(queue) : queueIndex = -1;
      queue.length && drainQueue();
    }
    function drainQueue() {
      if (draining) return;
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;
      var len = queue.length;
      while (len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) currentQueue && currentQueue[queueIndex].run();
        queueIndex = -1;
        len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
    }
    process.nextTick = function(fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) for (var i = 1; i < arguments.length; i++) args[i - 1] = arguments[i];
      queue.push(new Item(fun, args));
      1 !== queue.length || draining || runTimeout(drainQueue);
    };
    function Item(fun, array) {
      this.fun = fun;
      this.array = array;
    }
    Item.prototype.run = function() {
      this.fun.apply(null, this.array);
    };
    process.title = "browser";
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = "";
    process.versions = {};
    function noop() {}
    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;
    process.prependListener = noop;
    process.prependOnceListener = noop;
    process.listeners = function(name) {
      return [];
    };
    process.binding = function(name) {
      throw new Error("process.binding is not supported");
    };
    process.cwd = function() {
      return "/";
    };
    process.chdir = function(dir) {
      throw new Error("process.chdir is not supported");
    };
    process.umask = function() {
      return 0;
    };
  }, {} ],
  119: [ function(require, module, exports) {
    exports.publicEncrypt = require("./publicEncrypt");
    exports.privateDecrypt = require("./privateDecrypt");
    exports.privateEncrypt = function privateEncrypt(key, buf) {
      return exports.publicEncrypt(key, buf, true);
    };
    exports.publicDecrypt = function publicDecrypt(key, buf) {
      return exports.privateDecrypt(key, buf, true);
    };
  }, {
    "./privateDecrypt": 121,
    "./publicEncrypt": 122
  } ],
  120: [ function(require, module, exports) {
    var createHash = require("create-hash");
    var Buffer = require("safe-buffer").Buffer;
    module.exports = function(seed, len) {
      var t = Buffer.alloc(0);
      var i = 0;
      var c;
      while (t.length < len) {
        c = i2ops(i++);
        t = Buffer.concat([ t, createHash("sha1").update(seed).update(c).digest() ]);
      }
      return t.slice(0, len);
    };
    function i2ops(c) {
      var out = Buffer.allocUnsafe(4);
      out.writeUInt32BE(c, 0);
      return out;
    }
  }, {
    "create-hash": 52,
    "safe-buffer": 143
  } ],
  121: [ function(require, module, exports) {
    var parseKeys = require("parse-asn1");
    var mgf = require("./mgf");
    var xor = require("./xor");
    var BN = require("bn.js");
    var crt = require("browserify-rsa");
    var createHash = require("create-hash");
    var withPublic = require("./withPublic");
    var Buffer = require("safe-buffer").Buffer;
    module.exports = function privateDecrypt(privateKey, enc, reverse) {
      var padding;
      padding = privateKey.padding ? privateKey.padding : reverse ? 1 : 4;
      var key = parseKeys(privateKey);
      var k = key.modulus.byteLength();
      if (enc.length > k || new BN(enc).cmp(key.modulus) >= 0) throw new Error("decryption error");
      var msg;
      msg = reverse ? withPublic(new BN(enc), key) : crt(enc, key);
      var zBuffer = Buffer.alloc(k - msg.length);
      msg = Buffer.concat([ zBuffer, msg ], k);
      if (4 === padding) return oaep(key, msg);
      if (1 === padding) return pkcs1(key, msg, reverse);
      if (3 === padding) return msg;
      throw new Error("unknown padding");
    };
    function oaep(key, msg) {
      var k = key.modulus.byteLength();
      var iHash = createHash("sha1").update(Buffer.alloc(0)).digest();
      var hLen = iHash.length;
      if (0 !== msg[0]) throw new Error("decryption error");
      var maskedSeed = msg.slice(1, hLen + 1);
      var maskedDb = msg.slice(hLen + 1);
      var seed = xor(maskedSeed, mgf(maskedDb, hLen));
      var db = xor(maskedDb, mgf(seed, k - hLen - 1));
      if (compare(iHash, db.slice(0, hLen))) throw new Error("decryption error");
      var i = hLen;
      while (0 === db[i]) i++;
      if (1 !== db[i++]) throw new Error("decryption error");
      return db.slice(i);
    }
    function pkcs1(key, msg, reverse) {
      var p1 = msg.slice(0, 2);
      var i = 2;
      var status = 0;
      while (0 !== msg[i++]) if (i >= msg.length) {
        status++;
        break;
      }
      var ps = msg.slice(2, i - 1);
      ("0002" !== p1.toString("hex") && !reverse || "0001" !== p1.toString("hex") && reverse) && status++;
      ps.length < 8 && status++;
      if (status) throw new Error("decryption error");
      return msg.slice(i);
    }
    function compare(a, b) {
      a = Buffer.from(a);
      b = Buffer.from(b);
      var dif = 0;
      var len = a.length;
      if (a.length !== b.length) {
        dif++;
        len = Math.min(a.length, b.length);
      }
      var i = -1;
      while (++i < len) dif += a[i] ^ b[i];
      return dif;
    }
  }, {
    "./mgf": 120,
    "./withPublic": 123,
    "./xor": 124,
    "bn.js": 16,
    "browserify-rsa": 39,
    "create-hash": 52,
    "parse-asn1": 111,
    "safe-buffer": 143
  } ],
  122: [ function(require, module, exports) {
    var parseKeys = require("parse-asn1");
    var randomBytes = require("randombytes");
    var createHash = require("create-hash");
    var mgf = require("./mgf");
    var xor = require("./xor");
    var BN = require("bn.js");
    var withPublic = require("./withPublic");
    var crt = require("browserify-rsa");
    var Buffer = require("safe-buffer").Buffer;
    module.exports = function publicEncrypt(publicKey, msg, reverse) {
      var padding;
      padding = publicKey.padding ? publicKey.padding : reverse ? 1 : 4;
      var key = parseKeys(publicKey);
      var paddedMsg;
      if (4 === padding) paddedMsg = oaep(key, msg); else if (1 === padding) paddedMsg = pkcs1(key, msg, reverse); else {
        if (3 !== padding) throw new Error("unknown padding");
        paddedMsg = new BN(msg);
        if (paddedMsg.cmp(key.modulus) >= 0) throw new Error("data too long for modulus");
      }
      return reverse ? crt(paddedMsg, key) : withPublic(paddedMsg, key);
    };
    function oaep(key, msg) {
      var k = key.modulus.byteLength();
      var mLen = msg.length;
      var iHash = createHash("sha1").update(Buffer.alloc(0)).digest();
      var hLen = iHash.length;
      var hLen2 = 2 * hLen;
      if (mLen > k - hLen2 - 2) throw new Error("message too long");
      var ps = Buffer.alloc(k - mLen - hLen2 - 2);
      var dblen = k - hLen - 1;
      var seed = randomBytes(hLen);
      var maskedDb = xor(Buffer.concat([ iHash, ps, Buffer.alloc(1, 1), msg ], dblen), mgf(seed, dblen));
      var maskedSeed = xor(seed, mgf(maskedDb, hLen));
      return new BN(Buffer.concat([ Buffer.alloc(1), maskedSeed, maskedDb ], k));
    }
    function pkcs1(key, msg, reverse) {
      var mLen = msg.length;
      var k = key.modulus.byteLength();
      if (mLen > k - 11) throw new Error("message too long");
      var ps;
      ps = reverse ? Buffer.alloc(k - mLen - 3, 255) : nonZero(k - mLen - 3);
      return new BN(Buffer.concat([ Buffer.from([ 0, reverse ? 1 : 2 ]), ps, Buffer.alloc(1), msg ], k));
    }
    function nonZero(len) {
      var out = Buffer.allocUnsafe(len);
      var i = 0;
      var cache = randomBytes(2 * len);
      var cur = 0;
      var num;
      while (i < len) {
        if (cur === cache.length) {
          cache = randomBytes(2 * len);
          cur = 0;
        }
        num = cache[cur++];
        num && (out[i++] = num);
      }
      return out;
    }
  }, {
    "./mgf": 120,
    "./withPublic": 123,
    "./xor": 124,
    "bn.js": 16,
    "browserify-rsa": 39,
    "create-hash": 52,
    "parse-asn1": 111,
    randombytes: 125,
    "safe-buffer": 143
  } ],
  123: [ function(require, module, exports) {
    var BN = require("bn.js");
    var Buffer = require("safe-buffer").Buffer;
    function withPublic(paddedMsg, key) {
      return Buffer.from(paddedMsg.toRed(BN.mont(key.modulus)).redPow(new BN(key.publicExponent)).fromRed().toArray());
    }
    module.exports = withPublic;
  }, {
    "bn.js": 16,
    "safe-buffer": 143
  } ],
  124: [ function(require, module, exports) {
    module.exports = function xor(a, b) {
      var len = a.length;
      var i = -1;
      while (++i < len) a[i] ^= b[i];
      return a;
    };
  }, {} ],
  125: [ function(require, module, exports) {
    (function(process, global) {
      "use strict";
      var MAX_BYTES = 65536;
      var MAX_UINT32 = 4294967295;
      function oldBrowser() {
        throw new Error("Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11");
      }
      var Buffer = require("safe-buffer").Buffer;
      var crypto = global.crypto || global.msCrypto;
      crypto && crypto.getRandomValues ? module.exports = randomBytes : module.exports = oldBrowser;
      function randomBytes(size, cb) {
        if (size > MAX_UINT32) throw new RangeError("requested too many random bytes");
        var bytes = Buffer.allocUnsafe(size);
        if (size > 0) if (size > MAX_BYTES) for (var generated = 0; generated < size; generated += MAX_BYTES) crypto.getRandomValues(bytes.slice(generated, generated + MAX_BYTES)); else crypto.getRandomValues(bytes);
        if ("function" === typeof cb) return process.nextTick(function() {
          cb(null, bytes);
        });
        return bytes;
      }
    }).call(this, require("_process"), "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    _process: 118,
    "safe-buffer": 143
  } ],
  126: [ function(require, module, exports) {
    (function(process, global) {
      "use strict";
      function oldBrowser() {
        throw new Error("secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11");
      }
      var safeBuffer = require("safe-buffer");
      var randombytes = require("randombytes");
      var Buffer = safeBuffer.Buffer;
      var kBufferMaxLength = safeBuffer.kMaxLength;
      var crypto = global.crypto || global.msCrypto;
      var kMaxUint32 = Math.pow(2, 32) - 1;
      function assertOffset(offset, length) {
        if ("number" !== typeof offset || offset !== offset) throw new TypeError("offset must be a number");
        if (offset > kMaxUint32 || offset < 0) throw new TypeError("offset must be a uint32");
        if (offset > kBufferMaxLength || offset > length) throw new RangeError("offset out of range");
      }
      function assertSize(size, offset, length) {
        if ("number" !== typeof size || size !== size) throw new TypeError("size must be a number");
        if (size > kMaxUint32 || size < 0) throw new TypeError("size must be a uint32");
        if (size + offset > length || size > kBufferMaxLength) throw new RangeError("buffer too small");
      }
      if (crypto && crypto.getRandomValues || !process.browser) {
        exports.randomFill = randomFill;
        exports.randomFillSync = randomFillSync;
      } else {
        exports.randomFill = oldBrowser;
        exports.randomFillSync = oldBrowser;
      }
      function randomFill(buf, offset, size, cb) {
        if (!Buffer.isBuffer(buf) && !(buf instanceof global.Uint8Array)) throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
        if ("function" === typeof offset) {
          cb = offset;
          offset = 0;
          size = buf.length;
        } else if ("function" === typeof size) {
          cb = size;
          size = buf.length - offset;
        } else if ("function" !== typeof cb) throw new TypeError('"cb" argument must be a function');
        assertOffset(offset, buf.length);
        assertSize(size, offset, buf.length);
        return actualFill(buf, offset, size, cb);
      }
      function actualFill(buf, offset, size, cb) {
        if (process.browser) {
          var ourBuf = buf.buffer;
          var uint = new Uint8Array(ourBuf, offset, size);
          crypto.getRandomValues(uint);
          if (cb) {
            process.nextTick(function() {
              cb(null, buf);
            });
            return;
          }
          return buf;
        }
        if (cb) {
          randombytes(size, function(err, bytes) {
            if (err) return cb(err);
            bytes.copy(buf, offset);
            cb(null, buf);
          });
          return;
        }
        var bytes = randombytes(size);
        bytes.copy(buf, offset);
        return buf;
      }
      function randomFillSync(buf, offset, size) {
        "undefined" === typeof offset && (offset = 0);
        if (!Buffer.isBuffer(buf) && !(buf instanceof global.Uint8Array)) throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
        assertOffset(offset, buf.length);
        void 0 === size && (size = buf.length - offset);
        assertSize(size, offset, buf.length);
        return actualFill(buf, offset, size);
      }
    }).call(this, require("_process"), "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    _process: 118,
    randombytes: 125,
    "safe-buffer": 143
  } ],
  127: [ function(require, module, exports) {
    module.exports = require("./lib/_stream_duplex.js");
  }, {
    "./lib/_stream_duplex.js": 128
  } ],
  128: [ function(require, module, exports) {
    "use strict";
    var pna = require("process-nextick-args");
    var objectKeys = Object.keys || function(obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    };
    module.exports = Duplex;
    var util = require("core-util-is");
    util.inherits = require("inherits");
    var Readable = require("./_stream_readable");
    var Writable = require("./_stream_writable");
    util.inherits(Duplex, Readable);
    var keys = objectKeys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      Duplex.prototype[method] || (Duplex.prototype[method] = Writable.prototype[method]);
    }
    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      options && false === options.readable && (this.readable = false);
      options && false === options.writable && (this.writable = false);
      this.allowHalfOpen = true;
      options && false === options.allowHalfOpen && (this.allowHalfOpen = false);
      this.once("end", onend);
    }
    Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._writableState.highWaterMark;
      }
    });
    function onend() {
      if (this.allowHalfOpen || this._writableState.ended) return;
      pna.nextTick(onEndNT, this);
    }
    function onEndNT(self) {
      self.end();
    }
    Object.defineProperty(Duplex.prototype, "destroyed", {
      get: function() {
        if (void 0 === this._readableState || void 0 === this._writableState) return false;
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set: function(value) {
        if (void 0 === this._readableState || void 0 === this._writableState) return;
        this._readableState.destroyed = value;
        this._writableState.destroyed = value;
      }
    });
    Duplex.prototype._destroy = function(err, cb) {
      this.push(null);
      this.end();
      pna.nextTick(cb, err);
    };
  }, {
    "./_stream_readable": 130,
    "./_stream_writable": 132,
    "core-util-is": 50,
    inherits: 101,
    "process-nextick-args": 117
  } ],
  129: [ function(require, module, exports) {
    "use strict";
    module.exports = PassThrough;
    var Transform = require("./_stream_transform");
    var util = require("core-util-is");
    util.inherits = require("inherits");
    util.inherits(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);
      Transform.call(this, options);
    }
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
  }, {
    "./_stream_transform": 131,
    "core-util-is": 50,
    inherits: 101
  } ],
  130: [ function(require, module, exports) {
    (function(process, global) {
      "use strict";
      var pna = require("process-nextick-args");
      module.exports = Readable;
      var isArray = require("isarray");
      var Duplex;
      Readable.ReadableState = ReadableState;
      var EE = require("events").EventEmitter;
      var EElistenerCount = function(emitter, type) {
        return emitter.listeners(type).length;
      };
      var Stream = require("./internal/streams/stream");
      var Buffer = require("safe-buffer").Buffer;
      var OurUint8Array = global.Uint8Array || function() {};
      function _uint8ArrayToBuffer(chunk) {
        return Buffer.from(chunk);
      }
      function _isUint8Array(obj) {
        return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
      }
      var util = require("core-util-is");
      util.inherits = require("inherits");
      var debugUtil = require("util");
      var debug = void 0;
      debug = debugUtil && debugUtil.debuglog ? debugUtil.debuglog("stream") : function() {};
      var BufferList = require("./internal/streams/BufferList");
      var destroyImpl = require("./internal/streams/destroy");
      var StringDecoder;
      util.inherits(Readable, Stream);
      var kProxyEvents = [ "error", "close", "destroy", "pause", "resume" ];
      function prependListener(emitter, event, fn) {
        if ("function" === typeof emitter.prependListener) return emitter.prependListener(event, fn);
        emitter._events && emitter._events[event] ? isArray(emitter._events[event]) ? emitter._events[event].unshift(fn) : emitter._events[event] = [ fn, emitter._events[event] ] : emitter.on(event, fn);
      }
      function ReadableState(options, stream) {
        Duplex = Duplex || require("./_stream_duplex");
        options = options || {};
        var isDuplex = stream instanceof Duplex;
        this.objectMode = !!options.objectMode;
        isDuplex && (this.objectMode = this.objectMode || !!options.readableObjectMode);
        var hwm = options.highWaterMark;
        var readableHwm = options.readableHighWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16384;
        this.highWaterMark = hwm || 0 === hwm ? hwm : isDuplex && (readableHwm || 0 === readableHwm) ? readableHwm : defaultHwm;
        this.highWaterMark = Math.floor(this.highWaterMark);
        this.buffer = new BufferList();
        this.length = 0;
        this.pipes = null;
        this.pipesCount = 0;
        this.flowing = null;
        this.ended = false;
        this.endEmitted = false;
        this.reading = false;
        this.sync = true;
        this.needReadable = false;
        this.emittedReadable = false;
        this.readableListening = false;
        this.resumeScheduled = false;
        this.destroyed = false;
        this.defaultEncoding = options.defaultEncoding || "utf8";
        this.awaitDrain = 0;
        this.readingMore = false;
        this.decoder = null;
        this.encoding = null;
        if (options.encoding) {
          StringDecoder || (StringDecoder = require("string_decoder/").StringDecoder);
          this.decoder = new StringDecoder(options.encoding);
          this.encoding = options.encoding;
        }
      }
      function Readable(options) {
        Duplex = Duplex || require("./_stream_duplex");
        if (!(this instanceof Readable)) return new Readable(options);
        this._readableState = new ReadableState(options, this);
        this.readable = true;
        if (options) {
          "function" === typeof options.read && (this._read = options.read);
          "function" === typeof options.destroy && (this._destroy = options.destroy);
        }
        Stream.call(this);
      }
      Object.defineProperty(Readable.prototype, "destroyed", {
        get: function() {
          if (void 0 === this._readableState) return false;
          return this._readableState.destroyed;
        },
        set: function(value) {
          if (!this._readableState) return;
          this._readableState.destroyed = value;
        }
      });
      Readable.prototype.destroy = destroyImpl.destroy;
      Readable.prototype._undestroy = destroyImpl.undestroy;
      Readable.prototype._destroy = function(err, cb) {
        this.push(null);
        cb(err);
      };
      Readable.prototype.push = function(chunk, encoding) {
        var state = this._readableState;
        var skipChunkCheck;
        if (state.objectMode) skipChunkCheck = true; else if ("string" === typeof chunk) {
          encoding = encoding || state.defaultEncoding;
          if (encoding !== state.encoding) {
            chunk = Buffer.from(chunk, encoding);
            encoding = "";
          }
          skipChunkCheck = true;
        }
        return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
      };
      Readable.prototype.unshift = function(chunk) {
        return readableAddChunk(this, chunk, null, true, false);
      };
      function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
        var state = stream._readableState;
        if (null === chunk) {
          state.reading = false;
          onEofChunk(stream, state);
        } else {
          var er;
          skipChunkCheck || (er = chunkInvalid(state, chunk));
          if (er) stream.emit("error", er); else if (state.objectMode || chunk && chunk.length > 0) {
            "string" === typeof chunk || state.objectMode || Object.getPrototypeOf(chunk) === Buffer.prototype || (chunk = _uint8ArrayToBuffer(chunk));
            if (addToFront) state.endEmitted ? stream.emit("error", new Error("stream.unshift() after end event")) : addChunk(stream, state, chunk, true); else if (state.ended) stream.emit("error", new Error("stream.push() after EOF")); else {
              state.reading = false;
              if (state.decoder && !encoding) {
                chunk = state.decoder.write(chunk);
                state.objectMode || 0 !== chunk.length ? addChunk(stream, state, chunk, false) : maybeReadMore(stream, state);
              } else addChunk(stream, state, chunk, false);
            }
          } else addToFront || (state.reading = false);
        }
        return needMoreData(state);
      }
      function addChunk(stream, state, chunk, addToFront) {
        if (state.flowing && 0 === state.length && !state.sync) {
          stream.emit("data", chunk);
          stream.read(0);
        } else {
          state.length += state.objectMode ? 1 : chunk.length;
          addToFront ? state.buffer.unshift(chunk) : state.buffer.push(chunk);
          state.needReadable && emitReadable(stream);
        }
        maybeReadMore(stream, state);
      }
      function chunkInvalid(state, chunk) {
        var er;
        _isUint8Array(chunk) || "string" === typeof chunk || void 0 === chunk || state.objectMode || (er = new TypeError("Invalid non-string/buffer chunk"));
        return er;
      }
      function needMoreData(state) {
        return !state.ended && (state.needReadable || state.length < state.highWaterMark || 0 === state.length);
      }
      Readable.prototype.isPaused = function() {
        return false === this._readableState.flowing;
      };
      Readable.prototype.setEncoding = function(enc) {
        StringDecoder || (StringDecoder = require("string_decoder/").StringDecoder);
        this._readableState.decoder = new StringDecoder(enc);
        this._readableState.encoding = enc;
        return this;
      };
      var MAX_HWM = 8388608;
      function computeNewHighWaterMark(n) {
        if (n >= MAX_HWM) n = MAX_HWM; else {
          n--;
          n |= n >>> 1;
          n |= n >>> 2;
          n |= n >>> 4;
          n |= n >>> 8;
          n |= n >>> 16;
          n++;
        }
        return n;
      }
      function howMuchToRead(n, state) {
        if (n <= 0 || 0 === state.length && state.ended) return 0;
        if (state.objectMode) return 1;
        if (n !== n) return state.flowing && state.length ? state.buffer.head.data.length : state.length;
        n > state.highWaterMark && (state.highWaterMark = computeNewHighWaterMark(n));
        if (n <= state.length) return n;
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        }
        return state.length;
      }
      Readable.prototype.read = function(n) {
        debug("read", n);
        n = parseInt(n, 10);
        var state = this._readableState;
        var nOrig = n;
        0 !== n && (state.emittedReadable = false);
        if (0 === n && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
          debug("read: emitReadable", state.length, state.ended);
          0 === state.length && state.ended ? endReadable(this) : emitReadable(this);
          return null;
        }
        n = howMuchToRead(n, state);
        if (0 === n && state.ended) {
          0 === state.length && endReadable(this);
          return null;
        }
        var doRead = state.needReadable;
        debug("need readable", doRead);
        if (0 === state.length || state.length - n < state.highWaterMark) {
          doRead = true;
          debug("length less than watermark", doRead);
        }
        if (state.ended || state.reading) {
          doRead = false;
          debug("reading or ended", doRead);
        } else if (doRead) {
          debug("do read");
          state.reading = true;
          state.sync = true;
          0 === state.length && (state.needReadable = true);
          this._read(state.highWaterMark);
          state.sync = false;
          state.reading || (n = howMuchToRead(nOrig, state));
        }
        var ret;
        ret = n > 0 ? fromList(n, state) : null;
        if (null === ret) {
          state.needReadable = true;
          n = 0;
        } else state.length -= n;
        if (0 === state.length) {
          state.ended || (state.needReadable = true);
          nOrig !== n && state.ended && endReadable(this);
        }
        null !== ret && this.emit("data", ret);
        return ret;
      };
      function onEofChunk(stream, state) {
        if (state.ended) return;
        if (state.decoder) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length) {
            state.buffer.push(chunk);
            state.length += state.objectMode ? 1 : chunk.length;
          }
        }
        state.ended = true;
        emitReadable(stream);
      }
      function emitReadable(stream) {
        var state = stream._readableState;
        state.needReadable = false;
        if (!state.emittedReadable) {
          debug("emitReadable", state.flowing);
          state.emittedReadable = true;
          state.sync ? pna.nextTick(emitReadable_, stream) : emitReadable_(stream);
        }
      }
      function emitReadable_(stream) {
        debug("emit readable");
        stream.emit("readable");
        flow(stream);
      }
      function maybeReadMore(stream, state) {
        if (!state.readingMore) {
          state.readingMore = true;
          pna.nextTick(maybeReadMore_, stream, state);
        }
      }
      function maybeReadMore_(stream, state) {
        var len = state.length;
        while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
          debug("maybeReadMore read 0");
          stream.read(0);
          if (len === state.length) break;
          len = state.length;
        }
        state.readingMore = false;
      }
      Readable.prototype._read = function(n) {
        this.emit("error", new Error("_read() is not implemented"));
      };
      Readable.prototype.pipe = function(dest, pipeOpts) {
        var src = this;
        var state = this._readableState;
        switch (state.pipesCount) {
         case 0:
          state.pipes = dest;
          break;

         case 1:
          state.pipes = [ state.pipes, dest ];
          break;

         default:
          state.pipes.push(dest);
        }
        state.pipesCount += 1;
        debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
        var doEnd = (!pipeOpts || false !== pipeOpts.end) && dest !== process.stdout && dest !== process.stderr;
        var endFn = doEnd ? onend : unpipe;
        state.endEmitted ? pna.nextTick(endFn) : src.once("end", endFn);
        dest.on("unpipe", onunpipe);
        function onunpipe(readable, unpipeInfo) {
          debug("onunpipe");
          if (readable === src && unpipeInfo && false === unpipeInfo.hasUnpiped) {
            unpipeInfo.hasUnpiped = true;
            cleanup();
          }
        }
        function onend() {
          debug("onend");
          dest.end();
        }
        var ondrain = pipeOnDrain(src);
        dest.on("drain", ondrain);
        var cleanedUp = false;
        function cleanup() {
          debug("cleanup");
          dest.removeListener("close", onclose);
          dest.removeListener("finish", onfinish);
          dest.removeListener("drain", ondrain);
          dest.removeListener("error", onerror);
          dest.removeListener("unpipe", onunpipe);
          src.removeListener("end", onend);
          src.removeListener("end", unpipe);
          src.removeListener("data", ondata);
          cleanedUp = true;
          !state.awaitDrain || dest._writableState && !dest._writableState.needDrain || ondrain();
        }
        var increasedAwaitDrain = false;
        src.on("data", ondata);
        function ondata(chunk) {
          debug("ondata");
          increasedAwaitDrain = false;
          var ret = dest.write(chunk);
          if (false === ret && !increasedAwaitDrain) {
            if ((1 === state.pipesCount && state.pipes === dest || state.pipesCount > 1 && -1 !== indexOf(state.pipes, dest)) && !cleanedUp) {
              debug("false write response, pause", src._readableState.awaitDrain);
              src._readableState.awaitDrain++;
              increasedAwaitDrain = true;
            }
            src.pause();
          }
        }
        function onerror(er) {
          debug("onerror", er);
          unpipe();
          dest.removeListener("error", onerror);
          0 === EElistenerCount(dest, "error") && dest.emit("error", er);
        }
        prependListener(dest, "error", onerror);
        function onclose() {
          dest.removeListener("finish", onfinish);
          unpipe();
        }
        dest.once("close", onclose);
        function onfinish() {
          debug("onfinish");
          dest.removeListener("close", onclose);
          unpipe();
        }
        dest.once("finish", onfinish);
        function unpipe() {
          debug("unpipe");
          src.unpipe(dest);
        }
        dest.emit("pipe", src);
        if (!state.flowing) {
          debug("pipe resume");
          src.resume();
        }
        return dest;
      };
      function pipeOnDrain(src) {
        return function() {
          var state = src._readableState;
          debug("pipeOnDrain", state.awaitDrain);
          state.awaitDrain && state.awaitDrain--;
          if (0 === state.awaitDrain && EElistenerCount(src, "data")) {
            state.flowing = true;
            flow(src);
          }
        };
      }
      Readable.prototype.unpipe = function(dest) {
        var state = this._readableState;
        var unpipeInfo = {
          hasUnpiped: false
        };
        if (0 === state.pipesCount) return this;
        if (1 === state.pipesCount) {
          if (dest && dest !== state.pipes) return this;
          dest || (dest = state.pipes);
          state.pipes = null;
          state.pipesCount = 0;
          state.flowing = false;
          dest && dest.emit("unpipe", this, unpipeInfo);
          return this;
        }
        if (!dest) {
          var dests = state.pipes;
          var len = state.pipesCount;
          state.pipes = null;
          state.pipesCount = 0;
          state.flowing = false;
          for (var i = 0; i < len; i++) dests[i].emit("unpipe", this, unpipeInfo);
          return this;
        }
        var index = indexOf(state.pipes, dest);
        if (-1 === index) return this;
        state.pipes.splice(index, 1);
        state.pipesCount -= 1;
        1 === state.pipesCount && (state.pipes = state.pipes[0]);
        dest.emit("unpipe", this, unpipeInfo);
        return this;
      };
      Readable.prototype.on = function(ev, fn) {
        var res = Stream.prototype.on.call(this, ev, fn);
        if ("data" === ev) false !== this._readableState.flowing && this.resume(); else if ("readable" === ev) {
          var state = this._readableState;
          if (!state.endEmitted && !state.readableListening) {
            state.readableListening = state.needReadable = true;
            state.emittedReadable = false;
            state.reading ? state.length && emitReadable(this) : pna.nextTick(nReadingNextTick, this);
          }
        }
        return res;
      };
      Readable.prototype.addListener = Readable.prototype.on;
      function nReadingNextTick(self) {
        debug("readable nexttick read 0");
        self.read(0);
      }
      Readable.prototype.resume = function() {
        var state = this._readableState;
        if (!state.flowing) {
          debug("resume");
          state.flowing = true;
          resume(this, state);
        }
        return this;
      };
      function resume(stream, state) {
        if (!state.resumeScheduled) {
          state.resumeScheduled = true;
          pna.nextTick(resume_, stream, state);
        }
      }
      function resume_(stream, state) {
        if (!state.reading) {
          debug("resume read 0");
          stream.read(0);
        }
        state.resumeScheduled = false;
        state.awaitDrain = 0;
        stream.emit("resume");
        flow(stream);
        state.flowing && !state.reading && stream.read(0);
      }
      Readable.prototype.pause = function() {
        debug("call pause flowing=%j", this._readableState.flowing);
        if (false !== this._readableState.flowing) {
          debug("pause");
          this._readableState.flowing = false;
          this.emit("pause");
        }
        return this;
      };
      function flow(stream) {
        var state = stream._readableState;
        debug("flow", state.flowing);
        while (state.flowing && null !== stream.read()) ;
      }
      Readable.prototype.wrap = function(stream) {
        var _this = this;
        var state = this._readableState;
        var paused = false;
        stream.on("end", function() {
          debug("wrapped end");
          if (state.decoder && !state.ended) {
            var chunk = state.decoder.end();
            chunk && chunk.length && _this.push(chunk);
          }
          _this.push(null);
        });
        stream.on("data", function(chunk) {
          debug("wrapped data");
          state.decoder && (chunk = state.decoder.write(chunk));
          if (state.objectMode && (null === chunk || void 0 === chunk)) return;
          if (!state.objectMode && (!chunk || !chunk.length)) return;
          var ret = _this.push(chunk);
          if (!ret) {
            paused = true;
            stream.pause();
          }
        });
        for (var i in stream) void 0 === this[i] && "function" === typeof stream[i] && (this[i] = function(method) {
          return function() {
            return stream[method].apply(stream, arguments);
          };
        }(i));
        for (var n = 0; n < kProxyEvents.length; n++) stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
        this._read = function(n) {
          debug("wrapped _read", n);
          if (paused) {
            paused = false;
            stream.resume();
          }
        };
        return this;
      };
      Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
        enumerable: false,
        get: function() {
          return this._readableState.highWaterMark;
        }
      });
      Readable._fromList = fromList;
      function fromList(n, state) {
        if (0 === state.length) return null;
        var ret;
        if (state.objectMode) ret = state.buffer.shift(); else if (!n || n >= state.length) {
          ret = state.decoder ? state.buffer.join("") : 1 === state.buffer.length ? state.buffer.head.data : state.buffer.concat(state.length);
          state.buffer.clear();
        } else ret = fromListPartial(n, state.buffer, state.decoder);
        return ret;
      }
      function fromListPartial(n, list, hasStrings) {
        var ret;
        if (n < list.head.data.length) {
          ret = list.head.data.slice(0, n);
          list.head.data = list.head.data.slice(n);
        } else ret = n === list.head.data.length ? list.shift() : hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
        return ret;
      }
      function copyFromBufferString(n, list) {
        var p = list.head;
        var c = 1;
        var ret = p.data;
        n -= ret.length;
        while (p = p.next) {
          var str = p.data;
          var nb = n > str.length ? str.length : n;
          nb === str.length ? ret += str : ret += str.slice(0, n);
          n -= nb;
          if (0 === n) {
            if (nb === str.length) {
              ++c;
              p.next ? list.head = p.next : list.head = list.tail = null;
            } else {
              list.head = p;
              p.data = str.slice(nb);
            }
            break;
          }
          ++c;
        }
        list.length -= c;
        return ret;
      }
      function copyFromBuffer(n, list) {
        var ret = Buffer.allocUnsafe(n);
        var p = list.head;
        var c = 1;
        p.data.copy(ret);
        n -= p.data.length;
        while (p = p.next) {
          var buf = p.data;
          var nb = n > buf.length ? buf.length : n;
          buf.copy(ret, ret.length - n, 0, nb);
          n -= nb;
          if (0 === n) {
            if (nb === buf.length) {
              ++c;
              p.next ? list.head = p.next : list.head = list.tail = null;
            } else {
              list.head = p;
              p.data = buf.slice(nb);
            }
            break;
          }
          ++c;
        }
        list.length -= c;
        return ret;
      }
      function endReadable(stream) {
        var state = stream._readableState;
        if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');
        if (!state.endEmitted) {
          state.ended = true;
          pna.nextTick(endReadableNT, state, stream);
        }
      }
      function endReadableNT(state, stream) {
        if (!state.endEmitted && 0 === state.length) {
          state.endEmitted = true;
          stream.readable = false;
          stream.emit("end");
        }
      }
      function indexOf(xs, x) {
        for (var i = 0, l = xs.length; i < l; i++) if (xs[i] === x) return i;
        return -1;
      }
    }).call(this, require("_process"), "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    "./_stream_duplex": 128,
    "./internal/streams/BufferList": 133,
    "./internal/streams/destroy": 134,
    "./internal/streams/stream": 135,
    _process: 118,
    "core-util-is": 50,
    events: 83,
    inherits: 101,
    isarray: 136,
    "process-nextick-args": 117,
    "safe-buffer": 143,
    "string_decoder/": 137,
    util: 18
  } ],
  131: [ function(require, module, exports) {
    "use strict";
    module.exports = Transform;
    var Duplex = require("./_stream_duplex");
    var util = require("core-util-is");
    util.inherits = require("inherits");
    util.inherits(Transform, Duplex);
    function afterTransform(er, data) {
      var ts = this._transformState;
      ts.transforming = false;
      var cb = ts.writecb;
      if (!cb) return this.emit("error", new Error("write callback called multiple times"));
      ts.writechunk = null;
      ts.writecb = null;
      null != data && this.push(data);
      cb(er);
      var rs = this._readableState;
      rs.reading = false;
      (rs.needReadable || rs.length < rs.highWaterMark) && this._read(rs.highWaterMark);
    }
    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);
      Duplex.call(this, options);
      this._transformState = {
        afterTransform: afterTransform.bind(this),
        needTransform: false,
        transforming: false,
        writecb: null,
        writechunk: null,
        writeencoding: null
      };
      this._readableState.needReadable = true;
      this._readableState.sync = false;
      if (options) {
        "function" === typeof options.transform && (this._transform = options.transform);
        "function" === typeof options.flush && (this._flush = options.flush);
      }
      this.on("prefinish", prefinish);
    }
    function prefinish() {
      var _this = this;
      "function" === typeof this._flush ? this._flush(function(er, data) {
        done(_this, er, data);
      }) : done(this, null, null);
    }
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error("_transform() is not implemented");
    };
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) && this._read(rs.highWaterMark);
      }
    };
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
      if (null !== ts.writechunk && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else ts.needTransform = true;
    };
    Transform.prototype._destroy = function(err, cb) {
      var _this2 = this;
      Duplex.prototype._destroy.call(this, err, function(err2) {
        cb(err2);
        _this2.emit("close");
      });
    };
    function done(stream, er, data) {
      if (er) return stream.emit("error", er);
      null != data && stream.push(data);
      if (stream._writableState.length) throw new Error("Calling transform done when ws.length != 0");
      if (stream._transformState.transforming) throw new Error("Calling transform done when still transforming");
      return stream.push(null);
    }
  }, {
    "./_stream_duplex": 128,
    "core-util-is": 50,
    inherits: 101
  } ],
  132: [ function(require, module, exports) {
    (function(process, global) {
      "use strict";
      var pna = require("process-nextick-args");
      module.exports = Writable;
      function WriteReq(chunk, encoding, cb) {
        this.chunk = chunk;
        this.encoding = encoding;
        this.callback = cb;
        this.next = null;
      }
      function CorkedRequest(state) {
        var _this = this;
        this.next = null;
        this.entry = null;
        this.finish = function() {
          onCorkedFinish(_this, state);
        };
      }
      var asyncWrite = !process.browser && [ "v0.10", "v0.9." ].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
      var Duplex;
      Writable.WritableState = WritableState;
      var util = require("core-util-is");
      util.inherits = require("inherits");
      var internalUtil = {
        deprecate: require("util-deprecate")
      };
      var Stream = require("./internal/streams/stream");
      var Buffer = require("safe-buffer").Buffer;
      var OurUint8Array = global.Uint8Array || function() {};
      function _uint8ArrayToBuffer(chunk) {
        return Buffer.from(chunk);
      }
      function _isUint8Array(obj) {
        return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
      }
      var destroyImpl = require("./internal/streams/destroy");
      util.inherits(Writable, Stream);
      function nop() {}
      function WritableState(options, stream) {
        Duplex = Duplex || require("./_stream_duplex");
        options = options || {};
        var isDuplex = stream instanceof Duplex;
        this.objectMode = !!options.objectMode;
        isDuplex && (this.objectMode = this.objectMode || !!options.writableObjectMode);
        var hwm = options.highWaterMark;
        var writableHwm = options.writableHighWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16384;
        this.highWaterMark = hwm || 0 === hwm ? hwm : isDuplex && (writableHwm || 0 === writableHwm) ? writableHwm : defaultHwm;
        this.highWaterMark = Math.floor(this.highWaterMark);
        this.finalCalled = false;
        this.needDrain = false;
        this.ending = false;
        this.ended = false;
        this.finished = false;
        this.destroyed = false;
        var noDecode = false === options.decodeStrings;
        this.decodeStrings = !noDecode;
        this.defaultEncoding = options.defaultEncoding || "utf8";
        this.length = 0;
        this.writing = false;
        this.corked = 0;
        this.sync = true;
        this.bufferProcessing = false;
        this.onwrite = function(er) {
          onwrite(stream, er);
        };
        this.writecb = null;
        this.writelen = 0;
        this.bufferedRequest = null;
        this.lastBufferedRequest = null;
        this.pendingcb = 0;
        this.prefinished = false;
        this.errorEmitted = false;
        this.bufferedRequestCount = 0;
        this.corkedRequestsFree = new CorkedRequest(this);
      }
      WritableState.prototype.getBuffer = function getBuffer() {
        var current = this.bufferedRequest;
        var out = [];
        while (current) {
          out.push(current);
          current = current.next;
        }
        return out;
      };
      (function() {
        try {
          Object.defineProperty(WritableState.prototype, "buffer", {
            get: internalUtil.deprecate(function() {
              return this.getBuffer();
            }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
          });
        } catch (_) {}
      })();
      var realHasInstance;
      if ("function" === typeof Symbol && Symbol.hasInstance && "function" === typeof Function.prototype[Symbol.hasInstance]) {
        realHasInstance = Function.prototype[Symbol.hasInstance];
        Object.defineProperty(Writable, Symbol.hasInstance, {
          value: function(object) {
            if (realHasInstance.call(this, object)) return true;
            if (this !== Writable) return false;
            return object && object._writableState instanceof WritableState;
          }
        });
      } else realHasInstance = function(object) {
        return object instanceof this;
      };
      function Writable(options) {
        Duplex = Duplex || require("./_stream_duplex");
        if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) return new Writable(options);
        this._writableState = new WritableState(options, this);
        this.writable = true;
        if (options) {
          "function" === typeof options.write && (this._write = options.write);
          "function" === typeof options.writev && (this._writev = options.writev);
          "function" === typeof options.destroy && (this._destroy = options.destroy);
          "function" === typeof options.final && (this._final = options.final);
        }
        Stream.call(this);
      }
      Writable.prototype.pipe = function() {
        this.emit("error", new Error("Cannot pipe, not readable"));
      };
      function writeAfterEnd(stream, cb) {
        var er = new Error("write after end");
        stream.emit("error", er);
        pna.nextTick(cb, er);
      }
      function validChunk(stream, state, chunk, cb) {
        var valid = true;
        var er = false;
        null === chunk ? er = new TypeError("May not write null values to stream") : "string" === typeof chunk || void 0 === chunk || state.objectMode || (er = new TypeError("Invalid non-string/buffer chunk"));
        if (er) {
          stream.emit("error", er);
          pna.nextTick(cb, er);
          valid = false;
        }
        return valid;
      }
      Writable.prototype.write = function(chunk, encoding, cb) {
        var state = this._writableState;
        var ret = false;
        var isBuf = !state.objectMode && _isUint8Array(chunk);
        isBuf && !Buffer.isBuffer(chunk) && (chunk = _uint8ArrayToBuffer(chunk));
        if ("function" === typeof encoding) {
          cb = encoding;
          encoding = null;
        }
        isBuf ? encoding = "buffer" : encoding || (encoding = state.defaultEncoding);
        "function" !== typeof cb && (cb = nop);
        if (state.ended) writeAfterEnd(this, cb); else if (isBuf || validChunk(this, state, chunk, cb)) {
          state.pendingcb++;
          ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
        }
        return ret;
      };
      Writable.prototype.cork = function() {
        var state = this._writableState;
        state.corked++;
      };
      Writable.prototype.uncork = function() {
        var state = this._writableState;
        if (state.corked) {
          state.corked--;
          state.writing || state.corked || state.finished || state.bufferProcessing || !state.bufferedRequest || clearBuffer(this, state);
        }
      };
      Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
        "string" === typeof encoding && (encoding = encoding.toLowerCase());
        if (!([ "hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw" ].indexOf((encoding + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + encoding);
        this._writableState.defaultEncoding = encoding;
        return this;
      };
      function decodeChunk(state, chunk, encoding) {
        state.objectMode || false === state.decodeStrings || "string" !== typeof chunk || (chunk = Buffer.from(chunk, encoding));
        return chunk;
      }
      Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
        enumerable: false,
        get: function() {
          return this._writableState.highWaterMark;
        }
      });
      function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
        if (!isBuf) {
          var newChunk = decodeChunk(state, chunk, encoding);
          if (chunk !== newChunk) {
            isBuf = true;
            encoding = "buffer";
            chunk = newChunk;
          }
        }
        var len = state.objectMode ? 1 : chunk.length;
        state.length += len;
        var ret = state.length < state.highWaterMark;
        ret || (state.needDrain = true);
        if (state.writing || state.corked) {
          var last = state.lastBufferedRequest;
          state.lastBufferedRequest = {
            chunk: chunk,
            encoding: encoding,
            isBuf: isBuf,
            callback: cb,
            next: null
          };
          last ? last.next = state.lastBufferedRequest : state.bufferedRequest = state.lastBufferedRequest;
          state.bufferedRequestCount += 1;
        } else doWrite(stream, state, false, len, chunk, encoding, cb);
        return ret;
      }
      function doWrite(stream, state, writev, len, chunk, encoding, cb) {
        state.writelen = len;
        state.writecb = cb;
        state.writing = true;
        state.sync = true;
        writev ? stream._writev(chunk, state.onwrite) : stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
      }
      function onwriteError(stream, state, sync, er, cb) {
        --state.pendingcb;
        if (sync) {
          pna.nextTick(cb, er);
          pna.nextTick(finishMaybe, stream, state);
          stream._writableState.errorEmitted = true;
          stream.emit("error", er);
        } else {
          cb(er);
          stream._writableState.errorEmitted = true;
          stream.emit("error", er);
          finishMaybe(stream, state);
        }
      }
      function onwriteStateUpdate(state) {
        state.writing = false;
        state.writecb = null;
        state.length -= state.writelen;
        state.writelen = 0;
      }
      function onwrite(stream, er) {
        var state = stream._writableState;
        var sync = state.sync;
        var cb = state.writecb;
        onwriteStateUpdate(state);
        if (er) onwriteError(stream, state, sync, er, cb); else {
          var finished = needFinish(state);
          finished || state.corked || state.bufferProcessing || !state.bufferedRequest || clearBuffer(stream, state);
          sync ? asyncWrite(afterWrite, stream, state, finished, cb) : afterWrite(stream, state, finished, cb);
        }
      }
      function afterWrite(stream, state, finished, cb) {
        finished || onwriteDrain(stream, state);
        state.pendingcb--;
        cb();
        finishMaybe(stream, state);
      }
      function onwriteDrain(stream, state) {
        if (0 === state.length && state.needDrain) {
          state.needDrain = false;
          stream.emit("drain");
        }
      }
      function clearBuffer(stream, state) {
        state.bufferProcessing = true;
        var entry = state.bufferedRequest;
        if (stream._writev && entry && entry.next) {
          var l = state.bufferedRequestCount;
          var buffer = new Array(l);
          var holder = state.corkedRequestsFree;
          holder.entry = entry;
          var count = 0;
          var allBuffers = true;
          while (entry) {
            buffer[count] = entry;
            entry.isBuf || (allBuffers = false);
            entry = entry.next;
            count += 1;
          }
          buffer.allBuffers = allBuffers;
          doWrite(stream, state, true, state.length, buffer, "", holder.finish);
          state.pendingcb++;
          state.lastBufferedRequest = null;
          if (holder.next) {
            state.corkedRequestsFree = holder.next;
            holder.next = null;
          } else state.corkedRequestsFree = new CorkedRequest(state);
          state.bufferedRequestCount = 0;
        } else {
          while (entry) {
            var chunk = entry.chunk;
            var encoding = entry.encoding;
            var cb = entry.callback;
            var len = state.objectMode ? 1 : chunk.length;
            doWrite(stream, state, false, len, chunk, encoding, cb);
            entry = entry.next;
            state.bufferedRequestCount--;
            if (state.writing) break;
          }
          null === entry && (state.lastBufferedRequest = null);
        }
        state.bufferedRequest = entry;
        state.bufferProcessing = false;
      }
      Writable.prototype._write = function(chunk, encoding, cb) {
        cb(new Error("_write() is not implemented"));
      };
      Writable.prototype._writev = null;
      Writable.prototype.end = function(chunk, encoding, cb) {
        var state = this._writableState;
        if ("function" === typeof chunk) {
          cb = chunk;
          chunk = null;
          encoding = null;
        } else if ("function" === typeof encoding) {
          cb = encoding;
          encoding = null;
        }
        null !== chunk && void 0 !== chunk && this.write(chunk, encoding);
        if (state.corked) {
          state.corked = 1;
          this.uncork();
        }
        state.ending || state.finished || endWritable(this, state, cb);
      };
      function needFinish(state) {
        return state.ending && 0 === state.length && null === state.bufferedRequest && !state.finished && !state.writing;
      }
      function callFinal(stream, state) {
        stream._final(function(err) {
          state.pendingcb--;
          err && stream.emit("error", err);
          state.prefinished = true;
          stream.emit("prefinish");
          finishMaybe(stream, state);
        });
      }
      function prefinish(stream, state) {
        if (!state.prefinished && !state.finalCalled) if ("function" === typeof stream._final) {
          state.pendingcb++;
          state.finalCalled = true;
          pna.nextTick(callFinal, stream, state);
        } else {
          state.prefinished = true;
          stream.emit("prefinish");
        }
      }
      function finishMaybe(stream, state) {
        var need = needFinish(state);
        if (need) {
          prefinish(stream, state);
          if (0 === state.pendingcb) {
            state.finished = true;
            stream.emit("finish");
          }
        }
        return need;
      }
      function endWritable(stream, state, cb) {
        state.ending = true;
        finishMaybe(stream, state);
        cb && (state.finished ? pna.nextTick(cb) : stream.once("finish", cb));
        state.ended = true;
        stream.writable = false;
      }
      function onCorkedFinish(corkReq, state, err) {
        var entry = corkReq.entry;
        corkReq.entry = null;
        while (entry) {
          var cb = entry.callback;
          state.pendingcb--;
          cb(err);
          entry = entry.next;
        }
        state.corkedRequestsFree ? state.corkedRequestsFree.next = corkReq : state.corkedRequestsFree = corkReq;
      }
      Object.defineProperty(Writable.prototype, "destroyed", {
        get: function() {
          if (void 0 === this._writableState) return false;
          return this._writableState.destroyed;
        },
        set: function(value) {
          if (!this._writableState) return;
          this._writableState.destroyed = value;
        }
      });
      Writable.prototype.destroy = destroyImpl.destroy;
      Writable.prototype._undestroy = destroyImpl.undestroy;
      Writable.prototype._destroy = function(err, cb) {
        this.end();
        cb(err);
      };
    }).call(this, require("_process"), "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    "./_stream_duplex": 128,
    "./internal/streams/destroy": 134,
    "./internal/streams/stream": 135,
    _process: 118,
    "core-util-is": 50,
    inherits: 101,
    "process-nextick-args": 117,
    "safe-buffer": 143,
    "util-deprecate": 154
  } ],
  133: [ function(require, module, exports) {
    "use strict";
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) throw new TypeError("Cannot call a class as a function");
    }
    var Buffer = require("safe-buffer").Buffer;
    var util = require("util");
    function copyBuffer(src, target, offset) {
      src.copy(target, offset);
    }
    module.exports = function() {
      function BufferList() {
        _classCallCheck(this, BufferList);
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      BufferList.prototype.push = function push(v) {
        var entry = {
          data: v,
          next: null
        };
        this.length > 0 ? this.tail.next = entry : this.head = entry;
        this.tail = entry;
        ++this.length;
      };
      BufferList.prototype.unshift = function unshift(v) {
        var entry = {
          data: v,
          next: this.head
        };
        0 === this.length && (this.tail = entry);
        this.head = entry;
        ++this.length;
      };
      BufferList.prototype.shift = function shift() {
        if (0 === this.length) return;
        var ret = this.head.data;
        1 === this.length ? this.head = this.tail = null : this.head = this.head.next;
        --this.length;
        return ret;
      };
      BufferList.prototype.clear = function clear() {
        this.head = this.tail = null;
        this.length = 0;
      };
      BufferList.prototype.join = function join(s) {
        if (0 === this.length) return "";
        var p = this.head;
        var ret = "" + p.data;
        while (p = p.next) ret += s + p.data;
        return ret;
      };
      BufferList.prototype.concat = function concat(n) {
        if (0 === this.length) return Buffer.alloc(0);
        if (1 === this.length) return this.head.data;
        var ret = Buffer.allocUnsafe(n >>> 0);
        var p = this.head;
        var i = 0;
        while (p) {
          copyBuffer(p.data, ret, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      };
      return BufferList;
    }();
    util && util.inspect && util.inspect.custom && (module.exports.prototype[util.inspect.custom] = function() {
      var obj = util.inspect({
        length: this.length
      });
      return this.constructor.name + " " + obj;
    });
  }, {
    "safe-buffer": 143,
    util: 18
  } ],
  134: [ function(require, module, exports) {
    "use strict";
    var pna = require("process-nextick-args");
    function destroy(err, cb) {
      var _this = this;
      var readableDestroyed = this._readableState && this._readableState.destroyed;
      var writableDestroyed = this._writableState && this._writableState.destroyed;
      if (readableDestroyed || writableDestroyed) {
        cb ? cb(err) : !err || this._writableState && this._writableState.errorEmitted || pna.nextTick(emitErrorNT, this, err);
        return this;
      }
      this._readableState && (this._readableState.destroyed = true);
      this._writableState && (this._writableState.destroyed = true);
      this._destroy(err || null, function(err) {
        if (!cb && err) {
          pna.nextTick(emitErrorNT, _this, err);
          _this._writableState && (_this._writableState.errorEmitted = true);
        } else cb && cb(err);
      });
      return this;
    }
    function undestroy() {
      if (this._readableState) {
        this._readableState.destroyed = false;
        this._readableState.reading = false;
        this._readableState.ended = false;
        this._readableState.endEmitted = false;
      }
      if (this._writableState) {
        this._writableState.destroyed = false;
        this._writableState.ended = false;
        this._writableState.ending = false;
        this._writableState.finished = false;
        this._writableState.errorEmitted = false;
      }
    }
    function emitErrorNT(self, err) {
      self.emit("error", err);
    }
    module.exports = {
      destroy: destroy,
      undestroy: undestroy
    };
  }, {
    "process-nextick-args": 117
  } ],
  135: [ function(require, module, exports) {
    module.exports = require("events").EventEmitter;
  }, {
    events: 83
  } ],
  136: [ function(require, module, exports) {
    arguments[4][48][0].apply(exports, arguments);
  }, {
    dup: 48
  } ],
  137: [ function(require, module, exports) {
    "use strict";
    var Buffer = require("safe-buffer").Buffer;
    var isEncoding = Buffer.isEncoding || function(encoding) {
      encoding = "" + encoding;
      switch (encoding && encoding.toLowerCase()) {
       case "hex":
       case "utf8":
       case "utf-8":
       case "ascii":
       case "binary":
       case "base64":
       case "ucs2":
       case "ucs-2":
       case "utf16le":
       case "utf-16le":
       case "raw":
        return true;

       default:
        return false;
      }
    };
    function _normalizeEncoding(enc) {
      if (!enc) return "utf8";
      var retried;
      while (true) switch (enc) {
       case "utf8":
       case "utf-8":
        return "utf8";

       case "ucs2":
       case "ucs-2":
       case "utf16le":
       case "utf-16le":
        return "utf16le";

       case "latin1":
       case "binary":
        return "latin1";

       case "base64":
       case "ascii":
       case "hex":
        return enc;

       default:
        if (retried) return;
        enc = ("" + enc).toLowerCase();
        retried = true;
      }
    }
    function normalizeEncoding(enc) {
      var nenc = _normalizeEncoding(enc);
      if ("string" !== typeof nenc && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error("Unknown encoding: " + enc);
      return nenc || enc;
    }
    exports.StringDecoder = StringDecoder;
    function StringDecoder(encoding) {
      this.encoding = normalizeEncoding(encoding);
      var nb;
      switch (this.encoding) {
       case "utf16le":
        this.text = utf16Text;
        this.end = utf16End;
        nb = 4;
        break;

       case "utf8":
        this.fillLast = utf8FillLast;
        nb = 4;
        break;

       case "base64":
        this.text = base64Text;
        this.end = base64End;
        nb = 3;
        break;

       default:
        this.write = simpleWrite;
        this.end = simpleEnd;
        return;
      }
      this.lastNeed = 0;
      this.lastTotal = 0;
      this.lastChar = Buffer.allocUnsafe(nb);
    }
    StringDecoder.prototype.write = function(buf) {
      if (0 === buf.length) return "";
      var r;
      var i;
      if (this.lastNeed) {
        r = this.fillLast(buf);
        if (void 0 === r) return "";
        i = this.lastNeed;
        this.lastNeed = 0;
      } else i = 0;
      if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
      return r || "";
    };
    StringDecoder.prototype.end = utf8End;
    StringDecoder.prototype.text = utf8Text;
    StringDecoder.prototype.fillLast = function(buf) {
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
      this.lastNeed -= buf.length;
    };
    function utf8CheckByte(byte) {
      if (byte <= 127) return 0;
      if (byte >> 5 === 6) return 2;
      if (byte >> 4 === 14) return 3;
      if (byte >> 3 === 30) return 4;
      return byte >> 6 === 2 ? -1 : -2;
    }
    function utf8CheckIncomplete(self, buf, i) {
      var j = buf.length - 1;
      if (j < i) return 0;
      var nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        nb > 0 && (self.lastNeed = nb - 1);
        return nb;
      }
      if (--j < i || -2 === nb) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        nb > 0 && (self.lastNeed = nb - 2);
        return nb;
      }
      if (--j < i || -2 === nb) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        nb > 0 && (2 === nb ? nb = 0 : self.lastNeed = nb - 3);
        return nb;
      }
      return 0;
    }
    function utf8CheckExtraBytes(self, buf, p) {
      if (128 !== (192 & buf[0])) {
        self.lastNeed = 0;
        return "\ufffd";
      }
      if (self.lastNeed > 1 && buf.length > 1) {
        if (128 !== (192 & buf[1])) {
          self.lastNeed = 1;
          return "\ufffd";
        }
        if (self.lastNeed > 2 && buf.length > 2 && 128 !== (192 & buf[2])) {
          self.lastNeed = 2;
          return "\ufffd";
        }
      }
    }
    function utf8FillLast(buf) {
      var p = this.lastTotal - this.lastNeed;
      var r = utf8CheckExtraBytes(this, buf, p);
      if (void 0 !== r) return r;
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, p, 0, buf.length);
      this.lastNeed -= buf.length;
    }
    function utf8Text(buf, i) {
      var total = utf8CheckIncomplete(this, buf, i);
      if (!this.lastNeed) return buf.toString("utf8", i);
      this.lastTotal = total;
      var end = buf.length - (total - this.lastNeed);
      buf.copy(this.lastChar, 0, end);
      return buf.toString("utf8", i, end);
    }
    function utf8End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) return r + "\ufffd";
      return r;
    }
    function utf16Text(buf, i) {
      if ((buf.length - i) % 2 === 0) {
        var r = buf.toString("utf16le", i);
        if (r) {
          var c = r.charCodeAt(r.length - 1);
          if (c >= 55296 && c <= 56319) {
            this.lastNeed = 2;
            this.lastTotal = 4;
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
            return r.slice(0, -1);
          }
        }
        return r;
      }
      this.lastNeed = 1;
      this.lastTotal = 2;
      this.lastChar[0] = buf[buf.length - 1];
      return buf.toString("utf16le", i, buf.length - 1);
    }
    function utf16End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) {
        var end = this.lastTotal - this.lastNeed;
        return r + this.lastChar.toString("utf16le", 0, end);
      }
      return r;
    }
    function base64Text(buf, i) {
      var n = (buf.length - i) % 3;
      if (0 === n) return buf.toString("base64", i);
      this.lastNeed = 3 - n;
      this.lastTotal = 3;
      if (1 === n) this.lastChar[0] = buf[buf.length - 1]; else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
      }
      return buf.toString("base64", i, buf.length - n);
    }
    function base64End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
      return r;
    }
    function simpleWrite(buf) {
      return buf.toString(this.encoding);
    }
    function simpleEnd(buf) {
      return buf && buf.length ? this.write(buf) : "";
    }
  }, {
    "safe-buffer": 143
  } ],
  138: [ function(require, module, exports) {
    module.exports = require("./readable").PassThrough;
  }, {
    "./readable": 139
  } ],
  139: [ function(require, module, exports) {
    exports = module.exports = require("./lib/_stream_readable.js");
    exports.Stream = exports;
    exports.Readable = exports;
    exports.Writable = require("./lib/_stream_writable.js");
    exports.Duplex = require("./lib/_stream_duplex.js");
    exports.Transform = require("./lib/_stream_transform.js");
    exports.PassThrough = require("./lib/_stream_passthrough.js");
  }, {
    "./lib/_stream_duplex.js": 128,
    "./lib/_stream_passthrough.js": 129,
    "./lib/_stream_readable.js": 130,
    "./lib/_stream_transform.js": 131,
    "./lib/_stream_writable.js": 132
  } ],
  140: [ function(require, module, exports) {
    module.exports = require("./readable").Transform;
  }, {
    "./readable": 139
  } ],
  141: [ function(require, module, exports) {
    module.exports = require("./lib/_stream_writable.js");
  }, {
    "./lib/_stream_writable.js": 132
  } ],
  142: [ function(require, module, exports) {
    "use strict";
    var Buffer = require("buffer").Buffer;
    var inherits = require("inherits");
    var HashBase = require("hash-base");
    var ARRAY16 = new Array(16);
    var zl = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13 ];
    var zr = [ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11 ];
    var sl = [ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6 ];
    var sr = [ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ];
    var hl = [ 0, 1518500249, 1859775393, 2400959708, 2840853838 ];
    var hr = [ 1352829926, 1548603684, 1836072691, 2053994217, 0 ];
    function RIPEMD160() {
      HashBase.call(this, 64);
      this._a = 1732584193;
      this._b = 4023233417;
      this._c = 2562383102;
      this._d = 271733878;
      this._e = 3285377520;
    }
    inherits(RIPEMD160, HashBase);
    RIPEMD160.prototype._update = function() {
      var words = ARRAY16;
      for (var j = 0; j < 16; ++j) words[j] = this._block.readInt32LE(4 * j);
      var al = 0 | this._a;
      var bl = 0 | this._b;
      var cl = 0 | this._c;
      var dl = 0 | this._d;
      var el = 0 | this._e;
      var ar = 0 | this._a;
      var br = 0 | this._b;
      var cr = 0 | this._c;
      var dr = 0 | this._d;
      var er = 0 | this._e;
      for (var i = 0; i < 80; i += 1) {
        var tl;
        var tr;
        if (i < 16) {
          tl = fn1(al, bl, cl, dl, el, words[zl[i]], hl[0], sl[i]);
          tr = fn5(ar, br, cr, dr, er, words[zr[i]], hr[0], sr[i]);
        } else if (i < 32) {
          tl = fn2(al, bl, cl, dl, el, words[zl[i]], hl[1], sl[i]);
          tr = fn4(ar, br, cr, dr, er, words[zr[i]], hr[1], sr[i]);
        } else if (i < 48) {
          tl = fn3(al, bl, cl, dl, el, words[zl[i]], hl[2], sl[i]);
          tr = fn3(ar, br, cr, dr, er, words[zr[i]], hr[2], sr[i]);
        } else if (i < 64) {
          tl = fn4(al, bl, cl, dl, el, words[zl[i]], hl[3], sl[i]);
          tr = fn2(ar, br, cr, dr, er, words[zr[i]], hr[3], sr[i]);
        } else {
          tl = fn5(al, bl, cl, dl, el, words[zl[i]], hl[4], sl[i]);
          tr = fn1(ar, br, cr, dr, er, words[zr[i]], hr[4], sr[i]);
        }
        al = el;
        el = dl;
        dl = rotl(cl, 10);
        cl = bl;
        bl = tl;
        ar = er;
        er = dr;
        dr = rotl(cr, 10);
        cr = br;
        br = tr;
      }
      var t = this._b + cl + dr | 0;
      this._b = this._c + dl + er | 0;
      this._c = this._d + el + ar | 0;
      this._d = this._e + al + br | 0;
      this._e = this._a + bl + cr | 0;
      this._a = t;
    };
    RIPEMD160.prototype._digest = function() {
      this._block[this._blockOffset++] = 128;
      if (this._blockOffset > 56) {
        this._block.fill(0, this._blockOffset, 64);
        this._update();
        this._blockOffset = 0;
      }
      this._block.fill(0, this._blockOffset, 56);
      this._block.writeUInt32LE(this._length[0], 56);
      this._block.writeUInt32LE(this._length[1], 60);
      this._update();
      var buffer = Buffer.alloc ? Buffer.alloc(20) : new Buffer(20);
      buffer.writeInt32LE(this._a, 0);
      buffer.writeInt32LE(this._b, 4);
      buffer.writeInt32LE(this._c, 8);
      buffer.writeInt32LE(this._d, 12);
      buffer.writeInt32LE(this._e, 16);
      return buffer;
    };
    function rotl(x, n) {
      return x << n | x >>> 32 - n;
    }
    function fn1(a, b, c, d, e, m, k, s) {
      return rotl(a + (b ^ c ^ d) + m + k | 0, s) + e | 0;
    }
    function fn2(a, b, c, d, e, m, k, s) {
      return rotl(a + (b & c | ~b & d) + m + k | 0, s) + e | 0;
    }
    function fn3(a, b, c, d, e, m, k, s) {
      return rotl(a + ((b | ~c) ^ d) + m + k | 0, s) + e | 0;
    }
    function fn4(a, b, c, d, e, m, k, s) {
      return rotl(a + (b & d | c & ~d) + m + k | 0, s) + e | 0;
    }
    function fn5(a, b, c, d, e, m, k, s) {
      return rotl(a + (b ^ (c | ~d)) + m + k | 0, s) + e | 0;
    }
    module.exports = RIPEMD160;
  }, {
    buffer: 47,
    "hash-base": 85,
    inherits: 101
  } ],
  143: [ function(require, module, exports) {
    var buffer = require("buffer");
    var Buffer = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) dst[key] = src[key];
    }
    if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) module.exports = buffer; else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer(arg, encodingOrOffset, length);
    }
    copyProps(Buffer, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if ("number" === typeof arg) throw new TypeError("Argument must not be a number");
      return Buffer(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if ("number" !== typeof size) throw new TypeError("Argument must be a number");
      var buf = Buffer(size);
      void 0 !== fill ? "string" === typeof encoding ? buf.fill(fill, encoding) : buf.fill(fill) : buf.fill(0);
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if ("number" !== typeof size) throw new TypeError("Argument must be a number");
      return Buffer(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if ("number" !== typeof size) throw new TypeError("Argument must be a number");
      return buffer.SlowBuffer(size);
    };
  }, {
    buffer: 47
  } ],
  144: [ function(require, module, exports) {
    var Buffer = require("safe-buffer").Buffer;
    function Hash(blockSize, finalSize) {
      this._block = Buffer.alloc(blockSize);
      this._finalSize = finalSize;
      this._blockSize = blockSize;
      this._len = 0;
    }
    Hash.prototype.update = function(data, enc) {
      if ("string" === typeof data) {
        enc = enc || "utf8";
        data = Buffer.from(data, enc);
      }
      var block = this._block;
      var blockSize = this._blockSize;
      var length = data.length;
      var accum = this._len;
      for (var offset = 0; offset < length; ) {
        var assigned = accum % blockSize;
        var remainder = Math.min(length - offset, blockSize - assigned);
        for (var i = 0; i < remainder; i++) block[assigned + i] = data[offset + i];
        accum += remainder;
        offset += remainder;
        accum % blockSize === 0 && this._update(block);
      }
      this._len += length;
      return this;
    };
    Hash.prototype.digest = function(enc) {
      var rem = this._len % this._blockSize;
      this._block[rem] = 128;
      this._block.fill(0, rem + 1);
      if (rem >= this._finalSize) {
        this._update(this._block);
        this._block.fill(0);
      }
      var bits = 8 * this._len;
      if (bits <= 4294967295) this._block.writeUInt32BE(bits, this._blockSize - 4); else {
        var lowBits = (4294967295 & bits) >>> 0;
        var highBits = (bits - lowBits) / 4294967296;
        this._block.writeUInt32BE(highBits, this._blockSize - 8);
        this._block.writeUInt32BE(lowBits, this._blockSize - 4);
      }
      this._update(this._block);
      var hash = this._hash();
      return enc ? hash.toString(enc) : hash;
    };
    Hash.prototype._update = function() {
      throw new Error("_update must be implemented by subclass");
    };
    module.exports = Hash;
  }, {
    "safe-buffer": 143
  } ],
  145: [ function(require, module, exports) {
    var exports = module.exports = function SHA(algorithm) {
      algorithm = algorithm.toLowerCase();
      var Algorithm = exports[algorithm];
      if (!Algorithm) throw new Error(algorithm + " is not supported (we accept pull requests)");
      return new Algorithm();
    };
    exports.sha = require("./sha");
    exports.sha1 = require("./sha1");
    exports.sha224 = require("./sha224");
    exports.sha256 = require("./sha256");
    exports.sha384 = require("./sha384");
    exports.sha512 = require("./sha512");
  }, {
    "./sha": 146,
    "./sha1": 147,
    "./sha224": 148,
    "./sha256": 149,
    "./sha384": 150,
    "./sha512": 151
  } ],
  146: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var K = [ 1518500249, 1859775393, -1894007588, -899497514 ];
    var W = new Array(80);
    function Sha() {
      this.init();
      this._w = W;
      Hash.call(this, 64, 56);
    }
    inherits(Sha, Hash);
    Sha.prototype.init = function() {
      this._a = 1732584193;
      this._b = 4023233417;
      this._c = 2562383102;
      this._d = 271733878;
      this._e = 3285377520;
      return this;
    };
    function rotl5(num) {
      return num << 5 | num >>> 27;
    }
    function rotl30(num) {
      return num << 30 | num >>> 2;
    }
    function ft(s, b, c, d) {
      if (0 === s) return b & c | ~b & d;
      if (2 === s) return b & c | b & d | c & d;
      return b ^ c ^ d;
    }
    Sha.prototype._update = function(M) {
      var W = this._w;
      var a = 0 | this._a;
      var b = 0 | this._b;
      var c = 0 | this._c;
      var d = 0 | this._d;
      var e = 0 | this._e;
      for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(4 * i);
      for (;i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
      for (var j = 0; j < 80; ++j) {
        var s = ~~(j / 20);
        var t = rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s] | 0;
        e = d;
        d = c;
        c = rotl30(b);
        b = a;
        a = t;
      }
      this._a = a + this._a | 0;
      this._b = b + this._b | 0;
      this._c = c + this._c | 0;
      this._d = d + this._d | 0;
      this._e = e + this._e | 0;
    };
    Sha.prototype._hash = function() {
      var H = Buffer.allocUnsafe(20);
      H.writeInt32BE(0 | this._a, 0);
      H.writeInt32BE(0 | this._b, 4);
      H.writeInt32BE(0 | this._c, 8);
      H.writeInt32BE(0 | this._d, 12);
      H.writeInt32BE(0 | this._e, 16);
      return H;
    };
    module.exports = Sha;
  }, {
    "./hash": 144,
    inherits: 101,
    "safe-buffer": 143
  } ],
  147: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var K = [ 1518500249, 1859775393, -1894007588, -899497514 ];
    var W = new Array(80);
    function Sha1() {
      this.init();
      this._w = W;
      Hash.call(this, 64, 56);
    }
    inherits(Sha1, Hash);
    Sha1.prototype.init = function() {
      this._a = 1732584193;
      this._b = 4023233417;
      this._c = 2562383102;
      this._d = 271733878;
      this._e = 3285377520;
      return this;
    };
    function rotl1(num) {
      return num << 1 | num >>> 31;
    }
    function rotl5(num) {
      return num << 5 | num >>> 27;
    }
    function rotl30(num) {
      return num << 30 | num >>> 2;
    }
    function ft(s, b, c, d) {
      if (0 === s) return b & c | ~b & d;
      if (2 === s) return b & c | b & d | c & d;
      return b ^ c ^ d;
    }
    Sha1.prototype._update = function(M) {
      var W = this._w;
      var a = 0 | this._a;
      var b = 0 | this._b;
      var c = 0 | this._c;
      var d = 0 | this._d;
      var e = 0 | this._e;
      for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(4 * i);
      for (;i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]);
      for (var j = 0; j < 80; ++j) {
        var s = ~~(j / 20);
        var t = rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s] | 0;
        e = d;
        d = c;
        c = rotl30(b);
        b = a;
        a = t;
      }
      this._a = a + this._a | 0;
      this._b = b + this._b | 0;
      this._c = c + this._c | 0;
      this._d = d + this._d | 0;
      this._e = e + this._e | 0;
    };
    Sha1.prototype._hash = function() {
      var H = Buffer.allocUnsafe(20);
      H.writeInt32BE(0 | this._a, 0);
      H.writeInt32BE(0 | this._b, 4);
      H.writeInt32BE(0 | this._c, 8);
      H.writeInt32BE(0 | this._d, 12);
      H.writeInt32BE(0 | this._e, 16);
      return H;
    };
    module.exports = Sha1;
  }, {
    "./hash": 144,
    inherits: 101,
    "safe-buffer": 143
  } ],
  148: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Sha256 = require("./sha256");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var W = new Array(64);
    function Sha224() {
      this.init();
      this._w = W;
      Hash.call(this, 64, 56);
    }
    inherits(Sha224, Sha256);
    Sha224.prototype.init = function() {
      this._a = 3238371032;
      this._b = 914150663;
      this._c = 812702999;
      this._d = 4144912697;
      this._e = 4290775857;
      this._f = 1750603025;
      this._g = 1694076839;
      this._h = 3204075428;
      return this;
    };
    Sha224.prototype._hash = function() {
      var H = Buffer.allocUnsafe(28);
      H.writeInt32BE(this._a, 0);
      H.writeInt32BE(this._b, 4);
      H.writeInt32BE(this._c, 8);
      H.writeInt32BE(this._d, 12);
      H.writeInt32BE(this._e, 16);
      H.writeInt32BE(this._f, 20);
      H.writeInt32BE(this._g, 24);
      return H;
    };
    module.exports = Sha224;
  }, {
    "./hash": 144,
    "./sha256": 149,
    inherits: 101,
    "safe-buffer": 143
  } ],
  149: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var K = [ 1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298 ];
    var W = new Array(64);
    function Sha256() {
      this.init();
      this._w = W;
      Hash.call(this, 64, 56);
    }
    inherits(Sha256, Hash);
    Sha256.prototype.init = function() {
      this._a = 1779033703;
      this._b = 3144134277;
      this._c = 1013904242;
      this._d = 2773480762;
      this._e = 1359893119;
      this._f = 2600822924;
      this._g = 528734635;
      this._h = 1541459225;
      return this;
    };
    function ch(x, y, z) {
      return z ^ x & (y ^ z);
    }
    function maj(x, y, z) {
      return x & y | z & (x | y);
    }
    function sigma0(x) {
      return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10);
    }
    function sigma1(x) {
      return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7);
    }
    function gamma0(x) {
      return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ x >>> 3;
    }
    function gamma1(x) {
      return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ x >>> 10;
    }
    Sha256.prototype._update = function(M) {
      var W = this._w;
      var a = 0 | this._a;
      var b = 0 | this._b;
      var c = 0 | this._c;
      var d = 0 | this._d;
      var e = 0 | this._e;
      var f = 0 | this._f;
      var g = 0 | this._g;
      var h = 0 | this._h;
      for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(4 * i);
      for (;i < 64; ++i) W[i] = gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16] | 0;
      for (var j = 0; j < 64; ++j) {
        var T1 = h + sigma1(e) + ch(e, f, g) + K[j] + W[j] | 0;
        var T2 = sigma0(a) + maj(a, b, c) | 0;
        h = g;
        g = f;
        f = e;
        e = d + T1 | 0;
        d = c;
        c = b;
        b = a;
        a = T1 + T2 | 0;
      }
      this._a = a + this._a | 0;
      this._b = b + this._b | 0;
      this._c = c + this._c | 0;
      this._d = d + this._d | 0;
      this._e = e + this._e | 0;
      this._f = f + this._f | 0;
      this._g = g + this._g | 0;
      this._h = h + this._h | 0;
    };
    Sha256.prototype._hash = function() {
      var H = Buffer.allocUnsafe(32);
      H.writeInt32BE(this._a, 0);
      H.writeInt32BE(this._b, 4);
      H.writeInt32BE(this._c, 8);
      H.writeInt32BE(this._d, 12);
      H.writeInt32BE(this._e, 16);
      H.writeInt32BE(this._f, 20);
      H.writeInt32BE(this._g, 24);
      H.writeInt32BE(this._h, 28);
      return H;
    };
    module.exports = Sha256;
  }, {
    "./hash": 144,
    inherits: 101,
    "safe-buffer": 143
  } ],
  150: [ function(require, module, exports) {
    var inherits = require("inherits");
    var SHA512 = require("./sha512");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var W = new Array(160);
    function Sha384() {
      this.init();
      this._w = W;
      Hash.call(this, 128, 112);
    }
    inherits(Sha384, SHA512);
    Sha384.prototype.init = function() {
      this._ah = 3418070365;
      this._bh = 1654270250;
      this._ch = 2438529370;
      this._dh = 355462360;
      this._eh = 1731405415;
      this._fh = 2394180231;
      this._gh = 3675008525;
      this._hh = 1203062813;
      this._al = 3238371032;
      this._bl = 914150663;
      this._cl = 812702999;
      this._dl = 4144912697;
      this._el = 4290775857;
      this._fl = 1750603025;
      this._gl = 1694076839;
      this._hl = 3204075428;
      return this;
    };
    Sha384.prototype._hash = function() {
      var H = Buffer.allocUnsafe(48);
      function writeInt64BE(h, l, offset) {
        H.writeInt32BE(h, offset);
        H.writeInt32BE(l, offset + 4);
      }
      writeInt64BE(this._ah, this._al, 0);
      writeInt64BE(this._bh, this._bl, 8);
      writeInt64BE(this._ch, this._cl, 16);
      writeInt64BE(this._dh, this._dl, 24);
      writeInt64BE(this._eh, this._el, 32);
      writeInt64BE(this._fh, this._fl, 40);
      return H;
    };
    module.exports = Sha384;
  }, {
    "./hash": 144,
    "./sha512": 151,
    inherits: 101,
    "safe-buffer": 143
  } ],
  151: [ function(require, module, exports) {
    var inherits = require("inherits");
    var Hash = require("./hash");
    var Buffer = require("safe-buffer").Buffer;
    var K = [ 1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591 ];
    var W = new Array(160);
    function Sha512() {
      this.init();
      this._w = W;
      Hash.call(this, 128, 112);
    }
    inherits(Sha512, Hash);
    Sha512.prototype.init = function() {
      this._ah = 1779033703;
      this._bh = 3144134277;
      this._ch = 1013904242;
      this._dh = 2773480762;
      this._eh = 1359893119;
      this._fh = 2600822924;
      this._gh = 528734635;
      this._hh = 1541459225;
      this._al = 4089235720;
      this._bl = 2227873595;
      this._cl = 4271175723;
      this._dl = 1595750129;
      this._el = 2917565137;
      this._fl = 725511199;
      this._gl = 4215389547;
      this._hl = 327033209;
      return this;
    };
    function Ch(x, y, z) {
      return z ^ x & (y ^ z);
    }
    function maj(x, y, z) {
      return x & y | z & (x | y);
    }
    function sigma0(x, xl) {
      return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25);
    }
    function sigma1(x, xl) {
      return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23);
    }
    function Gamma0(x, xl) {
      return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ x >>> 7;
    }
    function Gamma0l(x, xl) {
      return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25);
    }
    function Gamma1(x, xl) {
      return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ x >>> 6;
    }
    function Gamma1l(x, xl) {
      return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26);
    }
    function getCarry(a, b) {
      return a >>> 0 < b >>> 0 ? 1 : 0;
    }
    Sha512.prototype._update = function(M) {
      var W = this._w;
      var ah = 0 | this._ah;
      var bh = 0 | this._bh;
      var ch = 0 | this._ch;
      var dh = 0 | this._dh;
      var eh = 0 | this._eh;
      var fh = 0 | this._fh;
      var gh = 0 | this._gh;
      var hh = 0 | this._hh;
      var al = 0 | this._al;
      var bl = 0 | this._bl;
      var cl = 0 | this._cl;
      var dl = 0 | this._dl;
      var el = 0 | this._el;
      var fl = 0 | this._fl;
      var gl = 0 | this._gl;
      var hl = 0 | this._hl;
      for (var i = 0; i < 32; i += 2) {
        W[i] = M.readInt32BE(4 * i);
        W[i + 1] = M.readInt32BE(4 * i + 4);
      }
      for (;i < 160; i += 2) {
        var xh = W[i - 30];
        var xl = W[i - 30 + 1];
        var gamma0 = Gamma0(xh, xl);
        var gamma0l = Gamma0l(xl, xh);
        xh = W[i - 4];
        xl = W[i - 4 + 1];
        var gamma1 = Gamma1(xh, xl);
        var gamma1l = Gamma1l(xl, xh);
        var Wi7h = W[i - 14];
        var Wi7l = W[i - 14 + 1];
        var Wi16h = W[i - 32];
        var Wi16l = W[i - 32 + 1];
        var Wil = gamma0l + Wi7l | 0;
        var Wih = gamma0 + Wi7h + getCarry(Wil, gamma0l) | 0;
        Wil = Wil + gamma1l | 0;
        Wih = Wih + gamma1 + getCarry(Wil, gamma1l) | 0;
        Wil = Wil + Wi16l | 0;
        Wih = Wih + Wi16h + getCarry(Wil, Wi16l) | 0;
        W[i] = Wih;
        W[i + 1] = Wil;
      }
      for (var j = 0; j < 160; j += 2) {
        Wih = W[j];
        Wil = W[j + 1];
        var majh = maj(ah, bh, ch);
        var majl = maj(al, bl, cl);
        var sigma0h = sigma0(ah, al);
        var sigma0l = sigma0(al, ah);
        var sigma1h = sigma1(eh, el);
        var sigma1l = sigma1(el, eh);
        var Kih = K[j];
        var Kil = K[j + 1];
        var chh = Ch(eh, fh, gh);
        var chl = Ch(el, fl, gl);
        var t1l = hl + sigma1l | 0;
        var t1h = hh + sigma1h + getCarry(t1l, hl) | 0;
        t1l = t1l + chl | 0;
        t1h = t1h + chh + getCarry(t1l, chl) | 0;
        t1l = t1l + Kil | 0;
        t1h = t1h + Kih + getCarry(t1l, Kil) | 0;
        t1l = t1l + Wil | 0;
        t1h = t1h + Wih + getCarry(t1l, Wil) | 0;
        var t2l = sigma0l + majl | 0;
        var t2h = sigma0h + majh + getCarry(t2l, sigma0l) | 0;
        hh = gh;
        hl = gl;
        gh = fh;
        gl = fl;
        fh = eh;
        fl = el;
        el = dl + t1l | 0;
        eh = dh + t1h + getCarry(el, dl) | 0;
        dh = ch;
        dl = cl;
        ch = bh;
        cl = bl;
        bh = ah;
        bl = al;
        al = t1l + t2l | 0;
        ah = t1h + t2h + getCarry(al, t1l) | 0;
      }
      this._al = this._al + al | 0;
      this._bl = this._bl + bl | 0;
      this._cl = this._cl + cl | 0;
      this._dl = this._dl + dl | 0;
      this._el = this._el + el | 0;
      this._fl = this._fl + fl | 0;
      this._gl = this._gl + gl | 0;
      this._hl = this._hl + hl | 0;
      this._ah = this._ah + ah + getCarry(this._al, al) | 0;
      this._bh = this._bh + bh + getCarry(this._bl, bl) | 0;
      this._ch = this._ch + ch + getCarry(this._cl, cl) | 0;
      this._dh = this._dh + dh + getCarry(this._dl, dl) | 0;
      this._eh = this._eh + eh + getCarry(this._el, el) | 0;
      this._fh = this._fh + fh + getCarry(this._fl, fl) | 0;
      this._gh = this._gh + gh + getCarry(this._gl, gl) | 0;
      this._hh = this._hh + hh + getCarry(this._hl, hl) | 0;
    };
    Sha512.prototype._hash = function() {
      var H = Buffer.allocUnsafe(64);
      function writeInt64BE(h, l, offset) {
        H.writeInt32BE(h, offset);
        H.writeInt32BE(l, offset + 4);
      }
      writeInt64BE(this._ah, this._al, 0);
      writeInt64BE(this._bh, this._bl, 8);
      writeInt64BE(this._ch, this._cl, 16);
      writeInt64BE(this._dh, this._dl, 24);
      writeInt64BE(this._eh, this._el, 32);
      writeInt64BE(this._fh, this._fl, 40);
      writeInt64BE(this._gh, this._gl, 48);
      writeInt64BE(this._hh, this._hl, 56);
      return H;
    };
    module.exports = Sha512;
  }, {
    "./hash": 144,
    inherits: 101,
    "safe-buffer": 143
  } ],
  152: [ function(require, module, exports) {
    module.exports = Stream;
    var EE = require("events").EventEmitter;
    var inherits = require("inherits");
    inherits(Stream, EE);
    Stream.Readable = require("readable-stream/readable.js");
    Stream.Writable = require("readable-stream/writable.js");
    Stream.Duplex = require("readable-stream/duplex.js");
    Stream.Transform = require("readable-stream/transform.js");
    Stream.PassThrough = require("readable-stream/passthrough.js");
    Stream.Stream = Stream;
    function Stream() {
      EE.call(this);
    }
    Stream.prototype.pipe = function(dest, options) {
      var source = this;
      function ondata(chunk) {
        dest.writable && false === dest.write(chunk) && source.pause && source.pause();
      }
      source.on("data", ondata);
      function ondrain() {
        source.readable && source.resume && source.resume();
      }
      dest.on("drain", ondrain);
      if (!dest._isStdio && (!options || false !== options.end)) {
        source.on("end", onend);
        source.on("close", onclose);
      }
      var didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;
        dest.end();
      }
      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;
        "function" === typeof dest.destroy && dest.destroy();
      }
      function onerror(er) {
        cleanup();
        if (0 === EE.listenerCount(this, "error")) throw er;
      }
      source.on("error", onerror);
      dest.on("error", onerror);
      function cleanup() {
        source.removeListener("data", ondata);
        dest.removeListener("drain", ondrain);
        source.removeListener("end", onend);
        source.removeListener("close", onclose);
        source.removeListener("error", onerror);
        dest.removeListener("error", onerror);
        source.removeListener("end", cleanup);
        source.removeListener("close", cleanup);
        dest.removeListener("close", cleanup);
      }
      source.on("end", cleanup);
      source.on("close", cleanup);
      dest.on("close", cleanup);
      dest.emit("pipe", source);
      return dest;
    };
  }, {
    events: 83,
    inherits: 101,
    "readable-stream/duplex.js": 127,
    "readable-stream/passthrough.js": 138,
    "readable-stream/readable.js": 139,
    "readable-stream/transform.js": 140,
    "readable-stream/writable.js": 141
  } ],
  153: [ function(require, module, exports) {
    var Buffer = require("buffer").Buffer;
    var isBufferEncoding = Buffer.isEncoding || function(encoding) {
      switch (encoding && encoding.toLowerCase()) {
       case "hex":
       case "utf8":
       case "utf-8":
       case "ascii":
       case "binary":
       case "base64":
       case "ucs2":
       case "ucs-2":
       case "utf16le":
       case "utf-16le":
       case "raw":
        return true;

       default:
        return false;
      }
    };
    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) throw new Error("Unknown encoding: " + encoding);
    }
    var StringDecoder = exports.StringDecoder = function(encoding) {
      this.encoding = (encoding || "utf8").toLowerCase().replace(/[-_]/, "");
      assertEncoding(encoding);
      switch (this.encoding) {
       case "utf8":
        this.surrogateSize = 3;
        break;

       case "ucs2":
       case "utf16le":
        this.surrogateSize = 2;
        this.detectIncompleteChar = utf16DetectIncompleteChar;
        break;

       case "base64":
        this.surrogateSize = 3;
        this.detectIncompleteChar = base64DetectIncompleteChar;
        break;

       default:
        this.write = passThroughWrite;
        return;
      }
      this.charBuffer = new Buffer(6);
      this.charReceived = 0;
      this.charLength = 0;
    };
    StringDecoder.prototype.write = function(buffer) {
      var charStr = "";
      while (this.charLength) {
        var available = buffer.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : buffer.length;
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;
        if (this.charReceived < this.charLength) return "";
        buffer = buffer.slice(available, buffer.length);
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 55296 && charCode <= 56319) {
          this.charLength += this.surrogateSize;
          charStr = "";
          continue;
        }
        this.charReceived = this.charLength = 0;
        if (0 === buffer.length) return charStr;
        break;
      }
      this.detectIncompleteChar(buffer);
      var end = buffer.length;
      if (this.charLength) {
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }
      charStr += buffer.toString(this.encoding, 0, end);
      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      if (charCode >= 55296 && charCode <= 56319) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }
      return charStr;
    };
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      var i = buffer.length >= 3 ? 3 : buffer.length;
      for (;i > 0; i--) {
        var c = buffer[buffer.length - i];
        if (1 == i && c >> 5 == 6) {
          this.charLength = 2;
          break;
        }
        if (i <= 2 && c >> 4 == 14) {
          this.charLength = 3;
          break;
        }
        if (i <= 3 && c >> 3 == 30) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };
    StringDecoder.prototype.end = function(buffer) {
      var res = "";
      buffer && buffer.length && (res = this.write(buffer));
      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }
      return res;
    };
    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }
    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }
    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }
  }, {
    buffer: 47
  } ],
  154: [ function(require, module, exports) {
    (function(global) {
      module.exports = deprecate;
      function deprecate(fn, msg) {
        if (config("noDeprecation")) return fn;
        var warned = false;
        function deprecated() {
          if (!warned) {
            if (config("throwDeprecation")) throw new Error(msg);
            config("traceDeprecation") ? console.trace(msg) : console.warn(msg);
            warned = true;
          }
          return fn.apply(this, arguments);
        }
        return deprecated;
      }
      function config(name) {
        try {
          if (!global.localStorage) return false;
        } catch (_) {
          return false;
        }
        var val = global.localStorage[name];
        if (null == val) return false;
        return "true" === String(val).toLowerCase();
      }
    }).call(this, "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {} ],
  155: [ function(require, module, exports) {
    var indexOf = require("indexof");
    var Object_keys = function(obj) {
      if (Object.keys) return Object.keys(obj);
      var res = [];
      for (var key in obj) res.push(key);
      return res;
    };
    var forEach = function(xs, fn) {
      if (xs.forEach) return xs.forEach(fn);
      for (var i = 0; i < xs.length; i++) fn(xs[i], i, xs);
    };
    var defineProp = function() {
      try {
        Object.defineProperty({}, "_", {});
        return function(obj, name, value) {
          Object.defineProperty(obj, name, {
            writable: true,
            enumerable: false,
            configurable: true,
            value: value
          });
        };
      } catch (e) {
        return function(obj, name, value) {
          obj[name] = value;
        };
      }
    }();
    var globals = [ "Array", "Boolean", "Date", "Error", "EvalError", "Function", "Infinity", "JSON", "Math", "NaN", "Number", "Object", "RangeError", "ReferenceError", "RegExp", "String", "SyntaxError", "TypeError", "URIError", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "undefined", "unescape" ];
    function Context() {}
    Context.prototype = {};
    var Script = exports.Script = function NodeScript(code) {
      if (!(this instanceof Script)) return new Script(code);
      this.code = code;
    };
    Script.prototype.runInContext = function(context) {
      if (!(context instanceof Context)) throw new TypeError("needs a 'context' argument.");
      var iframe = document.createElement("iframe");
      iframe.style || (iframe.style = {});
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      var win = iframe.contentWindow;
      var wEval = win.eval, wExecScript = win.execScript;
      if (!wEval && wExecScript) {
        wExecScript.call(win, "null");
        wEval = win.eval;
      }
      forEach(Object_keys(context), function(key) {
        win[key] = context[key];
      });
      forEach(globals, function(key) {
        context[key] && (win[key] = context[key]);
      });
      var winKeys = Object_keys(win);
      var res = wEval.call(win, this.code);
      forEach(Object_keys(win), function(key) {
        (key in context || -1 === indexOf(winKeys, key)) && (context[key] = win[key]);
      });
      forEach(globals, function(key) {
        key in context || defineProp(context, key, win[key]);
      });
      document.body.removeChild(iframe);
      return res;
    };
    Script.prototype.runInThisContext = function() {
      return eval(this.code);
    };
    Script.prototype.runInNewContext = function(context) {
      var ctx = Script.createContext(context);
      var res = this.runInContext(ctx);
      forEach(Object_keys(ctx), function(key) {
        context[key] = ctx[key];
      });
      return res;
    };
    forEach(Object_keys(Script.prototype), function(name) {
      exports[name] = Script[name] = function(code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
      };
    });
    exports.createScript = function(code) {
      return exports.Script(code);
    };
    exports.createContext = Script.createContext = function(context) {
      var copy = new Context();
      "object" === typeof context && forEach(Object_keys(context), function(key) {
        copy[key] = context[key];
      });
      return copy;
    };
  }, {
    indexof: 100
  } ],
  AFLogger: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "25e69AZ0/xDH7MCLjFyNBxu", "AFLogger");
    "use strict";
    var PACKAGENAMEFB = "com/zygame/utils/AFHelper";
    cc.Class({
      statics: {
        logEventLevel: function logEventLevel(level) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "trackEventLevel", "(I)V", level);
          cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("AppsFlyerHelper", "trackEventLevel", level);
        },
        logEventWatchAds: function logEventWatchAds(adName) {
          cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAMEFB, "trackEventWatchAD", "(Ljava/lang/String;)V", adName) : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("AppsFlyerHelper", "trackEventWatchAds", adName);
        },
        logEventClickButton: function logEventClickButton(btName) {
          cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAMEFB, "trackEventClickButton", "(Ljava/lang/String;)V", btName) : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("AppsFlyerHelper", "trackEventClickButton", btName);
        },
        logEvent: function logEvent(key, value) {
          cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAMEFB, "trackEvent", "(Ljava/lang/String;Ljava/lang/String;)V", key, value) : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("AppsFlyerHelper", "trackEvent:withValue:", key, value);
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  AdHelper: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "68c65uC/Q5J/qrAibYnfzMi", "AdHelper");
    "use strict";
    var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    var AdHelper = cc.Class({
      statics: {
        initAdSdk: function initAdSdk() {
          101 == CHANNEL_ID || 102 == CHANNEL_ID ? zy.UpltvHelper.initUpltv(function(ret) {
            cc.log("===upltv init: " + ret);
            ret && zy.UpltvHelper.setloadRdADCb();
          }) : 201 == CHANNEL_ID || 202 == CHANNEL_ID;
        },
        isInterstitialReady: function isInterstitialReady(placeId) {
          if (101 == CHANNEL_ID || 102 == CHANNEL_ID) return zy.UpltvHelper.isInterstitialReady(placeId);
          if (201 == CHANNEL_ID || 202 == CHANNEL_ID) return zy.OpenAdsHelper.isIntersitialReady(placeId);
        },
        showInterstitialAds: function showInterstitialAds(placeId) {
          if (101 == CHANNEL_ID || 102 == CHANNEL_ID) {
            zy.UpltvHelper.showInterstitial(placeId, null);
            zy.LogHelper.logEventWatchAds(placeId);
          } else if (201 == CHANNEL_ID || 202 == CHANNEL_ID) {
            zy.OpenAdsHelper.showInterstitialAds(placeId);
            zy.LogHelper.logEventWatchAds(placeId);
          }
        },
        isRdAdsReady: function isRdAdsReady(placeId) {
          if (101 == CHANNEL_ID || 102 == CHANNEL_ID) return zy.UpltvHelper.rdADIsReady();
          if (201 == CHANNEL_ID || 202 == CHANNEL_ID) return zy.OpenAdsHelper.isRdAdsReady(placeId);
        },
        showRdAds: function showRdAds(placeId, cb) {
          this.gotRdCall = cb;
          101 == CHANNEL_ID || 102 == CHANNEL_ID ? zy.UpltvHelper.rdAdShow(placeId) : 201 != CHANNEL_ID && 202 != CHANNEL_ID || zy.OpenAdsHelper.showRdAds(placeId);
          zy.AdHelper.pauseGame();
        },
        onOpenAdsReward: function onOpenAdsReward(placeId, ret) {
          cc.log("===>js\u6536\u5230\u89c6\u9891\u6fc0\u52b1\u56de\u8c03:" + placeId + ", " + ret);
          cc.log("===> typeof ret: " + ("undefined" === typeof ret ? "undefined" : _typeof(ret)));
          if (this.gotRdCall) {
            this.gotRdCall(ret);
            this.gotRdCall = null;
          }
          ret && zy.LogHelper.logEventWatchAds(placeId);
          zy.AdHelper.resumeGame();
        },
        pauseGame: function pauseGame() {
          cc.game.pause();
          zy.audioMng.pauseMusic();
        },
        resumeGame: function resumeGame() {
          cc.game.resume();
          zy.audioMng.resumeMusic();
        }
      }
    });
    zy.AdHelper = AdHelper;
    cc._RF.pop();
  }, {} ],
  Alert: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "9f8e868rNBKE7k8hoS6RoAS", "Alert");
    "use strict";
    cc.Class({
      extends: cc.Component,
      statics: {
        alertNode: null,
        show: function show(params) {
          var _this = this;
          cc.loader.loadRes("prefabs/common/Alert", function(err, pf) {
            if (!err) {
              cc.isValid(_this.alertNode) && _this.alertNode.destroy();
              _this.alertNode = cc.instantiate(pf);
              _this.alertNode.zIndex = zy.constData.ZIndex.ALERT;
              _this.alertNode.parent = zy.director.getUiRoot();
              _this.alertNode.getComponent("Alert").init(params);
            }
          });
        }
      },
      properties: {
        okBtn: cc.Node,
        cancleBtn: cc.Node,
        contentLabel: cc.Label
      },
      init: function init() {
        var params = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {
          text: "",
          okText: "",
          cancleText: null,
          okCb: null,
          cancleCb: null
        };
        this.contentLabel.string = params.text;
        this.okBtn.active = !!params.okText;
        this.okBtn.getComponentInChildren(cc.Label).string = params.okText ? params.okText : i18n.t("btn_ok");
        this.cancleBtn.active = !!params.cancleText;
        this.cancleBtn.getComponentInChildren(cc.Label).string = params.cancleText ? params.cancleText : i18n.t("btn_cancle");
        this.okCb = params.okCb;
        this.cancleCb = params.cancleCb;
        this.contentLabel._forceUpdateRenderData(true);
        var width = this.contentLabel.node.width;
        if (width > 400) {
          this.contentLabel.overflow = cc.Label.Overflow.SHRINK;
          this.contentLabel.node.width = 400;
          this.contentLabel.node.height = 260;
          this.contentLabel.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        }
      },
      confirmCallback: function confirmCallback() {
        this.okCb && this.okCb();
        this.closeCallback();
      },
      cancleCallback: function cancleCallback() {
        this.cancleCb && this.cancleCb();
        this.closeCallback();
      },
      closeCallback: function closeCallback() {
        this.node.destroy();
      },
      clean: function clean() {
        this.node.destroy();
      }
    });
    cc._RF.pop();
  }, {} ],
  Algo: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "d18ccVTPSlPKasd+dtGaYsS", "Algo");
    "use strict";
    var Algo = {};
    Algo.cipher = function(input, w) {
      var Nb = 4;
      var Nr = w.length / Nb - 1;
      var state = [ [], [], [], [] ];
      for (var i = 0; i < 4 * Nb; i++) state[i % 4][Math.floor(i / 4)] = input[i];
      state = Algo.addRoundKey(state, w, 0, Nb);
      for (var round = 1; round < Nr; round++) {
        state = Algo.subBytes(state, Nb);
        state = Algo.shiftRows(state, Nb);
        state = Algo.mixColumns(state, Nb);
        state = Algo.addRoundKey(state, w, round, Nb);
      }
      state = Algo.subBytes(state, Nb);
      state = Algo.shiftRows(state, Nb);
      state = Algo.addRoundKey(state, w, Nr, Nb);
      var output = new Array(4 * Nb);
      for (var _i = 0; _i < 4 * Nb; _i++) output[_i] = state[_i % 4][Math.floor(_i / 4)];
      return output;
    };
    Algo.keyExpansion = function(key) {
      var Nb = 4;
      var Nk = key.length / 4;
      var Nr = Nk + 6;
      var w = new Array(Nb * (Nr + 1));
      var temp = new Array(4);
      for (var i = 0; i < Nk; i++) {
        var r = [ key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3] ];
        w[i] = r;
      }
      for (var _i2 = Nk; _i2 < Nb * (Nr + 1); _i2++) {
        w[_i2] = new Array(4);
        for (var t = 0; t < 4; t++) temp[t] = w[_i2 - 1][t];
        if (_i2 % Nk == 0) {
          temp = Algo.subWord(Algo.rotWord(temp));
          for (var _t = 0; _t < 4; _t++) temp[_t] ^= Algo.rCon[_i2 / Nk][_t];
        } else Nk > 6 && _i2 % Nk == 4 && (temp = Algo.subWord(temp));
        for (var _t2 = 0; _t2 < 4; _t2++) w[_i2][_t2] = w[_i2 - Nk][_t2] ^ temp[_t2];
      }
      return w;
    };
    Algo.subBytes = function(s, Nb) {
      for (var r = 0; r < 4; r++) for (var c = 0; c < Nb; c++) s[r][c] = Algo.sBox[s[r][c]];
      return s;
    };
    Algo.shiftRows = function(s, Nb) {
      var t = new Array(4);
      for (var r = 1; r < 4; r++) {
        for (var c = 0; c < 4; c++) t[c] = s[r][(c + r) % Nb];
        for (var _c = 0; _c < 4; _c++) s[r][_c] = t[_c];
      }
      return s;
    };
    Algo.mixColumns = function(s, Nb) {
      for (var c = 0; c < 4; c++) {
        var a = new Array(4);
        var b = new Array(4);
        for (var i = 0; i < 4; i++) {
          a[i] = s[i][c];
          b[i] = 128 & s[i][c] ? s[i][c] << 1 ^ 283 : s[i][c] << 1;
        }
        s[0][c] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3];
        s[1][c] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3];
        s[2][c] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3];
        s[3][c] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3];
      }
      return s;
    };
    Algo.addRoundKey = function(state, w, rnd, Nb) {
      for (var r = 0; r < 4; r++) for (var c = 0; c < Nb; c++) state[r][c] ^= w[4 * rnd + c][r];
      return state;
    };
    Algo.subWord = function(w) {
      for (var i = 0; i < 4; i++) w[i] = Algo.sBox[w[i]];
      return w;
    };
    Algo.rotWord = function(w) {
      var tmp = w[0];
      for (var i = 0; i < 3; i++) w[i] = w[i + 1];
      w[3] = tmp;
      return w;
    };
    Algo.sBox = [ 99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22 ];
    Algo.rCon = [ [ 0, 0, 0, 0 ], [ 1, 0, 0, 0 ], [ 2, 0, 0, 0 ], [ 4, 0, 0, 0 ], [ 8, 0, 0, 0 ], [ 16, 0, 0, 0 ], [ 32, 0, 0, 0 ], [ 64, 0, 0, 0 ], [ 128, 0, 0, 0 ], [ 27, 0, 0, 0 ], [ 54, 0, 0, 0 ] ];
    "undefined" != typeof module && module.exports && (module.exports = Algo);
    "function" == typeof define && define.amd && define([], function() {
      return Algo;
    });
    cc._RF.pop();
  }, {} ],
  Audio: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "bc426H/sghBCZ8seMku3vc5", "Audio");
    "use strict";
    var BGM = {
      MAIN: "sounds/bgm/main"
    };
    var Effect = {
      CommonClick: "sounds/effect/common_click"
    };
    cc.Class({
      statics: {
        BGM: BGM,
        Effect: Effect,
        init: function init() {
          this.curBGMUrl = null;
          this.curBGMClip = null;
          this.bgmVolume = .9;
          this.effVolume = 1;
          this.bgmEnabled = true;
          this.effEnabled = true;
          var bgmEnabled = cc.sys.localStorage.getItem("bgmEnabled");
          null != bgmEnabled && "false" == bgmEnabled && (this.bgmEnabled = false);
          var bgmVolume = cc.sys.localStorage.getItem("bgmVolume");
          if (null != bgmVolume) {
            this.bgmVolume = parseFloat(bgmVolume);
            cc.audioEngine.setMusicVolume(bgmVolume);
          }
          var effEnabled = cc.sys.localStorage.getItem("effEnabled");
          null != effEnabled && "false" == effEnabled && (this.effEnabled = false);
          var effVolume = cc.sys.localStorage.getItem("effVolume");
          if (null != effVolume) {
            this.effVolume = parseFloat(effVolume);
            cc.audioEngine.setEffectsVolume(effVolume);
          }
        },
        getCurBGMUrl: function getCurBGMUrl() {
          return this.curBGMUrl;
        },
        playBGM: function playBGM(url, force) {
          var _this = this;
          if (this.curBGMUrl && this.curBGMUrl == url && !force) return;
          this.curBGMUrl = url;
          if (!this.bgmEnabled) return;
          this.curBGMClip && this.uncache(this.curBGMClip);
          cc.loader.loadRes(url, cc.AudioClip, function(err, clip) {
            if (!err) {
              _this.curBGMClip = clip;
              cc.audioEngine.playMusic(clip, true);
            }
          });
        },
        pauseBGM: function pauseBGM() {
          cc.audioEngine.pauseMusic();
        },
        resumeBGM: function resumeBGM() {
          cc.audioEngine.resumeMusic();
        },
        stopBGM: function stopBGM() {
          cc.audioEngine.stopMusic();
        },
        playEffect: function playEffect(url) {
          var loop = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
          if (!this.effEnabled) return;
          cc.loader.loadRes(url, cc.AudioClip, function(err, clip) {
            err || cc.audioEngine.playEffect(clip, loop);
          });
        },
        pauseAllEffects: function pauseAllEffects() {
          cc.audioEngine.pauseAllEffects();
        },
        resumeAllEffects: function resumeAllEffects() {
          cc.audioEngine.resumeAllEffects();
        },
        stopALlEffects: function stopALlEffects() {
          cc.audioEngine.stopAllEffects();
        },
        uncache: function uncache(clip) {
          cc.audioEngine.uncache(clip);
        },
        uncacheAll: function uncacheAll() {
          cc.audioEngine.uncacheAll();
        },
        pauseAll: function pauseAll() {
          cc.audioEngine.pauseAll();
        },
        resumeAll: function resumeAll() {
          cc.audioEngine.resumeAll();
        },
        stopAll: function stopAll() {
          cc.audioEngine.stopAll();
        },
        setBGMEnabled: function setBGMEnabled(enabled) {
          if (this.bgmEnabled != enabled) {
            cc.sys.localStorage.setItem("bgmEnabled", String(enabled));
            this.bgmEnabled = enabled;
            true == this.bgmEnabled && null != this.curBGMUrl ? this.playBGM(this.curBGMUrl, true) : this.stopBGM();
          }
        },
        getBGMEnabled: function getBGMEnabled() {
          return this.bgmEnabled;
        },
        setBGMVolume: function setBGMVolume(v) {
          if (this.bgmVolume != v) {
            cc.sys.localStorage.setItem("bgmVolume", v);
            this.bgmVolume = v;
            cc.audioEngine.setMusicVolume(v);
          }
        },
        getBGMVomue: function getBGMVomue() {
          return this.bgmVolume;
        },
        setEffectsEnabled: function setEffectsEnabled(enabled) {
          if (this.effEnabled != enabled) {
            cc.sys.localStorage.setItem("effEnabled", String(enabled));
            this.effEnabled = enabled;
            enabled || this.stopALlEffects();
          }
        },
        getEffectsEnabled: function getEffectsEnabled() {
          return this.effEnabled;
        },
        setEffectsVolume: function setEffectsVolume(v) {
          if (this.effVolume != v) {
            cc.sys.localStorage.setItem("effVolume", v);
            this.effVolume = v;
            cc.audioEngine.setEffectsVolume(this.effVolume);
          }
        },
        getEffectVolume: function getEffectVolume() {
          return this.effVolume;
        },
        clean: function clean() {
          this.stopAll();
          this.uncacheAll();
          this.curBGMUrl = null;
          this.curBGMClip = null;
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  BgColorData: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "73fc8Zfy+RL0IYz9HD/hGyA", "BgColorData");
    "use strict";
    var Utils = require("./../framework/common/UtilsOther");
    var DataBase = require("./DataBase");
    cc.Class({
      extends: DataBase,
      ctor: function ctor() {
        this.fileDir = "config/bgColorData";
        this.lastLevel = 1;
      },
      initData: function initData(data) {
        if (!data) return;
        this.dataObj = data;
        this.dataObj = Utils.arrayToDict(this.dataObj, "id");
      },
      getBgTopColor: function getBgTopColor(level) {
        var data = this.getBgColorData(level);
        var color = data["top"];
        return "#" + color;
      },
      getBgDownColor: function getBgDownColor(level) {
        var data = this.getBgColorData(level);
        var color = data["down"];
        return "#" + color;
      },
      getBgColorData: function getBgColorData(level) {
        var id = this.getBgColorId(level);
        var data = this.dataObj[id];
        return data;
      },
      getBgColorId: function getBgColorId(level) {
        var id = level % 10;
        id = 0 == id ? 10 : id;
        return id;
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/common/UtilsOther": "UtilsOther",
    "./DataBase": "DataBase"
  } ],
  ButtonSafe: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "8e42eou+C1Nna+T44ZKvKRT", "ButtonSafe");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        safeTime: {
          default: .5,
          tooltip: "\u6309\u94ae\u4fdd\u62a4\u65f6\u95f4\uff0c\u6307\u5b9a\u95f4\u9694\u5185\u53ea\u80fd\u70b9\u51fb\u4e00\u6b21."
        }
      },
      start: function start() {
        var _this = this;
        var button = this.getComponent(cc.Button);
        if (!button) return;
        this.clickEvents = button.clickEvents;
        this.node.on("click", function() {
          button.clickEvents = [];
          _this.scheduleOnce(function(dt) {
            button.clickEvents = _this.clickEvents;
          }, _this.safeTime);
        }, this);
      }
    });
    cc._RF.pop();
  }, {} ],
  Button: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "cab9bUXOXBDk6Oo/t2eesSG", "Button");
    "use strict";
    var mat4 = {};
    var _mat4 = function _mat4(m00, m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14, m15) {
      this.m00 = m00;
      this.m01 = m01;
      this.m02 = m02;
      this.m03 = m03;
      this.m04 = m04;
      this.m05 = m05;
      this.m06 = m06;
      this.m07 = m07;
      this.m08 = m08;
      this.m09 = m09;
      this.m10 = m10;
      this.m11 = m11;
      this.m12 = m12;
      this.m13 = m13;
      this.m14 = m14;
      this.m15 = m15;
    };
    mat4.create = function() {
      return new _mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    };
    mat4.invert = function(out, a) {
      var a00 = a.m00, a01 = a.m01, a02 = a.m02, a03 = a.m03, a10 = a.m04, a11 = a.m05, a12 = a.m06, a13 = a.m07, a20 = a.m08, a21 = a.m09, a22 = a.m10, a23 = a.m11, a30 = a.m12, a31 = a.m13, a32 = a.m14, a33 = a.m15;
      var b00 = a00 * a11 - a01 * a10;
      var b01 = a00 * a12 - a02 * a10;
      var b02 = a00 * a13 - a03 * a10;
      var b03 = a01 * a12 - a02 * a11;
      var b04 = a01 * a13 - a03 * a11;
      var b05 = a02 * a13 - a03 * a12;
      var b06 = a20 * a31 - a21 * a30;
      var b07 = a20 * a32 - a22 * a30;
      var b08 = a20 * a33 - a23 * a30;
      var b09 = a21 * a32 - a22 * a31;
      var b10 = a21 * a33 - a23 * a31;
      var b11 = a22 * a33 - a23 * a32;
      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1 / det;
      out.m00 = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out.m01 = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out.m02 = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out.m03 = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out.m04 = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out.m05 = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out.m06 = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out.m07 = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out.m08 = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out.m09 = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out.m10 = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out.m11 = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out.m12 = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out.m13 = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out.m14 = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out.m15 = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    };
    var vec2 = {};
    vec2.transformMat4 = function(out, a, m) {
      var x = a.x, y = a.y;
      out.x = m.m00 * x + m.m04 * y + m.m12;
      out.y = m.m01 * x + m.m05 * y + m.m13;
      return out;
    };
    var math = {
      mat4: mat4,
      vec2: vec2
    };
    var _mat4_temp = math.mat4.create();
    var Button = cc.Class({
      extends: cc.Button,
      statics: {
        createNode: function createNode(params) {
          var node = new cc.Node();
          node.addComponent(zy.Sprite);
          zy.Sprite.updateNode(node, params);
          node.addComponent(zy.Button);
          zy.Button.updateNode(node, params);
          return node;
        },
        updateNode: function updateNode(node, params) {
          var button = node.getComponent(zy.Button);
          button || (button = node.getComponent(cc.Button));
          var eventHandler = params.eventHandler;
          params.hasOwnProperty("touchAction") && (button.touchAction = params.touchAction);
          params.hasOwnProperty("commonClickAudio") && (button.commonClickAudio = params.commonClickAudio);
          if (eventHandler) {
            var clickEventHandler = new cc.Component.EventHandler();
            clickEventHandler.target = eventHandler.target;
            clickEventHandler.component = eventHandler.component;
            clickEventHandler.customEventData = eventHandler.customEventData;
            clickEventHandler.handler = eventHandler.handler;
            button.clickEvents.push(clickEventHandler);
          }
          params.hasOwnProperty("enableAutoGrayEffect") && (button.enableAutoGrayEffect = params.enableAutoGrayEffect);
          params.hasOwnProperty("interactable") && (button.interactable = params.interactable);
          zy.Node.updateNode(node, params);
        }
      },
      properties: {
        touchAction: {
          override: true,
          default: true,
          tooltip: "display custom action"
        },
        commonClickAudio: {
          default: true,
          tooltip: "common click audio"
        },
        isPolygonCollider: {
          default: false,
          tooltip: "is polygon collider"
        },
        polygonPoints: {
          visible: function visible() {
            return true === this.isPolygonCollider;
          },
          tooltip: false,
          default: function _default() {
            return [];
          },
          type: [ cc.Vec2 ]
        },
        brightTargets: {
          default: function _default() {
            return [];
          },
          type: [ cc.Node ]
        }
      },
      onLoad: function onLoad() {
        this.touchScaleAction = null;
        this.touchScaleRatio = .8;
        true;
      },
      _polygonCheckRect: function _polygonCheckRect(_point) {
        var point = this.node.convertToNodeSpaceAR(_point);
        if (point.x < -this.node.width / 2 || point.x > this.node.width / 2 || point.y < -this.node.height / 2 || point.y > this.node.height / 2) return false;
        var i = void 0, j = void 0, c = false;
        var nvert = this.polygonPoints.length;
        for (i = 0, j = nvert - 1; i < nvert; j = i++) this.polygonPoints[i].y > point.y != this.polygonPoints[j].y > point.y && point.x < (this.polygonPoints[j].x - this.polygonPoints[i].x) * (point.y - this.polygonPoints[i].y) / (this.polygonPoints[j].y - this.polygonPoints[i].y) + this.polygonPoints[i].x && (c = !c);
        return c;
      },
      _polygonCheckIn: function _polygonCheckIn(point) {
        return !this.isPolygonCollider || this.polygonPoints.length <= 2 || this._polygonCheckRect(point);
      },
      _hitTest: function _hitTest(point, listener) {
        var w = this._contentSize.width, h = this._contentSize.height, cameraPt = cc.v2(), testPt = cc.v2();
        var camera = cc.Camera.findCamera(this);
        camera ? camera.getScreenToWorldPoint(point, cameraPt) : cameraPt.set(point);
        this._updateWorldMatrix();
        math.mat4.invert(_mat4_temp, this._worldMatrix);
        math.vec2.transformMat4(testPt, cameraPt, _mat4_temp);
        testPt.x += this._anchorPoint.x * w;
        testPt.y += this._anchorPoint.y * h;
        var minX = 0;
        var minY = 0;
        var button = this.getComponent(cc.Button);
        if (button && button.touchAction && button._pressed) {
          var offsetX = w * button.nodeScaleX * (1 - button.touchScaleRatio) / 2;
          var offsetY = h * button.nodeScaleY * (1 - button.touchScaleRatio) / 2;
          minX -= offsetX;
          minY -= offsetY;
          w += offsetX;
          h += offsetY;
        }
        if (testPt.x >= minX && testPt.y >= minY && testPt.x <= w && testPt.y <= h) {
          if (listener && listener.mask) {
            var mask = listener.mask;
            var parent = this;
            for (var i = 0; parent && i < mask.index; ++i, parent = parent.parent) ;
            if (parent === mask.node) {
              var comp = parent.getComponent(cc.Mask);
              return !comp || !comp.enabledInHierarchy || comp._hitTest(cameraPt);
            }
            listener.mask = null;
            return true;
          }
          return true;
        }
        return false;
      },
      _onTouchBegan: function _onTouchBegan(event) {
        this._super(event);
        if (!this.interactable || !this.enabledInHierarchy) return;
        this._setBrightEffect(true);
        if (!this.touchAction) return;
        if (this.touchScaleAction) {
          this.node.stopAction(this.touchScaleAction);
          this.node.scaleX = this.nodeScaleX;
          this.node.scaleY = this.nodeScaleY;
        } else {
          this.nodeScaleX = this.node.scaleX;
          this.nodeScaleY = this.node.scaleY;
        }
        this.touchScaleAction = cc.sequence(cc.scaleTo(.08, this.touchScaleRatio * this.nodeScaleX, this.touchScaleRatio * this.nodeScaleY), cc.callFunc(function() {
          this.touchScaleAction = null;
        }.bind(this)));
        this.node.runAction(this.touchScaleAction);
      },
      _onTouchMove: function _onTouchMove(event) {
        this._super(event);
        if (!this.interactable || !this.enabledInHierarchy || !this._pressed) return;
      },
      _onTouchEnded: function _onTouchEnded(event) {
        this.commonClickAudio && zy.audio.playEffect(zy.audio.Effect.CommonClick);
        if (!this.interactable || !this.enabledInHierarchy) {
          this._resetScale();
          return;
        }
        this._setBrightEffect(false);
        if (this._pressed) {
          cc.Component.EventHandler.emitEvents(this.clickEvents, event);
          this.node.emit("click", this);
        }
        this._pressed = false;
        this._updateState();
        event.stopPropagation();
        this._endTouchScaleAction();
      },
      _onTouchCancel: function _onTouchCancel() {
        this._setBrightEffect(false);
        this._super();
        if (!this.interactable || !this.enabledInHierarchy) {
          this._resetScale();
          return;
        }
        this._endTouchScaleAction();
      },
      _resetScale: function _resetScale() {
        if (!this.touchAction) return;
        if (this.touchScaleAction) {
          this.node.stopAction(this.touchScaleAction);
          this.touchScaleAction = null;
        }
        if (this.nodeScaleX && this.nodeScaleY) {
          this.node.scaleX = this.nodeScaleX;
          this.node.scaleY = this.nodeScaleY;
        }
      },
      _endTouchScaleAction: function _endTouchScaleAction() {
        if (!this.touchAction) return;
        if (this.touchScaleAction) {
          this.node.stopAction(this.touchScaleAction);
          this.node.scaleX = this.nodeScaleX * this.touchScaleRatio;
          this.node.scaleY = this.nodeScaleY * this.touchScaleRatio;
          this.touchScaleAction = null;
        }
        this.touchScaleAction = cc.sequence(cc.scaleTo(.08, 1.1 * this.nodeScaleX, 1.1 * this.nodeScaleY), cc.scaleTo(.08, .9 * this.nodeScaleX, .9 * this.nodeScaleY), cc.scaleTo(.08, 1 * this.nodeScaleX, 1 * this.nodeScaleY), cc.callFunc(function() {
          this.touchScaleAction = null;
        }.bind(this)));
        this.node.runAction(this.touchScaleAction);
      },
      _setBrightEffect: function _setBrightEffect(bright) {
        if (0 != this.brightTargets.length) {
          var shader = bright ? zy.shaderUtils.Effect.Bright : zy.shaderUtils.Effect.Normal;
          for (var i in this.brightTargets) {
            var _node = this.brightTargets[i];
            if (_node.getComponent(cc.Sprite)) {
              var component = _node.getComponent(cc.Sprite);
              var state = component.getState();
              bright && 1 != state ? zy.shaderUtils.setShader(component, shader) : component.setState(state);
            } else if (_node.getComponent(sp.Skeleton)) {
              var _component = _node.getComponent(sp.Skeleton);
              zy.shaderUtils.setShader(_component, shader);
            }
          }
        }
      },
      onDisable: function onDisable() {
        this._super();
        if (!this.touchAction) return;
        this._resetScale();
      }
    });
    zy.Button = module.exports = Button;
    cc._RF.pop();
  }, {} ],
  CSVParser: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "aab19B0yLhC7JV+rBaX1XJH", "CSVParser");
    "use strict";
    var CSV = {
      DefaultOptions: {
        delim: ",",
        quote: '"',
        rowdelim: "\n"
      }
    };
    function CSVSyntaxError(msg) {
      this.message = msg;
      Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
    }
    CSVSyntaxError.prototype = new Error();
    CSVSyntaxError.prototype.constructor = CSVSyntaxError;
    CSVSyntaxError.prototype.name = "CSVSyntaxError";
    "[object Error]" == new Error().toString() && (CSVSyntaxError.prototype.toString = function() {
      return this.name + ": " + this.message;
    });
    function CSVParser(str, options) {
      this.str = str;
      this.options = CSV.DefaultOptions;
      if (options) {
        options.delim = options.delim || CSV.DefaultOptions.delim;
        options.quote = options.quote || CSV.DefaultOptions.quote;
        if (1 != options.quote.length) throw new RangeError("options.quote should be only 1 char");
        options.rowdelim = options.rowdelim || CSV.DefaultOptions.rowdelim;
        this.options = options;
      }
      this.pos = 0;
      this.endpos = str.length;
      this.lineNo = 1;
    }
    CSVParser.prototype.next = function(s) {
      if (this.pos < this.endpos) {
        var len = s.length;
        if (this.str.substring(this.pos, this.pos + len) == s) {
          this.pos += len;
          return true;
        }
      }
      return false;
    };
    CSVParser.prototype.ahead = function(s) {
      if (this.pos < this.endpos) {
        if (!s) return true;
        var len = s.length;
        if (this.str.substring(this.pos, this.pos + len) == s) return true;
      }
      return false;
    };
    function countMatches(str, patt) {
      var count = 0;
      var i = str.indexOf(patt);
      while (i > 0) {
        count++;
        i = str.indexOf(patt, i + patt.length);
      }
      return count;
    }
    CSVParser.prototype.quotedField = function() {
      var mark = this.pos;
      if (!this.next(this.options.quote)) {
        this.pos = mark;
        return null;
      }
      var tmp = [];
      var start = this.pos;
      while (start < this.endpos) {
        var end = this.str.indexOf(this.options.quote, start);
        if (end < 0) throw new CSVSyntaxError("line " + this.lineNo + ": missing close quote");
        var part = this.str.substring(start, end);
        this.lineNo += countMatches(part, "\n");
        tmp.push(part);
        if (!(end + 1 < this.endpos && this.str.charAt(end + 1) == this.options.quote)) {
          this.pos = end + 1;
          break;
        }
        start = end + 2;
        end = this.str.indexOf(this.options.quote, start);
      }
      return tmp.join(this.options.quote);
    };
    CSVParser.prototype.normalField = function() {
      var begin = this.pos;
      var idelim = this.str.indexOf(this.options.delim, begin);
      idelim < 0 && (idelim = this.endpos);
      var irowdelim = this.str.indexOf(this.options.rowdelim, begin);
      irowdelim < 0 && (irowdelim = this.endpos);
      this.pos = Math.min(idelim, irowdelim);
      return this.str.substring(begin, this.pos);
    };
    CSVParser.prototype.nextField = function() {
      var tmp = this.quotedField();
      if (null !== tmp) return tmp;
      return this.normalField();
    };
    CSVParser.prototype.nextRow_0 = function() {
      var mark = this.pos;
      if (!this.next(this.options.delim)) {
        this.pos = mark;
        return null;
      }
      var tmp = this.nextField();
      if (null === tmp) {
        this.pos = mark;
        return null;
      }
      return tmp;
    };
    CSVParser.prototype.nextRow = function() {
      var ar = [];
      var mark = this.pos;
      var tmp = this.nextField();
      if (null === tmp) {
        this.pos = mark;
        return null;
      }
      ar.push(tmp);
      tmp = this.nextRow_0();
      while (null !== tmp) {
        ar.push(tmp);
        tmp = this.nextRow_0();
      }
      if (!(this.next(this.options.rowdelim) || !this.ahead())) throw new CSVSyntaxError("line " + this.lineNo + ": " + this.str.substring(Math.max(this.pos - 5, 0), this.pos + 5));
      "\n" == this.str.charAt(this.pos - 1) && this.lineNo++;
      return ar;
    };
    CSVParser.prototype.nextRowSimple = function() {
      var ar = [];
      var mark = this.pos;
      var tmp = this.nextField();
      if (null === tmp) {
        this.pos = mark;
        return null;
      }
      ar.push(tmp);
      tmp = this.nextRow_0();
      while (null !== tmp) {
        ar.push(tmp);
        tmp = this.nextRow_0();
      }
      if (!(this.next(this.options.rowdelim) || !this.ahead())) throw new CSVSyntaxError("line " + this.lineNo + ": " + this.str.substring(Math.max(this.pos - 5, 0), this.pos + 5));
      "\n" == this.str.charAt(this.pos - 1) && this.lineNo++;
      return 1 === ar.length ? ar[0] : ar;
    };
    CSVParser.prototype.hasNext = function() {
      return this.ahead();
    };
    CSV.CSVSyntaxError = CSVSyntaxError;
    CSV.CSVParser = CSVParser;
    CSV.parseOne = function(str, options) {
      var parser = new CSVParser(str, options);
      if (parser.hasNext()) return parser.nextRow();
      return null;
    };
    CSV.parseOneSimple = function(str, options) {
      var parser = new CSVParser(str, options);
      if (parser.hasNext()) return parser.nextRowSimple();
      return null;
    };
    Array.prototype.map || (Array.prototype.map = function(callback, thisArg) {
      var T, A, k;
      if (null === this) throw new TypeError(" this is null or not defined");
      var O = Object(this);
      var len = O.length >>> 0;
      if ("[object Function]" != {}.toString.call(callback)) throw new TypeError(callback + " is not a function");
      thisArg && (T = thisArg);
      A = new Array(len);
      k = 0;
      while (k < len) {
        var kValue, mappedValue;
        if (k in O) {
          kValue = O[k];
          mappedValue = callback.call(T, kValue, k, O);
          A[k] = mappedValue;
        }
        k++;
      }
      return A;
    });
    module.exports = CSVParser;
    cc._RF.pop();
  }, {} ],
  ClientConfig: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "753fe0rGydIfKrO8zNwCJKu", "ClientConfig");
    "use strict";
    window.zy = window.zy || {};
    window.CHANNEL_ID = 201;
    window.DEBUG_OPEN = true;
    window.UPLTV_IOS_APPKEY = "e6c55d8be2d0";
    window.UPLTV_ANDROID_APPKEY = "889576bfeaf9";
    window.BASE_LOCAL_VERSION = "2020011302";
    window.VERSION_NAME = "1.0.0";
    window.HOT_UPDATE_SUB_PATH = "zy/download" + VERSION_NAME;
    cc._RF.pop();
  }, {} ],
  ConstData: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "14638K9xV1Mg4d0HwW7hmJE", "ConstData");
    "use strict";
    var ZIndex = {
      POP_BASE: 1,
      LOADING: 888,
      ALERT: 998,
      TIP: 999,
      POP_MASK: -999,
      GUIDE: 900
    };
    var DesignSize = cc.size(1334, 750);
    var StaticKey = {
      SaveDataVersion: "V2",
      PlayerDataKey: "playerDataKey"
    };
    var AdKey = {
      VdFreePh: "video_reward_1",
      VdOfflineCoins: "video_reward_2",
      VdAddTime: "video_reward_3",
      VdLevelCoins: "video_reward_5",
      VdREVIVE: "video_reward_4",
      InterLevel: "interstitial_1",
      FreeCoins: "video_reward_6"
    };
    var OpenAdsKey = {
      video_reward_1: "941627716",
      video_reward_2: "942161521",
      video_reward_3: "941627750",
      video_reward_4: "941627756",
      video_reward_5: "941627759",
      video_reward_6: "941630566",
      interstitial_1: "941627740"
    };
    var OpenAdsKeyIOS = {
      video_reward_1: "942341544",
      video_reward_2: "942341562",
      video_reward_3: "942341570",
      video_reward_4: "942341573",
      video_reward_5: "942341577",
      video_reward_6: "942341579",
      interstitial_1: "942341589"
    };
    var Font = {
      FONT_NORMAL: "fonts/Montserrat-Bold"
    };
    cc.Class({
      statics: {
        ZIndex: ZIndex,
        DesignSize: DesignSize,
        StaticKey: StaticKey,
        AdKey: AdKey,
        OpenAdsKey: OpenAdsKey,
        OpenAdsKeyIOS: OpenAdsKeyIOS,
        MaxPhCounts1Day: 10,
        PhAdReward: 5,
        PhLevelReward: 3,
        PhCost: 5,
        PhDefault: 20,
        PhRecoverTime: 600,
        FreeCoinsCooling: 300,
        FreeCoinsMaxNum: 10,
        FreeCoinsMaxNum2: 4,
        FreeCoinsNeedAds: 5,
        InterAdLevel: 4,
        InterAdDuration: 2,
        Font: Font,
        init: function init(data) {},
        clean: function clean() {}
      }
    });
    cc._RF.pop();
  }, {} ],
  CornerMng: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "b4036SOD9lMEK0kFdgVPqge", "CornerMng");
    "use strict";
    var _UI_CONFIG;
    function _defineProperty(obj, key, value) {
      key in obj ? Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      }) : obj[key] = value;
      return obj;
    }
    var CornerType = cc.Enum({
      CORNER_ID_UPGRADE_OTHER: 1001,
      CORNER_ID_UPGRADE_TOWER: 1010,
      CORNER_ID_FREE_COINS: 1020
    });
    var CornerConfig = {};
    var UI_CONFIG = (_UI_CONFIG = {}, _defineProperty(_UI_CONFIG, CornerType.CORNER_ID_UPGRADE_OTHER, {
      offset: cc.v2(-10, -10)
    }), _defineProperty(_UI_CONFIG, CornerType.CORNER_ID_UPGRADE_TOWER, {
      offset: cc.v2(-10, -10)
    }), _defineProperty(_UI_CONFIG, CornerType.CORNER_ID_FREE_COINS, {
      offset: cc.v2(-10, -10)
    }), _UI_CONFIG);
    var OPFlag = cc.Enum({
      NORMAL: 0,
      NEW: 1,
      UPDATE: 2,
      DELETE: 3
    });
    var CORNER_ZINDEX = 9999;
    cc.Class({
      extends: cc.Component,
      statics: {
        CornerType: CornerType,
        CornerConfig: CornerConfig,
        UI_CONFIG: UI_CONFIG,
        prepare: function prepare() {
          this.cornerList = {};
          this.cornerUI = {};
        },
        init: function init(data) {
          this.prepare();
          this.initData(data);
        },
        initData: function initData(data) {
          this.updateCorner(data);
        },
        registOn: function registOn(node, cornerType) {
          if (node && cc.isValid(node)) {
            this.cornerUI[cornerType] || (this.cornerUI[cornerType] = []);
            this.cornerUI[cornerType].push(node);
          }
          this.updateNode(cornerType);
        },
        registOff: function registOff(cornerType) {
          this.cornerUI[cornerType] && delete this.cornerUI[cornerType];
        },
        addClientCorner: function addClientCorner(id) {
          this.updateCorner([ {
            id: id,
            flag: OPFlag.NEW
          } ]);
        },
        deleteClientCorner: function deleteClientCorner(id) {
          this.updateCorner([ {
            id: id,
            flag: OPFlag.DELETE
          } ]);
        },
        getCornerData: function getCornerData(id) {
          return this.cornerList[id];
        },
        updateCorner: function updateCorner(data) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = void 0;
          try {
            for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var c = _step.value;
              var id = c.id || 0;
              c.flag == OPFlag.DELETE ? delete this.cornerList[id] : this.cornerList[id] = 1;
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              !_iteratorNormalCompletion && _iterator.return && _iterator.return();
            } finally {
              if (_didIteratorError) throw _iteratorError;
            }
          }
          data && data.length > 0 && this.updateAllCorner();
        },
        updateAllCorner: function updateAllCorner() {
          for (var cornerType in this.cornerUI) this.updateNode(cornerType);
        },
        updateNode: function updateNode(cornerTpe) {
          var nodeList = this.cornerUI[cornerTpe];
          if (!nodeList) return;
          var getPosition = function getPosition(node, cfg) {
            var anchor = node.getAnchorPoint();
            var posX = node.width * (1 - anchor.x);
            var posY = node.height * (1 - anchor.y);
            if (cfg) {
              posX += cfg.offset.x;
              posY += cfg.offset.y;
            }
            return cc.v2(posX, posY);
          };
          var corner = this.checkCorner(cornerTpe);
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = void 0;
          try {
            for (var _iterator2 = nodeList[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var node = _step2.value;
              if (node && cc.isValid(node)) if (corner) {
                var cornerNode = node.getChildByName("CORNER_NODE_UI");
                if (!cornerNode) {
                  var uiCfg = UI_CONFIG[cornerTpe];
                  var srcUrl = uiCfg && uiCfg.src || "textures/common/red_dot";
                  var srcScale = uiCfg && uiCfg.scale || 1;
                  cornerNode = zy.Node.createNode({
                    zIndex: CORNER_ZINDEX,
                    name: "CORNER_NODE_UI",
                    parent: node
                  });
                  cornerNode.addComponent(zy.Sprite);
                  zy.Sprite.updateNode(cornerNode, {
                    url: srcUrl,
                    scale: srcScale
                  });
                  if (cc.isValid(cornerNode)) {
                    var cornerPos = getPosition(node, uiCfg);
                    cornerNode.position = cornerPos;
                  }
                }
                cc.isValid(cornerNode) && (cornerNode.active = true);
              } else {
                var _cornerNode = node.getChildByName("CORNER_NODE_UI");
                _cornerNode && cc.isValid(_cornerNode) && (_cornerNode.active = false);
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              !_iteratorNormalCompletion2 && _iterator2.return && _iterator2.return();
            } finally {
              if (_didIteratorError2) throw _iteratorError2;
            }
          }
        },
        checkCorner: function checkCorner(id) {
          if (this.cornerList[id]) return true;
          var cfg = CornerConfig[id] || [];
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = void 0;
          try {
            for (var _iterator3 = cfg[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var _id = _step3.value;
              if (this.cornerList[_id]) return true;
              if (CornerConfig[_id] && this.checkCorner(_id)) return true;
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              !_iteratorNormalCompletion3 && _iterator3.return && _iterator3.return();
            } finally {
              if (_didIteratorError3) throw _iteratorError3;
            }
          }
          return false;
        },
        clean: function clean() {
          this.prepare();
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  DataBase: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "4bc8dkqHTBMcaHi1VJ5zUzI", "DataBase");
    "use strict";
    cc.Class({
      ctor: function ctor() {
        this.dataObj = null;
        this.fileDir = "";
      },
      initData: function initData(data) {
        if (!data) return;
        this.dataObj = data;
      }
    });
    cc._RF.pop();
  }, {} ],
  DataMng: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "935052anXpNNrnw1ueUkI/J", "DataMng");
    "use strict";
    var UpStarNeedData = require("./UpStarNeedData");
    var EnemyAttrData = require("./EnemyAttrData");
    var BgColorData = require("./BgColorData");
    var UserData = require("./UserData");
    var DataBase = require("./DataBase");
    cc.Class({
      ctor: function ctor() {
        this.loadCounts = 0;
        this.upStarNeedData = new UpStarNeedData();
        this.enemyAttrData = new EnemyAttrData();
        this.bgColorData = new BgColorData();
        this.userData = new UserData();
      },
      loadDataFromLocalFile: function loadDataFromLocalFile(progressCb, completeCb) {
        var _this = this;
        this.loadSavedData();
        var keys = Object.keys(this);
        cc.log("====keys1: %s", JSON.stringify(keys));
        keys = keys.filter(function(k) {
          return _this.hasOwnProperty(k) && _this[k] instanceof DataBase;
        });
        cc.log("====keys2: %s", JSON.stringify(keys));
        var _loop = function _loop(key) {
          var obj = _this[key];
          var fileName = obj.fileDir;
          cc.loader.loadRes(fileName, cc.JsonAsset, function(err, data) {
            err ? cc.error("load local data: " + fileName + ", error: " + err) : obj.initData && obj.initData.call(obj, data.json);
            _this.loadCounts++;
            progressCb && progressCb(_this.loadCounts, keys.length);
            _this.loadCounts >= keys.length && completeCb && completeCb();
          });
        };
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = void 0;
        try {
          for (var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var key = _step.value;
            _loop(key);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            !_iteratorNormalCompletion && _iterator.return && _iterator.return();
          } finally {
            if (_didIteratorError) throw _iteratorError;
          }
        }
      },
      loadSavedData: function loadSavedData() {
        this.userData.loadData();
      },
      saveDataToLocal: function saveDataToLocal() {
        this.userData.saveData();
      }
    });
    cc._RF.pop();
  }, {
    "./BgColorData": "BgColorData",
    "./DataBase": "DataBase",
    "./EnemyAttrData": "EnemyAttrData",
    "./UpStarNeedData": "UpStarNeedData",
    "./UserData": "UserData"
  } ],
  DebugPop: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "cc370fUVNhEQaYOTe7seOky", "DebugPop");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        p1: cc.Node,
        p2: cc.Node
      },
      start: function start() {
        this.pp1 = this.p1.getComponent("ProgressBar");
        this.pp2 = this.p2.getComponent("ProgressCircle");
      },
      btnCb: function btnCb(sender, name) {
        switch (name) {
         case "d1":
          zy.ui.alert.show({
            okText: i18n.t("btn_ok"),
            cancleText: i18n.t("btn_cancle"),
            okCb: function okCb() {
              zy.ui.tip.show("ok");
            },
            cancleCb: function cancleCb() {
              zy.ui.tip.show("cancle");
            },
            text: "\u8fd9\u662f\u5355\u884c\u6587\u672c\u6837\u5f0f"
          });
          break;

         case "d2":
          zy.ui.alert.show({
            okText: i18n.t("btn_ok"),
            okCb: function okCb() {
              zy.ui.tip.show("ok");
            },
            cancleCb: function cancleCb() {
              zy.ui.tip.show("cancle");
            },
            text: "\u8fd9\u662f\u591a\u884c\u6587\u672c\u663e\u793a\u6837\u5f0f\u8fd9\u662f\u591a\u884c\u6587\u672c\u663e\u793a\u6837\u5f0f\u8fd9\u662f\u591a\u884c\u6587\u672c\u663e\u793a\u6837\u5f0f\u8fd9\u662f\u591a\u884c\u6587\u672c\u663e\u793a\u6837\u5f0f\u8fd9\u662f\u591a\u884c\u6587\u672c"
          });
          break;

         case "d3":
          zy.ui.tip.show("\u6211\u662ftips\uff0c\u6211\u662ftips");
          break;

         case "d4":
          this.pp1.progress = 0;
          this.pp1.setProgressBarToPercent(1, 1, function() {
            zy.ui.tip.show("\u5b8c\u6210");
          });
          break;

         case "d5":
          this.pp2.progress = 0;
          this.pp2.setProgressBarToPercent(1, 1, function() {
            zy.ui.tip.show("\u5b8c\u6210");
          });
        }
      },
      closeCallback: function closeCallback() {
        zy.director.closePop(this.popName);
      }
    });
    cc._RF.pop();
  }, {} ],
  Device: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "fa52e/qG61Knro2fTFzJpmm", "Device");
    "use strict";
    var PACKAGENAME = "com/zygame/utils/PlatformUtils";
    cc.Class({
      extends: cc.Component,
      statics: {
        model: "unknown",
        mac: "00:00:00:00:00:00",
        openudid: "",
        deviceToken: "",
        osName: "",
        osVersion: "",
        ssid: "",
        language: "cn",
        region: "unknown",
        odin: "",
        idfa: "",
        idfaEnable: "",
        advertisingId: "",
        androidId: "",
        locationInfo: {},
        ipAddress: "0.0.0.0",
        init: function init() {
          var PROCUDT_ID = "com.game.test";
          this.osName = cc.sys.os;
          this.osVersion = cc.sys.osVersion;
          this.language = cc.sys.language;
          this.openudid = PROCUDT_ID;
          var info = "{}";
          if (cc.sys.isNative) {
            cc.sys.os === cc.sys.OS_ANDROID ? info = jsb.reflection.callStaticMethod(PACKAGENAME, "getDeviceInfo", "()Ljava/lang/String;") : cc.sys.os == cc.sys.OS_IOS && (info = jsb.reflection.callStaticMethod("PlatformUtils", "getDeviceInfo"));
            this.initNative(JSON.parse(info));
          } else this.initHtml();
        },
        initHtml: function initHtml() {},
        initNative: function initNative(deviceInfo) {
          for (var key in deviceInfo) this[key] = deviceInfo[key];
          cc.log(JSON.stringify(deviceInfo));
        },
        vibratorShort: function vibratorShort() {
          getVibrator(25);
        },
        vibratorLong: function vibratorLong() {
          getVibrator(100);
        },
        getVibrator: function getVibrator(t) {
          if (!zy.dataMng.userData.vibOn) return;
          cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAME, "vibrator", "(I)V", t) : cc.sys.os == cc.sys.OS_IOS;
        },
        clean: function clean() {
          cc.sys.browserType == cc.sys.BROWSER_TYPE_WECHAT && wx.hideAllNonBaseMenuItem();
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  Director: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a2a55RhwyZHfo0GMcF0EnW3", "Director");
    "use strict";
    cc.Class({
      extends: cc.Component,
      statics: {
        scene: null,
        sceneCanvas: null,
        sceneComponent: null,
        isBackground: null,
        toBackgroundOSTime: null,
        activePops: null,
        EventType: {
          ALL_SINGLE_POP_CLOSE: "ALL_SINGLE_POP_CLOSE"
        },
        init: function init(initComponent) {
          this.scene = null;
          this.sceneCanvas = null;
          this.sceneComponent = null;
          this.sceneName = null;
          this.uiRoot = null;
          this.isBackground = false;
          this.activePops = [];
          this.persistRootNodeList = [];
          cc.game.on(cc.game.EVENT_HIDE, this.onEventHide, this);
          cc.game.on(cc.game.EVENT_SHOW, this.onEventShow, this);
          if (cc.sys.platform == cc.sys.WECHAT_GAME) {
            wx.onShow(this.onWXGShow.bind(this));
            wx.onHide(this.onWXGHide.bind(this));
          }
          cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
          cc.director.on(cc.Director.EVENT_AFTER_DRAW, this.onAfterDraw, this);
          cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
          cc.view.setResizeCallback(function() {
            cc.log("setResizeCallback");
          }.bind(this));
        },
        onEventHide: function onEventHide() {
          if (!this.isBackground) {
            this.isBackground = true;
            this.toBackgroundOSTime = zy.utils.time();
            cc.log("\u8fdb\u5165\u540e\u53f0:", this.toBackgroundOSTime);
            zy.dataMng.saveDataToLocal();
          }
        },
        onEventShow: function onEventShow() {
          if (this.isBackground) {
            this.isBackground = false;
            var toForegroundOSTime = zy.utils.time();
            var interval = toForegroundOSTime - this.toBackgroundOSTime;
            cc.log("\u8fdb\u5165\u524d\u53f0-interval:", interval);
          }
        },
        onWXGHide: function onWXGHide(res) {
          cc.log("onWXGHide", res);
        },
        onWXGShow: function onWXGShow(res) {
          cc.log("onWXGShow", res);
        },
        onKeyDown: function onKeyDown(event) {
          cc.log("onKeyDown", event.keyCode);
          switch (event.keyCode) {
           case cc.KEY.back:
          }
        },
        onAfterDraw: function onAfterDraw() {},
        preloadScene: function preloadScene(sceneName, onProgress, onLoad) {
          cc.director.preloadScene(sceneName, onProgress, onLoad);
        },
        loadScene: function loadScene(sceneName, params, onLaunched) {
          zy.director.closeAllPops();
          window[this.sceneName + "Scene"] = null;
          cc.director.loadScene(sceneName, function() {
            cc.log("loadScene:", sceneName);
            this.scene = cc.director.getScene();
            this.sceneCanvas = this.scene.getChildByName("Canvas");
            this.uiRoot = this.sceneCanvas.getChildByName("UIRoot") || this.sceneCanvas;
            this.sceneName = sceneName;
            this.sceneComponent = this.sceneCanvas.getComponent(sceneName + "Scene");
            if (this.sceneComponent) {
              this.sceneComponent.sceneName = sceneName + "Scene";
              this.sceneComponent.init && this.sceneComponent.init(params);
            }
            window[this.sceneName + "Scene"] = this.sceneComponent;
            onLaunched && onLaunched(this.scene, this.sceneCanvas, this.sceneComponent);
          }.bind(this));
        },
        getSceneName: function getSceneName() {
          return this.sceneName ? this.sceneName : "";
        },
        getSceneComponent: function getSceneComponent() {
          return this.sceneComponent;
        },
        getScene: function getScene() {
          return this.scene;
        },
        getSceneCanvas: function getSceneCanvas() {
          return this.sceneCanvas;
        },
        getUiRoot: function getUiRoot() {
          return this.uiRoot;
        },
        createPop: function createPop(popName, params, prefab) {
          params = params || {};
          var componentName = "";
          var popNameSpArr = popName.split("/");
          popNameSpArr.length > 0 && (componentName = popNameSpArr[popNameSpArr.length - 1]);
          cc.log("createPop:" + popName, componentName);
          if (this.isPopActive(popName)) {
            cc.log("\u5f53\u524dPOP\u5df2\u5b58\u5728:" + popName);
            return;
          }
          var initFunc = function(prefab) {
            var popNode = cc.instantiate(prefab);
            popNode.position = cc.v2(0, 0);
            popNode.zIndex = this.getTopPopZIndex() + 10;
            popNode.parent = this.uiRoot;
            var popData = {
              popName: popName,
              popNode: popNode
            };
            this.activePops.push(popData);
            var popBase = popNode.getComponent("PopBase");
            popData.popBase = popBase;
            popBase.initBase(params, popName);
            popData.popComponent = popBase.component;
          }.bind(this);
          prefab ? initFunc(prefab) : cc.loader.loadRes(popName, cc.Prefab, null, function(err, prefab) {
            if (err) {
              cc.log(popName + "\u52a0\u8f7d\u5931\u8d25", err);
              return;
            }
            initFunc(prefab);
          }.bind(this));
        },
        getTopPopData: function getTopPopData(_topIndex) {
          var topIndex = _topIndex || 1;
          return this.activePops[this.activePops.length - topIndex];
        },
        getTopPopZIndex: function getTopPopZIndex() {
          var topPop = this.getTopPopData();
          if (topPop) return topPop.popNode.zIndex;
          return zy.constData.ZIndex.POP_BASE;
        },
        getPopData: function getPopData(popName) {
          for (var i in this.activePops) {
            var popData = this.activePops[i];
            if (popData.popName == popName) return popData;
          }
        },
        getPop: function getPop(popName) {
          var popData = this.getPopData(popName);
          if (popData) return popData.popComponent;
        },
        isPopActive: function isPopActive(popName) {
          if (this.getPopData(popName)) return true;
          return false;
        },
        getActivePops: function getActivePops() {
          return this.activePops;
        },
        closePop: function closePop(popName) {
          cc.log("closePop:" + popName);
          var popData = this.getPopData(popName);
          if (popData) {
            for (var i in this.activePops) {
              var _popData = this.activePops[i];
              if (popData == _popData) {
                this.activePops.splice(i, 1);
                break;
              }
            }
            var popBase = popData.popBase;
            popBase.cleanBase();
            0 != this.activePops.length || popBase.onClosedCallback || zy.event.emit(zy.director.EventType.ALL_SINGLE_POP_CLOSE);
          }
        },
        closeAllPops: function closeAllPops() {
          while (this.activePops.length > 0) {
            var idx = this.activePops.length - 1;
            var popData = this.activePops[idx];
            var popName = popData.popName;
            cc.log("closeAllPops:" + popName);
            this.activePops.splice(idx, 1);
            var popBase = popData.popBase;
            popBase.cleanBase();
          }
          this.activePops = [];
        },
        addPersistRootNode: function addPersistRootNode(node) {
          cc.game.addPersistRootNode(node);
          this.persistRootNodeList.push(node);
        },
        cleanPersistRootNode: function cleanPersistRootNode() {
          for (var index in this.persistRootNodeList) {
            var node = this.persistRootNodeList[index];
            cc.game.removePersistRootNode(node);
          }
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  Encrypt: [ function(require, module, exports) {
    (function(Buffer) {
      "use strict";
      cc._RF.push(module, "d01c6ZTO/VDm45rxncbJpPQ", "Encrypt");
      "use strict";
      var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
        return typeof obj;
      } : function(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      (function(name, definition) {
        "undefined" !== typeof exports && "undefined" !== typeof module ? module.exports = definition() : "function" === typeof define && "object" === _typeof(define.amd) ? define(definition) : "function" === typeof define && "object" === _typeof(define.petal) ? define(name, [], definition) : this[name] = definition();
      })("encryptjs", function(encryptjs) {
        var rl = void 0;
        encryptjs = {
          version: "1.0.0"
        };
        encryptjs.init = function() {
          console.log("--------------------Applying Encryption Algorithm------------------ ");
        };
        var Algo = null;
        "undefined" != typeof module && module.exports && (Algo = require("./Algo"));
        encryptjs.encrypt = function(plaintext, password, nBits) {
          var blockSize = 16;
          if (!(128 == nBits || 192 == nBits || 256 == nBits)) return "";
          plaintext = String(plaintext).utf8Encode();
          password = String(password).utf8Encode();
          var nBytes = nBits / 8;
          var pwBytes = new Array(nBytes);
          for (var i = 0; i < nBytes; i++) pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
          var key = Algo.cipher(pwBytes, Algo.keyExpansion(pwBytes));
          key = key.concat(key.slice(0, nBytes - 16));
          var counterBlock = new Array(blockSize);
          var nonce = new Date().getTime();
          var nonceMs = nonce % 1e3;
          var nonceSec = Math.floor(nonce / 1e3);
          var nonceRnd = Math.floor(65535 * Math.random());
          for (var _i = 0; _i < 2; _i++) counterBlock[_i] = nonceMs >>> 8 * _i & 255;
          for (var _i2 = 0; _i2 < 2; _i2++) counterBlock[_i2 + 2] = nonceRnd >>> 8 * _i2 & 255;
          for (var _i3 = 0; _i3 < 4; _i3++) counterBlock[_i3 + 4] = nonceSec >>> 8 * _i3 & 255;
          var ctrTxt = "";
          for (var _i4 = 0; _i4 < 8; _i4++) ctrTxt += String.fromCharCode(counterBlock[_i4]);
          var keySchedule = Algo.keyExpansion(key);
          var blockCount = Math.ceil(plaintext.length / blockSize);
          var ciphertxt = new Array(blockCount);
          for (var b = 0; b < blockCount; b++) {
            for (var c = 0; c < 4; c++) counterBlock[15 - c] = b >>> 8 * c & 255;
            for (var _c = 0; _c < 4; _c++) counterBlock[15 - _c - 4] = b / 4294967296 >>> 8 * _c;
            var cipherCntr = Algo.cipher(counterBlock, keySchedule);
            var blockLength = b < blockCount - 1 ? blockSize : (plaintext.length - 1) % blockSize + 1;
            var cipherChar = new Array(blockLength);
            for (var _i5 = 0; _i5 < blockLength; _i5++) {
              cipherChar[_i5] = cipherCntr[_i5] ^ plaintext.charCodeAt(b * blockSize + _i5);
              cipherChar[_i5] = String.fromCharCode(cipherChar[_i5]);
            }
            ciphertxt[b] = cipherChar.join("");
          }
          var ciphertext = ctrTxt + ciphertxt.join("");
          ciphertext = encryptjs.base64Encode(ciphertext);
          return ciphertext;
        };
        encryptjs.decrypt = function(ciphertext, password, nBits) {
          var blockSize = 16;
          if (!(128 == nBits || 192 == nBits || 256 == nBits)) return "";
          ciphertext = encryptjs.base64Decode(String(ciphertext));
          password = String(password).utf8Encode();
          var nBytes = nBits / 8;
          var pwBytes = new Array(nBytes);
          for (var i = 0; i < nBytes; i++) pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
          var key = Algo.cipher(pwBytes, Algo.keyExpansion(pwBytes));
          key = key.concat(key.slice(0, nBytes - 16));
          var counterBlock = new Array(8);
          var ctrTxt = ciphertext.slice(0, 8);
          for (var _i6 = 0; _i6 < 8; _i6++) counterBlock[_i6] = ctrTxt.charCodeAt(_i6);
          var keySchedule = Algo.keyExpansion(key);
          var nBlocks = Math.ceil((ciphertext.length - 8) / blockSize);
          var ct = new Array(nBlocks);
          for (var b = 0; b < nBlocks; b++) ct[b] = ciphertext.slice(8 + b * blockSize, 8 + b * blockSize + blockSize);
          ciphertext = ct;
          var plaintxt = new Array(ciphertext.length);
          for (var _b = 0; _b < nBlocks; _b++) {
            for (var c = 0; c < 4; c++) counterBlock[15 - c] = _b >>> 8 * c & 255;
            for (var _c2 = 0; _c2 < 4; _c2++) counterBlock[15 - _c2 - 4] = (_b + 1) / 4294967296 - 1 >>> 8 * _c2 & 255;
            var cipherCntr = Algo.cipher(counterBlock, keySchedule);
            var plaintxtByte = new Array(ciphertext[_b].length);
            for (var _i7 = 0; _i7 < ciphertext[_b].length; _i7++) {
              plaintxtByte[_i7] = cipherCntr[_i7] ^ ciphertext[_b].charCodeAt(_i7);
              plaintxtByte[_i7] = String.fromCharCode(plaintxtByte[_i7]);
            }
            plaintxt[_b] = plaintxtByte.join("");
          }
          var plaintext = plaintxt.join("");
          plaintext = plaintext.utf8Decode();
          return plaintext;
        };
        var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        encryptjs.base64Encode = function(input) {
          var output = "";
          var chr1 = void 0, chr2 = void 0, chr3 = void 0, enc1 = void 0, enc2 = void 0, enc3 = void 0, enc4 = void 0;
          var i = 0;
          input = encryptjs._utf8_encode(input);
          while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = (3 & chr1) << 4 | chr2 >> 4;
            enc3 = (15 & chr2) << 2 | chr3 >> 6;
            enc4 = 63 & chr3;
            isNaN(chr2) ? enc3 = enc4 = 64 : isNaN(chr3) && (enc4 = 64);
            output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
          }
          return output;
        };
        encryptjs.base64Decode = function(input) {
          var output = "";
          var chr1 = void 0, chr2 = void 0, chr3 = void 0;
          var enc1 = void 0, enc2 = void 0, enc3 = void 0, enc4 = void 0;
          var i = 0;
          input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
          while (i < input.length) {
            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));
            chr1 = enc1 << 2 | enc2 >> 4;
            chr2 = (15 & enc2) << 4 | enc3 >> 2;
            chr3 = (3 & enc3) << 6 | enc4;
            output += String.fromCharCode(chr1);
            64 != enc3 && (output += String.fromCharCode(chr2));
            64 != enc4 && (output += String.fromCharCode(chr3));
          }
          output = encryptjs._utf8_decode(output);
          return output;
        };
        encryptjs._utf8_encode = function(string) {
          string = string.replace(/\r\n/g, "\n");
          var utftext = "";
          for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) utftext += String.fromCharCode(c); else if (c > 127 && c < 2048) {
              utftext += String.fromCharCode(c >> 6 | 192);
              utftext += String.fromCharCode(63 & c | 128);
            } else {
              utftext += String.fromCharCode(c >> 12 | 224);
              utftext += String.fromCharCode(c >> 6 & 63 | 128);
              utftext += String.fromCharCode(63 & c | 128);
            }
          }
          return utftext;
        };
        encryptjs._utf8_decode = function(utftext) {
          var string = "";
          var i = 0;
          var c = 0;
          var c1 = 0;
          var c2 = 0;
          var c3 = 0;
          while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
              string += String.fromCharCode(c);
              i++;
            } else if (c > 191 && c < 224) {
              c2 = utftext.charCodeAt(i + 1);
              string += String.fromCharCode((31 & c) << 6 | 63 & c2);
              i += 2;
            } else {
              c2 = utftext.charCodeAt(i + 1);
              c3 = utftext.charCodeAt(i + 2);
              string += String.fromCharCode((15 & c) << 12 | (63 & c2) << 6 | 63 & c3);
              i += 3;
            }
          }
          return string;
        };
        encryptjs.getTextEncryptAndSaveToTextFile = function(filePath, password, nBits) {
          if (!rl) throw Error("Command line not supported on this platform");
          rl.question("Enter the text to be encrypted: ", function(answer) {
            console.log("'" + answer + "' This text will be encrypted and stored in a text file 'encrypted.txt'");
            var cipherText = encryptjs.encrypt(answer, password, nBits);
            rl.close();
          });
        };
        encryptjs.getTextEncryptAndSaveToJSONFile = function(filePath, password, nBits) {
          if (!rl) throw Error("Command line not supported on this platform");
          rl.question("Enter the text to be encrypted: ", function(answer) {
            console.log("'" + answer + "' This text will be encrypted and stored in a text file 'encrypted.txt'");
            var cipherText = encryptjs.encrypt(answer, password, nBits);
            encryptjs.writeCipherTextToJSON(filePath, {
              EncryptedText: cipherText
            }, function() {
              console.log("'encryptedText.JSON' File created in your local directory, if not present refresh your project");
            });
            rl.close();
          });
        };
        encryptjs.writeCipherTextToJSON = function(file, obj, options, callback) {
          if (null == callback) {
            callback = options;
            options = {};
          }
          var spaces = "object" === ("undefined" === typeof options ? "undefined" : _typeof(options)) && null !== options && "spaces" in options ? options.spaces : this.spaces;
          var str = "";
          try {
            str = JSON.stringify(obj, options ? options.replacer : null, spaces) + "\n";
          } catch (err) {
            if (callback) return callback(err, null);
          }
        };
        "undefined" == typeof String.prototype.utf8Encode && (String.prototype.utf8Encode = function() {
          return unescape(encodeURIComponent(this));
        });
        "undefined" == typeof String.prototype.utf8Decode && (String.prototype.utf8Decode = function() {
          try {
            return decodeURIComponent(escape(this));
          } catch (e) {
            return this;
          }
        });
        "undefined" == typeof String.prototype.base64Encode && (String.prototype.base64Encode = function() {
          if ("undefined" != typeof btoa) return btoa(this);
          if ("undefined" != typeof Buffer) return new Buffer(this, "utf8").toString("base64");
          throw new Error("No Base64 Encode");
        });
        "undefined" == typeof String.prototype.base64Decode && (String.prototype.base64Decode = function() {
          if ("undefined" != typeof atob) return atob(this);
          if ("undefined" != typeof Buffer) return new Buffer(this, "base64").toString("utf8");
          throw new Error("No Base64 Decode");
        });
        encryptjs.init();
        return encryptjs;
      });
      cc._RF.pop();
    }).call(this, require("buffer").Buffer);
  }, {
    "./Algo": "Algo",
    buffer: 47
  } ],
  EnemyAttrData: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "13c2ayStb1OxKw43gQsFz9u", "EnemyAttrData");
    "use strict";
    var Utils = require("./../framework/common/UtilsOther");
    var DataBase = require("./DataBase");
    cc.Class({
      extends: DataBase,
      ctor: function ctor() {
        this.fileDir = "config/enemyAttrData";
      },
      initData: function initData(data) {
        if (!data) return;
        this.dataObj = data;
        this.dataLen = data.length;
        this.dataObj = Utils.arrayToDict(this.dataObj, "id");
      },
      getTurretAttr: function getTurretAttr(id) {
        var data = this.dataObj[id];
        return data;
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/common/UtilsOther": "UtilsOther",
    "./DataBase": "DataBase"
  } ],
  FBLogger: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "dce77Wl/ahBRrf7Vl0Wh2d/", "FBLogger");
    "use strict";
    var PACKAGENAMEFB = "com/zygame/utils/FBHelper";
    cc.Class({
      statics: {
        logEventLevel: function logEventLevel(level) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "logEventLevel", "(I)V", level);
          cc.sys.os == cc.sys.OS_IOS;
        },
        logEventWatchAds: function logEventWatchAds(adName) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "logEventWatchAD", "(Ljava/lang/String;)V", adName);
          cc.sys.os == cc.sys.OS_IOS;
        },
        logEventClickButton: function logEventClickButton(btName) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "logEventClickButton", "(Ljava/lang/String;)V", btName);
          cc.sys.os == cc.sys.OS_IOS;
        },
        logEvent: function logEvent(eventName, key, value) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "logEvent", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", eventName, key, value);
          cc.sys.os == cc.sys.OS_IOS;
        },
        logEventName: function logEventName(eventName) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "logEventName", "(Ljava/lang/String;)V", eventName);
          cc.sys.os == cc.sys.OS_IOS;
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  GameHttp: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "8afc1m51YpB/YM/mIkdgeO+", "GameHttp");
    "use strict";
    var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    var DEFAULT_HTTP_TIMEOUT = 5e3;
    var HttpError = {
      TIMEOUT: "timeout",
      ERROR: "error",
      ABORT: "abort"
    };
    var HttpResponse = cc.Class({
      ctor: function ctor() {
        this.xhr_ = null;
        this.error_ = null;
      },
      init: function init(xhr) {
        this.xhr_ = xhr;
      },
      isOk: function isOk() {
        var xhr = this.xhr_;
        return 4 == xhr.readyState && xhr.status >= 200 && xhr.status <= 207;
      },
      getBody: function getBody() {
        return this.xhr_.response;
      },
      setError: function setError(error) {
        this.error_ = error;
      },
      getError: function getError() {
        return this.error_;
      },
      getHeaders: function getHeaders() {},
      getHeader: function getHeader(name) {}
    });
    var registerEventsForXmlHttpRequest_ = function registerEventsForXmlHttpRequest_(xhr, callback) {
      var r = new HttpResponse();
      r.init(xhr);
      xhr.onreadystatechange = function(evt) {
        4 == xhr.readyState && callback(r);
      };
      xhr.ontimeout = function(evt) {
        r.setError(HttpError.TIMEOUT);
        callback(r);
      };
      xhr.onerror = function(evt) {
        r.setError(HttpError.ERROR);
        callback(r);
      };
      xhr.onabort = function(evt) {
        r.setError(HttpError.ABORT);
        callback(r);
      };
    };
    var httpGet = function httpGet(url, callback, opt_timeout) {
      var xhr = cc.loader.getXMLHttpRequest();
      xhr.timeout = opt_timeout || DEFAULT_HTTP_TIMEOUT;
      callback && registerEventsForXmlHttpRequest_(xhr, callback);
      xhr.open("GET", url, true);
      xhr.send();
    };
    var httpPost = function httpPost(url, data, callback, opt_timeout) {
      var xhr = cc.loader.getXMLHttpRequest();
      xhr.timeout = opt_timeout || DEFAULT_HTTP_TIMEOUT;
      callback && registerEventsForXmlHttpRequest_(xhr, callback);
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
      cc.log("===>httpPost: " + ("undefined" === typeof data ? "undefined" : _typeof(data)) + " | " + JSON.stringify(data));
      xhr.send(data);
    };
    module.exports = {
      httpGet: httpGet,
      httpPost: httpPost
    };
    cc._RF.pop();
  }, {} ],
  GameNetwork: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6d3b90F1ltPQqEXXz0L8FEx", "GameNetwork");
    "use strict";
    var GameWebSocket = require("./GameWebSocket");
    var GameProtocols = require("./GameProtocols");
    var response_state = {
      ERROR_OK: "0"
    };
    var NetworkCallback = cc.Class({
      properties: {
        request: null,
        callback: null
      },
      init: function init(request, callback) {
        this.request = request;
        this.callback = callback;
      }
    });
    var GameNetwork = cc.Class({
      extends: GameWebSocket.GameWebSocketDelegate,
      ctor: function ctor() {
        this._socket = null;
        this._delegate = null;
        this._requestSequenceId = 0;
        this.pushResponseCallback = {};
        this._networkCallbacks = {};
      },
      setDelegate: function setDelegate(delegate) {
        this._delegate = delegate;
      },
      registerPushResponseCallback: function registerPushResponseCallback(act, callback) {
        this.pushResponseCallback[act] = callback;
      },
      isSocketOpened: function isSocketOpened() {
        return this._socket && this._socket.getState() == GameWebSocket.GameWebSocketState.OPEN;
      },
      isSocketClosed: function isSocketClosed() {
        return null == this._socket;
      },
      connect: function connect(url) {
        cc.log("webSocketUrls=" + url);
        this._requestSequenceId = 0;
        this._socket = new GameWebSocket.GameWebSocket();
        this._socket.init(url, this);
        this._socket.connect();
      },
      closeConnect: function closeConnect() {
        this._socket && this._socket.close();
      },
      onSocketOpen: function onSocketOpen() {
        cc.log("Socket:onOpen");
        this._delegate && this._delegate.onNetworkOpen && this._delegate.onNetworkOpen();
      },
      onSocketError: function onSocketError() {
        cc.log("Socket:onError");
      },
      onSocketClosed: function onSocketClosed(reason) {
        cc.log("Socket:onClose", reason);
        this._socket && this._socket.close();
        this._socket = null;
        this._delegate && this._delegate.onNetworkClose && this._delegate.onNetworkClose();
      },
      onSocketMessage: function onSocketMessage(msg) {
        this._onResponse(msg);
      },
      _onResponse: function _onResponse(responseData) {
        cc.log("response->resp:", responseData);
        var responseJson = JSON.parse(responseData);
        var responseClass = GameProtocols.response_classes[responseJson.act];
        var response = new responseClass();
        response.loadData(responseJson.data);
        response.act = responseJson.act;
        response.seq = responseJson.seq;
        response.err = responseJson.err;
        response.ts = responseJson.ts;
        var ignoreError = false;
        if (-1 != response.seq) {
          var pushCallback = this.pushResponseCallback[response.act];
          pushCallback && pushCallback(response);
          var callbackObj = this._networkCallbacks[response.seq];
          callbackObj && (ignoreError = callbackObj.callback(response));
        }
        if (response.err && response.err != response_state.ERROR_OK && !ignoreError) if (response.is_async) ; else {
          var msg = responseJson.msg;
          cc.log("server err " + msg);
        }
      },
      sendRequest: function sendRequest(request, opt_callback) {
        request.seq = ++this._requestSequenceId;
        if (opt_callback) {
          this._networkCallbacks[request.seq] = new NetworkCallback();
          this._networkCallbacks[request.seq].init(request, opt_callback);
        }
        this._sendSocketRequest(false, request);
      },
      sendRequestNoData: function sendRequestNoData(request, opt_callback) {
        request.seq = ++this._requestSequenceId;
        if (opt_callback) {
          this._networkCallbacks[request.seq] = new NetworkCallback();
          this._networkCallbacks[request.seq].init(request, opt_callback);
        }
        this._sendSocketRequest(true, request);
      },
      _sendSocketRequest: function _sendSocketRequest(isNoData, req) {
        cc.assert(this._socket);
        if (this.isSocketOpened()) {
          var msg = null;
          msg = isNoData ? JSON.stringify({
            seq: req.seq,
            act: req.act
          }) : JSON.stringify({
            seq: req.seq,
            act: req.act,
            data: req
          });
          cc.log("WebSocketDelegate::send->" + msg);
          this._socket.send(msg);
        }
      }
    });
    module.exports = GameNetwork;
    cc._RF.pop();
  }, {
    "./GameProtocols": "GameProtocols",
    "./GameWebSocket": "GameWebSocket"
  } ],
  GameProtocols: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "ee9afyHSeJGaahOsOe7M5FZ", "GameProtocols");
    "use strict";
    var BaseProtocol = cc.Class({
      ctor: function ctor() {
        this.act = "";
        this.seq = 0;
        this.err = 0;
        this.is_async = false;
      }
    });
    var BaseRequest = cc.Class({
      extends: BaseProtocol
    });
    var BaseResponse = cc.Class({
      extends: BaseProtocol,
      loadData: function loadData(data) {
        var key;
        for (key in data) {
          if (!this.hasOwnProperty(key)) continue;
          void 0 !== data[key] && null !== data[key] && (this[key] = data[key]);
        }
      }
    });
    var HeartRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "heart";
        this.t = -1;
      }
    });
    var HeartResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "heart";
        this.t = -1;
      }
    });
    var RandomMatchRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "rmatch";
        this.uid = 0;
      }
    });
    var RandomMatchResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "rmatch";
        this.rid = 0;
        this.black = 0;
        this.other = 0;
        this.order = 0;
      }
    });
    var CreateRoomRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "createRoom";
      }
    });
    var CreateRoomResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "createRoom";
        this.rid = 0;
      }
    });
    var JoinRoomRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "joinRoom";
        this.rid = 0;
      }
    });
    var PlayChessRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "playChess";
        this.cid = 0;
        this.lastBedIndex = 0;
        this.dest = {
          index: 0,
          x: 0,
          y: 0
        };
      }
    });
    var PushPlayChess = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.order = 0;
        this.act = "playChess";
        this.uid = 0;
        this.cid = 0;
        this.winner = 0;
        this.dest = {
          index: 0,
          x: 0,
          y: 0
        };
      }
    });
    var ChatRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "chat";
        this.msg = "";
        this.uid = "";
      }
    });
    var PushChat = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "chat";
        this.msg = "";
        this.uid = "";
      }
    });
    var SelectChessRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "selectChess";
        this.cid = 0;
      }
    });
    var PushSelectChess = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "selectChess";
        this.cid = 0;
      }
    });
    var LoginRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "login";
        this.token = "";
        this.origin = 0;
        this.os = "";
        this.osVersion = "";
        this.deviceModel = "";
        this.channelId = 0;
        this.idfa = "";
        this.androidId = "";
        this.googleAid = "";
        this.appVersion = "";
        this.packName = "";
        this.language = "";
        this.locale = "";
        this.uid = 0;
      }
    });
    var LoginResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "login";
        this.token = "";
        this.self = {
          isBlack: false,
          chessDic: {}
        };
        this.other = {
          isBlack: false,
          chessDic: {},
          uid: 0
        };
        this.order = 0;
        this.rid = 0;
        this.isReconn = false;
      }
    });
    var LogoutRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "logout";
      }
    });
    var LogoutResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "logout";
      }
    });
    var BindFacebookRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "bindFb";
        this.token = "";
      }
    });
    var BindFacebookResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "bindFb";
        this.me = 0;
        this.friends = 0;
      }
    });
    var RankRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "rankboard";
        this.type = 0;
      }
    });
    var RankResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "rankboard";
        this.myRank = 0;
        this.men = [];
      }
    });
    var PushExitRoom = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "exitRoom";
        this.uid = 0;
      }
    });
    var PushSendSpResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "sendSpNotify";
        this.friend = null;
      }
    });
    var PushTakeSpResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "takeSpNotify";
        this.friend = null;
      }
    });
    var PushSyncFriendInfo = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "friendInfoSync";
        this.friend = null;
      }
    });
    var DebugChangeMeRequest = cc.Class({
      extends: BaseRequest,
      ctor: function ctor() {
        this.act = "cmdTest";
        this.cmd = "";
      }
    });
    var DebugChangeMeResponse = cc.Class({
      extends: BaseResponse,
      ctor: function ctor() {
        this.act = "cmdTest";
        this.me = {};
        this.spInterval = null;
        this.spStepLeftTime = null;
        this.farmDailyOut = null;
        this.farmCoins = null;
        this.farmInterval = null;
        this.buildings = null;
      }
    });
    var response_classes = {
      login: LoginResponse,
      logout: LogoutResponse,
      bindFb: BindFacebookResponse,
      rankboard: RankResponse,
      heart: HeartResponse,
      rmatch: RandomMatchResponse,
      createRoom: CreateRoomResponse,
      chat: PushChat,
      exitRoom: PushExitRoom,
      playChess: PushPlayChess,
      selectChess: PushSelectChess,
      sendSpNotify: PushSendSpResponse,
      takeSpNotify: PushTakeSpResponse,
      friendInfoSync: PushSyncFriendInfo,
      cmdTest: DebugChangeMeResponse
    };
    module.exports = {
      LoginRequest: LoginRequest,
      LoginResponse: LoginResponse,
      LogoutRequest: LogoutRequest,
      LogoutResponse: LogoutResponse,
      BindFacebookRequest: BindFacebookRequest,
      BindFacebookResponse: BindFacebookResponse,
      RankRequest: RankRequest,
      RankResponse: RankResponse,
      HeartRequest: HeartRequest,
      HeartResponse: HeartResponse,
      ChatRequest: ChatRequest,
      RandomMatchRequest: RandomMatchRequest,
      RandomMatchResponse: RandomMatchResponse,
      PlayChessRequest: PlayChessRequest,
      SelectChessRequest: SelectChessRequest,
      CreateRoomRequest: CreateRoomRequest,
      CreateRoomResponse: CreateRoomResponse,
      JoinRoomRequest: JoinRoomRequest,
      DebugChangeMeRequest: DebugChangeMeRequest,
      DebugChangeMeResponse: DebugChangeMeResponse,
      PushChat: PushChat,
      PushExitRoom: PushExitRoom,
      PushPlayChess: PushPlayChess,
      PushSendSpResponse: PushSendSpResponse,
      PushTakeSpResponse: PushTakeSpResponse,
      PushSyncFriendInfo: PushSyncFriendInfo,
      response_classes: response_classes
    };
    cc._RF.pop();
  }, {} ],
  GameWebSocket: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7ba25vCzDxHGK1L/2U83Qx/", "GameWebSocket");
    "use strict";
    var GameWebSocketState = cc.Enum({
      CONNECTING: 1,
      OPEN: 2,
      CLOSING: 3,
      CLOSED: 4
    });
    var GameWebSocketDelegate = cc.Class({
      onSocketOpen: function onSocketOpen() {},
      onSocketMessage: function onSocketMessage(data) {},
      onSocketError: function onSocketError() {},
      onSocketClosed: function onSocketClosed(reason) {}
    });
    var GameWebSocketInterface = cc.Class({
      connect: function connect() {},
      send: function send() {},
      close: function close() {},
      getState: function getState() {}
    });
    var GameWebSocket = cc.Class({
      extends: GameWebSocketInterface,
      properties: {
        _address: null,
        _delegate: null,
        _webSocket: null
      },
      init: function init(address, delegate) {
        this._address = address;
        this._delegate = delegate;
        this._webSocket = null;
      },
      connect: function connect() {
        cc.log("connect to " + this._address);
        var ws = this._webSocket = new WebSocket(this._address);
        ws.onopen = this._delegate.onSocketOpen.bind(this._delegate);
        ws.onmessage = function(param) {
          this._delegate.onSocketMessage(param.data);
        }.bind(this);
        ws.onerror = this._delegate.onSocketError.bind(this._delegate);
        ws.onclose = function(param) {
          this._delegate.onSocketClosed(param.reason);
        }.bind(this);
      },
      send: function send(stringOrBinary) {
        this._webSocket.send(stringOrBinary);
      },
      close: function close() {
        if (!this._webSocket) return;
        try {
          this._webSocket.close();
        } catch (err) {
          cc.log("error while closing webSocket", err.toString());
        }
        this._webSocket = null;
      },
      getState: function getState() {
        if (this._webSocket) switch (this._webSocket.readyState) {
         case WebSocket.OPEN:
          return GameWebSocketState.OPEN;

         case WebSocket.CONNECTING:
          return GameWebSocketState.CONNECTING;

         case WebSocket.CLOSING:
          return GameWebSocketState.CLOSING;

         case WebSocket.CLOSED:
          return GameWebSocketState.CLOSED;
        }
        return GameWebSocketState.CLOSED;
      }
    });
    module.exports = {
      GameWebSocketState: GameWebSocketState,
      GameWebSocketDelegate: GameWebSocketDelegate,
      GameWebSocketInterface: GameWebSocketInterface,
      GameWebSocket: GameWebSocket
    };
    cc._RF.pop();
  }, {} ],
  Guide: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "758846ZgwpGZLjqN2ZhXxS8", "Guide");
    "use strict";
    var OPEN_GUIDE = true;
    var RENEW = {
      0: [ 1001, 1002 ],
      1: [ 1001, 1003, 1004 ],
      2: [ 1005, 1006, 1007, 1008, 1009 ],
      3: [ 1010, 1011 ],
      4: [ 1012, 1013 ]
    };
    var CFG = {};
    CFG[1001] = function() {
      zy.guide.hit({
        name: "guide_button2",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1002] = function() {
      zy.guide.slideTower({
        name: "guide_weapon_2",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1003] = function() {
      zy.guide.hit({
        name: "guide_weapon_0",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1004] = function() {
      zy.guide.hit({
        name: "guide_upgradeBtn",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1005] = function() {
      zy.guide.hit({
        name: "guide_skill_1",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1006] = function() {
      zy.guide.hit({
        name: "guide_skill_2",
        showMask: true,
        click: function click() {
          setTimeout(function() {
            zy.guide.showNext();
          }, 500);
        }
      });
    };
    CFG[1007] = function() {
      zy.guide.hit({
        name: "guide_skill_3",
        showMask: true,
        click: function click() {
          setTimeout(function() {
            zy.guide.showNext();
          }, 500);
        }
      });
    };
    CFG[1008] = function() {
      zy.guide.hit({
        name: "guide_button_add_time",
        showMask: true,
        click: function click() {
          setTimeout(function() {
            zy.guide.showNext();
          }, 500);
        }
      });
    };
    CFG[1009] = function() {
      zy.guide.look({
        name: "guide_skill_progressBar",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1010] = function() {
      zy.guide.hit({
        name: "guide_button1",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1011] = function() {
      zy.guide.hit({
        name: "guide_upgrade_hp",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1012] = function() {
      zy.guide.hit({
        name: "guide_button3",
        showMask: true,
        click: function click() {
          zy.guide.showNext();
        }
      });
    };
    CFG[1013] = function() {
      zy.guide.hit({
        name: "guide_free_coins",
        showMask: true,
        click: function click() {
          setTimeout(function() {
            zy.guide.showNext();
          }, 500);
        }
      });
    };
    cc.Class({
      extends: cc.Component,
      statics: {
        OPEN_GUIDE: OPEN_GUIDE,
        CFG: CFG,
        init: function init(params) {
          cc.log("===init guide: ", params);
          this.step = params.step;
          this.stepList = [];
          this.cb = null;
          1001 == this.step && (this.step = 0);
          this.OPEN_GUIDE ? this.openStatus = true : this.openStatus = false;
          this.node = null;
          this.maskNode = null;
        },
        setStep: function setStep(step) {
          this.step = step;
        },
        setOpenStatus: function setOpenStatus(status) {
          this.openStatus = status;
        },
        getOpenStatus: function getOpenStatus() {
          return this.openStatus;
        },
        getNextStep: function getNextStep() {
          if (!zy.guide.getOpenStatus() || !OPEN_GUIDE) return;
          return this.stepList[0];
        },
        addStep: function addStep(step) {
          0 == this.stepList.length && this.stepList.push(step);
        },
        checkGuide: function checkGuide() {
          var data = RENEW[this.step];
          if (data) {
            this.stepList = zy.utils.clone(data);
            zy.guide.showNext();
          }
        },
        showNext: function showNext(step, node) {
          if (!zy.guide.getOpenStatus() || !OPEN_GUIDE) return;
          if (step) this.CFG[step](node); else {
            var _step = this.stepList.shift();
            if (null == _step) zy.guide.clean(); else {
              this.step = _step;
              cc.log("zy.guide.show", _step);
              this.CFG[this.step]();
            }
          }
        },
        hit: function hit(params) {
          var _this = this;
          this.hideMask();
          var name = params.name;
          var hitNode = zy.ui.seekChildByName(zy.director.getSceneCanvas(), name);
          if (!hitNode) {
            var seq = cc.sequence(cc.delayTime(.5), cc.callFunc(function() {
              _this.hit(params);
            }));
            this.node.runAction(seq);
            return;
          }
          var lastScale = hitNode.scale;
          var lastPos = hitNode.position;
          var lastParent = hitNode.parent;
          var lastZIndex = hitNode.zIndex;
          var worldPos = lastParent.convertToWorldSpaceAR(lastPos);
          hitNode.parent = this.node;
          hitNode.position = this.node.convertToNodeSpaceAR(worldPos);
          hitNode.zIndex = 1;
          hitNode.scale = lastScale;
          var animation = hitNode.getComponent(cc.Animation);
          animation && animation.play("guide_shake", 0);
          cc.log("===oriPos:" + JSON.stringify(lastPos));
          cc.log("===newPos:" + JSON.stringify(hitNode.position));
          var maskNode = null;
          params.showMask && (maskNode = this.createMaskNode(hitNode, this.node, params.digging));
          var hitClick = function hitClick() {
            cc.log("===click guide hit node");
            hitNode.off(cc.Node.EventType.TOUCH_START, hitClick, _this, true);
            hitNode.parent = lastParent;
            hitNode.position = lastPos;
            hitNode.zIndex = lastZIndex;
            if (animation) {
              animation.setCurrentTime(0, "guide_shake");
              animation.stop("guide_shake");
            }
            cc.isValid(maskNode) && maskNode.destroy();
            params.click && params.click();
          };
          hitNode.on(cc.Node.EventType.TOUCH_START, hitClick, this, true);
        },
        slideTower: function slideTower(params) {
          var _this2 = this;
          this.hideMask();
          var name = params.name;
          var hitNode = zy.ui.seekChildByName(zy.director.getSceneCanvas(), name);
          if (!hitNode) {
            var seq = cc.sequence(cc.delayTime(.5), cc.callFunc(function() {
              _this2.slideTower(params);
            }));
            this.node.runAction(seq);
            return;
          }
          var lastScale = hitNode.scale;
          var lastPos = hitNode.position;
          var lastParent = hitNode.parent;
          var lastZIndex = hitNode.zIndex;
          var worldPos = lastParent.convertToWorldSpaceAR(lastPos);
          hitNode.parent = this.node;
          hitNode.position = this.node.convertToNodeSpaceAR(worldPos);
          hitNode.zIndex = 1;
          hitNode.scale = lastScale;
          var maskNode = null;
          params.showMask && (maskNode = this.createMaskNode(hitNode, this.node, params.digging));
          var hitClick = function hitClick() {
            _this2.node.off(cc.Node.EventType.TOUCH_START, hitClick, _this2, true);
            hitNode.parent = lastParent;
            hitNode.position = lastPos;
            hitNode.zIndex = lastZIndex;
            _this2.slideAniNode.destroy();
            cc.isValid(maskNode) && maskNode.destroy();
            params.click && params.click();
          };
          cc.loader.loadRes("MainGame/Ui/gun_drag", cc.Prefab, function(err, pf) {
            if (err) cc.log(err); else {
              var aniNode = _this2.slideAniNode = cc.instantiate(pf);
              aniNode.zIndex = 2;
              aniNode.parent = _this2.node;
              aniNode.position = _this2.node.convertToNodeSpaceAR(hitNode.parent.convertToWorldSpaceAR(hitNode.position));
              aniNode.getComponent(cc.Animation).play("guide_drag", 0);
              _this2.node.on(cc.Node.EventType.TOUCH_START, hitClick, _this2, true);
            }
          });
        },
        look: function look(params) {
          var _this3 = this;
          this.hideMask();
          var name = params.name;
          var hitNode = zy.ui.seekChildByName(zy.director.getSceneCanvas(), name);
          if (!hitNode) {
            var seq = cc.sequence(cc.delayTime(.5), cc.callFunc(function() {
              _this3.hit(params);
            }));
            this.node.runAction(seq);
            return;
          }
          var lastScale = hitNode.scale;
          var lastPos = hitNode.position;
          var lastParent = hitNode.parent;
          var lastZIndex = hitNode.zIndex;
          var worldPos = lastParent.convertToWorldSpaceAR(lastPos);
          hitNode.parent = this.node;
          hitNode.position = this.node.convertToNodeSpaceAR(worldPos);
          hitNode.zIndex = 1;
          hitNode.scale = lastScale;
          cc.log("===oriPos:" + JSON.stringify(lastPos));
          cc.log("===newPos:" + JSON.stringify(hitNode.position));
          var maskNode = null;
          params.showMask && (maskNode = this.createMaskNode(hitNode, this.node, params.digging));
          var hitClick = function hitClick() {
            cc.log("===click guide look node");
            _this3.node.off(cc.Node.EventType.TOUCH_START, hitClick, _this3, true);
            hitNode.parent = lastParent;
            hitNode.position = lastPos;
            hitNode.zIndex = lastZIndex;
            cc.isValid(maskNode) && maskNode.destroy();
            params.click && params.click();
          };
          this.node.on(cc.Node.EventType.TOUCH_START, hitClick, this, true);
        },
        createMaskNode: function createMaskNode(hitNode, parent, digging) {
          var maskNode = zy.Node.createNode({
            name: "guideMaskNode",
            parent: parent,
            position: cc.v2(0, 0)
          });
          if (digging) {
            var cr = Math.max(hitNode.width, hitNode.height);
            var hitPos = hitNode.parent.convertToWorldSpaceAR(hitNode.position);
            var pos = maskNode.convertToNodeSpaceAR(hitPos);
            var mask = maskNode.addComponent(cc.Mask);
            mask.type = cc.Mask.Type.RECT;
            mask.inverted = true;
            mask._graphics.lineWidth = 1;
            mask._graphics.strokeColor = cc.color(255, 0, 0);
            mask._graphics.fillColor = cc.color(0, 255, 0);
            mask._graphics.circle(pos.x, pos.y, .5 * cr);
            mask._graphics.fill();
            mask._graphics.stroke();
          }
          var blackNode = zy.Node.createNode({
            parent: maskNode,
            position: cc.v2(0, 0)
          });
          blackNode.addComponent(zy.Sprite);
          zy.Sprite.updateNode(blackNode, {
            url: "textures/common/guide/guide_mask",
            width: 1.5 * zy.constData.DesignSize.width,
            height: 1.5 * zy.constData.DesignSize.height
          });
          return maskNode;
        },
        checkStatus: function checkStatus() {
          if (!this.openStatus) return;
          cc.isValid(this.node) || (this.node = zy.Button.createNode({
            name: "guideNode",
            zIndex: zy.constData.ZIndex.GUIDE,
            parent: zy.director.getUiRoot(),
            touchAction: false,
            width: 2 * zy.constData.DesignSize.width,
            height: 2 * zy.constData.DesignSize.height
          }));
        },
        hideMask: function hideMask() {
          cc.isValid(this.maskNode) && (this.maskNode.active = false);
        },
        showMask: function showMask() {
          if (!this.openStatus) return;
          this.maskNode.active = true;
        },
        isShowMask: function isShowMask() {
          return !(!cc.isValid(this.node) || !cc.isValid(this.maskNode)) && (this.node.active && this.maskNode.active);
        },
        clean: function clean() {
          this.openStatus = false;
          this.step = -1;
          if (cc.isValid(this.node)) {
            this.node.destroy();
            this.node = null;
          }
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  HotUpdate: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "d989cs4cdZFtq7PriQKE9uC", "HotUpdate");
    "use strict";
    var UpdatePanel = require("./UpdatePanel");
    cc.Class({
      extends: cc.Component,
      properties: {
        panel: UpdatePanel,
        manifestUrl: {
          type: cc.Asset,
          default: null
        },
        versionUrl: {
          type: cc.Asset,
          default: null
        },
        updateUI: cc.Node,
        _updating: false,
        _canRetry: false,
        _storagePath: ""
      },
      checkCb: function checkCb(event) {
        cc.log("Code: " + event.getEventCode());
        var hasNew = false;
        switch (event.getEventCode()) {
         case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
          cc.log("No local manifest file found, hot update skipped.");
          cc.director.loadScene("InitScene");
          break;

         case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
         case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
          cc.log("Fail to download manifest file, hot update skipped.");
          cc.director.loadScene("InitScene");
          break;

         case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
          cc.log("Already up to date with the latest remote version.");
          cc.director.loadScene("InitScene");
          break;

         case jsb.EventAssetsManager.NEW_VERSION_FOUND:
          this.panel.fileProgress.progress = 0;
          this.panel.byteProgress.progress = 0;
          hasNew = true;
          break;

         default:
          return;
        }
        this._am.setEventCallback(null);
        this._checkListener = null;
        this._updating = false;
        hasNew && this.show();
      },
      updateCb: function updateCb(event) {
        var needRestart = false;
        var failed = false;
        switch (event.getEventCode()) {
         case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
          this.panel.info.string = "No local manifest file found, hot update skipped.";
          failed = true;
          break;

         case jsb.EventAssetsManager.UPDATE_PROGRESSION:
          this.panel.byteProgress.progress = event.getPercent();
          this.panel.fileProgress.progress = event.getPercentByFile();
          this.panel.fileLabel.string = event.getDownloadedFiles() + " / " + event.getTotalFiles();
          this.panel.byteLabel.string = event.getDownloadedBytes() + " / " + event.getTotalBytes();
          var msg = event.getMessage();
          msg && (this.panel.info.string = "Updated file: " + msg);
          break;

         case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
         case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
          this.panel.info.string = "Fail to download manifest file, hot update skipped.";
          failed = true;
          break;

         case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
          this.panel.info.string = "Already up to date with the latest remote version.";
          failed = true;
          break;

         case jsb.EventAssetsManager.UPDATE_FINISHED:
          this.panel.info.string = "Update finished. " + event.getMessage();
          needRestart = true;
          break;

         case jsb.EventAssetsManager.UPDATE_FAILED:
          this.panel.info.string = "Update failed. " + event.getMessage();
          this.panel.retryBtn.active = true;
          this._updating = false;
          this._canRetry = true;
          break;

         case jsb.EventAssetsManager.ERROR_UPDATING:
          this.panel.info.string = "Asset update error: " + event.getAssetId() + ", " + event.getMessage();
          break;

         case jsb.EventAssetsManager.ERROR_DECOMPRESS:
          this.panel.info.string = event.getMessage();
        }
        if (failed) {
          this._am.setEventCallback(null);
          this._updateListener = null;
          this._updating = false;
        }
        if (needRestart) {
          this._am.setEventCallback(null);
          this._updateListener = null;
          var searchPaths = jsb.fileUtils.getSearchPaths();
          var newPaths = this._am.getLocalManifest().getSearchPaths();
          console.log(JSON.stringify(newPaths));
          Array.prototype.unshift.apply(searchPaths, newPaths);
          cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(searchPaths));
          cc.log("seachPaths: " + JSON.stringify(searchPaths));
          jsb.fileUtils.setSearchPaths(searchPaths);
          cc.audioEngine.stopAll();
          cc.game.restart();
        }
      },
      loadCustomManifest: function loadCustomManifest() {
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
          var manifest = new jsb.Manifest(customManifestStr, this._storagePath);
          this._am.loadLocalManifest(manifest, this._storagePath);
          this.panel.info.string = "Using custom manifest";
        }
      },
      retry: function retry() {
        if (!this._updating && this._canRetry) {
          this.panel.retryBtn.active = false;
          this._canRetry = false;
          this.panel.info.string = "Retry failed Assets...";
          this._am.downloadFailedAssets();
        }
      },
      checkUpdate: function checkUpdate() {
        if (this._updating) {
          this.panel.info.string = "Checking or updating ...";
          return;
        }
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
          var url = this.manifestUrl.nativeUrl;
          cc.loader.md5Pipe && (url = cc.loader.md5Pipe.transformURL(url));
          this._am.loadLocalManifest(url);
        }
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
          this.panel.info.string = "Failed to load local manifest ...";
          return;
        }
        this._am.setEventCallback(this.checkCb.bind(this));
        this._am.checkUpdate();
        this._updating = true;
      },
      hotUpdate: function hotUpdate() {
        cc.log("111111");
        cc.log(this._am);
        cc.log(this._updating);
        if (this._am && !this._updating) {
          this._am.setEventCallback(this.updateCb.bind(this));
          cc.log("2222222");
          if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            var url = this.manifestUrl.nativeUrl;
            cc.loader.md5Pipe && (url = cc.loader.md5Pipe.transformURL(url));
            this._am.loadLocalManifest(url);
            cc.log("33333");
          }
          cc.log("4444");
          this._failCount = 0;
          this._am.update();
          this._updating = true;
        }
      },
      show: function show() {
        if (false == this.updateUI.active) {
          this.updateUI.active = true;
          this.hotUpdate();
        }
      },
      onLoad: function onLoad() {
        if (!cc.sys.isNative) return;
        this._storagePath = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + HOT_UPDATE_SUB_PATH;
        cc.log("Storage path for remote asset : " + this._storagePath);
        this.versionCompareHandle = function(versionA, versionB) {
          cc.log("JS Custom Version Compare: version A is " + versionA + ", version B is " + versionB);
          var vA = versionA.split(".");
          var vB = versionB.split(".");
          for (var i = 0; i < vA.length; ++i) {
            var a = parseInt(vA[i]);
            var b = parseInt(vB[i] || 0);
            if (a === b) continue;
            return a - b;
          }
          return vB.length > vA.length ? -1 : 0;
        };
        this._am = new jsb.AssetsManager("", this._storagePath, this.versionCompareHandle);
        var panel = this.panel;
        this._am.setVerifyCallback(function(path, asset) {
          var compressed = asset.compressed;
          var expectedMD5 = asset.md5;
          var relativePath = asset.path;
          var size = asset.size;
          if (compressed) {
            panel.info.string = "Verification passed : " + relativePath;
            return true;
          }
          panel.info.string = "Verification passed : " + relativePath + " (" + expectedMD5 + ")";
          return true;
        });
        cc.log("Hot update is ready, please check or directly update.");
        if (cc.sys.os === cc.sys.OS_ANDROID) {
          this._am.setMaxConcurrentTask(2);
          cc.log("android: Max concurrent tasks count have been limited to 2");
        }
        this.panel.fileProgress.progress = 0;
        this.panel.byteProgress.progress = 0;
      },
      start: function start() {
        if (!cc.sys.isNative) {
          cc.director.loadScene("InitScene");
          return;
        }
        this.checkUpdate();
        var PlatformUtils = require("./../framework/platform/PlatformUtils");
        PlatformUtils.rmSplash();
      },
      onDestroy: function onDestroy() {
        if (this._updateListener) {
          this._am.setEventCallback(null);
          this._updateListener = null;
        }
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/platform/PlatformUtils": "PlatformUtils",
    "./UpdatePanel": "UpdatePanel"
  } ],
  HttpProxy: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "ae20cwKtwdBMZtY6Ie6ZibZ", "HttpProxy");
    "use strict";
    var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    var GameHttp = require("./GameHttp");
    var Md5 = require("./../encrypt/Md5").md5_hex_hmac;
    var UtilsCross = require("./../platform/PlatformUtils");
    var UCRETRY = 5;
    var LOGINRETRY = 5;
    var port = [ 8010, 8011, 8012, 8015, 8016, 8017 ][Math.round(5 * Math.random())];
    var urlroot = "http://mini-game.zhanyougame.com:" + port + "/zc_game?m=";
    var encryptKey = "zygame";
    var HttpProxy = cc.Class({
      statics: {
        instance: null,
        getInstance: function getInstance() {
          this.instance || (this.instance = new HttpProxy());
          return this.instance;
        }
      },
      login: function login(onSuc, onFailed) {
        var _this = this;
        cc.log("===urlroot:" + urlroot);
        var data = {
          energy: 1,
          otherpassplies: 1,
          loginday: 1,
          diamond: 10,
          allautoatt: 10,
          normalpassplies: 1,
          cversion: UtilsCross.getAppVersion(),
          healthlevel: zy.dataMng.userData.hpLevel,
          goldrewardlevel: zy.dataMng.userData.freeCoinsLevel,
          stamina: zy.dataMng.userData.phPower,
          channel: CHANNEL_ID,
          macaddress: zy.device.mac,
          idfa: zy.device.idfa
        };
        var url = urlroot + "user_join_game";
        var failCb = function failCb() {
          onFailed && onFailed();
          if (LOGINRETRY > 0) {
            LOGINRETRY -= 1;
            setTimeout(function() {
              _this.login();
            }, 5e3);
          }
        };
        this.serverRequest(url, data, onSuc, failCb);
      },
      updateBase: function updateBase(id, value, onSuc, onFailed) {
        var data = {
          baseinfoid: id,
          value: value
        };
        var url = urlroot + "base_info_change";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      updateTurret: function updateTurret(id, level, star, lock, onSuc, onFailed) {
        var data = {
          level: level,
          turretid: id,
          star: star,
          lock: lock
        };
        var url = urlroot + "turret_info";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      updateBuilding: function updateBuilding(id, lock, onSuc, onFailed) {
        var data = {
          buildingid: id,
          lock: lock
        };
        var url = urlroot + "building_info";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      updateTreasure: function updateTreasure(id, lock, onSuc, onFailed) {
        var data = {
          treasureid: id,
          lock: lock
        };
        var url = urlroot + "treasure_info";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      watchAds: function watchAds(placeId, onSuc, onFailed) {
        var data = {
          adstationid: placeId
        };
        var url = urlroot + "watch_advertisement";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      clickButton: function clickButton(btnId, onSuc, onFailed) {
        var data = {
          buttonid: btnId
        };
        var url = urlroot + "click_button";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      getServerTime: function getServerTime(onSuc, onFailed) {
        var data = {};
        var url = urlroot + "request_unixtime";
        this.serverRequest(url, data, onSuc, onFailed);
      },
      serverRequest: function serverRequest(url, data, onSuc, onFailed) {
        cc.log("===>serverRequest: " + ("undefined" === typeof data ? "undefined" : _typeof(data)) + " | " + JSON.stringify(data));
        data = "string" == typeof data ? data : JSON.stringify(data);
        var encryptStr = Md5(encryptKey, data);
        var uid = UtilsCross.getMobilePhoneID();
        uid = void 0 == uid ? "" : uid;
        cc.log("uid=" + uid);
        var newData = {
          data: JSON.parse(data),
          encrypt: encryptStr,
          roleid: uid,
          token: ""
        };
        newData = JSON.stringify(newData);
        GameHttp.httpPost(url, newData, function(rep) {
          cc.log("===>response:" + rep.getBody());
          if (rep.isOk()) {
            cc.log("===>requrest: " + url + " \u6210\u529f\u3002");
            onSuc && onSuc(JSON.parse(rep.getBody()));
          } else {
            cc.log("===>requrest: " + url + " \u5931\u8d25\u3002");
            onFailed && onFailed(rep.getError() || rep.getBody());
          }
        });
      }
    });
    cc._RF.pop();
  }, {
    "./../encrypt/Md5": "Md5",
    "./../platform/PlatformUtils": "PlatformUtils",
    "./GameHttp": "GameHttp"
  } ],
  ImageLoader: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "bc14cw8w1BD+YXEJ8wOFpD2", "ImageLoader");
    "use strict";
    function __loadImage(url, callback) {
      cc.loader.load({
        url: url,
        type: "jpeg"
      }, function(err, tex) {
        err ? cc.error(err) : callback(tex);
      });
    }
    function loadImage(url, callback) {
      if (!cc.sys.isNative) {
        __loadImage(url, callback);
        return;
      }
      var dirpath = jsb.fileUtils.getWritablePath() + "TclGameImg/";
      cc.log("dirpath: " + dirpath);
      var md5 = require("./../encrypt/Md5");
      var md5Url = md5.md5_hex(url);
      var filePath = dirpath + md5Url + ".jpg";
      cc.log("filepath: " + filePath);
      function loadEnd() {
        cc.loader.load(filePath, function(err, tex) {
          err ? cc.error(err) : callback(tex);
        });
      }
      if (jsb.fileUtils.isFileExist(filePath)) {
        cc.log("Remote img is find: " + filePath);
        loadEnd();
        return;
      }
      var saveFile = function saveFile(data) {
        if (data && "undefined" !== typeof data) {
          jsb.fileUtils.isDirectoryExist(dirpath) ? cc.log("\u8def\u5f84 " + dirpath + "\u5df2\u7ecf\u5b58\u5728\u3002") : jsb.fileUtils.createDirectory(dirpath);
          if (jsb.fileUtils.writeDataToFile(new Uint8Array(data), filePath)) {
            cc.log("Remote img save succeed.");
            loadEnd();
          } else cc.log("Remote img save failed.");
        } else cc.log("Remote img download failed.");
      };
      var xhr = cc.loader.getXMLHttpRequest();
      xhr.onreadystatechange = function() {
        cc.log("xhr.readyState: " + xhr.readyState);
        cc.log("xhr.status: " + xhr.status);
        4 === xhr.readyState && (200 === xhr.status ? saveFile(xhr.response) : saveFile(null));
      }.bind(this);
      xhr.responseType = "arraybuffer";
      xhr.open("GET", url, true);
      xhr.send();
    }
    module.exports = {
      loadImage: loadImage
    };
    cc._RF.pop();
  }, {
    "./../encrypt/Md5": "Md5"
  } ],
  InitScene: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "be329An/tdHbbITHsY2sOVj", "InitScene");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {},
      onLoad: function onLoad() {
        if (cc.sys.isNative) {
          var baseLocalVersion = cc.sys.localStorage.getItem("BASE_LOCAL_VERSION");
          cc.sys.localStorage.setItem("BASE_LOCAL_VERSION", BASE_LOCAL_VERSION);
          if ("" != baseLocalVersion && baseLocalVersion != BASE_LOCAL_VERSION) {
            var path = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + HOT_UPDATE_SUB_PATH;
            jsb.fileUtils.removeDirectory(path);
            cc.log("\u5927\u7248\u672c\u66f4\u65b0\uff0cpath: " + path);
            cc.game.restart();
          } else this.init();
        } else this.init();
        cc.debug.setDisplayStats(DEBUG_OPEN);
      },
      init: function init() {
        window.i18n = require("./../framework/i18n/i18n");
        zy.event = new cc.EventTarget();
        zy.utils = require("./../framework/common/UtilsOther");
        var HttpProxy = require("./../framework/net/HttpProxy");
        zy.httpProxy = new HttpProxy();
        zy.constData = require("./../data/ConstData");
        zy.constData.init();
        zy.shaderUtils = require("./../framework/common/ShaderUtils");
        zy.shaderUtils.init();
        zy.ui = require("./../framework/common/UI");
        zy.ui.init();
        zy.cornerMng = require("./../framework/common/CornerMng");
        zy.cornerMng.init([]);
        zy.device = require("./../framework/common/Device");
        zy.device.init();
        zy.audio = require("./../framework/common/Audio");
        zy.audio.init();
        zy.director = require("./../framework/common/Director");
        zy.director.init();
        var DataMng = require("./../data/DataMng");
        zy.dataMng = new DataMng();
        zy.dataMng.loadDataFromLocalFile(function(c, t) {
          cc.log("load local cfg: %d/%d", c, t);
        }, function() {
          zy.director.loadScene("MapScene");
        });
      }
    });
    cc._RF.pop();
  }, {
    "./../data/ConstData": "ConstData",
    "./../data/DataMng": "DataMng",
    "./../framework/common/Audio": "Audio",
    "./../framework/common/CornerMng": "CornerMng",
    "./../framework/common/Device": "Device",
    "./../framework/common/Director": "Director",
    "./../framework/common/ShaderUtils": "ShaderUtils",
    "./../framework/common/UI": "UI",
    "./../framework/common/UtilsOther": "UtilsOther",
    "./../framework/i18n/i18n": "i18n",
    "./../framework/net/HttpProxy": "HttpProxy"
  } ],
  LabelInteger: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "f674fOMBSpIZLaQSTfJ+Irg", "LabelInteger");
    "use strict";
    var UtilsOther = require("UtilsOther");
    var LabelFormType = cc.Enum({
      None: 0,
      ThousandSeparator: 1,
      FormatTime: 2
    });
    var formatTime = function formatTime(s) {
      var t = void 0;
      if (s >= 0) {
        var hour = Math.floor(s / 3600);
        var min = Math.floor(s / 60) % 60;
        var sec = s % 60;
        var day = parseInt(hour / 24);
        if (1 == day) return day + " day";
        if (day > 1) return day + " days";
        if (day > 0) {
          hour -= 24 * day;
          t = day + "day " + ("00" + hour).slice(-2) + ":";
        } else t = hour > 0 ? ("00" + hour).slice(-2) + ":" : "";
        min < 10 && (t += "0");
        t += min + ":";
        sec < 10 && (t += "0");
        t += parseInt(sec);
      }
      return t;
    };
    cc.Class({
      extends: cc.Label,
      properties: {
        formType: {
          tooltip: "None: \u4e0d\u505a\u683c\u5f0f\u5316\nThousandSeparator: 3\u4f4d\u9017\u53f7\u5206\u9694\nFormatTime: \u683c\u5f0f\u5316\u65f6\u95f4",
          type: LabelFormType,
          default: LabelFormType.None,
          notify: function notify(oldValue) {
            this.setValue(this.string);
          }
        },
        animationDuration: {
          tooltip: "\u52a8\u753b\u65f6\u95f4",
          default: .5
        },
        _textKey: 0,
        string: {
          override: true,
          tooltip: "\u5fc5\u987b\u662f\u6570\u5b57",
          get: function get() {
            return this._textKey;
          },
          set: function set(value) {
            this._textKey = Number(value);
            if (this._sgNode) {
              switch (this.formType) {
               case LabelFormType.ThousandSeparator:
                value = value.toString().split("").reverse().join("").replace(/(\d{3}(?=\d)(?!\d+\.|$))/g, "$1,").split("").reverse().join("");
                break;

               case LabelFormType.FormatTime:
                value = formatTime(value);
              }
              this._sgNode.setString(value);
              this._updateNodeSize();
            }
          }
        },
        _curValue: 0,
        _toValue: 0,
        _delta: 0
      },
      setValue: function setValue(value, animate) {
        ("" === value || null === value || isNaN(value)) && cc.assert(false, "The value of LabelInteger must be a Number!");
        if (animate) this._toValue = value; else {
          this._toValue = value;
          this._curValue = value;
          this.string = value;
        }
        this._delta = 0;
      },
      setFormString: function setFormString(value) {
        switch (this.formType) {
         case LabelFormType.None:
          this.string = value;
          break;

         case LabelFormType.ThousandSeparator:
          this.string = value.split("").reverse().join("").replace(/(\d{3}(?=\d)(?!\d+\.|$))/g, "$1,").split("").reverse().join("");
          break;

         case LabelFormType.FormatTime:
          this.string = formatTime(value);
        }
      },
      update: function update(dt) {
        if (this._toValue != this._curValue) {
          0 == this._delta && (this._delta = this._toValue - this._curValue);
          var step = dt / this.animationDuration * this._delta;
          if (this._delta > 0) {
            step = parseInt(step);
            0 == step && (step = 1);
            this._curValue += step;
            this._curValue = Math.min(this._curValue, this._toValue);
          } else {
            step = -step;
            step = parseInt(step);
            0 == step && (step = 1);
            this._curValue -= step;
            this._curValue = Math.max(this._curValue, this._toValue);
          }
          this.string = this._curValue;
          this._toValue == this._curValue && (this._delta = 0);
        }
      },
      onLoad: function onLoad() {
        this.setValue(this.string);
      }
    });
    cc._RF.pop();
  }, {
    UtilsOther: "UtilsOther"
  } ],
  Label: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "64cd4KWD1hGiZ4uUhNcZKVY", "Label");
    "use strict";
    var i18n = require("i18n");
    var Label = cc.Class({
      extends: cc.Label,
      statics: {
        createNode: function createNode(params) {
          var node = new cc.Node();
          node.addComponent(zy.Label);
          zy.Label.updateNode(node, params);
          return node;
        },
        updateNode: function updateNode(node, params) {
          var label = node.getComponent(zy.Label);
          label || (label = node.getComponent(cc.Label));
          var font = params.font ? params.font : zy.constData.Font.FONT_NORMAL;
          var loadCallback = params.loadCallback;
          var systemFont = params.systemFont;
          var updateFunc = function() {
            params.overflow && (label.overflow = params.overflow);
            params.hasOwnProperty("string") && (label.string = params.string);
            params.hasOwnProperty("verticalAlign") && (label.verticalAlign = params.verticalAlign);
            params.fontSize && (label.fontSize = params.fontSize);
            if (params.outlineWidth || params.outlineColor) {
              var outline = node.getComponent(cc.LabelOutline);
              outline || (outline = node.addComponent(cc.LabelOutline));
              params.outlineWidth && (outline.width = params.outlineWidth);
              params.outlineColor && (outline.color = params.outlineColor);
            }
          }.bind(this);
          if (systemFont) {
            updateFunc();
            loadCallback && loadCallback(null, node);
          } else cc.loader.loadRes(font, cc.Font, null, function(err, _font) {
            if (err) cc.log("zy.Label.updateLabel err:", err); else if (cc.isValid(node)) {
              label.font = _font;
              updateFunc();
            }
            loadCallback && loadCallback(err, node);
          }.bind(this));
          zy.Node.updateNode(node, params);
        },
        createAttrNode: function createAttrNode(attrs, params) {
          var attrNode = zy.Node.createNode(params);
          var layout = attrNode.addComponent(cc.Layout);
          layout.type = cc.Layout.Type.HORIZONTAL;
          layout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
          var subNodes = [];
          for (var i in attrs) {
            var subNode = null;
            var attr = attrs[i];
            attr.anchor = attr.anchor ? attr.anchor : cc.v2(0, .5);
            attr.parent = attrNode;
            if ("text" == attr.type) {
              subNode = zy.Label.createNode(attr);
              attr.color && (subNode.color = attr.color);
            }
            subNode.__type = attr.type;
            subNodes.push(subNode);
          }
          attrNode.subNodes = subNodes;
          return attrNode;
        },
        updateAttrNode: function updateAttrNode(node, attrs, params) {
          var subNodes = node.subNodes;
          for (var i in attrs) {
            var attr = attrs[i];
            var subNode = subNodes[i];
            var __type = subNode.__type;
            "text" == __type && zy.Label.updateNode(subNode, attr);
          }
        }
      },
      properties: {
        textKey: {
          override: true,
          default: "",
          multiline: true,
          tooltip: "Enter i18n key here",
          notify: function notify() {
            this.string = this.localizedString;
          }
        },
        textValueOption: {
          override: true,
          default: "",
          multiline: true,
          tooltip: "Enter textValueOption here",
          notify: function notify(oldValue) {
            this.string = this.localizedString;
          }
        },
        localizedString: {
          override: true,
          tooltip: "Here shows the localized string of Text Key",
          get: function get() {
            var _textKeyOption = void 0;
            if (this.textValueOption && "" != this.textValueOption) try {
              _textKeyOption = JSON.parse(this.textValueOption);
            } catch (error) {}
            return i18n.t(this.textKey, _textKeyOption);
          },
          set: function set(value) {
            this.textKey = value;
            false;
          }
        }
      },
      onLoad: function onLoad() {
        this.localizedString && (this.string = this.localizedString);
      }
    });
    zy.Label = module.exports = Label;
    cc._RF.pop();
  }, {
    i18n: "i18n"
  } ],
  ListView: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "0a6b1zwRINNuZP6KVs0lXLD", "ListView");
    "use strict";
    var ListAdapter = cc.Class({
      ctor: function ctor() {
        this.dataSet = [];
      },
      setItemComponent: function setItemComponent(itemComponent) {
        this.itemComponent = itemComponent;
      },
      getComponentType: function getComponentType() {
        return this.itemComponent;
      },
      setDataSet: function setDataSet(data) {
        this.dataSet = data;
      },
      getCount: function getCount() {
        return this.dataSet.length;
      },
      getItem: function getItem(posIndex) {
        return this.dataSet[posIndex];
      },
      _getView: function _getView(item, posIndex) {
        var itemComp = item.getComponent(this.itemComponent);
        itemComp ? this.updateView(itemComp, posIndex) : cc.warn("item \u4e0d\u5305\u542b\u7ec4\u4ef6:", this.itemComponent);
        return item;
      },
      updateView: function updateView(item, posIndex) {}
    });
    var ListView = cc.Class({
      extends: cc.Component,
      properties: {
        itemTemplate: {
          type: cc.Prefab,
          default: null
        },
        spacing: {
          type: cc.Float,
          default: 1
        },
        spawnCount: {
          type: cc.Integer,
          default: 3
        },
        scrollView: {
          type: cc.ScrollView,
          default: null
        },
        content: {
          type: cc.Node,
          default: null,
          visible: false
        },
        adapter: {
          type: ListAdapter,
          default: null,
          visible: false,
          serializable: false
        },
        _items: {
          type: cc.NodePool,
          default: null,
          visible: false
        },
        _filledIds: {
          type: Object,
          default: {},
          visible: false
        },
        horizontal: {
          default: false,
          visible: false
        },
        _itemHeight: 1,
        _itemWidth: 1,
        _itmesVisble: 1,
        lastStartIndex: {
          type: cc.Integer,
          default: -1,
          visible: false
        },
        scrollTopNotifyed: {
          default: false,
          visible: false
        },
        scrollBottomNofityed: {
          default: false,
          visible: false
        },
        pullDownCallback: {
          type: Object,
          default: null,
          visible: false
        },
        pullUpCallback: {
          type: Object,
          default: null,
          visible: false
        }
      },
      onLoad: function onLoad() {
        if (this.scrollView) {
          this.content = this.scrollView.content;
          this.horizontal = this.scrollView.horizontal;
          if (this.horizontal) {
            this.scrollView.vertical = false;
            this.content.anchorX = 0;
            this.content.x = this.content.getParent().width * this.content.getParent().anchorX;
          } else {
            this.scrollView.vertical = true;
            this.content.anchorY = 1;
            this.content.y = this.content.getParent().height * this.content.getParent().anchorY;
          }
        } else console.error("ListView need a scrollView for showing.");
        this._items = this._items || new cc.NodePool();
        var itemOne = this._items.get() || cc.instantiate(this.itemTemplate);
        this._items.put(itemOne);
        this._itemHeight = itemOne.height || 10;
        this._itemWidth = itemOne.width || 10;
        this.horizontal ? this._itemsVisible = Math.ceil(this.content.getParent().width / this._itemWidth) : this._itemsVisible = Math.ceil(this.content.getParent().height / this._itemHeight);
        console.log("\u53ef\u89c1\u533a\u57df\u7684item\u6570\u91cf\u4e3a:", this._itemsVisible);
        this.adjustEvent();
      },
      setAdapter: function setAdapter(adapter) {
        this.adapter = adapter;
        if (null == this.adapter) {
          cc.warn("adapter \u4e3a\u7a7a.");
          return;
        }
        if (null == this.itemTemplate) {
          cc.error("Listview \u672a\u8bbe\u7f6e\u5f85\u663e\u793a\u7684Item\u6a21\u677f.");
          return;
        }
        this._items.poolHandlerComp = this.adapter.getComponentType();
        this.notifyUpdate();
      },
      getItemIndex: function getItemIndex(height) {
        return Math.floor(Math.abs(height / (this._itemHeight + this.spacing)));
      },
      getPositionInView: function getPositionInView(item) {
        var worldPos = item.getParent().convertToWorldSpaceAR(item.position);
        var viewPos = this.scrollView.node.convertToNodeSpaceAR(worldPos);
        return viewPos;
      },
      notifyUpdate: function notifyUpdate(updateIndex) {
        var _this = this;
        if (null == this.adapter) return;
        updateIndex && updateIndex.length > 0 ? updateIndex.forEach(function(i) {
          _this._filledIds.hasOwnProperty(i) && delete _this._filledIds[i];
        }) : Object.keys(this._filledIds).forEach(function(key) {
          delete _this._filledIds[key];
        });
        this.lastStartIndex = -1;
        this.horizontal ? this.content.width = this.adapter.getCount() * (this._itemWidth + this.spacing) + this.spacing : this.content.height = this.adapter.getCount() * (this._itemHeight + this.spacing) + this.spacing;
        this.scrollView.scrollToTop();
      },
      scrollToTop: function scrollToTop(anim) {
        this.scrollView.scrollToTop(anim ? 1 : 0);
      },
      scrollToBottom: function scrollToBottom(anim) {
        this.scrollView.scrollToBottom(anim ? 1 : 0);
      },
      scrollToLeft: function scrollToLeft(anim) {
        this.scrollView.scrollToLeft(anim ? 1 : 0);
      },
      scrollToRight: function scrollToRight(anim) {
        this.scrollView.scrollToRight(anim ? 1 : 0);
      },
      pullDown: function pullDown(callback) {
        this.pullDownCallback = callback;
      },
      pullUp: function pullUp(callback) {
        this.pullUpCallback = callback;
      },
      update: function update(dt) {
        var startIndex = this.checkNeedUpdate();
        startIndex >= 0 && this.updateView(startIndex);
      },
      _layoutVertical: function _layoutVertical(child, posIndex) {
        this.content.addChild(child);
        child["_tag"] = posIndex;
        this._filledIds[posIndex] = posIndex;
        child.setPosition(0, -child.height * (.5 + posIndex) - this.spacing * (posIndex + 1));
      },
      _layoutHorizontal: function _layoutHorizontal(child, posIndex) {
        this.content.addChild(child);
        child["_tag"] = posIndex;
        this._filledIds[posIndex] = posIndex;
        child.setPosition(-child.width * (.5 + posIndex) - this.spacing * (posIndex + 1), 0);
      },
      getRecycleItems: function getRecycleItems(beginIndex, endIndex) {
        var _this2 = this;
        var children = this.content.children;
        var recycles = [];
        children.forEach(function(item) {
          if (item["_tag"] < beginIndex || item["_tag"] > endIndex) {
            recycles.push(item);
            delete _this2._filledIds[item["_tag"]];
          }
        });
        return recycles;
      },
      updateView: function updateView(startIndex) {
        var _this3 = this;
        var itemStartIndex = startIndex;
        var itemEndIndex = itemStartIndex + this._itemsVisible + (this.spawnCount || 2);
        var totalCount = this.adapter.getCount();
        if (itemStartIndex >= totalCount) return;
        if (itemEndIndex > totalCount) {
          itemEndIndex = totalCount;
          if (!this.scrollBottomNotifyed) {
            this.notifyScrollToBottom();
            this.scrollBottomNotifyed = true;
          }
        } else this.scrollBottomNotifyed = false;
        var recyles = this.getRecycleItems(itemStartIndex - (this.spawnCount || 2), itemEndIndex);
        recyles.forEach(function(item) {
          _this3._items.put(item);
        });
        var updates = this.findUpdateIndex(itemStartIndex, itemEndIndex);
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = void 0;
        try {
          for (var _iterator = updates[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var index = _step.value;
            var child = this.adapter._getView(this._items.get() || cc.instantiate(this.itemTemplate), index);
            this.horizontal ? this._layoutHorizontal(child, index) : this._layoutVertical(child, index);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            !_iteratorNormalCompletion && _iterator.return && _iterator.return();
          } finally {
            if (_didIteratorError) throw _iteratorError;
          }
        }
      },
      checkNeedUpdate: function checkNeedUpdate() {
        if (null == this.adapter) return -1;
        var scroll = this.horizontal ? this.content.x - this.content.getParent().width * this.content.getParent().anchorX : this.content.y - this.content.getParent().height * this.content.getParent().anchorY;
        var itemStartIndex = Math.floor(scroll / ((this.horizontal ? this._itemWidth : this._itemHeight) + this.spacing));
        if (itemStartIndex < 0 && !this.scrollTopNotifyed) {
          this.notifyScrollToTop();
          this.scrollTopNotifyed = true;
          return itemStartIndex;
        }
        itemStartIndex > 0 && (this.scrollTopNotifyed = false);
        if (this.lastStartIndex != itemStartIndex) {
          this.lastStartIndex = itemStartIndex;
          return itemStartIndex;
        }
        return -1;
      },
      findUpdateIndex: function findUpdateIndex(itemStartIndex, itemEndIndex) {
        var d = [];
        for (var i = itemStartIndex; i < itemEndIndex; i++) {
          if (this._filledIds.hasOwnProperty(i)) continue;
          d.push(i);
        }
        return d;
      },
      notifyScrollToTop: function notifyScrollToTop() {
        if (!this.adapter || this.adapter.getCount() <= 0) return;
        this.pullDownCallback && this.pullDownCallback();
      },
      notifyScrollToBottom: function notifyScrollToBottom() {
        if (!this.adapter || this.adapter.getCount() <= 0) return;
        this.pullUpCallback && this.pullUpCallback();
      },
      adjustEvent: function adjustEvent() {
        var _this4 = this;
        this.content.on(this.isMobile() ? cc.Node.EventType.TOUCH_END : cc.Node.EventType.MOUSE_UP, function() {
          _this4.scrollTopNotifyed = false;
          _this4.scrollBottomNotifyed = false;
        }, this);
        this.content.on(this.isMobile() ? cc.Node.EventType.TOUCH_CANCEL : cc.Node.EventType.MOUSE_LEAVE, function() {
          _this4.scrollTopNotifyed = false;
          _this4.scrollBottomNotifyed = false;
        }, this);
      },
      isMobile: function isMobile() {
        return cc.sys.isMobile || cc.sys.platform === cc.sys.WECHAT_GAME || cc.sys.platform === cc.sys.QQ_PLAY;
      }
    });
    module.exports = {
      ListAdapter: ListAdapter,
      ListView: ListView
    };
    cc._RF.pop();
  }, {} ],
  Loading: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a0e26giQ25CbryNSYfouOEG", "Loading");
    "use strict";
    var Loading = cc.Class({
      extends: cc.Component,
      statics: {
        loadingNode: null,
        loadingComponent: null,
        show: function show(loadingName) {
          if (!cc.isValid(this.loadingNode)) {
            this.loadingNode = zy.Node.createNode({
              name: "loading",
              width: 2 * zy.constData.DesignSize.width,
              height: 2 * zy.constData.DesignSize.width,
              zIndex: zy.constData.ZIndex.LOADING,
              parent: zy.director.getUiRoot()
            });
            this.loadingComponent = this.loadingNode.addComponent("Loading");
            this.loadingComponent.init();
          }
          this.loadingComponent.show(loadingName);
        },
        hide: function hide(loadingName) {
          cc.isValid(this.loadingNode) && this.loadingComponent.hide(loadingName);
        }
      },
      properties: {},
      init: function init() {
        this.loadingList = [];
        this.node.width = 2 * zy.constData.DesignSize.width;
        this.node.height = 2 * zy.constData.DesignSize.height;
        this.node.addComponent(cc.BlockInputEvents);
        this.maskNode = zy.Sprite.createNode({
          name: "maskNode",
          url: "textures/common/mask",
          parent: this.node,
          size: cc.size(2 * zy.constData.DesignSize.width, 2 * zy.constData.DesignSize.height),
          loadCallback: function(err, node) {
            node.width = 2 * zy.constData.DesignSize.width;
            node.height = 2 * zy.constData.DesignSize.height;
          }.bind(this)
        });
        zy.Label.createNode({
          string: "Loading...",
          parent: this.maskNode,
          systemFont: false
        });
        this.maskNode.active = false;
      },
      show: function show(name) {
        -1 == this.loadingList.indexOf(name) && this.loadingList.push(name);
        this.node.active = true;
        this.node.stopAllActions();
        var delaySeq = cc.sequence(cc.delayTime(1), cc.callFunc(function() {
          this.delaySeq = null;
          this.maskNode.active = true;
        }.bind(this)));
        this.node.runAction(delaySeq);
      },
      hide: function hide(name) {
        var index = this.loadingList.indexOf(name);
        index > -1 && this.loadingList.splice(index, 1);
        if (0 == this.loadingList.length) {
          this.node.active = false;
          this.maskNode.active = false;
        }
      },
      clean: function clean() {
        this.node.active = false;
        this.loadingList = [];
      }
    });
    cc._RF.pop();
  }, {} ],
  LoggerHelper: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6635fCdo61II6O7HUaipHsk", "LoggerHelper");
    "use strict";
    var AFLogger = require("./AFLogger");
    var FBLogger = require("./FBLogger");
    var TrackingLogger = require("./TrackingLogger");
    var RangerLogger = require("./RangerLogger");
    var LogHelper = cc.Class({
      statics: {
        logEventWatchAds: function logEventWatchAds(placeId) {
          if (101 == CHANNEL_ID || 102 == CHANNEL_ID) {
            AFLogger.logEventWatchAds(placeId);
            FBLogger.logEventWatchAds(placeId);
          } else if (201 == CHANNEL_ID || 201 == CHANNEL_ID) {
            TrackingLogger.logEventWatchAds(placeId);
            RangerLogger.logEventWatchAds(placeId);
          }
        },
        logEventLogin: function logEventLogin(uid) {
          if (101 == CHANNEL_ID) ; else if (102 == CHANNEL_ID) ; else if (201 == CHANNEL_ID || 202 == CHANNEL_ID) {
            TrackingLogger.logEventLogin(uid);
            RangerLogger.logEventLogin(uid);
          }
        }
      }
    });
    zy.LogHelper = LogHelper;
    cc._RF.pop();
  }, {
    "./AFLogger": "AFLogger",
    "./FBLogger": "FBLogger",
    "./RangerLogger": "RangerLogger",
    "./TrackingLogger": "TrackingLogger"
  } ],
  MapCtrl: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "4a979eim/NOt7bmMqf9+olD", "MapCtrl");
    "use strict";
    var _vm = require("vm");
    var _crypto = require("crypto");
    var MAP_MIN_SCALE = .26;
    var MAP_MAX_SCALE = 1;
    cc.Class({
      extends: cc.Component,
      properties: {
        map: cc.TiledMap
      },
      prepare: function prepare() {
        this._moving = false;
        this.initMap();
      },
      start: function start() {
        this.prepare();
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this, true);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancle, this, true);
      },
      initMap: function initMap() {
        var cfg = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      },
      onTouchStart: function onTouchStart(event) {
        this._moving = false;
      },
      onTouchMove: function onTouchMove(event) {
        var touches = event.getTouches();
        if (touches.length >= 2) {
          cc.log("\u5730\u56fe\u7f29\u653e\u3002\u3002\u3002");
          this._moving = false;
          var touch1 = touches[0];
          var touch2 = touches[1];
          var delta1 = touch1.getDelta();
          var delta2 = touch2.getDelta();
          var touchPoint1 = this.node.parent.convertToNodeSpaceAR(touch1.getLocation());
          var touchPoint2 = this.node.parent.convertToNodeSpaceAR(touch2.getLocation());
          var anchorBefore = this.map.node.getAnchorPoint();
          var disLeft = this.map.node.width * anchorBefore.x * this.map.node.scale - this.map.node.x;
          var disBottom = this.map.node.height * anchorBefore.y * this.map.node.scale - this.map.node.y;
          var anchorAfter = cc.v2(disLeft / (this.map.node.width * this.map.node.scale), disBottom / (this.map.node.height * this.map.node.scale));
          this.map.node.setAnchorPoint(anchorAfter);
          var disX = this.map.node.width * (anchorBefore.x - anchorAfter.x) * this.map.node.scale;
          var disY = this.map.node.height * (anchorBefore.y - anchorAfter.y) * this.map.node.scale;
          this.map.node.setPosition(cc.v2(this.map.node.x - disX, this.map.node.y - disY));
          cc.log("new anchor:", JSON.stringify(anchorAfter));
          var distance = touchPoint1.sub(touchPoint2);
          var delta = delta1.sub(delta2);
          var scale = 1;
          scale = Math.abs(distance.x) > Math.abs(distance.y) ? (distance.x + .5 * delta.x) / distance.x * this.map.node.scale : (distance.y + .5 * delta.y) / distance.y * this.map.node.scale;
          var minScale = cc.visibleRect.height / this.map.node.height;
          minScale = Math.max(minScale, MAP_MIN_SCALE);
          scale >= MAP_MAX_SCALE ? scale = MAP_MAX_SCALE : scale < minScale && (tscale = minScale);
          this.map.node.scale = scale;
          cc.log("map scale:" + scale);
        } else {
          return;
          var _delta;
          var _scale;
          var anchorX;
          var anchorY;
        }
        this.goBoundary();
      },
      onTouchEnd: function onTouchEnd(event) {},
      onTouchCancle: function onTouchCancle(event) {},
      goBoundary: function goBoundary() {
        var mapScale = this.map.node.scale;
        var anchorAfter = this.map.node.getAnchorPoint();
        var posXLeft = cc.visibleRect.width / 2 - (this.map.node.width * anchorAfter.x * mapScale - this.map.node.x);
        if (posXLeft > 0) {
          var posx = this.map.node.width * anchorAfter.x * mapScale - cc.visibleRect.width / 2;
          this.map.node.x = posx;
        }
        var posXRight = cc.visibleRect.width / 2 - (this.map.node.width * (1 - anchorAfter.x) * mapScale + this.map.node.x);
        if (posXRight > 0) {
          var _posx = cc.visibleRect.width / 2 - this.map.node.width * (1 - anchorAfter.x) * mapScale;
          this.map.node.x = _posx;
        }
        var posYTop = cc.visibleRect.height / 2 - (this.map.node.height * (1 - anchorAfter.y) * mapScale + this.map.node.y);
        if (posYTop > 0) {
          var posy = cc.visibleRect.height / 2 - this.map.node.height * (1 - anchorAfter.y) * mapScale - 20;
          this.map.node.y = posy;
        }
        var poxYBottom = cc.visibleRect.height / 2 - (this.map.node.height * anchorAfter.y * mapScale - this.map.node.y);
        if (poxYBottom > 0) {
          var _posy = this.map.node.height * anchorAfter.y * mapScale - cc.visibleRect.height / 2;
          this.map.node.y = _posy;
        }
      }
    });
    cc._RF.pop();
  }, {
    crypto: 56,
    vm: 155
  } ],
  MapScene: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a351dgNiYhL+J62JNyk6Huc", "MapScene");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        map: cc.TiledMap,
        mapCamera: cc.Camera,
        sp: cc.Sprite
      },
      start: function start() {
        if (cc.sys.isBrowser) {
          var ua = window.navigator.userAgent;
          cc.log(ua);
          ua.indexOf("iPad") > 0 ? cc.log("apple iPad") : ua.indexOf("Tablet") > 0 ? cc.log("android pad") : cc.log("other device");
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  MapScrollView: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "0dceePCAS9Ga48SiFGo1e1T", "MapScrollView");
    "use strict";
    cc.Class({
      extends: cc.ScrollView,
      getMaxScrollOffset: function getMaxScrollOffset() {
        var viewSize = this._view.getContentSize();
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var horizontalMaximizeOffset = contentSize.width - viewSize.width;
        var verticalMaximizeOffset = contentSize.height - viewSize.height;
        horizontalMaximizeOffset = horizontalMaximizeOffset >= 0 ? horizontalMaximizeOffset : 0;
        verticalMaximizeOffset = verticalMaximizeOffset >= 0 ? verticalMaximizeOffset : 0;
        return cc.v2(horizontalMaximizeOffset, verticalMaximizeOffset);
      },
      _calculateMovePercentDelta: function _calculateMovePercentDelta(options) {
        var anchor = options.anchor;
        var applyToHorizontal = options.applyToHorizontal;
        var applyToVertical = options.applyToVertical;
        this._calculateBoundary();
        anchor = anchor.clampf(cc.v2(0, 0), cc.v2(1, 1));
        var scrollSize = this._view.getContentSize();
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;
        var leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
        leftDeta = -leftDeta;
        var moveDelta = cc.v2(0, 0);
        var totalScrollDelta = 0;
        if (applyToHorizontal) {
          totalScrollDelta = contentSize.width - scrollSize.width;
          moveDelta.x = leftDeta - totalScrollDelta * anchor.x;
        }
        if (applyToVertical) {
          totalScrollDelta = contentSize.height - scrollSize.height;
          moveDelta.y = bottomDeta - totalScrollDelta * anchor.y;
        }
        return moveDelta;
      },
      _moveContentToTopLeft: function _moveContentToTopLeft(scrollViewSize) {
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;
        var moveDelta = cc.v2(0, 0);
        var totalScrollDelta = 0;
        var leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
        leftDeta = -leftDeta;
        if (contentSize.height < scrollViewSize.height) {
          totalScrollDelta = contentSize.height - scrollViewSize.height;
          moveDelta.y = bottomDeta - totalScrollDelta;
        }
        if (contentSize.width < scrollViewSize.width) {
          totalScrollDelta = contentSize.width - scrollViewSize.width;
          moveDelta.x = leftDeta;
        }
        this._updateScrollBarState();
        this._moveContent(moveDelta);
        this._adjustContentOutOfBoundary();
      },
      _clampDelta: function _clampDelta(delta) {
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var scrollViewSize = this._view.getContentSize();
        contentSize.width < scrollViewSize.width && (delta.x = 0);
        contentSize.height < scrollViewSize.height && (delta.y = 0);
        return delta;
      },
      _startAttenuatingAutoScroll: function _startAttenuatingAutoScroll(deltaMove, initialVelocity) {
        var time = this._calculateAutoScrollTimeByInitalSpeed(initialVelocity.mag());
        var targetDelta = deltaMove.normalize();
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var scrollviewSize = this._view.getContentSize();
        var totalMoveWidth = contentSize.width - scrollviewSize.width;
        var totalMoveHeight = contentSize.height - scrollviewSize.height;
        var attenuatedFactorX = this._calculateAttenuatedFactor(totalMoveWidth);
        var attenuatedFactorY = this._calculateAttenuatedFactor(totalMoveHeight);
        targetDelta = cc.v2(targetDelta.x * totalMoveWidth * (1 - this.brake) * attenuatedFactorX, targetDelta.y * totalMoveHeight * attenuatedFactorY * (1 - this.brake));
        var originalMoveLength = deltaMove.mag();
        var factor = targetDelta.mag() / originalMoveLength;
        targetDelta = targetDelta.add(deltaMove);
        if (this.brake > 0 && factor > 7) {
          factor = Math.sqrt(factor);
          targetDelta = deltaMove.mul(factor).add(deltaMove);
        }
        if (this.brake > 0 && factor > 3) {
          factor = 3;
          time *= factor;
        }
        0 === this.brake && factor > 1 && (time *= factor);
        this._startAutoScroll(targetDelta, time, true);
      },
      _getContentLeftBoundary: function _getContentLeftBoundary() {
        var contentPos = this.getContentPosition();
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        return contentPos.x - this.content.getAnchorPoint().x * contentSize.width;
      },
      _getContentRightBoundary: function _getContentRightBoundary() {
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        return this._getContentLeftBoundary() + contentSize.width;
      },
      _getContentTopBoundary: function _getContentTopBoundary() {
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        return this._getContentBottomBoundary() + contentSize.height;
      },
      _getContentBottomBoundary: function _getContentBottomBoundary() {
        var contentPos = this.getContentPosition();
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        return contentPos.y - this.content.getAnchorPoint().y * contentSize.height;
      },
      _updateScrollBarState: function _updateScrollBarState() {
        if (!this.content) return;
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;
        var scrollViewSize = this._view.getContentSize();
        this.verticalScrollBar && (contentSize.height < scrollViewSize.height ? this.verticalScrollBar.hide() : this.verticalScrollBar.show());
        this.horizontalScrollBar && (contentSize.width < scrollViewSize.width ? this.horizontalScrollBar.hide() : this.horizontalScrollBar.show());
      }
    });
    cc._RF.pop();
  }, {} ],
  Md5: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "df9553a0RtFNZ/mf3UeoRp9", "Md5");
    "use strict";
    var hexcase = 0;
    var b64pad = "";
    var chrsz = 8;
    function hex_md5(s) {
      return binl2hex(core_md5(str2binl(s), s.length * chrsz));
    }
    function b64_md5(s) {
      return binl2b64(core_md5(str2binl(s), s.length * chrsz));
    }
    function str_md5(s) {
      return binl2str(core_md5(str2binl(s), s.length * chrsz));
    }
    function hex_hmac_md5(key, data) {
      return binl2hex(core_hmac_md5(key, data));
    }
    function b64_hmac_md5(key, data) {
      return binl2b64(core_hmac_md5(key, data));
    }
    function str_hmac_md5(key, data) {
      return binl2str(core_hmac_md5(key, data));
    }
    function md5_vm_test() {
      return "900150983cd24fb0d6963f7d28e17f72" == hex_md5("abc");
    }
    function core_md5(x, len) {
      x[len >> 5] |= 128 << len % 32;
      x[14 + (len + 64 >>> 9 << 4)] = len;
      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;
      for (var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
      }
      return Array(a, b, c, d);
    }
    function md5_cmn(q, a, b, x, s, t) {
      return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
      return md5_cmn(b & c | ~b & d, a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
      return md5_cmn(b & d | c & ~d, a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
      return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
      return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function core_hmac_md5(key, data) {
      var bkey = str2binl(key);
      bkey.length > 16 && (bkey = core_md5(bkey, key.length * chrsz));
      var ipad = Array(16), opad = Array(16);
      for (var i = 0; i < 16; i++) {
        ipad[i] = 909522486 ^ bkey[i];
        opad[i] = 1549556828 ^ bkey[i];
      }
      var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
      return core_md5(opad.concat(hash), 640);
    }
    function safe_add(x, y) {
      var lsw = (65535 & x) + (65535 & y);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | 65535 & lsw;
    }
    function bit_rol(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }
    function str2binl(str) {
      var bin = Array();
      var mask = (1 << chrsz) - 1;
      for (var i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << i % 32;
      return bin;
    }
    function binl2str(bin) {
      var str = "";
      var mask = (1 << chrsz) - 1;
      for (var i = 0; i < 32 * bin.length; i += chrsz) str += String.fromCharCode(bin[i >> 5] >>> i % 32 & mask);
      return str;
    }
    function binl2hex(binarray) {
      var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
      var str = "";
      for (var i = 0; i < 4 * binarray.length; i++) str += hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 + 4 & 15) + hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 & 15);
      return str;
    }
    function binl2b64(binarray) {
      var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var str = "";
      for (var i = 0; i < 4 * binarray.length; i += 3) {
        var triplet = (binarray[i >> 2] >> i % 4 * 8 & 255) << 16 | (binarray[i + 1 >> 2] >> (i + 1) % 4 * 8 & 255) << 8 | binarray[i + 2 >> 2] >> (i + 2) % 4 * 8 & 255;
        for (var j = 0; j < 4; j++) 8 * i + 6 * j > 32 * binarray.length ? str += b64pad : str += tab.charAt(triplet >> 6 * (3 - j) & 63);
      }
      return str;
    }
    module.exports = {
      md5_hex: hex_md5,
      md5_b64: b64_md5,
      md5_str: str_md5,
      md5_hex_hmac: hex_hmac_md5,
      md5_b64_hmac: b64_hmac_md5,
      md5_str_hmac: str_hmac_md5
    };
    cc._RF.pop();
  }, {} ],
  NetProxy: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "5c22dewAxJE+aRwAPMkEflJ", "NetProxy");
    "use strict";
    var GameNetwork = require("./GameNetwork");
    var GameProtocols = require("./GameProtocols");
    var GAME_SERVER_URL = "ws://127.0.0.1:3005";
    var NetProxy = cc.Class({
      ctor: function ctor() {
        this.network = null;
        this._cachePushCallback = [];
      },
      init: function init() {
        this.network = new GameNetwork();
        this.network.setDelegate(this);
        this.initPushCallback();
      },
      connect: function connect() {
        this.network.connect(GAME_SERVER_URL);
      },
      closeConnect: function closeConnect() {
        this.network.closeConnect();
      },
      isNetworkOpened: function isNetworkOpened() {
        return this.network.isSocketOpened();
      },
      isNetworkClosed: function isNetworkClosed() {
        return this.network.isSocketClosed();
      },
      onNetworkOpen: function onNetworkOpen() {
        Global.eventMgr.emit(Global.config.EVENT_NETWORK_OPENED);
      },
      onNetworkClose: function onNetworkClose() {
        Global.eventMgr.emit(Global.config.EVENT_NETWORK_CLOSED);
      },
      initPushCallback: function initPushCallback() {
        var self = this;
        var pushCallback = function pushCallback(resp) {
          self.pushCallback(resp);
        };
        this.network.registerPushResponseCallback("chat", pushCallback);
        this.network.registerPushResponseCallback("exitRoom", pushCallback);
        this.network.registerPushResponseCallback("playChess", pushCallback);
      },
      registerPush: function registerPush(key, cb, target) {
        var self = this;
        cb && target && (cb = cb.bind(target));
        var pushCallback = function pushCallback(resp) {
          cb && cb(resp);
          Global.eventMgr.emit(resp.act, resp);
        };
        this.network.registerPushResponseCallback(key, pushCallback);
      },
      dealCachePush: function dealCachePush() {},
      beatHeart: function beatHeart(callback) {
        var req = new GameProtocols.HeartRequest();
        req.t = Date.now();
        this.network.sendRequest(req, callback);
      },
      chat: function chat(msg) {
        var req = new GameProtocols.ChatRequest();
        var uid = "";
        req.uid = uid;
        req.msg = msg;
        this.network.sendRequest(req);
      },
      randomMatch: function randomMatch() {
        var req = new GameProtocols.RandomMatchRequest();
        var uid = "";
        req.uid = uid;
        this.network.sendRequest(req);
      },
      playChess: function playChess(msg) {
        var req = new GameProtocols.PlayChessRequest();
        var uid = "";
        req.uid = uid;
        req.lastBedIndex = msg.lastBedIndex;
        req.cid = msg.cid;
        req.dest = msg.dest;
        this.network.sendRequest(req);
      },
      selectChess: function selectChess(msg) {
        var req = new GameProtocols.SelectChessRequest();
        req.cid = msg.cid;
        this.network.sendRequest(req);
      },
      createRoom: function createRoom(cb) {
        var req = new GameProtocols.CreateRoomRequest();
        this.network.sendRequest(req, cb);
      },
      joinRoom: function joinRoom(rid) {
        var req = new GameProtocols.JoinRoomRequest();
        req.rid = rid;
        this.network.sendRequest(req);
      },
      login: function login(origin, token) {
        var req = new GameProtocols.LoginRequest();
        token && (req.token = token);
        req.origin = origin;
        req.os = cc.sys.os;
        req.osVersion = cc.sys.osVersion;
        var uid = "";
        req.uid = uid;
        var callback = function callback(resp) {
          if (0 != resp.err) {
            Global.eventMgr.emit(Global.config.EVENT_LOGIN_FAILED, resp);
            return;
          }
          Global.eventMgr.emit(Global.config.EVENT_LOGIN_SUC, resp);
        };
        this.network.sendRequest(req, callback);
      },
      logout: function logout() {},
      bindFacebook: function bindFacebook(token) {},
      getRank: function getRank(rankType) {},
      pushCallback: function pushCallback(response) {
        switch (response.act) {
         case "friendInfoSync":
          this.pushFriendSendTakeSp(response);
          break;

         case "playChess":
          this.pushPlayChess(response);
          break;

         case "chat":
          this.pushChat(response);
          break;

         case "exitRoom":
          this.pushExitRoom(response);
        }
      },
      pushFriendSendTakeSp: function pushFriendSendTakeSp(resp) {},
      pushChat: function pushChat(resp) {
        Global.eventMgr.emit(Global.config.EVENT_CHAT, resp);
      },
      pushExitRoom: function pushExitRoom(resp) {
        Global.eventMgr.emit(Global.config.EVENT_EXITROOM, resp);
      },
      pushPlayChess: function pushPlayChess(resp) {
        Global.eventMgr.emit(Global.config.EVENT_PLAYCHESS, resp);
      },
      debug_addCoins: function debug_addCoins(name) {
        var req = new GameProtocols.DebugChangeMeRequest();
        req.cmd = "btnAddCoins" === name ? "player coins add 100000000" : "btnClearCoins" === name ? "player coins 0" : "btnAddEnergy" === name ? "player sp add 10" : "btnClearEnergy" === name ? "player sp 0" : "btnAddWp" == name ? "player wp add 10" : "btnClearWp" == name ? "player wp 0" : "btnUnwrap" == name ? "player fbuid null" : "btnWizard1" == name ? "player wizard1 0" : "btnWizard2" == name ? "player wizard2 0" : "btnClearShield" == name ? "player shield 0" : "btnSpEc" == name ? "SpEc stepInterval 60000" : "btnFarmEc" == name ? "FarmEc stepInterval 60000" : "btnSpEcBack" == name ? "SpEc stepInterval 3600000" : "btnFarmBack" == name ? "FarmEc stepInterval 86400000" : "btnUpdateBuild" == name ? "Building lv 5" : name;
      }
    });
    module.exports = NetProxy;
    cc._RF.pop();
  }, {
    "./GameNetwork": "GameNetwork",
    "./GameProtocols": "GameProtocols"
  } ],
  NodePoolMng: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "670dbVclHRF+YTksSd2vsqs", "NodePoolMng");
    "use strict";
    var SHOWLOG = false;
    var myLog = function myLog(arg) {
      SHOWLOG && cc.log.apply(cc.log, arguments);
    };
    var NodePoolMng = cc.Class({
      extends: cc.Component,
      properties: {
        bulletPFList: [ cc.Prefab ],
        enemyPFList: [ cc.Prefab ],
        normalEffectPF: cc.Prefab,
        bloodDecreasePF: cc.Prefab,
        warningEnemy2PF: cc.Prefab,
        bulletCounts: 30,
        enemyCounts: 40,
        normalEffectCounts: 30,
        warningEnemy2Counts: 10
      },
      onLoad: function onLoad() {
        zy.nodePoolMng = this;
        this.bulletPoolDic = {};
        this.bulletPFDic = {};
        this.enemyPoolDic = {};
        this.enemyPFDic = {};
        this.normalEffPool = null;
        this.bloodDecPool = null;
        this.warningEnemy2Pool = null;
        this.init();
      },
      init: function init() {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = void 0;
        try {
          for (var _iterator = this.bulletPFList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var p = _step.value;
            var pool = new cc.NodePool();
            this.bulletPoolDic[p._name] = pool;
            this.bulletPFDic[p._name] = p;
            for (var _i3 = 0; _i3 < this.bulletCounts; _i3++) {
              var _b = cc.instantiate(p);
              pool.put(_b);
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            !_iteratorNormalCompletion && _iterator.return && _iterator.return();
          } finally {
            if (_didIteratorError) throw _iteratorError;
          }
        }
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = void 0;
        try {
          for (var _iterator2 = this.enemyPFList[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _p = _step2.value;
            var pool = new cc.NodePool();
            this.enemyPoolDic[_p._name] = pool;
            this.enemyPFDic[_p._name] = _p;
            var num = this.enemyCounts;
            "enemy7" == _p._name && (num = 1);
            for (var _i4 = 0; _i4 < num; _i4++) {
              var _e = cc.instantiate(_p);
              pool.put(_e);
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            !_iteratorNormalCompletion2 && _iterator2.return && _iterator2.return();
          } finally {
            if (_didIteratorError2) throw _iteratorError2;
          }
        }
        this.normalEffPool = new cc.NodePool("NormalEffect");
        for (var i = 0; i < this.normalEffectCounts; i++) {
          var e = cc.instantiate(this.normalEffectPF);
          this.normalEffPool.put(e);
        }
        this.bloodDecPool = new cc.NodePool();
        for (var _i = 0; _i < this.normalEffectCounts; _i++) {
          var b = cc.instantiate(this.bloodDecreasePF);
          this.bloodDecPool.put(b);
        }
        this.warningEnemy2Pool = new cc.NodePool();
        for (var _i2 = 0; _i2 < this.warningEnemy2Counts; _i2++) {
          var w = cc.instantiate(this.warningEnemy2PF);
          this.warningEnemy2Pool.put(w);
        }
      },
      getBullet: function getBullet(name) {
        cc.assert(this.bulletPoolDic[name], "\u9519\u8bef\u7684Bullet name: " + name + "\uff0c\u627e\u4e0d\u5230\u5bf9\u5e94\u7684pool");
        var size = this.bulletPoolDic[name].size();
        if (size <= 0) {
          var b = cc.instantiate(this.bulletPFDic[name]);
          return b;
        }
        myLog(name + " pool size =" + size);
        return this.bulletPoolDic[name].get();
      },
      putBullet: function putBullet(node) {
        var name = node.name;
        cc.assert(this.bulletPoolDic[name], "\u9519\u8bef\u7684Bullet, name: " + name + "\uff0c\u627e\u4e0d\u5230\u5bf9\u5e94\u7684pool");
        this.bulletPoolDic[name].put(node);
        var size = this.bulletPoolDic[name].size();
        myLog(name + " pool size =" + size);
      },
      getEnmey: function getEnmey(name) {
        cc.assert(this.enemyPoolDic[name], "\u9519\u8bef\u7684Enemy name: " + name + "\uff0c\u627e\u4e0d\u5230\u5bf9\u5e94\u7684pool");
        var size = this.enemyPoolDic[name].size();
        if (size <= 0) {
          var e = cc.instantiate(this.enemyPFDic[name]);
          return e;
        }
        myLog(name + " pool size =" + size);
        return this.enemyPoolDic[name].get();
      },
      putEnemy: function putEnemy(node) {
        var name = node.name;
        cc.assert(this.enemyPoolDic[name], "\u9519\u8bef\u7684Enemy, name: " + name + "\uff0c\u627e\u4e0d\u5230\u5bf9\u5e94\u7684pool");
        this.enemyPoolDic[name].put(node);
        var size = this.enemyPoolDic[name].size();
        myLog(name + " pool size =" + size);
      },
      getNormalEffect: function getNormalEffect() {
        var size = this.normalEffPool.size();
        if (size <= 0) {
          var e = cc.instantiate(this.normalEffectPF);
          return e;
        }
        return this.normalEffPool.get();
      },
      putNormalEffect: function putNormalEffect(node) {
        this.normalEffPool.put(node);
      },
      getBloodDecNode: function getBloodDecNode() {
        var size = this.bloodDecPool.size();
        if (size <= 0) {
          var b = cc.instantiate(this.bloodDecreasePF);
          return b;
        }
        myLog("bloodDecPool size =" + size);
        return this.bloodDecPool.get();
      },
      putBloodDecNode: function putBloodDecNode(node) {
        this.bloodDecPool.put(node);
        myLog("bloodDecPool size =" + this.bloodDecPool.size());
      },
      getWarningEnemy2DecNode: function getWarningEnemy2DecNode() {
        var size = this.warningEnemy2Pool.size();
        if (size <= 0) {
          var b = cc.instantiate(this.warningEnemy2PF);
          return b;
        }
        return this.warningEnemy2Pool.get();
      },
      putWarningEnemy2DecNode: function putWarningEnemy2DecNode(node) {
        this.warningEnemy2Pool.put(node);
      }
    });
    cc._RF.pop();
  }, {} ],
  Node: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "cc309AO5opH8r5fSzJ5OlUL", "Node");
    "use strict";
    var Node = cc.Class({
      extends: cc.Node,
      statics: {
        createNode: function createNode(params) {
          var node = new zy.Node();
          zy.Node.updateNode(node, params);
          return node;
        },
        updateNode: function updateNode(node, params) {
          params.name && (node.name = params.name);
          params.anchor && node.setAnchorPoint(params.anchor);
          "number" == typeof params.x && (node.x = params.x);
          "number" == typeof params.y && (node.y = params.y);
          params.position && (node.position = params.position);
          "number" == typeof params.width && (node.width = params.width);
          "number" == typeof params.height && (node.height = params.height);
          if (params.size) {
            node.width = params.size.x;
            node.height = params.size.y;
          }
          "number" == typeof params.opacity && (node.opacity = params.opacity);
          params.color && (node.color = params.color);
          "number" == typeof params.zIndex && (node.zIndex = params.zIndex);
          "number" == typeof params.rotation && (node.rotation = params.rotation);
          "number" == typeof params.scale && (node.scale = params.scale);
          "number" == typeof params.scaleX && (node.scaleX = params.scaleX);
          "number" == typeof params.scaleY && (node.scaleY = params.scaleY);
          params.hasOwnProperty("flipX") && (params.flipX ? node.scaleX = -1 * Math.abs(node.getScaleX()) : node.scaleX = 1 * Math.abs(node.getScaleX()));
          params.hasOwnProperty("flipY") && (params.flipY ? node.scaleY = -1 * Math.abs(node.getScaleY()) : node.scaleY = 1 * Math.abs(node.getScaleY()));
          params.hasOwnProperty("active") && (node.active = params.active);
          params.parent && (node.parent = params.parent);
        }
      },
      properties: {}
    });
    zy.Node = module.exports = Node;
    cc._RF.pop();
  }, {} ],
  OpenAdsHelper: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a863aVTl61ElbDQnfX6cWdV", "OpenAdsHelper");
    "use strict";
    var PACKAGENAMEFB = "com/zygame/utils/OpenAdsHelper";
    var CLASSNAME = "BuAdHelper";
    var OpenAdsHelper = cc.Class({
      statics: {
        showInterstitialAds: function showInterstitialAds(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "showInteractionAds", "(Ljava/lang/String;)V", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "showInteractionAds:", placeId);
          }
        },
        isIntersitialReady: function isIntersitialReady(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "isInteractionReady", "(Ljava/lang/String;)Z", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "isInteractionReady:", placeId);
          }
        },
        loadIntersitialAds: function loadIntersitialAds(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "loadExpressAd", "(Ljava/lang/String;)V", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "loadExpressAd:", placeId);
          }
        },
        isRdAdsReady: function isRdAdsReady(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "isRewardAdsReady", "(Ljava/lang/String;)Z", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "isRewardAdsReady:", placeId);
          }
          return false;
        },
        loadRdAds: function loadRdAds(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "loadRewardAds", "(Ljava/lang/String;)V", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "loadRewardAds:", placeId);
          }
        },
        showRdAds: function showRdAds(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) {
            placeId = zy.constData.OpenAdsKey[placeId];
            return jsb.reflection.callStaticMethod(PACKAGENAMEFB, "showRewardAds", "(Ljava/lang/String;)V", placeId);
          }
          if (cc.sys.os == cc.sys.OS_IOS) {
            placeId = zy.constData.OpenAdsKeyIOS[placeId];
            return jsb.reflection.callStaticMethod(CLASSNAME, "showRewardAds:", placeId);
          }
        }
      }
    });
    zy.OpenAdsHelper = OpenAdsHelper;
    cc._RF.pop();
  }, {} ],
  PlatformUtils: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "b6bf91lbppKyJvy6Qf7TX6P", "PlatformUtils");
    "use strict";
    var PACKAGENAME = "com/zygame/utils/PlatformUtils";
    function vibratorShort() {
      if (!zy.dataMng.userData.vibOn) return;
      cc.sys.os == cc.sys.OS_ANDROID ? getVibrator(25) : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("PlatformUtils", "vibratorShort");
    }
    function vibratorLong() {
      if (!zy.dataMng.userData.vibOn) return;
      cc.sys.os == cc.sys.OS_ANDROID ? getVibrator(100) : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("PlatformUtils", "vibratorLong");
    }
    function getVibrator(t) {
      cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAME, "vibrator", "(I)V", t) : cc.sys.os == cc.sys.OS_IOS;
    }
    function getMobilePhoneID() {
      return cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAME, "getDeviceID", "()Ljava/lang/String;") : cc.sys.os == cc.sys.OS_IOS ? jsb.reflection.callStaticMethod("PlatformUtils", "getIdfa") : "";
    }
    function getMobileMac() {
      return getMobilePhoneID();
    }
    function getMobileIdfa() {
      return getMobilePhoneID();
    }
    function getAppVersion() {
      return cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAME, "getPackageVersion", "()Ljava/lang/String;") : cc.sys.os == cc.sys.OS_IOS ? jsb.reflection.callStaticMethod("PlatformUtils", "getAppVersion") : "1.0.0w";
    }
    function rmSplash() {
      cc.sys.os == cc.sys.OS_ANDROID ? jsb.reflection.callStaticMethod(PACKAGENAME, "rmSplashView", "()V") : cc.sys.os == cc.sys.OS_IOS && jsb.reflection.callStaticMethod("RootViewController", "removeSplashView");
    }
    module.exports = {
      getVibrator: getVibrator,
      getMobilePhoneID: getMobilePhoneID,
      getAppVersion: getAppVersion,
      vibratorShort: vibratorShort,
      vibratorLong: vibratorLong,
      rmSplash: rmSplash,
      getMobileIdfa: getMobileIdfa,
      getMobileMac: getMobileMac
    };
    cc._RF.pop();
  }, {} ],
  PopBase: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "0214dGdWP5Aqaga6UmWOdvS", "PopBase");
    "use strict";
    var PopBase = cc.Class({
      extends: cc.Component,
      properties: {
        maskOpacity: 255,
        touchClose: true
      },
      initBase: function initBase(params, popName) {
        false;
        this.popName = popName;
        this.componentName = null;
        this.component = null;
        var popNameSpArr = this.popName.split("/");
        if (popNameSpArr.length > 0) {
          this.componentName = popNameSpArr[popNameSpArr.length - 1];
          this.component = this.node.getComponent(this.componentName);
        }
        this.onLaunchedCallback = params.onLaunchedCallback;
        this.onClosedCallback = params.onClosedCallback;
        zy.Button.createNode({
          name: "maskBtn",
          zIndex: zy.constData.ZIndex.POP_MASK,
          parent: this.node,
          url: "textures/common/mask",
          touchAction: false,
          commonClickAudio: false,
          opacity: this.maskOpacity,
          width: 5 * zy.constData.DesignSize.width,
          height: 5 * zy.constData.DesignSize.height,
          eventHandler: {
            target: this.node,
            component: this.componentName,
            customEventData: this.componentName,
            handler: this.touchClose ? "closeCallback" : null
          }
        });
        this.onLaunchedCallback && this.onLaunchedCallback();
        this.component.popName = this.popName;
        this.component.init && this.component.init(params);
      },
      cleanBase: function cleanBase() {
        this.component && this.component.clean && this.component.clean();
        cc.isValid(this.node) && this.node.destroy();
        this.onClosedCallback && this.onClosedCallback();
      }
    });
    zy.PopBase = module.exports = PopBase;
    cc._RF.pop();
  }, {} ],
  ProgressBar: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7781cgsMwdAWZJB8Vw/YTXI", "ProgressBar");
    "use strict";
    cc.Class({
      extends: cc.ProgressBar,
      setProgressBarToPercent: function setProgressBarToPercent(t, p, cb) {
        if (t <= 0) {
          this.progress = p;
          cb && cb();
          return;
        }
        this.unscheduleAllCallbacks();
        this.speed = (p - this.progress) / t;
        this.desProgress = p;
        this.progressCb = cb;
        this.schedule(this.updateProgressBar.bind(this), 0);
      },
      updateProgressBar: function updateProgressBar(dt) {
        if (this.speed > 0 && this.progress < this.desProgress || this.speed < 0 && this.progress > this.desProgress) this.progress += this.speed * dt; else {
          this.progress = this.desProgress;
          this.unscheduleAllCallbacks();
          this.progressCb && this.progressCb();
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  ProgressCircle: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "84313JeWl9JKJA3YMCZTbFD", "ProgressCircle");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        bar: cc.Sprite,
        progress: {
          default: 0,
          min: 0,
          max: 1,
          notify: function notify() {
            this._updateProgress();
          }
        }
      },
      _updateProgress: function _updateProgress() {
        if (!this.bar || this.bar.type != cc.Sprite.Type.FILLED) {
          cc.log("\u5706\u5f62\u8fdb\u5ea6\u6761\u7684bar\u5fc5\u987b\u8bbe\u4e3afilled\u6a21\u5f0f\u3002");
          return;
        }
        this.bar.fillRange = this.progress;
      },
      setProgressBarToPercent: function setProgressBarToPercent(t, p, cb) {
        if (t <= 0) {
          this.progress = p;
          cb && cb();
          return;
        }
        this.unscheduleAllCallbacks();
        this.speed = (p - this.progress) / t;
        this.desProgress = p;
        this.progressCb = cb;
        this.schedule(this.updateProgressBar.bind(this), 0);
      },
      updateProgressBar: function updateProgressBar(dt) {
        if (this.speed > 0 && this.progress < this.desProgress || this.speed < 0 && this.progress > this.desProgress) this.progress += this.speed * dt; else {
          this.progress = this.desProgress;
          this.unscheduleAllCallbacks();
          this.progressCb && this.progressCb();
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  RangerLogger: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "972dd3so6xBQbKfwz5fE+GK", "RangerLogger");
    "use strict";
    var PACKAGENAME = "com/zygame/utils/RangerAppLogHelper";
    cc.Class({
      statics: {
        logEventWatchAds: function logEventWatchAds(placeId) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAME, "logEvent", "(Ljava/lang/String;)V", placeId);
          cc.sys.os == cc.sys.OS_IOS;
        },
        logEventLogin: function logEventLogin(uid) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAME, "logLogin", "(Ljava/lang/String;)V", uid);
          cc.sys.os == cc.sys.OS_IOS;
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  SettingPop: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "aa366UT5FBP96nc5xY90RAT", "SettingPop");
    "use strict";
    var PlatformUtils = require("./../framework/platform/PlatformUtils");
    cc.Class({
      extends: cc.Component,
      properties: {
        vibNode: cc.Node,
        soundsNode: cc.Node,
        soudsVolume: cc.Node,
        versionLabel: cc.Label
      },
      init: function init(params) {
        this.soundsNode.getComponent("SwitchControl").setIsOn(zy.audio.getBGMEnabled(), false);
        this.soudsVolume.getComponent(cc.Slider).progress = zy.audio.getBGMVomue();
        this.versionLabel.string = "v" + PlatformUtils.getAppVersion() + "  c" + CHANNEL_ID;
      },
      onVibCall: function onVibCall() {
        zy.audioMng.playButtonAudio();
        zy.dataMng.userData.vibOn = !zy.dataMng.userData.vibOn;
      },
      onSoundsCall: function onSoundsCall(sc) {
        zy.audio.playEffect(zy.audio.Effect.CommonClick);
        zy.audio.setBGMEnabled(sc.isOn);
        zy.audio.setEffectsEnabled(sc.isOn);
      },
      sliderCallback: function sliderCallback(slider) {
        zy.audio.setBGMVolume(slider.progress);
        zy.audio.setEffectsVolume(slider.progress);
      },
      closeCallback: function closeCallback() {
        zy.director.closePop(this.popName);
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/platform/PlatformUtils": "PlatformUtils"
  } ],
  ShaderUtils: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "4a0d1DD3flJtKMaQ07c8zdn", "ShaderUtils");
    "use strict";
    var Effect = {
      Gray: "Gray",
      Normal: "Normal",
      Bright: "Bright"
    };
    cc.Class({
      extends: cc.Component,
      statics: {
        Effect: Effect,
        Shader: {
          Normal: {
            vert_web: "Default_noMVP_vert",
            vert_native: "Default_noMVP_vert",
            frag: "Normal_frag"
          },
          Gray: {
            vert_web: "Default_noMVP_vert",
            vert_native: "Default_noMVP_vert",
            frag: "Gray_frag"
          },
          Bright: {
            vert_web: "Default_noMVP_vert",
            vert_native: "Default_noMVP_vert",
            frag: "Bright_frag"
          }
        },
        init: function init() {
          this.shaderPrograms = {};
        },
        setShader: function setShader(renderComp, shaderName) {
          if (cc.game.renderType === cc.game.RENDER_TYPE_CANVAS) return;
          var materialName = "";
          shaderName == Effect.Normal ? materialName = "2d-sprite" : shaderName == Effect.Gray ? materialName = "2d-gray-sprite" : shaderName == Effect.Bright && (materialName = "2d-bright-sprite");
          var material = cc.Material.getBuiltinMaterial(materialName);
          if (material) {
            material = cc.Material.getInstantiatedMaterial(material, renderComp);
            renderComp.setMaterial(0, material);
          } else cc.log("ShaderUtils: matrial: " + shaderName + " is not exsit");
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  Sprite: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6143cwQ3s5Gq5QJ4PeOZFhZ", "Sprite");
    "use strict";
    var Sprite = cc.Class({
      extends: cc.Sprite,
      statics: {
        createNode: function createNode(params) {
          var node = new cc.Node();
          node.addComponent(zy.Sprite);
          zy.Sprite.updateNode(node, params);
          return node;
        },
        updateNode: function updateNode(node, params) {
          var sprite = node.getComponent(cc.Sprite);
          var url = params.url;
          var spriteFrame = params.spriteFrame;
          var loadCallback = params.loadCallback;
          var updateFunc = function updateFunc(_spriteFrame) {
            _spriteFrame && (sprite.spriteFrame = _spriteFrame);
            params.hasOwnProperty("state") && sprite.setState(params.state);
            params.srcBlendFactor && (sprite.srcBlendFactor = params.srcBlendFactor);
            params.dstBlendFactor && (sprite.dstBlendFactor = params.dstBlendFactor);
            params.hasOwnProperty("parent") && !cc.isValid(params.parent) || zy.Node.updateNode(node, params);
          };
          if (url) {
            sprite.url = url;
            cc.loader.loadRes(url, cc.SpriteFrame, null, function(err, spriteFrame) {
              if (err) cc.error("load: " + url + " error."); else if (cc.isValid(node) && sprite.url == url) {
                sprite.spriteFrame = spriteFrame;
                updateFunc();
              }
              loadCallback && loadCallback(err, node);
            });
          } else spriteFrame ? updateFunc(spriteFrame) : updateFunc();
        }
      }
    });
    zy.Sprite = module.exports = Sprite;
    cc._RF.pop();
  }, {} ],
  SwitchControl: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "5c214EcPrdAlL5yW61AqZqh", "SwitchControl");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        _isOn: true,
        isOn: {
          set: function set(v) {
            this.setIsOn(v, true);
          },
          get: function get() {
            return this._isOn;
          }
        },
        interactable: true,
        bgOnSp: cc.Sprite,
        bgOffSp: cc.Sprite,
        barSp: cc.Sprite,
        switchEvents: {
          default: [],
          type: cc.Component.EventHandler
        }
      },
      setIsOn: function setIsOn(isOn) {
        var ani = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
        this._isOn = isOn;
        this._updateState(ani);
      },
      _updateState: function _updateState(ani) {
        var posX = this.isOn ? this.bgOffSp.node.x : this.bgOnSp.node.x;
        if (false, ani) {
          this.barSp.node.stopAllActions();
          this.barSp.node.runAction(cc.moveTo(.1, cc.v2(posX, this.barSp.node.y)));
        } else this.barSp.node.x = posX;
      },
      onLoad: function onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
      },
      onClick: function onClick(event) {
        if (!this.interactable) return;
        this.isOn = !this.isOn;
        this.switchEvents && cc.Component.EventHandler.emitEvents(this.switchEvents, this);
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {} ],
  TestScene: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "38e56QiJiVISLcEczrs95RS", "TestScene");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        debugBtn: cc.Node
      },
      init: function init() {},
      start: function start() {
        this.debugBtn.active = DEBUG_OPEN;
        zy.audio.playBGM(zy.audio.BGM.MAIN);
      },
      debugCall: function debugCall() {
        zy.director.createPop("prefabs/pop/DebugPop");
      },
      settingCall: function settingCall() {
        zy.director.createPop("prefabs/pop/SettingPop");
      }
    });
    cc._RF.pop();
  }, {} ],
  Tip: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6fc55rUrPFDxLyLc2cpq/Zh", "Tip");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        tipLabel: cc.Label,
        tipBg: cc.Node
      },
      statics: {
        tipNode: null,
        show: function show(text) {
          cc.loader.loadRes("prefabs/common/Tip", cc.Prefab, function(err, prefab) {
            if (!err) {
              cc.isValid(this.tipNode) && this.tipNode.destroy();
              this.tipNode = cc.instantiate(prefab);
              this.tipNode.zIndex = zy.constData.ZIndex.TIP;
              this.tipNode.parent = zy.director.getUiRoot();
              this.tipNode.getComponent("Tip").init(text);
            }
          }.bind(this));
        }
      },
      onLoad: function onLoad() {
        this.originalWidth = this.tipBg.width;
        this.originalHeight = this.tipBg.height;
        this.tipBg.opacity = 0;
        this.tipLabel.string = "";
      },
      init: function init(text) {
        this.text = text;
        this.node.y = 0;
        this.tipLabel.string = this.text;
        this.tipLabel.node.height > this.originalHeight && (this.tipBg.height = this.tipLabel.node.height + 50);
        var seq = cc.sequence(cc.spawn(cc.moveBy(.25, cc.v2(0, 100)), cc.fadeIn(.25)), cc.delayTime(1.25), cc.spawn(cc.moveBy(.25, cc.v2(0, 100)), cc.fadeOut(.25)), cc.callFunc(function() {
          this.node.destroy();
        }.bind(this)));
        this.tipBg.runAction(seq);
      }
    });
    cc._RF.pop();
  }, {} ],
  TrackingLogger: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6f7dejhclFBULHAZ3Q42UcD", "TrackingLogger");
    "use strict";
    var PACKAGENAME = "com/zygame/utils/TrackingHelper";
    var CLASSNAME = "AppController";
    cc.Class({
      statics: {
        logEventWatchAds: function logEventWatchAds(placeId) {
          var eventName = "event_" + placeId[placeId.length - 1];
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAME, "logEvent", "(Ljava/lang/String;)V", eventName);
          if (cc.sys.os == cc.sys.OS_IOS) return jsb.reflection.callStaticMethod(CLASSNAME, "logEvent:", eventName);
        },
        logEventLogin: function logEventLogin(uid) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAME, "logLogin", "(Ljava/lang/String;)V", uid);
          if (cc.sys.os == cc.sys.OS_IOS) return jsb.reflection.callStaticMethod(CLASSNAME, "logLogin:", uid);
        },
        logEventRegister: function logEventRegister(uid) {
          if (cc.sys.os == cc.sys.OS_ANDROID) return jsb.reflection.callStaticMethod(PACKAGENAME, "logRegister", "(Ljava/lang/String;)V", uid);
          if (cc.sys.os == cc.sys.OS_IOS) return jsb.reflection.callStaticMethod(CLASSNAME, "logRegister:", uid);
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  Turning: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "4a8ecMKHTROFaHFa4n4S+VV", "Turning");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        turn: cc.Sprite
      },
      prepare: function prepare() {
        this.turnStatus = 0;
        this.curSpeed = 0;
        this.spinTime = 0;
        this.gearNum = 8;
        this.gearAngle = 360 / this.gearNum;
        this.defaultAngle = 180;
        this.finalAngle = 0;
        this.decAngle = 360;
        this.springback = false;
        this.targetId = 6;
        this.maxSpeed = 10;
        this.duration = 2;
        this.acc = .1;
      },
      init: function init() {
        this.prepare();
      },
      loadRewardItem: function loadRewardItem() {},
      startTurn: function startTurn(retId) {
        if (0 != this.turnStatus) return;
        this.caculateFinalAngle(retId);
        this.turnStatus = 1;
        this.curSpeed = 0;
        this.spinTime = 0;
      },
      forceStopTurn: function forceStopTurn() {
        this.turnStatus = 0;
        this.turn.node.rotation = this.finalAngle;
      },
      caculateFinalAngle: function caculateFinalAngle(targetId) {
        if (targetId <= 0) {
          cc.log("targetId must be big than 0");
          targetId = 1;
        }
        this.targetId = targetId;
        cc.log("====targetId:" + this.targetId);
        this.finalAngle = 360 - (this.targetId - 1) * this.gearAngle + this.defaultAngle;
        this.springback && (this.finalAngle += this.gearAngle);
      },
      showRes: function showRes() {
        this.forceStopTurn();
        cc.log("show res: " + this.targetId);
      },
      update: function update(dt) {
        if (0 == this.turnStatus) return;
        if (1 == this.turnStatus) {
          this.spinTime += dt;
          this.turn.node.rotation += this.curSpeed;
          if (this.curSpeed < this.maxSpeed) this.curSpeed += this.acc; else {
            if (this.spinTime < this.duration) return;
            this.turn.node.rotation = this.finalAngle;
            this.turnStatus = 2;
          }
        } else if (2 == this.turnStatus) {
          var curRo = this.turn.node.rotation;
          var hadRo = curRo - this.finalAngle;
          this.curSpeed = this.maxSpeed * ((this.decAngle - hadRo) / this.decAngle) + .2;
          this.turn.node.rotation = curRo + this.curSpeed;
          if (this.decAngle - hadRo <= 0) {
            this.turnStatus = 0;
            this.turn.node.rotation = this.finalAngle;
            if (this.springback) {
              var act = cc.rotateBy(.5, -this.gearAngle);
              var seq = cc.sequence(cc.delayTime(.2), act, cc.callFunc(this.showRes, this));
              this.turn.node.runAction(seq);
            } else this.showRes();
          }
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  UI: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "3d0d8pVBVlMerkrdm4ogFdE", "UI");
    "use strict";
    cc.Class({
      extends: cc.Component,
      statics: {
        init: function init() {
          this.alert = require("Alert");
          this.loading = require("Loading");
          this.tip = require("Tip");
        },
        seekChildByName: function seekChildByName(node, name) {
          if (node.name == name) return node;
          for (var i in node.children) {
            var child = node.children[i];
            if (child) {
              var res = zy.ui.seekChildByName(child, name);
              if (res) return res;
            }
          }
        },
        bgScaleAction: function bgScaleAction(node) {
          var params = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
          node.scale = .5;
          var seq = cc.sequence(cc.scaleTo(.2, 1).easing(cc.easeSineOut()), cc.callFunc(function() {
            params.callback && params.callback();
          }));
          node.runAction(seq);
        },
        numScaleAction: function numScaleAction(node, params) {
          node.stopAllActions();
          var seq = cc.sequence(cc.scaleTo(.1, 1.2).easing(cc.easeSineOut()), cc.scaleTo(.1, .8).easing(cc.easeSineInOut()), cc.scaleTo(.1, 1.1).easing(cc.easeSineInOut()), cc.scaleTo(.1, .95).easing(cc.easeSineInOut()), cc.scaleTo(.1, 1).easing(cc.easeSineInOut()));
          node.runAction(seq);
        },
        btnScaleActoin: function btnScaleActoin(btnList) {
          for (var i in btnList) {
            var btn = btnList[i];
            var btnScale = btn.scale;
            btn.stopAllActions();
            btn.scale = btnScale / 4;
            btn.runAction(cc.sequence(cc.scaleTo(.12, btnScale + .1), cc.scaleTo(.08, btnScale - .1), cc.scaleTo(.08, btnScale)));
          }
        },
        shakeScreen: function shakeScreen(params) {
          var node = params.node;
          var times = params.times ? params.times : 1;
          var offsetX = params.hasOwnProperty("offsetX") ? params.offsetX : 20;
          var offsetY = params.hasOwnProperty("offsetY") ? params.offsetY : 20;
          var ratio = params.ratio ? params.ratio : 1;
          var rate = params.rate ? params.rate : 1 / 15;
          var basePosition = node.basePosition ? node.basePosition : node.position;
          node.stopAllActions();
          node.setPosition(basePosition);
          node.basePosition = basePosition;
          var actArray = [];
          var moveAction = cc.moveBy(rate, cc.v2(offsetX, offsetY)).easing(cc.easeOut(1));
          actArray.push(moveAction);
          for (var i = 0; i < times - 1; i++) {
            var moveAction_1 = cc.moveBy(rate, cc.v2(2 * -offsetX, 2 * -offsetY)).easing(cc.easeOut(1));
            actArray.push(moveAction_1);
            var moveAction_2 = cc.moveBy(rate, cc.v2(3 * offsetX / 2, 3 * offsetY / 2)).easing(cc.easeOut(1));
            actArray.push(moveAction_2);
            offsetX /= ratio;
            offsetY /= ratio;
          }
          var backAction = cc.moveTo(rate, basePosition).easing(cc.easeOut(1));
          actArray.push(backAction);
          node.runAction(cc.sequence(actArray));
        },
        flyNode: function flyNode(node, parent, startPos, endPos, num, cb) {
          if (num <= 0) return;
          startPos = parent.convertToNodeSpaceAR(startPos);
          endPos = parent.convertToNodeSpaceAR(endPos);
          var count = 0;
          var _loop = function _loop(i) {
            var flyNode = cc.instantiate(node);
            flyNode.position = startPos;
            flyNode.parent = parent;
            var midPos = startPos.add(endPos).div(2);
            var midPosVec = midPos.sub(startPos);
            var rotate = 5 * Math.round(10 * Math.random()) * (Math.random() > .5 ? 1 : -1);
            var desPosVec = midPosVec.rotate(rotate * Math.PI / 180);
            var desPos = startPos.add(desPosVec);
            var distance = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
            var bezierList = [ desPos, desPos, endPos ];
            var bezier = cc.bezierTo(distance / 3e3 + .5 * Math.random(), bezierList);
            var seq = cc.sequence(bezier, cc.callFunc(function() {
              count++;
              cb && cb(count >= num);
              flyNode.destroy();
            }));
            flyNode.runAction(seq);
          };
          for (var i = 0; i < num; i++) _loop(i);
        }
      }
    });
    cc._RF.pop();
  }, {
    Alert: "Alert",
    Loading: "Loading",
    Tip: "Tip"
  } ],
  UPLTVAndroid: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a8defv/RNBAp70l9SJpqyMU", "UPLTVAndroid");
    "use strict";
    var classJavaName = "com/up/ads/cocosjs/JsProxy";
    var showLog = false;
    var upltva = upltva || {
      setShowLog: function setShowLog(print) {
        void 0 != print && null != print && (showLog = print);
      },
      printJsLog: function printJsLog(msg) {
        showLog && void 0 != msg && null != msg && jsb.reflection.callStaticMethod("android/util/Log", "i", "(Ljava/lang/String;Ljava/lang/String;)I", "cocos2dx-js", msg);
      },
      initAndroidSDK: function initAndroidSDK(androidAppKey, vokecall, callname) {
        jsb.reflection.callStaticMethod(classJavaName, "initSDK", "(Ljava/lang/String;Ljava/lang/String;)V", androidAppKey, callname);
        jsb.reflection.callStaticMethod(classJavaName, "setInvokeDelegate", "(Ljava/lang/String;)V", vokecall);
      },
      initAndroidAbtConfigJson: function initAndroidAbtConfigJson(gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring) {
        jsb.reflection.callStaticMethod(classJavaName, "initAbtConfigJsonForJs", "(Ljava/lang/String;ZILjava/lang/String;Ljava/lang/String;ILjava/lang/String;)V", gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring);
      },
      getAndroidAbtConfig: function getAndroidAbtConfig(cpPlaceId) {
        return jsb.reflection.callStaticMethod(classJavaName, "getAbtConfig", "(Ljava/lang/String;)Ljava/lang/String;", cpPlaceId);
      },
      showAndroidRewardDebugUI: function showAndroidRewardDebugUI() {
        jsb.reflection.callStaticMethod(classJavaName, "showRewardDebugActivity", "()V");
      },
      setAndroidRewardVideoLoadCallback: function setAndroidRewardVideoLoadCallback() {
        jsb.reflection.callStaticMethod(classJavaName, "setRewardVideoLoadCallback", "()V");
      },
      isAndroidRewardReady: function isAndroidRewardReady() {
        return jsb.reflection.callStaticMethod(classJavaName, "isRewardReady", "()Z");
      },
      showAndroidRewardVideo: function showAndroidRewardVideo(cpPlaceId) {
        null == cpPlaceId && (cpPlaceId = "reward_video");
        jsb.reflection.callStaticMethod(classJavaName, "showRewardVideo", "(Ljava/lang/String;)V", cpPlaceId);
      },
      setAndroidInterstitialLoadCallback: function setAndroidInterstitialLoadCallback(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "setInterstitialCallbackAt", "(Ljava/lang/String;)V", cpPlaceId);
      },
      isAndroidInterstitialReadyAsyn: function isAndroidInterstitialReadyAsyn(cpPlaceId, call) {
        jsb.reflection.callStaticMethod(classJavaName, "isInterstitialReadyForJs", "(Ljava/lang/String;Ljava/lang/String;)V", cpPlaceId, call);
      },
      isAndroidInterstitialReady: function isAndroidInterstitialReady(cpPlaceId) {
        return jsb.reflection.callStaticMethod(classJavaName, "isInterstitialReady", "(Ljava/lang/String;)Z", cpPlaceId);
      },
      showAndroidInterstitialAd: function showAndroidInterstitialAd(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "showInterstitialForJs", "(Ljava/lang/String;)V", cpPlaceId);
      },
      showAndroidInterstitialDebugUI: function showAndroidInterstitialDebugUI() {
        jsb.reflection.callStaticMethod(classJavaName, "showInterstitialDebugActivityForJs", "()V");
      },
      removeAndroidBannerAdAt: function removeAndroidBannerAdAt(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "removeBanner", "(Ljava/lang/String;)V", cpPlaceId);
      },
      showAndroidBannerAdAtTop: function showAndroidBannerAdAtTop(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "showTopBanner", "(Ljava/lang/String;)V", cpPlaceId);
      },
      showAndroidBannerAdAtBottom: function showAndroidBannerAdAtBottom(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "showBottomBanner", "(Ljava/lang/String;)V", cpPlaceId);
      },
      hideAndroidBannerAdAtTop: function hideAndroidBannerAdAtTop() {
        jsb.reflection.callStaticMethod(classJavaName, "hideTopBanner", "()V");
      },
      hideAndroidBannerAdAtBottom: function hideAndroidBannerAdAtBottom() {
        jsb.reflection.callStaticMethod(classJavaName, "hideBottomBanner", "()V");
      },
      showAndroidIconAdAt: function showAndroidIconAdAt(x, y, width, height, rotationAngle, cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "showIconAd", "(IIIIILjava/lang/String;)V", x, y, width, height, rotationAngle, cpPlaceId);
      },
      removeAndroidIconAdAt: function removeAndroidIconAdAt(cpPlaceId) {
        jsb.reflection.callStaticMethod(classJavaName, "removeIconAd", "(Ljava/lang/String;)V", cpPlaceId);
      },
      loadAndroidAdsByManual: function loadAndroidAdsByManual() {
        jsb.reflection.callStaticMethod(classJavaName, "loadAnroidAdsByManual", "()V");
      },
      exitAndroidApp: function exitAndroidApp() {
        jsb.reflection.callStaticMethod(classJavaName, "exitAndroidApp", "()V");
      },
      setAndroidManifestPackageName: function setAndroidManifestPackageName(pkg) {
        jsb.reflection.callStaticMethod(classJavaName, "setManifestPackageName", "(Ljava/lang/String;)V", pkg);
      },
      onAndroidBackPressed: function onAndroidBackPressed() {
        jsb.reflection.callStaticMethod(classJavaName, "onBackPressed", "()V");
      },
      setAndroidCustomerId: function setAndroidCustomerId(androidid) {
        jsb.reflection.callStaticMethod(classJavaName, "setCustomerIdForJs", "(Ljava/lang/String;)V", androidid);
      },
      updateAndroidAccessPrivacyInfoStatus: function updateAndroidAccessPrivacyInfoStatus(gdprPermissionEnumValue) {
        jsb.reflection.callStaticMethod(classJavaName, "updateAccessPrivacyInfoStatus", "(I)V", gdprPermissionEnumValue);
      },
      getAndroidAccessPrivacyInfoStatus: function getAndroidAccessPrivacyInfoStatus() {
        return jsb.reflection.callStaticMethod(classJavaName, "getAccessPrivacyInfoStatus", "()I");
      },
      notifyAndroidAccessPrivacyInfoStatus: function notifyAndroidAccessPrivacyInfoStatus(callback, callId) {
        jsb.reflection.callStaticMethod(classJavaName, "notifyAccessPrivacyInfoStatus", "(Ljava/lang/String;I)V", callback, callId);
      },
      isAndroidEuropeanUnionUser: function isAndroidEuropeanUnionUser(callback, callId) {
        jsb.reflection.callStaticMethod(classJavaName, "isEuropeanUnionUser", "(Ljava/lang/String;I)V", callback, callId);
      },
      reportIvokePluginMethodReceive: function reportIvokePluginMethodReceive(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportIvokePluginMethodReceive", "(Ljava/lang/String;)V", msg);
      },
      reportRDRewardClose: function reportRDRewardClose(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportRDRewardClose", "(Ljava/lang/String;)V", msg);
      },
      reportRDRewardClick: function reportRDRewardClick(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportRDRewardClick", "(Ljava/lang/String;)V", msg);
      },
      reportRDRewardGiven: function reportRDRewardGiven(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportRDRewardGiven", "(Ljava/lang/String;)V", msg);
      },
      reportRDShowDid: function reportRDShowDid(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportRDShowDid", "(Ljava/lang/String;)V", msg);
      },
      reportRDRewardCancel: function reportRDRewardCancel(msg) {
        jsb.reflection.callStaticMethod(classJavaName, "reportRDRewardCancel", "(Ljava/lang/String;)V", msg);
      },
      reportILClose: function reportILClose(msg, cpid) {
        jsb.reflection.callStaticMethod(classJavaName, "reportILClose", "(Ljava/lang/String;Ljava/lang/String;)V", void 0 == cpid ? "" : cpid, msg);
      },
      reportILClick: function reportILClick(msg, cpid) {
        jsb.reflection.callStaticMethod(classJavaName, "reportILClick", "(Ljava/lang/String;Ljava/lang/String;)V", void 0 == cpid ? "" : cpid, msg);
      },
      reportILShowDid: function reportILShowDid(msg, cpid) {
        jsb.reflection.callStaticMethod(classJavaName, "reportILShowDid", "(Ljava/lang/String;Ljava/lang/String;)V", void 0 == cpid ? "" : cpid, msg);
      },
      isOnlineDebugReportEnable: function isOnlineDebugReportEnable() {
        return jsb.reflection.callStaticMethod(classJavaName, "isReportOnlineEnable", "()Z");
      },
      isAndroidLogOpened: function isAndroidLogOpened() {
        return jsb.reflection.callStaticMethod(classJavaName, "isLogOpened", "()Z");
      },
      setAndroidIsChild: function setAndroidIsChild(isChild) {
        jsb.reflection.callStaticMethod(classJavaName, "setIsChild", "(Z)V", isChild);
      },
      setAndroidBirthday: function setAndroidBirthday(year, month) {
        jsb.reflection.callStaticMethod(classJavaName, "setBirthday", "(II)V", year, month);
      },
      autoOneKeyInspectByAndroid: function autoOneKeyInspectByAndroid() {
        jsb.reflection.callStaticMethod(classJavaName, "autoOneKeyInspect", "()V");
      },
      tellToDoctorByAndroid: function tellToDoctorByAndroid(action, placeid, msg) {
        jsb.reflection.callStaticMethod(classJavaName, "tellToDoctor", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", action, placeid, msg);
      },
      setAppsFlyerUIDByAndroid: function setAppsFlyerUIDByAndroid(uid) {
        jsb.reflection.callStaticMethod(classJavaName, "setAppsflyerUID", "(Ljava/lang/String;)V", uid);
      },
      setAdjustIdByAndroid: function setAdjustIdByAndroid(ajid) {
        jsb.reflection.callStaticMethod(classJavaName, "setAdjustID", "(Ljava/lang/String;)V", ajid);
      }
    };
    module.exports = upltva;
    cc._RF.pop();
  }, {} ],
  UPLTVIos: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "56bf2BM76RD3pMS97NjxIwH", "UPLTVIos");
    "use strict";
    var classIosName = "UpAdsBrigeJs";
    var showLog = false;
    var upltvoc = upltvoc || {
      setShowLog: function setShowLog(print) {
        void 0 != print && null != print && (showLog = print);
      },
      printJsLog: function printJsLog(msg) {
        showLog && void 0 != msg && null != msg && jsb.reflection.callStaticMethod(classIosName, "printJsLog:", msg);
      },
      initIosSDK: function initIosSDK(appkey, zone, invokecallback, callback) {
        void 0 != callback && null != callback ? jsb.reflection.callStaticMethod(classIosName, "initSdkByJsWithAppKey:zone:withCallback:", appkey, zone, callback) : jsb.reflection.callStaticMethod(classIosName, "initSdkByJsWithAppKey:zone:", appkey, zone);
        jsb.reflection.callStaticMethod(classIosName, "setVokeMethod:", invokecallback);
      },
      initIosAbtConfigJson: function initIosAbtConfigJson(gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring) {
        jsb.reflection.callStaticMethod(classIosName, "initAbtConfigJsonByJs:complete:paid:channel:gender:age:tags:", gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring);
      },
      getIosAbtConfig: function getIosAbtConfig(cpPlaceId) {
        var r = jsb.reflection.callStaticMethod(classIosName, "getIosAbtConfigByJs:", cpPlaceId);
        return r;
      },
      showIosRewardDebugUI: function showIosRewardDebugUI() {
        jsb.reflection.callStaticMethod(classIosName, "showRewardDebugActivityByJs");
      },
      setIosRewardVideoLoadCallback: function setIosRewardVideoLoadCallback() {
        jsb.reflection.callStaticMethod(classIosName, "setRewardVideoLoadCallbackByJs");
      },
      isIosRewardReady: function isIosRewardReady() {
        return jsb.reflection.callStaticMethod(classIosName, "isIosRewardReadyByJs");
      },
      showIosRewardVideo: function showIosRewardVideo(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "showIosRewardVideoByJs:", cpPlaceId);
      },
      isIosInterstitialReadyAsyn: function isIosInterstitialReadyAsyn(cpPlaceId, callback) {
        jsb.reflection.callStaticMethod(classIosName, "isInterstitialReadyAsynByJs:callback:", cpPlaceId, callback);
      },
      isIosInterstitialReady: function isIosInterstitialReady(cpPlaceId) {
        return jsb.reflection.callStaticMethod(classIosName, "isInterstitialReadyByJs:", cpPlaceId);
      },
      showIosInterstitialAd: function showIosInterstitialAd(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "showInterstitialByJs:", cpPlaceId);
      },
      setIosInterstitialLoadCallback: function setIosInterstitialLoadCallback(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "setInterstitialCallbackByJs:", cpPlaceId);
      },
      showIosInterstitialDebugUI: function showIosInterstitialDebugUI() {
        jsb.reflection.callStaticMethod(classIosName, "showInterstitialDebugActivityByJs");
      },
      removeIosBannerAdAt: function removeIosBannerAdAt(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "removeBannerByJs:", cpPlaceId);
      },
      showIosBannerAdAtTop: function showIosBannerAdAtTop(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "showTopBannerByJs:", cpPlaceId);
      },
      showIosBannerAdAtBottom: function showIosBannerAdAtBottom(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "showBottomBannerByJs:", cpPlaceId);
      },
      hideIosBannerAdAtTop: function hideIosBannerAdAtTop() {
        jsb.reflection.callStaticMethod(classIosName, "hideTopBannerByJs");
      },
      hideIosBannerAdAtBottom: function hideIosBannerAdAtBottom() {
        jsb.reflection.callStaticMethod(classIosName, "hideBottomBannerByJs");
      },
      setIosTopBannerPading: function setIosTopBannerPading(padding) {
        var strPading = "0";
        "number" == typeof padding ? strPading = String(padding) : "string" == typeof padding && (strPading = padding);
        jsb.reflection.callStaticMethod(classIosName, "setTopBannerPadingForIphonexByJs:", strPading);
      },
      showIosIconAdAt: function showIosIconAdAt(x, y, width, height, rotationAngle, cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "showIconX:y:width:height:rotationAngle:placementId:", x, y, width, height, rotationAngle, cpPlaceId);
      },
      removeIosIconAdAt: function removeIosIconAdAt(cpPlaceId) {
        jsb.reflection.callStaticMethod(classIosName, "removeIcon:", cpPlaceId);
      },
      loadIosAdsByManual: function loadIosAdsByManual() {
        jsb.reflection.callStaticMethod(classIosName, "loadIosAdsByManualByJs");
      },
      exitIosApp: function exitIosApp() {
        jsb.reflection.callStaticMethod(classIosName, "exitIosAppByJs");
      },
      updateIosAccessPrivacyInfoStatus: function updateIosAccessPrivacyInfoStatus(gdprPermissionEnumValue) {
        jsb.reflection.callStaticMethod(classIosName, "updateAccessPrivacyInfoStatusByJs:", gdprPermissionEnumValue);
      },
      getIosAccessPrivacyInfoStatus: function getIosAccessPrivacyInfoStatus() {
        return jsb.reflection.callStaticMethod(classIosName, "getAccessPrivacyInfoStatusByJs");
      },
      notifyIosAccessPrivacyInfoStatus: function notifyIosAccessPrivacyInfoStatus(callback, callId) {
        jsb.reflection.callStaticMethod(classIosName, "notifyAccessPrivacyInfoStatusByJs:callId:", callback, callId);
      },
      isIosEuropeanUnionUser: function isIosEuropeanUnionUser(callback, callId) {
        jsb.reflection.callStaticMethod(classIosName, "isEuropeanUnionUserByJs:callId:", callback, callId);
      },
      reportIvokePluginMethodReceive: function reportIvokePluginMethodReceive(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportIvokePluginMethodReceiveByJs:", msg);
      },
      reportRDRewardClose: function reportRDRewardClose(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportRDRewardCloseByJs:", msg);
      },
      reportRDRewardClick: function reportRDRewardClick(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportRDRewardClickByJs:", msg);
      },
      reportRDRewardGiven: function reportRDRewardGiven(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportRDRewardGivenByJs:", msg);
      },
      reportRDShowDid: function reportRDShowDid(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportRDShowDidByJs:", msg);
      },
      reportRDRewardCancel: function reportRDRewardCancel(msg) {
        jsb.reflection.callStaticMethod(classIosName, "reportRDRewardCancelByJs:", msg);
      },
      reportILClose: function reportILClose(msg, cpid) {
        jsb.reflection.callStaticMethod(classIosName, "reportILCloseByJs:msg:", void 0 == cpid ? "" : cpid, msg);
      },
      reportILClick: function reportILClick(msg, cpid) {
        jsb.reflection.callStaticMethod(classIosName, "reportILClickByJs:msg:", void 0 == cpid ? "" : cpid, msg);
      },
      reportILShowDid: function reportILShowDid(msg, cpid) {
        jsb.reflection.callStaticMethod(classIosName, "reportILShowDidByJs:msg:", void 0 == cpid ? "" : cpid, msg);
      },
      isOnlineDebugReportEnable: function isOnlineDebugReportEnable() {
        return jsb.reflection.callStaticMethod(classIosName, "isReportOnlineEnableByJs");
      },
      isIosLogOpened: function isIosLogOpened() {
        return jsb.reflection.callStaticMethod(classIosName, "isIosLogOpenedByJs");
      },
      autoOneKeyInspectByIos: function autoOneKeyInspectByIos() {
        jsb.reflection.callStaticMethod(classIosName, "autoOneKeyInspectByJs");
      },
      tellToDoctorByIos: function tellToDoctorByIos(action, placeid, msg) {
        jsb.reflection.callStaticMethod(classIosName, "tellToDoctorByJs:adid:msg:", action, placeid, msg);
      },
      setAppsFlyerUIDByIos: function setAppsFlyerUIDByIos(uid) {
        jsb.reflection.callStaticMethod(classIosName, "setAppsFlyerUIDByJs:", uid);
      },
      setAdjustIdByIos: function setAdjustIdByIos(ajid) {
        jsb.reflection.callStaticMethod(classIosName, "setAdjustIdByJs:", ajid);
      }
    };
    module.exports = upltvoc;
    cc._RF.pop();
  }, {} ],
  UPLTV: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "1262dOfvABFVJ1EwXaOwcQh", "UPLTV");
    "use strict";
    var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    var upltvoc = require("UPLTVIos");
    var upltva = require("UPLTVAndroid");
    var isShowLog = true;
    var doctorWorking = false;
    var printLog = function printLog(msg) {
      void 0 != msg && null != msg && isShowLog && void 0 != upltv && null != upltv.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? upltv.upltvbridge.printJsLog(msg) : cc.sys.os === cc.sys.OS_IOS && upltv.upltvbridge.printJsLog(msg));
    };
    var isOnlineReportEnable = function isOnlineReportEnable() {
      return void 0 != upltv && upltv.isOnlineDebugReportEnable();
    };
    var onlineReportCall = function onlineReportCall(name, msg, cpid) {
      void 0 != upltv && (void 0 != cpid ? upltv.onlineDebugReport(name, msg, cpid) : upltv.onlineDebugReport(name, msg));
    };
    var doctorOnDuty = function doctorOnDuty() {
      doctorWorking = true;
    };
    var doctorOffDuty = function doctorOffDuty() {
      doctorWorking = false;
    };
    var tellToDoctor = function tellToDoctor(action, placeid, msg) {
      void 0 != upltv && void 0 != upltv.upltvbridge && null != upltv.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? upltv.upltvbridge.tellToDoctorByAndroid(action, placeid, msg) : cc.sys.os === cc.sys.OS_IOS && upltv.upltvbridge.tellToDoctorByIos(action, null == placeid ? "" : placeid, null == msg ? "" : msg));
    };
    var functionNames = {
      handleVokeParams: function handleVokeParams(params) {
        if (void 0 == params || null == params || "string" != typeof params) return;
        var startpos = params.indexOf(":");
        var substr = null;
        if (startpos <= 0) return;
        substr = params.substr(startpos + 1);
        var endpos = substr.indexOf(",");
        var callname = substr.substring(0, endpos);
        substr = substr.substr(endpos + 1);
        var cpadid = null;
        var message = null;
        startpos = substr.indexOf(":");
        if (startpos > 0) {
          substr = substr.substr(startpos + 1);
          endpos = substr.indexOf(",");
          if (endpos > 0) {
            cpadid = substr.substring(0, endpos);
            substr = substr.substr(endpos + 1);
            if (null != substr) {
              startpos = substr.indexOf(":");
              startpos > 0 && (message = substr.substr(startpos + 1));
            }
          }
        }
        if (isShowLog) {
          printLog("===> js handleVokeParams callname: " + callname);
          printLog("===> js handleVokeParams   cpadid: " + cpadid);
          printLog("===> js handleVokeParams  message: " + message);
        }
        var canreport = isOnlineReportEnable();
        canreport && onlineReportCall(functionNames.Function_Receive_Callback, "CocosJs Receive message, callname:" + callname + ", cpadid:" + cpadid);
        if (functionNames.Action_Doctor_ON_DUTY == callname) canreport && doctorOnDuty(); else if (functionNames.Action_Doctor_OFF_DUTY == callname) canreport && doctorOffDuty(); else if (functionNames.Function_Doctor_IL_Load_Request == callname) canreport && true == doctorWorking && upltv.setInterstitialLoadCallback(functionNames.Function_Doctor_IL_Show_AdId, function(cpid, msg) {
          tellToDoctor(functionNames.Action_Doctor_Ad_IL_LoadOk_Reply, functionNames.Function_Doctor_IL_Show_AdId, "cocoscreator js il load ok");
        }, function(cpid, msg) {
          tellToDoctor(functionNames.Action_Doctor_Ad_IL_LoadFail_Reply, functionNames.Function_Doctor_IL_Show_AdId, msg);
        }); else if (functionNames.Function_Doctor_RD_Load_Request == callname) canreport && true == doctorWorking && upltv.setRewardVideoLoadCallback(function(cpid, msg) {
          tellToDoctor(functionNames.Action_Doctor_Ad_RD_LoadOk_Reply, functionNames.Function_Doctor_RD_Show_AdId, "cocoscreator js rd load ok");
        }, function(cpid, msg) {
          tellToDoctor(functionNames.Action_Doctor_Ad_RD_LoadFail_Reply, functionNames.Function_Doctor_RD_Show_AdId, msg);
        }); else if (functionNames.Function_Doctor_RD_Show_Request == callname) upltv.showRewardVideo(functionNames.Function_Doctor_RD_Show_AdId); else if (functionNames.Function_Doctor_IL_Show_Request == callname) upltv.showInterstitialAd(functionNames.Function_Doctor_IL_Show_AdId); else if (functionNames.Function_Reward_DidLoadFail == callname) if (null != ltvMap.rewardLoadFailCall && "function" == typeof ltvMap.rewardLoadFailCall) {
          ltvMap.rewardLoadFailCall(cpadid, message);
          ltvMap.resetRewardLoadCallback();
        } else printLog("===> js rewardLoadFailCall is null or not function"); else if (functionNames.Function_Reward_DidLoadSuccess == callname) if (null != ltvMap.rewardLoadSuccessCall && "function" == typeof ltvMap.rewardLoadSuccessCall) {
          ltvMap.rewardLoadSuccessCall(cpadid, message);
          ltvMap.resetRewardLoadCallback();
        } else printLog("===> rewardLoadSuccessCall is null or not function"); else if (functionNames.Function_Reward_WillOpen == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video willopen event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_WillShow_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the rd willshow event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_WILL_SHOW, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video willopen event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video willopen event.");
        } else if (functionNames.Function_Reward_DidOpen == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video shown event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_DidShow_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the rd didopen event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_DID_SHOW, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video shown event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video shown event.");
        } else if (functionNames.Function_Reward_DidClick == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video clicked event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_DidClick_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the rd didclick event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_DID_CLICK, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video clicked event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video clicked event.");
        } else if (functionNames.Function_Reward_DidClose == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video closed event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_DidClose_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the rd didclose event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_DID_CLOSE, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video closed event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video closed event.");
        } else if (functionNames.Function_Reward_DidGivien == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video reward given event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_Given_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the rd givenreward event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_DID_GIVEN_REWARD, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video reward given event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video reward given event.");
        } else if (functionNames.Function_Reward_DidAbandon == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on video reward cancel event.");
            tellToDoctor(functionNames.Action_Doctor_Ad_RD_Cancel_Reply, functionNames.Function_Doctor_RD_Show_AdId, "tell the noreward event to doctor.");
            return;
          }
          var call = ltvMap.rewardShowCall;
          if (null != call && "function" == typeof call) {
            call(upltv.AdEventType.VIDEO_EVENT_DID_ABANDON_REWARD, cpadid);
            canreport && onlineReportCall(callname, "CocosJs did run callback on video reward cancel event.");
          } else canreport && onlineReportCall(callname, "CocosJs not run callback on video reward cancel event.");
        } else if (functionNames.Function_Interstitial_DidLoadFail == callname) {
          var k = cpadid + "_Interstitial";
          var v = ltvMap.get(k);
          if (null != v) {
            var call = v.interstitialLoadFailCall;
            null != call && "function" == typeof call && call(cpadid, message);
            ltvMap.remove(k);
            printLog("===> Interstitial_DidLoadFail at key:" + k);
          }
        } else if (functionNames.Function_Interstitial_DidLoadSuccess == callname) {
          var k = cpadid + "_Interstitial";
          var v = ltvMap.get(k);
          if (null != v) {
            var call = v.interstitialLoadSuccessCall;
            null != call && "function" == typeof call ? call(cpadid, message) : printLog("===> interstitial_didloadsuccess call is null or non-function type at key:" + k);
            ltvMap.remove(k);
          } else printLog("===> interstitial_didloadsuccess v is null at key:" + k);
        } else if (functionNames.Function_Interstitial_Willshow == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on il ad willshown event.", functionNames.Function_Doctor_IL_Show_AdId);
            tellToDoctor(functionNames.Action_Doctor_Ad_IL_WillShow_Reply, functionNames.Function_Doctor_IL_Show_AdId, "tell the il willshow event to doctor.");
            return;
          }
          var v = ltvMap.get(cpadid);
          var callReport = false;
          if (null != v) {
            var call = v.interstitialShowCall;
            if (null != call && "function" == typeof call) {
              call(upltv.AdEventType.INTERSTITIAL_EVENT_WILL_SHOW, cpadid);
              if (canreport) {
                callReport = true;
                onlineReportCall(callname, "CocosJs did run callback on il ad willshown event at " + cpadid, cpadid);
              }
            }
          }
          canreport && false == callReport && onlineReportCall(callname, "CocosJs not run callback on il ad willshown event at " + cpadid, cpadid);
        } else if (functionNames.Function_Interstitial_Didshow == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on il ad shown event.", functionNames.Function_Doctor_IL_Show_AdId);
            tellToDoctor(functionNames.Action_Doctor_Ad_IL_DidShow_Reply, functionNames.Function_Doctor_IL_Show_AdId, "tell the il didshow event to doctor.");
            return;
          }
          var v = ltvMap.get(cpadid);
          var callReport = false;
          if (null != v) {
            var call = v.interstitialShowCall;
            if (null != call && "function" == typeof call) {
              call(upltv.AdEventType.INTERSTITIAL_EVENT_DID_SHOW, cpadid);
              if (canreport) {
                callReport = true;
                onlineReportCall(callname, "CocosJs did run callback on il ad shown event at " + cpadid, cpadid);
              }
            }
          }
          canreport && false == callReport && onlineReportCall(callname, "CocosJs not run callback on il ad shown event at " + cpadid, cpadid);
        } else if (functionNames.Function_Interstitial_Didclose == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on il ad closed event.", functionNames.Function_Doctor_IL_Show_AdId);
            tellToDoctor(functionNames.Action_Doctor_Ad_IL_DidClose_Reply, functionNames.Function_Doctor_IL_Show_AdId, "tell the il didclose event to doctor.");
            return;
          }
          var v = ltvMap.get(cpadid);
          var callReport = false;
          if (null != v) {
            var call = v.interstitialShowCall;
            if (null != call && "function" == typeof call) {
              call(upltv.AdEventType.INTERSTITIAL_EVENT_DID_CLOSE, cpadid);
              if (canreport) {
                callReport = true;
                onlineReportCall(callname, "CocosJs did run callback on il ad closed event at " + cpadid, cpadid);
              }
            }
          }
          canreport && false == callReport && onlineReportCall(callname, "CocosJs not run callback on il ad closed event at " + cpadid, cpadid);
        } else if (functionNames.Function_Interstitial_Didclick == callname) {
          if (canreport && true == doctorWorking) {
            onlineReportCall(callname, "CocosJs did run callback on il ad clicked event.", functionNames.Function_Doctor_IL_Show_AdId);
            tellToDoctor(functionNames.Action_Doctor_Ad_IL_DidClick_Reply, functionNames.Function_Doctor_IL_Show_AdId, "tell the il didclick event to doctor.");
            return;
          }
          var v = ltvMap.get(cpadid);
          var callReport = false;
          if (null != v) {
            var call = v.interstitialShowCall;
            if (null != call && "function" == typeof call) {
              call(upltv.AdEventType.INTERSTITIAL_EVENT_DID_CLICK, cpadid);
              if (canreport) {
                callReport = true;
                onlineReportCall(callname, "CocosJs did run callback on il ad clicked event at " + cpadid, cpadid);
              }
            }
          }
          canreport && false == callReport && onlineReportCall(callname, "CocosJs not run callback on il ad clicked event at " + cpadid, cpadid);
        } else if (functionNames.Function_Banner_DidRemove == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.bannerEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.BANNER_EVENT_DID_REMOVED, cpadid);
          }
          ltvMap.remove(cpadid);
        } else if (functionNames.Function_Banner_DidClick == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.bannerEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.BANNER_EVENT_DID_CLICK, cpadid);
          }
        } else if (functionNames.Function_Banner_DidShow == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.bannerEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.BANNER_EVENT_DID_SHOW, cpadid);
          }
        } else if (functionNames.Function_Icon_DidLoad == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.iconEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.ICON_EVENT_DID_LOAD, cpadid);
          }
        } else if (functionNames.Function_Icon_DidLoadFail == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.iconEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.ICON_EVENT_DID_LOADFAIL, cpadid);
          }
        } else if (functionNames.Function_Icon_DidShow == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.iconEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.ICON_EVENT_DID_SHOW, cpadid);
          }
        } else if (functionNames.Function_Icon_DidClick == callname) {
          var v = ltvMap.get(cpadid);
          if (null != v) {
            var call = v.iconEventCall;
            null != call && "function" == typeof call && call(upltv.AdEventType.ICON_EVENT_DID_CLICK, cpadid);
          }
        }
      }
    };
    functionNames.Function_Receive_Callback = "receive_callback";
    functionNames.Function_Reward_WillOpen = "reward_willopen";
    functionNames.Function_Reward_DidOpen = "reward_didopen";
    functionNames.Function_Reward_DidClick = "reward_didclick";
    functionNames.Function_Reward_DidClose = "reward_didclose";
    functionNames.Function_Reward_DidGivien = "reward_didgiven";
    functionNames.Function_Reward_DidAbandon = "reward_didabandon";
    functionNames.Function_Interstitial_Willshow = "interstitial_willshow";
    functionNames.Function_Interstitial_Didshow = "interstitial_didshow";
    functionNames.Function_Interstitial_Didclose = "interstitial_didclose";
    functionNames.Function_Interstitial_Didclick = "interstitial_didclick";
    functionNames.Function_Banner_DidShow = "banner_didshow";
    functionNames.Function_Banner_DidClick = "banner_didclick";
    functionNames.Function_Banner_DidRemove = "banner_didremove";
    functionNames.Function_Reward_DidLoadFail = "reward_didloadfail";
    functionNames.Function_Reward_DidLoadSuccess = "reward_didloadsuccess";
    functionNames.Function_Interstitial_DidLoadFail = "interstitial_didloadfail";
    functionNames.Function_Interstitial_DidLoadSuccess = "interstitial_didloadsuccess";
    functionNames.Function_Icon_DidLoad = "icon_didload";
    functionNames.Function_Icon_DidLoadFail = "icon_didloadfail";
    functionNames.Function_Icon_DidShow = "icon_didshow";
    functionNames.Function_Icon_DidClick = "icon_didclick";
    functionNames.Action_Doctor_ON_DUTY = "auto_ad_checking_doctor_on_duty";
    functionNames.Action_Doctor_OFF_DUTY = "auto_ad_checking_doctor_off_duty";
    functionNames.Action_Doctor_Ad_IL_LoadOk_Reply = "auto_ad_il_load_ok_reply";
    functionNames.Action_Doctor_Ad_IL_LoadFail_Reply = "auto_ad_il_load_fail_reply";
    functionNames.Action_Doctor_Ad_IL_WillShow_Reply = "auto_ad_il_willshow_reply";
    functionNames.Action_Doctor_Ad_IL_DidShow_Reply = "auto_ad_il_didshow_reply";
    functionNames.Action_Doctor_Ad_IL_DidClick_Reply = "auto_ad_il_didclick_reply";
    functionNames.Action_Doctor_Ad_IL_DidClose_Reply = "auto_ad_il_didclose_reply";
    functionNames.Action_Doctor_Ad_RD_LoadOk_Reply = "auto_ad_rd_load_ok_reply";
    functionNames.Action_Doctor_Ad_RD_LoadFail_Reply = "auto_ad_rd_load_fail_reply";
    functionNames.Action_Doctor_Ad_RD_WillShow_Reply = "auto_ad_rd_willshow_reply";
    functionNames.Action_Doctor_Ad_RD_DidShow_Reply = "auto_ad_rd_didshow_reply";
    functionNames.Action_Doctor_Ad_RD_DidClick_Reply = "auto_ad_rd_didclick_reply";
    functionNames.Action_Doctor_Ad_RD_DidClose_Reply = "auto_ad_rd_didclose_reply";
    functionNames.Action_Doctor_Ad_RD_Given_Reply = "auto_ad_rd_reward_given_reply";
    functionNames.Action_Doctor_Ad_RD_Cancel_Reply = "auto_ad_rd_reward_cancel_reply";
    functionNames.Function_Doctor_IL_Show_AdId = "auto_sample_ad_il_show_placeid";
    functionNames.Function_Doctor_RD_Show_AdId = "auto_sample_ad_rd_show_placeid";
    functionNames.Function_Doctor_IL_Show_Request = "invoke_plugin_ad_il_show_request";
    functionNames.Function_Doctor_RD_Show_Request = "invoke_plugin_ad_rd_show_request";
    functionNames.Function_Doctor_IL_Load_Request = "invoke_plugin_ad_il_load_request";
    functionNames.Function_Doctor_RD_Load_Request = "invoke_plugin_ad_rd_load_request";
    var ltvMap = {
      map: new Object(),
      length: 0,
      rewardLoadFailCall: null,
      rewardLoadSuccessCall: null,
      rewardShowCall: null,
      backPressedCall: null,
      resetRewardLoadCallback: function resetRewardLoadCallback() {
        this.rewardLoadFailCall = null;
        this.rewardLoadSuccessCall = null;
      },
      size: function size() {
        return this.length;
      },
      put: function put(key, value) {
        this.map["_" + key] || ++this.length;
        this.map["_" + key] = value;
      },
      remove: function remove(key) {
        if (this.map["_" + key]) {
          --this.length;
          return delete this.map["_" + key];
        }
        return false;
      },
      exist: function exist(key) {
        return !!this.map["_" + key];
      },
      get: function get(key) {
        return this.map["_" + key] ? this.map["_" + key] : null;
      },
      print: function print() {
        var str = "";
        for (var each in this.map) str += "/n" + each + "  Value:" + this.map[each];
        printLog("===> js map : " + str);
        return str;
      },
      test: function test() {
        this.put("1", function() {});
        this.put("2", function(v) {
          cc.log("===> js map function call at 2, v type: %s", "undefined" === typeof v ? "undefined" : _typeof(v));
        });
        this.put("4", function() {});
        printLog("===> js map exist 1: " + this.exist("1"));
        printLog("===> js map exist 2: " + this.exist("3"));
        var value = this.get("2");
        value && value("========================");
        this.print();
        this.remove("1");
        this.remove("3");
        printLog("===> js map size: " + this.size());
      }
    };
    var loadJsBridgeObject = function loadJsBridgeObject() {
      cc.sys.os === cc.sys.OS_IOS && null != upltv ? void 0 != upltv.upltvbridge && null != upltv.upltvbridge || (upltv.upltvbridge = upltvoc) : cc.sys.os === cc.sys.OS_ANDROID && null != upltv && (void 0 != upltv.upltvbridge && null != upltv.upltvbridge || (upltv.upltvbridge = upltva));
    };
    var bridgeInterface = {
      initSdkSuccessed: false,
      initVokeCall: null,
      initSdkCallback: function initSdkCallback(msg1) {
        "true" != msg1 && true != msg1 || (this.initSdkSuccessed = true);
        cc.log("===> js initSdkCallback..., %s", msg1);
        void 0 != this.initVokeCall && null != this.initVokeCall && "function" == typeof this.initVokeCall && this.initVokeCall(this.initSdkSuccessed);
        void 0 != this.initVokeCall && (this.initVokeCall = null);
      },
      vokeMethod: function vokeMethod(params) {
        functionNames.handleVokeParams(params);
      },
      vokeILReadyMethod: function vokeILReadyMethod(cpPlaceId, r) {
        this.handleILReadyMethod(cpPlaceId, r);
      },
      handleILReadyMethod: function handleILReadyMethod(cpPlaceId, r) {
        var key = "ILReady_" + cpPlaceId;
        var call = ltvMap.get(key);
        if (null != call) {
          ltvMap.remove(key);
          if ("function" == typeof call) {
            var rr = false;
            "true" != r && true != r || (rr = true);
            call(rr);
          }
        }
      }
    };
    var upltv = upltv || {
      upltvbridge: null,
      initSdk: function initSdk(androidAppKey, iosAppKey, iosZone, callback) {
        if (true == cc.bridgeInterface.initSdkSuccessed) {
          printLog("===> js initSdk don't called again ");
          return;
        }
        if (void 0 != callback && null != callback && "function" == typeof callback) {
          printLog("===> js set initVokeCall...");
          cc.bridgeInterface.initVokeCall = callback;
        }
        var vokecall = "cc.bridgeInterface.vokeMethod";
        var callname = "cc.bridgeInterface.initSdkCallback";
        loadJsBridgeObject();
        if (cc.sys.os === cc.sys.OS_IOS) {
          if (void 0 != this.upltvbridge && null != this.upltvbridge) {
            if (void 0 == iosAppKey || "" == iosAppKey) {
              cc.log("===> js initSdk failed, iosAppKey is undefined or empty.");
              return;
            }
            if ("string" != typeof iosAppKey) {
              cc.log("===> js initSdk failed, iosAppKey is not string type.");
              return;
            }
            if (void 0 == iosZone || 0 != iosZone && 1 != iosZone && 2 != iosZone) {
              cc.log("===> js initSdk WARNING: iosZone iswrong value, will be setted to 0");
              iosZone = 0;
            }
            this.upltvbridge.setShowLog(isShowLog);
            this.upltvbridge.initIosSDK(iosAppKey, iosZone, vokecall, callname);
          }
        } else if (cc.sys.os === cc.sys.OS_ANDROID) {
          if (void 0 == androidAppKey && "" == androidAppKey) {
            printLog("please set correct androidAppKey for initializing upsdk");
            return;
          }
          if (void 0 != this.upltvbridge && null != this.upltvbridge) {
            this.upltvbridge.setShowLog(isShowLog);
            this.upltvbridge.initAndroidSDK(androidAppKey, vokecall, callname);
          }
        }
      },
      initAbtConfigJson: function initAbtConfigJson(gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tags) {
        var tagstring = null;
        if (void 0 != tags && null != tags && tags instanceof Array) {
          var count = tags.length;
          tagstring = '{"array":[';
          for (var i = 0; i < count; i++) {
            tagstring += '"' + tags[i];
            tagstring += i < count - 1 ? '",' : '"]}';
          }
        }
        void 0 == isCompleteTask && (isCompleteTask = false);
        void 0 == isPaid && (isPaid = 0);
        void 0 == promotionChannelName && (promotionChannelName = "");
        void 0 == gender && (gender = "");
        void 0 == age && (age = -1);
        cc.sys.os === cc.sys.OS_IOS ? void 0 != this.upltvbridge && null != this.upltvbridge && this.upltvbridge.initIosAbtConfigJson(gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring) : cc.sys.os === cc.sys.OS_ANDROID && void 0 != this.upltvbridge && null != this.upltvbridge && this.upltvbridge.initAndroidAbtConfigJson(gameAccountId, isCompleteTask, isPaid, promotionChannelName, gender, age, tagstring);
      },
      getAbtConfig: function getAbtConfig(cpPlaceId) {
        if (void 0 != cpPlaceId && null != cpPlaceId && "string" == typeof cpPlaceId) if (cc.sys.os === cc.sys.OS_IOS) {
          if (void 0 != this.upltvbridge && null != this.upltvbridge) {
            var r = this.upltvbridge.getIosAbtConfig(cpPlaceId);
            return "" == r ? null : r;
          }
        } else if (cc.sys.os === cc.sys.OS_ANDROID && void 0 != this.upltvbridge && null != this.upltvbridge) {
          var r = this.upltvbridge.getAndroidAbtConfig(cpPlaceId);
          return "" == r ? null : r;
        }
        return null;
      },
      showRewardDebugUI: function showRewardDebugUI() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosRewardDebugUI() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidRewardDebugUI());
      },
      setRewardVideoLoadCallback: function setRewardVideoLoadCallback(loadsuccess, locadfail) {
        if (void 0 == loadsuccess || null == loadsuccess || "function" != typeof loadsuccess) {
          printLog("===> setRewardVideoLoadCallback(), the loadsuccess can't be undefined or null or non-function type.");
          return;
        }
        if (void 0 == locadfail || null == locadfail || "function" != typeof locadfail) {
          printLog("===> setRewardVideoLoadCallback(), the locadfail can't be undefined or null or non-function type.");
          return;
        }
        ltvMap.rewardLoadFailCall = void 0 == locadfail ? null : locadfail;
        ltvMap.rewardLoadSuccessCall = void 0 == loadsuccess ? null : loadsuccess;
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.setIosRewardVideoLoadCallback() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.setAndroidRewardVideoLoadCallback());
      },
      setRewardVideoShowCallback: function setRewardVideoShowCallback(showCall) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == showCall || null == showCall || "function" != typeof showCall) {
            printLog("===> setRewardVideoShowCallback(), the showCall can't be undefined or null or non-function type.");
            return;
          }
          ltvMap.rewardShowCall = showCall;
        }
      },
      isRewardReady: function isRewardReady() {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (cc.sys.os === cc.sys.OS_IOS) return this.upltvbridge.isIosRewardReady();
          if (cc.sys.os === cc.sys.OS_ANDROID) return this.upltvbridge.isAndroidRewardReady();
        }
        return false;
      },
      showRewardVideo: function showRewardVideo(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          void 0 == cpPlaceId && (cpPlaceId = null);
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosRewardVideo(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidRewardVideo(cpPlaceId);
        }
      },
      isInterstitialReadyAsyn: function isInterstitialReadyAsyn(cpPlaceId, callback) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("Please set the Paramer cpPlaceId's value in function isInterstitialReadyAsyn()");
            return;
          }
          if (callback == cpPlaceId || null == callback) {
            printLog("Please set the Paramer callback's value in function isInterstitialReadyAsyn()");
            return;
          }
          if ("function" != typeof callback) {
            printLog("The Paramer 'callback' is  non-function type in function isInterstitialReadyAsyn()");
            return;
          }
          var key = "ILReady_" + cpPlaceId;
          ltvMap.put(key, callback);
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.isIosInterstitialReadyAsyn(cpPlaceId, "cc.bridgeInterface.vokeILReadyMethod") : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.isAndroidInterstitialReadyAsyn(cpPlaceId, "cc.bridgeInterface.vokeILReadyMethod");
        }
      },
      isInterstitialReady: function isInterstitialReady(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> isInterstitialReady(), the cpPlaceId can't be undefined or null.");
            return;
          }
          if (cc.sys.os === cc.sys.OS_IOS) return this.upltvbridge.isIosInterstitialReady(cpPlaceId);
          if (cc.sys.os === cc.sys.OS_ANDROID) return this.upltvbridge.isAndroidInterstitialReady(cpPlaceId);
        }
        return false;
      },
      showInterstitialAd: function showInterstitialAd(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("Please set the Paramer cpPlaceId's value in function showInterstitialAd()");
            return;
          }
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosInterstitialAd(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidInterstitialAd(cpPlaceId);
        }
      },
      setInterstitialLoadCallback: function setInterstitialLoadCallback(cpPlaceId, loadsuccess, locadfail) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> setIntersitialLoadCall(), the cpPlaceId can't be undefined or null.");
            return;
          }
          if (void 0 == loadsuccess || null == loadsuccess || "function" != typeof loadsuccess) {
            printLog("===> setIntersitialLoadCall(), the loadsuccess can't be undefined or null or null or non-function type.");
            return;
          }
          if (void 0 == locadfail || null == locadfail || "function" != typeof locadfail) {
            printLog("===> setIntersitialLoadCall(), the locadfail can't be undefined or null or null or non-function type.");
            return;
          }
          var k = cpPlaceId + "_Interstitial";
          var v = ltvMap.get(k) || {};
          v.interstitialLoadSuccessCall = loadsuccess;
          v.interstitialLoadFailCall = locadfail;
          ltvMap.put(k, v);
          printLog("===> setIntersitialLoadCall() ltvMap size: " + ltvMap.size());
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.setIosInterstitialLoadCallback(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.setAndroidInterstitialLoadCallback(cpPlaceId);
        }
      },
      setInterstitialShowCallback: function setInterstitialShowCallback(cpPlaceId, showCall) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> setInterstitialShowCallback(), the cpPlaceId can't be undefined or null.");
            return;
          }
          if (void 0 == showCall || null == showCall || "function" != typeof showCall) {
            printLog("===> setInterstitialShowCallback(), the showCall can't be undefined or null or non-function type.");
            return;
          }
          var k = cpPlaceId;
          var v = ltvMap.get(k) || {};
          v.interstitialShowCall = showCall;
          ltvMap.put(k, v);
        }
      },
      showInterstitialDebugUI: function showInterstitialDebugUI() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosInterstitialDebugUI() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidInterstitialDebugUI());
      },
      removeBannerAdAt: function removeBannerAdAt(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> removeBannerAdAt(), the cpPlaceId can't be undefined or null.");
            return;
          }
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.removeIosBannerAdAt(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.removeAndroidBannerAdAt(cpPlaceId);
        }
      },
      showBannerAdAtTop: function showBannerAdAtTop(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> showBannerAdAtTop(), the cpPlaceId can't be undefined or null.");
            return;
          }
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosBannerAdAtTop(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidBannerAdAtTop(cpPlaceId);
        }
      },
      showBannerAdAtBottom: function showBannerAdAtBottom(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> showBannerAdAtBottom(), the cpPlaceId can't be undefined or null.");
            return;
          }
          cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.showIosBannerAdAtBottom(cpPlaceId) : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidBannerAdAtBottom(cpPlaceId);
        }
      },
      hideBannerAdAtTop: function hideBannerAdAtTop() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.hideIosBannerAdAtTop() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.hideAndroidBannerAdAtTop());
      },
      hideBannerAdAtBottom: function hideBannerAdAtBottom() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.hideIosBannerAdAtBottom() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.hideAndroidBannerAdAtBottom());
      },
      setTopBannerPadingForIphoneX: function setTopBannerPadingForIphoneX(padding) {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.setIosTopBannerPading(padding) : cc.sys.os === cc.sys.OS_ANDROID);
      },
      setBannerShowCallback: function setBannerShowCallback(cpPlaceId, bannerCall) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> setBannerShowCallback(), the cpPlaceId can't be undefined or null.");
            return;
          }
          if (void 0 == bannerCall || null == bannerCall || "function" != typeof bannerCall) {
            printLog("===> setBannerShowCallback(), the bannerCall can't be undefined or null or non-function type.");
            return;
          }
          var v = ltvMap.get(cpPlaceId) || {};
          v.bannerEventCall = bannerCall;
          ltvMap.put(cpPlaceId, v);
        }
      },
      setIconCallback: function setIconCallback(cpPlaceId, iconCall) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> setIconCallback(), the cpPlaceId can't be undefined or null.");
            return;
          }
          if (void 0 == iconCall || null == iconCall || "function" != typeof iconCall) {
            printLog("===> setIconCallback(), the iconCall can't be undefined or null or non-function type.");
            return;
          }
          var v = ltvMap.get(cpPlaceId) || {};
          v.iconEventCall = iconCall;
          ltvMap.put(cpPlaceId, v);
        }
      },
      showIconAd: function showIconAd(x, y, width, height, rotationAngle, cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> showIconAd(), the cpPlaceId can't be undefined or null.");
            return;
          }
          cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.showAndroidIconAdAt(x, y, width, height, rotationAngle, cpPlaceId);
          cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.showIosIconAdAt(x, y, width, height, rotationAngle, cpPlaceId);
        }
      },
      removeIconAd: function removeIconAd(cpPlaceId) {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (void 0 == cpPlaceId || null == cpPlaceId) {
            printLog("===> removeIconAd(), the cpPlaceId can't be undefined or null.");
            return;
          }
          cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.removeAndroidIconAdAt(cpPlaceId);
          cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.removeIosIconAdAt(cpPlaceId);
        }
      },
      loadAdsByManual: function loadAdsByManual() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.loadIosAdsByManual() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.loadAndroidAdsByManual());
      },
      exitApp: function exitApp() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_IOS ? this.upltvbridge.exitIosApp() : cc.sys.os === cc.sys.OS_ANDROID && this.upltvbridge.exitAndroidApp());
      },
      setManifestPackageName: function setManifestPackageName(pkg) {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.setAndroidManifestPackageName(pkg) : cc.sys.os === cc.sys.OS_ANDROID);
      },
      onBackPressed: function onBackPressed() {
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.onAndroidBackPressed() : cc.sys.os === cc.sys.OS_IOS);
      },
      setCustomerId: function setCustomerId(androidid) {
        loadJsBridgeObject();
        if (void 0 != this.upltvbridge && null != this.upltvbridge) if (cc.sys.os === cc.sys.OS_ANDROID) {
          if (void 0 == androidid || null == androidid) {
            printLog("===> setCustomerId(), the anroidid can't be null");
            return;
          }
          this.upltvbridge.setAndroidCustomerId(androidid);
        } else cc.sys.os === cc.sys.OS_IOS;
      },
      updateAccessPrivacyInfoStatus: function updateAccessPrivacyInfoStatus(gdprPermissionEnumValue) {
        loadJsBridgeObject();
        if (void 0 == gdprPermissionEnumValue || null == gdprPermissionEnumValue) {
          printLog("===> updateAccessPrivacyInfoStatus(), the gdprPermissionEnumValue can't be null");
          return;
        }
        if (gdprPermissionEnumValue != upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusUnkown && gdprPermissionEnumValue != upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusAccepted && gdprPermissionEnumValue != upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusDefined) {
          printLog("===> updateAccessPrivacyInfoStatus(), the gdprPermissionEnumValue is a wrong type.");
          return;
        }
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.updateAndroidAccessPrivacyInfoStatus(gdprPermissionEnumValue) : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.updateIosAccessPrivacyInfoStatus(gdprPermissionEnumValue));
      },
      getAccessPrivacyInfoStatus: function getAccessPrivacyInfoStatus() {
        loadJsBridgeObject();
        var status = 0;
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? status = this.upltvbridge.getAndroidAccessPrivacyInfoStatus() : cc.sys.os === cc.sys.OS_IOS && (status = this.upltvbridge.getIosAccessPrivacyInfoStatus()));
        return 1 == status ? upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusAccepted : 2 == status ? upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusDefined : upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusUnkown;
      },
      notifyAccessPrivacyInfoStatus: function notifyAccessPrivacyInfoStatus(callback) {
        loadJsBridgeObject();
        if (void 0 == callback || null == callback) {
          printLog("===> notifyAccessPrivacyInfoStatus(), the callback can't be null.");
          return;
        }
        if ("function" != typeof callback) {
          printLog("===> notifyAccessPrivacyInfoStatus(), the callback must be function.");
          return;
        }
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          upltv.GDPRPermissionEnum.functionId = upltv.GDPRPermissionEnum.functionId + 1;
          var callId = upltv.GDPRPermissionEnum.functionId;
          var key = "" + callId;
          ltvMap.put(key, callback);
          var call = "upltv.GDPRPermissionEnum.javaCall";
          cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.notifyAndroidAccessPrivacyInfoStatus(call, callId) : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.notifyIosAccessPrivacyInfoStatus(call, key);
        }
      },
      isEuropeanUnionUser: function isEuropeanUnionUser(callback) {
        loadJsBridgeObject();
        if (void 0 == callback || null == callback) {
          printLog("===> isEuropeanUnionUser(), the callback can't be null.");
          return;
        }
        if ("function" != typeof callback) {
          printLog("===> isEuropeanUnionUser(), the callback must be function.");
          return;
        }
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          upltv.GDPRPermissionEnum.functionId = upltv.GDPRPermissionEnum.functionId + 1;
          var callId = upltv.GDPRPermissionEnum.functionId;
          var key = "" + callId;
          ltvMap.put(key, callback);
          var call = "upltv.GDPRPermissionEnum.javaCall";
          cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.isAndroidEuropeanUnionUser(call, callId) : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.isIosEuropeanUnionUser(call, key);
        }
      },
      isOnlineDebugReportEnable: function isOnlineDebugReportEnable() {
        return (cc.sys.os === cc.sys.OS_ANDROID || cc.sys.os === cc.sys.OS_IOS) && this.upltvbridge.isOnlineDebugReportEnable();
      },
      onlineDebugReport: function onlineDebugReport(callname, msg, cpid) {
        cc.sys.os !== cc.sys.OS_ANDROID && cc.sys.os !== cc.sys.OS_IOS || (functionNames.Function_Receive_Callback == callname ? this.upltvbridge.reportIvokePluginMethodReceive(msg) : functionNames.Function_Reward_WillOpen == callname || (functionNames.Function_Reward_DidOpen == callname ? this.upltvbridge.reportRDShowDid(msg) : functionNames.Function_Reward_DidClick == callname ? this.upltvbridge.reportRDRewardClick(msg) : functionNames.Function_Reward_DidClose == callname ? this.upltvbridge.reportRDRewardClose(msg) : functionNames.Function_Reward_DidGivien == callname ? this.upltvbridge.reportRDRewardGiven(msg) : functionNames.Function_Reward_DidAbandon == callname ? this.upltvbridge.reportRDRewardCancel(msg) : functionNames.Function_Interstitial_Willshow == callname || (functionNames.Function_Interstitial_Didshow == callname ? this.upltvbridge.reportILShowDid(msg, cpid) : functionNames.Function_Interstitial_Didclick == callname ? this.upltvbridge.reportILClick(msg, cpid) : functionNames.Function_Interstitial_Didclose == callname && this.upltvbridge.reportILClose(msg, cpid))));
      },
      isLogOpened: function isLogOpened() {
        if (void 0 != this.upltvbridge && null != this.upltvbridge) {
          if (cc.sys.os === cc.sys.OS_IOS) return this.upltvbridge.isIosLogOpened();
          if (cc.sys.os === cc.sys.OS_ANDROID) return this.upltvbridge.isAndroidLogOpened();
        }
        return false;
      },
      autoOneKeyInspect: function autoOneKeyInspect() {
        printLog("===> called autoOneKeyInspect");
        void 0 != this.upltvbridge && null != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.autoOneKeyInspectByAndroid() : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.autoOneKeyInspectByIos());
      },
      setAppsFlyerUID: function setAppsFlyerUID(uid) {
        loadJsBridgeObject();
        if (0 == arguments.length || void 0 == uid) {
          printLog("===> setAppsFlyerUID(), the uid can't be nil.");
          return;
        }
        if ("string" != typeof uid) {
          printLog("===> setAppsFlyerUID(), the uid must be string type");
          return;
        }
        if ("" == uid) {
          printLog("===> setAppsFlyerUID(), the uid can't be empty");
          return;
        }
        void 0 != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.setAppsFlyerUIDByAndroid(uid) : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.setAppsFlyerUIDByIos(uid));
      },
      setAdjustId: function setAdjustId(ajid) {
        loadJsBridgeObject();
        if (0 == arguments.length || void 0 == ajid) {
          printLog("===> setAdjustId(), the ajid can't be nil.");
          return;
        }
        if ("string" != typeof ajid) {
          printLog("===> setAdjustId(), the ajid must be string type");
          return;
        }
        if ("" == ajid) {
          printLog("===> setAdjustId(), the ajid can't be empty");
          return;
        }
        void 0 != this.upltvbridge && (cc.sys.os === cc.sys.OS_ANDROID ? this.upltvbridge.setAdjustIdByAndroid(ajid) : cc.sys.os === cc.sys.OS_IOS && this.upltvbridge.setAdjustIdByIos(ajid));
      }
    };
    upltv.GDPRPermissionEnum = {
      functionId: 0,
      javaCall: function javaCall(callId, value) {
        var key = "" + callId;
        var call = ltvMap.get(key);
        if (null != call) {
          null != call && "function" == typeof call && call(value);
          ltvMap.remove(key);
        }
      }
    };
    upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusUnkown = 0;
    upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusAccepted = 1;
    upltv.GDPRPermissionEnum.UPAccessPrivacyInfoStatusDefined = 2;
    upltv.AdEventType = {};
    upltv.AdEventType.VIDEO_EVENT_DID_SHOW = 0;
    upltv.AdEventType.VIDEO_EVENT_DID_CLICK = 1;
    upltv.AdEventType.VIDEO_EVENT_DID_CLOSE = 2;
    upltv.AdEventType.VIDEO_EVENT_DID_GIVEN_REWARD = 3;
    upltv.AdEventType.VIDEO_EVENT_DID_ABANDON_REWARD = 4;
    upltv.AdEventType.INTERSTITIAL_EVENT_DID_SHOW = 5;
    upltv.AdEventType.INTERSTITIAL_EVENT_DID_CLICK = 6;
    upltv.AdEventType.INTERSTITIAL_EVENT_DID_CLOSE = 7;
    upltv.AdEventType.BANNER_EVENT_DID_SHOW = 8;
    upltv.AdEventType.BANNER_EVENT_DID_CLICK = 9;
    upltv.AdEventType.BANNER_EVENT_DID_REMOVED = 10;
    upltv.AdEventType.ICON_EVENT_DID_LOAD = 16;
    upltv.AdEventType.ICON_EVENT_DID_LOADFAIL = 17;
    upltv.AdEventType.ICON_EVENT_DID_SHOW = 18;
    upltv.AdEventType.ICON_EVENT_DID_CLICK = 19;
    upltv.AdEventType.VIDEO_EVENT_WILL_SHOW = 20;
    upltv.AdEventType.INTERSTITIAL_EVENT_WILL_SHOW = 21;
    module.exports.upltv = upltv;
    module.exports.bridgeInterface = bridgeInterface;
    cc._RF.pop();
  }, {
    UPLTVAndroid: "UPLTVAndroid",
    UPLTVIos: "UPLTVIos"
  } ],
  UpStarNeedData: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "88221sfy7dCn7po4FlELoKp", "UpStarNeedData");
    "use strict";
    var Utils = require("./../framework/common/UtilsOther");
    var DataBase = require("./DataBase");
    cc.Class({
      extends: DataBase,
      ctor: function ctor() {
        this.fileDir = "config/upStarNeedData";
      },
      initData: function initData(data) {
        if (!data) return;
        this.dataObj = data;
        this.len = this.dataObj.length;
        this.dataObj = Utils.arrayToDict(this.dataObj, "level");
      },
      getUpStarNeedExp: function getUpStarNeedExp(level) {
        var data = this.dataObj[level];
        var exp = data["evolutionMaxExp"];
        return exp;
      },
      getMaxLevel: function getMaxLevel() {
        return this.len;
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/common/UtilsOther": "UtilsOther",
    "./DataBase": "DataBase"
  } ],
  UpdatePanel: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a0b25x2RTFJZob6meKh/2YN", "UpdatePanel");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        progressBar: require("./../framework/ui/ProgressBar"),
        fileProgress: require("./../framework/ui/ProgressBar"),
        byteProgress: require("./../framework/ui/ProgressBar"),
        fileLabel: cc.Label,
        byteLabel: cc.Label,
        info: cc.Label
      }
    });
    cc._RF.pop();
  }, {
    "./../framework/ui/ProgressBar": "ProgressBar"
  } ],
  UpltvHelper: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "41a16DjJLVAI7JimL0iu4o/", "UpltvHelper");
    "use strict";
    var upltv = require("UPLTV").upltv;
    cc.bridgeInterface = require("UPLTV").bridgeInterface;
    var UpltvHelper = cc.Class({
      statics: {
        initUpltv: function initUpltv(cb) {
          var iosZone = 2;
          upltv.initSdk(UPLTV_ANDROID_APPKEY, UPLTV_IOS_APPKEY, iosZone, function(r) {
            cc.log("===> js upltv intSdk result:, %s", r);
            cb && cb(r);
          });
        },
        setloadRdADCb: function setloadRdADCb() {
          upltv.setRewardVideoLoadCallback(function(cpid, msg) {
            cc.log("===> js RewardVideo LoadCallback Success at: %s", cpid);
          }, function(cpid, msg) {
            cc.log("===> js RewardVideo LoadCallback Fail at: %s", cpid);
          });
        },
        loadAndroidAdsByManual: function loadAndroidAdsByManual() {
          cc.bridgeInterface.loadAndroidAdsByManual();
        },
        rdADIsReady: function rdADIsReady() {
          var r = upltv.isRewardReady();
          cc.log("===> js isRewardReady r: %s", r.toString());
          return r;
        },
        rdAdShow: function rdAdShow(rewardPlaceId) {
          upltv.setRewardVideoShowCallback(function(type, cpid) {
            var event = "unkown";
            if (type == upltv.AdEventType.VIDEO_EVENT_DID_SHOW) event = "Did_Show"; else if (type == upltv.AdEventType.VIDEO_EVENT_DID_CLICK) event = "Did_Click"; else if (type == upltv.AdEventType.VIDEO_EVENT_DID_CLOSE) {
              event = "Did_Close";
              zy.AdHelper.resumeGame();
            } else if (type == upltv.AdEventType.VIDEO_EVENT_DID_GIVEN_REWARD) {
              event = "Did_Given_Reward";
              zy.httpProxy.watchAds(rewardPlaceId);
              zy.AdHelper.onOpenAdsReward(rewardPlaceId, true);
            } else if (type == upltv.AdEventType.VIDEO_EVENT_DID_ABANDON_REWARD) {
              event = "Did_Abandon_Reward";
              zy.AdHelper.onOpenAdsReward(rewardPlaceId, false);
            }
            cc.log("===> js RewardVideo Show Callback, event: %s, at: %s", event, cpid);
          });
          var r = upltv.isRewardReady();
          cc.log("===> js isRewardReady r: %s", r);
          if (true == r) {
            cc.log("===> js showRewardVideo call");
            upltv.showRewardVideo(rewardPlaceId);
          }
        },
        showRewardDebugUI: function showRewardDebugUI() {
          upltv.showRewardDebugUI();
        },
        setInterstitialLoadCallback: function setInterstitialLoadCallback(placeId, suc, fail) {
          upltv.setInterstitialLoadCallback(placeId, suc, fail);
        },
        isInterstitialReady: function isInterstitialReady(placeId) {
          var ret = upltv.isInterstitialReady(placeId);
          cc.log("===> js isInterstitialReady ret: %s", ret.toString());
          return ret;
        },
        showInterstitial: function showInterstitial(placeId, cb) {
          upltv.setInterstitialShowCallback(placeId, cb);
          upltv.showInterstitialAd(placeId);
        },
        showInterstitialDebugUI: function showInterstitialDebugUI() {
          upltv.showInterstitialDebugUI();
        }
      }
    });
    zy.UpltvHelper = UpltvHelper;
    cc._RF.pop();
  }, {
    UPLTV: "UPLTV"
  } ],
  UserData: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7336dHaZ0xCkJME+CeR/q9i", "UserData");
    "use strict";
    cc.Class({
      ctor: function ctor() {
        this.lastGotCoinTime = zy.utils.time();
        this.freeCoinsLevel = 1;
        this.hpLevel = 1;
        this.preInterAdLevel = 0;
        this.phPower = zy.constData.PhDefault;
        this.phPowerCounts = zy.constData.MaxPhCounts1Day;
        this.phPowerTime = 0;
        this.phLowTime = 0;
        this.vibOn = true;
        this.guide = 0;
        this.freeCoinsLastTime = zy.utils.time() - zy.constData.FreeCoinsCooling;
        this.freeCoinsNum = zy.constData.FreeCoinsMaxNum;
        this.freeCoinsNum2 = 0;
        this.freeWatchNum = 0;
      },
      saveData: function saveData() {
        var obj = {};
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = void 0;
        try {
          for (var _iterator = Object.keys(this)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var key = _step.value;
            obj[key] = this[key];
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            !_iteratorNormalCompletion && _iterator.return && _iterator.return();
          } finally {
            if (_didIteratorError) throw _iteratorError;
          }
        }
        var data = JSON.stringify(obj);
        cc.sys.localStorage.setItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion, data);
      },
      loadData: function loadData() {
        var data = cc.sys.localStorage.getItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion);
        if (data) {
          data = JSON.parse(data);
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = void 0;
          try {
            for (var _iterator2 = Object.keys(data)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var key = _step2.value;
              this.hasOwnProperty(key) && (this[key] = data[key]);
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              !_iteratorNormalCompletion2 && _iterator2.return && _iterator2.return();
            } finally {
              if (_didIteratorError2) throw _iteratorError2;
            }
          }
        }
      }
    });
    cc._RF.pop();
  }, {} ],
  UtilsOther: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "f2c591y/+FA+qi5S+TkWGGf", "UtilsOther");
    "use strict";
    var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    var Md5 = require("./../encrypt/Md5");
    var CSVParser = require("./CSVParser");
    var UtilsOther = UtilsOther || {};
    UtilsOther.arrayRmObj = function(arr, obj) {
      var index = arr.indexOf(obj);
      arr.splice(index, 1);
    };
    UtilsOther.arrayPopByIdx = function(array, idx) {
      var item = array[idx];
      array.splice(idx, 1);
      return item;
    };
    UtilsOther.valueInArray = function(arr, value) {
      var len = arr.length;
      for (var i = 0; i < len; i++) if (arr[i] == value) return true;
      return false;
    };
    UtilsOther.arrayRandomValue = function(arr) {
      var num = arr.length;
      if (num <= 0) return null;
      var idx = UtilsOther.randomInteger(0, num - 1);
      return arr[idx];
    };
    UtilsOther.shuffle = function(arr) {
      var i = void 0, j = void 0, temp = void 0;
      for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    };
    UtilsOther.clearArrayValue = function(array, length, value) {
      for (var i = 0; i < length; i++) array[i] = value;
    };
    UtilsOther.createObjectWithArray = function(array, value) {
      var object = {};
      for (var i in array) object[array[i]] = value;
      return object;
    };
    UtilsOther.arrayToDict = function(array, key) {
      var dict = {};
      var data = null;
      for (var i in array) {
        data = array[i];
        dict[data[key]] = data;
      }
      return dict;
    };
    UtilsOther.dictToArray = function(dict) {
      var array = [];
      for (var key in dict) dict.hasOwnProperty(key) && dict[key] && array.push(dict[key]);
      return array;
    };
    UtilsOther.objectToArrayExcludeNumber = function(obj, opt_arr, opt_exclude) {
      var tempArr = void 0;
      tempArr = isArray(opt_arr) ? opt_arr : [];
      var key = void 0;
      if (isNumber(opt_exclude)) {
        var temp = opt_exclude.toString();
        for (key in obj) obj.hasOwnProperty(key) && obj[key] && temp != key && tempArr.push(obj[key]);
      } else for (key in obj) obj.hasOwnProperty(key) && obj[key] && tempArr.push(obj[key]);
      return tempArr;
    };
    UtilsOther.splitWithValueType = function(str, valueType, separator) {
      void 0 === separator && (separator = ",");
      var arr = str.split(separator);
      arr.forEach(function(currentValue, index, array) {
        try {
          array[index] = valueType(currentValue);
        } catch (e) {
          array[index] = null;
        }
      });
      return arr;
    };
    UtilsOther.time = function() {
      return parseInt(Date.now() / 1e3);
    };
    UtilsOther.time2second = function(year, month, day, hour, minute, second) {
      var date = new Date(year, month - 1, day, hour, minute, second);
      var n = date.getTime();
      return parseInt(n / 1e3);
    };
    UtilsOther.getTimeAfterDays = function(time, days) {
      cc.assert(time, "getTimeForDayAfterDays:time is null!");
      var date = null;
      date = cc.isNumber(time) ? new Date(1e3 * time) : new Date(time);
      return new Date(date.getTime() + 24 * days * 60 * 60 * 1e3);
    };
    UtilsOther.getDaysDiff = function(dateStart, dateEnd) {
      cc.assert(dateStart && dateEnd, "getDaysDiff: date must be not null!");
      var iDays;
      dateStart = UtilsOther.isNumber(dateStart) ? new Date(1e3 * dateStart) : new Date(dateStart);
      dateEnd = UtilsOther.isNumber(dateEnd) ? new Date(1e3 * dateEnd) : new Date(dateEnd);
      var strDateS = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate());
      var strDateE = new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate());
      iDays = parseInt(Math.abs(strDateE - strDateS) / 1e3 / 60 / 60 / 24);
      iDays *= strDateE >= strDateS ? 1 : -1;
      return iDays;
    };
    UtilsOther.getTimeForDay = function(date) {
      date = date ? cc.isNumber(date) ? new Date(1e3 * date) : new Date(date) : new Date();
      var year = date.getFullYear();
      var month = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
      var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
      var dateStr = year + "-" + month + "-" + day;
      return dateStr;
    };
    UtilsOther.formatTime = function(s) {
      var t = void 0;
      if (s >= 0) {
        var hour = Math.floor(s / 3600);
        var min = Math.floor(s / 60) % 60;
        var sec = s % 60;
        var day = parseInt(hour / 24);
        if (1 == day) return day + " day";
        if (day > 1) return day + " days";
        if (day > 0) {
          hour -= 24 * day;
          t = day + "day " + ("00" + hour).slice(-2) + ":";
        } else t = hour > 0 ? ("00" + hour).slice(-2) + ":" : "";
        min < 10 && (t += "0");
        t += min + ":";
        sec < 10 && (t += "0");
        t += parseInt(sec);
      }
      return t;
    };
    UtilsOther.getThousandSeparatorString = function(number) {
      var str = number.toString().split("").reverse().join("").replace(/(\d{3}(?=\d)(?!\d+\.|$))/g, "$1,").split("").reverse().join("");
      var dot = str.indexOf(".");
      dot >= 0 && (str = str.substring(0, dot + 2));
      return str;
    };
    UtilsOther.getKMBString = function(number) {
      if (!this.isNumber(number)) return number;
      if (number / 1e9 >= 1) return this.getThousandSeparatorString(number / 1e9) + "B";
      if (number / 1e6 >= 1) return this.getThousandSeparatorString(number / 1e6) + "M";
      if (number / 1e4 >= 1) return this.getThousandSeparatorString(number / 1e3) + "K";
      return this.getThousandSeparatorString(number);
    };
    UtilsOther.getLastCutOffDay = function(current, cutOff) {
      var time = cutOff - current;
      if (time < 0) return -1;
      time = parseInt(time / 86400);
      return time;
    };
    UtilsOther._dumpObject = function(prefix, o, depth, extraBlank, _ignore_function_member, max_depth) {
      if (UtilsOther.D(max_depth) && depth > max_depth) return;
      function printWithDepth(txt, depth, extraBlank) {
        while (depth > 0) {
          txt = "  " + txt;
          --depth;
        }
        if (extraBlank > 0) {
          var _blanks = "";
          var i = void 0;
          for (i = 0; i < extraBlank; ++i) _blanks += " ";
          txt = _blanks + txt;
        }
        cc.log(txt);
      }
      function getFuncDescriptor(f) {
        return f.toString().replace(/function\s?/im, "").split(")")[0] + ")";
      }
      var type = Object.prototype.toString.call(o).slice(8, -1);
      var t = void 0;
      var neb = void 0;
      var npfx = void 0;
      var len = void 0;
      var blanks = void 0;
      switch (type) {
       case "Number":
       case "String":
        t = '"' + o.toString() + '"';
        prefix && (t = prefix + t);
        printWithDepth(t, depth, extraBlank);
        break;

       case "Undefined":
        t = "UNDEFINED!";
        prefix && (t = prefix + t);
        printWithDepth(t, depth, extraBlank);
        break;

       case "Boolean":
        t = o.toString();
        prefix && (t = prefix + t);
        printWithDepth(t, depth, extraBlank);
        break;

       case "Object":
        t = "{";
        prefix && (t = prefix + t);
        printWithDepth(t, depth, extraBlank);
        var prop = void 0;
        for (prop in o) {
          if (!o.hasOwnProperty(prop)) continue;
          npfx = '"' + prop + '" : ';
          neb = (prefix ? prefix.length : 0) - 2 + extraBlank;
          _dumpObject(npfx, o[prop], depth + 1, neb, _ignore_function_member, max_depth);
        }
        len = prefix ? prefix.length : 0;
        t = "}";
        if (len > 0) {
          blanks = "";
          var i1 = void 0;
          for (i1 = 0; i1 < len; ++i1) blanks += " ";
          t = blanks + t;
        }
        printWithDepth(t, depth, extraBlank);
        break;

       case "Array":
        t = "[";
        prefix && (t = prefix + t);
        printWithDepth(t, depth, extraBlank);
        var i2 = void 0;
        for (i2 = 0; i2 < o.length; ++i2) {
          npfx = i2 + " : ";
          neb = (prefix ? prefix.length : 0) - 2 + extraBlank;
          _dumpObject(npfx, o[i2], depth + 1, neb, _ignore_function_member, max_depth);
        }
        len = prefix ? prefix.length : 0;
        t = "]";
        if (len > 0) {
          blanks = "";
          var i = void 0;
          for (i = 0; i < len; ++i) blanks += " ";
          t = blanks + t;
        }
        printWithDepth(t, depth, extraBlank);
        break;

       case "Function":
        if (!_ignore_function_member) {
          t = getFuncDescriptor(o);
          prefix && (t = prefix + t);
          printWithDepth(t, depth, extraBlank);
        }
      }
    };
    UtilsOther.dumpObject = function(o, _ignore_function_member, max_depth) {
      UtilsOther._dumpObject(void 0, o, 0, 0, _ignore_function_member || false, max_depth);
    };
    UtilsOther.D = function(obj) {
      return void 0 !== obj;
    };
    UtilsOther.DNN = function(obj) {
      return void 0 !== obj && null !== obj;
    };
    UtilsOther.isFunction = function(obj) {
      return "function" === typeof obj;
    };
    UtilsOther.isNumber = function(obj) {
      return "number" === typeof obj || "[object Number]" === Object.prototype.toString.call(obj);
    };
    UtilsOther.isString = function(obj) {
      return "string" === typeof obj || "[object String]" === Object.prototype.toString.call(obj);
    };
    UtilsOther.isArray = function(obj) {
      return Array.isArray(obj) || "object" === ("undefined" === typeof obj ? "undefined" : _typeof(obj)) && "[object Array]" === Object.prototype.toString.call(obj);
    };
    UtilsOther.isUndefined = function(obj) {
      return void 0 === obj;
    };
    UtilsOther.isObject = function(obj) {
      return "object" === ("undefined" === typeof obj ? "undefined" : _typeof(obj)) && "[object Object]" === Object.prototype.toString.call(obj);
    };
    UtilsOther.isEmpty = function(obj) {
      return Array.isArray(obj) && 0 === obj.length || Object.prototype.isPrototypeOf(obj) && 0 === Object.keys(obj).length;
    };
    UtilsOther.isBoolean = function(obj) {
      return true === obj || false === obj || "[object Boolean]" === Object.prototype.toString.call(obj);
    };
    UtilsOther.clone = function(obj, newObj) {
      newObj || (newObj = obj.constructor ? new obj.constructor() : {});
      var key = void 0;
      var copy = void 0;
      for (key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        copy = obj[key];
        "object" === ("undefined" === typeof copy ? "undefined" : _typeof(copy)) && copy ? newObj[key] = UtilsOther.clone(copy, null) : newObj[key] = copy;
      }
      return newObj;
    };
    UtilsOther.getStringFromFile = function(fileName) {
      if (cc.sys.isNative) return jsb.fileUtils.getStringFromFile(fileName);
      var _loadTxtSync = function(url) {
        if (cc._isNodeJs) {
          var fs = require("fs");
          return fs.readFileSync(url).toString();
        }
        var xhr = this.getXMLHttpRequest();
        xhr.timeout = 0;
        xhr.open("GET", url, false);
        /msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent) ? xhr.setRequestHeader("Accept-Charset", "utf-8") : xhr.overrideMimeType && xhr.overrideMimeType("text/plain; charset=utf-8");
        xhr.send(null);
        if (4 === !xhr.readyState || 200 !== xhr.status) return null;
        return xhr.responseText;
      }.bind(cc.loader);
      return _loadTxtSync(fileName);
    };
    UtilsOther.getSegmentsInter = function(a, b, c, d) {
      var nx1 = b.y - a.y, ny1 = a.x - b.x;
      var nx2 = d.y - c.y, ny2 = c.x - d.x;
      var denominator = nx1 * ny2 - ny1 * nx2;
      if (0 == denominator) return false;
      var distC_N2 = nx2 * c.x + ny2 * c.y;
      var distA_N2 = nx2 * a.x + ny2 * a.y - distC_N2;
      var distB_N2 = nx2 * b.x + ny2 * b.y - distC_N2;
      if (distA_N2 * distB_N2 >= 0) return false;
      var distA_N1 = nx1 * a.x + ny1 * a.y;
      var distC_N1 = nx1 * c.x + ny1 * c.y - distA_N1;
      var distD_N1 = nx1 * d.x + ny1 * d.y - distA_N1;
      if (distC_N1 * distD_N1 >= 0) return false;
      var fraction = distA_N2 / denominator;
      var dx = fraction * ny1, dy = -fraction * nx1;
      return {
        x: a.x + dx,
        y: a.y + dy
      };
    };
    UtilsOther.getDistance = function(vec1, vec2) {
      var d = Math.sqrt(Math.pow(vec2.x - vec1.x, 2) + Math.pow(vec2.y - vec1.y, 2));
      return d;
    };
    UtilsOther.loadRemoteImg = function(url, callback) {
      if (cc.sys.isBrowser) {
        cc.log("Remote img load web");
        cc.loader.load(url, function(progress) {
          cc.log("Remote img load progress:" + progress);
        }, function(error, tex) {
          if (error) {
            cc.log("Remote img load error:" + error);
            return;
          }
          cc.log("Remote img load success.");
          callback(tex);
        });
        return;
      }
      cc.log("Remote img load: native");
      var dirpath = jsb.fileUtils.getWritablePath() + "img/";
      var filepath = dirpath + Md5.md5_hex(url) + ".png";
      function loadEnd() {
        cc.loader.load(filepath, function(err, tex) {
          err ? cc.error(err) : callback(tex);
        });
      }
      if (jsb.fileUtils.isFileExist(filepath)) {
        cc.log("Remote is find" + filepath);
        loadEnd();
        return;
      }
      var saveFile = function saveFile(data) {
        cc.log("undefined" === typeof data ? "undefined" : _typeof(data));
        cc.log(data);
        var b = new Uint8Array(data);
        cc.log("undefined" === typeof b ? "undefined" : _typeof(b));
        cc.log(b.length);
        if ("undefined" !== typeof data) {
          jsb.fileUtils.isDirectoryExist(dirpath) || jsb.fileUtils.createDirectory(dirpath);
          cc.log("111111" + filepath);
          if (jsb.fileUtils.writeDataToFile(new Uint8Array(data), filepath)) {
            cc.log("Remote img save succeed.");
            cc.log("22222");
            loadEnd();
          } else cc.log("Remote img save failed.");
        } else cc.log("Remote img download failed.");
      };
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        cc.log("xhr.readyState  " + xhr.readyState);
        cc.log("xhr.status  " + xhr.status);
        if (4 === xhr.readyState) if (200 === xhr.status) {
          xhr.responseType = "arraybuffer";
          saveFile(xhr.response);
        } else saveFile(null);
      }.bind(this);
      xhr.open("GET", url, true);
      xhr.send();
    };
    UtilsOther.checkTouchIsHit = function(touchPoint, node) {
      return cc.rectContainsPoint(node.getBoundingBoxToWorld(), touchPoint);
    };
    UtilsOther.createCliper = function(spriteName) {
      var stencil = new cc.Sprite(spriteName);
      var clippingNode = new cc.ClippingNode();
      clippingNode.attr({
        stencil: stencil,
        anchorX: .5,
        anchorY: .5,
        alphaThreshold: .8
      });
      return clippingNode;
    };
    UtilsOther.convertBoundingBoxToWorld = function(node) {
      if (!node) return cc.rect();
      var leftBottom = node.convertToWorldSpace(cc.p());
      var rightTop = node.convertToWorldSpace(cc.pFromSize(node.getContentSize()));
      return cc.rect(leftBottom.x, leftBottom.y, rightTop.x - leftBottom.x, rightTop.y - leftBottom.y);
    };
    UtilsOther.getPositionByAnchor = function(node, anchorPoint) {
      if (!node) return cc.p();
      var bounding = node.getBoundingBox();
      bounding.x += bounding.width * anchorPoint.x;
      bounding.y += bounding.height * anchorPoint.y;
      return cc.p(bounding.x, bounding.y);
    };
    UtilsOther.runShakeAction = function(node, range, times) {
      node.runAction(cc.repeat(cc.sequence(cc.moveBy(.02, cc.p(0, range)), cc.moveBy(.04, cc.p(0, 2 * -range)), cc.moveBy(.02, cc.p(0, range))), times));
    };
    UtilsOther.randomByWeight = function(array, keyForWeight) {
      if (!UtilsOther.isArray(array) || !UtilsOther.isString(keyForWeight)) return null;
      var sumWeight = 0;
      sumWeight = array.reduce(function(sumSoFar, item) {
        sumSoFar += item[keyForWeight];
        return sumSoFar;
      }, sumWeight);
      cc.log("sumWeight:" + sumWeight);
      var tempWeight = 0;
      var randomValue = Math.random() * sumWeight;
      var value = null;
      for (var i in array) {
        value = array[i];
        tempWeight += value[keyForWeight];
        if (randomValue < tempWeight) return value;
      }
      return value;
    };
    UtilsOther.randomInteger = function(min, max) {
      var range = Math.round((max - min) * Math.random());
      return min + range;
    };
    UtilsOther.parse = function(str, options) {
      var parser = new CSVParser(str, options);
      var all = [];
      while (parser.hasNext()) {
        var ar = parser.nextRow();
        all.push(ar);
      }
      return all;
    };
    UtilsOther.parseOneLine = function(str, options) {
      var parser = new CSVParser(str, options);
      var all = [];
      while (parser.hasNext()) {
        var ar = parser.nextRow();
        all.push(ar);
      }
      if (all.length <= 1) return all[0];
      return all;
    };
    UtilsOther.bindColumns = function(rows, colnames, isParseNumber) {
      colnames || (colnames = rows.shift());
      return rows.map(function(row) {
        var obj = {};
        for (var i = 0; i < row.length; i++) obj[colnames[i]] = isParseNumber ? isNaN(row[i]) ? row[i] : Number(row[i]) : row[i];
        return obj;
      });
    };
    UtilsOther.bindColumnsSimple = function(rows, colnames) {
      colnames || (colnames = rows.shift());
      return rows.map(function(row) {
        var obj = {};
        for (var i = 0; i < row.length; i++) obj[colnames[i]] = CSV.parseOneSimple(row[i]);
        return obj;
      });
    };
    module.exports = UtilsOther;
    cc._RF.pop();
  }, {
    "./../encrypt/Md5": "Md5",
    "./CSVParser": "CSVParser",
    fs: void 0
  } ],
  en: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "920c5VLzJxKjYCAoIUwUHym", "en");
    "use strict";
    module.exports = {
      short_coins: "Shortage of starcores",
      no_ad: "No advertising",
      time_error: "Local time error",
      max_counts: "Insufficient number of collections",
      max_level: "Already maximum level",
      net_error: "Network Error",
      start: "START",
      up_star: "Turret Evolution",
      dmg: "DMG",
      need_two: "Please build two new weapons, use oh",
      short_time: "Insufficient time",
      counts_remain: "Remaining today: ",
      sound: "Sounds",
      vibrate: "Vibration",
      ph_get: "Get",
      collect: "Collect",
      revive: "Revive",
      tip_free_coins_max: "Reached max number",
      btn_ok: "OK",
      btn_cancle: "Cancle"
    };
    cc._RF.pop();
  }, {} ],
  i18n: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "93789C/shtIL6entYsZPjee", "i18n");
    "use strict";
    var Polyglot = require("polyglot");
    var lang = cc.sys.language;
    cc.log("====lang: ", lang);
    "zh" !== lang && (lang = "en");
    var data = require(lang);
    var polyglot = new Polyglot({
      phrases: data,
      allowMissing: true
    });
    module.exports = {
      init: function init(language) {
        lang = language;
        data = require(lang);
        polyglot.replace(data);
      },
      t: function t(key, opt) {
        return polyglot.t(key, opt);
      }
    };
    cc._RF.pop();
  }, {
    polyglot: "polyglot"
  } ],
  polyglot: [ function(require, module, exports) {
    (function(global) {
      "use strict";
      cc._RF.push(module, "69decSgpRlE1rzEKp0RzG3V", "polyglot");
      "use strict";
      var _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function(obj) {
        return typeof obj;
      } : function(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      (function(root, factory) {
        "function" === typeof define && define.amd ? define([], function() {
          return factory(root);
        }) : "object" === ("undefined" === typeof exports ? "undefined" : _typeof(exports)) ? module.exports = factory(root) : root.Polyglot = factory(root);
      })("undefined" !== typeof global ? global : void 0, function(root) {
        var replace = String.prototype.replace;
        function Polyglot(options) {
          options = options || {};
          this.phrases = {};
          this.extend(options.phrases || {});
          this.currentLocale = options.locale || "en";
          this.allowMissing = !!options.allowMissing;
          this.warn = options.warn || warn;
        }
        Polyglot.VERSION = "1.0.0";
        Polyglot.prototype.locale = function(newLocale) {
          newLocale && (this.currentLocale = newLocale);
          return this.currentLocale;
        };
        Polyglot.prototype.extend = function(morePhrases, prefix) {
          var phrase;
          for (var key in morePhrases) if (morePhrases.hasOwnProperty(key)) {
            phrase = morePhrases[key];
            prefix && (key = prefix + "." + key);
            "object" === ("undefined" === typeof phrase ? "undefined" : _typeof(phrase)) ? this.extend(phrase, key) : this.phrases[key] = phrase;
          }
        };
        Polyglot.prototype.unset = function(morePhrases, prefix) {
          var phrase;
          if ("string" === typeof morePhrases) delete this.phrases[morePhrases]; else for (var key in morePhrases) if (morePhrases.hasOwnProperty(key)) {
            phrase = morePhrases[key];
            prefix && (key = prefix + "." + key);
            "object" === ("undefined" === typeof phrase ? "undefined" : _typeof(phrase)) ? this.unset(phrase, key) : delete this.phrases[key];
          }
        };
        Polyglot.prototype.clear = function() {
          this.phrases = {};
        };
        Polyglot.prototype.replace = function(newPhrases) {
          this.clear();
          this.extend(newPhrases);
        };
        Polyglot.prototype.t = function(key, options) {
          var phrase, result;
          options = null == options ? {} : options;
          "number" === typeof options && (options = {
            smart_count: options
          });
          if ("string" === typeof this.phrases[key]) phrase = this.phrases[key]; else if ("string" === typeof options._) phrase = options._; else if (this.allowMissing) phrase = key; else {
            this.warn('Missing translation for key: "' + key + '"');
            result = key;
          }
          if ("string" === typeof phrase) {
            options = clone(options);
            result = choosePluralForm(phrase, this.currentLocale, options.smart_count);
            result = interpolate(result, options);
          }
          return result;
        };
        Polyglot.prototype.has = function(key) {
          return key in this.phrases;
        };
        var delimeter = "||||";
        var pluralTypes = {
          chinese: function chinese(n) {
            return 0;
          },
          german: function german(n) {
            return 1 !== n ? 1 : 0;
          },
          french: function french(n) {
            return n > 1 ? 1 : 0;
          },
          russian: function russian(n) {
            return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
          },
          czech: function czech(n) {
            return 1 === n ? 0 : n >= 2 && n <= 4 ? 1 : 2;
          },
          polish: function polish(n) {
            return 1 === n ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
          },
          icelandic: function icelandic(n) {
            return n % 10 !== 1 || n % 100 === 11 ? 1 : 0;
          }
        };
        var pluralTypeToLanguages = {
          chinese: [ "fa", "id", "ja", "ko", "lo", "ms", "th", "tr", "zh" ],
          german: [ "da", "de", "en", "es", "fi", "el", "he", "hu", "it", "nl", "no", "pt", "sv" ],
          french: [ "fr", "tl", "pt-br" ],
          russian: [ "hr", "ru" ],
          czech: [ "cs", "sk" ],
          polish: [ "pl" ],
          icelandic: [ "is" ]
        };
        function langToTypeMap(mapping) {
          var type, langs, l, ret = {};
          for (type in mapping) if (mapping.hasOwnProperty(type)) {
            langs = mapping[type];
            for (l in langs) ret[langs[l]] = type;
          }
          return ret;
        }
        var trimRe = /^\s+|\s+$/g;
        function trim(str) {
          return replace.call(str, trimRe, "");
        }
        function choosePluralForm(text, locale, count) {
          var ret, texts, chosenText;
          if (null != count && text) {
            texts = text.split(delimeter);
            chosenText = texts[pluralTypeIndex(locale, count)] || texts[0];
            ret = trim(chosenText);
          } else ret = text;
          return ret;
        }
        function pluralTypeName(locale) {
          var langToPluralType = langToTypeMap(pluralTypeToLanguages);
          return langToPluralType[locale] || langToPluralType.en;
        }
        function pluralTypeIndex(locale, count) {
          return pluralTypes[pluralTypeName(locale)](count);
        }
        var dollarRegex = /\$/g;
        var dollarBillsYall = "$$$$";
        function interpolate(phrase, options) {
          for (var arg in options) if ("_" !== arg && options.hasOwnProperty(arg)) {
            var replacement = options[arg];
            "string" === typeof replacement && (replacement = replace.call(options[arg], dollarRegex, dollarBillsYall));
            phrase = replace.call(phrase, new RegExp("%\\{" + arg + "\\}", "g"), replacement);
          }
          return phrase;
        }
        function warn(message) {
          root.console && root.console.warn && root.console.warn("WARNING: " + message);
        }
        function clone(source) {
          var ret = {};
          for (var prop in source) ret[prop] = source[prop];
          return ret;
        }
        return Polyglot;
      });
      cc._RF.pop();
    }).call(this, "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {} ],
  zh: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "87f1fs0gohHDIfNg4aePXbt", "zh");
    "use strict";
    module.exports = {
      hero_yoke_heroInfo: "\u540c\u65f6\u4e0a\u9635\u6b66\u5c06\u5747\u8fbe\u5230%{num}\u661f",
      hero_yoke_treasureInfo_1: "%{num}\u661f%{hero}",
      hero_yoke_treasureInfo_3: "%{star}\u661f%{treasure}",
      conquest_level_node_tips: "\u5173\u5361%{level}\u672a\u89e3\u9501",
      conquest_tower_unlock: "\u901a\u8fc7\u5173\u5361%{level}\u5f00\u542f\u70fd\u706b\u53f0",
      short_coins: "\u91d1\u5e01\u4e0d\u8db3",
      no_ad: "\u6ca1\u6709\u53ef\u7528\u5e7f\u544a",
      time_error: "\u672c\u673a\u65f6\u95f4\u9519\u8bef",
      max_counts: "\u9886\u53d6\u6b21\u6570\u6700\u5927\u503c",
      max_level: "\u5df2\u8fbe\u5230\u6700\u5927\u7b49\u7ea7",
      net_error: "\u7f51\u7edc\u9519\u8bef",
      start: "\u5f00\u59cb\u6e38\u620f",
      up_star: "\u70ae\u5854\u5347\u661f",
      dmg: "\u706b\u529b",
      need_two: "\u8bf7\u8fd4\u56de\u4e3b\u754c\u9762\u518d\u5efa\u9020\u4e00\u4e2a\u70ae\u5854",
      short_time: "\u5269\u4f59\u53ef\u7528\u65f6\u95f4\u4e0d\u8db3",
      counts_remain: "\u4eca\u65e5\u5269\u4f59\u6b21\u6570: ",
      sound: "\u97f3\u4e50\u97f3\u6548",
      vibrate: "\u5c04\u51fb\u9707\u52a8",
      ph_get: "\u514d\u8d39",
      collect: "\u6536\u96c6",
      revive: "\u590d\u6d3b\u7ee7\u7eed",
      tip_free_coins_max: "\u5f53\u65e5\u9886\u53d6\u5df2\u8fbe\u6700\u5927\u6b21\u6570",
      btn_ok: "\u786e\u5b9a",
      btn_cancle: "\u53d6\u6d88"
    };
    cc._RF.pop();
  }, {} ]
}, {}, [ "ClientConfig", "NodePoolMng", "BgColorData", "ConstData", "DataBase", "DataMng", "EnemyAttrData", "UpStarNeedData", "UserData", "Alert", "Audio", "ButtonSafe", "CSVParser", "CornerMng", "Device", "Director", "Guide", "ImageLoader", "Loading", "ShaderUtils", "Tip", "Turning", "UI", "UtilsOther", "Algo", "Encrypt", "Md5", "en", "zh", "i18n", "polyglot", "GameHttp", "HttpProxy", "GameNetwork", "GameProtocols", "GameWebSocket", "NetProxy", "AFLogger", "AdHelper", "FBLogger", "LoggerHelper", "OpenAdsHelper", "PlatformUtils", "RangerLogger", "TrackingLogger", "UPLTV", "UPLTVAndroid", "UPLTVIos", "UpltvHelper", "Button", "Label", "LabelInteger", "ListView", "Node", "PopBase", "ProgressBar", "ProgressCircle", "Sprite", "SwitchControl", "HotUpdate", "UpdatePanel", "MapCtrl", "MapScrollView", "DebugPop", "SettingPop", "InitScene", "MapScene", "TestScene" ]);
//# sourceMappingURL=project.dev.js.map
