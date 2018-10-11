'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = error;

var _babelErrors = require('babel-errors');

function error(path, message) {
  var err = (0, _babelErrors.buildCodeFrameError)(path, message);
  err.stack = (0, _babelErrors.toErrorStack)(err);
  return err;
}