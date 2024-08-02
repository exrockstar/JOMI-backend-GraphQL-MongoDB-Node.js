import axios from "axios";
import { nanoid } from "nanoid";
import { GeolocationModel, IpLocationModel } from "../entities";
import { GeoLocation } from "../entities/Access/Access";
import { IpLocation } from "../entities/IpLocation/IpLocation";
import { ipv4ToLong } from "./ipv4ToLong";

let hasNoIpCallsLeft = false;
/**
 * Get geolocation from an ip address
 * @deprecated Use GeoLocationService instead.
 */
export const getLocaleFromIP = async (
  ipv4: string,
): Promise<GeoLocation | undefined> => {
  const ipv4Long = ipv4ToLong(ipv4);
  // Find and use Geolocation stored in local database
  if (!ipv4Long) {
    return;
  }

  const geolocation = await GeolocationModel.findOne({
    ip_low: { $lte: ipv4Long },
  })
    .sort({ ip_low: -1 })
    .limit(1)
    .lean();

  // Use local db if found and if geolocation is valid
  if (
    geolocation &&
    geolocation?.ip_low < ipv4Long &&
    ipv4Long < geolocation?.ip_high
  ) {
    const { countryCode, regionName } = geolocation;

    return {
      countryCode,
      regionName,
      regionCode: undefined,
      continentCode: undefined,
    };
  }

  // Check if ip has been previously found
  let ipLocation = await IpLocationModel.findOne({ ip: ipv4 });

  if (ipLocation) {
    const { countryCode, regionCode, regionName, continentCode } = ipLocation;

    return {
      countryCode,
      regionCode,
      regionName,
      continentCode,
    };
  }

  // If api has received an error recently don't try again for an hour
  if (hasNoIpCallsLeft) {
    return;
  }

  // Call api to find geolocation
  let response: any;
  try {
    const url = `http://api.ipstack.com/${ipv4}?access_key=${process.env.IPSTACK_API_KEY}`;
    const { data } = await axios.get(url);
    response = data as IpLocation;
  } catch (err) {
    handleError(err, ipv4);
    return;
  }

  // Save ip location if country code found
  if (response.country_code) {
    ipLocation = await IpLocationModel.create({
      _id: nanoid(15),
      ip: ipv4,
      countryCode: response.country_code,
      regionCode: response.region_code,
      regionName: response.region_name,
      continentCode: response.continent_code,
    });
  }

  const { countryCode, regionCode, regionName, continentCode } =
    ipLocation || {};

  return {
    countryCode,
    regionCode,
    regionName,
    continentCode,
  };
};

/**
 * Disable api calls for an hour if they throw and error
 */
const handleError = (err: any, ipv4: string) => {
  // Disable ip calls and retry in an hour
  if (err?.code === 104) {
    hasNoIpCallsLeft = true;

    setTimeout(() => {
      hasNoIpCallsLeft = false;
    }, 3600000);
  }

  console.warn(`An error happened trying to geolocate IP ${ipv4}`);
};
