import mongoose from "mongoose";

const AdminSchemaDesign = new mongoose.Schema({
  adminName: {
    type: String,
    required: true,
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  password: {
    type: String,
    required: true,
  }
});

const AdminSchema = mongoose.model("AdminLogin", AdminSchemaDesign);
export default AdminSchema;