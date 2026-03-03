import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import authPayload from './routes/auth'

dotenv.config()

const app = express()

app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true  
}))
app.use("/api/auth", authPayload)
app.use(express.json())

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})