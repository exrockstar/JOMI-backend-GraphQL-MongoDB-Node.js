import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

const plugins: any = [];

if (process.env.NODE_ENV == "development") {
  plugins.push(
    ApolloServerPluginLandingPageGraphQLPlayground({
      settings: {
        "request.credentials": "include",
        "editor.theme": "light",
      },
    })
  );
}

export default plugins;
