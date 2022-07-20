![reroute logo](/logo.svg "React Router logo reimagined with the colour scheme of remodules logo")

# `reroute` - Dynamic Module Loading for Your Redux Application

## Installation

```bash
npm install --save reroute
```

## Add Peer Dependencies

```bash
npm install --save remodules react-router @reduxjs/toolkit redux-saga # react redux react-redux
```

## Usage

```tsx
import { useSelector } from "react-redux";
import { takeEvery } from "redux-saga/effects";
import { createModule, useModule } from "remodules";
import createReroute from "reroute";

const { reroute, useReroute, createLocationChangedMatcher } =
  createReroute("test");

const exampleModule = createModule({
  name: "example",
  initialState: {
    count: 0,
  },
  reducers: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
    decrement: (state) => ({ ...state, count: state.count - 1 }),
  },
}).withWatcher(
  ({ actions }) =>
    function* watcher() {
      yield takeEvery(
        createLocationChangedMatcher("/example/:id", { strict: true }),
        function* handleLocationChanged({ payload }) {
          yield actions.increment();
        }
      );
    }
);

const Example = () => {
  useModule(exampleModule);

  const action = useSelector(reroute.selectors.action);
  const location = useSelector(reroute.selectors.location);

  const navigationCount = useSelector(exampleModule.selectors.count);

  return (
    <div>
      current path: {location.pathname}, last action: {action}, navigation
      count: {navigationCount}
    </div>
  );
};

export const App = () => {
  useReroute();

  return (
    <div>
      <Example />
    </div>
  );
};
```

## Motivation

For users of `remodules`, and `react-router`, this package makes it possible to respond to navigation events from your modules.

When this module takes root in your project, it will check the base route where it was originally mounted via `useReroute` and will store the initial routing state as well as the base route in the store.

When the user navigates to a new route, the store will be updated with the new routing state.

This means you can use the root component for multiple different base routes without having to worry about the base path of each. This can be useful for creating layouts or microfrontends that may be mounted on different base paths in different applications.

## How it works?

- When you use `createReroute` function, which is the default export from the module, you specify a `key` string that is used to create a new module with that key. This ensures that different instances of this module will not get mixed up. When you create 2 modules with the same key, what will happen is that the second module will override the first module, which will mean that the state slice of that module will not match what you expect in your selectors.
- The `useReroute` function mounts the module with the base path where it's used. The module will take root using the path from the base route. This means that you can "ignore" the base path (path that is used to mount the component where you called `useReroute`).
- You can use the `reroute` module like any other `remodules` module in your code.
- There's also a utility function that can help create route change matchers, called `createLocationChangedMatcher`. This function takes a path and an options object. This is passed into `"path-to-regexp"` and helps customise behaviour.
