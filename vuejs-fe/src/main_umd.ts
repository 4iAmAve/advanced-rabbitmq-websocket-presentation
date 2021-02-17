import App from './App.svelte';
import type { ModuleProps } from '@fielmann-ag/wip-module-logic';

const Component = document.createElement('div');
Component.id = 'moduleMain';
const UMDApp = new App({
  target: Component,
  props: {},
});

export const getComponent = (props: ModuleProps) => {
  UMDApp.$set(props);
  return Component;
};
