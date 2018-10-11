'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = matchExported;

var _babelExplodeModule = require('babel-explode-module');

var _babelHelperSimplifyModule = require('babel-helper-simplify-module');

var _babelLog = require('babel-log');

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function matchExported(file, exportName) {
  var exploded = (0, _babelExplodeModule.explodeModule)(file.path.node);
  var statements = (0, _babelHelperSimplifyModule.explodedToStatements)(exploded);

  var program = Object.assign({}, file.path.node, {
    body: statements
  });

  file.path.replaceWith(program);

  var match = exploded.exports.find(function (item) {
    return item.external === exportName;
  });

  if (!match) {
    return null;
  }

  var local = match.local;

  if (!local) {
    return null;
  }

  var statement = file.path.get('body').find(function (item) {
    if (!item.isDeclaration()) return false;

    var id = null;

    if (item.isVariableDeclaration()) {
      id = item.node.declarations[0].id;
    } else if (item.isImportDeclaration()) {
      id = item.node.specifiers[0].local;
    } else if (item.node.id) {
      id = item.node.id;
    } else {
      throw (0, _error2.default)(item, 'Unexpected node:\n\n' + (0, _babelLog.format)(item));
    }

    if (!id) {
      throw new Error('Couldn\'t find id on node:\n\n' + (0, _babelLog.format)(item));
    }

    return id.name === local;
  });

  return statement || null;
}