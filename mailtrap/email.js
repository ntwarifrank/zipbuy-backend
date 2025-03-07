import { response } from "express";
import { mailtrapClient , sender} from "./mailtrapConfig.js";
import { VERIFICATION_EMAIL_TEMPLATE } from "./verificationEmailTemplate.js";

export const verificationEmail = (email, verificationToken) => {
    const recepient = [{email}];
    try{
        mailtrapClient.send({
            from: sender,
            to: recepient,
            subject: "Verify Email Address",
            html:  VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}",verificationToken),
            category: "Email Verification",
        })
        console.log("Email Verification Successfull", response);
    }
    catch(error){
        console.error("Failed To Send Email Verification Code", error)
    }
}

export const sendWelcomeEmail = async(email, name) => {
    const recepient = [{ email }];

    mailtrapClient.send({
        from: sender,
        to: recepient,
        html:hvj

    })

}