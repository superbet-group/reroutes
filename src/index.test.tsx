import React, { PropsWithChildren } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { Provider, useDispatch, useSelector } from "react-redux";
import { createDynamicStore } from "remodules";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router";

import createReroutes from ".";

afterEach(cleanup);

describe("exports a createReroutes function, that", () => {
  it("returns an object", () => {
    expect(createReroutes).toBeInstanceOf(Function);
    expect(createReroutes("test")).toBeInstanceOf(Object);
  });

  describe("returned object has a reroutes property, that", () => {
    it("is an object", () => {
      expect(createReroutes("test").reroutes).toBeInstanceOf(Object);
    });

    describe("has a selectors property, that", () => {
      const expectedValues = {
        action: "INIT",
        base: "/",
        transitioning: "false",
        pathname: "/",
        search: "",
        hash: "",
        state: "undefined",
      };
      it.each([
        "action",
        "base",
        "transitioning",
        "pathname",
        "search",
        "hash",
        "state",
      ] as const)("selects %s property of the state", (selector) => {
        const { reroutes, useReroutes } = createReroutes("test");

        expect(reroutes.selectors[selector]).toBeInstanceOf(Function);

        const Test = () => {
          useReroutes();
          const state = useSelector(reroutes.selectors[selector]);

          return <div data-testid="test">{String(state)}</div>;
        };

        const store = createDynamicStore({
          reducer: (state = {}) => state,
        });

        const App = () => {
          return (
            <Provider store={store}>
              <MemoryRouter>
                <Test />
              </MemoryRouter>
            </Provider>
          );
        };

        const { getByTestId } = render(<App />);

        const element = getByTestId("test");

        expect(element.textContent).toBe(expectedValues[selector]);
      });
    });
  });

  describe("returned object has a useReroutes property, that", () => {
    it("is a function", () => {
      expect(createReroutes("test").useReroutes).toBeInstanceOf(Function);
    });

    it("ensures base is set to current route", () => {
      const { reroutes, useReroutes } = createReroutes("test");

      const Test = () => {
        useReroutes();
        const base = useSelector(reroutes.selectors.base);

        return <div data-testid="test">{base}</div>;
      };

      const store = createDynamicStore({
        reducer: (state = {}) => state,
      });

      const App = () => {
        return (
          <Provider store={store}>
            <MemoryRouter initialEntries={["/test"]}>
              <Switch>
                <Route path="/test" component={Test} />
              </Switch>
            </MemoryRouter>
          </Provider>
        );
      };

      const { getByTestId } = render(<App />);

      const element = getByTestId("test");

      expect(element.textContent).toBe("/test");
    });
  });

  describe("returned object has a createLocationChangedMatcher property, that", () => {
    it("is a function", () => {
      expect(
        createReroutes("test").createLocationChangedMatcher
      ).toBeInstanceOf(Function);
    });

    describe("returns a matcher function, that", () => {
      const testPath = "/test";
      const { reroutes, createLocationChangedMatcher } = createReroutes("test");
      const matcher = createLocationChangedMatcher(testPath);

      it("does not match a route change to a different path", () => {
        expect(
          matcher(
            reroutes.actions.locationChanged({
              action: "INIT",
              location: {
                pathname: "/not-test",
                search: "",
                state: undefined,
                hash: "",
              },
            })
          )
        ).toBe(false);
      });

      it("matches a route change to the given path", () => {
        expect(
          matcher(
            reroutes.actions.locationChanged({
              action: "INIT",
              location: {
                pathname: testPath,
                search: "",
                state: undefined,
                hash: "",
              },
            })
          )
        ).toBe(true);
      });
    });
  });
});

