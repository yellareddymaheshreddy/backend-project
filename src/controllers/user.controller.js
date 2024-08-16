import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser=asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation - not empty
    //check if user already exist:username,email
    //check for images, check for avatar
    // upload them to cloudinary,avatar
    //create user object - create entry in db
    //remove password,refreshTokenField from response
    // check for user createion 
    // return res

    const {fullName,email,username,password}=req.body;
    console.log(email)

    if([fullName,email,username,password].some((field)=>
    field?.trim()==="")){
        throw new ApiError(400,"fullName is required")
    }

    const existedUser=await User.findOne({
        $or :[{username},{email}]})
    if(existedUser){
        console.log(existedUser,"existed user")
        throw new ApiError(409,"User name or email exists")
    }


    console.log("req.files",req.files)
    const avatarLocalPath=req.files?.avatar[0]?.path
    // const coverImagePath=req.files?.coverImage[0]?.path
    let coverImagePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImagePath =req.files.coverImage[0].path
        console.log("cip",coverImagePath)
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avathar image is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    console.log(avatar)
    const coverImage=await uploadOnCloudinary(coverImagePath)
    console.log(coverImage,"cci")

    if(!avatar){
        throw new ApiError(400,"avatar imag not found in cloudinary")
    }

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    console.log("user",user)
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    console.log("createduser",createdUser)
    if(!createdUser){
        throw new ApiError(500,"something went wrong wile registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )


})

export {registerUser}


