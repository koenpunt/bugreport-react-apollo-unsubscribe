import { ApolloLink, Observable } from "@apollo/client";

export class AbortLink extends ApolloLink {
    subscriptions = {};
    contextKey = ''

    constructor(contextKey) {
        super();
        this.contextKey = contextKey;
    }

    request(operation, forward) {
        const context = operation.getContext();

        if (!context[this.contextKey]) {
            return forward(operation);
        }

        return new Observable((observer) => {
            this.subscriptions[context[this.contextKey]]?.unsubscribe();

            const subscription = forward(operation).subscribe(observer);

            this.subscriptions[context[this.contextKey]] = subscription;

            return subscription;
        });
    }
}