import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1. get user detail from frontend
  const { fullname, email, username, password } = req.body;
  console.log("email : ", email, fullname, username);

  // 2.check validations
  // normall way to check validation

  //   if (fullname === "") {
  //     throw new ApiError(404, "fullname is required");
  //   }

  // advance way to check validation // multiple at once

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
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
  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath || avatarLocalPath == undefined) {
    throw new ApiError(400, "Avatar File is required");
  }

  // let avatarLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.avatarLocalPath) &&
  //   req.files.avatarLocalPath.length > 0
  // ) {
  //   avatarLocalPath = req.files.coverImage[0].path;
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
  console.log("done");

  return res
    .status(201)
    .json(new ApiResponse(200, "User Registered Successfully"));
});

export { registerUser };
