import generateTokenAndSetCookies from "../utils/generateTokenAndSetCookies.js";
import bcrypt from "bcrypt"
import userSchema from "../userschema.js";
import { verificationEmail, sendWelcomeEmail } from "../mailtrap/email.js";
import AdminSchema from "../adminSchema.js";
import dotenv from "dotenv"
import jwt from "jsonwebtoken"

dotenv.config();
const secret_key = process.env.SECRET_KEY 
const secret_key_2 = process.env.SECRET_KEY_2

export const AdminRegister = async(req, res) => {
      const errorMessage = [];
    try {
       const { adminName ,email, password, confirmPassword } = req.body;
       if(!adminName || !email || !password || !confirmPassword){
        errorMessage.push("All Field Are Required");
       }
       if(password !== confirmPassword){
        errorMessage.push("Password Doesn't Match");
       }
       if(errorMessage.length > 0){
        return res.status(401).json({errorMessage});
       }
       const hashedPassword = await bcrypt.hash(password, 10);

       const newAdimn = await AdminSchema.create({
        adminName,
        email,
        password: hashedPassword
       })
       if(newAdimn){
        res.status(201).json({sucess:true, message:"admin Registration Successfully"})
       }
    } catch (error) {
      res.status(400).json({error});
    }
}
//adminn login
export const adminLogin = async(req, res) => {
    try {
       const { email, password, confirmPassword } = req.body;

       if (!email || !password || !confirmPassword) {
        return res.status(401).json({ success: false, message:"All Field Are Required"});
       }

       const adminLogin = await AdminSchema.findOne({ email });
       if (!adminLogin) {
         return res.status(404).json({ success: false, message: "You Are Not Admin" });
       }
       if(password !== confirmPassword){
        return res.status(401).json({success: false, message: "Password Doesn't Match"});
      }
       const isMatch = await bcrypt.compare(password, adminLogin.password);

        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Invalid Password" });
        }
        if(isMatch){
           res.status(201).json({sucess:true, message: "Login successful"});
   
        }
         }
          catch (error) {
          console.error("Login Error:", error.message);
          return res.status(500).json({ success: false, message: "Something went wrong" });
        }
        
}

//register of new user
export const register = async(req, res) => {
    try{
     const { username, email, password, confirmPassword } = req.body;
     if(!username || !email || !password || !confirmPassword ){
        return res.status(401).json({ sucess: false, message: "please All Fields Are Required "});
     }
     const userAlreadyExists = await userSchema.findOne({ email });
     if (userAlreadyExists) {
        return res.status(401).json({ sucess: false, message: "User Already Exists" });
      }
     if(password !== confirmPassword){
       return res.status(401).json({ sucess: false, message: " Password Does Not Match"});
     }
    
   
     if(password === confirmPassword){
         const hashedPassword = await bcrypt.hash(password, 10);
         const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
         const newUser = await userSchema.create({
           username,
           email,
           password: hashedPassword,
           verificationToken,
           verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 100 //24 hours
         });

         if (newUser) {
           // jwt
          // verificationEmail(newUser.email, verificationToken);
          // generateTokenAndSetCookies(res, newUser._id);
           res.status(200).json({sucess: true, message: "user inserted successfull"});
         } else {
           res.status(401).json({sucess: false, message: "failed to be inserted" });
         }
     }
   }
    catch(error){
        res.status(401).json({ error: "user failed to be inserted" });
    }  
}

// login of registered user
export const login = async (req, res) => {
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ sucess: true, message:"Please All Fields Are Required"});
    }

    if (email) {
      const user = await userSchema.findOne({ email });
      if (user) {
        const checkPassword = await bcrypt.compare(password, user.password);
        if (checkPassword) {
          if (checkPassword) {
            const token = jwt.sign({ user }, secret_key, { expiresIn: "1d" });
            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production", // True on Vercel, False on Local
              sameSite: "lax",
              path: "/",
            });
            return res.status(200).json({ message: "Login successful", token });
          }
          
        } else {
          return res.status(401).json({ sucess: false, message:"Invalid Password"});
        }
      } else {
        return res.status(401).json({ sucess: false, message:"That User Not Exists"});
      }
    }

  } catch (error) {
    return res.status(400).json({ sucess: false, message: "server error" });
  }
};

//verify email of user after registration step
export const verifyEmail = async(req, res) => {
  let errorMessage = [];
  try {
    const { verificationCode } = req.body;
    console.log("Verification Code:", verificationCode);

    const userToBeVerified = await userSchema.findOne({
      verificationToken: verificationCode,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });
    console.log("User Found:", userToBeVerified);
    
    if (!userToBeVerified) {
      errorMessage.push("Invalid Verification Code");
    }

    if (errorMessage.length > 0) {
      return res.status(401).json({ errorMessage });
    }

    userToBeVerified.verificationToken = undefined;
    userToBeVerified.verificationTokenExpiresAt = undefined;
    userToBeVerified.isVerified = true;
    await userToBeVerified.save();
    console.log("user verified:",userToBeVerified);

    sendWelcomeEmail(userToBeVerified.email, userToBeVerified.username);

    res.status(200).json({ sucess: true, message: "verification successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const getUserData = (req , res) => {
  const user = req.user
  res.json({user});
}


