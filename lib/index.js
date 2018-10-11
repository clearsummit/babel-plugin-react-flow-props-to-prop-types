'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  return {
    name: 'react-flow-props-to-prop-types',
    visitor: {
      Program: function Program(path, state) {
        path.traverse({
          ClassDeclaration: function ClassDeclaration(path) {
            if (!(0, _babelReactComponents.isReactComponentClass)(path)) {
              return;
            }

            var props = (0, _findPropsClassProperty2.default)(path.get('body'));
            if (!props) return;

            var typeAnnotation = props.get('typeAnnotation');
            if (!typeAnnotation.node) {
              throw props.buildCodeFrameError('React component props must have type annotation');
            }

            var propTypesRef = void 0;
            var propTypesAllRef = void 0;

            function getPropTypesRef() {
              if (!propTypesRef) {
                propTypesRef = (0, _helperModuleImports.addDefault)(path, 'prop-types', {
                  nameHint: 'PropTypes'
                });
              }
              return propTypesRef;
            }

            function getPropTypesAllRef() {
              if (!propTypesAllRef) {
                propTypesAllRef = (0, _helperModuleImports.addDefault)(path, 'prop-types-extra/lib/all', {
                  nameHint: 'all'
                });
              }
              return propTypesAllRef;
            }

            var objectExpression = (0, _convertTypeToPropTypes2.default)(typeAnnotation, {
              getPropTypesRef: getPropTypesRef,
              getPropTypesAllRef: getPropTypesAllRef,
              resolveOpts: state.opts.resolveOpts
            });

            var propTypesClassProperty = t.classProperty(t.identifier('propTypes'), objectExpression);

            propTypesClassProperty.static = true;

            props.insertAfter(propTypesClassProperty);
          }
        });
      }
    }
  };
};

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

var _helperModuleImports = require('@babel/helper-module-imports');

var _babelReactComponents = require('babel-react-components');

var _findPropsClassProperty = require('./findPropsClassProperty');

var _findPropsClassProperty2 = _interopRequireDefault(_findPropsClassProperty);

var _convertTypeToPropTypes = require('./convertTypeToPropTypes');

var _convertTypeToPropTypes2 = _interopRequireDefault(_convertTypeToPropTypes);

var _babelLog = require('babel-log');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }