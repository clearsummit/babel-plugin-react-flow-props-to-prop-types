// @flow
import type {Node, Path} from './types';
import * as t from 'babel-types';
import {addDefault} from '@babel/helper-module-imports';
import {isReactComponentClass} from 'babel-react-components';
import findPropsClassProperty from './findPropsClassProperty';
import convertTypeToPropTypes from './convertTypeToPropTypes';
import {log} from 'babel-log';

type PluginOptions = {
  resolveOpts?: Object,
};

export default function() {
  return {
    name: 'react-flow-props-to-prop-types',
    visitor: {
      Program(path: Path, state: {opts: PluginOptions}) {
        path.traverse({
          ClassDeclaration(path) {
            if (!isReactComponentClass(path)) {
              return;
            }

            let props = findPropsClassProperty(path.get('body'));
            if (!props) return;

            let typeAnnotation = props.get('typeAnnotation');
            if (!typeAnnotation.node) {
              throw props.buildCodeFrameError(
                'React component props must have type annotation',
              );
            }

            let propTypesRef;
            let propTypesAllRef;

            function getPropTypesRef() {
              if (!propTypesRef) {
                propTypesRef = addDefault(path, 'prop-types', {
                  nameHint: 'PropTypes',
                });
              }
              return propTypesRef;
            }

            function getPropTypesAllRef() {
              if (!propTypesAllRef) {
                propTypesAllRef = addDefault(path, 'prop-types-extra/lib/all', {
                  nameHint: 'all',
                });
              }
              return propTypesAllRef;
            }

            let objectExpression = convertTypeToPropTypes(typeAnnotation, {
              getPropTypesRef,
              getPropTypesAllRef,
              resolveOpts: state.opts.resolveOpts,
            });

            let propTypesClassProperty = t.classProperty(
              t.identifier('propTypes'),
              objectExpression,
            );

            propTypesClassProperty.static = true;

            props.insertAfter(propTypesClassProperty);
          },
        });
      },
    },
  };
}

export type PropType<T, R> = T;
export type HasDefaultProp<T> = T;
