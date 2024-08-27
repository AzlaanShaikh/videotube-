import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_NAME, 
        api_key:CLOUDINARY_API_KEY, 
        api_secret: CLOUDINARY_API_SECRECT
    });
    
    const uploadOnCloudinary =async (localFilePath)=>{
        try {
            if(!localFilePath) return null;
           const response=await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto"
            })
            //file has uploaded successfully
            console.log("File is Uploaded on Cloudinary " ,response.url);
            return response;
            
        } catch (error) {
            fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
            return null;
        }
    }

export {uploadOnCloudinary};