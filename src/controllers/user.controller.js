import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {deleteFromCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import  jwt from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const  user = await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token ")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullname, email, username, password } = req.body
    // console.log("This Req.body:",req.body ,"/n");
    
    //console.log("email: ", email);

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);
    // console.log("workinng fine till here");
    
    const avatarLocalPath = req.files ?.avatar[0] ?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log("This Req.files:",req.files ,"/n");
    

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required2")
    }
   

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req,res) =>{
    // req body from frontend
    // check fields 
    // find username or email
    //check password
    //Access and refresh token
    //send cookie 
    const {username,email,password}=req.body

    if(!username && !email){
        throw new ApiError(400,"user or email is required");
    }
    //finding user
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exists");
    }
    // checking password
    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(404,"User does not exists");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

    const loggedInUser=await User.findById(user._id)
    .select("-password -refreshToken")

    const option={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )



})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {new:true}
    )

    const option={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200,{},"User logged out successfully"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookie.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request");
    }
     
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired ")
        }
    
        const option={
            httpOnly:true,
            secure:true
        }
    
       const {accessToken,newRefreshToken}= await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
            new ApiResponse(200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} =req.body

    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(201,{},"Password Changed Successfully"))
})

const getCurrentUser =asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"Current User Fetched Successfully")
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are Required");
    }

   const user =await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },
        {new:true}
    ).select()

    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{

    const oldavatarurl =req.user?.avatar;
    if(!oldavatarurl){
        throw new ApiError(500,"OldAvatar not Found")
    }
    const urlArray=oldavatarurl.split("/");
    console.log(urlArray);
    const image=urlArray[urlArray-1]
    console.log(image);
    const imageName=image.split(".")[0]
    console.log(imageName);
    
    const avatarLocalPath=req.file?.path
    
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is Required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uloading on avatar");
    }

    try {
        deleteFromCloudinary(imageName)
    } catch (error) {
        throw new ApiError(500,"Image from cloudinary not deleted ")
    }

   const user= await User.findByIdAndUpdate(req.user?._id,{
        $set:{avatar:avatar.url}
    },
{new:true}).select("-password")
return res.status(200)
.json(new ApiResponse(200,user,"Cover Image updated Successfully"))
})


const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Avatar file is Required")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uloading on avatar");
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{coverImage:coverImage.url}
    },
    {new:true})
    .select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Cover Image updated Successfully"))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }

    // User.find({username})

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
            },
            {
            $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscriber"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$subscribers.subscriber"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullname:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1


            }
        }
        
    ])

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0],"User data fetched Successfull")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.mongo.ObjectId.createFromHexString(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[{
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[{
                            $project:{
                                fullName:1,
                                username:1,
                                avatar:1
                            }
                        },
                        
                    ]
                    }
                },
            {
                $addFields:{
                    owner:{
                        $first:"owner"
                    }
                }
            }]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch history Fetch Successfully")
    )
})

export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
    getUserChannelProfile,
getWatchHistory}