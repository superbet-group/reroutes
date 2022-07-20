import type { AnyAction, PayloadAction } from "@reduxjs/toolkit";
import { useRef } from "react";
import { useHistory, useRouteMatch } from "react-router";
import { createModule, useModule } from "remodules";
import type { Location, LocationState, History, Action } from "history";
import { useDispatch } from "react-redux";
import { all, put, takeEvery, takeLatest } from "redux-saga/effects";
import { buffers, eventChannel } from "redux-saga";
import { pathToRegexp } from "path-to-regexp";

type LocationChangeAction = Action | "INIT";

type RerouteState = {
  base: string;
  action: LocationChangeAction | null;
  location: Location;
  transitioning: boolean;
};

const initialState: RerouteState = {
  action: null,
  base: "/",
  location: {
    pathname: "/",
    search: "",
    hash: "",
    state: undefined,
  },
  transitioning: false,
};

const baseName = "@@reroute";

const createHistoryChannel = (history: History) => {
  return eventChannel<{ location: Location; action: LocationChangeAction }>(
    (emit) => {
      emit({ location: history.location, action: "INIT" });
      return history.listen((location, action) => {
        emit({ location, action });
      });
    },
    buffers.expanding(10)
  );
};

const pathJoin = (...paths: string[]) => {
  return paths.join("/").replace(/\/+/g, "/");
};

const createReroute = (key: string) => {
  const name = `${baseName}/${key}`;
  const reroute = createModule({
    name,
    initialState,
    reducers: {
      takeRoot: (
        state,
        {
          payload: {
            base,
            history: { location, action },
          },
        }: PayloadAction<{ base: string; history: History }>
      ) => {
        state.base = base;
        state.location = location;
        state.action = action;
      },
      locationChanged: (
        state,
        {
          payload: { action, location },
        }: PayloadAction<{ action: LocationChangeAction; location: Location }>
      ) => {
        state.location = location;
        state.action = action;
        state.transitioning = false;
      },
      push: {
        prepare: (path: string, state?: LocationState) => ({
          payload: { path, state },
        }),
        reducer: (state) => {
          state.transitioning = true;
        },
      },
      replace: {
        prepare: (path: string, state?: LocationState) => ({
          payload: { path, state },
        }),
        reducer: (state) => {
          state.transitioning = true;
        },
      },
      go: (state, _: PayloadAction<number>) => {
        state.transitioning = true;
      },
      goBack: (state) => {
        state.transitioning = true;
      },
      goForward: (state) => {
        state.transitioning = true;
      },
    },
    selectors: {
      location: (state) => state.location,
      action: (state) => state.action,
      base: (state) => state.base,
      transitioning: (state) => state.transitioning,
      pathname: (state) => state.location.pathname,
      search: (state) => state.location.search,
      hash: (state) => state.location.hash,
      state: (state) => state.location.state,
    },
  }).withWatcher(
    ({ actions }) =>
      function* watcher() {
        yield takeLatest(
          actions.takeRoot,
          function* handleRoot({ payload: { history, base } }) {
            const historyChannel = createHistoryChannel(history);

            yield takeLatest(
              historyChannel,
              function* handleHistoryChange({ action, location }) {
                yield put(actions.locationChanged({ action, location }));
              }
            );

            yield all([
              takeEvery(
                actions.push,
                function* handlePush({ payload: { path, state } }) {
                  history.push(pathJoin(base, path), state);
                }
              ),
              takeEvery(
                actions.replace,
                function* handleReplace({ payload: { path, state } }) {
                  history.replace(pathJoin(base, path), state);
                }
              ),
              takeEvery(actions.go, function* handleGo({ payload: to }) {
                history.go(to);
              }),
              takeEvery(actions.goBack, function* handleGoBack() {
                history.goBack();
              }),
              takeEvery(actions.goForward, function* handleGoForward() {
                history.goForward();
              }),
            ]);
          }
        );
      }
  );

  const createLocationChangedMatcher = (
    path: string,
    {
      start = false,
      strict = false,
      ...otherOptions
    }: Parameters<typeof pathToRegexp>[2] = {
      start: false,
      strict: false,
    }
  ) => {
    return (
      action: AnyAction
    ): action is ReturnType<typeof reroute.actions.locationChanged> => {
      const isLocationChanged = reroute.actions.locationChanged.match(action);

      return (
        isLocationChanged &&
        pathToRegexp(path, [], { start, strict, ...otherOptions }).test(
          action.payload.location.pathname
        )
      );
    };
  };

  const useReroute = () => {
    useModule(reroute);
    const dispatch = useDispatch();

    const { path } = useRouteMatch();
    const history = useHistory();

    const pathRef = useRef<string | null>(null);

    if (pathRef.current !== path) {
      dispatch(reroute.actions.takeRoot({ base: path, history }));
      pathRef.current = path;
    }
  };

  return { reroute, useReroute, createLocationChangedMatcher };
};

export default createReroute;
