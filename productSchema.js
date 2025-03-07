import mongoose from "mongoose";

const productSchemaDesign = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    productShipping: {
      type: Array,
      required: true,
    },
    productQuantity: {
      type: Number,
      required: true,
    },
    productDiscount:{
      type:Number,
      required:true,
    },
    productCategory: {
      type: String,
      required: true,
    },
    productDescription: {
      type: String,
      required: true,
    },
    productImages: {
      type: Array,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = mongoose.model("productsData", productSchemaDesign);
export default productSchema;