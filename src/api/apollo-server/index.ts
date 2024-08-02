import { ApolloServer } from "apollo-server-express";
import resolvers from "../../resolvers";
import { buildSchema } from "type-graphql";
import plugins from "./plugins";
import { AppContext } from "./AppContext";
import { ObjectId } from "mongodb";
import { getToken, getUser, getUserIp } from "./context-utils";
import { ErrorInterceptor } from "../../middleware/ErrorInterceptor";
import { GeoLocationService } from "../../services/GeoLocationService";
import { ObjectIdScalar } from "../../scalars/ObjectIdScalar";
import { ObjectScalar } from "../../scalars/ObjectScalar";
import { CountryModel } from "../../entities";

export const getApolloServer = async () => {
  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: resolvers,
      globalMiddlewares: [ErrorInterceptor],
      scalarsMap: [
        { type: ObjectId, scalar: ObjectIdScalar },
        { type: Object, scalar: ObjectScalar },
      ],
    }),

    plugins: plugins,

    context: async ({ req, res }) => {
      const token = getToken(req);
      const userip = getUserIp(req);
      const geoLocation = await GeoLocationService.getGeoLocation(req.headers);
      const user = await getUser(userip, geoLocation, token);
      const country = await CountryModel.findOne({
        code: geoLocation.countryCode ?? "US",
      }).lean();
      const user_agent = req.headers["user-agent"];

      return {
        req,
        res,
        visitor_ip: userip,
        user,
        role: user?.role,
        user_agent,
        geoLocation,
        country,
      } as AppContext;
    },
  });

  return server;
};
