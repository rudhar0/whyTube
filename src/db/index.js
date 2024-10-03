import mongoose from "mongoose";

import { Db_Name } from "../constants.js";


const MongoConnect = async () => {
  try {
    const ConnectionIntenec = await mongoose.connect(
      `${process.env.Mongo_URL}/${Db_Name}`
    );

    console.log("Mongo Connected :", ConnectionIntenec.connection.host);
    
  } catch (error) {
    console.log("error :", error);
    throw error;
  }
};
export default MongoConnect
