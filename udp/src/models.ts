import { z } from 'zod';

export enum EventType {
  HELLO = 'hello',
  MOVE = 'move',
  STATUS = 'status',
  MARK = 'mark',
}

export enum Mark {
  MISS = 'miss',
  PERFECT = 'perfect',
  GOOD = 'good',
  BAD = 'bad',
}

export enum PlayerStatus {
  IDLE = 'idle',
  DANCING = 'dancing',
}

export const BaseMessageSchema = z.object({
  userId: z.string().nonempty(),
  contents: z.any(),
  event: z.string().nonempty(),
  hmac: z.string().nonempty(),
});

export type TBaseMessage = z.infer<typeof BaseMessageSchema>;

export const HelloMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.HELLO),
  contents: z.string(),
});

export type TConnectionMessage = z.infer<typeof HelloMessageSchema>;

export const MoveMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.MOVE),
  contents: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type TMoveMessage = z.infer<typeof MoveMessageSchema>;

export const StatusMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.STATUS),
  contents: z.nativeEnum(PlayerStatus),
});

export type TStatusMessage = z.infer<typeof StatusMessageSchema>;

export const MarkMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.MARK),
  contents: z.nativeEnum(Mark),
});

export type TMarkMessage = z.infer<typeof MarkMessageSchema>;

export const PlayerStateSchema = z.object({
  userId: z.string().nonempty(),
  username: z.string().nonempty(),
  locationId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  isMain: z.boolean(),
  status: z.nativeEnum(PlayerStatus),
  lastMark: z.nativeEnum(Mark).optional(),
  color: z.string().optional(),
});

export type TPlayerState = z.infer<typeof PlayerStateSchema>;

export const SongStateSchema = z.object({
  id: z.string().nonempty(),
  title: z.string().nonempty(),
  bpm: z.number(),
  onset: z.number(),
  startTimestamp: z.number(),
});

export type TSongState = z.infer<typeof SongStateSchema>;

export const GameStateSchema = z.object({
  players: z.array(PlayerStateSchema),
  song: SongStateSchema.optional(),
  arrowCombination: z.array(z.string()).optional(),
  locationTitle: z.string(),
  scores: z.record(z.string(), z.number()).optional(),
});

export type TGameState = z.infer<typeof GameStateSchema>;

export const playerColors = ['green', 'lavender', 'yellow', 'maroon', 'white'];
