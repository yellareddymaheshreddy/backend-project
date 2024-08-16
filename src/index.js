import 'dotenv/config'
import connectDb from './db/index.js';
import { app } from './app.js';











connectDb()
.then(()=>{
    app.on('error',()=>{
        console.log('error in db connection')
    })
    app.listen(process.env.PORT || 8000,()=>{
        console.log("server is running @",process.env.PORT)
    })
})
.catch((error)=>{
    console.log("Mongo db connection failed !!!",error)
})


















/*(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",()=>{
            console.log("No able to talk to db")
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log("App is listening on port ",process.env.PORT)
        })
        
    } catch (error) {
        console.log('Error while connecting to database',error)
        process.exit(1);
    }
})()*/
