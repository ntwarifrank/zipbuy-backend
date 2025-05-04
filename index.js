import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import productSchema from "./productSchema.js";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import FormData from "form-data";
import stream from "stream";
import cookieParser from "cookie-parser";
import Stripe from 'stripe';
import {
  register,
  login,
  verifyEmail,
  adminLogin,
  AdminRegister,
  getUserData,
} from "./userController/usercontroller.js";
import {
  searchedProduct,
  allProduct,
  Product,
  deleteProduct,
  updateProduct,
  specificProduct,
  placeOrder,
  relatedProduct,
} from "./productController/productController.js";

// Initialize app and configuration
const app = express();
const port = process.env.PORT || 5000;
const router = express.Router();
dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Enhanced CORS Configuration
const allowedOrigins = [
  "https://zipbuy-admin.vercel.app",
  "https://zipbuy.vercel.app",
  "http://localhost:3000", 
  "http://localhost:3001"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: [
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials"
  ],
  optionsSuccessStatus: 200
};

// Apply middleware in correct order
app.set('trust proxy', 1); // Important for Vercel deployments

// Stripe webhook needs raw body first
app.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      break;
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      console.error('Payment failed:', failedIntent.last_payment_error?.message);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Now apply other middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Additional security headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Vary", "Origin"); // Important for proper caching of CORS responses
  next();
});

// Database connection
mongoose.connect(process.env.MONGO_DB_URL)
  .then(() => console.log("Database connected"))
  .catch((error) => console.log("Database connection failed:", error));

// Validate essential environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not configured');
}

// File upload configuration
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

// Background removal utility
const removeBackground = async (fileBuffer) => {
  const formData = new FormData();
  formData.append("size", "auto");

  const fileStream = new stream.PassThrough();
  fileStream.end(fileBuffer);

  formData.append("image_file", fileStream, { filename: "image.png" });

  try {
    const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
      headers: {
        "X-Api-Key": process.env.REMOVE_BG_API_KEY,
        ...formData.getHeaders(),
      },
      responseType: "arraybuffer",
    });

    return response.data;
  } catch (error) {
    console.error("Remove.bg API error:", error.response?.data || error.message);
    throw new Error("Failed to remove background");
  }
};

// Routes
router.post("/payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const minAmount = 50;
    const finalAmount = Math.max(Number(amount), minAmount);
    const validCurrencies = ['usd', 'eur', 'gbp'];
    const finalCurrency = validCurrencies.includes(currency?.toLowerCase()) 
      ? currency.toLowerCase() 
      : 'usd';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: finalCurrency,
      metadata: {
        created_at: new Date().toISOString(),
        integration_type: 'ecommerce_checkout'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ 
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code || 'payment_intent_error'
    });
  }
});

router.post("/update-payment-intent", async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const minAmount = 50;
    const finalAmount = Math.max(Number(amount), minAmount);

    const paymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      { 
        amount: finalAmount,
        metadata: {
          updated_at: new Date().toISOString()
        }
      }
    );

    res.json({ 
      success: true,
      paymentIntentId: paymentIntent.id,
      updatedAmount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });
  } catch (error) {
    console.error('Error updating payment intent:', error);
    let statusCode = 500;
    if (error.code === 'resource_missing') {
      statusCode = 404;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: error.message,
      code: error.code || 'update_intent_error',
      type: error.type || 'stripe_error'
    });
  }
});

// Authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/adminlogin", adminLogin);
router.post("/adminregister", AdminRegister);

// Product routes
router.post("/createproduct", upload.array("images", 50), async (req, res) => {
  try {
    const { productName, productPrice, productQuantity, productCategory, productDiscount, productDescription, productShipping } = req.body;

    if (!productName || !productPrice || !productQuantity || !productCategory || !productDiscount || !productDescription || !productShipping) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images were uploaded" });
    }

    const uploadedImageUrls = [];

    for (const file of req.files) {
      const imageBuffer = await removeBackground(file.buffer);
      const uploadResult = await new Promise((resolve, reject) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(imageBuffer);

        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "uploads"},
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        bufferStream.pipe(uploadStream);
      });

      uploadedImageUrls.push(uploadResult.secure_url);
    }

    const shippingDetails = typeof productShipping === "string" ? JSON.parse(productShipping) : productShipping;

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
router.get("/profile", getUserData);
router.post("/search", searchedProduct);
router.post("/related", relatedProduct);

// Logout route with secure cookie clearance
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", { 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error logging out", error });
  }
});

// Apply router
app.use(router);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});

export default app;