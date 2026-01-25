import jwt, { decode } from "jsonwebtoken";
import { config } from "dotenv";

config();

const validateToken = (req, res, next) => {
    try{
        const token = req.cookies?.token;

        //missing token header, deny access
        if(!token){
            return res.status(401).json({
                message: "Missing token. Not authorized"
            })
        }

        //token verification
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if(err){
                return res.status(400).json({
                    message: "Invalid token",
                    error: err
                })
            }

            req.user = decoded;
            next();
        })

    } catch(error){
        return res.status(500).json({
            message: "Error accured in validating the token",
            error: error
        })
    }
}

export default validateToken;