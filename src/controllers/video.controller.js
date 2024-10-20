import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import path from "path";

import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const videoFilePthTypes = /\.(mp4|mkv|avi|mov)$/;
  const imageFiletypes = /\.(jpeg|jpg|png)$/;

  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!description) {
    throw new ApiError(400, "description is required");
  }

  if (!req.files?.videoFile) {
    throw new ApiError(400, "video is required");
  }

  const videoFilePth = req.files?.videoFile[0]?.path;
  const VideoFilePthType = path.extname(videoFilePth);
  const isVideo = videoFilePthTypes.test(VideoFilePthType.toLowerCase());
  if (!isVideo) {
    throw new ApiError(400, " Video extension must be MP4 MKV AVI MOV");
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

  const videoFile = await uploadOnCloudinary(videoFilePth);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFilePth);

  if (!videoFile) {
    throw new ApiError(400, "video is required");
  }
  if (!thumbnailFile) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    title,
    description,
    thumbnail: thumbnailFile.url,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Publish Succesfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video Id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(400, "User not found");
  }
  if (!user.watchHistory.includes(videoId)) {
    user.watchHistory.push(videoId);
    await user.save({ validateBeforeSave: false });
    await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } }, 
      { new: true }
    );
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
                    email: 1,
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

  if (!video) {
    throw new ApiError(400, "Video Id is Invalid");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fected succesfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { title, description } = req.body;
  console.log(req.file);
  const thumbnailPath = req.file?.path;

  if (!title && !description && !thumbnailPath) {
    throw new ApiError(400, "All fields are required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoOwner = await Video.findById(new mongoose.Types.ObjectId(videoId));
  if (!videoOwner) {
    throw new ApiError(404, "Video not found");
  }

  if (videoOwner.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this video"
    );
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnailPath,
      },
    },
    { new: true }
  );
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video update succesfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video Id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoOwner = await Video.findById(new mongoose.Types.ObjectId(videoId));
  if (!videoOwner) {
    throw new ApiError(404, "Video not found");
  }

  if (videoOwner.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this video"
    );
  }

  const video = await Video.findByIdAndDelete(videoId);

  if (!video) {
    throw new ApiError(400, "Video is Not deleted");
  }

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted succesfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(new mongoose.Types.ObjectId(videoId));
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "Authentication Failed: You are not authorized to update this video"
    );
  }
  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  const message = video.isPublished
    ? "Video is Published Successfully"
    : "Video is Unpublished Successfully";

  return res.status(200).json(new ApiResponse(200, video, `${message}`));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
