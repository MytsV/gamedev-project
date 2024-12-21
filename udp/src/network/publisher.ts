import dgram from "dgram";
import {server} from "./server.js";
import {clearInterval} from "node:timers";

const ongoingPublishing = new Map<string, NodeJS.Timeout>();

export const startPublishingState = (userId: string, rinfo: dgram.RemoteInfo) => {
  const publishInterval = 1000; // 1 Hz for testing, change for the real application

  const remoteIdentifier = `${rinfo.address}:${rinfo.port}`;
  const previousIntervalId = ongoingPublishing.get(remoteIdentifier);
  if (previousIntervalId) {
    clearInterval(previousIntervalId);
  }

  const intervalId = setInterval(() => {
    server.send(`Hi, ${userId}`, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.log(`Could not publish the state to the user ${userId}`);
      }
    });
  }, publishInterval);

  ongoingPublishing.set(remoteIdentifier, intervalId);
}
