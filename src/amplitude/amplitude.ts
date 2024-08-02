import * as amplitude from '@amplitude/analytics-node';
import { Identify } from '@amplitude/analytics-node';
import { logger } from '../logger';

let amplitudeInitialized = false;
/**
 * Purpose: Initialize amplitude analytics tracking
 */
export const amplitudeInit = () => {
  if(process.env.AMPLITUDE_API_KEY){
    amplitude.init(process.env.AMPLITUDE_API_KEY, {
      logLevel: amplitude.Types.LogLevel.Warn,
      minIdLength: 1
    })
    amplitudeInitialized = true;
    logger.info("Amplitude initialized");
  } else {
    logger.warn("No API key found for Amplitude when initializing (backend)");
  }
}

/**
 * Purpose: Set the User ID for Amplitude
 * @param userId: a string representing the db ID of the user.
 */
export const amplitudeSetUserID = (userId: string) => {
  const identifyObj = new amplitude.Identify();
  amplitude.identify(identifyObj, {
    user_id: userId,
  });
}

/**
 * Purpose: Set additional user properties
 * @param props: an object representing the properties we want to set for the user
 * @param userIp: The IP address of the user, this is required since all events
 * need to be configured with the device_id or user_id fields. 
 */
export const amplitudeSetUserProps = (props: Object, userIp: string) => {
  const identifyEvent = new Identify();
  for (const [key, value] of Object.entries(props)) {
    identifyEvent.set(`${key}`, `${value}`)
  };
  amplitude.identify(identifyEvent, { device_id: userIp ?? 'no_ip_found' });
}

/**
 * Purpose: Set additional user properties once. Subsequent calls to setOnce are ignored.
 * Useful for setting properties that you do not want to override (anon-link-id) and 
 * may unexpectedly change at some point.
 * @param props: an object representing the properties we want to set for the user
 * @param userIp: The IP address of the user, this is required since all events
 * need to be configured with the device_id or user_id fields. 
 */
export const amplitudeSetUserPropsOnce = (props: Object, userIp: string) => {
  const identifyEvent = new Identify();
  for (const [key, value] of Object.entries(props)) {
    identifyEvent.setOnce(`${key}`, `${value}`)
  };
  amplitude.identify(identifyEvent, { device_id: userIp ?? 'no_ip_found' });
}

/**
 * Purpose: Add numerical values to user properties. Ex: The user views an article,
 * so add 1 to the user's articleCount.
 * @param props: an object representing the properties we want to add to the user
 * @param userIp: The IP address of the user, this is required since all events
 * need to be configured with the device_id or user_id fields. 
 */
export const amplitudeAddToUserProps = (props: Object, userIp: string) => {
  const identifyEvent = new Identify();
  for (const [key, value] of Object.entries(props)) {
    identifyEvent.add(`${key}`, value)
  };
  amplitude.identify(identifyEvent, { device_id: userIp ?? 'no_ip_found' });
}

/**
 * Purpose: Track an article view statistic
 * @param params: An Object whose properties we use to add to the tracked event.
 * @param userIp: The IP address of the user, this is required since all events
 * need to be configured with the device_id or user_id fields. 
 */
export const amplitudeTrackArticleView = (params: Object, userIp: string) => {
  amplitude.track('Article View', {
    ...params,
  }, {
    device_id: userIp ?? 'no_ip_found'
  });
  amplitudeAddToUserProps({ articleCount: 1 }, userIp);
}

/**
 * Purpose: Track when a user renews their subscription
 * @param params: An Object whose properties we use to add to the tracked event.
 * @param user_id: A string representing the DB ID of the user we want to track.
 * @param session_id: A string representing the Amplitude session_id passed from the client.
 */
export const amplitudeTrackRenewal = (params: Object, user_id: string, session_id: number) => {
  if(amplitudeInitialized){
    amplitude.track('Renewal', {
      ...params,
    }, {
      user_id,
      session_id
    })
    logger.info(`Amplitude tracking renewal event for: ${user_id}, ${session_id}`)
  }
}