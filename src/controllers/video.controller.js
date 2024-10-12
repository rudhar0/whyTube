import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import path from "path";
import { log } from "console";

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
  log(req.files);

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

  console.log(videoFile);

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
  //TODO: get video by id

  const video = await Video.findById(mongoose.Types.ObjectId(videoId))
  console.log(video)
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
