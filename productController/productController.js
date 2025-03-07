import productSchema from "../productSchema.js";
import placeOrderSchema from "../placeOrderSchema.js"
import Stripe from "stripe";
import dotenv from "dotenv";
const stripe = Stripe(
  "sk_test_51QxJcG2aaDHS6FnSgdK5ZwwUJ1WY7gyWhI9a8vOET3jNkd598TR8eh10apjNFlY4HTld9TooOB2huOqsNvJYt0wS00f6LKyvK5"
);

dotenv.config();
const secret_key = process.env.SECRET_KEY;

// that is router to display all product we have in database
export const allProduct = async (req, res) => {
  try {
    const productsData = await productSchema.find();
    if (productsData) {
      res.status(200).json({ success: true, productsData });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: "Failed To Fetch Data" });
  }
};

//that is router to fetch only one choosen product
export const Product = async (req, res) => {
  const { id } = req.params;
  const product = await productSchema.findOne({ _id: id });

  if (product) {
    res.status(200).json({ success: true, product });
  } else {
    res.status(400).json({ sucess: false, message: "failed to fetch product" });
  }
};

//that is router to update choosen product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    if (id) {
      const {
        productName,
        productPrice,
        productQuantity,
        productCategory,
        productDescription,
        productImages,
        productShipping,
        productDiscount,
      } = req.body;

      /*
      if (
        !productName ||
        !productPrice ||
        !productQuantity ||
        !productCategory ||
        !productDescription ||
        !productImages ||
        !productShipping ||
        !productDiscount
      ) {
        return res
          .status(401)
          .json({ success: false, message: "All Field Are Required" });
      }
       */   
      const createdProduct = await productSchema.findByIdAndUpdate(id, {
        productName,
        productPrice,
        productQuantity,
        productCategory,
        productDiscount,
        productDescription,
        productImages,
        productShipping,
      });

      if (createdProduct) {
        res
          .status(200)
          .json({ success: true, message: "product updated successfully" });
      } else {
        res
          .status(400)
          .json({ sucess: false, message: "failed to update product" });
      }
    } else {
      res.status(400).json({ success: false, message: "no product selected" });
    }
  } catch (error) {
    res.status(200).json({ success: false, messageMessage: error });
  }
};

//that is router to delete choosen product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productToDelete = await productSchema.findOneAndDelete({ _id: id });

    if (!productToDelete) {
      res
        .status(400)
        .json({ success: false, message: "Failed To Delete That Product" });
    }

    res
      .status(200)
      .json({ success: true, message: "Product Deleted Successsfully" });
  } catch (error) {
    res.status(400).json({ sucess: false, message: "server error" });
  }
};

export const specificProduct = async (req, res) => {
  const { ids } = req.body;

  res.json(await productSchema.find({ _id: ids }));
};

// that is router to place order and get data of order from front-end
export const placeOrder = async (req, res) => {
  try {
    const {
      email,
      fullName,
      city,
      postalCode,
      streetAddress,
      country,
      orderToken,
      cartProducts,
      totalAmount,
    } = req.body;
    if (
      !email ||
      !fullName ||
      !city ||
      !postalCode ||
      !streetAddress ||
      !country ||
      !orderToken ||
      !cartProducts ||
      !totalAmount
    ) {
      res
        .status(400)
        .json({ success: false, message: "All Field Are Required" });
      return;
    }

    const order = await placeOrderSchema.create({
      email,
      fullName,
      city,
      postalCode,
      streetAddress,
      country,
      orderToken,
      cartProducts,
      totalAmount,
    });

    if (!order) {
      res.status(400).json({ success: false, message: "failed to PlaceOrder" });
      return;
    }
    res
      .status(200)
      .json({ success: true, message: "order created successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: "server error" });
  }
};

//that is route for searching specific product
export const searchedProduct = async (req, res) => {
  const { searched } = req.body;

  try {
    if (!searched) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const searchedProducts = await productSchema.find({
      productName: { $regex: searched, $options: "i" },
    });

    if (searchedProducts.length > 0) {
      return res
        .status(200)
        .json({ success: true, products: searchedProducts });
    } else {
      const defaultProduct = {
        _id: "0",
        productName: "Not Found ",
        productPrice: 0,
        productShipping: [
          { weight: "0" },
          { dimensions: "0" },
          { shippingCost: 0 },
          { estimatedDelivery: "0" },
        ],
        productQuantity: 0,
        productDiscount: 0,
        productCategory: "",
        productDescription: "not found",
        productImages: [
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0ggQy-W2LxZYOyfOKakhCDf7KFQ0KdumDXA&s",
        ],
      };

      return res
        .status(200)
        .json({ success: true, products: [defaultProduct] });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

//that router is for payment indent to send clientsecret to the front-end
export const paymentIndent = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};