import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    // access the token from the header or from req.cookie
    // decode cookie using jwt
    // find user using decoded user id
    //inject this user to req.user

    // Authorization: Bearer <token>

    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});
