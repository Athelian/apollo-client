import React from "react";
import gql from "graphql-tag";
import { act } from "react-dom/test-utils";
import { waitFor, renderHook } from "@testing-library/react";
import { NetworkStatus, TypedDocumentNode } from "../../../core";
import { InMemoryCache } from "../../../cache";
import { Observable } from "../../../utilities";
import { ApolloLink } from "../../../link/core";
import { MockedProvider } from "../../../testing";
import { QueryResult } from "../../types/types";
import { useQuery } from "../useQuery";

describe("useQuery Hook", () => {
  describe("Pagination", () => {
    // const query = gql`
    //   query letters($limit: Int) {
    //     letters(limit: $limit) {
    //       name
    //       position
    //     }
    //   }
    // `;

    const ab = [
      { name: "A", position: 1 },
      { name: "B", position: 2 },
    ];

    const cd = [
      { name: "C", position: 3 },
      { name: "D", position: 4 },
    ];

    // const mocks = [
    //   {
    //     request: { query, variables: { limit: 2 } },
    //     result: {
    //       data: {
    //         letters: ab,
    //       },
    //     },
    //   },
    //   {
    //     request: { query, variables: { limit: 2 } },
    //     result: {
    //       data: {
    //         letters: cd,
    //       },
    //     },
    //     delay: 10,
    //   },
    // ];

    // it("fetchMore with concatPagination", async () => {
    //   const cache = new InMemoryCache({
    //     typePolicies: {
    //       Query: {
    //         fields: {
    //           letters: concatPagination(),
    //         },
    //       },
    //     },
    //   });

    //   const wrapper = ({ children }: any) => (
    //     <MockedProvider mocks={mocks} cache={cache}>
    //       {children}
    //     </MockedProvider>
    //   );

    //   const { result } = renderHook(
    //     () => useQuery(query, { variables: { limit: 2 } }),
    //     { wrapper }
    //   );

    //   expect(result.current.loading).toBe(true);
    //   expect(result.current.networkStatus).toBe(NetworkStatus.loading);
    //   expect(result.current.data).toBe(undefined);

    //   await waitFor(
    //     () => {
    //       expect(result.current.loading).toBe(false);
    //     },
    //     { interval: 1 }
    //   );
    //   expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    //   expect(result.current.data).toEqual({ letters: ab });
    //   result.current.fetchMore({ variables: { limit: 2 } });

    //   expect(result.current.loading).toBe(false);
    //   await waitFor(
    //     () => {
    //       expect(result.current.data).toEqual({ letters: ab.concat(cd) });
    //     },
    //     { interval: 1 }
    //   );
    //   expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    // });

    // it("fetchMore with concatPagination and notifyOnNetworkStatusChange", async () => {
    //   const cache = new InMemoryCache({
    //     typePolicies: {
    //       Query: {
    //         fields: {
    //           letters: concatPagination(),
    //         },
    //       },
    //     },
    //   });

    //   const wrapper = ({ children }: any) => (
    //     <MockedProvider mocks={mocks} cache={cache}>
    //       {children}
    //     </MockedProvider>
    //   );

    //   const { result } = renderHook(
    //     () =>
    //       useQuery(query, {
    //         variables: { limit: 2 },
    //         notifyOnNetworkStatusChange: true,
    //       }),
    //     { wrapper }
    //   );

    //   expect(result.current.loading).toBe(true);
    //   expect(result.current.networkStatus).toBe(NetworkStatus.loading);
    //   expect(result.current.data).toBe(undefined);

    //   await waitFor(
    //     () => {
    //       expect(result.current.loading).toBe(false);
    //     },
    //     { interval: 1 }
    //   );
    //   expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    //   expect(result.current.data).toEqual({ letters: ab });

    //   act(() => void result.current.fetchMore({ variables: { limit: 2 } }));
    //   expect(result.current.loading).toBe(true);
    //   expect(result.current.networkStatus).toBe(NetworkStatus.fetchMore);
    //   expect(result.current.data).toEqual({ letters: ab });

    //   await waitFor(
    //     () => {
    //       expect(result.current.loading).toBe(false);
    //     },
    //     { interval: 1 }
    //   );
    //   expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    //   expect(result.current.data).toEqual({ letters: ab.concat(cd) });
    // });

    it("should be cleared when query change causes cache miss", async () => {
      const query1 = gql`
        query letters($limit: Int, $offset: Int) {
          letters(limit: $limit, offset: $offset) {
            name
          }
        }
      `;

      const query2 = gql`
        query letters($limit: Int, $offset: Int) {
          letters(limit: $limit, offset: $offset) {
            name
            position
          }
        }
      `;

      const mocks = [
        {
          request: { query: query1, variables: { limit: 2, offset: 0 } },
          result: {
            data: {
              letters: ab.map(({ position, ...letter }) => letter),
            },
          },
        },
        {
          request: { query: query1, variables: { limit: 2, offset: 2 } },
          result: {
            data: {
              letters: cd.map(({ position, ...letter }) => letter),
            },
          },
          delay: 10,
        },
        {
          request: { query: query2, variables: { limit: 2, offset: 0 } },
          result: {
            data: {
              letters: ab,
            },
          },
        },
        {
          request: { query: query2, variables: { limit: 2, offset: 2 } },
          result: {
            data: {
              letters: cd,
            },
          },
          delay: 10,
        },
      ];

      const cache = new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              letters: {
                keyArgs: false,
                merge(existing, incoming, x) {
                  const ret = existing ? [...existing] : [];

                  for (let i = 0; i < incoming.length; i++) {
                    ret[(x.args?.offset ?? 0) + i] = incoming[i];
                  }
                  return ret;
                },
              },
            },
          },
        },
      });

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} cache={cache}>
          {children}
        </MockedProvider>
      );

      const { result, rerender } = renderHook(
        ({ query, variables }) =>
          useQuery(query, {
            variables,
            fetchPolicy: "network-only",
            notifyOnNetworkStatusChange: true,
          }),
        {
          wrapper,
          initialProps: { query: query1, variables: { limit: 2, offset: 0 } },
        }
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.networkStatus).toBe(NetworkStatus.loading);
      expect(result.current.data).toBe(undefined);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { interval: 1 }
      );

      expect(result.current.networkStatus).toBe(NetworkStatus.ready);
      expect(result.current.data).toEqual({
        letters: ab.map(({ position, ...letter }) => letter),
      });

      act(
        () =>
          void result.current.fetchMore({ variables: { limit: 2, offset: 2 } })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.networkStatus).toBe(NetworkStatus.fetchMore);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { interval: 1 }
      );

      expect(result.current.networkStatus).toBe(NetworkStatus.ready);
      expect(result.current.data).toEqual({
        letters: ab.concat(cd).map(({ position, ...letter }) => letter),
      });

      rerender({ query: query2, variables: { limit: 2, offset: 0 } });

      expect(result.current.loading).toBe(true);
      expect(result.current.networkStatus).toBe(NetworkStatus.loading);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { interval: 5 }
      );
      expect(result.current.networkStatus).toBe(NetworkStatus.ready);
      expect(result.current.data).toEqual({
        letters: ab,
      });

      act(
        () =>
          void result.current.fetchMore({ variables: { limit: 2, offset: 2 } })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.networkStatus).toBe(NetworkStatus.fetchMore);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { interval: 1 }
      );

      expect(result.current.networkStatus).toBe(NetworkStatus.ready);
      expect(result.current.data).toEqual({
        letters: ab.concat(cd),
      });
    });
  });

  it("should be cleared when variables change causes cache miss", async () => {
    const peopleData = [
      { id: 1, name: "John Smith", gender: "male" },
      { id: 2, name: "Sara Smith", gender: "female" },
      { id: 3, name: "Budd Deey", gender: "nonbinary" },
      { id: 4, name: "Johnny Appleseed", gender: "male" },
      { id: 5, name: "Ada Lovelace", gender: "female" },
    ];

    const link = new ApolloLink((operation) => {
      return new Observable((observer) => {
        const { gender } = operation.variables;
        new Promise((resolve) => setTimeout(resolve, 300)).then(() => {
          observer.next({
            data: {
              people:
                gender === "all" ? peopleData
                : gender ?
                  peopleData.filter((person) => person.gender === gender)
                : peopleData,
            },
          });
          observer.complete();
        });
      });
    });

    type Person = {
      __typename: string;
      id: string;
      name: string;
    };

    const query: TypedDocumentNode<{
      people: Person[];
    }> = gql`
      query AllPeople($gender: String!) {
        people(gender: $gender) {
          id
          name
        }
      }
    `;

    const cache = new InMemoryCache();
    const wrapper = ({ children }: any) => (
      <MockedProvider link={link} cache={cache}>
        {children}
      </MockedProvider>
    );

    const { result, rerender } = renderHook(
      ({ gender }) =>
        useQuery(query, {
          variables: { gender },
          fetchPolicy: "network-only",
        }),
      { wrapper, initialProps: { gender: "all" } }
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.networkStatus).toBe(NetworkStatus.loading);
    expect(result.current.data).toBe(undefined);

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { interval: 1 }
    );

    expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    expect(result.current.data).toEqual({
      people: peopleData.map(({ gender, ...person }) => person),
    });

    rerender({ gender: "female" });
    expect(result.current.loading).toBe(true);
    expect(result.current.networkStatus).toBe(NetworkStatus.setVariables);
    expect(result.current.data).toBe(undefined);

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { interval: 1 }
    );
    expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    expect(result.current.data).toEqual({
      people: peopleData
        .filter((person) => person.gender === "female")
        .map(({ gender, ...person }) => person),
    });

    rerender({ gender: "nonbinary" });
    expect(result.current.loading).toBe(true);
    expect(result.current.networkStatus).toBe(NetworkStatus.setVariables);
    expect(result.current.data).toBe(undefined);

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { interval: 1 }
    );
    expect(result.current.networkStatus).toBe(NetworkStatus.ready);
    expect(result.current.data).toEqual({
      people: peopleData
        .filter((person) => person.gender === "nonbinary")
        .map(({ gender, ...person }) => person),
    });
  });
});

