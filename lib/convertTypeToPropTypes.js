'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = convertTypeToPropTypes;

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

var _babelLog = require('babel-log');

var _babelFileLoader = require('babel-file-loader');

var _matchExported = require('./matchExported');

var _matchExported2 = _interopRequireDefault(_matchExported);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _babelFlowIdentifiers = require('babel-flow-identifiers');

var _babelFlowScope = require('babel-flow-scope');

var _babelExplodeModule = require('babel-explode-module');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function cloneComments(comments) {
  return comments && comments.map(function (comment) {
    comment = t.clone(comment);
    comment.start = comment.start + 0.0001; // Force printer to print... (sigh)
    return comment;
  });
}

function inheritsComments(a, b) {
  return t.inheritsComments(a, {
    trailingComments: cloneComments(b.trailingComments),
    leadingComments: cloneComments(b.leadingComments),
    innerComments: cloneComments(b.innerComments)
  });
}

function isLiteralTypeAnnotation(node) {
  return t.isStringLiteralTypeAnnotation(node) || t.isBooleanLiteralTypeAnnotation(node) || t.isNumericLiteralTypeAnnotation(node) || t.isVoidTypeAnnotation(node) || t.isNullLiteralTypeAnnotation(node);
}

function isObjectValue(path) {
  return path.parent.type === 'ObjectTypeProperty' && path.parentKey === 'value';
}

function typeToValue(node) {
  var value = void 0;

  if (t.isVoidTypeAnnotation(node)) {
    value = undefined;
  } else if (t.isNullLiteralTypeAnnotation(node)) {
    value = null;
  } else {
    value = node.value;
  }

  return t.valueToNode(value);
}

var refPropTypes = function refPropTypes(property, opts) {
  return t.memberExpression(opts.getPropTypesRef(), property);
};

var createThrows = function createThrows(message) {
  return function (path, opts, context) {
    throw (0, _error2.default)(path, message);
  };
};

var createConversion = function createConversion(name) {
  return function (path, opts, context) {
    return refPropTypes(t.identifier(name), opts);
  };
};

var convertLiteral = function convertLiteral(path, opts, context) {
  var arr = t.arrayExpression([typeToValue(path.node)]);
  return t.callExpression(refPropTypes(t.identifier('oneOf'), opts), [arr]);
};

var converters = {};

converters.AnyTypeAnnotation = createConversion('any');
converters.MixedTypeAnnotation = createConversion('any');
converters.NumberTypeAnnotation = createConversion('number');
converters.NumericLiteralTypeAnnotation = convertLiteral;
converters.BooleanTypeAnnotation = createConversion('bool');
converters.BooleanLiteralTypeAnnotation = convertLiteral;
converters.StringTypeAnnotation = createConversion('string');
converters.StringLiteralTypeAnnotation = convertLiteral;
converters.NullLiteralTypeAnnotation = convertLiteral;
converters.VoidTypeAnnotation = convertLiteral;
converters.FunctionTypeAnnotation = createConversion('func');
converters.TupleTypeAnnotation = createConversion('array');

converters.NullableTypeAnnotation = function (path, opts, context) {
  var converted = convert(path.get('typeAnnotation'), opts, context);

  if (isObjectValue(path)) {
    converted[OPTIONAL] = true;
    return converted;
  } else {
    return t.callExpression(refPropTypes(t.identifier('oneOf'), opts), [t.arrayExpression([t.valueToNode(null), t.valueToNode(undefined), converted])]);
  }
};

converters.QualifiedTypeIdentifier = createThrows('qualified type identifiers unsupported');

converters.TypeAnnotation = function (path, opts, context) {
  return convert(path.get('typeAnnotation'), opts, context);
};

