import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import generatePassword from "generate-password";
import { transporter } from "../app.js";

const GetMailOption = (recipientAddress, subject, text, url, password) => {
  return {
    from: process.env.GMAIL_EMAIL,
    to: recipientAddress,
    subject: subject,
    text: `${text}\nVerification URL: ${url}\nYour password is: ${password}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6em; background-color: #e9ecef; padding: 60px;">
        <div style="max-width: 700px; margin: 0 auto; padding: 40px; border-radius: 10px; background: #ffffff; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <header style="text-align: center; border-bottom: 2px solid #007BFF; padding-bottom: 20px;">
            <img src="https://yourcompanylogo.com/logo.png" alt="Company Logo" style="width: 120px; margin-bottom: 20px;">
            <h2 style="color: #007BFF; margin: 0; font-size: 24px;">${subject}</h2>
          </header>
          <main style="padding: 20px;">
            <p style="font-size: 1.1em; color: #333;">${text}</p>
            <p style="font-weight: bold; color: #555;">Verification URL:</p>
            <p>
              <a href="${url}" style="display: inline-block; padding: 12px 25px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s;">Verify your email</a>
            </p>
            <div style="background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-top: 20px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
              <p style="font-weight: bold; color: #d9534f;">Your password is:</p>
              <p style="font-size: 1.2em; text-align: center; color: #333; padding: 10px; border: 1px dashed #d9534f; border-radius: 5px;"><strong>${password}</strong></p>
            </div>
          </main>
          <footer style="text-align: center; padding-top: 20px; border-top: 2px solid #007BFF; color: #777; font-size: 0.9em;">
            <p>If you have any questions, feel free to <a href="mailto:${process.env.GMAIL_EMAIL}" style="color: #007BFF; text-decoration: none;">contact us</a>.</p>
            <hr style="border: none; border-top: 1px solid #ddd;" />
            <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </footer>
        </div>
      </div>
    `,
  };
};

const GetMailOptionForPasswordReset = (
  recipientAddress,
  subject,
  text,
  url
) => {
  return {
    from: process.env.GMAIL_EMAIL,
    to: recipientAddress,
    subject: subject,
    text: `${text}\nVerification URL: ${url}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6em; background-color: #f4f4f4; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background: #ffffff; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <header style="text-align: center; border-bottom: 2px solid #007BFF; padding-bottom: 20px;">
            <img src="https://yourcompanylogo.com/logo.png" alt="Company Logo" style="width: 120px; margin-bottom: 20px;">
            <h2 style="color: #007BFF; margin: 0; font-size: 26px; font-weight: bold;">${subject}</h2>
          </header>
          <main style="padding: 20px;">
            <p style="font-size: 1.1em; color: #333; margin-bottom: 20px;">${text}</p>
            <p style="font-weight: bold; color: #555; margin-bottom: 10px;">Verification URL:</p>
            <p>
              <a href="${url}" style="display: inline-block; padding: 12px 25px; background-color: #007BFF; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);">Verify your email</a>
            </p>
          </main>
          <footer style="text-align: center; padding-top: 20px; border-top: 2px solid #007BFF; color: #777; font-size: 0.9em;">
            <p>If you have any questions, feel free to <a href="mailto:${process.env.GMAIL_EMAIL}" style="color: #007BFF; text-decoration: none;">contact us</a>.</p>
            <hr style="border: none; border-top: 1px solid #ddd;" />
            <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </footer>
        </div>
      </div>
    `,
  };
};

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;

  const usernameRegex = /^[a-zA-Z0-9_]+$/;

  if ([fullName, email, username].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const password = generatePassword.generate({
    length: 12,
    numbers: true,
  });

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  if (!usernameRegex.test(username)) {
    throw new ApiError(
      400,
      "Username can only contain letters, numbers, and underscores"
    );
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const verificationToken = uuidv4();
  const verificationUrl =
    "http://your-frontend-domain.com/verify?token=${verificationToken}";

  try {
    transporter.sendMail(
      GetMailOption(
        email,
        "Email Verification",
        "Please verify your account.",
        verificationUrl,
        password
      ),
      (error, mailResponse) => {
        if (error)
          if (error) {
            console.log(error);
          }
        console.log(mailResponse);
      }
    );
  } catch (error) {
    throw new ApiError(
      400,
      "Error occurred while sending verification email.",
      error
    );
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    emailVerificationToken: verificationToken,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, {}, "User verification sended to mail Successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
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
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  //TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

const verifiedUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const user = await User.findOne({
    emailVerificationToken: verificationToken,
  }).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(400, "Invalid verification token");
  }

  user.isVerified = true;
  user.emailVerificationToken = null;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, user, "User verified successfully"));
});

const RequestResetPasswordOrVerfiyUser = asyncHandler(async (req, res) => {
  const { email, username } = req.body;

  if (!email && !username) {
    throw new ApiError(200, "username or email is required");
  }

  const user = await User.findOne({
    $or: [
      {
        email,
      },
      {
        username,
      },
    ],
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const password = generatePassword.generate({
    length: 12,
    numbers: true,
  });

  const userEmail = user.email;

  const verificationToken = uuidv4();
  if (!user.isVerified) {
    console.log(verificationToken);
    const verificationUrl =
      "http://your-frontend-domain.com/verify?token=${verificationToken}";

    try {
      transporter.sendMail(
        GetMailOption(
          userEmail,
          "Email Verification",
          "Please verify your account.",
          verificationUrl,
          password
        ),
        (error, mailResponse) => {
          if (error)
            if (error) {
              console.log(error);
            }
          console.log(mailResponse);
        }
      );
    } catch (error) {
      throw new ApiError(
        400,
        "Error occurred while sending verification email.",
        error
      );
    }

    user.emailVerificationToken = verificationToken;
    user.password = password;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "varification email send succesfully"));
  }

  const verificationUrlPassword =
    "http://your-frontend-domain.com/reset-password?token=${verificationToken}";

  try {
    transporter.sendMail(
      GetMailOptionForPasswordReset(
        userEmail,
        "Email Verification",
        "Please verify your account.",
        verificationUrlPassword
      ),
      (error, mailResponse) => {
        if (error)
          if (error) {
            console.log(error);
          }
        console.log(mailResponse);
      }
    );
  } catch (error) {
    throw new ApiError(
      400,
      "Error occurred while sending verification email.",
      error
    );
  }

  user.emailVerificationToken = verificationToken;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "varification email send succesfully"));
});

const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const { verificationToken } = req.params;

  const user = await User.findOne({
    emailVerificationToken: verificationToken,
  });
  if (!user) {
    throw new ApiError(400, "Invalid verification token");
  }

  if (!newPassword) {
    throw new ApiError(400, "password is required");
  }

  user.password = newPassword;
  user.emailVerificationToken = null;
  await user.save({ validateBeforeSave: false });

  const Updateduser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, Updateduser, "Password changed successfully"));
});

const isValidUser = asyncHandler(async (req, res) => {
  const { email, username } = req.body;
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!email && !username) {
    throw new ApiError(400, "filed is required");
  }
  if (email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(400, "User not found");
    }
    return res.status(200).json(new ApiResponse(200, user, "user is verified"));
  }
  if (username) {
    if (!usernameRegex.test(username)) {
      throw new ApiError(
        400,
        "Username can only contain letters, numbers, and underscores"
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw new ApiError(400, "User not found");
    }
    return res.status(200).json(new ApiResponse(200, user, "user is verified"));
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  verifiedUser,
  RequestResetPasswordOrVerfiyUser,
  resetUserPassword,
  isValidUser
};
