import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRECT,
    });
    
    const uploadOnCloudinary =async (localFilePath)=>{
        try {
            if(!localFilePath) return null;
           const response=await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto"
            })
            //file has uploaded successfully
           console.log("File is Uploaded on Cloudinary " ,response);
           if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
            return response;
            
        } catch (error) {
            fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
            return null;
        }
    }

    const deleteFromCloudinary=async(FileId)=>{
        try {
            if (!publicId) return null;
    
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: "image"
            });
    
            console.log("Old avatar Image from Cloudinary:", result);
            return result;
        } catch (error) {
            console.error("Failed to delete old avatar image:", error);
            return null;
        }
    };
    

export {uploadOnCloudinary,deleteFromCloudinary};