import { createElement, type ReactNode } from 'react';

const host = (name: string) => (props: Record<string, unknown> & { children?: ReactNode }) => createElement(name, props, props.children);
export default host('Svg');
export const Svg = host('Svg');
export const Path = host('Path');
export const Circle = host('Circle');
