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
     const { firstName, lastName, email, password, confirmPassword, mobileNumber, country, gender, city } = req.body;
     if(!firstName || !lastName || !email || !password || !confirmPassword || !mobileNumber || !country || !gender || !city ){
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
           firstName,
           lastName,
           email,
           password: hashedPassword,
           mobileNumber,
           country,
           gender,
           city,
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

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required",
        fieldErrors: {
          email: !email ? "Email is required" : undefined,
          password: !password ? "Password is required" : undefined
        }
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
        fieldErrors: {
          email: "Invalid email format"
        }
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
        fieldErrors: {
          password: "Password too short"
        }
      });
    }

    // Find user by email
    const user = await userSchema.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/"
    });

    // Return success response
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email
        // Add other non-sensitive user data as needed
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      error: "Login failed. Please try again." 
    });
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

export const getUserData = async (req, res) => {
  try {
    const { userId } = req.body;
     // Verify that the requested userId matches the token's userId
   

    const user = await userSchema.findOne({ _id: userId }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, userData: user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




