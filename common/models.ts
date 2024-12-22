export const USER_HASH_PREFIX = 'user';
export const LOCATION_HASH_PREFIX = 'location';

export const buildUserHash = (id: string) => `${USER_HASH_PREFIX}:${id}`;
export const buildLocationHash = (id: string) => `${LOCATION_HASH_PREFIX}:${id}`;

export const SESSION_HASH_KEY = 'token';
export const USERNAME_HASH_KEY = 'username';
export const LATITUDE_HASH_KEY = 'latitude';
export const LONGITUDE_HASH_KEY = 'longitude';
export const LOCATION_ID_HASH_KEY = 'location_id';
export const STATUS_HASH_KEY = 'status';
export const LAST_MOVE_HASH_KEY = 'last_move';

export const TITLE_HASH_KEY = 'title';
export const SONG_HASH_KEY= 'song';
export const ARROWS_HASH_KEY = 'arrow_combination';
export const PLAYERS_HASH_KEY = 'players';