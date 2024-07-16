require('dotenv').config();
import connectDB from './utils/db';
import { app } from './app';
import {v2 as cloudinary} from "cloudinary"

const PORT = process.env.PORT || 3000;


// cloudinary config
cloudinary.config({
cloud_name:process.env.CLOUD_NAME,
api_key:process.env.CLOUD_API_KEY,
api_secret:process.env.CLOUD_SECRET_KEY,
})



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
