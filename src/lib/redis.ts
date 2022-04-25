import redis from "redis";
import { promisify } from "util";

const REDIS_INDICES = {
  auth: 0,
  mail: 1,
};

const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

// TODO: Extend
function createAsyncClient(client: redis.RedisClient) {
  return {
    get: promisify(client.get).bind(client),
    set: promisify(client.set).bind(client),
  };
}

// ----------------- //
// Redis auth client //
// ----------------- //

const auth = redis.createClient({ host: REDIS_HOST, port: REDIS_PORT });

auth.select(REDIS_INDICES.auth);

// ----------------- //
// Redis mail client //
// ----------------- //

const mail = redis.createClient({ host: REDIS_HOST, port: REDIS_PORT });

mail.select(REDIS_INDICES.mail);

export const authClient = createAsyncClient(auth);
export const mailClient = createAsyncClient(mail);
