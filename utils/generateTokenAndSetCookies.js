import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config();

const generateTokenAndSetCookies = (res, userId) =>{
    const token = jwt.sign({userId}, process.env.JWT_SECRET_KEY,{
        expiresIn: "7d",
    })

    res.cookie("token", token, {
        httpOnly: true,
        secure : process.env.NODE_ENV === "production", // allow http only
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return token;
}

export default generateTokenAndSetCookies;
