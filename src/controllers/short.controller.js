import mongoose, { isValidObjectId } from "mongoose";
import { Short } from "../models/Short.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import path from "path";

import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

const getAllShorts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all Shorts based on query, sort, pagination

  const matchConditions = {};
  matchConditions.isPublished = true;

  if (query) {
    matchConditions.title = { $regex: query, $options: "i" };
  }

  if (userId) {
    matchConditions.owner = userId;
  }

  const sortConditions = {};
  sortConditions[sortBy] = sortType === "desc" ? -1 : 1;

  const Shorts = await Short.find(matchConditions)
    .sort(sortConditions)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("owner", "fullName username avatar");

  const totalShorts = await Short.countDocuments(matchConditions);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        Shorts,
        totalPages: Math.ceil(totalShorts / limit),
        currentPage: parseInt(page),
      },
      "Shorts fetched successfully"
    )
  );
});

const publishAShort = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const ShortFilePthTypes = /\.(mp4|mkv|avi|mov)$/;
  const imageFiletypes = /\.(jpeg|jpg|png)$/;

  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!description) {
    throw new ApiError(400, "description is required");
  }

  if (!req.files?.ShortFile) {
    throw new ApiError(400, "Short is required");
  }

  const ShortFilePth = req.files?.ShortFile[0]?.path;
  const ShortFilePthType = path.extname(ShortFilePth);
  const isShort = ShortFilePthTypes.test(ShortFilePthType.toLowerCase());
  if (!isShort) {
    throw new ApiError(400, " Short extension must be MP4 MKV AVI MOV");
  }

  if (!req.files?.thumbnail) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const thumbnailFilePth = req.files?.thumbnail[0]?.path;
  const imageFileType = path.extname(thumbnailFilePth);
  const isImage = imageFiletypes.test(imageFileType.toLowerCase());

  if (!isImage) {
    throw new ApiError(400, "thumbnail extension must be PNG JPG JPEG ");
  }

  const ShortFile = await uploadOnCloudinary(ShortFilePth);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFilePth);

  if (!ShortFile) {
    throw new ApiError(400, "Short is required");
  }
  if (!thumbnailFile) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const Short = await Short.create({
    ShortFile: ShortFile.url,
    title,
    description,
    thumbnail: thumbnailFile.url,
    duration: ShortFile.duration,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, Short, "Short Publish Succesfully"));
});

const getShortById = asyncHandler(async (req, res) => {
  const { ShortId } = req.params;

  if (!ShortId) {
    throw new ApiError(400, "Short Id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(ShortId)) {
    throw new ApiError(400, "Invalid Short ID");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(400, "User not found");
  }
  if (!user.watchHistory.includes(ShortId)) {
    user.watchHistory.push(ShortId);
    await user.save({ validateBeforeSave: false });
    await Short.findByIdAndUpdate(
      ShortId,
      { $inc: { views: 1 } },
      { new: true }
    );
  }

  const Short = await Short.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(ShortId), isPublished: true },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: { fullName: 1, username: 1, email: 1, avatar: 1 },
          },
        ],
      },
    },
    {
      $addFields: { owner: { $arrayElemAt: ["$owner", 0] } },
    },
  ]);

  if (!Short) {
    throw new ApiError(400, "Short Id is Invalid");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, Short[0], "Short fected succesfully"));
});

const updateShort = asyncHandler(async (req, res) => {
  const { ShortId } = req.params;

  const { title, description } = req.body;
  console.log(req.file);
  const thumbnailPath = req.file?.path;

  if (!title && !description && !thumbnailPath) {
    throw new ApiError(400, "All fields are required");
  }

  if (!mongoose.Types.ObjectId.isValid(ShortId)) {
    throw new ApiError(400, "Invalid Short ID");
  }

  const ShortOwner = await Short.findById(new mongoose.Types.ObjectId(ShortId));
  if (!ShortOwner) {
    throw new ApiError(404, "Short not found");
  }

  if (ShortOwner.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this Short"
    );
  }

  const Short = await Short.findByIdAndUpdate(
    ShortId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnailPath,
      },
    },
    { new: true }
  );
  if (!Short) {
    throw new ApiError(404, "Short not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, Short, "Short update succesfully"));
});

const deleteShort = asyncHandler(async (req, res) => {
  const { ShortId } = req.params;

  if (!ShortId) {
    throw new ApiError(400, "Short Id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(ShortId)) {
    throw new ApiError(400, "Invalid Short ID");
  }

  const ShortOwner = await Short.findById(new mongoose.Types.ObjectId(ShortId));
  if (!ShortOwner) {
    throw new ApiError(404, "Short not found");
  }

  if (ShortOwner.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this Short"
    );
  }

  const Short = await Short.findByIdAndDelete(ShortId);

  if (!Short) {
    throw new ApiError(400, "Short is Not deleted");
  }

  await Like.deleteMany({ Short: ShortId });
  await Comment.deleteMany({ Short: ShortId });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Short deleted succesfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { ShortId } = req.params;

  if (!ShortId) {
    throw new ApiError(400, "ShortId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(ShortId)) {
    throw new ApiError(400, "Invalid Short ID");
  }

  const Short = await Short.findById(new mongoose.Types.ObjectId(ShortId));
  if (!Short) {
    throw new ApiError(404, "Short not found");
  }

  if (Short.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this Short"
    );
  }
  Short.isPublished = !Short.isPublished;
  await Short.save({ validateBeforeSave: false });

  const message = Short.isPublished
    ? "Short is Published Successfully"
    : "Short is Unpublished Successfully";

  return res.status(200).json(new ApiResponse(200, Short, `${message}`));
});

export {
  getAllShorts,
  publishAShort,
  getShortById,
  updateShort,
  deleteShort,
  togglePublishStatus,
};
