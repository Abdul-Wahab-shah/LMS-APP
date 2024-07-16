// import { Response } from "express";
import userModel from "../model/user_model";

// get user by id
const getUserById=(async(_id:string) => {
        const user= await userModel.findById(_id)
        if (!user) {
          throw new Error('User not found');
        }
})

export default getUserById;