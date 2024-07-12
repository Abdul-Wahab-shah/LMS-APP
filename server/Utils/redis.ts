import { Redis } from "@upstash/redis";

require('dotenv').config();

const redisClient = () => {
    if(process.env.REDIS_URL){
        console.log(`Redis connected`);
        return process.env.REDIS_URL;
    }
    throw new Error('Redis connection failed');
};

export const redis = new Redis({
    url: 'https://careful-mackerel-56857.upstash.io',
    token: 'Ad4ZAAIncDE1MjA4N2Q0ZWUzNGY0MTk4ODgyY2UyNTUwZDkxZWMzMHAxNTY4NTc',
  })
// console.log("redissun------------1")
const runRedis = async () =>{
    // console.log("redissun------------2")
    await redis.set('foo', 'bar');
}


runRedis();
// console.log("redissun------------3")
