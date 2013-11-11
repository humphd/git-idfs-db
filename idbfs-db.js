function dirname(path) {
  var index = path.lastIndexOf("/");
  if (index < 0) return ".";
  if (index === 0) return "/";
  return path.substr(0, index);
}

module.exports = function (platform) {
  var isHash = /^[a-z0-9]{40}$/,
      fs;

  function idbfsDb(fs) {
    var inflate = platform.inflate,
        deflate = platform.deflate;

    function get(key, callback) {
      if (!callback) return get.bind(this, key);
      if (isHash.test(key)) {
        return fs.readFile(hashToPath(key), function (err, deflated) {
          if (err) return callback(err);
          return inflate(deflated, callback);
        });
      }
      return fs.readFile(key, "utf8", callback);
    }

    function set(key, value, callback) {
      if (!callback) return set.bind(this, key, value);
      if (isHash.test(key)) {
        return deflate(value, function (err, deflated) {
          if (err) return callback(err);
          return write(hashToPath(key), deflated, callback);
        });
      }
      return write(key, value, "utf8", callback);
    }

    function write(path, data, callback) {
      return mkdirp(dirname(path), function (err) {
        if (err) return callback(err);
        return fs.write(path, data)(callback);
      });
    }

    function del(key, callback) {
      if (!callback) return del.bind(this, key);
      if (isHash.test(key)) {
        return unlink(hashToPath(key), callback);
      }
      return unlink(key, callback);
    }

    function unlink(path, callback) {
      fs.unlink(path, function (err) {
        if (err) return callback(err);
        clean(dirname(path));
      });
      function clean(dir) {
        if (dir.length <= 1) return callback();
        return fs.rmdir(dir, function (err) {
          if (!err) return clean(dirname(dir));
          if (err.name === "ENotEmpty" || err.name === "ENoEntry") {
            return callback();
          }
          return callback(err);
        });
      }
    }

    function has(key, callback) {
      if (!callback) return has.bind(this, key);
      function onStat(err) {
        if (err) {
          if (err.name === "ENoEntry") return callback();
          return callback(err);
        }
        return callback(null, true);
      }
      if (isHash.test(key)) {
        return fs.stat(hashToPath(key), onStat);
      }
      return fs.stat(key, onStat);
    }

    function keys(prefix, callback) {
      if (!callback) return keys.bind(this, prefix);
      return fs.readdir(prefix || "/", callback);
    }

    function hashToPath(hash) {
      return "objects/" + hash.substr(0, 2) + "/" + hash.substr(2);
    }

    function mkdirp(path, callback) {
      fs.mkdir(path, function (err) {
        if (!err || err.name === "EExists") return callback();
        if (err.name === "ENoEntry") {
          return mkdirp(dirname(path), function (err) {
            if (err) return callback(err);
            mkdirp(path, callback);
          });
        }
        return callback(err);
      });
    }

    function init(callback) {
      if (!callback) return init.bind(this);
      var fs = new IDBFS.FilesSystem("local");
      callback();
    }

    function clear(callback) {
      if (!callback) return clear.bind(this);
      indexedDB.deleteDatabase("local");
      fs = null;
      callback();
    }

    return {
      get: get,
      set: set,
      has: has,
      del: del,
      keys: keys,
      init: init,
      clear: clear
    };
  }

 return idbfsDb;
};
