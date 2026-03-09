import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth'
import courseRoutes from './routes/course'
import materialRoutes from './routes/material'

dotenv.config()

const app = express()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())

app.get('/api/ping', (req, res) => {
    res.json({ message: 'server is running' })
})

app.use("/api/auth", authRoutes)
app.use("/api/course", courseRoutes)
app.use("/api/material", materialRoutes)


app.listen(process.env.PORT, () => {
    console.info(`Server is running on port ${process.env.PORT}`)
})
