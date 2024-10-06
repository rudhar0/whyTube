import { app } from "./app.js";
import MongoConnect from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

MongoConnect().then(() => {
  app.listen(`${process.env.PORT}`,() => {
    console.log("server Start")
  });
}).catch((error)=>{
    console.log("error Is : ",error)
});
