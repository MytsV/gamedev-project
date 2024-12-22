import dgram from 'dgram';
import { server } from './server.js';
import { clearInterval } from 'node:timers';
import {
  disconnectPlayer,
  getGameState,
  initializePlayer,
} from '../game/state.js';

const ongoingPublishing = new Map<string, NodeJS.Timeout>();

export const publishState = async (
  userId: string,
  locationId: string,
  rinfo: dgram.RemoteInfo
) => {
  try {
    await initializePlayer(userId, locationId);

    const publishInterval = 50; // 20 Hz

    const previousIntervalId = ongoingPublishing.get(userId);
    if (previousIntervalId) {
      clearInterval(previousIntervalId);
    }

    const intervalId = setInterval(async () => {
      const gameState = await getGameState(userId, locationId);
      server.send(
        JSON.stringify(gameState),
        rinfo.port,
        rinfo.address,
        (err) => {
          if (err) {
            console.log(`Could not publish the state to the user ${userId}`);
          }
        }
      );
    }, publishInterval);

    ongoingPublishing.set(userId, intervalId);
  } catch (e) {
    console.error(`Error publishing the state: ${e}`);
  }
};

export const stopStatePublish = async (userId: string) => {
  await disconnectPlayer(userId);
  const intervalId = ongoingPublishing.get(userId);
  clearInterval(intervalId);
  ongoingPublishing.delete(userId);
};