it("should be cleared when query change causes cache miss", async () => {
  type Gender = "male" | "female" | "nonbinary";

  type Person = {
    id: number;
    name: string;
    gender: Gender;
  };

  const peopleData: Person[] = [
    { id: 1, name: "John Smith", gender: "male" },
    { id: 2, name: "Sara Smith", gender: "female" },
    { id: 3, name: "Budd Deey", gender: "nonbinary" },
    { id: 4, name: "Johnny Appleseed", gender: "male" },
    { id: 5, name: "Ada Lovelace", gender: "female" },
  ];

  type InputVariables = { gender: Gender | "all" };

  const link = new ApolloLink((operation) => {
    return new Observable((observer) => {
      const { gender } = operation.variables as InputVariables;
      new Promise((resolve) => setTimeout(resolve, 300)).then(() => {
        observer.next({
          data: {
            people:
              gender === "all" ? peopleData
              : gender ? peopleData.filter((person) => person.gender === gender)
              : peopleData,
          },
        });
        observer.complete();
      });
    });
  });

  type PersonResolved = Person & { __typename: "Person" };

  type Query1 = {
    people: Pick<PersonResolved, "id">[];
  };

  const query1: TypedDocumentNode<Query1, InputVariables> = gql`
    query AllPeople($gender: String!) {
      people(gender: $gender) {
        id
      }
    }
  `;

  const cache = new InMemoryCache();
  const wrapper = ({ children }: any) => (
    <MockedProvider link={link} cache={cache}>
      {children}
    </MockedProvider>
  );

  const { result, rerender } = renderHook<
    QueryResult<
      {
        people: Partial<PersonResolved>[];
      },
      InputVariables
    >,
    {
      query: TypedDocumentNode<
        {
          people: Partial<PersonResolved>[];
        },
        InputVariables
      >;
      variables: InputVariables;
    }
  >(
    ({ query, variables }) =>
      useQuery(query, {
        variables,
        fetchPolicy: "network-only",
      }),
    { wrapper, initialProps: { variables: { gender: "all" }, query: query1 } }
  );

  expect(result.current.loading).toBe(true);
  expect(result.current.networkStatus).toBe(NetworkStatus.loading);
  expect(result.current.data).toBe(undefined);

  await waitFor(
    () => {
      expect(result.current.loading).toBe(false);
    },
    { interval: 1 }
  );

  expect(result.current.networkStatus).toBe(NetworkStatus.ready);
  expect(result.current.data).toEqual({
    people: peopleData.map(({ id }) => ({
      id,
    })),
  });

  const query2: TypedDocumentNode<Query1, InputVariables> = gql`
    query AllPeople($gender: String!) {
      people(gender: $gender) {
        id
        name
      }
    }
  `;

  rerender({ variables: { gender: "all" }, query: query2 });
  expect(result.current.loading).toBe(true);
  expect(result.current.networkStatus).toBe(NetworkStatus.loading);
  expect(result.current.data).toBe(undefined);

  await waitFor(
    () => {
      expect(result.current.loading).toBe(false);
    },
    { interval: 1 }
  );
  expect(result.current.networkStatus).toBe(NetworkStatus.ready);
  expect(result.current.data).toEqual({
    people: peopleData.map(({ gender, ...person }) => person),
  });
});

describe.skip("Type Tests", () => {
  test("NoInfer prevents adding arbitrary additional variables", () => {
    const typedNode = {} as TypedDocumentNode<{ foo: string }, { bar: number }>;
    const { variables } = useQuery(typedNode, {
      variables: {
        bar: 4,
        // @ts-expect-error
        nonExistingVariable: "string",
      },
    });
    variables?.bar;
    // @ts-expect-error
    variables?.nonExistingVariable;
  });
});
