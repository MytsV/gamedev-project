import {redis} from "../network/storage.js";
import {buildUserHash, LATITUDE_HASH_KEY, LONGITUDE_HASH_KEY} from "../../../common/index.js";
import {clearInterval} from "node:timers";

type Position = {
  latitude: number;
  longitude: number;
}

const PLAYER_SPEED = 0.05;

const getNewPosition = (current: Position, goal: Position): Position => {
  let newLongitude = current.longitude;
  let newLatitude = current.latitude;

  if (current.longitude < goal.longitude) {
    newLongitude = Math.min(current.longitude + PLAYER_SPEED, goal.longitude);
  } else if (current.longitude > goal.longitude) {
    newLongitude = Math.max(current.longitude - PLAYER_SPEED, goal.longitude);
  }

  if (current.latitude < goal.latitude) {
    newLatitude = Math.min(current.latitude + PLAYER_SPEED, goal.latitude);
  } else if (current.latitude > goal.latitude) {
    newLatitude = Math.max(current.latitude - PLAYER_SPEED, goal.latitude);
  }

  return { longitude: newLongitude, latitude: newLatitude };
}

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
