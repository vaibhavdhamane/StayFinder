const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log("Cloudinary config check:", {
    cloud_name: process.env.CLOUD_NAME,
    api_key_exists: !!process.env.CLOUD_API_KEY,
    api_secret_exists: !!process.env.CLOUD_API_SECRET
});

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.CLOUD_API_KEY,
    api_secret : process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'stayfinder_DEV',
    allowedFormats: ["png","jpg","jpeg"], // supports promises as well
   
  },
});

module.exports = {
    cloudinary,
    storage,
};