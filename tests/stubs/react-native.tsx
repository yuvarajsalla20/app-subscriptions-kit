import { createElement, forwardRef } from 'react';

// A small stand-in for react-native so the real screens can be rendered in tests: every component is a plain named element.
const host = (name: string) => forwardRef<unknown, Record<string, unknown>>((props, ref) => createElement(name, { ...props, ref }, props.children as never));

export const View = host('View');
export const Text = host('Text');
export const TextInput = host('TextInput');
export const Pressable = host('Pressable');
export const ScrollView = host('ScrollView');
export const Switch = host('Switch');
export const Platform = { OS: 'ios' as string };
export const Modal = host('Modal');
export const ActivityIndicator = host('ActivityIndicator');
export const AccessibilityInfo = { announceForAccessibility: (_: string) => undefined };
