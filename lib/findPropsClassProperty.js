'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = findPropsClassProperty;


function isPropsClassProperty(path) {
  return path.isClassProperty() && !path.node.computed && !path.node.static && path.node.key.name === 'props';
}
function findPropsClassProperty(classBody) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = classBody.get('body')[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var item = _step.value;

      if (isPropsClassProperty(item)) {
        return item;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return false;
}