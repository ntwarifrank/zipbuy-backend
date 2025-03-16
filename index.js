import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import productSchema from "./productSchema.js";
import { v2 as cloudinary } from "cloudinary";
import stream from "stream";
import cookieParser from "cookie-parser";
import {
  register,
  login,
  verifyEmail,
  adminLogin,
  AdminRegister,
  getUserData
} from "./userController/usercontroller.js";
import {
  searchedProduct,
  allProduct,
  Product,
  deleteProduct,
  updateProduct,
  specificProduct,
  placeOrder,
  paymentIndent,
} from "./productController/productController.js";
import profileData from "./utils/verifyToken.js";

const app = express();
const port = process.env.PORT || 5000;
const router = express.Router();
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage(); 
const upload = multer({ storage });

//const upload = multer({ dest: "/uploads" });

const corsOptions = {
  origin: [
    "https://zipbuy-admin.vercel.app",
    "https://zipbuy.vercel.app",
    "http://localhost:3000", 
    "http://localhost:3001"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(router);

mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database connected"))
  .catch((error) => console.log("Database connection failed:", error));
  

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/adminlogin", adminLogin);
router.post("/adminregister", AdminRegister);
router.post("/createproduct", upload.array("images", 50), async (req, res) => {
  try {
    const { productName, productPrice, productQuantity, productCategory, productDiscount, productDescription, productShipping } = req.body;

    // Ensure all required fields are provided
    if (!productName || !productPrice || !productQuantity || !productCategory || !productDiscount || !productDescription || !productShipping) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Ensure at least one image is uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images were uploaded" });
    }

    const uploadedImageUrls = [];

    // Upload each image to Cloudinary
    for (const file of req.files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);

        // Upload the image to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "uploads" },
          (error, result) => {
            if (error) {
              reject(error); // Reject if there's an error
            } else {
              resolve(result); // Resolve if upload is successful
            }
          }
        );

        // Pipe the file buffer to Cloudinary upload stream
        bufferStream.pipe(uploadStream);
      });

      // Push the secure URL of the uploaded image
      uploadedImageUrls.push(uploadResult.secure_url);
    }

    // Parse shipping details (if stringified)
    const shippingDetails = typeof productShipping === "string" ? JSON.parse(productShipping) : productShipping;

    // Create a new product in the database
    const createdProduct = await productSchema.create({
      productName,
      productPrice,
      productQuantity,
      productCategory,
      productDiscount,
      productDescription,
      productImages: uploadedImageUrls,
      productShipping: shippingDetails,
    });

    return res.status(200).json({ success: true, message: "Product created successfully", data: createdProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});


router.get("/allproducts", allProduct);
router.get("/product/:id", Product);
router.delete("/delete/:id", deleteProduct);
router.put("/updateproduct/:id", updateProduct);
router.post("/specificproduct", specificProduct);
router.post("/placeorder", placeOrder);
router.post("/payment-intent", paymentIndent);
router.get("/profile", profileData, getUserData);
router.post("/search", searchedProduct);
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", { httpOnly: true, secure: false });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error logging out", error });
  }
});

app.get("/", (req, res) => {
  res.send("Hello from Express on Vercel!");
});

app.listen(port, () => console.log(`Server running on port http://localhost:${port}`));


export default app;












