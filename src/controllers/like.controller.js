import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const ExestedLike = await Like.findOne({
    $and: [
      { video: videoId },
      {
        likedBy: req.user._id,
      },
    ],
  });
  if (ExestedLike) {
    const deletedLike = await Like.findByIdAndDelete(ExestedLike._id);

    if (!deletedLike) {
      throw new ApiError(400, "liked not unliked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video unliked succesfully"));
  }

  const likedLike = await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });
  if (!likedLike) {
    throw new ApiError(400, "liked not liked");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video liked succesfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  
  if (!commentId) {
    throw new ApiError(400, "commentId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const ExestedLike = await Like.findOne({
    $and: [
      { comment: commentId },
      {
        likedBy: req.user._id,
      },
    ],
  });
  if (ExestedLike) {
    const deletedLike = await Like.findByIdAndDelete(ExestedLike._id);

    if (!deletedLike) {
      throw new ApiError(400, "liked not unliked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "comment unliked succesfully"));
  }

  const likedLike = await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });
  if (!likedLike) {
    throw new ApiError(400, "liked not liked");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment liked succesfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!tweetId) {
    throw new ApiError(400, "tweetId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const ExestedLike = await Like.findOne({
    $and: [
      { tweet: tweetId },
      {
        likedBy: req.user._id,
      },
    ],
  });
  if (ExestedLike) {
    const deletedLike = await Like.findByIdAndDelete(ExestedLike._id);

    if (!deletedLike) {
      throw new ApiError(400, "liked not unliked");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "tweet unliked succesfully"));
  }

  const likedLike = await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  if (!likedLike) {
    throw new ApiError(400, "liked not liked");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "tweet liked succesfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {


  const likedVideos = await Like.aggregate([
    {
      $match: { likedBy: new mongoose.Types.ObjectId(req.user._id) },
    },
    {
      $lookup: {
        from: "videos", 
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
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
                    email: 1,
                    username: 1,
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
    {
      $unwind: "$likedVideos",
    },
    {
      $replaceRoot: { newRoot: "$likedVideos" },
    },
  ]);
  
  if (!likedVideos.length) {
    throw new ApiError(400, "Liked videos not found");
  }
  
  return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
  
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
