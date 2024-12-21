import dgram from "dgram";

export const server = dgram.createSocket('udp4');
