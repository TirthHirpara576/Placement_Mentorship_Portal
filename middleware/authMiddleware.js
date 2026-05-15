import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json("Access Denied");
    }

    const token = authHeader.split(" ")[1];

    try {

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');

        req.user = verified;

        next();

    } catch (err) {
        res.status(400).json("Invalid Token");
    }

};