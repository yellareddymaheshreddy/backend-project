import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { application } from "express";

const generateAccessAndRefreshTokens=async (userId) => {
    try {
        const user=await User.findOne(userId)
        const AccessToken=user.generateAccessToken()
        // console.log("hurrai",AccessToken)
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken;
        const res= await user.save({validateBeforeSave:false})
        // console.log({AccessToken,refreshToken},"puchuk")
        return {AccessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something wrong generatig access and refresh token")
    }
}

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

const loginUser=asyncHandler(async (req,res)=>{
    // req body data
    // username or email
    // find the user
    // password check
    // access & refresh token
    // send cookie
    //response success

    const {email,username,password}=req.body;
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(400,"user doesnt exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }
    const {AccessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res.
    status(200)
    .cookie("accessToken",AccessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,AccessToken,
                refreshToken
            },"user logged in successfully"
        )
    )

})
const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            },
        },{
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"userlogged out sucess"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const inputToken=req.cookies?.refreshToken || req.body.refreshToken
    if(!inputToken){
        throw new ApiError(400,"Unauthorised token")
    }
    try {
        const data=jwt.verify(inputToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(data?._id)
        if(!user){
            throw new ApiError(400,"Invalid refresh token")
        }
        if(inputToken !==user.refreshToken){
            throw new ApiError(400,"Refresh token is expired or used")
        }
        const options={
            httpOnly:true,
            secure:true
        }
        const {AccessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
        console.log('object',{AccessToken,refreshToken})
        res.status(200)
        .cookie("accessToken",AccessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,
                {AccessToken,refreshToken},
                "refresed token")
        )
    } catch (error) {
        throw new ApiError(400,error?.message||"something went wrong while refresh ing token")
    }
});

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;
    const user=await User.findById(req.user?._id)
    const ispasswordcorrect=await user.isPasswordCorrect(oldPassword)
    if(!ispasswordcorrect){
        throw new ApiError(400,"invalid password")
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false})
    return res

})

const getCurrentUser=asyncHandler(async(req,res)=>{
     return req
     .status(200)
     .json(200,req.user,"fetched success")
})

const updateUserDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body;
    if(!fullName||!email){
        throw new ApiError(400,"All fields are required")
    }
    const user= await User.findByIdAndUpdate(req.user?._id
        ,{$set:{fullName,email}},
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"updated sucessfully"))
})
const updateUserAvatar=asyncHandler(async(req,res)=>{
    const localAvatarFile=req.file?.path
    if(!localAvatarFile){
        throw new ApiError(400,"Avatar file is not uploaded")
    }
    const url=await uploadOnCloudinary(localAvatarFile);

    const user=await User.findByIdAndUpdate(req.user._id,
        {$set:{avatar:url.url}},
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"uploaded successfully")
    )
})
const updateCoverImage=asyncHandler(async(req,res)=>{
    const localCoverImage=req.file?.path
    if(!localCoverImage){
        throw new ApiError(400,"Cover Image file is not uploaded")
    }
    const url=await uploadOnCloudinary(localCoverImage);
    if(!url){
        throw new ApiError(400,"something went wrong while uploading to server")
    }

    const user=await User.findByIdAndUpdate(req.user._id,
        {$set:{coverImage:url.url}},
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"uploaded successfully")
    )
})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUserDetails}


