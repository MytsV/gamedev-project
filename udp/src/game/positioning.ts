import {redis} from "../network/storage.js";
import {buildUserHash, LATITUDE_HASH_KEY, LONGITUDE_HASH_KEY} from "../../../common/index.js";
import {clearInterval} from "node:timers";

type Position = {
  latitude: number;
  longitude: number;
}

const PLAYER_SPEED = 0.05;

const getNewPosition = (current: Position, goal: Position): Position => {
  const dx = goal.longitude - current.longitude;
  const dy = goal.latitude - current.latitude;

  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < PLAYER_SPEED) {
    return goal;
  }

  const directionX = dx / distance;
  const directionY = dy / distance;

  const newLongitude = current.longitude + directionX * PLAYER_SPEED;
  const newLatitude = current.latitude + directionY * PLAYER_SPEED;

  return { longitude: newLongitude, latitude: newLatitude };
};

const ongoingPositioning = new Map<string, NodeJS.Timeout>();

const POSITIONING_INTERVAL = 100; // 10 Hz
const POSITIONING_THRESHOLD = 0.1;

export const issueMove = (userId: string, goal: Position) => {
  const previousIntervalId = ongoingPositioning.get(userId);
  if (previousIntervalId) {
    clearInterval(previousIntervalId);
  }

  const userHash = buildUserHash(userId);

  const intervalId = setInterval(async () => {
    const latitude = await redis.hget(userHash, LATITUDE_HASH_KEY);
    const longitude = await redis.hget(userHash, LONGITUDE_HASH_KEY);

    if (!latitude || !longitude) {
      console.error('Cannot issue move for an uninitialized position');
      clearInterval(intervalId);
      return;
    }

    const newPosition = getNewPosition({
      latitude: parseFloat(latitude), longitude: parseFloat(longitude)
    }, goal);

    redis.hset(userHash, LATITUDE_HASH_KEY, newPosition.latitude);
    redis.hset(userHash, LONGITUDE_HASH_KEY, newPosition.longitude);

    if (Math.abs(newPosition.longitude - goal.longitude) < POSITIONING_THRESHOLD &&
      Math.abs(newPosition.latitude - goal.latitude) < POSITIONING_THRESHOLD) {
      clearInterval(intervalId);
    }
  }, POSITIONING_INTERVAL);

  ongoingPositioning.set(userId, intervalId);
}
