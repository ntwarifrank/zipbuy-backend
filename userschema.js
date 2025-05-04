import mongoose, { mongo } from "mongoose";

const userSchemaDesign = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required:true,
  },
  country: {
      type: String,
      required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  lastLogin:{
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  verificationToken: {
    type:String,
  },
  verificationTokenExpiresAt: Date,
},
 {
    timestamps: true,
  }
);

const userSchema = mongoose.model("UserCredential", userSchemaDesign);
export default userSchema