describe("application flow tests", () => {
  const { reroutes, useReroutes, createLocationChangedMatcher } =
    createReroutes("test");

  const Example = () => {
    return <div>Example</div>;
  };

  const Menu = () => {
    const dispatch = useDispatch();
    return (
      <nav>
        <button onClick={() => dispatch(reroutes.actions.push("/example"))}>
          Push /example
        </button>
        <button onClick={() => dispatch(reroutes.actions.push("/test"))}>
          Push /test
        </button>
        <button onClick={() => dispatch(reroutes.actions.push("/test2"))}>
          Push /test2
        </button>
        <button onClick={() => dispatch(reroutes.actions.push("/test3"))}>
          Push /test3
        </button>
        <button onClick={() => dispatch(reroutes.actions.replace("/replaced"))}>
          Replace /replaced
        </button>
        <button onClick={() => dispatch(reroutes.actions.go(-1))}>Go -1</button>
        <button onClick={() => dispatch(reroutes.actions.go(1))}>Go +1</button>
        <button onClick={() => dispatch(reroutes.actions.go(2))}>Go +2</button>
        <button onClick={() => dispatch(reroutes.actions.goBack())}>
          Go back
        </button>
        <button onClick={() => dispatch(reroutes.actions.goForward())}>
          Go forward
        </button>
      </nav>
    );
  };

  const LocationDisplay = () => {
    const action = useSelector(reroutes.selectors.action);
    const location = useSelector(reroutes.selectors.location);

    return (
      <div>
        <p data-testid="pathname">{location.pathname}</p>
        <p data-testid="action">{action}</p>
      </div>
    );
  };

  const store = createDynamicStore({ reducer: (state = {}) => state });

  const Wrapper = ({ children }: PropsWithChildren<{}>) => {
    useReroutes();

    return <>{children}</>;
  };

  const App = () => {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={["/"]}>
          <Wrapper>
            <LocationDisplay />
            <Menu />
            <Switch>
              <Route path="/example" component={Example} />
            </Switch>
          </Wrapper>
        </MemoryRouter>
      </Provider>
    );
  };

  it("is originally on /", () => {
    const { getByTestId } = render(<App />);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/");
    expect(action.textContent).toBe("INIT");
  });

  it("can push to /example", () => {
    const { getByTestId, getByText } = render(<App />);

    const button = getByText("Push /example");

    fireEvent.click(button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/example");
    expect(action.textContent).toBe("PUSH");
  });

  it("can push to /test", () => {
    const { getByTestId, getByText } = render(<App />);

    const button = getByText("Push /test");

    fireEvent.click(button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test");
    expect(action.textContent).toBe("PUSH");
  });

  it("can push to /test2 and then /test3", () => {
    const { getByTestId, getByText } = render(<App />);

    const button = getByText("Push /test2");

    fireEvent.click(button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test2");
    expect(action.textContent).toBe("PUSH");

    const button2 = getByText("Push /test3");

    fireEvent.click(button2);

    expect(pathname.textContent).toBe("/test3");
    expect(action.textContent).toBe("PUSH");
  });

  it("can replace to /replaced", () => {
    const { getByTestId, getByText } = render(<App />);

    const button = getByText("Replace /replaced");

    fireEvent.click(button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/replaced");
    expect(action.textContent).toBe("REPLACE");
  });

  it("can go -1", () => {
    const { getByTestId, getByText } = render(<App />);

    const backButton = getByText("Go -1");
    const testButton = getByText("Push /test");
    const test2Button = getByText("Push /test2");
    const test3Button = getByText("Push /test3");

    fireEvent.click(testButton);
    fireEvent.click(test2Button);
    fireEvent.click(test3Button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test3");
    expect(action.textContent).toBe("PUSH");

    fireEvent.click(backButton);

    expect(pathname.textContent).toBe("/test2");
    expect(action.textContent).toBe("POP");
  });

  it("can go +1", () => {
    const { getByTestId, getByText } = render(<App />);

    const forwardButton = getByText("Go +1");
    const backButton = getByText("Go back");
    const testButton = getByText("Push /test");
    const test2Button = getByText("Push /test2");
    const test3Button = getByText("Push /test3");

    fireEvent.click(testButton);
    fireEvent.click(test2Button);
    fireEvent.click(test3Button);
    fireEvent.click(backButton);
    fireEvent.click(backButton);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test");
    expect(action.textContent).toBe("POP");

    fireEvent.click(forwardButton);

    expect(pathname.textContent).toBe("/test2");
    expect(action.textContent).toBe("POP");
  });

  it("can go back", () => {
    const { getByTestId, getByText } = render(<App />);

    const backButton = getByText("Go back");
    const testButton = getByText("Push /test");
    const test2Button = getByText("Push /test2");
    const test3Button = getByText("Push /test3");

    fireEvent.click(testButton);
    fireEvent.click(test2Button);
    fireEvent.click(test3Button);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test3");
    expect(action.textContent).toBe("PUSH");

    fireEvent.click(backButton);

    expect(pathname.textContent).toBe("/test2");
    expect(action.textContent).toBe("POP");
  });

  it("can go forward", () => {
    const { getByTestId, getByText } = render(<App />);

    const forwardButton = getByText("Go forward");
    const backButton = getByText("Go back");
    const testButton = getByText("Push /test");
    const test2Button = getByText("Push /test2");
    const test3Button = getByText("Push /test3");

    fireEvent.click(testButton);
    fireEvent.click(test2Button);
    fireEvent.click(test3Button);
    fireEvent.click(backButton);
    fireEvent.click(backButton);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test");
    expect(action.textContent).toBe("POP");

    fireEvent.click(forwardButton);

    expect(pathname.textContent).toBe("/test2");
    expect(action.textContent).toBe("POP");
  });

  it("can go +2", () => {
    const { getByTestId, getByText } = render(<App />);

    const forwardButton = getByText("Go +2");
    const backButton = getByText("Go back");
    const testButton = getByText("Push /test");
    const test2Button = getByText("Push /test2");
    const test3Button = getByText("Push /test3");

    fireEvent.click(testButton);
    fireEvent.click(test2Button);
    fireEvent.click(test3Button);
    fireEvent.click(backButton);
    fireEvent.click(backButton);

    const pathname = getByTestId("pathname");
    const action = getByTestId("action");

    expect(pathname.textContent).toBe("/test");
    expect(action.textContent).toBe("POP");

    fireEvent.click(forwardButton);
    fireEvent.click(forwardButton);

    expect(pathname.textContent).toBe("/test3");
    expect(action.textContent).toBe("POP");
  });
});
