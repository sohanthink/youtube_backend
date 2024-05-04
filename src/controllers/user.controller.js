import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const genareteAccessAndRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while genarating tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // 1. get user detail from frontend
    const { fullname, email, username, password } = req.body;

    // 2.check validations
    // normall way to check validation

    //   if (fullname === "") {
    //     throw new ApiError(404, "fullname is required");
    //   }

    // advance way to check validation // multiple at once

    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(404, "All fields are required");
    }

    //   checking if the user is alredy exited or not?

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User already existed");
    }

    // check if the avatar is uploaded or not?
    // const avatarLocalPath = req.files?.avatar[0]?.path;

    let avatarLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    ) {
        avatarLocalPath = req.files.avatar[0].path;
    } else {
        throw new ApiError(400, "Avatar File is required");
    }

    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar File is required");
    // }

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const user = await User.create({
        fullname,
        // avatar: avatar.url,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(201)
        .json(new ApiResponse(200, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new ApiError(401, "Username or Email required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(400, "Credential Doesent matched!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(409, "password Doesent matched");
    }

    const { accessToken, refreshToken } = await genareteAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User loggedIn succesfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const userid = req.user._id.toString();
    await User.findByIdAndUpdate(
        userid,

        {
            $unset: {
                refreshToken: 1, //remove the field from the document
            },
        },
        { new: true }
    );
    // console.log(userid);
    const options = {
        httpOnly: true,
        secure: true,
    };

    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    res.status(200).json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (res, req) => {
    // took the cookies from client
    // decode this token with the env secret
    // find user using the refreshtoken id with scema
    // match the userrefrsh token with this server comin token
    //  genarete new token and send it as cookies on res\

    const incomingRefreshToken =
        req.body.refreshToken || req.cookiees.refreshToken;

    try {
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unathuthoriuzed Refresh Token");
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "RefreshToken us expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, NewRefreshToken } =
            await genareteAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", NewRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: NewRefreshToken,
                        options,
                    },
                    "Access Token Refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // take old pass and new pass from user
    //ifnd the exsisting user using jwt/req.user
    // check passowrd
    // save the new pass to the databse
    //response
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
