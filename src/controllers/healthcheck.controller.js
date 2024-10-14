import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  try {
    return res.status(200).json(new ApiResponse(200, {}, "Hello World"));
  } catch (error) {
    throw new ApiError(400, `${error?.message}`);
  }
});

export { healthcheck };
