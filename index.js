import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import productSchema from "./productSchema.js";
import { v2 as cloudinary } from "cloudinary";
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
  origin: ["https://zipbuy.vercel.app/","https://zipbuy-admin.vercel.app/" ,"http://localhost:3000", "http://localhost:3001"],
  credentials: true,
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use(router);

mongoose
  .connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("database connected successfull");
  })
  .catch((error) => {
    console.log("database failed to connect", error);
  });
  

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/adminlogin", adminLogin);
router.post("/adminregister", AdminRegister);
router.post("/createproduct", upload.array("images", 50), async (req, res) => {
  try {
    const {
      productName,
      productPrice,
      productQuantity,
      productCategory,
      productDiscount,
      productDescription,
      productShipping,
    } = req.body;

    if (
      !productName ||
      !productPrice ||
      !productQuantity ||
      !productCategory ||
      !productDiscount ||
      !productDescription ||
      !productShipping
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images were uploaded",
      });
    }

    const uploadedImageUrls = [];
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "uploads",
      });
      uploadedImageUrls.push(result.secure_url);
    }

    const shippingDetails =
      typeof productShipping === "string"
        ? JSON.parse(productShipping)
        : productShipping;

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

    if(createdProduct){
      return res.status(200).json({
        success: true,
        message: "Product created successfully",
        data: createdProduct,
      });
    }
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "samething went wrong",
    });
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

export default app;