converters.ObjectTypeAnnotation = function (path, opts, context) {
  var _path$node = path.node,
      properties = _path$node.properties,
      indexers = _path$node.indexers,
      callProperties = _path$node.callProperties;


  if (properties.length && indexers.length) {
    throw (0, _error2.default)(path, 'Objects with both properties and indexers are unsupported');
  }

  if (!properties.length && indexers.length > 1) {
    throw (0, _error2.default)(path, 'Objects with multiple indexers are unsupported');
  }

  if (callProperties.length) {
    throw (0, _error2.default)(path.get('callProperties')[0], 'Object call properties are unsupported');
  }

  if (indexers.length) {
    var indexer = path.get('indexers')[0];
    return t.callExpression(refPropTypes(t.identifier('objectOf'), opts), [convert(indexer, opts, _extends({}, context, { depth: context.depth + 1 }))]);
  } else {
    var props = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = path.get('properties')[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var property = _step.value;

        props.push(convert(property, opts, _extends({}, context, { depth: context.depth + 1 })));
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

    var object = t.objectExpression(props);

    if (context.depth === 0) {
      return object;
    } else {
      return t.callExpression(refPropTypes(t.identifier('shape'), opts), [object]);
    }
  }
};

converters.ObjectTypeProperty = function (path, opts, context) {
  var key = path.get('key');
  var value = path.get('value');

  var keyId = void 0;
  if (key.isStringLiteral()) {
    keyId = t.stringLiteral(key.node.value);
  } else {
    keyId = t.identifier(key.node.name);
  }

  var converted = convert(value, opts, context);

  if (!path.node.optional && !converted[OPTIONAL]) {
    converted = t.memberExpression(converted, t.identifier('isRequired'));
  }

  return t.objectProperty(inheritsComments(keyId, key.node), converted);
};

converters.ObjectTypeIndexer = function (path, opts, context) {
  return convert(path.get('value'), opts, context);
};

converters.ArrayTypeAnnotation = function (path, opts, context) {
  return t.callExpression(refPropTypes(t.identifier('arrayOf'), opts), [convert(path.get('elementType'), opts, context)]);
};

var typeParametersConverters = {
  Array: function Array(path, opts, context) {
    var param = path.get('typeParameters').get('params')[0];
    return t.callExpression(refPropTypes(t.identifier('arrayOf'), opts), [convert(param, opts, context)]);
  }
};

function getTypeParam(path, index) {
  return path.get('typeParameters').get('params')[index];
}

var OPTIONAL = Symbol('optional');

var pluginTypeConverters = {
  PropType: function PropType(path, opts, context) {
    return convert(getTypeParam(path, 1), opts, context);
  },
  HasDefaultProp: function HasDefaultProp(path, opts, context) {
    if (context.depth > 1 || !isObjectValue(path)) {
      throw (0, _error2.default)(path, 'HasDefaultProp<T> must only be used as the immediate value inside `props: {}`');
    }

    var converted = convert(getTypeParam(path, 0), opts, context);
    converted[OPTIONAL] = true;
    return converted;
  }
};

converters.GenericTypeAnnotation = function (path, opts, context) {
  if (!path.node.typeParameters) {
    return convert(path.get('id'), opts, context);
  }

  var name = path.node.id.name;

  if (typeParametersConverters[name]) {
    return typeParametersConverters[name](path, opts, context);
  }

  var binding = path.scope.getBinding(name);

  if (binding) {
    var statement = binding.path.parentPath;
    var exploded = (0, _babelExplodeModule.explodeStatement)(statement.node);
    var matched = exploded.imports.find(function (specifier) {
      return specifier.local === name;
    });

    if (matched && matched.kind === 'type' && matched.source === 'babel-plugin-react-flow-props-to-prop-types' && matched.external && pluginTypeConverters[matched.external]) {
      return pluginTypeConverters[matched.external](path, opts, context);
    }
  }

  throw (0, _error2.default)(path, 'Unsupported generic type annotation with type parameters');
};

function convertRegExp(path, opts, context) {
  return t.callExpression(refPropTypes(t.identifier('instanceOf'), opts), [t.identifier('RegExp')]);
}

var typeIdentifierConverters = {
  Function: createConversion('func'),
  Object: createConversion('object'),
  RegExp: convertRegExp
};

converters.Identifier = function (path, opts, context) {
  var name = path.node.name;

  if (path.parentPath.isFlow() && typeIdentifierConverters[name]) {
    return typeIdentifierConverters[name](path, opts, context);
  }

  var binding = void 0;
  if ((0, _babelFlowIdentifiers.isFlowIdentifier)(path)) {
    binding = (0, _babelFlowScope.findFlowBinding)(path, name);
  } else {
    binding = path.scope.getBinding(name);
  }

  if (!binding) {
    throw (0, _error2.default)(path, 'Missing reference "' + name + '"');
  }

  var kind = binding.kind;
  var bindingPath = void 0;

  if (kind === 'import' || kind === 'declaration') {
    bindingPath = binding.path.parentPath;
  } else if (kind === 'module' || kind === 'let') {
    bindingPath = binding.path;
  } else if (kind === 'param') {
    throw binding.path.buildCodeFrameError('Cannot convert type parameters');
  } else {
    throw new Error('Unexpected Flow binding kind: ' + binding.kind);
  }

  return convert(bindingPath, opts, context);
};

converters.TypeAlias = function (path, opts, context) {
  return convert(path.get('right'), opts, context);
};

converters.InterfaceDeclaration = function (path, opts, context) {
  return convert(path.get('body'), opts, context);
};

converters.ClassDeclaration = function (path, opts, context) {
  return t.callExpression(refPropTypes(t.identifier('instanceOf'), opts), [context.replacementId || t.identifier(path.node.id.name)]);
};

converters.UnionTypeAnnotation = function (path, opts, context) {
  var isLiterals = path.node.types.every(isLiteralTypeAnnotation);
  var propType = void 0;
  var elements = void 0;

  if (isLiterals) {
    propType = 'oneOf';
    elements = path.get('types').map(function (p) {
      return typeToValue(p.node);
    });
  } else {
    propType = 'oneOfType';
    elements = path.get('types').map(function (p) {
      return convert(p, opts, context);
    });
  }

  var arr = t.arrayExpression(elements);
  return t.callExpression(refPropTypes(t.identifier(propType), opts), [arr]);
};

converters.IntersectionTypeAnnotation = function (path, opts, context) {
  if (context.depth > 0) {
    return t.callExpression(opts.getPropTypesAllRef(), path.get('types').map(function (type) {
      return convert(type, opts, context);
    }));
  } else {
    var properties = [];

    path.get('types').forEach(function (type) {
      var result = convert(type, opts, context);

      if (!t.isObjectExpression(result)) {
        throw type.buildCodeFrameError('Cannot have intersection of non-objects or complex objects as top-level props');
      }

      properties = properties.concat(result.properties);
    });

    return t.objectExpression(properties);
  }
};

function _convertImportSpecifier(path, opts, context) {
  var kind = path.parent.importKind;
  if (kind === 'typeof') {
    throw (0, _error2.default)(path, 'import typeof is unsupported');
  }

  var file = (0, _babelFileLoader.loadImportSync)(path.parentPath, opts.resolveOpts);

  var name = void 0;
  if (path.type === 'ImportDefaultSpecifier' && kind === 'value') {
    name = 'default';
  } else if (path.node.imported) {
    name = path.node.imported.name;
  } else {
    name = path.node.local.name;
  }

  var id = void 0;
  if (path.node.imported) {
    id = path.node.imported.name;
  } else {
    id = path.node.local.name;
  }

  var exported = (0, _matchExported2.default)(file, name);

  if (!exported) {
    throw (0, _error2.default)(path, 'Missing matching export');
  }

  return convert(exported, opts, _extends({}, context, {
    replacementId: t.identifier(id)
  }));
}

converters.ImportDefaultSpecifier = function (path, opts, context) {
  return _convertImportSpecifier(path, opts, context);
};

converters.ImportSpecifier = function (path, opts, context) {
  return _convertImportSpecifier(path, opts, context);
};

var convert = function convert(path, opts, context) {
  var converter = converters[path.type];

  if (!converter) {
    throw (0, _error2.default)(path, 'No converter for node type: ' + path.type);
  }

  // console.log(`convert(${path.type}, ${JSON.stringify(opts)}, ${JSON.stringify(context)})`);
  var converted = inheritsComments(converter(path, opts, context), path.node);

  return converted;
};

function convertTypeToPropTypes(typeAnnotation, opts) {
  return convert(typeAnnotation, opts, {
    depth: 0
  });
}