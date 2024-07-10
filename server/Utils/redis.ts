import { Redis } from "ioredis";
require("dotenv").config()

const redisClient=()=>{
    if(process.env.REDIS){
console.log("Redis connected")
return process.env.REDIS
    }
    throw new Error ("Redis not connected")
}

export const  redis= new Redis(redisClient());