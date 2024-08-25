import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log(("ERRR: ", error ));
        throw error;
        
    })
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running at port ${process.env.PORT}`);
        
    })
})
.catch((err)=>{
    console.log("Mongo db connection failed !!", err );
    
})










/*
(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (err)=>{
            console.log("ERRR:",err);
            throw err;
            
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.log("ERROR:" ,error);
        throw err
        
    }
})
() */