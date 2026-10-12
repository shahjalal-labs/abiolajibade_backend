import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { messageService } from "./message.service";

const generateFileUrl = catchAsync(async (req, res) => {
  const fileUrl = await messageService.urlGenerate(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "File URL generated successfully",
    data: fileUrl,
  });
});



export const messageControllers = {
  generateFileUrl,
  
};
