import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(400, "tweet not created");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet created succesfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const UserTweet = await Tweet.aggregate([
    { $match: { owner: req.user._id } },
  ]);

  if (!UserTweet) {
    throw new ApiError(404, "tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, UserTweet, "tweet founded succesfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId) {
    throw new ApiError(400, "tweet ID Not found");
  }
  if (!content) {
    throw new ApiError(400, "content is required ");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const tweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user._id },
    { content },
    { new: true, runValidators: true }
  );

  if (!tweet) {
    throw new ApiError(400, "tweet not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "tweet Updated succesfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params;


  if (!tweetId) {
    throw new ApiError(400, "tweet ID Not found");
  }


  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(400, "tweet not found");
  }

  await Like.deleteMany({ tweet: tweetId });

  return res
    .status(200)
    .json(new ApiResponse(201, {}, "tweet Deleted succesfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
