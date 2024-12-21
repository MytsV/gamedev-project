export const USER_HASH_PREFIX = 'user';

export const buildUserHash = (id: string) => `${USER_HASH_PREFIX}:${id}`;

export const SESSION_HASH_KEY = 'token';
export const LATITUDE_HASH_KEY = 'latitude';
export const LONGITUDE_HASH_KEY = 'longitude';
