import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const resultLike = await Like.aggregate([
    {
      $match: { video: req.user._id },
    },
    {
      $group: {
        _id: "$video",
        noOfLikes: { $sum: 1 },
      },
    },
  ]);

  const noOfLikes = resultLike.length > 0 ? resultLike[0].noOfLikes : 0;

  const resultSubscriber = await Subscription.aggregate([
    {
      $match: {
        channel: req.user._id,
      },
    },
    {
      $group: {
        _id: "$channel",
        noOfSubscriber: { $sum: 1 },
      },
    },
  ]);

  const noOfSubscriber =
    resultSubscriber.length > 0 ? resultSubscriber[0].noOfLikes : 0;

  const videos = await Video.aggregate([
    {
      $match: { owner: req.user._id },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: { fullName: 1, username: 1, email: 1, avatar: 1 },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$ownerDetails", 0] },
        noOfVideos: { $sum: 1 },
      },
    },
  ]);

  if (!videos) {
    throw new ApiError(404, "No videos found for this channel");
  }
  const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
  const noOfVideos = videos.length;

  const channelStats = {
    noOfLikes,
    noOfSubscriber,
    noOfVideos,
    totalViews,
    videos: videos,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, channelStats, "Data fetch succesfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const videos = await Video.aggregate([
    {
      $match: { owner: new mongoose.Types.ObjectId(req.user._id) },
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

  if (!videos.length) {
    throw new ApiError(404, "No videos found for this channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
