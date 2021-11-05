/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList, GraphQLInt,
} from 'graphql';
const PersonType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const counterData = {
  id: 1, count: 0
};

const CounterType = new GraphQLObjectType({
  name: 'Counter',
  fields: {
    id: { type: GraphQLID },
    count: { type: GraphQLInt }
  }
})

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    counter: {
      type: CounterType,
      resolve: () => counterData
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    setCount: {
      type: CounterType,
      args: {
        count: { type: GraphQLInt },
      },
      resolve: function (_, { count }) {
        counterData.count = count;
        return counterData;
      }
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType, mutation: MutationType });

/*** LINK ***/
import { graphql, print } from "graphql";
import { ApolloLink, Observable } from "@apollo/client";
function delay(wait) {
  return new Promise(resolve => setTimeout(resolve, wait));
}

const link = new ApolloLink(operation => {
  return new Observable(async observer => {
    const { query, operationName, variables } = operation;
    await delay(300);
    try {
      const result = await graphql(
        schema,
        print(query),
        null,
        null,
        variables,
        operationName,
      );
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

/*** APP ***/
import React, { useState } from "react";
import { render } from "react-dom";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useMutation,
} from "@apollo/client";
import "./index.css";
import {AbortLink} from "./abort.link";

const COUNT = gql`
  query Count {
    counter {
      id
      count
    }
  }
`;

const SET_COUNT = gql`
  mutation SetCount($count: Int!) {
    setCount(count: $count) {
      id
      count
    }
  }
`;

function App() {
  const [name, setName] = useState('');
  const {
    loading,
    data,
  } = useQuery(COUNT);

  const [setCount] = useMutation(SET_COUNT, {
    optimisticResponse: ({ count }) => {
      return {
        __typename: 'Mutation',
        setCount: {
          __typename: 'Counter',
          id: 1,
          count,
        }
      };
    },
  });

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      <div>


        <h3>{data ?  data.counter.count : 0}</h3>

        {loading && (
                <p>Loading…</p>
            )}

        <button
          onClick={() => {
            setCount({ variables: { count: data.counter.count + 1 }, context: { abortKey: 'op1' } });
          }}
        >
          Increment with abort
        </button>

        <button
            onClick={() => {
              setCount({ variables: { count: data.counter.count + 1 } });
            }}
        >
          Increment
        </button>
      </div>
    </main>
  );
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
      new AbortLink('abortKey'),
      link
  ])
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);
