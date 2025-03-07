import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  country:{
    type:String,
    required:true,
  },
  totalAmount:{
    type:Number,
    required:true,
  },
  streetAddress: {
    type: String,
    required: true,
  },
  orderToken: {
    type: String,
    required: true,
  },
  cartProducts: {
    type: Array,
    required: true,
  },
  isPayed: {
    type: Boolean,
    default: false,
  },
},
{timestamps:true}
);

const placeOrderSchema = mongoose.model("placeOrderSchema", orderSchema);
export default placeOrderSchema;